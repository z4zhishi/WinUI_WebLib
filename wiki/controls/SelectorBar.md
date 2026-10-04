# SelectorBar

> 在线示例:[/#/selectorbar](/#/selectorbar) · 演示页源码:[demo/pages/SelectorBarPage.vue](../../demo/pages/SelectorBarPage.vue)

## 概述

SelectorBar(选择栏)让用户在一小组固定选项间**单选切换**,以改变当前显示的内容 —— 是被弃用的 Pivot 的 Windows 11 推荐替代控件(Top NavigationView 的轻量版)。每个选项是一个 `SelectorBarItem`(文本 + 可选图标),声明式写在 `<WuiSelectorBar>` 默认 slot 下,支持响应式数组 `v-for` 动态增删。视觉按 `CK/WinUI-Reference/controls/dev/SelectorBar/SelectorBar.xaml` + `SelectorBar_themeresources.xaml` 复刻(该控件不在旧版 `generic.xaml` 内):选项内边距 12,10,12,7、圆角 4px、14px 字号,背景全态透明,交互只变前景色;**选中项底部展开 16×3 的强调色指示条**(4px 宽矩形 ScaleX 1→4,自中点向右展开,167ms),图标按 0.8 缩放并带 -2px 光学对齐负边距。整条空间不足时横向滚动(源模板内是 ItemsView + 水平 StackLayout 的 ScrollView 语义)。

官方文档:

- [SelectorBar - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.selectorbar)
- [SelectorBarItem - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.selectorbaritem)
- [SelectorBar 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/selector-bar)

## 属性(SelectorBar)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `selectedIndex` (v-model) | `number` | `0` | 当前选中下标(**Web 增强**,WinUI 无 `SelectedIndex`);`-1` = 无选中;越界值自动收敛到有效区间 |
| `selectedItem` (v-model) | `unknown` | `undefined` | 当前选中项(WinUI `SelectedItem`)。读取到的是该项 `SelectorBarItem` 的 VNode;外部写入按「引用 → `key`」两级匹配定位,匹配不到忽略;写 `null` 取消选中(源规约) |
| `disabled` | `boolean` | `false` | 禁用整栏(WinUI `IsEnabled = false`):全部项呈 Disabled 色、不可聚焦,键盘失效 |

## 属性(SelectorBarItem)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | `undefined` | 项文本(WinUI `Text`);未设置则只渲染图标/自定义内容(纯图标项建议配 `aria-label`) |
| `icon` | `string` | `undefined` | 项图标,取 WinUI `Symbol` 枚举名(如 `Clock` / `Share` / `Favorite`),即 `Icon="Clock"` 的便利写法;自定义图标用 `#icon` slot |
| `isSelected` (v-model) | `boolean` | `false` | 是否选中。在 SelectorBar 内由宿主单选仲裁;声明式 `is-selected` 等价 WinUI `IsSelected="True"`(多个同时声明时后登记者胜);独立使用时自管 |
| `disabled` | `boolean` | `false` | 禁用单个项:呈 Disabled 色、不可聚焦,方向键跳过(与栏级 `disabled` 叠加) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectionChanged`(SelectorBar) | `(payload: { item: VNode \| null; index: number })` | 选中变化时(点击 / 左右方向键 / 程序化修改;对照 WinUI `SelectionChanged`,初始挂载不触发;`item = null`/`index = -1` 表示选中项被移除后的取消选中) |
| `update:selectedIndex` | `(value: number)` | `v-model:selected-index` 双向绑定更新 |
| `update:selectedItem` | `(value: unknown)` | `v-model:selected-item` 双向绑定更新 |
| `update:isSelected`(Item) | `(value: boolean)` | `v-model:is-selected` 双向绑定更新(独立使用时;宿主内写入 `true`/`false` 会请求宿主选中/取消) |

## 键盘交互

| 按键 | 行为 |
| --- | --- |
| `←` / `→`(焦点在选项上) | 焦点移到相邻可用项,**选中随焦点移动**(源 ItemsView 导航语义);端点截停不回绕;RTL 下方向翻转;跳过禁用项 |
| `Home` / `End` | 跳到第一个 / 最后一个可用项,选中随焦点(源规约) |
| `Space` / `Enter` | 选中当前聚焦项(原生 button 语义) |
| `Tab` | 进入时焦点落在选中项(roving tabindex;无选中时落在首项);栏自身不进 Tab 序(源 `IsTabStop=False` + `TabNavigation=Once`) |

## Slot

| Slot | 说明 |
| --- | --- |
| SelectorBar 默认 slot | 选项集合:每个 `<WuiSelectorBarItem>` 子项即一选项,支持响应式数组 `v-for` 动态增删;选中项被移除时取消选中(源规约 `SelectedItem` 置 null) |
| SelectorBarItem 默认 slot | 自定义内容(WinUI `ItemContainer.Child` 等价),渲染在图标/文本之前 |
| SelectorBarItem `#icon` | 自定义图标内容(FontIcon / SymbolIcon / PathIcon 等任意 IconElement),优先于 `icon` 属性 |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiSelectorBar from '@/components/SelectorBar.vue'
import WuiSelectorBarItem from '@/components/SelectorBarItem.vue'

const selectedIndex = ref(0)

function onSelectionChanged(e: { item: unknown; index: number }) {
  console.log('SelectionChanged', e.index)
}
</script>

<template>
  <!-- 官方示例 1:图标 + 文字混排;模板里按 WinUI 习惯写 PascalCase 亦可 -->
  <WuiSelectorBar
    v-model:selected-index="selectedIndex"
    @selection-changed="onSelectionChanged"
  >
    <WuiSelectorBarItem icon="Clock" text="Recent" />
    <WuiSelectorBarItem icon="Share" text="Shared" />
    <WuiSelectorBarItem icon="Favorite" text="Favorites" is-selected />
  </WuiSelectorBar>
</template>
```

纯文字项 + 内容切换(官方示例 2/3 的用法):

```vue
<WuiSelectorBar v-model:selected-index="index">
  <WuiSelectorBarItem text="Page1" />
  <WuiSelectorBarItem text="Page2" />
  <WuiSelectorBarItem text="Page3" />
</WuiSelectorBar>
```

动态增删(响应式数组声明式组合;选中项被移除时自动取消选中):

```vue
<WuiSelectorBar v-model:selected-index="index">
  <WuiSelectorBarItem v-for="s in sections" :key="s.id" :text="s.title" />
</WuiSelectorBar>
```

## 与 WinUI 的差异说明

| 项 | WinUI 源行为 | 本组件实现 |
| --- | --- | --- |
| 前景色 token | `SelectorBarItemForeground*` = TextFillColorPrimary / Secondary / Tertiary / Disabled(定义于 CommonStyles/Common_themeresources_any.xaml) | PL11 已重定向到 Fluent:`--wui-text-fill-color-primary/secondary/tertiary/disabled`(精确同键);SelectedPointerOver/Pressed 均取 Secondary(同源口径) |
| 指示条填充 | `SelectorBarItemPillFill` = AccentFillColorDefaultBrush(浅色 = SystemAccentColorDark1 / 深色 = SystemAccentColorLight2) | PL11 直引 `--wui-accent-fill-color-default`(明暗随 token 自带);禁用指示条 `AccentFillColorDisabled` → `--wui-accent-fill-color-disabled`(浅 #37000000 / 深 #28FFFFFF) |
| 栏与项背景 | `SelectorBarBackground` / `SelectorBarItemBackground*` 全态 = SystemControlTransparentBrush / 透明 | PL11 改为 `--wui-control-fill-color-transparent`,交互只有前景色变化 |
| 指示条动画 | `SelectedNormal` 进入:Opacity 0→1 + ScaleX 1→4,167ms,KeySpline(0,0,0,1),CompositeTransform 以元素左上为原点(自中点向右展开至 16px) | 一致:CSS transition 同参数;差异:取消选中时指示条淡出为同参数动画,源为瞬切(单向 storyboard) |
| 焦点视觉 | `UseSystemFocusVisuals` + `FocusVisualMargin=-2`(焦点环比项大 2px) | 简化为 `:focus-visible` 贴边 2px outline(`--wui-system-control-focus-visual-primary`),不做 -2px 外扩 |
| ARIA 语义 | `SelectorBarItemAutomationPeer`:`AutomationControlType.ListItem`(ISelectionItemProvider + IInvokeProvider) | 按任务规格采用 WAI-ARIA tabs 模式:`role="tablist"` / `role="tab"` + `aria-selected` + roving tabindex |
| 键盘 | 源经 ItemsView 键盘处理:←/→(选中随焦点)、Home/End,端点截停;Tab 进入聚焦选中项 | 一致;`Space`/`Enter` 经原生 button 语义选中(源 IInvokeProvider 等价) |
| 溢出行为 | 模板内 ItemsView(水平 StackLayout)自带 ScrollView:超宽横向滚动,覆盖式(overlay)滚动条 | `overflow-x: auto` 等价;滚动条为浏览器默认样式,与 WinUI 覆盖式滚动条观感不同 |
| `RepositionThemeTransition` | 模板 Grid.ChildrenTransitions:项增删时其余项重排动画 | 未复刻(Web 侧项增删即位) |
| 内容切换动画 | 官方示例 2 用 Frame + SlideNavigationTransitionInfo 做页滑入动画 | SelectorBar 本体不承载内容;示例页以即时切换的面板等价呈现 |
| `SelectedItem` 双向 | 单向读取(SelectedItem 由选中态派生) | 读取一致(该项的 VNode);额外支持写入定位 —— VNode 每次父组件重渲染都会重建,故按「引用 → `key`」匹配,匹配不到忽略(建议以 `selectedIndex` 为主绑定) |
| `SelectedIndex` | WinUI 无此属性 | Web 增强便利属性(`v-model:selected-index`),与 `selectedItem` 联动;`-1` = 无选中 |
| 字体族 | `ContentControlThemeFontFamily`(XamlAutoFontFamily) | 回退浏览器默认字体(`inherit`),不加载 Segoe 字体(项目 R1 约定) |
| 高对比度主题 | `SelectorBar_themeresources.xaml` 含 HighContrast 字典(SystemColorHighlightColor 等) | 未实现独立高对比度档位,跟随站点浅/深两档主题 |

## 相关链接

- 演示页:`demo/pages/SelectorBarPage.vue`(路由 `/#/selectorbar`)
- 组件源码:`src/components/SelectorBar.vue`、`src/components/SelectorBarItem.vue`
- 姊妹控件:[Pivot](./Pivot.md)(被替代的旧控件)、[MenuBar](./MenuBar.md)(命令菜单栏)、[NavigationView](./NavigationView.md)(完整导航壳)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
