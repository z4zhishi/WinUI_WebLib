<script setup lang="ts">
// SplitView —— WinUI SplitView 的 Web 复刻:带可开合窗格(pane)的双内容区容器。
// 视觉与状态规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L15008-15671
//   <Style TargetType="SplitView"> 模板段(DisplayModeStates 九态:Closed / ClosedCompactLeft|Right /
//   OpenInlineLeft|Right / OpenOverlayLeft|Right / OpenCompactOverlayLeft|Right + OverlayVisibilityStates;
//   PaneRoot(Canvas.ZIndex=1, PaneClipRectangle 裁剪)+ ContentRoot(含 LightDismissLayer)+ HCPaneBorder)。
//   颜色取 theme.css 的 --wui-* token:PaneBackground ← --wui-system-control-page-background-chrome-low、
//   LightDismissLayer ← --wui-split-view-light-dismiss-overlay-background(SplitViewLightDismissOverlayBackground
//   同键)、HCPaneBorder ← --wui-system-control-foreground-transparent(源即透明,仅高对比生效,见 forced-colors)。
// 布局语义对照模板:窗格侧轨道(Inline/CompactInline 参与布局推挤内容,CompactOverlay 恒留 compact 栏,
//   Overlay 不留轨道)+ 窗格浮层(Overlay/CompactOverlay 时 position:absolute 盖在内容上)+ 轻扫遮罩层。
//   Top/Bottom 为任务规格要求的 Web 同构推演(参照源模板仅实现 Left/Right,枚举含 Top/Bottom,见差异节)。
// 动效:开关取 animations.css token —— Overlay/CompactOverlay:开 = duration-slow + easing-standard
//   (源 0.35s KeySpline 0.1,0.9 0.2,1.0)、关 = duration-fast + easing-standard(源 0.12s 同曲线);
//   Inline/CompactInline:开 = duration-normal + easing-decelerate(源 0.2s KeySpline 0.0,0.35 0.15,1.0)、
//   关 = duration-fast + easing-decelerate(源 0.1s 同曲线);Inline 开合以 grid 轨道过渡 = 源
//   PaneClipRectangle 裁剪揭示 + ContentRoot 换列的 Web 等价,差异见 wiki。
// 交互:遮罩点击 / Esc 关闭(Overlay/CompactOverlay)、Overlay 窗格沿关闭方向轻扫关闭(Web 增强,任务规格)、
//   窗格浮层打开时按对话框语义处理(role="dialog" 非模态 + 焦点移交 / 归还)。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue'
import '../styles/animations.css'

/** WinUI SplitViewPanePlacement 枚举(generic.xaml 同名;模板仅含 Left/Right,Top/Bottom 为 Web 同构推演)。 */
type PanePlacementValue = 'Left' | 'Right' | 'Top' | 'Bottom'

/** WinUI SplitViewDisplayMode 枚举。 */
type DisplayModeValue = 'Inline' | 'Overlay' | 'CompactInline' | 'CompactOverlay'

const props = withDefaults(
  defineProps<{
    /** 窗格方位(WinUI PanePlacement):内容相对窗格的位置。 */
    panePlacement?: PanePlacementValue
    /** 展示模式(WinUI DisplayMode):Inline 推挤 / Overlay 浮层 / CompactInline 紧凑推挤 / CompactOverlay 紧凑浮层。 */
    displayMode?: DisplayModeValue
    /** 紧凑态窗格长度 px(WinUI CompactPaneLength,默认 SplitViewCompactPaneThemeLength = 48)。 */
    compactPaneLength?: number
    /** 展开态窗格长度 px(WinUI OpenPaneLength,默认 SplitViewOpenPaneThemeLength = 320)。 */
    openPaneLength?: number
    /** 窗格背景色(WinUI PaneBackground),任意 CSS 颜色;空串用 token 默认值。 */
    paneBackground?: string
    /** 窗格的无障碍名(浮层对话框语义时的 aria-label)。 */
    paneLabel?: string
  }>(),
  {
    panePlacement: 'Left',
    displayMode: 'Inline',
    compactPaneLength: 48,
    openPaneLength: 320,
    paneBackground: '',
    paneLabel: '',
  },
)

// —— IsPaneOpen 双向绑定(WinUI IsPaneOpen)——
const isPaneOpen = defineModel<boolean>('isPaneOpen', { default: false })

// —— 事件(WinUI PaneOpened / PaneClosing / PaneClosed;程序化赋值同样触发,与 WinUI 一致)——
const emit = defineEmits<{
  paneOpened: []
  paneClosing: []
  paneClosed: []
}>()

defineOptions({ inheritAttrs: false })

// —— 模式派生 ——
/** Overlay/CompactOverlay:窗格浮在内容上方,带轻扫遮罩。 */
const isOverlay = computed(
  () => props.displayMode === 'Overlay' || props.displayMode === 'CompactOverlay',
)
/** CompactInline/CompactOverlay:关闭时保留紧凑栏(rail)。 */
const isCompact = computed(
  () => props.displayMode === 'CompactInline' || props.displayMode === 'CompactOverlay',
)

/** 窗格侧轨道宽度:对照模板各态的 ColumnDefinition1/2(Inline 开 = OpenPaneGridLength,关 = 0;
 *  CompactInline 关 = CompactPaneGridLength;Overlay 恒 0;CompactOverlay 恒 CompactPaneGridLength)。 */
const trackLength = computed<number>(() => {
  switch (props.displayMode) {
    case 'Overlay':
      return 0
    case 'CompactOverlay':
      return props.compactPaneLength
    case 'CompactInline':
      return isPaneOpen.value ? props.openPaneLength : props.compactPaneLength
    default:
      return isPaneOpen.value ? props.openPaneLength : 0
  }
})

const rootVars = computed<Record<string, string>>(() => ({
  '--wui-splitview-open-length': `${props.openPaneLength}px`,
  '--wui-splitview-compact-length': `${props.compactPaneLength}px`,
  '--wui-splitview-track': `${trackLength.value}px`,
  '--wui-splitview-drag': `${dragOffset.value}px`,
}))

const paneBackgroundStyle = computed(() =>
  props.paneBackground ? { background: props.paneBackground } : undefined,
)

// —— 开关请求(遮罩点击 / Esc / 轻扫复用;动画与事件由 watcher 统一收口)——
function requestClose(): void {
  if (!isPaneOpen.value) return
  isPaneOpen.value = false
}

// —— 收尾通知(paneOpened/paneClosed 在动画结束后触发,对照 WinUI 动画完成时机)——
// 主路径:transitionend(Overlay 认窗格内容 transform,Inline 认根元素 grid 轨道);
// 兜底:定时器(时长 + 60ms)。两者共用 settleToken 保证每次切换只发一次。
// 时长取源精确值(SplitView themeresources):Inline 开/关 0.2s/0.1s,Overlay 开/关 0.35s/0.12s,
// 与下方 CSS 的 --sv-open-ms/--sv-close-ms 保持一致。
const OPEN_MS = computed(() => (isOverlay.value ? 350 : 200))
const CLOSE_MS = computed(() => (isOverlay.value ? 120 : 100))

const rootRef = ref<HTMLElement | null>(null)
const paneRef = ref<HTMLElement | null>(null)
const paneInnerRef = ref<HTMLElement | null>(null)

let settleToken = 0
let settleTimer: ReturnType<typeof setTimeout> | undefined
let pendingSettle: 'paneOpened' | 'paneClosed' | null = null

function clearSettle(): void {
  if (settleTimer !== undefined) {
    clearTimeout(settleTimer)
    settleTimer = undefined
  }
}

function fireSettle(): void {
  const kind = pendingSettle
  pendingSettle = null
  if (kind === 'paneOpened') emit('paneOpened')
  else if (kind === 'paneClosed') emit('paneClosed')
}

function scheduleSettle(kind: 'paneOpened' | 'paneClosed'): void {
  clearSettle()
  pendingSettle = kind
  const token = ++settleToken
  const ms = kind === 'paneOpened' ? OPEN_MS.value : CLOSE_MS.value
  settleTimer = setTimeout(() => {
    if (token !== settleToken) return
    settleTimer = undefined
    fireSettle()
  }, ms + 60)
}

function onRootTransitionEnd(event: TransitionEvent): void {
  const target = event.target
  if (isOverlay.value) {
    // Overlay:窗格滑入 / 滑出的 transform 过渡(轻扫回弹同属性,但无待发事件时为空操作)
    if (target === paneInnerRef.value && event.propertyName === 'transform') {
      clearSettle()
      ++settleToken
      fireSettle()
    }
    return
  }
  if (target === rootRef.value && event.propertyName.startsWith('grid-template')) {
    clearSettle()
    ++settleToken
    fireSettle()
  }
}

// —— 对话框语义(Overlay/CompactOverlay 打开时):焦点移交 / 归还 ——
let savedFocus: Element | null = null

function captureFocus(): void {
  savedFocus = document.activeElement
  void nextTick(() => paneRef.value?.focus({ preventScroll: true }))
}

function restoreFocus(): void {
  const active = document.activeElement
  if (active && paneRef.value && paneRef.value.contains(active)) {
    if (savedFocus instanceof HTMLElement && savedFocus.isConnected) savedFocus.focus()
  }
}

watch(isPaneOpen, (open, old) => {
  if (open === old) return
  clearSettle()
  if (open) {
    scheduleSettle('paneOpened')
    if (isOverlay.value) captureFocus()
  } else {
    // 次序对照 WinUI:先 PaneClosing,关动画结束后 PaneClosed
    emit('paneClosing')
    scheduleSettle('paneClosed')
    if (isOverlay.value) restoreFocus()
  }
})

onBeforeUnmount(clearSettle)

// —— Esc 关闭(Overlay/CompactOverlay;WinUI 无此行为,任务规格要求的 Web 增强)——
function onWindowKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  if (!isPaneOpen.value || !isOverlay.value) return
  requestClose()
}

onMounted(() => window.addEventListener('keydown', onWindowKeyDown))
onBeforeUnmount(() => window.removeEventListener('keydown', onWindowKeyDown))

// —— 轻扫关闭(仅 Overlay/CompactOverlay 打开时;WinUI 无此行为,任务规格要求的 Web 增强)——
// 手势:沿「关闭方向」拖动窗格(Left 窗格向左、Right 向右、Top 向上、Bottom 向下),
// 位移绝对值超过阈值(min(80, openPaneLength/3))时关闭,否则回弹。
// 符号模型(F1 修复后统一):dragOffset = 拖移在窗格滑动轴上的原始分量
// (Left/Right 取水平 dx,Top/Bottom 取垂直 dy),仅保留关闭方向的分量并限幅:
// Left/Top 关闭方向为负轴(负位移),Right/Bottom 为正轴(正位移)。
// 该值与 CSS 目标位移公式直接可加 —— 开:translate(drag) 跟手;
// 关:translate(∓100% + drag) 从拖移位置继续收尾 —— 方向恒与手指一致。
const SWIPE_START_PX = 8
const dragOffset = ref(0)

interface SwipeState {
  pointerId: number
  startX: number
  startY: number
  active: boolean
}

let swipe: SwipeState | null = null

/** 窗格滑动轴上的关闭方向是否为负轴(Left 向左关 / Top 向上关;Right 向右关 / Bottom 向下关为正轴)。 */
function isClosingNegative(): boolean {
  return props.panePlacement === 'Left' || props.panePlacement === 'Top'
}

/**
 * 轻扫跟手位移:取拖移在窗格滑动轴上的分量(Left/Right 为水平 dx,Top/Bottom 为垂直 dy),
 * 只保留关闭方向的分量并限幅至 [−openPaneLength, 0](负轴)或 [0, +openPaneLength](正轴)。
 * 返回值直接作为窗格内容的跟手位移(叠加在开 / 关目标位移上),方向恒与手指一致(F1 符号模型)。
 */
function swipeAxisDelta(clientX: number, clientY: number, startX: number, startY: number): number {
  const isHorizontalPane = props.panePlacement === 'Left' || props.panePlacement === 'Right'
  const axisDelta = isHorizontalPane ? clientX - startX : clientY - startY
  if (isClosingNegative()) return Math.min(Math.max(axisDelta, -props.openPaneLength), 0)
  return Math.min(Math.max(axisDelta, 0), props.openPaneLength)
}

function onPanePointerDown(event: PointerEvent): void {
  if (!isOverlay.value || !isPaneOpen.value || event.button !== 0) return
  swipe = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false }
}

function onPanePointerMove(event: PointerEvent): void {
  if (!swipe || event.pointerId !== swipe.pointerId) return
  const delta = swipeAxisDelta(event.clientX, event.clientY, swipe.startX, swipe.startY)
  if (!swipe.active && Math.abs(delta) > SWIPE_START_PX) {
    swipe.active = true
    paneRef.value?.setPointerCapture(event.pointerId)
  }
  if (swipe.active) {
    dragOffset.value = delta
  }
}

function onPanePointerUp(event: PointerEvent): void {
  if (!swipe || event.pointerId !== swipe.pointerId) return
  const active = swipe.active
  swipe = null
  if (!active) return
  const threshold = Math.min(80, props.openPaneLength / 3)
  if (Math.abs(dragOffset.value) > threshold) requestClose()
  // 复位拖移量:transform 过渡会从当前渲染位置(含拖移)动画到目标态,回弹 / 关闭皆平滑
  dragOffset.value = 0
}

// —— $attrs 路由(单根控件,inheritAttrs:false):class/style/id/data-*/事件监听等全部透传根元素 ——
const attrs = useAttrs()
</script>

<template>
  <div
    v-bind="attrs"
    ref="rootRef"
    class="wui-splitview"
    :class="[
      `wui-splitview--${panePlacement.toLowerCase()}`,
      {
        'wui-splitview--is-overlay': isOverlay,
        'wui-splitview--is-compact': isCompact,
        'wui-splitview--is-open': isPaneOpen,
        'wui-splitview--pane-hidden': !isPaneOpen && !isCompact,
        'wui-splitview--is-dragging': dragOffset !== 0,
      },
    ]"
    :style="rootVars"
    @transitionend="onRootTransitionEnd"
  >
    <!-- 内容区(ContentRoot:Inline 态占内容列,Overlay 态横跨全幅) -->
    <div class="wui-splitview__content">
      <slot />
    </div>

    <!-- 轻扫遮罩层(LightDismissLayer:仅 Overlay 系渲染,点击关闭窗格) -->
    <div
      v-if="isOverlay"
      class="wui-splitview__dismiss"
      :class="{ 'wui-splitview__dismiss--visible': isPaneOpen }"
      aria-hidden="true"
      @click="requestClose"
    ></div>

    <!-- 窗格(PaneRoot:Inline 态为窗格轨道单元格并裁剪;Overlay 态为浮层;z 序在内容与遮罩之上) -->
    <div
      ref="paneRef"
      class="wui-splitview__pane"
      :role="isOverlay ? 'dialog' : undefined"
      :aria-label="isOverlay && paneLabel ? paneLabel : undefined"
      tabindex="-1"
      @pointerdown="onPanePointerDown"
      @pointermove="onPanePointerMove"
      @pointerup="onPanePointerUp"
      @pointercancel="onPanePointerUp"
    >
      <div ref="paneInnerRef" class="wui-splitview__pane-inner" :style="paneBackgroundStyle">
        <slot name="pane"><!-- 内置空 pane:未提供 #pane 时仅呈现窗格背景 --></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 generic.xaml L15016-15669 ControlTemplate:
 * Grid(ColumnDefinition1 = 窗格侧轨道 + ColumnDefinition2 = *)
 *   ├ PaneRoot(Grid.ColumnSpan=2, ZIndex=1, Background=PaneBackground, PaneClipRectangle 裁剪)
 *   └ ContentRoot(Grid.ColumnSpan=2)> Border(Content)+ LightDismissLayer
 * 颜色 / 圆角 / 时长一律 token;布局轨道 / 浮层锚定按 DisplayModeStates 九态语义实现。
 */
.wui-splitview {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  overflow: hidden; /* PaneClipRectangle 语义:窗格滑入 / 滑出时被控件边界裁剪 */
  /* 开合动画时长取源精确值(SplitView themeresources:Inline 0.2s/0.1s,Overlay 0.35s/0.12s;
     KeySpline 与 --wui-easing-decelerate / --wui-easing-standard 同曲线)。
     JS 侧 OPEN_MS/CLOSE_MS 与此保持一致。 */
  --sv-open-ms: 200ms;
  --sv-close-ms: 100ms;
}

.wui-splitview--is-overlay {
  --sv-open-ms: 350ms;
  --sv-close-ms: 120ms;
}

/* —— 轨道方向:Left/Top 窗格列(行)在前;Right/Bottom 在后 —— */
.wui-splitview--left,
.wui-splitview--right {
  grid-template-rows: minmax(0, 1fr);
}

.wui-splitview--top,
.wui-splitview--bottom {
  grid-template-columns: minmax(0, 1fr);
}

.wui-splitview--left {
  grid-template-columns: var(--wui-splitview-track) minmax(0, 1fr);
}

.wui-splitview--right {
  grid-template-columns: minmax(0, 1fr) var(--wui-splitview-track);
}

.wui-splitview--top {
  grid-template-rows: var(--wui-splitview-track) minmax(0, 1fr);
}

.wui-splitview--bottom {
  grid-template-rows: minmax(0, 1fr) var(--wui-splitview-track);
}

/* Inline 系:内容被窗格推挤 → 轨道宽度过渡(源 ClosedCompactLeft/Right 与 OpenInline* 各态换列的等价)。
   开 = duration-normal + decelerate(源 0.2s KeySpline 0.0,0.35 0.15,1.0);
   关 = duration-fast + decelerate(源 0.1s 同曲线)。Overlay 系轨道不变,无需过渡。 */
.wui-splitview:not(.wui-splitview--is-overlay) {
  transition:
    grid-template-columns var(--sv-close-ms) var(--wui-easing-decelerate),
    grid-template-rows var(--sv-close-ms) var(--wui-easing-decelerate);
}

.wui-splitview:not(.wui-splitview--is-overlay).wui-splitview--is-open {
  transition-duration: var(--sv-open-ms);
}

/* —— 内容区(ContentRoot):默认全幅;Inline 系让出窗格轨道 —— */
.wui-splitview__content {
  grid-area: 1 / 1;
  min-width: 0;
  min-height: 0;
}

.wui-splitview--left .wui-splitview__content {
  grid-area: 1 / 2;
}

.wui-splitview--right .wui-splitview__content {
  grid-area: 1 / 1;
}

.wui-splitview--top .wui-splitview__content {
  grid-area: 2 / 1;
}

.wui-splitview--bottom .wui-splitview__content {
  grid-area: 1 / 1;
}

.wui-splitview--left.wui-splitview--is-overlay .wui-splitview__content,
.wui-splitview--right.wui-splitview--is-overlay .wui-splitview__content {
  grid-area: 1 / 1 / 2 / -1; /* Overlay 系:内容横跨全幅(模板默认 ColumnSpan=2) */
}

.wui-splitview--top.wui-splitview--is-overlay .wui-splitview__content,
.wui-splitview--bottom.wui-splitview--is-overlay .wui-splitview__content {
  grid-area: 1 / 1 / -1 / 2;
}

/* —— 轻扫遮罩层(LightDismissLayer:SplitViewLightDismissOverlayBackground,开 0→1 / 关 1→0 透明度过渡)—— */
.wui-splitview__dismiss {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: var(--wui-split-view-light-dismiss-overlay-background);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  /* 关:淡出 duration-fast(≈源 0.12s)+ standard,visibility 延迟至淡出结束 */
  transition:
    opacity var(--wui-duration-fast) var(--wui-easing-standard),
    visibility 0s linear var(--wui-duration-fast);
}

.wui-splitview__dismiss--visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  /* 开:立即可见,淡入 duration-slow(源 0.35s)+ standard */
  transition:
    opacity var(--wui-duration-slow) var(--wui-easing-standard),
    visibility 0s;
}

/* —— 窗格外壳(PaneRoot + PaneClipRectangle):Inline 系 = 轨道单元格(自裁剪);Overlay 系 = 浮层 ——
   flex 锚定窗格内容到近边:裁剪时露出近边条带(源 ClosedCompactLeft 露左 / Right 露右的等价)。 */
.wui-splitview__pane {
  z-index: 2;
  display: flex;
  overflow: hidden;
  outline: none; /* 程序聚焦目标(dialog 语义),不呈现焦点环 */
}

.wui-splitview--left .wui-splitview__pane {
  justify-content: flex-start;
}

.wui-splitview--right .wui-splitview__pane {
  justify-content: flex-end;
}

.wui-splitview--top .wui-splitview__pane {
  flex-direction: column;
  justify-content: flex-start;
}

.wui-splitview--bottom .wui-splitview__pane {
  flex-direction: column;
  justify-content: flex-end;
}

.wui-splitview:not(.wui-splitview--is-overlay) .wui-splitview__pane {
  /* Inline 系:占据窗格轨道,随轨道过渡完成「揭示」(源 PaneClipRectangle 平移的等价) */
  min-width: 0;
  min-height: 0;
}

.wui-splitview--left:not(.wui-splitview--is-overlay) .wui-splitview__pane {
  grid-area: 1 / 1;
}

.wui-splitview--right:not(.wui-splitview--is-overlay) .wui-splitview__pane {
  grid-area: 1 / 2;
}

.wui-splitview--top:not(.wui-splitview--is-overlay) .wui-splitview__pane {
  grid-area: 1 / 1;
}

.wui-splitview--bottom:not(.wui-splitview--is-overlay) .wui-splitview__pane {
  grid-area: 2 / 1;
}

.wui-splitview--is-overlay .wui-splitview__pane {
  position: absolute;
  width: var(--wui-splitview-open-length);
  /* 开:宽度揭示过渡 duration-slow + standard(源 ClosedCompactLeft→OpenCompactOverlayLeft 0.35s),
     visibility 立即可见;非 compact 模式宽度恒定,过渡无感。 */
  transition:
    width var(--wui-duration-slow) var(--wui-easing-standard),
    height var(--wui-duration-slow) var(--wui-easing-standard),
    visibility 0s;
}

/* 关:宽度收拢 duration-fast + standard(≈源 0.12s),visibility 延迟至收拢结束 */
.wui-splitview--is-overlay:not(.wui-splitview--is-open) .wui-splitview__pane {
  transition:
    width var(--wui-duration-fast) var(--wui-easing-standard),
    height var(--wui-duration-fast) var(--wui-easing-standard),
    visibility 0s linear var(--wui-duration-fast);
}

.wui-splitview--left.wui-splitview--is-overlay .wui-splitview__pane {
  top: 0;
  bottom: 0;
  left: 0;
}

.wui-splitview--right.wui-splitview--is-overlay .wui-splitview__pane {
  top: 0;
  bottom: 0;
  right: 0;
}

.wui-splitview--top.wui-splitview--is-overlay .wui-splitview__pane {
  top: 0;
  left: 0;
  right: 0;
  width: auto;
  height: var(--wui-splitview-open-length);
}

.wui-splitview--bottom.wui-splitview--is-overlay .wui-splitview__pane {
  bottom: 0;
  left: 0;
  right: 0;
  width: auto;
  height: var(--wui-splitview-open-length);
}

/* Overlay 系关闭且非 compact:窗格完全隐藏(模板 Closed 态 PaneRoot Visibility=Collapsed);
   visibility 延迟至滑出过渡结束,保证关闭动画可见。 */
.wui-splitview--is-overlay.wui-splitview--pane-hidden .wui-splitview__pane {
  visibility: hidden;
}

/* CompactOverlay 关闭:浮层窗格缩至紧凑栏宽,呈现近边条带(源 ClosedCompactLeft/Right 裁剪语义) */
.wui-splitview--is-overlay.wui-splitview--is-compact:not(.wui-splitview--is-open) .wui-splitview__pane {
  width: var(--wui-splitview-compact-length);
}

.wui-splitview--is-overlay.wui-splitview--is-compact:not(.wui-splitview--is-open).wui-splitview--top .wui-splitview__pane,
.wui-splitview--is-overlay.wui-splitview--is-compact:not(.wui-splitview--is-open).wui-splitview--bottom .wui-splitview__pane {
  width: auto;
  height: var(--wui-splitview-compact-length);
}

/* Inline 系完全关闭(非 compact):窗格内容移出焦点序与可访问性树(随轨道收拢后隐藏) */
.wui-splitview:not(.wui-splitview--is-overlay).wui-splitview--pane-hidden .wui-splitview__pane {
  visibility: hidden;
  transition: visibility 0s linear var(--wui-duration-fast);
}

/* —— 窗格内容(宽 / 高恒为 OpenPaneLength,锚定近边 → 裁剪时露出近边条带)—— */
.wui-splitview__pane-inner {
  display: block;
  flex: none; /* 恒为展开长度,不随轨道 / 紧凑外壳收缩 */
  background: var(--wui-system-control-page-background-chrome-low); /* PaneBackground 默认值 */
  color: var(--wui-application-foreground-theme);
}

.wui-splitview--left .wui-splitview__pane-inner,
.wui-splitview--right .wui-splitview__pane-inner {
  width: var(--wui-splitview-open-length);
  height: 100%;
}

.wui-splitview--top .wui-splitview__pane-inner,
.wui-splitview--bottom .wui-splitview__pane-inner {
  width: 100%;
  height: var(--wui-splitview-open-length);
}

/* Overlay 系滑移(PaneTransform):开 = 0.35s + standard(源 0.35s KeySpline 0.1,0.9 0.2,1.0);
   关 = 0.12s + standard(源 0.12s)。拖移量 --wui-splitview-drag 叠加在目标位移上。 */
.wui-splitview--is-overlay .wui-splitview__pane-inner {
  transition: transform var(--sv-close-ms) var(--wui-easing-standard);
}

.wui-splitview--is-overlay.wui-splitview--is-open .wui-splitview__pane-inner {
  transition-duration: var(--sv-open-ms);
}

.wui-splitview--is-overlay.wui-splitview--is-dragging .wui-splitview__pane-inner {
  transition: none; /* 跟手拖移 */
}

/* 关闭且非 compact:窗格内容整体滑出(模板 Closed 态 PaneRoot 隐藏 + PaneTransform 滑移);
   方向随 placement(负 100% / 正 100% + 轻扫拖移量)。Compact 系关闭时内容停在原位,
   由外壳收拢为紧凑栏露出近边条带(ClosedCompact* 裁剪语义),不滑移。 */
.wui-splitview--is-overlay.wui-splitview--pane-hidden.wui-splitview--left .wui-splitview__pane-inner {
  transform: translateX(calc(-100% + var(--wui-splitview-drag, 0px)));
}

.wui-splitview--is-overlay.wui-splitview--pane-hidden.wui-splitview--right .wui-splitview__pane-inner {
  transform: translateX(calc(100% + var(--wui-splitview-drag, 0px)));
}

.wui-splitview--is-overlay.wui-splitview--pane-hidden.wui-splitview--top .wui-splitview__pane-inner {
  transform: translateY(calc(-100% + var(--wui-splitview-drag, 0px)));
}

.wui-splitview--is-overlay.wui-splitview--pane-hidden.wui-splitview--bottom .wui-splitview__pane-inner {
  transform: translateY(calc(100% + var(--wui-splitview-drag, 0px)));
}

.wui-splitview--left.wui-splitview--is-overlay.wui-splitview--is-open .wui-splitview__pane-inner,
.wui-splitview--right.wui-splitview--is-overlay.wui-splitview--is-open .wui-splitview__pane-inner {
  transform: translateX(var(--wui-splitview-drag, 0px));
}

.wui-splitview--top.wui-splitview--is-overlay.wui-splitview--is-open .wui-splitview__pane-inner,
.wui-splitview--bottom.wui-splitview--is-overlay.wui-splitview--is-open .wui-splitview__pane-inner {
  transform: translateY(var(--wui-splitview-drag, 0px));
}

/* Overlay 紧凑栏:窗格内容近边条带透过外壳裁剪呈现(Horizontal:横滑只跟手,纵滚不劫持) */
.wui-splitview--left.wui-splitview--is-overlay .wui-splitview__pane,
.wui-splitview--right.wui-splitview--is-overlay .wui-splitview__pane {
  touch-action: pan-y;
}

.wui-splitview--top.wui-splitview--is-overlay .wui-splitview__pane,
.wui-splitview--bottom.wui-splitview--is-overlay .wui-splitview__pane {
  touch-action: pan-x;
}

/* HCPaneBorder(1px,SystemControlForegroundTransparentBrush = 透明,仅高对比模式描边;
   源模板中该边框为高对比辅助,SfD 一般主题下不可见) */
.wui-splitview__pane-inner {
  border-inline-end: 1px solid transparent;
}

.wui-splitview--right .wui-splitview__pane-inner,
.wui-splitview--top .wui-splitview__pane-inner {
  border-inline-end: 0;
  border-inline-start: 1px solid transparent;
}

.wui-splitview--top .wui-splitview__pane-inner,
.wui-splitview--bottom .wui-splitview__pane-inner {
  border-inline-end: 0;
  border-inline-start: 0;
  border-block-end: 1px solid transparent;
}

.wui-splitview--bottom .wui-splitview__pane-inner {
  border-block-end: 0;
  border-block-start: 1px solid transparent;
}

@media (forced-colors: active) {
  .wui-splitview--left:not(.wui-splitview--top):not(.wui-splitview--bottom) .wui-splitview__pane-inner {
    border-inline-end-color: CanvasText;
  }

  .wui-splitview--right:not(.wui-splitview--top):not(.wui-splitview--bottom) .wui-splitview__pane-inner {
    border-inline-start-color: CanvasText;
  }

  .wui-splitview--top .wui-splitview__pane-inner {
    border-block-end-color: CanvasText;
  }

  .wui-splitview--bottom .wui-splitview__pane-inner {
    border-block-start-color: CanvasText;
  }
}
</style>
