<script setup lang="ts">
// PasswordBox.vue —— WinUI PasswordBox 的 Web 复刻(密码输入)。
// 视觉与状态对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 的
// <Style TargetType="PasswordBox">(L20267 起):Normal / PointerOver / Focused / Disabled
// 四态 + RevealButton(揭示按钮)的 ButtonVisible/ButtonCollapsed 状态;
// 颜色/字号取 theme.css 的 --wui-* token,结构尺寸取源键值(见 wiki 差异说明)。
// 同族实现沿用已过 QA 的 TextBox.vue 约定(token、Focused > PointerOver 优先级、按钮 mousedown.prevent 时序)。
import { computed, ref, useId } from 'vue'

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
  <div v-bind="$attrs" class="wui-password-box" :class="rootClass">
    <!-- HeaderContentPresenter:PasswordBoxTopHeaderMargin = 0,0,0,4 -->
    <label v-if="header" class="wui-password-box-header" :for="inputId">{{ header }}</label>

    <div class="wui-password-box-border">
      <input
        :id="inputId"
        class="wui-password-box-input"
        :type="inputType"
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

/* —— BorderElement:TextControlBorderThemeThickness = 2(四周),MinHeight 32 —— */
.wui-password-box-border {
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 32px; /* TextControlThemeMinHeight */
  background: var(--wui-text-control-background);
  border: 2px solid var(--wui-text-control-border);
}

/* 源模板无 CornerRadius 设置,默认直角;不做圆角(差异见 wiki)。 */

/* —— PointerOver 状态:VSM 优先级 Focused > PointerOver > Disabled 思路的 CSS 映射
      (沿用 TextBox 已过 QA 的写法:hover 不命中聚焦态,Disabled 仍优先) —— */
.wui-password-box:not(.is-disabled) .wui-password-box-border:not(:focus-within):hover {
  background: var(--wui-text-control-background-pointer-over);
  border-color: var(--wui-text-control-border-brush-pointer-over);
}

.wui-password-box:not(.is-disabled) .wui-password-box-border:not(:focus-within):hover .wui-password-box-input {
  color: var(--wui-text-control-foreground-pointer-over);
}

.wui-password-box:not(.is-disabled)
  .wui-password-box-border:not(:focus-within):hover
  .wui-password-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground-pointer-over);
}

/* —— Focused 状态:实底背景 + 强调色边框(UseSystemFocusVisuals 默认关闭,
      模板 Focused 态即键盘焦点指示,无需额外 outline) —— */
.wui-password-box-border:focus-within {
  background: var(--wui-text-control-background-focused);
  border-color: var(--wui-text-control-border-brush-focused, var(--wui-system-accent-color));
}

.wui-password-box-border:focus-within .wui-password-box-input {
  color: var(--wui-text-control-foreground-focused);
}

.wui-password-box-border:focus-within .wui-password-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground-focused);
}

/* —— 内容元素(ContentElement):TextControlThemePadding = 10,3,6,6 —— */
.wui-password-box-input {
  flex: 1;
  min-width: 0;
  padding: 3px 6px 6px 10px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize */
  color: var(--wui-text-control-foreground);
  caret-color: var(--wui-text-control-foreground);
  background: transparent;
  border: none;
  outline: none;
}

.wui-password-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground);
  opacity: 1;
}

/* 选区高亮 = TextControlSelectionHighlightColor */
.wui-password-box-input::selection {
  background: var(--wui-text-control-selection-highlight-color, var(--wui-system-accent-color));
}

/* —— Disabled 状态 —— */
.wui-password-box.is-disabled .wui-password-box-header {
  color: var(--wui-text-control-header-foreground-disabled);
}

.wui-password-box.is-disabled .wui-password-box-border {
  background: var(--wui-text-control-background-disabled);
  border-color: var(--wui-text-control-border-brush-disabled);
}

.wui-password-box.is-disabled .wui-password-box-input {
  color: var(--wui-text-control-foreground-disabled);
  cursor: default;
}

.wui-password-box.is-disabled .wui-password-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground-disabled);
}

/* —— RevealButton(揭示按钮):TextControlButton* 画刷族;
      HelperButtonThemePadding = 0,0,-2,0(覆盖右边界 2px);Disabled 态源模板 Opacity=0,
      本实现直接不渲染(v-if 已排除 disabled) —— */
.wui-password-box-reveal-button {
  flex: none;
  width: 34px; /* RevealButton MinWidth = 34 */
  margin-right: -2px; /* HelperButtonThemePadding */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size); /* GlyphElement FontSize = 12,取同值 token */
  color: var(--wui-text-control-button-foreground);
  background: var(--wui-text-control-button-background);
  border: none;
  cursor: pointer;
}

.wui-password-box-reveal-button:hover {
  color: var(--wui-text-control-button-foreground-pointer-over);
  background: var(--wui-text-control-button-background-pointer-over);
}

.wui-password-box-reveal-button:active {
  color: var(--wui-text-control-button-foreground-pressed);
  background: var(--wui-text-control-button-background-pressed);
}
</style>
