<script setup lang="ts">
// Spacing 间距设计指南页(路由 /spacing 自动注册,📖 指南条目:本库没有名为 Spacing 的控件)。
// 对照官方 WinUI Gallery Spacing 页(CK/WinUI-Gallery/WinUIGallery/Samples/Spacing/SpacingPage.xaml:
// 4px 网格说明 + 间距阶梯条 + 卡片/表单布局示例图)以 Web 实时渲染复刻,并扩展:
//   1. 间距阶梯(4/8/12/16/24/36/48 epx)可视化条 + 官方用途说明;
//   2. 交互演示:滑块实时调元素间距(gap)与容器内边距(padding),可叠加间距标注;
//   3. 标准/紧凑密度行距对照(16→8,呼应 CompactSizing 指南页);
//   4. 圆角联动:theme.css 圆角 token 数据来自 demo/data/designTokens.ts 运行时解析。
// 注意:WinUI 主题字典不含 Thickness(间距)类主题资源,theme.css 无间距 token;
// 间距值来自官方设计指南约定与各控件资源的 Thickness 常量,Web 侧直接用 CSS gap/margin/padding 表达。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiCheckBox from '@/components/CheckBox.vue'
import WuiTextBox from '@/components/TextBox.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'
import { WUI_CORNER_RADIUS_TOKENS } from '../data/designTokens'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Spacing(间距)', en: 'Spacing' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '深思熟虑的间距设计能增强可读性与流程感。一致尺寸的间距与栏距把体验在语义上分组为独立组件;这些取值同时映射到圆角逻辑,共同营造连贯、可用的布局。WinUI 的最佳实践是使用 4px 网格:任何间距与尺寸都应是 4 的倍数——取值规整、易于缩放。',
  en: 'Thoughtful spacing design enhances readability and flow. Consistently sized spacing and gutters semantically group an experience into separate components; the values also map to the rounded corner logic. The WinUI best practice is a 4px grid: any spacing or sizing should be a multiple of 4.',
}
const SEC_GRID: BilingualText = { zh: '4px 网格与圆角', en: 'The 4px grid & corner radius' }
const GRID_GUIDE: BilingualText = {
  zh: '官方建议间距与尺寸全部落在 4px 网格上(4 / 8 / 12 / 16 / 24 / 36 / 48 是最常用档位),并指出「这些取值映射到我们的圆角逻辑」。theme.css 中唯一的圆角 token 恰为 4px(下表由 theme.css 运行时解析),与网格同源——这正是 WinUI 界面「模块感」的来源。',
  en: 'Official guidance puts every spacing and size on the 4px grid (4 / 8 / 12 / 16 / 24 / 36 / 48 are the common steps) and notes these values "map to our rounded corner logic". The only corner-radius token in theme.css is exactly 4px (parsed live below), sharing the grid\'s origin — the source of WinUI\'s modular look.',
}
const SEC_RAMP: BilingualText = { zh: '间距阶梯(官方档位)', en: 'Spacing ramp (official steps)' }
const RAMP_GUIDE: BilingualText = {
  zh: '官方 Spacing 示例页给出七个常用档位与各自用途(单位 epx,与 CSS px 1:1)。下条按真实像素宽度渲染,悬停/阅读右列了解用途。',
  en: 'The official Spacing sample lists seven common steps and their usage (unit epx, 1:1 with CSS px). The bars below render at true pixel width; the right column explains each usage.',
}
const SEC_LAYOUT: BilingualText = { zh: '布局示例:卡片与表单', en: 'Layouts: cards & form' }
const LAYOUT_GUIDE: BilingualText = {
  zh: '官方示例以「卡片布局」与「表单(对话框)布局」两张图展示档位的实际落位;此处以实时渲染复刻,徽标标注所用档位:页面内边距 36、区块间距 24、卡片内边距 16、卡片间 12、控件与标头 12、控件之间 8。',
  en: 'The official sample shows a "page with cards" and a "form layout" image; rendered live here with badges marking the steps: page padding 36, section spacing 24, card padding 16, card gap 12, control+header 12, control-to-control 8.',
}
const LAYOUT_CARDS: BilingualText = { zh: '卡片布局(Page with cards)', en: 'Page with cards' }
const LAYOUT_FORM: BilingualText = { zh: '表单布局(Form / Dialog)', en: 'Form layout' }
const SEC_LIVE: BilingualText = { zh: '交互演示:元素间距与内边距', en: 'Interactive: element spacing & padding' }
const LIVE_GUIDE: BilingualText = {
  zh: 'WinUI 的 StackPanel.Spacing / Margin 在 Web 侧对应 CSS 的 gap / margin / padding。拖动下方参数实时调整演示卡片的元素间距与内边距,开启标注查看当前取值;间距为 0 时元素贴合,即「紧凑密度」的起点(见下方对照)。',
  en: 'WinUI StackPanel.Spacing / Margin map to CSS gap / margin / padding. Adjust the demo card\'s element gap and padding with the option sliders and enable badges to read the current values; a 0 gap is where compact density starts (see the comparison below).',
}
const SEC_DENSITY: BilingualText = { zh: '标准 / 紧凑密度行距对照', en: 'Standard vs compact density spacing' }
const DENSITY_GUIDE: BilingualText = {
  zh: '官方 Compact Sizing 示例在标准页与紧凑页间切换时,同时把 StackPanel 的 Spacing 从 16 收紧到 8(紧凑密度不缩字号,只收高度与间距)。左列为标准行距 16,右列为紧凑行距 8;全控件对照见 CompactSizing 指南页。',
  en: 'The official Compact Sizing sample tightens StackPanel Spacing from 16 to 8 when switching to the compact page (compact density keeps font sizes, compressing heights and spacing). Left: standard 16; right: compact 8. For the full control comparison see the CompactSizing guide page.',
}
const DENSITY_STANDARD: BilingualText = { zh: '标准 Spacing=16', en: 'Standard Spacing=16' }
const DENSITY_COMPACT: BilingualText = { zh: '紧凑 Spacing=8', en: 'Compact Spacing=8' }
const OPT_GAP: BilingualText = { zh: '元素间距 gap(px)', en: 'Element gap (px)' }
const OPT_PADDING: BilingualText = { zh: '容器内边距 padding(px)', en: 'Container padding (px)' }
const OPT_BADGES: BilingualText = { zh: '显示间距标注', en: 'Show spacing badges' }
const OPT_DIRECTION: BilingualText = { zh: '排布方向', en: 'Direction' }
const DIRECTION_ROW: BilingualText = { zh: '横向(Row)', en: 'Row' }
const DIRECTION_COLUMN: BilingualText = { zh: '纵向(Column)', en: 'Column' }
const DOCS_RAMP_TITLE: BilingualText = { zh: '间距阶梯(官方档位与用途)', en: 'Spacing ramp (official steps & usage)' }
const DOCS_DENSITY_TITLE: BilingualText = { zh: '密度资源对照(紧凑×间距相关,详见 CompactSizing)', en: 'Density resources (spacing-related; see CompactSizing)' }
const DOCS_RADIUS_TITLE: BilingualText = { zh: 'theme.css 圆角 token(运行时解析)', en: 'Corner-radius token in theme.css (parsed live)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const secGrid = useBilingual(i18n, SEC_GRID)
const gridGuide = useBilingual(i18n, GRID_GUIDE)
const secRamp = useBilingual(i18n, SEC_RAMP)
const rampGuide = useBilingual(i18n, RAMP_GUIDE)
const secLayout = useBilingual(i18n, SEC_LAYOUT)
const layoutGuide = useBilingual(i18n, LAYOUT_GUIDE)
const layoutCards = useBilingual(i18n, LAYOUT_CARDS)
const layoutForm = useBilingual(i18n, LAYOUT_FORM)
const secLive = useBilingual(i18n, SEC_LIVE)
const liveGuide = useBilingual(i18n, LIVE_GUIDE)
const secDensity = useBilingual(i18n, SEC_DENSITY)
const densityGuide = useBilingual(i18n, DENSITY_GUIDE)
const densityStandard = useBilingual(i18n, DENSITY_STANDARD)
const densityCompact = useBilingual(i18n, DENSITY_COMPACT)
const optGap = useBilingual(i18n, OPT_GAP)
const optPadding = useBilingual(i18n, OPT_PADDING)
const optBadges = useBilingual(i18n, OPT_BADGES)
const optDirection = useBilingual(i18n, OPT_DIRECTION)
const directionRow = useBilingual(i18n, DIRECTION_ROW)
const directionColumn = useBilingual(i18n, DIRECTION_COLUMN)
const docsRampTitle = useBilingual(i18n, DOCS_RAMP_TITLE)
const docsDensityTitle = useBilingual(i18n, DOCS_DENSITY_TITLE)
const docsRadiusTitle = useBilingual(i18n, DOCS_RADIUS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// ======================================================================
// 间距阶梯(官方 SpacingPage.xaml 的档位与用途文案)
// ======================================================================
const RAMP: { value: number; usage: BilingualText }[] = [
  { value: 4, usage: { zh: '紧凑尺寸下的间距', en: 'Spacing used for compact sizing' } },
  { value: 8, usage: { zh: '控件之间、控件与标签之间', en: 'Spacing between UI controls, control + label' } },
  { value: 12, usage: { zh: '控件与标头、界面与边缘文字、文字段落之间', en: 'Spacing between control + header, surface and edge text, text sections' } },
  { value: 16, usage: { zh: '列表样式、卡片的内边距', en: 'Padding used in list styles, cards' } },
  { value: 24, usage: { zh: '内容区块之间', en: 'Spacing between content sections' } },
  { value: 36, usage: { zh: '页面内边距', en: 'Padding on pages' } },
  { value: 48, usage: { zh: '带标题的页面区块之间', en: 'Spacing between page sections with title' } },
]

// ======================================================================
// 交互演示:gap / padding 滑块 + 标注(DemoOptionRow 联合类型契约)
// ======================================================================
const gap = ref<string | number | boolean>(16)
const padding = ref<string | number | boolean>(16)
const showBadges = ref<string | number | boolean>(true)
const direction = ref<string | number | boolean>('column')

const gapValue = computed(() => clampStep(Number(gap.value)))
const paddingValue = computed(() => clampStep(Number(padding.value)))
const isColumn = computed(() => direction.value !== 'row')

/** 收敛到 4px 网格(0–48,步进 4)。 */
function clampStep(raw: number): number {
  if (!Number.isFinite(raw)) return 16
  return Math.min(48, Math.max(0, Math.round(raw / 4) * 4))
}

const DIRECTION_OPTIONS = computed(() => [
  { label: directionRow.value, value: 'column' },
  { label: directionColumn.value, value: 'row' },
])

// —— 交互演示状态 ——
const demoName = ref('')
const demoChecked = ref(true)

// ======================================================================
// 下半区固定开发文档
// ======================================================================
const DOCS_RAMP_HEADERS = ['取值(epx)', '用途(官方说明)']
const DOCS_RAMP_ROWS: (string | number)[][] = RAMP.map((step) => [step.value, step.usage.zh])

const DOCS_DENSITY_HEADERS = ['资源键(ResourceKey)', '标准值', '紧凑值', '影响范围']
const DOCS_DENSITY_ROWS: (string | number)[][] = [
  ['TextControlThemeMinHeight', '32', '24', 'TextBox / PasswordBox / AutoSuggestBox / ComboBox 等输入类宿主最小高度'],
  ['TextControlThemePadding', '10,3,6,6', '2,2,6,1', '同上(内容区内边距)'],
  ['ListViewItemMinHeight', '40', '32', 'ListView 项 / AutoSuggestBox 候选行'],
  ['TreeViewItemMinHeight', '28', '24', 'TreeView 节点行'],
  ['NavigationViewItemOnLeftMinHeight', '36', '32', 'NavigationView 左侧导航项'],
  ['ControlContentThemeFontSize', '14', '14(不变)', '全部控件文本(紧凑密度不缩字号)'],
]

const DOCS_RADIUS_HEADERS = ['token', '值', '对应 WinUI 资源']
const DOCS_RADIUS_ROWS = WUI_CORNER_RADIUS_TOKENS.map(
  (token) => [token.cssVar, token.light, 'HyperlinkFocusRectCornerRadius(ControlCornerRadius=4 的控件圆角为发行版资源,未在本 generic.xaml 提取范围内)'] as (string | number)[],
)

const usageCode = `<!-- WinUI 原生:StackPanel 以 Spacing 统一子元素间距(4px 网格取值) -->
<StackPanel Spacing="12">
  <TextBox Header="First Name:" />
  <TextBox Header="Last Name:" />
</StackPanel>

<!-- Web(本库):间距用 CSS gap / padding 表达,取值同样落在 4px 网格 -->
<div style="display: flex; flex-direction: column; gap: 12px; padding: 16px;">
  <WuiTextBox header="First Name:" />
  <WuiTextBox header="Last Name:" />
</div>

<!-- 紧凑密度:高度与间距收紧(16 → 8),字号不变,详见 CompactSizing 指南页 -->
<div class="wui-density-compact" style="display: flex; flex-direction: column; gap: 8px;">
  <WuiTextBox header="First Name:" />
</div>`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="spacing-stage">
        <!-- —— 1. 4px 网格与圆角 —— -->
        <section>
          <h4 class="section-title">{{ secGrid }}</h4>
          <p class="guide-text">{{ gridGuide }}</p>
          <div class="grid-visual" aria-hidden="true">
            <span v-for="n in 4" :key="n" class="grid-cell" :style="{ width: '16px', height: '16px' }"></span>
            <span class="grid-note">4px 网格</span>
            <span
              v-for="token in WUI_CORNER_RADIUS_TOKENS"
              :key="token.cssVar"
              class="radius-chip"
              :title="`${token.cssVar} = ${token.light}`"
            >
              {{ token.cssVar }} = {{ token.light }}
            </span>
          </div>
        </section>

        <!-- —— 2. 间距阶梯 —— -->
        <section>
          <h4 class="section-title">{{ secRamp }}</h4>
          <p class="guide-text">{{ rampGuide }}</p>
          <div class="ramp-list">
            <div v-for="step in RAMP" :key="step.value" class="ramp-row">
              <span class="ramp-value">{{ step.value }}epx</span>
              <span class="ramp-bar-track">
                <span class="ramp-bar" :style="{ width: `${step.value}px` }"></span>
              </span>
              <span class="ramp-usage">{{ pickText(i18n, step.usage) }}</span>
            </div>
          </div>
        </section>

        <!-- —— 3. 布局示例 —— -->
        <section>
          <h4 class="section-title">{{ secLayout }}</h4>
          <p class="guide-text">{{ layoutGuide }}</p>
          <div class="layout-grid">
            <!-- 卡片布局 -->
            <figure class="layout-figure">
              <figcaption class="layout-caption">{{ layoutCards }}</figcaption>
              <div class="mock-page">
                <span class="badge badge-page">36</span>
                <div class="mock-section">
                  <span class="badge badge-section">24</span>
                  <div class="mock-cards">
                    <div v-for="cardIndex in 3" :key="cardIndex" class="mock-card">
                      <span class="badge badge-card">16</span>
                      <p class="mock-card-title">Card {{ cardIndex }}</p>
                      <p class="mock-card-body">16px padding · 12px gap</p>
                    </div>
                    <span class="badge badge-gap">12</span>
                  </div>
                </div>
              </div>
            </figure>
            <!-- 表单布局 -->
            <figure class="layout-figure">
              <figcaption class="layout-caption">{{ layoutForm }}</figcaption>
              <div class="mock-page">
                <span class="badge badge-page">36</span>
                <div class="mock-section">
                  <span class="badge badge-section">24</span>
                  <p class="mock-form-title">Dialog title</p>
                  <div class="mock-rows">
                    <div class="mock-row">
                      <span class="badge badge-row">8</span>
                      <span class="mock-label">Label</span>
                      <span class="mock-input"></span>
                    </div>
                    <div class="mock-row">
                      <span class="badge badge-row">8</span>
                      <span class="mock-label">Label</span>
                      <span class="mock-input"></span>
                    </div>
                    <span class="badge badge-header-gap">12</span>
                  </div>
                </div>
              </div>
            </figure>
          </div>
        </section>

        <!-- —— 4. 交互演示 —— -->
        <section>
          <h4 class="section-title">{{ secLive }}</h4>
          <p class="guide-text">{{ liveGuide }}</p>
          <div
            class="spacing-card"
            :class="{ 'show-badges': showBadges === true }"
            :style="{ padding: `${paddingValue}px` }"
          >
            <span class="badge badge-live">padding {{ paddingValue }}</span>
            <p class="demo-caption">StackPanel Spacing={{ gapValue }}(4px 网格:{{ gapValue % 4 === 0 ? '✓' : '✗' }})</p>
            <div class="demo-cluster" :style="{ flexDirection: isColumn ? 'column' : 'row', gap: `${gapValue}px` }">
              <WuiTextBox v-model:text="demoName" header="First Name:" placeholder-text="输入以预览" />
              <WuiButton content="OK" />
              <WuiCheckBox v-model:checked="demoChecked" content="Remember me" />
            </div>
          </div>
        </section>

        <!-- —— 5. 标准 / 紧凑行距对照 —— -->
        <section>
          <h4 class="section-title">{{ secDensity }}</h4>
          <p class="guide-text">{{ densityGuide }}</p>
          <div class="density-grid">
            <div class="density-col">
              <p class="density-title">{{ densityStandard }}</p>
              <div class="density-form" :style="{ gap: '16px' }">
                <WuiTextBox header="First Name:" placeholder-text="标准密度" />
                <WuiTextBox header="Last Name:" placeholder-text="高 32px" />
                <WuiButton content="Submit" />
              </div>
            </div>
            <div class="density-col">
              <p class="density-title">{{ densityCompact }}</p>
              <div class="density-form" :style="{ gap: '8px' }">
                <WuiTextBox header="First Name:" placeholder-text="紧凑密度" />
                <WuiTextBox header="Last Name:" placeholder-text="高 24px" />
                <WuiButton content="Submit" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="optGap" type="slider" v-model="gap" :min="0" :max="48" :step="4" />
        <DemoOptionRow :label="optPadding" type="slider" v-model="padding" :min="0" :max="48" :step="4" />
        <DemoOptionRow :label="optBadges" type="toggle" v-model="showBadges" />
        <DemoOptionRow :label="optDirection" type="select" v-model="direction" :options="DIRECTION_OPTIONS" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsRampTitle }}</h4>
      <DemoDocsTable :headers="DOCS_RAMP_HEADERS" :rows="DOCS_RAMP_ROWS" />
      <h4 class="docs-subtitle">{{ docsDensityTitle }}</h4>
      <DemoDocsTable :headers="DOCS_DENSITY_HEADERS" :rows="DOCS_DENSITY_ROWS" />
      <h4 class="docs-subtitle">{{ docsRadiusTitle }}</h4>
      <DemoDocsTable :headers="DOCS_RADIUS_HEADERS" :rows="DOCS_RADIUS_ROWS" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="xml" />
    </template>
  </DemoPage>
</template>

<style scoped>
.spacing-stage {
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

/* —— 1. 4px 网格与圆角 —— */
.grid-visual {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.grid-cell {
  display: inline-block;
  background: var(--wui-slider-track-value-fill);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.grid-note {
  margin-left: 4px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.radius-chip {
  padding: 2px 8px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-header-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* —— 2. 间距阶梯 —— */
.ramp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 860px;
}

.ramp-row {
  display: grid;
  grid-template-columns: 64px minmax(96px, 220px) 1fr;
  gap: 12px;
  align-items: center;
  padding: 6px 12px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.ramp-row:nth-child(odd) {
  background: var(--wui-system-control-background-chrome-medium-low);
}

.ramp-value {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-header-foreground-theme);
}

.ramp-bar-track {
  display: flex;
  min-height: 16px;
  align-items: center;
}

.ramp-bar {
  display: inline-block;
  height: 12px;
  background: var(--wui-slider-track-value-fill);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.ramp-usage {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 3. 布局示例 —— */
.layout-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

@media (max-width: 900px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}

.layout-figure {
  margin: 0;
}

.layout-caption {
  margin: 0 0 8px;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.mock-page {
  position: relative;
  padding: 36px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.mock-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* —— 徽标(档位标注)—— */
.badge {
  position: absolute;
  z-index: 1;
  padding: 0 6px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: 10px;
  line-height: 16px;
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.badge-page {
  top: 4px;
  left: 4px;
}

.badge-section {
  top: -8px;
  left: 8px;
}

.badge-card {
  top: -8px;
  right: 8px;
}

.badge-gap {
  position: static;
  align-self: center;
}

.badge-row {
  top: 4px;
  right: 4px;
}

.badge-header-gap {
  position: static;
  align-self: flex-start;
}

.mock-cards {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.mock-card {
  position: relative;
  padding: 16px;
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.mock-card-title {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.mock-card-body {
  margin: 4px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.mock-form-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.mock-rows {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-row {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mock-label {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.mock-input {
  height: 24px;
  background: var(--wui-text-control-background);
  border: 1px solid var(--wui-text-control-border);
  border-bottom-width: 2px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* —— 4. 交互演示 —— */
.spacing-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 480px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.badge-live {
  top: 4px;
  right: 4px;
}

/* 未开启标注时隐藏徽标 */
.spacing-card .badge-live {
  display: none;
}

.spacing-card.show-badges .badge-live {
  display: block;
}

.demo-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-cluster {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}

.spacing-card.show-badges .demo-cluster > * {
  outline: 1px dashed var(--wui-system-control-foreground-chrome-gray);
  outline-offset: 2px;
}

/* —— 5. 密度行距对照 —— */
.density-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

@media (max-width: 900px) {
  .density-grid {
    grid-template-columns: 1fr;
  }
}

.density-col {
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.density-title {
  margin: 0 0 12px;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.density-form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>

