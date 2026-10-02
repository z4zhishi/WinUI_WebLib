// WinUI_WebLib — Reveal 揭示光照组合式(useReveal.ts)
//
// 与 src/styles/reveal.css 配套的指针跟踪层:把指针在宿主元素内的位置写入
// --wui-reveal-x / --wui-reveal-y(radial-gradient 光斑中心),并在进入时按源公式
// 计算底板光斑半径写入 --wui-reveal-radius。
//
// 源锚点(mux 材料层,WinUI 3 平台 generic.xaml 已把 *RevealBrush 退役为静态回退色,
// 光照常量取自材料实现):
//  - RevealHoverLight.cpp L141-149 + L163:光斑平面半径
//    = Clamp(Max(W,H) + SizeAdjustment(12), MinSize(16), MaxSize(512))
//    (SpotlightHeight 256 与外锥表达式 tan 相乘后的平面投影);
//  - 指针跟踪:offset 表达式 `pointer.Position + Vector3(0,0,256)`(L163),
//    即光斑中心恒为指针在元素平面上的投影 → Web 取 clientX/Y - 元素左上角。
//
// 启用条件(与 reveal.css 的媒体门一致,JS 侧不再做无效写入):
//  - hover: hover + pointer: fine(仅指针设备;触屏无 hover 光照语义);
//  - 非 prefers-reduced-motion(Reveal 光照属动画类效果,README §4.3 硬规则 6,
//    降级为静态 hover 态 —— 状态色由宿主的 --wui-*-reveal-* token 呈现,无光照);
//  - 非 forced-colors(高对比,对齐源 RevealBrush.cpp IsInFallbackMode 材料策略回退)。

/** 底板光斑半径源公式:Clamp(Max(W,H)+12, 16, 512)(RevealHoverLight.cpp L141-149/L163)。 */
export function revealHaloRadius(width: number, height: number): number {
  return Math.min(Math.max(Math.max(width, height) + 12, 16), 512)
}

/** Reveal 是否在当前环境启用(指针设备 + 非 reduced-motion + 非高对比)。 */
export function isRevealEnabled(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !window.matchMedia('(forced-colors: active)').matches
  )
}

export interface RevealHandlers {
  /** v-on 对象绑定用:pointerenter 时计算并写入光斑半径。 */
  pointerenter: (event: PointerEvent) => void
  /** v-on 对象绑定用:pointermove 时写入光斑中心坐标。 */
  pointermove: (event: PointerEvent) => void
}

/**
 * Reveal 指针跟踪组合式。返回值直接 `v-on="revealHandlers"` 绑到宿主元素即可
 * (键为事件名,配合 reveal.css 的 `wui-reveal` / `wui-reveal--border` 类)。
 *
 * @param enabled 宿主开关(如 Button 的 reveal prop);返回 false 时监听器直接空转,
 *                不写任何 CSS 变量。缺省恒启用(再由 isRevealEnabled 把环境门关掉)。
 */
export function useReveal(enabled?: () => boolean): RevealHandlers {
  function isActive(): boolean {
    return (enabled?.() ?? true) && isRevealEnabled()
  }

  function writePosition(el: HTMLElement, event: PointerEvent): void {
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--wui-reveal-x', `${event.clientX - rect.left}px`)
    el.style.setProperty('--wui-reveal-y', `${event.clientY - rect.top}px`)
  }

  return {
    pointerenter(event: PointerEvent): void {
      if (!isActive()) return
      const el = event.currentTarget
      if (!(el instanceof HTMLElement)) return
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--wui-reveal-radius', `${revealHaloRadius(rect.width, rect.height)}px`)
      writePosition(el, event)
    },
    pointermove(event: PointerEvent): void {
      if (!isActive()) return
      const el = event.currentTarget
      if (!(el instanceof HTMLElement)) return
      // 半径补写(MR8):宿主在指针已位于其上时才挂上光照(demo 开关实时调节、
      // reveal prop 动态切换)时 pointerenter 不会再触发,首次 move 补算一次半径;
      // 半径已在内联样式上(enter 已写过)则跳过,常态零额外开销。
      if (el.style.getPropertyValue('--wui-reveal-radius') === '') {
        const rect = el.getBoundingClientRect()
        el.style.setProperty('--wui-reveal-radius', `${revealHaloRadius(rect.width, rect.height)}px`)
      }
      writePosition(el, event)
    },
  }
}
