<script setup lang="ts">
// XamlStylesPage.vue —— XAML Style / ControlTemplate 体系教学页(对照官方示例:
// CK/WinUI-Gallery/WinUIGallery/Samples/XamlStyles/XamlStylesPage.xaml + 两个 .txt)。
// 官方两个示例:keyed style(创建并应用 Style:默认/样式化/样式化+局部覆盖)与
// implicit style(无 key 隐式样式自动作用于作用域内全部目标类型)。Web 等价物:
// Style ↔ class + scoped CSS;x:Key + {StaticResource} ↔ class 引用;implicit style ↔
// 作用域选择器(:deep());Setter ↔ CSS 声明/局部 token 覆写;BasedOn ↔ 基础样式继承
// (class 组合);默认样式(generic.xaml)↔ 组件内 scoped 样式;ControlTemplate ↔ 组件
// 模板(DOM + slot);局部值优先于 Style ↔ inline 级 --wui-button-local-* 优先于 class。
import { computed, ref } from 'vue'
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
const PAGE_TITLE: BilingualText = { zh: 'Style(XAML 样式)', en: 'Style (XAML Styles)' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'XAML 样式是一组可复用的属性值集合,可应用到多个控件:定义一次、处处复用,保持全应用观感一致,避免逐控件重复设置。样式与资源一样分应用/页面/控件三级;带 x:Key 的样式显式应用,不带 key 的隐式样式自动作用于作用域内该类型的全部控件。Web 侧的对应物是 class + scoped CSS,控件默认样式则对应本库组件内嵌的 scoped 样式(theme.css token)。',
  en: 'A XAML style is a reusable set of property values applied to multiple controls: define once, reuse everywhere, and keep the app consistent. Styles live at the app/page/control level like resources; keyed styles apply explicitly while implicit styles apply automatically to every control of a type in scope. The web counterparts are classes plus scoped CSS, and default styles correspond to the scoped styles embedded in this library components (theme.css tokens).',
}
const SECTION_KEYED_TITLE: BilingualText = {
  zh: '创建并应用样式(keyed style)',
  en: 'Creating and applying a style (keyed style)',
}
const SECTION_KEYED_CAPTION: BilingualText = {
  zh: '对照官方 XamlStylesCreatingApplyingStyle.txt:CustomButtonStyle BasedOn 默认按钮样式,Setter 只覆写 Background(accent acrylic)与 MinWidth=200;第三个按钮在样式之外直接赋局部值(SystemFillColorCriticalBackground),局部值优先于样式。Web 复刻:.demo-custom-button-style 类重声明 Button 的 Normal 态 token(悬停/按下仍走主题,与仅设 Background 属性的 WinUI 行为一致)+ min-width;局部值经 background prop 注入 --wui-button-local-*,inline 优先于 class,与 WinUI「局部值 > Style」一致。',
  en: 'Mirrors the official sample: CustomButtonStyle is BasedOn the default button style and its Setters override only Background (accent acrylic) and MinWidth=200; the third button assigns a local value on top of the style (SystemFillColorCriticalBackground), and local wins over style. Web replica: the .demo-custom-button-style class redeclares the button normal-state tokens (hover/pressed still come from the theme, matching WinUI when only Background is set) plus min-width; the local value goes through the background prop into --wui-button-local-*, and inline beats class — the same "local > style" precedence as WinUI.',
}
const BTN_DEFAULT_LABEL: BilingualText = { zh: '默认按钮(组件默认样式)', en: 'Default button (component default style)' }
const BTN_STYLED_LABEL: BilingualText = { zh: '样式化按钮(Style 生效)', en: 'Styled button (style applied)' }
const BTN_OVERRIDDEN_LABEL: BilingualText = { zh: '样式化 + 局部覆盖(局部值优先)', en: 'Styled + overridden (local wins)' }
const SECTION_IMPLICIT_TITLE: BilingualText = {
  zh: '隐式样式(无 key,自动应用)',
  en: 'Implicit style (no key, applied automatically)',
}
const SECTION_IMPLICIT_CAPTION: BilingualText = {
  zh: '对照官方 XamlStylesStyleWithoutKeyImplicit.txt:不带 x:Key 的 Style 按 TargetType 自动作用于作用域内该类型全部控件(FontSize 16 / Consolas / Bold)。Web 复刻:作用域容器上的选择器样式 —— .implicit-scope :deep(.wui-textblock),容器内全部 WuiTextBlock 自动生效,容器外不受影响;用选项面板开关观察作用域边界。',
  en: 'Mirrors the official sample: a Style without x:Key applies automatically to every control of its TargetType in scope (FontSize 16 / Consolas / Bold). Web replica: a scoped selector on the container — .implicit-scope :deep(.wui-textblock) — styles every WuiTextBlock inside and nothing outside; toggle it from the options panel to see the scope boundary.',
}
const IMPLICIT_IN_LABEL: BilingualText = { zh: '作用域内(隐式样式自动生效)', en: 'Inside scope (implicit style applies)' }
const IMPLICIT_OUT_LABEL: BilingualText = { zh: '作用域外(不受影响)', en: 'Outside scope (unaffected)' }
const IMPLICIT_IN_TEXT: BilingualText = { zh: 'This style is applied automatically!', en: 'This style is applied automatically!' }
const IMPLICIT_OUT_TEXT: BilingualText = { zh: 'No need to set a key.', en: 'No need to set a key.' }
const DOCS_MAPPING_TITLE: BilingualText = { zh: 'WinUI 样式体系 ↔ Web 等价映射', en: 'WinUI style system vs web equivalents' }
const DOCS_LAYER_TITLE: BilingualText = { zh: '本库控件样式的三层定制路径', en: 'Three layers to customize control styles in this library' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionKeyedTitle = useBilingual(i18n, SECTION_KEYED_TITLE)
const sectionKeyedCaption = useBilingual(i18n, SECTION_KEYED_CAPTION)
const btnDefaultLabel = useBilingual(i18n, BTN_DEFAULT_LABEL)
const btnStyledLabel = useBilingual(i18n, BTN_STYLED_LABEL)
const btnOverriddenLabel = useBilingual(i18n, BTN_OVERRIDDEN_LABEL)
const sectionImplicitTitle = useBilingual(i18n, SECTION_IMPLICIT_TITLE)
const sectionImplicitCaption = useBilingual(i18n, SECTION_IMPLICIT_CAPTION)
const implicitInLabel = useBilingual(i18n, IMPLICIT_IN_LABEL)
const implicitOutLabel = useBilingual(i18n, IMPLICIT_OUT_LABEL)
const implicitInText = useBilingual(i18n, IMPLICIT_IN_TEXT)
const implicitOutText = useBilingual(i18n, IMPLICIT_OUT_TEXT)
const docsMappingTitle = useBilingual(i18n, DOCS_MAPPING_TITLE)
const docsLayerTitle = useBilingual(i18n, DOCS_LAYER_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// ======================================================================
// 示例 1:keyed style —— Style 开关(等价移除/恢复 Style 属性)
// 官方三按钮:Default / Styled(Background accent acrylic + MinWidth 200)/
// Styled + overridden(局部 Background = SystemFillColorCriticalBackground)。
// ======================================================================
const explicitStyleOn = ref(true)
const styledClass = computed(() => ({
  'demo-custom-button-style': explicitStyleOn.value,
}))

// ======================================================================
// 示例 2:implicit style —— 作用域开关(等价移除/恢复 StackPanel.Resources)
// ======================================================================
const implicitStyleOn = ref(true)

// ======================================================================
// 下半区固定开发文档
// ======================================================================
const mappingHeaders = ['WinUI 概念', 'XAML 写法', 'Web 等价(本库)']
const mappingRows: (string | number)[][] = [
  ['Style', '<Style x:Key="CustomButtonStyle" TargetType="Button">', 'class(.demo-custom-button-style)+ scoped CSS'],
  ['Setter', '<Setter Property="Background" Value="…" />', 'CSS 声明;配色类 Setter 落为控件 token 覆写(Normal 态)'],
  ['显式应用', 'Style="{StaticResource CustomButtonStyle}"', '在控件上挂同名 class'],
  ['隐式样式', '<Style TargetType="TextBlock">(无 key)', '作用域选择器:.implicit-scope :deep(.wui-textblock)'],
  ['BasedOn', 'BasedOn="{StaticResource DefaultButtonStyle}"', 'class 组合继承(基础样式类 + 定制类)'],
  ['TargetType 约束', 'TargetType="Button"', '选择器目标(.wui-button / .wui-textblock)'],
  ['默认样式', 'generic.xaml 的隐式 Style + ControlTemplate', '组件内 scoped 样式(wui-button 等类,消费 --wui-* token)'],
  ['ControlTemplate', '<ControlTemplate TargetType="Button">…', '组件模板 = DOM 结构 + slot(WinUI 无「换模板」的直接等价,深度定制走组合组件)'],
  ['TemplateBinding', 'TemplateBinding Background', 'props / CSS 变量(--wui-button-local-*、容器 token 覆写)'],
  ['VisualState', '<VisualState x:Name="PointerOver">', '伪类(:hover / :active / :disabled / :focus-visible)'],
  ['局部值优先', 'Style + 本地 Background(本地赢)', 'inline(--wui-button-local-*)> class 覆写 > 默认样式'],
]

const layerHeaders = ['层级', '做法', '适用场景', '等价 WinUI']
const layerRows: (string | number)[][] = [
  ['1. 容器 token 覆写', '父容器重声明 --wui-button-* 等控件 token', '成批换肤(主题/区块级),零组件改动', '轻量样式(重声明资源键)'],
  ['2. 控件 props', 'background / foreground / cornerRadius 等逐控件传入', '单个控件微调(注入 --wui-button-local-*)', '直接设置控件属性'],
  ['3. 组合新组件', '以 slot/封装组件重组控件与结构', '需要改结构(等价换 ControlTemplate)时', '自定义 ControlTemplate / 用户控件'],
]

const usageCode = `<!-- WinUI:keyed style + Setter,隐式样式按 TargetType 自动应用 -->
<StackPanel.Resources>
  <Style x:Key="CustomButtonStyle" TargetType="Button">
    <Setter Property="Background" Value="{ThemeResource AccentFillColorDefaultBrush}" />
    <Setter Property="MinWidth" Value="200" />
  </Style>
  <Style TargetType="TextBlock">
    <Setter Property="FontSize" Value="16" />
  </Style>
</StackPanel.Resources>
<Button Style="{StaticResource CustomButtonStyle}" Content="Styled" />
<Button Style="{StaticResource CustomButtonStyle}" Content="Overridden" Background="…" />

<!-- Web(本库):class 即 keyed style,作用域选择器即隐式样式 -->
<Button class="demo-custom-button-style" content="Styled" />
<Button class="demo-custom-button-style" content="Overridden" background="var(--critical-bg)" />

<style scoped>
.demo-custom-button-style {
  --wui-button-background: var(--wui-accent-acrylic-fill); /* Setter: Background */
  min-width: 200px;                                        /* Setter: MinWidth */
}
.implicit-scope :deep(.wui-textblock) {                     /* 隐式样式作用域 */
  font-size: 16px;
  font-family: Consolas, monospace;
  font-weight: 700;
}
</style>`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="xs-page">
        <!-- 示例 1:keyed style -->
        <div class="guide-section">
          <p class="section-caption">{{ sectionKeyedTitle }}</p>
          <p class="section-hint">{{ sectionKeyedCaption }}</p>
          <div class="style-list">
            <!-- 默认按钮:仅组件默认样式(generic.xaml 隐式样式的等价物) -->
            <div class="style-row">
              <span class="style-tag">{{ btnDefaultLabel }}</span>
              <WuiButton content="Default button" />
            </div>
            <!-- 样式化按钮:.demo-custom-button-style = Setter(Background accent acrylic + MinWidth 200) -->
            <div class="style-row">
              <span class="style-tag">{{ btnStyledLabel }}</span>
              <WuiButton content="Styled button" :class="styledClass" />
            </div>
            <!-- 样式化 + 局部覆盖:background prop(inline)优先于 class,与 WinUI 局部值 > Style 一致 -->
            <div class="style-row">
              <span class="style-tag">{{ btnOverriddenLabel }}</span>
              <WuiButton content="Styled button (overridden)" :class="styledClass" background="var(--demo-critical-background)" />
            </div>
          </div>
        </div>

        <!-- 示例 2:implicit style -->
        <div class="guide-section">
          <p class="section-caption">{{ sectionImplicitTitle }}</p>
          <p class="section-hint">{{ sectionImplicitCaption }}</p>
          <div class="implicit-grid">
            <!-- 作用域内:.implicit-scope 的 :deep() 选择器自动命中全部 WuiTextBlock -->
            <section class="implicit-cell" :class="{ 'implicit-scope': implicitStyleOn }">
              <header class="implicit-label">{{ implicitInLabel }}</header>
              <WuiTextBlock :text="implicitInText" />
              <WuiTextBlock :text="implicitOutText" />
            </section>
            <!-- 作用域外:同一组控件,无隐式样式 -->
            <section class="implicit-cell">
              <header class="implicit-label">{{ implicitOutLabel }}</header>
              <WuiTextBlock :text="implicitInText" />
              <WuiTextBlock :text="implicitOutText" />
            </section>
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="显式 Style 生效(按钮 2/3 的 class)" type="toggle" v-model="explicitStyleOn" />
        <DemoOptionRow label="隐式 Style 生效(TextBlock 作用域)" type="toggle" v-model="implicitStyleOn" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsMappingTitle }}</h4>
      <DemoDocsTable :headers="mappingHeaders" :rows="mappingRows" />
      <h4 class="docs-subtitle">{{ docsLayerTitle }}</h4>
      <DemoDocsTable :headers="layerHeaders" :rows="layerRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="xml" />
    </template>
  </DemoPage>
</template>

<style scoped>
.xs-page {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 100%;
  /* 页面级「样式资源」:两个演示资源值(非主题 token,来源见 wiki 差异节)
     AccentAcrylicBackgroundFillColorDefaultBrush:AcrylicBrush(TintColor = SystemAccentColorLight3/Dark1),
     Web 无 acrylic,取 FallbackColor 等价值(theme-hooks.css 的系统色钩子派生);
     SystemFillColorCriticalBackground:Common_themeresources_any.xaml L288(浅 #FDE7E9)/L84(深 #442726) */
  --demo-accent-acrylic-fill: var(--wui-system-accent-color-light-3);
  --demo-critical-background: #fde7e9;
}

/* Dark 字典:html[data-theme] 切换作用域取 Dark 字典值 */
html[data-theme='dark'] .xs-page {
  --demo-accent-acrylic-fill: var(--wui-system-accent-color-dark-1);
  --demo-critical-background: #442726;
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

/* —— 示例 1:keyed style —— */
.style-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(480px, 100%);
  margin: 0 auto;
}

.style-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.style-tag {
  font-size: 11px;
  color: var(--wui-application-secondary-foreground-theme);
}

/* keyed style 的 Web 等价物:CustomButtonStyle 的两个 Setter。
   BasedOn 默认样式:本库组件默认样式天然继承(类只覆写 Setter 声明的属性);
   Background Setter 只覆 Normal 态 token,悬停/按下仍走主题 —— 与 WinUI
   「Style 设 Background 属性、VisualState 动画仍接管状态色」行为一致。 */
.demo-custom-button-style {
  --wui-button-background: var(--demo-accent-acrylic-fill);
  min-width: 200px;
}

/* —— 示例 2:implicit style —— */
.implicit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}

@media (max-width: 720px) {
  .implicit-grid {
    grid-template-columns: 1fr;
  }
}

.implicit-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.implicit-label {
  font-size: 11px;
  color: var(--wui-application-secondary-foreground-theme);
}

/* 隐式样式的 Web 等价物:无 key 的 <Style TargetType="TextBlock"> ↔ 作用域内
   类型选择器。选项面板移除 .implicit-scope 即恢复无样式对照。 */
.implicit-scope :deep(.wui-textblock) {
  font-size: 16px;
  font-family: Consolas, 'Courier New', monospace;
  font-weight: 700;
}

/* —— 文档区 —— */
.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
