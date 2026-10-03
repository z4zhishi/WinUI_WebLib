# ItemsView

> 在线示例:[/#/itemsview](/#/itemsview)

## 概述

ItemsView 让你以「可滚动、可切换布局」的方式呈现条目集合:布局(Stack / UniformGrid)只是数据的一种排布方式,可随时整体替换;选择、调用与空态则与布局解耦。它与 [ListView](./ListView.md)/[GridView](./GridView.md) 的差别在于:ListView/GridView 的布局内建在控件里,而 ItemsView 把布局作为独立配置暴露(对照 WinUI `ItemsView.Layout`),项容器是通用的 [ItemContainer](#属性itemcontainer) 而非 ListViewItem/GridViewItem。

对应 WinUI `Microsoft.UI.Xaml.Controls.ItemsView`(WinUI 3 控件;参照库 `CK/WinUI-Reference` 为 WinUI 2/dxaml 源,其 `generic.xaml` 中**没有** `TargetType="ItemsView"` 段。项容器视觉逐键对照 WinUI 3 在册源 `CK/WinUI-Reference/controls/dev/ItemContainer/ItemContainer.xaml` + `ItemContainer_themeresources.xaml` + `controls/dev/CommonStyles/` 复刻,源值表见 `src/components/ItemContainer.vue` 头注,差异见下文「与 WinUI 的差异」)。

官方文档:

- [ItemsView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.itemsview)
- [ItemContainer - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.itemcontainer)
- [CollectionViewSource - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.Data.CollectionViewSource)

## 属性(ItemsView)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | `unknown[]` | `[]` | 数据源数组(WinUI `ItemsSource`);元素可为字符串、数字或对象 |
| `selectionMode` | `'None' \| 'Single' \| 'Multiple' \| 'Extended'` | `'Single'` | 选择模式(WinUI `SelectionMode`);`None` 完全禁用选择,`Multiple` 所有项显示勾选框(右上角),`Extended` 支持 Ctrl/Shift 组合 |
| `selectedItems` | `unknown[]` | `[]` | 全部选中项(WinUI `SelectedItems`,原为只读列表,此处按站内约定开放为 `v-model:selected-items` 双向绑定) |
| `layout` | `'Stack' \| 'UniformGrid'` | `'Stack'` | 布局种类(WinUI `ItemsView.Layout`;`LinedFlowLayout` 未复刻) |
| `orientation` | `'vertical' \| 'horizontal'` | 按 layout | 排列轴:Stack 缺省 `vertical`(纵向列表);UniformGrid 缺省 `horizontal`(条目沿 X 排、满行下折、纵向滚动——WinUI 的 Orientation 指排列轴、与滚动轴相反,详见[集合公共基建](./_collection-infra.md)) |
| `spacing` | `number` | `0` | Stack 布局相邻项间距 px(WinUI `StackLayout.Spacing`) |
| `minItemWidth` | `number` | `0` | UniformGrid 最小项宽 px(WinUI `MinItemWidth`;0 = 每行 1 项,WinUI 除零回绕语义) |
| `minItemHeight` | `number` | `0` | UniformGrid 最小项高 px(WinUI `MinItemHeight`) |
| `minRowSpacing` | `number` | `0` | UniformGrid 行间距下限 px(WinUI `MinRowSpacing`) |
| `minColumnSpacing` | `number` | `0` | UniformGrid 列间距下限 px(WinUI `MinColumnSpacing`) |
| `maximumRowsOrColumns` | `number` | 不限 | UniformGrid 每行项数上限(WinUI `MaximumRowsOrColumns`) |
| `isItemInvokedEnabled` | `boolean` | `false` | 启用项调用(WinUI `IsItemInvokedEnabled`):Enter / 双击触发 `itemInvoked`,单击仍走选择 |
| `displayMemberPath` | `string` | `''` | 对象项的显示字段路径(WinUI `DisplayMemberPath`),如 `'name'`;缺省按 `String(item)` 渲染 |
| `disabled` | `boolean` | `false` | 禁用态,项进入 Disabled 视觉状态且不可交互 |
| `#item` slot | `{ item: unknown; index: number; selected: boolean }` | — | 自定义项模板(WinUI `ItemTemplate` 的等价物),内容承载于 ItemContainer;缺省渲染显示文本 |
| `#empty-content` slot | `slot` | — | 空态内容(WinUI `EmptyContent`);缺省无内容,与 WinUI 一致 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

选择模型复用公共组合式 [useSelection](./_collection-infra.md#选择模型useselection)(`src/composables/useSelection.ts`):比较键为条目引用,与 WinUI `SelectionModel` 的「按索引跟踪」差异、模式语义表与 API 一览见基建文档。

## 属性(ItemContainer)

项容器同样提供独立组件(`src/components/ItemContainer.vue`,可直接 `import` 复用;与阶段 5 各控件一致,库出口 `src/index.ts` 的统一导出由合流阶段处理):

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `selected` | `boolean` | `false` | 是否选中(WinUI `IsSelected`) |
| `disabled` | `boolean` | `false` | 禁用(WinUI `IsEnabled`) |
| `multiSelect` | `boolean` | `false` | 多选模式(WinUI ItemContainer.SelectionMode=Multiple):右上角显示勾选框(PART_SelectionCheckbox),未选无勾选字形 |
| `selectionCheckMarkVisualEnabled` | `boolean` | `true` | 是否渲染勾选框(WinUI `SelectionCheckMarkVisualEnabled`) |
| `contentMargin` | `string` | `'0,0,0,0'` | 内容边距(WinUI `ContentMargin`,XAML Thickness:左,上,右,下) |
| `margin` | `string` | `'0,0,0,0'` | 项外边距(WinUI `Margin`) |

事件:`click`(转发原生 `MouseEvent`,禁用时不触发);`role`/`tabindex`/`data-*` 等经 `$attrs` 透传(ItemsView 以此挂 `role="option"`、roving tabindex 与索引标记)。

## 事件(ItemsView)

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectionChanged` | `(selected: unknown[], added: unknown[], removed: unknown[])` | 选中集合变化时(点击、键盘、程序化赋值均触发;`added`/`removed` 对照 WinUI `ItemsViewSelectionChangedEventArgs` 的 `AddedItems`/`RemovedItems`) |
| `itemInvoked` | `(e: { item, index, event })` | Enter / 双击项时触发,需 `isItemInvokedEnabled`(WinUI `ItemInvoked`) |

模板中监听写法:`@selection-changed="onSelectionChanged"`、`@item-invoked="onItemInvoked"`。

## 选择交互

| 操作 | None | Single | Multiple | Extended |
| --- | --- | --- | --- | --- |
| 单击 | 忽略 | 仅选该项 | 切换该项 | 仅选该项(重置) |
| Ctrl + 单击 | 忽略 | 仅选该项 | 切换该项 | 切换该项(保留其余) |
| Shift + 单击 | 忽略 | 仅选该项 | 追加 锚点~本项 区间 | **替换**为 锚点~本项 区间(锚点不动,可连续扩展) |
| 单击空白处 | — | 清空选择 | 清空选择 | 清空选择 |
| Ctrl + A | — | — | 全选 | 全选 |

选中判定按条目引用;向 `selectedItems` 程序化写入同样触发 `selectionChanged`。切换 `selectionMode` 不自动清空选择(useSelection 约定;`None` 下原语一律无操作),与 WinUI 的差异见基建文档。

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `←` `→` `↑` `↓` | 按几何位置移动焦点(适配任意布局);Single 模式随动选择,多选模式 `Shift`+方向键自锚点扩展区间 |
| `Home` / `End` | 移动到首 / 末项(Single 模式随动选择) |
| `Space` | 选择/切换当前聚焦项(Multiple 切换,Single/Extended 选中) |
| `Ctrl + Space` | 切换当前聚焦项(Extended) |
| `Enter` / 双击 | 调用当前项(`itemInvoked`,需 `isItemInvokedEnabled`;对照官方示例「Hit the Enter key, double-click or double-tap an item to invoke it.」) |
| `Ctrl + A` | 全选(Multiple / Extended) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiItemsView from '@/components/ItemsView.vue'

interface Photo { title: string; likes: number; image: string }
const photos = ref<Photo[]>(/* ... */)

function onSelectionChanged(selected: unknown[], added: unknown[], removed: unknown[]) {
  console.log(`已选 ${selected.length} 项`, added, removed)
}
</script>

<template>
  <WuiItemsView
    :items="photos"
    layout="UniformGrid"
    selection-mode="Multiple"
    :min-item-width="150"
    :min-item-height="112"
    :min-row-spacing="5"
    :min-column-spacing="5"
    :maximum-rows-or-columns="4"
    is-item-invoked-enabled
    @selection-changed="onSelectionChanged">
    <template #item="{ item }">
      <img :src="(item as Photo).image" :alt="(item as Photo).title" />
    </template>
    <template #empty-content>
      <span>没有可显示的照片</span>
    </template>
  </WuiItemsView>
</template>
```

## 与 WinUI 的差异

`generic.xaml`(WinUI 2/dxaml 快照)没有 ItemsView / ItemContainer 模板段;ItemContainer 的视觉自 FIX14 起逐键对照 WinUI 3 在册源 `controls/dev/ItemContainer/ItemContainer.xaml` + `ItemContainer_themeresources.xaml` + `controls/dev/CommonStyles/Common_themeresources_any.xaml` / `CheckBox_themeresources.xaml` 复刻,以下仅记录源缺值或刻意保留的差异:

1. **ControlCornerRadius=4** → `--wui-hyperlink-focus-rect-corner-radius`(站内唯一的 4px 圆角 token,与源 ControlCornerRadius 同值)。
2. **Subtle*/ControlSolid*/ControlOnImage*/ControlStrongStroke* design-layer token**:theme.css 仅抽取 generic.xaml,未生成该组 token;组件按 `Common_themeresources_any.xaml` 源值在组件内承载(同 ProgressBar/Slider/InfoBadge 惯例),字节序按 XAML AARRGGBB → CSS RRGGBBAA 翻转。悬停填充 = SubtleFillColorSecondary(#09000000/#0FFFFFFF)、按压 = SubtleFillColorTertiary(#06000000/#0AFFFFFF);悬停/按压**无描边**(ItemContainerPointerOverBorderBrush = SubtleFillColorTransparentBrush)。
3. **选中视觉**(对照 ItemContainer.xaml SelectedNormal):填充保持透明(ItemContainerSelectedBackground = SubtleFillColorTransparentBrush);选择视觉由 3px `AccentFillColorDefaultBrush` 外环(浅 = SystemAccentColorDark1,深 = SystemAccentColorLight2,经 theme-hooks 系统色钩子)+ 1px `ControlSolidFillColorDefault`(#FFFFFF/#454545)内描边(PART_CommonVisual 内缩 ItemContainerSelectedInnerMargin=2)承担。
4. **Multiple 勾选框**(PART_SelectionCheckbox + ItemContainerSelectionCheckboxStyle):右上角(Margin `4,-2` + Right/Top 对齐)、20×20、CornerRadius=4;未选底色 = ControlOnImageFillColorDefault(#C9FFFFFF/#B31C1C1C)、描边 = ControlStrongStrokeColorDefault(#72000000/#8BFFFFFF)1px、**无勾选字形**(AnimatedIcon State=NormalOff);已选底/描边 = AccentFillColorDefault + 字形色 TextOnAccentFillColorPrimary(#FFFFFF/#000000)。对勾字形以 12px SVG 路径近似 AnimatedAcceptVisualSource。勾选动画:源 `CheckGlyph` 为 `controls:AnimatedIcon` + `AnimatedAcceptVisualSource`(State `NormalOff`→`NormalOn`);**源为 LottieGen 编译资产,原始 `.json` 不在 CK 快照内**,Web 以 `stroke-dashoffset` 描绘 + `opacity` 淡入复刻,时长取源 `c_durationTicks`(`AnimatedAcceptVisualSource.cpp` L105 = **266.67ms**),缓动 `linear`。
5. **Disabled 不透明度**:ItemContainerDisabledOpacity = 0.3(整项 Opacity;Disabled 态同时折叠选中外环)。
6. **焦点框**:系统双层焦点框以「2px 内圈阴影 + 1px 外圈」近似,复用站内系统焦点视觉 token(与站内其他项容器一致)。
7. **布局能力面**:`layout` 仅 `Stack` / `UniformGrid`;WinUI 3 的 `LinedFlowLayout`(及其 `ItemsStretch`/`ItemsJustification` 等参数)未复刻——布局纯函数层已支持 justification/stretch,需要时可在 `src/utils/collectionLayouts.ts` 之上扩展(见[集合公共基建](./_collection-infra.md))。
8. **虚拟化与布局测量**:WinUI ItemsView 经 ItemsRepeater/ScrollView 虚拟化;本实现为非虚拟化 CSS 载体(条目少至千级无感)。UniformGrid 的每行/列项数按**根滚动容器(视口)的实测尺寸**决定(挂载时同步取 `clientWidth/Height`,ResizeObserver 增量维护;`scrollbar-gutter: stable` 使滚动条出现/消失不影响测宽)——刻意不测 items-host 自身,避免固定轨道 + `min-width: fit-content` 把布局输出反馈进「可用宽」而自锁单行/满列;WinUI 同为「视口可用宽 → itemsPerLine」语义,`scrollbar-gutter` 不支持的浏览器在极端尺寸下可能震荡,属优雅降级。万级列表可待 ItemsRepeater 接入(`computeVisibleRange` 接口已在基建层预留)。
9. **SelectedItems 双向**:WinUI `SelectedItems` 是只读 `IReadOnlyList<object>`;本实现按站内约定开放 `v-model:selected-items`(与 ListView/GridView 同约定)。
10. **数据源**:仅接受数组(WinUI 支持 `IEnumerable` / 增量加载 `ItemsSourceView`);分页/增量加载由使用者自行拼接数组。

## 互链

- 演示页源码:[demo/pages/ItemsViewPage.vue](../../demo/pages/ItemsViewPage.vue)
- 组件源码:`src/components/ItemsView.vue`、`src/components/ItemContainer.vue`
- 集合公共基建(布局器 + 选择模型):[wiki/controls/_collection-infra.md](./_collection-infra.md)
- 同族控件:[ListView](./ListView.md) · [GridView](./GridView.md)
