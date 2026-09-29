<script setup lang="ts">
// RichTextParagraph —— XAML 文档模型的段落块级元素(RichTextBlock.Blocks 集合的默认子项)。
// WinUI Paragraph 属性默认:Margin=0(段落之间无额外间距,连续段落紧贴),
// TextAlignment 未设置时继承容器的 textAlignment。子组件只承载段落级排版,
// 行内格式(Run/Bold/Hyperlink 等)放进默认 slot。
// LineStackingStrategy(WinUI 行堆叠策略)简化为 CSS line-height,差异见 wiki。
import { computed } from 'vue'
import { toCssLength, toCssTextAlign, type TextAlignmentValue } from './textFormatting'

const props = defineProps<{
  /** 首行缩进(TextIndent);数字按 px,字符串原样作为 CSS 长度。 */
  textIndent?: number | string
  /** 段落行高(LineHeight);数字按 px,字符串原样;未设置时继承容器。 */
  lineHeight?: number | string
  /** 段后间距(Paragraph.Margin 的单值近似);数字按 px,默认 0(WinUI 段落默认无间距)。 */
  margin?: number | string
  /** 段内文本对齐;未设置时继承容器 textAlignment。 */
  textAlignment?: TextAlignmentValue
}>()

defineOptions({ inheritAttrs: false })

const paragraphStyle = computed(() => ({
  textIndent: toCssLength(props.textIndent),
  lineHeight: toCssLength(props.lineHeight),
  marginBottom: toCssLength(props.margin),
  textAlign: toCssTextAlign(props.textAlignment),
}))
</script>

<template>
  <!-- 块级段落:格式由容器级联继承,自身只写段落级排版 -->
  <p v-bind="$attrs" class="wui-richtext-paragraph" :style="paragraphStyle"><slot /></p>
</template>

<style scoped>
.wui-richtext-paragraph {
  /* WinUI Paragraph 默认 Margin=0:段落间距由 margin prop 显式给 */
  margin: 0;
  min-width: 0;
}
</style>
