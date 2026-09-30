# ThemeShadow

> 在线示例:[/#/themeshadow](/#/themeshadow)

## 概述

ThemeShadow 是 WinUI 的投影抽象(`Microsoft.UI.Xaml.Media.ThemeShadow`):利用系统的光照与景深,为 UI 元素添加真实感的投影以强化视觉层级。元素通过 `UIElement.Translation` 的 Z 分量「抬升」出界面平面,阴影按 elevation(高度)自动发散、加深,并且**只投到 `Receivers` 集合指定的背景层**上,因此不会把阴影误投到兄弟元素(如旁边的弹层)。

ThemeShadow 没有模板与样式资源(generic.xaml 中无 ControlTemplate/画刷 token),观感完全由 elevation 驱动、由合成器绘制 —— 本库因此以 **工具函数 + 演示组件** 的形态落地(`src/utils/themeShadow.ts` + `src/components/ThemeShadowDemo.vue`),而非可换模板的控件。

官方文档:

- [Z-depth and shadow design guidelines(设计指引)](https://learn.microsoft.com/windows/apps/design/layout/depth-shadow)
- [ThemeShadow - API](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.themeshadow)

**与弹层基建的统一口径**:阶段 3 弹层基建(`src/styles/popup.css`)的层根阴影 `--wui-popup-shadow` **就是** ThemeShadow elevation 32 的观感 —— 本工具 `themeShadowCss(32)`(浅色)的输出与其逐字一致:

```css
/* 弹层基建 --wui-popup-shadow ≡ themeShadowCss(32)(浅色) */
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12);
```

弹层控件(Flyout / MenuFlyout / ContentDialog / ToolTip / ComboBox 下拉等)无需再接 ThemeShadow:它们经弹层基建已经获得对应观感。

## WinUI API 与 Web 对照

| WinUI 成员 | 类型 | Web 近似 |
| --- | --- | --- |
| `ThemeShadow.Receivers` | `IList<UIElement>` | receiver 背景层近似(见差异 2);组件以 `ShowReceiver` 演示 |
| `UIElement.Shadow` | `Shadow` | `<ThemeShadowDemo>` 组件封装,或 `applyThemeShadow(element, elevation)` |
| `UIElement.Translation.Z` | `Vector3` 的 Z 分量 | `Elevation` 属性 / `themeShadowCss(elevation)` 的第一参数(单位 px) |
| `UIElement.Translation.X / Y` | `Vector3` 的 X/Y 分量 | 元素自身定位 / `transform: translate(...)`(组件内为拖动位置) |
| elevation 变化动画 | 125ms 线性(ElevationHelper.cpp `s_durationTime`) | 组件内 `box-shadow` 125ms 线性过渡 |

## 工具函数(`src/utils/themeShadow.ts`)

| 函数 / 常量 | 签名 | 说明 |
| --- | --- | --- |
| `themeShadowCss` | `(elevation, { theme? }) => string` | 生成多层 box-shadow CSS 值;elevation ≤ 0 返回 `none`(对应官方示例 Z-translation=0) |
| `themeShadowStyle` | `(elevation, { theme? }) => CSSProperties` | style 对象形式(`{ boxShadow }`),供 `:style` 直接绑定 |
| `applyThemeShadow` | `(element, elevation, { theme? }) => () => void` | 命令式施加并返回恢复原值的清理函数 |
| `resolveThemeShadowElevation` | `(value) => number` | 预设名 → elevation 数值;未知预设名抛错 |
| `THEME_SHADOW_PRESETS` | `Record<ThemeShadowPresetName, ThemeShadowPresetDef>` | 4 档预设(elevation / 中英文名 / WinUI 来源) |
| `THEME_SHADOW_DEFAULT_ELEVATION` | `number` | 32(ElevationHelper.cpp `s_elevationBaseDepth`) |
| `THEME_SHADOW_ANIMATION_MS` | `number` | 125(`s_durationTime`) |

## elevation 预设档位(值来自 WinUI 参照源)

档位不是自定义的:全部取自 WinUI 参照源中「控件真实使用的 elevation」。

| 预设 | Elevation | WinUI 取值来源 |
| --- | --- | --- |
| `tooltip` | 16 | `ToolTip_Partial.cpp`:`baseElevation 16` |
| `flyout` | 32 | `ElevationHelper.cpp`:`s_elevationBaseDepth`(Flyout / MenuFlyout 首层 / ComboBox 下拉 / AutoSuggestBox / CommandBar Overflow / ContentDialog 常规) |
| `subMenu` | 40 | `MenuFlyoutPresenter_Partial.cpp`:`GetDepth()=1` → 32 + `s_elevationIterativeDepth`(8)×1;每深一级 +8 |
| `dialog` | 128 | `ContentDialog_Partial.cpp`:drop shadow 模式的加大投影(`baseElevation 128`) |

## 组件属性(`ThemeShadowDemo.vue`)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `Elevation` | `number \| ThemeShadowPresetName` | `32` | elevation(等价 Translation.Z,px),也可传预设名 |
| `Theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | 阴影主题;auto 跟随站点 `html[data-theme]` |
| `Draggable` | `boolean` | `false` | 卡片可拖动(指针;方向键每次 8px、Home 复位;`tabindex=0` + `role=button`) |
| `ShowReceiver` | `boolean` | `true` | 显示 receiver 背景层 |
| `ReceiverLabel` | `string` | `'Receiver'` | receiver 层角标文案 |
| `CardWidth` / `CardHeight` | `number` | `200` / `200` | 卡片尺寸(官方示例 200×200) |

## 基础用法

```vue
<script setup lang="ts">
import { themeShadowCss, themeShadowStyle } from '@/utils/themeShadow'
import ThemeShadowDemo from '@/components/ThemeShadowDemo.vue'
</script>

<template>
  <!-- 组件式:elevation 支持数值或预设名(tooltip / flyout / subMenu / dialog) -->
  <ThemeShadowDemo :elevation="32" draggable show-receiver>
    卡片内容
  </ThemeShadowDemo>

  <!-- 工具式:任意元素直接施加 -->
  <div :style="themeShadowStyle(40)">elevation 40</div>
</template>
```

## elevation → box-shadow 映射

Web 惯例是「多层 box-shadow 近似单光源投影」:主投影随 elevation 发散(偏移/模糊变大)并轻微加深,另加一层固定的贴边环境层。

| 参数 | 公式(浅色,elevation 简写 e) | e=16 | e=32 | e=40 | e=128 |
| --- | --- | --- | --- | --- | --- |
| 垂直偏移 | e / 4 | 4px | 8px | 10px | 32px |
| 模糊半径 | e / 2 | 8px | 16px | 20px | 64px |
| 主层透明度 | 0.10 + (e−16)×0.0025,夹取 [0.06, 0.22] | 0.10 | 0.14 | 0.16 | 0.22 |
| 环境层 | 固定 `0 0 2px rgba(0,0,0,0.12)` | 同左 | 同左 | 同左 | 同左 |

锚点:e=32(浅)与弹层基建 `--wui-popup-shadow` 逐字一致;e=16 / 40 / 128 为同一公式的延伸(官方示例以 0-64 连续滑块演示 elevation,本表只列预设档位)。

**明暗主题差异**:`theme: 'dark'` 时主层透明度 ×1.5(上限 0.36)—— 深色底上阴影感知变弱,Web 惯例按加深补偿。注意 WinUI 合成器阴影本身不随主题变色、弹层基建 `--wui-popup-shadow` 也未区分主题;dark 补偿是本工具提供的可选项,用不用由应用决定。

## 与 WinUI 的差异(简化声明)

1. **多层 box-shadow 近似(核心简化)**:真实逐像素合成器投影在 CSS 中不可行;`themeShadowCss` 生成「主投影 + 环境层」的双层 box-shadow,是 Web 端的惯例近似,发散/加深规律按上文公式逼近 WinUI 观感,并非官方数值(XAML 无阴影 token,合成器参数取不到)。
2. **Receiver 语义为近似**:WinUI 只把阴影投到 `Receivers` 集合内的背景层;CSS box-shadow 恒投到元素正后方的全部内容,无法择层。近似方式:让 receiver 背景层紧贴元素正下方(如官方示例的铺底 Grid / 组件的 receiver 层)。后果:阴影也会出现在非 receiver 元素上(例如拖动卡片掠过兄弟卡片时),WinUI 不会。
3. **无 Z 轴**:Translation.Z 的「抬升」在 Web 没有对应物(不改变元素渲染次序),只保留阴影观感;Translation.X/Y 用 `transform: translate()` 近似。
4. **阴影颜色固定黑色**:WinUI ThemeShadow 无颜色参数(由系统光照决定),Web 版固定 `rgba(0,0,0,α)`,行为一致;但 `Mask`(自定义投影遮罩)、`CastingElement` 等内部机制未实现。
5. **dark 主题透明度补偿为 Web 增强**(见上文),WinUI 侧无此差异。
6. ** elevation 过渡**用 CSS `transition: box-shadow 125ms linear` 逼近 WinUI 的 Translation 合成动画(125ms 线性,`ElevationHelper.cpp s_durationTime`);box-shadow 过渡的性能劣于合成器动画,仅演示用途。

## 相关

- 演示页源码:[demo/pages/ThemeShadowPage.vue](../../demo/pages/ThemeShadowPage.vue)
- 弹层基建(弹层阴影即 ThemeShadow 观感):[wiki/controls/_popup-infra.md](_popup-infra.md)
- 关联控件:[Acrylic](Acrylic.md)(同为深度/材质系统的一部分)
