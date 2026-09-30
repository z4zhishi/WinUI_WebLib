<script setup lang="ts">
// AppBarToggleButton —— WinUI AppBarToggleButton 的 Web 复刻(命令栏切换按钮:外观同
// AppBarButton,行为同 CheckBox)。
// 视觉与状态对照源:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   L19468 起 <Style TargetType="AppBarToggleButton">(默认 Style,非 RevealStyle):
//   - 结构:Root(Grid)上依次叠放 CheckedHighlightBackground(选中强调色底,Opacity 0→1)、
//     AccentOverlayBackground(悬停/按下列表高亮)与 AppBarToggleButtonInnerBorder(描边,
//     各态均透明);ContentRoot(Grid,MinHeight=AppBarThemeMinHeight=56)= 图标(Viewbox,
//     Height=AppBarButtonContentHeight=16、Margin=AppBarButtonContentViewboxCollapsedMargin=
//     0,12,0,4)+ 标签(TextLabel,FontSize=12、Margin=AppBarToggleButtonTextLabelMargin=
//     2,0,2,8、居中可换行)+ 加速键角标(KeyboardAcceleratorTextLabel,Caption 12px、
//     Margin=24,0,12,0、右对齐);Width=68(默认 Style Setter);
//   - CommonStates 组合态(Checked × 四交互态,DiscreteObjectKeyFrame 即时切换):
//     Normal/PointerOver/Pressed → 前景 SystemControlForegroundBaseHighBrush,悬停/按下
//     切 SystemControlHighlightAltBaseHighBrush,AccentOverlayBackground 悬停
//     SystemControlHighlightListLowBrush、按下 SystemControlHighlightListMediumBrush;
//     Checked → CheckedHighlightBackground.Opacity=1(Fill=AppBarToggleButtonBackgroundChecked=
//     SystemControlHighlightAccentBrush),前景 SystemControlHighlightAltBaseHighBrush;
//     CheckedPointerOver/CheckedPressed → 底色不变(仍 SystemControlHighlightAccentBrush),
//     叠加列表高亮同未选中悬停/按下;Disabled → 前景 SystemControlDisabledBaseMediumLowBrush;
//     CheckedDisabled → 底色 SystemControlDisabledAccentBrush、前景
//     SystemControlBackgroundBaseMediumLowBrush;BorderBrush 全态透明(InnerBorder 无可见描边)。
//   - 注意:源模板没有 Indeterminate 视觉分支 —— AppBarToggleButton 的不确定态外观与未选中
//     相同(强调色底只在 IsChecked == true 时点亮),无障碍语义用 aria-pressed="mixed" 表达。
// 行为规格:ToggleButton 基类(ToggleButton_Partial.cpp)—— OnClick() 先 OnToggleProtected()
//   (切状态并触发 Checked/Unchecked/Indeterminate)后 Click;OnToggleImpl 的点击环:
//   未选中 → 选中;选中 →(IsThreeState 时)不确定,否则未选中;不确定 → 未选中。
// 加速键:KeyboardAcceleratorTextOverride(如 'Ctrl+S')以角标显示于行尾,同时注册全局按键
//   监听(匹配即触发一次切换,WinUI KeyboardAccelerator 语义);AppBarButton 同族仅显示角标,
//   本组件按任务要求补齐真实监听(差异与理由见 wiki)。
import { computed, onScopeDispose, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { symbolToGlyph } from '@/utils/symbolIcons'

// class/style 等透传属性统一由根元素 v-bind="$attrs" 承接(避免落到 button 之外的继承位)。
defineOptions({ name: 'WuiAppBarToggleButton', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 图标:WinUI Symbol 枚举名(如 'Shuffle')或 Segoe 字形字符;亦可用 #icon slot 放 FontIcon / BitmapIcon / PathIcon 等任意图标元素(slot 优先)。 */
    icon?: string
    /** 图标下方的文字标签(WinUI Label);isCompact 时隐藏。 */
    label?: string
    /** 紧凑态(WinUI IsCompact):仅显示图标、隐藏标签(ApplicationViewStates → Compact)。 */
    isCompact?: boolean
    /** 三态:允许用户点击进入不确定态(WinUI IsThreeState;源模板无不确定视觉,仅影响点击环与语义)。 */
    isThreeState?: boolean
    /** 加速键文本(WinUI KeyboardAcceleratorTextOverride,如 'Ctrl+S'):行尾角标显示,同时注册全局按键监听;空串不显示也不监听。 */
    keyboardAcceleratorText?: string
    /** 是否禁用(对应 WinUI IsEnabled)。 */
    disabled?: boolean
    /** 按钮宽度(WinUI Width);缺省 68(默认 Style 的 Width=68)。 */
    width?: number | string
  }>(),
  {
    icon: '',
    label: '',
    isCompact: false,
    isThreeState: false,
    keyboardAcceleratorText: '',
    disabled: false,
    width: 68,
  },
)

// 显式声明 emits(含 click):父级 @click 监听改走 emit 转发,防止原生 click 重复触发。
const emit = defineEmits<{
  /** 点击/加速键激活(WinUI Click;Space/Enter 键同样触发;禁用时不触发)。 */
  click: [event: MouseEvent]
  /** 进入选中态(WinUI Checked;仅用户交互触发)。 */
  checked: []
  /** 进入未选中态(WinUI Unchecked;仅用户交互触发)。 */
  unchecked: []
  /** 进入不确定态(WinUI Indeterminate;仅用户交互触发)。 */
  indeterminate: []
  // 注:update:isChecked 的 emit 类型由下方 defineModel 提供,勿在此重复声明(会导致 vue-tsc 推断退化为 unknown)。
}>()

// 双向:isChecked —— boolean | 'indeterminate'('indeterminate' ↔ WinUI IsChecked = null),
// 与 CheckBox / ToggleButton 同款哨兵值设计。
const isCheckedModel = defineModel<boolean | 'indeterminate'>('isChecked', { default: false })

const isChecked = computed(() => isCheckedModel.value === true)
const isIndeterminate = computed(() => isCheckedModel.value === 'indeterminate')

// —— 图标解析:Symbol 枚举名 → 字形字符;非枚举名按字面字形字符使用(与 MenuFlyoutItem 同款)——
const iconGlyph = computed(() => symbolToGlyph(props.icon) ?? props.icon)

// WAI-ARIA:开关按钮第三态用 aria-pressed="mixed"(对应 WinUI IsChecked = null)。
const ariaPressed = computed(() =>
  isIndeterminate.value ? 'mixed' : isChecked.value ? 'true' : 'false',
)

// a11y:图标即按钮本体,Compact 态下标签 display:none 会退出无障碍树,
// 固定以 Label 作为可访问名(等价 WinUI 由 Label 派生 AutomationName)。
const ariaLabel = computed(() => (props.label !== '' ? props.label : undefined))

// —— 宽度解析:WinUI Width → CSS width ——
const widthStyle = computed<CSSProperties>(() => {
  const value = props.width
  return { width: typeof value === 'number' ? `${value}px` : value }
})

/**
 * 点击环(对照 ToggleButton::OnToggleImpl,L249 起,AppBarToggleButton 继承同一基类):
 * 未选中 → 选中;选中 →(isThreeState 时)不确定,否则未选中;不确定 → 未选中。
 */
function onToggle(event: MouseEvent): void {
  if (props.disabled) return

  const next: boolean | 'indeterminate' =
    isCheckedModel.value === true
      ? props.isThreeState
        ? 'indeterminate'
        : false
      : isCheckedModel.value === 'indeterminate'
        ? false
        : true

  // 官方 OnClick 次序(ToggleButton_Partial.cpp L178):先切状态并同步触发
  // Checked/Unchecked/Indeterminate,后触发 Click。
  if (next !== isCheckedModel.value) {
    isCheckedModel.value = next
    if (next === true) emit('checked')
    else if (next === false) emit('unchecked')
    else emit('indeterminate')
  }
  emit('click', event)
}

/* -------------------------------------------------------------------------
 * 加速键(keyboardAcceleratorText):'Ctrl+S' / 'Ctrl+Alt+Delete' 等字符串解析,
 * 匹配即触发一次切换(等价 WinUI KeyboardAccelerator 激活按钮)。修饰符语义与
 * KeyboardAccelerator.Modifiers(VirtualKeyModifiers)常用写法一致。
 * ---------------------------------------------------------------------- */

interface AcceleratorSpec {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

const MODIFIER_MAP: Record<string, keyof Omit<AcceleratorSpec, 'key'>> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  shift: 'shift',
  win: 'meta',
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
}

/** 常用 key 别名 → KeyboardEvent.key 标准名(WinUI 显示 'Del' 而 key 为 'Delete' 等)。 */
const KEY_ALIAS_MAP: Record<string, string> = {
  del: 'delete',
  ins: 'insert',
  esc: 'escape',
  return: 'enter',
  spacebar: ' ',
}

function normalizeKeyName(name: string): string {
  const lowered = name.toLowerCase()
  return KEY_ALIAS_MAP[lowered] ?? lowered
}

function parseAccelerator(spec: string): AcceleratorSpec | null {
  const tokens = spec
    .split('+')
    .map((token) => token.trim())
    .filter((token) => token !== '')
  if (tokens.length === 0) return null
  const result: AcceleratorSpec = { key: '', ctrl: false, alt: false, shift: false, meta: false }
  for (let index = 0; index < tokens.length - 1; index++) {
    const mapped = MODIFIER_MAP[(tokens[index] ?? '').toLowerCase()]
    if (!mapped) return null
    result[mapped] = true
  }
  result.key = tokens[tokens.length - 1] ?? ''
  if (result.key === '') return null
  return result
}

function matchesAccelerator(event: KeyboardEvent, spec: AcceleratorSpec): boolean {
  return (
    event.ctrlKey === spec.ctrl &&
    event.altKey === spec.alt &&
    event.shiftKey === spec.shift &&
    event.metaKey === spec.meta &&
    normalizeKeyName(event.key) === normalizeKeyName(spec.key)
  )
}

const accelerator = computed<AcceleratorSpec | null>(() => parseAccelerator(props.keyboardAcceleratorText))

// —— 全局监听:启用(有加速键且未禁用)时挂 capture keydown,匹配即切换(合成 MouseEvent 上报)——
function onDocumentKeydown(event: KeyboardEvent): void {
  const spec = accelerator.value
  if (!spec || !matchesAccelerator(event, spec)) return
  event.preventDefault()
  event.stopPropagation()
  onToggle(new MouseEvent('click'))
}

watch(
  () => (accelerator.value !== null && !props.disabled),
  (active) => {
    if (typeof document === 'undefined') return
    if (active) {
      document.addEventListener('keydown', onDocumentKeydown, true)
    } else {
      document.removeEventListener('keydown', onDocumentKeydown, true)
    }
  },
  { immediate: true },
)
onScopeDispose(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onDocumentKeydown, true)
  }
})
</script>

<template>
  <!-- 原生 button 自带 Space/Enter 激活与 role="button" 语义,键盘可达性免费获得 -->
  <button
    type="button"
    class="wui-appbar-toggle-button"
    :class="{
      'wui-appbar-toggle-button--checked': isChecked,
      'wui-appbar-toggle-button--indeterminate': isIndeterminate,
      'wui-appbar-toggle-button--compact': isCompact,
    }"
    :style="widthStyle"
    :disabled="disabled"
    :aria-pressed="ariaPressed"
    :aria-label="ariaLabel"
    v-bind="$attrs"
    @click="onToggle"
  >
    <!-- 选中强调色底(CheckedHighlightBackground):Opacity 0,选中态 → 1,盖满圆角 -->
    <span class="wui-appbar-toggle-button__highlight" aria-hidden="true"></span>
    <!-- 悬停/按下列表高亮(AccentOverlayBackground) -->
    <span class="wui-appbar-toggle-button__overlay" aria-hidden="true"></span>
    <!-- 图标列(第 0 行第 * 列):高 16、Margin 0,12,0,4,内容水平居中 -->
    <span class="wui-appbar-toggle-button__icon" aria-hidden="true">
      <slot name="icon">{{ iconGlyph }}</slot>
    </span>
    <!-- 加速键角标(第 0 行 Auto 列):Caption 字号、右对齐、垂直居中 -->
    <span v-if="keyboardAcceleratorText !== ''" class="wui-appbar-toggle-button__accelerator" aria-hidden="true">{{
      keyboardAcceleratorText
    }}</span>
    <!-- 标签(第 1 行):12px、居中、可换行;Compact 态 Collapsed -->
    <span class="wui-appbar-toggle-button__label">{{ label }}</span>
  </button>
</template>

<style scoped>
/* ======================================================================
 * 组合态配色(CommonStates:Unchecked/Checked × Normal/PointerOver/Pressed/
 * Disabled):根元素按状态写中间变量,图层就地消费,对应 generic.xaml 各
 * VisualState 的 DiscreteObjectKeyFrame(即时切换,无过渡动画)。
 * ====================================================================== */
.wui-appbar-toggle-button {
  /* Normal(未选中):底色未点亮、高亮透明、前景 BaseHigh */
  --atb-highlight: var(--wui-system-control-highlight-accent); /* AppBarToggleButtonBackgroundChecked */
  --atb-highlight-opacity: 0;
  --atb-overlay: var(--wui-system-control-transparent); /* HighLightOverlay = 透明 */
  --atb-fg: var(--wui-system-control-foreground-base-high);
  --atb-accel: var(--wui-system-control-foreground-base-medium);
}

/* PointerOver:列表低高亮 + 前景 HighlightAltBaseHigh(CheckedPointerOver 同) */
.wui-appbar-toggle-button:hover:not(:disabled) {
  --atb-overlay: var(--wui-system-control-highlight-list-low);
  --atb-fg: var(--wui-system-control-highlight-alt-base-high);
  --atb-accel: var(--wui-system-control-highlight-alt-base-medium);
}

/* Pressed:列表中高亮(CheckedPressed 同) */
.wui-appbar-toggle-button:active:not(:disabled) {
  --atb-overlay: var(--wui-system-control-highlight-list-medium);
  --atb-fg: var(--wui-system-control-highlight-alt-base-high);
  --atb-accel: var(--wui-system-control-highlight-alt-base-medium);
}

/* Disabled(未选中):背景透明、前景 DisabledBaseMediumLow */
.wui-appbar-toggle-button:disabled {
  --atb-fg: var(--wui-system-control-disabled-base-medium-low);
  --atb-accel: var(--wui-system-control-disabled-base-medium-low);
}

/* Checked:强调色底点亮(Opacity 0→1),前景 HighlightAltBaseHigh(Checked 视觉态) */
.wui-appbar-toggle-button--checked {
  --atb-highlight-opacity: 1;
  --atb-fg: var(--wui-system-control-highlight-alt-base-high);
}

/* CheckedDisabled:底色 DisabledAccent、前景 BackgroundBaseMediumLow(置后覆盖 Disabled 前景) */
.wui-appbar-toggle-button--checked:disabled {
  --atb-highlight: var(--wui-system-control-disabled-accent);
  --atb-fg: var(--wui-system-control-background-base-medium-low);
  --atb-accel: var(--wui-system-control-disabled-base-medium-low);
}

/* ======================================================================
 * 布局(对照模板 Root + ContentRoot):Width=68(Setter)、ContentRoot
 * MinHeight=AppBarThemeMinHeight=56;第 0 行 = 图标(*)+ 加速键角标(Auto),
 * 第 1 行 = 标签;两层底色为绝对定位图层,内容相对定位保持在其上。
 * ====================================================================== */
.wui-appbar-toggle-button {
  display: inline-grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  box-sizing: border-box;
  min-height: 56px; /* AppBarThemeMinHeight */
  padding: 0;
  font-family: var(--wui-content-control-theme-font-family);
  font-weight: 400;
  /* AppBarToggleButtonBackground = SystemControlTransparentBrush;BorderBrush 全态透明 */
  background: var(--wui-system-control-transparent);
  border: none;
  /* WinUI 3 默认 ControlCornerRadius = 4;无同名 token,取最近似的圆角 token(见 wiki 差异节) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  color: var(--atb-fg);
  cursor: default;
  user-select: none;
  touch-action: manipulation;
  position: relative;
}

/* 选中强调色底(CheckedHighlightBackground Rectangle):盖满圆角,随状态色/透明度切换 */
.wui-appbar-toggle-button__highlight {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: var(--atb-highlight);
  opacity: var(--atb-highlight-opacity);
  pointer-events: none;
}

/* 悬停/按下列表高亮(AccentOverlayBackground Rectangle) */
.wui-appbar-toggle-button__overlay {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: var(--atb-overlay);
  pointer-events: none;
}

/* 图标列:ContentViewbox Height=16 + AppBarButtonContentViewboxCollapsedMargin=0,12,0,4;
   字形兜底用 Symbol 主题字体(slot 内组件自带字体时以内联为准) */
.wui-appbar-toggle-button__icon {
  position: relative;
  z-index: 1;
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  margin: 12px 0 4px;
  min-width: 0;
  color: inherit;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 16px;
  line-height: 1;
}

/* 加速键角标:KeyboardAcceleratorTextLabel,Caption(12px)、Margin 24,0,12,0、右对齐垂直居中;
   前景 AppBarToggleButtonKeyboardAcceleratorTextForeground = SystemControlForegroundBaseMediumBrush */
.wui-appbar-toggle-button__accelerator {
  position: relative;
  z-index: 1;
  grid-column: 2;
  grid-row: 1;
  align-self: center;
  margin: 0 12px 0 24px;
  font-size: 12px; /* CaptionTextBlockStyle FontSize=12 */
  line-height: 1;
  text-align: right;
  color: var(--atb-accel);
}

/* 标签:TextLabel FontSize=12 + AppBarToggleButtonTextLabelMargin=2,0,2,8、居中、可换行 */
.wui-appbar-toggle-button__label {
  position: relative;
  z-index: 1;
  grid-column: 1;
  grid-row: 2;
  margin: 0 2px 8px;
  font-size: 12px; /* 模板内联 FontSize=12 */
  line-height: normal;
  text-align: center;
  overflow-wrap: break-word;
  word-break: break-word;
  color: inherit;
}

/* 紧凑态(ApplicationViewStates → Compact):TextLabel Collapsed,仅剩图标 */
.wui-appbar-toggle-button--compact .wui-appbar-toggle-button__label {
  display: none;
}

/* 系统焦点视觉:WinUI 双环(FocusVisualPrimary 内环 + FocusVisualSecondary 外环,
   FocusVisualMargin=-3)近似为 primary 色单环 outline(UseSystemFocusVisuals) */
.wui-appbar-toggle-button:focus {
  outline: none;
}
.wui-appbar-toggle-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}
</style>
