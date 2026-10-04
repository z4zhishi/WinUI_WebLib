<script lang="ts">
// 模块级导出与状态(<script setup> 内不允许 export / 模块级可变状态)
/** WinUI ToolTip.Placement / ToolTipService.PlacementMode 取值(MUX PlacementMode 枚举)。 */
export type ToolTipPlacementValue = 'Top' | 'Bottom' | 'Left' | 'Right' | 'Auto'

/** 层 id 计数(模块级,保证 aria-describedby 全页唯一)。 */
let tooltipUidCounter = 0
</script>

<script setup lang="ts">
// ToolTip —— WinUI ToolTip 的 Web 复刻:悬停 / 键盘聚焦 / 触屏长按目标元素时,
// 在其旁边弹出非交互的短说明(默认 1s 延迟出现、5s 超时自动关、Esc 可关)。
//
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L11537-11586
//   (Default style for ToolTip:FontSize 12、Padding 8,5,8,7、MaxWidth 320、
//   FadeIn/FadeOutThemeAnimation)+ controls/dev/CommonStyles/ToolTip_themeresources.xaml
//   L42-77(MUX DefaultToolTipStyle:Padding 9,6,9,8、ToolTipMaxWidth 320、
//   CornerRadius ControlCornerRadius、BackgroundSizing InnerBorderEdge)。
//   背景/描边/前景三色由基建皮肤类 .wui-popup-skin-tooltip(src/styles/popup.css)声明,
//   但 PL10 起组件在 .wui-tooltip(带 [data-v],特异性更高)内显式重定向到权威 Fluent 键:
//   前景 = TextFillColorPrimaryBrush、描边 = SurfaceStrokeColorFlyoutBrush、
//   背景 = AcrylicInAppFillColorDefaultBrush(亚克力;WinUI 3 ToolTipBackgroundBrush)。
//   web 无原生亚克力(PL1 未决),取权威表 §4.2 的不透明回退色 浅 #F9F9F9 / 深 #2C2C2C
//   作近似(旧版 ChromeMediumLow #f2f2f2/#2b2b2b 为 legacy 近似,已弃)。
//
// 行为规格:ToolTipService_Partial.cpp / ToolTip_Partial.cpp ——
//   - 默认 PlacementMode = Top(ToolTip_Partial.h L70-72);
//   - InitialShowDelay:系统 MouseHoverTime(实现回退 400ms),WinRT 文档默认 1000ms,
//     此处取 1000ms(任务口径);ShowDuration = DEFAULT_SHOW_DURATION_SECONDS = 5s;
//   - 定位:MoveNearRect 贴边无间距(主轴 offset 0)、交叉轴居中、放不下换边/推回
//     (ToolTipService_Partial.cpp L1957-2130)→ 映射到 usePopupLayer 的
//     placement/flip/shift,滚动只跟随不关闭(基建约定表);
//   - Esc 关闭、按下即隐藏;触屏长按显示、抬指即关(Web 适配,见 wiki 差异节)。
//
// 弹层基建:定位/层级(z-index 自动分配)/flip/shift 全部交给
//   usePopupAnchor + usePopupLayer(wiki/controls/_popup-infra.md),本组件不手写几何。
//
// 无障碍:层 role="tooltip" + 自动 id;目标元素挂 aria-describedby(常驻,APG tooltip
//   模式),包装模式下自动落到首个可聚焦后代;键盘聚焦(仅 :focus-visible)同样按
//   delay 延迟弹出,对应 WinUI 键盘输入模式也开 tooltip 的行为。
import { computed, isRef, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toValue } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import type { PopupOffset, PopupPlacement } from '@/composables/usePopup'
// 亚克力材质共享层(ToolTipBackgroundBrush = AcrylicInAppFillColorDefaultBrush;PL20)
import '../styles/acrylic.css'

const props = withDefaults(
  defineProps<{
    /** 提示文本(WinUI Content 的 string 形态);富内容用默认插槽,插槽优先。 */
    content?: string
    /** 放置位(WinUI Placement):Top(默认)/ Bottom / Left / Right;Auto 按位置自适应。 */
    placement?: ToolTipPlacementValue
    /**
     * 目标元素(WinUI Target / ToolTipService.PlacementTarget):HTMLElement 或
     * CSS 选择器。传入后组件不再渲染包装元素(target 直连模式);
     * 不传时用 #target 插槽作为目标(包装模式)。
     */
    target?: HTMLElement | string | null
    /** 出现延迟 ms(WinUI ToolTipService.InitialShowDelay,文档默认 1000)。 */
    delay?: number
    /** 显示时长 ms,超时自动关(WinUI ToolTipService.ShowDuration,默认 5000)。 */
    showDuration?: number
    /** 最大宽度 px(WinUI ToolTipMaxWidth = 320)。 */
    maxWidth?: number
    /** 水平偏移 px,正值向右(WinUI HorizontalOffset)。 */
    horizontalOffset?: number
    /** 垂直偏移 px,正值向下(WinUI VerticalOffset;官方示例 VerticalOffset="-80")。 */
    verticalOffset?: number
  }>(),
  {
    content: '',
    placement: 'Top',
    target: null,
    delay: 1000,
    showDuration: 5000,
    maxWidth: 320,
    horizontalOffset: 0,
    verticalOffset: 0,
  },
)

defineOptions({ name: 'WuiToolTip', inheritAttrs: false })

// —— IsOpen(WinUI ToolTip.IsOpen):双向;程序化置 true 立即开(不走 delay)——
const isOpen = defineModel<boolean>('isOpen', { default: false })

// —— 事件(WinUI ToolTip.Opened / Closed)——
const emit = defineEmits<{ opened: []; closed: [] }>()

// —— 插槽类型契约(富内容 default / 目标 target;模板直接使用,无需实例)——
defineSlots<{
  /** 富提示内容(WinUI Content 对象形态);缺省渲染 content 属性文本。 */
  default?: () => unknown
  /** 包装模式的目标元素(未传 target 属性时使用)。 */
  target?: () => unknown
}>()

/* -------------------------------------------------------------------------
 * 锚解析:target 属性直连模式 / #target 插槽包装模式
 * ---------------------------------------------------------------------- */

const { anchorRef } = usePopupAnchor()

/**
 * 外部 target 解析结果。setup 阶段即解析一次(元素型直传立即可用,
 * 且早于 usePopupLayer 的缺锚告警);选择器型在 mounted 再补解析一次,
 * 覆盖目标元素晚于本组件挂载的场景。
 */
const externalTarget = ref<HTMLElement | null>(resolveTargetProp(props.target))

const hasTargetProp = computed(() => props.target != null)

function resolveTargetProp(source: unknown): HTMLElement | null {
  if (source == null) return null
  if (isRef(source)) return resolveTargetProp(source.value) // 编程式用法传 Ref 的兜底
  if (typeof source === 'string') {
    if (typeof document === 'undefined' || source.trim() === '') return null
    return document.querySelector<HTMLElement>(source)
  }
  if (source instanceof HTMLElement) return source
  return null
}

/**
 * 定位锚与事件宿主:外部 target → 该元素;包装模式 → 槽内首个元素子节点
 * (rect 精确,包装 span 不参与),退化到包装 span 自身。
 */
const anchorEl = computed<HTMLElement | null>(() => {
  if (externalTarget.value) return externalTarget.value
  const wrapper = anchorRef.value
  if (!wrapper) return null
  const first = wrapper.firstElementChild
  return first instanceof HTMLElement ? first : wrapper
})

watch(anchorEl, () => {
  rebindTarget()
  applyAriaDescribedby()
})

/* -------------------------------------------------------------------------
 * 弹层定位(usePopupLayer;选项 getter 保持响应式)
 * ---------------------------------------------------------------------- */

/** WinUI Placement → 基建 placement;Auto 归位 Top,由 flip 提供自适应(见 wiki)。 */
const PLACEMENT_MAP: Record<ToolTipPlacementValue, PopupPlacement> = {
  Top: 'top',
  Bottom: 'bottom',
  Left: 'left',
  Right: 'right',
  Auto: 'top',
}

/** Horizontal/VerticalOffset(文档空间,右/下为正)→ 基建 mainAxis/crossAxis。 */
const popupOffset = computed<PopupOffset>(() => {
  const h = props.horizontalOffset
  const v = props.verticalOffset
  switch (props.placement) {
    case 'Bottom':
      return { mainAxis: v, crossAxis: h }
    case 'Left':
      return { mainAxis: -h, crossAxis: v }
    case 'Right':
      return { mainAxis: h, crossAxis: v }
    default: // Top / Auto
      return { mainAxis: -v, crossAxis: h }
  }
})

function closeNow(): void {
  clearTimers()
  isOpen.value = false
}

const popupLayer = usePopupLayer({
  anchor: anchorEl,
  placement: () => PLACEMENT_MAP[props.placement],
  offset: popupOffset,
  // 外部按下即关是本组件在基建约定表(ToolTip 行 = 不监听 onOutsidePress)之上的
  // 增量决策:鼠标路径的提示已随 pointerleave 提前关闭,该回调实际服务触屏长按
  // 之后的收回与「用户已转向他处」两种残留态(语义差异已在 wiki 差异节挂账)。
  onOutsidePress: closeNow,
  onEscape: closeNow,
  // 滚动:跟随重定位,不关闭(基建约定表 ToolTip 行 = 不监听 onAnchorScroll)。
})

/* -------------------------------------------------------------------------
 * 开关时序:delay 出现 / showDuration 超时 / 长按
 * ---------------------------------------------------------------------- */

let showTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined

function clearTimers(): void {
  if (showTimer !== undefined) {
    clearTimeout(showTimer)
    showTimer = undefined
  }
  if (hideTimer !== undefined) {
    clearTimeout(hideTimer)
    hideTimer = undefined
  }
}

/** 按 delay 延迟打开(mouse hover / 键盘聚焦 / 触屏长按共用)。 */
function scheduleOpen(): void {
  if (isOpen.value || showTimer !== undefined) return
  if (hideTimer !== undefined) {
    clearTimeout(hideTimer)
    hideTimer = undefined
  }
  showTimer = setTimeout(() => {
    showTimer = undefined
    isOpen.value = true
  }, Math.max(0, props.delay))
}

// 打开 → 挂载后补一次定位(异步内容场景)+ 启动 showDuration 超时;
// 关闭 → 事件(WinUI Opened/Closed 同序)。
watch(isOpen, (now) => {
  if (now) {
    void nextTick(() => popupLayer.update())
    if (props.showDuration > 0) {
      hideTimer = setTimeout(() => {
        hideTimer = undefined
        isOpen.value = false
      }, props.showDuration)
    }
    emit('opened')
  } else {
    emit('closed')
  }
})

onBeforeUnmount(clearTimers)

/* -------------------------------------------------------------------------
 * 目标元素事件(编程式绑定,直连 / 包装两模式同一代码路径)
 * ---------------------------------------------------------------------- */

let boundEl: HTMLElement | null = null
/** 触屏长按期间记录 pointerId( slop 内移动视为按住不动)。 */
let touchPointerId: number | null = null
let touchStartX = 0
let touchStartY = 0
const TOUCH_SLOP = 8

function onPointerEnter(event: PointerEvent): void {
  // 触屏的 enter 随点按出现,交由长按路径处理
  if (event.pointerType === 'touch') return
  scheduleOpen()
}

function onPointerLeave(event: PointerEvent): void {
  if (event.pointerType === 'touch') return
  closeNow()
}

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType === 'touch') {
    // 触屏长按显示(延迟同 delay);移动超 slop 取消
    touchPointerId = event.pointerId
    touchStartX = event.clientX
    touchStartY = event.clientY
    scheduleOpen()
    return
  }
  // WinUI:按下目标即隐藏(不再等待)
  closeNow()
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerType !== 'touch') return
  if (touchPointerId !== event.pointerId || showTimer === undefined) return
  const dx = event.clientX - touchStartX
  const dy = event.clientY - touchStartY
  if (dx * dx + dy * dy > TOUCH_SLOP * TOUCH_SLOP) {
    // 滑动手势:取消尚未生效的长按
    clearTimeout(showTimer)
    showTimer = undefined
    touchPointerId = null
  }
}

function onPointerUp(event: PointerEvent): void {
  if (event.pointerType !== 'touch') return
  if (touchPointerId !== event.pointerId) return
  touchPointerId = null
  // Web 适配:抬指即关(WinUI 触屏抬指后 tooltip 常驻到下次点按,差异见 wiki)
  closeNow()
}

function onFocusIn(event: FocusEvent): void {
  const el = event.target
  // 仅键盘焦点(:focus-visible)触发,鼠标点按带来的焦点不算(WinUI 键盘输入模式)
  if (el instanceof HTMLElement && el.matches(':focus-visible')) scheduleOpen()
}

function onFocusOut(): void {
  closeNow()
}

type TargetHandler = [string, (event: Event) => void]

const targetHandlers: TargetHandler[] = [
  ['pointerenter', onPointerEnter as (event: Event) => void],
  ['pointerleave', onPointerLeave as (event: Event) => void],
  ['pointerdown', onPointerDown as (event: Event) => void],
  ['pointermove', onPointerMove as (event: Event) => void],
  ['pointerup', onPointerUp as (event: Event) => void],
  ['pointercancel', onPointerUp as (event: Event) => void],
  ['focusin', onFocusIn as (event: Event) => void],
  ['focusout', onFocusOut],
]

function rebindTarget(): void {
  const el = toValue(anchorEl)
  if (el === boundEl) return
  if (boundEl) {
    for (const [type, handler] of targetHandlers) boundEl.removeEventListener(type, handler)
  }
  boundEl = el
  if (el) {
    for (const [type, handler] of targetHandlers) el.addEventListener(type, handler)
  }
}

/* -------------------------------------------------------------------------
 * 无障碍:aria-describedby(APG tooltip 模式,常驻挂在目标元素上)
 * ---------------------------------------------------------------------- */

const layerId = `wui-tooltip-${++tooltipUidCounter}`

let ariaApplied: { element: HTMLElement; previous: string | null } | null = null

function applyAriaDescribedby(): void {
  // 先还原上一个目标,避免目标切换后残留引用
  if (ariaApplied) {
    restoreAria()
  }
  const host = toValue(anchorEl)
  if (!host) return
  const described = resolveAriaTarget(host)
  ariaApplied = { element: described, previous: described.getAttribute('aria-describedby') }
  const existing = ariaApplied.previous
  described.setAttribute('aria-describedby', existing ? `${existing} ${layerId}` : layerId)
}

/** 包装模式下关联到首个可聚焦后代(提示描述由触发元素承载);直连模式即目标自身。 */
function resolveAriaTarget(host: HTMLElement): HTMLElement {
  if (host === anchorRef.value) {
    const focusable = host.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    if (focusable) return focusable
  }
  return host
}

function restoreAria(): void {
  if (!ariaApplied) return
  const { element, previous } = ariaApplied
  if (previous === null) element.removeAttribute('aria-describedby')
  else element.setAttribute('aria-describedby', previous)
  ariaApplied = null
}

/* -------------------------------------------------------------------------
 * 生命周期
 * ---------------------------------------------------------------------- */

onMounted(() => {
  externalTarget.value = resolveTargetProp(props.target)
  rebindTarget()
  applyAriaDescribedby()
  if (import.meta.env.DEV && !toValue(anchorEl)) {
    console.warn(
      '[wui-tooltip] 未解析到目标元素:请传入 target 属性(元素或选择器),或在 #target 插槽放置目标。',
    )
  }
})

watch(
  () => props.target,
  () => {
    externalTarget.value = resolveTargetProp(props.target)
  },
)

onBeforeUnmount(() => {
  if (boundEl) {
    for (const [type, handler] of targetHandlers) boundEl.removeEventListener(type, handler)
    boundEl = null
  }
  restoreAria()
})

const layerStyle = computed(() => ({ maxWidth: `${props.maxWidth}px` }))
</script>

<template>
  <!-- 包装模式:未传 target 时,#target 插槽即目标元素(包装 span 不参与定位);
       $attrs 落包装 span。直连模式(传 target)不渲染可见根,$attrs 改落提示层根,
       供调用方定制提示外观(class/style 等;层 pointer-events:none 不截获指针)。 -->
  <span v-if="!hasTargetProp" ref="anchorRef" v-bind="$attrs" class="wui-tooltip-host">
    <slot name="target" />
  </span>
  <Teleport to="body">
    <!-- 出入场均为纯淡入/淡出,对照源 FadeIn/FadeOutThemeAnimation -->
    <Transition name="wui-tooltip">
      <div
        v-if="isOpen"
        :id="layerId"
        :ref="popupLayer.layerRef"
        class="wui-popup-layer wui-popup-skin-tooltip wui-tooltip"
        :style="layerStyle"
        role="tooltip"
        v-bind="hasTargetProp ? $attrs : undefined"
      >
        <slot>{{ content }}</slot>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * 结构对照 DefaultToolTipStyle(generic.xaml L11538 + ToolTip_themeresources.xaml L42-75):
 * ContentPresenter(Border:背景/边框 + CornerRadius ControlCornerRadius + MaxWidth 320,
 * Padding 9,6,9,8、FontSize 12、TextWrapping Wrap)。背景三色由基建皮肤类
 * .wui-popup-skin-tooltip 提供(popup.css),此处补排版;定位属性由 usePopupLayer
 * 内联直写,组件不碰 position/left/top/z-index。
 */
.wui-tooltip {
  /* 亚克力回退色(见 color 声明):浅色为权威表 §4.2 的 Light Fallback #F9F9F9。 */
  --wui-tool-tip-surface-fallback: #f9f9f9;
  box-sizing: border-box;
  padding: 6px 9px 8px; /* ToolTipBorderPadding = 9,6,9,8(上 6 右 9 下 8 左 9) */
  font-family: inherit; /* ContentControlThemeFontFamily(XamlAutoFontFamily 占位) */
  font-size: var(--wui-tool-tip-content-theme-font-size); /* ToolTipContentThemeFontSize = 12 */
  line-height: 1.4; /* 单行 12px 文案的行盒近似 XAML TextBlock 默认行高 */
  /* PL10 重定向:Foreground = TextFillColorPrimaryBrush(权威键)→ PL2 生效层 token。
     显式声明以覆盖基建皮肤类 .wui-popup-skin-tooltip 的旧 --wui-tool-tip-* 值;
     本规则带 [data-v] 属性选择器,特异性高于皮肤类,故顺序无关。 */
  color: var(--wui-text-fill-color-primary);
  /* Background = AcrylicInAppFillColorDefaultBrush(亚克力,WinUI 3 ToolTipBackgroundBrush)
     —— web 无原生亚克力材质(PL1 记为未决),此处取权威表 §4.2 记录的**不透明回退色**
     AcrylicInAppFillColorDefault 浅 #F9F9F9 / 深 #2C2C2C 作为近似,非臆造。 */
  background: var(--wui-tool-tip-surface-fallback);
  /* MUX BackgroundSizing = InnerBorderEdge:背景绘于边框内缘(CSS 默认 border-box 即
     OuterBorderEdge,故需显式收窄)。必须声明在 background 简写之后——简写会把
     background-clip 重置回 border-box,声明顺序颠倒会导致该值运行时失效 */
  background-clip: padding-box;
  /* BorderBrush = SurfaceStrokeColorFlyoutBrush(权威键)→ PL2 token;Thickness = 1 */
  border: 1px solid var(--wui-surface-stroke-color-flyout);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* CornerRadius ← ControlCornerRadius = 4 */
  overflow-wrap: break-word; /* TextWrapping = Wrap */
  pointer-events: none; /* 非交互瞬时提示:层不截获指针(WinUI ToolTip 同语义) */
}

/* 亚克力回退色(见上):浅色为权威表 §4.2 的 Light Fallback #F9F9F9。 */
/* 深色主题覆盖:Default(深色)字典 Fallback #2C2C2C(scoped 内裸祖先写法同 ProgressBar 约定)。 */
html[data-theme='dark'] .wui-tooltip {
  --wui-tool-tip-surface-fallback: #2c2c2c;
}

/* 出入场:纯透明度。源 FadeIn/OutThemeAnimation 的时长/曲线在平台 PVL 表内,
   快照无值(theme-animations.md §1.1/1.2「源未找到」;MR3/B2 核订:PVL 经
   ThemingData::OpacitySplineTransform 提供数据,palcore.h L195-204 —— 结构证明为
   Bezier 样条 opacity 段,系数在 OS 主题数据内,既非可证实的「默认线性」,
   快照内也无「源默认曲线」可取)。落值:时长取 fast 档(G 模板显式 0.167 簇,
   global-resources.md §4);缓动取 --wui-easing-standard / --wui-easing-accelerate
   (平台入场/退出 KeySpline 惯例,global-resources.md §3),均为已声明近似。 */
.wui-tooltip-enter-active {
  animation: wui-fade-in var(--wui-duration-fast) var(--wui-easing-standard) both;
}

.wui-tooltip-leave-active {
  animation: wui-fade-out var(--wui-duration-fast) var(--wui-easing-accelerate) both;
}
</style>
