<script setup lang="ts">
// AppBarButton —— WinUI AppBarButton 的 Web 复刻(命令栏按钮:图标在上/标签在下)。
// 视觉与状态对照源:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   L19126 起 <Style TargetType="AppBarButton">(默认 Style,非 AppBarButtonRevealStyle):
//   - 尺寸:Width=68;ContentRoot MinHeight={AppBarThemeMinHeight=56};
//     ContentViewbox Height={AppBarButtonContentHeight=16}、Margin={AppBarButtonContentViewboxCollapsedMargin=0,12,0,4};
//     TextLabel FontSize=12、Margin={AppBarButtonTextLabelMargin=2,0,2,8}、TextAlignment=Center、TextWrapping=Wrap;
//     KeyboardAcceleratorTextLabel 用 CaptionTextBlockStyle(FontSize=12)、Margin=24,0,12,0、右对齐、
//     前景 AppBarButtonKeyboardAcceleratorTextForeground(= SystemControlForegroundBaseMediumBrush);
//   - 颜色(generic.xaml L1667-L1677 / L1894-L1897,Light 与 Dark 主题同名键):
//     Background/AppBarButtonBackground=SystemControlTransparentBrush(全透明,悬停按下列表高亮),
//     PointerOver=SystemControlHighlightListLowBrush、Pressed=SystemControlHighlightListMediumBrush、
//     Disabled=透明;Foreground=SystemControlForegroundBaseHighBrush,PointerOver/Pressed=SystemControlHighlightAltBaseHighBrush,
//     Disabled=SystemControlDisabledBaseMediumLowBrush;BorderBrush 各态均为透明(模板内
//     AppBarButtonInnerBorder Rectangle Stroke 恒透明,不产生可见描边);
//   - 五态 Normal/PointerOver/Pressed/Disabled/Focus:前四态经 VisualState.Setters 即时切换,无过渡动画。
// 焦点视觉:任务规格要求旧版「EllipsisFocusVisual」下划线聚焦视觉的近似(旧 UWP 命令栏省略号按钮的
//   虚线下划线焦点矩形;WinUI 3 参照源中已无该资源,改用 UseSystemFocusVisuals 系统双环),本组件按任务
//   要求以 :focus-visible 的虚线下划线近似实现,并取系统焦点色(差异记录 wiki)。
// 行为规格:
//   - Content 在 AppBarButton 中被忽略(catalog description:「The Content property is ignored」),
//     图标经 #icon slot 承载(FontIcon / SymbolIcon / PathIcon / 任意内容),label 属性为文字标签;
//   - isCompact(WinUI IsCompact)→ ApplicationViewStates 的 Compact 态:TextLabel Collapsed,仅剩图标;
//   - click 事件(WinUI Click):原生 button 的 Space/Enter 激活同样触发,禁用时不触发;
//   - keyboardAcceleratorText(WinUI KeyboardAcceleratorTextOverride)在右上角以 Caption 字号显示
//     加速键角标;真实按键监听未实现( accelerators 的全局激活属宿主应用行为,见 wiki 差异节)。
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 图标下方的文字标签(WinUI Label);isCompact 时隐藏。 */
    label?: string
    /** 紧凑态(WinUI IsCompact):仅显示图标、隐藏标签(Compact 视觉态)。 */
    isCompact?: boolean
    /** 是否禁用(对应 WinUI IsEnabled)。 */
    disabled?: boolean
    /** 加速键角标文本(WinUI KeyboardAcceleratorTextOverride,如 'Ctrl+S');空串不显示。 */
    keyboardAcceleratorText?: string
    /** 按钮宽度(WinUI Width);缺省 68(默认 Style 的 Width=68)。 */
    width?: number | string
  }>(),
  {
    label: '',
    isCompact: false,
    disabled: false,
    keyboardAcceleratorText: '',
    width: 68,
  },
)

// 显式声明 click:外部 @click 监听不再经 $attrs 透传到根节点,避免原生 click 重复触发。
const emit = defineEmits<{
  /** 点击按钮(WinUI Click;Space/Enter 同样触发,禁用时不触发)。 */
  click: [event: MouseEvent]
}>()

defineOptions({
  // class/style 由根节点 v-bind="$attrs" 透传,其余 attrs(aria-* 等)一并透传。
  inheritAttrs: false,
})

// —— 宽度解析:WinUI Width → CSS width ——
const widthStyle = computed<CSSProperties>(() => {
  const value = props.width
  return { width: typeof value === 'number' ? `${value}px` : value }
})

// a11y:图标即按钮本体,Compact 态下标签 display:none 会退出无障碍树,
// 固定以 Label 作为可访问名(等价 WinUI 由 Label 派生 AutomationName)。
const ariaLabel = computed(() => (props.label !== '' ? props.label : undefined))

function onClick(event: MouseEvent): void {
  emit('click', event)
}
</script>

<template>
  <!-- 原生 button 自带 Space/Enter 激活与 role="button" 语义,键盘可达性免费获得 -->
  <button
    type="button"
    class="wui-appbar-button"
    :class="{ 'wui-appbar-button--compact': isCompact }"
    :style="widthStyle"
    :disabled="disabled"
    :aria-label="ariaLabel"
    v-bind="$attrs"
    @click="onClick"
  >
    <!-- 图标列(第 0 行第 * 列):高 16、Margin 0,12,0,4,内容水平居中 -->
    <span class="wui-appbar-button__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <!-- 加速键角标(第 0 行 Auto 列):Caption 字号、右对齐、垂直居中 -->
    <span v-if="keyboardAcceleratorText !== ''" class="wui-appbar-button__accelerator">{{
      keyboardAcceleratorText
    }}</span>
    <!-- 标签(第 1 行):12px、居中、可换行;Compact 态 Collapsed -->
    <span class="wui-appbar-button__label">{{ label }}</span>
  </button>
</template>

<style scoped>
.wui-appbar-button {
  /* 网格对照模板 ContentRoot:第 0 行 = 图标(*)+ 加速键角标(Auto),第 1 行 = 标签 */
  display: inline-grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  box-sizing: border-box;
  min-height: 56px; /* AppBarThemeMinHeight */
  padding: 0;
  font-family: var(--wui-content-control-theme-font-family);
  font-weight: 400;
  /* AppBarButtonBackground = SystemControlTransparentBrush;BorderBrush 全态透明 */
  color: var(--wui-system-control-foreground-base-high);
  background: var(--wui-system-control-transparent);
  border: none;
  /* WinUI 3 默认 ControlCornerRadius = 4;无同名 token,取最近似的圆角 token(见 wiki 差异节) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  cursor: default;
  user-select: none;
  touch-action: manipulation;
  position: relative;
}

/* 图标列:ContentViewbox Height=16 + AppBarButtonContentViewboxCollapsedMargin=0,12,0,4 */
.wui-appbar-button__icon {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  margin: 12px 0 4px;
  min-width: 0;
  color: inherit;
  font-size: 16px;
  line-height: 1;
}

/* 加速键角标:KeyboardAcceleratorTextLabel,Caption(12px)、Margin 24,0,12,0、右对齐垂直居中;
   前景 AppBarButtonKeyboardAcceleratorTextForeground = SystemControlForegroundBaseMediumBrush */
.wui-appbar-button__accelerator {
  grid-column: 2;
  grid-row: 1;
  align-self: center;
  margin: 0 12px 0 24px;
  font-size: 12px; /* CaptionTextBlockStyle FontSize=12 */
  line-height: 1;
  text-align: right;
  color: var(--wui-system-control-foreground-base-medium);
}

/* 标签:TextLabel FontSize=12 + AppBarButtonTextLabelMargin=2,0,2,8、居中、可换行 */
.wui-appbar-button__label {
  grid-column: 1;
  grid-row: 2;
  margin: 0 2px 8px;
  font-size: 12px; /* 模板内联 FontSize=12 */
  line-height: normal;
  text-align: center;
  overflow-wrap: break-word;
  word-break: break-word;
  color: inherit;
}

/* 紧凑态(ApplicationViewStates → Compact):TextLabel Collapsed,仅剩图标 */
.wui-appbar-button--compact .wui-appbar-button__label {
  display: none;
}

/* 状态色一律即时切换(generic.xaml 各态经 VisualState.Setters 直接改属性,无过渡动画):
   PointerOver 背景 = SystemControlHighlightListLowBrush,前景 = SystemControlHighlightAltBaseHighBrush */
.wui-appbar-button:hover:not(:disabled) {
  color: var(--wui-system-control-highlight-alt-base-high);
  background: var(--wui-system-control-highlight-list-low);
}

/* Pressed 背景 = SystemControlHighlightListMediumBrush,前景同 PointerOver */
.wui-appbar-button:active:not(:disabled) {
  color: var(--wui-system-control-highlight-alt-base-high);
  background: var(--wui-system-control-highlight-list-medium);
}

/* Disabled:背景透明、前景 SystemControlDisabledBaseMediumLowBrush(图标/标签随 currentColor 继承) */
.wui-appbar-button:disabled {
  color: var(--wui-system-control-disabled-base-medium-low);
  background: var(--wui-system-control-transparent);
  cursor: default;
}

/* Disabled 角标前景单独覆盖:角标不随 currentColor 继承,源 L1897 显式设
   KeyboardAcceleratorTextLabel.Foreground =
   AppBarButtonKeyboardAcceleratorTextForegroundDisabled(SystemControlDisabledBaseMediumLowBrush) */
.wui-appbar-button:disabled .wui-appbar-button__accelerator {
  color: var(--wui-system-control-disabled-base-medium-low);
}

/* 焦点视觉:旧 UWP「EllipsisFocusVisual」下划线聚焦视觉近似 —— 虚线下划线,取系统焦点色
   (WinUI 3 参照源已无该资源、默认走系统双环,差异见 wiki 差异节);仅键盘聚焦(:focus-visible)显示 */
.wui-appbar-button:focus-visible {
  outline: none;
}

.wui-appbar-button:focus-visible::after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 3px;
  left: 4px;
  border-bottom: 2px dashed var(--wui-system-control-focus-visual-primary);
  pointer-events: none;
}

.wui-appbar-button:focus:not(:focus-visible) {
  outline: none;
}
</style>
