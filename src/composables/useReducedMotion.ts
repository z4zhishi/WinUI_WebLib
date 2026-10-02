// WinUI_WebLib — prefers-reduced-motion 统一降级组合式(useReducedMotion.ts)
//
// 无障碍降级的**双通道约定**(MR3/B8,与 animations.css 全局降级块配套):
//   - CSS 驱动路径(关键帧 / transition):animations.css 的全局
//     @media (prefers-reduced-motion: reduce) 块统一压短时长并停 infinite,
//     组件内不得再写局部 @media 块(语义重复,见 audit B8);
//   - JS 驱动路径(WAAPI / rAF 补间 / 指针驱动 transform / 播放器起播):
//     媒体查询管不到,组件消费本模块显式降级 ——
//     prefersReducedMotion():时点布尔读数,用于事件处理器 / 一次性判定;
//     useReducedMotion():响应式 Ref,随系统偏好实时变化,用于模板/计算属性。
//
// 共享单个 MediaQueryList 实例;SSR / 无 matchMedia 环境(Safari 13- 等)安全
// 回退为「不减弱」。

import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'

const QUERY = '(prefers-reduced-motion: reduce)'

let sharedQuery: MediaQueryList | null = null

function getQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  if (!sharedQuery) sharedQuery = window.matchMedia(QUERY)
  return sharedQuery
}

/** 当前是否偏好减少动态(非响应式时点读数;供事件处理器 / 初始化判定)。 */
export function prefersReducedMotion(): boolean {
  return getQuery()?.matches ?? false
}

/** 响应式的 prefers-reduced-motion(随系统设置实时变化;setup 内使用)。 */
export function useReducedMotion(): Readonly<Ref<boolean>> {
  const reduced = ref(prefersReducedMotion())
  const onChange = (event: MediaQueryListEvent): void => {
    reduced.value = event.matches
  }
  onMounted(() => {
    getQuery()?.addEventListener('change', onChange)
  })
  onBeforeUnmount(() => {
    getQuery()?.removeEventListener('change', onChange)
  })
  return reduced
}
