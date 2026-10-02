<script setup lang="ts">
// WuiMenuFlyoutSubItem —— WinUI MenuFlyoutSubItem 的 Web 复刻(级联子菜单项)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style x:Key="MenuFlyoutSubItemRevealStyle" TargetType="MenuFlyoutSubItem">(L18728 起):
//   - 行内列序与 MenuFlyoutItem 一致(勾选列 → 图标盒 16x16 → 文本 → 快捷键/箭头);
//   - 右侧箭头 SubItemChevron:字形 E0E3(ChevronRight)、FontSize=12、
//     Margin=MenuFlyoutItemChevronMargin="24,0,0,0"(此处以内联 SVG 等形复刻);
//   - 状态:CommonStates Normal/PointerOver/Pressed/Disabled + SubMenuOpened(子菜单展开时
//     行底色 accent-light-3 高亮),全部取 theme.css 的 --wui-menu-flyout-sub-item-* token。
// Reveal 揭示光照(MR8,默认启用):WinUI 3 MenuFlyoutSubItem 默认样式即
//   MenuFlyoutSubItemRevealStyle(generic.xaml L18402 keyless BasedOn,L18728 起);光照本体
//   =公共层(reveal.css + useReveal),口径同 MenuFlyoutItem(底板光半径
//   Clamp(Max(W,H)+12,16,512)、边框光 39px narrow、光环厚度 1px);v-on 对象绑定与行上既有
//   @pointerenter/@pointerleave 经编译期 mergeProps 合并,互不覆盖。
// 行为规格(对照 WinUI MenuFlyoutSubItem):
//   - hover(150ms 延迟)/点击/Enter/Space/→ 展开子菜单;子菜单层 placement='right-start'(级联右开,
//     usePopupLayer 空间不足自动翻转/推回);hover 离开 300ms 后收起;
//   - ← 在子菜单内收起本级并归还焦点到本行;Escape 逐级收起(通过向父层登记「打开中的子菜单」
//     计数实现:更深层未收起时本层忽略 Escape);Tab 收起本级;
//   - 子菜单层即一个菜单层:为其 slot 内的 MenuFlyoutItem 等提供层上下文(见 MenuFlyoutItem 头注),
//     并以 registerOpenSubmenu 向父层登记,用于兄弟互斥与 Escape 逐级。
import { computed, inject, nextTick, onScopeDispose, provide, reactive, ref, useSlots, type Ref } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import { useReveal } from '../composables/useReveal'
import { symbolToGlyph } from '@/utils/symbolIcons'
import '../styles/popup.css'
import '../styles/reveal.css'

/** 菜单层上下文(与 MenuFlyoutItem 同构,结构化类型兼容)。 */
interface MenuFlyoutLevelContext {
  isOpen: Ref<boolean>
  glyphs: Ref<{ check: boolean; icon: boolean }>
  registerItem: (item: { checkable: boolean; hasIcon: () => boolean }) => () => void
  closeAll: (restoreFocus: boolean) => void
  /** 子菜单打开登记:打开中的更深子菜单句柄(用于兄弟互斥与 Escape 逐级);返回注销函数。 */
  registerOpenSubmenu: (handle: { close: () => void }) => () => void
}

/** 子菜单行 hover 展开延迟(ms)。 */
const HOVER_OPEN_DELAY = 150
/** 指针离开行/子菜单层后收起延迟(ms)。 */
const HOVER_CLOSE_DELAY = 300
/** 子菜单层与父菜单的间距(px)。 */
const SUBMENU_OFFSET = 4

defineOptions({ name: 'WuiMenuFlyoutSubItem', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 子菜单项文本(WinUI Text;默认 slot 兜底,slot 优先)。 */
    text?: string
    /** 图标:WinUI Symbol 枚举名(如 'Send')或 Segoe 字形字符;亦可用 #icon slot 放任意图标元素。 */
    icon?: string
    /** 禁用(WinUI IsEnabled = false 的取反映射):不可展开、不参与键盘导航。 */
    disabled?: boolean
  }>(),
  { text: '', icon: '', disabled: false },
)

const emit = defineEmits<{
  /** 点击/键盘展开子菜单时触发(WinUI Click;子菜单展开本身不受禁用外条件限制)。 */
  click: [event: MouseEvent]
}>()

const slots = useSlots()

// —— 父菜单层上下文(根 MenuFlyout 或上级 SubItem;独立使用时为 null)——
const parentLevel = inject<MenuFlyoutLevelContext | null>('wuiMenuFlyoutLevel', null)

// —— 本行作为父层的一个菜单项登记(推导父层勾选列/图标列占位)——
const iconGlyph = computed(() => symbolToGlyph(props.icon) ?? props.icon)
const hasIcon = computed(() => iconGlyph.value !== '' || slots.icon !== undefined)
if (parentLevel) {
  const unregisterItem = parentLevel.registerItem({ checkable: false, hasIcon: () => hasIcon.value })
  onScopeDispose(unregisterItem)
}

// 本行是否渲染勾选列/图标列:跟随父层的列情况(自身有图标则恒渲染图标列)
const rowShowCheckCol = computed(() => parentLevel?.glyphs.value.check === true)
const rowShowIconCol = computed(() => hasIcon.value || parentLevel?.glyphs.value.icon === true)

// reveal 光照(公共层):指针位置/光斑半径写入 CSS 变量(非禁用且指针设备启用);
// 光晕渲染在 reveal.css 的 ::before(底板光)/::after(边框光)。
const revealHandlers = useReveal(() => !props.disabled)

/* -------------------------------------------------------------------------
 * 子菜单层:复用弹层基建(placement='right-start' 级联右开 + flip/shift)
 * ---------------------------------------------------------------------- */

const open = ref(false)
const rowRef = usePopupAnchor().anchorRef

/** 本层(子菜单)内当前打开的更深子菜单句柄(嵌套级联)。 */
let openChildHandle: { close: () => void } | null = null
/** 本子菜单向父层的打开登记注销函数。 */
let unregisterFromParent: (() => void) | undefined

function closeOpenChild(): void {
  openChildHandle?.close()
  openChildHandle = null
}

function registerOpenSubmenu(handle: { close: () => void }): () => void {
  if (openChildHandle && openChildHandle !== handle) openChildHandle.close()
  openChildHandle = handle
  return () => {
    if (openChildHandle === handle) openChildHandle = null
  }
}

// light-dismiss:落点在本链任一菜单层之外才收起(子菜单层 Teleport 到 body,
// 不在父层 DOM 内,须按 data-wui-menu-layer 标记排除,否则点子菜单会被判为外部)
function onOutsidePress(event: PointerEvent): void {
  const target = event.target
  if (target instanceof Element && target.closest('[data-wui-menu-layer]')) return
  closeSubmenu(false)
}

// Escape 逐级:更深层子菜单仍打开时忽略(由更深层自己收起)
function onEscapeKey(): void {
  if (openChildHandle) return
  closeSubmenu(true)
}

const { layerRef, update } = usePopupLayer({
  anchor: rowRef,
  placement: 'right-start',
  offset: { mainAxis: SUBMENU_OFFSET },
  onOutsidePress,
  onEscape: onEscapeKey,
  onAnchorScroll: () => closeSubmenu(false),
})

/* -------------------------------------------------------------------------
 * 子菜单层上下文:提供给 slot 内的菜单项(MenuFlyoutItem / Toggle / 更深 SubItem)
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

// 嵌套项调用:先收起本子菜单,再沿链向上关闭整条菜单(子菜单内 Tab 同样走此路径)
function closeChain(restoreFocus: boolean): void {
  closeSubmenu(false)
  parentLevel?.closeAll(restoreFocus)
}

provide('wuiMenuFlyoutLevel', {
  isOpen: open,
  glyphs,
  registerItem,
  closeAll: closeChain,
  registerOpenSubmenu,
} satisfies MenuFlyoutLevelContext)

/* -------------------------------------------------------------------------
 * 展开/收起与 hover 延迟
 * ---------------------------------------------------------------------- */

let openTimer: number | undefined
let closeTimer: number | undefined

function cancelTimers(): void {
  if (openTimer !== undefined) {
    window.clearTimeout(openTimer)
    openTimer = undefined
  }
  if (closeTimer !== undefined) {
    window.clearTimeout(closeTimer)
    closeTimer = undefined
  }
}

function openSubmenu(focusFirst: boolean): void {
  if (props.disabled) return
  cancelTimers()
  if (!open.value) {
    open.value = true
    // 向父层登记打开中的子菜单:兄弟互斥(父层关掉上一个)+ Escape 逐级计数
    unregisterFromParent?.()
    if (parentLevel) {
      unregisterFromParent = parentLevel.registerOpenSubmenu({ close: () => closeSubmenu(false) })
    }
  }
  void nextTick(() => {
    update()
    // 已打开时再请求聚焦(如 hover 展开后按 →)同样把焦点移入子菜单首项
    if (focusFirst) focusMenuItem(layerRef.value, 'first')
  })
}

function closeSubmenu(restoreFocus: boolean): void {
  if (!open.value) return
  cancelTimers()
  // 级联收起已打开的更深子菜单(避免父层退场时子层滞留)
  closeOpenChild()
  open.value = false
  unregisterFromParent?.()
  unregisterFromParent = undefined
  if (restoreFocus) rowRef.value?.focus()
}

function toggleSubmenu(focusFirst: boolean): void {
  if (open.value) closeSubmenu(true)
  else openSubmenu(focusFirst)
}

function onRowPointerEnter(): void {
  // 指针回到行上:先取消待执行的收起(子菜单已展开时也不能让收起计时器命中)
  if (closeTimer !== undefined) {
    window.clearTimeout(closeTimer)
    closeTimer = undefined
  }
  if (props.disabled || open.value) return
  cancelTimers()
  openTimer = window.setTimeout(() => {
    openTimer = undefined
    openSubmenu(false)
  }, HOVER_OPEN_DELAY)
}

function onRowPointerLeave(): void {
  if (openTimer !== undefined) {
    window.clearTimeout(openTimer)
    openTimer = undefined
  }
  scheduleClose()
}

/** 指针进入子菜单层:仅取消待执行的收起(行 → 层移动路径的衔接)。 */
function onLayerPointerEnter(): void {
  if (closeTimer !== undefined) {
    window.clearTimeout(closeTimer)
    closeTimer = undefined
  }
}

function scheduleClose(): void {
  if (!open.value) return
  if (closeTimer !== undefined) window.clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => {
    closeTimer = undefined
    closeSubmenu(false)
  }, HOVER_CLOSE_DELAY)
}

onScopeDispose(cancelTimers)

/* -------------------------------------------------------------------------
 * 指针/键盘交互
 * ---------------------------------------------------------------------- */

function onRowClick(event: MouseEvent): void {
  if (props.disabled) return
  emit('click', event)
  toggleSubmenu(false)
}

function onRowKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  switch (event.key) {
    // Enter/Space:展开(已开则收起),同 WinUI 子菜单项激活
    case 'Enter':
    case ' ':
      event.preventDefault()
      toggleSubmenu(false)
      break
    // →:展开子菜单并把焦点移入其首项(键盘进出子菜单)
    case 'ArrowRight':
      event.preventDefault()
      openSubmenu(true)
      break
  }
}

function onSubmenuKeydown(event: KeyboardEvent): void {
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
    // ←:收起本级并把焦点归还到本行(键盘退出子菜单)
    case 'ArrowLeft':
      event.preventDefault()
      closeSubmenu(true)
      break
    // Tab:与 light dismiss 同级 —— 关闭整条菜单链(WinUI/ARIA 菜单语义),
    // 不拦截默认焦点移动
    case 'Tab':
      closeChain(false)
      break
  }
}

/* -------------------------------------------------------------------------
 * 键盘导航辅助(与 MenuFlyout 同规则:跳过 aria-disabled 项,循环步进)
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
</script>

<template>
  <div
    ref="rowRef"
    class="wui-menu-flyout-sub-item wui-reveal wui-reveal--border"
    :class="{ 'is-disabled': disabled, 'is-submenu-open': open }"
    role="menuitem"
    aria-haspopup="menu"
    :aria-expanded="open"
    tabindex="-1"
    data-wui-menu-item
    :aria-disabled="disabled || undefined"
    v-bind="$attrs"
    v-on="revealHandlers"
    @click="onRowClick"
    @pointerenter="onRowPointerEnter"
    @pointerleave="onRowPointerLeave"
    @keydown="onRowKeydown"
  >
    <span v-if="rowShowCheckCol" class="menu-col menu-col-check" aria-hidden="true"></span>
    <span v-if="rowShowIconCol" class="menu-col menu-col-icon" aria-hidden="true">
      <slot name="icon">{{ iconGlyph }}</slot>
    </span>
    <!-- 行标签只取 text:默认 slot 是子菜单内容(渲染进 Teleport 层),不能作为行文案 -->
    <span class="menu-label">{{ text }}</span>
    <!-- 箭头:SubItemChevron E0E3(ChevronRight)12px,以内联 SVG 等形复刻 -->
    <span class="menu-chevron" aria-hidden="true">
      <svg viewBox="0 0 12 12" focusable="false"><path d="M4 2 L8 6 L4 10" /></svg>
    </span>
  </div>

  <!-- 子菜单层:Teleport 到 body,复用 .wui-popup-layer 外壳(圆角/阴影/z-index 自动分配) -->
  <Teleport to="body">
    <Transition name="wui-menu-flyout">
      <div
        v-if="open"
        ref="layerRef"
        class="wui-popup-layer wui-menu-flyout-layer wui-menu-flyout-layer--sub"
        role="menu"
        aria-orientation="vertical"
        tabindex="-1"
        data-wui-menu-layer
        @keydown="onSubmenuKeydown"
        @pointerenter="onLayerPointerEnter"
        @pointerleave="scheduleClose"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ======================================================================
 * 行组合态配色(CommonStates + SubMenuOpened → --wui-menu-flyout-sub-item-*)
 * ====================================================================== */
.wui-menu-flyout-sub-item {
  --msi-bg: var(--wui-menu-flyout-sub-item-reveal-background);
  --msi-fg: var(--wui-menu-flyout-sub-item-foreground);
  --msi-chevron: var(--wui-menu-flyout-sub-item-chevron);
}

.wui-menu-flyout-sub-item:not(.is-disabled):hover {
  --msi-bg: var(--wui-menu-flyout-sub-item-reveal-background-pointer-over);
  --msi-fg: var(--wui-menu-flyout-sub-item-foreground-pointer-over);
  --msi-chevron: var(--wui-menu-flyout-sub-item-chevron-pointer-over);
}

.wui-menu-flyout-sub-item:not(.is-disabled):active {
  --msi-bg: var(--wui-menu-flyout-sub-item-reveal-background-pressed);
  --msi-fg: var(--wui-menu-flyout-sub-item-foreground-pressed);
  --msi-chevron: var(--wui-menu-flyout-sub-item-chevron-pressed);
}

/* SubMenuOpened:子菜单展开时行高亮(accent-light-3),对齐 VisualState SubMenuOpened */
.wui-menu-flyout-sub-item.is-submenu-open:not(.is-disabled) {
  --msi-bg: var(--wui-menu-flyout-sub-item-reveal-background-sub-menu-opened);
  --msi-fg: var(--wui-menu-flyout-sub-item-foreground-sub-menu-opened);
  --msi-chevron: var(--wui-menu-flyout-sub-item-chevron-sub-menu-opened);
}

.wui-menu-flyout-sub-item.is-disabled {
  --msi-bg: var(--wui-menu-flyout-sub-item-reveal-background-disabled);
  --msi-fg: var(--wui-menu-flyout-sub-item-foreground-disabled);
  --msi-chevron: var(--wui-menu-flyout-sub-item-chevron-disabled);
}

/* Focused:列表高亮背景即焦点视觉(同 WinUI 3 菜单项) */
.wui-menu-flyout-sub-item:focus {
  --msi-bg: var(--wui-menu-flyout-sub-item-reveal-background-pointer-over);
  --msi-fg: var(--wui-menu-flyout-sub-item-foreground-pointer-over);
  --msi-chevron: var(--wui-menu-flyout-sub-item-chevron-pointer-over);
}

.wui-menu-flyout-sub-item {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  padding: 9px 11px 10px;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  line-height: normal;
  color: var(--msi-fg);
  background: var(--msi-bg);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
}

.wui-menu-flyout-sub-item:focus {
  outline: none;
}

/* 系统焦点视觉:UseSystemFocusVisuals=True + 默认 FocusVisualMargin=0 →
   键盘聚焦 = 高亮底 + 元素内双环(primary [0,2] + secondary [2,3]) */
.wui-menu-flyout-sub-item:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

/* ======================================================================
 * Reveal 揭示光照(公共层 reveal.css,默认启用):口径同 MenuFlyoutItem ——
 * 边框光半径 39px(narrow,RevealBorderLight.cpp L24-35);光环厚度 1px
 * (MenuFlyoutItemRevealBorderThickness 同族)。底色各态已消费
 * --wui-menu-flyout-sub-item-reveal-* token(与源画刷同源值),光照叠于其上。
 * ====================================================================== */
.wui-menu-flyout-sub-item.wui-reveal {
  --wui-reveal-border-width: 1px;
  --wui-reveal-border-radius: 39px;
}

/* 禁用行不点亮光晕(div 无 :disabled,由类门抑制) */
.wui-menu-flyout-sub-item.is-disabled.wui-reveal:hover::before,
.wui-menu-flyout-sub-item.is-disabled.wui-reveal:hover::after {
  opacity: 0;
}

.menu-col {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.menu-col-check,
.menu-col-icon {
  width: 16px;
  height: 16px;
}

.menu-col-icon {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 16px;
  line-height: 1;
}

.menu-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  white-space: nowrap;
  text-overflow: clip;
}

/* 箭头:FontSize=12 + Margin="24,0,0,0"(MenuFlyoutItemChevronMargin) */
.menu-chevron {
  flex: none;
  display: inline-flex;
  align-items: center;
  margin-left: 24px;
}

.menu-chevron svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--msi-chevron);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ======================================================================
 * 子菜单层皮肤(MenuFlyoutPresenter 默认模板):
 * Background/Border=--wui-menu-flyout-presenter-*、Padding=1(PresenterThemePadding)、
 * 纵向 4px 内边距(MenuFlyoutScrollerMargin 0,4,0,4 与 1px 相加)、
 * MinHeight=32(MenuFlyoutThemeMinHeight)、Min/MaxWidth=96/456(FlyoutThemeMin/MaxWidth)。
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
  background: var(--wui-menu-flyout-presenter-background);
  border: 1px solid var(--wui-menu-flyout-presenter-border);
}

/* 出入场动画(MenuPopupThemeTransition 子菜单分支:closedRatio 0.67 展开缩放
   + 83ms 线性淡入,出场 83ms 线性淡出)书写在 popup.css 全局层
   (.wui-menu-flyout-layer--sub 变体),此处不重复定义(scope 属性会
   覆盖基建同名额) */
</style>
