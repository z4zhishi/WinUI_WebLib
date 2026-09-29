# RelativePanel

在线示例:[/#/relativepanel](/#/relativepanel)

## 概述

RelativePanel 是 WinUI 中的**关系定位**布局面板:不靠行列或坐标,而是让子项声明彼此之间(以及与面板之间)的关系——「在某某下方」「与某某左边对齐」「与面板右边对齐」等,由面板对关系约束求解后定位。适合表达元素间语义关联的自适应布局,例如图形标注、表单标签-输入对、对话框按钮区等;官方文档亦建议用它在窄窗口(如 320px)下替代多套 Grid 布局。

本组件是 WinUI RelativePanel 的 Web 复刻:渲染为一个 `position: relative` 的 `div`;子项全部 `position: absolute`,坐标由内置约束求解器算出。求解器对照参考源码 `CK/WinUI-Reference/dxaml/xcp/components/relativepanel/lib/RPGraph.cpp`(约束解析 / 度量矩形 / 排布矩形)与 `RPNode.cpp`(锚定判定)移植,约束优先级与 WinUI 一致(如水平轴:AlignLeftWithPanel > AlignLeftWith > AlignHorizontalCenterWith > RightOf)。子项的自然尺寸经 DOM 测量(`ResizeObserver` 驱动,尺寸或面板变化时自动重排)。

官方文档:

- [RelativePanel - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.relativepanel)
- [Guidelines(布局面板指南)](https://learn.microsoft.com/windows/apps/design/layout/layout-panels)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `background` | `string` | 未设置(透明) | 面板底色,任意 CSS 颜色或 `--wui-*` 变量(对应 `RelativePanel.Background`;WinUI 默认为 null 画刷 → 透明) |
| `padding` | `number \| string` | 未设置 | 内边距(对应 `RelativePanel.Padding`);数字按 px,字符串原样作为 CSS padding(支持 `"8 16"` 简写) |
| `borderBrush` | `string` | 未设置 | 边框颜色(对应 `RelativePanel.BorderBrush`);设置后边框为 solid |
| `borderThickness` | `number \| string` | 未设置 | 边框厚度(对应 `RelativePanel.BorderThickness`);仅设厚度不设颜色时以透明边框占位(与 WinUI「无边刷则不绘制」一致,仍占布局空间) |
| `cornerRadius` | `number \| string` | 未设置 | 圆角(对应 `RelativePanel.CornerRadius`) |

面板尺寸没有专有属性:与 WinUI 的 `Width`/`Height` 一样,通过内联 `style`(`width`/`height`)给定。**未内联指定 width/height 时,面板按子项内容范围自动撑开**(近似 WinUI 的 desired size,近似规则见「与 WinUI 的差异」第 4 条);官方示例 `Width="300"` 只定宽、高度随内容,本组件同样支持。

## 附加属性(子元素 `data-relative-*`)

WinUI 的附加属性(如 `RelativePanel.Below`)附着在**子项**上;本组件以子元素的 `data-relative-*` attribute 表达,组件在渲染时求出坐标并注入 `position: absolute` 内联样式,**使用方无需手写任何定位 style**。

每个参与引用的子项先要有标识:写 `data-relative-key`(对应 XAML 的 `x:Name`;组件子项亦可用 `data-relative-name` 作别名)。关系类属性的值即目标子项的 key:

| 附加属性 | 值 | 对应 WinUI | 说明 |
| --- | --- | --- | --- |
| `data-relative-key` | 标识串 | `x:Name` | 子项标识,供关系属性引用;缺省时该子项不可被引用 |
| `data-relative-name` | 标识串 | `x:Name` | `data-relative-key` 的别名(组件子项更顺手) |
| `data-relative-left-of` | 目标 key | `RelativePanel.LeftOf` | 本子项右边贴齐目标左边左侧 |
| `data-relative-right-of` | 目标 key | `RelativePanel.RightOf` | 本子项左边贴齐目标右边右侧 |
| `data-relative-above` | 目标 key | `RelativePanel.Above` | 本子项底边贴齐目标顶边上方 |
| `data-relative-below` | 目标 key | `RelativePanel.Below` | 本子项顶边贴齐目标底边下方 |
| `data-relative-align-left-with` | 目标 key | `RelativePanel.AlignLeftWith` | 左边与目标左边对齐 |
| `data-relative-align-top-with` | 目标 key | `RelativePanel.AlignTopWith` | 顶边与目标顶边对齐 |
| `data-relative-align-right-with` | 目标 key | `RelativePanel.AlignRightWith` | 右边与目标右边对齐 |
| `data-relative-align-bottom-with` | 目标 key | `RelativePanel.AlignBottomWith` | 底边与目标底边对齐 |
| `data-relative-align-horizontal-center-with` | 目标 key | `RelativePanel.AlignHorizontalCenterWith` | 与目标水平居中对齐 |
| `data-relative-align-vertical-center-with` | 目标 key | `RelativePanel.AlignVerticalCenterWith` | 与目标垂直居中对齐 |
| `data-relative-align-left-with-panel` | 布尔 | `RelativePanel.AlignLeftWithPanel` | 左边与面板左边对齐 |
| `data-relative-align-top-with-panel` | 布尔 | `RelativePanel.AlignTopWithPanel` | 顶边与面板顶边对齐 |
| `data-relative-align-right-with-panel` | 布尔 | `RelativePanel.AlignRightWithPanel` | 右边与面板右边对齐 |
| `data-relative-align-bottom-with-panel` | 布尔 | `RelativePanel.AlignBottomWithPanel` | 底边与面板底边对齐 |
| `data-relative-align-horizontal-center-with-panel` | 布尔 | `RelativePanel.AlignHorizontalCenterWithPanel` | 在面板内水平居中 |
| `data-relative-align-vertical-center-with-panel` | 布尔 | `RelativePanel.AlignVerticalCenterWithPanel` | 在面板内垂直居中 |

行为要点(均与 WinUI 一致):

- **约束优先级**:同一轴上多个约束冲突时按 WinUI 优先级取用。水平轴左缘:AlignLeftWithPanel > AlignLeftWith > AlignHorizontalCenterWith > RightOf;右缘:AlignRightWithPanel > AlignRightWith > AlignHorizontalCenterWith > LeftOf;垂直轴同理。
- **拉伸**:左缘与右缘同时被锚定(如 `align-left-with-panel` + `align-right-with-panel`)时子项水平拉伸填满槽位(对应 XAML 默认 `HorizontalAlignment="Stretch"`);上下同理垂直拉伸。
- **居中**:仅设置 AlignHorizontalCenterWith(Panel)等居中约束时,子项在对应范围内水平居中。
- **边距参与求解**:子项的 CSS margin 与 WinUI 的 `Margin` 语义一致(DesiredSize 含 Margin),官方示例中蓝块/黄块的 `Margin="8,0,0,0"` 直接写成 `margin-left/margin-top` 即可。
- **无约束子项**默认落在面板左上角(保持自然尺寸)。
- **层叠顺序**按声明顺序,后声明者在上(与 WinUI 相同)。

## 事件

RelativePanel 为纯布局面板,**无业务事件**;子项自身的交互事件(点击等)照常触发与冒泡。布局告警(未知目标、循环依赖、重复标识)经 `console.warn`(前缀 `[WuiRelativePanel]`)输出,同一实例内每条只告警一次。

## 基础用法

```vue
<script setup lang="ts">
import WuiRelativePanel from '@/components/RelativePanel.vue'
</script>

<template>
  <!-- 对照官方示例:四个矩形的关系图;面板只定宽,高度按内容撑开 -->
  <WuiRelativePanel style="width: 300px">
    <div data-relative-key="rect1" class="rect" />
    <div data-relative-key="rect2" class="rect" style="margin-left: 8px" data-relative-right-of="rect1" />
    <div data-relative-key="rect3" class="rect" data-relative-align-right-with-panel="true" />
    <div
      data-relative-key="rect4"
      class="rect"
      style="margin-top: 8px"
      data-relative-below="rect3"
      data-relative-align-horizontal-center-with="rect3"
    />
  </WuiRelativePanel>

  <!-- 页脚按钮区:说明文字左对齐面板左缘,按钮组右对齐面板右缘、垂直居中 -->
  <WuiRelativePanel style="width: 420px; height: 64px" background="var(--wui-system-control-background-chrome-medium-low)">
    <p data-relative-align-left-with-panel="true" data-relative-align-vertical-center-with-panel="true">确定要继续吗?</p>
    <button data-relative-key="cancel-btn" data-relative-align-right-with-panel="true" data-relative-align-vertical-center-with-panel="true">取消</button>
    <button data-relative-align-right-with-panel="true" data-relative-left-of="cancel-btn">确定</button>
  </WuiRelativePanel>

  <!-- 拉伸:标题栏左缘贴面板左、右缘贴搜索框左,水平拉伸 -->
  <WuiRelativePanel style="width: 480px; height: 80px">
    <h3 data-relative-align-top-with-panel="true" data-relative-align-left-with-panel="true" data-relative-right-of="search">标题</h3>
    <input data-relative-key="search" data-relative-align-top-with-panel="true" data-relative-align-right-with-panel="true" />
  </WuiRelativePanel>
</template>
```

## 与 WinUI 的差异

1. **求解机制:测量驱动的两遍布局,而非 XAML 布局系统**。WinUI 在 `MeasureOverride` 中建约束图、按约束后的可用尺寸测量子项(文字按剩余空间换行),`ArrangeOverride` 中排布;本组件同样两遍——渲染时经默认插槽 vnode 收集 `data-relative-*` 声明(第一遍),再按依赖拓扑解析邻居并移植 RPGraph 的度量/排布公式算出坐标(第二遍),以 CSS `position: absolute; left/top` 呈现。由此带来的差别:
   - 子项尺寸取自 **DOM 实际渲染尺寸**(`offsetWidth/Height` + computed margin),首帧后经一次测量-重排收敛(`ResizeObserver` 驱动),极快的一瞬可能有位置跳动;SSR 输出未定位(仅 `position: absolute`),客户端挂载后完成布局;
   - WinUI 会把子项「压缩」到约束后的槽位内(`desired = min(slot, natural)`),本组件非拉伸子项保持自然尺寸,超出槽位时**不压缩也不裁剪**(面板默认 `overflow: visible`,与 WinUI 不裁剪一致);
   - 度量/排布在连续约束下是迭代收敛过程,极端环状布局(非循环依赖,如 A RightOf=B 且 B LeftOf=A 互为锚点成「环」)WinUI 直接抛异常,本组件告警并降级(见第 3 条)。
2. **目标引用与错误处理**:`x:Name` → `data-relative-key` / `data-relative-name`。WinUI 对「名称不存在」抛 `InvalidOperationException`(`AG_E_RELATIVEPANEL_NAME_NOT_FOUND`);本组件 `console.warn` 后忽略该约束,面板保持可用。
3. **循环依赖:告警降级而非抛异常**。WinUI 检测到环(`AG_E_RELATIVEPANEL_CIRCULAR_DEP`)抛异常中断布局;本组件用三色 DFS 找回边,对成环约束 `console.warn` 并丢弃该边后继续求解(示例页有「制造循环依赖」开关可观察降级效果)。
4. **自动撑开是近似**。WinUI 的 desired size 按约束链累计(面板可被任意方向的链撑开);本组件在未内联指定 width/height 时按子项排布范围撑开,其中「面板右/下锚定」「面板居中」子项按其**自然尺寸**计入、「左右(上下)双向面板拉伸」子项不计入——避免面板尺寸与子项槽位互相反馈;极端情形(如仅有 AlignBottomWithPanel 子项的复杂链)可能比 WinUI 略小。另外 CSS 中 class 提供的 width/height 会被内容撑开值覆盖(内联 style 不受影响),请用内联 style 定尺寸。
5. **Stretch 的映射范围**。XAML 子项默认 `HorizontalAlignment/VerticalAlignment="Stretch"`,填满槽位是常态;本组件仅在左右(上下)**同时锚定**时给显式 `width/height` 复刻拉伸,其余情形保持自然尺寸(块级元素不被绝对定位拉伸到整行)。
6. **HTML attribute 表达附加属性**:HTML 无附加属性机制,`RelativePanel.Below="X"` 写作 `data-relative-below="X"`;布尔用 `"true"` / 空 attribute。`data-relative-*` 保留在 DOM 上,可兼作样式与测试钩子。
7. **`v-for` 子项支持**:与 Grid 组件不同,本组件对插槽里的 Fragment(v-for / template v-for)做了一层展开,v-for 子项可各自携带 `data-relative-*`;但多根组件子项无法承载定位属性(告警并不参与布局),请用原生元素或单根组件。`v-if` 为 false 的注释占位会安全剔除。
8. **定位基准与盒模型**:坐标相对面板 padding box(CSS 绝对定位包含块语义,同 XAML 相对面板矩形);组件为 `box-sizing: border-box`,`padding`/`border` 不挤占可用区域计算。尺寸单位为 CSS px(1:1 映射 WinUI DIP)。
9. **`BackgroundSizing` 未实现**:WinUI RelativePanel 另有 `BackgroundSizing`(背景相对边框的绘制范围),CSS 背景恒为 border-box 绘制,不提供该属性。
10. **无模板、无视觉状态**:`generic.xaml` 中无 `TargetType="RelativePanel"` 的 Style/ControlTemplate,组件无交互态样式,也不声明业务事件。

## 相关链接

- 演示页源码:[demo/pages/RelativePanelPage.vue](../../demo/pages/RelativePanelPage.vue)
- 组件源码:[src/components/RelativePanel.vue](../../src/components/RelativePanel.vue)
- 同类面板:Grid(行列网格)、StackPanel(堆叠)、Canvas(绝对定位)
