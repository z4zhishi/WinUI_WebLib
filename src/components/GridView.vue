<script setup lang="ts">
// WuiGridView —— WinUI GridView 的 Web 复刻:以行列网格呈现集合并支持选择。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="GridView">(L9348 起):模板 = Border > ScrollViewer(纵向滚动,
//   横向禁用)> ItemsPresenter(Padding=0,0,0,10);项容器默认 GridViewItemRevealStyle。
// 布局承载:UniformGridLayout / ItemsWrapGrid(横向换行、MaximumRowsOrColumns 上限、
//   ItemWidth/ItemHeight 定格)以 CSS Grid 等价实现(cell 尺寸可配;差异见 wiki)。
//   源 ItemsWrapGrid Orientation=Horizontal 以「可用宽」逐格填满后换行,故控件根须有定宽:
//   按 FrameworkElement 默认 HorizontalAlignment=Stretch,根元素显式 width:100%,否则在
//   flex 列容器(align-items:flex-start)中收缩为 fit-content,auto-fill 会退化为 1 轨。
// 选择核心:selectionMode(None/Single/Multiple/Extended)+ selectedItems/selectedIndex/
//   selectedItem 模型 + selectionChanged(AddedItems/RemovedItems 语义),内联实现 ——
//   预留替换点:阶段 5 公共层 src/composables/useSelection.ts(任务 T5.0)落地后,
//   可将 applySelection/onItemPointer 的索引集合运算换为该 composable,公开 API 不变。
// 键盘:方向键按几何位置移动焦点(Single 模式随动选择)、Home/End、Space/Enter 选择、
//   Extended 模式 Ctrl+A 全选,与 WinUI ListViewBase 行为对齐。
import { computed, nextTick, ref, watch } from 'vue'
import WuiGridViewItem from './GridViewItem.vue'

/** 选择模式(WinUI ListViewBase.SelectionMode)。 */
type GridViewSelectionMode = 'None' | 'Single' | 'Multiple' | 'Extended'

// class/style 等透传属性统一由根元素 v-bind="$attrs" 承接。
defineOptions({ name: 'WuiGridView', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 数据源数组(WinUI ItemsSource),元素可为字符串/数字/对象。 */
    items?: unknown[]
    /** 选择模式(WinUI SelectionMode),默认 Single。 */
    selectionMode?: GridViewSelectionMode
    /** 是否点击即触发 itemClick(WinUI IsItemClickEnabled)。 */
    isItemClickEnabled?: boolean
    /** 对象项的显示字段路径(WinUI DisplayMemberPath),缺省按 String(item) 渲染。 */
    displayMemberPath?: string
    /** 单元格宽 px(WinUI ItemWidth;缺省按容器宽均分换行)。 */
    itemWidth?: number
    /** 单元格高 px(WinUI ItemHeight;缺省由内容决定)。 */
    itemHeight?: number
    /** 换行前每行(纵向流为每列)最多项数(WinUI MaximumRowsOrColumns;0 = 不限)。 */
    maximumRowsOrColumns?: number
    /** 换行方向(WinUI ItemsWrapGrid.Orientation;Vertical 为列优先流)。 */
    orientation?: 'Horizontal' | 'Vertical'
    /** 控件内边距(WinUI Padding,XAML Thickness:左,上,右,下)。 */
    padding?: string
    /** 项外边距(WinUI ItemContainerStyle Margin,透传给 GridViewItem)。 */
    itemMargin?: string
    /** 是否启用选择勾选标记(透传 GridViewItem)。 */
    selectionCheckMarkVisualEnabled?: boolean
    /** 是否显示 reveal 揭示边框(透传 GridViewItem,悬浮 1px 跟随指针光环)。 */
    revealBorder?: boolean
    /** 禁用整个控件(项进入 Disabled 视觉状态且不可交互)。 */
    disabled?: boolean
  }>(),
  {
    items: () => [],
    selectionMode: 'Single',
    isItemClickEnabled: false,
    displayMemberPath: '',
    itemWidth: undefined,
    itemHeight: undefined,
    maximumRowsOrColumns: 0,
    orientation: 'Horizontal',
    padding: '0,0,0,10',
    itemMargin: '0,0,4,4',
    selectionCheckMarkVisualEnabled: true,
    revealBorder: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 选中集合变化时触发(点击、键盘、程序化赋值均触发):当前选中项数组、本次新增、
   *  本次移除 —— added/removed 对照 WinUI SelectionChangedEventArgs 的 AddedItems/RemovedItems;
   *  签名与 ListView 同约定(selectionChanged(selected, added, removed))。 */
  selectionChanged: [selected: unknown[], added: unknown[], removed: unknown[]]
  /** 点击项时触发,需 isItemClickEnabled(WinUI ItemClick)。 */
  itemClick: [event: { item: unknown; index: number; event: MouseEvent }]
  // 注:update:selectedIndex / update:selectedItem / update:selectedItems 由下方 defineModel 提供。
}>()

// —— 双向模型(与 ComboBox/ListView 同约定:camelCase 属性 + kebab-case v-model)——
const selectedIndex = defineModel<number>('selectedIndex', { default: -1 })
// defineModel<unknown> 不收字面量 default(与 ComboBox 同款处理):初始 undefined 与「未选 null」同义。
const selectedItem = defineModel<unknown>('selectedItem')
const selectedItems = defineModel<unknown[]>('selectedItems', { default: () => [] })

// —— 选择核心(内联;T5.0 useSelection 落地后可整体替换本段)——
/** 内部唯一事实:选中索引集合(升序)。 */
const selectedIndexes = ref<number[]>([])
const selectedSet = computed(() => new Set(selectedIndexes.value))
/** Extend 模式的选区锚点(WinUI AnchorIndex 近似)。 */
const anchor = ref(-1)
/** 程序化写模型期间抑制回环 watcher。 */
let applying = false

function isSelected(index: number): boolean {
  return selectedSet.value.has(index)
}

/** 由项引用反查索引(严格相等,与 WinUI 引用语义一致)。 */
function indexesFromItems(list: unknown[]): number[] {
  const result: number[] = []
  props.items.forEach((item, index) => {
    if (list.includes(item)) result.push(index)
  })
  return result
}

/** 应用选中集合:同步三个模型并发出 selectionChanged(added/removed 差量)。 */
function applySelection(next: number[], emitEvent: boolean): void {
  const prev = selectedIndexes.value
  const sameSize = prev.length === next.length
  const same = sameSize && prev.every((value, i) => value === next[i])
  if (same) return

  const prevItems = prev.map((index) => props.items[index]).filter((item) => item !== undefined)
  const nextItems = next.map((index) => props.items[index]).filter((item) => item !== undefined)
  const first = next.length > 0 ? next[0] : -1

  selectedIndexes.value = next
  applying = true
  selectedItems.value = nextItems
  selectedIndex.value = first
  selectedItem.value = first >= 0 ? (props.items[first] ?? null) : null
  applying = false

  if (emitEvent) {
    emit(
      'selectionChanged',
      nextItems,
      nextItems.filter((item) => !prevItems.includes(item)),
      prevItems.filter((item) => !nextItems.includes(item)),
    )
  }
}

// 外部写 selectedItems → 反查索引同步内部状态(immediate 不发事件,对齐 WinUI 初始赋值)。
watch(
  selectedItems,
  (value) => {
    if (applying) return
    if (props.selectionMode === 'None') return
    applySelection(indexesFromItems(Array.isArray(value) ? value : []), false)
  },
  { immediate: true },
)

// 外部写 selectedIndex → 单选语义同步(多选场景以最后写入者为准)。
watch(
  selectedIndex,
  (value) => {
    if (applying) return
    if (props.selectionMode === 'None') return
    const index = typeof value === 'number' && value >= 0 ? value : -1
    applySelection(index >= 0 && index < props.items.length ? [index] : [], false)
  },
  { immediate: true },
)

// 数据源变化:剔除越界选中;模式切换:None 清空、Single 收敛为首项。
watch(
  () => props.items,
  () => {
    const valid = selectedIndexes.value.filter((index) => index < props.items.length)
    if (valid.length !== selectedIndexes.value.length) applySelection(valid, true)
  },
)
watch(
  () => props.selectionMode,
  (mode) => {
    const current = selectedIndexes.value
    if (mode === 'None') applySelection([], true)
    else if (mode === 'Single' && current.length > 1) applySelection([current[0]], true)
  },
)

// —— 交互:点击选择 + ItemClick ——
function onItemPointer(index: number, item: unknown, event: MouseEvent): void {
  if (props.disabled) return
  // 锚点(anchor)不得在分支前更新:Extended 的 Shift 区间选择依赖「上一次非 Shift
  // 点击留下的锚点」(WinUI AnchorIndex 语义),分支后再按 !event.shiftKey 更新。
  focusedIndex.value = index

  const mode = props.selectionMode
  if (mode !== 'None') {
    const current = selectedIndexes.value
    let next: number[]
    if (mode === 'Multiple') {
      next = current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index].sort((a, b) => a - b)
    } else if (mode === 'Single') {
      // Ctrl+单击已选项 = 取消选择(WinUI Single 模式行为)
      next = event.ctrlKey && current.includes(index) ? [] : [index]
    } else {
      // Extended:Shift 范围选择 / Ctrl 切换 / 普通单击重置为单选
      if (event.shiftKey && anchor.value >= 0 && current.length > 0) {
        const lo = Math.min(anchor.value, index)
        const hi = Math.max(anchor.value, index)
        next = Array.from({ length: hi - lo + 1 }, (_, offset) => lo + offset)
      } else if (event.ctrlKey) {
        next = current.includes(index)
          ? current.filter((value) => value !== index)
          : [...current, index].sort((a, b) => a - b)
      } else {
        next = [index]
      }
    }
    if (!event.shiftKey) anchor.value = index
    applySelection(next, true)
  }

  if (props.isItemClickEnabled) {
    emit('itemClick', { item, index, event })
  }
}

// —— 键盘:几何导航 + 选择(与 WinUI ListViewBase 对齐)——
const focusedIndex = ref(0)

function itemEls(): HTMLElement[] {
  return Array.from(root.value?.querySelectorAll<HTMLElement>('[data-wui-grid-index]') ?? [])
}

function focusItem(index: number): void {
  const els = itemEls()
  if (index < 0 || index >= els.length) return
  focusedIndex.value = index
  void nextTick(() => els[index]?.focus())
}

/** 按视觉几何选「方向上最近」的项(依赖单元格实际位置,适配任意列数)。 */
function moveFocusGeometry(from: number, dir: 'left' | 'right' | 'up' | 'down'): number {
  const els = itemEls()
  if (from < 0 || from >= els.length) return -1
  const base = els[from].getBoundingClientRect()
  const cx = base.left + base.width / 2
  const cy = base.top + base.height / 2
  let best = -1
  let bestScore = Number.POSITIVE_INFINITY
  for (let i = 0; i < els.length; i += 1) {
    if (i === from) continue
    const rect = els[i].getBoundingClientRect()
    const dx = rect.left + rect.width / 2 - cx
    const dy = rect.top + rect.height / 2 - cy
    let ok: boolean
    let primary: number
    let secondary: number
    if (dir === 'left') {
      ok = dx < -1
      primary = -dx
      secondary = Math.abs(dy)
    } else if (dir === 'right') {
      ok = dx > 1
      primary = dx
      secondary = Math.abs(dy)
    } else if (dir === 'up') {
      ok = dy < -1
      primary = -dy
      secondary = Math.abs(dx)
    } else {
      ok = dy > 1
      primary = dy
      secondary = Math.abs(dx)
    }
    if (ok) {
      const score = primary + secondary * 8
      if (score < bestScore) {
        bestScore = score
        best = i
      }
    }
  }
  return best
}

function onKeyDown(event: KeyboardEvent): void {
  if (props.disabled) return
  const key = event.key
  const els = itemEls()
  if (els.length === 0) return

  const target = event.target as HTMLElement
  const currentEl = target.closest('[data-wui-grid-index]') as HTMLElement | null
  const current = currentEl ? Number(currentEl.dataset.wuiGridIndex) : -1

  // 方向键:移动焦点;Single 模式随动选择(WinUI 行为)
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
    const dir = key === 'ArrowLeft' ? 'left' : key === 'ArrowRight' ? 'right' : key === 'ArrowUp' ? 'up' : 'down'
    const next = moveFocusGeometry(current, dir)
    if (next >= 0) {
      event.preventDefault()
      focusItem(next)
      if (props.selectionMode === 'Single') applySelection([next], true)
    }
    return
  }

  if (key === 'Home' || key === 'End') {
    event.preventDefault()
    const next = key === 'Home' ? 0 : els.length - 1
    focusItem(next)
    if (props.selectionMode === 'Single') applySelection([next], true)
    return
  }

  if ((key === ' ' || key === 'Enter') && current >= 0 && props.selectionMode !== 'None') {
    event.preventDefault()
    onItemPointer(current, props.items[current], event as unknown as MouseEvent)
    return
  }

  if (key === 'a' && event.ctrlKey && props.selectionMode === 'Extended') {
    event.preventDefault()
    applySelection(props.items.map((_, index) => index), true)
  }
}

// Tab 进入 / 点击聚焦时同步 roving tabindex 锚点。
function onFocusIn(event: FocusEvent): void {
  const el = (event.target as HTMLElement).closest('[data-wui-grid-index]') as HTMLElement | null
  if (el) {
    const index = Number(el.dataset.wuiGridIndex)
    if (Number.isFinite(index)) focusedIndex.value = index
  }
}

// —— 布局:UniformGridLayout / ItemsWrapGrid → CSS Grid ——
/** XAML Thickness(左,上,右,下)→ CSS padding(上 右 下 左)。 */
const paddingCss = computed(() => {
  const parts = props.padding
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
  if (parts.length === 0) return '0'
  const toPx = (value: string): string => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? `${parsed}px` : value
  }
  const l = toPx(parts[0])
  const t = toPx(parts[1] ?? parts[0])
  const r = toPx(parts[2] ?? parts[0])
  const b = toPx(parts[3] ?? (parts[1] ?? parts[0]))
  return `${t} ${r} ${b} ${l}`
})

/** GridViewItemMinWidth/MinHeight = 44(generic.xaml L109-110):无 ItemHeight 时行高下限。 */
const ITEM_MIN_SIZE = 44

const layoutStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  const cellW = props.itemWidth && props.itemWidth > 0 ? `${Math.round(props.itemWidth)}px` : ''
  const cellH = props.itemHeight && props.itemHeight > 0 ? `${Math.round(props.itemHeight)}px` : ''
  const maxCols = props.maximumRowsOrColumns > 0 ? Math.round(props.maximumRowsOrColumns) : 0

  if (props.orientation === 'Vertical') {
    // 列优先流:MaximumRowsOrColumns 约束每列项数(容器需有界高度,横向滚动)
    style['grid-auto-flow'] = 'column'
    const rows = maxCols > 0 ? maxCols : 1
    style['grid-template-rows'] = cellH
      ? `repeat(${rows}, ${cellH})`
      : `repeat(${rows}, minmax(0px, max-content))`
    style['grid-auto-columns'] = cellW || 'max-content'
  } else if (cellW) {
    style['grid-template-columns'] =
      maxCols > 0
        ? `repeat(${maxCols}, ${cellW})`
        : `repeat(auto-fill, minmax(${cellW}, ${cellW}))`
    // auto-fill 需要「可用宽」才能解出多轨;无 ItemHeight 时行高下限取 GridViewItemMinHeight
    // (ItemsWrapGrid 的单元格统一高度近似,差异见 wiki)
    style['grid-auto-rows'] = cellH || `minmax(${ITEM_MIN_SIZE}px, auto)`
  } else if (maxCols > 0) {
    style['grid-template-columns'] = `repeat(${maxCols}, minmax(0px, 1fr))`
    style['grid-auto-rows'] = cellH || `minmax(${ITEM_MIN_SIZE}px, auto)`
  } else {
    // 无定格:按 160px 基准均分换行(近似 ItemsWrapGrid 按内容宽换行,差异见 wiki)
    style['grid-template-columns'] = 'repeat(auto-fill, minmax(160px, 1fr))'
    style['grid-auto-rows'] = cellH || `minmax(${ITEM_MIN_SIZE}px, auto)`
  }
  return style
})

// —— 渲染辅助 ——
function displayText(item: unknown): string {
  if (props.displayMemberPath && item !== null && typeof item === 'object') {
    const value = (item as Record<string, unknown>)[props.displayMemberPath]
    if (value !== undefined) return String(value)
  }
  return String(item)
}

const isMultiSelectMode = computed(
  () => props.selectionMode === 'Multiple' || props.selectionMode === 'Extended',
)

const root = ref<HTMLElement | null>(null)
</script>

<template>
  <div
    ref="root"
    class="wui-grid-view"
    :class="{ 'is-disabled': disabled, 'flow-vertical': orientation === 'Vertical' }"
    role="listbox"
    :aria-multiselectable="isMultiSelectMode ? 'true' : undefined"
    :aria-disabled="disabled || undefined"
    v-bind="$attrs"
    @keydown="onKeyDown"
    @focusin="onFocusIn"
  >
    <div class="items-host" :style="{ ...layoutStyle, padding: paddingCss }">
      <WuiGridViewItem
        v-for="(item, index) in items"
        :key="index"
        :selected="isSelected(index)"
        :disabled="disabled"
        :selection-check-mark-visual-enabled="selectionCheckMarkVisualEnabled"
        :multi-select-halo="selectionMode === 'Multiple'"
        :enable-reveal="revealBorder"
        :margin="itemMargin"
        :tabindex="index === focusedIndex ? 0 : -1"
        :data-wui-grid-index="index"
        @click="onItemPointer(index, item, $event)"
      >
        <slot name="item" :item="item" :index="index" :selected="isSelected(index)">
          {{ displayText(item) }}
        </slot>
      </WuiGridViewItem>
    </div>
  </div>
</template>

<style scoped>
/* 模板:Border > ScrollViewer(纵向滚动、横向禁用)> ItemsPresenter */
.wui-grid-view {
  position: relative;
  box-sizing: border-box;
  /* FrameworkElement 默认 HorizontalAlignment=Stretch:GridView 铺满父级可用宽,再由
     ItemsWrapGrid(auto-fill)按可用宽填行换行。显式 width:100% 以免作为 flex 项落入
     align-items:flex-start 的列容器时收缩为 fit-content —— 此时 auto-fill 在不定宽下
     会退化为 1 轨(整个网格压成单列),与源「横向填满换行」不符。 */
  width: 100%;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: inherit;
}

/* ItemsWrapGrid Orientation=Vertical:列优先流 → 横向滚动 */
.wui-grid-view.flow-vertical {
  overflow-y: hidden;
  overflow-x: auto;
}

.items-host {
  display: grid;
  align-content: start;
  justify-content: start;
  min-width: fit-content;
}

.wui-grid-view.is-disabled {
  cursor: default;
}
</style>
