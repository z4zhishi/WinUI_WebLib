<script setup lang="ts">
// WuiGridViewItem —— WinUI GridViewItem 的 Web 复刻(可被 GridView 自动承载,也可独立使用)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="GridViewItem" x:Key="GridViewItemRevealStyle">(L17835 起,默认项样式
//   即基于它,L22885)。它以 ListViewItemPresenter 承载,关键视觉:
//   - Normal/PointerOver/Pressed/Selected(+PointerOver/Pressed 组合)背景与前景,
//     颜色取 --wui-grid-view-item-* token(L817 起 / 暗色 L2712 起);
//   - Reveal 边框:RevealBorderThickness=1 + RevealBorderBrush(源 token 解析为透明 ——
//     WinUI 3 已退役 reveal 高光),此处保留 1px 揭示边框结构,enableReveal 时以
//     「跟随指针的径向渐变 1px 光环」近似 WinUI 2 的 reveal 边框(差异见 wiki);
//   - 选择勾选标记:CheckMode=Overlay —— 选中项左上角叠加圆形勾选标记,
//     勾字形色 CheckBrush = --wui-grid-view-item-check,圆底 CheckBoxBrush = --wui-grid-view-item-check-box;
//   - ContentMargin = TemplateBinding Padding(XAML Thickness 顺序:左,上,右,下)。
// 模型设计:无自身状态,selected/disabled 由父级(GridView)下发;click 上抛由 GridView
//   统一做选择逻辑(与 WinUI GridViewItem 的容器职责一致)。
import { computed } from 'vue'

// class/style 等透传属性统一由根元素 v-bind="$attrs" 承接。
defineOptions({ name: 'WuiGridViewItem', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 是否选中(WinUI IsSelected)。 */
    selected?: boolean
    /** 禁用(WinUI IsEnabled 的取反映射),对照 Disabled 视觉状态。 */
    disabled?: boolean
    /** 是否启用选择勾选标记(WinUI SelectionCheckMarkVisualEnabled,默认 true)。 */
    selectionCheckMarkVisualEnabled?: boolean
    /** 多选模式空勾选圈:未选中时也显示空心圆(WinUI Multiple 模式的呈现)。 */
    multiSelectHalo?: boolean
    /** 是否显示 reveal 揭示边框(悬浮时 1px 跟随指针光环,近似 WinUI 2 reveal)。 */
    enableReveal?: boolean
    /** 内容边距(WinUI ContentMargin / Padding,XAML Thickness:左,上,右,下)。 */
    contentMargin?: string
    /** 项外边距(WinUI Margin,默认取 RevealStyle 的 0,0,4,4;XAML Thickness)。 */
    margin?: string
  }>(),
  {
    selected: false,
    disabled: false,
    selectionCheckMarkVisualEnabled: true,
    multiSelectHalo: false,
    enableReveal: false,
    contentMargin: '0,0,0,0',
    margin: '0,0,4,4',
  },
)

// 显式声明 emits:父级 @click 监听改走 emit 转发,防止原生 click 重复触发。
const emit = defineEmits<{
  /** 单击项(转发原生 MouseEvent;禁用时不触发)。 */
  click: [event: MouseEvent]
}>()

/** XAML Thickness(左,上,右,下;1/2/4 值缩写)→ CSS margin(上 右 下 左)。 */
function thicknessToCss(thickness: string): string {
  const parts = thickness
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
  if (parts.length === 0) return '0'
  const toPx = (value: string): string => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? `${parsed}px` : value
  }
  const l = toPx(parts[0])
  const t = toPx(parts[1] ?? parts[0])
  const r = toPx(parts[2] ?? parts[0])
  const b = toPx(parts[3] ?? (parts[1] ?? parts[0]))
  return `${t} ${r} ${b} ${l}`
}

const contentMarginCss = computed(() => thicknessToCss(props.contentMargin))
const marginCss = computed(() => thicknessToCss(props.margin))

// reveal 光环:指针位置写入 CSS 变量,径向渐变跟随(仅 enableReveal 时挂监听)。
function onPointerMove(event: PointerEvent): void {
  if (!props.enableReveal) return
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--wui-reveal-x', `${event.clientX - rect.left}px`)
  el.style.setProperty('--wui-reveal-y', `${event.clientY - rect.top}px`)
}

function onClick(event: MouseEvent): void {
  if (props.disabled) return
  emit('click', event)
}
</script>

<template>
  <div
    class="wui-grid-view-item"
    :class="{
      'is-selected': selected,
      'is-disabled': disabled,
      'multi-halo': multiSelectHalo,
      'reveal-enabled': enableReveal,
    }"
    role="option"
    :aria-selected="selected ? 'true' : 'false'"
    :aria-disabled="disabled || undefined"
    :style="{ margin: marginCss }"
    v-bind="$attrs"
    @click="onClick"
    @pointermove="onPointerMove"
  >
    <!-- 揭示边框(RevealBorderThickness=1;源画刷为透明,enableReveal 时以光环近似) -->
    <span class="reveal-border" aria-hidden="true"></span>
    <!-- 选择勾选标记(CheckMode=Overlay:左上角圆形勾选) -->
    <span
      v-if="selectionCheckMarkVisualEnabled"
      class="check-mark"
      aria-hidden="true"
    >
      <svg viewBox="0 0 12 12" focusable="false">
        <path d="M2.5 6.5 L5 9 L9.5 3.5" />
      </svg>
    </span>
    <span class="content" :style="{ margin: contentMarginCss }">
      <slot />
    </span>
  </div>
</template>

<style scoped>
/* ======================================================================
 * 状态配色(对照 ListViewItemPresenter 各属性 + CommonStates):
 * Normal / PointerOver / Pressed / Selected / SelectedPointerOver / SelectedPressed
 * ====================================================================== */
.wui-grid-view-item {
  --gvi-bg: var(--wui-grid-view-item-background);
  --gvi-fg: var(--wui-grid-view-item-foreground);
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px; /* GridViewItemMinWidth */
  min-height: 44px; /* GridViewItemMinHeight */
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--gvi-fg);
  background: var(--gvi-bg);
  border-radius: 0;
  outline: none;
  /* 列表项文本不参与拖选(WinUI 项内容不可选中) */
  user-select: none;
  cursor: default;
}

.wui-grid-view-item:not(.is-disabled):hover {
  --gvi-bg: var(--wui-grid-view-item-background-pointer-over);
  --gvi-fg: var(--wui-grid-view-item-foreground-pointer-over);
}

.wui-grid-view-item:not(.is-disabled):active {
  --gvi-bg: var(--wui-grid-view-item-background-pressed);
}

.wui-grid-view-item.is-selected {
  --gvi-bg: var(--wui-grid-view-item-background-selected);
  --gvi-fg: var(--wui-grid-view-item-foreground-selected);
}

.wui-grid-view-item.is-selected:not(.is-disabled):hover {
  --gvi-bg: var(--wui-grid-view-item-background-selected-pointer-over);
}

.wui-grid-view-item.is-selected:not(.is-disabled):active {
  --gvi-bg: var(--wui-grid-view-item-background-selected-pressed);
}

/* Disabled(DisabledStates:RevealBorderThickness→0 + ListViewItemDisabledThemeOpacity) */
.wui-grid-view-item.is-disabled {
  opacity: 0.55; /* ListViewItemDisabledThemeOpacity,未提取 token,wiki 记录 */
  cursor: default;
}

/* 焦点(FocusVisualMargin=-2 → primary [0,2] 在元素外贴缘、secondary [0,1] 在元素内,
   两环贴边缘相邻 = 系统双环;ConfigureFocusElement Inner=Outer 内缩 primary 厚度) */
.wui-grid-view-item:focus-visible {
  outline: 2px solid var(--wui-grid-view-item-focus-visual-primary);
  outline-offset: 0;
  box-shadow: inset 0 0 0 1px var(--wui-grid-view-item-focus-visual-secondary);
}

/* 选中项焦点框反色(GridViewItemPresenter FocusBorderBrush=GridViewItemFocusBorderBrush
   =SystemControlForegroundAltHighBrush / FocusSecondaryBorderBrush=BaseHigh) */
.wui-grid-view-item.is-selected:focus-visible {
  outline-color: var(--wui-grid-view-item-focus-border);
}

/* —— 揭示边框(RevealBorderThickness=1)—— */
.reveal-border {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 1px solid var(--wui-grid-view-item-reveal-border);
  pointer-events: none;
}

/* enableReveal:悬浮时以跟随指针的径向渐变填充 1px 环(mask 合成),近似 reveal 边框高光 */
.reveal-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  box-sizing: border-box;
  padding: 1px;
  background: radial-gradient(
    96px circle at var(--wui-reveal-x, 50%) var(--wui-reveal-y, 50%),
    color-mix(in srgb, var(--wui-grid-view-item-focus-border) 60%, transparent),
    transparent 70%
  );
  opacity: 0;
  transition: opacity var(--wui-duration-fast) var(--wui-easing-standard);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.wui-grid-view-item.reveal-enabled:not(.is-disabled):hover .reveal-border::before {
  opacity: 1;
}

/* —— 选择勾选标记(Overlay:左上角圆 + 勾字形)—— */
.check-mark {
  position: absolute;
  top: 6px;
  left: 6px;
  box-sizing: border-box;
  display: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--wui-grid-view-item-check-box);
  border: 1px solid var(--wui-grid-view-item-check-box);
  border-radius: 50%;
  pointer-events: none;
}

.check-mark svg {
  width: 12px;
  height: 12px;
}

.check-mark svg path {
  fill: none;
  stroke: var(--wui-grid-view-item-check);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 选中:显示实心勾选圈 */
.wui-grid-view-item.is-selected .check-mark {
  display: inline-flex;
}

/* 多选(Multiple 模式):未选中项显示空心圈 */
.wui-grid-view-item.multi-halo:not(.is-selected) .check-mark {
  display: inline-flex;
  background: transparent;
  border-color: var(--wui-grid-view-item-check);
}

/* —— 内容(ContentMargin = TemplateBinding Padding)—— */
.content {
  display: block;
  min-width: 0;
}
</style>
