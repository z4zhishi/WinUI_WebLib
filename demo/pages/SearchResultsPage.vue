<script setup lang="ts">
// 搜索结果页(阶段 8 站点收尾):querystring `?q=` 参数驱动,按 catalog 的
// id/标题/副标题/描述/标签/分组标题检索(检索口径在 demo/data/search.ts,
// 与首页搜索框、顶栏搜索入口三处共用)。结果卡片点击进入 /<id> 示例页;
// 空查询与无结果两种空态用 InfoBar 呈现。文案全部走 i18n chrome 键。
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WuiAutoSuggestBox from '@/components/AutoSuggestBox.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiInfoBar from '@/components/InfoBar.vue'
import type { AutoSuggestQuerySubmittedEventArgs } from '@/components/AutoSuggestBox.vue'
import { controlGlyph } from '../data/controlIcons'
import { searchCatalog, suggestControls } from '../data/search'
import type { CatalogFlatItem } from '../data/search'
import type { CatalogItem } from '../data/catalog'
import { useDemoI18n } from '../components/labels'

const i18n = useDemoI18n()
const route = useRoute()
const router = useRouter()

// —— 查询参数(route.query.q 响应式;/search 与 /searchresults 两路径等价)——
const query = computed<string>(() => {
  const raw = route.query.q
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return typeof raw[0] === 'string' ? raw[0] : ''
  return ''
})

// —— 结果(量级 120,computed 重算即可)——
const results = computed<CatalogFlatItem[]>(() => searchCatalog(query.value))

// —— 页内搜索框:以当前 q 初始化;提交回写 querystring(replace 不堆历史)——
const searchText = ref(query.value)
watch(query, (value) => {
  searchText.value = value
})

const suggestions = computed<CatalogItem[]>(() => suggestControls(searchText.value))

/** 最近一次选中的建议(AutoSuggestBox:suggestionChosen 先于 querySubmitted)。 */
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
  const next = args.queryText.trim()
  if (next !== '') {
    router.replace({ path: '/search', query: { q: next } })
  }
}

// —— 卡片摘要:副标题优先,缺失回退描述 ——
function cardLead(entry: CatalogFlatItem): string {
  return entry.item.subtitle !== undefined && entry.item.subtitle !== ''
    ? entry.item.subtitle
    : entry.item.description
}
</script>

<template>
  <section class="search-page">
    <header class="search-header">
      <h1 class="search-title">{{ i18n.t('searchTitle') }}</h1>
      <p class="search-count">{{ i18n.t('searchResultCount', { count: results.length }) }}</p>
    </header>

    <div class="search-box-row">
      <WuiAutoSuggestBox
        v-model:text="searchText"
        class="search-box"
        style="width: 360px; max-width: 100%"
        :items-source="suggestions"
        display-member-path="title"
        query-icon="Find"
        :header="i18n.t('navSearch')"
        :placeholder-text="i18n.t('searchPlaceholder')"
        :no-results-text="i18n.t('searchNoResults', { query: searchText })"
        @suggestion-chosen="onSuggestionChosen"
        @query-submitted="onSearchSubmitted"
      />
      <span class="search-scope">{{ i18n.t('searchNoResultsHint') }}</span>
    </div>

    <!-- 空查询:引导输入 -->
    <WuiInfoBar
      v-if="query.trim() === ''"
      is-open
      :is-closable="false"
      :title="i18n.t('navSearch')"
      :message="i18n.t('searchNoQuery')"
      :close-button-aria-label="i18n.t('close')"
    />

    <!-- 无结果:提示换词 -->
    <WuiInfoBar
      v-else-if="results.length === 0"
      is-open
      severity="Warning"
      :is-closable="false"
      :message="i18n.t('searchNoResults', { query })"
      :close-button-aria-label="i18n.t('close')"
    />

    <ul v-else class="result-list">
      <li v-for="entry in results" :key="entry.item.id">
        <router-link class="result-card" :to="`/${entry.item.id}`">
          <span class="result-icon" aria-hidden="true">
            <WuiFontIcon :glyph="controlGlyph(entry.item, entry.group)" :font-size="20" />
          </span>
          <span class="result-body">
            <span class="result-title">
              <span class="result-name">{{ entry.item.title }}</span>
              <span class="result-group">{{ entry.group.title }}</span>
            </span>
            <span class="result-lead">{{ cardLead(entry) }}</span>
          </span>
        </router-link>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.search-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--wui-application-foreground-theme);
}

/* ---- 页头 ---- */
.search-header {
  margin: 0;
}

.search-title {
  margin: 0;
  font-size: var(--wui-text-style-extra-large-font-size);
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
}

.search-count {
  margin: 8px 0 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* ---- 搜索框(宽度走内联 style:scoped 类对子组件根不可靠) ---- */
.search-box-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-scope {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* ---- 结果列表 ---- */
.result-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.result-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: var(--wui-application-page-background-theme);
  color: inherit;
  text-decoration: none;
}

.result-card:hover {
  border-color: var(--wui-system-control-background-base-medium);
  background: var(--wui-system-control-background-list-low);
}

.result-card:active {
  background: var(--wui-system-control-background-list-medium);
}

.result-card:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.result-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  color: var(--wui-system-control-hyperlink-text);
  background: var(--wui-system-control-background-list-low);
}

.result-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.result-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.result-name {
  overflow: hidden;
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-group {
  flex: 0 0 auto;
  padding: 1px 8px;
  overflow: hidden;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.result-lead {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
