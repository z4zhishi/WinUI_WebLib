# Page Transitions

在线示例:[/#/pagetransition](/#/pagetransition)

## 概述

页面转场(Page Transitions)为导航提供**页面间关系的视觉反馈**:前进时新页从右侧滑入 / 淡入上浮,后退时播放镜像动画。WinUI 中转场挂在 `Frame.ContentTransitions` 上,由 `NavigationThemeTransition` + 一个 `NavigationTransitionInfo` 子类(Entrance / DrillIn / Slide / Common / Continuum / Suppress)决定具体动画;**缺省 Info 即 EntranceNavigationTransitionInfo**(源码 `ThemeTransitions.cpp` L233)。

本项目的 Web 复刻由三部分组成:

| 交付物 | 角色 |
| --- | --- |
| `src/utils/transitions.ts` | 转场种类类型、`getNavigationTransition()`(kind + direction → Vue `<Transition>` 类名)、ConnectedAnimation 工具(见 [ConnectedAnimation](./ConnectedAnimation.md)) |
| `src/components/NavigationThemeTransition.vue` | 「Frame」形态的包装组件:`viewKey` 变化即导航,内部用 Vue `<Transition>` 播放转场 |
| `src/components/EntranceNavigationThemeTransition.vue` | 内容入场 stagger(ThemeTransition 家族的 EntranceThemeTransition,见下文「Theme Transitions」节) |

动画关键帧与类名全部定义在 `src/styles/animations.css` 的 `wui-nav-*` 段:时长保留 WinUI 源码实测的精确颗粒(150/300/450/250/600/556/128/783/333/100ms);缓动按源落值 —— 显式 KeySpline 取 `--wui-easing-standard / decelerate / accelerate` token,代码构造的 ExponentialEase(6)/CircleEase 取 `--wui-easing-expo-out-6 / -expo-in-6 / -circle-out`(CSS `linear()` 按公式 1/64 采样,`EasingFunctions.cpp` L52-147;MR3/B10)。参数逐条对照 `CK/WinUI-Reference/dxaml/phone/lib/ThemeTransitions.cpp`(MIT)各 `NavigationTransitionInfo::CreateStoryboards` 的四个触发态(NavigatingTo / Away + Back 前缀)。

官方文档:

- [NavigationThemeTransition - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.animation.navigationthemetransition)
- [Page transitions - Guidelines](https://learn.microsoft.com/windows/apps/design/motion/page-transitions)

## NavigationTransitionInfo ↔ Web 转场对照(源码实测)

| WinUI(NavigationTransitionInfo) | `info` 值 | 动画规格(源码实测) | 源出处 |
| --- | --- | --- | --- |
| EntranceNavigationTransitionInfo(缺省) | `default` / `entrance` | 进页:淡入 + 上浮 140px(前 150ms 隐藏,150–450ms 标准曲线);离页:淡出 150ms;退导航镜像(退页下沉 140px) | ThemeTransitions.cpp L3141–L3186 |
| SlideNavigationTransitionInfo(Effect=FromRight/FromLeft) | `slideFromRight` / `slideFromLeft` | 进页:从 ±200px 滑入(150ms 隐藏 + 300ms 标准曲线);离页:向反向 150px 滑出并淡出 150ms | L1515–L1601 |
| SlideNavigationTransitionInfo(Effect=FromBottom/FromTop) | `slideFromBottom` / `slideFromTop` | 纵滑:进页从 ±200px 升入(250ms 隐藏 + 350ms ExpoEase(6,Out),opacity 240→250ms 离散切 1);离页无位移,opacity 于 250ms 处消失;退进纯淡入(250ms);退离 ±200px ExpoEase(6,In) 600ms(opacity 240→250ms 离散切 0)—— MR3/B10 起 ExpoEase 以 linear() 落值 | NavigateTransitionHelper.h L135–L144、ThemeTransitions.cpp L1598–L1680 |
| DrillInNavigationTransitionInfo | `drillIn` | 进页 scale 0.94→1(783ms 标准曲线,origin center)+ 淡入 333ms;离页 scale 1→1.04 + 淡出 100ms;退导航镜像(1.06→1 / 1→0.96) | L2830–L2987 |
| CommonNavigationTransitionInfo | `common` | Turnstile 旋转门:进页 rotateY −80°→0(128ms 隐藏 + 556ms ExpoEase(6,Out))、opacity 128→129ms 离散切 1;离页 0→50°(128ms ExpoEase(6,In));旋转轴心 CenterOfRotationX=−0.1 / Z=−100、透视 ≈999px(PlaneProjection 视锥,MR3/B10 核源) | L557–L880,TURNSTILE_* 常量 |
| ContinuumNavigationTransitionInfo | `continuum` | 背景层 scale 0.9→1 + 淡入(267ms 后 350ms,CircleEaseOut);离页 opacity 120→250ms CircleEaseOut 淡出;退进纯淡入(267→617ms CircleEaseOut,无缩放);退离 translateY 0→200px ExpoEase(6,In) 250ms + 末 10ms 淡出 —— 四触发态独立分支(MR3/B10 起反向不再复用正向);目标元素飞行需 ConnectedAnimation 协同(Web 未映射,见差异 5) | L1826–L2197 |
| SuppressNavigationTransitionInfo | `suppress` | 无动画,内容即时切换 | L3075 |

## NavigationThemeTransition 组件

### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `viewKey` | `string \| number` | —(必填) | 视图键(等价 Frame 导航目标):变化即播放一次页面转场,slot 内容随之切换 |
| `defaultNavigationTransitionInfo` | `NavigationTransitionKind`(上表 9 个值) | `'default'` | 转场种类(等价 `NavigationThemeTransition.DefaultNavigationTransitionInfo`);`default` 与 `entrance` 同为缺省入场 |
| `direction` | `'forward' \| 'backward'` | `'forward'` | 导航方向(等价 `NavigationMode`,决定进/退镜像动画;Web 增强 —— WinUI 由导航 API 内部决定) |

### 事件

无业务事件(声明式动画;WinUI `NavigationThemeTransition` 无完成回调)。

### 基础用法

组件形态(Frame 语义,官方 ContentFrame.Navigate 演示的等价物):

```vue
<script setup lang="ts">
import { ref } from 'vue'
import NavigationThemeTransition from '@/components/NavigationThemeTransition.vue'

const frameSeq = ref(0)          // 每次导航 +1
const frameCurrent = ref(0)      // 当前假想页
const frameDirection = ref<'forward' | 'backward'>('forward')
</script>

<template>
  <NavigationThemeTransition
    :view-key="frameSeq"
    default-navigation-transition-info="slideFromRight"
    :direction="frameDirection"
  >
    <SamplePage :n="frameCurrent" />
  </NavigationThemeTransition>
</template>
```

裸 vue-router 形态(路由切换即转场;`kind` / `direction` 由业务按导航语义维护):

```vue
<template>
  <router-view v-slot="{ Component, route }">
    <Transition v-bind="getNavigationTransition(kind, direction)">
      <div class="wui-nav-frame" :key="route.fullPath">
        <component :is="Component" />
      </div>
    </Transition>
  </router-view>
</template>
```

说明:`getNavigationTransition(kind, direction)` 返回 `{ enterActiveClass, leaveActiveClass }`,spread 到 `<Transition>` 即可;`.wui-nav-frame` 用 grid 把新旧视图叠放在同一格(等价 Frame 两页叠放,离开页不把布局顶开),在 `animations.css` 中定义。`suppress` 返回空类名,Vue 检测不到过渡时长时立即完成,等价「无转场」。

## Theme Transitions(ThemeTransition 家族)

Theme transitions 是 WinUI 预打包的即用型动画;官方 ThemeTransitionPage 的示例对应关系与 Web 实现:

| WinUI | 官方示例 | Web 映射 |
| --- | --- | --- |
| EntranceThemeTransition(挂 `ChildrenTransitions`,`IsStaggeringEnabled=True`) | Add one / Add five / Clear all | `EntranceNavigationThemeTransition` 组件:监听子元素(MutationObserver),初始与新增子元素按批次错峰上浮入场 |
| RepositionThemeTransition | Reposition | 布局位置变化无 CSS 过渡通道,对声明过渡的元素做 FLIP(反向位移 → 过渡归零) |
| ContentThemeTransition | Refresh data | 整组内容替换时淡出淡入(复用 `animations.css` 的 `wui-fade-in / wui-fade-out`) |
| AddDeleteThemeTransition | Add / Delete / Add and Del | `<TransitionGroup>`:新条目 ±32px 滑入(motion-notes 列表位移规格 333ms / standard)、旧条目滑出、兄弟条目 move 过渡补位 |
| PopupThemeTransition | Show Popup | 由 Popup / MenuFlyout 等弹层组件承担(`wui-popup-slide-*` 50px 方向位移组),不单独提供组件 |

另外,Web 端「明暗切换」本身可以做成元素过渡:主题值全部走 `--wui-*` token 的元素声明 `transition: background-color / color / border-color`(normal 档 240ms + standard),切换 `html[data-theme]` 时颜色即渐变而非跳变(示例页第 2 节例 5)。

### EntranceNavigationThemeTransition 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fromHorizontalOffset` | `number` | `0` | 入场起点水平偏移 px(WinUI FromHorizontalOffset) |
| `fromVerticalOffset` | `number` | `28` | 入场起点垂直偏移 px(正值 = 从下方上浮;WinUI FromVerticalOffset) |
| `isStaggeringEnabled` | `boolean` | `true` | 子元素是否错峰入场(WinUI IsStaggeringEnabled) |
| `staggerInterval` | `number` | `67` | 错峰间隔 ms(Web 增强,平台内定不可配) |
| `duration` | `number \| 'fast' \| 'normal' \| 'slow'` | `'normal'` | 单元素入场时长(Web 增强);档位 → `animations.css` 时长 token(167/240/350ms) |
| `easing` | `string` | `'standard'` | 入场缓动(Web 增强);standard/decelerate/accelerate → 缓动 token |
| `trigger` | `string \| number` | — | 触发键:变化时对当前全部子元素重放入场(Web 增强) |

组件动画结束后会摘除入场类与延迟,不在子元素上残留 `transform` / stacking context。

## 与 WinUI 的差异说明

1. **时长未并入三档 token**:页面转场是四触发态(进/退 × 进页/离页)的精确时间线(150+300、250+350、128/556、783/333、100ms),与 `animations.css` 的 fast/normal/slow 三档聚类是不同粒度;关键帧保留源码实测值并在注释标注行号,缓动按源落值(显式 KeySpline → `--wui-easing-*`;ExponentialEase(6)/CircleEase → `linear()` 采样 token,MR3/B10)。
2. **离开曲线取 token 近似(仅横向/Entrance 余留)**:横向 Slide 与 Entrance 的离页 spline 为 `(0.7,0 1,.5)`(ThemeTransitions.cpp L1548 等),未 token 化,仍以 `--wui-easing-accelerate`(`0.2,0 0,1`)近似;纵滑/Turnstile/Continuum 的代码构造缓动已按 `EasingFunctions.cpp` 公式精确落值。
3. **opacity 离散切换**:源的进/离页 opacity 多为离散翻转(150/250/128ms 处 0↔1,Discrete 帧);MR3/B10 起纵滑/Turnstile/Continuum 关键帧按 1ms 邻位关键帧复刻离散切换(相邻百分比差 ≤0.2%),横向 Slide 仍按段渐变(遗留,见报告)。
4. **纵滑 FromTop 为镜像实现**:CK 手机版源码的纵滑分支未按 FromTop/FromBottom 区分符号(L1598 起共用同一分支);Web 按 API 语义镜像(FromBottom 从下方 +200px,FromTop 从上方 −200px)。
5. **Continuum 仅映射页面层**:源中 continuum 目标元素的 3D 翻转/飞行与 PlaneProjection 强耦合,且语义上需 ConnectedAnimation 协同;Web 端四触发态按源复刻背景层(进:scale 0.9→1 + 离散淡入;离:120→250ms 淡出;退进:267→617ms 纯淡入;退离:250ms 下沉 + 末 10ms 淡出),目标元素层未映射。
6. **Common(Turnstile)的 3D 轴心与透视**:源用 PlaneProjection RotationY,轴心 CenterOfRotationX = −0.1、CenterOfRotationZ = −100(源常量 `TURNSTILE_AXIS_X/Z`,ThemeTransitions.cpp L8-9);Web 用容器 `perspective: 999px`(.wui-nav-frame,由 PlaneProjection 视锥 near 1 / far 1001 / FOV 57° / zOffset −999 推得,MR3/B10 核源)+ `translateZ(100px) rotateY(θ) translateZ(-100px)` 夹层 + `transform-origin: -10% center`,四分支同轴心(与源一致)。
7. **方向显式化**:WinUI 的进/退由 `NavigationMode`(Navigate/GoBack)内部决定;Web 组件经 `direction` prop 显式传入,vue-router 场景需业务在守卫里维护方向。
8. **reduced-motion 全局降级**:`animations.css` 的 `prefers-reduced-motion` 块把动画/过渡的时长与延迟都压至 0.01ms,转场与 stagger 均近似瞬时完成。

## 相关

- 共享元素飞入:[ConnectedAnimation](./ConnectedAnimation.md)
- 属性级隐式过渡:[ImplicitTransition](./ImplicitTransition.md)

---

演示页源码:[demo/pages/PageTransitionPage.vue](../../demo/pages/PageTransitionPage.vue)
