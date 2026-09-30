<script setup lang="ts">
// ParallaxView 示例页:对照官方 WinUI Gallery ParallaxViewPage ——
//   场景 1 = 官方 Example1 复刻:ParallaxView 作背景(锚定填充),Source 显式绑定兄弟滚动列表,
//            半透明列表盖在视差图上滚动(cliff.jpg 换成 token 着色的内联 SVG 山景);
//   场景 2 = 双向 shift + shift=0 对照:三个 ParallaxView 置于同一滚动内容内(缺省 Source =
//            最近可滚祖先,覆盖官方 TestUI 的 in-source 场景),正 shift 慢于滚动 / 负 shift 反向 / 0 禁用;
//   场景 3 = 水平视差:HorizontalShift + 横向滚动内容(对照官方 TestUI ParallaxViewPage 横向组)。
// 官方 Example2(ScrollView 兄弟源 + 矩形列)与场景 1 同构,未单独复刻。
import { computed, ref } from 'vue'
import WuiParallaxView from '@/components/ParallaxView.vue'
import WuiScrollView from '@/components/ScrollView.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ParallaxView(视差视图)', en: 'ParallaxView' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '容器控件:滚动源滚动时让子内容(通常为图像)按比例平移,产生「背景慢于前景」的深度视差。上半区复刻官方示例的背景视差与内容内视差,可实时调节 shift 强度、钳制与源偏移。',
  en: 'A container that shifts its child (usually an image) proportionally while the scroll source scrolls, creating depth. Recreates the official background and in-content parallax samples with live shift, clamping and source-offset options.',
}
const S1_LABEL: BilingualText = { zh: '场景 1:背景视差(官方示例复刻,Source 显式绑定兄弟列表)', en: 'Scene 1: background parallax (official sample replica, Source bound to sibling list)' }
const S2_LABEL: BilingualText = { zh: '场景 2:双向 shift 对照(缺省 Source = 最近可滚祖先)', en: 'Scene 2: shift direction comparison (default Source = nearest scrollable ancestor)' }
const S3_LABEL: BilingualText = { zh: '场景 3:水平视差(HorizontalShift)', en: 'Scene 3: horizontal parallax (HorizontalShift)' }
const S1_SCROLL_HINT: BilingualText = { zh: '↓ 滚动下面的列表,观察背景山景的视差', en: '↓ Scroll the list below to parallax the background scenery' }
const S2_POS_NOTE: BilingualText = { zh: '正 shift:子元素移动慢于滚动(经典背景视差)', en: 'Positive shift: child moves slower than the scroll (classic background parallax)' }
const S2_NEG_NOTE: BilingualText = { zh: '负 shift:子元素反向移动(先上后下)', en: 'Negative shift: child moves in the opposite direction' }
const S2_ZERO_NOTE: BilingualText = { zh: 'shift = 0:视差禁用,子元素随内容 1:1 滚动', en: 'Shift = 0: parallax disabled, child scrolls 1:1 with the content' }
const COMPARE_MAG_LABEL: BilingualText = { zh: '对照幅度 |VerticalShift|(px)', en: 'Comparison magnitude |VerticalShift| (px)' }
const H_SHIFT_LABEL: BilingualText = { zh: 'HorizontalShift(px,横向拖动观察)', en: 'HorizontalShift (px, drag horizontally)' }
const READOUT_LABEL: BilingualText = { zh: '当前视差平移', en: 'Current parallax offset' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const s1Label = useBilingual(i18n, S1_LABEL)
const s2Label = useBilingual(i18n, S2_LABEL)
const s3Label = useBilingual(i18n, S3_LABEL)
const s1ScrollHint = useBilingual(i18n, S1_SCROLL_HINT)
const s2PosNote = useBilingual(i18n, S2_POS_NOTE)
const s2NegNote = useBilingual(i18n, S2_NEG_NOTE)
const s2ZeroNote = useBilingual(i18n, S2_ZERO_NOTE)
const compareMagLabel = useBilingual(i18n, COMPARE_MAG_LABEL)
const hShiftLabel = useBilingual(i18n, H_SHIFT_LABEL)
const readoutLabel = useBilingual(i18n, READOUT_LABEL)

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
// 场景 1:背景视差(官方 Example1:ParallaxView 在下、半透明列表在上,Source 绑列表)
// ===================================================================================
const heroScrollerRef = ref<InstanceType<typeof WuiScrollView> | null>(null)
const heroParallaxRef = ref<InstanceType<typeof WuiParallaxView> | null>(null)

// 兄弟滚动源:组件根即滚动容器,经 $el 取真实元素传给 source(WinUI Source={Binding listView} 的对应物)
const heroSource = computed<HTMLElement | null>(() => {
  const candidate: unknown = heroScrollerRef.value?.$el
  return candidate instanceof HTMLElement ? candidate : null
})

// 参数面板(官方示例的 VerticalShift=500 + 本页扩展的源偏移/钳制/比率)
const heroVerticalShift = ref<string | number | boolean>(300)
const heroMaxRatio = ref<string | number | boolean>(1)
const heroClamped = ref<string | number | boolean>(true)
const heroStartOffset = ref<string | number | boolean>(0)
const heroEndOffset = ref<string | number | boolean>(0)
const heroKind = ref<string | number | boolean>('Relative')

const OFFSET_KINDS = ['Relative', 'Absolute'] as const
const OFFSET_KIND_CHOICES = [
  { label: 'Relative(在自动值上叠加)', value: 'Relative' },
  { label: 'Absolute(绝对值,需自定起止)', value: 'Absolute' },
]

const heroParallaxReadout = computed(() => {
  const y = heroParallaxRef.value?.parallaxY
  return typeof y === 'number' ? Math.round(y) : null
})

// 列表行数(官方示例以数据源填充列表,这里用固定行数的示意列表)
const HERO_ROW_COUNT = 18

// ===================================================================================
// 场景 2:双向 shift + shift=0 对照(三个 ParallaxView 在同一滚动内容内,缺省 Source 自动解析)
// ===================================================================================
const compareMag = ref<string | number | boolean>(240)
const compareMagValue = computed(() => toNumber(compareMag.value, 240))

// ===================================================================================
// 场景 3:水平视差(HorizontalShift,横向滚动内容)
// ===================================================================================
const hShift = ref<string | number | boolean>(120)
const hShiftValue = computed(() => toNumber(hShift.value, 120))
const H_TILE_COUNT = 8

// —— 下半区固定开发文档 ——
const DOCS_HEADERS = ['属性 / 方法', '类型', '默认值', '说明']
const DOCS_ROWS: (string | number)[][] = [
  ['verticalShift / horizontalShift', 'number', '0', '视差强度(px):滚动全程内子元素的最大平移量;0 = 该轴禁用;正值子元素慢于滚动,负值反向'],
  ['maxVerticalShiftRatio / maxHorizontalShiftRatio', 'number', '1.0', '平移速率上限:每滚动 1px 子元素至多平移的 px(取 max(0, 值));小于 shift/(源起止跨度) 时提前封顶'],
  ['isVerticalShiftClamped / isHorizontalShiftClamped', 'boolean', 'true', '是否把平移钳制在 ±shift 内;false(未钳制)时全程线性,超出 ±shift 后会露出底边(与 WinUI 一致)'],
  ['verticalSourceOffsetKind / horizontalSourceOffsetKind', "'Relative' | 'Absolute'", "'Relative'", '源偏移种类:Relative 把 start/end 偏移叠加到自动值上;Absolute 直接使用(绝对值需自行覆盖滚动全程)'],
  ['verticalSourceStartOffset / verticalSourceEndOffset(水平同名)', 'number', '0', '源起始/结束偏移:视差映射的滚动区间 [start, end],超出区间后平移保持(钳制时)'],
  ['source', 'HTMLElement | null', 'undefined', '滚动源(WinUI Source):undefined 自动取最近可滚祖先(overflow: auto/scroll/overlay);null 显式禁用;传元素可绑定兄弟滚动容器'],
  ['child(默认 slot)', 'any', '—', '视差子内容,通常为一张图;建议撑满包裹层(width/height 100% 或 object-fit)'],
  ['refreshAutomaticVerticalOffsets / refreshAutomaticHorizontalOffsets', '() => void', '—', '重算自动源偏移(WinUI 同名方法);Web 侧偏移实时计算,调用等价于触发一次重算'],
  ['parallaxX / parallaxY(经模板 ref 只读)', 'Ref<number>', '—', 'Web 扩展:当前视差平移读数(px,负值 = 向上/向左),用于调试与联动展示'],
]

const EVENT_HEADERS = ['事件', '参数', '触发时机']
const EVENT_ROWS: (string | number)[][] = [
  ['(无业务事件)', '—', 'ParallaxView 为纯容器,WinUI 未定义任何事件;滚动驱动的平移在内部完成;指针/滚轮等原生事件经 $attrs 透传到根元素'],
]

// 用法代码(最小用法,完整参数体验见上方场景)
const usageCode = [
  '<!-- 缺省 source:自动绑定最近可滚祖先(内容内视差) -->',
  '<WuiScrollView>',
  '  <WuiParallaxView :vertical-shift="120" :style="{ height: 200 }">',
  '    <img class="cover" src="banner.jpg" alt="" />',
  '  </WuiParallaxView>',
  '  <!-- 其余内容…… -->',
  '</WuiScrollView>',
  '',
  '<!-- 兄弟滚动源:显式传元素(经模板 ref 取滚动组件的 $el,完整见本页场景 1) -->',
  '<WuiParallaxView :source="scrollerEl" :vertical-shift="300" :style="{ position: \'absolute\', inset: 0 }">',
  '  <img class="hero" src="cliff.jpg" alt="" />',
  '</WuiParallaxView>',
].join('\n')
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="parallax-stage">
        <!-- 场景 1:背景视差(官方 Example1 复刻) -->
        <section class="stage-section">
          <h4 class="stage-title">{{ s1Label }}</h4>
          <div class="hero-stage">
            <!-- 背景视差层:锚定填满舞台(position 用 inline style 压过组件根的 position: relative);
                 滚动源显式绑定为覆盖其上的列表 -->
            <WuiParallaxView
              ref="heroParallaxRef"
              class="hero-parallax"
              :style="{ position: 'absolute', inset: '0' }"
              :source="heroSource"
              :vertical-shift="toNumber(heroVerticalShift, 300)"
              :max-vertical-shift-ratio="toNumber(heroMaxRatio, 1)"
              :is-vertical-shift-clamped="heroClamped === true"
              :vertical-source-offset-kind="castEnum(heroKind, OFFSET_KINDS, 'Relative')"
              :vertical-source-start-offset="toNumber(heroStartOffset, 0)"
              :vertical-source-end-offset="toNumber(heroEndOffset, 0)"
            >
              <!-- 官方 cliff.jpg 的 token 着色替身: preserveAspectRatio=slice ≙ Stretch=UniformToFill -->
              <svg class="hero-art" viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice" role="img" aria-label="山景示例图">
                <defs>
                  <linearGradient id="pv-hero-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" class="hero-sky-stop-top" />
                    <stop offset="1" class="hero-sky-stop-bottom" />
                  </linearGradient>
                </defs>
                <rect class="hero-sky" width="800" height="480" />
                <circle class="hero-sun" cx="610" cy="130" r="58" />
                <path class="hero-mountain-back" d="M0 330 L180 180 L330 320 L470 170 L640 330 L800 210 L800 480 L0 480 Z" />
                <path class="hero-mountain-front" d="M0 480 L0 360 L150 250 L320 400 L520 240 L700 390 L800 320 L800 480 Z" />
                <rect class="hero-ground" y="430" width="800" height="50" />
              </svg>
            </WuiParallaxView>
            <!-- 前景列表:半透明背景(官方 #80000000 的 token 近似),盖在视差图上;
                 position 用 inline style 以稳定压过组件内部样式 -->
            <WuiScrollView
              ref="heroScrollerRef"
              class="hero-list"
              :style="{ position: 'absolute', inset: '0' }"
              aria-label="视差演示列表"
            >
              <p class="hero-list-header">{{ s1ScrollHint }}</p>
              <div v-for="n in HERO_ROW_COUNT" :key="n" class="hero-row" :class="`hero-row--${n % 3}`">
                <span class="hero-row-index">{{ n }}</span>
                <span class="hero-row-text">列表项 {{ n }} / {{ HERO_ROW_COUNT }}</span>
              </div>
            </WuiScrollView>
          </div>
          <p class="stage-readout">
            {{ readoutLabel }}:
            <span class="readout-mono">parallaxY = {{ heroParallaxReadout === null ? '—' : `${heroParallaxReadout} px` }}</span>
          </p>
        </section>

        <!-- 场景 2:双向 shift + shift=0 对照(in-source:缺省 Source = 最近可滚祖先) -->
        <section class="stage-section">
          <h4 class="stage-title">{{ s2Label }}</h4>
          <WuiScrollView class="compare-scroller" aria-label="双向视差对照滚动区">
            <div class="compare-flow">
              <p class="compare-note">{{ s2PosNote }}</p>
              <div class="compare-card">
                <WuiParallaxView class="compare-parallax" :vertical-shift="compareMagValue">
                  <svg class="compare-art" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="正向视差演示图">
                    <rect class="compare-art-pos" width="400" height="200" />
                  </svg>
                </WuiParallaxView>
                <span class="compare-badge">VerticalShift = +{{ compareMagValue }} px</span>
              </div>

              <p class="compare-note">{{ s2NegNote }}</p>
              <div class="compare-card">
                <WuiParallaxView class="compare-parallax" :vertical-shift="-compareMagValue">
                  <svg class="compare-art" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="反向视差演示图">
                    <rect class="compare-art-neg" width="400" height="200" />
                  </svg>
                </WuiParallaxView>
                <span class="compare-badge">VerticalShift = -{{ compareMagValue }} px</span>
              </div>

              <p class="compare-note">{{ s2ZeroNote }}</p>
              <div class="compare-card">
                <WuiParallaxView class="compare-parallax" :vertical-shift="0">
                  <svg class="compare-art" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="无视差对照图">
                    <rect class="compare-art-zero" width="400" height="200" />
                  </svg>
                </WuiParallaxView>
                <span class="compare-badge">VerticalShift = 0(禁用)</span>
              </div>
            </div>
          </WuiScrollView>
          <div class="stage-inline-options">
            <DemoOptionRow :label="compareMagLabel" type="slider" v-model="compareMag" :min="0" :max="400" :step="20" />
          </div>
        </section>

        <!-- 场景 3:水平视差(HorizontalShift + 横向滚动) -->
        <section class="stage-section">
          <h4 class="stage-title">{{ s3Label }}</h4>
          <WuiScrollView class="hstage-scroller" content-orientation="Horizontal" aria-label="水平视差滚动区">
            <div class="hstage-flow">
              <div class="hstage-card">
                <WuiParallaxView class="hstage-parallax" :horizontal-shift="hShiftValue">
                  <svg class="hstage-art" viewBox="0 0 260 160" preserveAspectRatio="xMidYMid slice" role="img" aria-label="水平视差演示图">
                    <rect class="hstage-art-band" width="260" height="160" />
                    <path class="hstage-art-ridge" d="M0 120 L60 70 L120 115 L190 60 L260 110 L260 160 L0 160 Z" />
                  </svg>
                </WuiParallaxView>
                <span class="compare-badge">HorizontalShift = {{ hShiftValue > 0 ? '+' : '' }}{{ hShiftValue }} px</span>
              </div>
              <div v-for="n in H_TILE_COUNT" :key="n" class="hstage-tile" :class="`hstage-tile--${n % 3}`">{{ n }}</div>
            </div>
          </WuiScrollView>
          <div class="stage-inline-options">
            <DemoOptionRow :label="hShiftLabel" type="slider" v-model="hShift" :min="-200" :max="200" :step="10" />
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="VerticalShift(px)" type="slider" v-model="heroVerticalShift" :min="-400" :max="600" :step="20" />
        <DemoOptionRow label="MaxVerticalShiftRatio" type="slider" v-model="heroMaxRatio" :min="0" :max="1.5" :step="0.05" />
        <DemoOptionRow label="IsVerticalShiftClamped" type="toggle" v-model="heroClamped" />
        <DemoOptionRow label="VerticalSourceOffsetKind" type="select" v-model="heroKind" :options="OFFSET_KIND_CHOICES" />
        <DemoOptionRow label="VerticalSourceStartOffset(px)" type="slider" v-model="heroStartOffset" :min="-200" :max="200" :step="10" />
        <DemoOptionRow label="VerticalSourceEndOffset(px)" type="slider" v-model="heroEndOffset" :min="-400" :max="400" :step="10" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">属性与方法(对照 WinUI ParallaxView.idl 属性面)</h4>
      <DemoDocsTable :headers="DOCS_HEADERS" :rows="DOCS_ROWS" />
      <h4 class="docs-subtitle">事件</h4>
      <DemoDocsTable :headers="EVENT_HEADERS" :rows="EVENT_ROWS" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.parallax-stage {
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

.stage-readout {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.readout-mono {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

.stage-inline-options {
  max-width: 420px;
}

/* ===================================================================================
   场景 1:背景视差(官方 Example1:Grid 内 ParallaxView 在下、半透明 ListView 在上)
   =================================================================================== */
.hero-stage {
  position: relative;
  width: 100%;
  max-width: 640px;
  height: 440px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 背景视差层:锚定位置由 inline style 提供(position/inset),这里只留语义类名 */
.hero-parallax {
  z-index: 0;
}

/* 视差图:撑满包裹层(包裹层在 shift 轴上已扩到 100% + |shift|),slice 裁剪 ≙ UniformToFill */
.hero-art {
  display: block;
  width: 100%;
  height: 100%;
}

/* 山景着色:全部走 --wui-* token(官方为 cliff.jpg 照片素材,Web 用内联 SVG 等价呈现) */
.hero-sky {
  fill: url(#pv-hero-sky);
}

.hero-sky-stop-top {
  stop-color: color-mix(in srgb, var(--wui-system-accent-color) 42%, var(--wui-application-page-background-theme));
}

.hero-sky-stop-bottom {
  stop-color: var(--wui-system-control-background-chrome-medium-low);
}

.hero-sun {
  fill: color-mix(in srgb, var(--wui-system-accent-color) 78%, white);
}

.hero-mountain-back {
  fill: color-mix(in srgb, var(--wui-system-control-foreground-chrome-gray) 70%, var(--wui-system-accent-color));
}

.hero-mountain-front {
  fill: var(--wui-system-control-foreground-chrome-gray);
}

.hero-ground {
  fill: var(--wui-system-control-background-chrome-medium);
}

/* 前景列表:半透明底(官方 Background=#80000000 → token 半透明近似),文字可读;
   锚定位置由 inline style 提供(position/inset) */
.hero-list {
  z-index: 1;
  background: color-mix(in srgb, var(--wui-application-page-background-theme) 55%, transparent);
}

.hero-list-header {
  margin: 0;
  padding: 20px 16px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  text-align: center;
  color: var(--wui-application-foreground-theme);
}

.hero-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 16px;
}

.hero-row--1 {
  background: color-mix(in srgb, var(--wui-system-accent-color) 10%, transparent);
}

.hero-row--2 {
  background: transparent;
}

.hero-row--0 {
  background: color-mix(in srgb, var(--wui-application-foreground-theme) 6%, transparent);
}

.hero-row-index {
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
}

.hero-row-text {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* ===================================================================================
   场景 2:双向 shift 对照(卡片填满滚动内容宽度,徽标标注当前 shift)
   =================================================================================== */
.compare-scroller {
  width: 100%;
  max-width: 640px;
  height: 420px;
  margin: 0 auto;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.compare-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.compare-note {
  margin: 4px 0 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.compare-card {
  position: relative;
  height: 200px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  overflow: hidden;
}

/* 卡片高 200px 已定 → 组件根 height:100% 得到确定尺寸,包裹层扩展 calc(100% + |shift|) 生效 */
.compare-parallax {
  height: 100%;
}

.compare-art {
  display: block;
  width: 100%;
  height: 100%;
}

.compare-art-pos {
  fill: color-mix(in srgb, var(--wui-system-accent-color) 34%, var(--wui-system-control-background-chrome-medium-low));
}

.compare-art-neg {
  fill: color-mix(in srgb, var(--wui-system-control-foreground-chrome-gray) 55%, var(--wui-system-control-background-chrome-medium-low));
}

.compare-art-zero {
  fill: var(--wui-system-control-background-chrome-medium-low);
}

.compare-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 10px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: color-mix(in srgb, var(--wui-application-page-background-theme) 72%, transparent);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* ===================================================================================
   场景 3:水平视差(Horizontal 竖排内容 → 横向滚动)
   =================================================================================== */
.hstage-scroller {
  width: 100%;
  max-width: 640px;
  height: 200px;
  margin: 0 auto;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.hstage-flow {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 12px;
  width: max-content;
}

.hstage-card {
  position: relative;
  width: 260px;
  height: 160px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  overflow: hidden;
}

/* 宽高均确定 → 水平轴包裹层扩展 calc(100% + |horizontalShift|) 生效 */
.hstage-parallax {
  width: 100%;
  height: 100%;
}

.hstage-art {
  display: block;
  width: 100%;
  height: 100%;
}

.hstage-art-band {
  fill: color-mix(in srgb, var(--wui-system-accent-color) 24%, var(--wui-system-control-background-chrome-medium));
}

.hstage-art-ridge {
  fill: color-mix(in srgb, var(--wui-system-accent-color) 52%, var(--wui-system-control-background-chrome-medium));
}

.hstage-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 120px;
  height: 80px;
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.hstage-tile--1 {
  background: color-mix(in srgb, var(--wui-system-accent-color) 12%, var(--wui-system-control-background-chrome-medium-low));
}

.hstage-tile--2 {
  background: var(--wui-system-control-background-chrome-medium);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

@media (max-width: 720px) {
  .hero-stage,
  .compare-scroller,
  .hstage-scroller {
    max-width: none;
  }
}
</style>
