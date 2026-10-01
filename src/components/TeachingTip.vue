<script lang="ts">
// 模块级导出与类型(<script setup> 内不允许 export)
/** WinUI TeachingTipPlacementMode 枚举(TeachingTip.idl):Auto + 四边 + 八角 + Center。 */
export type TeachingTipPlacementModeValue =
  | 'Auto'
  | 'Top'
  | 'Bottom'
  | 'Left'
  | 'Right'
  | 'TopRight'
  | 'TopLeft'
  | 'BottomRight'
  | 'BottomLeft'
  | 'LeftTop'
  | 'LeftBottom'
  | 'RightTop'
  | 'RightBottom'
  | 'Center'

/** WinUI TeachingTipTailVisibility 枚举。 */
export type TeachingTipTailVisibilityValue = 'Auto' | 'Visible' | 'Collapsed'

/** WinUI TeachingTipCloseReason 枚举(Closing/Closed 事件的 Reason)。 */
export type TeachingTipCloseReasonValue = 'CloseButton' | 'LightDismiss' | 'Programmatic'

/** WinUI TeachingTipHeroContentPlacementMode 枚举。 */
export type TeachingTipHeroContentPlacementValue = 'Auto' | 'Top' | 'Bottom'

/** Closing 事件参数(WinUI TeachingTipClosingEventArgs;Web 侧无 Deferral,同步置 cancel)。 */
export interface TeachingTipClosingArgs {
  reason: TeachingTipCloseReasonValue
  /** 处理器内置 true 可取消本次关闭(WinUI ClosingEventArgs.Cancel)。 */
  cancel: boolean
}

/** Closed 事件参数(WinUI TeachingTipClosedEventArgs)。 */
export interface TeachingTipClosedArgs {
  reason: TeachingTipCloseReasonValue
}
</script>

<script setup lang="ts">
// TeachingTip —— WinUI TeachingTip 的 Web 复刻:内容丰富的教学气泡,锚定目标元素
// (targeted,带指向尾巴)或作为视口内浮层(non-targeted,无尾)。
//
// 视觉规格:CK/WinUI-Reference/controls/dev/TeachingTip/
//   - TeachingTip.xaml(DefaultTeachingTipStyle 模板):MinWidth 320 / MaxWidth 336 /
//     MinHeight 40 / MaxHeight 520、内容边距 12、标题 SemiBold、AlternateCloseButton
//     40×40 字形 E711 16px、按钮区 1fr/1fr 双列(中缝 8px)、尾巴三角 20×10
//     (伸出 7px / 压边 3px / 锚距 8px);
//   - TeachingTip_themeresources.xaml:Background ← SolidBackgroundFillColorTertiary、
//     Border ← SurfaceStrokeColorDefault、Foreground ← TextFillColorPrimary、
//     LightDismiss 态表面换 AcrylicInAppFillColorDefault(近似 token 映射见 wiki 差异节);
//   - 官方示例参数组合:CK/WinUI-Gallery/WinUIGallery/Samples/TeachingTip/TeachingTipPage.xaml。
//
// 行为规格:TeachingTip.cpp ——
//   - targeted 定位(PositionTargetedPopup L477-569):四边 = 居中贴边留尾;八角 =
//     尾巴中心恒指目标中心、气泡体向对应象限展开(MinimumTipEdgeToTailCenter =
//     列 8 + 边距 10 + 三角半宽 10,内容盒坐标即尾心距近边 10px);Center = 气泡底缘
//     对目标垂直中线。全枚举 14 值映射到 usePopupLayer 的 placement + offset
//     (交叉轴 offset 组合扩展,映射表见 wiki/controls/TeachingTip.md);
//   - IsOpen 双向;关闭时序 CloseButton/LightDismiss/Programmatic → Closing(可取消,
//     取消回滚 IsOpen=true)→ Closed(出场动画结束后);ActionButtonClick 只通知不关泡;
//   - IsLightDismissEnabled 时外部按下关闭,且表面换 Transient(亚克力近似)底色;
//   - 不监听 Escape(WinUI TeachingTip 无 Esc 关闭路径,TeachingTip.cpp 全文无 Escape 处理);
//   - TailVisibility Auto/Visible/Collapsed;翻转/推回后尾巴够不到锚(小屏)自动折叠;
//   - hero 内容 Auto 时随 effective placement 翻到背侧(Bottom 系在底,其余在顶)。
//
// 弹层基建:定位 / 层级 / flip / shift / 嵌套豁免全部交给 usePopupLayer
//   (wiki/controls/_popup-infra.md);non-targeted 用 0×0 fixed 视口锚点复用同一基建。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import { usePopupLayer } from '@/composables/usePopup'
import type { PopupOffset, PopupPlacement } from '@/composables/usePopup'
import WuiButton from './Button.vue'
import WuiSymbolIcon from './SymbolIcon.vue'
import type { SymbolValue } from '@/utils/symbolIcons'
import '../styles/popup.css'

const props = withDefaults(
  defineProps<{
    /** 标题(WinUI Title,SemiBold)。 */
    title?: string
    /** 副标题(WinUI Subtitle)。 */
    subtitle?: string
    /** 正文(WinUI Content 的 string 形态);富内容用默认插槽,插槽优先。 */
    content?: string
    /** 目标元素(HTMLElement 或 CSS 选择器);缺省 = non-targeted 视口浮层(WinUI Target)。 */
    target?: HTMLElement | string | null
    /** 首选放置位(WinUI PreferredPlacement,默认 Auto;四边 + 八角 + Center 全枚举)。 */
    preferredPlacement?: TeachingTipPlacementModeValue
    /** hero 内容位置(WinUI HeroContentPlacement;Auto 随放置位翻到背侧)。 */
    heroContentPlacement?: TeachingTipHeroContentPlacementValue
    /** 操作按钮文本(WinUI ActionButtonContent;空 = 不显示)。 */
    actionButtonContent?: string
    /** 关闭按钮文本(WinUI CloseButtonContent;空 = 不显示,改用右上角 ✕)。 */
    closeButtonContent?: string
    /** light dismiss:外部按下即关(WinUI IsLightDismissEnabled;同时表面换亚克力近似底色)。 */
    isLightDismissEnabled?: boolean
    /** 尾巴可见性(WinUI TailVisibility;Auto = targeted 显示、够不到锚自动折叠)。 */
    tailVisibility?: TeachingTipTailVisibilityValue
    /** 与锚/视口边的间距 px(WinUI PlacementMargin)。 */
    placementMargin?: number
    /** 浮层是否约束在视口内(WinUI ShouldConstrainToRootBounds;false 时 non-targeted 不推回)。 */
    shouldConstrainToRootBounds?: boolean
    /** 图标(SymbolIcon 枚举名,WinUI IconSource 的 SymbolIconSource 形态);富图标用 #icon 插槽。 */
    icon?: SymbolValue
  }>(),
  {
    title: '',
    subtitle: '',
    content: '',
    target: null,
    preferredPlacement: 'Auto',
    heroContentPlacement: 'Auto',
    actionButtonContent: '',
    closeButtonContent: '',
    isLightDismissEnabled: false,
    tailVisibility: 'Auto',
    placementMargin: 0,
    shouldConstrainToRootBounds: true,
    icon: undefined,
  },
)

defineOptions({ name: 'WuiTeachingTip', inheritAttrs: false })

const isOpen = defineModel<boolean>('isOpen', { default: false })

const emit = defineEmits<{
  actionButtonClick: []
  closeButtonClick: []
  closing: [args: TeachingTipClosingArgs]
  closed: [args: TeachingTipClosedArgs]
  opened: []
}>()

defineSlots<{
  /** 正文富内容(WinUI Content 对象形态);缺省渲染 content 属性文本。 */
  default?: () => unknown
  /** hero 内容(WinUI HeroContent;置于气泡边到边的一侧)。 */
  hero?: () => unknown
  /** 富图标(WinUI IconSource 对象形态);缺省渲染 icon 属性的 SymbolIcon。 */
  icon?: () => unknown
}>()

const slots = useSlots()

/* -------------------------------------------------------------------------
 * 目标解析:target 属性(HTMLElement / CSS 选择器);缺省 = non-targeted 视口锚点
 * ---------------------------------------------------------------------- */

const viewportAnchorRef = ref<HTMLElement | null>(null)

/**
 * 本组件自持的层元素引用。必须声明于 usePopupLayer 调用之前:基建在 setup 期
 * 创建 watch 时即求值选项 getter(options.offset → resolvePopupOffset 在
 * non-targeted Auto/Center 分支读层高),若直接读基建返回的 layerRef 会命中
 * TDZ(ReferenceError,non-targeted 模式 setup 即崩,QA T-V4b)。
 */
const layerElRef = ref<HTMLElement | null>(null)

const isTargeted = computed(() => props.target != null)

const targetElement = ref<HTMLElement | null>(null)

function resolveTarget(source: unknown): HTMLElement | null {
  if (source == null) return null
  if (typeof source === 'string') {
    if (typeof document === 'undefined' || source.trim() === '') return null
    return document.querySelector<HTMLElement>(source)
  }
  if (source instanceof HTMLElement) return source
  return null
}

/* -------------------------------------------------------------------------
 * 放置位映射(WinUI PreferredPlacement → 基建 placement + offset)
 *
 * targeted:尾巴中心恒指目标中心,八角 = 气泡体从目标中心向象限展开,用交叉轴
 * offset = ±(锚尺寸/2 − 10) 组合扩展;Center 用负主轴 offset 下沉半锚高。
 * non-targeted:0×0 视口锚点贴边/居中,居中类用 −layerH/2 主轴 offset。
 * 函数声明(提升)供基建 options 捕获;每次 computePosition 内重取最新值。
 * ---------------------------------------------------------------------- */

/** 尾巴几何(TeachingTip.xaml 三角 20×10,伸出 7px / 压边 3px)+ 1px 描边缝隙。 */
const TAIL_GAP = 8
/** 角落放置位:尾心距气泡近边(WinUI 列 8 + 尾边距 10 的内容盒等价)。 */
const TAIL_EDGE_INSET = 10

function resolvePopupPlacement(): PopupPlacement {
  const mode = props.preferredPlacement
  if (isTargeted.value) {
    switch (mode) {
      case 'Top':
      case 'Center':
        return 'top'
      case 'Left':
        return 'left'
      case 'Right':
        return 'right'
      case 'TopRight':
        return 'top-start'
      case 'TopLeft':
        return 'top-end'
      case 'BottomRight':
        return 'bottom-start'
      case 'BottomLeft':
        return 'bottom-end'
      case 'LeftTop':
        return 'left-end'
      case 'LeftBottom':
        return 'left-start'
      case 'RightTop':
        return 'right-end'
      case 'RightBottom':
        return 'right-start'
      default:
        // Auto:底侧首选 + flip 自动兜底(= WinUI「系统自行翻转」的 Web 等价)
        return 'bottom'
    }
  }
  // non-targeted:相对 0×0 视口锚点的展开方向
  switch (mode) {
    case 'Top':
      return 'bottom' // 层向下展开 = 锚点在视口顶缘
    case 'Bottom':
      return 'top'
    case 'Left':
      return 'right'
    case 'Right':
      return 'left'
    case 'TopLeft':
    case 'LeftTop':
      return 'bottom-start'
    case 'TopRight':
    case 'RightTop':
      return 'bottom-end'
    case 'BottomLeft':
    case 'LeftBottom':
      return 'top-start'
    case 'BottomRight':
    case 'RightBottom':
      return 'top-end'
    default:
      // Auto / Center:视口居中(任务口径;WinUI Auto 为底部居中,差异见 wiki)
      return 'top'
  }
}

function resolvePopupOffset(): PopupOffset {
  const margin = Math.max(0, props.placementMargin)
  if (!isTargeted.value) {
    // Auto / Center:锚点在视口正中,层上移自身半高实现垂直居中
    if (props.preferredPlacement === 'Auto' || props.preferredPlacement === 'Center') {
      const layerHeight = layerElRef.value?.offsetHeight ?? 0
      return { mainAxis: -(layerHeight / 2) }
    }
    return { mainAxis: 0 }
  }
  const anchorRect = targetElement.value?.getBoundingClientRect()
  switch (props.preferredPlacement) {
    case 'TopRight':
    case 'BottomRight':
      return { mainAxis: TAIL_GAP + margin, crossAxis: (anchorRect?.width ?? 0) / 2 - TAIL_EDGE_INSET }
    case 'TopLeft':
    case 'BottomLeft':
      return { mainAxis: TAIL_GAP + margin, crossAxis: TAIL_EDGE_INSET - (anchorRect?.width ?? 0) / 2 }
    case 'LeftTop':
    case 'RightTop':
      return { mainAxis: TAIL_GAP + margin, crossAxis: TAIL_EDGE_INSET - (anchorRect?.height ?? 0) / 2 }
    case 'LeftBottom':
    case 'RightBottom':
      return { mainAxis: TAIL_GAP + margin, crossAxis: (anchorRect?.height ?? 0) / 2 - TAIL_EDGE_INSET }
    case 'Center':
      // 气泡底缘对目标垂直中线(popup.Y = targetY + targetH/2 - tipHeight)
      return { mainAxis: -((anchorRect?.height ?? 0) / 2) }
    default:
      return { mainAxis: TAIL_GAP + margin }
  }
}

/** targeted 才翻转(non-targeted 为显式视口定位,WinUI 亦不翻转)。 */
function resolvePopupFlip(): boolean {
  return isTargeted.value
}

/** 推回视口:targeted 恒开;non-targeted 由 ShouldConstrainToRootBounds 决定。 */
function resolvePopupShift(): boolean {
  return isTargeted.value ? true : props.shouldConstrainToRootBounds
}

/** 推回安全边距:targeted 用基建默认;non-targeted = PlacementMargin(视口贴边语义)。 */
function resolvePopupPadding(): number {
  return isTargeted.value ? 8 : Math.max(0, props.placementMargin)
}

/* -------------------------------------------------------------------------
 * 弹层基建接线
 * ---------------------------------------------------------------------- */

const { layerRef, update } = usePopupLayer({
  anchor: () => (isTargeted.value ? targetElement.value : viewportAnchorRef.value),
  placement: resolvePopupPlacement,
  offset: resolvePopupOffset,
  flip: resolvePopupFlip,
  shift: resolvePopupShift,
  viewportPadding: resolvePopupPadding,
  // WinUI TeachingTip 不响应 Escape(源码无 Escape 路径),不注册 onEscape;
  // 滚动只跟随不关闭(基建约定表 TeachingTip 行)。
  onOutsidePress: () => {
    if (props.isLightDismissEnabled) requestClose('LightDismiss')
  },
})

/** 模板 :ref 函数:同一层元素同时喂本组件 layerElRef 与基建 layerRef。 */
function bindLayerRef(el: unknown): void {
  layerElRef.value = el instanceof HTMLElement ? el : null
  layerRef.value = layerElRef.value
}

/* -------------------------------------------------------------------------
 * 开关时序:isOpen → 层渲染;关闭统一走 Closing(可取消)→ Closed
 * ---------------------------------------------------------------------- */

const layerShown = ref(false)
const lastReason = ref<TeachingTipCloseReasonValue>('Programmatic')

function openLayer(): void {
  layerShown.value = true
  emit('opened')
  // 层挂载后补一次定位(内容/字体就位)+ 尾巴可达性测量(连续数帧复测至稳定)
  void nextTick(() => {
    update()
    scheduleMeasure(2)
  })
}

watch(isOpen, (now) => {
  if (now) {
    if (!layerShown.value) openLayer()
  } else if (layerShown.value) {
    requestClose('Programmatic')
  }
})

function requestClose(reason: TeachingTipCloseReasonValue): void {
  if (!layerShown.value) return
  const args: TeachingTipClosingArgs = { reason, cancel: false }
  emit('closing', args)
  if (args.cancel) {
    // 源 RaiseClosingEvent:deferral 完成后 Cancel=true → IsOpen(true) 回滚
    if (isOpen.value !== true) isOpen.value = true
    return
  }
  lastReason.value = reason
  layerShown.value = false
  if (isOpen.value) isOpen.value = false
}

function onAfterLeave(): void {
  emit('closed', { reason: lastReason.value })
}

/**
 * 把层实时尺寸写入缩放关键帧变量(源 CreateExpand/ContractAnimation 以
 * 20/Width、20/Height 表达起止 scale;开/关钩子各同步一次,覆盖打开期间
 * 内容高度变化)。
 */
function syncTipScaleVars(el: Element): void {
  if (!(el instanceof HTMLElement)) return
  el.style.setProperty('--wui-tip-w', String(el.offsetWidth || 336))
  el.style.setProperty('--wui-tip-h', String(el.offsetHeight || 160))
}

function onActionButtonClick(): void {
  // WinUI ActionButtonClick 只通知,不触发关闭
  emit('actionButtonClick')
}

function onCloseButtonClick(): void {
  emit('closeButtonClick')
  requestClose('CloseButton')
}

function onAlternateCloseClick(): void {
  // 右上角 ✕(AlternateCloseButton)与底部 CloseButton 同为 CloseButton 原因
  emit('closeButtonClick')
  requestClose('CloseButton')
}

/* -------------------------------------------------------------------------
 * 尾巴:旋向随 effective placement(flip 后基位由 data-wui-placement 给出);
 * 翻转/推回后够不到锚(主轴缝隙不足或交叉轴超出尾巴可达范围)时折叠(小屏适配,
 * 对应 WinUI effective placement 退化时隐藏尾巴的行为)。
 * ---------------------------------------------------------------------- */

const tailFolded = ref(false)
const effectiveBase = ref<PopupPlacement>('bottom')

function measureTail(): void {
  const layer = layerElRef.value
  const anchor = isTargeted.value ? targetElement.value : null
  if (!layer) return
  const base = (layer.dataset.wuiPlacement as PopupPlacement | undefined) ?? 'bottom'
  effectiveBase.value = base
  if (!anchor || props.tailVisibility === 'Collapsed') {
    tailFolded.value = false
    return
  }
  const layerRect = layer.getBoundingClientRect()
  const anchorRect = anchor.getBoundingClientRect()
  // 主轴缝隙 = 锚边与层「相向边」的距离(须容得下尾巴伸出 7px);
  // Center 例外(尾巴本就插入目标,不做主轴判定)
  let gap: number
  switch (base) {
    case 'top':
      gap = anchorRect.top - layerRect.bottom
      break
    case 'bottom':
      gap = layerRect.top - anchorRect.bottom
      break
    case 'left':
      gap = anchorRect.left - layerRect.right
      break
    default:
      gap = layerRect.left - anchorRect.right
      break
  }
  let reachable = props.preferredPlacement === 'Center' ? true : gap >= TAIL_GAP - 1.5
  // 交叉轴:目标中心须落在尾巴可达范围(尾心距近边最小 10px,留 1px 浮点容差)
  if (base === 'top' || base === 'bottom') {
    const centerX = anchorRect.left + anchorRect.width / 2
    reachable =
      reachable &&
      centerX >= layerRect.left + TAIL_EDGE_INSET - 1 &&
      centerX <= layerRect.right - TAIL_EDGE_INSET + 1
  } else {
    const centerY = anchorRect.top + anchorRect.height / 2
    reachable =
      reachable &&
      centerY >= layerRect.top + TAIL_EDGE_INSET - 1 &&
      centerY <= layerRect.bottom - TAIL_EDGE_INSET + 1
  }
  tailFolded.value = !reachable
}

let measureRaf: number | null = null
let measureRepeat = 0

/** rAF 合并测量;repeat>0 时连续多帧复测(等待基建定位与入场动画稳定)。 */
function scheduleMeasure(repeat = 0): void {
  measureRepeat = repeat
  if (measureRaf !== null) return
  measureRaf = requestAnimationFrame(() => {
    measureRaf = null
    measureTail()
    if (measureRepeat > 0) scheduleMeasure(measureRepeat - 1)
  })
}

const onWindowResizeMeasure = (): void => scheduleMeasure()
const onScrollMeasure = (): void => scheduleMeasure()

onMounted(() => {
  targetElement.value = resolveTarget(props.target)
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onWindowResizeMeasure, { passive: true })
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('scroll', onScrollMeasure, { capture: true, passive: true })
  }
  // isOpen 初始即为 true:补走同一条打开链(setup 期不 emit,挂载后触发)
  if (isOpen.value && !layerShown.value) openLayer()
  if (import.meta.env.DEV && isOpen.value && isTargeted.value && !targetElement.value) {
    console.warn('[wui-teaching-tip] 未解析到 target 元素:请传入 HTMLElement 或有效 CSS 选择器。')
  }
})

watch(
  () => props.target,
  () => {
    targetElement.value = resolveTarget(props.target)
    if (layerShown.value) scheduleMeasure(1)
  },
)

watch(
  () => [props.preferredPlacement, props.tailVisibility, props.placementMargin],
  () => {
    if (layerShown.value) scheduleMeasure(1)
  },
)

onBeforeUnmount(() => {
  if (measureRaf !== null) {
    cancelAnimationFrame(measureRaf)
    measureRaf = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', onWindowResizeMeasure)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('scroll', onScrollMeasure, { capture: true })
  }
})

/* -------------------------------------------------------------------------
 * 派生状态
 * ---------------------------------------------------------------------- */

const hasIcon = computed(() => props.icon !== undefined || slots.icon !== undefined)
const hasContent = computed(() => slots.default !== undefined || props.content !== '')
const hasHero = computed(() => slots.hero !== undefined)
const hasTitle = computed(() => props.title !== '')
const hasSubtitle = computed(() => props.subtitle !== '')

/** 按钮组合(WinUI UpdateButtonsState L757-782):closeContent 显示 → 底部关闭钮 + 隐藏 ✕。 */
const showFooterActionButton = computed(() => props.actionButtonContent !== '')
const showFooterCloseButton = computed(() => props.closeButtonContent !== '')
const showAlternateClose = computed(
  () => !showFooterCloseButton.value && !(showFooterActionButton.value && props.isLightDismissEnabled),
)
const hasFooterButtons = computed(() => showFooterActionButton.value || showFooterCloseButton.value)

/** 尾巴沿基边的对位(角落放置位):WinUI 角落态 Horizontal/VerticalAlignment 等价。 */
const tailAlign = computed<'start' | 'center' | 'end'>(() => {
  switch (props.preferredPlacement) {
    case 'TopRight':
    case 'BottomRight':
    case 'LeftBottom':
    case 'RightBottom':
      return 'start'
    case 'TopLeft':
    case 'BottomLeft':
    case 'LeftTop':
    case 'RightTop':
      return 'end'
    default:
      return 'center'
  }
})

/** hero Auto 摆位:effective placement 为 Bottom 系时到底侧(TeachingTip.cpp UpdateTail switch)。 */
const heroPlacement = computed<'top' | 'bottom'>(() => {
  if (props.heroContentPlacement === 'Top') return 'top'
  if (props.heroContentPlacement === 'Bottom') return 'bottom'
  return effectiveBase.value === 'bottom' ? 'bottom' : 'top'
})

/** non-targeted 视口锚点落点类(Auto/Center = 视口中心;无尾时 LeftTop≡TopLeft 等,WinUI 同)。 */
const viewportAnchorClass = computed(() => {
  switch (props.preferredPlacement) {
    case 'Top':
      return 'wui-teaching-tip-vp--top'
    case 'Bottom':
      return 'wui-teaching-tip-vp--bottom'
    case 'Left':
      return 'wui-teaching-tip-vp--left'
    case 'Right':
      return 'wui-teaching-tip-vp--right'
    case 'TopLeft':
    case 'LeftTop':
      return 'wui-teaching-tip-vp--top-left'
    case 'TopRight':
    case 'RightTop':
      return 'wui-teaching-tip-vp--top-right'
    case 'BottomLeft':
    case 'LeftBottom':
      return 'wui-teaching-tip-vp--bottom-left'
    case 'BottomRight':
    case 'RightBottom':
      return 'wui-teaching-tip-vp--bottom-right'
    default:
      return 'wui-teaching-tip-vp--center'
  }
})
</script>

<template>
  <Teleport to="body">
    <!-- non-targeted 视口锚点:0×0 fixed 落点,让基建对整个视口定位 -->
    <div
      v-if="layerShown && !isTargeted"
      ref="viewportAnchorRef"
      class="wui-teaching-tip-vp"
      :class="viewportAnchorClass"
      :style="{ margin: `${Math.max(0, placementMargin)}px` }"
      aria-hidden="true"
    />
    <Transition
      name="wui-teaching-tip"
      @after-leave="onAfterLeave"
      @before-enter="syncTipScaleVars"
      @before-leave="syncTipScaleVars"
    >
      <div
        v-if="layerShown"
        :ref="bindLayerRef"
        v-bind="$attrs"
        class="wui-popup-layer wui-teaching-tip"
        :class="{ 'wui-teaching-tip--transient': isLightDismissEnabled }"
        role="dialog"
        :aria-label="title || subtitle || 'TeachingTip'"
      >
        <!-- 尾巴:单三角 SVG,旋向随 effective base(flip 后实际基位) -->
        <svg
          v-if="tailVisibility !== 'Collapsed' && (isTargeted || tailVisibility === 'Visible') && !tailFolded"
          class="wui-teaching-tip__tail"
          :class="[`wui-teaching-tip__tail--${effectiveBase}`, `wui-teaching-tip__tail--align-${tailAlign}`]"
          width="20"
          height="10"
          viewBox="0 0 20 10"
          aria-hidden="true"
        >
          <polygon points="0,0 20,0 10,10" />
        </svg>

        <!-- hero 内容(边到边;Auto 随放置位翻到背侧) -->
        <div
          v-if="hasHero"
          class="wui-teaching-tip__hero"
          :class="`wui-teaching-tip__hero--${heroPlacement}`"
        >
          <slot name="hero" />
        </div>

        <!-- 正文区:滚动容器 + 右上角备用关闭钮 -->
        <div class="wui-teaching-tip__body">
          <div class="wui-teaching-tip__scroll">
            <div class="wui-teaching-tip__stack">
              <div
                v-if="hasTitle || hasSubtitle || hasIcon"
                class="wui-teaching-tip__header"
                :class="{ 'wui-teaching-tip__header--with-alt-close': showAlternateClose }"
              >
                <span v-if="hasIcon" class="wui-teaching-tip__icon">
                  <slot name="icon">
                    <WuiSymbolIcon v-if="icon" :symbol="icon" />
                  </slot>
                </span>
                <div class="wui-teaching-tip__titles">
                  <div v-if="hasTitle" class="wui-teaching-tip__title">{{ title }}</div>
                  <div v-if="hasSubtitle" class="wui-teaching-tip__subtitle">{{ subtitle }}</div>
                </div>
              </div>
              <div v-if="hasContent" class="wui-teaching-tip__content">
                <slot>{{ content }}</slot>
              </div>
              <div
                v-if="hasFooterButtons"
                class="wui-teaching-tip__buttons"
                :class="{
                  'wui-teaching-tip__buttons--single': !showFooterActionButton || !showFooterCloseButton,
                }"
              >
                <WuiButton
                  v-if="showFooterActionButton"
                  class="wui-teaching-tip__button"
                  @click="onActionButtonClick"
                  >{{ actionButtonContent }}</WuiButton
                >
                <WuiButton
                  v-if="showFooterCloseButton"
                  class="wui-teaching-tip__button"
                  @click="onCloseButtonClick"
                  >{{ closeButtonContent }}</WuiButton
                >
              </div>
            </div>
          </div>
          <button
            v-if="showAlternateClose"
            type="button"
            class="wui-teaching-tip__alt-close"
            aria-label="关闭"
            @click="onAlternateCloseClick"
          >
            <span class="wui-teaching-tip__alt-close-glyph" aria-hidden="true">&#xE711;</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * 结构对照 TeachingTip.xaml(DefaultTeachingTipStyle):层根 = ContentRootGrid
 * (背景/边框/圆角),内容 StackPanel 边距 12;Min/Max 尺寸取 TeachingTip* 尺寸资源。
 * 定位属性(position/left/top/z-index)由 usePopupLayer 内联直写,组件不碰。
 * 颜色一律 --wui-* token(SolidBackgroundFillColorTertiary 等在 theme.css 无同值 token,
 * 最近似映射见 wiki/controls/TeachingTip.md 差异节)。
 */
.wui-teaching-tip {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 320px; /* TeachingTipMinWidth = 320 */
  max-width: 336px; /* TeachingTipMaxWidth = 336 */
  min-height: 40px; /* TeachingTipMinHeight = 40 */
  max-height: 520px; /* TeachingTipMaxHeight = 520 */
  color: var(--wui-default-text-foreground-theme); /* TeachingTipForeground ← TextFillColorPrimary */
  background: var(--wui-flyout-presenter-background); /* ← SolidBackgroundFillColorTertiary(近似,见 wiki) */
  border: 1px solid var(--wui-flyout-border-theme); /* ← SurfaceStrokeColorDefault(近似,见 wiki) */
}

/* LightDismiss 态:表面换 Transient(亚克力近似)底色 —— TeachingTip_themeresources
   LightDismiss VisualState(Tail/ContentRoot/HeroContent 四处同换,Web 合并为层根一处) */
.wui-teaching-tip--transient {
  background: var(--wui-tool-tip-background); /* TeachingTipTransientBackground ← AcrylicInAppFillColorDefault 近似 */
}

.wui-teaching-tip--transient.wui-teaching-tip .wui-teaching-tip__tail {
  fill: var(--wui-tool-tip-background);
}

/* —— 尾巴:20×10 下指三角,主轴压边 3px / 伸出 7px;左右基位旋转后包围盒 10×20,
   偏移按旋转中心换算(right/left −12px = 伸出 7px + 压边 3px 的等效落点) —— */
.wui-teaching-tip__tail {
  position: absolute;
  fill: var(--wui-flyout-presenter-background);
  stroke: var(--wui-flyout-border-theme);
  stroke-width: 1;
}

.wui-teaching-tip__tail--top {
  bottom: -7px;
  transform: none;
}

.wui-teaching-tip__tail--bottom {
  top: -7px;
  transform: rotate(180deg);
}

.wui-teaching-tip__tail--left {
  right: -12px;
  transform: rotate(-90deg);
}

.wui-teaching-tip__tail--right {
  left: -12px;
  transform: rotate(90deg);
}

/* 尾巴沿基边的对位(只写交叉轴,避免覆盖主轴落点):
   垂直基位(top/bottom)对齐横轴;水平基位(left/right)对齐纵轴 */
.wui-teaching-tip__tail--top.wui-teaching-tip__tail--align-center,
.wui-teaching-tip__tail--bottom.wui-teaching-tip__tail--align-center {
  left: calc(50% - 10px);
}

.wui-teaching-tip__tail--top.wui-teaching-tip__tail--align-start,
.wui-teaching-tip__tail--bottom.wui-teaching-tip__tail--align-start {
  left: 0;
}

.wui-teaching-tip__tail--top.wui-teaching-tip__tail--align-end,
.wui-teaching-tip__tail--bottom.wui-teaching-tip__tail--align-end {
  right: 0;
}

/* 水平基位:旋转后视觉高 20px,center 落点含 5px 半高修正 */
.wui-teaching-tip__tail--left.wui-teaching-tip__tail--align-center,
.wui-teaching-tip__tail--right.wui-teaching-tip__tail--align-center {
  top: calc(50% - 5px);
}

.wui-teaching-tip__tail--left.wui-teaching-tip__tail--align-start,
.wui-teaching-tip__tail--right.wui-teaching-tip__tail--align-start {
  top: 5px;
}

.wui-teaching-tip__tail--left.wui-teaching-tip__tail--align-end,
.wui-teaching-tip__tail--right.wui-teaching-tip__tail--align-end {
  bottom: 5px;
}

/* —— hero:边到边;Top 态圆上角,Bottom 态圆下角(TemplateSettings 圆角过滤等价) —— */
.wui-teaching-tip__hero {
  flex: none;
  order: -1;
  overflow: hidden;
  border-radius: var(--wui-popup-corner-radius) var(--wui-popup-corner-radius) 0 0;
}

.wui-teaching-tip__hero--bottom {
  order: 1;
  border-radius: 0 0 var(--wui-popup-corner-radius) var(--wui-popup-corner-radius);
}

/* —— 正文区 —— */
.wui-teaching-tip__body {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  order: 0;
}

.wui-teaching-tip__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto; /* 模板 ScrollViewer VerticalScrollBarVisibility Auto */
}

.wui-teaching-tip__stack {
  padding: 12px; /* TeachingTipContentMargin = 12 */
}

/* 标题区:图标 + 标题/副标题纵向栈 */
.wui-teaching-tip__header {
  display: flex;
  align-items: flex-start;
  gap: 12px; /* TeachingTipIconPresenterMarginWithIcon = 0,0,12,0 */
}

.wui-teaching-tip__header--with-alt-close {
  /* TeachingTipTitleStackPanelMarginWithHeaderCloseButton = 0,0,28,0:为右上 ✕ 让位 */
  padding-right: 28px;
}

.wui-teaching-tip__icon {
  display: inline-flex;
  flex: none;
  color: var(--wui-default-text-foreground-theme);
}

.wui-teaching-tip__titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wui-teaching-tip__title {
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600; /* TitleTextBlock FontWeight = SemiBold */
  overflow-wrap: break-word; /* TextWrapping = WrapWholeWords */
}

.wui-teaching-tip__subtitle {
  font-size: var(--wui-control-content-theme-font-size);
  overflow-wrap: break-word;
}

.wui-teaching-tip__content {
  margin-top: 12px; /* TeachingTipMainContentPresentMargin = 0,12,0,0 */
  font-size: var(--wui-control-content-theme-font-size);
  overflow-wrap: break-word;
}

/* —— 按钮区(WinUI ButtonsStates:双钮 1fr/1fr,单钮通栏) —— */
.wui-teaching-tip__buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 8px; /* ActionButton 0,12,4,0 + CloseButton 4,12,0,0 的中缝 8px 等价 */
  margin-top: 12px; /* TeachingTipButtonPanelMargin = 0,12,0,0 */
}

.wui-teaching-tip__buttons--single {
  grid-template-columns: 1fr;
}

.wui-teaching-tip__button {
  width: 100%; /* HorizontalAlignment = Stretch */
}

/* —— 右上角备用关闭钮(AlternateCloseButtonStyle:40×40 / 字形 16 / ControlCornerRadius) —— */
.wui-teaching-tip__alt-close {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 40px; /* TeachingTipAlternateCloseButtonSize = 40 */
  height: 40px;
  padding: 4px;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 16px; /* TeachingTipAlternateCloseButtonGlyphSize = 16 */
  color: var(--wui-app-bar-button-foreground); /* AlternateCloseButtonForeground ← TextFillColorPrimary */
  background: var(--wui-app-bar-button-background); /* ← SubtleFillColorTransparent(近似,见 wiki) */
  border: 1px solid transparent;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius */
  cursor: pointer;
}

.wui-teaching-tip__alt-close-glyph {
  font-style: normal;
}

.wui-teaching-tip__alt-close:hover {
  background: var(--wui-app-bar-button-background-pointer-over); /* ← SubtleFillColorSecondary(近似) */
}

.wui-teaching-tip__alt-close:active {
  background: var(--wui-app-bar-button-background-pressed); /* ← SubtleFillColorTertiary(近似) */
}

.wui-teaching-tip__alt-close:focus {
  outline: none;
}

.wui-teaching-tip__alt-close:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* —— 出入场:源为纯缩放(Composition scale,无透明度时间线):
   开 = 300ms 自 (0.01,0.01) → 1、cubic-bezier(0.1,0.9,0.2,1)(TeachingTip.cpp
   CreateExpandAnimation + TeachingTip.h L234-235/L304-305);
   关 = 200ms 自 1 → (20/W,20/H)、cubic-bezier(0.7,0,1,0.5)(L1685-1706、
   L306-307)。缩放原点贴锚侧边由 popup.css 的 [data-wui-placement]
   transform-origin 承担(源 CenterPoint,L353-422);关键帧见 animations.css。 —— */
.wui-teaching-tip-enter-active {
  animation: wui-teaching-tip-expand 300ms var(--wui-easing-standard) both;
}

.wui-teaching-tip-leave-active {
  animation: wui-teaching-tip-contract 200ms cubic-bezier(0.7, 0, 1, 0.5) both;
}

/* —— non-targeted 视口锚点(0×0 fixed 落点;不截获任何指针) —— */
.wui-teaching-tip-vp {
  position: fixed;
  width: 0;
  height: 0;
  visibility: hidden;
  pointer-events: none;
}

.wui-teaching-tip-vp--center {
  left: 50%;
  top: 50%;
}

.wui-teaching-tip-vp--top {
  left: 50%;
  top: 0;
}

.wui-teaching-tip-vp--bottom {
  left: 50%;
  bottom: 0;
}

.wui-teaching-tip-vp--left {
  left: 0;
  top: 50%;
}

.wui-teaching-tip-vp--right {
  right: 0;
  top: 50%;
}

.wui-teaching-tip-vp--top-left {
  left: 0;
  top: 0;
}

.wui-teaching-tip-vp--top-right {
  right: 0;
  top: 0;
}

.wui-teaching-tip-vp--bottom-left {
  left: 0;
  bottom: 0;
}

.wui-teaching-tip-vp--bottom-right {
  right: 0;
  bottom: 0;
}
</style>
