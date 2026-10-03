# HyperlinkButton

> 在线示例:[/#/hyperlinkbutton](/#/hyperlinkbutton) —— 路由 `/#/hyperlinkbutton`

## 概述

HyperlinkButton 控件呈现为文本超链接。用户单击时,若设置了 `NavigateUri` 则在默认浏览器中打开该页面;也可以只处理 `Click` 事件,通常用于应用内导航。

本组件按 WinUI 默认模板复刻视觉(权威 = `controls/dev/CommonStyles/HyperlinkButton_themeresources.xaml`,dxaml `generic.xaml` 的 `TargetType="HyperlinkButton"` 旧 Style 为 UWP 遗留):底色四态取 `SubtleFillColor*`(Normal/Disabled 透明,PointerOver = `SubtleFillColorSecondary`、Pressed = `SubtleFillColorTertiary`,均半透明叠加),边框四态透明,前景四态取 `AccentTextFillColorPrimary/Secondary/Tertiary/Disabled`(Web 前景仍沿用遗留的变灰映射,见差异节),文字默认带下划线(源 `HyperlinkUnderlineVisible = True`,状态切换不下划线消失),焦点态显示系统焦点视觉。颜色、字号、内边距均取自 `--wui-*` 主题 token,随 `html[data-theme]` 明暗切换。

Web 语义映射:`navigateUri` 有值时渲染 `<a>`(浏览器默认导航),为空时渲染 `<button>`(仅触发 `click`、不导航);`target="_blank"` 时自动附加 `rel="noopener noreferrer"` 保证外链安全。

官方文档:

- [HyperlinkButton - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.hyperlinkbutton)
- [Hyperlinks - Guidelines](https://learn.microsoft.com/windows/apps/design/controls/hyperlinks)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | `string` | `''` | 链接文字内容;复杂内容(图标 + 文字组合)用默认插槽放置,插槽内容优先 |
| `navigateUri` | `string` | `''` | 目标 URI(对应 WinUI `NavigateUri`);有值渲染 `<a>` 并默认导航,为空渲染 `<button>` 仅触发 `click` 不跳转 |
| `target` | `string` | `''`(当前页) | HTML `target` 打开方式(如 `_blank`);为 `_blank` 时自动附加 `rel="noopener noreferrer"`,调用方传入的自定义 `rel` 会被合并保留 |
| `disabled` | `boolean` | `false` | 是否禁用(对应 WinUI `IsEnabled`);禁用后不触发 `click`、不导航 |

其余 HTML 属性(`class`、`style`、`aria-*` 等)经 `v-bind="$attrs"` 透传至根元素(`<a>` 或 `<button>`)。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent)` | 被点击时触发:鼠标单击,或聚焦后按 Enter 键(`<button>` 分支另支持 Space)。`navigateUri` 有值时浏览器默认导航继续,除非在处理器中调用 `event.preventDefault()`;`navigateUri` 为空时永不导航 |

导航语义(与 WinUI 对应):

- `navigateUri` 有值:渲染 `<a href>`,点击后浏览器默认导航,行为等价 WinUI 打开 `NavigateUri`;在 `@click` 处理器内对事件对象调用 `preventDefault()` 可拦截导航(用于「先校验再跳转」「只埋点不跳转」等场景)。
- `navigateUri` 为空:渲染 `<button>`,等价 WinUI 中只订阅 `Click`、不设 `NavigateUri` 的用法,点击仅触发事件。
- `disabled` 为真:不触发 `click`、不导航(`<a>` 分支以 `aria-disabled="true"` + `tabindex="-1"` + 点击拦截模拟禁用)。

模板中监听写法:`<WuiHyperlinkButton @click="onHyperlinkButtonClick" />`。

## 基础用法

```vue
<script setup lang="ts">
import WuiHyperlinkButton from '@/components/HyperlinkButton.vue'

function onHyperlinkButtonClick(event: MouseEvent): void {
  console.log('clicked')
}
</script>

<template>
  <!-- 导航到 URI(target=_blank 自动携带 rel="noopener noreferrer") -->
  <WuiHyperlinkButton
    content="Microsoft home page"
    navigate-uri="https://www.microsoft.com"
    target="_blank"
  />

  <!-- 只处理 Click,不导航(渲染为 button 语义) -->
  <WuiHyperlinkButton content="Go to ToggleButton" @click="onHyperlinkButtonClick" />

  <!-- 插槽内容:图标 + 文字组合 -->
  <WuiHyperlinkButton navigate-uri="https://learn.microsoft.com" target="_blank">
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="…" fill="currentColor" /></svg>
    <span>设计指南</span>
  </WuiHyperlinkButton>

  <!-- 拦截默认导航:处理器内 preventDefault -->
  <WuiHyperlinkButton content="先校验再跳转" navigate-uri="https://example.com" @click="onBeforeNavigate" />
</template>
```

> 示例页「用法」代码块按 WinUI 习惯以 PascalCase 展示属性名(`Content`、`NavigateUri` 等),
> 实际书写请使用上表的 camelCase 属性名(模板中亦可用 kebab-case 如 `navigate-uri`)。

## 与 WinUI 的差异说明

对照 generic.xaml(浅色/深色 ThemeDictionaries)与 theme.css token 的取值映射:

| WinUI 取值 | Web 实现 | 说明 |
| --- | --- | --- |
| `HyperlinkButtonForeground` = `AccentTextFillColorPrimaryBrush` | `--wui-hyperlink-button-foreground`(强调色) | 无差异 |
| `HyperlinkButtonForegroundPointerOver` = `AccentTextFillColorSecondaryBrush` | `--wui-hyperlink-button-foreground-pointer-over`(浅 #00000099 / 深 #ffffff99) | **已知遗留差异(MR15 未订正)**:Web 仍取 generic.xaml 的 `SystemControlPageTextBaseMedium`(变灰),权威应为强调色 light3/dark3 变体 |
| `HyperlinkButtonForegroundPressed` = `AccentTextFillColorTertiaryBrush` | `--wui-hyperlink-button-foreground-pressed` | 同上,Web 取遗留 `SystemControlHighlightBaseMediumLow` |
| `HyperlinkButtonForegroundDisabled` = `AccentTextFillColorDisabledBrush`(#5C/5DFFFFFF 级) | `--wui-hyperlink-button-foreground-disabled` | 同上,Web 取遗留 `SystemControlDisabledBaseMediumLow` |
| `HyperlinkButtonBackground` = `SubtleFillColorTransparentBrush`;PointerOver = `SubtleFillColorSecondary`(#09000000 / #0FFFFFFF,XAML #AARRGGBB → CSS #00000009 / #FFFFFF0F);Pressed = `SubtleFillColorTertiary`(#06000000 / #0AFFFFFF → #00000006 / #FFFFFF0A);Disabled = `SubtleFillColorTransparent`(源 L9-12 / L24-27) | `--wui-hyperlink-button-background*` | MR15 已订正:四态不再全透明,hover/pressed 呈半透明叠加,经 83ms BrushTransition 过渡(注意 XAML ARGB 与 CSS RGBA 位序换算) |
| 各状态 `HyperlinkButtonBorderBrush` 均透明 | `--wui-hyperlink-button-border*`(transparent) | 无差异 |
| `HyperlinkButtonBorderThemeThickness` = 1(源 L17/L32) | `border: none` | **已知遗留差异(MR15 未订正)**:遗留 generic.xaml 为 0;因边框四态透明、无视觉差异,Web 保留 0 以避免盒尺寸偏移,已登记 |
| `HyperlinkButtonPadding` = 0,6,0,7 | `padding: 6px 0 7px` | 无差异 |
| `HyperlinkUnderlineVisible` = `True`(默认下划线) | `text-decoration: underline` 常驻 | 无差异:悬停/按下仅变色,下划线不消失 |
| `NavigateUri`(经系统 Launcher 打开默认浏览器) | 原生 `<a href>` 导航 | 打开方式交给浏览器;`target="_blank"` 额外强制 `rel="noopener noreferrer"`(WinUI 无此概念,Web 安全必需) |
| 只设 `Click`、不设 `NavigateUri` | 渲染 `<button>` 语义 | 原生获得 Space/Enter 激活与禁用语义 |
| Click 与导航并行(导航不可被 Click 处理器取消) | 处理器内 `event.preventDefault()` 可取消导航 | Web 特有能力,行为为 Web 超集 |
| `IsEnabled` = false | `<button>` 原生 `disabled`;`<a>` 分支 `aria-disabled="true"` + `tabindex="-1"` + 点击拦截 | `<a>` 无原生禁用属性,以等价组合模拟 |
| `ContentControlThemeFontFamily` | `--wui-content-control-theme-font-family`(XamlAutoFontFamily 占位) | 浏览器回退到默认字体,应用层可按需映射 |
| `ControlContentThemeFontSize` = 14px | `--wui-control-content-theme-font-size` | 无差异 |
| 视觉状态切换(DiscreteObjectKeyFrame) | 无过渡动画,即时切换 | 与源一致(源状态切换本身无 Duration) |
| 系统焦点视觉(双环,`FocusVisualMargin` = -3) | `:focus-visible` 单环 `outline: 2px solid --wui-system-control-focus-visual-primary`,`outline-offset: 1px` | 双环简化为单环;-3 外扩近似为 1px 偏移 |
| 光标 | 启用时 `cursor: pointer`、禁用 `default` | WinUI 超链接悬停为手型光标(区别于普通 Button 的箭头) |

## 相关链接

- 在线示例:`/#/hyperlinkbutton`
- 演示页源码:`demo/pages/HyperlinkButtonPage.vue`
- 相关控件:Button、ToggleButton、RepeatButton、AppBarButton
