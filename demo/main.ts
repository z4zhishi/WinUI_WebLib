// 示例站入口:创建应用 → 注入 i18n(先于挂载,全树可 useI18n)→ 注册路由 → 挂载,
// 并在此引入主题 token 样式表(明暗由 html[data-theme] 驱动,见 demo/composables/useThemeSetting.ts)。
import { createApp } from 'vue'
import App from './App.vue'
import { createI18n, detectLocale, i18nKey } from './i18n'
import router from './router'
import '../src/styles/theme.css'
import '../src/styles/theme-hooks.css' // 系统色钩子默认值层(需在 theme.css 之后)
import '../src/styles/popup.css' // 弹层公共层(层级 token/皮肤/动画类)
import '../src/styles/focus-visual.css' // 系统焦点视觉(双环)共享层 token/工具类
import '../src/styles/reveal.css' // Reveal 揭示光照公共层(wui-reveal 类/语义门;组件内亦各自引入)

const app = createApp(App)

// 说明:i18n 模块的 provideI18n() 依赖组件 setup 上下文(其 README 亦注明“在根组件 setup 中提供”),
// 入口处挂载前的等价官方 API 是应用级 provide():同样向全树提供实例,App.vue 内 useI18n() 正常取用。
app.provide(i18nKey, createI18n(detectLocale()))
app.use(router)
app.mount('#app')
