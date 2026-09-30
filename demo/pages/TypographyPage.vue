<script setup lang="ts">
// Typography 字型设计指南页(路由 /typography 自动注册,📖 指南条目:本库没有名为 Typography 的控件)。
// 对照官方 WinUI Gallery Typography 页(CK/WinUI-Gallery/WinUIGallery/Samples/Typography:
// Type ramp 字型阶梯 + 尺寸/行高/字重/变量字体列)实时渲染,并扩展:
//   1. 九档字型阶梯(Caption→Display)按官方取值渲染;
//   2. theme.css 字号 token 对照:通用阶梯是 TextBlockStyle 资源(非主题资源),theme.css 里
//      是控件专用字号 token,数值与阶梯档位对齐——token 数据经 demo/data/designTokens.ts
//      运行时解析,选中 token 即以 var() 实时预览;
//   3. 字重与字族:官方最佳实践(正文 Regular / 标题 SemiBold,最小 12 Regular / 14 Semibold)、
//      'XamlAutoFontFamily' 占位与 Segoe 字体栈说明。
import { computed, ref } from 'vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'
import { WUI_FONT_FAMILY_TOKENS, WUI_FONT_SIZE_TOKENS } from '../data/designTokens'
import type { WuiToken } from '../data/designTokens'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Typography(字型)', en: 'Typography' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '字型为 UI 提供结构与层次。Windows 默认字体是 Segoe UI Variable;最佳实践是正文用 Regular 字重、标题用 SemiBold,最小取值为 12px Regular / 14px SemiBold。本页对照官方 Type ramp 九档字型阶梯,并给出 theme.css 字号 token 与阶梯档位的对照。',
  en: 'Typography provides structure and hierarchy to UI. The Windows default font is Segoe UI Variable; best practice is Regular for body text and SemiBold for titles, with minimums of 12px Regular / 14px SemiBold. This page renders the official nine-step type ramp live and maps theme.css font-size tokens onto the ramp.',
}
const SEC_RAMP: BilingualText = { zh: '字型阶梯(Type ramp)', en: 'Type ramp' }
const RAMP_GUIDE: BilingualText = {
  zh: '官方阶梯共九档:小号文本(Caption/Body)用 Small/Text 变体 Regular 字重,大号标题(Subtitle 及以上)用 Display 变体 SemiBold。「字号/行高」单位 epx,与 CSS px 1:1;选中参数面板的档位可高亮对应行。',
  en: 'The official ramp has nine steps: small text (Caption/Body) uses the Small/Text variable-font axes at Regular, larger headings (Subtitle and up) use Display at SemiBold. "Size/Line height" is in epx, 1:1 with CSS px; pick a step in the options panel to highlight its row.',
}
const RAMP_EXAMPLE: BilingualText = { zh: '示例', en: 'Example' }
const RAMP_FONT: BilingualText = { zh: '变量字体', en: 'Variable font' }
const RAMP_SIZE: BilingualText = { zh: '字号/行高', en: 'Size/Line height' }
const RAMP_WEIGHT: BilingualText = { zh: '字重', en: 'Weight' }
const SEC_TOKENS: BilingualText = { zh: 'theme.css 字号 token 对照', en: 'theme.css font-size tokens vs the ramp' }
const TOKENS_GUIDE: BilingualText = {
  zh: '通用字型阶梯是 TextBlockStyle 资源(DisplayTextBlockStyle 等),不在主题字典里,因此 theme.css(仅提取 generic.xaml 的 ThemeDictionaries)不含 Display/Title 等阶梯字号;它收录的是控件专用字号 token(ToolTip 正文 12、控件正文 14、分组头 20……),数值恰与阶梯档位对齐——经 var() 引用即可获得一致排版。下方选中 token 即以其真实变量预览。',
  en: 'The generic ramp lives in TextBlockStyle resources (DisplayTextBlockStyle etc.), not in theme dictionaries — so theme.css (extracted from generic.xaml ThemeDictionaries only) has no Display/Title sizes. It collects control-specific font-size tokens (ToolTip body 12, control content 14, group headers 20…), whose values align with the ramp steps; reference them via var() for consistent typography. Pick a token below to preview its real variable.',
}
const TOKEN_PREVIEW_LABEL: BilingualText = { zh: '实时预览(以选中 token 取字号)', en: 'Live preview (font-size from the picked token)' }
const SEC_FAMILY: BilingualText = { zh: '字重与字族', en: 'Weights & font families' }
const FAMILY_GUIDE: BilingualText = {
  zh: '官方字重规范:正文 Regular(400)、标题 SemiBold(600),最小 12px Regular / 14px SemiBold。字体方面,WinUI 的默认字体写作 \'XamlAutoFontFamily\'(「系统默认字体」占位,Windows 11 上解析为 Segoe UI Variable);theme.css 原样保留该占位,浏览器会回退到默认字体,应用层可按需映射为 \'Segoe UI Variable\', \'Segoe UI\', system-ui 字体栈。图标字形用 Segoe Fluent Icons(--wui-symbol-theme-font-family)。',
  en: 'Official weight guidance: Regular (400) for body, SemiBold (600) for titles, minimums 12px Regular / 14px SemiBold. The WinUI default font is written as \'XamlAutoFontFamily\' (a "system default font" placeholder that resolves to Segoe UI Variable on Windows 11); theme.css keeps the placeholder, browsers fall back to their default font, and apps can map it to a \'Segoe UI Variable\', \'Segoe UI\', system-ui stack. Icon glyphs use Segoe Fluent Icons (--wui-symbol-theme-font-family).',
}
const WEIGHT_REGULAR: BilingualText = { zh: 'Regular(400)', en: 'Regular (400)' }
const WEIGHT_SEMIBOLD: BilingualText = { zh: 'SemiBold(600)', en: 'SemiBold (600)' }
const OPT_HIGHLIGHT: BilingualText = { zh: '阶梯高亮档位', en: 'Highlighted ramp step' }
const OPT_PREVIEW_TEXT: BilingualText = { zh: '预览文本', en: 'Preview text' }
const OPT_PREVIEW_TOKEN: BilingualText = { zh: '预览字号 token', en: 'Preview font-size token' }
const OPT_PREVIEW_WEIGHT: BilingualText = { zh: '预览字重 600', en: 'Preview weight 600' }
const DOCS_RAMP_TITLE: BilingualText = { zh: '字型阶梯(官方取值)', en: 'Type ramp (official values)' }
const DOCS_TOKENS_TITLE: BilingualText = { zh: 'theme.css 字号 token(运行时解析)', en: 'Font-size tokens in theme.css (parsed live)' }
const DOCS_FAMILIES_TITLE: BilingualText = { zh: 'theme.css 字体族 token(运行时解析)', en: 'Font-family tokens in theme.css (parsed live)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const secRamp = useBilingual(i18n, SEC_RAMP)
const rampGuide = useBilingual(i18n, RAMP_GUIDE)
const rampExample = useBilingual(i18n, RAMP_EXAMPLE)
const rampFont = useBilingual(i18n, RAMP_FONT)
const rampSize = useBilingual(i18n, RAMP_SIZE)
const rampWeight = useBilingual(i18n, RAMP_WEIGHT)
const secTokens = useBilingual(i18n, SEC_TOKENS)
const tokensGuide = useBilingual(i18n, TOKENS_GUIDE)
const tokenPreviewLabel = useBilingual(i18n, TOKEN_PREVIEW_LABEL)
const secFamily = useBilingual(i18n, SEC_FAMILY)
const familyGuide = useBilingual(i18n, FAMILY_GUIDE)
const weightRegular = useBilingual(i18n, WEIGHT_REGULAR)
const weightSemibold = useBilingual(i18n, WEIGHT_SEMIBOLD)
const optHighlight = useBilingual(i18n, OPT_HIGHLIGHT)
const optPreviewText = useBilingual(i18n, OPT_PREVIEW_TEXT)
const optPreviewToken = useBilingual(i18n, OPT_PREVIEW_TOKEN)
const optPreviewWeight = useBilingual(i18n, OPT_PREVIEW_WEIGHT)
const docsRampTitle = useBilingual(i18n, DOCS_RAMP_TITLE)
const docsTokensTitle = useBilingual(i18n, DOCS_TOKENS_TITLE)
const docsFamiliesTitle = useBilingual(i18n, DOCS_FAMILIES_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// ======================================================================
// 字型阶梯(官方 TypographyPage.xaml 的九档取值)
// ======================================================================
interface RampStep {
  style: string
  size: number
  lineHeight: number
  weight: number
  variableFont: BilingualText
  xamlStyle: string
}

const RAMP: RampStep[] = [
  { style: 'Caption', size: 12, lineHeight: 16, weight: 400, variableFont: { zh: 'Small, Regular', en: 'Small, Regular' }, xamlStyle: 'CaptionTextBlockStyle' },
  { style: 'Body', size: 14, lineHeight: 20, weight: 400, variableFont: { zh: 'Text, Regular', en: 'Text, Regular' }, xamlStyle: 'BodyTextBlockStyle' },
  { style: 'Body Strong', size: 14, lineHeight: 20, weight: 600, variableFont: { zh: 'Text, SemiBold', en: 'Text, SemiBold' }, xamlStyle: 'BodyStrongTextBlockStyle' },
  { style: 'Body Large', size: 18, lineHeight: 24, weight: 400, variableFont: { zh: 'Text, Regular', en: 'Text, Regular' }, xamlStyle: 'BodyLargeTextBlockStyle' },
  { style: 'Body Large Strong', size: 18, lineHeight: 24, weight: 600, variableFont: { zh: 'Text, SemiBold', en: 'Text, SemiBold' }, xamlStyle: 'BodyLargeStrongTextBlockStyle' },
  { style: 'Subtitle', size: 20, lineHeight: 28, weight: 600, variableFont: { zh: 'Display, SemiBold', en: 'Display, SemiBold' }, xamlStyle: 'SubtitleTextBlockStyle' },
  { style: 'Title', size: 28, lineHeight: 36, weight: 600, variableFont: { zh: 'Display, SemiBold', en: 'Display, SemiBold' }, xamlStyle: 'TitleTextBlockStyle' },
  { style: 'Title Large', size: 40, lineHeight: 52, weight: 600, variableFont: { zh: 'Display, SemiBold', en: 'Display, SemiBold' }, xamlStyle: 'TitleLargeTextBlockStyle' },
  { style: 'Display', size: 68, lineHeight: 92, weight: 600, variableFont: { zh: 'Display, SemiBold', en: 'Display, SemiBold' }, xamlStyle: 'DisplayTextBlockStyle' },
]

// —— 阶梯高亮(参数面板联动)——
const highlightStep = ref<string | number | boolean>('Title')
const HIGHLIGHT_OPTIONS = RAMP.map((step) => ({ label: step.style, value: step.style }))

// ======================================================================
// theme.css 字号 token 对照(数据来自 designTokens 运行时解析)
// ======================================================================
/** token 用途与最近阶梯档位(说明列;tier 为官方阶梯最近档,'—' 表示图标/装饰用途)。 */
const FONT_TOKEN_NOTES: Record<string, { usage: BilingualText; tier: string }> = {
  'combo-box-arrow-theme-font-size': { usage: { zh: 'ComboBox 下拉箭头字形', en: 'ComboBox drop-down arrow glyph' }, tier: '—(图标)' },
  'control-content-theme-font-size': { usage: { zh: '全部控件正文(ControlContentThemeFontSize)', en: 'All control content text' }, tier: 'Body (14)' },
  'content-control-font-size': { usage: { zh: 'ContentControl 正文', en: 'ContentControl content' }, tier: 'Body (14)' },
  'hub-header-theme-font-size': { usage: { zh: 'Hub 页头', en: 'Hub header' }, tier: '介于 Title 与 Title Large(34)' },
  'hub-section-header-theme-font-size': { usage: { zh: 'Hub 分区标头', en: 'Hub section header' }, tier: 'Subtitle (20)' },
  'hub-section-header-see-more-theme-font-size': { usage: { zh: 'Hub 分区「查看更多」', en: 'Hub section see-more' }, tier: 'Body (14)' },
  'mtc-media-font-size': { usage: { zh: '媒体传输控件文本', en: 'Media transport controls text' }, tier: 'Caption (12)' },
  'pivot-header-item-font-size': { usage: { zh: 'Pivot 页签项', en: 'Pivot header item' }, tier: '介于 Subtitle 与 Title(24)' },
  'pivot-title-font-size': { usage: { zh: 'Pivot 标题', en: 'Pivot title' }, tier: 'Body (14)' },
  'semantic-zoom-button-font-size': { usage: { zh: 'SemanticZoom 分组字母(放大背景字形)', en: 'SemanticZoom group letter glyph' }, tier: '—(装饰)' },
  'text-style-large-font-size': { usage: { zh: 'TextStyleLarge(旧版阶梯)', en: 'TextStyleLarge (legacy ramp)' }, tier: '≈ Body Large (18)' },
  'text-style-extra-large-font-size': { usage: { zh: 'TextStyleExtraLarge(旧版阶梯)', en: 'TextStyleExtraLarge (legacy ramp)' }, tier: '≈ Subtitle+(25.5)' },
  'tool-tip-content-theme-font-size': { usage: { zh: 'ToolTip 正文', en: 'ToolTip content' }, tier: 'Caption (12)' },
  'list-view-header-item-theme-font-size': { usage: { zh: 'ListView 分组头', en: 'ListView group header' }, tier: 'Subtitle (20)' },
  'grid-view-header-item-theme-font-size': { usage: { zh: 'GridView 分组头', en: 'GridView group header' }, tier: 'Subtitle (20)' },
  'key-tip-content-theme-font-size': { usage: { zh: 'KeyTip 键提示文本', en: 'KeyTip content' }, tier: 'Caption (12)' },
  'scroll-bar-button-arrow-icon-font-size': { usage: { zh: '滚动条箭头字形', en: 'Scroll bar arrow glyph' }, tier: '—(图标)' },
  'auto-suggest-box-icon-font-size': { usage: { zh: 'AutoSuggestBox 查询图标字形', en: 'AutoSuggestBox query icon glyph' }, tier: '—(图标)' },
}

function tokenNote(token: WuiToken): { usage: BilingualText; tier: string } {
  return (
    FONT_TOKEN_NOTES[token.name] ?? {
      usage: { zh: '控件专用字号', en: 'Control-specific size' },
      tier: '—',
    }
  )
}

// —— 实时预览(参数面板联动)——
const previewToken = ref<string | number | boolean>('--wui-control-content-theme-font-size')
const previewText = ref<string | number | boolean>('WinUI on the Web')
const previewBold = ref<string | number | boolean>(false)

const TOKEN_OPTIONS = WUI_FONT_SIZE_TOKENS.map((token) => ({ label: token.cssVar, value: token.cssVar }))
const previewTokenData = computed<WuiToken | null>(
  () => WUI_FONT_SIZE_TOKENS.find((token) => token.cssVar === previewToken.value) ?? null,
)
const previewStyle = computed(() => ({
  fontSize: previewTokenData.value ? `var(${previewTokenData.value.cssVar})` : undefined,
  fontWeight: previewBold.value === true ? 600 : 400,
}))
const previewValueText = computed(() =>
  previewTokenData.value ? `${previewTokenData.value.cssVar} = ${previewTokenData.value.light}` : '',
)
const previewTextValue = computed(() => {
  const text = String(previewText.value).trim()
  return text === '' ? 'WinUI on the Web' : text
})

// —— 字重演示(Regular / SemiBold)——
const weightDemoText = 'The quick brown fox jumps over the lazy dog 0123456789'

/** 码点 → 字形字符(图标字体栈样例;异常回退问号占位)。 */
function toGlyphChar(code: string): string {
  try {
    return String.fromCodePoint(Number.parseInt(code, 16))
  } catch {
    return '?'
  }
}

/** 字族样例字形:Setting(E713)/ Mail(E8BD)/ Favorite(E72C)。 */
const FAMILY_GLYPHS = ['E713', 'E8BD', 'E72C'].map(toGlyphChar).join(' ')

// ======================================================================
// 下半区固定开发文档
// ======================================================================
const DOCS_RAMP_HEADERS = ['Style', '字号/行高(epx)', '字重', '变量字体', 'XAML Style 资源']
const DOCS_RAMP_ROWS: (string | number)[][] = RAMP.map((step) => [
  step.style,
  `${step.size}/${step.lineHeight}`,
  step.weight,
  step.variableFont.zh,
  step.xamlStyle,
])

const DOCS_TOKENS_HEADERS = ['token', '值', '用途', '最近阶梯档位']
const DOCS_TOKENS_ROWS: (string | number)[][] = WUI_FONT_SIZE_TOKENS.map((token) => [
  token.cssVar,
  token.light,
  tokenNote(token).usage.zh,
  tokenNote(token).tier,
])

const DOCS_FAMILIES_HEADERS = ['token', '值(两主题同值)', '说明']
const FAMILY_NOTES: Record<string, string> = {
  'content-control-theme-font-family': "'XamlAutoFontFamily' 占位 → Segoe UI Variable",
  'mtc-media-font-family': '媒体传输控件(MTC)字体',
  'phone-font-family-normal': 'Phone 系列 Regular 字重字体',
  'phone-font-family-semi-light': 'Phone 系列 SemiLight 字重字体',
  'pivot-header-item-font-family': 'Pivot 页签字体',
  'pivot-title-font-family': 'Pivot 标题字体',
  'symbol-theme-font-family': '图标字体栈(Segoe Fluent Icons / Segoe MDL2 Assets)',
  'key-tip-font-family': 'KeyTip 键提示字体',
}
const DOCS_FAMILIES_ROWS: (string | number)[][] = WUI_FONT_FAMILY_TOKENS.map((token) => [
  token.cssVar,
  token.light,
  FAMILY_NOTES[token.name] ?? '',
])

const usageCode = `<!-- WinUI 原生:TextBlock 套用字型阶梯 Style 资源 -->
<TextBlock Text="Title" Style="{StaticResource TitleTextBlockStyle}" />
<TextBlock Text="Body" Style="{StaticResource BodyTextBlockStyle}" />

<!-- Web(本库):阶梯档位直接落 CSS(数值与官方 ramp 一致),控件字号用 token -->
.wui-title { font-size: 28px; line-height: 36px; font-weight: 600; }   /* TitleTextBlockStyle */
.wui-body  { font-size: 14px; line-height: 20px; font-weight: 400; }   /* BodyTextBlockStyle */
.wui-tip   { font-size: var(--wui-tool-tip-content-theme-font-size); }  /* 12px,控件专用 */`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Typography">
    <template #demo>
      <div class="type-stage">
        <!-- —— 1. 字型阶梯 —— -->
        <section>
          <h4 class="section-title">{{ secRamp }}</h4>
          <p class="guide-text">{{ rampGuide }}</p>
          <div class="ramp-head ramp-grid" aria-hidden="true">
            <span>{{ rampExample }}</span>
            <span>{{ rampFont }}</span>
            <span>{{ rampSize }}</span>
            <span>{{ rampWeight }}</span>
          </div>
          <div class="ramp-list">
            <div
              v-for="step in RAMP"
              :key="step.style"
              class="ramp-row ramp-grid"
              :class="{ 'ramp-active': step.style === highlightStep }"
            >
              <p
                class="ramp-example"
                :style="{ fontSize: `${step.size}px`, lineHeight: `${step.lineHeight}px`, fontWeight: step.weight }"
              >
                {{ step.style }}
              </p>
              <span class="ramp-meta">{{ pickText(i18n, step.variableFont) }}</span>
              <span class="ramp-meta">{{ step.size }}/{{ step.lineHeight }} epx</span>
              <span class="ramp-meta">{{ step.weight }}</span>
            </div>
          </div>
        </section>

        <!-- —— 2. theme.css 字号 token 对照 —— -->
        <section>
          <h4 class="section-title">{{ secTokens }}</h4>
          <p class="guide-text">{{ tokensGuide }}</p>
          <div class="token-preview" :style="previewStyle">
            {{ previewTextValue }}
          </div>
          <p class="preview-value">{{ tokenPreviewLabel }}: <code>{{ previewValueText }}</code></p>
        </section>

        <!-- —— 3. 字重与字族 —— -->
        <section>
          <h4 class="section-title">{{ secFamily }}</h4>
          <p class="guide-text">{{ familyGuide }}</p>
          <div class="weight-demo">
            <div class="weight-col">
              <p class="weight-label">{{ weightRegular }}</p>
              <p class="weight-sample" :style="{ fontWeight: 400 }">{{ weightDemoText }}</p>
            </div>
            <div class="weight-col">
              <p class="weight-label">{{ weightSemibold }}</p>
              <p class="weight-sample" :style="{ fontWeight: 600 }">{{ weightDemoText }}</p>
            </div>
          </div>
          <p class="family-sample">
            <span class="family-ui">Segoe UI Variable / system-ui(默认字族)</span>
            <span class="family-symbol" aria-hidden="true">{{ FAMILY_GLYPHS }}</span>
          </p>
          <div class="family-table">
            <DemoDocsTable :headers="DOCS_FAMILIES_HEADERS" :rows="DOCS_FAMILIES_ROWS" />
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="optHighlight" type="select" v-model="highlightStep" :options="HIGHLIGHT_OPTIONS" />
        <DemoOptionRow :label="optPreviewToken" type="select" v-model="previewToken" :options="TOKEN_OPTIONS" />
        <DemoOptionRow :label="optPreviewText" type="text" v-model="previewText" placeholder="WinUI on the Web" />
        <DemoOptionRow :label="optPreviewWeight" type="toggle" v-model="previewBold" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsRampTitle }}</h4>
      <DemoDocsTable :headers="DOCS_RAMP_HEADERS" :rows="DOCS_RAMP_ROWS" />
      <h4 class="docs-subtitle">{{ docsTokensTitle }}</h4>
      <p class="docs-note">{{ tokensGuide }}</p>
      <DemoDocsTable :headers="DOCS_TOKENS_HEADERS" :rows="DOCS_TOKENS_ROWS" />
      <h4 class="docs-subtitle">{{ docsFamiliesTitle }}</h4>
      <DemoDocsTable :headers="DOCS_FAMILIES_HEADERS" :rows="DOCS_FAMILIES_ROWS" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="xml" />
    </template>
  </DemoPage>
</template>

<style scoped>
.type-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
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
  max-width: 880px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 1. 字型阶梯 —— */
.ramp-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px 110px 70px;
  gap: 12px;
  align-items: center;
}

.ramp-head {
  padding: 4px 12px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.ramp-list {
  display: flex;
  flex-direction: column;
}

.ramp-row {
  padding: 6px 12px;
  border-left: 3px solid transparent;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.ramp-row:nth-child(odd) {
  background: var(--wui-system-control-background-chrome-medium-low);
}

.ramp-row.ramp-active {
  border-left-color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  background: var(--wui-system-control-background-list-low);
}

.ramp-example {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--wui-application-foreground-theme);
}

.ramp-meta {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 2. 字号 token 对照 —— */
.token-preview {
  min-height: 40px;
  padding: 12px 16px;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  overflow-wrap: anywhere;
}

.preview-value {
  margin: 8px 0 12px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.preview-value code {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  color: var(--wui-application-header-foreground-theme);
}

.family-table {
  max-width: 100%;
}

/* —— 3. 字重与字族 —— */
.weight-demo {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 720px) {
  .weight-demo {
    grid-template-columns: 1fr;
  }
}

.weight-col {
  padding: 12px 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.weight-label {
  margin: 0 0 4px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.weight-sample {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.family-sample {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin: 12px 0;
  padding: 12px 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.family-ui {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.family-symbol {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-hub-section-header-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.docs-note {
  margin: 0 0 8px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}
</style>
