# Spacing

> 在线示例:[/#/spacing](/#/spacing)

## 概述

深思熟虑的间距设计能增强可读性与流程感(Thoughtful spacing design enhances readability and flow)。一致尺寸的间距与栏距把体验在语义上分组为独立组件;这些取值同时映射到圆角逻辑,共同营造连贯、可用的布局。WinUI 的最佳实践是使用 **4px 网格**:任何间距与尺寸都应是 4 的倍数——取值规整、易于缩放。

官方资料:

- [Spacing - 设计指南(Microsoft Learn)](https://learn.microsoft.com/windows/apps/design/style/spacing)
- [Content design basics(Microsoft Learn)](https://learn.microsoft.com/windows/apps/design/basics/content-basics)
- [WinUI Gallery Spacing 示例](https://github.com/microsoft/WinUI-Gallery)(本站示例页对照 `Samples/Spacing/SpacingPage.xaml`)

## 4px 网格与圆角

官方建议间距与尺寸全部落在 4px 网格上(4 / 8 / 12 / 16 / 24 / 36 / 48 是最常用档位),并指出「这些取值映射到我们的圆角逻辑」。`theme.css` 中唯一的圆角 token 恰为 4px,与网格同源:

| token | 值 | 对应 WinUI 资源 |
| --- | --- | --- |
| `--wui-hyperlink-focus-rect-corner-radius` | `4px` | `HyperlinkFocusRectCornerRadius`(XAML 侧 `ControlCornerRadius=4` 的控件圆角为发行版资源,不在本 generic.xaml 提取范围内) |

## 间距阶梯(官方档位与用途)

官方 Spacing 示例页给出七个常用档位与各自用途(单位 epx,与 CSS px 1:1):

| 取值 | 用途(官方说明) |
| --- | --- |
| 4 epx | 紧凑尺寸下的间距(Spacing used for compact sizing) |
| 8 epx | 控件之间、控件与标签之间(Spacing between UI controls, control + label) |
| 12 epx | 控件与标头、界面与边缘文字、文字段落之间(Spacing between control + header, surface and edge text, text sections) |
| 16 epx | 列表样式、卡片的内边距(Padding used in list styles, cards) |
| 24 epx | 内容区块之间(Spacing between content sections) |
| 36 epx | 页面内边距(Padding on pages) |
| 48 epx | 带标题的页面区块之间(Spacing between page sections with title) |

## 布局用法

官方示例以「卡片布局」与「表单(对话框)布局」展示档位的实际落位,常用组合:

- 页面内边距 **36**,区块间距 **24**;
- 卡片内边距 **16**,卡片间距 **12**;
- 控件与标头 **12**,控件之间 / 控件与标签 **8**。

```xml
<!-- WinUI 原生:StackPanel 以 Spacing 统一子元素间距(4px 网格取值) -->
<StackPanel Spacing="12">
  <TextBox Header="First Name:" />
  <TextBox Header="Last Name:" />
</StackPanel>
```

Web(本库)等价写法——WinUI 的 `StackPanel.Spacing` / `Margin` 对应 CSS 的 `gap` / `margin` / `padding`:

```html
<div style="display: flex; flex-direction: column; gap: 12px; padding: 16px;">
  <WuiTextBox header="First Name:" />
  <WuiTextBox header="Last Name:" />
</div>
```

## 密度与间距

官方 [Compact Sizing](./CompactSizing.md) 在标准/紧凑两页间切换时,同时把 `StackPanel` 的 `Spacing` 从 16 收紧到 8——**紧凑密度不缩字号,只收高度与间距**。间距相关的密度资源对照(完整表见 [CompactSizing](./CompactSizing.md)):

| 资源键 | 标准值 | 紧凑值 |
| --- | --- | --- |
| `TextControlThemeMinHeight` | 32 | 24 |
| `TextControlThemePadding` | 10,5,6,6 | 2,2,6,1 |
| `ListViewItemMinHeight` | 40 | 32 |
| `TreeViewItemMinHeight` | 28 | 24 |
| `NavigationViewItemOnLeftMinHeight` | 36 | 32 |
| `ControlContentThemeFontSize` | 14 | 14(不变) |

## 与 WinUI 的差异说明

- **无间距主题 token**:XAML 主题字典不含 Thickness(间距)类主题资源,提取器明确跳过 Thickness(`docs/temp/token-inventory.md`),因此 `theme.css` 没有间距 token;间距取值来自官方设计指南约定与各控件资源的 Thickness 常量(源码注释逐条标注),Web 侧直接用 CSS `gap` / `margin` / `padding` 表达。
- **单位 1:1**:XAML epx 与 CSS px 按 1:1 换算,官方档位数值可直接使用。
- **布局示例**:官方页为两张静态设计图(Cards/Dialog),本站示例页以实时渲染复刻并用徽标标注档位取值。

---

演示页源码:[demo/pages/SpacingPage.vue](../../demo/pages/SpacingPage.vue)
