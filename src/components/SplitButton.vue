<script setup lang="ts">
// SplitButton —— WinUI SplitButton 的 Web 复刻:双区按钮(主区 click + 次区 chevron 开弹层)。
//
// 视觉规格:CK/WinUI-Reference/controls/dev/SplitButton/SplitButton.xaml(即
//   generic.xaml 中 TargetType="SplitButton" 模板段的 mux 源,dxaml/generic.xaml 无此控件)
//   + SplitButton_themeresources.xaml(状态画刷)。WinUI 3 调色板(ControlFillColor* /
//   TextFillColor* / ControlStrokeColor* 等)未由 theme.css 提取(dxaml 源只有 UWP 时代
//   SystemControl* 系),按 InfoBar 波次先例以源值注入组件级 token --wui-splitbutton-*,
//   对照表见 wiki/controls/SplitButton.md 差异节;主题切换用 html[data-theme] 前缀档位。
//   模板结构:三列 Grid(主区 * | 分隔线 1px | 次区 35)+ 背景/分隔线/双区边框叠层;
//   Padding ← SplitButtonPadding 11,6,11,7;次区列宽 ← SplitButtonSecondaryButtonSize 35;
//   圆角 ← ControlCornerRadius(4,取 --wui-hyperlink-focus-rect-corner-radius 同款最近似)。
//
// 状态规格(源 CommonStates 全集,SplitButton.cpp UpdateVisualStates L120 起):
//   Normal / PrimaryPointerOver / PrimaryPressed / SecondaryPointerOver / SecondaryPressed /
//   FlyoutOpen / TouchPressed / Disabled(+ Checked 族,ToggleSplitButton 专用,见文末扩展预留)。
//   两区独立按压:主区按压时次区回 Normal 底色,反之亦然 —— 以两枚内层 button 的
//   :hover / :active 各自换色实现;优先级对照源 UpdateVisualStates 的判定序:
//   Disabled > FlyoutOpen(m_isFlyoutOpen)> TouchPressed(m_isKeyDown)> Primary/Secondary
//   指针态 > Normal(F2:弹层开 / 键盘按压的组合选择器压过单区 :hover / :active)。
//   键盘 Space/Enter 按住 → 整钮按压(TouchPressed 同款:双区按压底色 + 主区前景 Pressed +
//   次区前景 SecondaryPressed;源同时进入 SecondaryButtonSpan 次区跨列,纯视觉无差异,不复刻)。
//
// 行为规格(SplitButton.cpp):
//   - 主区 click / 键盘 Space / Enter(KeyUp 确认)→ Click 事件(命令层按任务简化为事件);
//   - 次区 click → 开 / 关 Flyout(OnClickSecondary → OpenFlyout;Web 侧为 toggle 语义,
//     与 WinUI「弹层开着时再按次区即收起」的实测行为一致);
//   - 键盘 Alt+Down / F4(KeyUp)→ 开 Flyout(L324-L366);
//   - Flyout 以根元素为锚、BottomEdgeAlignedLeft(→ 基建 'bottom-start')打开(L221-L229);
//     打开期间整钮进 FlyoutOpen 态(双区按压底色 + 按压边框);
//   - Disabled:双区底色透明,由内层 button 兜底 ControlFillColorDisabled,边框/分隔线
//     ControlStrokeColorDefault,前景 TextFillColorDisabled(源 Disabled 态 Setter 链)。
//
// 弹层基建:usePopupAnchor + usePopupLayer(wiki/controls/_popup-infra.md)。层挂 .wui-popup-layer
//   外壳(圆角 / 阴影 / z-index 回退,与 MenuFlyout / DropDownButton 同款)+ light dismiss
//   (外部按下 / Escape / 锚滚动即关);#flyout slot 内可直接放 MenuFlyoutItem 族 ——
//   本组件向 slot 注入 'wuiMenuFlyoutLevel' 层上下文(同构于 MenuFlyout 的 provide),并给层
//   挂 data-wui-menu-layer 标记与菜单键盘导航;检测到菜单项登记时层自动切菜单皮肤
//   (MenuFlyoutPresenter 的 5px 1px 内边距 + 菜单底色)与 role="menu",否则为
//   FlyoutPresenter 皮肤(role="dialog"),等效 WinUI「SplitButton.Flyout 可挂 Flyout 或
//   MenuFlyout」。
//
// 键盘可达:根元素为唯一 Tab 停靠点(IsTabStop=True,内层两钮 IsTabStop=False 的映射),
//   role="button" + aria-haspopup + aria-expanded;Space / Enter 主区,Alt+Down / F4 次区,
//   与源 AutomationPeer(Invoke + ExpandCollapse 双 pattern)语义一致。
//
// ★ ToggleSplitButton 扩展预留(后续任务):见文件末尾「ToggleSplitButton 扩展预留」注释块。

import { computed, nextTick, onScopeDispose, provide, reactive, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import type { PopupPlacement } from '@/composables/usePopup'
import { focusFirst } from '@/utils/popup'
import '../styles/popup.css'
import '../styles/animations.css'

const props = withDefaults(
  defineProps<{
    /** 主区文本;更复杂内容(色块、图标等)用默认 slot(slot 优先)。 */
    content?: string
    /** 禁用(WinUI IsEnabled = false):双区不触发、根元素移出 Tab 序。 */
    disabled?: boolean
    /** 弹层放置位(WinUI 源写死 BottomEdgeAlignedLeft → 'bottom-start',可覆盖)。 */
    placement?: PopupPlacement
    /** 字号;number 按 px。缺省 ControlContentThemeFontSize(14px)。 */
    fontSize?: number | string
    /** 字重;WinUI FontWeight 命名或数字,缺省 Normal(400)。 */
    fontWeight?: number | string
    /** 圆角;number 按 px。缺省 ControlCornerRadius(4px)。 */
    cornerRadius?: number | string
    /** 主区内边距,CSS 长度串(如 '0' / '6px 11px 7px');缺省 SplitButtonPadding 11,6,11,7。 */
    padding?: string
  }>(),
  {
    content: '',
    disabled: false,
    placement: 'bottom-start',
    fontSize: undefined,
    fontWeight: undefined,
    cornerRadius: undefined,
    padding: undefined,
  },
)

// click:主区激活(WinUI Click;鼠标主区或根元素 Space/Enter)。open/close:弹层开合
// (WinUI 由 Flyout.Opened/Closed 提供,SplitButton 本体无事件;Web 侧合并为两事件)。
const emit = defineEmits<{
  click: [event: MouseEvent | KeyboardEvent]
  open: []
  close: []
}>()

defineOptions({
  name: 'WuiSplitButton',
  // class/style 等 attrs 由根 span 的 v-bind="$attrs" 透传。
  inheritAttrs: false,
})

/** 程序化开关(WinUI FlyoutBase.ShowAt/Hide 的等价入口,供 ref 调用)。 */
const flyoutOpen = ref(false)

/* -------------------------------------------------------------------------
 * 属性解析:WinUI 值 → CSS 值(仅 Normal 态覆盖;状态色仍由主题规则接管)
 * ---------------------------------------------------------------------- */

function resolveLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value
}

const FONT_WEIGHT_NAMES: Record<string, number> = {
  Thin: 100,
  ExtraLight: 200,
  UltraLight: 200,
  Light: 300,
  SemiLight: 350,
  Normal: 400,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  DemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  UltraBold: 800,
  Black: 900,
  Heavy: 900,
}

function resolveFontWeight(value: number | string): number | string {
  if (typeof value === 'number') return value
  const numeric = Number(value)
  if (value.trim() !== '' && Number.isFinite(numeric)) return numeric
  return FONT_WEIGHT_NAMES[value] ?? value
}

const rootStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {}
  if (props.fontSize !== undefined) style.fontSize = resolveLength(props.fontSize)
  if (props.fontWeight !== undefined) style.fontWeight = resolveFontWeight(props.fontWeight)
  if (props.cornerRadius !== undefined) {
    style['--wui-splitbutton-corner-radius'] = resolveLength(props.cornerRadius)
  }
  if (props.padding !== undefined) style['--wui-splitbutton-padding'] = props.padding
  return style
})

/* -------------------------------------------------------------------------
 * 键盘按下视觉(Space/Enter 按住 = 整钮按压,对照 m_isKeyDown → TouchPressed)
 * ---------------------------------------------------------------------- */

const isKeyPressed = ref(false)

/* -------------------------------------------------------------------------
 * 弹层:锚 = 根元素(WinUI ShowAt(*this)),bottom-start(BottomEdgeAlignedLeft)
 * ---------------------------------------------------------------------- */

const rootRef = ref<HTMLElement | null>(null)
const { anchorRef } = usePopupAnchor()

/** 本弹层内登记的菜单项(MenuFlyoutItem 族经 provide 上下文登记)。 */
const registeredItems = reactive<Array<{ checkable: boolean; hasIcon: () => boolean }>>([])

/** 是否检测到菜单项用法:决定层皮肤(FlyoutPresenter ↔ MenuFlyoutPresenter)与 role。 */
const hasMenuItems = computed(() => registeredItems.length > 0)

/** 列对齐状态推导(同 MenuFlyout:同层出现勾选项/图标项时补占位列)。 */
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

/** 层内已打开的子菜单句柄(MenuFlyoutSubItem 登记;Escape 逐级收口用)。 */
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

function closeFlyout(restoreFocus: boolean): void {
  if (!flyoutOpen.value) return
  closeOpenChild()
  flyoutOpen.value = false
  if (restoreFocus) rootRef.value?.focus()
}

function openFlyout(): void {
  if (props.disabled || flyoutOpen.value) return
  flyoutOpen.value = true
}

// light dismiss:点击层与锚之外即关(锚含整钮,点两区不触发外部回调);子菜单层
// 由基建注册表统一豁免,再按 MenuFlyout 同款 data-wui-menu-layer 兜底排除。
function onOutsidePress(event: PointerEvent): void {
  const target = event.target
  if (target instanceof Element && target.closest('[data-wui-menu-layer]')) return
  closeFlyout(false)
}

function onEscapeKey(): void {
  // 子菜单仍开时忽略(由更深层自己收起,Escape 逐级)
  if (openChildHandle) return
  closeFlyout(true) // 键盘路径:焦点归还根元素
}

const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: () => props.placement,
  offset: { mainAxis: 4 },
  onOutsidePress,
  onEscape: onEscapeKey,
  onAnchorScroll: () => closeFlyout(false), // WinUI:锚滚动即 light dismiss
})

// 开 / 关副作用:定位就位 → 焦点入层(优先首个菜单项,兜底首个可聚焦元素)→ 发事件。
watch(flyoutOpen, (value) => {
  if (value) {
    emit('open')
    void nextTick(() => {
      update()
      const layer = layerRef.value
      if (!layer) return
      const firstItem = layer.querySelector<HTMLElement>('[data-wui-menu-item]')
      if (firstItem) firstItem.focus()
      else focusFirst(layer)
    })
  } else {
    emit('close')
  }
})

onScopeDispose(() => {
  openChildHandle = null
})

/* -------------------------------------------------------------------------
 * 交互:主区 click / 次区 toggle / 根元素键盘(对照 SplitButton.cpp L324-L366)
 * ---------------------------------------------------------------------- */

function onPrimaryClick(event: MouseEvent): void {
  emit('click', event)
}

function onSecondaryClick(): void {
  // WinUI OnClickSecondary → OpenFlyout;弹层已开时再按实测收起,Web 侧取 toggle 语义
  if (flyoutOpen.value) closeFlyout(false)
  else openFlyout()
}

function onRootKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault() // Space 防滚屏 / Enter 防表单提交
    isKeyPressed.value = true
  }
}

function onRootKeyup(event: KeyboardEvent): void {
  if (props.disabled) return
  if (event.key === ' ' || event.key === 'Enter') {
    isKeyPressed.value = false
    // KeyUp 确认为主区 click(源:OnClickPrimary + ExecuteCommand,命令层已简化)
    emit('click', event)
  } else if (event.key === 'ArrowDown' && event.altKey) {
    // Alt+Down:开弹层(源 L350-L360,Menu 键按住时)
    event.preventDefault()
    openFlyout()
  } else if (event.key === 'F4') {
    event.preventDefault()
    openFlyout()
  }
}

/* -------------------------------------------------------------------------
 * 层上下文与键盘导航(#flyout slot 放 MenuFlyoutItem 族时生效;同 MenuFlyout)
 * ---------------------------------------------------------------------- */

provide('wuiMenuFlyoutLevel', {
  isOpen: flyoutOpen,
  glyphs,
  registerItem,
  closeAll: closeFlyout,
  registerOpenSubmenu,
})

function collectMenuItems(container: HTMLElement | null): HTMLElement[] {
  if (!container) return []
  return Array.from(container.querySelectorAll<HTMLElement>('[data-wui-menu-item]')).filter(
    (element) => element.getAttribute('aria-disabled') !== 'true',
  )
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

function focusMenuItem(container: HTMLElement | null, target: 'first' | 'last'): void {
  const items = collectMenuItems(container)
  const next = target === 'first' ? items[0] : items[items.length - 1]
  next?.focus()
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
    case 'Tab':
      closeFlyout(false)
      break
  }
}

defineExpose({
  /** 打开弹层(WinUI FlyoutBase.ShowAt 等价;禁用时无效)。 */
  openFlyout,
  /** 关闭弹层(WinUI FlyoutBase.Hide 等价)。 */
  closeFlyout: () => closeFlyout(false),
})

/* -------------------------------------------------------------------------
 * 视觉状态类:对照 CommonStates(Primary 系 / Secondary 系 / FlyoutOpen / TouchPressed / Disabled)
 * ---------------------------------------------------------------------- */

const rootClass = computed(() => ({
  'is-disabled': props.disabled,
  'is-flyout-open': flyoutOpen.value,
  'is-key-pressed': isKeyPressed.value,
}))

const layerRole = computed(() => (hasMenuItems.value ? 'menu' : 'dialog'))
// F1:层根必须带 .wui-popup-layer 外壳(圆角 / 阴影 / z-index 回退,MenuFlyout 同款),
// 组件类只补尺寸 / 内边距 / 皮肤差异。
const layerClass = computed(() =>
  hasMenuItems.value
    ? 'wui-popup-layer wui-splitbutton-layer wui-splitbutton-layer--menu'
    : 'wui-popup-layer wui-splitbutton-layer wui-splitbutton-layer--flyout wui-popup-skin-flyout',
)
</script>

<template>
  <!-- 根元素 = 唯一 Tab 停靠点(WinUI IsTabStop=True):role=button + 双 pattern 键盘语义 -->
  <span
    ref="rootRef"
    class="wui-splitbutton"
    :class="rootClass"
    :style="rootStyle"
    role="button"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-haspopup="hasMenuItems ? 'menu' : 'true'"
    :aria-expanded="flyoutOpen ? 'true' : 'false'"
    v-bind="$attrs"
    @keydown="onRootKeydown"
    @keyup="onRootKeyup"
  >
    <!-- 主区:背景/前景即 PrimaryBackgroundGrid + PrimaryButton;独立 :hover/:active 换色 -->
    <button
      type="button"
      class="wui-splitbutton-primary"
      tabindex="-1"
      :disabled="disabled"
      @click="onPrimaryClick"
    >
      <slot>{{ content }}</slot>
    </button>

    <!-- 分隔线:DividerBackgroundGrid(1px,ControlStrokeColorDefault) -->
    <span class="wui-splitbutton-divider" aria-hidden="true" />

    <!-- 次区:chevron(ChevronDownSmall,E96E 的 SVG 静态等价;源无开合旋转动画,不加) -->
    <button
      type="button"
      class="wui-splitbutton-secondary"
      tabindex="-1"
      aria-hidden="true"
      :disabled="disabled"
      @click="onSecondaryClick"
    >
      <span class="wui-splitbutton-chevron">
        <svg viewBox="0 0 12 12" focusable="false" aria-hidden="true">
          <path d="M2.5 4.25 L6 7.75 L9.5 4.25" />
        </svg>
      </span>
    </button>
  </span>

  <!-- 弹层:Teleport 到 body,.wui-popup-layer 外壳 + 皮肤按「是否菜单用法」自动切换 -->
  <Teleport to="body">
    <Transition name="wui-splitbutton-flyout">
      <div
        v-if="flyoutOpen"
        ref="layerRef"
        :class="layerClass"
        :role="layerRole"
        aria-orientation="vertical"
        tabindex="-1"
        data-wui-menu-layer
        @keydown="onLayerKeydown"
      >
        <slot name="flyout" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ======================================================================
 * 组件级状态 token(InfoBar 先例:WinUI 3 调色板无 theme.css token,按源值注入;
 * XAML AARRGGBB → CSS RRGGBBAA 字节序。来源:Common_themeresources_any.xaml +
 * SplitButton_themeresources.xaml,浅色为基线、深色用 html[data-theme] 档位覆盖)
 * ====================================================================== */
.wui-splitbutton {
  --wui-splitbutton-fill: #ffffffb3; /* ControlFillColorDefault(Light #B3FFFFFF → 70% 白) */
  --wui-splitbutton-fill-pointer-over: #f9f9f980; /* ControlFillColorSecondary(#80F9F9F9 → 50% #F9F9F9) */
  --wui-splitbutton-fill-pressed: #f9f9f94d; /* ControlFillColorTertiary(#4DF9F9F9 → 30% #F9F9F9) */
  --wui-splitbutton-fill-disabled: #f9f9f94d; /* ControlFillColorDisabled(#4DF9F9F9 = Tertiary 同值 → 30% #F9F9F9) */
  --wui-splitbutton-foreground: #000000e4; /* TextFillColorPrimary(Light #E4000000) */
  --wui-splitbutton-foreground-pointer-over: #000000e4; /* SplitButtonForegroundPointerOver = TextFillColorPrimary */
  --wui-splitbutton-foreground-pressed: #0000009e; /* SplitButtonForegroundPressed = TextFillColorSecondary */
  --wui-splitbutton-foreground-disabled: #0000005c; /* SplitButtonForegroundDisabled = TextFillColorDisabled */
  --wui-splitbutton-foreground-secondary: #0000009e; /* SplitButtonForegroundSecondary = TextFillColorSecondary */
  --wui-splitbutton-foreground-secondary-pressed: #00000072; /* SplitButtonForegroundSecondaryPressed = TextFillColorTertiary */
  --wui-splitbutton-stroke: #00000029; /* SplitButtonBorderBrush = ControlElevationBorderBrush(3px 渐变,
     1px 边框仅呈现顶部 ≈ ControlStrokeColorSecondary Light #29000000 的近似平色) */
  --wui-splitbutton-stroke-pressed: #0000000f; /* BorderBrushPressed/Disabled = ControlStrokeColorDefault #0F000000 */
  --wui-splitbutton-divider: #0000000f; /* SplitButtonBorderBrushDivider = ControlStrokeColorDefault */
  --wui-splitbutton-corner-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);

  display: inline-flex;
  align-items: stretch;
  position: relative;
  vertical-align: middle;
  border-radius: var(--wui-splitbutton-corner-radius);
  overflow: hidden; /* 内层方角裁进圆角(WinUI 由双区边框 Grid 拼出圆角) */
  border: 1px solid var(--wui-splitbutton-stroke-current, var(--wui-splitbutton-stroke));
  box-sizing: border-box;
  cursor: default;
  user-select: none;
  touch-action: manipulation;
}

/* 系统焦点视觉:WinUI 双环(FocusVisualMargin=-1)近似为 primary 色单环 outline */
.wui-splitbutton:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-splitbutton:focus:not(:focus-visible) {
  outline: none;
}

/* —— 内层按钮公共:模板中两枚 Button 的外壳(透明底,状态色经 CSS 变量下发)—— */
.wui-splitbutton-primary,
.wui-splitbutton-secondary {
  display: inline-flex;
  align-items: center;
  border: none;
  margin: 0;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  line-height: normal;
  cursor: inherit;
  touch-action: manipulation;
  user-select: none;
}

/* —— 主区:列宽 * + MinWidth 35;Padding ← SplitButtonPadding 11,6,11,7 —— */
.wui-splitbutton-primary {
  flex: 1 1 auto;
  min-width: 35px; /* SplitButtonPrimaryButtonSize */
  padding: var(--wui-splitbutton-padding, 6px 11px 7px);
  justify-content: center;
  background: var(--wui-splitbutton-fill);
  color: var(--wui-splitbutton-foreground);
}

/* —— 次区:列宽固定 35;Padding 0,0,12,0;chevron 右对齐垂直居中 —— */
.wui-splitbutton-secondary {
  flex: 0 0 35px; /* SplitButtonSecondaryButtonSize */
  justify-content: flex-end;
  padding: 0 12px 0 0;
  background: var(--wui-splitbutton-fill);
  color: var(--wui-splitbutton-foreground-secondary);
}

/* —— 分隔线:1px 全高,ControlStrokeColorDefault —— */
.wui-splitbutton-divider {
  flex: 0 0 1px;
  background: var(--wui-splitbutton-divider);
}

/* —— chevron:12x12(AnimatedChevronDownSmall 的 SVG 静态等价,源无开合动画)—— */
.wui-splitbutton-chevron {
  display: inline-flex;
  width: 12px;
  height: 12px;
}

.wui-splitbutton-chevron svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.25;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ======================================================================
 * 视觉状态(源 CommonStates;全部即时切换,DiscreteObjectKeyFrame 无过渡)
 * 优先级对照源 UpdateVisualStates 判定序(F2):Disabled > FlyoutOpen >
 * TouchPressed(键盘按压)> Primary/Secondary 指针态 —— FlyoutOpen / 键盘按压用
 * 「:not(.is-disabled) + 状态类」组合选择器,并以显式 :hover / :active 变体
 * (特异性 0,5,0)压过单区指针态(0,4,0)。
 * ====================================================================== */

/* PrimaryPointerOver:主区悬停,次区/分隔线回 Normal 底色(此处本就是 Normal,无需交叉) */
.wui-splitbutton:not(.is-disabled) .wui-splitbutton-primary:hover {
  background: var(--wui-splitbutton-fill-pointer-over);
  color: var(--wui-splitbutton-foreground-pointer-over);
}

/* PrimaryPressed:主区按压底/前景 + 按压边框;次区回 Normal(源 Setter 链) */
.wui-splitbutton:not(.is-disabled):has(.wui-splitbutton-primary:active) {
  --wui-splitbutton-stroke-current: var(--wui-splitbutton-stroke-pressed);
}

.wui-splitbutton:not(.is-disabled) .wui-splitbutton-primary:active {
  background: var(--wui-splitbutton-fill-pressed);
  color: var(--wui-splitbutton-foreground-pressed);
}

/* SecondaryPointerOver:次区悬停,主区回 Normal;前景 TextFillColorPrimary */
.wui-splitbutton:not(.is-disabled) .wui-splitbutton-secondary:hover {
  background: var(--wui-splitbutton-fill-pointer-over);
  color: var(--wui-splitbutton-foreground);
}

/* SecondaryPressed:次区按压底色 + 次区前景 Tertiary + 按压边框 */
.wui-splitbutton:not(.is-disabled):has(.wui-splitbutton-secondary:active) {
  --wui-splitbutton-stroke-current: var(--wui-splitbutton-stroke-pressed);
}

.wui-splitbutton:not(.is-disabled) .wui-splitbutton-secondary:active {
  background: var(--wui-splitbutton-fill-pressed);
  color: var(--wui-splitbutton-foreground-secondary-pressed);
}

/* FlyoutOpen(源 L80-L88,F2 优先级):双区底色按压 + 主区前景按压 + 次区前景
   SecondaryPressed + 边框按压;弹层开着时压过悬停/按压(源先判 m_isFlyoutOpen) */
.wui-splitbutton.is-flyout-open {
  --wui-splitbutton-stroke-current: var(--wui-splitbutton-stroke-pressed);
}

.wui-splitbutton.is-flyout-open:not(.is-disabled) .wui-splitbutton-primary,
.wui-splitbutton.is-flyout-open:not(.is-disabled) .wui-splitbutton-primary:hover,
.wui-splitbutton.is-flyout-open:not(.is-disabled) .wui-splitbutton-primary:active {
  background: var(--wui-splitbutton-fill-pressed);
  color: var(--wui-splitbutton-foreground-pressed);
}

.wui-splitbutton.is-flyout-open:not(.is-disabled) .wui-splitbutton-secondary,
.wui-splitbutton.is-flyout-open:not(.is-disabled) .wui-splitbutton-secondary:hover,
.wui-splitbutton.is-flyout-open:not(.is-disabled) .wui-splitbutton-secondary:active {
  background: var(--wui-splitbutton-fill-pressed);
  color: var(--wui-splitbutton-foreground-secondary-pressed);
}

/* 键盘 Space/Enter 按住(= TouchPressed / m_isKeyDown,F2 同款优先级):整钮按压;
   次区前景 = SplitButtonForegroundSecondaryPressed(F3,TextFillColorTertiary) */
.wui-splitbutton.is-key-pressed {
  --wui-splitbutton-stroke-current: var(--wui-splitbutton-stroke-pressed);
}

.wui-splitbutton.is-key-pressed:not(.is-disabled) .wui-splitbutton-primary,
.wui-splitbutton.is-key-pressed:not(.is-disabled) .wui-splitbutton-primary:hover,
.wui-splitbutton.is-key-pressed:not(.is-disabled) .wui-splitbutton-primary:active {
  background: var(--wui-splitbutton-fill-pressed);
  color: var(--wui-splitbutton-foreground-pressed);
}

.wui-splitbutton.is-key-pressed:not(.is-disabled) .wui-splitbutton-secondary,
.wui-splitbutton.is-key-pressed:not(.is-disabled) .wui-splitbutton-secondary:hover,
.wui-splitbutton.is-key-pressed:not(.is-disabled) .wui-splitbutton-secondary:active {
  background: var(--wui-splitbutton-fill-pressed);
  color: var(--wui-splitbutton-foreground-secondary-pressed);
}

/* Disabled:双区底色换 ControlFillColorDisabled、前景 Disabled、边框 ControlStrokeColorDefault
   (源 Disabled 态 Setter 链:背景层透明 + 内层兜底;分隔线源保持 Divider 资源,同值) */
.wui-splitbutton.is-disabled {
  --wui-splitbutton-stroke-current: var(--wui-splitbutton-stroke-pressed);
}

.wui-splitbutton.is-disabled .wui-splitbutton-primary,
.wui-splitbutton.is-disabled .wui-splitbutton-secondary {
  background: var(--wui-splitbutton-fill-disabled);
  color: var(--wui-splitbutton-foreground-disabled);
}

/* ======================================================================
 * 弹层皮肤(#flyout slot 内容决定,自动切换;外壳 .wui-popup-layer 由 popup.css
 * 提供圆角 / 阴影 / z-index 回退):
 * - 菜单用法:MenuFlyoutPresenter(5px 1px 内边距 = Padding 1 + ScrollerMargin 0,4,0,4;
 *   Min/MaxWidth 96/456;菜单底/边 token)
 * - 一般用法:FlyoutPresenter(12,11,12,12 内边距;Min/Max 96/456、MinHeight 40、
 *   MaxHeight 758;.wui-popup-skin-flyout 提供底/边)
 * ====================================================================== */
.wui-splitbutton-layer {
  box-sizing: border-box;
  min-width: 96px;
  max-width: 456px;
  outline: none;
}

.wui-splitbutton-layer--menu {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-height: 32px;
  padding: 5px 1px;
  background: var(--wui-menu-flyout-presenter-background);
  border: 1px solid var(--wui-menu-flyout-presenter-border);
}

.wui-splitbutton-layer--flyout {
  overflow: auto;
  min-height: 40px;
  max-height: 758px;
  padding: 11px 12px 12px;
  color: var(--wui-default-text-foreground-theme);
}

/* 入场:弹层淡入 + 8px 位移(基建 Web 适配增强);离场快速淡出 */
.wui-splitbutton-flyout-enter-active {
  animation: wui-flyout-in var(--wui-duration-normal) var(--wui-easing-standard) both;
}

.wui-splitbutton-flyout-leave-active {
  animation: wui-fade-out var(--wui-duration-fast) var(--wui-easing-standard) both;
}

/* ======================================================================
 * 深色主题(Default 字典,html[data-theme] 档位保证压过浅色基线):
 * ControlFillColor 系 / TextFillColor 系 / ControlStrokeColor 系的 Default 值换档。
 * ====================================================================== */
html[data-theme='dark'] .wui-splitbutton {
  --wui-splitbutton-fill: #ffffff0f; /* ControlFillColorDefault(Default #0FFFFFFF → 6% 白) */
  --wui-splitbutton-fill-pointer-over: #ffffff15; /* ControlFillColorSecondary(#15FFFFFF → 8% 白) */
  --wui-splitbutton-fill-pressed: #ffffff08; /* ControlFillColorTertiary(#08FFFFFF → 3% 白) */
  --wui-splitbutton-fill-disabled: #ffffff0b; /* ControlFillColorDisabled(#0BFFFFFF → 4% 白) */
  --wui-splitbutton-foreground: #ffffff; /* TextFillColorPrimary */
  --wui-splitbutton-foreground-pointer-over: #ffffff;
  --wui-splitbutton-foreground-pressed: #ffffffc5; /* TextFillColorSecondary #C5FFFFFF */
  --wui-splitbutton-foreground-disabled: #ffffff5d; /* TextFillColorDisabled #5DFFFFFF */
  --wui-splitbutton-foreground-secondary: #ffffffc5;
  --wui-splitbutton-foreground-secondary-pressed: #ffffff87; /* TextFillColorTertiary #87FFFFFF */
  --wui-splitbutton-stroke: #ffffff18; /* ControlElevationBorderBrush 1px 近似(顶部 ≈ Secondary #18FFFFFF) */
  --wui-splitbutton-stroke-pressed: #ffffff12; /* ControlStrokeColorDefault #12FFFFFF */
  --wui-splitbutton-divider: #ffffff12;
}

/*
 * ============================== ToggleSplitButton 扩展预留 ==============================
 * ToggleSplitButton.vue 已基于本组件扩展(源:SplitButton.xaml 中
 * <Style TargetType="controls:ToggleSplitButton" BasedOn="SplitButtonStyle"/>,共用模板;
 * Web 侧组合扩展:在其根元素追加 .is-checked 并覆写 --wui-splitbutton-* token 命中全族)。
 * 后续 Checked 族维护对照(源 SplitButton.cpp UpdateVisualStates L137-L183 已全部对照):
 *
 * 1. 模型:checked defineModel(布尔,无三态),点击主区 / 键盘 Space/Enter 先翻转后 click;
 * 2. 状态类:is-checked,对应源 CommonStates 的 Checked / CheckedPointerOver(=
 *    CheckedPrimaryPointerOver)/ CheckedPressed / CheckedFlyoutOpen / CheckedTouchPressed /
 *    CheckedPrimary* / CheckedSecondary* 全族;
 * 3. 状态 token 覆写(theme resources 已对照,SplitButton_themeresources.xaml L131-L207):
 *    背景 ← AccentFillColorDefault(--wui-system-accent-color,悬停用 Dark1 近似
 *    AccentFillColorSecondary,按压用 Dark2 近似 Tertiary);
 *    前景 ← TextOnAccentFillColorPrimary(Light #FFFFFF / Default #000000);
 *    边框 ← AccentControlElevationBorderBrush(1px 近似 ControlStrokeColorOnAccentSecondary:
 *    Light #66000000 / Default #23000000);
 *    分隔线 ← SplitButtonBorderBrushCheckedDivider = ControlStrokeColorOnAccentTertiary
 *    (Light #37000000 / Default #37000000)—— 在 .is-checked 下覆写
 *    --wui-splitbutton-divider;
 * 4. 无障碍:role=button 叠加 aria-pressed 开关语义(参照 ToggleButton.vue);
 * 5. chevron 与弹层逻辑不变(CheckedFlyoutOpen = is-checked + is-flyout-open,
 *    F2 的优先级组合选择器已天然支持 Checked 分支)。
 * =======================================================================================
 */
</style>
