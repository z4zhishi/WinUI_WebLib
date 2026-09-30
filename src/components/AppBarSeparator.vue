<script setup lang="ts">
// AppBarSeparator.vue —— WinUI AppBarSeparator 的 Web 复刻:命令栏(命令按钮)之间
// 的分组竖分隔线,带 compact(紧凑)态边距收窄与溢出(Overflow)横向样式。
//
// 视觉与状态对照源(CK/WinUI-Reference):
// 1. controls/dev/CommonStyles/AppBarSeparator_themeresources.xaml(WinUI 3 随包主题资源,主要依据):
//    - Rectangle Width=AppBarSeparatorWidth(1)、RadiusX/Y=AppBarSeparatorCornerRadius(0.5)、
//      VerticalAlignment=Stretch、Margin=TemplateBinding Padding=AppBarSeparatorMargin(2,8,2,8,左上右下);
//    - Compact 态:RootGrid.Height=AppBarThemeCompactHeight(48,见 CommandBar_themeresources.xaml)+
//      VerticalAlignment=Top —— 分隔线不再拉伸填满命令栏,收窄为 48px 顶对齐(边距收窄的效果即来自此);
//    - Overflow 态:Rectangle Width→Stretch、Height=AppBarOverflowSeparatorHeight(1)、
//      Margin=AppBarOverflowSeparatorMargin(0,4,0,4)—— 变为溢出区的横向细分隔线;
// 2. dxaml/xcp/dxaml/themes/generic.xaml L6476 起 TargetType="AppBarSeparator"(UWP 口径锚点):
//    竖线几何(Width/Height/Margin)与 ApplicationViewStates 分组的出处;其 Foreground 档
//    (SystemControlForegroundBaseMediumLowBrush)在 WinUI 3 资源里仅对应 HighContrast 档。
//
// 颜色源(WinUI 3 随包资源):AppBarSeparatorForeground = DividerStrokeColorDefaultBrush
//   (AppBarSeparator_themeresources.xaml Default/Light 字典),源值见 Common_themeresources_any.xaml:
//   - Light 字典:#0F000000(XAML AARRGGBB → CSS #RRGGBBAA 写作 #0000000f,≈5.9% 黑);
//   - Default(dark)字典:#15FFFFFF(→ #ffffff15,≈8.2% 白)。
// theme.css 未提取该 token,按 InfoBar 先例以 scoped 局部 token 携带源值(含 dark 档);
// SystemControlForegroundBaseMediumLow 在源中仅属 AppBarSeparator 的 HighContrast 档,不作为常规档取色。
//
// 语义与状态:非交互装饰件(WinUI 模板 IsTabStop=False,无 PointerOver/Pressed/Disabled 视觉状态),
// 不声明业务事件;role="separator" + aria-orientation(vertical;溢出样式下为 horizontal)。
// 非拉伸上下文(非 flex 行)兜底 min-height: 48px(WinUI 中它总在 CommandBar 的 ≥compact 高度行内)。
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 是否以 compact(紧凑)态渲染(对应 WinUI IsCompact):高度收窄到 AppBarThemeCompactHeight(48px)并顶部对齐。 */
    isCompact?: boolean
    /** 是否套用溢出(Overflow)样式(对应 WinUI UseOverflowStyle):变为 1px 横向分隔线。 */
    useOverflowStyle?: boolean
    /** 分隔线颜色,任意 CSS 颜色或 --wui-* 变量(对应 WinUI Foreground);缺省用官方源值局部 token(DividerStrokeColorDefault,浅/深双档)。 */
    foreground?: string
  }>(),
  {
    isCompact: false,
    useOverflowStyle: false,
  },
)

defineOptions({ name: 'WuiAppBarSeparator', inheritAttrs: false })

// WinUI ChangeVisualState 顺序:UseOverflowStyle → Overflow,其次 IsCompact → Compact,否则 FullSize;
// 溢出样式优先级更高,故 aria-orientation 与 CSS 均以溢出态为先。
const orientation = computed(() => (props.useOverflowStyle ? 'horizontal' : 'vertical'))

// Foreground 覆盖经 CSS 变量注入,缺省回退主题 token。
const rootStyle = computed<CSSProperties>(() =>
  props.foreground !== undefined
    ? { '--wui-app-bar-separator-local-foreground': props.foreground }
    : {},
)
</script>

<template>
  <div
    class="wui-app-bar-separator"
    :class="{ 'is-compact': isCompact, 'is-overflow': useOverflowStyle }"
    :style="rootStyle"
    role="separator"
    :aria-orientation="orientation"
    v-bind="$attrs"
  >
    <div class="wui-app-bar-separator-line"></div>
  </div>
</template>

<style scoped>
/* 外层 = 模板 RootGrid + Rectangle 的 Margin(Padding):XAML Thickness 2,8,2,8 → CSS 上/下 8、左/右 2。
   display:flex + 默认 align-self:stretch,让分隔线在命令栏 flex 行里拉伸填满行高(FullSize 态)。 */
.wui-app-bar-separator {
  display: flex;
  box-sizing: border-box;
  padding: 8px 2px;
  min-height: 48px; /* AppBarThemeCompactHeight:非拉伸上下文的可见性兜底 */
  /* AppBarSeparatorForeground ← DividerStrokeColorDefaultBrush(light 字典 #0F000000
     → CSS #RRGGBBAA 写作 #0000000f,≈5.9% 黑);theme.css 未提取,局部 token 携带源值(InfoBar 先例) */
  --wui-app-bar-separator-foreground: #0000000f;
}

/* 深色主题(Default 字典):#15FFFFFF → #ffffff15(≈8.2% 白)。
   主题前缀选择器保证在深色下稳定压过浅色基线(同 InfoBar 的特异性约定)。 */
html[data-theme='dark'] .wui-app-bar-separator {
  --wui-app-bar-separator-foreground: #ffffff15;
}

/* 内层 = SeparatorRectangle:Width=1、Radius=0.5、VerticalAlignment=Stretch、Fill=Foreground */
.wui-app-bar-separator-line {
  flex: none;
  width: 1px;
  align-self: stretch;
  border-radius: 0.5px;
  background: var(
    --wui-app-bar-separator-local-foreground,
    var(--wui-app-bar-separator-foreground)
  );
}

/* Compact 态:RootGrid.Height=48 + VerticalAlignment=Top —— 收窄为 48px 顶对齐 */
.wui-app-bar-separator.is-compact {
  height: 48px;
  align-self: flex-start;
}

/* Overflow 态:横向分隔线,Margin=0,4,0,4、Height=1、HorizontalAlignment=Stretch;
   优先级高于 Compact(WinUI ChangeVisualState 先判 UseOverflowStyle) */
.wui-app-bar-separator.is-overflow {
  display: block;
  height: auto;
  align-self: stretch;
  padding: 4px 0;
  min-height: 0;
}

.wui-app-bar-separator.is-overflow .wui-app-bar-separator-line {
  width: auto;
  height: 1px;
}
</style>
