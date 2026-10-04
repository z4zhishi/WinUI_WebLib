<script setup lang="ts">
// WuiItemContainer —— WinUI 3 ItemContainer 的 Web 复刻(可被 ItemsView 自动承载,也可独立使用)。
// 视觉规格(逐键对照 CK/WinUI-Reference/controls/dev/ 在册源):
//   - ItemContainer.xaml:模板 = PART_ContainerRoot(Grid,CornerRadius=ControlCornerRadius=4)
//     + PART_SelectionVisual(3px accent 外环叠加层,BorderThickness=3,Opacity 0→选中 1,
//     Disabled 折叠)+ PART_CommonVisual(1px 描边 Rectangle 叠加层,选中态内缩
//     ItemContainerSelectedInnerMargin=2、描边 ControlSolidFillColorDefault)+ PART_SelectionCheckbox
//     (右上角 CheckBox,Margin 4,-2 + Right/Top 对齐,20×20,CornerRadius=4);
//   - ItemContainer_themeresources.xaml + CommonStyles/Common_themeresources_any.xaml:
//     Normal/Selected 填充 = SubtleFillColorTransparent(透明),PointerOver = SubtleFillColorSecondary
//     (#09000000/#0FFFFFFF),Pressed = SubtleFillColorTertiary(#06000000/#0AFFFFFF),悬停/按压描边
//     一律透明(ItemContainerPointerOverBorderBrush = SubtleFillColorTransparentBrush);
//     选中外环 = AccentFillColorDefaultBrush(浅 = SystemAccentColorDark1,深 = SystemAccentColorLight2),
//     选中内描边 = ControlSolidFillColorDefault(#FFFFFF/#454545);
//     Disabled = ItemContainerDisabledOpacity = 0.3(整项 Opacity);
//   - CheckBox 模板(CheckBox_themeresources.xaml + ItemContainerSelectionCheckboxStyle):
//     未选底色 = ItemContainerCheckboxBackgroundUnchecked = ControlOnImageFillColorDefault
//     (#C9FFFFFF/#B31C1C1C),描边 = CheckBoxCheckBackgroundStrokeUnchecked =
//     ControlStrongStrokeColorDefault(#72000000/#8BFFFFFF)1px;勾选字形(AnimatedAcceptVisualSource
//     NormalOff/NormalOn)未选不显示,已选 = CheckBoxCheckBackgroundFill/StrokeChecked =
//     AccentFillColorDefault 底 + CheckBoxCheckGlyphForegroundChecked =
//     TextOnAccentFillColorPrimary(#FFFFFF/#000000)字形。
//   - 上述源值全部指向 Fluent 画刷(Subtle*/ControlSolid*/ControlOnImage*/Accent*/TextOnAccent*),
//     PL2 已在 theme.css 落地同名 token(--wui-subtle-fill-color-*、--wui-control-solid-fill-color-default、
//     --wui-control-on-image-fill-color-default、--wui-control-strong-stroke-color-default、
//     --wui-accent-fill-color-default、--wui-text-on-accent-fill-color-primary),组件内直接消费,
//     浅/深两主题随 token 自动切换(原深色覆盖块已移除)。
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
    /** 多选模式(WinUI ItemContainer.SelectionMode=Multiple):右上角显示勾选框。 */
    multiSelect?: boolean
    /** 是否渲染勾选框(WinUI SelectionCheckMarkVisualEnabled,默认 true)。 */
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
    <!-- 多选勾选框(PART_SelectionCheckbox,右上角悬浮;未选无勾选字形,已选 accent 底 + 对勾) -->
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
 * 状态配色(PART_ContainerRoot Background,随 CombinedStates 变):
 * Normal / Selected = ItemContainerBackground/ItemContainerSelectedBackground = SubtleFillColorTransparent;
 * PointerOver = SubtleFillColorSecondary;Pressed = SubtleFillColorTertiary(选中组合同值)。
 * theme.css 未生成 Subtle 系 / ControlSolid 系 / ControlOnImage 系 / ControlStrongStroke 系 design-layer
 * token,值按 Common_themeresources_any.xaml 源值在组件内承载(浅/深两套)。
 * ====================================================================== */
.wui-item-container {
  /* 权威(controls/dev/ItemContainer/ItemContainer_themeresources.xaml L5-19 / L57-71;
     ItemContainer.xaml):各键全部指向 Fluent 画刷,本站 PL2 已落地对应 token,
     浅/深两主题自动切换(故不再需要深色覆盖块):
       ItemContainerBackground / SelectedBackground = SubtleFillColorTransparentBrush
       PointerOver = SubtleFillColorSecondaryBrush;Pressed = SubtleFillColorTertiaryBrush
       SelectionVisual 外环 = AccentFillColorDefaultBrush
       选中内描边 = ControlSolidFillColorDefaultBrush
       勾选框未选底 = ControlOnImageFillColorDefaultBrush;描边 = ControlStrongStrokeColorDefaultBrush
       勾选字形 = TextOnAccentFillColorPrimaryBrush */
  --ic-subtle-secondary: var(--wui-subtle-fill-color-secondary);
  --ic-subtle-tertiary: var(--wui-subtle-fill-color-tertiary);
  --ic-solid-fill: var(--wui-control-solid-fill-color-default);
  --ic-accent-fill: var(--wui-accent-fill-color-default);
  --ic-check-glyph: var(--wui-text-on-accent-fill-color-primary);
  --ic-checkbox-bg: var(--wui-control-on-image-fill-color-default);
  --ic-checkbox-stroke: var(--wui-control-strong-stroke-color-default);

  --ic-bg: var(--wui-subtle-fill-color-transparent); /* ItemContainerBackground */
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 32px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  /* 内容文本 = DefaultTextForegroundThemeBrush = TextFillColorPrimaryBrush
     (ItemContainer 模板不设 Foreground,继承应用默认文本色) */
  color: var(--wui-text-fill-color-primary);
  background: var(--ic-bg);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* CornerRadius = ControlCornerRadius(4) */
  outline: none;
  cursor: default;
}

/* PART_CommonVisual(1px 描边叠加层,IsHitTestVisible=False):
   StrokeThickness = ItemContainerSelectedInnerThickness = 1;未选/悬停/按压描边一律透明
   (ItemContainerBorderBrush/PointerOverBorderBrush/PressedBorderBrush = SubtleFillColorTransparent) */
.wui-item-container::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid transparent;
  border-radius: inherit;
  pointer-events: none;
}

/* PART_SelectionVisual(3px accent 外环叠加层,IsHitTestVisible=False,Opacity=0):
   BorderThickness=3,CornerRadius 同容器;选中态 Opacity 置 1 */
.wui-item-container::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 3px solid var(--ic-accent-fill); /* ItemContainerSelectionVisualBackground */
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
}

/* UnselectedPointerOver / SelectedPointerOver:填充 = SubtleFillColorSecondary,描边不变(透明) */
.wui-item-container:not(.is-disabled):hover {
  --ic-bg: var(--ic-subtle-secondary);
}

/* UnselectedPressed / SelectedPressed:填充 = SubtleFillColorTertiary */
.wui-item-container:not(.is-disabled):active {
  --ic-bg: var(--ic-subtle-tertiary);
}

/* SelectedNormal:填充 = ItemContainerSelectedBackground = SubtleFillColorTransparent(透明底);
   PART_CommonVisual 内缩 ItemContainerSelectedInnerMargin = 2 并描边 ControlSolidFillColorDefault */
.wui-item-container.is-selected::before {
  inset: 2px;
  border-color: var(--ic-solid-fill);
}

/* SelectedNormal:PART_SelectionVisual Opacity 0→1 Duration="0"(ItemContainer.xaml L36-37,
   瞬时)—— 无 transition,选中即现(audit A12 前半:瞬时按源) */
.wui-item-container.is-selected::after {
  opacity: 1;
}

/* SelectedPointerOver / SelectedPressed:PART_SelectionVisual Opacity →1
   SplineDoubleKeyFrame @ControlFastAnimationDuration(167ms) KeySpline 0,0,0,1
   (ItemContainer.xaml L53-55 / L74-96)—— transition 声明在目标态规则,仅悬停/按压
   路径上的选中淡入走 167ms,普通选中保持瞬时(audit A12) */
.wui-item-container.is-selected:not(.is-disabled):hover::after,
.wui-item-container.is-selected:not(.is-disabled):active::after {
  opacity: 1;
  transition: opacity 167ms cubic-bezier(0, 0, 0, 1);
}

/* DisabledStates:PART_ContainerRoot Opacity = ItemContainerDisabledOpacity = 0.3
   SplineDoubleKeyFrame @167ms KeySpline 0,0,0,1(ItemContainer.xaml L106);
   且 PART_SelectionVisual Visibility=Collapsed(外环隐藏,瞬时)。
   过渡仅声明在 Disabled 目标态:恢复启用回瞬时(源 Enabled 态无 Storyboard) */
.wui-item-container.is-disabled {
  opacity: 0.3;
  transition: opacity 167ms cubic-bezier(0, 0, 0, 1);
  cursor: default;
}

.wui-item-container.is-disabled.is-selected::after {
  display: none;
}

/* Focus(ItemsView.xaml:UseSystemFocusVisuals=True,无 FocusVisualMargin → 0:
   两环全在元素内 primary [0,2] + secondary [2,3] = 系统双环 flush 形) */
.wui-item-container:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

/* —— PART_SelectionCheckbox(Multiple 模式;模板见 ItemContainerSelectionCheckboxStyle)—— */
.check-mark {
  position: absolute;
  top: -2px; /* ItemContainerCheckboxMargin Top = -2 */
  right: 0; /* HorizontalAlignment = Right(Left margin 4 仅 Right 对齐下不参与) */
  z-index: 1; /* 模板序:CheckBox 画在 SelectionVisual/CommonVisual 之上 */
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px; /* CheckBoxSize */
  height: 20px;
  background: var(--ic-checkbox-bg); /* ItemContainerCheckboxBackgroundUnchecked */
  border: 1px solid var(--ic-checkbox-stroke); /* CheckBoxBorderThickness=1,Unchecked 描边 */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* CheckBox 模板 CornerRadius=ControlCornerRadius(4) */
  pointer-events: none; /* IsHitTestVisible=False */
}

/* CheckGlyph(源 controls:AnimatedIcon + AnimatedAcceptVisualSource;
   State=NormalOff 未选态不绘制勾选字形,CheckedNormal → NormalOn 描绘勾)。
   动效复刻:资产总时长 266.67ms(c_durationTicks=26666666,1 tick=100ns);
   原始 .json 不在 CK 快照内,Web 以 stroke-dashoffset 描绘 + opacity 淡入复刻,
   时长严格取 266.67ms(见 wiki/controls/ItemsView.md 差异节)。 */
.check-mark svg {
  width: 12px;
  height: 12px;
  opacity: 0;
  transition: opacity 266.67ms linear;
}

.check-mark svg path {
  fill: none;
  stroke: var(--ic-check-glyph); /* CheckBoxCheckGlyphForegroundChecked = TextOnAccentFillColorPrimary */
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  /* 勾折线路径长度实测 ≈ 10.64(源 SVG viewBox 12×12:M2.5 6.5 L5 9 L9.5 3.5) */
  stroke-dasharray: 10.7;
  stroke-dashoffset: 10.7;
  transition: stroke-dashoffset 266.67ms linear;
}

/* CheckedNormal:底/描边 = CheckBoxCheckBackgroundFill/StrokeChecked = AccentFillColorDefault,
   字形 State=NormalOn 描绘并显示 */
.wui-item-container.is-selected .check-mark {
  background: var(--ic-accent-fill);
  border-color: var(--ic-accent-fill);
}

.wui-item-container.is-selected .check-mark svg {
  opacity: 1;
}

.wui-item-container.is-selected .check-mark svg path {
  stroke-dashoffset: 0;
}

/* —— 内容 —— */
.content {
  display: block;
  flex: 1;
  min-width: 0;
}
</style>
