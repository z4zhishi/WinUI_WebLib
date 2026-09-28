<script setup lang="ts">
// 参数面板容器:栅格布局,容纳 DemoOptionRow 或任意选项控件。
// 列数 1–4(越界收敛),窄视口自动降为单列。
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 栅格列数,默认 2;超出 1–4 范围时收敛到边界。 */
    columns?: number
  }>(),
  { columns: 2 },
)

const columnCount = computed(() => Math.min(4, Math.max(1, Math.round(props.columns))))

const gridStyle = computed<CSSProperties>(() => ({
  '--demo-options-columns': String(columnCount.value),
}))
</script>

<template>
  <div class="options-grid" :style="gridStyle">
    <slot />
  </div>
</template>

<style scoped>
.options-grid {
  display: grid;
  grid-template-columns: repeat(var(--demo-options-columns, 2), minmax(0, 1fr));
  gap: 12px 32px;
}

@media (max-width: 720px) {
  .options-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
