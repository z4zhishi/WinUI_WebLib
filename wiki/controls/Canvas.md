# Canvas

在线示例:[/#/canvas](/#/canvas)

## 概述

Canvas 是 WinUI 中支持**绝对定位**的布局面板:子项相对画布的顶边/左边摆放(坐标以像素计),彼此互不干扰、也不参与画布自身的度量。适合画图表面板、自由拖拽排版等「坐标即布局」的场景;常规自适应布局官方更推荐 Grid / StackPanel。

本组件是 WinUI Canvas 的 Web 复刻:渲染为一个 `position: relative` 的 `div`,子项全部 `position: absolute` 定位;默认不裁剪溢出子项(与 WinUI Canvas 一致,`CCanvas::UpdateLayoutClip` 注释「Canvas does not normally support layout clipping」)。

官方文档:

- [Canvas - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.canvas)
- [Guidelines(布局面板指南)](https://learn.microsoft.com/windows/apps/design/layout/layout-panels#canvas)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `background` | `string` | 未设置(透明) | 画布底色,任意 CSS 颜色或 `--wui-*` 变量(对应 `Panel.Background`;WinUI 默认为 null 画刷 → 透明) |
| `clipToBounds` | `boolean` | `false` | 是否裁剪溢出画布边界的子项;WinUI Canvas 默认不裁剪,此属性为本项目 Web 扩展 |

画布尺寸没有专有属性:与 WinUI 的 `Width`/`Height` 一样,通过 `$attrs` 透传的 `style`(`width`/`height`)或 `class` 给定。未给尺寸时画布高度为 0(子项不撑开画布,与 WinUI 度量行为一致)。

## 附加属性(子元素 `data-canvas-*`)

WinUI 的附加属性(如 `Canvas.Top`)附着在**子项**上而非面板上;本组件以子元素的 `data-canvas-*` attribute 表达,组件在渲染时把它们映射为 `position: absolute` 内联样式,**使用方无需手写任何定位 style**(方案为本组件独立选择,与 Grid 等其他面板的实现互不约束):

| 附加属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `data-canvas-top` | `number \| string` | 未设置 | 子项顶边到画布顶边的距离(对应 `Canvas.Top`);数字按 px,字符串原样作为 CSS 长度 |
| `data-canvas-left` | `number \| string` | 未设置 | 子项左边到画布左边的距离(对应 `Canvas.Left`) |
| `data-canvas-right` | `number \| string` | 未设置 | 子项右边到画布右边的距离(扩展,WinUI 无此附加属性) |
| `data-canvas-bottom` | `number \| string` | 未设置 | 子项底边到画布底边的距离(扩展,WinUI 无此附加属性) |
| `data-canvas-z-index` | `number \| string` | 未设置 | 子项叠放层级(对应 `Canvas.ZIndex`);未设置时按声明顺序,后声明者在上;支持负值 |

## 事件

Canvas 为纯布局面板,**无业务事件**;子项自身的交互事件(点击、拖拽等)照常触发与冒泡。

## 基础用法

```vue
<script setup lang="ts">
import WuiCanvas from '@/components/Canvas.vue'
</script>

<template>
  <!-- 左上角定位 + ZIndex 叠放(对照官方示例:四个矩形阶梯叠放) -->
  <WuiCanvas background="var(--wui-system-control-background-chrome-medium-low)" style="width: 140px; height: 140px">
    <div class="rect" data-canvas-top="0" data-canvas-left="0" data-canvas-z-index="0" />
    <div class="rect" data-canvas-top="20" data-canvas-left="20" data-canvas-z-index="1" />
    <div class="rect" data-canvas-top="40" data-canvas-left="40" data-canvas-z-index="2" />
    <div class="rect" data-canvas-top="60" data-canvas-left="60" data-canvas-z-index="3" />
  </WuiCanvas>

  <!-- 只设 Right/Bottom:按右下角锚定 -->
  <WuiCanvas style="width: 300px; height: 120px">
    <span data-canvas-right="12" data-canvas-bottom="12">右下角</span>
  </WuiCanvas>

  <!-- 四边同设:子项被拉伸填满画布(减去边距),Web 扩展语义 -->
  <WuiCanvas style="width: 300px; height: 120px">
    <div data-canvas-top="10" data-canvas-left="10" data-canvas-right="10" data-canvas-bottom="10" />
  </WuiCanvas>

  <!-- 默认不裁剪;clipToBounds 打开后溢出部分被裁掉 -->
  <WuiCanvas style="width: 200px; height: 80px" clip-to-bounds>
    <div data-canvas-top="60" data-canvas-left="150" class="big" />
  </WuiCanvas>
</template>
```

## 与 WinUI 的差异

1. **附加属性只有三个是 WinUI 原生的**:经核对参考源码(`CK/WinUI-Reference` 的 `winrtgeneratedclasses/Canvas.g.cpp` 仅提供 `Get/SetLeft`、`Get/SetTop`、`Get/SetZIndex` 静态访问器)与官方 API 文档的 attached properties 表,WinUI Canvas 只定义了 `Canvas.Left`、`Canvas.Top`、`Canvas.ZIndex`。`data-canvas-right` / `data-canvas-bottom` 是本项目扩展(能力对齐 WPF Canvas 的四边定位),WinUI 中不存在对应物。
2. **「同设拉伸」是 CSS 原生语义,不是 WinUI 行为**:`data-canvas-top` + `data-canvas-bottom` 同设(且子项无显式高度)时子项垂直拉伸填满两边缘间距,`left` + `right` 同设同理水平拉伸——这来自 CSS 绝对定位的原生规则。WinUI Canvas 做不到这一点:它的布局实现(`canvas.cpp` 的 `ArrangeOverride`)按子项 desired size 摆放、从不拉伸,也没有 Right/Bottom 附加属性可设。若子项另有显式宽度/高度(过约束),CSS 取 left/top、忽略 right/bottom。
3. **默认不裁剪,裁剪为扩展开关**:WinUI Canvas 默认不做 layout clip(子项可以画出画布外);组件一致地默认 `overflow: visible`,`clipToBounds` 打开后才 `overflow: hidden`(WinUI 无同名 API,对应 WPF 的 `ClipToBounds` 概念)。
4. **`Canvas.ZIndex` 映射 `z-index`**:语义一致(值大者在上,未设时按声明顺序,负值沉底)。差别仅在 CSS 中 `z-index` 生效需要定位上下文,组件给全部子项注入了 `position: absolute`,与 WinUI「Canvas 子项一律参与 ZIndex 排序」的行为一致。
5. **定位基准是内容盒**:CSS 偏移相对画布 `div` 的 padding box;XAML 相对 Canvas 的矩形本体。若给画布加内边距,两者会有边距差。演示场景未加 padding,行为一致。
6. **数值支持 CSS 长度串**:`data-canvas-*` 可写 `'50%'`、`'calc(20px + 2em)'` 等,WinUI 附加属性只接受 Double 像素值;百分比在 WinUI 中无对应语义。
7. **无视觉状态、无模板**:Canvas 不是模板控件(无 ControlTemplate / 视觉状态树),组件因此没有交互态样式,也不声明业务事件。
8. **子项类型**:`slot` 可以放任意元素或组件(组件需要透传 `$attrs`/`style` 到根节点,本仓库控件均满足);WinUI 要求子项必须是 `UIElement`。

## 相关链接

- 演示页源码:[demo/pages/CanvasPage.vue](../../demo/pages/CanvasPage.vue)
- 组件源码:[src/components/Canvas.vue](../../src/components/Canvas.vue)
- 同类面板:Grid(行列网格)、StackPanel(堆叠)、RelativePanel(相对定位)
