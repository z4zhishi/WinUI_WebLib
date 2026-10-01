<script setup lang="ts">
// DatePicker 示例页:对照官方 WinUI Gallery DatePickerPage
// (SimpleDatepickerHeader / DatepickerDayFormattedYear 两例 + 代码后台的 MinYear/MaxYear 约束),
// 扩展空值态演示。上半区交互演示 + 参数面板(Header/列可见性/格式/禁用实时调节),
// 下半区为属性、事件、交互与用法代码(结构照抄已通过 QA 的 ComboBoxPage 母版)。
import { computed, ref } from 'vue'
import WuiDatePicker from '@/components/DatePicker.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'DatePicker', en: 'DatePicker' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI DatePicker 控件示例:常驻 inline 的月/日/年三列滚轮选择器(非日历弹层),支持列显隐、年区间约束、显示格式模板与空值占位态。上半区参数实时调节,下半区为控件文档。',
  en: 'WinUI DatePicker examples: inline month/day/year looping columns with column visibility, year range, format templates and an empty placeholder state. Options above, docs below.',
}
const GROUP_BASIC: BilingualText = { zh: '基础选择(参数面板实时调节,占位日期 = 今天)', en: 'Basic selection (live options, placeholder = today)' }
const GROUP_RANGE: BilingualText = { zh: '年区间约束(MinYear = 今年,MaxYear = +5 年)', en: 'Year range (MinYear = this year, MaxYear = +5 years)' }
const GROUP_NO_YEAR: BilingualText = { zh: '隐藏年列(YearVisible = False)', en: 'Year column hidden (YearVisible = False)' }
const GROUP_FORMAT: BilingualText = { zh: '显示格式(DayFormat 含星期缩写,月列数值)', en: 'Formats (DayFormat with weekday, numeric month)' }
const GROUP_EMPTY: BilingualText = { zh: '空值态(Date = null,三列显示占位前景色)', en: 'Empty state (Date = null, placeholder foreground)' }
const GROUP_INTERACT: BilingualText = { zh: '滚轮交互', en: 'Wheel interaction' }
const NOTE_OFFICIAL_SPLIT: BilingualText = {
  zh: '说明:官方示例 2 为「DayFormat 带星期缩写 + YearVisible=False」的组合,本页拆为演示三(隐藏年列)与演示四(星期格式)分别演示。',
  en: 'Note: official example 2 combines weekday DayFormat with YearVisible=False; this page splits it into demos 3 (hidden year) and 4 (weekday format).',
}
const LABEL_HEADER: BilingualText = { zh: '标头(Header)', en: 'Header' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(Disabled)', en: 'Disabled' }
const LABEL_YEAR_VISIBLE: BilingualText = { zh: '年列(YearVisible)', en: 'YearVisible' }
const LABEL_DAY_VISIBLE: BilingualText = { zh: '日列(DayVisible)', en: 'DayVisible' }
const LABEL_MONTH_FORMAT: BilingualText = { zh: '月格式(MonthFormat)', en: 'MonthFormat' }
const LABEL_DAY_FORMAT: BilingualText = { zh: '日格式(DayFormat)', en: 'DayFormat' }
const LABEL_YEAR_FORMAT: BilingualText = { zh: '年格式(YearFormat)', en: 'YearFormat' }
const LABEL_SELECTED: BilingualText = { zh: '当前选中', en: 'Selected' }
const LABEL_CHANGED: BilingualText = { zh: 'dateChanged 次数', en: 'dateChanged count' }
const BTN_CLEAR: BilingualText = { zh: '清空(Date = null)', en: 'Clear (Date = null)' }
const BTN_TODAY: BilingualText = { zh: '设为今天', en: 'Set to today' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_INTERACT_TITLE: BilingualText = { zh: '滚轮交互', en: 'Interaction' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupBasic = useBilingual(i18n, GROUP_BASIC)
const groupRange = useBilingual(i18n, GROUP_RANGE)
const groupNoYear = useBilingual(i18n, GROUP_NO_YEAR)
const groupFormat = useBilingual(i18n, GROUP_FORMAT)
const groupEmpty = useBilingual(i18n, GROUP_EMPTY)
const groupInteract = useBilingual(i18n, GROUP_INTERACT)
const noteOfficialSplit = useBilingual(i18n, NOTE_OFFICIAL_SPLIT)
const labelHeader = useBilingual(i18n, LABEL_HEADER)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelYearVisible = useBilingual(i18n, LABEL_YEAR_VISIBLE)
const labelDayVisible = useBilingual(i18n, LABEL_DAY_VISIBLE)
const labelMonthFormat = useBilingual(i18n, LABEL_MONTH_FORMAT)
const labelDayFormat = useBilingual(i18n, LABEL_DAY_FORMAT)
const labelYearFormat = useBilingual(i18n, LABEL_YEAR_FORMAT)
const labelSelected = useBilingual(i18n, LABEL_SELECTED)
const labelChanged = useBilingual(i18n, LABEL_CHANGED)
const btnClear = useBilingual(i18n, BTN_CLEAR)
const btnToday = useBilingual(i18n, BTN_TODAY)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsInteractTitle = useBilingual(i18n, DOCS_INTERACT_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 工具 ——
function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function formatDate(value: Date | null): string {
  if (value === null) return '—'
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
}

/** 官方示例的默认值:当前日期 + 2 个月(WinUIGallery DatePickerPage.OnNavigatedTo)。 */
function twoMonthsFromNow(): Date {
  const value = new Date()
  value.setMonth(value.getMonth() + 2)
  return value
}

const thisYear = new Date().getFullYear()

// —— 参数面板(作用于演示一)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoHeader = ref<string | number | boolean>('Pick a date')
const demoDisabled = ref<string | number | boolean>(false)
const demoYearVisible = ref<string | number | boolean>(true)
const demoDayVisible = ref<string | number | boolean>(true)
const demoMonthFormat = ref<string | number | boolean>('{month.full}')
const demoDayFormat = ref<string | number | boolean>('{day.integer}')
const demoYearFormat = ref<string | number | boolean>('{year.full}')

const headerValue = computed(() => String(demoHeader.value))
const disabledValue = computed(() => demoDisabled.value === true)
const yearVisibleValue = computed(() => demoYearVisible.value !== false)
const dayVisibleValue = computed(() => demoDayVisible.value !== false)
const monthFormatValue = computed(() => String(demoMonthFormat.value))
const dayFormatValue = computed(() => String(demoDayFormat.value))
const yearFormatValue = computed(() => String(demoYearFormat.value))

// 格式模板选项(WinUI 日期格式模板子集,组件支持的键见 wiki 属性表)
const monthFormatChoices = [
  { label: '{month.full} — January', value: '{month.full}' },
  { label: '{month.abbreviated} — Jan', value: '{month.abbreviated}' },
  { label: '{month.numeric} — 1', value: '{month.numeric}' },
  { label: '{month.integer(2)} — 01', value: '{month.integer(2)}' },
]
const dayFormatChoices = [
  { label: '{day.integer} — 7', value: '{day.integer}' },
  { label: '{day.integer(2)} — 07', value: '{day.integer(2)}' },
  {
    label: '{day.integer} ({dayofweek.abbreviated})',
    value: '{day.integer} ({dayofweek.abbreviated})',
  },
]
const yearFormatChoices = [
  { label: '{year.full} — 2026', value: '{year.full}' },
  { label: '{year.abbreviated} — 26', value: '{year.abbreviated}' },
]

// —— 演示一:基础选择(占位日期 = 今天;date 为 null 时三列显示占位前景色)——
const basicDate = ref<Date | null>(null)
const basicChangedCount = ref(0)
const basicEcho = computed(() => (basicDate.value === null ? '—' : formatDate(basicDate.value)))

function onBasicDateChanged(): void {
  basicChangedCount.value += 1
}

// —— 演示二:年区间约束(对照官方代码后台:MinYear = 今年,MaxYear = +5 年)——
const constrainedDate = ref<Date | null>(twoMonthsFromNow())

// —— 演示三:隐藏年列(对照官方 DatepickerDayFormattedYear:DayFormat + YearVisible=False)——
const noYearDate = ref<Date | null>(twoMonthsFromNow())

// —— 演示四:显示格式(日列带星期缩写、月列数值、年列两位)——
const formattedDate = ref<Date | null>(new Date())

// —— 演示五:空值态(初始 null;点击任一列即提交真实日期)——
const emptyDate = ref<Date | null>(null)

function clearEmptyDate(): void {
  emptyDate.value = null
}

function setEmptyDateToToday(): void {
  emptyDate.value = new Date()
}

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['date (v-model)', 'Date | null', 'null', '选中日期(WinUI Date);null 为未选择,三列显示占位日期与占位前景色'],
  ['header', 'string', "''", '选择器上方标头文本(WinUI Header)'],
  ['yearVisible', 'boolean', 'true', '是否显示年列(WinUI YearVisible)'],
  ['dayVisible', 'boolean', 'true', '是否显示日列(WinUI DayVisible)'],
  ['monthVisible', 'boolean', 'true', '是否显示月列(WinUI MonthVisible)'],
  ['minYear', 'number', '1900', '年列最小年份(WinUI MinYear,按年粒度约束)'],
  ['maxYear', 'number', '2128', '年列最大年份(WinUI MaxYear)'],
  ['monthFormat', 'string', "'{month.full}'", '月列格式(WinUI MonthFormat):{month.full|abbreviated|numeric|integer|integer(2)}'],
  ['dayFormat', 'string', "'{day.integer}'", '日列格式(WinUI DayFormat):{day.integer|integer(2)},可组合 {dayofweek.abbreviated|full}'],
  ['yearFormat', 'string', "'{year.full}'", '年列格式(WinUI YearFormat):{year.full|abbreviated}'],
  ['placeholderDate', 'Date', 'new Date()', '空值态(date 为 null)时三列显示的占位日期,年份收敛进 min/max 区间'],
  ['disabled', 'boolean', 'false', '禁用态,样式对照模板 Disabled 视觉状态'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['dateChanged', '(newDate: Date | null, oldDate: Date | null)', '选中日期变化时(滚轮/箭头/拖拽/点击列项/程序化赋值均触发;越界赋值先收敛为钳制值再触发一次)'],
  ['update:date', '(value: Date | null)', 'v-model:date 双向绑定更新时'],
]
const interactHeaders = ['操作', '作用']
const interactRows: (string | number)[][] = [
  ['鼠标滚轮(列上)', '按 40px 一档逐项步进,累积平滑'],
  ['点击上/下箭头', '该列步进一项(对照 LoopingSelector 展开钮)'],
  ['按住上下拖拽', '列条目跟手滚动,松手吸附最近项(触摸同等)'],
  ['点击列项', '直接选中该项'],
  ['↑ / ↓', '聚焦列步进一项'],
  ['PageUp / PageDown', '聚焦列步进 5 项'],
  ['Home / End', '聚焦列跳到首 / 末项'],
  ['Tab', '在月/日/年三列间移动焦点'],
]

const usageCode = computed(
  () => `<WuiDatePicker
  v-model:date="date"
  header="${headerValue.value}"
  :year-visible="${yearVisibleValue.value}"
  :day-visible="${dayVisibleValue.value}"
  month-format="${monthFormatValue.value}"
  day-format="${dayFormatValue.value}"
  year-format="${yearFormatValue.value}"
  :min-year="${thisYear}"
  :max-year="${thisYear + 5}"
  :disabled="${disabledValue.value}"
  @date-changed="onDateChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="DatePicker">
    <template #demo>
      <div class="datepicker-stage">
        <!-- 演示一:基础选择(参数面板实时调节 Header/列显隐/格式/禁用) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupBasic }}</h3>
          <div class="demo-row">
            <WuiDatePicker
              v-model:date="basicDate"
              :header="headerValue"
              :year-visible="yearVisibleValue"
              :day-visible="dayVisibleValue"
              :month-format="monthFormatValue"
              :day-format="dayFormatValue"
              :year-format="yearFormatValue"
              :disabled="disabledValue"
              @date-changed="onBasicDateChanged"
            />
          </div>
          <p class="demo-output">
            {{ labelSelected }}: {{ basicEcho }} · {{ labelChanged }}: {{ basicChangedCount }}
          </p>
        </section>

        <!-- 演示二:年区间约束(MinYear = 今年,MaxYear = +5 年,默认值 = 今天 + 2 个月) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupRange }}</h3>
          <div class="demo-row">
            <WuiDatePicker
              v-model:date="constrainedDate"
              header="Pick a date"
              :min-year="thisYear"
              :max-year="thisYear + 5"
            />
          </div>
          <p class="demo-output">{{ labelSelected }}: {{ formatDate(constrainedDate) }}(年列仅 {{ thisYear }}–{{ thisYear + 5 }})</p>
        </section>

        <!-- 演示三:隐藏年列(官方示例 2:DayFormat 带星期 + YearVisible=False) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupNoYear }}</h3>
          <div class="demo-row">
            <WuiDatePicker v-model:date="noYearDate" day-format="{day.integer}" :year-visible="false" />
          </div>
          <p class="demo-output">{{ labelSelected }}: {{ formatDate(noYearDate) }}</p>
          <p class="demo-output">{{ noteOfficialSplit }}</p>
        </section>

        <!-- 演示四:显示格式(日列星期缩写、月列数值、年列两位) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupFormat }}</h3>
          <div class="demo-row">
            <WuiDatePicker
              v-model:date="formattedDate"
              month-format="{month.numeric}"
              day-format="{day.integer} ({dayofweek.abbreviated})"
              year-format="{year.abbreviated}"
            />
          </div>
          <p class="demo-output">
            DayFormat="{day.integer} ({dayofweek.abbreviated})" · MonthFormat="{month.numeric}" ·
            YearFormat="{year.abbreviated}"
          </p>
        </section>

        <!-- 演示五:空值态(Date = null → 占位前景色;操作任一列即提交真实日期) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupEmpty }}</h3>
          <div class="demo-row">
            <WuiDatePicker v-model:date="emptyDate" header="Pick a date" />
            <button type="button" class="demo-button" @click="clearEmptyDate">{{ btnClear }}</button>
            <button type="button" class="demo-button" @click="setEmptyDateToToday">{{ btnToday }}</button>
          </div>
          <p class="demo-output">{{ labelSelected }}: {{ formatDate(emptyDate) }}</p>
        </section>

        <!-- 滚轮交互说明 -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupInteract }}</h3>
          <ul class="interact-list">
            <li>滚轮 / 上下箭头 / 拖拽 / 点击列项 {{ i18n.locale.value.startsWith('zh') ? '任选其一改变日期' : 'change the date' }}</li>
            <li>{{ i18n.locale.value.startsWith('zh') ? '聚焦列后用 ↑/↓、PageUp/PageDown、Home/End 键盘步进' : 'Focus a column, then ↑/↓, PageUp/PageDown, Home/End' }}</li>
            <li>{{ i18n.locale.value.startsWith('zh') ? '改月/年时日自动收敛(如 1/31 → 2/28,闰年按 2/29)' : 'Day clamps on month/year change (1/31 → 2/28, leap 2/29)' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelHeader" type="text" v-model="demoHeader" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelYearVisible" type="toggle" v-model="demoYearVisible" />
        <DemoOptionRow :label="labelDayVisible" type="toggle" v-model="demoDayVisible" />
        <DemoOptionRow :label="labelMonthFormat" type="select" v-model="demoMonthFormat" :options="monthFormatChoices" />
        <DemoOptionRow :label="labelDayFormat" type="select" v-model="demoDayFormat" :options="dayFormatChoices" />
        <DemoOptionRow :label="labelYearFormat" type="select" v-model="demoYearFormat" :options="yearFormatChoices" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsInteractTitle }}</h3>
      <DemoDocsTable :headers="interactHeaders" :rows="interactRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.datepicker-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.demo-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.group-title {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-button {
  padding: 5px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  font-family: inherit;
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.demo-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.demo-button:active {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.demo-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.interact-list {
  margin: 0;
  padding-left: 20px;
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
