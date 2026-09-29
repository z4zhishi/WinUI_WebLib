<script setup lang="ts">
// Rectangle —— WinUI Shape 家族之矩形:Width/Height 即形状尺寸,RadiusX/RadiusY 为圆角椭圆半径
// (与 CSS border-radius 的「统一半径简写」不同,两轴半径独立)。Stroke 居中描在边界上,
// 外半溢出布局边界(WinUI 不裁剪,overflow:visible 对齐)。几何 = 布局矩形,Stretch 无视觉效果。
import { computed, type CSSProperties } from 'vue'
import {
  fmtNumber,
  computeShapeViewport,
  resolveLength,
  toLineJoin,
  type PenLineJoin,
  type ShapeStretch,
} from '@/utils/shapeGeometry'

const props = withDefaults(
  defineProps<{
    /** 形状宽度(WinUI Width),px。 */
    width?: number | string
    /** 形状高度(WinUI Height),px。 */
    height?: number | string
    /** 圆角 X 轴半径(WinUI RadiusX),px;0 = 直角。负值按 0 处理。 */
    radiusX?: number
    /** 圆角 Y 轴半径(WinUI RadiusY),px;0 = 直角。负值按 0 处理。 */
    radiusY?: number
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
    /** 拉伸方式(WinUI Shape.Stretch);矩形几何即布局矩形,无视觉效果。 */
    stretch?: ShapeStretch
    /** 不透明度(WinUI UIElement.Opacity,0–1);缺省 1。 */
    opacity?: number
  }>(),
  {
    width: 100,
    height: 100,
    radiusX: 0,
    radiusY: 0,
    strokeThickness: 1,
    strokeLineJoin: 'Miter',
    stretch: 'None',
    opacity: 1,
  },
)

defineOptions({ inheritAttrs: false, name: 'WuiRectangle' })

const widthValue = computed(() => resolveLength(props.width, 100))
const heightValue = computed(() => resolveLength(props.height, 100))

const geometry = computed(() =>
  computeShapeViewport(props.stretch, { x: 0, y: 0, width: widthValue.value, height: heightValue.value }, {
    viewportWidth: widthValue.value,
    viewportHeight: heightValue.value,
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
    class="wui-rectangle"
    :viewBox="geometry.viewBox"
    :style="rootStyle"
    focusable="false"
  >
    <rect
      :width="widthValue"
      :height="heightValue"
      :rx="Math.max(radiusX, 0)"
      :ry="Math.max(radiusY, 0)"
      :style="paintStyle"
    />
  </svg>
</template>

<style scoped>
.wui-rectangle {
  display: block;
}
</style>
