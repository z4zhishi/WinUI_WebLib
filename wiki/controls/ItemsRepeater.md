# ItemsRepeater

> 在线示例:[/#/itemsrepeater](/#/itemsrepeater)

## 概述

ItemsRepeater 是一个支持虚拟化的「原语级」数据布局控件,类似标记式的循环:它不带选择模型、不带条目容器视觉,只负责把数据按指定布局高效地摆出来,是构建自定义集合视图(聊天记录、图片墙、信息流)的地基。

对应 WinUI `Microsoft.UI.Xaml.Controls.ItemsRepeater`,行为对照 `CK/WinUI-Reference/controls/dev/Repeater` 源码复刻:Layout 未设置时默认 StackLayout 纵向(`ItemsRepeater.cpp` L909-913),ElementPrepared / ElementClearing 事件在条目进出虚拟化窗口时触发。注意 ItemsRepeater **不是 Control 子类**,`generic.xaml` 中没有它的模板段——它没有视觉状态与外观,重在虚拟化行为。布局与虚拟化窗口计算复用阶段 5 集合公共底座 [src/utils/collectionLayouts.ts](../../src/utils/collectionLayouts.ts)(`layoutStack` / `layoutUniformGrid` 产出逐项 rect,`computeVisibleRange` 裁出可见窗口),语义细节(Orientation 排列轴与滚动轴相反、fill 拉伸截断等)见[集合公共基建 wiki](./_collection-infra.md)。

官方文档:

- [ItemsRepeater - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.itemsrepeater)
- [ItemsRepeater 设计指南](https://learn.microsoft.com/windows/apps/design/controls/items-repeater)
- [StackLayout - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.stacklayout)
- [UniformGridLayout - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.uniformgridlayout)

## 虚拟化工作机制

组件内建了「ScrollViewer + ItemsRepeater」组合(见下方差异第 1 条),虚拟化管线为:

1. `ResizeObserver` 实测视口尺寸 + passive `scroll` 监听滚动偏移;
2. `layoutStack` / `layoutUniformGrid` 按**声明式条目尺寸**计算全量 rect(万级一次 <1ms);
3. `computeVisibleRange` 把滚动坐标换算成可见窗口,上下(左右)各扩 `cacheItemCount`(默认 3)项缓冲;
4. 仅渲染窗口内项(绝对定位到各自 rect),画布以 `contentSize` 占位总高——滚动条反映完整内容;
5. 滚动时窗口外项卸载、窗口内项挂载(Vue 按 index key 增量复用),并触发 `elementPrepared` / `elementClearing`。

`items` / `layout` / 视口尺寸变化都会经响应式链自动重算,无需手动刷新。

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | `unknown[]` | `[]` | 数据源数组(WinUI `ItemsSource`),`v-model:items` 双向;元素可为字符串、数字或对象 |
| `layout` | `{ type: 'stack', ... } \| { type: 'uniform', ... }` | `{ type: 'stack' }` | 布局配置(WinUI `Layout` 属性):`stack` 支持 `orientation`(`'vertical' \| 'horizontal'`,默认 vertical)/ `spacing`(默认 0),对照 StackLayout;`uniform` 支持 `minItemWidth` / `minItemHeight`(默认 0)/ `minRowSpacing` / `minColumnSpacing` / `maximumRowsOrColumns` / `itemsJustification` / `itemsStretch`,对照 UniformGridLayout(默认横向排列 = 常规表格观感) |
| `itemSize` | `number \| ((index, item) => number)` | `40` | **仅 StackLayout**:每项主轴尺寸(px;纵向为高、横向为宽)。纯函数布局没有 measure 阶段,内容真实主轴尺寸须与声明一致;UniformGridLayout 用 `minItemWidth` / `minItemHeight` 表达尺寸,不用本属性 |
| `cacheItemCount` | `number` | `3` | 可见窗口上/下(左/右)各多渲染的缓冲项数;`0` = 只渲染可视区 |
| `#default` slot | `{ item: unknown; index: number }` | — | 项模板(WinUI `ItemTemplate`,即 content property 的等价物);缺省渲染 `String(item)` |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素;控件本体无边框无背景(非 Control,无模板),需要边框/尺寸时在消费侧叠加。**虚拟化收益要求定高(或受约束高度)的容器**——与 WinUI「ItemsRepeater 必须放入定高 ScrollViewer」同约束;容器不定高时视口随内容撑开,退化为全量渲染。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `elementPrepared` | `(index: number, item: unknown)` | 项进入虚拟化窗口、元素生成时(WinUI `ElementPrepared` 的简化签名,元素参数以 index 代替) |
| `elementClearing` | `(index: number, item: unknown)` | 项离开窗口、元素被回收时(WinUI `ElementClearing` 的简化) |
| `update:items` | `(value: unknown[])` | `items` 双向绑定的更新事件 |

模板中监听写法:`@element-prepared="onPrepared"`、`@element-clearing="onCleared"`。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiItemsRepeater from '@/components/ItemsRepeater.vue'

interface FeedItem {
  id: number
  title: string
}

// 万级数据:DOM 里只有窗口 + 缓冲内的项
const feed = ref<FeedItem[]>(
  Array.from({ length: 10000 }, (_, index) => ({ id: index, title: `Item ${index}` })),
)

function onPrepared(index: number): void {
  console.log('realized', index)
}
</script>

<template>
  <!-- StackLayout 纵向(默认):声明每项高度 48px,横向滚动条不会出现 -->
  <WuiItemsRepeater
    :items="feed"
    :layout="{ type: 'stack', orientation: 'vertical', spacing: 4 }"
    :item-size="48"
    style="height: 400px; border: 1px solid var(--wui-system-control-background-base-low)"
    @element-prepared="onPrepared"
  >
    <template #default="{ item }">
      <div style="height: 100%">{{ item.title }}</div>
    </template>
  </WuiItemsRepeater>

  <!-- UniformGridLayout 图墙(参数同 WinUI UniformGridLayout) -->
  <WuiItemsRepeater
    :items="feed"
    :layout="{
      type: 'uniform',
      minItemWidth: 108,
      minItemHeight: 108,
      minRowSpacing: 12,
      minColumnSpacing: 12,
    }"
    style="height: 480px"
  />

  <!-- 混合高度:itemSize 用函数按项声明(纯函数布局无实测,声明值 = 实际值) -->
  <WuiItemsRepeater :items="feed" :item-size="(index) => 56 + ((index * 37) % 5) * 28" style="height: 320px" />
</template>
```

## 与 WinUI 的差异说明

- **滚动承载**:WinUI 的 ItemsRepeater 本体不滚动,需放入 `ScrollViewer`(旧版本还要 `ItemsRepeaterScrollHost` 追踪视口);Web 版把两者内建为一个滚动视口,`scrollTop` 即锚点坐标,无需 ScrollHost。视觉效果对应官方示例的「1px 边框 + 定高 ScrollViewer」,在消费侧用 `style` 叠加。
- **无视觉模板**:源控件非 Control 子类,`generic.xaml` 无模板段、无视觉状态;组件根元素透明无边框,`Background` 画刷属性用 CSS `background`(经 style)等价表达。无障碍语义(list / listitem 角色)是 Web 侧补充,WinUI 由 RepeaterAutomationPeer 提供。
- **Layout 是对象 prop**:WinUI 的 `Layout` 是布局对象实例(StackLayout / UniformGridLayout,可共享可换);Web 版以普通对象配置传入(`{ type: 'stack', ... }` / `{ type: 'uniform', ... }`),选项名与 WinUI 属性一一对应,缺省值同源(Orientation 语义陷阱、fill 截断、逐行对齐等见[集合基建 wiki 的差异节](./_collection-infra.md))。
- **声明式条目尺寸**:WinUI StackLayout 实测每项真实尺寸(文档默认 NaN 档 = 自适应);Web 布局是纯函数、没有 measure 阶段,主轴尺寸须以 `itemSize` 声明(默认 40)。条目内容高度不定时,请保证真实高度与声明一致(例如内容容器 `height: 100%` + 内部裁剪),否则会出现项间空隙或重叠。该约束同样来自基建「MinItemWidth/Height 无 NaN 档」的差异条目。
- **缓冲参数**:`cacheItemCount`(默认 3 项,本实现增补)近似 WinUI `HorizontalCacheLength` / `VerticalCacheLength`(默认 2.0 = 视口高度的 2 倍)的回收窗口作用;单位不同(项 vs 视口倍数),WinUI 属性未原样暴露。
- **事件简化**:`ElementPrepared` / `ElementClearing` 简化为 `(index, item)`;`ElementIndexChanged`(itemsSource 重排时)与 `ElementPrepared` 事件参数中的真实 `Element` 未暴露。整体替换 `items` 且数量不变时,按索引窗口判定不触发这两个事件(条目内容仍会正常更新)。
- **回收策略**:WinUI 用元素池 + 锚点(RealizationWindow / ViewManager / RecyclePool)精确回收复用 UIElement;Web 版为窗口化渲染 + Vue keyed `v-for` 按 index 复用 DOM 节点(简单 key 复用)。窗口外项卸载、窗口内项挂载的行为一致;未实现 `GetElementIndex` / `TryGetElement` / `GetOrCreateElement` / `ItemsSourceView` 等命令式 API。
- **未暴露的源能力**:`ItemTransitionProvider`(增删过渡)、增量数据源通知(ObservableCollection 的细粒度增量,Web 侧整体换数组即可)、数据模板选择器(需要时在 slot 内按 item 分支渲染)。
- **退化行为**:容器高度不受约束时,视口随内容撑开 → 全量渲染(等同非虚拟化列表);WinUI 在无定高 ScrollViewer 时布局同样不成立。

---

- 集合公共基建(布局器 / 选择模型 / 虚拟化接口):[wiki/controls/_collection-infra.md](./_collection-infra.md)
- 演示页源码:[demo/pages/ItemsRepeaterPage.vue](../../demo/pages/ItemsRepeaterPage.vue)
