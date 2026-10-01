<script setup lang="ts">
// 文档表格:呈现「属性/事件 | 类型 | 说明」等开发向固定文档。
// 纯展示组件:headers 与 rows 由示例页给齐,行列数不匹配时按实际内容渲染。
defineProps<{
  /** 表头,如 ['属性 / 事件', '类型', '说明']。 */
  headers: string[]
  /** 行数据;每行的列数建议与 headers 一致。 */
  rows: (string | number)[][]
}>()
</script>

<template>
  <!-- tabindex=0:横向滚动区域键盘可达(a11y QA scrollable-region-focusable) -->
  <div class="table-scroll" tabindex="0">
    <table class="docs-table">
      <thead>
        <tr>
          <th v-for="(header, i) in headers" :key="`h-${i}`" scope="col">{{ header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, r) in rows" :key="`r-${r}`">
          <td v-for="(cell, c) in row" :key="`c-${c}`" :class="{ 'cell-member': c === 0 }">
            {{ cell }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.docs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  text-align: left;
}

.docs-table th {
  padding: 8px 12px;
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.docs-table td {
  padding: 8px 12px;
  vertical-align: top;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.docs-table tbody tr:hover {
  background: var(--wui-system-control-background-list-low);
}

.docs-table tbody tr:last-child td {
  border-bottom: none;
}

/* 首列(成员名)用等宽字体突出 */
.cell-member {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  color: var(--wui-application-header-foreground-theme);
}
</style>
