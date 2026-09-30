<script lang="ts">
// Slider(WinUI Slider 迁移):类型与事件参数对外导出,供使用方与示例页引用。
/** 吸附方式(WinUI SliderSnapsTo;'None' 为 Web 扩展,仅钳制到 [minimum, maximum])。 */
export type SliderSnapsTo = 'StepValues' | 'Ticks' | 'None'

/** 刻度位置(WinUI TickPlacement)。 */
export type SliderTickPlacement = 'None' | 'TopLeft' | 'BottomRight' | 'Outside' | 'Inline'

/** valueChanged 事件参数(对应 WinUI RangeBaseValueChangedEventArgs 的常用字段)。 */
export interface SliderValueChangedEventArgs {
  oldValue: number
  newValue: number
}
</script>

<script setup lang="ts">
// WinUI Slider 复刻。视觉对照 generic.xaml TargetType="Slider" 的 ControlTemplate:
// 轨道 4px(轨道填充 SliderTrackFill / 已选段 SliderTrackValueFill)、拇指 8x24 圆角 4
// (SliderThumbBackground 系列)、容器高 32(SliderHorizontalHeight)、刻度条高 4 间距 4
// (SliderOutsideTickBarThemeHeight)。颜色一律走 --wui-slider-* token(浅/深主题各自定义)。
// 交互:原生 input[type=range] 承载指针/焦点,自绘轨道/填充/刻度/拇指(pointer-events:none,
// 透过 input 的 :hover/:active/:focus-visible/:disabled 伪类驱动 PointerOver/Pressed/Focus/Disabled
// 视觉状态);方向键按 stepFrequency(或 snapsTo=Ticks 时的 tickFrequency)步进,拖动中实时
// 更新 value 并触发 valueChanged(与 WinUI 一致)。
import { computed, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiSlider' })

const props = withDefaults(
  defineProps<{
    /** 最小值(WinUI Minimum)。 */
    minimum?: number
    /** 最大值(WinUI Maximum)。 */
    maximum?: number
    /** 步长(WinUI StepFrequency);<= 0 时按 1 处理。 */
    stepFrequency?: number
    /** 吸附方式(WinUI SnapsTo);'None' 为 Web 扩展:仅钳制不吸附。 */
    snapsTo?: SliderSnapsTo
    /** 刻度位置(WinUI TickPlacement)。 */
    tickPlacement?: SliderTickPlacement
    /** 刻度间距(WinUI TickFrequency);<= 0 时不绘制刻度。 */
    tickFrequency?: number
    /** 标题文本(WinUI Header)。 */
    header?: string
    /** 禁用(Web 映射 WinUI Control.IsEnabled)。 */
    disabled?: boolean
  }>(),
  {
    minimum: 0,
    maximum: 100,
    stepFrequency: 1,
    snapsTo: 'StepValues',
    tickPlacement: 'None',
    tickFrequency: 0,
    header: '',
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 值变化(拖动/键盘/取值范围变更导致 value 改变时触发,与 WinUI ValueChanged 语义一致)。 */
  valueChanged: [event: SliderValueChangedEventArgs]
}>()

/** 当前值(WinUI Value,双向,v-model:value)。 */
const value = defineModel<number>('value', { default: 0 })

const inputEl = ref<HTMLInputElement | null>(null)

// —— 有效取值范围(对称源实现:maximum < minimum 时收敛为相同值) ——
const effMin = computed(() => props.minimum)
const effMax = computed(() => Math.max(props.maximum, props.minimum))
const span = computed(() => Math.max(effMax.value - effMin.value, Number.EPSILON))

/** 当前生效步长:吸附到刻度时用 tickFrequency,否则用 stepFrequency。 */
const effectiveStep = computed(() => {
  if (props.snapsTo === 'Ticks' && props.tickFrequency > 0) return props.tickFrequency
  return props.stepFrequency > 0 ? props.stepFrequency : 1
})

/** 原生 input 的 step 属性;不吸附时用 'any' 允许连续拖动。 */
const inputStep = computed(() => (props.snapsTo === 'None' ? 'any' : effectiveStep.value))

/** 数的小数位数(用于修正 min + k*step 的浮点误差;指数记法按 0 处理,极端小步长可忽略)。 */
function decimalsOf(num: number): number {
  const text = String(num)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : Math.min(text.length - dot - 1, 10)
}

/** 把任意值钳制并按当前吸附方式取整到 [effMin, effMax]。 */
function snap(raw: number): number {
  const clamped = Math.min(Math.max(raw, effMin.value), effMax.value)
  if (props.snapsTo === 'None') return clamped
  const step = effectiveStep.value
  // 按 step 落点取整,并按 minimum/step 的小数位数修正浮点误差(如 0.1 步长下 0.7000...001 → 0.7)
  const snapped = effMin.value + Math.round((clamped - effMin.value) / step) * step
  const precision = Math.min(decimalsOf(effMin.value) + decimalsOf(step), 12)
  const fixed = Number(snapped.toFixed(precision))
  return Math.min(Math.max(fixed, effMin.value), effMax.value)
}

function current(): number {
  return Number.isFinite(value.value) ? value.value : effMin.value
}

/** 统一提交入口:变更 model 并触发 valueChanged(值未变时不触发,与 WinUI 一致)。 */
function commit(next: number): void {
  const snapped = snap(next)
  const old = current()
  if (Object.is(snapped, old)) return
  value.value = snapped
  emit('valueChanged', { oldValue: old, newValue: snapped })
}

function onInput(event: Event): void {
  if (props.disabled) return
  const raw = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(raw)) return
  commit(raw)
}

/**
 * 方向键步进:Left/Down 减、Right/Up 增,步长为当前生效步长(WinUI 中方向键按
 * SmallChange 步进;本实现简化为与 StepFrequency/tickFrequency 一致,差异见 wiki)。
 */
function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  let direction = 0
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') direction = -1
  else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') direction = 1
  else return
  event.preventDefault()
  commit(current() + direction * effectiveStep.value)
}

// 取值范围/吸附方式变化时,把当前值重新钳制吸附(WinUI 中由此引发的 Value 变更同样触发 ValueChanged)。
watch([effMin, effMax, effectiveStep, () => props.snapsTo], () => {
  commit(current())
})

// 吸附后 DOM 值可能与拖动原始值不同,把 input 同步回吸附值,保证键盘步进的基准一致。
watch([value, inputStep, effMin, effMax], () => {
  const el = inputEl.value
  if (!el) return
  const next = String(value.value)
  if (el.value !== next) el.value = next
}, { flush: 'post' })

// —— 视觉几何:0..1 进度 ——
const ratio = computed(() => {
  const clamped = Math.min(Math.max(current(), effMin.value), effMax.value)
  return (clamped - effMin.value) / span.value
})

// 填充段止于拇指中心:拇指宽 8px,故为 (100% - 8px) * ratio + 4px。
const fillStyle = computed<CSSProperties>(() => ({
  width: `calc((100% - 8px) * ${ratio.value} + 4px)`,
}))

const thumbStyle = computed<CSSProperties>(() => ({
  left: `calc((100% - 8px) * ${ratio.value})`,
}))

// —— 刻度 ——
const showTopTicks = computed(() => props.tickPlacement === 'TopLeft' || props.tickPlacement === 'Outside')
const showBottomTicks = computed(() => props.tickPlacement === 'BottomRight' || props.tickPlacement === 'Outside')
const showInlineTicks = computed(() => props.tickPlacement === 'Inline')

/** 刻度数防御上限:tickFrequency 极端小时钳制刻度数,防止循环次数/内存爆炸(仅影响绘制,不影响吸附步长)。 */
const MAX_TICK_COUNT = 1000

const tickRatios = computed<number[]>(() => {
  const frequency = props.tickFrequency
  if (props.tickPlacement === 'None' || !(frequency > 0)) return []
  const min = effMin.value
  const max = effMax.value
  const eps = span.value * 1e-9
  const ticks: number[] = []
  if (Math.floor(span.value / frequency) + 1 > MAX_TICK_COUNT) {
    // 钳制分支:按上限在 [min, max] 均分刻度,末点对齐 max 消除浮点累积
    const clampedStep = span.value / (MAX_TICK_COUNT - 1)
    for (let i = 0; i < MAX_TICK_COUNT; i += 1) {
      ticks.push(min + i * clampedStep)
    }
    ticks[ticks.length - 1] = max
  } else {
    for (let v = min; v <= max + eps; v += frequency) {
      ticks.push(v)
    }
    const last = ticks[ticks.length - 1] ?? min
    if (max - last > eps) ticks.push(max)
  }
  return ticks.map((v) => (v - min) / span.value)
})

/** 刻度线水平定位:线宽 1px,首尾刻度与轨道两端对齐。 */
function tickLeft(r: number): string {
  return `calc((100% - 1px) * ${r})`
}
</script>

<template>
  <div v-bind="$attrs" class="wui-slider" :class="{ 'wui-slider--disabled': disabled }">
    <div v-if="header" class="wui-slider__header" aria-hidden="true">{{ header }}</div>
    <div class="wui-slider__container">
      <!-- 交互层:铺满容器,透明;键盘步进(方向键已接管,Home/End/PageUp/PageDown 走原生) -->
      <input
        ref="inputEl"
        class="wui-slider__input"
        type="range"
        :min="effMin"
        :max="effMax"
        :step="inputStep"
        :value="value"
        :disabled="disabled"
        :aria-label="header || undefined"
        @input="onInput"
        @keydown="onKeydown"
      />
      <!-- 视觉层:pointer-events:none,状态色由 input 伪类经 ~ 选择器驱动 -->
      <div
        v-if="showTopTicks"
        class="wui-slider__ticks wui-slider__ticks--top"
        aria-hidden="true"
      >
        <span
          v-for="(r, i) in tickRatios"
          :key="`top-${i}`"
          class="wui-slider__tick"
          :style="{ left: tickLeft(r) }"
        ></span>
      </div>
      <div
        v-if="showBottomTicks"
        class="wui-slider__ticks wui-slider__ticks--bottom"
        aria-hidden="true"
      >
        <span
          v-for="(r, i) in tickRatios"
          :key="`bottom-${i}`"
          class="wui-slider__tick"
          :style="{ left: tickLeft(r) }"
        ></span>
      </div>
      <div v-if="showInlineTicks" class="wui-slider__ticks wui-slider__ticks--inline" aria-hidden="true">
        <span
          v-for="(r, i) in tickRatios"
          :key="`inline-${i}`"
          class="wui-slider__tick wui-slider__tick--inline"
          :style="{ left: tickLeft(r) }"
        ></span>
      </div>
      <div class="wui-slider__track" aria-hidden="true"></div>
      <div class="wui-slider__fill" aria-hidden="true" :style="fillStyle"></div>
      <div class="wui-slider__thumb" aria-hidden="true" :style="thumbStyle"></div>
    </div>
  </div>
</template>

<style scoped>
.wui-slider {
  display: block;
  width: 100%;
}

/* 标题:SliderHeaderForeground + SliderTopHeaderMargin(0,0,0,4)+ ControlContentThemeFontSize */
.wui-slider__header {
  margin: 0 0 4px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-slider-header-foreground);
}

/* 容器:SliderHorizontalHeight = 32;背景 SliderContainerBackground(透明) */
.wui-slider__container {
  position: relative;
  min-height: 32px;
  background: var(--wui-slider-container-background);
}

/* —— 交互层(原生 range,视觉全透明) —— */
.wui-slider__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
  opacity: 0;
  -webkit-appearance: none;
  appearance: none;
}

.wui-slider__input:focus {
  outline: none;
}

/* —— 轨道:SliderTrackThemeHeight(此处取 4 系 Windows 11 观感选择,源快照三个主题字典均为 2,见 wiki 差异);
      视觉层不接收指针,交互全部交给其下的原生 input —— */
.wui-slider__track {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--wui-slider-track-fill);
  transform: translateY(-50%);
  pointer-events: none;
  transition: background-color var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease);
}

/* —— 已选段(DecreaseRect):SliderTrackValueFill —— */
.wui-slider__fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 4px;
  background: var(--wui-slider-track-value-fill);
  transform: translateY(-50%);
  pointer-events: none;
  transition: background-color var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease);
}

/* —— 拇指:8x24、CornerRadius 4、SliderThumbBackground —— */
.wui-slider__thumb {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 24px;
  border-radius: 4px;
  background: var(--wui-slider-thumb-background);
  transform: translateY(-50%) scale(1);
  pointer-events: none;
  transition:
    background-color var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease),
    transform var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease);
}

/* 刻度条:高 4(SliderOutsideTickBarThemeHeight)、与轨道边缘间距 4(TopTickBar Margin 0,0,0,4);
   轨道半高 2 + 间距 4 = 中线 ±6 */
.wui-slider__ticks {
  position: absolute;
  left: 0;
  width: 100%;
  pointer-events: none;
}

.wui-slider__ticks--top {
  bottom: calc(50% + 6px);
  height: 4px;
}

.wui-slider__ticks--bottom {
  top: calc(50% + 6px);
  height: 4px;
}

/* 内联刻度:覆盖轨道本体(HorizontalInlineTickBar 高 = 轨道高) */
.wui-slider__ticks--inline {
  top: calc(50% - 2px);
  height: 4px;
}

.wui-slider__tick {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background: var(--wui-slider-tick-bar-fill);
}

.wui-slider__tick--inline {
  background: var(--wui-slider-inline-tick-bar-fill);
}

/* ======================================================================
 * 视觉状态(对照 CommonStates / 焦点):
 * PointerOver —— 轨道/已选段/拇指切换 PointerOver 色,拇指放大;
 * Pressed(:active,拖动期间保持)—— Pressed 色,拇指放大保持;
 * Focus(:focus-visible)—— 拇指外围 accent 轮廓(WinUI 为控件外围系统焦点框,见 wiki);
 * Disabled —— 全套 Disabled 色 + 光标。
 * ====================================================================== */

/* —— PointerOver —— */
.wui-slider__input:not(:disabled):hover ~ .wui-slider__track {
  background: var(--wui-slider-track-fill-pointer-over);
}

.wui-slider__input:not(:disabled):hover ~ .wui-slider__fill {
  background: var(--wui-slider-track-value-fill-pointer-over);
}

.wui-slider__input:not(:disabled):hover ~ .wui-slider__thumb {
  background: var(--wui-slider-thumb-background-pointer-over);
  transform: translateY(-50%) scale(1.4);
}

/* —— Pressed(拖动中持续) —— */
.wui-slider__input:not(:disabled):active ~ .wui-slider__track {
  background: var(--wui-slider-track-fill-pressed);
}

.wui-slider__input:not(:disabled):active ~ .wui-slider__fill {
  background: var(--wui-slider-track-value-fill-pressed);
}

.wui-slider__input:not(:disabled):active ~ .wui-slider__thumb {
  background: var(--wui-slider-thumb-background-pressed);
  transform: translateY(-50%) scale(1.4);
}

/* —— Focus(键盘焦点可见性) —— */
.wui-slider__input:focus-visible ~ .wui-slider__thumb {
  outline: 2px solid var(--wui-system-accent-color);
  outline-offset: 2px;
}

/* —— Disabled —— */
.wui-slider--disabled .wui-slider__header {
  color: var(--wui-slider-header-foreground-disabled);
}

.wui-slider__input:disabled {
  cursor: default;
}

.wui-slider__input:disabled ~ .wui-slider__track {
  background: var(--wui-slider-track-fill-disabled);
}

.wui-slider__input:disabled ~ .wui-slider__fill {
  background: var(--wui-slider-track-value-fill-disabled);
}

.wui-slider__input:disabled ~ .wui-slider__thumb {
  background: var(--wui-slider-thumb-background-disabled);
}
</style>
