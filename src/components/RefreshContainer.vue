<script lang="ts">
// RefreshContainer(WinUI RefreshContainer 迁移):类型对外导出,供使用方与示例页引用。
// 源码对照 CK/WinUI-Reference/controls/dev/PullToRefresh/RefreshContainer/
// (RefreshContainer.idl / .cpp / .xaml / _themeresources.xaml)与同目录
// ScrollViewerIRefreshInfoProviderAdapter/(InteractionTracker 耦合与三个位移动画),
// 以及 RefreshVisualizer.cpp 的状态机(Idle/Peeking/Interacting/Pending/Refreshing)。
import type {
  RefreshDeferralHandle,
  RefreshPullDirection,
  RefreshStateChangedDetail,
  RefreshVisualizerState,
} from './RefreshVisualizer.vue'

/** refreshRequested 事件参数(对应 WinUI RefreshRequestedEventArgs:GetDeferral 简化为 complete() 句柄)。 */
export interface RefreshRequestedEvent {
  getDeferral(): RefreshDeferralHandle
}
</script>

<script setup lang="ts">
// WinUI RefreshContainer 复刻:内容 + 视觉器的下拉刷新容器(阶段 5)。
// 职责对照源 RefreshContainer.cpp 头注释:展示 Content 与 RefreshVisualizer,把内容树中的
// ScrollViewer 适配为拉动信息源(源 ScrollViewerIRefreshInfoProviderAdapter + InteractionTracker),
// 并在越过阈值后松手时触发刷新事件。
// Web 实现选型(对照源逐条):
//   - 手势:触摸 touchstart/touchmove(元素级监听非 passive,可 preventDefault)/touchend 为主,
//     鼠标/触控笔 Pointer Events 可选拖拽(setPointerCapture 在判定成立后才捕获,不影响内容内点击);
//     仅当内容树首个可竖滚元素贴顶(scrollTop≈0)时允许下拉(WinUI 中 InteractionTracker 链式同理);
//   - 位移:源 DefaultAnimationHandler 的三条 ExpressionAnimation 转写为 transform + 过渡 ——
//     拉动:视觉器带 translateY(min(pull,H) - H)、内容 translateY(min(pull,H))(1:1 跟手,封顶带高);
//     刷新请求:过渡到 带 translateY(-H×(1-阈值))、内容 translateY(H×阈值)(源 RefreshRequestedAnimation);
//     刷新完成:过渡回 带全隐(-H)、内容归零(源 RefreshCompletedAnimation);
//   - 状态机:RefreshVisualizer.cpp RefreshInfoProvider_InteractionRatioChanged 的迁移表
//     (Idle→Interacting/Pending、Interacting↔Pending、松手 Pending→Refreshing、其余回 Idle)在容器内实现;
//   - Deferral:容器统一计数(视觉器与容器两级事件共享,对应源容器持有视觉器 Deferral 再转发的协作);
//     简化通道 v-model:isRefreshIdle:调用方异步完成置 true 即收尾。
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import WuiRefreshVisualizer from './RefreshVisualizer.vue'
import {
  REFRESH_VISUALIZER_HOST,
  type RefreshVisualizerApi,
  type RefreshVisualizerHost,
} from './RefreshVisualizer.vue'

defineOptions({ name: 'WuiRefreshContainer', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 触发阈值(WinUI ExecutionRatio 默认 0.8):拉动比例越过该值进入 Pending,松手即刷新。 */
    pullThreshold?: number
    /** 拉动方向(WinUI RefreshPullDirection);Web 手势仅实现 TopToBottom,其余值按 TopToBottom 处理。 */
    pullDirection?: RefreshPullDirection
  }>(),
  {
    pullThreshold: 0.8,
    pullDirection: 'TopToBottom',
  },
)

/** 刷新是否空闲(v-model:isRefreshIdle):false 表示刷新进行中并阻止自动收尾,置回 true 收尾。 */
const isRefreshIdle = defineModel<boolean>('isRefreshIdle', { default: true })

const emit = defineEmits<{
  (e: 'refreshRequested', args: RefreshRequestedEvent): void
  /** Web 侧扩展:等价于内部默认视觉器的 RefreshStateChanged(自备视觉器时请监听它的同名事件)。 */
  (e: 'stateChanged', detail: RefreshStateChangedDetail): void
}>()

// ===================================================================================
// 源常量(RefreshContainer.cpp / RefreshVisualizer.cpp / DefaultAnimationHandler)
// ===================================================================================
const DEFAULT_PULL_DIMENSION_SIZE = 100 // DEFAULT_PULL_DIMENSION_SIZE(默认视觉器带高)
const DEFAULT_EXECUTION_RATIO = 0.8 // RefreshInfoProviderImpl.h DEFAULT_EXECUTION_RATIO
const SCROLL_EDGE_EPSILON_PX = 1 // 贴顶判定容差(舍入防御)
const PULL_START_SLOP_PX = 4 // 起拉位移门槛(Web 侧防抖动,源为 InteractionTracker 自带惯性门)

// —— 阈值/方向归一 ——
const effectiveThreshold = computed<number>(() => {
  const t = Number(props.pullThreshold)
  if (!Number.isFinite(t)) return DEFAULT_EXECUTION_RATIO
  return Math.min(Math.max(t, 0.05), 1)
})

const effectivePullDirection = computed<RefreshPullDirection>(() => {
  if (props.pullDirection !== 'TopToBottom') {
    // 方向仅垂直向下(WinUI 语义下 Web 仅复刻 TopToBottom);其余值告警并回落
    console.warn(
      `[WuiRefreshContainer] pullDirection="${props.pullDirection}" 暂未实现,已按 "TopToBottom" 处理。`,
    )
  }
  return 'TopToBottom'
})

// ===================================================================================
// 状态机(权威状态在容器;默认/内嵌视觉器经 provide 驱动)
// ===================================================================================
const state = ref<RefreshVisualizerState>('Idle')
const interactionRatio = ref(0)
const bandSize = ref(DEFAULT_PULL_DIMENSION_SIZE)

function setState(next: RefreshVisualizerState): void {
  if (state.value === next) return
  const old = state.value
  state.value = next
  emit('stateChanged', { oldState: old, newState: next })
}

// —— Deferral 门闩(容器统一记账;视觉器与容器两级事件共享,对应源容器持有视觉器 Deferral)——
let deferralCount = 0

function takeDeferral(): RefreshDeferralHandle {
  deferralCount += 1
  return {
    complete: () => {
      deferralCount = Math.max(0, deferralCount - 1)
      settleRefreshIfDone()
    },
  }
}

/** 刷新收口:Deferral 清零即回到 Idle(WinUI RefreshCompleted → UpdateRefreshState(Idle))。 */
function completeRefresh(): void {
  deferralCount = 0
  if (state.value === 'Refreshing') setState('Idle')
}

function settleRefreshIfDone(): void {
  if (state.value === 'Refreshing' && deferralCount === 0) completeRefresh()
}

/** 事件派发完毕的收口:无人取 Deferral 且调用方未声明忙碌(isRefreshIdle=true)则立即完成。 */
function settleIfOrphaned(): void {
  if (state.value !== 'Refreshing') return
  if (deferralCount === 0 && isRefreshIdle.value) completeRefresh()
}

// v-model:isRefreshIdle 简化通道:调用方异步完成置 true → 收尾
watch(isRefreshIdle, (idle) => {
  if (idle && state.value === 'Refreshing') completeRefresh()
})

// —— 刷新触发(RequestRefresh / 松手越过阈值),对应 RefreshVisualizer.RequestRefresh + 容器转发 ——
function triggerRefresh(): void {
  if (state.value === 'Refreshing') return // 源:不打断正在执行的刷新
  setState('Refreshing')
  // 先视觉器事件(源 OnVisualizerRefreshRequested 先持其 Deferral),再容器事件;共享同一计数
  registeredVisualizerApi?.raiseRefreshRequested()
  emit('refreshRequested', { getDeferral: takeDeferral })
  // 派发完毕:无人取 Deferral 且调用方未声明忙碌(isRefreshIdle)→ 完成(WinUI 无 Deferral 同语义)。
  // 收口放到微任务:isRefreshIdle 走 defineModel,父级同步写 false 后 prop 要到渲染 flush 才回读,
  // 同步检查会误读旧值 true 而立刻收尾(v-model 简化通道失效);微任务在 Vue flush 任务之后执行。
  void Promise.resolve().then(settleIfOrphaned)
}

// ===================================================================================
// 宿主契约(provide 给内嵌 RefreshVisualizer)
// ===================================================================================
let registeredVisualizerApi: RefreshVisualizerApi | null = null

const host: RefreshVisualizerHost = {
  state,
  interactionRatio,
  threshold: effectiveThreshold,
  pullDirection: effectivePullDirection,
  bandSize,
  takeDeferral,
  registerVisualizer(api) {
    registeredVisualizerApi = api
  },
  unregisterVisualizer() {
    registeredVisualizerApi = null
  },
  requestRefresh: triggerRefresh,
}

provide(REFRESH_VISUALIZER_HOST, host)

// ===================================================================================
// 手势(触摸为主,鼠标/触控笔可选)——把内容树首个竖滚元素适配为拉动信息源
// ===================================================================================
const rootEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const visualizerHostEl = ref<HTMLElement | null>(null)

const isDragging = ref(false) // 已进入拉动(跟手位移中;false 时位移走过渡)
const pullDistance = ref(0) // 当前拉动位移 px(封顶带高)

// 一次手势的活性上下文(非渲染态,无需响应式)
let gestureActive = false
let gestureStartY = 0
let gesturePointerId: number | null = null
let pointerCaptured = false

/** 实测视觉器带高(带高变化 / 换自备视觉器都会经 ResizeObserver 回填)。 */
let bandObserver: ResizeObserver | null = null

onMounted(() => {
  measureBand()
  const el = visualizerHostEl.value
  if (el && typeof ResizeObserver !== 'undefined') {
    bandObserver = new ResizeObserver(measureBand)
    bandObserver.observe(el)
  }
})

onBeforeUnmount(() => {
  bandObserver?.disconnect()
  bandObserver = null
})

function measureBand(): void {
  const el = visualizerHostEl.value
  if (el && el.offsetHeight > 0) bandSize.value = el.offsetHeight
}

/**
 * 内容树中首个可竖滚元素是否贴顶(源:容器 BFS 搜索第一个 ScrollViewer 适配;贴顶才允许下拉)。
 * 仅在手势起拉判定时调用,滚动进行中的 move 不重复扫描。
 */
function contentScrollerAtTop(): boolean {
  const root = contentEl.value
  if (!root) return true
  const candidates = root.querySelectorAll<HTMLElement>('*')
  for (const el of candidates) {
    const overflowY = window.getComputedStyle(el).overflowY
    if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') continue
    if (el.scrollHeight <= el.clientHeight + SCROLL_EDGE_EPSILON_PX) continue
    return el.scrollTop <= SCROLL_EDGE_EPSILON_PX
  }
  return true // 无可滚内容:任意位置可拉
}

function beginGesture(startY: number, pointerId?: number): void {
  if (state.value === 'Refreshing') return // 源:刷新进行中不打断
  gestureActive = true
  gestureStartY = startY
  gesturePointerId = pointerId ?? null
  pointerCaptured = false
}

/** 判定起拉(位移过 slop + 内容贴顶);成立后才进入跟手态并捕获指针(不影响内容内点击)。 */
function tryStartPull(dy: number): boolean {
  if (dy <= PULL_START_SLOP_PX) return false
  if (!contentScrollerAtTop()) return false
  isDragging.value = true
  if (gesturePointerId !== null && rootEl.value) {
    try {
      rootEl.value.setPointerCapture(gesturePointerId)
      pointerCaptured = true
    } catch {
      /* 触摸场景无 Pointer 捕获:忽略 */
    }
  }
  return true
}

/** 拉动位移推进 + 状态迁移(源 RefreshInfoProvider_InteractionRatioChanged 的交互分支)。 */
function applyPull(currentY: number): void {
  const band = bandSize.value > 0 ? bandSize.value : DEFAULT_PULL_DIMENSION_SIZE
  const dy = currentY - gestureStartY

  // 拉动比例与内容位移都封顶带高(源 min(1.0, pull/H) 与 min(H, pull))
  pullDistance.value = Math.min(Math.max(dy, 0), band)
  const ratio = band > 0 ? pullDistance.value / band : 0
  const wasAtZero = interactionRatio.value === 0

  if (state.value === 'Idle') {
    if (wasAtZero) {
      if (ratio > effectiveThreshold.value) {
        setState('Pending') // 首帧越阈(源:comp/xaml 帧间跳变的补判)
      } else if (ratio > 0) {
        setState('Interacting')
      }
    } else if (ratio > 0) {
      setState('Peeking')
    }
  } else if (state.value === 'Interacting') {
    if (ratio <= 0) {
      setState('Idle')
    } else if (ratio > effectiveThreshold.value) {
      setState('Pending')
    }
  } else if (state.value === 'Pending') {
    if (ratio <= 0) {
      setState('Idle')
    } else if (ratio <= effectiveThreshold.value) {
      setState('Interacting')
    }
  }
  // Refreshing / Peeking:保持(源注释:不打断刷新;Peeking 不迁移)

  interactionRatio.value = ratio
}

/** 松手/取消(源 IsInteractingForRefresh=false 的收尾:Pending → RequestRefresh,其余 → Idle)。 */
function endGesture(): void {
  if (!gestureActive) return
  gestureActive = false
  if (pointerCaptured && rootEl.value && gesturePointerId !== null) {
    try {
      rootEl.value.releasePointerCapture(gesturePointerId)
    } catch {
      /* 指针已释放:忽略 */
    }
  }
  pointerCaptured = false
  gesturePointerId = null
  isDragging.value = false
  if (state.value === 'Pending') {
    triggerRefresh()
  } else if (state.value !== 'Refreshing') {
    setState('Idle')
  }
  interactionRatio.value = 0
  pullDistance.value = 0
}

// —— 触摸(主通道):元素级 touchmove 非 passive,可 preventDefault 拦下原生滚动/回弹 ——
function onTouchStart(event: TouchEvent): void {
  const touch = event.touches[0]
  if (!touch) return
  beginGesture(touch.clientY)
}

function onTouchMove(event: TouchEvent): void {
  if (!gestureActive) return
  const touch = event.touches[0]
  if (!touch) return
  const dy = touch.clientY - gestureStartY
  if (!isDragging.value && !tryStartPull(dy)) return // 未成手势:放行原生滚动
  event.preventDefault() // 起拉后拦下默认滚动(贴顶下拉原生无目标,主要拦 overscroll 链到页面)
  applyPull(touch.clientY)
}

function onTouchEnd(): void {
  endGesture()
}

// —— 鼠标/触控笔(可选通道)——
function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'touch') return // 触摸走 touch 事件,避免双通道重复计数
  beginGesture(event.clientY, event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!gestureActive || event.pointerId !== gesturePointerId) return
  const dy = event.clientY - gestureStartY
  if (!isDragging.value && !tryStartPull(dy)) return
  event.preventDefault()
  applyPull(event.clientY)
}

function onPointerUp(event: PointerEvent): void {
  if (gestureActive && event.pointerId !== gesturePointerId) return
  endGesture()
}

// ===================================================================================
// 渲染:三条位移通道(源 DefaultAnimationHandler 的 TopToBottom 表达式)
// ===================================================================================
const band = computed<number>(() => (bandSize.value > 0 ? bandSize.value : DEFAULT_PULL_DIMENSION_SIZE))

/** 视觉器带位移:拉动 min(pull,H)-H 跟手;Refreshing 停留 -H×(1-阈值);Idle 全隐 -H。 */
const visualizerHostStyle = computed<Record<string, string>>(() => {
  let ty: number
  if (isDragging.value || state.value === 'Interacting' || state.value === 'Pending') {
    ty = Math.min(pullDistance.value, band.value) - band.value
  } else if (state.value === 'Refreshing') {
    ty = -(band.value * (1 - effectiveThreshold.value))
  } else {
    ty = -band.value
  }
  return { transform: `translateY(${ty}px)` }
})

/** 内容位移:拉动 min(pull,H) 跟手;Refreshing 停留 H×阈值(源 RefreshRequestedAnimation);Idle 归零。 */
const contentStyle = computed<Record<string, string>>(() => {
  let ty: number
  if (isDragging.value || state.value === 'Interacting' || state.value === 'Pending') {
    ty = Math.min(pullDistance.value, band.value)
  } else if (state.value === 'Refreshing') {
    ty = band.value * effectiveThreshold.value
  } else {
    ty = 0
  }
  return { transform: `translateY(${ty}px)` }
})

// —— 对外 API ——
defineExpose({
  /** 对照 WinUI RequestRefresh():编程触发刷新(键盘/按钮可达路径)。 */
  requestRefresh: triggerRefresh,
  /** 当前视觉器状态(容器状态机权威值)。 */
  state,
  /** 当前拉动比例(0..1)。 */
  interactionRatio,
})
</script>

<template>
  <!-- 结构对照源 RefreshContainer.xaml:Root Grid(inset 裁剪)→ ContentPresenter + RefreshVisualizerPresenter
       (TopToBottom:视觉器宿主顶部贴靠、横向拉伸,叠加在内容之上) -->
  <div
    v-bind="$attrs"
    ref="rootEl"
    class="wui-refreshcontainer"
    :class="{ 'wui-refreshcontainer--dragging': isDragging }"
    :data-state="state"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <div ref="contentEl" class="wui-refreshcontainer__content" :style="contentStyle">
      <slot />
    </div>
    <div ref="visualizerHostEl" class="wui-refreshcontainer__visualizer-host" :style="visualizerHostStyle">
      <!-- 缺省视觉器对照源 OnApplyTemplate:Visualizer 为空时自建 RefreshVisualizer(带高 100) -->
      <slot name="visualizer">
        <WuiRefreshVisualizer />
      </slot>
    </div>
  </div>
</template>

<style scoped>
.wui-refreshcontainer {
  /* 源默认:RefreshContainerBackgroundBrush = Transparent;Root Grid inset 裁剪 → overflow hidden */
  position: relative;
  overflow: hidden;
  background: transparent;
}

/* 拉动手势中禁止文本选择(鼠标拖拽通道;触摸无此问题) */
.wui-refreshcontainer--dragging {
  user-select: none;
  -webkit-user-select: none;
}

.wui-refreshcontainer__content {
  /* 刷新请求/完成与松手回弹的位移过渡(源 REFRESH_ANIMATION_DURATION = 100ms,
     ScrollViewerIRefreshInfoProviderDefaultAnimationHandler.cpp L12;MR3/B6 由
     fast token 订正为源字面量) */
  transition: transform 100ms var(--wui-easing-standard);
}

.wui-refreshcontainer__visualizer-host {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  /* TopToBottom:RefreshVisualizerPresenter VerticalAlignment=Top + HorizontalAlignment=Stretch */
  display: flex;
  align-items: flex-start;
  z-index: 1;
  /* 视觉器为纯指示覆盖层,不拦截内容的指针交互 */
  pointer-events: none;
  /* 同上:100ms 源字面量 */
  transition: transform 100ms var(--wui-easing-standard);
}

/* 槽内自备视觉器同样横向铺满(源 presenter 为 Grid,子项默认 HorizontalAlignment=Stretch;
   默认视觉器由 .wui-refreshviz 自身 width:100% 覆盖) */
.wui-refreshcontainer__visualizer-host > :slotted(*) {
  width: 100%;
}

/* 拉动中:位移跟手,关闭过渡(源 InteractionTracker 表达式动画逐帧直驱) */
.wui-refreshcontainer--dragging .wui-refreshcontainer__content,
.wui-refreshcontainer--dragging .wui-refreshcontainer__visualizer-host {
  transition: none;
}
</style>
