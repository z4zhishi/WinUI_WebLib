<script setup lang="ts">
// WuiToggleButton —— WinUI ToggleButton(Primitives)的 Web 复刻。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="ToggleButton">(L6171 起):外观同 Button(ButtonPadding 8,4,8,5、
//   2px 边框、ControlCornerRadius 4),但 CommonStates 含 checked/indeterminate 分支的组合态
//   —— Normal/PointerOver/Pressed/Disabled × Unchecked/Checked/Indeterminate,全部用
//   DiscreteObjectKeyFrame 即时切换;颜色一律取 theme.css 的 --wui-toggle-button-* token。
// 行为规格:ToggleButton_Partial.cpp —— OnClick() 先 OnToggleProtected()(切状态并触发
//   Checked/Unchecked/Indeterminate)后 Click;OnToggleImpl(L249 起)的点击环:
//   未勾选 → 勾选;勾选 →(IsThreeState 时)不确定,否则未勾选;不确定 → 未勾选。
// 模型设计:checked 以 boolean | 'indeterminate' 哨兵值对应 WinUI IsChecked(Nullable<bool>),
//   null → 'indeterminate';IsThreeState 仅约束用户点击是否经过不确定态。详见 wiki/controls/ToggleButton.md。
import { computed } from 'vue'
import { useReveal } from '../composables/useReveal'
import '../styles/reveal.css'

// class/style 等透传属性统一由根元素 v-bind="$attrs" 承接(避免落到 button 之外的继承位)。
defineOptions({ name: 'WuiToggleButton', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 按钮文本内容(WinUI Content;默认 slot 兜底,slot 优先)。 */
    content?: string
    /** 三态:允许用户点击进入不确定态(WinUI IsThreeState)。 */
    isThreeState?: boolean
    /** 禁用(WinUI IsEnabled 的取反映射,便于沿用原生 disabled 语义)。 */
    disabled?: boolean
    /** Reveal 揭示光照(对照 ToggleButtonRevealStyle,G.xaml L15953):默认 false,
        开启后状态色切换到 --wui-toggle-button-reveal-* 并叠加跟随指针的光照。 */
    reveal?: boolean
  }>(),
  { content: '', isThreeState: false, disabled: false },
)

// 显式声明 emits(含 click):父级 @click 监听改走 emit 转发,防止原生 click 重复触发。
const emit = defineEmits<{
  /** 点击按钮时触发(转发原生 MouseEvent;Space/Enter 键同样触发;禁用时不触发)。 */
  click: [event: MouseEvent]
  /** 进入勾选态(WinUI Checked;仅用户交互触发)。 */
  checked: []
  /** 进入未勾选态(WinUI Unchecked;仅用户交互触发)。 */
  unchecked: []
  /** 进入不确定态(WinUI Indeterminate;仅用户交互触发)。 */
  indeterminate: []
  // 注:update:checked 的 emit 类型由下方 defineModel 提供,勿在此重复声明(会导致 vue-tsc 推断退化为 unknown)。
}>()

// 双向:checked —— boolean | 'indeterminate'('indeterminate' ↔ WinUI IsChecked = null)。
const checked = defineModel<boolean | 'indeterminate'>('checked', { default: false })

const isChecked = computed(() => checked.value === true)
const isIndeterminate = computed(() => checked.value === 'indeterminate')

// WAI-ARIA:开关按钮的第三态用 aria-pressed="mixed" 表达(对应 WinUI IsChecked = null)。
const ariaPressed = computed(() =>
  isIndeterminate.value ? 'mixed' : isChecked.value ? 'true' : 'false',
)

/**
 * 点击环(对照 ToggleButton::OnToggleImpl,L249 起):
 * 未勾选 → 勾选;勾选 →(isThreeState 时)不确定,否则未勾选;不确定 → 未勾选。
 */
function onToggle(event: MouseEvent): void {
  if (props.disabled) return

  const next: boolean | 'indeterminate' =
    checked.value === true
      ? props.isThreeState
        ? 'indeterminate'
        : false
      : checked.value === 'indeterminate'
        ? false
        : true

  // 官方 OnClick 次序(ToggleButton_Partial.cpp L178):先 OnToggleProtected() 切状态并
  // 同步触发 Checked/Unchecked/Indeterminate,后由 ToggleButtonGenerated::OnClick() 触发 Click。
  if (next !== checked.value) {
    checked.value = next
    if (next === true) emit('checked')
    else if (next === false) emit('unchecked')
    else emit('indeterminate')
  }
  emit('click', event)
}

// Reveal 光照:指针位置/光斑半径写入 CSS 变量(仅 reveal 且指针设备启用,见 useReveal)。
const revealHandlers = useReveal(() => props.reveal === true)
</script>

<template>
  <!-- 原生 button 自带 Space/Enter 激活与 role="button" 语义,键盘可达性免费获得 -->
  <button
    type="button"
    class="wui-toggle-button"
    :class="{
      'is-checked': isChecked,
      'is-indeterminate': isIndeterminate,
      'is-disabled': disabled,
      'wui-toggle-button--reveal': reveal,
      'wui-reveal': reveal,
      'wui-reveal--border': reveal,
    }"
    :aria-pressed="ariaPressed"
    :disabled="disabled"
    v-bind="$attrs"
    v-on="reveal ? revealHandlers : undefined"
    @click="onToggle"
  >
    <slot>{{ content }}</slot>
  </button>
</template>

<style scoped>
/* ======================================================================
 * 组合态配色(CommonStates):根元素按三态 + 交互态写入中间变量并就地消费,
 * 对应 generic.xaml 各 VisualState 的 ObjectAnimation(DiscreteObjectKeyFrame,
 * 状态色即时切换、无过渡动画)。
 * ====================================================================== */
.wui-toggle-button {
  /* Normal(PL3:重定向到 Fluent 画刷族;边框权威为渐变 ControlElevationBorderBrush,
     PL2 无对应 token,P1 未决 → 透明占位) */
  --tb-fg: var(--wui-text-fill-color-primary);
  --tb-bg: var(--wui-control-fill-color-default);
  --tb-border: var(--wui-control-fill-color-transparent);
}

/* PointerOver / CheckedPointerOver / IndeterminatePointerOver */
.wui-toggle-button:not(.is-disabled):hover {
  --tb-fg: var(--wui-text-fill-color-primary);
  --tb-bg: var(--wui-control-fill-color-secondary);
  --tb-border: var(--wui-control-fill-color-transparent);
}
.wui-toggle-button.is-checked:not(.is-disabled):hover {
  /* CheckedPointerOver:TextOnAccentPrimary / AccentFillColorSecondary */
  --tb-fg: var(--wui-text-on-accent-fill-color-primary);
  --tb-bg: var(--wui-accent-fill-color-secondary);
  --tb-border: var(--wui-control-fill-color-transparent);
}
.wui-toggle-button.is-indeterminate:not(.is-disabled):hover {
  /* IndeterminatePointerOver 同 PointerOver(源指向 ControlFillColorSecondary) */
  --tb-fg: var(--wui-text-fill-color-primary);
  --tb-bg: var(--wui-control-fill-color-secondary);
  --tb-border: var(--wui-control-fill-color-transparent);
}

/* Pressed / CheckedPressed / IndeterminatePressed */
.wui-toggle-button:not(.is-disabled):active {
  --tb-fg: var(--wui-text-fill-color-secondary);
  --tb-bg: var(--wui-control-fill-color-tertiary);
  --tb-border: var(--wui-control-stroke-color-default);
}
.wui-toggle-button.is-checked:not(.is-disabled):active {
  /* CheckedPressed:TextOnAccentSecondary / AccentFillColorTertiary / ControlFillColorTransparent */
  --tb-fg: var(--wui-text-on-accent-fill-color-secondary);
  --tb-bg: var(--wui-accent-fill-color-tertiary);
  --tb-border: var(--wui-control-fill-color-transparent);
}
.wui-toggle-button.is-indeterminate:not(.is-disabled):active {
  --tb-fg: var(--wui-text-fill-color-secondary);
  --tb-bg: var(--wui-control-fill-color-tertiary);
  --tb-border: var(--wui-control-stroke-color-default);
}

/* Disabled / CheckedDisabled / IndeterminateDisabled */
.wui-toggle-button.is-disabled {
  --tb-fg: var(--wui-text-fill-color-disabled);
  --tb-bg: var(--wui-control-fill-color-disabled);
  --tb-border: var(--wui-control-stroke-color-default);
}
.wui-toggle-button.is-disabled.is-checked {
  /* CheckedDisabled:TextOnAccentDisabled / AccentFillColorDisabled / ControlFillColorTransparent */
  --tb-fg: var(--wui-text-on-accent-fill-color-disabled);
  --tb-bg: var(--wui-accent-fill-color-disabled);
  --tb-border: var(--wui-control-fill-color-transparent);
}
.wui-toggle-button.is-disabled.is-indeterminate {
  --tb-fg: var(--wui-text-fill-color-disabled);
  --tb-bg: var(--wui-control-fill-color-disabled);
  --tb-border: var(--wui-control-stroke-color-default);
}

/* CheckedNormal / IndeterminateNormal(须置于交互态之后,保证同优先级下三态色生效) */
.wui-toggle-button.is-checked {
  /* Checked:TextOnAccentPrimary / AccentFillColorDefault / AccentControlElevationBorderBrush(渐变,占位透明) */
  --tb-fg: var(--wui-text-on-accent-fill-color-primary);
  --tb-bg: var(--wui-accent-fill-color-default);
  --tb-border: var(--wui-control-fill-color-transparent);
}
.wui-toggle-button.is-indeterminate {
  --tb-fg: var(--wui-text-fill-color-primary);
  --tb-bg: var(--wui-control-fill-color-default);
  --tb-border: var(--wui-control-fill-color-transparent);
}

/* ======================================================================
 * 布局(对照 ControlTemplate:ContentPresenter 承载 Background/BorderBrush/
 * BorderThickness/CornerRadius/Padding):样式 Setter 同 Button ——
 * Padding=ButtonPadding(8,4,8,5)、ToggleButtonBorderThemeThickness=2、
 * HorizontalAlignment=Left、VerticalAlignment=Center。
 * ====================================================================== */
.wui-toggle-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  margin: 0;
  /* ButtonPadding="8,4,8,5"(XAML Thickness 顺序:左,上,右,下) */
  padding: 4px 8px 5px;
  font-family: var(--wui-content-control-theme-font-family);
  /* ControlContentThemeFontSize = 14px */
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  line-height: normal;
  color: var(--tb-fg);
  background: var(--tb-bg);
  border: 2px solid var(--tb-border);
  /* WinUI 3 默认 ControlCornerRadius = 4;无同名 token,取最近似的圆角 token(见 wiki 差异节) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  text-align: center;
  cursor: default;
  user-select: none;
  touch-action: manipulation;
  /* 背景色隐式过渡:源 ToggleButton_themeresources.xaml L199-201 在 ContentPresenter 上声明
     BackgroundTransition = BrushTransition Duration=0:0:0.083(83ms);源无缓动参数 → 平台线性
     (SharedTransitionAnimations.cpp L14-17)→ CSS linear。仅 background-color。 */
  transition: background-color 83ms linear;
}

.wui-toggle-button.is-disabled {
  cursor: default;
}

/* 系统焦点视觉:WinUI 双环(primary 外环 2px + secondary 内环 1px,
   FocusVisualMargin=-3)按双环实现 */
.wui-toggle-button:focus {
  outline: none;
}
.wui-toggle-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* ======================================================================
 * Reveal 变体(reveal prop,对照 G.xaml L15953 ToggleButtonRevealStyle):
 * 源 Reveal 变体只换 Background/BorderBrush(L15954 Foreground 仍用标准
 * ToggleButtonForeground* token,故此处不动 --tb-fg);12 个组合态逐一把
 * --tb-bg/--tb-border 切到 --wui-toggle-button-reveal-* token(theme.css)。
 * 光照层(::before 底板光 / ::after 边框光)在公共层 reveal.css。
 * ====================================================================== */
.wui-toggle-button--reveal {
  /* ToggleButtonRevealBorderThemeThickness = 2(G.xaml L1395)→ 边框光环厚度 */
  --wui-reveal-border-width: 2px;
  /* Normal / CheckedNormal / IndeterminateNormal */
  --tb-bg: var(--wui-toggle-button-reveal-background);
  --tb-border: var(--wui-toggle-button-reveal-border);
}
.wui-toggle-button--reveal.is-checked {
  --tb-bg: var(--wui-toggle-button-reveal-background-checked);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-checked);
}
.wui-toggle-button--reveal.is-indeterminate {
  --tb-bg: var(--wui-toggle-button-reveal-background-indeterminate);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-indeterminate);
}

/* PointerOver 系 */
.wui-toggle-button--reveal:not(.is-disabled):hover {
  --tb-bg: var(--wui-toggle-button-reveal-background-pointer-over);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-pointer-over);
}
.wui-toggle-button--reveal.is-checked:not(.is-disabled):hover {
  --tb-bg: var(--wui-toggle-button-reveal-background-checked-pointer-over);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-checked-pointer-over);
}
.wui-toggle-button--reveal.is-indeterminate:not(.is-disabled):hover {
  --tb-bg: var(--wui-toggle-button-reveal-background-indeterminate-pointer-over);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-indeterminate-pointer-over);
}

/* Pressed 系 */
.wui-toggle-button--reveal:not(.is-disabled):active {
  --tb-bg: var(--wui-toggle-button-reveal-background-pressed);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-pressed);
}
.wui-toggle-button--reveal.is-checked:not(.is-disabled):active {
  --tb-bg: var(--wui-toggle-button-reveal-background-checked-pressed);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-checked-pressed);
}
.wui-toggle-button--reveal.is-indeterminate:not(.is-disabled):active {
  --tb-bg: var(--wui-toggle-button-reveal-background-indeterminate-pressed);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-indeterminate-pressed);
}

/* Disabled 系 */
.wui-toggle-button--reveal.is-disabled {
  --tb-bg: var(--wui-toggle-button-reveal-background-disabled);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-disabled);
}
.wui-toggle-button--reveal.is-disabled.is-checked {
  --tb-bg: var(--wui-toggle-button-reveal-background-checked-disabled);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-checked-disabled);
}
.wui-toggle-button--reveal.is-disabled.is-indeterminate {
  --tb-bg: var(--wui-toggle-button-reveal-background-indeterminate-disabled);
  --tb-border: var(--wui-toggle-button-reveal-border-brush-indeterminate-disabled);
}
</style>
