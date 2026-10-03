# CommandBar

> 在线示例:[/#/commandbar](/#/commandbar) · 演示页源码:[demo/pages/CommandBarPage.vue](../../demo/pages/CommandBarPage.vue)

## 概述

命令栏为用户提供对应用最常用任务的快速访问,可承载应用级或页面级命令。默认显示一行图标按钮(主命令 PrimaryCommands)和一个可选的「更多」按钮(省略号 …);点击更多按钮展开次要命令(SecondaryCommands)的溢出区。`isOpen` 打开态把溢出区常显于命令栏下方,`isSticky` 粘滞态使点击层外/Escape 等收起尝试均不关闭;`defaultLabelPosition` 支持标签在图标下方(Bottom,默认)或右侧(Right)两种排布;主/次要命令区内容随父组件状态动态增减自适应。

本组件对照 WinUI 3 `CommandBar_themeresources.xaml` 的 `DefaultCommandBarStyle` 与 `EllipsisButton` 样式实现(UWP `generic.xaml` 同名模板为布局锚点),溢出区基于[弹层公共基建](./_popup-infra.md)定位(右缘对齐命令栏、视口翻转/推回),并复用菜单语义(role=menu、↑/↓/Home/End 导航、Escape/Tab 关闭)。

官方文档:

- [CommandBar - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.commandbar)
- [Command bar 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/command-bar)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `isOpen` (v-model) | `boolean` | `false` | 打开态(WinUI `IsOpen`):溢出区显示于命令栏下方;点击更多按钮或编程置 `true` 打开,点击层外/Escape 收起(`isSticky=true` 时收起尝试均不关闭,焦点归还更多按钮) |
| `isOverflowOpen` (v-model) | `boolean` | `false` | 溢出区开合镜像:与 `isOpen` 同一状态,写入任一即双向同步(Web 侧便捷模型,WinUI 无此公开 API,见差异节) |
| `defaultLabelPosition` | `'bottom' \| 'right'` | `'bottom'` | 默认标签位置(WinUI `DefaultLabelPosition` 的 Bottom/Right 两档):bottom = 图标上、标签下;right = 图标左、标签右 |
| `overflowButtonVisibility` | `'auto' \| 'visible' \| 'collapsed'` | `'auto'` | 更多按钮可见性(WinUI `OverflowButtonVisibility`):auto = 有次要命令或 bottom 标签位有主命令时显示(源 Auto 分支,与 UWP 默认「下标签命令栏恒显 …」一致);visible 恒显;collapsed 隐藏 |
| `isSticky` | `boolean` | `false` | 粘滞(WinUI `IsSticky`):`true` 时不因点击层外/锚滚动/Escape 收起(源 `TryDismissCommandBarOverflow`:粘滞态收起尝试不关闭,焦点归还更多按钮) |
| `disabled` | `boolean` | `false` | 禁用(WinUI `IsEnabled`):更多按钮禁用并置灰省略号字形 |
| `#content` (slot) | `any` | — | 命令栏左侧内容区(WinUI `Content`) |
| `#primary-commands` (slot) | `any` | — | 主命令区(WinUI `PrimaryCommands`):放 [AppBarButton](./AppBarButton.md) / [AppBarToggleButton](./AppBarToggleButton.md) / [AppBarSeparator](./AppBarSeparator.md),右对齐排列 |
| `#secondary-commands` (slot) | `any` | — | 次要命令区(WinUI `SecondaryCommands`):收进「更多」溢出区,按菜单行样式满宽呈现 |

Reveal 揭示光照默认启用(本组件无独立开关):WinUI 3 平台唯一 CommandBar 样式即 `CommandBarRevealStyle`(generic.xaml L20206),其模板把内部 AppBarButton / AppBarToggleButton 隐式挂到 Reveal 样式(L16221-16222)、「更多」按钮硬挂 `EllipsisButtonRevealStyle`(L16961)。本组件以 provide 上下文等价该作用域——命令区/溢出区的 [AppBarButton](./AppBarButton.md) / [AppBarToggleButton](./AppBarToggleButton.md) 默认挂接光照(各自 `reveal` prop 显式 `true` / `false` 可强制覆盖),MoreButton 直挂公共层光照;机制、常量与降级语义见 [_reveal.md](./_reveal.md)。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `opening` | `()` | 溢出区开始打开(WinUI `Opening`) |
| `opened` | `()` | 溢出区已打开且完成首次定位(WinUI `Opened`) |
| `closing` | `()` | 溢出区开始关闭(WinUI `Closing`) |
| `closed` | `()` | 溢出区已关闭(WinUI `Closed`) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiCommandBar from '@/components/CommandBar.vue'
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiAppBarSeparator from '@/components/AppBarSeparator.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'

const isOpen = ref(false)

function onAdd(): void {
  console.log('add clicked')
}
</script>

<template>
  <WuiCommandBar v-model:is-open="isOpen" default-label-position="right">
    <template #primary-commands>
      <WuiAppBarButton label="Add" width="auto" @click="onAdd">
        <template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template>
      </WuiAppBarButton>
      <WuiAppBarButton label="Share" width="auto">
        <template #icon><WuiSymbolIcon symbol="Share" :font-size="16" /></template>
      </WuiAppBarButton>
    </template>
    <template #secondary-commands>
      <WuiAppBarButton label="Settings" keyboard-accelerator-text="Ctrl+I">
        <template #icon><WuiSymbolIcon symbol="Setting" :font-size="16" /></template>
      </WuiAppBarButton>
      <WuiAppBarSeparator />
      <WuiAppBarButton label="Delete" keyboard-accelerator-text="Del">
        <template #icon><WuiSymbolIcon symbol="Delete" :font-size="16" /></template>
      </WuiAppBarButton>
    </template>
  </WuiCommandBar>
</template>
```

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `Enter` / `Space`(更多按钮) | 切换溢出区开合(WinUI `OnExpandButtonClick`) |
| `↑` / `↓`(更多按钮上) | 打开溢出区并把焦点落到末/首项(WinUI 方向键语义) |
| `↑` / `↓`(溢出区内) | 在命令项间移动焦点;首/末项越界时焦点回更多按钮(源 `ShiftFocusVerticallyInOverflow` 不环绕) |
| `Home` / `End`(溢出区内) | 焦点跳到首/末项 |
| `Enter` / `Space`(溢出区内) | 激活聚焦的命令(原生按钮语义) |
| `Escape` | 收起尝试(源 `TryDismissCommandBarOverflow`):`isSticky=false` 时关闭溢出区并把焦点归还更多按钮;`isSticky=true` 时保持打开、仅焦点归还更多按钮 |
| `Tab` | 关闭溢出区,焦点照常移动(WinUI 菜单 Tab 即 light dismiss) |

## 与 WinUI 的差异说明

- **`isOverflowOpen` 为 Web 侧补充模型**:WinUI `CommandBar` 公开 API 只有 `IsOpen`(模板内部的 `OverflowPopup.IsOpen` 由它驱动);本组件按任务要求补 `isOverflowOpen` 双向模型,作为同一开关状态的便捷镜像(写入任一即同步,读值一致),便于只关心「溢出弹层」语义的调用方。
- **背景取 WinUI 3 口径(全透明)**:WinUI 3 的 `CommandBarBackground = ControlFillColorTransparentBrush`(`#00FFFFFF` 全透明;`CommandBar_themeresources.xaml` L9 Default / L53 Light),UWP `generic.xaml` 同名键为 `SystemControlBackgroundChromeMediumBrush`(`#E6E6E6`/`#1F1F1F`,关闭态呈可见灰条)。按「视觉与 WinUI 3 完全一致」取 WinUI 3 值:`theme.css` 的 `--wui-command-bar-background` 已改为 `transparent`。**未实现的部分**:开启态的 `CommandBarBackgroundOpen = AcrylicInAppFillColorDefaultBrush`(开启时命令栏变实底)本组件不改底色;前景仍取 UWP 侧的 `--wui-system-control-foreground-base-high`(WinUI 3 为 `TextFillColorPrimaryBrush`,浅色下 `#E4000000`,与 `#000000` 差约 10% 不透明度)。
- **主命令按钮高度 = WinUI 3 `AppBarThemeMinHeight`(64)**:命令行自身 `MinHeight = AppBarThemeCompactHeight`(48),而 [AppBarButton](./AppBarButton.md) / [AppBarToggleButton](./AppBarToggleButton.md) 的 `ContentRoot.MinHeight` 为 64,故显示标签时命令行由内容撑到 64(等价 WinUI 开启、标签可见时的高度);`ClosedDisplayMode` 收起态(标签隐藏、命令行 48 高)未实现,见下条。
- **溢出区皮肤为 MenuFlyoutPresenter 同款 token**:WinUI 3 溢出区背景为 `AcrylicInAppFillColorDefaultBrush`(应用内亚克力),无对应 token;取全站弹层统一的 `--wui-menu-flyout-presenter-background`/`border`(不透明纯色),圆角/阴影由弹层基建的 `--wui-popup-corner-radius`/`--wui-popup-shadow` 近似 ThemeShadow。
- **溢出项为 `:deep()` 等价适配**:源在溢出区把 AppBarButton 切到 `Overflow` 系视觉态(`AppBarButtonOverflowStyle`:满宽行、图标居左 16×16、`OverflowTextLabel` 14px 左对齐不换行)。本仓库 AppBarButton / AppBarToggleButton 模板不含 Overflow 态,由 CommandBar 在溢出层内以 `:deep()` 覆盖为等价的菜单行;AppBarToggleButton 选中态保留强调色底(WinUI 溢出态用前置勾选字形,观感不同);AppBarSeparator 以与组件自身 `useOverflowStyle` 相同的规则呈现横向分隔线。
- **溢出区最大高度取资源值 198px**:源运行期为「可视区高度的 50%」动态计算,主题资源 `CommandBarOverflowMaxHeight=198`;本组件取资源值并开启垂直滚动(超出即滚动)。
- **DefaultLabelPosition 仅实现 Bottom/Right**:WinUI 还有 `Top`/`Collapsed` 两档,未在任务范围;Right 档在 `:deep()` 适配下建议命令用 `width="auto"`(WinUI 的 `LabelOnRight` 态按钮宽度随内容,而默认样式 `Width=68` 不足以容纳右置标签)。
- **`ClosedDisplayMode` / `IsDynamicOverflowEnabled` 未实现**:`ClosedDisplayMode`(Minimal/Hidden 收起形态)与窄宽度下主命令自动移入溢出区的动态溢出均不在本任务范围;主/次要命令的动态增减(slot 内容变化)已自适应。
- **更多按钮焦点视觉为系统双环近似**:`EllipsisButton` 样式取 `UseSystemFocusVisuals=true`(区别于 AppBarButton 的下划线聚焦视觉),以 2px 焦点色 outline 近似 WinUI 双环;字形取 WinUI 3 的 `E712`(UWP 为 `E10C`),依赖本机 Segoe 字体栈(R1 裁决不加载网络字体)。
- **Reveal 光照作用域为组件级 provide(登记近似)**:源隐式样式(`Grid.Resources`,L16221-16222)仅作用于命令区模板;本组件的 provide 覆盖整个 CommandBar 子树——`#content` slot 内若放置 AppBarButton / AppBarToggleButton 也会默认启用(源不会)。常见用法(命令区/溢出区)与源一致,content slot 场景属放宽;完整口径见 [_reveal.md](./_reveal.md) §5。

## 互链

- 命令族:[AppBarButton](./AppBarButton.md) · [AppBarToggleButton](./AppBarToggleButton.md) · [AppBarSeparator](./AppBarSeparator.md)
- 弹层族:[MenuFlyout](./MenuFlyout.md) · [DropDownButton](./DropDownButton.md)
- 弹层基建:[弹层公共基建](./_popup-infra.md)
- Reveal 材料:[_reveal.md](./_reveal.md)(命令区/溢出区/MoreButton 默认启用的口径与 provide 作用域登记)
