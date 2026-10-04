<script setup lang="ts">
// DatePicker —— WinUI DatePicker 的 Web 复刻(收起字段 + 点击弹出三列 LoopingSelector 飞出层)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   - TargetType="DatePicker"(L8668 起)收起态:
//     · FlyoutButton = 单行字段按钮,内嵌 3 段文本(月/日/年)+ 2 条 2px 分割线;
//       按钮 MinWidth 296(DatePickerThemeMinWidth)、MaxWidth 456(DatePickerThemeMaxWidth)、
//       ContentPresenter BorderThickness 2、圆角 ControlCornerRadius(4px);
//       文本内边距 DatePickerFlyoutPresenterItemPadding 0,3,0,6(月列 9,3,0,6 + Margin 1,0,0,0),
//       月列 TextAlignment Left、日/年列 Center;
//       HasNoDate 态三段前景转 TextControlPlaceholderForeground;
//       按钮各态画刷 DatePickerButtonBackground/BorderBrush/Foreground ×
//       Normal/PointerOver/Pressed/Disabled + Focused 组;
//       Header 边距 DatePickerTopHeaderMargin 0,0,0,4。
//   - TargetType="DatePickerFlyoutPresenter"(L12801 起)弹出层:
//     · Width/MinWidth 296、BorderThickness 1(DateTimeFlyoutBorderThickness)、
//       圆角 OverlayCornerRadius(8px)、Padding 0(DateTimeFlyoutBorderPadding)、MaxHeight 398;
//     · 三列宽 78*/132*/78*(日/月/年)+ 两条 2px DatePickerFlyoutPresenterSpacerFill 分割线;
//       中央 DatePickerFlyoutPresenterHighlightFill 高亮带 40(跨全部列)、项高 40、项内边距 0,3,0,6(月列 9,3,0,6);
//     · AcceptDismissHostGrid 高 41(DatePickerFlyoutPresenterAcceptDismissHostGridHeight):
//       顶部 2px 分割线 + Accept(E8FB)/ Dismiss(E711)各占 1*,FontSize 16,
//       DateTimePickerFlyoutButtonStyle(透明底 + HighlightListLow/Medium 的 hover/pressed)。
//   - LoopingSelector 资源(L13102 起):上下展开钮 Height 22、FontSize 8、
//     码点 E70E(上)/E70D(下)、底色 LoopingSelectorButtonBackground,默认 Collapsed、
//     PointerOver 才显示;项前景/选中前景/悬停/按压底(LoopingSelectorItem* 资源)。
// 颜色/字号一律取 src/styles/theme.css 的 --wui-* token(本次启用原先未用的
// --wui-date-picker-button-* 与 --wui-date-time-picker-flyout-button-*);
// 弹层动效取 popup.css 基建(FlyoutBase 通道 50px 方向位移组,MR1/A3)。
import { computed, nextTick, reactive, ref, useAttrs, useId, watch } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import '../styles/popup.css'

defineOptions({ name: 'WuiDatePicker', inheritAttrs: false })

// —— Props(属性名跟随 WinUI camelCase)——
const props = withDefaults(
  defineProps<{
    /** 选择器上方标头文本(WinUI Header);为空时不渲染。 */
    header?: string
    /** 是否显示年列(WinUI YearVisible)。 */
    yearVisible?: boolean
    /** 是否显示日列(WinUI DayVisible)。 */
    dayVisible?: boolean
    /** 是否显示月列(WinUI MonthVisible)。 */
    monthVisible?: boolean
    /** 可选的最小年份(WinUI MinYear,按年粒度约束年列)。 */
    minYear?: number
    /** 可选的最大年份(WinUI MaxYear,按年粒度约束年列)。 */
    maxYear?: number
    /** 月列显示格式(WinUI MonthFormat),支持 {month.full|abbreviated|numeric|integer|integer(2)}。 */
    monthFormat?: string
    /** 日列显示格式(WinUI DayFormat),支持 {day.integer|integer(2)} 与 {dayofweek.abbreviated|full} 组合。 */
    dayFormat?: string
    /** 年列显示格式(WinUI YearFormat),支持 {year.full|abbreviated}。 */
    yearFormat?: string
    /** 空值态(date 为 null)时三列显示的占位日期;缺省为今天,年份收敛进 min/max 区间。 */
    placeholderDate?: Date
    /** 禁用选择器(WinUI IsEnabled=false)。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    yearVisible: true,
    dayVisible: true,
    monthVisible: true,
    minYear: 1900,
    maxYear: 2128,
    monthFormat: '{month.full}',
    dayFormat: '{day.integer}',
    yearFormat: '{year.full}',
    placeholderDate: () => new Date(),
    disabled: false,
  },
)

// —— Date 双向绑定(WinUI Date,可为 null 表示未选择)——
const date = defineModel<Date | null>('date', { default: null })

// —— 弹出层开关(WinUI DatePickerFlyout.IsOpen),支持 v-model:is-open ——
const isOpen = defineModel<boolean>('isOpen', { default: false })

// —— 事件(WinUI DateChanged + 弹出层 Opened / Closed)——
const emit = defineEmits<{
  dateChanged: [newDate: Date | null, oldDate: Date | null]
  opened: []
  closed: []
}>()

// —— $attrs 透传(单根,inheritAttrs: false)——
const attrs = useAttrs()

// 实例唯一 id 前缀(aria-activedescendant/option id 用;多实例不串号)
const uid = useId()

// —— 结构常量(源:DatePickerFlyoutPresenterItemHeight/HighlightHeight = 40)——
const ITEM_HEIGHT = 40
/** 可见行数:窗口高度 = 3 × 40(中央选中行 + 上下各一行相邻项)。 */
const WINDOW_HEIGHT = ITEM_HEIGHT * 3
/** 拖拽判定阈值:超过视为拖拽,松手吸附;否则当作点击。 */
const DRAG_THRESHOLD_PX = 5

type ColumnKey = 'month' | 'day' | 'year'

interface ColumnSpec {
  key: ColumnKey
  /** 源模板列宽比例:月 132* / 日 78* / 年 78*(generic.xaml MonthColumn/DayColumn/YearColumn)。 */
  flexGrow: number
  ariaLabel: string
  items: string[]
  selectedIndex: number
  /** 月列左对齐并带 9px 内边距(DatePickerFlyoutPresenterMonthPadding / DatePickerHostMonthPadding)。 */
  leftAlign: boolean
}

// —— 选中值(内部态,始终有定义;date 为 null 时显示 placeholder 值)——
const selYear = ref(0)
const selMonth = ref(1)
const selDay = ref(1)

// —— 年份区间(防御 min/max 颠倒)——
const yearMin = computed(() => Math.min(props.minYear, props.maxYear))
const yearMax = computed(() => Math.max(props.minYear, props.maxYear))

function clampYear(year: number): number {
  return Math.min(yearMax.value, Math.max(yearMin.value, year))
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

// —— 格式模板(WinUI 日期格式模板子集)——
function formatToken(token: string, ctx: { year: number; month: number; day: number }): string {
  const sample = (options: Intl.DateTimeFormatOptions): string =>
    new Date(ctx.year, ctx.month - 1, ctx.day, 12).toLocaleDateString(undefined, options)
  switch (token) {
    case 'month.full':
      return sample({ month: 'long' })
    case 'month.abbreviated':
      return sample({ month: 'short' })
    case 'month.numeric':
    case 'month.integer':
      return String(ctx.month)
    case 'month.integer(2)':
      return pad2(ctx.month)
    case 'day.integer':
      return String(ctx.day)
    case 'day.integer(2)':
      return pad2(ctx.day)
    case 'dayofweek.abbreviated':
      return sample({ weekday: 'short' })
    case 'dayofweek.full':
      return sample({ weekday: 'long' })
    case 'year.full':
      return String(ctx.year)
    case 'year.abbreviated':
      return pad2(ctx.year % 100)
    default:
      // 未识别的模板段原样保留,便于发现拼写问题。
      return `{${token}}`
  }
}

function formatTemplate(tpl: string, ctx: { year: number; month: number; day: number }): string {
  return tpl.replace(/\{([^{}]+)\}/g, (_all, token: string) => formatToken(token.trim(), ctx))
}

// —— 空值态占位日期(今天/调用方指定,年份收敛进区间)——
const placeholder = computed(() => {
  const raw = props.placeholderDate
  const year = clampYear(raw.getFullYear())
  const month = raw.getMonth() + 1
  const day = Math.min(raw.getDate(), daysInMonth(year, month))
  return { year, month, day }
})

// —— 三列定义(月/日/年,列序与可见性随 props)——
const columns = computed<ColumnSpec[]>(() => {
  const year = selYear.value
  const month = selMonth.value
  const day = Math.min(selDay.value, daysInMonth(year, month))
  const list: ColumnSpec[] = []
  if (props.monthVisible) {
    list.push({
      key: 'month',
      flexGrow: 132,
      ariaLabel: 'Month',
      items: Array.from({ length: 12 }, (_v, i) =>
        formatTemplate(props.monthFormat, { year, month: i + 1, day: 1 }),
      ),
      selectedIndex: month - 1,
      leftAlign: true,
    })
  }
  if (props.dayVisible) {
    const count = daysInMonth(year, month)
    list.push({
      key: 'day',
      flexGrow: 78,
      ariaLabel: 'Day',
      items: Array.from({ length: count }, (_v, i) =>
        formatTemplate(props.dayFormat, { year, month, day: i + 1 }),
      ),
      selectedIndex: Math.min(day, count) - 1,
      leftAlign: false,
    })
  }
  if (props.yearVisible) {
    const count = yearMax.value - yearMin.value + 1
    list.push({
      key: 'year',
      flexGrow: 78,
      ariaLabel: 'Year',
      items: Array.from({ length: count }, (_v, i) =>
        formatTemplate(props.yearFormat, { year: yearMin.value + i, month, day }),
      ),
      selectedIndex: clampYear(year) - yearMin.value,
      leftAlign: false,
    })
  }
  return list
})

/**
 * 收起字段 / 飞出层共用的列轨道模板:
 * `<比例>fr 2px <比例>fr …`,2px 即列间分割线(FlyoutButtonContentGrid 的 Auto 分隔列,宽 2)。
 */
const columnsTemplate = computed(() => columns.value.map((col) => `${col.flexGrow}fr`).join(' 2px '))

// —— 收起字段三段文本(取各列当前选中项文本,与飞出层列项完全一致)——
const segments = computed(() =>
  columns.value.map((col) => ({
    key: col.key,
    text: col.items[col.selectedIndex] ?? '',
    leftAlign: col.leftAlign,
    flexGrow: col.flexGrow,
  })),
)

// —— 归一工具:任意年月日钳制进 min/max 与当月天数(本地 12:00,规避 DST/UTC 日界)——
function clampToValidDate(year: number, month: number, day: number): Date {
  const y = clampYear(year)
  const m = Math.min(12, Math.max(1, month))
  const d = Math.min(Math.max(1, day), daysInMonth(y, m))
  return new Date(y, m - 1, d, 12)
}

/** 年月日三元组相等判定(同值不同 Date 对象/清空 null 均视为未变化)。 */
function isSameDay(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// 交互路径(commit)写回模型前置位,模型 watcher 见到即跳过二次 emit,实现两路去重。
let suppressModelWatchEmit = false

// —— 提交(用户交互路径:滚轮/箭头/键盘/点击/拖拽吸附;写回模型并触发事件)——
function commit(next: { year: number; month: number; day: number }): void {
  const built = clampToValidDate(next.year, next.month, next.day)
  selYear.value = built.getFullYear()
  selMonth.value = built.getMonth() + 1
  selDay.value = built.getDate()
  const current = date.value
  if (isSameDay(built, current)) return
  suppressModelWatchEmit = true
  date.value = built
  emit('dateChanged', built, current)
}

// —— 外部赋值同步(仅刷新三列;事件统一由 onModelChange 负责)——
function syncFromModel(): void {
  const value = date.value
  const source =
    value !== null
      ? { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() }
      : placeholder.value
  selYear.value = clampYear(source.year)
  selMonth.value = Math.min(12, Math.max(1, source.month))
  selDay.value = Math.min(source.day, daysInMonth(selYear.value, selMonth.value))
}

// —— 模型变化统一入口:程序化赋值(v-model)同样触发 dateChanged(WinUI DateChanged 语义),
// 与交互路径经 suppressModelWatchEmit 去重;越界值先收敛回区间再触发(源 MinYear/MaxYear 行为)——
function onModelChange(value: Date | null, oldValue: Date | null | undefined): void {
  if (suppressModelWatchEmit) {
    suppressModelWatchEmit = false
    syncFromModel()
    return
  }
  let effective = value
  if (value !== null) {
    const built = clampToValidDate(value.getFullYear(), value.getMonth() + 1, value.getDate())
    if (built.getTime() !== value.getTime()) {
      // 越界模型收敛:写回钳制值(置位去重标记,收敛本身不二次触发)
      suppressModelWatchEmit = true
      date.value = built
      effective = built
    }
  }
  syncFromModel()
  // oldValue === undefined 仅出现在 immediate 首跑(挂载),不触发事件
  if (oldValue !== undefined && !isSameDay(effective, oldValue)) {
    emit('dateChanged', effective, oldValue)
  }
}

watch(date, onModelChange, { immediate: true })
// min/max/placeholder 变化:把被挤出区间/越界的模型收敛掉(与程序化赋值同语义;空值仅刷新三列)
watch([yearMin, yearMax, () => props.placeholderDate], () => {
  onModelChange(date.value, date.value)
})

// —— 步进/选中(滚轮、箭头、键盘、点击、拖拽吸附共用)——
function stepColumn(key: ColumnKey, delta: number): void {
  if (props.disabled) return
  if (key === 'month') commit({ year: selYear.value, month: selMonth.value + delta, day: selDay.value })
  else if (key === 'day') commit({ year: selYear.value, month: selMonth.value, day: selDay.value + delta })
  else commit({ year: selYear.value + delta, month: selMonth.value, day: selDay.value })
}

function selectIndex(key: ColumnKey, index: number): void {
  if (key === 'month') commit({ year: selYear.value, month: index + 1, day: selDay.value })
  else if (key === 'day') commit({ year: selYear.value, month: selMonth.value, day: index + 1 })
  else commit({ year: yearMin.value + index, month: selMonth.value, day: selDay.value })
}

const hasDate = computed(() => date.value !== null)

/* -------------------------------------------------------------------------
 * 弹出层:bottom 对齐锚左缘(WinUI 飞出层自字段下方垂直展开)+ light dismiss 三手势
 * ---------------------------------------------------------------------- */

const { anchorRef } = usePopupAnchor()
const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: 'bottom-start',
  offset: { mainAxis: 4 },
  onOutsidePress: () => closeFlyout(false, false),
  onEscape: () => closeFlyout(true, false),
  onAnchorScroll: () => closeFlyout(false, false), // WinUI:锚滚动链滚动即 light dismiss(CalendarDatePicker 同约定)
})

/** 打开瞬间的值快照(Dismiss 按钮 = 取消,回滚到该值)。 */
let openedSnapshot: Date | null = null
/** 飞出层是否由键盘打开(决定是否显示列焦点框,对齐 WinUI 仅键盘焦点可见焦点视觉)。 */
const keyboardOpened = ref(false)

function openFlyout(byKeyboard = false): void {
  if (props.disabled || isOpen.value) return
  openedSnapshot = date.value === null ? null : new Date(date.value.getTime())
  keyboardOpened.value = byKeyboard
  isOpen.value = true
  void nextTick(() => {
    update()
    layerRef.value?.focus()
    focusColumn(columns.value[0]?.key)
    emit('opened')
  })
}

/**
 * 关闭飞出层。
 * @param restoreFocus 是否把焦点还给收起字段(Escape / 确认走 true)
 * @param revert 是否回滚到打开时的值(Dismiss 按钮 = 取消)
 */
function closeFlyout(restoreFocus: boolean, revert: boolean): void {
  if (!isOpen.value) return
  isOpen.value = false
  if (revert) {
    suppressModelWatchEmit = false
    date.value = openedSnapshot === null ? null : new Date(openedSnapshot.getTime())
    syncFromModel()
  }
  if (restoreFocus) anchorRef.value?.focus()
  emit('closed')
}

// 禁用即收起
watch(
  () => props.disabled,
  (value) => {
    if (value) closeFlyout(false, false)
  },
)

/** 收起字段:点击开关(键盘触发的 click detail===0);Enter/Space 由原生 button click 覆盖,↓/↑ 显式开。 */
function onFieldClick(event: MouseEvent): void {
  if (props.disabled) return
  if (isOpen.value) closeFlyout(false, false)
  else openFlyout(event.detail === 0)
}

function onFieldKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  if (event.ctrlKey || event.altKey || event.metaKey) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    openFlyout(true)
  }
}

/** 打开后落焦到某一列(listbox),让 ↑/↓/PageUp/PageDown/Home/End 立即可用。 */
function focusColumn(key: ColumnKey | undefined): void {
  if (key === undefined) return
  const column = layerRef.value?.querySelector<HTMLElement>(`[data-col="${key}"]`)
  column?.focus()
}

/* -------------------------------------------------------------------------
 * 飞出层内部交互:滚轮 / 箭头 / 拖拽 / 键盘 / 点选(沿用原三列滚轮交互)
 * ---------------------------------------------------------------------- */

// —— 滚轮:按 40px 一档累积,步进期间禁用页面滚动 ——
let wheelAccum = 0
let wheelTimer: ReturnType<typeof setTimeout> | undefined

function onWheel(event: WheelEvent, key: ColumnKey): void {
  if (props.disabled) return
  event.preventDefault()
  const dy = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY // 行模式(Firefox)折算 px
  wheelAccum += dy
  let steps = 0
  while (Math.abs(wheelAccum) >= ITEM_HEIGHT) {
    steps += wheelAccum > 0 ? 1 : -1
    wheelAccum -= wheelAccum > 0 ? ITEM_HEIGHT : -ITEM_HEIGHT
  }
  for (let i = 0; i < Math.abs(steps); i += 1) stepColumn(key, steps > 0 ? 1 : -1)
  clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => {
    wheelAccum = 0
  }, 150)
}

// —— 键盘(每列 listbox 可聚焦,方向键步进)——
function onColumnKeydown(event: KeyboardEvent, key: ColumnKey): void {
  if (props.disabled) return
  const col = columns.value.find((entry) => entry.key === key)
  if (!col) return
  switch (event.key) {
    case 'ArrowUp':
      stepColumn(key, -1)
      break
    case 'ArrowDown':
      stepColumn(key, 1)
      break
    case 'PageUp':
      stepColumn(key, -5)
      break
    case 'PageDown':
      stepColumn(key, 5)
      break
    case 'Home':
      selectIndex(key, 0)
      break
    case 'End':
      selectIndex(key, col.items.length - 1)
      break
    case 'Enter':
    case ' ':
      // WinUI:在列上回车/空格 = 确认当前项并收起
      event.preventDefault()
      closeFlyout(true, false)
      return
    default:
      return // 未命中的按键交还浏览器
  }
  event.preventDefault()
}

/** 层内键盘兜底:Escape 收起(常规路径由 usePopupLayer 栈顶收口);Tab = light dismiss。 */
function onLayerKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeFlyout(true, false)
  } else if (event.key === 'Tab') {
    closeFlyout(false, false)
  }
}

// —— 拖拽(触摸/鼠标按住上下拖,松手按最近项吸附)——
const drag = reactive({
  key: null as ColumnKey | null,
  pointerId: -1,
  startY: 0,
  dy: 0,
  moved: false,
})
let suppressClickUntil = 0

function stripBaseOffset(col: ColumnSpec): number {
  return (WINDOW_HEIGHT - ITEM_HEIGHT) / 2 - col.selectedIndex * ITEM_HEIGHT
}

function stripStyle(col: ColumnSpec): Record<string, string> {
  const base = stripBaseOffset(col)
  if (drag.key === col.key) {
    return { transform: `translateY(${base + drag.dy}px)`, transition: 'none' }
  }
  return { transform: `translateY(${base}px)` }
}

function itemOpacity(col: ColumnSpec, index: number): number {
  const drifting = drag.key === col.key ? -drag.dy / ITEM_HEIGHT : 0
  const distance = Math.abs(index - (col.selectedIndex + drifting))
  if (distance <= 0.5) return 1
  return distance <= 1.5 ? 0.6 : 0.35
}

function onPointerDown(event: PointerEvent, key: ColumnKey): void {
  if (props.disabled || !event.isPrimary || event.button !== 0) return
  const col = columns.value.find((entry) => entry.key === key)
  if (!col) return
  drag.key = key
  drag.pointerId = event.pointerId
  drag.startY = event.clientY
  drag.dy = 0
  drag.moved = false
  // 不在 pointerdown 立即 setPointerCapture:捕获会把合成 click 的目标改成滚动窗口,
  // 令列项自身的 click 永不触发(点选失效);判定为拖拽后才捕获(见 onPointerMove)。
}

function onPointerMove(event: PointerEvent): void {
  if (drag.key === null || event.pointerId !== drag.pointerId) return
  drag.dy = event.clientY - drag.startY
  if (!drag.moved && Math.abs(drag.dy) > DRAG_THRESHOLD_PX) {
    drag.moved = true
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
}

function endDrag(): void {
  const key = drag.key
  if (key === null) return
  const moved = drag.moved
  const dy = drag.dy
  drag.key = null
  drag.pointerId = -1
  drag.dy = 0
  drag.moved = false
  if (!moved) return
  suppressClickUntil = Date.now() + 400
  const col = columns.value.find((entry) => entry.key === key)
  if (!col) return
  const target = Math.round((stripBaseOffset(col) + dy - (WINDOW_HEIGHT - ITEM_HEIGHT) / 2) / -ITEM_HEIGHT)
  const clamped = Math.min(col.items.length - 1, Math.max(0, target))
  if (clamped !== col.selectedIndex) selectIndex(key, clamped)
}

function onPointerUp(event: PointerEvent): void {
  if (drag.key === null || event.pointerId !== drag.pointerId) return
  endDrag()
}

function onPointerCancel(event: PointerEvent): void {
  if (drag.key === null || event.pointerId !== drag.pointerId) return
  // 取消:回弹到当前选中项,不提交。
  drag.key = null
  drag.pointerId = -1
  drag.dy = 0
  drag.moved = false
  suppressClickUntil = Date.now() + 400
}

/** 点选列项:提交并收起(WinUI 飞出层内点选即生效;确认/取消见 Accept / Dismiss)。 */
function onItemClick(key: ColumnKey, index: number): void {
  if (props.disabled) return
  if (Date.now() < suppressClickUntil) return // 拖拽松手后的合成 click,吞掉
  selectIndex(key, index)
  closeFlyout(true, false)
}

function optionId(key: ColumnKey, index: number): string {
  return `wui-datepicker-${uid}-${key}-${index}`
}
</script>

<template>
  <div
    v-bind="attrs"
    class="wui-date-picker"
    :class="{
      'wui-date-picker--empty': !hasDate,
      'wui-date-picker--disabled': disabled,
      'wui-date-picker--open': isOpen,
    }"
    role="group"
    :aria-label="header || 'Date picker'"
    :aria-disabled="disabled || undefined"
  >
    <!-- HeaderContentPresenter:DatePickerTopHeaderMargin = 0,0,0,4 -->
    <div v-if="header" class="wui-date-picker-header">{{ header }}</div>

    <!-- 收起态字段(FlyoutButton):2px 描边 + 三段文本 + 2px 分割线,MinHeight 32 -->
    <button
      ref="anchorRef"
      type="button"
      class="wui-date-picker-field"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="onFieldClick"
      @keydown="onFieldKeydown"
    >
      <span class="wui-date-picker-field-grid" :style="{ gridTemplateColumns: columnsTemplate }">
        <template v-for="(seg, index) in segments" :key="seg.key">
          <span
            class="wui-date-picker-seg"
            :class="{ 'wui-date-picker-seg--left': seg.leftAlign }"
            >{{ seg.text }}</span
          >
          <span v-if="index < segments.length - 1" class="wui-date-picker-sep" aria-hidden="true"></span>
        </template>
      </span>
    </button>
  </div>

  <!-- 飞出层:Teleport 到 body,复用 .wui-popup-layer 外壳(圆角/阴影/层级) -->
  <Teleport to="body">
    <Transition enter-active-class="wui-popup-anim-flyout" leave-active-class="wui-popup-anim-flyout-leave">
      <div
        v-if="isOpen && !disabled"
        ref="layerRef"
        class="wui-popup-layer wui-date-picker-layer"
        :class="{ 'is-keyboard': keyboardOpened }"
        role="dialog"
        tabindex="-1"
        :aria-label="header || 'Date picker'"
        @keydown="onLayerKeydown"
      >
        <!-- PickerHostGrid:78*/132*/78* 三列 + 2px 分割线,中央 40px 高亮带 -->
        <div class="wui-date-picker-host">
          <div class="wui-date-picker-highlight" aria-hidden="true"></div>
          <div class="wui-date-picker-columns" :style="{ gridTemplateColumns: columnsTemplate }">
            <template v-for="(col, colIndex) in columns" :key="col.key">
              <div class="wui-date-picker-col">
                <!-- LoopingSelector 展开钮:E70E/E70D,Height 22,FontSize 8,PointerOver 才显示 -->
                <button
                  type="button"
                  class="wui-date-picker-nav wui-date-picker-nav--up"
                  tabindex="-1"
                  aria-hidden="true"
                  :disabled="disabled"
                  @click="stepColumn(col.key, -1)"
                >&#xE70E;</button>
                <div
                  class="wui-date-picker-window"
                  role="listbox"
                  :aria-label="col.ariaLabel"
                  :data-col="col.key"
                  :aria-activedescendant="optionId(col.key, col.selectedIndex)"
                  :tabindex="disabled ? -1 : 0"
                  @keydown="onColumnKeydown($event, col.key)"
                  @wheel="onWheel($event, col.key)"
                  @pointerdown="onPointerDown($event, col.key)"
                  @pointermove="onPointerMove"
                  @pointerup="onPointerUp"
                  @pointercancel="onPointerCancel"
                >
                  <!-- presentation:滚轮条仅为位移容器,不暴露角色,保证 option 归属于上方 listbox -->
                  <div class="wui-date-picker-strip" role="presentation" :style="stripStyle(col)">
                    <div
                      v-for="(item, index) in col.items"
                      :id="optionId(col.key, index)"
                      :key="index"
                      role="option"
                      class="wui-date-picker-item"
                      :class="{
                        'wui-date-picker-item--selected': index === col.selectedIndex,
                        'wui-date-picker-item--left': col.leftAlign,
                      }"
                      :style="{ opacity: itemOpacity(col, index) }"
                      :aria-selected="index === col.selectedIndex"
                      @click="onItemClick(col.key, index)"
                    >
                      {{ item }}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="wui-date-picker-nav wui-date-picker-nav--down"
                  tabindex="-1"
                  aria-hidden="true"
                  :disabled="disabled"
                  @click="stepColumn(col.key, 1)"
                >&#xE70D;</button>
              </div>
              <div
                v-if="colIndex < columns.length - 1"
                class="wui-date-picker-spacer"
                aria-hidden="true"
              ></div>
            </template>
          </div>
        </div>

        <!-- AcceptDismissHostGrid:高 41,顶部 2px 分割线,Accept(E8FB)/ Dismiss(E711) -->
        <div class="wui-date-picker-acceptdismiss">
          <div class="wui-date-picker-ad-divider" aria-hidden="true"></div>
          <button
            type="button"
            class="wui-date-picker-ad"
            aria-label="确定"
            @click="closeFlyout(true, false)"
          >&#xE8FB;</button>
          <button
            type="button"
            class="wui-date-picker-ad"
            aria-label="取消"
            @click="closeFlyout(true, true)"
          >&#xE711;</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * 结构对照 generic.xaml:
 * - 收起字段 = DatePickerFlyoutButtonStyle 的 ContentPresenter(BorderThickness 2、三段文本);
 * - 飞出层 = DatePickerFlyoutPresenter 的 Border(1px 描边 + 8px 圆角)+ PickerHostGrid
 *   (78 / 132 / 78 三列 + 2px 分割线 + 中央 40px 高亮带)+ AcceptDismissHostGrid(41px);
 * - 每列 = 3 行 40px 视口 + 常驻 PointerOver 才显示的 22px 展开钮(LoopingSelector 模板)。
 */
.wui-date-picker {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  font-family: inherit; /* ContentControlThemeFontFamily 占位,回退浏览器默认 */
  font-size: var(--wui-control-content-theme-font-size);
  user-select: none;
  -webkit-user-select: none;
}

/* —— 标头(DatePickerTopHeaderMargin 0,0,0,4)—— */
.wui-date-picker-header {
  margin: 0 0 4px;
  color: var(--wui-date-picker-header-foreground);
}

/* ======================================================================
 * 收起字段(FlyoutButton):Border 1、MinHeight 32(XAML MinHeight 含边框,故 border-box)、
 * MinWidth 296(DatePickerThemeMinWidth)、MaxWidth 456(DatePickerThemeMaxWidth)、圆角 4
 * 厚度权威:DatePicker_themeresources.xaml L38/L74/L108 `DatePickerBorderThemeThickness` = 1
 * (legacy dxaml generic.xaml 的 2 已被 PL7 替换;FlyoutButton 的 BorderThickness 模板绑定同值,
 *  FocusStates.Focused 为空态 → 聚焦不改厚度,焦点由系统焦点视觉承担)。
 * ====================================================================== */
.wui-date-picker-field {
  box-sizing: border-box; /* 源 MinHeight 32 含 1px 边框 */
  display: block;
  min-width: 296px; /* DatePickerThemeMinWidth */
  max-width: 456px; /* DatePickerThemeMaxWidth */
  min-height: 32px; /* 源 FlyoutButton 高度 */
  padding: 0;
  font: inherit;
  color: var(--wui-date-picker-button-foreground);
  text-align: inherit;
  background: var(--wui-date-picker-button-background);
  border: 1px solid var(--wui-date-picker-button-border); /* DatePickerBorderThemeThickness = 1 */
  border-radius: 4px; /* CornerRadius = ControlCornerRadius(theme.css 无同名 token) */
  cursor: pointer;
  outline: none;
}

/* —— 状态优先级(对照 VSM):Disabled > Focused > Pressed/Open > PointerOver > Normal —— */
.wui-date-picker:not(.wui-date-picker--disabled) .wui-date-picker-field:hover {
  color: var(--wui-date-picker-button-foreground-pointer-over);
  background: var(--wui-date-picker-button-background-pointer-over);
  border-color: var(--wui-date-picker-button-border-brush-pointer-over);
}

.wui-date-picker:not(.wui-date-picker--disabled) .wui-date-picker-field:active,
.wui-date-picker:not(.wui-date-picker--disabled).wui-date-picker--open .wui-date-picker-field {
  color: var(--wui-date-picker-button-foreground-pressed);
  background: var(--wui-date-picker-button-background-pressed);
  border-color: var(--wui-date-picker-button-border-brush-pressed);
}

/* 聚焦态(FocusStates.Focused 只动 Background / Foreground,边框保持) */
.wui-date-picker:not(.wui-date-picker--disabled) .wui-date-picker-field:focus-visible {
  color: var(--wui-date-picker-button-foreground-focused);
  background: var(--wui-date-picker-button-background-focused);
}

/* —— 三段文本 + 2px 分割线(FlyoutButtonContentGrid)—— */
.wui-date-picker-field-grid {
  display: grid;
  /* 源 FlyoutButtonContentGrid 随 VerticalContentAlignment=Stretch 撑满内容盒,
     其 TextBlock 默认 Stretch + 顶对齐 → 文字自内边距顶起算(PL7:1px 边框 → 文字顶距外缘
     1+3 = 4px)。 */
  align-items: start;
  height: 30px; /* 32 - 2×1 边框(PL7:边框 2→1) */
}

.wui-date-picker-seg {
  min-width: 0;
  padding: 3px 0 6px; /* DatePickerHostPadding 0,3,0,6 */
  overflow: hidden;
  line-height: 19px; /* 19 + 3 + 6 = 28,顶对齐于 30px 内容盒 */
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 月列:DatePickerHostMonthPadding 9,3,0,6 + Margin 1,0,0,0,左对齐 */
.wui-date-picker-seg--left {
  padding-left: 10px; /* 9px 内边距 + 1px Margin */
  text-align: left;
}

.wui-date-picker-sep {
  width: 2px; /* FirstPickerSpacing / SecondPickerSpacing Width = 2 */
  height: 100%;
  background: var(--wui-date-picker-spacer-fill);
}

/* 空值态(HasNoDate):三段前景转占位前景 */
.wui-date-picker--empty .wui-date-picker-seg {
  color: var(--wui-text-control-placeholder-foreground);
}

/* 禁用态(Disabled:字段背景/边框/前景 + 标头 + 分割线) */
.wui-date-picker--disabled .wui-date-picker-header {
  color: var(--wui-date-picker-header-foreground-disabled);
}

.wui-date-picker--disabled .wui-date-picker-field {
  color: var(--wui-date-picker-button-foreground-disabled);
  background: var(--wui-date-picker-button-background-disabled);
  border-color: var(--wui-date-picker-button-border-brush-disabled);
  cursor: default;
}

.wui-date-picker--disabled .wui-date-picker-sep {
  background: var(--wui-date-picker-spacer-fill-disabled);
}

/* 禁用 + 空值:禁用前景优先(与源 Disabled/ HasNoDate 状态优先级一致) */
.wui-date-picker--disabled .wui-date-picker-seg {
  color: var(--wui-date-picker-button-foreground-disabled);
}

/* ======================================================================
 * 飞出层(DatePickerFlyoutPresenter):Width 296、Border 1、圆角 8、Padding 0
 * ====================================================================== */
.wui-date-picker-layer {
  box-sizing: border-box;
  width: 296px; /* DatePickerFlyoutPresenter Width / MinWidth */
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size); /* FlyoutPresenter FontSize = ControlContentThemeFontSize */
  color: var(--wui-looping-selector-item-foreground);
  background: var(--wui-date-picker-flyout-presenter-background);
  border: 1px solid var(--wui-date-picker-flyout-presenter-border); /* DateTimeFlyoutBorderThickness */
  border-radius: var(--wui-popup-corner-radius, 8px); /* OverlayCornerRadius */
  user-select: none;
  -webkit-user-select: none;
}

.wui-date-picker-layer:focus {
  outline: none; /* 焦点由各列 listbox 承担,层根只做键盘事件宿主 */
}

/* —— PickerHostGrid:高 120(3 × 40),中央 40px 高亮带跨全部列 —— */
.wui-date-picker-host {
  position: relative;
  height: 120px;
}

/* DatePickerFlyoutPresenterHighlightFill,VerticalAlignment Center,Height 40 */
.wui-date-picker-highlight {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 40px; /* DatePickerFlyoutPresenterHighlightHeight */
  background: var(--wui-date-picker-flyout-presenter-highlight-fill);
  transform: translateY(-50%);
  pointer-events: none;
}

.wui-date-picker-columns {
  position: relative;
  display: grid;
  align-items: stretch;
  height: 100%;
}

/* —— 列:窗口(3 × 40 视口)+ 22px 悬停展开钮 —— */
.wui-date-picker-col {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.wui-date-picker-col:hover .wui-date-picker-nav {
  visibility: visible;
}

/* —— 窗口:3 行视口,中央为选中行 —— */
.wui-date-picker-window {
  position: relative;
  height: 120px;
  overflow: hidden;
  cursor: grab;
  touch-action: none; /* 垂直拖拽归列内滚轮,不触发页面滚动 */
  outline: none;
}

.wui-date-picker-window:active {
  cursor: grabbing;
}

/* —— 项条:整体 translateY 滚动 —— */
.wui-date-picker-strip {
  position: relative;
  will-change: transform;
  transition: transform var(--wui-duration-fast) var(--wui-easing-standard);
}

.wui-date-picker-item {
  /* border-box:源 ItemHeight 40 为含内边距的行高盒 */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px; /* DatePickerFlyoutPresenterItemHeight */
  margin: 0 2px; /* LoopingSelectorItem ContentPresenter Margin 2,0,2,0 */
  padding: 3px 0 6px; /* DatePickerFlyoutPresenterItemPadding 0,3,0,6 */
  color: var(--wui-looping-selector-item-foreground);
  text-align: center;
  cursor: pointer;
}

.wui-date-picker-item--left {
  justify-content: flex-start;
  padding-left: 9px; /* DatePickerFlyoutPresenterMonthPadding 9,3,0,6 */
}

.wui-date-picker-item--selected {
  color: var(--wui-looping-selector-item-foreground-selected);
}

/* PointerOver / Pressed(LoopingSelectorItemBackgroundPointerOver/Pressed) */
.wui-date-picker-item:hover {
  background: var(--wui-looping-selector-item-background-pointer-over);
}

.wui-date-picker-item:active {
  background: var(--wui-looping-selector-item-background-pressed);
}

/* —— 展开钮(LoopingSelector UpButton/DownButton:E70E/E70D,Height 22,FontSize 8,
     默认 Collapsed,PointerOver 才显示)—— */
.wui-date-picker-nav {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  margin: 0;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 8px;
  line-height: 1;
  color: var(--wui-looping-selector-item-foreground);
  background: var(--wui-looping-selector-button-background);
  border: none;
  visibility: hidden; /* 源 VSM:仅 PointerOver 可见 */
  cursor: pointer;
}

.wui-date-picker-nav--up {
  top: 0;
}

.wui-date-picker-nav--down {
  bottom: 0;
}

.wui-date-picker-nav:hover:not(:disabled) {
  background: var(--wui-looping-selector-item-background-pointer-over);
}

.wui-date-picker-nav:active:not(:disabled) {
  background: var(--wui-looping-selector-item-background-pressed);
}

.wui-date-picker-nav:disabled {
  cursor: default;
}

/* —— 列间分割线(DatePickerFlyoutPresenterSpacerFill,2px)—— */
.wui-date-picker-spacer {
  width: 2px;
  background: var(--wui-date-picker-flyout-presenter-spacer-fill);
}

/* —— 键盘焦点(仅键盘打开时显示,鼠标打开不显示焦点框):弹层窗口无 FocusVisualMargin
      键 → Margin 0 族,两环全在元素内 primary [0,2] + secondary [2,3] = 系统双环 —— */
.wui-date-picker-layer.is-keyboard .wui-date-picker-window:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

/* ======================================================================
 * AcceptDismissHostGrid:高 41;顶部 2px 分割线;Accept / Dismiss 各占 1*
 * ====================================================================== */
.wui-date-picker-acceptdismiss {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 41px; /* DatePickerFlyoutPresenterAcceptDismissHostGridHeight */
}

.wui-date-picker-ad-divider {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: var(--wui-date-picker-flyout-presenter-spacer-fill);
}

/* DateTimePickerFlyoutButtonStyle:透明底,FontSize 16,SymbolThemeFontFamily */
.wui-date-picker-ad {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 16px;
  line-height: 1;
  color: inherit;
  background: var(--wui-date-time-picker-flyout-button-background);
  border: none;
  cursor: pointer;
}

.wui-date-picker-ad:hover {
  color: var(--wui-date-time-picker-flyout-button-foreground-pointer-over);
  background: var(--wui-date-time-picker-flyout-button-background-pointer-over);
}

.wui-date-picker-ad:active {
  color: var(--wui-date-time-picker-flyout-button-foreground-pressed);
  background: var(--wui-date-time-picker-flyout-button-background-pressed);
}

/* 系统焦点视觉:确定/取消按钮为 Button 族(FocusVisualMargin=-3)双环在外 */
.wui-date-picker-ad:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* —— 入场 / 离场:弹层经 FlyoutBase 通道(MR1/A3:50px 方向位移组,入场 250ms
   随放置位、离场镜像同速;类与关键帧见 popup.css 的 .wui-popup-anim-flyout[-leave],
   由上方 Transition 的 enter/leave-active-class 挂接,此处不再有 scoped 规则)—— */
</style>
