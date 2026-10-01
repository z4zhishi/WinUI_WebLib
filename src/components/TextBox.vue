<script setup lang="ts">
// TextBox.vue —— WinUI TextBox 的 Web 复刻(单行文本输入)。
// 视觉与状态对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 的
// <Style TargetType="TextBox">(L21358 起):Normal / PointerOver / Focused / Disabled
// 四态 + DeleteButton(清除按钮)的 ButtonVisible/ButtonCollapsed 状态;
// 颜色/字号取 theme.css 的 --wui-* token,结构尺寸取源键值(见 wiki 差异说明)。
import { computed, ref, useAttrs, useId } from 'vue'

defineOptions({ name: 'WuiTextBox', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 输入框上方标头文本(WinUI Header)。 */
    header?: string
    /** 空内容时显示的占位文本(WinUI PlaceholderText)。 */
    placeholderText?: string
    /** 是否启用清除按钮;WinUI 1.4+ 行为:聚焦且有内容期间显示(WinUI ClearButtonEnabled)。 */
    clearButtonEnabled?: boolean
    /** 只读:内容不可编辑但可选择复制(WinUI IsReadOnly)。 */
    isReadOnly?: boolean
    /** 最大字符数;0 表示不限制(WinUI MaxLength)。 */
    maxLength?: number
    /** 禁用态,走原生 input disabled,样式对照 Disabled 视觉状态。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    placeholderText: '',
    clearButtonEnabled: true,
    isReadOnly: false,
    maxLength: 0,
    disabled: false,
  },
)

/** 文本值,支持 v-model:text(WinUI TextBox.Text)。 */
const text = defineModel<string>('text', { default: '' })

/** WinUI TextChanged:文本变化时触发,参数为当前文本值。 */
const emit = defineEmits<{
  (e: 'textChanged', value: string): void
}>()

const inputId = useId()
const inputEl = ref<HTMLInputElement | null>(null)

// —— 无障碍名:a11y QA(label / aria-input-field-name)。header 有 label[for] 关联;
// 无 header 时取调用方 attrs 的 aria-label / aria-labelledby,再退 placeholderText
// (placeholder 本身不构成可访问名)。attrs 落点从根 div(无 role,禁止 aria-label)
// 迁移到 input 上。
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

// —— 焦点 / IME 组合状态 ——
const focused = ref(false)
const composing = ref(false)

// 已通知出去的值:用于 IME 组合收尾时按浏览器事件顺序去重,保证组合结束只补发一次。
let lastNotified = text.value

function notifyChanged(value: string): void {
  if (value === lastNotified) return
  lastNotified = value
  emit('textChanged', value)
}

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  // Text 属性实时同步(v-model),与 WinUI 组合期间 Text 持续更新一致。
  text.value = value
  // 任务约定:IME 组合期间不触发 textChanged,组合结束后统一补发一次。
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

// 清除按钮可见性(WinUI ButtonVisible 状态):启用 + 聚焦 + 有内容;
// 只读框不提供清除入口(与源模板的差异,见 wiki)。
const clearButtonVisible = computed(
  () => props.clearButtonEnabled && !props.isReadOnly && !props.disabled && focused.value && text.value.length > 0,
)

// 清除:清空文本、触发 textChanged,并把焦点送回输入框(WinUI OnDeleteButtonClick 行为)。
function onClearMouseDown(event: MouseEvent): void {
  // 阻止默认聚焦转移,输入框保持聚焦,按钮不因 blur 折叠,click 才能命中。
  event.preventDefault()
}

function onClearClick(): void {
  text.value = ''
  notifyChanged('')
  inputEl.value?.focus()
}

// —— 根节点状态类(Disabled 为模板视觉状态;IsReadOnly 仅供内部样式钩子) ——
const rootClass = computed(() => ({
  'is-disabled': props.disabled,
  'is-readonly': props.isReadOnly,
}))
</script>

<template>
  <div v-bind="rootAttrs" class="wui-text-box" :class="rootClass">
    <!-- HeaderContentPresenter:TextBoxTopHeaderMargin = 0,0,0,4 -->
    <label v-if="header" class="wui-text-box-header" :for="inputId">{{ header }}</label>

    <div class="wui-text-box-border">
      <input
        :id="inputId"
        ref="inputEl"
        class="wui-text-box-input"
        type="text"
        :aria-label="inputAriaLabel"
        :aria-labelledby="inputAriaLabelledBy"
        :value="text"
        :placeholder="placeholderText"
        :readonly="isReadOnly"
        :disabled="disabled"
        :maxlength="maxLength > 0 ? maxLength : undefined"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />
      <!-- DeleteButton:glyph U+E10A(Segoe Fluent Icons / MDL2),MinWidth 34,IsTabStop=False -->
      <button
        v-if="clearButtonVisible"
        type="button"
        class="wui-text-box-delete-button"
        tabindex="-1"
        aria-hidden="true"
        @mousedown="onClearMouseDown"
        @click="onClearClick"
      >
        &#xE10A;
      </button>
    </div>
  </div>
</template>

<style scoped>
.wui-text-box {
  display: flex;
  flex-direction: column;
  min-width: 64px; /* TextControlThemeMinWidth */
}

/* —— Header(WinUI Header):字号同 ControlContentThemeFontSize —— */
.wui-text-box-header {
  margin: 0 0 4px; /* TextBoxTopHeaderMargin = 0,0,0,4 */
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-text-control-header-foreground);
}

/* —— BorderElement:TextControlBorderThemeThickness = 2(四周),MinHeight 32 ——
   XAML 的 MinHeight 计入边框(BorderElement 外缘 32、内容区 28,ContentElement 以
   Margin=BorderThickness 内缩 2px),CSS 对应 border-box:总高 32 含 2px 边框
   (content-box 会撑成 36px,VR-B7 F-B7-1;修法同 FIX6 ComboBox)。 */
.wui-text-box-border {
  position: relative;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 32px; /* TextControlThemeMinHeight(含边框) */
  background: var(--wui-text-control-background);
  border: 2px solid var(--wui-text-control-border);
  border-radius: var(--wui-control-corner-radius); /* ControlCornerRadius = 4(V3 QA 打回项) */
}

/* —— PointerOver 状态:VSM 优先级 Focused > PointerOver > Disabled 思路的 CSS 映射 ——
   hover 规则加 :not(:focus-within)(QA F1):聚焦时 hover 规则整体不命中,
   Focused 实底背景 + 强调色边框不再被 pointer-over 灰遮蔽;
   :not(.is-disabled) 保证 Disabled 仍优先于 PointerOver(禁用态不可聚焦,focus-within 恒不命中)。 */
.wui-text-box:not(.is-disabled) .wui-text-box-border:not(:focus-within):hover {
  background: var(--wui-text-control-background-pointer-over);
  border-color: var(--wui-text-control-border-brush-pointer-over);
}

.wui-text-box:not(.is-disabled) .wui-text-box-border:not(:focus-within):hover .wui-text-box-input {
  color: var(--wui-text-control-foreground-pointer-over);
}

.wui-text-box:not(.is-disabled) .wui-text-box-border:not(:focus-within):hover .wui-text-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground-pointer-over);
}

/* —— Focused 状态:实底背景 + 强调色边框(UseSystemFocusVisuals 默认关闭,
      模板 Focused 态即键盘焦点指示,无需额外 outline) —— */
.wui-text-box-border:focus-within {
  background: var(--wui-text-control-background-focused);
  border-color: var(--wui-text-control-border-brush-focused, var(--wui-system-accent-color));
}

.wui-text-box-border:focus-within .wui-text-box-input {
  color: var(--wui-text-control-foreground-focused);
}

.wui-text-box-border:focus-within .wui-text-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground-focused);
}

/* —— 内容元素(ContentElement):TextControlThemePadding = 10,3,6,6 —— */
.wui-text-box-input {
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

.wui-text-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground);
  opacity: 1;
}

/* 选区高亮 = TextControlSelectionHighlightColor */
.wui-text-box-input::selection {
  background: var(--wui-text-control-selection-highlight-color, var(--wui-system-accent-color));
}

/* —— Disabled 状态 —— */
.wui-text-box.is-disabled .wui-text-box-header {
  color: var(--wui-text-control-header-foreground-disabled);
}

.wui-text-box.is-disabled .wui-text-box-border {
  background: var(--wui-text-control-background-disabled);
  border-color: var(--wui-text-control-border-brush-disabled);
}

.wui-text-box.is-disabled .wui-text-box-input {
  color: var(--wui-text-control-foreground-disabled);
  cursor: default;
}

.wui-text-box.is-disabled .wui-text-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground-disabled);
}

/* —— 只读:保持常态配色(源模板无只读视觉状态),仅不可编辑 —— */
.wui-text-box.is-readonly .wui-text-box-input {
  cursor: default;
}

/* —— DeleteButton(清除按钮):TextControlButton* 画刷族;
      HelperButtonThemePadding = 0,0,-2,0(覆盖右边界 2px)。
      Normal 前景用 helper 专用 token:源 TextControlButtonForeground 两字典同 ChromeBlackMedium
      (#000000cc),按钮只在聚焦白底出现,不吃 theme.css 的暗色语境覆写(FIX12 F-B7-2) —— */
.wui-text-box-delete-button {
  flex: none;
  width: 34px; /* DeleteButton MinWidth = 34 */
  margin-right: -2px; /* HelperButtonThemePadding */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size); /* GlyphElement FontSize = 12,取同值 token */
  color: var(--wui-text-control-helper-button-foreground);
  background: var(--wui-text-control-button-background);
  border: none;
  cursor: pointer;
}

.wui-text-box-delete-button:hover {
  color: var(--wui-text-control-button-foreground-pointer-over);
  background: var(--wui-text-control-button-background-pointer-over);
}

.wui-text-box-delete-button:active {
  color: var(--wui-text-control-button-foreground-pressed);
  background: var(--wui-text-control-button-background-pressed);
}
</style>
