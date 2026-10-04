<script setup lang="ts">
// WuiCheckBox —— WinUI CheckBox 的 Web 复刻。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="CheckBox">(L6743 起):20x20 勾选框 + 勾/减字形 + 左对齐内容,
//   CombinedStates(Unchecked/Checked/Indeterminate × Normal/PointerOver/Pressed/Disabled),
//   PL9:状态色重定向到 PL2 Fluent 画刷族(--wui-text-fill-* / --wui-control-*-fill-* /
//   --wui-accent-fill-color-* / --wui-text-on-accent-fill-color-*;权威键见矩阵 §1.5),
//   几何与 266.67ms 字形描绘动效不变。
// 模型设计:checked 以 boolean | 'indeterminate' 哨兵值对应 WinUI IsChecked(Nullable<bool>),
//   null → 'indeterminate';IsThreeState 仅约束用户点击是否经过不确定态。详见 wiki/controls/CheckBox.md。
import { computed } from 'vue'

// class/style 等透传属性统一由根元素 v-bind="$attrs" 承接(避免落到 button 之外的继承位)。
defineOptions({ name: 'WuiCheckBox', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 内容文本(WinUI Content;默认 slot 兜底,slot 优先)。 */
    content?: string
    /** 三态:允许用户点击进入不确定态(WinUI IsThreeState)。 */
    isThreeState?: boolean
    /** 禁用(WinUI IsEnabled 的取反映射,便于沿用原生 disabled 语义)。 */
    disabled?: boolean
  }>(),
  { content: '', isThreeState: false, disabled: false },
)

// 显式声明 emits(含 click):父级 @click 监听改走 emit 转发,防止原生 click 重复触发。
const emit = defineEmits<{
  /** 点击勾选框时触发(转发原生 MouseEvent;禁用时不触发)。 */
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

// WAI-ARIA:checkbox 的第三态用 aria-checked="mixed" 表达(对应 WinUI IsChecked = null)。
const ariaChecked = computed(() =>
  isIndeterminate.value ? 'mixed' : isChecked.value ? 'true' : 'false',
)

/**
 * 点击环(对照 ToggleButton::OnToggleImpl,CheckBox 未覆写,L249 起):
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
  // 同步触发 Checked/Unchecked/Indeterminate,后由 Generated::OnClick() 触发 Click 路由事件。
  if (next !== checked.value) {
    checked.value = next
    if (next === true) emit('checked')
    else if (next === false) emit('unchecked')
    else emit('indeterminate')
  }
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    class="wui-check-box"
    :class="{ 'is-checked': isChecked, 'is-indeterminate': isIndeterminate, 'is-disabled': disabled }"
    role="checkbox"
    :aria-checked="ariaChecked"
    :disabled="disabled"
    v-bind="$attrs"
    @click="onToggle"
  >
    <!-- 勾选框图形区:对应模板中 VerticalAlignment=Top Height=32 的 32px 高子网格 -->
    <span class="check-area" aria-hidden="true">
      <span class="check-box"></span>
      <!-- 勾/减字形:源 CheckGlyph 为 controls:AnimatedIcon + AnimatedAcceptVisualSource
           (NormalOff 默认 / NormalOn 勾选 / NormalIndeterminate 三态;资产时长 266.67ms,
           c_durationTicks=26666666)。字形本身以内联 SVG 等形复刻(勾 E001 / 减 E73C),
           颜色取 --wui-text-on-accent-fill-color-* token(PL9);绘制过渡见样式注。 -->
      <svg class="glyph glyph-check" viewBox="0 0 20 20" focusable="false">
        <path d="M4.5 10.5 L8.5 14.5 L15.5 6.5" />
      </svg>
      <svg class="glyph glyph-minus" viewBox="0 0 20 20" focusable="false">
        <path d="M4.5 10 L15.5 10" />
      </svg>
    </span>
    <span class="content"><slot>{{ content }}</slot></span>
  </button>
</template>

<style scoped>
/* ======================================================================
 * 组合态配色(CombinedStates):根元素按三态 + 交互态写入中间变量,
 * 后代元素统一消费,对应 generic.xaml 各 VisualState 的 ObjectAnimation。
 * ====================================================================== */
.wui-check-box {
  /* UncheckedNormal —— PL9:状态色重定向到 PL2 Fluent 画刷族
     (权威键见 docs/pages/color/control-brush-matrix.md §1.5) */
  --cb-fg: var(--wui-text-fill-color-primary); /* CheckBoxForegroundUnchecked = TextFillColorPrimaryBrush */
  --cb-stroke: var(--wui-control-strong-stroke-color-default); /* CheckBoxCheckBackgroundStrokeUnchecked = ControlStrongStrokeColorDefaultBrush */
  --cb-fill: var(--wui-control-alt-fill-color-secondary); /* CheckBoxCheckBackgroundFillUnchecked = ControlAltFillColorSecondaryBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-primary); /* CheckBoxCheckGlyphForegroundUnchecked = TextOnAccentFillColorPrimaryBrush */
}

/* UncheckedPointerOver / CheckedPointerOver / IndeterminatePointerOver */
.wui-check-box:not(.is-disabled):hover {
  --cb-fg: var(--wui-text-fill-color-primary);
  --cb-stroke: var(--wui-control-strong-stroke-color-default); /* StrokeUncheckedPointerOver = ControlStrongStrokeColorDefaultBrush */
  --cb-fill: var(--wui-control-alt-fill-color-tertiary); /* FillUncheckedPointerOver = ControlAltFillColorTertiaryBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-primary);
}
.wui-check-box.is-checked:not(.is-disabled):hover {
  --cb-fg: var(--wui-text-fill-color-primary);
  --cb-stroke: var(--wui-accent-fill-color-secondary); /* StrokeCheckedPointerOver = AccentFillColorSecondaryBrush */
  --cb-fill: var(--wui-accent-fill-color-secondary); /* FillCheckedPointerOver = AccentFillColorSecondaryBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-primary);
}
.wui-check-box.is-indeterminate:not(.is-disabled):hover {
  --cb-fg: var(--wui-text-fill-color-primary);
  --cb-stroke: var(--wui-accent-fill-color-secondary); /* StrokeIndeterminatePointerOver = AccentFillColorSecondaryBrush */
  --cb-fill: var(--wui-accent-fill-color-secondary); /* FillIndeterminatePointerOver = AccentFillColorSecondaryBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-primary);
}

/* UncheckedPressed / CheckedPressed / IndeterminatePressed */
.wui-check-box:not(.is-disabled):active {
  --cb-fg: var(--wui-text-fill-color-primary);
  --cb-stroke: var(--wui-control-strong-stroke-color-disabled); /* StrokeUncheckedPressed = ControlStrongStrokeColorDisabledBrush */
  --cb-fill: var(--wui-control-alt-fill-color-quarternary); /* FillUncheckedPressed = ControlAltFillColorQuarternaryBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-primary);
}
.wui-check-box.is-checked:not(.is-disabled):active {
  --cb-fg: var(--wui-text-fill-color-primary);
  --cb-stroke: var(--wui-accent-fill-color-tertiary); /* StrokeCheckedPressed = AccentFillColorTertiaryBrush */
  --cb-fill: var(--wui-accent-fill-color-tertiary); /* FillCheckedPressed = AccentFillColorTertiaryBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-secondary); /* GlyphForegroundCheckedPressed = TextOnAccentFillColorSecondaryBrush */
}
.wui-check-box.is-indeterminate:not(.is-disabled):active {
  --cb-fg: var(--wui-text-fill-color-primary);
  --cb-stroke: var(--wui-accent-fill-color-tertiary); /* StrokeIndeterminatePressed = AccentFillColorTertiaryBrush */
  --cb-fill: var(--wui-accent-fill-color-tertiary); /* FillIndeterminatePressed = AccentFillColorTertiaryBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-secondary); /* GlyphForegroundIndeterminatePressed = TextOnAccentFillColorSecondaryBrush */
}

/* UncheckedDisabled / CheckedDisabled / IndeterminateDisabled */
.wui-check-box.is-disabled {
  --cb-fg: var(--wui-text-fill-color-disabled); /* ForegroundUncheckedDisabled = TextFillColorDisabledBrush */
  --cb-stroke: var(--wui-control-strong-stroke-color-disabled);
  --cb-fill: var(--wui-control-alt-fill-color-disabled); /* FillUncheckedDisabled = ControlAltFillColorDisabledBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-disabled); /* GlyphForegroundUncheckedDisabled = TextOnAccentFillColorDisabledBrush */
}
.wui-check-box.is-disabled.is-checked {
  --cb-fg: var(--wui-text-fill-color-disabled);
  --cb-stroke: var(--wui-control-strong-stroke-color-disabled); /* StrokeCheckedDisabled = ControlStrongStrokeColorDisabledBrush */
  --cb-fill: var(--wui-accent-fill-color-disabled); /* FillCheckedDisabled = AccentFillColorDisabledBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-disabled);
}
.wui-check-box.is-disabled.is-indeterminate {
  --cb-fg: var(--wui-text-fill-color-disabled);
  --cb-stroke: var(--wui-control-strong-stroke-color-disabled); /* StrokeIndeterminateDisabled = ControlStrongStrokeColorDisabledBrush */
  --cb-fill: var(--wui-accent-fill-color-disabled); /* FillIndeterminateDisabled = AccentFillColorDisabledBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-disabled);
}

/* CheckedNormal / IndeterminateNormal(须置于交互态之后,保证同优先级下三态色生效) */
.wui-check-box.is-checked {
  --cb-fg: var(--wui-text-fill-color-primary); /* ForegroundChecked = TextFillColorPrimaryBrush */
  --cb-stroke: var(--wui-accent-fill-color-default); /* StrokeChecked = AccentFillColorDefaultBrush */
  --cb-fill: var(--wui-accent-fill-color-default); /* FillChecked = AccentFillColorDefaultBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-primary);
}
.wui-check-box.is-indeterminate {
  --cb-fg: var(--wui-text-fill-color-primary); /* ForegroundIndeterminate = TextFillColorPrimaryBrush */
  --cb-stroke: var(--wui-accent-fill-color-default); /* StrokeIndeterminate = AccentFillColorDefaultBrush */
  --cb-fill: var(--wui-accent-fill-color-default); /* FillIndeterminate = AccentFillColorDefaultBrush */
  --cb-glyph: var(--wui-text-on-accent-fill-color-primary);
}

/* ======================================================================
 * 布局(对照 ControlTemplate):MinWidth=120、MinHeight=32、内容 Padding=8,5,0,0
 * ====================================================================== */
.wui-check-box {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
  min-width: 120px;
  min-height: 32px;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--cb-fg);
  /* RootGrid 的 Background/BorderBrush:两套主题各态 token 均为透明,按 unchecked 态静态绑定。
     边框厚度:源 RootGrid 为 BorderThickness="{TemplateBinding BorderThickness}",而
     <Style TargetType="CheckBox">(generic.xaml L6743 段)**未设置** BorderThickness →
     Control 默认 0,即控件盒本身没有边框(盒高 = 模板 32px 行 = MinHeight 32)。
     故此处厚度必须为 0:写入 1px 会把 32px 内容顶到 34px,并使矩形/文字整体 +1px(VR-B3 §1.2)。 */
  background: var(--wui-subtle-fill-color-transparent); /* CheckBoxBackgroundUnchecked = SubtleFillColorTransparentBrush */
  border: 0 solid var(--wui-subtle-fill-color-transparent); /* CheckBoxBorderBrushUnchecked = SubtleFillColorTransparentBrush */
  border-radius: 0;
  text-align: left;
  cursor: pointer;
}

.wui-check-box.is-disabled {
  cursor: default;
}

/* 焦点(WinUI UseSystemFocusVisuals + FocusVisualMargin=-7,-3,-7,-3):
   以 outline(primary 外环 2px)+ box-shadow(secondary 内环 1px)实现系统双环,差异见 wiki */
.wui-check-box:focus {
  outline: none;
}
.wui-check-box:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* —— 勾选框图形区(模板:Grid VerticalAlignment=Top Height=32,列宽 20)—— */
.check-area {
  position: relative;
  flex: none;
  width: 20px;
  height: 32px;
}

/* NormalRectangle:20x20;边框厚度取 CheckBoxBorderThemeThickness=2
   (该 x:Double 未提取为 token,硬编码并在 wiki 记录;勾选态描边色本身透明,厚度差异不可见) */
.check-box {
  position: absolute;
  top: 6px;
  left: 0;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  background: var(--cb-fill);
  border: 2px solid var(--cb-stroke);
}

/* CheckGlyph(源 controls:AnimatedIcon + AnimatedAcceptVisualSource;FontIcon 降级字形
   E001/E73C,FontSize=20):
   矩形内垂直居中(显式尺寸 + Stretch 对齐在 XAML 中表现为居中),勾选/不确定态淡入。
   动效复刻:源 AnimatedIcon 状态 NormalOff → NormalOn / NormalIndeterminate 的迁移由
   LottieGen 编译资产驱动,资产总时长 266.67ms(AnimatedAcceptVisualSource.cpp
   c_durationTicks=26666666,1 tick=100ns);原始 .json 不在 CK 快照内,Web 以
   stroke-dashoffset 描绘(勾 / 减)+ opacity 交叉淡入复刻,时长严格取 266.67ms。
   缓动:源过渡曲线烘焙在 Lottie 关键帧内,CK 无 XAML KeySpline 可提取,故取 linear
   (见 wiki/controls/CheckBox.md 差异节)。 */
.glyph {
  position: absolute;
  top: 6px;
  left: 0;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  padding: 2px;
  color: var(--cb-glyph);
  opacity: 0;
  transition: opacity 266.67ms linear;
}
.glyph path {
  fill: none;
  stroke: currentcolor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  /* 描绘过渡:虚线全隐 → 全显(dashoffset 归零) */
  transition: stroke-dashoffset 266.67ms linear;
}
/* 路径长度实测:勾折线 5.657+10.630=16.287 ≈ 16.3;减号 11 */
.glyph-check path {
  stroke-dasharray: 16.3;
  stroke-dashoffset: 16.3;
}
.glyph-minus path {
  stroke-dasharray: 11;
  stroke-dashoffset: 11;
}
.wui-check-box.is-checked .glyph-check,
.wui-check-box.is-indeterminate .glyph-minus {
  opacity: 1;
}
.wui-check-box.is-checked .glyph-check path,
.wui-check-box.is-indeterminate .glyph-minus path {
  stroke-dashoffset: 0;
}

/* ContentPresenter:Margin=Padding=8,5,0,0(XAML Thickness 顺序:左,上,右,下) */
.content {
  align-self: flex-start;
  margin: 5px 0 0 8px;
  line-height: normal;
}
</style>
