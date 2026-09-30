<script setup lang="ts">
// Iconography 图标体系指南页(路由 /iconography 自动注册,📖 指南条目:本库没有名为 Iconography 的控件)。
// 对照官方 WinUI Gallery Iconography 页(CK/WinUI-Gallery/WinUIGallery/Samples/Iconography:
// AutoSuggestBox 搜索 + 字形网格 + 右侧详情面板)并扩展 MS Learn 官方设计指南
// (「Iconography in Windows」/「Segoe Fluent Icons font」):
//   1. 四类图标对照:FontIcon / SymbolIcon / BitmapIcon / PathIcon(组件已入库,复用展示);
//   2. 使用规范:尺寸(16/20/24/32/40/48/64 七档)/ 颜色(monoline 单描边,经前景取色)/
//      层次(base+modifier 与 layering,复刻官方 EB51+EB52 心形叠加示例);
//   3. Segoe 字形总览:复用 demo/data/fontIconGlyphs.ts(1533 条)+ 搜索分页(与 IconElement 页同款),
//      点击选中复制 \uXXXX,联动上方规范演示;右侧详情面板对照官方 SidePanel(名称 / 码点 / XAML 片段)。
import { computed, ref, watch } from 'vue'
import WuiBitmapIcon from '@/components/BitmapIcon.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiPathIcon from '@/components/PathIcon.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import { SYMBOL_GLYPHS, SYMBOL_NAMES } from '@/utils/symbolIcons'
import type { SymbolValue } from '@/utils/symbolIcons'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'
import { FONT_ICON_GLYPHS } from '../data/fontIconGlyphs'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Iconography(图标体系)', en: 'Iconography' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '图标是一种可视化设计语言,用于快速有效地传达信息。Windows 11 的系统图标使用 Segoe Fluent Icons 字体,Windows 10 为 Segoe MDL2 Assets。本页对照官方指南与 Gallery 示例:四类图标控件对照、Segoe 字形总览、使用规范(尺寸 / 颜色 / 层次)。',
  en: 'Icons are a visual design language that communicates information quickly and effectively. Windows 11 uses Segoe Fluent Icons; Windows 10 uses Segoe MDL2 Assets. A guided tour of the four icon controls, the Segoe glyph catalog, and the official guidelines (size / color / layering).',
}
const SEC_TYPES: BilingualText = { zh: '四类图标对照', en: 'Four icon types' }
const SEC_SIZE: BilingualText = { zh: '规范 · 尺寸', en: 'Guidelines · size' }
const SEC_COLOR: BilingualText = { zh: '规范 · 颜色', en: 'Guidelines · color' }
const SEC_LAYER: BilingualText = { zh: '规范 · 层次与修饰', en: 'Guidelines · layering & modifiers' }
const SEC_BROWSE: BilingualText = { zh: 'Segoe 字形总览', en: 'Segoe glyph catalog' }

const SIZE_GUIDE: BilingualText = {
  zh: '官方规定:每个字形的图标区脚手架是一个方形 em —— 16px 字号的 FontIcon 观感等价于 16×16 的图标,字号即可预期的图标尺寸。为获得清晰渲染,官方推荐只在 16 / 20 / 24 / 32 / 40 / 48 / 64(px)七档字号中取值,偏离这些档位可能出现模糊。下方阶梯即七档对照(加框档位为参数面板当前字号)。',
  en: 'Per the official guidance, each glyph is designed on a square em: a FontIcon at 16px looks like a 16×16 icon, so font size is the predictable icon size. For crisp rendering, stick to the recommended sizes 16 / 20 / 24 / 32 / 40 / 48 / 64 (px); other values may render blurry. The ladder below shows all seven steps (the boxed step is the current option-panel size).',
}
const COLOR_GUIDE: BilingualText = {
  zh: 'Segoe Fluent Icons 的所有字形都是 monoline 风格 —— 单根 1epx 描边绘制,天然单色:颜色完全由前景色决定(FontIcon 的 Foreground / Web 侧继承 currentColor)。常规界面用默认前景;需要强调时用系统强调色;次要层级用次级前景。全彩是 BitmapIcon(资源类)的能力,系统图标本身不引入多色。',
  en: 'All Segoe Fluent Icons glyphs are drawn in a monoline style — a single 1epx stroke — so they are inherently monochrome: color comes entirely from the foreground (FontIcon Foreground / inherited currentColor on the web). Use the default foreground in normal UI, the accent color for emphasis, and the secondary foreground for hierarchy. Full color is a BitmapIcon (resource) capability; system icons themselves never use multiple colors.',
}
const LAYER_GUIDE: BilingualText = {
  zh: '两种组合手法:修饰(modifier)—— 底图占满整个图标脚手架,修饰元放在其中一个下象限改变含义(如「文件 + 上箭头 = 上传」);分层(layering)—— 同位叠加两枚字形,官方推荐用来表达同一图标的另一状态(如激活 / 选中)。下方即官方文档示例:EB52 HeartFill(强调色填充)+ EB51 Heart(默认前景轮廓)= 描边心形。',
  en: 'Two combination techniques: modifiers — the base fills the whole icon footprint while a modifier sits in one of the bottom quadrants to change meaning (file + up arrow = upload); layering — two glyphs drawn on top of each other, recommended to express another state of the same icon (active / selected). The demo below is the official docs example: EB52 HeartFill (accent fill) + EB51 Heart (default foreground outline) = an outlined heart.',
}
const LAYER_ON: BilingualText = { zh: '两层叠加:填充层 + 轮廓层(官方分层示例)', en: 'Two layers: fill + outline (official layering example)' }
const LAYER_OFF: BilingualText = { zh: '仅填充层(EB52 HeartFill)', en: 'Fill layer only (EB52 HeartFill)' }
const BROWSE_GUIDE: BilingualText = {
  zh: '对照官方页布局:AutoSuggestBox 搜索 + 字形网格 + 右侧详情面板。点击字形:选中并复制 \\uXXXX 写法,联动上方尺寸 / 颜色演示与详情面板。官方 IconsData.json 还带语义 Tags(如 "menu" "hamburger"),生成数据 fontIconGlyphs.ts 仅收录 code + name,故搜索按名称或码点匹配。字形依赖本机安装的 Segoe Fluent Icons / Segoe MDL2 Assets 字体(R1 裁决:不加载网络字体),缺失时显示空心方块(tofu)。',
  en: 'Layout mirrors the official page: AutoSuggestBox search + glyph grid + a side detail panel. Click a glyph to select it, copy its \\uXXXX form and feed the size / color demos above. The official IconsData.json also carries semantic tags (e.g. "menu", "hamburger"); the generated fontIconGlyphs.ts keeps code + name only, so search matches name or code. Glyphs rely on locally installed Segoe Fluent Icons / Segoe MDL2 Assets (decision R1: no webfonts); missing fonts render as tofu.',
}
const BROWSE_PLACEHOLDER: BilingualText = { zh: '按名称或码点搜索,如 Setting / E713', en: 'Search by name or code, e.g. Setting / E713' }
const BROWSE_EMPTY: BilingualText = { zh: '没有匹配的字形。', en: 'No glyphs found.' }
const BROWSE_PREV: BilingualText = { zh: '上一页', en: 'Previous' }
const BROWSE_NEXT: BilingualText = { zh: '下一页', en: 'Next' }
const DETAIL_NO_SYMBOL: BilingualText = { zh: '不在 Symbol 枚举(用 FontIcon 表达)', en: 'Not in the Symbol enum (use FontIcon)' }
const OPT_GLYPH: BilingualText = { zh: '当前字形(码点 / 字符)', en: 'Current glyph (code / char)' }
const OPT_SIZE: BilingualText = { zh: '当前字号(px)', en: 'Current size (px)' }
const OPT_COLOR: BilingualText = { zh: '阶梯取色', en: 'Ladder color' }
const OPT_LAYER: BilingualText = { zh: '叠加轮廓层(EB51)', en: 'Overlay outline layer (EB51)' }
const DOCS_TYPES_TITLE: BilingualText = { zh: '四类图标对照', en: 'Icon types' }
const DOCS_GUIDE_TITLE: BilingualText = { zh: '使用规范速查', en: 'Guidelines cheat sheet' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const typesLabel = useBilingual(i18n, SEC_TYPES)
const sizeLabel = useBilingual(i18n, SEC_SIZE)
const sizeGuide = useBilingual(i18n, SIZE_GUIDE)
const colorLabel = useBilingual(i18n, SEC_COLOR)
const colorGuide = useBilingual(i18n, COLOR_GUIDE)
const layerLabel = useBilingual(i18n, SEC_LAYER)
const layerGuide = useBilingual(i18n, LAYER_GUIDE)
const layerOn = useBilingual(i18n, LAYER_ON)
const layerOff = useBilingual(i18n, LAYER_OFF)
const browseLabel = useBilingual(i18n, SEC_BROWSE)
const browseGuide = useBilingual(i18n, BROWSE_GUIDE)
const browsePlaceholder = useBilingual(i18n, BROWSE_PLACEHOLDER)
const browseEmpty = useBilingual(i18n, BROWSE_EMPTY)
const browsePrev = useBilingual(i18n, BROWSE_PREV)
const browseNext = useBilingual(i18n, BROWSE_NEXT)
const detailNoSymbol = useBilingual(i18n, DETAIL_NO_SYMBOL)
const optGlyph = useBilingual(i18n, OPT_GLYPH)
const optSize = useBilingual(i18n, OPT_SIZE)
const optColor = useBilingual(i18n, OPT_COLOR)
const optLayer = useBilingual(i18n, OPT_LAYER)
const docsTypesTitle = useBilingual(i18n, DOCS_TYPES_TITLE)
const docsGuideTitle = useBilingual(i18n, DOCS_GUIDE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

const DETAIL_NAME_LABEL: BilingualText = { zh: '名称', en: 'Name' }
const DETAIL_TEXT_LABEL: BilingualText = { zh: '文本字形', en: 'Text glyph' }
const DETAIL_CODE_LABEL: BilingualText = { zh: '代码字形', en: 'Code glyph' }
const detailNameLabel = useBilingual(i18n, DETAIL_NAME_LABEL)
const detailTextLabel = useBilingual(i18n, DETAIL_TEXT_LABEL)
const detailCodeLabel = useBilingual(i18n, DETAIL_CODE_LABEL)

// —— 四类对照卡的静态示例素材 ——
/** 码点 → 字形字符(表内码点均合法,异常时回退问号占位)。 */
function toGlyphChar(code: string): string {
  try {
    return String.fromCodePoint(Number.parseInt(code, 16))
  } catch {
    return '?'
  }
}

const SETTINGS_CHAR = toGlyphChar('E713')
const HEART_FILL_CHAR = toGlyphChar('EB52')
const HEART_OUTLINE_CHAR = toGlyphChar('EB51')
/** 官方 IconElement 示例的 PathIcon 取值(20×20 坐标系)。 */
const OFFICIAL_PATH = 'F1 M 16,12 20,2L 20,16 1,16'
// 官方示例用 Slices.png(多色图);演示内置等价的多色 SVG data URL,离线可用且直观展示「BitmapIcon 是唯一可全彩的一类」。
const DEMO_BITMAP_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">',
  '<circle cx="16" cy="24" r="12" fill="#E81123"/>',
  '<rect x="27" y="13" width="13" height="22" fill="#0078D4"/>',
  '</svg>',
].join('')
const BITMAP_SRC = `data:image/svg+xml,${encodeURIComponent(DEMO_BITMAP_SVG)}`

interface IconTypeCard {
  name: string
  summary: BilingualText
  xaml: string
}

const TYPE_CARDS: IconTypeCard[] = [
  {
    name: 'FontIcon',
    summary: {
      zh: '图标字体字形:任意 Segoe 码点(1533 个),最常用、最灵活;默认走图标字体栈。',
      en: 'A glyph from the icon font: any of the 1533 Segoe code points, the most common and flexible choice.',
    },
    xaml: '<FontIcon Glyph="&#xE713;" />',
  },
  {
    name: 'SymbolIcon',
    summary: {
      zh: 'Symbol 枚举成员(197 项):书写最短、语义明确;枚举未覆盖的字形再退回 FontIcon。',
      en: 'A Symbol enum member (197 entries): the shortest to write and semantically named; fall back to FontIcon for glyphs outside the enum.',
    },
    xaml: '<SymbolIcon Symbol="Setting" />',
  },
  {
    name: 'BitmapIcon',
    summary: {
      zh: '位图 / SVG 资源:唯一可全彩的一类;ShowAsMonochrome 可切换单色化以匹配前景。',
      en: 'A bitmap / SVG resource: the only full-color kind; ShowAsMonochrome can tint it to the foreground.',
    },
    xaml: '<BitmapIcon UriSource="…" />',
  },
  {
    name: 'PathIcon',
    summary: {
      zh: '矢量路径:XAML 路径迷你语言描述几何,适合自定义形状;与 FontIcon 同为单色。',
      en: 'Vector geometry in the XAML path mini-language, good for custom shapes; monochrome like FontIcon.',
    },
    xaml: '<PathIcon Data="F1 M 16,12 20,2L 20,16 1,16" />',
  },
]

// —— 当前字形(规范演示与详情面板联动;DemoOptionRow 的 v-model 契约要求联合类型)——
const glyphInput = ref<string | number | boolean>('E713')
const iconSize = ref<string | number | boolean>(24)
const ladderColorChoice = ref<string | number | boolean>('default')
const layerOutline = ref<string | number | boolean>(true)

/** 码点写法归一为十六进制串:支持 E713 / \uE713 / U+E713 / 0xE713;非码点输入原样返回(当作字符粘贴)。 */
function parseGlyphCode(raw: string): string {
  const match = raw.trim().match(/^(?:\\u|\\x|U\+|0x|\+)?([0-9A-Fa-f]{4,6})$/)
  return match ? match[1].toUpperCase() : raw.trim()
}

const glyphCode = computed(() => parseGlyphCode(String(glyphInput.value)))
const glyphIsCodePoint = computed(() => /^[0-9A-F]{4,6}$/.test(glyphCode.value))
const glyphChar = computed(() => (glyphIsCodePoint.value ? toGlyphChar(glyphCode.value) : glyphCode.value))
const selectedGlyph = computed(() => FONT_ICON_GLYPHS.find((g) => g.code === glyphCode.value) ?? null)
const selectedName = computed(() => selectedGlyph.value?.name ?? '(不在官方字形表中)')

// 字形字符 → Symbol 枚举成员(首个命中):详情面板显示等价的 SymbolIcon 写法
const symbolByGlyph = (() => {
  const map = new Map<string, SymbolValue>()
  for (const name of SYMBOL_NAMES) {
    const glyph = SYMBOL_GLYPHS[name]
    if (!map.has(glyph)) map.set(glyph, name)
  }
  return map
})()

const selectedSymbolName = computed<SymbolValue | null>(() => {
  if (!glyphIsCodePoint.value) return null
  return symbolByGlyph.get(toGlyphChar(glyphCode.value)) ?? null
})

const fontIconXaml = computed(() => `<FontIcon Glyph="&#x${glyphCode.value};" />`)
const symbolIconXaml = computed(() =>
  selectedSymbolName.value ? `<SymbolIcon Symbol="${selectedSymbolName.value}" />` : null,
)

// —— 规范 · 尺寸 ——
const RECOMMENDED_SIZES = [16, 20, 24, 32, 40, 48, 64] as const

const iconSizeValue = computed(() => {
  const parsed = Number(iconSize.value)
  return Number.isFinite(parsed) ? Math.min(64, Math.max(12, Math.round(parsed))) : 24
})

// —— 规范 · 颜色(全部 --wui-* token,官方示例的硬编码色值换成主题变量,差异记 wiki)——
const COLOR_DEFAULT = 'var(--wui-application-foreground-theme)'
const COLOR_SECONDARY = 'var(--wui-application-secondary-foreground-theme)'
const COLOR_ACCENT = 'var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))'

const COLOR_ROWS = [
  { label: { zh: '默认前景', en: 'Default' }, value: COLOR_DEFAULT },
  { label: { zh: '次级前景', en: 'Secondary' }, value: COLOR_SECONDARY },
  { label: { zh: '强调色', en: 'Accent' }, value: COLOR_ACCENT },
] satisfies { label: BilingualText; value: string }[]

const COLOR_CHOICES = [
  { label: '默认前景', value: 'default' },
  { label: '次级前景', value: 'secondary' },
  { label: '强调色', value: 'accent' },
]

const ladderColorValue = computed(() => {
  if (ladderColorChoice.value === 'secondary') return COLOR_SECONDARY
  if (ladderColorChoice.value === 'accent') return COLOR_ACCENT
  return COLOR_DEFAULT
})

// —— 字形全表浏览(搜索 + 分页,与 IconElement 页同款;点击选中并复制)——
const BROWSE_PAGE_SIZE = 96
const browseQuery = ref('')
const browsePage = ref(1)

const filteredGlyphs = computed(() => {
  const query = browseQuery.value.trim().toLowerCase()
  if (query === '') return FONT_ICON_GLYPHS
  return FONT_ICON_GLYPHS.filter(
    (glyph) => glyph.name.toLowerCase().includes(query) || glyph.code.toLowerCase().includes(query),
  )
})
const browsePageCount = computed(() => Math.max(1, Math.ceil(filteredGlyphs.value.length / BROWSE_PAGE_SIZE)))
const browsePageClamped = computed(() => Math.min(Math.max(1, browsePage.value), browsePageCount.value))
const browsedGlyphs = computed(() =>
  filteredGlyphs.value.slice(
    (browsePageClamped.value - 1) * BROWSE_PAGE_SIZE,
    browsePageClamped.value * BROWSE_PAGE_SIZE,
  ),
)

watch(browseQuery, () => {
  browsePage.value = 1
})

function browseGo(delta: number): void {
  browsePage.value = Math.min(Math.max(1, browsePageClamped.value + delta), browsePageCount.value)
}

const pagerStatus = computed(() => {
  const head = `第 ${browsePageClamped.value} / ${browsePageCount.value} 页`
  const tail = `共 ${filteredGlyphs.value.length} 条`
  if (i18n.locale.value.startsWith('zh')) return `${head} · ${tail}`
  return `Page ${browsePageClamped.value} / ${browsePageCount.value} · ${filteredGlyphs.value.length} glyphs`
})

const copyHint = ref('')
let copyTimer: number | undefined

/** clipboard 优先;非安全上下文降级 execCommand(与 DemoCode 同策略)。 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  }
}

async function selectGlyph(code: string): Promise<void> {
  glyphInput.value = code
  const name = FONT_ICON_GLYPHS.find((g) => g.code === code)?.name ?? code
  const text = `\\u${code}`
  const ok = await writeClipboard(text)
  copyHint.value = ok ? `已复制 ${text}(${name})` : `复制失败,已选中 ${code}(${name}),请手动复制`
  if (copyTimer !== undefined) window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copyHint.value = ''
  }, 2000)
}

// —— 下半区固定开发文档 ——
const TYPE_DOCS_HEADERS = ['类型', '内容来源', '颜色能力', '适用场景', '本库组件']
const TYPE_DOCS_ROWS: (string | number)[][] = [
  ['FontIcon', '图标字体字形(Segoe 码点,1533 个)', '单色(继承 currentColor)', '任意字形;枚举未覆盖时的默认选择', 'src/components/FontIcon.vue'],
  ['SymbolIcon', 'Symbol 枚举成员(197 项)', '单色(继承 currentColor)', '常用语义图标;书写最短', 'src/components/SymbolIcon.vue'],
  ['BitmapIcon', '位图 / SVG / data URL 资源', '单色(ShowAsMonochrome)或全彩', '品牌图、彩色插画等资源类图标', 'src/components/BitmapIcon.vue'],
  ['PathIcon', 'XAML 路径迷你语言(矢量几何)', '单色(fill = currentColor)', '自定义形状;少量静态矢量', 'src/components/PathIcon.vue'],
]

const GUIDE_DOCS_HEADERS = ['规范项', '官方要求(摘译)', 'Web 侧落点']
const GUIDE_DOCS_ROWS: (string | number)[][] = [
  ['推荐尺寸', '16 / 20 / 24 / 32 / 40 / 48 / 64 px;字号即方形 em 脚手架,16px 字号 ≈ 16×16 图标', 'FontIcon / SymbolIcon 的 font-size,1:1 对应'],
  ['颜色', '系统图标为 monoline 单描边,天然单色;经 Foreground 取色,强调场景用系统强调色', 'foreground 属性,缺省继承 currentColor;本页演示用 --wui-* token'],
  ['层次', '底图占满脚手架,修饰元放右下象限;同位叠加(layering)表达同一图标的另一状态', '两枚 FontIcon 绝对定位叠加(本页 EB51 + EB52 官方示例)'],
  ['字体', 'Win11 用 Segoe Fluent Icons,Win10 为 Segoe MDL2 Assets;Fluent 已取代 MDL2 成推荐字体', '--wui-symbol-theme-font-family 双字体栈;R1 裁决不加载网络字体'],
  ['弃用区', 'E0–E5 前缀码点标记为 legacy,已弃用', '字形表仍收录(可搜索),新代码避免使用'],
  ['行内混排', '图标字体不用于与正文行内混排(旧式渐进披露箭头等技巧不再适用)', '—'],
  ['RTL 镜像', '方向性字形提供镜像变体(RTL 语言使用)', '按需选码点;组件不做自动镜像'],
]

const usageCode = `<WuiFontIcon glyph="\\uE713" :font-size="20" />
<WuiSymbolIcon symbol="Setting" :font-size="20" />
<WuiBitmapIcon :src="src" :show-as-monochrome="true" />
<WuiPathIcon data="F1 M 16,12 20,2L 20,16 1,16" viewBox="0 0 20 20" />

<!-- 官方分层示例:EB52 填充(强调色)+ EB51 轮廓(前景)= 描边心形 -->
<span class="icon-layer">
  <WuiFontIcon glyph="\\uEB52" :font-size="48" foreground="var(--wui-system-accent-color)" />
  <WuiFontIcon glyph="\\uEB51" :font-size="48" />
</span>
<style>
.icon-layer { position: relative; display: inline-block; width: 48px; height: 48px; }
.icon-layer .wui-fonticon { position: absolute; top: 0; left: 0; }
</style>`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="icon-stage">
        <!-- —— 1. 四类图标对照 —— -->
        <section>
          <h4 class="section-title">{{ typesLabel }}</h4>
          <div class="type-grid">
            <div v-for="card in TYPE_CARDS" :key="card.name" class="type-card">
              <div class="type-icon">
                <WuiFontIcon v-if="card.name === 'FontIcon'" :glyph="SETTINGS_CHAR" :font-size="40" />
                <WuiSymbolIcon v-else-if="card.name === 'SymbolIcon'" symbol="Setting" :font-size="40" />
                <WuiBitmapIcon v-else-if="card.name === 'BitmapIcon'" :src="BITMAP_SRC" :show-as-monochrome="false" :style="{ fontSize: '40px' }" />
                <WuiPathIcon v-else :data="OFFICIAL_PATH" view-box="0 0 20 20" :style="{ fontSize: '40px' }" />
              </div>
              <p class="type-name">{{ card.name }}</p>
              <p class="type-summary">{{ pickText(i18n, card.summary) }}</p>
              <code class="type-xaml">{{ card.xaml }}</code>
            </div>
          </div>
        </section>

        <!-- —— 2. 规范 · 尺寸 —— -->
        <section>
          <h4 class="section-title">{{ sizeLabel }}</h4>
          <p class="guide-text">{{ sizeGuide }}</p>
          <div class="size-ladder">
            <div
              v-for="size in RECOMMENDED_SIZES"
              :key="size"
              class="size-cell"
              :class="{ 'size-active': size === iconSizeValue }"
            >
              <WuiFontIcon :glyph="glyphChar" :font-size="size" :foreground="ladderColorValue" />
              <span class="size-label">{{ size }}px</span>
            </div>
          </div>
        </section>

        <!-- —— 3. 规范 · 颜色 —— -->
        <section>
          <h4 class="section-title">{{ colorLabel }}</h4>
          <p class="guide-text">{{ colorGuide }}</p>
          <div class="color-row">
            <div v-for="row in COLOR_ROWS" :key="row.value" class="color-cell">
              <WuiFontIcon :glyph="glyphChar" :font-size="iconSizeValue" :foreground="row.value" />
              <span class="size-label">{{ pickText(i18n, row.label) }}</span>
            </div>
          </div>
        </section>

        <!-- —— 4. 规范 · 层次与修饰(官方 EB51 + EB52 叠加示例)—— -->
        <section>
          <h4 class="section-title">{{ layerLabel }}</h4>
          <p class="guide-text">{{ layerGuide }}</p>
          <div class="layer-demo">
            <div class="layer-stage" :style="{ width: `${iconSizeValue}px`, height: `${iconSizeValue}px` }">
              <WuiFontIcon
                class="layer-glyph"
                :glyph="HEART_FILL_CHAR"
                :font-size="iconSizeValue"
                :foreground="COLOR_ACCENT"
              />
              <WuiFontIcon
                v-if="layerOutline === true"
                class="layer-glyph"
                :glyph="HEART_OUTLINE_CHAR"
                :font-size="iconSizeValue"
              />
            </div>
            <p class="layer-caption">{{ layerOutline === true ? layerOn : layerOff }}</p>
          </div>
        </section>

        <!-- —— 5. Segoe 字形总览(搜索 + 分页 + 详情面板)—— -->
        <section class="browse-group">
          <h4 class="section-title">{{ browseLabel }}</h4>
          <p class="guide-text">{{ browseGuide }}</p>
          <div class="browse-layout">
            <div class="browse-main">
              <div class="browse-toolbar">
                <input
                  v-model="browseQuery"
                  class="browse-search"
                  type="search"
                  :placeholder="browsePlaceholder"
                  :aria-label="browseLabel"
                />
                <div class="browse-pager">
                  <button type="button" class="pager-button" :disabled="browsePageClamped <= 1" @click="browseGo(-1)">
                    {{ browsePrev }}
                  </button>
                  <span class="pager-status">{{ pagerStatus }}</span>
                  <button type="button" class="pager-button" :disabled="browsePageClamped >= browsePageCount" @click="browseGo(1)">
                    {{ browseNext }}
                  </button>
                </div>
              </div>
              <div class="glyph-grid">
                <button
                  v-for="glyph in browsedGlyphs"
                  :key="glyph.code"
                  type="button"
                  class="glyph-cell"
                  :class="{ 'glyph-active': glyph.code === glyphCode }"
                  :title="`${glyph.name}(${glyph.code})`"
                  @click="selectGlyph(glyph.code)"
                >
                  <span class="glyph-preview">{{ toGlyphChar(glyph.code) }}</span>
                  <span class="glyph-code">{{ glyph.code }}</span>
                  <span class="glyph-name">{{ glyph.name }}</span>
                </button>
              </div>
              <p v-if="filteredGlyphs.length === 0" class="browse-empty">{{ browseEmpty }}</p>
              <p class="copy-hint" role="status">{{ copyHint }}</p>
            </div>
            <aside class="detail-panel" :aria-label="browseLabel">
              <div class="detail-preview">
                <WuiFontIcon :glyph="glyphChar" :font-size="48" />
              </div>
              <p class="detail-name">{{ selectedName }}</p>
              <dl class="detail-list">
                <div class="detail-item">
                  <dt class="detail-term">{{ detailNameLabel }}</dt>
                  <dd class="detail-desc">{{ selectedName }}</dd>
                </div>
                <div class="detail-item">
                  <dt class="detail-term">{{ detailTextLabel }}</dt>
                  <dd class="detail-desc"><code>\u{{ glyphIsCodePoint ? glyphCode : '—' }}</code></dd>
                </div>
                <div class="detail-item">
                  <dt class="detail-term">{{ detailCodeLabel }}</dt>
                  <dd class="detail-desc"><code>{{ glyphIsCodePoint ? `0x${glyphCode}` : '—' }}</code></dd>
                </div>
                <div class="detail-item">
                  <dt class="detail-term">FontIcon</dt>
                  <dd class="detail-desc"><code>{{ fontIconXaml }}</code></dd>
                </div>
                <div class="detail-item">
                  <dt class="detail-term">SymbolIcon</dt>
                  <dd class="detail-desc">
                    <code v-if="symbolIconXaml">{{ symbolIconXaml }}</code>
                    <span v-else class="detail-none">{{ detailNoSymbol }}</span>
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="optGlyph" type="text" v-model="glyphInput" placeholder="E713 或粘贴字形" />
        <DemoOptionRow :label="optSize" type="slider" v-model="iconSize" :min="12" :max="64" :step="1" />
        <DemoOptionRow :label="optColor" type="select" v-model="ladderColorChoice" :options="COLOR_CHOICES" />
        <DemoOptionRow :label="optLayer" type="toggle" v-model="layerOutline" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsTypesTitle }}</h4>
      <DemoDocsTable :headers="TYPE_DOCS_HEADERS" :rows="TYPE_DOCS_ROWS" />
      <h4 class="docs-subtitle">{{ docsGuideTitle }}</h4>
      <DemoDocsTable :headers="GUIDE_DOCS_HEADERS" :rows="GUIDE_DOCS_ROWS" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.icon-stage {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
  width: 100%;
}

.section-title {
  margin: 0 0 12px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.guide-text {
  margin: 0 0 12px;
  max-width: 860px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 1. 四类对照卡 —— */
.type-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.type-icon {
  display: flex;
  height: 48px;
  align-items: center;
  color: var(--wui-application-foreground-theme);
}

.type-name {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.type-summary {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.type-xaml {
  padding: 2px 6px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  background: var(--wui-system-control-background-chrome-medium-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  overflow-wrap: anywhere;
}

/* —— 2. 尺寸阶梯 / 3. 颜色行 —— */
.size-ladder,
.color-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
}

.size-cell,
.color-cell {
  display: flex;
  min-width: 72px;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px 8px;
  color: var(--wui-application-foreground-theme);
  border: 1px solid transparent;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.size-cell.size-active {
  border-color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}

.size-label {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

/* —— 4. 层次演示 —— */
.layer-demo {
  display: flex;
  align-items: center;
  gap: 16px;
}

.layer-stage {
  position: relative;
  display: inline-block;
}

.layer-glyph {
  position: absolute;
  top: 0;
  left: 0;
}

.layer-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 5. 字形总览(搜索 + 分页 + 详情面板)—— */
.browse-group {
  width: 100%;
}

.browse-layout {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}

.browse-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.browse-toolbar {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.browse-search {
  min-width: 240px;
  padding: 5px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-control-foreground);
  background: var(--wui-text-control-background);
  border: 1px solid var(--wui-text-control-border);
  border-bottom-width: 2px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  outline: none;
}

.browse-search:focus-visible {
  border-color: var(--wui-text-control-border-brush-focused);
}

.browse-pager {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pager-button {
  padding: 4px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.pager-button:hover:not(:disabled) {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.pager-button:disabled {
  color: var(--wui-text-control-foreground-disabled);
  background: var(--wui-text-control-background-disabled);
  cursor: default;
}

.pager-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.pager-status {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.glyph-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 4px;
}

.glyph-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  padding: 8px 4px;
  font-family: inherit;
  color: var(--wui-application-foreground-theme);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.glyph-cell:hover {
  background: var(--wui-system-control-background-list-low);
  border-color: var(--wui-system-control-background-base-low);
}

.glyph-cell:active {
  background: var(--wui-system-control-background-base-medium-low);
}

.glyph-cell:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.glyph-cell.glyph-active {
  border-color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}

.glyph-preview {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-hub-section-header-theme-font-size);
  line-height: 1;
  color: var(--wui-application-foreground-theme);
}

.glyph-code {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.glyph-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.browse-empty {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.copy-hint {
  min-height: 1em;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-hyperlink-foreground-theme);
}

/* 详情面板(对照官方 SidePanel:大预览 + 名称 + 码点 + XAML 片段) */
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.detail-preview {
  display: flex;
  width: 72px;
  height: 72px;
  align-items: center;
  justify-content: center;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.detail-name {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
  overflow-wrap: anywhere;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-term {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.detail-desc {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.detail-desc code {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  overflow-wrap: anywhere;
}

.detail-none {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

@media (max-width: 860px) {
  .browse-layout {
    grid-template-columns: 1fr;
  }
}
</style>
