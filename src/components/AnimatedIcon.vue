<script setup lang="ts">
// AnimatedIcon —— WinUI AnimatedIcon 的 Web 复刻(阶段 7 动效,务实分层)。
// 显示一个随交互状态(Normal/PointerOver/Pressed/Disabled)切换动画的图标元素:
//   - source:AnimatedIconSource 约定(见 ./AnimatedIconSource.ts)——本阶段为 CSS/SVG 驱动的
//     声明式源(SVG 部件 + 状态机表,kind 判别字段预留 Lottie 扩展);完整 Lottie 源体系
//     (lottie-web)留后续,引入前须登记 docs/tools.md;
//   - fallback(WinUI FallbackIconSource):源缺失 / kind 未知 / forceFallback /
//     prefers-reduced-motion(不支持动画的环境)时渲染的静态降级图标(字形或内联 SVG);
//   - 状态来源:WinUI 中状态由宿主控件(NavigationViewItem / Button)经 AnimatedIcon.SetState
//     依赖属性设置,控件自身不跟踪指针;Web 版默认自治跟踪 hover/press(单组件即可用),
//     state prop 提供受控模式(SetState 等价),disabled 优先于 state(禁用恒呈 Disabled)。
// 视觉对照:AnimatedIcon 在 generic.xaml 无 ControlTemplate(视觉全部来自 Source),
// 尺寸 / 前景由使用方决定;图标为装饰性内容,默认 aria-hidden,可访问名由宿主承载(同 FontIcon 族)。
// 动效:部件过渡时长 / 缓动取 src/styles/animations.css 的 token(本组件引入该文件)。
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import { useReducedMotion } from '../composables/useReducedMotion'
import '../styles/animations.css'
import {
  ANIMATED_ICON_TRANSITION_DURATION,
  resolvePartState,
  type AnimatedIconFallbackSource,
  type AnimatedIconSource,
  type AnimatedIconSourcePart,
  type AnimatedIconState,
} from './AnimatedIconSource'

const props = withDefaults(
  defineProps<{
    /** 图标源(AnimatedIconSource 约定);缺省或 kind 未知时走 fallback。 */
    source?: AnimatedIconSource | null
    /** 降级源(WinUI FallbackIconSource 的 Web 简化):图标字体字形 / 内联 SVG。 */
    fallback?: AnimatedIconFallbackSource | null
    /** 宿主驱动状态(AnimatedIcon.SetState 等价,受控模式);缺省时组件自治跟踪 hover/press。 */
    state?: AnimatedIconState | null
    /** 禁用:恒呈 Disabled 态(优先于 state),图标取禁用色 token。 */
    disabled?: boolean
    /** 强制走降级源(Web 扩展):演示降级效果 / 宿主环境不支持动画时使用。 */
    forceFallback?: boolean
    /** 图标尺寸:数字按 px,字符串原样作为 CSS 长度;缺省 20(与 FontIcon 家族一致)。 */
    size?: number | string
    /** 前景色,任意 CSS 颜色/变量;缺省继承 currentColor,Disabled 态强制禁用色。 */
    foreground?: string
    /** 播放进度 0–1(SetProgress 预留):写入根元素 --wui-animatedicon-progress 变量,CSS 源不消费。 */
    progress?: number
  }>(),
  {
    source: null,
    fallback: null,
    state: null,
    disabled: false,
    forceFallback: false,
    size: 20,
    foreground: undefined,
    progress: undefined,
  },
)

defineOptions({ inheritAttrs: false })

// —— 状态机:disabled 优先于受控 state;无受控值时自治跟踪 hover/press ——
const hovered = ref(false)
const pressed = ref(false)

const resolvedState = computed<AnimatedIconState>(() => {
  if (props.disabled) return 'Disabled'
  if (props.state !== null) return props.state
  if (hovered.value) return pressed.value ? 'Pressed' : 'PointerOver'
  return 'Normal'
})

function onPointerEnter(): void {
  if (props.disabled) return
  hovered.value = true
}

function onPointerLeave(): void {
  hovered.value = false
  pressed.value = false
}

function onPointerDown(): void {
  if (props.disabled) return
  pressed.value = true
}

function onPointerUp(): void {
  pressed.value = false
}

// —— 动画环境检测:用户偏好减少动态(prefers-reduced-motion: reduce)→ 降级静态图标
//    (MR3/B8:改用共享组合式,替代本组件手挂 MediaQueryList;CSS 路径由
//    animations.css 全局块承担)——
const reducedMotion = useReducedMotion()

// —— 降级判定:强制 / 减少动态偏好 / 源缺失 / 未知 kind(等价 WinUI 动画创建失败走 fallback)——
const showFallback = computed(
  () =>
    props.forceFallback ||
    reducedMotion.value ||
    props.source === null ||
    props.source.kind !== 'css-svg',
)

// —— 尺寸 / 前景 / progress 变量 ——
const sizeStyle = computed<string>(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size,
)

const rootStyle = computed(() => {
  const style: Record<string, string | number | undefined> = {
    width: sizeStyle.value,
    height: sizeStyle.value,
    // font 降级字形与图标同尺寸(1em = size)
    fontSize: sizeStyle.value,
    // Disabled 整体置灰(WinUI 图标禁用态为 SystemControlDisabledBaseMediumLow)
    color:
      resolvedState.value === 'Disabled'
        ? 'var(--wui-system-control-disabled-base-medium-low)'
        : props.foreground,
  }
  if (props.progress !== undefined) {
    style['--wui-animatedicon-progress'] = String(props.progress)
  }
  return style as CSSProperties
})

// —— 源渲染:部件过渡时长档 + 各部件在当前状态下的目标样式 ——
const transitionDuration = computed(() =>
  ANIMATED_ICON_TRANSITION_DURATION[props.source?.transitionSpeed ?? 'normal'],
)

function partStyle(part: AnimatedIconSourcePart): Record<string, string | number | undefined> {
  const target = resolvePartState(part, resolvedState.value)
  return {
    transform: target.transform,
    opacity: target.opacity,
    transitionDuration: transitionDuration.value,
  }
}

// —— 降级渲染 ——
const glyphStyle = computed<Record<string, string | undefined>>(() => {
  const fallback = props.fallback
  if (fallback === null || fallback.type !== 'font') return {}
  return {
    fontFamily: 'var(--wui-symbol-theme-font-family)',
    fontSize:
      fallback.fontSize === undefined
        ? undefined
        : typeof fallback.fontSize === 'number'
          ? `${fallback.fontSize}px`
          : fallback.fontSize,
  }
})

const svgFallback = computed(() => {
  const fallback = props.fallback
  return fallback !== null && fallback.type === 'svg' ? fallback : null
})
</script>

<template>
  <!-- 图标为装饰性内容:默认 aria-hidden,写于 v-bind="$attrs" 之前以便调用方覆盖(如提供 aria-label) -->
  <span
    aria-hidden="true"
    v-bind="$attrs"
    class="wui-animatedicon"
    :data-state="resolvedState"
    :style="rootStyle"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- 动画源:每个部件一个 <g>,样式随状态内联切换,过渡由类选择器承载 -->
    <svg
      v-if="!showFallback && source"
      class="wui-animatedicon__visual"
      :view-box="source.viewBox"
      focusable="false"
      aria-hidden="true"
    >
      <g
        v-for="part in source.parts"
        :key="part.name"
        class="wui-animatedicon__part"
        :data-wui-part="part.name"
        :style="partStyle(part)"
        v-html="part.svg"
      />
    </svg>

    <!-- 降级源 1:图标字体字形(等价 FontIconSource Glyph) -->
    <span
      v-else-if="fallback && fallback.type === 'font'"
      class="wui-animatedicon__glyph"
      :style="glyphStyle"
      >{{ fallback.glyph }}</span
    >

    <!-- 降级源 2:内联 SVG(等价 PathIcon / 静态图标源) -->
    <svg
      v-else-if="svgFallback"
      class="wui-animatedicon__visual"
      :view-box="svgFallback.viewBox ?? '0 0 16 16'"
      v-html="svgFallback.markup"
      focusable="false"
      aria-hidden="true"
    />
  </span>
</template>

<style scoped>
.wui-animatedicon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: inherit;
  /* 图标不可选中(WinUI 控件默认行为) */
  user-select: none;
  -webkit-user-select: none;
}

.wui-animatedicon__visual {
  width: 100%;
  height: 100%;
  color: inherit;
  /* 状态过渡中的 scale 形变(如 play/pause morph 的 1.5→1)不裁切 */
  overflow: visible;
}

/* 部件过渡:时长档由内联 transition-duration 覆盖(随 source.transitionSpeed 取 token) */
.wui-animatedicon__part {
  transform-box: fill-box;
  transform-origin: center;
  transition-property: transform, opacity;
  transition-duration: var(--wui-duration-normal);
  transition-timing-function: var(--wui-easing-standard);
}

.wui-animatedicon__glyph {
  line-height: 1;
}

/* reduced-motion:部件过渡由 animations.css 全局块压至 0.01ms(MR3/B8 去重,
   局部块与全局语义重复已删);JS 侧静态图标降级走 useReducedMotion() */
</style>
