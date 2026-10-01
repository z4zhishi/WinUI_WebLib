<script setup lang="ts">
// ThemeShadowDemo.vue —— ThemeShadow 演示卡片基建(阶段 7)。
// WinUI ThemeShadow 无模板(generic.xaml 无 ControlTemplate),投影由合成器按
// UIElement.Translation.Z(elevation)绘制到 Receivers 指定的背景层;本组件为 Web 近似:
// 卡片经 src/utils/themeShadow.ts 的多层 box-shadow 施加阴影,舞台内的 receiver 背景层
// 以「阴影紧贴其下方」近似 receiver 语义(真实「只投 Receivers」在 CSS 中不可行,见 wiki)。
// 官方示例源:CK/WinUI-Gallery/WinUIGallery/Samples/ThemeShadow/(200×200 Border +
// Z-translation 滑块 + shadow.Receivers.Add(背景 Grid))。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { CSSProperties } from 'vue'
import {
  resolveThemeShadowElevation,
  themeShadowStyle,
} from '@/utils/themeShadow'
import type { ThemeShadowPresetName, ThemeShadowTheme } from '@/utils/themeShadow'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** elevation(等价 WinUI Translation.Z,px);也接受预设档位名(tooltip/flyout/subMenu/dialog)。 */
    elevation?: number | ThemeShadowPresetName
    /** 阴影主题;auto 跟随站点 html[data-theme](与 demo 壳的主题预览联动)。 */
    theme?: ThemeShadowTheme | 'auto'
    /** 是否可拖动(演示阴影随位置移动);拖动用指针,键盘方向键每次 8px、Home 复位。 */
    draggable?: boolean
    /** 是否显示 receiver 背景层(receiver 语义演示层)。 */
    showReceiver?: boolean
    /** receiver 角标文案。 */
    receiverLabel?: string
    /** 卡片宽(px);官方示例为 200×200。 */
    cardWidth?: number
    /** 卡片高(px)。 */
    cardHeight?: number
    /** 可拖动时的卡片无障碍描述。 */
    cardAriaLabel?: string
  }>(),
  {
    elevation: 32,
    theme: 'auto',
    draggable: false,
    showReceiver: true,
    receiverLabel: 'Receiver',
    cardWidth: 200,
    cardHeight: 200,
    cardAriaLabel: '',
  },
)

const DEFAULT_CARD_ARIA_LABEL = '演示卡片:可拖动,或用方向键每次移动 8px,按 Home 复位位置'

// —— 主题解析:auto 跟随 html[data-theme](DemoPage 预览开关写该属性,观察其变化)——
const observedTheme = ref<ThemeShadowTheme>(
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    ? 'dark'
    : 'light',
)
let themeObserver: MutationObserver | null = null

onMounted(() => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  observedTheme.value = root.dataset.theme === 'dark' ? 'dark' : 'light'
  themeObserver = new MutationObserver(() => {
    observedTheme.value = root.dataset.theme === 'dark' ? 'dark' : 'light'
  })
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = null
})

const resolvedTheme = computed<ThemeShadowTheme>(() =>
  props.theme === 'auto' ? observedTheme.value : props.theme,
)

const resolvedElevation = computed<number>(() => resolveThemeShadowElevation(props.elevation))

// 阴影:elevation/主题驱动(elevation 变化时按 125ms 线性过渡,对应 WinUI Translation 动画)
const shadow = computed<string>(
  () => themeShadowStyle(resolvedElevation.value, { theme: resolvedTheme.value }).boxShadow ?? '',
)

// —— 卡片位置(等价 Translation.X/Y;初始居中,拖动/方向键更新)——
const stageRef = ref<HTMLElement | null>(null)
const cardRef = ref<HTMLElement | null>(null)
const x = ref(0)
const y = ref(0)
const dragging = ref(false)

const KEYBOARD_STEP_PX = 8

const cardStyle = computed<CSSProperties>(() => ({
  boxShadow: shadow.value,
  transform: `translate(${x.value}px, ${y.value}px)`,
  width: `${props.cardWidth}px`,
  height: `${props.cardHeight}px`,
}))

function centerCard(): void {
  const stage = stageRef.value
  const card = cardRef.value
  if (!stage || !card) return
  x.value = Math.max(0, Math.round((stage.clientWidth - card.offsetWidth) / 2))
  y.value = Math.max(0, Math.round((stage.clientHeight - card.offsetHeight) / 2))
}

/** 把位置夹取在舞台内(卡片可整体离开 receiver,但不出舞台)。 */
function clampToStage(nextX: number, nextY: number): void {
  const stage = stageRef.value
  const card = cardRef.value
  if (!stage || !card) {
    x.value = nextX
    y.value = nextY
    return
  }
  const maxX = Math.max(0, stage.clientWidth - card.offsetWidth)
  const maxY = Math.max(0, stage.clientHeight - card.offsetHeight)
  x.value = Math.min(Math.max(0, nextX), maxX)
  y.value = Math.min(Math.max(0, nextY), maxY)
}

onMounted(() => {
  centerCard()
})

// —— 指针拖动(setPointerCapture 保证移出卡片仍持续接收)——
let dragPointerId: number | null = null
let dragStartX = 0
let dragStartY = 0
let dragOriginX = 0
let dragOriginY = 0

function onPointerDown(event: PointerEvent): void {
  if (!props.draggable || dragPointerId !== null) return
  dragPointerId = event.pointerId
  dragging.value = true
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragOriginX = x.value
  dragOriginY = y.value
  cardRef.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId) return
  clampToStage(
    dragOriginX + (event.clientX - dragStartX),
    dragOriginY + (event.clientY - dragStartY),
  )
}

function onPointerUp(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId) return
  dragPointerId = null
  dragging.value = false
  cardRef.value?.releasePointerCapture(event.pointerId)
}

// —— 键盘移动:方向键 8px、Home 复位(拖动演示的键盘可达路径)——
function onKeydown(event: KeyboardEvent): void {
  if (!props.draggable) return
  switch (event.key) {
    case 'ArrowLeft':
      clampToStage(x.value - KEYBOARD_STEP_PX, y.value)
      break
    case 'ArrowRight':
      clampToStage(x.value + KEYBOARD_STEP_PX, y.value)
      break
    case 'ArrowUp':
      clampToStage(x.value, y.value - KEYBOARD_STEP_PX)
      break
    case 'ArrowDown':
      clampToStage(x.value, y.value + KEYBOARD_STEP_PX)
      break
    case 'Home':
      centerCard()
      break
    default:
      return
  }
  event.preventDefault()
}
</script>

<template>
  <div v-bind="$attrs" class="wui-theme-shadow-stage">
    <!-- receiver 背景层:近似 WinUI ThemeShadow.Receivers(阴影只投到指定背景层的观感) -->
    <div v-if="showReceiver" class="wui-theme-shadow-receiver" aria-hidden="true">
      <span class="wui-theme-shadow-receiver-caption">{{ receiverLabel }}</span>
    </div>
    <div
      ref="cardRef"
      class="wui-theme-shadow-card"
      :class="{
        'wui-theme-shadow-card--draggable': draggable,
        'wui-theme-shadow-card--dragging': dragging,
      }"
      :style="cardStyle"
      :tabindex="draggable ? 0 : undefined"
      :role="draggable ? 'button' : undefined"
      :aria-label="draggable ? cardAriaLabel || DEFAULT_CARD_ARIA_LABEL : undefined"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <slot>{{ resolvedElevation }}</slot>
    </div>
  </div>
</template>

<style scoped>
.wui-theme-shadow-stage {
  position: relative;
  min-width: 200px;
  min-height: 200px;
}

/* receiver 背景层:轻微染色 + 边框,示意「被投阴影的背景层」
   (染色/边框取 MenuFlyout 族 token,避免引入 theme.css 之外的色值) */
.wui-theme-shadow-receiver {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 4px 8px;
  background: var(--wui-menu-flyout-item-background-pointer-over);
  border: 1px solid var(--wui-menu-flyout-presenter-border);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
}

.wui-theme-shadow-receiver-caption {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  user-select: none;
}

/* 投影卡片:观感对齐官方示例(200×200、OverlayCornerRadius 圆角、CardBackground 底色);
   CardBackgroundFillColorDefault 无 theme.css token,取最近似的弹层底色 token(wiki 已记差异) */
.wui-theme-shadow-card {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: var(--wui-flyout-presenter-background);
  border: 1px solid var(--wui-menu-flyout-presenter-border);
  border-radius: var(--wui-popup-corner-radius, 8px);
  color: var(--wui-application-foreground-theme);
  /* elevation 变化的过渡:WinUI 以 125ms 线性动画过渡 Translation(ElevationHelper.cpp s_durationTime) */
  transition: box-shadow 125ms linear;
}

.wui-theme-shadow-card--draggable {
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.wui-theme-shadow-card--dragging {
  cursor: grabbing;
  transition: none;
}

/* 系统焦点视觉:浮空卡片按 Button 族约定画系统双环(primary 黑/白外环 2px +
   secondary 1px,FocusVisualMargin=-3),禁用强调蓝 */
.wui-theme-shadow-card--draggable:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}
</style>
