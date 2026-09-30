<script setup lang="ts">
// CompactSizingPage.vue —— 紧凑尺寸(Compact Sizing)设计指南页(对照官方示例:
// CK/WinUI-Gallery/WinUIGallery/Samples/CompactSizing/CompactSizingPage.xaml + SampleStandard/CompactSizingPage)。
// 官方示例以 RadioButtons 在 Standard / Compact 两页间切换(Compact 页引入
// DensityStyles/Compact.xaml 资源字典);本页以容器密度类 .wui-density-compact 复刻同一交互,
// 并排呈现标准/紧凑双列全控件对照,附密度资源对照表与各控件紧凑态支持清单。
import { computed, ref, watch } from 'vue'
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiAutoSuggestBox from '@/components/AutoSuggestBox.vue'
import WuiButton from '@/components/Button.vue'
import WuiCheckBox from '@/components/CheckBox.vue'
import WuiComboBox from '@/components/ComboBox.vue'
import WuiDatePicker from '@/components/DatePicker.vue'
import WuiListView from '@/components/ListView.vue'
import WuiMenuBar from '@/components/MenuBar.vue'
import WuiMenuBarItem from '@/components/MenuBarItem.vue'
import WuiPasswordBox from '@/components/PasswordBox.vue'
import WuiRadioButton from '@/components/RadioButton.vue'
import WuiSlider from '@/components/Slider.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import WuiTextBox from '@/components/TextBox.vue'
import WuiTimePicker from '@/components/TimePicker.vue'
import WuiTreeView from '@/components/TreeView.vue'
import type { TreeViewNode } from '@/components/TreeViewItem.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Compact Sizing(紧凑尺寸)', en: 'Compact Sizing' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '通过在应用、页面或控件级引入紧凑样式资源,创建更紧凑、更小型的应用。官方做法是合并 DensityStyles/Compact.xaml 资源字典;本页以容器密度类演示标准密度(高 40/32px)与紧凑密度(高 32/24px)的全控件对照。',
  en: 'Enable compact, smaller apps by adding a style resource at the app, page or control level. The official approach merges DensityStyles/Compact.xaml; this page demonstrates standard (40/32px) vs compact (32/24px) density side by side.',
}
const SECTION_FORM_TITLE: BilingualText = {
  zh: '官方示例对照:标准 / 紧凑切换',
  en: 'Official sample: standard / compact toggle',
}
const SECTION_FORM_CAPTION: BilingualText = {
  zh: '对照官方 SampleStandardSizingPage / SampleCompactSizingPage:同一组表单(TextBox ×2、PasswordBox ×2、DatePicker)在两种密度下切换。官方 Compact 页还会把 TextBoxTopHeaderMargin 收窄为 0,2,0,2。',
  en: 'Mirrors SampleStandardSizingPage / SampleCompactSizingPage: the same form (TextBox x2, PasswordBox x2, DatePicker) switches between two densities. The official compact page also tightens TextBoxTopHeaderMargin to 0,2,0,2.',
}
const SECTION_COMPARE_TITLE: BilingualText = { zh: '双列全控件对照', en: 'Side-by-side control comparison' }
const SECTION_COMPARE_CAPTION: BilingualText = {
  zh: '左列为标准密度、右列为紧凑密度(容器挂 .wui-density-compact);两列共享同一组状态值,仅密度不同。字号 14px 在两种密度下保持不变(Compact.xaml 不缩字号)。',
  en: 'Left column is standard density, right column is compact density (container with .wui-density-compact); both columns share the same state, only density differs. The 14px font size stays unchanged (Compact.xaml does not shrink fonts).',
}
const SECTION_APPBAR_TITLE: BilingualText = {
  zh: 'AppBarButton 的 isCompact(单控件紧凑)',
  en: 'AppBarButton isCompact (per-control compact)',
}
const SECTION_APPBAR_CAPTION: BilingualText = {
  zh: 'AppBarButton 的 IsCompact 是与密度体系并行的另一套机制:隐藏文字标签、仅剩图标,用于 CommandBar 内。它不依赖 Compact.xaml,任何密度下都可用。',
  en: 'AppBarButton IsCompact is a separate mechanism from density styles: it hides the text label and keeps the icon only, for use inside a CommandBar. It does not rely on Compact.xaml and works under any density.',
}
const COL_STANDARD_TITLE: BilingualText = { zh: '标准密度(Standard)', en: 'Standard density' }
const COL_COMPACT_TITLE: BilingualText = { zh: '紧凑密度(Compact)', en: 'Compact density' }
const TODO_BADGE: BilingualText = { zh: '待办', en: 'TODO' }
const UNAFFECTED_BADGE: BilingualText = { zh: '不受影响', en: 'Unaffected' }
const DOCS_DENSITY_TITLE: BilingualText = { zh: '密度资源对照(Compact.xaml ↔ 标准主题)', en: 'Density resources (Compact.xaml vs standard theme)' }
const DOCS_SUPPORT_TITLE: BilingualText = { zh: '本站控件紧凑态支持清单', en: 'Compact support status in this library' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionFormTitle = useBilingual(i18n, SECTION_FORM_TITLE)
const sectionFormCaption = useBilingual(i18n, SECTION_FORM_CAPTION)
const sectionCompareTitle = useBilingual(i18n, SECTION_COMPARE_TITLE)
const sectionCompareCaption = useBilingual(i18n, SECTION_COMPARE_CAPTION)
const sectionAppbarTitle = useBilingual(i18n, SECTION_APPBAR_TITLE)
const sectionAppbarCaption = useBilingual(i18n, SECTION_APPBAR_CAPTION)
const colStandardTitle = useBilingual(i18n, COL_STANDARD_TITLE)
const colCompactTitle = useBilingual(i18n, COL_COMPACT_TITLE)
const todoBadge = useBilingual(i18n, TODO_BADGE)
const unaffectedBadge = useBilingual(i18n, UNAFFECTED_BADGE)
const docsDensityTitle = useBilingual(i18n, DOCS_DENSITY_TITLE)
const docsSupportTitle = useBilingual(i18n, DOCS_SUPPORT_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// ======================================================================
// 示例 1:官方示例对照(radio Standard / Compact 切换示例表单密度)
// ======================================================================
type SizingMode = 'Standard' | 'Compact'
const sizingMode = ref<SizingMode>('Standard')
const isCompactMode = computed(() => sizingMode.value === 'Compact')

// 示例 1 表单数据(与官方示例同名字段)
const firstName = ref('')
const lastName = ref('')
const password = ref('')
const confirmPassword = ref('')
const chosenDate = ref<Date | null>(null)

// 选项面板的 toggle 与示例区 radio 联动同一状态
const compactToggle = ref(false)
watch(
  () => sizingMode.value,
  (mode) => {
    compactToggle.value = mode === 'Compact'
  },
)
watch(compactToggle, (v) => {
  sizingMode.value = v ? 'Compact' : 'Standard'
})

// ======================================================================
// 示例 2:双列对照共享数据
// ======================================================================
const compareFirst = ref('Ada')
const compareSecret = ref('compact')
const suggestItems = ['Apples', 'Bananas', 'Cherries', 'Durian', 'Elderberry']
const comboItems = ['Apples', 'Bananas', 'Cherries']
const compareCombo = ref<unknown>(null)
const listItems = ['Item 1', 'Item 2', 'Item 3']
const compareListIndex = ref(-1)
const treeItems: TreeViewNode[] = [
  { label: 'Work', children: [{ label: 'Docs' }, { label: 'Images' }] },
  { label: 'Music', children: [{ label: 'Playlists' }] },
]
// 「不受密度影响」组的演示状态(Button / CheckBox / Slider 资源未被 Compact.xaml 覆盖)
const compareChecked = ref(true)
const compareSlider = ref(50)

// 尺寸标注开关(选项面板):显示每行目标高度徽标
const showBadges = ref(false)

// ======================================================================
// 下半区固定开发文档
// ======================================================================
// 密度资源对照:标准值取自 generic.xaml / 控件主题(TextBox 10,3,6,6、ListViewItem 40、
// ComboBox 12,5,0,7、TreeViewItem 28、NavigationViewItemOnLeft 36、HostPadding 0,3,0,6),
// 紧凑值取自 CK/WinUI-Reference/controls/dev/dll/DensityStyles/Compact.xaml。
const densityHeaders = ['资源键(ResourceKey)', '标准值', '紧凑值', '影响范围']
const densityRows: (string | number)[][] = [
  ['TextControlThemeMinHeight', '32', '24', 'TextBox / PasswordBox / AutoSuggestBox / ComboBox 等输入类宿主最小高度'],
  ['TextControlThemePadding', '10,3,6,6', '2,2,6,1', '同上(内容区内边距)'],
  ['ComboBoxMinHeight', '32', '24', 'ComboBox 关闭态最小高度'],
  ['ComboBoxPadding', '12,5,0,7', '12,1,0,3', 'ComboBox 关闭态内容内边距'],
  ['ComboBoxEditableTextPadding', '11,5,38,6', '10,0,30,0', '可编辑 ComboBox 文本内边距'],
  ['ListViewItemMinHeight', '40', '32', 'ListView 项 / AutoSuggestBox 候选行'],
  ['TreeViewItemMinHeight', '28', '24', 'TreeView 节点行'],
  ['DatePickerHostPadding', '0,3,0,6', '0,1,0,2', 'DatePicker 宿主按钮日期文本'],
  ['DatePickerHostMonthPadding', '9,3,0,6', '9,0,0,1', 'DatePicker 宿主按钮月份文本'],
  ['TimePickerHostPadding', '0,3,0,6', '0,1,0,2', 'TimePicker 宿主按钮时间文本'],
  ['NavigationViewItemOnLeftMinHeight', '36', '32', 'NavigationView 左侧导航项'],
  ['ControlContentThemeFontSize', '14', '14(不变)', '全部控件文本(紧凑密度不缩字号)'],
]

// 本站控件紧凑态支持清单(逐控件核对结论,待办项详见 wiki)
const supportHeaders = ['控件', '紧凑实现方式', '状态']
const supportRows: (string | number)[][] = [
  ['AppBarButton', 'isCompact prop(WinUI IsCompact:仅图标、隐藏标签,单控件机制)', '已支持'],
  ['TextBox / PasswordBox / AutoSuggestBox', '密度类 .wui-density-compact(本页演示;组件暂无 density prop)', '演示可用 / 待内置'],
  ['ComboBox', '密度类(高 32→24,内边距 12,5,0,7→12,1,0,3)', '演示可用 / 待内置'],
  ['ListView', '密度类(项高 40→32)', '演示可用 / 待内置'],
  ['TreeView', '密度类(节点行 28→24)', '演示可用 / 待内置'],
  ['DatePicker / TimePicker', '官方紧凑作用于宿主按钮;本站为常驻展开板、无宿主形态', '待办(形态差异)'],
  ['MenuBar', 'Compact.xaml 未提供 MenuBar 专属键(官方支持清单含 MenuBar)', '待办(需对照控件源核实)'],
  ['NavigationView', 'NavigationViewItemOnLeftMinHeight 36→32;组件未暴露密度开关', '待办'],
  ['Button / CheckBox / Slider / RadioButton 等', 'Compact.xaml 未覆盖其资源,标准密度下保持不变', '无需支持'],
]

// 用法代码:WinUI 原生写法(官方)与 Web 侧密度类写法并列
const usageCode = `<!-- WinUI 原生:在应用 / 页面 / 控件级引入紧凑密度资源字典 -->
<Page.Resources>
  <ResourceDictionary Source="ms-appx:///Microsoft.UI.Xaml/DensityStyles/Compact.xaml" />
</Page.Resources>

<!-- Web(本库):容器级密度类,容器内的输入类 / 列表类控件切换为紧凑密度 -->
<div class="wui-density-compact">
  <WuiTextBox header="First Name:" />
  <WuiPasswordBox header="Password:" />
  <WuiComboBox :items="['Apples', 'Bananas']" />
  <WuiListView :items="['Item 1', 'Item 2']" />
</div>

<!-- 单控件紧凑(独立于密度体系):AppBarButton 仅图标 -->
<WuiAppBarButton label="Save" is-compact />`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <!-- 示例 1:官方示例对照(radio 切换密度) -->
      <div class="guide-section">
        <p class="section-caption">{{ sectionFormTitle }}</p>
        <p class="section-hint">{{ sectionFormCaption }}</p>
        <div class="mode-radios" role="radiogroup" aria-label="Fluent Standard and Compact Sizing">
          <WuiRadioButton
            content="Standard"
            group-name="ControlSize"
            :checked="sizingMode === 'Standard'"
            @checked="sizingMode = 'Standard'"
          />
          <WuiRadioButton
            content="Compact"
            group-name="ControlSize"
            :checked="sizingMode === 'Compact'"
            @checked="sizingMode = 'Compact'"
          />
        </div>
        <div class="official-form" :class="{ 'wui-density-compact': isCompactMode }">
          <p class="form-header">{{ isCompactMode ? 'Compact Size' : 'Standard Size' }}</p>
          <WuiTextBox v-model:text="firstName" header="First Name:" placeholder-text="Enter your first name" />
          <WuiTextBox v-model:text="lastName" header="Last Name:" placeholder-text="Enter your last name" />
          <WuiPasswordBox v-model:text="password" header="Password:" />
          <WuiPasswordBox v-model:text="confirmPassword" header="Confirm Password:" />
          <WuiDatePicker v-model:date="chosenDate" header="Pick a date" />
        </div>
      </div>

      <!-- 示例 2:双列全控件对照(共享状态,左标准右紧凑) -->
      <div class="guide-section">
        <p class="section-caption">{{ sectionCompareTitle }}</p>
        <p class="section-hint">{{ sectionCompareCaption }}</p>
        <div class="compare-grid" :class="{ 'show-badges': showBadges }">
          <!-- 标准列 -->
          <section class="compare-col">
            <header class="col-title">{{ colStandardTitle }}</header>
            <div class="ctl-row">
              <div class="ctl-label">TextBox <span class="ctl-badge">min 32px</span></div>
              <WuiTextBox v-model:text="compareFirst" header="First Name:" placeholder-text="姓名" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">PasswordBox <span class="ctl-badge">min 32px</span></div>
              <WuiPasswordBox v-model:text="compareSecret" header="Password:" placeholder-text="密码" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">AutoSuggestBox <span class="ctl-badge">min 32px / 行 40px</span></div>
              <WuiAutoSuggestBox :items-source="suggestItems" header="Search:" placeholder-text="输入以筛选" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">ComboBox <span class="ctl-badge">min 32px</span></div>
              <WuiComboBox :items="comboItems" v-model:selected-item="compareCombo" header="Pick one:" placeholder-text="选择一项" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">ListView <span class="ctl-badge">项高 40px</span></div>
              <WuiListView :items="listItems" v-model:selected-index="compareListIndex" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">TreeView <span class="ctl-badge">节点行 28px</span></div>
              <WuiTreeView :items-source="treeItems" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">DatePicker / TimePicker <span class="ctl-badge">滚轮项 padding 0,3,0,6</span></div>
              <div class="picker-pair">
                <WuiDatePicker header="Date" />
                <WuiTimePicker header="Time" />
              </div>
            </div>
            <div class="ctl-row">
              <div class="ctl-label">MenuBar <span class="ctl-badge todo">{{ todoBadge }}</span></div>
              <WuiMenuBar>
                <WuiMenuBarItem title="File" />
                <WuiMenuBarItem title="Edit" />
              </WuiMenuBar>
            </div>
            <div class="ctl-row">
              <div class="ctl-label">Button / CheckBox / Slider <span class="ctl-badge unaffected">{{ unaffectedBadge }}</span></div>
              <div class="stack-row">
                <WuiButton content="Button" />
                <WuiCheckBox v-model:checked="compareChecked" content="CheckBox" />
              </div>
              <WuiSlider v-model="compareSlider" :minimum="0" :maximum="100" />
            </div>
          </section>

          <!-- 紧凑列(密度类生效) -->
          <section class="compare-col wui-density-compact">
            <header class="col-title">{{ colCompactTitle }}</header>
            <div class="ctl-row">
              <div class="ctl-label">TextBox <span class="ctl-badge">min 24px</span></div>
              <WuiTextBox v-model:text="compareFirst" header="First Name:" placeholder-text="姓名" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">PasswordBox <span class="ctl-badge">min 24px</span></div>
              <WuiPasswordBox v-model:text="compareSecret" header="Password:" placeholder-text="密码" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">AutoSuggestBox <span class="ctl-badge">min 24px / 行 32px</span></div>
              <WuiAutoSuggestBox :items-source="suggestItems" header="Search:" placeholder-text="输入以筛选" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">ComboBox <span class="ctl-badge">min 24px</span></div>
              <WuiComboBox :items="comboItems" v-model:selected-item="compareCombo" header="Pick one:" placeholder-text="选择一项" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">ListView <span class="ctl-badge">项高 32px</span></div>
              <WuiListView :items="listItems" v-model:selected-index="compareListIndex" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">TreeView <span class="ctl-badge">节点行 24px</span></div>
              <WuiTreeView :items-source="treeItems" />
            </div>
            <div class="ctl-row">
              <div class="ctl-label">DatePicker / TimePicker <span class="ctl-badge todo">{{ todoBadge }}</span></div>
              <div class="picker-pair">
                <WuiDatePicker header="Date" />
                <WuiTimePicker header="Time" />
              </div>
            </div>
            <div class="ctl-row">
              <div class="ctl-label">MenuBar <span class="ctl-badge todo">{{ todoBadge }}</span></div>
              <WuiMenuBar>
                <WuiMenuBarItem title="File" />
                <WuiMenuBarItem title="Edit" />
              </WuiMenuBar>
            </div>
            <div class="ctl-row">
              <div class="ctl-label">Button / CheckBox / Slider <span class="ctl-badge unaffected">{{ unaffectedBadge }}</span></div>
              <div class="stack-row">
                <WuiButton content="Button" />
                <WuiCheckBox v-model:checked="compareChecked" content="CheckBox" />
              </div>
              <WuiSlider v-model="compareSlider" :minimum="0" :maximum="100" />
            </div>
          </section>
        </div>
      </div>

      <!-- 示例 3:AppBarButton isCompact(单控件紧凑机制) -->
      <div class="guide-section">
        <p class="section-caption">{{ sectionAppbarTitle }}</p>
        <p class="section-hint">{{ sectionAppbarCaption }}</p>
        <div class="appbar-row">
          <WuiAppBarButton label="Save">
            <template #icon><WuiSymbolIcon symbol="Save" :font-size="16" /></template>
          </WuiAppBarButton>
          <WuiAppBarButton label="Save" is-compact>
            <template #icon><WuiSymbolIcon symbol="Save" :font-size="16" /></template>
          </WuiAppBarButton>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="紧凑密度(示例 1 表单,与 radio 联动)" type="toggle" v-model="compactToggle" />
        <DemoOptionRow label="显示尺寸标注(双列对照)" type="toggle" v-model="showBadges" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsDensityTitle }}</h4>
      <DemoDocsTable :headers="densityHeaders" :rows="densityRows" />
      <h4 class="docs-subtitle">{{ docsSupportTitle }}</h4>
      <DemoDocsTable :headers="supportHeaders" :rows="supportRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
/* —— 区块骨架 —— */
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

/* —— 示例 1:官方表单 —— */
.mode-radios {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.official-form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  max-width: 420px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.form-header {
  margin: 0;
  font-size: var(--wui-text-style-large-font-size);
  color: var(--wui-application-foreground-theme);
}

/* 官方示例 Standard 页 Spacing=16、Compact 页 Spacing=8:密度切换同时收紧行距 */
.official-form.wui-density-compact {
  gap: 8px;
}

/* —— 示例 2:双列对照 —— */
.compare-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

@media (max-width: 900px) {
  .compare-grid {
    grid-template-columns: 1fr;
  }
}

.compare-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 官方紧凑页 StackPanel Spacing=8(标准页 16):列内行距随密度收紧 */
.compare-col.wui-density-compact {
  gap: 8px;
}

.col-title {
  font-size: var(--wui-text-style-large-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.ctl-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ctl-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.ctl-badge {
  display: none;
  padding: 0 6px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  font-size: 10px;
  line-height: 16px;
  color: var(--wui-application-secondary-foreground-theme);
  white-space: nowrap;
}

.ctl-badge.todo {
  color: var(--wui-system-accent-color);
}

.show-badges .ctl-badge {
  display: inline-block;
}

.picker-pair {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stack-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* —— 示例 3:AppBarButton —— */
.appbar-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* —— 文档区 —— */
.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* ======================================================================
 * 紧凑密度覆盖类 .wui-density-compact(本页演示实现)
 * 每条覆盖对照 CK/WinUI-Reference/controls/dev/dll/DensityStyles/Compact.xaml:
 * 标准值见各控件组件内注释(TextControlThemePadding 10,3,6,6 等)。
 * 待组件内置 density 支持后,此演示类可提升为库级工具类(见 wiki 待办)。
 * ====================================================================== */

/* 输入类宿主:TextControlThemeMinHeight 32 → 24 */
.wui-density-compact :deep(.wui-text-box-border),
.wui-density-compact :deep(.wui-password-box-border),
.wui-density-compact :deep(.wui-auto-suggest-box-border),
.wui-density-compact :deep(.wui-combo-box-input) {
  min-height: 24px;
}

/* 输入类内容:TextControlThemePadding 10,3,6,6 → 2,2,6,1(CSS 顺序 top right bottom left) */
.wui-density-compact :deep(.wui-text-box-input),
.wui-density-compact :deep(.wui-password-box-input),
.wui-density-compact :deep(.wui-auto-suggest-box-input) {
  padding: 2px 6px 1px 2px;
}

/* 标头:官方紧凑页把 TextBoxTopHeaderMargin / PasswordBoxTopHeaderMargin 覆盖为 0,2,0,2 */
.wui-density-compact :deep(.wui-text-box-header),
.wui-density-compact :deep(.wui-password-box-header),
.wui-density-compact :deep(.wui-auto-suggest-box-header) {
  margin: 2px 0;
}

/* ComboBox 内容:ComboBoxPadding 12,5,0,7 → 12,1,0,3;下拉箭头列随最小高度收拢 */
.wui-density-compact :deep(.wui-combo-box-content) {
  padding: 1px 0 3px 12px;
}

/* 可编辑 ComboBox 文本:ComboBoxEditableTextPadding → 10,0,30,0(本站标准实现 10,3,30,5) */
.wui-density-compact :deep(.wui-combo-box-edit-text) {
  padding: 0 30px 0 10px;
}

.wui-density-compact :deep(.wui-combo-box-glyph) {
  margin: 6px 0;
}

/* 列表行:ListViewItemMinHeight 40 → 32(含 AutoSuggestBox 候选行) */
.wui-density-compact :deep(.wui-list-view-item),
.wui-density-compact :deep(.wui-auto-suggest-box-item) {
  min-height: 32px;
}

/* 树节点行:TreeViewItemMinHeight 28 → 24 */
.wui-density-compact :deep(.wui-treeview-item-row) {
  min-height: 24px;
}

/* 滚轮项内边距:DatePickerHostPadding / TimePickerHostPadding 0,3,0,6 → 0,1,0,2
   (注:官方未覆盖项高 DatePickerFlyoutPresenterItemHeight=40,本站滚轮项高保持 40,
   因此此项覆盖在本站常驻展开形态下视觉差异细微,详见 wiki) */
.wui-density-compact :deep(.wui-date-picker-item),
.wui-density-compact :deep(.wui-time-picker-item) {
  padding: 1px 0 2px;
}
</style>
