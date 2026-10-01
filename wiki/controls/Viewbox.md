# Viewbox

在线示例:[/#/viewbox](/#/viewbox)

## 概述

Viewbox 是 WinUI 中把**单个子内容放大或缩小到指定尺寸**的容器控件:子内容按其自然尺寸参与测量,再按 `Stretch` 求出的比例缩放呈现,常用于把固定设计尺寸的界面(仪表盘、徽标、图例、图标组合)按容器大小缩放。它继承自 FrameworkElement 而非 Control,没有 ControlTemplate 与视觉状态树,是纯布局控件。

本组件是 WinUI Viewbox 的 Web 复刻:根元素承担容器尺寸(由使用方布局或 `maxWidth`/`maxHeight` 约束),内部用 `ResizeObserver` 同时测量根元素的可用尺寸与子内容的自然尺寸(对应 XAML 以无限可用尺寸 Measure 子元素),再对内容元素施加 `transform: scale()`(`transform-origin: 0 0`,对应 WinUI ScaleTransform 默认原点、子元素在 (0,0) 处 Arrange 的语义)。某轴没有可用约束(测得尺寸为 0)时,按 WinUI `MeasureOverride` 的 DesiredSize 反推该轴自动尺寸。

官方文档:

- [Viewbox - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.Viewbox)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `stretch` | `'Uniform' \| 'UniformToFill' \| 'Fill' \| 'None'` | `'Uniform'` | 拉伸方式:`Uniform` 等比缩放取最小比例(完整显示,可能留白);`UniformToFill` 等比取最大比例(填满容器,溢出部分可见、画出边界之外,同 WinUI);`Fill` 两轴分别拉伸(可能变形);`None` 不缩放 |
| `stretchDirection` | `'UpOnly' \| 'DownOnly' \| 'Both'` | `'Both'` | 缩放方向约束:`UpOnly` 只放大(比例钳制到 >= 1);`DownOnly` 只缩小(<= 1);`Both` 不限 |
| `maxWidth` | `number \| string` | 不限 | 容器最大宽度;数字按 px,字符串原样作为 CSS 长度 |
| `maxHeight` | `number \| string` | 不限 | 容器最大高度;同 `maxWidth` |
| `child`(默认 slot) | `any` | — | 被缩放的单个子内容;提供多个子元素时只有第一个有效(XAML `Child` 单值语义) |

## 事件

Viewbox 为**纯布局容器,无业务事件**(WinUI 的 Viewbox 也没有自己的事件);指针、键盘等原生事件经 `$attrs` 透传到根元素。

## 缩放算法

与 WinUI 源码(`Viewbox.cpp` 的 `ComputeScaleFactor`)逐条对应:

1. 先测子内容自然尺寸 `contentSize`(宽/高任一约等于 0 时,该轴比例取 0);
2. 可用尺寸 = 根元素内容盒尺寸(某轴 <= 0 视为该轴无约束,同 XAML 的无限可用尺寸);
3. `Uniform` → 比例取 `min(scaleX, scaleY)`;`UniformToFill` → 取 `max(scaleX, scaleY)`;`Fill` → 两轴各用各的;`None` → 恒为 1;
4. 某轴无约束时,该轴比例取另一轴的比例;
5. 最后按 `stretchDirection` 钳制(`UpOnly` 下限 1、`DownOnly` 上限 1,对 `Fill` 同样生效)。

## 基础用法

```vue
<script setup lang="ts">
import WuiViewbox from '@/components/Viewbox.vue'
</script>

<template>
  <!-- 最简:等比缩放(默认 Uniform),容器尺寸由使用方给定 -->
  <WuiViewbox :style="{ width: 200, height: 200 }">
    <YourWidget />
  </WuiViewbox>

  <!-- 填满容器、等比、溢出部分可见(同 WinUI;需要裁剪自行包 Border + Clip) -->
  <WuiViewbox stretch="UniformToFill" :style="{ width: '100%', height: 240 }">
    <YourWidget />
  </WuiViewbox>

  <!-- 只放大不缩小:小屏上内容不缩水 -->
  <WuiViewbox stretch-direction="UpOnly" :style="{ width: 120, height: 120 }">
    <YourLogo />
  </WuiViewbox>

  <!-- 不保持比例拉伸填满 + 尺寸上限 -->
  <WuiViewbox stretch="Fill" :max-width="320" :max-height="180" :style="{ width: '100%', height: 180 }">
    <YourBanner />
  </WuiViewbox>
</template>
```

## 与 WinUI 的差异

1. **溢出不裁剪(与 WinUI 一致)**:Viewbox 不裁剪内容——`UniformToFill`(以及子内容大于容器的 `None`)把内容画到布局边界之外,组件根元素不设 `overflow` 裁剪;需要裁剪时与官方一致,自行包一层 `Border` 并设置 `RectangleGeometry.Clip`(且需在 SizeChanged 里手工同步矩形)。
2. **无约束轴的自动尺寸(锁定式回写)**:WinUI 中 Viewbox 的布局尺寸由父容器决定(Measure 返回 DesiredSize)。Web 里无法得知父布局的约束意图,组件把「测得尺寸 <= 0」的轴视为无约束,按 DesiredSize(= scale × contentSize)回写该轴的 inline 尺寸并**锁定**:锁定期间持续回写当前计算值(静止后样式不再变化,无逐帧振荡),仍随内容尺寸与 stretch 变化实时重算;一旦该轴被消费方以显式尺寸接管(组件检测到测得值偏离回写值,消费方 style 优先级高于组件回写),即解锁让位。因此:双轴都无约束的裸 Viewbox 呈现子内容的自然大小(比例 1:1);只约束一轴时另一轴按等比反推(与 XAML DesiredSize 语义一致);已显式给定的尺寸永远不会被组件覆写。
3. **子内容测量用 `width: max-content`**:内容元素以 max-content 布局来逼近 XAML「以无限尺寸 Measure」的语义——文本不再按容器宽度换行,而是取整行自然宽度后再整体缩放。因此子内容里的**百分比尺寸**(如 `width: 100%`)会相对 max-content 盒解析,跨浏览器表现略有差异;子内容建议用固定或内容驱动的尺寸。
4. **子内容的外边距不参与自然尺寸**:绝对定位的内容盒高度不包含末个子元素的 `margin-bottom`(BFC 常规行为);XAML 的 `Margin` 会完整计入 Child 的 DesiredSize。需要留边时改用 padding 或在 slot 里包一层。
5. **DPR 与亚像素**:缩放经 CSS transform 在合成器上完成,放大倍数很大时文字清晰度可能略逊于 WinUI 按布局像素栅格化的结果(浏览器对 transform 文本会重栅格化,通常观感接近)。
6. **无视觉状态与模板**:与 WinUI 一致(Viewbox 无 ControlTemplate、无 PointerOver/Pressed 等视觉状态),组件因此也没有交互态样式,不需要 focus/键盘处理。

## 官方示例对照

对照 `CK/WinUI-Gallery/WinUIGallery/Samples/Viewbox/ViewboxPage.xaml`:

- Width/Height 滑块(20–300,默认 200)→ 示例页 Width/Height 双滑块;
- Stretch 单选(None / Fill / Uniform / UniformToFill)→ Stretch 下拉 + 110×110 四档固定对照一排;
- StretchDirection 单选(UpOnly / DownOnly / Both)→ StretchDirection 下拉;
- 子内容(灰色 15px 边框 + 深灰面板 + 蓝绿红黄四色条 + 图形 + "This is text.")→ 示例页按同结构复刻(色条与图形用内联 SVG 着色)。

## 相关链接

- 演示页源码:[demo/pages/ViewboxPage.vue](../../demo/pages/ViewboxPage.vue)
- 组件源码:[src/components/Viewbox.vue](../../src/components/Viewbox.vue)
- 同类控件:ScrollViewer(滚动而非缩放)、Canvas(绝对定位布局)
