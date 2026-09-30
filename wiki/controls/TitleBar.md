# TitleBar

> 在线示例:[/#/titlebar](/#/titlebar) · 演示页源码:[demo/pages/TitleBarPage.vue](../../demo/pages/TitleBarPage.vue)

## 概述

TitleBar(标题栏)控件用一种简单的方式搭建**现代标题栏 UX**:应用图标 + 标题 + 副标题 + 中部交互内容(如搜索框)+ 右侧系统按钮区,并可选返回按钮与窗格切换按钮,是「自绘标题栏(`ExtendsContentIntoTitleBar`)」场景下对手工拼装 `AppWindowTitleBar` 的封装替代。视觉按 `CK/WinUI-Reference/controls/dev/TitleBar/TitleBar.xaml`(DefaultTitleBarStyle)+ `TitleBar_themeresources.xaml` 复刻(**该控件不在旧版 `generic.xaml` 内**,模板与主题资源在 WinUI 源码的 dev 控件目录):紧凑高度 32px、有内容区时 48px,标题/副标题为 Caption 12px、超宽截断省略,返回/窗格按钮 40px 宽、悬停按压为 Subtle 高亮。内容区放不下时进入 **Compact 显示态**(隐藏标题/副标题、内容左对齐),对应源 `OnSizeChanged` 的 DesiredSize 判定。

**声明:浏览器内为视觉复刻,无真实窗口能力** —— 不会执行最小化/最大化/关闭(系统按钮为演示性占位,点击仅发事件),也不支持系统级窗口拖拽(拖拽区语义以 `data-wui-drag-region` 标记演示);窗口激活/失活以 `inactive` 属性手动模拟。

官方文档:

- [Title bar customization(TitleBar 控件)](https://learn.microsoft.com/windows/apps/develop/title-bar)
- [Title bar - design guidelines](https://learn.microsoft.com/windows/apps/design/basics/titlebar-design)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | `''` | 标题文本(WinUI `Title`);`#title` slot 优先;空则隐藏标题部 |
| `subtitle` | `string` | `''` | 副标题文本(WinUI `Subtitle`);`#subtitle` slot 优先;Caption 字号、次级色 |
| `isBackButtonVisible` | `boolean` | `false` | 显示返回按钮(WinUI `IsBackButtonVisible`);点击发 `backRequested`。与 `isPaneToggleButtonVisible` **恰有一个**可见时,左标头内边距列收窄为 2(源 NegativeInsetSpacing) |
| `isBackButtonEnabled` | `boolean` | `true` | 返回按钮可用性(WinUI `IsBackButtonEnabled`);`false` 呈 Disabled 色且不发事件 |
| `isPaneToggleButtonVisible` | `boolean` | `false` | 显示窗格切换按钮(WinUI `IsPaneToggleButtonVisible`);点击发 `paneToggleRequested` |
| `inactive` | `boolean` | `false` | 【Web 增强】窗口失活模拟:标题/按钮文字转次级色、图标/标头/内容 50% 透明、按钮暂停交互。WinUI 中由 `InputActivationListener` 监听窗口激活态自动切换各 Deactivated 视觉态,浏览器无窗口激活概念,改为手动 |
| `isCaptionButtonsVisible` | `boolean` | `true` | 【Web 增强】右侧最小化/最大化/关闭演示按钮。WinUI 中系统标题栏按钮由窗口层提供、不在控件模板内;Web 侧为任务要求的演示性占位,点击仅发对应 `*Requested` 事件,不执行窗口操作 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `backRequested` | 无 | 点击返回按钮(`IsBackButtonEnabled=false` 时不触发;WinUI `BackRequested`) |
| `paneToggleRequested` | 无 | 点击窗格切换按钮(WinUI `PaneToggleRequested`) |
| `minimizeRequested` | 无 | 【Web 增强】点击最小化占位按钮(WinUI 由系统执行窗口操作,无对应控件事件) |
| `maximizeRequested` | 无 | 【Web 增强】点击最大化占位按钮(同上) |
| `closeRequested` | 无 | 【Web 增强】点击关闭占位按钮(同上) |

## 键盘交互

| 按键 | 行为 |
| --- | --- |
| `Space` / `Enter` | 激活聚焦的按钮(返回 / 窗格切换 / 系统按钮占位均为原生 `<button>`) |
| `Tab` | 在返回按钮 → 窗格切换按钮 → 系统按钮占位间按 DOM 顺序移动焦点 |
| `Shift + F10` / 右键 | 真实窗口中用于进入「系统按钮」菜单(系统 chrome 行为),Web 侧未复刻 |

## Slot

| Slot | 说明 |
| --- | --- |
| 默认 slot | 中部内容(WinUI `Content`,ContentProperty);默认水平居中,官方示例经资源键 `TitleBarContentHorizontalAlignment=Stretch` 拉伸搜索框 —— Web 侧直接在 slot 内容上设 `width: 100%; max-width: 580px` 等价 |
| `#icon` | 应用图标(WinUI `IconSource` 等价);呈现在 16×16 框内(源为 Viewbox 等比缩放,Web 侧建议自定尺寸,见差异节) |
| `#title` / `#subtitle` | 自定义标题/副标题内容,优先于 `title` / `subtitle` 属性 |
| `#left-header` | 标题栏左侧自定义内容(WinUI `LeftHeader`),位于返回/窗格按钮之后 |
| `#right-header` | 标题栏右侧自定义内容(WinUI `RightHeader`),位于系统按钮占位之前(官方示例放 `PersonPicture`) |

## 布局与高度对照(源值)

| 项 | 源资源 | 值 |
| --- | --- | --- |
| 紧凑高度 | `TitleBarCompactHeight` | 32px(无 Content/LeftHeader/RightHeader 时) |
| 展开高度 | `TitleBarExpandedHeight` | 48px(三者任一存在,源 `UpdateHeight`) |
| 图标框 | `TitleBarIconMaxWidth/Height` | 16 × 16,右距 16(`TitleBarIconMargin`) |
| 标题 | `CaptionTextBlockStyle` + `TitleBarTitleMargin` | 12px,右距 8,截断省略,不换行 |
| 副标题 | 同上 + `TitleBarSubtitleMargin` | 12px,右距 16,次级色 |
| 返回/窗格按钮 | `TitleBarBackButtonWidth` / `TitleBarPaneToggleButtonWidth` | 宽 40、Margin 2、字形 16px(E72B / E700) |
| 左内边距 / 右内边距 | `TitleBarLeftPaddingWidth` / `TitleBarRightPaddingWidth` | 2px / 0px |
| 左标头内边距 | `TitleBarLeftHeaderPaddingWidth`(负缩进 `TitleBarHeaderNegativeInsetPaddingWidth`) | 14px(恰有一个左按钮时 2px) |
| 最小拖拽区 | `TitleBarMinDragRegionWidth` | 48px(右侧标头与系统按钮之间保留) |
| 失活透明度 | `TitleBarDeactivatedOpacity` | 0.5(图标/标头/内容) |
| Compact 内容边距 | `TitleBarCompactContentMargin` | 0, 0, 16, 0(内容左对齐时) |

## 拖拽区语义(演示)

真实窗口中,标题栏整条都是**拖拽区**(拖动 = 移动窗口),交互控件被自动排除。Windows App SDK 2.1 起:`TitleBar.Content` 内的交互控件自动排除、非交互视觉与空白保持可拖;`TitleBar.IsDragRegion` 附加属性可覆写单个元素(`true` 恒可拖 / `false` 恒可点 / 不设由框架判定);内容动态增删后调用 `RecomputeDragRegions()` 重算。

浏览器内无窗口拖拽能力,本组件以**语义标记**演示同一规则:

- 根元素标 `data-wui-drag-region="true"`(整条可拖);
- 交互子元素(`button / a / input / select / textarea / [contenteditable] / [role=button]`,含 slot 内容)自动标 `data-wui-drag-region="false"`(MutationObserver 驱动,等价源 `UpdateInteractableElementsList`)。

官方示例的「Show window」按钮(在真实窗口中切换 `IsDragRegion` 并调用 `RecomputeDragRegions`)依赖 Win32 窗口,浏览器内不可复刻。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiTitleBar from '@/components/TitleBar.vue'
import WuiAutoSuggestBox from '@/components/AutoSuggestBox.vue'

const searchText = ref('')

function onBackRequested() {
  console.log('BackRequested')
}
</script>

<template>
  <!-- 官方示例 TitlebarConfiguration 复刻:图标 + 标题/副标题 + 搜索框 + 右侧头像 -->
  <WuiTitleBar
    title="WinUI Gallery"
    subtitle="Preview"
    :is-back-button-visible="false"
    :is-pane-toggle-button-visible="false"
    @back-requested="onBackRequested"
  >
    <template #icon><!-- 应用图标(WinUI IconSource) --></template>
    <WuiAutoSuggestBox v-model:text="searchText" placeholder-text="Search..." query-icon="Find" />
    <template #right-header><!-- 右侧自定义内容(WinUI RightHeader) --></template>
  </WuiTitleBar>
</template>
```

仅标题 + 副标题(无内容区 → 紧凑高度 32):

```vue
<WuiTitleBar title="应用名" subtitle="预览版" :is-caption-buttons-visible="false" />
```

与导航壳组合(官方 End-to-End 示例的模式;真实窗口中把返回/窗格事件接到 NavigationView):

```vue
<WuiTitleBar
  is-back-button-visible
  is-pane-toggle-button-visible
  @back-requested="navFrame.back()"
  @pane-toggle-requested="navView.isPaneOpen = !navView.isPaneOpen"
/>
```

## 与 WinUI 的差异说明

| 项 | WinUI 源行为 | 本组件实现 |
| --- | --- | --- |
| 锚点文件 | 控件模板/主题资源在 `controls/dev/TitleBar/TitleBar.xaml` + `TitleBar_themeresources.xaml`,**不在 `dxaml/themes/generic.xaml` 内**(已检索确认 0 处) | 同源 dev 文件逐值对照;报告与注释均以 dev 文件为锚点 |
| 前景色 token | `TitleBarForegroundBrush` = TextFillColorPrimary(浅 #E4000000 / 深 #FFFFFF)、Deactivated = TextFillColorTertiary(#72000000)、Subtitle = TextFillColorSecondary(#9E000000) —— 定义于 CommonStyles/Common_themeresources_any.xaml,theme.css(仅提取 generic.xaml)无对应 token | 最近似映射:标题→`--wui-application-foreground-theme`、副标题→`--wui-application-secondary-foreground-theme`、失活文字→`--wui-system-control-foreground-base-medium-low`(值差 ≤ 5% 透明度) |
| 按钮悬停/按压底色 | `TitleBarBackButtonBackground*` / `TitleBarPaneToggleButtonBackground*` = SubtleFill* 族(浅悬停 #09000000 / 按压 #06000000),theme.css 无 token | 按 MenuBarItem 既有约定取 `--wui-grid-view-item-background-pointer-over`(#00000019)/ `-pressed`(#00000033),略强于源值;禁用底色 ControlFillColorDisabled 取 `--wui-text-control-background-disabled` |
| ControlCornerRadius | 按钮/卡片圆角 4px(theme.css 无同名 token) | 最近似 `--wui-hyperlink-focus-rect-corner-radius`(4px),项目既有约定 |
| TitleBarDeactivatedOpacity | 0.5(theme.css 仅颜色/字号/圆角 token,无透明度 token) | 取源值 0.5 |
| 系统标题栏按钮 | 最小化/最大化/关闭由窗口层(AppWindow 系统 chrome)绘制,不在控件模板内;关闭钮悬停为系统红 #C42B1C(系统值,无 token) | 演示性 `<button>` 占位(宽 46px 系统标准、直角、字形 E921/E922/E8BB、字号 10px),悬停按压统一 Subtle 高亮(不用硬编码红色);点击仅发 `minimize/maximize/closeRequested` 事件 |
| 窗口激活/失活 | `InputActivationListener` 监听,自动进入各 Deactivated 视觉态 | `inactive` 属性手动模拟;失活时按钮 `pointer-events: none` 呈现不可交互 |
| Compact 显示态判定 | `OnSizeChanged`:内容 DesiredSize.Width ≥ 内容列实际宽度 → Compact | ResizeObserver 测 `scrollWidth > clientWidth` 近似;差异:`width: 100%` 型可收缩内容不会触发(源的 DesiredSize 对 stretch 内容取最小需求宽,可能触发)—— 需要演示时给内容固定宽度 |
| 图标缩放 | 模板内 Viewbox 将 IconSource 等比缩放至 16×16 | `#icon` slot 为 16×16 定框 + 居中,**未复刻等比缩放**;slot 内容请自定尺寸(如 FontIcon 字号 12) |
| 窗口拖拽 / IsDragRegion / RecomputeDragRegions | 整条可拖、交互控件自动排除、附加属性覆写、方法重算 | 无真实窗口拖拽;以 `data-wui-drag-region` true/false 标记演示同一规则(MutationObserver 驱动),方法未实现 |
| BackRequested / PaneToggleRequested 的宿主职责 | 事件接 NavigationView 返回/窗格开关,真实窗口中驱动应用导航 | 事件同名同参;示例页以事件日志等价呈现 |
| RTL | FlowDirection 翻转列序(左内边距列/右内边距列互换) | CSS Grid 随 `direction: rtl` 自动镜像列序,等价 |
| 高对比度主题 | `TitleBar_themeresources.xaml` 含 HighContrast 字典(SystemColor* 系列) | 未实现独立高对比度档位,跟随站点浅/深两档主题 |
| 官方示例「Show window」 | 新开 Win32 窗口演示拖拽区与 End-to-End 组合 | 依赖真实窗口,浏览器内不可复刻;以说明文案与事件日志代替 |

## 相关链接

- 演示页:`demo/pages/TitleBarPage.vue`(路由 `/#/titlebar`)
- 组件源码:`src/components/TitleBar.vue`
- 姊妹控件:[NavigationView](./NavigationView.md)(与 TitleBar 组成导航壳)、[MenuBar](./MenuBar.md)(标题栏下方命令菜单)、[PersonPicture](./PersonPicture.md)(RightHeader 常客)
