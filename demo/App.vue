<script setup lang="ts">
// 示例站外壳:顶栏(appName + 搜索入口 + 主题三档切换 + 语言切换)、侧栏目录导航
// (目录数据缓存,isSpecialSection 组排在最后)、主内容区 <router-view> 与页脚统计。
// 全部文案走 i18n 键(导航组/item 标题用 catalog 自身 title,语言自称与页脚统计除外);
// 样式全部使用 --wui-* token(入口已引入 theme.css),明暗由 useThemeSetting 写入的
// html[data-theme] 驱动。例外:壳层基色 token --wui-solid-background-fill-color-base
// 在下方全局块按 WinUI 3 SolidBackgroundFillColorBase 定义(theme.css 抽取源无此键,
// 取值与依据见全局块注释)。
// FIX26(构成检查收尾):顶栏主题切换 button.theme-option → 库内 WuiToggleButton、
// 语言下拉 select.lang-select → 库内 WuiComboBox,壳层不再有裸原生交互件。
import { computed, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import WuiAutoSuggestBox from '@/components/AutoSuggestBox.vue'
import type { AutoSuggestQuerySubmittedEventArgs } from '@/components/AutoSuggestBox.vue'
import WuiComboBox from '@/components/ComboBox.vue'
import WuiToggleButton from '@/components/ToggleButton.vue'
import { CATALOG, ITEM_COUNT } from './data/catalog'
import type { CatalogGroup, CatalogItem } from './data/catalog'
import { suggestControls } from './data/search'
import { LOCALES, useI18n } from './i18n'
import type { Locale } from './i18n'
import { useThemeSetting } from './composables/useThemeSetting'

const i18n = useI18n()
const { t, locale } = i18n

const { mode, setMode } = useThemeSetting()

// 同步 <html lang>,利于无障碍与浏览器字体选择。
watchEffect(() => {
  document.documentElement.lang = locale.value
})

// 主题三档(light/dark/system),文案随界面语言更新。
// FIX26:原生 button → 库内 WuiToggleButton。checked 双向模型保持互斥激活:
// set(false)(点击已激活档)不落底,档位不变,与原 aria-pressed 分段按钮语义一致
// (模式同 demo/components/DemoPage.vue 的 FIX23 主题预览切换)。
const lightChecked = computed<boolean>({
  get: () => mode.value === 'light',
  set: (checked) => {
    if (checked) setMode('light')
  },
})

const darkChecked = computed<boolean>({
  get: () => mode.value === 'dark',
  set: (checked) => {
    if (checked) setMode('dark')
  },
})

const systemChecked = computed<boolean>({
  get: () => mode.value === 'system',
  set: (checked) => {
    if (checked) setMode('system')
  },
})

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

// FIX26:原生 select → 库内 WuiComboBox。locale ↔ selectedIndex 换算,选择即 setLocale
// (语言切换联动与持久化保持不变;ComboBox 对程序化赋值也会回调 selectionChanged,
// 回调里 setLocale 同值赋值为无副作用操作,不构成环)。
const localeIndex = computed(() => LOCALES.indexOf(locale.value))

function onLocaleSelectionChanged(index: number): void {
  const next = LOCALES[index]
  if (next) i18n.setLocale(next)
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
          <WuiToggleButton v-model:checked="lightChecked" class="theme-option">
            {{ t('themeLight') }}
          </WuiToggleButton>
          <WuiToggleButton v-model:checked="darkChecked" class="theme-option">
            {{ t('themeDark') }}
          </WuiToggleButton>
          <WuiToggleButton v-model:checked="systemChecked" class="theme-option">
            {{ t('themeSystem') }}
          </WuiToggleButton>
        </div>
        <div class="lang-field">
          <span class="lang-label">{{ t('settingsLanguage') }}</span>
          <WuiComboBox
            class="lang-select"
            :items="localeOptions"
            display-member-path="label"
            :selected-index="localeIndex"
            :aria-label="t('settingsLanguage')"
            @selection-changed="onLocaleSelectionChanged"
          />
        </div>
      </div>
    </header>

    <div class="layout">
      <nav class="nav" :aria-label="t('navLabel')">
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
  /*
   * 壳层超链接达标色(TS1 壳层 a11y,axe color-contrast):
   * --wui-hyperlink-button-foreground = SystemAccentColor #0078D4,在浅色底(#F2F2F2)
   * 上对比度仅 4.05:1(WCAG AA 正文阈值 4.5:1),故壳层链接改用 WinUI 强调色
   * 深色变体 SystemAccentColorDark1 #0067C0(theme-hooks.css
   * --wui-system-accent-color-dark-1),对比度 5.07:1。
   */
  --wui-shell-hyperlink-foreground: var(--wui-system-accent-color-dark-1, #0067c0);
}

:root[data-theme="dark"] {
  --wui-solid-background-fill-color-base: #202020;
  /*
   * 深色主题超链接改用 SystemAccentColorLight2 #4CC2FF(theme-hooks.css
   * --wui-system-accent-color-light-2):系统强调色 #0078D4 在页脚底 #2B2B2B 上
   * 仅 3.13:1,不达标;#4CC2FF 上 #2B2B2B 为 7.06:1(内容底 #202020 为 8.12:1)。
   */
  --wui-shell-hyperlink-foreground: var(--wui-system-accent-color-light-2, #4cc2ff);
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

/* 主题三档切换(FIX26:控件本体是 WuiToggleButton)——激活 = 组件内置 checked
   视觉(强调色底白字,aria-pressed 由组件给出);壳层只保留紧凑排版,父级限定
   稳定压过组件根 padding(同 DemoPage.vue FIX23 注)。 */
.theme-switch {
  display: inline-flex;
  gap: 4px;
}

.theme-switch .theme-option {
  padding: 3px 10px;
}

.lang-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lang-label {
  color: var(--wui-application-secondary-foreground-theme);
}

/* 语言下拉(FIX26:控件本体是 WuiComboBox,视觉/四态/下拉面板全部走组件内置样式)。 */

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

/* 壳层链接达标色(--wui-shell-hyperlink-foreground,定义见全局块注释):
   浅色 #0067C0(5.07:1)/ 深色 #4CC2FF(≥7:1);hover 两主题均 ≥5.5:1 达标,
   :active 为瞬时按压反馈,保持 WinUI 提取值不改。 */
.footer-link {
  color: var(--wui-shell-hyperlink-foreground);
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
