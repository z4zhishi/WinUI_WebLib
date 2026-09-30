// 设计指南页数据源 —— theme.css / theme-hooks.css 运行时解析器。
// 设计指南页(Color / Spacing / Typography)展示的 token 数据不手工拷贝:这里用 Vite 的 ?raw
// 导入拿两份样式表源码,按 :root 浅色块与 :root[data-theme="dark"] 深色块分别抽出 --wui-* 声明,
// 再按名称配对成浅/深取值对,保证页面展示与主题文件始终同源(theme.css 重生成后页面自动跟随)。
import themeCssSource from '../../src/styles/theme.css?raw'
import themeHooksSource from '../../src/styles/theme-hooks.css?raw'

/** 单个 --wui-* token(浅/深两套取值配对)。 */
export interface WuiToken {
  /** 去掉 --wui- 前缀的 kebab 名称,如 text-control-foreground。 */
  name: string
  /** 完整 CSS 变量名,如 --wui-text-control-foreground。 */
  cssVar: string
  /** 浅色主题取值(源文件字面值:#hex / var() / color-mix() / transparent)。 */
  light: string
  /** 深色主题取值(无深色声明时回退浅色值)。 */
  dark: string
  /** 浅深取值是否不同(画刷类 token 大多随主题变化,字号/字体类恒同值)。 */
  isThemeVarying: boolean
}

/** 移除块注释,避免注释里的示例名被当成声明解析。 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 切出浅色(:root, :root[data-theme="light"])与深色(:root[data-theme="dark"])两个声明块文本。 */
function splitThemeBlocks(css: string): { light: string; dark: string } {
  const text = stripComments(css)
  const lightStart = text.indexOf(':root')
  const darkStart = text.indexOf(':root[data-theme="dark"]')
  return {
    light: darkStart > lightStart ? text.slice(lightStart, darkStart) : text.slice(lightStart),
    dark: darkStart >= 0 ? text.slice(darkStart) : '',
  }
}

/** 抽出块内全部 --wui-* 声明(kebab 名称 → 值字面文本)。 */
function parseDeclarations(block: string): Map<string, string> {
  const map = new Map<string, string>()
  const declaration = /--wui-([a-z0-9-]+)\s*:\s*([^;]+);/g
  let match: RegExpExecArray | null
  while ((match = declaration.exec(block)) !== null) {
    map.set(match[1], match[2].trim())
  }
  return map
}

/** 以浅色块键序为基准,配对浅/深取值构建 token 列表。 */
function buildTokens(source: string): WuiToken[] {
  const { light, dark } = splitThemeBlocks(source)
  const lightMap = parseDeclarations(light)
  const darkMap = parseDeclarations(dark)
  const tokens: WuiToken[] = []
  for (const [name, lightValue] of lightMap) {
    const darkValue = darkMap.get(name) ?? lightValue
    tokens.push({
      name,
      cssVar: `--wui-${name}`,
      light: lightValue,
      dark: darkValue,
      isThemeVarying: lightValue !== darkValue,
    })
  }
  return tokens
}

/** 判断声明值是否为颜色(排除 px 字号/圆角与字体族等非画刷 token)。 */
export function isColorValue(value: string): boolean {
  return /^(#|var\(|color-mix\(|rgba?\()/i.test(value) || value === 'transparent'
}

/** theme.css 全部 token(与主题文件同步,含颜色、字号、字体族、圆角)。 */
export const WUI_TOKENS: WuiToken[] = buildTokens(themeCssSource)

/** 颜色类 token 子集(画刷;不含字号/字体/圆角)。 */
export const WUI_COLOR_TOKENS: WuiToken[] = WUI_TOKENS.filter((token) => isColorValue(token.light))

/** 字号类 token(源:键含 FontSize 的 x:Double,如 --wui-control-content-theme-font-size: 14px)。 */
export const WUI_FONT_SIZE_TOKENS: WuiToken[] = WUI_TOKENS.filter((token) =>
  token.name.includes('font-size'),
)

/** 字体族类 token(如 --wui-phone-font-family-normal: 'Segoe UI')。 */
export const WUI_FONT_FAMILY_TOKENS: WuiToken[] = WUI_TOKENS.filter((token) =>
  token.name.includes('font-family'),
)

/** 圆角类 token(theme.css 仅 --wui-hyperlink-focus-rect-corner-radius: 4px 一条)。 */
export const WUI_CORNER_RADIUS_TOKENS: WuiToken[] = WUI_TOKENS.filter((token) =>
  token.name.includes('corner-radius'),
)

/**
 * 系统色钩子(theme-hooks.css 提供默认值的 var() 钩子,共 8 个,浅深同值):
 * Windows 上由系统提供(强调色 / Win32 高亮色),theme.css 未定义、以 var() 引用,
 * 应用层可在同名变量上覆盖(本库默认值即 WinUI 3 缺省观感)。
 */
export const SYSTEM_COLOR_HOOKS: WuiToken[] = buildTokens(themeHooksSource)
