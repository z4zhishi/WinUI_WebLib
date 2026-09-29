<script setup lang="ts">
// AutoSuggestBoxPage.vue —— AutoSuggestBox 控件示例页(示例组合对照 WinUI Gallery 的
// AutoSuggestBoxPage.xaml:基础候选猫名单 / QuerySubmitted 搜索体验,另加异步过滤模拟
// 与 NoResults 槽两例)。WinUI 契约:候选过滤由消费侧在 textChanged 里完成(仅响应
// userInput),把过滤结果写回 itemsSource;提交(Enter/查询按钮/点击建议)走 querySubmitted。
import { computed, ref } from 'vue'
import WuiAutoSuggestBox from '@/components/AutoSuggestBox.vue'
import type { AutoSuggestQuerySubmittedEventArgs, AutoSuggestTextChangeReason } from '@/components/AutoSuggestBox.vue'
import { symbolToGlyph } from '@/utils/symbolIcons'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'AutoSuggestBox(自动建议框)', en: 'AutoSuggestBox' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '在用户键入时提供候选建议的文本控件:应用在 textChanged 里自行过滤(仅响应 userInput)并把结果写回 itemsSource;输入过程不更新提交态,Enter / 查询按钮 / 点击建议才触发 querySubmitted。↑↓ 键盘导航会临时把高亮建议回显到输入框,Esc / 外点关闭并恢复已键入文本。',
  en: 'A text control that makes suggestions as the user types: the app filters in textChanged (userInput only) and writes the results back to itemsSource. Typing never updates the committed text — querySubmitted fires only on Enter, the query button or picking a suggestion. Arrow keys temporarily preview the highlighted suggestion; Esc / outside click restores the typed text.',
}
const GROUP_BASIC: BilingualText = { zh: '基础候选(对照官方示例:猫名单,分词全包含过滤)', en: 'Basic suggestions (official sample: cats, all-token contains filter)' }
const GROUP_ASYNC: BilingualText = { zh: '异步过滤模拟(400ms 延迟 + 状态提示)', en: 'Async filtering simulation (400ms delay + status hint)' }
const GROUP_SEARCH: BilingualText = { zh: '搜索体验(querySubmitted + QueryIcon + 自定义建议项模板)', en: 'Search experience (querySubmitted + QueryIcon + custom suggestion item)' }
const GROUP_NORESULTS: BilingualText = { zh: 'NoResults 槽(候选为空时)', en: 'NoResults slot (empty suggestions)' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘操作', en: 'Keyboard interaction' }
const LABEL_QUERY_ICON: BilingualText = { zh: '查询按钮图标(QueryIcon)', en: 'QueryIcon' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(Disabled)', en: 'Disabled' }
const LABEL_UPDATE_TEXT: BilingualText = { zh: '点击建议回写文本(UpdateTextOnSelect)', en: 'UpdateTextOnSelect' }
const LABEL_CHOSEN: BilingualText = { zh: '最近选中(SuggestionChosen)', en: 'Last chosen (SuggestionChosen)' }
const LABEL_SEARCHING: BilingualText = { zh: '搜索中…', en: 'Searching…' }
const LABEL_SUBMIT_RESULT: BilingualText = { zh: '提交结果(querySubmitted)', en: 'Submitted result (querySubmitted)' }
const LABEL_NO_MATCH: BilingualText = { zh: '未提交任何查询', en: 'No query submitted yet' }
const NOT_FOUND_TEXT: BilingualText = { zh: '没有找到对应的控件。', en: 'No such control found.' }
const NO_RESULTS_SLOT_TEXT: BilingualText = { zh: '没有匹配的水果,换个关键词试试。', en: 'No matching fruit — try another keyword.' }
const KEYBOARD_HINT: BilingualText = {
  zh: '↑ / ↓ 在候选间移动(不循环;↑ 回到顶部恢复已键入文本)→ Enter 提交;查询按钮点击 = 提交;Esc 关闭候选面板;候选为空时显示 NoResults 行。',
  en: '↑ / ↓ move between suggestions (no wrap; ↑ at top restores the typed text) → Enter submits; the query button submits too; Esc closes the panel; an empty result set shows the NoResults row.',
}
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupBasic = useBilingual(i18n, GROUP_BASIC)
const groupAsync = useBilingual(i18n, GROUP_ASYNC)
const groupSearch = useBilingual(i18n, GROUP_SEARCH)
const groupNoResults = useBilingual(i18n, GROUP_NORESULTS)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelQueryIcon = useBilingual(i18n, LABEL_QUERY_ICON)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelUpdateText = useBilingual(i18n, LABEL_UPDATE_TEXT)
const labelChosen = useBilingual(i18n, LABEL_CHOSEN)
const labelSearching = useBilingual(i18n, LABEL_SEARCHING)
const labelSubmitResult = useBilingual(i18n, LABEL_SUBMIT_RESULT)
const labelNoMatch = useBilingual(i18n, LABEL_NO_MATCH)
const notFoundText = useBilingual(i18n, NOT_FOUND_TEXT)
const noResultsSlotText = useBilingual(i18n, NO_RESULTS_SLOT_TEXT)
const keyboardHint = useBilingual(i18n, KEYBOARD_HINT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 参数面板(作用于演示一)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoHeader = ref<string | number | boolean>('Cats')
const demoPlaceholder = ref<string | number | boolean>('Type a cat breed')
const demoQueryIcon = ref<string | number | boolean>('None')
const demoDisabled = ref<string | number | boolean>(false)
const demoUpdateText = ref<string | number | boolean>(true)

const headerValue = computed(() => String(demoHeader.value))
const placeholderValue = computed(() => String(demoPlaceholder.value))
const disabledValue = computed(() => demoDisabled.value === true)
const updateTextValue = computed(() => demoUpdateText.value === true)
const queryIconValue = computed<'' | 'Find' | 'ZoomIn'>(() => {
  const raw = String(demoQueryIcon.value)
  return raw === 'Find' || raw === 'ZoomIn' ? raw : ''
})

// —— 演示一:基础候选(对照官方 BasicAutosuggestBox:猫名单,按空格分词、全部包含才算命中,
//      仅响应 userInput 原因)——
const CATS = [
  'Abyssinian', 'Aegean', 'American Bobtail', 'American Curl', 'American Shorthair',
  'American Wirehair', 'Arabian Mau', 'Asian', 'Australian Mist', 'Balinese',
  'Bambino', 'Bengal', 'Birman', 'Bombay', 'British Longhair',
  'British Shorthair', 'Burmese', 'Burmilla', 'Chartreux', 'Chausie',
  'Cornish Rex', 'Devon Rex', 'Egyptian Mau', 'Exotic Shorthair', 'Havana Brown',
  'Himalayan', 'Japanese Bobtail', 'Korat', 'Maine Coon', 'Manx',
  'Munchkin', 'Nebelung', 'Norwegian Forest Cat', 'Ocicat', 'Oriental Shorthair',
  'Persian', 'Peterbald', 'Pixie-bob', 'Ragamuffin', 'Ragdoll',
  'Russian Blue', 'Savannah', 'Scottish Fold', 'Selkirk Rex', 'Siamese',
  'Siberian', 'Singapura', 'Snowshoe', 'Somali', 'Sphynx',
  'Tonkinese', 'Toyger', 'Turkish Angora', 'Turkish Van',
]

const basicText = ref('')
const basicItems = ref<unknown[]>([])
const basicChosen = ref('—')

/** 官方过滤算法:查询按空格分词,猫名包含全部词才算命中。 */
function filterCats(query: string): string[] {
  const tokens = query.toLowerCase().split(' ')
  return CATS.filter((cat) => tokens.every((token) => cat.toLowerCase().includes(token)))
}

function onBasicTextChanged(value: string, reason: AutoSuggestTextChangeReason): void {
  // 官方注释:选中建议也会改文本,只响应用户键入引起的变化
  if (reason !== 'userInput') return
  basicItems.value = filterCats(value)
}

function onBasicSuggestionChosen(item: unknown): void {
  basicChosen.value = String(item)
}

// —— 演示二:异步过滤模拟(输入停 400ms 后返回结果;等待期显示「搜索中」状态)——
const FONTS = [
  'Arial', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia',
  'Corbel', 'Courier New', 'Georgia', 'Segoe UI', 'Sitka', 'Sylfaen', 'Tahoma',
  'Times New Roman', 'Trebuchet MS', 'Verdana',
]

const asyncText = ref('')
const asyncItems = ref<unknown[]>([])
const asyncSearching = ref(false)
let asyncTimer: ReturnType<typeof setTimeout> | null = null

function onAsyncTextChanged(value: string, reason: AutoSuggestTextChangeReason): void {
  if (reason !== 'userInput') return
  if (asyncTimer !== null) {
    clearTimeout(asyncTimer)
    asyncTimer = null
  }
  const query = value.trim().toLowerCase()
  if (query === '') {
    asyncItems.value = []
    asyncSearching.value = false
    return
  }
  asyncSearching.value = true
  // 模拟异步候选源(远程搜索接口):400ms 后返回过滤结果
  asyncTimer = setTimeout(() => {
    asyncItems.value = FONTS.filter((font) => font.toLowerCase().includes(query))
    asyncSearching.value = false
    asyncTimer = null
  }, 400)
}

// —— 演示三:搜索体验(对照官方 AutosuggestboxProvidesSearchboxExperience:
//      QueryIcon=Find + 对象候选 + 自定义项模板 + querySubmitted 展示详情)——
interface ControlInfo {
  name: string
  description: string
  glyph: string
}

const CONTROLS: ControlInfo[] = [
  { name: 'Button', description: '触发即时操作的按钮控件', glyph: '\uE8E5' },
  { name: 'CheckBox', description: '可勾选/取消/不定态的选择控件', glyph: '\uE73A' },
  { name: 'ComboBox', description: '节省空间的下拉选择器', glyph: '\uE0E5' },
  { name: 'AutoSuggestBox', description: '键入时提供候选建议的文本控件', glyph: '\uE721' },
  { name: 'Slider', description: '拖动滑块在范围内取值', glyph: '\uE9E9' },
  { name: 'ToggleSwitch', description: '表示开/关状态的开关控件', glyph: '\uF19E' },
  { name: 'ProgressBar', description: '确定性/不确定性进度条', glyph: '\uF16A' },
  { name: 'ContentDialog', description: '模态对话框,承载确认类交互', glyph: '\uE8FD' },
]

const searchText = ref('')
const searchItems = ref<unknown[]>([])
const searchSubmitted = ref<AutoSuggestQuerySubmittedEventArgs | null>(null)
/** 本次提交实际选中的候选(点击/键盘高亮经 suggestionChosen 记录;对象候选,含描述)。 */
const searchChosen = ref<ControlInfo | null>(null)
/** 本次提交既无 ChosenSuggestion 又无模糊命中 → 显示未找到提示(对照官方分支)。 */
const searchMissed = ref(false)

function onSearchTextChanged(value: string, reason: AutoSuggestTextChangeReason): void {
  if (reason !== 'userInput') return
  const query = value.trim().toLowerCase()
  searchItems.value =
    query === ''
      ? []
      : CONTROLS.filter((control) => control.name.toLowerCase().includes(query))
  // 新一轮键入:上一次提交的选中/未命中状态失效
  searchChosen.value = null
  searchMissed.value = false
}

function onSearchSuggestionChosen(item: unknown): void {
  searchChosen.value = item as ControlInfo
  searchMissed.value = false
}

function onSearchSubmitted(args: AutoSuggestQuerySubmittedEventArgs): void {
  searchSubmitted.value = args
  // 对照官方 Control2_QuerySubmitted:ChosenSuggestion 优先;否则按提交文本模糊搜索取首项
  if (searchChosen.value !== null) return
  const query = args.queryText.trim().toLowerCase()
  const match =
    query === ''
      ? null
      : (CONTROLS.find((control) => control.name.toLowerCase().includes(query)) ?? null)
  if (match) searchChosen.value = match
  else searchMissed.value = true
}

const findGlyph = symbolToGlyph('Find') ?? ''

// —— 演示四:NoResults 槽(稀疏数据集 startsWith 过滤,空结果时由 #no-results-found 槽接管)——
const FRUITS = ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango', 'Orange', 'Peach', 'Pear']

const narrowText = ref('')
const narrowItems = ref<unknown[]>([])

function onNarrowTextChanged(value: string, reason: AutoSuggestTextChangeReason): void {
  if (reason !== 'userInput') return
  const query = value.trim().toLowerCase()
  narrowItems.value =
    query === '' ? [] : FRUITS.filter((fruit) => fruit.toLowerCase().startsWith(query))
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['text', 'string', "''", '输入框文本(WinUI Text);v-model:text 双向绑定'],
  ['itemsSource', 'unknown[]', '[]', '候选数组(WinUI ItemsSource);过滤由消费侧在 textChanged 里完成后写回'],
  ['placeholderText', 'string', "''", '空内容时的占位文本(WinUI PlaceholderText)'],
  ['header', 'string', "''", '输入框上方标头文本(WinUI Header)'],
  ['queryIcon', "SymbolValue | ''", "''", '查询按钮图标(WinUI QueryIcon,Symbol 枚举名如 Find);缺省或 disabled 时不渲染查询按钮'],
  ['displayMemberPath', 'string', "''", '对象项的显示字段路径(WinUI DisplayMemberPath);缺省 String(item)'],
  ['updateTextOnSelect', 'boolean', 'true', '点击建议时是否把建议文本回写输入框(WinUI UpdateTextOnSelect)'],
  ['maxSuggestionListHeight', 'number', '374', '建议面板最大高度 px(WinUI MaxSuggestionListHeight)'],
  ['noResultsText', 'string', "'No results found'", '候选为空时「无结果」行的默认文案(#noResultsFound 槽可整体替换)'],
  ['clearButtonEnabled', 'boolean', 'true', '是否启用清除按钮;有内容时显示'],
  ['isSuggestionListOpen', 'boolean', 'false', '建议面板开关(WinUI IsSuggestionListOpen);v-model:is-suggestion-list-open 双向绑定'],
  ['disabled', 'boolean', 'false', '禁用;样式对照 Disabled 视觉状态'],
  ['#item slot', '{ item: unknown; index: number }', '—', '自定义建议项模板(WinUI ItemTemplate 等价);缺省渲染显示文本'],
  ['#noResultsFound slot', '—', '—', '候选为空时的「无结果」行内容;缺省渲染 noResultsText'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['textChanged', "(value: string, reason: 'userInput' | 'programmaticChange' | 'suggestionChosen') => void", '文本变化时(WinUI TextChanged);reason 对应 AutoSuggestionBoxTextChangeReason,消费侧过滤建议时只应响应 userInput'],
  ['suggestionChosen', '(item: unknown, index: number) => void', '↑↓ 键盘高亮移动到候选项,或候选被点击选中时(WinUI SuggestionChosen)'],
  ['querySubmitted', '(args: { queryText: string; results: unknown[] }) => void', 'Enter / 查询按钮 / 点击建议三条提交路径统一触发(WinUI QuerySubmitted)'],
  ['textSubmitted', '(args: { queryText: string; results: unknown[] }) => void', 'querySubmitted 的别名(任务命名约定),两事件同参同发'],
]

const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['↓', '打开候选面板并高亮首项;面板打开时向下移动高亮(到末项停住,不循环)'],
  ['↑', '向上移动高亮;在首项再按回到无高亮并恢复已键入文本'],
  ['Enter', '有高亮:提交高亮建议;无高亮:提交当前文本(面板随后关闭)'],
  ['Esc', '关闭候选面板并恢复已键入文本(撤销预览)'],
  ['Tab', '关闭候选面板,焦点自然移动'],
  ['输入字符', '触发 textChanged(userInput);由消费侧过滤并写回 itemsSource'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(() => {
  const iconLine = queryIconValue.value === '' ? '' : `  query-icon="${queryIconValue.value}"\n`
  return `<WuiAutoSuggestBox
  v-model:text="query"
  :items-source="suggestions"
  :header="${JSON.stringify(headerValue.value)}"
  :placeholder-text="${JSON.stringify(placeholderValue.value)}"
${iconLine}  :update-text-on-select="${updateTextValue.value}"
  @text-changed="onTextChanged"
  @suggestion-chosen="onSuggestionChosen"
  @query-submitted="onQuerySubmitted" />`
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="asb-stage">
        <!-- 示例一:基础候选(官方猫名单 + 分词全包含过滤;参数面板实时调节) -->
        <h4 class="group-title">{{ groupBasic }}</h4>
        <WuiAutoSuggestBox
          v-model:text="basicText"
          class="stage-box"
          :header="headerValue"
          :placeholder-text="placeholderValue"
          :query-icon="queryIconValue"
          :items-source="basicItems"
          :update-text-on-select="updateTextValue"
          :disabled="disabledValue"
          @text-changed="onBasicTextChanged"
          @suggestion-chosen="onBasicSuggestionChosen"
        />
        <p class="live-value">{{ labelChosen }}:{{ basicChosen }}</p>

        <!-- 示例二:异步过滤模拟(400ms 延迟,等待期显示状态提示) -->
        <h4 class="group-title">{{ groupAsync }}</h4>
        <WuiAutoSuggestBox
          v-model:text="asyncText"
          class="stage-box"
          header="Fonts"
          placeholder-text="Search fonts (async 400ms)"
          :items-source="asyncItems"
          @text-changed="onAsyncTextChanged"
        />
        <p class="live-value" aria-live="polite">
          <template v-if="asyncSearching">{{ labelSearching }}</template>
        </p>

        <!-- 示例三:搜索体验(QueryIcon + 对象候选 + 自定义项模板 + querySubmitted 详情卡;
             对象候选必须配 displayMemberPath,否则点击回写为 String(item)) -->
        <h4 class="group-title">{{ groupSearch }}</h4>
        <WuiAutoSuggestBox
          v-model:text="searchText"
          class="stage-box"
          header="WinUI controls"
          placeholder-text="Type a control name"
          query-icon="Find"
          display-member-path="name"
          :items-source="searchItems"
          @text-changed="onSearchTextChanged"
          @suggestion-chosen="onSearchSuggestionChosen"
          @query-submitted="onSearchSubmitted"
        >
          <template #item="{ item }">
            <span class="search-item">
              <span class="search-item-glyph" aria-hidden="true">{{ (item as { glyph: string }).glyph }}</span>
              <span class="search-item-text">
                <span class="search-item-name">{{ (item as { name: string }).name }}</span>
                <span class="search-item-desc">{{ (item as { description: string }).description }}</span>
              </span>
            </span>
          </template>
        </WuiAutoSuggestBox>
        <p class="live-value">{{ labelSubmitResult }}:{{ searchSubmitted ? searchSubmitted.queryText : labelNoMatch }}</p>
        <div v-if="searchChosen" class="result-card">
          <span class="result-card-glyph" aria-hidden="true">{{ searchChosen.glyph }}</span>
          <span class="result-card-text">
            <span class="result-card-name">{{ searchChosen.name }}</span>
            <span class="result-card-desc">{{ searchChosen.description }}</span>
          </span>
        </div>
        <p v-else-if="searchMissed" class="hint">{{ notFoundText }}</p>

        <!-- 示例四:NoResults 槽(候选为空时由 #noResultsFound 接管) -->
        <h4 class="group-title">{{ groupNoResults }}</h4>
        <WuiAutoSuggestBox
          v-model:text="narrowText"
          class="stage-box"
          header="Fruits"
          placeholder-text="Try 'z' for no results"
          :items-source="narrowItems"
          @text-changed="onNarrowTextChanged"
        >
          <template #noResultsFound>
            <span class="no-results">
              <span class="no-results-glyph" aria-hidden="true">{{ findGlyph }}</span>
              {{ noResultsSlotText }}
            </span>
          </template>
        </WuiAutoSuggestBox>

        <!-- 键盘操作说明 -->
        <h4 class="group-title">{{ groupKeyboard }}</h4>
        <p class="hint">{{ keyboardHint }}</p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Header" type="text" v-model="demoHeader" />
        <DemoOptionRow label="PlaceholderText" type="text" v-model="demoPlaceholder" />
        <DemoOptionRow
          :label="labelQueryIcon"
          type="select"
          v-model="demoQueryIcon"
          :options="[
            { label: 'None', value: 'None' },
            { label: 'Find', value: 'Find' },
            { label: 'ZoomIn', value: 'ZoomIn' },
          ]"
        />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelUpdateText" type="toggle" v-model="demoUpdateText" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsKeyboardTitle }}</h4>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.asb-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
  width: 100%;
  max-width: 480px;
}

.group-title {
  margin: 8px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.stage-box {
  width: 100%;
}

.live-value {
  margin: 0;
  min-height: 1.2em;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  word-break: break-all;
}

.hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-description-text-foreground);
}

/* —— 演示三:自定义建议项(名称 + 描述两行)+ 提交详情卡 —— */
.search-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.search-item-glyph {
  flex: none;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-auto-suggest-box-icon-font-size);
  line-height: 1;
  color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}

.search-item-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.search-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-item-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-description-text-foreground);
}

.result-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--wui-auto-suggest-box-suggestions-list-background);
  border: 1px solid var(--wui-auto-suggest-box-suggestions-list-border);
  border-radius: var(--wui-popup-corner-radius);
}

.result-card-glyph {
  flex: none;
  font-family: var(--wui-symbol-theme-font-family);
  /* SymbolIcon 缺省 20px(g_ClientCoreFontSize),theme.css 无同名 token,取同值 header token */
  font-size: var(--wui-list-view-header-item-theme-font-size);
  line-height: 1;
  color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}

.result-card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.result-card-name {
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.result-card-desc {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-description-text-foreground);
}

/* —— 演示四:NoResults 槽内容 —— */
.no-results {
  display: flex;
  align-items: center;
  gap: 8px;
}

.no-results-glyph {
  flex: none;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-auto-suggest-box-icon-font-size);
  line-height: 1;
  color: var(--wui-system-control-description-text-foreground);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
