<script lang="ts">
// ColorPicker(WinUI ColorPicker 迁移):类型与事件参数对外导出,供使用方与示例页引用。
import type { WuiSpectrumComponents } from '@/utils/colorConvert'

/** 谱区形状(WinUI ColorSpectrumShape)。 */
export type ColorPickerSpectrumShape = 'Box' | 'Ring'

/** 排布方向(WinUI Orientation):Vertical 上下堆叠(默认);Horizontal 谱区居左、竖向滑杆与输入居右。 */
export type ColorPickerOrientation = 'Vertical' | 'Horizontal'

/** 谱区分量组合(WinUI ColorSpectrumComponents)。 */
export type ColorPickerSpectrumComponents = WuiSpectrumComponents

/** colorChanged 事件参数(对应 WinUI ColorChangedEventArgs;hex 串统一 8 位 #AARRGGBB)。 */
export interface ColorPickerColorChangedEventArgs {
  oldColor: string
  newColor: string
}
</script>

<script setup lang="ts">
// WinUI ColorPicker 复刻。视觉与结构对照 CK/WinUI-Reference/controls/dev/ColorPicker/ColorPicker.xaml
// (DefaultColorPickerStyle 模板:谱区 + 新旧色预览条 + 第三维度滑杆 + alpha 滑杆 + More 按钮 +
// RGB/HSV/HEX 文本输入;ColorPickerSlider 样式:12px 渐变轨道 + 白圈彩心圆拇指),
// 行为对照 ColorPicker.cpp / ColorSpectrum.cpp:
//   - 单一 color 数据源(v-model;color 属性变更同步全部控件并触发 colorChanged,与源 OnColorChanged 一致);
//   - 谱区 canvas 逐像素按 FillPixelForBox/FillPixelForRing 公式绘制,第三维度按多层表面
//     透明度叠合(UpdateColorControls),指针/键盘选点(小步 ±1 回绕、Ctrl 命名色跳转,
//     与源 IncrementColorChannel/FindNextNamedColor 一致);
//   - 第三维度滑杆通道随 ColorSpectrumComponents 切换(SetThirdDimensionSliderChannel);
//   - 文本输入为「输入即生效」语义(TextChanging):合法即更新颜色,非法仅标记,失焦回退
//     上次有效文本(OnTextBoxLostFocus);HEX 自动补 '#',alpha 输入自动补 '%';
//   - isAlphaEnabled 控制 alpha 滑杆/输入与 HEX 位数(AlphaEnabled 状态 MaxLength 9);
//   - isMoreButtonVisible 显示「更多」开合按钮(仅 Vertical;Horizontal 下文本区常显)。
// 颜色/字号/圆角走 --wui-* token;棋盘格透明底色取 SystemListLowColor 对应 token。
import { computed, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue'
import type { CSSProperties } from 'vue'
import WuiComboBox from './ComboBox.vue'
import {
  axisValueToFraction,
  fractionToAxisValue,
  hsvToRgb,
  incrementChannel,
  normalizeColorInput,
  rgbToCss,
  rgbToHex,
  rgbToHsv,
  rgbaToHex,
  boxSpectrumLayout,
  ringSpectrumLayout,
  spectrumPixelHsv,
  spectrumThirdMode,
  findNextNamedColor,
  thirdBlendPair,
  thirdDimensionValue,
  thirdSurfaceCount,
  type WuiHsv,
  type WuiHsvBounds,
  type WuiRgb,
  type WuiSpectrumChannel,
  type WuiSpectrumLayout,
} from '@/utils/colorConvert'

defineOptions({ name: 'WuiColorPicker', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 谱区形状(WinUI ColorSpectrumShape)。 */
    colorSpectrumShape?: ColorPickerSpectrumShape
    /** 谱区分量组合(WinUI ColorSpectrumComponents)。 */
    colorSpectrumComponents?: ColorPickerSpectrumComponents
    /** 排布方向(WinUI Orientation):Vertical 上下堆叠;Horizontal 谱区居左、滑杆竖向。 */
    orientation?: ColorPickerOrientation
    /** 色相下限(WinUI MinHue,0-359;越界按边界钳制,源为抛异常,见 wiki)。 */
    minHue?: number
    /** 色相上限(WinUI MaxHue,0-359)。 */
    maxHue?: number
    /** 饱和度下限(WinUI MinSaturation,0-100)。 */
    minSaturation?: number
    /** 饱和度上限(WinUI MaxSaturation,0-100)。 */
    maxSaturation?: number
    /** 亮度下限(WinUI MinValue,0-100)。 */
    minValue?: number
    /** 亮度上限(WinUI MaxValue,0-100)。 */
    maxValue?: number
    /** 启用 alpha 通道(WinUI IsAlphaEnabled):显示 alpha 滑杆/输入,HEX 变 8 位 #AARRGGBB。 */
    isAlphaEnabled?: boolean
    /** 显示谱区(WinUI IsColorSpectrumVisible);关闭后预览条变为整宽横条。 */
    isColorSpectrumVisible?: boolean
    /** 显示新旧色预览条(WinUI IsColorPreviewVisible)。 */
    isColorPreviewVisible?: boolean
    /** 显示第三维度滑杆(色相/饱和度/亮度,WinUI IsColorSliderVisible)。 */
    isColorSliderVisible?: boolean
    /** 显示 alpha 滑杆(WinUI IsAlphaSliderVisible,需 isAlphaEnabled)。 */
    isAlphaSliderVisible?: boolean
    /** 显示「更多」开合按钮(WinUI IsMoreButtonVisible;仅 Vertical 方向生效)。 */
    isMoreButtonVisible?: boolean
    /** 显示 RGB/HSV 通道输入(WinUI IsColorChannelTextInputVisible)。 */
    isColorChannelTextInputVisible?: boolean
    /** 显示 alpha 百分比输入(WinUI IsAlphaTextInputVisible,需 isAlphaEnabled)。 */
    isAlphaTextInputVisible?: boolean
    /** 显示 HEX 输入(WinUI IsHexInputVisible)。 */
    isHexInputVisible?: boolean
    /** 禁用(Web 映射 WinUI Control.IsEnabled)。 */
    disabled?: boolean
    /** 上一色(预览条对比色,WinUI PreviousColor;null/非法值不显示旧色半区)。 */
    previousColor?: string | null
  }>(),
  {
    colorSpectrumShape: 'Box',
    colorSpectrumComponents: 'HueSaturation',
    orientation: 'Vertical',
    minHue: 0,
    maxHue: 359,
    minSaturation: 0,
    maxSaturation: 100,
    minValue: 0,
    maxValue: 100,
    isAlphaEnabled: false,
    isColorSpectrumVisible: true,
    isColorPreviewVisible: true,
    isColorSliderVisible: true,
    isAlphaSliderVisible: true,
    isMoreButtonVisible: false,
    isColorChannelTextInputVisible: true,
    isAlphaTextInputVisible: true,
    isHexInputVisible: true,
    disabled: false,
    previousColor: null,
  },
)

/**
 * 当前颜色(WinUI Color;Web 形态为 hex 字符串,接受 6 位 #RRGGBB / 8 位 #AARRGGBB,
 * 内部始终保存 rgb + alpha 浮点值)。
 */
const color = defineModel<string>('color', { default: '#FFFFFF' })

/** WinUI ColorChanged:颜色(ARGB 任一分量)变化时触发;程序化赋值同样触发(对照源 OnColorChanged)。 */
const emit = defineEmits<{
  colorChanged: [event: ColorPickerColorChangedEventArgs]
}>()

// —— 有效范围(源对越界的 Min/Max 抛异常;Web 侧收敛为钳制,见 wiki 差异) ——
const clampRange = (min: number, max: number, lo: number, hi: number) => ({
  min: Math.min(Math.max(min, lo), hi),
  max: Math.min(Math.max(max, lo), hi),
})
const bounds = computed<WuiHsvBounds>(() => {
  const hue = clampRange(props.minHue, props.maxHue, 0, 359)
  const sat = clampRange(props.minSaturation, props.maxSaturation, 0, 100)
  const val = clampRange(props.minValue, props.maxValue, 0, 100)
  return {
    minHue: hue.min,
    maxHue: hue.max,
    minSaturation: sat.min,
    maxSaturation: sat.max,
    minValue: val.min,
    maxValue: val.max,
  }
})

// —— 内部颜色状态(源 m_currentRgb / m_currentHsv / m_currentAlpha) ——
const current = ref<{ rgb: WuiRgb; alpha: number }>({ rgb: { r: 1, g: 1, b: 1 }, alpha: 1 })

function argbEqual(a: { rgb: WuiRgb; alpha: number }, b: { rgb: WuiRgb; alpha: number }): boolean {
  return (
    a.alpha === b.alpha &&
    Math.round(a.rgb.r * 255) === Math.round(b.rgb.r * 255) &&
    Math.round(a.rgb.g * 255) === Math.round(b.rgb.g * 255) &&
    Math.round(a.rgb.b * 255) === Math.round(b.rgb.b * 255)
  )
}

/** 颜色 → hex 串(colorChanged 参数与 HEX 输入展示共用;启用 alpha 时 8 位 ARGB)。 */
function colorToHex(value: { rgb: WuiRgb; alpha: number }): string {
  return props.isAlphaEnabled ? rgbaToHex(value.rgb, value.alpha) : rgbToHex(value.rgb)
}

let initialized = false
/** 最近一次通知的颜色快照(colorChanged 的 oldColor 来源;内部提交会先改 current,不能拿它当旧值)。 */
let lastNotified: { rgb: WuiRgb; alpha: number } = { rgb: { r: 1, g: 1, b: 1 }, alpha: 1 }

// v-model 同步(源 OnColorChanged):写内部状态;ARGB 变化即触发 colorChanged(含程序化赋值)。
watch(
  color,
  (next) => {
    const parsed = normalizeColorInput(next)
    if (parsed === null) {
      // 非法外部值:保留上次有效颜色(源属性系统不会收到非法 Color;Web 侧做兜底)
      return
    }
    const before = lastNotified
    if (!argbEqual(before, parsed)) {
      current.value = parsed
    }
    lastNotified = parsed
    if (initialized) {
      const oldHex = rgbaToHex(before.rgb, before.alpha)
      const newHex = rgbaToHex(parsed.rgb, parsed.alpha)
      if (oldHex !== newHex) {
        emit('colorChanged', { oldColor: oldHex, newColor: newHex })
      }
    }
    initialized = true
  },
  { immediate: true },
)

// isAlphaEnabled 变化(源 OnIsAlphaEnabledChanged):HEX 文本与位数刷新;颜色本体(含 alpha)保留。
watch(
  () => [props.isAlphaEnabled, current.value] as const,
  () => {
    syncTextFields()
  },
)

/** 当前 HSV(源 m_currentHsv 经 RgbToHsv 派生;灰度色 h=0,与源一致)。 */
const hsv = computed<WuiHsv>(() => rgbToHsv(current.value.rgb))

// —— 更新入口(源 UpdateColor 家族):写内部状态并回写 v-model ——
function commitColor(rgb: WuiRgb, alpha: number): void {
  const clamped = Math.min(Math.max(alpha, 0), 1)
  current.value = { rgb, alpha: clamped }
  color.value = props.isAlphaEnabled ? rgbaToHex(rgb, clamped) : rgbToHex(rgb)
}

function updateColorRgb(rgb: WuiRgb): void {
  commitColor(rgb, current.value.alpha)
}

function updateColorHsv(next: WuiHsv): void {
  updateColorRgb(hsvToRgb(next))
}

function updateColorAlpha(alpha: number): void {
  commitColor(current.value.rgb, alpha)
}

/** 源 ApplyConstraintsToRgbColor:RGB → HSV 钳到各通道范围 → RGB。 */
function constrainRgb(rgb: WuiRgb): WuiRgb {
  const b = bounds.value
  const next = rgbToHsv(rgb)
  next.h = Math.min(Math.max(next.h, b.minHue), b.maxHue)
  next.s = Math.min(Math.max(next.s * 100, b.minSaturation), b.maxSaturation) / 100
  next.v = Math.min(Math.max(next.v * 100, b.minValue), b.maxValue) / 100
  return hsvToRgb(next)
}

// 取值范围变更 → 收拢当前颜色(源 OnMinMaxHue/Saturation/ValueChanged:钳制 m_currentHsv 后 UpdateColor)
watch(bounds, () => {
  const rgb = constrainRgb(current.value.rgb)
  if (!argbEqual(current.value, { rgb, alpha: current.value.alpha })) {
    updateColorRgb(rgb)
  }
})

// ====================================================================================
// 谱区(canvas 绘制 + 指针/键盘交互 + 选点椭圆)
// ====================================================================================
const spectrumEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const spectrumFocused = ref(false)
const spectrumDragging = ref(false)

const isHorizontal = computed(() => props.orientation === 'Horizontal')
const layout = computed<WuiSpectrumLayout>(() =>
  props.colorSpectrumShape === 'Ring'
    ? ringSpectrumLayout(props.colorSpectrumComponents, bounds.value)
    : boxSpectrumLayout(props.colorSpectrumComponents, bounds.value),
)
const thirdMode = computed(() => spectrumThirdMode(props.colorSpectrumComponents))

/** 谱区当前第三维度值('fixed-max' 恒 1)。 */
const currentThird = computed(() =>
  thirdMode.value === 'fixed-max' ? 1 : thirdDimensionValue(layout.value, hsv.value),
)

/** 谱区 a11y:以 axisA 通道作为 RangeValue 语义暴露。 */
const spectrumAria = computed(() => {
  const axis = layout.value.axisA
  const labels: Record<WuiSpectrumChannel, string> = { hue: '色相', saturation: '饱和度', value: '亮度' }
  return {
    min: axis.min,
    max: axis.max,
    now: Math.min(Math.max(channelValue(axis.channel), axis.min), axis.max),
    label: `颜色谱区(${labels[axis.channel]})`,
  }
})

// —— 表面缓存(源多表面位图优化的 canvas 等价):重建受 形状/组合/范围/尺寸 驱动 ——
const MAX_SURFACE = 512
let surfaces: HTMLCanvasElement[] = []
let surfaceSize = 0

function hsvCss(h: number, s: number, v: number, alpha = 1): string {
  return rgbToCss(hsvToRgb({ h, s, v }), alpha)
}

function buildSurfaces(): void {
  const el = spectrumEl.value
  const canvas = canvasEl.value
  if (!el || !canvas || surfaceSize <= 0) return

  const size = surfaceSize
  const count = thirdSurfaceCount(thirdMode.value)
  const lay = layout.value
  const next: HTMLCanvasElement[] = []

  for (let i = 0; i < count; i += 1) {
    const thirdValue =
      thirdMode.value === 'blend6' ? i * 60 : thirdMode.value === 'blend' ? i : 1
    const off = document.createElement('canvas')
    off.width = size
    off.height = size
    const ctx = off.getContext('2d')
    if (!ctx) return
    const image = ctx.createImageData(size, size)
    const data = image.data
    const denom = Math.max(size - 1, 1)
    const cx = size / 2
    const isRing = props.colorSpectrumShape === 'Ring'

    for (let py = 0; py < size; py += 1) {
      const fB = py / denom
      for (let px = 0; px < size; px += 1) {
        const fA = px / denom
        let coverage = 255
        let aFrac = fA
        let bFrac = fB
        if (isRing) {
          const dx = px + 0.5 - cx
          const dy = py + 0.5 - cx
          const dist = Math.sqrt(dx * dx + dy * dy)
          const radius = cx
          if (dist >= radius) {
            coverage = Math.max(0, Math.round((radius - dist) * 2 * 255))
            if (coverage === 0) {
              const o = (py * size + px) * 4
              data[o + 3] = 0
              continue
            }
          }
          // 顺时针角(自 3 点钟;屏幕 y 向下):源 theta = atan2(R−y, R−x) + 180 的顺时针角
          const deg = (Math.atan2(dy, dx) * 180) / Math.PI
          aFrac = ((deg % 360) + 360) % 360 / 360
          bFrac = 1 - Math.min(dist / radius, 1)
        }
        const rgb = hsvToRgb(spectrumPixelHsv(lay, aFrac, bFrac, thirdValue))
        const o = (py * size + px) * 4
        data[o] = Math.round(rgb.r * 255)
        data[o + 1] = Math.round(rgb.g * 255)
        data[o + 2] = Math.round(rgb.b * 255)
        data[o + 3] = coverage
      }
    }
    ctx.putImageData(image, 0, 0)
    next.push(off)
  }
  surfaces = next
  drawSpectrum()
}

function drawSpectrum(): void {
  const canvas = canvasEl.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx || surfaces.length === 0) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (thirdMode.value === 'fixed-max' || surfaces.length === 1) {
    ctx.drawImage(surfaces[0]!, 0, 0)
    return
  }
  const pair = thirdBlendPair(layout.value, hsv.value)
  const base = surfaces[pair.baseIndex]
  const overlay = surfaces[pair.overlayIndex]
  if (base) ctx.drawImage(base, 0, 0)
  if (overlay) {
    ctx.globalAlpha = Math.min(Math.max(pair.alpha, 0), 1)
    ctx.drawImage(overlay, 0, 0)
    ctx.globalAlpha = 1
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const el = spectrumEl.value
  const canvas = canvasEl.value
  if (!el || !canvas) return
  resizeObserver = new ResizeObserver(() => {
    const side = Math.min(el.clientWidth, el.clientHeight)
    if (side <= 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const next = Math.min(Math.round(side * dpr), MAX_SURFACE)
    if (next !== surfaceSize) {
      surfaceSize = next
      canvas.width = next
      canvas.height = next
      buildSurfaces()
    }
  })
  resizeObserver.observe(el)
  // 初始一次(ResizeObserver 首回调时序不定)
  const side = Math.min(el.clientWidth, el.clientHeight)
  if (side > 0 && surfaceSize === 0) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    surfaceSize = Math.min(Math.round(side * dpr), MAX_SURFACE)
    canvas.width = surfaceSize
    canvas.height = surfaceSize
    buildSurfaces()
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  () => [
    props.colorSpectrumShape,
    props.colorSpectrumComponents,
    props.minHue,
    props.maxHue,
    props.minSaturation,
    props.maxSaturation,
    props.minValue,
    props.maxValue,
  ],
  () => buildSurfaces(),
)

// 第三维度变化 → 仅重绘(透明度叠合,对应源 MaxSurfaceOpacity)
watch(currentThird, () => drawSpectrum())

// —— 谱区指针选点 ——
function spectrumPointFractions(event: PointerEvent): { fA: number; fB: number } | null {
  const el = spectrumEl.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
  const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height)
  if (props.colorSpectrumShape === 'Ring') {
    const cx = rect.width / 2
    const cy = rect.height / 2
    const dx = x - cx
    const dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const radius = Math.max(cx, 1)
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI
    return { fA: (((deg % 360) + 360) % 360) / 360, fB: 1 - Math.min(dist / radius, 1) }
  }
  return { fA: x / Math.max(rect.width - 1, 1), fB: y / Math.max(rect.height - 1, 1) }
}

function commitFromSpectrum(event: PointerEvent): void {
  const fractions = spectrumPointFractions(event)
  if (!fractions) return
  const next: WuiHsv = { h: hsv.value.h, s: hsv.value.s, v: hsv.value.v }
  const a = fractionToAxisValue(layout.value.axisA, fractions.fA)
  const b = fractionToAxisValue(layout.value.axisB, fractions.fB)
  if (layout.value.axisA.channel === 'hue') next.h = a
  else if (layout.value.axisA.channel === 'saturation') next.s = a / 100
  else next.v = a / 100
  if (layout.value.axisB.channel === 'hue') next.h = b
  else if (layout.value.axisB.channel === 'saturation') next.s = b / 100
  else next.v = b / 100
  updateColorHsv(next)
}

function onSpectrumPointerDown(event: PointerEvent): void {
  if (props.disabled || event.button !== 0) return
  event.preventDefault()
  const el = event.currentTarget
  if (el instanceof HTMLElement) el.setPointerCapture(event.pointerId)
  spectrumDragging.value = true
  commitFromSpectrum(event)
}

function onSpectrumPointerMove(event: PointerEvent): void {
  if (!spectrumDragging.value || props.disabled) return
  commitFromSpectrum(event)
}

function onSpectrumPointerUp(event: PointerEvent): void {
  spectrumDragging.value = false
  const el = event.currentTarget
  if (el instanceof HTMLElement && el.hasPointerCapture(event.pointerId)) {
    el.releasePointerCapture(event.pointerId)
  }
}

// —— 谱区键盘步进(源 OnKeyDown:左右调 axisA 通道、上下调 axisB 通道;
//      小步 ±1(IncrementColorChannel Small);Ctrl 大步走命名色跳转(FindNextNamedColor);
//      方向语义:色相通道左/上为减,饱和度/亮度通道右/下为减) ——
function stepAxis(axisIndex: 0 | 1, direction: 1 | -1, large: boolean): void {
  const axis = axisIndex === 0 ? layout.value.axisA : layout.value.axisB
  if (large) {
    // 源 IncrementColorChannel 的 Large 分支:跳到上/下一个命名色区间的中点
    // (FindNextNamedColor 用实际单位:色相为度、饱和度/亮度为 0..1,属性范围 % 需换算)
    const min = axis.channel === 'hue' ? axis.min : axis.min / 100
    const max = axis.channel === 'hue' ? axis.max : axis.max / 100
    updateColorHsv(findNextNamedColor(hsv.value, axis.channel, direction, min, max))
    return
  }
  const next = incrementChannel(channelValue(axis.channel), direction, axis.min, axis.max)
  const updated: WuiHsv = { h: hsv.value.h, s: hsv.value.s, v: hsv.value.v }
  if (axis.channel === 'hue') updated.h = next
  else if (axis.channel === 'saturation') updated.s = next / 100
  else updated.v = next / 100
  updateColorHsv(updated)
}

function onSpectrumKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const large = event.ctrlKey
  let handled = true
  // 方向语义对照源:色相通道 左/上为减;饱和度/亮度通道 右/下为减
  switch (event.key) {
    case 'ArrowLeft':
      stepAxis(0, layout.value.axisA.channel === 'hue' ? -1 : 1, large)
      break
    case 'ArrowRight':
      stepAxis(0, layout.value.axisA.channel === 'hue' ? 1 : -1, large)
      break
    case 'ArrowUp':
      stepAxis(1, layout.value.axisB.channel === 'hue' ? -1 : 1, large)
      break
    case 'ArrowDown':
      stepAxis(1, layout.value.axisB.channel === 'hue' ? 1 : -1, large)
      break
    default:
      handled = false
  }
  if (handled) event.preventDefault()
}

// —— 选点椭圆(SelectionEllipse:16px、描边 2px;亮色判定对照 SelectionEllipseShouldBeLight) ——
/** 通道当前值(hue 单位度;saturation/value 单位 %)。 */
function channelValue(channel: WuiSpectrumChannel): number {
  if (channel === 'hue') return hsv.value.h
  return channel === 'saturation' ? hsv.value.s * 100 : hsv.value.v * 100
}

const ellipseStyle = computed<CSSProperties>(() => {
  const lay = layout.value
  let leftPercent: number
  let topPercent: number
  if (props.colorSpectrumShape === 'Ring') {
    // 角向:轴分数 × 360°(自 3 点钟顺时针);径向:画布 fB = 1 − d/R(圆心 1),
    // 反解 d/R = 1 − 轴分数(圆心 = axisB 的「inverted 语义最小值端」,与源 UpdateEllipse 一致)
    const angle = axisValueToFraction(lay.axisA, channelValue(lay.axisA.channel)) * Math.PI * 2
    const radius = 1 - axisValueToFraction(lay.axisB, channelValue(lay.axisB.channel))
    leftPercent = 50 + Math.cos(angle) * radius * 50
    topPercent = 50 + Math.sin(angle) * radius * 50
  } else {
    leftPercent = axisValueToFraction(lay.axisA, channelValue(lay.axisA.channel)) * 100
    topPercent = axisValueToFraction(lay.axisB, channelValue(lay.axisB.channel)) * 100
  }
  return { left: `${leftPercent}%`, top: `${topPercent}%` }
})

/** 选点椭圆描边用「展示色」(色相×饱和度谱区恒以 v=1 计,对照 SelectionEllipseShouldBeLight)。 */
const ellipseDisplayRgb = computed<WuiRgb>(() => {
  if (thirdMode.value === 'fixed-max') {
    return hsvToRgb({ h: hsv.value.h, s: hsv.value.s, v: 1 })
  }
  return current.value.rgb
})

const ellipseIsLight = computed<boolean>(() => {
  // 相对亮度(源注释公式):L ≤ 0.5 → 白描边
  const channel = (c01: number): number => {
    const c = Math.round(c01 * 255)
    return c <= 10 ? c / 3294 : (c / 269 + 0.0513) ** 2.4
  }
  const { r, g, b } = ellipseDisplayRgb.value
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) <= 0.5
})

const ellipseClass = computed(() => ({
  'is-light': ellipseIsLight.value,
  'is-focused': spectrumFocused.value,
  'is-dragging': spectrumDragging.value,
}))

// ====================================================================================
// 第三维度滑杆 / alpha 滑杆(ColorPickerSlider:12px 渐变轨道 + 圆形拇指)
// ====================================================================================
const thirdAxisRange = computed<{ min: number; max: number }>(() => {
  const b = bounds.value
  if (layout.value.third === 'hue') return { min: b.minHue, max: b.maxHue }
  if (layout.value.third === 'saturation') return { min: b.minSaturation, max: b.maxSaturation }
  return { min: b.minValue, max: b.maxValue }
})

const thirdSliderValue = computed(() => {
  const raw = thirdDimensionValue(layout.value, hsv.value)
  const scaled = layout.value.third === 'hue' ? raw : raw * 100
  return Math.min(Math.max(scaled, thirdAxisRange.value.min), thirdAxisRange.value.max)
})

const thirdSliderLabel = computed(() => {
  const labels: Record<WuiSpectrumChannel, string> = { hue: '色相', saturation: '饱和度', value: '亮度' }
  return labels[layout.value.third]
})

function onThirdSliderInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  const next: WuiHsv = { h: hsv.value.h, s: hsv.value.s, v: hsv.value.v }
  if (layout.value.third === 'hue') next.h = value
  else if (layout.value.third === 'saturation') next.s = value / 100
  else next.v = value / 100
  updateColorHsv(next)
}

/** 第三维度滑杆渐变(源 UpdateThirdDimensionSlider:饱和度/亮度两停;色相六分色)。 */
const thirdGradientStyle = computed<CSSProperties>(() => {
  const dir = isHorizontal.value ? 'to bottom' : 'to right'
  const b = bounds.value
  const { h, s } = hsv.value
  let stops: string[]
  if (layout.value.third === 'hue') {
    const min = b.minHue
    const max = Math.max(b.maxHue, min)
    const span = Math.max(max - min, 1)
    stops = [hsvCss(min, 1, 1)]
    for (let sextant = 1; sextant <= 5; sextant += 1) {
      const hue = sextant * 60
      if (min < hue && max > hue) {
        stops.push(`${hsvCss(hue, 1, 1)} ${(((hue - min) / span) * 100).toFixed(2)}%`)
      }
    }
    stops.push(hsvCss(max, 1, 1))
  } else if (layout.value.third === 'saturation') {
    stops = [hsvCss(h, b.minSaturation / 100, 1), hsvCss(h, b.maxSaturation / 100, 1)]
  } else {
    stops = [hsvCss(h, s, b.minValue / 100), hsvCss(h, s, b.maxValue / 100)]
  }
  return { background: `linear-gradient(${dir}, ${stops.join(', ')})` }
})

const alphaSliderValue = computed(() => Math.round(current.value.alpha * 10000) / 100)
const currentRgbCss = computed(() => rgbToCss(current.value.rgb, 1))

const alphaGradientStyle = computed<CSSProperties>(() => ({
  background: `linear-gradient(${isHorizontal.value ? 'to bottom' : 'to right'}, ${rgbToCss(current.value.rgb, 0)}, ${currentRgbCss.value})`,
}))

function onAlphaSliderInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(value)) return
  updateColorAlpha(value / 100)
}

function sliderRatio(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return Math.min(Math.max((value - min) / (max - min), 0), 1)
}

const thirdThumbStyle = computed<CSSProperties>(() => ({
  [isHorizontal.value ? 'top' : 'left']: `calc((100% - 18px) * ${sliderRatio(thirdSliderValue.value, thirdAxisRange.value.min, thirdAxisRange.value.max)})`,
}))

const alphaThumbStyle = computed<CSSProperties>(() => ({
  [isHorizontal.value ? 'top' : 'left']: `calc((100% - 18px) * ${sliderRatio(alphaSliderValue.value, 0, 100)})`,
}))

// ====================================================================================
// 可见性组合(源 UpdateVisualState)
// ====================================================================================
const moreButtonShown = computed(() => props.isMoreButtonVisible && !isHorizontal.value)
const textEntryOpened = ref(false)
/** 文本输入区:无 More 按钮时常显;有 More 按钮时随开合;Horizontal 恒显。 */
const textEntryShown = computed(
  () => !moreButtonShown.value || textEntryOpened.value || isHorizontal.value,
)
const alphaSliderShown = computed(() => props.isAlphaEnabled && props.isAlphaSliderVisible)
const alphaInputShown = computed(() => props.isAlphaEnabled && props.isAlphaTextInputVisible)
const hexMaxLength = computed(() => (props.isAlphaEnabled ? 9 : 7))

const entriesStyle = computed<CSSProperties>(() => {
  if (isHorizontal.value) {
    return {
      gridTemplateAreas: '"hex" "combo" "channels" "alpha"',
      gridTemplateColumns: 'minmax(0, 1fr)',
    }
  }
  if (props.isColorChannelTextInputVisible) {
    return {
      gridTemplateAreas: '"combo hex" "channels channels" "alpha alpha"',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    }
  }
  return { gridTemplateAreas: '"hex hex"', gridTemplateColumns: 'minmax(0, 1fr)' }
})

// ====================================================================================
// RGB / HSV / alpha / HEX 文本输入(源 TextChanging 语义:合法即生效,非法标记,失焦回退)
// ====================================================================================
type FieldName = 'red' | 'green' | 'blue' | 'hue' | 'saturation' | 'value' | 'alpha' | 'hex'

interface FieldState {
  text: string
  valid: boolean
  /** 最近一次聚焦时的有效文本(失焦回退用,源 m_previousString)。 */
  previous: string
}

const fields = reactive<Record<FieldName, FieldState>>({
  red: { text: '255', valid: true, previous: '255' },
  green: { text: '255', valid: true, previous: '255' },
  blue: { text: '255', valid: true, previous: '255' },
  hue: { text: '0', valid: true, previous: '0' },
  saturation: { text: '0', valid: true, previous: '0' },
  value: { text: '100', valid: true, previous: '100' },
  alpha: { text: '100%', valid: true, previous: '100%' },
  hex: { text: '#FFFFFF', valid: true, previous: '#FFFFFF' },
})

const editingField = ref<FieldName | null>(null)

const fieldIds = {
  red: useId(),
  green: useId(),
  blue: useId(),
  hue: useId(),
  saturation: useId(),
  value: useId(),
  alpha: useId(),
  hex: useId(),
} satisfies Record<FieldName, string>

/** 全部字段重写为当前颜色的规范展示值(源 UpdateColorControls 的 updateTextBoxes)。 */
function syncTextFields(): void {
  const rgb = current.value.rgb
  const { h, s, v } = hsv.value
  const skip = editingField.value
  if (skip !== 'red') fields.red.text = String(Math.round(rgb.r * 255))
  if (skip !== 'green') fields.green.text = String(Math.round(rgb.g * 255))
  if (skip !== 'blue') fields.blue.text = String(Math.round(rgb.b * 255))
  if (skip !== 'hue') fields.hue.text = String(Math.round(h))
  if (skip !== 'saturation') fields.saturation.text = String(Math.round(s * 100))
  if (skip !== 'value') fields.value.text = String(Math.round(v * 100))
  if (skip !== 'alpha') fields.alpha.text = `${Math.round(current.value.alpha * 100)}%`
  if (skip !== 'hex') fields.hex.text = colorToHex(current.value)
}

watch(current, () => syncTextFields())
// 初始同步(immediate 的 color watcher 在本 watcher 注册前已写入 current,需手动刷一次)
syncTextFields()

function onFieldFocus(name: FieldName, event: Event): void {
  editingField.value = name
  fields[name].previous = fields[name].text
  fields[name].valid = true
  const el = event.target as HTMLInputElement
  el.select()
}

function onFieldBlur(name: FieldName): void {
  editingField.value = null
  if (!fields[name].valid) {
    fields[name].text = fields[name].previous
  }
  // 失焦统一重写(源 OnTextBoxLostFocus → UpdateColorControls,清掉残留的非法文本)
  syncTextFields()
}

/** RGB 三通道合成提交(源 GetRgbColorFromTextBoxes 的 _wtoi 语义:非法按 0)。 */
function commitRgbFromFields(): void {
  const toChannel = (name: FieldName): number => {
    const text = fields[name].text
    return /^[0-9]+$/.test(text) ? Number.parseInt(text, 10) : 0
  }
  const rgb = {
    r: toChannel('red') / 255,
    g: toChannel('green') / 255,
    b: toChannel('blue') / 255,
  }
  updateColorRgb(constrainRgb(rgb))
}

/** HSV 三通道合成提交(源 GetHsvColorFromTextBoxes)。 */
function commitHsvFromFields(): void {
  const toNumber = (name: FieldName): number => {
    const text = fields[name].text
    return /^[0-9]+$/.test(text) ? Number.parseInt(text, 10) : 0
  }
  updateColorHsv({
    h: toNumber('hue'),
    s: toNumber('saturation') / 100,
    v: toNumber('value') / 100,
  })
}

function onChannelInput(name: FieldName, kind: 'rgb' | 'hsv', event: Event): void {
  const el = event.target as HTMLInputElement
  fields[name].text = el.value
  const parsed = /^[0-9]+$/.test(el.value) ? Number.parseInt(el.value, 10) : null
  const range =
    kind === 'rgb'
      ? { min: 0, max: 255 }
      : name === 'hue'
        ? { min: bounds.value.minHue, max: bounds.value.maxHue }
        : name === 'saturation'
          ? { min: bounds.value.minSaturation, max: bounds.value.maxSaturation }
          : { min: bounds.value.minValue, max: bounds.value.maxValue }
  if (parsed === null || parsed < range.min || parsed > range.max) {
    fields[name].valid = false
    return
  }
  fields[name].valid = true
  if (kind === 'rgb') commitRgbFromFields()
  else commitHsvFromFields()
}

function onAlphaInput(event: Event): void {
  const el = event.target as HTMLInputElement
  let text = el.value
  // 未输入 % 时自动补全(源 OnAlphaTextChanging)
  if (text === '' || !text.endsWith('%')) {
    text = `${text}%`
  }
  fields.alpha.text = text
  el.value = text
  const digits = text.slice(0, -1)
  const parsed = /^[0-9]+$/.test(digits) ? Number.parseInt(digits, 10) : null
  if (parsed === null || parsed < 0 || parsed > 100) {
    fields.alpha.valid = false
    return
  }
  fields.alpha.valid = true
  updateColorAlpha(parsed / 100)
}

function onHexInput(event: Event): void {
  const el = event.target as HTMLInputElement
  let text = el.value
  // 未输入 # 时自动补全(源 OnHexTextChanging;源将光标置于末尾,此处保持一致)
  if (text === '' || text.charCodeAt(0) !== 0x23) {
    text = `#${text}`
  }
  fields.hex.text = text
  el.value = text
  const body = text.slice(1)
  // 解析对照 HexToRgba / HexToRgb:合法 hex 字节截断;alpha 关闭时 alpha 归 1
  const parsed = /^[0-9a-fA-F]{1,8}$/.test(body)
    ? Number.parseInt(body, 16)
    : Number.NaN
  if (Number.isNaN(parsed)) {
    fields.hex.valid = false
    return
  }
  fields.hex.valid = true
  const rgb = {
    r: ((parsed >>> 16) & 0xff) / 255,
    g: ((parsed >>> 8) & 0xff) / 255,
    b: (parsed & 0xff) / 255,
  }
  updateColorRgb(constrainRgb(rgb))
  if (props.isAlphaEnabled) {
    updateColorAlpha(((parsed >>> 24) & 0xff) / 255)
  } else {
    updateColorAlpha(1)
  }
}

// —— RGB / HSV 表示切换(源 ColorRepresentationComboBox) ——
const representationItems = ['RGB', 'HSV'] as unknown[]
const representationIndex = ref(0)

// —— 预览条 ——
const currentCss = computed(() => rgbToCss(current.value.rgb, current.value.alpha))
const previousParsed = computed(() =>
  props.previousColor === null ? null : normalizeColorInput(props.previousColor),
)
const hasPrevious = computed(() => previousParsed.value !== null)
const previousCss = computed(() =>
  previousParsed.value === null
    ? 'transparent'
    : rgbToCss(previousParsed.value.rgb, previousParsed.value.alpha),
)

// —— 根节点状态类 ——
const rootClass = computed(() => ({
  'is-horizontal': isHorizontal.value,
  'is-disabled': props.disabled,
  'no-spectrum': !props.isColorSpectrumVisible,
}))
</script>

<template>
  <div v-bind="$attrs" class="wui-color-picker" :class="rootClass">
    <!-- 谱区 + 预览条行(ColorSpectrumGrid,Margin 0,0,0,16) -->
    <div class="wui-color-picker-spectrum-row">
      <div
        v-if="isColorSpectrumVisible"
        ref="spectrumEl"
        class="wui-color-picker-spectrum"
        role="slider"
        tabindex="0"
        :aria-label="spectrumAria.label"
        :aria-valuemin="spectrumAria.min"
        :aria-valuemax="spectrumAria.max"
        :aria-valuenow="spectrumAria.now"
        :aria-valuetext="color"
        :aria-disabled="disabled || undefined"
        @pointerdown="onSpectrumPointerDown"
        @pointermove="onSpectrumPointerMove"
        @pointerup="onSpectrumPointerUp"
        @pointercancel="onSpectrumPointerUp"
        @keydown="onSpectrumKeydown"
        @focus="spectrumFocused = true"
        @blur="spectrumFocused = false"
      >
        <canvas ref="canvasEl" class="wui-color-picker-canvas" aria-hidden="true"></canvas>
        <span class="wui-color-picker-ellipse" :class="ellipseClass" :style="ellipseStyle" aria-hidden="true"></span>
      </div>

      <!-- 新旧色预览条(ColorPreviewRectangleGrid 44px;无谱区时整宽 44px 高) -->
      <div
        v-if="isColorPreviewVisible"
        class="wui-color-picker-preview"
        :class="{ 'has-previous': hasPrevious }"
      >
        <span class="wui-color-picker-preview-checker" aria-hidden="true"></span>
        <span class="wui-color-picker-preview-new" :style="{ background: currentCss }" aria-hidden="true"></span>
        <span
          v-if="hasPrevious"
          class="wui-color-picker-preview-old"
          :style="{ background: previousCss }"
          aria-hidden="true"
        ></span>
        <span class="wui-color-picker-preview-border" aria-hidden="true"></span>
      </div>
    </div>

    <!-- 第三维度滑杆(ThirdDimensionSliderGrid,Margin 0,0,0,6) -->
    <div v-if="isColorSliderVisible" class="wui-color-picker-slider">
      <span class="wui-color-picker-slider-track" :style="thirdGradientStyle" aria-hidden="true"></span>
      <span class="wui-color-picker-slider-thumb" :style="thirdThumbStyle" aria-hidden="true"></span>
      <input
        class="wui-color-picker-slider-input"
        type="range"
        :min="thirdAxisRange.min"
        :max="thirdAxisRange.max"
        :step="1"
        :value="thirdSliderValue"
        :disabled="disabled"
        :aria-label="thirdSliderLabel"
        @input="onThirdSliderInput"
      />
    </div>

    <!-- alpha 滑杆(AlphaSliderGrid,Margin 0,0,0,16) -->
    <div v-if="alphaSliderShown" class="wui-color-picker-slider is-alpha">
      <span class="wui-color-picker-slider-checker" aria-hidden="true"></span>
      <span class="wui-color-picker-slider-track" :style="alphaGradientStyle" aria-hidden="true"></span>
      <span class="wui-color-picker-slider-thumb" :style="alphaThumbStyle" aria-hidden="true"></span>
      <input
        class="wui-color-picker-slider-input"
        type="range"
        min="0"
        max="100"
        :step="1"
        :value="alphaSliderValue"
        :disabled="disabled"
        aria-label="不透明度"
        @input="onAlphaSliderInput"
      />
    </div>

    <!-- 更多按钮(MoreButton;仅 Vertical,源 Horizontal 下隐藏) -->
    <button
      v-if="moreButtonShown"
      type="button"
      class="wui-color-picker-more"
      :class="{ 'is-open': textEntryOpened }"
      :aria-expanded="textEntryOpened"
      :disabled="disabled"
      @click="textEntryOpened = !textEntryOpened"
    >
      <span class="wui-color-picker-more-label">{{ textEntryOpened ? '收起' : '更多' }}</span>
      <span class="wui-color-picker-more-glyph" aria-hidden="true">{{ textEntryOpened ? '&#xE70E;' : '&#xE70D;' }}</span>
    </button>

    <!-- 文本输入区(TextEntryGrid) -->
    <div v-if="textEntryShown" class="wui-color-picker-entries" :style="entriesStyle">
      <!-- FIX9:表示法下拉(ColorRepresentationComboBox Width 120)。类作用域坑:此前类直接
           落在 WuiComboBox 根上,其根只带 ComboBox 自身作用域 id,本组件 scoped 规则
           .wui-color-picker-combo[data-v-cp] 永不命中 → grid-area/width 双失效、被网格列
           拉伸到 190px。改为本组件自有包裹层承载 grid-area 与 120px 定宽(源 ColorPicker.xaml
           L363),子控件经 :deep 撑满包裹层。 -->
      <div v-if="isColorChannelTextInputVisible" class="wui-color-picker-combo">
        <WuiComboBox
          :items="representationItems"
          v-model:selected-index="representationIndex"
          :disabled="disabled"
          aria-label="颜色表示法"
        />
      </div>

      <div v-if="isColorChannelTextInputVisible" class="wui-color-picker-channels">
        <!-- RGB 面板 -->
        <div v-if="representationIndex === 0" class="wui-color-picker-channel-panel">
          <div class="wui-color-picker-channel-row">
            <input
              :id="fieldIds.red"
              class="wui-color-picker-field-input"
              type="text"
              maxlength="3"
              :value="fields.red.text"
              :disabled="disabled"
              :aria-invalid="!fields.red.valid || undefined"
              aria-label="红"
              spellcheck="false"
              @input="onChannelInput('red', 'rgb', $event)"
              @focus="onFieldFocus('red', $event)"
              @blur="onFieldBlur('red')"
            />
            <label class="wui-color-picker-channel-label" :for="fieldIds.red">红</label>
          </div>
          <div class="wui-color-picker-channel-row">
            <input
              :id="fieldIds.green"
              class="wui-color-picker-field-input"
              type="text"
              maxlength="3"
              :value="fields.green.text"
              :disabled="disabled"
              :aria-invalid="!fields.green.valid || undefined"
              aria-label="绿"
              spellcheck="false"
              @input="onChannelInput('green', 'rgb', $event)"
              @focus="onFieldFocus('green', $event)"
              @blur="onFieldBlur('green')"
            />
            <label class="wui-color-picker-channel-label" :for="fieldIds.green">绿</label>
          </div>
          <div class="wui-color-picker-channel-row">
            <input
              :id="fieldIds.blue"
              class="wui-color-picker-field-input"
              type="text"
              maxlength="3"
              :value="fields.blue.text"
              :disabled="disabled"
              :aria-invalid="!fields.blue.valid || undefined"
              aria-label="蓝"
              spellcheck="false"
              @input="onChannelInput('blue', 'rgb', $event)"
              @focus="onFieldFocus('blue', $event)"
              @blur="onFieldBlur('blue')"
            />
            <label class="wui-color-picker-channel-label" :for="fieldIds.blue">蓝</label>
          </div>
        </div>
        <!-- HSV 面板 -->
        <div v-else class="wui-color-picker-channel-panel">
          <div class="wui-color-picker-channel-row">
            <input
              :id="fieldIds.hue"
              class="wui-color-picker-field-input"
              type="text"
              maxlength="3"
              :value="fields.hue.text"
              :disabled="disabled"
              :aria-invalid="!fields.hue.valid || undefined"
              aria-label="色相"
              spellcheck="false"
              @input="onChannelInput('hue', 'hsv', $event)"
              @focus="onFieldFocus('hue', $event)"
              @blur="onFieldBlur('hue')"
            />
            <label class="wui-color-picker-channel-label" :for="fieldIds.hue">色相</label>
          </div>
          <div class="wui-color-picker-channel-row">
            <input
              :id="fieldIds.saturation"
              class="wui-color-picker-field-input"
              type="text"
              maxlength="3"
              :value="fields.saturation.text"
              :disabled="disabled"
              :aria-invalid="!fields.saturation.valid || undefined"
              aria-label="饱和度"
              spellcheck="false"
              @input="onChannelInput('saturation', 'hsv', $event)"
              @focus="onFieldFocus('saturation', $event)"
              @blur="onFieldBlur('saturation')"
            />
            <label class="wui-color-picker-channel-label" :for="fieldIds.saturation">饱和度</label>
          </div>
          <div class="wui-color-picker-channel-row">
            <input
              :id="fieldIds.value"
              class="wui-color-picker-field-input"
              type="text"
              maxlength="3"
              :value="fields.value.text"
              :disabled="disabled"
              :aria-invalid="!fields.value.valid || undefined"
              aria-label="亮度"
              spellcheck="false"
              @input="onChannelInput('value', 'hsv', $event)"
              @focus="onFieldFocus('value', $event)"
              @blur="onFieldBlur('value')"
            />
            <label class="wui-color-picker-channel-label" :for="fieldIds.value">亮度</label>
          </div>
        </div>
      </div>

      <!-- alpha 输入(AlphaPanel) -->
      <div v-if="alphaInputShown" class="wui-color-picker-alpha-row">
        <input
          :id="fieldIds.alpha"
          class="wui-color-picker-field-input"
          type="text"
          maxlength="4"
          :value="fields.alpha.text"
          :disabled="disabled"
          :aria-invalid="!fields.alpha.valid || undefined"
          aria-label="不透明度"
          spellcheck="false"
          @input="onAlphaInput"
          @focus="onFieldFocus('alpha', $event)"
          @blur="onFieldBlur('alpha')"
        />
        <label class="wui-color-picker-channel-label" :for="fieldIds.alpha">不透明度</label>
      </div>

      <!-- HEX 输入(HexTextBox) -->
      <input
        v-if="isHexInputVisible"
        :id="fieldIds.hex"
        class="wui-color-picker-hex"
        type="text"
        :maxlength="hexMaxLength"
        :value="fields.hex.text"
        :disabled="disabled"
        :aria-invalid="!fields.hex.valid || undefined"
        aria-label="HEX 颜色值"
        spellcheck="false"
        @input="onHexInput"
        @focus="onFieldFocus('hex', $event)"
        @blur="onFieldBlur('hex')"
      />
    </div>
  </div>
</template>

<style scoped>
.wui-color-picker {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  min-width: 312px; /* ColorPickerVerticalOrientationMinWidth */
  max-width: 392px; /* ColorPickerVerticalOrientationMaxWidth */
  padding: 4px 0; /* RootGrid Padding 0,4 */

  /* 视觉 fix(V7):ColorPickerSliderThumbBackground = TextFillColorPrimaryBrush。
     theme.css 已有 --wui-text-fill-color-primary(明 #000000e4 / 暗 #ffffff),
     引用 var(--wui-text-fill-color-primary, var(--wui-cp-thumb-inner-fill)) 恒命中全局
     token;此处仅留同值兜底(FINAL M-1:按 CSS 字节序 #000000e4,防 token 改名时
     误落未翻转的全透明红)。来源:CommonStyles/Common_themeresources_any.xaml。 */
  --wui-cp-thumb-inner-fill: #000000e4;
  /* 视觉 fix(FIX9):预览条描边 / 滑杆拇指外环取现行 Fluent 实值。theme.css 未生成
     control-stroke / control-solid-fill 族 token,按 V7 先例局部携带:
     ControlStrokeColorDefault light #0F000000 / dark #12FFFFFF(Common_themeresources_any.xaml
     L243 / L39)→ 字节序换算(XAML AARRGGBB → CSS RRGGBBAA)#0000000f / #ffffff12;
     ControlSolidFillColorDefault light #FFFFFF / dark #454545(同文件 L228 / L24),
     用于 SliderOuterThumbBackground。 */
  --wui-cp-stroke-default: #0000000f;
  --wui-cp-outer-thumb-fill: #ffffff;
}

html[data-theme='dark'] .wui-color-picker {
  --wui-cp-thumb-inner-fill: #ffffff;
  --wui-cp-stroke-default: #ffffff12;
  --wui-cp-outer-thumb-fill: #454545;
}

/* —— Horizontal 排布(源 Horizontal 视觉状态:谱区居左,竖向滑杆居中,输入区居右) —— */
.wui-color-picker.is-horizontal {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto auto minmax(250px, 360px);
  grid-template-areas: 'spectrum third alpha entries';
  align-items: stretch;
  column-gap: 6px;
  max-width: none;
  min-width: 0;
}

.wui-color-picker.is-horizontal .wui-color-picker-spectrum-row {
  grid-area: spectrum;
  flex: 1;
  margin: 0;
}

.wui-color-picker.is-horizontal .wui-color-picker-slider {
  grid-area: third;
}

.wui-color-picker.is-horizontal .wui-color-picker-slider.is-alpha {
  grid-area: alpha;
}

.wui-color-picker.is-horizontal .wui-color-picker-more {
  display: none;
}

.wui-color-picker.is-horizontal .wui-color-picker-entries {
  grid-area: entries;
}

/* —— 谱区行 —— */
.wui-color-picker-spectrum-row {
  display: flex;
  align-items: stretch;
  gap: 12px; /* ColorPreviewRectangleGrid Margin 12,0,0,0 */
  margin-bottom: 16px; /* ColorSpectrumGrid Margin 0,0,0,16 */
}

.wui-color-picker.no-spectrum .wui-color-picker-spectrum-row {
  display: block; /* 谱区折叠:预览条整宽、高 44(源 ColorSpectrumCollapsed 状态) */
}

.wui-color-picker.no-spectrum .wui-color-picker-preview {
  width: 100%;
  height: 44px;
}

.wui-color-picker.no-spectrum .wui-color-picker-spectrum-row {
  margin-bottom: 12px;
}

.wui-color-picker-spectrum {
  position: relative;
  flex: 1 1 auto;
  aspect-ratio: 1;
  min-width: 256px; /* ColorSpectrum MinWidth */
  max-width: 336px; /* ColorSpectrum MaxWidth */
  border-radius: 4px; /* CornerRadius = ControlCornerRadius,theme.css 无该 token,见 wiki */
  touch-action: none;
  outline: none;
}

.wui-color-picker-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

/* 选点椭圆(SelectionEllipsePanel 16×16,描边 2) */
.wui-color-picker-ellipse {
  position: absolute;
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  border: 2px solid var(--wui-system-control-background-chrome-white);
  border-radius: 50%;
  background: transparent;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.wui-color-picker-ellipse.is-light {
  border-color: var(--wui-system-control-background-chrome-white);
}

.wui-color-picker-ellipse:not(.is-light) {
  border-color: var(--wui-system-control-foreground-chrome-black-high, var(--wui-focus-visual-black-stroke-theme));
}

.wui-color-picker-ellipse.is-dragging {
  width: 48px; /* PressedLarge:48×48 */
  height: 48px;
}

.wui-color-picker-ellipse.is-focused {
  outline: 2px solid var(--wui-system-control-background-chrome-white);
  outline-offset: 0;
}

.wui-color-picker-ellipse.is-light.is-focused {
  outline-color: var(--wui-system-control-foreground-chrome-black-high, var(--wui-focus-visual-black-stroke-theme));
}

.wui-color-picker-spectrum:focus-visible .wui-color-picker-ellipse {
  outline: 2px solid var(--wui-system-control-background-chrome-white);
}

.wui-color-picker-spectrum {
  cursor: crosshair;
}

.wui-color-picker.is-disabled .wui-color-picker-spectrum {
  cursor: default;
  opacity: 0.6;
}

/* —— 预览条(44px 宽;棋盘透明底) —— */
.wui-color-picker-preview {
  position: relative;
  flex: 0 0 44px;
  overflow: hidden;
  border-radius: 4px; /* CornerRadius = ControlCornerRadius,见 wiki */
}

.wui-color-picker-preview > span {
  position: absolute;
  pointer-events: none;
}

/* 棋盘格:4px 方格(源 CheckerSize=4),底色 SystemListLowColor → token */
.wui-color-picker-preview-checker {
  inset: 0;
  background-image: repeating-conic-gradient(
    var(--wui-system-control-background-list-low) 0% 25%,
    transparent 0% 50%
  );
  background-size: 8px 8px;
}

.wui-color-picker-preview-new {
  inset: 0;
}

/* 新色上半 / 旧色下半(源 PreviousColorVisibleVertical:Row1) */
.wui-color-picker-preview.has-previous .wui-color-picker-preview-new {
  inset: 0 0 50% 0;
}

.wui-color-picker-preview-old {
  inset: 50% 0 0 0;
}

.wui-color-picker-preview-border {
  inset: 0;
  /* FIX9:ColorPickerBorderBrush = ControlStrokeColorDefaultBrush(ColorPicker_themeresources
     L11/L20)。此前误用 var(--wui-text-control-border)(legacy TextControlBorderBrush,
     40% 不透明,浓 6~7 倍);现取 ControlStrokeColorDefault 5.9%(light)/ 7.1%(dark)。 */
  border: 2px solid var(--wui-cp-stroke-default);
  border-radius: inherit;
}

/* —— 滑杆行(ColorPickerSlider:12px 轨道 + 圆形拇指) —— */
.wui-color-picker-slider {
  position: relative;
  min-height: 32px; /* SliderContainer 同款命中区 */
  margin-bottom: 6px; /* ThirdDimensionSliderGrid Margin 0,0,0,6 */
}

.wui-color-picker-slider.is-alpha {
  margin-bottom: 16px; /* AlphaSliderGrid Margin 0,0,0,16 */
}

.wui-color-picker-slider > span {
  position: absolute;
  pointer-events: none;
}

.wui-color-picker-slider-track {
  top: 50%;
  left: 0;
  width: 100%;
  height: 12px; /* ThirdDimensionBackgroundRectangle Height 12 */
  border-radius: 6px; /* ColorPickerSliderCornerRadius */
  transform: translateY(-50%);
}

/* alpha 滑杆棋盘底(4px 方格) */
.wui-color-picker-slider-checker {
  top: 50%;
  left: 0;
  width: 100%;
  height: 12px;
  border-radius: 6px;
  transform: translateY(-50%);
  background-image: repeating-conic-gradient(
    var(--wui-system-control-background-list-low) 0% 25%,
    transparent 0% 50%
  );
  background-size: 8px 8px;
}

/* 拇指(外圈底色圆 + 1px 描边 + 内圈当前通道色,ColorPickerSliderStyle 的 Thumb 模板
   ColorPicker.xaml L437-447:Border(SliderOuterThumbBackground + SliderThumbBorderBrush +
   SliderThumbCornerRadius)包 Ellipse(ColorPickerSliderInnerThumb 10×10)) */
.wui-color-picker-slider-thumb {
  top: 50%;
  width: 18px; /* FIX9:SliderHorizontalThumbWidth/Height = 18(Slider_themeresources L169-170),原 20 偏大 */
  height: 18px;
  box-sizing: border-box;
  border: 1px solid var(--wui-cp-stroke-default); /* SliderThumbBorderBrush = ControlElevationBorderBrush(取其基色 ControlStrokeColorDefault) */
  border-radius: 50%; /* CornerRadius = SliderThumbCornerRadius 10(18px 盒即整圆) */
  background: var(--wui-cp-outer-thumb-fill); /* SliderOuterThumbBackground = ControlSolidFillColorDefaultBrush */
  transform: translate(0, -50%);
}

.wui-color-picker-slider-thumb::after {
  content: '';
  position: absolute;
  inset: 3px; /* 内圈 10px(ColorPickerSliderInnerThumbWidth/Height):18 - 2×1(描边)- 2×3 */
  border-radius: 50%;
  background: var(--wui-text-fill-color-primary, var(--wui-cp-thumb-inner-fill)); /* ColorPickerSliderThumbBackground */
}

.wui-color-picker-slider-input:not(:disabled):hover ~ .wui-color-picker-slider-thumb::after,
.wui-color-picker-slider-input:not(:disabled):focus-visible ~ .wui-color-picker-slider-thumb::after {
  background: var(--wui-system-control-highlight-chrome-alt-low); /* ThumbBackgroundPointerOver */
}

.wui-color-picker-slider-input:not(:disabled):active ~ .wui-color-picker-slider-thumb::after {
  background: var(--wui-text-fill-color-primary, var(--wui-cp-thumb-inner-fill)); /* Pressed = TextFillColorPrimary(源默认主题) */
}

.wui-color-picker-slider-input:focus-visible ~ .wui-color-picker-slider-thumb {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.wui-color-picker-slider-input {
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

.wui-color-picker-slider-input:focus {
  outline: none;
}

.wui-color-picker-slider-input:disabled {
  cursor: default;
}

.wui-color-picker.is-disabled .wui-color-picker-slider-track {
  filter: grayscale(1);
  opacity: 0.4;
}

.wui-color-picker.is-disabled .wui-color-picker-slider-thumb::after {
  background: var(--wui-system-control-disabled-base-low); /* ThumbBackgroundDisabled 近似 */
}

/* Horizontal:滑杆竖排(12px 宽、纵向拉伸;渐变/拇指定位切换到纵向) */
.wui-color-picker.is-horizontal .wui-color-picker-slider {
  width: 32px; /* VerticalTemplate MinWidth 32 */
  min-height: 0;
  margin-bottom: 0;
}

.wui-color-picker.is-horizontal .wui-color-picker-slider-track,
.wui-color-picker.is-horizontal .wui-color-picker-slider-checker {
  top: 0;
  left: 50%;
  width: 12px;
  height: 100%;
  transform: translateX(-50%);
}

.wui-color-picker.is-horizontal .wui-color-picker-slider-thumb {
  top: auto;
  left: 50%;
  transform: translate(-50%, 0);
}

.wui-color-picker.is-horizontal .wui-color-picker-slider-input {
  writing-mode: vertical-lr;
  direction: rtl;
}

/* —— 更多按钮(ToggleButton 透明底样式) —— */
.wui-color-picker-more {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px; /* MoreGlyph Margin 8,0,0,0 */
  min-width: 120px;
  min-height: 32px;
  margin: 0 0 12px; /* MoreEntriesPanel Margin 0,0,0,12 */
  padding: 5px 0 7px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-system-control-foreground-base-high);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.wui-color-picker-more:hover:not(:disabled) {
  color: var(--wui-system-control-foreground-base-medium);
}

.wui-color-picker-more:active:not(:disabled) {
  color: var(--wui-system-control-foreground-base-medium-low);
}

.wui-color-picker-more:disabled {
  color: var(--wui-system-control-foreground-base-medium-low);
  cursor: default;
}

.wui-color-picker-more:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.wui-color-picker-more-glyph {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 12px; /* MoreGlyph FontSize 12 */
}

/* —— 文本输入区 —— */
.wui-color-picker-entries {
  display: grid;
  gap: 12px; /* 面板间 12(RgbPanel 行距 12 / AlphaPanel Margin 0,12,0,0) */
  margin-bottom: 12px;
}

/* FIX9:类移到本组件自有包裹层(见模板注),scoped 规则可命中 → grid-area / 120px 生效 */
.wui-color-picker-combo {
  grid-area: combo;
  width: 120px; /* ColorRepresentationComboBox Width 120(ColorPicker.xaml L363) */
}

.wui-color-picker-combo > :deep(.wui-combo-box) {
  width: 100%;
}

.wui-color-picker-hex {
  grid-area: hex;
  justify-self: end; /* HexTextBox HorizontalAlignment Right */
  box-sizing: border-box;
  width: 132px; /* HexTextBox Width 132 */
  min-height: 32px;
  padding: 3px 10px 5px; /* TextBox 内边距(TextControlThemePadding 近似,见 wiki) */
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-control-foreground);
  caret-color: var(--wui-text-control-foreground);
  background: var(--wui-text-control-background);
  border: 2px solid var(--wui-text-control-border);
  border-radius: 4px;
  outline: none;
}

.wui-color-picker-hex:not(:disabled):not(:focus):hover {
  background: var(--wui-text-control-background-pointer-over);
  border-color: var(--wui-text-control-border-brush-pointer-over);
}

.wui-color-picker-hex:focus {
  background: var(--wui-text-control-background-focused);
  border-color: var(--wui-text-control-border-brush-focused, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)));
  color: var(--wui-text-control-foreground-focused);
}

.wui-color-picker-hex[aria-invalid='true'] {
  border-color: var(--wui-system-control-error-text-foreground);
}

.wui-color-picker-channels {
  grid-area: channels;
}

.wui-color-picker-channel-panel {
  display: flex;
  flex-direction: column;
  gap: 12px; /* 各行 Margin 0,12,0,0 */
}

.wui-color-picker-channel-row,
.wui-color-picker-alpha-row {
  display: grid;
  grid-template-columns: 120px 8px minmax(0, 1fr); /* 输入 120 + 间隔 8 + 标签列 */
  grid-template-areas: 'input gap label';
}

.wui-color-picker-alpha-row {
  grid-area: alpha;
}

.wui-color-picker-field-input {
  grid-area: input;
  box-sizing: border-box;
  width: 120px; /* RedTextBox Width 120 */
  min-height: 32px;
  padding: 3px 6px 6px 10px; /* TextControlThemePadding 10,3,6,6 */
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-control-foreground);
  caret-color: var(--wui-text-control-foreground);
  background: var(--wui-text-control-background);
  border: 2px solid var(--wui-text-control-border);
  border-radius: 4px;
  outline: none;
}

.wui-color-picker-field-input:not(:disabled):not(:focus):hover {
  background: var(--wui-text-control-background-pointer-over);
  border-color: var(--wui-text-control-border-brush-pointer-over);
}

.wui-color-picker-field-input:focus {
  background: var(--wui-text-control-background-focused);
  border-color: var(--wui-text-control-border-brush-focused, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)));
  color: var(--wui-text-control-foreground-focused);
}

.wui-color-picker-field-input[aria-invalid='true'] {
  border-color: var(--wui-system-control-error-text-foreground);
}

.wui-color-picker-channel-label {
  grid-area: label;
  align-self: center;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

/* —— Disabled(源各部件 Disabled 状态) —— */
.wui-color-picker.is-disabled .wui-color-picker-preview {
  opacity: 0.6;
}

.wui-color-picker.is-disabled .wui-color-picker-field-input,
.wui-color-picker.is-disabled .wui-color-picker-hex {
  color: var(--wui-text-control-foreground-disabled);
  background: var(--wui-text-control-background-disabled);
  border-color: var(--wui-text-control-border-brush-disabled);
  cursor: default;
}

.wui-color-picker.is-disabled .wui-color-picker-channel-label {
  color: var(--wui-text-control-foreground-disabled);
}
</style>
