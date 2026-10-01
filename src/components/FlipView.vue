<script setup lang="ts">
// FlipView —— WinUI FlipView 的 Web 复刻:一次翻阅一页的集合控件(图片轮播 / 杂志页 / 逐页浏览)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L11586-11846(Style/ControlTemplate):
//   四个翻页箭头按钮模板(Horizontal/Vertical × Previous/Next;Width 20 / Height 36 或 36 / 20,
//   FontIcon 字形 E0E2/E0E3/E0E4/E0E5、FontSize 12,Normal/PointerOver/Pressed 三态);
//   颜色取 src/styles/theme.css 的 --wui-flip-view-* 专用 token(#00000066→#00000099→#000000cc 底、
//   #ffffffcc 前景、透明描边);按钮默认隐藏,指针悬停 / 键盘聚焦时显隐(源 FlipView_Partial.cpp 的
//   ResetButtonsFadeOutTimer / HideButtonsImmediately / nothingPrevious/nothingNext 的 Web 等价)。
// 行为规格:FlipView_Partial.cpp —— MoveNext/MovePrevious 在端点截停(源不循环,wrap 为 Web 扩展);
//   OnSelectedIndexChanged 仅相邻项且 UseTouchAnimationsForAllNavigation(默认 true:元数据回退
//   Selector_IsSelectionActive 的默认值槽)时播放滑动动画,非相邻 / 关闭时直接跳转;触摸拖拽为直接
//   操纵(始终跟手),松手按阈值提交或回弹,端点外阻尼 1/3;键盘方向键翻页(Home/End 跳转);
//   滚轮翻页带 200ms / 方向变化节流,端点处放行页面滚动(源 OnPointerWheelChanged 同语义)。
// PipsPager 联动预留:selectedIndex 为 defineModel 双向绑定,后续 PipsPager 组件可直接 v-model 互联。
// WinUI 无 isHomePage 属性,未实现(见 wiki 差异节)。
import { Comment, Fragment, Text, computed, ref, useSlots, watch } from 'vue'
import type { VNode } from 'vue'
import WuiFontIcon from './FontIcon.vue'
import '../styles/animations.css'

/** WinUI Orientation 枚举取值(翻页方向)。 */
type OrientationValue = 'Horizontal' | 'Vertical'

/** selectionChanged 事件参数(WinUI SelectionChangedEventArgs 的 Web 简化)。 */
interface FlipViewSelectionChangedEventArgs {
  /** 当前选中项下标。 */
  index: number
  /** 当前选中项(itemsSource 模式为数据项;默认 slot 模式为对应 VNode)。 */
  item: unknown
}

const props = withDefaults(
  defineProps<{
    /** 数据源数组(WinUI ItemsSource);提供时优先于默认 slot,项内容走 #item 作用域 slot 渲染。 */
    itemsSource?: unknown[]
    /** 翻页方向(WinUI Orientation;对应 ItemsPanel 的 VirtualizingStackPanel Orientation)。 */
    orientation?: OrientationValue
    /** 按钮与键盘等所有导航都使用触摸式滑动动画(WinUI UseTouchAnimationsForAllNavigation,默认 true)。 */
    useTouchAnimationsForAllNavigation?: boolean
    /** 循环翻页(Web 扩展;源 MoveNext/MovePrevious 在端点截停,默认 false 不循环)。 */
    wrap?: boolean
    /** 禁用(WinUI IsEnabled=false):整控不可交互,箭头按钮呈半透明。 */
    disabled?: boolean
    /** 上一项按钮的 aria-label(可本地化覆盖)。 */
    ariaLabelPrevious?: string
    /** 下一项按钮的 aria-label(可本地化覆盖)。 */
    ariaLabelNext?: string
  }>(),
  {
    itemsSource: undefined,
    orientation: 'Horizontal',
    useTouchAnimationsForAllNavigation: true,
    wrap: false,
    disabled: false,
    ariaLabelPrevious: 'Previous',
    ariaLabelNext: 'Next',
  },
)

// —— SelectedIndex 双向绑定(WinUI SelectedIndex)——
const selectedIndex = defineModel<number>('selectedIndex', { default: 0 })

// —— 事件(WinUI SelectionChanged;按钮 / 键盘 / 拖拽 / 滚轮 / 程序化修改都会触发)——
const emit = defineEmits<{
  selectionChanged: [payload: FlipViewSelectionChangedEventArgs]
}>()

defineOptions({ inheritAttrs: false })

// —— 项集合:itemsSource 优先,否则取默认 slot 的多子项(过滤注释与空白文本节点)——
const slots = useSlots()

const slotItems = computed<VNode[]>(() => {
  const children = slots.default?.() ?? []
  // 展开 Fragment:slot 内容为 v-for / <template> 时编译产物是单个 Fragment 块,直接当
  // 子项会把整组折叠成「1 页」——全部内容挤进同一页(其余被 overflow 裁切),count===1
  // 又使导航按钮(hasPrevious/hasNext)永不渲染。此处递归展平 Fragment 并沿用原过滤
  // (与 Pivot.vue items / TabView.vue entries 的展平实现同法,见 src/components/Pivot.vue:68-87)。
  const flat: VNode[] = []
  const push = (node: VNode): void => {
    if (node.type === Comment) return
    if (node.type === Text && typeof node.children === 'string' && node.children.trim() === '') return
    if (node.type === Fragment && Array.isArray(node.children)) {
      for (const sub of node.children as VNode[]) push(sub)
      return
    }
    flat.push(node)
  }
  for (const child of children) push(child)
  return flat
})

const useSource = computed(() => props.itemsSource !== undefined)
const items = computed<unknown[]>(() => (useSource.value ? (props.itemsSource ?? []) : slotItems.value))
const count = computed(() => items.value.length)
const isVertical = computed(() => props.orientation === 'Vertical')

// 供 transform 使用的受控下标(越界值收敛到有效区间,避免中间态渲染出白屏)
const clampedIndex = computed(() => {
  const max = Math.max(count.value - 1, 0)
  return Math.min(Math.max(Math.round(selectedIndex.value), 0), max)
})

const hasPrevious = computed(() => props.wrap || clampedIndex.value > 0)
const hasNext = computed(() => props.wrap || clampedIndex.value < count.value - 1)

// —— 动画门控:下一次位移是否播放滑动过渡 ——
// 源规则(OnSelectedIndexChanged):相邻项且 UseTouchAnimationsForAllNavigation 才动画;
// 触摸拖拽松手属直接操纵回弹,始终动画(源 DManip settle 语义)。
const animateNext = ref(false)
let dragJustEnded = false

watch(
  selectedIndex,
  (next, old) => {
    animateNext.value =
      dragJustEnded || (props.useTouchAnimationsForAllNavigation && Math.abs(next - old) === 1)
    dragJustEnded = false
    emit('selectionChanged', { index: next, item: items.value[next] })
  },
)

// 项数变化后收敛越界下标(源 OnItemsChanged 重新选中最近有效项的简化)
watch(count, () => {
  if (count.value > 0 && selectedIndex.value > count.value - 1) {
    selectedIndex.value = count.value - 1
  }
})

// —— 箭头 / 键盘 / 滚轮导航(MoveNext / MovePrevious:端点按 wrap 决定截停或回绕)——
function moveNext(): boolean {
  if (props.disabled || count.value === 0) return false
  const current = clampedIndex.value
  if (current >= count.value - 1) {
    if (!props.wrap) return false
    selectedIndex.value = 0
    return true
  }
  selectedIndex.value = current + 1
  return true
}

function movePrevious(): boolean {
  if (props.disabled || count.value === 0) return false
  const current = clampedIndex.value
  if (current <= 0) {
    if (!props.wrap) return false
    selectedIndex.value = count.value - 1
    return true
  }
  selectedIndex.value = current - 1
  return true
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  let handled = true
  if (!isVertical.value && event.key === 'ArrowLeft') movePrevious()
  else if (!isVertical.value && event.key === 'ArrowRight') moveNext()
  else if (isVertical.value && event.key === 'ArrowUp') movePrevious()
  else if (isVertical.value && event.key === 'ArrowDown') moveNext()
  else if (event.key === 'Home' && count.value > 0) selectedIndex.value = 0
  else if (event.key === 'End' && count.value > 0) selectedIndex.value = count.value - 1
  else handled = false
  if (handled) event.preventDefault()
}

// 滚轮翻页:方向变化或停顿 ≥200ms 才允许再次翻转(源 s_scrollWheelDelayMS 节流);
// 端点截停时不 preventDefault,让页面继续滚动(源「Do not set handled … scroll chain」)。
const SCROLL_WHEEL_DELAY_MS = 200
let lastWheelDelta = 0
let lastWheelTime = 0

function onWheel(event: WheelEvent): void {
  if (props.disabled || count.value === 0) return
  const dominant =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (dominant === 0) return
  const now = performance.now()
  const directionChanged = dominant < 0 !== lastWheelDelta < 0
  const canFlip = directionChanged || now - lastWheelTime > SCROLL_WHEEL_DELAY_MS
  lastWheelDelta = dominant
  lastWheelTime = now
  if (!canFlip) {
    event.preventDefault()
    return
  }
  const flipped = dominant > 0 ? moveNext() : movePrevious()
  if (flipped) event.preventDefault()
}

// —— 触摸 / 鼠标拖拽换页(直接操纵;松手按阈值提交或回弹)——
const viewportRef = ref<HTMLElement | null>(null)
const dragging = ref(false)
const dragDelta = ref(0)
let activePointerId: number | null = null
let startClientX = 0
let startClientY = 0

function onPointerDown(event: PointerEvent): void {
  if (props.disabled || count.value < 2) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  activePointerId = event.pointerId
  startClientX = event.clientX
  startClientY = event.clientY
  dragging.value = true
  dragDelta.value = 0
  viewportRef.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value || event.pointerId !== activePointerId) return
  let delta = isVertical.value ? event.clientY - startClientY : event.clientX - startClientX
  // 端点外拖拽给 1/3 阻尼(橡皮筋),提示已到边界
  const atStart = clampedIndex.value <= 0
  const atEnd = clampedIndex.value >= count.value - 1
  const pushingOutward = (atStart && delta > 0) || (atEnd && delta < 0)
  if (pushingOutward && !props.wrap) delta /= 3
  dragDelta.value = delta
}

function endDrag(event: PointerEvent): void {
  if (!dragging.value || event.pointerId !== activePointerId) return
  const delta = dragDelta.value
  const size = isVertical.value
    ? (viewportRef.value?.clientHeight ?? 0)
    : (viewportRef.value?.clientWidth ?? 0)
  dragging.value = false
  dragDelta.value = 0
  activePointerId = null
  animateNext.value = true // 松手回弹 / 提交始终带滑动动画
  if (event.type === 'pointercancel') return // 指针丢失 / 被取消:一律回弹不换页(源 HandlePointerLostOrCanceled)
  // 阈值:视口短边的 20%,收敛到 [40, 140] px
  const threshold = Math.min(140, Math.max(40, size * 0.2))
  const current = clampedIndex.value
  if (delta <= -threshold && current < count.value - 1) {
    dragJustEnded = true
    selectedIndex.value = current + 1
  } else if (delta >= threshold && current > 0) {
    dragJustEnded = true
    selectedIndex.value = current - 1
  }
}

// —— 轨道位移:百分比定位(轨道宽 = 视口宽,100% 即一页)+ 拖拽像素偏移 ——
const trackStyle = computed(() => {
  const axis = isVertical.value ? 'Y' : 'X'
  const base = `-${clampedIndex.value * 100}%`
  const transform = dragging.value
    ? `translate${axis}(calc(${base} + ${dragDelta.value}px))`
    : `translate${axis}(${base})`
  const transition =
    animateNext.value && !dragging.value
      ? 'transform var(--wui-duration-normal) var(--wui-easing-standard)'
      : 'none'
  return { transform, transition }
})

const previousGlyph = computed(() => (isVertical.value ? '\uE0E4' : '\uE0E2'))
const nextGlyph = computed(() => (isVertical.value ? '\uE0E5' : '\uE0E3'))
</script>

<template>
  <div
    v-bind="$attrs"
    class="wui-flipview"
    :class="{ 'wui-flipview--vertical': isVertical, 'wui-flipview--disabled': disabled }"
    role="group"
    aria-roledescription="carousel"
    :aria-disabled="disabled || undefined"
    tabindex="0"
    @keydown="onKeydown"
  >
    <!-- 拖拽视口(源 ScrollingHost + ItemsPresenter;MandatorySingle 吸附的 Web 等价 = 阈值提交 / 回弹) -->
    <div
      ref="viewportRef"
      class="wui-flipview-viewport"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @wheel="onWheel"
      @dragstart.prevent
    >
      <div class="wui-flipview-track" :style="trackStyle" role="list">
        <template v-if="useSource">
          <div
            v-for="(item, index) in itemsSource"
            :key="index"
            class="wui-flipview-item"
            role="listitem"
            :aria-hidden="index !== clampedIndex || undefined"
            :inert="index !== clampedIndex || undefined"
          >
            <slot name="item" :item="item" :index="index">{{ String(item) }}</slot>
          </div>
        </template>
        <template v-else>
          <div
            v-for="(child, index) in slotItems"
            :key="index"
            class="wui-flipview-item"
            role="listitem"
            :aria-hidden="index !== clampedIndex || undefined"
            :inert="index !== clampedIndex || undefined"
          >
            <component :is="child" />
          </div>
        </template>
      </div>
    </div>

    <!-- 翻页箭头(源模板 PreviousButtonHorizontal/NextButtonHorizontal/…;悬停 / 聚焦显隐) -->
    <button
      v-if="hasPrevious"
      type="button"
      class="wui-flipview-nav wui-flipview-nav--previous"
      :aria-label="ariaLabelPrevious"
      :disabled="disabled"
      tabindex="-1"
      @click="movePrevious()"
    >
      <WuiFontIcon :glyph="previousGlyph" :font-size="12" />
    </button>
    <button
      v-if="hasNext"
      type="button"
      class="wui-flipview-nav wui-flipview-nav--next"
      :aria-label="ariaLabelNext"
      :disabled="disabled"
      tabindex="-1"
      @click="moveNext()"
    >
      <WuiFontIcon :glyph="nextGlyph" :font-size="12" />
    </button>
  </div>
</template>

<style scoped>
/*
 * 结构对照 generic.xaml FlipView ControlTemplate(L11609-11846):
 * Grid(Background/BorderBrush/BorderThickness/CornerRadius)
 *   > ScrollViewer(内藏横向 / 纵向排列的项)> 前后四个导航按钮(绝对定位四边)。
 * 尺寸:导航钮 横向 20x36 / 纵向 36x20,字形 12px;颜色一律 --wui-flip-view-* token。
 */
.wui-flipview {
  position: relative;
  display: block;
  min-width: 0;
  min-height: 0;
  font-family: inherit; /* XamlAutoFontFamily 占位,回退浏览器默认 */
  font-size: var(--wui-control-content-theme-font-size);
  background: var(--wui-flip-view-background); /* FlipViewBackground */
  outline: none;
}

.wui-flipview:focus-visible {
  /* 系统焦点视觉:FlipView 无 FocusVisualMargin setter(generic.xaml)→ 0,
     两环全在元素内 primary [0,2] + secondary [2,3] = 系统双环 flush 形 */
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

.wui-flipview--disabled {
  pointer-events: none;
  cursor: default;
}

/* —— 视口与轨道 —— */
.wui-flipview-viewport {
  width: 100%;
  height: 100%;
  min-height: 48px;
  overflow: hidden;
  /* 横向翻页时保留纵向页面滚动(触摸);纵向翻页反之 */
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.wui-flipview--vertical .wui-flipview-viewport {
  touch-action: pan-x;
}

.wui-flipview-track {
  display: flex;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.wui-flipview--vertical .wui-flipview-track {
  flex-direction: column;
}

/* 项容器(FlipViewItem:背景透明、ContentPresenter 拉伸填充) */
.wui-flipview-item {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--wui-flip-view-item-background); /* FlipViewItemBackground(透明) */
}

.wui-flipview-item > :deep(img) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  -webkit-user-drag: none;
  user-select: none;
}

/* —— 翻页箭头(源 HorizontalNext/PreviousTemplate 与 Vertical 系列)—— */
.wui-flipview-nav {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--wui-flip-view-next-previous-arrow-foreground); /* FlipViewNextPreviousArrowForeground */
  background: var(--wui-flip-view-next-previous-button-background); /* …ButtonBackground */
  border: 0 solid var(--wui-flip-view-next-previous-button-border); /* BorderThemeThickness = 0 */
  cursor: pointer;
  /* 源默认隐藏(m_showNavigationButtons = FALSE),悬停 / 聚焦时淡入 */
  opacity: 0;
  visibility: hidden;
  transition:
    opacity var(--wui-duration-fast) var(--wui-easing-standard),
    visibility 0s linear var(--wui-duration-fast);
}

.wui-flipview:hover .wui-flipview-nav,
.wui-flipview:focus-within .wui-flipview-nav,
.wui-flipview-nav:focus-visible {
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}

.wui-flipview-nav:hover:not(:disabled) {
  background: var(--wui-flip-view-next-previous-button-background-pointer-over);
  border-color: var(--wui-flip-view-next-previous-button-border-brush-pointer-over);
}

.wui-flipview-nav:active:not(:disabled) {
  background: var(--wui-flip-view-next-previous-button-background-pressed);
  border-color: var(--wui-flip-view-next-previous-button-border-brush-pressed);
}

/* 系统焦点视觉:导航按钮(EllipsisButtonRevealStyle FocusVisualMargin=0,generic.xaml L16120)
   → 两环全在元素内 = 系统双环 flush 形 */
.wui-flipview-nav:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

.wui-flipview--disabled .wui-flipview-nav,
.wui-flipview--disabled:hover .wui-flipview-nav {
  opacity: 0.4; /* Web 适配:禁用态箭头半透明(源模板无 Disabled 视觉态) */
}

/* 横向:左 / 右居中(WinUI 模板 Width 20 Height 36) */
.wui-flipview-nav--previous {
  left: 0;
  top: 50%;
  width: 20px;
  height: 36px;
  transform: translateY(-50%);
}

.wui-flipview-nav--next {
  right: 0;
  top: 50%;
  width: 20px;
  height: 36px;
  transform: translateY(-50%);
}

/* 纵向:上 / 下居中(WinUI 模板 Width 36 Height 20) */
.wui-flipview--vertical .wui-flipview-nav--previous {
  left: 50%;
  top: 0;
  width: 36px;
  height: 20px;
  transform: translateX(-50%);
}

.wui-flipview--vertical .wui-flipview-nav--next {
  left: 50%;
  right: auto;
  top: auto;
  bottom: 0;
  width: 36px;
  height: 20px;
  transform: translateX(-50%);
}

/* RTL:横向箭头换边 + 字形镜像(源 FlowDirection 镜像布局 + FontIcon MirroredWhenRightToLeft=True) */
[dir='rtl'] .wui-flipview:not(.wui-flipview--vertical) .wui-flipview-nav--previous {
  left: auto;
  right: 0;
}

[dir='rtl'] .wui-flipview:not(.wui-flipview--vertical) .wui-flipview-nav--next {
  right: auto;
  left: 0;
}

[dir='rtl'] .wui-flipview:not(.wui-flipview--vertical) .wui-flipview-nav {
  transform: translateY(-50%) scaleX(-1);
}
</style>
