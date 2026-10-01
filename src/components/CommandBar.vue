<script setup lang="ts">
// CommandBar —— WinUI CommandBar 的 Web 复刻(应用命令栏:PrimaryCommands 命令行 +
// SecondaryCommands 溢出区 + EllipsisButton(…)更多按钮)。
// 视觉与结构对照源(CK/WinUI-Reference):
// 1. controls/dev/CommonStyles/CommandBar_themeresources.xaml(WinUI 3 随包主题资源,主要依据):
//    - DefaultCommandBarStyle:Padding=4,0,0,0、CornerRadius=ControlCornerRadius(4)、
//      MinHeight(ContentRoot)=AppBarThemeCompactHeight(48)、VerticalAlignment=Top、
//      HorizontalAlignment=Stretch;CommandBarBackground(WinUI3 = ControlFillColorTransparent,
//      本组件取 UWP generic.xaml 同名键 SystemControlBackgroundChromeMediumBrush 的对应 token,
//      与 AppBar 族既有一致)、CommandBarForeground(SystemControlForegroundBaseHighBrush);
//    - 模板结构:ContentRoot(Grid)= [ContentControl(内容列 * )+ PrimaryItemsControl
//      (命令列,HorizontalAlignment=Right,水平 StackPanel)] + MoreButton(EllipsisButton 样式,
//      Width=AppBarExpandButtonThemeWidth 48、MinHeight=48、VerticalAlignment=Top、
//      Padding=CommandBarMoreButtonMargin 14,19,14,0)+ OverflowPopup(Teleport 弹层)。
//      MoreButton 内容 = EllipsisIcon FontIcon(Glyph=E712(WinUI 3;UWP 为 E10C)、FontSize=20、
//      SymbolThemeFontFamily);
//    - EllipsisButton 样式:Background/Foreground/BorderBrush = AppBarEllipsisButton* 系列
//      (theme.css 已有 --wui-app-bar-ellipsis-button-* token),各交互态 DiscreteObjectKeyFrame
//      即时切换,系统焦点视觉(FocusVisualMargin=-3);
//    - CommandBarOverflowPresenter(溢出区):MinWidth=CommandBarOverflowMinWidth(160)、
//      MaxWidth=CommandBarOverflowMaxWidth(480)、MaxHeight=CommandBarOverflowMaxHeight(198,
//      源为运行期「可视区 50%」与 198 的资源值,取资源值)、垂直滚动、
//      ItemsPresenter Margin=CommandBarOverflowPresenterMargin(0,4,0,4)、
//      BorderThickness Down=0,0,0,1 / Up=1,0,0,0(CommandBarOverflowPresenterBorderDown/UpThickness);
//      Background=CommandBarOverflowPresenterBackground(WinUI3 = AcrylicInAppFillColorDefaultBrush,
//      无对应 token,取 MenuFlyoutPresenter 同款 --wui-menu-flyout-presenter-background,
//      差异记录 wiki);
//    - 溢出项(AppBarButtonOverflowStyle):HorizontalAlignment=Stretch、Width=NaN(拉伸满宽),
//      Overflow 视觉态:ContentViewbox/TextLabel 折叠,改由 OverflowTextLabel 呈现
//      (FontSize=ControlContentThemeFontSize 14、左对齐、不换行、Margin=12,0,12,0,
//      OverflowWithMenuIcons 态图标 16×16 居左 Margin 12、标签缩进 38),InnerBorder
//      Margin=AppBarButtonInnerBorderOverflowMargin(4,0,4,0)。本仓库 AppBarButton /
//      AppBarToggleButton 模板无 Overflow 态,由本组件在溢出层内以 :deep() 覆盖为等价的
//      「图标居左 + 标签居左满宽」菜单行(差异记录 wiki);AppBarSeparator 以其自身
//      useOverflowStyle 同款规则(横向 1px 分隔线)在溢出层内等价呈现。
// 2. dxaml/xcp/dxaml/themes/generic.xaml L16205 起 CommandBarRevealStyle / L10105 EllipsisButton
//    (UWP 口径锚点):模板布局同构,颜色键见上。
// 行为规格(CommandBar_Partial.cpp / AppBar_Partial.cpp):
//   - isOpen(WinUI IsOpen)= 打开态:溢出区(SecondaryCommands)显示于命令栏下方;
//     MoreButton 点击切换 IsOpen(AppBar::OnExpandButtonClick L1209-1221:put_IsOpen(!IsOpen));
//     ↑/↓ 于 MoreButton 上打开溢出并焦点落首/末项(CommandBar::OnMoreButtonKeyDown 语义);
//   - isSticky(WinUI IsSticky)= true 时不因收起尝试而关闭:点击层外/锚滚动/Escape 均保持
//     打开、仅焦点归还 MoreButton(CommandBar::TryDismissCommandBarOverflow L1986-1999:
//     仅 !isSticky 才 put_IsOpen(FALSE),两种情形焦点都回 ExpandButton;Escape 在溢出区经
//     OnOverflowContentKeyDown L2016-2018 进入同一收起尝试);
//   - 点击溢出区内的(切换类以外)命令 → 关闭命令栏(CommandBar::OnCommandExecutionStatic
//     L2072-2087:put_IsOpen(FALSE));主命令点击不关闭(点击发生在锚内,不构成 light dismiss);
//   - overflowButtonVisibility(WinUI OverflowButtonVisibility):auto = 有次要命令、或有
//     bottom 标签位的主命令时显示(UpdateEffectiveOverflowButtonVisibility L2306-2368 的
//     Auto 分支四条件之第一(secondary itemsCount > 0)与第四(hasBottomLabel);中间两条件
//     依赖 ClosedDisplayMode/CompactVerticalDelta,本组件无收起形态,恒不触发);
//     visible 恒显;collapsed 隐藏;
//   - 动态命令增减:Primary/Secondary slot 内容随父组件渲染自适应(slot 函数在渲染/计数计算
//     属性中调用,父级响应式状态变化即重新求值);
//   - 事件(WinUI AppBar 基类):opening/opened/closing/closed(Opening/Opened/Closing/Closed)。
// isOverflowOpen 说明:WinUI CommandBar 公开 API 只有 IsOpen(模板内部 OverflowPopup.IsOpen 由
//   它驱动);本组件按任务要求补 isOverflowOpen 双向模型,作为同一开关状态的便捷镜像
//   (两者写入任一即同步,读值一致),差异与理由见 wiki。
import { Comment, Fragment, computed, nextTick, watch } from 'vue'
import type { VNode } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import '../styles/popup.css'

defineOptions({ name: 'WuiCommandBar', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 默认标签位置(WinUI DefaultLabelPosition 的 Bottom/Right 两档):bottom = 图标上、标签下;right = 图标左、标签右。 */
    defaultLabelPosition?: 'bottom' | 'right'
    /** 溢出按钮可见性(WinUI OverflowButtonVisibility):auto = 有次要命令时显示,visible 恒显,collapsed 隐藏。 */
    overflowButtonVisibility?: 'auto' | 'visible' | 'collapsed'
    /** 粘滞(WinUI IsSticky):true 时不因点击层外/锚滚动而收起溢出区。 */
    isSticky?: boolean
    /** 是否禁用(WinUI IsEnabled):禁用更多按钮并置灰省略号字形。 */
    disabled?: boolean
  }>(),
  {
    defaultLabelPosition: 'bottom',
    overflowButtonVisibility: 'auto',
    isSticky: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 溢出区开始打开(WinUI Opening)。 */
  opening: []
  /** 溢出区已打开且完成首次定位(WinUI Opened)。 */
  opened: []
  /** 溢出区开始关闭(WinUI Closing)。 */
  closing: []
  /** 溢出区已关闭(WinUI Closed)。 */
  closed: []
  // 注:update:isOpen / update:isOverflowOpen 的 emit 类型由下方 defineModel 提供,勿在此重复声明。
}>()

// 双向:isOpen(WinUI IsOpen)。isOverflowOpen 为同一开关状态的便捷镜像(任务要求),
// 两者写入任一即互相同步,读值一致(见头注说明)。
const isOpen = defineModel<boolean>('isOpen', { default: false })
const isOverflowOpen = defineModel<boolean>('isOverflowOpen', { default: false })

// —— 镜像同步:守卫相等判断,避免互相回写造成死循环 ——
watch(isOpen, (value) => {
  if (isOverflowOpen.value !== value) isOverflowOpen.value = value
})
watch(isOverflowOpen, (value) => {
  if (isOpen.value !== value) isOpen.value = value
})

// —— 锚:命令栏整条(ContentRoot)即溢出区锚(源模板 OverflowPopup 相对命令栏定位)——
const anchorRef = usePopupAnchor().anchorRef

/** 打开途径标记:键盘路径(↑/↓/Enter/Space 于 MoreButton)打开时焦点落入溢出区首/末项,鼠标/编程打开保持焦点在 MoreButton。 */
let openFocusTarget: 'none' | 'first' | 'last' = 'none'

/* -------------------------------------------------------------------------
 * 次要命令计数(overflowButtonVisibility='auto' 的判定依据)与溢出区渲染:
 * slot 函数在渲染/计算属性中调用,父级命令增减(响应式状态)即自适应。
 * ---------------------------------------------------------------------- */

const slots = defineSlots<{
  /** 命令栏左侧内容区(WinUI Content)。 */
  content?: () => VNode[]
  /** 主命令区(WinUI PrimaryCommands):放 AppBarButton / AppBarToggleButton / AppBarSeparator。 */
  'primary-commands'?: () => VNode[]
  /** 次要命令区(WinUI SecondaryCommands):收进溢出区,组件同主命令。 */
  'secondary-commands'?: () => VNode[]
}>()

/** 展平 slot vnode:深入 Fragment(v-for),剔除注释节点(v-if=false 的占位)。 */
function flattenSlotVNodes(vnodes: VNode[]): VNode[] {
  const result: VNode[] = []
  for (const vnode of vnodes) {
    if (vnode.type === Fragment && Array.isArray(vnode.children)) {
      result.push(...flattenSlotVNodes(vnode.children as VNode[]))
    } else if (vnode.type !== Comment) {
      result.push(vnode)
    }
  }
  return result
}

const secondaryCount = computed(() => {
  const rendered = slots['secondary-commands']?.()
  return rendered ? flattenSlotVNodes(rendered).length : 0
})

const primaryCount = computed(() => {
  const rendered = slots['primary-commands']?.()
  return rendered ? flattenSlotVNodes(rendered).length : 0
})

/** 溢出按钮可见性(WinUI EffectiveOverflowButtonVisibility 的 Auto 分支):有次要命令,或
 * bottom 标签位有主命令(源第四条件 hasBottomLabel;以「标签位 = bottom 且有主命令」近似
 * 「存在 Label 可见且标签位在下的主命令」)。 */
const showMoreButton = computed(() => {
  switch (props.overflowButtonVisibility) {
    case 'visible':
      return true
    case 'collapsed':
      return false
    default:
      return secondaryCount.value > 0 || (props.defaultLabelPosition === 'bottom' && primaryCount.value > 0)
  }
})

/* -------------------------------------------------------------------------
 * 开 / 关与 light dismiss(语义分工对齐 MenuFlyout:onOutsidePress / onEscape /
 * onAnchorScroll 三项全开;isSticky 对齐源 TryDismissCommandBarOverflow:收起尝试
 * 时仅 !isSticky 才关闭,粘滞态保持打开、两种情形焦点都归还 MoreButton)
 * ---------------------------------------------------------------------- */

/** 焦点归还:源 RestoreFocusToExpandButton —— 关闭后焦点回到更多按钮。 */
function restoreFocusToMoreButton(): void {
  anchorRef.value?.querySelector<HTMLElement>('.wui-commandbar__more')?.focus()
}

function closeOverflow(restoreFocus: boolean): void {
  if (!isOpen.value) return
  isOpen.value = false
  if (restoreFocus) restoreFocusToMoreButton()
}

/** 源 TryDismissCommandBarOverflow:仅 !isSticky 时真正关闭;焦点无论粘滞与否都回 ExpandButton。 */
function tryDismissOverflow(): void {
  if (!props.isSticky) closeOverflow(false)
  restoreFocusToMoreButton()
}

function onOutsidePress(): void {
  tryDismissOverflow()
}

function onEscapeKey(): void {
  tryDismissOverflow() // Escape 在源中同样进入 TryDismissCommandBarOverflow(L2016-2018)
}

function onAnchorScroll(): void {
  if (props.isSticky) return
  closeOverflow(false) // 锚所在滚动链滚动即 light dismiss
}

const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: 'bottom-end', // 源:溢出区右缘对齐命令栏右缘(OverflowContentHorizontalOffset)
  offset: 0, // 源:溢出区与命令栏贴合(Border 随上/下开方向翻转)
  onOutsidePress,
  onEscape: onEscapeKey,
  onAnchorScroll,
})

/* -------------------------------------------------------------------------
 * 溢出区键盘导航(菜单语义):↑/↓ 项间步进(首/末项越界焦点回 MoreButton,不环绕)、
 * Home/End 首/末、Tab 关闭;Enter/Space 由项自身(原生 button)处理。
 * 可聚焦集合 = 层内未禁用按钮(AppBar 三件中按钮可聚焦,separator 为非交互装饰)。
 * ---------------------------------------------------------------------- */

function collectOverflowItems(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled])')).filter(
    (element) => element.getAttribute('aria-disabled') !== 'true',
  )
}

function focusOverflowItem(target: 'first' | 'last'): void {
  const items = collectOverflowItems(layerRef.value)
  const next = target === 'first' ? items[0] : items[items.length - 1]
  next?.focus()
}

function stepOverflowFocus(direction: 1 | -1): void {
  const items = collectOverflowItems(layerRef.value)
  if (items.length === 0) return
  const current = items.findIndex((item) => item === document.activeElement)
  if (current < 0) {
    ;(direction === 1 ? items[0] : items[items.length - 1])?.focus()
    return
  }
  // 端点不环绕(源 ShiftFocusVerticallyInOverflow:键盘 Up/Down 走默认 allowFocusWrap=true,
  // 首/末项越界时 SetFocusedElement 回 ExpandButton,与 MoreButton 方向键的首/末项成环)
  const atEdge = (direction === -1 && current === 0) || (direction === 1 && current === items.length - 1)
  if (atEdge) {
    restoreFocusToMoreButton()
    return
  }
  items[current + direction]?.focus()
}

function onLayerKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      stepOverflowFocus(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      stepOverflowFocus(-1)
      break
    case 'Home':
      event.preventDefault()
      focusOverflowItem('first')
      break
    case 'End':
      event.preventDefault()
      focusOverflowItem('last')
      break
    // Tab:关闭溢出区,不拦截默认焦点移动(WinUI 菜单 Tab 即 light dismiss)
    case 'Tab':
      closeOverflow(false)
      break
  }
}

/** 点击溢出区内命令 → 关闭(WinUI OnCommandExecutionStatic);切换类按钮与非命令区(分隔线/空白)保持打开。 */
function onLayerClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest('button')
  if (button === null) return
  if (button.classList.contains('wui-appbar-toggle-button')) return
  closeOverflow(false)
}

/* -------------------------------------------------------------------------
 * MoreButton 交互:点击切换(WinUI OnExpandButtonClick put_IsOpen(!IsOpen));
 * ↑/↓ 打开并焦点落末/首项(WinUI 在 MoreButton 上按方向键的语义)。
 * ---------------------------------------------------------------------- */

function onMoreClick(): void {
  openFocusTarget = 'none'
  if (isOpen.value) closeOverflow(false)
  else isOpen.value = true
}

function onMoreKeydown(event: KeyboardEvent): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  openFocusTarget = event.key === 'ArrowDown' ? 'first' : 'last'
  if (!isOpen.value) isOpen.value = true
  else focusOverflowItem(openFocusTarget)
}

// —— 生命周期事件与打开期副作用(首次定位、键盘路径焦点入层)——
watch(isOpen, (value) => {
  if (value) {
    emit('opening')
    void nextTick(() => {
      if (!isOpen.value) return // 打开中途又被关闭:跳过 open 侧效应
      update()
      if (openFocusTarget !== 'none') focusOverflowItem(openFocusTarget)
      openFocusTarget = 'none'
      emit('opened')
    })
  } else {
    emit('closing')
    void nextTick(() => emit('closed'))
  }
})
</script>

<template>
  <!-- 锚 + 命令行(ContentRoot):role=toolbar 使命令栏语义可及;class/style 经 $attrs 透传 -->
  <div
    ref="anchorRef"
    class="wui-commandbar"
    :class="{ 'wui-commandbar--disabled': disabled }"
    role="toolbar"
    aria-orientation="horizontal"
    :aria-disabled="disabled ? 'true' : undefined"
    v-bind="$attrs"
  >
    <!-- 内容列(ContentControl,WinUI Content):左对齐 -->
    <div class="wui-commandbar__content">
      <slot name="content" />
    </div>

    <!-- 主命令区(PrimaryItemsControl:右对齐水平排列) -->
    <div
      class="wui-commandbar__primary"
      :class="`wui-commandbar__primary--label-${defaultLabelPosition}`"
    >
      <slot name="primary-commands" />
    </div>

    <!-- 更多按钮(MoreButton/EllipsisButton):… 字形,E712(WinUI 3) -->
    <button
      v-if="showMoreButton"
      type="button"
      class="wui-commandbar__more"
      aria-haspopup="menu"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-label="More"
      :disabled="disabled"
      @click="onMoreClick"
      @keydown="onMoreKeydown"
    >
      <span class="wui-commandbar__more-icon" aria-hidden="true">&#xE712;</span>
    </button>
  </div>

  <!-- 溢出区(OverflowPopup → CommandBarOverflowPresenter):Teleport 到 body,
       复用 .wui-popup-layer 外壳(z-index 自动分配);菜单语义(role/键盘导航/点击关闭) -->
  <Teleport to="body">
    <Transition name="wui-commandbar-overflow">
      <div
        v-if="isOpen"
        ref="layerRef"
        class="wui-popup-layer wui-commandbar__overflow"
        role="menu"
        aria-orientation="vertical"
        tabindex="-1"
        @keydown="onLayerKeydown"
        @click="onLayerClick"
      >
        <slot name="secondary-commands" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ======================================================================
 * 命令行(ContentRoot):MinHeight=AppBarThemeCompactHeight(48)、
 * Padding=4,0,0,0、CornerRadius=ControlCornerRadius(4);
 * CommandBarBackground = SystemControlBackgroundChromeMediumBrush(UWP 口径,
 * 与 AppBar 族一致)、CommandBarForeground = SystemControlForegroundBaseHighBrush。
 * ====================================================================== */
.wui-commandbar {
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 48px; /* AppBarThemeCompactHeight(WinUI 3 = 48) */
  padding: 0 0 0 4px; /* DefaultCommandBarStyle Padding=4,0,0,0 */
  font-family: var(--wui-content-control-theme-font-family);
  color: var(--wui-system-control-foreground-base-high);
  background: var(--wui-system-control-background-chrome-medium);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px); /* ControlCornerRadius */
}

/* 内容列(ContentControlColumnDefinition = *):HorizontalAlignment=Left(默认) */
.wui-commandbar__content {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  min-width: 0;
  font-size: var(--wui-control-content-theme-font-size);
}

/* 主命令列(PrimaryItemsControlColumnDefinition = Auto):HorizontalAlignment=Right */
.wui-commandbar__primary {
  flex: none;
  display: flex;
  align-items: stretch;
  margin-left: auto;
  min-height: 48px; /* AppBarThemeCompactHeight */
}

/* ======================================================================
 * 更多按钮(MoreButton × EllipsisButton 样式):Width=AppBarExpandButtonThemeWidth(48)、
 * MinHeight=48、VerticalAlignment=Top;字形 EllipsisIcon FontSize=20、
 * SymbolThemeFontFamily、Glyph=E712;配色 AppBarEllipsisButton* 系列 token,
 * 各态即时切换(generic.xaml DiscreteObjectKeyFrame,无过渡动画)。
 * ====================================================================== */
.wui-commandbar__more {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 48px; /* AppBarExpandButtonThemeWidth */
  min-height: 48px;
  align-self: flex-start; /* VerticalAlignment=Top */
  padding: 0 14px; /* CommandBarMoreButtonMargin 14,19,14,0 的水平分量 */
  font-family: var(--wui-content-control-theme-font-family);
  color: var(--wui-app-bar-ellipsis-button-foreground);
  background: var(--wui-app-bar-ellipsis-button-background);
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px); /* ControlCornerRadius */
  cursor: default;
  user-select: none;
  touch-action: manipulation;
}

.wui-commandbar__more-icon {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 20px;
  line-height: 1;
}

.wui-commandbar__more:hover:not(:disabled) {
  color: var(--wui-app-bar-ellipsis-button-foreground-pointer-over);
  background: var(--wui-app-bar-ellipsis-button-background-pointer-over);
}

.wui-commandbar__more:active:not(:disabled) {
  color: var(--wui-app-bar-ellipsis-button-foreground-pressed);
  background: var(--wui-app-bar-ellipsis-button-background-pressed);
}

.wui-commandbar__more:disabled {
  color: var(--wui-app-bar-ellipsis-button-foreground-disabled);
  background: var(--wui-app-bar-ellipsis-button-background-disabled);
  cursor: default;
}

/* 系统焦点视觉:WinUI 双环(FocusVisualMargin=-3)近似为 primary 色单环 outline(同族组件取法) */
.wui-commandbar__more:focus {
  outline: none;
}

.wui-commandbar__more:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

/* 整栏禁用(CommonStates → Disabled 仅置灰 EllipsisIcon:CommandBarEllipsisIconForegroundDisabled
   = SystemControlDisabledBaseMediumLowBrush);命令按钮各自的禁用态由组件自身表达 */
.wui-commandbar--disabled .wui-commandbar__content {
  opacity: 0.5;
}

/* ======================================================================
 * DefaultLabelPosition = Right(LabelOnRight 视觉态的 :deep() 适配):
 * 图标居左(Margin=AppBarButtonContentViewboxMargin 12,16,0,10 的水平分量)、
 * 标签居右(TextLabel → Grid.Row=0/Column=1、TextAlignment=Left、
 * Margin=AppBarButtonTextLabelOnRightMargin 8,16,12,10)、行高收窄到 48。
 * ====================================================================== */
.wui-commandbar__primary--label-right :deep(.wui-appbar-button),
.wui-commandbar__primary--label-right :deep(.wui-appbar-toggle-button) {
  display: inline-flex;
  align-items: center;
  min-height: 48px; /* LabelOnRight 态 ContentRoot.MinHeight = AppBarThemeCompactHeight */
}

.wui-commandbar__primary--label-right :deep(.wui-appbar-button__icon),
.wui-commandbar__primary--label-right :deep(.wui-appbar-toggle-button__icon) {
  margin: 0 0 0 12px; /* AppBarButtonContentViewboxMargin 左分量 12 */
}

.wui-commandbar__primary--label-right :deep(.wui-appbar-button__label),
.wui-commandbar__primary--label-right :deep(.wui-appbar-toggle-button__label) {
  margin: 0 12px 0 8px; /* AppBarButtonTextLabelOnRightMargin 8,16,12,10 */
  text-align: left; /* TextAlignment=Left */
}

/* ======================================================================
 * 溢出区(CommandBarOverflowPresenter):MinWidth=160 / MaxWidth=480 / MaxHeight=198、
 * 垂直滚动、Padding=CommandBarOverflowPresenterMargin 0,4,0,4;皮肤取 MenuFlyoutPresenter
 * 同款 token(WinUI3 为 AcrylicInAppFillColorDefault,无对应 token,差异见 wiki);
 * BorderThickness Down=0,0,0,1 / Up=1,0,0,0(层根圆角/阴影/z-index 由基建提供)。
 * ====================================================================== */
.wui-commandbar__overflow {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
  min-width: 160px; /* CommandBarOverflowMinWidth */
  max-width: 480px; /* CommandBarOverflowMaxWidth */
  max-height: 198px; /* CommandBarOverflowMaxHeight(源运行期为可视区 50%,差异见 wiki) */
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 0; /* CommandBarOverflowPresenterMargin 0,4,0,4 */
  background: var(--wui-menu-flyout-presenter-background);
  border: 1px solid var(--wui-menu-flyout-presenter-border);
  border-width: 0 0 1px; /* BorderDownThickness:向下展开时只留下边(与命令栏贴合) */
  outline: none;
}

/* 向上翻转打开(BorderUpThickness 0,1,0,0;实际基位由基建写入 data-wui-placement) */
.wui-commandbar__overflow[data-wui-placement='top'] {
  border-width: 1px 0 0 0;
}

/* ======================================================================
 * 溢出项(AppBarButtonOverflowStyle 的 :deep() 适配):满宽(Width=NaN +
 * HorizontalAlignment=Stretch)、InnerBorderMargin=AppBarButtonInnerBorderOverflowMargin
 * (4,0,4,0)、Overflow 态(ContentRoot.MinHeight=0)行高由内容给出;图标居左
 * 16×16、标签左对齐 14px 不换行(OverflowTextLabel / OverflowWithMenuIcons 态)。
 * width 用 !important:AppBarButton/AppBarToggleButton 以内联 style 写 Width
 * (prop 缺省 68px),内联优先级高于任何类选择器,须显式压过才能满宽。
 * ====================================================================== */
.wui-commandbar__overflow :deep(.wui-appbar-button),
.wui-commandbar__overflow :deep(.wui-appbar-toggle-button) {
  display: flex;
  align-items: center;
  width: 100% !important; /* 源 OverflowStyle Width=NaN + HorizontalAlignment=Stretch */
  min-height: 32px; /* MenuFlyoutThemeMinHeight(溢出行高与菜单行一致,约 32px) */
  height: auto;
  padding: 0 4px; /* AppBarButtonInnerBorderOverflowMargin 4,0,4,0 */
}

.wui-commandbar__overflow :deep(.wui-appbar-button__icon),
.wui-commandbar__overflow :deep(.wui-appbar-toggle-button__icon) {
  margin: 0 10px; /* 图标左缘 12 + 标签缩进 38(OverflowWithMenuIcons)的等效间距 */
}

.wui-commandbar__overflow :deep(.wui-appbar-button__label),
.wui-commandbar__overflow :deep(.wui-appbar-toggle-button__label) {
  flex: 1 1 auto;
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize = 14 */
  text-align: left; /* OverflowTextLabel TextAlignment=Left */
  white-space: nowrap; /* TextWrapping=NoWrap */
  overflow: hidden; /* TextTrimming=Clip 的 Web 近似 */
}

.wui-commandbar__overflow :deep(.wui-appbar-button__accelerator),
.wui-commandbar__overflow :deep(.wui-appbar-toggle-button__accelerator) {
  flex: none;
  align-self: center;
  margin: 0 12px 0 0;
}

/* 分隔线(AppBarSeparator 溢出样式,与组件自身 useOverflowStyle 同规则):横向 1px */
.wui-commandbar__overflow :deep(.wui-app-bar-separator) {
  display: block;
  height: auto;
  align-self: stretch;
  padding: 4px 0; /* AppBarOverflowSeparatorMargin 0,4,0,4 */
  min-height: 0;
}

.wui-commandbar__overflow :deep(.wui-app-bar-separator .wui-app-bar-separator-line) {
  width: auto;
  height: 1px;
}

/* 入场:8px 上滑淡入(基建 Web 适配增强,同 MenuFlyout);离场快速淡出 */
.wui-commandbar-overflow-enter-active {
  animation: wui-flyout-in var(--wui-duration-normal) var(--wui-easing-standard) both;
}

.wui-commandbar-overflow-leave-active {
  animation: wui-fade-out var(--wui-duration-fast) var(--wui-easing-standard) both;
}
</style>
