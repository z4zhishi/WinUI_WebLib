# StackPanel

在线示例:[/#/stackpanel](/#/stackpanel)

## 概述

StackPanel 用于把子项排列成**一行**,方向可垂直(默认)或水平,常用于工具栏按钮组、表单字段堆叠、列表项内部布局等"线性堆叠"场景。它不是模板控件(没有 ControlTemplate 与视觉状态树),只负责布局语义:子项按主轴依次排列,间距由 `Spacing` 控制,子项在交叉轴上默认拉伸(Stretch),面板不裁剪内容。

本组件是 WinUI StackPanel 的 Web 复刻:渲染为一个 CSS flexbox 容器 —— `Orientation` 映射 `flex-direction`、`Spacing` 映射 `gap`、交叉轴 Stretch 映射 `align-items: stretch`,并保持 WinUI 的三条关键语义:**子项 margin 不折叠**、**主轴不分配剩余空间给子项**、**空间不足时子项保持期望尺寸并溢出面板边界(不裁剪)**。

官方文档:

- [StackPanel - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.stackpanel)
- [Guidelines(布局面板指南)](https://learn.microsoft.com/windows/apps/design/layout/layout-panels)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `orientation` | `'Horizontal' \| 'Vertical'` | `'Vertical'` | 排列方向;映射 CSS `flex-direction` |
| `spacing` | `number \| string` | `0` | 相邻子项间距;数字按 px,映射 `gap`(只在子项之间生效,首尾不加,与 WinUI 一致) |
| `padding` | `number \| string` | `0` | 面板内边距(FrameworkElement.Padding);数字按 px |
| `background` | `string` | 透明 | 面板背景色(Panel.Background);任意 CSS 颜色或 `--wui-*` 变量 |

slot:默认 slot 放置子项。子项在交叉轴默认 Stretch(拉伸填满),单个子项可用自身 `style="align-self: …"` 覆写;子项在主轴上保持自身期望尺寸(不拉伸、不压缩)。

## 事件

StackPanel 为纯布局面板,**无业务事件**;子项自身的交互事件(如按钮 click)照常触发,不被面板拦截。

## 基础用法

```vue
<script setup lang="ts">
import WuiStackPanel from '@/components/StackPanel.vue'
</script>

<template>
  <!-- 最简:垂直堆叠(默认),官方示例的四色块 -->
  <WuiStackPanel :spacing="8">
    <div class="item">A</div>
    <div class="item">B</div>
    <div class="item">C</div>
  </WuiStackPanel>

  <!-- 水平排列 + 内边距 + 背景色 -->
  <WuiStackPanel
    orientation="Horizontal"
    :spacing="12"
    :padding="16"
    background="var(--wui-system-control-background-chrome-medium-low)"
  >
    <div class="item">A</div>
    <div class="item">B</div>
  </WuiStackPanel>

  <!-- 混合子项:可交互控件照常放入,子项自带 margin 不折叠 -->
  <WuiStackPanel :spacing="12">
    <WuiTextBlock text="标签:" />
    <WuiButton content="确定" />
  </WuiStackPanel>

  <!-- 交叉轴对齐覆写:某个子项不拉伸,靠右 -->
  <WuiStackPanel :spacing="8">
    <div class="item" style="align-self: flex-end">靠右</div>
  </WuiStackPanel>
</template>
```

## 与 WinUI 的差异

1. **margin 无折叠,语义一致**:WinUI 的 FrameworkElement.Margin 从不折叠;Web 的块级布局会把相邻兄弟的垂直 margin 折叠。本组件用 flex 容器承载子项,flex 天然不折叠 margin,因此「子项自身 margin 照常生效、不与相邻子项合并」的 WinUI 语义得到保持。
2. **主轴不分配剩余空间**:WinUI StackPanel 按子项期望尺寸依次排列,不会把剩余空间分给子项;组件对子项设 `flex: 0 0 auto`(`flex-grow: 0`)对应。需要子项撑满主轴时,WinUI 应改用 `Grid`/`DockPanel`,Web 可在子项上自行加 `flex: 1`。
3. **空间不足时溢出而非压缩**:WinUI StackPanel 不裁剪内容(默认无 Clip),空间受限时子项仍按期望尺寸排布并溢出面板边界;组件对应设 `flex-shrink: 0` 与 `overflow: visible`。注意这与 Web flex 默认(flex-shrink: 1 会压缩子项)不同,是有意对齐 WinUI 的选择。
4. **交叉轴 Stretch 的实现**:`align-items: stretch` 与 WinUI「子项默认 HorizontalAlignment/VerticalAlignment=Stretch」对应;但 Web 里交叉轴拉伸的是盒模型宽度/高度,不涉及 WinUI 的 Measure/Arrange 两阶段测量,文字换行等细节由浏览器排版决定。
5. **命名色块**:官方示例用 Red/Blue/Green/Yellow 命名色矩形演示,本组件 token 集没有对应命名色,示例页用强调色(accent)浓淡梯度近似,属演示内容替换,不影响布局语义。
6. **尺寸属性未提供**:Width/Height/MinWidth/MaxWidth/Alignment 等 FrameworkElement 布局属性暂未做成 props,可经 `$attrs` 透传 `style`(如 `style="width: 200px"`)替代;`HorizontalAlignment`/`VerticalAlignment` 由父容器决定,Web 中用父级 flex 的 `align-items`/`justify-content` 表达。
7. **无视觉状态**:StackPanel 无 ControlTemplate、不响应 PointerOver/Pressed/Focus,组件因此没有交互态样式;`Background` 缺省透明,与 WinUI Panel.Background 默认 null 一致。
8. **Spacing 的近似**:CSS `gap` 与 WinUI Spacing 一样只在子项之间生效;个别浏览器旧版本对 flex gap 支持不完整(2020 年前的浏览器),目标环境为现代浏览器时不构成差异。

## 相关链接

- 演示页源码:[demo/pages/StackPanelPage.vue](../../demo/pages/StackPanelPage.vue)
- 组件源码:[src/components/StackPanel.vue](../../src/components/StackPanel.vue)
- 同类控件:Grid、Border、VariableSizedWrapGrid、RelativePanel(尚未迁移)
