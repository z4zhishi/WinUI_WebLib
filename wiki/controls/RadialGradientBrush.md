# RadialGradientBrush

在线示例:[/#/radialgradientbrush](/#/radialgradientbrush)

## 概述

RadialGradientBrush 是 WinUI 3 的**径向渐变画刷**:用一个椭圆定义渐变范围——`Center`(椭圆中心)是渐变的起点,`RadiusX` / `RadiusY` 是椭圆两轴半径(渐变的终点),颜色沿中心 → 边界的方向在 `GradientStops` 停止点集合之间插值;`GradientOrigin`(焦点)让插值的"起点视线"偏离中心,产生偏心光晕。它继承自 `XamlCompositionBrushBase`,可赋给任何元素的 `Fill` / `Background`(官方示例即用它填充一个 200 × 200 的 Rectangle)。

本组件是 WinUI RadialGradientBrush 的 Web 复刻,提供**两种用途**(同一实现):

1. **组件**(`<WuiRadialGradientBrush>`):渲染为一个以 CSS `radial-gradient` 填充的 `div`,可直接当背景面使用;给这个 div 设置 `border-radius`,渐变会随圆角裁剪(原生 CSS 行为),对应 WinUI 画刷填充带圆角元素的效果;
2. **组合式函数**(`useRadialGradient`):不渲染任何东西,直接返回 CSS `radial-gradient` 字符串,供其他控件(Shape 家族的 `Fill`、卡片背景等)自行取用。

官方文档:

- [RadialGradientBrush - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.RadialGradientBrush)
- [RadialGradientBrush 官方示例](https://github.com/microsoft/WinUI-Gallery)(WinUI Gallery → RadialGradientBrush)

## 属性

属性名跟随 WinUI(camelCase),模板中可写 kebab-case(如 `:gradient-stops="..."`):

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `center` | `WuiPoint { x, y }` | `{ x: 0.5, y: 0.5 }` | 渐变椭圆中心(WinUI `Center`,XAML 写作 `"0.25,0.25"`);相对模式为包围盒比例,绝对模式为 px |
| `gradientOrigin` | `WuiPoint { x, y }` | `{ x: 0.5, y: 0.5 }` | 渐变焦点(WinUI `GradientOrigin`);**CSS 渐变没有焦点语法,当前不影响渲染**(保留 API 对齐,演示页有 SVG fx/fy 参考图) |
| `radiusX` / `radiusY` | `number` | `0.5` | 椭圆水平 / 垂直半径(WinUI `RadiusX` / `RadiusY`);口径随 `mappingMode`,负值按 0 处理 |
| `mappingMode` | `'RelativeToBoundingBox' \| 'Absolute'` | `'RelativeToBoundingBox'` | 坐标映射模式(WinUI `BrushMappingMode`);绝对模式坐标为相对元素左上角的 px(与 WinUI 一致) |
| `spreadMethod` | `'Pad' \| 'Reflect' \| 'Repeat'` | `'Pad'` | 渐变越出椭圆后的扩展方式(WinUI `GradientSpreadMethod`),映射见下方「SpreadMethod 的 CSS 映射」 |
| `gradientStops` | `WuiGradientStop[]`(`{ color, offset? }`) | `[]` | 停止点集合(WinUI `GradientStops`);`offset ∈ [0,1]` 可省略,省略时按索引均匀分布;越界值钳制到 [0,1];**空数组 → 不绘制(`none`)** |
| `opacity` | `number` | `1` | 画刷不透明度(WinUI `Brush.Opacity`,0–1),落到根元素 `opacity` |

## 事件

无业务事件。RadialGradientBrush 是**画刷(Brush)而非 UIElement**,在 WinUI 中就没有路由事件、也不参与视觉状态;原生 DOM 事件可经 `$attrs` 透传在根 `div` 上监听。

## useRadialGradient 组合式函数(用途二)

```ts
import { useRadialGradient } from '@/components/RadialGradientBrush.vue'

const css = useRadialGradient(() => ({
  center: { x: 0.25, y: 0.25 },
  radiusX: 0.5,
  radiusY: 0.5,
  mappingMode: 'RelativeToBoundingBox',
  spreadMethod: 'Pad',
  gradientStops: [{ color: '#ffff00', offset: 0 }, { color: '#0000ff', offset: 1 }],
}))
// css.value → 'radial-gradient(ellipse 50% 50% at 25% 25%, #ffff00 0%, #0000ff 100%)'
```

- 入参接受普通对象 / `ref` / getter(`MaybeRefOrGetter<RadialGradientBrushOptions>`),返回 `ComputedRef<string>`,依赖变化自动重算;
- 一次性取值可 `useRadialGradient({...}).value`;纯函数版本 `radialGradientToCss(options)` 也一并导出;
- 返回串只含渐变本身:`gradientOrigin` 不进入 CSS(无焦点语法)、`opacity` 请由使用方落到元素 `opacity`;
- `WuiGradientStop` / `radialGradientToCss` / `WuiBrushMappingMode` 等类型同从该 SFC 导出。

## 基础用法

```vue
<script setup lang="ts">
import WuiRadialGradientBrush from '@/components/RadialGradientBrush.vue'
</script>

<template>
  <!-- 官方示例:Yellow → Blue 径向渐变填充(相对包围盒,默认模式) -->
  <WuiRadialGradientBrush
    :center="{ x: 0.25, y: 0.25 }"
    :gradient-origin="{ x: 0.5, y: 0.25 }"
    :radius-x="0.5" :radius-y="0.5"
    :gradient-stops="[{ color: '#ffff00', offset: 0 }, { color: '#0000ff', offset: 1 }]"
  />

  <!-- 绝对映射:坐标与半径按 px 相对元素左上角 -->
  <WuiRadialGradientBrush
    mapping-mode="Absolute"
    :center="{ x: 100, y: 100 }" :radius-x="90" :radius-y="90"
    :gradient-stops="[{ color: 'var(--wui-system-accent-color)', offset: 0 }, { color: 'transparent', offset: 1 }]"
  />

  <!-- Repeat:同心环(渐变向量每 1 个周期重复) -->
  <WuiRadialGradientBrush
    spread-method="Repeat"
    :gradient-stops="[
      { color: 'var(--wui-system-accent-color)', offset: 0 },
      { color: 'transparent', offset: 0.12 },
      { color: 'var(--wui-system-accent-color)', offset: 0.25 },
    ]"
  />

  <!-- 当卡片背景用:画刷 div 绝对定位铺底,内容叠加其上 -->
  <div style="position: relative; overflow: hidden">
    <WuiRadialGradientBrush
      style="position: absolute; inset: 0; width: 100%; height: 100%"
      :center="{ x: 0.5, y: 0.3 }" :radius-x="0.85" :radius-y="0.6"
      :gradient-stops="[{ color: 'var(--wui-system-accent-color)', offset: 0 }, { color: 'transparent', offset: 1 }]"
    />
    <p style="position: relative">Spotlight</p>
  </div>
</template>
```

## 坐标映射(mappingMode)的 CSS 口径

| WinUI | CSS 输出 | 语义 |
| --- | --- | --- |
| `RelativeToBoundingBox`(默认) | `at <x>% <y>%` + `ellipse <rx>% <ry>%` | 中心/半径为包围盒比例;CSS 椭圆半径百分比分别相对**宽 / 高**,与 WinUI 相对口径一致 |
| `Absolute` | `at <x>px <y>px` + `ellipse <rx>px <ry>px` | 坐标为相对元素左上角的 px(对照 `RadialGradientBrush.cpp` 中 MappingMode 注释,与 WinUI 一致) |

停止点 `offset` 一律以渐变线百分比表达(两种模式下通用)。

## SpreadMethod 的 CSS 映射

| WinUI | CSS 输出 | 实现说明 |
| --- | --- | --- |
| `Pad`(默认) | `radial-gradient(...)` | 椭圆外延续最后颜色,与 WinUI 一致 |
| `Repeat` | `repeating-radial-gradient(...)` | 先把停止点补齐到 [0,1](首补 0、末补 1),使 CSS 重复周期(末停止点 − 首停止点)恰为 WinUI 的渐变向量 [0,1];周期边界硬跳回起始颜色 |
| `Reflect` | `repeating-radial-gradient(...)` | 停止点 Pad 到 [0,1] 后镜像出 [1,2](offset 取 2 − offset、颜色倒序),周期 2 正反交替,与 WinUI Reflect 周期一致 |

## gradientStops 的选型说明(数组 prop)

WinUI 的 `GradientStops` 是 `IObservableVector<GradientStop>`(ContentProperty,XAML 里写子元素 `<GradientStop Color="Yellow" Offset="0"/>`)。Web 侧选型为**普通数组 prop**(`[{ color, offset? }]`):

- 声明式替换 / 深层修改(Vue 响应式)都会触发重算,覆盖了 `VectorChanged` 增删改的全部场景;
- `color` 接受任意 CSS 颜色(含 `var(--wui-*)` 主题变量);`offset` 省略时按索引均匀分布(首 0 末 1,与 Line.vue 的 `WuiGradientStop` 同口径——该类型直接从 `src/components/Line.vue` 复用,避免 Shape 家族画刷接口分叉);
- 若需要可变集合语义,在使用方持有 `ref<WuiGradientStop[]>` 增删改后整体传入即可(演示页的停止点编辑器即此模式)。

## 与 WinUI 的差异

1. **GradientOrigin(焦点)不影响渲染**:CSS `radial-gradient` 没有焦点(focus)语法,焦点语义无法用纯 CSS 表达。组件接受该 prop(类型/默认值与 WinUI 对齐)但 CSS 输出忽略它;演示页提供 SVG `fx`/`fy` 参考图复现 WinUI 焦点视觉效果(浏览器会把落在椭圆外的焦点钳回椭圆内,Extreme 偏移下与 WinUI 有出入)。
2. **InterpolationSpace 未实现**:WinUI 支持 `CompositionColorSpace`(Auto/Rgb/ScRgb,ScRgb 为线性光空间插值);CSS 渐变固定 sRGB 插值(CSS Color 4 的 `in oklab` 插值尚未用于 radial-gradient 停止点),prop 未提供。
3. **渲染栈不同**:WinUI 经 Composition(`CompositionRadialGradientBrush`)合成;Web 侧是 CSS 背景图。渐变本身视觉等价,但 fallback 行为(如设计模式)无对应物。
4. **GradientStops 为数组 prop** 而非 `IObservableVector`:见上文「选型说明」,无 `VectorChanged` 事件面。
5. **停止点归一**:省略的 `offset` 按索引均匀分布;越界 offset 钳制到 [0,1];停止点按传入顺序使用(与 WinUI 一致,不做排序)。未提供 WinUI 的 `GradientStop` 独立对象与 Color 的 ScRgb 形式。
6. **空停止点集 → `none`**:WinUI 在无 GradientStops 时落到 `XamlCompositionBrushBase` 的透明 fallback;组件输出 `none`(不绘制),观感一致。
7. **无模板 / 视觉状态 / 事件**:画刷非 Control、非 UIElement,generic.xaml 中无其样式;组件根元素仅为承载背景的 `div`,缺省 200 × 200(对齐官方示例的 Rectangle,可经 style/class 覆盖)。
8. **负半径按 0 处理**:WinUI 对非法半径的行为由合成层兜底;Web 侧钳制为 0(不渲染可见渐变)。
9. **数值口径**:相对模式为 0–1 比例、绝对模式为 CSS px(与 WinUI 的 DIP 在标准缩放下一致)。

## 相关链接

- 演示页源码:[demo/pages/RadialGradientBrushPage.vue](../../demo/pages/RadialGradientBrushPage.vue)
- 组件源码:[src/components/RadialGradientBrush.vue](../../src/components/RadialGradientBrush.vue)
- 官方示例对照:[CK/WinUI-Gallery/WinUIGallery/Samples/RadialGradientBrush/](../../CK/WinUI-Gallery/WinUIGallery/Samples/RadialGradientBrush/)
- 画刷类型同源:[Line.md 的 WuiBrush 画刷接口](./Line.md)(`WuiGradientStop` 自该处复用)
