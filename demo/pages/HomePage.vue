<script setup lang="ts">
// 首页(阶段 8 站点收尾):控件总览 —— 按 catalog 分组渲染全部控件卡片
// (FontIcon 图标 + 标题 + 副标题/描述,isNew 控件带 InfoBadge「新」徽标),
// 点击卡片进入 /<id> 示例页;顶部搜索框与顶栏搜索入口、搜索结果页共用
// 同一检索口径(demo/data/search.ts),提交带 querystring 跳 /search?q=。
// 文案全部走 i18n chrome 键(demo/i18n/locales/*.ts,六语言齐全);
// 样式一律 --wui-* token,明暗随 html[data-theme]。
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import WuiAutoSuggestBox from '@/components/AutoSuggestBox.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiInfoBadge from '@/components/InfoBadge.vue'
import type { AutoSuggestQuerySubmittedEventArgs } from '@/components/AutoSuggestBox.vue'
import { CATALOG, GROUP_COUNT, ITEM_COUNT } from '../data/catalog'
import type { CatalogGroup, CatalogItem } from '../data/catalog'
import { controlGlyph } from '../data/controlIcons'
import { suggestControls } from '../data/search'
import { useDemoI18n } from '../components/labels'

const i18n = useDemoI18n()
const router = useRouter()

// —— 搜索框(与顶栏入口/结果页三处联动)——
const searchText = ref('')
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
  const query = args.queryText.trim()
  if (query !== '') {
    router.push({ path: '/search', query: { q: query } })
  }
}

// —— 卡片文案:副标题(源 Subtitle)优先,缺失回退描述;长度交给 CSS 收敛 ——
function cardLead(item: CatalogItem): string {
  return item.subtitle !== undefined && item.subtitle !== '' ? item.subtitle : item.description
}

// 分组渲染顺序与侧栏一致:普通组在前,isSpecialSection 组(Fundamentals 等)排最后。
const navGroups = computed<CatalogGroup[]>(() => [
  ...CATALOG.filter((group) => !group.isSpecialSection),
  ...CATALOG.filter((group) => group.isSpecialSection),
])
</script>

<template>
  <section class="home-page">
    <header class="home-header">
      <h2 class="home-title">{{ i18n.t('homeTitle') }}</h2>
      <p class="home-subtitle">{{ i18n.t('homeSubtitle') }}</p>
      <p class="home-stats">{{ i18n.t('homeStats', { groups: GROUP_COUNT, items: ITEM_COUNT }) }}</p>
    </header>

    <div class="home-search">
      <WuiAutoSuggestBox
        v-model:text="searchText"
        class="home-search-box"
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
    </div>

    <section
      v-for="group in navGroups"
      :key="group.id"
      class="home-group"
      :aria-label="group.title"
    >
      <h3 class="home-group-title">{{ group.title }}</h3>
      <div class="home-cards">
        <router-link
          v-for="item in group.items"
          :key="item.id"
          class="control-card"
          :to="`/${item.id}`"
        >
          <span class="control-card-icon" aria-hidden="true">
            <WuiFontIcon :glyph="controlGlyph(item, group)" :font-size="20" />
          </span>
          <span class="control-card-body">
            <span class="control-card-title">
              <span class="control-card-name">{{ item.title }}</span>
              <WuiInfoBadge v-if="item.isNew" class="control-card-badge" padding="0 6px">
                {{ i18n.t('homeNewBadge') }}
              </WuiInfoBadge>
            </span>
            <span class="control-card-lead">{{ cardLead(item) }}</span>
          </span>
        </router-link>
      </div>
    </section>
  </section>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--wui-application-foreground-theme);
}

/* ---- 页头 ---- */
.home-header {
  margin: 0;
}

.home-title {
  margin: 0;
  font-size: var(--wui-text-style-extra-large-font-size);
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
}

.home-subtitle {
  margin: 8px 0 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.home-stats {
  margin: 4px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* ---- 搜索框(宽度走内联 style:scoped 类对子组件根不可靠) ---- */
.home-search {
  display: flex;
}

/* ---- 分组 ---- */
.home-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.home-group-title {
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
  font-size: var(--wui-list-view-header-item-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* ---- 卡片栅格:窄屏自动降列 ---- */
.home-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

/* ---- 控件卡片:图标 + 标题 + 摘要,整卡可点 ---- */
.control-card {
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

.control-card:hover {
  border-color: var(--wui-system-control-background-base-medium);
  background: var(--wui-system-control-background-list-low);
}

.control-card:active {
  background: var(--wui-system-control-background-list-medium);
}

.control-card:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.control-card-icon {
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

.control-card-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.control-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
}

.control-card-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.control-card-badge {
  flex: 0 0 auto;
}

.control-card-lead {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
