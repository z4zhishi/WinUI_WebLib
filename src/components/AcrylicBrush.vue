<script lang="ts">
// AcrylicBrush(WinUI 3 画刷):类型、混色数学与 useAcrylic 组合式函数对外导出,
// 模式同 RadialGradientBrush.vue / Line.vue(SFC 双 script 块)。
// 对照 CK/WinUI-Reference/controls/dev/Materials/Acrylic/(AcrylicBrush.cpp / AcrylicBrush.h /
// AcrylicBrush_themeresources.xaml):in-app acrylic 的 Luminosity 配方逐行移植为纯函数,
// 渲染栈映射为 CSS backdrop-filter + mix-blend-mode 分层(语义对照见 wiki/controls/Acrylic.md)。
import { computed, toValue } from 'vue'
import type { ComputedRef, CSSProperties, MaybeRefOrGetter } from 'vue'

/** sRGB 颜色(通道 0–255,alpha 0–1),混色数学的内部表示。 */
export interface WuiAcrylicRgba {
  r: number
  g: number
  b: number
  a: number
}

/** HSV 颜色(h 0–360,s/v 0–1),WinUI 源码 Hsv 结构体对应。 */
export interface WuiAcrylicHsv {
  h: number
  s: number
  v: number
}

// —— WinUI 源码常量(CK/WinUI-Reference/controls/dev/Materials/Acrylic/AcrylicBrush.h)——
/** 高斯模糊半径:sc_blurRadius = 30.0f(源码硬编码,非公开属性)。 */
export const ACRYLIC_BLUR_RADIUS_PX = 30
/** 背景饱和度:sc_saturation = 1.25f(官方材质文档即 saturate(125%);该常量在 in-app 效果图未接线,Web 侧按材质文档应用于 backdrop,见 wiki 差异节)。 */
export const ACRYLIC_SATURATION = 1.25
/** 噪点图层不透明度:sc_noiseOpacity = 0.02f(WinUI 用私有 noise 贴图,Web 侧用内联 SVG feTurbulence 近似)。 */
export const ACRYLIC_NOISE_OPACITY = 0.02
/** 默认 TintColor:sc_defaultTintColor {A:204, R:255, G:255, B:255},XAML 字节序 #AARRGGBB → Web #RRGGBBAA 即 rgba(255,255,255,0.8)。 */
export const ACRYLIC_DEFAULT_TINT_COLOR = 'rgba(255, 255, 255, 0.8)'
/** 默认 TintOpacity:sc_defaultTintOpacity = 1.0。 */
export const ACRYLIC_DEFAULT_TINT_OPACITY = 1
/** 默认 TintTransitionDuration:sc_defaultTintTransitionDuration = 500ms(tint/luminosity 颜色变化的动画时长)。 */
export const ACRYLIC_DEFAULT_TRANSITION_MS = 500

/** useAcrylic / acrylicToLayers 的输入(WinUI AcrylicBrush 属性面;缺省值与 WinUI 默认一致)。 */
export interface AcrylicBrushOptions {
  /** 着色(WinUI TintColor);任意 CSS 颜色(可解析时走完整混色数学,var() 等走 color-mix 兜底层)。XAML 颜色为 #AARRGGBB 字节序,转 Web 需换成 #RRGGBBAA / rgba()。 */
  tintColor?: string
  /** 着色不透明度(WinUI TintOpacity,0–1,越界钳制)。 */
  tintOpacity?: number
  /** 亮度层不透明度(WinUI TintLuminosityOpacity,可空);null = 未设置,按 WinUI 公式从 TintColor/TintOpacity 自动推导。 */
  tintLuminosityOpacity?: number | null
  /** 降级色(WinUI FallbackColor,继承自 XamlCompositionBrushBase;WinUI 默认透明)。backdrop-filter 不可用或 alwaysUseFallback 时整面显示该纯色。 */
  fallbackColor?: string
  /** 恒用降级(WinUI AlwaysUseFallback):true 时跳过亚克力效果,渲染 fallbackColor 纯色。 */
  alwaysUseFallback?: boolean
  /** tint/luminosity 颜色变化过渡时长 ms(WinUI TintTransitionDuration,默认 500),落到图层 background-color 的 CSS transition。 */
  tintTransitionDuration?: number
  /** 画刷不透明度(WinUI Brush.Opacity,0–1)。 */
  opacity?: number
}

/** 一次求值得到的渲染分层(WinUI 效果图各步骤 → CSS 各层;demo 页用作参数读出)。 */
export interface AcrylicLayers {
  /** 是否降级模式(AlwaysUseFallback 为 true;浏览器支持性由组件运行时另行合并)。 */
  isFallback: boolean
  /** 背景滤镜串(根元素 backdrop-filter;降级时 'none')。 */
  backdropFilter: string
  /** 亮度层颜色(WinUI「Luminosity blend」输入色:RGB 取 TintColor、A 取亮度不透明度;mix-blend-mode: luminosity)。 */
  luminosityColor: string
  /** 着色层颜色(WinUI GetEffectiveTintColor 结果:含 opacity 抑制系数;mix-blend-mode: color)。 */
  tintColor: string
  /** 降级纯色(FallbackColor 原样输出)。 */
  fallbackColor: string
  /** 是否绘制噪点图层(WinUI 效果图 Composite 最上层的 noise,2% 不透明度)。 */
  noiseVisible: boolean
}

/** clamp 到 [0,1](WinUI CoerceToZeroOneRange 语义)。 */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

/**
 * 命名色子集(官方示例用色 + 常用 CSS 命名色,XAML 命名同名)。
 * 未收录的颜色名 / var() 等不可解析输入走 color-mix 兜底层(见 acrylicToLayers)。
 */
const NAMED_COLORS: Readonly<Record<string, string>> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  magenta: '#ff00ff',
  aqua: '#00ffff',
  cyan: '#00ffff',
  skyblue: '#87ceeb',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  gold: '#ffd700',
  teal: '#008080',
  navy: '#000080',
  lime: '#00ff00',
  brown: '#a52a2a',
  transparent: 'transparent',
}

/** 解析 16 进制颜色(#RGB/#RGBA/#RRGGBB/#RRGGBBAA;Web 字节序 RRGGBBAA)。 */
function parseHex(body: string): WuiAcrylicRgba | null {
  const expand = (pair: string): number => Number.parseInt(pair, 16)
  if (body.length === 3 || body.length === 4) {
    const [r, g, b, a] = body.split('')
    const alpha = a !== undefined ? expand(a + a) : 255
    return { r: expand(r + r), g: expand(g + g), b: expand(b + b), a: alpha / 255 }
  }
  if (body.length === 6 || body.length === 8) {
    return {
      r: expand(body.slice(0, 2)),
      g: expand(body.slice(2, 4)),
      b: expand(body.slice(4, 6)),
      a: (body.length === 8 ? expand(body.slice(6, 8)) : 255) / 255,
    }
  }
  return null
}

/** 解析 rgb()/rgba() 函数串(逗号 legacy 写法与空格 + 斜杠 modern 写法都收;支持 %)。 */
function parseRgbFunction(body: string): WuiAcrylicRgba | null {
  const parts = body.includes(',') ? body.split(',') : body.split('/')
  let channels: string[]
  let alphaToken: string | undefined
  if (body.includes(',')) {
    if (parts.length < 3 || parts.length > 4) return null
    channels = parts.slice(0, 3)
    alphaToken = parts[3]
  } else {
    const slash = body.split('/')
    if (slash.length > 2) return null
    channels = (slash[0] ?? '').trim().split(/\s+/)
    alphaToken = slash[1]?.trim()
    if (channels.length !== 3) return null
  }
  const channel = (token: string): number | null => {
    const text = token.trim()
    if (text.endsWith('%')) {
      const pct = Number.parseFloat(text)
      return Number.isFinite(pct) ? (pct / 100) * 255 : null
    }
    const num = Number.parseFloat(text)
    return Number.isFinite(num) ? num : null
  }
  const r = channel(channels[0] ?? '')
  const g = channel(channels[1] ?? '')
  const b = channel(channels[2] ?? '')
  if (r === null || g === null || b === null) return null
  let a = 1
  if (alphaToken !== undefined && alphaToken !== '') {
    const parsed =
      alphaToken.endsWith('%') ? Number.parseFloat(alphaToken) / 100 : Number.parseFloat(alphaToken)
    if (!Number.isFinite(parsed)) return null
    a = parsed
  }
  return {
    r: Math.min(255, Math.max(0, Math.round(r))),
    g: Math.min(255, Math.max(0, Math.round(g))),
    b: Math.min(255, Math.max(0, Math.round(b))),
    a: clamp01(a),
  }
}

/**
 * 解析 CSS 颜色为 sRGB(纯函数;hex / rgb() / rgba() / 命名色子集 / transparent)。
 * 解析失败返回 null —— acrylicToLayers 对 null 走 color-mix 兜底渲染层。
 */
export function parseCssColor(input: string): WuiAcrylicRgba | null {
  const value = input.trim().toLowerCase()
  if (value === '') return null
  if (value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  if (value.startsWith('#')) return parseHex(value.slice(1))
  const fnMatch = /^rgba?\(([^)]+)\)$/.exec(value)
  if (fnMatch) return parseRgbFunction(fnMatch[1] ?? '')
  const named = NAMED_COLORS[value]
  if (named !== undefined) return named === 'transparent' ? { r: 0, g: 0, b: 0, a: 0 } : parseCssColor(named)
  return null
}

/** RGB → HSV(WinUI ColorConversion.cpp 的 RgbToHsv 同口径)。 */
export function rgbToHsv(color: Omit<WuiAcrylicRgba, 'a'>): WuiAcrylicHsv {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : delta / max
  return { h, s, v: max }
}

/** HSV → RGB(WinUI ColorConversion.cpp 的 HsvToRgb 同口径)。 */
export function hsvToRgb(hsv: WuiAcrylicHsv): Omit<WuiAcrylicRgba, 'a'> {
  const c = hsv.v * hsv.s
  const hPrime = hsv.h / 60
  const x = c * (1 - Math.abs((hPrime % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hPrime < 1) [r, g, b] = [c, x, 0]
  else if (hPrime < 2) [r, g, b] = [x, c, 0]
  else if (hPrime < 3) [r, g, b] = [0, c, x]
  else if (hPrime < 4) [r, g, b] = [0, x, c]
  else if (hPrime < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const m = hsv.v - c
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

/** WuiAcrylicRgba → 'rgba(r, g, b, a)' 串(alpha 保留 4 位小数)。 */
function rgbaToCss(color: WuiAcrylicRgba): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.round(color.a * 10000) / 10000})`
}

/** 0–1 → 百分比串(去浮点噪声),供 color-mix 的 alpha 百分比。 */
function toPercent(value: number): string {
  return `${Math.round(clamp01(value) * 100000) / 1000}%`
}

/**
 * 兜底层:任意 CSS 颜色(含 var())叠 alpha 用 color-mix(in srgb, c X%, transparent)
 * 等价 rgba(c, X);解析不出 RGB 时拿不到通道,只能这样叠加。
 */
function colorMixAlpha(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${toPercent(alpha)}, transparent)`
}

/**
 * GetTintOpacityModifier 的逐行移植(AcrylicBrush.cpp):
 * 未显式设置 TintLuminosityOpacity 时,按 TintColor 的亮度/饱和度抑制最大着色不透明度 ——
 * 纯白 100% 亮度下 100% 抑制到 45%、纯黑 0% 亮度 85%、中灰 50% 亮度 90%,随亮度偏离 50%
 * 线性增强,再随饱和度线性抵消。返回值乘进 tint 的 alpha。
 */
export function getTintOpacityModifier(tintColor: WuiAcrylicRgba): number {
  const midPoint = 0.5
  const whiteMaxOpacity = 0.45
  const midPointMaxOpacity = 0.9
  const blackMaxOpacity = 0.85

  const { s, v } = rgbToHsv(tintColor)
  let opacityModifier = midPointMaxOpacity

  if (v !== midPoint) {
    let lowestMaxOpacity = midPointMaxOpacity
    let maxDeviation = midPoint
    if (v > midPoint) {
      lowestMaxOpacity = whiteMaxOpacity
      maxDeviation = 1 - midPoint
    } else if (v < midPoint) {
      lowestMaxOpacity = blackMaxOpacity
    }
    let maxOpacitySuppression = midPointMaxOpacity - lowestMaxOpacity
    if (s > 0) maxOpacitySuppression *= Math.max(1 - s * 2, 0)
    const deviation = Math.abs(v - midPoint)
    const normalizedDeviation = deviation / maxDeviation
    const opacitySuppression = maxOpacitySuppression * normalizedDeviation
    opacityModifier = midPointMaxOpacity - opacitySuppression
  }
  return opacityModifier
}

/**
 * GetLuminosityColor 的逐行移植(AcrylicBrush.cpp):
 * 显式设置亮度不透明度 → 直接用(TintColor 的 RGB + 该 alpha);
 * 未设置 → TintColor 转 HSV,把 V 钳制到 [0.125, 0.965] 后转回 RGB,alpha 按
 * (A × (1.03 − 0.15)) + 0.15 推导并钳到 ≤ 1。入参 alpha 应已乘过 TintOpacity。
 */
export function getLuminosityColor(
  tintColor: WuiAcrylicRgba,
  luminosityOpacity: number | null,
): WuiAcrylicRgba {
  if (luminosityOpacity !== null) {
    return { r: tintColor.r, g: tintColor.g, b: tintColor.b, a: clamp01(luminosityOpacity) }
  }
  const minHsvV = 0.125
  const maxHsvV = 0.965
  const minLuminosityOpacity = 0.15
  const maxLuminosityOpacity = 1.03
  const hsv = rgbToHsv(tintColor)
  const clampedV = Math.min(maxHsvV, Math.max(minHsvV, hsv.v))
  const luminosityRgb = hsvToRgb({ h: hsv.h, s: hsv.s, v: clampedV })
  const mapped = tintColor.a * (maxLuminosityOpacity - minLuminosityOpacity) + minLuminosityOpacity
  return { r: luminosityRgb.r, g: luminosityRgb.g, b: luminosityRgb.b, a: Math.min(mapped, 1) }
}

/** backdrop-filter 串:blur(30px) saturate(125%)(sc_blurRadius / sc_saturation 源码常量)。 */
export function acrylicBackdropFilter(): string {
  return `blur(${ACRYLIC_BLUR_RADIUS_PX}px) saturate(${Math.round(ACRYLIC_SATURATION * 100)}%)`
}

/**
 * WinUI AcrylicBrush → CSS 渲染分层(纯函数)。
 * 映射口径(对照 AcrylicBrush.cpp 的 Luminosity 配方效果图,由下至上):
 *   1. backdrop:backdrop over opaque FallbackColor → GaussianBlur(30) → CSS 为根元素
 *      `backdrop-filter: blur(30px) saturate(125%)`(saturate 按官方材质文档补上,见常量注释);
 *   2. Luminosity blend: BlendEffectMode::Color(源码注明 Luminosity/Color 命名互调的 bug,
 *      实际语义 = 亮度取自纯色层、色相/饱和度取自模糊背景)→ CSS `mix-blend-mode: luminosity`
 *      + 亮度层颜色(与 WinUI 同源同值);
 *   3. Color blend(tint):BlendEffectMode::Luminosity(同样命名互调,实际 = 色相/饱和度取自
 *      TintColor、亮度取自下层)→ CSS `mix-blend-mode: color` + GetEffectiveTintColor 结果;
 *   4. noise 2%:根元素 feTurbulence SVG 背景近似(WinUI 为私有贴图)。
 * 降级(AlwaysUseFallback)= WinUI CrossFadeEffect 全量淡到 FallbackColor 纯色。
 * TintColor 无法解析(var() 等)时降为 color-mix 叠 alpha 的近似层(无抑制系数/HSV 钳制)。
 */
export function acrylicToLayers(options: AcrylicBrushOptions): AcrylicLayers {
  const tintColor = options.tintColor ?? ACRYLIC_DEFAULT_TINT_COLOR
  const tintOpacity = clamp01(options.tintOpacity ?? ACRYLIC_DEFAULT_TINT_OPACITY)
  // undefined 与 null 都表示「未设置」(WinUI TintLuminosityOpacity 为 IReference<double>,可空);
  // 显式数字(含 0)才参与 clamp —— 0 是合法值(亮度层全透明)。
  const tintLuminosityOpacity =
    options.tintLuminosityOpacity === undefined || options.tintLuminosityOpacity === null
      ? null
      : clamp01(options.tintLuminosityOpacity)
  const fallbackColor = options.fallbackColor ?? 'transparent'

  if (options.alwaysUseFallback === true) {
    return {
      isFallback: true,
      backdropFilter: 'none',
      luminosityColor: 'transparent',
      tintColor: 'transparent',
      fallbackColor,
      noiseVisible: false,
    }
  }

  const parsedTint = parseCssColor(tintColor)
  if (!parsedTint) {
    // 兜底层:无法解析的 CSS 颜色(var() / 未收录命名色)。alpha 叠加用 color-mix;
    // 亮度层按「不透明 TintColor」假设推导(0.88 × opacity + 0.15,来自 WinUI 公式的 A=1 特例)。
    const assumedLuminosityOpacity = Math.min(1, tintOpacity * 0.88 + 0.15)
    return {
      isFallback: false,
      backdropFilter: acrylicBackdropFilter(),
      luminosityColor: colorMixAlpha(tintColor, assumedLuminosityOpacity),
      tintColor: colorMixAlpha(tintColor, tintOpacity),
      fallbackColor,
      noiseVisible: true,
    }
  }

  const hasExplicitLuminosity = tintLuminosityOpacity !== null
  // GetEffectiveTintColor:tint.A = A × TintOpacity(× modifier;显式设置亮度不透明度时不干预用户参数)
  const effectiveAlpha = hasExplicitLuminosity
    ? parsedTint.a * tintOpacity
    : parsedTint.a * tintOpacity * getTintOpacityModifier(parsedTint)
  const effectiveTint: WuiAcrylicRgba = { ...parsedTint, a: effectiveAlpha }
  // GetEffectiveLuminosityColor:先 A × TintOpacity,再推导亮度色(显式值则原样用 RGB)
  const baseTint: WuiAcrylicRgba = { ...parsedTint, a: parsedTint.a * tintOpacity }
  const luminosity = getLuminosityColor(baseTint, tintLuminosityOpacity)

  return {
    isFallback: false,
    backdropFilter: acrylicBackdropFilter(),
    luminosityColor: rgbaToCss(luminosity),
    tintColor: rgbaToCss(effectiveTint),
    fallbackColor,
    noiseVisible: true,
  }
}

/**
 * useAcrylic:把画刷描述转成 CSS 分层的响应式组合式函数,供其他控件把亚克力面当背景用
 * (组件 = 渲染好的分层 div;本函数 = 只取分层颜色自行拼装)。接受普通对象或 getter/ref。
 */
export function useAcrylic(source: MaybeRefOrGetter<AcrylicBrushOptions>): ComputedRef<AcrylicLayers> {
  return computed(() => acrylicToLayers(toValue(source)))
}

let backdropFilterSupport: boolean | undefined

/** 运行时探测 backdrop-filter 支持(false 时组件自动进入 FallbackColor 纯色降级)。 */
export function supportsAcrylic(): boolean {
  if (backdropFilterSupport === undefined) {
    backdropFilterSupport =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      (CSS.supports('backdrop-filter', 'blur(1px)') ||
        CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))
  }
  return backdropFilterSupport
}
</script>

<script setup lang="ts">
// AcrylicBrush —— WinUI AcrylicBrush 的 Web 复刻:渲染为「backdrop-filter 毛玻璃 + 亮度/着色
// 混色层」的面板 div,可直接当面板背景使用(官方示例用它填充 Rectangle,透出其后的彩色图形)。
// 对照 CK/WinUI-Reference/controls/dev/Materials/Acrylic/:
//   - TintColor / TintOpacity / TintLuminosityOpacity / FallbackColor / AlwaysUseFallback /
//     TintTransitionDuration 与 WinUI 同名同默认(见上方常量注释,含 #AARRGGBB → rgba 换算);
//   - 效果图配方(blur 30 → luminosity blend → color blend → noise)映射为:
//     根元素 backdrop-filter + 噪点背景 → __luminosity 子元素(mix-blend-mode: luminosity)
//     → ::after 着色层(mix-blend-mode: color),层序与 WinUI 一致;
//   - Brush 非 UIElement:无模板、无视觉状态、无业务事件(generic.xaml 无 AcrylicBrush 样式)。
// (vue 导入统一放在上方普通 script 块,SFC 双 script 块共享模块作用域,避免重复导入。)

defineOptions({ inheritAttrs: false, name: 'WuiAcrylicBrush' })

const props = withDefaults(
  defineProps<{
    /** 着色(WinUI TintColor;任意 CSS 颜色,XAML #AARRGGBB 请换算为 #RRGGBBAA / rgba())。 */
    tintColor?: string
    /** 着色不透明度(WinUI TintOpacity,0–1)。 */
    tintOpacity?: number
    /** 亮度层不透明度(WinUI TintLuminosityOpacity;null = 未设置,按 WinUI 公式自动推导)。 */
    tintLuminosityOpacity?: number | null
    /** 降级色(WinUI FallbackColor;默认透明,与 XamlCompositionBrushBase 一致)。 */
    fallbackColor?: string
    /** 恒用降级(WinUI AlwaysUseFallback):整面渲染 FallbackColor 纯色。 */
    alwaysUseFallback?: boolean
    /** 颜色变化过渡时长 ms(WinUI TintTransitionDuration,默认 500)。 */
    tintTransitionDuration?: number
    /** 画刷不透明度(WinUI Brush.Opacity,0–1)。 */
    opacity?: number
  }>(),
  {
    tintColor: ACRYLIC_DEFAULT_TINT_COLOR,
    tintOpacity: ACRYLIC_DEFAULT_TINT_OPACITY,
    tintLuminosityOpacity: null,
    fallbackColor: 'transparent',
    alwaysUseFallback: false,
    tintTransitionDuration: ACRYLIC_DEFAULT_TRANSITION_MS,
    opacity: 1,
  },
)

// 运行时支持性探测(模块级 memo):不支持 backdrop-filter 的环境自动落入降级纯色。
const acrylicSupported = supportsAcrylic()

// 渲染分层:所有绘制颜色经 useAcrylic 响应式求值(与导出的组合式函数同一实现)。
const layers = useAcrylic(() => ({
  tintColor: props.tintColor,
  tintOpacity: props.tintOpacity,
  tintLuminosityOpacity: props.tintLuminosityOpacity,
  fallbackColor: props.fallbackColor,
  alwaysUseFallback: props.alwaysUseFallback,
}))

// 降级 = 显式 AlwaysUseFallback 或环境不支持 backdrop-filter(此时 acrylicToLayers 的亚克力
// 颜色不再上屏,由 CSS 类切换到 fallbackColor 纯色)。
const isFallback = computed(() => props.alwaysUseFallback || !acrylicSupported)

// 分层颜色经 CSS 自定义属性下发到伪元素/子元素(避免行内样式直写伪元素);
// 颜色变化带 transition(TintTransitionDuration → CSS transition-duration)。
const rootStyle = computed<CSSProperties>(() => ({
  opacity: clamp01(props.opacity),
  '--wui-acrylic-luminosity': layers.value.luminosityColor,
  '--wui-acrylic-tint': layers.value.tintColor,
  '--wui-acrylic-fallback': layers.value.fallbackColor,
  '--wui-acrylic-transition': `${Math.max(0, props.tintTransitionDuration)}ms`,
}))
</script>

<template>
  <!-- 画刷非 Control:无模板与视觉状态;class/style/事件经 $attrs 透传到根 div,
       缺省 200×200 对齐官方示例的 Rectangle,可被调用方 style/class 覆盖 -->
  <div
    v-bind="$attrs"
    class="wui-acrylic-brush"
    :class="{ 'wui-acrylic-brush--fallback': isFallback }"
    :style="rootStyle"
  >
    <i class="wui-acrylic-brush__luminosity" aria-hidden="true" />
  </div>
</template>

<style scoped>
/* 画刷表面:backdrop-filter 直接作用于根元素 —— 滤镜结果画在自身背景/内容之下,
   子层用 mix-blend-mode 与之混色(root 由 backdrop-filter 形成独立层叠上下文,混色不外溢)。 */
.wui-acrylic-brush {
  position: relative;
  display: block;
  width: 200px;
  height: 200px;
  overflow: hidden;
  isolation: isolate;
  -webkit-backdrop-filter: blur(30px) saturate(125%);
  backdrop-filter: blur(30px) saturate(125%);
  /* WinUI 噪点图层(sc_noiseOpacity = 0.02):内联 SVG feTurbulence 灰度噪点,
     2% 不透明度写进 SVG 自身;降级模式下由下方规则关掉。 */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
  background-repeat: repeat;
}

/* 亮度层(WinUI Luminosity blend:亮度取自纯色层、色相/饱和度取自模糊背景)。 */
.wui-acrylic-brush__luminosity {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-color: var(--wui-acrylic-luminosity);
  mix-blend-mode: luminosity;
  pointer-events: none;
  transition: background-color var(--wui-acrylic-transition, 500ms) ease;
}

/* 着色层(WinUI Color blend:色相/饱和度取自 TintColor、亮度取自下层结果)。 */
.wui-acrylic-brush::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  background-color: var(--wui-acrylic-tint);
  mix-blend-mode: color;
  pointer-events: none;
  transition: background-color var(--wui-acrylic-transition, 500ms) ease;
}

/* 降级(AlwaysUseFallback):CrossFadeEffect 全量淡到 FallbackColor —— 纯色面,无滤镜/噪点。 */
.wui-acrylic-brush--fallback {
  background-image: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  background-color: var(--wui-acrylic-fallback, transparent);
}

.wui-acrylic-brush--fallback .wui-acrylic-brush__luminosity,
.wui-acrylic-brush--fallback::after {
  display: none;
}

/* 环境降级(浏览器不支持 backdrop-filter):与官方「材质不可用时落 FallbackColor」一致。 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .wui-acrylic-brush {
    background-image: none;
    background-color: var(--wui-acrylic-fallback, transparent);
  }

  .wui-acrylic-brush .wui-acrylic-brush__luminosity,
  .wui-acrylic-brush::after {
    display: none;
  }
}
</style>
