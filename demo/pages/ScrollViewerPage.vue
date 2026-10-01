<script setup lang="ts">
// ScrollViewer 示例页(对照官方 WinUI Gallery ScrollViewerPage):
// 例 1 = 官方参数面板复刻:ZoomMode + Zoom 滑块(v-model 双向)、Horizontal/Vertical 的
// ScrollMode 与 ScrollBarVisibility 下拉、Padding 滑块;长文内容 + 640px 宽色条,
// 同时提供纵向/横向溢出;ZoomMode=Enabled 时 Ctrl+滚轮(触控板捏合同理)缩放。
// 例 2 = 编程滚动按钮组:scrollToLeft/Right/Top/Bottom + changeView(缩放/复位),
// 暴露的偏移/缩放系数经模板 ref 实时读出,scroll 透传与 viewChanged(防抖)计数。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiScrollViewer from '@/components/ScrollViewer.vue'
import type { ScrollBarVisibility, ScrollMode, ScrollViewerViewChangedDetail, ZoomMode } from '@/components/ScrollViewer.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ScrollViewer(滚动视图)', en: 'ScrollViewer' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'ScrollViewer 让用户通过滚动、平移与缩放查看超出可视区域的内容(ListView 等列表控件的模板内置了它)。演示区提供长内容滚动、滚动模式/滚动条可见性参数面板、Ctrl+滚轮缩放与编程滚动按钮组。',
  en: 'A ScrollViewer lets a user scroll, pan, and zoom content larger than the viewable area (ListView and friends embed one in their templates). Demos: long content, scroll mode / bar visibility panel, Ctrl+wheel zoom and programmatic scrolling.',
}
const EXAMPLE1_LABEL: BilingualText = { zh: '示例 1:参数面板联动(对照官方示例)', en: 'Example 1: option panel (mirrors the official sample)' }
const EXAMPLE2_LABEL: BilingualText = { zh: '示例 2:编程滚动按钮组', en: 'Example 2: programmatic scrolling' }
const ZOOM_HINT: BilingualText = { zh: '提示:ZoomMode=Enabled 时按住 Ctrl 滚动滚轮缩放(触控板捏合同理)', en: 'Tip: with ZoomMode=Enabled, hold Ctrl and roll the wheel to zoom (trackpad pinch works too)' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const example1Label = useBilingual(i18n, EXAMPLE1_LABEL)
const example2Label = useBilingual(i18n, EXAMPLE2_LABEL)
const zoomHint = useBilingual(i18n, ZOOM_HINT)

// —— 可调参数(DemoOptionRow 的 v-model 契约:联合类型)——
const zoomModeInput = ref<string | number | boolean>('Enabled')
const zoomFactorInput = ref<string | number | boolean>(1)
const hScrollModeInput = ref<string | number | boolean>('Auto')
const vScrollModeInput = ref<string | number | boolean>('Auto')
const hBarVisibilityInput = ref<string | number | boolean>('Auto')
const vBarVisibilityInput = ref<string | number | boolean>('Visible')
const paddingInput = ref<string | number | boolean>(0)
const cardBackground = ref<string | number | boolean>(false)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// —— select 默认值与 WinUI 一致:ScrollMode=Auto、水平滚动条 Auto、垂直滚动条 Visible ——
const SCROLL_MODE_CHOICES = [
  { label: 'Auto(按内容自动)', value: 'Auto' },
  { label: 'Enabled(恒可滚)', value: 'Enabled' },
  { label: 'Disabled(禁止滚动)', value: 'Disabled' },
]
const BAR_VISIBILITY_CHOICES = [
  { label: 'Auto(需要时显示)', value: 'Auto' },
  { label: 'Visible(常显)', value: 'Visible' },
  { label: 'Hidden(隐藏仍可滚)', value: 'Hidden' },
  { label: 'Disabled(禁止滚动)', value: 'Disabled' },
]
const ZOOM_MODE_CHOICES = [
  { label: 'Disabled(不可缩放)', value: 'Disabled' },
  { label: 'Enabled(Ctrl+滚轮缩放)', value: 'Enabled' },
]

const zoomModeValue = computed(() => String(zoomModeInput.value) as ZoomMode)
const hScrollModeValue = computed(() => String(hScrollModeInput.value) as ScrollMode)
const vScrollModeValue = computed(() => String(vScrollModeInput.value) as ScrollMode)
const hBarVisibilityValue = computed(() => String(hBarVisibilityInput.value) as ScrollBarVisibility)
const vBarVisibilityValue = computed(() => String(vBarVisibilityInput.value) as ScrollBarVisibility)
const paddingValue = computed(() => toNumber(paddingInput.value, 0))

// v-model:zoom-factor 经可写 computed 桥接联合类型的参数面板(滑块 ↔ 组件双向)。
const zoomValue = computed<number>({
  get: () => {
    const parsed = toNumber(zoomFactorInput.value, 1)
    return parsed > 0 ? parsed : 1
  },
  set: (value: number) => {
    zoomFactorInput.value = value
  },
})

const backgroundValue = computed(() =>
  cardBackground.value ? 'var(--wui-system-control-background-chrome-medium-low)' : 'transparent',
)

// —— 示例 1 的事件读数:缩放系数(滑块随 v-model 双向同步)与 viewChanged 计数 ——
const mainViewChangedCount = ref(0)
const mainLastView = ref<ScrollViewerViewChangedDetail | null>(null)
function onMainViewChanged(detail: ScrollViewerViewChangedDetail): void {
  mainViewChangedCount.value += 1
  mainLastView.value = detail
}

// —— 示例 2:编程滚动(经模板 ref 读取 expose 的实时状态)——
const apiViewer = ref<InstanceType<typeof WuiScrollViewer> | null>(null)
const scrollEventCount = ref(0)
const viewChangedCount = ref(0)

const liveH = computed(() => apiViewer.value?.horizontalOffset ?? 0)
const liveV = computed(() => apiViewer.value?.verticalOffset ?? 0)
const liveZoom = computed(() => apiViewer.value?.zoomFactor ?? 1)

function onApiScroll(): void {
  scrollEventCount.value += 1
}
function onApiViewChanged(): void {
  viewChangedCount.value += 1
}

function toTop(): void {
  apiViewer.value?.scrollToTop()
}
function toBottom(): void {
  apiViewer.value?.scrollToBottom()
}
function toLeft(): void {
  apiViewer.value?.scrollToLeft()
}
function toRight(): void {
  apiViewer.value?.scrollToRight()
}
function zoomIn(): void {
  const viewer = apiViewer.value
  if (viewer) viewer.changeView(null, null, Number(viewer.zoomFactor) * 1.25)
}
function zoomOut(): void {
  const viewer = apiViewer.value
  if (viewer) viewer.changeView(null, null, Number(viewer.zoomFactor) / 1.25)
}
function resetView(): void {
  apiViewer.value?.changeView(0, 0, 1)
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['content(默认 slot)', 'any', '—', '被滚动的内容;按视区尺寸参与布局,超出部分转为滚动溢出'],
  ['horizontalScrollMode', "'Auto' | 'Enabled' | 'Disabled'", "'Auto'", '水平滚动模式:Auto 按内容自动、Enabled 恒可滚;Disabled 仅拦截用户输入(滚轮/触摸/键盘/滚动条拖拽),编程滚动不受限'],
  ['verticalScrollMode', "'Auto' | 'Enabled' | 'Disabled'", "'Auto'", '垂直滚动模式,同 horizontalScrollMode'],
  ['horizontalScrollBarVisibility', "'Auto' | 'Visible' | 'Hidden' | 'Disabled'", "'Auto'", '水平滚动条:Auto 需要时显示、Visible 常显、Hidden 隐藏仍可滚、Disabled 彻底禁滚(含编程)'],
  ['verticalScrollBarVisibility', "同上", "'Visible'", '垂直滚动条(WinUI 默认样式即 Visible)'],
  ['zoomMode', "'Disabled' | 'Enabled'", "'Disabled'", '缩放模式;Enabled 时 Ctrl+滚轮(触控板捏合)缩放'],
  ['minZoomFactor', 'number', '0.1', '最小缩放系数'],
  ['maxZoomFactor', 'number', '10', '最大缩放系数'],
  ['zoomFactor(v-model)', 'number', '1', '当前缩放系数;支持 v-model:zoom-factor 双向绑定'],
  ['padding', 'number | string', '0', '内容内边距(WinUI Presenter Margin);数字按 px'],
  ['background', 'string', "'transparent'", '背景色(任意 CSS color)'],
  ['isTabStop', 'boolean', 'false', '兼容保留;滚动视口恒 tabindex=0(键盘方向键 / 空格 / PgUp / PgDn 滚动,a11y 要求)'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['@scroll', '(event: Event)', '视区每次滚动(原生 scroll 透传)'],
  ['@view-changed', "(detail: { horizontalOffset, verticalOffset, zoomFactor })", '滚动/缩放静止后防抖触发(对应 ViewChanged 的最终回调)'],
  ['@zoom-factor-changed', '(zoomFactor: number)', '缩放系数变化(Ctrl+滚轮、changeView、外部 v-model 写入)'],
  ['@update:zoom-factor', '(zoomFactor: number)', 'v-model:zoom-factor 的写入事件'],
]
const apiHeaders = ['方法(expose)', '签名', '说明']
const apiRows: (string | number)[][] = [
  ['changeView', "(h?: number | null, v?: number | null, zoom?: number | null, disableAnimation?: boolean) => boolean", '对照 WinUI ChangeView:null 表示该轴不变;目标轴 ScrollBarVisibility=Disabled 时返回 false(ScrollMode 不限编程滚动);默认动画'],
  ['scrollToLeft', '(disableAnimation?: boolean) => boolean', '滚动到最左'],
  ['scrollToRight', '(disableAnimation?: boolean) => boolean', '滚动到最右'],
  ['scrollToTop', '(disableAnimation?: boolean) => boolean', '滚动到顶部'],
  ['scrollToBottom', '(disableAnimation?: boolean) => boolean', '滚动到底部'],
  ['horizontalOffset / verticalOffset / zoomFactor', 'Ref<number>(实时)', '当前视区偏移与缩放系数(模板 ref 读取,示例 2 即此用法)'],
]

const usageCode = computed(
  () => `<WuiScrollViewer
  class="viewer"
  horizontal-scroll-mode="${hScrollModeValue.value}"
  vertical-scroll-mode="${vScrollModeValue.value}"
  horizontal-scroll-bar-visibility="${hBarVisibilityValue.value}"
  vertical-scroll-bar-visibility="${vBarVisibilityValue.value}"
  zoom-mode="${zoomModeValue.value}"
  v-model:zoom-factor="zoomFactor"
  :padding="${paddingValue.value}"
  :style="{ width: '400px', height: '266px' }"
  @view-changed="onViewChanged"
>
  <YourLongContent />
</WuiScrollViewer>

// 编程滚动(经模板 ref):
viewerRef.value?.scrollToBottom()
viewerRef.value?.changeView(0, 0, 1)`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ScrollViewer">
    <template #demo>
      <div class="viewer-stage">
        <!-- 例 1:参数面板联动(官方示例的参数组合) -->
        <section class="stage-block">
          <h3 class="stage-title">{{ example1Label }}</h3>
          <WuiScrollViewer
            v-model:zoom-factor="zoomValue"
            class="main-viewer"
            :horizontal-scroll-mode="hScrollModeValue"
            :vertical-scroll-mode="vScrollModeValue"
            :horizontal-scroll-bar-visibility="hBarVisibilityValue"
            :vertical-scroll-bar-visibility="vBarVisibilityValue"
            :zoom-mode="zoomModeValue"
            :padding="paddingValue"
            :background="backgroundValue"
            @view-changed="onMainViewChanged"
          >
            <div class="article">
              <h3 class="article-title">长内容滚动演示</h3>
              <p class="article-text">
                ScrollViewer 是滚动物料的容器:内容按视区尺寸参与布局,超出可视区域的部分转为滚动溢出,
                由水平/垂直滚动条与滚轮、触摸平移承接。本段文本足够长,可通过右侧滚动条或鼠标滚轮纵向滚动。
              </p>
              <p class="article-text">
                滚动条可见性(ScrollBarVisibility)决定轴上能否滚动与滚动条的显示:Auto 按内容是否溢出
                启用滚动并按需显示滚动条,Visible 常显,Hidden 隐藏但仍可滚动,Disabled 连滚动一起禁用。
                滚动模式(ScrollMode)只管用户输入:Disabled 时滚轮、触摸、键盘与滚动条拖拽被忽略,
                内容内嵌套可滚子区域不受影响,编程滚动也不受限 —— 可用右侧参数面板逐一体验。
              </p>
              <p class="article-text">
                下面的色条宽 640px,超出 400px 的视区,用于触发横向滚动:把 HorizontalScrollMode 切到
                Enabled 或保持 Auto,横向滚动条即按其可见性策略出现。
              </p>
              <div class="wide-strip">
                <svg width="640" height="36" viewBox="0 0 640 36" aria-hidden="true">
                  <rect width="160" height="36" fill="#0000FF" />
                  <rect x="160" width="160" height="36" fill="#008000" />
                  <rect x="320" width="160" height="36" fill="#FF0000" />
                  <rect x="480" width="160" height="36" fill="#FFFF00" />
                </svg>
                <p class="wide-strip-caption">← 640 × 36 色条(横向溢出载荷)→</p>
              </div>
              <p class="article-text">
                当 ZoomMode 为 Enabled 时,按住 Ctrl 滚动滚轮(或触控板捏合)可以缩放内容:
                内容按未缩放尺寸布局后整体缩放,滚动范围随缩放自动增长,缩放围绕视口中心锚定,
                缩放系数经 v-model:zoom-factor 与右侧滑块双向同步(0.1 – 10)。
              </p>
              <p class="article-text">
                这是内容的结尾。滚动到此处时,viewChanged 事件(防抖后)已在下方计数;
                WinUI 中 ListView、GridView 等列表控件的模板内置 ScrollViewer,行为与此处一致。
              </p>
            </div>
          </WuiScrollViewer>
          <p class="readout">
            viewChanged ×{{ mainViewChangedCount }}
            <template v-if="mainLastView">
              · 最近:x {{ mainLastView.horizontalOffset.toFixed(0) }} / y
              {{ mainLastView.verticalOffset.toFixed(0) }} / zoom {{ mainLastView.zoomFactor.toFixed(2) }}
            </template>
          </p>
          <p class="zoom-hint">{{ zoomHint }}</p>
        </section>

        <!-- 例 2:编程滚动按钮组 -->
        <section class="stage-block">
          <h3 class="stage-title">{{ example2Label }}</h3>
          <div class="api-layout">
            <WuiScrollViewer
              ref="apiViewer"
              class="api-viewer"
              horizontal-scroll-bar-visibility="Auto"
              vertical-scroll-bar-visibility="Visible"
              @scroll="onApiScroll"
              @view-changed="onApiViewChanged"
            >
              <div class="api-content">
                <div v-for="n in 24" :key="n" class="api-row">第 {{ n }} 行 · 编程 API 演示行 —— 这一行很宽,向右滚动才能看到结尾 →</div>
              </div>
            </WuiScrollViewer>
            <div class="api-buttons">
              <WuiButton @click="toTop">滚到顶部</WuiButton>
              <WuiButton @click="toBottom">滚到底部</WuiButton>
              <WuiButton @click="toLeft">滚到最左</WuiButton>
              <WuiButton @click="toRight">滚到最右</WuiButton>
              <WuiButton @click="zoomIn">放大 ×1.25</WuiButton>
              <WuiButton @click="zoomOut">缩小 ÷1.25</WuiButton>
              <WuiButton @click="resetView">复位视图</WuiButton>
            </div>
          </div>
          <p class="readout">
            偏移 x {{ liveH.toFixed(0) }} / y {{ liveV.toFixed(0) }} · zoom {{ liveZoom.toFixed(2) }} ·
            scroll ×{{ scrollEventCount }} · viewChanged ×{{ viewChangedCount }}
          </p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="ZoomMode 缩放模式" type="select" v-model="zoomModeInput" :options="ZOOM_MODE_CHOICES" />
        <DemoOptionRow label="ZoomFactor 缩放系数" type="slider" v-model="zoomFactorInput" :min="0.1" :max="10" :step="0.1" />
        <DemoOptionRow label="HorizontalScrollMode" type="select" v-model="hScrollModeInput" :options="SCROLL_MODE_CHOICES" />
        <DemoOptionRow label="VerticalScrollMode" type="select" v-model="vScrollModeInput" :options="SCROLL_MODE_CHOICES" />
        <DemoOptionRow label="HorizontalScrollBarVisibility" type="select" v-model="hBarVisibilityInput" :options="BAR_VISIBILITY_CHOICES" />
        <DemoOptionRow label="VerticalScrollBarVisibility" type="select" v-model="vBarVisibilityInput" :options="BAR_VISIBILITY_CHOICES" />
        <DemoOptionRow label="Padding(px)" type="slider" v-model="paddingInput" :min="0" :max="24" :step="1" />
        <DemoOptionRow label="卡片背景" type="toggle" v-model="cardBackground" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">属性</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">编程 API(模板 ref)</h3>
      <DemoDocsTable :headers="apiHeaders" :rows="apiRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.viewer-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
}

.stage-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.stage-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* —— 例 1:主 ScrollViewer(400 × 266,对照官方示例尺寸)—— */
.main-viewer {
  width: 400px;
  height: 266px;
  border: 1px solid var(--wui-list-view-header-item-divider-stroke);
}

.article {
  padding: 12px 16px 4px;
  color: var(--wui-application-foreground-theme);
}

.article-title {
  margin: 0 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
}

.article-text {
  margin: 0 0 12px;
  font-size: var(--wui-control-content-theme-font-size);
  line-height: 1.6;
}

.wide-strip {
  margin: 0 0 12px;
}

.wide-strip svg {
  display: block;
}

.wide-strip-caption {
  margin: 4px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 例 2:编程滚动 —— */
.api-layout {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.api-viewer {
  width: 340px;
  height: 200px;
  border: 1px solid var(--wui-list-view-header-item-divider-stroke);
}

.api-content {
  min-width: 520px;
}

.api-row {
  padding: 6px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  white-space: nowrap;
}

.api-row:nth-child(odd) {
  background: var(--wui-system-control-page-background-chrome-low);
}

.api-buttons {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.readout {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

.zoom-hint {
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
