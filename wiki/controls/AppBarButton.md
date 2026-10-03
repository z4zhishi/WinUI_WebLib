# AppBarButton

> 在线示例:[/#/appbarbutton](/#/appbarbutton) · 演示页源码:[demo/pages/AppBarButtonPage.vue](../../demo/pages/AppBarButtonPage.vue)

## 概述

为 CommandBar(命令栏,本仓库后续阶段交付)设计的命令按钮。与标准 Button 的差别:默认外观是透明背景的小尺寸按钮(宽 68、最小高 64);内容用 `label` 与 `#icon` 插槽设置而非默认插槽(WinUI 中 Content 属性被忽略);`isCompact` 紧凑态只保留图标、隐藏文字标签。视觉上图标在上、标签在下(12px 居中),悬停/按下使用命令栏的列表高亮而非普通按钮的灰色填充;加速键文本按 WinUI 源只在**溢出菜单**内以行尾小字呈现(`KeyboardAcceleratorPlacementMode=Hidden`,主命令区不呈现内联角标)。

本组件对照 WinUI 3 默认样式(`controls/dev/CommonStyles/AppBarButton_themeresources.xaml` 的 `DefaultAppBarButtonStyle`,`generic.xaml` 中 `<Style TargetType="AppBarButton">` 为同名模板锚点)实现五态(Normal / PointerOver / Pressed / Disabled / Focus);命令栏溢出(Overflow)态族属于 CommandBar 范畴,不在本组件内。

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
| `keyboardAcceleratorText` | `string` | `''` | 加速键文本(WinUI `KeyboardAcceleratorTextOverride`,如 `Ctrl+S`):按源只在**溢出菜单**(`UseOverflowStyle`)内以 Caption 字号右对齐呈现;主命令区不呈现内联角标(`KeyboardAcceleratorPlacementMode=Hidden`,WinUI 仅以 Tooltip 提示);空串不显示 |
| `width` | `number \| string` | `68` | 按钮宽度(WinUI `Width`;默认样式固定 `Width=68`) |
| `reveal` | `boolean` | `undefined` | Reveal 揭示光照(对照 `AppBarButtonRevealStyle`,generic.xaml L17041):悬浮时跟随指针的底板光 + 1px 边框光环。缺省跟随宿主——独立使用默认关闭(源 keyless 默认样式 L19126 非 reveal),CommandBar 内默认启用(源模板隐式样式 L16221 的等价 provide 作用域);显式 `true` / `false` 强制覆盖。见 [_reveal.md](./_reveal.md) |
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
  <!-- 图标 + 标签;加速键文本在独立使用时不会出现在按钮上(源 PlacementMode=Hidden),
       只会在 CommandBar 溢出菜单内呈现,见差异节 -->
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
- **加速键角标只在溢出菜单呈现(主命令区不呈现)**:WinUI 的默认样式设 `KeyboardAcceleratorPlacementMode="Hidden"`(`AppBarButton_themeresources.xaml` L138;`generic.xaml` L19137 同),运行期只有 `UseOverflowStyle`(按钮位于溢出区)且键盘存在时才切到 `KeyboardAcceleratorTextVisible`(`dxaml/xcp/dxaml/lib/AppBarButtonHelpers.h` L201-206),主命令区恒 `Collapsed`,仅以 Tooltip「Label (Ctrl+S)」提示。因此本组件默认不渲染内联角标(不占列宽、不压标签);`CommandBar` 溢出层把 CSS 变量 `--wui-app-bar-accelerator-display` 置为 `block` 后角标在溢出菜单行尾右对齐呈现。真实组合键监听未实现:`KeyboardAccelerators` 的全局激活属宿主应用行为,可用 `window.addEventListener('keydown')` 自行绑定后触发 `click`。
- **CornerRadius**:本参照源的 AppBarButton 默认 Style 并无 `CornerRadius` setter(模板仅 `TemplateBinding CornerRadius`,取属性默认),无官方圆角可对照;此处与 Button.vue 家族惯例一致,取 4px 近似 token `--wui-hyperlink-focus-rect-corner-radius`,保持控件族观感统一。
- **加速键角标颜色按态独立**:角标前景不随按钮前景继承,对照 `AppBarButtonKeyboardAcceleratorTextForeground*` 资源系列(generic.xaml L1894-L1897)逐态取 token —— Normal = BaseMedium、PointerOver/Pressed = HighlightAltBaseMedium、**Disabled = DisabledBaseMediumLow(与整体前景同一禁用色)**;fix round 1 前曾漏掉 Disabled 态(角标保持 base-medium,可见偏差),已补规则并修正注释。
- **未实现 WinUI 侧的溢出/CommandBar 专属状态**:`Overflow` / `OverflowWithToggleButtons` / `LabelOnRight` 等视觉态与 `Flyout` 属性属于 CommandBar / 弹层族范畴,由后续 CommandBar 任务承载。`AppBarButtonRevealStyle` 揭示光照已实现(MR8):经 `reveal` prop(opt-in)/ CommandBar 内 provide 上下文(默认启用)接入公共层,见 [_reveal.md](./_reveal.md);溢出形态的 reveal 视觉由 CommandBar 溢出层统一适配。
- **图标字体按 R1 裁决不做网络字体加载**:`Segoe Fluent Icons` 依赖本机字体栈;图标尺寸沿用图标列高度 16px(`AppBarButtonContentHeight`)。
- **尺寸口径取 WinUI 3 值(非 UWP generic.xaml)**:`AppBarThemeMinHeight` WinUI 3 为 **64**(`CommandBar_themeresources.xaml` L71;UWP `generic.xaml` L19461 为 56),`AppBarButtonContentViewboxCollapsedMargin` WinUI 3 为 **0,16,0,2**(`AppBarButton_themeresources.xaml` L112;UWP 为 0,12,0,4)。按「视觉与 WinUI 3 完全一致」的口径统一取 WinUI 3 值(宽 68 / 标签 FontSize 12 / TextLabelMargin 2,0,2,8 三值两版一致)。
- **Width 可覆盖**:WinUI 默认样式固定 `Width=68`,本组件以 `width` 属性暴露同款默认值,便于紧凑排列与自适应演示。

## 互链

- 控件族:[DropDownButton](./DropDownButton.md) · [MenuFlyout](./MenuFlyout.md)
- 图标:[IconElement](./IconElement.md)
- 弹层基建:[弹层公共基建](./_popup-infra.md)
- Reveal 材料:[_reveal.md](./_reveal.md)(`reveal` prop / CommandBar 上下文的默认值口径与降级语义)
