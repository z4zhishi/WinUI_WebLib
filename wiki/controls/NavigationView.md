# NavigationView

> 在线示例:[/#/navigationview](/#/navigationview) · 演示页源码:[demo/pages/NavigationViewPage.vue](../../demo/pages/NavigationViewPage.vue)

## 概述

NavigationView 控件通过**可折叠的导航菜单**,为应用的顶级区域提供常用的垂直布局:一侧是带汉堡按钮的导航窗格(菜单项、组头、分隔线、页脚项、窗格标题),另一侧是页头 + 内容卡。`paneDisplayMode` 支持 `Auto`(按宽度断点自适应)/ `Left`(展开窗格)/ `LeftCompact`(关闭时保留 48px 图标栏)/ `LeftMinimal`(窗格浮层)/ `Top`(48px 顶栏);`Auto` 按容器宽度断点(默认 1008 / 641,WinUI 默认阈值)在 Left 系三档间自动降级。它也是 WinUI 应用壳(hamburger + Frame)的标准骨架,内部由同项目的 SplitView 承载窗格开合(浮层模式支持遮罩点击、`Esc`、轻扫关闭)。本组件按 `CK/WinUI-Reference/controls/dev/NavigationView/NavigationView_themeresources.xaml` 与 `NavigationView.xaml` 的现代样式(WinUI 2.6+,Subtle/Acrylic 系)复刻。

官方文档:

- [NavigationView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.navigationview)
- [NavigationView 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/navigationview)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `paneDisplayMode` | `'Auto' \| 'Left' \| 'Top' \| 'LeftCompact' \| 'LeftMinimal'` | `'Auto'` | 窗格展示模式(WinUI `PaneDisplayMode`);Auto 按容器宽度 ResizeObserver 断点解析 |
| `isPaneOpen` (v-model) | `boolean` | `true` | 窗格开关状态(WinUI `IsPaneOpen`),双向绑定;Minimal 模式控制浮层开合 |
| `selectedItem` (v-model) | `string \| number \| null` | `null` | 选中项的 `tag` 值(WinUI `SelectedItem` 的 Web 标识,见差异节),`null` 为未选中 |
| `openPaneLength` | `number` | `320` | 展开态窗格宽度 px(WinUI `OpenPaneLength`) |
| `compactPaneLength` | `number` | `48` | 紧凑栏宽度 px(WinUI `CompactPaneLength` = `NavigationViewCompactPaneLength`) |
| `expandedModeThresholdWidth` | `number` | `1008` | Auto 模式 Left 断点(WinUI `ExpandedModeThresholdWidth` 默认值) |
| `compactModeThresholdWidth` | `number` | `641` | Auto 模式 LeftCompact 断点(WinUI `CompactModeThresholdWidth` 默认值) |
| `header` | `string` | `''` | 页头文本(WinUI `Header`);富内容用 `#header` slot |
| `paneTitle` | `string` | `''` | 窗格标题(WinUI `PaneTitle`);同时充当浮层窗格的缺省 `aria-label` |
| `menuItems` | `NavigationViewItemData[]` | `[]` | 数据驱动菜单项;提供 `#menu-items` slot 时被覆盖 |
| `footerMenuItems` | `NavigationViewItemData[]` | `[]` | 数据驱动页脚菜单项(WinUI `FooterMenuItems`,Top 模式右靠) |
| `paneBackground` | `string` | `''` | 窗格背景色(WinUI `PaneBackground`),任意 CSS 颜色;空串用 token 默认值 |
| `paneLabel` | `string` | `''` | 浮层窗格的无障碍名;缺省取 `paneTitle` |
| `menuNavLabel` | `string` | `'主导航'` | 主导航 `nav` 地标的无障碍名;同页多个 NavigationView 时应传入互不相同的区分性文案(landmark 唯一性) |
| `footerNavLabel` | `string` | `'页脚导航'` | 页脚导航 `nav` 地标的无障碍名;同页多个 NavigationView 时同上 |

`NavigationViewItemData` 字段:`tag`(选中标识)、`label`、`icon`(FontIcon 字形)、`children`(子项,仅数据驱动模式支持展开)、`selectsOnInvoked`(点击是否参与选中,默认 `true`)、`isHeader`(组头,同 NavigationViewItemHeader)、`isSeparator`(分隔线)、`disabled`。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `itemInvoked` | `(args: NavigationViewInvokeArgs)` | 条目被点击时触发(WinUI `ItemInvoked`,含 `selectsOnInvoked: false` 的纯展开项) |
| `selectionChanged` | `(args: NavigationViewSelectionChangedArgs)` | 选中项实际变化时触发,含程序化赋值 `v-model:selected-item`(WinUI `SelectionChanged` 同语义) |
| `paneOpened` | — | 窗格打开动画结束后(转发内嵌 SplitView,时机同 WinUI `PaneOpened`) |
| `paneClosing` | — | 窗格关闭动画开始前(WinUI `PaneClosing` 同序) |
| `paneClosed` | — | 窗格关闭动画结束后(WinUI `PaneClosed` 同时机) |

## Slot 与子组件

| Slot | 说明 |
| --- | --- |
| 默认 slot | 内容区(内容卡内、页头之下,对应 WinUI 控件内容) |
| `#menu-items` | 菜单区;内放 `<WuiNavigationViewItem>` 子组件(数据驱动 `menuItems` 被覆盖) |
| `#footer-menu-items` | 页脚菜单区,同上 |
| `#pane-footer` | 窗格底部区(WinUI `PaneFooter`,常放设置等固定入口) |
| `#header` | 富页头内容(覆盖 `header` 文本) |

`WuiNavigationViewItem`(同文件具名导出)—— NavigationViewItem 的 Web 复刻:图标 + 文本 + 选中指示条(pill),props:`tag` / `label` / `icon` / `disabled` / `selectsOnInvoked` / `depth`,或直接传 `entry` 数据对象。经 provide/inject 与宿主通信,脱离宿主可渲染但点击不产生选中/事件;子项展开仅数据驱动模式(`children`)支持。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiNavigationView, { WuiNavigationViewItem } from '@/components/NavigationView.vue'
import type { NavigationViewItemData } from '@/components/NavigationView.vue'

const isPaneOpen = ref(true)
const selected = ref<string | number | null>('home')

const menuItems: NavigationViewItemData[] = [
  { tag: 'home', label: '主页', icon: '\uE80F' },
  {
    tag: 'account',
    label: '账户',
    icon: '\uE77B',
    children: [
      { tag: 'mail', label: '邮件', icon: '\uE715' },
      { tag: 'calendar', label: '日历', icon: '\uE787' },
    ],
  },
  { isSeparator: true },
  { tag: 'docs', label: '文档选项', selectsOnInvoked: false, children: [{ tag: 'new', label: '新建' }] },
]

function onItemInvoked(args: { tag: string | number; label: string }): void {
  console.log('itemInvoked', args.tag)
}
</script>

<template>
  <!-- 数据驱动 -->
  <WuiNavigationView
    v-model:selected-item="selected"
    v-model:is-pane-open="isPaneOpen"
    pane-display-mode="Left"
    header="应用标题"
    pane-title="窗格标题"
    :menu-items="menuItems"
    @item-invoked="onItemInvoked">
    <!-- 内容区 -->
  </WuiNavigationView>

  <!-- slot + NavigationViewItem 子组件 -->
  <WuiNavigationView pane-display-mode="LeftCompact">
    <template #menu-items>
      <WuiNavigationViewItem tag="home" label="主页" icon="&#xE80F;" />
      <WuiNavigationViewItem tag="about" label="关于" />
    </template>
    <template #footer-menu-items>
      <WuiNavigationViewItem tag="settings" label="设置" icon="&#xE713;" />
    </template>
    <!-- 内容区 -->
  </WuiNavigationView>
</template>
```

## 无障碍

- 汉堡按钮为真实 `<button>`,带 `aria-expanded` 与 `aria-label="展开或折叠窗格"`;Space / Enter 原生激活。
- 菜单区为 `<nav aria-label="主导航">`(页脚区为「页脚导航」);条目为 `<button>`,选中项带 `aria-current="page"`,带子项的条目带 `aria-expanded`;禁用条目原生 `disabled`。
- Minimal(`LeftMinimal`)模式窗格为浮层,经内嵌 SplitView 按对话框语义处理(`role="dialog"` + `paneLabel`/`paneTitle` 作 `aria-label`,开时焦点移交、关时归还),遮罩点击 / `Esc` / 沿关闭方向轻扫均可关闭;关闭且非紧凑栏时窗格 `visibility: hidden` 移出焦点序。
- 选中指示条与展开箭头均为装饰元素(`aria-hidden`);`prefers-reduced-motion` 时指示条 600ms 编排(JS 通道,`useReducedMotion` 门控直接落位)与箭头旋转过渡(CSS 通道,animations.css 全局块)均趋近瞬时。
- 键盘方向键在菜单项间循环移动(WinUI 的 XY focus)暂未实现,条目按 Tab 序遍历,见差异节。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `CK/WinUI-Reference/controls/dev/NavigationView/NavigationView_themeresources.xaml`(现代样式)与 `NavigationView.xaml` 模板复刻。注意:平台 `generic.xaml` L1577 起存有**旧版**(reveal 时代)的 NavigationView 资源,现代控件样式位于 controls 仓库的 `controls/dev/NavigationView/` 下,本组件以后者为准。颜色 token 映射:

| 源资源 | 本组件 token | 差异说明 |
| --- | --- | --- |
| `NavigationViewSelectionIndicatorForeground` ← `AccentFillColorDefaultBrush` | `--wui-system-accent-color` | 同键映射(系统色钩子,theme-hooks.css 提供) |
| `NavigationViewItemBackgroundPointerOver` ← `SubtleFillColorSecondaryBrush` | `--wui-system-control-background-list-low`(#00000019) | Subtle 系画刷仅存在于 controls 层,theme.css 未收录,取最近似系统 token(#0E000000 → #19000000) |
| `NavigationViewItemBackgroundPressed` / `…SelectedPointerOver` ← `SubtleFillColorTertiaryBrush` | `--wui-system-control-background-list-medium`(#00000033) | 同上,近似替代 |
| `NavigationViewItemForeground` ← `TextFillColorPrimaryBrush`(#000000DE) | `--wui-application-foreground-theme`(#000000DE) | 同值直接映射 |
| `NavigationViewItemForegroundPressed` ← `TextFillColorSecondaryBrush` | `--wui-application-secondary-foreground-theme`(#00000099) | 近似(源 #0000009E) |
| `NavigationViewItemHeaderForeground` ← `TextFillColorSecondaryBrush` | `--wui-application-secondary-foreground-theme` | 同上 |
| `NavigationViewDefaultPaneBackground` ← `AcrylicInAppFillColorDefaultBrush` | `--wui-system-control-page-background-chrome-low`(SplitView 承载的默认) | 无 Acrylic token,取 ChromeLow 实色;可用 `paneBackground` 覆盖 |
| `NavigationViewContentGridBorderBrush` ← `CardStrokeColorDefaultBrush`(#0000000F) | `--wui-system-control-background-base-low`(#00000033) | 无 CardStroke token,描边偏重 |
| `NavigationViewItemSeparatorForeground` ← `DividerStrokeColorDefaultBrush` | `--wui-system-control-background-base-low` | 同上 |
| 圆角 `ControlCornerRadius` / `OverlayCornerRadius`(4px)、内容卡 `8,0,0,0` | `--wui-hyperlink-focus-rect-corner-radius`(4px)+ 8px 直写 | 项目无 4px/8px 圆角 token,4px 取既有 token,8px 硬编码 |
| `NavigationViewTitleHeaderContentControlTextStyle` FontSize 28 | `--wui-text-style-extra-large-font-size`(25.5px) | 最近似字号 token,页头略小 |

其余无 token / 做 Web 等价替换的项:

1. **内部即一台 SplitView**:源模板左窗格系由 `RootSplitView(DisplayMode=Inline)` 承载,Web 版直接内嵌项目 SplitView 组件(Inline / CompactInline / Overlay 对应 Left / LeftCompact / LeftMinimal),窗格开合动效、遮罩、`Esc`、轻扫关闭与对话框语义均继承其实现(源 Overlay 动效 0.35s/0.12s + KeySpline `0.1,0.9 0.2,1.0`、Inline 0.2s/0.1s + `0.0,0.35 0.15,1.0`)。Minimal 窗格阴影(`PaneOverlayShadowDepth` 16)无 shadow token,未复刻,以遮罩变暗替代层次表达。
2. **Auto 模式断点以容器宽为准**:WinUI 以窗口宽度 + `AdaptiveTrigger` 触发,Web 版用 ResizeObserver 观察控件自身宽度(演示页固定画框内即可复现三档降级);阈值默认值 1008/641 与 WinUI 一致。
3. **`SelectedItem` → `selectedItem`(tag 值)**:WinUI 的 SelectedItem 是条目对象;Web 版以 `tag` 字符串/数值标识选中项,`selectionChanged` 回执 `{ tag, label }`。slot 模式的条目靠 `tag` 与宿主选中模型联动。
4. **选中指示条(pill)编排**:源为 600ms Scale+Offset 编排(NavigationView.cpp L2192-2234,c_frame 加速/减速双段 + CenterPoint 200ms);Web 为每容器一枚共享指示条,经 WAAPI 两段编排复刻(0-200ms 保持旧位,200ms 跳新位 + scale 峰值 + origin 翻终侧,MR2/A9 落地),非逐项淡入淡出。
5. **展开箭头为静态字形旋转**:源 `ExpandCollapseChevronIcon` 为 `controls:AnimatedIcon` + `AnimatedChevronUpDownSmallVisualSource`(状态集 `NormalOff` / `NormalOn` / `PointerOverOff` / `PointerOverOn` / `PressedOff` / `PressedOn`,见 themeresources L836-L875);**源为 LottieGen 编译资产,原始 `.json` 不在 CK 快照内**,Web 版以 `\uE70D` 字形 + `rotate(180deg)` 过渡等价。时长取源 `c_durationTicks`(`AnimatedChevronUpDownSmallVisualSource.cpp` L104 = **433.33ms**),缓动 `linear`(源无 XAML KeySpline 可提取);源 PointerOver / Pressed 态仅改写前景色。
5a. **汉堡按钮字形动画(源 GlobalNav)**:源 `PaneToggleButton` 的 `Icon` 为 `controls:AnimatedIcon` + `AnimatedGlobalNavigationButtonVisualSource`(状态集 `Normal` / `PointerOver` / `Pressed`,见 themeresources L303/L311;**仅悬停 / 按压驱动,窗格开合不改变字形**)。**源为 LottieGen 编译资产,原始 `.json` 不在快照内**,Web 以内联三横条 SVG 等形 E700 + PointerOver `scaleX(0.78)` / Pressed 整体 `scale(0.82)` 过渡近似;时长取源 `c_durationTicks`(`AnimatedGlobalNavigationButtonVisualSource.cpp` L104 = **133.33ms**),缓动 `linear`。
5b. **返回按钮未实现**:源 `NavigationBackButtonNormalStyle` 用 `AnimatedBackVisualSource`(133.33ms);本库 NavigationView 尚无返回按钮(见下方第 9 条),故无对应字形动画。TitleBar 的返回 / 窗格按钮已实现同源动画(见 [TitleBar](./TitleBar.md))。
6. **PaneTitle 内嵌在汉堡按钮内(与源同行)**:源把窗格标题文本作为 `TogglePaneButton` 的 Content(`PaneTitleTextBlock`,`Margin 0,-2,0,0`、`VerticalAlignment=Center`),由 `PaneToggleButtonStyle` 模板的 `ContentPresenter`(`Padding 4,0,0,0`,第二列)渲染在 40px 图标格**右侧同一行**;Web 版同——标题渲染在 `.wui-navview__toggle` 内部(图标格 40px + 标题列),窗格展开且 `paneTitle` 非空时按钮按源 `UpdatePaneToggleSize` 展宽到 `OpenPaneLength`(可见盒 `OpenPaneLength - 8`,即模板根 Grid 的 `4,2` 外边距),标题文本起点即窗格内 x=48;紧凑栏收拢 / Minimal 浮层收起时按钮收回 40px 图标格、标题隐藏(源 `ListSizeCompact` 把 `PaneTitleTextBlock.Visibility` 置 Collapsed);Top 模式标题并入顶栏左端。源 `Margin 0,-2,0,0` 是 XAML TextBlock 行框度量的光学补偿,浏览器行框本身居中表意字形,未复刻该 2px 偏移。
7. **Minimal 页头边距**:`NavigationViewMinimalHeaderMargin = -24,44,0,0` 的负左边距依赖模板按钮占位列,Web 版近似为 `12px` 左边距;Left/Top 沿用 `NavigationViewHeaderMargin 56,44,0,0`。
8. **层级展开的辅助行为**:紧凑栏(收拢)中点击带子项的条目会先展开窗格再切换子树(WinUI ClosedCompact 行为的近似);子项展开/收起无动画(与源一致),`ItemExpanding/ItemCollapsed` 事件未复刻。
9. **未复刻(核心范围外)**:返回按钮与 `BackRequested`、Settings 项、`AutoSuggestBox` 搜索位、`InfoBadge`、Top 模式溢出(overflow)菜单、`PaneCustomContent`、`SelectionFollowsFocus` 与方向键焦点循环、窗格滚动条阴影。
10. **尺寸资源**:`NavigationViewCompactPaneLength 48`、`OpenPaneLength 320`(代码默认)、`NavigationViewTopPaneHeight 48`、`PaneToggleButtonWidth/Height 40/36`、条目 `MinHeight 36` + `ButtonMargin 4,2`、图标盒 40x16、指示条 3x16/16x3(圆角 2)均按源值写为 CSS/props 默认值。
11. **属性命名**:`PaneDisplayMode` → `paneDisplayMode`;`IsPaneOpen` → `v-model:is-pane-open`;`OpenPaneLength` / `CompactPaneLength` → 数字 px props;`Header` / `PaneTitle` → `header` / `paneTitle`(字符串);`MenuItems` / `FooterMenuItems` → `menuItems` / `footerMenuItems` 数据数组;`SelectsOnInvoked` → `selectsOnInvoked`。
12. **事件次序**:条目点击先发 `itemInvoked`,选中实际变化再发 `selectionChanged`(WinUI 同序);`isPaneOpen` 程序化赋值同样触发窗格三事件。Auto 模式跨断点切换时,进出 Minimal 会记忆并恢复窗格开合状态(WinUI 行为对齐)。

---

演示页源码:[demo/pages/NavigationViewPage.vue](../../demo/pages/NavigationViewPage.vue) · 组件源码:[src/components/NavigationView.vue](../../src/components/NavigationView.vue)
