<script lang="ts">
// CalendarView(WinUI CalendarView 迁移):类型与事件参数对外导出,供使用方与示例页引用。
/** 显示模式(WinUI CalendarViewDisplayMode):月视图 / 年视图 / 十年视图。 */
export type CalendarViewDisplayMode = 'Month' | 'Year' | 'Decade'

/** 选择模式(WinUI CalendarViewSelectionMode)。 */
export type CalendarViewSelectionMode = 'None' | 'Single' | 'Multiple'

/** selectedDatesChanged 事件参数(对应 WinUI CalendarViewSelectedDatesChangedEventArgs)。 */
export interface CalendarViewSelectedDatesChangedEventArgs {
  /** 本次新增到 SelectedDates 的日期(均为零点对齐的本地时间)。 */
  addedDates: Date[]
  /** 本次从 SelectedDates 移除的日期。 */
  removedDates: Date[]
}

/** 零点对齐(消去时/分/秒/毫秒,本地时区)。 */
function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

/** 宽松归一化:接受 Date / ISO 串 / 时间戳,失败返回 null(WinUI DateTimeOffset 的 Web 形态)。 */
function toDate(value: Date | string | number | undefined): Date | null {
  if (value === undefined) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed)
}

/** 单元格键:`年-月-日`(本地值,月为 0 基)。 */
function dayKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`
}

/** 同日判断(忽略时分秒)。 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  )
}

/** 加 N 个月并钳制「日」到目标月末(避免 1/31 + 1 月滚到 3 月)。 */
function addMonthsClamped(value: Date, months: number): Date {
  const year = value.getFullYear()
  const month = value.getMonth() + months
  const daysInTarget = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(value.getDate(), daysInTarget))
}

/** 加 N 天(纯本地日期运算)。 */
function addDays(value: Date, days: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days)
}

/**
 * 星期短名截短:WinUI 月视图表头用 Calendar 的 ShortestDayName(如 en-US 为 "Su/Mo"),Intl 无
 * 「最短」档;用 weekday:'short' 格式化后,拉丁字母结果截到 2 字符近似,非拉丁(中日韩等)保留全量。
 */
function shortenWeekDay(label: string): string {
  return /^[A-Za-z]/.test(label) && label.length > 2 ? label.slice(0, 2) : label
}
</script>

<script setup lang="ts">
// WinUI CalendarView 复刻。视觉与结构对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
// 中 TargetType="CalendarView" 的 CalendarViewRevealStyle(ControlTemplate:40px 头部行 + 38px 星期行 +
// CalendarPanel 月/年/十年三层视图、BackgroundLayer 用 BorderBrush 垫底形成格线、导航按钮字体 20、
// 箭头 glyph U+E0E4/U+E0E5);行为对照官方示例 CK/WinUI-Gallery/.../CalendarView/(SelectionMode /
// IsGroupLabelVisible / IsOutOfScopeEnabled / Language)与 CalendarView_Partial_*.cpp(三视图层级:
// 头部按钮下钻 Month→Year→Decade、单元点击回退、前后翻页、键盘方向键/Enter)。
// 颜色/字号一律 --wui-* token(theme.css 已含 --wui-calendar-view-* 全族,明暗主题自动跟随)。
// 动效(源逐键):
//   模式切换 = generic.xaml DisplayModeStates Transitions(L14486-14654):下钻(Month→Year、
//   Year→Decade)旧视图 scale 1→0.84 + Opacity→0 @233ms、新视图 scale 1.29→1 / Opacity 0→1
//   自 233ms 起至 733ms(KeySpline 0.1,0.9,0.2,1);回退(Year→Month、Decade→Year)镜像
//   (旧 →1.29、新自 0.84)。BackgroundLayer(L14513-14515 等)透明度 0 保持 250ms(线性)后以
//   (0.15,0.64,0.25,1) 淡入至 733ms,回退方向另有 0.84→1 缩放相;z 序随源固定 Month<Year<Decade。
//   前后翻页 = CalendarPanel 三面板 Orientation=Horizontal(CalendarView_Partial.cpp L651-679),
//   导航按钮经 ScrollToDateWithAnimation → ScrollViewer.ChangeViewWithOptionalAnimation
//   (CalendarView_Partial.cpp L1608)把面板水平 pan 一页:下一页 = 旧页左滑出 / 新页右滑入,
//   上一页镜像;源时长为平台 DManip 惯性动画(repo 无键值),Web 取 CalendarView 转换簇 233ms +
//   standard spline 近似(登记于报告)。头部淡入 167ms(L14447)不变。
import { computed, nextTick, ref, watch } from 'vue'
import '../styles/animations.css'

defineOptions({ name: 'WuiCalendarView', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 选择模式(WinUI SelectionMode):None 不可选 / Single 单选 / Multiple 多选。 */
    selectionMode?: CalendarViewSelectionMode
    /** 禁选日期集合(WinUI BlackoutDates);越界(min/max 之外)日期同规格禁选。 */
    blackoutDates?: Date[]
    /** 最小可选日期(WinUI MinDate;接受 Date / ISO 串 / 时间戳)。 */
    minDate?: Date | string | number | undefined
    /** 最大可选日期(WinUI MaxDate)。 */
    maxDate?: Date | string | number | undefined
    /** 每周第一天(WinUI FirstDayOfWeek;0 = 周日,与 JS getDay / WinUI DayOfWeek 对齐)。 */
    firstDayOfWeek?: number
    /** 是否高亮今天(WinUI IsTodayHighlighted):强调色圆底 + TodayForeground 文字。 */
    isTodayHighlighted?: boolean
    /** 月视图首日单元格显示月份组标签(WinUI IsGroupLabelVisible);1 月 1 日显示年份标签。 */
    isGroupLabelVisible?: boolean
    /** 是否渲染范围外(邻月)日期的灰态(WinUI IsOutOfScopeEnabled);false 时邻月按当月样式渲染。 */
    isOutOfScopeEnabled?: boolean
    /** 区域标签(WinUI Language):BCP-47 串,空串用运行时区域;驱动 Intl.DateTimeFormat。 */
    language?: string
    /** 禁用整控件(对照模板 Disabled 视觉状态:星期行变灰、交互关闭)。 */
    disabled?: boolean
    /** 前翻按钮无障碍名(WinUI 经资源本地化;Web 以 prop 开放,默认英文)。 */
    ariaLabelPrevious?: string
    /** 后翻按钮无障碍名。 */
    ariaLabelNext?: string
    /** 单元格描边色(WinUI CalendarItemBorderBrush);缺省用 --wui-calendar-view-calendar-item-reveal-border。 */
    calendarItemBorderBrush?: string | undefined
    /** 单元格底色(WinUI CalendarItemBackground);缺省用 --wui-calendar-view-calendar-item-background。 */
    calendarItemBackground?: string | undefined
    /** 今日文字色(WinUI TodayForeground);缺省用 --wui-calendar-view-today-foreground。 */
    todayForeground?: string | undefined
    /** 今日圆底色(WinUI 今日圆为强调色);缺省用 --wui-system-accent-color。 */
    todayBackground?: string | undefined
    /** 选中描边色(WinUI SelectedBorderBrush);缺省用 --wui-calendar-view-selected-border。 */
    selectedBorderBrush?: string | undefined
    /** 选中文字色(WinUI SelectedForeground);缺省用 --wui-calendar-view-selected-foreground。 */
    selectedForeground?: string | undefined
    /** 悬停描边色(WinUI HoverBorderBrush);缺省用 --wui-calendar-view-hover-border。 */
    hoverBorderBrush?: string | undefined
    /** 按下描边色(WinUI PressedBorderBrush);缺省用 --wui-calendar-view-pressed-border。 */
    pressedBorderBrush?: string | undefined
    /** 禁选文字色(WinUI BlackoutForeground);缺省用 --wui-calendar-view-blackout-foreground。 */
    blackoutForeground?: string | undefined
    /** 范围外文字色(WinUI OutOfScopeForeground);缺省用 --wui-calendar-view-out-of-scope-foreground。 */
    outOfScopeForeground?: string | undefined
    /** 范围外底色(WinUI OutOfScopeBackground);缺省用 --wui-calendar-view-out-of-scope-background。 */
    outOfScopeBackground?: string | undefined
  }>(),
  {
    selectionMode: 'Single',
    blackoutDates: () => [],
    minDate: undefined,
    maxDate: undefined,
    firstDayOfWeek: 0,
    isTodayHighlighted: true,
    isGroupLabelVisible: false,
    isOutOfScopeEnabled: true,
    language: '',
    disabled: false,
    ariaLabelPrevious: 'Previous',
    ariaLabelNext: 'Next',
    calendarItemBorderBrush: undefined,
    calendarItemBackground: undefined,
    todayForeground: undefined,
    todayBackground: undefined,
    selectedBorderBrush: undefined,
    selectedForeground: undefined,
    hoverBorderBrush: undefined,
    pressedBorderBrush: undefined,
    blackoutForeground: undefined,
    outOfScopeForeground: undefined,
    outOfScopeBackground: undefined,
  },
)

/** 当前显示模式,支持 v-model:displayMode(WinUI DisplayMode)。 */
const displayMode = defineModel<CalendarViewDisplayMode>('displayMode', { default: 'Month' })

/** 选中日期集合,支持 v-model:selectedDates(WinUI SelectedDates)。 */
const selectedDates = defineModel<Date[]>('selectedDates', { default: () => [] })

/** WinUI SelectedDatesChanged / DisplayModeChanged。 */
const emit = defineEmits<{
  selectedDatesChanged: [event: CalendarViewSelectedDatesChangedEventArgs]
  displayModeChanged: [mode: CalendarViewDisplayMode]
}>()

// —— 今天(组件实例级常量,零点对齐)——
const today = startOfDay(new Date())

// —— 有效边界(源 CoerceMinDate/CoerceMaxDate 语义:null 表示无界)——
const minDateValue = computed<Date | null>(() => toDate(props.minDate))
const maxDateValue = computed<Date | null>(() => toDate(props.maxDate))

// —— Intl 格式化器(随 language 变化重建;语言无关的星期/月份/头部文案)——
const locale = computed<string | undefined>(() => {
  const tag = props.language.trim()
  return tag === '' ? undefined : tag
})

const fmtLongMonthYear = computed(() => new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: 'long' }))
const fmtYear = computed(() => new Intl.DateTimeFormat(locale.value, { year: 'numeric' }))
const fmtMonthShort = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short' }))
const fmtMonthLong = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'long' }))
const fmtWeekDayShort = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }))
const fmtFullDate = computed(
  () => new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
)

/** 星期表头(按 firstDayOfWeek 轮转;2023-01-01 恰为周日,作固定锚点日期)。 */
const weekDayLabels = computed<string[]>(() => {
  const first = (((props.firstDayOfWeek % 7) + 7) % 7) as number
  const labels = Array.from({ length: 7 }, (_, i) => shortenWeekDay(fmtWeekDayShort.value.format(new Date(2023, 0, 1 + i))))
  return [...labels.slice(first), ...labels.slice(0, first)]
})

/** 年视图 12 个月短名。 */
const monthShortLabels = computed<string[]>(() =>
  Array.from({ length: 12 }, (_, m) => fmtMonthShort.value.format(new Date(2026, m, 1))),
)

/** 年视图单元完整名(aria-label 用)。 */
function monthLongLabel(year: number, month: number): string {
  return fmtMonthLong.value.format(new Date(year, month, 1))
}

// —— 视图锚点:始终取所显示月份的 1 日(年/十年视图由 year/decadeStart 推导)——
const viewDate = ref<Date>(new Date(today.getFullYear(), today.getMonth(), 1))

const viewYear = computed(() => viewDate.value.getFullYear())
const viewMonth = computed(() => viewDate.value.getMonth())
const decadeStart = computed(() => Math.floor(viewYear.value / 10) * 10)

const isMonthMode = computed(() => displayMode.value === 'Month')
const isYearMode = computed(() => displayMode.value === 'Year')
const isDecadeMode = computed(() => displayMode.value === 'Decade')

// —— 头部文案(Month:长月名+年;Year:年;Decade:"起 - 止")——
const headerText = computed<string>(() => {
  if (isMonthMode.value) return fmtLongMonthYear.value.format(viewDate.value)
  if (isYearMode.value) return fmtYear.value.format(viewDate.value)
  return `${fmtYear.value.format(new Date(decadeStart.value, 0, 1))} - ${fmtYear.value.format(new Date(decadeStart.value + 9, 0, 1))}`
})

// —— 月视图 6×7 单元格(源 CalendarPanel:固定 6 行,首格为 firstDayOfWeek 对齐的邻月日)——
interface CalendarDayCell {
  date: Date
  key: string
  /** 是否属于当前显示月份(邻月 = out of scope)。 */
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  /** blackout(禁选集合或 min/max 越界)。 */
  isBlackout: boolean
  /** 组标签(IsGroupLabelVisible 时:1 日显示月份名,1 月 1 日显示年份)。 */
  groupLabel: string | null
}

const normalizedFirstDayOfWeek = computed(() => (((props.firstDayOfWeek % 7) + 7) % 7) as number)

const selectedKeys = computed<Set<string>>(() => {
  const keys = new Set<string>()
  for (const value of selectedDates.value ?? []) {
    const normalized = toDate(value as Date)
    if (normalized !== null) keys.add(dayKey(normalized))
  }
  return keys
})

const blackoutKeys = computed<Set<string>>(() => {
  const keys = new Set<string>()
  for (const value of props.blackoutDates) {
    const normalized = toDate(value)
    if (normalized !== null) keys.add(dayKey(normalized))
  }
  return keys
})

function isBlackoutDay(date: Date): boolean {
  const min = minDateValue.value
  const max = maxDateValue.value
  return blackoutKeys.value.has(dayKey(date)) || (min !== null && date < min) || (max !== null && date > max)
}

const monthWeeks = computed<CalendarDayCell[][]>(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const offset = (first.getDay() - normalizedFirstDayOfWeek.value + 7) % 7
  const gridStart = addDays(first, -offset)
  const weeks: CalendarDayCell[][] = []
  for (let row = 0; row < 6; row++) {
    const week: CalendarDayCell[] = []
    for (let col = 0; col < 7; col++) {
      const date = addDays(gridStart, row * 7 + col)
      const inMonth = date.getMonth() === viewMonth.value
      const isToday = isSameDay(date, today)
      let groupLabel: string | null = null
      if (props.isGroupLabelVisible && date.getDate() === 1) {
        // 源 FirstOfMonthLabel(月份名)/ FirstOfYearDecadeLabel(1 月 1 日显示年份)
        groupLabel = date.getMonth() === 0 ? fmtYear.value.format(date) : fmtMonthShort.value.format(date)
      }
      week.push({
        date,
        key: dayKey(date),
        inMonth,
        isToday,
        isSelected: selectedKeys.value.has(dayKey(date)),
        isBlackout: isBlackoutDay(date),
        groupLabel,
      })
    }
    weeks.push(week)
  }
  return weeks
})

// —— 年/十年视图单元禁用:整个月份/年份区间与 [min, max] 无交集则禁选 ——
function isMonthUnitDisabled(year: number, month: number): boolean {
  const min = minDateValue.value
  const max = maxDateValue.value
  const unitStart = new Date(year, month, 1)
  const unitEnd = new Date(year, month + 1, 0)
  return (min !== null && unitEnd < min) || (max !== null && unitStart > max)
}

function isYearUnitDisabled(year: number): boolean {
  const min = minDateValue.value
  const max = maxDateValue.value
  const unitStart = new Date(year, 0, 1)
  const unitEnd = new Date(year, 11, 31)
  return (min !== null && unitEnd < min) || (max !== null && unitStart > max)
}

const decadeYears = computed<number[]>(() =>
  Array.from({ length: 10 }, (_, i) => decadeStart.value + i),
)

// —— 前后翻页可用性(源 TemplateSettings.HasMoreContentBefore/After:
//      按「相邻单元区间与 [min, max] 有交集」判定,与年/十年视图单元禁用同口径)——
const canGoPrevious = computed<boolean>(() => {
  const min = minDateValue.value
  if (min === null) return true
  if (isMonthMode.value) {
    return addMonthsClamped(viewDate.value, -1) >= new Date(min.getFullYear(), min.getMonth(), 1)
  }
  if (isYearMode.value) {
    // 上一年的 12/31 ≥ min ⟺ 上一年与范围有交集(按单元起点判会漏掉「min 在上一年年中」的情形)
    return new Date(viewYear.value - 1, 11, 31) >= min
  }
  return decadeStart.value - 10 >= Math.floor(min.getFullYear() / 10) * 10
})

const canGoNext = computed<boolean>(() => {
  const max = maxDateValue.value
  if (max === null) return true
  if (isMonthMode.value) {
    return addMonthsClamped(viewDate.value, 1) <= new Date(max.getFullYear(), max.getMonth(), 1)
  }
  if (isYearMode.value) {
    return new Date(viewYear.value + 1, 0, 1) <= max
  }
  return decadeStart.value + 10 <= Math.floor(max.getFullYear() / 10) * 10
})

function goPrevious(): void {
  if (!canGoPrevious.value || props.disabled) return
  if (isMonthMode.value) viewDate.value = addMonthsClamped(viewDate.value, -1)
  else if (isYearMode.value) viewDate.value = new Date(viewYear.value - 1, viewMonth.value, 1)
  else viewDate.value = new Date(decadeStart.value - 10, viewMonth.value, 1)
}

function goNext(): void {
  if (!canGoNext.value || props.disabled) return
  if (isMonthMode.value) viewDate.value = addMonthsClamped(viewDate.value, 1)
  else if (isYearMode.value) viewDate.value = new Date(viewYear.value + 1, viewMonth.value, 1)
  else viewDate.value = new Date(decadeStart.value + 10, viewMonth.value, 1)
}

// —— 视图切换动效状态(见文件头注释的源键值)——
const MODE_RANK: Record<CalendarViewDisplayMode, number> = { Month: 0, Year: 1, Decade: 2 }

/** 模式切换过渡名:下钻 = cv-mode-down(旧 0.84 出 / 新 1.29 入)、回退 = cv-mode-up(镜像)。 */
const modeFx = ref('')

/** 背景层(BackgroundLayer)重挂载计数:0 = 初始静置(源初态无动画);每次模式切换 +1 触发重现。 */
const modeFxTick = ref(0)

watch(displayMode, (mode, prev) => {
  modeFx.value = MODE_RANK[mode] > MODE_RANK[prev] ? 'cv-mode-down' : 'cv-mode-up'
  modeFxTick.value++
})

/** 前后翻页过渡名:下一页 = cv-nav-next(旧左出 / 新右入),上一页镜像。 */
const navFx = ref('')

// 视图锚点跨期变化(按钮 / 键盘翻页共用)→ 按移动方向取滑动过渡;模式联动切换时
// 整个视图经外层模式过渡重挂载,内层为初挂不播动画,不会叠播。
watch(viewDate, (next, prev) => {
  const nextIndex = next.getFullYear() * 12 + next.getMonth()
  const prevIndex = prev.getFullYear() * 12 + prev.getMonth()
  if (nextIndex === prevIndex) return
  navFx.value = nextIndex > prevIndex ? 'cv-nav-next' : 'cv-nav-prev'
})

/** 内层翻页过渡键:期间变化触发水平滑动(月 = 年-月;年/十年 = 起始年)。 */
const monthNavKey = computed(() => `${viewYear.value}-${viewMonth.value}`)
const yearNavKey = computed(() => viewYear.value)
const decadeNavKey = computed(() => decadeStart.value)

/** 头部按钮下钻(Month→Year→Decade;Decade 已是最上层,按钮禁用 —— 源 HasMoreViews)。 */
function drillDown(): void {
  if (props.disabled) return
  if (isMonthMode.value) setDisplayMode('Year')
  else if (isYearMode.value) setDisplayMode('Decade')
}

function setDisplayMode(mode: CalendarViewDisplayMode): void {
  if (displayMode.value === mode) return
  displayMode.value = mode
  emit('displayModeChanged', mode)
}

/** 年视图点击月份 → 回到该月的月视图(源 OnYearViewMenuItemClicked)。 */
function pickMonth(month: number): void {
  if (props.disabled || isMonthUnitDisabled(viewYear.value, month)) return
  viewDate.value = new Date(viewYear.value, month, 1)
  setDisplayMode('Month')
}

/** 十年视图点击年份 → 回到该年的年视图(源 OnDecadeViewMenuItemClicked)。 */
function pickYear(year: number): void {
  if (props.disabled || isYearUnitDisabled(year)) return
  viewDate.value = new Date(year, viewMonth.value, 1)
  setDisplayMode('Year')
}

// —— 选择(WinUI SelectedDatesChanged:Single 整表替换,Multiple 切换成员,Blackout 拒绝)——
function onDayClick(cell: CalendarDayCell): void {
  focusedDate.value = cell.date
  if (props.disabled || props.selectionMode === 'None' || cell.isBlackout) return

  const previous = (selectedDates.value ?? [])
    .map((value) => toDate(value as Date))
    .filter((value): value is Date => value !== null)

  let next: Date[]
  let added: Date[] = []
  let removed: Date[] = []

  if (props.selectionMode === 'Single') {
    // 单选:重复点击已选日期保持选中(WinUI 单选无反选)
    if (previous.some((value) => isSameDay(value, cell.date))) return
    removed = previous.filter((value) => !isSameDay(value, cell.date))
    added = [cell.date]
    next = [cell.date]
  } else {
    const existing = previous.find((value) => isSameDay(value, cell.date))
    if (existing !== undefined) {
      removed = [existing]
      next = previous.filter((value) => value !== existing)
    } else {
      added = [cell.date]
      next = [...previous, cell.date]
    }
  }

  selectedDates.value = next
  emit('selectedDatesChanged', { addedDates: added, removedDates: removed })
}

// —— 键盘(月视图:方向键移动焦点日期、Home/End 月首月末、PageUp/PageDown 翻月、Enter/Space 原生点击)——
const daysGridEl = ref<HTMLElement | null>(null)
const focusedDate = ref<Date>(today)

watch(monthWeeks, (weeks) => {
  // 焦点日期不在当前网格时回收:当月已选日期 → 今日 → 当月 1 日
  const keys = new Set(weeks.flat().map((cell) => cell.key))
  if (keys.has(dayKey(focusedDate.value))) return
  const inMonth = (selectedDates.value ?? [])
    .map((value) => toDate(value as Date))
    .find((value): value is Date => value !== null && isSameMonth(value, viewDate.value))
  if (inMonth !== undefined) focusedDate.value = inMonth
  else if (isSameMonth(today, viewDate.value)) focusedDate.value = today
  else focusedDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), 1)
}, { immediate: true })

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function isFocusedDay(cell: CalendarDayCell): boolean {
  return isSameDay(cell.date, focusedDate.value)
}

function focusDayCell(date: Date): void {
  void nextTick(() => {
    const target = daysGridEl.value?.querySelector<HTMLButtonElement>(`[data-key="${dayKey(date)}"]`)
    target?.focus()
  })
}

/** 把日期钳回 [minDate, maxDate](键盘翻月被月边界钳回时,保证焦点日期落在可选范围内)。 */
function clampDateToRange(date: Date): Date {
  const min = minDateValue.value
  const max = maxDateValue.value
  if (min !== null && date < min) return new Date(min)
  if (max !== null && date > max) return new Date(max)
  return date
}

function onGridKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const current = focusedDate.value
  let next: Date | null = null
  switch (event.key) {
    case 'ArrowRight':
      next = addDays(current, 1)
      break
    case 'ArrowLeft':
      next = addDays(current, -1)
      break
    case 'ArrowUp':
      next = addDays(current, -7)
      break
    case 'ArrowDown':
      next = addDays(current, 7)
      break
    case 'Home':
      next = new Date(viewYear.value, viewMonth.value, 1)
      break
    case 'End':
      next = new Date(viewYear.value, viewMonth.value + 1, 0)
      break
    case 'PageUp':
      next = addMonthsClamped(current, -1)
      break
    case 'PageDown':
      next = addMonthsClamped(current, 1)
      break
    default:
      return
  }
  event.preventDefault()

  // 焦点日期越出当前 42 格网格(邻月边缘继续外移、PageUp/PageDown 翻月)→ 视图自动翻月跟随,
  // 保证 roving tabindex 的目标格总被渲染;翻月目标钳制到 min/max 的月边界(与前后箭头同口径),
  // 被钳回当前月时再把焦点日期钳回 [min, max],确保目标格落在网格内(F1)。
  const gridKeys = new Set(monthWeeks.value.flat().map((cell) => cell.key))
  if (!gridKeys.has(dayKey(next))) {
    let monthStart = new Date(next.getFullYear(), next.getMonth(), 1)
    const min = minDateValue.value
    const max = maxDateValue.value
    if (min !== null && monthStart < new Date(min.getFullYear(), min.getMonth(), 1)) {
      monthStart = new Date(min.getFullYear(), min.getMonth(), 1)
    }
    if (max !== null && monthStart > new Date(max.getFullYear(), max.getMonth(), 1)) {
      monthStart = new Date(max.getFullYear(), max.getMonth(), 1)
    }
    viewDate.value = monthStart
    next = clampDateToRange(next)
  }
  focusedDate.value = next
  focusDayCell(next)
}

// —— 视觉画刷 prop → CSS 变量覆盖(缺省回落到 --wui-* token)——
const rootStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  if (props.calendarItemBorderBrush) style['--wui-cv-item-border'] = props.calendarItemBorderBrush
  if (props.calendarItemBackground) style['--wui-cv-item-background'] = props.calendarItemBackground
  if (props.todayForeground) style['--wui-cv-today-foreground'] = props.todayForeground
  if (props.todayBackground) style['--wui-cv-today-background'] = props.todayBackground
  if (props.selectedBorderBrush) style['--wui-cv-selected-border'] = props.selectedBorderBrush
  if (props.selectedForeground) style['--wui-cv-selected-foreground'] = props.selectedForeground
  if (props.hoverBorderBrush) style['--wui-cv-hover-border'] = props.hoverBorderBrush
  if (props.pressedBorderBrush) style['--wui-cv-pressed-border'] = props.pressedBorderBrush
  if (props.blackoutForeground) style['--wui-cv-blackout-foreground'] = props.blackoutForeground
  if (props.outOfScopeForeground) style['--wui-cv-out-of-scope-foreground'] = props.outOfScopeForeground
  if (props.outOfScopeBackground) style['--wui-cv-out-of-scope-background'] = props.outOfScopeBackground
  return style
})

const rootClass = computed(() => ({
  'is-disabled': props.disabled,
}))
</script>

<template>
  <div v-bind="$attrs" class="wui-calendar-view" :class="rootClass" :style="rootStyle" role="group">
    <!-- 头部行(RowDefinition 40):下钻按钮(5*)+ 前/后翻页箭头(* / *) -->
    <div class="cv-header">
      <button
        type="button"
        class="cv-header-button"
        :disabled="isDecadeMode || disabled"
        :aria-label="headerText"
        @click="drillDown"
      >
        <span :key="headerText" class="cv-header-text">{{ headerText }}</span>
      </button>
      <button
        type="button"
        class="cv-nav-button"
        :disabled="!canGoPrevious || disabled"
        :aria-label="ariaLabelPrevious"
        @click="goPrevious"
      >
        &#xE0E4;
      </button>
      <button
        type="button"
        class="cv-nav-button"
        :disabled="!canGoNext || disabled"
        :aria-label="ariaLabelNext"
        @click="goNext"
      >
        &#xE0E5;
      </button>
    </div>

    <!-- 三层视图(源 Views Grid:BackgroundLayer 垫 BorderBrush 底,单元格 margin 1 透出 2px 格线,
         Views 自带 Clip → overflow hidden 裁剪过渡期滑入/缩放的视图)-->
    <div class="cv-views">
      <!-- BackgroundLayer:模式切换时按源故事板重现(0→0.25s 保持→0.733s 淡入;回退向另有缩放相) -->
      <div
        :key="modeFxTick"
        class="cv-backdrop"
        :class="{
          'cv-backdrop--animate': modeFxTick > 0,
          'cv-backdrop--scale-in': modeFx === 'cv-mode-up',
        }"
        aria-hidden="true"
      ></div>

      <!-- 模式切换过渡(DisplayModeStates;z 序随源固定:Month 底 / Year 中 / Decade 顶)-->
      <Transition :name="modeFx">
        <!-- 月视图 -->
        <div v-if="isMonthMode" key="month" class="cv-view cv-view--month">
          <div class="cv-weekdays" role="row" aria-hidden="true">
            <span v-for="(label, i) in weekDayLabels" :key="`wd-${i}`" class="cv-weekday">
              {{ label }}
            </span>
          </div>
          <!-- 前后翻页:CalendarPanel 水平 pan(整页左出右入,键 = 年-月)-->
          <Transition :name="navFx">
            <div :key="monthNavKey" ref="daysGridEl" class="cv-days" role="grid" @keydown="onGridKeydown">
              <div v-for="(week, wi) in monthWeeks" :key="`w-${wi}`" role="row" class="cv-week-row">
                <div
                  v-for="cell in week"
                  :key="cell.key"
                  role="gridcell"
                  class="cv-cell"
                  :aria-selected="cell.isSelected ? true : undefined"
                >
                  <button
                    type="button"
                    class="cv-day"
                    :class="{
                      'is-out-of-scope': !cell.inMonth && isOutOfScopeEnabled,
                      'is-today': cell.isToday && isTodayHighlighted,
                      'is-selected': cell.isSelected,
                      'is-blackout': cell.isBlackout,
                    }"
                    :tabindex="isFocusedDay(cell) && !cell.isBlackout ? 0 : -1"
                    :aria-label="fmtFullDate.format(cell.date)"
                    :aria-current="cell.isToday && isTodayHighlighted ? 'date' : undefined"
                    :aria-disabled="cell.isBlackout || disabled ? true : undefined"
                    :data-key="cell.key"
                    @click="onDayClick(cell)"
                  >
                    <span v-if="cell.isToday && isTodayHighlighted" class="cv-day-today" aria-hidden="true"></span>
                    <span class="cv-day-number">{{ cell.date.getDate() }}</span>
                    <span v-if="cell.groupLabel" class="cv-group-label" aria-hidden="true">{{ cell.groupLabel }}</span>
                    <span v-if="cell.isBlackout" class="cv-blackout-line" aria-hidden="true"></span>
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 年视图:12 个月(源 m_colsInYearDecadeView = 4,4 列栅格)-->
        <div v-else-if="isYearMode" key="year" class="cv-view cv-view--year" role="group" aria-label="Year view">
          <Transition :name="navFx">
            <div :key="yearNavKey" class="cv-unit-grid">
              <button
                v-for="(label, mi) in monthShortLabels"
                :key="`m-${mi}`"
                type="button"
                class="cv-unit"
                :class="{ 'is-blackout': isMonthUnitDisabled(viewYear, mi), 'is-today-unit': today.getFullYear() === viewYear && today.getMonth() === mi }"
                :disabled="isMonthUnitDisabled(viewYear, mi) || disabled"
                :aria-label="monthLongLabel(viewYear, mi)"
                @click="pickMonth(mi)"
              >
                {{ label }}
              </button>
            </div>
          </Transition>
        </div>

        <!-- 十年视图:10 个年份(头部按钮在此层禁用,源 HasMoreViews = false)-->
        <div v-else key="decade" class="cv-view cv-view--decade" role="group" aria-label="Decade view">
          <Transition :name="navFx">
            <div :key="decadeNavKey" class="cv-unit-grid">
              <button
                v-for="year in decadeYears"
                :key="`y-${year}`"
                type="button"
                class="cv-unit"
                :class="{ 'is-blackout': isYearUnitDisabled(year), 'is-today-unit': today.getFullYear() === year }"
                :disabled="isYearUnitDisabled(year) || disabled"
                @click="pickYear(year)"
              >
                {{ year }}
              </button>
            </div>
          </Transition>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* —— 根:Background / BorderBrush / BorderThickness 1;MinViewWidth ≈ 7×(40+2)+2×2+2×1 = 300px —— */
.wui-calendar-view {
  display: inline-flex;
  flex-direction: column;
  min-width: 300px;
  color: var(--wui-calendar-view-foreground);
  background: var(--wui-calendar-view-background);
  border: 1px solid var(--wui-calendar-view-border);
}

/* 视觉画刷 prop 覆盖点(缺省值即 token 本身,prop 传入时由 :style 覆盖) */
.wui-calendar-view {
  --wui-cv-item-border: var(--wui-calendar-view-calendar-item-reveal-border);
  --wui-cv-item-background: var(--wui-calendar-view-calendar-item-background);
  --wui-cv-today-foreground: var(--wui-calendar-view-today-foreground);
  --wui-cv-today-background: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  --wui-cv-selected-border: var(--wui-calendar-view-selected-border);
  --wui-cv-selected-foreground: var(--wui-calendar-view-selected-foreground);
  --wui-cv-hover-border: var(--wui-calendar-view-hover-border);
  --wui-cv-pressed-border: var(--wui-calendar-view-pressed-border);
  --wui-cv-blackout-foreground: var(--wui-calendar-view-blackout-foreground);
  --wui-cv-out-of-scope-foreground: var(--wui-calendar-view-out-of-scope-foreground);
  --wui-cv-out-of-scope-background: var(--wui-calendar-view-out-of-scope-background);
}

/* —— 头部行(40px):下钻按钮 5* + 前后箭头各 *;NavigationButtonStyle FontSize 20 —— */
.cv-header {
  display: flex;
  align-items: stretch;
  height: 40px;
}

.cv-header-button {
  flex: 5 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 0 0 0 12px; /* HeaderButton Padding = 12,0,0,0 */
  font-family: inherit;
  font-size: 20px; /* NavigationButtonStyle FontSize = 20,theme.css 无对应字号 token(见 wiki) */
  color: var(--wui-calendar-view-foreground);
  text-align: left;
  background: var(--wui-calendar-view-navigation-button-background);
  border: none;
  cursor: pointer;
  overflow: hidden;
}

/* 头部文案切换淡入(源 HeaderButtonStates.ViewChanging:Opacity 0→1,167ms,generic.xaml L14441) */
.cv-header-text {
  animation: wui-calendar-view-header-in 167ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
  white-space: nowrap;
}

.cv-header-button:hover:not(:disabled) {
  color: var(--wui-calendar-view-navigation-button-foreground-pointer-over);
}

.cv-header-button:active:not(:disabled) {
  color: var(--wui-calendar-view-navigation-button-foreground-pressed);
}

.cv-nav-button {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1px; /* 源 PreviousButton/NextButton Padding = 1 */
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 20px; /* NavigationButtonStyle FontSize = 20 */
  color: var(--wui-calendar-view-foreground);
  background: var(--wui-calendar-view-navigation-button-background);
  border: none;
  cursor: pointer;
  user-select: none;
}

.cv-nav-button:hover:not(:disabled) {
  color: var(--wui-calendar-view-navigation-button-foreground-pointer-over);
}

.cv-nav-button:active:not(:disabled) {
  color: var(--wui-calendar-view-navigation-button-foreground-pressed);
}

.cv-header-button:disabled,
.cv-nav-button:disabled {
  color: var(--wui-calendar-view-navigation-button-foreground-disabled);
  cursor: default;
}

/* 系统焦点视觉:头/导航按钮(Button 族 FocusVisualMargin=-3)双环全在外;
   日格/月年格(CalendarViewDayItem FocusVisualMargin=-2,generic.xaml L14275)
   primary [0,2] 在元素外贴缘 + secondary [0,1] 在元素内 = 系统双环 */
.cv-header-button:focus-visible,
.cv-nav-button:focus-visible {
  outline: 2px solid var(--wui-calendar-view-focus-border);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.cv-day:focus-visible,
.cv-unit:focus-visible {
  outline: 2px solid var(--wui-calendar-view-focus-border);
  outline-offset: 0;
  box-shadow: inset 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* —— 视图层:BackgroundLayer 用 BorderBrush 垫底(移至 .cv-backdrop),单元格 margin 1 透出 2px 格线;
      源 Views Grid 自带 Clip → overflow hidden 裁剪平移 / 缩放过渡期的视图 —— */
.cv-views {
  position: relative;
  flex: 1;
  overflow: hidden;
}

/* 背景层(BackgroundLayer):静置恒显;模式切换时按源故事板重现 ——
   透明度 0 线性保持至 250ms,再以 KeySpline (0.15,0.64,0.25,1) 淡入至 733ms(L14513-14515 等);
   回退方向(Year→Month / Decade→Year)另有 BackgroundTransform 0.84→1 缩放(233ms 起,0.1,0.9,0.2,1)。 */
.cv-backdrop {
  position: absolute;
  inset: 0;
  background: var(--wui-calendar-view-border);
}

.cv-backdrop--animate {
  animation: cv-backdrop-opacity 733ms linear both;
}

.cv-backdrop--animate.cv-backdrop--scale-in {
  animation:
    cv-backdrop-opacity 733ms linear both,
    cv-backdrop-scale-in 733ms linear both;
}

/* 视图容器:模式切换经 <Transition> 双相过渡;z 序随源模板固定(MonthView 底 / YearView 中 / DecadeView 顶) */
.cv-view {
  position: relative;
}

.cv-view--month {
  z-index: 1;
}

.cv-view--year {
  z-index: 2;
}

.cv-view--decade {
  z-index: 3;
}

/* —— 模式切换双相(DisplayModeStates Transitions,generic.xaml L14486-14654)——
   下钻(Month→Year / Year→Decade):旧视图 scale 1→0.84 + Opacity→0 @233ms;
   新视图 scale 1.29→1、Opacity 0→1 自 233ms 至 733ms,KeySpline 0.1,0.9,0.2,1;
   回退(Year→Month / Decade→Year)镜像:旧视图 →1.29、新视图自 0.84。离场视图绝对定位铺满视图区。 */
.cv-mode-down-leave-active,
.cv-mode-up-leave-active {
  position: absolute;
  inset: 0;
}

.cv-mode-down-leave-active {
  animation: cv-mode-shrink-out 233ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
}

.cv-mode-down-enter-active {
  animation: cv-mode-grow-in 733ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
}

.cv-mode-up-leave-active {
  animation: cv-mode-grow-out 233ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
}

.cv-mode-up-enter-active {
  animation: cv-mode-shrink-in 733ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
}

/* —— 前后翻页水平滑动(源 CalendarPanel Orientation=Horizontal 按页 pan;月/年/十年同构)——
   下一页 = 旧页左滑出 / 新页右滑入;上一页镜像。两侧位移同曲线同步推进,拼成整幅平移条带
   (ChangeViewWithOptionalAnimation 的 DManip pan 等价;时长口径见脚本注释)。 */
.cv-nav-next-enter-active {
  animation: cv-slide-in-next 233ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
}

.cv-nav-next-leave-active {
  animation: cv-slide-out-next 233ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
}

.cv-nav-prev-enter-active {
  animation: cv-slide-in-prev 233ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
}

.cv-nav-prev-leave-active {
  animation: cv-slide-out-prev 233ms cubic-bezier(0.1, 0.9, 0.2, 1) both;
}

/* 离场页绝对定位(月视图让出星期行 38px;年/十年铺满),与进场页对齐成条带 */
.cv-days.cv-nav-next-leave-active,
.cv-days.cv-nav-prev-leave-active {
  position: absolute;
  top: 38px;
  right: 0;
  bottom: 0;
  left: 0;
}

.cv-unit-grid.cv-nav-next-leave-active,
.cv-unit-grid.cv-nav-prev-leave-active {
  position: absolute;
  inset: 0;
}

/* —— 星期行(38px;WeekDayNameStyle:Caption 12px 居中,Disabled 走 week-day-foreground-disabled)—— */
.cv-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  height: 38px;
  background: var(--wui-calendar-view-background);
}

.cv-weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--wui-tool-tip-content-theme-font-size); /* CaptionTextBlockStyle ≈ 12px(见 wiki) */
  font-weight: 600;
  color: var(--wui-calendar-view-calendar-item-foreground);
}

/* —— 日格网:6 行 × 7 列,DayItem MinHeight 40 + Margin 1(格线由 .cv-views 底色透出);
      role=row / gridcell 落在真实盒上,不用 display:contents(部分辅助技术会丢弃其角色映射)—— */
.cv-days {
  display: block;
}

.cv-week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

/* 日格外边距 = 源 CalendarViewDayItem Margin 1,由 wrapper 内边距承担 */
.cv-cell {
  display: block;
  padding: 1px;
}

.cv-day {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px; /* CalendarViewDayItem MinHeight 40 */
  padding: 0 0 4px; /* CalendarViewDayItem Padding = 0,0,0,4(组标签/禁用线的下留白) */
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size); /* DayItem = ControlContentThemeFontSize */
  color: var(--wui-calendar-view-calendar-item-foreground);
  background: var(--wui-cv-item-background);
  border: none;
  cursor: pointer;
  user-select: none;
}

/* 交互描边用 inset 阴影,避免边框参与布局(源 chrome 的 2px 内描边语义);
   文字色切换不作用于今日格(今日文字恒为 TodayForeground,源 Today×Hover/Pressed 语义) */
.wui-calendar-view:not(.is-disabled) .cv-day:not(.is-blackout):hover {
  box-shadow: inset 0 0 0 2px var(--wui-cv-hover-border);
}

.wui-calendar-view:not(.is-disabled) .cv-day:not(.is-blackout):not(.is-today):hover {
  color: var(--wui-cv-selected-foreground); /* 源 PointerOver 文字切 SelectedForeground */
}

.wui-calendar-view:not(.is-disabled) .cv-day:not(.is-blackout):active {
  box-shadow: inset 0 0 0 2px var(--wui-cv-pressed-border);
}

.wui-calendar-view:not(.is-disabled) .cv-day:not(.is-blackout):not(.is-today):active {
  color: var(--wui-calendar-view-pressed-foreground);
}

.cv-day.is-selected {
  box-shadow: inset 0 0 0 2px var(--wui-cv-selected-border);
  color: var(--wui-cv-selected-foreground);
}

.wui-calendar-view:not(.is-disabled) .cv-day.is-selected:hover {
  box-shadow: inset 0 0 0 2px var(--wui-calendar-view-selected-hover-border);
}

.wui-calendar-view:not(.is-disabled) .cv-day.is-selected:active:not(.is-today) {
  box-shadow: inset 0 0 0 2px var(--wui-calendar-view-selected-pressed-border);
  color: var(--wui-calendar-view-pressed-foreground);
}

/* 今日:强调色圆底 + TodayForeground(源 chrome Today 椭圆) */
.cv-day.is-today {
  color: var(--wui-cv-today-foreground);
}

.cv-day-today {
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: var(--wui-cv-today-background);
}

.cv-day-number {
  position: relative;
  z-index: 1;
  line-height: 1;
}

/* 范围外(邻月):OutOfScope 前景/底色(IsOutOfScopeEnabled = false 时不加类,按当月渲染) */
.cv-day.is-out-of-scope {
  color: var(--wui-cv-out-of-scope-foreground);
  background: var(--wui-cv-out-of-scope-background);
}

/* 禁选:BlackoutForeground + 中线(源 chrome blackout 横线);不可选但保持可聚焦 */
.cv-day.is-blackout {
  color: var(--wui-cv-blackout-foreground);
  cursor: default;
}

.cv-blackout-line {
  position: absolute;
  right: 8px;
  left: 8px;
  top: calc(50% - 1px);
  height: 2px;
  background: var(--wui-cv-blackout-foreground);
}

/* 月内组标签(FirstOfMonthLabel:FontSize 8、垂直 Top、水平 Center、
   Margin 0,2,0,0 —— 源 CalendarViewFirstOfMonthLabelMargin;FIX2 更正:原实现 bottom:2px 贴底,方向反了)。
   前景色不单独指定,继承 .cv-day 的状态色(源 chrome 的 main/label 两个 TextBlock 共用同一前景:
   今日格 → TodayForeground、邻月 → OutOfScopeForeground、禁选 → BlackoutForeground、选中 → SelectedForeground)。 */
.cv-group-label {
  position: absolute;
  top: 2px; /* 源 CalendarViewFirstOfMonthLabelMargin = 0,2,0,0(贴顶) */
  right: 0;
  left: 0;
  overflow: hidden;
  font-size: 8px;
  line-height: 1;
  text-align: center; /* 源 m_horizontalFirstOfMonthLabelAlignment = Center */
  white-space: nowrap;
}

/* —— 年/十年视图:4 列栅格(源 m_colsInYearDecadeView = 4),单元 MinHeight 40 —— */
.cv-unit-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 1px;
}

.cv-unit {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  margin: 1px;
  padding: 0;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size); /* MonthYearItem = ControlContentThemeFontSize */
  color: var(--wui-calendar-view-calendar-item-foreground);
  background: var(--wui-cv-item-background);
  border: none;
  cursor: pointer;
  user-select: none;
}

.wui-calendar-view:not(.is-disabled) .cv-unit:not(.is-blackout):hover {
  box-shadow: inset 0 0 0 2px var(--wui-cv-hover-border);
  color: var(--wui-cv-selected-foreground);
}

.wui-calendar-view:not(.is-disabled) .cv-unit:not(.is-blackout):active {
  box-shadow: inset 0 0 0 2px var(--wui-cv-pressed-border);
  color: var(--wui-calendar-view-pressed-foreground);
}

/* 当前「今天所在」月份/年份单元:强调色描边(源 CalendarViewItem IsToday 圆环的近似) */
.cv-unit.is-today-unit:not(.is-blackout) {
  box-shadow: inset 0 0 0 2px var(--wui-cv-selected-border);
  color: var(--wui-cv-selected-foreground);
}

.cv-unit.is-blackout {
  color: var(--wui-cv-blackout-foreground);
  cursor: default;
}

/* —— 禁用整控件:星期行变灰(源 CommonStates.Disabled)+ 关闭交互 —— */
.wui-calendar-view.is-disabled .cv-weekday {
  color: var(--wui-calendar-view-week-day-foreground-disabled);
}

.wui-calendar-view.is-disabled .cv-days,
.wui-calendar-view.is-disabled .cv-unit-grid {
  pointer-events: none;
}

/* —— 动画关键帧(时长/曲线逐键取自 generic.xaml,见各规则注释;token 表在 animations.css,
      入口未引入全局,故以字面量书写,值与源 KeyTime / KeySpline 一一对应)—— */
@keyframes wui-calendar-view-header-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* BackgroundLayer 透明度:0 线性保持至 250ms(34.107% = 250/733)→ (0.15,0.64,0.25,1) 淡入至 733ms */
@keyframes cv-backdrop-opacity {
  0% {
    opacity: 0;
    animation-timing-function: linear;
  }

  34.107% {
    opacity: 0;
    animation-timing-function: cubic-bezier(0.15, 0.64, 0.25, 1);
  }

  100% {
    opacity: 1;
  }
}

/* BackgroundTransform(回退向):scale 1 →(离散 0.84 @233ms)→ 1 @733ms,spline 0.1,0.9,0.2,1 */
@keyframes cv-backdrop-scale-in {
  0% {
    transform: scale(1);
    animation-timing-function: linear;
  }

  31.786% {
    transform: scale(0.84);
    animation-timing-function: cubic-bezier(0.1, 0.9, 0.2, 1);
  }

  100% {
    transform: scale(1);
  }
}

/* 下钻出场(旧视图):scale 1→0.84 + 淡出,233ms */
@keyframes cv-mode-shrink-out {
  from {
    opacity: 1;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(0.84);
  }
}

/* 下钻入场(新视图):scale 1.29 保持至 233ms(31.786%)→ 1 @733ms,同步淡入 */
@keyframes cv-mode-grow-in {
  0% {
    opacity: 0;
    transform: scale(1.29);
    animation-timing-function: linear;
  }

  31.786% {
    opacity: 0;
    transform: scale(1.29);
    animation-timing-function: cubic-bezier(0.1, 0.9, 0.2, 1);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 回退出场(旧视图):scale 1→1.29 + 淡出,233ms(源 Year→Month 的 YearViewTransform) */
@keyframes cv-mode-grow-out {
  from {
    opacity: 1;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(1.29);
  }
}

/* 回退入场(新视图):scale 0.84 保持至 233ms → 1 @733ms,同步淡入 */
@keyframes cv-mode-shrink-in {
  0% {
    opacity: 0;
    transform: scale(0.84);
    animation-timing-function: linear;
  }

  31.786% {
    opacity: 0;
    transform: scale(0.84);
    animation-timing-function: cubic-bezier(0.1, 0.9, 0.2, 1);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 前后翻页:整页条带平移(下一页:新页自右 +100% 入、旧页向左 -100% 出;上一页镜像) */
@keyframes cv-slide-in-next {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
}

@keyframes cv-slide-out-next {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-100%);
  }
}

@keyframes cv-slide-in-prev {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(0);
  }
}

@keyframes cv-slide-out-prev {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(100%);
  }
}
</style>
