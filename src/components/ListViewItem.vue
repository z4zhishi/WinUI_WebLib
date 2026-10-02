<script setup lang="ts">
// ListViewItem.vue —— WinUI ListViewItem 的 Web 复刻(列表项容器:多重选中视觉叠加)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style x:Key="ListViewItemRevealStyle" TargetType="ListViewItem">(L17732 起,默认项样式
//   BasedOn 它,L20595)。源模板是 ListViewItemPresenter + VSM 复合态(Selected/PointerOver/
//   Pressed 正交叠加出 Normal/Selected/PointerOver/Pressed/PointerOverSelected/
//   PointerOverPressed/PressedSelected 七态),Web 侧以 CSS 状态类 + 伪类等价表达:
//   - 容器:MinHeight = ListViewItemMinHeight = 40、MinWidth = 88、Padding = 12,0,12,0、
//     DisabledOpacity = 0.55(只作用于内容,容器底色保留);
//   - 底色四层(叠加优先级 Pressed > PointerOver > Selected > Normal,选中态取更深的
//     selected-pointer-over / selected-pressed 档,非 selected* 桥接态):
//       Normal      = ListViewItemBackground               (透明)
//       PointerOver = ListViewItemBackgroundPointerOver    (ListLow,#00000019)
//       Pressed     = ListViewItemBackgroundPressed        (ListMedium,#00000033)
//       Selected    = ListViewItemBackgroundSelected       (ListAccentLow,强调色 40%)
//       Selected×hover  = ListViewItemBackgroundSelectedPointerOver  (强调色 60%)
//       Selected×pressed= ListViewItemBackgroundSelectedPressed      (强调色 70%)
//   - Reveal 揭示光照(默认启用:WinUI 3 默认项样式即 ListViewItemRevealStyle,L20595
//     keyless BasedOn):源 RevealBackground=ListViewItemRevealBackground(退役为透明回退色,
//     即 WinUI 2 时代被 pointer 光照点亮的底板层)、RevealBorderBrush(VSM 按 hover/pressed
//     切 ListViewItemRevealBorderBrushPointerOver/Pressed,均透明)+ DisabledStates 厚度归 0。
//     Web 以公共层(src/styles/reveal.css + useReveal)复刻 WinUI 2 材料:底板光半径
//     = Clamp(Max(W,H)+12,16,512)(RevealHoverLight.cpp L141-149/L163)、边框光半径 77px
//     (RevealBorderLight.cpp wide 配置 L37-48)、光环厚度 = RevealBorderThemeThickness 1
//     (G.xaml L1399);静态 1px 揭示边框结构由 .reveal-border span 消费
//     --wui-list-view-item-reveal-* token(theme.css L1290-1292,各态透明,逐点对齐源)。
//   - 前景:ListViewItemForeground / -PointerOver / -Selected(SystemControlForegroundBaseHigh
//     与 SystemControlHighlightAltBaseHigh 族);
//   - 多重选择勾选框(CheckMode = Inline,SelectionCheckMarkVisualEnabled = True):
//     Multiple 模式下每项左侧常驻勾选框;选中时 accent 铺底 + 白色对勾
//     (CheckBrush / CheckBoxBrush = SystemControlForegroundBaseMediumHigh 族);
//   - 焦点框:UseSystemFocusVisuals 系统双线焦点框(外 2px primary + 内 1px secondary),
//     选中项取反色(FocusBorderBrush / FocusSecondaryBorderBrush)。
// 行为:本组件只承载「容器视觉 + 勾选框 + 内容呈现」,选择逻辑(点选/区间/键盘)由
// ListView.vue 统一裁决;单击经 activated 事件(携原生 MouseEvent,供修饰键判断)上报。
import { useReveal } from '../composables/useReveal'
import '../styles/reveal.css'

defineOptions({ name: 'WuiListViewItem', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 是否选中(WinUI ListViewItem.IsSelected)。 */
    selected?: boolean
    /** 是否显示多重选择勾选框(Multiple 模式;WinUI CheckMode=Inline)。 */
    checkVisible?: boolean
    /** 键盘焦点是否在本项(roving tabindex + 焦点框;WinUI UseSystemFocusVisuals)。 */
    focused?: boolean
    /** 禁用(DisabledStates → Disabled:内容 0.55 透明度,不响应悬停/按压)。 */
    disabled?: boolean
    /**
     * 是否启用 reveal 揭示光照(悬浮时跟随指针的底板光 + 1px 边框光环)。
     * 默认 true:WinUI 3 默认项样式即 ListViewItemRevealStyle(generic.xaml L20595
     * keyless BasedOn)。设 false 回到无光照的静态悬停态。
     */
    enableReveal?: boolean
  }>(),
  {
    selected: false,
    checkVisible: false,
    focused: false,
    disabled: false,
    enableReveal: true,
  },
)

const emit = defineEmits<{
  /** 单击项(对齐 WinUI ItemClick 的触发时机);携带原生事件供上层处理 Ctrl/Shift 修饰键。 */
  (e: 'activated', event: MouseEvent): void
}>()

// reveal 光照(公共层):指针位置/光斑半径写入 CSS 变量(仅 enableReveal、非禁用且
// 指针设备启用);光晕渲染在 reveal.css 的 ::before(底板光)/::after(边框光)。
const revealHandlers = useReveal(() => props.enableReveal && !props.disabled)

function onRootClick(event: MouseEvent): void {
  if (!props.disabled) emit('activated', event)
}
</script>

<template>
  <div
    v-bind="$attrs"
    class="wui-list-view-item"
    :class="{
      'is-selected': selected,
      'is-check-visible': checkVisible,
      'is-disabled': disabled,
      'wui-reveal': enableReveal,
      'wui-reveal--border': enableReveal,
    }"
    role="option"
    :aria-selected="selected"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled ? -1 : focused ? 0 : -1"
    v-on="enableReveal ? revealHandlers : undefined"
    @click="onRootClick"
  >
    <!-- 揭示边框(RevealBorderThickness=1,G.xaml L1399;源画刷各态透明,本 span 只承担
         静态 1px 描边结构并消费 --wui-list-view-item-reveal-border 系 token;悬停光环由
         公共层 ::after 边框光提供;DisabledStates → RevealBorderThickness=0(L17824-17829)) -->
    <span v-if="enableReveal" class="reveal-border" aria-hidden="true"></span>
    <!-- 多重选择勾选框(CheckMode=Inline):未选描边空框,选中 accent 铺底 + 白对勾。
         多选模式切换时滑入/滑出(audit A10,Transition 挂 wui-listitem-check 组) -->
    <Transition name="wui-listitem-check">
      <span v-if="checkVisible" class="wui-list-view-item-check" aria-hidden="true">
        <span class="wui-list-view-item-check-glyph">&#xE73E;</span>
      </span>
    </Transition>

    <!-- ContentPresenter:缺省单行省略;自定义模板可内联覆盖文本截断行为 -->
    <span class="wui-list-view-item-content"><slot /></span>
  </div>
</template>

<style scoped>
.wui-list-view-item {
  display: flex;
  align-items: center;
  min-width: 88px; /* ListViewItemMinWidth */
  min-height: 40px; /* ListViewItemMinHeight */
  padding: 0 12px; /* ListViewItem Padding = 12,0,12,0 */
  box-sizing: border-box;
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize */
  color: var(--wui-list-view-item-foreground); /* ListViewItemForeground */
  background: var(--wui-list-view-item-background); /* ListViewItemBackground(透明) */
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}

.wui-list-view-item-content {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ======================================================================
 * 状态叠加(对照 VSM CommonStates;优先级 Pressed > PointerOver > Selected > Normal)
 * ====================================================================== */

/* Normal → PointerOver(ListViewItemBackgroundPointerOver = ListLow) */
.wui-list-view-item:not(.is-disabled):hover {
  color: var(--wui-list-view-item-foreground-pointer-over);
  background: var(--wui-list-view-item-background-pointer-over);
}

/* Pressed(ListViewItemBackgroundPressed = ListMedium;选中与否同档,源 Pressed 与
   PointerOverPressed / PressedSelected 在 reveal 层才有差异,平色层 ListMedium 同值) */
.wui-list-view-item:not(.is-disabled):active {
  background: var(--wui-list-view-item-background-pressed);
}

/* Selected(ListViewItemBackgroundSelected = ListAccentLow,强调色 40%) */
.wui-list-view-item.is-selected {
  color: var(--wui-list-view-item-foreground-selected);
  background: var(--wui-list-view-item-background-selected);
}

/* Selected × PointerOver(ListViewItemBackgroundSelectedPointerOver = 强调色 60%)。
   :active 未单独加深选中悬停按压(源 SelectedPressed 仅按压瞬间,由下一档覆盖) */
.wui-list-view-item.is-selected:not(.is-disabled):hover {
  background: var(--wui-list-view-item-background-selected-pointer-over);
}

/* Selected × Pressed(ListViewItemBackgroundSelectedPressed = 强调色 70%) */
.wui-list-view-item.is-selected:not(.is-disabled):active {
  background: var(--wui-list-view-item-background-selected-pressed);
}

/* Disabled(DisabledStates:DisabledOpacity = 0.55,只衰减内容,底色不衰减) */
.wui-list-view-item.is-disabled {
  cursor: default;
}

.wui-list-view-item.is-disabled .wui-list-view-item-content {
  opacity: 0.55; /* ListViewItemDisabledThemeOpacity */
}

/* ======================================================================
 * Reveal 揭示光照(公共层 reveal.css)::before 底板光 / ::after 边框光。
 * 底板光半径由 useReveal 按源公式 Clamp(Max(W,H)+12,16,512) 在进入时写入;
 * 边框光半径取源 wide 配置 ≈ 77px(RevealBorderLight.cpp L37-48:256·tan(16.7403°),
 * 列表行属宽幅大件,同 GridViewItem 口径);光环厚度 = RevealBorderThemeThickness 1。
 * ====================================================================== */
.wui-list-view-item.wui-reveal {
  --wui-reveal-border-width: 1px;
  --wui-reveal-border-radius: 77px;
}

/* —— 揭示边框静态结构(RevealBorderThickness=1):各态透明,逐态消费源 token —— */
.reveal-border {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 1px solid var(--wui-list-view-item-reveal-border);
  pointer-events: none;
}

/* CommonStates:hover/pressed 切 ListViewItemRevealBorderBrushPointerOver/Pressed
   (VSM L17776-17816;源值均透明) */
.wui-list-view-item:not(.is-disabled):hover .reveal-border {
  border-color: var(--wui-list-view-item-reveal-border-brush-pointer-over);
}

.wui-list-view-item:not(.is-disabled):active .reveal-border {
  border-color: var(--wui-list-view-item-reveal-border-brush-pressed);
}

/* DisabledStates → Disabled:RevealBorderThickness=0(L17824-17829)+
   禁用项不点亮光晕(容器为 div,公共层 :disabled 门覆盖不到 is-disabled 类) */
.wui-list-view-item.is-disabled .reveal-border {
  border-width: 0;
}

.wui-list-view-item.is-disabled.wui-reveal:hover::before,
.wui-list-view-item.is-disabled.wui-reveal:hover::after {
  opacity: 0;
}

/* ======================================================================
 * 焦点框(ListViewItemRevealStyle:UseSystemFocusVisuals=True + FocusVisualMargin=0
 * → 两环全在元素内:primary [0,2] + secondary [2,3] 紧贴相邻 = 系统双线框)
 * ====================================================================== */
.wui-list-view-item:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-list-view-item-focus-visual-primary);
  outline: 1px solid var(--wui-list-view-item-focus-visual-secondary);
  outline-offset: -3px;
}

/* 选中项焦点框反色(FocusBorderBrush=ListViewItemFocusBorderBrush=AltHigh、
 * FocusSecondaryBorderBrush=BaseHigh,角色与未选中互换后仍按环位取色) */
.wui-list-view-item.is-selected:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-list-view-item-focus-border);
  outline-color: var(--wui-list-view-item-focus-secondary-border);
}

/* ======================================================================
 * 多重选择勾选框(CheckMode = Inline;选中 accent 铺底 + 白色对勾)
 * ====================================================================== */
.wui-list-view-item-check {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  margin-right: 12px;
  border: 1px solid var(--wui-list-view-item-check-box); /* ListViewItemCheckBoxBrush */
  border-radius: 4px;
  background: transparent;
}

.wui-list-view-item.is-selected .wui-list-view-item-check {
  background: var(--wui-system-accent-color);
  border-color: var(--wui-system-accent-color);
}

.wui-list-view-item-check-glyph {
  font-family: var(--wui-symbol-theme-font-family); /* SymbolThemeFontFamily */
  font-size: 12px;
  line-height: 1;
  color: transparent; /* 未选:框内无字形 */
}

.wui-list-view-item.is-selected .wui-list-view-item-check-glyph {
  color: var(--wui-check-box-check-glyph-foreground-checked); /* 选中白对勾(同 CheckBox) */
}

/* ======================================================================
 * 多选勾选滑入(audit A10;源 G.xaml L20787-20819 MultiSelectStates):
 *   进入 Multiple:MultiSelectCheckBoxTransform X −32→0 @0.333s
 *   KeySpline 0.1,0.9,0.2,1,方块 Visible@0;退出 Multiple:X 0→−32 @0.333s
 *   同曲线,方块 Collapsed@0.333s。
 * Web 以 Vue Transition 挂 translateX(−32px 起点/终点)+ opacity 333ms
 * (工单口径:勾选框 translateX ±32px 333ms + 方块 opacity 333ms;
 * 入场瞬现改随滑淡入为已声明近似)。离场过渡期间元素保持占位,
 * 对齐源 ContentPresenterGrid 预留 32px 的瞬时布局语义。
 * ====================================================================== */
.wui-listitem-check-enter-active,
.wui-listitem-check-leave-active {
  transition:
    transform 333ms var(--wui-easing-standard),
    opacity 333ms var(--wui-easing-standard);
}

.wui-listitem-check-enter-from,
.wui-listitem-check-leave-to {
  transform: translateX(-32px);
  opacity: 0;
}
</style>
