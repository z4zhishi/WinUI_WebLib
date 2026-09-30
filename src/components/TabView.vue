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
//   - 拖拽重排(CanReorderTabs,默认 true):HTML5 DnD,重排为组件内部展示顺序(WinUI 直接改集合,
//     Web 声明式子项由组件内部维护顺序映射,建议子项带稳定 key,见 wiki 差异节)。
// 组合方式:默认 slot 声明 <WuiTabViewItem header="..."> 子项(动态增删即响应式数组 v-for);
//   selectedIndex 为 defineModel 双向绑定;tabWidthMode / isAddTabButtonVisible / closeButtonOverlayMode
//   等参数对照官方 Gallery 示例页(CK/WinUI-Gallery/WinUIGallery/Samples/TabView/TabViewPage.xaml)。
import { Comment, Text, computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useSlots, watch } from 'vue'
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

// —— 事件(WinUI AddTabButtonClick / TabCloseRequested / SelectionChanged;closing 由 TabViewItem 声明)——
const emit = defineEmits<{
  addTabButtonClick: []
  tabCloseRequested: [args: TabViewTabCloseRequestedEventArgs]
  selectionChanged: [args: TabViewSelectionChangedEventArgs]
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
  return children
    .filter(
      (child) =>
        typeof child === 'object' &&
        child.type !== Comment &&
        !(child.type === Text && typeof child.children === 'string' && child.children.trim() === ''),
    )
    .map((child, index) => {
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

/** 点击标签选中(disabled 时忽略)。 */
function selectTab(index: number): void {
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
  if (scrollerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measureScroll)
    resizeObserver.observe(scrollerRef.value)
  }
})

onBeforeUnmount(() => resizeObserver?.disconnect())

// —— 拖拽重排(HTML5 DnD;重排内部顺序映射,选中跟随被拖标签)——
const dragIndex = ref<number | null>(null)
const dropBeforeIndex = ref<number | null>(null)

function onTabDragStart(event: DragEvent, index: number): void {
  if (!props.canReorderTabs || props.disabled) {
    event.preventDefault()
    return
  }
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onTabDragOver(event: DragEvent, index: number): void {
  if (dragIndex.value === null || dragIndex.value === index) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const before = event.clientX - rect.left < rect.width / 2
  dropBeforeIndex.value = before ? index : index + 1
}

function onTabDrop(event: DragEvent): void {
  if (dragIndex.value === null || dropBeforeIndex.value === null) return
  event.preventDefault()
  reorderTab(dragIndex.value, dropBeforeIndex.value)
}

function onTabDragEnd(): void {
  dragIndex.value = null
  dropBeforeIndex.value = null
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
  <div v-bind="$attrs" class="wui-tab-view" :class="[`wui-tab-view--${tabWidthMode.toLowerCase()}`, { 'wui-tab-view--disabled': disabled }]" @keydown="onRootKeydown">
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
              'wui-tab-view-item--dragging': dragIndex === index,
            }"
            role="tab"
            :aria-selected="index === activeIndex"
            :aria-controls="panelId(index)"
            :aria-label="entry.header || undefined"
            :tabindex="index === activeIndex ? 0 : -1"
            :draggable="canReorderTabs && !disabled"
            @click="selectTab(index)"
            @keydown="onTabKeydown($event, index)"
            @dragstart="onTabDragStart($event, index)"
            @dragover="onTabDragOver($event, index)"
            @drop="onTabDrop"
            @dragend="onTabDragEnd"
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
 * 颜色一律 --wui-* token;源资源无同名 token 的按最近似映射(见行内注释与 wiki 差异节)。
 */
.wui-tab-view {
  display: block;
  min-width: 0;
  font-family: inherit; /* XamlAutoFontFamily 占位,回退浏览器默认 */
  background: transparent; /* TabViewBackground(SubtleFillColorTransparent) */
}

/* —— 标签条(TabViewHeaderPadding 0,8,0,0;底线 TabViewBorderBrush 1px)—— */
.wui-tab-view-header {
  display: flex;
  align-items: flex-end;
  min-height: 32px;
  padding: 8px 0 0;
  border-bottom: 1px solid var(--wui-system-control-background-base-low); /* TabViewBorderBrush(CardStrokeColorDefault 最近似) */
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
  color: var(--wui-application-secondary-foreground-theme); /* TabViewItemHeaderForeground(TextFillColorSecondary 最近似) */
  cursor: pointer;
  background: transparent; /* TabViewItemHeaderBackground(LayerOnMicaBaseAltFillColorTransparent) */
  border: 1px solid transparent; /* TabViewItemBorderThickness 1(TabViewItemBorderBrush 透明) */
  border-bottom: none;
  border-radius: var(--wui-popup-corner-radius, 8px) var(--wui-popup-corner-radius, 8px) 0 0; /* OverlayCornerRadius 仅上两角 */
  user-select: none;
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
  color: var(--wui-application-secondary-foreground-theme); /* PointerOver = TextFillColorSecondary */
  background: var(--wui-grid-view-item-background-pointer-over); /* TabViewItemHeaderBackgroundPointerOver(SubtleFillColorSecondary 最近似) */
}

.wui-tab-view-item:active:not(.wui-tab-view-item--selected):not(.wui-tab-view--disabled *) {
  color: var(--wui-application-secondary-foreground-theme); /* Pressed = TextFillColorTertiary(最近似 Secondary 同值) */
  background: var(--wui-grid-view-item-background-pressed); /* TabViewItemHeaderBackgroundPressed(SubtleFillColorTertiary 最近似) */
}

/* 选中态(源 Selected:SelectedBackgroundPath + 边框 1,1,1,0 + Margin -1,0,-1,1 + Primary 前景 + SemiBold) */
.wui-tab-view-item--selected {
  z-index: 1;
  margin-bottom: -1px; /* TabViewSelectedItemHeaderMargin -1,0,-1,1:下沿盖住标签条底线 */
  font-weight: 600; /* SemiBold */
  color: var(--wui-default-text-foreground-theme); /* TabViewItemHeaderForegroundSelected(TextFillColorPrimary) */
  cursor: default;
  background: var(--wui-flyout-presenter-background); /* TabViewItemHeaderBackgroundSelected(SolidBackgroundFillColorTertiary 最近似) */
  border-color: var(--wui-system-control-background-base-low); /* TabViewSelectedItemBorderBrush(CardStrokeColorDefault 渐变下沿,取同值实线) */
}

/* 禁用(源 Disabled:背景透明 + 前景 Disabled 色) */
.wui-tab-view--disabled .wui-tab-view-item {
  color: var(--wui-toggle-switch-content-foreground-disabled); /* TabViewItemHeaderForegroundDisabled(TextFillColorDisabled 最近似) */
  cursor: default;
}

.wui-tab-view-item:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: -2px;
}

/* 图标(IconBox:16×16、Margin 0,0,10,0) */
.wui-tab-view-item-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  margin-right: 10px; /* TabViewItemHeaderIconMargin(0,0,10,0) */
  color: var(--wui-application-secondary-foreground-theme); /* TabViewItemIconForeground(TextFillColorSecondary) */
}

.wui-tab-view-item--selected .wui-tab-view-item-icon {
  color: var(--wui-default-text-foreground-theme); /* TabViewItemIconForegroundSelected(TextFillColorPrimary) */
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
  background: var(--wui-system-control-background-base-low); /* TabViewItemSeparator(DividerStrokeColorDefault 最近似) */
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
  color: var(--wui-default-text-foreground-theme); /* TabViewItemHeaderCloseButtonForeground(TextFillColorPrimary) */
  background: transparent; /* TabViewItemHeaderCloseButtonBackground(SubtleFillColorTransparent) */
  border: none; /* TabViewItemHeaderCloseButtonBorderThickness 0 */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius */
  cursor: pointer;
}

.wui-tab-view-item-close:hover:not(:disabled) {
  color: var(--wui-default-text-foreground-theme); /* CloseButtonForegroundPointerOver(TextFillColorPrimary) */
  background: var(--wui-grid-view-item-background-pointer-over); /* CloseButtonBackgroundPointerOver(SubtleFillColorSecondary) */
}

.wui-tab-view-item-close:active:not(:disabled) {
  color: var(--wui-application-secondary-foreground-theme); /* CloseButtonForegroundPressed(TextFillColorSecondary) */
  background: var(--wui-grid-view-item-background-pressed); /* CloseButtonBackgroundPressed(SubtleFillColorTertiary) */
}

.wui-tab-view-item-close:disabled {
  color: var(--wui-toggle-switch-content-foreground-disabled); /* CloseButtonForegroundDisabled(TextFillColorDisabled) */
  cursor: default;
}

.wui-tab-view-item-close:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: -2px;
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
  color: var(--wui-application-secondary-foreground-theme); /* TabViewScrollButtonForeground(TextFillColorSecondary) */
  background: transparent; /* TabViewScrollButtonBackground(SubtleFillColorTransparent) */
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius */
  cursor: pointer;
}

.wui-tab-view-scroll-button:hover:not(:disabled) {
  background: var(--wui-grid-view-item-background-pointer-over); /* ScrollButtonBackgroundPointerOver(SubtleFillColorSecondary) */
}

.wui-tab-view-scroll-button:active:not(:disabled) {
  background: var(--wui-grid-view-item-background-pressed); /* ScrollButtonBackgroundPressed(SubtleFillColorTertiary) */
}

.wui-tab-view-scroll-button:disabled {
  color: var(--wui-toggle-switch-content-foreground-disabled);
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
  color: var(--wui-default-text-foreground-theme); /* TabViewButtonForeground(TextFillColorPrimary) */
  background: transparent; /* TabViewButtonBackground(SubtleFillColorTransparent) */
  border: none; /* TabViewButtonBorderThickness 0 */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius */
  cursor: pointer;
}

.wui-tab-view-add-button:hover:not(:disabled) {
  color: var(--wui-default-text-foreground-theme); /* TabViewButtonForegroundPointerOver(TextFillColorPrimary) */
  background: var(--wui-grid-view-item-background-pointer-over); /* TabViewButtonBackgroundPointerOver(SubtleFillColorSecondary) */
}

.wui-tab-view-add-button:active:not(:disabled) {
  color: var(--wui-application-secondary-foreground-theme); /* TabViewButtonForegroundPressed(TextFillColorSecondary) */
  background: var(--wui-grid-view-item-background-pressed); /* TabViewButtonBackgroundPressed(SubtleFillColorTertiary) */
}

.wui-tab-view-add-button:disabled {
  color: var(--wui-toggle-switch-content-foreground-disabled); /* TabViewButtonForegroundDisabled(TextFillColorDisabled) */
  cursor: default;
}

.wui-tab-view-add-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: -2px;
}

/* —— 内容区(TabContentPresenter:无边框无背景)—— */
.wui-tab-view-panels {
  min-width: 0;
}

.wui-tab-view-panel {
  min-width: 0;
}

/* —— 拖拽重排视觉(DragStates:Reordering Opacity;目标位插入指示线)—— */
.wui-tab-view-item--dragging {
  opacity: 0.4; /* ListViewItemReorderThemeOpacity 观感 */
}

.wui-tab-view-item--drop-before {
  box-shadow: -3px 0 0 0 var(--wui-system-accent-color, #0067c0); /* 插入位置指示(Web 增强,主题色) */
}

/* RTL:滚动按钮与加号区换侧观感由 flex 自动镜像,无需额外规则 */
</style>
