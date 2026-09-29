# ProgressBar

> 在线示例:[/#/progressbar](/#/progressbar) · 演示页源码:[demo/pages/ProgressBarPage.vue](../../demo/pages/ProgressBarPage.vue)

## 概述

ProgressBar(进度条)有两种视觉形态:**不确定(Indeterminate)**——表示任务正在进行,但不阻止用户交互;**确定(Determinate)**——表示已知工作量下已完成的进度。

组件按 WinUI `TargetType="ProgressBar"` 的 ControlTemplate 复刻(源文件位于 `controls/dev/ProgressBar/ProgressBar.xaml`,不在 generic.xaml):总高 3px、1px 轨道(`ControlStrongStrokeColorDefault`)+ 3px 高指示条(`AccentFillColorDefaultBrush`,圆角 1.5);不确定态为 40%/60% 两条指示条的 2s 往复动画,按源 Storyboard 的 KeyTime 与 KeySpline 1:1 转写;`ShowError` / `ShowPaused` 切换错误(红)/ 暂停(黄)状态。

官方文档:

- [ProgressBar - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.progressbar)
- [进度控件设计指南](https://learn.microsoft.com/windows/apps/design/controls/progress-controls)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | `number`(`v-model:value`) | `0` | 当前值;被 `minimum`/`maximum` 钳制时自动回写 |
| `minimum` | `number` | `0` | 最小值 |
| `maximum` | `number` | `100` | 最大值(小于 `minimum` 时区间收敛,指示条宽度为 0,与源 `width 0` 分支一致) |
| `isIndeterminate` | `boolean` | `false` | 不确定态:双指示条往复动画,不反映具体进度;aria 不报值 |
| `showError` | `boolean` | `false` | 错误态(WinUI `ShowError`):指示条变红;不确定态下为红色满宽 + 脉冲 |
| `showPaused` | `boolean` | `false` | 暂停态(WinUI `ShowPaused`):指示条变黄;不确定态下停止往复(黄色满宽 + 脉冲) |
| `padding` | `string \| number` | `''` | 内边距(WinUI `Padding`;数字按 px,字符串原样) |

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
import ProgressBar from '@/components/ProgressBar.vue'

const value = ref(0)
const isIndeterminate = ref(true)

function onValueChanged(e: { oldValue: number; newValue: number }): void {
  console.log(`值从 ${e.oldValue} 变为 ${e.newValue}`)
}
</script>

<template>
  <!-- 确定态:已知工作量 -->
  <ProgressBar v-model:value="value" :minimum="0" :maximum="100" @value-changed="onValueChanged" />

  <!-- 不确定态:任务进行中 -->
  <ProgressBar is-indeterminate />

  <!-- 错误 / 暂停状态 -->
  <ProgressBar v-model:value="value" show-error />
  <ProgressBar is-indeterminate show-paused />
</template>
```

## 进度状态(对照源 CommonStates)

| 状态 | 触发条件 | 表现 |
| --- | --- | --- |
| `Determinate` | 默认 | 轨道 + 按值宽度的强调色指示条 |
| `Error` | `show-error` | 指示条变红(`SystemFillColorCritical`,167ms) |
| `Paused` | `show-paused` | 指示条变黄(`SystemFillColorCaution`,167ms) |
| `Indeterminate` | `is-indeterminate` | 40%/60% 双指示条 2s 往复,轨道隐藏 |
| `IndeterminateError` | `is-indeterminate` + `show-error` | 红色满宽指示条 + 进入时 0.75s 一次性脉冲 |
| `IndeterminatePaused` | `is-indeterminate` + `show-paused` | 黄色满宽指示条 + 进入时 0.75s 一次性脉冲 |

不确定态动画对照源 Storyboard(ProgressBar.xaml `Indeterminate` 状态):指示条一(40% 宽)0→1.5s 从 `-100%` 滑至 `300%`(KeySpline `0.4,0,0.6,1`)、1.5→2s 端点保持;指示条二(60% 宽)0→0.75s 原地、0.75→2s 滑至 `166.7%`;整体 2s 无限循环。

## 无障碍

- 根元素 `role="progressbar"`;确定态输出 `aria-valuemin` / `aria-valuemax` / `aria-valuenow`。
- 不确定态不输出任何取值属性(WAI-ARIA:进度未知时不报值)。
- 非交互控件(源 `IsTabStop=false`),不进入 Tab 序、无焦点环;配合表单控件使用时由调用方补充可访问名称(`aria-label` 等经 attrs 透传)。

## 与 WinUI 的差异

1. **主题资源 token 缺失**:ProgressBar 的主题资源在 `controls/dev/ProgressBar/ProgressBar_themeresources.xaml`(不在 generic.xaml),theme.css 未生成对应 token。组件以局部 `--wui-progressbar-*` 变量按源快照取值:Foreground = `AccentFillColorDefaultBrush`(浅 = `SystemAccentColorDark1`、深 = `SystemAccentColorLight2`,经 theme-hooks.css 系统色钩子,未定义时回退站点约定色);轨道 = `ControlStrongStrokeColorDefault`(XAML 源值 #72000000 / #8BFFFFFF 为 AARRGGBB 字节序,CSS 等值 #00000072 / #ffffff8b);暂停 = `SystemFillColorCaution`(#9D5D00 / #FCE100);错误 = `SystemFillColorCritical`(#C42B1C / #FF99A4)。深色覆盖用 scoped 裸祖先写法(`html[data-theme='dark'] .wui-progressbar`,同 InfoBar 约定:特异性 (0,3,0) 压过浅色基线且保持 scoping)。HighContrast 字典(1px 边框等)未实现。
2. **值变化动效**:源在 `Updating → Determinate` 等转换里用 `RepositionThemeAnimation` 让指示条从旧位置滑到新位置;Web 以 240ms 宽度过渡(`--wui-duration-normal` + `--wui-easing-standard`)近似,且只挂在确定态族(determinate/error/paused)——进入/退出不确定态的几何与可见性变化为即时置值,与源状态 Setter 行为一致(轨道隐藏、指示条宽度归 0、往复指示条出现均不播过渡);源在 `Indeterminate → Determinate` 转换上的轨道 167ms `FadeInThemeAnimation` 未实现(即时恢复)。拖动实时更新时的宽度过渡观感与源相近。
3. **状态脉冲**:源 `IndeterminateError/Paused` 的 0.75s Storyboard 含两个同 KeyTime 的样条帧(扫至右端后立即回落再归位),CSS 以近似关键帧(22.2%/22.3%)复刻;进入状态的重复触发用 `:key` 重建元素强制重播。
4. **裁剪细节**:源的 `TemplateSettings.ClipRect` 会把裁剪区再内缩一个 `padding`(源实现细节);Web 直接在内容盒上 `overflow: hidden` 裁剪,默认 `padding=0` 下两者一致,非零 padding 时可见区略有差异。
5. **非零 padding 下的轨道宽度**:源模板轨道 `Width` 绑定控件整体宽度(而非内容宽);Web 轨道取内容盒宽度(与指示条同一坐标系),默认 padding 下无差异。
6. **`prefers-reduced-motion`**:不确定态改为静态满宽指示条(等同暂停观感);WinUI 无此降级行为。
7. **仅水平方向、固定 3px 高**:源通过 `MinHeight`/模板约束高度,组件固定 3px;需要更高视觉高度时可在使用方覆写内部类。
8. **无 token 的源尺寸常量**(组件内按源值实现):`ProgressBarMinHeight=3`、`ProgressBarTrackHeight=1`、`CornerRadius=1.5`、`TrackCornerRadius=0.5`。

## 在 WinUI 中的典型场景(对照官方示例)

- 不确定态:`<ProgressBar IsIndeterminate="True" Width="130" />`,配 `ShowError` / `ShowPaused` 切换状态(官方示例的 Running/Paused/Error 单选组)
- 确定态:`<ProgressBar Value="{...}" />` 配 0-100 调值控件(官方示例为 NumberBox)
- 相关控件:ProgressRing(阻塞式加载指示)
