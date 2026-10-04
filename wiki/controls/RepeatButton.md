# RepeatButton

> 在线示例:[/#/repeatbutton](/#/repeatbutton) —— 路由 `/#/repeatbutton`

## 概述

RepeatButton 控件与标准 Button 类似,区别在于用户按住按钮期间 `click` 事件会连续触发。重复节奏:按下立即触发 1 次(源控件固定 `ClickMode = Press`),经过 `delay` 毫秒后触发第 2 次,之后每 `interval` 毫秒触发一次,直至松开、指针移出、失焦或禁用。

本组件按 WinUI 3 生效层(`controls/dev/CommonStyles/RepeatButton_themeresources.xaml`)复刻视觉:Normal / PointerOver / Pressed / Disabled 四态即时切换,焦点态显示系统焦点视觉;状态色已重定向 Fluent 画刷族(PL3):底色 `ControlFillColorDefault/Secondary/Tertiary/Disabled`,前景 `TextFillColorPrimary/Secondary/Disabled`,描边 Normal/PointerOver 为渐变 `ControlElevationBorderBrush`(PL5 token `--wui-control-elevation-border`)、Pressed/Disabled 为 `ControlStrokeColorDefault` 纯色;字号、圆角、内边距取自 `--wui-*` 主题 token,随 `html[data-theme]` 明暗切换(总览见 [_brushes.md](./_brushes.md))。重复计时逻辑对照 `RepeatButton_Partial.cpp` 的 `StartTimer` / `TickCallback` / `UpdateRepeatState` 实现。

官方文档:

- [RepeatButton - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.primitives.repeatbutton)
- [Buttons - Guidelines](https://learn.microsoft.com/windows/apps/design/controls/buttons)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | `string` | `''` | 按钮文本内容;复杂内容(图标、图片等)用默认插槽放置,插槽内容优先 |
| `delay` | `number` | `500` | 按住后开始重复前的延迟,单位 ms(源默认值:`DependencyProperty.cpp` 中 `RepeatButton_Delay = 500`);传入 < 0 时钳制为 0(源码对负值抛错) |
| `interval` | `number` | `33` | 重复触发间隔,单位 ms(源默认值:`DependencyProperty.cpp` 中 `RepeatButton_Interval = 33`);传入 <= 0 时钳制为 1(源码对非正值抛错);按住期间修改间隔,下一次滴答即生效(与源 `TickCallback` 一致) |
| `disabled` | `boolean` | `false` | 是否禁用(对应 WinUI `IsEnabled`);置为 true 立即停止重复 |
| `reveal` | `boolean` | `false` | Reveal 揭示光照(对照 `RepeatButtonRevealStyle`,generic.xaml L15895):开启后状态色切换到 `--wui-repeat-button-reveal-*` token,并叠加跟随指针的光照(底板光 + 2px 边框光环);与按住重复的指针处理器共存。源中该样式为非默认 keyed 样式,故 opt-in 默认关闭;见 [_reveal.md](./_reveal.md) |

其余 HTML 属性(`class`、`style`、`aria-*` 等)经 `v-bind="$attrs"` 透传至根 `<button>` 元素。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent)` | 按住期间连续触发:指针按下立即触发 1 次,经 `delay` ms 后再触发,之后每 `interval` ms 一次;松开 / 指针移出 / 失焦 / 禁用后停止。按住移出再移回会恢复重复(与 WinUI `UpdateRepeatState` 一致)。键盘:Space 按下立即触发并按住重复,Space 抬起停止;Enter 单次触发(按住随系统按键重复逐次触发)。参数为按下时的 PointerEvent(指针路径)或键盘触发的合成 MouseEvent(Space / Enter) |

模板中监听写法:`<WuiRepeatButton @click="onButtonClick" />`。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiRepeatButton from '@/components/RepeatButton.vue'

const clicks = ref(0)
</script>

<template>
  <!-- 文本内容(props 为 camelCase,模板中亦可用 kebab-case 如 delay / interval) -->
  <WuiRepeatButton content="Click and hold" @click="clicks++" />

  <!-- 自定义节奏:小延迟 + 小间隔,长按快速连续触发 -->
  <WuiRepeatButton content="快速重复" :delay="100" :interval="50" @click="clicks++" />

  <!-- 插槽内容:图标 + 文本 -->
  <WuiRepeatButton aria-label="增大音量" @click="clicks++">
    <span aria-hidden="true">🔊</span>
    长按增大音量
  </WuiRepeatButton>

  <!-- 禁用 -->
  <WuiRepeatButton content="不可用" disabled />
</template>
```

> 示例页「用法」代码块按 WinUI 习惯以 PascalCase 展示属性名(`Content`、`Delay`、`Interval` 等),
> 实际书写请使用上表的 camelCase 属性名。

## 与 WinUI 的差异说明

对照 WinUI 3 生效层(`RepeatButton_themeresources.xaml` L14-17/L62-65,逐行复核)、`RepeatButton_Partial.cpp` 与 theme.css Fluent token 的取值映射:

| WinUI 取值 | Web 实现 | 说明 |
| --- | --- | --- |
| `RepeatButtonBackground`(四态)= `ControlFillColorDefault/Secondary/Tertiary/DisabledBrush` | `--wui-control-fill-color-default/secondary/tertiary/disabled` | PL3 重定向(此前 legacy `--wui-repeat-button-*`,hover 与静息同值已消除) |
| `RepeatButtonForeground`(四态)= `TextFillColorPrimary/Primary/Secondary/DisabledBrush` | `--wui-text-fill-color-primary/secondary/disabled` | PL3 重定向 |
| `RepeatButtonBorderBrush`(Normal/PointerOver)= `ControlElevationBorderBrush`(渐变) | `--wui-control-elevation-border`(PL5 mask 环) | PL5 落地;Pressed/Disabled = `ControlStrokeColorDefaultBrush` 纯色 |
| `RepeatButtonBorderThemeThickness` = 2 | `border: 2px solid` | 无差异 |
| `ButtonPadding` = 8,4,8,5(样式复用 Button 的 StaticResource) | `padding: 4px 8px 5px` | 无差异 |
| `ControlContentThemeFontSize` = 14px | `--wui-control-content-theme-font-size` | 无差异 |
| 默认圆角 | `--wui-hyperlink-focus-rect-corner-radius`(4px) | 源 RepeatButton 样式无 CornerRadius(默认 0);WinUI 3 运行时 `ControlCornerRadius` = 4,以同值 4px 变量承载 |
| `Delay` 默认 500ms、`Interval` 默认 33ms(`DependencyProperty.cpp` 硬编码) | 组件默认值一致 | 部分社区文档称 Interval 默认 250ms,以本仓库源码为准(33ms) |
| `Delay`/`Interval` 依赖属性变更回调对负值/非正值抛 `E_FAIL` | `delay < 0` 钳制为 0、`interval <= 0` 钳制为 1 | Web 侧不抛错,取合法最近值 |
| `TimelineTimer`(先以 Delay 启动,滴答时把间隔改写为 Interval) | `setTimeout` 链:首个定时器延迟 delay,后续每次滴答重读 interval | 行为等价;按住期间修改 interval 下一次滴答生效 |
| `ClickMode`(源在 `Initialize()` 固定为 `Press`,不可通过公开 API 改回 Release) | 固定按下触发语义 | 与源一致;不暴露 ClickMode 属性 |
| 指针按住移出后停止、移回恢复(`IsPressed && IsPointerOver`) | `pointerleave` 停止、`pointerenter`(主键仍按住)恢复 | 触摸指针默认隐式捕获会吞掉移出事件,组件主动 `releasePointerCapture` 使移出即停 |
| 键盘:Space 按下开始重复、抬起停止(`m_keyboardCausingRepeat`);Enter 单击 | Space 按下触发并按住重复,抬起停止;Enter 沿 keydown 触发(按住随 OS 键重复逐次触发) | 两者均对 keydown `preventDefault`,抑制浏览器补发的原生 click(Space 原生 click 在 keyup 触发),避免与组件发出的 click 重复计数 |
| 失焦停止重复(`OnLostFocus`) | `focusout` 停止重复 | 无差异 |
| `IsEnabled` | `disabled` 属性 | Web 原生禁用语义;变化时立即停止重复(源 `OnIsEnabledChanged` 同款) |
| 系统焦点视觉(双环,`FocusVisualMargin` = -3) | `:focus-visible` 单环 `outline: 2px solid --wui-system-control-focus-visual-primary`,`outline-offset: 1px` | 双环简化为单环;-3 外扩近似为 1px 偏移 |
| 视觉状态切换(DiscreteObjectKeyFrame) | 无过渡动画,即时切换 | 与源一致(源状态切换本身无 Duration) |
| click 路由事件参数(`RoutedEventArgs`) | `(event: MouseEvent)` | 重复滴答沿用按下时的 PointerEvent 作为参数;键盘 Space / Enter 触发传合成 MouseEvent |

## 相关链接

- 在线示例:`/#/repeatbutton`
- 演示页源码:`demo/pages/RepeatButtonPage.vue`
- Reveal 材料:[_reveal.md](./_reveal.md)(`reveal` prop 的机制、降级与常量口径)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
- 相关控件:Button、ToggleButton、HyperlinkButton
