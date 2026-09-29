# Grid

> 在线示例:[/#/grid](/#/grid)

## 概述

Grid 用于按行和列排布控件与内容,子项通过 `Grid.Row` / `Grid.Column` 附加属性定位(官方 catalog:description 中译)。它是 WinUI 中最常用的布局面板:行高 / 列宽支持像素、Auto 与星值(`*` / `N*`)三种尺寸,WinUI 3 起还提供 `ColumnSpacing` / `RowSpacing` 行列间距。

本组件是纯布局面板的复刻:WinUI 的 Grid 在 `generic.xaml` 中**没有默认 Style / ControlTemplate**(无视觉状态可对照),因此实现重点在布局语义映射——Web 版以原生 CSS Grid 承载,行列尺寸 / 间距 / 定位 / 默认 Stretch 对齐逐一对照源行为,不做任何视觉包装。

官方文档:

- [Grid - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.grid)
- [Tutorial(含跨行跨列)](https://learn.microsoft.com/windows/apps/design/layout/grid-tutorial)
- [Guidelines - layout panels](https://learn.microsoft.com/windows/apps/design/layout/layout-panels#grid)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `columnDefinitions` | `string` | `'*'` | 列定义(WinUI `ColumnDefinitions` 字符串简写):逗号分隔,`Auto` / 数字(像素)/ `N*`(星值加权);缺省单列 `*`,等价 WinUI 默认 1×1 星值网格。 |
| `rowDefinitions` | `string` | `'*'` | 行定义(WinUI `RowDefinitions` 字符串简写),规则同上;缺省单行 `*`。 |
| `columnSpacing` | `number` | `0` | 列间距(WinUI 3 `ColumnSpacing`),单位 px;负值按 0 处理。 |
| `rowSpacing` | `number` | `0` | 行间距(WinUI 3 `RowSpacing`),单位 px;负值按 0 处理。 |

### 子项定位(附加属性)

WinUI 通过附加属性 `Grid.Column` / `Grid.Row` / `Grid.ColumnSpan` / `Grid.RowSpan` 定位子项。HTML 没有附加属性机制,本组件采用**检查默认插槽子项 `data-grid-*` 属性**的等价方案,对原生元素与任意子组件(含库内 `Wui*` 控件)一致生效:

| WinUI 附加属性 | 本组件写法 | 取值 |
| --- | --- | --- |
| `Grid.Column` | `data-grid-column` | 数字或数字字符串,0 起,缺省 0 |
| `Grid.Row` | `data-grid-row` | 同上 |
| `Grid.ColumnSpan` | `data-grid-column-span` | ≥ 1,缺省 1 |
| `Grid.RowSpan` | `data-grid-row-span` | ≥ 1,缺省 1 |

定位规则(对照 WinUI):

- 未写定位属性的子项落在第 0 行第 0 列(与 WinUI 附加属性缺省值一致),因此除首格外的子项都应显式给出行 / 列;
- 行 / 列索引越界时收敛到最后一行 / 列(WinUI 会把子项挤入 0 尺寸的虚拟轨道,实际不可见;Web 端收敛到边界,避免 CSS Grid 产生隐式轨道破坏行列模板);
- Span 超出网格边界时静默钳制到「起点到边界」(WinUI 对非法 Span 校验报错);
- `data-grid-*` 只作定位输入,渲染时会从子项 DOM 上剥离,不会残留在标记里;
- 定位以 `cloneVNode` 合并 `grid-column` / `grid-row` 内联 style 实现,不额外包裹 DOM,子项原貌与默认对齐不受影响。

**默认 Stretch 对齐**:容器不干预子项对齐,CSS 网格子项默认 `justify-self / align-self: stretch`,等价 WinUI 子项 `HorizontalAlignment` / `VerticalAlignment` 的默认值 Stretch;需要例外时由子项自带样式覆盖(如设宽度、`justify-self`)。

**实现方案取舍**:备选方案是 `ColumnDefinition` / `RowDefinition` 子组件 + `provide/inject`。未采用的原因:它只解决「定义」的表达(本组件已由 `columnDefinitions` / `rowDefinitions` 简写字符串覆盖),仍要为子项定位再造一套机制,且原生元素无法挂载子组件,做不到「对任意子组件(含原生元素)可用」;`data-grid-*` 方案一份机制覆盖两者,也无额外包裹 DOM。

## 事件

无。Grid 是纯布局面板,WinUI 中没有控件专属事件;本组件不声明 emits,原生事件监听(`@click`、`@pointerdown` 等)经 `$attrs` 自然透传到根元素。

## 基础用法

```vue
<script setup lang="ts">
import WuiGrid from '@/components/Grid.vue'
</script>

<template>
  <!-- 行高列宽简写:"50" = 50px、"Auto" = 内容自适应、"2*" = 2 份加权 -->
  <WuiGrid column-definitions="50, Auto, 2*" row-definitions="Auto, *">
    <div data-grid-column="0" data-grid-row="0">0,0</div>
    <div data-grid-column="1" data-grid-row="0">0,1</div>
    <div data-grid-column="2" data-grid-row="0" data-grid-row-span="2">0,1 跨两行</div>
    <div data-grid-column="0" data-grid-row="1">1,0</div>
  </WuiGrid>

  <!-- 列 / 行间距(WinUI 3 特性)与跨列 -->
  <WuiGrid
    column-definitions="*, *, *"
    row-definitions="*, *"
    :column-spacing="8"
    :row-spacing="8"
  >
    <div data-grid-column-span="3">横跨三列的标题</div>
    <div data-grid-column="0" data-grid-row="1">A</div>
    <div data-grid-column="1" data-grid-row="1">B</div>
    <div data-grid-column="2" data-grid-row="1">C</div>
  </WuiGrid>
</template>
```

使用说明:

- 简写串允许空格(`"50, 50, 50"` 与 `"50,50,50"` 等价);空串 / 全空白按缺省单 `*` 轨道处理;无法识别的记号按 `Auto` 降级(源 XAML 解析器会抛异常,Web 端保持网格可用);
- 星值语义与 WinUI 一致:`*` 等价 `1*`,按权重瓜分剩余空间,且轨道**不会被内容撑开**(WinUI 星值轨道纯按可用空间加权);
- 容器 `align-content / justify-content` 置为 `start`:无星值轨道时剩余空间不分配给 Auto / 固定轨道,与 WinUI 剩余空间留白的默认行为一致;
- 组件根元素为 `display: grid` 的 `div`,`class` / `style` 等经 `$attrs` 正常透传。

## 与 WinUI 的差异说明

| 项 | WinUI | 本组件 | 说明 |
| --- | --- | --- | --- |
| ControlTemplate / 视觉状态 | 无(`generic.xaml` 中无 `TargetType="Grid"` 默认样式) | 无视觉包装,`display: grid` 根元素 | 纯布局面板,无 Normal/PointerOver 等状态可对照。 |
| 星值轨道 | `*` / `N*`,纯按可用空间加权 | `minmax(0, Nfr)` | CSS 裸 `1fr` 自带 min-content 下限(会被不可断行内容撑破容器);`minmax(0, Nfr)` 复刻 WinUI 语义。 |
| Auto 轨道 | 按子项期望尺寸测量 | CSS `auto` | 语义一致(内容测量);与容器 `align/justify-content: start` 配合后不再被 CSS 默认 stretch 拉大。 |
| 剩余空间分配 | 无星值轨道时留白(内容靠左上) | `align-content / justify-content: start` | CSS 默认 stretch 会把 Auto / 固定轨道拉伸,置 start 对齐源行为;有星值轨道时星值吸尽空间,start 无副作用。 |
| 定位语法 | `Grid.Column="1"` 附加属性 | `data-grid-column="1"` | HTML 无附加属性机制;取值语义(0 起 / 缺省 0 / Span ≥ 1)一致。 |
| 行 / 列越界 | 子项挤入 0 尺寸虚拟轨道(不可见) | 收敛到最后一行 / 列 | Web 端若保留越界值会产生 CSS 隐式轨道,破坏行列模板;差异记于此。 |
| Span 越界 | 非法值校验报错(调试器抛异常) | 钳制到「起点到边界」 | Web 端静默钳制,保持网格可用。 |
| 负间距 | `ColumnSpacing` / `RowSpacing` 不允许负值 | 钳制为 0 | 同为防御性处理。 |
| 无法识别的简写记号 | XAML 解析器抛异常 | 按 `Auto` 降级 | 保证输入中途(如正在键入 `"*, 2"`)页面不崩。 |
| 定义集合对象 | `ColumnDefinitions` 可为 `ColumnDefinition` 对象集合(`MinWidth` / `MaxWidth` / `SharedSizeGroup` 等) | 仅字符串简写 | 简写只覆盖 `Width` / `Height` 语义;`Min` / `Max` 约束暂不支持(`minmax()` 可作为后续扩展)。 |
| `v-for` 子项 | 不适用(XAML 无此机制) | Fragment 整体透传,无法逐项定位 | `v-for` 直接置于默认插槽时子项打包为 Fragment;需逐项定位请展开为显式子项或改用 ItemsRepeater 类方案。`v-if` 不受影响。 |
| 多根子组件 | 不适用 | 定位 style 落不到其根 | 子组件 `inheritAttrs: false` 且多根时,fallthrough style 无处落地;定位请用原生元素或单根组件。 |
| 子项 z 顺序 | 后声明者在上 | 相同(DOM 顺序) | 无差异;示例页覆盖块即利用此规则。 |
| 尺寸单位 | DIP | CSS px | 1:1 映射(theme.css 头注约定)。 |

---

演示页源码:[demo/pages/GridPage.vue](../../demo/pages/GridPage.vue)
