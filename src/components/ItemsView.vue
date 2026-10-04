<script setup lang="ts">
// WuiItemsView —— WinUI 3 ItemsView 的 Web 复刻:以可换布局(Stack / UniformGrid)呈现
// 集合并支持选择 / 调用 / 空态。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 无 ItemsView 段
//   (ItemsView 是 WinUI 3 控件,该快照为 WinUI 2/dxaml 源);项容器视觉在
//   ItemContainer.vue 内逐键对照 CK/WinUI-Reference/controls/dev/ItemContainer/(ItemContainer.xaml
//   + ItemContainer_themeresources.xaml + CommonStyles)复刻(源值表见该组件头注与 wiki)。
// 结构:根(滚动容器,对照 ItemsView 模板的 ScrollView)> items-host(布局载体)>
//   逐项 WuiItemContainer。内容区 v-for 即「内容区接口」:待 ItemsRepeater.vue 落地后,
//   仅需把本段替换为其 slot 化承载(布局样式仍由 collectionLayouts 产出),其余不动。
// 布局承载:src/utils/collectionLayouts.ts 的 stackLayoutStyle / uniformGridLayoutStyle
//   (CSS 载体,非虚拟化);UniformGrid 每行/列项数依赖「根滚动容器视口」实测尺寸
//   (ResizeObserver + scrollbar-gutter: stable),对齐 WinUI「视口可用宽 → itemsPerLine」
//   语义;测根容器而非 items-host,排除布局输出对测宽的自污染(QA F1 修复)。
// 选择核心:src/composables/useSelection.ts(阶段 5 公共层)——
//   selectionMode(None/Single/Multiple/Extended)+ selectedItems 模型 + selectionChanged
//   (AddedItems/RemovedItems 语义);指针语义由 selection.handleClick 承担,
//   键盘(方向键 / Space / Ctrl+Space / Ctrl+A / Home / End)由本控件解释后调原语。
// 键盘与调用:方向键按几何位置移动焦点(Single 模式随动选择,多选模式 shift+方向键
//   扩展区间);Enter / 双击触发 itemInvoked(对照官方示例「Hit the Enter key,
//   double-click or double-tap an item to invoke it.」)。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import WuiItemContainer from './ItemContainer.vue'
import { useSelection } from '@/composables/useSelection'
import type { SelectionMode } from '@/composables/useSelection'
import { stackLayoutStyle, uniformGridLayoutStyle } from '@/utils/collectionLayouts'

/** 布局种类(WinUI ItemsView.Layout:StackLayout / UniformGridLayout;LinedFlowLayout 未复刻)。 */
type ItemsViewLayoutKind = 'Stack' | 'UniformGrid'

/** itemInvoked 事件参数(对照 WinUI ItemsViewItemInvokedEventArgs 的常用字段)。 */
export interface ItemsViewInvokedEventArgs {
  item: unknown
  index: number
  event: MouseEvent | KeyboardEvent
}

// class/style 等透传属性统一由根元素 v-bind="$attrs" 承接。
defineOptions({ name: 'WuiItemsView', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 数据源数组(WinUI ItemsSource),元素可为字符串/数字/对象。 */
    items?: unknown[]
    /** 选择模式(WinUI ItemsView.SelectionMode),默认 Single。 */
    selectionMode?: SelectionMode
    /** 布局种类(WinUI ItemsView.Layout),默认 Stack(纵向列表)。 */
    layout?: ItemsViewLayoutKind
    /**
     * 排列轴(WinUI Orientation):Stack 缺省 vertical(纵向列表);
     * UniformGrid 缺省 horizontal(条目沿 X 排、满行下折、纵向滚动)。
     */
    orientation?: 'vertical' | 'horizontal'
    /** Stack 布局:相邻项间距 px(WinUI StackLayout.Spacing,默认 0)。 */
    spacing?: number
    /** UniformGrid 布局:最小项宽 px(WinUI MinItemWidth;0 = 每行 1 项,WinUI 除零语义)。 */
    minItemWidth?: number
    /** UniformGrid 布局:最小项高 px(WinUI MinItemHeight)。 */
    minItemHeight?: number
    /** UniformGrid 布局:行间距下限 px(WinUI MinRowSpacing)。 */
    minRowSpacing?: number
    /** UniformGrid 布局:列间距下限 px(WinUI MinColumnSpacing)。 */
    minColumnSpacing?: number
    /** UniformGrid 布局:每行项数上限(WinUI MaximumRowsOrColumns;缺省不限)。 */
    maximumRowsOrColumns?: number
    /** 是否启用项调用(WinUI IsItemInvokedEnabled):Enter / 双击触发 itemInvoked。 */
    isItemInvokedEnabled?: boolean
    /** 对象项的显示字段路径(WinUI DisplayMemberPath),缺省按 String(item) 渲染。 */
    displayMemberPath?: string
    /** 禁用整个控件(项进入 Disabled 视觉状态且不可交互)。 */
    disabled?: boolean
  }>(),
  {
    items: () => [],
    selectionMode: 'Single',
    layout: 'Stack',
    orientation: undefined,
    spacing: 0,
    minItemWidth: undefined,
    minItemHeight: undefined,
    minRowSpacing: 0,
    minColumnSpacing: 0,
    maximumRowsOrColumns: undefined,
    isItemInvokedEnabled: false,
    displayMemberPath: '',
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 选中集合变化时触发(点击、键盘、程序化赋值均触发):当前选中项数组、本次新增、
   *  本次移除 —— added/removed 对照 WinUI ItemsViewSelectionChangedEventArgs。 */
  selectionChanged: [selected: unknown[], added: unknown[], removed: unknown[]]
  /** 项被调用时触发(Enter / 双击),需 isItemInvokedEnabled(WinUI ItemInvoked)。 */
  itemInvoked: [event: ItemsViewInvokedEventArgs]
  // 注:update:selectedItems 由下方 defineModel 提供。
}>()

// —— 双向模型(选中集合;WinUI ItemsView.SelectedItems 是只读列表,此处按站内约定开放双向)——
const selectedItemsModel = defineModel<unknown[]>('selectedItems', { default: () => [] })

// —— 选择核心(公共层 useSelection;比较键 = 条目引用,与 WinUI 引用语义一致)——
const selection = useSelection<unknown>({
  items: () => props.items,
  selectionMode: () => props.selectionMode,
})

const isMultiSelectMode = computed(
  () => props.selectionMode === 'Multiple' || props.selectionMode === 'Extended',
)

/** 成员级比较(引用相等;用于模型同步的收敛判定,防回环)。 */
function sameSelection(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value))
}

// 内部选择 → 写回模型 + 发 selectionChanged(added/removed 差量对照 WinUI 事件参数)。
let prevSelected: readonly unknown[] = selection.selectedItems.value
watch(selection.selectedKeys, () => {
  const current = selection.selectedItems.value
  const added = current.filter((item) => !prevSelected.includes(item))
  const removed = prevSelected.filter((item) => !current.includes(item))
  prevSelected = current
  selectedItemsModel.value = [...current]
  emit('selectionChanged', [...current], added, removed)
})

// 外部写 selectedItems 模型 → 整体替换内部选择(内容不变则收敛,不发事件)。
watch(
  selectedItemsModel,
  (value) => {
    const list = Array.isArray(value) ? value : []
    if (sameSelection(selection.selectedItems.value, list)) return
    selection.replaceSelection(list)
  },
  { immediate: true },
)

// —— 交互:点击选择(WinUI 模式语义由 handleClick 封装:ctrl 切换 / shift 区间)——
function onItemClick(index: number, _item: unknown, event: MouseEvent): void {
  if (props.disabled) return
  focusedIndex.value = index
  selection.handleClick(index, {
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey,
  })
}

// —— 项调用:双击 / Enter(对照官方示例文案;单击仍走选择)——
function onItemDoubleClicked(index: number, item: unknown, event: MouseEvent): void {
  invokeItem(index, item, event)
}

function invokeItem(index: number, item: unknown, event: MouseEvent | KeyboardEvent): void {
  if (props.disabled || !props.isItemInvokedEnabled) return
  emit('itemInvoked', { item, index, event })
}

// 点击空白区清空选择(WinUI ItemsView 行为;来自项内部的点击已在上抛处理前被 closest 排除)。
function onRootClick(event: MouseEvent): void {
  if (props.disabled) return
  const target = event.target as HTMLElement | null
  if (target && target.closest('[data-wui-index]')) return
  selection.clear()
}

// —— 键盘:几何导航 + 选择 / 调用(与 WinUI ItemsView 对齐)——
const focusedIndex = ref(0)

watch(
  () => props.items.length,
  (length) => {
    if (focusedIndex.value >= length) focusedIndex.value = 0
  },
)

function itemEls(): HTMLElement[] {
  return Array.from(root.value?.querySelectorAll<HTMLElement>('[data-wui-index]') ?? [])
}

function focusItem(index: number): void {
  const els = itemEls()
  if (index < 0 || index >= els.length) return
  focusedIndex.value = index
  els[index]?.focus()
}

/** 按视觉几何选「方向上最近」的项(依赖项实际位置,适配任意布局)。 */
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

/** 焦点移动后的选择随动:Single 随动;多选模式 shift 扩展区间(锚点不动);锚点跟焦。 */
function onNavigate(next: number, extend: boolean): void {
  const mode = props.selectionMode
  if (mode === 'None') {
    selection.anchorIndex.value = next
    return
  }
  if (extend && isMultiSelectMode.value) {
    const anchor = selection.anchorIndex.value
    if (anchor >= 0 && anchor !== next) selection.selectRange(anchor, next)
    else selection.toggle(next)
    return // WinUI:shift 扩展不改锚点(连续扩展)
  }
  selection.anchorIndex.value = next
  if (mode === 'Single') selection.select(next)
}

/** Space 选择:Single 选中;Multiple 切换;Extended 选中(Ctrl+Space 切换)。 */
function applySpaceSelection(index: number, ctrl: boolean): void {
  const mode = props.selectionMode
  if (mode === 'None') return
  if (mode === 'Multiple' || (mode === 'Extended' && ctrl)) selection.toggle(index)
  else selection.select(index)
  selection.anchorIndex.value = index
}

function onKeyDown(event: KeyboardEvent): void {
  if (props.disabled) return
  const key = event.key
  const els = itemEls()
  if (els.length === 0) return

  const target = event.target as HTMLElement
  const currentEl = target.closest('[data-wui-index]') as HTMLElement | null
  const current = currentEl ? Number(currentEl.dataset.wuiIndex) : -1

  // 方向键:移动焦点;Single 随动选择;多选模式 shift 扩展区间(WinUI 行为)
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
    const dir = key === 'ArrowLeft' ? 'left' : key === 'ArrowRight' ? 'right' : key === 'ArrowUp' ? 'up' : 'down'
    const next = moveFocusGeometry(current, dir)
    if (next >= 0) {
      event.preventDefault()
      focusItem(next)
      onNavigate(next, event.shiftKey)
    }
    return
  }

  if (key === 'Home' || key === 'End') {
    event.preventDefault()
    const next = key === 'Home' ? 0 : els.length - 1
    focusItem(next)
    onNavigate(next, false)
    return
  }

  if (key === 'Enter' && current >= 0) {
    event.preventDefault()
    invokeItem(current, props.items[current], event)
    return
  }

  if (key === ' ' && current >= 0 && props.selectionMode !== 'None') {
    event.preventDefault()
    applySpaceSelection(current, event.ctrlKey)
    return
  }

  if ((key === 'a' || key === 'A') && event.ctrlKey && isMultiSelectMode.value) {
    event.preventDefault()
    selection.selectAll()
  }
}

// Tab 进入 / 点击聚焦时同步 roving tabindex 锚点。
function onFocusIn(event: FocusEvent): void {
  const el = (event.target as HTMLElement).closest('[data-wui-index]') as HTMLElement | null
  if (el) {
    const index = Number(el.dataset.wuiIndex)
    if (Number.isFinite(index)) focusedIndex.value = index
  }
}

// —— 布局:Stack / UniformGrid → CSS 载体(collectionLayouts)——
/**
 * 根滚动容器(视口)实测尺寸(UniformGrid 每行/列项数依赖它):
 * 对齐 WinUI「视口可用尺寸 → itemsPerLine」语义 —— 测宽目标是外层真实容器
 * (宽度由父级约束决定),而非 items-host 本身;若测 host,固定 repeat(N) 轨道
 * 叠加 min-width: fit-content 会把「布局输出」反馈进「可用宽」,自锁成单行/
 * 满 max 列 + 横向滚动(fix round 1,QA F1)。
 */
const viewportSize = ref<{ width: number; height: number } | undefined>(undefined)
const root = ref<HTMLElement | null>(null)
let observer: ResizeObserver | undefined

onMounted(() => {
  const el = root.value
  if (!el) return
  // 挂载时同步取初值(消「无约束 → 单行」的首帧闪烁),Observer 后续增量维护。
  viewportSize.value = { width: el.clientWidth, height: el.clientHeight }
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (entry) {
      viewportSize.value = { width: entry.contentRect.width, height: entry.contentRect.height }
    }
  })
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = undefined
})

const layoutStyle = computed<Record<string, string>>(() => {
  if (props.layout === 'UniformGrid') {
    return uniformGridLayoutStyle(props.items.length, viewportSize.value, {
      orientation: props.orientation ?? 'horizontal',
      minItemWidth: props.minItemWidth ?? 0,
      minItemHeight: props.minItemHeight ?? 0,
      minRowSpacing: props.minRowSpacing,
      minColumnSpacing: props.minColumnSpacing,
      maximumRowsOrColumns: props.maximumRowsOrColumns !== undefined ? props.maximumRowsOrColumns : -1,
    })
  }
  return stackLayoutStyle({
    orientation: props.orientation ?? 'vertical',
    spacing: props.spacing,
  })
})

// —— 渲染辅助 ——
function displayText(item: unknown): string {
  if (props.displayMemberPath && item !== null && typeof item === 'object') {
    const value = (item as Record<string, unknown>)[props.displayMemberPath]
    if (value !== undefined) return String(value)
  }
  return String(item)
}
</script>

<template>
  <div
    ref="root"
    class="wui-items-view"
    :class="{ 'is-disabled': disabled, 'uniform-grid': layout === 'UniformGrid' }"
    role="listbox"
    :aria-multiselectable="isMultiSelectMode ? 'true' : undefined"
    :aria-disabled="disabled || undefined"
    v-bind="$attrs"
    @keydown="onKeyDown"
    @focusin="onFocusIn"
    @click="onRootClick"
  >
    <!-- 内容区接口:ItemsRepeater.vue 已由并行波次落地;本实现仍为内联承载,接入时仅需
         替换本段(items-host 内的 v-for),布局样式与选择层不变(见文件头注)。 -->
    <div v-show="items.length > 0" class="items-host" :style="layoutStyle">
      <WuiItemContainer
        v-for="(item, index) in items"
        :key="index"
        :selected="selection.isSelected(item)"
        :disabled="disabled"
        :multi-select="selectionMode === 'Multiple'"
        :tabindex="index === focusedIndex ? 0 : -1"
        :data-wui-index="index"
        @click="onItemClick(index, item, $event)"
        @dblclick="onItemDoubleClicked(index, item, $event)"
      >
        <slot name="item" :item="item" :index="index" :selected="selection.isSelected(item)">
          <span class="item-default-text">{{ displayText(item) }}</span>
        </slot>
      </WuiItemContainer>
    </div>
    <!-- 空态(WinUI EmptyContent;slot 缺省时无默认内容,与 WinUI 一致) -->
    <div v-if="items.length === 0" class="empty-host">
      <slot name="empty-content" />
    </div>
  </div>
</template>

<style scoped>
/* 模板:ItemsView 根(ScrollView 承载滚动)> items-host(布局载体) */
.wui-items-view {
  position: relative;
  box-sizing: border-box;
  overflow: auto;
  font-family: inherit;
}

/* UniformGrid:滚动条出现/消失会改变根容器测宽(内容高越过视口边界时 ±滚动条宽),
 * 叠加 itemsPerLine 随宽变化可造成折行震荡;常驻滚动条槽位使测宽稳定。
 * (WinUI 滚动条为 overlay 不占布局宽,此处对齐其语义;不支持的浏览器优雅降级。) */
.wui-items-view.uniform-grid {
  scrollbar-gutter: stable;
}

.items-host {
  min-width: fit-content;
}

.wui-items-view.is-disabled {
  cursor: default;
}

.item-default-text {
  display: block;
  overflow: hidden;
  /* 内容默认前景 = DefaultTextForegroundThemeBrush = TextFillColorPrimaryBrush
     (controls/dev/CommonStyles/Common_themeresources.xaml L14/L28/L42;
     ItemsView/ItemContainer 模板本身不设 Foreground,继承应用默认文本色) */
  color: var(--wui-text-fill-color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-host {
  box-sizing: border-box;
  padding: 12px;
  /* 空态为 Web 扩展:WinUI 3 ItemsView 无 EmptyContent 属性/默认视觉
     (ItemsView.idl 无该属性),故无权威键 → 保留 legacy token,不臆造(PL14 未决) */
  color: var(--wui-application-secondary-foreground-theme);
  font-size: var(--wui-control-content-theme-font-size);
}
</style>
