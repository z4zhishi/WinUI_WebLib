# AnimatedIcon

> 在线示例:[/#/animatedicon](/#/animatedicon) · 演示页源码:[demo/pages/AnimatedIconPage.vue](../../demo/pages/AnimatedIconPage.vue)

## 概述

AnimatedIcon 是一个**显示并控制「随用户交互而动画」的图标**的元素:宿主控件(或组件自治跟踪)把状态(Normal / PointerOver / Pressed / Disabled)交给**源对象(Source)**,源按状态机切换动画。在 WinUI 中,动画由 Adobe AfterEffects 制作、经 [Lottie-Windows](https://learn.microsoft.com/windows/communitytoolkit/animations/lottie) / LottieGen 转成 `IAnimatedVisualSource2` 实现(如 `AnimatedSettingsVisualSource`);Web 版采用**务实分层**:本任务定义源对象接口(状态机 + 播放进度)并提供 CSS/SVG 驱动的内置演示源,**完整 Lottie 源体系留后续**——引入 lottie-web 需先登记 `docs/tools.md`(当前为空表),`AnimatedIconSource.kind` 判别字段已为其预留 `'lottie'` 扩展位。源不可用(缺失 / kind 未知 / 减少动态偏好 / 强制降级)时渲染 `FallbackIconSource` 静态降级图标,与 WinUI「动画创建失败走 Fallback」语义一致。

官方文档:

- [AnimatedIcon - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.animatedicon)
- [AnimatedIcon 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/animated-icon)
- [Lottie Overview](https://learn.microsoft.com/windows/communitytoolkit/animations/lottie)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `source` | `AnimatedIconSource` | `null` | 图标源(见下「源约定」);缺省或 `kind` 未知时走 fallback |
| `fallback` | `AnimatedIconFallbackSource`(`type: 'font' \| 'svg'`) | `null` | 降级源(WinUI `FallbackIconSource` 的 Web 简化):`font` 为图标字体字形(等价 `FontIconSource`),`svg` 为内联 SVG 标记;未提供时渲染同尺寸空占位 |
| `state` | `'Normal' \| 'PointerOver' \| 'Pressed' \| 'Disabled'` | `null`(自治) | 宿主驱动状态(`AnimatedIcon.SetState` 等价,受控模式);缺省时组件自治跟踪 hover / press |
| `disabled` | `boolean` | `false` | 禁用:恒呈 Disabled 态(优先于 `state`),图标取禁用色 token |
| `forceFallback` | `boolean` | `false` | 强制走降级源(Web 扩展:演示降级 / 不支持动画的宿主环境) |
| `size` | `number \| string` | `20` | 图标尺寸(px 或 CSS 长度;WinUI 经 Width/Height 由使用方设定) |
| `foreground` | `string` | 继承 `currentColor` | 前景色;Disabled 态强制禁用色 |
| `progress` | `number` | — | 播放进度 0–1(`SetProgress` 预留):写入根元素 CSS 变量 `--wui-animatedicon-progress`,CSS 源不消费,供未来 Lottie 源使用 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| —(无业务事件) | — | 纯展示图标:不派发事件、不参与焦点序;`aria-hidden` 默认 `true`(可经 attrs 覆盖),可访问名由宿主控件承载 |

## 源约定(AnimatedIconSource)

源对象是一份可序列化的声明数据(`src/components/AnimatedIconSource.ts`):SVG 部件 + 状态机表,由组件统一渲染并驱动。

```ts
/** 播放状态机(WinUI 状态串,大小写敏感) */
type AnimatedIconState = 'Normal' | 'PointerOver' | 'Pressed' | 'Disabled'

/** 源的一个 SVG 部件:静态标记 + 状态机表 */
interface AnimatedIconSourcePart {
  readonly name: string
  readonly svg: string // 部件 SVG 片段(fill/stroke 用 currentColor)
  readonly states: Partial<Record<AnimatedIconState, { transform?: string; opacity?: number }>>
}

/** 源约定:kind 判别字段,预留后续 Lottie 源('lottie')扩展 */
interface AnimatedIconSource {
  readonly kind: 'css-svg'
  readonly name: string
  readonly viewBox: string
  readonly transitionSpeed?: 'fast' | 'normal' | 'slow' // → animations.css 时长 token
  readonly parts: readonly AnimatedIconSourcePart[]
}
```

内置演示源(实现该约定的简化复刻):

| 内置源(name) | 状态行为(Normal → PointerOver → Pressed) | 过渡档 |
| --- | --- | --- |
| `AnimatedChevronUpDownSmallVisualSource` | 悬停翻面(下 → 上),按压缩放反馈 | fast(167ms) |
| `AnimatedSettingsVisualSource` | 悬停转过 120°,按压整转 360° | slow(350ms) |
| `AnimatedPlayPauseVisualSource` | 悬停在播放三角 / 暂停双条间切换,按压收缩 | normal(240ms) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiAnimatedIcon from '@/components/AnimatedIcon.vue'
import { AnimatedSettingsVisualSource } from '@/components/AnimatedIconSource'
import type { AnimatedIconState } from '@/components/AnimatedIconSource'

// 宿主驱动模式(等价官方示例:宿主在 PointerEntered/Exited 中调用 SetState)
const state = ref<AnimatedIconState>('Normal')
</script>

<template>
  <!-- 宿主驱动:hover 进出切换状态;降级源为 FontIconSource Glyph \uE713 -->
  <button @pointerenter="state = 'PointerOver'" @pointerleave="state = 'Normal'">
    <WuiAnimatedIcon
      :source="AnimatedSettingsVisualSource"
      :state="state"
      :fallback="{ type: 'font', glyph: '\uE713' }"
      :size="20" />
  </button>

  <!-- 自治模式:不传 state,组件自行跟踪 hover / press -->
  <WuiAnimatedIcon :source="AnimatedSettingsVisualSource" :size="48" />
</template>
```

## 无障碍

- 图标为装饰性内容:根元素默认 `aria-hidden="true"`(同 FontIcon 族),可访问名由宿主控件(按钮 / 导航项)承载;可通过 attrs 覆盖(如显式提供 `aria-label`)。
- 不参与焦点序(WinUI 同理:焦点落在宿主控件上)。
- `prefers-reduced-motion: reduce` 时自动降级为静态图标;`animations.css` 的全局减少动态规则同时把过渡时长压到 0.01ms,双保险。

## 与 WinUI 的差异(视觉与行为对照)

AnimatedIcon 在 `generic.xaml` 中**没有 ControlTemplate**(视觉全部来自 Source,状态经 `StateProperty` 依赖属性传入);对照锚点为 `CK/WinUI-Reference/controls/dev/AnimatedIcon/`(idl + AnimatedVisuals 源 + Docs)与官方 Gallery 示例。差异如下:

| # | 差异项 | 说明 |
| --- | --- | --- |
| 1 | **无 Lottie(分层声明)** | WinUI 内置源由 LottieGen 从 AfterEffects 生成 composition 动画;Web 版本阶段只实现**接口 + CSS/SVG 源**(过渡动画近似),完整 Lottie 源体系留后续:引入 lottie-web 依赖前须登记 `docs/tools.md`(当前为空表),届时以 `kind: 'lottie'` 扩展源判别联合,`progress` 语义即 `IAnimatedVisualSource2.SetProgress` |
| 2 | **状态来源** | WinUI 中 AnimatedIcon 自身不跟踪指针,状态完全由宿主控件(NavigationViewItem / Button / Expander 等)经 `SetState` 依赖属性设置;Web 版组件默认**自治跟踪** hover/press(单组件即可用),`state` prop 为受控模式(SetState 等价),`disabled` 优先于 `state`(WinUI 由宿主在禁用时应设 Disabled) |
| 3 | **FallbackIconSource 简化** | WinUI 为 `IconSource` 体系(FontIconSource / SymbolIconSource / BitmapIconSource);Web 版为 `type: 'font'(字形)/ 'svg'(内联标记)` 联合类型。触发条件:源缺失 / kind 未知 / `forceFallback` / `prefers-reduced-motion`(WinUI 为动画创建失败) |
| 4 | **内置源为简化复刻** | 源动画为多段 marker 时间线(如 Settings:progress 绑定旋转 0→360 / 0→-20 多段 + 18 段 NormalToPointerOver_Start/End 类 marker;Chevron:18 段 On/Off 组合),Web 以单段 CSS transition 近似,角度 / 缩放取演示观感值,**未逐段换算**;`AnimatedPlayPauseVisualSource` 不在本仓库 CK 参照内(属 MediaTransportControls 族),按 WinUI 公开行为复刻 |
| 5 | **progress 仅接口预留** | WinUI 内置源的动画进度由 composition 表达式驱动;CSS 源以 transition 自行推进,`progress` prop / `AnimatedIconSourceContext.progress` 仅写入 CSS 变量 `--wui-animatedicon-progress` 预留 |
| 6 | **MirroredWhenRightToLeft 未实现** | 项目暂无 RTL 基建(WinUI `MirroredWhenRightToLeft` 属性省略) |
| 7 | **尺寸** | WinUI 无默认尺寸 token(经 Width/Height 或宿主模板约束,NavigationView 内为 16);Web 默认 `size = 20`,与 FontIcon 家族一致 |
| 8 | **动效 token** | 过渡时长 / 缓动取 `src/styles/animations.css`:`transitionSpeed` 三档映射 duration-fast(167ms)/ normal(240ms)/ slow(350ms)+ `--wui-easing-standard`;源的真实时长为 marker 时间线,未逐段换算 |

---

演示页源码:[demo/pages/AnimatedIconPage.vue](../../demo/pages/AnimatedIconPage.vue) · 组件源码:[src/components/AnimatedIcon.vue](../../src/components/AnimatedIcon.vue) · 源约定:[src/components/AnimatedIconSource.ts](../../src/components/AnimatedIconSource.ts)
