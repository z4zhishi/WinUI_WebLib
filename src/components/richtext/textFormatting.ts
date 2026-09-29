// RichTextBlock 文档模型子组件共享的排版工具:WinUI 文本属性 → CSS 的归一映射。
// 与 TextBlock.vue 内联的归一逻辑保持一致(字号 px 化 / FontWeight 查表 / Normal 不写 inline),
// 集中在此供 richtext/ 下各子组件复用,避免逐组件复制映射表。

/** WinUI TextAlignment 枚举取值。 */
export type TextAlignmentValue =
  | 'Left'
  | 'Center'
  | 'Right'
  | 'Justify'
  | 'DetectFromContent'
  | 'Start'
  | 'End'

/** WinUI TextWrapping 枚举取值。 */
export type TextWrappingValue = 'NoWrap' | 'Wrap' | 'WrapWholeWords'

/** WinUI FontStyle 枚举取值。 */
export type FontStyleValue = 'Normal' | 'Italic' | 'Oblique'

/** WinUI TextDecorations 枚举取值(常用子集)。 */
export type TextDecorationsValue = 'None' | 'Underline' | 'Strikethrough'

/** WinUI FontWeight 命名常量 → CSS font-weight 数值(XAML FontWeights)。 */
export const FONT_WEIGHT_MAP: Record<string, string> = {
  thin: '100',
  extralight: '200',
  ultralight: '200',
  light: '300',
  semilight: '350',
  normal: '400',
  regular: '400',
  medium: '500',
  semibold: '600',
  demibold: '600',
  bold: '700',
  extrabold: '800',
  ultrabold: '800',
  black: '900',
  heavy: '900',
  extrablack: '950',
  ultrablack: '950',
}

/** 长度归一:数字 → px,字符串原样透传,undefined 原样(不写 inline)。 */
export function toCssLength(value?: number | string): string | undefined {
  if (value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

/**
 * 字重归一:数值直用;WinUI 名称查表;空值/未知值返回 undefined(不写 inline,
 * 留 CSS 类默认值,如 RichTextBlock 容器的 BaseRichTextBlockStyle SemiBold)。
 */
export function toCssFontWeight(value?: string | number): string | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return String(value)
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const numeric = Number(trimmed)
  if (Number.isFinite(numeric)) return String(numeric)
  return FONT_WEIGHT_MAP[trimmed.toLowerCase()]
}

/** 字形归一:Normal 即 CSS 默认不写 inline,其余转小写。 */
export function toCssFontStyle(value?: FontStyleValue): string | undefined {
  if (value === undefined || value === 'Normal') return undefined
  return value.toLowerCase()
}

/**
 * CharacterSpacing 归一:XAML 单位为 1/1000 em,映射为 CSS letter-spacing 的 em 值。
 * 例:characterSpacing=50 → 0.05em。
 */
export function toCssCharacterSpacing(value?: number): string | undefined {
  if (value === undefined) return undefined
  return `${value / 1000}em`
}

/** TextDecorations 归一:None 即不写 inline;Strikethrough 映射为 CSS 的 line-through。 */
export function toCssTextDecoration(
  value?: TextDecorationsValue,
): 'underline' | 'line-through' | undefined {
  switch (value) {
    case 'Underline':
      return 'underline'
    case 'Strikethrough':
      return 'line-through'
    default:
      return undefined
  }
}

/**
 * TextAlignment 归一:Left/Start → left,Right/End → right,Justify → justify,
 * DetectFromContent(WinUI 按内容方向推断)→ start(浏览器按书写方向对齐的最近似等价)。
 */
export function toCssTextAlign(
  value?: TextAlignmentValue,
): 'left' | 'center' | 'right' | 'justify' | 'start' | undefined {
  switch (value) {
    case 'Center':
      return 'center'
    case 'Right':
    case 'End':
      return 'right'
    case 'Justify':
      return 'justify'
    case 'DetectFromContent':
      return 'start'
    case 'Left':
    case 'Start':
      return 'left'
    default:
      return undefined
  }
}
