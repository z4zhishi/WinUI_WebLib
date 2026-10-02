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
// WinUI Slider 复刻。视觉对照现行 WinUI 3 样式 controls/dev/CommonStyles/Slider_themeresources.xaml
// (Slider 为 dxaml 核心控件,controls/dev 无独立目录;该文件即现行源,generic.xaml
// TargetType="Slider" L10879+ 为 legacy 对照,定案依据见 FIX9 报告):
// 轨道 4px(SliderTrackThemeHeight,Default L6 / Light L110)、圆角 2(SliderTrackCornerRadius L162)、
// 拇指 18×18 圆旋钮(SliderHorizontalThumbWidth/Height L169-170,CornerRadius 10):外圈
// ControlSolidFillColorDefault 底 + 1px ControlElevationBorderBrush 描边 + 12×12 内圆
// (SliderInnerThumb L198-199;内圆缩放 Normal 0.86 / PointerOver 1.167 / Pressed 0.71,
// 呈现 12/14/10,L208-253)、容器高 32(SliderHorizontalHeight)、刻度条高 4 间距 4
// (SliderOutsideTickBarThemeHeight)。颜色一律走 --wui-slider-* token(现行 Fluent 色阶,
// theme.css 生成值为 legacy,故组件局部携带,见样式段注)。
// 交互:原生 input[type=range] 承载指针/焦点,自绘轨道/填充/刻度/拇指(pointer-events:none,
// 透过 input 的 :hover/:active/:focus-visible/:disabled 伪类驱动 PointerOver/Pressed/Focus/Disabled
// 视觉状态);方向键按 stepFrequency(或 snapsTo=Ticks 时的 tickFrequency)步进,拖动中实时
// 更新 value 并触发 valueChanged(与 WinUI 一致)。
import { computed, ref, useAttrs, watch } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiSlider' })

// —— 无障碍名:a11y QA(label 规则)。header 已注入 aria-label;此处补调用方 attrs 的
// aria-label / aria-labelledby(attrs 落点从根 div 迁移到 input),优先级 header > 调用方。
const attrs = useAttrs()

const callerAriaLabel = computed(() =>
  typeof attrs['aria-label'] === 'string' ? attrs['aria-label'] : undefined,
)
const callerLabelledBy = computed(() =>
  typeof attrs['aria-labelledby'] === 'string' ? attrs['aria-labelledby'] : undefined,
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

// 填充段止于拇指中心:拇指 18px(SliderHorizontalThumbWidth),故为 (100% - 18px) * ratio + 9px。
const fillStyle = computed<CSSProperties>(() => ({
  width: `calc((100% - 18px) * ${ratio.value} + 9px)`,
}))

const thumbStyle = computed<CSSProperties>(() => ({
  left: `calc((100% - 18px) * ${ratio.value})`,
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
  <div v-bind="rootAttrs" class="wui-slider" :class="{ 'wui-slider--disabled': disabled }">
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
        :aria-label="header || callerAriaLabel || undefined"
        :aria-labelledby="callerLabelledBy"
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
      <div class="wui-slider__thumb" aria-hidden="true" :style="thumbStyle">
        <span class="wui-slider__thumb-inner" aria-hidden="true"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wui-slider {
  display: block;
  width: 100%;

  /* ==================================================================
   * FIX9 色阶定案(现行 WinUI 3 Fluent,theme.css 生成的 --wui-slider-* 为
   * legacy SystemControl 值,按 RatingControl V7 先例在此局部携带现行值):
   * 源:controls/dev/CommonStyles/Slider_themeresources.xaml(资源映射)+
   * CommonStyles/Common_themeresources_any.xaml(色值;light 字典 L209-243 / dark 字典 L5-39)。
   * 字节序:XAML #AARRGGBB → CSS #RRGGBBAA(alpha 移末位)。
   * AccentFillColorSecondary/Tertiary = SystemAccentColor Dark1(light, L330-331)/
   * Light2(dark, L126-127)@ Opacity 0.9 / 0.8 → color-mix 等价。
   * ================================================================== */
  --wui-slider-track-fill: #00000072; /* SliderTrackFill = ControlStrongFillColorDefaultBrush(light #72000000,L226) */
  --wui-slider-track-fill-pointer-over: #00000072; /* PointerOver 同值(L24-25 映射) */
  --wui-slider-track-fill-pressed: #00000072; /* Pressed 同值 */
  --wui-slider-track-fill-disabled: #00000051; /* ControlStrongFillColorDisabled(light #51000000,L227) */
  --wui-slider-track-value-fill: var(--wui-system-accent-color); /* AccentFillColorDefaultBrush */
  --wui-slider-track-value-fill-pointer-over: color-mix(in srgb, var(--wui-system-accent-color-dark-1) 90%, transparent); /* AccentFillColorSecondary(Dark1 @0.9) */
  --wui-slider-track-value-fill-pressed: color-mix(in srgb, var(--wui-system-accent-color-dark-1) 80%, transparent); /* AccentFillColorTertiary(Dark1 @0.8) */
  --wui-slider-track-value-fill-disabled: #00000037; /* AccentFillColorDisabled(light #37000000,L242) */
  --wui-slider-thumb-background: var(--wui-system-accent-color); /* SliderThumbBackground = AccentFillColorDefaultBrush */
  --wui-slider-thumb-background-pointer-over: color-mix(in srgb, var(--wui-system-accent-color-dark-1) 90%, transparent); /* AccentFillColorSecondaryBrush */
  --wui-slider-thumb-background-pressed: color-mix(in srgb, var(--wui-system-accent-color-dark-1) 80%, transparent); /* AccentFillColorTertiaryBrush */
  --wui-slider-thumb-background-disabled: #00000037; /* AccentFillColorDisabledBrush */
  --wui-slider-header-foreground: #000000e4; /* SliderHeaderForeground = TextFillColorPrimaryBrush(light #E4000000,L209) */
  --wui-slider-header-foreground-disabled: #0000005c; /* TextFillColorDisabled(light #5C000000,L212) */
  --wui-slider-tick-bar-fill: #00000072; /* SliderTickBarFill = ControlStrongFillColorDefaultBrush */
  --wui-slider-tick-bar-fill-disabled: #00000051; /* SliderTickBarFillDisabled = ControlStrongFillColorDisabledBrush */
  --wui-slider-inline-tick-bar-fill: #ffffff; /* SliderInlineTickBarFill = ControlFillColorInputActiveBrush(light #FFFFFF,L225) */
  --wui-slider-outer-thumb-background: #ffffff; /* SliderOuterThumbBackground = ControlSolidFillColorDefaultBrush(light #FFFFFF,L228) */
  --wui-slider-thumb-border-brush: #0000000f; /* SliderThumbBorderBrush = ControlElevationBorderBrush(基色 ControlStrokeColorDefault #0F000000,L243) */
}

html[data-theme='dark'] .wui-slider {
  --wui-slider-track-fill: #ffffff8b; /* ControlStrongFillColorDefault(dark #8BFFFFFF,L22) */
  --wui-slider-track-fill-pointer-over: #ffffff8b;
  --wui-slider-track-fill-pressed: #ffffff8b;
  --wui-slider-track-fill-disabled: #ffffff3f; /* ControlStrongFillColorDisabled(dark #3FFFFFFF,L23) */
  --wui-slider-track-value-fill-pointer-over: color-mix(in srgb, var(--wui-system-accent-color-light-2) 90%, transparent); /* AccentFillColorSecondary(dark = Light2 @0.9,L126) */
  --wui-slider-track-value-fill-pressed: color-mix(in srgb, var(--wui-system-accent-color-light-2) 80%, transparent); /* AccentFillColorTertiary(Light2 @0.8,L127) */
  --wui-slider-track-value-fill-disabled: #ffffff28; /* AccentFillColorDisabled(dark #28FFFFFF,L38) */
  --wui-slider-thumb-background-pointer-over: color-mix(in srgb, var(--wui-system-accent-color-light-2) 90%, transparent);
  --wui-slider-thumb-background-pressed: color-mix(in srgb, var(--wui-system-accent-color-light-2) 80%, transparent);
  --wui-slider-thumb-background-disabled: #ffffff28;
  --wui-slider-header-foreground: #ffffff; /* TextFillColorPrimary dark #FFFFFF(L5) */
  --wui-slider-header-foreground-disabled: #ffffff5d; /* TextFillColorDisabled(dark #5DFFFFFF,L8) */
  --wui-slider-tick-bar-fill: #ffffff8b;
  --wui-slider-tick-bar-fill-disabled: #ffffff3f;
  --wui-slider-inline-tick-bar-fill: #1e1e1eb3; /* ControlFillColorInputActive(dark #B31E1E1E,L21)→ #1E1E1E + alpha B3 */
  --wui-slider-outer-thumb-background: #454545; /* ControlSolidFillColorDefault(dark #454545,L24) */
  --wui-slider-thumb-border-brush: #ffffff12; /* ControlStrokeColorDefault(dark #12FFFFFF,L39) */
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

/* —— 轨道:SliderTrackThemeHeight = 4(FIX9 定案:现行 controls/dev 值;legacy generic.xaml
      三字典为 2,见样式段首注);圆角 SliderTrackCornerRadius = 2;
      视觉层不接收指针,交互全部交给其下的原生 input —— */
.wui-slider__track {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--wui-slider-track-fill);
  transform: translateY(-50%);
  pointer-events: none;
  /* 状态换色即时(源 PointerOver/Pressed 均为 DiscreteObjectKeyFrame KeyTime=0,
     Slider_themeresources.xaml L279-297;VR-B22 §2.4 判定 Web 不得另加颜色过渡) */
}

/* —— 已选段(DecreaseRect):SliderTrackValueFill —— */
.wui-slider__fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 4px;
  border-radius: 2px;
  background: var(--wui-slider-track-value-fill);
  transform: translateY(-50%);
  pointer-events: none;
  /* 同轨道:换色即时,无过渡(DiscreteObjectKeyFrame) */
}

/* —— 拇指:现行 18×18 圆旋钮(FIX9,定案见样式段首注):外圈
      SliderOuterThumbBackground(ControlSolidFillColorDefault)底 + 1px
      SliderThumbBorderBrush(ControlElevationBorderBrush)描边 +
      CornerRadius = SliderThumbCornerRadius 10(18px 盒即整圆) —— */
.wui-slider__thumb {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 1px solid var(--wui-slider-thumb-border-brush);
  border-radius: 50%;
  background: var(--wui-slider-outer-thumb-background);
  transform: translateY(-50%);
  pointer-events: none;
}

/* 内圆 Ellipse SliderInnerThumb 12×12(L199);状态缩放(CompositeTransform 等价):
   Normal 1(12px)/ PointerOver 1.1667(→14)/ Pressed 0.8333(→10)/ Disabled 1.1667 */
.wui-slider__thumb-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--wui-slider-thumb-background);
  transform: translate(-50%, -50%) scale(1);
  pointer-events: none;
  /* 回到 Normal/进入 Disabled 的过渡:源 Normal/Disabled storyboard
     KeyTime=ControlFastAnimationDuration(167ms)+ ControlFastOutSlowInKeySpline
     (cubic-bezier(0,0,0,1),Slider_themeresources.xaml L208-217/L244-253);
     颜色为 DiscreteObjectKeyFrame 即时,不加 background-color 过渡。
     进入 PointerOver/Pressed 的 250ms 由下方状态规则按目标态覆写。 */
  transition: transform var(--wui-duration-fast, 167ms) cubic-bezier(0, 0, 0, 1);
}

/* 刻度条:高 4(SliderOutsideTickBarThemeHeight)、与轨道边缘间距 4(TopTickBar
   VerticalAlignment=Bottom + Margin 0,0,0,4 → 容器 y 6..10,与轨道半高 2 + 间距 4 一致);
   刻度线色 = SliderTickBarFill(ControlStrongFillColorDefault) */
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
 * 视觉状态(对照现行模板 CommonStates,Slider_themeresources.xaml L262-437):
 * PointerOver —— 内圆放大 scale 1.1667(源 storyboard 字面量 1.167 ≈ 14/12,
 *                12px→14px)+ Secondary 色;
 *                轨道/已选段换 PointerOver 色阶(轨道同值、已选段 AccentFillColorSecondary);
 * Pressed(:active,拖动期间保持)—— 内圆缩至 scale 0.71(MR1/A2:取源 storyboard
 *                字面量,源注释「14→10px」基于源 14px 归一基准;本库内圆几何为
 *                FIX9 定案 12px 基准,数值跟随源字面量)+ Tertiary 色;
 * Focus(:focus-visible)—— 拇指外围系统焦点框(UseSystemFocusVisuals,近似,见 wiki)
 *                + 内圆放大 scale 1.1667 @167ms(MR1/A2,源 Focused storyboard);
 * Disabled —— 全套 Disabled 色 + 内圆放大(源 Disabled 态 1.167)+ 光标。
 * ====================================================================== */

/* —— PointerOver —— */
.wui-slider__input:not(:disabled):hover ~ .wui-slider__track {
  background: var(--wui-slider-track-fill-pointer-over);
}

.wui-slider__input:not(:disabled):hover ~ .wui-slider__fill {
  background: var(--wui-slider-track-value-fill-pointer-over);
}

.wui-slider__input:not(:disabled):hover ~ .wui-slider__thumb .wui-slider__thumb-inner {
  background: var(--wui-slider-thumb-background-pointer-over);
  transform: translate(-50%, -50%) scale(1.1667);
  /* 进入 PointerOver:源 KeyTime=ControlNormalAnimationDuration(250ms)+
     ControlFastOutSlowInKeySpline(L220-227);CSS 过渡取目标态定义,故在此覆写 */
  transition: transform 250ms cubic-bezier(0, 0, 0, 1);
}

/* —— Pressed(拖动中持续) —— */
.wui-slider__input:not(:disabled):active ~ .wui-slider__track {
  background: var(--wui-slider-track-fill-pressed);
}

.wui-slider__input:not(:disabled):active ~ .wui-slider__fill {
  background: var(--wui-slider-track-value-fill-pressed);
}

.wui-slider__input:not(:disabled):active ~ .wui-slider__thumb .wui-slider__thumb-inner {
  background: var(--wui-slider-thumb-background-pressed);
  /* MR1/A2:缩放值取源 storyboard 字面量 0.71(Slider_themeresources.xaml L232-239),
     不再用 FIX22 的 12px 基准换算值 0.8333;时长仍为 FIX22 的 250ms + (0,0,0,1) */
  transform: translate(-50%, -50%) scale(0.71);
  /* 进入 Pressed:同 PointerOver,250ms + cubic-bezier(0,0,0,1)(L232-239) */
  transition: transform 250ms cubic-bezier(0, 0, 0, 1);
}

/* —— Focus(键盘焦点可见性) —— */
/* 源 Slider UseSystemFocusVisuals + FocusVisualMargin=-7,0,-7,0(Thumb -14,-6):系统双环
   primary 外环 2px + secondary 内环 1px,取系统焦点主色(黑/白),非强调色 */
.wui-slider__input:focus-visible ~ .wui-slider__thumb {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* MR1/A2:Focus 态内圆放大至 1.167 @167ms(源 Focused storyboard
   SliderInnerThumb Scale 1→1.167,KeyTime=ControlFastAnimationDuration +
   ControlFastOutSlowInKeySpline,L244-251);时长取基态 transition(167ms 档),
   悬停/按压目标态规则按各自时长覆写且优先级更高(hover/pressed 时同为源行为) */
.wui-slider__input:focus-visible ~ .wui-slider__thumb .wui-slider__thumb-inner {
  transform: translate(-50%, -50%) scale(1.1667);
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

.wui-slider__input:disabled ~ .wui-slider__thumb .wui-slider__thumb-inner {
  background: var(--wui-slider-thumb-background-disabled);
  transform: translate(-50%, -50%) scale(1.1667); /* 源 Disabled 态内圆放大(L244-253) */
}
</style>
