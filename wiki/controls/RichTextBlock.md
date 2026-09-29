# RichTextBlock

在线示例:[/#/richtextblock](/#/richtextblock)

## 概述

RichTextBlock 是 WinUI 中功能最完整的**只读富文本展示控件**:相比 TextBlock,它支持对文本的任意片段施加字符与段落格式——可以对局部文字应用 `Bold`/`Italic`/`Underline`,插入 `Hyperlink` 行内链接,还能用链接容器(RichTextBlock + RichTextBlockOverflow)实现高级页面排版。它不是模板控件(没有 ControlTemplate 与视觉状态树),内容按 XAML **文档模型**组织:`Blocks` 集合容纳 `Paragraph`,`Paragraph` 内容纳 `Run`/`Span`/`Hyperlink` 等行内元素。

本组件是 WinUI RichTextBlock 的 Web 复刻,默认观感对照 `generic.xaml` 的 `BaseRichTextBlockStyle`(14px / SemiBold / Wrap),容器渲染为带 WinUI 排版默认值的 `div`。

官方文档:

- [RichTextBlock - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.richtextblock)
- [Guidelines(文本控件指南)](https://learn.microsoft.com/windows/apps/design/controls/text-controls)

## 组件方案:slot 承载的文档模型

XAML 文档模型在 Vue 里以「容器 + 子组件」的 slot 方案落地:RichTextBlock 的默认 slot 承载段落子组件,段落 slot 承载行内子组件,与 `Blocks`/`Inline` 两级结构一一对应。子组件位于 `src/components/richtext/` 目录(名称加 `RichText` 前缀以满足组件命名规范并避免与 `HyperlinkButton` 混淆):

| XAML 文档模型 | 组件 | 渲染 | 层级 |
| --- | --- | --- | --- |
| `Paragraph`(Blocks 集合项) | `RichTextParagraph` | `<p>` | 块级 |
| `Run` | `RichTextRun` | `<span>` | 行内 |
| `Bold` / `Italic` / `Underline` | `RichTextBold` / `RichTextItalic` / `RichTextUnderline` | `<strong>` / `<em>` / `<u>` | 行内 |
| `Span` | `RichTextSpan` | `<span>` | 行内容器 |
| `Hyperlink` | `RichTextHyperlink` | `<a>`(有 navigateUri)或 `role="link"` span | 行内 |
| `<LineBreak />` | `RichTextLineBreak` | `<br>` | 行内 |

字体属性(字号/字重/字色)从容器的 props 出发,经 CSS 继承自然级联到段落与行内元素——与 XAML 的 `TextElement` 属性继承语义一致;行内组件的显式 props 覆盖继承值。

## RichTextBlock 容器属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fontSize` | `number \| string` | `14` | 字号;数字按 px(`BaseRichTextBlockStyle`) |
| `fontWeight` | `string \| number` | `SemiBold`(600) | 字重;`BodyRichTextBlockStyle` 观感传 `Normal` |
| `fontFamily` | `string` | `XamlAutoFontFamily` 占位 | 字体族;原样作为 CSS font-family |
| `foreground` | `string` | 主题前景 token | 前景色;任意 CSS 颜色或 `--wui-*` 变量 |
| `textAlignment` | `'Left' \| 'Center' \| 'Right' \| 'Justify' \| 'DetectFromContent' \| 'Start' \| 'End'` | `Left` | 容器级文本对齐 |
| `textWrapping` | `'NoWrap' \| 'Wrap' \| 'WrapWholeWords'` | `Wrap` | 换行模式(`BaseRichTextBlockStyle` 为 Wrap) |
| `lineHeight` | `number \| string` | CSS normal | 容器级行高;段落可用 Paragraph 的 `lineHeight` 覆写 |
| `isTextSelectionEnabled` | `boolean` | `true` | 是否允许选择文本(富文本默认可选择) |
| `maxHeight` | `number \| string` | 不限 | 容器高度上限(溢出简化的载体,见下文) |
| `overflowBehavior` | `'Visible' \| 'Scroll' \| 'Clip'` | `Clip` | 超高内容的处理:滚动 / 裁剪 / 溢出显示 |

## 子组件属性

**RichTextParagraph**(段落):`textIndent`(首行缩进)、`lineHeight`(行高)、`margin`(段后间距,WinUI `Paragraph.Margin` 的单值近似)、`textAlignment`(段内对齐,覆写容器)。WinUI 段落默认 `Margin=0`,连续段落紧贴,段间距需显式给。

**RichTextRun**(行内片段):`text`(文本,slot 优先)、`fontWeight`、`fontStyle`、`fontSize`、`fontFamily`、`foreground`、`textDecorations`(`'None' | 'Underline' | 'Strikethrough'`)、`highlight`(高亮底色,对应 `TextHighlighter`)、`characterSpacing`(XAML 单位 1/1000 em)。

**RichTextSpan**(行内容器):与 Run 相同的格式属性,施加到 slot 内的一组行内元素。

**RichTextHyperlink**(行内链接):`navigateUri`(为空时仅触发 click 不导航)、`target`、`underline`(默认 `true`,内联 Hyperlink 默认带下划线)、`foreground`(默认主题强调色)。

**RichTextBold / RichTextItalic / RichTextUnderline / RichTextLineBreak**:无属性,slot 承载文字。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click`(仅 RichTextHyperlink) | `MouseEvent \| KeyboardEvent` | 点击行内链接;`navigateUri` 有值时默认导航,处理器内 `event.preventDefault()` 可拦截;无 `navigateUri` 时键盘 Enter/Space 同样触发 |

容器本身是展示控件,不派发业务事件;文本选择/复制为浏览器原生行为。

## 基础用法

```vue
<script setup lang="ts">
import WuiRichTextBlock from '@/components/RichTextBlock.vue'
import WuiRichTextParagraph from '@/components/richtext/RichTextParagraph.vue'
import WuiRichTextRun from '@/components/richtext/RichTextRun.vue'
import WuiRichTextHyperlink from '@/components/richtext/RichTextHyperlink.vue'
</script>

<template>
  <!-- 最简:一个段落 -->
  <WuiRichTextBlock>
    <WuiRichTextParagraph>我是一个 RichTextBlock。</WuiRichTextParagraph>
  </WuiRichTextBlock>

  <!-- 富文本文档:段落排版 + 行内格式 + 链接 + 高亮 -->
  <WuiRichTextBlock font-weight="Normal" text-alignment="Justify" :line-height="22">
    <WuiRichTextParagraph :text-indent="28" :margin="12">
      RichTextBlock 提供<WuiRichTextRun font-style="Italic" font-weight="Bold">格式化文本</WuiRichTextRun>、
      <WuiRichTextHyperlink navigate-uri="https://learn.microsoft.com" target="_blank">超链接</WuiRichTextHyperlink>
      等富内容,关键词可<WuiRichTextRun highlight="#FFFF00">高亮</WuiRichTextRun>。
    </WuiRichTextParagraph>
    <WuiRichTextParagraph :margin="12">
      也可以用 <WuiRichTextRun text-decorations="Strikethrough">删除线</WuiRichTextRun>、
      <WuiRichTextRun :character-spacing="50">加宽字距</WuiRichTextRun> 等字符格式。
    </WuiRichTextParagraph>
  </WuiRichTextBlock>

  <!-- 溢出简化:限高 + 容器内滚动 -->
  <WuiRichTextBlock :max-height="120" overflow-behavior="Scroll">
    <WuiRichTextParagraph>很长很长的内容……</WuiRichTextParagraph>
  </WuiRichTextBlock>
</template>
```

## 溢出模型(简化声明)

WinUI 的 RichTextBlock 支持内置溢出模型:把 `RichTextBlock.OverflowContentTarget` 指向 `RichTextBlockOverflow` 元素,装不下的内容会自动「流」到下一个容器,多级链接可实现多栏排版与分页(官方示例三)。这依赖排版引擎对「逐行测量 + 跨容器续排」的支持,**Web 排版模型不提供该能力**,因此本站按以下方式简化:

- 容器提供 `maxHeight` + `overflowBehavior`(`Scroll` 单容器内滚动 / `Clip` 裁剪 / `Visible` 溢出显示),覆盖「内容超出可视区域」的常见诉求;
- 多栏观感可用 CSS 多栏(`columns`)近似——示例页「示例 4」即用 `columns: 3` 复刻官方三栏排版,但这是静态多栏,**不是**溢出链接(内容不会被裁掉挪去下一容器,超出部分按 CSS 溢出处理);
- 未提供 `RichTextBlockOverflow` 组件:Web 侧没有可复刻的测量/续排语义,做壳组件只会造成「能分页」的错觉。

## 与 TextBlock 的分工

| | TextBlock | RichTextBlock |
| --- | --- | --- |
| 内容模型 | 单一字符串(`text`),slot 只能混排原生行内标签 | 文档模型:Paragraph(块)+ Run/Hyperlink 等(行内) |
| 格式粒度 | 整段一套格式 | 段落级(缩进/行高/对齐)+ 字符级(粗/斜/下划线/字色/高亮/字距) |
| 行为 | 换行、截断、行数限制 | 换行、对齐、行内链接事件、溢出滚动 |
| 开销 | 极低(一个 div) | 低(div + 语义化段落/行内元素) |
| 适用 | 标题、说明、单格式文本 | 富文本文档、多段落文章、带链接/高亮的内容 |

选型经验:一段文字一套格式用 TextBlock;需要在**段落内部**混排格式、插链接或组织多段落文档时用 RichTextBlock。两者都不处理编辑(可编辑富文本对应 WinUI `RichEditBox`,暂未收录)。

## 与 WinUI 的差异

1. **文档模型为 slot 方案**:XAML 以对象集合(`Blocks`/`Inlines`)组织内容,本组件以子组件组合 + CSS 继承等价表达;`Blocks`/`Inlines` 的程序化 API(代码构建文档树)不适用,需动态文档时用 `v-for` 渲染子组件。
2. **溢出/分页简化**:见「溢出模型(简化声明)」节;`OverflowContentTarget`/`RichTextBlockOverflow`/`RichTextColumn` 未实现。
3. **默认字重取 `BaseRichTextBlockStyle`(SemiBold)**:generic.xaml 只为 RichTextBlock 定义了键控样式(`BaseRichTextBlockStyle`:14px/SemiBold/Wrap;`BodyRichTextBlockStyle` 覆写为 Normal),本组件以键控样式为默认;官方 API 文档另称默认 FontSize 为 15 DIP,与源码样式表略有出入,取 14 与样式表一致。要 Body 观感传 `font-weight="Normal"`。
4. **TextAlignment**:映射为 CSS `text-align`;`DetectFromContent` 退化为 `start`(浏览器按书写方向对齐),不读取内容判定方向。
5. **TextHighlighter → `highlight`**:以 `background-color` + `box-decoration-break: clone` 近似逐行高亮;WinUI 的 `TextHighlighter.RoundingRadius`(高亮圆角)与按字符区间(`TextRange`)编程定位未实现,Web 侧高亮跟随内容(把文字包进 `RichTextRun` 即可)。示例页沿用官方示例的 Colors.Yellow/Red/Blue 等值色(红/蓝底上为黑字,与官方观感一致,可读性欠佳时请自选柔和底色)。
6. **LineStackingStrategy 未实现**:WinUI 的行堆叠策略(MaxHeight/BlockLineHeight 等)简化为 CSS `line-height`;`TextLineBounds`、`OpticalMarginAlignment`(TrimSideBearings 侧边距修整)同样无 CSS 对应,容器默认即浏览器排版。
7. **字体占位**:`XamlAutoFontFamily` 回退为浏览器默认字体(近似 Segoe UI 可由应用层映射字体栈);`SemiLight`(350)等非整百字重需要可变字体支持。
8. **超链接行为超集**:WinUI 的 `Click` 处理器无法取消 `NavigateUri` 导航(经系统 Launcher 打开浏览器);Web 侧在 `@click` 内 `event.preventDefault()` 可拦截。无 `navigateUri` 时渲染 `role="link"` 的行内 span(键盘 Enter/Space 激活),对应 WinUI 只处理 Click 的用法。
9. **命名**:子组件加 `RichText` 前缀(如 `RichTextParagraph`)以满足 Vue 组件多词命名规范,并避免行内 `RichTextHyperlink` 与控件 `HyperlinkButton` 混淆;XAML 名称对照见上文组件方案表。

## 相关链接

- 演示页源码:[demo/pages/RichTextBlockPage.vue](../../demo/pages/RichTextBlockPage.vue)
- 组件源码:[src/components/RichTextBlock.vue](../../src/components/RichTextBlock.vue)(子组件:[src/components/richtext/](../../src/components/richtext/))
- 同类控件:TextBlock(单格式轻量文本)、HyperlinkButton(独立链接按钮)、TextBox(可编辑文本)
