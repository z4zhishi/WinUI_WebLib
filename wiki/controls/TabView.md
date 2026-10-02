# TabView

> 在线示例:[/#/tabview](/#/tabview) · 演示页源码:[demo/pages/TabViewPage.vue](../../demo/pages/TabViewPage.vue)

## 概述

TabView(标签页控件)为用户提供一组**文档式标签**:点击标签条切换页面、按加号按钮新建、按每页的 X 关闭(closing 可取消,支持 Deferral 异步判定),典型场景是多文档界面与浏览器式标签。每个标签页是一个 `TabViewItem`(页头 + 内容),声明式写在 `<WuiTabView>` 默认 slot 下;也支持响应式数组 `v-for` 动态增删(增删后下标自动收敛到有效区间)。视觉按 `CK/WinUI-Reference/controls/dev/TabView/TabView.xaml`(generic.xaml 中 `TargetType="TabView"` / `TabViewItem` 段的控件源文件)复刻:标签 MinHeight 32、字号 12、上圆角 8px(OverlayCornerRadius 仅上两角),选中态底色 `SolidBackgroundFillColorTertiary` + 1px 上/左/右边框 + SemiBold 前景并截断标签条底线,分隔线(DividerStroke)在悬停/选中时隐藏;关闭按钮 32×24(字形 E711)、加号按钮 32×24(字形 E710)、滚动按钮(字形 EDD9/EDDA)三态色齐全。

官方文档:

- [TabView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.tabview)
- [TabView 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/tab-view)
- [Show multiple views for an app](https://learn.microsoft.com/windows/apps/design/layout/show-multiple-views)

## 属性(TabView)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `selectedIndex` (v-model) | `number` | `0` | 当前选中页下标(WinUI `SelectedIndex`),双向绑定;越界值自动收敛到有效区间 |
| `tabWidthMode` | `'SizeToContent' \| 'Equal' \| 'Compact'` | `'Equal'` | 标签宽度模式(WinUI `TabWidthMode` 三模式,源 `TabView.idl` 以 `[MUX_DEFAULT_VALUE]` 声明默认 `Equal`):`Equal` 等分剩余宽度(clamp 100–240px)、`SizeToContent` 内容自适应(MaxWidth 240px)、`Compact` 非选中仅显示图标 |
| `isAddTabButtonVisible` | `boolean` | `true` | 是否显示加号按钮(WinUI `IsAddTabButtonVisible`) |
| `canReorderTabs` | `boolean` | `true` | 是否允许拖拽重排标签(WinUI `CanReorderTabs`);重排作用于组件内部展示顺序(见差异说明) |
| `closeButtonOverlayMode` | `'Auto' \| 'Always' \| 'OnHover'` | `'Auto'` | 关闭按钮显隐模式(WinUI `CloseButtonOverlayMode`):`OnHover` 仅悬停或选中时显示,`Auto`/`Always` 恒显(对照源 `UpdateCloseButton`,两者同路径) |
| `disabled` | `boolean` | `false` | 禁用(WinUI `IsEnabled=false`):标签不可点,加号/关闭/滚动按钮与键盘全部失效 |
| `closeButtonAriaLabel` | `string` | `'Close'` | 关闭按钮的 aria-label,可本地化覆盖 |
| `addButtonAriaLabel` | `string` | `'New tab'` | 加号按钮的 aria-label,可本地化覆盖 |

## 属性 / Slot(TabViewItem)

| 项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `header` | `string` | `undefined` | 页头文本(WinUI `Header` 的 string 用法),渲染进标签条 |
| `icon` | `string` | `undefined` | 图标字形(Segoe Fluent Icons 码点,如 `'\uE8A5'`;WinUI `IconSource` 的 FontIcon 用法简化) |
| `isClosable` | `boolean` | `true` | 是否可关闭(WinUI `IsClosable`):`false` 时关闭按钮隐藏、Ctrl+W 不作用于该页 |
| `#header` slot | `—` | `—` | 自定义页头内容(WinUI `HeaderTemplate` 的等价),优先于 `header` prop |
| 默认 slot | `—` | `—` | 页面内容;非选中页仅收起不销毁,切换间组件状态保留 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `addTabButtonClick`(TabView) | `()` | 点击加号按钮时;应用负责向数据源追加(对照官方示例 `TabItems.Add`) |
| `tabCloseRequested`(TabView) | `(e: { index: number; item: unknown })` | 关闭流程提交后(closing 未被取消且 Deferral 完成)触发;应用负责移除该页(对照官方示例 `TabItems.Remove(args.Tab)`) |
| `selectionChanged`(TabView) | `(e: { index: number; item: unknown })` | 选中页变化时(点击 / Enter/Space / Ctrl+Tab / 程序化;初始挂载不触发) |
| `closing`(TabViewItem) | `(e: { cancel: boolean; getDeferral(): { complete(): void } })` | 关闭发起时:e.cancel = true 取消;调用 e.getDeferral() 暂缓提交,异步判定后 complete() 放行(WinUI `Closing` + `Deferral` 的 Web 简化) |
| `update:selectedIndex` | `(value: number)` | `v-model:selected-index` 双向绑定更新 |

## 键盘交互

| 按键 | 行为 |
| --- | --- |
| `←` / `→`(焦点在标签条) | 移动标签焦点(端点截停;源 `SingleSelectionFollowsFocus=False`,焦点移动不联动选中) |
| `Enter` / `Space`(焦点在标签上) | 选中当前聚焦的标签 |
| `Home` / `End`(焦点在标签条) | 焦点跳到第一个 / 最后一个标签(Web 增强) |
| `Ctrl` + `Tab` / `Ctrl` + `Shift` + `Tab` | 切换到下 / 上一页(焦点随动;浏览器通常保留 Ctrl+Tab 给自身换页,可能无法拦截) |
| `Ctrl` + `W` | 关闭当前选中页(仅 isClosable 时;对照官方键盘加速器示例;浏览器通常保留 Ctrl+W,可能无法拦截) |

## Slot(TabView)

| Slot | 说明 |
| --- | --- |
| 默认 slot | 标签页集合:每个 `<WuiTabViewItem header="…">` 子项即一页,支持响应式数组 `v-for` 动态增删 |
| `#tab-strip-header` | 标签条左侧内容(WinUI `TabStripHeader`) |
| `#tab-strip-footer` | 标签条右侧内容(WinUI `TabStripFooter`) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiTabView from '@/components/TabView.vue'
import WuiTabViewItem from '@/components/TabViewItem.vue'

const selectedIndex = ref(0)
const docs = ref([
  { id: 0, header: 'Document 0' },
  { id: 1, header: 'Document 1' },
])

function addDocument() {
  docs.value.push({ id: docs.value.length, header: `Document ${docs.value.length}` })
  selectedIndex.value = docs.value.length - 1
}

function onTabCloseRequested(e: { index: number; item: unknown }) {
  // 官方示例语义:TabItems.Remove(args.Tab) —— 按 item 定位并从数据源移除
  docs.value.splice(e.index, 1)
}
</script>

<template>
  <WuiTabView
    v-model:selected-index="selectedIndex"
    @add-tab-button-click="addDocument"
    @tab-close-requested="onTabCloseRequested"
  >
    <WuiTabViewItem v-for="doc in docs" :key="doc.id" :header="doc.header">
      {{ doc.header }} 的内容。
    </WuiTabViewItem>
  </WuiTabView>
</template>
```

closing 可取消(Deferral 简化):

```vue
<WuiTabView>
  <!-- 直接取消:args.cancel = true -->
  <WuiTabViewItem header="受保护页" @closing="(e) => (e.cancel = true)">…</WuiTabViewItem>

  <!-- 异步判定:getDeferral() → complete() -->
  <WuiTabViewItem header="确认后关闭" @closing="onClosing">…</WuiTabViewItem>
</WuiTabView>

<script setup lang="ts">
function onClosing(e: { cancel: boolean; getDeferral(): { complete(): void } }) {
  const deferral = e.getDeferral()
  showConfirmDialog().then((ok) => {
    if (ok) deferral.complete()
  })
}
</script>
```

## 与 WinUI 的差异说明

| 项 | WinUI 源行为 | 本组件实现 |
| --- | --- | --- |
| 关闭流 | 点击 X(或 TabViewItem `RequestClose`)→ `Closing`(可取消 + Deferral)→ `TabCloseRequested`;应用从 `TabItems` 移除 | 一致:closing(cancel/Deferral 简化实现)→ `tabCloseRequested { index, item }`;应用按 `item` 从响应式数组移除 |
| 宽度模式第三值 | `TabWidthMode` 枚举为 `SizeToContent` / `Equal` / `Compact`(Compact 仅在非选中页生效,源 `UpdateWidthModeVisualState`) | 一致实现三模式;部分派发材料所写 "SizeToHeader" 在源与官方 Gallery 中不存在,以源为准记为 Compact |
| 宽度模式默认值 | 源 `TabView.idl` L105 以 `[MUX_DEFAULT_VALUE("winrt::TabViewWidthMode::Equal")]` 声明默认 **Equal**(Microsoft Learn API 文档同) | 一致:组件默认 `'Equal'` |
| 关闭按钮显隐 | `CloseButtonOverlayMode`:源 `UpdateCloseButton` 中 `OnPointerOver` → 悬停或选中显示;`Auto`/`Always` 走 default 分支恒显 | 一致;`OnHover` 即源 `OnPointerOver` 的别名 |
| 拖拽重排 | 源由内部 `TabViewListView`(`CanReorderItems`)直接改写 `TabItems` 集合;动效:拖动中标签 Opacity 0.80 @240ms(`Reordering`)、被悬停目标 Opacity 0.50 @240ms(`ReorderingTarget`)、悬停方向提示 `DragOverThemeAnimation` 位移 10px(`ReorderHintStates`,水平标签条仅 Left/Right),离开 0.2s 恢复 | Pointer 指针拖拽复刻(headless Chrome 实测 HTML5 DnD 事件不随真实鼠标序列触发);动效逐键对源;插入指示线为源 ListView 实时换位的 Web 等价指示;重排作用于**组件内部展示顺序** —— 声明式子项的数据源顺序不变,建议子项带稳定 `key` 保证重排跨渲染稳定(无 key 的子项回退天然顺序,父组件重渲染后重排可能复位);选中项跟随被拖标签;事件 `tabDragStarting` / `tabDragCompleted` / `tabDroppedOutside`(条外松手) |
| `TabItemsSource` / `TabItemTemplate` | 数据源 + DataTemplate 自动生成 TabViewItem | 未实现;响应式数组 `v-for` + 声明式 `WuiTabViewItem` 即等价用法 |
| `SelectedItem` 双向 | 与 `SelectedIndex` 联动 | 未提供;以 `selectedIndex` 为准(WinUI 侧两者等价可换算) |
| `TabStripHeader/Footer` | 标签条左右附加内容区 | 提供 `#tab-strip-header` / `#tab-strip-footer` slot |
| 溢出滚动 | ScrollViewer + RepeatButton 滚动按钮(按住连滚) | 溢出时显示左右滚动按钮(32×24、字形 EDD9/EDDA、端点禁用),单击步进 80% 视口;滚轮纵向增量转横向滚动;Web 增强:隐藏原生滚动条 |
| 键盘加速器 | `KeyboardAccelerator`(Ctrl+T/Ctrl+W/Ctrl+1..9)由应用在 Gallery 示例中挂接 | 控件内置 Ctrl+Tab / Ctrl+Shift+Tab 切换与 Ctrl+W 关闭;浏览器通常保留 Ctrl+Tab/Ctrl+W 给自身标签页,无法拦截时以方向键 + Enter/Space 兜底 |
| 颜色 token | `TabViewItemHeaderBackgroundSelected` = SolidBackgroundFillColorTertiary(#F9F9F9/#282828)等 | theme.css 未提取 TabView*/SolidBackgroundFill*/SubtleFill* 系列基色,取最近似 token 并注记:Selected 底色 → `--wui-flyout-presenter-background`(#F2F2F2/#2B2B2B);悬停/按下 SubtleFill → `--wui-grid-view-item-background-pointer-over/pressed`;TabViewBorderBrush/分隔线(CardStroke/DividerStroke)→ `--wui-system-control-background-base-low`;TextFill 系列 → `--wui-application-secondary-foreground-theme`(Secondary/Tertiary)、`--wui-default-text-foreground-theme`(Primary)、`--wui-toggle-switch-content-foreground-disabled`(Disabled);圆角 ControlCornerRadius → `--wui-hyperlink-focus-rect-corner-radius`、OverlayCornerRadius → `var(--wui-popup-corner-radius, 8px)`(theme.css 未提取该 token,8px 为回退值) |
| 图标 | `IconSource` 体系(FontIconSource/SymbolIconSource/BitmapIconSource) | `icon` prop 接收 Segoe Fluent Icons 字形(FontIcon 复刻);BitmapIcon 彩色图标用法未实现 |
| 拖拽跨窗口 tear-out | `TabView` 支持标签拖出成新窗口(Windowing sample) | 未实现(Web 无多窗口宿主) |
| 字体族 | `XamlAutoFontFamily` | 回退浏览器默认字体(项目 R1 约定,不加载 Segoe 字体);图标字形依赖本机 'Segoe Fluent Icons'/'Segoe MDL2 Assets' 字体栈 |

## 相关链接

- 演示页:`demo/pages/TabViewPage.vue`(路由 `/#/tabview`)
- 组件源码:`src/components/TabView.vue`、`src/components/TabViewItem.vue`
- 姊妹控件:[Pivot](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.pivot)(标题行透视分页)、[NavigationView](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.navigationview)(应用级导航)
