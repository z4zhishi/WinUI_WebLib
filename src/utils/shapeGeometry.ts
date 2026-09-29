// Shape 形状族(WinUI Shape 基类)共享几何工具:拉伸映射、points/path 解析。
// 语义对照 CK/WinUI-Reference 的 Shape 基类(Fill/Stroke/StrokeThickness/StrokeDashArray/
// StrokeLineJoin/Stretch 等依赖属性,见 winrtgeneratedclasses/Shape.g.cpp):
//   - Stretch 缩放的是「几何」而描边(StrokeThickness/StrokeDashArray)按设备像素应用、不随几何缩放,
//     因此映射倍数由组件取倒数补偿(stroke-width / dasharray ÷ scale);
//   - Uniform/UniformToFill 把几何居中映射进视口,UniformToFill 会把溢出内容裁剪到形状边界
//     (官方文档 Stretch.UniformToFill:「the source content is clipped to fit」);
//   - WinUI 的 StrokeDashArray 每个值以 StrokeThickness 为单位(×thickness 才是实际长度),
//     组件负责换算成 SVG 的用户单位。
//   本文件为组件内部实现细节,不属于公开控件 API。

/** WinUI Shape.Stretch(形状基类特有;缺省 None)。 */
export type ShapeStretch = 'None' | 'Fill' | 'Uniform' | 'UniformToFill'

/** WinUI PenLineJoin(Shape.StrokeLineJoin;缺省 Miter)。 */
export type PenLineJoin = 'Miter' | 'Bevel' | 'Round'

/** WinUI FillRule(Polygon/Polyline.FillRule 与路径 F0/F1 前缀;缺省 EvenOdd)。 */
export type ShapeFillRule = 'EvenOdd' | 'Nonzero'

/** 矩形区域(几何边界/视口),单位为用户坐标。 */
export interface ShapeRect {
  x: number
  y: number
  width: number
  height: number
}

/** computeShapeViewport 的结果:svg 视口 + 几何映射变换 + 描边补偿倍数。 */
export interface ShapeViewport {
  /** svg viewBox(始终 "0 0 w h",1 用户单位 = 1 px)。 */
  viewBox: string
  /** 视口的像素尺寸(svg 根元素的内联 width/height;未显式给尺寸时 = 几何自然尺寸)。 */
  width: number
  height: number
  /** 施加在几何元素(分组)上的变换;恒等时为空串。 */
  transform: string
  /** 几何被拉伸的倍数:stroke-width / dasharray 需除以它,保持「描边不随 Stretch 缩放」。 */
  scale: number
  /** UniformToFill 时溢出内容须裁剪到视口。 */
  clip: boolean
}

/** 「约等于 0」阈值,过滤浮点噪声。 */
const EPS = 0.01

/** 数字格式化:抹掉浮点噪声(最多保留 2 位小数),用于 stroke-width / dasharray 等用户单位值。 */
export function fmtNumber(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/** 内部视口/变换坐标格式化(同规则)。 */
function fmt(value: number): string {
  return fmtNumber(value)
}

/**
 * 长度归一:number 或数字字符串 → 数值(px),其余回退默认值。
 * 形状组件的 width/height 参与视口/几何计算,只支持数值语义(差异见 wiki)。
 */
export function resolveLength(value: number | string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** WinUI PenLineJoin → SVG stroke-linejoin。 */
export function toLineJoin(value: PenLineJoin | undefined): 'miter' | 'bevel' | 'round' {
  if (value === 'Bevel') return 'bevel'
  if (value === 'Round') return 'round'
  return 'miter'
}

/** WinUI FillRule → SVG fill-rule(XAML 缺省 EvenOdd,SVG 缺省 nonzero,须显式对齐)。 */
export function toFillRule(value: ShapeFillRule | undefined): 'evenodd' | 'nonzero' {
  return value === 'Nonzero' ? 'nonzero' : 'evenodd'
}

/**
 * 计算形状的 svg 视口与几何映射变换(Stretch 语义的 Web 落地)。
 *
 * @param stretch        WinUI Shape.Stretch
 * @param bounds         几何边界(用户坐标;Ellipse/Rectangle 传 (0,0,w,h))
 * @param options.viewportWidth/Height  显式 Width/Height(未给时视口 = 几何自然尺寸)
 * @param options.strokePadding         StrokeThickness:退化轴(宽/高为 0,如水平线)按其撑开,
 *                                      对应 XAML 自然尺寸计入描边厚度
 */
export function computeShapeViewport(
  stretch: ShapeStretch,
  bounds: ShapeRect,
  options?: {
    viewportWidth?: number
    viewportHeight?: number
    strokePadding?: number
  },
): ShapeViewport {
  const padding = Math.max(options?.strokePadding ?? 0, 0)
  const half = padding / 2

  // —— 退化轴处理:宽度/高度为 0(如水平折线)按描边厚度撑开,几何平移半厚度居中 ——
  let bx = bounds.x
  let by = bounds.y
  let bw = bounds.width
  let bh = bounds.height
  let padX = 0
  let padY = 0
  let degenerate = false
  if (!(bw > EPS)) {
    bw = Math.max(padding, EPS)
    bx = bounds.x - half
    padX = half
    degenerate = true
  }
  if (!(bh > EPS)) {
    bh = Math.max(padding, EPS)
    by = bounds.y - half
    padY = half
    degenerate = true
  }

  // —— 视口:显式 Width/Height 优先,否则为(撑边后的)几何自然尺寸 ——
  let vw = options?.viewportWidth ?? bw
  let vh = options?.viewportHeight ?? bh
  if (!(vw > EPS)) vw = 1
  if (!(vh > EPS)) vh = 1
  const viewBox = `0 0 ${fmt(vw)} ${fmt(vh)}`

  const padTranslate = padX !== 0 || padY !== 0 ? `translate(${fmt(padX)} ${fmt(padY)})` : ''

  // —— None(或几何退化,如零尺寸路径/直线):几何按原坐标 1:1 绘制,描边不受影响 ——
  if (stretch === 'None' || degenerate) {
    return { viewBox, width: vw, height: vh, transform: padTranslate, scale: 1, clip: false }
  }

  if (stretch === 'Fill') {
    // 两轴独立拉伸填满视口(可能变形)
    const sx = vw / bw
    const sy = vh / bh
    const tx = -bx * sx
    const ty = -by * sy
    const transform = `translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(sx)} ${fmt(sy)})`
    return { viewBox, width: vw, height: vh, transform, scale: sx, clip: false }
  }

  // Uniform 取最小比例(完整显示,可能留白);UniformToFill 取最大比例(填满,溢出裁剪)
  const sx = vw / bw
  const sy = vh / bh
  const scale = stretch === 'Uniform' ? Math.min(sx, sy) : Math.max(sx, sy)
  const tx = (vw - bw * scale) / 2 - bx * scale
  const ty = (vh - bh * scale) / 2 - by * scale
  const transform = `translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(scale)} ${fmt(scale)})`
  return { viewBox, width: vw, height: vh, transform, scale, clip: stretch === 'UniformToFill' }
}

/**
 * 把 WinUI Points 字符串解析为数值数组(分隔符:空白和/或逗号,与 SVG points 同语法)。
 * 奇数个数值时舍弃末尾不成对的值;返回空数组表示无有效坐标。
 */
export function parsePoints(points: string): number[] {
  const values = points
    .trim()
    .split(/[\s,]+/)
    .filter((token) => token !== '')
    .map(Number)
    .filter((value) => Number.isFinite(value))
  return values.length % 2 === 0 ? values : values.slice(0, -1)
}

/** 坐标数组的几何边界(逐点 min/max);无有效点时返回 null。 */
export function boundsOfPoints(values: number[]): ShapeRect | null {
  if (values.length < 2) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < values.length; i += 2) {
    minX = Math.min(minX, values[i])
    maxX = Math.max(maxX, values[i])
    minY = Math.min(minY, values[i + 1])
    maxY = Math.max(maxY, values[i + 1])
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

// —— XAML/SVG 路径迷你语言解析(仅用于求几何边界;d 本身原样交给 <path>)——
// 指令元数(同一字母后允许隐式重复,如 "M 0,0 10,10 20,0" 的后续点对按 L 处理):
const COMMAND_ARITY: Record<string, number> = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
}

const NUMBER_RE = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/

/**
 * 解析路径数据的几何边界(近似):直线/折线/H/V 精确;曲线把控制点计入界(结果为精确界的
 * 外包超集,A 弧不计 rx/ry 极值)—— Stretch 用途下与 WinUI 的偏差见 wiki/controls/Shape.md。
 */
export function pathBounds(d: string): ShapeRect | null {
  let index = 0
  let cx = 0
  let cy = 0
  let startX = 0
  let startY = 0
  let command = ''
  const args: number[] = []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let points = 0

  const bump = (x: number, y: number): void => {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    points += 1
  }

  const nextNumber = (): number | null => {
    while (index < d.length && /[\s,]/.test(d[index])) index += 1
    if (index >= d.length) return null
    const match = NUMBER_RE.exec(d.slice(index))
    if (match === null || match.index !== 0) return null
    index += match[0].length
    return Number(match[0])
  }

  const apply = (values: number[]): void => {
    switch (command) {
      case 'M':
      case 'L':
      case 'T':
        cx = values[0]
        cy = values[1]
        bump(cx, cy)
        break
      case 'm':
      case 'l':
      case 't':
        cx += values[0]
        cy += values[1]
        bump(cx, cy)
        break
      case 'H':
        cx = values[0]
        bump(cx, cy)
        break
      case 'h':
        cx += values[0]
        bump(cx, cy)
        break
      case 'V':
        cy = values[0]
        bump(cx, cy)
        break
      case 'v':
        cy += values[0]
        bump(cx, cy)
        break
      case 'C':
        bump(values[0], values[1])
        bump(values[2], values[3])
        cx = values[4]
        cy = values[5]
        bump(cx, cy)
        break
      case 'c':
        bump(cx + values[0], cy + values[1])
        bump(cx + values[2], cy + values[3])
        cx += values[4]
        cy += values[5]
        bump(cx, cy)
        break
      case 'S':
      case 'Q':
        bump(values[0], values[1])
        cx = values[2]
        cy = values[3]
        bump(cx, cy)
        break
      case 's':
      case 'q':
        bump(cx + values[0], cy + values[1])
        cx += values[2]
        cy += values[3]
        bump(cx, cy)
        break
      case 'A':
        cx = values[5]
        cy = values[6]
        bump(cx, cy)
        break
      case 'a':
        cx += values[5]
        cy += values[6]
        bump(cx, cy)
        break
      default:
        break
    }
  }

  while (index < d.length) {
    while (index < d.length && /[\s,]/.test(d[index])) index += 1
    if (index >= d.length) break
    const ch = d[index]
    if (/[A-Za-z]/.test(ch)) {
      command = ch
      index += 1
      args.length = 0
      if (command === 'Z' || command === 'z') {
        // closepath:当前点回到子路径起点(起终点都已计入界,不影响边界)
        cx = startX
        cy = startY
      }
      continue
    }
    const value = nextNumber()
    if (value === null) {
      index += 1
      continue
    }
    // 元数按大写指令查表;小写(相对)指令的参数个数相同
    const arity = COMMAND_ARITY[command.toUpperCase()] ?? 0
    if (arity === 0) continue
    args.push(value)
    if (args.length >= arity) {
      // M/m 的首个点对开启子路径;后续隐式重复点对按线段处理(对边界无差别)
      apply(args)
      if (command === 'M' || command === 'm') {
        startX = cx
        startY = cy
      }
      args.length = 0
    }
  }

  if (points === 0) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export interface ParsedPathGeometry {
  /** 去掉 F0/F1 前缀后的 d(原样交给 <path d>)。 */
  d: string
  /** 填充规则:XAML 缺省 EvenOdd(F0 或无前缀),F1 → Nonzero。 */
  fillRule: 'evenodd' | 'nonzero'
  /** 几何边界(近似,见 pathBounds);无有效几何时为 null。 */
  bounds: ShapeRect | null
}

/** 解析 XAML 路径迷你语言字符串(与 PathIcon.vue 相同的 F0/F1 约定;渲染由 Path.vue 独立实现)。 */
export function parsePathGeometry(data: string): ParsedPathGeometry {
  const raw = data.trim()
  if (/^F0/i.test(raw)) {
    const d = raw.slice(2).trim()
    return { d, fillRule: 'evenodd', bounds: pathBounds(d) }
  }
  if (/^F1/i.test(raw)) {
    const d = raw.slice(2).trim()
    return { d, fillRule: 'nonzero', bounds: pathBounds(d) }
  }
  return { d: raw, fillRule: 'evenodd', bounds: pathBounds(raw) }
}
