<script lang="ts">
// TreeViewItem —— WinUI TreeViewItem 的 Web 复刻(递归组件,由 TreeView 提供上下文)。
// 视觉规格:CK/WinUI-Reference/controls/dev/TreeView/TreeViewItem.xaml(MUX_TreeViewItemStyle 模板)
//   + TreeView_themeresources.xaml(Default/Light 字典)与 xcp/dxaml/themes/generic.xaml L1825-L1852、
//   L5938-L5939 的 TreeViewItem* 资源:
//   - 行外壳 ContentPresenterGrid:Margin 4,2 + Padding 0,3,0,5、MinHeight 28、圆角 ControlCornerRadius(4);
//   - 内层 MultiSelectGrid:Padding.Left = depth*16(UpdateIndentation,TreeViewItem.cpp L515-L524,
//     Web 用「子容器 margin-left:16px 逐层嵌套」等价实现累计缩进);
//   - 选择指示条 SelectionIndicator:3x16、RadiusX/Y 2、贴行左缘垂直居中,Selected 态显示、
//     PointerOver/Pressed 隐藏(模板 L130、L23-L27、L41-L51);
//   - 展开/收起字形:CollapsedGlyph \uE76C(右)/ ExpandedGlyph \uE70D(下)、GlyphSize 8、
//     12x12 盒 Padding 2、GlyphOpacity 无子节点为 0(properties.cpp 默认值);字形区 Padding 14,0
//     (多选态 0,0,14,0,模板 L106/L115/L143);
//   - 多选复选框:32px 槽位、Margin 10,0,0,0、MinHeight 28(模板 L138);选中态边框/勾选字形
//     TextFillColorSecondary、背景透明(themeresources L30-L32);
//   - 四交互态配色见 TreeView_themeresources.xaml L5-L43(SubtleFill 与 TextFill 两系,
//     已重定向到 theme.css 同名 Fluent token,对照表见 wiki/controls/TreeView.md 差异节)。
// 展开/收起动画:WinUI 用 ListView 容器布局变化,Web 以 grid-template-rows 0fr/1fr 过渡等价
//   (同 Expander 方案);字形旋转过渡为 AnimatedVisualPlayer 翻面的 Web 等价。
// 多选复选框为三态(WinUI TreeView 多选沿用模板内的原生 CheckBox,CheckBox 本身即三态):
//   已选 → IsChecked(true) / 半选 → IsChecked(nullptr) / 未选 → IsChecked(false)
//   (TreeViewItem.cpp L480-491 UpdateMultipleSelection);半选由「部分子级被选」派生
//   (ViewModel.cpp L836-866 SelectionStateBasedOnChildren),见 TreeView.vue 的 selectionStates。
//   半选字形取源 CheckBox 的 Indeterminate 字形(实心方块):generic.xaml CheckBox 模板
//   L7003 Value="&#xE73C;",Fluent 字典 CheckBoxIndeterminateGlyph = &#xE9AE;(同义异码点)。
//   画刷沿用 TreeView 自身声明的资源口径(TreeViewItemCheckBoxBackgroundSelected=透明 /
//   BorderSelected=CheckGlyphSelected=TextFillColorSecondary),三态共用该口径,仅字形区分。

import type { InjectionKey, Ref } from 'vue'

/** 树节点:{label, children, expanded?} 直用;泛型对象配合 TreeView 的 childrenPath/labelPath。 */
export interface TreeViewNode {
  /** 节点文本(默认 labelPath='label')。 */
  label?: string
  /** 子节点数组(默认 childrenPath='children')。 */
  children?: TreeViewNode[]
  /** 初始展开(仅作种子;后续由 expandedIds 管理)。 */
  expanded?: boolean
  /** 禁用本节点(不可选中/展开/调用,呈禁用配色)。 */
  disabled?: boolean
  /** 显式节点 id:提供时作为 expandedIds/selectedIds 的键;缺省用「路径索引」(如 "0.1.2")。 */
  id?: string | number
  /** 其余字段放行(childrenPath/labelPath 指向的泛型数据)。 */
  [key: string]: unknown
}

/** #item 作用域插槽参数(自定义叶子内容,对照官方 ItemTemplateSelector 示例)。 */
export interface TreeViewItemSlotProps {
  node: TreeViewNode
  label: string
  depth: number
  hasChildren: boolean
  expanded: boolean
  selected: boolean
  /** 半选(Multiple 模式的 indeterminate:部分子级被选)。 */
  partial: boolean
}

/** TreeView 向递归 TreeViewItem 下发的上下文。 */
export interface TreeViewContext {
  selectionMode: Ref<'None' | 'Single' | 'Multiple'>
  disabled: Ref<boolean>
  showIndentGuides: Ref<boolean>
  focusedKey: Ref<string | null>
  keyFor: (parentKey: string, index: number, node: TreeViewNode) => string
  labelOf: (node: TreeViewNode) => string
  childrenOf: (node: TreeViewNode) => TreeViewNode[]
  hasChildren: (node: TreeViewNode) => boolean
  isSelected: (key: string) => boolean
  /** 半选态查询(WinUI TreeNodeSelectionState::PartialSelected)。 */
  isPartial: (key: string) => boolean
  isExpanded: (key: string) => boolean
  selectByRow: (key: string, additive: boolean) => void
  selectByKeyboard: (key: string, additive: boolean) => void
  toggleExpand: (key: string, node: TreeViewNode) => void
  invoke: (node: TreeViewNode, key: string) => void
  focusItem: (key: string) => void
}

/** provide/inject 键(TreeView → TreeViewItem 递归层)。 */
export const wuiTreeViewContextKey: InjectionKey<TreeViewContext> = Symbol('wui-treeview')
</script>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import WuiFontIcon from './FontIcon.vue'
import '../styles/animations.css'

defineOptions({ name: 'WuiTreeViewItem', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 节点数据。 */
    node: TreeViewNode
    /** 层级(0 起),用于 aria-level。 */
    depth?: number
    /** 本节点键(父级渲染时按 keyFor 计算后传入,唯一标识展开/选中状态)。 */
    itemKey: string
  }>(),
  {
    depth: 0,
    itemKey: '',
  },
)

const ctx = inject(wuiTreeViewContextKey, null)

// —— 上下文镜像(ctx 缺失 = 脱离 TreeView 单用,退化为本地展开状态的静态项)——
const localExpanded = ref(false)
const selectionMode = computed(() => ctx?.selectionMode.value ?? 'None')
const multiple = computed(() => selectionMode.value === 'Multiple')
const selectable = computed(() => selectionMode.value !== 'None')
const treeDisabled = computed(() => ctx?.disabled.value ?? false)
const rowDisabled = computed(() => treeDisabled.value || props.node.disabled === true)

const label = computed(() =>
  ctx ? ctx.labelOf(props.node) : String(props.node.label ?? ''),
)
const childrenList = computed<TreeViewNode[]>(() =>
  ctx ? ctx.childrenOf(props.node) : childrenFallback(props.node),
)
const hasChildren = computed(() => childrenList.value.length > 0)
const expanded = computed(() => {
  if (rowDisabled.value) return false
  return ctx ? ctx.isExpanded(props.itemKey) : localExpanded.value
})
const selected = computed(() =>
  selectable.value && !rowDisabled.value ? (ctx?.isSelected(props.itemKey) ?? false) : false,
)
/** 半选(Multiple 的 indeterminate):部分子级被选而自身未全部选中。 */
const partial = computed(() =>
  multiple.value && !rowDisabled.value ? (ctx?.isPartial(props.itemKey) ?? false) : false,
)
const focused = computed(() => ctx?.focusedKey.value === props.itemKey)
const showGuides = computed(() => ctx?.showIndentGuides.value ?? false)

function childrenFallback(node: TreeViewNode): TreeViewNode[] {
  const children = node.children
  return Array.isArray(children) ? children : []
}

// —— 行交互 ——
function onRowClick(event: MouseEvent): void {
  if (rowDisabled.value || !ctx) return
  ctx.invoke(props.node, props.itemKey)
  if (selectable.value) ctx.selectByRow(props.itemKey, event.ctrlKey || event.metaKey)
}

function onRowDblClick(): void {
  // WinUI 树节点双击切换展开(ItemInvoked 只在单击/Enter);此处等价补齐。
  if (rowDisabled.value || !hasChildren.value) return
  if (ctx) ctx.toggleExpand(props.itemKey, props.node)
  else localExpanded.value = !localExpanded.value
}

function onChevronClick(event: MouseEvent): void {
  // 字形点击只负责展开/收起,不触发 itemInvoked(Web 适配;WinUI 字形 IsHitTestVisible=false)。
  event.stopPropagation()
  if (rowDisabled.value || !hasChildren.value) return
  if (ctx) ctx.toggleExpand(props.itemKey, props.node)
  else localExpanded.value = !localExpanded.value
}

function onCheckboxClick(event: MouseEvent): void {
  // 多选复选框与行点击同义(整行即开关,WinUI Multiple 行为),不额外 invoke。
  event.stopPropagation()
  if (rowDisabled.value || !ctx || !multiple.value) return
  ctx.selectByRow(props.itemKey, event.ctrlKey || event.metaKey)
}

function onFocusIn(): void {
  ctx?.focusItem(props.itemKey)
}

// 行类名:交互态以类组合呈现(selected 与 hover 叠加时取 selected:hover 分支,对照源状态机);
// 展开态类挂在外层包装(clip 容器是行的兄弟节点,由它驱动高度过渡)。
const rowClass = computed(() => ({
  'wui-treeview-item--selected': selected.value,
  'wui-treeview-item--disabled': rowDisabled.value,
  'wui-treeview-item--single': selectionMode.value === 'Single',
  'wui-treeview-item--selectable': selectable.value && !rowDisabled.value,
  'wui-treeview-item--multi': multiple.value,
}))

const wrapperClass = computed(() => ({
  'wui-treeview-item--expanded': expanded.value,
}))

const slotProps = computed<TreeViewItemSlotProps>(() => ({
  node: props.node,
  label: label.value,
  depth: props.depth,
  hasChildren: hasChildren.value,
  expanded: expanded.value,
  selected: selected.value,
  partial: partial.value,
}))

const ariaExpanded = computed(() => (hasChildren.value ? expanded.value : undefined))
const ariaSelected = computed(() => (selectable.value ? selected.value : undefined))
</script>

<template>
  <div class="wui-treeview-item" :class="wrapperClass" data-wui-tree-item="">
    <!-- 行(WinUI ContentPresenterGrid:Margin 4,2 + Padding 0,3,0,5 + 圆角 4) -->
    <div
      class="wui-treeview-item-row"
      :class="rowClass"
      role="treeitem"
      :data-key="itemKey"
      :tabindex="rowDisabled ? -1 : focused ? 0 : -1"
      :aria-expanded="ariaExpanded"
      :aria-selected="ariaSelected"
      :aria-level="depth + 1"
      :aria-disabled="rowDisabled || undefined"
      @click="onRowClick"
      @dblclick="onRowDblClick"
      @focusin="onFocusIn"
    >
      <!-- 选择指示条(3x16,Selected 态显示、hover/按压隐藏,仅 Single) -->
      <span class="wui-treeview-item-indicator" aria-hidden="true"></span>

      <div class="wui-treeview-item-grid">
        <!-- 多选复选框(32 槽位 + Margin 10,0,0,0;仅 Multiple 渲染;三态:勾 / 半选方块 / 空) -->
        <span
          v-if="multiple"
          class="wui-treeview-item-checkbox"
          :class="{
            'wui-treeview-item-checkbox--checked': selected,
            'wui-treeview-item-checkbox--partial': partial,
          }"
          :data-check-state="selected ? 'checked' : partial ? 'partial' : 'unchecked'"
          aria-hidden="true"
          @click="onCheckboxClick"
        >
          <span class="wui-treeview-item-checkbox-box">
            <WuiFontIcon v-if="selected" glyph="&#xE73E;" :font-size="12" />
            <!-- 半选:源 CheckBox 的 Indeterminate 字形(实心方块)——generic.xaml L7003 取
                 E73C(经典字典)/ Fluent 字典 CheckBoxIndeterminateGlyph 取 E9AE -->
            <WuiFontIcon v-else-if="partial" glyph="&#xE73C;" :font-size="12" />
          </span>
        </span>

        <!-- 展开字形(12x12 Padding 2 + 区 Padding 14,0;无子节点 GlyphOpacity=0 占位) -->
        <span
          class="wui-treeview-item-chevron"
          :class="{ 'wui-treeview-item-chevron--hidden': !hasChildren }"
          aria-hidden="true"
          @click="onChevronClick"
        >
          <span class="wui-treeview-item-chevron-icon">
            <WuiFontIcon glyph="&#xE70D;" :font-size="8" />
          </span>
        </span>

        <!-- 内容(叶子内容走 #item 作用域插槽,对照官方 ItemTemplateSelector 示例) -->
        <span class="wui-treeview-item-content">
          <slot name="item" v-bind="slotProps">{{ label }}</slot>
        </span>
      </div>
    </div>

    <!-- 子级(0fr/1fr 高度过渡 + role=group;缩进引导线为 Web 扩展) -->
    <div class="wui-treeview-clip">
      <div class="wui-treeview-clip-inner">
        <div
          v-if="hasChildren"
          class="wui-treeview-children"
          :class="{ 'wui-treeview-children--guide': showGuides }"
          role="group"
        >
          <TreeViewItem
            v-for="(child, index) in childrenList"
            :key="ctx ? ctx.keyFor(itemKey, index, child) : `${itemKey}.${index}`"
            :node="child"
            :depth="depth + 1"
            :item-key="ctx ? ctx.keyFor(itemKey, index, child) : `${itemKey}.${index}`"
          >
            <template #item="childSlotProps">
              <slot name="item" v-bind="childSlotProps" />
            </template>
          </TreeViewItem>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 行外壳(ContentPresenterGrid,TreeViewItem.xaml L15) */
.wui-treeview-item-row {
  position: relative;
  box-sizing: border-box;
  min-height: 28px; /* TreeViewItemMinHeight = 28 */
  margin: 4px 2px; /* TreeViewItemPresenterMargin = 4,2 */
  padding: 3px 0 5px; /* TreeViewItemPresenterPadding = 0,3,0,5 */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius=4 最近似 */
  color: var(--wui-text-fill-color-primary); /* TreeViewItemForeground = TextFillColorPrimaryBrush */
  background: var(--wui-subtle-fill-color-transparent); /* TreeViewItemBackground = SubtleFillColorTransparentBrush */
  outline: none;
  user-select: none;
  -webkit-user-select: none;
}

/* 内层栅格(MultiSelectGrid:缩进槽位 + 三列) */
.wui-treeview-item-grid {
  display: flex;
  align-items: center;
  min-height: 20px; /* TreeViewItemContentHeight = 20 */
  padding-left: 16px; /* 每层 16 槽位:字形落点 16+16*depth,与源 UpdateIndentation 累计一致 */
}

/* —— 四交互态(TreeView_themeresources.xaml L5-L43:SubtleFill 与 TextFill 系 Fluent token)—— */
.wui-treeview-item-row.wui-treeview-item--selectable,
.wui-treeview-item--expanded > .wui-treeview-item-row {
  cursor: pointer;
}

.wui-treeview-item-row:not(.wui-treeview-item--disabled):hover {
  background: var(--wui-subtle-fill-color-secondary); /* PointerOver ← SubtleFillColorSecondaryBrush */
  color: var(--wui-text-fill-color-primary); /* ForegroundPointerOver ← TextFillColorPrimaryBrush */
}

.wui-treeview-item-row:not(.wui-treeview-item--disabled):active {
  background: var(--wui-subtle-fill-color-tertiary); /* Pressed ← SubtleFillColorTertiaryBrush */
  color: var(--wui-text-fill-color-secondary); /* ForegroundPressed ← TextFillColorSecondaryBrush */
}

.wui-treeview-item-row.wui-treeview-item--selected {
  background: var(--wui-subtle-fill-color-secondary); /* Selected ← SubtleFillColorSecondaryBrush(与悬停同键) */
  color: var(--wui-text-fill-color-primary); /* ForegroundSelected ← TextFillColorPrimaryBrush */
}

.wui-treeview-item-row.wui-treeview-item--selected:not(.wui-treeview-item--disabled):hover {
  background: var(--wui-subtle-fill-color-tertiary); /* SelectedPointerOver ← SubtleFillColorTertiaryBrush */
  color: var(--wui-text-fill-color-primary); /* ForegroundSelectedPointerOver ← TextFillColorPrimaryBrush */
}

.wui-treeview-item-row.wui-treeview-item--selected:not(.wui-treeview-item--disabled):active {
  background: var(--wui-subtle-fill-color-secondary); /* SelectedPressed ← SubtleFillColorSecondaryBrush */
  color: var(--wui-text-fill-color-secondary); /* ForegroundSelectedPressed ← TextFillColorSecondaryBrush */
}

/* 多选态清零行内边距(源多选 VisualState 设 ContentPresenterGrid.Padding = 0,模板 L107/L116;
   行高由 MinHeight 28 与复选框 MinHeight 28 保持) */
.wui-treeview-item-row.wui-treeview-item--multi {
  padding: 0;
}

.wui-treeview-item-row.wui-treeview-item--disabled {
  cursor: default;
  color: var(--wui-text-fill-color-disabled); /* ForegroundDisabled ← TextFillColorDisabledBrush */
}

/* 系统焦点视觉:TreeViewItem FocusVisualMargin="0,-1,0,-1"(controls/dev/TreeView/
   TreeViewItem.xaml L11)≈ Margin 0 族 → 两环全在行内 primary [0,2] + secondary [2,3]
   = 系统双环 flush 形(垂直 ±1 外扩为登记近似) */
.wui-treeview-item-row:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

/* —— 选择指示条(3x16、圆角 2、贴左缘;AccentFill → 系统强调色钩子)—— */
.wui-treeview-item-indicator {
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px;
  height: 16px;
  border-radius: 2px; /* RadiusX/Y = 2 */
  background: var(--wui-accent-fill-color-default); /* TreeViewItemSelectionIndicatorForeground ← AccentFillColorDefaultBrush */
  opacity: 0;
  transform: translateY(-50%);
  pointer-events: none;
}

/* Selected 态显示(源 PointerOverSelected / PressedSelected 态保持 Opacity = 1,模板 L62-L83,
   hover / 按压时指示条不隐藏);多选态恒隐(多选用复选框表达) */
.wui-treeview-item-row.wui-treeview-item--selected.wui-treeview-item--single
  .wui-treeview-item-indicator {
  opacity: 1;
}

/* —— 展开字形(12x12 盒 Padding 2 + 字形区 Padding 14,0)—— */
.wui-treeview-item-chevron {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 14px; /* ExpandCollapseChevron Padding = 14,0 */
}

.wui-treeview-item-row.wui-treeview-item--multi .wui-treeview-item-chevron {
  padding: 0 14px 0 0; /* 多选态 Padding = 0,0,14,0(模板 L106/L115) */
}

.wui-treeview-item-chevron--hidden {
  cursor: default;
}

.wui-treeview-item-chevron--hidden .wui-treeview-item-chevron-icon {
  opacity: 0; /* GlyphOpacity = 0(无子节点),占位保持缩进一致 */
}

.wui-treeview-item-chevron-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  padding: 2px; /* 字形盒 12x12、Padding 2、GlyphSize 8 */
  color: inherit; /* GlyphBrush = TreeViewItemForeground(随行前景:常态/悬停 primary、按下 secondary、禁用 disabled) */
  transform: rotate(-90deg); /* 收起 = CollapsedGlyph E76C(朝右)的旋转等价 */
  transition: transform var(--wui-duration-normal) var(--wui-easing-standard);
}

.wui-treeview-item--expanded > .wui-treeview-item-row .wui-treeview-item-chevron-icon {
  transform: rotate(0deg); /* 展开 = ExpandedGlyph E70D(朝下);仅限本行,不影响嵌套子项 */
}

/* —— 多选复选框(32 槽位 / Margin 10,0,0,0 / 20x20 盒)—— */
.wui-treeview-item-checkbox {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  min-width: 32px;
  height: 28px;
  margin-left: 10px; /* MultiSelectCheckBox Margin = 10,0,0,0 */
}

.wui-treeview-item-checkbox-box {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  /* 未选边框:色取自 CheckBox 默认样式 CheckBoxCheckBackgroundStrokeUnchecked =
     ControlStrongStrokeColorDefaultBrush(与 PL9 CheckBox 同族一致);厚度 2px 取项目
     CheckBox 权威键 CheckBoxBorderThemeThickness = 2(dxaml generic.xaml Default L30 /
     HighContrast L2812 / Light L3955;本库 CheckBox.vue 亦固定 2px,VR-B3 已验收),
     TreeView 多选复选框沿用同一原生 CheckBox 口径、三态共用该厚度。box-sizing: border-box
     + 固定 20x20,故厚度变化不改外盒。
     权威裁定(PL22 复核):controls/dev/CommonStyles/CheckBox_themeresources.xaml L269
     `CheckBoxBorderThickness = 1`(同文件 Deprecated 字典的旧键亦为 1),故取 1px;
     PL21 曾按 generic.xaml legacy 层(2)取值,属权威层级误用,已订正。 */
  border: 1px solid var(--wui-control-strong-stroke-color-default);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  color: var(--wui-text-fill-color-secondary); /* TreeViewItemCheckGlyphSelected ← TextFillColorSecondaryBrush */
  background: var(--wui-subtle-fill-color-transparent); /* TreeViewItemCheckBoxBackgroundSelected ← SubtleFillColorTransparentBrush */
}

/* 已选 / 半选共用边框与字形口径(TreeViewItemCheckBoxBorderSelected = CheckGlyphSelected
   = TextFillColorSecondary),两态仅以字形区分:E73E 勾(Selected)/ E73C 实心方块(Partial) */
.wui-treeview-item-checkbox--checked .wui-treeview-item-checkbox-box,
.wui-treeview-item-checkbox--partial .wui-treeview-item-checkbox-box {
  border-color: var(--wui-text-fill-color-secondary); /* TreeViewItemCheckBoxBorderSelected ← TextFillColorSecondaryBrush */
}

/* —— 内容列 —— */
.wui-treeview-item-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size); /* BodyTextBlockStyle */
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* —— 子级容器:0fr/1fr 高度过渡(展开 duration-slow+standard / 收起 duration-fast+accelerate)—— */
.wui-treeview-clip {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--wui-duration-fast) var(--wui-easing-accelerate);
}

.wui-treeview-item--expanded > .wui-treeview-clip {
  grid-template-rows: 1fr;
  transition-duration: var(--wui-duration-slow);
  transition-timing-function: var(--wui-easing-standard);
}

.wui-treeview-clip-inner {
  min-height: 0;
  overflow: hidden;
  visibility: hidden;
  transition: visibility 0s linear var(--wui-duration-fast);
}

.wui-treeview-item--expanded > .wui-treeview-clip > .wui-treeview-clip-inner {
  visibility: visible;
  transition-delay: 0s;
}

/* 子级缩进:每层 16px(margin 嵌套累计 = 源 depth*16);引导线为 Web 扩展(源无) */
.wui-treeview-children {
  position: relative;
  margin-left: 16px;
}

.wui-treeview-children--guide::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 8px;
  width: 1px;
  content: '';
  background: var(--wui-system-control-background-base-low); /* 引导线:发丝线最近似 token */
  pointer-events: none;
}
</style>
