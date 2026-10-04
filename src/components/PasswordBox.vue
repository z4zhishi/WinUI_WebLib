<script setup lang="ts">
// PasswordBox.vue —— WinUI PasswordBox 的 Web 复刻(密码输入)。
// 视觉与状态对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 的
// <Style TargetType="PasswordBox">(L20267 起):Normal / PointerOver / Focused / Disabled
// 四态 + RevealButton(揭示按钮)的 ButtonVisible/ButtonCollapsed 状态;
// 颜色/字号取 theme.css 的 --wui-* token,结构尺寸取源键值(见 wiki 差异说明)。
// 同族实现沿用已过 QA 的 TextBox.vue 约定(token、Focused > PointerOver 优先级、按钮 mousedown.prevent 时序)。
import { computed, ref, useAttrs, useId } from 'vue'

defineOptions({ name: 'WuiPasswordBox', inheritAttrs: false })

/** WinUI PasswordRevealMode 三档。 */
type PasswordRevealMode = 'Hidden' | 'Visible' | 'Peek'

const props = withDefaults(
  defineProps<{
    /** 输入框上方标头文本(WinUI Header)。 */
    header?: string
    /** 空内容时显示的占位文本(WinUI PlaceholderText)。 */
    placeholderText?: string
    /**
     * 揭示模式(WinUI PasswordRevealMode):
     * Peek(默认)聚焦且有内容期间显示揭示按钮,按住临时明文;
     * Visible 始终明文(无按钮);Hidden 始终掩码(无按钮)。
     */
    passwordRevealMode?: PasswordRevealMode
    /** 最大字符数;0 表示不限制(WinUI MaxLength)。 */
    maxLength?: number
    /** autocomplete 属性透传;默认 new-password 抑制浏览器密码自动填充误配。 */
    autocomplete?: string
    /** 禁用态,走原生 input disabled,样式对照 Disabled 视觉状态。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    placeholderText: '',
    passwordRevealMode: 'Peek',
    maxLength: 0,
    autocomplete: 'new-password',
    disabled: false,
  },
)

/** 密码值,支持 v-model:password(WinUI PasswordBox.Password)。 */
const password = defineModel<string>('password', { default: '' })

/** WinUI PasswordChanged:密码变化时触发,参数为当前密码值。 */
const emit = defineEmits<{
  (e: 'passwordChanged', value: string): void
}>()

const inputId = useId()

// —— 无障碍名:a11y QA(label 规则)。header 有 label[for] 关联;无 header 时取调用方
// attrs 的 aria-label / aria-labelledby,再退 placeholderText。attrs 落点从根 div
// (无 role,禁止 aria-label)迁移到 input 上。
const attrs = useAttrs()

const callerAriaLabel = computed(() =>
  typeof attrs['aria-label'] === 'string' ? attrs['aria-label'] : undefined,
)
const callerLabelledBy = computed(() =>
  typeof attrs['aria-labelledby'] === 'string' ? attrs['aria-labelledby'] : undefined,
)

/** input 的可访问名:header 经 label[for] 关联,故仅无 header 时注入。 */
const inputAriaLabel = computed(() =>
  props.header ? undefined : (callerAriaLabel.value || props.placeholderText || undefined),
)
const inputAriaLabelledBy = computed(() =>
  props.header ? undefined : callerLabelledBy.value,
)

/** 根元素透传 attrs:剥离已迁移的 aria-label / aria-labelledby。 */
const rootAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'aria-label' || key === 'aria-labelledby') continue
    rest[key] = value
  }
  return rest
})

// —— 焦点 / IME 组合 / 按住揭示状态 ——
const focused = ref(false)
const composing = ref(false)
const revealing = ref(false)

// 已通知出去的值:用于 IME 组合收尾时按浏览器事件顺序去重,保证组合结束只补发一次。
let lastNotified = password.value

function notifyChanged(value: string): void {
  if (value === lastNotified) return
  lastNotified = value
  emit('passwordChanged', value)
}

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  // Password 属性实时同步(v-model),与 WinUI 组合期间 Password 持续更新一致。
  password.value = value
  // 任务约定:IME 组合期间不触发 passwordChanged,组合结束后统一补发一次。
  if (!composing.value) notifyChanged(value)
}

function onCompositionStart(): void {
  composing.value = true
}

function onCompositionEnd(event: CompositionEvent): void {
  composing.value = false
  // 兼容不同浏览器顺序(Chrome:input→compositionend;Safari:compositionend→input),
  // notifyChanged 按值去重,最终恰好触发一次。
  notifyChanged((event.target as HTMLInputElement).value)
}

function onFocus(): void {
  focused.value = true
}

function onBlur(): void {
  focused.value = false
  // 焦点离开即结束临时揭示(WinUI Peek:失焦按钮折叠,掩码恢复)。
  revealing.value = false
}

// —— 揭示按钮可见性(WinUI ButtonVisible 状态):仅 Peek 模式 + 聚焦 + 有内容; ——
// Visible/Hidden 模式按钮恒折叠(与源模板 ButtonStates 一致);禁用态不提供揭示入口。
const revealButtonVisible = computed(
  () => props.passwordRevealMode === 'Peek' && !props.disabled && focused.value && password.value.length > 0,
)

// —— 掩码切换:只切换 type(password/text),绝不改动值,也不写入任何 aria 标签 ——
const inputType = computed(() => (props.passwordRevealMode === 'Visible' || revealing.value ? 'text' : 'password'))

// 按住揭示(WinUI Peek:按钮按下期间临时明文,松开恢复掩码)。
// mousedown.prevent 阻止焦点转移:输入框保持聚焦,按钮不因 blur 折叠,mouseup 才能命中 window。
function onRevealMouseDown(event: MouseEvent): void {
  event.preventDefault()
  revealing.value = true
  window.addEventListener(
    'mouseup',
    () => {
      revealing.value = false
    },
    { once: true },
  )
}

// —— 根节点状态类(Disabled 为模板视觉状态) ——
const rootClass = computed(() => ({
  'is-disabled': props.disabled,
}))
</script>

<template>
  <div v-bind="rootAttrs" class="wui-password-box" :class="rootClass">
    <!-- HeaderContentPresenter:PasswordBoxTopHeaderMargin = 0,0,0,4 -->
    <label v-if="header" class="wui-password-box-header" :for="inputId">{{ header }}</label>

    <div class="wui-password-box-border">
      <input
        :id="inputId"
        class="wui-password-box-input"
        :type="inputType"
        :aria-label="inputAriaLabel"
        :aria-labelledby="inputAriaLabelledBy"
        :value="password"
        :placeholder="placeholderText"
        :disabled="disabled"
        :maxlength="maxLength > 0 ? maxLength : undefined"
        :autocomplete="autocomplete"
        spellcheck="false"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />
      <!-- RevealButton:glyph U+E052(RedEye,Segoe Fluent Icons / MDL2),MinWidth 34,IsTabStop=False -->
      <button
        v-if="revealButtonVisible"
        type="button"
        class="wui-password-box-reveal-button"
        tabindex="-1"
        aria-hidden="true"
        @mousedown="onRevealMouseDown"
      >
        &#xE052;
      </button>
    </div>
  </div>
</template>

<style scoped>
.wui-password-box {
  display: flex;
  flex-direction: column;
  min-width: 64px; /* TextControlThemeMinWidth */
}

/* —— Header(WinUI Header):字号同 ControlContentThemeFontSize —— */
.wui-password-box-header {
  margin: 0 0 4px; /* PasswordBoxTopHeaderMargin = 0,0,0,4 */
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-text-control-header-foreground);
}

/* —— BorderElement:TextControlBorderThemeThickness = 1(四周),MinHeight 32 ——
   XAML 的 MinHeight 计入边框(外缘 32、内容区 30),CSS 对应 border-box:总高 32 含
   1px 边框(content-box 会撑成 34px,VR-B7 F-B7-3;修法同 FIX6 ComboBox/TextBox)。
   PL7:厚度取 WinUI 3 权威(Common_themeresources.xaml L10/L24 = 1;legacy dxaml
   generic.xaml L173 的 2 已替换);Focused = L11/L25 = 1,1,1,2(施加点
   PasswordBox_themeresources.xaml L157)。
   PL6:状态色重定向到 Fluent 画刷族(同 TextBox,权威见 TextBox_themeresources.xaml)。 */
.wui-password-box-border {
  position: relative;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 32px; /* TextControlThemeMinHeight(含边框) */
  background: var(--wui-control-fill-color-default);
  border: 1px solid var(--wui-control-fill-color-transparent);
  border-radius: var(--wui-control-corner-radius); /* ControlCornerRadius = 4(V3 QA 打回项) */
  /* Normal / PointerOver 边框 = TextControlElevationBorderBrush(渐变) */
  --pb-elevation-border: var(--wui-text-control-elevation-border);
}

/* PL6 立体描边环(TextControlElevationBorderBrush):内嵌 mask 环,原理同 TextBox.vue;
   PL7 环厚随宿主 border 改为 1px(inset / padding 同步改 1px)。 */
.wui-password-box-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: var(--pb-elevation-border, none);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

/* —— PointerOver 状态:VSM 优先级 Focused > PointerOver > Disabled 思路的 CSS 映射
      (沿用 TextBox 已过 QA 的写法:hover 不命中聚焦态,Disabled 仍优先) —— */
.wui-password-box:not(.is-disabled) .wui-password-box-border:not(:focus-within):hover {
  background: var(--wui-control-fill-color-secondary);
  --pb-elevation-border: var(--wui-text-control-elevation-border);
}

.wui-password-box:not(.is-disabled) .wui-password-box-border:not(:focus-within):hover .wui-password-box-input {
  color: var(--wui-text-fill-color-primary);
}

.wui-password-box:not(.is-disabled)
  .wui-password-box-border:not(:focus-within):hover
  .wui-password-box-input::placeholder {
  color: var(--wui-text-fill-color-secondary);
}

/* —— Focused 状态:Background = ControlFillColorInputActiveBrush,
      BorderBrush = TextControlBorderBrushFocused(视觉等价 accent 实色 → 环 none);
      PL7 厚度 = TextControlBorderThemeThicknessFocused = 1,1,1,2(下边 2px 强调色)。 —— */
.wui-password-box-border:focus-within {
  background: var(--wui-control-fill-color-input-active);
  border-color: var(--wui-system-accent-color);
  border-width: 1px 1px 2px 1px; /* TextControlBorderThemeThicknessFocused = 1,1,1,2 */
  --pb-elevation-border: none;
}

.wui-password-box-border:focus-within .wui-password-box-input {
  color: var(--wui-text-fill-color-primary);
}

.wui-password-box-border:focus-within .wui-password-box-input::placeholder {
  color: var(--wui-text-fill-color-secondary);
}

/* —— 内容元素(ContentElement):TextControlThemePadding ——
   现值 10,3,6,6 = legacy dxaml generic.xaml L175;WinUI 3 权威(Common_themeresources
   L12/L26)为 10,5,6,6。PL7 只改边框厚度,未改本值(差异见 PL7 报告未决项 1)。 —— */
.wui-password-box-input {
  flex: 1;
  min-width: 0;
  padding: 3px 6px 6px 10px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize */
  color: var(--wui-text-fill-color-primary);
  caret-color: var(--wui-text-fill-color-primary);
  background: transparent;
  border: none;
  outline: none;
}

.wui-password-box-input::placeholder {
  color: var(--wui-text-fill-color-secondary);
  opacity: 1;
}

/* 选区高亮 = TextControlSelectionHighlightColor */
.wui-password-box-input::selection {
  background: var(--wui-text-control-selection-highlight-color, var(--wui-system-accent-color));
}

/* —— Disabled 状态:ControlFillColorDisabled / ControlStrokeColorDefault /
      TemporaryTextFillColorDisabled / TextFillColorDisabled(占位符)。 —— */
.wui-password-box.is-disabled .wui-password-box-header {
  color: var(--wui-text-control-header-foreground-disabled);
}

.wui-password-box.is-disabled .wui-password-box-border {
  background: var(--wui-control-fill-color-disabled);
  border-color: var(--wui-control-stroke-color-default);
  --pb-elevation-border: none;
}

.wui-password-box.is-disabled .wui-password-box-input {
  color: var(--wui-temporary-text-fill-color-disabled);
  cursor: default;
}

.wui-password-box.is-disabled .wui-password-box-input::placeholder {
  color: var(--wui-text-fill-color-disabled);
}

/* —— RevealButton(揭示按钮):PL6 重定向到 TextControlButton* Fluent 画刷
      (同 TextBox DeleteButton);HelperButtonThemePadding = 0,0,-2,0
      (dxaml generic.xaml L176,controls/dev 未覆写,与边框厚度无关的固定值,PL7 保留)。
      Disabled 态源模板 Opacity=0,本实现直接不渲染(v-if 已排除 disabled)。 —— */
.wui-password-box-reveal-button {
  flex: none;
  width: 34px; /* RevealButton MinWidth = 34 */
  margin-right: -2px; /* HelperButtonThemePadding = 0,0,-2,0 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size); /* GlyphElement FontSize = 12,取同值 token */
  color: var(--wui-text-fill-color-secondary);
  background: var(--wui-control-fill-color-transparent);
  border: none;
  cursor: pointer;
}

.wui-password-box-reveal-button:hover {
  color: var(--wui-text-fill-color-secondary);
  background: var(--wui-subtle-fill-color-secondary);
}

.wui-password-box-reveal-button:active {
  color: var(--wui-text-fill-color-tertiary);
  background: var(--wui-subtle-fill-color-tertiary);
}
</style>
