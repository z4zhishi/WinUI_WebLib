# TreeView

> 在线示例:[/#/treeview](/#/treeview) · 演示页源码:[demo/pages/TreeViewPage.vue](../../demo/pages/TreeViewPage.vue)

## 概述

TreeView 是一种**分层列表模式**:节点可以展开 / 收起,以显隐嵌套的子项,适合文件资源管理器、分类导航等层级数据。每行由「展开字形(chevron)+ 内容」组成:有子节点的行可点击字形(或双击行、按 `→` / `←`)切换展开,子级以高度过渡动画显隐;`SelectionMode` 支持 None / Single / Multiple —— 单选在选中行左缘显示 3x16 强调色指示条,多选每行带复选框、整行即开关。组件由 `TreeView.vue`(状态与键盘导航)+ 递归的 `TreeViewItem.vue`(行渲染)组成,数据契约是嵌套的 `itemsSource` 数组(`{label, children, expanded?}`,泛型对象可配 `childrenPath` / `labelPath`),自定义叶子内容走 `#item` 作用域插槽(等价 WinUI 的 `ItemTemplate` / `ItemTemplateSelector`)。

官方文档:

- [TreeView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.treeview)
- [TreeView 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/tree-view)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `itemsSource` | `TreeViewNode[]` | `[]` | 嵌套节点数组:`{ label, children, expanded?, disabled?, id?, ... }`;`expanded` 仅作初始种子(后续由 `expandedIds` 管理);`id` 提供时作为状态键,缺省用路径索引(`"0.1.2"`) |
| `selectionMode` | `'None' \| 'Single' \| 'Multiple'` | `'Single'` | 选择模式(WinUI `SelectionMode`):Single 选中行带强调色指示条;Multiple 每行三态复选框(已选 / 半选 / 未选)、整行即开关(点击 / Space 切换并级联子树) |
| `childrenPath` | `string` | `'children'` | 子节点字段名(泛型数据),支持点路径(如 `'meta.children'`) |
| `labelPath` | `string` | `'label'` | 标签字段名(泛型数据),支持点路径 |
| `expandedIds` (v-model) | `string[]` | `[]` | 展开键集双向绑定(`v-model:expanded-ids`);不绑定则组件内部自管 |
| `selectedIds` (v-model) | `string[]` | `[]` | 选中键集双向绑定(`v-model:selected-ids`);Single 模式至多 1 项 |
| `showIndentGuides` | `boolean` | `false` | 缩进引导线(Web 扩展,WinUI 无此视觉):每层 16px 缩进槽位中绘 1px 发丝线 |
| `disabled` | `boolean` | `false` | 禁用整棵树(各节点不可交互,呈禁用配色) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `itemInvoked` | `(node: TreeViewNode, key: string)` | 条目被交互(单击 / Enter)时触发,与选中与否无关(WinUI `ItemInvoked`) |
| `selectionChanged` | `(keys: string[])` | 用户交互导致选中集变化时触发(点击 / Space / Ctrl+点击) |

## Slot

| Slot | 说明 |
| --- | --- |
| `#item` | 作用域插槽,自定义条目内容;参数 `{ node, label, depth, hasChildren, expanded, selected }`,等价 WinUI `ItemTemplate` / `ItemTemplateSelector`(按 `node` 字段自行分支) |

## 暴露方法

| 方法 | 说明 |
| --- | --- |
| `expandAll()` | 展开全部含子节点的项 |
| `collapseAll()` | 收起全部 |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiTreeView from '@/components/TreeView.vue'
import type { TreeViewNode } from '@/components/TreeViewItem.vue'

const items = ref<TreeViewNode[]>([
  {
    label: 'Documents',
    expanded: true,
    children: [{ label: 'ProjectProposal' }, { label: 'BudgetReport' }],
  },
  { label: 'Pictures', children: [{ label: 'logo.png' }] },
])

const expandedIds = ref<string[]>([])
const selectedIds = ref<string[]>([])

function onItemInvoked(node: TreeViewNode, key: string) {
  console.log('invoked', key, node.label)
}
</script>

<template>
  <!-- 基础树(单选) -->
  <WuiTreeView
    v-model:expanded-ids="expandedIds"
    v-model:selected-ids="selectedIds"
    :items-source="items"
    selection-mode="Single"
    @item-invoked="onItemInvoked" />

  <!-- 多选 + 缩进引导线 -->
  <WuiTreeView :items-source="items" selection-mode="Multiple" show-indent-guides />

  <!-- 自定义模板(对照官方 ItemTemplateSelector:按节点类型换图标) -->
  <WuiTreeView :items-source="items">
    <template #item="{ node, label }">
      <span>{{ node.kind === 'folder' ? '📁' : '📄' }} {{ label }}</span>
    </template>
  </WuiTreeView>
</template>
```

## 键盘导航

| 键 | 行为 |
| --- | --- |
| `↑` / `↓` | 焦点移到上 / 下一个可见条目 |
| `→` | 展开当前条目;已展开则焦点进入首个子级;叶子(无子节点)则移到下一个可见项 |
| `←` | 收起当前条目;已收起则焦点回到父级 |
| `Space` | Single:选中(`Ctrl+Space` 反选);Multiple:切换选中;禁用节点不响应 |
| `Enter` | 触发 `itemInvoked` |
| `Home` / `End` | 焦点移到首 / 尾 |

## 无障碍

- 树根 `role="tree"`(多选时 `aria-multiselectable`),行 `role="treeitem"` 携带 `aria-expanded`(仅可展开项)、`aria-selected`、`aria-level`、`aria-disabled`;子级容器 `role="group"`。
- roving tabindex:可见条目中仅焦点项 `tabindex="0"`,方向键在可见项间循环;收起的子级 `visibility: hidden`,移出焦点序与可访问性树。
- `prefers-reduced-motion` 时高度过渡与箭头旋转时长趋近 0(animations.css 全局降级)。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `controls/dev/TreeView/TreeViewItem.xaml`(MUX_TreeViewItemStyle 模板)+ `TreeView_themeresources.xaml`(Default/Light 字典)复刻,尺寸资源:`TreeViewItemMinHeight = 28`、`TreeViewItemPresenterMargin = 4,2`、`TreeViewItemPresenterPadding = 0,3,0,5`、`TreeViewItemContentHeight = 20`、缩进步长 16(UpdateIndentation,TreeViewItem.cpp L515-L524)、选择指示条 3x16/圆角 2、字形区 Padding 14,0、字形盒 12x12/Padding 2/GlyphSize 8、多选复选框槽位 32/Margin 10,0,0,0。主题资源引用 **Subtle\*/TextFill\*/AccentFill\* 系画刷**,未被 theme.css 收录(theme.css 提取自经典 generic.xaml 主题字典),按「最近似 token」规则映射:

| 源资源(WinUI 3) | 本组件 token | 差异说明 |
| --- | --- | --- |
| `TreeViewItemBackground` ← `SubtleFillColorTransparent` | `transparent` | 源即为透明填充,无 token 可用 |
| `TreeViewItemBackgroundPointerOver` ← `SubtleFillColorSecondary` | `--wui-grid-view-item-background-pointer-over`(#00000019 / #FFFFFF19) | 源约 3.5% 叠加,token 为 10%,悬停反馈略强 |
| `TreeViewItemBackgroundPressed` ← `SubtleFillColorTertiary` | `--wui-grid-view-item-background-pressed`(#00000033 / #FFFFFF33) | 同上,按压反馈略强 |
| `TreeViewItemBackgroundSelected` ← `SubtleFillColorSecondary` | `--wui-grid-view-item-background-pointer-over`(同悬停键) | 源中选中底色与悬停底色同为 Subtle 次级,故与悬停同 token |
| `TreeViewItemForeground` 等 ← `TextFillColorPrimary` | `--wui-default-text-foreground-theme`(#000000 / #FFFFFF) | 浅 / 深主题均为不透明纯色,与源主文本色观感一致 |
| `TreeViewItemForegroundPressed` ← `TextFillColorSecondary` | `--wui-application-secondary-foreground-theme`(#00000099) | 源约 60% 不透明度,token 同为 60% |
| `TreeViewItemForegroundDisabled` ← `TextFillColorDisabled` | `--wui-toggle-switch-content-foreground-disabled`(#00000066) | 源约 36% 不透明度,token 为 40%,禁用观感略深 |
| `TreeViewItemSelectionIndicatorForeground` ← `AccentFillColorDefault` | `var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))` | 系统强调色钩子(应用层定义后自动生效) |
| `TreeViewItemCheckBoxBorderSelected` / `CheckGlyphSelected` ← `TextFillColorSecondary` | `--wui-application-secondary-foreground-theme` | 同上 60% 不透明度 |
| `ControlCornerRadius`(行圆角 4) | `--wui-hyperlink-focus-rect-corner-radius`(4px) | 圆角 token 未提取,取同为 4px 的最近似 |

其余无 token / 做 Web 等价替换的项:

1. **缩进引导线为 Web 扩展**:WinUI TreeView 的层级线索只有 16px/层的缩进(源模板无引导线视觉);`showIndentGuides` 按需补 1px 发丝线(取 `--wui-system-control-background-base-low`),默认关闭。
2. **展开 / 收起动画**:源由 ListView 容器布局变化承载(无独立故事板);Web 以 `grid-template-rows` 0fr↔1fr 过渡等价实现高度动画(展开 `--wui-duration-slow` + `--wui-easing-standard`,收起 `--wui-duration-fast` + `--wui-easing-accelerate`,与 Expander 同方案)。
3. **展开字形动画**:源为两个静态字形 E76C(收起)/ E70D(展开)按 `CollapsedGlyphVisibility` / `ExpandedGlyphVisibility` 切换;本组件取单个 E70D 字形 + `rotate()` 过渡(收起 -90deg 朝右),旋转时长 `--wui-duration-normal` + `--wui-easing-standard`。字形默认继承 `GlyphSize = 8`(12x12 盒 Padding 2),字体栈 `--wui-symbol-theme-font-family`(Segoe Fluent Icons / Segoe MDL2 Assets,按 R1 不做网络字体加载)。
4. **字形点击展开为 Web 适配**:源模板字形 `IsHitTestVisible="False"`(展开靠双击 / 键盘);Web 上字形区可点击(仅切换展开,不触发 `itemInvoked`),另补双击行切换展开。
5. **状态键**:WinUI 以 TreeViewNode 对象为身份;本组件用字符串键 = `node.id ?? 路径索引`,兄弟节点增删会改变路径索引型键,层级结构动态变化时建议为节点提供显式 `id`。
6. **多选复选框视觉(三态)**:源选中态为「透明底 + TextFillColorSecondary 边框与勾选字形」(非强调色填充),已按源复刻;未选态边框取 `--wui-check-box-check-background-stroke-unchecked`。**父节点有半选(indeterminate)态**:选中 / 取消一个节点会级联其整棵子树,父节点状态由子级自底向上聚合 —— 子级全选则父为已选、部分选中则父为半选(WinUI `TreeViewItem.cpp` L480-491 `UpdateMultipleSelection`:`PartialSelected → m_selectionBox.IsChecked(nullptr)`;`ViewModel.cpp` L836-866 `SelectionStateBasedOnChildren`)。本组件半选与已选共用 TreeView 自身声明的画刷口径,仅以字形区分(已选 `E73E` 勾 / 半选 `E73C` 实心方块,后者同 Fluent 字典 `CheckBoxIndeterminateGlyph` 的 `E9AE`)。`selectedIds` 只存完全选中的键(等价 WinUI `SelectedNodes`),半选父节点不入集合。
7. **属性命名**:`ItemsSource` → `itemsSource`;`SelectionMode` → `selectionMode`;`IsExpanded` → `expandedIds` / `node.expanded`(集中式管理,非逐节点组件);`ItemInvoked` → `@item-invoked`。
8. **拖拽重排 / 虚拟化**:源 DefaultTreeViewStyle 启用 CanDragItems/CanReorderItems 且基于 ListView 虚拟化;Web 版未实现拖拽重排与虚拟化(WinUI-Gallery 两例亦未涉及),大数据量场景由使用方自行分页。
9. **紧凑密度**:Compact.xaml 下 `TreeViewItemMinHeight = 24`、PresenterMargin/Padding = 0,本组件按标准密度(MinHeight 28)实现。
10. **键盘语义**:↑/↓/End 按「可见键序列」导航(收起子树的子级跳过,不依赖 DOM 遍历);叶子节点按 `→` 移到下一个可见项(ARIA APG 树模式的 end-of-branch 语义;WinUI 文档只规定 →/← 为展开 / 收起,叶子行为未定义,此处取 APG 约定)。

---

演示页源码:[demo/pages/TreeViewPage.vue](../../demo/pages/TreeViewPage.vue) · 组件源码:[src/components/TreeView.vue](../../src/components/TreeView.vue) · [src/components/TreeViewItem.vue](../../src/components/TreeViewItem.vue)
