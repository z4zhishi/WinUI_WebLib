<script setup lang="ts">
// Popup —— WinUI Popup 的 Web 复刻:最底层的弹层原语(primitives.Popup)。
// 视觉规格:generic.xaml 无 TargetType="Popup" 的 ControlTemplate(Popup 不是
//   Control,没有模板与视觉状态)→ 本组件是「无修饰原语」:层根不带任何背景 /
//   边框 / 圆角 / 阴影,内容长相完全由 child(默认 slot)决定;需要 FlyoutPresenter
//   皮肤请在内容外包一层 .wui-popup-skin-flyout(即 Flyout 的本质,见 wiki 教学节)。
// 行为规格:CK/WinUI-Reference/dxaml/xcp/dxaml/lib/Popup_Partial.cpp
//   SetPositionFromPlacement(L975 起):
//   - PlacementTarget + DesiredPlacement(非 Auto/默认)→ 按目标矩形定位,
//     越界时 FlipMajorPlacementAndJustification 翻到对侧(→ 基建 flip);
//   - 无 PlacementTarget / DesiredPlacement = Default / Auto → 计算偏移归零,
//     回落「窗口原点 + HorizontalOffset / VerticalOffset」(→ 屏幕基准模式);
//   - ShouldConstrainToRootBounds(默认 true)→ 层被钳制在窗口边界内(→ 基建 shift)。
// 定位/层级/自动关闭:全部走弹层公共基建(wiki/controls/_popup-infra.md):
//   usePopupLayer(placement/offset/flip/shift/onOutsidePress/onEscape)+
//   nextPopupZIndex(后开在上,Topmost 语义)+ .wui-popup-overlay(遮罩)。
// 动画:打开纯淡入(源 OverlayOpeningAnimation / FadeInThemeAnimation,167ms 档),
//   关闭淡出为 Web 增强(--wui-easing-accelerate 关闭类专用曲线)。
import { computed, ref, watch } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import type { PopupOffset, PopupPlacement } from '@/composables/usePopup'
import { nextPopupZIndex } from '@/utils/popup'
import '../styles/popup.css'

/** WinUI PopupDesiredPlacement 枚举(Popup.idl;与 FlyoutBasePlacement 同族多 Auto/Default)。 */
type PopupDesiredPlacement =
  | 'Default'
  | 'Auto'
  | 'Top'
  | 'Bottom'
  | 'Left'
  | 'Right'
  | 'TopEdgeAlignedLeft'
  | 'TopEdgeAlignedRight'
  | 'BottomEdgeAlignedLeft'
  | 'BottomEdgeAlignedRight'
  | 'LeftEdgeAlignedTop'
  | 'LeftEdgeAlignedBottom'
  | 'RightEdgeAlignedTop'
  | 'RightEdgeAlignedBottom'

/** WinUI LightDismissOverlayMode 枚举:Auto 平台决定(PC 即不显示)/ On / Off。 */
type LightDismissOverlayModeValue = 'Auto' | 'On' | 'Off'

const props = withDefaults(
  defineProps<{
    /**
     * 放置策略(WinUI DesiredPlacement,默认 'Default')。
     * 'Default' → 屏幕基准:层定位在窗口左上角 +(horizontalOffset, verticalOffset);
     * 其余值 → 锚点基准:相对 #target 锚元素定位(无 #target 时锚为组件声明点);
     * 'Auto' → 系统自动选位的 Web 等效:bottom 优先 + 视口翻转。
     */
    placement?: PopupDesiredPlacement
    /** 水平偏移(WinUI HorizontalOffset,px,默认 0);屏幕基准时相对窗口左缘,锚点基准时相对锚。 */
    horizontalOffset?: number
    /** 垂直偏移(WinUI VerticalOffset,px,默认 0);屏幕基准时相对窗口顶缘,锚点基准时相对锚。 */
    verticalOffset?: number
    /**
     * 是否约束在窗口边界内(WinUI ShouldConstrainToRootBounds,默认 true)。
     * true 时越界层被推回视口(基建 shift);false 允许层溢出视口(对应源的平台窗口化弹层)。
     */
    shouldConstrainToRootBounds?: boolean
    /** light-dismiss 遮罩显示模式(WinUI LightDismissOverlayMode,默认 'Auto' = 不显示)。 */
    lightDismissOverlayMode?: LightDismissOverlayModeValue
  }>(),
  {
    placement: 'Default',
    horizontalOffset: 0,
    verticalOffset: 0,
    shouldConstrainToRootBounds: true,
    lightDismissOverlayMode: 'Auto',
  },
)

defineOptions({ name: 'WuiPopup', inheritAttrs: false })

// —— IsOpen / IsLightDismissEnabled 双向绑定(WinUI IsOpen / IsLightDismissEnabled)——
const isOpen = defineModel<boolean>('isOpen', { default: false })
const isLightDismissEnabled = defineModel<boolean>('isLightDismissEnabled', { default: false })

// —— 事件(WinUI Opened / Closed;开/关动画结束后触发)——
const emit = defineEmits<{
  opened: []
  closed: []
}>()

/** 非默认 DesiredPlacement → 基建 PopupPlacement 映射(EdgeAligned* → -start/-end 对齐)。 */
const PLACEMENT_MAP: Record<Exclude<PopupDesiredPlacement, 'Default'>, PopupPlacement> = {
  Auto: 'bottom',
  Top: 'top',
  Bottom: 'bottom',
  Left: 'left',
  Right: 'right',
  TopEdgeAlignedLeft: 'top-start',
  TopEdgeAlignedRight: 'top-end',
  BottomEdgeAlignedLeft: 'bottom-start',
  BottomEdgeAlignedRight: 'bottom-end',
  LeftEdgeAlignedTop: 'left-start',
  LeftEdgeAlignedBottom: 'left-end',
  RightEdgeAlignedTop: 'right-start',
  RightEdgeAlignedBottom: 'right-end',
}

/** 屏幕基准模式(placement = Default)下层相对窗口左上角定位,锚改用视口原点哨兵。 */
const isScreenPlacement = computed(() => props.placement === 'Default')

const { anchorRef } = usePopupAnchor()
const screenOriginRef = ref<HTMLElement | null>(null)

// 基建锚:屏幕模式 → 视口原点哨兵(fixed 0,0,零尺寸);锚点模式 → #target 包裹元素。
const popupAnchor = computed<Element | null>(() =>
  isScreenPlacement.value ? screenOriginRef.value : anchorRef.value,
)

const layerPlacement = computed<PopupPlacement>(() => {
  const value = props.placement
  if (value === 'Default') return 'bottom-start' // 屏幕模式实际只用偏移,此值不参与语义
  return PLACEMENT_MAP[value]
})

// 偏移映射:屏幕模式 = 窗口原点 + (H, V);锚点模式按基位轴向折算
// (纵向基位:主轴 = V / 交叉轴 = H;横向基位:主轴 = H / 交叉轴 = V)。
const layerOffset = computed<PopupOffset>(() => {
  const horizontal = props.horizontalOffset
  const vertical = props.verticalOffset
  if (isScreenPlacement.value) return { mainAxis: vertical, crossAxis: horizontal }
  const verticalBase = layerPlacement.value.startsWith('top') || layerPlacement.value.startsWith('bottom')
  return verticalBase ? { mainAxis: vertical, crossAxis: horizontal } : { mainAxis: horizontal, crossAxis: vertical }
})

/** light-dismiss 遮罩:显式 On(且启用 light dismiss)时渲染(WinUI Auto 档在 PC 上不显示)。 */
const showOverlay = computed(() => isLightDismissEnabled.value === true && props.lightDismissOverlayMode === 'On')

/** 遮罩显式占用 --wui-z-popup-overlay(10500)档,层必须高于它才能被看到。 */
const OVERLAY_LAYER_Z = 10501 // var(--wui-z-popup-overlay) + 1(应用若覆盖该 token 需同步调整)

const { layerRef, update } = usePopupLayer({
  anchor: () => popupAnchor.value,
  placement: () => layerPlacement.value,
  offset: () => layerOffset.value,
  // 屏幕基准无「对侧」可言,不翻转;锚点基准与源一致:越界翻到对侧(Popup_Partial.cpp FlipMajorPlacement…)
  flip: () => !isScreenPlacement.value,
  // ShouldConstrainToRootBounds → 基建 shift(钳制回视口)
  shift: () => props.shouldConstrainToRootBounds,
  // 无遮罩时后开在上(自动分配);有遮罩时层必须压过 10500 档遮罩
  zIndex: () => (showOverlay.value ? OVERLAY_LAYER_Z : undefined),
  // light dismiss:点击外部 / Escape 关闭(仅 IsLightDismissEnabled 时)
  onOutsidePress: () => {
    if (isLightDismissEnabled.value) isOpen.value = false
  },
  onEscape: () => {
    if (isLightDismissEnabled.value) isOpen.value = false
  },
})

// 内容为异步 / 动态尺寸时,打开后立即重算一次定位(基建约定)。
watch(isOpen, (open) => {
  if (open) update()
})

// 打开期间切换遮罩:层的 z 已由基建按首帧分配(WeakSet 去重),这里手动补写,
// 保证「先开后开遮罩」与「先遮罩后关遮罩」两种顺序下层都不被 10500 档遮罩盖住。
watch(showOverlay, (on) => {
  const layer = layerRef.value
  if (!isOpen.value || !layer) return
  layer.style.zIndex = String(on ? OVERLAY_LAYER_Z : nextPopupZIndex())
})

function onAfterEnter(): void {
  emit('opened')
}

function onAfterLeave(): void {
  emit('closed')
}
</script>

<template>
  <!--
    视口原点哨兵(屏幕基准模式的定位锚):fixed 贴窗口左上角、零尺寸不可见,
    使基建的锚点几何 = 窗口原点,Horizontal/VerticalOffset 由此向下累加。
  -->
  <span ref="screenOriginRef" class="wui-popup-origin" aria-hidden="true"></span>

  <!--
    锚点模式的定位锚(WinUI PlacementTarget 的 Web 等价):#target slot 内容;
    未提供时本 span 零尺寸落在组件声明点,层相对声明点定位。
    $attrs(class/style/aria-*)按项目规范透传到该在流根节点。
  -->
  <span ref="anchorRef" class="wui-popup-anchor" v-bind="$attrs">
    <slot name="target" />
  </span>

  <Teleport to="body">
    <!-- light-dismiss 遮罩(LightDismissOverlayMode = On):挡住底层交互,点击它即触发外部关闭 -->
    <Transition name="wui-popup">
      <div v-if="isOpen && showOverlay" class="wui-popup-overlay" aria-hidden="true"></div>
    </Transition>

    <!-- 层根:无皮肤原语 —— 定位由基建内联直写,视觉完全交给 child -->
    <Transition name="wui-popup" @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div v-if="isOpen" ref="layerRef" class="wui-popup">
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 视口原点哨兵:几何存在(供 getBoundingClientRect)、视觉不存在 */
.wui-popup-origin {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  border: 0;
  visibility: hidden;
  pointer-events: none;
}

/* 锚点包裹元素:随 #target 内容取尺寸;空 slot 时为零尺寸声明点 */
.wui-popup-anchor {
  display: inline-flex;
}

/* 层根外壳:刻意不带任何皮肤(背景/边框/圆角/阴影)—— 无修饰原语,
   需要 presenter 观感请用 popup.css 的 .wui-popup-skin-* 类包装内容 */
.wui-popup {
  box-sizing: border-box;
}

/* 出入场:打开纯淡入(源 OverlayOpeningAnimation 语义),关闭淡出为 Web 增强;
   关键帧与时长/缓动 token 来自 animations.css(popup.css 已随本组件引入)。
   曲线口径同 ToolTip(MR3/B2 核订):源 FadeIn/Out 曲线为平台 PVL 数据
   (palcore.h L195-204 OpacitySplineTransform,系数不在快照内),库取
   standard/accelerate 为已声明近似;prefers-reduced-motion 由 animations.css
   全局降级,Transition 钩子仍按时序触发。 */
.wui-popup-enter-active {
  animation: wui-fade-in var(--wui-duration-fast) var(--wui-easing-standard) both;
}

.wui-popup-leave-active {
  animation: wui-fade-out var(--wui-duration-fast) var(--wui-easing-accelerate) both;
}
</style>
