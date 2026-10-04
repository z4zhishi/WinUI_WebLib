<script setup lang="ts">
// Button.vue —— WinUI Button 控件的 Web 复刻(阶段 1 基础控件)。
// 视觉与状态对照源:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L5984 起
// TargetType="Button" 的 Style/ControlTemplate —— Normal/PointerOver/Pressed/Disabled 四态
// (DiscreteObjectKeyFrame 即时切换)+ UseSystemFocusVisuals 焦点视觉;
// 颜色/字号/圆角一律使用 theme.css 的 --wui-* token,无硬编码色值。
// Reveal 变体(reveal prop):对照 G.xaml L15824 ButtonRevealStyle —— 状态色整体切换到
// --wui-button-reveal-* token(L1405-1412 映射),并叠加 Reveal 材料 pointer 光照
// (底板光 + 边框光,公共层 src/styles/reveal.css + useReveal;常量锚点见该文件头注)。
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { useReveal } from '../composables/useReveal'
import '../styles/reveal.css'

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
  /** Reveal 揭示光照(对照 ButtonRevealStyle,G.xaml L15824):默认 false,
      开启后状态色切换到 --wui-button-reveal-* 并叠加跟随指针的光照(hover 光晕)。 */
  reveal?: boolean
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

// Reveal 光照:指针位置/光斑半径写入 CSS 变量(仅 reveal 且指针设备启用,见 useReveal)。
const revealHandlers = useReveal(() => props.reveal === true)

function onClick(event: MouseEvent): void {
  emit('click', event)
}
</script>

<template>
  <!-- 原生 button 自带 Space/Enter 激活与 role="button" 语义,键盘可达性免费获得 -->
  <button
    type="button"
    class="wui-button"
    :class="{
      'wui-button--reveal': reveal,
      'wui-reveal': reveal,
      'wui-reveal--border': reveal,
    }"
    :style="rootStyle"
    :disabled="disabled"
    v-bind="$attrs"
    v-on="reveal ? revealHandlers : undefined"
    @click="onClick"
  >
    <slot>{{ content }}</slot>
  </button>
</template>

<style scoped>
.wui-button {
  /* 状态色中间变量(状态规则就地消费;reveal 变体经同名变量整体切换,见文末)。
     Normal 态先经 --wui-button-local-* 透传 background/foreground/borderBrush prop
     (对应 TemplateBinding;交互态仍按 WinUI VSM 用主题状态色覆盖本地值) */
  /* PL3:状态色重定向到 Fluent 画刷族(PL2 token,值与 controls/dev 权威一致)。
     Normal 态:前景 TextFillColorPrimary、底 ControlFillColorDefault;
     边框权威为渐变 ControlElevationBorderBrush(PL2 无对应 token,P1 未决),以
     ControlFillColorTransparent 占位——与既有 transparent 几何一致。 */
  --btn-fg: var(--wui-button-local-foreground, var(--wui-text-fill-color-primary));
  --btn-bg: var(--wui-button-local-background, var(--wui-control-fill-color-default));
  --btn-border: var(--wui-button-local-border, var(--wui-control-fill-color-transparent));

  /* ButtonPadding="8,4,8,5" */
  padding: 4px 8px 5px;
  font-family: var(--wui-content-control-theme-font-family);
  /* ControlContentThemeFontSize = 14px */
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--btn-fg);
  background: var(--btn-bg);
  /* ButtonBorderThemeThickness = 2 */
  border: 2px solid var(--btn-border);
  /* WinUI 3 默认 ControlCornerRadius = 4;无同名 token,取最近似的圆角 token(见 wiki 差异节) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  cursor: default;
  user-select: none;
  touch-action: manipulation;
  /* 背景色隐式过渡:源 Button_themeresources.xaml L173-175 在 ContentPresenter 上声明
     BackgroundTransition = BrushTransition Duration=0:0:0.083(83ms)。源 BrushTransition 无缓动参数,
     平台实现取线性缓动(SharedTransitionAnimations.cpp L14-17 LinearEasingFunction)→ CSS linear。
     仅 background-color:源 BrushTransition 只作用于 Background,前景/边框无对应 Transition。 */
  transition: background-color 83ms linear;
}

/* 前景 / 边框状态色即时切换(源各态为 DiscreteObjectKeyFrame,无过渡动画);
   背景色经上面的 BrushTransition 83ms 线性过渡 */

.wui-button:hover:not(:disabled) {
  /* PointerOver:TextFillColorPrimary / ControlFillColorSecondary;
     边框 ControlElevationBorderBrush(渐变,P1 未决,占位透明) */
  --btn-fg: var(--wui-text-fill-color-primary);
  --btn-bg: var(--wui-control-fill-color-secondary);
  --btn-border: var(--wui-control-fill-color-transparent);
}

.wui-button:active:not(:disabled) {
  /* Pressed:TextFillColorSecondary / ControlFillColorTertiary / ControlStrokeColorDefault */
  --btn-fg: var(--wui-text-fill-color-secondary);
  --btn-bg: var(--wui-control-fill-color-tertiary);
  --btn-border: var(--wui-control-stroke-color-default);
}

.wui-button:disabled {
  /* Disabled:TextFillColorDisabled / ControlFillColorDisabled / ControlStrokeColorDefault */
  --btn-fg: var(--wui-text-fill-color-disabled);
  --btn-bg: var(--wui-control-fill-color-disabled);
  --btn-border: var(--wui-control-stroke-color-default);
  cursor: default;
}

/* 系统焦点视觉:WinUI 双环(primary 外环 2px + secondary 内环 1px,
   FocusVisualMargin=-3)按双环实现 */
.wui-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.wui-button:focus:not(:focus-visible) {
  outline: none;
}

/* ======================================================================
 * Reveal 变体(reveal prop,对照 G.xaml L15824 ButtonRevealStyle):
 * 状态色整体切换到 --wui-button-reveal-* token(G.xaml L1405-1412,明暗值见
 * theme.css);本地 background/borderBrush prop 仍最优先(对应 TemplateBinding)。
 * 光照层(::before 底板光 / ::after 边框光)在公共层 reveal.css。
 * ====================================================================== */
.wui-button--reveal {
  /* ButtonRevealBorderThemeThickness = 2(G.xaml L1393)→ 边框光环厚度 */
  --wui-reveal-border-width: 2px;
  /* Normal:ButtonRevealBackground / ButtonRevealBorderBrush(本地 prop 仍最优先) */
  --btn-bg: var(--wui-button-local-background, var(--wui-button-reveal-background));
  --btn-border: var(--wui-button-local-border, var(--wui-button-reveal-border));
}

.wui-button--reveal:hover:not(:disabled) {
  --btn-bg: var(--wui-button-reveal-background-pointer-over);
  --btn-border: var(--wui-button-reveal-border-brush-pointer-over);
}

.wui-button--reveal:active:not(:disabled) {
  --btn-bg: var(--wui-button-reveal-background-pressed);
  --btn-border: var(--wui-button-reveal-border-brush-pressed);
}

.wui-button--reveal:disabled {
  --btn-bg: var(--wui-button-reveal-background-disabled);
  --btn-border: var(--wui-button-reveal-border-brush-disabled);
}
</style>
