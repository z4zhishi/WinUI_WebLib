# Iconography(图标体系)

在线示例:[/#/iconography](/#/iconography) · 演示页源码:[demo/pages/IconographyPage.vue](../../demo/pages/IconographyPage.vue)

## 概述

图标是一种可视化设计语言,能在 UI 中以视觉隐喻快速传达概念、动作或状态。Windows 11 的系统图标使用 **Segoe Fluent Icons** 字体(Windows 10 为 **Segoe MDL2 Assets**);官方规定所有字形均为 **monoline** 风格(单根 1epx 描边),并遵循三条美学原则:**Minimal**(只保留传达概念所必需的细节)、**Harmonious**(基于简单的几何形体)、**Evolved**(使用易懂的现代隐喻)。

本页是 📖 指南页:本库**没有**名为 `Iconography` 的控件——WinUI 里它是设计概念 + 字形浏览器页。图标控件本体是 [IconElement 家族](IconElement.md)的四个实现,组件均已入库、示例页直接复用展示:

| 控件 | 内容来源 | 颜色能力 | 适用场景 | 组件源码 |
| --- | --- | --- | --- | --- |
| FontIcon | 图标字体字形(Segoe 码点,1533 个) | 单色(继承 `currentColor`) | 任意字形;枚举未覆盖时的默认选择 | [src/components/FontIcon.vue](../../src/components/FontIcon.vue) |
| SymbolIcon | `Symbol` 枚举成员(197 项) | 单色(继承 `currentColor`) | 常用语义图标;书写最短 | [src/components/SymbolIcon.vue](../../src/components/SymbolIcon.vue) |
| BitmapIcon | 位图 / SVG / data URL 资源 | 单色(`showAsMonochrome`)或全彩 | 品牌图、彩色插画等资源类图标 | [src/components/BitmapIcon.vue](../../src/components/BitmapIcon.vue) |
| PathIcon | XAML 路径迷你语言(矢量几何) | 单色(`fill = currentColor`) | 自定义形状;少量静态矢量 | [src/components/PathIcon.vue](../../src/components/PathIcon.vue) |

四个组件的属性、事件与逐控件差异见 [IconElement.md](IconElement.md);本页只讲「体系」:字形从哪来、怎么选型、怎么按官方规范使用。

官方文档(catalog `Iconography` 条目 docs 链接):

- [Iconography in Windows(设计指南)](https://learn.microsoft.com/windows/apps/design/signature-experiences/iconography)
- [Segoe Fluent Icons font(字体与码点表)](https://learn.microsoft.com/windows/apps/design/style/segoe-fluent-icons-font)
- [Segoe MDL2 Assets font(Win10 字体)](https://learn.microsoft.com/windows/apps/design/style/segoe-ui-symbol-font)

官方示例源(只读):`CK/WinUI-Gallery/WinUIGallery/Samples/Iconography/`——`IconographyPage.xaml` 为「AutoSuggestBox 搜索 + 字形网格 + 右侧详情面板」布局,`IconsData.json` 为全量字形表。

## Segoe Fluent Icons 字形总览

示例页的字形浏览器对照官方页布局:

- **数据**:1533 条码点 + 官方建议名称,来自官方 `IconsData.json` 的生成物 [demo/data/fontIconGlyphs.ts](../../demo/data/fontIconGlyphs.ts)(再生成:`node docs/temp/build-icon-glyphs.mjs`);
- **搜索**:按名称或码点模糊匹配(官方 JSON 还带语义 Tags,生成物未收录,故不支持标签检索——见差异说明);
- **分页**:每页 96 条(官方用 ItemsView 虚拟化滚动,Web 侧以分页等价,避免一次渲染 1533 个节点);
- **详情面板**:大预览(48px)+ 名称 + 文本字形(`\uE713`)+ 代码字形(`0xE713`)+ FontIcon / SymbolIcon XAML 片段——对照官方 SidePanel;该字形属于 `Symbol` 枚举(197 项)时同时给出等价的 `<SymbolIcon>` 写法;
- **点击行为**:选中字形(联动尺寸 / 颜色演示与详情面板)并复制 `\uXXXX` 写法。

基础用法(码点直接写字符,或经 `String.fromCodePoint` 换算):

```vue
<script setup lang="ts">
import WuiFontIcon from '@/components/FontIcon.vue'

// \uE713 = Settings(官方建议名),详情面板可查每个码点的名称
const glyph = '\uE713'
</script>

<template>
  <WuiFontIcon :glyph="glyph" :font-size="20" />
</template>
```

**弃用区**:官方将 `E0–E5` 前缀的码点标记为 legacy 并弃用;字形表仍收录(可搜索),新代码避免使用。

**字体依赖**:本库按 R1 裁决不加载网络字体,字体栈 `--wui-symbol-theme-font-family` = `"Segoe Fluent Icons", "Segoe MDL2 Assets"`。字形能否渲染取决于本机安装了哪款字体;Windows 11 自带 Fluent,Windows 10 只有 MDL2(部分 Fluent 新增字形会显示 tofu)。

## 使用规范(对照官方指南)

### 尺寸

> "Each font glyph is designed so that the footprint of the icon area is a square em. An icon with a 16-epx font size is the equivalent of a 16x16-epx icon."
> —— 字号的数值就是可预期的图标边长。

> "For optimal appearance, use these specific sizes: 16, 20, 24, 32, 40, 48, and 64. Deviating from these font sizes could lead to less crisp or blurry outcomes."

即:**FontIcon / SymbolIcon 的 `font-size` 直接对应图标尺寸,只取 16 / 20 / 24 / 32 / 40 / 48 / 64 七档**。示例页的尺寸阶梯逐档对照,加框档位为参数面板当前字号。

### 颜色

> "All glyphs in Segoe Fluent Icons are drawn in a monoline style. That means they're created through a single stroke of 1 epx."

monoline 单描边决定了系统图标**天然单色**:颜色完全由前景色决定(Web 侧缺省继承 `currentColor`),选型建议:

- 常规界面:默认前景(`--wui-application-foreground-theme`);
- 强调 / 可交互:系统强调色(`--wui-system-accent-color`);
- 次要层级:次级前景(`--wui-application-secondary-foreground-theme`)。

全彩是 `BitmapIcon`(资源类)的能力——官方示例用多色 `Slices.png` 配合 `ShowAsMonochrome` 演示「彩色资源 ↔ 单色化」的切换;系统图标本身不引入多色。

### 层次与修饰

官方给出两种组合手法:

1. **修饰(modifier)**:底图(base)占满整个图标脚手架,修饰元放在其中一个**下象限**改变含义(官方例子:文件 + 上箭头 = 上传);
2. **分层(layering)**:同位叠加两枚字形。官方推荐用它表达**同一图标的另一状态**(如激活 / 选中),并给出心形示例:

```xaml
<Grid>
    <FontIcon FontFamily="Segoe Fluent Icons" Glyph="&#xEB52;" Foreground="#C72335" />
    <FontIcon FontFamily="Segoe Fluent Icons" Glyph="&#xEB51;" />
</Grid>
```

EB52(HeartFill)作强调色填充层、EB51(Heart)作前景轮廓层,叠加即得「描边心形」。所有字形同宽同高、左原点一致,因此直接叠放即可对齐;示例页用两枚绝对定位的 `WuiFontIcon` 复刻,开关可对照单层 / 双层效果。

### 其他官方注意点

| 规范项 | 官方要求(摘译) | Web 侧落点 |
| --- | --- | --- |
| 推荐尺寸 | 16 / 20 / 24 / 32 / 40 / 48 / 64 px;字号即方形 em 脚手架 | `font-size` 1:1 对应 |
| 颜色 | monoline 单描边、单色,经 Foreground 取色 | `foreground` 属性,缺省继承 `currentColor` |
| 层次 | 修饰元放右下象限;layering 表达同图标的状态 | 两枚 FontIcon 绝对定位叠加 |
| 字体 | Fluent 取代 MDL2 成推荐字体(Win11) | `--wui-symbol-theme-font-family` 双字体栈 |
| 弃用区 | `E0–E5` 前缀码点 legacy 弃用 | 表仍收录可查,新代码避免 |
| 行内混排 | 图标字体**不用于**与正文行内混排(旧式「渐进披露箭头」技巧不再适用) | 行内符号请用文本字符或 emoji |
| RTL | 方向性字形提供镜像变体(阿拉伯语等 RTL 语言) | 按需选码点;组件不做自动镜像 |
| 本地化 | 注意符号的文化含义,按使用语境验证图标选择 | — |

## 与 WinUI 的差异说明

1. **无 `Iconography` 控件**:与官方 Gallery 一致,这是指南页;示例页复用已入库的 FontIcon / SymbolIcon / BitmapIcon / PathIcon 四个组件展示,不新增组件。
2. **官方硬编码色值换主题 token**:官方分层示例用 `#C72335`(红)填充心形;Web 侧改用 `var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))` 跟随主题(无对应生成 token,以 accent 表达「强调填充」语义),已在示例页内注明。
3. **Tags 检索未实现**:官方 `IconsData.json` 每条带语义 Tags(如 `"menu"`、`"hamburger"`),官方搜索按 code/name/tags 三路匹配;生成物 `fontIconGlyphs.ts` 仅收录 code + name(1533 条),示例页搜索只按名称/码点。如需标签检索,扩一下生成脚本即可。
4. **滚动换分页**:官方字形网格是 ItemsView + UniformGridLayout 虚拟化滚动;Web 侧按已入库的 IconElement 页方案以「每页 96 条 + 搜索重置页码」等价承载。
5. **详情面板只给 Web 侧代码**:官方 SidePanel 给 XAML 与 C# 两份片段;Web 侧给 FontIcon / SymbolIcon 的 XAML 对照 + 本库组件用法(`\uXXXX` 即 Vue 侧字面量写法)。
6. **字形渲染依赖本机字体**:WinUI 应用随系统自带图标字体;Web 侧按 R1 裁决不加载网络字体,未装 Segoe Fluent Icons 的环境(部分非 Windows 平台)显示 tofu,示例页文案已提示。

## 相关链接

- 在线示例:[/#/iconography](/#/iconography) · 演示页源码:[demo/pages/IconographyPage.vue](../../demo/pages/IconographyPage.vue)
- 图标控件本体:[IconElement(图标族)](IconElement.md)(FontIcon / SymbolIcon / BitmapIcon / PathIcon 逐控件属性表)
- 字形数据:[demo/data/fontIconGlyphs.ts](../../demo/data/fontIconGlyphs.ts)(生成物)· Symbol 枚举映射:[src/utils/symbolIcons.ts](../../src/utils/symbolIcons.ts)
- 动态图标:[AnimatedIcon](AnimatedIcon.md);图标几何与 [PathIcon](IconElement.md) 共用路径语言的部分见 [Geometry](Geometry.md)
