<script setup lang="ts">
// WuiMenuBarItem —— WinUI MenuBarItem 的 Web 复刻(菜单栏顶层项,默认 slot 承载 MenuFlyout 族下拉)。
// 视觉规格:CK/WinUI-Reference/controls/dev/MenuBar/MenuBarItem.xaml + MenuBar_themeresources.xaml
//   (generic.xaml 本体无 TargetType="MenuBarItem" 段,模板与主题资源在 dev 资源字典中):
//   - 模板:ContentRoot(Grid,CornerRadius=ControlCornerRadius 4)+ Background Border +
//     ContentButton(Padding=MenuBarItemButtonPadding 10,4,10,4,文本取 Title);
//   - Margin=MenuBarItemMargin 4,4,4,4;MenuBarHeight 40 为整栏最小高(在 MenuBar.vue 落地);
//   - CommonStates:Normal(SubtleFillColorTransparent)/ PointerOver(SubtleFillColorSecondary)/
//     Pressed(SubtleFillColorTertiary)/ Selected=下拉打开时(SubtleFillColorTertiary)——
//     theme.css 未提取 SubtleFill* 系列,按既有约定取同值 token(见 wiki 差异节);
//   - BorderThickness=0(Light/Default 字典;HighContrast 为 2px,Web 侧未做 HC 适配)。
// 行为规格(对照 controls/dev/MenuBar/MenuBarItem.cpp):
//   - PointerEntered:栏内已有下拉打开 → 立即切换到本项(菜单打开后横移鼠标自动换菜单,
//     WinUI 菜单栏招牌行为);指针离开不收起(light dismiss 只认「外部点击」,与 WinUI 一致);
//   - 点击:无下拉打开 → 展开;本项已展开且为点击展开 → 收起(Invoke 的 toggle 语义);
//     hover 切换打开的 → 点击不动作(WinUI PointerPressed 的 flyoutOpen 短路,亦规避触屏
//     pointerenter→click 串扰);另一项展开中(hover 已先行切换)→ 点击不动作;
//   - 键盘:↓ / Enter / Space(含 Alt+↓)展开;展开后 ←/→ 收起本项并聚焦+展开相邻项
//     (OnPresenterKeyDown → OpenFlyoutFrom),未展开时 ←/→ 仅移焦(MoveFocusTo);
//   - 下拉打开时项进入 Selected 态(底色高亮),关闭回 Normal。
// 上下文契约:
//   - 向默认 slot 内的 MenuFlyout 族 provide 与 MenuFlyout 同构的层上下文
//     (键 'wuiMenuFlyoutLevel',接口见 MenuFlyoutItem.vue 头注);
//   - 向所在 MenuBar 注册自身(键 'wuiMenuBarContext',接口见 MenuBar.vue 头注),
//     由栏实现兄弟互斥、hover 切换与 ←/→ 邻项联动;独立使用(无 MenuBar 祖先)时降级为
//     普通「点击展开的锚定菜单」,键盘邻项联动不可用。
import { computed, inject, nextTick, onScopeDispose, provide, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import { isInsideAnyPopupLayer } from '@/utils/popup'
import '../styles/popup.css'

/** 菜单层上下文(与 MenuFlyout / MenuFlyoutSubItem 同构,结构化类型兼容)。 */
interface MenuFlyoutLevelContext {
  isOpen: Ref<boolean>
  glyphs: Ref<{ check: boolean; icon: boolean }>
  registerItem: (item: { checkable: boolean; hasIcon: () => boolean }) => () => void
  closeAll: (restoreFocus: boolean) => void
  registerOpenSubmenu: (handle: { close: () => void }) => () => void
}

/** 菜单栏项句柄(向 MenuBar 登记;栏据此做互斥/移焦/邻项展开)。 */
interface MenuBarItemHandle {
  /** 项根元素(移焦落点)。 */
  element: () => HTMLElement | null
  /** 本项下拉层开关状态。 */
  isOpen: Ref<boolean>
  /** 禁用(禁用项不参与移焦/邻项展开)。 */
  disabled: () => boolean
  /** 展开本项下拉;focusLayer=true 焦点进层首项(键盘/点击路径),false 聚焦项自身(hover 切换路径)。 */
  open: (focusLayer: boolean) => void
  /** 收起本项下拉(级联子菜单);restoreFocus=true 焦点归还项自身。 */
  close: (restoreFocus: boolean) => void
}

/** 菜单栏上下文(MenuBar 提供,MenuBarItem 注入;独立使用时为 null)。 */
interface MenuBarContext {
  items: Readonly<Ref<readonly MenuBarItemHandle[]>>
  activeHandle: Ref<MenuBarItemHandle | null>
  registerItem: (handle: MenuBarItemHandle) => () => void
  setActive: (handle: MenuBarItemHandle) => void
  hasOpenFlyout: Ref<boolean>
  requestOpen: (handle: MenuBarItemHandle, focusLayer: boolean) => void
  moveFocus: (from: HTMLElement | null, direction: 1 | -1) => void
  openNeighbor: (from: MenuBarItemHandle, direction: 1 | -1) => void
  focusEdge: (target: 'first' | 'last') => void
}

defineOptions({ name: 'WuiMenuBarItem', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 项文本(WinUI Title;MenuBarItem 的默认 slot 是菜单内容,故文本只走此属性)。 */
    title?: string
    /** 禁用(Web 侧增补:WinUI MenuBarItem 无 Disabled 视觉态,见 wiki 差异节)。 */
    disabled?: boolean
  }>(),
  { title: 'Item', disabled: false },
)

// 显式声明 emits:opening/opened/closing/closed 对应下拉层生命周期(WinUI 在其内部
// MenuBarItemFlyout 上,Web 侧上提到组件事件面,见 wiki 差异节);本组件不派发 click。
const emit = defineEmits<{
  /** 下拉层开始打开。 */
  opening: []
  /** 下拉层已打开且完成首次定位。 */
  opened: []
  /** 下拉层开始关闭。 */
  closing: []
  /** 下拉层已关闭。 */
  closed: []
}>()

// —— 菜单栏上下文与自身句柄(互斥/hover 切换/邻项联动的登记载体)——
const bar = inject<MenuBarContext | null>('wuiMenuBarContext', null)

const isOpen = ref(false)
const anchorRef = usePopupAnchor().anchorRef

/** 本层(下拉菜单)内当前打开的子菜单句柄(由 MenuFlyoutSubItem 登记)。 */
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

/* -------------------------------------------------------------------------
 * 开 / 关与下拉层基建(light dismiss 语义分工与 MenuFlyout 一致)
 * ---------------------------------------------------------------------- */

/** 展开本项下拉;focusLayer=false 为 hover 切换路径(焦点聚焦项自身,对齐 WinUI
 *  OnFlyoutOpening 的 Focus(programmatic) 落在 MenuBarItem 上)。 */
let pendingFocusLayer = true

function openMenu(focusLayer: boolean): void {
  if (props.disabled || isOpen.value) return
  pendingFocusLayer = focusLayer
  bar?.setActive(handle)
  isOpen.value = true
}

/** 关闭本项下拉链:级联收起子菜单;键盘路径(restoreFocus=true)把焦点归还到项自身。 */
function closeAll(restoreFocus: boolean): void {
  if (!isOpen.value) return
  closeOpenChild()
  isOpen.value = false
  if (restoreFocus) anchorRef.value?.focus()
}

function onOutsidePress(): void {
  closeAll(false)
}

// Escape 逐级:更深层子菜单仍打开时忽略(由更深层自己收起);关闭后焦点归还项自身
// (WinUI 菜单栏 Escape 后焦点留在 MenuBarItem 上)
function onEscapeKey(): void {
  if (openChildHandle) return
  closeAll(true)
}

const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: 'bottom-start', // WinUI MenuBarItemFlyout Placement=Bottom + 排除矩形:层贴项左缘、不压按钮
  offset: 0, // 菜单直接贴在项下方(WinUI ShowOptions.Position(0, height),无间隙)
  onOutsidePress,
  onEscape: onEscapeKey,
  onAnchorScroll: () => closeAll(false), // WinUI:锚所在滚动链滚动即 light dismiss
})

// —— 打开期副作用(首次定位、焦点落位)与生命周期事件 ——
watch(isOpen, (value) => {
  if (value) {
    emit('opening')
    void nextTick(() => {
      if (!isOpen.value) return // 打开中途又被关闭(如相邻项立即切换):跳过 open 侧效应
      update()
      if (pendingFocusLayer) {
        // 键盘/点击路径:焦点进层首项(WAI-ARIA menubar 惯例,见 wiki 差异节)
        focusMenuItem(layerRef.value, 'first')
      } else {
        // hover 切换路径:焦点落项自身(WinUI OnFlyoutOpening 行为),←/→ 即刻可联动画
        anchorRef.value?.focus()
      }
      emit('opened')
    })
  } else {
    closeOpenChild()
    emit('closing')
    void nextTick(() => emit('closed'))
  }
})

/* -------------------------------------------------------------------------
 * 下拉层上下文:提供给 slot 内的菜单项(MenuFlyoutItem / Toggle / Separator / SubItem)
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
  closeAll,
  registerOpenSubmenu,
} satisfies MenuFlyoutLevelContext)

/* -------------------------------------------------------------------------
 * 菜单栏登记与键盘导航辅助(层内 ↑/↓/Home/End 与 MenuFlyout 同规则)
 * ---------------------------------------------------------------------- */

const handle: MenuBarItemHandle = {
  element: () => anchorRef.value,
  isOpen,
  disabled: () => props.disabled,
  open: openMenu,
  close: closeAll,
}

if (bar) {
  const unregister = bar.registerItem(handle)
  onScopeDispose(unregister)
}

/** roving tabindex:焦点所在的项 tabindex=0(首项缺省),其余 -1(TabNavigation=Once 语义)。 */
const tabIndex = computed(() => {
  if (props.disabled) return -1
  if (!bar) return 0 // 独立使用:保持可 Tab 进入
  const active = bar.activeHandle.value ?? bar.items.value[0] ?? null
  return active === handle ? 0 : -1
})

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

/** 展开态 ←/→:收起本项、聚焦并展开相邻项(WinUI OpenFlyoutFrom;键盘路径焦点进相邻层首项)。 */
function switchNeighbor(direction: 1 | -1): void {
  closeAll(false)
  bar?.openNeighbor(handle, direction)
}

/* -------------------------------------------------------------------------
 * 指针 / 键盘交互(项自身)
 * ---------------------------------------------------------------------- */

function onRootClick(): void {
  if (props.disabled) return
  if (isOpen.value) {
    // 本项已展开:hover 切换打开的(pendingFocusLayer=false)点击不动作(WinUI PointerPressed
    // 的 flyoutOpen 短路;亦规避触屏 pointerenter→click 串扰);点击展开的则 toggle 收起
    if (!pendingFocusLayer) return
    closeAll(false)
    return
  }
  if (bar?.hasOpenFlyout.value) return // 另一项展开中:hover 已先行切换,点击不动作(WinUI 同)
  if (bar) bar.requestOpen(handle, true)
  else openMenu(true) // 独立使用(无 MenuBar 祖先):退化为普通锚定菜单
}

function onRootPointerEnter(): void {
  if (props.disabled || isOpen.value) return
  // 栏内已有下拉打开:横移鼠标即切换(WinUI MenuBarItem 招牌行为)
  if (bar?.hasOpenFlyout.value) bar.requestOpen(handle, false)
}

function onRootFocusin(): void {
  bar?.setActive(handle) // roving tabindex 标记
}

// 焦点移出(如 Tab)且未进入本层/其他已开弹层:收起(与 DropDownButton 的 focusout 约定一致)
function onRootFocusout(event: FocusEvent): void {
  if (!isOpen.value) return
  const related = event.relatedTarget
  if (!(related instanceof Node)) return // 焦点回浏览器壳 / 层卸载:不视为 dismiss
  const layer = layerRef.value
  if (layer && layer.contains(related)) return
  if (anchorRef.value?.contains(related)) return
  if (related instanceof Element && isInsideAnyPopupLayer(related)) return
  closeAll(false)
}

function onRootKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  switch (event.key) {
    // ↓ / Alt+↓ / Enter / Space:展开(已展开则把焦点移入层首项,WinUI 重 Show 语义的可用等价)
    case 'ArrowDown':
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (isOpen.value) {
        closeOpenChild()
        focusMenuItem(layerRef.value, 'first')
      } else {
        bar?.requestOpen(handle, true)
      }
      break
    // 展开态 ←/→:换菜单(OpenFlyoutFrom);未展开 ←/→:仅移焦(MoveFocusTo)
    case 'ArrowRight':
      event.preventDefault()
      if (isOpen.value) switchNeighbor(1)
      else bar?.moveFocus(anchorRef.value, 1)
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (isOpen.value) switchNeighbor(-1)
      else bar?.moveFocus(anchorRef.value, -1)
      break
    case 'Home':
      event.preventDefault()
      bar?.focusEdge('first')
      break
    case 'End':
      event.preventDefault()
      bar?.focusEdge('last')
      break
  }
}

/* -------------------------------------------------------------------------
 * 下拉层键盘导航(↑/↓/Home/End 与 MenuFlyout 同规则;←/→ 换菜单 —— 子菜单宿主行
 * 已处理并 preventDefault 的 → 不重复接管,以 event.defaultPrevented 判定)
 * ---------------------------------------------------------------------- */

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
    case 'ArrowRight':
      if (event.defaultPrevented) return // MenuFlyoutSubItem 行已用它展开子菜单
      event.preventDefault()
      switchNeighbor(1)
      break
    case 'ArrowLeft':
      if (event.defaultPrevented) return
      event.preventDefault()
      switchNeighbor(-1)
      break
    // Tab:关闭菜单,不拦截默认焦点移动(WinUI 菜单 Tab 即 light dismiss)
    case 'Tab':
      closeAll(false)
      break
  }
}

// 卸载时清空子菜单登记句柄(句柄指向的子组件随本组件 slot 卸载,无需显式 close)
onScopeDispose(() => {
  openChildHandle = null
})
</script>

<template>
  <!-- 项根即锚与焦点位(WinUI ContentRoot + ContentButton 合一):role=menuitem 挂在
       menubar 直接子级,tabindex 走 roving(见 tabIndex 计算属性) -->
  <div
    ref="anchorRef"
    class="wui-menu-bar-item"
    :class="{ 'is-open': isOpen, 'is-disabled': disabled }"
    role="menuitem"
    aria-haspopup="menu"
    :aria-expanded="isOpen"
    :aria-disabled="disabled || undefined"
    :tabindex="tabIndex"
    v-bind="$attrs"
    @click="onRootClick"
    @pointerenter="onRootPointerEnter"
    @focusin="onRootFocusin"
    @focusout="onRootFocusout"
    @keydown="onRootKeydown"
  >
    <span class="item-title">{{ title }}</span>
  </div>

  <!-- 下拉菜单层:Teleport 到 body,复用 .wui-popup-layer 外壳(z-index 自动分配);
       data-wui-menu-layer 标记使子弹层(级联子菜单)的外部点击豁免与 Escape 逐级生效。
       动效走 MenuFlyout 同通道(MR1/A6:源 MenuBar 下拉经 MenuFlyoutPresenter 的
       MenuPopupThemeTransition)—— 层根加 wui-menu-flyout-layer 类,由 popup.css
       全局规则挂 wui-menu-popup-expand-in(250ms scaleY 0.5→1 (0,0,0,1))+ 83ms
       线性淡入,离场 83ms 线性淡出 -->
  <Teleport to="body">
    <Transition name="wui-menu-flyout">
      <div
        v-if="isOpen"
        ref="layerRef"
        class="wui-popup-layer wui-menu-flyout-layer wui-menu-bar-layer"
        role="menu"
        aria-orientation="vertical"
        :aria-label="title"
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
/* ======================================================================
 * 项组合态配色(CommonStates;MenuBarItemBackground* = SubtleFill* 系列,
 * theme.css 未提取,按既有约定取同值 token,见 wiki 差异节)
 * ====================================================================== */
.wui-menu-bar-item {
  --mbi-bg: transparent; /* MenuBarItemBackground = SubtleFillColorTransparentBrush */
  --mbi-fg: var(--wui-system-control-foreground-base-high); /* MenuBarItemForeground = TextFillColorPrimaryBrush 同值 */
  /* SubtleFillColorSecondary/Tertiary 源值(Common_themeresources_any.xaml L25-L27/L229-L230):
     XAML AARRGGBB light #09000000/#06000000 → CSS RRGGBBAA #00000009/#00000006;
     dark #0FFFFFFF/#0AFFFFFF → CSS #FFFFFF0F/#FFFFFF0A。theme.css 未提取该系列,
     按组件局部 token 承载(FIX9 ColorPicker 先例);此前借用的 grid-view-item
     token(9.8%/20%)与源不符,VR-B17 登记后订正。 */
  --mbi-subtle-secondary: #00000009;
  --mbi-subtle-tertiary: #00000006;
}

html[data-theme='dark'] .wui-menu-bar-item {
  --mbi-subtle-secondary: #ffffff0f;
  --mbi-subtle-tertiary: #ffffff0a;
}

/* PointerOver ← MenuBarItemBackgroundPointerOver = SubtleFillColorSecondaryBrush */
.wui-menu-bar-item:not(.is-disabled):hover {
  --mbi-bg: var(--mbi-subtle-secondary);
}

/* Pressed ← MenuBarItemBackgroundPressed = SubtleFillColorTertiaryBrush */
.wui-menu-bar-item:not(.is-disabled):active {
  --mbi-bg: var(--mbi-subtle-tertiary);
}

/* Selected(下拉打开)← MenuBarItemBackgroundSelected = SubtleFillColorTertiaryBrush */
.wui-menu-bar-item.is-open:not(.is-disabled) {
  --mbi-bg: var(--mbi-subtle-tertiary);
}

.wui-menu-bar-item.is-disabled {
  --mbi-fg: var(--wui-system-control-disabled-base-high);
}

/* ======================================================================
 * 布局(ControlTemplate):Margin=MenuBarItemMargin 4,4,4,4、
 * CornerRadius=ControlCornerRadius(4,复用 hyperlink 焦点半径 token)、
 * ContentButton Padding=MenuBarItemButtonPadding 10,4,10,4、字号 ControlContentThemeFontSize;
 * 高度由 MenuBar 的 MinHeight=40(MenuBarHeight)+ align-items: stretch 撑出。
 * ====================================================================== */
.wui-menu-bar-item {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  margin: 4px;
  padding: 4px 10px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  line-height: normal;
  color: var(--mbi-fg);
  background: var(--mbi-bg);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  white-space: nowrap;
}

.wui-menu-bar-item:focus {
  outline: none;
}

/* 系统焦点视觉:WinUI UseSystemFocusVisuals=True(FocusVisualMargin=-3)近似为
   primary/secondary 双环 outline(同 DropDownButton 约定) */
.wui-menu-bar-item:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.item-title {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: clip;
}

/* ======================================================================
 * 下拉菜单层皮肤(MenuFlyoutPresenter 默认模板,与 MenuFlyout.vue 同规格):
 * Padding=1 + ScrollerMargin 0,4,0,4(等效 5px 1px)、MinHeight=32、Min/MaxWidth=96/456、
 * Background/Border=--wui-menu-flyout-presenter-*;圆角/阴影由 .wui-popup-layer 提供。
 * ====================================================================== */
.wui-menu-bar-layer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
  min-width: 96px;
  max-width: 456px;
  min-height: 32px;
  padding: 5px 1px;
  background: var(--wui-menu-flyout-presenter-background);
  border: 1px solid var(--wui-menu-flyout-presenter-border);
}

/* 出入场:走 MenuFlyout 同通道(MR1/A6)—— 层根已带 wui-menu-flyout-layer 类,
   MenuPopupThemeTransition 展开(250ms scaleY 0.5→1 + 83ms 线性淡入;离场 83ms
   线性淡出)由 popup.css 的 .wui-menu-flyout-layer 全局规则经上方
   <Transition name="wui-menu-flyout"> 挂接,此处不再有 scoped 规则 */
</style>
