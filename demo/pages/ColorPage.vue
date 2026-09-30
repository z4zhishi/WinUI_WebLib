<script setup lang="ts">
// Color 颜色设计指南页(路由 /color 自动注册,📖 指南条目:本库没有名为 Color 的控件)。
// 对照官方 WinUI Gallery Color 页(CK/WinUI-Gallery/WinUIGallery/Samples/Color:画刷按语义
// 分组 + 明暗主题色卡)并基于本库 theme.css 真实 token 扩展:
//   1. 系统色钩子:theme-hooks.css 提供默认值的 8 个 var() 钩子(强调色可在子树覆盖演示);
//   2. 全量颜色 token 浏览:1547 个颜色 token 按 XAML 键前缀分控件家族,搜索 + 仅看明暗差异
//      过滤,每条含当前主题色块(随站点明暗切换)与浅/深两个字面值对照;
//   3. 数据零拷贝:token 数据经 demo/data/designTokens.ts 从 theme.css ?raw 源码运行时解析,
//      主题文件重生成后本页自动跟随,页面内不出现任何硬编码色值。
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'
import { SYSTEM_COLOR_HOOKS, WUI_COLOR_TOKENS } from '../data/designTokens'
import type { WuiToken } from '../data/designTokens'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Color(颜色)', en: 'Color' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '平衡的色彩设计带来清晰与美感协调。本页展示本库 theme.css 的全部颜色 token:WinUI 的画刷(Brush)经提取脚本转成 --wui-* CSS 变量,浅色/深色两套取值由 html[data-theme] 切换。系统强调色等 Windows 系统色留作钩子,由 theme-hooks.css 提供默认值。',
  en: 'Balanced color design creates clarity and aesthetic harmony. This page lists every color token in theme.css: WinUI brushes become --wui-* CSS variables with paired light/dark values switched via html[data-theme]. System colors (accent etc.) stay as var() hooks with defaults provided by theme-hooks.css.',
}
const SEC_HOOKS: BilingualText = { zh: '系统色钩子与强调色', en: 'System color hooks & accent' }
const HOOKS_GUIDE: BilingualText = {
  zh: '强调色(SystemAccentColor)与 Win32 高亮色等系统色由 Windows 提供,theme.css 不定义、以 var() 钩子引用(共 8 个,被 210+ 处画刷引用);theme-hooks.css 给出 WinUI 3 在 Windows 11 上的默认呈现值。应用按常规层叠规则在 :root 或任意子树重新声明同名变量即可覆盖——下方演示区即子树覆盖:切换后强调按钮、滑轨填充、超链接、开关覆层、复选勾、聚焦框全部跟随,因为它们都最终引用同一钩子。',
  en: 'System colors like SystemAccentColor are provided by Windows, so theme.css leaves them as var() hooks (8 total, referenced by 210+ brushes) with WinUI 3 defaults in theme-hooks.css. Apps override them by re-declaring the variable at :root or any subtree. The demo below overrides the hook on a subtree: the accent button, slider fill, hyperlink, toggle curtain, check mark and focus ring all follow, since they resolve to the same hook.',
}
const HOOKS_DEMO_CAPTION: BilingualText = {
  zh: '子树覆盖演示:容器上重声明 --wui-system-accent-color 后,一切引用强调色的 token 同步变化',
  en: 'Subtree override: re-declaring --wui-system-accent-color on the container updates every accent-referencing token',
}
const SEC_BROWSE: BilingualText = { zh: '全量颜色 token 浏览', en: 'Full color token catalog' }
const BROWSE_GUIDE: BilingualText = {
  zh: 'theme.css 的每个颜色 token 都按 XAML 键前缀归入控件家族(如 --wui-combo-box-* → ComboBox),家族内再按交互后缀取值:rest / pointer-over / pressed / disabled / selected / focused / checked。每行给出三个色块:当前主题(随站点明暗切换)、浅色字面值、深色字面值——浅深同值时标注「同值」。点击 token 名复制变量名;「仅看明暗差异」可滤掉两主题同值的画刷。',
  en: 'Every color token is grouped by its XAML key prefix into a control family (e.g. --wui-combo-box-* → ComboBox), then suffixed by interaction state: rest / pointer-over / pressed / disabled / selected / focused / checked. Each row shows three swatches: current theme (follows the site toggle), the literal light value and the literal dark value (marked when identical). Click a token name to copy it; the diff-only filter hides brushes that do not vary between themes.',
}
const BROWSE_PLACEHOLDER: BilingualText = { zh: '按名称搜索,如 combo-box / slider-track', en: 'Search by name, e.g. combo-box / slider-track' }
const COL_CURRENT: BilingualText = { zh: '当前主题', en: 'Current' }
const COL_LIGHT: BilingualText = { zh: '浅色(Light)', en: 'Light' }
const COL_DARK: BilingualText = { zh: '深色(Default)', en: 'Dark' }
const SAME_BADGE: BilingualText = { zh: '同值', en: 'same' }
const EXPAND_ALL: BilingualText = { zh: '展开全部', en: 'Expand all' }
const COLLAPSE_ALL: BilingualText = { zh: '收起全部', en: 'Collapse all' }
const EMPTY_HINT: BilingualText = { zh: '没有匹配的 token。', en: 'No tokens match.' }
const CAP_HINT_ZH = '匹配结果过多,已截断显示前 {CAP} 条,请细化搜索。'
const CAP_HINT_EN = 'Too many matches; showing the first {CAP}. Refine your search.'
const COPY_OK_ZH = '已复制'
const COPY_OK_EN = 'Copied'
const COPY_FAIL_ZH = '复制失败,请手动复制'
const COPY_FAIL_EN = 'Copy failed, please copy manually'
const OPT_SEARCH: BilingualText = { zh: '搜索(与演示区联动)', en: 'Search (shared with demo)' }
const OPT_DIFF: BilingualText = { zh: '仅看明暗有差异', en: 'Only theme-varying' }
const OPT_ACCENT: BilingualText = { zh: '强调色覆盖(演示区)', en: 'Accent override (demo)' }
const DOCS_NAMING_TITLE: BilingualText = { zh: '命名规则与明暗机制', en: 'Naming & theming mechanism' }
const DOCS_HOOKS_TITLE: BilingualText = { zh: '系统色钩子(theme-hooks.css 默认值)', en: 'System color hooks (defaults in theme-hooks.css)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const secHooks = useBilingual(i18n, SEC_HOOKS)
const hooksGuide = useBilingual(i18n, HOOKS_GUIDE)
const hooksDemoCaption = useBilingual(i18n, HOOKS_DEMO_CAPTION)
const secBrowse = useBilingual(i18n, SEC_BROWSE)
const browseGuide = useBilingual(i18n, BROWSE_GUIDE)
const browsePlaceholder = useBilingual(i18n, BROWSE_PLACEHOLDER)
const colCurrent = useBilingual(i18n, COL_CURRENT)
const colLight = useBilingual(i18n, COL_LIGHT)
const colDark = useBilingual(i18n, COL_DARK)
const sameBadge = useBilingual(i18n, SAME_BADGE)
const expandAllLabel = useBilingual(i18n, EXPAND_ALL)
const collapseAllLabel = useBilingual(i18n, COLLAPSE_ALL)
const emptyHint = useBilingual(i18n, EMPTY_HINT)
const optSearch = useBilingual(i18n, OPT_SEARCH)
const optDiff = useBilingual(i18n, OPT_DIFF)
const optAccent = useBilingual(i18n, OPT_ACCENT)
const docsNamingTitle = useBilingual(i18n, DOCS_NAMING_TITLE)
const docsHooksTitle = useBilingual(i18n, DOCS_HOOKS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// ======================================================================
// 系统色钩子 + 强调色子树覆盖演示
// ======================================================================
const ACCENT_CHOICES: { label: BilingualText; value: string; cssVar: string }[] = [
  { label: { zh: '默认(钩子缺省值)', en: 'Default (hook default)' }, value: 'default', cssVar: '' },
  { label: { zh: 'Accent Dark 1', en: 'Accent Dark 1' }, value: 'dark1', cssVar: 'var(--wui-system-accent-color-dark-1)' },
  { label: { zh: 'Accent Dark 3', en: 'Accent Dark 3' }, value: 'dark3', cssVar: 'var(--wui-system-accent-color-dark-3)' },
  { label: { zh: 'Accent Light 2', en: 'Accent Light 2' }, value: 'light2', cssVar: 'var(--wui-system-accent-color-light-2)' },
  { label: { zh: 'Highlight(Win32 选中色)', en: 'Highlight (Win32)' }, value: 'highlight', cssVar: 'var(--wui-system-color-highlight-color)' },
]
const accentChoice = ref<string | number | boolean>('default')
const accentChoiceOptions = computed(() =>
  ACCENT_CHOICES.map((choice) => ({ label: pickText(i18n, choice.label), value: choice.value })),
)

const accentStyle = computed<CSSProperties>(() => {
  const choice = ACCENT_CHOICES.find((item) => item.value === accentChoice.value)
  if (!choice || choice.cssVar === '') return {}
  return { '--wui-system-accent-color': choice.cssVar } as CSSProperties
})

// ======================================================================
// 全量颜色 token 分组浏览
// ======================================================================
/** 分组定义:按 XAML 键前缀归入控件家族;prefix 匹配「全等或其后紧跟 -」。 */
interface SectionDef {
  id: string
  prefix: string
  label: BilingualText
}

const SECTIONS: SectionDef[] = [
  { id: 'system-control', prefix: 'system-control', label: { zh: 'SystemControl 语义画刷(官方 Color 页的语义层)', en: 'SystemControl semantic brushes' } },
  { id: 'application', prefix: 'application', label: { zh: 'Application 应用级', en: 'Application level' } },
  { id: 'accent-button', prefix: 'accent-button', label: { zh: 'AccentButton 强调按钮', en: 'AccentButton' } },
  { id: 'accent', prefix: 'accent', label: { zh: 'Accent 其它强调画刷', en: 'Accent (other)' } },
  { id: 'hyperlink-button', prefix: 'hyperlink-button', label: { zh: 'HyperlinkButton 超链接按钮', en: 'HyperlinkButton' } },
  { id: 'hyperlink', prefix: 'hyperlink', label: { zh: 'Hyperlink 超链接', en: 'Hyperlink' } },
  { id: 'app-bar', prefix: 'app-bar', label: { zh: 'AppBar 应用栏', en: 'App bar' } },
  { id: 'auto-suggest', prefix: 'auto-suggest', label: { zh: 'AutoSuggestBox 自动建议', en: 'AutoSuggestBox' } },
  { id: 'back-button', prefix: 'back-button', label: { zh: 'BackButton 返回按钮', en: 'BackButton' } },
  { id: 'button', prefix: 'button', label: { zh: 'Button 按钮', en: 'Button' } },
  { id: 'calendar-view', prefix: 'calendar-view', label: { zh: 'CalendarView 日历视图', en: 'CalendarView' } },
  { id: 'calendar-date-picker', prefix: 'calendar-date-picker', label: { zh: 'CalendarDatePicker 日历日期选择器', en: 'CalendarDatePicker' } },
  { id: 'check-box', prefix: 'check-box', label: { zh: 'CheckBox 复选框', en: 'CheckBox' } },
  { id: 'close-button', prefix: 'close-button', label: { zh: 'CloseButton 关闭按钮', en: 'CloseButton' } },
  { id: 'combo-box', prefix: 'combo-box', label: { zh: 'ComboBox 组合框', en: 'ComboBox' } },
  { id: 'command-bar', prefix: 'command-bar', label: { zh: 'CommandBar 命令栏', en: 'CommandBar' } },
  { id: 'content-dialog', prefix: 'content-dialog', label: { zh: 'ContentDialog 内容对话框', en: 'ContentDialog' } },
  { id: 'content', prefix: 'content', label: { zh: 'Content 其它内容画刷', en: 'Content (other)' } },
  { id: 'date-time-picker', prefix: 'date-time-picker', label: { zh: 'DateTimePickerFlyout 日期时间飞出', en: 'DateTimePickerFlyout' } },
  { id: 'date-picker', prefix: 'date-picker', label: { zh: 'DatePicker 日期选择器', en: 'DatePicker' } },
  { id: 'time-picker', prefix: 'time-picker', label: { zh: 'TimePicker 时间选择器', en: 'TimePicker' } },
  { id: 'tree-view', prefix: 'tree-view', label: { zh: 'TreeView 树视图', en: 'TreeView' } },
  { id: 'tree', prefix: 'tree', label: { zh: 'Tree 其它', en: 'Tree (other)' } },
  { id: 'flip-view', prefix: 'flip-view', label: { zh: 'FlipView 翻转视图', en: 'FlipView' } },
  { id: 'flyout', prefix: 'flyout', label: { zh: 'Flyout 飞出层', en: 'Flyout' } },
  { id: 'focus-visual', prefix: 'focus-visual', label: { zh: 'FocusVisual 聚焦视觉', en: 'Focus visual' } },
  { id: 'grid-view', prefix: 'grid-view', label: { zh: 'GridView 网格视图', en: 'GridView' } },
  { id: 'hub', prefix: 'hub', label: { zh: 'Hub 中心控件', en: 'Hub' } },
  { id: 'ime-candidate', prefix: 'ime-candidate', label: { zh: 'IME 候选词窗口', en: 'IME candidate window' } },
  { id: 'jump-list', prefix: 'jump-list', label: { zh: 'JumpList 跳转列表', en: 'JumpList' } },
  { id: 'key-tip', prefix: 'key-tip', label: { zh: 'KeyTip 键提示', en: 'Key tip' } },
  { id: 'list-view', prefix: 'list-view', label: { zh: 'ListView 列表视图', en: 'ListView' } },
  { id: 'list-picker', prefix: 'list-picker', label: { zh: 'ListPicker 列表选择器', en: 'ListPicker' } },
  { id: 'list-box', prefix: 'list-box', label: { zh: 'ListBox 列表框', en: 'ListBox' } },
  { id: 'looping-selector', prefix: 'looping-selector', label: { zh: 'LoopingSelector 循环选择器', en: 'LoopingSelector' } },
  { id: 'media', prefix: 'media', label: { zh: 'Media 媒体传输控件', en: 'Media transport' } },
  { id: 'menu-flyout', prefix: 'menu-flyout', label: { zh: 'MenuFlyout 菜单飞出层', en: 'MenuFlyout' } },
  { id: 'menu-bar', prefix: 'menu-bar', label: { zh: 'MenuBar 菜单栏', en: 'MenuBar' } },
  { id: 'navigation-view', prefix: 'navigation-view', label: { zh: 'NavigationView 导航视图', en: 'NavigationView' } },
  { id: 'person-picture', prefix: 'person-picture', label: { zh: 'PersonPicture 头像', en: 'PersonPicture' } },
  { id: 'pivot', prefix: 'pivot', label: { zh: 'Pivot 透视页', en: 'Pivot' } },
  { id: 'popup', prefix: 'popup', label: { zh: 'Popup 弹出层', en: 'Popup' } },
  { id: 'radio-button', prefix: 'radio-button', label: { zh: 'RadioButton 单选按钮', en: 'RadioButton' } },
  { id: 'rating-control', prefix: 'rating-control', label: { zh: 'RatingControl 评分控件', en: 'RatingControl' } },
  { id: 'refresh', prefix: 'refresh', label: { zh: 'RefreshContainer 下拉刷新', en: 'Pull to refresh' } },
  { id: 'repeat-button', prefix: 'repeat-button', label: { zh: 'RepeatButton 重复按钮', en: 'RepeatButton' } },
  { id: 'scroll-bar', prefix: 'scroll-bar', label: { zh: 'ScrollBar 滚动条', en: 'ScrollBar' } },
  { id: 'scroll-viewer', prefix: 'scroll-viewer', label: { zh: 'ScrollViewer 滚动查看器', en: 'ScrollViewer' } },
  { id: 'semantic-zoom', prefix: 'semantic-zoom', label: { zh: 'SemanticZoom 语义缩放', en: 'SemanticZoom' } },
  { id: 'slider', prefix: 'slider', label: { zh: 'Slider 滑块', en: 'Slider' } },
  { id: 'split-button', prefix: 'split-button', label: { zh: 'SplitButton 拆分按钮', en: 'SplitButton' } },
  { id: 'split-view', prefix: 'split-view', label: { zh: 'SplitView 分屏视图', en: 'SplitView' } },
  { id: 'swipe', prefix: 'swipe', label: { zh: 'SwipeControl 轻扫控件', en: 'SwipeControl' } },
  { id: 'text-control', prefix: 'text-control', label: { zh: '文本输入(TextControl*:TextBox/PasswordBox 等)', en: 'Text input (TextControl*)' } },
  { id: 'text-box', prefix: 'text-box', label: { zh: 'TextBox 文本框(Theme 遗留键)', en: 'TextBox (legacy Theme keys)' } },
  { id: 'text-selection', prefix: 'text-selection', label: { zh: '文本选择', en: 'Text selection' } },
  { id: 'thumb', prefix: 'thumb', label: { zh: 'Thumb 拖拽块', en: 'Thumb' } },
  { id: 'toggle-button', prefix: 'toggle-button', label: { zh: 'ToggleButton 切换按钮', en: 'ToggleButton' } },
  { id: 'toggle-switch', prefix: 'toggle-switch', label: { zh: 'ToggleSwitch 开关', en: 'ToggleSwitch' } },
  { id: 'toggle-menu-flyout-item', prefix: 'toggle-menu-flyout-item', label: { zh: 'MenuFlyout 切换项', en: 'MenuFlyout toggle item' } },
  { id: 'toggle', prefix: 'toggle', label: { zh: 'Toggle 其它', en: 'Toggle (other)' } },
  { id: 'tool-tip', prefix: 'tool-tip', label: { zh: 'ToolTip 工具提示', en: 'ToolTip' } },
  { id: 'top-navigation-view', prefix: 'top-navigation-view', label: { zh: 'TopNavigationView 顶部导航', en: 'TopNavigationView' } },
  { id: 'window-caption', prefix: 'window-caption', label: { zh: 'WindowCaption 标题栏', en: 'Window caption' } },
  { id: 'window', prefix: 'window', label: { zh: 'Window 窗口(其它)', en: 'Window (other)' } },
  { id: 'color-picker', prefix: 'color-picker', label: { zh: 'ColorPicker 取色器', en: 'ColorPicker' } },
  { id: 'default-text', prefix: 'default', label: { zh: 'Default 默认文本', en: 'Default text' } },
]

/** 前缀匹配:名称全等,或以「prefix-」开头(保证按段对齐,不含 system-control 误配 system-controls 之类)。 */
function matchesPrefix(name: string, prefix: string): boolean {
  return name === prefix || name.startsWith(`${prefix}-`)
}

/** 基础分组:每个 token 落入首个命中的前缀组;未命中进「其他」兜底组(正常应为空)。 */
const GROUPS_BASE: { def: SectionDef; tokens: WuiToken[] }[] = (() => {
  const groups = SECTIONS.map((def) => ({ def, tokens: [] as WuiToken[] }))
  const other = { def: { id: 'other', prefix: '', label: { zh: '其他(未归类)', en: 'Other' } as BilingualText }, tokens: [] as WuiToken[] }
  for (const token of WUI_COLOR_TOKENS) {
    const group = groups.find((candidate) => matchesPrefix(token.name, candidate.def.prefix))
    if (group) group.tokens.push(token)
    else other.tokens.push(token)
  }
  return [...groups, other]
})()

interface TokenGroupView {
  id: string
  label: BilingualText
  total: number
  diffCount: number
  matchCount: number
  visible: WuiToken[]
  expanded: boolean
  truncated: boolean
}

// —— 过滤状态(DemoOptionRow 的 v-model 契约要求 string | number | boolean 联合类型)——
const query = ref<string | number | boolean>('')
const diffOnly = ref<string | number | boolean>(false)
/** 搜索命中上限:避免过宽关键词一次性渲染上千行。 */
const SEARCH_CAP = 400

const queryText = computed(() => String(query.value).trim().toLowerCase())

/** 全部分组 id(展开全部用)。 */
const ALL_GROUP_IDS = GROUPS_BASE.map((group) => group.def.id)
/** 展开的分组(仅浏览模式生效;过滤模式下有命中的组一律展开)。 */
const expandedIds = ref<string[]>(['application'])

function toggleGroup(id: string): void {
  if (expandedIds.value.includes(id)) {
    expandedIds.value = expandedIds.value.filter((existing) => existing !== id)
  } else {
    expandedIds.value = [...expandedIds.value, id]
  }
}

function expandAllGroups(): void {
  expandedIds.value = [...ALL_GROUP_IDS]
}

function collapseAllGroups(): void {
  expandedIds.value = []
}

const visibleGroups = computed<TokenGroupView[]>(() => {
  const q = queryText.value
  const onlyDiff = diffOnly.value === true
  const filtering = q !== '' || onlyDiff
  let capLeft = SEARCH_CAP
  const views = GROUPS_BASE.map(({ def, tokens }) => {
    const matched =
      q === '' && !onlyDiff
        ? tokens
        : tokens.filter(
            (token) =>
              (q === '' || token.cssVar.includes(q)) && (!onlyDiff || token.isThemeVarying),
          )
    const expanded = filtering ? matched.length > 0 : expandedIds.value.includes(def.id)
    const visible = capLeft > 0 ? matched.slice(0, capLeft) : []
    capLeft -= visible.length
    return {
      id: def.id,
      label: def.label,
      total: tokens.length,
      diffCount: tokens.filter((token) => token.isThemeVarying).length,
      matchCount: matched.length,
      visible,
      expanded,
      truncated: visible.length < matched.length,
    }
  })
  // 空 token 的前缀组(为覆盖兜底保留定义)与搜索无命中的组不渲染
  return views.filter((view) => view.total > 0 && (!filtering || view.matchCount > 0))
})

const shownCount = computed(() => visibleGroups.value.reduce((sum, group) => sum + group.visible.length, 0))
const diffTotal = computed(() => WUI_COLOR_TOKENS.filter((token) => token.isThemeVarying).length)

const summaryText = computed(() => {
  const isZh = i18n.locale.value.startsWith('zh')
  const head = isZh
    ? `共 ${WUI_COLOR_TOKENS.length} 个颜色 token · 浅深有差异 ${diffTotal.value} · 当前显示 ${shownCount.value}`
    : `${WUI_COLOR_TOKENS.length} color tokens · ${diffTotal.value} theme-varying · showing ${shownCount.value}`
  return head
})

const capHintText = computed(() => {
  const template = i18n.locale.value.startsWith('zh') ? CAP_HINT_ZH : CAP_HINT_EN
  return template.replace('{CAP}', String(SEARCH_CAP))
})

const isTruncated = computed(() => visibleGroups.value.some((group) => group.truncated))

// —— 点击 token 名复制 ——
const copyHint = ref('')
let copyTimer: number | undefined

async function copyTokenName(cssVar: string): Promise<void> {
  let ok = false
  try {
    await navigator.clipboard.writeText(cssVar)
    ok = true
  } catch {
    const area = document.createElement('textarea')
    area.value = cssVar
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    document.body.removeChild(area)
  }
  const isZh = i18n.locale.value.startsWith('zh')
  copyHint.value = ok ? `${isZh ? COPY_OK_ZH : COPY_OK_EN} ${cssVar}` : isZh ? COPY_FAIL_ZH : COPY_FAIL_EN
  if (copyTimer !== undefined) window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copyHint.value = ''
  }, 2000)
}

// ======================================================================
// 下半区固定开发文档
// ======================================================================
const DOCS_NAMING_HEADERS = ['机制', '说明']
const DOCS_NAMING_ROWS: (string | number)[][] = [
  ['命名规则', 'XAML 画刷键去掉结尾 Brush 后转 kebab-case:ComboBoxBackgroundBrush → --wui-combo-box-background;状态后缀保留(pointer-over / pressed / disabled / selected / focused / checked)'],
  ['明暗机制', 'theme.css 在 :root[data-theme="light"] 与 :root[data-theme="dark"] 两套字典定义同名变量,由站点写 html[data-theme] 切换;不含 prefers-color-scheme 媒体查询'],
  ['系统色钩子', 'SystemAccentColor 等系统色 theme.css 不定义、以 var(--wui-system-accent-color) 等 8 个钩子引用;theme-hooks.css 提供默认值,应用可按层叠规则覆盖'],
  ['透明度', 'XAML SolidColorBrush 的 Opacity 与颜色 AA 通道相乘合成,以 #RRGGBBAA 表示;系统色钩子带透明度时以 color-mix(in srgb, …, transparent) 表示'],
  ['提取来源', 'CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 的 Light 与 Default(深色)ThemeDictionaries,由 docs/temp/extract-tokens.mjs 生成(勿手改)'],
  ['与官方 Color 页差异', '官方页展示的 106 个 Fluent 画刷(TextFillColorPrimaryBrush 等)定义于发行版 Common_themeresources_any.xaml,不在本 generic.xaml 提取范围内,故本库以 SystemControl* 语义层 + 各控件家族画刷呈现同等语义'],
]

const DOCS_HOOKS_HEADERS = ['变量', '默认值', '来源']
const HOOK_SOURCE_NOTES: Record<string, string> = {
  'system-accent-color': 'SystemAccentColor',
  'system-accent-color-dark-1': 'SystemAccentColorDark1',
  'system-accent-color-dark-2': 'SystemAccentColorDark2',
  'system-accent-color-dark-3': 'SystemAccentColorDark3',
  'system-accent-color-light-2': 'SystemAccentColorLight2',
  'system-accent-color-light-3': 'SystemAccentColorLight3',
  'system-color-highlight-color': 'GetSysColor(COLOR_HIGHLIGHT)',
  'system-color-highlight-text-color': 'GetSysColor(COLOR_HIGHLIGHTTEXT)',
}
const DOCS_HOOKS_ROWS = SYSTEM_COLOR_HOOKS.map(
  (hook) => [hook.cssVar, hook.light, HOOK_SOURCE_NOTES[hook.name] ?? hook.name] as (string | number)[],
)

const usageCode = `/* 颜色一律经 token 引用,随 html[data-theme] 明暗自动切换 */
.wui-card {
  color: var(--wui-text-control-foreground);
  background: var(--wui-text-control-background);
  border: 1px solid var(--wui-text-control-border);
}

/* 需要强调时用强调色系 token(最终引用系统强调色钩子) */
.wui-link { color: var(--wui-hyperlink-button-foreground); }

/* 应用层覆盖系统强调色(:root 全局或任意子树局部) */
:root { --wui-system-accent-color: <你的强调色>; }`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Color">
    <template #demo>
      <div class="color-stage">
        <!-- —— 1. 系统色钩子 + 强调色覆盖演示 —— -->
        <section>
          <h4 class="section-title">{{ secHooks }}</h4>
          <p class="guide-text">{{ hooksGuide }}</p>
          <div class="hooks-grid">
            <div v-for="hook in SYSTEM_COLOR_HOOKS" :key="hook.cssVar" class="hook-card">
              <span class="swatch swatch-lg" :style="{ background: `var(${hook.cssVar})` }" aria-hidden="true"></span>
              <code class="hook-name">{{ hook.cssVar }}</code>
              <span class="value-text">{{ hook.light }}</span>
            </div>
          </div>
          <div class="accent-demo" :style="accentStyle">
            <div class="accent-demo-row">
              <span class="demo-accent-button">Accent</span>
              <span class="demo-hyperlink">Hyperlink</span>
              <span class="demo-curtain"></span>
              <span class="demo-check">✓</span>
              <span class="demo-fill-bar"></span>
            </div>
            <p class="accent-demo-caption">{{ hooksDemoCaption }}</p>
          </div>
        </section>

        <!-- —— 2. 全量颜色 token 浏览 —— -->
        <section>
          <h4 class="section-title">{{ secBrowse }}</h4>
          <p class="guide-text">{{ browseGuide }}</p>
          <div class="browse-toolbar">
            <input
              v-model="query"
              class="browse-search"
              type="search"
              :placeholder="browsePlaceholder"
              :aria-label="secBrowse"
            />
            <span class="browse-summary">{{ summaryText }}</span>
            <button type="button" class="toolbar-button" @click="expandAllGroups">{{ expandAllLabel }}</button>
            <button type="button" class="toolbar-button" @click="collapseAllGroups">{{ collapseAllLabel }}</button>
          </div>
          <div class="col-head" aria-hidden="true">
            <span></span>
            <span>{{ colCurrent }}</span>
            <span>{{ colLight }}</span>
            <span>{{ colDark }}</span>
          </div>
          <div class="group-list">
            <div v-for="group in visibleGroups" :key="group.id" class="token-group">
              <button
                type="button"
                class="group-head"
                :aria-expanded="group.expanded"
                @click="toggleGroup(group.id)"
              >
                <span class="group-chevron" aria-hidden="true">{{ group.expanded ? '▾' : '▸' }}</span>
                <span class="group-title">{{ pickText(i18n, group.label) }}</span>
                <span class="group-count">{{ group.total }}{{ group.diffCount < group.total ? ` · ${group.diffCount}±` : '' }}</span>
              </button>
              <div v-if="group.expanded" class="group-rows">
                <div v-for="token in group.visible" :key="token.cssVar" class="token-row">
                  <span
                    class="swatch"
                    :style="{ background: `var(${token.cssVar})` }"
                    :title="colCurrent"
                    aria-hidden="true"
                  ></span>
                  <button
                    type="button"
                    class="token-name"
                    :title="token.cssVar"
                    @click="copyTokenName(token.cssVar)"
                  >
                    {{ token.cssVar }}
                  </button>
                  <span class="pair" :title="token.light">
                    <span class="swatch" :style="{ background: token.light }" aria-hidden="true"></span>
                    <span class="value-text">{{ token.light }}</span>
                  </span>
                  <span v-if="token.isThemeVarying" class="pair" :title="token.dark">
                    <span class="swatch" :style="{ background: token.dark }" aria-hidden="true"></span>
                    <span class="value-text">{{ token.dark }}</span>
                  </span>
                  <span v-else class="same-chip">{{ sameBadge }}</span>
                </div>
                <p v-if="group.truncated" class="cap-hint">{{ capHintText }}</p>
              </div>
            </div>
          </div>
          <p v-if="shownCount === 0" class="browse-empty">{{ emptyHint }}</p>
          <p v-if="isTruncated" class="cap-hint">{{ capHintText }}</p>
          <p class="copy-hint" role="status">{{ copyHint }}</p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="optSearch" type="text" v-model="query" placeholder="combo-box" />
        <DemoOptionRow :label="optDiff" type="toggle" v-model="diffOnly" />
        <DemoOptionRow :label="optAccent" type="select" v-model="accentChoice" :options="accentChoiceOptions" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsNamingTitle }}</h4>
      <DemoDocsTable :headers="DOCS_NAMING_HEADERS" :rows="DOCS_NAMING_ROWS" />
      <h4 class="docs-subtitle">{{ docsHooksTitle }}</h4>
      <DemoDocsTable :headers="DOCS_HOOKS_HEADERS" :rows="DOCS_HOOKS_ROWS" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="css" />
    </template>
  </DemoPage>
</template>

<style scoped>
.color-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 32px;
  width: 100%;
}

.section-title {
  margin: 0 0 12px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.guide-text {
  margin: 0 0 12px;
  max-width: 880px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 1. 系统色钩子 —— */
.hooks-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
}

.hook-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.swatch {
  display: inline-block;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  box-sizing: border-box;
  border: 1px solid var(--wui-system-control-foreground-chrome-gray);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.swatch-lg {
  width: 32px;
  height: 32px;
}

.hook-name {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-header-foreground-theme);
  overflow-wrap: anywhere;
}

.value-text {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 强调色子树覆盖演示:容器内一切引用 --wui-system-accent-color 的 token 随覆盖值变化 */
.accent-demo {
  margin-top: 12px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.accent-demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.demo-accent-button {
  padding: 5px 14px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-accent-button-foreground);
  background: var(--wui-accent-button-background);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.demo-hyperlink {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-hyperlink-button-foreground);
  text-decoration: underline;
}

.demo-curtain {
  display: inline-block;
  width: 40px;
  height: 20px;
  box-sizing: border-box;
  background: var(--wui-toggle-switch-curtain-background-theme);
  border-radius: 999px;
}

.demo-check {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-check-box-check-glyph-foreground-checked);
  background: var(--wui-check-box-check-background-fill-checked);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.demo-fill-bar {
  display: inline-block;
  width: 120px;
  height: 4px;
  background: var(--wui-slider-track-value-fill);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.accent-demo-caption {
  margin: 12px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 2. 全量 token 浏览 —— */
.browse-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.browse-search {
  min-width: 260px;
  padding: 5px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-control-foreground);
  background: var(--wui-text-control-background);
  border: 1px solid var(--wui-text-control-border);
  border-bottom-width: 2px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  outline: none;
}

.browse-search:focus-visible {
  border-color: var(--wui-text-control-border-brush-focused);
}

.browse-summary {
  flex: 1;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.toolbar-button {
  padding: 4px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.toolbar-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.toolbar-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

/* 列头与行同网格,保证对齐 */
.col-head,
.token-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.col-head {
  padding: 4px 8px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 8px;
  font-size: var(--wui-control-content-theme-font-size);
  text-align: left;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.group-head:hover {
  background: var(--wui-system-control-background-list-low);
}

.group-head:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.group-chevron {
  flex: 0 0 auto;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.group-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  flex: 0 0 auto;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.group-rows {
  padding: 4px 0 8px;
}

.token-row {
  padding: 3px 8px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.token-row:hover {
  background: var(--wui-system-control-background-list-low);
}

.token-name {
  min-width: 0;
  padding: 0;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  text-align: left;
  color: var(--wui-application-header-foreground-theme);
  background: transparent;
  border: none;
  cursor: copy;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-name:hover {
  color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  text-decoration: underline;
}

.token-name:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.pair {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.pair .value-text {
  flex: 1;
}

.same-chip {
  padding: 0 6px;
  font-size: 10px;
  line-height: 16px;
  color: var(--wui-application-secondary-foreground-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  justify-self: start;
}

.browse-empty {
  margin: 8px 0 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.cap-hint {
  margin: 8px 0 0;
  padding: 0 8px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-error-text-foreground);
}

.copy-hint {
  min-height: 1em;
  margin: 8px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-hyperlink-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
