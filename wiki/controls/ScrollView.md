# ScrollView

在线示例:[/#/scrollview](/#/scrollview)

## 概述

ScrollView 是 WinUI 3 新增的滚动控件:让用户**滚动、平移与缩放**比可视区域更大的内容。它是 WinUI 3 滚动体系(`ScrollView` + `ScrollPresenter`)的新一代门面 —— ItemsView 的控件模板内就内置了一个 ScrollView 提供自动滚动。与旧控件 ScrollViewer 最大的区别:ScrollView 用**单一 `ContentOrientation` 属性声明内容测量方向**(而不是组合两轴的滚动条开关来间接表达),并且把滚动/缩放从「可写属性」改成**显式编程 API**(`ScrollTo`/`ScrollBy`/`ZoomTo`/`ZoomBy`,可带动画选项与事件)。

本组件是 WinUI ScrollView 的 Web 复刻:根元素即滚动视口(原生 `overflow` 承载滚动物理),内容元素的测量盒按 `contentOrientation` 四值映射(见下),缩放用 CSS `zoom` 参与布局(滚动范围随缩放自动变化,对应 WinUI ZoomFactor 语义);滚动条已由 PL15 按 WinUI 观感重定向到 PL2 Fluent token(thumb `--wui-control-strong-fill-color-default`、轨道 `--wui-acrylic-in-app-fill-color-default`;总览见 [_brushes.md](./_brushes.md))。编程 API(`scrollTo`/`scrollBy`/`zoomTo`/`zoomBy`,另有 `scrollToOffset` 别名)以 rAF 补间实现动画,并发出与 WinUI 同名的 `scrollAnimationStarting`/`scrollCompleted`/`zoomAnimationStarting`/`zoomCompleted` 事件。

官方文档:

- [ScrollView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.scrollview)
- [Scroll controls - Guidelines](https://learn.microsoft.com/windows/apps/design/controls/scroll-controls)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `contentOrientation` | `'Vertical' \| 'Horizontal' \| 'None' \| 'Both'` | `'Vertical'` | 内容测量方向(WinUI ContentOrientation):`Vertical` 内容宽度约束到视口、高度自然增长 → 竖向滚动;`Horizontal` 相反;`None` 双向约束到视口(照片查看器,配 ZoomMode);`Both` 双向取自然尺寸 |
| `horizontalScrollBarVisibility` | `'Auto' \| 'Visible' \| 'Hidden'` | `'Auto'` | 横向滚动条可见性(WinUI ScrollingScrollBarVisibility);`Hidden` 隐藏滚动条但保留滚动能力 |
| `verticalScrollBarVisibility` | `'Auto' \| 'Visible' \| 'Hidden'` | `'Auto'` | 纵向滚动条可见性 |
| `horizontalScrollMode` | `'Enabled' \| 'Disabled' \| 'Auto'` | `'Auto'` | 横向用户滚动模式;`Disabled` 时用户输入不可滚,编程滚动仍可用;`Auto` 在 Web 按 `Enabled` 处理 |
| `verticalScrollMode` | `'Enabled' \| 'Disabled' \| 'Auto'` | `'Auto'` | 纵向用户滚动模式 |
| `zoomMode` | `'Enabled' \| 'Disabled'` | `'Disabled'` | 缩放模式;`Enabled` 时 Ctrl+滚轮 / 触控板捏合在内容上缩放 |
| `zoomFactor` | `number` | `1` | 初始缩放倍数;属性变化即时 `zoomTo`(WinUI 中 ZoomFactor 只读,经 ZoomTo 变更) |
| `minZoomFactor` / `maxZoomFactor` | `number` | `0.1` / `10` | 缩放边界(对照 WinUI 默认值),超界自动钳制 |
| `isTabStop` | `boolean` | `false` | 是否可聚焦(WinUI IsTabStop);聚焦后方向键 / 翻页键原生滚动生效 |
| `disabled` | `boolean` | `false` | 禁用(WinUI IsEnabled=false):指针与滚轮交互关闭 |

## 方法(编程 API,经模板 ref 调用)

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `scrollTo` | `(h, v, options?) => void` | 滚动到目标偏移(对应 WinUI ScrollTo),超出可滚动范围自动钳制;`options.animation` 缺省 `'Enabled'`(rAF easeOutCubic 补间,默认 300ms),`'Disabled'` 立即到位;`options.durationMs` 自定义时长 |
| `scrollToOffset` | `(h, v, options?) => void` | `scrollTo` 的别名(与 WinUI ScrollTo 同义) |
| `scrollBy` | `(dh, dv, options?) => void` | 相对当前偏移滚动 delta(对应 WinUI ScrollBy) |
| `zoomTo` | `(factor, center?, options?) => void` | 缩放到指定倍数(对应 WinUI ZoomTo);`center` 为视口内锚点坐标(缺省视口中心),缩放前后锚点下的内容保持同一屏幕位置;倍数钳制到 Min/Max |
| `zoomBy` | `(delta, center?, options?) => void` | 相对当前倍数缩放(对应 WinUI ZoomBy) |

经模板 ref 还可只读访问:`horizontalOffset`、`verticalOffset`、`zoomFactor`、`extentWidth/Height`、`viewportWidth/Height`、`scrollableWidth/Height`、`state`、`computedHorizontalScrollBarVisibility`、`computedVerticalScrollBarVisibility`(`'Visible' | 'Collapsed'`)。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `viewChanged` | `{ horizontalOffset, verticalOffset, zoomFactor }` | 偏移或缩放变化后(rAF 节流,对应 WinUI ViewChanged) |
| `extentChanged` | `{ extentWidth, extentHeight }` | 内容总尺寸变化(orientation 切换、缩放、内容增删) |
| `stateChanged` | `{ state }` | 交互状态切换:`Idle` / `Interaction` / `Animation`(WinUI ScrollingInteractionState 的 `Inertia` 未复刻) |
| `scrollAnimationStarting` | `{ targetHorizontalOffset, targetVerticalOffset }` | 编程滚动动画开始前 |
| `scrollCompleted` | `{ horizontalOffset, verticalOffset }` | 编程滚动动画结束后 |
| `zoomAnimationStarting` | `{ targetZoomFactor }` | 编程缩放动画开始前 |
| `zoomCompleted` | `{ zoomFactor }` | 编程缩放动画结束后 |

> 注:编程补间若被用户交互(指针按下 / Ctrl+滚轮缩放)或新的编程调用打断,对应的 `scrollCompleted` / `zoomCompleted` **不会发出**(静默打断,无"失败完成"事件);打断前后 `viewChanged` 仍持续反映实际偏移与缩放。

WinUI 尚有 `BringingIntoView`、`AnchorRequested`、`AnchorChanging`(预览)等事件,本复刻未实现,见「与 WinUI 的差异」。

## ContentOrientation 语义

这是 ScrollView 区别于 ScrollViewer 的核心概念(源文档 ScrollView-spec.md 的四个场景):它声明**内容在滚动方向上如何被测量**,而不是开关哪个滚动条。

| 取值 | 内容宽度 | 内容高度 | 典型场景 |
| --- | --- | --- | --- |
| `Vertical`(默认) | 约束到视口宽 | 自然增长 | 长列表、文章流,竖向滚动 |
| `Horizontal` | 自然宽(max-content) | 约束到视口高 | 横向卡片带、画廊 |
| `None` | 约束到视口宽 | 约束到视口高 | 照片查看器:内容恰好铺满视口(配合图片 `Stretch=Uniform`),缩放后滚动 |
| `Both` | 自然宽 | 自然高 | 大图 / 画布:内容按原始尺寸呈现,双向滚动 |

在 Web 复刻里,四值分别映射到内容元素的 `width: 100%`、`max-content`、`100%/100%`、`max-content/max-content` 测量盒。示例页用同一面「瓷砖墙」演示四档差异。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiScrollView from '@/components/ScrollView.vue'

const scroller = ref<InstanceType<typeof WuiScrollView> | null>(null)

function jumpToBottom() {
  scroller.value?.scrollTo(0, 1e5, { animation: 'Enabled', durationMs: 600 })
}
function zoomIn() {
  scroller.value?.zoomBy(1.25)
}
function onViewChanged(args: { horizontalOffset: number; verticalOffset: number; zoomFactor: number }) {
  console.log('offset', args.horizontalOffset, args.verticalOffset, 'zoom', args.zoomFactor)
}
</script>

<template>
  <!-- 照片查看器:内容约束到视口 + 缩放(Ctrl+滚轮 / zoomTo / zoomBy) -->
  <WuiScrollView
    ref="scroller"
    :style="{ width: '100%', maxWidth: 560, height: 240 }"
    content-orientation="None"
    zoom-mode="Enabled"
    is-tab-stop
    @view-changed="onViewChanged"
  >
    <YourPhoto />
  </WuiScrollView>

  <!-- 横向卡片带:内容高受约束、宽自然增长 -->
  <WuiScrollView
    :style="{ width: '100%', height: 180 }"
    content-orientation="Horizontal"
    horizontal-scroll-bar-visibility="Visible"
  >
    <YourHorizontalCards />
  </WuiScrollView>
</template>
```

## ScrollView vs ScrollViewer 差异

两者在 WinUI 3 中**长期并存**:ScrollViewer 是 UWP 时代沿用至今的旧控件;ScrollView 是 WinUI 3(Windows App SDK 1.2+)基于 ScrollPresenter 重新设计的新控件。选择依据不在视觉,而在 API 形态与布局语义:

| 维度 | ScrollViewer(旧) | ScrollView(新) |
| --- | --- | --- |
| 定位 | UWP/XAML 兼容控件,大量模板(ListView、ComboBox 等)内嵌它 | WinUI 3 新控件,ItemsView 模板内置的是它 |
| 偏移读写 | `HorizontalOffset/VerticalOffset` 只读,变更走 `ChangeView(h, v, zoom, disableAnimation)` 单一入口 | 偏移同样只读,但提供 `ScrollTo / ScrollBy / ZoomTo / ZoomBy / AddScrollVelocity / AddZoomVelocity` 一族方法,每个都能带 `ScrollingScrollOptions / ScrollingZoomOptions`(动画模式 + snap 点模式) |
| 内容布局语义 | 无此概念;横向滚动要靠「竖向滚动条 Disabled + 内容横向布局」间接拼出 | 单一 `ContentOrientation`(`Vertical / Horizontal / None / Both`)直接声明内容测量方向 |
| 滚动条默认值 | `VerticalScrollBarVisibility` 默认 `Visible` | 两个可见性默认都是 `Auto`(ScrollView.h L26-L27),滚动条不再默认常驻 |
| 滚动条模板位置 | 滚动条**覆盖在内容之上**(overlay) | 同为覆盖式:模板里 `PART_ScrollPresenter` 以 `RowSpan/ColumnSpan=2` 铺满整个内容条带(`ScrollView.xaml` L154),两轴 ScrollBar 的 Grid 叠放在其上(L155-L159),转角由 `PART_ScrollBarsSeparator` 填充(默认透明画刷)—— 与 ScrollViewer 模板同构,差异仅在部件命名与资源前缀(`ScrollViewScrollBarsSeparator*`) |
| 滚动条隐藏后的可滚性 | `ScrollBarVisibility=Hidden` 时内容仍可滚 | 同样仍可滚(`ScrollingScrollBarVisibility.Hidden`),两控件语义一致 |
| 缩放 | `ZoomMode` + `ZoomFactor`,缩放动画不可拦截 | 同有 `ZoomMode`,但 `Min/MaxZoomFactor`(默认 0.1–10)是控件属性,且 `ZoomAnimationStarting` 可拿到/替换动画 |
| 事件 | `ViewChanged`(带 `IsIntermediate`)、`ScrollChanged` 等 | `ViewChanged / ExtentChanged / StateChanged / ScrollAnimationStarting / ZoomAnimationStarting / ScrollCompleted / ZoomCompleted / BringingIntoView / AnchorRequested`,滚动与缩放各有动画起止事件 |
| 状态 | 无交互状态属性 | `State`(Idle / Interaction / Inertia / Animation) |
| Snap points | `ZoomSnapPoints` 等,能力有限 | 经内部 ScrollPresenter 暴露完整 snap point 集合(ScrollPresenter-spec),并支持 `IScrollController` 自定义滚动条交互 |
| 惯性 | 内建 | 显式 `AddScrollVelocity / AddZoomVelocity` 注入速度 |

一句话选型:需要 **ContentOrientation、snap points、编程滚动/缩放的动画事件**时用 ScrollView;写与旧模板(如 ListView 内嵌结构)协作的代码或做兼容时用 ScrollViewer。本项目两个控件都有复刻,可对照 [ScrollViewer wiki](./ScrollViewer.md)。

## 与 WinUI 的差异(Web 复刻实现说明)

1. **滚动物理由原生 overflow 承载**:滚动/惯性/触控手势交给浏览器原生滚动(根元素 `overflow: auto/scroll/hidden`),不重写物理。因此 WinUI 的 `AddScrollVelocity / AddZoomVelocity`(注入惯性速度)、snap points、`HorizontalAnchorRatio / VerticalAnchorRatio` 锚定、`IgnoredInputKinds`、Chain/Rail 模式均未复刻。
2. **滚动条形态**:QA 查证并更正:WinUI 两代控件模板同构,滚动条都是**覆盖式**——ScrollView 模板的 `PART_ScrollPresenter` 以 `RowSpan/ColumnSpan=2` 铺满整个内容条带(`ScrollView.xaml` L154),两轴 ScrollBar 叠放在其上,并非占据专属布局空间(初版 wiki 此处描述有误)。本组件不复刻该模板结构,滚动条交给浏览器原生渲染:经典滚动条模式下会**挤占视口内部空间**(内容被压缩),启用 Fluent/overlay 滚动条的浏览器(如 Windows 11 上的 Chrome/Edge 默认)则**覆盖在内容上**——与 WinUI 的覆盖式在不同平台观感不一,以实际浏览器为准。PL15 已把颜色重定向到 Fluent:thumb 四态 → `--wui-control-strong-fill-color-default`(浅 `#00000072` / 深 `#FFFFFF8B`),轨道 → `--wui-acrylic-in-app-fill-color-default`(亚克力回退 `#F9F9F9` / `#2C2C2C`)。**注意**:本组件根声明了标准 `scrollbar-color`,Chromium 因此走标准滚动条路径并**忽略 `::-webkit-scrollbar-*` 状态规则**——悬停/按下色由浏览器自派,但**静置色仍精确等于 `ScrollBarPanningThumbBackground`** 值(像素实测浅 139 / 深 159)。`scrollBarVisibility=Hidden` 在 Chromium/WebKit 可分轴隐藏;Firefox 的 `scrollbar-width` 不分轴,仅双轴同隐时生效。
3. **缩放用 CSS `zoom`**:参与布局,滚动范围随缩放自动变化,滚动条/偏移语义与 WinUI ZoomFactor 一致;与 `transform: scale()` 不同,文本在放大后保持清晰。`zoomFactor` 在 WinUI 是只读属性(经 ZoomTo 变更),本组件的 `zoomFactor` prop 是「初始值 + 外部驱动」入口(属性变化即时 `zoomTo`,动画按 Disabled 语义)。
4. **偏移/Extent 的单位**:事件与 ref 暴露的 `extentWidth/extentHeight`、偏移均为**滚动容器像素空间**(含缩放布局),WinUI 的 ExtentWidth/ViewportWidth 语义与之等价;`ScrollableWidth = extent - viewport`。
5. **State 的近似**:`Interaction`(用户输入)、`Animation`(编程补间)、`Idle`(静止,120ms 去抖)可对应;WinUI 的 `Inertia` 是松手后的惯性衰减,Web 惯性在浏览器合成器内部,无法观测,统一并入 Interaction。
6. **编程动画的时长**:WinUI 动画由 Composition 驱动,可在 `ScrollAnimationStarting` 事件参数里整体替换动画(官方示例的自定义手风琴/传送动画);Web 事件参数只读,改用 `options.durationMs` 控制时长(默认 300ms,rAF easeOutCubic;`prefers-reduced-motion` 下自动退化为即时)。
7. **无 token 可用的视觉值**:WinUI 模板圆角默认 `ControlCornerRadius`(4px),theme.css 无同名 token,取 `--wui-hyperlink-focus-rect-corner-radius`(同为 4px)替代;焦点视觉按 `UseSystemFocusVisuals` 以强调色细环实现。滚动条 separator 背景在 WinUI 默认透明(`ScrollViewScrollBarsSeparatorBackground = ControlFillColorTransparentBrush`),转角观感由 thumb 的透明内边框近似。
8. **键盘滚动**:聚焦( `is-tab-stop`)后使用浏览器原生方向键/翻页键/空格滚动;WinUI ScrollView 对键盘的处理(含 `ScrollingInputKinds.Keyboard` 忽略)未逐项复刻。

## 官方示例对照

对照 `CK/WinUI-Gallery/WinUIGallery/Samples/ScrollView/`(ScrollViewPage.xaml):

- Example1 参数面板(ZoomMode / ZoomFactor NumberBox / 两轴 ScrollMode / 两轴 ScrollBarVisibility 组合)→ 示例页「参数舞台」选项面板,并扩展 ContentOrientation 四档下拉 + 瓷砖墙演示;
- Example1 的 ContentOrientation=None + ZoomMode=Enabled 照片查看器场景 → 示例页「照片查看器」(SVG 海报,`preserveAspectRatio` 对应 `Image Stretch=Uniform`;1×/2×/4× 与 zoomBy 按钮,Ctrl+滚轮提示);
- Example3 编程滚动 + 自定义动画时长(NumberBox 1000–5000ms,Default/Accordion/Teleportation 三种动画)→ 示例页「编程滚动」:动画开关 + 时长 + `scrollTo / scrollBy / scrollToOffset` 按钮,`scrollAnimationStarting / scrollCompleted` 事件日志;自定义关键帧动画(手风琴/传送)以时长参数近似;
- Example2 `AddScrollVelocity` 恒速滚动 → 未复刻(惯性物理不适用 Web,见差异 1),以 scrollBy 步进近似。

## 相关链接

- 演示页源码:[demo/pages/ScrollViewPage.vue](../../demo/pages/ScrollViewPage.vue)
- 组件源码:[src/components/ScrollView.vue](../../src/components/ScrollView.vue)
- 同类控件:[ScrollViewer](./ScrollViewer.md)(旧滚动控件,与本控件并存)、[Viewbox](./Viewbox.md)(等比缩放而非滚动)、[Expander](./Expander.md)(展开收起容器)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
