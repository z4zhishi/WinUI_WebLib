<script setup lang="ts">
// RichTextRun —— XAML 文档模型的行内文本片段(Run/Inline):对一段文字施加字符级格式,
// 对应官方示例「formatted text」的写法(<Run FontStyle="Italic" FontWeight="Bold">)。
// 字体属性未设置时从 RichTextBlock 容器级联继承。
// highlight 对应 WinUI TextHighlighter(背景高亮,文字色不变),官方示例四的 Web 等价。
import { computed } from 'vue'
import {
  toCssCharacterSpacing,
  toCssFontStyle,
  toCssFontWeight,
  toCssLength,
  toCssTextDecoration,
  type FontStyleValue,
  type TextDecorationsValue,
} from './textFormatting'

const props = defineProps<{
  /** 片段文本;提供默认 slot 时以 slot 内容优先(便于再嵌套行内子组件)。 */
  text?: string
  /** 字重:WinUI FontWeight 名(Thin…ExtraBlack)或 1–950 数值;默认继承容器。 */
  fontWeight?: string | number
  /** 字形;Normal 即继承容器默认。 */
  fontStyle?: FontStyleValue
  /** 字号;数字按 px,未设置时继承容器。 */
  fontSize?: number | string
  /** 字体族;未设置时继承容器。 */
  fontFamily?: string
  /** 前景色(任意 CSS 颜色/变量);未设置时继承容器。 */
  foreground?: string
  /** 装饰线(TextDecorations):Underline / Strikethrough。 */
  textDecorations?: TextDecorationsValue
  /** 文本高亮底色(TextHighlighter 近似);任意 CSS 颜色,文字颜色不变。 */
  highlight?: string
  /** 字距(CharacterSpacing,XAML 单位 1/1000 em,50 = 0.05em)。 */
  characterSpacing?: number
}>()

defineOptions({ inheritAttrs: false })

const runStyle = computed(() => ({
  fontWeight: toCssFontWeight(props.fontWeight),
  fontStyle: toCssFontStyle(props.fontStyle),
  fontSize: toCssLength(props.fontSize),
  fontFamily: props.fontFamily,
  color: props.foreground,
  textDecorationLine: toCssTextDecoration(props.textDecorations),
  letterSpacing: toCssCharacterSpacing(props.characterSpacing),
  backgroundColor: props.highlight,
}))
</script>

<template>
  <span v-bind="$attrs" class="wui-richtext-run" :style="runStyle">
    <slot>{{ text }}</slot>
  </span>
</template>

<style scoped>
.wui-richtext-run {
  /* 行内片段不产生额外盒模型;换行处高亮逐行闭合(近似 TextHighlighter 的逐行绘制) */
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
</style>
