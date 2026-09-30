<script lang="ts">
// ImplicitTransitions —— WinUI 隐式过渡(implicit animations)的 Web 复刻(阶段 7 动效)。
// WinUI 中隐式过渡不是可换模板的控件,而是 UIElement 的属性面:Transitions 集合 +
// OpacityTransition / TranslationTransition / ScaleTransition / RotationTransition / BackgroundTransition
// 各 *Transition 属性(ScalarTransition / Vector3Transition / BrushTransition)。
// 语义:「声明一次过渡,此后每次属性变化都自动播放动画」——使用方只改属性,不管动画。
// Web 落地:包装组件(模式同 AcrylicBrush.vue 的 SFC 双 script 块),组件根元素即被动画的
// 「UIElement」,transitions prop 声明启用的过渡(→ CSS transition 属性集),opacity /
// translateX/Y / rotation / scale / background 等 props 即 WinUI 的同名可动画属性——
// 任一 prop 变化,DOM 样式更新,transition 自动播放,无需调用任何动画 API。
// 时长 / 延迟 / 缓动默认取 src/styles/animations.css 的 token(--wui-duration-* / --wui-easing-*);
// WinUI 的 *Transition 本身不暴露时长与缓动(合成器隐式动画参数平台固定),
// 这三个 prop 属 Web 增强,wiki 差异节有声明。
// 概念映射(WinUI → CSS):ScalarTransition → opacity / transform 单值过渡;
// Vector3Transition(Translation/Scale)→ transform(translate/rotate/scale 合一,见 wiki 差异 1);
// BrushTransition(纯色 Background)→ background-color。官方示例:
// CK/WinUI-Gallery/WinUIGallery/Samples/ImplicitTransition/(Opacity/Rotation/Scale/Translation/Background 五例)。

/**
 * 启用的隐式过渡类型(transitions prop 的元素类型)。
 * 与 WinUI 的 *Transition 属性一一对应:
 * - `opacity`   → `UIElement.OpacityTransition`(ScalarTransition)
 * - `translate` → `UIElement.TranslationTransition`(Vector3Transition)
 * - `scale`     → `UIElement.ScaleTransition`(Vector3Transition)
 * - `rotation`  → `UIElement.RotationTransition`(ScalarTransition)
 * - `background`→ `UIElement.BackgroundTransition`(BrushTransition)
 */
export type ImplicitTransitionKind =
  | 'opacity'
  | 'translate'
  | 'scale'
  | 'rotation'
  | 'background'

/** 全部过渡类型(示例页参数面板/文档遍历用)。 */
export const IMPLICIT_TRANSITION_KINDS = [
  'opacity',
  'translate',
  'scale',
  'rotation',
  'background',
] as const

/** 预设时长档 → animations.css token(fast 167ms / normal 240ms / slow 350ms)。 */
export const IMPLICIT_TRANSITION_DURATIONS = {
  fast: 'var(--wui-duration-fast)',
  normal: 'var(--wui-duration-normal)',
  slow: 'var(--wui-duration-slow)',
} as const

/** 预设缓动档 → animations.css token(standard / decelerate / accelerate)。 */
export const IMPLICIT_TRANSITION_EASINGS = {
  standard: 'var(--wui-easing-standard)',
  decelerate: 'var(--wui-easing-decelerate)',
  accelerate: 'var(--wui-easing-accelerate)',
} as const

/** 数字(ms)或字符串时长/延迟归一:数字补 ms 单位;非有限/非正值取 0ms。 */
function resolveTimeValue(value: number | string): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? `${value}ms` : '0ms'
  }
  return value
}
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import '../styles/animations.css'

const props = withDefaults(
  defineProps<{
    /** 启用的隐式过渡类型;默认空数组 = 无过渡(WinUI Transitions 集合默认空),属性变化瞬时生效。 */
    transitions?: ImplicitTransitionKind[]
    /** 不透明度(WinUI Opacity,0.0–1.0,越界夹取);经 opacity 过渡动画。 */
    opacity?: number
    /** 平移 X(WinUI Translation.X,px;Z 分量无 Web 对应)。 */
    translateX?: number
    /** 平移 Y(WinUI Translation.Y,px)。 */
    translateY?: number
    /** 旋转角度(WinUI Rotation,度;官方示例先设 CenterPoint 后改 Rotation,Web 版固定绕元素中心)。 */
    rotation?: number
    /** 等比缩放(WinUI Scale 的 X=Y=Z;WinUI 可按轴独立,Web 版 transform 合一)。 */
    scale?: number
    /** 背景色(WinUI 纯色 Background 的近似,任意 CSS 颜色/变量);经 background-color 过渡。渐变画刷 CSS 不可过渡。 */
    background?: string
    /**
     * 过渡时长(Web 增强,WinUI *Transition 不暴露时长):
     * 数字按 ms;'fast' / 'normal' / 'slow' 取 animations.css 时长 token;其余字符串原样(可为 var(--wui-duration-*) / '240ms')。
     */
    duration?: number | string
    /** 过渡延迟(Web 增强):数字按 ms,其余字符串原样。 */
    delay?: number | string
    /**
     * 缓动(Web 增强):'standard' / 'decelerate' / 'accelerate' 取 animations.css 缓动 token;
     * 其余字符串原样(可为 cubic-bezier(...) 等 CSS 缓动值)。
     */
    easing?: string
  }>(),
  {
    transitions: () => [],
    opacity: 1,
    translateX: 0,
    translateY: 0,
    rotation: 0,
    scale: 1,
    background: undefined,
    duration: 'normal',
    delay: 0,
    easing: 'standard',
  },
)

defineOptions({ inheritAttrs: false })

// —— 过渡类型 → CSS transition 属性集 ——
// WinUI 的 Translation/Scale/Rotation 是三个独立合成属性、各挂各的过渡;
// CSS 只有一个 transform 属性,三者合一:任一启用即过渡 transform(粒度粗化,wiki 差异 1)。
const transitionValue = computed<string | null>(() => {
  const properties: string[] = []
  if (props.transitions.includes('opacity')) properties.push('opacity')
  if (
    props.transitions.includes('translate') ||
    props.transitions.includes('scale') ||
    props.transitions.includes('rotation')
  ) {
    properties.push('transform')
  }
  if (props.transitions.includes('background')) properties.push('background-color')
  if (properties.length === 0) return null // Transitions 空 = 属性变化瞬时生效(WinUI 默认)
  const duration = resolveTimeValue(
    typeof props.duration === 'number'
      ? props.duration
      : (IMPLICIT_TRANSITION_DURATIONS[
          props.duration as keyof typeof IMPLICIT_TRANSITION_DURATIONS
        ] ?? props.duration),
  )
  const easing =
    IMPLICIT_TRANSITION_EASINGS[props.easing as keyof typeof IMPLICIT_TRANSITION_EASINGS] ??
    props.easing
  const delay = resolveTimeValue(props.delay)
  return properties.map((property) => `${property} ${duration} ${easing} ${delay}`).join(', ')
})

// —— 可动画属性 → 内联样式(prop 变化即样式变化,transition 自动播放)——
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const rootStyle = computed<CSSProperties>(() => {
  const style: Record<string, string> = {
    // WinUI 合成矩阵顺序:Translation → Rotation → Scale
    transform: `translate(${props.translateX}px, ${props.translateY}px) rotate(${props.rotation}deg) scale(${props.scale})`,
    opacity: String(clamp01(props.opacity)),
  }
  if (props.background !== undefined) style.backgroundColor = props.background
  const transition = transitionValue.value
  if (transition !== null) style.transition = transition
  return style as CSSProperties
})
</script>

<template>
  <div v-bind="$attrs" class="wui-implicit-transitions" :style="rootStyle">
    <slot />
  </div>
</template>

<style scoped>
.wui-implicit-transitions {
  /* 盒尺寸随内容/调用方(WinUI 中 Width/Height 亦由使用方设定);内联布局便于并排对照 */
  display: inline-block;
  /* Rotation/Scale 围绕元素中心(等价官方示例 CenterPoint = ActualWidth/2, ActualHeight/2) */
  transform-origin: center;
}
</style>
