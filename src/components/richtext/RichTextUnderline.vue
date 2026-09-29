<script setup lang="ts">
// RichTextUnderline —— XAML 文档模型的行内下划线元素(Inline):slot 内文字加下划线,
// 等价于 <Run TextDecorations="Underline"> 的语义化写法。
defineOptions({ inheritAttrs: false })
</script>

<template>
  <u v-bind="$attrs" class="wui-richtext-underline"><slot /></u>
</template>

<style scoped>
.wui-richtext-underline {
  /* XAML Underline = TextDecorations.Underline;显式声明不依赖 u 的浏览器默认 */
  text-decoration-line: underline;
}
</style>
