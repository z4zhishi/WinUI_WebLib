# AppBarButton

> 在线示例:[/#/appbarbutton](/#/appbarbutton) · 演示页源码:[demo/pages/AppBarButtonPage.vue](../../demo/pages/AppBarButtonPage.vue)

## 概述

为 CommandBar(命令栏,本仓库后续阶段交付)设计的命令按钮。与标准 Button 的差别:默认外观是透明背景的小尺寸按钮(宽 68、最小高 56);内容用 `label` 与 `#icon` 插槽设置而非默认插槽(WinUI 中 Content 属性被忽略);`isCompact` 紧凑态只保留图标、隐藏文字标签。视觉上图标在上、标签在下(12px 居中),悬停/按下使用命令栏的列表高亮而非普通按钮的灰色填充,加速键以右上角小字角标形式显示(如 `Ctrl+S`)。

本组件对照 WinUI 3 默认样式(`generic.xaml` 中 `<Style TargetType="AppBarButton">`)实现五态(Normal / PointerOver / Pressed / Disabled / Focus);命令栏溢出(Overflow)态族属于 CommandBar 范畴,不在本组件内。

官方文档:

- [AppBarButton - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.appbarbutton)
- [Command bar 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/command-bar)
- [图标元素:SymbolIcon / FontIcon / PathIcon](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.symbolicon)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `label` | `string` | `''` | 图标下方的文字标签(WinUI `Label`);`isCompact` 时隐藏,同时作为按钮的可访问名 |
| `isCompact` | `boolean` | `false` | 紧凑态(WinUI `IsCompact`):仅显示图标、隐藏标签,对应模板的 Compact 视觉态 |
| `disabled` | `boolean` | `false` | 禁用(WinUI `IsEnabled` 的取反映射):背景透明、文字转禁用色、不触发 click |
| `keyboardAcceleratorText` | `string` | `''` | 加速键角标文本(WinUI `KeyboardAcceleratorTextOverride`,如 `Ctrl+S`);空串不显示 |
| `width` | `number \| string` | `68` | 按钮宽度(WinUI `Width`;默认样式固定 `Width=68`) |
| `#icon` (slot) | `any` | — | 图标内容:已入库的 [FontIcon](./IconElement.md) / SymbolIcon / [PathIcon](./IconElement.md) 或任意元素(WinUI `Icon` 属性;默认插槽不提供,对应「Content 被忽略」) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent)` | 点击按钮(Space/Enter 同样触发,禁用时不触发);WinUI `Click` |

## 基础用法

```vue
<script setup lang="ts">
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import WuiFontIcon from '@/components/FontIcon.vue'

function onSave(): void {
  console.log('save clicked')
}
</script>

<template>
  <!-- 图标 + 标签 + 加速键角标 -->
  <WuiAppBarButton label="Save" keyboard-accelerator-text="Ctrl+S" @click="onSave">
    <template #icon>
      <WuiSymbolIcon symbol="Save" :font-size="16" />
    </template>
  </WuiAppBarButton>

  <!-- 紧凑态:仅图标 -->
  <WuiAppBarButton label="Edit" is-compact @click="onSave">
    <template #icon>
      <WuiFontIcon glyph="&#xE70F;" :font-size="16" />
    </template>
  </WuiAppBarButton>
</template>
```

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `Enter` / `Space` | 激活按钮并触发 `click`(原生按钮语义) |
| `Tab` | 焦点进入/移出;键盘聚焦(`:focus-visible`)时显示下划线聚焦视觉 |

## 与 WinUI 的差异说明

- **EllipsisFocusVisual(下划线聚焦视觉)为近似实现**:旧版 UWP 命令栏省略号按钮使用一条虚线下划线式焦点矩形(`EllipsisFocusVisual`),WinUI 3 参照源(generic.xaml)中已无该资源,默认改走 `UseSystemFocusVisuals` 系统双环。本组件按任务规格以 `:focus-visible` 的 2px 虚线下划线近似旧观感,颜色取系统焦点色 token `--wui-system-control-focus-visual-primary`。
- **加速键仅显示、不绑定真实按键**:WinUI 的 `KeyboardAccelerators` 会在全局监听组合键并显示角标;Web 侧本组件只实现角标显示(`keyboardAcceleratorText`,映射 `KeyboardAcceleratorTextOverride`),组合键的监听属于宿主应用行为,可用 `window.addEventListener('keydown')` 自行绑定后触发 `click`。
- **CornerRadius**:本参照源的 AppBarButton 默认 Style 并无 `CornerRadius` setter(模板仅 `TemplateBinding CornerRadius`,取属性默认),无官方圆角可对照;此处与 Button.vue 家族惯例一致,取 4px 近似 token `--wui-hyperlink-focus-rect-corner-radius`,保持控件族观感统一。
- **加速键角标颜色按态独立**:角标前景不随按钮前景继承,对照 `AppBarButtonKeyboardAcceleratorTextForeground*` 资源系列(generic.xaml L1894-L1897)逐态取 token —— Normal = BaseMedium、PointerOver/Pressed = HighlightAltBaseMedium、**Disabled = DisabledBaseMediumLow(与整体前景同一禁用色)**;fix round 1 前曾漏掉 Disabled 态(角标保持 base-medium,可见偏差),已补规则并修正注释。
- **未实现 WinUI 侧的溢出/CommandBar 专属状态**:`Overflow` / `OverflowWithToggleButtons` / `LabelOnRight` 等视觉态与 `Flyout` 属性属于 CommandBar / 弹层族范畴,由后续 CommandBar 任务承载;`AppBarButtonRevealStyle`(Reveal 高光变体)亦未实现。
- **图标字体按 R1 裁决不做网络字体加载**:`Segoe Fluent Icons` 依赖本机字体栈;图标尺寸沿用图标列高度 16px(`AppBarButtonContentHeight`)。
- **Width 可覆盖**:WinUI 默认样式固定 `Width=68`,本组件以 `width` 属性暴露同款默认值,便于紧凑排列与自适应演示。

## 互链

- 控件族:[DropDownButton](./DropDownButton.md) · [MenuFlyout](./MenuFlyout.md)
- 图标:[IconElement](./IconElement.md)
- 弹层基建:[弹层公共基建](./_popup-infra.md)
