<script lang="ts">
// NumberBox(WinUI NumberBox 迁移):类型与事件参数对外导出,供使用方与示例页引用。
/** 步进按钮布局(WinUI NumberBoxSpinButtonPlacementMode)。 */
export type NumberBoxSpinButtonPlacementMode = 'Hidden' | 'Compact' | 'Inline'

/**
 * 校验模式(WinUI NumberBoxValidationMode 的公开 API 值):
 * - 'InvalidInputOverwritten'(默认):解析失败的输入回退为上次有效值(源 ValidateInput);
 * - 'InvalidInputOverbound':越界输入被钳制到最近的边界值(源 CoerceValue)。
 * 注:CK 快照的 NumberBox.idl 枚举文本为 { InvalidInputOverwritten, Disabled },与公开 API 文档
 * (InvalidInputOverwritten / InvalidInputOverbound)不一致,本实现按任务要求与公开文档语义落地。
 */
export type NumberBoxValidationMode = 'InvalidInputOverwritten' | 'InvalidInputOverbound'

/** 数字格式化器(WinUI INumberFormatter2 + INumberParser 的 Web 合并形态)。 */
export interface NumberBoxFormatter {
  /** 数值 → 文本(WinUI FormatDouble)。 */
  format(value: number): string
  /** 文本 → 数值;无法解析时返回 null(WinUI ParseDouble 返回 null 的对应)。 */
  parse(text: string): number | null
}

/** valueChanged 事件参数(对应 WinUI NumberBoxValueChangedEventArgs)。 */
export interface NumberBoxValueChangedEventArgs {
  oldValue: number | null
  newValue: number | null
}

/** 显示层有效数字位数:源实现 m_displayRounder.SignificantDigits(10),用于屏蔽浮点误差。 */
const DISPLAY_SIGNIFICANT_DIGITS = 10

/** 把数值舍入到指定有效数字位数(对应源显示层 rounder,仅影响显示,不改动 Value 本体)。 */
function roundToSignificantDigits(value: number, digits: number): number {
  if (!Number.isFinite(value) || value === 0) return value
  const factor = 10 ** (digits - 1 - Math.floor(Math.log10(Math.abs(value))))
  return Math.round(value * factor) / factor
}

/**
 * 默认格式化器:任务约定的 Intl 实现(对应 WinUI 构造函数注入的区域感知 DecimalFormatter,
 * IntegerDigits=1 / FractionDigits=0,即不做补零、不加千分位分组)。
 */
const DEFAULT_NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
  useGrouping: false,
  maximumFractionDigits: 20,
})

const defaultFormatter: NumberBoxFormatter = {
  format(value: number): string {
    return DEFAULT_NUMBER_FORMAT.format(roundToSignificantDigits(value, DISPLAY_SIGNIFICANT_DIGITS))
  },
  parse(text: string): number | null {
    const trimmed = text.trim()
    // 只接受十进制数字字面量(含小数点与科学计数);WinUI ParseDouble 不接受 "0x10" 等形式
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  },
}
</script>

<script setup lang="ts">
// WinUI NumberBox 复刻。视觉与结构对照 CK/WinUI-Reference/controls/dev/NumberBox/NumberBox.xaml
// (默认 Style + ControlTemplate + NumberBoxSpinButtonStyle / NumberBoxPopupSpinButtonStyle /
// NumberBoxTextBoxStyle;通用规格锚点 generic.xaml 中该控件不在主表,主题资源见
// NumberBox_themeresources.xaml),行为对照 NumberBox.cpp:提交点(Enter keyup / 失焦 /
// 步进按钮与方向键 / 滚轮)才更新 Value 并触发 ValueChanged(非实时),输入过程文本自由编辑;
// 颜色/字号走 --wui-* token(文本框族 --wui-text-control-*,弹层近似 --wui-flyout-* / popup 基建)。
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'

defineOptions({ name: 'WuiNumberBox', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 输入框上方标头文本(WinUI Header)。 */
    header?: string
    /** 空内容时显示的占位文本(WinUI PlaceholderText)。 */
    placeholderText?: string
    /** 最小值(WinUI Minimum,默认 -double.max)。 */
    minimum?: number
    /** 最大值(WinUI Maximum,默认 +double.max)。 */
    maximum?: number
    /** 小步长:步进按钮 / 上下方向键 / 滚轮(WinUI SmallChange)。 */
    smallChange?: number
    /** 大步长:PageUp / PageDown(WinUI LargeChange)。 */
    largeChange?: number
    /** 步进按钮布局(WinUI SpinButtonPlacementMode)。 */
    spinButtonPlacementMode?: NumberBoxSpinButtonPlacementMode
    /** 校验模式(WinUI ValidationMode)。 */
    validationMode?: NumberBoxValidationMode
    /** 数字格式化器(WinUI NumberFormatter);缺省用 Intl 默认实现。 */
    numberFormatter?: NumberBoxFormatter
    /** 控件下方说明文本(WinUI Description)。 */
    description?: string
    /** 输入范围(WinUI InputScope,默认 Number);映射为原生 inputmode,其余值原样透传。 */
    inputScope?: string
    /** 禁用态,走原生 input disabled,样式对照 Disabled 视觉状态。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    placeholderText: '',
    minimum: -Number.MAX_VALUE,
    maximum: Number.MAX_VALUE,
    smallChange: 1,
    largeChange: 10,
    spinButtonPlacementMode: 'Hidden',
    validationMode: 'InvalidInputOverwritten',
    numberFormatter: undefined,
    description: '',
    inputScope: 'Number',
    disabled: false,
  },
)

/**
 * 当前值,支持 v-model:value;null 对应 WinUI 的 NaN(空输入即清值)。
 * 遵循 WinUI 语义:仅在提交点(Enter / 失焦 / 步进 / 滚轮)更新,输入过程不更新。
 */
const value = defineModel<number | null>('value', { default: null })

/** WinUI ValueChanged:提交点上值变化时触发(非实时;输入过程不触发)。 */
const emit = defineEmits<{
  valueChanged: [event: NumberBoxValueChangedEventArgs]
}>()

const inputId = useId()
const inputEl = ref<HTMLInputElement | null>(null)

// —— 有效取值范围(源 CoerceMinimum/CoerceMaximum:minimum > maximum 时收敛为同一值) ——
const effMin = computed(() => Math.min(props.minimum, props.maximum))
const effMax = computed(() => Math.max(props.minimum, props.maximum))

/** null / NaN / 非有限值统一视为「空」(WinUI NaN 语义)。 */
const effectiveValue = computed<number | null>(() => {
  const current = value.value
  return typeof current === 'number' && Number.isFinite(current) ? current : null
})

const currentFormatter = computed<NumberBoxFormatter>(() => props.numberFormatter ?? defaultFormatter)

const isInline = computed(() => props.spinButtonPlacementMode === 'Inline')
const isCompact = computed(() => props.spinButtonPlacementMode === 'Compact')

/** 原生 inputmode 的合法值(Vue 模板属性类型;lib.dom 的 inputMode 为宽泛 string,不能直接复用)。 */
type WuiInputMode = 'search' | 'text' | 'none' | 'email' | 'tel' | 'url' | 'decimal' | 'numeric'

/** 原生 inputmode:Number(WinUI 默认 InputScope)→ decimal,其余值原样透传给 inputmode。 */
const inputMode = computed<WuiInputMode>(() =>
  props.inputScope === 'Number' ? 'decimal' : (props.inputScope as WuiInputMode),
)

// —— 编辑文本:输入过程自由编辑;提交/程序化变更后按格式化器回写(源 UpdateTextToValue) ——
const editingText = ref('')

function displayText(v: number | null): string {
  return v === null ? '' : currentFormatter.value.format(v)
}

function syncEditorText(): void {
  editingText.value = displayText(effectiveValue.value)
}

syncEditorText()

// 外部写入 value / 更换格式化器时回写文本(源 OnNumberFormatterPropertyChanged 亦重刷文本)。
watch([value, currentFormatter], () => {
  syncEditorText()
})

// —— 错误旗标(任务「小红旗」;WinUI 无内建错误视觉,为 Web 增强): ——
// 'overbound' 越界钳制 / 'invalid' 解析失败;用户重新输入或下一次无纠错的提交即清除。
const errorKind = ref<'overbound' | 'invalid' | null>(null)

const errorHint = computed(() => {
  if (errorKind.value === 'overbound') return '输入超出范围,已钳制到最近的边界值'
  if (errorKind.value === 'invalid') {
    return props.validationMode === 'InvalidInputOverwritten' ? '无法解析输入,已回退上次有效值' : '无法解析输入'
  }
  return undefined
})

function clampValue(v: number): number {
  return Math.min(Math.max(v, effMin.value), effMax.value)
}

/** 统一提交入口:写回 model 并触发 valueChanged(值未变时不触发,与源 OnValuePropertyChanged 一致)。 */
function commitValue(next: number | null): void {
  const old = effectiveValue.value
  const same = old === null ? next === null : next !== null && Object.is(old, next)
  if (same) return
  value.value = next
  emit('valueChanged', { oldValue: old, newValue: next })
}

/**
 * 提交校验(源 ValidateInput):Enter keyup / 失焦 / 步进前调用。
 * - 空文本 → Value = null(源写 NaN);
 * - 解析失败 → Overwritten 模式回退上次有效值;Overbound 模式保留无效文本(源语义),两者都亮错误旗标;
 * - 越界 → Overbound 模式钳制到最近边界(源 CoerceValue);Overwritten 模式照单全收;
 * - 值未变时也按格式化器规范化文本(源:Value 相同仍 UpdateTextToValue)。
 */
function validateInput(): void {
  const text = editingText.value.trim()

  if (text === '') {
    errorKind.value = null
    commitValue(null)
    editingText.value = ''
    return
  }

  const parsed = currentFormatter.value.parse(text)

  if (parsed === null) {
    errorKind.value = 'invalid'
    if (props.validationMode === 'InvalidInputOverwritten') {
      editingText.value = displayText(effectiveValue.value)
    }
    return
  }

  if ((parsed < effMin.value || parsed > effMax.value) && props.validationMode === 'InvalidInputOverbound') {
    errorKind.value = 'overbound'
    commitValue(clampValue(parsed))
  } else {
    errorKind.value = null
    commitValue(parsed)
  }
  editingText.value = displayText(effectiveValue.value)
}

// —— 步进(源 StepValue):先提交文本再调整;Value 为空(null/NaN)时不步进 ——
function stepValue(change: number): void {
  if (props.disabled) return
  validateInput()
  const current = effectiveValue.value
  if (current === null) return
  const next =
    props.validationMode === 'InvalidInputOverbound' ? clampValue(current + change) : current + change
  commitValue(next)
  errorKind.value = null
  moveCaretToEnd()
}

function moveCaretToEnd(): void {
  // 源 MoveCaretToEnd:步进后光标置于文本末尾,避免跳到行首
  const el = inputEl.value
  if (!el) return
  const end = el.value.length
  el.setSelectionRange(end, end)
}

// —— 步进按钮长按连发(RepeatButton 语义;Pointer Events + setPointerCapture,QA 建议手势) ——
const SPIN_REPEAT_DELAY = 400
const SPIN_REPEAT_INTERVAL = 90
let repeatDelayId: number | null = null
let repeatIntervalId: number | null = null

function stopSpinRepeat(): void {
  if (repeatDelayId !== null) {
    window.clearTimeout(repeatDelayId)
    repeatDelayId = null
  }
  if (repeatIntervalId !== null) {
    window.clearInterval(repeatIntervalId)
    repeatIntervalId = null
  }
}

function startSpinRepeat(direction: number): void {
  stopSpinRepeat()
  stepValue(direction * props.smallChange)
  repeatDelayId = window.setTimeout(() => {
    repeatIntervalId = window.setInterval(() => {
      stepValue(direction * props.smallChange)
    }, SPIN_REPEAT_INTERVAL)
  }, SPIN_REPEAT_DELAY)
}

function onSpinPointerDown(event: PointerEvent, direction: number): void {
  // 阻止焦点转移(输入框保持聚焦,Compact 弹层不因 blur 关闭;沿用 TextBox 按钮的 preventDefault 时序)
  event.preventDefault()
  if (event.button !== 0 || props.disabled) return
  if (direction > 0 ? !upEnabled.value : !downEnabled.value) return
  const button = event.currentTarget
  if (button instanceof HTMLElement) button.setPointerCapture(event.pointerId)
  startSpinRepeat(direction)
}

// —— 步进按钮可用性(源 UpdateSpinButtonEnabled):Value 为空时双双禁用;
//      非 Overbound 模式恒可用;Overbound 模式到达边界后对应方向禁用 ——
const upEnabled = computed(() => {
  if (props.disabled) return false
  const current = effectiveValue.value
  if (current === null) return false
  if (props.validationMode !== 'InvalidInputOverbound') return true
  return current < effMax.value
})

const downEnabled = computed(() => {
  if (props.disabled) return false
  const current = effectiveValue.value
  if (current === null) return false
  if (props.validationMode !== 'InvalidInputOverbound') return true
  return current > effMin.value
})

// —— 取值范围变更 → 钳制(源 CoerceValue 由属性变更回调驱动,照常触发 ValueChanged) ——
watch([effMin, effMax], () => {
  if (props.validationMode !== 'InvalidInputOverbound') return
  const current = effectiveValue.value
  if (current === null) return
  const clamped = clampValue(current)
  if (!Object.is(clamped, current)) commitValue(clamped)
})

// —— 键盘(源 OnNumberBoxKeyDown / OnNumberBoxKeyUp):keydown 步进以获得按键重复 ——
function onKeyDown(event: KeyboardEvent): void {
  if (props.disabled) return
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      stepValue(props.smallChange)
      break
    case 'ArrowDown':
      event.preventDefault()
      stepValue(-props.smallChange)
      break
    case 'PageUp':
      event.preventDefault()
      stepValue(props.largeChange)
      break
    case 'PageDown':
      event.preventDefault()
      stepValue(-props.largeChange)
      break
  }
}

function onKeyUp(event: KeyboardEvent): void {
  if (props.disabled) return
  switch (event.key) {
    case 'Enter':
      validateInput()
      break
    case 'Escape':
      // 源:Escape 把文本恢复为当前值的格式化形式
      errorKind.value = null
      syncEditorText()
      break
  }
}

// —— 滚轮(源 OnNumberBoxScroll):聚焦时按 SmallChange 步进 ——
function onWheel(event: WheelEvent): void {
  if (props.disabled || !focused.value || event.deltaY === 0) return
  event.preventDefault()
  stepValue(event.deltaY < 0 ? props.smallChange : -props.smallChange)
}

// —— 焦点(源 OnNumberBoxGotFocus / OnNumberBoxLostFocus):聚焦全选 + Compact 弹层开关 ——
const focused = ref(false)
const popupOpen = ref(false)

function onFocus(): void {
  focused.value = true
  inputEl.value?.select()
  if (isCompact.value) popupOpen.value = true
}

function onBlur(): void {
  focused.value = false
  popupOpen.value = false
  validateInput()
}

function onInput(event: Event): void {
  editingText.value = (event.target as HTMLInputElement).value
  // 用户重新输入即清除上一轮的错误旗标
  errorKind.value = null
}

onBeforeUnmount(stopSpinRepeat)

// —— 根节点状态类 ——
const rootClass = computed(() => ({
  'is-disabled': props.disabled,
  'is-error': errorKind.value !== null,
  'is-inline': isInline.value,
}))
</script>

<template>
  <div v-bind="$attrs" class="wui-number-box" :class="rootClass">
    <!-- HeaderContentPresenter:TextBoxTopHeaderMargin = 0,0,0,4 -->
    <label v-if="header" class="wui-number-box-header" :for="inputId">{{ header }}</label>

    <div class="wui-number-box-main" @wheel="onWheel">
      <div class="wui-number-box-field-wrap">
        <div class="wui-number-box-field" :title="errorHint">
          <input
            :id="inputId"
            ref="inputEl"
            class="wui-number-box-input"
            type="text"
            :inputmode="inputMode"
            :value="editingText"
            :placeholder="placeholderText"
            :disabled="disabled"
            :aria-invalid="errorKind ? true : undefined"
            spellcheck="false"
            @input="onInput"
            @focus="onFocus"
            @blur="onBlur"
            @keydown="onKeyDown"
            @keyup="onKeyUp"
          />
          <!-- 错误旗标(小红旗):U+E7BA(Error),色取系统错误文本 token -->
          <span v-if="errorKind" class="wui-number-box-error" aria-hidden="true">&#xE7BA;</span>
          <!-- Compact 指示符(源 PopupIndicator,Margin 0,0,8,0;glyph 近似取 U+E70E,见 wiki) -->
          <span v-if="isCompact" class="wui-number-box-indicator" aria-hidden="true">&#xE70E;</span>
        </div>

        <!-- UpDownPopup(Compact):聚焦展开、失焦收起;位置为 WinUI Popup 偏移的近似,见 wiki -->
        <div v-if="isCompact && popupOpen" class="wui-number-box-popup">
          <button
            type="button"
            class="wui-number-box-popup-spin"
            tabindex="-1"
            aria-label="增加"
            :disabled="!upEnabled"
            @pointerdown="onSpinPointerDown($event, 1)"
            @pointerup="stopSpinRepeat"
            @pointercancel="stopSpinRepeat"
          >
            &#xE70E;
          </button>
          <button
            type="button"
            class="wui-number-box-popup-spin"
            tabindex="-1"
            aria-label="减少"
            :disabled="!downEnabled"
            @pointerdown="onSpinPointerDown($event, -1)"
            @pointerup="stopSpinRepeat"
            @pointercancel="stopSpinRepeat"
          >
            &#xE70D;
          </button>
        </div>
      </div>

      <!-- Inline 步进按钮:MinWidth 32、FontSize 12、Border 0,1,1,1;Up Margin 4、Down Margin 0,4,4,4 -->
      <button
        v-if="isInline"
        type="button"
        class="wui-number-box-spin wui-number-box-spin--up"
        tabindex="-1"
        aria-label="增加"
        :disabled="!upEnabled"
        @pointerdown="onSpinPointerDown($event, 1)"
        @pointerup="stopSpinRepeat"
        @pointercancel="stopSpinRepeat"
      >
        &#xE70E;
      </button>
      <button
        v-if="isInline"
        type="button"
        class="wui-number-box-spin wui-number-box-spin--down"
        tabindex="-1"
        aria-label="减少"
        :disabled="!downEnabled"
        @pointerdown="onSpinPointerDown($event, -1)"
        @pointerup="stopSpinRepeat"
        @pointercancel="stopSpinRepeat"
      >
        &#xE70D;
      </button>
    </div>

    <!-- DescriptionPresenter:SystemControlDescriptionTextForegroundBrush -->
    <div v-if="description" class="wui-number-box-description">{{ description }}</div>
  </div>
</template>

<style scoped>
.wui-number-box {
  display: flex;
  flex-direction: column;
  min-width: 64px; /* TextControlThemeMinWidth */
}

/* —— Header(WinUI Header):字号同 ControlContentThemeFontSize —— */
.wui-number-box-header {
  margin: 0 0 4px; /* TextBoxTopHeaderMargin = 0,0,0,4 */
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-text-control-header-foreground);
}

/* —— 主行:输入区 + Inline 步进按钮(源 Grid:Column=*, Auto, Auto) —— */
.wui-number-box-main {
  display: flex;
  align-items: stretch;
}

.wui-number-box-field-wrap {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
}

/* SpinButtonsVisible 状态:InputBox.MinWidth = NumberBoxMinWidth(120) */
.wui-number-box.is-inline .wui-number-box-field-wrap {
  min-width: 120px;
}

/* —— 输入区:TextControl* 画刷族;Border 1、MinHeight 32、CornerRadius = ControlCornerRadius(4px,
      theme.css 无该 token,按源默认值写死,差异见 wiki) ——
   XAML 的 MinHeight 计入边框(外缘 32、内容区 30),CSS 对应 border-box:总高 32 含 1px 边框
   (content-box 会撑成 34px 并连带 Inline 步进按钮,VR-B7 F-B7-5;修法同 FIX6 ComboBox)。
   PL7:厚度取 WinUI 3 权威(Common_themeresources.xaml L10/L24 = 1;legacy dxaml
   generic.xaml L173 的 2 已替换);Focused = L11/L25 = 1,1,1,2(施加点 NumberBox.xaml L310)。
   PL6:状态色重定向到 Fluent 画刷族(NumberBox 内嵌输入区与 TextBox 共用 TextControl* 键)。 */
.wui-number-box-field {
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 32px; /* TextControlThemeMinHeight(含边框) */
  background: var(--wui-control-fill-color-default);
  border: 1px solid var(--wui-control-fill-color-transparent);
  border-radius: 4px;
  /* 描边环(::before)的定位基准;position 不产生偏移,几何不变 */
  position: relative;
  /* Normal / PointerOver 边框 = TextControlElevationBorderBrush(渐变) */
  --nb-elevation-border: var(--wui-text-control-elevation-border);
}

/* PL6 立体描边环(TextControlElevationBorderBrush):内嵌 mask 环,原理同 TextBox.vue;
   PL7 环厚随宿主 border 改为 1px(inset / padding 同步改 1px)。 */
.wui-number-box-field::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: var(--nb-elevation-border, none);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 1;
}

/* —— PointerOver:沿用 TextBox 已过 QA 的写法 —— hover 不与聚焦态叠加(源 VSM 优先级)、
      Disabled 经 :not(.is-disabled) 恒排除 —— */
.wui-number-box:not(.is-disabled) .wui-number-box-field:not(:focus-within):hover {
  background: var(--wui-control-fill-color-secondary);
  --nb-elevation-border: var(--wui-text-control-elevation-border);
}

.wui-number-box:not(.is-disabled) .wui-number-box-field:not(:focus-within):hover .wui-number-box-input {
  color: var(--wui-text-fill-color-primary);
}

.wui-number-box:not(.is-disabled) .wui-number-box-field:not(:focus-within):hover .wui-number-box-input::placeholder {
  color: var(--wui-text-fill-color-secondary);
}

/* —— Focused:Background = ControlFillColorInputActiveBrush,
      BorderBrush = TextControlBorderBrushFocused(视觉等价 accent 实色 → 环 none);
      PL7 厚度 = TextControlBorderThemeThicknessFocused = 1,1,1,2(下边 2px 强调色)。 —— */
.wui-number-box-field:focus-within {
  background: var(--wui-control-fill-color-input-active);
  border-color: var(--wui-system-accent-color);
  border-width: 1px 1px 2px 1px; /* TextControlBorderThemeThicknessFocused = 1,1,1,2 */
  --nb-elevation-border: none;
}

.wui-number-box-field:focus-within .wui-number-box-input {
  color: var(--wui-text-fill-color-primary);
}

.wui-number-box-field:focus-within .wui-number-box-input::placeholder {
  color: var(--wui-text-fill-color-secondary);
}

/* —— 错误旗标态(任务「小红旗」;置于 Focused 规则之后,聚焦时仍保持错误描边。
      错误描边为纯色系统错误色 → 描边环置 none,不与渐变争用) —— */
.wui-number-box.is-error .wui-number-box-field {
  border-color: var(--wui-system-control-error-text-foreground);
  --nb-elevation-border: none;
}

/* —— 内容元素:TextControlThemePadding ——
   现值 10,3,6,6 = legacy dxaml generic.xaml L175;WinUI 3 权威(Common_themeresources
   L12/L26)为 10,5,6,6。PL7 只改边框厚度,未改本值(差异见 PL7 报告未决项 1)。 —— */
.wui-number-box-input {
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

.wui-number-box-input::placeholder {
  color: var(--wui-text-fill-color-secondary);
  opacity: 1;
}

/* 选区高亮 = TextControlSelectionHighlightColor */
.wui-number-box-input::selection {
  background: var(--wui-text-control-selection-highlight-color, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)));
}

/* —— 错误旗标 glyph:12px(源指示符同级小字号),色 = 系统错误文本 token —— */
.wui-number-box-error {
  flex: none;
  align-self: center;
  margin-right: 6px;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-error-text-foreground);
}

/* —— Compact 指示符(源 PopupIndicator):Margin 0,0,8,0、FontSize 12;
      PL6:色重定向 NumberBoxPopupIndicatorForeground = TextFillColorSecondaryBrush。 —— */
.wui-number-box-indicator {
  flex: none;
  align-self: center;
  margin-right: 8px; /* NumberBoxPopupIndicatorMargin */
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-text-fill-color-secondary);
}

/* —— Inline 步进按钮(源 NumberBoxSpinButtonStyle:画刷经 NumberBox.xaml L65-98 映射到
      TextControlButton* 族;PL6 重定向到 Fluent):MinWidth 32、Padding 0、FontSize 12、
      Border 0,1,1,1 —— */
.wui-number-box-spin {
  flex: none;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 12px; /* NumberBoxSpinButtonStyle FontSize = 12 */
  color: var(--wui-text-fill-color-secondary);
  background: var(--wui-control-fill-color-transparent);
  border: solid var(--wui-control-fill-color-transparent);
  border-width: 0 1px 1px 0; /* NumberBoxSpinButtonBorderThickness = 0,1,1,1 */
  border-radius: 4px; /* CornerRadius = ControlCornerRadius(见 wiki) */
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
}

.wui-number-box-spin--up {
  margin: 4px; /* UpSpinButton Margin = 4 */
}

.wui-number-box-spin--down {
  margin: 4px 4px 4px 0; /* DownSpinButton Margin = 0,4,4,4 */
}

.wui-number-box-spin:hover {
  color: var(--wui-text-fill-color-secondary);
  background: var(--wui-subtle-fill-color-secondary);
  border-color: var(--wui-control-fill-color-transparent);
}

.wui-number-box-spin:active {
  color: var(--wui-text-fill-color-tertiary);
  background: var(--wui-subtle-fill-color-tertiary);
  border-color: var(--wui-control-fill-color-transparent);
}

/* 禁用(源 UpSpinButtonDisabled/DownSpinButtonDisabled 状态):前景禁用色 = TextFillColorDisabled。 */
.wui-number-box-spin:disabled,
.wui-number-box-popup-spin:disabled {
  color: var(--wui-text-fill-color-disabled);
  background: var(--wui-control-fill-color-transparent);
  border-color: var(--wui-control-fill-color-transparent);
  cursor: default;
}

/* —— Compact 弹层(源 UpDownPopup / PopupContentRoot):Padding 6、Border 1、
      CornerRadius = OverlayCornerRadius(取弹层基建 token 8px);
      PL6:BorderBrush 重定向 NumberBoxPopupBorderBrush = SurfaceStrokeColorFlyoutBrush;
      背景 NumberBoxPopupBackground = AcrylicBackgroundFillColorDefaultBrush(材质,
      web 无原生亚克力,沿用 flyout 底色近似,未决项见报告)。 —— */
.wui-number-box-popup {
  position: absolute;
  right: 0;
  bottom: calc(100% + 4px);
  display: flex;
  flex-direction: column;
  gap: 4px; /* PopupUpSpinButton Margin 0,0,0,4 */
  padding: 6px; /* PopupContentRoot Padding = 6 */
  background: var(--wui-flyout-presenter-background);
  border: 1px solid var(--wui-surface-stroke-color-flyout);
  border-radius: var(--wui-popup-corner-radius, 8px);
  box-shadow: var(--wui-popup-shadow);
  z-index: var(--wui-z-popup-base, 10000);
}

/* —— 弹层步进按钮(源 NumberBoxPopupSpinButtonStyle):36×36、无边框透明底、FontSize 16 —— */
.wui-number-box-popup-spin {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 16px; /* NumberBoxPopupSpinButtonStyle FontSize = 16 */
  color: var(--wui-text-fill-color-secondary);
  background: var(--wui-subtle-fill-color-transparent); /* NumberBoxPopupSpinButtonBackground = SubtleFillColorTransparentBrush */
  border: none;
  border-radius: 4px; /* CornerRadius = ControlCornerRadius,见 wiki */
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
}

.wui-number-box-popup-spin:hover {
  color: var(--wui-text-fill-color-secondary);
  background: var(--wui-subtle-fill-color-secondary);
}

.wui-number-box-popup-spin:active {
  color: var(--wui-text-fill-color-tertiary);
  background: var(--wui-subtle-fill-color-tertiary);
}

/* —— Description(SystemControlDescriptionTextForegroundBrush) —— */
.wui-number-box-description {
  margin-top: 4px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-system-control-description-text-foreground);
}

/* —— Disabled 状态:ControlFillColorDisabled / ControlStrokeColorDefault(纯色 → 环 none)/
      TemporaryTextFillColorDisabled / TextFillColorDisabled(占位符)。 —— */
.wui-number-box.is-disabled .wui-number-box-header {
  color: var(--wui-text-control-header-foreground-disabled);
}

.wui-number-box.is-disabled .wui-number-box-field {
  background: var(--wui-control-fill-color-disabled);
  border-color: var(--wui-control-stroke-color-default);
  --nb-elevation-border: none;
}

.wui-number-box.is-disabled .wui-number-box-input {
  color: var(--wui-temporary-text-fill-color-disabled);
  cursor: default;
}

.wui-number-box.is-disabled .wui-number-box-input::placeholder {
  color: var(--wui-text-fill-color-disabled);
}
</style>
