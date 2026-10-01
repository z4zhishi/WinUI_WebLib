<script setup lang="ts">
// PullToRefresh 示例页:对照官方 WinUI Gallery PullToRefreshPage 的两个示例 ——
//   Example1(Basic PullToRefresh):RefreshContainer + 列表,RefreshRequested 取 Deferral,
//     模拟 1s 异步后在列表头插入新项(官方为 500ms 定时器,本页按阶段规格统一为 1s);
//   Example2(Custom Icon PullToRefresh):RefreshContainer.Visualizer 挂自备 RefreshVisualizer,
//     指示内容为 SymbolIcon(官方 txt 示例定义为 AddFriend;页面代码-behind 用太阳图片),
//     刷新完成用简化通道 v-model:isRefreshIdle(异步完成置 true)收尾。
// 两例均提供 RequestRefresh() 编程触发按钮(键盘可达路径),实时读数展示状态机与拉动比例。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiRefreshContainer from '@/components/RefreshContainer.vue'
import type { RefreshRequestedEvent } from '@/components/RefreshContainer.vue'
import WuiRefreshVisualizer from '@/components/RefreshVisualizer.vue'
import type { RefreshStateChangedDetail, RefreshVisualizerState } from '@/components/RefreshVisualizer.vue'
import WuiScrollViewer from '@/components/ScrollViewer.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'PullToRefresh(下拉刷新)', en: 'PullToRefresh' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '让用户在列表顶部向下拉动以刷新内容:RefreshContainer 承载内容与 RefreshVisualizer 视觉器,越过阈值后松手触发刷新(触屏触摸拖拽为主,鼠标拖拽可用)。按官方示例复刻两例:基础用法(Deferral)与自定义图标(简化 isRefreshIdle 通道)。',
  en: 'Lets a user pull down on a list to refresh its contents: RefreshContainer hosts the content plus a RefreshVisualizer; releasing past the threshold raises the refresh (touch-first, mouse drag supported). Two official samples replicated: basic (Deferral) and custom icon (isRefreshIdle shortcut).',
}
const S1_LABEL: BilingualText = { zh: '基础下拉刷新(Deferral 流,官方 Example1 复刻)', en: 'Basic pull-to-refresh (Deferral flow, official Example 1)' }
const S2_LABEL: BilingualText = { zh: '自定义视觉器图标(isRefreshIdle 流,官方 Example2 复刻)', en: 'Custom visualizer icon (isRefreshIdle flow, official Example 2)' }
const READOUT_LABEL: BilingualText = { zh: '实时读数', en: 'Live readout' }
const LOG_LABEL: BilingualText = { zh: '事件日志', en: 'Event log' }
const TOUCH_HINT: BilingualText = {
  zh: '提示:在列表贴顶时向下拖拽(触屏拖拽 / 鼠标按住拖拽);也可点按钮编程触发。松手前继续拉过阈值是 Pending(图标放大脉冲),拉回阈值内则取消。',
  en: 'Tip: drag down while the list is at the top (touch or mouse); or use the button to trigger programmatically. Pulling past the threshold is Pending (pop pulse); pulling back within it cancels.',
}

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const s1Label = useBilingual(i18n, S1_LABEL)
const s2Label = useBilingual(i18n, S2_LABEL)
const readoutLabel = useBilingual(i18n, READOUT_LABEL)
const logLabel = useBilingual(i18n, LOG_LABEL)
const touchHint = useBilingual(i18n, TOUCH_HINT)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// ===================================================================================
// 公共:参数(两例共享 pullThreshold;场景 2 另调视觉器带高)
// ===================================================================================
const pullThreshold = ref<string | number | boolean>(0.8)
const visualizerSize = ref<string | number | boolean>(100)
const thresholdValue = computed(() => toNumber(pullThreshold.value, 0.8))
const visualizerSizeValue = computed(() => toNumber(visualizerSize.value, 100))

// —— 事件日志(两例共用,带序号,保留 6 条)——
const eventLog = ref<string[]>([])
let logSeq = 0
function log(message: string): void {
  eventLog.value = [`#${++logSeq} ${message}`, ...eventLog.value].slice(0, 6)
}

// 模拟异步刷新:阶段规格 1s
const REFRESH_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

// ===================================================================================
// 场景 1:基础下拉刷新(官方 Example1:ListView + RefreshRequested + Deferral)
// 列表初始项照抄官方示例:「AcrylicBrush ColorPicker NavigationView ParallaxView
// PersonPicture PullToRefreshPage RatingsControl RevealBrush TreeView」
// ===================================================================================
const container1Ref = ref<InstanceType<typeof WuiRefreshContainer> | null>(null)
const container2Ref = ref<InstanceType<typeof WuiRefreshContainer> | null>(null)
const items1 = ref<string[]>([
  'AcrylicBrush',
  'ColorPicker',
  'NavigationView',
  'ParallaxView',
  'PersonPicture',
  'PullToRefreshPage',
  'RatingsControl',
  'RevealBrush',
  'TreeView',
])
let items1AddedCount = 0

// 状态读数:state 经 stateChanged 事件跟踪;ratio 经容器暴露的 ref 响应式读取
const state1 = ref<RefreshVisualizerState>('Idle')
const ratio1 = computed(() => container1Ref.value?.interactionRatio ?? 0)

function onState1(detail: RefreshStateChangedDetail): void {
  state1.value = detail.newState
  log(`场景1 stateChanged:${detail.oldState} → ${detail.newState}`)
}

async function onRefresh1(args: RefreshRequestedEvent): Promise<void> {
  const deferral = args.getDeferral()
  log('场景1 refreshRequested(取 Deferral,模拟 1s 异步)')
  await delay(REFRESH_DELAY_MS)
  items1.value.unshift(`NewControl ${items1AddedCount++}`)
  deferral.complete()
  log(`场景1 Deferral.complete(已插入 NewControl ${items1AddedCount - 1})`)
}

function requestRefresh1(): void {
  container1Ref.value?.requestRefresh()
  log('场景1 RequestRefresh()(编程触发)')
}

// ===================================================================================
// 场景 2:自定义视觉器(官方 Example2:RefreshVisualizer.Content = SymbolIcon AddFriend)
// 刷新完成走简化通道:v-model:isRefreshIdle 异步完成置 true;状态经视觉器 stateChanged 跟踪
// ===================================================================================
const items2 = ref<string[]>(['Mike', 'Ben', 'Barbra', 'Claire', 'Justin', 'Shawn', 'Drew', 'Lili'])
let items2AddedCount = 0
const isIdle2 = ref(true)
const state2 = ref<RefreshVisualizerState>('Idle')

function onVisualizerState2(detail: RefreshStateChangedDetail): void {
  state2.value = detail.newState
  log(`场景2 视觉器 stateChanged:${detail.oldState} → ${detail.newState}`)
}

// 简化通道:不需要 args(不取 Deferral),异步完成置回 isRefreshIdle=true 即收尾
async function onRefresh2(): Promise<void> {
  isIdle2.value = false
  log('场景2 refreshRequested(isRefreshIdle=false,模拟 1s 异步)')
  await delay(REFRESH_DELAY_MS)
  items2.value.unshift(`New Friend ${items2AddedCount++}`)
  isIdle2.value = true
  log(`场景2 isRefreshIdle=true(已插入 New Friend ${items2AddedCount - 1})`)
}

function requestRefresh2(): void {
  container2Ref.value?.requestRefresh()
  log('场景2 RequestRefresh()(编程触发)')
}

// —— 下半区固定开发文档 ——
const DOCS_HEADERS = ['属性', '类型', '默认值', '说明']
const CONTAINER_ROWS: (string | number)[][] = [
  ['pullThreshold', 'number', '0.8', '触发阈值(WinUI ExecutionRatio):拉动比例 = 拉动距离 / 视觉器带高,越过阈值进入 Pending,松手即刷新;范围钳制 0.05–1'],
  ['pullDirection', "'LeftToRight' | 'TopToBottom' | 'RightToLeft' | 'BottomToTop'", "'TopToBottom'", '拉动方向;Web 手势仅实现 TopToBottom(垂直向下),其余值告警并按 TopToBottom 处理'],
  ['isRefreshIdle', 'boolean(v-model:is-refresh-idle)', 'true', '刷新空闲标记:刷新触发后置 false 可阻止自动收尾,异步完成置回 true 即回到 Idle(Deferral 的简化替代)'],
]
const VISUALIZER_ROWS: (string | number)[][] = [
  ['state', "'Idle' | 'Peeking' | 'Interacting' | 'Pending' | 'Refreshing'(v-model:state)", "'Idle'", '视觉器状态;被 RefreshContainer 包含时由容器驱动(该 prop 忽略,请监听 stateChanged)'],
  ['orientation', "'Auto' | 'Normal' | 'Rotate90DegreesCounterclockwise' | 'Rotate270DegreesCounterclockwise'", "'Auto'", '指示器方向:决定起始旋转角(默认内容旋转图标的起始角)'],
  ['size', 'number | string', '100', '视觉器带高 px(WinUI Height;下限 80);RefreshContainer 以实测带高为拉动比例分母'],
  ['foreground / background', 'string', "主题前景 / 透明", '指示器前景(WinUI Foreground,映射 RefreshVisualizerForeground 主题前景)与背景'],
]

const EVENT_HEADERS = ['事件', '参数', '触发时机']
const EVENT_ROWS: (string | number)[][] = [
  ['refreshRequested(容器)', '(args) => void,args.getDeferral()', '拉动越过阈值后松手,或调用 requestRefresh();取 Deferral 后异步完成时 complete(),否则刷新立即收尾'],
  ['stateChanged(容器 / 视觉器)', '{ oldState, newState }', '状态机迁移时;容器事件为 Web 侧扩展(等价内部默认视觉器的同名事件),自备视觉器请监听视觉器的 stateChanged'],
  ['update:isRefreshIdle(容器)', '(value: boolean) => void', 'v-model:is-refresh-idle 双向绑定事件'],
]

const usageCode = [
  '<script setup lang="ts">',
  "import { ref } from 'vue'",
  "import RefreshContainer from '@/components/RefreshContainer.vue'",
  "import ScrollViewer from '@/components/ScrollViewer.vue'",
  '',
  'const items = ref([\'项目 A\', \'项目 B\'])',
  '',
  'async function onRefreshRequested(args) {',
  '  const deferral = args.getDeferral() // 或用 v-model:is-refresh-idle 简化通道',
  '  await doWorkAsync() // 模拟拉取数据',
  "  items.value.unshift('新项')",
  '  deferral.complete() // 完成后视觉器回到 Idle',
  '}',
  '<\/script>',
  '',
  '<template>',
  '  <RefreshContainer @refresh-requested="onRefreshRequested">',
  '    <ScrollViewer style="height: 240px">',
  '      <div v-for="item in items" :key="item">{{ item }}</div>',
  '    </ScrollViewer>',
  '  </RefreshContainer>',
  '</template>',
].join('\n')
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="PullToRefresh">
    <template #demo>
      <div class="ptr-stage">
        <!-- 场景 1:基础下拉刷新(Deferral 流) -->
        <section class="stage-section">
          <h3 class="stage-title">{{ s1Label }}</h3>
          <div class="stage-row">
            <WuiRefreshContainer
              ref="container1Ref"
              class="ptr-box"
              :pull-threshold="thresholdValue"
              @refresh-requested="onRefresh1"
              @state-changed="onState1"
            >
              <WuiScrollViewer class="ptr-list">
                <ul class="ptr-items">
                  <li v-for="(item, index) in items1" :key="`${item}-${index}`" class="ptr-item">{{ item }}</li>
                </ul>
              </WuiScrollViewer>
            </WuiRefreshContainer>
            <div class="stage-side">
              <WuiButton content="RequestRefresh()" @click="requestRefresh1" />
              <p class="stage-readout">
                {{ readoutLabel }}:
                <span class="readout-mono">state {{ state1 }} · ratio {{ ratio1.toFixed(2) }} · {{ items1.length }} 项</span>
              </p>
            </div>
          </div>
        </section>

        <!-- 场景 2:自定义视觉器(isRefreshIdle 流) -->
        <section class="stage-section">
          <h3 class="stage-title">{{ s2Label }}</h3>
          <div class="stage-row">
            <WuiRefreshContainer
              ref="container2Ref"
              class="ptr-box"
              :pull-threshold="thresholdValue"
              v-model:is-refresh-idle="isIdle2"
              @refresh-requested="onRefresh2"
            >
              <template #visualizer>
                <WuiRefreshVisualizer :size="visualizerSizeValue" @state-changed="onVisualizerState2">
                  <!-- 官方 txt 示例定义:SymbolIcon AddFriend(页面 code-behind 为太阳图片,取 txt 口径) -->
                  <WuiFontIcon glyph="&#xE8FA;" :font-size="35" />
                </WuiRefreshVisualizer>
              </template>
              <WuiScrollViewer class="ptr-list">
                <ul class="ptr-items">
                  <li v-for="(item, index) in items2" :key="`${item}-${index}`" class="ptr-item ptr-item--friend">{{ item }}</li>
                </ul>
              </WuiScrollViewer>
            </WuiRefreshContainer>
            <div class="stage-side">
              <WuiButton content="RequestRefresh()" @click="requestRefresh2" />
              <p class="stage-readout">
                {{ readoutLabel }}:
                <span class="readout-mono">state {{ state2 }} · isRefreshIdle {{ isIdle2 }} · size {{ visualizerSizeValue }}px</span>
              </p>
            </div>
          </div>
        </section>

        <div class="stage-foot">
          <p class="stage-hint">{{ touchHint }}</p>
          <div class="event-log">
            <p class="event-log-title">{{ logLabel }}</p>
            <p v-for="entry in eventLog" :key="entry" class="event-log-entry">{{ entry }}</p>
            <p v-if="eventLog.length === 0" class="event-log-entry event-log-entry--empty">—</p>
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="PullThreshold 触发阈值" type="slider" v-model="pullThreshold" :min="0.3" :max="1" :step="0.05" />
        <DemoOptionRow label="视觉器带高 size(px,场景 2)" type="slider" v-model="visualizerSize" :min="80" :max="160" :step="10" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">RefreshContainer 属性</h3>
      <DemoDocsTable :headers="DOCS_HEADERS" :rows="CONTAINER_ROWS" />
      <h3 class="docs-subtitle">RefreshVisualizer 属性</h3>
      <DemoDocsTable :headers="DOCS_HEADERS" :rows="VISUALIZER_ROWS" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="EVENT_HEADERS" :rows="EVENT_ROWS" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.ptr-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 32px;
  width: 100%;
}

.stage-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stage-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.stage-row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

/* 官方示例:ListView Width=300、Height=200/300 + 1px 边框(TextControlBorderBrush 口径) */
.ptr-box {
  width: 300px;
  height: 240px;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.ptr-list {
  height: 100%;
}

.ptr-items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ptr-item {
  padding: 10px 14px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.ptr-item--friend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-side {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  min-width: 300px;
}

.stage-readout {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.readout-mono {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

.stage-foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.stage-hint {
  margin: 0;
  max-width: 640px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  text-align: center;
}

.event-log {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 560px;
  padding: 8px 12px;
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.event-log-title {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.event-log-entry {
  margin: 0;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.event-log-entry--empty {
  color: var(--wui-system-control-foreground-chrome-gray);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

@media (max-width: 720px) {
  .stage-row {
    flex-direction: column;
    align-items: stretch;
  }

  .ptr-box {
    width: 100%;
  }

  .stage-side {
    min-width: 0;
  }
}
</style>
