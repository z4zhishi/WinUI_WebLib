# AppBarSeparator

在线示例:[/#/appbarseparator](/#/appbarseparator)

## 概述

AppBarSeparator 在应用命令栏(app bar / CommandBar)里画一条**竖分隔线**,用来把多组命令按钮在视觉上分组。它有一个 compact(紧凑)态:收窄自己的占位,以匹配 AppBarButton / AppBarToggleButton 的紧凑形态。它本身不可交互、不可聚焦(WinUI 模板 `IsTabStop=False`),是纯装饰件。

本组件是 WinUI AppBarSeparator 的 Web 复刻:渲染为一个 `role="separator"` 的容器 div + 内层 1px 竖线,默认作为 flex 行的子项**拉伸填满命令栏行高**;`isCompact` 时高度收窄到 AppBarThemeCompactHeight(48px)并顶部对齐;`useOverflowStyle` 时变为溢出区的**横向** 1px 细分隔线(命令被收进溢出菜单时的形态)。

官方文档:

- [AppBarSeparator - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.appbarseparator)
- [Guidelines(CommandBar 指南)](https://learn.microsoft.com/windows/apps/design/controls/command-bar)

官方示例:`CK/WinUI-Gallery/WinUIGallery/Samples/AppBarSeparator/`——`CommandBar.PrimaryCommands` 里 AppBarButton(Attach Camera | Like / Dislike | Orientation)之间夹两条 AppBarSeparator。
## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `isCompact` | `boolean` | `false` | 是否以 compact(紧凑)态渲染(对应 WinUI `IsCompact`):高度收窄到 `AppBarThemeCompactHeight`(48px)并顶部对齐,不再拉伸填满命令栏 |
| `useOverflowStyle` | `boolean` | `false` | 是否套用溢出(Overflow)区样式(对应 WinUI `UseOverflowStyle`):竖线变为 1px 横向分隔线(上下 4px 边距);优先级高于 `isCompact`,且 `aria-orientation` 同步为 `horizontal` |
| `foreground` | `string` | 官方源值局部 token | 分隔线颜色,任意 CSS 颜色或 `--wui-*` 变量(对应 WinUI `Foreground`;缺省 `DividerStrokeColorDefault`:浅色 `#0000000f` ≈5.9% 黑 / 深色 `#ffffff15` ≈8.2% 白,随主题切换) |

辅助语义:组件固定输出 `role="separator"` 与 `aria-orientation`(竖线 `vertical`;ARIA 中 separator 默认 orientation 是 horizontal,竖线必须显式声明;溢出样式下翻转)。`class` / `style` / 其他 `aria-*` 经 `$attrs` 透传到根元素。

## 事件

无业务事件——AppBarSeparator 是非交互装饰件(WinUI 模板无 PointerOver / Pressed / Disabled 视觉状态、`IsTabStop=False`),组件不声明 emits;原生 DOM 事件照常触发。

## 基础用法

```vue
<script setup lang="ts">
// FontIcon 为已入库的同库组件(示例页与下述用法均直接从 @/components 导入即可),
// 这里仅为展示命令按钮的图标槽;分隔线本身不依赖它。
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiAppBarSeparator from '@/components/AppBarSeparator.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
</script>

<template>
  <!-- 命令按钮之间分组(官方示例组合):分隔线放 flex 行里,自动拉伸填满行高 -->
  <div style="display: flex; align-items: stretch; height: 64px">
    <WuiAppBarButton label="Attach Camera">
      <template #icon><WuiFontIcon glyph="&#xE71B;" /></template>
    </WuiAppBarButton>
    <WuiAppBarSeparator />
    <WuiAppBarButton label="Like">
      <template #icon><WuiFontIcon glyph="&#xE8FB;" /></template>
    </WuiAppBarButton>
    <WuiAppBarButton label="Dislike">
      <template #icon><WuiFontIcon glyph="&#xE8DB;" /></template>
    </WuiAppBarButton>
    <WuiAppBarSeparator />
    <WuiAppBarButton label="Orientation">
      <template #icon><WuiFontIcon glyph="&#xE7C5;" /></template>
    </WuiAppBarButton>
  </div>

  <!-- compact 态:收窄到 48px 顶对齐,匹配紧凑命令按钮(命令按钮同步 :is-compact="true") -->
  <WuiAppBarSeparator is-compact />

  <!-- 溢出区的横向细分隔线 -->
  <WuiAppBarSeparator use-overflow-style />
</template>
```

## 视觉规格对照

对照源:`CK/WinUI-Reference/controls/dev/CommonStyles/AppBarSeparator_themeresources.xaml`(WinUI 3 随包主题资源)+ `dxaml/xcp/dxaml/themes/generic.xaml` L6476 起的 `TargetType="AppBarSeparator"` 模板段。

| XAML 值 | 来源 | Web 实现 |
| --- | --- | --- |
| 线宽 `AppBarSeparatorWidth = 1` | AppBarSeparator_themeresources.xaml | `width: 1px` |
| 圆角 `AppBarSeparatorCornerRadius = 0.5` | 同上 | `border-radius: 0.5px` |
| 外边距 `AppBarSeparatorMargin = 2,8,2,8`(左,上,右,下) | 同上(`Padding`) | 容器 `padding: 8px 2px`(CSS 上/下 8、左/右 2) |
| Compact 态 `RootGrid.Height = AppBarThemeCompactHeight = 48` + 顶对齐 | 同上(高度值见 CommandBar_themeresources.xaml) | `.is-compact { height: 48px; align-self: flex-start }` |
| Overflow 态 `AppBarOverflowSeparatorHeight = 1`、`AppBarOverflowSeparatorMargin = 0,4,0,4`、横向 Stretch | 同上 | `.is-overflow { padding: 4px 0 }` + 线 `height: 1px` 横向撑满 |
| FullSize 态 Rectangle `VerticalAlignment = Stretch` | 同上 | 容器 flex 子项默认 `align-self: stretch`,线 `align-self: stretch` |
| `Foreground = DividerStrokeColorDefaultBrush`(light `#0F000000` / dark `#15FFFFFF`) | AppBarSeparator_themeresources.xaml + Common_themeresources_any.xaml | 组件局部 token `--wui-app-bar-separator-foreground`(`#0000000f` / 深色 `#ffffff15`,见差异第 1 条) |

视觉状态:WinUI 侧只有 ApplicationViewStates(FullSize / Compact / Overflow),**没有** PointerOver / Pressed / Disabled / Focus 态——分隔线不响应指针、不进 tab 序,Web 版与之保持一致。

## 与 WinUI 的差异

1. **分隔线颜色以局部 token 携带官方源值**:WinUI 3 的 `AppBarSeparatorForeground` 是 `DividerStrokeColorDefaultBrush`——light 字典 `#0F000000`(≈5.9% 黑)、Default(dark)字典 `#15FFFFFF`(≈8.2% 白),theme.css 没有提取该 token。按 InfoBar 先例,组件以 scoped 局部 token `--wui-app-bar-separator-foreground` 携带两档源值并随 `html[data-theme='dark']` 切换。注意源里 `SystemControlForegroundBaseMediumLow` 仅属 AppBarSeparator 的 **HighContrast 档**(theme.css 的同名 token `--wui-system-control-foreground-base-medium-low` 为 40% alpha 的常规前景灰,数值差 5–7 倍,不可作常规档取色);本组件未复刻 HighContrast 档,如需可经 `foreground` 属性覆盖。
2. **Compact 态的"收窄"实现口径**:`dxaml/xcp/dxaml/themes/generic.xaml` 里 AppBarSeparator 的 `Compact` 视觉状态是**空的**(该文件只有竖线几何 + Overflow 态);"收窄"行为以 WinUI 3 `controls/dev/CommonStyles/AppBarSeparator_themeresources.xaml` 为准——不是边距数字变小,而是高度被钉到 `AppBarThemeCompactHeight`(48px)并顶对齐(视觉同为收窄)。本组件按后者实现。
3. **溢出样式是手动开关**:WinUI 里 `UseOverflowStyle` / `IsInOverflow` 由 CommandBar 的溢出布局逻辑自动驱动;本库尚未实现 CommandBar,`useOverflowStyle` 是手动布尔属性,无自动联动(`IsInOverflow` 只读属性未复刻)。
4. **布局假设与兜底**:WinUI 分隔线总在 CommandBar 的行内、由父容器给高度;Web 版若被放进非 flex / 无高度约束的上下文会塌成 0,组件用 `min-height: 48px` 兜底保证可见(等价于命令栏最小 compact 高度),需要更高时把组件放进指定高度的 flex 行。
5. **无交互、无业务事件**:与 WinUI 一致(模板无交互视觉状态、`IsTabStop=False`);Web 版不声明 emits,键盘焦点语义由 `role="separator"` 表达(非可聚焦分隔线,不进 Tab 序)。

## 相关链接

- 在线示例:[/#/appbarseparator](/#/appbarseparator)
- 演示页源码:[demo/pages/AppBarSeparatorPage.vue](../../demo/pages/AppBarSeparatorPage.vue)
- 组件源码:[src/components/AppBarSeparator.vue](../../src/components/AppBarSeparator.vue)
- 同类控件:MenuFlyoutSeparator(菜单内的横向分隔线)、AppBarButton / AppBarToggleButton(命令按钮,compact 态配对)、CommandBar(命令栏容器,待实现)
