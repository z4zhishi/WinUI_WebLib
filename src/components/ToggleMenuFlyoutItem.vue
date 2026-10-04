<script setup lang="ts">
// WuiToggleMenuFlyoutItem —— WinUI ToggleMenuFlyoutItem 的 Web 复刻(菜单内的开关项)。
// 视觉规格:CK/WinUI-Reference/controls/dev/CommonStyles/MenuFlyout_themeresources.xaml
//   <Style x:Key="DefaultToggleMenuFlyoutItemStyle" TargetType="ToggleMenuFlyoutItem">(L398 起):
//   - 布局三列:CheckGlyph(勾选字形以内联 SVG 等形复刻;dev 模板 FontSize=12 / Margin="0,0,16,0",
//     本组件保持既有几何 16px 盒 + 12px 间距 = 28 占位,几何不在本批范围,见 wiki 差异节;未勾选 Opacity=0)
//     → 图标盒/文本 → 快捷键文本;勾选态即 CheckGlyph 显隐(CheckStates);
//   - 状态色:Background 各态取 MenuFlyoutSubItemBackground*(SubtleFillColor*,L418/L427);
//     Foreground = MenuFlyoutItemForeground(TextFillColorPrimary/Disabled);
//     CheckGlyph Foreground = MenuFlyoutSubItemChevron(常态)/MenuFlyoutItemForegroundPointerOver(悬停)/
//     MenuFlyoutSubItemForegroundPressed(按压)/MenuFlyoutSubItemForegroundDisabled(禁用);
//     快捷键色 ToggleMenuFlyoutItemKeyboardAcceleratorTextForeground* = TextFillColorSecondary/Disabled。
// Reveal 揭示光照(MR8,既有已验收效果,本批保留):光照本体=公共层(reveal.css + useReveal),口径同
//   MenuFlyoutItem(底板光半径 Clamp(Max(W,H)+12,16,512)、边框光 39px narrow、光环厚度 1px);
//   叠放层级:底色(hover 高亮)之下在上、内容之下 —— .wui-reveal::before/::after 的 z-index:-1 承接。
// 行为规格:点击切换 IsChecked 并触发 Click,但**不关闭菜单**(WinUI 开关项调用不触发
//   light dismiss,与 MenuFlyoutItem 的关键差异);勾选字形 E001 以内联 SVG 等形复刻
//   (与 CheckBox 同一决策:保证非 Windows 平台渲染一致,颜色取对应 token)。
// 列对齐:本组件恒渲染勾选列;图标列按「自身有图标或同层出现图标项」渲染(登记到所在层)。
import { computed, inject, onScopeDispose, useSlots, watch, type Ref } from 'vue'
import { useReveal } from '../composables/useReveal'
import { symbolToGlyph } from '@/utils/symbolIcons'
import '../styles/reveal.css'

/** 菜单层上下文(与 MenuFlyoutItem 同构,结构化类型兼容)。 */
interface MenuFlyoutLevelContext {
  isOpen: Ref<boolean>
  glyphs: Ref<{ check: boolean; icon: boolean }>
  registerItem: (item: { checkable: boolean; hasIcon: () => boolean }) => () => void
  closeAll: (restoreFocus: boolean) => void
}

defineOptions({ name: 'WuiToggleMenuFlyoutItem', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 项文本(WinUI Text;默认 slot 兜底,slot 优先)。 */
    text?: string
    /** 图标:WinUI Symbol 枚举名(如 'Share')或 Segoe 字形字符;亦可用 #icon slot 放任意图标元素。 */
    icon?: string
    /** 快捷键显示与键盘绑定(如 'Ctrl+R'),语义同 MenuFlyoutItem。 */
    acceleratorKeys?: string
    /** 禁用(WinUI IsEnabled = false 的取反映射)。 */
    disabled?: boolean
  }>(),
  { text: '', icon: '', acceleratorKeys: '', disabled: false },
)

const emit = defineEmits<{
  /** 点击/键盘切换开关项(WinUI Click);菜单保持打开。 */
  click: [event: MouseEvent]
  // 注:update:isChecked 的 emit 类型由下方 defineModel 提供,勿在此重复声明。
}>()

// 双向:isChecked(WinUI IsChecked)。
const isChecked = defineModel<boolean>('isChecked', { default: false })

const slots = useSlots()

const level = inject<MenuFlyoutLevelContext | null>('wuiMenuFlyoutLevel', null)

const iconGlyph = computed(() => symbolToGlyph(props.icon) ?? props.icon)
const hasIcon = computed(() => iconGlyph.value !== '' || slots.icon !== undefined)

// 本组件为勾选项:登记 checkable=true,驱动同层纯文本项补勾选占位列
if (level) {
  const unregister = level.registerItem({ checkable: true, hasIcon: () => hasIcon.value })
  onScopeDispose(unregister)
}

// 勾选列恒渲染(本组件自带 CheckGlyph);图标列按层内情况渲染
const showIconCol = computed(() => hasIcon.value || level?.glyphs.value.icon === true)

// reveal 光照(公共层):指针位置/光斑半径写入 CSS 变量(非禁用且指针设备启用);
// 光晕渲染在 reveal.css 的 ::before(底板光)/::after(边框光)。
const revealHandlers = useReveal(() => !props.disabled)

/* -------------------------------------------------------------------------
 * 快捷键(acceleratorKeys):解析与匹配同 MenuFlyoutItem(菜单层打开期间监听)。
 * ---------------------------------------------------------------------- */

interface AcceleratorSpec {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

const MODIFIER_MAP: Record<string, keyof Omit<AcceleratorSpec, 'key'>> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  shift: 'shift',
  win: 'meta',
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
}

/** 常用 key 别名 → KeyboardEvent.key 标准名(同 MenuFlyoutItem)。 */
const KEY_ALIAS_MAP: Record<string, string> = {
  del: 'delete',
  ins: 'insert',
  esc: 'escape',
  return: 'enter',
  spacebar: ' ',
}

function normalizeKeyName(name: string): string {
  const lowered = name.toLowerCase()
  return KEY_ALIAS_MAP[lowered] ?? lowered
}

function parseAccelerator(spec: string): AcceleratorSpec | null {
  const tokens = spec
    .split('+')
    .map((token) => token.trim())
    .filter((token) => token !== '')
  if (tokens.length === 0) return null
  const result: AcceleratorSpec = { key: '', ctrl: false, alt: false, shift: false, meta: false }
  for (let index = 0; index < tokens.length - 1; index++) {
    const mapped = MODIFIER_MAP[(tokens[index] ?? '').toLowerCase()]
    if (!mapped) return null
    result[mapped] = true
  }
  result.key = tokens[tokens.length - 1] ?? ''
  if (result.key === '') return null
  return result
}

function matchesAccelerator(event: KeyboardEvent, spec: AcceleratorSpec): boolean {
  return (
    event.ctrlKey === spec.ctrl &&
    event.altKey === spec.alt &&
    event.shiftKey === spec.shift &&
    event.metaKey === spec.meta &&
    normalizeKeyName(event.key) === normalizeKeyName(spec.key)
  )
}

const accelerator = computed<AcceleratorSpec | null>(() => parseAccelerator(props.acceleratorKeys))

/** 切换开关项:翻转 isChecked + 发 click;与 WinUI 一致,菜单保持打开。 */
function invoke(event?: MouseEvent): void {
  if (props.disabled) return
  isChecked.value = !isChecked.value
  emit('click', event ?? new MouseEvent('click'))
}

function onDocumentKeydown(event: KeyboardEvent): void {
  const spec = accelerator.value
  if (!spec || !matchesAccelerator(event, spec)) return
  event.preventDefault()
  event.stopPropagation()
  invoke()
}

watch(
  () => level?.isOpen.value ?? false,
  (open) => {
    if (typeof document === 'undefined') return
    if (open && accelerator.value) {
      document.addEventListener('keydown', onDocumentKeydown, true)
    } else {
      document.removeEventListener('keydown', onDocumentKeydown, true)
    }
  },
  { immediate: true },
)
onScopeDispose(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onDocumentKeydown, true)
  }
})
</script>

<template>
  <div
    class="wui-toggle-menu-flyout-item wui-reveal wui-reveal--border"
    :class="{ 'is-disabled': disabled, 'is-checked': isChecked }"
    role="menuitemcheckbox"
    tabindex="-1"
    data-wui-menu-item
    :aria-checked="isChecked"
    :aria-disabled="disabled || undefined"
    v-bind="$attrs"
    v-on="revealHandlers"
    @click="invoke($event)"
    @keydown.enter.prevent="invoke()"
    @keydown.space.prevent="invoke()"
  >
    <!-- 勾选列:CheckGlyph E001(CheckMark)以内联 SVG 等形复刻,未勾选隐藏(CheckStates) -->
    <span class="menu-col menu-col-check" aria-hidden="true">
      <svg class="check-glyph" viewBox="0 0 20 20" focusable="false">
        <path d="M4.5 10.5 L8.5 14.5 L15.5 6.5" />
      </svg>
    </span>
    <span v-if="showIconCol" class="menu-col menu-col-icon" aria-hidden="true">
      <slot name="icon">{{ iconGlyph }}</slot>
    </span>
    <span class="menu-label"><slot>{{ text }}</slot></span>
    <span v-if="acceleratorKeys" class="menu-accel" aria-hidden="true">{{ acceleratorKeys }}</span>
  </div>
</template>

<style scoped>
/* ======================================================================
 * 组合态配色(CommonStates → theme.css 的 --wui-toggle-menu-flyout-item-*)
 * ====================================================================== */
.wui-toggle-menu-flyout-item {
  --tmfi-bg: var(--wui-subtle-fill-color-transparent); /* Background="Transparent"(DefaultToggleMenuFlyoutItemStyle L399) */
  --tmfi-fg: var(--wui-text-fill-color-primary); /* MenuFlyoutItemForeground = TextFillColorPrimaryBrush */
  --tmfi-accel: var(--wui-text-fill-color-secondary); /* ToggleMenuFlyoutItemKeyboardAcceleratorTextForeground = TextFillColorSecondaryBrush */
  --tmfi-check: var(--wui-text-fill-color-secondary); /* CheckGlyph Foreground = MenuFlyoutSubItemChevron = TextFillColorSecondaryBrush(L488) */
}

/* PointerOver ← LayoutRoot.Background = MenuFlyoutSubItemBackgroundPointerOver = SubtleFillColorSecondary */
.wui-toggle-menu-flyout-item:not(.is-disabled):hover {
  --tmfi-bg: var(--wui-subtle-fill-color-secondary);
  --tmfi-fg: var(--wui-text-fill-color-primary);
  --tmfi-accel: var(--wui-text-fill-color-secondary);
  --tmfi-check: var(--wui-text-fill-color-primary); /* CheckGlyph ← MenuFlyoutItemForegroundPointerOver */
}

/* Pressed ← LayoutRoot.Background = MenuFlyoutSubItemBackgroundPressed = SubtleFillColorTertiary */
.wui-toggle-menu-flyout-item:not(.is-disabled):active {
  --tmfi-bg: var(--wui-subtle-fill-color-tertiary);
  --tmfi-fg: var(--wui-text-fill-color-primary);
  --tmfi-accel: var(--wui-text-fill-color-secondary);
  --tmfi-check: var(--wui-text-fill-color-primary); /* CheckGlyph ← MenuFlyoutSubItemForegroundPressed */
}

/* Disabled:模板仅改前景(Background 保持 Transparent),CheckGlyph ← MenuFlyoutSubItemForegroundDisabled */
.wui-toggle-menu-flyout-item.is-disabled {
  --tmfi-bg: var(--wui-subtle-fill-color-transparent);
  --tmfi-fg: var(--wui-text-fill-color-disabled);
  --tmfi-accel: var(--wui-text-fill-color-disabled);
  --tmfi-check: var(--wui-text-fill-color-disabled);
}

/* Focused:同 WinUI 3,列表高亮背景即焦点视觉 */
.wui-toggle-menu-flyout-item:focus {
  --tmfi-bg: var(--wui-subtle-fill-color-secondary);
  --tmfi-fg: var(--wui-text-fill-color-primary);
  --tmfi-accel: var(--wui-text-fill-color-secondary);
  --tmfi-check: var(--wui-text-fill-color-primary);
}

/* 布局:同 MenuFlyoutItem(Padding="11,9,11,10",列序 勾选 → 图标 → 文本 → 快捷键) */
.wui-toggle-menu-flyout-item {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  padding: 9px 11px 10px;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  line-height: normal;
  color: var(--tmfi-fg);
  background: var(--tmfi-bg);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
}

.wui-toggle-menu-flyout-item:focus {
  outline: none;
}

/* 系统焦点视觉:UseSystemFocusVisuals=True + 默认 FocusVisualMargin=0 →
   键盘聚焦 = 高亮底 + 元素内双环(primary [0,2] + secondary [2,3]) */
.wui-toggle-menu-flyout-item:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
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

/* 勾选字形:CheckGlyph FontSize=16 / Width=16 / Margin="0,0,12,0";未勾选 Opacity=0 */
.check-glyph {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--tmfi-check);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wui-toggle-menu-flyout-item:not(.is-checked) .check-glyph {
  opacity: 0;
}

.menu-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-align: left;
  white-space: nowrap;
  text-overflow: clip;
}

.menu-accel {
  flex: none;
  margin-left: 24px;
  font-size: 12px;
  line-height: normal;
  text-align: right;
  color: var(--tmfi-accel);
}

/* ======================================================================
 * Reveal 揭示光照(公共层 reveal.css,既有已验收效果):口径同 MenuFlyoutItem ——
 * 边框光半径 39px(narrow,RevealBorderLight.cpp L24-35);光环厚度 1px。底色各态已重定向为
 * controls/dev 的 SubtleFill 与 TextFill 权威值(见上),光照叠于其上。
 * ====================================================================== */
.wui-toggle-menu-flyout-item.wui-reveal {
  --wui-reveal-border-width: 1px;
  --wui-reveal-border-radius: 39px;
}

/* 禁用项不点亮光晕(div 无 :disabled,由类门抑制) */
.wui-toggle-menu-flyout-item.is-disabled.wui-reveal:hover::before,
.wui-toggle-menu-flyout-item.is-disabled.wui-reveal:hover::after {
  opacity: 0;
}
</style>
