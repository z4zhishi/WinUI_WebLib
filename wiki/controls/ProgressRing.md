# ProgressRing

> 在线示例:[/#/progressring](/#/progressring) · 演示页源码:[demo/pages/ProgressRingPage.vue](../../demo/pages/ProgressRingPage.vue)

## 概述

ProgressRing(进度环)有两种视觉形态:**不确定(Indeterminate)**——表示任务正在进行,并且会阻止用户交互(阻塞式加载);**确定(Determinate)**——表示已知工作量下已完成的进度。与 ProgressBar 的区别在于:ProgressRing 表达"应用正在忙碌",适合页面级/区域级等待场景,ProgressBar 适合表达具体进度。

组件按 WinUI `TargetType="ProgressRing"` 的 ControlTemplate 复刻(源文件位于 `controls/dev/ProgressRing/ProgressRing.xaml`,不在 generic.xaml):源模板是一个承载 Lottie 动画的 `AnimatedVisualPlayer`,本组件以归一化 SVG(viewBox 80×80,半径 35、描边 7.5,随直径等比缩放)+ CSS 关键帧 1:1 转写源动画(2s 循环、容器旋转 0→450°→900°、弧长前半程自起点生长、后半程尾追头),颜色取 `AccentFillColorDefaultBrush`(默认)/ `Background`(轨道圆,默认透明)。

官方文档:

- [ProgressRing - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.progressring)
- [进度控件设计指南](https://learn.microsoft.com/windows/apps/design/controls/progress-controls)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | `number`(`v-model:value`) | `0` | 当前值;被 `minimum`/`maximum` 钳制时自动回写(源 `CoerceValue` 语义) |
| `minimum` | `number` | `0` | 最小值 |
| `maximum` | `number` | `100` | 最大值(小于 `minimum` 时区间收敛,弧长为 0) |
| `isIndeterminate` | `boolean` | `true` | 不确定态:2s 旋转弧动画,不反映具体进度;aria 不报值(源默认值即 `true`) |
| `isActive` | `boolean` | `true` | 激活态(源默认 `true`);`false` 时圆环隐藏(`opacity: 0`,保留布局)并停止动画,且移出无障碍树(源 `AccessibilityView=Raw`) |
| `size` | `number` | `32` | 直径 px(WinUI 用 `Width`/`Height` 控制,此处合并为单一属性);下限 16(源 `MinWidth`/`MinHeight`),环厚随直径等比缩放 |
| `foreground` | `string` | 主题强调色 | 弧颜色(CSS 颜色值,对应 WinUI `Foreground`) |
| `background` | `string` | `''`(透明) | 轨道圆颜色(CSS 颜色值,对应 WinUI `Background`;源 Lottie 的 Background 着色的是轨道圆) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `valueChanged` | `{ oldValue: number; newValue: number }` | 值变化时触发;程序赋值与钳制重算同样触发(与 WinUI `ValueChanged` 一致) |
| `update:value` | `(value: number) => void` | `v-model:value` 双向绑定事件 |

模板中监听写法:`@value-changed="onValueChanged"`。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ProgressRing from '@/components/ProgressRing.vue'

const value = ref(0)
const isActive = ref(true)

function onValueChanged(e: { oldValue: number; newValue: number }): void {
  console.log(`值从 ${e.oldValue} 变为 ${e.newValue}`)
}
</script>

<template>
  <!-- 不确定态(默认):任务进行中 -->
  <ProgressRing />

  <!-- 确定态:已知工作量,0-100 -->
  <ProgressRing :is-indeterminate="false" v-model:value="value" @value-changed="onValueChanged" />

  <!-- 隐藏但保留布局(源 Inactive 态) -->
  <ProgressRing :is-active="isActive" />

  <!-- 自定义尺寸与颜色 -->
  <ProgressRing :size="60" foreground="#0078d4" background="#f0f0f0" />
</template>
```

## 视觉状态(对照源 CommonStates)

| 状态 | 触发条件 | 表现 |
| --- | --- | --- |
| `Active` | `is-active` + `is-indeterminate` | 2s 无限循环的旋转弧动画(源 `player.PlayAsync(0, 1, true)`) |
| `DeterminateActive` | `is-active` + 确定 | 静态弧,弧长 = `(value - minimum) / (maximum - minimum)` × 周长 |
| `Inactive` | `!is-active` | 整环 `opacity: 0`(保留布局)、动画停止、`aria-hidden` |

不确定态动画对照源 Lottie(`AnimatedVisuals/ProgressRingIndeterminate.cpp`,时长 2s):容器旋转 0→450°→900°,每段缓动 KeySpline `(0.167,0.167,0.833,0.833)` → `cubic-bezier`;弧长前半程 `TrimEnd 0.0001→0.5`(起点锚定,弧自起点生长),后半程 `TrimStart 0→0.5`(终点锚定,尾追头),端值配合圆端帽呈现为小圆点;900°(2.5 圈)使循环末尾的圆点回到起点位置,循环无缝。SVG 以 `pathLength="100"` 的 `stroke-dasharray`/`stroke-dashoffset` 等价实现。

## 无障碍

- 根元素 `role="progressbar"`(源 `AutomationControlType.ProgressBar`);确定态输出 `aria-valuemin` / `aria-valuemax` / `aria-valuenow`。
- 不确定态不输出任何取值属性(源 AutomationPeer 在不确定态不提供 RangeValue pattern;WAI-ARIA:进度未知时不报值)。
- 激活 + 不确定时,可访问名前缀源本地化状态串(en-US 为 `Busy`,`SR_ProgressRingIndeterminateStatus`),例如传入 `aria-label="加载"` 时输出 `Busy 加载`。
- `is-active="false"` 时输出 `aria-hidden="true"`(源 `SetAccessibilityView(Raw)`)。
- 非交互控件(源 `IsTabStop=false` / `IsHitTestVisible=false`):不进入 Tab 序、无焦点环、不响应指针;建议配合 `aria-label` 或页面文案说明等待内容。
- `prefers-reduced-motion: reduce` 时不确定态定格在循环中点(450°、半圆弧),等同暂停观感。

## 与 WinUI 的差异

1. **颜色(PL10 Fluent 重定向)**:ProgressRing 主题资源在 `controls/dev/ProgressRing/ProgressRing_themeresources.xaml`(Foreground = `AccentFillColorDefaultBrush`、Background = `ControlFillColorTransparentBrush`)。PL10 已把组件内硬编码改为直引 PL2 Fluent token:Foreground → `--wui-accent-fill-color-default`(浅 `SystemAccentColorDark1` `#0067C0` / 深 `SystemAccentColorLight2` `#4CC2FF`,删除浅/深两套覆盖);轨道圆 Background → `--wui-control-fill-color-transparent`。HighContrast 字典未实现。总览见 [_brushes.md](./_brushes.md)。
2. **Lottie → SVG/CSS**:源动画是 LottieGen 生成的 Composition 动画,Web 以 SVG 描边圆 + CSS 关键帧等价转写(参数 1:1,见上文);`DeterminateSource` / `IndeterminateSource` 预览属性(自定义动画源)未实现。
3. **确定态几何归一**:源确定态 Lottie 画布为 32 基(半径 8 × 缩放 1.77 ≈ 14.2px、描边 ≈ 2.65px @32px),不确定态为 80 基(半径 35/80 = 14px、描边 7.5/80 = 3px @32px)。组件统一采用不确定态几何,两态切换时环径/环厚不跳动;与源确定态相比半径差约 1%、环厚约 0.35px(@32px)。
4. **`ProgressRingStrokeThickness`(=4)未使用**:该资源为 WUXC 兼容遗留,源新模板并未引用它(描边烘焙在 Lottie 内),组件同样不使用。
5. **值变化动效**:源确定态用 `PlayAsync(from, to)` 顺向扫播(时长与增量成正比,减值时直接跳变);Web 以 240ms 的 `stroke-dasharray` 过渡近似(`--wui-duration-normal` + `--wui-easing-standard`,与 ProgressBar 口径一致),只挂确定态族,减值时同样有过渡(源为跳变)。
6. **`Busy` 前缀语言**:可访问名前缀串按源 en-US 资源固定为 `Busy`,未随站点语言本地化(全站 i18n 在阶段 8 统一)。
7. **`prefers-reduced-motion`**:不确定态改为静态半圆弧(定格循环中点);WinUI 无此降级行为。
8. **无 token 的源尺寸常量**(组件内按源值实现):默认 `Width`/`Height=32`、`MinWidth`/`MinHeight=16`、Lottie 几何(半径 35、描边 7.5,viewBox 80×80)、`ProgressRingStrokeThickness=4`(未引用,见差异 4)。

## 在 WinUI 中的典型场景(对照官方示例)

- 不确定态:`<ProgressRing Width="60" Height="60" IsActive="{...}" />`,配 ToggleSwitch 实时切换激活(官方示例 OnContent=Working / OffContent=Do work)
- 确定态:`<ProgressRing Width="60" Height="60" IsIndeterminate="False" Value="{...}" />` 配 0-100 调值控件(官方示例为 NumberBox)
- 相关控件:ProgressBar(非阻塞式进度,已知工作量时优先选用)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
