# CompactSizing

> 在线示例:[/#/compactsizing](/#/compactsizing)

## 概述

紧凑尺寸(Compact Sizing)是 WinUI 的密度体系:通过在**应用、页面或控件级**引入一份样式资源(`DensityStyles/Compact.xaml` 资源字典),把一组主题资源键(最小高度、内边距等)整体切换为更紧凑的取值,从而创建信息密度更高、更小型的应用界面。它不是某个控件,而是一份"密度样式指南"——影响的控件包括官方清单所列:ListView、TextBox、PasswordBox、AutoSuggestBox、ComboBox、DatePicker、TimePicker、TreeView、NavigationView、MenuBar。

关键特征:**紧凑密度不缩字号**(`ControlContentThemeFontSize` 保持 14),只压缩高度与内边距;标准密度下输入类控件高 32px、列表项高 40px,紧凑密度下分别降为 24px 与 32px。

官方资料:

- [Spacing - 紧凑密度设计指南](https://learn.microsoft.com/windows/apps/design/style/spacing)
- [WinUI Gallery CompactSizing 示例](https://github.com/microsoft/WinUI-Gallery)(本站示例页对照 `Samples/CompactSizing/CompactSizingPage.xaml` 与 `SampleSupport/SamplePages/SampleStandard|CompactSizingPage.xaml`)

## 密度资源对照表

紧凑值取自 WinUI 源 `controls/dev/dll/DensityStyles/Compact.xaml`;标准值取自 `generic.xaml` 与各控件主题资源(`ComboBox_themeresources.xaml`、`TreeView_themeresources.xaml`、`NavigationView_themeresources.xaml`、`DatePicker/TimePicker_themeresources.xaml`)。

| 资源键(ResourceKey) | 标准值 | 紧凑值 | 影响范围 |
| --- | --- | --- | --- |
| `TextControlThemeMinHeight` | 32 | 24 | TextBox / PasswordBox / AutoSuggestBox / ComboBox 等输入类宿主最小高度 |
| `TextControlThemePadding` | 10,3,6,6 | 2,2,6,1 | 同上(内容区内边距,Web 侧为 CSS `padding: 2px 6px 1px 2px`) |
| `ComboBoxMinHeight` | 32 | 24 | ComboBox 关闭态最小高度 |
| `ComboBoxPadding` | 12,5,0,7 | 12,1,0,3 | ComboBox 关闭态内容内边距 |
| `ComboBoxEditableTextPadding` | 11,5,38,6 | 10,0,30,0 | 可编辑 ComboBox 文本内边距 |
| `ListViewItemMinHeight` | 40 | 32 | ListView 项 / AutoSuggestBox 候选行 |
| `TreeViewItemMinHeight` | 28 | 24 | TreeView 节点行 |
| `DatePickerHostPadding` | 0,3,0,6 | 0,1,0,2 | DatePicker 宿主按钮日期文本 |
| `DatePickerHostMonthPadding` | 9,3,0,6 | 9,0,0,1 | DatePicker 宿主按钮月份文本 |
| `TimePickerHostPadding` | 0,3,0,6 | 0,1,0,2 | TimePicker 宿主按钮时间文本 |
| `NavigationViewItemOnLeftMinHeight` | 36 | 32 | NavigationView 左侧导航项 |
| `ControlContentThemeFontSize` | 14 | 14(不变) | 全部控件文本(紧凑密度不缩字号) |

> 注意"40px vs 32px"与"32px vs 24px"两组数字的适用对象:**40 → 32** 指列表类项高(ListViewItemMinHeight);**32 → 24** 指输入类控件高(TextControlThemeMinHeight / ComboBoxMinHeight)。官方示例页的口头表述"标准 40px / 紧凑 32px"以列表项高为准。

## 本站控件紧凑态支持清单

本库控件默认只实现标准密度。逐控件核对结论如下:

| 控件 | 紧凑实现方式 | 状态 |
| --- | --- | --- |
| AppBarButton | `isCompact` prop(WinUI `IsCompact`:仅图标、隐藏标签,**单控件机制**,与密度体系并行) | 已支持(见 [AppBarButton](./AppBarButton.md)) |
| TextBox / PasswordBox / AutoSuggestBox | 密度类 `.wui-density-compact`(演示页覆盖;组件暂无 density prop) | 演示可用 / 待内置 |
| ComboBox | 密度类(高 32→24,内边距 12,5,0,7→12,1,0,3) | 演示可用 / 待内置 |
| ListView | 密度类(项高 40→32) | 演示可用 / 待内置 |
| TreeView | 密度类(节点行 28→24) | 演示可用 / 待内置 |
| DatePicker / TimePicker | 官方紧凑作用于**宿主按钮**(HostPadding);本站为常驻展开板、无宿主形态 | 待办(形态差异) |
| MenuBar | 官方支持清单含 MenuBar,但 `Compact.xaml` 未提供 MenuBar 专属键(`MenuBarHeight=40` 未被覆盖) | 待办(需对照控件源核实) |
| NavigationView | `NavigationViewItemOnLeftMinHeight` 36→32;组件未暴露密度开关 | 待办 |
| Button / CheckBox / Slider / RadioButton 等 | `Compact.xaml` 未覆盖其资源键,标准密度下保持不变 | 无需支持 |

**待办**(后续波次):

1. 给输入类 / 列表类控件(TextBox、PasswordBox、AutoSuggestBox、ComboBox、ListView、TreeView)内置 `density?: 'standard' | 'compact'` prop,或在库级样式提供正式的 `.wui-density-compact` 工具类,替代演示页内的 scoped 覆盖;
2. DatePicker / TimePicker 增加宿主按钮形态(点击展开飞出层),届时接入 `DatePickerHostPadding` 系紧凑资源;
3. 核实官方 MenuBar 的紧凑生效路径后,决定 MenuBar / NavigationView 的密度开关。

## 基础用法

WinUI 原生:在应用(App.xaml)、页面或控件级合并紧凑资源字典即可,作用域即资源所在层级:

```xml
<Page.Resources>
    <ResourceDictionary Source="ms-appx:///Microsoft.UI.Xaml/DensityStyles/Compact.xaml" />
</Page.Resources>
```

官方示例还配合收紧表头边距(紧凑页把 `TextBoxTopHeaderMargin` / `PasswordBoxTopHeaderMargin` 覆盖为 `0,2,0,2`)。

Web(本库):当前以**容器级密度类**复刻同一效果(演示页 `demo/pages/CompactSizingPage.vue` 的 scoped 实现,逐条对照上表的资源键取值):

```html
<div class="wui-density-compact">
  <WuiTextBox header="First Name:" />
  <WuiPasswordBox header="Password:" />
  <WuiComboBox :items="['Apples', 'Bananas']" />
  <WuiListView :items="['Item 1', 'Item 2']" />
</div>
```

密度类覆盖的取值(与上表一一对应):

```css
.wui-density-compact :deep(.wui-text-box-border) { min-height: 24px; }        /* TextControlThemeMinHeight */
.wui-density-compact :deep(.wui-text-box-input)  { padding: 2px 6px 1px 2px; } /* TextControlThemePadding */
.wui-density-compact :deep(.wui-combo-box-input) { min-height: 24px; }        /* ComboBoxMinHeight */
.wui-density-compact :deep(.wui-list-view-item)  { min-height: 32px; }        /* ListViewItemMinHeight */
.wui-density-compact :deep(.wui-treeview-item-row) { min-height: 24px; }      /* TreeViewItemMinHeight */
```

与密度体系并行的**单控件紧凑**:AppBarButton 的 `isCompact` prop 只影响自身(隐藏 Label、仅剩图标,对应 `ApplicationViewStates` 的 Compact 视觉态),不依赖 Compact.xaml:

```html
<WuiAppBarButton label="Save" is-compact />
```

## 与 WinUI 的差异说明

- **作用机制**:WinUI 通过 `ResourceDictionary` 在主题层整体换值;Web 侧当前用容器类 + `:deep()` 覆盖组件 scoped 样式实现,等值但非同构,组件尚未内置 density prop(见待办)。
- **DatePicker / TimePicker**:WinUI 紧凑压缩的是宿主按钮(Day/Month/Year 文本块的内边距);本站两控件为常驻展开板形态,无宿主按钮,密度类仅覆盖滚轮项内边距(项高 `DatePickerFlyoutPresenterItemHeight=40` 官方同样未覆盖),视觉差异细微。
- **MenuBar**:官方支持清单包含 MenuBar,但 `Compact.xaml` 未提供 MenuBar 专属键,本站 MenuBar 保持 40px 高,列为待办核实项。
- **可编辑 ComboBox**:本站可编辑文本内边距按组件实现的 `10,3,30,5` 取紧凑值 `10,0,30,0`(右 30px 让位箭头区不变);`ComboBoxEditableTextPadding` 的标准值 11,5,38,6 与本站实现存在 1-2px 的取值差,已在源注释中标注。
- **ListView 项内边距**:WinUI 项内容 Padding `12,0,12,0` 在紧凑下不变,本站同样不动,仅压缩项高。

---

演示页源码:[demo/pages/CompactSizingPage.vue](../../demo/pages/CompactSizingPage.vue)
