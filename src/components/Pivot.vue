<script setup lang="ts">
// Pivot —— WinUI Pivot 的 Web 复刻:标题行 + 分页内容的选项卡式集合控件。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L12199-12731(Style/ControlTemplate):
//   - 标题行 PivotHeaderItem(Height 48、Padding 12,0,12,0、FontSize 24、FontWeight SemiLight、
//     CharacterSpacing -25):选中/未选态只差前景色(Unselected=BaseMediumLow 60% / Selected=BaseHigh 100%)
//     与 2px SelectedPipe 主题色下划线(Margin 0,0,0,2)—— 源中选中**不加粗**,颜色 token 取
//     theme.css 的 --wui-pivot-header-item-* 全套(Unselected/Selected × Normal/PointerOver/Pressed/Disabled);
//   - 左右导航箭头(Previous/NextTemplate:20×36、Margin 0,6,0,0、字形 E0E2/E0E3、FontSize 12,
//     PivotNext/PreviousButton* 三态色):默认 Opacity 0(IsTabStop=False),行为对照 Pivot_Partial.cpp
//     UpdateVisualStates —— 仅当指针悬停标题行(m_isMouseOrPenPointerOverHeaders)且标题内容溢出裁剪
//     (PivotHeaderPanel.IsContentClipped)且项数 > 1 时显示;越界方向隐藏(showPrevious = SelectedIndex > 0,
//     showNext = SelectedIndex < count-1);
//   - 标题(Pivot Title):FontSize 14、Bold、Padding 12,14,0,13,未设置时收起(模板 Visibility=Collapsed)。
// 行为规格:Pivot_Partial.cpp / PivotHeaderItem.cpp:
//   - 切换内容**无动画**:默认即时显隐(源 UpdateVisibleContent 仅对显式设置 Pivot.SlideInAnimationGroup
//     附加属性的元素播放 700ms 滑入效果,默认组 Default=0 不注册任何元素;未实现该扩展,wiki 差异节记录);
//   - 键盘:标题行方向键(标准 tabs 语义,对照 PivotHeaderPanel 方向导航;Home/End 为 Web 增强)、
//     内容区 Ctrl+PageDown/PageUp 与 Ctrl+Tab / Ctrl+Shift+Tab 翻页(源 OnKeyDownImpl,端点截停不回绕);
//   - 事件:SelectionChanged 在选中项变化时触发(标题点击 / 方向键 / 导航箭头 / 程序化);
//   - 禁用(IsEnabled=false):标题项呈 Disabled 色且不可点,箭头隐藏,键盘失效。
// 组合方式:默认 slot 声明 <WuiPivotItem title="..."> 子项(动态增删即响应式数组 v-for);
//   selectedIndex / selectedItem 均为 defineModel 双向绑定(selectedItem 写入按 key 或引用匹配,见 wiki)。
import { Comment, Fragment, Text, computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useSlots, watch } from 'vue'
import type { VNode } from 'vue'
import WuiFontIcon from './FontIcon.vue'

/** selectionChanged 事件参数(WinUI SelectionChangedEventArgs 的 Web 简化)。 */
interface PivotSelectionChangedEventArgs {
  /** 当前选中项下标。 */
  index: number
  /** 当前选中项(默认 slot 模式为对应 PivotItem 的 VNode)。 */
  item: unknown
}

const props = withDefaults(
  defineProps<{
    /** 控件标题(WinUI Pivot Title,显示在标题行上方;未设置则收起)。 */
    title?: string
    /** 禁用(WinUI IsEnabled=false):标题项不可点且呈 Disabled 色,导航箭头隐藏。 */
    disabled?: boolean
    /** 上一页导航箭头的 aria-label(可本地化覆盖)。 */
    ariaLabelPrevious?: string
    /** 下一页导航箭头的 aria-label(可本地化覆盖)。 */
    ariaLabelNext?: string
  }>(),
  {
    title: undefined,
    disabled: false,
    ariaLabelPrevious: 'Previous',
    ariaLabelNext: 'Next',
  },
)

// —— SelectedIndex / SelectedItem 双向绑定(WinUI SelectedIndex / SelectedItem)——
const selectedIndex = defineModel<number>('selectedIndex', { default: 0 })
const selectedItem = defineModel<unknown>('selectedItem')

// —— 事件(WinUI SelectionChanged;标题点击 / 键盘 / 导航箭头 / 程序化修改都会触发)——
const emit = defineEmits<{
  selectionChanged: [payload: PivotSelectionChangedEventArgs]
}>()

defineOptions({ inheritAttrs: false })

// —— 项集合:默认 slot 下的 PivotItem 子项(过滤注释与空白文本节点)——
const slots = useSlots()

const items = computed<VNode[]>(() => {
  const children = slots.default?.() ?? []
  // 展开 Fragment:slot 内容为 v-for 时编译产物是单个 Fragment 块,直接当子项会把
  // 整个列表折叠成「1 个无 title 的项」(标题行只剩一个空 Tab,内容挤进同一面板,
  // 且该 Tab 因无可访问名触发 axe button-name)。此处展平一层 Fragment 并沿用原过滤。
  const flat: VNode[] = []
  const push = (node: VNode): void => {
    if (node.type === Comment) return
    if (node.type === Text && typeof node.children === 'string' && node.children.trim() === '') return
    flat.push(node)
  }
  for (const child of children) {
    if (child.type === Fragment && Array.isArray(child.children)) {
      for (const sub of child.children as VNode[]) push(sub)
      continue
    }
    push(child)
  }
  return flat
})

const count = computed(() => items.value.length)

/** 各页标题(读取子项的 title prop;子项未设置时回退空串)。 */
const titles = computed<string[]>(() =>
  items.value.map((child) => {
    const title = child.props?.['title']
    return typeof title === 'string' ? title : ''
  }),
)

/** 渲染用受控下标(越界值收敛到有效区间)。 */
const activeIndex = computed(() => {
  const max = Math.max(count.value - 1, 0)
  return Math.min(Math.max(Math.round(selectedIndex.value), 0), max)
})

const hasTitle = computed(() => props.title !== undefined && props.title !== '')

// —— 选中项变化:发事件 + 同步 selectedItem(初始挂载静默同步,不发 SelectionChanged)——
watch(selectedIndex, (next) => {
  const clamped = Math.min(Math.max(next, 0), Math.max(count.value - 1, 0))
  emit('selectionChanged', { index: clamped, item: items.value[clamped] })
  writeSelectedItem(clamped)
})

// 项数变化后收敛越界下标(源 OnItemsChanged 重新选中最近有效项的简化)
watch(count, () => {
  if (count.value > 0 && selectedIndex.value > count.value - 1) {
    selectedIndex.value = count.value - 1
  }
})

function writeSelectedItem(index: number): void {
  selectedItem.value = items.value[index]
}

onMounted(() => {
  if (count.value > 0) writeSelectedItem(activeIndex.value)
})

// —— selectedItem 外部写入:按引用 / key 匹配定位下标(匹配不到则忽略,详见 wiki)——
watch(selectedItem, (value) => {
  if (props.disabled || count.value === 0) return
  const byIdentity = items.value.indexOf(value as VNode)
  if (byIdentity >= 0) {
    if (byIdentity !== activeIndex.value) selectedIndex.value = byIdentity
    return
  }
  const byKey = items.value.findIndex((child) => child.key !== null && child.key === value)
  if (byKey >= 0 && byKey !== activeIndex.value) selectedIndex.value = byKey
})

// —— 导航(源 MoveToNextItem / MoveToPreviousItem:静态标题模式端点截停,不回绕)——
function moveNext(): boolean {
  if (props.disabled || count.value === 0) return false
  if (activeIndex.value >= count.value - 1) return false
  selectedIndex.value = activeIndex.value + 1
  return true
}

function movePrevious(): boolean {
  if (props.disabled || count.value === 0) return false
  if (activeIndex.value <= 0) return false
  selectedIndex.value = activeIndex.value - 1
  return true
}

// —— 标题行:roving tabindex + 方向键(标准 tabs 语义;RTL 下左右翻转)——
const headersRef = ref<HTMLElement | null>(null)
const tabRefs = ref<(HTMLButtonElement | null)[]>([])

const baseId = useId()
const tabId = (index: number): string => `${baseId}-tab-${index}`
const panelId = (index: number): string => `${baseId}-panel-${index}`

function setTabRef(el: unknown, index: number): void {
  tabRefs.value[index] = el instanceof HTMLButtonElement ? el : null
}

function isRtl(): boolean {
  return headersRef.value !== null && getComputedStyle(headersRef.value).direction === 'rtl'
}

function onHeadersKeydown(event: KeyboardEvent): void {
  if (props.disabled || count.value === 0) return
  const last = count.value - 1
  const current = activeIndex.value
  const rtl = isRtl()
  let next: number
  switch (event.key) {
    case 'ArrowLeft':
      next = (rtl ? current < last : current > 0) ? current + (rtl ? 1 : -1) : current
      break
    case 'ArrowRight':
      next = (rtl ? current > 0 : current < last) ? current + (rtl ? -1 : 1) : current
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = last
      break
    default:
      return
  }
  event.preventDefault()
  if (next !== current) selectedIndex.value = next
  void nextTick(() => tabRefs.value[next]?.focus())
}

// —— 内容区键盘(源 OnKeyDownImpl:Ctrl+PageDown/PageUp、Ctrl+Tab / Ctrl+Shift+Tab;端点截停)——
function onRootKeydown(event: KeyboardEvent): void {
  if (props.disabled || !event.ctrlKey) return
  let handled = false
  if (event.key === 'PageDown') handled = moveNext()
  else if (event.key === 'PageUp') handled = movePrevious()
  else if (event.key === 'Tab') handled = event.shiftKey ? movePrevious() : moveNext()
  if (handled) event.preventDefault()
}

// —— 导航箭头显隐(源 UpdateVisualStates:hover + 标题溢出裁剪 + 项数 > 1 + 方向未越界)——
const headersClipped = ref(false)
let resizeObserver: ResizeObserver | null = null

function measureClipped(): void {
  const el = headersRef.value
  if (!el) return
  headersClipped.value = el.scrollWidth > el.clientWidth + 1
}

watch(items, () => {
  void nextTick(() => {
    tabRefs.value = tabRefs.value.slice(0, count.value)
    measureClipped()
  })
})

onMounted(() => {
  measureClipped()
  if (headersRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measureClipped)
    resizeObserver.observe(headersRef.value)
  }
})

onBeforeUnmount(() => resizeObserver?.disconnect())

const showPrevious = computed(
  () => !props.disabled && count.value > 1 && headersClipped.value && activeIndex.value > 0,
)
const showNext = computed(
  () => !props.disabled && count.value > 1 && headersClipped.value && activeIndex.value < count.value - 1,
)

// 导航箭头字形(源 NextTemplate/PreviousTemplate 的 FontIcon Glyph,Segoe Fluent Icons)
const PREVIOUS_GLYPH = '\uE0E2'
const NEXT_GLYPH = '\uE0E3'
</script>

<template>
  <div v-bind="$attrs" class="wui-pivot" :class="{ 'wui-pivot--disabled': disabled }" @keydown="onRootKeydown">
    <!-- 标题(WinUI Pivot Title:14px Bold,Padding 12,14,0,13;未设置收起) -->
    <div v-if="hasTitle || $slots.title" class="wui-pivot-title">
      <slot name="title" :title="title">{{ title }}</slot>
    </div>

    <!-- 标题行(HeaderClipper > PivotHeaderPanel + Previous/Next Button) -->
    <div class="wui-pivot-header-area">
      <div ref="headersRef" class="wui-pivot-headers" role="tablist" @keydown="onHeadersKeydown">
        <button
          v-for="(itemTitle, index) in titles"
          :id="tabId(index)"
          :key="items[index]?.key ?? index"
          :ref="(el) => setTabRef(el, index)"
          type="button"
          class="wui-pivot-header-item"
          :class="{ 'wui-pivot-header-item--selected': index === activeIndex }"
          role="tab"
          :aria-selected="index === activeIndex"
          :aria-controls="panelId(index)"
          :tabindex="index === activeIndex ? 0 : -1"
          :disabled="disabled || undefined"
          @click="selectedIndex = index"
        >
          <span class="wui-pivot-header-item-label">{{ itemTitle }}</span>
          <span class="wui-pivot-header-item-pipe" aria-hidden="true"></span>
        </button>
      </div>

      <!-- 左右导航箭头:悬停标题行 + 标题溢出 + 非越界才可见(源 NavigationButtons* 视觉态) -->
      <button
        v-show="showPrevious"
        type="button"
        class="wui-pivot-nav wui-pivot-nav--previous"
        :aria-label="ariaLabelPrevious"
        :aria-hidden="true"
        tabindex="-1"
        @click="movePrevious()"
      >
        <WuiFontIcon :glyph="PREVIOUS_GLYPH" :font-size="12" />
      </button>
      <button
        v-show="showNext"
        type="button"
        class="wui-pivot-nav wui-pivot-nav--next"
        :aria-label="ariaLabelNext"
        :aria-hidden="true"
        tabindex="-1"
        @click="moveNext()"
      >
        <WuiFontIcon :glyph="NEXT_GLYPH" :font-size="12" />
      </button>
    </div>

    <!-- 分页内容(所有 PivotItem 保持挂载,非选中 display:none —— 源 UpdateItemVisibility 语义) -->
    <div class="wui-pivot-panels">
      <div
        v-for="(child, index) in items"
        v-show="index === activeIndex"
        :id="panelId(index)"
        :key="child.key ?? index"
        class="wui-pivot-panel"
        role="tabpanel"
        :aria-labelledby="tabId(index)"
      >
        <component :is="child" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 generic.xaml Pivot ControlTemplate(L12213):
 * RootElement Grid > [TitleContentControl | Grid > HeaderClipper + Previous/NextButton + ItemsPresenter]。
 * 颜色一律 --wui-pivot-* token(theme.css 已备齐 Normal/PointerOver/Pressed/Disabled 全套)。
 */
.wui-pivot {
  display: block;
  min-width: 0;
  font-family: inherit; /* XamlAutoFontFamily 占位,回退浏览器默认 */
  background: var(--wui-pivot-background); /* PivotBackground(透明) */
}

/* —— 标题(Pivot Title)—— */
.wui-pivot-title {
  padding: 14px 0 13px 12px; /* PivotPortraitThemePadding(12,14,0,13) */
  font-size: var(--wui-pivot-title-font-size); /* PivotTitleFontSize = 14 */
  font-weight: 700; /* PivotTitleThemeFontWeight = Bold */
}

/* —— 标题行 —— */
.wui-pivot-header-area {
  position: relative;
  background: var(--wui-pivot-header-background); /* PivotHeaderBackground(透明) */
}

.wui-pivot-headers {
  display: flex;
  overflow: hidden; /* HeaderClipper 裁剪(溢出检测 = IsContentClipped) */
}

.wui-pivot-header-item {
  position: relative;
  flex: 0 0 auto;
  height: 48px; /* PivotHeaderItem Height = 48 */
  padding: 0 12px; /* PivotHeaderItemMargin(12,0,12,0) */
  font-family: inherit;
  font-size: var(--wui-pivot-header-item-font-size); /* PivotHeaderItemFontSize = 24 */
  font-weight: 350; /* PivotHeaderItemThemeFontWeight = SemiLight(项目字重映射 350) */
  letter-spacing: -0.6px; /* PivotHeaderItemCharacterSpacing = -25(1/1000em × 24px) */
  white-space: nowrap;
  color: var(--wui-pivot-header-item-foreground-unselected);
  background: var(--wui-pivot-header-item-background-unselected);
  border: none;
  cursor: pointer;
}

.wui-pivot-header-item:hover:not(:disabled):not(.wui-pivot-header-item--selected) {
  color: var(--wui-pivot-header-item-foreground-unselected-pointer-over);
  background: var(--wui-pivot-header-item-background-unselected-pointer-over);
}

.wui-pivot-header-item:active:not(:disabled):not(.wui-pivot-header-item--selected) {
  color: var(--wui-pivot-header-item-foreground-unselected-pressed);
  background: var(--wui-pivot-header-item-background-unselected-pressed);
}

/* 选中态(源 Selected 视觉态:前景变 BaseHigh + 2px SelectedPipe 下划线,字重不变) */
.wui-pivot-header-item--selected {
  color: var(--wui-pivot-header-item-foreground-selected);
  background: var(--wui-pivot-header-item-background-selected);
  cursor: default;
}

.wui-pivot-header-item--selected:hover:not(:disabled) {
  color: var(--wui-pivot-header-item-foreground-selected-pointer-over);
  background: var(--wui-pivot-header-item-background-selected-pointer-over);
}

.wui-pivot-header-item--selected:active:not(:disabled) {
  color: var(--wui-pivot-header-item-foreground-selected-pressed);
  background: var(--wui-pivot-header-item-background-selected-pressed);
}

.wui-pivot-header-item:disabled {
  color: var(--wui-pivot-header-item-foreground-disabled);
  background: var(--wui-pivot-header-item-background-disabled);
  cursor: default;
}

.wui-pivot-header-item:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: -2px;
}

/* SelectedPipe:2px 主题色下划线,距底 2px(Margin 0,0,0,2);Disabled 收起(源 Disabled 态) */
.wui-pivot-header-item-pipe {
  display: none;
  position: absolute;
  right: 0;
  bottom: 2px;
  left: 0;
  height: 2px;
  background: var(--wui-pivot-header-item-selected-pipe-fill);
}

.wui-pivot-header-item--selected:not(:disabled) .wui-pivot-header-item-pipe {
  display: block;
}

/* —— 左右导航箭头(源模板 Width 20 / Height 36、Margin 0,6,0,0、字形 12px)—— */
.wui-pivot-nav {
  position: absolute;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 36px;
  margin-top: 6px; /* PivotNavButtonMargin(0,6,0,0) */
  padding: 0;
  color: var(--wui-pivot-next-button-foreground);
  background: var(--wui-pivot-next-button-background);
  border: 0 solid var(--wui-pivot-next-button-border); /* PivotNavButtonBorderThemeThickness = 0 */
  cursor: pointer;
  /* 源默认 Opacity 0,悬停标题行时显示(GoToState useTransitions=true → 快速淡入) */
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--wui-duration-fast) var(--wui-easing-standard);
}

.wui-pivot-nav--previous {
  left: 0;
  color: var(--wui-pivot-previous-button-foreground);
  background: var(--wui-pivot-previous-button-background);
  border-color: var(--wui-pivot-previous-button-border);
}

.wui-pivot-nav--next {
  right: 0;
}

.wui-pivot-header-area:hover .wui-pivot-nav {
  opacity: 1;
  pointer-events: auto;
}

.wui-pivot-nav--previous:hover {
  color: var(--wui-pivot-previous-button-foreground-pointer-over);
  background: var(--wui-pivot-previous-button-background-pointer-over);
}

.wui-pivot-nav--previous:active {
  color: var(--wui-pivot-previous-button-foreground-pressed);
  background: var(--wui-pivot-previous-button-background-pressed);
}

.wui-pivot-nav--next:hover {
  color: var(--wui-pivot-next-button-foreground-pointer-over);
  background: var(--wui-pivot-next-button-background-pointer-over);
}

.wui-pivot-nav--next:active {
  color: var(--wui-pivot-next-button-foreground-pressed);
  background: var(--wui-pivot-next-button-background-pressed);
}

/* —— 分页内容 —— */
.wui-pivot-panels {
  min-height: 0;
}

.wui-pivot-panel {
  min-width: 0;
}

/* RTL:导航箭头换边(源 FlowDirection 镜像布局) */
[dir='rtl'] .wui-pivot-nav--previous {
  left: auto;
  right: 0;
}

[dir='rtl'] .wui-pivot-nav--next {
  right: auto;
  left: 0;
}
</style>
