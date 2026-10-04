# ContentDialog

> 在线示例:[/#/contentdialog](/#/contentdialog) —— 路由 `/#/contentdialog`

## 概述

使用 ContentDialog 显示相关信息,或提供可承载任意内容的**模态**对话框体验。对话框由全屏烟幕遮罩 + 居中面板构成:面板内是标题(最多两行)、正文(超高滚动)与命令区(主按钮 / 次按钮 / 关闭按钮,文本为空即隐藏);模态语义与 WinUI 一致——**遮罩点击不关闭**,只能通过命令按钮或 Esc 关闭。

本组件按 WinUI 3 现行模板复刻视觉(PL10 重定向):面板底 `--wui-solid-background-fill-color-base`(浅 `#F3F3F3` / 深 `#202020`)、面板前景 `--wui-text-fill-color-primary`(`#000000E4` / `#FFFFFF`)、面板描边 `--wui-surface-stroke-color-default`(`#75757566` 双主题),烟幕取 `--wui-smoke-fill-color-default`(双主题 `#0000004D`),内容区 TopOverlay 取 `--wui-layer-fill-color-alt`(浅 `#FFFFFF` / 深 `#FFFFFF0D`),分隔线取 `--wui-card-stroke-color-default`(`#0000000F` / `#00000019`);圆角 `--wui-popup-corner-radius`(OverlayCornerRadius 8px)、命令区五列网格(按钮间距 8px、按钮 130–202px × 32px)与 `wui-dialog-scale-in` + 层级 `wui-fade-in` 双时间线入场动画(权威 controls/dev:scale 1.05→1 @250ms + 线性淡入 83ms;关闭 scale 1→1.05 @167ms + 83ms 线性淡出),随 `html[data-theme]` 明暗切换(总览见 [_brushes.md](./_brushes.md))。

弹层基建复用:焦点陷阱(`trapFocus` / `releaseFocus`,Tab 循环 + 关闭归还焦点)、弹层注册表(`registerPopupLayer`,嵌套时 Esc 只关栈顶)、z-index 固定档 `--wui-z-popup-dialog` 全部来自 [弹层公共基建](./_popup-infra.md)。对话框为视口居中模态,不锚定宿主,不走 `usePopupLayer` 定位。

官方文档:

- [ContentDialog - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.contentdialog)
- [Guidelines for dialog controls](https://learn.microsoft.com/windows/apps/design/controls/dialogs-and-flyouts/dialogs)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | `''` | 标题文本(WinUI `Title` 的 string 形态);富内容用 `#title` 插槽,插槽优先;两者皆空不渲染标题区 |
| `primaryButtonText` | `string` | `''` | 主按钮文本(WinUI `PrimaryButtonText`);空串不渲染该按钮 |
| `secondaryButtonText` | `string` | `''` | 次按钮文本(WinUI `SecondaryButtonText`);空串不渲染该按钮 |
| `closeButtonText` | `string` | `''` | 关闭按钮文本(WinUI `CloseButtonText`);空串不渲染该按钮 |
| `defaultButton` | `'Primary' \| 'Secondary' \| 'Close' \| 'None'` | `'None'` | 默认按钮(WinUI `DefaultButton`):取强调色样式(`AccentButtonStyle`)+ 打开后初始焦点落位 + Enter 触发 |
| `isPrimaryButtonEnabled` | `boolean` | `true` | 主按钮可用性(WinUI `IsPrimaryButtonEnabled`) |
| `isSecondaryButtonEnabled` | `boolean` | `true` | 次按钮可用性(WinUI `IsSecondaryButtonEnabled`) |
| `isOpen`(v-model) | `boolean`(`v-model:is-open`) | `false` | 开关状态双向绑定(WinUI `ShowAsync()` 的声明式等价);按钮 / Esc 关闭时组件自动写回 `false`,也可程序化置 `true` 打开 |

`class` / `style` / `aria-*` 等透传落在对话框面板元素上。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `primaryButtonClick` | `args: { cancel: boolean }` | 主按钮点击时触发;处理器内 `args.cancel = true` 可阻止关闭(WinUI `PrimaryButtonClick`) |
| `secondaryButtonClick` | `args: { cancel: boolean }` | 次按钮点击时触发;`args.cancel` 语义同上(WinUI `SecondaryButtonClick`) |
| `closeButtonClick` | `args: { cancel: boolean }` | 关闭按钮点击**或按下 Esc** 时触发(WinUI 中 Esc 走 `CloseButton` 语义、结果为 `None`);`args.cancel` 语义同上(WinUI `CloseButtonClick`) |

命令区按钮的可见性组合(三键 / 两键 / 单键 / 无键)由组件按空文本自动推导,布局对照 WinUI `ButtonsVisibilityStates` 八态。

## 插槽

| 插槽 | 说明 |
| --- | --- |
| `default` | 对话框正文(WinUI `Content` 对象形态);任意元素,超高时滚动 |
| `title` | 富标题(WinUI `Title` / `TitleTemplate` 的对象形态);缺省渲染 `title` 属性文本 |

## 交互与键盘

- **打开**:`v-model:is-open` 置 `true`(或程序化写入);面板入场 `wui-dialog-scale-in` + 烟幕层 `wui-fade-in` 双时间线动画。
- **初始焦点**:落 `defaultButton` 指定的按钮(`None` 或该按钮被禁用时落第一个可聚焦元素);随后焦点被**陷阱圈定**(Tab 在对话框内循环)。
- **Enter**:触发 `defaultButton`(WinUI 对话框语义:正文 / 文本输入内按 Enter 亦触发);焦点已在按钮、textarea、select 或链接上时交还原生行为。`None` 时不触发。
- **Esc**:等价点击关闭按钮 → 触发 `closeButtonClick`(可被 `args.cancel` 阻止)。对话框内再开 Flyout / 子弹层时,Esc 只关最后打开的栈顶层(弹层注册表逐级收口)。
- **遮罩点击**:不关闭(WinUI 模态语义,遮罩只负责挡指针)。
- **关闭**:三按钮 / Esc 任一路径关闭均写回 `isOpen = false`,焦点归还到打开前的元素(`releaseFocus`);出场为快速淡出。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiContentDialog from '@/components/ContentDialog.vue'

const open = ref(false)

function onPrimary(args: { cancel: boolean }) {
  if (!canSave()) args.cancel = true // 阻止关闭
}
</script>

<template>
  <WuiButton @click="open = true">Show dialog</WuiButton>

  <WuiContentDialog
    v-model:is-open="open"
    title="Save your work?"
    primary-button-text="Save"
    secondary-button-text="Don't Save"
    close-button-text="Cancel"
    default-button="Primary"
    @primary-button-click="onPrimary"
  >
    Lorem ipsum dolor sit amet, adipisicing elit.
    <WuiCheckBox content="Upload your content to the cloud." />
  </WuiContentDialog>
</template>
```

> 模板中属性可用 camelCase(`primaryButtonText`)或 kebab-case(`primary-button-text`);事件监听写 `@primary-button-click`(camelCase 声明)。

## 与 WinUI 的差异说明

对照 WinUI 3 生效层 `controls/dev/CommonStyles/ContentDialog_themeresources.xaml`(逐行复核)与 theme.css Fluent token 的取值映射:

| WinUI 取值 | Web 实现 | 说明 |
| --- | --- | --- |
| 面板 `ContentDialogBackground` = `SolidBackgroundFillColorBaseBrush` | `--wui-solid-background-fill-color-base`(浅 `#F3F3F3` / 深 `#202020`) | PL10 重定向(此前 legacy `--wui-content-dialog-background` `#ffffff`/`#000000`) |
| 面板 `ContentDialogForeground` = `TextFillColorPrimaryBrush` | `--wui-text-fill-color-primary`(浅 `#000000E4` / 深 `#FFFFFF`) | PL10 重定向(补 alpha) |
| 面板 `ContentDialogBorderBrush` = `SurfaceStrokeColorDefaultBrush` | `--wui-surface-stroke-color-default`(`#75757566` 双主题),1px | PL10 重定向(此前 `#00000033`/`#ffffff33`) |
| 烟幕 LayoutRoot = `SmokeFillColorDefaultBrush` | `--wui-smoke-fill-color-default`(双主题 `#0000004D`) | PL10 重定向(此前 legacy 页面底近似 `#ffffff99`/`#00000099`) |
| 内容区 `ContentDialogTopOverlay` = `LayerFillColorAltBrush` | `--wui-layer-fill-color-alt`(浅 `#FFFFFF` / 深 `#FFFFFF0D`) | PL10 新增落色(此前未实现背景) |
| 分隔线 `ContentDialogSeparatorBorderBrush` = `CardStrokeColorDefaultBrush`,厚度 `0,0,0,1` | `border-bottom: 1px solid var(--wui-card-stroke-color-default)` | PL10 重定向(此前复用面板 border);位置贴命令区上沿,长内容时恒在可视区(WinUI 中分隔线随内容滚动,取短内容一致观感) |
| 标题 FontSize 20 / Margin 0,0,0,12 / MaxLines 2 | `font-size: 20px` / `margin-bottom: 12px` / `-webkit-line-clamp: 2` | 无差异;字重取 WinUI 3 现行模板 `SemiBold`(dxaml 旧模板为 Normal) |
| 正文 `ControlContentThemeFontSize` = 14 | `--wui-control-content-theme-font-size` | 无差异 |
| `ContentDialogPadding` = 24(WinUI 3 均分) | 内容区与命令区 `padding: 24px` | dxaml 旧模板为 24,18,24,24 + 命令区 0,24,0,0,取现行值 |
| 命令区五列网格 / `ContentDialogButtonSpacing` = 8 / 按钮列宽 `*` | `grid-template-columns` 五列 + 8px 间隔,单键占右半格 | 对照 `ButtonsVisibilityStates` 八态逐条映射(三键三等分 / 两键两半 / 单键右半) |
| `ContentDialogButtonMinWidth` 130 / `MaxWidth` 202 / `ButtonHeight` 32 | 按钮内联约束 | 尺寸资源 theme.css 未提取,按源值写死 |
| `ContentDialogMinWidth` 320 / `MaxWidth` 548 / `MinHeight` 184 / `MaxHeight` 756 | 面板 min/max 约束 | 同上;另加 `calc(100vw/vh - 48px)` 视口钳制(WinUI 由窗口约束,Web 需显式) |
| defaultButton = `AccentButtonStyle` | 复用 PL3 已迁移的 `WuiButton` 与 `--wui-accent-button-*` 强调色状态 | PL10 记录按钮族已迁移,本批不动(属按钮族工单) |
| 打开动画 `DialogShowing`(权威 controls/dev `ContentDialog_themeresources.xaml` L96-113):scale 1.05→1 @250ms + 层根透明度线性 83ms 双时间线 | 面板 `wui-dialog-scale-in` 250ms `cubic-bezier(0,0,0,1)` + 层 `wui-fade-in` 83ms 线性 | 双时间线拆到层/面板两元素逐键复刻;关闭 `DialogHidden`(scale 1→1.05 @167ms 同 spline + 83ms 线性淡出,L74-95)同构双时间线。注:dxaml `generic.xaml` L8393-8423 为 UWP 遗留 500ms / spline 0.1,0.9,0.2,1 版,已弃用 |
| `ShowAsync()` 返回 `ContentDialogResult` | `v-model:is-open` + 三个 `*ButtonClick` 事件 | 声明式等价:关闭方式可由事件推断(primary/secondary/close → Primary/Secondary/None);无 result 枚举 |
| `ContentDialogButtonClickEventArgs.GetDeferral()`(异步暂停关闭直至 Deferral 完成) | 简化为同步 `args.cancel` | 处理器同步置 `cancel = true` 阻止关闭;异步决定请先 cancel,待异步完成后再把 `isOpen` 置 `false`(见上方基础用法注释) |
| `Closing` / `Closed` 事件、`FullSizeDesired`、`IsPrimaryButtonEnabled` 之外的按钮样式覆盖(`PrimaryButtonStyle` 等) | 未实现 | 阶段口径外的低频 API;按钮可用性仅 WinUI 原有的 `IsPrimaryButtonEnabled` / `IsSecondaryButtonEnabled`(Close 按钮平台无禁用属性) |
| 模态焦点由平台窗口化输入栈保证 | `trapFocus` / `releaseFocus`(Tab 循环 + 归还焦点)+ 全屏遮罩挡指针 | 基建级差异,见[弹层公共基建](./_popup-infra.md);WinUI 的 `TabFocusNavigation Cycle` 即陷阱的 XAML 原语 |
| 面板阴影 ThemeShadow | `--wui-popup-shadow` 双层 box-shadow 近似 | 基建级差异,见[弹层公共基建](./_popup-infra.md) |

## 相关链接

- 在线示例:`/#/contentdialog`
- 演示页源码:`demo/pages/ContentDialogPage.vue`
- 组件源码:`src/components/ContentDialog.vue`
- 弹层公共基建:[`_popup-infra.md`](./_popup-infra.md)(z-index 档位、焦点陷阱与自动关闭约定)
- 相关控件:Flyout、MenuFlyout、TeachingTip、ToolTip
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
