<script setup lang="ts">
// 示例站外壳。约束:demo 的全部界面元素必须使用主项目(src)控件构建,以保证风格一致。
// 语言切换入口(右上角)与整体布局待控件落地后在此搭建。
</script>

<template>
  <main class="shell">
    <h1>WinUI_WebLib</h1>
    <p>示例站骨架已就绪:示例页位于 demo/pages,新增 *Page.vue 会自动注册为路由。</p>
    <router-view />
  </main>
</template>

<style scoped>
.shell {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px;
  font-family: 'Segoe UI', system-ui, sans-serif;
}
</style>
