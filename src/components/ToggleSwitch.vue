<script setup lang="ts">
// ToggleSwitch —— WinUI ToggleSwitch 的 Web 复刻。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L11174-L11510
//   (轨道 44x20 圆角 10 / 滑块 20x20 / On 态位移 24 / 内容列间距 12 / MinWidth 154);
//   PL9:状态色重定向到 PL2 Fluent 画刷族(--wui-control-alt-fill-* / --wui-control-strong-stroke-* /
//   --wui-accent-fill-color-* / --wui-text-fill-* / --wui-text-on-accent-fill-color-*;权威键见矩阵 §1.38),
//   滑块 On 态描边(渐变 CircleElevationBorderBrush)按 PL5 mask 环;几何与 240ms 位移动效不变;
//   动效取 src/styles/animations.css 的时长/缓动 token(近似源模板 RepositionThemeAnimation)。
import { computed, ref, useAttrs } from 'vue'
import '../styles/animations.css'

// —— Props(属性名跟随 WinUI camelCase)——
const props = withDefaults(
  defineProps<{
    /** 开关上方的标头文本(WinUI Header);为空时不渲染。 */
    header?: string
    /** 开启时显示的槽内容(WinUI OnContent),默认 'On';传空串隐藏。 */
    onContent?: string
    /** 关闭时显示的槽内容(WinUI OffContent),默认 'Off';传空串隐藏。 */
    offContent?: string
    /** 禁用开关(WinUI IsEnabled=false):不可点击/拖拽/聚焦。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    onContent: 'On',
    offContent: 'Off',
    disabled: false,
  },
)

// —— IsOn 双向绑定(WinUI IsOn)——
const isOn = defineModel<boolean>('isOn', { default: false })

// —— 事件(WinUI 事件名 toggled;仅用户交互改变状态时触发)——
const emit = defineEmits<{ toggled: [] }>()

function commit(next: boolean): void {
  if (isOn.value === next) return
  isOn.value = next
  emit('toggled')
}

// —— $attrs 路由(单根控件,inheritAttrs: false)——
// 根元素只透传非交互 attrs(class/style/id/data-*/title/事件监听等);
// 面向交互的 aria-* 路由到内部 button,保证无障碍属性真正作用到交互元素。
const attrs = useAttrs()

const rootAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const key of Object.keys(attrs)) {
    if (!key.startsWith('aria-')) rest[key] = attrs[key]
  }
  return rest
})

// 可访问名:header(可见标签)优先,其次调用方传入的 aria-label,最后回退固定名,
// 保证无 header 时开关仍有稳定的可读名(role=switch 的可访问名不可为空)。
const accessibleName = computed(() => {
  if (props.header) return props.header
  const raw = attrs['aria-label']
  return typeof raw === 'string' && raw !== '' ? raw : 'Toggle switch'
})

// —— 拖拽(WinUI ManipulationMode=TranslateX + Thumb 的等价实现)——
// 完整闭环:按下捕获指针 → 越过阈值进入拖拽 → 松手按中点提交或回弹;
// 提交后吞掉紧随的合成 click,保证不会“拖拽 + 点击”双切换,也不存在卡死中间态。
const DRAG_THRESHOLD_PX = 4 // 超过视为拖拽而非点击
const KNOB_TRAVEL_PX = 24 // WinUI On 态 KnobTranslateTransform.X = 24(44 - 20)
const SUPPRESS_CLICK_WINDOW_MS = 500

const dragX = ref<number | null>(null)
let activePointerId = -1
let dragStartX = 0
let isDragging = false
let suppressClickUntil = 0

// 拖拽过中点即呈现 On 视觉(轨道填充/滑块圆点),松手后由 commit 定案。
const showOnVisual = computed(() =>
  dragX.value !== null ? dragX.value > KNOB_TRAVEL_PX / 2 : isOn.value,
)

const knobStyle = computed(() =>
  dragX.value !== null ? { '--wui-knob-x': `${dragX.value}px` } : undefined,
)

function onPointerDown(event: PointerEvent): void {
  if (props.disabled || !event.isPrimary || event.button !== 0) return
  activePointerId = event.pointerId
  dragStartX = event.clientX
  isDragging = false
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (props.disabled || event.pointerId !== activePointerId) return
  const dx = event.clientX - dragStartX
  if (!isDragging && Math.abs(dx) > DRAG_THRESHOLD_PX) isDragging = true
  if (!isDragging) return
  const from = isOn.value ? KNOB_TRAVEL_PX : 0
  dragX.value = Math.min(KNOB_TRAVEL_PX, Math.max(0, from + dx))
}

/** 结束拖拽并返回松手时的滑块位置(未发生拖拽返回 null)。 */
function endDrag(): number | null {
  const x = dragX.value
  dragX.value = null
  isDragging = false
  activePointerId = -1
  return x
}

function onPointerUp(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) return
  const x = endDrag()
  if (x === null) return // 原地按下抬起:交给原生 click 切换
  suppressClickUntil = Date.now() + SUPPRESS_CLICK_WINDOW_MS
  commit(x > KNOB_TRAVEL_PX / 2)
}

function onPointerCancel(event: PointerEvent): void {
  if (event.pointerId !== activePointerId) return
  endDrag() // 回弹到当前 isOn 位置,不提交
  suppressClickUntil = Date.now() + SUPPRESS_CLICK_WINDOW_MS
}

// 指针捕获被外力剥夺的兜底(正常 up/cancel 后本事件再触发时 dragX 已为 null,幂等)。
function onLostPointerCapture(): void {
  if (dragX.value === null) return
  endDrag()
  suppressClickUntil = Date.now() + SUPPRESS_CLICK_WINDOW_MS
}

function onButtonClick(): void {
  // 拖拽提交后浏览器会补发一次合成 click,在时间窗内吞掉;键盘触发的 click 不受影响。
  if (Date.now() < suppressClickUntil) return
  commit(!isOn.value)
}
</script>

<template>
  <div v-bind="rootAttrs" class="wui-switch">
    <button
      type="button"
      role="switch"
      class="wui-switch-button"
      :class="{
        'wui-switch--on': showOnVisual,
        'wui-switch--dragging': dragX !== null,
      }"
      :aria-checked="isOn"
      :aria-label="accessibleName"
      :disabled="disabled"
      @click="onButtonClick"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @lostpointercapture="onLostPointerCapture"
    >
      <span v-if="header" class="wui-switch-header">{{ header }}</span>
      <span class="wui-switch-body">
        <span class="wui-switch-track" aria-hidden="true">
          <!-- F1:拖拽内联 --wui-knob-x 必须直接绑在滑块上 —— 内联声明才能压过
               .wui-switch--on .wui-switch-knob { --wui-knob-x: 24px } 的直接类声明
               (若绑在祖先 button 上则为"继承值",会被直接类声明压过,拖拽上半程钉死在 24px)。 -->
          <span class="wui-switch-knob" :style="knobStyle"></span>
        </span>
        <span
          v-if="offContent"
          class="wui-switch-text wui-switch-text--off"
          aria-hidden="true"
          >{{ offContent }}</span
        >
        <span
          v-if="onContent"
          class="wui-switch-text wui-switch-text--on"
          aria-hidden="true"
          >{{ onContent }}</span
        >
      </span>
    </button>
  </div>
</template>

<style scoped>
/*
 * 结构对照 generic.xaml ToggleSwitch ControlTemplate(L11188-L11510):
 * 根 Grid → 标头行 + 主体网格(3 行 6/Auto/6、3 列 Auto/12/Auto,MinWidth 154)。
 */

.wui-switch {
  display: inline-flex;
  flex-direction: column;
  font-family: inherit; /* ContentControlThemeFontFamily 为 XamlAutoFontFamily 占位,回退浏览器默认 */
  font-size: var(--wui-control-content-theme-font-size);
}

/* —— 整行按钮:点击/键盘/拖拽的交互目标(role=switch)—— */
.wui-switch-button {
  display: inline-flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  font: inherit;
  color: var(--wui-text-fill-color-primary); /* ToggleSwitchContentForeground = TextFillColorPrimaryBrush */
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  /* 水平拖拽归开关,垂直滚动手势留给页面 */
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.wui-switch-button:disabled {
  cursor: default;
}

/* —— 标头(ToggleSwitchTopHeaderMargin 0,0,0,4)—— */
.wui-switch-header {
  display: block;
  margin: 0 0 4px;
  color: var(--wui-text-fill-color-primary); /* ToggleSwitchHeaderForeground = TextFillColorPrimaryBrush */
}

/* —— 主体网格 —— */
.wui-switch-body {
  display: inline-grid;
  /* 首列钉死轨道宽 44px:CSS 的 auto 轨道默认会被 justify-content:normal(=stretch)吸收
     MinWidth 富余空间,把文案推离轨道(XAML Auto 列按内容定宽,余量留在右侧,不分配给轨道)。
     justify-content:start 进一步保证 auto 列按 max-content 定宽,复刻 XAML 的 Auto 语义。
     源:generic.xaml L11434-L11443(Auto / 12(MaxWidth 12) / Auto;MinWidth=154;HorizontalAlignment=Left)。 */
  grid-template-columns: 44px 12px auto; /* 轨道 44 + 内容列间距 12(L11437)+ On/Off 文案 */
  grid-template-rows: 6px auto 6px; /* Pre/PostContentMargin = 6(L5944-L5945) */
  justify-content: start;
  min-width: 154px; /* ToggleSwitchThemeMinWidth(L5950) */
}

/* —— 轨道:OuterBorder / SwitchKnobBounds 叠加(44x20,Radius 10,Off 描边 2px)—— */
.wui-switch-track {
  position: relative;
  box-sizing: border-box;
  grid-row: 2;
  grid-column: 1;
  width: 44px;
  height: 20px;
  background: var(--wui-control-alt-fill-color-secondary); /* ToggleSwitchFillOff = ControlAltFillColorSecondaryBrush */
  border: 2px solid var(--wui-control-strong-stroke-color-default); /* ToggleSwitchStrokeOff = ControlStrongStrokeColorDefaultBrush */
  border-radius: 10px; /* RadiusX/Y=10:胶囊结构尺寸(全圆角) */
}

.wui-switch--on .wui-switch-track {
  background: var(--wui-accent-fill-color-default); /* ToggleSwitchFillOn = AccentFillColorDefaultBrush */
  border-color: transparent; /* ToggleSwitchOnStrokeThickness = 0(L108) */
}

/* —— 滑块(SwitchKnob 20x20,On 态 TranslateTransform.X=24)—— */
.wui-switch-knob {
  position: absolute;
  top: -2px; /* 抵消轨道 2px 描边,以 WinUI Rectangle 边框盒为坐标系 */
  left: -2px;
  width: 20px;
  height: 20px;
  transform: translateX(var(--wui-knob-x, 0px));
  /* 近似源 RepositionThemeAnimation(平台内置时长/曲线);取 animations.css 的 normal + standard token */
  transition: transform var(--wui-duration-normal) var(--wui-easing-standard);
}

.wui-switch--on .wui-switch-knob {
  --wui-knob-x: 24px;
}

/* 拖拽中滑块跟手,无过渡 */
.wui-switch--dragging .wui-switch-knob {
  transition: none;
}

/* 滑块圆点(SwitchKnobOn/Off 10x10 Ellipse 居中) */
.wui-switch-knob::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: var(--wui-text-fill-color-secondary); /* ToggleSwitchKnobFillOff = TextFillColorSecondaryBrush */
  z-index: 0;
}

.wui-switch--on .wui-switch-knob::after {
  background: var(--wui-text-on-accent-fill-color-primary); /* ToggleSwitchKnobFillOn = TextOnAccentFillColorPrimaryBrush */
}

/* PL9 滑块渐变描边环(权威键 ToggleSwitchKnobStrokeOn = CircleElevationBorderBrush,静止不随状态切换)。
   几何:环厚 1px,外缘与圆点 10x10 盒对齐(inset:5px 同圆点);绝对定位/不参与布局 → 几何与
   240ms 位移过渡不变。z-index 置 1 使其叠在圆点填充(::after)之上,呈 border 观感。 */
.wui-switch-knob::before {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  padding: 1px;
  background: none;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 1;
}

.wui-switch--on .wui-switch-knob::before {
  background: var(--wui-circle-elevation-border);
}

/* —— On/Off 槽内容:同格叠加,Opacity 切换(源 ContentStates Duration=0,无淡入淡出)—— */
.wui-switch-text {
  display: flex;
  grid-row: 1 / 4;
  grid-column: 3;
  align-items: center;
  color: var(--wui-text-fill-color-primary); /* ToggleSwitchContentForeground */
  opacity: 0;
  pointer-events: none;
}

.wui-switch-button:not(.wui-switch--on) .wui-switch-text--off {
  opacity: 1;
}

.wui-switch--on .wui-switch-text--on {
  opacity: 1;
}

/* —— PointerOver(源 CommonStates/PointerOver,DiscreteObjectKeyFrame 即时切换)—— */
.wui-switch-button:hover:not(:disabled) .wui-switch-track {
  background: var(--wui-control-alt-fill-color-tertiary); /* ToggleSwitchFillOffPointerOver = ControlAltFillColorTertiary */
  border-color: var(--wui-control-strong-stroke-color-default); /* ToggleSwitchStrokeOffPointerOver = ControlStrongStrokeColorDefault */
}

.wui-switch--on:hover:not(:disabled) .wui-switch-track {
  background: var(--wui-accent-fill-color-secondary); /* ToggleSwitchFillOnPointerOver = AccentFillColorSecondaryBrush */
  border-color: transparent;
}

.wui-switch-button:hover:not(:disabled) .wui-switch-knob::after {
  background: var(--wui-text-fill-color-secondary); /* ToggleSwitchKnobFillOffPointerOver = TextFillColorSecondaryBrush */
}

.wui-switch--on:hover:not(:disabled) .wui-switch-knob::after {
  background: var(--wui-text-on-accent-fill-color-primary); /* ToggleSwitchKnobFillOnPointerOver */
}

/* —— Pressed(描边厚度归 0 + 填充按压色);拖拽中不套用按压配色 —— */
.wui-switch-button:active:not(:disabled):not(.wui-switch--dragging) .wui-switch-track {
  background: var(--wui-control-alt-fill-color-quarternary); /* ToggleSwitchFillOffPressed = ControlAltFillColorQuarternary */
  border-color: var(--wui-control-strong-stroke-color-default); /* ToggleSwitchStrokeOffPressed = ControlStrongStrokeColorDefault */
}

.wui-switch--on:active:not(:disabled):not(.wui-switch--dragging) .wui-switch-track {
  background: var(--wui-accent-fill-color-tertiary); /* ToggleSwitchFillOnPressed = AccentFillColorTertiaryBrush */
}

.wui-switch-button:active:not(:disabled):not(.wui-switch--dragging) .wui-switch-knob::after {
  background: var(--wui-text-fill-color-secondary); /* ToggleSwitchKnobFillOffPressed */
}

.wui-switch--on:active:not(:disabled):not(.wui-switch--dragging) .wui-switch-knob::after {
  background: var(--wui-text-on-accent-fill-color-primary); /* ToggleSwitchKnobFillOnPressed */
}

/* —— Disabled —— */
.wui-switch-button:disabled .wui-switch-header {
  color: var(--wui-text-fill-color-disabled); /* ToggleSwitchHeaderForegroundDisabled = TextFillColorDisabledBrush */
}

.wui-switch-button:disabled .wui-switch-text {
  color: var(--wui-text-fill-color-disabled); /* ToggleSwitchContentForegroundDisabled */
}

.wui-switch-button:disabled .wui-switch-track {
  background: var(--wui-control-alt-fill-color-disabled); /* ToggleSwitchFillOffDisabled = ControlAltFillColorDisabled */
  border-color: var(--wui-control-strong-stroke-color-disabled); /* ToggleSwitchStrokeOffDisabled = ControlStrongStrokeColorDisabled */
}

.wui-switch--on:disabled .wui-switch-track {
  background: var(--wui-accent-fill-color-disabled); /* ToggleSwitchFillOnDisabled = AccentFillColorDisabledBrush */
  border-color: transparent;
}

.wui-switch-button:disabled .wui-switch-knob::after {
  background: var(--wui-text-fill-color-disabled); /* ToggleSwitchKnobFillOffDisabled = TextFillColorDisabledBrush */
}

.wui-switch--on:disabled .wui-switch-knob::after {
  background: var(--wui-text-on-accent-fill-color-disabled); /* ToggleSwitchKnobFillOnDisabled = TextOnAccentFillColorDisabledBrush */
}

/* —— Focus:系统焦点主色(源 UseSystemFocusVisuals + FocusVisualMargin=-7,-3,-7,-3,
   主色 = SystemBaseHighColor → theme.css --wui-system-control-focus-visual-primary:
   亮 #000000 / 暗 #ffffff);库内 Button/CheckBox/RadioButton/DropDownButton 同源同键,
   双环→单环为全站已登记近似 —— 见 wiki 差异节。 */
.wui-switch-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-switch-button:focus:not(:focus-visible) {
  outline: none;
}
</style>
