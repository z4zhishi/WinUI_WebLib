<script setup lang="ts">
// ListView 示例页:对照官方 WinUI Gallery ListViewPage
// (BasicListviewSimpleDatatemplate 基础列表 + ListviewSelectionSupport 四种选择模式 +
// 自定义 ItemTemplate 两行联系人与图片卡模板),附键盘操作说明。
// 上半区交互演示 + 参数面板(SelectionMode / SingleSelectionFollowsFocus 实时调节),
// 下半区为属性、事件、键盘交互与用法代码(结构照抄已通过 QA 的 ComboBoxPage 母版)。
import { computed, ref } from 'vue'
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
const PAGE_TITLE: BilingualText = { zh: 'ListView', en: 'ListView' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI ListView 控件示例:垂直滚动列表,支持 None/Single/Multiple/Extended 四种选择模式(Ctrl 切换、Shift 区间、Ctrl+A 全选)、方向键移动焦点与自定义项模板。上半区参数实时调节,下半区为控件文档。',
  en: 'WinUI ListView examples: vertical scrolling list with four selection modes (Ctrl toggle, Shift range, Ctrl+A), keyboard focus navigation and custom item templates. Options above, docs below.',
}
const GROUP_BASIC: BilingualText = { zh: '基础列表(单选,SelectionChanged 实时回显)', en: 'Basic list (Single, SelectionChanged echo)' }
const GROUP_SELECTION: BilingualText = { zh: '选择模式(None / Single / Multiple / Extended,右侧面板切换)', en: 'Selection modes (None / Single / Multiple / Extended, switch on the right)' }
const GROUP_TEMPLATE: BilingualText = { zh: '自定义项模板(#item slot + Header/Footer)', en: 'Custom item template (#item slot + Header/Footer)' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘操作', en: 'Keyboard interaction' }
const LABEL_MODE: BilingualText = { zh: '选择模式(SelectionMode)', en: 'SelectionMode' }
const LABEL_FOLLOWS: BilingualText = { zh: '焦点带选(SingleSelectionFollowsFocus)', en: 'SingleSelectionFollowsFocus' }
const LABEL_SELECTED_INDEX: BilingualText = { zh: 'selectedIndex', en: 'selectedIndex' }
const LABEL_SELECTED_ITEMS: BilingualText = { zh: 'selectedItems', en: 'selectedItems' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupBasic = useBilingual(i18n, GROUP_BASIC)
const groupSelection = useBilingual(i18n, GROUP_SELECTION)
const groupTemplate = useBilingual(i18n, GROUP_TEMPLATE)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelMode = useBilingual(i18n, LABEL_MODE)
const labelFollows = useBilingual(i18n, LABEL_FOLLOWS)
const labelSelectedIndex = useBilingual(i18n, LABEL_SELECTED_INDEX)
const labelSelectedItems = useBilingual(i18n, LABEL_SELECTED_ITEMS)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 参数面板(作用于演示二)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoMode = ref<string | number | boolean>('Extended')
const demoFollows = ref<string | number | boolean>(true)

/** 选择模式(WinUI SelectionMode)。 */
type SelectionMode = 'None' | 'Single' | 'Multiple' | 'Extended'

const modeValue = computed<SelectionMode>(() => {
  const value = String(demoMode.value)
  return value === 'None' || value === 'Multiple' || value === 'Extended' ? value : 'Single'
})
const followsValue = computed(() => demoFollows.value === true)

// —— 演示一:基础列表(对照官方 BasicListviewSimpleDatatemplate:邮箱文件夹名单列)——
const folders = [
  'App collections',
  'Controls by group',
  'All controls',
  'Gift wrap',
  'Dinner plates',
  'Candy bowl',
  'Covered storage',
  'Five-quart pot',
  'Stockpot',
]
const basicIndex = ref(-1)
const basicItem = ref<unknown>(null)

function onBasicSelectionChanged(selected: unknown[]): void {
  basicIndex.value = selected.length > 0 ? folders.indexOf(String(selected[0])) : -1
  basicItem.value = selected[0] ?? null
}

// —— 演示二:选择模式(对照官方 ListviewSelectionSupport 的 Contact 两行项)——
interface Contact {
  name: string
  company: string
}
const contacts: Contact[] = [
  { name: 'Mikael Nystrom', company: 'Contoso, Ltd.' },
  { name: 'Toni Poe', company: 'Fabrikam, Inc.' },
  { name: 'Joaquin Kemp', company: 'Adventure Works' },
  { name: 'Lita Worth', company: 'Alpine Ski House' },
  { name: 'Terry Adams', company: 'City Power & Light' },
  { name: 'Bailey Swanson', company: 'Fourth Coffee' },
  { name: 'Adel Abadeer', company: 'Northwind Traders' },
  { name: 'Christine Cannon', company: 'Tailspin Toys' },
]
const selectionSelected = ref<unknown[]>([])
const selectionEcho = computed(() =>
  selectionSelected.value.length === 0
    ? '—'
    : selectionSelected.value.map((entry) => contactOf(entry).name).join(', '),
)

function contactOf(item: unknown): Contact {
  return typeof item === 'object' && item !== null ? (item as Contact) : { name: '', company: '' }
}

function onSelectionChanged(selected: unknown[]): void {
  selectionSelected.value = selected
}

// —— 演示三:自定义项模板(对照官方 ListviewImages:标题 + 描述 + 计数)+ Header/Footer ——
interface MediaItem {
  title: string
  description: string
  views: string
  likes: string
}
const mediaItems: MediaItem[] = [
  {
    title: 'Cliff in Australia',
    description: 'This is a description of the cliff. It describes the cliff in more detail.',
    views: '1,234',
    likes: '89',
  },
  {
    title: 'Mountain trail at dawn',
    description: 'A short description of the trail and what makes the morning light special.',
    views: '860',
    likes: '41',
  },
  {
    title: 'Lakeside boardwalk',
    description: 'The boardwalk loops around the lake; description text may wrap to two lines.',
    views: '2,048',
    likes: '132',
  },
]
const templateSelected = ref<unknown[]>([])
const templateEcho = computed(() =>
  templateSelected.value.length === 0 ? '—' : String(templateSelected.value[0]),
)

function onTemplateSelectionChanged(selected: unknown[]): void {
  templateSelected.value = selected
}

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['items (v-model)', 'unknown[]', '[]', '数据源数组(WinUI ItemsSource),元素可为字符串/数字/对象'],
  ['selectedIndex (v-model)', 'number', '-1', '选中项索引(WinUI SelectedIndex,未选 -1,多选取首个选中项),双向;程序化赋值=选中该单项(替换既有选择)'],
  ['selectedItems (v-model)', 'unknown[]', '[]', '选中项集合(WinUI SelectedItems),双向;程序化赋值按引用相等回查索引'],
  ['selectionMode', "'None' | 'Single' | 'Multiple' | 'Extended'", "'Single'", '选择模式:None 不可选;Single 单选;Multiple 带勾选框点选;Extended 支持 Ctrl 切换与 Shift 区间'],
  ['singleSelectionFollowsFocus', 'boolean', 'true', 'Single 模式下方向键移动焦点时选中是否随焦点走(WinUI SingleSelectionFollowsFocus)'],
  ['displayMemberPath', 'string', "''", "对象项的显示字段路径(WinUI DisplayMemberPath),如 'name'"],
  ['#item slot', "slot '{ item: unknown; index: number }'", '—', '自定义项模板(WinUI ItemTemplate);缺省渲染显示文本'],
  ['#header / #footer slot', '—', '—', '列表顶部/底部内容(WinUI Header/Footer),随内容滚动'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['selectionChanged', '(selected: unknown[], added: unknown[], removed: unknown[])', '选择集变化时(点击/键盘/程序化赋值均触发)'],
  ['itemClick', '(index: number, item: unknown)', '项被单击时(任意模式,含 None;对应 WinUI ItemClick)'],
  ['update:selectedIndex / update:selectedItems / update:items', '(value)', '三个双向绑定模型各自的更新事件'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['↑ / ↓ / Home / End', '移动键盘焦点(到边界停住,不循环)'],
  ['Ctrl + ↑ / ↓ / Home / End', '只移动焦点,不改变选择'],
  ['Shift + ↑ / ↓', 'Extended/Multiple:从锚点扩展区间选择'],
  ['Space', 'Single:选中焦点项;Multiple:切换;Extended:只选焦点项'],
  ['Ctrl + Space', 'Extended:切换焦点项且不破坏其余选中'],
  ['Ctrl + A', 'Extended/Multiple:全选'],
  ['Ctrl + 单击 / Shift + 单击', 'Extended:切换单项(设锚点)/ 锚点区间替换选择;Multiple:Shift 区间追加'],
  ['Enter', '触发 itemClick(不改选择)'],
]

const usageCode = computed(
  () => `<WuiListView
  :items="contacts"
  v-model:selected-index="selectedIndex"
  selection-mode="${modeValue.value}"
  :single-selection-follows-focus="${followsValue.value}"
  @selection-changed="onSelectionChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="listview-stage">
        <!-- 演示一:基础列表(单选;对照官方 BaseExample:350 宽、400 高、1px 边框) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupBasic }}</h4>
          <div class="demo-row">
            <WuiListView
              :items="folders"
              v-model:selected-index="basicIndex"
              selection-mode="Single"
              class="demo-list"
              style="width: 350px"
              @selection-changed="onBasicSelectionChanged"
            />
            <span class="demo-echo">
              {{ labelSelectedIndex }}: {{ basicIndex >= 0 ? `${basicIndex} (${String(basicItem)})` : '—' }}
            </span>
          </div>
        </section>

        <!-- 演示二:选择模式(参数面板实时切换;Multiple 显示勾选框,Extended 支持 Ctrl/Shift) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupSelection }}</h4>
          <div class="demo-row">
            <WuiListView
              :items="contacts"
              :selection-mode="modeValue"
              :single-selection-follows-focus="followsValue"
              display-member-path="name"
              class="demo-list"
              style="width: 400px"
              @selection-changed="onSelectionChanged"
            >
              <!-- 自定义项模板:两行联系人(对照官方 ContactListViewTemplate) -->
              <template #item="{ item }">
                <span class="contact-item">
                  <span class="contact-avatar" aria-hidden="true">
                    {{ contactOf(item).name.slice(0, 1) }}
                  </span>
                  <span class="contact-text">
                    <span class="contact-name">{{ contactOf(item).name }}</span>
                    <span class="contact-company">{{ contactOf(item).company }}</span>
                  </span>
                </span>
              </template>
            </WuiListView>
            <span class="demo-echo">
              {{ labelSelectedItems }} ({{ selectionSelected.length }}): {{ selectionEcho }}
            </span>
          </div>
          <p class="demo-hint">
            {{ i18n.locale.value.startsWith('zh')
              ? 'Extended 模式:Ctrl+单击切换、Shift+单击选区间、Ctrl+A 全选。'
              : 'Extended mode: Ctrl+click toggles, Shift+click selects a range, Ctrl+A selects all.' }}
          </p>
        </section>

        <!-- 演示三:自定义项模板 + Header/Footer(对照官方 ListviewImages) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupTemplate }}</h4>
          <WuiListView
            :items="mediaItems"
            selection-mode="Single"
            display-member-path="title"
            class="demo-list"
            style="width: 480px"
            @selection-changed="onTemplateSelectionChanged"
          >
            <template #header>
              <p class="list-header">图片列表(Header)</p>
            </template>
            <template #item="{ item }">
              <span class="media-item">
                <span class="media-thumb" aria-hidden="true"></span>
                <span class="media-text">
                  <span class="media-title">{{ (item as MediaItem).title }}</span>
                  <span class="media-description">{{ (item as MediaItem).description }}</span>
                  <span class="media-meta">
                    {{ (item as MediaItem).views }} Views · {{ (item as MediaItem).likes }} Likes
                  </span>
                </span>
              </span>
            </template>
            <template #footer>
              <p class="list-footer">Footer:共 {{ mediaItems.length }} 项</p>
            </template>
          </WuiListView>
          <span class="demo-echo">{{ labelSelectedIndex }}: {{ templateEcho }}</span>
        </section>

        <!-- 键盘操作说明 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupKeyboard }}</h4>
          <ul class="keyboard-list">
            <li><kbd>↑</kbd>/<kbd>↓</kbd>/<kbd>Home</kbd>/<kbd>End</kbd> {{ i18n.locale.value.startsWith('zh') ? '移动焦点' : 'move focus' }}</li>
            <li><kbd>Ctrl</kbd>+{{ i18n.locale.value.startsWith('zh') ? '方向键' : 'arrows' }} {{ i18n.locale.value.startsWith('zh') ? '只移焦不选' : 'move focus only' }}</li>
            <li><kbd>Shift</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> {{ i18n.locale.value.startsWith('zh') ? '扩展区间' : 'extend range' }}</li>
            <li><kbd>Space</kbd> {{ i18n.locale.value.startsWith('zh') ? '选择/切换' : 'select/toggle' }}</li>
            <li><kbd>Ctrl</kbd>+<kbd>Space</kbd> {{ i18n.locale.value.startsWith('zh') ? '切换(Extended)' : 'toggle (Extended)' }}</li>
            <li><kbd>Ctrl</kbd>+<kbd>A</kbd> {{ i18n.locale.value.startsWith('zh') ? '全选' : 'select all' }}</li>
            <li><kbd>Enter</kbd> {{ i18n.locale.value.startsWith('zh') ? 'itemClick' : 'itemClick' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          :label="labelMode"
          type="select"
          v-model="demoMode"
          :options="[
            { label: 'None', value: 'None' },
            { label: 'Single', value: 'Single' },
            { label: 'Multiple', value: 'Multiple' },
            { label: 'Extended', value: 'Extended' },
          ]"
        />
        <DemoOptionRow :label="labelFollows" type="toggle" v-model="demoFollows" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
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
.listview-stage {
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

.demo-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 官方示例列表统一 400 高 + 1px 边框(BaseExample 的 BorderBrush/BorderThickness) */
.demo-list {
  height: 400px;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.demo-echo {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示二:两行联系人(对照 ContactListViewTemplate:32px 圆 + 两行文本)—— */
.contact-item {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 4px 0;
}

.contact-avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0 6px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-base-medium);
  border-radius: 50%;
}

.contact-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-left: 6px;
}

.contact-name {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.contact-company {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示三:图片卡(对照 ListviewImages:缩略图 + 标题/描述/计数)—— */
.media-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
}

.media-thumb {
  flex: none;
  width: 96px;
  height: 60px;
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
}

.media-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  margin-left: 12px;
}

.media-title {
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.media-description {
  overflow: hidden;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  text-overflow: ellipsis;
  white-space: normal;
  color: var(--wui-application-secondary-foreground-theme);
}

.media-meta {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.list-header,
.list-footer {
  margin: 0;
  padding: 8px 12px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.keyboard-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  list-style: none;
}

.keyboard-list kbd {
  padding: 1px 6px;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 3px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
