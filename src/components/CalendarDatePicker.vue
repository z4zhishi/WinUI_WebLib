<script setup lang="ts">
// CalendarDatePicker.vue —— WinUI CalendarDatePicker 的 Web 复刻(文本框 + 内嵌月视图日历弹层)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="CalendarDatePicker">(L14801 起):
//   - 关闭态四色:Background/BorderBrush = --wui-calendar-date-picker-background/border(Normal)、
//     -pointer-over、-pressed、-disabled;Border = CalendarDatePickerBorderThemeThickness = 2、
//     MinHeight 32、CornerRadius = ControlCornerRadius(4px,无同名 token,沿 Button/NumberBox 做法);
//   - DateText:Padding 12,0,0,2、垂直居中;前景 TextForeground(未选,BaseMedium)→
//     TextForegroundSelected(已选,SelectionStates.Selected);
//   - CalendarGlyph:U+E787(日历),SymbolThemeFontFamily、FontSize 12、32px 列视觉居中;
//   - 聚焦态:Background = CalendarDatePickerBackgroundFocused(强调色低透明度铺底);
//     Header / DateText / Glyph 各有 Disabled 前景 token。
// 弹层(内嵌月视图,只做 CalendarDatePicker 够用的月历;完整 CalendarView 是独立后续任务):
//   generic.xaml <Style x:Key="CalendarViewRevealStyle" TargetType="CalendarView">(L14310 起)
//   + AttachedFlyout(Flyout Placement="Bottom"、FlyoutPresenter Padding 0 / BorderThickness 0):
//   - 面板:CalendarViewBackground 背景 + Border 1px(CalendarViewBorderBrush);层圆角/阴影由
//     .wui-popup-layer 提供(ThemeShadow 的 Web 近似);
//   - 头部行高 40:HeaderButton(FontSize 20、Padding 12,0,0,0、左对齐,内容「月 年」,
//     占 5* 列)+ PreviousButton(U+E0E4)/ NextButton(U+E0E5)透明底导航按钮(各 1* 列,
//     FontSize 20,hover/pressed/disabled 前景取 --wui-calendar-view-navigation-button-* token);
//   - 周名行:高 38、七等分列,WeekDayNameStyle = CaptionTextBlockStyle(12px);
//   - 日格:CalendarViewDayItemRevealStyle Min 40×40、Margin 1、CalendarItemBorderThickness = 2;
//     状态圈为圆形(hover/pressed/selected/selected×hover/selected×pressed 边框各取
//     --wui-calendar-view-* token);今日 = 强调色实心圆 + TodayForeground;
//     范围外(Blackout)= 黑障前景 + 中线划杠(源为 chrome 绘制的划线,Web 用伪元素近似);
//     相邻月格 = OutOfScope 背景/前景(方格底,WinUI 即矩形填充)。
// 行为规格(对照 WinUI CalendarDatePicker):
//   - date 双向(defineModel);dateChanged 对任何来源的变化触发(含程序化赋值,WinUI 语义);
//     opened / closed 对应弹层 Opened / Closed;isCalendarOpen 双向(WinUI IsCalendarOpen);
//   - 文本框只读展示(WinUI 模板 DateText 是 TextBlock 而非 TextBox):点击任意处开日历,
//     不做自由文本输入与解析(与常见 Web 日期输入的差异,见 wiki);
//   - minDate/maxDate:范围外日期 Blackout 不可选,前后月导航按钮在月界钳制(对照
//     HasMoreContentBefore / After);相邻月格同样受范围约束;
//   - 打开时显示月 = 已选日期所在月,未选则今天所在月(整体越界时钳入 min/max 月);
//   - 键盘:关闭态 Enter/Space/↓/↑ 打开;打开态 ←/→/↑/↓ 按日/周移动、Home/End 行首/行尾、
//     PgUp/PgDn 换月(保留日号、钳到该月天数)、Enter/Space 选聚焦日、Esc 关(基建栈顶收口 +
//     层内兜底)、Tab 关;焦点跨月时视图自动跟进(WinUI 月视图滚动语义的 Web 等效);
//   - 弹层走公共基建 usePopupLayer(light dismiss 三手势),嵌套豁免由注册表内置。
import { computed, nextTick, ref, useId, watch } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'

defineOptions({ name: 'WuiCalendarDatePicker', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 输入框上方标头文本(WinUI Header)。 */
    header?: string
    /** 未选日期时显示的占位文本(WinUI PlaceholderText)。 */
    placeholderText?: string
    /** 选中日期的显示格式(WinUI DateFormat,DateTimeFormatter 模板串);另接受 'shortdate' / 'longdate' 具名格式。 */
    dateFormat?: string
    /** 可选的最早日期(WinUI MinDate);早于它的日期 Blackout 禁选。 */
    minDate?: Date
    /** 可选的最晚日期(WinUI MaxDate);晚于它的日期 Blackout 禁选。 */
    maxDate?: Date
    /** 是否高亮今天(WinUI IsTodayHighlighted)。 */
    isTodayHighlighted?: boolean
    /** 周首日,0 = 周日 … 6 = 周六(WinUI FirstDayOfWeek,默认周日)。 */
    firstDayOfWeek?: number
    /** 历法标识(WinUI CalendarIdentifier);本实现仅支持阳历 'GregorianCalendar',其余回退阳历并在 dev 下告警。 */
    calendarIdentifier?: string
    /** 禁用态,样式对照 Disabled 视觉状态。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    placeholderText: '',
    dateFormat: '{dayofweek.abbreviated}, {month.full} {day.integer}',
    minDate: undefined,
    maxDate: undefined,
    isTodayHighlighted: true,
    firstDayOfWeek: 0,
    calendarIdentifier: 'GregorianCalendar',
    disabled: false,
  },
)

/** 选中日期(WinUI Date),支持 v-model:date;未选为 null(defineModel 不收字面量 default,初始 undefined 与 null 同义)。 */
const date = defineModel<Date | null>('date')
/** 日历弹层开关(WinUI IsCalendarOpen),支持 v-model:is-calendar-open。 */
const isCalendarOpen = defineModel<boolean>('isCalendarOpen', { default: false })

const emit = defineEmits<{
  /** WinUI DateChanged:日期变化(用户选择与程序化赋值均触发);参数为当前值(未选 null)。 */
  (e: 'dateChanged', value: Date | null): void
  /** WinUI Opened:日历弹层已打开(首次定位完成后)。 */
  (e: 'opened'): void
  /** WinUI Closed:日历弹层已关闭。 */
  (e: 'closed'): void
}>()

if (import.meta.env.DEV && props.calendarIdentifier !== 'GregorianCalendar') {
   
  console.warn(
    `[WuiCalendarDatePicker] calendarIdentifier="${props.calendarIdentifier}" 暂不支持,已回退阳历(GregorianCalendar)。`,
  )
}

// —— 日期基础工具(全部走本地时区,按「年月日」比较,规避时区/夏令时误差)——

/** 取本地当日起始(去掉时分秒毫秒)。 */
function toDayStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

/** 日序号:年*10000 + 月*100 + 日,同月界内可直接比大小。 */
function daySerial(value: Date): number {
  return value.getFullYear() * 10000 + value.getMonth() * 100 + value.getDate()
}

/** 生成 `y-m-d` 形式的键(DOM data 属性与单元格 key 共用)。 */
function dayKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`
}

/** 该月天数(传 0 号即取上个月最后一天)。 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

const today = toDayStart(new Date())
const todaySerial = daySerial(today)

/* -------------------------------------------------------------------------
 * 格式化:DateFormat 模板串(DateTimeFormatter 子集)+ 具名格式
 * ---------------------------------------------------------------------- */

const FORMAT_TOKEN = /\{(\w+)(?:\.(\w+))?(?:\((\d+)\))?\}/g
const LOCALE = undefined // 宿主 locale:与 WinUI 的全球化默认一致,由运行环境决定名称语言

/** 用 Intl 取本地化名称;limit 用于截断 abbreviated(n) 的长度。 */
function intlText(options: Intl.DateTimeFormatOptions, value: Date, limit?: number): string {
  const text = new Intl.DateTimeFormat(LOCALE, options).format(value)
  return limit !== undefined && text.length > limit ? text.slice(0, limit) : text
}

function formatToken(
  value: Date,
  field: string,
  qualifier: string | undefined,
  digits: number | undefined,
  raw: string,
): string {
  switch (field) {
    case 'year':
      if (qualifier === 'abbreviated') {
        const short = String(value.getFullYear() % 100)
        return digits !== undefined ? short.padStart(digits, '0') : short
      }
      return String(value.getFullYear())
    case 'month': {
      if (qualifier === 'integer') {
        const n = String(value.getMonth() + 1)
        return digits === 2 ? n.padStart(2, '0') : n
      }
      const style = qualifier === 'abbreviated' ? 'short' : 'long'
      const limit = qualifier === 'abbreviated' ? digits : undefined
      return intlText({ month: style }, value, limit)
    }
    case 'day': {
      const n = String(value.getDate())
      return digits === 2 ? n.padStart(2, '0') : n
    }
    case 'dayofweek': {
      const style = qualifier === 'abbreviated' ? 'short' : 'long'
      const limit = qualifier === 'abbreviated' ? digits : undefined
      return intlText({ weekday: style }, value, limit)
    }
    default:
      return raw // 不认识的模板片段原样保留(WinUI 非法格式回退默认;此处保守不吞内容)
  }
}

/** 按模板串格式化一个日期;支持 {year/month/day/dayofweek.full|abbreviated|integer[(n)]}。 */
function formatTemplate(template: string, value: Date): string {
  const named = template.trim().toLowerCase()
  if (named === 'shortdate') {
    return intlText({ year: 'numeric', month: 'numeric', day: 'numeric' }, value)
  }
  const effective =
    named === 'longdate' ? '{dayofweek.full}, {month.full} {day.integer}, {year.full}' : template
  return effective.replace(FORMAT_TOKEN, (raw, field, qualifier, digits) =>
    formatToken(value, field, qualifier, digits !== undefined ? Number(digits) : undefined, raw),
  )
}

/** 关闭态文本:选中日期按 dateFormat(WinUI 默认「周日缩写, 全月名 日号」);无效值视同未选。 */
const hasDate = computed(() => date.value instanceof Date && !Number.isNaN(date.value.getTime()))
const displayText = computed(() => (hasDate.value ? formatTemplate(props.dateFormat, date.value as Date) : ''))

/** 弹层头部「月 年」标题(月视图 HeaderButton 内容)。 */
const headerText = computed(() => {
  const { year, month } = displayMonth.value
  return formatTemplate('{month.full} {year.full}', new Date(year, month, 1))
})

/** 周名行标签(周日为基准周,再按 firstDayOfWeek 轮转;缩写式)。 */
const weekdayLabels = computed<string[]>(() => {
  const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
  return Array.from({ length: 7 }, (_, index) => {
    const shifted = (index + props.firstDayOfWeek) % 7
    const day = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + shifted)
    return intlText({ weekday: 'short' }, day)
  })
})

/* -------------------------------------------------------------------------
 * 选中状态:date 程序化赋值同样触发 dateChanged(按 getTime 签名去重,对齐 WinUI 语义)
 * ---------------------------------------------------------------------- */

let syncingDate = false
let lastNotifiedTime = hasDate.value ? (date.value as Date).getTime() : Number.NaN

function notifyDate(value: Date | null | undefined): void {
  const normalized = value ?? null // defineModel 无字面量 default:初始 undefined 与 null 同义
  const key = normalized ? normalized.getTime() : Number.NaN
  if (Object.is(key, lastNotifiedTime)) return
  lastNotifiedTime = key
  emit('dateChanged', normalized)
}

function applyDate(value: Date | null): void {
  syncingDate = true
  try {
    date.value = value
  } finally {
    syncingDate = false
  }
  notifyDate(value)
}

watch(date, (value) => {
  if (syncingDate) return
  notifyDate(value)
})

// 范围约束只作用于 UI(选择与导航),不回写消费方的 date 模型(见 wiki 差异节)
const minSerial = computed(() => (props.minDate ? daySerial(toDayStart(props.minDate)) : null))
const maxSerial = computed(() => (props.maxDate ? daySerial(toDayStart(props.maxDate)) : null))

const selectedSerial = computed(() =>
  hasDate.value ? daySerial(toDayStart(date.value as Date)) : null,
)

/* -------------------------------------------------------------------------
 * 月视图网格:固定 6 行 × 7 列;相邻月格渲染为 OutOfScope(WinUI 语义)
 * ---------------------------------------------------------------------- */

interface CalendarCell {
  date: Date
  key: string
  /** 是否属于当前显示月(相邻月 = out of scope)。 */
  inMonth: boolean
  /** 超出 min/max,Blackout 禁选。 */
  blackout: boolean
  isToday: boolean
  isSelected: boolean
}

/** 当前显示的年月(打开时重置为「已选月 / 今天月 / 钳入范围的月」)。 */
const displayMonth = ref<{ year: number; month: number }>({
  year: today.getFullYear(),
  month: today.getMonth(),
})

const cells = computed<CalendarCell[]>(() => {
  const { year, month } = displayMonth.value
  const first = new Date(year, month, 1)
  const offset = (first.getDay() - props.firstDayOfWeek + 7) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const serial = daySerial(cellDate)
    return {
      date: cellDate,
      key: dayKey(cellDate),
      inMonth: cellDate.getMonth() === month,
      blackout:
        (minSerial.value !== null && serial < minSerial.value) ||
        (maxSerial.value !== null && serial > maxSerial.value),
      isToday: serial === todaySerial,
      isSelected: selectedSerial.value !== null && serial === selectedSerial.value,
    }
  })
})

/** 行视图(ARIA grid 需要 grid > row > gridcell 结构)。 */
const cellRows = computed<CalendarCell[][]>(() => {
  const rows: CalendarCell[][] = []
  for (let index = 0; index < cells.value.length; index += 7) {
    rows.push(cells.value.slice(index, index + 7))
  }
  return rows
})

/** 前后月导航是否可用(WinUI HasMoreContentBefore / After:前一月还有可选内容)。 */
const canGoPrev = computed(() => {
  if (minSerial.value === null) return true
  const { year, month } = displayMonth.value
  const prevMonthLast = new Date(year, month, 0) // 上月最后一天
  return daySerial(prevMonthLast) >= minSerial.value
})

const canGoNext = computed(() => {
  if (maxSerial.value === null) return true
  const { year, month } = displayMonth.value
  const nextMonthFirst = new Date(year, month + 1, 1)
  return daySerial(nextMonthFirst) <= maxSerial.value
})

function shiftDisplayMonth(delta: number): void {
  const { year, month } = displayMonth.value
  const target = new Date(year, month + delta, 1)
  displayMonth.value = { year: target.getFullYear(), month: target.getMonth() }
}

/* -------------------------------------------------------------------------
 * 弹层:bottom 居中(AttachedFlyout Placement="Bottom")+ light dismiss 三手势
 * ---------------------------------------------------------------------- */

const { anchorRef } = usePopupAnchor()
const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: 'bottom',
  offset: { mainAxis: 4 },
  onOutsidePress: () => closeCalendar(false),
  onEscape: () => closeCalendar(true),
  onAnchorScroll: () => closeCalendar(false), // WinUI:锚滚动链滚动即 light dismiss(ComboBox 同约定)
})

const gridId = useId()

/** 键盘焦点日(roving focus;关闭态无意义)。 */
const focusedDay = ref<Date | null>(null)

const focusedKey = computed(() => (focusedDay.value ? dayKey(focusedDay.value) : ''))

/** 打开时应显示的日期:已选月 > 今天月(今天整月越界则钳入 min/max 月)。 */
function initialDisplayDate(): Date {
  if (hasDate.value) return toDayStart(date.value as Date)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  if (minSerial.value !== null && daySerial(monthEnd) < minSerial.value) {
    return toDayStart(props.minDate as Date)
  }
  if (maxSerial.value !== null && daySerial(monthStart) > maxSerial.value) {
    return toDayStart(props.maxDate as Date)
  }
  return today
}

/** 打开时键盘焦点落点:已选日 > 今天(高亮开启时)> 范围内首日,再钳入显示月。 */
function initialFocusedDay(): Date {
  const base = initialDisplayDate()
  if (hasDate.value) return base
  if (props.isTodayHighlighted) {
    if (minSerial.value === null || todaySerial >= minSerial.value) {
      if (maxSerial.value === null || todaySerial <= maxSerial.value) return today
    }
  }
  const { year, month } = displayMonth.value
  return new Date(year, month, 1)
}

watch(isCalendarOpen, (value) => {
  if (value) {
    const base = initialDisplayDate()
    displayMonth.value = { year: base.getFullYear(), month: base.getMonth() }
    focusedDay.value = initialFocusedDay()
    void nextTick(() => {
      update()
      layerRef.value?.focus()
      focusFocusedCell()
      emit('opened')
    })
  } else {
    emit('closed')
  }
})

function openCalendar(): void {
  if (props.disabled || isCalendarOpen.value) return
  isCalendarOpen.value = true
}

function closeCalendar(restoreFocus: boolean): void {
  if (!isCalendarOpen.value) return
  isCalendarOpen.value = false
  if (restoreFocus) anchorRef.value?.focus()
}

// 禁用即收起:disabled 翻 true 时同步关闭弹层并回写模型(层 v-if 已含 !disabled,此处保证模型一致)
watch(
  () => props.disabled,
  (value) => {
    if (value) closeCalendar(false)
  },
)

/** 选择一个日格:回填 date、关闭弹层(WinUI 选后即收起)。 */
function selectDay(cell: CalendarCell): void {
  if (props.disabled || cell.blackout) return
  applyDate(toDayStart(cell.date))
  closeCalendar(false)
}

/* -------------------------------------------------------------------------
 * 键盘:打开态在日格间移动(roving focus,焦点跨月视图自动跟进)
 * ---------------------------------------------------------------------- */

function focusFocusedCell(): void {
  const layer = layerRef.value
  if (!layer || !focusedDay.value) return
  const cell = layer.querySelector<HTMLElement>(`[data-day-key="${focusedKey.value}"]`)
  cell?.focus()
}

function setFocusedDay(next: Date): void {
  if (
    next.getMonth() !== displayMonth.value.month ||
    next.getFullYear() !== displayMonth.value.year
  ) {
    displayMonth.value = { year: next.getFullYear(), month: next.getMonth() }
  }
  focusedDay.value = next
  void nextTick(focusFocusedCell)
}

function currentFocused(): Date {
  return focusedDay.value ?? initialFocusedDay()
}

function stepDay(delta: number): void {
  const base = currentFocused()
  setFocusedDay(new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta))
}

/** Home / End:本周行首 / 行尾(以 firstDayOfWeek 为行起点,ARIA grid 惯例)。 */
function stepWeekEdge(edge: 'start' | 'end'): void {
  const base = currentFocused()
  const offsetIntoRow = (base.getDay() - props.firstDayOfWeek + 7) % 7
  const delta = edge === 'start' ? -offsetIntoRow : 6 - offsetIntoRow
  setFocusedDay(new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta))
}

/** PgUp / PgDn:换月,保留日号并钳到目标月天数(WinUI 月导航语义)。 */
function shiftMonthKeyboard(delta: number): void {
  const base = currentFocused()
  const targetMonth = new Date(displayMonth.value.year, displayMonth.value.month + delta, 1)
  const day = Math.min(base.getDate(), daysInMonth(targetMonth.getFullYear(), targetMonth.getMonth()))
  setFocusedDay(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day))
}

function onLayerKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.altKey || event.metaKey) return
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      stepDay(-1)
      return
    case 'ArrowRight':
      event.preventDefault()
      stepDay(1)
      return
    case 'ArrowUp':
      event.preventDefault()
      stepDay(-7)
      return
    case 'ArrowDown':
      event.preventDefault()
      stepDay(7)
      return
    case 'Home':
      event.preventDefault()
      stepWeekEdge('start')
      return
    case 'End':
      event.preventDefault()
      stepWeekEdge('end')
      return
    case 'PageUp':
      event.preventDefault()
      shiftMonthKeyboard(-1)
      return
    case 'PageDown':
      event.preventDefault()
      shiftMonthKeyboard(1)
      return
    case 'Enter':
    case ' ':
      event.preventDefault() // 阻断按钮原生 click,统一走 selectDay
      {
        const base = currentFocused()
        const cell = cells.value.find((item) => item.key === dayKey(base))
        if (cell) selectDay(cell)
      }
      return
    case 'Escape':
      // 常规路径由 usePopupLayer onEscape 收口;此处兜底非栈顶场景
      closeCalendar(true)
      return
    case 'Tab':
      // WinUI:Tab 即 light dismiss,不拦截默认焦点移动
      closeCalendar(false)
      return
  }
}

/* -------------------------------------------------------------------------
 * 关闭态:点击开关、Enter/Space/↓/↑ 打开(不做文本输入,见 wiki)
 * ---------------------------------------------------------------------- */

function onRootClick(): void {
  if (props.disabled) return
  if (isCalendarOpen.value) closeCalendar(false)
  else openCalendar()
}

function onRootKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  if (event.ctrlKey || event.altKey || event.metaKey) return
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    openCalendar()
  }
}

const rootClass = computed(() => ({
  'is-disabled': props.disabled,
  'is-selected': hasDate.value,
  'is-open': isCalendarOpen.value,
}))
</script>

<template>
  <div v-bind="$attrs" class="wui-calendar-date-picker" :class="rootClass">
    <!-- HeaderContentPresenter:CalendarDatePickerTopHeaderMargin = 0,0,0,4 -->
    <label v-if="header" class="wui-cdp-header">{{ header }}</label>

    <!-- 关闭态文本框(源模板 Background border + DateText + CalendarGlyph) -->
    <div
      ref="anchorRef"
      class="wui-cdp-input"
      role="button"
      :tabindex="disabled ? -1 : 0"
      aria-haspopup="dialog"
      :aria-expanded="isCalendarOpen"
      :aria-disabled="disabled || undefined"
      @click="onRootClick"
      @keydown="onRootKeydown"
    >
      <!-- DateText:Padding 12,0,0,2;未选显示 PlaceholderText -->
      <span class="wui-cdp-text">
        <template v-if="hasDate">{{ displayText }}</template>
        <template v-else>{{ placeholderText }}</template>
      </span>

      <!-- CalendarGlyph:U+E787(日历),FontSize 12,32px 列 -->
      <span class="wui-cdp-glyph" aria-hidden="true">&#xE787;</span>
    </div>
  </div>

  <!-- 月视图弹层:Teleport 到 body,bottom 居中 + light dismiss,复用 .wui-popup-layer 外壳 -->
  <Teleport to="body">
    <Transition name="wui-calendar-date-picker">
      <div
        v-if="isCalendarOpen && !disabled"
        ref="layerRef"
        class="wui-popup-layer wui-cdp-layer"
        role="dialog"
        tabindex="-1"
        :aria-label="header || placeholderText || '日历'"
        @keydown="onLayerKeydown"
      >
        <!-- 头部行(高 40):标题 5* + 前后导航各 1*,NavigationButtonStyle FontSize 20 -->
        <div class="wui-cdp-titlebar">
          <div class="wui-cdp-title">{{ headerText }}</div>
          <button
            type="button"
            class="wui-cdp-nav"
            :disabled="!canGoPrev || undefined"
            aria-label="上个月"
            @click="shiftDisplayMonth(-1)"
          >&#xE0E4;</button>
          <button
            type="button"
            class="wui-cdp-nav"
            :disabled="!canGoNext || undefined"
            aria-label="下个月"
            @click="shiftDisplayMonth(1)"
          >&#xE0E5;</button>
        </div>

        <!-- 日网格:ARIA grid 结构 grid > row > gridcell;周名行为 columnheader 行 -->
        <div class="wui-cdp-grid" role="grid">
          <!-- 周名行(高 38,CaptionTextBlockStyle 12px) -->
          <div class="wui-cdp-weekdays" role="row">
            <span
              v-for="(label, index) in weekdayLabels"
              :key="index"
              class="wui-cdp-weekday"
              role="columnheader"
              >{{ label }}</span
            >
          </div>
          <!-- 6 行 × 7 列,40×40 格 + Margin 1;状态圈为圆形 -->
          <div
            v-for="(weekCells, rowIndex) in cellRows"
            :key="rowIndex"
            class="wui-cdp-days-row"
            role="row"
          >
            <button
              v-for="cell in weekCells"
              :id="`${gridId}-d-${cell.key}`"
              :key="cell.key"
              type="button"
              class="wui-cdp-day"
              :class="{
                'is-out-of-scope': !cell.inMonth,
                'is-blackout': cell.blackout,
                'is-today': cell.isToday && isTodayHighlighted,
                'is-selected': cell.isSelected,
              }"
              role="gridcell"
              tabindex="-1"
              :aria-selected="cell.isSelected"
              :aria-disabled="cell.blackout || undefined"
              :data-day-key="cell.key"
              @click="selectDay(cell)"
            >
              <span class="wui-cdp-day-fill" aria-hidden="true"></span>
              <span class="wui-cdp-day-text">{{ cell.date.getDate() }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.wui-calendar-date-picker {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

/* —— Header:CalendarDatePickerTopHeaderMargin = 0,0,0,4;色随控件前景(继承)—— */
.wui-cdp-header {
  margin: 0 0 4px;
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize */
  font-weight: 400;
  color: var(--wui-calendar-date-picker-foreground);
}

/* ======================================================================
 * 关闭态文本框(源模板 Background border):Border 2、MinHeight 32、圆角 4(ControlCornerRadius)
 * ====================================================================== */
.wui-cdp-input {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 32px; /* 源模板 MinHeight = 32 */
  background: var(--wui-calendar-date-picker-background);
  border: 2px solid var(--wui-calendar-date-picker-border); /* CalendarDatePickerBorderThemeThickness */
  border-radius: 4px; /* CornerRadius = ControlCornerRadius,无同名 token(见 wiki) */
  cursor: pointer;
  outline: none;
}

/* DateText:Padding 12,0,0,2(bottom 2 把文本微微上提,对齐源模板) */
.wui-cdp-text {
  flex: 1;
  min-width: 0;
  padding: 0 0 2px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-calendar-date-picker-text-foreground);
}

/* SelectionStates.Selected:已选后文本换高对比前景 */
.wui-calendar-date-picker.is-selected .wui-cdp-text {
  color: var(--wui-calendar-date-picker-text-foreground-selected);
}

/* —— CalendarGlyph:U+E787,FontSize 12,32px 列视觉居中 —— */
.wui-cdp-glyph {
  flex: none;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size); /* GlyphElement FontSize = 12,取同值 token */
  line-height: 1;
  color: var(--wui-calendar-date-picker-calendar-glyph-foreground);
  user-select: none;
  -webkit-user-select: none;
}

/* —— 状态优先级(对照 VSM):Disabled > Focused > Pressed/Open > PointerOver > Normal ——
   hover/active 加 :not(:focus):not(.is-open) 保证优先级(QA F1 同 TextBox/ComboBox 做法);
   打开态即 pressed 底(WinUI 弹层开着时控件呈按压底)。 */
.wui-calendar-date-picker:not(.is-disabled) .wui-cdp-input:not(:focus):not(.is-open):hover {
  background: var(--wui-calendar-date-picker-background-pointer-over);
  border-color: var(--wui-calendar-date-picker-border-brush-pointer-over);
}

.wui-calendar-date-picker:not(.is-disabled) .wui-cdp-input:not(:focus):not(.is-open):active {
  background: var(--wui-calendar-date-picker-background-pressed);
  border-color: var(--wui-calendar-date-picker-border-brush-pressed);
}

.wui-calendar-date-picker:not(.is-disabled) .wui-cdp-input.is-open {
  background: var(--wui-calendar-date-picker-background-pressed);
  border-color: var(--wui-calendar-date-picker-border-brush-pressed);
}

/* 聚焦态:仅换 Background(Focused storyboard 只动 Background;边框保持) */
.wui-calendar-date-picker:not(.is-disabled) .wui-cdp-input:focus {
  background: var(--wui-calendar-date-picker-background-focused);
}

/* —— Disabled(Header / 背景 / 边框 / 文本 / Glyph 各自的 Disabled 前景)—— */
.wui-calendar-date-picker.is-disabled .wui-cdp-header {
  color: var(--wui-calendar-date-picker-header-foreground-disabled);
}

.wui-calendar-date-picker.is-disabled .wui-cdp-input {
  background: var(--wui-calendar-date-picker-background-disabled);
  border-color: var(--wui-calendar-date-picker-border-brush-disabled);
  cursor: default;
}

.wui-calendar-date-picker.is-disabled .wui-cdp-text {
  color: var(--wui-calendar-date-picker-text-foreground-disabled);
}

.wui-calendar-date-picker.is-disabled .wui-cdp-glyph {
  color: var(--wui-calendar-date-picker-calendar-glyph-foreground-disabled);
}

/* ======================================================================
 * 月视图弹层(CalendarView):背景 + 1px 边框;圆角/阴影来自 .wui-popup-layer
 * ====================================================================== */
.wui-cdp-layer {
  box-sizing: border-box;
  background: var(--wui-calendar-view-background);
  border: 1px solid var(--wui-calendar-view-border); /* CalendarView BorderThickness = 1 */
  color: var(--wui-calendar-view-foreground);
  user-select: none;
  -webkit-user-select: none;
}

.wui-cdp-layer:focus {
  outline: none; /* 焦点由日格 roving 承担,层根只做键盘事件宿主 */
}

/* —— 头部行:高 40;5* / 1* / 1*;NavigationButtonStyle FontSize 20 —— */
.wui-cdp-titlebar {
  display: grid;
  grid-template-columns: 5fr 1fr 1fr;
  height: 40px;
  align-items: stretch;
}

.wui-cdp-title {
  display: flex;
  align-items: center;
  padding-left: 12px; /* HeaderButton Padding 12,0,0,0 */
  font-size: 20px; /* NavigationButtonStyle FontSize = 20 */
  white-space: nowrap;
  overflow: hidden;
}

.wui-cdp-nav {
  border: none;
  margin: 0;
  padding: 0;
  background: transparent; /* CalendarViewNavigationButtonBackground */
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 20px;
  line-height: 1;
  color: inherit;
  cursor: pointer;
  border-radius: 4px;
}

.wui-cdp-nav:hover:not(:disabled) {
  color: var(--wui-calendar-view-navigation-button-foreground-pointer-over);
}

.wui-cdp-nav:active:not(:disabled) {
  color: var(--wui-calendar-view-navigation-button-foreground-pressed);
}

.wui-cdp-nav:disabled {
  color: var(--wui-calendar-view-navigation-button-foreground-disabled);
  cursor: default;
}

/* —— 周名行 / 日格行:高 38(周名行);同为 42px 列(40 格 + Margin 1),CaptionTextBlockStyle 12px —— */
.wui-cdp-weekdays,
.wui-cdp-days-row {
  display: grid;
  grid-template-columns: repeat(7, 42px);
}

.wui-cdp-weekdays {
  height: 38px;
  align-items: center;
}

.wui-cdp-weekday {
  text-align: center;
  font-size: var(--wui-tool-tip-content-theme-font-size); /* CaptionTextBlockStyle = 12px,取同值 token */
  color: var(--wui-calendar-view-calendar-item-foreground);
}

/* —— 日格:40×40 + Margin 1;状态圈(圆形)由内层 .wui-cdp-day-fill 承担,
     格底(方)留给 OutOfScope 背景(WinUI 即矩形填充)—— */
.wui-cdp-day {
  position: relative;
  width: 40px;
  height: 40px;
  margin: 1px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  cursor: pointer;
  outline: none;
}

.wui-cdp-day:focus-visible {
  outline: 2px solid var(--wui-calendar-view-focus-border); /* FocusBorderBrush */
  outline-offset: -2px;
}

.wui-cdp-day-fill {
  position: absolute;
  inset: 0;
  border: 2px solid transparent; /* CalendarItemBorderThickness = 2 */
  border-radius: 50%;
  background: transparent;
}

.wui-cdp-day-text {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding-bottom: 4px; /* CalendarViewDayItem Padding 0,0,0,4(源为约会条区,本文本位微上提) */
  color: var(--wui-calendar-view-calendar-item-foreground);
}

/* PointerOver:圆形圈 HoverBorderBrush */
.wui-cdp-day:not(.is-blackout):not(:disabled):hover .wui-cdp-day-fill {
  border-color: var(--wui-calendar-view-hover-border);
}

/* Pressed:圈 PressedBorderBrush + 文本 PressedForeground */
.wui-cdp-day:not(.is-blackout):not(:disabled):active .wui-cdp-day-fill {
  border-color: var(--wui-calendar-view-pressed-border);
}

.wui-cdp-day:not(.is-blackout):not(:disabled):active .wui-cdp-day-text {
  color: var(--wui-calendar-view-pressed-foreground);
}

/* Selected:圈 SelectedBorderBrush + 文本 SelectedForeground;hover/pressed 变体 */
.wui-cdp-day.is-selected .wui-cdp-day-fill {
  border-color: var(--wui-calendar-view-selected-border);
}

.wui-cdp-day.is-selected .wui-cdp-day-text {
  color: var(--wui-calendar-view-selected-foreground);
}

.wui-cdp-day.is-selected:not(:disabled):hover .wui-cdp-day-fill {
  border-color: var(--wui-calendar-view-selected-hover-border);
}

.wui-cdp-day.is-selected:not(:disabled):active .wui-cdp-day-fill {
  border-color: var(--wui-calendar-view-selected-pressed-border);
}

/* Today:强调色实心圆 + TodayForeground;与选中叠加时圈叠在实心上(WinUI 同呈两态) */
.wui-cdp-day.is-today .wui-cdp-day-fill {
  background: var(--wui-system-accent-color);
  border-color: transparent;
}

.wui-cdp-day.is-today .wui-cdp-day-text {
  color: var(--wui-calendar-view-today-foreground);
}

.wui-cdp-day.is-today.is-selected .wui-cdp-day-fill {
  border-color: var(--wui-calendar-view-selected-border);
}

/* OutOfScope(相邻月):方格底 + 弱化前景 */
.wui-cdp-day.is-out-of-scope {
  background: var(--wui-calendar-view-out-of-scope-background);
}

.wui-cdp-day.is-out-of-scope .wui-cdp-day-text {
  color: var(--wui-calendar-view-out-of-scope-foreground);
}

/* Blackout(范围外):黑障前景 + 中线划杠(源由 chrome 画划线,Web 用伪元素近似) */
.wui-cdp-day.is-blackout {
  cursor: default;
}

.wui-cdp-day.is-blackout .wui-cdp-day-text {
  color: var(--wui-calendar-view-blackout-foreground);
}

.wui-cdp-day.is-blackout .wui-cdp-day-text::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  top: calc(50% - 2px);
  height: 1px;
  background: currentColor;
}

/* —— 入场 / 离场(对照 WinUI 弹层淡入;离场快速淡出)—— */
.wui-calendar-date-picker-enter-active {
  animation: wui-flyout-in var(--wui-duration-normal) var(--wui-easing-standard) both;
}

.wui-calendar-date-picker-leave-active {
  animation: wui-fade-out var(--wui-duration-fast) var(--wui-easing-standard) both;
}
</style>
