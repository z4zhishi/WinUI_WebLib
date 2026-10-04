# SplitView

> 在线示例:[/#/splitview](/#/splitview) · 演示页源码:[demo/pages/SplitViewPage.vue](../../demo/pages/SplitViewPage.vue)

## 概述

SplitView 是一个带有**两个内容区**的容器:一侧是可开合的**窗格**(pane),常用于导航选项等辅助内容;另一侧是**主内容区**。窗格支持四种展示模式——`Inline`(推挤内容)、`CompactInline`(关闭时保留紧凑栏)、`Overlay`(浮于内容之上并带遮罩)、`CompactOverlay`(紧凑栏 + 浮层)——以及四个摆放方位(`Left` / `Right` / `Top` / `Bottom`)。Overlay 系模式下点击遮罩、按 `Esc` 或在窗格上沿关闭方向轻扫均可关闭窗格;它也是 hamburger 导航模式(NavigationView)的基础构件。本组件按 generic.xaml 的 `TargetType="SplitView"` 模板段(L15008-L15671)复刻其九态布局与开关动效。

官方文档:

- [SplitView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.splitview)
- [SplitView 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/split-view)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `panePlacement` | `'Left' \| 'Right' \| 'Top' \| 'Bottom'` | `'Left'` | 窗格方位(WinUI `PanePlacement`);Top/Bottom 为 Web 同构推演,见差异节 |
| `displayMode` | `'Inline' \| 'Overlay' \| 'CompactInline' \| 'CompactOverlay'` | `'Inline'` | 展示模式(WinUI `DisplayMode`):Inline/CompactInline 参与布局推挤内容,Overlay/CompactOverlay 浮于内容之上并带轻扫遮罩 |
| `isPaneOpen` (v-model) | `boolean` | `false` | 窗格开关状态(WinUI `IsPaneOpen`),双向绑定 |
| `openPaneLength` | `number` | `320` | 展开态窗格长度 px(WinUI `OpenPaneLength`,默认 `SplitViewOpenPaneThemeLength`);Left/Right 时为宽度,Top/Bottom 时为高度 |
| `compactPaneLength` | `number` | `48` | 紧凑栏长度 px(WinUI `CompactPaneLength`,默认 `SplitViewCompactPaneThemeLength`),仅 Compact 系模式生效 |
| `paneBackground` | `string` | `''` | 窗格背景色(WinUI `PaneBackground`),任意 CSS 颜色;空串使用 token 默认值(ChromeLow) |
| `paneLabel` | `string` | `''` | 窗格的无障碍名;Overlay 系模式下作为窗格 `role="dialog"` 的 `aria-label` |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `update:isPaneOpen` | `(value: boolean)` | `v-model:is-pane-open` 双向绑定更新 |
| `paneOpened` | — | 打开动画结束后(WinUI `PaneOpened`,同为动画完成时机) |
| `paneClosing` | — | 关闭动画开始前(WinUI `PaneClosing`,同序) |
| `paneClosed` | — | 关闭动画结束后(WinUI `PaneClosed`,同为动画完成时机) |

与 WinUI 一致,程序化修改 `v-model:is-pane-open` 同样触发这三个事件;`paneOpened` / `paneClosed` 以 `transitionend` 为主(Overlay 认窗格滑移、Inline 认根轨道过渡)、定时器兜底,每次切换只发一次。

## Slot

| Slot | 说明 |
| --- | --- |
| 默认 slot | 主内容区 |
| `#pane` | 窗格内容;未提供时呈现**内置空 pane**(仅窗格背景色的空面板) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiSplitView from '@/components/SplitView.vue'

const isPaneOpen = ref(true)
</script>

<template>
  <WuiSplitView
    v-model:is-pane-open="isPaneOpen"
    display-mode="CompactOverlay"
    pane-placement="Left"
    :open-pane-length="256"
    :compact-pane-length="48"
    pane-label="导航窗格">
    <template #pane>
      <!-- 导航链接等窗格内容 -->
      <nav>…</nav>
    </template>
    <!-- 主内容区 -->
    <main>…</main>
  </WuiSplitView>
</template>
```

## 无障碍

- **对话框语义**:Overlay / CompactOverlay 模式下窗格浮于内容之上,按对话框语义处理——窗格获得 `role="dialog"` 并以 `paneLabel` 作为 `aria-label`;打开时焦点移交至窗格(`tabindex="-1"` 程序聚焦),关闭时若焦点仍在窗格内则归还给打开前聚焦的元素。因轻扫遮罩为**非模态**(点击内容区即关闭窗格,背景仍可交互),故**不**设置 `aria-modal`,保持背景对读屏器可见,与实际行为一致;Inline / CompactInline 窗格为普通布局区域,不添加对话框语义。
- `Esc` 关闭浮层窗格(Overlay / CompactOverlay);轻扫遮罩层 `aria-hidden="true"`。
- 关闭且非 Compact 模式时,窗格 `visibility: hidden`,移出焦点序与可访问性树。
- `prefers-reduced-motion` 时全部过渡时长趋近 0(animations.css 全局降级),事件仍按时序触发。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml` L15008-L15671 的 `TargetType="SplitView"` 模板段复刻,布局九态(`Closed` / `ClosedCompactLeft|Right` / `OpenInlineLeft|Right` / `OpenOverlayLeft|Right` / `OpenCompactOverlayLeft|Right`)与 `OverlayVisibilityStates` 的轨道 / 浮层 / 遮罩语义一一对应。颜色 token 映射:

| 源资源 | 本组件 token | 差异说明 |
| --- | --- | --- |
| `PaneBackground` ← `SystemControlPageBackgroundChromeLowBrush`(controls/dev 仅有引用无定义 → 权威即 legacy) | `--wui-system-control-page-background-chrome-low`(#F2F2F2 / #171717) | 同键直接映射(PL15 复核保留) |
| `LightDismissLayer.Fill` ← `SplitViewLightDismissOverlayBackground`(legacy) | `--wui-split-view-light-dismiss-overlay-background`(#FFFFFF99 / #00000099) | 同键直接映射(PL15 复核保留) |
| `HCPaneBorder.Fill` ← `SystemControlForegroundTransparentBrush`(legacy) | `--wui-system-control-foreground-transparent`(transparent)+ `forced-colors` 下 `CanvasText` | 源边框仅在高对比模式可见;Web 以 `@media (forced-colors: active)` 等价实现,一般主题下透明 |
| 窗格文本前景(控件无 Foreground setter)← 通用默认文本前景 `DefaultTextForegroundThemeBrush` = `TextFillColorPrimaryBrush` | `--wui-text-fill-color-primary`(浅 `#000000E4` / 深 `#FFFFFF`) | PL15 重定向(此前 legacy `--wui-application-foreground-theme`) |

> PL15 复核结论:SplitView 窗格底 / 遮罩 / 描边三键在 `controls/dev` 仅引用、定义只在 legacy `generic.xaml`,故**权威即 legacy,保留原 token 不臆造**;唯一 Fluent 重定向是窗格文本前景。总览见 [_brushes.md](./_brushes.md)。

其余无 token / 做 Web 等价替换的项:

1. **Top/Bottom 方位为 Web 同构推演**:`SplitViewPanePlacement` 枚举含 Top/Bottom,但参照源模板只实现了 Left/Right(轨道列 + `TranslateX` 滑移 + `SplitViewLeftBorderThemeThickness 0,0,1,0` / `Right 1,0,0,0`)。Top/Bottom 按同一状态机把轨道换成行、滑移换成 `TranslateY`,边框厚度按位向同构推演(上边窗格描下边、下边窗格描上边),WinUI 无官方对应视觉。
2. **开关动画时长取源精确值**:源 Inline 开合为 0.2s / 0.1s + KeySpline `0.0,0.35 0.15,1.0`,Overlay 开合为 0.35s / 0.12s + KeySpline `0.1,0.9 0.2,1.0`;时长按组件局部 token `--sv-open-ms` / `--sv-close-ms` 精确承载(200/100、350/120,JS 收尾定时器同值),缓动取 `--wui-easing-decelerate` / `--wui-easing-standard`(同曲线精确)。VR-FIX19 曾登记的 token 取整(240/167/167)已订正。
3. **Inline 开合的动画机制**:源对窗格同时做 `PaneClipRectangle` 裁剪揭示与 `PaneTransform` 平移(擦除 + 滑移);Web 版以根元素 `grid-template-columns/rows` 轨道过渡实现擦除揭示(内容真实重排,等同源 `ContentRoot` 换列),省略窗格自身的平移分量,视觉上为纯擦除。Compact 系关闭态的「近边条带」由窗格内容锚定近边 + 外壳裁剪呈现,与源 `ClosedCompactLeft`(露出左侧 48px)/ `ClosedCompactRight`(露出右侧 48px)语义一致。
4. **Esc 关闭与轻扫关闭为 Web 增强**:WinUI 的 SplitView 不响应 Esc、也无内建轻扫关闭(浮层关闭依赖 LightDismiss 层点击)。按任务规格补充:Overlay / CompactOverlay 打开时按 Esc 关闭;在窗格上沿关闭方向拖动超过阈值(min(80px, openPaneLength/3))时关闭,不足则回弹。符号模型:拖移量取指针位移在窗格滑动轴上的分量(Left/Right 为水平、Top/Bottom 为垂直),仅保留关闭方向分量(Left/Top 为负轴、Right/Bottom 为正轴)并限幅至 ±openPaneLength,直接叠加在窗格滑移变换(`--wui-splitview-drag`)上,窗格恒与手指同向,松手复位后由过渡自然收尾。
5. **事件时序**:`PaneClosing` → `paneClosed` → (下次)`PaneOpened` 与 WinUI 相同;收尾事件以 `transitionend` 为主、定时器(时长 + 60ms)兜底。
6. **属性命名**:`PanePlacement` → `panePlacement`;`DisplayMode` → `displayMode`;`IsPaneOpen` → `v-model:is-pane-open`;`OpenPaneLength` / `CompactPaneLength` → `openPaneLength` / `compactPaneLength`(数字 px);`PaneBackground` → `paneBackground`(CSS 颜色字符串)。
7. **尺寸资源未提取**:`SplitViewOpenPaneThemeLength = 320`、`SplitViewCompactPaneThemeLength = 48` 为 XAML 资源,按值写为 props 默认值;窗格背景边框 1px 按 `SplitViewLeftBorderThemeThickness` / `SplitViewRightBorderThemeThickness` 实现。
8. **焦点框**:SplitView 本体在源模板中 `IsTabStop=false` 不接收焦点;Web 版根元素不设 tabindex,窗格仅作程序聚焦目标(`tabindex="-1"`,无焦点环)。演示页中导航项 / 汉堡按钮等内容的交互态由页面自身实现。

---

演示页源码:[demo/pages/SplitViewPage.vue](../../demo/pages/SplitViewPage.vue) · 组件源码:[src/components/SplitView.vue](../../src/components/SplitView.vue) · Fluent 画刷族:[_brushes.md](./_brushes.md)
