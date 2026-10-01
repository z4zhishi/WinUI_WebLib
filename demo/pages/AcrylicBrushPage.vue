<script setup lang="ts">
// AcrylicBrushPage —— 官方 Samples/Acrylic 对照(AcrylicPage.xaml):
// Example1 默认 in-app acrylic、Example3 自定义画刷(TintOpacity / TintColor / FallbackColor)、
// Example4 亮度(TintLuminosityOpacity)与浅深主题默认值对照、AlwaysUseFallback 降级演示。
// 主题默认值取自 CK/WinUI-Reference/controls/dev/Materials/Acrylic/AcrylicBrush_themeresources.xaml
// 的 AcrylicInAppFillColorDefaultBrush(Light / Default 两套)。
import { computed, ref } from 'vue'
import WuiAcrylicBrush, {
  useAcrylic,
  supportsAcrylic,
  ACRYLIC_BLUR_RADIUS_PX,
  ACRYLIC_SATURATION,
  ACRYLIC_DEFAULT_TRANSITION_MS,
  type AcrylicBrushOptions,
} from '@/components/AcrylicBrush.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'AcrylicBrush', en: 'AcrylicBrush' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '半透明材质,推荐用于面板背景:透出其后的内容并以 tint 着色、降低对比度。某些场景会降级为纯色(FallbackColor)。Web 侧以 backdrop-filter + mix-blend-mode 分层复刻 WinUI 的 Luminosity 配方。',
  en: 'A translucent material recommended for panel backgrounds: it shows the content behind it, tinted and contrast-reduced. It can fall back to a solid color (FallbackColor). Rendered with layered backdrop-filter + mix-blend-mode mirroring the WinUI luminosity recipe.',
}
const OFFICIAL_LABEL: BilingualText = { zh: '官方示例对照(彩色背景透出效果)', en: 'Official sample comparison (colorful backdrop showing through)' }
const THEME_DEFAULTS_LABEL: BilingualText = { zh: '浅 / 深主题默认值对照(in-app acrylic 资源)', en: 'Light / dark theme defaults (in-app acrylic resources)' }
const CUSTOM_LABEL: BilingualText = { zh: '四参数实时调节(对照 Example3 / Example4)', en: 'Four-parameter live tuning (Example3 / Example4)' }
const FALLBACK_LABEL: BilingualText = { zh: '降级演示(AlwaysUseFallback)', en: 'Fallback demo (AlwaysUseFallback)' }
const FALLBACK_NOTE: BilingualText = {
  zh: 'WinUI 在材质不可用(省电模式 / 远程会话等)时把 AcrylicBrush 交叉淡化为 FallbackColor 纯色;右侧面板等价 AlwaysUseFallback = true。浏览器不支持 backdrop-filter 时组件也会自动落到 FallbackColor。',
  en: 'When the material is unavailable (battery saver, remote session, etc.), WinUI cross-fades AcrylicBrush to the solid FallbackColor; the right panel equals AlwaysUseFallback = true. Without backdrop-filter support the component falls back automatically.',
}
const LAYER_READOUT_LABEL: BilingualText = { zh: '生成的分层(useAcrylic 实时输出)', en: 'Generated layers (live via useAcrylic)' }
const XAML_READOUT_LABEL: BilingualText = { zh: '对应的 WinUI XAML', en: 'Equivalent WinUI XAML' }
const PRESET_LABEL: BilingualText = { zh: '官方示例参数对照(点击应用到上方面板)', en: 'Official sample presets (click to apply above)' }
const PRESET_CUSTOM: BilingualText = { zh: '官方 CustomAcrylicInAppBrush(Black · 0.8 · Green)', en: 'Official CustomAcrylicInAppBrush (Black · 0.8 · Green)' }
const PRESET_LUMINOSITY: BilingualText = { zh: '官方 Luminosity(SkyBlue · 0.8 / 0.8)', en: 'Official Luminosity (SkyBlue · 0.8 / 0.8)' }
const PRESET_LIGHT: BilingualText = { zh: '浅色主题默认(#FCFCFC · 0 · 0.85)', en: 'Light theme default (#FCFCFC · 0 · 0.85)' }
const PRESET_DARK: BilingualText = { zh: '深色主题默认(#2C2C2C · 0.15 · 0.96)', en: 'Dark theme default (#2C2C2C · 0.15 · 0.96)' }
const TINT_SWATCHES_LABEL: BilingualText = { zh: 'TintColor 色板(官方示例同名颜色)', en: 'TintColor swatches (official sample colors)' }
const FALLBACK_SWATCHES_LABEL: BilingualText = { zh: 'FallbackColor 色板', en: 'FallbackColor swatches' }
const RECIPE_LABEL: BilingualText = { zh: '材质配方(WinUI 源码常量)', en: 'Material recipe (WinUI source constants)' }
const RECIPE_NOTE: BilingualText = {
  zh: `AcrylicBrush.cpp 效果图:背景 over FallbackColor → GaussianBlur(${ACRYLIC_BLUR_RADIUS_PX}px) → Luminosity blend → Color blend → noise 2%;饱和度 125% 来自 sc_saturation = ${ACRYLIC_SATURATION}(官方材质文档写法)。`,
  en: `AcrylicBrush.cpp effect graph: backdrop over FallbackColor → GaussianBlur(${ACRYLIC_BLUR_RADIUS_PX}px) → luminosity blend → color blend → noise 2%; saturation 125% from sc_saturation = ${ACRYLIC_SATURATION} (as documented for the acrylic material).`,
}
const SUPPORT_LABEL: BilingualText = { zh: '当前环境 backdrop-filter 支持', en: 'backdrop-filter support in this environment' }
const SUPPORT_YES: BilingualText = { zh: '支持(亚克力生效)', en: 'Supported (acrylic active)' }
const SUPPORT_NO: BilingualText = { zh: '不支持(自动降级为 FallbackColor)', en: 'Unsupported (auto fallback to FallbackColor)' }
const FALLBACK_ON: BilingualText = { zh: 'AlwaysUseFallback = true(纯色)', en: 'AlwaysUseFallback = true (solid)' }
const FALLBACK_OFF: BilingualText = { zh: 'AlwaysUseFallback = false(亚克力)', en: 'AlwaysUseFallback = false (acrylic)' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const officialLabel = useBilingual(i18n, OFFICIAL_LABEL)
const themeDefaultsLabel = useBilingual(i18n, THEME_DEFAULTS_LABEL)
const customLabel = useBilingual(i18n, CUSTOM_LABEL)
const fallbackLabel = useBilingual(i18n, FALLBACK_LABEL)
const fallbackNote = useBilingual(i18n, FALLBACK_NOTE)
const layerReadoutLabel = useBilingual(i18n, LAYER_READOUT_LABEL)
const xamlReadoutLabel = useBilingual(i18n, XAML_READOUT_LABEL)
const presetLabel = useBilingual(i18n, PRESET_LABEL)
const presetCustom = useBilingual(i18n, PRESET_CUSTOM)
const presetLuminosity = useBilingual(i18n, PRESET_LUMINOSITY)
const presetLight = useBilingual(i18n, PRESET_LIGHT)
const presetDark = useBilingual(i18n, PRESET_DARK)
const tintSwatchesLabel = useBilingual(i18n, TINT_SWATCHES_LABEL)
const fallbackSwatchesLabel = useBilingual(i18n, FALLBACK_SWATCHES_LABEL)
const recipeLabel = useBilingual(i18n, RECIPE_LABEL)
const recipeNote = useBilingual(i18n, RECIPE_NOTE)
const supportLabel = useBilingual(i18n, SUPPORT_LABEL)
const supportYes = useBilingual(i18n, SUPPORT_YES)
const supportNo = useBilingual(i18n, SUPPORT_NO)
const fallbackOn = useBilingual(i18n, FALLBACK_ON)
const fallbackOff = useBilingual(i18n, FALLBACK_OFF)

// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const tintOpacity = ref<string | number | boolean>(0.8)
const luminosityOpacity = ref<string | number | boolean>(0.8)
const useExplicitLuminosity = ref<string | number | boolean>(false)
const alwaysUseFallback = ref<string | number | boolean>(false)
const transitionDuration = ref<string | number | boolean>(ACRYLIC_DEFAULT_TRANSITION_MS)
const tintHex = ref('#000000')
const fallbackHex = ref('#008000')

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// —— 官方示例色板(XAML 命名色;XAML #AARRGGBB → Web #RRGGBBAA 已换算,均为不透明)——
const TINT_SWATCHES = [
  { name: 'Black', hex: '#000000' },
  { name: 'Red', hex: '#ff0000' },
  { name: 'Blue', hex: '#0000ff' },
  { name: 'SkyBlue', hex: '#87ceeb' },
  { name: 'White', hex: '#ffffff' },
]
const FALLBACK_SWATCHES = [
  { name: 'Green', hex: '#008000' },
  { name: 'Yellow', hex: '#ffff00' },
  { name: 'SkyBlue', hex: '#87ceeb' },
]

// —— 主题默认值(AcrylicInAppFillColorDefaultBrush,themeresources L44 / L96)——
const DARK_THEME_DEFAULT: AcrylicBrushOptions = {
  tintColor: '#2c2c2c',
  tintOpacity: 0.15,
  tintLuminosityOpacity: 0.96,
  fallbackColor: '#2c2c2c',
}
const LIGHT_THEME_DEFAULT: AcrylicBrushOptions = {
  tintColor: '#fcfcfc',
  tintOpacity: 0,
  tintLuminosityOpacity: 0.85,
  fallbackColor: '#f9f9f9',
}

// —— 四参数实时调(初值 = 官方 Example3 加载值:Opacity 0.8 · Tint Black · Fallback Green,亮度自动推导)——
const customOptions = computed<AcrylicBrushOptions>(() => ({
  tintColor: tintHex.value,
  tintOpacity: toNumber(tintOpacity.value, 0.8),
  tintLuminosityOpacity: useExplicitLuminosity.value === true ? toNumber(luminosityOpacity.value, 0.8) : null,
  fallbackColor: fallbackHex.value,
  alwaysUseFallback: alwaysUseFallback.value === true,
  tintTransitionDuration: toNumber(transitionDuration.value, ACRYLIC_DEFAULT_TRANSITION_MS),
}))

// useAcrylic 第二用途:读出分层颜色(与预览同一实现)。
const customLayers = useAcrylic(customOptions)

const browserSupportsAcrylic = supportsAcrylic()

// —— 官方参数预设(点击应用)——
interface Preset {
  label: string
  tint: string
  opacity: number
  fallback: string
  explicitLuminosity: boolean
  luminosity: number
}
const PRESETS: Preset[] = [
  { label: 'CustomAcrylicInAppBrush', tint: '#000000', opacity: 0.8, fallback: '#008000', explicitLuminosity: false, luminosity: 0.8 },
  { label: 'Luminosity', tint: '#87ceeb', opacity: 0.8, fallback: '#87ceeb', explicitLuminosity: true, luminosity: 0.8 },
  { label: 'Light default', tint: '#fcfcfc', opacity: 0, fallback: '#f9f9f9', explicitLuminosity: true, luminosity: 0.85 },
  { label: 'Dark default', tint: '#2c2c2c', opacity: 0.15, fallback: '#2c2c2c', explicitLuminosity: true, luminosity: 0.96 },
]

function applyPreset(preset: Preset): void {
  tintHex.value = preset.tint
  tintOpacity.value = preset.opacity
  fallbackHex.value = preset.fallback
  useExplicitLuminosity.value = preset.explicitLuminosity
  luminosityOpacity.value = preset.luminosity
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性', '类型', '默认值', '说明']
const docsRows: (string | number)[][] = [
  ['tintColor', 'string(任意 CSS 颜色)', `'rgba(255, 255, 255, 0.8)'`, '着色(WinUI TintColor,默认 #CCFFFFFF,XAML #AARRGGBB 换算为 Web #RRGGBBAA);可解析时参与 WinUI 混色数学,var() 等走 color-mix 兜底'],
  ['tintOpacity', 'number', '1', '着色不透明度(WinUI TintOpacity,0–1;未显式设置亮度不透明度时按源码亮度/饱和度抑制系数折减)'],
  ['tintLuminosityOpacity', 'number | null', 'null', '亮度层不透明度(WinUI TintLuminosityOpacity);null = 未设置,按源码公式((A×0.88)+0.15、HSV V 钳制 [0.125, 0.965])自动推导'],
  ['fallbackColor', 'string', "'transparent'", '降级纯色(WinUI FallbackColor,默认透明);backdrop-filter 不可用或 alwaysUseFallback 时整面显示'],
  ['alwaysUseFallback', 'boolean', 'false', '恒用降级(WinUI AlwaysUseFallback):跳过亚克力效果直接渲染纯色'],
  ['tintTransitionDuration', 'number(ms)', '500', '颜色变化过渡时长(WinUI TintTransitionDuration),落到图层 background-color 过渡'],
  ['opacity', 'number', '1', '画刷不透明度(WinUI Brush.Opacity,0–1)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['(无业务事件)', '—', 'AcrylicBrush 是画刷(Brush)而非 UIElement,无路由事件;原生 DOM 事件可经 $attrs 在根 div 上监听'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const luminosityCode = computed(() =>
  useExplicitLuminosity.value === true ? `:tint-luminosity-opacity="${toNumber(luminosityOpacity.value, 0.8)}"` : ':tint-luminosity-opacity="null"',
)
const usageCode = computed(
  () => `<WuiAcrylicBrush
  tintColor="${tintHex.value}" :tint-opacity="${toNumber(tintOpacity.value, 0.8)}"
  ${luminosityCode.value}
  fallback-color="${fallbackHex.value}"
  :always-use-fallback="${alwaysUseFallback.value === true}"
  style="width: 280px; height: 176px" />`,
)

const xamlCode = computed(() => {
  const luminosity =
    useExplicitLuminosity.value === true ? `\n                TintLuminosityOpacity="${toNumber(luminosityOpacity.value, 0.8)}"` : ''
  return `<media:AcrylicBrush
                TintColor="${tintHex.value.toUpperCase()}"
                TintOpacity="${toNumber(tintOpacity.value, 0.8)}"${luminosity}
                FallbackColor="${fallbackHex.value.toUpperCase()}" />`
})

// 分层读出(实时)。
const layerReadout = computed(
  () => `backdrop-filter: ${customLayers.value.backdropFilter};
/* 亮度层 mix-blend-mode: luminosity */
background-color: ${customLayers.value.luminosityColor};
/* 着色层 mix-blend-mode: color */
background-color: ${customLayers.value.tintColor};
/* 降级 fallbackColor */
background-color: ${customLayers.value.fallbackColor};`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Acrylic">
    <template #demo>
      <div class="acrylic-stage-area">
        <!-- 官方示例对照:Example1 / Example3 / Example4 同款彩色背景(Aqua / Magenta / Yellow) -->
        <section>
          <h3 class="section-title">{{ officialLabel }}</h3>
          <p class="note">{{ themeDefaultsLabel }} —— 同一彩色背景(Aqua / Magenta / Yellow)并排对照:</p>
          <div class="board-row">
            <figure class="board">
              <div class="acrylic-stage" role="img" :aria-label="officialLabel">
                <span class="stage-shape stage-shape--aqua" />
                <span class="stage-shape stage-shape--magenta" />
                <span class="stage-shape stage-shape--yellow" />
                <WuiAcrylicBrush class="stage-panel" v-bind="DARK_THEME_DEFAULT" />
              </div>
              <figcaption class="board-caption">AcrylicInAppFillColorDefaultBrush(Default / 深色值)</figcaption>
            </figure>
            <figure class="board">
              <div class="acrylic-stage" role="img" :aria-label="officialLabel">
                <span class="stage-shape stage-shape--aqua" />
                <span class="stage-shape stage-shape--magenta" />
                <span class="stage-shape stage-shape--yellow" />
                <WuiAcrylicBrush class="stage-panel" v-bind="LIGHT_THEME_DEFAULT" />
              </div>
              <figcaption class="board-caption">AcrylicInAppFillColorDefaultBrush(Light / 浅色值)</figcaption>
            </figure>
          </div>
        </section>

        <!-- 浅深对照说明 + 四参数实时调 -->
        <section>
          <h3 class="section-title">{{ customLabel }}</h3>
          <div class="board-row">
            <figure class="board">
              <div class="acrylic-stage" role="img" :aria-label="customLabel">
                <span class="stage-shape stage-shape--aqua" />
                <span class="stage-shape stage-shape--magenta" />
                <span class="stage-shape stage-shape--yellow" />
                <WuiAcrylicBrush class="stage-panel" v-bind="customOptions" />
              </div>
              <figcaption class="board-caption">
                TintOpacity {{ toNumber(tintOpacity, 0.8) }} · TintLuminosityOpacity
                {{ useExplicitLuminosity === true ? toNumber(luminosityOpacity, 0.8) : '自动' }} ·
                {{ alwaysUseFallback === true ? 'Fallback' : 'Acrylic' }}
              </figcaption>
            </figure>
            <div class="readout-stack">
              <h3 class="section-title section-title--sub">{{ layerReadoutLabel }}</h3>
              <DemoCode class="layer-readout" :code="layerReadout" language="css" />
              <h3 class="section-title section-title--sub">{{ xamlReadoutLabel }}</h3>
              <DemoCode class="layer-readout" :code="xamlCode" language="xml" />
            </div>
          </div>
        </section>

        <!-- 降级演示 -->
        <section>
          <h3 class="section-title">{{ fallbackLabel }}</h3>
          <div class="board-row">
            <figure class="board">
              <div class="acrylic-stage" role="img" :aria-label="fallbackOff">
                <span class="stage-shape stage-shape--aqua" />
                <span class="stage-shape stage-shape--magenta" />
                <span class="stage-shape stage-shape--yellow" />
                <WuiAcrylicBrush class="stage-panel" v-bind="customOptions" />
              </div>
              <figcaption class="board-caption">{{ fallbackOff }}</figcaption>
            </figure>
            <figure class="board">
              <div class="acrylic-stage" role="img" :aria-label="fallbackOn">
                <span class="stage-shape stage-shape--aqua" />
                <span class="stage-shape stage-shape--magenta" />
                <span class="stage-shape stage-shape--yellow" />
                <WuiAcrylicBrush class="stage-panel" v-bind="customOptions" always-use-fallback />
              </div>
              <figcaption class="board-caption">{{ fallbackOn }}</figcaption>
            </figure>
          </div>
          <p class="note">{{ fallbackNote }}</p>
          <p class="note">
            {{ supportLabel }}:<strong>{{ browserSupportsAcrylic ? supportYes : supportNo }}</strong>
          </p>
        </section>
      </div>
    </template>

    <template #options>
      <div class="options-groups">
        <DemoOptions :columns="2">
          <DemoOptionRow label="TintOpacity" type="slider" v-model="tintOpacity" :min="0" :max="1" :step="0.001" />
          <DemoOptionRow label="AlwaysUseFallback" type="toggle" v-model="alwaysUseFallback" />
          <DemoOptionRow
            v-if="useExplicitLuminosity === true"
            label="TintLuminosityOpacity"
            type="slider"
            v-model="luminosityOpacity"
            :min="0"
            :max="1"
            :step="0.001"
          />
          <DemoOptionRow label="TintLuminosityOpacity(显式设置)" type="toggle" v-model="useExplicitLuminosity" />
          <DemoOptionRow label="TintTransitionDuration(ms)" type="slider" v-model="transitionDuration" :min="0" :max="1000" :step="50" />
        </DemoOptions>

        <!-- 颜色选择:官方同名色板 + 原生取色器(自绘,DemoOptionRow 无此形态) -->
        <div class="swatch-editor">
          <h3 class="swatch-title">{{ tintSwatchesLabel }}</h3>
          <div class="swatch-row">
            <button
              v-for="swatch in TINT_SWATCHES"
              :key="swatch.name"
              type="button"
              class="swatch"
              :class="{ 'swatch--active': tintHex === swatch.hex }"
              :style="{ backgroundColor: swatch.hex }"
              :aria-label="`TintColor ${swatch.name}`"
              @click="tintHex = swatch.hex"
            />
            <input v-model="tintHex" type="color" class="swatch-input" aria-label="TintColor 自定义" />
            <code class="swatch-value">{{ tintHex }}</code>
          </div>
          <h3 class="swatch-title">{{ fallbackSwatchesLabel }}</h3>
          <div class="swatch-row">
            <button
              v-for="swatch in FALLBACK_SWATCHES"
              :key="swatch.name"
              type="button"
              class="swatch"
              :class="{ 'swatch--active': fallbackHex === swatch.hex }"
              :style="{ backgroundColor: swatch.hex }"
              :aria-label="`FallbackColor ${swatch.name}`"
              @click="fallbackHex = swatch.hex"
            />
            <input v-model="fallbackHex" type="color" class="swatch-input" aria-label="FallbackColor 自定义" />
            <code class="swatch-value">{{ fallbackHex }}</code>
          </div>
        </div>

        <!-- 官方参数预设 -->
        <div class="preset-editor">
          <h3 class="swatch-title">{{ presetLabel }}</h3>
          <div class="preset-row">
            <button type="button" class="preset" @click="applyPreset(PRESETS[0])">{{ presetCustom }}</button>
            <button type="button" class="preset" @click="applyPreset(PRESETS[1])">{{ presetLuminosity }}</button>
            <button type="button" class="preset" @click="applyPreset(PRESETS[2])">{{ presetLight }}</button>
            <button type="button" class="preset" @click="applyPreset(PRESETS[3])">{{ presetDark }}</button>
          </div>
        </div>

        <p class="note">{{ recipeLabel }}:{{ recipeNote }}</p>
      </div>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">属性</h3>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.acrylic-stage-area {
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

.board-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
}

.board {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.board-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  color: var(--wui-application-secondary-foreground-theme);
}

/* 官方示例同款舞台:Aqua 矩形(100×200 左上)+ Magenta 椭圆(152 居中)+ Yellow 矩形(80×100 右下),
   为示例内容色(对照 AcrylicPage.xaml 的 Fill 值),非控件 chrome。 */
.acrylic-stage {
  position: relative;
  width: 320px;
  height: 200px;
  overflow: hidden;
  border: 1px solid var(--wui-system-control-background-base-low);
  background-color: var(--wui-application-background-theme);
}

.stage-shape {
  position: absolute;
  display: block;
}

.stage-shape--aqua {
  top: 0;
  left: 0;
  width: 100px;
  height: 200px;
  background-color: #00ffff;
}

.stage-shape--magenta {
  top: 24px;
  left: 84px;
  width: 152px;
  height: 152px;
  border-radius: 50%;
  background-color: #ff00ff;
}

.stage-shape--yellow {
  right: 0;
  bottom: 0;
  width: 80px;
  height: 100px;
  background-color: #ffff00;
}

/* 画刷面板:Margin=12 → inset 12px,盖在图形上方透出模糊背景。 */
.stage-panel {
  position: absolute;
  inset: 12px;
  width: auto;
  height: auto;
}

.readout-stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  min-width: 280px;
  max-width: 420px;
}

.layer-readout {
  max-width: 420px;
}

.note {
  max-width: 640px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 参数面板区 —— */
.options-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.swatch-editor,
.preset-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.swatch-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.swatch-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swatch {
  width: 32px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: 4px;
  cursor: pointer;
}

.swatch--active {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.swatch-input {
  width: 36px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: 4px;
  background: none;
  cursor: pointer;
}

.swatch-value {
  min-width: 72px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset {
  padding: 4px 10px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: inherit;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 4px;
  cursor: pointer;
}

.preset:hover {
  background: var(--wui-button-pointer-over-background-theme);
}

.preset:active {
  background: var(--wui-button-pressed-background-theme);
}

.preset:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

/* —— 下半区文档 —— */
.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
