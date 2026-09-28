<script setup lang="ts">
// Button.vue —— WinUI Button 控件的 Web 复刻(阶段 1 基础控件)。
// 视觉与状态对照源:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L5984 起
// TargetType="Button" 的 Style/ControlTemplate —— Normal/PointerOver/Pressed/Disabled 四态
// (DiscreteObjectKeyFrame 即时切换)+ UseSystemFocusVisuals 焦点视觉;
// 颜色/字号/圆角一律使用 theme.css 的 --wui-* token,无硬编码色值。
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

// —— WinUI FontWeight 命名 → CSS font-weight 数值(generic.xaml FontWeights 约定)——
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

const props = defineProps<{
  /** 按钮文本内容;更复杂内容(图标、图片等)用默认插槽放置(兜底显示本属性)。 */
  content?: string
  /** 是否禁用(对应 WinUI IsEnabled)。 */
  disabled?: boolean
  /** 背景色,任意 CSS 颜色;缺省用主题 ButtonBackground。 */
  background?: string
  /** 前景(文字)色,任意 CSS 颜色;缺省用主题 ButtonForeground。 */
  foreground?: string
  /** 边框色,任意 CSS 颜色;缺省用主题 ButtonBorderBrush(默认透明)。 */
  borderBrush?: string
  /** 字号(px);number 或任意 CSS 字号串,缺省 ControlContentThemeFontSize(14px)。 */
  fontSize?: number | string
  /** 字重;WinUI FontWeight 命名(Normal/SemiBold/Bold…)或数字,缺省 Normal(400)。 */
  fontWeight?: number | string
  /** 圆角(px);number 或任意 CSS 圆角串,缺省 4px(WinUI 3 ControlCornerRadius)。 */
  cornerRadius?: number | string
}>()

// 显式声明 click:外部 @click 监听不再经 $attrs 透传到根节点,避免原生 click 重复触发。
const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

defineOptions({
  // class/style 由根节点 v-bind="$attrs" 透传,其余 attrs(aria-* 等)一并透传。
  inheritAttrs: false,
})

// —— 属性解析:WinUI 值 → CSS 值 ——
function resolveLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value
}

function resolveFontWeight(value: number | string): number | string {
  if (typeof value === 'number') return value
  const numeric = Number(value)
  if (value.trim() !== '' && Number.isFinite(numeric)) return numeric
  return FONT_WEIGHT_NAMES[value] ?? value
}

// 覆盖色经 CSS 变量注入「Normal 态」规则;悬停/按下/禁用仍按 WinUI VSM 行为
// 使用主题状态色覆盖本地值(与 XAML VisualState 动画覆盖 TemplateBinding 一致)。
const rootStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {}
  if (props.background !== undefined) style['--wui-button-local-background'] = props.background
  if (props.foreground !== undefined) style['--wui-button-local-foreground'] = props.foreground
  if (props.borderBrush !== undefined) style['--wui-button-local-border'] = props.borderBrush
  if (props.fontSize !== undefined) style.fontSize = resolveLength(props.fontSize)
  if (props.fontWeight !== undefined) style.fontWeight = resolveFontWeight(props.fontWeight)
  if (props.cornerRadius !== undefined) style.borderRadius = resolveLength(props.cornerRadius)
  return style
})

function onClick(event: MouseEvent): void {
  emit('click', event)
}
</script>

<template>
  <!-- 原生 button 自带 Space/Enter 激活与 role="button" 语义,键盘可达性免费获得 -->
  <button
    type="button"
    class="wui-button"
    :style="rootStyle"
    :disabled="disabled"
    v-bind="$attrs"
    @click="onClick"
  >
    <slot>{{ content }}</slot>
  </button>
</template>

<style scoped>
.wui-button {
  /* ButtonPadding="8,4,8,5" */
  padding: 4px 8px 5px;
  font-family: var(--wui-content-control-theme-font-family);
  /* ControlContentThemeFontSize = 14px */
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-button-local-foreground, var(--wui-button-foreground));
  background: var(--wui-button-local-background, var(--wui-button-background));
  /* ButtonBorderThemeThickness = 2 */
  border: 2px solid var(--wui-button-border);
  border-color: var(--wui-button-local-border, var(--wui-button-border));
  /* WinUI 3 默认 ControlCornerRadius = 4;无同名 token,取最近似的圆角 token(见 wiki 差异节) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  cursor: default;
  user-select: none;
  touch-action: manipulation;
}

/* 状态色一律即时切换(generic.xaml 各态均为 DiscreteObjectKeyFrame,无过渡动画) */

.wui-button:hover:not(:disabled) {
  color: var(--wui-button-foreground-pointer-over);
  background: var(--wui-button-background-pointer-over);
  border-color: var(--wui-button-border-brush-pointer-over);
}

.wui-button:active:not(:disabled) {
  color: var(--wui-button-foreground-pressed);
  background: var(--wui-button-background-pressed);
  border-color: var(--wui-button-border-brush-pressed);
}

.wui-button:disabled {
  color: var(--wui-button-foreground-disabled);
  background: var(--wui-button-background-disabled);
  border-color: var(--wui-button-border-brush-disabled);
  cursor: default;
}

/* 系统焦点视觉:WinUI 双环(FocusVisualPrimary 内环 + FocusVisualSecondary 外环,
   FocusVisualMargin=-3)近似为 primary 色单环 outline */
.wui-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-button:focus:not(:focus-visible) {
  outline: none;
}
</style>
