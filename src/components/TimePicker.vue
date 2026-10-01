<script setup lang="ts">
// TimePicker —— WinUI TimePicker 的 Web 复刻(inline 三列滚轮选择器:时/分/AM-PM)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   - TargetType="TimePicker"(L10660 起):Header 边距 0,0,0,4(TimePickerTopHeaderMargin)、
//     HasNoTime 态占位前景、Disabled 标头/分割线各色;
//   - TargetType="TimePickerFlyoutPresenter"(L13010 起,LoopingSelector 三列的宿主):
//     宽 242(TimePickerThemeMinWidth)、三列等宽(源模板三个 * 列)、分割线 2px
//     (TimePickerFlyoutPresenterSpacerFill)、高亮带 40px(TimePickerFlyoutPresenterHighlightFill)、
//     项高 40、项内边距 0,3,0,6;
//   - LoopingSelector 资源(L857 起):项前景/选中前景/上下按钮底色。
// 颜色/字号一律取 src/styles/theme.css 的 --wui-* token;动效取 animations.css token。
// 注意:与 DatePicker.vue 同款约定 —— 常驻 inline 三列滚轮(非收起按钮 + 弹层),
// 交互层(滚轮/箭头/拖拽/键盘)复用其模式;time 值选型为 "HH:mm" 24 小时制字符串(wiki 已记录)。
import { computed, reactive, ref, useAttrs, useId, watch } from 'vue'
import '../styles/animations.css'

defineOptions({ name: 'WuiTimePicker', inheritAttrs: false })

// —— Props(属性名跟随 WinUI camelCase)——
const props = withDefaults(
  defineProps<{
    /** 选择器上方标头文本(WinUI Header);为空时不渲染。 */
    header?: string
    /** 时钟制式(WinUI ClockIdentifier):12HourClock 显示 时(1-12)+ AM/PM 列,24HourClock 显示 0-23。 */
    clockStyle?: '12HourClock' | '24HourClock'
    /** 分钟列步进(WinUI MinuteIncrement,1-30);变更时已选分钟就近吸附到网格。 */
    minuteIncrement?: number
    /** 空值态(time 为 null)时三列显示的占位时间,"HH:mm";缺省为组件创建时的当前时间。 */
    placeholderTime?: string
    /** 禁用选择器(WinUI IsEnabled=false)。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    clockStyle: '12HourClock',
    minuteIncrement: 1,
    // defineProps 默认值会被提升到 setup 外,不可引用局部函数,故内联"当前时间"求值。
    placeholderTime: () => {
      const now = new Date()
      const pad = (v: number): string => (v < 10 ? `0${v}` : String(v))
      return `${pad(now.getHours())}:${pad(now.getMinutes())}`
    },
    disabled: false,
  },
)

// —— time 双向绑定(WinUI SelectedTime 为 TimeSpan;此处选型 "HH:mm" 24 小时制零填充字符串,null 为未选择)——
const time = defineModel<string | null>('time', { default: null })

// —— 事件(WinUI TimeChanged;程序化赋值同样触发,与 DatePicker dateChanged 语义一致)——
const emit = defineEmits<{ timeChanged: [newTime: string | null, oldTime: string | null] }>()

// —— $attrs 透传(单根,inheritAttrs: false)——
const attrs = useAttrs()

// —— 实例唯一后缀(aria option id 兜底,避免同文档多实例未传 id 时 DOM id 冲突)——
const uid = useId()

// —— 结构常量(源:TimePickerFlyoutPresenterHighlightHeight/ItemHeight = 40)——
const ITEM_HEIGHT = 40
/** 可见行数:窗口高度 = 3 × 40(中央选中行 + 上下各一行相邻项),与 DatePicker 一致。 */
const WINDOW_HEIGHT = ITEM_HEIGHT * 3
/** 拖拽判定阈值:超过视为拖拽,松手吸附;否则当作点击。 */
const DRAG_THRESHOLD_PX = 5

type ColumnKey = 'hour' | 'minute' | 'period'

interface ColumnSpec {
  key: ColumnKey
  /** 源模板三个选择列均为 * 等分(generic.xaml First/Second/ThirdPickerHostColumn)。 */
  flexGrow: number
  ariaLabel: string
  items: string[]
  selectedIndex: number
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function nowHHmm(): string {
  const now = new Date()
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`
}

// —— 分钟步进(防御非法值,收敛到 1-30)——
const increment = computed(() => {
  const raw = Math.floor(Number(props.minuteIncrement))
  if (!Number.isFinite(raw)) return 1
  return Math.min(30, Math.max(1, raw))
})

const is24 = computed(() => props.clockStyle === '24HourClock')

// —— 12/24 换算(核心约定:12AM = 0、12PM = 12)——
function toDisplayHour(hour24: number): number {
  const h = ((hour24 % 24) + 24) % 24
  return h % 12 === 0 ? 12 : h % 12
}

function fromDisplayHour(displayHour: number, am: boolean): number {
  return (displayHour % 12) + (am ? 0 : 12)
}

// —— 选中值(内部态为 24 小时制,始终有定义;time 为 null 时显示占位值)——
const selHour = ref(0)
const selMinute = ref(0)

const isAm = computed(() => selHour.value < 12)

// —— 分钟网格吸附(就近取整,钳在 [0, 最后一档])——
function snapMinute(minute: number): number {
  const inc = increment.value
  const maxIndex = Math.ceil(60 / inc) - 1
  const index = Math.min(maxIndex, Math.max(0, Math.round(minute / inc)))
  return index * inc
}

/** "H:mm"/"HH:mm" 解析,越界收敛;非法输入回退当前时间。 */
function parseTime(value: string): { hour: number; minute: number } {
  const match = /^\s*(\d{1,2}):(\d{1,2})\s*$/.exec(value)
  if (match === null) {
    const fallback = nowHHmm()
    const retry = /^\s*(\d{1,2}):(\d{1,2})\s*$/.exec(fallback)
    if (retry === null) return { hour: 0, minute: 0 }
    return { hour: Number(retry[1]), minute: Number(retry[2]) }
  }
  return {
    hour: Math.min(23, Math.max(0, Number(match[1]))),
    minute: Math.min(59, Math.max(0, Number(match[2]))),
  }
}

// —— 三列定义(时/分/AM-PM,AM-PM 列仅 12 小时制显示)——
const columns = computed<ColumnSpec[]>(() => {
  const list: ColumnSpec[] = []
  if (is24.value) {
    list.push({
      key: 'hour',
      flexGrow: 1,
      ariaLabel: 'Hour',
      items: Array.from({ length: 24 }, (_v, i) => String(i)),
      selectedIndex: selHour.value,
    })
  } else {
    list.push({
      key: 'hour',
      flexGrow: 1,
      ariaLabel: 'Hour',
      items: Array.from({ length: 12 }, (_v, i) => String(i + 1)),
      selectedIndex: toDisplayHour(selHour.value) - 1,
    })
  }
  const minuteList = Array.from({ length: Math.ceil(60 / increment.value) }, (_v, i) => pad2(i * increment.value))
  const minuteIndex = Math.min(minuteList.length - 1, Math.max(0, Math.round(selMinute.value / increment.value)))
  list.push({
    key: 'minute',
    flexGrow: 1,
    ariaLabel: 'Minute',
    items: minuteList,
    selectedIndex: minuteIndex,
  })
  if (!is24.value) {
    list.push({
      key: 'period',
      flexGrow: 1,
      ariaLabel: 'AM/PM',
      items: ['AM', 'PM'],
      selectedIndex: isAm.value ? 0 : 1,
    })
  }
  return list
})

/** 模型值归一(钳 0-23/0-59 + 分钟网格吸附)成 "HH:mm"。 */
function normalizeTime(value: string): string {
  const parsed = parseTime(value)
  return `${pad2(parsed.hour)}:${pad2(snapMinute(parsed.minute))}`
}

// 交互路径(commit)写回模型前置位,模型 watcher 见到即跳过二次 emit,实现两路去重。
let suppressModelWatchEmit = false

// —— 提交(用户交互路径:滚轮/箭头/键盘/点击/拖拽吸附;写回模型并触发事件)——
function commit(nextHour24: number, nextMinute: number): void {
  const hour = Math.min(23, Math.max(0, Math.round(nextHour24)))
  const minute = snapMinute(nextMinute)
  selHour.value = hour
  selMinute.value = minute
  const built = `${pad2(hour)}:${pad2(minute)}`
  const current = time.value
  if (current === built) return
  suppressModelWatchEmit = true
  time.value = built
  emit('timeChanged', built, current)
}

// —— 外部赋值同步(仅刷新两列;事件统一由 onModelChange 负责)——
function syncFromModel(): void {
  const value = time.value
  const parsed = parseTime(value !== null ? value : props.placeholderTime)
  selHour.value = parsed.hour
  selMinute.value = snapMinute(parsed.minute)
}

// —— 模型变化统一入口:程序化赋值(v-model)同样触发 timeChanged(WinUI TimeChanged 语义),
// 与交互路径经 suppressModelWatchEmit 去重;越界/离网值先吸附收敛回网格再触发 ——
function onModelChange(value: string | null, oldValue: string | null | undefined): void {
  if (suppressModelWatchEmit) {
    suppressModelWatchEmit = false
    syncFromModel()
    return
  }
  let effective = value
  if (value !== null) {
    const built = normalizeTime(value)
    if (built !== value) {
      // 越界/离网模型收敛:写回归一值(置位去重标记,收敛本身不二次触发)
      suppressModelWatchEmit = true
      time.value = built
      effective = built
    }
  }
  syncFromModel()
  // oldValue === undefined 仅出现在 immediate 首跑(挂载),不触发事件
  if (oldValue !== undefined && effective !== oldValue) {
    emit('timeChanged', effective, oldValue)
  }
}

watch(time, onModelChange, { immediate: true })
// minuteIncrement/placeholderTime 变化:把离网分钟吸附收敛掉(与程序化赋值同语义;空值仅刷新三列)
watch([increment, () => props.placeholderTime], () => {
  onModelChange(time.value, time.value)
})

const hasTime = computed(() => time.value !== null)

// —— 步进/选中(滚轮、箭头、键盘、点击、拖拽吸附共用)——
function stepColumn(key: ColumnKey, delta: number): void {
  if (props.disabled) return
  if (key === 'hour') commit(selHour.value + delta, selMinute.value)
  else if (key === 'minute') commit(selHour.value, selMinute.value + delta * increment.value)
  else {
    const current = isAm.value ? 0 : 1
    const target = Math.min(1, Math.max(0, current + delta))
    if (target !== current) commit((selHour.value + 12) % 24, selMinute.value)
  }
}

function selectIndex(key: ColumnKey, index: number): void {
  if (key === 'hour') {
    if (is24.value) commit(index, selMinute.value)
    else commit(fromDisplayHour(index + 1, isAm.value), selMinute.value)
  } else if (key === 'minute') {
    commit(selHour.value, index * increment.value)
  } else {
    const currentIndex = isAm.value ? 0 : 1
    if (index !== currentIndex) commit((selHour.value + 12) % 24, selMinute.value)
    else if (time.value === null) commit(selHour.value, selMinute.value) // 空值态点已选 AM/PM:占位值转正,避免同值点击无响应
  }
}

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
  return `wui-time-picker-${uid}-${key}-${index}`
}
</script>

<template>
  <div
    v-bind="attrs"
    class="wui-time-picker"
    :class="{
      'wui-time-picker--empty': !hasTime,
      'wui-time-picker--disabled': disabled,
    }"
    role="group"
    :aria-label="header || 'Time picker'"
    :aria-disabled="disabled || undefined"
  >
    <div v-if="header" class="wui-time-picker-header">{{ header }}</div>
    <div class="wui-time-picker-board">
      <template v-for="(col, colIndex) in columns" :key="col.key">
        <div class="wui-time-picker-col" :style="{ flexGrow: col.flexGrow }">
          <button
            type="button"
            class="wui-time-picker-nav"
            tabindex="-1"
            aria-hidden="true"
            :disabled="disabled"
            @click="stepColumn(col.key, -1)"
          >
            <span class="wui-time-picker-nav-glyph" aria-hidden="true">&#xE76B;</span>
          </button>
          <div
            class="wui-time-picker-window"
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
            <div class="wui-time-picker-highlight" aria-hidden="true"></div>
            <!-- presentation:滚轮条仅为位移容器,不暴露角色,保证 option 归属于上方 listbox -->
            <div class="wui-time-picker-strip" role="presentation" :style="stripStyle(col)">
              <div
                v-for="(item, index) in col.items"
                :id="optionId(col.key, index)"
                :key="index"
                role="option"
                class="wui-time-picker-item"
                :class="{ 'wui-time-picker-item--selected': index === col.selectedIndex }"
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
            class="wui-time-picker-nav"
            tabindex="-1"
            aria-hidden="true"
            :disabled="disabled"
            @click="stepColumn(col.key, 1)"
          >
            <span class="wui-time-picker-nav-glyph" aria-hidden="true">&#xE76C;</span>
          </button>
        </div>
        <div
          v-if="colIndex < columns.length - 1"
          class="wui-time-picker-spacer"
          aria-hidden="true"
        ></div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 generic.xaml:
 * - 宿主面板:TimePickerFlyoutPresenter Background/BorderBrush(1px)+ 弹层圆角 8px;
 * - 三列等宽(源模板 First/Second/ThirdPickerHostColumn 均为 1 等分),列间 2px
 *   TimePickerFlyoutPresenterSpacerFill 分割线;
 * - 每列 = 上箭头 + 3 行窗口(中央 40px 高亮带)+ 下箭头(LoopingSelector 展开钮形态)。
 */
.wui-time-picker {
  display: inline-flex;
  flex-direction: column;
  max-width: 456px; /* TimePickerThemeMaxWidth */
  font-family: inherit; /* ContentControlThemeFontFamily 占位,回退浏览器默认 */
  font-size: var(--wui-control-content-theme-font-size);
  user-select: none;
  -webkit-user-select: none;
}

/* —— 标头(TimePickerTopHeaderMargin 0,0,0,4)—— */
.wui-time-picker-header {
  margin: 0 0 4px;
  color: var(--wui-time-picker-header-foreground);
}

/* —— 三列面板:飞出层底色 + 1px 描边(等效常驻展开的 LoopingSelector 宿主)—— */
.wui-time-picker-board {
  display: flex;
  align-items: stretch;
  min-width: 242px; /* TimePickerFlyoutPresenter Width / TimePickerThemeMinWidth */
  padding: 4px 0;
  background: var(--wui-time-picker-flyout-presenter-background);
  border: 1px solid var(--wui-time-picker-flyout-presenter-border);
  border-radius: var(--wui-popup-corner-radius, 8px); /* OverlayCornerRadius,theme.css 无同名 token */
}

/* —— 列:上箭头 / 窗口 / 下箭头 —— */
.wui-time-picker-col {
  display: flex;
  flex-direction: column;
  flex: 1 1 0; /* 三列等分(源模板三个 1 等分列) */
  min-width: 0;
}

/* —— 窗口:3 行视口(3 × 40px 项高),中央为选中行 —— */
.wui-time-picker-window {
  position: relative;
  height: 120px;
  overflow: hidden;
  cursor: grab;
  touch-action: none; /* 垂直拖拽归列内滚轮,不触发页面滚动 */
  outline: none;
}

.wui-time-picker-window:active {
  cursor: grabbing;
}

/* 中央高亮带(TimePickerFlyoutPresenterHighlightFill,高 40) */
.wui-time-picker-highlight {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 40px;
  background: var(--wui-time-picker-flyout-presenter-highlight-fill);
  transform: translateY(-50%);
  pointer-events: none;
}

/* —— 项条:整体 translateY 滚动 —— */
.wui-time-picker-strip {
  position: relative;
  will-change: transform;
  transition: transform var(--wui-duration-fast) var(--wui-easing-standard);
}

.wui-time-picker-item {
  /* border-box:源 ItemHeight 40 为含内边距的行高盒;缺省 content-box 会把 3+6 内边距加到 49px,
     令条目按 49px 步距累积偏移、选中项被推出 40px 高亮带(V6 视觉 QA F1,与 DatePicker 同修) */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px; /* TimePickerFlyoutPresenterItemHeight(含内边距) */
  padding: 3px 0 6px; /* TimePickerFlyoutPresenterItemPadding 0,3,0,6 */
  color: var(--wui-looping-selector-item-foreground);
  text-align: center;
  cursor: pointer;
}

.wui-time-picker-item--selected {
  color: var(--wui-looping-selector-item-foreground-selected);
}

/* PointerOver / Pressed(LoopingSelectorItemBackgroundPointerOver/Pressed) */
.wui-time-picker-item:hover {
  background: var(--wui-looping-selector-item-background-pointer-over);
}

.wui-time-picker-item:active {
  background: var(--wui-looping-selector-item-background-pressed);
}

/* —— 上下箭头(LoopingSelectorButtonBackground + Segoe Fluent chevron)—— */
.wui-time-picker-nav {
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

.wui-time-picker-nav-glyph {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size);
  line-height: 1;
}

.wui-time-picker-nav:hover:not(:disabled) {
  background: var(--wui-looping-selector-item-background-pointer-over);
}

.wui-time-picker-nav:active:not(:disabled) {
  background: var(--wui-looping-selector-item-background-pressed);
}

.wui-time-picker-nav:disabled {
  cursor: default;
}

/* —— 列间分割线(TimePickerFlyoutPresenterSpacerFill,2px)—— */
.wui-time-picker-spacer {
  width: 2px;
  background: var(--wui-time-picker-flyout-presenter-spacer-fill);
}

/* —— 键盘焦点(:focus-visible accent 描边,项目惯例)—— */
.wui-time-picker-window:focus-visible {
  outline: 2px solid var(--wui-system-accent-color);
  outline-offset: -2px;
}

/* —— 空值态(HasNoTime):三列文字转占位前景 —— */
.wui-time-picker--empty .wui-time-picker-item {
  color: var(--wui-text-control-placeholder-foreground);
}

/* —— 禁用态(Disabled:前景/分割线/标头转禁用色,交互封死)—— */
.wui-time-picker--disabled .wui-time-picker-header {
  color: var(--wui-time-picker-header-foreground-disabled);
}

.wui-time-picker--disabled .wui-time-picker-item {
  color: var(--wui-time-picker-button-foreground-disabled);
  cursor: default;
}

.wui-time-picker--disabled .wui-time-picker-spacer {
  background: var(--wui-time-picker-spacer-fill-disabled);
}

.wui-time-picker--disabled .wui-time-picker-window,
.wui-time-picker--disabled .wui-time-picker-item {
  pointer-events: none;
}
</style>
