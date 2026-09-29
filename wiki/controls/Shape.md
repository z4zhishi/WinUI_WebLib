# Shape(形状族)

在线示例:[/#/shape](/#/shape) · 演示页源码:[demo/pages/ShapePage.vue](../../demo/pages/ShapePage.vue)

## 概述

WinUI 的 Shape 是「基础形状」家族的抽象基类(Ellipse、Rectangle、Polygon、Polyline、Line、Path 等),官方定位是:**基础形状用于装饰性渲染,或用于组合控件的非交互部分**。形状不是 Control——没有 ControlTemplate 与视觉状态树,而是继承 FrameworkElement 的一类「可绘制元素」,由基类统一提供 Fill / Stroke / StrokeThickness / StrokeDashArray / StrokeLineJoin / Stretch 等绘制属性(依赖属性清单见 `CK/WinUI-Reference/.../winrtgeneratedclasses/Shape.g.cpp`)。

本库将其中五个常用形状复刻为 Web 组件(全部以 `<svg>` 渲染,几何/描边参数一一对应):

- [Ellipse](../../src/components/Ellipse.vue) —— 椭圆(Width/Height 即形状尺寸)
- [Rectangle](../../src/components/Rectangle.vue) —— 矩形(RadiusX/RadiusY 圆角)
- [Polygon](../../src/components/Polygon.vue) —— 多边形(顶点串,**描边闭合**)
- [Polyline](../../src/components/Polyline.vue) —— 折线(顶点串,描边**不**闭合)
- [Path](../../src/components/Path.vue) —— 路径(XAML 路径迷你语言)

> 与 [PathIcon](IconElement.md) 的区分:PathIcon 是**图标控件**(IconElement 家族,单色前景 `foreground`、`viewBox` 由调用方给定、默认 `aria-hidden`、装饰性);Path 是**几何形状**(独立 fill/stroke/描边参数、按 Stretch 参与布局)。两者接受同一种路径迷你语言,但职责不同,勿混用。

官方文档:

- [Shapes - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.shapes)
- [Guidelines(形状设计准则)](https://learn.microsoft.com/previous-versions/windows/apps/hh465055(v=win.10))

## 族总览

| 组件 | WinUI 控件 | 关键属性 | Web 渲染 | 组件源码 |
| --- | --- | --- | --- | --- |
| Ellipse | `Ellipse` | `width` / `height`(即形状尺寸) | `<svg><ellipse>` | [src/components/Ellipse.vue](../../src/components/Ellipse.vue) |
| Rectangle | `Rectangle` | `radiusX` / `radiusY` 圆角 | `<svg><rect>` | [src/components/Rectangle.vue](../../src/components/Rectangle.vue) |
| Polygon | `Polygon` | `points` + `fillRule`(闭合) | `<svg><polygon>` | [src/components/Polygon.vue](../../src/components/Polygon.vue) |
| Polyline | `Polyline` | `points` + `fillRule`(不闭合) | `<svg><polyline>` | [src/components/Polyline.vue](../../src/components/Polyline.vue) |
| Path | `Path` | `data`(路径迷你语言) | `<svg><path>` | [src/components/Path.vue](../../src/components/Path.vue) |

Polygon 与 Polyline 的闭合语义与 WinUI/SVG 一致:**描边**层面 Polygon 连接末点回起点、Polyline 不连;**填充**层面两者都按首尾连线隐式闭合后计算区域。

## 公共属性(形状基类,五个组件都有)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fill` | `string` | 未设置(不填充) | 填充色;WinUI `Fill` 缺省为 null 画刷(不填充)。任意 CSS 颜色或 `--wui-*` 变量 |
| `stroke` | `string` | 未设置(不描边) | 描边色;WinUI `Stroke` 缺省为 null。任意 CSS 颜色或 `--wui-*` 变量 |
| `strokeThickness` | `number` | `1` | 描边厚度(px);描边沿几何边界居中(内外各半),且**不随 Stretch/几何缩放**(WinUI 描边按设备像素应用) |
| `strokeDashArray` | `string \| number[]` | — | 虚线段长序列,如 `"2 1"` 或 `[2, 1]`;数值以 `strokeThickness` 为单位(WinUI `StrokeDashArray` 语义),组件负责换算成 SVG 用户单位 |
| `strokeLineJoin` | `'Miter' \| 'Bevel' \| 'Round'` | `'Miter'` | 折线连接样式(WinUI `StrokeLineJoin`,类型 `PenLineJoin`) |
| `stretch` | `'None' \| 'Fill' \| 'Uniform' \| 'UniformToFill'` | `'None'` | 拉伸方式(详见下节) |
| `opacity` | `number` | `1` | 整体不透明度(UIElement.Opacity,0–1) |
| `width` / `height` | `number \| string` | Ellipse/Rectangle 缺省 100;其余按几何自然尺寸 | 形状视口尺寸(FrameworkElement.Width/Height);给定时配合 `stretch` 映射几何 |

各组件特有属性:

| 组件 | 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| Ellipse | — | — | — | 几何 = 布局矩形,`stretch` 无视觉效果(与 WinUI 一致) |
| Rectangle | `radiusX` / `radiusY` | `number` | `0` | 圆角椭圆半径(px),两轴独立;负值按 0 |
| Polygon | `points` | `string` | `''` | 顶点串,数值以空白/逗号分隔(与 SVG points 同语法) |
| Polygon | `fillRule` | `'EvenOdd' \| 'Nonzero'` | `'EvenOdd'` | 填充规则;自交多边形两者观感不同 |
| Polyline | `points` / `fillRule` | 同 Polygon | 同上 | 同上(注意闭合差异) |
| Path | `data` | `string` | `''` | XAML 路径迷你语言;`F0`/`F1` 前缀(可省)选择填充规则,XAML 缺省 EvenOdd |

## Stretch 语义详解

`stretch` 决定**几何**(不是描边)如何映射进形状视口(显式 `width`/`height`,缺省为几何自然尺寸):

| 值 | 语义 | Web 实现 |
| --- | --- | --- |
| `None`(缺省) | 几何按原坐标 1:1 绘制;显式尺寸只扩大布局盒,不缩放几何 | 无变换,几何用原始坐标 |
| `Fill` | 几何边界两轴独立拉伸填满视口(可能变形) | `translate + scale(sx, sy)` |
| `Uniform` | 等比缩放取**最小**比例,完整显示、可能留白,几何在视口内居中 | `scale(min(sx, sy))` + 居中平移 |
| `UniformToFill` | 等比缩放取**最大**比例,填满视口,溢出部分**裁剪**到形状边界(官方文档明确会裁剪) | `scale(max(sx, sy))` + 居中平移,svg 溢出隐藏 |

两个关键点:

1. **描边不参与缩放** —— WinUI 的 Stretch 变换作用于几何,`StrokeThickness`/`StrokeDashArray` 按设备像素应用。本组件对 stroke-width/dasharray 除以拉伸倍数补偿,滑块调 thickness 时四档 stretch 观感一致;SVG 原生 viewBox 缩放会把描边一起放大,故未采用。
2. **与 Viewbox 的区别** —— [Viewbox](Viewbox.md) 缩放的是**任意子内容的整体渲染结果**(描边、文字随缩放变大),且默认不裁剪溢出(`UniformToFill` 会画出边界之外);Shape 的 Stretch 只缩放**几何路径本身**,描边厚度不变,且 `UniformToFill` 会把溢出裁剪到形状边界。一句话:Viewbox 是「缩放容器」,Shape.Stretch 是「几何的视口映射」。

## 事件

形状是**纯绘制元素,无业务事件**(WinUI 的 Shape 也没有自定义事件);指针点击、悬停等原生事件经 `$attrs` 透传到根 `<svg>` 元素,可按需监听。

## 基础用法

```vue
<script setup lang="ts">
import WuiEllipse from '@/components/Ellipse.vue'
import WuiRectangle from '@/components/Rectangle.vue'
import WuiPolygon from '@/components/Polygon.vue'
import WuiPolyline from '@/components/Polyline.vue'
import WuiPath from '@/components/Path.vue'
</script>

<template>
  <!-- 椭圆:宽高即尺寸,描边沿边界居中 -->
  <WuiEllipse :width="120" :height="80" fill="var(--wui-system-accent-color)" stroke="var(--wui-application-foreground-theme)" :stroke-thickness="4" />

  <!-- 矩形:两轴独立的圆角半径 -->
  <WuiRectangle width="120" height="80" :radius-x="16" :radius-y="8" fill="var(--wui-system-accent-color)" />

  <!-- 多边形(描边闭合)与折线(描边不闭合) -->
  <WuiPolygon points="10,100 60,40 200,40 250,100" fill="var(--wui-system-accent-color)" stroke="black" :stroke-thickness="4" />
  <WuiPolyline points="10,100 60,40 200,40 250,100" stroke="black" :stroke-dash-array="'2 1'" :stroke-thickness="4" />

  <!-- 路径:XAML 迷你语言,F1 显式 Nonzero 填充;Uniform 拉伸到 96px 盒 -->
  <WuiPath data="F1 M 16,12 20,2L 20,16 1,16" fill="var(--wui-system-accent-color)" stretch="Uniform" :width="96" :height="96" />
</template>
```

## 与 WinUI 的差异

1. **渲染技术**:XAML 形状由合成器按 DirectWrite/D2D 栅格化;本族以 SVG 绘制,描边对接/虚线形态与 WinUI 基本一致,极端小数坐标可能有亚像素差异。
2. **Path 的几何边界为近似**:`Path` 需要「几何边界」做 Stretch 映射与自然尺寸,组件按路径坐标解析求界——直线/H/V 精确;贝塞尔曲线把**控制点**计入界(结果为精确界的外包超集,`Uniform` 可能略小于 WinUI);`A` 圆弧不计弧顶极值(端点精确)。需要精确一致时显式给 `width`/`height`。
3. **Fill 档的描边**:非等比的 `Fill` 拉伸下,SVG 变换无法让描边保持完全均匀,组件按水平倍数补偿,垂直方向描边厚度可能略有偏差(Uniform/UniformToFill/None 无此问题)。
4. **缺省尺寸**:`Ellipse`/`Rectangle` 的 WinUI 行为是「随布局填充」(无缺省像素尺寸),Web 组件缺省 100×100 便于独立使用;`Polygon`/`Polyline`/`Path` 未给尺寸时按几何自然尺寸(对应 WinUI 的 DesiredSize)。
5. **描边溢出不裁剪**:WinUI 形状描边外半溢出布局边界且默认不裁剪,组件以 `overflow: visible` 对齐(仅 `UniformToFill` 裁剪);密集排版时请自行留出半厚度间距。
6. **颜色与官方示例**:官方 Gallery 示例用字面色 `SteelBlue`/`Black`;组件与示例页改用 `--wui-*` token(跟随主题),需要还原观感可传字面色值。
7. **未实现项**:`StrokeMiterLimit`、`StrokeDashCap`、`StrokeStartLineCap`/`StrokeEndLineCap`、`Line` 与 `Path` 的 `Data` 对象模型(StreamGeometry/绑定)等不在本波次;`strokeLineJoin` 命名随 WinUI(`StrokeLineJoin`),不是 `strokeJoin`。
8. **Width/Height 类型**:只支持数值语义(px;数字或数字字符串),`Auto`/百分比请改用 CSS 或不传。

## 官方示例对照

对照 `CK/WinUI-Gallery/WinUIGallery/Samples/Shape/ShapePage.xaml`(示例页均已在 demo 页复刻):

- Ellipse 示例:Width/Height 滑块(100–150)+ StrokeThickness 滑块(2–10)→「Ellipse」演示区 + 同范围滑块;
- Rectangle 示例:Width/Height/StrokeThickness 滑块 + RadiusX/RadiusY 滑块(0–100)→「Rectangle」演示区;
- Polygon 示例:固定四点 `Points="10,100 60,40 200,40 250,100"`、320×200 Canvas、「Show points」顶点标注开关、Thickness 滑块 →「Polygon」演示区(标注文本的 Canvas.Left/Top 原样复刻);
- 折线闭合对照、五角星 FillRule 对照、Path 数据输入与 Stretch 四档对照为本站补充教学演示。

## 相关链接

- 演示页源码:[demo/pages/ShapePage.vue](../../demo/pages/ShapePage.vue)
- 共享几何工具:[src/utils/shapeGeometry.ts](../../src/utils/shapeGeometry.ts)(Stretch 映射 / points 与路径解析)
- 几何标记语法详解:[Geometry](Geometry.md)(Path 迷你语言逐指令对照、解析器与包围盒口径)
- 图标用路径请用:[PathIcon](IconElement.md)(IconElement 家族;与本族 Path 的职责区分见顶部概述)
- 同类:Viewbox(整体缩放容器,与 Stretch 的区别见上文)、Canvas(形状常被绝对定位其中)
