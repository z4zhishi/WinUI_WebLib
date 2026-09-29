# Line

在线示例:[/#/line](/#/line)

## 概述

Line 在**两点之间绘制一条直线**:`(x1, y1)` 为起点、`(x2, y2)` 为终点,外观完全由描边决定(线段没有面积,`Fill` 对它无效)。它是 WinUI Shape 家族的成员,官方定位是装饰性绘制或控件的非交互部分。

本组件是 WinUI Line 的 Web 复刻:渲染为内联 SVG(`<svg>` + `<line>`),坐标即 SVG 用户空间像素;线段越出元素尺寸的部分与 WinUI 一致地可见(Shape 默认不被布局裁剪)。

官方文档:

- [Shapes - API(Shape 家族)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.shapes)
- [Guidelines(图形绘制指南)](https://learn.microsoft.com/previous-versions/windows/apps/hh465055(v=win.10))

> 重要语义:**没有 `stroke` 就什么也看不到**。WinUI 中 `Shape.Stroke` 默认为 null 画刷,Line 又没有填充面积,所以只设坐标不设描边的 Line 在 XAML 里同样不可见。

## 属性

属性名跟随 WinUI(camelCase),模板中可写 kebab-case(如 `:stroke-thickness="4"`):

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `x1` / `y1` | `number` | `0` | 起点坐标(px,坐标系原点在元素左上角) |
| `x2` / `y2` | `number` | `0` | 终点坐标(px) |
| `stroke` | `WuiBrush`(string \| 画刷描述) | 未设置(不渲染) | 描边画刷;字符串为纯色(CSS 颜色 / `currentColor` / `--wui-*` 变量),对象形式见下方「画刷描述接口」 |
| `strokeThickness` | `number` | `1` | 描边粗细(px,对应 `Shape.StrokeThickness`) |
| `strokeDashArray` | `string \| number[]` | 未设置(实线) | 虚线样式;**值为 `strokeThickness` 的倍数**(WinUI 语义,如 `"2 1"` = 2 倍粗细实段 + 1 倍粗细空段),组件转 SVG 时已乘上粗细;奇数个值自动重复成偶数(SVG 与 WinUI 行为一致) |
| `strokeDashOffset` | `number` | `0` | 虚线起始偏移,同为 `strokeThickness` 的倍数 |
| `strokeStartLineCap` | `'Flat' \| 'Square' \| 'Round' \| 'Triangle'` | `'Flat'` | 起点线帽(WinUI `PenLineCap`);映射 SVG `stroke-linecap`:Flat→butt、Square→square、Round→round,Triangle 经 SVG marker 三角形补绘 |
| `strokeEndLineCap` | 同上 | `'Flat'` | 终点线帽;SVG 只有一个 linecap,start/end 不同时以终点为准 |
| `strokeDashCap` | 同上 | `'Flat'` | 虚线段线帽;SVG 无独立虚线帽属性,开启虚线后由它决定 linecap(近似,见「与 WinUI 的差异」) |
| `strokeLineJoin` | `'Miter' \| 'Bevel' \| 'Round'` | `'Miter'` | 连接方式(映射 SVG `stroke-linejoin`);直线段没有转折点,无可见效果,为 Shape 家族接口预留 |
| `strokeMiterLimit` | `number` | `10` | 斜接限制(映射 SVG `stroke-miterlimit`) |
| `opacity` | `number` | `1` | 不透明度(WinUI `UIElement.Opacity`,范围 0–1,与画刷 `opacity` 相乘) |

尺寸没有专有属性:与 WinUI 的 `Width`/`Height` 一样,经 `style`/`class` 给定。未给尺寸时按坐标取自然尺寸(`max(x1, x2, 0)` × `max(y1, y2, 0)`),可用 CSS 覆盖。

## 画刷描述接口(`WuiBrush`,Shape 家族预留)

`stroke` 除纯色字符串外,接受**画刷描述对象**——这是为本仓库 Shape 家族统一设计的画刷接口(后续需要 `Fill` 的 Path/Ellipse,以及 RadialGradientBrush / LinearGradientBrush 配套组件将沿用同一类型),Line 已完整实现:

```ts
type WuiBrush =
  | string // 纯色画刷(SolidColorBrush 等价)
  | { type: 'solid'; color: string; opacity?: number }
  | {
      type: 'linearGradient'
      startX?: number; startY?: number // 渐变起点,用户空间 px,缺省 [0, 0]
      endX?: number; endY?: number // 缺省为自然尺寸右下角
      stops: Array<{ color: string; offset?: number }> // offset 省略时按索引均匀分布
      opacity?: number
    }
  | {
      type: 'radialGradient'
      centerX?: number; centerY?: number // 圆心,缺省自然尺寸中心(WinUI Center)
      radius?: number // 缺省自然尺寸长边的一半
      originX?: number; originY?: number // 焦点(WinUI GradientOrigin)
      stops: Array<{ color: string; offset?: number }>
      opacity?: number
    }
```

```vue
<WuiLine :x1="0" :y1="0" :x2="300" :y2="0" :stroke-thickness="16"
  :stroke="{ type: 'linearGradient', endX: 300, endY: 0,
    stops: [{ color: '#06b6d4' }, { color: '#8b5cf6', offset: 1 }] }" />
```

渐变坐标为**用户空间 px**(组件内部以 `gradientUnits="userSpaceOnUse"` 渲染),对应 WinUI `MappingMode="Absolute"` 口径;`RelativeToBoundingBox` 在零宽/零高的水平、垂直线段上没有渲染面积(Web 与 WinUI 同源受限),故不做该缺省。SVG 原生只有圆形径向渐变,WinUI `RadiusX`/`RadiusY` 椭圆口径以 `radius` 圆形近似。

## 事件

Line 为纯绘制 Shape(非 Control),**无业务事件**;原生指针事件等 DOM 事件照常触发,可直接在组件上监听。

## 基础用法

```vue
<script setup lang="ts">
import WuiLine from '@/components/Line.vue'
</script>

<template>
  <!-- 无 stroke 不显示:描边是必设项 -->
  <WuiLine x1="0" y1="0" :x2="120" :y2="60" stroke="SteelBlue" />

  <!-- 粗细 + 虚线(值为粗细的倍数)+ 圆虚线帽 -->
  <WuiLine :x1="0" :y1="20" :x2="200" :y2="20"
    stroke="var(--wui-system-accent-color)"
    :stroke-thickness="6"
    stroke-dash-array="2 1"
    stroke-dash-cap="Round" />

  <!-- 线帽:Triangle 由 marker 三角形补绘,粗线下更明显 -->
  <WuiLine :x1="10" :y1="60" :x2="210" :y2="60"
    stroke="SteelBlue" :stroke-thickness="12"
    stroke-start-line-cap="Triangle" stroke-end-line-cap="Triangle" />

  <!-- 画刷描述:线性渐变描边 -->
  <WuiLine :x1="0" :y1="0" :x2="300" :y2="0" :stroke-thickness="16"
    :stroke="{ type: 'linearGradient', endX: 300, stops: [{ color: '#06b6d4' }, { color: '#8b5cf6', offset: 1 }] }" />

  <!-- 配合 Canvas 定位(Canvas.Top 经 data-canvas-top 附加属性,越界部分可见) -->
  <WuiCanvas style="width: 100px; height: 200px">
    <WuiLine data-canvas-top="50" stroke="SteelBlue" :x2="200" :stroke-thickness="5" />
  </WuiCanvas>
</template>
```

## Stretch 概念说明

WinUI 中 `Stretch` **不是 Line 自己定义的属性,而是 Shape 基类属性**(Ellipse/Rectangle/Path 等同样继承)。它描述「几何图形如何拉伸适配分配的布局框」,取值 `None / Fill / Uniform / UniformToFill`:对 Line 而言,非 `None` 时 WinUI 会把线段按比例变换到元素尺寸内(默认 `None`,即按坐标原样绘制)。

本组件按官方 Line 示例的口径**未实现 Stretch**,固定按坐标渲染:需要缩放时用外层 Viewbox 或 CSS `transform: scale(...)`;后续 Shape 家族组件若统一引入 Stretch,再补齐该基类属性。

## 与 WinUI 的差异

1. **无视觉状态、无模板**:Line 是 Shape 而非 Control,`generic.xaml` 中没有它的 ControlTemplate/样式,也不参与 Normal/PointerOver 等视觉状态;组件因此没有交互态样式,也不声明业务事件(与 WinUI 一致)。
2. **Triangle 线帽为近似渲染**:SVG `stroke-linecap` 只有 butt/square/round 三种,`PenLineCap.Triangle` 由 SVG `marker` 三角形补绘(底边垂直于线段、高/底边均为一倍粗细,随 `strokeWidth` 缩放)。start/end 中仅一端为 Triangle 时,基线帽按另一端渲染。
3. **虚线帽(linecap)取舍**:SVG 无独立虚线帽属性,`stroke-linecap` 同时作用于线段两端与虚线段。组件规则:开启 `strokeDashArray` 后 linecap 取 `strokeDashCap`(虚线段帽形正确,两端帽形可能与 `strokeEndLineCap` 不同);未开虚线时取 `strokeEndLineCap`(`strokeDashCap` 与 WinUI 一样无视觉效果)。两端帽形不同且又开虚线的组合无法同时精确表达。
4. **start/end 线帽不同时终点优先**:SVG 单值 linecap 只能表达一种帽形,`strokeStartLineCap ≠ strokeEndLineCap` 时以 `strokeEndLineCap` 为准。
5. **渐变画刷坐标口径**:`WuiBrush` 渐变坐标为用户空间 px(`MappingMode="Absolute"` 口径),见上文;WinUI `RadialGradientBrush` 的椭圆(`RadiusX`/`RadiusY`)以圆形 `radius` 近似。
6. **不裁剪的实现差异**:WinUI 靠布局系统不裁剪,组件靠 SVG `overflow: visible`;线段越出元素尺寸时两者都可见,但若调用方自行给组件设置 `overflow: hidden` 则会被 SVG 视口裁剪(WinUI 中需显式设 `Clip` 才裁剪)。
7. **`Fill` 未提供**:线段无面积,WinUI 中 `Shape.Fill` 对 Line 无效果,组件不提供该属性。
8. **未实现 Stretch**:见上文「Stretch 概念说明」。
9. **数值口径**:坐标/粗细均为 CSS 像素,与 WinUI 的 DIP 在标准缩放下一致;`strokeDashArray`/`strokeDashOffset` 保留 WinUI 的「粗细倍数」语义(组件内部换算为 SVG 用户单位),与直接写 SVG 的习惯不同。

## 相关链接

- 演示页源码:[demo/pages/LinePage.vue](../../demo/pages/LinePage.vue)
- 组件源码:[src/components/Line.vue](../../src/components/Line.vue)
- 官方示例对照:[CK/WinUI-Gallery/WinUIGallery/Samples/Line/](../../CK/WinUI-Gallery/WinUIGallery/Samples/Line/)(Polyline/Path/GeometryGroup 示例属 Shape 家族后续任务)
- 定位容器:Canvas(经 `data-canvas-top` 等附加属性摆放 Line)
