<script setup lang="ts">
// DatePicker —— WinUI DatePicker 的 Web 复刻(inline 三列滚轮选择器,月/日/年)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   - TargetType="DatePicker"(L8668 起):Header 边距 0,0,0,4、HasNoDate 态占位前景、
//     分割线 DatePickerSpacerFill(2px)、Disabled 各色;
//   - TargetType="DatePickerFlyoutPresenter"(L12801 起,LoopingSelector 三列的宿主):
//     宽 296、三列宽 78*/132*/78*(日/月/年)、分割线 2px、高亮带 40px
//     (DatePickerFlyoutPresenterHighlightFill)、项高 40、项内边距 0,3,0,6(月列 9,3,0,6);
//   - LoopingSelector 资源(L857 起):项前景/选中前景/上下按钮底色。
// 颜色/字号一律取 src/styles/theme.css 的 --wui-* token;动效取 animations.css token。
// 注意:本组件不是日历弹层,是常驻 inline 的三列选择器(WinUI 弹层内的 LoopingSelector 形态)。
import { computed, reactive, ref, useAttrs, useId, watch } from 'vue'
import '../styles/animations.css'

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

// —— 事件(WinUI DateChanged;程序化赋值同样触发,与 ComboBox selectionChanged 语义一致)——
const emit = defineEmits<{ dateChanged: [newDate: Date | null, oldDate: Date | null] }>()

// —— $attrs 透传(单根,inheritAttrs: false)——
const attrs = useAttrs()

// 实例唯一 id 前缀(aria-activedescendant/option id 用;多实例不串号)
const uid = useId()

// —— 结构常量(源:DatePickerFlyoutPresenterHighlightHeight/ItemHeight = 40)——
const ITEM_HEIGHT = 40
/** 可见行数:窗口高度 = 3 × 40(中央选中行 + 上下各一行相邻项)。 */
const WINDOW_HEIGHT = ITEM_HEIGHT * 3
/** 拖拽判定阈值:超过视为拖拽,松手吸附;否则当作点击。 */
const DRAG_THRESHOLD_PX = 5

type ColumnKey = 'month' | 'day' | 'year'

interface ColumnSpec {
  key: ColumnKey
  /** 源模板列宽比例:日 78* / 月 132* / 年 78*(generic.xaml DayColumn/MonthColumn/YearColumn)。 */
  flexGrow: number
  ariaLabel: string
  items: string[]
  selectedIndex: number
  /** 月列左对齐并带 9px 内边距(DatePickerFlyoutPresenterMonthPadding)。 */
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
    default:
      return // 未命中的按键交还浏览器
  }
  event.preventDefault()
}

// —— 拖拽(触摸/鼠标按住上下拖,松手按最近项吸附;加分项)——
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
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (drag.key === null || event.pointerId !== drag.pointerId) return
  drag.dy = event.clientY - drag.startY
  if (!drag.moved && Math.abs(drag.dy) > DRAG_THRESHOLD_PX) drag.moved = true
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

function onItemClick(key: ColumnKey, index: number): void {
  if (props.disabled) return
  if (Date.now() < suppressClickUntil) return // 拖拽松手后的合成 click,吞掉
  selectIndex(key, index)
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
    }"
    role="group"
    :aria-label="header || 'Date picker'"
    :aria-disabled="disabled || undefined"
  >
    <div v-if="header" class="wui-date-picker-header">{{ header }}</div>
    <div class="wui-date-picker-board">
      <template v-for="(col, colIndex) in columns" :key="col.key">
        <div class="wui-date-picker-col" :style="{ flexGrow: col.flexGrow }">
          <button
            type="button"
            class="wui-date-picker-nav"
            tabindex="-1"
            aria-hidden="true"
            :disabled="disabled"
            @click="stepColumn(col.key, -1)"
          >
            <span class="wui-date-picker-nav-glyph" aria-hidden="true">&#xE76B;</span>
          </button>
          <div
            class="wui-date-picker-window"
            role="listbox"
            :aria-label="col.ariaLabel"
            :aria-activedescendant="optionId(col.key, col.selectedIndex)"
            :tabindex="disabled ? -1 : 0"
            @keydown="onColumnKeydown($event, col.key)"
            @wheel="onWheel($event, col.key)"
            @pointerdown="onPointerDown($event, col.key)"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
          >
            <div class="wui-date-picker-highlight" aria-hidden="true"></div>
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
            class="wui-date-picker-nav"
            tabindex="-1"
            aria-hidden="true"
            :disabled="disabled"
            @click="stepColumn(col.key, 1)"
          >
            <span class="wui-date-picker-nav-glyph" aria-hidden="true">&#xE76C;</span>
          </button>
        </div>
        <div
          v-if="colIndex < columns.length - 1"
          class="wui-date-picker-spacer"
          aria-hidden="true"
        ></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 generic.xaml:
 * - 宿主面板:DatePickerFlyoutPresenter Background/BorderBrush(1px)+ 弹层圆角 8px;
 * - 三列宽度比 78 : 132 : 78(日/月/年),列间 2px DatePickerFlyoutPresenterSpacerFill 分割线;
 * - 每列 = 上箭头 + 3 行窗口(中央 40px 高亮带)+ 下箭头(LoopingSelector 展开钮形态)。
 */
.wui-date-picker {
  display: inline-flex;
  flex-direction: column;
  max-width: 456px; /* DatePickerThemeMaxWidth */
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

/* —— 三列面板:飞出层底色 + 1px 描边(等效常驻展开的 LoopingSelector 宿主)—— */
.wui-date-picker-board {
  display: flex;
  align-items: stretch;
  min-width: 296px; /* DatePickerFlyoutPresenter Width/MinWidth */
  padding: 4px 0;
  background: var(--wui-date-picker-flyout-presenter-background);
  border: 1px solid var(--wui-date-picker-flyout-presenter-border);
  border-radius: var(--wui-popup-corner-radius, 8px); /* OverlayCornerRadius,theme.css 无同名 token */
}

/* —— 列:上箭头 / 窗口 / 下箭头 —— */
.wui-date-picker-col {
  display: flex;
  flex-direction: column;
  flex-basis: 0; /* 宽度完全由 78 : 132 : 78 比例决定 */
  min-width: 0;
}

/* —— 窗口:3 行视口(3 × 40px 项高),中央为选中行 —— */
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

/* 中央高亮带(DatePickerFlyoutPresenterHighlightFill,高 40) */
.wui-date-picker-highlight {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 40px;
  background: var(--wui-date-picker-flyout-presenter-highlight-fill);
  transform: translateY(-50%);
  pointer-events: none;
}

/* —— 项条:整体 translateY 滚动 —— */
.wui-date-picker-strip {
  position: relative;
  will-change: transform;
  transition: transform var(--wui-duration-fast) var(--wui-easing-standard);
}

.wui-date-picker-item {
  /* border-box:源 ItemHeight 40 为含内边距的行高盒;缺省 content-box 会把 3+6 内边距加到 49px,
     令条目按 49px 步距累积偏移、选中项被推出 40px 高亮带(V6 视觉 QA F1) */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px; /* DatePickerFlyoutPresenterItemHeight(含内边距) */
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

/* —— 上下箭头(LoopingSelectorButtonBackground + Segoe Fluent chevron)—— */
.wui-date-picker-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20px;
  margin: 0;
  padding: 0;
  color: var(--wui-looping-selector-item-foreground);
  background: var(--wui-looping-selector-button-background);
  border: none;
  cursor: pointer;
}

.wui-date-picker-nav-glyph {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size);
  line-height: 1;
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

/* —— 键盘焦点(:focus-visible accent 描边,项目惯例)—— */
.wui-date-picker-window:focus-visible {
  outline: 2px solid var(--wui-system-accent-color);
  outline-offset: -2px;
}

/* —— 空值态(HasNoDate):三列文字转占位前景 —— */
.wui-date-picker--empty .wui-date-picker-item {
  color: var(--wui-text-control-placeholder-foreground);
}

/* —— 禁用态(Disabled:前景/分割线/标头转禁用色,交互封死)—— */
.wui-date-picker--disabled .wui-date-picker-header {
  color: var(--wui-date-picker-header-foreground-disabled);
}

.wui-date-picker--disabled .wui-date-picker-item {
  color: var(--wui-date-picker-button-foreground-disabled);
  cursor: default;
}

.wui-date-picker--disabled .wui-date-picker-spacer {
  background: var(--wui-date-picker-spacer-fill-disabled);
}

.wui-date-picker--disabled .wui-date-picker-window,
.wui-date-picker--disabled .wui-date-picker-item {
  pointer-events: none;
}
</style>
