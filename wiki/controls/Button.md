# Button

> 在线示例:[/#/button](/#/button) —— 路由 `/#/button`

## 概述

Button 控件提供 `click` 事件,用于响应来自触摸、鼠标、键盘、触笔等输入设备的用户操作;按钮内容可以是文本或图像等各种类型,也可以重新设置样式获得全新外观。

本组件按 WinUI 默认模板(generic.xaml 中 `TargetType="Button"` 的 Style/ControlTemplate)复刻视觉:Normal / PointerOver / Pressed / Disabled 四态即时切换,焦点态显示系统焦点视觉,颜色、字号、圆角、内边距均取自 `--wui-*` 主题 token,随 `html[data-theme]` 明暗切换。

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

对照 generic.xaml(浅色/深色 ThemeDictionaries)与 theme.css token 的取值映射:

| WinUI 取值 | Web 实现 | 说明 |
| --- | --- | --- |
| `ButtonBackground` / `ButtonForeground` / `ButtonBorderBrush`(各状态) | `--wui-button-*` token 一一对应 | 无差异 |
| `ButtonBorderThemeThickness` = 2 | `border: 2px solid` | 无差异 |
| `ButtonPadding` = 8,4,8,5 | `padding: 4px 8px 5px` | 无差异 |
| `ContentControlThemeFontFamily` | `--wui-content-control-theme-font-family`(XamlAutoFontFamily 占位) | 浏览器回退到默认字体,应用层可按需映射 |
| `ControlContentThemeFontSize` = 14px | `--wui-control-content-theme-font-size` | 无差异 |
| 默认圆角 | `--wui-hyperlink-focus-rect-corner-radius`(4px) | generic.xaml 的 Button 样式无 CornerRadius(默认 0);WinUI 3 运行时 `ControlCornerRadius` = 4 无同名 token,取最近似圆角 token |
| `IsEnabled` | `disabled` 属性 | Web 原生禁用语义(同时获得 `aria-disabled` 与不可聚焦行为) |
| FontWeight 枚举 | CSS `font-weight` 数值 | `Normal`→400、`SemiBold`→600、`Bold`→700 等,组件内建映射表 |
| 视觉状态切换(DiscreteObjectKeyFrame + PointerUp/DownThemeAnimation) | 无过渡动画,即时切换 | 与源一致(源状态切换本身无 Duration);按压主题动画为平台内部实现,未复刻 |
| 系统焦点视觉(双环:FocusVisualPrimary 内环 + FocusVisualSecondary 外环,`FocusVisualMargin` = -3) | `:focus-visible` 单环 `outline: 2px solid --wui-system-control-focus-visual-primary`,`outline-offset: 1px` | 双环简化为单环;-3 外扩近似为 1px 偏移 |
| 覆盖 `Background` 后悬停仍变主题状态色(VSM 动画覆盖本地值) | 行为一致 | 覆盖色经 CSS 变量仅作用于 Normal 态规则 |
| 光标 | `cursor: default` | WinUI 按钮悬停保持箭头,不用 pointer |

## 相关链接

- 在线示例:`/#/button`
- 演示页源码:`demo/pages/ButtonPage.vue`
- 相关控件:ToggleButton、RepeatButton、HyperlinkButton(后续阶段)
