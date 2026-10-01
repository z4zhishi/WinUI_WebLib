<script lang="ts">
// ScrollViewer(WinUI ScrollViewer 迁移):类型对外导出,供使用方与示例页引用。
/** 滚动模式(WinUI ScrollMode):Auto 按需、Enabled 恒可滚、Disabled 仅拦截用户输入(编程滚动不受限)。 */
export type ScrollMode = 'Auto' | 'Enabled' | 'Disabled'

/** 滚动条可见性(WinUI ScrollBarVisibility)。 */
export type ScrollBarVisibility = 'Auto' | 'Visible' | 'Hidden' | 'Disabled'

/** 缩放模式(WinUI ZoomMode)。 */
export type ZoomMode = 'Disabled' | 'Enabled'

/** viewChanged 事件负载(对应 WinUI ScrollViewerViewChangedEventArgs,防抖后的最终视图)。 */
export interface ScrollViewerViewChangedDetail {
  /** 水平偏移(缩放后的视区坐标,对应 WinUI HorizontalOffset)。 */
  horizontalOffset: number
  /** 垂直偏移。 */
  verticalOffset: number
  /** 当前缩放系数。 */
  zoomFactor: number
}
</script>

<script setup lang="ts">
// WinUI ScrollViewer 复刻:滚动 / 平移 / 缩放容器(阶段 2 高价值基建,后续列表类控件依赖)。
// 视觉与结构对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 的
// <Style TargetType="ScrollViewer">(L8024 起):Root Border → Grid(Background)→
// ScrollContentPresenter(Margin = Padding)+ 横/竖 ScrollBar。
// Web 实现选型:滚动用原生 overflow 承载(滚动条按 --wui-scroll-bar-* token 样式化为
// WinUI 细拇指观感);缩放按 WinUI 语义「内容按未缩放尺寸布局,再整体 scale 变换」
// (transform 缩放的溢出计入滚动溢出区,滚动范围随缩放自动增长);
// Ctrl+滚轮(含触控板捏合)缩放,视口中心锚定;ViewChanged 事件在滚动/缩放静止后防抖发出。
// 编程 API 对照 WinUI ChangeView / ScrollToHorizontalOffset 系列(见 defineExpose)。
// ScrollBarVisibility 与 ScrollMode 职责严格分立(对照 ScrollViewer_Partial.cpp:
// UpdateCanScroll L5373 只以可见性决定 CanScroll,编程滚动同受此门控;
// OnHorizontal/VerticalScrollBarScroll L5417/5451 显示 ScrollMode=Disabled 连滚动条
// 拖拽一并忽略)——故 overflow 仅按 visibility 映射,ScrollMode=Disabled 改为逐通道
// 拦截用户输入(滚轮 / touch-action / 方向键 / 滚动条栏位覆盖层),编程滚动不受限;
// 滚轮豁免内容内嵌套可滚子区域,栏位覆盖层仅在该轴滚动条实际显示时渲染(fix round 2)。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ name: 'WuiScrollViewer', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 水平滚动模式(WinUI HorizontalScrollMode);缺省 Auto。 */
    horizontalScrollMode?: ScrollMode
    /** 垂直滚动模式(WinUI VerticalScrollMode);缺省 Auto。 */
    verticalScrollMode?: ScrollMode
    /** 水平滚动条可见性(WinUI HorizontalScrollBarVisibility);缺省 Auto。 */
    horizontalScrollBarVisibility?: ScrollBarVisibility
    /** 垂直滚动条可见性(WinUI VerticalScrollBarVisibility);WinUI 默认样式为 Visible。 */
    verticalScrollBarVisibility?: ScrollBarVisibility
    /** 缩放模式(WinUI ZoomMode):Enabled 时 Ctrl+滚轮(含触控板捏合)缩放;缺省 Disabled。 */
    zoomMode?: ZoomMode
    /** 最小缩放系数(WinUI MinZoomFactor);缺省 0.1。 */
    minZoomFactor?: number
    /** 最大缩放系数(WinUI MaxZoomFactor);缺省 10。 */
    maxZoomFactor?: number
    /** 内容内边距(WinUI Padding);数字按 px,字符串原样作为 CSS 长度;缺省 0。 */
    padding?: number | string
    /** 背景色(WinUI Background);任意 CSS color,缺省透明。 */
    background?: string
    /** 是否可聚焦(WinUI IsTabStop)。a11y 修订:滚动视口恒 tabindex=0(WCAG 2.1.1 键盘滚动
     *  / axe scrollable-region-focusable),本属性保留 API 兼容,不再影响 Tab 序。 */
    isTabStop?: boolean
  }>(),
  {
    horizontalScrollMode: 'Auto',
    verticalScrollMode: 'Auto',
    horizontalScrollBarVisibility: 'Auto',
    verticalScrollBarVisibility: 'Visible',
    zoomMode: 'Disabled',
    minZoomFactor: 0.1,
    maxZoomFactor: 10,
    padding: 0,
    background: 'transparent',
    isTabStop: false,
  },
)

/** 当前缩放系数,支持 v-model:zoom-factor(WinUI ZoomFactor)。 */
const zoomFactorModel = defineModel<number>('zoomFactor', { default: 1 })

// 显式声明业务事件,防止单根节点下原生事件透传导致的重复触发。
const emit = defineEmits<{
  /** 原生 scroll 透传(每次视区滚动都触发,WinUI 对应 ScrollChanged 的滚动部分)。 */
  (e: 'scroll', event: Event): void
  /** 视图稳定后触发(防抖;对应 WinUI ViewChanged 的 IsIntermediate=false 最终回调)。 */
  (e: 'viewChanged', detail: ScrollViewerViewChangedDetail): void
  /** 缩放系数变化时触发(含 Ctrl+滚轮、changeView 与外部 v-model 写入)。 */
  (e: 'zoomFactorChanged', zoomFactor: number): void
}>()

// —— 元素引用 ——
const scrollerEl = ref<HTMLElement | null>(null)

// —— 当前视区状态(缩放后的视区坐标,语义同 WinUI HorizontalOffset/VerticalOffset)——
const horizontalOffset = ref(0)
const verticalOffset = ref(0)

// —— 溢出量测:该轴内容是否实际溢出(滚动条 / 覆盖层按需显隐的运行时依据)——
// ScrollBarVisibility=Auto 时滚动条仅在溢出后出现,栏位覆盖层(fix round 2)随之按需渲染。
const hasHorizontalOverflow = ref(false)
const hasVerticalOverflow = ref(false)

function measureOverflow(): void {
  const scroller = scrollerEl.value
  if (!scroller) return
  hasHorizontalOverflow.value = scroller.scrollWidth > scroller.clientWidth
  hasVerticalOverflow.value = scroller.scrollHeight > scroller.clientHeight
}

// —— 溢出映射:仅由 ScrollBarVisibility 决定(对照 UpdateCanScroll,ScrollViewer_Partial.cpp L5373-5400)——
// CanScroll 的唯一门控是 visibility != Disabled,编程滚动(ChangeView)同受此门控;
// visibility=Disabled 时 WinUI 在切换瞬间把该轴偏移复位为 0;Web 侧 overflow:hidden
// 不重置已有偏移(保留原值),仅此后不可再滚——切换瞬态与 WinUI 不同(wiki 差异 8)。
// ScrollMode=Disabled 不参与映射 —— 它只拦截用户输入(见 lockHorizontal/lockVertical),
// 该轴 overflow 保持可滚,编程滚动照常。
//   Visible → scroll(滚动条常显);Hidden → scroll(可滚但隐藏滚动条);Auto → auto(需要时显示)。
function resolveOverflow(visibility: ScrollBarVisibility): 'auto' | 'scroll' | 'hidden' {
  if (visibility === 'Disabled') return 'hidden'
  if (visibility === 'Visible' || visibility === 'Hidden') return 'scroll'
  return 'auto'
}

const horizontalOverflow = computed(() => resolveOverflow(props.horizontalScrollBarVisibility))
const verticalOverflow = computed(() => resolveOverflow(props.verticalScrollBarVisibility))
// Hidden:仍可滚动(滚轮 / 编程 API),仅隐藏滚动条(对应 WinUI 滚动条不显示)。
const hideHorizontalBar = computed(() => props.horizontalScrollBarVisibility === 'Hidden')
const hideVerticalBar = computed(() => props.verticalScrollBarVisibility === 'Hidden')

// 该轴滚动条是否实际显示(Visible 恒显;Auto 需内容实际溢出;Hidden/Disabled 不显示)——
// fix round 2(M-7):栏位覆盖层仅在滚动条真实存在时渲染,避免无滚动条时的 12px 指针死区。
const horizontalBarShown = computed(() => {
  const visibility = props.horizontalScrollBarVisibility
  if (visibility === 'Visible') return true
  if (visibility === 'Auto') return hasHorizontalOverflow.value
  return false
})
const verticalBarShown = computed(() => {
  const visibility = props.verticalScrollBarVisibility
  if (visibility === 'Visible') return true
  if (visibility === 'Auto') return hasVerticalOverflow.value
  return false
})

// —— ScrollMode=Disabled:逐通道拦截用户输入(编程滚动不受限,对照 OnScrollBarScroll 的忽略)——
const lockHorizontal = computed(() => props.horizontalScrollMode === 'Disabled')
const lockVertical = computed(() => props.verticalScrollMode === 'Disabled')

// touch-action 逐轴拦截触摸平移(pan-x / pan-y),双轴锁定取 none。
const touchAction = computed<'auto' | 'none' | 'pan-x' | 'pan-y'>(() => {
  if (lockHorizontal.value && lockVertical.value) return 'none'
  if (lockHorizontal.value) return 'pan-y'
  if (lockVertical.value) return 'pan-x'
  return 'auto'
})

// —— 缩放:钳制与渲染(WinUI MinZoomFactor 0.1 / MaxZoomFactor 10 / ZoomFactor 1)——
function clampZoom(value: number): number {
  const fallbackMin = 0.1
  const min = Number.isFinite(props.minZoomFactor) && props.minZoomFactor > 0 ? props.minZoomFactor : fallbackMin
  const max = Number.isFinite(props.maxZoomFactor) && props.maxZoomFactor >= min ? props.maxZoomFactor : min
  const safeValue = Number.isFinite(value) && value > 0 ? value : 1
  return Math.min(Math.max(safeValue, min), max)
}

// 渲染始终取钳制后的值;模型原值仅在下次用户/编程操作时归一,避免父级非法值造成布局崩溃。
const effectiveZoom = computed(() => clampZoom(zoomFactorModel.value))

/** 数字 → px,字符串原样透传(空串视为未设置)。 */
function toCssLength(value: number | string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const rootStyle = computed<CSSProperties>(() => ({
  background: props.background,
}))

const scrollerStyle = computed<CSSProperties>(() => ({
  overflowX: horizontalOverflow.value,
  overflowY: verticalOverflow.value,
  // ScrollMode=Disabled 的轴拦截触摸平移(pan-x / pan-y / none)
  touchAction: touchAction.value,
  padding: toCssLength(props.padding),
}))

// WinUI 语义:内容按未缩放尺寸参与布局(Presenter 以视区尺寸 Measure),再整体 scale;
// transform 的溢出计入滚动容器的滚动溢出区,滚动范围随缩放自动增长;左上角锚定与
// WinUI 内容变换的默认原点一致。
const contentStyle = computed<CSSProperties>(() => ({
  transform: `scale(${effectiveZoom.value})`,
  transformOrigin: '0 0',
}))

// —— 滚动事件:状态同步 + scroll 透传 + viewChanged 防抖 ——
const VIEWCHANGED_DEBOUNCE_MS = 120
let viewChangedTimer: number | null = null

function syncOffsets(): void {
  const scroller = scrollerEl.value
  if (!scroller) return
  horizontalOffset.value = scroller.scrollLeft
  verticalOffset.value = scroller.scrollTop
  // 溢出状态与偏移同源更新(滚动 / 缩放 / 布局变化都经过这里)
  measureOverflow()
}

function scheduleViewChanged(): void {
  if (viewChangedTimer !== null) window.clearTimeout(viewChangedTimer)
  viewChangedTimer = window.setTimeout(() => {
    viewChangedTimer = null
    emit('viewChanged', {
      horizontalOffset: horizontalOffset.value,
      verticalOffset: verticalOffset.value,
      zoomFactor: effectiveZoom.value,
    })
  }, VIEWCHANGED_DEBOUNCE_MS)
}

function onScroll(event: Event): void {
  syncOffsets()
  emit('scroll', event)
  scheduleViewChanged()
}

// —— 缩放系数变化(任何来源:Ctrl+滚轮 / changeView / 外部 v-model / min-max 钳制变化)——
watch(effectiveZoom, (value, oldValue) => {
  if (value === oldValue) return
  emit('zoomFactorChanged', value)
  // 缩放改变视区范围,同 WinUI 一样最终以 ViewChanged 收尾;溢出范围变化重测(滚动条/覆盖层显隐)。
  scheduleViewChanged()
  void nextTick(measureOverflow)
})

// —— 滚轮:Ctrl+滚轮缩放(ZoomMode=Enabled)+ ScrollMode=Disabled 轴的用户输入拦截 ——
// 浏览器对元素级 wheel 监听默认非 passive,preventDefault 可拦截默认滚动与页内缩放。
// 锁定轴拦截时豁免内容内嵌套可滚子区域、允许轴专属滚轮原样放行(fix round 2,见 onWheel)。
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2
// 行模式滚轮(Firefox)的近似行高;像素模式(Chromium)原样放行。
const LINE_DELTA_PX = 16
// 滚动边界判定容差(px):规避小数舍入导致的「贴边仍视为可滚」误判。
const SCROLL_EDGE_EPSILON_PX = 1

function normalizeWheelDelta(delta: number, deltaMode: number, axisExtent: number): number {
  if (deltaMode === DOM_DELTA_LINE) return delta * LINE_DELTA_PX
  if (deltaMode === DOM_DELTA_PAGE) return delta * axisExtent
  return delta
}

// 元素是否为能在该轴 delta 方向上继续滚动的滚动容器(delta < 0 朝起始端,> 0 朝末尾端)。
function canScrollBy(element: HTMLElement, axis: 'x' | 'y', delta: number): boolean {
  const style = window.getComputedStyle(element)
  const overflow = axis === 'x' ? style.overflowX : style.overflowY
  if (overflow !== 'auto' && overflow !== 'scroll' && overflow !== 'overlay') return false
  if (axis === 'x') {
    if (delta < 0) return element.scrollLeft > SCROLL_EDGE_EPSILON_PX
    return element.scrollLeft < element.scrollWidth - element.clientWidth - SCROLL_EDGE_EPSILON_PX
  }
  if (delta < 0) return element.scrollTop > SCROLL_EDGE_EPSILON_PX
  return element.scrollTop < element.scrollHeight - element.clientHeight - SCROLL_EDGE_EPSILON_PX
}

function onWheel(event: WheelEvent): void {
  const scroller = scrollerEl.value
  if (!scroller) return

  // Ctrl+滚轮(含触控板捏合)缩放:WinUI 缩放独立于 ScrollMode,ZoomMode 唯一门控。
  if (event.ctrlKey) {
    if (props.zoomMode !== 'Enabled') return
    event.preventDefault()

    const oldZoom = effectiveZoom.value
    // 每档 ±10%(WinUI 由 DirectManipulation 决定步长,此处取等价近似)。
    const step = event.deltaY < 0 ? 1.1 : 1 / 1.1
    const newZoom = clampZoom(oldZoom * step)
    if (newZoom === oldZoom) return

    // 视口中心锚定:保持缩放前后视口中心指向的内容点不动。
    const centerX = scroller.scrollLeft + scroller.clientWidth / 2
    const centerY = scroller.scrollTop + scroller.clientHeight / 2
    const ratio = newZoom / oldZoom

    zoomFactorModel.value = newZoom
    // 等新 scale 渲染进 DOM(滚动范围增长)后再写回偏移,否则会被旧范围钳制。
    void nextTick(() => {
      scroller.scrollLeft = centerX * ratio - scroller.clientWidth / 2
      scroller.scrollTop = centerY * ratio - scroller.clientHeight / 2
      syncOffsets()
    })
    return
  }

  // ScrollMode=Disabled 的轴拦截用户滚轮(对照 OnScrollBarScroll 的忽略);
  // overflow 保持可滚,编程滚动不受影响(fix round 1 语义不变)。
  const lockH = lockHorizontal.value
  const lockV = lockVertical.value
  if (!lockH && !lockV) return

  const target = event.target instanceof Element ? event.target : null
  const targetInside = target !== null && scroller.contains(target)
  // 锁定轴上是否带有本次手势的非零 delta(决定是否需要拦截)。
  let pendingX = lockH && event.deltaX !== 0
  let pendingY = lockV && event.deltaY !== 0

  // 允许轴专属滚轮(非零 delta 全落在允许轴上)直接放行原生滚动:保留原生平滑与边界
  // 链式行为(与未锁定轴一致),不再 preventDefault 后手动逐档 scrollBy(fix round 2,原 M-10)。
  // 仅当目标在滚动区内才放行——原生链式须沿祖先链到达本控件(栏位覆盖层不经过)。
  if (targetInside && !pendingX && !pendingY) return

  // 内容内嵌套可滚子区域豁免(fix round 2,I-2;与键盘 target 门控 / 触摸 touch-action 策略对齐):
  // wheel 自内层冒泡,preventDefault 会连带取消内层的默认滚动。自目标向上走到滚动区(不含),
  // 若内层滚动容器能把全部锁定轴 delta 消化掉,放行原生(不 preventDefault、不消费);
  // 锁定轴 delta 须被内层消化才放行,否则原生链式会把未消化部分漏进本控件锁定轴。
  if (targetInside) {
    let node: Element | null = target
    while (node !== null && node !== scroller && (pendingX || pendingY)) {
      if (node instanceof HTMLElement) {
        if (pendingY && canScrollBy(node, 'y', event.deltaY)) pendingY = false
        if (pendingX && canScrollBy(node, 'x', event.deltaX)) pendingX = false
      }
      node = node.parentElement
    }
    if (!pendingX && !pendingY) return
  }

  // 拦截:preventDefault 同时阻断锁定轴 delta 经原生链式滚到本控件/页面;允许轴剩余
  // delta 手动放行(对角/触控板混合手势才走到此路径),行/页 deltaMode 归一。
  event.preventDefault()
  const dx = lockH ? 0 : normalizeWheelDelta(event.deltaX, event.deltaMode, scroller.clientWidth)
  const dy = lockV ? 0 : normalizeWheelDelta(event.deltaY, event.deltaMode, scroller.clientHeight)
  if (dx !== 0 || dy !== 0) scroller.scrollBy({ left: dx, top: dy })
}

// —— 键盘:ScrollMode=Disabled 的轴拦截方向键/翻页(仅当滚动容器自身持焦)——
const HORIZONTAL_SCROLL_KEYS = ['ArrowLeft', 'ArrowRight']
const VERTICAL_SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']

function onKeyDown(event: KeyboardEvent): void {
  // 焦点在内容内元素(按钮/输入框)上时不劫持按键,保证 Space/方向键的原生语义。
  if (event.target !== scrollerEl.value) return
  if (lockHorizontal.value && HORIZONTAL_SCROLL_KEYS.includes(event.key)) {
    event.preventDefault()
    return
  }
  if (lockVertical.value && VERTICAL_SCROLL_KEYS.includes(event.key)) {
    event.preventDefault()
  }
}

// —— 编程滚动 API(对照 WinUI ChangeView / ScrollTo*Offset)——
// WinUI ChangeView:入参 null 表示该轴不变;默认动画,可禁用;返回是否接受请求。
// 门控对照 UpdateCanScroll(ScrollViewer_Partial.cpp L5373-5400):仅 ScrollBarVisibility=
// Disabled 关闭该轴滚动(含编程;WinUI 切换瞬间复位偏移,Web 侧 overflow:hidden 保留原偏移);
// ScrollMode=Disabled 只拦截用户输入,编程滚动不受限(fix round 1 修正)。
// 缩放请求不因 ZoomMode=Disabled 被拒(官方示例在 Disabled 下仍调用 ZoomToFactor 复位)。
function changeView(
  horizontalOffsetValue?: number | null,
  verticalOffsetValue?: number | null,
  zoomFactorValue?: number | null,
  disableAnimation?: boolean,
): boolean {
  const scroller = scrollerEl.value
  if (!scroller) return false

  const canScrollHorizontally = props.horizontalScrollBarVisibility !== 'Disabled'
  const canScrollVertically = props.verticalScrollBarVisibility !== 'Disabled'
  if (horizontalOffsetValue != null && !canScrollHorizontally) return false
  if (verticalOffsetValue != null && !canScrollVertically) return false

  if (zoomFactorValue != null) {
    const targetZoom = clampZoom(zoomFactorValue)
    if (targetZoom !== effectiveZoom.value) zoomFactorModel.value = targetZoom
  }

  scroller.scrollTo({
    left: horizontalOffsetValue != null && canScrollHorizontally ? horizontalOffsetValue : scroller.scrollLeft,
    top: verticalOffsetValue != null && canScrollVertically ? verticalOffsetValue : scroller.scrollTop,
    behavior: disableAnimation ? 'auto' : 'smooth',
  })
  return true
}

function scrollToLeft(disableAnimation?: boolean): boolean {
  return changeView(0, null, null, disableAnimation)
}

function scrollToRight(disableAnimation?: boolean): boolean {
  const scroller = scrollerEl.value
  if (!scroller) return false
  return changeView(scroller.scrollWidth - scroller.clientWidth, null, null, disableAnimation)
}

function scrollToTop(disableAnimation?: boolean): boolean {
  return changeView(null, 0, null, disableAnimation)
}

function scrollToBottom(disableAnimation?: boolean): boolean {
  const scroller = scrollerEl.value
  if (!scroller) return false
  return changeView(null, scroller.scrollHeight - scroller.clientHeight, null, disableAnimation)
}

// —— 布局尺寸变化:同步偏移与 viewChanged(内容增删 / 容器伸缩都会改变视区范围)——
let observer: ResizeObserver | null = null

onMounted(() => {
  syncOffsets()
  const scroller = scrollerEl.value
  if (scroller && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      syncOffsets()
      scheduleViewChanged()
    })
    observer.observe(scroller)
    const content = scroller.firstElementChild
    if (content) observer.observe(content)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  if (viewChangedTimer !== null) {
    window.clearTimeout(viewChangedTimer)
    viewChangedTimer = null
  }
})

defineExpose({
  /** 对照 WinUI ChangeView:(h, v, zoom, disableAnimation),返回是否接受请求。 */
  changeView,
  scrollToLeft,
  scrollToRight,
  scrollToTop,
  scrollToBottom,
  /** 当前视区状态(ref,随滚动/缩放实时更新)。 */
  horizontalOffset,
  verticalOffset,
  zoomFactor: zoomFactorModel,
})
</script>

<template>
  <!-- 结构对照 generic.xaml ScrollViewer 模板:Root(Border)→ 滚动呈现区 + 滚动条(原生 overflow 承载) -->
  <div v-bind="$attrs" class="wui-scrollviewer" :style="rootStyle">
    <div
      ref="scrollerEl"
      class="wui-scrollviewer__scroller"
      :class="{
        'wui-scrollviewer__scroller--hide-h-bar': hideHorizontalBar,
        'wui-scrollviewer__scroller--hide-v-bar': hideVerticalBar,
      }"
      :style="scrollerStyle"
      :tabindex="0"
      @scroll="onScroll"
      @wheel="onWheel"
      @keydown="onKeyDown"
    >
      <div class="wui-scrollviewer__content" :style="contentStyle">
        <slot />
      </div>
    </div>
    <!-- ScrollMode=Disabled:WinUI 连滚动条拖拽都忽略(OnScrollBarScroll 直接 return);
         原生滚动条伪元素无法单独禁用交互,以透明覆盖层吃掉锁定轴栏位上的指针事件;
         仅在该轴滚动条实际显示时渲染,避免无滚动条时的 12px 指针死区(fix round 2) -->
    <span
      v-if="lockVertical && verticalBarShown"
      class="wui-scrollviewer__bar-block wui-scrollviewer__bar-block--v"
      aria-hidden="true"
      @wheel="onWheel"
      @pointerdown.prevent
    ></span>
    <span
      v-if="lockHorizontal && horizontalBarShown"
      class="wui-scrollviewer__bar-block wui-scrollviewer__bar-block--h"
      aria-hidden="true"
      @wheel="onWheel"
      @pointerdown.prevent
    ></span>
  </div>
</template>

<style scoped>
.wui-scrollviewer {
  /* WinUI 默认 Background = Transparent(可经 background prop 覆盖) */
  background: transparent;
  /* BorderThickness/BorderBrush 默认 0/Transparent(generic.xaml 模板 Root Border),不占位 */
  position: relative;
  /* flex 纵排:根有确定/最大尺寸时滚动区自适应填充;无尺寸时呈内容自然大小(XAML 同语义) */
  display: flex;
  flex-direction: column;
  align-items: stretch;
  /* 滚动条栏宽(::-webkit-scrollbar 尺寸与 ScrollMode=Disabled 的栏位覆盖层共用) */
  --wui-scrollviewer-bar-size: 12px;
}

.wui-scrollviewer__scroller {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  outline: none;
}

/* 聚焦可达:isTabStop(或 Chrome 原生可聚焦滚动容器)时显示 WinUI 风格焦点环 */
.wui-scrollviewer__scroller:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-scrollviewer__content {
  /* 内容先填满视区(对应 Presenter 以视区尺寸 Measure),超出部分转为滚动溢出 */
  min-width: 100%;
  min-height: 100%;
}

/* —— 原生滚动条样式化:WinUI 细拇指观感(栏宽恒定,悬停拇指 4px→6px + 显轨道)—— */
.wui-scrollviewer__scroller::-webkit-scrollbar {
  width: var(--wui-scrollviewer-bar-size);
  height: var(--wui-scrollviewer-bar-size);
  background: transparent;
}

.wui-scrollviewer__scroller::-webkit-scrollbar-track {
  background: transparent;
}

.wui-scrollviewer__scroller:hover::-webkit-scrollbar-track {
  background: var(--wui-scroll-bar-track-fill);
}

.wui-scrollviewer__scroller::-webkit-scrollbar-thumb {
  background: var(--wui-scroll-bar-thumb-background);
  /* 透明边框做「细拇指」:12px 栏 - 2×4px = 4px 可见厚度,无布局跳动 */
  border: 4px solid transparent;
  background-clip: padding-box;
  border-radius: 8px;
}

.wui-scrollviewer__scroller:hover::-webkit-scrollbar-thumb {
  background: var(--wui-scroll-bar-thumb-fill-pointer-over);
  border: 3px solid transparent;
}

.wui-scrollviewer__scroller:active::-webkit-scrollbar-thumb {
  background: var(--wui-scroll-bar-thumb-fill-pressed);
}

.wui-scrollviewer__scroller::-webkit-scrollbar-corner {
  background: transparent;
}

/* ScrollBarVisibility=Hidden:仍可滚动,仅隐藏对应轴滚动条 */
.wui-scrollviewer__scroller--hide-h-bar::-webkit-scrollbar:horizontal {
  display: none;
}

.wui-scrollviewer__scroller--hide-v-bar::-webkit-scrollbar:vertical {
  display: none;
}

/* —— ScrollMode=Disabled:覆盖锁定轴的滚动条栏位(对照 OnScrollBarScroll 的忽略),
   原生伪元素无法单独禁用交互;仅滚动条实际显示时渲染(模板 v-if),无指针死区 —— */
.wui-scrollviewer__bar-block {
  position: absolute;
  z-index: 1;
}

.wui-scrollviewer__bar-block--v {
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--wui-scrollviewer-bar-size);
}

.wui-scrollviewer__bar-block--h {
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--wui-scrollviewer-bar-size);
}

/* Firefox 等不支持 ::-webkit-scrollbar 的浏览器:退化为标准细滚动条(仅整条颜色,无法逐轴隐藏) */
@supports not selector(::-webkit-scrollbar) {
  .wui-scrollviewer__scroller {
    scrollbar-width: thin;
    scrollbar-color: var(--wui-scroll-bar-thumb-background) transparent;
  }

  .wui-scrollviewer__scroller:hover {
    scrollbar-color: var(--wui-scroll-bar-thumb-fill-pointer-over) var(--wui-scroll-bar-track-fill);
  }
}
</style>
