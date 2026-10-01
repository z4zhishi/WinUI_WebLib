<script setup lang="ts">
// WuiMenuFlyoutItem —— WinUI MenuFlyoutItem 的 Web 复刻(MenuFlyout 菜单内的命令项)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style x:Key="MenuFlyoutItemRevealStyle" TargetType="MenuFlyoutItem">(L18404 起):
//   - 内边距 MenuFlyoutItemThemePadding="11,9,11,10"、字号 ControlContentThemeFontSize(14px);
//   - 图标盒 16x16(模板 Viewbox IconRoot);勾选/图标占位列
//     MenuFlyoutItemPlaceholderThemeThickness="28,0,0,0"(勾选列/图标列宽 = 16 内容 + 12 间距);
//   - 快捷键文本 KeyboardAcceleratorTextBlock:CaptionTextBlockStyle(12px)、Margin="24,0,0,0"、右对齐;
//   - 状态色 MenuFlyoutItemReveal* / MenuFlyoutItemKeyboardAcceleratorTextForeground* → theme.css token。
// 行为规格:点击触发 Click 并关闭整条菜单(WinUI 菜单项调用即 light dismiss);
//   禁用项不触发且不参与方向键导航(aria-disabled,导航方按此跳过)。
// 列对齐:勾选列/图标列是否渲染由所在菜单层注入的 glyphs 状态推导(对齐 WinUI 的
//   CheckPlaceholderStates:同层出现勾选项/图标项时,纯文本项补占位列),机制见 wiki/controls/MenuFlyout.md。
// 上下文契约:由 MenuFlyout(根层)或 MenuFlyoutSubItem(子菜单层)provide,键 'wuiMenuFlyoutLevel';
//   各组件文件各自声明同构接口(结构化类型兼容),避免跨组件文件导入。
import { computed, inject, onScopeDispose, useSlots, watch, type Ref } from 'vue'
import { symbolToGlyph } from '@/utils/symbolIcons'

/** 菜单层上下文(MenuFlyout 根层 / MenuFlyoutSubItem 子菜单层提供)。 */
interface MenuFlyoutLevelContext {
  /** 本菜单层是否打开(根层 = isOpen 模型;子菜单层 = 子菜单开关)。 */
  isOpen: Ref<boolean>
  /** 层内列对齐状态:是否出现勾选项 / 图标项(决定纯文本项的占位列)。 */
  glyphs: Ref<{ check: boolean; icon: boolean }>
  /** 菜单项登记(用于推导 glyphs);返回注销函数。 */
  registerItem: (item: { checkable: boolean; hasIcon: () => boolean }) => () => void
  /** 关闭整条菜单链;restoreFocus=true 时把焦点归还给菜单锚(键盘路径)。 */
  closeAll: (restoreFocus: boolean) => void
}

defineOptions({ name: 'WuiMenuFlyoutItem', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 项文本(WinUI Text;默认 slot 兜底,slot 优先)。 */
    text?: string
    /** 图标:WinUI Symbol 枚举名(如 'Copy' / 'Delete')或 Segoe 字形字符;亦可用 #icon slot 放 FontIcon 等任意图标元素。 */
    icon?: string
    /** 快捷键(WinUI KeyboardAccelerator 的字符串等价,如 'Ctrl+C'):菜单打开期间显示于行尾并注册键盘监听,匹配即触发 click。 */
    acceleratorKeys?: string
    /** 禁用(WinUI IsEnabled = false 的取反映射):不触发、不参与键盘导航。 */
    disabled?: boolean
  }>(),
  { text: '', icon: '', acceleratorKeys: '', disabled: false },
)

// 显式声明 emits:防止原生 click 透传造成父级监听重复触发。
const emit = defineEmits<{
  /** 点击/键盘激活菜单项(WinUI Click);触发后整条菜单关闭。 */
  click: [event: MouseEvent]
}>()

const slots = useSlots()

// —— 菜单层上下文(独立使用时为 null:项仍可渲染,只是无关闭/对齐行为)——
const level = inject<MenuFlyoutLevelContext | null>('wuiMenuFlyoutLevel', null)

// —— 图标解析:Symbol 枚举名 → 字形字符;非枚举名按字面字形字符使用 ——
const iconGlyph = computed(() => symbolToGlyph(props.icon) ?? props.icon)
const hasIcon = computed(() => iconGlyph.value !== '' || slots.icon !== undefined)

// —— 登记到所在层(推导勾选列/图标列占位);组件卸载时注销 ——
if (level) {
  const unregister = level.registerItem({ checkable: false, hasIcon: () => hasIcon.value })
  onScopeDispose(unregister)
}

// —— 列渲染:自身有内容或同层出现对应列时渲染空占位,保证勾选列/图标列纵向对齐 ——
const showCheckCol = computed(() => level?.glyphs.value.check === true)
const showIconCol = computed(() => hasIcon.value || level?.glyphs.value.icon === true)

/* -------------------------------------------------------------------------
 * 快捷键(acceleratorKeys):'Ctrl+S' / 'Ctrl+Alt+Delete' 等字符串解析。
 * 修饰符取自 KeyboardAccelerator.Modifiers(VirtualKeyModifiers)常用写法;
 * 末段为 key 名(与 KeyboardEvent.key 大小写不敏感比较,如 'S' / 'Delete' / 'F5')。
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

/** 常用 key 别名 → KeyboardEvent.key 标准名(WinUI 显示 'Del' 而 key 为 'Delete' 等)。 */
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

/** 调用菜单项:发 click + 关闭整条菜单(禁用时为无操作)。键盘路径以合成 MouseEvent 上报。 */
function invoke(event?: MouseEvent): void {
  if (props.disabled) return
  emit('click', event ?? new MouseEvent('click'))
  // WinUI:菜单项调用后整条菜单关闭(含各级子菜单)
  level?.closeAll(false)
}

// —— 菜单层打开期间监听快捷键(capture:先于页面其它处理)——
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
    class="wui-menu-flyout-item"
    :class="{ 'is-disabled': disabled }"
    role="menuitem"
    tabindex="-1"
    data-wui-menu-item
    :aria-disabled="disabled || undefined"
    v-bind="$attrs"
    @click="invoke($event)"
    @keydown.enter.prevent="invoke()"
    @keydown.space.prevent="invoke()"
  >
    <!-- 勾选列占位(16 内容 + 12 间距 = 28,对齐 ToggleMenuFlyoutItem 的勾选列) -->
    <span v-if="showCheckCol" class="menu-col menu-col-check" aria-hidden="true"></span>
    <!-- 图标列:16x16 图标盒(内容为 Symbol/字形字符或 #icon slot) -->
    <span v-if="showIconCol" class="menu-col menu-col-icon" aria-hidden="true">
      <slot name="icon">{{ iconGlyph }}</slot>
    </span>
    <span class="menu-label"><slot>{{ text }}</slot></span>
    <!-- 快捷键文本:对齐模板 KeyboardAcceleratorTextBlock(12px、左距 24、右对齐、对 AT 隐藏) -->
    <span v-if="acceleratorKeys" class="menu-accel" aria-hidden="true">{{ acceleratorKeys }}</span>
  </div>
</template>

<style scoped>
/* ======================================================================
 * 组合态配色(CommonStates):根元素按交互态写中间变量就地消费,
 * 对应 generic.xaml 各 VisualState 的 DiscreteObjectKeyFrame(即时切换)。
 * ====================================================================== */
.wui-menu-flyout-item {
  --mfi-bg: var(--wui-menu-flyout-item-reveal-background);
  --mfi-fg: var(--wui-menu-flyout-item-foreground);
  --mfi-accel: var(--wui-menu-flyout-item-keyboard-accelerator-text-foreground);
}

/* PointerOver */
.wui-menu-flyout-item:not(.is-disabled):hover {
  --mfi-bg: var(--wui-menu-flyout-item-reveal-background-pointer-over);
  --mfi-fg: var(--wui-menu-flyout-item-foreground-pointer-over);
  --mfi-accel: var(--wui-menu-flyout-item-keyboard-accelerator-text-foreground-pointer-over);
}

/* Pressed */
.wui-menu-flyout-item:not(.is-disabled):active {
  --mfi-bg: var(--wui-menu-flyout-item-reveal-background-pressed);
  --mfi-fg: var(--wui-menu-flyout-item-foreground-pressed);
  --mfi-accel: var(--wui-menu-flyout-item-keyboard-accelerator-text-foreground-pressed);
}

/* Disabled */
.wui-menu-flyout-item.is-disabled {
  --mfi-bg: var(--wui-menu-flyout-item-reveal-background-disabled);
  --mfi-fg: var(--wui-menu-flyout-item-foreground-disabled);
  --mfi-accel: var(--wui-menu-flyout-item-keyboard-accelerator-text-foreground-disabled);
}

/* Focused(键盘导航聚焦):WinUI 3 菜单项聚焦 = 列表高亮背景(不画焦点框) */
.wui-menu-flyout-item:focus {
  --mfi-bg: var(--wui-menu-flyout-item-reveal-background-pointer-over);
  --mfi-fg: var(--wui-menu-flyout-item-foreground-pointer-over);
  --mfi-accel: var(--wui-menu-flyout-item-keyboard-accelerator-text-foreground-pointer-over);
}

/* ======================================================================
 * 布局(对照 ControlTemplate LayoutRoot):
 * Padding="11,9,11,10"(XAML Thickness 左,上,右,下),单行 flex,
 * 列顺序:勾选列(28)→ 图标列(28)→ 文本(*)→ 快捷键文本(Auto)。
 * ====================================================================== */
.wui-menu-flyout-item {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  padding: 9px 11px 10px;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  line-height: normal;
  color: var(--mfi-fg);
  background: var(--mfi-bg);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
}

.wui-menu-flyout-item:focus {
  outline: none;
}

/* 系统焦点视觉:MenuFlyoutItemRevealStyle UseSystemFocusVisuals=True + 默认
   FocusVisualMargin=0 → 键盘聚焦 = 高亮底 + 元素内双环(primary [0,2] + secondary [2,3]) */
.wui-menu-flyout-item:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

/* 勾选列/图标列:内容 16px + 右间距 12px = 占位 28(MenuFlyoutItemPlaceholderThemeThickness) */
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

/* 图标列内容:字形字符按图标字体栈渲染(R1:依赖本机 Segoe 字体栈,见 wiki) */
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

/* 快捷键文本:CaptionTextBlockStyle(12px)+ Margin="24,0,0,0" + 右对齐 */
.menu-accel {
  flex: none;
  margin-left: 24px;
  font-size: 12px;
  line-height: normal;
  text-align: right;
  color: var(--mfi-accel);
}
</style>
