<script lang="ts">
// ParallaxView(WinUI ParallaxView 迁移):类型对外导出,供使用方与示例页引用。
/** 源偏移种类(WinUI ParallaxSourceOffsetKind):Relative 在自动值上叠加、Absolute 为绝对值。 */
export type ParallaxSourceOffsetKind = 'Absolute' | 'Relative'
</script>

<script setup lang="ts">
// WinUI ParallaxView 复刻:视差容器 —— 滚动源(ScrollViewer/ScrollView/任意可滚元素)滚动时,
// Child(slot)按比例平移,产生「背景比前景慢」的深度感。
// 源码对照 CK/WinUI-Reference/controls/dev/ParallaxView/:
//   ParallaxView.cpp    —— ArrangeOverride 的子元素扩展 + RectangleGeometry 视野裁剪(overflow: hidden)
//   ScrollInputHelper.cpp —— 源解析、越界平移上限(UpdateOutOfBoundsPanSize:ScrollViewer 缩放禁用时
//                          为视口 10%)、target 是否在源内(UpdateIsTargetElementInSource)
//   UpdateStartOffsetExpression / UpdateEndOffsetExpression / UpdateExpressionAnimation ——
//                          视差表达式,computeAxis() 逐式复刻(含 API 测试 ParallaxViewTests.cs 的
//                          VerifyBasicParallaxingWithScrollViewer / WithClamping / WithMaxRatios /
//                          WithoutClamping 四组期望值验证,数值完全一致)
// 实现选型:WinUI 用 ElementCompositionPreview 在合成器线程给 Child 视觉挂平移动画;Web 无该通道,
// 改为「源元素 scroll 事件(rAF 节流)+ ResizeObserver(源/根/源内容尺寸)→ 主线程重算 →
// transform: translate3d 写在 Child 包裹层」。默认滚动源为最近可滚祖先(overflow: auto/scroll/overlay),
// 亦可用 source prop 显式绑定(对应官方示例 Source="{Binding ElementName=listView}" 的兄弟源)。
// 差异(详见 wiki/controls/ParallaxView.md):无缩放联动(scale 恒 1)、越界平移固定取 ScrollViewer
// 的 0.1×视口分支、子元素扩展恒应用(shift ≠ 0 的轴撑到 100% + |shift|)等。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiParallaxView' })

const props = withDefaults(
  defineProps<{
    /** 垂直视差强度(WinUI VerticalShift),px;0 = 禁用该轴。正值 = 子元素慢于滚动,负值 = 反向。 */
    verticalShift?: number
    /** 水平视差强度(WinUI HorizontalShift),px;0 = 禁用该轴。 */
    horizontalShift?: number
    /** 垂直平移速率上限(WinUI MaxVerticalShiftRatio,默认 1.0):每滚动 1px 子元素最多移动的 px。 */
    maxVerticalShiftRatio?: number
    /** 水平平移速率上限(WinUI MaxHorizontalShiftRatio)。 */
    maxHorizontalShiftRatio?: number
    /** 是否把垂直平移钳制在 ±VerticalShift 内(WinUI IsVerticalShiftClamped,默认 true)。 */
    isVerticalShiftClamped?: boolean
    /** 是否把水平平移钳制在 ±HorizontalShift 内(WinUI IsHorizontalShiftClamped)。 */
    isHorizontalShiftClamped?: boolean
    /** 垂直源偏移种类(WinUI VerticalSourceOffsetKind):Relative 在自动值上叠加、Absolute 为绝对值。 */
    verticalSourceOffsetKind?: ParallaxSourceOffsetKind
    /** 水平源偏移种类(WinUI HorizontalSourceOffsetKind)。 */
    horizontalSourceOffsetKind?: ParallaxSourceOffsetKind
    /** 垂直源起始偏移(WinUI VerticalSourceStartOffset);Relative 时叠加到自动值,Absolute 时为绝对值。 */
    verticalSourceStartOffset?: number
    /** 垂直源结束偏移(WinUI VerticalSourceEndOffset)。 */
    verticalSourceEndOffset?: number
    /** 水平源起始偏移(WinUI HorizontalSourceStartOffset)。 */
    horizontalSourceStartOffset?: number
    /** 水平源结束偏移(WinUI HorizontalSourceEndOffset)。 */
    horizontalSourceEndOffset?: number
    /**
     * 滚动源元素(WinUI Source):滚动的触发者。传 undefined(缺省)时自动取最近可滚祖先
     * (overflow: auto/scroll/overlay);传 null 显式禁用;传 HTMLElement 显式绑定(可为兄弟元素)。
     */
    source?: HTMLElement | null
  }>(),
  {
    verticalShift: 0,
    horizontalShift: 0,
    maxVerticalShiftRatio: 1.0,
    maxHorizontalShiftRatio: 1.0,
    isVerticalShiftClamped: true,
    isHorizontalShiftClamped: true,
    verticalSourceOffsetKind: 'Relative',
    horizontalSourceOffsetKind: 'Relative',
    verticalSourceStartOffset: 0,
    verticalSourceEndOffset: 0,
    horizontalSourceStartOffset: 0,
    horizontalSourceEndOffset: 0,
  },
)

// —— DOM 引用:根 = 容器 + 裁剪;包裹层 = WinUI 施加平移动画的「Child 视觉」——
const rootEl = ref<HTMLElement | null>(null)

// —— 当前视差平移(只读暴露,供调试读数;px,负值 = 向上/向左)——
const parallaxX = ref(0)
const parallaxY = ref(0)

// ===================================================================================
// 源解析:显式 source 优先,否则最近可滚祖先(与 ScrollViewer.vue 的 overflow 判定约定一致)
// ===================================================================================
function isScrollableElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  return [style.overflowX, style.overflowY].some(
    (overflow) => overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay',
  )
}

function findNearestScrollableAncestor(start: HTMLElement | null): HTMLElement | null {
  let node = start?.parentElement ?? null
  while (node) {
    if (isScrollableElement(node)) return node
    node = node.parentElement
  }
  return null
}

function resolveSource(): HTMLElement | null {
  // 显式 null = 禁用;undefined = 缺省,自动找最近可滚祖先
  if (props.source !== undefined) return props.source
  return findNearestScrollableAncestor(rootEl.value)
}

// ===================================================================================
// 视差数学:UpdateExpressionAnimation 三段分段式的逐式复刻(Web 无缩放,scale 恒 1)
// ===================================================================================
/** ScrollViewer 缩放禁用时的越界平移比例(ScrollInputHelper.UpdateOutOfBoundsPanSize 的 0.1 分支)。 */
const OVERPAN_RATIO = 0.1

interface ParallaxAxisInput {
  /** 滚动量 X = -source.TranslationY ≙ scrollLeft/scrollTop(正 = 向末端滚动)。 */
  scroll: number
  /** 该轴视差强度 shift;0 = 禁用。 */
  shift: number
  /** 源起始/结束偏移参数(消费方设定值)。 */
  startParam: number
  endParam: number
  /** 源偏移种类。 */
  kind: ParallaxSourceOffsetKind
  /** 是否钳制在 ±shift 内。 */
  clamped: boolean
  /** 速率上限(已取 max(0, ·),对应源码 SetScalarParameter(L"maxRatio", max(0.0, ·)))。 */
  maxRatio: number
  /** 源视口尺寸(.setViewportSize:Web 取 clientWidth/Height)。 */
  viewport: number
  /** 源内容尺寸(.GetContentSize:Web 取 scrollWidth/Height)。 */
  content: number
  /** 越界平移上限(maxUnderpan/maxOverpan:0.1 × 视口)。 */
  pan: number
  /** 目标(Child)是否在源内(UpdateIsTargetElementInSource)。 */
  inSource: boolean
  /** 目标在源内时:ParallaxView 在滚动内容坐标系中的偏移与尺寸(GetOffsetFromScrollContentElement)。 */
  elementOffset: number
  elementSize: number
}

function computeAxis(input: ParallaxAxisInput): number {
  const { scroll, shift, startParam, endParam, kind, clamped, maxRatio, viewport, content, pan, inSource, elementOffset, elementSize } = input
  if (shift === 0) return 0

  // —— 源起始偏移(UpdateStartOffsetExpression)——
  let start: number
  // —— 源结束偏移(UpdateEndOffsetExpression)——
  let end: number
  if (kind === 'Relative') {
    if (inSource) {
      // start = (ParallaxViewOffset + startOffset) * scale - viewportSize - maxUnderpanOffset
      start = elementOffset + startParam - viewport - pan
      // end = (ParallaxViewOffset + ParallaxViewSize + endOffset) * scale + maxOverpanOffset
      end = elementOffset + elementSize + endParam + pan
    } else {
      // start = startOffset * scale - maxUnderpanOffset
      start = startParam - pan
      // end = Max(0, (contentSize + endOffset) * scale - viewportSize) + maxOverpanOffset
      end = Math.max(0, content + endParam - viewport) + pan
    }
  } else {
    // Absolute:startOffset > 0 时乘缩放(scale = 1,原样取值)
    start = startParam
    if (content > viewport) {
      end =
        endParam <= content - viewport
          ? Math.max(0, endParam)
          : Math.max(0, content - viewport) + endParam - content + viewport
    } else {
      end =
        endParam <= 0
          ? Math.max(0, content + endParam - viewport)
          : Math.max(0, content - viewport) + endParam
    }
  }

  const x = scroll
  // —— 平移表达式 P(X)(UpdateExpressionAnimation;负值 = 子元素向上/向左移动)——
  if (clamped) {
    if (shift > 0) {
      if (x <= start) return 0
      if (x < end) return -Math.min(maxRatio, shift / (end - start)) * (x - start)
      return -Math.min(maxRatio * Math.max(0, end - start), shift)
    }
    if (x <= start) return -Math.min(maxRatio * Math.max(0, end - start), -shift)
    if (x < end) return Math.min(maxRatio, shift / (start - end)) * (x - end)
    return 0
  }
  // 未钳制:start == end 时恒 0,否则沿整段滚动范围线性移动(超出 ±shift 后会露出底边,与源一致)
  if (start === end) return 0
  if (shift > 0) return -Math.min(maxRatio, shift / (end - start)) * (x - start)
  return Math.min(maxRatio, shift / (start - end)) * (x - end)
}

// ===================================================================================
// 更新:重读源状态并重算两轴平移(scroll / RO / 属性变化统一走这里;全部实时读 DOM,无缓存过期)
// ===================================================================================
let rafId = 0

function update(): void {
  rafId = 0
  const source = currentSource
  const root = rootEl.value
  if (!source || !root || source === root) {
    parallaxX.value = 0
    parallaxY.value = 0
    return
  }

  const viewportWidth = source.clientWidth
  const viewportHeight = source.clientHeight
  const contentWidth = source.scrollWidth
  const contentHeight = source.scrollHeight
  const panX = viewportWidth * OVERPAN_RATIO
  const panY = viewportHeight * OVERPAN_RATIO

  // 目标(根)是否在源内 —— 对应 UpdateIsTargetElementInSource 的祖先链检查
  const inSource = source.contains(root)

  // 目标在源内时:ParallaxView 相对滚动内容原点的偏移与自身尺寸(对应 GetOffsetFromScrollContentElement;
  // Web 用 rect 差 + 已滚偏移重建内容坐标系,内容原点取源的首个元素子节点,退化取源自身)
  let elementOffsetX = 0
  let elementOffsetY = 0
  let elementSizeX = viewportWidth
  let elementSizeY = viewportHeight
  if (inSource) {
    const contentNode = source.firstElementChild instanceof HTMLElement ? source.firstElementChild : source
    const contentRect = contentNode.getBoundingClientRect()
    const rootRect = root.getBoundingClientRect()
    elementOffsetX = rootRect.left - contentRect.left + source.scrollLeft
    elementOffsetY = rootRect.top - contentRect.top + source.scrollTop
    elementSizeX = rootRect.width
    elementSizeY = rootRect.height
  }

  parallaxY.value = computeAxis({
    scroll: source.scrollTop,
    shift: props.verticalShift,
    startParam: props.verticalSourceStartOffset,
    endParam: props.verticalSourceEndOffset,
    kind: props.verticalSourceOffsetKind,
    clamped: props.isVerticalShiftClamped,
    maxRatio: Math.max(0, props.maxVerticalShiftRatio),
    viewport: viewportHeight,
    content: contentHeight,
    pan: panY,
    inSource,
    elementOffset: elementOffsetY,
    elementSize: elementSizeY,
  })
  parallaxX.value = computeAxis({
    scroll: source.scrollLeft,
    shift: props.horizontalShift,
    startParam: props.horizontalSourceStartOffset,
    endParam: props.horizontalSourceEndOffset,
    kind: props.horizontalSourceOffsetKind,
    clamped: props.isHorizontalShiftClamped,
    maxRatio: Math.max(0, props.maxHorizontalShiftRatio),
    viewport: viewportWidth,
    content: contentWidth,
    pan: panX,
    inSource,
    elementOffset: elementOffsetX,
    elementSize: elementSizeX,
  })
}

/** rAF 节流:滚动高频触发,每帧最多重算一次。 */
function scheduleUpdate(): void {
  if (rafId) return
  rafId = requestAnimationFrame(update)
}

// —— 源绑定与观察(滚动事件 + 源/源内容/根的尺寸变化,对应源码各 Hook*)——
let currentSource: HTMLElement | null = null
let resizeObserver: ResizeObserver | null = null
let observedContent: HTMLElement[] = []

function bindSource(next: HTMLElement | null): void {
  if (next === currentSource) return

  if (currentSource) {
    currentSource.removeEventListener('scroll', scheduleUpdate)
    resizeObserver?.unobserve(currentSource)
  }
  for (const node of observedContent) resizeObserver?.unobserve(node)
  observedContent = []

  currentSource = next

  if (currentSource && resizeObserver) {
    currentSource.addEventListener('scroll', scheduleUpdate, { passive: true })
    resizeObserver.observe(currentSource)
    // 源内容尺寸变化(内容增删/子元素尺寸)→ endOffset 随 scrollWidth/Height 变化;观察直接子节点
    for (const child of currentSource.children) {
      if (child instanceof HTMLElement) {
        resizeObserver.observe(child)
        observedContent.push(child)
      }
    }
  }
  scheduleUpdate()
}

// 根元素尺寸变化(SizeChanged → UpdateEndOffsetExpression 重算)
function observeRoot(): void {
  const root = rootEl.value
  if (root && resizeObserver) resizeObserver.observe(root)
}

onMounted(() => {
  resizeObserver = new ResizeObserver(() => scheduleUpdate())
  observeRoot()
  bindSource(resolveSource())
  update()
})

onBeforeUnmount(() => {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  if (currentSource) {
    currentSource.removeEventListener('scroll', scheduleUpdate)
    resizeObserver?.unobserve(currentSource)
  }
  for (const node of observedContent) resizeObserver?.unobserve(node)
  observedContent = []
  resizeObserver?.disconnect()
  resizeObserver = null
  currentSource = null
})

// 源切换(含模板 ref 后到的场景:兄弟滚动源在挂载后才解析出元素)
watch(
  () => props.source,
  () => {
    bindSource(resolveSource())
  },
)

// 任一视差参数变化 → 重算(对应 OnPropertyChanged 的 UpdateExpressionAnimation 分支)
watch(
  () =>
    [
      props.verticalShift,
      props.horizontalShift,
      props.maxVerticalShiftRatio,
      props.maxHorizontalShiftRatio,
      props.isVerticalShiftClamped,
      props.isHorizontalShiftClamped,
      props.verticalSourceOffsetKind,
      props.horizontalSourceOffsetKind,
      props.verticalSourceStartOffset,
      props.verticalSourceEndOffset,
      props.horizontalSourceStartOffset,
      props.horizontalSourceEndOffset,
    ] as const,
  () => scheduleUpdate(),
)

// —— RefreshAutomatic*Offsets(WinUI API 面):Web 侧偏移每帧实时计算,方法仅为兼容,触发一次重算 ——
function refreshAutomaticHorizontalOffsets(): void {
  scheduleUpdate()
}
function refreshAutomaticVerticalOffsets(): void {
  scheduleUpdate()
}

defineExpose({
  /** 重算水平自动源偏移(WinUI RefreshAutomaticHorizontalOffsets;Web 侧等价于触发一次重算)。 */
  refreshAutomaticHorizontalOffsets,
  /** 重算垂直自动源偏移(WinUI RefreshAutomaticVerticalOffsets)。 */
  refreshAutomaticVerticalOffsets,
  /** 当前水平视差平移(Web 扩展只读,px,调试读数用)。 */
  parallaxX,
  /** 当前垂直视差平移(Web 扩展只读,px,调试读数用)。 */
  parallaxY,
})

// —— Child 包裹层样式:ArrangeOverride 的子元素扩展(扩展恒应用,差异见 wiki)+ 实时平移 ——
const childStyle = computed<CSSProperties>(() => {
  const hShift = props.horizontalShift
  const vShift = props.verticalShift
  return {
    width: hShift !== 0 ? `calc(100% + ${Math.abs(hShift)}px)` : undefined,
    height: vShift !== 0 ? `calc(100% + ${Math.abs(vShift)}px)` : undefined,
    transform: `translate3d(${parallaxX.value}px, ${parallaxY.value}px, 0)`,
  }
})
</script>

<template>
  <!-- 根 = ParallaxView 容器:overflow hidden 对应 ArrangeOverride 末尾的矩形 Clip(子元素不画出边界)。
       $attrs 放在显式绑定之后,消费方 class/style 优先(如 demo 里以 inline style 改为绝对定位) -->
  <div ref="rootEl" class="wui-parallax-view" v-bind="$attrs">
    <!-- 包裹层 = 目标视觉(Child):WinUI 对 Child 元素视觉挂 Translation 动画,Web 以 transform 等价 -->
    <div class="wui-parallax-view__child" :style="childStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.wui-parallax-view {
  position: relative;
  /* 视野裁剪:ArrangeOverride 给自身设置与 arrange 矩形同大的 RectangleGeometry.Clip */
  overflow: hidden;
}

.wui-parallax-view__child {
  /* Child 默认占满容器(Stretch 对齐、锚定左上,扩展量挂在 shift ≠ 0 的轴上);
     slot 内容建议 width/height 100% 或 object-fit 填满包裹层 */
  width: 100%;
  height: 100%;
  /* 平移高频更新,提升到合成层避免重排抖动(对应源码 ElementVisual 的 Translation) */
  will-change: transform;
}
</style>
