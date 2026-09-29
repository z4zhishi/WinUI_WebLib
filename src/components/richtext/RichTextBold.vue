<script setup lang="ts">
// RichTextBold —— XAML 文档模型的行内加粗元素(Inline):slot 内文字以 Bold(700)呈现,
// 等价于 <Run FontWeight="Bold"> 的语义化写法。
defineOptions({ inheritAttrs: false })
</script>

<template>
  <strong v-bind="$attrs" class="wui-richtext-bold"><slot /></strong>
</template>

<style scoped>
.wui-richtext-bold {
  /* XAML Bold = FontWeights.Bold(700);显式声明避免浏览器 bolder 相对加粗的歧义 */
  font-weight: 700;
}
</style>
