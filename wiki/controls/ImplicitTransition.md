# ImplicitTransition

在线示例:[/#/implicittransition](/#/implicittransition)

## 概述

隐式过渡(Implicit Transitions)让你**只声明一次过渡、之后每次属性变化都自动播放动画**:给 UIElement 挂上 `Transitions` 集合(或直接设置 `OpacityTransition` / `TranslationTransition` / `ScaleTransition` / `RotationTransition` / `BackgroundTransition`),此后修改对应属性时无需调用任何动画 API,合成器会自动生成过渡动画。它是 WinUI「隐式动画」设计的核心:把动画职责从调用方移交给属性系统,代码里只剩业务状态变更。

需要特别注意:**隐式过渡不是可换模板的控件,而是 `UIElement` 的属性面**(generic.xaml 中没有对应 ControlTemplate/Style 段)。因此 Web 复刻采用包装组件模式:`ImplicitTransitions.vue` 的根元素即被动画的「UIElement」,子元素是视觉内容,`transitions` prop 声明启用的过渡类型(映射为 CSS `transition` 属性集),`opacity` / `translateX/Y` / `rotation` / `scale` / `background` 等 props 对应 WinUI 的同名可动画属性——任一 prop 变化,DOM 样式更新,`transition` 自动播放。时长 / 延迟 / 缓动默认取 `src/styles/animations.css` 的 token(`--wui-duration-normal` 240ms + `--wui-easing-standard`)。

官方文档:

- [UIElement.Transitions - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.uielement.transitions)
- [Motion in practice - Guidelines(隐式动画)](https://learn.microsoft.com/windows/apps/design/motion/motion-in-practice#implicit-animations)
- [Quickstart: Motion](https://learn.microsoft.com/windows/apps/design/motion)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `transitions` | `ImplicitTransitionKind[]`(`'opacity' \| 'translate' \| 'scale' \| 'rotation' \| 'background'`) | `[]` | 启用的过渡类型,与 WinUI 各 `*Transition` 属性一一对应;**空数组 = 无过渡(WinUI `Transitions` 集合默认空)**,属性变化瞬时生效 |
| `opacity` | `number` | `1` | 不透明度 0–1(越界夹取),对应 `UIElement.Opacity` + `OpacityTransition`(ScalarTransition) |
| `translateX` / `translateY` | `number` | `0` | 平移(px),对应 `UIElement.Translation.X/Y` + `TranslationTransition`(Vector3Transition);Z 分量无 Web 对应 |
| `rotation` | `number` | `0` | 旋转角度(度,绕元素中心),对应 `UIElement.Rotation` + `RotationTransition` |
| `scale` | `number` | `1` | 等比缩放,对应 `UIElement.Scale` + `ScaleTransition`(X=Y=Z;WinUI 可按轴独立) |
| `background` | `string` | — | 背景色(任意 CSS 颜色 / 变量),对应纯色 `Background` + `BrushTransition`;渐变画刷 CSS 不可过渡 |
| `duration` | `number \| string` | `'normal'` | 过渡时长(**Web 增强**):数字按 ms;`'fast'` / `'normal'` / `'slow'` 取 animations.css 时长 token(167/240/350ms);其余字符串原样(如 `'240ms'` 或 `var(--wui-duration-slow)`) |
| `delay` | `number \| string` | `0` | 过渡延迟(**Web 增强**):数字按 ms,其余字符串原样 |
| `easing` | `string` | `'standard'` | 缓动(**Web 增强**):`'standard'` / `'decelerate'` / `'accelerate'` 取 animations.css 缓动 token;其余字符串原样(如 `cubic-bezier(...)`) |
| 默认 slot | `any` | — | 视觉内容(被动画元素的内容,等价 WinUI 中挂 Transitions 的 UIElement 的子树) |

## 事件

**无业务事件。** 隐式过渡由属性变化驱动、自动播放,WinUI 也没有完成回调事件;Web 端如需结束时机,可监听根元素的原生 `transitionend`(非 WinUI API,`$attrs` 会把监听透传到根元素)。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiImplicitTransitions from '@/components/ImplicitTransitions.vue'

const visible = ref(false)
</script>

<template>
  <!-- 声明一次过渡;之后只改属性,动画自动播放 -->
  <WuiImplicitTransitions
    :transitions="['opacity', 'translate', 'scale']"
    :opacity="visible ? 1 : 0"
    :translate-x="visible ? 0 : 24"
    :scale="visible ? 1 : 0.9"
    duration="normal"
    easing="standard"
  >
    <div>通知卡片:isOn 变化 → 三个属性同时变,过渡自动组合播放</div>
  </WuiImplicitTransitions>

  <button @click="visible = !visible">切换</button>
</template>
```

关键心智模型(与官方示例一致):**不要手动触发动画**。把 `opacity` / `translate` / `scale` 等当作普通绑定属性,由业务状态(开关、预设值、数据)驱动;只要目标过渡在 `transitions` 里启用,属性每次变化都会自动带动画,未启用的属性瞬时跳变——这正是「无过渡 vs 有过渡」显式对照的实现原理(两个包装组件绑同一组状态,左列 `transitions=[]`)。

## WinUI 隐式过渡 ↔ CSS transition 概念映射

| WinUI 概念 | Web 映射 | 说明 |
| --- | --- | --- |
| `UIElement.Transitions` 集合(`OpacityTransition` / `TranslationTransition` / `ScaleTransition` / `RotationTransition` / `BackgroundTransition`) | `transitions` prop → CSS `transition` 属性集 | 声明一次过渡,此后每次属性变化自动播放(无需调用动画 API) |
| `ScalarTransition`(Opacity / Rotation) | `transition: opacity` / `transition: transform` | 单值属性过渡 |
| `Vector3Transition`(Translation / Scale,可按 X/Y/Z Components 掩码) | 同一条 `transition: transform` | CSS 的 `transform` 是单一属性,translate / rotate / scale 合一:启用任一类型即过渡**全部** transform 变化,无法像官方示例那样按 Components 轴独立开关 |
| `BrushTransition`(纯色 Background) | `transition: background-color` | 仅纯色可插值(官方 Blue ↔ Yellow 示例可 1:1);渐变画刷(`background-image`)CSS 不可过渡 |
| `UIElement.Opacity`(0.0–1.0) | `opacity` prop → CSS `opacity` | 两边越界均夹取;`Opacity=0` 仍参与命中测试(WinUI 与 Web 行为一致) |
| `UIElement.Translation`(Vector3,DIP) | `translateX` / `translateY` → `transform: translate()` | Z 分量无 Web 对应;单位 px(DIP ≈ CSS px) |
| `UIElement.Rotation`(度,绕 CenterPoint) | `rotation` → `transform: rotate()` | 官方示例先设 `CenterPoint = (ActualWidth/2, ActualHeight/2)` 再改 Rotation;Web 版固定 `transform-origin: center`(等价同一 CenterPoint) |
| `UIElement.Scale`(Vector3) | `scale` → `transform: scale()` | 等比缩放;WinUI 可 X/Y/Z 独立 |
| 合成器隐式动画(时长 / 缓动由平台固定,`*Transition` 类型不暴露参数) | `duration` / `delay` / `easing` 可配(**Web 增强**) | 默认取 animations.css token:`--wui-duration-normal` 240ms + `--wui-easing-standard`;fast 167ms / slow 350ms |
| —(WinUI 无对应) | `prefers-reduced-motion` 自动降级 | animations.css 全局把过渡时长压至 0.01ms,过渡近似瞬时完成 |

## 与 WinUI 的差异

1. **不是控件,无模板与视觉状态**:WinUI 隐式过渡是 `UIElement` 属性面(generic.xaml 无 `TargetType` 对应段),不存在 Normal/PointerOver 等视觉状态树;包装组件因此只有布局样式(`inline-block` + `transform-origin: center`),交互态样式由子元素自己承载。
2. **时长 / 延迟 / 缓动是 Web 增强**:WinUI 的 `ScalarTransition` / `Vector3Transition` / `BrushTransition` 均不暴露时长与缓动(合成器隐式动画参数平台固定);Web 端 CSS `transition` 天然可配,提供 `duration` / `delay` / `easing` 三个 props,默认值取 animations.css token。若要求严格对齐 WinUI 观感,保持默认即可。
3. **Vector3 的 Components 掩码不可用**:WinUI 可给 `Vector3Transition.Components` 设 X/Y/Z 掩码,让缩放只动 Y 轴之类;CSS `transform` 是单一属性,`transitions` 的粒度是**过渡类型**而非轴——启用 `scale` 即过渡全部 transform 变化(含 translate/rotation 的变化)。
4. **Rotation 的 CenterPoint 固定为元素中心**:WinUI 需先设 `CenterPoint` 再改 Rotation(默认 (0,0) 会绕左上角转);Web 版固定 `transform-origin: center`,等价官方示例的设置。
5. **BrushTransition 仅纯色**:CSS 只能对 `background-color` 插值,`LinearGradientBrush` 等渐变画刷无法过渡(官方 Rotation 示例的渐变填充在 Web 端以纯色/强调色 token 等价呈现)。
6. **主题切换示例未复刻**:官方第 6 例(Grid `BackgroundTransition` 在深浅主题切换时自动动画背景)依赖全局主题切换;Web 版主题切换是站点级关注点,示例页以「Background 三档强调色预设按钮切换」演示同一 `BrushTransition` 机制,机制等价。
7. **transform 合成的顺序约定**:组件内联样式固定按 WinUI 合成矩阵顺序写 `translate(...) rotate(...) scale(...)`;若使用方经 `class`/外部 CSS 再追加 transform 会被内联样式覆盖,需调整时直接改用对应 props。

## 官方示例对照

对照 `CK/WinUI-Gallery/WinUIGallery/Samples/ImplicitTransition/ImplicitTransitionPage.xaml`(六个 ControlExample):

- Opacity(`ScalarTransition` + NumberBox/Set 按钮)→ 演示一「Opacity 0.5/0.2/1 预设按钮」(同一 Rectangle 50×50、强调色填充的等价呈现);
- Rotation(`RotationTransition` + CenterPoint)→ 演示一「Rotation 0/45/180° 预设」(Web 版固定绕中心);
- Scale(`ScaleTransition` + 0.5/1/2 三按钮 + Components 复选)→ 演示一「Scale 0.5/1/2 预设」;Components 复选的 Web 等价是参数面板的**过渡类型多选**(粒度差异见差异 3);
- Translation(`TranslationTransition` + (0,0)/(100,100)/(200,200) 预设 + Components 复选)→ 演示一「Translation 预设按钮」;
- Background(`BrushTransition` Blue ↔ Yellow)→ 演示一「Background 色板切换」(强调色三档 token);
- Grid 主题切换(`BrushTransition` + 主题变更)→ 机制并入 Background 演示(见差异 6)。

示例页另有两处官方没有、但用于讲清概念的演示:**无过渡 vs 有过渡显式对照**(同一状态双列,`transitions=[]` 即 WinUI 默认)、**开关切换**(ToggleSwitch 驱动通知卡片,opacity/translate/scale 组合过渡)与**随机变更**(任意属性变化均自动过渡)。

## 相关链接

- 演示页源码:[demo/pages/ImplicitTransitionPage.vue](../../demo/pages/ImplicitTransitionPage.vue)
- 组件源码:[src/components/ImplicitTransitions.vue](../../src/components/ImplicitTransitions.vue)
- 动效 token:[src/styles/animations.css](../../src/styles/animations.css)
- 同类动画机制:PageTransition(页面级导航过渡)、ThemeTransition(主题切换过渡)、AnimatedIcon(状态驱动的图标动画)
