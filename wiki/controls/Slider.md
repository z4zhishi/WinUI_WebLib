# Slider

> 在线示例:[/#/slider](/#/slider) · 演示页源码:[demo/pages/SliderPage.vue](../../demo/pages/SliderPage.vue)

## 概述

Slider(滑块)让用户通过沿轨道移动拇指(Thumb)从一段取值范围中选择数值。当你希望用户设置**有定义的连续值**(如音量、亮度)或**一段离散档位值**(如屏幕分辨率设置)时使用。

组件按 WinUI 3 生效层 `controls/dev/CommonStyles/Slider_themeresources.xaml` 的 ControlTemplate 复刻:轨道(`--wui-control-strong-fill-color-default`,三态同键)+ 已选段(强调色,`--wui-accent-fill-color-default/secondary/tertiary/disabled`)+ 拇指(18×18,`--wui-accent-fill-color-*` 内圆 + `--wui-control-solid-fill-color-default` 外圈底 + `--wui-control-elevation-border` 渐变环)+ 可选刻度(`--wui-control-strong-fill-color-default` / `--wui-control-fill-color-input-active`);PointerOver / Pressed / Disabled / Focus 状态色已由 PL9 重定向到 Fluent 画刷族(本地 `--wui-slider-*` 现均为 Fluent token 别名,明暗自动跟随,总览见 [_brushes.md](./_brushes.md))。

官方文档:

- [Slider - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.slider)
- [Slider 设计指南](https://learn.microsoft.com/windows/apps/design/controls/slider)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | `number`(`v-model:value`) | `0` | 当前值,双向绑定;拖动/键盘时实时更新 |
| `minimum` | `number` | `0` | 最小值 |
| `maximum` | `number` | `100` | 最大值(小于 `minimum` 时收敛为 `minimum`,与源实现一致) |
| `stepFrequency` | `number` | `1` | 步长;`<= 0` 时按 `1` 处理 |
| `snapsTo` | `'StepValues' \| 'Ticks' \| 'None'` | `'StepValues'` | 吸附方式:`StepValues` 按 `stepFrequency` 吸附,`Ticks` 按 `tickFrequency` 吸附;`'None'` 为 Web 扩展(仅钳制到范围,连续取值) |
| `tickPlacement` | `'None' \| 'TopLeft' \| 'BottomRight' \| 'Outside' \| 'Inline'` | `'None'` | 刻度位置(上方 / 下方 / 上下两侧 / 轨道上) |
| `tickFrequency` | `number` | `0` | 刻度间距;`<= 0` 不绘制刻度 |
| `header` | `string` | `''` | 标题文本(WinUI `Header`) |
| `disabled` | `boolean` | `false` | 禁用(Web 侧对应 WinUI `Control.IsEnabled`) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `valueChanged` | `{ oldValue: number; newValue: number }` | 值变化时触发;**拖动过程中持续触发**(与 WinUI `ValueChanged` 一致),取值范围/吸附方式变更导致值被钳制重算时同样触发 |
| `update:value` | `(value: number) => void` | `v-model:value` 双向绑定事件 |

模板中监听写法:`@value-changed="onValueChanged"`。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import Slider from '@/components/Slider.vue'

const value = ref(50)

function onValueChanged(e: { oldValue: number; newValue: number }): void {
  console.log(`值从 ${e.oldValue} 变为 ${e.newValue}`)
}
</script>

<template>
  <Slider v-model:value="value" header="音量" @value-changed="onValueChanged" />

  <!-- 刻度 + 刻度吸附 -->
  <Slider v-model:value="value" tick-placement="Outside" :tick-frequency="20" snaps-to="Ticks" />
</template>
```

## 交互行为

- **拖动**:按住轨道任意位置或拇指拖动,值实时更新并连续触发 `valueChanged`;按住期间保持 Pressed 视觉(拇指放大 + Pressed 色),即使指针移出控件(与 WinUI 指针捕获一致)。
- **方向键**:`←`/`↓` 减一步、`→`/`↑` 加一步,步长为 `stepFrequency`(`snapsTo="Ticks"` 时为 `tickFrequency`);`Home`/`End` 跳到最小/最大值。
- **PointerOver**:轨道变浅(`SliderTrackFillPointerOver`)、内圆变色并放大至 14px(12px 内圆 scale 1.1667,250ms `cubic-bezier(0,0,0,1)`);按下时内圆缩至 10px(scale 0.8333)。
- **Focus**:键盘聚焦(`:focus-visible`)时拇指外围显示 accent 色轮廓。

## 与 WinUI 的差异

1. **`snapsTo` 增加 `'None'`**:WinUI `SliderSnapsTo` 枚举只有 `StepValues` / `Ticks`;Web 版追加 `'None'` 表示不吸附、连续取值(此时方向键仍按 `stepFrequency` 步进)。
2. **拇指缩放**:内圆缩放为源行为(现行 `Slider_themeresources.xaml` L208-253 的 `SliderInnerThumb` CompositeTransform):PointerOver 1.167、Pressed **0.71**(源 storyboard 字面量,MR1/A2 订正,不再做 12px 基准换算)、键盘 Focus 1.167 @167ms(MR1/A2 补);进入 PointerOver / Pressed 为 250ms `cubic-bezier(0,0,0,1)`(`ControlNormalAnimationDuration` + `ControlFastOutSlowInKeySpline`),Focus 与回 Normal 为 167ms 同曲线(`ControlFastAnimationDuration`),终值与源一致。
3. **轨道高度**:源快照(generic.xaml 三个主题字典 Default/HighContrast/Light)的 `SliderTrackThemeHeight` 均为 2,实现取 4px 系 Windows 11 观感选择。
4. **焦点视觉**:WinUI 为控件外围系统焦点框(双线),Web 实现为拇指外围 2px accent 轮廓(`--wui-system-accent-color`,未定义时回退 `--wui-hyperlink-foreground-theme`)。
5. **方向键步长**:WinUI 方向键按 `SmallChange`、翻页键按 `LargeChange` 步进;本实现方向键固定按 `stepFrequency`/`tickFrequency` 步进,未暴露 `SmallChange`/`LargeChange`。
6. **仅水平方向**:WinUI 支持 `Orientation="Vertical"`,本实现暂未提供垂直模式。
7. **状态切换动效**:与源一致——视觉状态颜色为瞬时切换(`DiscreteObjectKeyFrame KeyTime=0`,无过渡);唯一的动画是内圆缩放(见差异 2:进入 PointerOver/Pressed 250ms、回 Normal 167ms,曲线一律 `cubic-bezier(0,0,0,1)`)。
8. **无 token 的源尺寸常量**(在组件内按源值实现):`SliderHorizontalHeight=32`(容器高)、拇指 **18×18** / 内圆 12px、`SliderOutsideTickBarThemeHeight=4` + 刻度与轨道间距 4、`SliderTopHeaderMargin=0,0,0,4`、刻度线宽 1px。拇指外圈描边由原实色近似 `ControlStrokeColorDefault` 改为权威 `ControlElevationBorderBrush` 渐变环(PL9),本地 `--wui-slider-*` 已全部改为 Fluent token 别名。
9. **色来源**:PL9 已把 Slider 各态重定向到 Fluent 画刷族(轨道 `--wui-control-strong-fill-color-default/disabled`、已选段/内圆/拇指 `--wui-accent-fill-color-*`、外圈底 `--wui-control-solid-fill-color-default`、标题前景 `--wui-text-fill-color-primary/disabled`),删除组件内 `html[data-theme='dark']` 硬编码块;总览见 [_brushes.md](./_brushes.md)。

## 在 WinUI 中的典型场景(对照官方示例)

- 简单滑块:`<Slider Width="200" />`(默认 0–100、步长 1)
- 范围与步长:`Minimum` / `Maximum` / `StepFrequency`
- 刻度:`TickPlacement="Outside"` + `TickFrequency` + `SnapsTo="Ticks"`
- 垂直方向:Web 版暂不支持(见差异 6)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
