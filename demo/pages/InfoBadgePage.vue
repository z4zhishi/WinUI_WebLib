<script setup lang="ts">
// InfoBadge 示例页:对照官方 WinUI Gallery InfoBadgePage(动态数值 / 样式族矩阵 / 嵌套定位)。
// 结构照抄已通过 QA 的 CheckBoxPage.vue 母版:上半区交互演示与参数面板,下半区固定属性与事件文档。
// 图标素材沿用站内 WuiSymbolIcon(Symbol 枚举名)与 WuiFontIcon(码点),与源样式族的
// FontIconSource(F13F/F13C)与 SymbolIconSource(Accept/Important/Cancel)一一对应。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiInfoBadge from '@/components/InfoBadge.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

/** 徽标配色档位(与组件 severity 对齐)。 */
type BadgeSeverity = 'default' | 'informational' | 'success' | 'warning' | 'critical'

const i18n = useDemoI18n()

// —— 页面文案(i18n 键集未覆盖,局部定义中英文案常量)——
const PAGE_TITLE: BilingualText = { zh: 'InfoBadge', en: 'InfoBadge' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI InfoBadge 控件示例:点状 / 数字 / 图标三形态与四档配色,以及嵌套到按钮、导航项右上角的相对定位用法。',
  en: 'WinUI InfoBadge examples: dot / value / icon forms, four severity colors, and relative placement inside buttons and nav items.',
}
const DYNAMIC_TITLE: BilingualText = { zh: '动态数值(对照官方 Dynamic value 示例)', en: 'Dynamic value (official example)' }
const MATRIX_TITLE: BilingualText = { zh: '四档配色 × 三形态', en: 'Four severities × three forms' }
const EMBEDDED_TITLE: BilingualText = { zh: '嵌套定位:按钮右上角(对照官方 Placing badge 示例)', en: 'Placed inside a button (official example)' }
const NAV_TITLE: BilingualText = { zh: '嵌套定位:导航项(对照官方 NavigationView 示例)', en: 'Placed on a nav item (official example)' }
const LABEL_VALUE: BilingualText = { zh: '数值(Value)', en: 'Value' }
const LABEL_SEVERITY: BilingualText = { zh: '配色(Severity)', en: 'Severity' }
const LABEL_ICON: BilingualText = { zh: '显示图标(iconSource)', en: 'Show icon (iconSource)' }
const LABEL_INBOX_BADGE: BilingualText = { zh: '显示收件箱徽标', en: 'Show Inbox badge' }
const STATE_HINT: BilingualText = { zh: '当前形态', en: 'Current form' }
const KIND_DOT: BilingualText = { zh: '点状(dot)', en: 'Dot' }
const KIND_VALUE: BilingualText = { zh: '数字(value)', en: 'Value' }
const KIND_ICON: BilingualText = { zh: '图标(icon)', en: 'Icon' }
const COL_DOT: BilingualText = { zh: '点状', en: 'Dot' }
const COL_VALUE: BilingualText = { zh: '数字', en: 'Value' }
const COL_ICON: BilingualText = { zh: '图标', en: 'Icon' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }
const INBOX_ROW_LABEL: BilingualText = { zh: '收件箱,5 条通知(与官方示例一致的宿主无障碍标注)', en: 'Inbox, 5 notifications (host labeling as in the official sample)' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const dynamicTitle = useBilingual(i18n, DYNAMIC_TITLE)
const matrixTitle = useBilingual(i18n, MATRIX_TITLE)
const embeddedTitle = useBilingual(i18n, EMBEDDED_TITLE)
const navTitle = useBilingual(i18n, NAV_TITLE)
const labelValue = useBilingual(i18n, LABEL_VALUE)
const labelSeverity = useBilingual(i18n, LABEL_SEVERITY)
const labelIcon = useBilingual(i18n, LABEL_ICON)
const labelInboxBadge = useBilingual(i18n, LABEL_INBOX_BADGE)
const stateHint = useBilingual(i18n, STATE_HINT)
const kindDotText = useBilingual(i18n, KIND_DOT)
const kindValueText = useBilingual(i18n, KIND_VALUE)
const kindIconText = useBilingual(i18n, KIND_ICON)
const colDot = useBilingual(i18n, COL_DOT)
const colValue = useBilingual(i18n, COL_VALUE)
const colIcon = useBilingual(i18n, COL_ICON)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)
const inboxRowLabel = useBilingual(i18n, INBOX_ROW_LABEL)

// —— 源样式族字形对照 ——
// Informational 图标样式 = FontIconSource Glyph F13F;官方示例 3 的徽标字形 = F13C。
const GLYPH_INFO = '\uF13F'
const GLYPH_REFRESH = '\uF13C'

// —— 演示一:动态数值(参数面板实时调节)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoValue = ref<string | number | boolean>(-1)
const demoSeverity = ref<string | number | boolean>('default')
const demoShowIcon = ref<string | number | boolean>(false)

const severityOptions: { label: string; value: string }[] = [
  { label: 'Default(强调色,源默认样式)', value: 'default' },
  { label: 'Informational', value: 'informational' },
  { label: 'Success', value: 'success' },
  { label: 'Warning', value: 'warning' },
  { label: 'Critical', value: 'critical' },
]

const mainSeverity = computed<BadgeSeverity>(() => {
  const value = String(demoSeverity.value)
  return severityOptions.some((option) => option.value === value)
    ? (value as BadgeSeverity)
    : 'default'
})

// 滑块返回数字;截断为整数以贴合 WinUI Int32 Value。
const mainValue = computed(() => {
  const parsed = Number(demoValue.value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : -1
})

// 打开「显示图标」后注入 F13F 字形(源 Informational 图标样式的 FontIconSource);
// value >= 0 时组件内部数字优先,与源 OnDisplayKindPropertiesChanged 的判定顺序一致。
const mainIconSource = computed(() => (demoShowIcon.value === true ? GLYPH_INFO : undefined))

const mainKindText = computed(() =>
  mainValue.value >= 0
    ? kindValueText.value
    : mainIconSource.value !== undefined
      ? kindIconText.value
      : kindDotText.value,
)

// —— 演示二:四档 × 三形态矩阵(源 Success/Caution/Critical 用 SymbolIconSource,
//     Informational 用 FontIconSource,此处逐档对应)——
interface MatrixRow {
  severity: Exclude<BadgeSeverity, 'default'>
  /** FontIcon 态字形(源 Informational 图标样式)。 */
  glyph?: string
  /** 槽位图标对应的 Symbol 枚举名(源 Success/Caution/Critical 图标样式)。 */
  symbol?: 'Accept' | 'Important' | 'Cancel'
}

const MATRIX_ROWS: MatrixRow[] = [
  { severity: 'informational', glyph: GLYPH_INFO },
  { severity: 'success', symbol: 'Accept' },
  { severity: 'warning', symbol: 'Important' },
  { severity: 'critical', symbol: 'Cancel' },
]

// —— 演示三:嵌套到按钮右上角(对照官方示例:按钮内容居中 Sync 图标 + 徽标绝对定位右上角)——
const refreshClickCount = ref(0)

function onRefreshClick(): void {
  refreshClickCount.value += 1
}

// —— 演示四:嵌套到导航项(对照官方示例:Inbox 项徽标 Value=5,可切换显隐)——
const showInboxBadge = ref<string | number | boolean>(true)

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['value', 'number', '-1', '徽标数值;>= 0 显示数字,-1 显示点状(形态判定优先于图标)'],
  ['iconSource', 'string', '—', '字体图标字形(Segoe Fluent Icons 码点,如 \\uF13F),对应源 FontIconSource → FontIcon 态'],
  ['severity', "'default' | 'informational' | 'success' | 'warning' | 'critical'", "'default'", '配色档位;四档与 InfoBar 对齐,default 为源默认强调色底'],
  ['background', 'string', '—', '底色覆盖(优先于 severity,对应源 Control.Background)'],
  ['foreground', 'string', '—', '前景覆盖(数字 / 字形颜色)'],
  ['padding', 'number | string', '0', '内边距;源部分图标样式族为 0,4,0,2'],
  ['cornerRadius', 'number | string', '胶囊(半高)', '圆角覆盖;源按 ActualHeight/2 动态计算'],
  ['默认插槽', 'slot', '—', '自定义图标内容(Icon 态,对应源通用 IconSource);与 iconSource 二选一,value 优先'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['—', '—', 'InfoBadge 为非交互控件(WinUI IsTabStop=false),无事件;交互语义由宿主(按钮 / 导航项)承载'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(() => {
  if (mainValue.value >= 0) {
    return `<WuiInfoBadge\n  severity="${mainSeverity.value}"\n  :value="${mainValue.value}"\n/>`
  }
  if (mainIconSource.value !== undefined) {
    return `<WuiInfoBadge\n  severity="${mainSeverity.value}"\n  icon-source="\\uF13F"\n/>`
  }
  return `<!-- 无 value、iconSource 与默认插槽 → 点状(dot)徽标 -->\n<WuiInfoBadge severity="${mainSeverity.value}" />`
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="InfoBadge">
    <template #demo>
      <div class="infobadge-stage">
        <!-- 演示一:动态数值 -->
        <section class="demo-group">
          <h3 class="group-title">{{ dynamicTitle }}</h3>
          <div class="hero-stage">
            <WuiInfoBadge :severity="mainSeverity" :value="mainValue" :icon-source="mainIconSource" />
          </div>
          <p class="demo-output">{{ stateHint }}: {{ mainKindText }}</p>
        </section>

        <!-- 演示二:四档 × 三形态矩阵 -->
        <section class="demo-group">
          <h3 class="group-title">{{ matrixTitle }}</h3>
          <div class="matrix" role="group" :aria-label="matrixTitle">
            <span class="matrix-head" aria-hidden="true"></span>
            <span class="matrix-head">{{ colDot }}</span>
            <span class="matrix-head">{{ colValue }}</span>
            <span class="matrix-head">{{ colIcon }}</span>
            <template v-for="row in MATRIX_ROWS" :key="row.severity">
              <span class="matrix-severity">{{ row.severity }}</span>
              <span class="matrix-cell"><WuiInfoBadge :severity="row.severity" /></span>
              <span class="matrix-cell"><WuiInfoBadge :severity="row.severity" :value="8" /></span>
              <span class="matrix-cell">
                <WuiInfoBadge v-if="row.glyph" :severity="row.severity" :icon-source="row.glyph" />
                <WuiInfoBadge v-else-if="row.symbol" :severity="row.severity">
                  <WuiSymbolIcon :symbol="row.symbol" :font-size="9" />
                </WuiInfoBadge>
              </span>
            </template>
          </div>
        </section>

        <!-- 演示三:嵌套到按钮右上角(对照官方 PlacingInfobadgeInsideAnother 示例) -->
        <section class="demo-group">
          <h3 class="group-title">{{ embeddedTitle }}</h3>
          <WuiButton
            class="refresh-button"
            aria-label="刷新"
            @click="onRefreshClick"
          >
            <span class="refresh-inner">
              <WuiSymbolIcon symbol="Sync" :font-size="20" />
              <WuiInfoBadge class="corner-badge" severity="critical" :icon-source="GLYPH_REFRESH" />
            </span>
          </WuiButton>
          <p class="demo-output">click × {{ refreshClickCount }}</p>
        </section>

        <!-- 演示四:嵌套到导航项(对照官方 InfobadgeEmbeddedNavigationview 示例) -->
        <section class="demo-group">
          <h3 class="group-title">{{ navTitle }}</h3>
          <nav class="nav-list" :aria-label="navTitle">
            <div class="nav-item">
              <WuiSymbolIcon symbol="Home" :font-size="16" />
              <span class="nav-item-text">Home</span>
            </div>
            <div class="nav-item" :aria-label="inboxRowLabel">
              <WuiSymbolIcon symbol="Mail" :font-size="16" />
              <span class="nav-item-text">Inbox</span>
              <WuiInfoBadge v-if="showInboxBadge === true" class="nav-badge" :value="5" />
            </div>
          </nav>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelValue" type="slider" v-model="demoValue" :min="-1" :max="99" :step="1" />
        <DemoOptionRow :label="labelSeverity" type="select" v-model="demoSeverity" :options="severityOptions" />
        <DemoOptionRow :label="labelIcon" type="toggle" v-model="demoShowIcon" />
        <DemoOptionRow :label="labelInboxBadge" type="toggle" v-model="showInboxBadge" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.infobadge-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
}

.demo-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.group-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* 对照官方示例的 Output TextBlock:轻量回显 */
.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 演示一:中性底座上原生尺寸呈现,避免视觉误导(底色取 DemoPage 同款中性面 token) */
.hero-stage {
  display: flex;
  min-width: 120px;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  background: var(--wui-application-page-background-theme);
}

/* 演示二:档位 × 形态矩阵 */
.matrix {
  display: grid;
  grid-template-columns: 120px 72px 72px 72px;
  align-items: center;
  gap: 12px 8px;
}

.matrix-head {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.matrix-severity {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.matrix-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 演示三:按钮内容层相对定位,徽标绝对定位于右上角(嵌套定位的标准写法) */
.refresh-button {
  width: 200px;
  height: 56px;
  padding: 0;
}

.refresh-inner {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
}

.corner-badge {
  position: absolute;
  top: 6px;
  right: 6px;
}

/* 演示四:仿 NavigationViewItem 行;徽标挂在行右上角 */
.nav-list {
  display: flex;
  width: 260px;
  flex-direction: column;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  background: var(--wui-application-page-background-theme);
}

.nav-item {
  position: relative;
  display: flex;
  height: 36px;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  color: var(--wui-application-foreground-theme);
}

.nav-item-text {
  font-size: var(--wui-control-content-theme-font-size);
}

.nav-badge {
  position: absolute;
  top: 4px;
  right: 10px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
