<script setup lang="ts">
// Flyout —— WinUI Flyout 的 Web 复刻:轻量浮出层(展示信息 / 收集输入 / 确认操作),
// 锚定在宿主元素旁显示,light dismiss(外部按下 / Escape / 锚滚动 / 焦点移出)即关闭。
//
// 视觉规格:generic.xaml FlyoutPresenter 默认样式(L11952-L11998)+ 主题资源:
//   Background ← FlyoutPresenterBackground(SystemControlTransientBackgroundBrush →
//     --wui-flyout-presenter-background,light #f2f2f2 / dark #2b2b2b,popup.css 皮肤类);
//   BorderBrush ← FlyoutBorderThemeBrush(--wui-flyout-border-theme,light #00000024 /
//     dark #0000005c,XAML ARGB 已按 CSS RGBA 字节序提取)+ BorderThickness 1;
//   Padding ← FlyoutContentThemePadding 12,11,12,12;Min/MaxWidth/Height ←
//     FlyoutThemeMinWidth 96 / FlyoutThemeMaxWidth 456 / MinHeight 40 / MaxHeight 758
//     (尺寸资源 theme.css 未提取,按值写死,见 wiki 差异节);圆角 / 阴影取基建 token
//     --wui-popup-corner-radius(8px,OverlayCornerRadius)/ --wui-popup-shadow
//     (WinUI ThemeShadow 的 Web 近似,差异见 wiki/controls/_popup-infra.md)。
//   模板结构:Border > ScrollViewer(Auto 双轴)> ContentPresenter → Web 侧即
//   层根 overflow:auto 的内容容器,FlyoutPresenter 以组件内皮肤类
//   .wui-flyout-presenter 呈现(基建指南:「组件内皮肤类」约定,非独立组件)。
//
// 行为规格:FlyoutBase —— Placement(FlyoutBasePlacementMode 全枚举,默认 Auto)、
//   ShowAt / Hide、LightDismissOverlayMode、Opening/Opened/Closing/Closed(本组件合并
//   为 open / close 两事件);Flyout —— Content(默认 slot)。定位 / 翻转 / 推回 /
//   z-index 全部由弹层基建 usePopupLayer + nextPopupZIndex 完成
//   (接入指南:wiki/controls/_popup-infra.md);light dismiss 按基建「语义分工」表:
//   Flyout 三项回调全开(外部按下 / Escape / 锚滚动均关闭),另按 WinUI 焦点语义
//   补充 focusout(Tab 把焦点移出层外也关闭)。
//
// 挂载宿主的两种方式(WinUI Button.Flyout / ShowAt 的 Web 等价):
//   1. 声明式:#target slot 放宿主控件(推荐,点击宿主即开 / 再点即关);
//   2. 程序化:ref 拿到组件后调用 showAt(element)(锚切换到该元素并打开)。

import { computed, nextTick, ref, useSlots, watch } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import type { PopupPlacement } from '@/composables/usePopup'
import { focusFirst, isInsideAnyPopupLayer } from '@/utils/popup'
import '../styles/popup.css'

/** WinUI FlyoutBasePlacementMode 枚举(FlyoutBase.Placement,默认 Auto)。 */
type FlyoutPlacementValue = 'Auto' | 'Top' | 'Bottom' | 'Left' | 'Right' | 'Full'

/** WinUI LightDismissOverlayMode 枚举(FlyoutBase 同名属性;Auto 为平台自适应)。 */
type FlyoutLightDismissOverlayMode = 'Auto' | 'On' | 'Off'

const props = withDefaults(
  defineProps<{
    /** 放置位(WinUI Placement);Auto=系统自适应(Web:底侧首选 + flip 兜顶),Full=铺满窗口。 */
    placement?: FlyoutPlacementValue
    /** light dismiss:外部按下 / Escape / 锚滚动 / 焦点移出时自动关闭(默认 true,FlyoutBase 语义)。 */
    lightDismiss?: boolean
    /** 关闭阴影遮罩(WinUI LightDismissOverlayMode;Auto 在桌面 Web 视同 Off,需遮罩时显式 On)。 */
    lightDismissOverlayMode?: FlyoutLightDismissOverlayMode
    /** 层与锚的主轴间距(px);WinUI 由平台定位决定,Web 显式取值(见 wiki 差异节)。 */
    offset?: number
    /** 附加到 FlyoutPresenter 容器(层根)的 class —— FlyoutPresenterStyle 的 Web 等价之一。 */
    presenterClass?: string
    /** 附加到 FlyoutPresenter 容器的内联样式(CSS 文本)—— FlyoutPresenterStyle 的 Web 等价之一。 */
    presenterStyle?: string
  }>(),
  {
    placement: 'Auto',
    lightDismiss: true,
    lightDismissOverlayMode: 'Auto',
    offset: 4,
    presenterClass: '',
    presenterStyle: '',
  },
)

defineOptions({ name: 'WuiFlyout', inheritAttrs: false })

// —— IsOpen 双向绑定:WinUI FlyoutBase.IsOpen 为只读(经 ShowAt/Hide 驱动),
//    Web 侧按任务规格开放 v-model:is-open,程序化开关等价 ShowAt/Hide ——
const isOpen = defineModel<boolean>('isOpen', { default: false })

// —— 事件(WinUI Opened / Closing+Closed 的合并近似,时序见 wiki 差异节)——
const emit = defineEmits<{
  open: []
  close: []
}>()

const slots = useSlots()

/* -------------------------------------------------------------------------
 * 锚:#target 宿主包装(声明式)+ showAt 显式锚(程序化)
 * ---------------------------------------------------------------------- */

const { anchorRef } = usePopupAnchor()
// showAt(target) 的显式锚:优先于 #target 宿主,持续生效到下一次 showAt(见 wiki)
const explicitAnchor = ref<Element | null>(null)

function anchorElement(): Element | null {
  return explicitAnchor.value ?? anchorRef.value
}

/* -------------------------------------------------------------------------
 * 弹层基建接入(定位 / 翻转 / 推回 / z-index / light dismiss 回调)
 * ---------------------------------------------------------------------- */

const isFullPlacement = computed(() => props.placement === 'Full')
const overlayEnabled = computed(() => props.lightDismissOverlayMode === 'On')

// WinUI 枚举 → 基建 placement:Auto/Full → 底侧首选(flip 空间不足自动翻顶;
// Full 由 100% 视口尺寸撑满,基位在 shift 钳制后归零,与方向无关)
const layerPlacement = computed<PopupPlacement>(() => {
  switch (props.placement) {
    case 'Top':
      return 'top'
    case 'Bottom':
      return 'bottom'
    case 'Left':
      return 'left'
    case 'Right':
      return 'right'
    default:
      return 'bottom'
  }
})

const { layerRef, update } = usePopupLayer({
  anchor: anchorElement,
  placement: layerPlacement,
  offset: computed(() => (isFullPlacement.value ? 0 : props.offset)),
  // Full:层已 100% 视口,任何安全边距都会把它推出视口外,取 0
  viewportPadding: computed(() => (isFullPlacement.value ? 0 : undefined)),
  // 遮罩开启时层取「遮罩之上」的固定档;其余场景交给 nextPopupZIndex() 自动分配
  zIndex: computed(() => (overlayEnabled.value ? 'calc(var(--wui-z-popup-overlay) + 1)' : undefined)),
  // light dismiss(基建「语义分工」表:Flyout 三项回调全开)
  onOutsidePress: () => {
    if (props.lightDismiss) hide()
  },
  onEscape: () => {
    if (props.lightDismiss) hide()
  },
  onAnchorScroll: () => {
    if (props.lightDismiss) hide() // WinUI:锚滚动即 light dismiss
  },
})

/* -------------------------------------------------------------------------
 * 开 / 关(WinUI ShowAt / Hide)
 * ---------------------------------------------------------------------- */

function show(): void {
  if (!isOpen.value) isOpen.value = true
}

function hide(): void {
  if (isOpen.value) isOpen.value = false
}

/** 在指定元素处打开(WinUI ShowAt);缺省参数则按当前锚打开。 */
function showAt(target?: Element): void {
  if (target) explicitAnchor.value = target
  show()
}

defineExpose({ showAt, hide })

// 入场动画档位:WinUI 弹层为纯淡入(OverlayOpeningAnimation);Full 铺满视口用纯淡入,
// 其余档位取基建 wui-flyout-in(淡入 + 8px 位移 Web 增强,popup.css 挂接)
const enterAnimClass = computed(() => (isFullPlacement.value ? 'wui-popup-anim-fade' : 'wui-popup-anim-flyout'))

// isOpen 状态迁移的统一出口:关闭时发 close(含 light dismiss / 再点宿主 / 编程关闭);
// 打开时等层挂载 → 重算定位 → 焦点移入(WinUI 打开即把焦点移入 flyout 内容)→ 发 open。
// immediate:isOpen 初始即为 true 时也走同一条打开链(层随首渲染挂载)。
watch(
  isOpen,
  async (value, previous) => {
    if (!value) {
      if (previous) emit('close')
      return
    }
    await nextTick() // 等 v-if 挂层完成,layerRef 就绪
    if (!isOpen.value) return // 打开中途又被关闭:跳过 open 侧效应
    update() // 内容异步 / 动态尺寸时确保就位(基建约定)
    const layer = layerRef.value
    if (layer) focusFirst(layer)
    emit('open')
  },
  { immediate: true },
)

// 声明式宿主(#target):点击开 / 再点关(WinUI Button.Flyout 的 toggle 语义)
function onTargetClick(): void {
  if (isOpen.value) hide()
  else show()
}

// Tab 把焦点移出层外 → light dismiss(WinUI 焦点语义;点宿主再关的场景由
// relatedTarget 命中锚元素排除,交给 onTargetClick 的 toggle 处理)
function onLayerFocusout(event: FocusEvent): void {
  if (!props.lightDismiss) return
  const related = event.relatedTarget
  if (!(related instanceof Node)) return // 焦点回到浏览器壳 / 层卸载:不视为 dismiss
  const layer = layerRef.value
  if (layer && layer.contains(related)) return
  const anchor = anchorElement()
  if (anchor && anchor.contains(related)) return
  // 子弹层豁免(F1):焦点移入任何已开弹层(本层内再开的 flyout / popup 等,Teleport 到
  // body 不在本层子树内)不视为移出,否则「flyout 内开 flyout」会把父层误关
  if (related instanceof Element && isInsideAnyPopupLayer(related)) return
  hide()
}
</script>

<template>
  <!-- 宿主锚(#target slot 可选):inline-flex 包装提供可测量的锚盒,$attrs 透传。
       a11y(a11y QA aria-prohibited-attr):包装 span 无 role,不能挂 aria-haspopup /
       aria-expanded(禁止属性);二者属于真正的触发控件 —— open 状态经作用域插槽下发,
       由调用方绑定到触发钮(#target="{ open }" + :aria-expanded="open" aria-haspopup="dialog") -->
  <span
    v-if="slots.target"
    ref="anchorRef"
    v-bind="$attrs"
    class="wui-flyout-target"
    @click="onTargetClick"
  >
    <slot name="target" :open="isOpen" />
  </span>

  <Teleport to="body">
    <!-- light-dismiss 遮罩(LightDismissOverlayMode=On):置于层之前 + 固定档位 token -->
    <Transition enter-active-class="wui-popup-anim-fade" leave-active-class="wui-popup-anim-leave">
      <div v-if="isOpen && overlayEnabled" class="wui-popup-overlay" aria-hidden="true" />
    </Transition>

    <!-- FlyoutPresenter 容器:皮肤类(popup.css 背景/边框)+ 组件内布局类(尺寸/内边距/滚动);
         入场动画按档位选择(Full 为纯淡入,其余为弹层淡入 + 8px 位移 Web 增强),
         出场淡出经 Transition 挂 popup.css 的 wui-popup-anim-leave -->
    <Transition :enter-active-class="enterAnimClass" leave-active-class="wui-popup-anim-leave">
      <div
        v-if="isOpen"
        ref="layerRef"
        class="wui-popup-layer wui-popup-skin-flyout wui-flyout-presenter"
        :class="[isFullPlacement && 'wui-flyout-presenter--full', presenterClass]"
        :style="presenterStyle"
        role="dialog"
        aria-modal="false"
        tabindex="-1"
        @focusout="onLayerFocusout"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 宿主锚包装:行内弹性盒,不破坏宿主所在排版流 */
.wui-flyout-target {
  display: inline-flex;
  max-width: 100%;
}

/*
 * FlyoutPresenter 内容容器(皮肤:popup.css .wui-popup-skin-flyout 的背景 / 边框,
 * .wui-popup-layer 的圆角 / 阴影;此处只补 generic.xaml L11952-L11998 的布局 Setter):
 * 模板 Border > ScrollViewer(Horizontal/VerticalScrollMode=Auto)→ overflow:auto;
 * Padding ← FlyoutContentThemePadding 12,11,12,12(上 右 下 左);
 * Min/Max ← FlyoutThemeMinWidth 96 / FlyoutThemeMaxWidth 456 / MinHeight 40 /
 * FlyoutThemeMaxHeight 758(theme.css 未提取的尺寸资源,按值写死)。
 */
.wui-flyout-presenter {
  box-sizing: border-box;
  overflow: auto;
  min-width: 96px;
  max-width: 456px;
  min-height: 40px;
  max-height: 758px;
  padding: 11px 12px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-default-text-foreground-theme);
  /* 层根 tabindex="-1" 的程序化聚焦,不画焦点框(焦点框交给内容中的可聚焦元素) */
  outline: none;
}

/* Full 档:铺满窗口(WinUI FlyoutBasePlacementMode.Full)。
   fixed 定位的百分比解析到视口(排除滚动条宽度),等效平台「铺满整个窗口」。 */
.wui-flyout-presenter--full {
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
}
</style>
