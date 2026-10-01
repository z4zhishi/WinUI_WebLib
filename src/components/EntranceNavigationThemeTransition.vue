<script lang="ts">
// EntranceNavigationThemeTransition —— WinUI 内容入场(EntranceThemeTransition,
// ChildrenTransitions + IsStaggeringEnabled)的 Web 复刻。
// WinUI 语义:容器声明一次 ChildrenTransitions,子元素首次出现 / 新增时依次错峰
// (stagger)从偏移处上浮入场;子元素位移量由 FromHorizontalOffset / FromVerticalOffset
// 决定,错峰节奏平台内定不可配(CK 源中 ThemeGenerator 内定,无公开常量)。
// 官方示例:CK/WinUI-Gallery/WinUIGallery/Samples/ThemeTransition/ThemeTransitionPage.xaml
// 例 1(EntranceStackPanel + Add one / Add five / Clear all)。
// Web 落地:容器监听子元素(MutationObserver),初始子元素与后续新增子元素按批次
// 依次加 wui-entrance-item 类(关键帧 wui-entrance-in 定义在 styles/animations.css,
// 位移/时长/缓动/延迟经 --wui-entrance-* CSS 变量注入),动画结束后摘除类与延迟,
// 不残留 transform/stacking context。trigger 变化时全量重放(等价重新挂载容器)。

/** 预设时长档 → animations.css 时长 token(fast 167ms / normal 240ms / slow 350ms)。 */
export const ENTRANCE_DURATIONS = {
  fast: 'var(--wui-duration-fast)',
  normal: 'var(--wui-duration-normal)',
  slow: 'var(--wui-duration-slow)',
} as const

/** 预设缓动档 → animations.css 缓动 token(standard / decelerate / accelerate)。 */
export const ENTRANCE_EASINGS = {
  standard: 'var(--wui-easing-standard)',
  decelerate: 'var(--wui-easing-decelerate)',
  accelerate: 'var(--wui-easing-accelerate)',
} as const

/** token 名 → CSS 值;未知字符串原样返回(允许自定义 cubic-bezier(...) 等)。 */
export function resolveEntranceToken(
  value: string,
  table: Record<string, string>,
): string {
  return table[value] ?? value
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
// ENTRANCE_DURATIONS / ENTRANCE_EASINGS / resolveEntranceToken 来自同文件上方
// 的普通 <script> 块(与 <script setup> 共享模块作用域)。

const props = withDefaults(
  defineProps<{
    /** 入场起点水平偏移 px(WinUI FromHorizontalOffset)。 */
    fromHorizontalOffset?: number
    /** 入场起点垂直偏移 px(WinUI FromVerticalOffset;正值 = 从下方上浮)。 */
    fromVerticalOffset?: number
    /** 子元素是否错峰入场(WinUI IsStaggeringEnabled);false 时全部同时入场。 */
    isStaggeringEnabled?: boolean
    /** 错峰间隔 ms(Web 增强,平台内定不可配)。 */
    staggerInterval?: number
    /**
     * 单个元素入场时长(Web 增强):数字按 ms;'fast' / 'normal' / 'slow' 取
     * animations.css 时长 token;其余字符串原样。
     */
    duration?: number | string
    /**
     * 入场缓动(Web 增强):'standard' / 'decelerate' / 'accelerate' 取
     * animations.css 缓动 token;其余字符串原样。
     */
    easing?: string
    /** 触发键:变化时对当前全部子元素重放一次入场(等价容器重新挂载;Web 增强)。 */
    trigger?: string | number
  }>(),
  {
    fromHorizontalOffset: 0,
    // WinUI 缺省值由 ThemeGenerator 内定(CK 无公开常量);28px 取官方文档示例量级,
    // 页面级导航入场源码实测为 140px(ThemeTransitions.cpp L3180),可按需配置。
    fromVerticalOffset: 28,
    isStaggeringEnabled: true,
    staggerInterval: 67,
    duration: 'normal',
    easing: 'standard',
    trigger: undefined,
  },
)

defineOptions({ inheritAttrs: false })

const container = ref<HTMLElement | null>(null)

let observer: MutationObserver | null = null

/** 把一个元素纳入入场动画:注入变量 + 挂类;animationend 后摘除(不残留副作用)。 */
function animateChild(child: Element, delayMs: number): void {
  if (!(child instanceof HTMLElement)) return
  const durationValue =
    typeof props.duration === 'number'
      ? `${props.duration}ms`
      : resolveEntranceToken(props.duration, ENTRANCE_DURATIONS)
  child.style.setProperty('--wui-entrance-from-x', `${props.fromHorizontalOffset}px`)
  child.style.setProperty('--wui-entrance-from-y', `${props.fromVerticalOffset}px`)
  child.style.setProperty('--wui-entrance-duration', durationValue)
  child.style.setProperty('--wui-entrance-easing', resolveEntranceToken(props.easing, ENTRANCE_EASINGS))
  child.style.setProperty('--wui-entrance-delay', `${delayMs}ms`)
  child.classList.add('wui-entrance-item')

  child.addEventListener(
    'animationend',
    () => {
      child.classList.remove('wui-entrance-item')
      child.style.removeProperty('--wui-entrance-delay')
    },
    { once: true },
  )
}

/** 对一组元素按批次错峰入场。 */
function animateChildren(children: Element[]): void {
  const elements = children.filter((child): child is HTMLElement => child instanceof HTMLElement)
  elements.forEach((child, index) => {
    const delay = props.isStaggeringEnabled ? index * props.staggerInterval : 0
    animateChild(child, delay)
  })
}

/** 全量重放:先摘除再强制回流,保证同一批元素能重新播放。 */
function replayAll(): void {
  const root = container.value
  if (!root) return
  const children = Array.from(root.children)
  for (const child of children) {
    child.classList.remove('wui-entrance-item')
  }
  // 强制同步回流,使移除生效后重新挂类可再次触发动画。
  void root.offsetWidth
  animateChildren(children)
}

function observeChildList(): void {
  const root = container.value
  if (!root || typeof MutationObserver === 'undefined') return
  observer = new MutationObserver((mutations) => {
    // 先汇总整批 mutations 的新增元素,再一次 animateChildren:Vue 的 v-for
    // 批量插入逐节点落 DOM,一批 5 个节点 = 5 条 record × 各 1 节点;若逐 record
    // 调用,每条的 stagger 索引都从 0 重算,批次错峰失效(delay 全 0ms)。
    const added: Element[] = []
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) added.push(node)
      }
    }
    if (added.length > 0) animateChildren(added)
  })
  observer.observe(root, { childList: true })
}

onMounted(() => {
  const root = container.value
  if (root) animateChildren(Array.from(root.children))
  observeChildList()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

watch(
  () => props.trigger,
  () => {
    replayAll()
  },
)
</script>

<template>
  <div v-bind="$attrs" ref="container" class="wui-entrance-transition">
    <slot />
  </div>
</template>

<style scoped>
.wui-entrance-transition {
  display: block;
}
</style>
