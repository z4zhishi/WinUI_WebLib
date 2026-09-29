<script setup lang="ts">
// RelativePanel —— WinUI RelativePanel 的 Web 复刻:关系定位布局面板(无 ControlTemplate、无视觉状态、无业务事件)。
// 布局行为对照 CK/WinUI-Reference/dxaml/xcp/components/relativepanel/lib/RPGraph.cpp(约束解析/度量/排布)
// 与 RPNode.cpp(锚定判定 IsXxxAnchored),语义映射:
//   附加属性(RelativePanel.Xxx)→ 子元素 data-relative-* attribute:关系类(Above / Below / LeftOf /
//     RightOf / Align*With)的值为目标子项的 data-relative-key(或 data-relative-name 别名),
//     WithPanel 系列(Align*WithPanel)为布尔;
//   两遍布局(对照 RPGraph::MeasureNodes/ArrangeNodes 的两遍结构):渲染时经默认插槽 vnode 收集
//     声明(第一遍),布局求解器按依赖拓扑先解析邻居、再计算每个子项的 measureRect / arrangeRect
//     (第二遍),产出 CSS absolute 坐标经 cloneVNode 注入子项 style,使用方无需手写定位样式;
//   子项自然尺寸经 DOM 测量(offset + computed margin,DesiredSize 含 Margin 的语义一致),
//     由 ResizeObserver 驱动重排;面板未内联指定 width/height 时按内容范围近似撑开(WinUI
//     desired size;近似规则与限制见 wiki/controls/RelativePanel.md);
//   循环依赖:WinUI 抛 InvalidOperationException(AG_E_RELATIVEPANEL_CIRCULAR_DEP);本组件
//     DFS 检出成环约束后 console.warn 告警并丢弃该边(降级布局,面板保持可用);
//   目标名不存在:WinUI 抛异常(AG_E_RELATIVEPANEL_NAME_NOT_FOUND);本组件告警并忽略该约束。
import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useAttrs,
  useSlots,
  watch,
} from 'vue'
import type { CSSProperties, VNode } from 'vue'

// —— Props(属性名跟随 WinUI camelCase;RelativePanel 在 WinUI 中带 Background / Padding /
//      BorderBrush / BorderThickness / CornerRadius,见 RelativePanel.cpp 的 Get* 访问器)——
const props = defineProps<{
  /** 面板底色(RelativePanel.Background);WinUI 默认为 null 画刷 → 透明。任意 CSS 颜色或 --wui-* 变量。 */
  background?: string
  /** 内边距(RelativePanel.Padding);数字按 px,字符串原样作为 CSS padding(支持 "8 16" 简写)。 */
  padding?: number | string
  /** 边框颜色(RelativePanel.BorderBrush);设置后边框为 solid。 */
  borderBrush?: string
  /** 边框厚度(RelativePanel.BorderThickness);数字按 px。仅设厚度不设颜色时以透明边框占位(与 WinUI「无边刷则不绘制」一致)。 */
  borderThickness?: number | string
  /** 圆角(RelativePanel.CornerRadius);数字按 px,字符串原样作为 CSS border-radius。 */
  cornerRadius?: number | string
}>()

defineOptions({ inheritAttrs: false, name: 'WuiRelativePanel' })

const slots = useSlots()
const attrs = useAttrs()

// —— 附加属性清单(field:求解器内部名;attr:子元素 attribute)——
type DepField =
  | 'leftOf'
  | 'rightOf'
  | 'above'
  | 'below'
  | 'alignLeftWith'
  | 'alignRightWith'
  | 'alignTopWith'
  | 'alignBottomWith'
  | 'alignHCenterWith'
  | 'alignVCenterWith'

/** 关系类附加属性:值为目标子项的 key。顺序对照 RPGraph::MeasureNode 的依赖解析顺序。 */
const RELATION_ATTRS: Array<{ field: DepField; attr: string }> = [
  { field: 'leftOf', attr: 'data-relative-left-of' },
  { field: 'rightOf', attr: 'data-relative-right-of' },
  { field: 'above', attr: 'data-relative-above' },
  { field: 'below', attr: 'data-relative-below' },
  { field: 'alignLeftWith', attr: 'data-relative-align-left-with' },
  { field: 'alignTopWith', attr: 'data-relative-align-top-with' },
  { field: 'alignRightWith', attr: 'data-relative-align-right-with' },
  { field: 'alignBottomWith', attr: 'data-relative-align-bottom-with' },
  { field: 'alignHCenterWith', attr: 'data-relative-align-horizontal-center-with' },
  { field: 'alignVCenterWith', attr: 'data-relative-align-vertical-center-with' },
]

interface PanelFlags {
  left: boolean
  top: boolean
  right: boolean
  bottom: boolean
  hCenter: boolean
  vCenter: boolean
}

/** WithPanel 系列附加属性:布尔。 */
const PANEL_ATTRS: Array<{ field: keyof PanelFlags; attr: string }> = [
  { field: 'left', attr: 'data-relative-align-left-with-panel' },
  { field: 'top', attr: 'data-relative-align-top-with-panel' },
  { field: 'right', attr: 'data-relative-align-right-with-panel' },
  { field: 'bottom', attr: 'data-relative-align-bottom-with-panel' },
  { field: 'hCenter', attr: 'data-relative-align-horizontal-center-with-panel' },
  { field: 'vCenter', attr: 'data-relative-align-vertical-center-with-panel' },
]

interface RelativeDecl {
  /** 子项标识:data-relative-key / data-relative-name,缺省用声明序号(#n)。 */
  key: string
  vnode: VNode
  relations: Partial<Record<DepField, string>>
  panel: PanelFlags
  /** key 与先前子项重复:仍渲染,但不参与关系布局(WinUI 名称唯一,此处告警降级)。 */
  duplicate: boolean
  /** 声明摘要:子项增删或约束变化时驱动重新测量。 */
  signature: string
}

// —— 值归一 ——
function toCssLength(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  const raw = String(value).trim()
  if (raw === '' || raw === 'NaN') return undefined
  return Number.isFinite(Number(raw)) ? `${Number(raw)}px` : raw
}

function readText(vnode: VNode, attr: string): string | undefined {
  const raw = (vnode.props as Record<string, unknown> | null | undefined)?.[attr]
  if (raw === undefined || raw === null) return undefined
  const text = String(raw).trim()
  return text === '' ? undefined : text
}

function readFlag(vnode: VNode, attr: string): boolean {
  const raw = (vnode.props as Record<string, unknown> | null | undefined)?.[attr]
  if (raw === true || raw === '') return true
  if (typeof raw === 'string') return raw.trim().toLowerCase() === 'true'
  return false
}

// —— 第一遍:默认插槽子项 → 声明列表。Fragment(v-for / template v-for)展开一层,
//      使 v-for 子项可各自携带 data-relative-*;注释 / 文本占位剔除。——
function flattenSlotChildren(source: readonly VNode[], depth: number, output: VNode[]): void {
  for (const vnode of source) {
    if (vnode.type === Comment || vnode.type === Text) continue
    if (vnode.type === Fragment) {
      if (depth < 8 && Array.isArray(vnode.children)) {
        flattenSlotChildren(vnode.children as VNode[], depth + 1, output)
      }
      continue
    }
    output.push(vnode)
  }
}

const slotChildren = computed<VNode[]>(() => {
  const output: VNode[] = []
  flattenSlotChildren(slots.default?.() ?? [], 0, output)
  return output
})

const renderableDecls = computed<RelativeDecl[]>(() => {
  const seenKeys = new Set<string>()
  return slotChildren.value.map((vnode, index) => {
    const keyAttr = readText(vnode, 'data-relative-key')
    const nameAttr = readText(vnode, 'data-relative-name')
    const key = keyAttr ?? nameAttr ?? `#${index}`
    const relations: Partial<Record<DepField, string>> = {}
    for (const { field, attr } of RELATION_ATTRS) {
      const target = readText(vnode, attr)
      if (target !== undefined) relations[field] = target
    }
    const panel: PanelFlags = { left: false, top: false, right: false, bottom: false, hCenter: false, vCenter: false }
    for (const { field, attr } of PANEL_ATTRS) panel[field] = readFlag(vnode, attr)
    const identity = keyAttr ?? nameAttr
    const duplicate = identity !== undefined && seenKeys.has(identity)
    if (identity !== undefined) seenKeys.add(identity)
    const signature = JSON.stringify({ key, duplicate, relations, panel })
    return { key, vnode, relations, panel, duplicate, signature }
  })
})

// —— 第二遍:约束求解(简化版 RPGraph)。——
interface MeasuredBox {
  /** 边框盒宽高 + 水平/垂直外边距(DesiredSize 含 Margin 的等价物)。 */
  outerWidth: number
  outerHeight: number
  marginLeft: number
  marginRight: number
  marginTop: number
  marginBottom: number
}

interface SolvedBox {
  /** CSS left/top(margin 盒槽位坐标,已按 WinUI ArrangeNodes 钳制非负)。 */
  left: number
  top: number
  /** 仅在左右(上下)双向锚定(stretch)时给显式尺寸:槽位尺寸减去子项自身边距。 */
  width?: number
  height?: number
}

interface SolveResult {
  boxes: Array<SolvedBox | null>
  extentWidth: number
  extentHeight: number
  warnings: string[]
}

interface SolverNode {
  decl: RelativeDecl
  box: MeasuredBox | null
  links: Array<{ field: DepField; target: SolverNode; dropped: boolean }>
  mx: number
  my: number
  mw: number
  mh: number
  ax: number
  ay: number
  aw: number
  ah: number
  stretchH: boolean
  stretchV: boolean
  centerH: boolean
  centerV: boolean
  settled: boolean
}

function solveLayout(
  decls: RelativeDecl[],
  measured: ReadonlyArray<MeasuredBox | null>,
  available: { width: number; height: number },
): SolveResult {
  const warnings: string[] = []
  const nodes: SolverNode[] = decls.map((decl, index) => ({
    decl,
    box: measured[index] ?? null,
    links: [],
    mx: 0,
    my: 0,
    mw: available.width,
    mh: available.height,
    ax: 0,
    ay: 0,
    aw: 0,
    ah: 0,
    stretchH: false,
    stretchV: false,
    centerH: false,
    centerV: false,
    settled: false,
  }))

  const keyToNode = new Map<string, SolverNode>()
  for (const node of nodes) {
    if (!node.decl.duplicate && !keyToNode.has(node.decl.key)) keyToNode.set(node.decl.key, node)
  }

  for (const node of nodes) {
    if (node.decl.duplicate) {
      warnings.push(`子项标识「${node.decl.key}」重复声明,后者不参与关系布局`)
      continue
    }
    for (const { field, attr } of RELATION_ATTRS) {
      const target = node.decl.relations[field]
      if (target === undefined) continue
      const resolved = keyToNode.get(target)
      if (!resolved) {
        warnings.push(
          `子项「${node.decl.key}」的 ${attr} 指向不存在的目标「${target}」,已忽略该约束(WinUI 对未知名称抛 InvalidOperationException)`,
        )
        continue
      }
      node.links.push({ field, target: resolved, dropped: false })
    }
  }

  // 1) 循环依赖:三色 DFS,回边即成环约束 —— 告警并丢弃(WinUI 抛异常,此处降级)。
  const color = new Map<SolverNode, number>()
  const detectCycle = (node: SolverNode): void => {
    color.set(node, 1)
    for (const link of node.links) {
      if (link.dropped) continue
      const state = color.get(link.target)
      if (state === 1) {
        link.dropped = true
        warnings.push(
          `检测到循环依赖:子项「${node.decl.key}」→「${link.target.decl.key}」的约束成环,已丢弃该边并降级布局(WinUI 抛 InvalidOperationException)`,
        )
      } else if (state === undefined) {
        detectCycle(link.target)
      }
    }
    color.set(node, 2)
  }
  for (const node of nodes) {
    if (!color.has(node)) detectCycle(node)
  }

  const dep = (node: SolverNode, field: DepField): SolverNode | undefined =>
    node.links.find((link) => link.field === field && !link.dropped)?.target

  // 2) 拓扑求解:先解析全部邻居,再计算度量/排布矩形(对照 RPGraph::MeasureNode)。
  const resolve = (node: SolverNode): void => {
    if (node.settled) return
    node.settled = true
    for (const link of node.links) {
      if (!link.dropped) resolve(link.target)
    }

    const panel = node.decl.panel
    const size = node.box
    const outerWidth = size?.outerWidth ?? 0
    const outerHeight = size?.outerHeight ?? 0
    const leftOf = dep(node, 'leftOf')
    const rightOf = dep(node, 'rightOf')
    const above = dep(node, 'above')
    const below = dep(node, 'below')
    const alignLeftWith = dep(node, 'alignLeftWith')
    const alignRightWith = dep(node, 'alignRightWith')
    const alignTopWith = dep(node, 'alignTopWith')
    const alignBottomWith = dep(node, 'alignBottomWith')
    const centerHWith = dep(node, 'alignHCenterWith')
    const centerVWith = dep(node, 'alignVCenterWith')

    // —— 水平度量矩形(对照 CalculateMeasureRectHorizontally)——
    let centeredFromLeft = false
    let centeredFromRight = false
    let mx = 0
    let mw = available.width
    if (!panel.left) {
      if (alignLeftWith) {
        mx = alignLeftWith.ax
        mw -= mx
      } else if (centerHWith) {
        centeredFromLeft = true
      } else if (rightOf) {
        mx = rightOf.ax + rightOf.aw
        mw -= mx
      }
    }
    if (!panel.right) {
      if (alignRightWith) {
        mw -= available.width - (alignRightWith.ax + alignRightWith.aw)
      } else if (centerHWith) {
        centeredFromRight = true
      } else if (leftOf) {
        mw -= available.width - leftOf.ax
      }
    }
    if (centeredFromLeft && centeredFromRight && centerHWith) {
      const center = centerHWith.ax + centerHWith.aw / 2
      mw = Math.min(center, available.width - center) * 2
      mx = center - mw / 2
    }
    node.mx = mx
    node.mw = mw

    // —— 水平排布矩形(对照 CalculateArrangeRectHorizontally + RPNode 锚定判定)——
    const leftAnchored = panel.left || alignLeftWith != null || (rightOf != null && centerHWith == null)
    const rightAnchored = panel.right || alignRightWith != null || (leftOf != null && centerHWith == null)
    node.centerH =
      (panel.hCenter &&
        !panel.left &&
        !panel.right &&
        alignLeftWith == null &&
        alignRightWith == null &&
        leftOf == null &&
        rightOf == null) ||
      (centerHWith != null && !panel.left && !panel.right && alignLeftWith == null && alignRightWith == null)
    const desiredWidth = Math.min(mw, outerWidth)
    let ax = mx
    let aw = desiredWidth
    if (leftAnchored) {
      if (rightAnchored) aw = mw
    } else if (rightAnchored) {
      ax = mx + mw - desiredWidth
    } else if (node.centerH) {
      ax = mx + mw / 2 - desiredWidth / 2
    }
    node.ax = ax
    node.aw = aw
    node.stretchH = leftAnchored && rightAnchored

    // —— 垂直度量矩形(对照 CalculateMeasureRectVertically)——
    let centeredFromTop = false
    let centeredFromBottom = false
    let my = 0
    let mh = available.height
    if (!panel.top) {
      if (alignTopWith) {
        my = alignTopWith.ay
        mh -= my
      } else if (centerVWith) {
        centeredFromTop = true
      } else if (below) {
        my = below.ay + below.ah
        mh -= my
      }
    }
    if (!panel.bottom) {
      if (alignBottomWith) {
        mh -= available.height - (alignBottomWith.ay + alignBottomWith.ah)
      } else if (centerVWith) {
        centeredFromBottom = true
      } else if (above) {
        mh -= available.height - above.ay
      }
    }
    if (centeredFromTop && centeredFromBottom && centerVWith) {
      const center = centerVWith.ay + centerVWith.ah / 2
      mh = Math.min(center, available.height - center) * 2
      my = center - mh / 2
    }
    node.my = my
    node.mh = mh

    // —— 垂直排布矩形(对照 CalculateArrangeRectVertically)——
    const topAnchored = panel.top || alignTopWith != null || (below != null && centerVWith == null)
    const bottomAnchored = panel.bottom || alignBottomWith != null || (above != null && centerVWith == null)
    node.centerV =
      (panel.vCenter &&
        !panel.top &&
        !panel.bottom &&
        alignTopWith == null &&
        alignBottomWith == null &&
        above == null &&
        below == null) ||
      (centerVWith != null && !panel.top && !panel.bottom && alignTopWith == null && alignBottomWith == null)
    const desiredHeight = Math.min(mh, outerHeight)
    let ay = my
    let ah = desiredHeight
    if (topAnchored) {
      if (bottomAnchored) ah = mh
    } else if (bottomAnchored) {
      ay = my + mh - desiredHeight
    } else if (node.centerV) {
      ay = my + mh / 2 - desiredHeight / 2
    }
    node.ay = ay
    node.ah = ah
    node.stretchV = topAnchored && bottomAnchored
  }
  for (const node of nodes) resolve(node)

  // 3) 产出 CSS 盒与内容范围。left/top 为 margin 盒槽位坐标(CSS left/top 语义一致);
  //    stretch 时显式给宽高 = 槽位尺寸 - 子项自身边距(复刻 WinUI 双向锚定拉伸)。
  const boxes: Array<SolvedBox | null> = nodes.map((node) => {
    if (node.decl.duplicate || !node.box) return null
    const box: SolvedBox = { left: Math.max(node.ax, 0), top: Math.max(node.ay, 0) }
    if (node.stretchH) box.width = Math.max(node.aw - node.box.marginLeft - node.box.marginRight, 0)
    if (node.stretchV) box.height = Math.max(node.ah - node.box.marginTop - node.box.marginBottom, 0)
    return box
  })

  // 内容范围(未内联定宽/高时面板按内容撑开,近似 WinUI desired size):
  // 「面板右/下锚定」「面板居中」子项按自然尺寸计入、「左右(上下)双向面板拉伸」子项不计入,
  // 避免面板尺寸与子项槽位互相反馈(近似规则,与 WinUI 约束链累计的差异见 wiki)。
  let extentWidth = 0
  let extentHeight = 0
  for (const node of nodes) {
    const size = node.box
    if (!size) continue
    const panel = node.decl.panel
    if (panel.right) {
      if (!panel.left) extentWidth = Math.max(extentWidth, size.outerWidth)
    } else if (!(node.centerH && panel.hCenter)) {
      extentWidth = Math.max(extentWidth, node.ax + node.aw)
    }
    if (panel.bottom) {
      if (!panel.top) extentHeight = Math.max(extentHeight, size.outerHeight)
    } else if (!(node.centerV && panel.vCenter)) {
      extentHeight = Math.max(extentHeight, node.ay + node.ah)
    }
  }

  return { boxes, extentWidth, extentHeight, warnings }
}

// —— 告警去重(同一实例内每条只报一次;求解在 computed 内重跑,不能刷屏)——
const warned = new Set<string>()
function warnOnce(message: string): void {
  if (warned.has(message)) return
  warned.add(message)
  console.warn(`[WuiRelativePanel] ${message}`)
}

// —— 测量与求解的响应式状态 ——
const availableSize = ref({ width: 0, height: 0 })
const chromeSize = ref({ width: 0, height: 0 })
const measuredBoxes = ref<Array<MeasuredBox | null>>([])
const hasMeasured = ref(false)

const layout = computed<SolveResult>(() => {
  const result = solveLayout(renderableDecls.value, measuredBoxes.value, availableSize.value)
  // 告警在求解路径上直接发出(warnOnce 去重),渲染/SSR 期间同样生效;watch 不 flush 于 SSR,不可用。
  for (const message of result.warnings) warnOnce(message)
  return result
})

// —— 第二遍产出 → cloneVNode 注入定位样式(自身 style 在前、注入样式在后,附加属性定位优先生效);
//    data-wui-relative-child 用于按序找回子项 DOM 元素做测量(:scope > 限定直接子级,嵌套面板互不干扰);
//    data-relative-* 原样保留在 DOM(attrs 方案特性,可作样式/测试钩子)。——
const positionedChildren = computed<VNode[]>(() => {
  // 无条件读 layout:求解器(含约束告警)在任何环境(SSR / 首帧未测量)都保持一致地运行;
  // 坐标仅在测量完成后注入,SSR 与首帧输出只有 position:absolute,水合安全。
  const boxes = layout.value.boxes
  return renderableDecls.value.map((decl, index) => {
    const box = hasMeasured.value ? boxes[index] : undefined
    const style: CSSProperties = { position: 'absolute' }
    if (box) {
      style.left = `${box.left}px`
      style.top = `${box.top}px`
      if (box.width !== undefined) style.width = `${box.width}px`
      if (box.height !== undefined) style.height = `${box.height}px`
    }
    return cloneVNode(decl.vnode, {
      'data-wui-relative-child': String(index),
      style: [decl.vnode.props?.style, style],
    })
  })
})

// —— 容器样式:背景 / 内边距 / 边框 / 圆角 + 未内联定尺寸时的内容撑开 ——
function styleHasLength(value: unknown, key: 'width' | 'height'): boolean {
  if (typeof value === 'string') return new RegExp(`(?:^|;)\\s*${key}\\s*:`, 'i').test(value)
  if (Array.isArray(value)) return value.some((item) => styleHasLength(item, key))
  if (value !== null && typeof value === 'object') {
    return (value as Record<string, unknown>)[key] !== undefined && (value as Record<string, unknown>)[key] !== null
  }
  return false
}

const hasInlineWidth = computed(() => styleHasLength(attrs.style, 'width'))
const hasInlineHeight = computed(() => styleHasLength(attrs.style, 'height'))

const rootStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    background: props.background,
    padding: toCssLength(props.padding),
    borderRadius: toCssLength(props.cornerRadius),
  }
  const thickness = toCssLength(props.borderThickness)
  if (props.borderBrush !== undefined) {
    style.border = `${thickness ?? '1px'} solid ${props.borderBrush}`
  } else if (thickness !== undefined) {
    style.border = `${thickness} solid transparent`
  }
  if (hasMeasured.value) {
    if (!hasInlineWidth.value && layout.value.extentWidth > 0) {
      style.width = `${layout.value.extentWidth + chromeSize.value.width}px`
    }
    if (!hasInlineHeight.value && layout.value.extentHeight > 0) {
      style.height = `${layout.value.extentHeight + chromeSize.value.height}px`
    }
  }
  return style
})

// —— DOM 测量:面板内容盒尺寸 + 逐子项自然尺寸(ResizeObserver 驱动,签名不变则不触发重排)——
const rootRef = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null
let frameId = 0
const observed = new Set<HTMLElement>()
let lastMeasureSignature = ''

function scheduleMeasure(): void {
  if (frameId) return
  frameId = requestAnimationFrame(() => {
    frameId = 0
    measureAll()
  })
}

function measureAll(): void {
  const root = rootRef.value
  if (!root) return
  const rootCs = getComputedStyle(root)
  const paddingLeft = parseFloat(rootCs.paddingLeft) || 0
  const paddingRight = parseFloat(rootCs.paddingRight) || 0
  const paddingTop = parseFloat(rootCs.paddingTop) || 0
  const paddingBottom = parseFloat(rootCs.paddingBottom) || 0
  const borderLeft = parseFloat(rootCs.borderLeftWidth) || 0
  const borderRight = parseFloat(rootCs.borderRightWidth) || 0
  const borderTop = parseFloat(rootCs.borderTopWidth) || 0
  const borderBottom = parseFloat(rootCs.borderBottomWidth) || 0
  chromeSize.value = {
    width: paddingLeft + paddingRight + borderLeft + borderRight,
    height: paddingTop + paddingBottom + borderTop + borderBottom,
  }
  const nextAvailable = {
    width: root.clientWidth - paddingLeft - paddingRight,
    height: root.clientHeight - paddingTop - paddingBottom,
  }
  availableSize.value = nextAvailable

  const decls = renderableDecls.value
  const boxes: Array<MeasuredBox | null> = Array.from({ length: decls.length }, () => null)
  const current = new Set<HTMLElement>()
  for (let index = 0; index < decls.length; index += 1) {
    const element = root.querySelector<HTMLElement>(`:scope > [data-wui-relative-child="${index}"]`)
    if (!element) {
      warnOnce(
        `子项「${decls[index].key}」未找到对应 DOM 元素(多根组件无法承载定位属性),未参与关系布局`,
      )
      continue
    }
    current.add(element)
    if (observer && !observed.has(element)) {
      observer.observe(element)
      observed.add(element)
    }
    const cs = getComputedStyle(element)
    const marginLeft = parseFloat(cs.marginLeft) || 0
    const marginRight = parseFloat(cs.marginRight) || 0
    const marginTop = parseFloat(cs.marginTop) || 0
    const marginBottom = parseFloat(cs.marginBottom) || 0
    boxes[index] = {
      outerWidth: element.offsetWidth + marginLeft + marginRight,
      outerHeight: element.offsetHeight + marginTop + marginBottom,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
    }
  }
  for (const element of observed) {
    if (!current.has(element)) {
      observer?.unobserve(element)
      observed.delete(element)
    }
  }
  const signature = JSON.stringify([boxes, nextAvailable, chromeSize.value])
  if (signature !== lastMeasureSignature) {
    lastMeasureSignature = signature
    measuredBoxes.value = boxes
  }
  hasMeasured.value = true
}

watch(
  () => renderableDecls.value.map((decl) => decl.signature).join('|'),
  () => scheduleMeasure(),
)

onMounted(() => {
  observer = new ResizeObserver(() => scheduleMeasure())
  if (rootRef.value) observer.observe(rootRef.value)
  scheduleMeasure()
})

onBeforeUnmount(() => {
  if (frameId) cancelAnimationFrame(frameId)
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <!-- 纯布局面板:无交互态与业务事件;class/style 经 $attrs 透传给单根节点(尺寸等由使用方给定) -->
  <div v-bind="$attrs" ref="rootRef" class="wui-relative-panel" :style="rootStyle">
    <component :is="child" v-for="(child, index) in positionedChildren" :key="child.key ?? index" />
  </div>
</template>

<style scoped>
.wui-relative-panel {
  /* WinUI RelativePanel 无默认背景(null 画刷 → 透明)、无边框、不裁剪溢出子项;
     定位基准为 padding box(CSS absolute 包含块语义) */
  position: relative;
  box-sizing: border-box;
}
</style>
