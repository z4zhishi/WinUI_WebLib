// XAML 几何标记(Path 迷你语言)解析器 —— Path.vue / PathIcon 等几何消费方共用的纯函数基建。
// 语义对照 MS Learn「Path markup syntax」(StreamGeometry 迷你语言,WinUI/UWP 与 WPF 同源):
//   - 可选前缀 F0/F1 选择填充规则(F0=EvenOdd 为缺省,F1=Nonzero),官方要求必须位于最前;
//   - 指令字母 M/m L/l H/h V/v C/c S/s Q/q T/t A/a Z/z,大写=绝对坐标、小写=相对偏移;
//   - 同指令参数集可隐式重复("L 100,200 300,400" 等价 "L 100,200 L 300,400";
//     M/m 首对之后的点对按 L/l 处理,官方文档同义);
//   - 分隔符为空白和/或逗号,且「无歧义时数字可紧邻」("2-3"→2/-3、"2..3"→2./.3、
//     支持科学计数 "+1.e17");
//   - A 指令的两个 flag 参数按单字符读取(兼容 SVG 紧凑写法 "a5 5 0 0110 0");
//   - 输出「规范化 SVG path d」:全部折算为绝对指令、隐式重复展开为显式指令、
//     坐标最多保留 4 位小数,可直接交给 <path d> 或 Path.vue 的 data。
// 宽松解析:无效片段记入 issues 后跳过(与 XAML 解析器的抛错行为不同,差异见 wiki)。
// 纯函数、无副作用、无浏览器/Vue 依赖,可在 Node 环境单测。

/** WinUI FillRule(几何填充规则;F0/缺省 → EvenOdd,F1 → Nonzero)。 */
export type GeometryFillRule = 'EvenOdd' | 'Nonzero'

/** 规范化(统一大写绝对)后的指令名。 */
export type GeometryCommandName = 'M' | 'L' | 'H' | 'V' | 'C' | 'S' | 'Q' | 'T' | 'A' | 'Z'

/** 规范化后的一条路径指令:绝对坐标,隐式重复已展开。 */
export interface GeometryCommand {
  name: GeometryCommandName
  /**
   * 指令参数(元素数随指令:M/L/T=2,H/V=1,C=6,S/Q=4,A=7,Z=0)。
   * A 的前 5 个为 rx ry rotation largeArc sweep(原样保留),后 2 个为绝对端点。
   */
  values: number[]
}

/** 解析诊断:一段无法解析的输入(宽松解析会跳过并继续)。 */
export interface GeometryIssue {
  /** 问题片段在输入串中的字符偏移。 */
  index: number
  message: string
}

/** parseGeometry 的结果:XAML 几何标记的规范化表示。 */
export interface GeometryData {
  /** 填充规则:XAML 缺省 EvenOdd;F1 → Nonzero。 */
  fillRule: GeometryFillRule
  /** 规范化(绝对坐标、显式指令)序列。 */
  commands: GeometryCommand[]
  /** 规范化 SVG path d(不含 F 前缀;填充规则用上面的 fillRule 字段表达)。空几何为 ''。 */
  d: string
  /** 解析期间跳过的无效片段;length 为 0 表示整串解析成功。 */
  issues: GeometryIssue[]
}

// 各指令单个参数集的参数个数(小写相对指令个数相同)。
const ARG_COUNTS: Record<GeometryCommandName, number> = {
  M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0,
}

const COMMAND_NAMES: readonly GeometryCommandName[] = ['M', 'L', 'H', 'V', 'C', 'S', 'Q', 'T', 'A', 'Z']

// 数字:可选正负号、整数/小数(前导点允许)、可选十进制指数(官方允许 "+1.e17" 一类写法)。
const NUMBER_RE = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/

function isSeparator(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === '\f' || ch === ','
}

function isNumberStart(ch: string): boolean {
  return (ch >= '0' && ch <= '9') || ch === '.' || ch === '+' || ch === '-'
}

/** 指令字母 → 规范化大写名;非指令字符返回 null。 */
function toCommandName(ch: string): GeometryCommandName | null {
  const upper = ch.toUpperCase() as GeometryCommandName
  return COMMAND_NAMES.includes(upper) ? upper : null
}

/** 坐标格式化:最多 4 位小数并抹掉浮点噪声(0.30000000000000004 → 0.3,-0 → 0)。 */
function fmtCoordinate(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 10000) / 10000
  return rounded === 0 ? '0' : String(rounded)
}

/** 把规范化指令序列拼为 SVG path d(空几何 → '')。 */
function formatGeometryD(commands: GeometryCommand[]): string {
  return commands
    .map((cmd) => (cmd.values.length === 0 ? cmd.name : `${cmd.name} ${cmd.values.map(fmtCoordinate).join(' ')}`))
    .join(' ')
}

/**
 * 解析 XAML 几何标记(Path 迷你语言)为规范化表示。
 *
 * 宽松策略:遇到无法解析的片段记录 issue 并跳过,尽量消费余下有效部分
 * (XAML 解析器对非法串抛格式异常;Web 侧面向实时编辑/教学场景,不中断渲染)。
 * 官方允许的 Infinity/-Infinity/NaN 特殊值不在支持之列(几何上退化,按无效片段跳过)。
 */
export function parseGeometry(data: string): GeometryData {
  const s = String(data ?? '')
  const issues: GeometryIssue[] = []
  const commands: GeometryCommand[] = []
  let i = 0

  let fillRule: GeometryFillRule = 'EvenOdd'
  let command: GeometryCommandName | null = null
  let relative = false

  let cx = 0 // 当前点 x
  let cy = 0 // 当前点 y
  let subpathX = 0 // 当前子路径起点(关门 Z 回到这里)
  let subpathY = 0

  const skipSeparators = (): void => {
    while (i < s.length && isSeparator(s[i])) i += 1
  }

  const readNumber = (): number | null => {
    skipSeparators()
    const match = NUMBER_RE.exec(s.slice(i))
    if (match === null || match.index !== 0) return null
    i += match[0].length
    return Number(match[0])
  }

  // A 指令的两个 flag 按「单字符 0/1」读取,兼容紧凑写法(如 "a5 5 0 0110 0" 的 "0110")。
  const readFlag = (): number | null => {
    skipSeparators()
    const ch = s[i]
    if (ch === '0' || ch === '1') {
      i += 1
      return Number(ch)
    }
    return null
  }

  // 恢复用:丢弃一个「疑似数字」token,保证推进(NUMBER_RE 匹配失败时也至少前进一个字符,
  // 防止 "." 这类「数字起始但不构成数字」的输入死循环)。
  const discardToken = (): void => {
    skipSeparators()
    const match = NUMBER_RE.exec(s.slice(i))
    i += match !== null && match.index === 0 ? match[0].length : 1
  }

  const push = (name: GeometryCommandName, values: number[]): void => {
    commands.push({ name, values })
  }

  // 把一个已读齐的参数集折算为绝对指令并推进当前点。
  // 返回后续参数集应按哪条指令处理(M/m 首对之后按 L/l,官方「隐式线」语义);null = 指令不变。
  const applyCommand = (name: GeometryCommandName, isRelative: boolean, args: number[]): GeometryCommandName | null => {
    const x = (k: number): number => (isRelative ? cx + args[k] : args[k])
    const y = (k: number): number => (isRelative ? cy + args[k] : args[k])
    switch (name) {
      case 'M': {
        const ex = x(0)
        const ey = y(1)
        push('M', [ex, ey])
        cx = ex
        cy = ey
        subpathX = ex
        subpathY = ey
        return 'L'
      }
      case 'L':
      case 'T': {
        const ex = x(0)
        const ey = y(1)
        push(name, [ex, ey])
        cx = ex
        cy = ey
        return null
      }
      case 'H': {
        cx = x(0)
        push('H', [cx])
        return null
      }
      case 'V': {
        cy = y(0)
        push('V', [cy])
        return null
      }
      case 'C': {
        const x1 = x(0)
        const y1 = y(1)
        const x2 = x(2)
        const y2 = y(3)
        const ex = x(4)
        const ey = y(5)
        push('C', [x1, y1, x2, y2, ex, ey])
        cx = ex
        cy = ey
        return null
      }
      case 'S':
      case 'Q': {
        const x1 = x(0)
        const y1 = y(1)
        const ex = x(2)
        const ey = y(3)
        push(name, [x1, y1, ex, ey])
        cx = ex
        cy = ey
        return null
      }
      case 'A': {
        // rx/ry/rotation/两 flag 原样保留,仅端点折算绝对坐标
        const ex = x(5)
        const ey = y(6)
        push('A', [args[0], args[1], args[2], args[3], args[4], ex, ey])
        cx = ex
        cy = ey
        return null
      }
      default:
        return null
    }
  }

  // —— F0/F1 前缀:必须最前(允许与首指令紧邻,如 "F1M16,12";路径指令不含 F,判定无歧义)——
  skipSeparators()
  if (i + 1 < s.length && (s[i] === 'F' || s[i] === 'f') && (s[i + 1] === '0' || s[i + 1] === '1')) {
    if (s[i + 1] === '1') fillRule = 'Nonzero'
    i += 2
  }

  while (i < s.length) {
    skipSeparators()
    if (i >= s.length) break
    const ch = s[i]
    const upper = toCommandName(ch)
    if (upper !== null) {
      command = upper
      relative = ch !== upper
      i += 1
      if (command === 'Z') {
        // 关门:当前点回到子路径起点;指令本身无参数
        push('Z', [])
        cx = subpathX
        cy = subpathY
      }
      continue
    }
    if (isNumberStart(ch)) {
      if (command === null) {
        issues.push({ index: i, message: '参数出现在指令前' })
        discardToken()
        continue
      }
      if (command === 'Z') {
        issues.push({ index: i, message: 'Z 不接受参数' })
        discardToken()
        continue
      }
      const args: number[] = []
      let failed = false
      for (let k = 0; k < ARG_COUNTS[command]; k += 1) {
        const value = command === 'A' && (k === 3 || k === 4) ? readFlag() : readNumber()
        if (value === null) {
          failed = true
          break
        }
        args.push(value)
      }
      if (failed) {
        issues.push({ index: i, message: `指令 ${command} 参数不足` })
        command = null // 重新同步:等待下一个指令字母
        continue
      }
      const next = applyCommand(command, relative, args)
      if (next !== null) command = next
      continue
    }
    issues.push({ index: i, message: `无法识别的字符 "${ch}"` })
    i += 1
  }

  return { fillRule, commands, d: formatGeometryD(commands), issues }
}
