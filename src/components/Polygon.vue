<script setup lang="ts">
// Polygon —— WinUI Shape 家族之多边形:Points 顶点串(与 SVG points 同语法),自动闭合——
// 描边会连接末点回起点(WinUI 与 SVG <polygon> 行为一致),填充按 FillRule(EvenOdd 缺省)。
// 对照官方示例 ShapePage.xaml:Points="10,100 60,40 200,40 250,100" 的四边形轮廓。
import { computed, type CSSProperties } from 'vue'
import {
  boundsOfPoints,
  fmtNumber,
  computeShapeViewport,
  parsePoints,
  toFillRule,
  toLineJoin,
  resolveLength,
  type PenLineJoin,
  type ShapeFillRule,
  type ShapeStretch,
} from '@/utils/shapeGeometry'

const props = withDefaults(
  defineProps<{
    /** 顶点串(WinUI Points):数值以空白/逗号分隔,如 "10,100 60,40 200,40 250,100"。 */
    points?: string
    /** 填充规则(WinUI FillRule):EvenOdd(缺省)| Nonzero;自交多边形两者观感不同。 */
    fillRule?: ShapeFillRule
    /** 形状宽度(WinUI Width),px;缺省按几何自然尺寸。给定时配合 stretch 映射几何。 */
    width?: number | string
    /** 形状高度(WinUI Height),px;缺省按几何自然尺寸。 */
    height?: number | string
    /** 填充(WinUI Fill);缺省 null → 不填充。任意 CSS 颜色 / --wui-* 变量。 */
    fill?: string
    /** 描边色(WinUI Stroke);缺省 null → 不描边。任意 CSS 颜色 / --wui-* 变量。 */
    stroke?: string
    /** 描边厚度(WinUI StrokeThickness),px,不随 Stretch/几何缩放;缺省 1。 */
    strokeThickness?: number
    /** 虚线段长(WinUI StrokeDashArray):以 strokeThickness 为单位的数值序列。 */
    strokeDashArray?: string | number[]
    /** 折线连接样式(WinUI StrokeLineJoin);缺省 Miter。 */
    strokeLineJoin?: PenLineJoin
    /** 拉伸方式(WinUI Shape.Stretch):几何边界映射到视口;缺省 None(1:1 原坐标)。 */
    stretch?: ShapeStretch
    /** 不透明度(WinUI UIElement.Opacity,0–1);缺省 1。 */
    opacity?: number
  }>(),
  {
    points: '',
    fillRule: 'EvenOdd',
    strokeThickness: 1,
    strokeLineJoin: 'Miter',
    stretch: 'None',
    opacity: 1,
  },
)

defineOptions({ inheritAttrs: false, name: 'WuiPolygon' })

const coords = computed(() => parsePoints(props.points))
const bounds = computed(() => boundsOfPoints(coords.value) ?? { x: 0, y: 0, width: 0, height: 0 })

// 显式 Width/Height(数值语义);未给定时视口 = 几何自然尺寸(由 computeShapeViewport 兜底)
const viewportWidth = computed(() => (props.width !== undefined ? resolveLength(props.width, 0) : undefined))
const viewportHeight = computed(() => (props.height !== undefined ? resolveLength(props.height, 0) : undefined))

const geometry = computed(() =>
  computeShapeViewport(props.stretch, bounds.value, {
    viewportWidth: viewportWidth.value,
    viewportHeight: viewportHeight.value,
    strokePadding: props.strokeThickness,
  }),
)

const dashArray = computed<string | undefined>(() => {
  const raw = props.strokeDashArray
  if (raw === undefined) return undefined
  const values = (typeof raw === 'string' ? raw.trim().split(/[\s,]+/).filter(Boolean) : raw.map(String))
    .map(Number)
    .filter((value) => Number.isFinite(value))
  if (values.length === 0) return undefined
  const unit = props.strokeThickness / geometry.value.scale
  return values.map((value) => fmtNumber(value * unit)).join(' ')
})

const paintStyle = computed<CSSProperties>(() => ({
  fill: props.fill ?? 'none',
  fillRule: toFillRule(props.fillRule),
  stroke: props.stroke,
  strokeWidth: `${fmtNumber(props.strokeThickness / geometry.value.scale)}px`,
  strokeDasharray: dashArray.value,
  strokeLinejoin: toLineJoin(props.strokeLineJoin),
}))

const rootStyle = computed<CSSProperties>(() => ({
  width: `${geometry.value.width}px`,
  height: `${geometry.value.height}px`,
  overflow: geometry.value.clip ? 'hidden' : 'visible',
  opacity: props.opacity,
}))
</script>

<template>
  <svg
    v-bind="$attrs"
    class="wui-polygon"
    :viewBox="geometry.viewBox"
    :style="rootStyle"
    focusable="false"
  >
    <g :transform="geometry.transform">
      <!-- points 原样透传:WinUI Points 与 SVG points 同语法 -->
      <polygon :points="points" :style="paintStyle" />
    </g>
  </svg>
</template>

<style scoped>
.wui-polygon {
  display: block;
}
</style>
