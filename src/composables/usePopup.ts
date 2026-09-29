// WinUI_WebLib — 弹层定位组合式(usePopup.ts)
//
// 阶段 3 全部弹层控件(ToolTip / Flyout / Popup / ContentDialog / TeachingTip /
// MenuFlyout …)的公共底座,职责:
//   1. usePopupAnchor():宿主控件在锚元素上做标记并拿到可下传的锚引用;
//   2. usePopupLayer(options):弹层内容层的定位 —— Teleport 到 body 后用
//      手写几何算法计算坐标(不依赖 floating-ui 等第三方库):
//      placement(top/bottom/left/right × start/center/end)、flip(视口翻转)、
//      shift(推回视口内)、offset(主轴/交叉轴偏移)、matchAnchorWidth(等宽,
//      供 ComboBox 下拉类);ResizeObserver + scroll/resize 跟随(rAF 节流);
//   3. 自动关闭只以回调接口提供(onOutsidePress / onEscape / onAnchorScroll),
//      何时触发关闭由具体控件决定(ToolTip 只跟随不关闭,MenuFlyout 全开)。
//
// 配套:z-index 分配与焦点辅助在 src/utils/popup.ts;层级/阴影/圆角 token 与
// 公共类在 src/styles/popup.css。接入指南(含最小示例):wiki/controls/_popup-infra.md。
//
// SSR 安全:所有 DOM/浏览器 API 访问都在 mounted 钩子、客户端事件回调或带
// typeof 守卫的函数内;服务端渲染时组合式仅建立响应式关系,不触碰 DOM。

import { onMounted, onScopeDispose, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { nextPopupZIndex } from '@/utils/popup'

/* -------------------------------------------------------------------------
 * 类型
 * ---------------------------------------------------------------------- */

type PopupPlacementBase = 'top' | 'bottom' | 'left' | 'right'

/**
 * 弹层放置位:`<基位>`(锚居中对齐)或 `<基位>-start` / `<基位>-end`(起/末端对齐)。
 * 与 WinUI FlyoutBase Placement 枚举的映射见 wiki/controls/_popup-infra.md
 * (TopEdgeAlignedLeft → 'top-start' 等)。
 */
export type PopupPlacement =
  | `${PopupPlacementBase}`
  | `${PopupPlacementBase}-start`
  | `${PopupPlacementBase}-end`

/** 偏移量:mainAxis 沿放置方向远离锚;crossAxis 沿交叉轴向末端(右/下)推移。 */
export interface PopupOffset {
  mainAxis?: number
  crossAxis?: number
}

/** 视口内边距(推回/翻转判定时的安全距离),默认 8px。 */
const DEFAULT_VIEWPORT_PADDING = 8

export interface UsePopupLayerOptions {
  /** 锚元素(通常传 usePopupAnchor() 返回的 anchorRef)。缺失时弹层不定位。 */
  anchor: MaybeRefOrGetter<Element | null | undefined>
  /** 放置位,默认 'bottom-start'(对齐 MenuFlyout 惯例;FlyoutBase 默认 Top,需要时显式传)。 */
  placement?: MaybeRefOrGetter<PopupPlacement>
  /** 偏移,数字 = 主轴间距(crossAxis 0)。WinUI 各控件有不同的默认间距,由控件自行给值。 */
  offset?: MaybeRefOrGetter<number | PopupOffset | undefined>
  /** 视口放不下时翻转到对侧,默认 true。 */
  flip?: MaybeRefOrGetter<boolean | undefined>
  /** 超出视口时推回安全区内(双轴钳制),默认 true。 */
  shift?: MaybeRefOrGetter<boolean | undefined>
  /**
   * 定位策略,默认 'fixed':层以视口坐标定位(Teleport 到 body 后不受宿主
   * transform/滚动影响,跟随由 scroll 监听负责)。'absolute' 以文档坐标定位,
   * 仅当层根的包含块是初始包含块(body 未定位)时正确,特殊场景再用。
   */
  strategy?: MaybeRefOrGetter<'fixed' | 'absolute' | undefined>
  /** 层与锚同宽(ComboBox 下拉语义),默认 false。 */
  matchAnchorWidth?: MaybeRefOrGetter<boolean | undefined>
  /** 视口安全边距(px),默认 8。 */
  viewportPadding?: MaybeRefOrGetter<number | undefined>
  /**
   * 层的 z-index。缺省时打开时自动分配 nextPopupZIndex()(单调递增,后开在上);
   * 需要固定层级档位时传数字或 CSS var 引用(如 'var(--wui-z-popup-dialog)')。
   */
  zIndex?: MaybeRefOrGetter<number | string | undefined>
  /**
   * 外部按下回调:pointerdown 落在锚与层之外时触发(light dismiss 语义,
   * 典型实现:onOutsidePress={() => (open.value = false)})。
   */
  onOutsidePress?: (event: PointerEvent) => void
  /**
   * Escape 键回调:层打开期间任意 Escape 都会触发;是否要求焦点在层内等
   * 语义由控件自行判断(回调入参是原始事件,可读取 event.target 过滤)。
   */
  onEscape?: (event: KeyboardEvent) => void
  /**
   * 锚滚动回调:滚动事件发生在锚的滚动链上(锚被滚走)时触发。
   * 语义由控件决定:ToolTip 选择继续跟随,部分 Flyout 选择关闭。
   */
  onAnchorScroll?: (event: Event) => void
}

export interface UsePopupLayerReturn {
  /** 绑定到弹层层根元素(Teleport 到 body 内的 v-if 节点)。 */
  layerRef: Ref<HTMLElement | null>
  /**
   * 立即重算一次定位。内容异步渲染/尺寸突变后可手动调用;
   * 常规尺寸变化由 ResizeObserver 跟随覆盖。
   */
  update: () => void
}

export interface UsePopupAnchorReturn {
  /**
   * 绑定到宿主控件根元素(或其中作为锚的节点)。挂载后元素会带上
   * `data-wui-popup-anchor` 标记属性(样式/测试定位用),卸载时移除。
   */
  anchorRef: Ref<HTMLElement | null>
}

/* -------------------------------------------------------------------------
 * usePopupAnchor
 * ---------------------------------------------------------------------- */

/**
 * 宿主控件侧:标记锚元素并取得可下传给 usePopupLayer 的锚引用。
 * 用法:`<span ref="anchorRef">…</span>`(模板 ref 与返回的 anchorRef 同名绑定)。
 */
export function usePopupAnchor(): UsePopupAnchorReturn {
  const anchorRef = ref<HTMLElement | null>(null)

  watch(anchorRef, (element, previous) => {
    previous?.removeAttribute('data-wui-popup-anchor')
    element?.setAttribute('data-wui-popup-anchor', '')
  })
  onScopeDispose(() => {
    anchorRef.value?.removeAttribute('data-wui-popup-anchor')
  })

  return { anchorRef }
}

/* -------------------------------------------------------------------------
 * usePopupLayer(手写定位算法)
 * ---------------------------------------------------------------------- */

interface ResolvedPlacement {
  base: PopupPlacementBase
  align: 'start' | 'center' | 'end'
}

function resolvePlacement(value: PopupPlacement | undefined): ResolvedPlacement {
  const raw = value ?? 'bottom-start'
  const base: PopupPlacementBase = raw.startsWith('top')
    ? 'top'
    : raw.startsWith('bottom')
      ? 'bottom'
      : raw.startsWith('left')
        ? 'left'
        : 'right'
  const align = raw.endsWith('-start') ? 'start' : raw.endsWith('-end') ? 'end' : 'center'
  return { base, align }
}

function resolveOffset(value: number | PopupOffset | undefined): Required<PopupOffset> {
  if (typeof value === 'number') return { mainAxis: value, crossAxis: 0 }
  return { mainAxis: value?.mainAxis ?? 0, crossAxis: value?.crossAxis ?? 0 }
}

/** 已由本组合式分配过 z-index 的层元素(v-if 重挂载后重新分配)。 */
const zIndexAssigned = /* @__PURE__ */ new WeakSet<HTMLElement>()

/**
 * 弹层内容侧:Teleport 到 body 的层根元素上绑定 layerRef,由本组合式
 * 直接写入 position/left/top(/width/z-index)内联样式完成定位。
 *
 * 推荐骨架(完整示例见 wiki/controls/_popup-infra.md):
 * ```vue
 * <Teleport to="body">
 *   <div v-if="open" ref="layerRef" class="wui-popup-layer wui-popup-skin-flyout">…</div>
 * </Teleport>
 * ```
 */
export function usePopupLayer(options: UsePopupLayerOptions): UsePopupLayerReturn {
  const layerRef = ref<HTMLElement | null>(null)

  let rafId: number | null = null
  let resizeObserver: ResizeObserver | null = null
  let observedAnchor: Element | null = null
  let observedLayer: HTMLElement | null = null
  let appliedMatchWidth = false

  function computePosition(): void {
    const layer = layerRef.value
    const anchorElement = toValue(options.anchor)
    // SSR / 元素未就绪:不定位
    if (typeof document === 'undefined' || !layer || !anchorElement) return

    // ---- 读选项(支持响应式更新) ----
    const placement = resolvePlacement(toValue(options.placement))
    const strategy = toValue(options.strategy) ?? 'fixed'
    const doFlip = toValue(options.flip) ?? true
    const doShift = toValue(options.shift) ?? true
    const padding = Math.max(0, toValue(options.viewportPadding) ?? DEFAULT_VIEWPORT_PADDING)
    const { mainAxis, crossAxis } = resolveOffset(toValue(options.offset))
    const matchWidth = toValue(options.matchAnchorWidth) ?? false

    // ---- z-index:每层元素只分配一次(可用 zIndex 选项覆盖) ----
    if (!zIndexAssigned.has(layer)) {
      zIndexAssigned.add(layer)
      layer.style.zIndex = String(toValue(options.zIndex) ?? nextPopupZIndex())
    }

    // ---- 等宽选项须在测高之前写入(影响换行高度) ----
    const anchorRect = anchorElement.getBoundingClientRect()
    if (matchWidth) {
      layer.style.width = `${anchorRect.width}px`
    } else if (appliedMatchWidth) {
      layer.style.width = ''
    }
    appliedMatchWidth = matchWidth

    // offsetWidth/offsetHeight 是布局尺寸,不受入场动画 transform(scale)影响
    const layerWidth = layer.offsetWidth
    const layerHeight = layer.offsetHeight

    // ---- 视口(布局视口,自动排除滚动条宽度) ----
    const viewportWidth = document.documentElement.clientWidth
    const viewportHeight = document.documentElement.clientHeight

    // ---- flip:首选侧放不下且对侧空间更大时翻转(对齐保留) ----
    let { base } = placement
    const { align } = placement
    const vertical = base === 'top' || base === 'bottom'
    const mainSize = vertical ? layerHeight : layerWidth
    const spaceStart =
      base === 'top'
        ? anchorRect.top
        : base === 'bottom'
          ? viewportHeight - anchorRect.bottom
          : base === 'left'
            ? anchorRect.left
            : viewportWidth - anchorRect.right
    const spaceOpposite =
      base === 'top'
        ? viewportHeight - anchorRect.bottom
        : base === 'bottom'
          ? anchorRect.top
          : base === 'left'
            ? viewportWidth - anchorRect.right
            : anchorRect.left
    if (doFlip && spaceStart < mainSize + mainAxis && spaceOpposite > spaceStart) {
      base = base === 'top' ? 'bottom' : base === 'bottom' ? 'top' : base === 'left' ? 'right' : 'left'
    }

    // ---- 基础坐标:主轴贴锚留 offset,交叉轴按对齐方式 ----
    let x: number
    let y: number
    if (vertical) {
      y = base === 'top' ? anchorRect.top - mainAxis - layerHeight : anchorRect.bottom + mainAxis
      x =
        align === 'start'
          ? anchorRect.left
          : align === 'end'
            ? anchorRect.right - layerWidth
            : anchorRect.left + (anchorRect.width - layerWidth) / 2
      x += crossAxis
    } else {
      x = base === 'left' ? anchorRect.left - mainAxis - layerWidth : anchorRect.right + mainAxis
      y =
        align === 'start'
          ? anchorRect.top
          : align === 'end'
            ? anchorRect.bottom - layerHeight
            : anchorRect.top + (anchorRect.height - layerHeight) / 2
      y += crossAxis
    }

    // ---- shift:双轴钳制回视口安全区(层大于视口时贴 padding 起始边) ----
    if (doShift) {
      x = Math.max(padding, Math.min(x, viewportWidth - padding - layerWidth))
      y = Math.max(padding, Math.min(y, viewportHeight - padding - layerHeight))
    }

    // ---- 写入:absolute 策略换算文档坐标(要求包含块为初始包含块) ----
    if (strategy === 'absolute') {
      x += window.scrollX
      y += window.scrollY
    }
    layer.style.position = strategy
    layer.style.left = `${Math.round(x * 100) / 100}px`
    layer.style.top = `${Math.round(y * 100) / 100}px`
    // 供 popup.css 的 transform-origin 规则与控件样式钩子使用(翻转后的实际基位)
    layer.dataset.wuiPlacement = base
  }

  /** rAF 节流:一帧至多重算一次。 */
  function scheduleUpdate(): void {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      computePosition()
    })
  }

  function syncObservers(): void {
    if (!resizeObserver) return
    const layer = layerRef.value
    const anchorElement = toValue(options.anchor)
    if (anchorElement === observedAnchor && layer === observedLayer) return
    resizeObserver.disconnect()
    observedAnchor = null
    observedLayer = null
    if (anchorElement) {
      resizeObserver.observe(anchorElement)
      observedAnchor = anchorElement
    }
    if (layer) {
      resizeObserver.observe(layer)
      observedLayer = layer
    }
  }

  // ---- 客户端事件跟随(rAF 节流) ----
  const onDocumentScroll = (event: Event): void => {
    // 任意滚动都可能移动锚 → 跟随重算;而语义化的 onAnchorScroll 只在
    // 「锚的滚动链」(页面滚动或锚的祖先滚动容器)上触发
    scheduleUpdate()
    const handler = options.onAnchorScroll
    if (!handler) return
    const anchorElement = toValue(options.anchor)
    const target = event.target
    if (anchorElement && target instanceof Node && target.contains(anchorElement)) {
      handler(event)
    }
  }

  const onDocumentPointerdown = (event: PointerEvent): void => {
    const handler = options.onOutsidePress
    if (!handler) return
    const target = event.target
    if (!(target instanceof Element)) return
    const layer = layerRef.value
    if (layer && (layer === target || layer.contains(target))) return
    const anchorElement = toValue(options.anchor)
    if (anchorElement && (anchorElement === target || anchorElement.contains(target))) return
    handler(event)
  }

  const onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') options.onEscape?.(event)
  }

  const onWindowResize = (): void => {
    scheduleUpdate()
  }

  // ---- 选项/元素变化 → 立即重算;元素变化 → 重挂观察目标 ----
  watch(
    () => [
      layerRef.value,
      toValue(options.anchor),
      toValue(options.placement),
      toValue(options.offset),
      toValue(options.flip),
      toValue(options.shift),
      toValue(options.strategy),
      toValue(options.matchAnchorWidth),
      toValue(options.viewportPadding),
    ],
    () => {
      computePosition()
      syncObservers()
    },
  )

  onMounted(() => {
    computePosition()
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => scheduleUpdate())
      syncObservers()
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('scroll', onDocumentScroll, { capture: true, passive: true })
      document.addEventListener('pointerdown', onDocumentPointerdown, { capture: true })
      document.addEventListener('keydown', onDocumentKeydown, { capture: true })
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onWindowResize, { passive: true })
    }
    if (import.meta.env.DEV && !toValue(options.anchor)) {
      console.warn('[wui-popup] usePopupLayer: 未提供锚元素(anchor 选项),弹层不会定位。')
    }
  })

  onScopeDispose(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    resizeObserver?.disconnect()
    resizeObserver = null
    observedAnchor = null
    observedLayer = null
    if (typeof document !== 'undefined') {
      document.removeEventListener('scroll', onDocumentScroll, { capture: true })
      document.removeEventListener('pointerdown', onDocumentPointerdown, { capture: true })
      document.removeEventListener('keydown', onDocumentKeydown, { capture: true })
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onWindowResize)
    }
  })

  return { layerRef, update: computePosition }
}
