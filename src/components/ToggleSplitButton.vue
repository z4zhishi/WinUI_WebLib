<script setup lang="ts">
// ToggleSplitButton —— WinUI ToggleSplitButton 的 Web 复刻:主区为开关(点击 / Space / Enter
// 翻转 checked,勾选后整钮 accent 底 + TextOnAccent 前景),次区 chevron 开弹层,弹层行为
// 与 SplitButton 完全一致。
//
// 锚点(同目录独立文件,对照源结构):
//   CK/WinUI-Reference/controls/dev/SplitButton/ 下 ToggleSplitButton.cpp/h/AutomationPeer
//   为 SplitButton 的同目录独立文件;样式为 SplitButton.xaml 末尾
//   <Style TargetType="controls:ToggleSplitButton" BasedOn="{StaticResource SplitButtonStyle}" />
//   (空 BasedOn —— 与 SplitButton 共用模板与全部状态资源)。本组件因此实现为 SplitButton.vue
//   的**组合扩展**(源码继承 ↔ Web 组合):模板 / 弹层 / 键盘全部
//   复用,仅追加 checked 分支的视觉与行为,经 attrs 透传落到其根元素。
//   (fix round 1:SplitButton 组件级 token 前缀统一为 --wui-splitbutton-*,本文件的
//   token 覆写引用已同步更名——纯机械更名,值与选择器未变。)
//
// Checked 状态规格(源 CommonStates 的 Checked 全族,SplitButton.cpp UpdateVisualStates
//   L137-L183 + SplitButton.xaml L131-L207,钩子挂点见 SplitButton.vue 文末预留注释):
//   Checked / CheckedFlyoutOpen / CheckedTouchPressed / CheckedPrimaryPointerOver /
//   CheckedPrimaryPressed / CheckedSecondaryPointerOver / CheckedSecondaryPressed。
//   无 CheckedDisabled 态:模板 Disabled 分支不含勾选变体,禁用 + 勾选外观同「仅禁用」
//   (themeresources 的 SplitButton*CheckedDisabled 资源未被模板引用,不复刻)。
//   配色(SplitButton_themeresources.xaml L9-L32,Light 基线 / Default 深色档):
//   背景 ← AccentFillColorDefault(悬停 ≈ Dark1 = AccentFillColorSecondary,按压 ≈ Dark2 =
//   AccentFillColorTertiary);前景 ← TextOnAccentFillColorPrimary(按压族
//   TextOnAccentFillColorSecondary);边框 ← AccentControlElevationBorderBrush(1px 近似
//   ControlStrokeColorOnAccentSecondary);分隔线 ← ControlStrokeColorOnAccentTertiary。
//   WinUI 3 调色板未由 theme.css 提取(同 SplitButton 先例按源值注入组件级 token,对照表见
//   wiki/controls/ToggleSplitButton.md);accent 系为应用层系统色钩子,未定义时回退
//   --wui-hyperlink-foreground-theme(demo/components/README.md 约定,钩子定义后自动生效)。
//
// 行为规格(ToggleSplitButton.cpp):
//   - OnClickPrimary(L53):先 Toggle() 翻转 IsChecked,后 __super(发 Click)——Web 侧即
//     「先翻转 checked,再发出 click」;键盘 Space / Enter 走 SplitButton 的 KeyUp → click,
//     同样翻转(源 m_isKeyDown 经 UpdateVisualStates 进 CheckedTouchPressed 分支);
//   - IsChecked 仅 boolean(官方文档「与 ToggleButton 的差异」:无三态、无 IsThreeState、
//     无 Checked/Unchecked 事件,只有 IsCheckedChanged);
//   - OnIsCheckedChanged(L35):任何勾选变化(用户或程序性设置)均触发事件并同步
//     AutomationPeer 的 ToggleState —— Web 侧 watch(isChecked) 发 ischeckedchanged,
//     aria-pressed 随之更新;
//   - ToggleSplitButtonAutomationPeer:Invoke + ExpandCollapse + Toggle 三 pattern,
//     GetAutomationControlType 仍为 SplitButton —— Web 侧即保留 role="button" 并叠加
//     aria-pressed 开关语义(ToggleButton.vue 同款);aria-haspopup / aria-expanded 不变;
//   - 次区点击 / Alt+Down / F4 / 弹层 light dismiss 全部继承 SplitButton,无差异。
//
// checked 视觉的实现方式:SplitButton.vue 的全部状态规则消费**根元素**上的
//   --wui-splitbutton-* token,
//   本组件在同一根元素(SplitButton 根 span,attrs 落点)上追加 .is-checked 并仅覆写 token,
//   即可命中 Checked × Normal / PointerOver / Pressed / FlyoutOpen / 键盘按压全族
//   (逐态对照见样式表注);唯一结构性差异是 CheckedPrimary/SecondaryPressed 保留 accent
//   边框(FlyoutOpen / TouchPressed 为透明),以 :has(:active) 提级规则恢复。

import { computed, ref, watch } from 'vue'
import WuiSplitButton from './SplitButton.vue'
import type { PopupPlacement } from '@/composables/usePopup'

defineOptions({
  name: 'WuiToggleSplitButton',
  // class(含 is-checked)/ style 等透传属性经 SplitButton 根元素的 v-bind 落到同一个
  // span 上;aria-pressed(显式绑定)与 aria-label 则由 SplitButton 路由到主区按钮。
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    /** 主区文本;更复杂内容(图标、"M" 字样等)用默认 slot(slot 优先)。 */
    content?: string
    /** 禁用(WinUI IsEnabled = false);禁用 + 勾选外观同「仅禁用」(源无 CheckedDisabled 态)。 */
    disabled?: boolean
    /** 弹层放置位(源写死 BottomEdgeAlignedLeft → 'bottom-start',可覆盖)。 */
    placement?: PopupPlacement
    /** 字号;number 按 px。 */
    fontSize?: number | string
    /** 字重;WinUI FontWeight 命名或数字。 */
    fontWeight?: number | string
    /** 圆角;number 按 px。缺省 ControlCornerRadius(4px)。 */
    cornerRadius?: number | string
    /** 主区内边距,CSS 长度串;缺省 SplitButtonPadding 11,6,11,7。 */
    padding?: string
  }>(),
  {
    content: '',
    disabled: false,
    placement: 'bottom-start',
    fontSize: undefined,
    fontWeight: undefined,
    cornerRadius: undefined,
    padding: undefined,
  },
)

// 双向:isChecked(WinUI ToggleSplitButton.IsChecked;仅 boolean,无三态 —— 官方文档
// 「与 ToggleButton 的差异」)。
const isChecked = defineModel<boolean>('isChecked', { default: false })

// click:主区激活,同时翻转 checked(源 OnClickPrimary = Toggle + Click);
// ischeckedchanged:勾选变化(用户或程序,对照源 OnIsCheckedChanged);
// open/close:弹层开合(继承 SplitButton)。
const emit = defineEmits<{
  click: [event: MouseEvent | KeyboardEvent]
  isCheckedChanged: [value: boolean]
  open: []
  close: []
}>()

// WAI-ARIA:主区按钮(源 AutomationControlType 仍为 SplitButton)+ aria-pressed 开关
// 语义(对照 ToggleButton.vue);aria-pressed 经 SplitButton 的 attrs 路由落到主钮,
// 弹层开合由主钮的 aria-haspopup / aria-expanded 表达(嵌套交互修复后的落点)。
const ariaPressed = computed(() => (isChecked.value ? 'true' : 'false'))

// 源 OnIsCheckedChanged 对程序性设置同样触发(L35 起,仅加载前除外)→ watch 全量转发。
watch(isChecked, (value) => {
  emit('isCheckedChanged', value)
})

/** 主区激活(鼠标点主区,或键盘 Space / Enter 抬起,由 SplitButton 统一为 click 发出)。 */
function onPrimaryActivate(event: MouseEvent | KeyboardEvent): void {
  if (props.disabled) return
  // 源次序(ToggleSplitButton.cpp OnClickPrimary L53-L58):先 Toggle(),后 Click
  isChecked.value = !isChecked.value
  emit('click', event)
}

function onFlyoutOpen(): void {
  emit('open')
}

function onFlyoutClose(): void {
  emit('close')
}

/* -------------------------------------------------------------------------
 * ref 转发:程序化开关弹层(WinUI FlyoutBase.ShowAt / Hide 的等价入口)
 * ---------------------------------------------------------------------- */

const innerRef = ref<InstanceType<typeof WuiSplitButton> | null>(null)

defineExpose({
  openFlyout: () => innerRef.value?.openFlyout(),
  closeFlyout: () => innerRef.value?.closeFlyout(),
})
</script>

<template>
  <!-- 组合扩展:模板 / 弹层 / 键盘全部复用 SplitButton(源 BasedOn 共用模板的 Web 等价);
       is-checked 类与 aria-pressed 经下方显式绑定落位,其余 attrs(style / id /
       aria-label / data-*)经 v-bind="$attrs" 透传至其根元素(见样式表逐态对照) -->
  <WuiSplitButton
    ref="innerRef"
    class="wui-togglesplitbutton"
    :class="{ 'is-checked': isChecked }"
    :content="content"
    :disabled="disabled"
    :placement="placement"
    :font-size="fontSize"
    :font-weight="fontWeight"
    :corner-radius="cornerRadius"
    :padding="padding"
    :aria-pressed="ariaPressed"
    v-bind="$attrs"
    @click="onPrimaryActivate"
    @open="onFlyoutOpen"
    @close="onFlyoutClose"
  >
    <template v-if="$slots.default" #default>
      <slot />
    </template>
    <template #flyout>
      <slot name="flyout" />
    </template>
  </WuiSplitButton>
</template>

<style scoped>
/* ======================================================================
 * Checked 全族状态(SplitButton.xaml L131-L207 的 Checked 分支):
 * SplitButton.vue 的全部状态规则消费根元素 --wui-splitbutton-* token,本组件经 attrs 透传在
 * 同一根元素追加 .is-checked,覆写 token 即命中全族 —— 逐态对照(源 → 实现):
 *   Checked                        背景 AccentFillDefault;前景 TextOnAccentPrimary;
 *                                  边框 AccentControlElevation(≈OnAccentSecondary);
 *                                  分隔线 OnAccentTertiary
 *   CheckedPrimaryPointerOver      主区背景 AccentFillSecondary、前景不变(Primary)
 *   CheckedPrimaryPressed          主区背景 AccentFillTertiary、前景 TextOnAccentSecondary;
 *                                  边框保留 accent(→ :has(:active) 恢复规则)
 *   CheckedSecondaryPointerOver    次区背景 AccentFillSecondary、前景 TextOnAccentPrimary
 *   CheckedSecondaryPressed        次区背景 AccentFillTertiary、前景 TextOnAccentSecondary;
 *                                  边框保留 accent(→ 同上)
 *   CheckedFlyoutOpen              双区背景 AccentFillTertiary、前景 TextOnAccentSecondary、
 *                                  边框透明(→ --wui-splitbutton-stroke-pressed = transparent)
 *   CheckedTouchPressed / 键盘 Space 按住   同 CheckedFlyoutOpen(源 m_isKeyDown 同分支)
 *   (无 CheckedDisabled 态 → 整块规则 :not(.is-disabled),禁用时回落普通 Disabled 链)
 * 交互态色经 SplitButton 既有规则的同名 token 自动生效(hover/pressed 对两区同值,
 *   与源 Checked*PointerOver/Pressed 逐 Setter 一致)。字节序:XAML #AARRGGBB → CSS
 *   #RRGGBBAA(Common_themeresources_any.xaml Light / Default 字典)。
 * ====================================================================== */
.wui-togglesplitbutton.is-checked:not(.is-disabled) {
  /* 背景:AccentFillColorDefault / Secondary(≈SystemAccentColorDark1)/ Tertiary(≈Dark2)。
     accent 为应用层系统色钩子,未定义时回退超链色(README 约定,钩子定义后自动生效) */
  --wui-splitbutton-fill: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  --wui-splitbutton-fill-pointer-over: var(
    --wui-system-accent-color-dark-1,
    var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))
  );
  --wui-splitbutton-fill-pressed: var(
    --wui-system-accent-color-dark-2,
    var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))
  );

  /* 前景:TextOnAccentFillColorPrimary(Light #FFFFFF / Default #000000)、
     TextOnAccentFillColorSecondary(Light #B3FFFFFF / Default #80000000) */
  --wui-splitbutton-foreground: #ffffff;
  --wui-splitbutton-foreground-pointer-over: #ffffff; /* CheckedPointerOver 前景 = Checked 同值(TextOnAccentPrimary) */
  --wui-splitbutton-foreground-pressed: #ffffffb3;
  --wui-splitbutton-foreground-secondary: #ffffff;
  --wui-splitbutton-foreground-secondary-pressed: #ffffffb3;

  /* 边框:AccentControlElevationBorderBrush 1px 近似 ControlStrokeColorOnAccentSecondary
     (Light #66000000 / Default #23000000);按压族色:Primary/SecondaryPressed 保留 accent
     边框(下方 :has 规则恢复),FlyoutOpen / TouchPressed = ControlFillColorTransparent */
  --wui-splitbutton-stroke: #00000066;
  --wui-splitbutton-stroke-pressed: transparent;

  /* 分隔线:SplitButtonBorderBrushCheckedDivider = ControlStrokeColorOnAccentTertiary
     (Light / Default 同值 #37000000) */
  --wui-splitbutton-divider: #00000037;
}

/* 深色档(Default 字典):TextOnAccent / OnAccentStroke 换值;accent 钩子由应用层换档 */
html[data-theme='dark'] .wui-togglesplitbutton.is-checked:not(.is-disabled) {
  --wui-splitbutton-foreground: #000000;
  --wui-splitbutton-foreground-pointer-over: #000000;
  --wui-splitbutton-foreground-pressed: #00000080;
  --wui-splitbutton-foreground-secondary: #000000;
  --wui-splitbutton-foreground-secondary-pressed: #00000080;
  --wui-splitbutton-stroke: #00000023;
  --wui-splitbutton-divider: #00000037;
}

/* CheckedPrimaryPressed / CheckedSecondaryPressed:源边框保留 SplitButtonBorderBrushChecked
   (accent),仅 CheckedFlyoutOpen / CheckedTouchPressed 透明 —— 提级覆盖 SplitButton 的
   按压边框规则;弹层开着时源优先 CheckedFlyoutOpen(边框透明),故排除之 */
.wui-togglesplitbutton.is-checked:not(.is-disabled):not(.is-flyout-open):has(
    .wui-splitbutton-primary:active
  ),
.wui-togglesplitbutton.is-checked:not(.is-disabled):not(.is-flyout-open):has(
    .wui-splitbutton-secondary:active
  ) {
  --wui-splitbutton-stroke-current: var(--wui-splitbutton-stroke);
}
</style>
