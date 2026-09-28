<script setup lang="ts">
// RepeatButton.vue —— WinUI RepeatButton 控件的 Web 复刻(阶段 1 基础控件)。
// 视觉与状态对照源:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L6081 起
// TargetType="RepeatButton" 的 Style/ControlTemplate —— Normal/PointerOver/Pressed/Disabled
// 四态(DiscreteObjectKeyFrame 即时切换)+ UseSystemFocusVisuals 焦点视觉。
// 重复行为对照源:dxaml/xcp/dxaml/lib/RepeatButton_Partial.cpp ——
//   · Initialize() 固定 ClickMode = Press:按下(pointerdown)立即触发一次 click;
//   · StartTimer():计时器先以 Delay 为间隔启动;TickCallback() 每次滴答把间隔改写为
//     Interval 后继续(首次重复延迟 Delay,之后每 Interval 触发,间隔可实时生效);
//   · 指针松开 / 移出(IsPointerOver=false)/ 失焦 / IsEnabled=false → StopTimer;
//   · 键盘 Space 按下开始重复(Windows 自动重复的 keydown 只置位,节奏交给计时器),
//     Space 抬起停止;Enter 沿 keydown 单次触发(按住随 OS 自动重复);两者均
//     preventDefault 抑制浏览器补发的原生 click,避免与组件发出的 click 重复;
//   · Delay < 0 或 Interval <= 0 源码抛错,Web 侧钳制(delay≥0、interval≥1)。
// 默认值对照源:dxaml/xcp/components/DependencyObject/DependencyProperty.cpp ——
//   RepeatButton_Delay = 500ms、RepeatButton_Interval = 33ms。
// 颜色/字号/圆角一律使用 theme.css 的 --wui-* token,无硬编码色值。
import { onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 按钮文本内容;更复杂内容(图标、图片等)用默认插槽放置(兜底显示本属性)。 */
    content?: string
    /** 按住后开始重复前的延迟,单位 ms;源默认 500(RepeatButton_Delay)。 */
    delay?: number
    /** 重复触发间隔,单位 ms;源默认 33(RepeatButton_Interval)。 */
    interval?: number
    /** 是否禁用(对应 WinUI IsEnabled)。 */
    disabled?: boolean
  }>(),
  {
    content: '',
    delay: 500,
    interval: 33,
    disabled: false,
  },
)

// 显式声明 click:外部 @click 监听不再经 $attrs 透传到根节点,避免原生 click 重复触发。
const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

defineOptions({
  // class/style 由根节点 v-bind="$attrs" 透传,其余 attrs(aria-* 等)一并透传。
  inheritAttrs: false,
})

// —— 重复会话状态(非响应式:计时器句柄不进入渲染)——
let delayHandle: number | null = null
let tickHandle: number | null = null
/** 本轮按住发起自指针时,保存 pointerdown 事件,重复滴答沿用其作为 click 参数。 */
let pressEvent: PointerEvent | null = null
/** 指针按住移出后仍按住移回:WinUI UpdateRepeatState 允许重新开始重复(IsPressed && IsPointerOver)。 */
let pointerArmed = false
/** Space 按住期间置位:OS 自动重复的 keydown 不再重复发 click,节奏交给计时器。 */
let spaceSession = false

/** Delay / Interval 钳制:源对 Delay<0、Interval<=0 抛错,Web 侧取合法最近值。 */
function normalizedDelay(): number {
  const value = Math.floor(Number(props.delay))
  return Number.isFinite(value) ? Math.max(0, value) : 500
}

function normalizedInterval(): number {
  const value = Math.floor(Number(props.interval))
  return Number.isFinite(value) ? Math.max(1, value) : 33
}

function fireClick(): void {
  emit('click', pressEvent ?? new MouseEvent('click'))
}

function beginRepeat(): void {
  if (props.disabled || delayHandle !== null || tickHandle !== null) return
  delayHandle = window.setTimeout(() => {
    delayHandle = null
    fireClick()
    scheduleTick()
  }, normalizedDelay())
}

// 用 setTimeout 链而非 setInterval:每次滴答重读 interval,与 WinUI TickCallback
// (滴答时把计时器间隔改写为当前 Interval)行为一致。
function scheduleTick(): void {
  tickHandle = window.setTimeout(() => {
    tickHandle = null
    fireClick()
    scheduleTick()
  }, normalizedInterval())
}

function stopRepeat(): void {
  if (delayHandle !== null) {
    window.clearTimeout(delayHandle)
    delayHandle = null
  }
  if (tickHandle !== null) {
    window.clearTimeout(tickHandle)
    tickHandle = null
  }
}

function endPress(disarm: boolean): void {
  stopRepeat()
  if (disarm) {
    pressEvent = null
    pointerArmed = false
  }
}

// —— 指针交互:按下触发 + 开始计时;抬起/取消/移出停止 ——
function onPointerDown(event: PointerEvent): void {
  if (props.disabled || event.button !== 0) return
  pressEvent = event
  pointerArmed = true
  fireClick()
  beginRepeat()
  // 触摸指针默认被隐式捕获到按钮,滑出不会触发 pointerleave;
  // 主动释放捕获,让手指移出即停(与 WinUI IsPointerOver=false → StopTimer 一致)。
  const el = event.currentTarget
  if (el instanceof HTMLElement && event.pointerType !== 'mouse') {
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
  }
}

function onPointerEnter(event: PointerEvent): void {
  if (pointerArmed && (event.buttons & 1) === 1) beginRepeat()
}

function onPointerLeave(): void {
  // 保留武装标记:按住移出再移回可恢复重复(WinUI 同款行为)
  stopRepeat()
}

function onPointerUp(): void {
  endPress(true)
}

function onPointerCancel(): void {
  endPress(true)
}

// —— 键盘交互:Space 按住重复(与 WinUI OnKeyDown/OnKeyUp 一致),Enter 单击沿 keydown ——
const SPACE_KEYS = new Set([' ', 'Spacebar'])

/** 键盘触发的 click 无原生鼠标事件可带,合成一个 MouseEvent 保持载荷类型统一。 */
function fireKeyboardClick(): void {
  emit('click', new MouseEvent('click'))
}

function onKeyDown(event: KeyboardEvent): void {
  if (props.disabled) return
  if (SPACE_KEYS.has(event.key)) {
    // 抑制浏览器在 keyup 时补发的原生 click:WinUI Press 模式下 Space keyup 不触发 click,
    // 组件已在 keydown 发出,原生补发会造成重复计数。
    event.preventDefault()
    if (spaceSession) return // OS 自动重复的 keydown:节奏交给计时器
    spaceSession = true
    fireKeyboardClick()
    beginRepeat()
  } else if (event.key === 'Enter') {
    // 同理抑制原生 click,统一由组件发出;按住 Enter 随 OS 自动重复逐次触发(与原生 button 一致)
    event.preventDefault()
    fireKeyboardClick()
  }
}

function onKeyUp(event: KeyboardEvent): void {
  if (!SPACE_KEYS.has(event.key)) return
  spaceSession = false
  endPress(true)
}

// WinUI OnLostFocus:失焦停止重复
function onFocusOut(): void {
  spaceSession = false
  endPress(true)
}

// IsEnabled=false → UpdateRepeatState 停止重复
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      spaceSession = false
      endPress(true)
    }
  },
)

// 组件卸载时清理计时器
onBeforeUnmount(() => {
  endPress(true)
})
</script>

<template>
  <!-- 原生 button 自带 role="button" 与可聚焦语义,键盘可达性免费获得 -->
  <button
    type="button"
    class="wui-repeat-button"
    :disabled="disabled"
    v-bind="$attrs"
    @pointerdown="onPointerDown"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @keydown="onKeyDown"
    @keyup="onKeyUp"
    @focusout="onFocusOut"
  >
    <slot>{{ content }}</slot>
  </button>
</template>

<style scoped>
.wui-repeat-button {
  /* ButtonPadding="8,4,8,5"(RepeatButton 样式复用同一 StaticResource) */
  padding: 4px 8px 5px;
  font-family: var(--wui-content-control-theme-font-family);
  /* ControlContentThemeFontSize = 14px */
  font-size: var(--wui-control-content-theme-font-size);
  /* FontWeight="Normal" */
  font-weight: 400;
  color: var(--wui-repeat-button-foreground);
  background: var(--wui-repeat-button-background);
  /* RepeatButtonBorderThemeThickness = 2 */
  border: 2px solid var(--wui-repeat-button-border);
  /* WinUI 3 默认 ControlCornerRadius = 4;无同名 token,取最近似的圆角 token(见 wiki 差异节) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  cursor: default;
  user-select: none;
  touch-action: manipulation;
}

/* 状态色一律即时切换(generic.xaml 各态均为 DiscreteObjectKeyFrame,无过渡动画) */

.wui-repeat-button:hover:not(:disabled) {
  color: var(--wui-repeat-button-foreground-pointer-over);
  background: var(--wui-repeat-button-background-pointer-over);
  border-color: var(--wui-repeat-button-border-brush-pointer-over);
}

.wui-repeat-button:active:not(:disabled) {
  color: var(--wui-repeat-button-foreground-pressed);
  background: var(--wui-repeat-button-background-pressed);
  border-color: var(--wui-repeat-button-border-brush-pressed);
}

.wui-repeat-button:disabled {
  color: var(--wui-repeat-button-foreground-disabled);
  background: var(--wui-repeat-button-background-disabled);
  border-color: var(--wui-repeat-button-border-brush-disabled);
  cursor: default;
}

/* 系统焦点视觉:WinUI 双环(FocusVisualPrimary 内环 + FocusVisualSecondary 外环,
   FocusVisualMargin=-3)近似为 primary 色单环 outline */
.wui-repeat-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-repeat-button:focus:not(:focus-visible) {
  outline: none;
}
</style>
