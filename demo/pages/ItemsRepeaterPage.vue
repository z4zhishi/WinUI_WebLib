<script setup lang="ts">
// ItemsRepeater 示例页:对照官方 WinUI Gallery ItemsRepeaterPage
// (HorizontalBarTemplate 滚动列表 + MyFeedLayout 虚拟化长列表 + UniformGridLayout 内容墙),
// 核心演示虚拟化:万级数据只渲染可见窗口 + 上下缓冲项,实时回显 DOM 渲染计数。
// 上半区交互演示 + 参数面板,下半区为属性、事件与用法代码(结构照抄已通过 QA 的 ListViewPage 母版)。
import { computed, ref, watch } from 'vue'
import WuiItemsRepeater from '@/components/ItemsRepeater.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'
import type {
  GridItemsJustification,
  GridItemsStretch,
  LayoutOrientation,
  StackLayoutOptions,
  UniformGridLayoutOptions,
} from '@/utils/collectionLayouts'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ItemsRepeater', en: 'ItemsRepeater' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI ItemsRepeater 控件示例:支持虚拟化的原语级数据布局控件。三个演示分别对照官方示例——万级数据滚动(实时显示 DOM 渲染项数)、混合高度 StackLayout(两轴切换)与 UniformGridLayout 大图墙;滚动时窗口外的项被回收,只渲染可视区加缓冲。',
  en: 'WinUI ItemsRepeater examples: a primitive, virtualization-ready data layout control. Three demos mirror the official gallery — 10,000-item scrolling (live DOM render count), mixed-height StackLayout (both axes) and a UniformGridLayout image wall; off-window elements are recycled while scrolling.',
}
const GROUP_VIRTUALIZATION: BilingualText = { zh: '万级数据滚动(10000 项,DOM 只渲染窗口内项)', en: '10,000-item scrolling (DOM renders only the window)' }
const GROUP_MIXED: BilingualText = { zh: '混合高度 StackLayout(纵向/横向两轴,对照官方 Bar 示例)', en: 'Mixed-height StackLayout (vertical/horizontal, official bar sample)' }
const GROUP_WALL: BilingualText = { zh: 'UniformGridLayout 大图墙(对照官方内容墙示例)', en: 'UniformGridLayout image wall (official content-wall sample)' }
const LABEL_COUNT: BilingualText = { zh: '数据量', en: 'Item count' }
const LABEL_ITEM_SIZE: BilingualText = { zh: '项高 itemSize', en: 'itemSize' }
const LABEL_SPACING: BilingualText = { zh: '间距 spacing', en: 'spacing' }
const LABEL_CACHE: BilingualText = { zh: '缓冲项数 cacheItemCount', en: 'cacheItemCount' }
const LABEL_AXIS: BilingualText = { zh: '排列轴 orientation(滚动轴相反)', en: 'orientation (scroll axis is the inverse)' }
const LABEL_WALL_WIDTH: BilingualText = { zh: 'minItemWidth', en: 'minItemWidth' }
const LABEL_WALL_HEIGHT: BilingualText = { zh: 'minItemHeight', en: 'minItemHeight' }
const LABEL_WALL_SPACING: BilingualText = { zh: '行/列间距', en: 'row/column spacing' }
const LABEL_JUSTIFY: BilingualText = { zh: 'itemsJustification', en: 'itemsJustification' }
const LABEL_STRETCH: BilingualText = { zh: 'itemsStretch', en: 'itemsStretch' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupVirtualization = useBilingual(i18n, GROUP_VIRTUALIZATION)
const groupMixed = useBilingual(i18n, GROUP_MIXED)
const groupWall = useBilingual(i18n, GROUP_WALL)
const labelCount = useBilingual(i18n, LABEL_COUNT)
const labelItemSize = useBilingual(i18n, LABEL_ITEM_SIZE)
const labelSpacing = useBilingual(i18n, LABEL_SPACING)
const labelCache = useBilingual(i18n, LABEL_CACHE)
const labelAxis = useBilingual(i18n, LABEL_AXIS)
const labelWallWidth = useBilingual(i18n, LABEL_WALL_WIDTH)
const labelWallHeight = useBilingual(i18n, LABEL_WALL_HEIGHT)
const labelWallSpacing = useBilingual(i18n, LABEL_WALL_SPACING)
const labelJustify = useBilingual(i18n, LABEL_JUSTIFY)
const labelStretch = useBilingual(i18n, LABEL_STRETCH)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

/** DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。 */
type OptionValue = string | number | boolean

function toNumber(value: OptionValue, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** 与控件一致的布局配置类型(WinUI Layout:StackLayout / UniformGridLayout)。 */
type RepeaterLayout = ({ type: 'stack' } & StackLayoutOptions) | ({ type: 'uniform' } & UniformGridLayoutOptions)

const isZh = computed(() => i18n.locale.value.startsWith('zh'))

/* -------------------------------------------------------------------------
 * 演示一:万级数据滚动(核心虚拟化演示,实时回显 DOM 渲染计数)
 * ---------------------------------------------------------------------- */

interface FeedItem {
  id: number
  title: string
}

function buildFeed(count: number): FeedItem[] {
  return Array.from({ length: count }, (_, index) => ({ id: index, title: `Item ${index}` }))
}

const feedCount = ref<OptionValue>(10000)
const feedItems = ref<unknown[]>(buildFeed(10000))
const feedItemSize = ref<OptionValue>(48)
const feedSpacing = ref<OptionValue>(4)
const feedCache = ref<OptionValue>(3)

const feedItemSizeValue = computed(() => toNumber(feedItemSize.value, 48))
const feedSpacingValue = computed(() => toNumber(feedSpacing.value, 4))
const feedCacheValue = computed(() => Math.max(0, Math.trunc(toNumber(feedCache.value, 3))))
const feedLayout = computed<RepeaterLayout>(() => ({
  type: 'stack',
  orientation: 'vertical',
  spacing: feedSpacingValue.value,
}))

watch(feedCount, (value) => {
  // 换数据源:重建数组(索引即身份),窗口/计数随事件自动归位
  feedItems.value = buildFeed(Math.max(0, Math.trunc(toNumber(value, 10000))))
})

// 渲染计数:由 elementPrepared / elementClearing 维护「当前在窗口内的索引集合」
const feedLive = new Set<number>()
const feedRendered = ref(0)
const feedWindowStart = ref(-1)
const feedWindowEnd = ref(-1)

function refreshFeedEcho(): void {
  feedRendered.value = feedLive.size
  let min = -1
  let max = -1
  for (const index of feedLive) {
    if (min === -1 || index < min) min = index
    if (index > max) max = index
  }
  feedWindowStart.value = min
  feedWindowEnd.value = max
}

function onFeedPrepared(index: number): void {
  feedLive.add(index)
  refreshFeedEcho()
}

function onFeedCleared(index: number): void {
  feedLive.delete(index)
  refreshFeedEcho()
}

/* -------------------------------------------------------------------------
 * 演示二:混合高度 StackLayout(声明式 itemSize 函数 + 两轴切换)
 * ---------------------------------------------------------------------- */

function buildMixed(count: number): { id: number }[] {
  return Array.from({ length: count }, (_, index) => ({ id: index }))
}

// 混合高度:确定性伪随机,5 档高度 56/84/112/140/168(布局按声明值精确计算)
function mixedSizeOf(index: number): number {
  return 56 + ((index * 37) % 5) * 28
}

const mixedItems = ref<unknown[]>(buildMixed(2000))
const mixedAxis = ref<OptionValue>('vertical')
const mixedAxisValue = computed<LayoutOrientation>(() =>
  String(mixedAxis.value) === 'horizontal' ? 'horizontal' : 'vertical',
)
const mixedLayout = computed<RepeaterLayout>(() => ({ type: 'stack', orientation: mixedAxisValue.value, spacing: 8 }))

/* -------------------------------------------------------------------------
 * 演示三:UniformGridLayout 大图墙(1200 项,参数面板实时调节)
 * ---------------------------------------------------------------------- */

interface WallItem {
  id: number
  hue: number
}

function buildWall(count: number): WallItem[] {
  // 黄金角散列 hue,配合 accent 底色 + hue-rotate 得到多彩图墙(无硬编码色值)
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    hue: Math.round((index * 137.508) % 360),
  }))
}

const wallItems = ref<unknown[]>(buildWall(1200))
const wallWidth = ref<OptionValue>(108)
const wallHeight = ref<OptionValue>(108)
const wallSpacing = ref<OptionValue>(12)
const wallJustify = ref<OptionValue>('start')
const wallStretch = ref<OptionValue>('none')

const JUSTIFICATIONS: readonly GridItemsJustification[] = [
  'start', 'center', 'end', 'spaceBetween', 'spaceAround', 'spaceEvenly',
]

function toJustification(value: OptionValue): GridItemsJustification {
  const raw = String(value)
  return (JUSTIFICATIONS as readonly string[]).includes(raw) ? (raw as GridItemsJustification) : 'start'
}

function toStretch(value: OptionValue): GridItemsStretch {
  const raw = String(value)
  return raw === 'fill' || raw === 'uniform' ? raw : 'none'
}

const wallLayout = computed<RepeaterLayout>(() => ({
  type: 'uniform',
  minItemWidth: toNumber(wallWidth.value, 108),
  minItemHeight: toNumber(wallHeight.value, 108),
  minRowSpacing: toNumber(wallSpacing.value, 12),
  minColumnSpacing: toNumber(wallSpacing.value, 12),
  itemsJustification: toJustification(wallJustify.value),
  itemsStretch: toStretch(wallStretch.value),
}))

// 图墙渲染计数(与演示一同机制,证明网格布局同样窗口化)
const wallLive = new Set<number>()
const wallRendered = ref(0)

function onWallPrepared(index: number): void {
  wallLive.add(index)
  wallRendered.value = wallLive.size
}

function onWallCleared(index: number): void {
  wallLive.delete(index)
  wallRendered.value = wallLive.size
}

/* -------------------------------------------------------------------------
 * 下半区固定开发文档
 * ---------------------------------------------------------------------- */

const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['items (v-model)', 'unknown[]', '[]', '数据源数组(WinUI ItemsSource),元素可为字符串/数字/对象;变化时布局与可见窗口自动重算'],
  ['layout', "{ type: 'stack', ... } | { type: 'uniform', ... }", "{ type: 'stack' }", "布局配置(WinUI Layout):stack 支持 orientation / spacing(对照 StackLayout,默认纵向);uniform 支持 minItemWidth / minItemHeight / minRowSpacing / minColumnSpacing / maximumRowsOrColumns / itemsJustification / itemsStretch(对照 UniformGridLayout,默认横向排列)"],
  ['itemSize', 'number | ((index, item) => number)', '40', 'StackLayout 每项主轴尺寸(px;纵向为高、横向为宽)。纯函数布局无实测阶段,内容真实主轴尺寸应与声明一致;uniform 布局用 minItemWidth/minItemHeight,不用本属性'],
  ['cacheItemCount', 'number', '3', '可见窗口上/下(左/右)各多渲染的缓冲项数;0 = 只渲染可视区(WinUI 无同名属性,近似 CacheLength 的 Web 化)'],
  ['#default slot', "{ item: unknown; index: number }", '—', '项模板(WinUI ItemTemplate,即 content property);缺省渲染 String(item)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['elementPrepared', '(index: number, item: unknown)', '项进入虚拟化窗口、元素生成时(WinUI ElementPrepared 的简化签名)'],
  ['elementClearing', '(index: number, item: unknown)', '项离开窗口、元素被回收时(WinUI ElementClearing 的简化签名)'],
  ['update:items', '(value: unknown[])', 'items 双向绑定的更新事件'],
]

const usageCode = `<WuiItemsRepeater
  :items="feed"
  :layout="{ type: 'stack', orientation: 'vertical', spacing: 4 }"
  :item-size="48"
  :cache-item-count="3"
  style="height: 400px; border: 1px solid var(--wui-system-control-background-base-low)"
  @element-prepared="onPrepared"
  @element-clearing="onCleared"
>
  <template #default="{ item, index }">
    <div class="row">{{ item.title }} · #{{ index }}</div>
  </template>
</WuiItemsRepeater>

<!-- UniformGridLayout 图墙(参数同 WinUI UniformGridLayout) -->
<WuiItemsRepeater
  :items="wall"
  :layout="{
    type: 'uniform',
    minItemWidth: 108, minItemHeight: 108,
    minRowSpacing: 12, minColumnSpacing: 12,
    itemsJustification: 'start', itemsStretch: 'none',
  }"
  style="height: 480px"
/>`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ItemsRepeater">
    <template #demo>
      <div class="repeater-stage">
        <!-- 演示一:万级数据滚动 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupVirtualization }}</h4>
          <p class="demo-stats">
            {{ isZh ? '数据' : 'Items' }}: {{ feedItems.length }}
            · {{ isZh ? '当前窗口' : 'Window' }}: [{{ feedWindowStart }} – {{ feedWindowEnd }}]
            · <strong class="stats-accent">{{ isZh ? 'DOM 渲染' : 'DOM rendered' }}: {{ feedRendered }}</strong>
          </p>
          <WuiItemsRepeater
            v-model:items="feedItems"
            :layout="feedLayout"
            :item-size="feedItemSizeValue"
            :cache-item-count="feedCacheValue"
            class="repeater-frame"
            style="height: 400px"
            @element-prepared="onFeedPrepared"
            @element-clearing="onFeedCleared"
          >
            <template #default="{ item }">
              <div class="feed-row">
                <span class="feed-id">#{{ (item as FeedItem).id }}</span>
                <span class="feed-title">{{ (item as FeedItem).title }}</span>
              </div>
            </template>
          </WuiItemsRepeater>
          <p class="demo-hint">
            {{ isZh
              ? '滚动列表:DOM 渲染计数只随「窗口 + 缓冲」变化,不随数据量增长;调大缓冲项数观察计数变化。'
              : 'Scroll the list: the DOM count follows the window + buffer only, regardless of data size; raise cacheItemCount to watch it change.' }}
          </p>
        </section>

        <!-- 演示二:混合高度 StackLayout(两轴) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupMixed }}</h4>
          <WuiItemsRepeater
            :items="mixedItems"
            :layout="mixedLayout"
            :item-size="mixedSizeOf"
            :cache-item-count="3"
            class="repeater-frame"
            style="width: 480px; height: 320px"
          >
            <template #default="{ item, index }">
              <div class="mixed-card" :class="{ 'mixed-card-horizontal': mixedAxisValue === 'horizontal' }">
                <span class="mixed-id">#{{ (item as { id: number }).id }}</span>
                <span class="mixed-size">{{ mixedSizeOf(index) }}px</span>
              </div>
            </template>
          </WuiItemsRepeater>
          <p class="demo-hint">
            {{ isZh
              ? 'itemSize 以函数声明每项主轴尺寸(5 档高度);切到 horizontal 后条目沿 X 排、改为横向滚动(滚动轴与排列轴相反)。'
              : 'itemSize declares each item’s major-axis size (5 height tiers); switch to horizontal to lay items along X and scroll horizontally (scroll axis is the inverse).' }}
          </p>
        </section>

        <!-- 演示三:UniformGridLayout 大图墙 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupWall }}</h4>
          <p class="demo-stats">
            {{ isZh ? '数据' : 'Items' }}: {{ wallItems.length }}
            · <strong class="stats-accent">{{ isZh ? 'DOM 渲染' : 'DOM rendered' }}: {{ wallRendered }}</strong>
          </p>
          <WuiItemsRepeater
            :items="wallItems"
            :layout="wallLayout"
            class="repeater-frame"
            style="height: 480px"
            @element-prepared="onWallPrepared"
            @element-clearing="onWallCleared"
          >
            <template #default="{ item }">
              <div class="wall-card">
                <span
                  class="wall-swatch"
                  aria-hidden="true"
                  :style="{ filter: `hue-rotate(${(item as WallItem).hue}deg)` }"
                ></span>
                <span class="wall-label">{{ (item as WallItem).id }}</span>
              </div>
            </template>
          </WuiItemsRepeater>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          :label="labelCount"
          type="select"
          v-model="feedCount"
          :options="[
            { label: '100', value: '100' },
            { label: '1 000', value: '1000' },
            { label: '10 000', value: '10000' },
          ]"
        />
        <DemoOptionRow :label="labelCache" type="slider" v-model="feedCache" :min="0" :max="10" :step="1" />
        <DemoOptionRow :label="labelItemSize" type="slider" v-model="feedItemSize" :min="32" :max="96" :step="4" />
        <DemoOptionRow :label="labelSpacing" type="slider" v-model="feedSpacing" :min="0" :max="16" :step="1" />
        <DemoOptionRow
          :label="labelAxis"
          type="select"
          v-model="mixedAxis"
          :options="[
            { label: 'Vertical(纵向滚动)', value: 'vertical' },
            { label: 'Horizontal(横向滚动)', value: 'horizontal' },
          ]"
        />
        <DemoOptionRow :label="labelWallWidth" type="slider" v-model="wallWidth" :min="80" :max="240" :step="4" />
        <DemoOptionRow :label="labelWallHeight" type="slider" v-model="wallHeight" :min="60" :max="200" :step="4" />
        <DemoOptionRow :label="labelWallSpacing" type="slider" v-model="wallSpacing" :min="0" :max="24" :step="1" />
        <DemoOptionRow
          :label="labelJustify"
          type="select"
          v-model="wallJustify"
          :options="[
            { label: 'Start', value: 'start' },
            { label: 'Center', value: 'center' },
            { label: 'End', value: 'end' },
            { label: 'SpaceBetween', value: 'spaceBetween' },
            { label: 'SpaceAround', value: 'spaceAround' },
            { label: 'SpaceEvenly', value: 'spaceEvenly' },
          ]"
        />
        <DemoOptionRow
          :label="labelStretch"
          type="select"
          v-model="wallStretch"
          :options="[
            { label: 'None', value: 'none' },
            { label: 'Fill', value: 'fill' },
            { label: 'Uniform', value: 'uniform' },
          ]"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.repeater-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  /* stretch:控件根无内容宽度,靠对齐拉伸获得行宽(WinUI HorizontalAlignment=Stretch 默认);
     用 flex-start 会让未显式定宽的 repeater 收缩为 0 宽 */
  align-items: stretch;
  gap: 32px;
}

.demo-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
}

.group-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.demo-stats {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.stats-accent {
  color: var(--wui-system-control-foreground-accent);
  font-weight: 600;
}

/* 官方示例统一 1px 边框(ScrollViewer 外框观感) */
.repeater-frame {
  border: 1px solid var(--wui-system-control-background-base-low);
}

.demo-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示一:行内容(高度由 itemSize 声明,内容用 height:100% 填满声明矩形)—— */
.feed-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
  box-sizing: border-box;
  padding: 0 12px;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.feed-id {
  flex: none;
  min-width: 56px;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: var(--wui-application-secondary-foreground-theme);
}

.feed-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* —— 演示二:混合高度卡 —— */
.mixed-card {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  margin: 0 4px 4px 0;
  padding: 0 12px;
  overflow: hidden;
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

/* 横向排列时主轴为 X:卡内改纵向布局,尺寸标注竖排观感 */
.mixed-card-horizontal {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  margin: 0 0 4px 4px;
}

.mixed-id {
  font-family: Consolas, monospace;
  font-size: 12px;
  color: var(--wui-application-secondary-foreground-theme);
}

.mixed-size {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示三:图墙卡(accent 底 + hue-rotate 数据色,文字覆盖在上层)—— */
.wall-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  margin: 0 6px 6px 0;
  overflow: hidden;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.wall-swatch {
  position: absolute;
  inset: 0;
  background: var(--wui-system-accent-color);
}

.wall-label {
  position: relative;
  font-family: Consolas, monospace;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-system-control-foreground-alt-high);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
