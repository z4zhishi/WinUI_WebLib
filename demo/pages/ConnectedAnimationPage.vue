<script setup lang="ts">
// ConnectedAnimation 示例页:对照官方 WinUI Gallery ConnectedAnimationPage 的
// CollectionPage/DetailedInfoPage(列表→详情飞入/飞回)与 CardPage(同页卡片放大)示例,
// 以及 SimpleConnectedAnimation 的 Configuration 单选(Default/Gravity/Direct/Basic)。
//
// 选型:CSS View Transitions API(document.startViewTransition)—— 见 wiki「选型」节:
// 浏览器原生共享元素形变,免手写 FLIP 的矩形采集/变换清场;不支持时经
// src/utils/transitions.ts 的 startConnectedTransition 降级为即时切换(等价 WinUI
// ConnectedAnimation.TryStart 返回 false / SuppressNavigationTransitionInfo 的语义)。
// 概念对应:PrepareToAnimate(源)→ 旧快照里带 view-transition-name 的元素;
// TryStart(目标)→ 新快照里的同名元素;Configuration → ::view-transition-group 时序函数。
// 与官方一致,页面切换本身不加转场(等价 SuppressNavigationTransitionInfo)。
import { computed, nextTick, ref } from 'vue'
import type { CSSProperties } from 'vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import {
  CONNECTED_ANIMATION_CONFIGS,
  CONNECTED_ANIMATION_EASINGS,
  startConnectedTransition,
  supportsViewTransitions,
} from '@/utils/transitions'
import type { ConnectedAnimationConfig } from '@/utils/transitions'

/** 演示数据(官方 CustomDataObject.GetDataObjects 的等价物;图片用 token 色块代替)。 */
interface GalleryItem {
  id: number
  title: string
  views: number
  likes: number
  description: string
  tone: 0 | 1 | 2
}

const ITEMS: GalleryItem[] = [
  {
    id: 0,
    title: '山径晨雾',
    views: 1289,
    likes: 233,
    description: '列表页与详情页之间延续显示的元素,让用户在视图切换时保持上下文。',
    tone: 0,
  },
  {
    id: 1,
    title: '湖面倒影',
    views: 972,
    likes: 154,
    description: '共享元素过渡只动画「配对成功」的元素,其余内容按默认交叉淡入淡出。',
    tone: 1,
  },
  {
    id: 2,
    title: '峡谷回声',
    views: 845,
    likes: 121,
    description: '返回导航播放反向飞回:旧快照与新快照中的同名元素互换角色。',
    tone: 2,
  },
  {
    id: 3,
    title: '林间光斑',
    views: 731,
    likes: 98,
    description: '官方示例在导航时使用 SuppressNavigationTransitionInfo,避免页面转场与飞入叠加。',
    tone: 0,
  },
  {
    id: 4,
    title: '崖边栈道',
    views: 610,
    likes: 77,
    description: 'Configuration(Default/Gravity/Direct/Basic)影响飞行时序,Web 端以缓动函数近似。',
    tone: 1,
  },
  {
    id: 5,
    title: '雪线之上',
    views: 502,
    likes: 65,
    description: '同页的卡片放大/收起与跨页飞入是同一套机制,只是新旧快照都在当前页内。',
    tone: 2,
  },
]

// —— DemoOptionRow v-model 契约(联合类型)+ 收窄 ——
const optCaConfig = ref<string | number | boolean>('default')
const caConfig = computed<ConnectedAnimationConfig>(() => {
  const value = String(optCaConfig.value)
  return (CONNECTED_ANIMATION_CONFIGS as readonly string[]).includes(value)
    ? (value as ConnectedAnimationConfig)
    : 'default'
})
const CA_CONFIG_OPTIONS = CONNECTED_ANIMATION_CONFIGS.map((config) => ({ value: config, label: config }))

const viewTransitionsSupported = supportsViewTransitions()

/** 共享元素名(命名空间前缀避免两节演示相互配对)。 */
function photoName(id: number): string {
  return `wui-ca-photo-${id}`
}

function cardName(id: number): string {
  return `wui-ca-card-${id}`
}

/** 列表缩略图:仅「待配对」的元素携带名字(旧快照侧);避免同名元素重复导致转场被跳过。 */
function photoStyle(item: GalleryItem): CSSProperties | undefined {
  if (view.value === 'list' && pendingPhotoId.value === item.id) {
    return { viewTransitionName: photoName(item.id) }
  }
  return undefined
}

/** 详情页头部大图:渲染期间始终携带名字(既是前进的新快照侧,也是返回的旧快照侧)。 */
function heroStyle(item: GalleryItem): CSSProperties {
  return { viewTransitionName: photoName(item.id) }
}

/** 网格卡片:仅在「无覆盖层且待配对」时携带名字。 */
function gridCardStyle(item: GalleryItem): CSSProperties | undefined {
  if (overlayItem.value === null && pendingCardId.value === item.id) {
    return { viewTransitionName: cardName(item.id) }
  }
  return undefined
}

/** 覆盖层大卡片:打开期间始终携带名字。 */
function overlayCardStyle(item: GalleryItem): CSSProperties {
  return { viewTransitionName: cardName(item.id) }
}

function toneClass(tone: 0 | 1 | 2): string {
  return `ca-tone-${tone}`
}

// —— 例 1:列表 → 详情(官方 CollectionPage/DetailedInfoPage 复刻)——
const view = ref<'list' | 'detail'>('list')
const detailItem = ref<GalleryItem | null>(null)
const pendingPhotoId = ref<number | null>(null)
const busy = ref(false)
const lastAnimated = ref<boolean | null>(null)

async function openItem(item: GalleryItem): Promise<void> {
  if (busy.value || view.value !== 'list') return
  busy.value = true
  pendingPhotoId.value = item.id
  const { animated, finished } = await startConnectedTransition(async () => {
    detailItem.value = item
    view.value = 'detail'
    await nextTick()
  }, caConfig.value)
  lastAnimated.value = animated
  await finished
  busy.value = false
}

async function goBack(): Promise<void> {
  if (busy.value || view.value !== 'detail' || detailItem.value === null) return
  busy.value = true
  pendingPhotoId.value = detailItem.value.id // 返回后由列表缩略图接住同名元素(反向飞回)
  const { animated, finished } = await startConnectedTransition(async () => {
    view.value = 'list'
    await nextTick()
  }, caConfig.value)
  lastAnimated.value = animated
  await finished
  busy.value = false
}

// —— 例 2:同页卡片放大(官方 CardPage / SmokeGrid 复刻)——
const overlayItem = ref<GalleryItem | null>(null)
const pendingCardId = ref<number | null>(null)

async function openCard(item: GalleryItem): Promise<void> {
  if (busy.value || overlayItem.value !== null) return
  busy.value = true
  pendingCardId.value = item.id
  const { animated, finished } = await startConnectedTransition(async () => {
    overlayItem.value = item
    await nextTick()
  }, caConfig.value)
  lastAnimated.value = animated
  await finished
  busy.value = false
}

async function closeCard(): Promise<void> {
  if (busy.value || overlayItem.value === null) return
  busy.value = true
  pendingCardId.value = overlayItem.value.id // 收起时网格卡片接住同名元素(反向飞回)
  const { animated, finished } = await startConnectedTransition(async () => {
    overlayItem.value = null
    await nextTick()
  }, caConfig.value)
  lastAnimated.value = animated
  await finished
  busy.value = false
}

// —— 下半区固定开发文档 ——
const mappingHeaders = ['WinUI 概念', 'Web(View Transitions)映射', '说明']
const mappingRows: (string | number)[][] = [
  [
    'ConnectedAnimationService.GetForCurrentView().PrepareToAnimate("key", sourceElement)',
    '给源元素设置 view-transition-name(如 wui-ca-photo-1)',
    '旧快照按名字捕获元素的位置 / 尺寸;名字在配对期间必须页面内唯一',
  ],
  [
    'ConnectedAnimation.TryStart(targetElement)',
    '切换状态后,新快照中携带同名 view-transition-name 的元素',
    'startViewTransition 的回调里改状态并 await nextTick,再采集新快照,两者自动配对飞入',
  ],
  [
    'Frame.Navigate(page, param, new SuppressNavigationTransitionInfo())',
    '状态切换不叠加页面转场',
    '官方示例导航时抑制默认转场,只保留共享元素飞入;本页行为一致',
  ],
  [
    'ConnectedAnimationConfiguration(Default / Gravity / Direct / Basic)',
    '::view-transition-group(*) 的 animation-timing-function(--wui-ca-easing)',
    'WinUI 的 Configuration 平台内定不可配;Web 端以缓动近似:default→decelerate、gravity→accelerate、direct→linear、basic→standard(token)',
  ],
  [
    'TryStart(target, coordinatedElements) 协同元素',
    '非同名内容走 View Transitions 默认交叉淡入淡出',
    '详情页的标题 / 信息面板等随根组淡入,无需单独配对',
  ],
  [
    'TryStart 返回 false(元素不在可视树 / 不支持)',
    'document.startViewTransition 不存在 → 直接执行状态切换(降级)',
    'supportsViewTransitions() 检测;降级语义 = 即时切换,页面有状态徽标声明',
  ],
  [
    'collection.ScrollIntoView(_storeditem) 返回定位',
    '无需处理:列表与详情是同一 DOM 的两个状态',
    '返回时滚动位置天然保留,等价官方「滚动到原条目再接住飞回元素」',
  ],
]

const apiHeaders = ['成员(src/utils/transitions.ts)', '类型', '说明']
const apiRows: (string | number)[][] = [
  [
    'supportsViewTransitions()',
    '() => boolean',
    '当前浏览器是否支持同文档 View Transitions(document.startViewTransition)',
  ],
  [
    'startConnectedTransition(apply, config?)',
    "(apply: () => void | Promise<void>, config?: ConnectedAnimationConfig) => Promise<{ animated: boolean; finished: Promise<void> }>",
    '启动共享元素过渡:animated=false 表示已降级即时切换;finished 在动画 / 切换结束后 resolve(用于释放防重入标志)',
  ],
  [
    'CONNECTED_ANIMATION_CONFIGS / CONNECTED_ANIMATION_EASINGS',
    "readonly ['default','gravity','direct','basic'] / Record<…, string>",
    '官方 Configuration 四档 → CSS 时序函数(token)映射',
  ],
]

const apiEventHeaders = ['事件', '参数', '触发时机']
const apiEventRows: (string | number)[][] = [
  ['—(无业务事件)', '—', 'WinUI ConnectedAnimation 仅有 Completed 回调;Web 端经 startConnectedTransition 返回的 finished 对应'],
]

// script 结束标签用拼接构造,避免 SFC 解析器把代码示例里的标签当成自身块结束。
const SCRIPT_CLOSE = '</' + 'script>'

const usageCode = `<script setup lang="ts">
import { startConnectedTransition, supportsViewTransitions } from '@/utils/transitions'

// 1) 源元素(列表缩略图)携带名字 —— 旧快照捕获:
//    <span :style="{ viewTransitionName: 'wui-ca-photo-1' }" />
// 2) 导航(状态切换):不叠加页面转场(官方用 SuppressNavigationTransitionInfo)
const { animated, finished } = await startConnectedTransition(async () => {
  state.value = 'detail' // 切换视图状态
  await nextTick()       // 等 Vue 更新 DOM 后再采集新快照
}, 'default')
// 3) 新状态里的目标元素(详情头部大图)携带同名 view-transition-name → 自动飞入配对
//    animated=false = 浏览器不支持,已即时切换(降级);finished 可用于释放 busy 标志
${SCRIPT_CLOSE}

<style>
/* 飞行时序(官方 Configuration 的 Web 近似)与 reduced-motion 降级 */
::view-transition-group(*) {
  animation-timing-function: var(--wui-ca-easing, var(--wui-easing-standard));
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-image-pair(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
    animation-delay: 0.01ms !important;
  }
}
</style>`
</script>

<template>
  <DemoPage wiki="ConnectedAnimation"
    title="Connected Animation"
    description="连接动画在页面导航期间延续显示同一个元素,帮助用户在视图切换间保持上下文:列表→详情点按后图片飞入详情头部,返回时反向飞回。选型采用 CSS View Transitions API,浏览器不支持时降级为即时切换(页面有声明徽标)。"
  >
    <template #demo>
      <div class="ca-stage">
        <!-- ===== 例 1:列表 → 详情(官方 CollectionPage / DetailedInfoPage 复刻)===== -->
        <section class="demo-group">
          <h4 class="group-title">列表 → 详情飞入 / 飞回</h4>
          <p class="group-note">
            对照官方 CollectionPage / DetailedInfoPage:点按列表项,缩略图飞入详情页头部放大
            (标题与信息面板为协同内容,随根组淡入);点「Go Back」反向飞回列表原位。页面切换本身
            不叠加转场(官方用 SuppressNavigationTransitionInfo),只有共享元素在飞。
          </p>
          <div class="ca-frame">
            <div v-if="view === 'list'" class="ca-list">
              <button
                v-for="item in ITEMS"
                :key="item.id"
                type="button"
                class="ca-item"
                :disabled="busy"
                @click="openItem(item)"
              >
                <span class="ca-thumb" :class="toneClass(item.tone)" :style="photoStyle(item)"></span>
                <span class="ca-item-text">
                  <strong class="ca-item-title">{{ item.title }}</strong>
                  <span class="ca-item-meta">Views: {{ item.views }} · Likes: {{ item.likes }}</span>
                </span>
              </button>
            </div>
            <div v-else-if="detailItem" class="ca-detail">
              <div class="ca-detail-header">
                <span class="ca-hero" :class="toneClass(detailItem.tone)" :style="heroStyle(detailItem)"></span>
                <div class="ca-detail-titles">
                  <h5 class="ca-detail-title">{{ detailItem.title }}</h5>
                  <span class="ca-item-meta">Views: {{ detailItem.views }} · Likes: {{ detailItem.likes }}</span>
                </div>
              </div>
              <p class="ca-detail-desc">{{ detailItem.description }}</p>
              <button type="button" class="host-button" :disabled="busy" @click="goBack">Go Back</button>
            </div>
          </div>
          <div class="trigger-row">
            <span class="state-chip" aria-live="polite">
              View Transitions API:{{ viewTransitionsSupported ? '支持(共享元素飞入)' : '不支持 —— 已降级为即时切换' }}
            </span>
            <span v-if="lastAnimated !== null" class="state-chip" aria-live="polite">
              最近一次导航:{{ lastAnimated ? '飞入动画' : '即时切换(降级)' }}
            </span>
          </div>
        </section>

        <!-- ===== 例 2:同页卡片放大(官方 CardPage / SmokeGrid 复刻)===== -->
        <section class="demo-group">
          <h4 class="group-title">同页卡片放大 / 收起</h4>
          <p class="group-note">
            对照官方 ConnectedAnimationElementsSame:点按网格卡片放大到覆盖层(烟雾层),点关闭或
            遮罩空白处反向飞回原格 —— 与跨页飞入共用同一套快照配对机制。
          </p>
          <div class="ca-grid-wrap">
            <div class="ca-grid">
              <button
                v-for="item in ITEMS"
                :key="item.id"
                type="button"
                class="ca-card"
                :disabled="busy"
                @click="openCard(item)"
              >
                <span class="ca-card-thumb" :class="toneClass(item.tone)" :style="gridCardStyle(item)"></span>
                <span class="ca-card-caption">{{ item.title }}</span>
              </button>
            </div>
            <div v-if="overlayItem" class="ca-overlay" @click.self="closeCard">
              <div class="ca-overlay-card" :style="overlayCardStyle(overlayItem)">
                <span class="ca-overlay-thumb" :class="toneClass(overlayItem.tone)"></span>
                <div class="ca-overlay-body">
                  <h5 class="ca-detail-title">{{ overlayItem.title }}</h5>
                  <p class="ca-detail-desc">{{ overlayItem.description }}</p>
                </div>
                <button type="button" class="mini-button ca-overlay-close" @click="closeCard">关闭</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          label="Configuration(飞行时序,官方四档)"
          type="select"
          v-model="optCaConfig"
          :options="CA_CONFIG_OPTIONS"
        />
        <p class="option-note">
          当前曲线:{{ CONNECTED_ANIMATION_EASINGS[caConfig] }}(default→decelerate / gravity→accelerate
          / direct→linear / basic→standard,token 近似)。
        </p>
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">WinUI ConnectedAnimation ↔ View Transitions 概念映射</h4>
      <DemoDocsTable :headers="mappingHeaders" :rows="mappingRows" />
      <h4 class="docs-subtitle">工具 API(src/utils/transitions.ts)</h4>
      <DemoDocsTable :headers="apiHeaders" :rows="apiRows" />
      <h4 class="docs-subtitle">事件</h4>
      <DemoDocsTable :headers="apiEventHeaders" :rows="apiEventRows" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<!-- View Transitions 伪元素树无法被 scoped 选择器命中,本块为全局;只作用于 ::view-transition-*。 -->
<style>
::view-transition-group(*) {
  animation-timing-function: var(--wui-ca-easing, var(--wui-easing-standard));
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-image-pair(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
    animation-delay: 0.01ms !important;
  }
}
</style>

<style scoped>
.ca-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
}

.demo-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.group-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.group-note {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示画布(等价官方 Frame / SmokeGrid)—— */
.ca-frame {
  width: 100%;
  min-height: 320px;
  overflow: hidden;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 照片等价物:token 色块(官方示例的照片素材,先例见 ScrollViewPage / ParallaxViewPage) */
.ca-tone-0 {
  background: var(--wui-system-accent-color);
}

.ca-tone-1 {
  background: var(--wui-system-accent-color-dark-1);
}

.ca-tone-2 {
  background: var(--wui-system-accent-color-light-2);
}

/* —— 列表(官方 CollectionPage 条目布局:图 + 标题 + Views/Likes)—— */
.ca-list {
  display: flex;
  flex-direction: column;
  padding: 8px;
}

.ca-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--wui-system-control-transparent);
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.ca-item:hover {
  background: var(--wui-system-control-background-list-low);
}

.ca-item:active {
  background: var(--wui-system-control-background-list-medium);
}

.ca-item:disabled {
  cursor: default;
}

.ca-item:focus-visible,
.host-button:focus-visible,
.mini-button:focus-visible,
.ca-card:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.ca-thumb {
  flex: 0 0 auto;
  width: 96px;
  height: 56px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.ca-item-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ca-item-title {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.ca-item-meta {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 详情页(官方 DetailedInfoPage:头部大图 + 标题信息 + 说明)—— */
.ca-detail {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
}

.ca-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  width: 100%;
}

.ca-hero {
  flex: 0 0 auto;
  width: 220px;
  height: 140px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.ca-detail-titles {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.ca-detail-title {
  margin: 0;
  font-size: var(--wui-text-style-large-font-size);
  color: var(--wui-application-header-foreground-theme);
}

.ca-detail-desc {
  margin: 0;
  max-width: 560px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.host-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  height: 32px;
  padding: 5px 12px;
  font-family: inherit;
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.host-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.host-button:active {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.host-button:disabled,
.ca-item:disabled,
.ca-card:disabled {
  opacity: 0.6;
}

/* —— 网格与覆盖层(官方 GridView + SmokeGrid)—— */
.ca-grid-wrap {
  position: relative;
  width: 100%;
}

.ca-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  width: 100%;
}

.ca-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  overflow: hidden;
  font: inherit;
  text-align: left;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.ca-card-thumb {
  display: block;
  width: 100%;
  height: 90px;
}

.ca-card-caption {
  padding: 6px 8px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-list-low);
}

.ca-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: var(--wui-smoke-fill-color-default, var(--wui-system-control-background-base-medium));
}

.ca-overlay-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(420px, 86%);
  overflow: hidden;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: calc(var(--wui-hyperlink-focus-rect-corner-radius) * 2);
}

.ca-overlay-thumb {
  display: block;
  width: 100%;
  height: 200px;
}

.ca-overlay-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  background: var(--wui-application-page-background-theme);
}

.ca-overlay-close {
  position: absolute;
  top: 8px;
  right: 8px;
}

.mini-button {
  height: 28px;
  padding: 3px 10px;
  font-family: inherit;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.mini-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.mini-button:active {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.trigger-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.state-chip {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.option-note {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
