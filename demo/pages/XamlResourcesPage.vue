<script setup lang="ts">
// XamlResourcesPage.vue —— XAML 资源体系教学页(对照官方示例:
// CK/WinUI-Gallery/WinUIGallery/Samples/XamlResources/XamlResourcesPage.xaml + 三个 .txt)。
// 官方四个示例:资源三级作用域(app/page/control)、ThemeDictionaries 定义新主题资源、
// StaticResource vs ThemeResource;本页逐条复刻并以 Web 等价物承载:
// ResourceDictionary ↔ CSS 自定义属性、ThemeResource ↔ var()(随 html[data-theme] 即时更新)、
// StaticResource ↔ 应用启动时捕获的值快照(getComputedStyle,不随主题更新)、
// ThemeDictionaries(Light 键为 "Default")↔ [data-theme] 作用域内重声明同名变量、
// 轻量样式(lightweight styling)↔ 在容器作用域覆写控件 token。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()
// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Resources(XAML 资源)', en: 'Resources (XAML Resources)' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'XAML 资源是可复用的对象(颜色、画刷、字符串等),定义一次、全应用引用,保证一致性与可维护性;主题资源(ResourceDictionary.ThemeDictionaries)可随明暗主题自动适配。Web 侧的对应物是 CSS 自定义属性:theme.css 即由 WinUI 主题字典生成的「资源字典」,var() 引用即 ThemeResource。',
  en: 'XAML resources are reusable objects (colors, brushes, strings) defined once and referenced across the app; theme resources (ResourceDictionary.ThemeDictionaries) adapt to light/dark automatically. The web counterpart is CSS custom properties: theme.css is a resource dictionary generated from the WinUI theme dictionaries, and var() references act as ThemeResource.',
}
const SECTION_SCOPE_TITLE: BilingualText = {
  zh: '创建并使用 XAML 资源(app / page / control 三级作用域)',
  en: 'Creating and using XAML resources (app / page / control levels)',
}
const SECTION_SCOPE_CAPTION: BilingualText = {
  zh: '对照官方 Xamlresources.txt:同一色值定义在越窄的作用域越优先。Web 复刻:app 级资源挂页面根容器(真实应用挂 :root),page 级资源挂示例容器,control 级资源挂目标元素自身;引用统一用 var(--key),即 {StaticResource Key}。官方提示仍成立:命名要有描述性、资源尽量定义在最小作用域。',
  en: 'Mirrors Xamlresources.txt: the narrowest scope wins. Web replica: app-level resources sit on the page root (in a real app, :root), page-level on the sample container, control-level on the element itself; all consumption goes through var(--key), i.e. {StaticResource Key}. Official tips still hold: descriptive keys, narrowest scope possible.',
}
const SECTION_THEME_TITLE: BilingualText = {
  zh: 'Theme resources:StaticResource 与 ThemeResource',
  en: 'Theme resources: StaticResource vs ThemeResource',
}
const SECTION_THEME_CAPTION: BilingualText = {
  zh: '对照官方 XamlResourcesStaticresourceVersusThemeresource.txt:StaticResource 取应用启动时的值,主题切换不更新;ThemeResource 随当前主题即时更新。Web 侧 var() 天然是 ThemeResource;「StaticResource」用应用启动时 getComputedStyle 捕获的值快照模拟。点示例区右上角 Light / Dark 切换主题观察差异;「重新捕获」按钮等价于重启应用。',
  en: 'Mirrors the official sample: StaticResource takes the value from app start and does not update on theme change; ThemeResource follows the current theme. On the web var() is inherently ThemeResource; "StaticResource" is simulated with a snapshot captured via getComputedStyle at app start. Toggle Light / Dark at the top-right of the sample area to compare; the recapture button equals restarting the app.',
}
const STATIC_LABEL: BilingualText = { zh: 'StaticResource(启动时捕获)', en: 'StaticResource (captured at start)' }
const THEME_LABEL: BilingualText = { zh: 'ThemeResource(var() 实时解析)', en: 'ThemeResource (resolved via var())' }
const STATIC_TEXT: BilingualText = {
  zh: 'StaticResource 使用应用启动时定义的值,主题切换时不更新。',
  en: 'StaticResource uses the value defined when the app starts and does not update when the theme changes.',
}
const THEME_TEXT: BilingualText = {
  zh: 'ThemeResource 自动适配当前主题:应用从 Light 切到 Dark 时,引用的颜色随之变化。',
  en: 'ThemeResource adapts automatically to the current theme: switching from light to dark updates the referenced color.',
}
const RECAPTURE_LABEL: BilingualText = { zh: '重新捕获 StaticResource(等价重启应用)', en: 'Recapture StaticResource (restart app)' }
const CAPTURED_LABEL: BilingualText = { zh: '当前捕获值', en: 'Captured values' }
const SECTION_DICT_TITLE: BilingualText = {
  zh: 'ThemeDictionaries:定义新主题资源',
  en: 'ThemeDictionaries: define a new theme resource',
}
const SECTION_DICT_CAPTION: BilingualText = {
  zh: '对照官方 XamlResourcesDefineNewThemeResource.txt:在 ThemeDictionaries 内按 x:Key="Default"(浅色默认)与 "Dark" 各给一套值,资源即随主题切换。Web 复刻:卡片作用域内为同名变量给两套声明,html[data-theme] 切换作用域。注意 WinUI 浅色字典的键是 "Default" 而非 "Light";x:String 字符串资源在 Web 用响应式常量承载(值随主题更新);官方示例的 ImageSource 以色板块代替(无图片资产)。',
  en: 'Mirrors the official sample: give per-theme values under x:Key="Default" (light default) and "Dark"; the resource then follows the theme. Web replica: declare the same custom properties twice within the card scope and switch via html[data-theme]. Note the light dictionary key is "Default", not "Light"; x:String becomes a reactive constant; the official ImageSource is replaced by a color swatch (no image asset).',
}
const DICT_CARD_STRING_LABEL: BilingualText = { zh: 'ThemeString 资源(x:String):', en: 'ThemeString resource (x:String):' }
const DICT_IMAGE_NOTE: BilingualText = {
  zh: '官方示例此处为 ImageSource 资源(随主题换图);本页以色板代替。',
  en: 'The official sample shows an ImageSource resource (image per theme); replaced by a swatch here.',
}
const SECTION_LW_TITLE: BilingualText = {
  zh: '轻量样式(lightweight styling):控件 token 覆写',
  en: 'Lightweight styling: control token overrides',
}
const SECTION_LW_CAPTION: BilingualText = {
  zh: 'WinUI 不必重写 ControlTemplate 也能改控件配色:在任意作用域重声明控件资源键(ButtonBackground 等),模板内的 {ThemeResource} 引用即取新值——称为轻量样式。Web 侧机制相同:theme.css 的控件 token 都是级联变量,在容器上重声明即可换肤。左列等价于把 Button 资源换成本库 AccentButton* token(即 WinUI AccentButtonStyle 的取值);右列为逐控件覆写(props → --wui-button-local-*)。悬停/按下等状态色仍走主题,与 WinUI 仅覆写 Normal 资源时的行为一致。',
  en: 'WinUI can restyle a control without rewriting its ControlTemplate: redeclare control resource keys (ButtonBackground etc.) in any scope and the {ThemeResource} references inside the template pick up the new values — lightweight styling. The web mechanism is identical: control tokens in theme.css are cascading custom properties, so redeclaring them on a container reskins everything inside. The left column swaps Button resources to the library AccentButton* tokens (the values of the WinUI AccentButtonStyle); the right column overrides per-control via props (mapped to --wui-button-local-*). Hover/pressed state colors still come from the theme, matching WinUI when only normal-state resources are overridden.',
}
const LW_SCOPE_TITLE: BilingualText = { zh: '容器 token 覆写(Button 换 accent)', en: 'Container token override (accent Button)' }
const LW_PROP_TITLE: BilingualText = { zh: '逐控件覆写(props)', en: 'Per-control override (props)' }
const DOCS_MAPPING_TITLE: BilingualText = { zh: 'WinUI 资源机制 ↔ Web 等价映射', en: 'WinUI resource mechanics vs web equivalents' }
const DOCS_LIBRARY_TITLE: BilingualText = { zh: '本库 token 层(theme.css / theme-hooks.css)', en: 'Library token layer (theme.css / theme-hooks.css)' }
const DOCS_LW_TITLE: BilingualText = { zh: 'Button 资源键 ↔ token 覆写对照(轻量样式)', en: 'Button resource keys vs token overrides (lightweight styling)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionScopeTitle = useBilingual(i18n, SECTION_SCOPE_TITLE)
const sectionScopeCaption = useBilingual(i18n, SECTION_SCOPE_CAPTION)
const sectionThemeTitle = useBilingual(i18n, SECTION_THEME_TITLE)
const sectionThemeCaption = useBilingual(i18n, SECTION_THEME_CAPTION)
const staticLabel = useBilingual(i18n, STATIC_LABEL)
const themeLabel = useBilingual(i18n, THEME_LABEL)
const staticText = useBilingual(i18n, STATIC_TEXT)
const themeText = useBilingual(i18n, THEME_TEXT)
const recaptureLabel = useBilingual(i18n, RECAPTURE_LABEL)
const capturedLabel = useBilingual(i18n, CAPTURED_LABEL)
const sectionDictTitle = useBilingual(i18n, SECTION_DICT_TITLE)
const sectionDictCaption = useBilingual(i18n, SECTION_DICT_CAPTION)
const dictCardStringLabel = useBilingual(i18n, DICT_CARD_STRING_LABEL)
const dictImageNote = useBilingual(i18n, DICT_IMAGE_NOTE)
const sectionLwTitle = useBilingual(i18n, SECTION_LW_TITLE)
const sectionLwCaption = useBilingual(i18n, SECTION_LW_CAPTION)
const lwScopeTitle = useBilingual(i18n, LW_SCOPE_TITLE)
const lwPropTitle = useBilingual(i18n, LW_PROP_TITLE)
const docsMappingTitle = useBilingual(i18n, DOCS_MAPPING_TITLE)
const docsLibraryTitle = useBilingual(i18n, DOCS_LIBRARY_TITLE)
const docsLwTitle = useBilingual(i18n, DOCS_LW_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// ======================================================================
// 示例 1:资源三级作用域(官方 Xamlresources.txt 的嵌套 StackPanel)
// 资源值即官方示例值(演示内容本身,页面作用域声明,见 <style> 段注释):
// app: PrimaryColor #0078D4;page: HighlightBrush #A94DC1 / FontColor White;
// control: BackgroundColor #E2241A + x:String Description(经 content: var() 引用)。
// ======================================================================

// 资源键标注开关(选项面板):在每层显示消费点的 var(--key)
const showKeys = ref(false)

// ======================================================================
// 示例 2:StaticResource vs ThemeResource
// ThemeResource ↔ var();StaticResource ↔ 启动时捕获的值快照(getComputedStyle)。
// 官方示例键为 SolidBackgroundFillColorBaseBrush / TextFillColorPrimaryBrush,
// 均不在 theme.css 生成范围(见 wiki 差异节),此处取最近似的主题层 token:
// ApplicationPageBackgroundThemeBrush / ApplicationForegroundThemeBrush。
// ======================================================================
type SiteTheme = 'light' | 'dark'

const TOKEN_BACKGROUND = '--wui-application-page-background-theme'
const TOKEN_FOREGROUND = '--wui-application-foreground-theme'

function readToken(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value !== '' ? value : 'transparent'
}

// 「应用启动」时刻捕获一次(对应 XAML 解析 StaticResource 的时机)
const staticBackground = ref(readToken(TOKEN_BACKGROUND))
const staticForeground = ref(readToken(TOKEN_FOREGROUND))
const captureCount = ref(1)

function recaptureStaticResources(): void {
  staticBackground.value = readToken(TOKEN_BACKGROUND)
  staticForeground.value = readToken(TOKEN_FOREGROUND)
  captureCount.value += 1
}

const staticCardStyle = computed(() => ({
  background: staticBackground.value,
  color: staticForeground.value,
}))

// ======================================================================
// 示例 3:ThemeDictionaries(x:Key="Default"/"Dark" 双字典卡片)
// 颜色字典由 <style> 段的 CSS 声明承载;字符串字典(x:String)在 Web 无 var() 文本
// 等价物,用响应式常量 + 站点主题跟踪(SystemBackdropElementPage 同款 observer)承载。
// ======================================================================
function readSiteTheme(): SiteTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

const siteTheme = ref<SiteTheme>(readSiteTheme())
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

// 元素级强制主题(选项面板),对应 WinUI FrameworkElement.RequestedTheme
const dictTheme = ref<string | number | boolean>('auto')
const dictForce = computed<SiteTheme | null>(() => {
  if (dictTheme.value === 'light') return 'light'
  if (dictTheme.value === 'dark') return 'dark'
  return null
})
// 生效字典:强制优先,否则跟随站点主题 —— 决定 ThemeString 的值(x:String 资源)
const effectiveDictTheme = computed<SiteTheme>(() => dictForce.value ?? siteTheme.value)
const themeString = computed(() =>
  effectiveDictTheme.value === 'dark' ? 'Dark theme' : 'Light theme',
)
const dictCardClass = computed(() => ({
  'dict-light': dictForce.value === 'light',
  'dict-dark': dictForce.value === 'dark',
}))

// ======================================================================
// 示例 4:轻量样式 —— 容器 token 覆写(左列)与逐控件 prop 覆写(右列)
// 左列容器在 <style> 段重声明 --wui-button-* 为本库 AccentButton* token;
// 右列经 Button 的 background/foreground props(注入 --wui-button-local-*)。
// ======================================================================
const lwDisabled = ref(false)

// ======================================================================
// 下半区固定开发文档
// ======================================================================
const mappingHeaders = ['WinUI 概念', 'XAML 写法', 'Web 等价(本库)']
const mappingRows: (string | number)[][] = [
  ['ResourceDictionary', '<ResourceDictionary> + x:Key', 'CSS 自定义属性(theme.css 即生成的资源字典)'],
  ['资源键 x:Key', 'x:Key="ButtonBackground"', '变量名 --wui-button-background(kebab-case)'],
  ['资源引用', '{StaticResource Key} / {ThemeResource Key}', 'var(--key)(启动快照值 / 实时解析)'],
  ['资源查找顺序', '元素 → 页面 → 应用(最近优先)', 'CSS 层叠:子树重声明覆盖 :root,最近声明优先'],
  ['ThemeDictionaries', 'x:Key="Default"(浅)/ "Dark" 双字典', 'html[data-theme="light|dark"] 作用域各声明一套同名变量'],
  ['x:String 资源', '<x:String x:Key="ThemeString">', '无 var() 文本等价;用响应式常量 + 主题 observer(本页示例 3)'],
  ['轻量样式', '重声明控件资源键(ButtonBackground…)', '容器重声明 --wui-button-*(示例 4);组件另支持 --wui-button-local-* props'],
  ['C# 运行时读取', 'Resources["Key"]', 'getComputedStyle(el).getPropertyValue(--key)'],
]

const libraryHeaders = ['文件', '角色', '说明']
const libraryRows: (string | number)[][] = [
  ['src/styles/theme.css', '主题资源字典(生成产物)', '由 docs/temp/extract-tokens.mjs 从 generic.xaml 的 Light + Default(深)字典生成,约 3100+ 条 --wui-* token;浅/深两套值分别在 :root[data-theme="light"] 与 [data-theme="dark"] 作用域'],
  ['src/styles/theme-hooks.css', '系统色钩子与几何 token 默认值', 'theme.css 把 8 个 Windows 系统色(--wui-system-accent-color 等)留作未定义钩子,由本文件提供 WinUI 3 默认值(#0078D4 系);另提供 generic.xaml 提取范围外的几何 token(--wui-control-corner-radius: 4px ← ControlCornerRadius);应用可按 CSS 层叠覆盖'],
  ['src/styles/animations.css', '动画 token 与关键帧', '过渡/缓动 token(控件动画引用)'],
  ['src/styles/popup.css', '弹出层公共样式', 'Flyout/Popup 类共享的弹出层样式'],
]

const lwHeaders = ['WinUI 资源键(Button)', 'token(本库)', '本页覆写方式']
const lwRows: (string | number)[][] = [
  ['ButtonBackground', '--wui-button-background', '容器重声明为 var(--wui-accent-button-background)'],
  ['ButtonBackgroundPointerOver', '--wui-button-background-pointer-over', '容器重声明为 var(--wui-accent-button-background-pointer-over)'],
  ['ButtonBackgroundPressed', '--wui-button-background-pressed', '容器重声明为 var(--wui-accent-button-background-pressed)'],
  ['ButtonBackgroundDisabled', '--wui-button-background-disabled', '容器重声明为 var(--wui-accent-button-background-disabled)'],
  ['ButtonForeground(四态)', '--wui-button-foreground(-pointer-over/-pressed/-disabled)', '容器重声明为对应 --wui-accent-button-foreground-*'],
  ['逐控件直接赋值', '--wui-button-local-background / -foreground / -border', 'props(background / foreground / borderBrush)注入,仅作用 Normal 态'],
]

const usageCode = `<!-- WinUI:资源定义在 ResourceDictionary,引用用 StaticResource / ThemeResource -->
<Page.Resources>
  <SolidColorBrush x:Key="HighlightBrush" Color="#A94DC1" />
</Page.Resources>
<StackPanel Background="{StaticResource HighlightBrush}">
  <TextBlock Text="{ThemeResource ThemeString}" />
</StackPanel>

<!-- Web(本库):CSS 自定义属性即资源字典,var() 即 ThemeResource -->
<div class="demo-page-scope"><!-- 等价 Page.Resources -->
  <StackPanel background="var(--highlight-brush)">
    <TextBlock :text="themeString" /><!-- x:String 资源:响应式常量 -->
  </StackPanel>
</div>

<!-- 轻量样式:容器重声明控件 token,容器内全部 Button 换 accent -->
<div class="accent-scope">
  <WuiButton content="Button" />
  <WuiButton content="Disabled" disabled />
</div>
<style>
.accent-scope {
  --wui-button-background: var(--wui-accent-button-background);
  --wui-button-foreground: var(--wui-accent-button-foreground);
}
</style>`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="XamlResources">
    <template #demo>
      <div class="xr-page" :class="{ 'show-keys': showKeys }">
        <!-- 示例 1:资源三级作用域 -->
        <div class="guide-section">
          <p class="section-caption">{{ sectionScopeTitle }}</p>
          <p class="section-hint">{{ sectionScopeCaption }}</p>
          <!-- app 级资源挂页面根容器(真实应用挂 :root):PrimaryColor -->
          <div class="res-tree">
            <div class="res-level res-app">
              <span class="res-tag">app 级({{ '{StaticResource PrimaryColor}' }})</span>
              <span class="res-chip">var(--demo-app-primary-color)</span>
              <p class="res-text">Using application-level resources</p>
              <!-- page 级资源挂示例容器:HighlightBrush / FontColor -->
              <div class="res-level res-page">
                <span class="res-tag">page 级(Page.Resources)</span>
                <span class="res-chip">--demo-page-highlight-brush / --demo-page-font-color</span>
                <p class="res-text">Using page-level resources</p>
                <!-- control 级资源挂目标元素:BackgroundColor + x:String Description -->
                <div class="res-level res-control">
                  <span class="res-tag">control 级(元素 Resources)· x:String</span>
                  <span class="res-chip">--demo-control-background-color / --demo-control-description</span>
                  <span class="res-chip">{{ '{ StaticResource Description }' }}</span>
                  <p class="res-text res-description"></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 示例 2:StaticResource vs ThemeResource -->
        <div class="guide-section">
          <p class="section-caption">{{ sectionThemeTitle }}</p>
          <p class="section-hint">{{ sectionThemeCaption }}</p>
          <div class="res-compare">
            <!-- StaticResource 卡:样式绑定启动时捕获的值快照,主题切换不更新 -->
            <div class="res-card" :style="staticCardStyle">
              <span class="res-card-label">{{ staticLabel }}</span>
              <p class="res-card-text">{{ staticText }}</p>
            </div>
            <!-- ThemeResource 卡:类内用 var(),随 html[data-theme] 即时更新 -->
            <div class="res-card res-card--theme">
              <span class="res-card-label">{{ themeLabel }}</span>
              <p class="res-card-text">{{ themeText }}</p>
            </div>
          </div>
          <div class="res-captured">
            <WuiTextBlock :text="capturedLabel" class="captured-label" />
            <code class="res-chip-value">page-background = {{ staticBackground }}</code>
            <code class="res-chip-value">foreground = {{ staticForeground }}</code>
            <WuiButton :content="recaptureLabel" @click="recaptureStaticResources" />
            <code class="res-chip-value">captured × {{ captureCount }}</code>
          </div>
        </div>

        <!-- 示例 3:ThemeDictionaries 双字典卡片 -->
        <div class="guide-section">
          <p class="section-caption">{{ sectionDictTitle }}</p>
          <p class="section-hint">{{ sectionDictCaption }}</p>
          <div class="dict-demo">
            <div class="theme-dict-card" :class="dictCardClass">
              <p class="dict-title">{{ themeString }}</p>
              <span class="dict-swatch" aria-hidden="true"></span>
              <p class="dict-note">{{ dictImageNote }}</p>
            </div>
            <div class="dict-side">
              <WuiTextBlock :text="dictCardStringLabel" />
              <code class="res-chip-value">{{ themeString }}</code>
              <p class="dict-side-hint">
                默认字典键:Default / Dark 字典键:Dark · 选项面板可按元素级 RequestedTheme 强制
              </p>
            </div>
          </div>
        </div>

        <!-- 示例 4:轻量样式(token 覆写) -->
        <div class="guide-section">
          <p class="section-caption">{{ sectionLwTitle }}</p>
          <p class="section-hint">{{ sectionLwCaption }}</p>
          <div class="lw-grid">
            <!-- 左列:容器 token 覆写(.lw-accent-scope 重声明 Button 资源) -->
            <section class="lw-cell">
              <header class="lw-cell-title">{{ lwScopeTitle }}</header>
              <div class="lw-accent-scope">
                <div class="lw-row">
                  <WuiButton content="Button" :disabled="lwDisabled" />
                  <WuiButton content="Disabled" disabled />
                </div>
                <code class="res-chip">--wui-button-background: var(--wui-accent-button-background)</code>
                <code class="res-chip">--wui-button-foreground: var(--wui-accent-button-foreground)</code>
              </div>
            </section>
            <!-- 右列:逐控件覆写(props → --wui-button-local-*) -->
            <section class="lw-cell">
              <header class="lw-cell-title">{{ lwPropTitle }}</header>
              <div class="lw-row">
                <WuiButton
                  content="Prop override"
                  background="var(--wui-system-accent-color-dark-1)"
                  foreground="var(--wui-accent-button-foreground)"
                  :disabled="lwDisabled"
                />
                <WuiButton content="Default" :disabled="lwDisabled" />
              </div>
              <code class="res-chip">background → --wui-button-local-background</code>
              <code class="res-chip">仅 Normal 态;悬停/按下仍走主题(与 WinUI 一致)</code>
            </section>
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="卡片主题字典(元素级 RequestedTheme)" type="select" v-model="dictTheme" :options="[
          { label: 'Auto(跟随站点)', value: 'auto' },
          { label: 'Light(强制 Default 字典)', value: 'light' },
          { label: 'Dark(强制 Dark 字典)', value: 'dark' },
        ]" />
        <DemoOptionRow label="显示资源键标注(示例 1/4 消费点)" type="toggle" v-model="showKeys" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsMappingTitle }}</h4>
      <DemoDocsTable :headers="mappingHeaders" :rows="mappingRows" />
      <h4 class="docs-subtitle">{{ docsLibraryTitle }}</h4>
      <DemoDocsTable :headers="libraryHeaders" :rows="libraryRows" />
      <h4 class="docs-subtitle">{{ docsLwTitle }}</h4>
      <DemoDocsTable :headers="lwHeaders" :rows="lwRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="xml" />
    </template>
  </DemoPage>
</template>

<style scoped>
/* ======================================================================
 * 页面级「资源字典」声明
 * 示例 1 的资源值为官方示例原文(演示内容本身,非主题 token):
 * PrimaryColor #0078D4(HighlightBrush #A94DC1 / FontColor #FFF / BackgroundColor #E2241A)
 * 挂载层级刻意与官方三级作用域一一对应:app 级在本页根容器(真实应用应为 :root)。
 * ====================================================================== */
.xr-page {
  /* 「app 级」资源:PrimaryColor */
  --demo-app-primary-color: #0078d4;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
}

.guide-section {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  padding-bottom: 20px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.guide-section:last-child {
  border-bottom: none;
}

.section-caption {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.section-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.res-chip,
.res-chip-value {
  align-self: flex-start;
  padding: 1px 8px;
  font-family: Consolas, monospace;
  font-size: 11px;
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-list-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  overflow-wrap: anywhere;
}

/* 资源键标注(示例 1 消费点 / 示例 4 token 名)默认隐藏,showKeys 开关显示 */
.res-chip {
  display: none;
}

.show-keys .res-chip {
  display: inline-block;
}

/* 数值类 chip(示例 2 捕获值 / 示例 3 ThemeString)始终可见 */
.res-chip-value {
  display: inline-block;
}

/* —— 示例 1:三级作用域嵌套面板(对照官方嵌套 StackPanel:Padding 8 / Margin 8 / 圆角 4) —— */
.res-tree {
  display: flex;
  justify-content: center;
  width: 100%;
}

.res-level {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: min(420px, 100%);
  padding: 8px;
  margin: 8px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.res-app {
  background: var(--demo-app-primary-color);
}

/* 「page 级」资源:HighlightBrush / FontColor */
.res-page {
  --demo-page-highlight-brush: #a94dc1;
  --demo-page-font-color: #ffffff;
  background: var(--demo-page-highlight-brush);
}

/* 「control 级」资源:BackgroundColor + x:String Description(经 content: var() 引用) */
.res-control {
  --demo-control-background-color: #e2241a;
  --demo-control-description: 'Using control-level resources';
  background: var(--demo-control-background-color);
}

.res-tag {
  font-size: 11px;
  color: var(--demo-page-font-color, #ffffff);
  opacity: 0.75;
}

.res-text {
  margin: 0;
  color: var(--demo-page-font-color, #ffffff);
}

.res-app .res-text {
  font-size: 24px;
}

.res-page > .res-text {
  font-size: 18px;
}

.res-description {
  min-height: 1em;
  font-size: 14px;
}

/* 字符串资源:x:String 经 CSS content 引用(control 级资源消费点) */
.res-description::after {
  content: var(--demo-control-description);
}

/* —— 示例 2:StaticResource vs ThemeResource —— */
.res-compare {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}

@media (max-width: 900px) {
  .res-compare {
    grid-template-columns: 1fr;
  }
}

.res-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* ThemeResource 卡:var() 实时解析,随 html[data-theme] 切换
   (官方键 SolidBackgroundFillColorBaseBrush / TextFillColorPrimaryBrush 不在 theme.css,
   取最近似主题层 token,见 wiki 差异节) */
.res-card--theme {
  background: var(--wui-application-page-background-theme);
  color: var(--wui-application-foreground-theme);
}

.res-card-label {
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
}

.res-card-text {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
}

.res-captured {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.captured-label {
  font-size: var(--wui-tool-tip-content-theme-font-size);
}

/* —— 示例 3:ThemeDictionaries 双字典卡片 —— */
.dict-demo {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
}

@media (max-width: 720px) {
  .dict-demo {
    flex-direction: column;
  }
}

/* 卡片自持双字典:Default(浅色默认)与 Dark 各声明一套同名变量 */
.theme-dict-card {
  /* x:Key="Default"(浅色):官方示例值 */
  --demo-sample-background-brush: #eeeeee;
  --demo-sample-text-brush: #333333;
  /* ImageSource 资源的色板替代 */
  --demo-sample-image-tint: #b4b4b4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: min(420px, 100%);
  padding: 16px;
  background: var(--demo-sample-background-brush);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* x:Key="Dark":html[data-theme] 切到 dark 时同名变量取 Dark 字典值 */
html[data-theme='dark'] .theme-dict-card {
  --demo-sample-background-brush: #333333;
  --demo-sample-text-brush: #eeeeee;
  --demo-sample-image-tint: #4a4a4a;
}

/* 元素级 RequestedTheme 强制(选项面板):两种站点主题下都保持更高优先级 */
html[data-theme] .theme-dict-card.dict-light,
html[data-theme='dark'] .theme-dict-card.dict-light {
  --demo-sample-background-brush: #eeeeee;
  --demo-sample-text-brush: #333333;
  --demo-sample-image-tint: #b4b4b4;
}

html[data-theme] .theme-dict-card.dict-dark {
  --demo-sample-background-brush: #333333;
  --demo-sample-text-brush: #eeeeee;
  --demo-sample-image-tint: #4a4a4a;
}

.dict-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--demo-sample-text-brush);
}

.dict-swatch {
  width: 100%;
  height: 56px;
  background: var(--demo-sample-image-tint);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.dict-note {
  margin: 0;
  font-size: 12px;
  color: var(--demo-sample-text-brush);
  opacity: 0.8;
}

.dict-side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.dict-side-hint {
  margin: 0;
  max-width: 320px;
  font-size: 12px;
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 示例 4:轻量样式(容器 token 覆写) —— */
.lw-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}

@media (max-width: 900px) {
  .lw-grid {
    grid-template-columns: 1fr;
  }
}

.lw-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.lw-cell-title {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

.lw-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 轻量样式:容器内重声明 Button 资源键 → 本库 AccentButton* token
   (取值即 WinUI AccentButtonStyle;悬停/按下资源一并对齐,状态完整) */
.lw-accent-scope {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  --wui-button-background: var(--wui-accent-button-background);
  --wui-button-background-pointer-over: var(--wui-accent-button-background-pointer-over);
  --wui-button-background-pressed: var(--wui-accent-button-background-pressed);
  --wui-button-background-disabled: var(--wui-accent-button-background-disabled);
  --wui-button-foreground: var(--wui-accent-button-foreground);
  --wui-button-foreground-pointer-over: var(--wui-accent-button-foreground-pointer-over);
  --wui-button-foreground-pressed: var(--wui-accent-button-foreground-pressed);
  --wui-button-foreground-disabled: var(--wui-accent-button-foreground-disabled);
}

/* —— 文档区 —— */
.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
