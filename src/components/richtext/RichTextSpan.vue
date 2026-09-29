<script setup lang="ts">
// RichTextSpan —— XAML 文档模型的行内容器(Inline 容器):对 slot 内的一组行内元素统一施加字符格式,
// 是 Bold/Italic/Underline/Hyperlink 的基类语义。自身不改变文字外观,只做格式级联。
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
  /** 文本高亮底色;任意 CSS 颜色。 */
  highlight?: string
  /** 字距(CharacterSpacing,XAML 单位 1/1000 em)。 */
  characterSpacing?: number
}>()

defineOptions({ inheritAttrs: false })

const spanStyle = computed(() => ({
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
  <span v-bind="$attrs" class="wui-richtext-span" :style="spanStyle"><slot /></span>
</template>

<style scoped>
.wui-richtext-span {
  min-width: 0;
}
</style>
