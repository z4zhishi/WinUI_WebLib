<script setup lang="ts">
// CalendarDatePicker 示例页:对照官方 WinUI Gallery CalendarDatePickerPage
// (Header="Calendar" + PlaceholderText="Pick a date" 基础例),扩展 min/max 约束、
// firstDayOfWeek 切换、dateFormat 显示格式与空值回填。上半区交互演示 + 参数面板实时调节,
// 下半区为属性、事件、键盘交互与用法代码(结构照抄已通过 QA 的 ComboBoxPage 母版)。
import { computed, ref, watch } from 'vue'
import WuiCalendarDatePicker from '@/components/CalendarDatePicker.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'CalendarDatePicker', en: 'CalendarDatePicker' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI CalendarDatePicker 控件示例:文本框 + 内嵌月视图日历弹层,支持显示格式、可选范围(min/max)与周首日切换;点击文本框开日历,选中即回填并收起。上半区参数实时调节,下半区为控件文档。',
  en: 'WinUI CalendarDatePicker examples: text box + embedded month-view calendar flyout with display format, min/max range and first-day-of-week options.',
}
const GROUP_BASIC: BilingualText = { zh: '基础选择(对照官方示例,dateChanged 实时回显)', en: 'Basic pick (official sample, dateChanged echo)' }
const GROUP_RANGE: BilingualText = { zh: 'min/max 约束(今天 ±10 天,范围外 Blackout 禁选,导航按钮月界钳制)', en: 'min/max range (today ±10 days, blackout outside)' }
const GROUP_FIRSTDAY: BilingualText = { zh: 'firstDayOfWeek 切换(周日默认 vs 周一开始)', en: 'First day of week (Sunday default vs Monday)' }
const GROUP_EMPTY: BilingualText = { zh: '空值(未选显示占位文本,可清空回 null)', en: 'Empty value (placeholder shown, clear to null)' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘操作', en: 'Keyboard interaction' }
const LABEL_HEADER: BilingualText = { zh: '标头(Header)', en: 'Header' }
const LABEL_PLACEHOLDER: BilingualText = { zh: '占位文本(PlaceholderText)', en: 'PlaceholderText' }
const LABEL_DATE_FORMAT: BilingualText = { zh: '显示格式(DateFormat)', en: 'DateFormat' }
const LABEL_TODAY_HIGHLIGHT: BilingualText = { zh: '今日高亮(IsTodayHighlighted)', en: 'IsTodayHighlighted' }
const LABEL_FIRST_DAY: BilingualText = { zh: '周首日改周一(FirstDayOfWeek=1)', en: 'First day Monday (FirstDayOfWeek=1)' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(Disabled)', en: 'Disabled' }
const LABEL_IS_OPEN: BilingualText = { zh: '程序开关(IsCalendarOpen)', en: 'IsCalendarOpen' }
const LABEL_LAST_EVENT: BilingualText = { zh: '最近事件', en: 'Last event' }
const LABEL_BASIC_DATE: BilingualText = { zh: '当前值', en: 'Current value' }
const LABEL_CLEAR: BilingualText = { zh: '清空(置 null)', en: 'Clear (set null)' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupBasic = useBilingual(i18n, GROUP_BASIC)
const groupRange = useBilingual(i18n, GROUP_RANGE)
const groupFirstDay = useBilingual(i18n, GROUP_FIRSTDAY)
const groupEmpty = useBilingual(i18n, GROUP_EMPTY)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelHeader = useBilingual(i18n, LABEL_HEADER)
const labelPlaceholder = useBilingual(i18n, LABEL_PLACEHOLDER)
const labelDateFormat = useBilingual(i18n, LABEL_DATE_FORMAT)
const labelTodayHighlight = useBilingual(i18n, LABEL_TODAY_HIGHLIGHT)
const labelFirstDay = useBilingual(i18n, LABEL_FIRST_DAY)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelIsOpen = useBilingual(i18n, LABEL_IS_OPEN)
const labelLastEvent = useBilingual(i18n, LABEL_LAST_EVENT)
const labelBasicDate = useBilingual(i18n, LABEL_BASIC_DATE)
const labelClear = useBilingual(i18n, LABEL_CLEAR)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

const isZh = computed(() => i18n.locale.value.startsWith('zh'))

function dayLabel(value: Date | null): string {
  return value ? value.toLocaleDateString() : 'null'
}

// —— 参数面板(作用于演示一)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoHeader = ref<string | number | boolean>('Calendar')
const demoPlaceholder = ref<string | number | boolean>('Pick a date')
const demoDateFormat = ref<string | number | boolean>('default')
const demoFirstDayMode = ref<string | number | boolean>(false)
const demoTodayHighlight = ref<string | number | boolean>(true)
const demoDisabled = ref<string | number | boolean>(false)
const demoIsOpen = ref<string | number | boolean>(false)

const headerValue = computed(() => String(demoHeader.value))
const placeholderValue = computed(() => String(demoPlaceholder.value))
const todayHighlightValue = computed(() => demoTodayHighlight.value === true)
const disabledValue = computed(() => demoDisabled.value === true)
// 程序开关 → 面板模型;面板自身关闭(轻扫/选中/Esc)时回写开关状态(ComboBoxPage 同款桥接)
const demoIsOpenModel = ref(false)
watch(
  demoIsOpen,
  (value) => {
    demoIsOpenModel.value = value === true
  },
  { immediate: true },
)
watch(demoIsOpenModel, (value) => {
  demoIsOpen.value = value
})
// firstDayOfWeek 切换:开关关 = 周日(0),开 = 周一(1)
const firstDayValue = computed(() => (demoFirstDayMode.value === true ? 1 : 0))

const FORMAT_CHOICES = [
  { label: isZh.value ? '默认(周日, 九月 28)' : 'default (Sun, September 28)', value: 'default' },
  { label: 'longdate', value: 'longdate' },
  { label: 'shortdate', value: 'shortdate' },
  { label: '{year}-{month.integer(2)}-{day.integer(2)}', value: '{year}-{month.integer(2)}-{day.integer(2)}' },
]
const dateFormatValue = computed(() => {
  const value = String(demoDateFormat.value)
  return value === 'default' ? '{dayofweek.abbreviated}, {month.full} {day.integer}' : value
})

// —— 演示一:基础选择(对照官方 CalendarDatePickerPage:Header="Calendar" + "Pick a date")——
const basicDate = ref<Date | null>(null)
const lastEvent = ref('—')

function onBasicDateChanged(value: Date | null): void {
  lastEvent.value = `dateChanged → ${dayLabel(value)}`
}

// —— 演示二:min/max 约束(今天 ±10 天)——
const today = new Date()
const rangeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10)
const rangeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)
const rangeDate = ref<Date | null>(null)
const rangeText = `${rangeMin.toLocaleDateString()} ~ ${rangeMax.toLocaleDateString()}`

function onRangeDateChanged(value: Date | null): void {
  rangeDate.value = value
}

// —— 演示三:firstDayOfWeek 切换(默认周日 vs 周一)——
const firstDayDate = ref<Date | null>(null)

// —— 演示四:空值(清空回 null)——
const emptyDate = ref<Date | null>(null)

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['date (v-model)', 'Date | null', 'null', '选中日期(WinUI Date),双向绑定;选择写入本地当日 0 点,未选为 null'],
  ['isCalendarOpen (v-model)', 'boolean', 'false', '日历弹层开关(WinUI IsCalendarOpen),双向绑定'],
  ['header', 'string', "''", '输入框上方标头文本(WinUI Header)'],
  ['placeholderText', 'string', "''", '未选日期时显示的占位文本(WinUI PlaceholderText)'],
  ['dateFormat', 'string', "'{dayofweek.abbreviated}, {month.full} {day.integer}'", '显示格式(WinUI DateFormat,DateTimeFormatter 模板串);另接受 shortdate / longdate 具名格式'],
  ['minDate', 'Date', 'undefined', '最早可选日期(WinUI MinDate),早于它的日期 Blackout 禁选'],
  ['maxDate', 'Date', 'undefined', '最晚可选日期(WinUI MaxDate),晚于它的日期 Blackout 禁选'],
  ['isTodayHighlighted', 'boolean', 'true', '是否高亮今天(WinUI IsTodayHighlighted)'],
  ['firstDayOfWeek', 'number', '0', '周首日,0 = 周日 … 6 = 周六(WinUI FirstDayOfWeek)'],
  ['calendarIdentifier', 'string', "'GregorianCalendar'", '历法标识(WinUI CalendarIdentifier);仅支持阳历,其余回退阳历'],
  ['disabled', 'boolean', 'false', '禁用态,样式对照 Disabled 视觉状态'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['dateChanged', '(value: Date | null)', '日期变化时(用户选择与程序化赋值均触发;WinUI DateChanged)'],
  ['opened', '—', '日历弹层打开并完成首次定位后(WinUI Opened)'],
  ['closed', '—', '日历弹层关闭后(WinUI Closed)'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['Enter / Space / ↓ / ↑', '关闭态:打开日历(焦点落在已选日 / 今天 / 范围内首日)'],
  ['← / → / ↑ / ↓', '打开态:按日 / 周移动焦点,跨月时视图自动跟进'],
  ['Home / End', '打开态:移动到本周行首 / 行尾(以周首日为行起点)'],
  ['PgUp / PgDn', '打开态:上 / 下换月(保留日号,钳到目标月天数)'],
  ['Enter / Space', '打开态:选中当前聚焦日并收起(Blackout 日不可选)'],
  ['Esc', '关闭日历,焦点归还文本框'],
  ['Tab', '关闭日历,焦点自然移动'],
]

const usageCode = computed(
  () => `<WuiCalendarDatePicker
  v-model:date="selectedDate"
  header="${headerValue.value}"
  placeholder-text="${placeholderValue.value}"
  :first-day-of-week="${firstDayValue.value}"
  @date-changed="onDateChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="cdp-stage">
        <!-- 演示一:基础选择(参数面板实时调节 Header/Placeholder/DateFormat/FirstDay/Today/Disabled/IsOpen) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupBasic }}</h4>
          <div class="demo-row">
            <WuiCalendarDatePicker
              v-model:date="basicDate"
              v-model:is-calendar-open="demoIsOpenModel"
              :header="headerValue"
              :placeholder-text="placeholderValue"
              :date-format="dateFormatValue"
              :first-day-of-week="firstDayValue"
              :is-today-highlighted="todayHighlightValue"
              :disabled="disabledValue"
              style="width: 200px"
              @date-changed="onBasicDateChanged"
              @opened="lastEvent = 'opened'"
              @closed="lastEvent = 'closed'"
            />
          </div>
          <p class="demo-output">
            {{ labelBasicDate }}: {{ dayLabel(basicDate) }} · {{ labelLastEvent }}: {{ lastEvent }}
          </p>
        </section>

        <!-- 演示二:min/max 约束(今天 ±10 天;范围外 Blackout,导航按钮月界钳制) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupRange }}</h4>
          <div class="demo-row">
            <WuiCalendarDatePicker
              v-model:date="rangeDate"
              header="Book a date"
              placeholder-text="Pick a date in range"
              :min-date="rangeMin"
              :max-date="rangeMax"
              style="width: 200px"
              @date-changed="onRangeDateChanged"
            />
          </div>
          <p class="demo-output">min/max: {{ rangeText }} · {{ labelBasicDate }}: {{ dayLabel(rangeDate) }}</p>
        </section>

        <!-- 演示三:firstDayOfWeek 切换(默认周日 vs 周一开始) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupFirstDay }}</h4>
          <div class="demo-row">
            <WuiCalendarDatePicker
              v-model:date="firstDayDate"
              header="FirstDayOfWeek = 0(周日)"
              placeholder-text="Pick a date"
              :first-day-of-week="0"
              style="width: 200px"
            />
            <WuiCalendarDatePicker
              v-model:date="firstDayDate"
              header="FirstDayOfWeek = 1(周一)"
              placeholder-text="Pick a date"
              :first-day-of-week="1"
              style="width: 200px"
            />
          </div>
        </section>

        <!-- 演示四:空值(未选显示占位;清空回 null) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupEmpty }}</h4>
          <div class="demo-row">
            <WuiCalendarDatePicker
              v-model:date="emptyDate"
              header="Nullable"
              placeholder-text="Pick a date"
              style="width: 200px"
            />
            <button type="button" class="demo-clear" @click="emptyDate = null">{{ labelClear }}</button>
            <span class="demo-output">date = {{ dayLabel(emptyDate) }}</span>
          </div>
        </section>

        <!-- 键盘操作说明 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupKeyboard }}</h4>
          <ul class="keyboard-list">
            <li><kbd>Enter</kbd>/<kbd>Space</kbd>/<kbd>↓</kbd>/<kbd>↑</kbd> {{ isZh ? '打开日历' : 'open calendar' }}</li>
            <li><kbd>←</kbd>/<kbd>→</kbd>/<kbd>↑</kbd>/<kbd>↓</kbd> {{ isZh ? '移动焦点(跨月自动翻页)' : 'move focus (auto month flip)' }}</li>
            <li><kbd>Home</kbd>/<kbd>End</kbd> {{ isZh ? '行首/行尾' : 'row start/end' }}</li>
            <li><kbd>PgUp</kbd>/<kbd>PgDn</kbd> {{ isZh ? '换月' : 'change month' }}</li>
            <li><kbd>Enter</kbd>/<kbd>Space</kbd> {{ isZh ? '选中聚焦日' : 'select focused day' }}</li>
            <li><kbd>Esc</kbd>/<kbd>Tab</kbd> {{ isZh ? '关闭' : 'close' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelHeader" type="text" v-model="demoHeader" />
        <DemoOptionRow :label="labelPlaceholder" type="text" v-model="demoPlaceholder" />
        <DemoOptionRow :label="labelDateFormat" type="select" v-model="demoDateFormat" :options="FORMAT_CHOICES" />
        <DemoOptionRow :label="labelTodayHighlight" type="toggle" v-model="demoTodayHighlight" />
        <DemoOptionRow :label="labelFirstDay" type="toggle" v-model="demoFirstDayMode" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelIsOpen" type="toggle" v-model="demoIsOpen" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsKeyboardTitle }}</h4>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.cdp-stage {
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

.demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 清空按钮:对照 WinUI 标准按钮观感(演示辅助,非控件本体) */
.demo-clear {
  padding: 5px 12px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 4px;
  cursor: pointer;
}

.demo-clear:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.keyboard-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.keyboard-list kbd {
  padding: 1px 6px;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 3px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
