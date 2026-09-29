<script lang="ts">
// Line(WinUI Shape 家族)—— 对外类型导出,供使用方与 Shape 家族后续组件(Path/Polyline/Ellipse 等)复用。
/** 线帽类型(WinUI PenLineCap;映射 SVG stroke-linecap,Triangle 经 marker 三角形补绘,见组件内映射表)。 */
export type WuiPenLineCap = 'Flat' | 'Square' | 'Round' | 'Triangle'

/** 折线连接方式(WinUI PenLineJoin;映射 SVG stroke-linejoin)。 */
export type WuiPenLineJoin = 'Miter' | 'Bevel' | 'Round'

/** 渐变停止点(WinUI GradientStop;offset ∈ [0,1],省略时按索引均匀分布)。 */
export interface WuiGradientStop {
  color: string
  offset?: number
}

/**
 * 画刷描述(WinUI Brush 的 Web 等价描述,Shape 家族统一画刷接口)。
 * - 字符串:纯色画刷(SolidColorBrush 等价),任意 CSS 颜色 / currentColor / --wui-* 变量;
 * - 对象:渐变画刷描述,本组件已实现 linearGradient / radialGradient(渲染为 SVG 渐变);
 *   后续 Shape 家族组件(如需要 Fill 的 Path/Ellipse)与 RadialGradientBrush 配套沿用同一类型。
 * 渐变坐标为用户空间 px(对应 WinUI MappingMode="Absolute" 口径;RelativeToBoundingBox 在
 * 零宽/零高的水平/垂直线段上无渲染面积,Web 侧不做该缺省,见 wiki/controls/Line.md)。
 */
export type WuiBrush =
  | string
  | { type: 'solid'; color: string; opacity?: number }
  | {
      type: 'linearGradient'
      /** 渐变起点(用户空间 px,缺省 [0, 0])。 */
      startX?: number
      startY?: number
      /** 渐变终点(缺省为组件自然尺寸右下角 [naturalWidth, naturalHeight])。 */
      endX?: number
      endY?: number
      stops: WuiGradientStop[]
      opacity?: number
    }
  | {
      type: 'radialGradient'
      /** 圆心(缺省为自然尺寸中心)。WinUI RadialGradientBrush.Center。 */
      centerX?: number
      centerY?: number
      /** 半径(缺省为自然尺寸长边的一半;SVG 原生圆形,WinUI RadiusX/RadiusY 椭圆为近似)。 */
      radius?: number
      /** 焦点(缺省与圆心一致)。WinUI RadialGradientBrush.GradientOrigin。 */
      originX?: number
      originY?: number
      stops: WuiGradientStop[]
      opacity?: number
    }
</script>

<script setup lang="ts">
// Line —— WinUI Line 的 Web 复刻:在两点之间绘制一条直线的 Shape,渲染为内联 SVG <line>。
// 对照 CK/WinUI-Reference/dxaml/xcp/core/core/elements/line.cpp:CLine::UpdateRenderGeometry 用
// (X1,Y1)→(X2,Y2) 构造 CLineGeometry(无面积、不填充),描边 API 全部来自 Shape 基类(shape.cpp
// 的 pPen 组装:SetStartCap/EndCap/DashCap/DashOffset/DashArray/Join/MiterLimit)。
// 语义要点:
//   - stroke 缺省不渲染:WinUI Shape.Stroke 默认为 null 画刷,无描边的 Line 不可见;
//   - StrokeDashArray / StrokeDashOffset 的值为 StrokeThickness 的倍数(WinUI 语义),转 SVG 时乘上粗细;
//   - SVG 无独立虚线帽属性(stroke-linecap 同时作用于线段两端与虚线段),dashCap 的近似取舍见 wiki;
//   - Triangle 线帽 SVG 无对应枚举,经 marker 三角形(随 strokeWidth 缩放)补绘;
//   - 无视觉状态、无业务事件(Shape 非 Control,无 ControlTemplate;generic.xaml 无 Line 样式)。
import { computed, useId } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiLine' })

const props = withDefaults(
  defineProps<{
    /** 起点 X(WinUI Line.X1,px)。 */
    x1?: number
    /** 起点 Y(WinUI Line.Y1,px)。 */
    y1?: number
    /** 终点 X(WinUI Line.X2,px)。 */
    x2?: number
    /** 终点 Y(WinUI Line.Y2,px)。 */
    y2?: number
    /** 描边画刷(WinUI Shape.Stroke,默认 null → 不渲染);字符串为纯色,对象为画刷描述(见 WuiBrush)。 */
    stroke?: WuiBrush
    /** 描边粗细(WinUI Shape.StrokeThickness,px)。 */
    strokeThickness?: number
    /** 虚线样式(WinUI Shape.StrokeDashArray),值为 strokeThickness 的倍数;支持 XAML 写法串 '2 1 0.5' 或数组。 */
    strokeDashArray?: string | number[]
    /** 虚线起始偏移(WinUI Shape.StrokeDashOffset),同为 strokeThickness 的倍数。 */
    strokeDashOffset?: number
    /** 起点线帽(WinUI Shape.StrokeStartLineCap)。 */
    strokeStartLineCap?: WuiPenLineCap
    /** 终点线帽(WinUI Shape.StrokeEndLineCap)。 */
    strokeEndLineCap?: WuiPenLineCap
    /** 虚线段线帽(WinUI Shape.StrokeDashCap);SVG 无独立虚线帽,取舍见 wiki。 */
    strokeDashCap?: WuiPenLineCap
    /** 连接方式(WinUI Shape.StrokeLineJoin;直线段无可见效果,Shape 家族接口预留)。 */
    strokeLineJoin?: WuiPenLineJoin
    /** 斜接限制(WinUI Shape.StrokeMiterLimit)。 */
    strokeMiterLimit?: number
    /** 不透明度(WinUI UIElement.Opacity,范围 0–1)。 */
    opacity?: number
  }>(),
  {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    stroke: undefined,
    strokeThickness: 1,
    strokeDashArray: undefined,
    strokeDashOffset: 0,
    strokeStartLineCap: 'Flat',
    strokeEndLineCap: 'Flat',
    strokeDashCap: 'Flat',
    strokeLineJoin: 'Miter',
    strokeMiterLimit: 10,
    opacity: 1,
  },
)

// —— 实例内唯一 id(SVG 渐变 / marker 引用需同文档内唯一)——
const safeUid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const gradientId = computed(() => `wui-line-brush-${safeUid}`)
const startCapMarkerId = computed(() => `wui-line-cap-start-${safeUid}`)
const endCapMarkerId = computed(() => `wui-line-cap-end-${safeUid}`)

// —— 自然尺寸(未显式给 width/height 时的缺省):组件坐标系以 (0,0) 为原点,取坐标最大值,
// 与 WinUI 中 Line 的 auto 尺寸口径一致(线段绘制在从原点起算的坐标空间里,可用 style/class 覆盖)。——
const naturalWidth = computed(() => Math.max(props.x1, props.x2, 0))
const naturalHeight = computed(() => Math.max(props.y1, props.y2, 0))

// —— 画刷解析:字符串 / solid / 渐变 → SVG paint(+ 渐变 defs 描述)——
interface GradientDef {
  kind: 'linearGradient' | 'radialGradient'
  attrs: Record<string, string>
  stops: Array<{ color: string; offset: string }>
}

interface ResolvedBrush {
  paint: string
  opacity: number
  gradient: GradientDef | null
}

/** 停止点 offset 归一:省略时按索引均匀分布(首 0 末 1)。 */
function normalizeStops(stops: WuiGradientStop[]): Array<{ color: string; offset: string }> {
  if (stops.length === 0) return []
  if (stops.length === 1) return [{ color: stops[0].color, offset: '0' }]
  return stops.map((stop, index) => ({
    color: stop.color,
    offset: String(stop.offset ?? index / (stops.length - 1)),
  }))
}

const resolvedBrush = computed<ResolvedBrush>(() => {
  const brush = props.stroke
  if (brush === undefined || brush === null || String(brush).trim() === '') {
    return { paint: 'none', opacity: 1, gradient: null }
  }
  if (typeof brush === 'string') return { paint: brush, opacity: 1, gradient: null }

  if (brush.type === 'solid') {
    return { paint: brush.color, opacity: brush.opacity ?? 1, gradient: null }
  }
  if (brush.stops.length === 0) return { paint: 'none', opacity: brush.opacity ?? 1, gradient: null }

  if (brush.type === 'linearGradient') {
    const attrs = {
      x1: String(brush.startX ?? 0),
      y1: String(brush.startY ?? 0),
      x2: String(brush.endX ?? naturalWidth.value),
      y2: String(brush.endY ?? naturalHeight.value),
    }
    return {
      paint: `url(#${gradientId.value})`,
      opacity: brush.opacity ?? 1,
      gradient: { kind: 'linearGradient', attrs, stops: normalizeStops(brush.stops) },
    }
  }
  // radialGradient
  const attrs: Record<string, string> = {
    cx: String(brush.centerX ?? naturalWidth.value / 2),
    cy: String(brush.centerY ?? naturalHeight.value / 2),
    r: String(brush.radius ?? Math.max(naturalWidth.value, naturalHeight.value) / 2),
  }
  if (brush.originX !== undefined) attrs.fx = String(brush.originX)
  if (brush.originY !== undefined) attrs.fy = String(brush.originY)
  return {
    paint: `url(#${gradientId.value})`,
    opacity: brush.opacity ?? 1,
    gradient: { kind: 'radialGradient', attrs, stops: normalizeStops(brush.stops) },
  }
})

// —— 虚线:WinUI 值为 StrokeThickness 的倍数 → SVG 用户单位需乘上粗细;
// 奇数个值时 SVG 规范自动重复列表成偶数个,与 WinUI 行为一致。——
const dashPattern = computed<number[] | null>(() => {
  const raw = props.strokeDashArray
  if (raw === undefined || raw === null) return null
  const parts = Array.isArray(raw) ? raw : String(raw).trim().split(/[\s,]+/)
  const values = parts.map(Number).filter((value) => Number.isFinite(value) && value >= 0)
  if (values.length === 0) return null
  const thickness = Math.max(props.strokeThickness, 0)
  return values.map((value) => value * thickness)
})

const dashArrayAttr = computed(() => dashPattern.value?.join(' '))
const dashOffsetAttr = computed(() =>
  dashPattern.value === null ? undefined : props.strokeDashOffset * Math.max(props.strokeThickness, 0),
)

// —— 线帽:PenLineCap → SVG stroke-linecap(Flat=butt / Square=square / Round=round;
// Triangle 无对应枚举,基线帽取 butt、经 marker 三角形补绘)。——
const CAP_TO_LINECAP: Record<WuiPenLineCap, 'butt' | 'square' | 'round'> = {
  Flat: 'butt',
  Square: 'square',
  Round: 'round',
  Triangle: 'butt',
}

const strokeLinecap = computed<'butt' | 'square' | 'round'>(() => {
  // 开启虚线后 SVG 的 linecap 同时作用于虚线段,取 dashCap(与 WinUI dashCap 语义最接近的近似);
  // 未开虚线时 dashCap 无视觉效果(与 WinUI 一致),取线帽——SVG 单值无法表达 start/end 不同,end 优先。
  if (dashPattern.value !== null) return CAP_TO_LINECAP[props.strokeDashCap]
  if (props.strokeStartLineCap === 'Triangle' && props.strokeEndLineCap === 'Triangle') return 'butt'
  if (props.strokeEndLineCap !== 'Triangle') return CAP_TO_LINECAP[props.strokeEndLineCap]
  return CAP_TO_LINECAP[props.strokeStartLineCap]
})

const strokeLinejoin = computed<'miter' | 'bevel' | 'round'>(() => {
  const join = props.strokeLineJoin
  return join === 'Bevel' ? 'bevel' : join === 'Round' ? 'round' : 'miter'
})

// —— Triangle 线帽经 marker 补绘:三角形底边垂直于线段、高/底边均等于描边粗细(markerUnits=strokeWidth
// 使 marker 坐标随粗细缩放),起点 orient=auto 沿线段方向向外延伸,近似 WinUI PenLineCap.Triangle。——
const startCapMarker = computed(() =>
  props.strokeStartLineCap === 'Triangle' ? `url(#${startCapMarkerId.value})` : undefined,
)
const endCapMarker = computed(() =>
  props.strokeEndLineCap === 'Triangle' ? `url(#${endCapMarkerId.value})` : undefined,
)

// —— 整体不透明度:UIElement.Opacity × Brush.Opacity(两者均钳制到 [0,1],与 WinUI 一致)——
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

const rootStyle = computed<CSSProperties | undefined>(() => {
  const total = clamp01(props.opacity) * clamp01(resolvedBrush.value.opacity)
  return total < 1 ? { opacity: total } : undefined
})
</script>

<template>
  <!-- Shape 非 Control:无模板、无视觉状态、无业务事件;class/style 经 $attrs 透传,
       width/height 属性为自然尺寸缺省(可被调用方 style 覆盖),overflow 可见与 WinUI 不裁剪一致 -->
  <svg v-bind="$attrs" class="wui-line" :width="naturalWidth" :height="naturalHeight" :style="rootStyle" focusable="false">
    <!-- 描边为渐变画刷描述时生成 SVG 渐变(用户空间坐标,见 WuiBrush 注释) -->
    <defs v-if="resolvedBrush.gradient">
      <linearGradient
        v-if="resolvedBrush.gradient.kind === 'linearGradient'"
        :id="gradientId"
        gradientUnits="userSpaceOnUse"
        v-bind="resolvedBrush.gradient.attrs"
      >
        <stop v-for="(stop, index) in resolvedBrush.gradient.stops" :key="index" :offset="stop.offset" :stop-color="stop.color" />
      </linearGradient>
      <radialGradient v-else :id="gradientId" gradientUnits="userSpaceOnUse" v-bind="resolvedBrush.gradient.attrs">
        <stop v-for="(stop, index) in resolvedBrush.gradient.stops" :key="index" :offset="stop.offset" :stop-color="stop.color" />
      </radialGradient>
    </defs>

    <!-- Triangle 线帽的 marker 三角形(每端一个;fill 跟随描边画刷,渐变 url 同文档可引用) -->
    <defs v-if="startCapMarker || endCapMarker">
      <marker
        v-if="startCapMarker"
        :id="startCapMarkerId"
        markerUnits="strokeWidth"
        markerWidth="1"
        markerHeight="1"
        refX="1"
        refY="0.5"
        orient="auto"
        overflow="visible"
      >
        <!-- 起点帽:三角形沿 -x(线段反方向)向外延伸,锚点 (1, 0.5) 对齐线段起点 -->
        <path d="M 1 0 L 0 0.5 L 1 1 Z" :fill="resolvedBrush.paint" />
      </marker>
      <marker
        v-if="endCapMarker"
        :id="endCapMarkerId"
        markerUnits="strokeWidth"
        markerWidth="1"
        markerHeight="1"
        refX="0"
        refY="0.5"
        orient="auto"
        overflow="visible"
      >
        <path d="M 0 0 L 1 0.5 L 0 1 Z" :fill="resolvedBrush.paint" />
      </marker>
    </defs>

    <line
      :x1="x1"
      :y1="y1"
      :x2="x2"
      :y2="y2"
      :stroke="resolvedBrush.paint"
      :stroke-width="strokeThickness"
      :stroke-dasharray="dashArrayAttr"
      :stroke-dashoffset="dashOffsetAttr"
      :stroke-linecap="strokeLinecap"
      :stroke-linejoin="strokeLinejoin"
      :stroke-miterlimit="strokeMiterLimit"
      :marker-start="startCapMarker"
      :marker-end="endCapMarker"
    />
  </svg>
</template>

<style scoped>
.wui-line {
  display: block;
  /* WinUI Shape 默认不被布局裁剪(无 Clip 时),SVG 视口缺省裁剪,这里放开以对齐;
     线段越出自然尺寸的部分与 WinUI 一致地可见 */
  overflow: visible;
}
</style>
