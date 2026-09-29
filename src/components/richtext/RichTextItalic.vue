<script setup lang="ts">
// RichTextItalic —— XAML 文档模型的行内斜体元素(Inline):slot 内文字以 Italic 呈现,
// 等价于 <Run FontStyle="Italic"> 的语义化写法。
defineOptions({ inheritAttrs: false })
</script>

<template>
  <em v-bind="$attrs" class="wui-richtext-italic"><slot /></em>
</template>

<style scoped>
.wui-richtext-italic {
  /* XAML Italic = FontStyle.Italic;显式声明不依赖 em 的浏览器默认 */
  font-style: italic;
}
</style>
