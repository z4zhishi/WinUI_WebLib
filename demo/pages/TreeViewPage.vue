<script setup lang="ts">
// TreeViewPage.vue —— TreeView 控件示例页(结构照抄 HomePage/ExpanderPage 母版)。
// 示例组合对照官方 WinUI-Gallery/Samples/TreeView/:
//   1) 基础树 + 参数面板(ItemsSource 嵌套数据、SelectionMode 下拉、缩进引导线、事件日志;
//      对应 TreeviewDatabindingItemsource.txt 的 ItemsSource 嵌套绑定);
//   2) 多选树(SelectionMode=Multiple + 复选框 + expandedIds 受控;对应
//      TreeviewMultiSelectionEnabled.txt 的 Work/Personal Documents 数据);
//   3) 自定义模板树(#item 作用域插槽按节点类型换图标;对应
//      TreeviewItemtemplateselector.txt 的 FolderTemplate/FileTemplate)。
import { computed, ref } from 'vue'
import WuiTreeView from '@/components/TreeView.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import type { TreeViewNode } from '@/components/TreeViewItem.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'

// —— 示例 1:基础树(数据绑定;{label, children, expanded} 直用,键 = 路径索引)——
const basicItems = ref<TreeViewNode[]>([
  {
    label: 'Documents',
    expanded: true,
    children: [
      { label: 'ProjectProposal' },
      { label: 'BudgetReport' },
      {
        label: '2024 归档',
        children: [{ label: 'Q1 预算.xlsx' }, { label: 'Q2 预算.xlsx' }],
      },
    ],
  },
  {
    label: 'Projects',
    children: [{ label: 'Project Plan' }],
  },
  {
    label: 'Pictures',
    children: [{ label: 'logo.png' }, { label: 'vacation.jpg' }],
  },
])

// —— 示例 1 可调参数(DemoOptionRow 的 v-model 契约:联合类型)——
const selectionMode = ref<string | number | boolean>('Single')
const indentGuides = ref<string | number | boolean>(false)
const disabled = ref<string | number | boolean>(false)

const selectionModeValue = computed(() => {
  const value = String(selectionMode.value)
  return value === 'None' || value === 'Multiple' ? value : 'Single'
})
const indentGuidesValue = computed(() => indentGuides.value === true)
const disabledValue = computed(() => disabled.value === true)

const modeOptions = [
  { label: 'None', value: 'None' },
  { label: 'Single(默认)', value: 'Single' },
  { label: 'Multiple', value: 'Multiple' },
]

// —— 示例 1 事件日志(itemInvoked / selectionChanged 实时呈现)——
const lastInvoked = ref('—')
const lastSelection = ref('—')

function onItemInvoked(node: TreeViewNode): void {
  lastInvoked.value = String(node.label ?? '')
}

function onSelectionChanged(keys: string[]): void {
  lastSelection.value = keys.length > 0 ? keys.join(', ') : '(空)'
}

const treeRef = ref<InstanceType<typeof WuiTreeView> | null>(null)

function expandAll(): void {
  treeRef.value?.expandAll()
}

function collapseAll(): void {
  treeRef.value?.collapseAll()
}

// —— 示例 2:多选树(显式 id 作键;expandedIds 受控;对应官方多选示例数据)——
const multiItems = ref<TreeViewNode[]>([
  {
    id: 'work',
    label: 'Work Documents',
    expanded: true,
    children: [
      { id: 'work-spec', label: 'XYZ Functional Spec' },
      { id: 'work-schedule', label: 'Feature Schedule' },
    ],
  },
  {
    id: 'personal',
    label: 'Personal Documents',
    expanded: true,
    children: [
      {
        id: 'remodel',
        label: 'Home Remodel',
        expanded: true,
        children: [
          { id: 'remodel-contact', label: 'Contractor Contact Info' },
          { id: 'remodel-paint', label: 'Paint Color Scheme' },
        ],
      },
    ],
  },
])

// expandedIds 受控双绑(也可完全交给组件内部管理)。
const multiExpanded = ref<string[]>(['work', 'personal', 'remodel'])
const multiSelected = ref<string[]>(['work-spec'])

const multiSelectedText = computed(() =>
  multiSelected.value.length > 0 ? multiSelected.value.join('、') : '(未选中)',
)

// —— 示例 3:自定义模板树(#item 按节点类型换图标,对照 ItemTemplateSelector 示例)——
const explorerItems = ref<TreeViewNode[]>([
  {
    id: 'f-documents',
    label: 'Documents',
    kind: 'folder',
    expanded: true,
    children: [
      { id: 'f-proposal', label: 'ProjectProposal', kind: 'file' },
      { id: 'f-budget', label: 'BudgetReport', kind: 'file' },
    ],
  },
  {
    id: 'f-projects',
    label: 'Projects',
    kind: 'folder',
    expanded: true,
    children: [{ id: 'f-plan', label: 'Project Plan', kind: 'file' }],
  },
])

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['itemsSource', 'TreeViewNode[]', '嵌套节点数组:{label, children, expanded?, disabled?, id?};泛型对象配合 childrenPath/labelPath(下方下拉实时切换选择模式)'],
  ['selectionMode', "'None' | 'Single' | 'Multiple'", '选择模式,默认 Single;Multiple 整行即开关并显示复选框,Single 选中行带 3x16 强调色指示条'],
  ['childrenPath', 'string', "子节点字段名,默认 'children',支持点路径(泛型数据)"],
  ['labelPath', 'string', "标签字段名,默认 'label',支持点路径(泛型数据)"],
  ['expandedIds (v-model)', 'string[]', '展开键集双向绑定;键 = 节点 id ?? 路径索引;node.expanded 仅作初始种子'],
  ['selectedIds (v-model)', 'string[]', '选中键集双向绑定(Single 至多 1 项)'],
  ['showIndentGuides', 'boolean', '缩进引导线(Web 扩展,WinUI 无此视觉)'],
  ['disabled', 'boolean', '禁用整棵树'],
  ['itemInvoked', '(node, key) => void', '条目被交互(单击 / Enter)时触发,与选中与否无关(WinUI ItemInvoked)'],
  ['selectionChanged', '(keys: string[]) => void', '用户交互导致选中集变化时触发'],
  ['item slot', '作用域插槽', "自定义条目内容,参数 { node, label, depth, hasChildren, expanded, selected }(对照官方 ItemTemplateSelector)"],
  ['键盘', '—', '↑/↓ 移动、→ 展开、← 收起、Space 选中(Ctrl+Space 切换)、Enter 调用、Home/End 首尾'],
]

// 用法代码随参数实时更新(引号规则:外双内单)。
const usageCode = computed(
  () => `<WuiTreeView
  :items-source="items"
  selection-mode="${selectionModeValue.value}"
  :show-indent-guides="${indentGuidesValue.value}"
  :disabled="${disabledValue.value}"
  v-model:expanded-ids="expandedIds"
  v-model:selected-ids="selectedIds"
  @item-invoked="onItemInvoked"
  @selection-changed="onSelectionChanged" />`,
)
</script>

<template>
  <DemoPage
    title="TreeView"
    description="分层列表模式:节点可展开 / 收起以显隐嵌套子项,支持单选(强调色指示条)与多选(复选框)、键盘导航(↑/↓/←/→/Space/Enter)、展开高度过渡与箭头旋向动画。适合文件资源管理器、分类导航等层级数据。"
  >
    <template #demo>
      <div class="treeview-stage">
        <!-- 示例 1:基础树 + 参数面板联动 -->
        <div class="treeview-example">
          <WuiTreeView
            ref="treeRef"
            class="treeview-demo-main"
            :items-source="basicItems"
            :selection-mode="selectionModeValue"
            :show-indent-guides="indentGuidesValue"
            :disabled="disabledValue"
            @item-invoked="onItemInvoked"
            @selection-changed="onSelectionChanged"
          />
          <div class="treeview-toolbar">
            <button type="button" class="demo-button" @click="expandAll">全部展开</button>
            <button type="button" class="demo-button" @click="collapseAll">全部收起</button>
          </div>
          <p class="treeview-state">
            itemInvoked:<code>{{ lastInvoked }}</code> · selectionChanged:<code>{{ lastSelection }}</code>
          </p>
          <p class="treeview-caption">基础树:itemsSource 嵌套数据 + SelectionMode / 缩进引导线 / 禁用实时切换(官方数据绑定示例)</p>
        </div>

        <!-- 示例 2:多选树(官方多选示例数据,expandedIds / selectedIds 受控) -->
        <div class="treeview-example">
          <WuiTreeView
            class="treeview-demo-main"
            :items-source="multiItems"
            selection-mode="Multiple"
            v-model:expanded-ids="multiExpanded"
            v-model:selected-ids="multiSelected"
          />
          <p class="treeview-state">已选中({{ multiSelected.length }}):<code>{{ multiSelectedText }}</code></p>
          <p class="treeview-caption">多选树:SelectionMode=Multiple,复选框 + 整行开关,Space 切换(官方多选示例)</p>
        </div>

        <!-- 示例 3:自定义模板树(#item 按节点类型换图标,对照 ItemTemplateSelector 示例) -->
        <div class="treeview-example">
          <WuiTreeView class="treeview-demo-main" :items-source="explorerItems" selection-mode="Single">
            <template #item="{ node, label }">
              <span class="treeview-explorer" :class="{ 'treeview-explorer--folder': node.kind === 'folder' }">
                <WuiFontIcon
                  class="treeview-explorer-icon"
                  :glyph="node.kind === 'folder' ? '\uE8B7' : '\uE8A5'"
                  :font-size="16"
                />
                <span>{{ label }}</span>
              </span>
            </template>
          </WuiTreeView>
          <p class="treeview-caption">自定义模板树:#item 作用域插槽按 node.kind 换图标(官方 ItemTemplateSelector 示例)</p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          label="SelectionMode"
          type="select"
          v-model="selectionMode"
          :options="modeOptions"
        />
        <DemoOptionRow label="缩进引导线" type="toggle" v-model="indentGuides" />
        <DemoOptionRow label="Disabled 禁用" type="toggle" v-model="disabled" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.treeview-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.treeview-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.treeview-demo-main {
  width: 360px; /* 树形列表固定宽度,贴近资源管理器场景 */
  padding: 4px; /* 行 Margin 4,2 的悬停/选中底色不溢出画布 */
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.treeview-toolbar {
  display: flex;
  gap: 8px;
}

.demo-button {
  padding: 5px 12px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.demo-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.demo-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.treeview-state {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.treeview-state code {
  color: var(--wui-default-text-foreground-theme);
}

.treeview-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  text-align: center;
}

/* 示例 3:#item 插槽内容(图标 + 文本,横排) */
.treeview-explorer {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 20px;
}

.treeview-explorer--folder .treeview-explorer-icon {
  color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}
</style>
