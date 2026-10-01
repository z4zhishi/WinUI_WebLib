// WinUI_WebLib — 弹层公共工具(popup.ts)
//
// 弹层基建的两个纯 TS 侧能力,供阶段 3 全部弹层控件(ToolTip / Flyout / Popup /
// ContentDialog / TeachingTip / MenuFlyout …)复用:
//   1. z-index 分配:nextPopupZIndex() —— 模块级单调递增计数器,10000 起,
//      与 src/styles/popup.css 的 --wui-z-popup-base 同基(保证「后开的弹层压住先开的」,
//      对应 WinUI Popup 的 Topmost 视觉树语义)。
//   2. 焦点辅助:trapFocus / releaseFocus / focusFirst —— Tab 循环圈定,供 ContentDialog
//      等模态弹层使用(对齐 WinUI ContentDialog 的模态焦点行为)。
//
// 配套:定位与自动关闭在 src/composables/usePopup.ts;层级/阴影/圆角 token 与
// 公共类在 src/styles/popup.css。接入指南:wiki/controls/_popup-infra.md。
//
// 约束:不引入第三方依赖;浏览器 API 全部惰性/客户端调用(SSR 安全)。

/**
 * z-index 计数器基线,与 popup.css 的 --wui-z-popup-base 保持一致。
 * 应用若覆盖该 token,应同步调用 resetPopupZIndexBase() 对齐。
 */
export const POPUP_Z_INDEX_BASE = 10000

let zIndexCursor = POPUP_Z_INDEX_BASE

/**
 * 取下一个弹层 z-index(单调递增,10000 起:首次调用返回 10000)。
 *
 * 约定:弹层每次「打开」时调用一次并以内联 style 赋给层根元素
 * (usePopupLayer 已内置此行为,zIndex 选项可覆盖)。
 * 计数器只增不减,理论上限 int32(约 21 亿),按每次开层 +1 计不会耗尽。
 */
export function nextPopupZIndex(): number {
  return zIndexCursor++
}

/**
 * 重置计数器基线(仅供测试或应用覆盖 --wui-z-popup-base 后对齐使用,
 * 运行期控件不应调用:重置可能让已打开弹层被后续弹层压住)。
 */
export function resetPopupZIndexBase(base: number = POPUP_Z_INDEX_BASE): void {
  zIndexCursor = base
}

/* -------------------------------------------------------------------------
 * 已开弹层注册表(嵌套链路)
 *
 * usePopupLayer 在层元素挂载时注册、卸载时注销,形成「后开在上」的栈。
 * 用途(控件宿主零改动即可受益,由 usePopupLayer 内部消费):
 *   1. 外部点击豁免:pointerdown 目标位于任何已开弹层(含其他实例的子弹层)内时,
 *      不视作「外部」,不触发其他层实例的 onOutsidePress(否则 Teleport 到 body
 *      的子弹层内点击会误关父层);
 *   2. Escape 只关栈顶:嵌套时同帧只有最后打开的实例收到 Escape,逐级收口。
 * ---------------------------------------------------------------------- */

/** 已开弹层层元素栈(注册序 = 打开序,栈顶 = 最后打开)。 */
const layerStack: HTMLElement[] = []

/**
 * 注册一个已开弹层层元素(栈顶入栈)。
 * @returns 注销函数:层关闭/卸载时调用(usePopupLayer 已内置,控件不必自行调用)。
 */
export function registerPopupLayer(element: HTMLElement): () => void {
  layerStack.push(element)
  return () => {
    const index = layerStack.indexOf(element)
    if (index >= 0) layerStack.splice(index, 1)
  }
}

/**
 * 查询事件目标是否位于任何已开弹层层内(含层自身)。
 * 外部点击豁免判定用;层内元素再开启的子弹层同样被注册覆盖。
 */
export function isInsideAnyPopupLayer(target: Element): boolean {
  return layerStack.some((layer) => layer === target || layer.contains(target))
}

/**
 * 当前最后打开(栈顶)的弹层元素;无已开弹层时返回 null。
 * Escape「只关最顶层」的判定用。
 */
export function getTopmostPopupLayer(): HTMLElement | null {
  const top = layerStack[layerStack.length - 1]
  return top ?? null
}

/* -------------------------------------------------------------------------
 * 焦点辅助(Tab 循环)
 * ---------------------------------------------------------------------- */

/**
 * 可聚焦元素选择器。
 * 说明:不含 fieldset 联动禁用、option、audio/video[controls] 等罕见项,
 * 覆盖 ContentDialog / MenuFlyout 场景已足够;width/height 可见性过滤在
 * getFocusableElements 内做(兼容 display:none 子树)。
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ')

/** 判定元素当前可被 Tab 聚焦:非 display:none / 祖先未隐藏。 */
function isFocusable(element: HTMLElement): boolean {
  // offsetParent 对 fixed 定位元素返回 null,故用盒几何判断可见性
  if (element.offsetWidth <= 0 && element.offsetHeight <= 0 && element.getClientRects().length === 0) {
    return false
  }
  return true
}

/** 收集容器内按 DOM 顺序排列、当前可聚焦的元素列表。 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  return Array.from(candidates).filter(isFocusable)
}

/**
 * 聚焦容器内第一个可聚焦元素。
 * 返回被聚焦的元素;容器内无可聚焦元素时聚焦容器自身(需容器设 tabindex="-1",
 * ContentDialog 模板约定)并返回容器;完全失败返回 null。
 * preventScroll:弹层已定位在锚旁/视口内,聚焦首件不得引发页面滚动 —— 否则
 * focus 诱发的 document 滚动会被锚滚动 light dismiss(onAnchorScroll)误判,
 * Flyout 刚打开即被关闭(FIX24 色井场景暴露;WinUI 打开弹层亦不滚动视图)。
 */
export function focusFirst(container: HTMLElement): HTMLElement | null {
  const first = getFocusableElements(container)[0] ?? null
  if (first) {
    first.focus({ preventScroll: true })
    return first
  }
  container.focus({ preventScroll: true })
  return document.activeElement === container ? container : null
}

interface FocusTrap {
  container: HTMLElement
  /** 打开陷阱前的活动元素,释放时归还焦点 */
  previous: Element | null
  handleKeydown: (event: KeyboardEvent) => void
}

/** 焦点陷阱栈:支持模态弹层嵌套(ContentDialog 内再开 Flyout)。 */
const trapStack: FocusTrap[] = []

export interface TrapFocusOptions {
  /**
   * 陷阱建立后的初始焦点:
   *   - true(默认):focusFirst(container);
   *   - HTMLElement:聚焦该元素(应位于 container 内);
   *   - string:作为选择器在 container 内 querySelector;
   *   - false:不移动焦点(调用方自行控制)。
   */
  initialFocus?: boolean | string | HTMLElement
}

/**
 * 在 container 上建立 Tab 循环陷阱(模态焦点圈定)。
 *
 * 行为:
 *   - Tab / Shift+Tab 在 container 内首个/末个可聚焦元素间循环;
 *   - 焦点意外落在 container 外时,下一次 Tab 拉回首(Shift+Tab 拉回末)元素;
 *   - 支持嵌套:内层 trapFocus 后,事件只命中内层容器(外层非其 DOM 祖先),
 *     释放内层后外层陷阱继续生效;
 *   - releaseFocus() 弹出最近一个陷阱,并把焦点归还到 trapFocus 调用时的
 *     activeElement(元素仍在文档中时)。
 *
 * 局限(记录于 wiki):只拦截键盘 Tab,不强制鼠标点击外部容器导致的焦点转移
 * ——WinUI 的模态由 light-dismiss 遮罩挡住指针实现,控件侧配 .wui-popup-overlay 即可。
 *
 * @returns 无返回值;与 releaseFocus() 成对使用(嵌套时后进先出)。
 */
export function trapFocus(container: HTMLElement, options: TrapFocusOptions = {}): void {
  // 同一容器重复上陷阱:先移除旧监听再入栈,避免双倍循环步进
  const existingIndex = trapStack.findIndex((trap) => trap.container === container)
  if (existingIndex >= 0) {
    const existing = trapStack[existingIndex]
    if (existing) {
      existing.container.removeEventListener('keydown', existing.handleKeydown)
      trapStack.splice(existingIndex, 1)
    }
  }

  const trap: FocusTrap = {
    container,
    previous: document.activeElement,
    handleKeydown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return
      const focusable = getFocusableElements(container)
      if (focusable.length === 0) {
        // 无可聚焦内容:吞掉 Tab,焦点留在容器(容器自身应 tabindex="-1")
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const inside = active !== null && container.contains(active)
      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (!inside || active === last) {
        event.preventDefault()
        first.focus()
      }
    },
  }

  container.addEventListener('keydown', trap.handleKeydown)
  trapStack.push(trap)

  const { initialFocus = true } = options
  if (initialFocus === false) return
  if (typeof initialFocus === 'string') {
    const target = container.querySelector<HTMLElement>(initialFocus)
    if (target) {
      target.focus()
      return
    }
    focusFirst(container)
    return
  }
  if (initialFocus instanceof HTMLElement) {
    initialFocus.focus()
    return
  }
  focusFirst(container)
}

/**
 * 弹出最近建立的焦点陷阱并归还焦点。
 * 焦点归还目标:trapFocus 调用时的 activeElement(仍在文档中时);
 * 嵌套场景下,释放内层陷阱会把焦点交还内层打开前的元素(通常位于外层容器内)。
 * 栈空时为无操作。
 */
export function releaseFocus(): void {
  const trap = trapStack.pop()
  if (!trap) return
  trap.container.removeEventListener('keydown', trap.handleKeydown)
  const previous = trap.previous
  if (previous instanceof HTMLElement && previous.isConnected) {
    previous.focus()
  }
}

/** 当前生效的焦点陷阱数量(测试/调试用)。 */
export function getFocusTrapDepth(): number {
  return trapStack.length
}
