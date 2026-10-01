<script setup lang="ts">
// Templates 示例页:WinUI 模板指南(对照官方 WinUI Gallery TemplatesPage.xaml)。
// 官方页的三个示例 —— ComboBox ItemTemplate(DataTemplate)、ListView ItemsPanel 切换
// (ItemsPanelTemplate)、自定义 TextBox ControlTemplate —— 与 DataTemplateSelector 模式,
// 在 Web 端的等价物分别是:#item 作用域插槽、换用不同布局容器组件、组件封装/CSS 皮肤、
// 插槽内按数据字段条件渲染(v-if 链 / <component :is> 动态组件)。
// 本页全部使用已入库组件(ListView / GridView / ComboBox)+ #item 插槽复刻官方效果:
//   - ComboBox 圆点项模板 = TemplatesCustomizeComboboxItemtemplateDatatemplate.txt;
//   - Teams 对象数组的卡片模板 = 官方 ListView 数据模板示例(Teams 数据)复刻
//     (CK 快照未含该示例文件,字段按经典 WinUI Gallery Teams 数据:division/name/win/loss);
//   - 布局切换 = TemplatesCustomizeItemscontrolItemspaneltemplate.txt(WrapGrid ↔ StackPanel,20 项);
//   - 选择器 = ItemsRepeater MixedTypeCollection 的 StringOrIntTemplateSelector 模式,
//     换为按 kind 字段在 联系人/团队 两种模板间切换,并支持强制固定模板观察错配表现。
// 结构照抄已通过 QA 的 ListViewPage 母版(上半区演示 + 参数面板,下半区文档)。
import { computed, ref } from 'vue'
import WuiComboBox from '@/components/ComboBox.vue'
import WuiGridView from '@/components/GridView.vue'
import WuiListView from '@/components/ListView.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Templates(模板)', en: 'Templates' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI 模板指南页:ControlTemplate / DataTemplate / ItemsPanelTemplate 三类模板与 Web 的等价实现——用已入库 ListView / GridView / ComboBox 的 #item 插槽复刻官方 DataTemplate 效果,并演示按数据字段切换模板的 DataTemplateSelector 等价写法。上半区为交互演示,下半区为概念映射文档。',
  en: 'WinUI templates guide: how ControlTemplate / DataTemplate / ItemsPanelTemplate map to the web — official DataTemplate demos rebuilt with the #item slot of the bundled ListView / GridView / ComboBox, plus a DataTemplateSelector equivalent that switches templates by a data field. Interactive demos above, concept mapping docs below.',
}
const GROUP_TYPES: BilingualText = { zh: '三类模板(WinUI 概念)', en: 'Three kinds of templates (WinUI concepts)' }
const GROUP_COMBO: BilingualText = { zh: 'DataTemplate:ComboBox 圆点项模板(官方示例复刻)', en: 'DataTemplate: ComboBox dot item template (official sample)' }
const GROUP_TEAMS: BilingualText = { zh: 'DataTemplate:Teams 对象数组的卡片模板(官方 ListView 模板示例复刻)', en: 'DataTemplate: card templates for a Teams object array (official ListView sample)' }
const GROUP_SELECTOR: BilingualText = { zh: 'DataTemplateSelector:按数据字段切换模板', en: 'DataTemplateSelector: switch template by a data field' }
const GROUP_PANEL: BilingualText = { zh: 'ItemsPanelTemplate:布局面板切换(WrapGrid ↔ StackPanel,官方示例复刻)', en: 'ItemsPanelTemplate: switch the layout panel (WrapGrid ↔ StackPanel, official sample)' }
const INTRO_PLACEMENT: BilingualText = {
  zh: '模板可定义在应用、页面或控件级(同样式与资源),按作用域与复用需求决定放置位置;Web 端对应两个层级:组件内部默认插槽内容(控件级)与页面里的具名插槽 / 子组件(页面级、可复用)。',
  en: 'Templates can be defined at app, page, or control level (like styles and resources); the scope decides placement. On the web this maps to two levels: fallback slot content inside a component (control level) and named slots / child components on the page (page level, reusable).',
}
const TYPE_CONTROL: BilingualText = {
  zh: 'ControlTemplate — 重定义控件的结构(视觉树)。Web 等价:组件封装 + CSS 皮肤(本库每个 WuiXxx.vue 的内部模板即一份 generic.xaml ControlTemplate 的 Web 版)。',
  en: 'ControlTemplate — redefines the structure (visual tree) of a control. Web equivalent: component wrapping + CSS skin (each WuiXxx.vue in this library is the web counterpart of one generic.xaml ControlTemplate).',
}
const TYPE_DATA: BilingualText = {
  zh: 'DataTemplate — 改变 ComboBox / ListView 等控件中单个数据项的呈现。Web 等价:#item 作用域插槽(插槽 props: item / index)。',
  en: 'DataTemplate — changes how individual items render in a ComboBox / ListView. Web equivalent: the #item scoped slot (slot props: item / index).',
}
const TYPE_PANEL: BilingualText = {
  zh: 'ItemsPanelTemplate — 定义项集合的布局面板(如 StackPanel / WrapGrid)。Web 等价:布局容器(flex / grid),本库以 ListView(栈式)与 GridView(换行网格)承载。',
  en: 'ItemsPanelTemplate — defines the layout panel of the item collection (StackPanel / WrapGrid). Web equivalent: a layout container (flex / grid); here ListView (stacked) and GridView (wrapping grid) carry it.',
}
const TEAMS_HINT: BilingualText = {
  zh: '对象数组按字段渲染成卡片:插槽作用域 item 的任意字段都能参与呈现(胜率由 win/loss 现算),也能在模板内 v-if 条件渲染——每组第一队多渲染一条分组横幅。',
  en: 'The object array renders as cards: any field on the slot scope item can drive the markup (win rate is computed from win/loss), and v-if inside the template can conditionally render — the first team of each division also gets a division banner.',
}
const SELECTOR_HINT: BilingualText = {
  zh: '右侧切换「选择器规则」:Auto 按 kind 字段自动返回模板(等价 SelectTemplateCore);Fixed 强制使用其中一个模板——模板定字段,数据不匹配时该模板读取的字段渲染为空,这正是模板选错时的表现。',
  en: 'Switch "selector rule" on the right: Auto returns a template from the kind field (equivalent to SelectTemplateCore); Fixed forces one template — the template decides which fields to read, so mismatched data renders those fields empty, exactly what a wrong template pick looks like.',
}
const PANEL_HINT: BilingualText = {
  zh: '同一份 20 项数据,两种 ItemsPanel:StackPanel(垂直栈)→ WuiListView,WrapGrid(横向换行)→ WuiGridView。',
  en: 'Same 20 items, two ItemsPanels: StackPanel (vertical stack) → WuiListView, WrapGrid (wrapping) → WuiGridView.',
}
const LABEL_SELECTOR_RULE: BilingualText = { zh: '选择器规则(SelectTemplateCore)', en: 'Selector rule (SelectTemplateCore)' }
const LABEL_PANEL: BilingualText = { zh: '列表面板(ItemsPanel)', en: 'Items panel' }
const LABEL_BANNER: BilingualText = { zh: 'Teams 分组横幅(模板内 v-if)', en: 'Teams division banner (v-if in template)' }
const LABEL_SELECTED: BilingualText = { zh: '选中', en: 'Selected' }
const DOCS_MAPPING_TITLE: BilingualText = { zh: 'WinUI 模板 ↔ Web 等价物', en: 'WinUI templates ↔ web equivalents' }
const DOCS_SLOT_TITLE: BilingualText = { zh: '#item 插槽契约(本库已入库组件)', en: '#item slot contract (bundled components)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupTypes = useBilingual(i18n, GROUP_TYPES)
const groupCombo = useBilingual(i18n, GROUP_COMBO)
const groupTeams = useBilingual(i18n, GROUP_TEAMS)
const groupSelector = useBilingual(i18n, GROUP_SELECTOR)
const groupPanel = useBilingual(i18n, GROUP_PANEL)
const introPlacement = useBilingual(i18n, INTRO_PLACEMENT)
const typeControl = useBilingual(i18n, TYPE_CONTROL)
const typeData = useBilingual(i18n, TYPE_DATA)
const typePanel = useBilingual(i18n, TYPE_PANEL)
const teamsHint = useBilingual(i18n, TEAMS_HINT)
const selectorHint = useBilingual(i18n, SELECTOR_HINT)
const panelHint = useBilingual(i18n, PANEL_HINT)
const labelSelectorRule = useBilingual(i18n, LABEL_SELECTOR_RULE)
const labelPanel = useBilingual(i18n, LABEL_PANEL)
const labelBanner = useBilingual(i18n, LABEL_BANNER)
const labelSelected = useBilingual(i18n, LABEL_SELECTED)
const docsMappingTitle = useBilingual(i18n, DOCS_MAPPING_TITLE)
const docsSlotTitle = useBilingual(i18n, DOCS_SLOT_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// 胜/负单位(随语言切换)
const UNIT_WIN: BilingualText = { zh: '胜', en: 'W' }
const UNIT_LOSS: BilingualText = { zh: '负', en: 'L' }
const UNIT_RATE: BilingualText = { zh: '胜率', en: 'Win rate' }
const DIVISION_SUFFIX: BilingualText = { zh: '组', en: 'Division' }
const TEAM_BADGE: BilingualText = { zh: '队', en: 'T' }
const unitWin = useBilingual(i18n, UNIT_WIN)
const unitLoss = useBilingual(i18n, UNIT_LOSS)
const unitRate = useBilingual(i18n, UNIT_RATE)
const divisionSuffix = useBilingual(i18n, DIVISION_SUFFIX)
const teamBadge = useBilingual(i18n, TEAM_BADGE)

/* -------------------------------------------------------------------------
 * 演示一:DataTemplate —— ComboBox 圆点项模板
 * (对照官方 TemplatesCustomizeComboboxItemtemplateDatatemplate:
 *  StackPanel(Ellipse 8px accent 圆点 + 文本),SelectedIndex=0)
 * ---------------------------------------------------------------------- */
const comboOptions = ['Option 1', 'Option 2', 'Option 3']
const comboIndex = ref(0)
const comboEcho = computed(() => {
  const index = comboIndex.value
  return index >= 0 && index < comboOptions.length ? comboOptions[index] : '—'
})

/* -------------------------------------------------------------------------
 * 演示二:DataTemplate —— Teams 对象数组渲染成卡片
 * (字段按经典 WinUI Gallery Teams 数据:division / name / win / loss)
 * ---------------------------------------------------------------------- */
interface Team {
  division: string
  name: string
  win: number
  loss: number
}
const teams: Team[] = [
  { division: 'A', name: 'Contoso Reds', win: 12, loss: 4 },
  { division: 'A', name: 'Fabrikam Blues', win: 9, loss: 7 },
  { division: 'B', name: 'Adventure Works', win: 11, loss: 5 },
  { division: 'B', name: 'Northwind Traders', win: 7, loss: 9 },
  { division: 'C', name: 'Tailspin Toys', win: 6, loss: 10 },
  { division: 'C', name: 'Fourth Coffee', win: 10, loss: 6 },
]

/** 插槽 item(unknown)→ Team(运行时兜底,模板里可直接取字段)。 */
function teamOf(item: unknown): Team {
  return typeof item === 'object' && item !== null
    ? (item as Team)
    : { division: '', name: '', win: 0, loss: 0 }
}

/** 胜率:win/(win+loss),总场次为 0 时显示 —。 */
function winRate(team: Team): string {
  const total = team.win + team.loss
  return total > 0 ? `${Math.round((team.win / total) * 100)}%` : '—'
}

/** 分组横幅:每组(division)第一队返回 true(模板内 v-if 用)。 */
function isDivisionStart(index: number): boolean {
  const previous = index > 0 ? teams[index - 1] : undefined
  return previous === undefined || previous.division !== teamOf(teams[index]).division
}

// 分组横幅开关(DemoOptionRow 的 v-model 契约要求联合类型,见 demo/components/README.md)
const demoBanner = ref<string | number | boolean>(true)
const showBanner = computed(() => demoBanner.value === true)

const teamsSelected = ref<unknown[]>([])
const teamsEcho = computed(() =>
  teamsSelected.value.length === 0 ? '—' : teamsSelected.value.map((entry) => teamOf(entry).name).join(', '),
)

function onTeamsSelectionChanged(selected: unknown[]): void {
  teamsSelected.value = selected
}

/* -------------------------------------------------------------------------
 * 演示三:DataTemplateSelector —— 按数据字段切换模板
 * (对照官方 ItemsRepeater MixedTypeCollection 的 StringOrIntTemplateSelector:
 *  按 item 类型返回不同 DataTemplate;Web 端等价 = 纯函数返回模板种类 + 插槽内 v-if 分支,
 *  或 <component :is> 动态组件,见下方用法代码与 wiki)
 * ---------------------------------------------------------------------- */
interface RosterContact {
  kind: 'contact'
  name: string
  title: string
}
interface RosterTeam {
  kind: 'team'
  name: string
  win: number
  loss: number
}
type RosterEntry = RosterContact | RosterTeam
/** 插槽分支可返回的模板种类(模板定字段:每种模板读取自己的字段)。 */
type TemplateKind = 'contact' | 'team'

const roster: RosterEntry[] = [
  { kind: 'contact', name: 'Mikael Nystrom', title: 'Contoso, Ltd.' },
  { kind: 'team', name: 'Contoso Reds', win: 12, loss: 4 },
  { kind: 'contact', name: 'Toni Poe', title: 'Fabrikam, Inc.' },
  { kind: 'team', name: 'Adventure Works', win: 11, loss: 5 },
  { kind: 'contact', name: 'Joaquin Kemp', title: 'Adventure Works' },
  { kind: 'team', name: 'Fourth Coffee', win: 10, loss: 6 },
]

/** 选择器规则:auto = 按 kind 字段选择(等价 SelectTemplateCore);fixed-contact / fixed-team = 强制固定模板。 */
type SelectorRule = 'auto' | 'fixed-contact' | 'fixed-team'
const demoRule = ref<string | number | boolean>('auto')
const ruleValue = computed<SelectorRule>(() => {
  const value = String(demoRule.value)
  return value === 'fixed-contact' || value === 'fixed-team' ? value : 'auto'
})

/** DataTemplateSelector 的 Web 等价:按规则返回模板种类(插槽内按返回值 v-if 分支)。 */
function selectTemplate(item: unknown, rule: SelectorRule): TemplateKind {
  if (rule !== 'auto') return rule === 'fixed-contact' ? 'contact' : 'team'
  return typeof item === 'object' && item !== null && (item as RosterEntry).kind === 'team'
    ? 'team'
    : 'contact'
}

/** 读取 item 上的字段;非对象或字段缺失返回 undefined(由调用方决定回退)。 */
function templateField(item: unknown, field: string): unknown {
  if (typeof item !== 'object' || item === null) return undefined
  return (item as Record<string, unknown>)[field]
}

/** 主行:两种模板都以 name 为主行(两类数据都有该字段;非对象数据回退 String(item))。 */
function rosterName(item: unknown): string {
  if (typeof item !== 'object' || item === null) return String(item ?? '')
  const value = (item as Record<string, unknown>).name
  return value != null ? String(value) : ''
}

/**
 * 副行按「所选模板」读字段,而非按数据自身类型 —— 模板定字段:
 * contact 模板读 title,team 模板读 win/loss;数据缺该字段时渲染为空
 * (等价 WinUI 模板绑定失败留空)。刻意不做 kind 兜底,Fixed 规则强制
 * 模板时,错配数据的副行就是空串 —— 这正是「模板选错」的直观表现。
 */
function rosterSubtitle(item: unknown, template: TemplateKind): string {
  if (template === 'contact') {
    const title = templateField(item, 'title')
    return title != null ? String(title) : ''
  }
  const win = templateField(item, 'win')
  const loss = templateField(item, 'loss')
  if (win == null || loss == null) return ''
  return `${win} ${unitWin.value} · ${loss} ${unitLoss.value}`
}

/** 头像首字母(主行为空则返回空串,不抛错)。 */
function rosterInitial(item: unknown): string {
  return rosterName(item).slice(0, 1)
}

/* -------------------------------------------------------------------------
 * 演示四:ItemsPanelTemplate —— 布局面板切换
 * (对照官方 TemplatesCustomizeItemscontrolItemspaneltemplate:同一列表在
 *  WrapGrid(Orientation=Horizontal)与 StackPanel(Vertical)之间切换,共 20 项;
 *  Web 端等价 = 换用不同布局容器组件:GridView(换行网格)/ ListView(垂直栈))
 * ---------------------------------------------------------------------- */
const panelItems: string[] = Array.from({ length: 20 }, (_, index) => `Item ${String(index + 1).padStart(2, '0')}`)

type PanelKind = 'WrapGrid' | 'StackPanel'
const demoPanel = ref<string | number | boolean>('WrapGrid')
const panelValue = computed<PanelKind>(() => (String(demoPanel.value) === 'StackPanel' ? 'StackPanel' : 'WrapGrid'))

/* -------------------------------------------------------------------------
 * 下半区固定文档
 * ---------------------------------------------------------------------- */
const mappingHeaders = ['WinUI 模板', '作用', 'Web / Vue 等价物']
const mappingRows: (string | number)[][] = [
  ['DataTemplate / ItemTemplate', '定义集合控件中单个数据项的呈现', '#item 作用域插槽(slot props:item / index;GridView 额外给 selected)'],
  ['DataTemplateSelector', '按数据(类型/字段)返回不同模板', '插槽内 v-if / v-else-if 分支,或 <component :is> 动态组件(模板映射表)'],
  ['ItemsPanelTemplate', '定义项集合的布局面板(StackPanel / WrapGrid / UniformGridLayout…)', '布局容器:CSS flex / grid;本库以 WuiListView(栈式)与 WuiGridView(换行网格)承载'],
  ['ControlTemplate', '重定义控件自身的视觉树(结构 + 视觉状态)', '组件封装:内部模板 + scoped CSS(本库各 WuiXxx.vue 即 generic.xaml 模板的 Web 版);自定义皮肤 = 组合子组件或 CSS 覆写'],
  ['TemplateBinding / {Binding} / x:Bind', '模板内取数据与控件属性', '插槽作用域变量({{ item.xxx }})、props、ref'],
  ['StaticResource 引用模板 / 资源放置层级', 'app / page / control 三级定义与复用', '全局注册组件(应用级)/ 页面具名插槽(页面级)/ 组件 fallback 插槽内容(控件级)'],
]

const slotHeaders = ['组件', '#item slot 参数', '对应 WinUI']
const slotRows: (string | number)[][] = [
  ['WuiListView', "{ item: unknown; index: number }", 'ListView.ItemTemplate(DataTemplate)'],
  ['WuiGridView', "{ item: unknown; index: number; selected: boolean }", 'GridView.ItemTemplate(DataTemplate)'],
  ['WuiComboBox', "{ item: unknown; index: number }", 'ComboBox.ItemTemplate(DataTemplate)'],
]

const usageCode = `<!-- DataTemplate:官方 ComboBox 圆点项模板(#item 插槽) -->
<WuiComboBox :items="options" header="Options" v-model:selected-index="index">
  <template #item="{ item }">
    <span class="dot-item"><span class="dot" aria-hidden="true"></span>{{ item }}</span>
  </template>
</WuiComboBox>

<!-- DataTemplateSelector:按数据字段返回模板(等价 SelectTemplateCore) -->
<WuiListView :items="roster" display-member-path="name">
  <template #item="{ item }">
    <!-- 写法一:插槽内 v-if 分支(本页演示) -->
    <template v-if="selectTemplate(item) === 'contact'">…联系人卡片…</template>
    <template v-else>…团队卡片…</template>

    <!-- 写法二:动态组件 + 模板映射表(模板较多时更清晰) -->
    <!-- <component :is="templateMap[selectTemplate(item)]" :item="item" /> -->
  </template>
</WuiListView>

<!-- ItemsPanelTemplate:换布局容器(WrapGrid ↔ StackPanel) -->
<WuiGridView v-if="panel === 'WrapGrid'" :items="items" selection-mode="None" />
<WuiListView v-else :items="items" selection-mode="None" />`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Templates">
    <template #demo>
      <div class="templates-stage">
        <!-- 概念导语:三类模板(对照官方 TemplatesPage.xaml 的 RichTextBlock 导语) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupTypes }}</h3>
          <p class="intro-text">{{ introPlacement }}</p>
          <ul class="type-list">
            <li>{{ typeControl }}</li>
            <li>{{ typeData }}</li>
            <li>{{ typePanel }}</li>
          </ul>
        </section>

        <!-- 演示一:DataTemplate(ComboBox 圆点项模板) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupCombo }}</h3>
          <div class="demo-row">
            <WuiComboBox
              :items="comboOptions"
              header="Options"
              v-model:selected-index="comboIndex"
              style="width: 280px"
            >
              <template #item="{ item }">
                <span class="dot-item">
                  <span class="dot" aria-hidden="true"></span>
                  <span>{{ item }}</span>
                </span>
              </template>
            </WuiComboBox>
            <span class="demo-echo">{{ labelSelected }}: {{ comboEcho }}</span>
          </div>
        </section>

        <!-- 演示二:DataTemplate(Teams 对象数组 → 卡片) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupTeams }}</h3>
          <WuiListView
            :items="teams"
            selection-mode="Single"
            display-member-path="name"
            aria-label="球队列表"
            class="demo-list"
            style="width: 420px"
            @selection-changed="onTeamsSelectionChanged"
          >
            <template #item="{ item, index }">
              <span v-if="showBanner && isDivisionStart(index)" class="team-banner">
                {{ teamOf(item).division }} {{ divisionSuffix }}
              </span>
              <span class="team-card">
                <span class="team-chip" aria-hidden="true">{{ teamOf(item).division }}</span>
                <span class="team-text">
                  <span class="team-name">{{ teamOf(item).name }}</span>
                  <span class="team-meta">
                    {{ teamOf(item).win }} {{ unitWin }} · {{ teamOf(item).loss }} {{ unitLoss }} ·
                    {{ unitRate }} {{ winRate(teamOf(item)) }}
                  </span>
                </span>
              </span>
            </template>
          </WuiListView>
          <p class="demo-hint">{{ teamsHint }}</p>
          <span class="demo-echo">{{ labelSelected }}: {{ teamsEcho }}</span>
        </section>

        <!-- 演示三:DataTemplateSelector(按数据字段切换模板) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupSelector }}</h3>
          <WuiListView
            :items="roster"
            selection-mode="Single"
            display-member-path="name"
            aria-label="名册列表"
            class="demo-list"
            style="width: 420px"
          >
            <template #item="{ item }">
              <!-- selectTemplate = SelectTemplateCore 的 Web 等价:按规则返回模板种类;
                   模板定字段 —— 各分支按「所选模板」读字段(contact→title,team→win/loss),
                   数据缺该字段则渲染为空(等价 WinUI 模板绑定失败留空) -->
              <template v-if="selectTemplate(item, ruleValue) === 'contact'">
                <span class="roster-contact">
                  <span class="roster-avatar" aria-hidden="true">{{ rosterInitial(item) }}</span>
                  <span class="roster-text">
                    <span class="roster-name">{{ rosterName(item) }}</span>
                    <span class="roster-subtitle">{{ rosterSubtitle(item, 'contact') }}</span>
                  </span>
                </span>
              </template>
              <template v-else>
                <span class="roster-team">
                  <span class="roster-badge" aria-hidden="true">{{ teamBadge }}</span>
                  <span class="roster-text">
                    <span class="roster-name">{{ rosterName(item) }}</span>
                    <span class="roster-subtitle">{{ rosterSubtitle(item, 'team') }}</span>
                  </span>
                </span>
              </template>
            </template>
          </WuiListView>
          <p class="demo-hint">{{ selectorHint }}</p>
        </section>

        <!-- 演示四:ItemsPanelTemplate(布局面板切换) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupPanel }}</h3>
          <WuiGridView
            v-if="panelValue === 'WrapGrid'"
            :items="panelItems"
            selection-mode="None"
            aria-label="面板布局项网格"
            :item-width="160"
            :item-height="48"
            class="demo-panel demo-panel-grid"
            style="width: 520px"
          />
          <WuiListView
            v-else
            :items="panelItems"
            selection-mode="None"
            aria-label="面板布局项列表"
            class="demo-list"
            style="width: 350px; height: 320px"
          />
          <p class="demo-hint">{{ panelHint }}</p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          :label="labelSelectorRule"
          type="select"
          v-model="demoRule"
          :options="[
            { label: 'Auto (kind field)', value: 'auto' },
            { label: 'Fixed: Contact', value: 'fixed-contact' },
            { label: 'Fixed: Team', value: 'fixed-team' },
          ]"
        />
        <DemoOptionRow
          :label="labelPanel"
          type="select"
          v-model="demoPanel"
          :options="[
            { label: 'WrapGrid', value: 'WrapGrid' },
            { label: 'StackPanel', value: 'StackPanel' },
          ]"
        />
        <DemoOptionRow :label="labelBanner" type="toggle" v-model="demoBanner" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsMappingTitle }}</h3>
      <DemoDocsTable :headers="mappingHeaders" :rows="mappingRows" />
      <h3 class="docs-subtitle">{{ docsSlotTitle }}</h3>
      <DemoDocsTable :headers="slotHeaders" :rows="slotRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.templates-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
}

.demo-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.group-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* —— 概念导语 —— */
.intro-text {
  max-width: 720px;
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.type-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 760px;
  margin: 0;
  padding-left: 20px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.demo-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.demo-list {
  height: 400px;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.demo-echo {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-hint {
  max-width: 680px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示一:ComboBox 圆点项模板(官方:Ellipse 8px accent + 8px 间距)—— */
.dot-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dot {
  flex: none;
  width: 8px;
  height: 8px;
  background: var(--wui-system-accent-color);
  border-radius: 50%;
}

/* —— 演示二:Teams 卡片模板 —— */
.team-banner {
  display: block;
  width: 100%;
  padding: 3px 12px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-base-low);
  text-transform: uppercase;
}

.team-card {
  display: flex;
  align-items: center;
  padding: 6px 0;
}

.team-chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0 6px;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-system-accent-color);
  /* accent 15% 铺底(无对应 token,以 color-mix 从强调色派生,随主题切换) */
  background: color-mix(in srgb, var(--wui-system-accent-color) 15%, transparent);
  border-radius: 50%;
}

.team-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  margin-left: 6px;
}

.team-name {
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.team-meta {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示三:选择器的两种模板 —— */
.roster-contact,
.roster-team {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

.roster-avatar,
.roster-badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 0 6px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
}

.roster-avatar {
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-base-medium);
  border-radius: 50%;
}

.roster-badge {
  color: var(--wui-system-control-foreground-chrome-white);
  background: var(--wui-system-accent-color);
  border-radius: 4px;
}

.roster-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  margin-left: 6px;
}

.roster-name {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.roster-subtitle {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示四:WrapGrid 面板容器(官方示例 ScrollView 内 1px 边框)—— */
.demo-panel {
  max-height: 320px;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
