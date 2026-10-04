<script setup lang="ts">
// TimePicker —— WinUI TimePicker 的 Web 复刻(收起字段 + 点击弹出三列 LoopingSelector 飞出层)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   - TargetType="TimePicker"(L10660 起)收起态:
//     · FlyoutButton = 单行字段按钮,内嵌 3 段文本(时/分/AM-PM)+ 2 条 2px 分割线;
//       按钮 MinWidth 242(TimePickerThemeMinWidth)、MaxWidth 456(TimePickerThemeMaxWidth)、
//       ContentPresenter BorderThickness 1(PL7 起)、圆角 ControlCornerRadius(4px);
//       文本内边距 TimePickerFlyoutPresenterItemPadding 0,3,0,6,三段均居中对齐;
//       HasNoTime 态三段前景转 TextControlPlaceholderForeground;
//       按钮各态画刷 TimePickerButtonBackground/BorderBrush/Foreground ×
//       Normal/PointerOver/Pressed/Disabled + Focused 组;
//       Header 边距 TimePickerTopHeaderMargin 0,0,0,4。
//   - TargetType="TimePickerFlyoutPresenter"(L13010 起)弹出层:
//     · Width/MinWidth 242、BorderThickness 1(DateTimeFlyoutBorderThickness)、
//       圆角 OverlayCornerRadius(8px)、Padding 0(DateTimeFlyoutBorderPadding)、MaxHeight 398;
//     · 三列等宽(First/Second/ThirdPickerHostColumn 均为 *)+ 两条 2px
//       TimePickerFlyoutPresenterSpacerFill 分割线;中央 TimePickerFlyoutPresenterHighlightFill
//       高亮带 40(跨全部列)、项高 40、项内边距 0,3,0,6;
//     · AcceptDismissHostGrid 高 41(TimePickerFlyoutPresenterAcceptDismissHostGridHeight):
//       顶部 2px 分割线 + Accept(E8FB)/ Dismiss(E711)各占 1*,FontSize 16,
//       DateTimePickerFlyoutButtonStyle(透明底 + HighlightListLow/Medium 的 hover/pressed)。
//   - LoopingSelector 资源(L13102 起):上下展开钮 Height 22、FontSize 8、
//     码点 E70E(上)/E70D(下)、底色 LoopingSelectorButtonBackground,默认 Collapsed、
//     PointerOver 才显示;项前景/选中前景/悬停/按压底(LoopingSelectorItem* 资源)。
// 颜色/字号一律取 src/styles/theme.css 的 --wui-* token(本次启用原先未用的
// --wui-time-picker-button-* 与 --wui-date-time-picker-flyout-button-*);
// 弹层动效取 popup.css 基建(FlyoutBase 通道 50px 方向位移组,MR1/A3)。
// time 值选型为 "HH:mm" 24 小时制字符串(见 wiki 属性节)。
import { computed, nextTick, reactive, ref, useAttrs, useId, watch } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import '../styles/popup.css'

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

// —— 弹出层开关(WinUI TimePickerFlyout.IsOpen),支持 v-model:is-open ——
const isOpen = defineModel<boolean>('isOpen', { default: false })

// —— 事件(WinUI TimeChanged + 弹出层 Opened / Closed)——
const emit = defineEmits<{
  timeChanged: [newTime: string | null, oldTime: string | null]
  opened: []
  closed: []
}>()

// —— $attrs 透传(单根,inheritAttrs: false)——
const attrs = useAttrs()

// —— 实例唯一后缀(aria option id 兜底,避免同文档多实例未传 id 时 DOM id 冲突)——
const uid = useId()

// —— 结构常量(源:TimePickerFlyoutPresenterItemHeight / HighlightHeight = 40)——
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

/**
 * 收起字段 / 飞出层共用的列轨道模板:
 * `<比例>fr 2px <比例>fr …`,2px 即列间分割线(源模板 Auto 分隔列,宽 2)。
 */
const columnsTemplate = computed(() => columns.value.map((col) => `${col.flexGrow}fr`).join(' 2px '))

// —— 收起字段三段文本(取各列当前选中项文本,与飞出层列项完全一致)—— 
const segments = computed(() =>
  columns.value.map((col) => ({
    key: col.key,
    text: col.items[col.selectedIndex] ?? '',
    flexGrow: col.flexGrow,
  })),
)

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

/* -------------------------------------------------------------------------
 * 弹出层:bottom 对齐锚左缘 + light dismiss 三手势
 * ---------------------------------------------------------------------- */

const { anchorRef } = usePopupAnchor()
const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: 'bottom-start',
  offset: { mainAxis: 4 },
  onOutsidePress: () => closeFlyout(false, false),
  onEscape: () => closeFlyout(true, false),
  onAnchorScroll: () => closeFlyout(false, false), // WinUI:锚滚动链滚动即 light dismiss(DatePicker 同约定)
})

/** 打开瞬间的值快照(Dismiss 按钮 = 取消,回滚到该值)。 */
let openedSnapshot: string | null = null
/** 飞出层是否由键盘打开(决定是否显示列焦点框,对齐 WinUI 仅键盘焦点可见焦点视觉)。 */
const keyboardOpened = ref(false)

function openFlyout(byKeyboard = false): void {
  if (props.disabled || isOpen.value) return
  openedSnapshot = time.value
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
    time.value = openedSnapshot
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
      'wui-time-picker--open': isOpen,
    }"
    role="group"
    :aria-label="header || 'Time picker'"
    :aria-disabled="disabled || undefined"
  >
    <!-- HeaderContentPresenter:TimePickerTopHeaderMargin = 0,0,0,4 -->
    <div v-if="header" class="wui-time-picker-header">{{ header }}</div>

    <!-- 收起态字段(FlyoutButton):1px 描边 + 三段文本 + 2px 分割线,MinHeight 32 -->
    <button
      ref="anchorRef"
      type="button"
      class="wui-time-picker-field"
      :disabled="disabled"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="onFieldClick"
      @keydown="onFieldKeydown"
    >
      <span class="wui-time-picker-field-grid" :style="{ gridTemplateColumns: columnsTemplate }">
        <template v-for="(seg, index) in segments" :key="seg.key">
          <span class="wui-time-picker-seg">{{ seg.text }}</span>
          <span v-if="index < segments.length - 1" class="wui-time-picker-sep" aria-hidden="true"></span>
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
        class="wui-popup-layer wui-time-picker-layer"
        :class="{ 'is-keyboard': keyboardOpened }"
        role="dialog"
        tabindex="-1"
        :aria-label="header || 'Time picker'"
        @keydown="onLayerKeydown"
      >
        <!-- PickerHostGrid:三列等宽 + 2px 分割线,中央 40px 高亮带 -->
        <div class="wui-time-picker-host">
          <div class="wui-time-picker-highlight" aria-hidden="true"></div>
          <div class="wui-time-picker-columns" :style="{ gridTemplateColumns: columnsTemplate }">
            <template v-for="(col, colIndex) in columns" :key="col.key">
              <div class="wui-time-picker-col">
                <!-- LoopingSelector 展开钮:E70E/E70D,Height 22,FontSize 8,PointerOver 才显示 -->
                <button
                  type="button"
                  class="wui-time-picker-nav wui-time-picker-nav--up"
                  tabindex="-1"
                  aria-hidden="true"
                  :disabled="disabled"
                  @click="stepColumn(col.key, -1)"
                >&#xE70E;</button>
                <div
                  class="wui-time-picker-window"
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
                  class="wui-time-picker-nav wui-time-picker-nav--down"
                  tabindex="-1"
                  aria-hidden="true"
                  :disabled="disabled"
                  @click="stepColumn(col.key, 1)"
                >&#xE70D;</button>
              </div>
              <div
                v-if="colIndex < columns.length - 1"
                class="wui-time-picker-spacer"
                aria-hidden="true"
              ></div>
            </template>
          </div>
        </div>

        <!-- AcceptDismissHostGrid:高 41,顶部 2px 分割线,Accept(E8FB)/ Dismiss(E711) -->
        <div class="wui-time-picker-acceptdismiss">
          <div class="wui-time-picker-ad-divider" aria-hidden="true"></div>
          <button
            type="button"
            class="wui-time-picker-ad"
            aria-label="确定"
            @click="closeFlyout(true, false)"
          >&#xE8FB;</button>
          <button
            type="button"
            class="wui-time-picker-ad"
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
 * - 收起字段 = TimePickerFlyoutButtonStyle 的 ContentPresenter(BorderThickness 1、三段文本);
 * - 飞出层 = TimePickerFlyoutPresenter 的 Border(1px 描边 + 8px 圆角)+ PickerHostGrid
 *   (三列等宽 + 2px 分割线 + 中央 40px 高亮带)+ AcceptDismissHostGrid(41px);
 * - 每列 = 3 行 40px 视口 + PointerOver 才显示的 22px 展开钮(LoopingSelector 模板)。
 */
.wui-time-picker {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  font-family: inherit; /* ContentControlThemeFontFamily 占位,回退浏览器默认 */
  font-size: var(--wui-control-content-theme-font-size);
  user-select: none;
  -webkit-user-select: none;
}

/* —— 标头(TimePickerTopHeaderMargin 0,0,0,4)—— */
.wui-time-picker-header {
  margin: 0 0 4px;
  /* TimePickerHeaderForeground = TextFillColorPrimaryBrush(#000000E4 / #FFFFFF) */
  color: var(--wui-text-fill-color-primary);
}

/* ======================================================================
 * 收起字段(FlyoutButton):Border 1、MinHeight 32(XAML MinHeight 含边框,故 border-box)、
 * MinWidth 242(TimePickerThemeMinWidth)、MaxWidth 456(TimePickerThemeMaxWidth)、圆角 4
 * 厚度权威:TimePicker_themeresources.xaml L34/L71/L106 `TimePickerBorderThemeThickness` = 1
 * (legacy dxaml generic.xaml 的 2 已被 PL7 替换;FlyoutButton 的 BorderThickness 模板绑定同值,
 *  FocusStates.Focused 为空态 → 聚焦不改厚度,焦点由系统焦点视觉承担)。
 * ====================================================================== */
.wui-time-picker-field {
  position: relative; /* PL18:描边渐变环(::before)的定位基准 */
  box-sizing: border-box; /* 源 MinHeight 32 含 1px 边框 */
  display: block;
  min-width: 242px; /* TimePickerThemeMinWidth */
  max-width: 456px; /* TimePickerThemeMaxWidth */
  min-height: 32px; /* 源 FlyoutButton 高度 */
  padding: 0;
  font: inherit;
  /* TimePickerButtonForeground = TextFillColorPrimaryBrush(#000000E4 / #FFFFFF) */
  color: var(--wui-text-fill-color-primary);
  text-align: inherit;
  /* TimePickerButtonBackground = ControlFillColorDefaultBrush(#FFFFFFB3 / #FFFFFF0F) */
  background: var(--wui-control-fill-color-default);
  /* 描边由下方 ::before 渐变环呈现(border 保持透明占位,不参与布局) */
  border: 1px solid var(--wui-control-fill-color-transparent);
  border-radius: 4px; /* CornerRadius = ControlCornerRadius */
  cursor: pointer;
  outline: none;
  /* Normal / PointerOver 边框 = TimePickerButtonBorderBrush(PointerOver)
     = ControlElevationBorderBrush(渐变,PL5 --wui-control-elevation-border) */
  --tp-elevation-border: var(--wui-control-elevation-border);
}

/* ======================================================================
 * PL18 字段立体描边环(TimePickerButtonBorderBrush = ControlElevationBorderBrush):
 * 与 DatePicker 同款「内嵌 mask 环」(PL5/PL6 方案):绝对定位伪元素铺满,
 * background 取渐变,mask 差集挖空中心只留 1px 一圈;inset:-1px 把环外缘推回
 * border-box 边缘;绝对定位不参与布局 → 几何/圆角/边框宽/内边距不变。
 * 纯色状态(Pressed/Disabled)把 --tp-elevation-border 置 none,由 border-color 呈现。
 * ====================================================================== */
.wui-time-picker-field::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: var(--tp-elevation-border, none);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

/* —— 状态优先级(对照 VSM):Disabled > Focused > Pressed/Open > PointerOver > Normal —— */
.wui-time-picker:not(.wui-time-picker--disabled) .wui-time-picker-field:hover {
  /* TimePickerButtonForegroundPointerOver = TextFillColorPrimaryBrush */
  color: var(--wui-text-fill-color-primary);
  /* TimePickerButtonBackgroundPointerOver = ControlFillColorSecondaryBrush(#F9F9F980 / #FFFFFF15) */
  background: var(--wui-control-fill-color-secondary);
  /* TimePickerButtonBorderBrushPointerOver = ControlElevationBorderBrush(渐变)→ 环保持 */
}

.wui-time-picker:not(.wui-time-picker--disabled) .wui-time-picker-field:active,
.wui-time-picker:not(.wui-time-picker--disabled).wui-time-picker--open .wui-time-picker-field {
  /* TimePickerButtonForegroundPressed = TextFillColorSecondaryBrush(#0000009E / #FFFFFFC5) */
  color: var(--wui-text-fill-color-secondary);
  /* TimePickerButtonBackgroundPressed = ControlFillColorTertiaryBrush(#F9F9F94D / #FFFFFF08) */
  background: var(--wui-control-fill-color-tertiary);
  /* TimePickerButtonBorderBrushPressed = ControlStrokeColorDefaultBrush(纯色)→ 环 none */
  border-color: var(--wui-control-stroke-color-default);
  --tp-elevation-border: none;
}

/* 聚焦态:源 FocusStates.Focused 为空态 → 权威不覆写底色/前景/边框,聚焦由系统焦点视觉承担。
   本库既有实现以强调色浅底作为焦点视觉(PL7 §8-8 已登记待裁),PL18 未改;
   边框沿 Normal/PointerOver 的渐变环不变。 */
.wui-time-picker:not(.wui-time-picker--disabled) .wui-time-picker-field:focus-visible {
  color: var(--wui-time-picker-button-foreground-focused);
  background: var(--wui-time-picker-button-background-focused);
}

/* —— 三段文本 + 2px 分割线(FlyoutButtonContentGrid)—— */
.wui-time-picker-field-grid {
  display: grid;
  /* 源 FlyoutButtonContentGrid 随 VerticalContentAlignment=Stretch 撑满内容盒,
     其 TextBlock 默认 Stretch + 顶对齐 → 文字自内边距顶起算(PL7:1px 边框 → 文字顶距外缘
     1+3 = 4px)。 */
  align-items: start;
  height: 30px; /* 32 - 2×1 边框(PL7:边框 2→1) */
}

.wui-time-picker-seg {
  min-width: 0;
  padding: 3px 0 6px; /* TimePickerFlyoutPresenterItemPadding 0,3,0,6 */
  overflow: hidden;
  line-height: 19px; /* 19 + 3 + 6 = 28,顶对齐于 30px 内容盒 */
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wui-time-picker-sep {
  width: 2px; /* FirstPickerSpacing / SecondPickerSpacing Width = 2 */
  height: 100%;
  background: var(--wui-time-picker-spacer-fill);
}

/* 空值态(HasNoTime):三段前景转 TimePickerButtonForegroundDefault
   = TextFillColorSecondaryBrush(#0000009E / #FFFFFFC5) */
.wui-time-picker--empty .wui-time-picker-seg {
  color: var(--wui-text-fill-color-secondary);
}

/* 禁用态(Disabled:字段背景/边框/前景 + 标头 + 分割线) */
.wui-time-picker--disabled .wui-time-picker-header {
  /* TimePickerHeaderForegroundDisabled = TextFillColorDisabledBrush(#0000005C / #FFFFFF5D) */
  color: var(--wui-text-fill-color-disabled);
}

.wui-time-picker--disabled .wui-time-picker-field {
  /* TimePickerButtonForegroundDisabled = TextFillColorDisabledBrush(#0000005C / #FFFFFF5D) */
  color: var(--wui-text-fill-color-disabled);
  /* TimePickerButtonBackgroundDisabled = ControlFillColorDisabledBrush(#F9F9F94D / #FFFFFF0B) */
  background: var(--wui-control-fill-color-disabled);
  /* TimePickerButtonBorderBrushDisabled = ControlStrokeColorDefaultBrush(纯色)→ 环 none */
  border-color: var(--wui-control-stroke-color-default);
  --tp-elevation-border: none;
  cursor: default;
}

.wui-time-picker--disabled .wui-time-picker-sep {
  background: var(--wui-time-picker-spacer-fill-disabled);
}

/* 禁用 + 空值:禁用前景优先(与源 Disabled / HasNoTime 状态优先级一致) */
.wui-time-picker--disabled .wui-time-picker-seg {
  color: var(--wui-text-fill-color-disabled);
}

/* ======================================================================
 * 飞出层(TimePickerFlyoutPresenter):Width 242、Border 1、圆角 8、Padding 0
 * ====================================================================== */
.wui-time-picker-layer {
  box-sizing: border-box;
  width: 242px; /* TimePickerFlyoutPresenter Width / MinWidth */
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size); /* FlyoutPresenter FontSize = ControlContentThemeFontSize */
  color: var(--wui-looping-selector-item-foreground);
  background: var(--wui-time-picker-flyout-presenter-background);
  /* TimePickerFlyoutPresenterBorderBrush = SurfaceStrokeColorFlyoutBrush(#0000000F / #00000033) */
  border: 1px solid var(--wui-surface-stroke-color-flyout); /* DateTimeFlyoutBorderThickness = 1 */
  border-radius: var(--wui-popup-corner-radius, 8px); /* OverlayCornerRadius */
  user-select: none;
  -webkit-user-select: none;
}

.wui-time-picker-layer:focus {
  outline: none; /* 焦点由各列 listbox 承担,层根只做键盘事件宿主 */
}

/* —— PickerHostGrid:高 120(3 × 40),中央 40px 高亮带跨全部列 —— */
.wui-time-picker-host {
  position: relative;
  height: 120px;
}

/* TimePickerFlyoutPresenterHighlightFill,VerticalAlignment Center,Height 40 */
.wui-time-picker-highlight {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 40px; /* TimePickerFlyoutPresenterHighlightHeight */
  background: var(--wui-time-picker-flyout-presenter-highlight-fill);
  transform: translateY(-50%);
  pointer-events: none;
}

.wui-time-picker-columns {
  position: relative;
  display: grid;
  align-items: stretch;
  height: 100%;
}

/* —— 列:窗口(3 × 40 视口)+ 22px 悬停展开钮 —— */
.wui-time-picker-col {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.wui-time-picker-col:hover .wui-time-picker-nav {
  visibility: visible;
}

/* —— 窗口:3 行视口,中央为选中行 —— */
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

/* —— 项条:整体 translateY 滚动 —— */
.wui-time-picker-strip {
  position: relative;
  will-change: transform;
  transition: transform var(--wui-duration-fast) var(--wui-easing-standard);
}

.wui-time-picker-item {
  /* border-box:源 ItemHeight 40 为含内边距的行高盒 */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px; /* TimePickerFlyoutPresenterItemHeight */
  margin: 0 2px; /* LoopingSelectorItem ContentPresenter Margin 2,0,2,0 */
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

/* —— 展开钮(LoopingSelector UpButton/DownButton:E70E/E70D,Height 22,FontSize 8,
     默认 Collapsed,PointerOver 才显示)—— */
.wui-time-picker-nav {
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

.wui-time-picker-nav--up {
  top: 0;
}

.wui-time-picker-nav--down {
  bottom: 0;
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

/* —— 键盘焦点(仅键盘打开时显示,鼠标打开不显示焦点框):弹层窗口无 FocusVisualMargin
      键 → Margin 0 族,两环全在元素内 primary [0,2] + secondary [2,3] = 系统双环 —— */
.wui-time-picker-layer.is-keyboard .wui-time-picker-window:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

/* ======================================================================
 * AcceptDismissHostGrid:高 41;顶部 2px 分割线;Accept / Dismiss 各占 1*
 * ====================================================================== */
.wui-time-picker-acceptdismiss {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 41px; /* TimePickerFlyoutPresenterAcceptDismissHostGridHeight */
}

.wui-time-picker-ad-divider {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: var(--wui-time-picker-flyout-presenter-spacer-fill);
}

/* DateTimePickerFlyoutButtonStyle:透明底,FontSize 16,SymbolThemeFontFamily */
.wui-time-picker-ad {
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

.wui-time-picker-ad:hover {
  color: var(--wui-date-time-picker-flyout-button-foreground-pointer-over);
  background: var(--wui-date-time-picker-flyout-button-background-pointer-over);
}

.wui-time-picker-ad:active {
  color: var(--wui-date-time-picker-flyout-button-foreground-pressed);
  background: var(--wui-date-time-picker-flyout-button-background-pressed);
}

/* 系统焦点视觉:确定/取消按钮为 Button 族(FocusVisualMargin=-3)双环在外 */
.wui-time-picker-ad:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* —— 入场 / 离场:弹层经 FlyoutBase 通道(MR1/A3:50px 方向位移组,入场 250ms
   随放置位、离场镜像同速;类与关键帧见 popup.css 的 .wui-popup-anim-flyout[-leave],
   由上方 Transition 的 enter/leave-active-class 挂接,此处不再有 scoped 规则)—— */
</style>
