<script setup lang="ts">
// WuiMenuFlyout —— WinUI MenuFlyout 的 Web 复刻(轻量上下文菜单弹层,基于弹层公共基建)。
// 视觉规格:CK/WinUI-Reference/controls/dev/CommonStyles/MenuFlyout_themeresources.xaml
//   <Style x:Key="DefaultMenuFlyoutPresenterStyle" TargetType="MenuFlyoutPresenter">(L270 起):
//   - Background = --wui-menu-flyout-presenter-surface(MenuFlyoutPresenterBackground =
//     DesktopAcrylicTransparentBrush + SystemBackdrop 亚克力材料;web 取材料回退色,见 theme.css);
//     Border = --wui-surface-stroke-color-flyout(MenuFlyoutPresenterBorderBrush =
//     SurfaceStrokeColorFlyoutBrush,L41/L203);BorderThickness=1;
//   - Padding=MenuFlyoutPresenterThemePadding=1,叠加 MenuFlyoutScrollerMargin 0,4,0,4
//     (等效 5px 1px 内边距);MinHeight=32(MenuFlyoutThemeMinHeight);
//     Min/MaxWidth=96/456(FlyoutThemeMinWidth/FlyoutThemeMaxWidth);
//   - 层圆角/阴影由 .wui-popup-layer 提供(--wui-popup-corner-radius / --wui-popup-shadow,
//     WinUI ThemeShadow 的 Web 近似,见 wiki/controls/_popup-infra.md 差异节)。
// 行为规格(对照 WinUI MenuFlyout + MenuFlyoutBase):
//   - placement(WinUI FlyoutBase.Placement,本基建映射为 PopupPlacement;默认 'bottom-start'
//     为菜单惯例,WinUI MenuFlyout 实际默认 Bottom)/ lightDismiss / isOpen(v-model)三件套;
//   - light dismiss:点击层与锚之外、Escape、锚滚动链滚动 → 关闭(WinUI 滚动即 light dismiss);
//     lightDismiss=false 时不监听这三类手势;
//   - 键盘:↑/↓ 循环移动项、Home/End 首/末项、→ 展开子菜单(由 SubItem 行处理)、
//     ← 在子菜单内逐级退出(同左)、Escape 逐级关闭(向父层登记实现)、Tab 关闭菜单;
//     打开时焦点落在本层首个可用项(WAI-ARIA menu-button 惯例),关闭经键盘路径时归还焦点到锚;
//   - 菜单项语义:层 role=menu;项由 MenuFlyoutItem(menuitem)/ ToggleMenuFlyoutItem
//     (menuitemcheckbox)/ MenuFlyoutSeparator(separator)/ MenuFlyoutSubItem 提供。
// 上下文契约:向 slot 内的菜单项 provide 层上下文(键 'wuiMenuFlyoutLevel',接口见
//   MenuFlyoutItem.vue 头注);子菜单层(MenuFlyoutSubItem)以 registerOpenSubmenu 登记实现
//   兄弟互斥与 Escape 逐级。
import { computed, nextTick, onScopeDispose, provide, reactive, watch } from 'vue'
import type { Ref } from 'vue'
import { usePopupAnchor, usePopupLayer, type PopupPlacement } from '@/composables/usePopup'
import '../styles/popup.css'

/** 菜单层上下文(与 MenuFlyoutItem 同构,结构化类型兼容)。 */
interface MenuFlyoutLevelContext {
  isOpen: Ref<boolean>
  glyphs: Ref<{ check: boolean; icon: boolean }>
  registerItem: (item: { checkable: boolean; hasIcon: () => boolean }) => () => void
  closeAll: (restoreFocus: boolean) => void
  registerOpenSubmenu: (handle: { close: () => void }) => () => void
}

/** 层与锚(target)的间距(px,对照 WinUI 菜单弹层的视觉间隙)。 */
const MENU_OFFSET = 4

defineOptions({ name: 'WuiMenuFlyout', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 弹层放置位(WinUI FlyoutBase.Placement 的本基建映射);菜单默认 'bottom-start'。 */
    placement?: PopupPlacement
    /** 轻扫关闭:点击层外/Escape/锚滚动时关闭(WinUI MenuFlyout 固定为 true,此处为 Web 侧可选项)。 */
    lightDismiss?: boolean
  }>(),
  { placement: 'bottom-start', lightDismiss: true },
)

const emit = defineEmits<{
  /** 弹层开始打开(WinUI Opening;isOpen 变 true 时同步触发)。 */
  opening: []
  /** 弹层已打开且完成首次定位(WinUI Opened)。 */
  opened: []
  /** 弹层开始关闭(WinUI Closing)。 */
  closing: []
  /** 弹层已关闭(WinUI Closed)。 */
  closed: []
  // 注:update:isOpen 的 emit 类型由下方 defineModel 提供,勿在此重复声明。
}>()

// 双向:isOpen(WinUI MenuFlyout 基类的 IsOpen)。
const isOpen = defineModel<boolean>('isOpen', { default: false })

// —— 锚(target slot 容器)与内容层 ——
const anchorRef = usePopupAnchor().anchorRef

/** 本层内当前打开的子菜单句柄(由 MenuFlyoutSubItem 登记)。 */
let openChildHandle: { close: () => void } | null = null

function registerOpenSubmenu(handle: { close: () => void }): () => void {
  if (openChildHandle && openChildHandle !== handle) openChildHandle.close()
  openChildHandle = handle
  return () => {
    if (openChildHandle === handle) openChildHandle = null
  }
}

function closeOpenChild(): void {
  openChildHandle?.close()
  openChildHandle = null
}

// light dismiss:落点在本链任一菜单层之外才关闭(子菜单层 Teleport 到 body、
// 不在本层 DOM 内,须按 data-wui-menu-layer 标记排除,避免点子菜单被判为外部)。
// lightDismiss 以 prop 在回调内即时判断(基建的 options 对象 setup 时捕获,回调体内
// 读 props 才能响应运行期变化)。
function onOutsidePress(event: PointerEvent): void {
  if (!props.lightDismiss) return
  const target = event.target
  if (target instanceof Element && target.closest('[data-wui-menu-layer]')) return
  closeMenu(false)
}

// Escape 逐级:子菜单仍打开时忽略(由更深层自己收起)
function onEscapeKey(): void {
  if (!props.lightDismiss) return
  if (openChildHandle) return
  closeMenu(true)
}

const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: () => props.placement,
  offset: { mainAxis: MENU_OFFSET },
  onOutsidePress,
  onEscape: onEscapeKey,
  onAnchorScroll: () => {
    if (!props.lightDismiss) return
    closeMenu(false) // WinUI:锚所在滚动链滚动即 light dismiss
  },
})

/** 关闭整条菜单链:级联收起子菜单,键盘路径(restoreFocus=true)把焦点归还到锚。 */
function closeMenu(restoreFocus: boolean): void {
  if (!isOpen.value) return
  closeOpenChild()
  isOpen.value = false
  if (restoreFocus) restoreFocusToAnchor()
}

/** 焦点归还:优先落锚内可聚焦后代(如 target 里的按钮,保留其焦点视觉),否则落锚自身。 */
function restoreFocusToAnchor(): void {
  const anchor = anchorRef.value
  if (!anchor) return
  const focusable = anchor.querySelector<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  ;(focusable ?? anchor).focus()
}

/**
 * 点击锚(target)切换菜单开关 —— 对齐 WinUI `Button.Flyout` 的附加行为
 * (点击宿主打开;再次点击关闭,与 light dismiss 语义衔接)。
 */
function onAnchorClick(): void {
  if (isOpen.value) closeMenu(false)
  else isOpen.value = true
}

// —— 生命周期事件与打开期副作用(首次定位、焦点入层)——
watch(isOpen, (value) => {
  if (value) {
    emit('opening')
    void nextTick(() => {
      update()
      focusMenuItem(layerRef.value, 'first')
      emit('opened')
    })
  } else {
    // 外部编程关闭(v-model)路径也要级联收起子菜单(closeMenu 已覆盖内部路径)
    closeOpenChild()
    emit('closing')
    void nextTick(() => emit('closed'))
  }
})

/* -------------------------------------------------------------------------
 * 层上下文:提供给 slot 内的菜单项(MenuFlyoutItem / Toggle / Separator / SubItem)
 * ---------------------------------------------------------------------- */

const registeredItems = reactive<Array<{ checkable: boolean; hasIcon: () => boolean }>>([])
const glyphs = computed<{ check: boolean; icon: boolean }>(() => ({
  check: registeredItems.some((item) => item.checkable),
  icon: registeredItems.some((item) => item.hasIcon()),
}))

function registerItem(item: { checkable: boolean; hasIcon: () => boolean }): () => void {
  registeredItems.push(item)
  return () => {
    const index = registeredItems.indexOf(item)
    if (index >= 0) registeredItems.splice(index, 1)
  }
}

provide('wuiMenuFlyoutLevel', {
  isOpen,
  glyphs,
  registerItem,
  closeAll: closeMenu,
  registerOpenSubmenu,
} satisfies MenuFlyoutLevelContext)

/* -------------------------------------------------------------------------
 * 键盘导航:↑/↓ 循环步进、Home/End 首/末、Tab 关闭(Enter/Space 由项自身处理,
 * →/← 由 MenuFlyoutSubItem 行处理)。跳过 aria-disabled 项。
 * ---------------------------------------------------------------------- */

function collectMenuItems(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>('[data-wui-menu-item]')).filter(
    (element) => element.getAttribute('aria-disabled') !== 'true',
  )
}

function focusMenuItem(container: HTMLElement | null, target: 'first' | 'last'): void {
  const items = collectMenuItems(container)
  const next = target === 'first' ? items[0] : items[items.length - 1]
  next?.focus()
}

function stepFocus(container: HTMLElement | null, direction: 1 | -1): void {
  const items = collectMenuItems(container)
  if (items.length === 0) return
  const current = items.findIndex((item) => item === document.activeElement)
  if (current < 0) {
    ;(direction === 1 ? items[0] : items[items.length - 1])?.focus()
    return
  }
  const nextIndex = (current + direction + items.length) % items.length
  items[nextIndex]?.focus()
}

function onLayerKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      closeOpenChild()
      stepFocus(layerRef.value, 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      closeOpenChild()
      stepFocus(layerRef.value, -1)
      break
    case 'Home':
      event.preventDefault()
      closeOpenChild()
      focusMenuItem(layerRef.value, 'first')
      break
    case 'End':
      event.preventDefault()
      closeOpenChild()
      focusMenuItem(layerRef.value, 'last')
      break
    // Tab:关闭菜单,不拦截默认焦点移动(WinUI 菜单 Tab 即 light dismiss)
    case 'Tab':
      closeMenu(false)
      break
  }
}

// 卸载时清空子菜单登记句柄(句柄指向的子组件随本组件 slot 卸载,无需显式 close)
onScopeDispose(() => {
  openChildHandle = null
})
</script>

<template>
  <!-- 锚(target 容器):tabindex=-1 使编程聚焦生效 —— 键盘路径(Escape)关闭时
       焦点真正回归锚,而非落到 body(不参与 Tab 序) -->
  <span ref="anchorRef" class="wui-menu-flyout-anchor" tabindex="-1" v-bind="$attrs" @click="onAnchorClick">
    <slot name="target" />
  </span>

  <!-- 菜单层:Teleport 到 body,复用 .wui-popup-layer 外壳(z-index 自动分配) -->
  <Teleport to="body">
    <Transition name="wui-menu-flyout">
      <div
        v-if="isOpen"
        ref="layerRef"
        class="wui-popup-layer wui-menu-flyout-layer"
        role="menu"
        aria-orientation="vertical"
        tabindex="-1"
        data-wui-menu-layer
        @keydown="onLayerKeydown"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>
<style scoped>
/* 锚容器:行内盒,不破坏宿主布局 */
.wui-menu-flyout-anchor {
  display: inline-flex;
}

/* ======================================================================
 * 菜单层皮肤(MenuFlyoutPresenter 默认模板):
 * Padding=1 + ScrollerMargin 0,4,0,4(等效 5px 1px)、MinHeight=32、
 * Min/MaxWidth=96/456、Background/Border=--wui-menu-flyout-presenter-*。
 * ====================================================================== */
.wui-menu-flyout-layer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
  min-width: 96px;
  max-width: 456px;
  min-height: 32px;
  padding: 5px 1px;
  background: var(--wui-menu-flyout-presenter-surface);
  border: 1px solid var(--wui-surface-stroke-color-flyout);
}

/* 入出场动画(MenuPopupThemeTransition:250ms 锚点展开缩放 + 83ms 线性淡入,
   出场 83ms 线性淡出)书写在 popup.css 全局层(与 MenuFlyoutSubItem 的子菜单层
   共用,scoped 类挂不到跨组件层),本组件不重复定义 */
</style>
