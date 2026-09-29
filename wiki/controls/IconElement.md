# IconElement(图标族)

> 在线示例:[/#/iconelement](/#/iconelement) · 演示页源码:[demo/pages/IconElementPage.vue](../../demo/pages/IconElementPage.vue)

## 概述

IconElement 是「用不同类型的图像作为内容」的图标控件抽象基类(WinUI 3 中不可直接实例化)。本库复刻其四个实现 —— **FontIcon**(字体字形)、**SymbolIcon**(Symbol 枚举)、**BitmapIcon**(位图)、**PathIcon**(矢量路径)。四者均为轻量、无状态、无业务事件的纯展示组件:统一接受 `foreground` 前景色(缺省继承 `currentColor`),默认对辅助技术隐藏(`aria-hidden="true"`,与 WinUI 侧 `AccessibilityView=Raw` 等价),控件语义名由宿主控件(AppBarButton、MenuFlyoutItem 等)承载,因此可以被任意控件直接内嵌。

官方文档:

- [Icon Guidelines(图标设计准则)](https://learn.microsoft.com/windows/apps/design/style/icons)
- [FontIcon - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.fonticon)
- [SymbolIcon - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.symbolicon)
- [BitmapIcon - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.bitmapicon)
- [PathIcon - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.pathicon)

## 族总览

| 控件 | 内容 | Web 渲染方式 | 组件源码 |
| --- | --- | --- | --- |
| FontIcon | 图标字体字形(`Glyph` 码点) | `<span>` + 图标字体栈 | [src/components/FontIcon.vue](../../src/components/FontIcon.vue) |
| SymbolIcon | `Symbol` 枚举成员(197 项) | `<span>` + 名称→码点映射表 | [src/components/SymbolIcon.vue](../../src/components/SymbolIcon.vue) |
| BitmapIcon | 位图 / SVG 图片 | 多色 `<img>`;单色化用 CSS mask | [src/components/BitmapIcon.vue](../../src/components/BitmapIcon.vue) |
| PathIcon | XAML 路径迷你语言 | `<svg><path>`(F0/F1 → fill-rule) | [src/components/PathIcon.vue](../../src/components/PathIcon.vue) |

> WinUI 的 IconElement 家族还有 ImageIcon 与 AnimatedIcon,本阶段不在本任务范围(见迁移计划后续波次)。

## 属性

四个组件均支持 `class` / `style` / `aria-*` 等 attrs 透传至单根元素(`inheritAttrs: false`);`aria-hidden` 写在 attrs 展开之前,调用方可覆盖。

### FontIcon

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `glyph`(必填) | `string` | — | 图标字形:单个字符或四位码点,如 `"\uE8FB"` |
| `fontSize` | `number \| string` | `20` | 字号;数字按 px(WinUI 默认字号 20,源码 `g_ClientCoreFontSize = 20.f`) |
| `fontFamily` | `string` | 图标字体栈 token | 缺省 `var(--wui-symbol-theme-font-family)` = `"Segoe Fluent Icons","Segoe MDL2 Assets"` |
| `fontWeight` | `string \| number` | `Normal`(400) | WinUI FontWeight 名(Thin…ExtraBlack)或 1–950 数值 |
| `fontStyle` | `'Normal' \| 'Italic' \| 'Oblique'` | `Normal` | 字形样式 |
| `foreground` | `string` | 继承 `currentColor` | 前景色,任意 CSS 颜色/变量 |

### SymbolIcon

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `symbol` | `SymbolValue`(197 个枚举名) | `'Emoji'` | WinUI Symbol 枚举成员名;名称→码点映射表见 [src/utils/symbolIcons.ts](../../src/utils/symbolIcons.ts)(生成物)。WinUI 缺省即 Emoji(= 57629 → 渲染 E899;源码 `icon.h` 构造器与 `DependencyProperty.cpp` GetDefaultValue 双处实证,并非「枚举首成员即缺省」) |
| `fontSize` | `number \| string` | `20` | 字号(**Web 侧扩展**,WinUI 内部固定渲染 20 且未公开此属性) |
| `foreground` | `string` | 继承 `currentColor` | 前景色 |

枚举映射的数据权威性:`Symbol` 枚举成员与顺序取自 WinUI 3 源码 idl(`enum Symbol`,首成员 `Previous = 57600`);名称→字形码点取自 `CSymbolIcon::ConvertSymbolValueToGlyph` —— WP 旧码点(E100–E2xx 区)整体重映射到 E7+ 推荐区,避免与其它字体 Unicode 撞码(如 `Accept`:枚举值 0xE10B → 渲染码点 0xE8FB)。生成脚本 `docs/temp/build-icon-glyphs.mjs` 内置断言(197 项、表覆盖完整),再生成:`node docs/temp/build-icon-glyphs.mjs`。

> 注:WinUI 3 的 Symbol 枚举**不含** `ScrollUp` / `ScrollDown` / `ScrollRight` / `ScrollLeft` 等成员(坊间文档常有混淆);以 idl 为准的 197 项全表可在示例页下拉中浏览。

### BitmapIcon

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `src`(必填) | `string` | — | 图片地址:位图 / SVG / data URL;组件自身不加载任何远程资源,取值由调用方决定 |
| `showAsMonochrome` | `boolean` | `true` | 是否单色化(WinUI `ShowAsMonochrome`,官方默认即 true);Web 侧以 CSS mask 实现 |
| `foreground` | `string` | 继承 `currentColor` | 单色化取色 |

单色化实现:遮罩(`mask-image`)取图片的 alpha 形状,颜色由 `background-color = foreground/currentColor` 提供;多色模式直接 `<img>` 直出。可先用官方示例页提示理解:多色图在 `ShowAsMonochrome=true` 时会变成一整块前景色。

### PathIcon

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `data`(必填) | `string` | — | XAML 路径迷你语言;前缀 `F0`(EvenOdd)/`F1`(Nonzero)解析为 SVG `fill-rule`,**无前缀时按 XAML 缺省取 EvenOdd**(而非 SVG 的 Nonzero);其余指令与 SVG `path d` 语法兼容、原样传递 |
| `viewBox` | `string` | `'0 0 20 20'` | SVG 坐标系;需与 `data` 的坐标范围一致(官方示例即 20×20) |
| `foreground` | `string` | 继承 `currentColor` | 前景色(`fill = currentColor`) |

## 事件

无。四种图标均为纯展示组件,不派发业务事件,也无可交互视觉状态(Normal/PointerOver 等由宿主控件负责)。无障碍:默认 `aria-hidden="true"`(装饰性);如需独立命名,请覆盖为 `aria-hidden="false"` 并提供 `role="img"` + `aria-label`(或交给宿主控件命名,推荐)。

## 基础用法

```vue
<script setup lang="ts">
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import WuiBitmapIcon from '@/components/BitmapIcon.vue'
import WuiPathIcon from '@/components/PathIcon.vue'
</script>

<template>
  <!-- 字体字形:\uE8FB = Accept -->
  <WuiFontIcon glyph="\uE8FB" :font-size="20" />

  <!-- Symbol 枚举名,映射表自动转码点 -->
  <WuiSymbolIcon symbol="Accept" />

  <!-- 位图:默认单色化(true);传 false 保留原色 -->
  <WuiBitmapIcon src="/assets/slices.png" :show-as-monochrome="false" />

  <!-- 矢量路径:官方示例的旗标路径(20×20 坐标系) -->
  <WuiPathIcon data="F1 M 16,12 20,2L 20,16 1,16" />
</template>
```

## 字体栈与授权说明(项目裁决 R1)

- FontIcon / SymbolIcon 缺省字体栈为 `--wui-symbol-theme-font-family`:**`"Segoe Fluent Icons", "Segoe MDL2 Assets"`**(对应 WinUI `SymbolThemeFontFamily`,Win11 用前者、Win10 回退后者)。
- **本项目不在运行时加载任何网络字体,也不随包分发字体文件**(裁决 R1)。原因:Segoe 系图标字体随 Windows 授权分发,把字体文件打包进 Web 产物需要单独的许可评估;而 Windows 10/11 设备本机已预装这两款字体。
- 因此:Windows 10/11 浏览器中四个示例(字形表、FontIcon/SymbolIcon 演示)可直接渲染;**其它平台或精简系统会显示空心方块(tofu)**。如需跨平台一致,请在应用层自行引入兼容字体(如通过 `@font-face` 加载有授权的等价字体)并把 `fontFamily` 指到它 —— 组件不做任何网络请求。
- 全量字形表(`code` + 官方建议 `name`,共 1533 条)来自 WinUI Gallery 的 `IconsData.json`,已生成至 [demo/data/fontIconGlyphs.ts](../../demo/data/fontIconGlyphs.ts) 供示例页浏览/检索/复制;应用代码内建议直接用 `\uXXXX` 码点字面量。

## 与 WinUI 的差异

1. **无 ControlTemplate / 默认样式**:`FontIcon` 等在 `generic.xaml` 中没有 `TargetType` 样式段(默认值来自核心实现),本组件视觉基线取自源码常量:字号 20(`g_ClientCoreFontSize`)、字体栈 `SymbolThemeFontFamily`、Normal 字重;颜色走 `currentColor` 继承,宿主控件模板负责覆写。
2. **SymbolIcon.FontSize 为 Web 侧扩展**:WinUI 内部 TextBlock 固定 20px 且未公开该属性;本组件提供 `fontSize`(缺省同为 20),便于被 AppBarButton 等宿主以 16px 复用。
3. **BitmapIcon 尺寸语义**:WinUI 缺省取图片自然尺寸;Web 侧收敛为 **1em × 1em 盒**(随 `font-size` 缩放,`style="width/height"` 可覆盖),内容 `contain` 不变形。
4. **PathIcon viewBox**:WinUI 按几何边界自排布;Web 侧必须显式坐标系,缺省 `'0 0 20 20'`(官方示例坐标系),异坐标系路径请同时传 `viewBox`。
5. **路径迷你语言覆盖面**:支持 M/L/H/V/C/S/Q/T/A/Z 与逗号/空格分隔(XAML 与 SVG 共有语法)、`F0`/`F1` 前缀(F 与指令间允许无空白,如 `F1M16,12`);无前缀回退 XAML 缺省填充规则 EvenOdd(与 SVG 缺省 Nonzero 不同,含孔洞/自交路径时二者填充结果有差异)。XAML 特有的 `Data="…"` `Binding`、`PathGeometry` 图形对象表示不在支持范围。
6. **单色化实现**:WinUI 由合成器压色(位图任意不透明像素→前景色);CSS mask 依据 alpha 形状,半透明像素按 alpha 混合,观感基本一致但非逐像素等价。另注意 `mask-image` 引用**跨域 URL 需 CORS 许可**,跨域裸链位图的单色化会静默失效(WinUI 无此限制),跨域场景请改为同源资源或 data URL。
7. **RTL/缩放属性未实现**:WinUI `MirroredWhenRightToLeft`、`IsTextScaleFactorEnabled` 暂未提供(项目尚无 RTL/文本缩放管线);需要镜像时可在宿主用 CSS `transform: scaleX(-1)`。

---

演示页源码:[demo/pages/IconElementPage.vue](../../demo/pages/IconElementPage.vue) · 组件源码:[FontIcon](../../src/components/FontIcon.vue) · [SymbolIcon](../../src/components/SymbolIcon.vue) · [BitmapIcon](../../src/components/BitmapIcon.vue) · [PathIcon](../../src/components/PathIcon.vue) · 映射表:[src/utils/symbolIcons.ts](../../src/utils/symbolIcons.ts) · 字形表:[demo/data/fontIconGlyphs.ts](../../demo/data/fontIconGlyphs.ts)
