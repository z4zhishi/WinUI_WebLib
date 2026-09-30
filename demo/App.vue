<script setup lang="ts">
// 示例站外壳:顶栏(appName + 搜索入口 + 主题三档切换 + 语言切换)、侧栏目录导航
// (目录数据缓存,isSpecialSection 组排在最后)、主内容区 <router-view> 与页脚统计。
// 全部文案走 i18n 键(导航组/item 标题用 catalog 自身 title,语言自称与页脚统计除外);
// 样式全部使用 --wui-* token(入口已引入 theme.css),明暗由 useThemeSetting 写入的
// html[data-theme] 驱动。例外:壳层基色 token --wui-solid-background-fill-color-base
// 在下方全局块按 WinUI 3 SolidBackgroundFillColorBase 定义(theme.css 抽取源无此键,
// 取值与依据见全局块注释)。
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import WuiAutoSuggestBox from '@/components/AutoSuggestBox.vue'
import type { AutoSuggestQuerySubmittedEventArgs } from '@/components/AutoSuggestBox.vue'
import { CATALOG, ITEM_COUNT } from './data/catalog'
import type { CatalogGroup, CatalogItem } from './data/catalog'
import { suggestControls } from './data/search'
import { LOCALES, useI18n } from './i18n'
import type { Locale } from './i18n'
import { useThemeSetting } from './composables/useThemeSetting'
import type { ThemeMode } from './composables/useThemeSetting'

const i18n = useI18n()
const { t, locale } = i18n

const { mode, setMode } = useThemeSetting()

// 同步 <html lang>,利于无障碍与浏览器字体选择。
watchEffect(() => {
  document.documentElement.lang = locale.value
})

// 主题三档(light/dark/system),文案随界面语言更新。
const themeOptions = computed<{ value: ThemeMode; label: string }[]>(() => [
  { value: 'light', label: t('themeLight') },
  { value: 'dark', label: t('themeDark') },
  { value: 'system', label: t('themeSystem') },
])

// 各语言的自称(本地语言原文,不随界面语言翻译)。
const LOCALE_LABELS: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  fr: 'Français',
  ko: '한국어',
}
const localeOptions = LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value] }))

function onLocaleChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  if ((LOCALES as readonly string[]).includes(value)) {
    i18n.setLocale(value as Locale)
  }
}

// 目录导航数据(computed 缓存):普通组在前,isSpecialSection 组排在最后。
const navGroups = computed<CatalogGroup[]>(() => [
  ...CATALOG.filter((group) => !group.isSpecialSection),
  ...CATALOG.filter((group) => group.isSpecialSection),
])

// —— 顶栏搜索入口:候选与搜索结果页共用 suggestControls 口径(阶段 8 站点收尾)。
// 提交路径:点击建议 / 高亮建议后 Enter 直达控件页(提交文本=建议标题),
// 其余(自由文本 Enter / 查询按钮)带 querystring 跳 /search?q=,与首页搜索框联动。
const router = useRouter()
const searchText = ref('')
const searchSuggestions = computed<CatalogItem[]>(() => suggestControls(searchText.value))

/** 最近一次选中的建议(suggestionChosen 先于 querySubmitted 触发,作单次暂存)。 */
let chosenEntry: CatalogItem | null = null

function onSuggestionChosen(entry: unknown): void {
  chosenEntry = (entry ?? null) as CatalogItem | null
}

function onSearchSubmitted(args: AutoSuggestQuerySubmittedEventArgs): void {
  const entry = chosenEntry
  chosenEntry = null
  if (entry && args.queryText === entry.title) {
    router.push(`/${entry.id}`)
    return
  }
  const query = args.queryText.trim()
  if (query !== '') {
    router.push({ path: '/search', query: { q: query } })
  }
}
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar-title">{{ t('appName') }}</div>
      <div class="topbar-actions">
        <WuiAutoSuggestBox
          v-model:text="searchText"
          class="topbar-search"
          style="width: 240px"
          :items-source="searchSuggestions"
          display-member-path="title"
          query-icon="Find"
          :placeholder-text="t('searchPlaceholder')"
          :no-results-text="t('searchNoResults', { query: searchText })"
          @suggestion-chosen="onSuggestionChosen"
          @query-submitted="onSearchSubmitted"
        />
        <div class="theme-switch" role="group" :aria-label="t('settingsTitle')">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            class="theme-option"
            :class="{ 'theme-option-active': mode === option.value }"
            :aria-pressed="mode === option.value"
            @click="setMode(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <label class="lang-field">
          <span class="lang-label">{{ t('settingsLanguage') }}</span>
          <select
            class="lang-select"
            :value="locale"
            :aria-label="t('settingsLanguage')"
            @change="onLocaleChange"
          >
            <option v-for="option in localeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>
    </header>

    <div class="layout">
      <nav class="nav">
        <router-link class="nav-item nav-home" to="/home">{{ t('navHome') }}</router-link>
        <div v-for="group in navGroups" :key="group.id" class="nav-group">
          <div class="nav-group-title">{{ group.title }}</div>
          <!-- 页面未实现的链接由路由 catch-all 兜底回 /home,属预期。 -->
          <router-link
            v-for="item in group.items"
            :key="item.id"
            class="nav-item"
            :to="`/${item.id}`"
          >
            {{ item.title }}
          </router-link>
        </div>
      </nav>

      <main class="content">
        <router-view />
      </main>
    </div>

    <footer class="footer">
      <span>{{ t('settingsItemsCount') }}: {{ ITEM_COUNT }}</span>
      <span class="footer-sep" aria-hidden="true">·</span>
      <router-link class="footer-link" to="/settings">{{ t('navSettings') }}</router-link>
    </footer>
  </div>
</template>

<style>
/*
 * 全局:页面底色随主题,避免暗色下滚动露白;body 默认外边距清零。
 * 基色取 WinUI 3 实际呈现值 SolidBackgroundFillColorBase
 * (CK/WinUI-Reference/controls/dev/CommonStyles/Common_themeresources_any.xaml
 *  L272 Light #F3F3F3 / L68 Default #202020;T7-SystemBackdrops 同源核对)。
 * theme.css 的 --wui-application-page-background-theme 是 UWP 经典值
 * (generic.xaml Default #FF000000 / Light #FFFFFFFF),为忠实提取不改值,
 * 仅作控件级画刷使用;壳层基色按 WinUI 3 Fluent 观感走本 token(视觉 QA 批次 A)。
 */
:root,
:root[data-theme="light"] {
  --wui-solid-background-fill-color-base: #f3f3f3;
}

:root[data-theme="dark"] {
  --wui-solid-background-fill-color-base: #202020;
}

html {
  background: var(--wui-solid-background-fill-color-base);
}
body {
  margin: 0;
}
</style>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: var(--wui-phone-font-family-normal), system-ui, sans-serif;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  /* 壳层基色:SolidBackgroundFillColorBase(定义见上方全局块),暗 #202020 / 浅 #F3F3F3。 */
  background: var(--wui-solid-background-fill-color-base);
}

/* ---- 顶栏 ---- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 8px 16px;
  background: var(--wui-system-control-page-background-chrome-medium-low);
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
  color: var(--wui-application-header-foreground-theme);
}

.topbar-title {
  font-size: var(--wui-text-style-large-font-size);
  font-weight: 600;
}

.topbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

/* 顶栏搜索入口宽度走内联 style(控件根经 $attrs 透传;scoped 类对子组件根不可靠) */
.topbar-search {
  max-width: 100%;
}

.theme-switch {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.theme-option {
  appearance: none;
  margin: 0;
  padding: 4px 10px;
  border: 0;
  font: inherit;
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-transparent);
  cursor: pointer;
}

.theme-option + .theme-option {
  border-left: 1px solid var(--wui-system-control-background-base-low);
}

.theme-option:hover {
  color: var(--wui-application-pointer-over-foreground-theme);
  background: var(--wui-system-control-background-list-low);
}

.theme-option-active {
  color: var(--wui-application-header-foreground-theme);
  background: var(--wui-system-control-background-list-medium);
  font-weight: 600;
}

.lang-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lang-label {
  color: var(--wui-application-secondary-foreground-theme);
}

.lang-select {
  padding: 4px 8px;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  font: inherit;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-page-background-chrome-medium-low);
  cursor: pointer;
}

/* ---- 主体布局:侧栏 + 内容 ---- */
.layout {
  display: flex;
  flex: 1;
  align-items: stretch;
}

.nav {
  flex: 0 0 auto;
  width: 240px;
  padding: 12px 8px 24px;
  overflow-y: auto;
  background: var(--wui-navigation-view-expanded-pane-background);
}

.nav-home {
  margin-bottom: 12px;
}

.nav-group + .nav-group {
  margin-top: 16px;
}

.nav-group-title {
  padding: 4px 10px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--wui-application-secondary-foreground-theme);
}

.nav-item {
  display: block;
  padding: 6px 10px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  color: var(--wui-application-foreground-theme);
  text-decoration: none;
}

.nav-item:hover {
  background: var(--wui-system-control-background-list-low);
  color: var(--wui-application-pointer-over-foreground-theme);
}

.nav-item.router-link-active {
  color: var(--wui-application-header-foreground-theme);
  background: var(--wui-system-control-background-list-medium);
  font-weight: 600;
}

.content {
  flex: 1;
  min-width: 0;
  padding: 20px 24px;
}

/* ---- 页脚 ---- */
.footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid var(--wui-system-control-background-base-low);
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-page-background-chrome-medium-low);
}

.footer-link {
  color: var(--wui-hyperlink-button-foreground);
  text-decoration: underline;
}

.footer-link:hover {
  color: var(--wui-hyperlink-button-foreground-pointer-over);
}

.footer-link:active {
  color: var(--wui-hyperlink-button-foreground-pressed);
}

/* ---- 窄屏:纯 CSS 折叠侧栏 ---- */
@media (max-width: 767px) {
  .nav {
    display: none;
  }
}
</style>
