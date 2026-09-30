# SystemBackdropElement

> 在线示例:[/#/systembackdropelement](/#/systembackdropelement) · 演示页源码:[demo/pages/SystemBackdropElementPage.vue](../../demo/pages/SystemBackdropElementPage.vue)

## 概述

SystemBackdropElement 是 WinUI 3 的**元素级系统材质宿主**(WinUI 3 新增 API):把系统材质(Mica / Mica Alt / Desktop Acrylic)应用到 **UI 树内特定区域**的身后,让这些材质不再局限于窗口背景,从而实现更灵活、更沉浸的界面设计。它派生自 `FrameworkElement`(不是 Control),API 只有两个属性:`SystemBackdrop`(挂 `MicaBackdrop`(`Kind = Base / BaseAlt`)或 `DesktopAcrylicBackdrop`,与窗口级**同一族材质对象**)和 `CornerRadius`(把材质面裁出圆角);自身无内容属性,官方用法是把它放进 `Grid`,内容以**兄弟节点**叠加在材质之上。

本站组件 `<WuiSystemBackdropElement>` 是它的 Web 对应:材质分层与默认值与窗口级姊妹件 `<WuiSystemBackdrop>` **同源**(复用 `SystemBackdrop.vue` 导出的 `MICA_DEFAULTS` / `MICA_ALT_DEFAULTS` / `ACRYLIC_DEFAULTS` 与同一套分层求值)——Mica 系不透明、用静态壁纸替身 + 主题 tint 分层;Desktop Acrylic 半透明、用 `backdrop-filter` 实时模糊元素身后的内容;`theme = 'auto'` 跟随站点主题。差异见[下文差异节](#与-winui-的差异)。

官方文档:

- [SystemBackdropElement - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.systembackdropelement)
- [MicaBackdrop - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.micabackdrop)
- [DesktopAcrylicBackdrop - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.desktopacrylicbackdrop)
- [Mica 材质设计指南](https://learn.microsoft.com/windows/apps/design/style/mica)
- [Acrylic 材质设计指南](https://learn.microsoft.com/windows/apps/design/style/acrylic)

## 与 SystemBackdrop(窗口级)的分工

两者用的是**同一族材质对象**(`MicaBackdrop` / `DesktopAcrylicBackdrop`),区别只在材质挂在**谁**身上;本站对应两个组件,分工与 WinUI 一致:

| | `<WuiSystemBackdropElement>`(本组件) | `<WuiSystemBackdrop>`(见 [SystemBackdrops.md](./SystemBackdrops.md)) |
| --- | --- | --- |
| WinUI API | `SystemBackdropElement`(元素级宿主) | `Window.SystemBackdrop`(窗口级,每窗口最多一次) |
| 派生 | `FrameworkElement`(UI 树内普通元素) | 挂在 `Window` 上的 `SystemBackdrop` 基类 |
| 作用层级 | UI 树内**任意一块区域**的身后,可在同一界面放多块 | 整个窗口背景,位于所有内容之下 |
| 形状控制 | 有 `CornerRadius`(材质面可裁圆角) | 无(随窗口形状) |
| 内容关系 | 材质垫底,内容叠在其上(WinUI:Grid 兄弟节点;本组件:默认插槽) | 无内容概念,窗口内容整体位于材质上 |
| 取样对象 | Mica:桌面壁纸(取样一次);Desktop Acrylic:元素身后的内容 | 相同(Mica:壁纸;Acrylic:窗口背后的桌面) |
| 典型用途(官方指引) | 局部沉浸面板、卡面、「窗口中窗口」式的材质区域 | 应用主窗口的基础层、标题栏区域 |
| Web 渲染 | 同一套分层实现(本组件复用其导出) | Mica:壁纸替身 + tint 分层;Acrylic:`backdrop-filter` |
| 默认尺寸 | Web 缺省 300 × 200(官方示例舞台尺寸) | Web 缺省 320 × 200 |

选择指引:想让**整个页面/应用**拥有 Mica 观感 → 用窗口级 `<WuiSystemBackdrop>` 铺底;想让**某块区域**(卡片、侧栏、局部面板)垫系统材质、甚至裁出圆角 → 用本组件。若还需要控制器级自定义(`TintColor` / `TintOpacity` / `LuminosityOpacity` / `FallbackColor`),本组件不暴露这些(WinUI 元素 API 同样不暴露),请用 `<WuiSystemBackdrop>` 或其 `useSystemBackdrop` 组合式函数自行渲染。

## 属性

属性名跟随 WinUI(camelCase),模板中可写 kebab-case(如 `:corner-radius="8"`):

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `kind` | `'mica' \| 'micaAlt' \| 'acrylic'` | `'mica'` | 系统材质种类(WinUI:`SystemBackdrop` 属性挂 `MicaBackdrop Kind=Base / BaseAlt` 或 `DesktopAcrylicBackdrop`) |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | 材质明暗(WinUI `SystemBackdropConfiguration.Theme`);`auto` 跟随站点 `html[data-theme]` |
| `cornerRadius` | `number \| string` | `0` | 材质面圆角(WinUI `CornerRadius`);number 按 px,string 原样作 CSS `border-radius`(可写逐角值) |
| `isInputActive` | `boolean` | `true` | 输入激活(WinUI `SystemBackdropConfiguration.IsInputActive` 的 Web 模拟);`false` 时整面落降级纯色 |

插槽:默认插槽把**任意子内容叠在材质面上**(内容层位于混色层之上,不被 Acrylic 的 `backdrop-filter` 模糊)。

## 事件

无业务事件。`SystemBackdropElement` 是 `FrameworkElement` 非 Control,无交互语义与视觉状态(与 WinUI 一致);原生 DOM 事件可经 `$attrs` 透传在根 `div` 上监听。

## 材质默认值

本组件不暴露 tint 自定义,`kind × theme` 一律落材质默认值 —— 与窗口级姊妹件**共用同一套导出常量**(`MICA_DEFAULTS` / `MICA_ALT_DEFAULTS` / `ACRYLIC_DEFAULTS`,自 `SystemBackdrop.vue` 导出)与同一套分层求值(`useSystemBackdrop`),因此观感与 `<WuiSystemBackdrop>` 完全一致。完整对照表(tintColor / tintOpacity / tintLuminosityOpacity / fallbackColor 及其主题资源出处)见 [SystemBackdrops.md 的「浅 / 深主题默认值」节](./SystemBackdrops.md#浅--深主题默认值tint-默认值对照源)。

## 基础用法

```vue
<script setup lang="ts">
import WuiSystemBackdropElement from '@/components/SystemBackdropElement.vue'
</script>

<template>
  <!-- Desktop Acrylic:实时模糊元素身后的内容(官方示例的默认组合,CornerRadius=8) -->
  <WuiSystemBackdropElement kind="acrylic" :corner-radius="8" style="width: 300px; height: 200px" />

  <!-- Mica / Mica Alt:不透明壁纸替身 + 主题 tint(深色档) -->
  <WuiSystemBackdropElement kind="mica" style="width: 300px; height: 200px" />
  <WuiSystemBackdropElement kind="micaAlt" theme="dark" :corner-radius="12" />

  <!-- 任意内容叠在材质面上(默认插槽;内容不被 Acrylic 模糊) -->
  <WuiSystemBackdropElement kind="acrylic" :corner-radius="8" style="width: 300px; height: 200px">
    <p style="padding: 16px">材质面上的内容</p>
  </WuiSystemBackdropElement>

  <!-- WinUI 原味写法:元素垫底,内容以兄弟节点叠加(Web 侧即普通定位叠加) -->
  <div style="position: relative; width: 300px; height: 200px">
    <WuiSystemBackdropElement style="position: absolute; inset: 0" :corner-radius="8" />
    <button style="position: absolute; inset: 0; margin: auto; width: 120px; height: 32px">Click Me</button>
  </div>

  <!-- 失活状态:整面落降级纯色(Web 模拟旋钮) -->
  <WuiSystemBackdropElement kind="mica" :is-input-active="false" />
</template>
```

## 与 WinUI 的差异

1. **内容承载方式**:WinUI 的 `SystemBackdropElement` 派生自 `FrameworkElement`,**没有内容属性**,内容以 Grid 兄弟节点叠加在元素上;Web 侧额外提供默认插槽直接把子内容放进组件(内部渲染在混色层之上的内容层),两种写法(插槽 / 定位叠加)都支持,见上文用法。
2. **桌面壁纸不可得(最大差异)**:Mica / Mica Alt 的取样对象是用户桌面壁纸,Web 读不到 —— 复用窗口级姊妹件的静态抽象渐变替身(`WALLPAPER_STANDIN`)+ 主题 tint 分层;真实 Mica 观感随用户壁纸变化,Web 侧是固定近似纹理。
3. **「取样一次」→ 不实时取样**:Mica 不透明且只对壁纸取样一次;Web 侧以「不用 backdrop-filter、静态分层」对应,但无法复现「窗口移动时材质随壁纸动态变化」。
4. **Desktop Acrylic 的取样范围**:系统亚克力模糊「元素身后的内容」;Web `backdrop-filter` 只能取样元素身后的页面内容,受「backdrop root」限制(祖先带 `filter` / `opacity < 1` 等会截断取样,见 [AcrylicBrush.md](./Acrylic.md) 差异节第 8 条)。
5. **默认尺寸**:WinUI 的尺寸由布局容器决定(无固有尺寸);Web 侧 `div` 需要可见的缺省尺寸,取官方示例舞台的 300 × 200,可被 class/style 覆盖。
6. **theme / isInputActive 为 Web 模拟旋钮**:WinUI 侧这两项由 `SystemBackdropConfiguration` 随窗口主题与激活状态自动驱动,元素 API 上不可见;Web 无窗口系统,以属性 + `html[data-theme]` 监听模拟。
7. **控制器级自定义不在元素 API 上**:WinUI 元素只接受现成的材质对象;`TintColor` / `TintOpacity` / `LuminosityOpacity` / `FallbackColor` 属 `MicaController` / `DesktopAcrylicController`,本组件同样不暴露 —— 需要时用 `<WuiSystemBackdrop>`(其 demo 对照控制器自定义)或 `useSystemBackdrop` 自行渲染。
8. **CornerRadius → CSS border-radius**:WinUI 用 `RectangleClip` 裁剪材质面;Web 侧落到根元素 `border-radius`(`overflow: hidden` 裁剪分层,`backdrop-filter` 亦按圆角裁剪)。WinUI `CornerRadius` 支持四角独立值,string 形式可写逐角 CSS。
9. **颜色字节序**:XAML 为 `#AARRGGBB`(alpha 在前),Web 为 `#RRGGBBAA` —— 对照官方资源换算(如 `#80FFFFFF` → `rgba(255, 255, 255, 0.5)`)。
10. **无视觉状态 / 路由事件**:元素级材质宿主非 Control,不参与 Normal/PointerOver 等视觉状态,也没有业务事件;这与 WinUI 一致。

## 相关链接

- 演示页源码:[demo/pages/SystemBackdropElementPage.vue](../../demo/pages/SystemBackdropElementPage.vue)
- 组件源码:[src/components/SystemBackdropElement.vue](../../src/components/SystemBackdropElement.vue)
- 窗口级姊妹件:[SystemBackdrops.md](./SystemBackdrops.md)(分工对照见「与 SystemBackdrop(窗口级)的分工」节)
- 应用级亚克力画刷:[AcrylicBrush.md](./Acrylic.md)
- 官方示例对照:[CK/WinUI-Gallery/WinUIGallery/Samples/SystemBackdropElement/](../../CK/WinUI-Gallery/WinUIGallery/Samples/SystemBackdropElement/)
