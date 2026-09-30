<script lang="ts">
// SystemBackdropElement(WinUI 3 元素级系统材质宿主)——把 Mica / Mica Alt / Desktop Acrylic
// 材质放到 UI 树内**任意一块区域**的身后,是 SystemBackdrop.vue(窗口级)的「元素级」姊妹件。
// 对照 CK/WinUI-Reference/controls/dev/SystemBackdropElement/SystemBackdropElement.idl:
//   - `SystemBackdropElement : FrameworkElement`,仅两个属性:`SystemBackdrop`(挂
//     MicaBackdrop{Kind=Base/BaseAlt} 或 DesktopAcrylicBackdrop,与窗口级同一族材质对象)与
//     `CornerRadius`(材质面圆角,OnPropertyChanged → RectangleClip 裁剪);
//   - 它**不是 Control**(generic.xaml 无模板与视觉状态),自身无内容属性 —— WinUI 官方用法是
//     把它放进 Grid,内容以**兄弟节点**叠在其上(见官方示例 Samples/SystemBackdropElement/
//     与 TestUI/SystemBackdropElementPage.xaml);Web 侧额外提供默认插槽把内容直接叠在材质面
//     (任务规格「任意子内容置于材质面上」),兄弟节点叠加的原味写法在 wiki 给出。
// 渲染完全复用窗口级姊妹件 SystemBackdrop.vue 的导出(同族同源):
//   - kind → getSystemBackdropDefaults(MICA_DEFAULTS / MICA_ALT_DEFAULTS / ACRYLIC_DEFAULTS)
//     取材质 × 主题默认 tint/降级,useSystemBackdrop 求分层颜色(Mica:静态壁纸替身 + 亮度混色
//     层 + tint 层,不透明、不用 backdrop-filter;Acrylic:backdrop-filter 实时毛玻璃 + 噪点);
//   - theme = 'auto' 跟随站点 html[data-theme](同 SystemBackdrop.vue 的 MutationObserver 方案);
//   - CornerRadius → 根元素 border-radius(overflow:hidden + backdrop-filter 均按圆角裁剪,
//     对应 WinUI 侧 RectangleClip 的圆角裁剪)。
// 差异(壁纸替身、backdrop root 限制、默认尺寸等)在 wiki/controls/SystemBackdropElement.md 声明。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CSSProperties } from 'vue'
import { supportsAcrylic } from './AcrylicBrush.vue'
import {
  getSystemBackdropDefaults,
  useSystemBackdrop,
  WALLPAPER_STANDIN,
  type WuiSystemBackdropKind,
  type WuiSystemBackdropTheme,
} from './SystemBackdrop.vue'
</script>

<script setup lang="ts">
// (vue 导入统一放在上方普通 script 块,SFC 双 script 块共享模块作用域,避免重复导入。)
defineOptions({ inheritAttrs: false, name: 'WuiSystemBackdropElement' })

const props = withDefaults(
  defineProps<{
    /** 系统材质种类(WinUI:SystemBackdrop 属性挂 MicaBackdrop Kind=Base/BaseAlt 或 DesktopAcrylicBackdrop)。 */
    kind?: WuiSystemBackdropKind
    /** 材质明暗(WinUI SystemBackdropConfiguration.Theme);auto 跟随站点 html[data-theme]。 */
    theme?: WuiSystemBackdropTheme
    /** 材质面圆角(WinUI CornerRadius;number 按 px,字符串原样作 CSS border-radius,可写逐角值)。 */
    cornerRadius?: number | string
    /** 输入激活(WinUI SystemBackdropConfiguration.IsInputActive 的 Web 模拟);false 整面落降级纯色。 */
    isInputActive?: boolean
  }>(),
  {
    kind: 'mica',
    theme: 'auto',
    cornerRadius: 0,
    isInputActive: true,
  },
)

// —— 站点主题跟踪(theme = 'auto' 用;html[data-theme] 由 demo 的 useThemeSetting 写入)——
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

// 生效参数:元素 API 不暴露控制器级自定义(WinUI 侧同理,TintColor 等在控制器上),
// 一律落材质 × 主题默认值(与窗口级姊妹件同源:MICA/MICA_ALT/ACRYLIC_DEFAULTS)。
const defaults = computed(() => getSystemBackdropDefaults(props.kind, effectiveTheme.value))
const layers = useSystemBackdrop(() => ({
  kind: props.kind,
  tintColor: defaults.value.tintColor,
  tintOpacity: defaults.value.tintOpacity,
  tintLuminosityOpacity: defaults.value.tintLuminosityOpacity,
  fallbackColor: defaults.value.fallbackColor,
}))

// 运行时支持性(模块级 memo):backdrop-filter 不可用时 Desktop Acrylic 自动落降级纯色
// (Mica 系不依赖 backdrop-filter,不受影响)。
const acrylicSupported = supportsAcrylic()

// 降级纯色面:失活(IsInputActive = false,官方「窗口失活即落中性纯色」)或亚克力环境不支持。
const isSolid = computed(
  () => props.isInputActive === false || (props.kind === 'acrylic' && !acrylicSupported),
)

const rootClasses = computed(() => ({
  'wui-system-backdrop-element--mica': props.kind === 'mica',
  'wui-system-backdrop-element--mica-alt': props.kind === 'micaAlt',
  'wui-system-backdrop-element--acrylic': props.kind === 'acrylic',
  'wui-system-backdrop-element--solid': isSolid.value,
}))

// CornerRadius → CSS border-radius(number 按 px;字符串原样,支持逐角写法 '8 16 8 16')。
const radiusStyle = computed<CSSProperties>(() => {
  const radius = props.cornerRadius
  if (radius === null || radius === '') return {}
  return { borderRadius: typeof radius === 'number' ? `${radius}px` : radius }
})

// 分层颜色经 CSS 自定义属性下发(全部来自 SystemBackdrop.vue 带出处注释的常量,不在 CSS 硬编码)。
const rootStyle = computed<CSSProperties>(() => ({
  ...radiusStyle.value,
  '--wui-sysbd-wallpaper': WALLPAPER_STANDIN,
  '--wui-sysbd-luminosity': layers.value.luminosityColor,
  '--wui-sysbd-tint': layers.value.tintColor,
  '--wui-sysbd-fallback': layers.value.fallbackColor,
}))
</script>

<template>
  <!-- 元素级材质宿主(WinUI SystemBackdropElement : FrameworkElement,非 Control):
       无视觉状态、无业务事件;class/style/原生事件经 $attrs 透传到根 div。
       缺省 300×200(官方示例舞台尺寸;WinUI 实际尺寸由布局容器决定,可被 class/style 覆盖);
       默认插槽承载叠在材质面上的内容层。 -->
  <div v-bind="$attrs" class="wui-system-backdrop-element" :class="rootClasses" :style="rootStyle">
    <i v-if="isMica" class="wui-system-backdrop-element__wallpaper" aria-hidden="true" />
    <i class="wui-system-backdrop-element__luminosity" aria-hidden="true" />
    <i class="wui-system-backdrop-element__tint" aria-hidden="true" />
    <div class="wui-system-backdrop-element__content"><slot /></div>
  </div>
</template>

<style scoped>
/* 材质面:根元素形成独立层叠上下文(isolation),混色层不外溢;
   分层结构与窗口级 SystemBackdrop.vue 同族(wallpaper → luminosity → tint → content)。 */
.wui-system-backdrop-element {
  position: relative;
  display: block;
  width: 300px;
  height: 200px;
  overflow: hidden;
  isolation: isolate;
}

/* Desktop Acrylic:实时 backdrop-filter(官方定义:半透明、实时模糊元素身后的内容)
   + 噪点图层(与 SystemBackdrop.vue / AcrylicBrush.vue 同款内联 SVG feTurbulence,2% 不透明度写进 SVG)。 */
.wui-system-backdrop-element--acrylic {
  -webkit-backdrop-filter: blur(30px) saturate(125%);
  backdrop-filter: blur(30px) saturate(125%);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
  background-repeat: repeat;
}

/* Mica 壁纸替身:静态抽象渐变(壁纸只取样一次 → 不用 backdrop-filter,不透出元素身后内容)。 */
.wui-system-backdrop-element__wallpaper {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: var(--wui-sysbd-wallpaper, none);
  background-size: cover;
  pointer-events: none;
}

/* 亮度层:亮度取自 tint、色相/饱和度取自下层(壁纸替身或元素身后的真实内容)。 */
.wui-system-backdrop-element__luminosity {
  position: absolute;
  inset: 0;
  z-index: 1;
  background-color: var(--wui-sysbd-luminosity, transparent);
  mix-blend-mode: luminosity;
  pointer-events: none;
}

/* 着色覆盖层:tint 以普通 alpha 合成压在亮度层上(材质「主题色着色」的主观感层)。 */
.wui-system-backdrop-element__tint {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-color: var(--wui-sysbd-tint, transparent);
  pointer-events: none;
}

/* 内容层容器:叠在材质面上的任意内容(默认插槽),不参与混色。 */
.wui-system-backdrop-element__content {
  position: relative;
  z-index: 3;
  height: 100%;
  box-sizing: border-box;
}

/* 失活 / 材质不可用:整面落 FallbackColor 纯色(官方行为:窗口失活、省电模式、
   关闭透明效果等系统策略触发;Mica/Mica Alt 落 SolidBackgroundFillColorBase/BaseAlt 家族)。 */
.wui-system-backdrop-element--solid {
  background-color: var(--wui-sysbd-fallback, transparent);
}

.wui-system-backdrop-element--solid .wui-system-backdrop-element__wallpaper,
.wui-system-backdrop-element--solid .wui-system-backdrop-element__luminosity,
.wui-system-backdrop-element--solid .wui-system-backdrop-element__tint {
  display: none;
}

.wui-system-backdrop-element--solid.wui-system-backdrop-element--acrylic {
  background-image: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
</style>
