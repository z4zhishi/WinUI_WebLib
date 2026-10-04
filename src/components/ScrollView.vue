<script lang="ts">
// ScrollView(WinUI 3 新滚动控件)类型对外导出,供使用方与示例页引用。
// 枚举名与取值一一对照 WinUI:
//   ScrollingContentOrientation / ScrollingScrollBarVisibility / ScrollingScrollMode /
//   ScrollingZoomMode / ScrollingAnimationMode / ScrollingInteractionState
//   (CK/WinUI-Reference/controls/dev/ScrollPresenter/ScrollPresenter.idl L6-L22、L26-L39)
/** 内容测量方向(WinUI ScrollingContentOrientation);ScrollView 控件默认 Vertical(ScrollView.xaml L8)。 */
export type ScrollingContentOrientation = 'Vertical' | 'Horizontal' | 'None' | 'Both'
/** 滚动条可见性(WinUI ScrollingScrollBarVisibility);控件默认 Auto(ScrollView.h L26-L27)。 */
export type ScrollingScrollBarVisibility = 'Auto' | 'Visible' | 'Hidden'
/** 滚动模式(WinUI ScrollingScrollMode);Auto 在 Web 按 Enabled 处理(见 wiki 差异节)。 */
export type ScrollingScrollMode = 'Enabled' | 'Disabled' | 'Auto'
/** 缩放模式(WinUI ScrollingZoomMode);控件默认 Disabled(ScrollView.xaml L16)。 */
export type ScrollingZoomMode = 'Enabled' | 'Disabled'
/** 编程滚动/缩放的动画模式(WinUI ScrollingAnimationMode)。 */
export type ScrollingAnimationMode = 'Disabled' | 'Enabled' | 'Auto'
/** 交互状态(WinUI ScrollingInteractionState);Inertia 在 Web 无法与 Interaction 区分,不使用。 */
export type ScrollingInteractionState = 'Idle' | 'Interaction' | 'Inertia' | 'Animation'

/** 编程滚动/缩放选项(对照 WinUI ScrollingScrollOptions / ScrollingZoomOptions 的动画维度)。 */
export interface ScrollingMotionOptions {
  /** 动画模式;缺省 Enabled(rAF 补间,默认时长 DEFAULT_MOTION_MS)。Disabled 立即到位。 */
  animation?: ScrollingAnimationMode
  /** 自定义动画时长(ms);仅 animation 非 Disabled 时生效。 */
  durationMs?: number
}

/** viewChanged 事件参数(偏移与缩放读数)。 */
export interface ScrollViewViewChangedArgs {
  horizontalOffset: number
  verticalOffset: number
  zoomFactor: number
}

/** extentChanged 事件参数(内容总尺寸,含缩放布局的滚动像素空间)。 */
export interface ScrollViewExtentChangedArgs {
  extentWidth: number
  extentHeight: number
}

/** stateChanged 事件参数。 */
export interface ScrollViewStateChangedArgs {
  state: ScrollingInteractionState
}

/** scrollAnimationStarting 事件参数(即将开始的滚动目标)。 */
export interface ScrollViewScrollAnimationStartingArgs {
  targetHorizontalOffset: number
  targetVerticalOffset: number
}

/** scrollCompleted 事件参数(滚动完成时的实际偏移)。 */
export interface ScrollViewScrollCompletedArgs {
  horizontalOffset: number
  verticalOffset: number
}

/** zoomAnimationStarting 事件参数(即将开始的缩放目标值)。 */
export interface ScrollViewZoomAnimationStartingArgs {
  targetZoomFactor: number
}

/** zoomCompleted 事件参数(缩放完成后的实际值)。 */
export interface ScrollViewZoomCompletedArgs {
  zoomFactor: number
}
</script>

<script setup lang="ts">
// ScrollView —— WinUI 3 新滚动控件 ScrollView 的 Web 复刻(与 ScrollViewer 并存,阶段 2)。
// 视觉与结构对照源:CK/WinUI-Reference/controls/dev/ScrollView/ScrollView.xaml(DefaultScrollViewStyle
//   ControlTemplate)—— 根 Grid(PART_Root,承载 BorderBrush/BorderThickness/CornerRadius)>
//   ScrollPresenter(内容视口)+ 专属 Row/Column 上的 ScrollBar + PART_ScrollBarsSeparator;
//   themeresources:ScrollViewScrollBarsMargin=1、SeparatorBackground=ControlFillColorTransparentBrush。
// API 面对照源:controls/dev/ScrollView/ScrollView.idl —— 属性(ContentOrientation、
//   Horizontal/VerticalScrollBarVisibility、Horizontal/VerticalScrollMode、ZoomMode、
//   Min/MaxZoomFactor、只读偏移/Extent/Viewport/Scrollable/State/Computed*)、方法(ScrollTo/ScrollBy/
//   ZoomTo/ZoomBy,此处另提供 scrollToOffset 别名)、事件(ViewChanged/ExtentChanged/StateChanged/
//   ScrollAnimationStarting/ScrollCompleted/ZoomAnimationStarting/ZoomCompleted)。
// 实现选型(与 WinUI 的差异详见 wiki/controls/ScrollView.md):
//   1. 滚动物理由「原生 overflow 承载」(overflow: auto/scroll/hidden),滚动条按 WinUI 观感用
//      PL2 Fluent 语义 token 修饰(native scrollbar 伪元素 + scrollbar-color;PL15 由 legacy
//      --wui-scroll-bar-* 重定向到 controls/dev 权威键);ScrollView 模板里
//      ScrollBar 占据专属 Row/Column 布局空间的形态无法用原生滚动条复刻,wiki 记录;
//   2. 缩放用 CSS zoom(布局参与滚动范围计算,滚动偏移自动适配;WinUI ZoomFactor 的语义对应物);
//   3. ContentOrientation 四值映射到内容元素的 CSS 测量盒(见 contentOrientationClass 注释);
//   4. 编程滚动/缩放为 rAF easeOutCubic 补间,发出与 WinUI 同名的 *AnimationStarting/*Completed 事件;
//      AddScrollVelocity / AddZoomVelocity(惯性物理)与 snap points、AnchorRatio、BringingIntoView
//      等未复刻,wiki 记录。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
// MR3/B8:共享工具替代本组件裸 matchMedia(JS 滚动补间的降级通道)
import { prefersReducedMotion } from '../composables/useReducedMotion'

defineOptions({ inheritAttrs: false, name: 'WuiScrollView' })

const props = withDefaults(
  defineProps<{
    /** 内容测量方向(WinUI ContentOrientation):Vertical 内容横向受约束、可竖向滚动;
     * Horizontal 相反;None 内容双向受约束到视口(照片查看器);Both 内容双向取自然尺寸。 */
    contentOrientation?: ScrollingContentOrientation
    /** 横向滚动条可见性(WinUI HorizontalScrollBarVisibility);缺省 Auto。 */
    horizontalScrollBarVisibility?: ScrollingScrollBarVisibility
    /** 纵向滚动条可见性(WinUI VerticalScrollBarVisibility);缺省 Auto。 */
    verticalScrollBarVisibility?: ScrollingScrollBarVisibility
    /** 横向滚动模式(WinUI HorizontalScrollMode);Disabled 时用户输入不可滚动(编程滚动仍可用);缺省 Auto。 */
    horizontalScrollMode?: ScrollingScrollMode
    /** 纵向滚动模式(WinUI VerticalScrollMode);缺省 Auto。 */
    verticalScrollMode?: ScrollingScrollMode
    /** 缩放模式(WinUI ZoomMode):Enabled 时 Ctrl+滚轮/触控板捏合缩放;缺省 Disabled。 */
    zoomMode?: ScrollingZoomMode
    /** 初始/受驱缩放倍数(WinUI ZoomFactor 为只读,经 ZoomTo 变更;此处属性变化即时 zoomTo)。 */
    zoomFactor?: number
    /** 最小缩放倍数(WinUI MinZoomFactor);缺省 0.1。 */
    minZoomFactor?: number
    /** 最大缩放倍数(WinUI MaxZoomFactor);缺省 10。 */
    maxZoomFactor?: number
    /** 是否可聚焦(WinUI IsTabStop)。a11y 修订:滚动视口恒 tabindex=0(WCAG 2.1.1 键盘滚动
     *  / axe scrollable-region-focusable),禁用时 -1;本属性保留 API 兼容,不再影响 Tab 序。 */
    isTabStop?: boolean
    /** 禁用(WinUI IsEnabled=false):指针与滚轮交互关闭。 */
    disabled?: boolean
  }>(),
  {
    contentOrientation: 'Vertical',
    horizontalScrollBarVisibility: 'Auto',
    verticalScrollBarVisibility: 'Auto',
    horizontalScrollMode: 'Auto',
    verticalScrollMode: 'Auto',
    zoomMode: 'Disabled',
    zoomFactor: 1,
    minZoomFactor: 0.1,
    maxZoomFactor: 10,
    isTabStop: false,
    disabled: false,
  },
)

// —— 事件(WinUI 事件名,模板里监听写 @view-changed 等)——
const emit = defineEmits<{
  viewChanged: [args: ScrollViewViewChangedArgs]
  extentChanged: [args: ScrollViewExtentChangedArgs]
  stateChanged: [args: ScrollViewStateChangedArgs]
  scrollAnimationStarting: [args: ScrollViewScrollAnimationStartingArgs]
  scrollCompleted: [args: ScrollViewScrollCompletedArgs]
  zoomAnimationStarting: [args: ScrollViewZoomAnimationStartingArgs]
  zoomCompleted: [args: ScrollViewZoomCompletedArgs]
}>()

/** 编程动画默认时长(ms):近似 WinUI 默认滚动/缩放动画的量级,可用 options.durationMs 覆盖。 */
const DEFAULT_MOTION_MS = 300

// —— 只读状态(对照 WinUI ScrollView 只读属性;winui. 前缀冲突无,名字即语义)——
const rootEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)

const horizontalOffset = ref(0)
const verticalOffset = ref(0)
const currentZoom = ref(props.zoomFactor)
const extentWidth = ref(0)
const extentHeight = ref(0)
const viewportWidth = ref(0)
const viewportHeight = ref(0)
const state = ref<ScrollingInteractionState>('Idle')

const scrollableWidth = computed(() => Math.max(0, extentWidth.value - viewportWidth.value))
const scrollableHeight = computed(() => Math.max(0, extentHeight.value - viewportHeight.value))

/** 计算后的滚动条可见性(WinUI Computed*ScrollBarVisibility:Visible/Collapsed)。 */
const computedHorizontalScrollBarVisibility = computed<'Visible' | 'Collapsed'>(() => {
  if (props.horizontalScrollBarVisibility === 'Hidden') return 'Collapsed'
  if (props.horizontalScrollBarVisibility === 'Visible') return 'Visible'
  return scrollableWidth.value > 0.5 ? 'Visible' : 'Collapsed'
})
const computedVerticalScrollBarVisibility = computed<'Visible' | 'Collapsed'>(() => {
  if (props.verticalScrollBarVisibility === 'Hidden') return 'Collapsed'
  if (props.verticalScrollBarVisibility === 'Visible') return 'Visible'
  return scrollableHeight.value > 0.5 ? 'Visible' : 'Collapsed'
})

// —— 编程补间(rAF,easeOutCubic;与 WinUI *AnimationStarting → *Completed 事件时序对应)——
let cancelScrollTween: (() => void) | null = null
let cancelZoomTween: (() => void) | null = null

function cancelMotion(): void {
  cancelScrollTween?.()
  cancelZoomTween?.()
}

/** 通用 rAF 补间;返回取消函数。reduced-motion 或时长 <= 0 时直接到终值。 */
function runTween(durationMs: number, step: (easedT: number) => void, done: () => void): () => void {
  if (durationMs <= 0 || prefersReducedMotion()) {
    step(1)
    done()
    return () => {}
  }
  let rafId = 0
  let cancelled = false
  const start = performance.now()
  const frame = (now: number): void => {
    if (cancelled) return
    const t = Math.min(1, (now - start) / durationMs)
    step(1 - Math.pow(1 - t, 3))
    if (t < 1) rafId = requestAnimationFrame(frame)
    else done()
  }
  rafId = requestAnimationFrame(frame)
  return () => {
    cancelled = true
    cancelAnimationFrame(rafId)
  }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// —— 缩放:CSS zoom 参与布局,滚动范围随缩放自动变化;锚点(视口内坐标)内容点保持不动 ——
/** 以视口内锚点(cx, cy)把缩放变到 z:锚点下的内容坐标在缩放前后保持同一屏幕位置。 */
function applyZoom(z: number, cx: number, cy: number): void {
  const el = rootEl.value
  const content = contentEl.value
  if (!el || !content) return
  const prev = currentZoom.value
  if (Math.abs(z - prev) < 1e-4) return
  // 锚点处的内容坐标(未缩放坐标系)= (偏移 + 视口内锚点) / 旧缩放
  const anchorContentX = (el.scrollLeft + cx) / prev
  const anchorContentY = (el.scrollTop + cy) / prev
  currentZoom.value = z
  // 直接写 style 保证同一帧内布局与滚动偏移同步(Vue 渲染的同一属性值一致,无冲突)
  content.style.setProperty('zoom', String(z))
  el.scrollLeft = anchorContentX * z - cx
  el.scrollTop = anchorContentY * z - cy
}

/** WinUI ZoomTo:缩放到指定倍数(钳制到 Min/MaxZoomFactor),centerPoint 为视口内坐标,缺省视口中心。 */
function zoomTo(
  zoomFactor: number,
  centerPoint?: { x: number; y: number },
  options: ScrollingMotionOptions = {},
): void {
  const el = rootEl.value
  if (!el) return
  cancelZoomTween?.()
  cancelZoomTween = null
  const target = clampNumber(zoomFactor, props.minZoomFactor, props.maxZoomFactor)
  if (Math.abs(target - currentZoom.value) < 1e-4) {
    currentZoom.value = target
    return
  }
  const rect = el.getBoundingClientRect()
  const cx = clampNumber(centerPoint?.x ?? rect.width / 2, 0, rect.width)
  const cy = clampNumber(centerPoint?.y ?? rect.height / 2, 0, rect.height)

  const animate = (options.animation ?? 'Enabled') !== 'Disabled' && !prefersReducedMotion()
  if (!animate) {
    applyZoom(target, cx, cy)
    emit('zoomCompleted', { zoomFactor: currentZoom.value })
    bumpActivity()
    return
  }
  emit('zoomAnimationStarting', { targetZoomFactor: target })
  setState('Animation')
  const from = currentZoom.value
  cancelZoomTween = runTween(
    options.durationMs ?? DEFAULT_MOTION_MS,
    (t) => applyZoom(from + (target - from) * t, cx, cy),
    () => {
      cancelZoomTween = null
      setState('Idle')
      emit('zoomCompleted', { zoomFactor: currentZoom.value })
    },
  )
}

/** WinUI ZoomBy:相对当前倍数缩放 delta 倍。 */
function zoomBy(
  zoomFactorDelta: number,
  centerPoint?: { x: number; y: number },
  options: ScrollingMotionOptions = {},
): void {
  zoomTo(currentZoom.value * zoomFactorDelta, centerPoint, options)
}

// —— 编程滚动 ——
/** WinUI ScrollTo:滚动到目标偏移(浏览器/组件自动钳制到可滚动范围);支持 animation/durationMs。 */
function scrollTo(
  horizontalOffset: number,
  verticalOffset: number,
  options: ScrollingMotionOptions = {},
): void {
  const el = rootEl.value
  if (!el) return
  cancelScrollTween?.()
  cancelScrollTween = null

  const animate = (options.animation ?? 'Enabled') !== 'Disabled' && !prefersReducedMotion()
  if (!animate) {
    el.scrollLeft = horizontalOffset
    el.scrollTop = verticalOffset
    syncOffsets()
    emit('scrollCompleted', { horizontalOffset: el.scrollLeft, verticalOffset: el.scrollTop })
    bumpActivity()
    return
  }
  emit('scrollAnimationStarting', {
    targetHorizontalOffset: horizontalOffset,
    targetVerticalOffset: verticalOffset,
  })
  setState('Animation')
  const fromH = el.scrollLeft
  const fromV = el.scrollTop
  cancelScrollTween = runTween(
    options.durationMs ?? DEFAULT_MOTION_MS,
    (t) => {
      if (!rootEl.value) return
      rootEl.value.scrollLeft = fromH + (horizontalOffset - fromH) * t
      rootEl.value.scrollTop = fromV + (verticalOffset - fromV) * t
    },
    () => {
      cancelScrollTween = null
      setState('Idle')
      emit('scrollCompleted', {
        horizontalOffset: rootEl.value?.scrollLeft ?? horizontalOffset,
        verticalOffset: rootEl.value?.scrollTop ?? verticalOffset,
      })
    },
  )
}

/** scrollTo 的别名(任务约定名;与 WinUI ScrollTo 同义)。 */
function scrollToOffset(
  horizontalOffset: number,
  verticalOffset: number,
  options: ScrollingMotionOptions = {},
): void {
  scrollTo(horizontalOffset, verticalOffset, options)
}

/** WinUI ScrollBy:相对当前偏移滚动 delta。 */
function scrollBy(
  horizontalOffsetDelta: number,
  verticalOffsetDelta: number,
  options: ScrollingMotionOptions = {},
): void {
  const el = rootEl.value
  if (!el) return
  scrollTo(el.scrollLeft + horizontalOffsetDelta, el.scrollTop + verticalOffsetDelta, options)
}

// —— 状态机(近似 WinUI StateChanged:用户输入 → Interaction;编程补间 → Animation;静止 → Idle;
//     Inertia 需要惯性物理,Web 滚动的惯性由浏览器内部处理,统一并入 Interaction)——
function setState(next: ScrollingInteractionState): void {
  if (state.value === next) return
  state.value = next
  emit('stateChanged', { state: next })
}

let idleTimer: number | undefined

function bumpActivity(): void {
  if (idleTimer !== undefined) window.clearTimeout(idleTimer)
  idleTimer = window.setTimeout(() => {
    idleTimer = undefined
    if (cancelScrollTween === null && cancelZoomTween === null) setState('Idle')
  }, 120)
}

// —— 滚动/尺寸同步 ——
function syncOffsets(): void {
  const el = rootEl.value
  if (!el) return
  horizontalOffset.value = el.scrollLeft
  verticalOffset.value = el.scrollTop
}

let viewChangedPending = false
let viewChangedRaf = 0

function emitViewChangedThrottled(): void {
  if (viewChangedPending) return
  viewChangedPending = true
  viewChangedRaf = requestAnimationFrame(() => {
    viewChangedPending = false
    emit('viewChanged', {
      horizontalOffset: horizontalOffset.value,
      verticalOffset: verticalOffset.value,
      zoomFactor: currentZoom.value,
    })
  })
}

function onScroll(): void {
  syncOffsets()
  emitViewChangedThrottled()
  if (state.value === 'Idle') setState('Interaction')
  bumpActivity()
}

let lastExtentWidth = 0
let lastExtentHeight = 0

function measure(): void {
  const el = rootEl.value
  if (!el) return
  viewportWidth.value = el.clientWidth
  viewportHeight.value = el.clientHeight
  extentWidth.value = el.scrollWidth
  extentHeight.value = el.scrollHeight
  // 内容尺寸变化(orientation 切换、zoom、slot 内容变化)可能让旧偏移越界,浏览器已钳制,同步读数
  syncOffsets()
  if (Math.abs(extentWidth.value - lastExtentWidth) > 0.5 || Math.abs(extentHeight.value - lastExtentHeight) > 0.5) {
    lastExtentWidth = extentWidth.value
    lastExtentHeight = extentHeight.value
    emit('extentChanged', { extentWidth: extentWidth.value, extentHeight: extentHeight.value })
    emitViewChangedThrottled()
  }
}

let observer: ResizeObserver | null = null

function onPointerDown(): void {
  if (props.disabled) return
  cancelMotion()
  setState('Interaction')
}

function onWheel(event: WheelEvent): void {
  if (props.disabled) return
  // WinUI 鼠标滚轮默认滚动、Ctrl+滚轮缩放(ZoomMode=Enabled 时);触控板捏合会合成 Ctrl+wheel
  if (props.zoomMode !== 'Enabled' || !(event.ctrlKey || event.metaKey)) {
    bumpActivity()
    return
  }
  event.preventDefault()
  cancelMotion()
  setState('Interaction')
  const el = rootEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const factor = Math.exp(-event.deltaY * 0.002)
  zoomBy(factor, { x: event.clientX - rect.left, y: event.clientY - rect.top }, { animation: 'Disabled' })
  bumpActivity()
}

// —— 滚动条自动隐藏(audit A11,与 ScrollViewer 统一口径):源 ScrollBarExpandBeginTime
// = 0.4s / ScrollBarContractDelay = 2s(L188 / L178)。MR14 订正:补间时长归 ScrollBar 族
// (controls/dev/CommonStyles/ScrollBar_themeresources.xaml)—— ScrollBarExpandDuration /
// ScrollBarContractDuration = 167ms(L173/L176,thumb 宽 8→12,L586-587 展开 / L542-543 收缩,
// KeySpline 0,0,0,1)、ScrollBarOpacityChangeDuration = ScrollBarColorChangeDuration = 83ms
// (L174/L175);此前注「0.1s」取错了 ScrollView/Viewer「Separator」族
// (ScrollViewerSeparatorExpand/ContractDuration,那是 ScrollBarSeparator 分隔条,非本组)。
// Chromium(实测 154)对 ::-webkit-scrollbar-* 伪元素不支持 transition/animation,补间不生效——
// 0.4s / 2s 延迟由 JS 定时器驱动 .is-sb-expanded 类;过渡声明保留在 CSS。
// MR6/P2-2:定时器属 JS 驱动路径,媒体查询管不到 —— RM 下跳过 0.4s/2s 延迟
// 直接落终态(与 runTween / A9 指示条 prefersReducedMotion 门控同口径);
// 非 RM 路径零变化。
const SCROLLBAR_EXPAND_DELAY_MS = 400 /* ScrollBarExpandBeginTime = 0.40s(L188) */
const SCROLLBAR_CONTRACT_DELAY_MS = 2000 /* ScrollBarContractDelay = 2s(L178) */
const sbExpandTimer = ref<number | null>(null)
const sbContractTimer = ref<number | null>(null)
const sbExpanded = ref(false)

function onRootPointerEnter(): void {
  if (props.disabled) return
  if (sbContractTimer.value !== null) {
    window.clearTimeout(sbContractTimer.value)
    sbContractTimer.value = null
  }
  if (prefersReducedMotion()) {
    // RM:跳过 0.4s 延迟,直接展开终态(无定时切换)
    if (sbExpandTimer.value !== null) {
      window.clearTimeout(sbExpandTimer.value)
      sbExpandTimer.value = null
    }
    sbExpanded.value = true
    return
  }
  if (sbExpanded.value || sbExpandTimer.value !== null) return
  sbExpandTimer.value = window.setTimeout(() => {
    sbExpandTimer.value = null
    sbExpanded.value = true
  }, SCROLLBAR_EXPAND_DELAY_MS)
}

function onRootPointerLeave(): void {
  if (sbExpandTimer.value !== null) {
    window.clearTimeout(sbExpandTimer.value)
    sbExpandTimer.value = null
  }
  if (prefersReducedMotion()) {
    // RM:跳过 2s 延迟,直接收起终态(无定时切换)
    if (sbContractTimer.value !== null) {
      window.clearTimeout(sbContractTimer.value)
      sbContractTimer.value = null
    }
    sbExpanded.value = false
    return
  }
  if (!sbExpanded.value || sbContractTimer.value !== null) return
  sbContractTimer.value = window.setTimeout(() => {
    sbContractTimer.value = null
    sbExpanded.value = false
  }, SCROLLBAR_CONTRACT_DELAY_MS)
}

// —— 属性联动 ——
// zoomFactor 属性变化(初始值 + 外部驱动)→ 即时 zoomTo(动画按 WinUI NumberBox 直驱场景取 Disabled 语义)
watch(
  () => props.zoomFactor,
  (value) => {
    if (Math.abs(value - currentZoom.value) < 1e-4) return
    zoomTo(value, undefined, { animation: 'Disabled' })
  },
)
watch(
  () => [props.minZoomFactor, props.maxZoomFactor] as const,
  ([min, max]) => {
    const clamped = clampNumber(currentZoom.value, min, max)
    if (Math.abs(clamped - currentZoom.value) > 1e-4) {
      zoomTo(clamped, undefined, { animation: 'Disabled' })
    }
  },
)

// —— 派生样式 ——
// overflow 映射:Mode Disabled → hidden(输入不可滚,编程滚动仍可写 scrollLeft,与 WinUI 一致);
// Visibility Visible → scroll(常驻);其余 → auto(内容可滚时原生滚动条出现 = Auto 语义)。
const rootStyle = computed<CSSProperties>(() => ({
  overflowX:
    props.horizontalScrollMode === 'Disabled'
      ? 'hidden'
      : props.horizontalScrollBarVisibility === 'Visible'
        ? 'scroll'
        : 'auto',
  overflowY:
    props.verticalScrollMode === 'Disabled'
      ? 'hidden'
      : props.verticalScrollBarVisibility === 'Visible'
        ? 'scroll'
        : 'auto',
}))

const rootClass = computed(() => ({
  'wui-scroll-view--disabled': props.disabled,
  // Hidden 档:保留原生滚动能力、仅隐藏滚动条(Chromium/WebKit 分轴;Firefox 的 scrollbar-width 不分轴)
  'wui-scroll-view--hide-x': props.horizontalScrollBarVisibility === 'Hidden' && props.horizontalScrollMode !== 'Disabled',
  'wui-scroll-view--hide-y': props.verticalScrollBarVisibility === 'Hidden' && props.verticalScrollMode !== 'Disabled',
  // A11 滚动条展开态(JS 0.4s 延迟后挂 / 离开 2s 后摘,见脚本注)
  'is-sb-expanded': sbExpanded.value,
}))

// zoom 经 CSS zoom 应用在内容元素上:布局尺寸参与滚动范围计算(WinUI ZoomFactor 的对应物)
const contentStyle = computed<CSSProperties>(() => ({
  zoom: currentZoom.value === 1 ? undefined : String(currentZoom.value),
}))

// ContentOrientation 语义 → 内容测量盒(ScrollView-spec.md「Vertical/Horizontal/Two-dimensional/
// Photo Viewer」四例):
//   Vertical   → 内容宽度约束为视口宽(width:100%),高度自然增长 → 竖向滚动;
//   Horizontal → 内容高度约束为视口高(height:100%),宽度取自然宽(max-content)→ 横向滚动;
//   None       → 双向约束到视口(width/height:100%,照片查看器,配 ZoomMode);
//   Both       → 双向不约束(width/height:max-content,内容自然尺寸)。
const contentOrientationClass = computed(() => `wui-scroll-view__content--${props.contentOrientation.toLowerCase()}`)

// 生命周期:初始缩放 + 尺寸观察(根视口与内容盒都要观察:orientation/zoom/slot 内容变化都会改滚动范围)
onMounted(() => {
  const el = rootEl.value
  const content = contentEl.value
  if (el && content) {
    // 初始缩放(props.zoomFactor 默认 1 时无操作)
    if (Math.abs(props.zoomFactor - 1) > 1e-4) {
      const rect = el.getBoundingClientRect()
      applyZoom(clampNumber(props.zoomFactor, props.minZoomFactor, props.maxZoomFactor), rect.width / 2, rect.height / 2)
    }
    observer = new ResizeObserver(() => measure())
    observer.observe(el)
    observer.observe(content)
    measure()
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  cancelMotion()
  if (sbExpandTimer.value !== null) window.clearTimeout(sbExpandTimer.value)
  if (sbContractTimer.value !== null) window.clearTimeout(sbContractTimer.value)
  if (idleTimer !== undefined) window.clearTimeout(idleTimer)
  if (viewChangedRaf) cancelAnimationFrame(viewChangedRaf)
})

defineExpose({
  // 方法(WinUI 编程 API 面)
  scrollTo,
  scrollToOffset,
  scrollBy,
  zoomTo,
  zoomBy,
  // 只读状态(WinUI 只读属性)
  horizontalOffset,
  verticalOffset,
  zoomFactor: currentZoom,
  extentWidth,
  extentHeight,
  viewportWidth,
  viewportHeight,
  scrollableWidth,
  scrollableHeight,
  state,
  computedHorizontalScrollBarVisibility,
  computedVerticalScrollBarVisibility,
})
</script>

<template>
  <!-- 单根 = WinUI 模板 PART_Root + PART_ScrollPresenter 合一:根即视口滚动容器。
       tabindex 恒为 0(WinUI IsTabStop 默认 false,但 Web 侧可滚动区域必须键盘可达 ——
       axe scrollable-region-focusable / WCAG 2.1.1;禁用时 -1 移出 Tab 序);$attrs 最后展开,消费方 class/style 优先 -->
  <div
    ref="rootEl"
    class="wui-scroll-view"
    :class="rootClass"
    :style="rootStyle"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled || undefined"
    @scroll="onScroll"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @pointerenter="onRootPointerEnter"
    @pointerleave="onRootPointerLeave"
    v-bind="$attrs"
  >
    <div ref="contentEl" class="wui-scroll-view__content" :class="contentOrientationClass" :style="contentStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 controls/dev/ScrollView/ScrollView.xaml DefaultScrollViewStyle:
 *   PART_Root Grid(BorderBrush/BorderThickness/CornerRadius 模板绑定,CornerRadius 默认 ControlCornerRadius)
 *   > PART_ScrollPresenter(内容视口)。此处根 = 视口(原生 overflow 承载,差异见 wiki)。
 * 颜色/圆角一律 --wui-* token;滚动条观感按 PL15 重定向到 PL2 Fluent 语义 token
 *   (controls/dev/CommonStyles/ScrollBar_themeresources.xaml 权威键 → 逐键见各规则注;
 *    ScrollView 模板的 ScrollViewScrollBarsSeparatorBackground 为透明(ScrollView_themeresources
 *    L5/L8 → ControlFillColorTransparentBrush),分隔角留白由 thumb 内边框近似)。
 */
.wui-scroll-view {
  position: relative;
  box-sizing: border-box;
  /* 模板默认 Background=Transparent、BorderThickness=0(Control 默认)、CornerRadius=ControlCornerRadius */
  background: var(--wui-system-control-transparent);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  /* 控件默认 IsTabStop=False,聚焦视觉对照 UseSystemFocusVisuals(强调色细环) */
  /* 滚动条整条色(Firefox 等无 ::-webkit-scrollbar 的浏览器):
     ScrollBarPanningThumbBackground(L38/L150)→ ControlStrongFillColorDefaultBrush */
  scrollbar-color: var(--wui-control-strong-fill-color-default) transparent;
}

/* 系统焦点视觉:ScrollView 无 FocusVisualMargin setter(generic.xaml)→ 0,
   两环全在元素内 primary [0,2] + secondary [2,3] = 系统双环 flush 形 */
.wui-scroll-view:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

.wui-scroll-view--disabled {
  pointer-events: none;
}

/* —— 滚动条 WinUI 观感 + 自动隐藏(audit A11,与 ScrollViewer 统一口径):
 *   thumb 4px 圆条(12px 行高 - 两侧 4px 内边框),轨道透明,色 = ScrollBarPanningThumbBackground
 *   (FIX11 口径不变,仍取该键;PL15 重定向到 controls/dev ScrollBar_themeresources.xaml
 *    L38/L150 → ControlStrongFillColorDefaultBrush,与 ScrollViewer 对齐,勿回退);
 *   悬停展开(.is-sb-expanded,JS 0.4s 延迟后挂,见脚本注):thumb 增厚 6px、
 *     色取 ScrollBarThumbBackground(L37/L149,同键同值)+ 轨道显形(ScrollBarTrackFill → 亚克力 Fallback);
 *   离开收缩(JS 2s 延迟后摘)。
 *   PL15 权威重定向:theme.css 既有 --wui-scroll-bar-* 系为 legacy 且与
 *   ListBox/ListView/ItemsRepeater 共享,受「只新增不改旧」约束其值不动;本组件逐处直接引用
 *   PL2 已落地 Fluent 语义 token,共享 token 的其它消费方零影响。
 *   四态(静置/展开/直接悬停/按下)在权威中同指 ControlStrongFillColorDefaultBrush
 *   (L26-28/L37-38/L149-150),色值一致,差异仅在宽度 8→12(ScrollBarSize L180)与轨道显形。
 *   补间时长 = ScrollBar 族(MR14 订正,权威 controls/dev/CommonStyles/
 *   ScrollBar_themeresources.xaml):厚度 ScrollBarExpand/ContractDuration 167ms
 *   (L173/L176),色/透明度 ScrollBarOpacity/ColorChangeDuration 83ms(L174/L175);
 *   此前误取 ScrollView/Viewer「Separator」族的 100ms(见脚本注)。
 *   过渡声明保留:受支持的平台生效;
 *   Chromium 对滚动条伪元素不支持 transition/animation,呈瞬时切换(已实测登记)。
 *   thumb 直接悬停/按下:状态色即时(源 Pressed/重叠态 Duration=0)。 */
.wui-scroll-view::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.wui-scroll-view::-webkit-scrollbar-track {
  background: transparent;
  /* 轨道显形 = 源 TrackRect.Opacity 补间 → ScrollBarOpacityChangeDuration 83ms */
  transition: background-color 83ms linear 2s;
}

.wui-scroll-view.is-sb-expanded::-webkit-scrollbar-track {
  /* ScrollBarTrackFill(L31/L143)→ AcrylicInAppFillColorDefaultBrush(亚克力 Fallback 近似,PL14 §5) */
  background: var(--wui-acrylic-in-app-fill-color-default);
  transition-delay: 0.4s;
}

.wui-scroll-view::-webkit-scrollbar-thumb {
  /* 静置色 ScrollBarPanningThumbBackground(L38/L150)→ ControlStrongFillColorDefaultBrush(FIX11 口径不变) */
  background: var(--wui-control-strong-fill-color-default);
  border: 4px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
  /* 色 = ScrollBarColorChangeDuration 83ms;厚度 = ScrollBarContractDuration 167ms */
  transition:
    background-color 83ms linear 2s,
    border-width 167ms linear 2s;
}

.wui-scroll-view.is-sb-expanded::-webkit-scrollbar-thumb {
  /* 展开色 ScrollBarThumbBackground(L37/L149)→ ControlStrongFillColorDefaultBrush(与静置同键同值) */
  background: var(--wui-control-strong-fill-color-default);
  border-width: 3px;
  /* 色 = 83ms;厚度 = ScrollBarExpandDuration 167ms(同 BeginTime 0.4s,L584-596) */
  transition:
    background-color 83ms linear 0.4s,
    border-width 167ms linear 0.4s;
}

/* thumb 直接命中:状态色即时(源重叠/按下态 Duration=0),厚度维持展开态。
   权威 ScrollBarThumbFillPointerOver(L27/L139)/ScrollBarThumbFillPressed(L28/L140)
   同指 ControlStrongFillColorDefaultBrush,与静置同值(模板未给 thumb 独立悬停/按下色,L430-445) */
.wui-scroll-view::-webkit-scrollbar-thumb:hover {
  background-color: var(--wui-control-strong-fill-color-default);
  transition-delay: 0s, 0s;
}

.wui-scroll-view::-webkit-scrollbar-thumb:active {
  background-color: var(--wui-control-strong-fill-color-default);
  transition-delay: 0s, 0s;
}

/* Hidden 档:隐藏滚动条但保留滚动能力(滚轮/触摸/编程滚动照常)。
   Chromium/WebKit 可分轴隐藏;Firefox 的 scrollbar-width 不分轴,仅双轴同隐时生效(见 wiki 差异节) */
.wui-scroll-view--hide-x::-webkit-scrollbar:horizontal {
  display: none;
}

.wui-scroll-view--hide-y::-webkit-scrollbar:vertical {
  display: none;
}

.wui-scroll-view--hide-x.wui-scroll-view--hide-y {
  scrollbar-width: none;
}

/* —— 内容测量盒(ContentOrientation 语义,见脚本 contentOrientationClass 注释)—— */
.wui-scroll-view__content {
  min-width: 0;
  min-height: 0;
}

.wui-scroll-view__content--vertical {
  width: 100%;
}

.wui-scroll-view__content--horizontal {
  width: max-content;
  height: 100%;
}

.wui-scroll-view__content--none {
  width: 100%;
  height: 100%;
}

.wui-scroll-view__content--both {
  width: max-content;
  height: max-content;
}
</style>
