<script setup lang="ts">
// Path —— WinUI Shape 家族之路径:Data 接受 XAML 路径迷你语言(F0/F1 前缀可选,其余与 SVG
// path d 语法兼容)。F0/F1 解析思路与 PathIcon.vue 相同(XAML 缺省 EvenOdd),但渲染路径独立:
// PathIcon 是「图标控件」(单色前景、viewBox 由调用方给定、装饰性);本组件是「几何形状」——
// 解析几何边界后按 Shape.Stretch 映射到视口,fill/stroke/描边参数独立可调,详见 wiki/controls/Shape.md。
// 边界为近似(直线精确;曲线以控制点计入,A 弧不计极值),仅用于 Stretch 映射与自然尺寸,见 wiki。
import { computed, type CSSProperties } from 'vue'
import {
  fmtNumber,
  computeShapeViewport,
  parsePathGeometry,
  resolveLength,
  toLineJoin,
  type PenLineJoin,
  type ShapeStretch,
} from '@/utils/shapeGeometry'

const props = withDefaults(
  defineProps<{
    /** 路径数据(WinUI Path.Data):XAML 路径迷你语言,如 "F1 M 16,12 20,2L 20,16 1,16"。 */
    data?: string
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
    data: '',
    strokeThickness: 1,
    strokeLineJoin: 'Miter',
    stretch: 'None',
    opacity: 1,
  },
)

defineOptions({ inheritAttrs: false, name: 'WuiPath' })

// F0/F1 前缀 → fill-rule(XAML 缺省 EvenOdd);d 原样交给 <path>;bounds 供 Stretch 映射
const parsed = computed(() => parsePathGeometry(props.data))
const NO_GEOMETRY = { x: 0, y: 0, width: 0, height: 0 }
const geometryBounds = computed(() => parsed.value.bounds ?? NO_GEOMETRY)

const viewportWidth = computed(() => (props.width !== undefined ? resolveLength(props.width, 0) : undefined))
const viewportHeight = computed(() => (props.height !== undefined ? resolveLength(props.height, 0) : undefined))

const geometry = computed(() =>
  computeShapeViewport(props.stretch, geometryBounds.value, {
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
  fillRule: parsed.value.fillRule,
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
    class="wui-path"
    :viewBox="geometry.viewBox"
    :style="rootStyle"
    focusable="false"
  >
    <g :transform="geometry.transform">
      <path :d="parsed.d" :style="paintStyle" />
    </g>
  </svg>
</template>

<style scoped>
.wui-path {
  display: block;
}
</style>
