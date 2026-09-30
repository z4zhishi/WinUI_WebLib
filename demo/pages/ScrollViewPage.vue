<script setup lang="ts">
// ScrollView 示例页:对照官方 WinUI Gallery ScrollViewPage 的三个示例 ——
//   Example1(参数舞台:ZoomMode/ZoomFactor/ScrollMode/ScrollBarVisibility 组合,本页扩展 ContentOrientation)
//   Example3(编程滚动:ScrollTo/ScrollBy + 动画模式与时长,ScrollAnimationStarting/ScrollCompleted 事件)
//   Example1 的照片查看器场景(ContentOrientation=None + ZoomMode=Enabled,Ctrl+滚轮 / zoomTo / zoomBy)
// 官方 Example2 的 AddScrollVelocity 恒速滚动未复刻(惯性物理不适用 Web,wiki 差异节记录),以
//   scrollBy 连续步进近似。
import { ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiScrollView from '@/components/ScrollView.vue'
import type { ScrollingInteractionState, ScrollingMotionOptions, ScrollViewViewChangedArgs } from '@/components/ScrollView.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ScrollView(滚动视口)', en: 'ScrollView' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI 3 新滚动控件:让用户平移和缩放比可视区域更大的内容(ContentOrientation 声明内容测量方向,编程滚动/缩放带动画事件)。与 ScrollViewer 并存,差异见 wiki「ScrollView vs ScrollViewer 差异」。',
  en: 'The new WinUI 3 scrolling control: pan and zoom content larger than the viewport. Declares content measurement via ContentOrientation; programmatic scroll/zoom with animation events. Coexists with ScrollViewer — see the wiki comparison.',
}
const S1_LABEL: BilingualText = { zh: '参数舞台:ContentOrientation + 滚动条 + 缩放', en: 'Options stage: ContentOrientation + scrollbars + zoom' }
const S2_LABEL: BilingualText = { zh: '编程滚动(scrollTo / scrollBy)', en: 'Programmatic scroll (scrollTo / scrollBy)' }
const S3_LABEL: BilingualText = { zh: '照片查看器(ContentOrientation=None + 缩放)', en: 'Photo viewer (ContentOrientation=None + zoom)' }
const READOUT_LABEL: BilingualText = { zh: '实时读数', en: 'Live readout' }
const LOG_LABEL: BilingualText = { zh: '事件日志', en: 'Event log' }
const CTRL_WHEEL_HINT: BilingualText = { zh: '提示:ZoomMode=Enabled 时按住 Ctrl + 滚轮(触控板捏合)可在内容上缩放', en: 'Tip: with ZoomMode=Enabled, Ctrl + mouse wheel (trackpad pinch) zooms the content' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const s1Label = useBilingual(i18n, S1_LABEL)
const s2Label = useBilingual(i18n, S2_LABEL)
const s3Label = useBilingual(i18n, S3_LABEL)
const readoutLabel = useBilingual(i18n, READOUT_LABEL)
const logLabel = useBilingual(i18n, LOG_LABEL)
const ctrlWheelHint = useBilingual(i18n, CTRL_WHEEL_HINT)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** 把 DemoOptionRow 的联合类型值安全收窄为组件枚举(非法值回退默认)。 */
function castEnum<T extends string>(value: string | number | boolean, allowed: readonly string[], fallback: T): T {
  const s = String(value)
  return (allowed.includes(s) ? s : fallback) as T
}

// ===================================================================================
// 场景 1:参数舞台(官方 Example1 的选项面板 + ContentOrientation)
// ===================================================================================
const ORIENTATIONS = ['Vertical', 'Horizontal', 'None', 'Both'] as const
const SCROLL_MODES = ['Enabled', 'Disabled', 'Auto'] as const
const BAR_VISIBILITIES = ['Auto', 'Visible', 'Hidden'] as const
const ZOOM_MODES = ['Enabled', 'Disabled'] as const

const contentOrientation = ref<string | number | boolean>('Vertical')
const zoomMode = ref<string | number | boolean>('Enabled')
const zoomFactor = ref<string | number | boolean>(1)
const horizontalScrollMode = ref<string | number | boolean>('Auto')
const verticalScrollMode = ref<string | number | boolean>('Auto')
const horizontalScrollBarVisibility = ref<string | number | boolean>('Auto')
const verticalScrollBarVisibility = ref<string | number | boolean>('Auto')

const ORIENTATION_CHOICES = [
  { label: 'Vertical(内容宽受约束,竖向滚动)', value: 'Vertical' },
  { label: 'Horizontal(内容高受约束,横向滚动)', value: 'Horizontal' },
  { label: 'None(双向约束到视口,照片查看器)', value: 'None' },
  { label: 'Both(双向取自然尺寸)', value: 'Both' },
]
const SCROLL_MODE_CHOICES = [
  { label: 'Auto(按输入方式,Web 同 Enabled)', value: 'Auto' },
  { label: 'Enabled(用户可滚动)', value: 'Enabled' },
  { label: 'Disabled(仅编程滚动)', value: 'Disabled' },
]
const BAR_VISIBILITY_CHOICES = [
  { label: 'Auto(可滚时显示)', value: 'Auto' },
  { label: 'Visible(常驻)', value: 'Visible' },
  { label: 'Hidden(隐藏,可滚性保留)', value: 'Hidden' },
]
const ZOOM_MODE_CHOICES = [
  { label: 'Enabled(Ctrl+滚轮缩放)', value: 'Enabled' },
  { label: 'Disabled', value: 'Disabled' },
]

const view1 = ref<ScrollViewViewChangedArgs>({ horizontalOffset: 0, verticalOffset: 0, zoomFactor: 1 })
const state1 = ref<ScrollingInteractionState>('Idle')
const extent1 = ref({ width: 0, height: 0 })

function onView1(args: ScrollViewViewChangedArgs): void {
  view1.value = args
}
function onState1(args: { state: ScrollingInteractionState }): void {
  state1.value = args.state
}
function onExtent1(args: { extentWidth: number; extentHeight: number }): void {
  extent1.value = { width: Math.round(args.extentWidth), height: Math.round(args.extentHeight) }
}

// 内容墙:24 块编号瓷砖,按 ContentOrientation 切换测量布局(见下方 tiles CSS 注释)
const TILE_COUNT = 24

// ===================================================================================
// 场景 2:编程滚动(官方 Example3:动画模式 + 时长 + ScrollAnimationStarting/Completed)
// ===================================================================================
const scrollView2Ref = ref<InstanceType<typeof WuiScrollView> | null>(null)
const useAnimation = ref<string | number | boolean>(true)
const durationMs = ref<string | number | boolean>(800)

const offsets2 = ref({ x: 0, y: 0 })
const eventLog2 = ref<string[]>([])
let logSeq = 0

function log2(message: string): void {
  eventLog2.value = [`#${++logSeq} ${message}`, ...eventLog2.value].slice(0, 5)
}

function motionOptions2(): ScrollingMotionOptions {
  if (useAnimation.value !== true) return { animation: 'Disabled' }
  return { animation: 'Enabled', durationMs: toNumber(durationMs.value, 800) }
}

function onView2(args: ScrollViewViewChangedArgs): void {
  offsets2.value = { x: Math.round(args.horizontalOffset), y: Math.round(args.verticalOffset) }
}

function scrollToTop2(): void {
  scrollView2Ref.value?.scrollTo(0, 0, motionOptions2())
  log2('scrollTo(0, 0)')
}
function scrollToBottom2(): void {
  // 超出可滚动范围的目标会被钳制到右/下边界(与 WinUI ScrollTo 一致)
  scrollView2Ref.value?.scrollTo(0, 1e5, motionOptions2())
  log2('scrollTo(0, 1e5)(钳制到底部)')
}
function scrollUp2(): void {
  scrollView2Ref.value?.scrollBy(0, -160, motionOptions2())
  log2('scrollBy(0, -160)')
}
function scrollDown2(): void {
  scrollView2Ref.value?.scrollBy(0, 160, motionOptions2())
  log2('scrollBy(0, 160)')
}
function scrollPage2(): void {
  // scrollToOffset:scrollTo 的任务约定别名(WinUI ScrollTo 同义)
  scrollView2Ref.value?.scrollToOffset(0, offsets2.value.y + 320, motionOptions2())
  log2('scrollToOffset(0, y + 320)')
}

function onScrollAnimationStarting2(args: { targetHorizontalOffset: number; targetVerticalOffset: number }): void {
  log2(`scrollAnimationStarting → 目标 (${Math.round(args.targetHorizontalOffset)}, ${Math.round(args.targetVerticalOffset)})`)
}
function onScrollCompleted2(args: { horizontalOffset: number; verticalOffset: number }): void {
  log2(`scrollCompleted → 实际 (${Math.round(args.horizontalOffset)}, ${Math.round(args.verticalOffset)})`)
}

// ===================================================================================
// 场景 3:照片查看器(ContentOrientation=None + ZoomMode=Enabled;官方 Example1 场景)
// ===================================================================================
const scrollView3Ref = ref<InstanceType<typeof WuiScrollView> | null>(null)
const zoom3 = ref(1)

function onView3(args: ScrollViewViewChangedArgs): void {
  zoom3.value = Math.round(args.zoomFactor * 100) / 100
}
function zoomTo3(factor: number): void {
  scrollView3Ref.value?.zoomTo(factor, undefined, { animation: 'Enabled', durationMs: 400 })
}
function zoomBy3(delta: number): void {
  scrollView3Ref.value?.zoomBy(delta, undefined, { animation: 'Enabled', durationMs: 400 })
}

// —— 下半区固定开发文档 ——
const DOCS_HEADERS = ['属性 / 方法', '类型', '默认值', '说明']
const DOCS_ROWS: (string | number)[][] = [
  ['contentOrientation', "'Vertical' | 'Horizontal' | 'None' | 'Both'", "'Vertical'", '内容测量方向:Vertical 内容宽约束到视口、可竖向滚动;Horizontal 相反;None 双向约束到视口(照片查看器);Both 双向取自然尺寸'],
  ['horizontalScrollBarVisibility / verticalScrollBarVisibility', "'Auto' | 'Visible' | 'Hidden'", "'Auto'", '各轴滚动条可见性;Hidden 隐藏滚动条但保留滚动能力(与 Disabled 滚动不同)'],
  ['horizontalScrollMode / verticalScrollMode', "'Enabled' | 'Disabled' | 'Auto'", "'Auto'", '各轴用户滚动模式;Disabled 时用户输入不可滚,编程滚动(scrollTo)仍可用;Auto 在 Web 按 Enabled 处理'],
  ['zoomMode', "'Enabled' | 'Disabled'", "'Disabled'", '缩放模式;Enabled 时 Ctrl+滚轮 / 触控板捏合缩放'],
  ['zoomFactor', 'number', '1', '初始缩放倍数;属性变化即时 zoomTo(运行中读数经 viewChanged / 组件实例暴露)'],
  ['minZoomFactor / maxZoomFactor', 'number', '0.1 / 10', '缩放倍数边界(对照 WinUI 默认值),超界自动钳制'],
  ['isTabStop', 'boolean', 'false', '是否可聚焦(WinUI IsTabStop);聚焦后方向键 / 翻页键原生滚动生效'],
  ['disabled', 'boolean', 'false', '禁用(WinUI IsEnabled=false):指针与滚轮交互关闭'],
  ['scrollTo(h, v, options?) / scrollToOffset', '(number, number, ScrollingMotionOptions?) => void', '—', '滚动到目标偏移,超出范围自动钳制;options.animation 默认 Enabled,rAF 补间;scrollToOffset 为别名'],
  ['scrollBy(dh, dv, options?)', '(number, number, ScrollingMotionOptions?) => void', '—', '相对当前偏移滚动 delta'],
  ['zoomTo(factor, center?, options?) / zoomBy(delta, center?, options?)', '(number, {x,y}?, ScrollingMotionOptions?) => void', '—', '缩放到 / 相对缩放;center 为视口内锚点坐标(缺省视口中心),倍数钳制到 Min/Max'],
  ['viewChanged 等 7 个事件', '(args) => void', '—', '见下方事件表;WinUI 事件名 camelCase,模板里监听写 @view-changed 等'],
]

const EVENT_HEADERS = ['事件', '参数', '触发时机']
const EVENT_ROWS: (string | number)[][] = [
  ['viewChanged', '{ horizontalOffset, verticalOffset, zoomFactor }', '偏移或缩放变化后(rAF 节流)'],
  ['extentChanged', '{ extentWidth, extentHeight }', '内容总尺寸变化(orientation 切换、缩放、内容增删)'],
  ['stateChanged', '{ state }', '交互状态切换:Idle / Interaction / Animation(Inertia 未复刻)'],
  ['scrollAnimationStarting', '{ targetHorizontalOffset, targetVerticalOffset }', '编程滚动动画开始前'],
  ['scrollCompleted', '{ horizontalOffset, verticalOffset }', '编程滚动动画结束后'],
  ['zoomAnimationStarting', '{ targetZoomFactor }', '编程缩放动画开始前'],
  ['zoomCompleted', '{ zoomFactor }', '编程缩放动画结束后'],
]

// 用法代码(最小用法,完整参数体验见上方场景)
const usageCode = [
  '<WuiScrollView',
  '  :style="{ width: \'100%\', maxWidth: 560, height: 240 }"',
  '  content-orientation="Vertical"',
  '  zoom-mode="Enabled"',
  '  is-tab-stop',
  '  @view-changed="onViewChanged">',
  '  <YourBigContent />',
  '</WuiScrollView>',
].join('\n')
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ScrollView">
    <template #demo>
      <div class="scrollview-stage">
        <!-- 场景 1:参数舞台 -->
        <section class="stage-section">
          <h4 class="stage-title">{{ s1Label }}</h4>
          <WuiScrollView
            class="stage-box"
            :content-orientation="castEnum(contentOrientation, ORIENTATIONS, 'Vertical')"
            :zoom-mode="castEnum(zoomMode, ZOOM_MODES, 'Enabled')"
            :zoom-factor="toNumber(zoomFactor, 1)"
            :horizontal-scroll-mode="castEnum(horizontalScrollMode, SCROLL_MODES, 'Auto')"
            :vertical-scroll-mode="castEnum(verticalScrollMode, SCROLL_MODES, 'Auto')"
            :horizontal-scroll-bar-visibility="castEnum(horizontalScrollBarVisibility, BAR_VISIBILITIES, 'Auto')"
            :vertical-scroll-bar-visibility="castEnum(verticalScrollBarVisibility, BAR_VISIBILITIES, 'Auto')"
            is-tab-stop
            @view-changed="onView1"
            @state-changed="onState1"
            @extent-changed="onExtent1"
          >
            <div class="tiles" :class="`tiles--${String(contentOrientation).toLowerCase()}`">
              <div v-for="n in TILE_COUNT" :key="n" class="tile" :class="`tile--${n % 4}`">{{ n }}</div>
            </div>
          </WuiScrollView>
          <p class="stage-readout">
            {{ readoutLabel }}:
            <span class="readout-mono">
              offset ({{ Math.round(view1.horizontalOffset) }}, {{ Math.round(view1.verticalOffset) }}) ·
              zoom ×{{ Math.round(view1.zoomFactor * 100) / 100 }} ·
              extent {{ extent1.width }} × {{ extent1.height }} · state {{ state1 }}
            </span>
          </p>
        </section>

        <!-- 场景 2:编程滚动 -->
        <section class="stage-section">
          <h4 class="stage-title">{{ s2Label }}</h4>
          <div class="stage-row">
            <WuiScrollView
              ref="scrollView2Ref"
              class="stage-box stage-box--list"
              is-tab-stop
              @view-changed="onView2"
              @scroll-animation-starting="onScrollAnimationStarting2"
              @scroll-completed="onScrollCompleted2"
            >
              <div class="cards">
                <div v-for="n in 8" :key="n" class="card" :class="`card--${n % 3}`">
                  <span class="card-index">{{ n }}</span>
                  <span class="card-text">卡片 {{ n }} / 8(scrollTo / scrollBy 目标)</span>
                </div>
              </div>
            </WuiScrollView>
            <div class="stage-actions">
              <WuiButton content="回到顶部" @click="scrollToTop2" />
              <WuiButton content="滚动到底部" @click="scrollToBottom2" />
              <WuiButton content="上移 160" @click="scrollUp2" />
              <WuiButton content="下移 160" @click="scrollDown2" />
              <WuiButton content="下一屏(scrollToOffset)" @click="scrollPage2" />
              <!-- 动画开关与时长经 motionOptions2() 真实传入 scrollTo/scrollBy 的补间选项 -->
              <div class="stage-options">
                <DemoOptionRow label="使用动画" type="toggle" v-model="useAnimation" />
                <DemoOptionRow label="动画时长(ms)" type="slider" v-model="durationMs" :min="100" :max="3000" :step="100" />
              </div>
              <p class="stage-readout">
                {{ readoutLabel }}:
                <span class="readout-mono">offset ({{ offsets2.x }}, {{ offsets2.y }})</span>
              </p>
              <div class="event-log">
                <p class="event-log-title">{{ logLabel }}</p>
                <p v-for="entry in eventLog2" :key="entry" class="event-log-entry">{{ entry }}</p>
                <p v-if="eventLog2.length === 0" class="event-log-entry event-log-entry--empty">—</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 场景 3:照片查看器 -->
        <section class="stage-section">
          <h4 class="stage-title">{{ s3Label }}</h4>
          <WuiScrollView class="stage-box" content-orientation="None" zoom-mode="Enabled" is-tab-stop @view-changed="onView3">
            <!-- None:内容双向约束到视口(SVG preserveAspectRatio = WinUI Image Stretch=Uniform 的对应物);
                 缩放后内容超出视口才可滚动 -->
            <svg class="poster" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet" role="img" aria-label="山景示例海报">
              <rect width="1200" height="800" fill="var(--wui-system-control-background-chrome-medium-low)" />
              <circle cx="950" cy="180" r="90" fill="var(--wui-system-accent-color, #5f37be)" opacity="0.85" />
              <path d="M0 620 L260 380 L430 560 L610 330 L820 620 Z" fill="var(--wui-system-control-foreground-chrome-gray)" />
              <path d="M430 620 L720 300 L980 560 L1200 420 L1200 620 Z" fill="var(--wui-list-view-header-item-divider-stroke)" />
              <rect y="620" width="1200" height="180" fill="var(--wui-system-control-background-chrome-medium)" />
              <text x="48" y="740" font-size="56" fill="var(--wui-application-secondary-foreground-theme)">ScrollView · zoom ×{{ zoom3 }}</text>
            </svg>
          </WuiScrollView>
          <div class="stage-actions stage-actions--row">
            <WuiButton content="1×" @click="zoomTo3(1)" />
            <WuiButton content="2×" @click="zoomTo3(2)" />
            <WuiButton content="4×" @click="zoomTo3(4)" />
            <WuiButton content="放大 zoomBy(1.25)" @click="zoomBy3(1.25)" />
            <WuiButton content="缩小 zoomBy(0.8)" @click="zoomBy3(0.8)" />
            <span class="stage-readout">
              zoom ×{{ zoom3 }}
              <span class="readout-mono">(zoomTo / zoomBy / Ctrl+滚轮)</span>
            </span>
          </div>
          <p class="stage-hint">{{ ctrlWheelHint }}</p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="ContentOrientation 内容方向" type="select" v-model="contentOrientation" :options="ORIENTATION_CHOICES" />
        <DemoOptionRow label="ZoomMode 缩放模式" type="select" v-model="zoomMode" :options="ZOOM_MODE_CHOICES" />
        <DemoOptionRow label="ZoomFactor 缩放倍数" type="slider" v-model="zoomFactor" :min="0.1" :max="4" :step="0.1" />
        <DemoOptionRow label="HorizontalScrollMode" type="select" v-model="horizontalScrollMode" :options="SCROLL_MODE_CHOICES" />
        <DemoOptionRow label="VerticalScrollMode" type="select" v-model="verticalScrollMode" :options="SCROLL_MODE_CHOICES" />
        <DemoOptionRow label="HorizontalScrollBarVisibility" type="select" v-model="horizontalScrollBarVisibility" :options="BAR_VISIBILITY_CHOICES" />
        <DemoOptionRow label="VerticalScrollBarVisibility" type="select" v-model="verticalScrollBarVisibility" :options="BAR_VISIBILITY_CHOICES" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">属性与方法(编程 API 对照 WinUI ScrollView.idl)</h4>
      <DemoDocsTable :headers="DOCS_HEADERS" :rows="DOCS_ROWS" />
      <h4 class="docs-subtitle">事件</h4>
      <DemoDocsTable :headers="EVENT_HEADERS" :rows="EVENT_ROWS" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.scrollview-stage {
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

.stage-box {
  width: 100%;
  max-width: 560px;
  height: 240px;
  margin: 0 auto;
  /* 官方示例 400x266 场景的边界观感:细描边容器便于看清视口范围 */
  border: 1px solid var(--wui-system-control-background-base-low);
}

.stage-box--list {
  height: 264px;
}

.stage-row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.stage-box--list.stage-box {
  margin: 0;
}

.stage-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  min-width: 300px;
}

/* 场景 2 的动画开关/时长行(复用 DemoOptionRow 卡片观感,与按钮列同宽) */
.stage-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-actions--row {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.stage-readout {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.readout-mono {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

.stage-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  text-align: center;
}

.event-log {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

/* —— 场景 1 内容墙:按 ContentOrientation 切换测量布局(对应 ScrollView-spec 四个示例)—— */
/* Vertical:内容盒宽 100%(组件内已约束)→ 瓷砖自动换行 → 仅竖向滚动 */
.tiles--vertical {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
}

/* Horizontal:不换行的单行(flex 容器取 max-content 宽,由组件内容盒承载)→ 仅横向滚动 */
.tiles--horizontal {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 8px;
  width: max-content;
}

/* None:双向约束到视口 → 网格压缩适配视口;超出部分裁剪(None 语义:内容按视口尺寸排布),
   缩放后内容盒被 CSS zoom 放大才会出现滚动(照片查看器流程) */
.tiles--none {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  padding: 8px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

/* Both:固定 8 列宽轨(内容自然尺寸)→ 双向滚动 */
.tiles--both {
  display: grid;
  grid-template-columns: repeat(8, 150px);
  grid-auto-rows: 90px;
  gap: 8px;
  padding: 8px;
  width: max-content;
}

.tile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 120px;
  height: 80px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 网格/压缩布局下瓷砖尺寸交给轨道;Horizontal 单行仍需固定宽,避免收缩成文字宽 */
.tiles--none .tile,
.tiles--both .tile {
  width: auto;
  height: auto;
  min-height: 80px;
}

.tiles--horizontal .tile {
  min-height: 80px;
}

.tile--0 {
  background: color-mix(in srgb, var(--wui-system-accent-color, #5f37be) 24%, var(--wui-application-page-background-theme));
}

.tile--1 {
  background: var(--wui-system-control-background-chrome-medium-low);
}

.tile--2 {
  background: var(--wui-list-view-header-item-divider-stroke);
}

.tile--3 {
  background: var(--wui-system-control-background-chrome-black-low);
}

/* —— 场景 2:卡片列表 —— */
.cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.card {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 88px;
  padding: 12px 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.card-index {
  font-size: var(--wui-hub-section-header-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
}

.card-text {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.card--0 {
  background: color-mix(in srgb, var(--wui-system-accent-color, #5f37be) 18%, var(--wui-application-page-background-theme));
}

.card--1 {
  background: var(--wui-system-control-background-chrome-medium-low);
}

.card--2 {
  background: var(--wui-system-control-background-chrome-medium);
}

/* —— 场景 3:海报(None 语义下 SVG 以 Uniform 语义适配视口)—— */
.poster {
  display: block;
  width: 100%;
  height: 100%;
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

  .stage-box--list.stage-box {
    margin: 0 auto;
  }
}
</style>
