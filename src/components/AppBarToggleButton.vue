<script setup lang="ts">
// AppBarToggleButton —— WinUI AppBarToggleButton 的 Web 复刻(命令栏切换按钮:外观同
// AppBarButton,行为同 CheckBox)。
// 视觉与状态对照源(基准 = WinUI 3 随包主题资源,generic.xaml 为同名模板锚点):
//   CK/WinUI-Reference/controls/dev/CommonStyles/AppBarToggleButton_themeresources.xaml(L204 起);
//   dxaml/xcp/dxaml/themes/generic.xaml L19468 起 <Style TargetType="AppBarToggleButton">(默认 Style):
//   - 结构:Root(Grid)上依次叠放 CheckedHighlightBackground(选中强调色底,Opacity 0→1)、
//     AccentOverlayBackground(悬停/按下列表高亮)与 AppBarToggleButtonInnerBorder(描边,
//     各态均透明);ContentRoot(Grid,MinHeight=AppBarThemeMinHeight=64
//     —— CommandBar_themeresources.xaml L71;UWP generic.xaml L19461 为 56)= 图标(Viewbox,
//     Height=AppBarButtonContentHeight=16、Margin=AppBarButtonContentViewboxCollapsedMargin=
//     0,16,0,2 —— AppBarButton_themeresources.xaml L112;UWP 为 0,12,0,4)+ 标签
//     (TextLabel,FontSize=12、Margin=AppBarToggleButtonTextLabelMargin=2,0,2,8、居中可换行)+
//     加速键角标(KeyboardAcceleratorTextLabel,Caption 12px、Margin=24,0,12,0、右对齐、默认 Collapsed);
//     Width=68(默认 Style Setter);
//   - 加速键角标只在「溢出菜单」内呈现:默认样式设 KeyboardAcceleratorPlacementMode=Hidden
//     (AppBarToggleButton_themeresources.xaml L226;generic.xaml L19479 同),
//     运行期仅当 useOverflowStyle(按钮位于溢出区)且键盘存在时才切 KeyboardAcceleratorTextVisible
//     (dxaml/xcp/dxaml/lib/AppBarButtonHelpers.h L201-206);主命令区恒 Collapsed(仅 Tooltip 提示)。
//   - CommonStates 组合态(Checked × 四交互态,DiscreteObjectKeyFrame 即时切换;PL16 重定向到
//     WinUI 3 生效层 Fluent 画刷族,权威 =
//     controls/dev/CommonStyles/AppBarToggleButton_themeresources.xaml Default L5-L67):
//     未选中 Normal Background=SubtleFillColorTransparentBrush、PointerOver=SubtleFillColorSecondaryBrush、
//     Pressed=SubtleFillColorTertiaryBrush、Disabled=SubtleFillColorDisabledBrush(透明);
//     前景 Normal/PointerOver=TextFillColorPrimaryBrush、Pressed=TextFillColorSecondaryBrush、
//     Disabled=TextFillColorDisabledBrush;
//     Checked → 底色 AccentFillColorDefaultBrush、前景 TextOnAccentFillColorPrimaryBrush;
//     CheckedPointerOver → 底色 AccentFillColorSecondaryBrush、前景 TextOnAccentFillColorPrimaryBrush;
//     CheckedPressed → 底色 AccentFillColorTertiaryBrush、前景 TextOnAccentFillColorSecondaryBrush;
//     CheckedDisabled → 底色 AccentFillColorDisabledBrush、前景 TextOnAccentFillColorDisabled;
//     BorderBrush 未选中各态 ControlFillColorTransparentBrush,Checked/CheckedPointerOver
//     AccentControlElevationBorderBrush(渐变,PL5),CheckedPressed/CheckedDisabled 透明;
//     角标 KeyboardAcceleratorTextForeground = TextFillColor Secondary/Secondary/Tertiary/Disabled
//     (Checked 族同映射:Secondary/Secondary/Tertiary/Disabled)。
//   - 注意:源模板没有 Indeterminate 视觉分支 —— AppBarToggleButton 的不确定态外观与未选中
//     相同(强调色底只在 IsChecked == true 时点亮),无障碍语义用 aria-pressed="mixed" 表达。
// 行为规格:ToggleButton 基类(ToggleButton_Partial.cpp)—— OnClick() 先 OnToggleProtected()
//   (切状态并触发 Checked/Unchecked/Indeterminate)后 Click;OnToggleImpl 的点击环:
//   未选中 → 选中;选中 →(IsThreeState 时)不确定,否则未选中;不确定 → 未选中。
// 加速键:KeyboardAcceleratorTextOverride(如 'Ctrl+S')按源只在溢出菜单(UseOverflowStyle)内以
//   Caption 字号右对齐呈现(主命令区 PlacementMode=Hidden 不呈现,仅 Tooltip);本组件另按任务要求
//   注册全局按键监听(匹配即触发一次切换,WinUI KeyboardAccelerator 语义),差异与理由见 wiki。
// Reveal 揭示光照(MR8,按源默认样式判定为 opt-in):
//   AppBarToggleButtonRevealStyle(generic.xaml L17336)非控件默认样式 —— keyless 默认
//   (L19468)用 AppBarToggleButtonBackground 系非 reveal token;reveal 仅在 CommandBar 内经
//   CommandBarRevealStyle 模板 Grid.Resources 隐式样式挂接(L16222),而 CommandBar 自身
//   默认即 CommandBarRevealStyle(L20206)。故独立使用默认无光照(reveal 缺省关闭),
//   CommandBar 内默认启用(inject,等价源隐式样式作用域);悬停/按压高亮由 PL16 统一
//   重定向 Fluent(未选中 SubtleFillColorSecondary/Tertiary;Checked 族 AccentFillColor
//   Secondary/Tertiary),reveal 变体不再单独走 legacy ListLow/ListMedium。光照本体=公共层
//   (reveal.css + useReveal):底板光半径
//   Clamp(Max(W,H)+12,16,512)(RevealHoverLight.cpp L141-149/L163)、边框光半径 39px
//   (RevealBorderLight.cpp narrow 配置 L24-35)、光环厚度 =
//   AppBarToggleButtonRevealBorderThemeThickness 1(G.xaml L1398)。
import { computed, inject, onScopeDispose, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useReveal } from '../composables/useReveal'
import { symbolToGlyph } from '@/utils/symbolIcons'
import '../styles/reveal.css'

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
    /** 加速键文本(WinUI KeyboardAcceleratorTextOverride,如 'Ctrl+S'):行尾角标显示,同时注册全局按键监听,匹配即触发 click;空串不显示也不监听。 */
    keyboardAcceleratorText?: string
    /** 是否禁用(对应 WinUI IsEnabled)。 */
    disabled?: boolean
    /** 按钮宽度(WinUI Width);缺省 68(默认 Style 的 Width=68)。 */
    width?: number | string
    /**
     * 是否启用 reveal 揭示光照(悬浮时跟随指针的底板光 + 1px 边框光环)。
     * 缺省跟随宿主:CommandBar 内默认启用(源 CommandBarRevealStyle 隐式样式,
     * generic.xaml L16222)、独立使用默认关闭(源 keyless 默认样式 L19468 为非 reveal)。
     * 显式设 true/false 强制覆盖。
     */
    reveal?: boolean
  }>(),
  {
    icon: '',
    label: '',
    isCompact: false,
    isThreeState: false,
    keyboardAcceleratorText: '',
    disabled: false,
    width: 68,
    reveal: undefined,
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

// —— reveal 生效值:显式 prop > CommandBar 上下文(源隐式样式作用域)> 关闭 ——
const inCommandBar = inject<boolean>('wuiCommandBarReveal', false)
const effectiveReveal = computed(() => props.reveal ?? inCommandBar)

// reveal 光照(公共层):指针位置/光斑半径写入根元素 CSS 变量(仅生效、未禁用且
// 指针设备启用);底板光/边框光渲染在根的 ::before/::after(根 ::after 未被占用)。
const revealHandlers = useReveal(() => effectiveReveal.value && !props.disabled)

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
      'wui-reveal': effectiveReveal,
      'wui-reveal--border': effectiveReveal,
    }"
    :style="widthStyle"
    :disabled="disabled"
    :aria-pressed="ariaPressed"
    :aria-label="ariaLabel"
    v-bind="$attrs"
    v-on="effectiveReveal ? revealHandlers : undefined"
    @click="onToggle"
  >
    <!-- 选中强调色底(CheckedHighlightBackground):Opacity 0,选中态 → 1,盖满圆角 -->
    <span class="wui-appbar-toggle-button__highlight" aria-hidden="true"></span>
    <!-- 悬停/按下列表高亮(AccentOverlayBackground) -->
    <span class="wui-appbar-toggle-button__overlay" aria-hidden="true"></span>
    <!-- 图标列(第 0 行第 * 列):高 16、Margin 0,16,0,2,内容水平居中 -->
    <span class="wui-appbar-toggle-button__icon" aria-hidden="true">
      <slot name="icon">{{ iconGlyph }}</slot>
    </span>
    <!-- 加速键角标(第 0 行 Auto 列):Caption 字号、右对齐、垂直居中、默认 Collapsed
         (KeyboardAcceleratorPlacementMode=Hidden;仅溢出菜单由父级把角标显示变量置为 block 后呈现) -->
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
 * VisualState 的 Setters(前景即时切换;底色则另有 InnerBorder.BackgroundTransition
 * = BrushTransition 83ms,见 __highlight/__overlay 规则)。
 * ====================================================================== */
.wui-appbar-toggle-button {
  /* Normal(未选中):底色层未点亮(CheckedHighlightBackground Opacity=0)、HighLightOverlay 底透明、
     前景 TextFillColorPrimaryBrush。PL16:全部重定向 Fluent 画刷族
     (权威 AppBarToggleButton_themeresources.xaml Default L5-L67)。 */
  --atb-highlight: var(--wui-accent-fill-color-default); /* BackgroundChecked(仅 Checked 态点亮) */
  --atb-highlight-opacity: 0;
  --atb-overlay: var(--wui-subtle-fill-color-transparent); /* BackgroundHighLightOverlay = 透明 */
  --atb-fg: var(--wui-text-fill-color-primary);
  --atb-accel: var(--wui-text-fill-color-secondary);
  /* AppBarToggleButtonBorderBrush 四态均 ControlFillColorTransparentBrush
     (Default/Light 字典 L26-29)→ 未选中态不渲染立体描边环 */
  --atb-elevation-border: none;
}

/* PointerOver(未选中):底 SubtleFillColorSecondaryBrush + 前景 TextFillColorPrimaryBrush */
.wui-appbar-toggle-button:hover:not(:disabled) {
  --atb-overlay: var(--wui-subtle-fill-color-secondary);
  --atb-fg: var(--wui-text-fill-color-primary);
  --atb-accel: var(--wui-text-fill-color-secondary);
}

/* Pressed(未选中):底 SubtleFillColorTertiaryBrush + 前景 TextFillColorSecondaryBrush */
.wui-appbar-toggle-button:active:not(:disabled) {
  --atb-overlay: var(--wui-subtle-fill-color-tertiary);
  --atb-fg: var(--wui-text-fill-color-secondary);
  --atb-accel: var(--wui-text-fill-color-tertiary);
}

/* Disabled(未选中):底 SubtleFillColorDisabledBrush(透明)、前景 TextFillColorDisabledBrush */
.wui-appbar-toggle-button:disabled {
  --atb-fg: var(--wui-text-fill-color-disabled);
  --atb-accel: var(--wui-text-fill-color-disabled);
}

/* Checked:强调色底点亮(Opacity 0→1;Fill=AccentFillColorDefaultBrush)、
   前景 TextOnAccentFillColorPrimaryBrush;描边 AccentControlElevationBorderBrush(渐变,PL5) */
.wui-appbar-toggle-button--checked {
  --atb-highlight: var(--wui-accent-fill-color-default);
  --atb-highlight-opacity: 1;
  --atb-overlay: var(--wui-subtle-fill-color-transparent);
  --atb-fg: var(--wui-text-on-accent-fill-color-primary);
  --atb-accel: var(--wui-text-fill-color-secondary);
  --atb-elevation-border: var(--wui-accent-control-elevation-border);
}

/* CheckedPointerOver:底 AccentFillColorSecondaryBrush、前景 TextOnAccentFillColorPrimaryBrush;
   描边同 Checked(源 CheckedPointerOver 仍指向 AccentControlElevationBorderBrush) */
.wui-appbar-toggle-button--checked:hover:not(:disabled) {
  --atb-highlight: var(--wui-accent-fill-color-secondary);
  --atb-highlight-opacity: 1;
  --atb-overlay: var(--wui-subtle-fill-color-transparent);
  --atb-fg: var(--wui-text-on-accent-fill-color-primary);
  --atb-accel: var(--wui-text-fill-color-secondary);
  --atb-elevation-border: var(--wui-accent-control-elevation-border);
}

/* CheckedPressed:底 AccentFillColorTertiaryBrush、前景 TextOnAccentFillColorSecondaryBrush;
   BorderBrush=ControlFillColorTransparentBrush(透明) */
.wui-appbar-toggle-button--checked:active:not(:disabled) {
  --atb-highlight: var(--wui-accent-fill-color-tertiary);
  --atb-highlight-opacity: 1;
  --atb-overlay: var(--wui-subtle-fill-color-transparent);
  --atb-fg: var(--wui-text-on-accent-fill-color-secondary);
  --atb-accel: var(--wui-text-fill-color-tertiary);
  --atb-elevation-border: none;
}

/* CheckedDisabled:底 AccentFillColorDisabledBrush、前景 TextOnAccentFillColorDisabled;
   BorderBrush 透明(置后覆盖 Disabled 前景) */
.wui-appbar-toggle-button--checked:disabled {
  --atb-highlight: var(--wui-accent-fill-color-disabled);
  --atb-highlight-opacity: 1;
  --atb-overlay: var(--wui-subtle-fill-color-transparent);
  --atb-fg: var(--wui-text-on-accent-fill-color-disabled);
  --atb-accel: var(--wui-text-fill-color-disabled);
  --atb-elevation-border: none;
}

/* ======================================================================
 * PL5 立体描边环(AccentControlElevationBorderBrush):与 Button 同款 mask 环实现
 * (border-image 不随圆角裁切的取舍见 Button.vue);
 * 厚度 1:源 AppBarToggleButtonBorderThemeThickness = 1(L200);
 * 几何:本控件 border: none(未设 CSS border),绝对定位包含块 = border box →
 *       inset:0 即外缘贴盒边,环厚 1px;不参与布局 → 尺寸/圆角/字号不变。
 * 注意:源 Checked 态 InnerBorder BackgroundSizing=OuterBorderEdge(L343)→ 强调色底
 *       铺到外框边,渐变描边正压在其上(与本库 __highlight 层 inset:0 的现状一致)。
 * 互斥:Reveal 变体(CommandBar 内默认启用)的光照层由 reveal.css 的 ::before/::after
 *       承载,故仍以 :not(.wui-reveal) 排除,保持「Reveal 变体走 legacy 材料、
 *       不叠加 Fluent 立体描边」的一致约定(与 Button/RepeatButton/ToggleButton 同规则)。
 * 层级:本控件有两层 z-index:0 的绝对定位底色(高亮/覆盖),按同层内文档顺序,
 *       最早出现的 ::before 会先绘制 → 需 z-index:1 才浮在底色层之上;图标/标签
 *       (position:relative; z-index:1,文档中更晚)仍在其上 → 内容不被遮挡。
 * ====================================================================== */
.wui-appbar-toggle-button:not(.wui-reveal)::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  padding: 1px;
  background: var(--atb-elevation-border, none);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

/* ======================================================================
 * 布局(对照模板 Root + ContentRoot):Width=68(Setter)、ContentRoot
 * MinHeight=AppBarThemeMinHeight=64(WinUI 3);第 0 行 = 图标(*)+ 加速键角标(Auto),
 * 第 1 行 = 标签;两层底色为绝对定位图层,内容相对定位保持在其上。
 * ====================================================================== */
.wui-appbar-toggle-button {
  display: inline-grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  box-sizing: border-box;
  min-height: 64px; /* AppBarThemeMinHeight(WinUI 3 = 64;CommandBar_themeresources.xaml L71) */
  padding: 0;
  font-family: var(--wui-content-control-theme-font-family);
  font-weight: 400;
  /* AppBarToggleButtonBackground = SubtleFillColorTransparentBrush;BorderBrush 各态见上方状态变量 */
  background: var(--wui-subtle-fill-color-transparent);
  border: none;
  /* WinUI 3 默认 ControlCornerRadius = 4;无同名 token,取最近似的圆角 token(见 wiki 差异节) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  color: var(--atb-fg);
  cursor: default;
  user-select: none;
  touch-action: manipulation;
  position: relative;
}

/* 选中强调色底(CheckedHighlightBackground Rectangle):盖满圆角,随状态色/透明度切换。
   背景色隐式过渡:源 AppBarToggleButton_themeresources.xaml L470-472 在
   AppBarToggleButtonInnerBorder 上声明 BackgroundTransition = BrushTransition 83ms
   (Checked/CheckedDisabled 改 InnerBorder.Background);本层承载该底色 → 83ms 线性。
   注:Checked 态本库以 opacity 0→1 复刻(非 background-color 变化),故此处过渡不呈现;
   仅 Checked→CheckedDisabled 的底色切换(accent→disabled accent)经此过渡。 */
.wui-appbar-toggle-button__highlight {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: var(--atb-highlight);
  opacity: var(--atb-highlight-opacity);
  pointer-events: none;
  transition: background-color 83ms linear;
}

/* 悬停/按下列表高亮层(未选中态承载 SubtleFillColorSecondary/Tertiary;Checked 态置透明,
   强调色底改由 __highlight 层按 AccentFillColor* 换档)。背景色隐式过渡:
   源 InnerBorder.BackgroundTransition(L470-472)的状态底色切换映射到本层 → 83ms 线性。 */
.wui-appbar-toggle-button__overlay {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: var(--atb-overlay);
  pointer-events: none;
  transition: background-color 83ms linear;
}

/* 图标列:ContentViewbox Height=16 + AppBarButtonContentViewboxCollapsedMargin=0,16,0,2(WinUI 3);
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
  margin: 16px 0 2px;
  min-width: 0;
  color: inherit;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 16px;
  line-height: 1;
}

/* 加速键角标:KeyboardAcceleratorTextLabel(默认 Visibility=Collapsed —— 样式设
   KeyboardAcceleratorPlacementMode=Hidden;仅溢出区切 KeyboardAcceleratorTextVisible,
   见 AppBarButtonHelpers.h L201-206)。主命令区不占列宽、不压标签:
   默认 display:none 退出网格;父级(CommandBar 溢出层)把 --wui-app-bar-accelerator-display 置为 block 后呈现。
   前景 AppBarToggleButtonKeyboardAcceleratorTextForeground = SystemControlForegroundBaseMediumBrush */
.wui-appbar-toggle-button__accelerator {
  display: var(--wui-app-bar-accelerator-display, none);
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

/* 标签:TextLabel FontSize=12 + AppBarToggleButtonTextLabelMargin=2,0,2,8、居中、可换行。
   TextWrapping=Wrap 只按词边界折行(仅超宽单词才拆字),故不设 word-break:
   否则 min-content 会塌到 1 字符,角标一旦占列即出现「逐字换行」 */
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
  color: inherit;
}

/* 紧凑态(ApplicationViewStates → Compact):TextLabel Collapsed,仅剩图标 */
.wui-appbar-toggle-button--compact .wui-appbar-toggle-button__label {
  display: none;
}

/* 系统焦点视觉:FocusVisualMargin=-3、UseSystemFocusVisuals=True
   (AppBarToggleButton_themeresources.xaml L222-223;OverflowStyle 继承同一默认样式)
   → FIX8 共享层 -3 族几何(两环全外:secondary [0,1] + primary [1,3],相邻无缝),
   复用 focus-visual.css 的 --wui-focus-visual-* 共享 token,与 .wui-focus-visible 工具类同形
   (不走共享类:scoped 的 :focus outline:none 需留在组件内,避免与全局类产生层叠竞争) */
.wui-appbar-toggle-button:focus {
  outline: none;
}
.wui-appbar-toggle-button:focus-visible {
  outline: var(--wui-focus-visual-primary-thickness) solid var(--wui-focus-visual-primary);
  outline-offset: var(--wui-focus-visual-offset);
  box-shadow: 0 0 0 var(--wui-focus-visual-secondary-thickness) var(--wui-focus-visual-secondary);
}

/* ======================================================================
 * Reveal 揭示光照(reveal prop / CommandBar 内默认,公共层 reveal.css):
 * ::before 底板光 + ::after 边框光(根未占用,双类直挂)。边框光半径取源 narrow
 * 配置 ≈ 39px(RevealBorderLight.cpp L24-35,小尺寸控件同 Button 系口径);光环
 * 厚度 = AppBarToggleButtonRevealBorderThemeThickness 1(G.xaml L1398)。悬停/按压
 * 高亮 = 非 reveal 同一 Fluent 状态色(PL16);reveal 只叠加光照层,不再另取 legacy
 * ListLow/ListMedium。
 * ====================================================================== */
.wui-appbar-toggle-button.wui-reveal {
  --wui-reveal-border-width: 1px;
  --wui-reveal-border-radius: 39px;
}

/* 光层压到内容之下(源 SpotlightLayer 在背景之上、内容之下):根由 .wui-reveal
   建立 z-index:0 层叠上下文,-1 使 ::before/::after 落在 __highlight/__overlay
   (z-index:0)与内容(z-index:1)之下、根背景之上 */
.wui-appbar-toggle-button.wui-reveal::before,
.wui-appbar-toggle-button.wui-reveal--border::after {
  z-index: -1;
}
</style>
