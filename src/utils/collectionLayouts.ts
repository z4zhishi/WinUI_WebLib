// WinUI_WebLib — 集合布局器纯函数层(collectionLayouts.ts)
//
// 阶段 5 集合类控件(ListView / GridView / ItemsRepeater / ItemsView)公共布局底座。
// 职责:给定条目数、可用尺寸与布局配置,产出每项的 position/size,或直接可用的
// CSS flex/grid 样式 —— 纯计算、无 DOM、无 Vue 依赖,可在 Node 环境单测。
//
// 语义对照 CK/WinUI-Reference/controls/dev/Repeater(只读参照):
//   - StackLayout.cpp / StackLayout.properties.h:Orientation(默认 Vertical)、
//     Spacing(默认 0);条目沿主轴依次排布,交叉轴尺寸由条目自定;
//   - UniformGridLayout.cpp / UniformGridLayoutState.cpp / UniformGridLayout.properties.h:
//     Orientation(本快照默认 Horizontal!MUX_DEFAULT_VALUE "Orientation::Horizontal",见
//     ItemsRepeater.idl)、MinItemWidth/MinItemHeight(默认 0.0)、MinRowSpacing/
//     MinColumnSpacing(默认 0)、MaximumRowsOrColumns(默认 -1 = 不限,0 按 1 处理)、
//     ItemsJustification(默认 Start)、ItemsStretch(默认 None);
//   - FlowLayoutAlgorithm.cpp:PerformLineAlignment 的六种行内对齐
//     (Start/Center/End/SpaceAround/SpaceBetween/SpaceEvenly);
//   - OrientationBasedMeasures.h:Major = 滚动/虚拟化方向,Minor = 交叉方向。
//
// 已核实的 WinUI 语义(易错点,wiki 有完整表):
//   1. UniformGridLayout 的 Orientation 命名的是「条目排列轴」,与滚动轴相反
//      (cpp L292-294):Horizontal(默认)→ 条目沿 X 排、满行下折、纵向滚动
//      (常规表格观感);Vertical → 条目沿 Y 排、满列右折、横向滚动
//      (与 ItemsWrapGrid 的同名词义相反,社区常称 "inverted")。
//      注意 StackLayout 恰好相反:Orientation 与滚动轴**同向**
//      (StackLayout.cpp L436-439「Vertical Orientation means we have a Vertical
//      ScrollOrientation」)——两个布局器的同名词义不同,勿混用;
//   2. ItemsStretch = Fill 时每项交叉轴增量用 C++ int 除法截断
//      (CalculateExtraPixelsInLine 的 remainingSpace / numItemsPerColumn),
//      Web 版按 Math.trunc 等效复刻;
//   3. 行内对齐逐行计算、含最后不满行(FlowLayoutAlgorithm 注释言明无例外)。
//
// 虚拟化:本层不做虚拟化(不裁剪、不回收),但 layoutStack / layoutUniformGrid
// 输出的有序 rect 数组可直接喂给 computeVisibleRange() 求可见窗口,虚拟化控件
// 只需监听滚动 → 调 computeVisibleRange → 只渲染窗口内条目(预留接口,见 wiki)。

/* -------------------------------------------------------------------------
 * 公共类型
 * ---------------------------------------------------------------------- */

/**
 * 排列方向(WinUI Orientation)。注意「Orientation ↔ 滚动轴」的关系随布局器而异:
 * StackLayout **同向**(StackLayout.cpp L436-439),UniformGridLayout **反向**
 * (UniformGridLayout.cpp L292-294)——本类型本身不约定方向语义,以各布局器 JSDoc 为准。
 */
export type LayoutOrientation = 'vertical' | 'horizontal'

/** 二维尺寸(px)。 */
export interface LayoutSize {
  width: number
  height: number
}

/** 单项矩形(px,相对内容原点)。 */
export interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
}

/** 布局结果:逐项矩形 + 内容总尺寸 + 行/列统计。 */
export interface CollectionLayoutResult {
  /** 每项矩形,按项索引升序(与条目顺序一致),可直接用于绝对定位或虚拟化窗口计算。 */
  items: LayoutRect[]
  /** 内容总尺寸(滚动范围 = max(contentSize, 可用尺寸))。 */
  contentSize: LayoutSize
  /** 行(StackLayout 恒为 1)/列数(orientation='horizontal' 时是行,'vertical' 时是列)。 */
  lines: number
  /** 每行(或每列)容纳的项数;StackLayout 恒为 1。 */
  itemsPerLine: number
}

/** 可见窗口(虚拟化):内容坐标系中的一个视口矩形。 */
export interface LayoutViewport {
  x: number
  y: number
  width: number
  height: number
}

/** 负数/非有限间距钳到 0;非数字一律 0。 */
function clampSpacing(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/* -------------------------------------------------------------------------
 * StackLayout(对照 WinUI StackLayout:ItemsRepeater 的线性布局)
 * ---------------------------------------------------------------------- */

export interface StackLayoutOptions {
  /**
   * 排列方向,默认 'vertical'(WinUI StackLayout 默认 Vertical,名实一致)。
   * StackLayout 的 Orientation 与滚动轴**同向**(StackLayout.cpp L436-439):
   * vertical 自上而下排布并纵向滚动;horizontal 自左而右排布并横向滚动。
   */
  orientation?: LayoutOrientation
  /** 相邻项间距(px),默认 0(WinUI Spacing 默认 0.0);负数按 0 处理。 */
  spacing?: number
}

export interface ResolvedStackLayoutOptions {
  orientation: LayoutOrientation
  spacing: number
}

/** 归一化 StackLayout 配置(缺省补默认值,非法值钳回合法域)。 */
export function resolveStackLayoutOptions(options: StackLayoutOptions | undefined): ResolvedStackLayoutOptions {
  return {
    orientation: options?.orientation === 'horizontal' ? 'horizontal' : 'vertical',
    spacing: clampSpacing(options?.spacing),
  }
}

/**
 * StackLayout 逐项布局。
 *
 * @param itemCount 条目数(< 0 按 0 处理)
 * @param itemSize 条目尺寸:统一尺寸,或按索引取尺寸的函数(StackLayout 不要求等大,
 *   每项主轴尺寸自定、交叉轴尺寸自定;虚拟化场景未知尺寸时可返回估算值)
 * @param options 布局配置
 * @returns 每项矩形 + 内容总尺寸。第 i 项主轴起点 = 前面所有项尺寸之和 + i × spacing。
 *
 * @example
 * // 100 个 24px 高的行、行距 4:第 3 行 y = 2 × 28 = 56
 * layoutStack(100, { width: 320, height: 24 }, { spacing: 4 }).items[2]
 */
export function layoutStack(
  itemCount: number,
  itemSize: LayoutSize | ((index: number) => LayoutSize),
  options?: StackLayoutOptions,
): CollectionLayoutResult {
  const { orientation, spacing } = resolveStackLayoutOptions(options)
  const count = Number.isFinite(itemCount) ? Math.max(0, Math.floor(itemCount)) : 0

  const items: LayoutRect[] = []
  let mainOffset = 0
  let crossExtent = 0

  for (let index = 0; index < count; index++) {
    const size = typeof itemSize === 'function' ? itemSize(index) : itemSize
    const width = Number.isFinite(size?.width) ? Math.max(0, size.width) : 0
    const height = Number.isFinite(size?.height) ? Math.max(0, size.height) : 0
    if (orientation === 'vertical') {
      items.push({ x: 0, y: mainOffset, width, height })
    } else {
      items.push({ x: mainOffset, y: 0, width, height })
    }
    mainOffset += (orientation === 'vertical' ? height : width) + spacing
    crossExtent = Math.max(crossExtent, orientation === 'vertical' ? width : height)
  }

  // 内容主轴尺寸:首尾不贴 spacing(与 WinUI GetMajorSize 的 -LineSpacing 同构);
  // 交叉轴取各项目标尺寸的最大值。
  const contentMain = count > 0 ? mainOffset - spacing : 0
  return {
    items,
    contentSize: orientation === 'vertical'
      ? { width: crossExtent, height: contentMain }
      : { width: contentMain, height: crossExtent },
    lines: count > 0 ? 1 : 0,
    itemsPerLine: 1,
  }
}

/**
 * StackLayout 的非虚拟化 CSS 载体:flex + gap(交叉轴/主轴尺寸交给 CSS)。
 * 返回对象可直接 `v-bind` 到容器 style 或展开进 class 之外的内联样式。
 *
 * 虚拟化场景不要用本函数(渲染全量 DOM),改用 layoutStack + computeVisibleRange。
 */
export function stackLayoutStyle(options?: StackLayoutOptions): Record<string, string> {
  const { orientation, spacing } = resolveStackLayoutOptions(options)
  return {
    display: 'flex',
    flexDirection: orientation === 'vertical' ? 'column' : 'row',
    gap: `${spacing}px`,
  }
}

/* -------------------------------------------------------------------------
 * UniformGridLayout(对照 WinUI UniformGridLayout:等大项的网格布局)
 * ---------------------------------------------------------------------- */

/**
 * 行内对齐(WinUI UniformGridLayoutItemsJustification;映射 FlowLayoutAlgorithm
 * LineAlignment)。空间来源 = 行可用交叉尺寸 − 行内已用尺寸(等大项 + 最小间距),
 * 逐行独立计算、对最后不满行同样生效:
 *   start 左聚(默认)/ center 居中 / end 右聚;
 *   spaceBetween 首尾贴边、余量均分进项间(单项时退化为 start);
 *   spaceAround 每项两侧等宽半距(首尾为半距);
 *   spaceEvenly 项间与两端全等距。
 * 契约:余量为负(溢出行,如 fill 截断后行内已用 > 可用)按 0 处理、不参与对齐;
 * WinUI 原实现允许负 space 产生负向偏移,本实现钳制为 0(已知差异,wiki 有记)。
 */
export type GridItemsJustification = 'start' | 'center' | 'end' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly'

/**
 * 交叉轴拉伸(WinUI UniformGridLayoutItemsStretch):行内有剩余空间时——
 *   none:不拉伸(默认);fill:每项交叉尺寸增大增量(WinUI 用 int 除法截断,
 *   Web 等效 Math.trunc);uniform:交叉增量同 fill,且主轴按比例同步增大
 *   (extraMajor = itemMajor × extraMinor / itemMinor)。
 */
export type GridItemsStretch = 'none' | 'fill' | 'uniform'

export interface UniformGridLayoutOptions {
  /**
   * 排列轴,默认 'horizontal'(对照本快照 MUX_DEFAULT_VALUE "Orientation::Horizontal")。
   * horizontal:条目沿 X 排、满行下折、纵向滚动;vertical:条目沿 Y 排、满列右折、
   * 横向滚动(WinUI 特有的反直觉映射,与 ItemsWrapGrid 同名词义相反,wiki 详述)。
   */
  orientation?: LayoutOrientation
  /** 最小项宽(px),默认 0。纯函数层没有「实测条目尺寸」,需调用方显式给值。 */
  minItemWidth?: number
  /** 最小项高(px),默认 0,同上。 */
  minItemHeight?: number
  /** 行间距下限(px,主轴为 Y 时是行距/主轴为 X 时是列间),默认 0;负数按 0。 */
  minRowSpacing?: number
  /** 列间距下限(px),默认 0;负数按 0。 */
  minColumnSpacing?: number
  /**
   * 每行(horizontal)/ 每列(vertical)项数上限,默认 -1 = 不限(WinUI int → unsigned
   * 回绕成「极大值」);0 按 1 处理(WinUI max(1u, value) 语义);正数下限 1。
   */
  maximumRowsOrColumns?: number
  /** 行内对齐,默认 'start'。 */
  itemsJustification?: GridItemsJustification
  /** 交叉轴拉伸,默认 'none'。 */
  itemsStretch?: GridItemsStretch
}

export interface ResolvedUniformGridLayoutOptions {
  orientation: LayoutOrientation
  minItemWidth: number
  minItemHeight: number
  minRowSpacing: number
  minColumnSpacing: number
  maximumRowsOrColumns: number
  itemsJustification: GridItemsJustification
  itemsStretch: GridItemsStretch
}

const GRID_JUSTIFICATIONS: readonly GridItemsJustification[] = [
  'start', 'center', 'end', 'spaceBetween', 'spaceAround', 'spaceEvenly',
]

/** 归一化 UniformGridLayout 配置(缺省补 WinUI 默认值,非法值钳回合法域)。 */
export function resolveUniformGridLayoutOptions(
  options: UniformGridLayoutOptions | undefined,
): ResolvedUniformGridLayoutOptions {
  const raw = options ?? {}
  const dimension = (value: number | undefined): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
  return {
    orientation: raw.orientation === 'vertical' ? 'vertical' : 'horizontal',
    minItemWidth: dimension(raw.minItemWidth),
    minItemHeight: dimension(raw.minItemHeight),
    minRowSpacing: clampSpacing(raw.minRowSpacing),
    minColumnSpacing: clampSpacing(raw.minColumnSpacing),
    maximumRowsOrColumns: raw.maximumRowsOrColumns === 0
      ? 1
      : raw.maximumRowsOrColumns !== undefined && raw.maximumRowsOrColumns > 0
        ? Math.max(1, Math.floor(raw.maximumRowsOrColumns))
        : Number.MAX_SAFE_INTEGER,
    itemsJustification: GRID_JUSTIFICATIONS.includes(raw.itemsJustification as GridItemsJustification)
      ? (raw.itemsJustification as GridItemsJustification)
      : 'start',
    itemsStretch: raw.itemsStretch === 'fill' || raw.itemsStretch === 'uniform' ? raw.itemsStretch : 'none',
  }
}

interface GridMetrics {
  /** 归一化配置。 */
  options: ResolvedUniformGridLayoutOptions
  /** 每行(或每列)项数,≥ 1。 */
  itemsPerLine: number
  /** 行/列总数(空集合为 0)。 */
  lines: number
  /** 拉伸后的有效项宽(px)。 */
  itemWidth: number
  /** 拉伸后的有效项高(px)。 */
  itemHeight: number
  /** 项间距(行内,minor 方向):orientation=horizontal → 列距,vertical → 行距。 */
  minItemSpacing: number
  /** 行/列间间距(major 方向):orientation=horizontal → 行距,vertical → 列距。 */
  lineSpacing: number
  /** 可用交叉尺寸;Infinity 表示未约束。 */
  availableMinor: number
}

/**
 * 每行项数(WinUI UniformGridLayout::GetItemsPerLine):
 * floor((可用交叉尺寸 + 项间距) / (项交叉尺寸 + 项间距)),下限 1、
 * 上限 maximumRowsOrColumns;可用尺寸无限时直接取上限。
 */
function getItemsPerLine(metrics: GridMetrics): number {
  const { options } = metrics
  const minorItemSize = options.orientation === 'horizontal' ? metrics.itemWidth : metrics.itemHeight
  const minorStride = minorItemSize + metrics.minItemSpacing
  if (!Number.isFinite(metrics.availableMinor)) {
    return options.maximumRowsOrColumns
  }
  // 项尺寸为 0(未配置 minItemWidth/Height)时 WinUI 的除零结果经 unsigned 回绕后
  // max(1u, ·) = 1,即每行 1 项;此处显式取 1 以保持一致并避免 NaN 扩散。
  if (!(minorStride > 0)) return 1
  return Math.min(
    Math.max(1, Math.floor((metrics.availableMinor + metrics.minItemSpacing) / minorStride)),
    options.maximumRowsOrColumns,
  )
}

/**
 * 拉伸增量(WinUI UniformGridLayoutState::CalculateExtraPixelsInLine,int 除法截断):
 * remaining = 可用交叉尺寸 − (每行项数 × 项步进 − 项间距),extra = trunc(remaining / 每行项数)。
 */
function calculateExtraPixelsInLine(
  availableMinor: number,
  itemSizeMinor: number,
  minorItemSpacing: number,
  maxItemsPerLine: number,
): number {
  if (!Number.isFinite(availableMinor)) return 0
  const numItemsBasedOnSize = Math.max(1, Math.floor(availableMinor / (itemSizeMinor + minorItemSpacing)))
  const numItems = Math.min(maxItemsPerLine, numItemsBasedOnSize)
  const usedSpace = numItems * (itemSizeMinor + minorItemSpacing) - minorItemSpacing
  const remainingSpace = Math.trunc(availableMinor - usedSpace)
  return Math.trunc(remainingSpace / numItems)
}

/** 计算网格全部度量(行数、拉伸后有效尺寸等),layoutUniformGrid 与样式载体共用。 */
function resolveGridMetrics(
  itemCount: number,
  availableSize: LayoutSize | undefined,
  options: ResolvedUniformGridLayoutOptions,
): GridMetrics {
  const count = Number.isFinite(itemCount) ? Math.max(0, Math.floor(itemCount)) : 0
  const horizontal = options.orientation === 'horizontal'

  // 可用交叉尺寸:horizontal → 宽,vertical → 高;缺失/无限 → 未约束。
  const availableMinor = availableSize === undefined
    ? Number.POSITIVE_INFINITY
    : horizontal
      ? (Number.isFinite(availableSize.width) ? availableSize.width : Number.POSITIVE_INFINITY)
      : (Number.isFinite(availableSize.height) ? availableSize.height : Number.POSITIVE_INFINITY)

  // 间距的 minor/major 分配(WinUI MinItemSpacing()/LineSpacing(),SetSize 同构):
  // horizontal(minor = X):行内间距 = MinColumnSpacing,行间 = MinRowSpacing;
  // vertical(minor = Y):行内间距 = MinRowSpacing,行间 = MinColumnSpacing。
  const minItemSpacing = horizontal ? options.minColumnSpacing : options.minRowSpacing
  const lineSpacing = horizontal ? options.minRowSpacing : options.minColumnSpacing

  // 拉伸(WinUI SetSize):fill → minor 增大;uniform → minor 增大 + major 等比增大。
  const itemSizeMinor = horizontal ? options.minItemWidth : options.minItemHeight
  const itemSizeMajor = horizontal ? options.minItemHeight : options.minItemWidth
  const extraMinor = options.itemsStretch === 'none'
    ? 0
    : calculateExtraPixelsInLine(availableMinor, itemSizeMinor, minItemSpacing, options.maximumRowsOrColumns)
  let effectiveMinor = itemSizeMinor
  let effectiveMajor = itemSizeMajor
  if (options.itemsStretch !== 'none' && extraMinor > 0) {
    effectiveMinor = itemSizeMinor + extraMinor
    if (options.itemsStretch === 'uniform' && itemSizeMinor > 0) {
      // WinUI: extraMajor = itemSizeMajor × (extraMinor / itemSizeMinor),再累加
      effectiveMajor = itemSizeMajor + itemSizeMajor * (extraMinor / itemSizeMinor)
    }
  }

  const metrics: GridMetrics = {
    options,
    itemsPerLine: 1,
    lines: 0,
    itemWidth: horizontal ? effectiveMinor : effectiveMajor,
    itemHeight: horizontal ? effectiveMajor : effectiveMinor,
    minItemSpacing,
    lineSpacing,
    availableMinor,
  }
  // itemsPerLine 依赖 effectiveMinor(uniform 拉伸会同时改 major,不影响 minor 步进以外的量);
  // 注意 WinUI 顺序是 EnsureElementSize(拉伸)→ GetItemsPerLine(用拉伸后尺寸),此处同序。
  metrics.itemsPerLine = getItemsPerLine(metrics)
  metrics.lines = count > 0 ? Math.ceil(count / metrics.itemsPerLine) : 0
  return metrics
}

/**
 * UniformGridLayout 逐项布局(等大项网格)。
 *
 * @param itemCount 条目数(< 0 按 0 处理)
 * @param availableSize 可用尺寸(px);传 undefined 视为无约束(每行/列项数 =
 *   maximumRowsOrColumns,行内对齐无余量可分)
 * @param options 布局配置
 * @returns 每项矩形 + 内容总尺寸。矩形已含 itemsJustification 逐行对齐与
 *   itemsStretch 拉伸后的最终尺寸,可直接用于绝对定位。
 *
 * @example
 * // 宽 320 的容器、100px 项 + 8px 列距:每行 2 项(2×108−8=208 ≤ 320 < 316)
 * layoutUniformGrid(5, { width: 320, height: 0 }, { minItemWidth: 100, minItemHeight: 100 })
 */
export function layoutUniformGrid(
  itemCount: number,
  availableSize: LayoutSize | undefined,
  options?: UniformGridLayoutOptions,
): CollectionLayoutResult {
  const resolved = resolveUniformGridLayoutOptions(options)
  const metrics = resolveGridMetrics(itemCount, availableSize, resolved)
  const { itemsPerLine, lines } = metrics
  const count = Number.isFinite(itemCount) ? Math.max(0, Math.floor(itemCount)) : 0
  const horizontal = resolved.orientation === 'horizontal'

  const minorStride = (horizontal ? metrics.itemWidth : metrics.itemHeight) + metrics.minItemSpacing
  const majorStride = (horizontal ? metrics.itemHeight : metrics.itemWidth) + metrics.lineSpacing

  const items: LayoutRect[] = []
  for (let index = 0; index < count; index++) {
    const lineIndex = Math.floor(index / itemsPerLine)
    const indexInLine = index - lineIndex * itemsPerLine
    // 基础坐标(WinUI GetLayoutRectForDataIndex):行内按 minor 步进、行间按 major 步进。
    const baseMinor = indexInLine * minorStride
    const baseMajor = lineIndex * majorStride

    // 行内对齐(WinUI PerformLineAlignment;spaceAtLineStart 恒 0):余量按本行实际项数分配。
    let shift = 0
    if (resolved.itemsJustification !== 'start' && Number.isFinite(metrics.availableMinor)) {
      const countInLine = Math.min(itemsPerLine, count - lineIndex * itemsPerLine)
      const spaceAtLineEnd = metrics.availableMinor - ((countInLine - 1) * minorStride + (horizontal ? metrics.itemWidth : metrics.itemHeight))
      const total = Math.max(0, spaceAtLineEnd)
      const k = indexInLine
      switch (resolved.itemsJustification) {
        case 'end':
          shift = total
          break
        case 'center':
          shift = total / 2
          break
        case 'spaceAround': {
          const interItemSpace = total / (countInLine * 2)
          shift = interItemSpace * (k * 2 + 1)
          break
        }
        case 'spaceBetween': {
          const interItemSpace = countInLine > 1 ? total / (countInLine - 1) : 0
          shift = interItemSpace * k
          break
        }
        case 'spaceEvenly': {
          const interItemSpace = total / (countInLine + 1)
          shift = interItemSpace * (k + 1)
          break
        }
        default:
          shift = 0
          break
      }
    }

    items.push(horizontal
      ? { x: baseMinor + shift, y: baseMajor, width: metrics.itemWidth, height: metrics.itemHeight }
      : { x: baseMajor, y: baseMinor + shift, width: metrics.itemWidth, height: metrics.itemHeight })
  }

  // 内容总尺寸(WinUI Algorithm_GetExtent):extent 的 minor 是「单行宽」而非全部行宽
  // (minor 与滚动轴交叉,fill 时占满可用交叉尺寸);major 才是滚动方向上的全长。
  const contentMinor = Number.isFinite(metrics.availableMinor) && resolved.itemsStretch === 'fill' && count > 0
    ? metrics.availableMinor
    : lines > 0
      ? Math.max(0, itemsPerLine * minorStride - metrics.minItemSpacing)
      : 0
  const contentMajor = lines > 0
    ? Math.max(0, lines * majorStride - metrics.lineSpacing)
    : 0

  return {
    items,
    contentSize: horizontal
      ? { width: contentMinor, height: contentMajor }
      : { width: contentMajor, height: contentMinor },
    lines,
    itemsPerLine,
  }
}

/**
 * UniformGridLayout 的非虚拟化 CSS grid 载体:固定轨道模板 + gap。
 * 拉伸 fill/uniform 用 minmax(Wpx, 1fr) 表达(WinUI 的 int 截断差异见 wiki);
 * 行内对齐映射 justify-content(horizontal)/ align-content(vertical)。
 *
 * 与逐项 rect 的已知差异:CSS 的 space-* 余量按轨道数(每行满员)分配,而 WinUI
 * 逐行按实际项数分配——最后不满行两者不同;需要逐行精确语义请用 layoutUniformGrid。
 *
 * @example
 * // 3 列网格:grid-template-columns: repeat(3, 100px); gap: 8px 8px
 * uniformGridLayoutStyle(30, { width: 316, height: 0 }, { minItemWidth: 100, minItemHeight: 80 })
 */
export function uniformGridLayoutStyle(
  itemCount: number,
  availableSize: LayoutSize | undefined,
  options?: UniformGridLayoutOptions,
): Record<string, string> {
  const resolved = resolveUniformGridLayoutOptions(options)
  const metrics = resolveGridMetrics(itemCount, availableSize, resolved)
  const horizontal = resolved.orientation === 'horizontal'
  const count = Number.isFinite(itemCount) ? Math.max(0, Math.floor(itemCount)) : 0
  // CSS repeat() 需要有限整数:无约束布局(unavailableSize 未给)每行/列本就容纳全部条目,
  // 轨道数按实际条目数收敛(仅影响样式载体,rect 结果不受影响)。
  const repeatCount = Math.min(metrics.itemsPerLine, Math.max(1, count))

  const style: Record<string, string> = { display: 'grid' }
  if (horizontal) {
    style.gridTemplateColumns = `repeat(${repeatCount}, ${trackSize(metrics.itemWidth, resolved.itemsStretch)})`
    style.gridAutoRows = `${metrics.itemHeight}px`
    style.gap = `${metrics.lineSpacing}px ${metrics.minItemSpacing}px`
    style.justifyContent = justifyContentCss(resolved.itemsJustification)
  } else {
    style.gridTemplateRows = `repeat(${repeatCount}, ${trackSize(metrics.itemHeight, resolved.itemsStretch)})`
    style.gridAutoFlow = 'column'
    style.gridAutoColumns = `${metrics.itemWidth}px`
    style.gap = `${metrics.minItemSpacing}px ${metrics.lineSpacing}px`
    style.alignContent = justifyContentCss(resolved.itemsJustification)
  }
  // uniform 拉伸:主轴按比例同步增大的近似表达(WinUI extraMajor 公式的 CSS 等效)。
  if (resolved.itemsStretch === 'uniform' && metrics.itemHeight > 0) {
    style.aspectRatio = `${metrics.itemWidth} / ${metrics.itemHeight}`
  }
  return style
}

/** 轨道尺寸:none → 固定像素;fill/uniform → minmax(最小值, 1fr)(余量连续分给每行)。 */
function trackSize(minorSize: number, stretch: GridItemsStretch): string {
  return stretch === 'none' ? `${minorSize}px` : `minmax(${minorSize}px, 1fr)`
}

/** WinUI 行内对齐 → CSS 对齐关键字(space-* 同名语义,值域一致)。 */
function justifyContentCss(justification: GridItemsJustification): string {
  switch (justification) {
    case 'center': return 'center'
    case 'end': return 'end'
    case 'spaceBetween': return 'space-between'
    case 'spaceAround': return 'space-around'
    case 'spaceEvenly': return 'space-evenly'
    default: return 'start'
  }
}

/* -------------------------------------------------------------------------
 * 虚拟化预留接口
 * ---------------------------------------------------------------------- */

/**
 * 可见窗口内的条目索引范围(虚拟化预留接口,WinUI 无同名对应;Web 虚拟化列表
 * 用它把「全量 rect」裁成「本帧要渲染的窗口」)。
 *
 * @param items layoutStack / layoutUniformGrid 输出的 rect 数组(必须与项索引同序、
 *   布局器保证如此);大列表建议按主轴先二分,当前实现为顺序扫描 + 提前退出,
 *   万级条目内开销可忽略
 * @param viewport 内容坐标系中的可见矩形(通常是「滚动容器 scrollTop/scrollLeft +
 *   clientWidth/Height」换算到内容坐标系)
 * @param overscan 上下(左右)各多渲染的像素余量,默认 0;给 1~2 屏可消除快速滚动白屏
 * @returns `{ start, end }`:闭区间,与 items 同索引;窗口内无任何项时 start = end = -1
 */
export function computeVisibleRange(
  items: readonly LayoutRect[],
  viewport: LayoutViewport,
  overscan = 0,
): { start: number; end: number } {
  let start = -1
  let end = -1
  if (!Number.isFinite(overscan) || overscan < 0) overscan = 0
  const left = viewport.x - overscan
  const top = viewport.y - overscan
  const right = viewport.x + viewport.width + overscan
  const bottom = viewport.y + viewport.height + overscan
  for (let index = 0; index < items.length; index++) {
    const rect = items[index]
    const intersects =
      rect.x < right && rect.x + rect.width > left &&
      rect.y < bottom && rect.y + rect.height > top
    if (intersects) {
      if (start === -1) start = index
      end = index
    } else if (start !== -1) {
      // rect 与项索引同序:窗口是连续区间,一旦离开即无后续命中
      break
    }
  }
  return { start, end }
}
