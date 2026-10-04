# ListBox

> 在线示例:[/#/listbox](/#/listbox)

## 概述

ListBox 让你以一张朴素的单列列表展示一组可选项并支持选择,是 `Selector` 家族中最简单的列表控件:容器自带浅灰底色(`SystemControlBackgroundChromeMediumLow`)、项样式比 ListView 更朴素(无 MinHeight、无勾选框,悬停/按压用 `SystemControlHighlightList*` 平色刷),适合内容固定、数量不多的短列表;项的 Reveal 揭示光照按同族 ListView 口径默认启用(借用映射,见属性表与差异节)。

对应 WinUI `Microsoft.UI.Xaml.Controls.ListBox`,视觉与交互状态对照 `generic.xaml` 中 `TargetType="ListBox"`(L19990 起,模板为 Border → ScrollViewer → ItemsPresenter)与 `TargetType="ListBoxItem"`(L19862 起,模板为 Grid → Rectangle PressedBackground → ContentPresenter)逐键复刻;颜色全部取自 `theme.css` 预置的 `--wui-system-control-*` token(容器底色、各项态画刷、焦点框)。选择状态机复用阶段 5 集合公共底座 [src/composables/useSelection.ts](../../src/composables/useSelection.ts),与 [ListView](./ListView.md) 同底座。

官方文档:

- [ListBox - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.listbox)(继承链 `ItemsControl → Selector → ListBox`)

> 原「ListBox design guidelines」页(learn.microsoft.com/windows/apps/design/controls/list-box)已被微软撤下(2026-09 实测 404),设计基线以 `generic.xaml` 的 `TargetType="ListBox"` / `TargetType="ListBoxItem"` 源样式为准。

## 何时使用

- 列表**短且稳定**(几项到十几项):颜色、字号、枚举选项、筛选项等;
- 用户**必须从中选一项(或几项)**,且希望选项始终全部可见、无需折叠;
- 不需要 ListView 的高级能力(虚拟化长列表、分组头、拖拽重排、增量加载、勾选框多选视觉);
- 需要控件自带「一块浅灰面板」的观感(ListBox 容器有默认底色,ListView 容器透明)。

长列表(数百项以上)请改用 [ListView](./ListView.md)。

## 与 ListView 的区别

| 维度 | ListBox | ListView |
| --- | --- | --- |
| 定位 | 朴素短列表选择 | 通用虚拟化长列表 |
| 容器底色 | 自带 `ChromeMediumLow` 浅灰底 | 透明(消费侧自定义) |
| 项最小高度 | 无(项高 = 内容 + Padding 12,9,12,12) | `ListViewItemMinHeight` = 40 |
| 项悬停/选中态 | `SystemControlHighlightList*` 平色刷 | `ListViewItemBackground*` 族(reveal 光晕平色回退) |
| Multiple 勾选框 | 无(选中一律强调色铺底) | Multiple 模式常驻勾选框 |
| 事件 | 仅 `SelectionChanged` | 另有 `ItemClick`(需 `IsItemClickEnabled`) |
| 虚拟化 | 有(源用 VirtualizingStackPanel,Web 侧未做,见差异节) | 源支持窗口化虚拟化 |
| 典型场景 | 设置页选项、短枚举 | 邮件列表、大数据集 |

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | `unknown[]` | `[]` | 数据源数组(WinUI `ItemsSource`),`v-model:items` 双向;元素可为字符串、数字或对象 |
| `selectedIndex` | `number` | `-1` | 选中项索引(WinUI `SelectedIndex`),`v-model:selected-index` 双向;多选模式下取首个选中项;程序化赋值 = 选中该单项(替换既有选择),越界归一为 -1 |
| `selectedItem` | `unknown` | `null` | 选中项(WinUI `SelectedItem`),`v-model:selected-item` 双向;程序化赋值按引用相等回查索引,`null` 清空 |
| `selectedItems` | `unknown[]` | `[]` | 选中项集合(WinUI `SelectedItems`;源为只读集合,本实现提供双向便于程序化多选,见差异节),`v-model:selected-items` 双向 |
| `selectionMode` | `'None' \| 'Single' \| 'Multiple' \| 'Extended'` | `'Single'` | 选择模式:None 不可选;Single 单选;Multiple 单击切换;Extended 支持 Ctrl+单击切换与 Shift+单击/方向键区间(均无勾选框,选中以强调色铺底表达) |
| `singleSelectionFollowsFocus` | `boolean` | `true` | Single 模式下方向键移动焦点时选中是否随焦点走(WinUI `SingleSelectionFollowsFocus`) |
| `displayMemberPath` | `string` | `''` | 对象项的显示字段路径(WinUI `DisplayMemberPath`),如 `'name'`;缺省按 `String(item)` 渲染 |
| `revealBorder` | `boolean` | `true` | 项的 Reveal 揭示光照(悬浮时跟随指针的底板光 + 1px 边框光环,公共层实现)。源无 `ListBoxItemRevealStyle`,本实现按同族 ListView 项视觉借用映射(MR8 登记的无源条款);设 `false` 关闭。见 [_reveal.md](./_reveal.md) |
| `disabled` | `boolean` | `false` | 整控禁用(WinUI `IsEnabled=false`):全部项进入 Disabled 态(前景转 `SystemControlDisabledBaseMediumLow`,不响应交互) |
| `#item` slot | `{ item: unknown; index: number }` | — | 自定义项模板(WinUI `ItemTemplate` 的等价物);缺省渲染显示文本 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。控件 Padding(模板绑定到 ScrollViewer)默认 0,需要内边距时在消费侧以 `:deep(.wui-list-box-scroller)` 或容器样式叠加。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectionChanged` | `(selected: unknown[], added: unknown[], removed: unknown[])` | 选择集变化时(点击、键盘、程序化赋值均触发);added / removed 为本次新增 / 移除的项(WinUI `SelectionChangedEventArgs` 的 AddedItems / RemovedItems) |

模板中监听写法:`@selection-changed="onSelectionChanged"`。WinUI `ListBox` 没有 `ItemClick` 事件,本实现同样不提供。

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
| `Tab` | 按原生焦点顺序进出列表(roving tabindex:焦点项持 `tabindex=0`,源 `TabNavigation=Once`) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiListBox from '@/components/ListBox.vue'

const colors = ['Blue', 'Green', 'Red', 'Yellow']

const selectedIndex = ref(0)
const current = ref<unknown>(colors[0])

function onSelectionChanged(selected: unknown[]): void {
  current.value = selected[0] ?? null
}
</script>

<template>
  <WuiListBox
    :items="colors"
    v-model:selected-index="selectedIndex"
    selection-mode="Single"
    aria-label="颜色"
    style="width: 240px; max-height: 200px"
    @selection-changed="onSelectionChanged" />
</template>
```

需要固定高度/宽度时在消费侧以 `style` 叠加(容器高度默认随内容);超出即出纵向滚动条(源 `VerticalScrollBarVisibility=Auto`)。

## 与 WinUI 的差异说明

- **颜色 / 字号(PL14 重定向)**:`controls/dev/CommonStyles/ListBox_themeresources.xaml` 为**混合**权威——`ListBoxForeground` / `ListBoxBorder` / `ListBoxItemForeground(Disabled)` / `ListBoxItemBackgroundPointerOver` / `Pressed` 指向 Fluent(已重定向到 `--wui-text-fill-color-primary/disabled`、`--wui-subtle-fill-color-secondary/tertiary`);`ListBoxBackground` 与 `ListBoxItemBackgroundSelected*` 仍指向 legacy `SystemControl*`(权威即 legacy,保留原 token 不臆造):容器底 `--wui-system-control-background-chrome-medium-low`、选中三档 `--wui-system-control-highlight-list-accent-low/medium/high`(浅 40%/60%/70%、深 60%/80%/90%)。焦点框 `--wui-system-control-focus-visual-primary/secondary`;浅 / 深主题随 `data-theme` 切换。总览见 [_brushes.md](./_brushes.md)。
- **无 token 的结构值**(源权威键,按源值直接使用):`ListBoxItemPadding` = 12,9,12,12(项内容边距)、`ListBoxBorderThemeThickness` = 0(浅/深主题;HighContrast 主题的 2px 未实现)、`ListBoxItem` 无 MinHeight/MinWidth 键(项高由内容 + Padding 决定,区别于 `ListViewItemMinHeight` = 40)。容器边框厚度 0,`ListBoxBorder = TextFillColorPrimaryBrush` 已按源接线但默认不可见;需边框时消费侧自行覆盖 `border-width`。
- **Reveal 揭示光照(借用映射)**:源 `ListBoxItem` 样式无 reveal 光效(平台无 `ListBoxItemRevealStyle` 可挂);本实现按工单把同族 ListView 项的 reveal 视觉外推到 ListBox 项(公共层光照:`revealBorder` 默认 true,底板光 + 1px 边框光环,禁用项不点亮),登记为无源条款的借用映射;机制、常量与降级语义见 [_reveal.md](./_reveal.md)。
- **系统焦点框**:WinUI 由合成层按 `IsTemplateFocusTarget`(项满幅 Rectangle)绘制双线焦点框;Web 侧以 `box-shadow` 内 2px 主环 + `outline` 内缩 1px 副环近似(与 ListView 项同口径)。`ListBoxItem` 未覆写 `FocusBorderBrush` 族,故选中项焦点框不反色(与 ListViewItem 的反色行为不同,与源一致)。
- **选中项前景**:交互/选中态内容前景统一 `SystemControlHighlightAltBaseHighBrush`,默认主题下与 Normal 同色(视觉不变),token 仍按源接线,主题覆盖画刷时正确联动。
- **Disabled**:源 `ListBoxItem` Disabled 态只把内容前景换成 `SystemControlDisabledBaseMediumLowBrush`,无透明度衰减、底色不变(区别于 ListViewItem 的 `DisabledThemeOpacity=0.55` 内容衰减);整控 `IsEnabled=false` 即全部项出该态,本实现 `disabled` prop 对齐。
- **selectedItems**:WinUI `Selector.SelectedItems` 为只读集合;本实现提供 `v-model:selected-items` 双向以便程序化多选(与库内 ListView 口径一致)。
- **选择模型**:选择按「条目比较键」跟踪(默认对象引用,`useSelection` 的刻意设计)而非 WinUI 的按索引跟踪——重复的原始值条目(如两个相同字符串)会一起选中/取消,需要区分时请使用对象项。切换 `selectionMode` 不自动清空选择;`None` 模式下对三个选中模型的程序化写入被忽略(模型归一 -1 / `null` / `[]`)。
- **虚拟化**:源 `ListBox` 模板含 `VirtualizingStackPanel`;本实现为普通 DOM 全量渲染,与库内 ListView 口径一致,超长列表不建议直接投放。
- **未暴露的源属性**:`ItemsPanel`、`ItemContainerStyle`、`ItemTemplate`(`#item` slot 等价)、`ScrollViewer.*` 附加属性族(滚动行为固定为纵 Auto / 横 Disabled)、`TabNavigation`(固定 Once 语义)均未开放配置。
- **焦点的 DOM 实现**:与 ListView 相同,roving tabindex(焦点项 `tabindex=0`、其余 -1)+ 项持真实 DOM 焦点;项 `id` 按 `listId-opt-<index>` 生成,供外部 `aria-activedescendant` 或滚动定位使用。

---

演示页源码:[demo/pages/ListBoxPage.vue](../../demo/pages/ListBoxPage.vue) · Reveal 材料:[_reveal.md](./_reveal.md) · Fluent 画刷族:[_brushes.md](./_brushes.md)
