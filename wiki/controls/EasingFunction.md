# EasingFunction

> 在线示例:[/#/easingfunction](/#/easingfunction)

## 概述

缓动函数(Easing Function)是操纵动画速度曲线的数学工具:输入归一化时间 `t ∈ [0,1]`,输出动画进度。WinUI 在 `Microsoft.UI.Xaml.Media.Animation` 下提供 11 个缓动类(BackEase / BounceEase / CircleEase / CubicEase / ElasticEase / ExponentialEase / PowerEase / QuadraticEase / QuarticEase / QuinticEase / SineEase),每个类配合 `EasingMode`(`EaseIn` 慢进 / `EaseOut` 慢出 / `EaseInOut` 慢进慢出)使用,一条缓动曲线即一个「类 × 模式」组合。

缓动不是控件,没有模板与视觉状态;本库以 **纯函数工具** 形态落地(`src/utils/easingFunctions.ts`),公式逐行对照 WinUI 参照源(`xcp/components/animation/EasingFunctions.cpp` 的各族 `EaseInCore` 与 `CEasingFunctionImpl::Ease` 模式包装),默认值与钳制行为对照 `xcp/core/inc/EasingFunctions.h`,并用参考源集成测试(`dxaml/test/managed/animation/EasingFunctionBaseTests/*.cs`)的 ground truth 值逐点核对(容差 1e-6)。

官方文档:

- [EasingFunctionBase - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.animation.easingfunctionbase)
- [Timing and Easing(时间与缓动设计指引)](https://learn.microsoft.com/windows/apps/design/motion/timing-and-easing)
- [Quickstart: Motion](https://learn.microsoft.com/windows/apps/design/motion)

## 三模式换算(所有族共用)

对照 `EasingFunctions.cpp` 的 `CEasingFunctionImpl::Ease`(默认 `EasingMode` 为 `EaseOut`):

| 模式 | 换算 | 语义 |
| --- | --- | --- |
| `EaseIn` | `EaseInCore(t)` | 慢进:起步缓慢,逐渐加速 |
| `EaseOut` | `1 − EaseInCore(1 − t)` | 慢出:快速起步,缓慢到达 |
| `EaseInOut` | `t < 0.5 ? EaseInCore(2t)/2 : (1 − EaseInCore(2 − 2t))/2 + 0.5` | 慢进慢出:两端缓、中间快 |

## 全族公式(EaseInCore)与 WinUI 默认值

默认值全部取自参照源 `EasingFunctions.h`(注意 `BounceEase.Bounces` 默认 **3**、`BackEase.Amplitude` 默认 **1**,与部分社区资料的说法不同,以参照源 + 集成测试实测为准):

| WinUI 类 | 公式(`t ∈ [0,1]`) | 可调参数(默认值) | 说明 |
| --- | --- | --- | --- |
| `BackEase` | `t³ − t·Amplitude·sin(πt)`(t<0 钳 0) | Amplitude(1) | 回撤/过冲;允许负 Amplitude |
| `BounceEase` | 几何级数分段抛物线(闭式,见 `CBounceInterpolator::EaseInCore`) | Bounces(3,整型)、Bounciness(2) | Bounciness ≤ 1 时钳为 1.01;每次弹跳幅度/时长衰减为 1/Bounciness;负 Bounces 钳 0 |
| `CircleEase` | `1 − √(1 − t²)`(t 钳 [−1,1]) | — | 官方 Standard 示例即 CircleEase EaseInOut |
| `CubicEase` | `t³` | — | |
| `ElasticEase` | `((e^(Springiness·t) − 1)/(e^Springiness − 1))·sin(t·(2π·Oscillations + π/2))` | Oscillations(3,整型)、Springiness(3) | Springiness ≈ 0(≤1e-4)时包络退化为线性 t;负 Oscillations 钳 0 |
| `ExponentialEase` | `(e^(Exponent·t) − 1)/(e^Exponent − 1)` | Exponent(2) | Exponent ≈ 0 时为线性 t;官方 Accelerate/Decelerate 示例即此类(EaseIn Exponent 4.5 / EaseOut Exponent 7) |
| `PowerEase` | `t^max(Power, 0)` | Power(2) | Power=0 时 t⁰ 恒 1(与参照源 `powf` 一致的退化行为) |
| `QuadraticEase` | `t²` | — | |
| `QuarticEase` | `t⁴` | — | |
| `QuinticEase` | `t⁵` | — | |
| `SineEase` | `1 − sin((1 − t)·π/2) ≡ 1 − cos(πt/2)` | — | |

另:WinUI **没有** `LinearEase` 类(参照源与官方示例均不存在);本工具补了一个 `linear` 恒等基准项(`f(t) = t`),便于与 CSS `linear` 对照,条目上已注明。

## 工具函数(`src/utils/easingFunctions.ts`)

| 函数 / 常量 | 签名 | 说明 |
| --- | --- | --- |
| `easingProgress` | `(kind, mode, t, params?) => number` | 单点求值:t ∈ [0,1] → 进度(按公式外推域外值;Back/Elastic 的越界进度是 WinUI 本义,是否夹取由调用方决定) |
| `sampleEasingProgress` | `(kind, mode, samples, params?) => number[]` | 均匀采样 [0,1](含两端,返回 samples+1 个值),直接喂 SVG path / canvas |
| `defaultEasingParams` | `(kind) => EasingParams` | 该族的 WinUI 默认参数(值来自参照源) |
| `getEasingFunction` | `(kind) => EasingFunctionDef` | 取族定义;未知族名抛错(同 themeShadow 工具口径) |
| `EASING_FUNCTIONS` | `readonly EasingFunctionDef[]` | 12 个族定义(WinUI 11 类 + linear 基准):名称 / 说明 / 公式 / 参数元数据 / CSS 关系 / easeInCore |
| `EASING_MODES` | `readonly EasingMode[]` | `['easeIn', 'easeOut', 'easeInOut']` |
| `EASING_FLOAT_EPSILON` | `number` | 0.0001(参照源 FLOAT_EPSILON:Exponent/Springiness 的 ≈0 判定与 Bounciness 钳制阈值) |

## CSS cubic-bezier 关系

CSS 的 `cubic-bezier(x1, y1, x2, y2)` 是**单段三次贝塞尔**:只能表达单调曲线(控制点 y 越界可产生一次过冲,但无法多次振荡)。据此:

- **精确映射**(`cssRelation: 'exact'`):
  - `linear`(全部模式)≡ CSS `linear`;
  - 幂族 `QuadraticEase` / `CubicEase` / `PowerEase`(默认 Power=2)的 **EaseIn / EaseOut** 有数学上精确的映射 —— 当控制点取 `x1 = 1/3, x2 = 2/3` 时 `x(u) = u`,再解 `y(u) = t²`、`y(u) = t³` 得:
    - 二次 In `cubic-bezier(0.33333, 0, 0.66667, 0.33333)`、Out `cubic-bezier(0.33333, 0.66667, 0.66667, 1)`(Out 由 In 关于 (0.5, 0.5) 点镜像得到);
    - 三次 In `cubic-bezier(0.33333, 0, 0.66667, 0)`、Out `cubic-bezier(0.33333, 1, 0.66667, 1)`。
- **近似映射**(`approximate`):单调但非三次多项式的族(Circle / Exponential / Quartic / Quintic / Sine,及各族的 EaseInOut——两段曲线拼接,单一 bezier 必然近似)给出社区通行的 Penner→cubic-bezier 对照值(如 Circle Out ≈ `cubic-bezier(0, 0.55, 0.45, 1)`)。
- **不可表达**(`none`):`BackEase` / `BounceEase` / `ElasticEase` 曲线非单调(回撤 / 多次弹跳 / 振荡),cubic-bezier 无表示 —— `cssEasing` 返回 `null`,必须用本工具的 JS 公式逐帧驱动(rAF)。

每个族定义的 `cssEasing` 按 `easeIn / easeOut / easeInOut` 三键给出可直接用于 CSS `transition-timing-function` / `animation-timing-function` 的字符串。

## 基础用法

```ts
import { easingProgress, sampleEasingProgress, getEasingFunction } from '@/utils/easingFunctions'

// 单点求值:归一化时间 t ∈ [0,1] → 进度(公式逐行对照 WinUI 参照源)
easingProgress('back', 'easeOut', 0.25)
easingProgress('exponential', 'easeIn', 0.5, { exponent: 4.5 })

// 采样整条曲线(64 段 → 65 个进度值)
sampleEasingProgress('circle', 'easeInOut', 64)

// CSS 关系:可表达的族给出 easing 值;Back/Bounce/Elastic 返回 null(用 JS 公式驱动)
getEasingFunction('cubic').cssEasing.easeOut // 'cubic-bezier(0.33333, 1, 0.66667, 1)'(精确)
getEasingFunction('bounce').cssEasing.easeOut // null
```

rAF 驱动示例(与示例页做法一致):

```ts
function frame(now: number): void {
  const t = Math.min(1, (now - startTs) / durationMs)
  const progress = easingProgress('elastic', 'easeOut', t, { oscillations: 3, springiness: 3 })
  element.style.transform = `translateX(${progress * distance}px)`
  if (t < 1) requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
```

## 与 WinUI 的差异说明

1. **float32 → double**:参照源 `EaseInCore` 以 float32(`XFLOAT`)计算,本工具用 double,数值差在 1e-6 量级以内(已用参考源集成测试的 ground truth 逐点核对)。
2. **无 LinearEase**:`linear` 为本工具补充的恒等基准项(WinUI 无此类),用于与 CSS `linear` 对照。
3. **CSS 映射的近似性**:`approximate` 档的 cubic-bezier 为社区通行对照值,非 WinUI 官方给出;`exact` 档中 `PowerEase` 以默认 Power=2 为准,改参数后映射不再精确。Back/Bounce/Elastic 无 CSS 表示,demo 页小球动画一律由 JS 公式驱动(而非 CSS animation)。
4. **参数域**:WinUI 允许 Amplitude 为负、Bounciness 为任意值等,本工具保持参照源的同款钳制(Bounciness ≤ 1+ε → 1.01、负 Bounces/Oscillations → 0、Circle 输入钳 [−1,1]、Back 负时间钳 0);仅 demo 滑块演示范围收窄(见 `EasingParamDef` 的 min/max,与 WinUI 的属性域限制不同,已逐项注明)。
5. **Bounces / Oscillations 为整型**:WinUI 属性即整型;本工具对传入的小数向下取整。
6. **默认 EasingMode 是 EaseOut**(`EasingFunctions.h` 中 `m_eEasingMode = EaseOut`),本工具的 `easingProgress` 显式要求传入 mode,无隐式默认,避免误用。

## 相关

- 演示页源码:[demo/pages/EasingFunctionPage.vue](../../demo/pages/EasingFunctionPage.vue)
- 隐式过渡(ImplicitTransition):属性变化自动过渡,缓动由 `src/styles/animations.css` 的 `--wui-easing-*` token(standard / decelerate / accelerate 三个 cubic-bezier)承担 —— 与本页的 WinUI 缓动族是两套口径:前者是 Fluent 设计 token,后者是 XAML 动画 API 族
- 主题阴影(ThemeShadow):`src/utils/themeShadow.ts`,同为「非控件 API → 纯函数工具」形态
