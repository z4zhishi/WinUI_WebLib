<script setup lang="ts">
// TreeView —— WinUI TreeView 的 Web 复刻:带展开/收起的分层列表(hierarchical list pattern)。
// 结构与行为规格:CK/WinUI-Reference/controls/dev/TreeView/TreeView.xaml(DefaultTreeViewStyle:
//   IsTabStop=false 的外壳 + 内部 TreeViewList)与 TreeViewItem.xaml(行模板,见 TreeViewItem.vue);
//   键盘与多选语义对照 WinUI TreeView/TreeViewList/ViewModel:
//   - SelectionMode = None/Single/Multiple(Multiple 显示复选框,单击行/复选框切换选中);
//   - Multiple 为三态:选中 / 半选(indeterminate) / 未选。选中或取消一个节点会级联其整棵
//     子树,父节点状态由子级自底向上聚合 —— 子级全选则父选中、部分选中则父半选
//     (TreeViewItem.cpp L480-491 UpdateMultipleSelection,PartialSelected → IsChecked(nullptr);
//      ViewModel.cpp L836-866 SelectionStateBasedOnChildren);
//   - Single 选中行带 3x16 强调色指示条(SelectedItem 的 SelectionIndicator,hover/按压隐藏);
//   - ItemInvoked:用户与条目交互(单击/Enter)时触发,与选中与否无关。
// 键盘(ARIA tree pattern + WinUI 语义):↑/↓ 移动、→ 展开(已展开进子级)、← 收起(已收起回父级)、
//   Space 选中(Multiple 切换 / Single 选中,Ctrl+Space 切换)、Enter 调用、Home/End 首尾。
// 无障碍:role=tree/treeitem/group、aria-expanded/aria-selected/aria-level/aria-multiselectable、
//   roving tabindex(可见项内循环)。
// 动画:子级 0fr/1fr 高度过渡(展开 slow+standard / 收起 fast+accelerate,同 Expander 方案)、
//   字形旋转 duration-normal+standard;缩进引导线(showIndentGuides)为 Web 扩展(源无)。
import { computed, onMounted, provide, ref, useAttrs, watch } from 'vue'
import {
  wuiTreeViewContextKey,
  type TreeViewContext,
  type TreeViewNode,
} from './TreeViewItem.vue'
import TreeViewItem from './TreeViewItem.vue'
import '../styles/animations.css'

defineOptions({ name: 'WuiTreeView', inheritAttrs: false })

/** WinUI TreeView SelectionMode 枚举。 */
type TreeSelectionMode = 'None' | 'Single' | 'Multiple'

/** 节点选择态(WinUI TreeNodeSelectionState:Selected/PartialSelected/UnSelected)。 */
type TreeSelectionState = 'selected' | 'partial' | 'unselected'

const props = withDefaults(
  defineProps<{
    /** 嵌套节点数组:{label, children, expanded?, ...};泛型对象配合 childrenPath/labelPath。 */
    itemsSource?: TreeViewNode[]
    /** 选择模式(WinUI SelectionMode):None 不可选,Single 单选(带指示条),Multiple 多选(复选框)。 */
    selectionMode?: TreeSelectionMode
    /** 子节点字段名(泛型数据用),支持点路径(如 'items'、'meta.children')。 */
    childrenPath?: string
    /** 标签字段名(泛型数据用),支持点路径;缺省 'label'。 */
    labelPath?: string
    /** 缩进引导线(Web 扩展,源无):每层 16px 槽位中绘 1px 竖线。 */
    showIndentGuides?: boolean
    /** 禁用整棵树(各节点不可交互,呈禁用配色)。 */
    disabled?: boolean
  }>(),
  {
    itemsSource: () => [],
    selectionMode: 'Single',
    childrenPath: 'children',
    labelPath: 'label',
    showIndentGuides: false,
    disabled: false,
  },
)

// —— 展开键集(WinUI TreeViewNode.IsExpanded 的集中式管理;键 = id ?? 路径索引)——
const expandedIds = defineModel<string[]>('expandedIds', { default: () => [] })
// —— 选中键集(Single 至多 1 项,Multiple 任意)——
const selectedIds = defineModel<string[]>('selectedIds', {
  default: () => [],
})

const emit = defineEmits<{
  /** 条目被调用(单击 / Enter;WinUI ItemInvoked)。 */
  itemInvoked: [node: TreeViewNode, key: string]
  /** 选中键集变化(用户交互触发)。 */
  selectionChanged: [keys: string[]]
}>()

// —— 数据解析 ——
function getByPath(node: TreeViewNode, path: string): unknown {
  let current: unknown = node
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function childrenOf(node: TreeViewNode): TreeViewNode[] {
  const children = getByPath(node, props.childrenPath)
  return Array.isArray(children) ? (children as TreeViewNode[]) : []
}

function labelOf(node: TreeViewNode): string {
  const label = getByPath(node, props.labelPath)
  return label === undefined || label === null ? '' : String(label)
}

function hasChildren(node: TreeViewNode): boolean {
  return childrenOf(node).length > 0
}

/** 键 = 显式 id ?? 路径索引(同层序号);路径索引形如 "0.1.2"。 */
function keyFor(parentKey: string, index: number, node: TreeViewNode): string {
  if (node.id !== undefined && node.id !== null) return String(node.id)
  return parentKey === '' ? String(index) : `${parentKey}.${index}`
}

// 全量节点键映射:键盘/事件按键取节点(含未展开层)。
const nodeMap = computed(() => {
  const map = new Map<string, TreeViewNode>()
  const walk = (nodes: TreeViewNode[], parentKey: string): void => {
    nodes.forEach((node, index) => {
      const key = keyFor(parentKey, index, node)
      map.set(key, node)
      const children = childrenOf(node)
      if (children.length > 0) walk(children, key)
    })
  }
  walk(props.itemsSource, '')
  return map
})

// 可见键序(按展开状态展平),用于焦点维护。
const visibleKeys = computed(() => {
  const keys: string[] = []
  const walk = (nodes: TreeViewNode[], parentKey: string): void => {
    nodes.forEach((node, index) => {
      const key = keyFor(parentKey, index, node)
      keys.push(key)
      if (isExpanded(key)) {
        const children = childrenOf(node)
        if (children.length > 0) walk(children, key)
      }
    })
  }
  walk(props.itemsSource, '')
  return keys
})

// —— 展开状态 ——
const expandedSet = computed(() => new Set(expandedIds.value))
function isExpanded(key: string): boolean {
  return expandedSet.value.has(key)
}

// node.expanded 仅作初始种子;用户操作过的键不再回填(seeded/acted 双集合)。
const seededKeys = new Set<string>()
const actedKeys = new Set<string>()

function seedExpanded(): void {
  const additions: string[] = []
  const walk = (nodes: TreeViewNode[], parentKey: string): void => {
    nodes.forEach((node, index) => {
      const key = keyFor(parentKey, index, node)
      if (node.expanded === true && !seededKeys.has(key) && !actedKeys.has(key)) {
        seededKeys.add(key)
        if (!expandedSet.value.has(key)) additions.push(key)
      }
      const children = childrenOf(node)
      if (children.length > 0) walk(children, key)
    })
  }
  walk(props.itemsSource, '')
  if (additions.length > 0) expandedIds.value = [...expandedIds.value, ...additions]
}

watch(
  () => props.itemsSource,
  () => seedExpanded(),
  { immediate: true },
)

function toggleExpand(key: string, node: TreeViewNode): void {
  if (props.disabled || node.disabled === true) return
  actedKeys.add(key)
  const next = new Set(expandedIds.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedIds.value = [...next]
}

/** 展开所有含子节点的项 / 收起全部(expose 给调用方与示例页)。 */
function expandAll(): void {
  expandedIds.value = [...nodeMap.value.keys()].filter((key) => {
    const node = nodeMap.value.get(key)
    return node !== undefined && hasChildren(node)
  })
  expandedIds.value.forEach((key) => actedKeys.add(key))
}

function collapseAll(): void {
  if (expandedIds.value.length === 0) return
  // 记录用户/程序操作过的键,避免后续 itemsSource 变化时按 node.expanded 回填。
  for (const key of expandedIds.value) actedKeys.add(key)
  expandedIds.value = []
}

// —— 选择状态(三态 + 父子级联)——
// selectedIds 只保存「完全选中」的键(= WinUI ViewModel 的 m_selectedNodes:半选父节点不入
// 集合,参见 ViewModel.cpp UpdateNodeSelection 的 PartialSelected 分支);「半选」由后代状态
// 自底向上派生,不写入模型 —— 与 TreeViewNode::SelectionState 的递归推导同构。
const selectedSet = computed(() => new Set(selectedIds.value))

/** 键 → 直接子键(键规则与 TreeViewItem 递归一致:keyFor(parentKey, index, child))。 */
const childrenKeysMap = computed(() => {
  const map = new Map<string, string[]>()
  const walk = (nodes: TreeViewNode[], parentKey: string): void => {
    const keys = nodes.map((node, index) => keyFor(parentKey, index, node))
    map.set(parentKey, keys)
    nodes.forEach((node, index) => {
      const key = keys[index]
      const children = childrenOf(node)
      if (children.length > 0) walk(children, key)
      else map.set(key, [])
    })
  }
  walk(props.itemsSource, '')
  return map
})

/** 每键的三态:自底向上聚合(ViewModel.cpp SelectionStateBasedOnChildren L836-866)。 */
const selectionStates = computed(() => {
  const states = new Map<string, TreeSelectionState>()
  const visit = (key: string): TreeSelectionState => {
    const cached = states.get(key)
    if (cached !== undefined) return cached
    let hasSelected = false
    let hasPartial = false
    let hasUnselected = false
    for (const child of childrenKeysMap.value.get(key) ?? []) {
      const childState = visit(child)
      if (childState === 'selected') hasSelected = true
      else if (childState === 'partial') hasPartial = true
      else hasUnselected = true
    }
    // 任一子级半选,或子级同时存在已选与未选 → 半选;否则有子级已选 → 已选(无子级 → 未选)。
    let state: TreeSelectionState
    if (hasPartial || (hasSelected && hasUnselected)) state = 'partial'
    else if (hasSelected) state = 'selected'
    else state = 'unselected'
    // 自身在选中集合内 → 已选(源中 SelectNode 会把整棵子树置 Selected;外部直接写入
    // selectedIds 时以显式集合为准,与派生结果一致)。
    if (selectedSet.value.has(key)) state = 'selected'
    states.set(key, state)
    return state
  }
  for (const key of childrenKeysMap.value.get('') ?? []) visit(key)
  return states
})

function isSelected(key: string): boolean {
  return selectedSet.value.has(key)
}

/** 半选(indeterminate):未完全选中,但有后代处于已选/半选。 */
function isPartial(key: string): boolean {
  return selectionStates.value.get(key) === 'partial'
}

function commitSelected(next: string[]): void {
  selectedIds.value = next
  emit('selectionChanged', next)
}

/** 子树键(含自身),用于级联选中 / 取消。 */
function subtreeKeys(key: string): string[] {
  const keys: string[] = [key]
  const stack: string[] = [...(childrenKeysMap.value.get(key) ?? [])]
  while (stack.length > 0) {
    const child = stack.pop() as string
    keys.push(child)
    stack.push(...(childrenKeysMap.value.get(child) ?? []))
  }
  return keys
}

/**
 * Multiple 模式:切换整棵子树(TreeViewItem::ToggleSelection + ViewModel::UpdateSelection)。
 * 半选节点不算「已选」(源 CheckBoxSelectionState 只把 true 视为 Selected),故点击后转为
 * 全选并级联子树;父节点状态随后由 selectionStates 向上聚合,无需手工回写。
 */
function toggleSubtree(key: string): void {
  const selectSubtree = !selectedSet.value.has(key)
  const next = new Set(selectedIds.value)
  for (const descendant of subtreeKeys(key)) {
    if (selectSubtree) next.add(descendant)
    else next.delete(descendant)
  }
  // 过滤已不存在的键(数据源变化后残留的旧键),保持声明顺序。
  commitSelected([...next].filter((item) => nodeMap.value.has(item)))
}

/** 行点击:Single = 替换(Ctrl/⌘ 点击可反选);Multiple = 整行开关并级联子树。 */
function selectByRow(key: string, additive: boolean): void {
  if (props.selectionMode === 'None') return
  if (props.selectionMode === 'Multiple') {
    toggleSubtree(key)
    return
  }
  if (additive) {
    commitSelected(isSelected(key) ? selectedIds.value.filter((k) => k !== key) : [key])
  } else if (!isSelected(key)) {
    commitSelected([key])
  }
}

/** 键盘 Space:Multiple 切换;Single 选中(Ctrl+Space 反选,同 WinUI Ctrl+Space 语义)。 */
function selectByKeyboard(key: string, additive: boolean): void {
  selectByRow(key, additive)
}

// Single 模式下选中集至多 1 项(模式切换时裁剪)。
watch(
  () => props.selectionMode,
  (mode) => {
    if (mode === 'Single' && selectedIds.value.length > 1) {
      selectedIds.value = selectedIds.value.slice(0, 1)
    }
  },
)

// —— 事件 ——
function invoke(node: TreeViewNode, key: string): void {
  if (props.disabled || node.disabled === true) return
  emit('itemInvoked', node, key)
}

// —— 键盘导航(roving tabindex;按「可见键序列」驱动)——
// 收起子树的子级行仍常驻 DOM(visibility:hidden 不可聚焦),故移动不能用 DOM 遍历:
// 以 visibleKeys(按展开状态过滤后的扁平可见列表)为准定位上/下一个条目,展开 / 收起时
// visibleKeys 为 computed 自动重建。
const rootRef = ref<HTMLElement | null>(null)
const focusedKey = ref<string | null>(null)

watch(
  visibleKeys,
  (keys) => {
    if (!keys.includes(focusedKey.value ?? '')) focusedKey.value = keys[0] ?? null
  },
  { immediate: true },
)

function focusItem(key: string): void {
  focusedKey.value = key
}

function rowElementOf(key: string): HTMLElement | null {
  const rows = rootRef.value?.querySelectorAll<HTMLElement>('[role="treeitem"]')
  if (!rows) return null
  for (const row of rows) {
    if (row.dataset.key === key) return row
  }
  return null
}

function parentRowOf(row: HTMLElement): HTMLElement | null {
  const wrapper = row.closest('[data-wui-tree-item]')
  const parentWrapper = wrapper?.parentElement?.closest('[data-wui-tree-item]')
  return parentWrapper?.querySelector<HTMLElement>(':scope > [role="treeitem"]') ?? null
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const target = event.target as HTMLElement | null
  const row = target?.closest?.('[role="treeitem"]') as HTMLElement | null
  if (!row) return
  const key = row.dataset.key
  if (key === undefined) return
  const node = nodeMap.value.get(key)
  const expandable = node !== undefined && hasChildren(node)

  // 可见键序列与当前条目位置(收起子树的子级不在序列内)。
  const visible = visibleKeys.value
  const currentIndex = visible.indexOf(key)
  const focusVisibleAt = (index: number): void => {
    const targetKey = visible[index]
    if (targetKey === undefined) return
    rowElementOf(targetKey)?.focus()
  }

  switch (event.key) {
    case 'ArrowDown':
      focusVisibleAt(currentIndex + 1)
      event.preventDefault()
      break
    case 'ArrowUp':
      focusVisibleAt(currentIndex - 1)
      event.preventDefault()
      break
    case 'Home':
      focusVisibleAt(0)
      event.preventDefault()
      break
    case 'End':
      focusVisibleAt(visible.length - 1)
      event.preventDefault()
      break
    case 'ArrowRight':
      if (expandable && !isExpanded(key)) {
        toggleExpand(key, node as TreeViewNode)
      } else {
        // 已展开进首个子级;叶子(端点节点)移到下一个可见项(ARIA APG end-of-branch 语义)。
        focusVisibleAt(currentIndex + 1)
      }
      event.preventDefault()
      break
    case 'ArrowLeft':
      if (expandable && isExpanded(key)) {
        toggleExpand(key, node as TreeViewNode)
      } else {
        parentRowOf(row)?.focus()
      }
      event.preventDefault()
      break
    case ' ':
      event.preventDefault()
      // 禁用节点不响应选择(WinUI 禁用项不参与选择)。
      if (props.selectionMode !== 'None' && node?.disabled !== true) {
        selectByKeyboard(key, event.ctrlKey || event.metaKey)
      }
      break
    case 'Enter':
      if (node !== undefined) invoke(node, key)
      break
    default:
      break
  }
}

// —— 上下文下发 ——
const context: TreeViewContext = {
  selectionMode: computed(() => props.selectionMode),
  disabled: computed(() => props.disabled),
  showIndentGuides: computed(() => props.showIndentGuides),
  focusedKey,
  keyFor,
  labelOf,
  childrenOf,
  hasChildren,
  isSelected,
  isPartial,
  isExpanded,
  selectByRow,
  selectByKeyboard,
  toggleExpand,
  invoke,
  focusItem,
}
provide(wuiTreeViewContextKey, context)

onMounted(() => {
  seedExpanded()
})

// —— $attrs 透传(单根控件,inheritAttrs:false)——
const attrs = useAttrs()

defineExpose({
  /** 展开全部(含子节点的项)。 */
  expandAll,
  /** 收起全部。 */
  collapseAll,
})
</script>

<template>
  <div
    v-bind="attrs"
    ref="rootRef"
    class="wui-treeview"
    role="tree"
    :aria-multiselectable="selectionMode === 'Multiple' || undefined"
    :aria-disabled="disabled || undefined"
    @keydown="onKeydown"
  >
    <TreeViewItem
      v-for="(node, index) in itemsSource"
      :key="keyFor('', index, node)"
      :node="node"
      :depth="0"
      :item-key="keyFor('', index, node)"
    >
      <template #item="slotProps">
        <slot name="item" v-bind="slotProps" />
      </template>
    </TreeViewItem>
  </div>
</template>

<style scoped>
/* 外壳(DefaultTreeViewStyle:TreeView IsTabStop=false,模板仅一个 TreeViewList) */
.wui-treeview {
  display: block;
  font-family: inherit; /* XamlAutoFontFamily 占位,回退浏览器默认 */
}

.wui-treeview[aria-disabled='true'] {
  cursor: default;
}
</style>
