<script setup lang="ts">
// Ellipse —— WinUI Shape 家族之椭圆:Width/Height 即形状尺寸(几何 = 布局矩形,内切椭圆),
// Stroke 居中描在边界上(外半溢出布局边界,WinUI 不裁剪;本组件以 overflow:visible 对齐)。
// 椭圆的几何由布局尺寸决定,Stretch 无视觉效果(与 WinUI 一致,保留属性以统一家族签名)。
// 与 PathIcon 的区分:PathIcon 是图标控件(单色前景、装饰性、viewBox 由调用方给定);
// 本组件是几何形状(独立 fill/stroke/描边参数,参与布局),见 wiki/controls/Shape.md。
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
    /** 形状宽度(WinUI Width),px;亦是椭圆直径。 */
    width?: number | string
    /** 形状高度(WinUI Height),px;亦是椭圆短轴。 */
    height?: number | string
    /** 填充(WinUI Fill);缺省 null → 不填充(SVG fill 需显式 none)。任意 CSS 颜色 / --wui-* 变量。 */
    fill?: string
    /** 描边色(WinUI Stroke);缺省 null → 不描边。任意 CSS 颜色 / --wui-* 变量。 */
    stroke?: string
    /** 描边厚度(WinUI StrokeThickness),px,不随 Stretch/几何缩放;缺省 1。 */
    strokeThickness?: number
    /** 虚线段长(WinUI StrokeDashArray):以 strokeThickness 为单位的数值序列,如 "2 2" 或 [2, 2]。 */
    strokeDashArray?: string | number[]
    /** 折线连接样式(WinUI StrokeLineJoin);缺省 Miter。 */
    strokeLineJoin?: PenLineJoin
    /** 拉伸方式(WinUI Shape.Stretch);椭圆几何即布局矩形,无视觉效果。 */
    stretch?: ShapeStretch
    /** 不透明度(WinUI UIElement.Opacity,0–1);缺省 1。 */
    opacity?: number
  }>(),
  {
    width: 100,
    height: 100,
    strokeThickness: 1,
    strokeLineJoin: 'Miter',
    stretch: 'None',
    opacity: 1,
  },
)

defineOptions({ inheritAttrs: false, name: 'WuiEllipse' })

const widthValue = computed(() => resolveLength(props.width, 100))
const heightValue = computed(() => resolveLength(props.height, 100))

// 椭圆几何 = 布局矩形(0,0,w,h),视口与几何同尺寸 → 变换恒等
const geometry = computed(() =>
  computeShapeViewport(props.stretch, { x: 0, y: 0, width: widthValue.value, height: heightValue.value }, {
    viewportWidth: widthValue.value,
    viewportHeight: heightValue.value,
    strokePadding: props.strokeThickness,
  }),
)

/** 虚线段长换算:WinUI 以 StrokeThickness 为单位,再除以拉伸倍数保持视觉长度(SVG 为用户单位)。 */
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

/** 填充/描边经 inline style 施加:CSS 属性支持 var() 取 --wui-* token(表现属性不支持)。 */
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
  // WinUI 描边溢出边界不裁剪;仅 UniformToFill 把溢出几何裁剪到形状边界
  overflow: geometry.value.clip ? 'hidden' : 'visible',
  opacity: props.opacity,
}))
</script>

<template>
  <!-- 非交互纯形状:无业务事件;class/style/aria 等经 $attrs 透传 -->
  <svg
    v-bind="$attrs"
    class="wui-ellipse"
    :viewBox="geometry.viewBox"
    :style="rootStyle"
    focusable="false"
  >
    <ellipse
      :cx="widthValue / 2"
      :cy="heightValue / 2"
      :rx="widthValue / 2"
      :ry="heightValue / 2"
      :style="paintStyle"
    />
  </svg>
</template>

<style scoped>
.wui-ellipse {
  display: block;
}
</style>
