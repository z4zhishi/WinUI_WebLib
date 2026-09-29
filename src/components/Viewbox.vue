<script lang="ts">
// Viewbox(WinUI Viewbox 迁移):类型对外导出,供使用方与示例页引用。
/** 内容拉伸模式(WinUI Stretch)。 */
export type ViewboxStretch = 'Uniform' | 'UniformToFill' | 'Fill' | 'None'

/** 缩放方向约束(WinUI StretchDirection)。 */
export type ViewboxStretchDirection = 'UpOnly' | 'DownOnly' | 'Both'
</script>

<script setup lang="ts">
// WinUI Viewbox 复刻:内容缩放容器(布局类控件,无 ControlTemplate、无视觉状态、无业务事件)。
// 算法对照 CK/WinUI-Reference/dxaml/xcp/core/core/elements/Viewbox.cpp 的 ComputeScaleFactor:
// 子内容先按「无限可用尺寸」测得自然尺寸,再按 stretch 求比例 —— Uniform 取 min、UniformToFill
// 取 max、Fill 各轴独立、None 恒为 1;stretchDirection 在此之上做 UpOnly(>=1)/DownOnly(<=1)钳制。
// 实现选型:根元素尺寸由使用方布局约束(Width/Height/MaxWidth/MaxHeight),ResizeObserver 同时
// 观察根(可用尺寸)与内容元素(自然尺寸),内容元素以 transform: scale() 缩放(transform-origin
// 0 0,对应 WinUI ScaleTransform 默认原点、子元素在 (0,0) 处 Arrange 的语义);某轴无可用约束
// (测得 <= 0)时,按 WinUI MeasureOverride 的 DesiredSize 反推该轴自动尺寸。
// 差异:WinUI 的 Viewbox 不裁剪溢出内容(UniformToFill 会画出布局边界之外),本复刻按任务规格
// 在根元素上 overflow: hidden 默认裁剪,详见 wiki/controls/Viewbox.md。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiViewbox' })

const props = withDefaults(
  defineProps<{
    /** 内容拉伸方式(WinUI Stretch);缺省 Uniform。 */
    stretch?: ViewboxStretch
    /** 缩放方向(WinUI StretchDirection):UpOnly 只放大、DownOnly 只缩小、Both 不限;缺省 Both。 */
    stretchDirection?: ViewboxStretchDirection
    /** 容器最大宽度(WinUI FrameworkElement.MaxWidth);数字按 px,字符串原样作为 CSS 长度。 */
    maxWidth?: number | string
    /** 容器最大高度(WinUI FrameworkElement.MaxHeight);数字按 px,字符串原样作为 CSS 长度。 */
    maxHeight?: number | string
  }>(),
  {
    stretch: 'Uniform',
    stretchDirection: 'Both',
  },
)

// —— 测量:根元素 = 可用尺寸;内容元素 = 子内容自然尺寸(对应 XAML 以无限尺寸 Measure)——
const rootEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)

const availableWidth = ref(0)
const availableHeight = ref(0)
const contentWidth = ref(0)
const contentHeight = ref(0)

let observer: ResizeObserver | null = null

function onObserve(entries: ResizeObserverEntry[]): void {
  for (const entry of entries) {
    // contentRect 为布局盒(transform 不影响布局尺寸)
    if (entry.target === rootEl.value) {
      availableWidth.value = entry.contentRect.width
      availableHeight.value = entry.contentRect.height
    } else if (entry.target === contentEl.value) {
      contentWidth.value = entry.contentRect.width
      contentHeight.value = entry.contentRect.height
    }
  }
}

onMounted(() => {
  observer = new ResizeObserver(onObserve)
  if (rootEl.value) observer.observe(rootEl.value)
  if (contentEl.value) observer.observe(contentEl.value)
})

onBeforeUnmount(() => {
  // 组件卸载断开观察者,避免泄漏
  observer?.disconnect()
  observer = null
})

/** 「约等于 0」阈值:对应源码 IsCloseReal 的意义,过滤亚像素与浮点噪声。 */
const EPSILON = 0.0001

// —— ComputeScaleFactor 的逐行复刻(availableSize 用「非正视为无限」近似 Web 的无约束)——
const scale = computed<{ x: number; y: number }>(() => {
  const aw = availableWidth.value
  const ah = availableHeight.value
  const cw = contentWidth.value
  const ch = contentHeight.value
  const widthConstrained = aw > EPSILON
  const heightConstrained = ah > EPSILON

  // 源码:Stretch=None 或宽高都无约束时保持 1:1
  if (props.stretch === 'None' || (!widthConstrained && !heightConstrained)) {
    return { x: 1, y: 1 }
  }

  let scaleX = cw > EPSILON ? aw / cw : 0
  let scaleY = ch > EPSILON ? ah / ch : 0

  // 源码:某轴无约束时,该轴比例取另一轴;两轴都受约束时按 stretch 归一
  if (!widthConstrained) {
    scaleX = scaleY
  } else if (!heightConstrained) {
    scaleY = scaleX
  } else if (props.stretch === 'Uniform') {
    scaleX = scaleY = Math.min(scaleX, scaleY)
  } else if (props.stretch === 'UniformToFill') {
    scaleX = scaleY = Math.max(scaleX, scaleY)
  }
  // Fill(及 default):两轴保持各自比例

  // 源码:缩放方向钳制(UpOnly 只放大 / DownOnly 只缩小),Fill 分支同样生效
  if (props.stretchDirection === 'UpOnly') {
    scaleX = Math.max(1, scaleX)
    scaleY = Math.max(1, scaleY)
  } else if (props.stretchDirection === 'DownOnly') {
    scaleX = Math.min(1, scaleX)
    scaleY = Math.min(1, scaleY)
  }

  return { x: scaleX, y: scaleY }
})

// —— 无约束轴的自动尺寸:按 DesiredSize = scale * contentSize 反推(见 MeasureOverride)——
const autoWidth = computed(() =>
  availableWidth.value > EPSILON || contentWidth.value <= EPSILON
    ? undefined
    : scale.value.x * contentWidth.value,
)
const autoHeight = computed(() =>
  availableHeight.value > EPSILON || contentHeight.value <= EPSILON
    ? undefined
    : scale.value.y * contentHeight.value,
)

/** 数字 → px,字符串原样透传(空串视为未设置)。 */
function toCssLength(value: number | string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const rootStyle = computed<CSSProperties>(() => ({
  maxWidth: toCssLength(props.maxWidth),
  maxHeight: toCssLength(props.maxHeight),
  width: autoWidth.value !== undefined ? `${autoWidth.value}px` : undefined,
  height: autoHeight.value !== undefined ? `${autoHeight.value}px` : undefined,
}))

const contentStyle = computed<CSSProperties>(() => ({
  transform: `scale(${scale.value.x}, ${scale.value.y})`,
}))
</script>

<template>
  <!-- 纯布局容器:无交互态与业务事件;class/style 经 $attrs 透传给单根节点 -->
  <div v-bind="$attrs" ref="rootEl" class="wui-viewbox" :style="rootStyle">
    <div ref="contentEl" class="wui-viewbox__content" :style="contentStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.wui-viewbox {
  position: relative;
  /* WinUI 的 Viewbox 本身不裁剪溢出内容(UniformToFill 会画出边界之外,官方示例需 Border.Clip);
     本复刻按任务规格默认裁剪,与 WinUI 的差异已在 wiki 记录 */
  overflow: hidden;
}

.wui-viewbox__content {
  position: absolute;
  top: 0;
  left: 0;
  /* 以最大内容宽度布局,得到子内容的自然尺寸(对应 XAML 以无限可用尺寸 Measure 子元素) */
  width: max-content;
  /* WinUI ScaleTransform 默认原点 + 子元素 Arrange 在 (0,0):缩放锚定左上角 */
  transform-origin: 0 0;
}
</style>
