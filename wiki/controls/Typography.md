# Typography

> 在线示例:[/#/typography](/#/typography)

## 概述

字型为 UI 提供结构与层次(Typography design guides attention with intuitive fonts and hierarchy)。Windows 默认字体是 **Segoe UI Variable**;最佳实践是**正文用 Regular 字重、标题用 SemiBold**,最小取值为 **12px Regular / 14px SemiBold**。本页对照官方 Type ramp 九档字型阶梯,并给出 `theme.css` 字号/字体 token 与阶梯档位的对照。

官方资料:

- [Typography in Windows Apps](https://learn.microsoft.com/windows/apps/design/style/typography)
- [XAML theme resources - the XAML type ramp](https://learn.microsoft.com/windows/apps/design/style/xaml-theme-resources#the-xaml-type-ramp)
- [Typography in Windows 11](https://learn.microsoft.com/windows/apps/design/signature-experiences/typography)
- [Segoe UI Variable 字体下载](https://learn.microsoft.com/windows/apps/design/downloads/#fonts)
- [WinUI Gallery Typography 示例](https://github.com/microsoft/WinUI-Gallery)(本站示例页对照 `Samples/Typography/TypographyPage.xaml` + `TypographyTypeRamp.txt`)

## 字型阶梯(Type ramp,官方取值)

| Style | 字号/行高(epx) | 字重 | 变量字体 | XAML Style 资源 |
| --- | --- | --- | --- | --- |
| Caption | 12/16 | 400 | Small, Regular | `CaptionTextBlockStyle` |
| Body | 14/20 | 400 | Text, Regular | `BodyTextBlockStyle` |
| Body Strong | 14/20 | 600 | Text, SemiBold | `BodyStrongTextBlockStyle` |
| Body Large | 18/24 | 400 | Text, Regular | `BodyLargeTextBlockStyle` |
| Body Large Strong | 18/24 | 600 | Text, SemiBold | `BodyLargeStrongTextBlockStyle` |
| Subtitle | 20/28 | 600 | Display, SemiBold | `SubtitleTextBlockStyle` |
| Title | 28/36 | 600 | Display, SemiBold | `TitleTextBlockStyle` |
| Title Large | 40/52 | 600 | Display, SemiBold | `TitleLargeTextBlockStyle` |
| Display | 68/92 | 600 | Display, SemiBold | `DisplayTextBlockStyle` |

规律:小号文本(Caption/Body 系)用 Small/Text 变体 + Regular;Subtitle 及以上用 Display 变体 + SemiBold。epx 与 CSS px 1:1。

## theme.css 字号 token 对照

通用阶梯是 **TextBlockStyle 资源**(如 `DisplayTextBlockStyle`),不在主题字典里,因此 `theme.css`(仅提取 generic.xaml 的 ThemeDictionaries)不含 Display/Title 等阶梯字号;它收录的是**控件专用字号 token**,数值恰与阶梯档位对齐,经 `var()` 引用即可获得一致排版(18 条,浅深同值):

| token | 值 | 用途 | 最近阶梯档位 |
| --- | --- | --- | --- |
| `--wui-control-content-theme-font-size` | 14px | 全部控件正文(`ControlContentThemeFontSize`) | Body (14) |
| `--wui-content-control-font-size` | 14px | ContentControl 正文 | Body (14) |
| `--wui-tool-tip-content-theme-font-size` | 12px | ToolTip 正文 | Caption (12) |
| `--wui-key-tip-content-theme-font-size` | 12px | KeyTip 键提示 | Caption (12) |
| `--wui-mtc-media-font-size` | 12px | 媒体传输控件文本 | Caption (12) |
| `--wui-hub-section-header-theme-font-size` | 20px | Hub 分区标头 | Subtitle (20) |
| `--wui-list-view-header-item-theme-font-size` | 20px | ListView 分组头 | Subtitle (20) |
| `--wui-grid-view-header-item-theme-font-size` | 20px | GridView 分组头 | Subtitle (20) |
| `--wui-hub-header-theme-font-size` | 34px | Hub 页头 | 介于 Title 与 Title Large |
| `--wui-pivot-header-item-font-size` | 24px | Pivot 页签项 | 介于 Subtitle 与 Title |
| `--wui-hub-section-header-see-more-theme-font-size` | 14px | Hub 分区「查看更多」 | Body (14) |
| `--wui-pivot-title-font-size` | 14px | Pivot 标题 | Body (14) |
| `--wui-text-style-large-font-size` | 18.14px | `TextStyleLarge`(旧版阶梯) | ≈ Body Large (18) |
| `--wui-text-style-extra-large-font-size` | 25.5px | `TextStyleExtraLarge`(旧版阶梯) | ≈ Subtitle+ |
| `--wui-combo-box-arrow-theme-font-size` | 21px | ComboBox 下拉箭头字形 | —(图标) |
| `--wui-scroll-bar-button-arrow-icon-font-size` | 8px | 滚动条箭头字形 | —(图标) |
| `--wui-auto-suggest-box-icon-font-size` | 12px | AutoSuggestBox 查询图标字形 | —(图标) |
| `--wui-semantic-zoom-button-font-size` | 4px | SemanticZoom 分组字母(放大背景字形) | —(装饰) |

## 字重与字族

**字重规范**:正文 Regular(400)、标题 SemiBold(600);最小 12px Regular / 14px SemiBold。Web 侧直接落 `font-weight: 400 | 600`。

**字族 token**(8 条,浅深同值):

| token | 值 | 说明 |
| --- | --- | --- |
| `--wui-content-control-theme-font-family` | `'XamlAutoFontFamily'` | 占位 → Segoe UI Variable |
| `--wui-mtc-media-font-family` | `'XamlAutoFontFamily'` | 媒体传输控件字体 |
| `--wui-phone-font-family-normal` | `'Segoe UI'` | Phone 系列 Regular |
| `--wui-phone-font-family-semi-light` | `'Segoe UI'` | Phone 系列 SemiLight |
| `--wui-pivot-header-item-font-family` | `'XamlAutoFontFamily'` | Pivot 页签 |
| `--wui-pivot-title-font-family` | `'XamlAutoFontFamily'` | Pivot 标题 |
| `--wui-symbol-theme-font-family` | `'Segoe Fluent Icons', 'Segoe MDL2 Assets'` | 图标字体栈(Win11 / Win10) |
| `--wui-key-tip-font-family` | `'XamlAutoFontFamily'` | KeyTip 字体 |

## 基础用法

```xml
<!-- WinUI 原生:TextBlock 套用字型阶梯 Style 资源 -->
<TextBlock Text="Title" Style="{StaticResource TitleTextBlockStyle}" />
<TextBlock Text="Body" Style="{StaticResource BodyTextBlockStyle}" />
```

```css
/* Web:阶梯档位直接落 CSS(数值与官方 ramp 一致),控件字号用 token */
.wui-title { font-size: 28px; line-height: 36px; font-weight: 600; }   /* TitleTextBlockStyle */
.wui-body  { font-size: 14px; line-height: 20px; font-weight: 400; }   /* BodyTextBlockStyle */
.wui-tip   { font-size: var(--wui-tool-tip-content-theme-font-size); }  /* 12px,控件专用 */
```

## 与 WinUI 的差异说明

- **阶梯非主题资源**:Display/Title/…/Caption 九档是 `TextBlockStyle` 资源而非主题字典资源,`theme.css` 不含其 token;Web 侧按官方数值直接书写,或用上表控件字号 token 对齐同档位。
- **`'XamlAutoFontFamily'` 占位**:theme.css 原样保留 WinUI 的「系统默认字体」占位,浏览器回退默认字体;需要 Segoe 观感时在应用层映射为 `'Segoe UI Variable', 'Segoe UI', system-ui` 字体栈(本库约定不加载网络字体)。
- **图标字形依赖本机字体**:`--wui-symbol-theme-font-family` 需要本机安装 Segoe Fluent Icons(Win11)/ Segoe MDL2 Assets(Win10),缺失时显示空心方块(tofu),详见 [Iconography](./Iconography.md)。
- **旧版阶梯取值**:`TextStyleLarge`(18.14px)与 `TextStyleExtraLarge`(25.5px)为旧版字型阶梯残留,新代码建议使用 Text 变体系列(14/18px)。

---

演示页源码:[demo/pages/TypographyPage.vue](../../demo/pages/TypographyPage.vue)
