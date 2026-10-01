<script setup lang="ts">
// WuiCheckBox —— WinUI CheckBox 的 Web 复刻。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="CheckBox">(L6743 起):20x20 勾选框 + 勾/减字形 + 左对齐内容,
//   CombinedStates(Unchecked/Checked/Indeterminate × Normal/PointerOver/Pressed/Disabled),
//   颜色一律取 theme.css 的 --wui-check-box-* token(无对应 token 的尺寸值在 wiki 记录差异)。
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
      <!-- 勾/减字形:WinUI 用 Segoe Fluent Icons 的 E001(CheckMark)/E73C(Subtract),
           此处以内联 SVG 等形复刻,颜色取 --wui-check-box-check-glyph-foreground-* token -->
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
  /* UncheckedNormal */
  --cb-fg: var(--wui-check-box-foreground-unchecked);
  --cb-stroke: var(--wui-check-box-check-background-stroke-unchecked);
  --cb-fill: var(--wui-check-box-check-background-fill-unchecked);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-unchecked);
}

/* UncheckedPointerOver / CheckedPointerOver / IndeterminatePointerOver */
.wui-check-box:not(.is-disabled):hover {
  --cb-fg: var(--wui-check-box-foreground-unchecked-pointer-over);
  --cb-stroke: var(--wui-check-box-check-background-stroke-unchecked-pointer-over);
  --cb-fill: var(--wui-check-box-check-background-fill-unchecked-pointer-over);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-unchecked-pointer-over);
}
.wui-check-box.is-checked:not(.is-disabled):hover {
  --cb-fg: var(--wui-check-box-foreground-checked-pointer-over);
  --cb-stroke: var(--wui-check-box-check-background-stroke-checked-pointer-over);
  --cb-fill: var(--wui-check-box-check-background-fill-checked-pointer-over);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-checked-pointer-over);
}
.wui-check-box.is-indeterminate:not(.is-disabled):hover {
  --cb-fg: var(--wui-check-box-foreground-indeterminate-pointer-over);
  --cb-stroke: var(--wui-check-box-check-background-stroke-indeterminate-pointer-over);
  --cb-fill: var(--wui-check-box-check-background-fill-indeterminate-pointer-over);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-indeterminate-pointer-over);
}

/* UncheckedPressed / CheckedPressed / IndeterminatePressed */
.wui-check-box:not(.is-disabled):active {
  --cb-fg: var(--wui-check-box-foreground-unchecked-pressed);
  --cb-stroke: var(--wui-check-box-check-background-stroke-unchecked-pressed);
  --cb-fill: var(--wui-check-box-check-background-fill-unchecked-pressed);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-unchecked-pressed);
}
.wui-check-box.is-checked:not(.is-disabled):active {
  --cb-fg: var(--wui-check-box-foreground-checked-pressed);
  --cb-stroke: var(--wui-check-box-check-background-stroke-checked-pressed);
  --cb-fill: var(--wui-check-box-check-background-fill-checked-pressed);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-checked-pressed);
}
.wui-check-box.is-indeterminate:not(.is-disabled):active {
  --cb-fg: var(--wui-check-box-foreground-indeterminate-pressed);
  --cb-stroke: var(--wui-check-box-check-background-stroke-indeterminate-pressed);
  --cb-fill: var(--wui-check-box-check-background-fill-indeterminate-pressed);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-indeterminate-pressed);
}

/* UncheckedDisabled / CheckedDisabled / IndeterminateDisabled */
.wui-check-box.is-disabled {
  --cb-fg: var(--wui-check-box-foreground-unchecked-disabled);
  --cb-stroke: var(--wui-check-box-check-background-stroke-unchecked-disabled);
  --cb-fill: var(--wui-check-box-check-background-fill-unchecked-disabled);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-unchecked-disabled);
}
.wui-check-box.is-disabled.is-checked {
  --cb-fg: var(--wui-check-box-foreground-checked-disabled);
  --cb-stroke: var(--wui-check-box-check-background-stroke-checked-disabled);
  --cb-fill: var(--wui-check-box-check-background-fill-checked-disabled);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-checked-disabled);
}
.wui-check-box.is-disabled.is-indeterminate {
  --cb-fg: var(--wui-check-box-foreground-indeterminate-disabled);
  --cb-stroke: var(--wui-check-box-check-background-stroke-indeterminate-disabled);
  --cb-fill: var(--wui-check-box-check-background-fill-indeterminate-disabled);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-indeterminate-disabled);
}

/* CheckedNormal / IndeterminateNormal(须置于交互态之后,保证同优先级下三态色生效) */
.wui-check-box.is-checked {
  --cb-fg: var(--wui-check-box-foreground-checked);
  --cb-stroke: var(--wui-check-box-check-background-stroke-checked);
  --cb-fill: var(--wui-check-box-check-background-fill-checked);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-checked);
}
.wui-check-box.is-indeterminate {
  --cb-fg: var(--wui-check-box-foreground-indeterminate);
  --cb-stroke: var(--wui-check-box-check-background-stroke-indeterminate);
  --cb-fill: var(--wui-check-box-check-background-fill-indeterminate);
  --cb-glyph: var(--wui-check-box-check-glyph-foreground-indeterminate);
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
  background: var(--wui-check-box-background-unchecked);
  border: 0 solid var(--wui-check-box-border-brush-unchecked);
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

/* CheckGlyph(FontIcon Glyph=E001/E73C,FontSize=20,Opacity=0):
   矩形内垂直居中(显式尺寸 + Stretch 对齐在 XAML 中表现为居中),勾选/不确定态淡入 */
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
}
.glyph path {
  fill: none;
  stroke: currentcolor;
  stroke-width: 1.5;
}
.wui-check-box.is-checked .glyph-check,
.wui-check-box.is-indeterminate .glyph-minus {
  opacity: 1;
}

/* ContentPresenter:Margin=Padding=8,5,0,0(XAML Thickness 顺序:左,上,右,下) */
.content {
  align-self: flex-start;
  margin: 5px 0 0 8px;
  line-height: normal;
}
</style>
