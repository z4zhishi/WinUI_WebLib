<script lang="ts">
// SwipeControl(WinUI SwipeControl 迁移)—— 触摸手势容器:拖拽内容揭示其下的 SwipeItem
// 操作块;Reveal 模式揭示后点选、Execute 模式过阈值松手即触发并回弹。
// 视觉规格:CK/WinUI-Reference/controls/dev/SwipeControl/SwipeControl.xaml(默认模板:
// RootGrid > SwipeContentRoot(StackPanel)+ ContentRoot(ContentPresenter,随拖拽平移);
// IsTabStop=False、Background=Transparent、MinWidth/MinHeight = ListViewItemMinWidth/MinHeight
// = 88/40,generic.xaml L1767);颜色 token 对照 generic.xaml L1853-1859:
//   SwipeItemBackground            = SystemControlBackgroundBaseLow      → --wui-system-control-background-base-low
//   SwipeItemForeground            = SystemControlForegroundBaseHigh     → --wui-system-control-foreground-base-high
//   SwipeItemBackgroundPressed     = SystemControlBackgroundBaseMediumLow→ --wui-system-control-background-base-medium-low
//   PreThresholdExecuteForeground  = SystemControlBackgroundBaseMedium   → --wui-system-control-background-base-medium
//   PostThresholdExecuteBackground = SystemControlBackgroundAccent       → --wui-system-control-background-accent
//   PostThresholdExecuteForeground = SystemControlForegroundChromeWhite  → --wui-system-control-foreground-chrome-white
// 行为规格(对照 SwipeControl.cpp / SwipeControlInteractionTrackerOwner.cpp):
//   - 阈值 c_ThresholdValue = 100px,生效阈值 = min(揭示尺寸, 100)(UpdateThresholdReached);
//   - Reveal:过阈值松手 → 停在完全打开;未过 → 回弹关闭;点击已揭示项调用之
//     (InvokeSwipe:Auto/Close → 关闭,RemainOpen → 保持);
//   - Execute:过阈值松手 → 调用首个项后按 BehaviorOnInvoked 去留(Auto/Close → 关闭,
//     RemainOpen → 停在完全打开且不再接受拖拽,对照 OnPointerPressedEvent 提前返回);
//   - Execute 视差:揭示块以 0.5×指速滑入、满幅时恰好盖满(m_executeExpressionAnimation:
//     translation = 0.5×content + ±0.5×size;Web 以面板 translateX(calc(0.5×offset − 50%)) 等效);
//   - 关闭路径(InputEaterTapped / DismissSwipeOnAnExternalTap / 全局 KeyDown /
//     s_lastInteractedWithSwipeControl 互斥):点击内容、点击控件外部、外部键盘输入、
//     另一 SwipeControl 开始交互时关闭;
//   - 无开放事件:WinUI SwipeControl 无公共事件,invoked 在 SwipeItem 上;Web 侧控件
//     追加 relay 事件 invoked(便于数组式用法),见 emits 说明。
import type { SwipeSide } from './SwipeItem.vue'

export type { SwipeSide } from './SwipeItem.vue'

/** WinUI SwipeMode:Reveal = 揭示后点选;Execute = 过阈值松手即触发。 */
export type SwipeModeValue = 'Reveal' | 'Execute'

/** 数组式用法下的项配置(与 SwipeItem 的 props 同构,见 SwipeItem.vue)。 */
export type SwipeItemOptions = {
  text?: string
  icon?: string
  background?: string
  foreground?: string
  behaviorOnInvoked?: 'Auto' | 'Close' | 'RemainOpen'
  disabled?: boolean
}

/** 控件级 invoked relay 事件参数(Web 侧追加;WinUI 原生 invoked 在 SwipeItem 上)。 */
export interface SwipeControlInvokedEventArgs {
  /** 被调用项的配置快照。 */
  item: Required<SwipeItemOptions>
  /** 揭示侧。 */
  side: SwipeSide
  /** 项在本侧的序号(声明顺序)。 */
  index: number
  /** 轻扫层句柄(可 close())。 */
  swipeControl: { close(): void }
}

/** 跨实例互斥:记录最近交互(打开)的 SwipeControl,新交互开始时关闭前任
 * (对照 s_lastInteractedWithSwipeControl)。模块级单例,须置于普通 <script> 顶层。 */
let lastInteractedSwipe: { close(): void } | null = null

/** 供 setup 内把某控件登记为「最近交互」并关闭前任。 */
export function claimLastInteractedSwipe(handle: { close(): void }): void {
  if (lastInteractedSwipe && lastInteractedSwipe !== handle) lastInteractedSwipe.close()
  lastInteractedSwipe = handle
}

/** 该控件关闭时注销自己的「最近交互」登记。 */
export function releaseLastInteractedSwipe(handle: { close(): void }): void {
  if (lastInteractedSwipe === handle) lastInteractedSwipe = null
}
</script>

<script setup lang="ts">
// WinUI SwipeControl 复刻(规格见文件头注)。内容层随拖拽 1:1 平移,揭示层按活动侧
// 锚定并裁切揭示宽度;Reveal 多项并排(每项满高 68px 最小宽),Execute 单项视差满铺。
import { computed, onBeforeUnmount, onMounted, provide, reactive, ref, toRaw, watch } from 'vue'
import WuiSwipeItem from './SwipeItem.vue'
import { WUI_SWIPE_CONTEXT } from './SwipeItem.vue'
import type { SwipeControlContext, SwipeItemRegistration } from './SwipeItem.vue'

defineOptions({ name: 'WuiSwipeControl', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 左侧项组(WinUI LeftItems):向右拖揭示;数组式配置,与 #left slot 二选一。 */
    leftItems?: SwipeItemOptions[]
    /** 右侧项组(WinUI RightItems):向左拖揭示;数组式配置,与 #right slot 二选一。 */
    rightItems?: SwipeItemOptions[]
    /** 左侧组模式(WinUI SwipeItems.Mode)。 */
    leftMode?: SwipeModeValue
    /** 右侧组模式(WinUI SwipeItems.Mode)。 */
    rightMode?: SwipeModeValue
    /** 禁用:无拖拽揭示,已打开时立即关闭。 */
    disabled?: boolean
  }>(),
  {
    leftItems: () => [],
    rightItems: () => [],
    leftMode: 'Reveal',
    rightMode: 'Reveal',
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 有项被调用(Execute 过阈值松手 / Reveal 点击已揭示项)。Web 侧 relay:
   * WinUI 原生 invoked 派发在 SwipeItem 上;数组式用法经本事件统一暴露。 */
  invoked: [event: SwipeControlInvokedEventArgs]
}>()

// —— 源常量 ——
/** 源 c_ThresholdValue:Execute/打开判定阈值上限(px)。 */
const THRESHOLD_VALUE = 100

// —— 状态 ——
const rootRef = ref<HTMLElement | null>(null)
const leftPanelRef = ref<HTMLElement | null>(null)
const rightPanelRef = ref<HTMLElement | null>(null)

/** 当前揭示侧(宽度为 0 时仅决定回弹方向)。 */
const side = ref<SwipeSide>('left')
/** 当前揭示宽度(px,恒 ≥ 0;方向由 side 表达)。 */
const width = ref(0)
/** 是否处于打开态(Reveal 停留 / Execute RemainOpen)。 */
const open = ref(false)
/** 拖拽进行中(决定是否禁用过渡动画)。 */
const dragging = ref(false)
/** Execute 阈值是否已跨过(驱动 pre/post threshold 配色)。 */
const thresholdReached = ref(false)
/** 控件实际宽度(Execute 满铺与视差换算用)。 */
const controlWidth = ref(0)

const dirOf = (s: SwipeSide): number => (s === 'left' ? 1 : -1)
const itemsOf = (s: SwipeSide): SwipeItemRegistration[] => slotItems[s]
const modeOf = (s: SwipeSide): SwipeModeValue => (s === 'left' ? props.leftMode : props.rightMode)

/** 登记序号。经 toRaw 对齐:reactive 数组读出的元素是代理,直接 indexOf/=== 对原始
 * registration 恒不等(WinUI GetAt(0) 语义依赖此身份比较)。 */
function indexOfRegistration(s: SwipeSide, registration: SwipeItemRegistration): number {
  return slotItems[s].findIndex((r) => toRaw(r) === registration)
}

/** 揭示满幅尺寸:Execute = 控件宽;Reveal = 本侧面板自然宽(各项宽度和)。 */
function sideSizeOf(s: SwipeSide): number {
  if (modeOf(s) === 'Execute') return controlWidth.value
  const panel = s === 'left' ? leftPanelRef.value : rightPanelRef.value
  return panel ? panel.offsetWidth : 0
}

/** 生效阈值(源:abs(value) > min(揭示尺寸, c_ThresholdValue))。 */
function thresholdOf(s: SwipeSide): number {
  return Math.min(sideSizeOf(s), THRESHOLD_VALUE)
}

// —— slot 项登记(SwipeItem 注入;数组式项由内部渲染的 SwipeItem 走同一路径)——
const slotItems: { left: SwipeItemRegistration[]; right: SwipeItemRegistration[] } = reactive({
  left: [],
  right: [],
})

/** 本控件句柄:invoked 参数携带(WinUI Close 的 Web 对应物,无条件关闭)。 */
const handle = {
  close(): void {
    close()
  },
}

/**  dismiss 路径句柄(对照 CloseIfNotRemainOpenExecuteItem):Execute+RemainOpen
 *  打开态锁定时不关闭,其余等同 close。 */
const dismissHandle = {
  close(): void {
    if (lockedOpen.value) return
    close()
  },
}

/** 调用一个项:派发项级 invoked → 控件级 relay → 按 BehaviorOnInvoked 裁决去留
 * (对照 SwipeItem.InvokeSwipe:Auto/Close → Close,RemainOpen → 保持打开)。 */
function invokeRegistration(s: SwipeSide, reg: SwipeItemRegistration, viaGesture: boolean): void {
  const index = Math.max(0, indexOfRegistration(s, reg))
  const snapshot = reg.config()
  reg.invoke()
  emit('invoked', {
    item: { ...snapshot },
    side: s,
    index,
    swipeControl: handle,
  })
  const behavior = snapshot.behaviorOnInvoked ?? 'Auto'
  if (behavior === 'RemainOpen') {
    // 保持打开:Execute 手势路径停在满幅;Reveal 点击路径本就处于打开态。
    if (viaGesture) snapOpen(s)
    return
  }
  close()
}

// —— 打开 / 关闭 ——
function snapOpen(s: SwipeSide): void {
  side.value = s
  width.value = sideSizeOf(s)
  thresholdReached.value = width.value > thresholdOf(s)
  open.value = true
  attachDismissListeners()
  claimLastInteractedSwipe(dismissHandle)
}

function close(): void {
  open.value = false
  width.value = 0
  thresholdReached.value = false
  detachDismissListeners()
  releaseLastInteractedSwipe(dismissHandle)
}

// —— 关闭路径:外部点击 / 外部键盘(对照 AttachDismissingHandlers;源为任意 KeyDown,
//    Web 限定目标不在控件内,保留已揭示项的键盘可达性)——
function onDocumentPointerDown(event: PointerEvent): void {
  const root = rootRef.value
  if (root && event.target instanceof Node && root.contains(event.target)) return
  dismissHandle.close()
}

function onDocumentKeydown(event: KeyboardEvent): void {
  const root = rootRef.value
  if (root && event.target instanceof Node && root.contains(event.target)) return
  dismissHandle.close()
}

function attachDismissListeners(): void {
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('keydown', onDocumentKeydown, true)
}

function detachDismissListeners(): void {
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKeydown, true)
}

// —— 拖拽(触摸为主;Web 侧鼠标/手写笔同样可用,WinUI 仅触摸与可摸触控板,差异见 wiki)——
let pointerId = -1
let startX = 0
let startWidth = 0
let dragSide: SwipeSide | null = null
let moved = false
/** Execute+RemainOpen 打开态锁定(源 OnPointerPressedEvent 提前返回:不再接受交互)。 */
const lockedOpen = computed(
  () =>
    open.value &&
    modeOf(side.value) === 'Execute' &&
    (itemsOf(side.value)[0]?.config().behaviorOnInvoked ?? 'Auto') === 'RemainOpen',
)

function onPointerDown(event: PointerEvent): void {
  if (props.disabled || lockedOpen.value) return
  if (event.pointerId === pointerId) return
  // 打开态下按在揭示项按钮上:放行点击(源 OnPointerPressed 由项吞掉,不转发操纵)
  const target = event.target
  if (open.value && target instanceof Element && target.closest('.wui-swipeitem')) return
  // 注:此处不 claim「最近交互」——源在 ValuesChanged(实际产生位移)才登记,
  // 在 B 上原地点按不应关闭已打开的 A
  pointerId = event.pointerId
  startX = event.clientX
  startWidth = width.value
  dragSide = width.value > 0 ? side.value : null
  moved = false
  dragging.value = true
  rootRef.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value || event.pointerId !== pointerId) return
  const dx = event.clientX - startX
  if (!moved && Math.abs(dx) < 4) return
  if (!moved) {
    // 实际产生位移才登记「最近交互」并关闭前任打开的控件(源 ValuesChanged 路径)
    moved = true
    claimLastInteractedSwipe(dismissHandle)
  }
  // 关闭态首次移动:按方向选侧(该侧无项则试另一侧)
  if (dragSide === null) {
    const want: SwipeSide = dx > 0 ? 'left' : 'right'
    const other: SwipeSide = dx > 0 ? 'right' : 'left'
    dragSide = itemsOf(want).length > 0 ? want : itemsOf(other).length > 0 ? other : null
    if (dragSide === null) return
    side.value = dragSide
  }
  const maxW = sideSizeOf(dragSide)
  // 沿本侧开合方向投影(打开态只在本侧开合,拖过头即停在 0:对照 CloseWithoutAnimation)
  const projected = startWidth + dx * dirOf(dragSide)
  width.value = Math.min(Math.max(projected, 0), maxW)
  thresholdReached.value = width.value > thresholdOf(dragSide)
}

function onPointerUp(event: PointerEvent): void {
  if (!dragging.value || event.pointerId !== pointerId) return
  dragging.value = false
  pointerId = -1
  const s = dragSide
  dragSide = null
  if (s === null) return
  // 打开态原地点按内容(源 InputEaterGridTapped):关闭(RemainOpen Execute 已被锁定挡下)
  if (!moved && startWidth > 0) {
    close()
    return
  }
  // 保持打开的阈值:已开态回拖(源 isNearOpen/isFarOpen 时的 resting 条件为「全幅」,
  // 非 min(尺寸,100))——任何实质回拖都落在全幅之下 → 关闭;容差 1px 抵消指针取整。
  const openThreshold = startWidth > 0 ? sideSizeOf(s) - 1 : thresholdOf(s)
  if (width.value > openThreshold) {
    if (modeOf(s) === 'Execute') {
      // 过阈值松手:调用首个项(Auto/Close → 关闭;RemainOpen → 停在满幅并锁定)
      const first = itemsOf(s)[0]
      if (first) invokeRegistration(s, first, true)
      else close()
    } else {
      // Reveal:停在完全打开(点击揭示项后再调用)
      snapOpen(s)
    }
  } else {
    close()
  }
}

function onPointerCancel(event: PointerEvent): void {
  if (!dragging.value || event.pointerId !== pointerId) return
  dragging.value = false
  pointerId = -1
  dragSide = null
  close()
}

// —— 视图样式 ——
/** 揭示层背景:边缘项背景色填充(源 UpdateColors:Left/Top 取末项,Right/Bottom 取首项)。 */
const swipeRootBackground = computed<string>(() => {
  const list = itemsOf(side.value)
  if (list.length === 0) return 'var(--wui-system-control-background-base-low)'
  const edge = side.value === 'left' ? list[list.length - 1] : list[0]
  return edge.config().background || 'var(--wui-system-control-background-base-low)'
})

const swipeRootStyle = computed(() => ({
  width: `${width.value}px`,
  background: swipeRootBackground.value,
}))

/** Execute 视差(源 m_executeExpressionAnimation):near(左/上)分支 = 0.5×content − 0.5×size,
 * far(右/下)分支 = 0.5×content + 0.5×size。配合面板锚定(left:0 / right:0)换算:
 * 左面板 translateX(calc(0.5×offset − 50%)),右面板 translateX(calc(50% − 0.5×offset));
 * 两种锚定下均满足「滑入半速、满幅恰好盖满」(50% = 面板宽 = 控件宽)。 */
const panelStyle = computed(() => {
  const s = side.value
  if (modeOf(s) !== 'Execute') return undefined
  const half = `calc(${s === 'left' ? `${width.value * 0.5}px - 50%` : `50% - ${width.value * 0.5}px`})`
  return { width: `${controlWidth.value}px`, transform: `translateX(${half})` }
})

/** 内容层随拖拽 1:1 平移(源 m_swipeAnimation 驱动 ContentRoot)。 */
const contentStyle = computed(() => ({
  transform: `translateX(${dirOf(side.value) * width.value}px)`,
}))

// —— 控件级上下文(provide 给面板内 SwipeItem;侧别由面板 data-wui-swipe-side +
//    项挂载时 closest 判定 —— provide 对所有后代可见,不能按左右发两个 key)——
const controlContext: SwipeControlContext = {
  isExecute: (s) => modeOf(s) === 'Execute',
  thresholdReached: (s) => thresholdReached.value && side.value === s,
  isOpen: (s) => open.value && side.value === s,
  controlDisabled: () => props.disabled,
  registerItem(s, registration) {
    const list = slotItems[s]
    list.push(registration)
    return () => {
      const i = indexOfRegistration(s, registration)
      if (i >= 0) list.splice(i, 1)
    }
  },
  isPrimary(s, registration) {
    // Execute 模式满铺与阈值配色仅作用于首个项(源只消费 GetAt(0))
    const list = slotItems[s]
    return list.length > 0 && toRaw(list[0]) === registration
  },
  requestInvoke(s, registration) {
    invokeRegistration(s, registration, false)
  },
  close: () => close(),
}
provide(WUI_SWIPE_CONTEXT, controlContext)

// —— 尺寸观察(Execute 满铺宽度)——
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  const root = rootRef.value
  if (!root) return
  controlWidth.value = root.clientWidth
  resizeObserver = new ResizeObserver(() => {
    controlWidth.value = root.clientWidth
    // 打开态尺寸跟随(宽度收窄时钳制,避免揭示层溢出)
    if (open.value && width.value > 0) {
      const maxW = sideSizeOf(side.value)
      if (maxW > 0) width.value = Math.min(width.value, maxW)
    }
  })
  resizeObserver.observe(root)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  detachDismissListeners()
  releaseLastInteractedSwipe(dismissHandle)
})

// —— 禁用 / 模式变化:立即关闭(源模式切换会重建内容并复位)——
watch(
  () => props.disabled,
  (d) => {
    if (d) close()
  },
)
watch([() => props.leftMode, () => props.rightMode], () => close())

// —— 对外方法(WinUI SwipeControl.Close 的 Web 对应物)——
defineExpose({ close })
</script>

<template>
  <div
    v-bind="$attrs"
    ref="rootRef"
    class="wui-swipe"
    :class="{
      'wui-swipe--disabled': disabled,
      'wui-swipe--animating': !dragging,
      'wui-swipe--open': open,
    }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <!-- 揭示层:锚定活动侧、宽度 = 揭示宽度;关闭时 inert(项不入 Tab 序,源为按需创建内容) -->
    <div
      class="wui-swipe__swipeRoot"
      :class="[`wui-swipe__swipeRoot--${side}`, { 'wui-swipe__swipeRoot--threshold': thresholdReached }]"
      :style="swipeRootStyle"
      :inert="width <= 0"
      :aria-hidden="width <= 0 || undefined"
    >
      <!-- 左侧面板:Reveal 自然宽并排;Execute 满铺视差。双侧常驻布局(仅可见性切换),
           保证非活动侧面板宽度可即时测量(源按需创建内容,Web 以 visibility + inert 等效) -->
      <div
        ref="leftPanelRef"
        class="wui-swipe__panel wui-swipe__panel--left"
        data-wui-swipe-side="left"
        :class="{
          'wui-swipe__panel--execute': leftMode === 'Execute',
          'wui-swipe__panel--inactive': side !== 'left',
        }"
        :style="side === 'left' ? panelStyle : undefined"
        :inert="side !== 'left' || width <= 0"
      >
        <WuiSwipeItem
          v-for="(item, i) in leftItems"
          :key="`l-${i}`"
          :text="item.text"
          :icon="item.icon"
          :background="item.background"
          :foreground="item.foreground"
          :behavior-on-invoked="item.behaviorOnInvoked"
          :disabled="item.disabled"
        />
        <slot name="left" />
      </div>
      <!-- 右侧面板 -->
      <div
        ref="rightPanelRef"
        class="wui-swipe__panel wui-swipe__panel--right"
        data-wui-swipe-side="right"
        :class="{
          'wui-swipe__panel--execute': rightMode === 'Execute',
          'wui-swipe__panel--inactive': side !== 'right',
        }"
        :style="side === 'right' ? panelStyle : undefined"
        :inert="side !== 'right' || width <= 0"
      >
        <WuiSwipeItem
          v-for="(item, i) in rightItems"
          :key="`r-${i}`"
          :text="item.text"
          :icon="item.icon"
          :background="item.background"
          :foreground="item.foreground"
          :behavior-on-invoked="item.behaviorOnInvoked"
          :disabled="item.disabled"
        />
        <slot name="right" />
      </div>
    </div>

    <!-- 内容层:随拖拽平移。输入拦截层(源 InputEater)置于内容层内部、随之平移,
         只罩住被移开的内容区,不覆盖揭示区(揭示项因此可点) -->
    <div class="wui-swipe__content" :style="contentStyle">
      <slot />
      <div v-if="open && !lockedOpen" class="wui-swipe__eater" @click="close()" />
    </div>
  </div>
</template>

<style scoped>
/* 根:Transparent 背景、MinWidth 88 / MinHeight 40(ListViewItemMinWidth/MinHeight);
   overflow hidden 裁切平移中的内容(Web 侧消费常为列表行,等效父级裁切)。 */
.wui-swipe {
  position: relative;
  display: block;
  min-width: 88px;
  min-height: 40px;
  overflow: hidden;
  background: transparent;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.wui-swipe--disabled {
  pointer-events: none;
}

/* 揭示层:锚定活动侧,宽度随揭示量;视觉默认色 = SwipeItemBackground */
.wui-swipe__swipeRoot {
  position: absolute;
  top: 0;
  bottom: 0;
  overflow: hidden;
}

.wui-swipe__swipeRoot--left {
  left: 0;
}

.wui-swipe__swipeRoot--right {
  right: 0;
}

/* 面板:满高;Reveal 自然宽(项 68px 最小宽并排),Execute 满铺并视差平移(内联样式) */
.wui-swipe__panel {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
}

.wui-swipe__panel--left {
  left: 0;
}

.wui-swipe__panel--right {
  right: 0;
}

/* 非活动侧:仅隐藏可见性(保留布局,宽度可测);inert 已阻断焦点与命中 */
.wui-swipe__panel--inactive {
  visibility: hidden;
}

/* 内容层:占满,随拖拽平移;边框/背景等 $attrs 落在根,内容层承载 slot */
.wui-swipe__content {
  position: relative;
  display: flex;
  align-items: stretch;
  height: 100%;
}

/* 输入拦截层:透明罩住内容(源 InputEater,Tapped → Close) */
.wui-swipe__eater {
  position: absolute;
  inset: 0;
  cursor: default;
}

/* —— 过渡(松手回弹 / 吸附打开 / 关闭):拖拽中禁用,松手后启用 ——
   fallback 统一为 240ms 与 token 实值一致(MR1/A7;源为 InteractionTracker
   弹簧,无固定时长,240ms 为库近似档) */
.wui-swipe--animating .wui-swipe__swipeRoot {
  transition: width var(--wui-duration-normal, 240ms) var(--wui-easing-standard, ease);
}

.wui-swipe--animating .wui-swipe__panel {
  transition: transform var(--wui-duration-normal, 240ms) var(--wui-easing-standard, ease);
}

.wui-swipe--animating .wui-swipe__content {
  transition: transform var(--wui-duration-normal, 240ms) var(--wui-easing-standard, ease);
}
</style>
