<script setup lang="ts">
// SystemBackdropElementPage —— 官方 Samples/SystemBackdropElement 对照(SystemBackdropElementPage.xaml):
// 官方只有一个示例:Grid(300×200)内放 SystemBackdropElement(CornerRadius=8),Options 里
// BackdropTypeComboBox(Acrylic/Mica/Mica Alt,默认 Acrylic)切换 SystemBackdrop、CornerRadiusSlider
// (0–50,默认 8)调圆角,元素上叠加 "Click Me" 按钮 —— 材质垫底、内容兄弟节点叠加。
// 本页对照展开为两块:
//   1)「三材质元素卡片对照」:三张 SystemBackdropElement 卡片同台(Mica 不透明 / Mica Alt 强着色 /
//      Desktop Acrylic 实时模糊身后的彩色图形),主题跟随站点(主题跟随演示),圆角共用滑块值,
//      每张卡片以默认插槽把标签芯片叠在材质面上(「任意子内容置于材质面上」);
//   2)「内容叠加演示」:一比一还原官方示例 —— 元素垫满 300×200 舞台,Kind 下拉 + CornerRadius
//      滑块实时调,插槽叠 WuiButton("Click Me")+ 说明文字,并给出等价 WinUI XAML 读出。
// 材质默认值与分层渲染与窗口级姊妹件同源(复用 SystemBackdrop.vue 的 getSystemBackdropDefaults);
// 差异(壁纸替身等)见 wiki/controls/SystemBackdropElement.md。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiSystemBackdropElement from '@/components/SystemBackdropElement.vue'
import type { WuiSystemBackdropKind, WuiSystemBackdropTheme } from '@/components/SystemBackdrop.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'SystemBackdropElement', en: 'SystemBackdropElement' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '元素级系统材质宿主:把 Mica / Mica Alt / Desktop Acrylic 材质垫在 UI 树内任意一块区域(而非整个窗口)身后,并可用 CornerRadius 裁出圆角材质面。窗口级版本见 SystemBackdrops 页;两者分工详见 wiki。Web 侧与窗口级姊妹件同源渲染:Mica 用静态壁纸替身 + tint 分层,Acrylic 用 backdrop-filter 实时取样元素身后的内容。',
  en: 'An element-level system backdrop host: it places Mica / Mica Alt / Desktop Acrylic materials behind any area of the UI tree (not the whole window) and can clip the material with CornerRadius. See the SystemBackdrops page for the window-level version; the wiki explains how the two divide the work. Rendering mirrors the window-level sibling: Mica layers a static wallpaper stand-in, Acrylic samples via backdrop-filter.',
}
const COMPARE_LABEL: BilingualText = { zh: '三材质元素卡片对照(同一「桌面」舞台)', en: 'Three materials as element cards (same "desktop" stage)' }
const COMPARE_NOTE: BilingualText = {
  zh: '三张卡片都是 SystemBackdropElement 元素级材质,主题跟随站点。Mica 与 Mica Alt 不透明(呈现内置静态壁纸替身被主题色「取样」后的观感);Desktop Acrylic 半透明,实时模糊卡片身后的彩色图形。每张卡片上的标签芯片经默认插槽叠在材质面上。',
  en: 'All three cards are element-level SystemBackdropElements following the site theme. Mica and Mica Alt are opaque (the built-in wallpaper stand-in tinted by the theme); Desktop Acrylic is translucent and blurs the shapes behind each card in real time. The caption chip on each card sits on the material via the default slot.',
}
const OVERLAY_LABEL: BilingualText = { zh: '内容叠加演示(对照官方示例)', en: 'Content overlay demo (mirrors the official sample)' }
const OVERLAY_NOTE: BilingualText = {
  zh: '官方示例:300×200 的 Grid 里放一块 SystemBackdropElement(CornerRadius=8),Backdrop Type 下拉切换 Acrylic / Mica / Mica Alt,元素上叠加「Click Me」按钮 —— 内容清晰浮在材质之上,不被材质模糊。切换 Kind 时下方同步给出对应的 WinUI XAML。',
  en: 'Official sample: a SystemBackdropElement (CornerRadius=8) fills a 300x200 Grid, a Backdrop Type combo switches Acrylic / Mica / Mica Alt, and a "Click Me" button is overlaid on the element - content stays crisp above the material. The equivalent WinUI XAML is shown below as you switch.',
}
const KIND_MICA: BilingualText = { zh: 'Mica(Base)', en: 'Mica (Base)' }
const KIND_MICA_ALT: BilingualText = { zh: 'Mica Alt', en: 'Mica Alt' }
const KIND_ACRYLIC: BilingualText = { zh: 'Desktop Acrylic', en: 'Desktop Acrylic' }
const XAML_READOUT_LABEL: BilingualText = { zh: '对应的 WinUI XAML', en: 'Equivalent WinUI XAML' }
const READOUT_LABEL: BilingualText = { zh: '当前参数', en: 'Current parameters' }
const CHIP_LABEL: BilingualText = { zh: '插槽内容 · 材质面', en: 'Slot content' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const compareLabel = useBilingual(i18n, COMPARE_LABEL)
const compareNote = useBilingual(i18n, COMPARE_NOTE)
const overlayLabel = useBilingual(i18n, OVERLAY_LABEL)
const overlayNote = useBilingual(i18n, OVERLAY_NOTE)
const kindMica = useBilingual(i18n, KIND_MICA)
const kindMicaAlt = useBilingual(i18n, KIND_MICA_ALT)
const kindAcrylic = useBilingual(i18n, KIND_ACRYLIC)
const xamlReadoutLabel = useBilingual(i18n, XAML_READOUT_LABEL)
const chipLabel = useBilingual(i18n, CHIP_LABEL)
const readoutLabel = useBilingual(i18n, READOUT_LABEL)

// —— 站点主题跟踪(对照卡片的标签芯片颜色按站点主题取官方内容层资源;html[data-theme] 由 App 写入)——
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

// —— 可调参数(DemoOptionRow 的 v-model 契约要求联合类型)——
// kind 初值 acrylic、cornerRadius 初值 8:对齐官方示例(BackdropTypeComboBox SelectedIndex=0、
// CornerRadiusSlider Value=8)。
const kind = ref<string | number | boolean>('acrylic')
const cornerRadius = ref<string | number | boolean>(8)
const theme = ref<string | number | boolean>('auto')
const isInputActive = ref<string | number | boolean>(true)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const kindValue = computed<WuiSystemBackdropKind>(() =>
  kind.value === 'micaAlt' ? 'micaAlt' : kind.value === 'mica' ? 'mica' : 'acrylic',
)
const cornerRadiusValue = computed(() => toNumber(cornerRadius.value, 8))
const themeValue = computed<WuiSystemBackdropTheme>(() =>
  theme.value === 'light' ? 'light' : theme.value === 'dark' ? 'dark' : 'auto',
)

// —— 三材质对照卡片(主题跟随站点;圆角共用滑块值)——
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

// 标签芯片底色:官方分层指引资源 LayerFillColorDefault(Common_themeresources_any.xaml,
// Light L264 #80FFFFFF、Dark L60 #4C3A3A3A;XAML #AARRGGBB 已换算 rgba)—— 材质之上叠
// 低不透明度纯色承载正文,卡片主题跟随站点,故随 siteTheme 取值(示例内容色,非控件 chrome)。
const chipStyle = computed(() => ({
  backgroundColor:
    siteTheme.value === 'dark' ? 'rgba(58, 58, 58, 0.3)' : 'rgba(255, 255, 255, 0.5)',
}))

// —— 当前参数读出与等价 XAML ——
const readoutText = computed(() => {
  const kindName = kindValue.value === 'mica' ? 'Mica(Base)' : kindValue.value === 'micaAlt' ? 'Mica Alt' : 'Desktop Acrylic'
  const themeName =
    themeValue.value === 'auto'
      ? `auto(当前 ${siteTheme.value === 'dark' ? '深' : '浅'})`
      : themeValue.value
  return `SystemBackdrop=${kindName} · CornerRadius=${cornerRadiusValue.value}
theme=${themeName} · IsInputActive=${isInputActive.value === true ? 'true' : 'false'}`
})

const xamlCode = computed(() => {
  const backdrop =
    kindValue.value === 'acrylic'
      ? '<DesktopAcrylicBackdrop />'
      : `<MicaBackdrop Kind="${kindValue.value === 'micaAlt' ? 'BaseAlt' : 'Base'}" />`
  return `<Grid Width="300" Height="200">\n    <SystemBackdropElement CornerRadius="${cornerRadiusValue.value}">\n        <SystemBackdropElement.SystemBackdrop>\n            ${backdrop}\n        </SystemBackdropElement.SystemBackdrop>\n    </SystemBackdropElement>\n    <Button Content="Click Me" />\n</Grid>`
})

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性', '类型', '默认值', '说明']
const docsRows: (string | number)[][] = [
  ['kind', "'mica' | 'micaAlt' | 'acrylic'", "'mica'", '系统材质种类(WinUI:SystemBackdrop 属性挂 MicaBackdrop Kind=Base/BaseAlt 或 DesktopAcrylicBackdrop)'],
  ['theme', "'light' | 'dark' | 'auto'", "'auto'", '材质明暗(WinUI SystemBackdropConfiguration.Theme);auto 跟随站点 html[data-theme]'],
  ['cornerRadius', 'number | string', '0', '材质面圆角(WinUI CornerRadius);number 按 px,string 原样作 CSS border-radius(可逐角)'],
  ['isInputActive', 'boolean', 'true', '输入激活(WinUI IsInputActive 的 Web 模拟);false 整面落降级纯色'],
  ['(默认插槽)', '—', '—', '叠在材质面上的任意内容(WinUI 侧无内容属性,内容以 Grid 兄弟节点叠加,见 wiki)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['(无业务事件)', '—', 'SystemBackdropElement 是 FrameworkElement 非 Control,无交互语义;原生 DOM 事件可经 $attrs 在根 div 上监听'],
]

// 用法代码随参数实时更新。
const usageCode = computed(
  () => `<WuiSystemBackdropElement
  kind="${kindValue.value}" :corner-radius="${cornerRadiusValue.value}"
  theme="${themeValue.value}" :is-input-active="${isInputActive.value === true}"
  style="width: 300px; height: 200px">
  <span>任意内容叠在材质面上</span>
</WuiSystemBackdropElement>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="backdrop-area">
        <!-- 三材质元素卡片对照(同一「桌面」舞台,主题跟随站点) -->
        <section>
          <h4 class="section-title">{{ compareLabel }}</h4>
          <p class="note">{{ compareNote }}</p>
          <div class="stage" role="img" :aria-label="compareLabel">
            <span class="stage-shape stage-shape--sky" />
            <span class="stage-shape stage-shape--rose" />
            <span class="stage-shape stage-shape--lime" />
            <span class="stage-shape stage-shape--amber" />
            <figure v-for="item in COMPARE_KINDS" :key="item.id" class="board">
              <WuiSystemBackdropElement class="board-panel" :kind="item.id" theme="auto" :corner-radius="cornerRadiusValue">
                <span class="card-chip" :style="chipStyle">{{ chipLabel }}</span>
              </WuiSystemBackdropElement>
              <figcaption class="board-caption">{{ kindLabel(item.id) }}</figcaption>
            </figure>
          </div>
        </section>

        <!-- 内容叠加演示(一比一还原官方示例:元素垫底 + 内容叠加) -->
        <section>
          <h4 class="section-title">{{ overlayLabel }}</h4>
          <p class="note">{{ overlayNote }}</p>
          <!-- 舞台内含可交互按钮(官方示例的 Click Me),不加 role="img" 以免隐藏可交互子节点 -->
          <div class="overlay-stage" :aria-label="overlayLabel">
            <span class="stage-shape stage-shape--sky" />
            <span class="stage-shape stage-shape--rose" />
            <span class="stage-shape stage-shape--lime" />
            <WuiSystemBackdropElement
              class="overlay-panel"
              :kind="kindValue"
              :theme="themeValue"
              :corner-radius="cornerRadiusValue"
              :is-input-active="isInputActive === true"
            >
              <div class="overlay-content">
                <WuiButton content="Click Me" />
                <span class="overlay-caption">内容叠在材质面上,不被材质模糊</span>
              </div>
            </WuiSystemBackdropElement>
          </div>
          <h4 class="section-title section-title--sub">{{ readoutLabel }}</h4>
          <DemoCode class="readout" :code="readoutText" language="text" />
          <h4 class="section-title section-title--sub">{{ xamlReadoutLabel }}</h4>
          <DemoCode :code="xamlCode" language="xml" />
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <!-- 官方 BackdropTypeComboBox:Acrylic / Mica / Mica Alt(默认 Acrylic) -->
        <DemoOptionRow
          label="Backdrop Type"
          type="select"
          v-model="kind"
          :options="[
            { label: 'Acrylic', value: 'acrylic' },
            { label: 'Mica', value: 'mica' },
            { label: 'Mica Alt', value: 'micaAlt' },
          ]"
        />
        <!-- 官方 CornerRadiusSlider:0–50,步进 1,默认 8 -->
        <DemoOptionRow label="Corner radius" type="slider" v-model="cornerRadius" :min="0" :max="50" :step="1" />
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
      </DemoOptions>
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

/* —— 三材质对照:同一「桌面」舞台 —— */
/* 舞台底色与彩色图形为示例内容色(模拟桌面壁纸与窗口内容,非控件 chrome):
   Mica 系卡片不透明(不透出图形),Desktop Acrylic 卡片实时模糊身后的图形。 */
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
}

/* 标签芯片:默认插槽内容(叠在材质面上);底色由脚本按站点主题下发(LayerFillColorDefault)。 */
.card-chip {
  display: inline-block;
  margin: 12px;
  padding: 4px 10px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.board-caption {
  margin: 0;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 内容叠加演示「窗口」(官方示例 300×200 舞台)—— */
.overlay-stage {
  position: relative;
  overflow: hidden;
  width: 332px;
  height: 232px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: linear-gradient(150deg, #39508a 0%, #27325c 55%, #1c2749 100%);
  box-sizing: border-box;
}

.overlay-panel {
  width: 100%;
  height: 100%;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
}

.overlay-caption {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.readout {
  max-width: 640px;
  margin-bottom: 8px;
  white-space: pre-wrap;
}

/* —— 下半区文档 —— */
.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
