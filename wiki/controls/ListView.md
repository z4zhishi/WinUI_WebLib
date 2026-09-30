# ListView

> 在线示例:[/#/listview](/#/listview)

## 概述

ListView 让你以可垂直滚动的列表形式展示一组数据项,并支持 None / Single / Multiple / Extended 四种选择模式与键盘导航,是最常用的集合类控件。

对应 WinUI `Microsoft.UI.Xaml.Controls.ListView`,视觉与交互状态(容器 Normal / PointerOver / Pressed / Selected 及其正交叠加态、Disabled 内容衰减、系统双线焦点框、多重选择勾选框)对照 `generic.xaml` 中 `TargetType="ListView"`(L9284 起,模板为 Border → ScrollViewer → ItemsPresenter)与 `ListViewItemRevealStyle`(L17732 起,默认项样式即基于它)复刻;颜色全部取自 `theme.css` 预置的 `--wui-list-view-item-*` 与 `--wui-scroll-bar-*` token。选择状态机复用阶段 5 集合公共底座 [src/composables/useSelection.ts](../../src/composables/useSelection.ts)(SelectionMode 四态、锚点区间、Ctrl/Shift 指针语义),后续 [GridView](./GridView.md) 等选择容器同底座。

官方文档:

- [ListView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.listview)
- [ListView 与 GridView 设计指南](https://learn.microsoft.com/windows/apps/design/controls/listview-and-gridview)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | `unknown[]` | `[]` | 数据源数组(WinUI `ItemsSource`),`v-model:items` 双向;元素可为字符串、数字或对象 |
| `selectedIndex` | `number` | `-1` | 选中项索引(WinUI `SelectedIndex`),`v-model:selected-index` 双向;多选模式下取首个选中项;程序化赋值 = 选中该单项(替换既有选择),越界归一为 -1 |
| `selectedItems` | `unknown[]` | `[]` | 选中项集合(WinUI `SelectedItems`),`v-model:selected-items` 双向;程序化赋值按引用相等回查索引 |
| `selectionMode` | `'None' \| 'Single' \| 'Multiple' \| 'Extended'` | `'Single'` | 选择模式:None 不可选;Single 单选;Multiple 每项显示勾选框、单击即切换;Extended 支持 Ctrl+单击切换与 Shift+单击/方向键区间 |
| `singleSelectionFollowsFocus` | `boolean` | `true` | Single 模式下方向键移动焦点时选中是否随焦点走(WinUI `SingleSelectionFollowsFocus`) |
| `displayMemberPath` | `string` | `''` | 对象项的显示字段路径(WinUI `DisplayMemberPath`),如 `'name'`;缺省按 `String(item)` 渲染 |
| `#item` slot | `{ item: unknown; index: number }` | — | 自定义项模板(WinUI `ItemTemplate` 的等价物);缺省渲染显示文本 |
| `#header` / `#footer` slot | — | — | 列表顶部 / 底部内容(WinUI `Header` / `Footer`),随内容滚动 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素;控件本体无边框无背景(源模板 Border 默认空),需要边框/固定高度时在消费侧叠加(官方示例即 1px 边框 + 固定高度)。官方示例边框取 `ControlStrongStrokeColorDefaultBrush`,本仓 `theme.css` 无对应生成 token,演示页以最近似的 `--wui-system-control-background-base-low`(浅色主题 #00000033 与源同值)替代,特此记录。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectionChanged` | `(selected: unknown[], added: unknown[], removed: unknown[])` | 选择集变化时(点击、键盘、程序化赋值均触发);added / removed 为本次新增 / 移除的项(WinUI `SelectionChangedEventArgs` 的 AddedItems / RemovedItems) |
| `itemClick` | `(index: number, item: unknown)` | 项被单击时(任意模式,含 None;对应 WinUI `ItemClick`) |

模板中监听写法:`@selection-changed="onSelectionChanged"`、`@item-click="onItemClick"`。

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `↑` / `↓` / `Home` / `End` | 移动键盘焦点(到边界停住,不循环);焦点所在项滚动进可视区(BringIntoView) |
| `Ctrl` + `↑` / `↓` / `Home` / `End` | 只移动焦点,不改变选择 |
| `Shift` + `↑` / `↓` | Extended / Multiple:从锚点到焦点项的区间替换选择(锚点不动,可连续扩展) |
| `Space` | Single:选中焦点项;Multiple:切换;Extended:只选焦点项 |
| `Ctrl` + `Space` | Extended:切换焦点项且不破坏其余选中(锚点移至该项) |
| `Ctrl` + `A` | Extended / Multiple:全选 |
| `Ctrl` + 单击 / `Shift` + 单击 | Extended:切换单项(设锚点)/ 锚点区间替换选择;Multiple:Shift 区间追加 |
| `Enter` | 触发 `itemClick`,不改选择 |
| `Tab` | 按原生焦点顺序进出列表(roving tabindex:焦点项持 `tabindex=0`) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiListView from '@/components/ListView.vue'

const folders = ['App collections', 'Controls by group', 'All controls']

interface Contact {
  name: string
  company: string
}
const contacts: Contact[] = [
  { name: 'Mikael Nystrom', company: 'Contoso, Ltd.' },
  { name: 'Toni Poe', company: 'Fabrikam, Inc.' },
]

const selectedIndex = ref(-1)
const selectedNames = ref<string[]>([])

function onSelectionChanged(selected: unknown[]): void {
  selectedNames.value = selected.map((entry) => (entry as Contact).name)
}
</script>

<template>
  <!-- 基础列表(单选) -->
  <WuiListView
    :items="folders"
    v-model:selected-index="selectedIndex"
    class="demo-list"
    @selection-changed="onSelectionChanged"
  />

  <!-- 多选(Multiple:每项带勾选框) -->
  <WuiListView :items="folders" selection-mode="Multiple" style="height: 240px" />

  <!-- Extended 区间选择 + 自定义项模板 -->
  <WuiListView :items="contacts" selection-mode="Extended" display-member-path="name">
    <template #item="{ item }">
      <span>{{ (item as Contact).name }} · {{ (item as Contact).company }}</span>
    </template>
  </WuiListView>
</template>
```

## 与 WinUI 的差异说明

- **颜色 / 字号**:全部取自 `theme.css` 的 `--wui-list-view-item-*` token(背景 Normal 透明 / `background-pointer-over` = ListLow / `background-pressed` = ListMedium / `background-selected` = 强调色 40%、选中×hover 60%、选中×pressed 70%,前景 `foreground` / `foreground-pointer-over` / `foreground-selected`,勾选框 `check-box` / 焦点框 `focus-visual-primary` / `focus-visual-secondary` / `focus-border` / `focus-secondary-border`),浅 / 深主题随 `data-theme` 切换;滚动条拇指用 `--wui-scroll-bar-*`(与 ScrollViewer 公共样式同语言)。
- **无 token 的结构值**(源 generic.xaml 键,按源值直接使用):`ListViewItemMinHeight` = 40、`ListViewItemMinWidth` = 88、项 `Padding` = 12,0,12,0、`ListViewItemDisabledThemeOpacity` = 0.55(只衰减内容,底色不衰减)、对勾字形 `U+E73E` 字号 12px(Segoe Fluent Icons)。
- **Reveal 光效**:`ListViewItemRevealStyle` 的 `SystemControl*Reveal*Brush` 指针光晕层无法用纯 CSS 画刷复刻,各态取其平色回退层(与 Win11 关闭 reveal 时的呈现一致);平色层里 Pressed 与 PressedSelected 同为 ListMedium,源经 reveal 层区分的 `PointerOverPressed` / `PressedSelected` 桥接态因此合并。选中底色取 `ListViewItemBackgroundSelected` 族(强调色 40/60/70%),而非 reveal 顶层画刷解析出的 `accent-light-3` 实色——后者是光晕叠加层,平色呈现以 VSM 底色为准。`RevealBorderBrush` 在 Win11 默认即透明,未实现。
- **系统焦点框**:WinUI 用合成层绘制双线焦点框(外 2px primary + 内 1px secondary,选中项取反色 `FocusBorderBrush` / `FocusSecondaryBorderBrush`);Web 侧以 `outline`(2px,offset 1px)+ `box-shadow` 内圈 1px 近似,线宽 / 间距与系统绘制存在像素级差异。
- **多重选择勾选框**:源由 `ListViewItemPresenter` 以 `CheckMode=Inline` + `CheckBrush` / `CheckBoxBrush` 绘制;Web 侧为 20×20、4px 圆角、右侧 12px 间距的近似框(WinUI 无独立尺寸 token),选中态用系统强调色铺底 + 白色对勾(对勾颜色借 `--wui-check-box-check-glyph-foreground-checked`,ListView 族无对应 token)。仅 Multiple 模式显示常驻勾选框;Extended 选中以强调色底色表达(与源一致)。
- **选择模型**:`selectedIndex` 在多选模式下取**首个**选中项(WinUI 返回最后交互项索引,语义差异见事件参数);选择按「条目比较键」跟踪(默认对象引用,`useSelection` 的刻意设计)而非 WinUI 的按索引跟踪——重复的原始值条目(如两个相同字符串)会一起选中/取消,需要区分时请使用对象项。切换 `selectionMode` 不自动清空选择;`None` 模式下对 `selectedIndex` / `selectedItems` 的程序化写入被忽略(模型归一为 -1 / `[]`)。
- **itemClick**:`ItemClick` 在 WinUI 中需 `IsItemClickEnabled=true` 才触发;本实现任意模式下单击 / Enter 均触发 `itemClick`,便于 None 模式构建纯点击列表。
- **Header / Footer**:以 `#header` / `#footer` slot 等价替代 `Header` / `Footer` 属性与 `HeaderTemplate` / `FooterTemplate`,随内容滚动(同源 ItemsPresenter 位置)。
- **列表虚拟化**:源 `ItemsStackPanel` 支持窗口化虚拟化(数万项流畅滚动);本实现为普通 DOM 全量渲染,超长列表(数千项以上)不建议直接投放。`items` 容器(`.wui-list-view-items`)即预留的虚拟化挂载点:后续以窗口化渲染替换内部 `v-for` 即可,公开 API(items / 事件 / 选择模型)不变,本期不做。
- **未暴露的源属性**:`ItemContainerStyle`、`ItemsPanel`、`ItemContainerTransitions`(增删/入场动画)、`IsSwipeEnabled`、`CanReorderItems` / 拖放(官方示例的 DragDropReordering 场景)均未实现;`SelectionMode` 切换动画、选中项半选态(compact selected border)亦未涉及。
- **焦点的 DOM 实现**:WinUI 列表项焦点由控件内部管理;Web 侧用 roving tabindex(焦点项 `tabindex=0`、其余 -1)+ 项持真实 DOM 焦点实现,`Tab` 行为与源 `TabNavigation=Once` 一致。项 `id` 按 `listId-opt-<index>` 生成,供外部 `aria-activedescendant` 或滚动定位使用。

---

演示页源码:[demo/pages/ListViewPage.vue](../../demo/pages/ListViewPage.vue)
