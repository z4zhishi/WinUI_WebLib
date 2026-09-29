<script lang="ts">
// RadialGradientBrush(WinUI 3 画刷):类型与 useRadialGradient 组合式函数对外导出,
// 模式同 Line.vue / Slider.vue(SFC 双 script 块)。
// 类型对齐策略:GradientStop 复用同波 Line.vue 导出的 WuiGradientStop(避免 Shape 家族画刷接口分叉),
// 其余画刷级类型(MappingMode / SpreadMethod / Point)在此定义,后续 LinearGradientBrush 可沿用。
import { computed, toValue } from 'vue'
import type { ComputedRef, CSSProperties, MaybeRefOrGetter } from 'vue'
import type { WuiGradientStop } from './Line.vue'

/** 停止点(对外转发 Line.vue 的 WuiGradientStop,方便使用方单一来源引用)。 */
export type { WuiGradientStop }

/** 映射模式(WinUI BrushMappingMode;默认 RelativeToBoundingBox)。 */
export type WuiBrushMappingMode = 'RelativeToBoundingBox' | 'Absolute'

/** 扩展方式(WinUI GradientSpreadMethod)。 */
export type WuiBrushSpreadMethod = 'Pad' | 'Reflect' | 'Repeat'

/** 二维坐标(WinUI Windows.Foundation.Point,XAML 里写作 "0.25,0.25")。 */
export interface WuiPoint {
  x: number
  y: number
}

/** useRadialGradient 的输入(WinUI RadialGradientBrush 的属性面;全部可选,缺省见各字段注释)。 */
export interface RadialGradientBrushOptions {
  /** 渐变椭圆中心(WinUI Center,缺省 {x:0.5, y:0.5};相对模式为包围盒比例,绝对模式为 px)。 */
  center?: WuiPoint
  /**
   * 渐变焦点(WinUI GradientOrigin,缺省 {x:0.5, y:0.5})。
   * CSS radial-gradient 没有焦点语法(focus),该字段当前**不影响** CSS 输出,
   * 仅为 WinUI API 对齐与后续 SVG 渲染预留(可视化对照见演示页)。
   */
  gradientOrigin?: WuiPoint
  /** 水平半径(WinUI RadiusX,缺省 0.5;相对模式为包围盒宽度比例,绝对模式为 px)。 */
  radiusX?: number
  /** 垂直半径(WinUI RadiusY,缺省 0.5;口径同 radiusX)。 */
  radiusY?: number
  /** 映射模式(缺省 'RelativeToBoundingBox',与 WinUI 默认一致)。 */
  mappingMode?: WuiBrushMappingMode
  /** 扩展方式(缺省 'Pad',与 WinUI 默认一致)。 */
  spreadMethod?: WuiBrushSpreadMethod
  /** 停止点集合(WinUI GradientStops;offset ∈ [0,1] 可省略,省略时按索引均匀分布)。 */
  gradientStops?: WuiGradientStop[]
}

/** 把 0–1 区间的数格式化为百分比串(去浮点噪声,如 33.333333% → 33.333%)。 */
function toPercent(value: number): string {
  return `${Math.round(value * 100000) / 1000}%`
}

/** px 值格式化(去浮点噪声)。 */
function toPx(value: number): string {
  return `${Math.round(value * 1000) / 1000}px`
}

/** offset 归一 + 均匀分布(与 Line.vue 的 normalizeStops 同口径:省略时按索引均匀分布,首 0 末 1)。 */
function normalizeStops(stops: WuiGradientStop[]): Array<{ color: string; offset: number }> {
  if (stops.length === 0) return []
  if (stops.length === 1) return [{ color: stops[0].color, offset: clampOffset(stops[0].offset ?? 0) }]
  return stops.map((stop, index) => ({
    color: stop.color,
    offset: clampOffset(stop.offset ?? index / (stops.length - 1)),
  }))
}

/** WinUI GradientStop.Offset 越界值钳制到 [0,1](Web 侧归一,XAML 对越界 offset 同样按界内处理)。 */
function clampOffset(offset: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(offset) ? offset : 0))
}

/** 停止点串(CSS 渐变停止点写法 "color offset%";offset 以渐变线百分比表达,两种映射模式通用)。 */
function stopsToCss(stops: Array<{ color: string; offset: number }>): string {
  return stops.map((stop) => `${stop.color} ${toPercent(stop.offset)}`).join(', ')
}

/**
 * WinUI RadialGradientBrush → CSS radial-gradient 字符串(纯函数)。
 * 映射口径:
 *   - RelativeToBoundingBox:center → `at x% y%`(包围盒百分比),RadiusX/Y → `ellipse rx% ry%`
 *     (CSS 椭圆半径百分比分别相对包围盒宽/高,与 WinUI 相对口径一致);
 *   - Absolute:center/半径 → px(相对元素左上角,与 WinUI 绝对口径一致,见
 *     CK/WinUI-Reference/controls/dev/RadialGradientBrush/RadialGradientBrush.cpp 的注释);
 *   - SpreadMethod:Pad → radial-gradient;Repeat → repeating-radial-gradient(两端补齐到 0/1,
 *     使 CSS 重复周期 = WinUI 渐变向量 [0,1]);Reflect → 先 Pad 到 [0,1] 再镜像到 [0,2],
 *     repeating 周期 = 2(与 WinUI 正反交替的周期一致);
 *   - 无停止点 → 'none'(不绘制;对应 WinUI 无 GradientStops 时的透明 fallback)。
 * gradientOrigin 与 opacity 不进入 CSS 字符串(见 RadialGradientBrushOptions 注释)。
 */
export function radialGradientToCss(options: RadialGradientBrushOptions): string {
  const normalized = normalizeStops(options.gradientStops ?? [])
  if (normalized.length === 0) return 'none'

  const center = options.center ?? { x: 0.5, y: 0.5 }
  const radiusX = Math.max(options.radiusX ?? 0.5, 0)
  const radiusY = Math.max(options.radiusY ?? 0.5, 0)
  const absolute = options.mappingMode === 'Absolute'
  const shape = absolute
    ? `ellipse ${toPx(radiusX)} ${toPx(radiusY)} at ${toPx(center.x)} ${toPx(center.y)}`
    : `ellipse ${toPercent(radiusX)} ${toPercent(radiusY)} at ${toPercent(center.x)} ${toPercent(center.y)}`

  const spread = options.spreadMethod ?? 'Pad'
  if (spread === 'Pad') return `radial-gradient(${shape}, ${stopsToCss(normalized)})`

  // Repeat / Reflect:先把停止点 Pad 到完整渐变向量 [0,1](首补 0、末补 1),
  // CSS repeating 的重复周期取「末停止点 − 首停止点」,补齐后周期恰为 1(= WinUI 渐变向量)。
  const padded = normalized.slice()
  if (padded[0].offset > 0) padded.unshift({ color: padded[0].color, offset: 0 })
  if (padded[padded.length - 1].offset < 1) {
    padded.push({ color: padded[padded.length - 1].color, offset: 1 })
  }

  if (spread === 'Repeat') {
    // Repeat:周期 1,周期边界处从末端颜色硬跳回起始颜色(WinUI Repeat 语义)。
    return `repeating-radial-gradient(${shape}, ${stopsToCss(padded)})`
  }

  // Reflect:在 [0,1] 之外镜像出 [1,2](颜色倒序、offset 取 2−offset),周期 2 正反交替。
  const mirrored = padded
    .slice(0, -1)
    .reverse()
    .map((stop) => ({ color: stop.color, offset: 2 - stop.offset }))
  return `repeating-radial-gradient(${shape}, ${stopsToCss([...padded, ...mirrored])})`
}

/**
 * useRadialGradient:把画刷描述转成 CSS radial-gradient 的响应式组合式函数,
 * 供其他控件(Shape 家族 Fill、卡片背景等)直接取 CSS 背景串。
 * 接受普通对象或 getter/ref(内部 toValue),返回 ComputedRef<string>(依赖变化自动重算)。
 * 与组件的两个用途:组件 = 渲染好的渐变 div;本函数 = 只取 CSS 串自行使用。
 */
export function useRadialGradient(
  source: MaybeRefOrGetter<RadialGradientBrushOptions>,
): ComputedRef<string> {
  return computed(() => radialGradientToCss(toValue(source)))
}
</script>

<script setup lang="ts">
// RadialGradientBrush —— WinUI RadialGradientBrush 的 Web 复刻:渲染为一个以 CSS radial-gradient
// 填充的 div,可直接当背景面使用(官方示例即用它在 Rectangle.Fill 上画径向渐变)。
// 对照 CK/WinUI-Reference/controls/dev/RadialGradientBrush/:Center(0.5,0.5)/ RadiusX/RadiusY(0.5)/
// GradientOrigin(0.5,0.5)/ MappingMode(RelativeToBoundingBox)/ SpreadMethod(Pad)/ InterpolationSpace(Auto);
// 画刷经 CompositionRadialGradientBrush 落到元素上,Web 侧等价面就是 background-image。
// 语义要点(详见 wiki/controls/RadialGradientBrush.md):
//   - Brush 非 UIElement:无模板、无视觉状态、无业务事件(generic.xaml 无 RadialGradientBrush 样式);
//   - GradientOrigin(焦点)CSS 无对应语法,prop 保留但不影响渲染(演示页有 SVG fx/fy 对照);
//   - GradientStops 以 gradientStops 数组 prop 表达(WinUI 为 IObservableVector,ContentProperty)。
// (vue 导入统一放在上方普通 script 块,SFC 双 script 块共享模块作用域,避免重复导入。)

defineOptions({ inheritAttrs: false, name: 'WuiRadialGradientBrush' })

const props = withDefaults(
  defineProps<{
    /** 渐变椭圆中心(WinUI Center;相对模式为包围盒比例 0–1,绝对模式为 px)。 */
    center?: WuiPoint
    /** 渐变焦点(WinUI GradientOrigin;CSS 无焦点语法,保留 API 对齐,不影响渲染)。 */
    gradientOrigin?: WuiPoint
    /** 水平半径(WinUI RadiusX;负值按 0 处理)。 */
    radiusX?: number
    /** 垂直半径(WinUI RadiusY;负值按 0 处理)。 */
    radiusY?: number
    /** 映射模式(WinUI MappingMode,默认相对包围盒)。 */
    mappingMode?: WuiBrushMappingMode
    /** 扩展方式(WinUI SpreadMethod,默认 Pad)。 */
    spreadMethod?: WuiBrushSpreadMethod
    /** 停止点集合([{ color, offset? }],offset 省略时按索引均匀分布)。 */
    gradientStops?: WuiGradientStop[]
    /** 画刷不透明度(WinUI Brush.Opacity,0–1)。 */
    opacity?: number
  }>(),
  {
    center: () => ({ x: 0.5, y: 0.5 }),
    gradientOrigin: () => ({ x: 0.5, y: 0.5 }),
    radiusX: 0.5,
    radiusY: 0.5,
    mappingMode: 'RelativeToBoundingBox',
    spreadMethod: 'Pad',
    gradientStops: () => [],
    opacity: 1,
  },
)

// CSS 渐变串:所有绘制属性经 useRadialGradient 响应式求值(与导出的组合式函数同一实现)。
const backgroundImage = useRadialGradient(() => ({
  center: props.center,
  gradientOrigin: props.gradientOrigin,
  radiusX: props.radiusX,
  radiusY: props.radiusY,
  mappingMode: props.mappingMode,
  spreadMethod: props.spreadMethod,
  gradientStops: props.gradientStops,
}))

// Brush.Opacity 钳制到 [0,1](WinUI 语义),落到元素 opacity;无停止点时 'none' 即透明。
const rootStyle = computed<CSSProperties>(() => ({
  backgroundImage: backgroundImage.value,
  opacity: Math.min(1, Math.max(0, props.opacity)),
}))
</script>

<template>
  <!-- 画刷非 Control:无模板与视觉状态;class/style/事件经 $attrs 透传到根 div,
       缺省 200×200 对齐官方示例的 Rectangle,可被调用方 style/class 覆盖 -->
  <div v-bind="$attrs" class="wui-radial-gradient-brush" :style="rootStyle" />
</template>

<style scoped>
.wui-radial-gradient-brush {
  display: block;
  width: 200px;
  height: 200px;
}
</style>
