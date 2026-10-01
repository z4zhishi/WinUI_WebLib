<script setup lang="ts">
// RadialGradientBrushPage —— 官方 Samples/RadialGradientBrush 对照:
// MappingMode / Center / RadiusX / RadiusY / GradientOrigin / SpreadMethod 全参数联动,
// 停止点增删改(色板 + offset),实时预览 + 生成的 CSS 串读出(useRadialGradient 第二用途)。
import { computed, ref, useId, watch } from 'vue'
import WuiRadialGradientBrush, {
  useRadialGradient,
  type WuiBrushMappingMode,
  type WuiBrushSpreadMethod,
  type WuiGradientStop,
} from '@/components/RadialGradientBrush.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'RadialGradientBrush', en: 'RadialGradientBrush' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '用径向渐变绘制区域:中心点定义渐变的起点,半径定义渐变的终点。Web 侧渲染为 CSS radial-gradient 填充的 div,也可通过 useRadialGradient 直接取 CSS 串当背景用。',
  en: 'Paints an area with a radial gradient. A center point defines the beginning of the gradient, and a radius defines the end point. Rendered as a div filled with a CSS radial-gradient; useRadialGradient exports the CSS string for reuse.',
}
const OFFICIAL_LABEL: BilingualText = {
  zh: '官方示例对照(200 × 200 矩形填充)',
  en: 'Official sample comparison (200 × 200 rectangle fill)',
}
const CSS_LABEL: BilingualText = { zh: '生成的 CSS(useRadialGradient 实时输出)', en: 'Generated CSS (live via useRadialGradient)' }
const ORIGIN_LABEL: BilingualText = {
  zh: 'GradientOrigin 参考(SVG 焦点 fx/fy)',
  en: 'GradientOrigin reference (SVG focal point fx/fy)',
}
const ORIGIN_NOTE: BilingualText = {
  zh: '注:CSS radial-gradient 没有焦点(focus)语法,GradientOrigin 不影响左侧 CSS 渲染;右图用 SVG fx/fy 复现 WinUI 的焦点语义,仅作对照。',
  en: 'Note: CSS radial-gradient has no focal-point syntax, so GradientOrigin does not affect the CSS render on the left; the SVG fx/fy preview on the right visualizes the WinUI focal semantics.',
}
const PRESETS_LABEL: BilingualText = { zh: '当作背景使用的配置一览', en: 'Preset configurations used as backgrounds' }
const PRESET_OFFICIAL: BilingualText = { zh: '官方配色(Yellow → Blue)', en: 'Official colors (Yellow → Blue)' }
const PRESET_SPOTLIGHT: BilingualText = { zh: '聚光卡片(accent → 透明,内容叠加)', en: 'Spotlight card (accent → transparent, content overlay)' }
const PRESET_RINGS: BilingualText = { zh: '同心靶环(SpreadMethod = Repeat)', en: 'Concentric rings (SpreadMethod = Repeat)' }
const PRESET_MAPPING: BilingualText = { zh: '相对 vs 绝对映射(同画刷,两种尺寸)', en: 'Relative vs Absolute mapping (same brush, two sizes)' }
const PRESET_RELATIVE: BilingualText = { zh: '相对(半径随元素缩放)', en: 'Relative (radius scales with element)' }
const PRESET_ABSOLUTE: BilingualText = { zh: '绝对(渐变按 px 固定,小元素只露出左上一角)', en: 'Absolute (gradient fixed in px, small element shows the top-left corner)' }
const STOPS_LABEL: BilingualText = { zh: 'GradientStops(色板 + 偏移,可增删)', en: 'GradientStops (color + offset, add / remove)' }
const ADD_STOP: BilingualText = { zh: '添加停止点', en: 'Add stop' }
const REMOVE_STOP: BilingualText = { zh: '删除停止点', en: 'Remove stop' }
const COLOR_LABEL: BilingualText = { zh: '停止点颜色', en: 'Stop color' }
const OFFSET_LABEL: BilingualText = { zh: '停止点偏移', en: 'Stop offset' }
const PREVIEW_LABEL: BilingualText = { zh: '渐变预览', en: 'Gradient preview' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const officialLabel = useBilingual(i18n, OFFICIAL_LABEL)
const cssLabel = useBilingual(i18n, CSS_LABEL)
const originLabel = useBilingual(i18n, ORIGIN_LABEL)
const originNote = useBilingual(i18n, ORIGIN_NOTE)
const presetsLabel = useBilingual(i18n, PRESETS_LABEL)
const presetOfficial = useBilingual(i18n, PRESET_OFFICIAL)
const presetSpotlight = useBilingual(i18n, PRESET_SPOTLIGHT)
const presetRings = useBilingual(i18n, PRESET_RINGS)
const presetMapping = useBilingual(i18n, PRESET_MAPPING)
const presetRelative = useBilingual(i18n, PRESET_RELATIVE)
const presetAbsolute = useBilingual(i18n, PRESET_ABSOLUTE)
const stopsLabel = useBilingual(i18n, STOPS_LABEL)
const addStopLabel = useBilingual(i18n, ADD_STOP)
const removeStopLabel = useBilingual(i18n, REMOVE_STOP)
const colorLabel = useBilingual(i18n, COLOR_LABEL)
const offsetLabel = useBilingual(i18n, OFFSET_LABEL)
const previewLabel = useBilingual(i18n, PREVIEW_LABEL)

const ACCENT = 'var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))'

// —— 官方示例参数(初始值 = RadialGradientBrushPage.xaml:Center 0.25,0.25 · Origin 0.5,0.25 · Radius 0.5)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const MAPPING_MODE_CHOICES = [
  { label: 'RelativeToBoundingBox(相对包围盒,默认)', value: 'RelativeToBoundingBox' },
  { label: 'Absolute(绝对 px)', value: 'Absolute' },
]
const SPREAD_METHOD_CHOICES = [
  { label: 'Pad(默认)', value: 'Pad' },
  { label: 'Reflect(镜像重复)', value: 'Reflect' },
  { label: 'Repeat(原向重复)', value: 'Repeat' },
]

const mappingMode = ref<string | number | boolean>('RelativeToBoundingBox')
const spreadMethod = ref<string | number | boolean>('Pad')
const centerX = ref<string | number | boolean>(0.25)
const centerY = ref<string | number | boolean>(0.25)
const radiusX = ref<string | number | boolean>(0.5)
const radiusY = ref<string | number | boolean>(0.5)
const originX = ref<string | number | boolean>(0.5)
const originY = ref<string | number | boolean>(0.25)

// —— 停止点(官方示例:Yellow @0 → Blue @1;可增删改)——
const stops = ref<WuiGradientStop[]>([
  { color: '#ffff00', offset: 0 },
  { color: '#0000ff', offset: 1 },
])
const NEW_STOP_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#3b82f6']

function addStop(): void {
  stops.value.push({ color: NEW_STOP_COLORS[stops.value.length % NEW_STOP_COLORS.length], offset: 1 })
}

function removeStop(index: number): void {
  stops.value.splice(index, 1)
}

// —— 映射模式切换:滑块量程/步长随模式变化,取值按官方 InitializeSliders 重置到中心 ——
const STAGE_SIZE = 200
const sliderMax = computed(() => (mappingMode.value === 'Absolute' ? STAGE_SIZE : 1))
const sliderStep = computed(() => (mappingMode.value === 'Absolute' ? STAGE_SIZE / 50 : 0.02))

watch(mappingMode, (mode) => {
  const mid = mode === 'Absolute' ? STAGE_SIZE / 2 : 0.5
  centerX.value = mid
  centerY.value = mid
  radiusX.value = mid
  radiusY.value = mid
  originX.value = mid
  originY.value = mid
})

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const mappingModeValue = computed(() => String(mappingMode.value) as WuiBrushMappingMode)
const spreadMethodValue = computed(() => String(spreadMethod.value) as WuiBrushSpreadMethod)
const centerXValue = computed(() => toNumber(centerX.value, 0.25))
const centerYValue = computed(() => toNumber(centerY.value, 0.25))
const radiusXValue = computed(() => toNumber(radiusX.value, 0.5))
const radiusYValue = computed(() => toNumber(radiusY.value, 0.5))
const originXValue = computed(() => toNumber(originX.value, 0.5))
const originYValue = computed(() => toNumber(originY.value, 0.25))

// —— useRadialGradient 第二用途:直接取 CSS 串(演示区读出,与预览同一实现)——
const cssGradient = useRadialGradient(() => ({
  center: { x: centerXValue.value, y: centerYValue.value },
  gradientOrigin: { x: originXValue.value, y: originYValue.value },
  radiusX: radiusXValue.value,
  radiusY: radiusYValue.value,
  mappingMode: mappingModeValue.value,
  spreadMethod: spreadMethodValue.value,
  gradientStops: stops.value,
}))

// —— SVG 焦点对照预览:radialGradient r=1 + gradientTransform 把单位圆映射为 (center, radiusX/Y) 椭圆,
//     焦点换算到渐变坐标系 fx/fy((焦点 px − 中心 px) / 半径)。半径为 0 时退化为不渲染。——
const previewGradientId = `wui-rgb-origin-preview-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

interface OriginPreview {
  transform: string
  fx: number
  fy: number
  stops: Array<{ color: string; offset: number }>
}

const originPreview = computed<OriginPreview | null>(() => {
  if (stops.value.length === 0) return null
  const absolute = mappingModeValue.value === 'Absolute'
  const cx = (absolute ? centerXValue.value : centerXValue.value * STAGE_SIZE)
  const cy = (absolute ? centerYValue.value : centerYValue.value * STAGE_SIZE)
  const rx = Math.max(absolute ? radiusXValue.value : radiusXValue.value * STAGE_SIZE, 0)
  const ry = Math.max(absolute ? radiusYValue.value : radiusYValue.value * STAGE_SIZE, 0)
  if (rx === 0 || ry === 0) return null
  const fxPx = (absolute ? originXValue.value : originXValue.value * STAGE_SIZE)
  const fyPy = (absolute ? originYValue.value : originYValue.value * STAGE_SIZE)
  const offsets = stops.value.map((stop, index) =>
    stop.offset ?? (stops.value.length === 1 ? 0 : index / (stops.value.length - 1)),
  )
  return {
    transform: `translate(${cx} ${cy}) scale(${rx} ${ry})`,
    fx: (fxPx - cx) / rx,
    fy: (fyPy - cy) / ry,
    stops: stops.value.map((stop, index) => ({
      color: stop.color,
      offset: Math.min(1, Math.max(0, offsets[index])),
    })),
  }
})

const svgSpreadMethod = computed(() => spreadMethodValue.value.toLowerCase() as 'pad' | 'reflect' | 'repeat')

// —— 预设配置(当作背景用的静止示例)——
const SPOTLIGHT_STOPS: WuiGradientStop[] = [
  { color: ACCENT, offset: 0 },
  { color: 'transparent', offset: 1 },
]
const RING_STOPS: WuiGradientStop[] = [
  { color: ACCENT, offset: 0 },
  { color: 'transparent', offset: 0.12 },
  { color: ACCENT, offset: 0.25 },
]
const MAPPING_STOPS: WuiGradientStop[] = [
  { color: '#0ea5e9', offset: 0 },
  { color: '#8b5cf6', offset: 1 },
]

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性', '类型', '默认值', '说明']
const docsRows: (string | number)[][] = [
  ['center', 'WuiPoint { x, y }', '{ x: 0.5, y: 0.5 }', '渐变椭圆中心(WinUI Center);相对模式为包围盒比例,绝对模式为 px(滑块实时调节)'],
  ['gradientOrigin', 'WuiPoint { x, y }', '{ x: 0.5, y: 0.5 }', '渐变焦点(WinUI GradientOrigin);CSS 渐变无焦点语法,保留 API 对齐,渲染见右侧 SVG fx/fy 参考'],
  ['radiusX / radiusY', 'number', '0.5', '椭圆水平 / 垂直半径(WinUI RadiusX/RadiusY);口径随 mappingMode,负值按 0 处理'],
  ['mappingMode', "'RelativeToBoundingBox' | 'Absolute'", "'RelativeToBoundingBox'", '坐标映射模式(切换时滑块量程与取值按官方示例重置)'],
  ['spreadMethod', "'Pad' | 'Reflect' | 'Repeat'", "'Pad'", '渐变越界扩展:Pad → radial-gradient;Repeat / Reflect → repeating-radial-gradient(补 0/1 端点 / 镜像停止点)'],
  ['gradientStops', 'WuiGradientStop[] { color, offset? }', '[]', '停止点集合;offset ∈ [0,1] 可省略(按索引均匀分布);空数组 → 不绘制(none)'],
  ['opacity', 'number', '1', '画刷不透明度(WinUI Brush.Opacity,0–1)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['(无业务事件)', '—', 'RadialGradientBrush 是画刷(Brush)而非 UIElement,无路由事件;原生 DOM 事件可经 $attrs 在根 div 上监听'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const stopLiterals = computed(() =>
  stops.value
    .map((stop) => `    { color: '${stop.color}', offset: ${Math.round((stop.offset ?? 0) * 100) / 100} }`)
    .join(',\n'),
)

const usageCode = computed(
  () => `<WuiRadialGradientBrush
  :center="{ x: ${centerXValue.value}, y: ${centerYValue.value} }"
  :gradient-origin="{ x: ${originXValue.value}, y: ${originYValue.value} }"
  :radius-x="${radiusXValue.value}" :radius-y="${radiusYValue.value}"
  mapping-mode="${mappingModeValue.value}"
  spread-method="${spreadMethodValue.value}"
  :gradient-stops="[
${stopLiterals.value}
  ]" />`,
)

const composableCode = computed(
  () => `// 用途二:不渲染组件,只要 CSS 串(其他控件可拿来当 background)
import { useRadialGradient } from '@/components/RadialGradientBrush.vue'

const css = useRadialGradient(() => ({
  center: { x: ${centerXValue.value}, y: ${centerYValue.value} },
  radiusX: ${radiusXValue.value}, radiusY: ${radiusYValue.value},
  mappingMode: '${mappingModeValue.value}',
  spreadMethod: '${spreadMethodValue.value}',
  gradientStops: stops, // [{ color, offset? }]
}))
// css.value → "${cssGradient.value}"`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="RadialGradientBrush">
    <template #demo>
      <div class="brush-stage">
        <!-- 官方示例对照:全参数联动 -->
        <section>
          <h3 class="section-title">{{ officialLabel }}</h3>
          <div class="compare-row">
            <div class="demo-board">
              <WuiRadialGradientBrush
                class="live-brush"
                role="img"
                :aria-label="previewLabel"
                :center="{ x: centerXValue, y: centerYValue }"
                :gradient-origin="{ x: originXValue, y: originYValue }"
                :radius-x="radiusXValue"
                :radius-y="radiusYValue"
                :mapping-mode="mappingModeValue"
                :spread-method="spreadMethodValue"
                :gradient-stops="stops"
              />
              <p class="readout">
                Center ({{ centerXValue }}, {{ centerYValue }}) · Origin ({{ originXValue }}, {{ originYValue }}) ·
                Radius ({{ radiusXValue }}, {{ radiusYValue }})
              </p>
              <h3 class="section-title section-title--sub">{{ cssLabel }}</h3>
              <DemoCode class="css-readout" :code="cssGradient" language="css" />
            </div>
            <figure class="demo-board origin-board">
              <svg
                class="origin-preview"
                width="200"
                height="200"
                viewBox="0 0 200 200"
                role="img"
                :aria-label="originLabel"
              >
                <defs v-if="originPreview">
                  <radialGradient
                    :id="previewGradientId"
                    gradientUnits="userSpaceOnUse"
                    cx="0"
                    cy="0"
                    r="1"
                    :gradient-transform="originPreview.transform"
                    :fx="originPreview.fx"
                    :fy="originPreview.fy"
                    :spread-method="svgSpreadMethod"
                  >
                    <stop
                      v-for="(stop, index) in originPreview.stops"
                      :key="index"
                      :offset="stop.offset"
                      :stop-color="stop.color"
                    />
                  </radialGradient>
                </defs>
                <rect
                  v-if="originPreview"
                  width="200"
                  height="200"
                  :fill="`url(#${previewGradientId})`"
                />
              </svg>
              <figcaption class="family-caption">{{ originLabel }}</figcaption>
              <p class="origin-note">{{ originNote }}</p>
            </figure>
          </div>
        </section>

        <!-- 预设配置:当作背景使用 -->
        <section>
          <h3 class="section-title">{{ presetsLabel }}</h3>
          <div class="preset-row">
            <figure class="preset-item">
              <WuiRadialGradientBrush
                class="preset-brush"
                :center="{ x: 0.25, y: 0.25 }"
                :gradient-origin="{ x: 0.5, y: 0.25 }"
                :gradient-stops="[{ color: '#ffff00', offset: 0 }, { color: '#0000ff', offset: 1 }]"
              />
              <figcaption class="family-caption">{{ presetOfficial }}</figcaption>
            </figure>
            <figure class="preset-item">
              <div class="spotlight-card">
                <WuiRadialGradientBrush
                  class="spotlight-bg"
                  :center="{ x: 0.5, y: 0.3 }"
                  :radius-x="0.85"
                  :radius-y="0.6"
                  :gradient-stops="SPOTLIGHT_STOPS"
                />
                <p class="spotlight-text">RadialGradientBrush</p>
              </div>
              <figcaption class="family-caption">{{ presetSpotlight }}</figcaption>
            </figure>
            <figure class="preset-item">
              <WuiRadialGradientBrush class="preset-brush" :gradient-stops="RING_STOPS" spread-method="Repeat" />
              <figcaption class="family-caption">{{ presetRings }}</figcaption>
            </figure>
            <figure class="preset-item preset-item--wide">
              <div class="mapping-grid">
                <figure class="mapping-cell">
                  <WuiRadialGradientBrush
                    class="mapping-brush mapping-brush--large"
                    mapping-mode="RelativeToBoundingBox"
                    :center="{ x: 0.5, y: 0.5 }"
                    :gradient-stops="MAPPING_STOPS"
                  />
                  <figcaption class="family-caption">{{ presetRelative }}</figcaption>
                </figure>
                <figure class="mapping-cell">
                  <WuiRadialGradientBrush
                    class="mapping-brush mapping-brush--small"
                    mapping-mode="RelativeToBoundingBox"
                    :center="{ x: 0.5, y: 0.5 }"
                    :gradient-stops="MAPPING_STOPS"
                  />
                  <figcaption class="family-caption">{{ presetRelative }}</figcaption>
                </figure>
                <figure class="mapping-cell">
                  <WuiRadialGradientBrush
                    class="mapping-brush mapping-brush--large"
                    mapping-mode="Absolute"
                    :center="{ x: 48, y: 48 }"
                    :radius-x="44"
                    :radius-y="44"
                    :gradient-stops="MAPPING_STOPS"
                  />
                  <figcaption class="family-caption">{{ presetAbsolute }}</figcaption>
                </figure>
                <figure class="mapping-cell">
                  <WuiRadialGradientBrush
                    class="mapping-brush mapping-brush--small"
                    mapping-mode="Absolute"
                    :center="{ x: 48, y: 48 }"
                    :radius-x="44"
                    :radius-y="44"
                    :gradient-stops="MAPPING_STOPS"
                  />
                  <figcaption class="family-caption">{{ presetAbsolute }}</figcaption>
                </figure>
              </div>
              <figcaption class="family-caption">{{ presetMapping }}</figcaption>
            </figure>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <div class="options-groups">
        <DemoOptions :columns="2">
          <DemoOptionRow label="MappingMode" type="select" v-model="mappingMode" :options="MAPPING_MODE_CHOICES" />
          <DemoOptionRow label="SpreadMethod" type="select" v-model="spreadMethod" :options="SPREAD_METHOD_CHOICES" />
          <DemoOptionRow label="Center X" type="slider" v-model="centerX" :min="0" :max="sliderMax" :step="sliderStep" />
          <DemoOptionRow label="Center Y" type="slider" v-model="centerY" :min="0" :max="sliderMax" :step="sliderStep" />
          <DemoOptionRow label="RadiusX" type="slider" v-model="radiusX" :min="0" :max="sliderMax" :step="sliderStep" />
          <DemoOptionRow label="RadiusY" type="slider" v-model="radiusY" :min="0" :max="sliderMax" :step="sliderStep" />
          <DemoOptionRow label="GradientOrigin X" type="slider" v-model="originX" :min="0" :max="sliderMax" :step="sliderStep" />
          <DemoOptionRow label="GradientOrigin Y" type="slider" v-model="originY" :min="0" :max="sliderMax" :step="sliderStep" />
        </DemoOptions>

        <!-- GradientStops 编辑器:色板 + 偏移滑块 + 增删(自绘,DemoOptionRow 无此形态) -->
        <div class="stops-editor">
          <h3 class="stops-title">{{ stopsLabel }}</h3>
          <div v-for="(stop, index) in stops" :key="index" class="stop-row">
            <span class="stop-index">#{{ index + 1 }}</span>
            <input v-model="stop.color" type="color" class="stop-color" :aria-label="`${colorLabel} #${index + 1}`" />
            <input
              v-model.number="stop.offset"
              type="range"
              class="stop-offset"
              min="0"
              max="1"
              step="0.05"
              :aria-label="`${offsetLabel} #${index + 1}`"
            />
            <code class="stop-value">{{ (stop.offset ?? 0).toFixed(2) }}</code>
            <button type="button" class="stop-remove" :aria-label="`${removeStopLabel} #${index + 1}`" @click="removeStop(index)">
              ×
            </button>
          </div>
          <button type="button" class="stop-add" @click="addStop">+ {{ addStopLabel }}</button>
        </div>
      </div>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">属性</h3>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
      <h3 class="docs-subtitle docs-subtitle--gap">组合式函数(用途二:取 CSS 串)</h3>
      <DemoCode :code="composableCode" language="typescript" />
    </template>
  </DemoPage>
</template>

<style scoped>
.brush-stage {
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 100%;
}

.section-title {
  margin: 0 0 12px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.section-title--sub {
  margin-top: 16px;
}

/* —— 官方示例对照 —— */
.compare-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
}

.demo-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 24px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.live-brush {
  border: 1px solid var(--wui-system-control-background-base-low);
}

.origin-preview {
  border: 1px dashed var(--wui-system-control-foreground-chrome-gray);
}

.origin-note {
  max-width: 248px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.css-readout {
  max-width: 360px;
}

.readout,
.family-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 预设配置 —— */
.preset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
}

.preset-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.preset-item--wide {
  flex-basis: 100%;
}

.preset-brush {
  border: 1px solid var(--wui-system-control-background-base-low);
}

/* 聚光卡片:画刷作背景层,内容叠加其上(组件经 $attrs 接受定位类) */
.spotlight-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 120px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--wui-system-control-background-base-low);
  background-color: var(--wui-application-background-theme);
}

.spotlight-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.spotlight-text {
  position: relative;
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* 相对 vs 绝对映射:同画刷两种尺寸的 2×2 对照 */
.mapping-grid {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 12px 32px;
  justify-content: center;
}

.mapping-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.mapping-brush {
  border: 1px solid var(--wui-system-control-background-base-low);
}

.mapping-brush--large {
  width: 96px;
  height: 96px;
}

.mapping-brush--small {
  width: 48px;
  height: 48px;
}

/* —— 停止点编辑器 —— */
.options-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stops-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.stops-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.stop-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stop-index {
  min-width: 24px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.stop-color {
  width: 36px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: 4px;
  background: none;
  cursor: pointer;
}

.stop-offset {
  flex: 1;
  accent-color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}

.stop-value {
  min-width: 40px;
  text-align: right;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.stop-remove,
.stop-add {
  padding: 4px 10px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: inherit;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 4px;
  cursor: pointer;
}

.stop-remove:hover,
.stop-add:hover {
  background: var(--wui-button-pointer-over-background-theme);
}

.stop-remove:active,
.stop-add:active {
  background: var(--wui-button-pressed-background-theme);
}

.stop-remove:focus-visible,
.stop-add:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.stop-add {
  align-self: flex-start;
}

/* —— 下半区文档 —— */
.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.docs-subtitle--gap {
  margin-top: 24px;
}
</style>
