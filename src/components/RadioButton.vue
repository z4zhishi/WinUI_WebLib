<script setup lang="ts">
// WuiRadioButton —— WinUI RadioButton 的 Web 复刻。
// 视觉规格(权威 = controls/dev,generic.xaml 为 UWP 遗留):
//   CK/WinUI-Reference/controls/dev/CommonStyles/RadioButton_themeresources.xaml:
//   20x20 外圈(未选中 BaseMediumHigh 描边,选中强调色描边)+ 实心内点 CheckGlyph
//   (基尺寸 RadioButtonCheckGlyphSize=12,CommonStates 尺寸 morph 14/10/14),内容
//   Padding=8,6,0,0;CommonStates(Normal/PointerOver/Pressed/Disabled)× CheckStates
//   (Checked/Unchecked),PL9:状态色重定向到 PL2 Fluent 画刷族
//   (--wui-text-fill-*/--wui-control-*-fill-*/--wui-accent-fill-color-*/
//   --wui-text-on-accent-fill-color-*;渐变描边按 PL5 mask 环;权威键见矩阵 §1.6),
//   几何与 250ms 内点尺寸 morph 动效不变。
//   遗留参照:dxaml generic.xaml L6541 起 Style(内点固定 10x10、无尺寸 morph,已弃用)。
// 互斥与键盘:与 CheckBox 不同,radio 组内上下左右方向键移动选中、组内仅选中项可 Tab 到。
//   该组语义优先用原生 input[type=radio][name] 承载(互斥 / 方向键 / Tab / role / aria-checked
//   全部由原生提供),视觉自绘 —— 隐藏的 input 与自绘圆形为兄弟节点,选中态用
//   `input:checked + .check-area` 选择器驱动。详见 wiki/controls/RadioButton.md。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  implicitGroupId,
  isGroupSyncing,
  registerHandle,
  syncGroupPeers,
  unregisterHandle,
  withGroupSync,
} from './radioButtonGroups'
import type { RadioHandle } from './radioButtonGroups'

// class/style 等透传属性统一由根元素 v-bind="$attrs" 承接(避免落到 label 之外的继承位)。
defineOptions({ name: 'WuiRadioButton', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 内容文本(WinUI Content;默认 slot 兜底,slot 优先)。 */
    content?: string
    /**
     * 组名(WinUI GroupName):同名实例互斥(可跨容器);缺省时同父容器的实例自动成组,
     * 对应 WinUI「无 GroupName 时按最近公共父容器分组」的默认语义。
     */
    groupName?: string
    /** 禁用(WinUI IsEnabled 的取反映射,便于沿用原生 disabled 语义)。 */
    disabled?: boolean
  }>(),
  { content: '', groupName: '', disabled: false },
)

// 显式声明 emits(含 click):父级 @click 监听改走 emit 转发,防止原生 click 重复触发。
const emit = defineEmits<{
  /** 点击选项时触发(转发原生 MouseEvent;禁用时不触发)。 */
  click: [event: MouseEvent]
  /** 该选项进入选中态(WinUI Checked;仅用户交互触发)。 */
  checked: []
  /** 该选项退出选中态(WinUI Unchecked;含同组其他选项被选中时的互斥回写)。 */
  unchecked: []
  // 注:update:checked 的 emit 类型由下方 defineModel 提供,勿在此重复声明(会导致 vue-tsc 推断退化为 unknown)。
}>()

// 双向:checked —— boolean(WinUI IsChecked 为非空 bool,不像 CheckBox 可为 null)。
const checked = defineModel<boolean>('checked', { default: false })

const rootRef = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

// ======================================================================
// 同组互斥的模型回写:原生 input[type=radio] 互斥只改 DOM checkedness,
// 不会通知同组其他组件实例的 v-model —— 实例注册表与重入保护放在独立模块
// ./radioButtonGroups.ts(普通模块顶层作用域,所有实例共享同一份;本文件
// <script setup> 顶层是每实例作用域,不能承载共享状态)。此处仅保留实例侧
// 句柄与登记名。
// ======================================================================
let registeredName = ''

const handle: RadioHandle = {
  el: () => inputEl.value,
  syncFromDom(emitEvents: boolean): boolean {
    const el = inputEl.value
    if (!el || checked.value === el.checked) return false
    checked.value = el.checked
    if (emitEvents) {
      if (el.checked) emit('checked')
      else emit('unchecked')
    }
    return true
  },
}

/** 无显式 groupName 时,按父容器分配的自动组名(首个挂载实例分配)。 */
const implicitGroupName = ref('')
/** 显式 groupName 全局生效;否则同父容器共用一个自动组名。 */
const resolvedGroupName = computed(() =>
  props.groupName !== '' ? props.groupName : implicitGroupName.value,
)

function resolveImplicitGroupName(): void {
  if (props.groupName !== '') {
    implicitGroupName.value = ''
    return
  }
  implicitGroupName.value = implicitGroupId(rootRef.value?.parentElement ?? null)
}

function register(): void {
  unregister()
  registeredName = resolvedGroupName.value
  registerHandle(registeredName, handle)
}

function unregister(): void {
  if (registeredName === '') return
  unregisterHandle(registeredName, handle)
  registeredName = ''
}

// 程序化 v-model:checked → DOM 互斥落地 + 同组回写(flush:sync 保证在批量回写
// 窗口内同步执行;程序化路径不派发 checked/unchecked,与 WinUI 差异见 wiki)。
watch(
  checked,
  (value) => {
    if (isGroupSyncing()) return
    const el = inputEl.value
    if (!el) return
    withGroupSync(() => {
      el.checked = value === true
      syncGroupPeers(registeredName, el, false)
    })
  },
  { flush: 'sync' },
)

// 组名动态变更 → 换组重登记(旧组移除,新组加入)。
watch(resolvedGroupName, () => {
  if (!rootRef.value) return
  resolveImplicitGroupName()
  register()
})

onMounted(() => {
  resolveImplicitGroupName()
  register()
  const el = inputEl.value
  // 初始 checked 落 DOM(原生 set checked=true 会静默取消同组 DOM 选中,一并回写)
  if (el && el.checked !== checked.value) {
    withGroupSync(() => {
      el.checked = checked.value
      syncGroupPeers(registeredName, el, false)
    })
  }
})

onBeforeUnmount(() => {
  unregister()
})

/** 用户交互(点击 / 方向键 / Space)改变选中:原生 change 事件统一入口。 */
function onNativeChange(): void {
  if (isGroupSyncing()) return
  const el = inputEl.value
  if (!el) return
  withGroupSync(() => {
    checked.value = el.checked
    // 官方 Checked/Unchecked 次序:先状态事件,后 Click 路由事件(此处 click 在 @click 转发)
    if (el.checked) emit('checked')
    else emit('unchecked')
    syncGroupPeers(registeredName, el, true)
  })
}

/** 转发原生点击(含 label 激活的合成点击;禁用时原生不派发)。 */
function onNativeClick(event: MouseEvent): void {
  emit('click', event)
}
</script>

<template>
  <label
    ref="rootRef"
    class="wui-radio-button"
    :class="{ 'is-disabled': disabled }"
    v-bind="$attrs"
  >
    <!-- 隐藏的原生 input:承载互斥(name)/键盘(方向键移动、组内仅选中项可 Tab)/role/aria -->
    <input
      ref="inputEl"
      class="radio-input"
      type="radio"
      :name="resolvedGroupName"
      :disabled="disabled"
      @change="onNativeChange"
      @click="onNativeClick"
    />
    <!-- 圆形图形区:对应模板中 VerticalAlignment=Top Height=32 的 32px 高、列宽 20 子网格 -->
    <span class="check-area" aria-hidden="true">
      <!-- OuterEllipse(未选中)/ CheckOuterEllipse(选中):同位 20x20 圆,切交换色 -->
      <span class="outer"></span>
      <!-- CheckGlyph:实心内点(基尺寸 12;PointerOver/Pressed/Disabled 尺寸 morph),
           选中态淡入(模板 Duration=0,即时切换) -->
      <span class="dot"></span>
    </span>
    <span class="content"><slot>{{ content }}</slot></span>
  </label>
</template>

<style scoped>
/* ======================================================================
 * 组合态配色(CommonStates × CheckStates):根元素按交互态写入中间变量,
 * 后代元素统一消费,对应 generic.xaml 各 VisualState 的 ObjectAnimation。
 * ====================================================================== */
.wui-radio-button {
  /* UncheckedNormal —— PL9:状态色重定向到 PL2 Fluent 画刷族
     (权威键见 docs/pages/color/control-brush-matrix.md §1.6) */
  --rb-fg: var(--wui-text-fill-color-primary); /* RadioButtonForeground = TextFillColorPrimaryBrush */
  --rb-outer-stroke: var(--wui-control-strong-stroke-color-default); /* OuterEllipseStroke = ControlStrongStrokeColorDefaultBrush */
  --rb-outer-fill: var(--wui-control-alt-fill-color-secondary); /* OuterEllipseFill = ControlAltFillColorSecondaryBrush */
  --rb-checked-stroke: var(--wui-accent-fill-color-default); /* OuterEllipseCheckedStroke = AccentFillColorDefaultBrush */
  --rb-checked-fill: var(--wui-accent-fill-color-default); /* OuterEllipseCheckedFill = AccentFillColorDefaultBrush */
  --rb-dot-fill: var(--wui-text-on-accent-fill-color-primary); /* CheckGlyphFill = TextOnAccentFillColorPrimaryBrush */
  --rb-dot-elevation: var(--wui-circle-elevation-border); /* CheckGlyphStroke = CircleElevationBorderBrush(渐变) */
}

/* NormalPointerOver(选中态共用同一组交互 token,选中色取 checked-* 变体) */
.wui-radio-button:not(.is-disabled):hover {
  --rb-fg: var(--wui-text-fill-color-primary);
  --rb-outer-stroke: var(--wui-control-strong-stroke-color-default); /* 同 Normal */
  --rb-outer-fill: var(--wui-control-alt-fill-color-tertiary);
  --rb-checked-stroke: var(--wui-accent-fill-color-secondary);
  --rb-checked-fill: var(--wui-accent-fill-color-secondary);
  --rb-dot-fill: var(--wui-text-on-accent-fill-color-primary);
  --rb-dot-elevation: var(--wui-circle-elevation-border);
}

/* NormalPressed / CheckedPressed */
.wui-radio-button:not(.is-disabled):active {
  --rb-fg: var(--wui-text-fill-color-primary);
  --rb-outer-stroke: var(--wui-control-strong-stroke-color-disabled); /* OuterEllipseStrokePressed = ControlStrongStrokeColorDisabledBrush */
  --rb-outer-fill: var(--wui-control-alt-fill-color-quarternary);
  --rb-checked-stroke: var(--wui-accent-fill-color-tertiary);
  --rb-checked-fill: var(--wui-accent-fill-color-tertiary);
  --rb-dot-fill: var(--wui-text-on-accent-fill-color-primary);
  --rb-dot-elevation: var(--wui-circle-elevation-border);
}

/* NormalDisabled / CheckedDisabled */
.wui-radio-button.is-disabled {
  --rb-fg: var(--wui-text-fill-color-disabled); /* ForegroundDisabled = TextFillColorDisabledBrush */
  --rb-outer-stroke: var(--wui-control-strong-stroke-color-disabled);
  --rb-outer-fill: var(--wui-control-alt-fill-color-disabled);
  --rb-checked-stroke: var(--wui-accent-fill-color-disabled);
  --rb-checked-fill: var(--wui-accent-fill-color-disabled);
  --rb-dot-fill: var(--wui-text-on-accent-fill-color-primary); /* CheckGlyphFillDisabled = TextOnAccentFillColorPrimary */
  --rb-dot-elevation: var(--wui-circle-elevation-border);
}

/* ======================================================================
 * 布局(对照 ControlTemplate):MinWidth=120、圆形列宽 20 / 行高 32、
 * 内容 Padding=8,6,0,0(XAML Thickness 顺序:左,上,右,下)
 * ====================================================================== */
.wui-radio-button {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
  box-sizing: border-box;
  min-width: 120px;
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--rb-fg);
  /* RootGrid 的 Background/BorderBrush:两套主题各态 token 均为透明,按基础态静态绑定。
     边框厚度:源 RootGrid 为 BorderThickness="{TemplateBinding BorderThickness}",而
     <Style TargetType="RadioButton">(generic.xaml L6541 段)**未设置** BorderThickness →
     Control 默认 0,即控件盒本身没有边框(盒高 = 模板 32px 行)。
     故此处厚度必须为 0:写入 1px 会把 32px 内容顶到 34px,并使圈/内点/文字整体 +1px(VR-B3 §3.2)。 */
  background: var(--wui-control-fill-color-transparent); /* RadioButtonBackground = ControlFillColorTransparentBrush */
  border: 0 solid var(--wui-control-fill-color-transparent); /* RadioButtonBorderBrush = ControlFillColorTransparentBrush */
  border-radius: 0;
  text-align: left;
  cursor: pointer;
}

.wui-radio-button.is-disabled {
  cursor: default;
}

/* 焦点(WinUI UseSystemFocusVisuals + FocusVisualMargin=-7,-3,-7,-3):
   以 outline(primary 外环 2px)+ box-shadow(secondary 内环 1px)实现系统双环;焦点在原生 input 上,用 :has 上浮到根。
   差异见 wiki(不支持 :has 的旧内核无焦点框,选中视觉不受影响) */
.wui-radio-button:has(.radio-input:focus-visible) {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* —— 隐藏的原生 input(视觉自绘,交互全原生)—— */
.radio-input {
  position: absolute;
  box-sizing: border-box;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

/* —— 圆形图形区(模板:Grid VerticalAlignment=Top Height=32,列宽 20)—— */
.check-area {
  position: relative;
  flex: none;
  width: 20px;
  height: 32px;
}

/* OuterEllipse / CheckOuterEllipse:20x20 圆;描边厚度取
   RadioButtonBorderThemeThickness=2(该 x:Double 未提取为 token,硬编码并在 wiki 记录)。
   在 32px 行内垂直居中(top 6px),与模板 Grid 内 Ellipse 的布局一致 */
.outer {
  position: absolute;
  top: 6px;
  left: 0;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  background: var(--rb-outer-fill);
  border: 2px solid var(--rb-outer-stroke);
  border-radius: 50%;
}

/* 选中态:CheckOuterEllipse(Opacity 0→1)替代 OuterEllipse 的配色 */
.radio-input:checked + .check-area .outer {
  background: var(--rb-checked-fill);
  border-color: var(--rb-checked-stroke);
}

/* CheckGlyph:实心内点,基尺寸 = RadioButtonCheckGlyphSize = 12
   (RadioButton_themeresources.xaml L179;遗留 generic.xaml L6716 为 10,已弃用)。
   inset:0 + margin:auto 使其恒居中于 20x20 外圈(中心 10,16)。
   选中态 Opacity 0→1(Duration=0,即时,无过渡);
   CommonStates 尺寸 morph(PointerOver→14 @250ms、Pressed→10 @250ms、
   Disabled→14 @167ms,均 KeySpline 0,0,0,1,源 L255-260/L292-297/L338-343)。
   PL9:描边权威为渐变(CircleElevationBorderBrush / 选中态 AccentControlElevationBorderBrush),
   border 保持 1px 透明(盒模型几何不变),渐变经 ::before 描边环呈现(PL5 同款 mask 环)。 */
.dot {
  position: absolute;
  inset: 0;
  margin: auto;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  background: var(--rb-dot-fill);
  border: 1px solid transparent;
  border-radius: 50%;
  opacity: 0;
  transition:
    width 250ms cubic-bezier(0, 0, 0, 1),
    height 250ms cubic-bezier(0, 0, 0, 1);
}

/* PL9 内点渐变描边环(权威键:CheckGlyphStroke)。
   几何:环厚 = 1px(dot 的 border 宽),外缘与 12px border-box 对齐;
        inset:-1px 抵消宿主 border(绝对定位包含块为 padding box);
        绝对定位不参与布局 → 尺寸/位置/尺寸 morph 全部不变。
   状态:--rb-dot-elevation 见上方各态;选中态切换为强调版渐变。 */
.dot::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: var(--rb-dot-elevation, none);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.radio-input:checked + .check-area .dot {
  --rb-dot-elevation: var(--wui-accent-control-elevation-border); /* CheckGlyphStrokeChecked = AccentControlElevationBorderBrush */
}

.wui-radio-button.is-disabled .radio-input:checked + .check-area .dot {
  --rb-dot-elevation: var(--wui-control-elevation-border); /* CheckGlyphStrokeCheckedDisabled = ControlElevationBorderBrush */
}

.radio-input:checked + .check-area .dot {
  opacity: 1;
}

/* PointerOver → 14x14 @250ms(spline 0,0,0,1) */
.wui-radio-button:not(.is-disabled):hover .check-area .dot {
  width: 14px;
  height: 14px;
}

/* Pressed → 10x10 @250ms(spline 0,0,0,1) */
.wui-radio-button:not(.is-disabled):active .check-area .dot {
  width: 10px;
  height: 10px;
}

/* Disabled → 14x14 @167ms(spline 0,0,0,1,ControlFastAnimationDuration) */
.wui-radio-button.is-disabled .check-area .dot {
  width: 14px;
  height: 14px;
  transition-duration: 167ms;
}

/* ContentPresenter:Margin=Padding=8,6,0,0;TextWrapping=Wrap 由默认流式换行承接 */
.content {
  align-self: flex-start;
  margin: 6px 0 0 8px;
  line-height: normal;
}
</style>
