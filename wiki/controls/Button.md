# Button

> 在线示例:[/#/button](/#/button) —— 路由 `/#/button`

## 概述

Button 控件提供 `click` 事件,用于响应来自触摸、鼠标、键盘、触笔等输入设备的用户操作;按钮内容可以是文本或图像等各种类型,也可以重新设置样式获得全新外观。

本组件按 WinUI 3 生效层(`controls/dev/CommonStyles/Button_themeresources.xaml`)复刻视觉:Normal / PointerOver / Pressed / Disabled 四态即时切换,焦点态显示系统焦点视觉;状态色已重定向到 Fluent 画刷族(PL3):底色 `ControlFillColorDefault/Secondary/Tertiary/Disabled`,前景 `TextFillColorPrimary/Secondary/Disabled`,描边 Normal/PointerOver 为渐变 `ControlElevationBorderBrush`(PL5 token `--wui-control-elevation-border`,Pressed/Disabled 为纯色 `ControlStrokeColorDefault`);字号、圆角、内边距取自 `--wui-*` 主题 token,随 `html[data-theme]` 明暗切换。画刷族总览见 [_brushes.md](./_brushes.md)。

官方文档:

- [Button - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.button)
- [Buttons - Guidelines](https://learn.microsoft.com/windows/apps/design/controls/buttons)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | `string` | `''` | 按钮文本内容;复杂内容(图标、图片等)用默认插槽放置,插槽内容优先 |
| `disabled` | `boolean` | `false` | 是否禁用(对应 WinUI `IsEnabled`) |
| `background` | `string`(CSS 颜色) | 主题 `ButtonBackground` | 背景色;悬停/按下/禁用态仍按 WinUI 状态规则切换为主题状态色 |
| `foreground` | `string`(CSS 颜色) | 主题 `ButtonForeground` | 前景(文字)色 |
| `borderBrush` | `string`(CSS 颜色) | 主题 `ButtonBorderBrush`(透明) | 边框色;边框厚度固定 2px(`ButtonBorderThemeThickness`) |
| `fontSize` | `number \| string` | `14`(`ControlContentThemeFontSize`) | 字号,单位 px |
| `fontWeight` | `number \| string` | `Normal`(400) | 字重;接受 WinUI `FontWeight` 命名(如 `SemiBold`)、数字(如 `600`)或 CSS 关键字 |
| `cornerRadius` | `number \| string` | `4` | 圆角半径,单位 px |
| `reveal` | `boolean` | `false` | Reveal 揭示光照(对照 `ButtonRevealStyle`,generic.xaml L15824):开启后状态色切换到 `--wui-button-reveal-*` token,并叠加跟随指针的光照(底板光 + 2px 边框光环,悬停点亮、离开熄灭)。源中该样式为非默认 keyed 样式,故 opt-in 默认关闭;机制与降级语义见 [_reveal.md](./_reveal.md) |

其余 HTML 属性(`class`、`style`、`aria-*` 等)经 `v-bind="$attrs"` 透传至根 `<button>` 元素。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent)` | 按钮被点击时触发:鼠标左键单击,或按钮聚焦后按 Space / Enter 键(原生 `<button>` 行为) |

模板中监听写法:`<WuiButton @click="onButtonClick" />`。

## 基础用法

```vue
<script setup lang="ts">
import WuiButton from '@/components/Button.vue'

function onButtonClick(): void {
  console.log('clicked')
}
</script>

<template>
  <!-- 文本内容(props 为 camelCase,模板中亦可用 kebab-case 如 corner-radius) -->
  <WuiButton content="标准 XAML 按钮" @click="onButtonClick" />

  <!-- 插槽内容:图标 + 文本 -->
  <WuiButton @click="onButtonClick">
    <span aria-hidden="true">★</span>
    添加收藏
  </WuiButton>

  <!-- 禁用与外观覆盖 -->
  <WuiButton content="不可用" disabled background="royalblue" corner-radius="12" />
</template>
```

> 示例页「用法」代码块按 WinUI 习惯以 PascalCase 展示属性名(`Content`、`FontSize` 等),
> 实际书写请使用上表的 camelCase 属性名。

## 与 WinUI 的差异说明

对照 WinUI 3 生效层(`controls/dev/CommonStyles/Button_themeresources.xaml`,逐行复核)与 theme.css Fluent token 的取值映射:

| WinUI 取值 | Web 实现 | 说明 |
| --- | --- | --- |
| `ButtonBackground`(Normal/PointerOver/Pressed/Disabled)= `ControlFillColorDefault/Secondary/Tertiary/DisabledBrush`(源 L32-35) | `--wui-control-fill-color-default/secondary/tertiary/disabled` | PL3 重定向(此前 legacy `--wui-button-background*` `#00000033` 且 hover 与静息同值,已消除) |
| `ButtonForeground`(Normal/PointerOver/Pressed/Disabled)= `TextFillColorPrimary/Primary/Secondary/DisabledBrush` | `--wui-text-fill-color-primary/secondary/disabled` | PL3 重定向 |
| `ButtonBorderBrush`(Normal/PointerOver)= `ControlElevationBorderBrush`(渐变) | `--wui-control-elevation-border`(PL5 mask 环) | PL5 落地;Pressed/Disabled = `ControlStrokeColorDefaultBrush` 纯色 `--wui-control-stroke-color-default` |
| `ButtonBorderThemeThickness` = 2 | `border: 2px solid` | 无差异 |
| `ButtonPadding` = 8,4,8,5 | `padding: 4px 8px 5px` | 无差异 |
| `ContentControlThemeFontFamily` | `--wui-content-control-theme-font-family`(XamlAutoFontFamily 占位) | 浏览器回退到默认字体,应用层可按需映射 |
| `ControlContentThemeFontSize` = 14px | `--wui-control-content-theme-font-size` | 无差异 |
| 默认圆角 | `--wui-hyperlink-focus-rect-corner-radius`(4px) | 源 Button 样式无 CornerRadius(默认 0);WinUI 3 运行时 `ControlCornerRadius` = 4,以同值 4px 变量承载 |
| `IsEnabled` | `disabled` 属性 | Web 原生禁用语义(同时获得 `aria-disabled` 与不可聚焦行为) |
| FontWeight 枚举 | CSS `font-weight` 数值 | `Normal`→400、`SemiBold`→600、`Bold`→700 等,组件内建映射表 |
| 视觉状态切换(DiscreteObjectKeyFrame + PointerUp/DownThemeAnimation) | 无过渡动画,即时切换 | 与源一致(源状态切换本身无 Duration);按压主题动画为平台内部实现,未复刻 |
| 系统焦点视觉(双环:FocusVisualPrimary 内环 + FocusVisualSecondary 外环,`FocusVisualMargin` = -3) | `:focus-visible` 双环:primary 外环 `outline: 2px solid var(--wui-system-control-focus-visual-primary)`(`outline-offset: 1px`)+ secondary 内环 `box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary)` | 按双环实现(颜色/厚度与源一致,见 `src/styles/focus-visual.css`);-3 外扩近似为 1px 偏移 |
| 覆盖 `Background` 后悬停仍变主题状态色(VSM 动画覆盖本地值) | 行为一致 | 覆盖色经 CSS 变量仅作用于 Normal 态规则 |
| 光标 | `cursor: default` | WinUI 按钮悬停保持箭头,不用 pointer |

## 相关链接

- 在线示例:`/#/button`
- 演示页源码:`demo/pages/ButtonPage.vue`
- Reveal 材料:[_reveal.md](./_reveal.md)(`reveal` prop 的机制、降级与常量口径)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
- 相关控件:ToggleButton、RepeatButton、HyperlinkButton
