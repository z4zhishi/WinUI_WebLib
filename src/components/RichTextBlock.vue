<script setup lang="ts">
// RichTextBlock —— WinUI RichTextBlock 的 Web 复刻:富文本展示容器(XAML 文档模型 slot 方案)。
// 视觉对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L13286 起:
// BaseRichTextBlockStyle(FontSize 14 / FontWeight SemiBold / TextTrimming None /
// TextWrapping Wrap / LineStackingStrategy MaxHeight / TextLineBounds Full /
// OpticalMarginAlignment TrimSideBearings),BodyRichTextBlockStyle 仅把 FontWeight 覆写为
// Normal(body 观感传 font-weight="Normal" 即可)。RichTextBlock 非 ControlTemplate 控件,
// 无视觉状态树,颜色只有前景(--wui-application-foreground-theme)。
// 文档模型:默认 slot 承载 richtext/ 目录的 RichTextParagraph(块级)与 RichTextRun/
// RichTextBold/RichTextItalic/RichTextUnderline/RichTextSpan/RichTextHyperlink/
// RichTextLineBreak(行内)子组件,与 XAML Blocks/Inline 模型的映射见 wiki/controls/RichTextBlock.md。
// 溢出:WinUI 的 OverflowContentTarget 链接容器/分页在 Web 排版下不适用,简化为单容器
// maxHeight + Scroll/Clip 行为(wiki「溢出模型(简化)」节)。
import { computed } from 'vue'
import {
  toCssFontWeight,
  toCssLength,
  toCssTextAlign,
  type TextAlignmentValue,
  type TextWrappingValue,
} from './richtext/textFormatting'

const props = withDefaults(
  defineProps<{
    /** 字体族,原样作为 CSS font-family;缺省 XamlAutoFontFamily 占位 token。 */
    fontFamily?: string
    /** 字号:数字按 px;缺省 14(BaseRichTextBlockStyle)。 */
    fontSize?: number | string
    /** 字重:WinUI FontWeight 名或 1–950 数值;缺省 SemiBold(BaseRichTextBlockStyle)。 */
    fontWeight?: string | number
    /** 前景色;缺省 --wui-application-foreground-theme。 */
    foreground?: string
    /** 容器级文本对齐;缺省 Left。 */
    textAlignment?: TextAlignmentValue
    /** 换行模式;缺省 Wrap(BaseRichTextBlockStyle)。 */
    textWrapping?: TextWrappingValue
    /** 容器级行高(LineHeight);数字按 px,缺省 CSS normal。 */
    lineHeight?: number | string
    /** 是否允许选择文本(WinUI 富文本默认可选择);缺省 true。 */
    isTextSelectionEnabled?: boolean
    /** 单容器高度上限;超出部分按 overflowBehavior 处理(溢出简化的 Web 方案)。 */
    maxHeight?: number | string
    /** 溢出行为:Scroll 单容器内滚动 / Clip 裁剪 / Visible 溢出显示;缺省 Clip。 */
    overflowBehavior?: 'Visible' | 'Scroll' | 'Clip'
  }>(),
  {
    textAlignment: 'Left',
    textWrapping: 'Wrap',
    isTextSelectionEnabled: true,
    overflowBehavior: 'Clip',
  },
)

defineOptions({ inheritAttrs: false })

// —— 排版归一(与 TextBlock.vue 同规则):数值 → px,名称查表;缺省值走 CSS 类,不写 inline ——
const rootStyle = computed(() => ({
  fontFamily: props.fontFamily,
  fontSize: toCssLength(props.fontSize),
  fontWeight: toCssFontWeight(props.fontWeight),
  color: props.foreground,
  lineHeight: toCssLength(props.lineHeight),
  maxHeight: toCssLength(props.maxHeight),
  textAlign: toCssTextAlign(props.textAlignment),
}))

const rootClass = computed(() => [
  'wui-richtextblock',
  `wui-richtextblock--wrap-${props.textWrapping.toLowerCase()}`,
  `wui-richtextblock--overflow-${props.overflowBehavior.toLowerCase()}`,
  {
    'wui-richtextblock--unselectable': !props.isTextSelectionEnabled,
  },
])
</script>

<template>
  <!-- 富文本容器:无业务事件;display 控件无交互态样式;class/style 经 $attrs 透传 -->
  <div v-bind="$attrs" :class="rootClass" :style="rootStyle"><slot /></div>
</template>

<style scoped>
.wui-richtextblock {
  min-width: 0;
  font-family: var(--wui-content-control-theme-font-family);
  /* BaseRichTextBlockStyle:FontSize=14(= ControlContentThemeFontSize token) */
  font-size: var(--wui-control-content-theme-font-size);
  /* BaseRichTextBlockStyle:FontWeight=SemiBold;Body 观感用 font-weight="Normal" 覆盖 */
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
  text-align: left;
  /* 富文本内容默认可选择(WinUI RichTextBlock 行为) */
  user-select: text;
  -webkit-user-select: text;
}

.wui-richtextblock--unselectable {
  user-select: none;
  -webkit-user-select: none;
}

/* —— TextWrapping(与 TextBlock.vue 同映射)—— */
.wui-richtextblock--wrap-nowrap {
  white-space: nowrap;
}

.wui-richtextblock--wrap-wrap {
  white-space: normal;
  overflow-wrap: break-word;
}

.wui-richtextblock--wrap-wrapwholewords {
  white-space: normal;
  overflow-wrap: normal;
}

/* —— 溢出行为(Web 简化:单容器内滚动或裁剪,替代 WinUI 的链接容器分页)—— */
.wui-richtextblock--overflow-scroll {
  overflow-y: auto;
  overflow-x: hidden;
}

.wui-richtextblock--overflow-clip {
  overflow: hidden;
}

.wui-richtextblock--overflow-visible {
  overflow: visible;
}
</style>
