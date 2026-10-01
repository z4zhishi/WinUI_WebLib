# Border

在线示例:[/#/border](/#/border)

## 概述

Border 是 WinUI 中用于**在另一个对象周围绘制边框线、背景或两者**的装饰容器,一个 Border 只能包含一个子对象(`Child`)。它不是模板控件(没有 ControlTemplate 与视觉状态树),只提供 `BorderThickness` / `BorderBrush` / `CornerRadius` / `Padding` / `Background` 五个装饰属性,常用于给面板中的内容加边框、底色或做成卡片。

本组件是 WinUI Border 的 Web 复刻:渲染为一个 `div`,`Background` / `CornerRadius` / `Padding` 直接映射为 CSS `background` / `border-radius` / `padding`(`--wui-*` 主题 token 可直接作为属性值传入),默认 slot 即 XAML 的 `Child`。

官方文档:

- [Border - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.border)
- [Guidelines(布局面板指南)](https://learn.microsoft.com/windows/apps/design/layout/layout-panels)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `borderThickness` | `number \| string` | `0` | 边框厚度。XAML Thickness 形式:数字(四边一致,无单位按 px)、`"left,top"`(左右/上下配对)、`"left,top,right,bottom"` 四边独立 |
| `borderBrush` | `string` | `null`(不绘制) | 边框画刷;任意 CSS 颜色或 `--wui-*` 变量(如 `var(--wui-system-accent-color)`) |
| `cornerRadius` | `number \| string` | `0` | 圆角。XAML CornerRadius 形式:数字(四角一致)或 `"topLeft,topRight,bottomRight,bottomLeft"`(如 `"8,0,8,0"`) |
| `padding` | `number \| string` | `0` | 内边距。XAML Thickness 形式(同 `borderThickness`) |
| `background` | `string` | `null`(透明) | 背景画刷;任意 CSS 颜色或 `--wui-*` 主题 token |
| (默认 slot) | `any` | — | 对应 XAML `Child`:被装饰的单个子元素 |

## 事件

Border 是布局装饰容器,**无业务事件**,也没有 PointerOver / Pressed / Focus 视觉状态(WinUI 中它不是 Control,不参与视觉状态机)。

## 基础用法

```vue
<script setup lang="ts">
import WuiBorder from '@/components/Border.vue'
import WuiTextBlock from '@/components/TextBlock.vue'
</script>

<template>
  <!-- 最简:绕一个 TextBlock 画 2px 金色边框(官方示例组合) -->
  <WuiBorder :border-thickness="2" border-brush="#FFD700" background="var(--wui-application-page-background-theme)">
    <WuiTextBlock text="Text inside a border" :font-size="18" />
  </WuiBorder>

  <!-- 四边独立厚度:XAML Thickness 四值序 left,top,right,bottom -->
  <WuiBorder border-thickness="8,0,8,0" border-brush="var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))">
    <WuiTextBlock text="左右 8px、上下 0px" />
  </WuiBorder>

  <!-- 逐角圆角:XAML CornerRadius 四值序 topLeft,topRight,bottomRight,bottomLeft -->
  <WuiBorder corner-radius="8,0,8,0" :padding="16" background="var(--wui-tool-tip-background-theme)">
    <WuiTextBlock text="对角 8px 圆角、其余直角的卡片" />
  </WuiBorder>

  <!-- 主题 token 卡片组合 -->
  <WuiBorder
    :border-thickness="1"
    border-brush="var(--wui-system-control-background-base-low)"
    background="var(--wui-tool-tip-background-theme)"
    :corner-radius="8"
    :padding="16"
  >
    <WuiTextBlock text="1px 描边 + 面板背景 + 8px 圆角,深浅主题自动适配。" />
  </WuiBorder>
</template>
```

## 官方解析语义与本组件的宽容回退(Thickness / CornerRadius)

以下语义已对照官方源码核实(`CK/WinUI-Reference/dxaml/xcp/components/xstring/StringConversions.cpp` 的 `ThicknessFromString`、`dxaml/xcp/components/primitiveDependencyObjects/CornerRadius.cpp` 的 `CornerRadiusFromString`;两者都经 `ArrayFromString` 解析,要求**精确消费整个字符串**):

**Thickness 官方级联**(自上而下尝试,全串精确匹配,否则整体解析失败):

1. 4 值:`left, top, right, bottom`
2. 2 值:`left, top`(left/right = 第 1 值,top/bottom = 第 2 值)
3. 1 值:四边一致

**CornerRadius 官方级联**:

1. 4 值:`topLeft, topRight, bottomRight, bottomLeft`
2. 1 值:四角一致(uniformRadius,`FromUniformRadius`)

即官方**不存在** Thickness 三值 / CornerRadius 两值形式;这类输入官方语义是解析失败(XAML 报错)。本组件为 Web 宽容性不抛错,采用如下回退策略:

| 输入计数 | Thickness | CornerRadius |
| --- | --- | --- |
| 1 值 | 四边一致(官方) | 四角一致(官方) |
| 2 值 | 左右 = 第 1、上下 = 第 2(官方) | 按 CSS 对角语义 `tl/br`、`tr/bl` 透传(宽容扩展) |
| 3 值 | 官方解析失败 → **宽容回退为首值四边一致** | 官方解析失败 → **宽容回退为首值四角一致** |
| 4 值 | left, top, right, bottom(官方) | topLeft, topRight, bottomRight, bottomLeft(官方) |

> 宽容回退取首值 uniform 的方向,与官方 CornerRadius 回退档(非四值即走向 uniformRadius)同型;QA 复审裁决确认按此口径落实。

## 官方示例对照色说明

[WinUI Gallery 官方 Border 示例](https://github.com/microsoft/WinUI-Gallery)的 Background / BorderBrush 单选给出 Green / Yellow / Blue / White 四色,其 code-behind(`Samples/Border/BorderPage.xaml.cs`)的映射为:Yellow → `Colors.Gold`、Green → `Colors.DarkGreen`、Blue → `Colors.DarkBlue`、White → `Colors.White`。演示页为了**逐像素对照官方示例**,在画刷下拉与「官方示例还原」固定示例中直接使用这些字面 CSS 色(`#FFD700` / `#006400` / `#00008B` / `#FFFFFF`)——它们是演示选项的属性值而非组件样式,组件样式本身零硬编码;实际业务请优先使用 `--wui-*` 主题 token(演示页下拉的默认项即主题 token)。

## 边框绘制方案选型(参与布局的内绘语义)

对照 WinUI 源码(`CK/WinUI-Reference/dxaml/xcp/core/core/elements/Border.cpp` 的 `CBorder::MeasureOverride` L211-236 与 `HelperGetCombinedThickness`):`combined = BorderThickness + Padding`,`childAvailableSize = MAX(0, availableSize - combined)`,`desiredSize = childDesired + combined` —— **边框厚度与内边距共同参与度量与排布**,子元素区按「厚度 + 内边距」共同内缩(厚度不依赖画刷:`BorderBrush = null` 只是不绘制,内缩照旧)。

本组件以 CSS `border` + `box-sizing: border-box` 精确复刻该语义:边框画在盒缘内侧并向内挤压 `padding` 与内容区,绘制位置与早期 inset box-shadow 方案一致(均在盒内缘),厚度变化的内容回流行为与 WinUI 相同。三种 CSS 方案的取舍:

| 方案 | 结论 | 原因 |
| --- | --- | --- |
| **CSS `border`(采用)** | ✔ | 与 WinUI 一致地参与盒模型(border-box 下厚度挤占 padding/内容区);支持四边独立厚度、天然跟随 `border-radius`,圆角处按斜接(miter)过渡与 WinUI 一致 |
| CSS `outline` | 不采用 | 不支持四边独立厚度(只能等宽);负 `outline-offset` 内绘依赖较新浏览器的圆角跟随行为,且不参与布局 |
| `box-shadow: inset`(已弃用) | ✘ | 盒内绘制、零布局影响,但 WinUI 的边框**参与布局**——该方案下子元素区不随厚度内缩,与源语义不符(视觉 QA FAIL-BORDER-1 打回项),已替换 |

## 与 WinUI 的差异

1. **边框参与布局(与 WinUI 一致)**:`borderThickness` 用 CSS `border` 实现,与 `padding` 共同内缩子元素区、计入自身 desired 尺寸(`CBorder::MeasureOverride` 语义);仅设厚度不设画刷时以透明边框占位(不绘制、内缩照旧,与源一致)。
2. **Thickness 两值形式**:XAML `"left,top"` 表示左右/上下配对,已按此语义解析(官方支持,见上节级联);XAML CornerRadius 没有两值形式,本组件遇到两值时按 CSS 对角语义(`tl/br`、`tr/bl`)透传,作为宽容扩展(官方为解析失败)。
3. **Thickness 三值形式**:官方不支持三值 Thickness,`ThicknessFromString` 对 "1,2,3" 类输入的语义是**解析失败**(4→2→1 级联均无法精确消费全串);本组件按宽容策略**回退为首值四边一致**(旧版本曾在此处把 `undefined` 泄漏进 CSS 值,导致 padding / border 整条声明被浏览器丢弃,已修复)。官方三值与组件回退的行为差异见「官方解析语义与本组件的宽容回退」节。
4. **画刷类型**:WinUI `BorderBrush`/`Background` 是 Brush(纯色、渐变、亚克力等);Web 版属性为 CSS `background`/颜色值,纯色与 CSS 渐变均可用,亚克力等系统材质无对应物。
5. **对齐与拉伸**:WinUI Border 默认 `HorizontalAlignment/VerticalAlignment = Stretch`,块级 `div` 天然横向撑满、竖向由内容决定;WinUI 的竖向拉伸依赖父容器,Web 版如需请经 `$attrs` 传 `style="height: 100%"` 等自行控制。
6. **单子元素约束**:WinUI `Child` 只允许一个子元素(多个会抛异常);Web 版 slot 放入多个元素时按普通文档流依次排列,不做校验。
7. **无视觉状态与事件**:与 WinUI 一致,Border 不是 Control,无 PointerOver/Pressed/Focus 状态、无业务事件;组件相应未声明 emits。

## 相关链接

- 演示页源码:[demo/pages/BorderPage.vue](../../demo/pages/BorderPage.vue)
- 组件源码:[src/components/Border.vue](../../src/components/Border.vue)
- 同类控件:Grid、StackPanel、Canvas(布局面板)、ContentPresenter / ContentControl(模板化容器)
