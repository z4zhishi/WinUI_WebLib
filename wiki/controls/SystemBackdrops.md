# SystemBackdrops

> 在线示例:[/#/systembackdrops](/#/systembackdrops) · 演示页源码:[demo/pages/SystemBackdropsPage.vue](../../demo/pages/SystemBackdropsPage.vue)

## 概述

SystemBackdrops 是 WinUI 3 的**窗口级系统背景材质**:把材质效果应用到应用窗口的背景层。Mica 不透明,对桌面壁纸只取样一次并经主题色着色(高性能,推荐作为应用主窗口的基础层);Mica Alt 是「着色更强」的变体,推荐配合标签式标题栏使用;Desktop Acrylic 半透明,实时模糊窗口背后的内容(推荐用于瞬态表面)。API 上有三种类型:`SystemBackdrop` 基类、`MicaBackdrop`(`Kind` 属性切换 Base / BaseAlt)、`DesktopAcrylicBackdrop`,需要完全自定义时用 `MicaController` / `DesktopAcrylicController`(可调 FallbackColor、Kind、LuminosityOpacity、TintColor、TintOpacity)。

本站组件 `<WuiSystemBackdrop>` 是这一组 API 的 **Web 应用级模拟**:Web 没有窗口系统,也读不到桌面壁纸,因此把「窗口背景材质」落成一块可放在页面任意位置的面板 div —— Mica 系用内置的静态壁纸替身 + 主题 tint 分层(不透明,不用 backdrop-filter,对应「壁纸只取样一次」),Desktop Acrylic 用 `backdrop-filter` 实时模糊面板身后的真实内容(半透明)。与真实系统材质的差异见[下文差异节](#与-winui-的差异)。

> 命名与路由说明:官方示例页题为 "System Backdrops (Mica/Acrylic)",catalog id 为 `SystemBackdrops`;本站文件名 `SystemBackdropsPage.vue`,自动注册路由 `/#/systembackdrops`,与 catalog 对齐。

官方文档:

- [SystemBackdrop - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.systembackdrop)
- [MicaBackdrop - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.micabackdrop)
- [DesktopAcrylicBackdrop - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.desktopacrylicbackdrop)
- [MicaController - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.composition.systembackdrops.micacontroller)
- [DesktopAcrylicController - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.composition.systembackdrops.desktopacryliccontroller)
- [Mica 材质设计指南](https://learn.microsoft.com/windows/apps/design/style/mica)
- [Acrylic 材质设计指南](https://learn.microsoft.com/windows/apps/design/style/acrylic)

## 与 AcrylicBrush 的分工(系统级 vs 应用级)

WinUI 的材质体系分两层,**两者不是同类 API,不要混用**;本站对应两个组件:

| | `<WuiSystemBackdrop>`(本组件) | `<WuiAcrylicBrush>`(见 [AcrylicBrush.md](./Acrylic.md)) |
| --- | --- | --- |
| WinUI API | `MicaBackdrop` / `DesktopAcrylicBackdrop` / `MicaController` / `DesktopAcrylicController`(窗口级) | `AcrylicBrush`(`XamlCompositionBrushBase` 画刷,元素级) |
| 作用层级 | **系统级**:整块窗口背景,位于所有内容之下,须经 `Window.SystemBackdrop` 设置且每窗口最多一次 | **应用级**:任意 UI 元素的 `Background`,可在窗口内放多块面板 |
| 材质种类 | Mica(Base / Alt)+ Desktop Acrylic(Base;Thin 须经 `DesktopAcrylicController.Kind`) | in-app 亚克力(无 Mica 概念) |
| 取样对象 | Mica:桌面壁纸(取样一次);Desktop Acrylic:窗口背后的桌面与其他窗口 | 元素身后的**视觉树内**内容(窗口内部) |
| 透明性 | Mica 不透明;Desktop Acrylic 半透明 | 半透明(不可用时落 FallbackColor) |
| 典型用途(官方指引) | 主窗口基础层、标题栏区域;瞬态表面(菜单/弹出层)用 Desktop Acrylic | 面板/支持性 UI 的表面背景,叠加在内容上 |
| 事件/视觉状态 | 无(非 Control,作用于窗口背景) | 无(画刷非 UIElement,generic.xaml 无样式) |
| Web 渲染 | Mica:静态壁纸替身 + tint 分层;Acrylic:`backdrop-filter` 实时取样 | `backdrop-filter` + 亮度/着色混色层 + 噪点 |

选择指引:想让**整个页面/应用**拥有 Mica 或系统亚克力观感 → 用本组件铺底;只想让**某块面板**透出页面内的内容 → 用 `AcrylicBrush`。两组件在 Web 侧共享同一套亚克力颜色数学(本组件的 Desktop Acrylic 分层直接复用 `acrylicToLayers`)。

## 属性

属性名跟随 WinUI(camelCase),模板中可写 kebab-case(如 `:is-input-active="false"`):

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `kind` | `'mica' \| 'micaAlt' \| 'acrylic'` | `'mica'` | 系统材质种类(WinUI:`MicaBackdrop` 的 `Kind = Base / BaseAlt`,或 `DesktopAcrylicBackdrop`) |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | 材质明暗(WinUI `SystemBackdropConfiguration.Theme` 的 Dark / Light / Default);`auto` 跟随站点 `html[data-theme]` |
| `isInputActive` | `boolean` | `true` | 输入激活(WinUI `SystemBackdropConfiguration.IsInputActive`);`false`(窗口失活)时整面落 `fallbackColor` 纯色 —— 对应官方「窗口失活即落中性色」的策略 |
| `tintColor` | `string` | 按材质 × 主题(见下表) | 着色(WinUI `MicaController` / `DesktopAcrylicController` 的 `TintColor`;Web 字节序 `#RRGGBBAA` / `rgba()`) |
| `tintOpacity` | `number`(0–1) | 按材质 × 主题 | 着色不透明度(WinUI `TintOpacity`) |
| `tintLuminosityOpacity` | `number \| null` | 按材质 × 主题 | 亮度层不透明度(WinUI `LuminosityOpacity`);`null` = 用默认值 |
| `fallbackColor` | `string` | 按材质 × 主题(见下表) | 降级纯色(WinUI `FallbackColor`);失活或材质不可用时整面显示 |

## 事件

无业务事件。系统材质作用于窗口背景、非交互控件;原生 DOM 事件可经 `$attrs` 透传在根 `div` 上监听。组件带默认插槽,可在材质之上叠加内容层(见用法)。

## 材质观感与 Web 模拟分层

| 材质 | WinUI 定义 | Web 分层(自下而上) |
| --- | --- | --- |
| Mica(Base) | 不透明;对桌面壁纸取样一次 + 主题着色 | 静态壁纸替身(WALLPAPER_STANDIN)→ 亮度层(`mix-blend-mode: luminosity`)→ tint 覆盖层。**不用 backdrop-filter**(对应「只取样一次」) |
| Mica Alt | Mica 的强着色变体(标签式标题栏) | 同上,默认 tint 换为 `SolidBackgroundFillColorBaseAlt` 家族 |
| Desktop Acrylic | 半透明;实时模糊窗口背后的内容 | 根元素 `backdrop-filter: blur(30px) saturate(125%)` 实时取样面板身后内容 → 亮度层 → tint 层 → 噪点 2%(颜色数学复用 `AcrylicBrush.vue` 的 `acrylicToLayers`) |

失活 / 不可用降级:窗口失活(`isInputActive = false`)、浏览器不支持 `backdrop-filter`(仅 Acrylic 受影响)时,整面渲染 `fallbackColor` 纯色 —— 对应官方「窗口失活、省电模式、关闭透明效果等系统策略触发降级」的行为。

## 浅 / 深主题默认值(tint 默认值对照源)

| kind | 主题 | tintColor | tintOpacity | tintLuminosityOpacity | fallbackColor | 来源 |
| --- | --- | --- | --- | --- | --- | --- |
| `mica` | light | `#F3F3F3` | `0.8` | `0.85` | `#F3F3F3` | `SolidBackgroundFillColorBase`(Common_themeresources_any.xaml L272) |
| `mica` | dark | `#202020` | `0.8` | `0.85` | `#202020` | 同上(L68) |
| `micaAlt` | light | `#DADADA` | `0.8` | `0.85` | `#DADADA` | `SolidBackgroundFillColorBaseAlt`(同文件 L279) |
| `micaAlt` | dark | `#0A0A0A` | `0.8` | `0.85` | `#0A0A0A` | 同上(L75) |
| `acrylic` | light | `#FCFCFC` | `0` | `0.85` | `#F9F9F9` | `AcrylicInAppFillColorDefaultBrush`(AcrylicBrush_themeresources.xaml,Light) |
| `acrylic` | dark | `#2C2C2C` | `0.15` | `0.96` | `#2C2C2C` | 同上(Default / 深色) |

说明:Mica / Mica Alt 的 tint 与降级色取自 `SolidBackgroundFillColorBase` / `SolidBackgroundFillColorBaseAlt` —— 官方 Mica 材质文档明确指名这两个资源就是两种材质的降级纯色。Desktop Acrylic 的 OS 侧资源 `AcrylicBackgroundFillColor*` 属系统主题资源、不在 CK/WinUI-Reference 仓库,故取仓内最近似源(in-app 亚克力默认值,与 [AcrylicBrush.md](./Acrylic.md) 的对照表同源)。控制器(TintColor / TintOpacity / LuminosityOpacity)的数值默认值在官方文档与本仓库中均未发布,上表 Opacity 值为按降级纯色校准的 Web 观感近似(wiki 声明,非官方数值)。

演示页的「内容层」颜色取自同一主题资源文件:`LayerFillColorDefault`(Light `#80FFFFFF` / Dark `#4C3A3A3A`,叠在 Mica 上)、`LayerOnMicaBaseAltFillColorDefault`(Light `#B3FFFFFF` / Dark `#733A3A3A`,叠在 Mica Alt 上)、`LayerOnAcrylicFillColorDefault`(Light `#40FFFFFF` / Dark `#09FFFFFF`)—— 官方分层指引:材质之上叠一层低不透明度纯色承载正文。

## 基础用法

```vue
<script setup lang="ts">
import WuiSystemBackdrop from '@/components/SystemBackdrop.vue'
</script>

<template>
  <!-- Mica(默认) -->
  <WuiSystemBackdrop kind="mica" style="width: 320px; height: 200px" />

  <!-- Mica Alt(强着色,标签式标题栏场景) -->
  <WuiSystemBackdrop kind="micaAlt" theme="dark" style="width: 320px; height: 200px" />

  <!-- Desktop Acrylic:实时模糊面板身后的内容 -->
  <div style="position: relative; overflow: hidden">
    <img src="wallpaper.jpg" style="position: absolute; inset: 0" />
    <WuiSystemBackdrop kind="acrylic" style="position: absolute; inset: 0; width: 100%; height: 100%" />
  </div>

  <!-- 窗口失活状态:整面落降级纯色 -->
  <WuiSystemBackdrop kind="mica" :is-input-active="false" />

  <!-- 当「窗口背景」用:材质铺底 + 默认插槽叠内容层 -->
  <WuiSystemBackdrop kind="mica" style="width: 320px; height: 200px">
    <p style="padding: 16px">内容层(官方指引:材质之上叠 LayerFillColorDefault 低不透明度纯色)</p>
  </WuiSystemBackdrop>
</template>
```

### useSystemBackdrop 组合式函数(用途二)

```ts
import { useSystemBackdrop } from '@/components/SystemBackdrop.vue'

const layers = useSystemBackdrop(() => ({ kind: 'acrylic', tintColor: '#2c2c2c', tintOpacity: 0.15, tintLuminosityOpacity: 0.96, fallbackColor: '#2c2c2c' }))
// layers.value.backdropFilter   → 'blur(30px) saturate(125%)'(mica 系为 'none')
// layers.value.luminosityColor  → 亮度层颜色(mix-blend-mode: luminosity)
// layers.value.tintColor        → tint 覆盖层颜色
// layers.value.fallbackColor    → 降级纯色
```

入参接受普通对象 / `ref` / getter;默认值常量 `MICA_DEFAULTS` / `MICA_ALT_DEFAULTS` / `ACRYLIC_DEFAULTS`、`getSystemBackdropDefaults()` 与 `WALLPAPER_STANDIN` 同从该 SFC 导出(demo 页用它们做「tint 默认值对照」)。

## 与 WinUI 的差异

1. **窗口级 → 应用级**:WinUI 材质作用于窗口背景且每窗口最多一次;Web 无窗口系统,组件落成页面内任意位置的面板 div(默认 320 × 200,可覆盖),`Window.SystemBackdrop` 一次性设置与「不要在 UI 元素上直接应用材质」的约束随之不适用。
2. **桌面壁纸不可得(最大差异)**:Mica / Mica Alt 的取样对象是用户桌面壁纸,Web 读不到 —— 用内置静态抽象渐变替身(`WALLPAPER_STANDIN`,蓝紫青色调近似 Windows 11 默认壁纸);真实 Mica 的观感随用户壁纸变化,Web 侧是固定的近似纹理 + 主题 tint。
3. **「取样一次」→ 不实时取样**:Mica 不透明且只对壁纸取样一次(官方强调的性能优势);Web 侧以「不用 backdrop-filter、静态分层」对应这一语义,但无法复现「窗口移动时材质随壁纸动态变化」。
4. **Desktop Acrylic 的取样范围**:系统亚克力模糊「窗口背后的桌面与其他窗口」;Web `backdrop-filter` 只能取样元素身后的页面内容,受「backdrop root」限制(祖先带 `filter` / `opacity < 1` 等会截断取样,见 [AcrylicBrush.md](./Acrylic.md) 差异节第 8 条)。
5. **默认值为校准近似**:控制器的 TintColor / TintOpacity / LuminosityOpacity 数值默认值未见于官方文档与 CK 仓库;Mica 系 tint/降级色取自官方文档指名的 `SolidBackgroundFillColorBase` / `BaseAlt`,Acrylic 取仓内最近似源(in-app 亚克力默认值),Opacity 为观感校准值 —— 见上文对照表。
6. **Desktop Acrylic Thin 未做独立 kind**:官方 `DesktopAcrylicController.Kind = Thin`(更透、更轻)需要控制器 API;本组件按派发规格只做三种 kind,Web 侧可用 `tintOpacity` / `tintLuminosityOpacity` 调出更透的观感。
7. **失活策略简化**:WinUI 由窗口激活状态 / 系统策略(省电、关闭透明效果、高对比度、低配硬件)驱动降级;Web 侧为 `isInputActive` 属性 + `backdrop-filter` 支持性探测,降级色两边同源。
8. **明暗切换**:`theme = 'auto'` 通过监听站点 `html[data-theme]`(useThemeSetting 写入)近似 WinUI 的 `SystemBackdropConfiguration.Theme` 跟随应用主题。
9. **颜色字节序**:XAML 为 `#AARRGGBB`(alpha 在前),Web 为 `#RRGGBBAA` —— 自定义 tint 时需换算(如 `#CCFFFFFF` → `#FFFFFFCC`)。
10. **无视觉状态 / 路由事件**:系统材质非 Control,不参与 Normal/PointerOver 等视觉状态,也没有业务事件;这与 WinUI 一致(材质 API 同样不暴露交互事件)。

## 相关链接

- 演示页源码:[demo/pages/SystemBackdropsPage.vue](../../demo/pages/SystemBackdropsPage.vue)
- 组件源码:[src/components/SystemBackdrop.vue](../../src/components/SystemBackdrop.vue)
- 官方示例对照:[CK/WinUI-Gallery/WinUIGallery/Samples/SystemBackdrops/](../../CK/WinUI-Gallery/WinUIGallery/Samples/SystemBackdrops/)
- 应用级材质:[AcrylicBrush.md](./Acrylic.md)(in-app 亚克力画刷,与本组件分工见「分工」专节)
- 画刷同源:[RadialGradientBrush.md](./RadialGradientBrush.md)
