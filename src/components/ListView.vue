<script setup lang="ts">
// ListView.vue —— WinUI ListView 的 Web 复刻(垂直滚动列表 + 四种选择模式)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="ListView">(L9284 起):Border(Background/BorderBrush/BorderThickness/
//   CornerRadius,默认全空)→ ScrollViewer(纵向 Auto / 横向 Disabled,BringIntoView)→
//   ItemsPresenter(Header 在上、Footer 在下、随内容滚动,Padding 来自控件 Padding)。
//   列表项容器视觉见 ListViewItem.vue 头注(ListViewItemRevealStyle 体系)。
// 行为规格(对照 WinUI ListViewBase /官方 SelectionSupport 示例):
//   - 选择状态机复用集合公共底座 src/composables/useSelection.ts(本波次 T5.0 产物):
//     SelectionMode 四态(None/Single/Multiple/Extended)、锚点区间、Ctrl/Shift 指针
//     语义全部由 useSelection 裁决,本组件只解释手势(单击/键盘)并同步双向模型;
//   - selectedIndex(WinUI SelectedIndex,未选 -1,多选取首个选中项)/
//     selectedItems(WinUI SelectedItems)双向;selectedIndex 程序化赋值 = 选中该单项
//     (替换既有选择,越界归一为 -1 清空);selectedItems 程序化赋值按引用相等回查
//     索引;变化统一发 selectionChanged(selected, added, removed)(程序化赋值亦触发);
//   - singleSelectionFollowsFocus(WinUI 同名属性,默认 true):仅 Single 模式,
//     方向键移动焦点时选中随焦点走;false 则只移焦点,Space 才选;
//   - 键盘(roving tabindex,项持真实 DOM 焦点):↑/↓ 移焦、Home/End 首/末、
//     Ctrl+↑/↓/Home/End 只移焦不改选择、Shift+↑/↓(Extended/Multiple)区间替换、
//     Space 选择/切换(Multiple)、Ctrl+Space(Extended)切换不破坏其余选中、
//     Ctrl+A 全选(Multiple/Extended)、Enter 触发 itemClick;
//   - 数据源变化:useSelection 自动剔除已不存在的选中项,焦点索引在本组件钳制。
//   - 虚拟化:本期不做,列表为普通 DOM 渲染;items 容器即未来的虚拟化挂载点
//     (窗口化渲染替换 v-for,公开 API 不变),见 wiki「与 WinUI 的差异」。
import { computed, nextTick, ref, useAttrs, useId, watch } from 'vue'
import { useSelection } from '@/composables/useSelection'
import WuiListViewItem from './ListViewItem.vue'

defineOptions({ name: 'WuiListView', inheritAttrs: false })

/** 选择模式(WinUI SelectionMode)。 */
type SelectionMode = 'None' | 'Single' | 'Multiple' | 'Extended'

// —— 无障碍名:role=listbox 的条目容器需要可访问名(aria-input-field-name);调用方经
// attrs 传入的 aria-label / aria-labelledby 从根 div(无 role,属禁止属性)迁移到
// listbox 元素上(aria-prohibited-attr 同修)。
const attrs = useAttrs()

const listAriaLabel = computed(() =>
  typeof attrs['aria-label'] === 'string' ? attrs['aria-label'] : undefined,
)
const listAriaLabelledBy = computed(() =>
  typeof attrs['aria-labelledby'] === 'string' ? attrs['aria-labelledby'] : undefined,
)

/** 根元素透传 attrs:剥离已迁移的 aria-label / aria-labelledby。 */
const rootAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'aria-label' || key === 'aria-labelledby') continue
    rest[key] = value
  }
  return rest
})

const props = withDefaults(
  defineProps<{
    /** 选择模式(WinUI SelectionMode,默认 Single)。 */
    selectionMode?: SelectionMode
    /** 对象项的显示字段路径(WinUI DisplayMemberPath);缺省 String(item)。 */
    displayMemberPath?: string
    /** Single 模式下方向键移动焦点时选中是否随焦点走(WinUI SingleSelectionFollowsFocus,默认 true)。 */
    singleSelectionFollowsFocus?: boolean
    /**
     * 项的 reveal 揭示光照(透传 ListViewItem.enableReveal)。默认 true:WinUI 3
     * 默认项样式即 ListViewItemRevealStyle(generic.xaml L20595);设 false 关闭光照。
     */
    revealBorder?: boolean
  }>(),
  {
    selectionMode: 'Single',
    displayMemberPath: '',
    singleSelectionFollowsFocus: true,
    revealBorder: true,
  },
)

/** 数据源数组(WinUI ItemsSource),支持 v-model:items。 */
const items = defineModel<unknown[]>('items', { default: () => [] })
/** 选中项索引(WinUI SelectedIndex,未选 -1),支持 v-model:selected-index。 */
const selectedIndex = defineModel<number>('selectedIndex', { default: -1 })
/** 选中项集合(WinUI SelectedItems),支持 v-model:selected-items。 */
const selectedItems = defineModel<unknown[]>('selectedItems', { default: () => [] })

const emit = defineEmits<{
  /** WinUI SelectionChanged:选择集变化(含程序化赋值);参数为 (选中项, 新增项, 移除项)。 */
  (e: 'selectionChanged', selected: unknown[], added: unknown[], removed: unknown[]): void
  /** WinUI ItemClick:项被单击(任意模式,含 None);参数为 (index, item)。 */
  (e: 'itemClick', index: number, item: unknown): void
}>()

const listId = useId()

/* -------------------------------------------------------------------------
 * 选择状态(useSelection 公共底座):内部唯一事实源在组合式内,
 * 本组件负责「双向模型 ↔ 选择集」同步与手势解释。
 * ---------------------------------------------------------------------- */

/** 上一帧通知快照(selectionChanged 的 added / removed 做差用)。 */
let lastNotified: unknown[] = []

const selection = useSelection({
  items: () => items.value ?? [],
  selectionMode: () => props.selectionMode,
  onSelectionChange: (selected) => {
    const previous = lastNotified
    const added = selected.filter((entry) => !previous.includes(entry))
    const removed = previous.filter((entry) => !selected.includes(entry))
    if (added.length === 0 && removed.length === 0) return
    // 同集替换(如 Single 模式重复点击已选中项)不构成变化:不发事件、不回写模型
    lastNotified = [...selected]
    // 回写双向模型(回声由下方 watcher 的相等短路吸收)
    selectedIndex.value = selection.selectedIndex.value
    selectedItems.value = [...selected]
    emit('selectionChanged', [...selected], added, removed)
  },
})

/** 键盘焦点索引(roving tabindex;初始首项,保证 Tab 可达)。 */
const focusedIndex = ref(0)

// 初始同步:外部经 props 传入的首选值落入选择集( watcher 非 immediate,挂载前补一步;
// 预置 lastNotified 吞掉这次初始化的回声,初始模板值不发 selectionChanged,对齐 WinUI)
if (props.selectionMode !== 'None') {
  const source = items.value ?? []
  const initialList = Array.isArray(selectedItems.value) ? selectedItems.value : []
  const indices: number[] = []
  for (const entry of initialList) {
    const index = source.indexOf(entry)
    if (index >= 0 && !indices.includes(index)) indices.push(index)
  }
  if (
    indices.length === 0 &&
    typeof selectedIndex.value === 'number' &&
    selectedIndex.value >= 0 &&
    selectedIndex.value < source.length
  ) {
    indices.push(Math.trunc(selectedIndex.value))
  }
  if (indices.length > 0) {
    selection.replaceSelection(indices)
    lastNotified = [...selection.selectedItems.value]
    // 只传 selectedItems 时同步 selectedIndex 模型(WinUI SelectedIndex 随之生效)
    selectedIndex.value = selection.selectedIndex.value
  }
}

// 程序化只写 selectedIndex:语义为「选中该单项,替换既有选择」(WinUI 同);越界归一 -1
watch(selectedIndex, (value, oldValue) => {
  const index = typeof value === 'number' ? Math.trunc(value) : -1
  const count = items.value?.length ?? 0
  if (typeof oldValue === 'number' && oldValue !== -1 && (oldValue < 0 || oldValue >= count)) {
    return // 上一帧为越界值:本帧 -1 是归一化回声,不再作用于选择
  }
  if (props.selectionMode === 'None') {
    // WinUI:None 模式 SelectedIndex 恒为 -1,外部写入不生效
    if (selectedIndex.value !== -1) selectedIndex.value = -1
    return
  }
  if (index !== -1 && (index < 0 || index >= count)) {
    // 越界:模型值归一为 -1(WinUI 对越界赋值抛错,Web 收敛),不动既有选择
    if (selectedIndex.value !== -1) selectedIndex.value = -1
    return
  }
  if (index === selection.selectedIndex.value) return // 本组件回写的回声
  if (index < 0) selection.clear()
  else selection.replaceSelection([index])
})

// 程序化写 selectedItems:按引用相等回查索引,整体替换选择集
watch(selectedItems, (value) => {
  if (props.selectionMode === 'None') {
    // WinUI:None 模式无选择,外部写入不生效
    if (selectedItems.value.length > 0) selectedItems.value = []
    return
  }
  const list = Array.isArray(value) ? value : []
  if (sameItems(list, selection.selectedItems.value)) return // 回声
  const indices: number[] = []
  const source = items.value ?? []
  for (const entry of list) {
    const index = source.indexOf(entry)
    if (index >= 0 && !indices.includes(index)) indices.push(index)
  }
  if (indices.length === 0) selection.clear()
  else selection.replaceSelection(indices)
})

/** 条目数组按引用相等比较(顺序敏感;同序同集即视为未变)。 */
function sameItems(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index])
}

// 数据源变化:useSelection 已剔除失效选中,这里只钳制焦点索引(容器回收语义)
watch(items, () => {
  const count = items.value?.length ?? 0
  if (focusedIndex.value >= count) focusedIndex.value = Math.max(0, count - 1)
})

/** Multiple 模式显示常驻勾选框(Extended 不显示,选中以 accent 底色表达)。 */
const showChecks = computed(() => props.selectionMode === 'Multiple')

const isMultiSelect = computed(
  () => props.selectionMode === 'Multiple' || props.selectionMode === 'Extended',
)

/* -------------------------------------------------------------------------
 * 项显示文本(displayMemberPath 优先,回退 String(item))
 * ---------------------------------------------------------------------- */

function itemText(item: unknown): string {
  if (item == null) return ''
  if (props.displayMemberPath !== '' && typeof item === 'object') {
    const value = (item as Record<string, unknown>)[props.displayMemberPath]
    if (value != null) return String(value)
  }
  return String(item)
}

/* -------------------------------------------------------------------------
 * 焦点管理(roving tabindex + BringIntoView)
 * ---------------------------------------------------------------------- */

const scrollerRef = ref<HTMLDivElement | null>(null)

function focusItem(index: number): void {
  const count = items.value?.length ?? 0
  if (count === 0) return
  focusedIndex.value = Math.max(0, Math.min(count - 1, index))
  void nextTick(() => {
    const scroller = scrollerRef.value
    if (!scroller) return
    const target = scroller.querySelector<HTMLElement>(`[data-item-index="${focusedIndex.value}"]`)
    // roving tabindex 落实为真实 DOM 焦点:键盘路径(:focus-visible 双线焦点框随动)
    // 与 Space/Shift 的操作目标才一致;preventScroll 交由下方 scrollIntoView(nearest)
    // 精确对齐 BringIntoView。指针路径浏览器启发式不命中 :focus-visible,不出焦点框。
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'nearest' })
  })
}

/* -------------------------------------------------------------------------
 * 指针:单击项( ListViewItem activated;修饰键交 useSelection.handleClick 裁决)
 * ---------------------------------------------------------------------- */

function onItemActivated(index: number, event: MouseEvent): void {
  if (index < 0 || index >= (items.value?.length ?? 0)) return
  emit('itemClick', index, items.value[index])
  selection.handleClick(index, {
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey,
  })
  focusItem(index)
}

/* -------------------------------------------------------------------------
 * 键盘(项持焦点,事件冒泡到滚动容器统一裁决)
 * ---------------------------------------------------------------------- */

interface FocusMoveOptions {
  ctrl: boolean
  shift: boolean
}

/** 移动焦点;按模式决定是否连带选择(Shift 区间以锚点为基线整体替换)。 */
function moveFocus(target: number, options: FocusMoveOptions): void {
  const count = items.value?.length ?? 0
  if (count === 0) return
  const previous = focusedIndex.value
  const clamped = Math.max(0, Math.min(count - 1, target))
  focusItem(clamped)

  if (options.shift && isMultiSelect.value) {
    // WinUI:Shift+方向键 = 锚点~焦点区间替换选择(锚点不动,可连续扩展);
    // 无锚点(未点击过)时以移动前焦点为锚并落锚,保证连续 Shift 从同一起点扩展
    let anchor = selection.anchorIndex.value
    if (anchor < 0 || anchor >= count) {
      anchor = previous
      selection.anchorIndex.value = anchor
    }
    const from = Math.min(anchor, clamped)
    const to = Math.max(anchor, clamped)
    const range: number[] = []
    for (let index = from; index <= to; index += 1) range.push(index)
    selection.replaceSelection(range)
  } else if (
    !options.ctrl &&
    !options.shift &&
    props.selectionMode === 'Single' &&
    props.singleSelectionFollowsFocus
  ) {
    selection.select(clamped)
  }
}

function onListKeydown(event: KeyboardEvent): void {
  const mode = props.selectionMode
  const count = items.value?.length ?? 0
  const ctrl = event.ctrlKey || event.metaKey
  const shift = event.shiftKey
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault()
      moveFocus(focusedIndex.value + (event.key === 'ArrowDown' ? 1 : -1), { ctrl, shift })
      return
    case 'Home':
    case 'End':
      event.preventDefault()
      moveFocus(event.key === 'Home' ? 0 : count - 1, { ctrl, shift })
      return
    case ' ':
    case 'Spacebar': {
      // Space:Single 选择焦点项;Multiple 切换;Extended 无 Ctrl 选择焦点项、
      // Ctrl+Space 切换且不破坏其余选中(WinUI Extended 键盘语义)
      event.preventDefault()
      const index = focusedIndex.value
      if (mode === 'None' || index < 0 || index >= count) return
      if (mode === 'Multiple') selection.toggle(index)
      else if (mode === 'Extended' && ctrl) {
        selection.toggle(index)
        selection.anchorIndex.value = index // WinUI:Ctrl+Space 锚点移至焦点项
      } else if (mode === 'Extended') selection.replaceSelection([index])
      else selection.select(index)
      return
    }
    case 'Enter':
      // WinUI:Enter 触发 ItemClick 语义,不改选择
      event.preventDefault()
      emit('itemClick', focusedIndex.value, (items.value ?? [])[focusedIndex.value])
      return
    case 'a':
    case 'A':
      if (ctrl && isMultiSelect.value) {
        event.preventDefault()
        selection.selectAll()
      }
      return
    // 其余按键(字符键/Tab 等)不拦截:Tab 走原生焦点移动(roving tabindex 承接)
  }
}
</script>

<template>
  <!-- 源模板 Root Border:Background/BorderBrush/BorderThickness/CornerRadius 默认全空,
       交由消费侧经 style/attrs 定制(官方示例列表常加 1px 边框) -->
  <div v-bind="rootAttrs" class="wui-list-view">
    <!-- ScrollViewer:纵向 Auto / 横向 Disabled;@keydown 收项冒泡(roving tabindex) -->
    <div ref="scrollerRef" class="wui-list-view-scroller" @keydown="onListKeydown">
      <!-- ItemsPresenter Header:随内容滚动 -->
      <div v-if="$slots.header" class="wui-list-view-header">
        <slot name="header" />
      </div>

      <div
        :id="listId"
        class="wui-list-view-items"
        role="listbox"
        :aria-label="listAriaLabel"
        :aria-labelledby="listAriaLabelledBy"
        :aria-multiselectable="isMultiSelect || undefined"
      >
        <WuiListViewItem
          v-for="(item, index) in items"
          :id="`${listId}-opt-${index}`"
          :key="index"
          :data-item-index="index"
          :selected="selection.isIndexSelected(index)"
          :check-visible="showChecks"
          :focused="index === focusedIndex"
          :enable-reveal="revealBorder"
          @activated="onItemActivated(index, $event)"
        >
          <!-- ItemTemplate:slot 优先,缺省按 displayMemberPath / String(item) 渲染 -->
          <slot name="item" :item="item" :index="index">{{ itemText(item) }}</slot>
        </WuiListViewItem>
      </div>

      <!-- ItemsPresenter Footer:随内容滚动 -->
      <div v-if="$slots.footer" class="wui-list-view-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.wui-list-view {
  /* 源模板 Border:Background/BorderBrush/BorderThickness/CornerRadius 默认空,
     不在此设值;消费侧用 style / class 叠加(对齐官方示例 1px 边框用法) */
  box-sizing: border-box;
  font-size: var(--wui-control-content-theme-font-size);
}

.wui-list-view-scroller {
  max-height: 100%;
  overflow-y: auto; /* ScrollViewer.VerticalScrollBarVisibility = Auto */
  overflow-x: hidden; /* HorizontalScrollMode = Disabled */
  outline: none;
  --wui-list-view-bar-size: 12px;
}

/* 滚动条:WinUI 细拇指观感(与 ScrollView / ScrollViewer 同口径)。
   PL17 权威重定向:thumb 静置/悬停/按下同指 ControlStrongFillColorDefaultBrush
   (ScrollBarThumbBackground L26/L37、ScrollBarThumbFillPointerOver L27/L139、
   ScrollBarThumbFillPressed L28/L140),轨道悬停显形取 ScrollBarTrackFill
   (L31/L143 = AcrylicInAppFillColorDefaultBrush);原 legacy --wui-scroll-bar-*
   引用改指 PL2 已落地 Fluent 语义 token。几何与时长未动。 */
.wui-list-view-scroller::-webkit-scrollbar {
  width: var(--wui-list-view-bar-size);
  height: var(--wui-list-view-bar-size);
  background: transparent;
}

.wui-list-view-scroller::-webkit-scrollbar-track {
  background: transparent;
}

.wui-list-view-scroller:hover::-webkit-scrollbar-track {
  background: var(--wui-acrylic-in-app-fill-color-default);
}

.wui-list-view-scroller::-webkit-scrollbar-thumb {
  background: var(--wui-control-strong-fill-color-default);
  border: 4px solid transparent;
  background-clip: padding-box;
  border-radius: 8px;
}

.wui-list-view-scroller:hover::-webkit-scrollbar-thumb {
  background: var(--wui-control-strong-fill-color-default);
  border: 3px solid transparent;
}

.wui-list-view-scroller:active::-webkit-scrollbar-thumb {
  background: var(--wui-control-strong-fill-color-default);
}

.wui-list-view-scroller::-webkit-scrollbar-corner {
  background: transparent;
}

/* Header / Footer:源 ItemsPresenter 无默认样式,仅随内容滚动 */
.wui-list-view-header,
.wui-list-view-footer {
  margin: 0;
}
</style>
