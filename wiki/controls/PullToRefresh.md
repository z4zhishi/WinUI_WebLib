# PullToRefresh(RefreshContainer / RefreshVisualizer)

> 在线示例:[/#/pulltorefresh](/#/pulltorefresh) · 演示页源码:[demo/pages/PullToRefreshPage.vue](../../demo/pages/PullToRefreshPage.vue)

## 概述

PullToRefresh 让用户在列表顶部**向下拉动**以刷新内容,广泛用于触屏设备。本库将这一对控件成对迁移:**RefreshContainer** 承载内容(default slot,通常配 [ScrollViewer](./ScrollViewer.md))并在内容贴顶时把下拉手势适配为拉动信息源;**RefreshVisualizer** 呈现经典的旋转指示视觉,可内嵌使用(容器缺省自建),也可经 `#visualizer` 插槽自备以更换指示内容。

视觉与行为对照 `CK/WinUI-Reference/controls/dev/PullToRefresh/` 源码(RefreshContainer / RefreshVisualizer / ScrollViewerIRefreshInfoProviderAdapter)。注意:两个控件的 Style/ControlTemplate **不在 generic.xaml**(generic.xaml 中仅有 `RefreshContainerForegroundBrush / RefreshContainerBackgroundBrush / RefreshVisualizerForeground / RefreshVisualizerBackground` 四支纯色画笔),模板来自 dev 源码同目录的 `RefreshContainer.xaml / RefreshVisualizer.xaml`,主题资源来自各自 `*_themeresources.xaml`,已定位核实。

官方文档:

- [RefreshContainer - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.refreshcontainer)
- [RefreshVisualizer - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.refreshvisualizer)
- [下拉刷新设计指南](https://learn.microsoft.com/windows/apps/design/controls/pull-to-refresh)

## RefreshContainer 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `pullThreshold` | `number` | `0.8` | 触发阈值(WinUI `ExecutionRatio`,默认 0.8):拉动比例 = 拉动距离 / 视觉器带高,越过阈值进入 Pending,松手即刷新;自动钳制到 0.05–1 |
| `pullDirection` | `'LeftToRight' \| 'TopToBottom' \| 'RightToLeft' \| 'BottomToTop'` | `'TopToBottom'` | 拉动方向(WinUI `RefreshPullDirection`,源默认 TopToBottom);Web 手势仅实现垂直向下,其余值告警并按 TopToBottom 处理 |
| `isRefreshIdle` | `boolean`(`v-model:is-refresh-idle`) | `true` | 刷新空闲标记(本库简化通道):刷新触发后置 `false` 阻止自动收尾,异步完成置回 `true` 即回到 Idle;与 Deferral 二选一即可 |

插槽:`default` 为内容(建议内含 ScrollViewer);`visualizer` 为自备 RefreshVisualizer(缺省自建一个,带高 100)。

## RefreshVisualizer 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `state` | `'Idle' \| 'Peeking' \| 'Interacting' \| 'Pending' \| 'Refreshing'`(`v-model:state`) | `'Idle'` | 视觉器状态;被容器包含时由容器状态机驱动(该 prop 忽略) |
| `orientation` | `'Auto' \| 'Normal' \| 'Rotate90DegreesCounterclockwise' \| 'Rotate270DegreesCounterclockwise'` | `'Auto'` | 指示器方向:决定默认旋转内容的起始角(Auto 在 TopToBottom 下同 Normal) |
| `size` | `number \| string` | `100` | 带高 px(WinUI `Height`,下限 80 = 源 `MinHeight`);容器以实测带高为拉动比例分母 |
| `foreground` | `string` | 不透明纯黑/白(主题资源) | 指示器前景(WinUI `Foreground`,对应 `RefreshVisualizerForeground`:浅色纯黑 / 深色纯白,经 `--wui-refresh-visualizer-foreground`) |
| `background` | `string` | 透明 | 背景(WinUI `Background`,对应 `RefreshVisualizerBackground`) |

插槽:`default` 为指示内容(缺省 `SymbolIcon(Refresh)` 30×30,对照源 `OnApplyTemplate` 默认值)。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `refreshRequested`(容器) | `args`,`args.getDeferral()` 返回 `{ complete() }` | 越过阈值后松手,或调用 `requestRefresh()`;WinUI 顺序为视觉器事件先于容器事件,两者共享同一 Deferral 计数 |
| `refreshRequested`(视觉器) | 同上 | 同一刷新在自备视觉器上也会发出(源 `RefreshVisualizer.RefreshRequested`);一般监听容器即可 |
| `stateChanged`(容器 / 视觉器) | `{ oldState, newState }` | 状态机迁移时(源 `RefreshStateChanged`);容器事件为 Web 侧扩展,便于观察缺省视觉器 |
| `update:isRefreshIdle`(容器) | `(value: boolean)` | `v-model:is-refresh-idle` 双向绑定事件 |

模板中监听写法:`@refresh-requested="onRefreshRequested"`、`@state-changed="onStateChanged"`。

## 编程 API(模板 ref)

| 成员 | 所属 | 说明 |
| --- | --- | --- |
| `requestRefresh()` | 容器 / 视觉器 | 对照 WinUI `RequestRefresh()`:进入 Refreshing 并发 refreshRequested;正在刷新时忽略。也是键盘/按钮触发下拉刷新的可达路径 |
| `state` / `interactionRatio` | 容器(ref) | 当前状态机状态与拉动比例(0..1)读数 |

## 状态机(对照 RefreshVisualizer.cpp)

| 状态 | 进入条件 | 指示器表现 |
| --- | --- | --- |
| `Idle` | 初始 / 未达阈值松手 / 刷新完成 | 透明度 0.4(`MINIMUM_INDICATOR_OPACITY`),起始角 |
| `Interacting` | 贴顶下拉中,比例 ≤ 阈值 | 透明度 0.4,随比例旋转 `360° × ratio/阈值`(拉动全程一圈),并伴随 `(1-阈值)×带高×0.5` 的向下游移 |
| `Pending` | 比例 > 阈值 | 透明度 1,300ms 缩放脉冲(中点 1.5 倍);拉回阈值内退回 Interacting |
| `Refreshing` | Pending 松手 / `requestRefresh()` | 透明度 1,500ms/圈 匀速自转,指示器停留在下游移位,视觉器带停在 `-带高×(1-阈值)`、内容停在 `带高×阈值`;Deferral 全部 complete(或 isRefreshIdle 置 true)后 100ms 过渡归位回 Idle |
| `Peeking` | 比例 > 0 但非交互(源为惯性越顶场景) | 透明度 1;Web 手势流不可达,保留枚举完备性 |

内容与视觉器带的位移转写自源 `ScrollViewerIRefreshInfoProviderDefaultAnimationHandler` 的三条表达式动画:拉动时带 `translateY(min(pull,H)-H)`、内容 `translateY(min(pull,H))`(1:1 跟手,封顶带高);刷新请求与完成各有一段归位过渡。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import RefreshContainer from '@/components/RefreshContainer.vue'
import ScrollViewer from '@/components/ScrollViewer.vue'

const items = ref(['项目 A', '项目 B'])

async function onRefreshRequested(args) {
  const deferral = args.getDeferral() // 或改用 v-model:is-refresh-idle 简化通道
  await doWorkAsync()                 // 模拟拉取数据
  items.value.unshift('新项')
  deferral.complete()                 // 完成后视觉器回到 Idle
}
</script>

<template>
  <RefreshContainer @refresh-requested="onRefreshRequested">
    <ScrollViewer style="height: 240px">
      <div v-for="item in items" :key="item">{{ item }}</div>
    </ScrollViewer>
  </RefreshContainer>
</template>
```

自备视觉器(更换指示内容):

```vue
<RefreshContainer @refresh-requested="onRefreshRequested">
  <template #visualizer>
    <RefreshVisualizer :size="100">
      <FontIcon glyph="&#xE8FA;" :font-size="35" />
    </RefreshVisualizer>
  </template>
  <ScrollViewer style="height: 240px">…</ScrollViewer>
</RefreshContainer>
```

## 无障碍

- 源控件 `IsTabStop=False`:容器与视觉器均不进入 Tab 序、无焦点环;下拉为触屏手势,键盘/辅助技术路径为编程触发 `requestRefresh()`(示例页提供按钮)。
- 视觉器为纯指示覆盖层(不拦截内容指针交互),状态变化可经 `stateChanged` 接 `aria-live` 区域播报(本库不内置,保持与源一致的静默行为)。
- `prefers-reduced-motion: reduce` 时自转与缩放脉冲由 animations.css 全局降级块停住(iteration 1 + 0.01ms,瞬时完成回静态终态;MR3/B8 双通道约定)。

## 与 WinUI 的差异

1. **模板与主题资源位置**:两控件的 Style/ControlTemplate 不在 generic.xaml(仅四支纯色画笔),模板与默认值取自 dev 源码 `RefreshContainer.xaml` / `RefreshVisualizer.xaml` / `*_themeresources.xaml`;权威 = controls/dev,其值为**字面量** `White`(Default)/`Black`(Light)+ `Transparent`(非 Fluent 别名)。颜色经 theme.css 既有专用 token 取源实值(PL15 复核**逐条一致,无改动**):
   - `RefreshVisualizerForeground`(浅色 Black / 深色 White)→ `--wui-refresh-visualizer-foreground`(不透明,与源同值);
   - `RefreshContainerBackgroundBrush / RefreshVisualizerBackground`(Transparent)→ 组件内 `background: transparent`;
   - HighContrast 字典未实现(站点既有口径)。
2. **Composition 动画 → CSS transform/过渡**:源以 `ElementCompositionPreview` 表达式动画(InteractionTracker 直驱)与 KeyFrame 动画实现跟手位移、刷新请求/完成归位;Web 以 transform + 100ms 过渡(MR3/B6 起取源字面量 `REFRESH_ANIMATION_DURATION`,ScrollViewerIRefreshInfoProviderDefaultAnimationHandler.cpp L12)与 CSS 关键帧转写:自转 500ms 匀速无限(ExecuteExecutingRotationAnimation L422-437)、缩放脉冲 300ms **线性**(ExecuteScaleUpAnimation L399-418,Composition 关键帧默认缓动)、Interacting 旋转/游移按拉动比例 transform 联动(表达式同构,无固定时长)。
3. **拉动方向**:源支持四个方向并联动视觉器对齐与起始角;Web 仅实现 `TopToBottom`(WinUI 语义主路径),传入其余值会 `console.warn` 并按 TopToBottom 处理。`RefreshVisualizerOrientation` 仍可改起始角。
4. **手势源**:源经 `ScrollViewerIRefreshInfoProviderAdapter` 把 ScrollViewer 的 InteractionTracker 越顶量耦合为拉动比例;Web 以触摸事件(元素级非 passive,`preventDefault` 拦下原生滚动/回弹)+ 鼠标/触控笔 Pointer Events 实现贴顶检测(首个可竖滚元素 `scrollTop≈0`),并加 4px 起拉门槛防抖;比例分母为实测视觉器带高,拉动封顶带高(源 `min(1.0, pull/H)` 同语义)。
5. **Deferral 简化**:`GetDeferral/Complete/Dispose` 简化为 `args.getDeferral().complete()`;并新增 `v-model:is-refresh-idle` 简化通道(异步完成置 `true` 收尾)。事件派发完毕无人取 Deferral 时立即收尾,与 WinUI「无人持有 Deferral」语义一致。视觉器与容器两级事件的 Deferral 合并到容器计数,对应源容器持有视觉器 Deferral 再转发的协作。
6. **Peeking 态**:源在惯性越顶(DManip overpan)时进入;Web 手势流不可达,枚举保留(与源状态机表一致,该态下不迁移)。
7. **鼠标拖拽为 Web 侧补充**:WinUI 下拉刷新为触摸手势;Web 允许鼠标/触控笔按住拖拽(起拉后才捕获指针,不影响内容内点击),行为与触摸一致。
8. **无 token 的源尺寸/常量**(组件内按源值实现):缺省视觉器带高 100 / MinHeight 80、默认指示内容 SymbolIcon(Refresh) 30×30、`MINIMUM_INDICATOR_OPACITY = 0.4`、`PARALLAX_POSITION_RATIO = 0.5`、`ExecutionRatio = 0.8`、自转 500ms、脉冲 300ms、刷新归位动画 100ms(均源值,见差异 2)。
9. **`RefreshInfoProvider` / Adapter API 未迁移**:`IRefreshInfoProvider`、`ScrollViewerIRefreshInfoProviderAdapter`、`RefreshInteractionRatioChanged` 等内部/私有面(源即 `MUX_PUBLIC` 之外的自定义接口)不适用 Web,交互能力由容器直接提供。

## 在 WinUI 中的典型场景(对照官方示例)

- 基础用法:`<RefreshContainer RefreshRequested="…"><ListView Width="300" Height="300" /></RefreshContainer>`,取 Deferral、异步插入新项后 Complete(官方 Example1,本页场景 1 按 1s 异步复刻)
- 自定义图标:`RefreshContainer.Visualizer` 挂 RefreshVisualizer,`Content` 换为 SymbolIcon(AddFriend)/ 图片(官方 Example2,本页场景 2 复刻)
- 相关控件:ScrollViewer(内容滚动承载)、ProgressBar / ProgressRing(非手势型进度指示)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
