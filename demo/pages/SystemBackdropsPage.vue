<script setup lang="ts">
// SystemBackdropsPage —— 官方 Samples/SystemBackdrops 对照(SystemBackdropsPage.xaml):
// 例 1:四种系统背板(Mica / Mica Alt / Desktop Acrylic Base / Thin)的观感说明 → 本页以
//   「三材质观感对照(浅 / 深两行)」呈现(桌面壁纸不可得,Mica 系用静态壁纸替身);
// 例 2/3:MicaController / DesktopAcrylicController 的可定制面(TintColor / TintOpacity /
//   LuminosityOpacity / FallbackColor / Kind)→ 本页「交互预览」实时调节 Kind / 明暗 /
//   IsInputActive / TintOpacity / TintColor,并按官方分层指引叠加内容层(LayerFillColorDefault)。
// 明暗默认值来源:Common_themeresources_any.xaml 的 SolidBackgroundFillColorBase/BaseAlt、
// AcrylicBrush_themeresources.xaml 的 in-app 亚克力默认值(来源细节见 wiki/controls/SystemBackdrops.md)。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import WuiSystemBackdrop, {
  ACRYLIC_DEFAULTS,
  getSystemBackdropDefaults,
  MICA_ALT_DEFAULTS,
  MICA_DEFAULTS,
  type WuiSystemBackdropKind,
  type WuiSystemBackdropTheme,
} from '@/components/SystemBackdrop.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'SystemBackdrops(Mica/Acrylic)', en: 'SystemBackdrops (Mica/Acrylic)' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '系统背景材质:把材质应用到窗口背景。Mica 不透明、对桌面壁纸只取样一次;Desktop Acrylic 半透明、实时模糊窗口背后的内容。Web 无窗口系统材质,此处为应用级模拟:Mica 用静态壁纸替身 + tint 分层,Acrylic 用 backdrop-filter 实时取样,与真实系统材质的差异见 wiki 声明。',
  en: 'System backdrops apply a material to the window background: Mica is opaque and samples the wallpaper once; Desktop Acrylic is semi-transparent and blurs what is behind the window in real time. The web has no window-level system material, so this is an app-level simulation: Mica layers a static wallpaper stand-in, Acrylic samples via backdrop-filter. See the wiki for differences from real system materials.',
}
const COMPARE_LABEL: BilingualText = { zh: '三材质观感对照(同一「桌面」舞台)', en: 'Three materials side by side (same "desktop" stage)' }
const COMPARE_NOTE: BilingualText = {
  zh: 'Mica 与 Mica Alt 不透明:面板呈现组件内置的静态壁纸替身被主题色「取样」后的观感(真实 Mica 取样的是用户的桌面壁纸);Desktop Acrylic 半透明:实时模糊面板身后的彩色图形。窗口失活(IsInputActive = false)时整面落降级纯色。',
  en: 'Mica and Mica Alt are opaque: each panel shows the built-in static wallpaper stand-in tinted by the theme (real Mica samples the user\'s desktop wallpaper). Desktop Acrylic is translucent: it blurs the shapes behind the panel in real time. With IsInputActive = false the surface falls back to a solid color.',
}
const LIGHT_ROW_LABEL: BilingualText = { zh: '浅色主题默认值', en: 'Light theme defaults' }
const DARK_ROW_LABEL: BilingualText = { zh: '深色主题默认值', en: 'Dark theme defaults' }
const KIND_MICA: BilingualText = { zh: 'Mica(Base)', en: 'Mica (Base)' }
const KIND_MICA_ALT: BilingualText = { zh: 'Mica Alt', en: 'Mica Alt' }
const KIND_ACRYLIC: BilingualText = { zh: 'Desktop Acrylic', en: 'Desktop Acrylic' }
const PREVIEW_LABEL: BilingualText = { zh: '交互预览(对照 MicaController / DesktopAcrylicController 自定义)', en: 'Live preview (MicaController / DesktopAcrylicController customization)' }
const CONTENT_LAYER_LABEL: BilingualText = { zh: '内容层(官方分层指引)', en: 'Content layer (official layering guidance)' }
const CONTENT_LAYER_TEXT: BilingualText = { zh: '内容层:官方指引在材质之上叠一层低不透明度纯色(LayerFillColorDefault 等)承载正文,保证可读性。', en: 'Content layer: per official guidance, a low-opacity solid (LayerFillColorDefault etc.) sits on the material to carry readable content.' }
const INACTIVE_CAPTION: BilingualText = { zh: '窗口失活 → 整面落降级纯色', en: 'Window inactive → solid fallback color' }
const READOUT_LABEL: BilingualText = { zh: '当前参数与默认值来源', en: 'Current parameters and default sources' }
const XAML_READOUT_LABEL: BilingualText = { zh: '对应的 WinUI XAML', en: 'Equivalent WinUI XAML' }
const TINT_PRESETS_LABEL: BilingualText = { zh: 'Tint 默认值对照(六种材质 × 主题,点击应用)', en: 'Tint defaults comparison (six kind × theme combos, click to apply)' }
const CUSTOM_TINT_LABEL: BilingualText = { zh: '自定义 TintColor', en: 'Custom TintColor' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const compareLabel = useBilingual(i18n, COMPARE_LABEL)
const compareNote = useBilingual(i18n, COMPARE_NOTE)
const lightRowLabel = useBilingual(i18n, LIGHT_ROW_LABEL)
const darkRowLabel = useBilingual(i18n, DARK_ROW_LABEL)
const kindMica = useBilingual(i18n, KIND_MICA)
const kindMicaAlt = useBilingual(i18n, KIND_MICA_ALT)
const kindAcrylic = useBilingual(i18n, KIND_ACRYLIC)
const previewLabel = useBilingual(i18n, PREVIEW_LABEL)
const contentLayerLabel = useBilingual(i18n, CONTENT_LAYER_LABEL)
const contentLayerText = useBilingual(i18n, CONTENT_LAYER_TEXT)
const inactiveCaption = useBilingual(i18n, INACTIVE_CAPTION)
const readoutLabel = useBilingual(i18n, READOUT_LABEL)
const xamlReadoutLabel = useBilingual(i18n, XAML_READOUT_LABEL)
const tintPresetsLabel = useBilingual(i18n, TINT_PRESETS_LABEL)
const customTintLabel = useBilingual(i18n, CUSTOM_TINT_LABEL)

// —— 站点主题跟踪(theme = auto 时决定生效主题与内容层颜色;html[data-theme] 由 App 的 useThemeSetting 写入)——
function readSiteTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}
const siteTheme = ref<'light' | 'dark'>(readSiteTheme())
let themeObserver: MutationObserver | undefined
onMounted(() => {
  themeObserver = new MutationObserver(() => {
    siteTheme.value = readSiteTheme()
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => {
  themeObserver?.disconnect()
  themeObserver = undefined
})

// —— 可调参数(DemoOptionRow 的 v-model 契约要求联合类型,见 demo/components/README.md)——
const kind = ref<string | number | boolean>('mica')
const theme = ref<string | number | boolean>('auto')
const isInputActive = ref<string | number | boolean>(true)
const showContentLayer = ref<string | number | boolean>(true)
const tintOpacity = ref<string | number | boolean>(MICA_DEFAULTS.light.tintOpacity)
const tintHex = ref<string>(MICA_DEFAULTS.light.tintColor)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const kindValue = computed<WuiSystemBackdropKind>(() =>
  kind.value === 'micaAlt' ? 'micaAlt' : kind.value === 'acrylic' ? 'acrylic' : 'mica',
)
const themeValue = computed<WuiSystemBackdropTheme>(() =>
  theme.value === 'light' ? 'light' : theme.value === 'dark' ? 'dark' : 'auto',
)
const resolvedPreviewTheme = computed<'light' | 'dark'>(() =>
  themeValue.value === 'auto' ? siteTheme.value : themeValue.value,
)
const previewDefaults = computed(() => getSystemBackdropDefaults(kindValue.value, resolvedPreviewTheme.value))

// 切换材质 / 主题档位时把 tint 重置为新组合的默认值(「参数 → 默认值」对齐官方自定义示例)。
function resetTintToDefaults(): void {
  tintHex.value = previewDefaults.value.tintColor
  tintOpacity.value = previewDefaults.value.tintOpacity
}
// 初始对齐(站点可能是深色主题,而字面初值是浅色默认)。
resetTintToDefaults()
watch([kindValue, themeValue], resetTintToDefaults)

// 交互预览参数(直接映射组件 props;tintLuminosityOpacity 不传 → 用材质 × 主题默认值)。
const previewOptions = computed(() => ({
  kind: kindValue.value,
  theme: themeValue.value,
  isInputActive: isInputActive.value === true,
  tintColor: tintHex.value,
  tintOpacity: toNumber(tintOpacity.value, 0.8),
}))

// —— 内容层颜色(官方分层指引资源,Common_themeresources_any.xaml;XAML #AARRGGBB 已换算 rgba)——
// LayerFillColorDefault:Light L264 #80FFFFFF、Dark L60 #4C3A3A3A(Mica 之上的内容层);
// LayerOnMicaBaseAltFillColorDefault:Light L268 #B3FFFFFF、Dark L64 #733A3A3A(Mica Alt 之上的命令层);
// LayerOnAcrylicFillColorDefault:Light L266 #40FFFFFF、Dark L62 #09FFFFFF(亚克力之上的层)。
const CONTENT_LAYER_COLORS: Record<WuiSystemBackdropKind, Record<'light' | 'dark', string>> = {
  mica: { light: 'rgba(255, 255, 255, 0.5)', dark: 'rgba(58, 58, 58, 0.3)' },
  micaAlt: { light: 'rgba(255, 255, 255, 0.7)', dark: 'rgba(58, 58, 58, 0.45)' },
  acrylic: { light: 'rgba(255, 255, 255, 0.25)', dark: 'rgba(255, 255, 255, 0.035)' },
}
const contentLayerStyle = computed(() => ({
  backgroundColor: CONTENT_LAYER_COLORS[kindValue.value][resolvedPreviewTheme.value],
}))

// —— Tint 默认值对照(六种材质 × 主题组合,点击应用)——
interface TintPreset {
  key: string
  kind: WuiSystemBackdropKind
  theme: 'light' | 'dark'
  defaults: (typeof MICA_DEFAULTS)['light']
  source: string
}
const TINT_PRESETS: TintPreset[] = [
  { key: 'mica-light', kind: 'mica', theme: 'light', defaults: MICA_DEFAULTS.light, source: 'SolidBackgroundFillColorBase(L272)' },
  { key: 'mica-dark', kind: 'mica', theme: 'dark', defaults: MICA_DEFAULTS.dark, source: 'SolidBackgroundFillColorBase(L68)' },
  { key: 'micaAlt-light', kind: 'micaAlt', theme: 'light', defaults: MICA_ALT_DEFAULTS.light, source: 'SolidBackgroundFillColorBaseAlt(L279)' },
  { key: 'micaAlt-dark', kind: 'micaAlt', theme: 'dark', defaults: MICA_ALT_DEFAULTS.dark, source: 'SolidBackgroundFillColorBaseAlt(L75)' },
  { key: 'acrylic-light', kind: 'acrylic', theme: 'light', defaults: ACRYLIC_DEFAULTS.light, source: 'AcrylicInAppFillColorDefaultBrush(Light)' },
  { key: 'acrylic-dark', kind: 'acrylic', theme: 'dark', defaults: ACRYLIC_DEFAULTS.dark, source: 'AcrylicInAppFillColorDefaultBrush(Dark)' },
]

function applyTintPreset(preset: TintPreset): void {
  kind.value = preset.kind
  theme.value = preset.theme
  tintHex.value = preset.defaults.tintColor
  tintOpacity.value = preset.defaults.tintOpacity
}

// —— 静态对照行 ——
const THEME_ROWS = [
  { theme: 'light' as const, label: lightRowLabel },
  { theme: 'dark' as const, label: darkRowLabel },
]
const COMPARE_KINDS: { id: WuiSystemBackdropKind; label: BilingualText }[] = [
  { id: 'mica', label: KIND_MICA },
  { id: 'micaAlt', label: KIND_MICA_ALT },
  { id: 'acrylic', label: KIND_ACRYLIC },
]
function kindLabel(kindId: WuiSystemBackdropKind): string {
  if (kindId === 'mica') return kindMica.value
  if (kindId === 'micaAlt') return kindMicaAlt.value
  return kindAcrylic.value
}

// —— 当前参数读出 ——
const readoutText = computed(() => {
  const d = previewDefaults.value
  const kindName = kindValue.value === 'mica' ? 'Mica(Base)' : kindValue.value === 'micaAlt' ? 'Mica Alt' : 'Desktop Acrylic'
  const themeName = themeValue.value === 'auto' ? `auto(当前 ${resolvedPreviewTheme.value === 'dark' ? '深' : '浅'})` : themeValue.value === 'dark' ? 'dark' : 'light'
  const preset = TINT_PRESETS.find(
    (item) => item.kind === kindValue.value && item.theme === resolvedPreviewTheme.value,
  )
  return `kind=${kindName} · theme=${themeName} · IsInputActive=${isInputActive.value === true ? 'true' : 'false'}
tintColor=${tintHex.value}(默认 ${d.tintColor} · 来源:${preset?.source ?? '—'})
tintOpacity=${toNumber(tintOpacity.value, 0.8)}(默认 ${d.tintOpacity})· LuminosityOpacity=${d.tintLuminosityOpacity}(默认)`
})

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性', '类型', '默认值', '说明']
const docsRows: (string | number)[][] = [
  ['kind', "'mica' | 'micaAlt' | 'acrylic'", "'mica'", '系统材质种类(WinUI:MicaBackdrop Kind=Base / Kind=BaseAlt / DesktopAcrylicBackdrop)'],
  ['theme', "'light' | 'dark' | 'auto'", "'auto'", '材质明暗(WinUI SystemBackdropConfiguration.Theme);auto 跟随站点 html[data-theme]'],
  ['isInputActive', 'boolean', 'true', '输入激活(WinUI IsInputActive);false(窗口失活)整面落 fallbackColor 纯色'],
  ['tintColor', 'string', '按材质 × 主题(见 wiki 对照表)', '着色(WinUI MicaController / DesktopAcrylicController 的 TintColor)'],
  ['tintOpacity', 'number(0–1)', '按材质 × 主题', '着色不透明度(WinUI TintOpacity)'],
  ['tintLuminosityOpacity', 'number | null', '按材质 × 主题', '亮度层不透明度(WinUI LuminosityOpacity);null = 用默认值'],
  ['fallbackColor', 'string', '按材质 × 主题', '降级纯色(WinUI FallbackColor);失活或材质不可用时整面显示'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['(无业务事件)', '—', '系统材质作用于窗口背景、非交互控件;原生 DOM 事件可经 $attrs 在根 div 上监听'],
]

// 用法代码随参数实时更新。
const usageCode = computed(
  () => `<WuiSystemBackdrop
  kind="${kindValue.value}" theme="${themeValue.value}"
  :is-input-active="${isInputActive.value === true}"
  tint-color="${tintHex.value}" :tint-opacity="${toNumber(tintOpacity.value, 0.8)}"
  style="width: 320px; height: 200px" />`,
)

const xamlCode = computed(() => {
  if (kindValue.value === 'acrylic') {
    return `<Window.SystemBackdrop>\n    <DesktopAcrylicBackdrop />\n</Window.SystemBackdrop>`
  }
  const micaKind = kindValue.value === 'micaAlt' ? 'BaseAlt' : 'Base'
  return `<Window.SystemBackdrop>\n    <MicaBackdrop Kind="${micaKind}" />\n</Window.SystemBackdrop>`
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="backdrop-area">
        <!-- 三材质观感对照(浅 / 深两行,对照官方四种背板的说明) -->
        <section>
          <h4 class="section-title">{{ compareLabel }}</h4>
          <p class="note">{{ compareNote }}</p>
          <div v-for="row in THEME_ROWS" :key="row.theme" class="theme-row">
            <p class="theme-row-title">{{ row.theme === 'light' ? lightRowLabel : darkRowLabel }}</p>
            <div class="stage" role="img" :aria-label="`${compareLabel} · ${row.theme === 'light' ? lightRowLabel : darkRowLabel}`">
              <span class="stage-shape stage-shape--sky" />
              <span class="stage-shape stage-shape--rose" />
              <span class="stage-shape stage-shape--lime" />
              <span class="stage-shape stage-shape--amber" />
              <figure v-for="item in COMPARE_KINDS" :key="item.id" class="board">
                <WuiSystemBackdrop class="board-panel" :kind="item.id" :theme="row.theme" />
                <figcaption class="board-caption">{{ kindLabel(item.id) }}</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <!-- 交互预览(实时调节,叠加官方内容层) -->
        <section>
          <h4 class="section-title">{{ previewLabel }}</h4>
          <div class="preview-window" role="img" :aria-label="previewLabel">
            <span class="stage-shape stage-shape--sky" />
            <span class="stage-shape stage-shape--rose" />
            <span class="stage-shape stage-shape--lime" />
            <WuiSystemBackdrop class="preview-panel" v-bind="previewOptions" />
            <div v-if="showContentLayer === true" class="preview-content-layer" :style="contentLayerStyle">
              <p class="preview-content-title">{{ contentLayerLabel }}</p>
              <p class="preview-content-text">{{ contentLayerText }}</p>
            </div>
          </div>
          <p class="note" :class="{ 'note-hidden': isInputActive !== false }">{{ inactiveCaption }}</p>
          <h4 class="section-title section-title--sub">{{ readoutLabel }}</h4>
          <DemoCode class="readout" :code="readoutText" language="text" />
          <h4 class="section-title section-title--sub">{{ xamlReadoutLabel }}</h4>
          <DemoCode :code="xamlCode" language="xml" />
        </section>
      </div>
    </template>

    <template #options>
      <div class="options-groups">
        <DemoOptions :columns="2">
          <DemoOptionRow
            label="Kind"
            type="select"
            v-model="kind"
            :options="[
              { label: 'Mica (Base)', value: 'mica' },
              { label: 'Mica Alt', value: 'micaAlt' },
              { label: 'Desktop Acrylic', value: 'acrylic' },
            ]"
          />
          <DemoOptionRow
            label="Theme"
            type="select"
            v-model="theme"
            :options="[
              { label: 'auto(跟随站点)', value: 'auto' },
              { label: 'light', value: 'light' },
              { label: 'dark', value: 'dark' },
            ]"
          />
          <DemoOptionRow label="IsInputActive" type="toggle" v-model="isInputActive" />
          <DemoOptionRow label="显示内容层" type="toggle" v-model="showContentLayer" />
          <DemoOptionRow label="TintOpacity" type="slider" v-model="tintOpacity" :min="0" :max="1" :step="0.01" />
        </DemoOptions>

        <!-- TintColor:六组默认值对照 + 原生取色器(自绘,DemoOptionRow 无此形态) -->
        <div class="tint-editor">
          <h4 class="editor-title">{{ tintPresetsLabel }}</h4>
          <div class="tint-row">
            <button
              v-for="preset in TINT_PRESETS"
              :key="preset.key"
              type="button"
              class="tint-preset"
              :aria-label="`应用 ${preset.key} 默认 tint`"
              @click="applyTintPreset(preset)"
            >
              <span class="tint-swatch" :style="{ backgroundColor: preset.defaults.tintColor }" />
              <span class="tint-meta">
                <span class="tint-name">{{ preset.key }}</span>
                <span class="tint-value">{{ preset.defaults.tintColor.toUpperCase() }} · {{ preset.defaults.tintOpacity }}</span>
              </span>
            </button>
          </div>
          <h4 class="editor-title">{{ customTintLabel }}</h4>
          <div class="tint-row">
            <input v-model="tintHex" type="color" class="tint-input" aria-label="TintColor 自定义" />
            <code class="tint-value">{{ tintHex }}</code>
          </div>
        </div>
      </div>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">属性</h4>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <h4 class="docs-subtitle">事件</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.backdrop-area {
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

.note {
  max-width: 640px;
  margin: 0 0 16px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.note-hidden {
  visibility: hidden;
}

/* —— 三材质对照:同一「桌面」舞台 —— */
.theme-row {
  margin-bottom: 20px;
}

.theme-row-title {
  margin: 0 0 8px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

/* 舞台底色与彩色图形为示例内容色(模拟桌面壁纸与窗口内容,非控件 chrome):
   Mica 系面板不透明(不透出图形),Desktop Acrylic 面板实时模糊身后的图形。 */
.stage {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
  overflow: hidden;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: linear-gradient(150deg, #39508a 0%, #27325c 55%, #1c2749 100%);
}

.stage-shape {
  position: absolute;
  display: block;
  border-radius: 50%;
}

.stage-shape--sky {
  top: -28px;
  left: 8%;
  width: 120px;
  height: 120px;
  background-color: #4cc2ff;
  opacity: 0.85;
}

.stage-shape--rose {
  right: 8%;
  bottom: -40px;
  width: 150px;
  height: 150px;
  background-color: #ff8ac0;
  opacity: 0.8;
}

.stage-shape--lime {
  top: 40%;
  left: 46%;
  width: 90px;
  height: 90px;
  background-color: #a7e26a;
  opacity: 0.8;
}

.stage-shape--amber {
  top: -20px;
  right: 26%;
  width: 70px;
  height: 70px;
  background-color: #ffd166;
  opacity: 0.85;
}

.board {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}

.board-panel {
  width: 220px;
  height: 140px;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.board-caption {
  margin: 0;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 交互预览「窗口」—— */
.preview-window {
  position: relative;
  overflow: hidden;
  max-width: 640px;
  height: 260px;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: linear-gradient(150deg, #39508a 0%, #27325c 55%, #1c2749 100%);
}

.preview-panel {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
}

.preview-content-layer {
  position: absolute;
  inset: 24px 24px 24px 24px;
  padding: 16px;
  overflow: auto;
  border-radius: 8px;
}

.preview-content-title {
  margin: 0 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.preview-content-text {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.readout {
  max-width: 640px;
  margin-bottom: 8px;
  white-space: pre-wrap;
}

/* —— 参数面板区 —— */
.options-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tint-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.editor-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.tint-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tint-preset {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 4px;
  cursor: pointer;
}

.tint-preset:hover {
  background: var(--wui-button-pointer-over-background-theme);
}

.tint-preset:active {
  background: var(--wui-button-pressed-background-theme);
}

.tint-preset:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.tint-swatch {
  display: block;
  width: 28px;
  height: 20px;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: 4px;
}

.tint-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.tint-name {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.tint-value {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.tint-input {
  width: 36px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: 4px;
  background: none;
  cursor: pointer;
}

/* —— 下半区文档 —— */
.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
