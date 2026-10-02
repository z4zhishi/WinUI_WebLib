<script setup lang="ts">
// AppBarButton —— WinUI AppBarButton 的 Web 复刻(命令栏按钮:图标在上/标签在下)。
// 视觉与状态对照源(基准 = WinUI 3 随包主题资源,generic.xaml 为同名模板锚点):
//   CK/WinUI-Reference/controls/dev/CommonStyles/AppBarButton_themeresources.xaml
//   DefaultAppBarButtonStyle(L125 起);dxaml/xcp/dxaml/themes/generic.xaml L19126 起同名 Style:
//   - 尺寸(取 WinUI 3 值):Width=68(L133/L19134);ContentRoot MinHeight={AppBarThemeMinHeight=64}
//     (CommandBar_themeresources.xaml L71;UWP generic.xaml L19461 为 56);
//     ContentViewbox Height={AppBarButtonContentHeight=16}、Margin={AppBarButtonContentViewboxCollapsedMargin=0,16,0,2}
//     (AppBarButton_themeresources.xaml L112;UWP generic.xaml L19463 为 0,12,0,4);
//     TextLabel FontSize=12、Margin={AppBarButtonTextLabelMargin=2,0,2,8}、TextAlignment=Center、TextWrapping=Wrap;
//     KeyboardAcceleratorTextLabel 用 CaptionTextBlockStyle(FontSize=12)、Grid.Column=1、Margin=24,0,12,0、
//     右对齐、VerticalAlignment=Center、默认 Visibility=Collapsed、前景
//     AppBarButtonKeyboardAcceleratorTextForeground(= SystemControlForegroundBaseMediumBrush);
//   - 加速键角标只在「溢出菜单」内呈现:默认样式设 KeyboardAcceleratorPlacementMode=Hidden
//     (AppBarButton_themeresources.xaml L138;generic.xaml L19137 同),
//     运行期仅当 useOverflowStyle(按钮位于溢出区)且键盘存在时才切 KeyboardAcceleratorTextVisible
//     (dxaml/xcp/dxaml/lib/AppBarButtonHelpers.h L201-206),主命令区恒 Collapsed(仅以 Tooltip 提示)。
//     故本组件默认不呈现内联角标;由 CommandBar 溢出层置 --wui-app-bar-accelerator-display:block 后呈现。
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
//   - keyboardAcceleratorText(WinUI KeyboardAcceleratorTextOverride)按源只在溢出菜单
//     (UseOverflowStyle)内以 Caption 字号右对齐呈现,主命令区不呈现(PlacementMode=Hidden,仅 Tooltip);
//     真实按键监听未实现(accelerators 的全局激活属宿主应用行为,见 wiki 差异节)。
// Reveal 揭示光照(MR8,按源默认样式判定为 opt-in):
//   AppBarButtonRevealStyle(generic.xaml L17041)非控件默认样式 —— keyless 默认(L19126)
//   用 AppBarButtonBackground 系非 reveal token;reveal 仅在 CommandBar 内经
//   CommandBarRevealStyle 模板 Grid.Resources 的隐式样式挂接(L16221-16222),而
//   CommandBar 自身默认即 CommandBarRevealStyle(L20206,WinUI 3 无第二种 CommandBar 样式)。
//   故:独立使用默认无光照(reveal prop 缺省关闭),CommandBar 内默认启用(inject,
//   等价源隐式样式作用域);悬停/按压底色 ListLow/ListMedium 与 reveal 系画刷
//   (AppBarButtonRevealBackgroundPointerOver → SystemControlHighlightListLowRevealBackgroundBrush,
//   L1459-1461)同源值,无需状态色切换。光照本体=公共层(reveal.css + useReveal):
//   底板光半径 Clamp(Max(W,H)+12,16,512)(RevealHoverLight.cpp L141-149/L163)、
//   边框光半径 39px(RevealBorderLight.cpp narrow 配置 L24-35)、光环厚度 =
//   AppBarButtonRevealBorderThemeThickness 1(G.xaml L1397)。
import { computed, inject } from 'vue'
import type { CSSProperties } from 'vue'
import { useReveal } from '../composables/useReveal'
import '../styles/reveal.css'

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
    /**
     * 是否启用 reveal 揭示光照(悬浮时跟随指针的底板光 + 1px 边框光环)。
     * 缺省跟随宿主:CommandBar 内默认启用(源 CommandBarRevealStyle 隐式样式,
     * generic.xaml L16221)、独立使用默认关闭(源 keyless 默认样式 L19126 为非 reveal)。
     * 显式设 true/false 强制覆盖。
     */
    reveal?: boolean
  }>(),
  {
    label: '',
    isCompact: false,
    disabled: false,
    keyboardAcceleratorText: '',
    width: 68,
    reveal: undefined,
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

// —— reveal 生效值:显式 prop > CommandBar 上下文(源隐式样式作用域)> 关闭 ——
// CommandBar.vue provide('wuiCommandBarReveal', true);独立使用注入不到 → false。
const inCommandBar = inject<boolean>('wuiCommandBarReveal', false)
const effectiveReveal = computed(() => props.reveal ?? inCommandBar)

// reveal 光照(公共层):指针位置/光斑半径写入根元素 CSS 变量(仅生效、未禁用且
// 指针设备启用);底板光渲染在根 ::before,边框光渲染在 __reveal 层的 ::after
// (根 ::after 已被焦点下划线视觉占用,见模板注释)。
const revealHandlers = useReveal(() => effectiveReveal.value && !props.disabled)

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
    :class="{ 'wui-appbar-button--compact': isCompact, 'wui-reveal': effectiveReveal }"
    :style="widthStyle"
    :disabled="disabled"
    :aria-label="ariaLabel"
    v-bind="$attrs"
    v-on="effectiveReveal ? revealHandlers : undefined"
    @click="onClick"
  >
    <!-- 揭示边框光层(wui-reveal--border 的 ::after 载体):根 ::after 已被焦点下划线
         视觉(:focus-visible 虚线)占用,故边框光环独立成层;变量 --wui-reveal-x/y 由
         useReveal 写在根元素,经继承到达本层。z-index:-1 = 元素背景之上、内容之下(源
         SpotlightLayer 位置)。AppBarButtonRevealBorderThemeThickness = 1(G.xaml L1397) -->
    <span v-if="effectiveReveal" class="wui-appbar-button__reveal wui-reveal--border" aria-hidden="true"></span>
    <!-- 图标列(第 0 行第 * 列):高 16、Margin 0,16,0,2,内容水平居中 -->
    <span class="wui-appbar-button__icon" aria-hidden="true">
      <slot name="icon" />
    </span>
    <!-- 加速键角标(第 0 行 Auto 列):Caption 字号、右对齐、垂直居中、默认 Collapsed
         (KeyboardAcceleratorPlacementMode=Hidden;仅溢出菜单由父级把角标显示变量置为 block 后呈现) -->
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
  min-height: 64px; /* AppBarThemeMinHeight(WinUI 3 = 64;CommandBar_themeresources.xaml L71) */
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

/* 图标列:ContentViewbox Height=16 + AppBarButtonContentViewboxCollapsedMargin=0,16,0,2(WinUI 3) */
.wui-appbar-button__icon {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  margin: 16px 0 2px;
  min-width: 0;
  color: inherit;
  font-size: 16px;
  line-height: 1;
}

/* 加速键角标:KeyboardAcceleratorTextLabel(默认 Visibility=Collapsed —— 样式设
   KeyboardAcceleratorPlacementMode=Hidden;仅溢出区切 KeyboardAcceleratorTextVisible,
   见 AppBarButtonHelpers.h L201-206)。主命令区不占列宽、不压标签:
   默认 display:none 退出网格;父级(CommandBar 溢出层)把 --wui-app-bar-accelerator-display 置为 block 后呈现。
   前景 AppBarButtonKeyboardAcceleratorTextForeground = SystemControlForegroundBaseMediumBrush */
.wui-appbar-button__accelerator {
  display: var(--wui-app-bar-accelerator-display, none);
  grid-column: 2;
  grid-row: 1;
  align-self: center;
  margin: 0 12px 0 24px;
  font-size: 12px; /* CaptionTextBlockStyle FontSize=12 */
  line-height: 1;
  text-align: right;
  color: var(--wui-system-control-foreground-base-medium);
}

/* 标签:TextLabel FontSize=12 + AppBarButtonTextLabelMargin=2,0,2,8、居中、可换行。
   TextWrapping=Wrap 只按词边界折行(仅超宽单词才拆字),故不设 word-break:
   否则 min-content 会塌到 1 字符,角标一旦占列即出现「逐字换行」 */
.wui-appbar-button__label {
  grid-column: 1;
  grid-row: 2;
  margin: 0 2px 8px;
  font-size: 12px; /* 模板内联 FontSize=12 */
  line-height: normal;
  text-align: center;
  overflow-wrap: break-word;
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

/* ======================================================================
 * Reveal 揭示光照(reveal prop / CommandBar 内默认,公共层 reveal.css):
 * ::before 底板光在根(半径由 useReveal 按源公式 Clamp(Max(W,H)+12,16,512) 写入);
 * 边框光在 __reveal 层的 ::after(mask 环)。边框光半径取源 narrow 配置 ≈ 39px
 * (RevealBorderLight.cpp L24-35:128·tan(16.94532°),小尺寸控件同 Button 系口径);
 * 光环厚度 = AppBarButtonRevealBorderThemeThickness 1(G.xaml L1397)。
 * 悬停/按压底色保持 ListLow/ListMedium token:源 reveal 系画刷解析到同源值
 * (AppBarButtonRevealBackgroundPointerOver → SystemControlHighlightListLow*Reveal*,
 * L1459-1461),故无状态色切换。
 * ====================================================================== */
.wui-appbar-button.wui-reveal {
  --wui-reveal-border-width: 1px;
  --wui-reveal-border-radius: 39px;
}

.wui-appbar-button__reveal {
  position: absolute;
  inset: 0;
  z-index: -1; /* 元素背景之上、内容之下(源 SpotlightLayer 叠放位) */
  border-radius: inherit;
  pointer-events: none;
}
</style>
