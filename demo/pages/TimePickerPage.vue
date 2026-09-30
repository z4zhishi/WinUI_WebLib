<script setup lang="ts">
// TimePicker 示例页:对照官方 WinUI Gallery TimePickerPage 三例
// (SimpleTimepicker / Header+MinuteIncrement=15 / 24HourClock 初值当前时间),
// 扩展 12/24 换算对照(12AM=00:00、12PM=12:00)与空值态演示。
// 上半区交互演示 + 参数面板(Header/制式/分钟步进/禁用实时调节),
// 下半区为属性、事件、交互与用法代码(结构照抄已通过 QA 的 DatePickerPage 母版)。
import { computed, ref } from 'vue'
import WuiTimePicker from '@/components/TimePicker.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'TimePicker', en: 'TimePicker' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI TimePicker 控件示例:常驻 inline 的时/分/AM-PM 三列滚轮选择器,支持 12/24 小时制切换、分钟步进与空值占位态。上半区参数实时调节,下半区为控件文档。',
  en: 'WinUI TimePicker examples: inline hour/minute/AM-PM looping columns with 12/24-hour clock, minute increments and an empty placeholder state. Options above, docs below.',
}
const GROUP_BASIC: BilingualText = { zh: '基础选择(参数面板实时调节)', en: 'Basic selection (live options)' }
const GROUP_INCREMENT: BilingualText = { zh: '分钟步进(MinuteIncrement = 15)', en: 'Minute increments (MinuteIncrement = 15)' }
const GROUP_24H: BilingualText = { zh: '24 小时制(初值 = 当前时间)', en: '24-hour clock (initialized to current time)' }
const GROUP_CONVERT: BilingualText = { zh: '12/24 制换算对照(同一 time 值)', en: '12/24-hour conversion (same time value)' }
const GROUP_EMPTY: BilingualText = { zh: '空值态(Time = null,三列显示占位前景色)', en: 'Empty state (Time = null, placeholder foreground)' }
const GROUP_INTERACT: BilingualText = { zh: '滚轮交互', en: 'Wheel interaction' }
const LABEL_HEADER: BilingualText = { zh: '标头(Header)', en: 'Header' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(Disabled)', en: 'Disabled' }
const LABEL_CLOCK: BilingualText = { zh: '时钟制式(ClockIdentifier)', en: 'ClockIdentifier' }
const LABEL_INCREMENT: BilingualText = { zh: '分钟步进(MinuteIncrement)', en: 'MinuteIncrement' }
const LABEL_SELECTED: BilingualText = { zh: '当前选中', en: 'Selected' }
const LABEL_CHANGED: BilingualText = { zh: 'timeChanged 次数', en: 'timeChanged count' }
const BTN_NOON12: BilingualText = { zh: '设为 12:00(12 PM)', en: 'Set 12:00 (12 PM)' }
const BTN_MIDNIGHT: BilingualText = { zh: '设为 00:00(12 AM)', en: 'Set 00:00 (12 AM)' }
const BTN_CLEAR: BilingualText = { zh: '清空(Time = null)', en: 'Clear (Time = null)' }
const BTN_NOW: BilingualText = { zh: '设为当前时间', en: 'Set to current time' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_INTERACT_TITLE: BilingualText = { zh: '滚轮交互', en: 'Interaction' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupBasic = useBilingual(i18n, GROUP_BASIC)
const groupIncrement = useBilingual(i18n, GROUP_INCREMENT)
const group24h = useBilingual(i18n, GROUP_24H)
const groupConvert = useBilingual(i18n, GROUP_CONVERT)
const groupEmpty = useBilingual(i18n, GROUP_EMPTY)
const groupInteract = useBilingual(i18n, GROUP_INTERACT)
const labelHeader = useBilingual(i18n, LABEL_HEADER)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelClock = useBilingual(i18n, LABEL_CLOCK)
const labelIncrement = useBilingual(i18n, LABEL_INCREMENT)
const labelSelected = useBilingual(i18n, LABEL_SELECTED)
const labelChanged = useBilingual(i18n, LABEL_CHANGED)
const btnNoon12 = useBilingual(i18n, BTN_NOON12)
const btnMidnight = useBilingual(i18n, BTN_MIDNIGHT)
const btnClear = useBilingual(i18n, BTN_CLEAR)
const btnNow = useBilingual(i18n, BTN_NOW)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsInteractTitle = useBilingual(i18n, DOCS_INTERACT_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 工具 ——
/** "HH:mm" → "h:mm AM/PM" 换算展示(12AM=00:00、12PM=12:00)。 */
function to12hText(value: string | null): string {
  if (value === null) return '—'
  const match = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (match === null) return value
  const hour = Number(match[1])
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`
}

/** 官方示例 3 的初值:当前时间(DateTime.Now.TimeOfDay)。 */
function nowHHmm(): string {
  const now = new Date()
  const pad = (n: number): string => (n < 10 ? `0${n}` : String(n))
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

// —— 参数面板(作用于演示一)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoHeader = ref<string | number | boolean>('Pick a time')
const demoDisabled = ref<string | number | boolean>(false)
const demoClock = ref<string | number | boolean>('12HourClock')
const demoIncrement = ref<string | number | boolean>('1')

const headerValue = computed(() => String(demoHeader.value))
const disabledValue = computed(() => demoDisabled.value === true)
const clockValue = computed(() =>
  demoClock.value === '24HourClock' ? '24HourClock' as const : '12HourClock' as const,
)
const incrementValue = computed(() => {
  const parsed = Number(demoIncrement.value)
  return Number.isFinite(parsed) ? parsed : 1
})

const clockChoices = [
  { label: '12HourClock — 时(1-12) + AM/PM', value: '12HourClock' },
  { label: '24HourClock — 时(0-23)', value: '24HourClock' },
]
const incrementChoices = [
  { label: '1', value: '1' },
  { label: '5', value: '5' },
  { label: '10', value: '10' },
  { label: '15', value: '15' },
  { label: '30', value: '30' },
]

// —— 演示一:基础选择(对照官方 Example1 <TimePicker/>;初始 null 为空值态)——
const basicTime = ref<string | null>(null)
const basicChangedCount = ref(0)
const basicEcho = computed(() => basicTime.value ?? '—')

function onBasicTimeChanged(): void {
  basicChangedCount.value += 1
}

// —— 演示二:分钟步进(官方 Example2:Header "Arrival time",MinuteIncrement=15)——
const incrementTime = ref<string | null>('17:30')

// —— 演示三:24 小时制 + 初值当前时间(官方 Example3)——
const clock24Time = ref<string | null>(nowHHmm())

// —— 演示四:12/24 换算对照(两个选择器共享同一 time 值)——
const convertTime = ref<string | null>('12:05')
const convertEcho = computed(() =>
  convertTime.value === null ? '—' : `${convertTime.value} = ${to12hText(convertTime.value)}`,
)

function setConvertNoon(): void {
  convertTime.value = '12:00' // 12 PM = 12:00
}

function setConvertMidnight(): void {
  convertTime.value = '00:00' // 12 AM = 00:00
}

// —— 演示五:空值态(初始 null;点击任一列即提交真实时间)——
const emptyTime = ref<string | null>(null)

function clearEmptyTime(): void {
  emptyTime.value = null
}

function setEmptyTimeToNow(): void {
  emptyTime.value = nowHHmm()
}

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['time (v-model)', 'string | null', 'null', '选中时间,"HH:mm" 24 小时制零填充字符串(WinUI SelectedTime 为 TimeSpan,此处选型字符串);null 为未选择'],
  ['header', 'string', "''", '选择器上方标头文本(WinUI Header)'],
  ['clockStyle', "'12HourClock' | '24HourClock'", "'12HourClock'", '时钟制式(WinUI ClockIdentifier);12 制显示 时(1-12)+ AM/PM 列,24 制显示 0-23'],
  ['minuteIncrement', 'number', '1', '分钟列步进(WinUI MinuteIncrement,收敛 1-30);变更时已选分钟就近吸附到网格(13:08 → 15 步进吸附为 13:15)'],
  ['placeholderTime', 'string', '当前时间', "空值态(time 为 null)时三列显示的占位时间,'HH:mm'"],
  ['disabled', 'boolean', 'false', '禁用态,样式对照模板 Disabled 视觉状态'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['timeChanged', '(newTime: string | null, oldTime: string | null)', '选中时间变化时(滚轮/箭头/拖拽/点击列项/程序化赋值均触发)'],
  ['update:time', '(value: string | null)', 'v-model:time 双向绑定更新时'],
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
  ['Tab', '在时/分/AM-PM 三列间移动焦点'],
]

const usageCode = computed(
  () => `<WuiTimePicker
  v-model:time="time"
  header="${headerValue.value}"
  clock-style="${clockValue.value}"
  :minute-increment="${incrementValue.value}"
  :disabled="${disabledValue.value}"
  @time-changed="onTimeChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="TimePicker">
    <template #demo>
      <div class="timepicker-stage">
        <!-- 演示一:基础选择(参数面板实时调节 Header/制式/分钟步进/禁用) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupBasic }}</h4>
          <div class="demo-row">
            <WuiTimePicker
              v-model:time="basicTime"
              :header="headerValue"
              :clock-style="clockValue"
              :minute-increment="incrementValue"
              :disabled="disabledValue"
              @time-changed="onBasicTimeChanged"
            />
          </div>
          <p class="demo-output">
            {{ labelSelected }}: {{ basicEcho }} · {{ to12hText(basicTime) }} · {{ labelChanged }}: {{ basicChangedCount }}
          </p>
        </section>

        <!-- 演示二:分钟步进(官方示例 2:Header "Arrival time",MinuteIncrement=15) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupIncrement }}</h4>
          <div class="demo-row">
            <WuiTimePicker v-model:time="incrementTime" header="Arrival time" :minute-increment="15" />
          </div>
          <p class="demo-output">{{ labelSelected }}: {{ incrementTime ?? '—' }}(分钟列仅 00/15/30/45)</p>
        </section>

        <!-- 演示三:24 小时制 + 初值当前时间(官方示例 3) -->
        <section class="demo-group">
          <h4 class="group-title">{{ group24h }}</h4>
          <div class="demo-row">
            <WuiTimePicker v-model:time="clock24Time" clock-style="24HourClock" header="24 hour clock" />
          </div>
          <p class="demo-output">{{ labelSelected }}: {{ clock24Time ?? '—' }} = {{ to12hText(clock24Time) }}</p>
        </section>

        <!-- 演示四:12/24 换算对照(同一 time 值;12AM=00:00、12PM=12:00) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupConvert }}</h4>
          <div class="demo-row">
            <WuiTimePicker v-model:time="convertTime" clock-style="12HourClock" header="12 hour clock" />
            <WuiTimePicker v-model:time="convertTime" clock-style="24HourClock" header="24 hour clock" />
            <button type="button" class="demo-button" @click="setConvertNoon">{{ btnNoon12 }}</button>
            <button type="button" class="demo-button" @click="setConvertMidnight">{{ btnMidnight }}</button>
          </div>
          <p class="demo-output">{{ convertEcho }}</p>
        </section>

        <!-- 演示五:空值态(Time = null → 占位前景色;操作任一列即提交真实时间) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupEmpty }}</h4>
          <div class="demo-row">
            <WuiTimePicker v-model:time="emptyTime" header="Pick a time" />
            <button type="button" class="demo-button" @click="clearEmptyTime">{{ btnClear }}</button>
            <button type="button" class="demo-button" @click="setEmptyTimeToNow">{{ btnNow }}</button>
          </div>
          <p class="demo-output">{{ labelSelected }}: {{ emptyTime ?? '—' }}</p>
        </section>

        <!-- 滚轮交互说明 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupInteract }}</h4>
          <ul class="interact-list">
            <li>滚轮 / 上下箭头 / 拖拽 / 点击列项 {{ i18n.locale.value.startsWith('zh') ? '任选其一改变时间' : 'change the time' }}</li>
            <li>{{ i18n.locale.value.startsWith('zh') ? '聚焦列后用 ↑/↓、PageUp/PageDown、Home/End 键盘步进' : 'Focus a column, then ↑/↓, PageUp/PageDown, Home/End' }}</li>
            <li>{{ i18n.locale.value.startsWith('zh') ? '12/24 制共用内部 24 小时制状态,切换制式不改值(12AM=00:00、12PM=12:00)' : '12/24 modes share one internal 24h state; switching keeps the value (12AM=00:00, 12PM=12:00)' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelHeader" type="text" v-model="demoHeader" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelClock" type="select" v-model="demoClock" :options="clockChoices" />
        <DemoOptionRow :label="labelIncrement" type="select" v-model="demoIncrement" :options="incrementChoices" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsInteractTitle }}</h4>
      <DemoDocsTable :headers="interactHeaders" :rows="interactRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.timepicker-stage {
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
