# TextBlock

在线示例:[/#/textblock](/#/textblock)

## 概述

TextBlock 是 WinUI 中显示**只读文本**的主要控件,通常通过设置 `Text` 属性显示一个简单字符串,也可以用 `Run` 元素显示一组字符串并为每段应用不同格式。它不是模板控件(没有 ControlTemplate 与视觉状态树),渲染开销极低,适合展示标题、说明文字等静态内容。

本组件是 WinUI TextBlock 的 Web 复刻:渲染为一个带 WinUI 排版默认值的 `div`(默认 14px、字重 400、前景 `--wui-application-foreground-theme`),行内混排通过默认 slot 实现(对应 XAML 的 `Run`/`Bold`/`Italic` 等内联元素)。

官方文档:

- [TextBlock - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.textblock)
- [Guidelines(文本控件指南)](https://learn.microsoft.com/windows/apps/design/controls/text-controls)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | `''` | 显示的文本;提供默认 slot 时以 slot 内容代替 |
| `fontSize` | `number \| string` | `14` | 字号;数字按 px,字符串原样作为 CSS 长度 |
| `fontWeight` | `string \| number` | `Normal`(400) | 字重;WinUI 名称(Thin…ExtraBlack)或 1–950 数值 |
| `fontFamily` | `string` | `XamlAutoFontFamily` 占位 | 字体族;原样作为 CSS font-family |
| `fontStyle` | `'Normal' \| 'Italic' \| 'Oblique'` | `Normal` | 字形 |
| `textWrapping` | `'NoWrap' \| 'Wrap' \| 'WrapWholeWords'` | `NoWrap` | 换行模式(WinUI 属性默认 NoWrap;`BaseTextBlockStyle` 覆写为 Wrap) |
| `textTrimming` | `'None' \| 'CharacterEllipsis' \| 'WordEllipsis'` | `None` | 截断省略模式 |
| `maxLines` | `number` | 不限 | 最大行数 |
| `isTextSelectionEnabled` | `boolean` | `false` | 是否允许选择文本(选择/复制为浏览器原生行为) |
| `foreground` | `string` | 主题前景 token | 前景色;任意 CSS 颜色或 `--wui-*` 变量 |

## 事件

TextBlock 为只读文本控件,**无业务事件**;`isTextSelectionEnabled` 开启时保留浏览器原生选择、复制行为。

## 基础用法

```vue
<script setup lang="ts">
import WuiTextBlock from '@/components/TextBlock.vue'
</script>

<template>
  <!-- 最简:一行文本 -->
  <WuiTextBlock text="我是一个 TextBlock。" />

  <!-- 常用排版组合 -->
  <WuiTextBlock
    text="我超级兴奋能来到这里!"
    :font-size="24"
    font-style="Italic"
    text-wrapping="WrapWholeWords"
    foreground="var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))"
  />

  <!-- 行数限制 + 截断省略 -->
  <WuiTextBlock :text="longText" :max-lines="2" text-trimming="CharacterEllipsis" />

  <!-- 行内混排(默认 slot,对应 XAML 内联元素) -->
  <WuiTextBlock>可以混排 <b>加粗</b>、<i>斜体</i>、<u>下划线</u>。</WuiTextBlock>

  <!-- 允许选择复制 -->
  <WuiTextBlock text="这段文字可以选中复制。" is-text-selection-enabled />
</template>
```

## WinUI 排版样式对照

WinUI 没有给 TextBlock 定义默认 Style 与 ControlTemplate,而是提供一组命名排版样式(见 `CK/WinUI-Reference` 的 `generic.xaml`)。用本组件复刻这些样式时的对应写法:

| XAML 样式 | FontSize | FontWeight | 组件写法 |
| --- | --- | --- | --- |
| `HeaderTextBlockStyle` | 46 | Light(300) | `:font-size="46" font-weight="Light"` |
| `SubheaderTextBlockStyle` | 34 | Light(300) | `:font-size="34" font-weight="Light"` |
| `TitleTextBlockStyle` | 24 | SemiLight(350) | `:font-size="24" font-weight="SemiLight"` |
| `SubtitleTextBlockStyle` | 20 | Normal(400) | `:font-size="20"` |
| `BodyTextBlockStyle` | 14 | Normal(400) | 默认 |
| `CaptionTextBlockStyle` | 12 | Normal(400) | `:font-size="12"` |
| `BaseTextBlockStyle` | 14 | SemiBold(600) | `font-weight="SemiBold"`(其 `TextWrapping="Wrap"`、`TextTrimming="None"` 与上表一行组合) |

## 与 WinUI 的差异

1. **TextTrimming 只在单行时生效**:`text-trimming` 映射为 CSS `text-overflow: ellipsis`,它只作用于不换行的单行文本;多行(Wrap)场景下需配合 `max-lines` 才能看到省略号。WinUI 中只要控件宽度受限,末行即可截断,无需 MaxLines。
2. **CharacterEllipsis 与 WordEllipsis 表现相同**:CSS `text-overflow` 只有一种省略行为(截断处补 `…`),无法表达 WordEllipsis「按词边界截断」的语义,两种取值渲染一致。
3. **maxLines 用 `-webkit-line-clamp` 实现**:文本被截断时末行总会显示省略号,即使 `text-trimming="None"`;WinUI 的 MaxLines 是硬裁切(无省略号)。
4. **Wrap / WrapWholeWords 用 `overflow-wrap` 近似**:`Wrap` → `overflow-wrap: break-word`(单词超宽时允许断词),`WrapWholeWords` → `overflow-wrap: normal`(仅词间断行,超长单词溢出容器),与 UWP 两者的语义方向一致,但断词的具体位置由浏览器排版引擎决定。
5. **字体占位**:`XamlAutoFontFamily` 是 WinUI「系统默认字体」占位,浏览器无法识别,回退为浏览器默认字体(近似 Segoe UI 效果可由应用层映射字体栈);`SemiLight`(350)等非整百字重需要可变字体支持,否则浏览器就近取值。
6. **无视觉状态**:TextBlock 无 ControlTemplate、不响应 PointerOver/Pressed/Focus,组件因此也没有交互态样式;`isTextSelectionEnabled=false` 时组件显式 `user-select: none`,比浏览器默认(文本可选中)更贴近 WinUI 行为。
7. **未实现的属性**:`CharacterSpacing`(官方示例用到,可经 `$attrs` 透传 `style="letter-spacing: …"` 替代)、`SelectionHighlightColor`(选择高亮色,保留浏览器默认)、`LineHeight`/`CharacterSpacing` 等细粒度排版属性暂未提供。

## 相关链接

- 演示页源码:[demo/pages/TextBlockPage.vue](../../demo/pages/TextBlockPage.vue)
- 组件源码:[src/components/TextBlock.vue](../../src/components/TextBlock.vue)
- 同类控件:TextBox(可编辑文本)、RichTextBlock(富文本)
