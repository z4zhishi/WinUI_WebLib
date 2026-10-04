<script setup lang="ts">
// TabView —— WinUI TabView 的 Web 复刻:文档式标签页集合(标签条 + 加号按钮 + 可关闭标签 + 内容区)。
// 视觉规格:CK/WinUI-Reference/controls/dev/TabView/TabView.xaml(generic.xaml 锚点
//   `TargetType="TabView"` / `TabViewItem` 段的控件源文件)+ TabView_themeresources.xaml:
//   - 整体 Grid 两行:标签条(TabContainerGrid:LeftContent | TabColumn 标签列表 | AddButtonColumn |
//     RightContent)+ 内容呈现区(TabContentPresenter);
//   - TabViewHeaderPadding 0,8,0,0;TabViewItem:MinHeight 32、HeaderPadding 8,3,4,3(有关闭按钮)/
//     8,3,8,3(无)、HeaderFontSize 12、圆角 OverlayCornerRadius 仅上两角(源 TopCornerRadiusFilterConverter);
//   - 选中态(源 Selected):SelectedBackgroundPath(SolidBackgroundFillColorTertiary)+ 边框
//     1,1,1,0(TabViewSelectedItemBorderThickness)+ Margin -1,0,-1,1(下沿盖住底线)+ 前景
//     TextFillColorPrimary + SemiBold;标签条底线(TabViewBorderBrush 1px)被选中标签截断;
//   - 关闭按钮:32×24、字形 E711、CloseMargin 4,0,0,0,悬停 SubtleFillColorSecondary / 按下 Tertiary;
//   - 加号按钮:32×24、字形 E710、容器 Padding 3,0,0,3,悬停/按下/禁用三态色;
//   - 滚动按钮:32×24、字形 EDD9/EDDA、FontSize 8,标签溢出时显示(源 ScrollViewer 滚动条可见时);
//   - 分隔线 TabSeparator:宽 1、Margin 0,8,0,8(DividerStrokeColorDefault),悬停/按下时 Opacity 0。
// 行为规格(TabView.cpp / TabViewItem.cpp):
//   - TabWidthMode 三模式对照源(idl [MUX_DEFAULT_VALUE] L105:默认 **Equal**):Equal(默认,等分剩余宽度,
//     clamp 到 MinWidth 100 × MaxWidth 240,L1178-1207)/ SizeToContent(内容自适应,MaxWidth 240)/
//     Compact(非选中仅图标,L286-293);
//   - CloseButtonOverlayMode(UpdateCloseButton,L251-277):OnPointerOver → 仅悬停或选中时显示关闭按钮,
//     Auto / Always → 恒显(源 default 分支两者同路径);
//   - 关闭流:点击 X → closing(可取消 + Deferral 等待)→ tabCloseRequested(应用负责从数据源移除,
//     对照官方示例 sender.TabItems.Remove(args.Tab));未处理 closing / cancel=false 才提交;
//   - 键盘:方向键移动标签焦点(源 TabViewListView SingleSelectionFollowsFocus=False,焦点不联动选中,
//     Enter/Space 选中)、Ctrl+Tab / Ctrl+Shift+Tab 切换选中、Ctrl+W 关闭选中页(Gallery 键盘示例语义);
//   - 拖拽重排(CanReorderTabs,默认 true):Pointer Events 指针拖拽。源把重排委托给内部
//     TabViewListView(CanReorderItems + AllowDrop,平台 DnD);Web 弃用 HTML5 Drag Events
//     (headless Chrome 与触控路径下 dragstart/dragover 不随真实鼠标序列触发,已实测)改用指针
//     事件等价复刻:按下 → 超过拖拽阈值进入拖拽态 → 悬停几何决定插入槽位 → 松手提交。重排为
//     组件内部展示顺序(WinUI 直接改集合,Web 声明式子项由组件内部维护顺序映射,建议子项带
//     稳定 key,见 wiki 差异节);
//   - 拖拽动效(TabView.xaml L411-473,逐键对照):拖动中标签透明度 → ListViewItemReorderThemeOpacity
//     0.80 @0:0:0.240(Reordering 态);被悬停目标 → ListViewItemReorderTargetThemeOpacity 0.50
//     @0:0:0.240(ReorderingTarget 态);悬停方向提示 ReorderHintStates(DragOverThemeAnimation
//     ToOffset = ListViewItemReorderHintThemeOffset 10px,水平标签条仅触发 Left/Right,离开经
//     GeneratedDuration 0:0:0.2 恢复 NoReorderHint);拖拽态退出同样 0.2s 恢复(→NotDragging);
//   - 拖拽事件(源 TabView.cpp OnListViewDragItemsStarting / OnListViewDragItemsCompleted):
//     tabDragStarting / tabDragCompleted;在标签条之外松手(源 DropResult=None 分支)时在
//     completed 之后追加 tabDroppedOutside。
// 组合方式:默认 slot 声明 <WuiTabViewItem header="..."> 子项(动态增删即响应式数组 v-for);
//   selectedIndex 为 defineModel 双向绑定;tabWidthMode / isAddTabButtonVisible / closeButtonOverlayMode
//   等参数对照官方 Gallery 示例页(CK/WinUI-Gallery/WinUIGallery/Samples/TabView/TabViewPage.xaml)。
import { Comment, Fragment, Text, computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useSlots, watch } from 'vue'
import type { FunctionalComponent, VNode } from 'vue'
import WuiFontIcon from './FontIcon.vue'
import type { TabViewTabClosingEventArgs } from './TabViewItem.vue'

/** WinUI TabViewWidthMode(SizeToContent / Equal / Compact,对照源枚举)。 */
type TabViewWidthMode = 'SizeToContent' | 'Equal' | 'Compact'

/** WinUI TabViewCloseButtonOverlayMode(OnHover = 源 OnPointerOver)。 */
type TabViewCloseButtonOverlayMode = 'Auto' | 'Always' | 'OnHover'

/** tabCloseRequested 事件参数(WinUI TabViewTabCloseRequestedEventArgs 的 Web 简化)。 */
export interface TabViewTabCloseRequestedEventArgs {
  /** 触发时该标签在展示顺序中的下标。 */
  index: number
  /** 对应 TabViewItem 子项(默认 slot 模式为其 VNode,可读 props 定位数据源记录)。 */
  item: unknown
}

/** selectionChanged 事件参数(WinUI SelectionChangedEventArgs 的 Web 简化)。 */
export interface TabViewSelectionChangedEventArgs {
  /** 当前选中下标。 */
  index: number
  /** 当前选中项(默认 slot 模式为对应 TabViewItem 的 VNode)。 */
  item: unknown
}

/** 拖拽事件参数(WinUI TabViewTabDragStartingEventArgs / TabDragCompletedEventArgs / TabDroppedOutsideEventArgs 的 Web 简化)。 */
export interface TabViewTabDragEventArgs {
  /** 该标签在展示顺序中的下标(tabDragCompleted 为落定后的新下标)。 */
  index: number
  /** 对应 TabViewItem 子项(默认 slot 模式为其 VNode,可读 props 定位数据源记录)。 */
  item: unknown
}

const props = withDefaults(
  defineProps<{
    /** 标签宽度模式(WinUI TabWidthMode,源 idl 默认 Equal):Equal 等分 / SizeToContent 内容自适应 / Compact 非选中仅图标。 */
    tabWidthMode?: TabViewWidthMode
    /** 是否显示加号按钮(WinUI IsAddTabButtonVisible)。 */
    isAddTabButtonVisible?: boolean
    /** 是否允许拖拽重排标签(WinUI CanReorderTabs);重排为内部展示顺序。 */
    canReorderTabs?: boolean
    /** 关闭按钮显隐模式(WinUI CloseButtonOverlayMode):OnHover 仅悬停/选中显示,Auto/Always 恒显。 */
    closeButtonOverlayMode?: TabViewCloseButtonOverlayMode
    /** 禁用(WinUI IsEnabled=false):标签不可点、加号/关闭/滚动按钮与键盘失效。 */
    disabled?: boolean
    /** 关闭按钮的 aria-label(可本地化覆盖)。 */
    closeButtonAriaLabel?: string
    /** 加号按钮的 aria-label(可本地化覆盖)。 */
    addButtonAriaLabel?: string
  }>(),
  {
    tabWidthMode: 'Equal', // 源 TabView.idl [MUX_DEFAULT_VALUE("winrt::TabViewWidthMode::Equal")]
    isAddTabButtonVisible: true,
    canReorderTabs: true,
    closeButtonOverlayMode: 'Auto',
    disabled: false,
    closeButtonAriaLabel: 'Close',
    addButtonAriaLabel: 'New tab',
  },
)

// —— SelectedIndex 双向绑定(WinUI SelectedIndex)——
const selectedIndex = defineModel<number>('selectedIndex', { default: 0 })

// —— 事件(WinUI AddTabButtonClick / TabCloseRequested / SelectionChanged / TabDragStarting /
//    TabDragCompleted / TabDroppedOutside;closing 由 TabViewItem 声明)——
const emit = defineEmits<{
  addTabButtonClick: []
  tabCloseRequested: [args: TabViewTabCloseRequestedEventArgs]
  selectionChanged: [args: TabViewSelectionChangedEventArgs]
  tabDragStarting: [args: TabViewTabDragEventArgs]
  tabDragCompleted: [args: TabViewTabDragEventArgs]
  tabDroppedOutside: [args: TabViewTabDragEventArgs]
}>()

defineOptions({ inheritAttrs: false })

// —— 子项集合:默认 slot 下的 TabViewItem 子项(过滤注释与空白文本节点)——
interface TabEntry {
  /** 稳定 id:子项 key;无 key 时回退 '@' + 天然下标(重排稳定性依赖 key,见 wiki)。 */
  id: string
  child: VNode
  header: string
  headerSlot: (() => VNode[]) | undefined
  icon: string
  isClosable: boolean
}

const slots = useSlots()

const entries = computed<TabEntry[]>(() => {
  const children = slots.default?.() ?? []
  // 展开 Fragment:slot 内容为 v-for 时编译产物是单个 Fragment 块(v-for 渲染列表),
  // 直接当子项会把整个列表折叠成「1 个无标题的标签」——标签条只剩一个空标题标签(无可访问名),
  // 且全部子项内容挤进同一面板。此处展平 Fragment 并沿用原过滤(与 Pivot.vue
  // `items` computed 的展平实现同法,见 src/components/Pivot.vue:68-87)。
  const flat: VNode[] = []
  const push = (node: VNode): void => {
    if (node.type === Comment) return
    if (node.type === Text && typeof node.children === 'string' && node.children.trim() === '') return
    // 嵌套 Fragment(<template v-for> 的每轮即一个带 key 的 Fragment)递归展平
    if (node.type === Fragment && Array.isArray(node.children)) {
      for (const sub of node.children as VNode[]) push(sub)
      return
    }
    flat.push(node)
  }
  for (const child of children) push(child)

  return flat.map((child, index) => {
    const childProps = (child.props ?? {}) as Record<string, unknown>
    return {
      id: child.key !== null && child.key !== undefined ? String(child.key) : `@${index}`,
      child,
      header: typeof childProps['header'] === 'string' ? childProps['header'] : '',
      headerSlot: readHeaderSlot(child),
      icon: typeof childProps['icon'] === 'string' ? childProps['icon'] : '',
      isClosable: childProps['isClosable'] !== false, // WinUI 默认 true
    }
  })
})

/** 读取子项 VNode 上的 #header 具名插槽(编译产物为插槽函数对象)。 */
function readHeaderSlot(child: VNode): (() => VNode[]) | undefined {
  const children = child.children
  if (children !== null && typeof children === 'object' && !Array.isArray(children)) {
    const header = (children as Record<string, unknown>)['header']
    if (typeof header === 'function') return header as () => VNode[]
  }
  return undefined
}

/** 具名插槽渲染桥(模板中无法直接调用插槽函数,经功能组件渲染)。 */
interface HeaderSlotProps {
  render?: () => VNode[]
}
const HeaderSlot: FunctionalComponent<HeaderSlotProps> = (slotProps) => (slotProps.render ? slotProps.render() : null)
HeaderSlot.props = ['render']

// —— 拖拽重排的内部顺序映射(key 稳定序 + 新增追加尾部;对照源直接改集合的 Web 等价)——
const orderRef = ref<string[]>([])

watch(
  entries,
  (next) => {
    const ids = next.map((entry) => entry.id)
    const kept = orderRef.value.filter((id) => ids.includes(id))
    const added = ids.filter((id) => !kept.includes(id))
    orderRef.value = [...kept, ...added]
  },
  { immediate: true },
)

const orderedEntries = computed<TabEntry[]>(() => {
  const rank = new Map(orderRef.value.map((id, index) => [id, index]))
  return [...entries.value]
    .map((entry, index) => ({ entry, fallbackRank: orderRef.value.length + index, r: rank.get(entry.id) }))
    .sort((a, b) => (a.r ?? a.fallbackRank) - (b.r ?? b.fallbackRank))
    .map((x) => x.entry)
})

const count = computed(() => orderedEntries.value.length)

/** 渲染用受控下标(越界值收敛到有效区间)。 */
const activeIndex = computed(() => {
  const max = Math.max(count.value - 1, 0)
  return Math.min(Math.max(Math.round(selectedIndex.value), 0), max)
})

// —— 选中项变化:发事件(watch 只在变化时触发,初始挂载静默)——
watch(selectedIndex, (next) => {
  const clamped = Math.min(Math.max(next, 0), Math.max(count.value - 1, 0))
  emit('selectionChanged', { index: clamped, item: orderedEntries.value[clamped]?.child })
})

// 项数变化后收敛越界下标(源 OnItemsChanged 重新选中最近有效项的简化)
watch(count, () => {
  if (count.value > 0 && selectedIndex.value > count.value - 1) {
    selectedIndex.value = count.value - 1
  }
})

// —— 标签条:roving tabindex + 方向键移动焦点(源 SingleSelectionFollowsFocus=False:焦点不联动选中)——
const tabRefs = ref<(HTMLDivElement | null)[]>([])

function setTabRef(el: unknown, index: number): void {
  tabRefs.value[index] = el instanceof HTMLDivElement ? el : null
}

function focusTab(index: number): void {
  tabRefs.value[index]?.focus()
}

function onTabKeydown(event: KeyboardEvent, index: number): void {
  if (props.disabled || count.value === 0) return
  const last = count.value - 1
  let next = index
  switch (event.key) {
    case 'ArrowLeft':
      next = index > 0 ? index - 1 : index
      break
    case 'ArrowRight':
      next = index < last ? index + 1 : index
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = last
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (index !== activeIndex.value) selectedIndex.value = index
      return
    default:
      return
  }
  event.preventDefault()
  void nextTick(() => focusTab(next))
}

// —— 内容区/全局键盘:Ctrl+Tab 切换、Ctrl+W 关闭选中(Gallery 键盘示例语义;端点截停不回绕)——
function moveNext(): boolean {
  if (props.disabled || count.value === 0 || activeIndex.value >= count.value - 1) return false
  selectedIndex.value = activeIndex.value + 1
  return true
}

function movePrevious(): boolean {
  if (props.disabled || count.value === 0 || activeIndex.value <= 0) return false
  selectedIndex.value = activeIndex.value - 1
  return true
}

function onRootKeydown(event: KeyboardEvent): void {
  // 拖拽激活态独占 Escape(源平台 DnD 的 Esc 取消语义);非拖拽态不拦截、不改默认,
  // 页面级 Esc(关闭弹层等)零影响
  if (event.key === 'Escape' && dragIndex.value !== null) {
    event.preventDefault() // 对照源 args.Handled = true:取消由拖拽层处理
    cancelDrag()
    return
  }
  if (props.disabled || !event.ctrlKey) return
  // Ctrl+Tab 恒定 preventDefault(对照源 KeyboardAccelerator 的 args.Handled = true:
  // 端点不移动但不放行,避免浏览器抢去换标签页)
  if (event.key === 'Tab') {
    event.preventDefault()
    if (event.shiftKey) movePrevious()
    else moveNext()
    void nextTick(() => focusTab(activeIndex.value))
    return
  }
  if ((event.key === 'w' || event.key === 'W') && closeSelected()) {
    event.preventDefault()
    void nextTick(() => focusTab(activeIndex.value))
  }
}

function closeSelected(): boolean {
  const index = activeIndex.value
  const entry = orderedEntries.value[index]
  if (!entry || !entry.isClosable) return false
  requestClose(index)
  return true
}

// —— 关闭流:closing(可取消 + Deferral)→ tabCloseRequested(应用移除数据,对照官方示例)——
function invokeClosingListener(listener: unknown, args: TabViewTabClosingEventArgs): void {
  if (typeof listener === 'function') (listener as (a: TabViewTabClosingEventArgs) => void)(args)
  else if (Array.isArray(listener)) listener.forEach((fn) => invokeClosingListener(fn, args))
}

function requestClose(index: number): void {
  if (props.disabled) return
  const entry = orderedEntries.value[index]
  if (!entry || !entry.isClosable) return
  const deferrals: Promise<void>[] = []
  const args: TabViewTabClosingEventArgs = {
    cancel: false,
    getDeferral: () => {
      let resolve!: () => void
      deferrals.push(new Promise<void>((resolvePromise) => (resolve = resolvePromise)))
      return { complete: resolve }
    },
  }
  invokeClosingListener((entry.child.props as Record<string, unknown> | null)?.['onClosing'], args)
  void Promise.all(deferrals).then(() => {
    if (args.cancel) return
    const at = orderedEntries.value.indexOf(entry)
    emit('tabCloseRequested', { index: at >= 0 ? at : index, item: entry.child })
  })
}

// —— 加号按钮(WinUI AddTabButtonClick)——
function onAddButtonClick(): void {
  if (props.disabled) return
  emit('addTabButtonClick')
}

/** 点击标签选中(disabled 时忽略;拖拽落定后的伴生点击不选中,源拖拽手势不派生 Click)。 */
function selectTab(index: number): void {
  if (suppressNextClick) {
    suppressNextClick = false
    return
  }
  if (!props.disabled && index !== activeIndex.value) selectedIndex.value = index
}

// —— 溢出滚动:标签过多时显示左右滚动按钮(源 ScrollViewer 滚动条可见时出现,RepeatButton 语义)——
const scrollerRef = ref<HTMLDivElement | null>(null)
const overflowing = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
let resizeObserver: ResizeObserver | null = null

function measureScroll(): void {
  const el = scrollerRef.value
  if (!el) return
  overflowing.value = el.scrollWidth > el.clientWidth + 1
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

/**
 * 把选中标签带入视野(源 TabViewItem::StartBringTabIntoView,`TabViewItem.cpp` L625-631 —— 选中态变化时
 * 由 OnIsSelectedChanged 调用;TabView::BringSelectedTabIntoView,`TabView.cpp` L744/L748-762/L945 ——
 * 标签列尺寸变化与拖拽重排结束时同样调用)。标签条溢出时保证选中标签完整可见。
 * 以 scrollLeft 手算而非 element.scrollIntoView:后者会连带滚动 demo 页等祖先滚动容器。
 */
function bringSelectedTabIntoView(index: number): void {
  const el = tabRefs.value[index]
  const scroller = scrollerRef.value
  if (!el || !scroller) return
  const elRect = el.getBoundingClientRect()
  const scRect = scroller.getBoundingClientRect()
  if (elRect.left < scRect.left) scroller.scrollLeft += elRect.left - scRect.left
  else if (elRect.right > scRect.right) scroller.scrollLeft += elRect.right - scRect.right
  measureScroll()
}

// 选中项变化即带入视野(源 StartBringTabIntoView;初始挂载后同样对齐一次)
watch(activeIndex, (index) => {
  void nextTick(() => bringSelectedTabIntoView(index))
})

function scrollByStep(direction: -1 | 1): void {
  const el = scrollerRef.value
  if (!el || props.disabled) return
  el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 120), behavior: 'smooth' })
}

function onScrollerWheel(event: WheelEvent): void {
  const el = scrollerRef.value
  if (!el || !overflowing.value || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
  event.preventDefault()
  el.scrollLeft += event.deltaY
}

watch(count, () => void nextTick(measureScroll))
watch(
  () => props.tabWidthMode,
  () => void nextTick(measureScroll),
)

onMounted(() => {
  measureScroll()
  void nextTick(() => bringSelectedTabIntoView(activeIndex.value)) // 初始选中项同样带入视野(源同)
  if (scrollerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measureScroll)
    resizeObserver.observe(scrollerRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  press = null // 拖拽按压状态不跨卸载存活(指针捕获随元素移除自动释放)
})

// —— 拖拽重排(Pointer Events;源 TabView.cpp 把重排委托给内部 ListView 的 CanReorderItems DnD,
//    Web 以指针事件等价复刻:按下 → 超过阈值进入拖拽态 → 悬停几何决定插入槽位与方向提示 → 松手提交)——
/** WinUI DragOverThemeAnimation Direction(源模板四态;水平标签条仅触发 Left/Right,Top/Bottom 为竖排宿主态)。 */
type ReorderHintDirection = 'left' | 'right' | 'top' | 'bottom'

const dragIndex = ref<number | null>(null) // Reordering 态:被拖标签的展示序下标
const dropTargetIndex = ref<number | null>(null) // ReorderingTarget 态:被悬停目标下标(0.5 透明度)
const dropBeforeIndex = ref<number | null>(null) // 插入槽位(0..n;插入指示线锚点)
const hintIndex = ref<number | null>(null) // ReorderHintStates:方向提示作用的标签下标
const hintDirection = ref<ReorderHintDirection | null>(null)

/** 拖拽启动阈值(px;系统拖拽阈值量级 SM_CXDRAG=4),区分点击与拖拽。 */
const DRAG_START_THRESHOLD = 4

/** 进行中的按压(pointerdown 到拖拽态之间;非响应式,拖拽路径不走渲染)。 */
interface DragPress {
  index: number
  pointerId: number
  startX: number
  startY: number
  element: HTMLDivElement
}
let press: DragPress | null = null
let dragId: string | null = null
let suppressNextClick = false

function onTabPointerdown(event: PointerEvent, index: number): void {
  if (!props.canReorderTabs || props.disabled) return
  if (event.button !== 0 || event.ctrlKey || event.shiftKey || event.altKey) return
  // 关闭按钮有自己的按压/点击语义,不作为拖拽手柄(源 CloseButton 独立子树)
  if (event.target instanceof Element && event.target.closest('.wui-tab-view-item-close')) return
  const el = event.currentTarget
  if (!(el instanceof HTMLDivElement)) return
  press = { index, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, element: el }
  try {
    el.setPointerCapture(event.pointerId) // 拖拽全程锁定指针:移出标签条仍可跟踪(源 DnD 语义)
  } catch {
    press = null
  }
}

function onTabPointermove(event: PointerEvent): void {
  if (!press || event.pointerId !== press.pointerId) return
  if (dragIndex.value === null) {
    if (Math.hypot(event.clientX - press.startX, event.clientY - press.startY) < DRAG_START_THRESHOLD) return
    startDrag(press.index)
  }
  updateDragTarget(event.clientX, event.clientY)
}

/** 进入拖拽态(源 OnListViewDragItemsStarting:m_isItemBeingDragged=true + TabDragStarting 事件)。 */
function startDrag(index: number): void {
  const entry = orderedEntries.value[index]
  if (!entry) {
    press = null
    return
  }
  dragIndex.value = index
  dragId = entry.id
  emit('tabDragStarting', { index, item: entry.child })
}

/** 悬停几何 → 插入槽位 + ReorderingTarget + ReorderHint(方向 = 目标让位方向)。 */
function updateDragTarget(x: number, y: number): void {
  const scroller = scrollerRef.value
  if (!scroller || dragIndex.value === null) return
  const scRect = scroller.getBoundingClientRect()
  if (x < scRect.left || x > scRect.right || y < scRect.top || y > scRect.bottom) {
    // 移出标签条:清目标与提示(源 OnListViewDragLeave → UpdateIsItemDraggedOver(false))
    dropTargetIndex.value = null
    dropBeforeIndex.value = null
    clearHint()
    return
  }
  const rects = tabRefs.value.slice(0, count.value).map((el) => el?.getBoundingClientRect())
  let hovered = -1
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    if (rect && x >= rect.left && x <= rect.right) {
      hovered = i
      break
    }
  }
  if (hovered < 0) {
    // 标签间缝隙/两端:就近端点槽位,无被悬停项则无目标态与方向提示
    dropBeforeIndex.value = x < (rects[0]?.left ?? scRect.left) ? 0 : rects.length
    dropTargetIndex.value = null
    clearHint()
    return
  }
  const rect = rects[hovered]
  if (!rect) return
  const before = x - rect.left < rect.width / 2
  dropBeforeIndex.value = before ? hovered : hovered + 1
  if (hovered === dragIndex.value) {
    // 被拖标签自身不作为目标(源跳过 IsBeingDragged 项);悬停自身等价「回到原位」
    dropTargetIndex.value = null
    clearHint()
    return
  }
  dropTargetIndex.value = hovered
  // 指针在目标左半 → 插到其前 → 目标向右让位(RightReorderHint);右半反之(LeftReorderHint)
  setHint(hovered, before ? 'right' : 'left')
}

function setHint(index: number, direction: ReorderHintDirection): void {
  if (hintIndex.value === index && hintDirection.value === direction) return
  hintIndex.value = index
  hintDirection.value = direction
}

function clearHint(): void {
  if (hintIndex.value === null && hintDirection.value === null) return
  hintIndex.value = null
  hintDirection.value = null
}

/** 清拖拽态(透明度/位移经 200ms 恢复过渡,源 VisualTransition To=NotDragging / To=NoReorderHint 0.2s)。 */
function finishDragState(): void {
  dragIndex.value = null
  dropTargetIndex.value = null
  dropBeforeIndex.value = null
  clearHint()
  dragId = null
}

function onTabPointerup(event: PointerEvent): void {
  if (!press || event.pointerId !== press.pointerId) return
  press = null
  if (dragIndex.value === null) return // 未达阈值:普通点击,交由 @click 选中
  const from = dragIndex.value
  const id = dragId
  const slot = dropBeforeIndex.value
  const scRect = scrollerRef.value?.getBoundingClientRect()
  const insideStrip =
    scRect !== undefined &&
    event.clientX >= scRect.left &&
    event.clientX <= scRect.right &&
    event.clientY >= scRect.top &&
    event.clientY <= scRect.bottom
  finishDragState()
  suppressNextClick = true // 拖拽落定不派生点击选中(源拖拽手势不触发 Click 选中)
  if (insideStrip && slot !== null) reorderTab(from, slot)
  // 拖拽后该标签的新展示下标(源 TabDragCompleted 以 Item 标识;Web 附最终下标便于定位)
  const newIndex = id === null ? from : orderedEntries.value.findIndex((entry) => entry.id === id)
  const at = newIndex >= 0 ? newIndex : from
  const item = orderedEntries.value[at]?.child
  // 事件序对齐源 OnListViewDragItemsCompleted:先 TabDragCompleted;DropResult=None(条外)再 TabDroppedOutside
  emit('tabDragCompleted', { index: at, item })
  if (!insideStrip) emit('tabDroppedOutside', { index: at, item })
}

function onTabPointercancel(event: PointerEvent): void {
  if (!press || event.pointerId !== press.pointerId) return
  press = null
  if (dragIndex.value === null) return
  const from = dragIndex.value
  finishDragState()
  // 外部取消(滚动手势接管等):对齐源完成路径(DropResult=None),不计 droppedOutside
  emit('tabDragCompleted', { index: from, item: orderedEntries.value[from]?.child })
}

/**
 * Esc 取消拖拽(源平台 DnD:Esc 使项回位、不重排;DragItemsCompleted 照发、不发 DroppedOutside)。
 * 事件序与外部取消路径同构:starting → completed(下标 = 取消时的原下标,项未移动)。
 */
function cancelDrag(): void {
  if (dragIndex.value === null) return
  const from = dragIndex.value
  finishDragState()
  press = null // 指针捕获随松手隐式释放;期间继续的 move/up 因 press 为空全部短路
  suppressNextClick = true // 吞掉松手伴生点击(取消与落定同不派生点击选中)
  emit('tabDragCompleted', { index: from, item: orderedEntries.value[from]?.child })
}

function reorderTab(from: number, insertBefore: number): void {
  const to = insertBefore > from ? insertBefore - 1 : insertBefore
  if (to === from || to < 0) return
  // 选中跟随被拖标签(WinUI 拖拽重排保持选中项不变):先取旧展示序中的选中 id
  const selectedId = orderedEntries.value[activeIndex.value]?.id
  // 以展示序重排 id,再映射回内部顺序映射(不在此序中的 id 保序追加尾部)
  const displayIds = orderedEntries.value.map((entry) => entry.id)
  const [moved] = displayIds.splice(from, 1)
  if (moved === undefined) return
  displayIds.splice(to, 0, moved)
  const rest = orderRef.value.filter((id) => !displayIds.includes(id))
  orderRef.value = [...displayIds, ...rest]
  const newIndex = selectedId === undefined ? -1 : displayIds.indexOf(selectedId)
  if (newIndex >= 0 && newIndex !== selectedIndex.value) selectedIndex.value = newIndex
}

// —— 字形(源模板 FontIcon Glyph,Segoe Fluent Icons)——
const CLOSE_GLYPH = '\uE711'
const ADD_GLYPH = '\uE710'
const SCROLL_LEFT_GLYPH = '\uEDD9'
const SCROLL_RIGHT_GLYPH = '\uEDDA'

const baseId = useId()
const tabId = (index: number): string => `${baseId}-tab-${index}`
const panelId = (index: number): string => `${baseId}-panel-${index}`
</script>

<template>
  <div v-bind="$attrs" class="wui-tab-view" :class="[`wui-tab-view--${tabWidthMode.toLowerCase()}`, { 'wui-tab-view--disabled': disabled, 'wui-tab-view--reorderable': canReorderTabs && !disabled }]" @keydown="onRootKeydown">
    <!-- 标签条(TabContainerGrid:LeftContent | TabColumn | AddButtonColumn | RightContent;底线 1px) -->
    <div class="wui-tab-view-header">
      <div v-if="$slots['tab-strip-header']" class="wui-tab-view-header-left">
        <slot name="tab-strip-header" />
      </div>

      <!-- 标签列表(TabViewListView:水平排列,溢出滚动;role=tablist + roving tabindex) -->
      <div ref="scrollerRef" class="wui-tab-view-scroller" role="tablist" @scroll="measureScroll" @wheel="onScrollerWheel">
        <div class="wui-tab-view-strip">
          <div
            v-for="(entry, index) in orderedEntries"
            :id="tabId(index)"
            :key="entry.id"
            :ref="(el) => setTabRef(el, index)"
            class="wui-tab-view-item"
            :class="{
              'wui-tab-view-item--selected': index === activeIndex,
              'wui-tab-view-item--no-close': !entry.isClosable,
              'wui-tab-view-item--close-on-hover': closeButtonOverlayMode === 'OnHover' && index !== activeIndex,
              'wui-tab-view-item--drop-before': dropBeforeIndex === index,
              'wui-tab-view-item--drop-after': dropBeforeIndex === count && index === count - 1,
              'wui-tab-view-item--reorder-target': dropTargetIndex === index,
              'wui-tab-view-item--dragging': dragIndex === index,
            }"
            :data-hint="hintIndex === index ? hintDirection : undefined"
            role="tab"
            :aria-selected="index === activeIndex"
            :aria-controls="panelId(index)"
            :aria-label="entry.header || undefined"
            :tabindex="index === activeIndex ? 0 : -1"
            @click="selectTab(index)"
            @keydown="onTabKeydown($event, index)"
            @pointerdown="onTabPointerdown($event, index)"
            @pointermove="onTabPointermove"
            @pointerup="onTabPointerup"
            @pointercancel="onTabPointercancel"
          >
            <span v-if="entry.icon" class="wui-tab-view-item-icon">
              <WuiFontIcon :glyph="entry.icon" :font-size="16" />
            </span>
            <span class="wui-tab-view-item-label">
              <HeaderSlot v-if="entry.headerSlot" :render="entry.headerSlot" />
              <template v-else>{{ entry.header }}</template>
            </span>
            <button
              v-if="entry.isClosable"
              type="button"
              class="wui-tab-view-item-close"
              :aria-label="closeButtonAriaLabel"
              :tabindex="-1"
              :disabled="disabled || undefined"
              @click.stop="requestClose(index)"
            >
              <WuiFontIcon :glyph="CLOSE_GLYPH" :font-size="12" />
            </button>
          </div>
        </div>
      </div>

      <!-- 滚动按钮(TabScrollViewerStyle 的 ScrollDecrease/IncreaseButton,32×24 字形 8px) -->
      <button v-show="overflowing" type="button" class="wui-tab-view-scroll-button wui-tab-view-scroll-button--left" aria-label="Scroll left" tabindex="-1" :disabled="disabled || !canScrollLeft || undefined" @click="scrollByStep(-1)">
        <WuiFontIcon :glyph="SCROLL_LEFT_GLYPH" :font-size="8" />
      </button>
      <button v-show="overflowing" type="button" class="wui-tab-view-scroll-button wui-tab-view-scroll-button--right" aria-label="Scroll right" tabindex="-1" :disabled="disabled || !canScrollRight || undefined" @click="scrollByStep(1)">
        <WuiFontIcon :glyph="SCROLL_RIGHT_GLYPH" :font-size="8" />
      </button>

      <!-- 加号按钮(AddButton:E710,32×24,容器 Padding 3,0,0,3) -->
      <div v-if="isAddTabButtonVisible" class="wui-tab-view-add">
        <button type="button" class="wui-tab-view-add-button" :aria-label="addButtonAriaLabel" :disabled="disabled || undefined" @click="onAddButtonClick">
          <WuiFontIcon :glyph="ADD_GLYPH" :font-size="12" />
        </button>
      </div>

      <div v-if="$slots['tab-strip-footer']" class="wui-tab-view-header-right">
        <slot name="tab-strip-footer" />
      </div>
    </div>

    <!-- 内容区(TabContentPresenter:全部保持挂载,非选中收起 —— WinUI 容器复用保活语义) -->
    <div class="wui-tab-view-panels">
      <div
        v-for="(entry, index) in orderedEntries"
        v-show="index === activeIndex"
        :id="panelId(index)"
        :key="entry.id"
        class="wui-tab-view-panel"
        role="tabpanel"
        :aria-labelledby="tabId(index)"
      >
        <component :is="entry.child" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 TabView.xaml DefaultTabViewStyle ControlTemplate:
 * Grid(两行)> TabContainerGrid(标签条四列)+ TabContentPresenter(内容)。
 * 颜色一律直取 PL2 Fluent 画刷族 token(--wui-<brush-kebab>,权威键见行内注释与
 * docs/pages/color/control-brush-matrix.md §1.21);焦点视觉仍用系统焦点色钩子。
 */
.wui-tab-view {
  display: block;
  min-width: 0;
  font-family: inherit; /* XamlAutoFontFamily 占位,回退浏览器默认 */
  background: var(--wui-subtle-fill-color-transparent); /* TabViewBackground */
}

/* —— 标签条(TabViewHeaderPadding 0,8,0,0;底线 TabViewBorderBrush 1px)—— */
.wui-tab-view-header {
  display: flex;
  align-items: flex-end;
  min-height: 32px;
  padding: 8px 0 0;
  border-bottom: 1px solid var(--wui-card-stroke-color-default); /* TabViewBorderBrush = CardStrokeColorDefault */
}

.wui-tab-view-header-left,
.wui-tab-view-header-right {
  display: flex;
  align-items: center;
  flex: none;
  align-self: stretch;
}

/* —— 标签列表(溢出滚动:横向,隐藏原生滚动条,按钮替代)—— */
.wui-tab-view-scroller {
  flex: 1 1 0;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.wui-tab-view-scroller::-webkit-scrollbar {
  display: none;
}

.wui-tab-view-strip {
  display: flex;
  min-width: 100%;
}

/* —— 标签(TabViewItem:MinHeight 32、Padding 8,3,4,3、FontSize 12、上圆角 8px)—— */
.wui-tab-view-item {
  position: relative;
  display: flex;
  flex: 0 1 auto; /* SizeToContent:内容自适应 */
  box-sizing: border-box;
  align-items: center;
  min-width: 0;
  max-width: 240px; /* TabViewItemMaxWidth */
  min-height: 32px; /* TabViewItemMinHeight */
  padding: 3px 4px 3px 8px; /* TabViewItemHeaderPaddingWithCloseButton(8,3,4,3) */
  font-size: 12px; /* TabViewItemHeaderFontSize */
  color: var(--wui-text-fill-color-secondary); /* TabViewItemHeaderForeground */
  cursor: pointer;
  background: var(--wui-layer-on-mica-base-alt-fill-color-transparent); /* TabViewItemHeaderBackground */
  border: 1px solid transparent; /* TabViewItemBorderThickness 1(TabViewItemBorderBrush 透明) */
  border-bottom: none;
  border-radius: var(--wui-popup-corner-radius, 8px) var(--wui-popup-corner-radius, 8px) 0 0; /* OverlayCornerRadius 仅上两角 */
  user-select: none;
  /* 拖拽恢复过渡:源 DragStates/ReorderHintStates 的 VisualTransition GeneratedDuration 0:0:0.2
     (→NotDragging L471 / →NoReorderHint L434);源只给时长未给缓动 → 线性插值 */
  transition:
    opacity 200ms linear,
    transform 200ms linear;
}

/* 可重排时把手势让位给拖拽:纵向滚动仍交浏览器(横向拖拽进入组件,源 DnD 手势语义) */
.wui-tab-view--reorderable .wui-tab-view-item {
  touch-action: pan-y;
}

/* 无关闭按钮的标签:右内边距 8(源 CloseButtonCollapsed 态 Padding 8,3,8,3) */
.wui-tab-view-item--no-close,
.wui-tab-view-item--close-on-hover {
  padding: 3px 8px;
}

/* Equal:等分剩余宽度,clamp MinWidth 100 × MaxWidth 240(源 L1178-1207) */
.wui-tab-view--equal .wui-tab-view-item {
  flex: 1 1 0;
  min-width: 100px; /* TabViewItemMinWidth */
}

/* SizeToContent / Compact(源 UpdateTabWidths 的 "Compact or SizeToContent" 分支,L1291-1330):该分支
   **不给标签设宽度** —— 标签保持内容宽(max-width 240 封顶),只对标签列与 ListView 设 MaxWidth=可用宽,
   放不下时置 ScrollBarVisibility=Visible 并显示左右滚动按钮(itemsPresenter.ActualWidth > availableWidth)。
   故此处标签不得被 flex 压缩(flex-shrink 1 会把标签压到省略号、且永远不触发溢出 → 滚动钮不出现)。 */
.wui-tab-view--sizetocontent .wui-tab-view-item,
.wui-tab-view--compact .wui-tab-view-item {
  flex: 0 0 auto;
}

/* Compact:非选中仅图标(源 Compact 态:IconMargin 0、标题收起、图标列 16px;选中恢复 StandardWidth) */
.wui-tab-view--compact .wui-tab-view-item:not(.wui-tab-view-item--selected) .wui-tab-view-item-label {
  display: none;
}

.wui-tab-view--compact .wui-tab-view-item:not(.wui-tab-view-item--selected) {
  min-width: 34px; /* 图标 16 + 左右内边距 */
  padding-right: 4px;
}

.wui-tab-view--compact .wui-tab-view-item:not(.wui-tab-view-item--selected) .wui-tab-view-item-icon {
  margin-right: 0; /* Compact 态 TabViewItemHeaderIconMargin 归零 */
}

.wui-tab-view-item:hover:not(.wui-tab-view-item--selected):not(.wui-tab-view--disabled *) {
  color: var(--wui-text-fill-color-secondary); /* TabViewItemHeaderForegroundPointerOver */
  background: var(--wui-layer-on-mica-base-alt-fill-color-secondary); /* TabViewItemHeaderBackgroundPointerOver */
}

.wui-tab-view-item:active:not(.wui-tab-view-item--selected):not(.wui-tab-view--disabled *) {
  color: var(--wui-text-fill-color-tertiary); /* TabViewItemHeaderForegroundPressed */
  background: var(--wui-layer-on-mica-base-alt-fill-color-default); /* TabViewItemHeaderBackgroundPressed */
}

/* 选中态(源 Selected:SelectedBackgroundPath + 边框 1,1,1,0 + Margin -1,0,-1,1 + Primary 前景 + SemiBold) */
.wui-tab-view-item--selected {
  z-index: 1;
  margin-bottom: -1px; /* TabViewSelectedItemHeaderMargin -1,0,-1,1:下沿盖住标签条底线 */
  font-weight: 600; /* SemiBold */
  color: var(--wui-text-fill-color-primary); /* TabViewItemHeaderForegroundSelected */
  cursor: default;
  background: var(--wui-solid-background-fill-color-tertiary); /* TabViewItemHeaderBackgroundSelected */
  border-color: var(--wui-card-stroke-color-default); /* TabViewSelectedItemBorderBrush(见报告未决 §:渐变退化) */
}

/* 禁用(源 Disabled:背景透明 + 前景 Disabled 色) */
.wui-tab-view--disabled .wui-tab-view-item {
  color: var(--wui-text-fill-color-disabled); /* TabViewItemHeaderForegroundDisabled */
  background: var(--wui-layer-on-mica-base-alt-fill-color-transparent); /* TabViewItemHeaderBackgroundDisabled */
  cursor: default;
}

/* 系统焦点视觉:TabViewItem/TabViewButtonStyle FocusVisualMargin=-3(TabView.xaml L594/L187/L59)
   → 两环全在元素外 secondary [0,1] + primary [1,3] = 系统双环 */
.wui-tab-view-item:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* 图标(IconBox:16×16、Margin 0,0,10,0) */
.wui-tab-view-item-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  margin-right: 10px; /* TabViewItemHeaderIconMargin(0,0,10,0) */
  color: var(--wui-text-fill-color-secondary); /* TabViewItemIconForeground */
}

.wui-tab-view-item:active:not(.wui-tab-view-item--selected):not(.wui-tab-view--disabled *) .wui-tab-view-item-icon {
  color: var(--wui-text-fill-color-tertiary); /* TabViewItemIconForegroundPressed */
}

.wui-tab-view-item--selected .wui-tab-view-item-icon {
  color: var(--wui-text-fill-color-primary); /* TabViewItemIconForegroundSelected */
}

.wui-tab-view--disabled .wui-tab-view-item-icon {
  color: var(--wui-text-fill-color-disabled); /* TabViewItemIconForegroundDisabled */
}

/* 标题(源 ContentPresenter:单行,溢出裁剪) */
.wui-tab-view-item-label {
  display: inline-block;
  overflow: hidden;
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
}

/* 分隔线(TabSeparator:宽 1、Margin 0,8,0,8;悬停/按下时 Opacity 0) */
.wui-tab-view-item::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 0;
  bottom: 8px;
  width: 1px;
  background: var(--wui-divider-stroke-color-default); /* TabViewItemSeparator */
  pointer-events: none;
}

.wui-tab-view-item:hover::after,
.wui-tab-view-item:active::after,
.wui-tab-view-item--selected::after {
  opacity: 0; /* 源 PointerOver/Pressed 态 TabSeparator.Opacity=0;选中态被边框覆盖 */
}

/* 关闭按钮(TabViewCloseButtonStyle:32×24、FontSize 12、Margin 4,0,0,0) */
.wui-tab-view-item-close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px; /* TabViewItemHeaderCloseButtonWidth */
  height: 24px; /* TabViewItemHeaderCloseButtonHeight */
  margin-left: 4px; /* TabViewItemHeaderCloseMargin(4,0,0,0) */
  padding: 0;
  color: var(--wui-text-fill-color-primary); /* TabViewItemHeaderCloseButtonForeground */
  background: var(--wui-subtle-fill-color-transparent); /* TabViewItemHeaderCloseButtonBackground */
  border: none; /* TabViewItemHeaderCloseButtonBorderThickness 0 */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius */
  cursor: pointer;
}

.wui-tab-view-item-close:hover:not(:disabled) {
  color: var(--wui-text-fill-color-primary); /* CloseButtonForegroundPointerOver */
  background: var(--wui-subtle-fill-color-secondary); /* CloseButtonBackgroundPointerOver */
}

.wui-tab-view-item-close:active:not(:disabled) {
  color: var(--wui-text-fill-color-secondary); /* CloseButtonForegroundPressed */
  background: var(--wui-subtle-fill-color-tertiary); /* CloseButtonBackgroundPressed */
}

.wui-tab-view-item-close:disabled {
  color: var(--wui-text-fill-color-disabled); /* CloseButtonForegroundDisabled */
  cursor: default;
}

/* 系统焦点视觉:CloseButton(FocusVisualMargin=-3,TabView.xaml L187)双环在外 */
.wui-tab-view-item-close:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* CloseButtonOverlayMode=OnHover 且未选中:默认隐藏,悬停标签时显示(源 UpdateCloseButton OnPointerOver 分支,
   收起时用 CloseButtonCollapsed 的 8,3,8,3 内边距,悬停展开按钮回到 8,3,4,3) */
.wui-tab-view-item--close-on-hover .wui-tab-view-item-close {
  display: none;
}

.wui-tab-view-item--close-on-hover:hover {
  padding: 3px 4px 3px 8px; /* TabViewItemHeaderPaddingWithCloseButton */
}

.wui-tab-view-item--close-on-hover:hover .wui-tab-view-item-close {
  display: inline-flex;
}

/* —— 滚动按钮(TabViewScrollButtonStyle:32×24、字形 8px、容器 Padding 8,0,3,3 / 3,0,8,3)—— */
.wui-tab-view-scroll-button {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px; /* TabViewItemScrollButtonWidth */
  height: 24px; /* TabViewItemScrollButtonHeight */
  margin-bottom: 3px;
  padding: 0;
  color: var(--wui-text-fill-color-secondary); /* TabViewScrollButtonForeground */
  background: var(--wui-subtle-fill-color-transparent); /* TabViewScrollButtonBackground */
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius */
  cursor: pointer;
}

.wui-tab-view-scroll-button:hover:not(:disabled) {
  background: var(--wui-subtle-fill-color-secondary); /* ScrollButtonBackgroundPointerOver */
}

.wui-tab-view-scroll-button:active:not(:disabled) {
  background: var(--wui-subtle-fill-color-tertiary); /* ScrollButtonBackgroundPressed */
}

.wui-tab-view-scroll-button:disabled {
  color: var(--wui-text-fill-color-disabled); /* TabViewScrollButtonForegroundDisabled */
  cursor: default;
}

.wui-tab-view-scroll-button--left {
  margin-left: 8px; /* TabViewItemLeftScrollButtonContainerPadding(8,0,3,3) */
}

.wui-tab-view-scroll-button--right {
  margin-right: 8px; /* TabViewItemRightScrollButtonContainerPadding(3,0,8,3) */
}

/* —— 加号按钮(TabViewButtonStyle:E710、32×24、FontSize 12、容器 Padding 3,0,0,3)—— */
.wui-tab-view-add {
  flex: none;
  margin-bottom: 0;
  padding: 0 0 3px 3px; /* TabViewItemAddButtonContainerPadding(3,0,0,3) */
}

.wui-tab-view-add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; /* TabViewItemAddButtonWidth */
  height: 24px; /* TabViewItemAddButtonHeight */
  padding: 0;
  color: var(--wui-text-fill-color-primary); /* TabViewButtonForeground */
  background: var(--wui-subtle-fill-color-transparent); /* TabViewButtonBackground */
  border: none; /* TabViewButtonBorderThickness 0 */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius */
  cursor: pointer;
}

.wui-tab-view-add-button:hover:not(:disabled) {
  color: var(--wui-text-fill-color-primary); /* TabViewButtonForegroundPointerOver */
  background: var(--wui-subtle-fill-color-secondary); /* TabViewButtonBackgroundPointerOver */
}

.wui-tab-view-add-button:active:not(:disabled) {
  color: var(--wui-text-fill-color-secondary); /* TabViewButtonForegroundPressed */
  background: var(--wui-subtle-fill-color-tertiary); /* TabViewButtonBackgroundPressed */
}

.wui-tab-view-add-button:disabled {
  color: var(--wui-text-fill-color-disabled); /* TabViewButtonForegroundDisabled */
  cursor: default;
}

/* 系统焦点视觉:TabViewButtonStyle(加号按钮)FocusVisualMargin=-3(TabView.xaml L59)双环在外 */
.wui-tab-view-add-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* —— 内容区(TabContentPresenter:无边框无背景)—— */
.wui-tab-view-panels {
  min-width: 0;
}

.wui-tab-view-panel {
  min-width: 0;
}

/* —— 拖拽重排视觉(源 DragStates / ReorderHintStates,TabView.xaml L411-473;逐键对照见 MR5 报告)—— */

/* Reordering(L449-453):被拖标签 Opacity → ListViewItemReorderThemeOpacity 0.80,
   Duration 0:0:0.240(源 DoubleAnimation 未指定缓动 → 线性);
   底色切 TabViewItemHeaderDragBackground = SolidBackgroundFillColorTertiary(只改色,动效不变) */
.wui-tab-view-item--dragging {
  background: var(--wui-solid-background-fill-color-tertiary);
  opacity: 0.8;
  transition: opacity 240ms linear;
}

/* ReorderingTarget(L454-458):被悬停目标 Opacity → ListViewItemReorderTargetThemeOpacity 0.50,
   Duration 0:0:0.240(同上线性)。transform 过渡显式并入(ReorderHint 与本态可同时作用同一标签,
   覆写 transition 时不得丢掉 0.2s 的 hint 进出节奏) */
.wui-tab-view-item--reorder-target {
  opacity: 0.5;
  transition:
    opacity 240ms linear,
    transform 200ms linear;
}

/* ReorderHintStates(L411-436):DragOverThemeAnimation ToOffset =
   ListViewItemReorderHintThemeOffset(10px),Direction = 目标让位方向(水平标签条仅触发
   Left/Right;Bottom/Top 为源模板竖排宿主态,结构保留不触发)。进入提示的动画时长源未找到
   (theme-animations.md §1.9「源未找到」),与恢复同取 200ms 线性;离开 → NoReorderHint 走
   基础规则的 0.2s 恢复过渡 */
.wui-tab-view-item[data-hint='right'] {
  transform: translateX(10px);
}

.wui-tab-view-item[data-hint='left'] {
  transform: translateX(-10px);
}

.wui-tab-view-item[data-hint='bottom'] {
  transform: translateY(10px);
}

.wui-tab-view-item[data-hint='top'] {
  transform: translateY(-10px);
}

[dir='rtl'] .wui-tab-view-item[data-hint='right'] {
  transform: translateX(-10px); /* RTL 物理镜像:让位方向随阅读方向翻转 */
}

[dir='rtl'] .wui-tab-view-item[data-hint='left'] {
  transform: translateX(10px);
}

/* 插入位置指示(Web 对源 ListView 实时换位的等价指示,悬停槽位即时显隐):
   槽位锚在标签左/右缘;RTL 下「前/后」随阅读方向镜像 */
.wui-tab-view-item--drop-before {
  box-shadow: -3px 0 0 0 var(--wui-system-accent-color, #0067c0); /* 插入位置指示(主题色) */
}

.wui-tab-view-item--drop-after {
  box-shadow: 3px 0 0 0 var(--wui-system-accent-color, #0067c0); /* 末尾槽位(标签后插入) */
}

[dir='rtl'] .wui-tab-view-item--drop-before {
  box-shadow: 3px 0 0 0 var(--wui-system-accent-color, #0067c0);
}

[dir='rtl'] .wui-tab-view-item--drop-after {
  box-shadow: -3px 0 0 0 var(--wui-system-accent-color, #0067c0);
}

/* RTL:滚动按钮与加号区换侧观感由 flex 自动镜像,无需额外规则 */
</style>
