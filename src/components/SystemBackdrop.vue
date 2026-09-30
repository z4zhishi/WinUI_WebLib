<script lang="ts">
// SystemBackdrop(WinUI 3 窗口级系统材质)——Mica / Mica Alt / Desktop Acrylic 的「应用级模拟」面板。
// 对照 CK/WinUI-Gallery/WinUIGallery/Samples/SystemBackdrops/(SystemBackdropsPage.xaml 与三个 .txt):
//   - MicaBackdrop(Kind = Base / BaseAlt)、DesktopAcrylicBackdrop 与 MicaController /
//     DesktopAcrylicController 的可定制面(FallbackColor / Kind / LuminosityOpacity / TintColor /
//     TintOpacity)、SystemBackdropConfiguration.Theme(明暗)与 IsInputActive(激活状态);
//   - 官方对两种材质的定义:Mica 不透明、对桌面壁纸只取样一次(高性能);Desktop Acrylic
//     半透明、实时模糊窗口背后的内容 —— 因此 Web 侧映射:Mica = 静态壁纸替身 + tint 分层
//     (不用 backdrop-filter,对应「只取样一次」),Desktop Acrylic = backdrop-filter 实时毛玻璃。
// Web 无窗口系统与桌面壁纸:壁纸用静态抽象渐变替身(WALLPAPER_STANDIN,示例内容色),
// tint/降级默认值取自 CK/WinUI-Reference 的主题资源(见各常量注释),差异在 wiki/controls/SystemBackdrops.md 声明。
// Desktop Acrylic 分层的颜色数学复用 AcrylicBrush.vue 的 acrylicToLayers(同属亚克力配方家族)。
import { computed, onBeforeUnmount, onMounted, ref, toValue } from 'vue'
import type { CSSProperties, MaybeRefOrGetter } from 'vue'
import { acrylicToLayers, parseCssColor, supportsAcrylic } from './AcrylicBrush.vue'

/** 系统材质种类(MicaBackdrop Base / MicaBackdrop BaseAlt / DesktopAcrylicBackdrop 的 Web 对应)。 */
export type WuiSystemBackdropKind = 'mica' | 'micaAlt' | 'acrylic'
/** 材质明暗(SystemBackdropConfiguration.Theme 的 Default / Light / Dark;auto = Default,跟随应用主题)。 */
export type WuiSystemBackdropTheme = 'light' | 'dark' | 'auto'

/** 一种材质在一种主题下的默认参数(供 wiki 对照表与 demo 读出)。 */
export interface SystemBackdropDefaults {
  /** 着色(WinUI TintColor;Web 字节序 #RRGGBBAA / rgba()。 */
  tintColor: string
  /** 着色不透明度(WinUI TintOpacity)。 */
  tintOpacity: number
  /** 亮度层不透明度(WinUI LuminosityOpacity)。 */
  tintLuminosityOpacity: number
  /** 降级纯色(WinUI FallbackColor)。 */
  fallbackColor: string
}

/**
 * 壁纸替身:Web 无法读取桌面壁纸,用静态抽象渐变近似「Windows 11 默认壁纸的蓝紫青色调」
 * (示例内容色,非控件 chrome;真实 Mica 取样用户壁纸,观感因人而异 —— wiki 差异节声明)。
 * 只作为 Mica 系取样输入;Desktop Acrylic 实时取样元素背后的真实内容,不用它。
 */
export const WALLPAPER_STANDIN = [
  'radial-gradient(90% 120% at 12% 8%, rgba(88, 124, 205, 0.62) 0%, rgba(88, 124, 205, 0) 58%)',
  'radial-gradient(110% 90% at 88% 18%, rgba(147, 112, 219, 0.42) 0%, rgba(147, 112, 219, 0) 62%)',
  'radial-gradient(130% 100% at 50% 100%, rgba(38, 148, 162, 0.5) 0%, rgba(38, 148, 162, 0) 64%)',
  'radial-gradient(60% 50% at 70% 55%, rgba(238, 244, 255, 0.16) 0%, rgba(238, 244, 255, 0) 70%)',
  'linear-gradient(158deg, #3a4a7b 0%, #2a3357 46%, #1c2749 100%)',
].join(', ')

/**
 * Mica(Base)默认值:tint/降级取 SolidBackgroundFillColorBase
 * (CK/WinUI-Reference/controls/dev/CommonStyles/Common_themeresources_any.xaml ——
 * Light L272 #F3F3F3、Dark L68 #202020;官方 Mica 材质文档指名其为 Mica 的降级纯色)。
 * Opacity/Luminosity:控制器数值默认值未见于文档与本仓库(Web 侧按降级纯色校准观感,wiki 声明)。
 */
export const MICA_DEFAULTS: Record<'light' | 'dark', SystemBackdropDefaults> = {
  light: { tintColor: '#f3f3f3', tintOpacity: 0.8, tintLuminosityOpacity: 0.85, fallbackColor: '#f3f3f3' },
  dark: { tintColor: '#202020', tintOpacity: 0.8, tintLuminosityOpacity: 0.85, fallbackColor: '#202020' },
}

/**
 * Mica Alt 默认值:tint/降级取 SolidBackgroundFillColorBaseAlt(同文件 Light L279 #DADADA、
 * Dark L75 #0A0A0A;官方文档指名其为 Mica Alt 的降级纯色;BaseAlt 即「更强的着色」变体)。
 */
export const MICA_ALT_DEFAULTS: Record<'light' | 'dark', SystemBackdropDefaults> = {
  light: { tintColor: '#dadada', tintOpacity: 0.8, tintLuminosityOpacity: 0.85, fallbackColor: '#dadada' },
  dark: { tintColor: '#0a0a0a', tintOpacity: 0.8, tintLuminosityOpacity: 0.85, fallbackColor: '#0a0a0a' },
}

/**
 * Desktop Acrylic 默认值:OS 侧的 AcrylicBackgroundFillColor* 属系统主题资源,不在
 * CK/WinUI-Reference 仓库;取最近似仓内源 AcrylicBrush_themeresources.xaml 的
 * AcrylicInAppFillColorDefaultBrush(Light:#FCFCFC / 0 / 0.85 / 降级 #F9F9F9;
 * Dark:#2C2C2C / 0.15 / 0.96 / 降级 #2C2C2C,与 AcrylicBrush.vue 先例同源),wiki 差异节声明。
 */
export const ACRYLIC_DEFAULTS: Record<'light' | 'dark', SystemBackdropDefaults> = {
  light: { tintColor: '#fcfcfc', tintOpacity: 0, tintLuminosityOpacity: 0.85, fallbackColor: '#f9f9f9' },
  dark: { tintColor: '#2c2c2c', tintOpacity: 0.15, tintLuminosityOpacity: 0.96, fallbackColor: '#2c2c2c' },
}

/** 按材质 + 主题取默认参数(kind/theme 非法值按 mica/light 处理)。 */
export function getSystemBackdropDefaults(
  kind: WuiSystemBackdropKind,
  theme: 'light' | 'dark',
): SystemBackdropDefaults {
  if (kind === 'micaAlt') return MICA_ALT_DEFAULTS[theme]
  if (kind === 'acrylic') return ACRYLIC_DEFAULTS[theme]
  return MICA_DEFAULTS[theme]
}

/** clamp 到 [0,1](WinUI 属性 coercion 语义)。 */
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

/** 0–1 → 百分比串(去浮点噪声)。 */
function toAlphaPercent(value: number): string {
  return `${Math.round(clamp01(value) * 100000) / 1000}%`
}

/**
 * 任意 CSS 颜色叠 alpha:可解析(hex / rgb() / 命名色子集)时输出 rgba(),拿不到通道
 * (var() 等)时走 color-mix 兜底(与 AcrylicBrush.vue 的兜底策略一致)。
 */
function withAlpha(color: string, alpha: number): string {
  const parsed = parseCssColor(color)
  if (!parsed) return `color-mix(in srgb, ${color} ${toAlphaPercent(alpha)}, transparent)`
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${Math.round(clamp01(alpha) * 10000) / 10000})`
}

/**
 * useSystemBackdrop:把系统材质描述转成分层颜色的响应式组合式函数(渲染与 demo 读出同一实现)。
 * mica / micaAlt:亮度层(mix-blend-mode: luminosity)+ 普通 tint 覆盖层叠在壁纸替身上;
 * acrylic:直接复用亚克力配方(acrylicToLayers:backdrop-filter + 亮度/着色混色层 + 噪点)。
 */
export function useSystemBackdrop(source: MaybeRefOrGetter<{
  kind: WuiSystemBackdropKind
  tintColor: string
  tintOpacity: number
  tintLuminosityOpacity: number
  fallbackColor: string
}>) {
  return computed(() => {
    const options = toValue(source)
    if (options.kind === 'acrylic') {
      // Desktop Acrylic 与 AcrylicBrush 同配方家族(模糊 + 亮度混色 + 着色 + 噪点),
      // 颜色数学直接复用 acrylicToLayers 纯函数(与 AcrylicBrush.vue 渲染同一实现)。
      const layers = acrylicToLayers({
        tintColor: options.tintColor,
        tintOpacity: options.tintOpacity,
        tintLuminosityOpacity: options.tintLuminosityOpacity,
        fallbackColor: options.fallbackColor,
      })
      return {
        backdropFilter: layers.backdropFilter,
        luminosityColor: layers.luminosityColor,
        tintColor: layers.tintColor,
        fallbackColor: layers.fallbackColor,
      }
    }
    // Mica:壁纸替身 → 亮度层(luminosity 混色,壁纸转为 tint 明度的单色纹理)→ 普通 tint 覆盖层。
    return {
      backdropFilter: 'none',
      luminosityColor: withAlpha(options.tintColor, options.tintLuminosityOpacity),
      tintColor: withAlpha(options.tintColor, options.tintOpacity),
      fallbackColor: options.fallbackColor,
    }
  })
}

// (vue 导入统一放在上方普通 script 块,SFC 双 script 块共享模块作用域,避免重复导入。)
</script>

<script setup lang="ts">
// SystemBackdrop —— 渲染为一块「应用级模拟系统材质」的面板 div:
//   - Mica / Mica Alt:静态壁纸替身 + 亮度混色层 + tint 覆盖层(不透明,不用 backdrop-filter,
//     对应「壁纸只取样一次」);失活(IsInputActive = false)整面落 FallbackColor 纯色;
//   - Desktop Acrylic:backdrop-filter 实时模糊面板背后的内容 + 亮度/着色混色层 + 噪点;
//   - theme = 'auto' 时跟随站点主题(html[data-theme],由 demo 的 useThemeSetting 写入)。
// 组件非交互控件:无视觉状态、无业务事件(系统材质作用于窗口背景,非 Control)。

defineOptions({ inheritAttrs: false, name: 'WuiSystemBackdrop' })

const props = withDefaults(
  defineProps<{
    /** 系统材质种类(WinUI:MicaBackdrop Kind=Base / Kind=BaseAlt / DesktopAcrylicBackdrop)。 */
    kind?: WuiSystemBackdropKind
    /** 材质明暗(WinUI SystemBackdropConfiguration.Theme);auto 跟随站点 html[data-theme]。 */
    theme?: WuiSystemBackdropTheme
    /** 输入激活(WinUI SystemBackdropConfiguration.IsInputActive);false(窗口失活)整面落降级纯色。 */
    isInputActive?: boolean
    /** 着色(WinUI MicaController/DesktopAcrylicController.TintColor);缺省用材质×主题默认值。 */
    tintColor?: string
    /** 着色不透明度(WinUI TintOpacity,0–1);缺省用默认值。 */
    tintOpacity?: number
    /** 亮度层不透明度(WinUI LuminosityOpacity,0–1);undefined/null = 用默认值。 */
    tintLuminosityOpacity?: number | null
    /** 降级纯色(WinUI FallbackColor);缺省用 SolidBackgroundFillColorBase/BaseAlt 家族。 */
    fallbackColor?: string
  }>(),
  {
    kind: 'mica',
    theme: 'auto',
    isInputActive: true,
  },
)

// —— 站点主题跟踪(theme = 'auto' 用):监听 useThemeSetting 写入的 html[data-theme]。 ——
function readSiteTheme(): 'light' | 'dark' {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    ? 'dark'
    : 'light'
}
const siteTheme = ref<'light' | 'dark'>(readSiteTheme())
let themeObserver: MutationObserver | undefined
onMounted(() => {
  if (typeof MutationObserver === 'undefined') return
  themeObserver = new MutationObserver(() => {
    siteTheme.value = readSiteTheme()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = undefined
})

const isMica = computed(() => props.kind !== 'acrylic')

// 生效主题:显式 light/dark 优先,auto 跟随站点(SystemBackdropConfiguration.Theme 语义)。
const effectiveTheme = computed<'light' | 'dark'>(() =>
  props.theme === 'auto' ? siteTheme.value : props.theme,
)

// 生效参数:未设置的属性落材质 × 主题默认值(null 与 undefined 同作「未设置」)。
const defaults = computed(() => getSystemBackdropDefaults(props.kind, effectiveTheme.value))
const effectiveTint = computed(() => props.tintColor ?? defaults.value.tintColor)
const effectiveTintOpacity = computed(() => clamp01(props.tintOpacity ?? defaults.value.tintOpacity))
const effectiveLuminosity = computed(() =>
  clamp01(props.tintLuminosityOpacity ?? defaults.value.tintLuminosityOpacity),
)
const effectiveFallback = computed(() => props.fallbackColor ?? defaults.value.fallbackColor)

// 分层求值(渲染与 useSystemBackdrop 同一实现;demo 页用它读出)。
const layers = useSystemBackdrop(() => ({
  kind: props.kind,
  tintColor: effectiveTint.value,
  tintOpacity: effectiveTintOpacity.value,
  tintLuminosityOpacity: effectiveLuminosity.value,
  fallbackColor: effectiveFallback.value,
}))

// 运行时支持性(模块级 memo):backdrop-filter 不可用时 Desktop Acrylic 自动落降级纯色
// (Mica 本就不依赖 backdrop-filter,不受影响)。
const acrylicSupported = supportsAcrylic()

// 降级纯色面:窗口失活(WinUI 失活即落中性纯色)或亚克力环境不支持。
const isSolid = computed(
  () => props.isInputActive === false || (props.kind === 'acrylic' && !acrylicSupported),
)

const rootClasses = computed(() => ({
  'wui-system-backdrop--mica': props.kind === 'mica',
  'wui-system-backdrop--mica-alt': props.kind === 'micaAlt',
  'wui-system-backdrop--acrylic': props.kind === 'acrylic',
  'wui-system-backdrop--solid': isSolid.value,
}))

// 分层颜色经 CSS 自定义属性下发(颜色值全部来自上方带出处注释的常量/属性,不在 CSS 硬编码)。
const rootStyle = computed<CSSProperties>(() => ({
  '--wui-sysbd-wallpaper': WALLPAPER_STANDIN,
  '--wui-sysbd-luminosity': layers.value.luminosityColor,
  '--wui-sysbd-tint': layers.value.tintColor,
  '--wui-sysbd-fallback': layers.value.fallbackColor,
}))
</script>

<template>
  <!-- 系统材质非 Control:无模板与视觉状态;class/style/事件经 $attrs 透传到根 div,
       缺省 320×200(窗口级材质的示意尺寸,可被调用方 style/class 覆盖);默认插槽承载内容层 -->
  <div v-bind="$attrs" class="wui-system-backdrop" :class="rootClasses" :style="rootStyle">
    <i v-if="isMica" class="wui-system-backdrop__wallpaper" aria-hidden="true" />
    <i class="wui-system-backdrop__luminosity" aria-hidden="true" />
    <i class="wui-system-backdrop__tint" aria-hidden="true" />
    <div class="wui-system-backdrop__content"><slot /></div>
  </div>
</template>

<style scoped>
/* 材质面:根元素形成独立层叠上下文(isolation),混色层不外溢。 */
.wui-system-backdrop {
  position: relative;
  display: block;
  width: 320px;
  height: 200px;
  overflow: hidden;
  isolation: isolate;
}

/* Desktop Acrylic:实时 backdrop-filter(官方定义:半透明、实时模糊窗口背后的内容)
   + 噪点图层(同 AcrylicBrush.vue 的内联 SVG feTurbulence 近似,2% 不透明度写进 SVG)。 */
.wui-system-backdrop--acrylic {
  -webkit-backdrop-filter: blur(30px) saturate(125%);
  backdrop-filter: blur(30px) saturate(125%);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
  background-repeat: repeat;
}

/* Mica 壁纸替身:静态抽象渐变(壁纸只取样一次 → 不用 backdrop-filter,不透出真实内容)。 */
.wui-system-backdrop__wallpaper {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: var(--wui-sysbd-wallpaper, none);
  background-size: cover;
  pointer-events: none;
}

/* 亮度层:亮度取自 tint、色相/饱和度取自下层(壁纸替身或真实模糊背景)。 */
.wui-system-backdrop__luminosity {
  position: absolute;
  inset: 0;
  z-index: 1;
  background-color: var(--wui-sysbd-luminosity, transparent);
  mix-blend-mode: luminosity;
  pointer-events: none;
}

/* 着色覆盖层:tint 以普通 alpha 合成压在亮度层上(材质「主题色着色」的主观感层)。 */
.wui-system-backdrop__tint {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-color: var(--wui-sysbd-tint, transparent);
  pointer-events: none;
}

/* 内容层容器:系统材质之上叠加的应用内容(默认插槽),不参与混色。 */
.wui-system-backdrop__content {
  position: relative;
  z-index: 3;
  height: 100%;
  box-sizing: border-box;
}

/* 失活 / 材质不可用:整面落 FallbackColor 纯色(官方行为:窗口失活、省电模式、
   关闭透明效果等系统策略触发;WinUI 文档指名 Mica/Mica Alt 落 SolidBackgroundFillColorBase/BaseAlt)。 */
.wui-system-backdrop--solid {
  background-color: var(--wui-sysbd-fallback, transparent);
}

.wui-system-backdrop--solid .wui-system-backdrop__wallpaper,
.wui-system-backdrop--solid .wui-system-backdrop__luminosity,
.wui-system-backdrop--solid .wui-system-backdrop__tint {
  display: none;
}

.wui-system-backdrop--solid.wui-system-backdrop--acrylic {
  background-image: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
</style>
