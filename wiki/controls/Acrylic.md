# AcrylicBrush

> 在线示例:[/#/acrylicbrush](/#/acrylicbrush) · 演示页源码:[demo/pages/AcrylicBrushPage.vue](../../demo/pages/AcrylicBrushPage.vue)

## 概述

AcrylicBrush 是 WinUI 3 的**亚克力半透明材质画刷**:一种推荐用于面板背景的半透明材质 —— 透过面板能看到其后的内容,再叠一层可调的 tint 着色并压低对比度;当材质不可用(省电模式、远程会话等)时自动降级为 `FallbackColor` 纯色。官方示例用它填充一个 Rectangle,放在 Aqua / Magenta / Yellow 彩色图形之上,直观展示「背景透出」效果。它属于 in-app acrylic(应用内材质);窗口级的系统材质(Mica / Desktop Acrylic)见 SystemBackdrops 相关页。

本组件是 WinUI AcrylicBrush 的 Web 复刻,把 WinUI 源码(`AcrylicBrush.cpp` 的 Luminosity 配方效果图)逐层映射为 CSS:

1. **组件**(`<WuiAcrylicBrush>`):渲染为一个「毛玻璃面板」div —— 根元素 `backdrop-filter: blur(30px) saturate(125%)`,内部按 WinUI 效果图的顺序叠「亮度层(mix-blend-mode: luminosity)→ 着色层(mix-blend-mode: color)→ 噪点(2%)」,可直接当面板背景使用;
2. **组合式函数**(`useAcrylic`):不渲染任何东西,返回一次求值的分层颜色(`backdropFilter` / `luminosityColor` / `tintColor` / `fallbackColor`),供其他控件自行拼装背景。

官方文档:

- [AcrylicBrush - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.acrylicbrush)
- [Acrylic 设计指南](https://learn.microsoft.com/windows/apps/design/style/acrylic)

## 属性

属性名跟随 WinUI(camelCase),模板中可写 kebab-case(如 `:tint-opacity="0.8"`):

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `tintColor` | `string`(任意 CSS 颜色) | `'rgba(255, 255, 255, 0.8)'` | 着色(WinUI `TintColor`)。WinUI 默认值是 XAML `#CCFFFFFF`(AARRGGBB 字节序),换算为 Web 字节序即 `#FFFFFFCC` / `rgba(255,255,255,0.8)`;可解析的颜色(hex / rgb() / 常用命名色)参与完整混色数学,`var(--wui-*)` 等不可解析值走 `color-mix` 兜底 |
| `tintOpacity` | `number` | `1` | 着色不透明度(WinUI `TintOpacity`,0–1,越界钳制)。未显式设置 `tintLuminosityOpacity` 时,源码会按 tint 颜色的亮度/饱和度抑制有效不透明度(纯白压到 45%、纯黑 85%、中灰 90%) |
| `tintLuminosityOpacity` | `number \| null` | `null` | 亮度层不透明度(WinUI `TintLuminosityOpacity`)。`null` = 未设置,按源码公式自动推导:`alpha = (tintAlpha×0.88) + 0.15`,且 tint 的 HSV 亮度 V 钳制到 `[0.125, 0.965]`;显式设置(含 0)则原样使用且不再干预 `tintOpacity` |
| `fallbackColor` | `string` | `'transparent'` | 降级纯色(WinUI `FallbackColor`,继承自 `XamlCompositionBrushBase`,默认透明)。backdrop-filter 不可用、或 `alwaysUseFallback` 时整面显示该颜色 |
| `alwaysUseFallback` | `boolean` | `false` | 恒用降级(WinUI `AlwaysUseFallback`):跳过亚克力效果,直接渲染 `fallbackColor` 纯色(演示页降级演示用) |
| `tintTransitionDuration` | `number`(ms) | `500` | tint / 亮度层颜色变化的过渡时长(WinUI `TintTransitionDuration`),落到图层 `background-color` 的 CSS transition |
| `opacity` | `number` | `1` | 画刷不透明度(WinUI `Brush.Opacity`,0–1),落到根元素 `opacity` |

## 事件

无业务事件。AcrylicBrush 是**画刷(Brush)而非 UIElement**,在 WinUI 中就没有路由事件、也不参与视觉状态;原生 DOM 事件可经 `$attrs` 透传在根 `div` 上监听。

## 材质配方与 CSS 映射

WinUI 源码(`controls/dev/Materials/Acrylic/AcrylicBrush.cpp`)的 Luminosity 配方,自下而上:

| WinUI 效果图步骤 | 源码依据 | Web 侧实现 |
| --- | --- | --- |
| 背景 over 不透明 FallbackColor → GaussianBlur | `sc_blurRadius = 30.0f` | 根元素 `backdrop-filter: blur(30px) saturate(125%)` |
| Luminosity blend(亮度取自纯色层、色相/饱和度取自模糊背景) | `BlendEffectMode::Color`(源码注明 Luminosity/Color 命名互调 bug)+ `GetLuminosityColor()` | 子元素 `mix-blend-mode: luminosity`,颜色 = `useAcrylic().luminosityColor`(与 WinUI 同源同值) |
| Color blend(tint:色相/饱和度取自 TintColor、亮度取自下层) | `BlendEffectMode::Luminosity`(命名互调)+ `GetEffectiveTintColor()` | `::after` 层 `mix-blend-mode: color`,颜色 = `useAcrylic().tintColor` |
| noise 噪点合成 | `sc_noiseOpacity = 0.02f`(私有贴图) | 根元素内联 SVG `feTurbulence` 灰度噪点,2% 不透明度 |
| 不可用时 CrossFade 到纯色 | `FallbackColor` | `@supports not (backdrop-filter…)` 或 `alwaysUseFallback` → 整面 `fallbackColor` |

饱和度 `125%` 来自 `AcrylicBrush.h` 的 `sc_saturation = 1.25f` 常量与官方材质文档的 Acrylic blend layers 写法(该常量在 in-app 效果图未显式接线,Web 侧按材质文档应用于 backdrop,详见差异节)。

### 浅 / 深主题默认值(对照 in-app acrylic 资源)

`AcrylicBrush_themeresources.xaml` 的 `AcrylicInAppFillColorDefaultBrush`(组件不带 ThemeResource,按主题传参即可复现):

| 主题 | TintColor | TintOpacity | TintLuminosityOpacity | FallbackColor |
| --- | --- | --- | --- | --- |
| Light(浅) | `#FCFCFC` | `0.0` | `0.85` | `#F9F9F9` |
| Default(深) | `#2C2C2C` | `0.15` | `0.96` | `#2C2C2C` |

演示页把两套值并排放在同一彩色背景上,可直接对照浅深观感。

## 基础用法

```vue
<script setup lang="ts">
import WuiAcrylicBrush from '@/components/AcrylicBrush.vue'
</script>

<template>
  <!-- 官方 CustomAcrylicInAppBrush:TintOpacity 0.8 · TintColor Black · FallbackColor Green -->
  <WuiAcrylicBrush
    tintColor="#000000" :tint-opacity="0.8"
    fallback-color="#008000"
    style="width: 280px; height: 176px"
  />

  <!-- 官方 Luminosity 示例:SkyBlue · 0.8 / 0.8 -->
  <WuiAcrylicBrush
    tintColor="#87ceeb" :tint-opacity="0.8"
    :tint-luminosity-opacity="0.8"
    fallback-color="#87ceeb"
  />

  <!-- 深色主题默认值(in-app acrylic 资源) -->
  <WuiAcrylicBrush
    tintColor="#2c2c2c" :tint-opacity="0.15"
    :tint-luminosity-opacity="0.96" fallback-color="#2c2c2c"
  />

  <!-- 当面板背景用:画刷 div 绝对定位铺底,内容叠加其上 -->
  <div style="position: relative; overflow: hidden">
    <WuiAcrylicBrush style="position: absolute; inset: 0; width: 100%; height: 100%" />
    <p style="position: relative">Acrylic panel</p>
  </div>
</template>
```

### useAcrylic 组合式函数(用途二)

```ts
import { useAcrylic } from '@/components/AcrylicBrush.vue'

const layers = useAcrylic(() => ({ tintColor: '#000000', tintOpacity: 0.8, fallbackColor: 'Green' }))
// layers.value.backdropFilter  → 'blur(30px) saturate(125%)'
// layers.value.luminosityColor → 'rgba(32, 32, 32, 0.854)'(HSV V 钳制 0.125 + 自动亮度不透明度)
// layers.value.tintColor       → 'rgba(0, 0, 0, 0.68)'(含源码抑制系数 0.85)
// layers.value.fallbackColor   → 'Green'
```

入参接受普通对象 / `ref` / getter(`MaybeRefOrGetter<AcrylicBrushOptions>`),返回 `ComputedRef<AcrylicLayers>`;`parseCssColor` / `getTintOpacityModifier` / `getLuminosityColor` / `supportsAcrylic()` 与常量(`ACRYLIC_BLUR_RADIUS_PX` 等)同从该 SFC 导出。浏览器不支持 backdrop-filter 时 `supportsAcrylic()` 返回 false,组件自动落 `fallbackColor`。

## 与 WinUI 的差异

1. **mix-blend-mode 为等语义近似**:WinUI 用 Composition BlendEffect 链(源码注明 `BlendEffectMode::Luminosity/Color` 命名互调,代码按实际语义使用);CSS `mix-blend-mode: luminosity / color` 语义一致,但半透明层的混合加权与 Composition 有细微出入。
2. **saturate(125%) 的出处**:`sc_saturation = 1.25f` 定义于 `AcrylicBrush.h` 但未接入 in-app 效果图;Web 侧按官方材质文档(Acrylic blend layers:blur 30 + saturate 125%)应用于 backdrop-filter,观感与系统亚克力一致。
3. **噪点近似**:WinUI 用私有 noise 贴图且合成在 tint 之上;Web 侧用内联 SVG feTurbulence(灰度、2%)画在混色层之下 —— 2% 不透明度下视觉不可辨。
4. **降级触发面不同**:WinUI 由材质策略(省电模式 / 远程会话等)决定;Web 侧为 `@supports not (backdrop-filter…)` 探测 + `alwaysUseFallback` 属性,并暴露 `supportsAcrylic()`。FallbackColor 默认值两边一致(透明)。
5. **不可解析颜色走兜底层**:`var(--wui-*)` 等拿不到 RGB 通道,无法参与抑制系数 / HSV 钳制数学,luminosity 按「不透明 TintColor」假设推导(`0.88×opacity+0.15`),alpha 叠加用 `color-mix(in srgb, c X%, transparent)`。
6. **颜色过渡**:WinUI 为 Composition ColorAnimation(TintTransitionDuration);Web 侧是图层 `background-color` 的 CSS transition,时长同源。
7. **无模板 / 视觉状态 / 事件**:画刷非 Control、非 UIElement,generic.xaml 中无其样式;根元素为承载分层的 `div`,缺省 200 × 200(对齐官方示例的 Rectangle,可经 style/class 覆盖)。
8. **背景取样范围**:WinUI 的 backdrop 是元素后方的视觉树;CSS `backdrop-filter` 的取样受「backdrop root」限制 —— 若祖先带 `filter` / `opacity<1` / 自身 `backdrop-filter` 等会截断取样,放进这类容器可能看不到透出效果(页面顶层/普通容器无碍)。
9. **颜色字节序**:XAML 颜色为 `#AARRGGBB`(alpha 在前),Web 为 `#RRGGBBAA`(alpha 在后)—— 官方默认值 `#CCFFFFFF` 必须换算成 `#FFFFFFCC` / `rgba(255,255,255,0.8)` 再传入。
10. **主题默认值不随站点主题切换**:组件不带 ThemeResource 机制,浅 / 深默认值需按上表传参(或组合 `--wui-*` token);窗口级系统材质(Mica / Desktop Acrylic)不在本组件范围,见 SystemBackdrops 页。

## 相关链接

- 演示页源码:[demo/pages/AcrylicBrushPage.vue](../../demo/pages/AcrylicBrushPage.vue)
- 组件源码:[src/components/AcrylicBrush.vue](../../src/components/AcrylicBrush.vue)
- 官方示例对照:[CK/WinUI-Gallery/WinUIGallery/Samples/Acrylic/](../../CK/WinUI-Gallery/WinUIGallery/Samples/Acrylic/)
- 材质同源参考:[SystemBackdrops(Mica/Acrylic)](./SystemBackdrops.md)(若尚未实现,见 demo catalog 的 System Backdrops 条目)
- 画刷类型同源:[RadialGradientBrush.md](./RadialGradientBrush.md)(同为 XamlCompositionBrushBase 系画刷)
