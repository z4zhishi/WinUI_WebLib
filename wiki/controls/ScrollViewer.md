# ScrollViewer

在线示例:[/#/scrollviewer](/#/scrollviewer)

## 概述

ScrollViewer 是 WinUI 中让用户**滚动、平移与缩放超出可视区域的内容**的容器控件:内容按视区尺寸参与布局,溢出部分由滚动条与滚轮/触摸平移承接,`ZoomMode` 启用后还支持缩放。ListView、GridView 等列表控件的模板都内置了 ScrollViewer 来提供自动滚动,因此它是阶段 2 的高价值基建控件。

本组件是 WinUI ScrollViewer 的 Web 复刻:结构对照 `generic.xaml` 的 `TargetType="ScrollViewer"` 模板(Root Border → Grid(Background)→ ScrollContentPresenter(Margin = Padding)+ 横/竖 ScrollBar),滚动用原生 `overflow` 承载并把滚动条样式化为 WinUI 细拇指观感(`--wui-scroll-bar-*` token);缩放遵循 WinUI 语义——内容按未缩放尺寸布局后整体 `transform: scale()`,滚动范围随缩放自动增长;`Ctrl+滚轮`(触控板捏合同理)缩放、视口中心锚定;编程 API 对照 `ChangeView` / `ScrollTo*Offset` 家族经 `defineExpose` 暴露。

官方文档:

- [ScrollViewer - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.scrollviewer)
- [滚动控件设计指南](https://learn.microsoft.com/windows/apps/design/controls/scroll-controls)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content`(默认 slot) | `any` | — | 被滚动的内容;按视区尺寸参与布局,超出部分转为滚动溢出 |
| `horizontalScrollMode` | `'Auto' \| 'Enabled' \| 'Disabled'` | `'Auto'` | 水平滚动模式:Auto 按内容是否溢出自动启用;Enabled 恒可滚;Disabled **仅拦截用户输入**(滚轮/触摸/键盘/滚动条拖拽),编程滚动不受限 |
| `verticalScrollMode` | 同上 | `'Auto'` | 垂直滚动模式 |
| `horizontalScrollBarVisibility` | `'Auto' \| 'Visible' \| 'Hidden' \| 'Disabled'` | `'Auto'` | 水平滚动条:Auto 需要时显示;Visible 常显;Hidden 隐藏但仍可滚;Disabled **彻底禁滚(含编程)** |
| `verticalScrollBarVisibility` | 同上 | `'Visible'` | 垂直滚动条(WinUI 默认样式即设为 Visible) |
| `zoomMode` | `'Disabled' \| 'Enabled'` | `'Disabled'` | 缩放模式;Enabled 时 Ctrl+滚轮(触控板捏合)缩放 |
| `minZoomFactor` | `number` | `0.1` | 最小缩放系数(WinUI MinZoomFactor) |
| `maxZoomFactor` | `number` | `10` | 最大缩放系数(WinUI MaxZoomFactor) |
| `zoomFactor`(`v-model:zoom-factor`) | `number` | `1` | 当前缩放系数,双向绑定 |
| `padding` | `number \| string` | `0` | 内容内边距(对应模板里 Presenter 的 Margin);数字按 px |
| `background` | `string` | `'transparent'` | 背景色(WinUI Background,默认透明);任意 CSS color |
| `isTabStop` | `boolean` | `false` | 是否可聚焦(WinUI 默认样式即 False);聚焦后方向键 / 空格 / PgUp / PgDn 滚动 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `@scroll` | `(event: Event)` | 视区每次滚动(原生 `scroll` 透传) |
| `@view-changed` | `(detail: { horizontalOffset, verticalOffset, zoomFactor })` | 滚动/缩放静止后防抖(120ms)触发,对应 WinUI ViewChanged 的最终回调(`IsIntermediate = false`) |
| `@zoom-factor-changed` | `(zoomFactor: number)` | 缩放系数变化(Ctrl+滚轮、changeView、外部 v-model 写入、min/max 钳制生效) |
| `@update:zoom-factor` | `(zoomFactor: number)` | `v-model:zoom-factor` 的写入事件 |

偏移量语义与 WinUI 一致:`horizontalOffset` / `verticalOffset` 是**缩放后视区坐标**里的值(范围 0 至 extent × zoom − viewport)。

## 编程 API(模板 ref)

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `changeView` | `(h?: number \| null, v?: number \| null, zoom?: number \| null, disableAnimation?: boolean) => boolean` | 对照 WinUI ChangeView:`null` 表示该轴保持不变;目标轴 `ScrollBarVisibility=Disabled` 时返回 `false`(ScrollMode 不限编程滚动);默认带动画,`disableAnimation` 为 true 时跳转 |
| `scrollToLeft` | `(disableAnimation?: boolean) => boolean` | 滚动到最左 |
| `scrollToRight` | `(disableAnimation?: boolean) => boolean` | 滚动到最右 |
| `scrollToTop` | `(disableAnimation?: boolean) => boolean` | 滚动到顶部 |
| `scrollToBottom` | `(disableAnimation?: boolean) => boolean` | 滚动到底部 |
| `horizontalOffset` / `verticalOffset` / `zoomFactor` | `Ref<number>`(实时) | 当前视区偏移与缩放系数,经模板 ref 读取 |

## 可见性映射与模式拦截表

**overflow 仅由 ScrollBarVisibility 决定**(对照 `UpdateCanScroll`,`ScrollViewer_Partial.cpp` L5373-5400:CanScroll 的唯一门控是 `visibility != Disabled`,编程滚动同受此门控;Disabled 时 WinUI 会在切换瞬间把该轴偏移复位为 0,Web 侧 `overflow: hidden` 不重置已有偏移、仅此后不可再滚——切换瞬态差异见差异 8):

| ScrollBarVisibility(每轴独立) | CSS overflow | 说明 |
| --- | --- | --- |
| `Visible` | `scroll` | 恒可滚,滚动条常显 |
| `Hidden` | `scroll` + 隐藏该轴滚动条 | 滚轮/编程 API 仍可滚 |
| `Auto` | `auto` | 按内容是否溢出出现滚动条 |
| `Disabled` | `hidden` | 彻底禁滚(含编程);已有偏移保留(WinUI 切换瞬间复位 0,见差异 8) |

**ScrollMode=Disabled 只拦截用户输入,不禁编程滚动**(对照 `OnHorizontal/VerticalScrollBarScroll` L5417/5451:滚动条拖拽事件同样被忽略)。逐通道拦截实现:

| 用户输入通道 | 拦截方式 |
| --- | --- |
| 滚轮 | 锁定轴 delta `preventDefault` 拦截(含行/页 deltaMode 归一);内容内嵌套可滚子区域放行原生滚动(外层不劫持);非零 delta 全在允许轴上时原样放行(保留原生平滑滚动) |
| 触摸平移 | `touch-action` 逐轴(单轴锁定 `pan-x`/`pan-y`,双轴 `none`) |
| 键盘(容器持焦) | 锁定轴的方向键/PageUp/PageDown/Home/End/Space `preventDefault` |
| 滚动条拖拽 | 透明覆盖层盖住锁定轴实际显示的滚动条栏位(原生伪元素无法单独禁用交互;该轴无滚动条时不渲染覆盖层,避免 12px 指针死区) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiScrollViewer from '@/components/ScrollViewer.vue'

const zoomFactor = ref(1)
const viewerRef = ref<InstanceType<typeof WuiScrollViewer> | null>(null)

function onViewChanged(detail: { horizontalOffset: number; verticalOffset: number; zoomFactor: number }): void {
  console.log('视图稳定于', detail)
}
</script>

<template>
  <!-- 最简:固定视区 + 长内容(垂直滚动条常显,与 WinUI 默认一致) -->
  <WuiScrollViewer :style="{ width: 400, height: 266 }">
    <YourLongContent />
  </WuiScrollViewer>

  <!-- 官方示例参数组合:恒可滚 + 缩放(v-model 双向) -->
  <WuiScrollViewer
    :style="{ width: 400, height: 266 }"
    horizontal-scroll-mode="Enabled"
    horizontal-scroll-bar-visibility="Auto"
    vertical-scroll-bar-visibility="Visible"
    zoom-mode="Enabled"
    v-model:zoom-factor="zoomFactor"
    @view-changed="onViewChanged"
  >
    <YourContent />
  </WuiScrollViewer>

  <!-- 隐藏滚动条但仍可滚(编程/滚轮) -->
  <WuiScrollViewer vertical-scroll-bar-visibility="Hidden" :style="{ width: 320, height: 200 }">
    <YourContent />
  </WuiScrollViewer>
</template>
```

编程滚动:

```ts
const viewer = viewerRef.value
viewer?.scrollToBottom()                 // 滚到底部(带动画)
viewer?.changeView(0, 0, 1, true)        // 无动画复位到原点与 1×
const ok = viewer?.changeView(null, null, 2) // 只改缩放,返回是否接受
```

## 与 WinUI 的差异

1. **滚动条为原生滚动条样式化,非 overlay**:WinUI 的 ScrollBar 是 overlay 控件,不占布局空间,内容可从滚动条下方滑过;Web 原生滚动条(经 `::-webkit-scrollbar` 样式化为 12px 栏、4px 细拇指)在显示时会预留栏位,视区略窄于控件宽度。滚动条颜色全部取 `--wui-scroll-bar-*` token;Firefox 走标准 `scrollbar-width/scrollbar-color` 细滚动条降级(无法逐轴隐藏)。颜色/圆角口径(VR-B6 FIX11 定案,与 ScrollView 组件统一):静置 thumb 取 `--wui-scroll-bar-thumb-fill`(SystemChromeDisabledLow #7A7A7A/#858585,即源 Visible 滚动条收起态 ScrollBarPanningThumbBackground),thumb 圆角源为**无圆角 Rectangle**(半径无源依据、无 token)→ 取 `999px` 满圆 pill(4px 厚下呈半圆端),观感与同库 ScrollView 一致。**悬停自动展开/离开自动收起**(MR2/A11,对照源 `ScrollBarExpand/ContractDuration`=0.1s、BeginTime 0.4s/2s):指针悬停滚动条区 0.4s 后展开(3px + `--wui-scroll-bar-thumb-background` 展开态色 + 轨道显形),离开 2s 后收起;0.1s 补间因 Chromium 不支持 `::-webkit-scrollbar-*` 伪元素过渡而不生效(平台限制,样式瞬变),0.4s/2s 延迟由 JS 定时器驱动。
2. **ScrollMode 的触摸语义未逐项复刻**:WinUI 的 ScrollMode 还关联触摸平移、惯性、滚动链(chaining)等 DirectManipulation 配置(如 `IsVerticalScrollChainingEnabled`、`IsScrollInertiaEnabled`);Web 侧 `ScrollMode=Disabled` 的用户输入拦截覆盖滚轮/touch-action/键盘/滚动条栏位四个通道,但滚动链与惯性由浏览器接管、相关属性未暴露。`ScrollMode=Enabled/Auto` 在 CSS overflow 上无区别(能否滚只由可见性决定),仅在内容未溢出时二者的编程滚动都无处可滚,行为等效。另外:栏位覆盖层仅在该轴滚动条实际显示时渲染;横竖滚动条同时显示且其一被锁定时,锁定轴覆盖层会盖住另一轴滚动条的角落 12px(角落重叠观感)。
3. **缩放锚点取视口中心**:Ctrl+滚轮缩放保持视口中心的内容点不动;WinUI 缩放由 DirectManipulation 接管,锚点行为未在托管源码中逐行对照,`changeView(…, zoom)` / 外部 v-model 写入则为左上角锚定(与 ChangeView 的 offset 语义一致)。
4. **缩放实现为布局不缩放 + 整体 transform**:与 WinUI 内容变换语义一致(文本按未缩放宽度排版后视觉放大,放大后由浏览器重栅格化);滚动范围经 transform 溢出计入滚动区自动增长,但 `scrollWidth` 等读取的是含缩放的视区像素(与 WinUI offsets 同坐标系)。
5. **每档缩放步长取 ±10% 近似**:WinUI 由 DirectManipulation 决定滚轮缩放步长,本实现按 `×1.1 / ÷1.1` 逐档缩放并钳制到 min/max。
6. **ChangeView 的缩放请求不因 ZoomMode=Disabled 拒绝**:官方示例在 ZoomMode 切到 Disabled 后仍调用 `ZoomToFactor(2.0)` 复位,故编程缩放始终可用;`changeView` 仅在**目标轴 ScrollBarVisibility=Disabled** 时返回 `false`(对照 `UpdateCanScroll` 的门控——CanScroll 只由可见性决定,ScrollMode 不参与;滚轮缩放与 ScrollMode 亦相互独立)。
7. **CornerRadius / BorderThickness 未作为 props 暴露**:WinUI 默认模板两者为 0/Transparent;需要圆角/描边时经 `$attrs` 的 class/style 自行包装(示例页用外层 border 呈现卡片观感)。
8. **ScrollBarVisibility 切到 Disabled 的偏移瞬态**:WinUI 在切换瞬间把该轴偏移复位为 0(`SetHorizontalOffset(0)`,见 `ScrollViewer_Partial.cpp` L5387/L5394);Web 侧 `overflow: hidden` 不重置滚动偏移——原值保留、脚本写入仍生效,仅该轴此后无法再滚,与 WinUI 的切换瞬态不同。

## 官方示例对照

对照 `CK/WinUI-Gallery/WinUIGallery/Samples/ScrollViewer/ScrollViewerPage.xaml`(400 × 266 示例 + 参数面板):

- ZoomMode 下拉(Disabled/Enabled)+ Zoom 滑块(min/max 绑定控件,默认 4)→ 示例页 ZoomMode 下拉 + ZoomFactor 滑块(0.1–10,经 v-model 与组件双向同步);
- Horizontal/Vertical ScrollMode 下拉(Disabled/Enabled/Auto)→ 示例页两个 ScrollMode 下拉(默认值与 WinUI 一致取 Auto,官方示例的 SelectedIndex 与实际值不同步,此处以真实值为准);
- Horizontal/Vertical ScrollBarVisibility 下拉(Disabled/Auto/Hidden/Visible)→ 示例页两个可见性下拉;
- 官方示例内容为悬崖照片(`Stretch="None"`,需显式宽高规避布局循环)→ 示例页以长文 + 640×36 色条替代(无官方图片资产),同时提供纵向/横向溢出;
- ViewChanged 回调里 `!e.IsIntermediate` 时同步 Zoom 滑块 → 示例页 viewChanged 防抖计数 + 最近视图读数,缩放系数经 v-model 天然双向同步;
- 官方 code-behind 的 ZoomToFactor/ChangeView(null,null,z) → 示例页例 2 编程滚动按钮组(scrollToLeft/Right/Top/Bottom + changeView 放大/缩小/复位)。

## 相关链接

- 演示页源码:[demo/pages/ScrollViewerPage.vue](../../demo/pages/ScrollViewerPage.vue)
- 组件源码:[src/components/ScrollViewer.vue](../../src/components/ScrollViewer.vue)
- 同类控件:Viewbox(整体缩放而非滚动)、StackPanel(纵向/横向排布,常作为其内容)、Expander(展开收起容器)
