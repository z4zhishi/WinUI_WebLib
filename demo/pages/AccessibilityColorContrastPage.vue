<script setup lang="ts">
// AccessibilityColorContrastPage.vue —— 无障碍「颜色对比度」规范页
// (对应官方 WinUI Gallery Samples/AccessibilityColorContrast/)。
// WinUI 版 = 对比度检查器(InlineColorPicker × 2 + WCAG 阈值判定 + 预览);
// Web 版做「本库无障碍规范 + 自测工具」:检查器照搬(原生取色器)+ 本库主题
// 对比度抽样表(关键 --wui-* token 组合的实时比值,4.5:1 线标注)。
// 对比度算法逐行对照源 AccessibilityColorContrastPage.xaml.cs
// (GetRelativeLuminance / CalculateContrastRatio,WCAG 2.x 官方公式)。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 AccessibilityColorContrast 的 subtitle/描述译写)——
const PAGE_TITLE: BilingualText = { zh: 'Color Contrast(颜色对比度)', en: 'Color Contrast' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '无障碍是让所有能力水平的用户都能使用应用的体验设计。应用应对文本与其背景使用高对比度、易阅读的颜色组合,这不仅有利于低视力用户,也能保证在各种光照条件、屏幕与设备设置下的可见性与可读性。本页提供 WCAG 对比度检查器与本库主题 token 的对比度抽样表。',
  en: 'Apps should strive to use high-contrast, easy-to-read color combinations for text and background. This page provides a WCAG contrast checker and a live sampling table of key theme token pairs in this library.',
}
const CHECKER_TITLE: BilingualText = { zh: '对比度检查器', en: 'Color Contrast Checker' }
const CHECKER_DESC: BilingualText = {
  zh: '输入前景(文本)色与背景色,计算 WCAG 对比度比值并对照达标线(与官方示例一致:常规文本 ≥4.5:1,大号文本与 UI 组件 ≥3:1)。',
  en: 'Enter a text color and a background color to compute the WCAG contrast ratio against the thresholds (regular text ≥4.5:1; large text and UI components ≥3:1).',
}
const LABEL_TEXT_COLOR: BilingualText = { zh: '文本颜色(前景)', en: 'Text color' }
const LABEL_BG_COLOR: BilingualText = { zh: '背景颜色', en: 'Background color' }
const RATIO_TITLE: BilingualText = { zh: '对比度比值', en: 'Contrast Ratio' }
const SWAP_LABEL: BilingualText = { zh: '交换前后景', en: 'Swap colors' }
const CHECK_REGULAR: BilingualText = { zh: '常规文本', en: 'Regular text' }
const CHECK_REGULAR_SUB: BilingualText = { zh: '要求至少 4.5:1', en: 'Requires at least 4.5:1' }
const CHECK_LARGE: BilingualText = { zh: '大号文本(14pt 粗体或 18pt 常规)', en: 'Large text (14pt bold or 18pt regular)' }
const CHECK_LARGE_SUB: BilingualText = { zh: '要求至少 3:1', en: 'Requires at least 3:1' }
const CHECK_COMPONENTS: BilingualText = { zh: '图形对象与 UI 组件', en: 'Graphical objects and UI components' }
const CHECK_COMPONENTS_SUB: BilingualText = { zh: '要求至少 3:1', en: 'Requires at least 3:1' }
const TEXT_PASS: BilingualText = { zh: '通过', en: 'Pass' }
const TEXT_FAIL: BilingualText = { zh: '不通过', en: 'Fail' }
const PREVIEW_REGULAR: BilingualText = { zh: '常规字号正文预览 The quick brown fox', en: 'Regular body preview: The quick brown fox' }
const PREVIEW_BOLD: BilingualText = { zh: '14px 粗体预览 The quick brown fox', en: '14px bold preview: The quick brown fox' }
const PREVIEW_LARGE: BilingualText = { zh: '18px 常规预览 The quick brown fox', en: '18px regular preview: The quick brown fox' }
const PREVIEW_COMPONENTS: BilingualText = { zh: 'UI 组件预览(图标按钮 / 开关)', en: 'UI component preview (icon button / switch)' }
const SAMPLE_TITLE: BilingualText = { zh: '本库主题对比度抽样表', en: 'Theme contrast sampling table' }
const SAMPLE_DESC: BilingualText = {
  zh: '下表按当前主题档(html[data-theme],可用页头「主题预览」切换)实时读取关键 --wui-* token 组合并计算比值;带透明度的 token 按页面背景合成后再计算。刻度条上的竖线即 4.5:1 达标线(WCAG 2.1 AA 常规文本)。',
  en: 'Reads key --wui-* token pairs live under the current theme (switch via the header theme preview); alpha colors are composited over the page background before computing. The vertical line on each gauge marks the 4.5:1 AA threshold.',
}
const COL_USAGE: BilingualText = { zh: '用途', en: 'Usage' }
const COL_TOKENS: BilingualText = { zh: 'token 组合(前景 / 背景)', en: 'Token pair (fg / bg)' }
const COL_RATIO: BilingualText = { zh: '比值', en: 'Ratio' }
const COL_GAUGE: BilingualText = { zh: '刻度(1–21,竖线 = 4.5:1)', en: 'Gauge (1–21, line = 4.5:1)' }
const COL_AA: BilingualText = { zh: 'AA(≥4.5)', en: 'AA (≥4.5)' }
const COL_AAA: BilingualText = { zh: 'AAA(≥7)', en: 'AAA (≥7)' }
const DOCS_THRESHOLDS_TITLE: BilingualText = { zh: 'WCAG 阈值速查', en: 'WCAG thresholds' }
const DOCS_ALGO_TITLE: BilingualText = { zh: '计算方法(与官方示例一致)', en: 'Algorithm (matches the official sample)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }
const DOCS_TOKEN_NOTE: BilingualText = {
  zh: '说明:通过/不通过标识色取 WinUI SystemFillColorSuccess/Critical(浅 #0F7B0F / #C42B1C,深 #6DCC5F / #FF99A4)。theme.css 尚无同名 token,沿用 InfoBar 组件的最近似映射约定;检查器预览区的颜色来自用户输入数据,属内容色而非主题样式。',
  en: 'Note: pass/fail colors use WinUI SystemFillColorSuccess/Critical (light #0F7B0F / #C42B1C, dark #6DCC5F / #FF99A4). theme.css has no such tokens yet, so the InfoBar component convention (nearest-value mapping) is followed. Preview colors in the checker come from user input data, not theme styling.',
}

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const checkerTitle = useBilingual(i18n, CHECKER_TITLE)
const checkerDesc = useBilingual(i18n, CHECKER_DESC)
const labelTextColor = useBilingual(i18n, LABEL_TEXT_COLOR)
const labelBgColor = useBilingual(i18n, LABEL_BG_COLOR)
const ratioTitle = useBilingual(i18n, RATIO_TITLE)
const swapLabel = useBilingual(i18n, SWAP_LABEL)
const checkRegular = useBilingual(i18n, CHECK_REGULAR)
const checkRegularSub = useBilingual(i18n, CHECK_REGULAR_SUB)
const checkLarge = useBilingual(i18n, CHECK_LARGE)
const checkLargeSub = useBilingual(i18n, CHECK_LARGE_SUB)
const checkComponents = useBilingual(i18n, CHECK_COMPONENTS)
const checkComponentsSub = useBilingual(i18n, CHECK_COMPONENTS_SUB)
const textPass = useBilingual(i18n, TEXT_PASS)
const textFail = useBilingual(i18n, TEXT_FAIL)
const previewRegular = useBilingual(i18n, PREVIEW_REGULAR)
const previewBold = useBilingual(i18n, PREVIEW_BOLD)
const previewLarge = useBilingual(i18n, PREVIEW_LARGE)
const previewComponents = useBilingual(i18n, PREVIEW_COMPONENTS)
const sampleTitle = useBilingual(i18n, SAMPLE_TITLE)
const sampleDesc = useBilingual(i18n, SAMPLE_DESC)
const colUsage = useBilingual(i18n, COL_USAGE)
const colTokens = useBilingual(i18n, COL_TOKENS)
const colRatio = useBilingual(i18n, COL_RATIO)
const colGauge = useBilingual(i18n, COL_GAUGE)
const colAA = useBilingual(i18n, COL_AA)
const colAAA = useBilingual(i18n, COL_AAA)
const docsThresholdsTitle = useBilingual(i18n, DOCS_THRESHOLDS_TITLE)
const docsAlgoTitle = useBilingual(i18n, DOCS_ALGO_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)
const docsTokenNote = useBilingual(i18n, DOCS_TOKEN_NOTE)

// ===================== 对比度算法(对照源 .xaml.cs) =====================

/** sRGB 颜色分量(0–255,不含 alpha)。 */
interface Rgb {
  r: number
  g: number
  b: number
}

/** 带 alpha 的解析结果(alpha 缺省为 1)。 */
interface ParsedColor extends Rgb {
  a: number
}

/** 解析 #RGB / #RGBA / #RRGGBB / #RRGGBBAA;失败返回 null。 */
function parseHexColor(input: string): ParsedColor | null {
  const match = /^#([0-9a-f]{3,8})$/i.exec(input.trim())
  if (!match) return null
  const hex = match[1] as string
  if (hex.length === 3 || hex.length === 4) {
    const r = parseInt(hex.charAt(0) + hex.charAt(0), 16)
    const g = parseInt(hex.charAt(1) + hex.charAt(1), 16)
    const b = parseInt(hex.charAt(2) + hex.charAt(2), 16)
    const a = hex.length === 4 ? parseInt(hex.charAt(3) + hex.charAt(3), 16) / 255 : 1
    return { r, g, b, a }
  }
  if (hex.length === 6 || hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    }
  }
  return null
}

/**
 * 相对亮度(WCAG 官方公式,与源 GetRelativeLuminance 一致):
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function relativeLuminance(c: Rgb): number {
  const toLinear = (channel: number): number => {
    const srgb = channel / 255
    return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b)
}

/** 对比度比值,与源 CalculateContrastRatio 一致。 */
function contrastRatio(first: Rgb, second: Rgb): number {
  const l1 = relativeLuminance(first)
  const l2 = relativeLuminance(second)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

/** 将带 alpha 的前景色合成到底色上(用于 token 中的 8 位 hex)。 */
function compositeOver(fg: ParsedColor, bg: Rgb): Rgb {
  const a = Number.isFinite(fg.a) ? fg.a : 1
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
  }
}

function toCss(c: Rgb): string {
  return `rgb(${c.r}, ${c.g}, ${c.b})`
}

// ===================== 对比度检查器 =====================

// 前后景色(用户输入数据;预览区按数据着色)。
const textColor = ref('#000000')
const bgColor = ref('#ffffff')

const TEXT_PRESET_CHOICES = [
  { label: '#000000 黑', value: '#000000' },
  { label: '#333333 深灰', value: '#333333' },
  { label: '#767676 中灰', value: '#767676' },
  { label: '#FFFFFF 白', value: '#ffffff' },
  { label: '#FF0000 红', value: '#ff0000' },
]
const BG_PRESET_CHOICES = [
  { label: '#FFFFFF 白', value: '#ffffff' },
  { label: '#EEEEEE 浅灰', value: '#eeeeee' },
  { label: '#CCCCCC 灰', value: '#cccccc' },
  { label: '#333333 深灰', value: '#333333' },
  { label: '#000000 黑', value: '#000000' },
]

const parsedText = computed(() => parseHexColor(textColor.value))
const parsedBg = computed(() => parseHexColor(bgColor.value))

/** 合成后的有效前景/背景(带 alpha 时落到对方色上)。 */
const effectiveText = computed<Rgb | null>(() => {
  const fg = parsedText.value
  const bg = parsedBg.value
  if (!fg || !bg) return null
  return compositeOver(fg, bg)
})
const effectiveBg = computed<Rgb | null>(() => {
  const bg = parsedBg.value
  if (!bg) return null
  return { r: bg.r, g: bg.g, b: bg.b }
})

const ratioValue = computed<number | null>(() => {
  const fg = effectiveText.value
  const bg = effectiveBg.value
  if (!fg || !bg) return null
  return contrastRatio(fg, bg)
})

const ratioText = computed(() =>
  ratioValue.value === null ? '—' : `${(Math.round(ratioValue.value * 100) / 100).toFixed(2)}:1`,
)

interface CheckItem {
  key: string
  title: string
  sub: string
  threshold: number
  passed: boolean
}

const checkItems = computed<CheckItem[]>(() => {
  const ratio = ratioValue.value
  return [
    { key: 'regular', title: checkRegular.value, sub: checkRegularSub.value, threshold: 4.5, passed: ratio !== null && ratio >= 4.5 },
    { key: 'large', title: checkLarge.value, sub: checkLargeSub.value, threshold: 3, passed: ratio !== null && ratio >= 3 },
    { key: 'components', title: checkComponents.value, sub: checkComponentsSub.value, threshold: 3, passed: ratio !== null && ratio >= 3 },
  ]
})

function swapColors(): void {
  const t = textColor.value
  textColor.value = bgColor.value
  bgColor.value = t
}

// ===================== 主题对比度抽样表(实时读取当前主题 token) =====================

/** 抽样行定义:用途 + 前景/背景 token 名。 */
interface SampleDef {
  usageZh: string
  usageEn: string
  fgToken: string
  bgToken: string
  /** 背景透明/带 alpha 时的合成底(缺省为页面背景)。 */
  note?: BilingualText
}

const SAMPLE_DEFS: SampleDef[] = [
  { usageZh: '正文文本', usageEn: 'Body text', fgToken: '--wui-application-foreground-theme', bgToken: '--wui-application-page-background-theme' },
  { usageZh: '次要文本', usageEn: 'Secondary text', fgToken: '--wui-application-secondary-foreground-theme', bgToken: '--wui-application-page-background-theme' },
  {
    usageZh: '按钮文本',
    usageEn: 'Button text',
    fgToken: '--wui-button-foreground-theme',
    bgToken: '--wui-button-background-theme',
    note: { zh: '深色主题下按钮背景为透明,按页面背景合成', en: 'Button background is transparent in dark theme, composited over the page background' },
  },
  { usageZh: '超链接文本', usageEn: 'Hyperlink text', fgToken: '--wui-hyperlink-foreground-theme', bgToken: '--wui-application-page-background-theme' },
  { usageZh: '输入框文本', usageEn: 'TextBox text', fgToken: '--wui-text-box-foreground-theme', bgToken: '--wui-text-box-background-theme' },
  { usageZh: '下拉框文本', usageEn: 'ComboBox text', fgToken: '--wui-combo-box-foreground-theme', bgToken: '--wui-combo-box-background-theme' },
  { usageZh: '复选框文本', usageEn: 'CheckBox text', fgToken: '--wui-check-box-foreground-theme', bgToken: '--wui-application-page-background-theme' },
]

/** 抽样行的求值结果。 */
interface SampleRow {
  usage: string
  tokens: string
  note: string
  ratioText: string
  ratio: number | null
  fgCss: string
  bgCss: string
  /** 刻度位置 0–1(1–21 线性刻度)。 */
  gauge: number | null
  aa: boolean | null
  aaa: boolean | null
}

// DemoPage 的主题预览直接写 html[data-theme];MutationObserver 监听该属性,
// 主题切换时自增版本号,让抽样表计算属性重新读取 token。
const themeVersion = ref(0)
let themeObserver: MutationObserver | null = null

onMounted(() => {
  themeObserver = new MutationObserver(() => {
    themeVersion.value += 1
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onUnmounted(() => {
  themeObserver?.disconnect()
  themeObserver = null
})

/** 解析 token 值:读计算样式,并对 var(--a, var(--b)) 链做有限递归展开。 */
function resolveTokenValue(name: string, depth = 0): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (depth < 4 && raw.startsWith('var(')) {
    const inner = raw.slice(4, -1)
    const comma = inner.indexOf(',')
    const refName = (comma === -1 ? inner : inner.slice(0, comma)).trim()
    return resolveTokenValue(refName, depth + 1)
  }
  return raw
}

const sampleRows = computed<SampleRow[]>(() => {
  // 依赖主题版本号:切主题后重新读取 token。
  void themeVersion.value
  const pageRaw = resolveTokenValue('--wui-application-page-background-theme')
  const pageBase = parseHexColor(pageRaw) ?? { r: 255, g: 255, b: 255, a: 1 }

  return SAMPLE_DEFS.map((def) => {
    const fgParsed = parseHexColor(resolveTokenValue(def.fgToken))
    const bgParsed = parseHexColor(resolveTokenValue(def.bgToken))
    if (!fgParsed || !bgParsed) {
      return {
        usage: i18n.locale.value.startsWith('zh') ? def.usageZh : def.usageEn,
        tokens: `${def.fgToken} / ${def.bgToken}`,
        note: '',
        ratioText: '—',
        ratio: null,
        fgCss: 'transparent',
        bgCss: 'transparent',
        gauge: null,
        aa: null,
        aaa: null,
      }
    }
    const bg = compositeOver(bgParsed, pageBase)
    const fg = compositeOver(fgParsed, bg)
    const ratio = contrastRatio(fg, bg)
    const clamped = Math.min(21, Math.max(1, ratio))
    return {
      usage: i18n.locale.value.startsWith('zh') ? def.usageZh : def.usageEn,
      tokens: `${def.fgToken} / ${def.bgToken}`,
      note: def.note ? (i18n.locale.value.startsWith('zh') ? def.note.zh : def.note.en) : '',
      ratioText: `${(Math.round(ratio * 100) / 100).toFixed(2)}:1`,
      ratio,
      fgCss: toCss(fg),
      bgCss: toCss(bg),
      gauge: ((clamped - 1) / 20) * 100,
      aa: ratio >= 4.5,
      aaa: ratio >= 7,
    }
  })
})

// —— 下半区固定文档:阈值表 + 算法代码 ——
const thresholdHeaders = ['内容类型', 'WCAG 2.1 AA', 'WCAG 2.1 AAA']
const thresholdRows: (string | number)[][] = [
  ['常规文本(<18pt)', '≥ 4.5:1', '≥ 7:1'],
  ['大号文本(≥18pt 或 ≥14pt 粗体)', '≥ 3:1', '≥ 4.5:1'],
  ['图形对象与 UI 组件(图标、输入框边框、焦点环等)', '≥ 3:1', '≥ 4.5:1'],
]

// 与本页实现一致的算法(即官方示例 GetRelativeLuminance/CalculateContrastRatio 的 TS 版)。
const algorithmCode = `// 相对亮度(WCAG 官方公式)
function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// 对比度比值:(L亮 + 0.05) / (L暗 + 0.05)
function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}`

const usageCode = `<AccessibilityColorContrastPage />
<!-- 检查器:输入 #RRGGBB / #RRGGBBAA,比值与判定实时计算;
     抽样表:按 html[data-theme] 实时读取 --wui-* token,
     切换页头「主题预览」即可查看另一主题档的比值 -->`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="contrast-stack">
        <!-- ===== 对比度检查器(对照源 InlineColorPicker × 2 + 阈值判定 + 预览)===== -->
        <section class="checker-card" aria-labelledby="acc-cc-checker-title">
          <h3 id="acc-cc-checker-title" class="block-title">{{ checkerTitle }}</h3>
          <p class="block-desc">{{ checkerDesc }}</p>

          <div class="checker-grid">
            <div class="picker-group">
              <label class="picker-label" for="acc-cc-text-color">{{ labelTextColor }}</label>
              <div class="picker-row">
                <input
                  id="acc-cc-text-color"
                  v-model="textColor"
                  type="color"
                  class="color-well"
                  aria-describedby="acc-cc-text-hex"
                />
                <input
                  id="acc-cc-text-hex"
                  v-model="textColor"
                  type="text"
                  class="hex-input"
                  spellcheck="false"
                  aria-label="HEX"
                />
              </div>
            </div>

            <div class="picker-group">
              <label class="picker-label" for="acc-cc-bg-color">{{ labelBgColor }}</label>
              <div class="picker-row">
                <input
                  id="acc-cc-bg-color"
                  v-model="bgColor"
                  type="color"
                  class="color-well"
                  aria-describedby="acc-cc-bg-hex"
                />
                <input
                  id="acc-cc-bg-hex"
                  v-model="bgColor"
                  type="text"
                  class="hex-input"
                  spellcheck="false"
                  aria-label="HEX"
                />
              </div>
              <WuiButton class="swap-button" :content="swapLabel" @click="swapColors" />
            </div>

            <div class="ratio-block">
              <p class="ratio-title">{{ ratioTitle }}</p>
              <p class="ratio-value">{{ ratioText }}</p>
            </div>
          </div>

          <div class="checker-detail">
            <!-- 状态判定列(源 NormalText/LargeText/Components 三检查) -->
            <ul class="check-list">
              <li v-for="item in checkItems" :key="item.key" class="check-item">
                <span class="check-badge" :class="item.passed ? 'is-pass' : 'is-fail'" aria-hidden="true">
                  {{ item.passed ? '✓' : '✕' }}
                </span>
                <span class="check-verdict" :class="item.passed ? 'is-pass' : 'is-fail'">
                  {{ item.passed ? textPass : textFail }}
                </span>
                <span class="check-texts">
                  <strong>{{ item.title }}</strong>
                  <span class="check-sub">{{ item.sub }}</span>
                </span>
              </li>
            </ul>

            <!-- 预览区(源 x:Bind ColorBrush 的预览网格;颜色为用户数据) -->
            <div class="preview-pane" :style="{ background: toCss(effectiveBg ?? { r: 255, g: 255, b: 255 }) }">
              <p class="preview-line" :style="{ color: toCss(effectiveText ?? { r: 0, g: 0, b: 0 }) }">
                {{ previewRegular }}
              </p>
              <div class="preview-line-group">
                <p class="preview-line preview-bold" :style="{ color: toCss(effectiveText ?? { r: 0, g: 0, b: 0 }) }">
                  {{ previewBold }}
                </p>
                <p class="preview-line preview-large" :style="{ color: toCss(effectiveText ?? { r: 0, g: 0, b: 0 }) }">
                  {{ previewLarge }}
                </p>
              </div>
              <div class="preview-components">
                <span class="preview-icon-tile" :style="{ background: toCss(effectiveText ?? { r: 0, g: 0, b: 0 }) }" aria-hidden="true">✓</span>
                <span class="preview-pill" :style="{ background: toCss(effectiveText ?? { r: 0, g: 0, b: 0 }) }" aria-hidden="true">
                  <span class="preview-pill-dot" />
                </span>
              </div>
              <p class="preview-caption" :style="{ color: toCss(effectiveText ?? { r: 0, g: 0, b: 0 }) }">
                {{ previewComponents }}
              </p>
            </div>
          </div>
        </section>

        <!-- ===== 本库主题对比度抽样表(实时 token 读取 + 4.5:1 线标注)===== -->
        <section class="sample-card" aria-labelledby="acc-cc-sample-title">
          <h3 id="acc-cc-sample-title" class="block-title">{{ sampleTitle }}</h3>
          <p class="block-desc">{{ sampleDesc }}</p>
          <div class="table-scroll" tabindex="0">
            <table class="sample-table">
              <thead>
                <tr>
                  <th scope="col">{{ colUsage }}</th>
                  <th scope="col">{{ colTokens }}</th>
                  <th scope="col">{{ colRatio }}</th>
                  <th scope="col" class="gauge-col">{{ colGauge }}</th>
                  <th scope="col">{{ colAA }}</th>
                  <th scope="col">{{ colAAA }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in sampleRows" :key="row.tokens">
                  <td>
                    {{ row.usage }}
                    <span v-if="row.note" class="row-note">{{ row.note }}</span>
                  </td>
                  <td class="token-cell">
                    <span class="token-swatch-pair">
                      <span class="token-swatch" :style="{ background: row.bgCss, borderColor: row.fgCss }" aria-hidden="true">
                        <span class="token-swatch-text" :style="{ color: row.fgCss }">Aa</span>
                      </span>
                    </span>
                    <code>{{ row.tokens }}</code>
                  </td>
                  <td class="ratio-cell">{{ row.ratioText }}</td>
                  <td class="gauge-col">
                    <span v-if="row.gauge !== null" class="gauge" aria-hidden="true">
                      <span class="gauge-tick" />
                      <span class="gauge-marker" :style="{ left: `${row.gauge}%` }" />
                    </span>
                    <span v-else class="ratio-cell">—</span>
                  </td>
                  <td :class="['verdict-cell', row.aa === true ? 'is-pass' : row.aa === false ? 'is-fail' : 'is-na']">
                    {{ row.aa === true ? '✓' : row.aa === false ? '✕' : '—' }}
                  </td>
                  <td :class="['verdict-cell', row.aaa === true ? 'is-pass' : row.aaa === false ? 'is-fail' : 'is-na']">
                    {{ row.aaa === true ? '✓' : row.aaa === false ? '✕' : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="block-desc">{{ docsTokenNote }}</p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="文本颜色预设" type="select" v-model="textColor" :options="TEXT_PRESET_CHOICES" />
        <DemoOptionRow label="背景颜色预设" type="select" v-model="bgColor" :options="BG_PRESET_CHOICES" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsThresholdsTitle }}</h3>
      <DemoDocsTable :headers="thresholdHeaders" :rows="thresholdRows" />
      <h3 class="docs-subtitle">{{ docsAlgoTitle }}</h3>
      <DemoCode :code="algorithmCode" language="ts" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.contrast-stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: 24px;
}

.checker-card,
.sample-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: var(--wui-application-page-background-theme);
}

.block-title {
  margin: 0;
  font-size: var(--wui-list-view-header-item-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.block-desc {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 检查器布局 —— */
.checker-grid {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(200px, 1fr) auto;
  gap: 16px;
  align-items: start;
}

@media (max-width: 720px) {
  .checker-grid {
    grid-template-columns: 1fr;
  }
}

.picker-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.picker-label {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-well {
  width: 48px;
  height: 32px;
  padding: 2px;
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.color-well:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.hex-input {
  min-width: 0;
  flex: 1;
  padding: 4px 8px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-box-foreground-theme);
  background: var(--wui-text-box-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-bottom-color: var(--wui-system-control-background-base-medium);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.hex-input:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.swap-button {
  align-self: flex-start;
  margin-top: 2px;
}

.ratio-block {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 140px;
  padding: 8px 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.ratio-title {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.ratio-value {
  margin: 0;
  font-size: var(--wui-text-style-large-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* —— 判定 + 预览 —— */
.checker-detail {
  display: grid;
  grid-template-columns: minmax(260px, 5fr) minmax(260px, 5fr);
  gap: 12px;
}

@media (max-width: 720px) {
  .checker-detail {
    grid-template-columns: 1fr;
  }
}

.check-list {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 12px;
  margin: 0;
  padding: 12px;
  list-style: none;
  background: var(--wui-system-control-background-chrome-medium-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.check-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  color: #ffffff;
  font-size: 14px;
}

.check-verdict {
  width: 52px;
  flex: none;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
}

/* SystemFillColorSuccess/Critical:theme.css 无同名 token,沿用 InfoBar 的最近似映射 */
.is-pass.check-badge,
.is-pass.check-verdict {
  background-color: #0f7b0f;
  color: #ffffff;
}

.is-fail.check-badge,
.is-fail.check-verdict {
  background-color: #c42b1c;
  color: #ffffff;
}

.is-pass.check-verdict {
  background: none;
  color: #0f7b0f;
}

.is-fail.check-verdict {
  background: none;
  color: #c42b1c;
}

html[data-theme='dark'] .is-pass.check-badge {
  background-color: #6dcc5f;
  color: #000000;
}

html[data-theme='dark'] .is-fail.check-badge {
  background-color: #ff99a4;
  color: #000000;
}

html[data-theme='dark'] .is-pass.check-verdict {
  color: #6dcc5f;
}

html[data-theme='dark'] .is-fail.check-verdict {
  color: #ff99a4;
}

.check-texts {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--wui-application-foreground-theme);
  font-size: var(--wui-control-content-theme-font-size);
}

.check-sub {
  color: var(--wui-application-secondary-foreground-theme);
}

/* 预览区:颜色全部来自用户输入数据(内容色),非主题样式 */
.preview-pane {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 12px;
  padding: 12px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  min-height: 200px;
}

.preview-line {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
}

.preview-bold {
  font-size: 14px;
  font-weight: 700;
}

.preview-large {
  font-size: 18px;
}

.preview-line-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-components {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-icon-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
}

.preview-pill {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 30px;
  border-radius: 15px;
}

.preview-pill-dot {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #ffffff;
}

.preview-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
}

/* —— 抽样表 —— */
.table-scroll {
  overflow-x: auto;
}

.sample-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.sample-table th,
.sample-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
  vertical-align: middle;
}

.sample-table th {
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.token-cell code {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  word-break: break-all;
}

.token-swatch-pair {
  display: inline-flex;
  margin-right: 8px;
  vertical-align: middle;
}

.token-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 22px;
  border: 1px solid;
  border-radius: 3px;
}

.token-swatch-text {
  font-size: 11px;
  line-height: 1;
}

.ratio-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.gauge-col {
  min-width: 180px;
}

.gauge {
  position: relative;
  display: block;
  height: 10px;
  background: var(--wui-system-control-background-base-low);
  border-radius: 5px;
}

/* 4.5:1 达标线(1–21 线性刻度上的固定位置) */
.gauge-tick {
  position: absolute;
  left: 17.5%;
  top: -3px;
  bottom: -3px;
  width: 2px;
  background: var(--wui-application-secondary-foreground-theme);
}

.gauge-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 6px;
  border-radius: 3px;
  background: var(--wui-hyperlink-foreground-theme);
}

.verdict-cell {
  font-weight: 600;
}

.verdict-cell.is-pass {
  color: #0f7b0f;
}

.verdict-cell.is-fail {
  color: #c42b1c;
}

.verdict-cell.is-na {
  color: var(--wui-application-secondary-foreground-theme);
}

html[data-theme='dark'] .verdict-cell.is-pass {
  color: #6dcc5f;
}

html[data-theme='dark'] .verdict-cell.is-fail {
  color: #ff99a4;
}

.row-note {
  display: block;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
