<script setup lang="ts">
// WuiItemContainer —— WinUI 3 ItemContainer 的 Web 复刻(可被 ItemsView 自动承载,也可独立使用)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 无 ItemContainer 段
//   (ItemContainer 是 WinUI 3 控件,该快照为 WinUI 2/dxaml 源);视觉按 WinUI 3 默认样式
//   对照最近似 token 复刻,并在 wiki/controls/ItemsView.md「与 WinUI 的差异」记录:
//   - ControlCornerRadius=4 → --wui-hyperlink-focus-rect-corner-radius(站内 4px token);
//   - Normal 透明背景 + 1px 透明边框结构;PointerOver 出现 SubtleFillColorSecondary 背景
//     → --wui-grid-view-item-background-pointer-over(#00000019,与 WinUI 3 同值)与 1px
//     「悬停揭示边框」→ --wui-system-control-background-base-low;
//   - Selected:Subtle 系背景 → --wui-list-view-item-reveal-background-selected(accent-light-3,
//     WinUI 3 现代选择的淡 accent 观感)、边框 → --wui-system-accent-color;
//   - Multiple 模式勾选圈:空心圈(未选)/ accent 实心圈 + 白勾(已选),圈径 20px 对照
//     GridViewItem 的 Overlay 勾选标记;白勾色取 --wui-list-view-item-check-theme(#ffffff token);
//   - Disabled:ListViewItemDisabledThemeOpacity 等效 0.55;Focus:系统双层焦点框近似
//     (复用 --wui-grid-view-item-focus-visual-primary/-secondary,与站内其他项容器一致)。
// 模型设计:无自身状态,selected/disabled/multiSelect 由父级(ItemsView)下发;click 上抛由
//   父级统一做选择逻辑(与 WinUI ItemContainer 的容器职责一致)。
import { computed } from 'vue'

// class/style 等透传属性统一由根元素 v-bind="$attrs" 承接。
defineOptions({ name: 'WuiItemContainer', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 是否选中(WinUI IsSelected)。 */
    selected?: boolean
    /** 禁用(WinUI IsEnabled 的取反映射),对照 Disabled 视觉状态。 */
    disabled?: boolean
    /** 多选模式(WinUI ItemContainer.SelectionMode=Multiple):显示勾选圈,未选为空心圈。 */
    multiSelect?: boolean
    /** 是否渲染勾选圈(WinUI SelectionCheckMarkVisualEnabled,默认 true)。 */
    selectionCheckMarkVisualEnabled?: boolean
    /** 内容边距(WinUI ContentMargin,XAML Thickness:左,上,右,下)。 */
    contentMargin?: string
    /** 项外边距(WinUI Margin,默认 0,0,0,0;XAML Thickness)。 */
    margin?: string
  }>(),
  {
    selected: false,
    disabled: false,
    multiSelect: false,
    selectionCheckMarkVisualEnabled: true,
    contentMargin: '0,0,0,0',
    margin: '0,0,0,0',
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
const showCheck = computed(() => props.multiSelect && props.selectionCheckMarkVisualEnabled)

function onClick(event: MouseEvent): void {
  if (props.disabled) return
  emit('click', event)
}
</script>

<template>
  <div
    class="wui-item-container"
    :class="{ 'is-selected': selected, 'is-disabled': disabled, 'multi-halo': showCheck }"
    role="option"
    :aria-selected="selected ? 'true' : 'false'"
    :aria-disabled="disabled || undefined"
    :style="{ margin: marginCss }"
    v-bind="$attrs"
    @click="onClick"
  >
    <!-- 多选勾选圈(Multiple:未选空心圈 / 已选 accent 实心圈 + 白勾;占位列,内容随之右移) -->
    <span v-if="showCheck" class="check-mark" aria-hidden="true">
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
 * 状态配色(WinUI 3 ItemContainer 各视觉状态 → 最近似 --wui-* token,见头注):
 * Normal / PointerOver / Pressed / Selected(+PointerOver / Pressed 组合)
 * ====================================================================== */
.wui-item-container {
  --ic-bg: transparent;
  --ic-border: transparent;
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 32px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: var(--ic-bg);
  border: 1px solid var(--ic-border);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius=4 */
  outline: none;
  cursor: default;
}

.wui-item-container:not(.is-disabled):hover {
  --ic-bg: var(--wui-grid-view-item-background-pointer-over); /* SubtleFillColorSecondary 同值 */
  --ic-border: var(--wui-system-control-background-base-low); /* 悬停揭示边框 */
}

.wui-item-container:not(.is-disabled):active {
  --ic-bg: var(--wui-grid-view-item-background-pressed); /* SubtleFillColorTertiary 同值 */
}

.wui-item-container.is-selected {
  --ic-bg: var(--wui-list-view-item-reveal-background-selected); /* 淡 accent 选择背景 */
  --ic-border: var(--wui-system-accent-color);
}

.wui-item-container.is-selected:not(.is-disabled):hover {
  --ic-bg: var(--wui-list-view-item-reveal-background-selected-pointer-over);
}

.wui-item-container.is-selected:not(.is-disabled):active {
  --ic-bg: var(--wui-list-view-item-reveal-background-selected-pressed);
}

/* Disabled(ListViewItemDisabledThemeOpacity 等效;未提取 token,wiki 记录) */
.wui-item-container.is-disabled {
  opacity: 0.55;
  cursor: default;
}

/* Focus(系统双层焦点框近似,与站内项容器一致) */
.wui-item-container:focus-visible {
  outline: 2px solid var(--wui-grid-view-item-focus-visual-primary);
  outline-offset: -2px;
  box-shadow: inset 0 0 0 3px var(--wui-grid-view-item-focus-visual-secondary);
}

/* —— 多选勾选圈(Multiple 模式)—— */
.check-mark {
  flex: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: 1px solid var(--wui-grid-view-item-check);
  border-radius: 50%;
  pointer-events: none;
}

.check-mark svg {
  width: 12px;
  height: 12px;
}

.check-mark svg path {
  fill: none;
  stroke: var(--wui-list-view-item-check-theme); /* 白勾(#ffffff token) */
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 已选:accent 实心圈 */
.wui-item-container.is-selected .check-mark {
  background: var(--wui-system-accent-color);
  border-color: var(--wui-system-accent-color);
}

/* —— 内容 —— */
.content {
  display: block;
  flex: 1;
  min-width: 0;
}
</style>
