// 示例页自动注册:demo/pages 下的 *Page.vue 按文件名生成路由(HomePage.vue → /home)。
// 新增控件示例页只需将文件放入该目录,无需手动登记路由。
import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'

const pageLoaders = import.meta.glob<{ default: Component }>('./pages/*Page.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/home' },
  ...Object.entries(pageLoaders).map(([file, component]) => {
    const name = file.replace('./pages/', '').replace(/Page\.vue$/, '')
    return { path: `/${name.toLowerCase()}`, name, component }
  }),
  // 站点搜索页(阶段 8):规范入口 /search?q=。文件名自动路由是 /searchresults,
  // 这里补一条同组件路由,首页/顶栏搜索与外链统一走 /search(两路径等价)。
  { path: '/search', name: 'Search', component: () => import('./pages/SearchResultsPage.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/home' },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
})
