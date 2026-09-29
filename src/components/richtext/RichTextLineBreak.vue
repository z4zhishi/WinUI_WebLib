<script setup lang="ts">
// RichTextLineBreak —— XAML 文档模型的行内换行元素(Inline):强制其后内容另起一行,
// 对应 XAML <LineBreak />,渲染为原生 <br>。
defineOptions({ inheritAttrs: false })
</script>

<template>
  <br v-bind="$attrs" class="wui-richtext-linebreak" />
</template>
