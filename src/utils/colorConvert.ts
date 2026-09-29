// WinUI 颜色转换纯函数(供 ColorPicker / ColorSpectrum 复刻使用;无 DOM 依赖,Node 可直接单测)。
// 数值语义严格对照源实现:
//   - CK/WinUI-Reference/controls/dev/Common/ColorConversion.cpp
//     (RgbToHsv / HsvToRgb / RgbToHex / RgbaToHex / HexToRgb / HexToRgba / ColorFromRgba)
//   - CK/WinUI-Reference/controls/dev/ColorPicker/ColorSpectrum.cpp
//     (FillPixelForBox / FillPixelForRing 的谱区坐标 → HSV 公式与多层表面合成)
// 约定:RGB 分量取 0..1;HSV 中 h 取 0..360(灰度色 h=0)、s/v 取 0..1;alpha 取 0..1;
//       saturation/value 的属性单位为 %(与 WinUI MinSaturation 等属性一致),HSV 结构体内为 0..1。
// 舍入规则:字节化一律 round(分量 * 255)(源 static_cast<byte>(round(...)))。

/** RGB 颜色(分量 0..1,对应源 struct Rgb)。 */
export interface WuiRgb {
  r: number
  g: number
  b: number
}

/** HSV 颜色(h 0..360,s/v 0..1,对应源 struct Hsv)。 */
export interface WuiHsv {
  h: number
  s: number
  v: number
}

/** HSV 各通道取值范围(WinUI MinHue/MaxHue/... 属性组;hue 单位度,saturation/value 单位 %)。 */
export interface WuiHsvBounds {
  minHue: number
  maxHue: number
  minSaturation: number
  maxSaturation: number
  minValue: number
  maxValue: number
}

/** WinUI 默认范围(源 ColorPicker / ColorSpectrum 属性默认值)。 */
export const DEFAULT_HSV_BOUNDS: WuiHsvBounds = {
  minHue: 0,
  maxHue: 359,
  minSaturation: 0,
  maxSaturation: 100,
  minValue: 0,
  maxValue: 100,
}

/** ColorSpectrumComponents(WinUI 枚举;决定谱区两轴与第三维度各是哪个 HSV 通道)。 */
export type WuiSpectrumComponents =
  | 'HueSaturation'
  | 'HueValue'
  | 'ValueHue'
  | 'ValueSaturation'
  | 'SaturationHue'
  | 'SaturationValue'

/** 谱区通道标识。 */
export type WuiSpectrumChannel = 'hue' | 'saturation' | 'value'

/** 谱区单轴定义:f 为沿轴分数(0=起点,1=终点),inverted 表示起点为最大值。 */
export interface WuiSpectrumAxis {
  channel: WuiSpectrumChannel
  min: number
  max: number
  /** true = 轴起点(f=0)为最大值(Box 的饱和度/亮度轴、Ring 的径向轴)。 */
  inverted: boolean
}

/** 谱区布局:axisA(Box 横轴 / Ring 自 3 点钟顺时针角)、axisB(Box 纵轴 / Ring 径向)、第三维度通道。 */
export interface WuiSpectrumLayout {
  axisA: WuiSpectrumAxis
  axisB: WuiSpectrumAxis
  third: WuiSpectrumChannel
}

/** 第三维度呈现方式(对照 ColorSpectrum.cpp 的多层位图合成):
 * - 'fixed-max':单一表面,第三维度固定为 1(HueSaturation/SaturationHue:谱区恒以 v=1 绘制);
 * - 'blend':两表面(第三维度 0/1)按当前第三维度值透明度叠合(HueValue/ValueHue);
 * - 'blend6':六表面(色相 0..300 六分色)按当前色相所处六分位插值(ValueSaturation/SaturationValue)。 */
export type WuiSpectrumThirdMode = 'fixed-max' | 'blend' | 'blend6'

/** 数值夹取到 0..1。 */
export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/** 0..1 分量 → 0..255 字节(round 舍入,源 ColorFromRgba/RgbToHex 约定)。 */
export function roundToByte(component01: number): number {
  const rounded = Math.round(component01 * 255)
  return rounded < 0 ? 0 : rounded > 255 ? 255 : rounded
}

/** RGB → HSV(源 RgbToHsv:chroma=0 时 h=0、s=0;h 归一到 [0,360))。 */
export function rgbToHsv(rgb: WuiRgb): WuiHsv {
  const { r, g, b } = rgb
  const max = r >= g ? (r >= b ? r : b) : g >= b ? g : b
  const min = r <= g ? (r <= b ? r : b) : g <= b ? g : b
  const chroma = max - min

  if (chroma === 0) {
    return { h: 0, s: 0, v: max }
  }

  let hue: number
  if (r === max) {
    hue = (60 * (g - b)) / chroma
  } else if (g === max) {
    hue = 120 + (60 * (b - r)) / chroma
  } else {
    hue = 240 + (60 * (r - g)) / chroma
  }
  if (hue < 0) {
    hue += 360
  }

  return { h: hue, s: chroma / max, v: max }
}

/** HSV → RGB(源 HsvToRgb:h 折回 [0,360),s/v 钳到 [0,1],色度六分位展开)。 */
export function hsvToRgb(hsv: WuiHsv): WuiRgb {
  let hue = hsv.h
  while (hue >= 360) {
    hue -= 360
  }
  while (hue < 0) {
    hue += 360
  }
  const saturation = hsv.s < 0 ? 0 : hsv.s > 1 ? 1 : hsv.s
  const value = hsv.v < 0 ? 0 : hsv.v > 1 ? 1 : hsv.v

  const chroma = saturation * value
  const min = value - chroma

  if (chroma === 0) {
    return { r: min, g: min, b: min }
  }

  const sextant = Math.floor(hue / 60)
  const fraction = hue / 60 - sextant
  const max = chroma + min

  switch (sextant % 6) {
    case 0:
      return { r: max, g: min + chroma * fraction, b: min }
    case 1:
      return { r: min + chroma * (1 - fraction), g: max, b: min }
    case 2:
      return { r: min, g: max, b: min + chroma * fraction }
    case 3:
      return { r: min, g: min + chroma * (1 - fraction), b: max }
    case 4:
      return { r: min + chroma * fraction, g: min, b: max }
    default:
      return { r: max, g: min, b: min + chroma * (1 - fraction) }
  }
}

/** RGB → '#RRGGBB'(大写;源 RgbToHex 的 #%06X)。 */
export function rgbToHex(rgb: WuiRgb): string {
  const value = (roundToByte(rgb.r) << 16) + (roundToByte(rgb.g) << 8) + roundToByte(rgb.b)
  return `#${value.toString(16).toUpperCase().padStart(6, '0')}`
}

/** RGB + alpha → '#AARRGGBB'(大写;源 RgbaToHex 的 #%08X,alpha 在前)。 */
export function rgbaToHex(rgb: WuiRgb, alpha: number): string {
  const value =
    ((roundToByte(alpha) << 24) | (roundToByte(rgb.r) << 16) | (roundToByte(rgb.g) << 8) | roundToByte(rgb.b)) >>> 0
  return `#${value.toString(16).toUpperCase().padStart(8, '0')}`
}

/** 16 进制数字序列校验(源 TryParseInt(str, 16):出现任何非 hex 字符即失败)。 */
function isHexString(text: string): boolean {
  return /^[0-9a-fA-F]+$/.test(text)
}

/**
 * '#RRGGBB' → RGB;解析失败返回 null(对应源 HexToRgb 的 (-1,-1,-1) 哨兵)。
 */
export function hexToRgb(hex: string): WuiRgb | null {
  const parsed = hexToRgba(hex)
  return parsed === null ? null : parsed.rgb
}

/**
 * '#AARRGGBB' / '#RRGGBB' → { rgb, alpha };解析失败返回 null。
 * 注意源语义(HexToRgba):alpha 取位 24-31,因此 6 位输入的 alpha 解析为 0
 * (ColorPicker 仅在 IsAlphaEnabled 时走 8 位路径,6 位路径忽略 alpha)。
 */
export function hexToRgba(hex: string): { rgb: WuiRgb; alpha: number } | null {
  let body = hex
  if (body.charCodeAt(0) === 0x23 /* # */) {
    body = body.slice(1)
  }
  if (body.length !== 6 && body.length !== 8) {
    return null
  }
  if (!isHexString(body)) {
    return null
  }
  const value = Number.parseInt(body, 16)
  if (!Number.isFinite(value)) {
    return null
  }
  return {
    rgb: {
      r: ((value >>> 16) & 0xff) / 255,
      g: ((value >>> 8) & 0xff) / 255,
      b: (value & 0xff) / 255,
    },
    alpha: ((value >>> 24) & 0xff) / 255,
  }
}

/**
 * v-model 宽容解析:接受带/不带 '#' 的 6 位(RGB,alpha 视为 1)或 8 位(ARGB)串。
 * 与 HexToRgba 的差异:6 位视为不透明(对应源 ColorPicker 中 IsAlphaEnabled=false 时
 * HexToRgb + alpha=1 的路径)。
 */
export function normalizeColorInput(text: string): { rgb: WuiRgb; alpha: number } | null {
  if (typeof text !== 'string') {
    return null
  }
  const trimmed = text.trim()
  const body = trimmed.charCodeAt(0) === 0x23 ? trimmed.slice(1) : trimmed
  if (body.length === 6) {
    const rgb = hexToRgb(`#${body}`)
    return rgb === null ? null : { rgb, alpha: 1 }
  }
  if (body.length === 8) {
    return hexToRgba(`#${body}`)
  }
  return null
}

/** RGB + alpha → CSS rgba() 颜色串(分量按源约定字节化;alpha 保留 3 位小数)。 */
export function rgbToCss(rgb: WuiRgb, alpha: number): string {
  const a = Math.round(clamp01(alpha) * 1000) / 1000
  return `rgba(${roundToByte(rgb.r)}, ${roundToByte(rgb.g)}, ${roundToByte(rgb.b)}, ${a})`
}

/** 通道属性范围(hue 单位度,saturation/value 单位 %)。 */
function boundsOf(channel: WuiSpectrumChannel, bounds: WuiHsvBounds): { min: number; max: number } {
  switch (channel) {
    case 'hue':
      return { min: bounds.minHue, max: bounds.maxHue }
    case 'saturation':
      return { min: bounds.minSaturation, max: bounds.maxSaturation }
    default:
      return { min: bounds.minValue, max: bounds.maxValue }
  }
}

function axisOf(channel: WuiSpectrumChannel, bounds: WuiHsvBounds, inverted: boolean): WuiSpectrumAxis {
  return { channel, inverted, ...boundsOf(channel, bounds) }
}

/**
 * Box 谱区布局(源 FillPixelForBox 的分量分配 + 末段反转变换):
 * axisA = 横轴(左 → 右),axisB = 纵轴(上 → 下)。
 * 饱和度/亮度与色相同轴时「起点为最大值」(顶部/左侧最饱和/最亮,inverted);
 * ValueSaturation/SaturationValue 的饱和度轴保持「起点为最小值」,与源一致。
 */
export function boxSpectrumLayout(
  components: WuiSpectrumComponents,
  bounds: WuiHsvBounds = DEFAULT_HSV_BOUNDS,
): WuiSpectrumLayout {
  switch (components) {
    case 'HueSaturation':
      return {
        axisA: axisOf('hue', bounds, false),
        axisB: axisOf('saturation', bounds, true),
        third: 'value',
      }
    case 'SaturationHue':
      return {
        axisA: axisOf('saturation', bounds, true),
        axisB: axisOf('hue', bounds, false),
        third: 'value',
      }
    case 'HueValue':
      return {
        axisA: axisOf('hue', bounds, false),
        axisB: axisOf('value', bounds, true),
        third: 'saturation',
      }
    case 'ValueHue':
      return {
        axisA: axisOf('value', bounds, true),
        axisB: axisOf('hue', bounds, false),
        third: 'saturation',
      }
    case 'ValueSaturation':
      return {
        axisA: axisOf('value', bounds, true),
        axisB: axisOf('saturation', bounds, false),
        third: 'hue',
      }
    default /* SaturationValue */:
      return {
        axisA: axisOf('saturation', bounds, false),
        axisB: axisOf('value', bounds, true),
        third: 'hue',
      }
  }
}

/**
 * Ring 谱区布局(源 FillPixelForRing + 末段反转块 L1350-1374 + UpdateEllipse L683-759 三方互证):
 * axisA = 角向(f=0 在 3 点钟,顺时针为正),axisB = 径向(f=1 在圆心、0 在圆周)。
 * 源反转块规则:HueSaturation/SaturationHue 族反转 .s,其余反转 .v —— 因此:
 * - HueSaturation:角向色相不反转(3 点钟 = hMin、顺时针递增),径向饱和度反转(圆心 = 最小、圆周 = 最大);
 * - HueValue:角向色相不反转,径向亮度反转(圆心 = 最小、圆周 = 最大);
 * - ValueHue:角向亮度反转(3 点钟 = 最大、顺时针递减),径向色相不反转(圆心 = hMax);
 * - SaturationHue:角向饱和度反转,径向色相不反转(圆心 = hMax);
 * - ValueSaturation:角向亮度反转,径向饱和度不反转(圆心 = 最大、圆周 = 最小);
 * - SaturationValue:角向饱和度不反转(3 点钟 = 最小、顺时针递增),径向亮度反转(圆心 = 最小、圆周 = 最大)。
 * 第三维度通道与 Box 同表(固定 v=1 / 双表面 / 六分色相,见 spectrumThirdMode)。
 */
export function ringSpectrumLayout(
  components: WuiSpectrumComponents,
  bounds: WuiHsvBounds = DEFAULT_HSV_BOUNDS,
): WuiSpectrumLayout {
  const box = boxSpectrumLayout(components, bounds)
  switch (components) {
    case 'HueSaturation':
      return { axisA: axisOf('hue', bounds, false), axisB: axisOf('saturation', bounds, true), third: box.third }
    case 'HueValue':
      return { axisA: axisOf('hue', bounds, false), axisB: axisOf('value', bounds, true), third: box.third }
    case 'ValueHue':
      return { axisA: axisOf('value', bounds, true), axisB: axisOf('hue', bounds, false), third: box.third }
    case 'SaturationHue':
      return { axisA: axisOf('saturation', bounds, true), axisB: axisOf('hue', bounds, false), third: box.third }
    case 'ValueSaturation':
      return { axisA: axisOf('value', bounds, true), axisB: axisOf('saturation', bounds, false), third: box.third }
    default /* SaturationValue */:
      return { axisA: axisOf('saturation', bounds, false), axisB: axisOf('value', bounds, true), third: box.third }
  }
}

/** 第三维度呈现方式(见 WuiSpectrumThirdMode;对照 UpdateColorControls 的表面选择)。 */
export function spectrumThirdMode(components: WuiSpectrumComponents): WuiSpectrumThirdMode {
  switch (components) {
    case 'HueSaturation':
    case 'SaturationHue':
      return 'fixed-max'
    case 'HueValue':
    case 'ValueHue':
      return 'blend'
    default:
      return 'blend6'
  }
}

/** 轴分数(0..1,沿轴起点到终点)→ 通道值。 */
export function fractionToAxisValue(axis: WuiSpectrumAxis, fraction: number): number {
  const f = clamp01(fraction)
  return axis.inverted ? axis.max - f * (axis.max - axis.min) : axis.min + f * (axis.max - axis.min)
}

/** 通道值 → 轴分数(0..1;用于指针定位,值先钳到轴范围)。 */
export function axisValueToFraction(axis: WuiSpectrumAxis, value: number): number {
  const span = axis.max - axis.min
  if (span <= 0) {
    return axis.inverted ? 1 : 0
  }
  const f = (value - axis.min) / span
  return clamp01(axis.inverted ? 1 - f : f)
}

/**
 * 谱区坐标 → 单表面 HSV(源 FillPixelForBox/FillPixelForRing 的每像素公式)。
 * - Box:fA/fB = 横/纵轴分数(0..1);
 * - Ring:fA = 自 3 点钟顺时针角分数,fB = 1 − d/R(圆心 1、边缘 0)。
 * thirdValue:第三维度表面取值('blend' 为 0/1,'blend6' 为六分位色相 0..300,'fixed-max' 恒 1)。
 */
export function spectrumPixelHsv(
  layout: WuiSpectrumLayout,
  fA: number,
  fB: number,
  thirdValue: number,
): WuiHsv {
  const hsv: WuiHsv = { h: 0, s: 0, v: 0 }
  const a = fractionToAxisValue(layout.axisA, fA)
  const b = fractionToAxisValue(layout.axisB, fB)
  if (layout.axisA.channel === 'hue') hsv.h = a
  else if (layout.axisA.channel === 'saturation') hsv.s = a / 100
  else hsv.v = a / 100
  if (layout.axisB.channel === 'hue') hsv.h = b
  else if (layout.axisB.channel === 'saturation') hsv.s = b / 100
  else hsv.v = b / 100
  if (layout.third === 'hue') hsv.h = thirdValue
  else if (layout.third === 'saturation') hsv.s = clamp01(thirdValue)
  else hsv.v = clamp01(thirdValue)
  return hsv
}

/** 当前颜色在第三维度上的取值('blend' 为 0..1,'blend6' 为色相 0..360,'fixed-max' 恒 1)。 */
export function thirdDimensionValue(layout: WuiSpectrumLayout, hsv: WuiHsv): number {
  if (layout.third === 'hue') return hsv.h
  if (layout.third === 'saturation') return clamp01(hsv.s)
  return clamp01(hsv.v)
}

/**
 * 表面合成参数(源 UpdateColorControls):返回底面索引、叠加面索引与叠加透明度。
 * 'blend' 表面索引 0/1 分别为第三维度 0/1 的表面,透明度 = 当前第三维度值;
 * 'blend6' 表面索引为色相六分位(0..5 对应 0..300 度),叠加面按 (索引+1)%6 回绕(源 300° 后回红),
 * 透明度 = h/60 − floor(h/60)。
 */
export function thirdBlendPair(
  layout: WuiSpectrumLayout,
  hsv: WuiHsv,
): { baseIndex: number; overlayIndex: number; alpha: number } {
  if (layout.third === 'hue') {
    const sextant = Math.min(Math.floor(hsv.h / 60), 5)
    return { baseIndex: sextant, overlayIndex: (sextant + 1) % 6, alpha: hsv.h / 60 - sextant }
  }
  return { baseIndex: 0, overlayIndex: 1, alpha: thirdDimensionValue(layout, hsv) }
}

/** 第三维度表面数('fixed-max' 为 1,其余为 2/6)。 */
export function thirdSurfaceCount(mode: WuiSpectrumThirdMode): number {
  if (mode === 'fixed-max') return 1
  return mode === 'blend' ? 2 : 6
}

/** 'blend6' 第 i 张表面的固定色相(0..300);其余模式无此概念,返回 null。 */
export function thirdSurfaceHue(mode: WuiSpectrumThirdMode, index: number): number | null {
  return mode === 'blend6' ? index * 60 : null
}

/**
 * 谱区键盘小步(源 IncrementColorChannel 的 amount == Small 分支):通道值 ±1,越界时
 * 恰在边界上则回绕到另一端,否则钳到边界。(源的大步分支走 FindNextNamedColor,见下。)
 */
export function incrementChannel(
  current: number,
  direction: 1 | -1,
  min: number,
  max: number,
): number {
  const next = current + direction
  if (next < min) {
    return current === min && min !== max ? max : min
  }
  if (next > max) {
    return current === max && min !== max ? min : max
  }
  return next
}

/* =====================================================================================
 * 命名色跳转(源 IncrementColorChannel 的 amount == Large 分支 → FindNextNamedColor)。
 * 语义:沿通道方向按小步(色相 1°、饱和度/亮度 0.01)迭代,直到颜色「显示名」发生变化,
 * 再迭代到该名字区间的另一端,取区间中点(并对齐到步长栅格、回绕进边界)。
 * Web 侧用 CSS 命名色表(147 个关键字)做最近邻 RGB 匹配近似 WinUI 的 ToDisplayName
 * (后者为本地化命名表,集合相近;近似影响仅在大步落点上,见 wiki 差异)。
 * =================================================================================== */

/** CSS 命名色表(按字母序;RGB 相同的同义词仅保留首个,最近邻结果不受影响)。 */
const CSS_NAMED_COLORS: ReadonlyArray<readonly [name: string, r: number, g: number, b: number]> = [
  ['aliceblue', 240, 248, 255],
  ['antiquewhite', 250, 235, 215],
  ['aqua', 0, 255, 255],
  ['aquamarine', 127, 255, 212],
  ['azure', 240, 255, 255],
  ['beige', 245, 245, 220],
  ['bisque', 255, 228, 196],
  ['black', 0, 0, 0],
  ['blanchedalmond', 255, 235, 205],
  ['blue', 0, 0, 255],
  ['blueviolet', 138, 43, 226],
  ['brown', 165, 42, 42],
  ['burlywood', 222, 184, 135],
  ['cadetblue', 95, 158, 160],
  ['chartreuse', 127, 255, 0],
  ['chocolate', 210, 105, 30],
  ['coral', 255, 127, 80],
  ['cornflowerblue', 100, 149, 237],
  ['cornsilk', 255, 248, 220],
  ['crimson', 220, 20, 60],
  ['darkblue', 0, 0, 139],
  ['darkcyan', 0, 139, 139],
  ['darkgoldenrod', 184, 134, 11],
  ['darkgray', 169, 169, 169],
  ['darkgreen', 0, 100, 0],
  ['darkkhaki', 189, 183, 107],
  ['darkmagenta', 139, 0, 139],
  ['darkolivegreen', 85, 107, 47],
  ['darkorange', 255, 140, 0],
  ['darkorchid', 153, 50, 204],
  ['darkred', 139, 0, 0],
  ['darksalmon', 233, 150, 122],
  ['darkseagreen', 143, 188, 143],
  ['darkslateblue', 72, 61, 139],
  ['darkslategray', 47, 79, 79],
  ['darkturquoise', 0, 206, 209],
  ['darkviolet', 148, 0, 211],
  ['deeppink', 255, 20, 147],
  ['deepskyblue', 0, 191, 255],
  ['dimgray', 105, 105, 105],
  ['dodgerblue', 30, 144, 255],
  ['firebrick', 178, 34, 34],
  ['floralwhite', 255, 250, 240],
  ['forestgreen', 34, 139, 34],
  ['gainsboro', 220, 220, 220],
  ['ghostwhite', 248, 248, 255],
  ['gold', 255, 215, 0],
  ['goldenrod', 218, 165, 32],
  ['gray', 128, 128, 128],
  ['green', 0, 128, 0],
  ['greenyellow', 173, 255, 47],
  ['honeydew', 240, 255, 240],
  ['hotpink', 255, 105, 180],
  ['indianred', 205, 92, 92],
  ['indigo', 75, 0, 130],
  ['ivory', 255, 255, 240],
  ['khaki', 240, 230, 140],
  ['lavender', 230, 230, 250],
  ['lavenderblush', 255, 240, 245],
  ['lawngreen', 124, 252, 0],
  ['lemonchiffon', 255, 250, 205],
  ['lightblue', 173, 216, 230],
  ['lightcoral', 240, 128, 128],
  ['lightcyan', 224, 255, 255],
  ['lightgoldenrodyellow', 250, 250, 210],
  ['lightgray', 211, 211, 211],
  ['lightgreen', 144, 238, 144],
  ['lightpink', 255, 182, 193],
  ['lightsalmon', 255, 160, 122],
  ['lightseagreen', 32, 178, 170],
  ['lightskyblue', 135, 206, 250],
  ['lightslategray', 119, 136, 153],
  ['lightsteelblue', 176, 196, 222],
  ['lightyellow', 255, 255, 224],
  ['lime', 0, 255, 0],
  ['limegreen', 50, 205, 50],
  ['linen', 250, 240, 230],
  ['maroon', 128, 0, 0],
  ['mediumaquamarine', 102, 205, 170],
  ['mediumblue', 0, 0, 205],
  ['mediumorchid', 186, 85, 211],
  ['mediumpurple', 147, 112, 219],
  ['mediumseagreen', 60, 179, 113],
  ['mediumslateblue', 123, 104, 238],
  ['mediumspringgreen', 0, 250, 154],
  ['mediumturquoise', 72, 209, 204],
  ['mediumvioletred', 199, 21, 133],
  ['midnightblue', 25, 25, 112],
  ['mintcream', 245, 255, 250],
  ['mistyrose', 255, 228, 225],
  ['moccasin', 255, 228, 181],
  ['navajowhite', 255, 222, 173],
  ['navy', 0, 0, 128],
  ['oldlace', 253, 245, 230],
  ['olive', 128, 128, 0],
  ['olivedrab', 107, 142, 35],
  ['orange', 255, 165, 0],
  ['orangered', 255, 69, 0],
  ['orchid', 218, 112, 214],
  ['palegoldenrod', 238, 232, 170],
  ['palegreen', 152, 251, 152],
  ['paleturquoise', 175, 238, 238],
  ['palevioletred', 219, 112, 147],
  ['papayawhip', 255, 239, 213],
  ['peachpuff', 255, 218, 185],
  ['peru', 205, 133, 63],
  ['pink', 255, 192, 203],
  ['plum', 221, 160, 221],
  ['powderblue', 176, 224, 230],
  ['purple', 128, 0, 128],
  ['rebeccapurple', 102, 51, 153],
  ['red', 255, 0, 0],
  ['rosybrown', 188, 143, 143],
  ['royalblue', 65, 105, 225],
  ['saddlebrown', 139, 69, 19],
  ['salmon', 250, 128, 114],
  ['sandybrown', 244, 164, 96],
  ['seagreen', 46, 139, 87],
  ['seashell', 255, 245, 238],
  ['sienna', 160, 82, 45],
  ['silver', 192, 192, 192],
  ['skyblue', 135, 206, 235],
  ['slateblue', 106, 90, 205],
  ['slategray', 112, 128, 144],
  ['snow', 255, 250, 250],
  ['springgreen', 0, 255, 127],
  ['steelblue', 70, 130, 180],
  ['tan', 210, 180, 140],
  ['teal', 0, 128, 128],
  ['thistle', 216, 191, 216],
  ['tomato', 255, 99, 71],
  ['turquoise', 64, 224, 208],
  ['violet', 238, 130, 238],
  ['wheat', 245, 222, 179],
  ['white', 255, 255, 255],
  ['whitesmoke', 245, 245, 245],
  ['yellow', 255, 255, 0],
  ['yellowgreen', 154, 205, 50],
]

/** RGB → 最近邻 CSS 命名色名(欧氏距离;平局取表序在前者,确定性)。 */
export function toColorDisplayName(rgb: WuiRgb): string {
  const r = roundToByte(rgb.r)
  const g = roundToByte(rgb.g)
  const b = roundToByte(rgb.b)
  let bestName = CSS_NAMED_COLORS[0]![0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [name, nr, ng, nb] of CSS_NAMED_COLORS) {
    const distance = (r - nr) * (r - nr) + (g - ng) * (g - ng) + (b - nb) * (b - nb)
    if (distance < bestDistance) {
      bestDistance = distance
      bestName = name
    }
  }
  return bestName
}

function signOf(value: number): number {
  return value > 0 ? 1 : value < 0 ? -1 : 0
}

/**
 * 命名色大步跳转(源 ColorHelpers.cpp FindNextNamedColor 的逐行移植;shouldWrap 恒为 true,
 * 与 ColorSpectrum 键盘路径一致)。通道单位:hue 为度、saturation/value 为 0..1。
 * 退化范围(min >= max)与防死循环上限下直接原样返回。
 */
export function findNextNamedColor(
  hsv: WuiHsv,
  channel: WuiSpectrumChannel,
  direction: 1 | -1,
  min: number,
  max: number,
): WuiHsv {
  const result: WuiHsv = { h: hsv.h, s: hsv.s, v: hsv.v }
  if (max <= min) {
    return result
  }
  const step = channel === 'hue' ? 1 : 0.01
  const wrapIncrement = channel === 'hue' ? 360 : 1
  const get = (value: WuiHsv): number => (channel === 'hue' ? value.h : channel === 'saturation' ? value.s : value.v)
  const set = (value: WuiHsv, next: number): void => {
    if (channel === 'hue') value.h = next
    else if (channel === 'saturation') value.s = next
    else value.v = next
  }
  const nameOf = (value: WuiHsv): string => toColorDisplayName(hsvToRgb(value))
  // 防御性上限:全圆回绕最多 360(hue)/ 100(s/v)步,1000 已远超;触顶即放弃跳转
  const MAX_ITERATIONS = 1000

  const originalName = nameOf(result)
  const originalValue = get(result)
  let newName = originalName
  let shouldFindMidPoint = true
  let iterations = 0

  // 阶段一:沿方向步进,直到名字变化(回绕时把 startEndOffset 记在阶段二)
  while (newName === originalName) {
    if (iterations++ > MAX_ITERATIONS) return hsv
    const previousValue = get(result)
    set(result, previousValue + direction * step)
    let justWrapped = false
    if (get(result) > max) {
      set(result, min)
      justWrapped = true
    } else if (get(result) < min) {
      set(result, max)
      justWrapped = true
    }
    if (
      !justWrapped &&
      previousValue !== originalValue &&
      signOf(get(result) - originalValue) !== signOf(previousValue - originalValue)
    ) {
      // 绕整整一圈都没有新名字(如纯灰调色相),源实现同样放弃跳转
      shouldFindMidPoint = false
      break
    }
    newName = nameOf(result)
  }

  // 阶段二:继续步进到该名字区间另一端,取中点并对齐步长栅格
  if (shouldFindMidPoint) {
    const startValue = get(result)
    let currentValue = startValue
    let currentName = newName
    let startEndOffset = 0
    while (newName === currentName) {
      if (iterations++ > MAX_ITERATIONS) return hsv
      currentValue += direction * step
      if (currentValue > max) {
        currentValue = min
        startEndOffset = max - min
      } else if (currentValue < min) {
        currentValue = max
        startEndOffset = min - max
      }
      currentName = nameOf({ h: result.h, s: result.s, v: result.v, ...channelDraft(channel, currentValue) })
    }
    let next = (startValue + currentValue + startEndOffset) / 2
    // 对齐到步长栅格(源:减去不足一步的零头)
    let leftover = Math.abs(next)
    while (leftover > step) {
      leftover -= step
    }
    next -= leftover
    while (next < min) {
      next += wrapIncrement
    }
    while (next > max) {
      next -= wrapIncrement
    }
    set(result, next)
  }

  return result
}

/** 构造仅改写单个通道的草稿 HSV(供命名色求值)。 */
function channelDraft(channel: WuiSpectrumChannel, value: number): Partial<WuiHsv> {
  if (channel === 'hue') return { h: value }
  if (channel === 'saturation') return { s: value }
  return { v: value }
}
