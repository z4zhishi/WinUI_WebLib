<script setup lang="ts">
// TreeView —— WinUI TreeView 的 Web 复刻:带展开/收起的分层列表(hierarchical list pattern)。
// 结构与行为规格:CK/WinUI-Reference/controls/dev/TreeView/TreeView.xaml(DefaultTreeViewStyle:
//   IsTabStop=false 的外壳 + 内部 TreeViewList)与 TreeViewItem.xaml(行模板,见 TreeViewItem.vue);
//   键盘与多选语义对照 WinUI TreeView/TreeViewList:
//   - SelectionMode = None/Single/Multiple(Multiple 整行即开关,单击切换选中);
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

// —— 选择状态 ——
const selectedSet = computed(() => new Set(selectedIds.value))
function isSelected(key: string): boolean {
  return selectedSet.value.has(key)
}

function commitSelected(next: string[]): void {
  selectedIds.value = next
  emit('selectionChanged', next)
}

/** 行点击:Single = 替换(Ctrl/⌘ 点击可反选);Multiple = 切换。 */
function selectByRow(key: string, additive: boolean): void {
  if (props.selectionMode === 'None') return
  if (props.selectionMode === 'Multiple') {
    commitSelected(toggleInList(key))
    return
  }
  if (additive) {
    commitSelected(isSelected(key) ? selectedIds.value.filter((k) => k !== key) : [key])
  } else if (!isSelected(key)) {
    commitSelected([key])
  }
}

function toggleInList(key: string): string[] {
  return isSelected(key)
    ? selectedIds.value.filter((k) => k !== key)
    : [...selectedIds.value, key]
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
