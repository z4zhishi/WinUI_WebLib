<script setup lang="ts">
// ThemeShadowPage.vue —— ThemeShadow 示例页(阶段 7:投影抽象)。
// 官方示例复刻源:CK/WinUI-Gallery/WinUIGallery/Samples/ThemeShadow/
//   ThemeShadowPage.xaml(200×200 Border + ThemeShadow + Z-translation 滑块 0-64 默认 32,
//   背景铺 ShadowCastGrid)、ThemeShadowPage.xaml.cs(ShadowRect_Loaded →
//   shadow.Receivers.Add(ShadowCastGrid))。
// Web 版:src/utils/themeShadow.ts(elevation → 多层 box-shadow)+
// src/components/ThemeShadowDemo.vue(投影卡片 + receiver 背景层)。
// 结构照抄已通过 QA 的 StandardUICommandPage 母版;文案暂用中文双语常量(阶段 8 统一 i18n)。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiFlyout from '@/components/Flyout.vue'
import ThemeShadowDemo from '@/components/ThemeShadowDemo.vue'
import {
  THEME_SHADOW_DEFAULT_ELEVATION,
  THEME_SHADOW_PRESETS,
  themeShadowCss,
} from '@/utils/themeShadow'
import type { ThemeShadowPresetDef, ThemeShadowPresetName } from '@/utils/themeShadow'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 ThemeShadow 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'ThemeShadow(主题投影)', en: 'ThemeShadow' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '利用系统的光照与景深,为 UI 元素添加真实感投影以强化视觉层级。Web 版以多层 box-shadow 做观感近似:elevation(等价 WinUI Translation.Z)映射为随高度发散/加深的阴影,阴影观感与弹层基建(--wui-popup-shadow)统一口径。',
  en: 'Adds a realistic shadow effect to UI elements using the system lighting and depth to enhance visual hierarchy. The web version approximates it with layered box-shadows: elevation (WinUI Translation.Z) maps to shadows that spread with height, unified with the popup infra shadow.',
}
const SECTION_OFFICIAL_TITLE: BilingualText = {
  zh: '官方示例复刻(200×200 卡片 + Z-translation 滑块)',
  en: 'Official sample (200×200 card + Z-translation slider)',
}
const SECTION_PRESET_TITLE: BilingualText = {
  zh: 'elevation 预设档位(WinUI 控件实际使用的 4 档)',
  en: 'Elevation presets (4 tiers used by WinUI controls)',
}
const SECTION_DRAG_TITLE: BilingualText = { zh: '拖动卡片(阴影随位置移动)', en: 'Drag the card' }
const SECTION_COMPARE_TITLE: BilingualText = { zh: '与弹层阴影对照(统一口径)', en: 'Popup shadow comparison' }
const OFFICIAL_INTRO: BilingualText = {
  zh: '对照官方示例:Border 挂 ThemeShadow,滑块调节 Translation.Z(0-64,默认 32),阴影投到铺底的 ShadowCastGrid(Web 版为 receiver 背景层近似「只投 Receivers」语义)。',
  en: 'Replicates the official sample: a Border with ThemeShadow, slider adjusts Translation.Z (0-64, default 32), shadow cast onto the backdrop grid (web: receiver layer approximating Receivers).',
}
const DRAG_INTRO: BilingualText = {
  zh: '卡片可拖动(指针)或用方向键移动(每次 8px)、Home 复位 —— WinUI 中 Translation.X/Y/Z 一起移动元素,Web 无 Z 轴,仅保留阴影观感。',
  en: 'Drag the card (pointer) or move it with arrow keys (8px per press), Home to reset. WinUI moves the element in 3D; the web has no Z axis, so only the shadow is kept.',
}
const COMPARE_INTRO: BilingualText = {
  zh: '弹层基建(popup.css)的层根阴影 --wui-popup-shadow 就是 ThemeShadow elevation 32 的观感 —— 两者的 CSS 值逐字一致(浅色),wiki 统一口径。点开左侧 Flyout 与右侧卡片对比:',
  en: 'The popup layer shadow (--wui-popup-shadow) is exactly the ThemeShadow elevation-32 look — identical CSS values (light theme). Open the Flyout and compare with the card:',
}
const COMPARE_EQUAL_LABEL: BilingualText = { zh: '弹层基建 --wui-popup-shadow(浅色)≡ themeShadowCss(32):', en: 'Popup infra --wui-popup-shadow (light) ≡ themeShadowCss(32):' }
const PRESET_INTRO: BilingualText = {
  zh: '档位值取自 WinUI 参照源(非自定义):ToolTip 16;弹层默认 32(Flyout / MenuFlyout 首层 / ComboBox 下拉 / AutoSuggestBox / CommandBar Overflow);二级子菜单 40(每深一级 +8);ContentDialog drop shadow 模式 128。',
  en: 'Preset values come from the WinUI reference source: ToolTip 16; popup default 32 (Flyout / MenuFlyout top level / ComboBox dropdown / AutoSuggestBox / CommandBar overflow); second-level submenu 40 (+8 per level); ContentDialog drop-shadow mode 128.',
}
const DOCS_PROPS_TITLE: BilingualText = { zh: '组件属性(ThemeShadowDemo)', en: 'Component props' }
const DOCS_FUNCS_TITLE: BilingualText = { zh: '工具函数(src/utils/themeShadow.ts)', en: 'Utility functions' }
const DOCS_PRESET_TABLE_TITLE: BilingualText = { zh: '预设档位(值来自 WinUI 参照源)', en: 'Presets (from the WinUI reference source)' }
const DOCS_MAPPING_TITLE: BilingualText = { zh: 'elevation → box-shadow 映射(当前参数实时生成)', en: 'Elevation → box-shadow mapping (live)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionOfficialTitle = useBilingual(i18n, SECTION_OFFICIAL_TITLE)
const sectionPresetTitle = useBilingual(i18n, SECTION_PRESET_TITLE)
const sectionDragTitle = useBilingual(i18n, SECTION_DRAG_TITLE)
const sectionCompareTitle = useBilingual(i18n, SECTION_COMPARE_TITLE)
const officialIntro = useBilingual(i18n, OFFICIAL_INTRO)
const dragIntro = useBilingual(i18n, DRAG_INTRO)
const compareIntro = useBilingual(i18n, COMPARE_INTRO)
const compareEqualLabel = useBilingual(i18n, COMPARE_EQUAL_LABEL)
const presetIntro = useBilingual(i18n, PRESET_INTRO)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsFuncsTitle = useBilingual(i18n, DOCS_FUNCS_TITLE)
const docsPresetTableTitle = useBilingual(i18n, DOCS_PRESET_TABLE_TITLE)
const docsMappingTitle = useBilingual(i18n, DOCS_MAPPING_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例 1:官方示例复刻(Z-translation 滑块 0-64,默认 32;receiver 背景层开关)——
const zTranslation = ref<string | number | boolean>(32)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const zTranslationValue = computed(() => toNumber(zTranslation.value, 32))

// 主题选择:Auto 跟随站点预览(DemoPage 页头开关写 html[data-theme],组件经 MutationObserver 感知)
type ThemeChoice = 'auto' | 'light' | 'dark'
const THEME_CHOICES: { label: string; value: ThemeChoice }[] = [
  { label: 'Auto(跟随站点预览)', value: 'auto' },
  { label: 'Light(浅色)', value: 'light' },
  { label: 'Dark(深色)', value: 'dark' },
]
const themeChoice = ref<string | number | boolean>('auto')
const themeChoiceValue = computed<ThemeChoice>(() => {
  const value = themeChoice.value
  return typeof value === 'string' && THEME_CHOICES.some((choice) => choice.value === value)
    ? (value as ThemeChoice)
    : 'auto'
})

const receiverOn = ref<string | number | boolean>(true)

// —— 示例 2:预设档位(4 张卡片,label/elevation/来源全部来自 THEME_SHADOW_PRESETS)——
const presetEntries = Object.entries(THEME_SHADOW_PRESETS) as [ThemeShadowPresetName, ThemeShadowPresetDef][]

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Elevation', 'number | ThemeShadowPresetName', '32', 'elevation(等价 WinUI UIElement.Translation.Z,px);也可传预设名 tooltip / flyout / subMenu / dialog'],
  ['Theme', "'light' | 'dark' | 'auto'", "'auto'", "阴影主题;dark 下主投影透明度 ×1.5(上限 0.36,Web 惯例补偿),auto 跟随站点 html[data-theme]"],
  ['Draggable', 'boolean', 'false', '卡片可拖动(指针拖动;方向键每次 8px,Home 复位;tabindex=0 + role=button)'],
  ['ShowReceiver', 'boolean', 'true', '显示 receiver 背景层(receiver 语义近似,见 wiki 差异节)'],
  ['ReceiverLabel', 'string', "'Receiver'", 'receiver 层角标文案'],
  ['CardWidth / CardHeight', 'number', '200 / 200', '卡片尺寸(官方示例 200×200)'],
]

const funcHeaders = ['函数 / 常量', '签名', '说明']
const funcRows: (string | number)[][] = [
  ['themeShadowCss', "(elevation, { theme? }) => string", '生成多层 box-shadow CSS 值;elevation ≤ 0 返回 "none"(对应官方示例 Z-translation=0)'],
  ['themeShadowStyle', "(elevation, { theme? }) => CSSProperties", 'style 对象形式({ boxShadow }),供 :style 直接绑定'],
  ['applyThemeShadow', '(element, elevation, { theme? }) => () => void', '命令式施加到元素并返回恢复原值的清理函数(等价「挂 ThemeShadow + 设 Translation.Z」的合成结果)'],
  ['resolveThemeShadowElevation', '(value) => number', '预设名 → elevation 数值;未知预设名抛错'],
  ['THEME_SHADOW_PRESETS', 'Record<ThemeShadowPresetName, ThemeShadowPresetDef>', '4 档预设(elevation / 中英文名 / WinUI 来源)'],
  ['THEME_SHADOW_DEFAULT_ELEVATION', 'number', '32(s_elevationBaseDepth:弹层初始抬升)'],
  ['THEME_SHADOW_ANIMATION_MS', 'number', '125(WinUI Translation 动画时长,ElevationHelper.cpp s_durationTime)'],
]

const presetTableHeaders = ['预设', 'Elevation', 'WinUI 取值来源']
const presetTableRows: (string | number)[][] = presetEntries.map(([name, def]) => [
  `${name}(${def.labelZh})`,
  def.elevation,
  def.winui,
])

const generatedCssCode = computed(() => {
  const themeArg = themeChoiceValue.value === 'auto' ? '' : `, { theme: '${themeChoiceValue.value}' }`
  return `/* themeShadowCss(${zTranslationValue.value}${themeArg}) —— elevation 随高度发散/加深,32 档与弹层基建 --wui-popup-shadow 逐字一致 */
box-shadow: ${themeShadowCss(zTranslationValue.value, {
    theme: themeChoiceValue.value === 'auto' ? 'light' : themeChoiceValue.value,
  })};`
})

const compareCss = computed(() => themeShadowCss(32))

const usageCode = `import { themeShadowCss, themeShadowStyle } from '@/utils/themeShadow'
import ThemeShadowDemo from '@/components/ThemeShadowDemo.vue'

<!-- 组件式:elevation 支持数值或预设名(tooltip / flyout / subMenu / dialog) -->
<ThemeShadowDemo :elevation="32" draggable show-receiver>
  卡片内容
</ThemeShadowDemo>

<!-- 工具式:任意元素直接施加 -->
<div :style="themeShadowStyle(32)">或 {{ themeShadowCss(40) }}</div>`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ThemeShadow">
    <template #demo>
      <div class="tsd-sections">
        <!-- 示例 1:官方示例复刻(200×200 卡片 + Z-translation 滑块 + receiver 背景层) -->
        <section class="tsd-section">
          <h3 class="docs-subtitle">{{ sectionOfficialTitle }}</h3>
          <p class="tsd-intro">{{ officialIntro }}</p>
          <ThemeShadowDemo
            class="tsd-official-stage"
            :elevation="zTranslationValue"
            :theme="themeChoiceValue"
            :show-receiver="receiverOn === true"
            :card-width="200"
            :card-height="200"
            :style="{ minWidth: '272px', minHeight: '272px' }"
          >
            <span class="tsd-card-value">Z = {{ zTranslationValue }}</span>
          </ThemeShadowDemo>
        </section>

        <!-- 示例 2:elevation 预设档位(4 档,值来自 WinUI 参照源) -->
        <section class="tsd-section">
          <h3 class="docs-subtitle">{{ sectionPresetTitle }}</h3>
          <p class="tsd-intro">{{ presetIntro }}</p>
          <div class="tsd-preset-row">
            <ThemeShadowDemo
              v-for="[name, def] in presetEntries"
              :key="name"
              :elevation="name"
              :show-receiver="false"
              :card-width="170"
              :card-height="140"
              :style="{ minWidth: '170px', minHeight: '140px' }"
            >
              <span class="tsd-preset-name">{{ def.label }} · {{ def.labelZh }}</span>
              <span class="tsd-card-value">elevation {{ def.elevation }}</span>
            </ThemeShadowDemo>
          </div>
        </section>

        <!-- 示例 3:拖动卡片(阴影随位置移动;键盘可达) -->
        <section class="tsd-section">
          <h3 class="docs-subtitle">{{ sectionDragTitle }}</h3>
          <p class="tsd-intro">{{ dragIntro }}</p>
          <ThemeShadowDemo
            draggable
            :elevation="THEME_SHADOW_DEFAULT_ELEVATION"
            :card-width="160"
            :card-height="120"
            :style="{ minWidth: '100%', minHeight: '240px' }"
          >
            <span class="tsd-card-value">Drag me · 32</span>
          </ThemeShadowDemo>
        </section>

        <!-- 示例 4:与弹层阴影对照(统一口径) -->
        <section class="tsd-section">
          <h3 class="docs-subtitle">{{ sectionCompareTitle }}</h3>
          <p class="tsd-intro">{{ compareIntro }}</p>
          <div class="tsd-compare-row">
            <div class="tsd-compare-cell">
              <WuiFlyout>
                <template #target="{ open }">
                  <WuiButton content="打开 Flyout(弹层基建阴影)" :aria-expanded="open" aria-haspopup="dialog" />
                </template>
                <p class="tsd-flyout-text">弹层内容:层根阴影由 --wui-popup-shadow 提供,</p>
                <p class="tsd-flyout-text">观感即 ThemeShadow elevation 32。</p>
              </WuiFlyout>
            </div>
            <div class="tsd-compare-cell">
              <ThemeShadowDemo
                :elevation="32"
                :show-receiver="false"
                :card-width="220"
                :card-height="120"
                :style="{ minWidth: '220px', minHeight: '120px' }"
              >
                <span class="tsd-card-value">themeShadow(32)</span>
              </ThemeShadowDemo>
            </div>
          </div>
          <p class="tsd-intro">
            {{ compareEqualLabel }}<code class="tsd-css">{{ compareCss }}</code>
          </p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          label="Z-translation(官方示例滑块 0-64)"
          type="slider"
          v-model="zTranslation"
          :min="0"
          :max="64"
          :step="1"
        />
        <DemoOptionRow label="阴影主题" type="select" v-model="themeChoice" :options="THEME_CHOICES" />
        <DemoOptionRow label="Receiver 背景层" type="toggle" v-model="receiverOn" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ docsFuncsTitle }}</h3>
      <DemoDocsTable :headers="funcHeaders" :rows="funcRows" />
      <h3 class="docs-subtitle">{{ docsPresetTableTitle }}</h3>
      <DemoDocsTable :headers="presetTableHeaders" :rows="presetTableRows" />
      <h3 class="docs-subtitle">{{ docsMappingTitle }}</h3>
      <DemoCode :code="generatedCssCode" language="css" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.tsd-sections {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.tsd-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tsd-intro {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.tsd-css {
  font-family: Consolas, monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  word-break: break-all;
}

/* 官方示例的 Grid Padding=36:舞台留出阴影发散空间 */
.tsd-official-stage {
  align-self: center;
}

.tsd-card-value {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.tsd-preset-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 40px;
}

.tsd-preset-name {
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.tsd-compare-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 40px;
}

.tsd-compare-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.tsd-flyout-text {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.docs-subtitle {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
