<script setup lang="ts">
// CalendarViewPage.vue —— CalendarView 控件示例页(示例组合对照 WinUI Gallery 的 CalendarViewPage.xaml:
// SelectionMode / IsGroupLabelVisible / IsOutOfScopeEnabled / Language 选项联动;另按任务补充
// blackout 周末禁选、min/max 边界与三视图下钻演示)。
import { computed, ref } from 'vue'
import WuiCalendarView from '@/components/CalendarView.vue'
import type { CalendarViewDisplayMode } from '@/components/CalendarView.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'CalendarView(日历视图)', en: 'CalendarView' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'CalendarView 以大视图展示并选择日期:头部按钮下钻月 → 年 → 十年视图,点击单元回退;支持单选/多选、禁选日期(blackout)、min/max 边界、每周第一天、今日高亮与区域化显示(星期/月份随 Language 用 Intl 格式化)。DatePicker 则是紧凑的下拉式选择。',
  en: 'CalendarView shows a larger view for picking dates: the header drills down Month → Year → Decade, clicking a unit goes back up. It supports single/multiple selection, blackout dates, min/max bounds, first day of week, today highlighting and locale-aware formatting (weekdays/months via Intl, driven by Language). DatePicker is the compact dropdown counterpart.',
}
const BASIC_CAPTION: BilingualText = { zh: '基础用法(选项面板实时调节)', en: 'Basic (tuned by the options panel)' }
const SELECTED_LABEL: BilingualText = { zh: '当前 selectedDates', en: 'selectedDates' }
const SELECTED_EMPTY: BilingualText = { zh: '(空)', en: '(empty)' }
const BLACKOUT_CAPTION: BilingualText = {
  zh: '周末禁选(BlackoutDates,多选模式;试试点周六/周日)',
  en: 'Weekends blacked out (BlackoutDates, Multiple; try Sat/Sun)',
}
const BLACKOUT_NOTE: BilingualText = {
  zh: '禁选日期保留可聚焦但拒绝选择(WinUI blackout 语义):文字变灰并显示中横线;min/max 之外的日期同规格处理。',
  en: 'Blacked-out dates stay focusable but reject selection (WinUI blackout semantics): dimmed text with a strikethrough line; dates outside min/max get the same treatment.',
}
const RANGE_CAPTION: BilingualText = { zh: 'min/max 边界(今天 -15 ~ +45 天)', en: 'min/max bounds (today -15 to +45 days)' }
const RANGE_NOTE: BilingualText = {
  zh: '翻页箭头到达边界后自动禁用(源 HasMoreContentBefore/After);年视图中整月越界的月份、十年视图中越界的年份按禁选样式渲染。',
  en: 'The prev/next arrows disable at the bounds (source HasMoreContentBefore/After); out-of-range months in Year view and years in Decade view render as blacked out.',
}
const KEYBOARD_NOTE: BilingualText = {
  zh: '键盘:方向键移动焦点日期(±1 天 / ±7 天),Home/End 跳月首/月末,PageUp/PageDown 翻月,Enter/Space 选择;头部与翻页按钮可 Tab 聚焦。',
  en: 'Keyboard: arrow keys move the focused date (±1 day / ±7 days), Home/End jump to month start/end, PageUp/PageDown change month, Enter/Space selects; header and prev/next buttons are tab stops.',
}
const MODE_DRILL_NOTE: BilingualText = {
  zh: '视图下钻:点击头部「2026年9月」→ 年视图,再点头部 → 十年视图;十年视图点年份、年视图点月份逐级回退(Decade 层头部按钮禁用,源 HasMoreViews)。',
  en: 'Drill-down: click the header "September 2026" → Year view, click again → Decade view; pick a year / a month to climb back up (the header button is disabled in Decade, source HasMoreViews).',
}
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const basicCaption = useBilingual(i18n, BASIC_CAPTION)
const selectedLabel = useBilingual(i18n, SELECTED_LABEL)
const selectedEmpty = useBilingual(i18n, SELECTED_EMPTY)
const blackoutCaption = useBilingual(i18n, BLACKOUT_CAPTION)
const blackoutNote = useBilingual(i18n, BLACKOUT_NOTE)
const rangeCaption = useBilingual(i18n, RANGE_CAPTION)
const rangeNote = useBilingual(i18n, RANGE_NOTE)
const keyboardNote = useBilingual(i18n, KEYBOARD_NOTE)
const modeDrillNote = useBilingual(i18n, MODE_DRILL_NOTE)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 日期显示辅助(ISO yyyy-mm-dd,本地时区)——
function formatIso(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

const today = new Date()

// —— 示例一:选项面板(联合类型匹配 DemoOptionRow 的 v-model 契约)——
const basicSelected = ref<Date[]>([new Date(today.getFullYear(), today.getMonth(), today.getDate())])
const basicMode = ref<string | number | boolean>('Month')
const selectionMode = ref<string | number | boolean>('Single')
const groupLabel = ref<string | number | boolean>(true)
const outOfScope = ref<string | number | boolean>(true)
const todayHighlighted = ref<string | number | boolean>(true)
const firstDay = ref<string | number | boolean>('0')
const language = ref<string | number | boolean>('')

const basicModeValue = computed<CalendarViewDisplayMode>(() => {
  const raw = String(basicMode.value)
  return raw === 'Year' || raw === 'Decade' ? raw : 'Month'
})
const selectionModeValue = computed(() => {
  const raw = String(selectionMode.value)
  return raw === 'None' || raw === 'Multiple' ? raw : 'Single'
})
const groupLabelValue = computed(() => groupLabel.value === true)
const outOfScopeValue = computed(() => outOfScope.value !== false)
const todayHighlightedValue = computed(() => todayHighlighted.value !== false)
const firstDayValue = computed(() => {
  const parsed = Number(firstDay.value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 0
})
const languageValue = computed(() => String(language.value))

function onBasicModeChanged(mode: CalendarViewDisplayMode): void {
  basicMode.value = mode
}

const basicSelectedText = computed(() => {
  const list = basicSelected.value ?? []
  return list.length === 0 ? selectedEmpty.value : list.map(formatIso).join(' , ')
})

// —— 示例二:周末禁选(今天 ±4 年范围内的周六/周日),多选模式 ——
function buildWeekendBlackouts(yearsBack: number, yearsForward: number): Date[] {
  const result: Date[] = []
  const now = new Date()
  const start = new Date(now.getFullYear() - yearsBack, 0, 1)
  const end = new Date(now.getFullYear() + yearsForward, 11, 31)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay()
    if (day === 0 || day === 6) result.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
  }
  return result
}

const weekendBlackouts = buildWeekendBlackouts(4, 4)
const multiSelected = ref<Date[]>([])

const multiSelectedText = computed(() => {
  const list = multiSelected.value ?? []
  return list.length === 0 ? selectedEmpty.value : list.map(formatIso).join(' , ')
})

// —— 示例三:min/max 边界 ——
const rangeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15)
const rangeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 45)
const rangeSelected = ref<Date[]>([new Date(today.getFullYear(), today.getMonth(), today.getDate())])

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['displayMode', "'Month' | 'Year' | 'Decade'", "'Month'", '当前显示模式;支持 v-model:displayMode(下拉实时调节)'],
  ['selectedDates', 'Date[]', '[]', '选中日期集合;支持 v-model:selectedDates;Single 模式整表替换,Multiple 切换成员(示例一/二实时显示)'],
  ['selectionMode', "'None' | 'Single' | 'Multiple'", "'Single'", '选择模式(下拉实时调节)'],
  ['blackoutDates', 'Date[]', '[]', '禁选日期集合(示例二周末禁选);min/max 之外同规格禁选'],
  ['minDate', 'Date | string | number', 'undefined', '最小可选日期,无界默认(示例三)'],
  ['maxDate', 'Date | string | number', 'undefined', '最大可选日期,无界默认(示例三)'],
  ['firstDayOfWeek', 'number', '0', '每周第一天,0 = 周日(下拉实时调节)'],
  ['isTodayHighlighted', 'boolean', 'true', '今日高亮:强调色圆底(开关实时调节)'],
  ['isGroupLabelVisible', 'boolean', 'false', '月视图 1 日单元格显示月份组标签,1 月 1 日显示年份(开关实时调节)'],
  ['isOutOfScopeEnabled', 'boolean', 'true', '邻月日期灰态渲染;false 时按当月样式(开关实时调节)'],
  ['language', 'string', "''", 'BCP-47 区域标签(WinUI Language),空串用运行时区域(下拉实时调节)'],
  ['disabled', 'boolean', 'false', '禁用整控件(星期行变灰、交互关闭)'],
  ['calendarItemBorderBrush 等', 'string', 'token 默认', '视觉画刷覆盖:calendarItemBorderBrush / calendarItemBackground / todayForeground / todayBackground / selectedBorderBrush / selectedForeground / hoverBorderBrush / pressedBorderBrush / blackoutForeground / outOfScopeForeground / outOfScopeBackground'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['selectedDatesChanged', "(event: { addedDates: Date[]; removedDates: Date[] }) => void", '选中集合变化时触发:点击可选日期(Single 替换 / Multiple 切换);与 WinUI SelectedDatesChanged 对齐'],
  ['displayModeChanged', "(mode: 'Month' | 'Year' | 'Decade') => void", '显示模式变化时触发:头部按钮下钻、年/十年视图单元回退、v-model 外部改写'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiCalendarView
  v-model:display-mode="${basicModeValue.value}"
  v-model:selected-dates="selectedDates"
  selection-mode="${selectionModeValue.value}"
  :first-day-of-week="${firstDayValue.value}"
  :is-today-highlighted="${todayHighlightedValue.value}"
  :is-group-label-visible="${groupLabelValue.value}"
  :is-out-of-scope-enabled="${outOfScopeValue.value}"
  language="${languageValue.value}"
  @selected-dates-changed="onSelectedDatesChanged"
  @display-mode-changed="onDisplayModeChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="CalendarView">
    <template #demo>
      <div class="calendar-stage">
        <!-- 示例一:基础用法(选项面板实时调节;头部下钻 / 单元回退见说明) -->
        <div class="stage-item">
          <p class="stage-caption">{{ basicCaption }}</p>
          <WuiCalendarView
            v-model:selected-dates="basicSelected"
            :display-mode="basicModeValue"
            :selection-mode="selectionModeValue"
            :first-day-of-week="firstDayValue"
            :is-today-highlighted="todayHighlightedValue"
            :is-group-label-visible="groupLabelValue"
            :is-out-of-scope-enabled="outOfScopeValue"
            :language="languageValue"
            @display-mode-changed="onBasicModeChanged"
          />
          <p class="live-value">{{ selectedLabel }}:{{ basicSelectedText }}</p>
          <p class="hint">{{ modeDrillNote }}</p>
        </div>

        <!-- 示例二:周末禁选 + 多选 -->
        <div class="stage-item">
          <p class="stage-caption">{{ blackoutCaption }}</p>
          <WuiCalendarView
            v-model:selected-dates="multiSelected"
            selection-mode="Multiple"
            :blackout-dates="weekendBlackouts"
          />
          <p class="live-value">{{ selectedLabel }}:{{ multiSelectedText }}</p>
          <p class="hint">{{ blackoutNote }}</p>
        </div>

        <!-- 示例三:min/max 边界(翻页到边界禁用) -->
        <div class="stage-item">
          <p class="stage-caption">{{ rangeCaption }}</p>
          <WuiCalendarView
            v-model:selected-dates="rangeSelected"
            :min-date="rangeMin"
            :max-date="rangeMax"
          />
          <p class="hint">{{ rangeNote }}</p>
        </div>

        <p class="hint">{{ keyboardNote }}</p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          label="SelectionMode"
          type="select"
          v-model="selectionMode"
          :options="[
            { label: 'Single', value: 'Single' },
            { label: 'Multiple', value: 'Multiple' },
            { label: 'None', value: 'None' },
          ]"
        />
        <DemoOptionRow
          label="DisplayMode"
          type="select"
          v-model="basicMode"
          :options="[
            { label: 'Month', value: 'Month' },
            { label: 'Year', value: 'Year' },
            { label: 'Decade', value: 'Decade' },
          ]"
        />
        <DemoOptionRow
          label="FirstDayOfWeek"
          type="select"
          v-model="firstDay"
          :options="[
            { label: 'Sunday (0)', value: '0' },
            { label: 'Monday (1)', value: '1' },
            { label: 'Tuesday (2)', value: '2' },
            { label: 'Wednesday (3)', value: '3' },
            { label: 'Thursday (4)', value: '4' },
            { label: 'Friday (5)', value: '5' },
            { label: 'Saturday (6)', value: '6' },
          ]"
        />
        <DemoOptionRow
          label="Language"
          type="select"
          v-model="language"
          :options="[
            { label: 'System default', value: '' },
            { label: 'en-US', value: 'en-US' },
            { label: 'zh-CN', value: 'zh-CN' },
            { label: 'ja-JP', value: 'ja-JP' },
            { label: 'de-DE', value: 'de-DE' },
          ]"
        />
        <DemoOptionRow label="IsTodayHighlighted" type="toggle" v-model="todayHighlighted" />
        <DemoOptionRow label="IsGroupLabelVisible" type="toggle" v-model="groupLabel" />
        <DemoOptionRow label="IsOutOfScopeEnabled" type="toggle" v-model="outOfScope" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.calendar-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 24px;
  width: 100%;
  max-width: 420px;
}

.stage-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-caption {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-description-text-foreground);
}

.live-value {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  word-break: break-all;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
