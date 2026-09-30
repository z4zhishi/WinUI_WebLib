# ParallaxView

在线示例:[/#/parallaxview](/#/parallaxview)

## 概述

ParallaxView 是一个**视差容器控件**:当它的滚动源(ScrollViewer、ScrollView 或列表)滚动时,内部的子内容(通常是一张背景图)按比例平移 —— 背景移动得比前景慢,从而产生纵深感。典型用法有两种:把 ParallaxView 垫在整个滚动区**后面**(半透明列表盖在视差图上,官方示例的用法),或把 ParallaxView 放进滚动内容**里面**(hero 横幅随页面慢速滚动)。`VerticalShift`/`HorizontalShift` 决定子内容在整个滚动过程中的最大平移量,**设为 0 即禁用该轴**。

本组件是 WinUI ParallaxView 的 Web 复刻:视差数学逐式对照源码 `CK/WinUI-Reference/controls/dev/ParallaxView/ParallaxView.cpp` 的三条表达式动画(源起始偏移 / 源结束偏移 / 平移分段函数),并通过了源仓库 API 测试 `ParallaxViewTests.cs` 四组期望值的数值验证(基础视差、钳制、速率上限、未钳制)。WinUI 用合成器线程的 `ElementVisual.Translation` 动画实现零主线程开销;Web 无对应通道,改为「滚动源 `scroll` 事件(rAF 节流)+ `ResizeObserver`(源 / 源内容 / 根)→ 重算 → `transform: translate3d` 写在子内容包裹层」,裁剪用根元素 `overflow: hidden` 对应源码 ArrangeOverride 末尾的 `RectangleGeometry.Clip`(子元素永不画出容器)。

官方文档:

- [ParallaxView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.parallaxview)
- [Parallax - Guidelines](https://learn.microsoft.com/windows/apps/design/motion/parallax)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `verticalShift` | `number` | `0` | 垂直视差强度(px,WinUI VerticalShift):整个滚动过程中子内容的最大垂直平移量;`0` = 禁用;正值 = 子内容慢于滚动(经典背景视差),负值 = 反向 |
| `horizontalShift` | `number` | `0` | 水平视差强度(WinUI HorizontalShift),语义同上 |
| `maxVerticalShiftRatio` | `number` | `1.0` | 垂直平移速率上限(WinUI MaxVerticalShiftRatio):每滚动 1px 子内容至多平移多少 px(内部取 `max(0, 值)`);当它小于 `shift / 源跨度` 时平移提前封顶 |
| `maxHorizontalShiftRatio` | `number` | `1.0` | 水平平移速率上限 |
| `isVerticalShiftClamped` | `boolean` | `true` | 是否把平移钳制在 ±shift 内(WinUI IsVerticalShiftClamped);`false` 时全程线性,滚动超出映射区间后继续平移、会露出子内容底边(与 WinUI 行为一致) |
| `isHorizontalShiftClamped` | `boolean` | `true` | 水平钳制开关 |
| `verticalSourceOffsetKind` | `'Absolute' \| 'Relative'` | `'Relative'` | 垂直源偏移种类(WinUI ParallaxSourceOffsetKind):`Relative` 把 start/end 偏移**叠加到自动值**上(自动值由视口、内容尺寸与 ParallaxView 位置算出);`Absolute` 直接使用(需自行覆盖滚动全程,默认值 0/0 是退化区间 = 无视差) |
| `horizontalSourceOffsetKind` | `'Absolute' \| 'Relative'` | `'Relative'` | 水平源偏移种类 |
| `verticalSourceStartOffset` / `verticalSourceEndOffset` | `number` | `0` / `0` | 垂直源起始/结束偏移:视差映射的滚动区间 `[start, end]`(Relative 时为自动值上的增量);钳制模式下区间外的平移保持不变 |
| `horizontalSourceStartOffset` / `horizontalSourceEndOffset` | `number` | `0` / `0` | 水平源起始/结束偏移 |
| `source` | `HTMLElement \| null` | `undefined` | 滚动源(WinUI Source):`undefined`(缺省)自动取**最近可滚祖先**(overflow: `auto`/`scroll`/`overlay`);`null` 显式禁用;传元素可显式绑定,包括**兄弟滚动容器**(官方示例 `Source="{Binding ElementName=listView}"` 的用法,Web 侧经模板 ref 取滚动组件的 `$el`) |
| `child`(默认 slot) | `any` | — | 视差子内容,通常为一张图;子内容被放进一个「包裹层」平移,建议撑满包裹层(`width/height: 100%` 或 `object-fit`),shift ≠ 0 的轴上包裹层自动扩到 `100% + \|shift\|`(对应源码 ArrangeOverride 的子元素扩展) |

## 方法(经模板 ref 调用)

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `refreshAutomaticVerticalOffsets` | `() => void` | 重算垂直自动源偏移(WinUI 同名方法,用于 ParallaxView 自身位置变化后刷新 Relative 偏移);Web 侧偏移每帧实时计算,调用等价于触发一次重算 |
| `refreshAutomaticHorizontalOffsets` | `() => void` | 同上,水平轴 |

经模板 ref 还可只读访问 Web 扩展的调试读数:`parallaxX` / `parallaxY`(`Ref<number>`,当前视差平移,px,负值 = 向上/向左)。

## 事件

ParallaxView 为**纯容器,无业务事件**(WinUI 也没有);指针、滚轮等原生事件经 `$attrs` 透传到根元素。

## 视差数学(源码对照)

设某轴滚动量 `X = -source.Translation ≙ scrollLeft/scrollTop`(正 = 向末端滚动),缩放 `scale = 1`(Web 无缩放联动),越界平移 `pan = 0.1 × 视口`(ScrollViewer 缩放禁用分支,`UpdateOutOfBoundsPanSize`)。源起止偏移(对照 `UpdateStartOffsetExpression` / `UpdateEndOffsetExpression`):

| 条件 | start | end |
| --- | --- | --- |
| Relative,目标**在**源内 | `元素偏移 + startOffset − 视口 − pan` | `元素偏移 + 元素尺寸 + endOffset + pan` |
| Relative,目标**在源外** | `startOffset − pan` | `max(0, 内容尺寸 + endOffset − 视口) + pan` |
| Absolute | `startOffset` | `endOffset`(按内容/视口尺寸分段归一,见源码 Absolute 分支) |

平移函数 `P(X)`(对照 `UpdateExpressionAnimation`,负值 = 子内容向上/向左):

- 钳制、shift > 0:`X ≤ start` → `0`;`start < X < end` → `−min(maxRatio, shift/(end−start)) · (X−start)`;`X ≥ end` → `−min(maxRatio·max(0, end−start), shift)`
- 钳制、shift < 0:与上对称(区间前平移保持 `−min(maxRatio·max(0, end−start), −shift)`,区间后归 0)
- 未钳制:`start == end` → `0`;否则 `±min(maxRatio, |shift|/|end−start|) · (X − start或end)`,**不封顶**

速率 `min(maxRatio, shift/(end−start)) < 1` 即「背景慢于前景」;`VerticalShift` 在源码语义下是**整段滚动中子内容平移的总量**,这就是包裹层要扩到 `100% + |shift|` 的原因 —— 平移到达上限时恰好用完多余的子内容高度,视野内永不露边。

## 基础用法

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import WuiParallaxView from '@/components/ParallaxView.vue'
import WuiScrollView from '@/components/ScrollView.vue'

// 兄弟滚动源:滚动组件根即滚动容器,经 $el 取真实元素(WinUI Source={Binding listView} 的对应物)
const listRef = ref<InstanceType<typeof WuiScrollView> | null>(null)
const listEl = computed<HTMLElement | null>(() => {
  const candidate: unknown = listRef.value?.$el
  return candidate instanceof HTMLElement ? candidate : null
})
</script>

<template>
  <!-- 1) 背景视差:视差图垫底,半透明列表盖在上面滚动(官方示例结构) -->
  <div :style="{ position: 'relative', height: 440 }">
    <WuiParallaxView :source="listEl" :vertical-shift="300" :style="{ position: 'absolute', inset: 0 }">
      <img :style="{ width: '100%', height: '100%', objectFit: 'cover' }" src="cliff.jpg" alt="" />
    </WuiParallaxView>
    <WuiScrollView ref="listRef" :style="{ position: 'absolute', inset: 0 }">
      <!-- 列表内容…… -->
    </WuiScrollView>
  </div>

  <!-- 2) 内容内视差:缺省 source 自动绑定最近可滚祖先 -->
  <WuiScrollView>
    <WuiParallaxView :vertical-shift="120" :style="{ height: 200 }">
      <img :style="{ width: '100%', height: '100%', objectFit: 'cover' }" src="banner.jpg" alt="" />
    </WuiParallaxView>
    <!-- 其余内容…… -->
  </WuiScrollView>

  <!-- 3) 水平视差 + 速率上限 -->
  <WuiParallaxView :horizontal-shift="80" :max-horizontal-shift-ratio="0.5" :style="{ height: 120 }">
    <img :style="{ width: '100%', height: '100%', objectFit: 'cover' }" src="strip.jpg" alt="" />
  </WuiParallaxView>
</template>
```

## 与 WinUI 的差异

1. **平移在主线程重算**:WinUI 把平移表达式动画挂在合成器线程(`ElementVisual.Translation`),滚动零主线程参与;Web 无公开的合成器表达式通道,改为 scroll 事件(rAF 节流)+ `translate3d`。高频滚动下每帧一次重算,量级极小,但理论上极端负载时可能较合成器方案滞后一帧。
2. **无缩放联动**:WinUI 表达式里的 `source.Scale`/`ZoomFactor` 项(缩放时偏移按倍率放大)未实现,`scale` 恒为 1 —— Web 滚动容器默认无缩放;缩放型场景(ScrollView `ZoomMode`)下视差量不随倍率缩放。
3. **越界平移固定取 ScrollViewer 的 0.1×视口分支**:WinUI 对缩放禁用的 ScrollViewer 取 `0.1 × 视口`、对 ScrollPresenter(可两指推挤)取 `1 × 视口`;Web 原生滚动容器无 WinUI 式越界平移,统一取 0.1 分支以对齐观感与 API 测试期望值。
4. **源解析范围不同**:WinUI 的 Source 接受 ScrollViewer/ScrollPresenter/任意控件(控件取其模板内嵌滚动器),并监听模板切换、内容增删、对齐与 ZoomMode 变化;Web 侧按「显式元素或最近可滚祖先(overflow: auto/scroll/overlay)」解析,观察源与其直接子节点的尺寸变化 —— 深层嵌套内容的尺寸变化需一次滚动或重排后才生效。
5. **子内容扩展恒应用**:WinUI ArrangeOverride 只在「子元素期望尺寸不足」时把子元素扩到 `容器 + |shift|`(并按拉伸比例联动另一轴);Web 侧只要 shift ≠ 0 就把包裹层扩到 `100% + |shift|`(锚定左上,Stretch 语义),slot 内容建议撑满包裹层。子内容的 Center/Right/Bottom 等对齐由使用方在包裹层内用 CSS 自行控制。
6. **内容坐标系测量为近似**:「目标在源内」分支需要 ParallaxView 相对滚动内容原点的偏移(`GetOffsetFromScrollContentElement`),Web 用「根与源内容首子节点的 rect 差 + 已滚偏移」重建;源的 `padding`/`border` 与 transform 祖先会引入少量误差。
7. **无视觉状态与模板**:ParallaxView 在 WinUI 中无 ControlTemplate、无视觉状态树(generic.xaml 无 `TargetType="ParallaxView"` 段),组件因此同样没有交互态样式;`Clip` 用根元素 `overflow: hidden` 承载。
8. **Absolute 默认值是退化区间**:与 WinUI 一致 —— OffsetKind 为 Absolute 且 start/end 保持 0 时区间宽度为 0,无视差;使用 Absolute 时需显式给出覆盖滚动全程的起止值(官方 API 测试 `VerifyParallaxingWithAbsoluteExtremes` 的用法)。

## 官方示例对照

对照 `CK/WinUI-Gallery/WinUIGallery/Samples/ParallaxView/ParallaxViewPage.xaml`:

- Example1(ListView 半透明底盖 ParallaxView,`Source={Binding listView}`、`VerticalShift=500`)→ 场景 1:背景视差(列表行数示意化,cliff.jpg 用 token 着色的内联 SVG 山景等价呈现,VerticalShift 默认 300 并可调);
- Example2(ScrollView 兄弟源 + 矩形列)→ 与场景 1 同构(兄弟源绑定方式一致),未单独复刻;
- 官方 TestUI(ParallaxView 置于 StackPanel 内容内的 in-source 场景)→ 场景 2:双向 shift + shift=0 对照(缺省 Source = 最近可滚祖先),横向组对应场景 3 的 HorizontalShift。

## 相关链接

- 演示页源码:[demo/pages/ParallaxViewPage.vue](../../demo/pages/ParallaxViewPage.vue)
- 组件源码:[src/components/ParallaxView.vue](../../src/components/ParallaxView.vue)
- 同类控件:ScrollView(滚动源之一)、ScrollViewer(滚动源之一)、Viewbox(另一类纯布局容器)
