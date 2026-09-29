// 几何包围盒计算 —— 供 Shape 家族 Stretch 映射/自然尺寸使用(与 src/components/Path.vue
// 已入库的近似口径一致,见 wiki/controls/Shape.md 与 wiki/controls/Geometry.md):
//   - 直线类(M/L/H/V)与关门 Z:按端点求界,精确;
//   - 三次/二次贝塞尔(C/S/Q):把控制点计入界(结果为精确界的外包超集,Stretch 下可能
//     略小于 WinUI;S 的反射控制点不计入);
//   - 椭圆弧(A):只计端点,不计弧顶极值(端点精确)。
// 输入既可以是 XAML 几何标记字符串(内部走 parseGeometry,口径与渲染解析完全一致),
// 也可以是已解析的 GeometryData / 规范化指令序列,避免调用方重复解析。
// 纯函数、无副作用、无浏览器/Vue 依赖,可在 Node 环境单测。
import { parseGeometry } from './geometry'
import type { GeometryCommand, GeometryData } from './geometry'
import type { ShapeRect } from './shapeGeometry'

/**
 * 计算 XAML 几何(Path 迷你语言)的包围盒;无有效几何时返回 null。
 * 近似口径:直线精确;贝塞尔控制点计入界;A 弧不计弧顶极值(与 Path.vue 一致)。
 */
export function geometryBounds(input: string | GeometryData | readonly GeometryCommand[]): ShapeRect | null {
  const commands: readonly GeometryCommand[] =
    typeof input === 'string' ? parseGeometry(input).commands : 'commands' in input ? input.commands : input
  return boundsOfCommands(commands)
}

/** 规范化(绝对坐标)指令序列的包围盒;无有效几何时返回 null。 */
export function boundsOfCommands(commands: readonly GeometryCommand[]): ShapeRect | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let points = 0
  let cx = 0
  let cy = 0

  const bump = (x: number, y: number): void => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    points += 1
  }

  for (const cmd of commands) {
    const v = cmd.values
    switch (cmd.name) {
      case 'M':
      case 'L':
      case 'T':
        cx = v[0]
        cy = v[1]
        bump(cx, cy)
        break
      case 'H':
        cx = v[0]
        bump(cx, cy)
        break
      case 'V':
        cy = v[0]
        bump(cx, cy)
        break
      case 'C':
        // 近似口径:两个控制点 + 端点都计入界
        bump(v[0], v[1])
        bump(v[2], v[3])
        cx = v[4]
        cy = v[5]
        bump(cx, cy)
        break
      case 'S':
      case 'Q':
        // 近似口径:给定控制点 + 端点计入界(S 的反射控制点不计,与 Path.vue 一致)
        bump(v[0], v[1])
        cx = v[2]
        cy = v[3]
        bump(cx, cy)
        break
      case 'A':
        // 近似口径:只计端点,不计弧顶极值
        cx = v[5]
        cy = v[6]
        bump(cx, cy)
        break
      case 'Z':
      default:
        // 关门:起终点都已在界内
        break
    }
  }

  if (points === 0) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}
