<script setup lang="ts">
// WuiDropDownButton —— WinUI DropDownButton 的 Web 复刻(带下拉箭头的按钮,点击弹出 flyout)。
// 视觉规格:CK/WinUI-Reference/controls/dev/DropDownButton/DropDownButton.xaml
//   <Style x:Key="DefaultDropDownButtonStyle" TargetType="DropDownButton">(generic.xaml 本体无
//   TargetType="DropDownButton" 段,模板在该 dev 资源字典中):外观复用 Button 资源 ——
//   ButtonBackground/ButtonForeground/ButtonBorderBrush/ButtonPadding(8,4,8,5)/
//   ButtonBorderThemeThickness(2)/ControlCornerRadius(4)/ControlContentThemeFontSize(14px);
//   内容右侧 ChevronDown 小字形(AnimatedChevronDownSmallVisualSource,回退 FontIconSource
//   Glyph=E96E、FontSize=8、SymbolThemeFontFamily,Margin="8,0,0,0"、12x12),字形前景
//   DropDownButtonForegroundSecondary(TextFillColorSecondary;PointerOver/Pressed 为
//   TextFillColorTertiary;Disabled=ButtonForegroundDisabled —— 三者分别消费 theme.css 的
//   --wui-text-fill-color-secondary / -tertiary / --wui-button-foreground-disabled)。
//   四态 Normal/PointerOver/Pressed/Disabled 均为 DiscreteObjectKeyFrame 即时切换 + 系统焦点视觉。
// 行为规格:点击整钮开/再点关(官方文档:↓ / Alt+↓ 亦可打开);flyout 内容经弹层公共基建
//   锚定展开(wiki/controls/_popup-infra.md:定位/翻转/推回/z-index/嵌套豁免全部由基建负责);
//   light dismiss:点击层与锚之外 / Escape / 锚滚动链滚动即关闭(对齐 MenuFlyout/Flyout 语义分工);
//   #flyout slot 可承载菜单族(MenuFlyoutItem / ToggleMenuFlyoutItem / MenuFlyoutSeparator /
//   MenuFlyoutSubItem —— 本组件 provide 与 MenuFlyout 同构的层上下文)或任意内容(表单等);
//   键盘与焦点:Enter/Space 原生激活开/关;↓ 开并焦点入层;菜单内容支持 ↑/↓/Home/End 项间移动、
//   Tab 关闭;Escape 逐级关闭(子菜单未收起时由更深层处理)并把焦点归还到按钮;
//   焦点移出层外(且未进入其他已开弹层)即关闭 —— 见 wiki「焦点管理」节。
// isOpen 映射:WinUI DropDownButton 本身无 IsOpen 属性(开关状态在其 FlyoutBase 上且只读),
//   Web 侧合并为 v-model:is-open 双向暴露,便于编程开关与状态读取(详见 wiki 差异节)。
import { computed, nextTick, onScopeDispose, provide, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import type { PopupPlacement } from '@/composables/usePopup'
import { focusFirst, isInsideAnyPopupLayer } from '@/utils/popup'
import '../styles/popup.css'

/** 菜单层上下文(与 MenuFlyout / MenuFlyoutItem / MenuFlyoutSubItem 同构,结构化类型兼容)。 */
interface MenuFlyoutLevelContext {
  /** 本层是否打开。 */
  isOpen: Ref<boolean>
  /** 层内列对齐状态:是否出现勾选项 / 图标项。 */
  glyphs: Ref<{ check: boolean; icon: boolean }>
  /** 菜单项登记(推导勾选/图标占位列);返回注销函数。 */
  registerItem: (item: { checkable: boolean; hasIcon: () => boolean }) => () => void
  /** 关闭本 flyout;restoreFocus=true 时把焦点归还按钮(键盘路径)。 */
  closeAll: (restoreFocus: boolean) => void
  /** 子菜单登记(兄弟互斥 + Escape 逐级);返回注销函数。 */
  registerOpenSubmenu: (handle: { close: () => void }) => () => void
}

defineOptions({ name: 'WuiDropDownButton', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 按钮文本(WinUI Content;默认 slot 兜底,slot 优先,可放 FontIcon 等任意内容)。 */
    content?: string
    /** 禁用(WinUI IsEnabled 的取反映射,沿用原生 disabled 语义)。 */
    disabled?: boolean
    /** flyout 放置位;默认 'bottom-start'(官方示例 MenuFlyout Placement=BottomEdgeAlignedLeft 的基建映射)。 */
    placement?: PopupPlacement
    /** flyout 与按钮的主轴间距(px)。 */
    offset?: number
  }>(),
  { content: '', disabled: false, placement: 'bottom-start', offset: 4 },
)

// 显式声明 emits(含 click):父级 @click 监听改走 emit 转发,防止原生 click 重复触发。
const emit = defineEmits<{
  /** 点击按钮(WinUI Click;Space/Enter 同样触发,禁用时不触发)。 */
  click: [event: MouseEvent]
  /** flyout 开始打开(WinUI Opening;isOpen 变 true 时同步触发)。 */
  opening: []
  /** flyout 已打开且完成首次定位(WinUI Opened)。 */
  opened: []
  /** flyout 开始关闭(WinUI Closing)。 */
  closing: []
  /** flyout 已关闭(WinUI Closed)。 */
  closed: []
  // 注:update:isOpen 的 emit 类型由下方 defineModel 提供,勿在此重复声明。
}>()

// 双向:isOpen(WinUI 侧状态在 DropDownButton.Flyout 的 IsOpen 上且只读;Web 合并为可写模型)
const isOpen = defineModel<boolean>('isOpen', { default: false })

// —— 锚:按钮根元素即 flyout 锚(usePopupAnchor 挂 data-wui-popup-anchor 标记)——
const anchorRef = usePopupAnchor().anchorRef

/* -------------------------------------------------------------------------
 * 菜单族承载:与 MenuFlyout 同一套层上下文 / 子菜单登记 / 键盘导航,
 * 让 MenuFlyoutItem 等组件直接放进 #flyout slot 即获得菜单行为;
 * 任意内容(非菜单)时 role / 方向键 / Tab 关闭按需停用(见 hasMenuItems 侦测)。
 * ---------------------------------------------------------------------- */

/** 本层当前打开的子菜单句柄(由 MenuFlyoutSubItem 登记)。 */
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

const registeredItems = reactive<Array<{ checkable: boolean; hasIcon: () => boolean }>>([])

/** 同层出现勾选项/图标项时,纯文本项补占位列(WinUI CheckPlaceholderStates 语义)。 */
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

/* -------------------------------------------------------------------------
 * 开 / 关与 light dismiss(基建「语义分工」表:MenuFlyout 三项回调全开)
 * ---------------------------------------------------------------------- */

/** 关闭 flyout:级联收起子菜单;键盘路径(restoreFocus=true)把焦点归还到按钮。 */
function closeFlyout(restoreFocus: boolean): void {
  if (!isOpen.value) return
  closeOpenChild()
  isOpen.value = false
  if (restoreFocus) restoreFocusToButton()
}

/** 焦点归还:按钮本身可聚焦(Escape / ↓ 路径关闭后焦点回到按钮,保留焦点视觉)。 */
function restoreFocusToButton(): void {
  anchorRef.value?.focus()
}

function onOutsidePress(): void {
  closeFlyout(false)
}

// Escape 逐级:子菜单仍打开时忽略(子菜单层是注册表栈顶,由更深层自己收起)
function onEscapeKey(): void {
  if (openChildHandle) return
  closeFlyout(true)
}

function onAnchorScroll(): void {
  closeFlyout(false) // WinUI:锚所在滚动链滚动即 light dismiss
}

const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: () => props.placement,
  offset: () => ({ mainAxis: props.offset }),
  onOutsidePress,
  onEscape: onEscapeKey,
  onAnchorScroll,
})

/** 层内是否为菜单内容(挂载后侦测 [data-wui-menu-item]):决定 role / 键盘导航 / 层皮肤。 */
const hasMenuItems = ref(false)

/* -------------------------------------------------------------------------
 * 键盘导航(菜单内容):↑/↓ 循环步进、Home/End 首/末;Tab 关闭(菜单模式)。
 * Enter/Space 由菜单项自身处理;任意内容模式下方向键不劫持(留给表单控件)。
 * ---------------------------------------------------------------------- */

function collectMenuItems(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>('[data-wui-menu-item]')).filter(
    (element) => element.getAttribute('aria-disabled') !== 'true',
  )
}

/** 焦点入层:菜单内容聚焦首个可用项;任意内容聚焦第一个可聚焦元素,兜底聚焦层根。 */
function focusIntoLayer(): void {
  const layer = layerRef.value
  if (!layer) return
  const items = collectMenuItems(layer)
  if (items.length > 0) {
    items[0]?.focus()
    return
  }
  if (!focusFirst(layer)) layer.focus()
}

function stepFocus(direction: 1 | -1): void {
  const items = collectMenuItems(layerRef.value)
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
  if (event.key === 'Tab') {
    // 菜单模式:Tab 即 light dismiss(WinUI 语义);任意内容模式交给 focusout 关闭
    if (hasMenuItems.value) closeFlyout(false)
    return
  }
  if (!hasMenuItems.value) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      closeOpenChild()
      stepFocus(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      closeOpenChild()
      stepFocus(-1)
      break
    case 'Home': {
      event.preventDefault()
      closeOpenChild()
      const first = collectMenuItems(layerRef.value)[0]
      first?.focus()
      break
    }
    case 'End': {
      event.preventDefault()
      closeOpenChild()
      const items = collectMenuItems(layerRef.value)
      items[items.length - 1]?.focus()
      break
    }
  }
}

// 焦点移出层外 → light dismiss;子弹层豁免(焦点移入本层内再开的弹层不算移出),
// 点按钮的路径由 relatedTarget 命中锚排除,交给 onButtonClick 的 toggle 处理。
function onLayerFocusout(event: FocusEvent): void {
  const related = event.relatedTarget
  if (!(related instanceof Node)) return // 焦点回到浏览器壳 / 层卸载:不视为 dismiss
  const layer = layerRef.value
  if (layer && layer.contains(related)) return
  if (anchorRef.value?.contains(related)) return
  if (related instanceof Element && isInsideAnyPopupLayer(related)) return
  closeFlyout(false)
}

/* -------------------------------------------------------------------------
 * 按钮侧交互:点击整钮开/再点关;↓ / Alt+↓ 打开(WinUI 键盘语义)
 * ---------------------------------------------------------------------- */

function onButtonClick(event: MouseEvent): void {
  emit('click', event)
  if (isOpen.value) closeFlyout(false)
  else isOpen.value = true
}

function onButtonKeydown(event: KeyboardEvent): void {
  if (event.key !== 'ArrowDown') return // ↓ 与 Alt+↓ 同样处理(官方键盘行为)
  event.preventDefault()
  if (isOpen.value) focusIntoLayer() // 已开:焦点移入层(菜单落首项)
  // 未开:isOpen 置 true 后由 watch 完成定位与焦点入层
  else isOpen.value = true
}

// —— 打开期副作用(首次定位、菜单侦测、焦点入层)与生命周期事件 ——
watch(isOpen, (value) => {
  if (value) {
    emit('opening')
    void nextTick(() => {
      if (!isOpen.value) return // 打开中途又被关闭:跳过 open 侧效应
      update()
      hasMenuItems.value = layerRef.value?.querySelector('[data-wui-menu-item]') !== null
      focusIntoLayer()
      emit('opened')
    })
  } else {
    // 外部编程关闭(v-model)路径也要级联收起子菜单(closeFlyout 已覆盖内部路径)
    closeOpenChild()
    emit('closing')
    void nextTick(() => emit('closed'))
  }
})

// 卸载时清空子菜单登记句柄(句柄指向的子组件随本组件 slot 卸载,无需显式 close)
onScopeDispose(() => {
  openChildHandle = null
})

// 层上下文:提供给 #flyout slot 内的菜单族组件(与 MenuFlyout 根层同一契约)
provide('wuiMenuFlyoutLevel', {
  isOpen,
  glyphs,
  registerItem,
  closeAll: closeFlyout,
  registerOpenSubmenu,
} satisfies MenuFlyoutLevelContext)
</script>

<template>
  <!-- 整钮即锚:原生 button 自带 Space/Enter 激活与 role="button" 语义 -->
  <button
    ref="anchorRef"
    type="button"
    class="wui-dropdown-button"
    :disabled="disabled"
    aria-haspopup="menu"
    :aria-expanded="isOpen ? 'true' : 'false'"
    v-bind="$attrs"
    @click="onButtonClick"
    @keydown.down.prevent="onButtonKeydown"
  >
    <span class="ddb-content"><slot>{{ content }}</slot></span>
    <!-- ChevronDown 小字形:回退 FontIconSource Glyph=E96E、FontSize=8、SymbolThemeFontFamily -->
    <span class="ddb-chevron" aria-hidden="true">&#xE96E;</span>
  </button>

  <!-- flyout 层:Teleport 到 body,复用 .wui-popup-layer 外壳(z-index 自动分配);
       菜单内容用 MenuFlyoutPresenter 皮肤,任意内容用 FlyoutPresenter 皮肤 -->
  <Teleport to="body">
    <Transition name="wui-dropdown-button">
      <div
        v-if="isOpen"
        ref="layerRef"
        class="wui-popup-layer wui-dropdown-button-layer"
        :class="hasMenuItems ? 'wui-ddb-menu-layer' : 'wui-ddb-content-layer'"
        :role="hasMenuItems ? 'menu' : 'dialog'"
        :aria-orientation="hasMenuItems ? 'vertical' : undefined"
        tabindex="-1"
        @keydown="onLayerKeydown"
        @focusout="onLayerFocusout"
      >
        <slot name="flyout" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ======================================================================
 * 按钮外观(DefaultDropDownButtonStyle):复用 Button 资源 + 右侧 ChevronDown。
 * ButtonPadding="8,4,8,5"、BorderThickness=2、ControlCornerRadius=4、
 * ControlContentThemeFontSize=14;颜色/字号/圆角一律 --wui-* token。
 * ====================================================================== */
.wui-dropdown-button {
  /* 字形前景按交互态切换(中间变量就地消费,对应 CommonStates 各 DiscreteObjectKeyFrame):
     Normal = DropDownButtonForegroundSecondary(= TextFillColorSecondary)
     PointerOver/Pressed = …SecondaryPointerOver/Pressed(= TextFillColorTertiary)
     Disabled = ButtonForegroundDisabled;三个 token 均取自 theme.css。 */
  --ddb-chevron: var(--wui-text-fill-color-secondary);

  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  padding: 4px 8px 5px;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-button-foreground);
  background: var(--wui-button-background);
  border: 2px solid var(--wui-button-border);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  cursor: default;
  user-select: none;
  touch-action: manipulation;
}

/* 内容列(*):ContentPresenter 水平居中(Control 默认对齐);字形列(Auto)+ Margin 8,0,0,0 */
.ddb-content {
  flex: 1 1 auto;
  min-width: 0;
  text-align: center;
}

.ddb-chevron {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  margin-left: 8px;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 8px;
  line-height: 1;
  color: var(--ddb-chevron);
}

/* 状态色一律即时切换(generic.xaml 各态均为 DiscreteObjectKeyFrame,无过渡动画) */

.wui-dropdown-button:hover:not(:disabled) {
  color: var(--wui-button-foreground-pointer-over);
  background: var(--wui-button-background-pointer-over);
  border-color: var(--wui-button-border-brush-pointer-over);
  /* WinUI:Chevron → DropDownButtonForegroundSecondaryPointerOver = TextFillColorTertiary */
  --ddb-chevron: var(--wui-text-fill-color-tertiary);
}

.wui-dropdown-button:active:not(:disabled) {
  color: var(--wui-button-foreground-pressed);
  background: var(--wui-button-background-pressed);
  border-color: var(--wui-button-border-brush-pressed);
  /* WinUI:Chevron → DropDownButtonForegroundSecondaryPressed = TextFillColorTertiary */
  --ddb-chevron: var(--wui-text-fill-color-tertiary);
}

.wui-dropdown-button:disabled {
  color: var(--wui-button-foreground-disabled);
  background: var(--wui-button-background-disabled);
  border-color: var(--wui-button-border-brush-disabled);
  cursor: default;
  /* WinUI:Chevron → ButtonForegroundDisabled(随按钮一起禁用) */
  --ddb-chevron: var(--wui-button-foreground-disabled);
}

/* 系统焦点视觉:WinUI 双环(FocusVisualMargin=-3)按双环实现(同 Button) */
.wui-dropdown-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-dropdown-button:focus:not(:focus-visible) {
  outline: none;
}

/* ======================================================================
 * flyout 层(层根定位/圆角/阴影/z-index 由基建 .wui-popup-layer 提供):
 *  - 菜单内容:MenuFlyoutPresenter 默认模板(Padding=1 + ScrollerMargin 0,4,0,4 →
 *    5px 1px;MinHeight=32;Min/MaxWidth=96/456;MenuFlyoutPresenter 主题资源);
 *  - 任意内容:FlyoutPresenter 默认模板(FlyoutContentThemePadding 12,11,12,12;
 *    Min/MaxWidth=96/456;Min/MaxHeight=40/758;FlyoutPresenter 主题资源)。
 * ====================================================================== */
.wui-dropdown-button-layer {
  outline: none;
}

.wui-ddb-menu-layer {
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

.wui-ddb-content-layer {
  box-sizing: border-box;
  overflow: auto;
  min-width: 96px;
  max-width: 456px;
  min-height: 40px;
  max-height: 758px;
  padding: 11px 12px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-default-text-foreground-theme);
  background: var(--wui-flyout-presenter-background);
  border: 1px solid var(--wui-flyout-border-theme);
}

/* 入场:8px 上滑淡入(wui-flyout-in,基建 Web 适配增强);离场快速淡出 */
.wui-dropdown-button-enter-active {
  animation: wui-flyout-in var(--wui-duration-normal) var(--wui-easing-standard) both;
}

.wui-dropdown-button-leave-active {
  animation: wui-fade-out var(--wui-duration-fast) var(--wui-easing-standard) both;
}
</style>
