<script setup lang="ts">
// ListBox 示例页:对照 WinUI 官方文档 ListBox 场景(简单短列表选择 + SelectionChanged
// 回显)。ListBox 是朴素的单列选择控件(区别于 ListView:无虚拟化、项样式更朴素、
// 容器自带 ChromeMediumLow 底色),上半区交互演示 + 参数面板(SelectionMode /
// SingleSelectionFollowsFocus 实时调节),下半区为属性、事件、键盘交互与用法代码
// (结构照抄已通过 QA 的 ListViewPage 母版)。
import { computed, ref } from 'vue'
import WuiListBox from '@/components/ListBox.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ListBox', en: 'ListBox' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI ListBox 控件示例:朴素短列表选择控件,支持 None/Single/Multiple/Extended 四种选择模式(Ctrl 切换、Shift 区间、Ctrl+A 全选)、方向键移动焦点与自定义项模板;容器自带 ChromeMediumLow 底色。上半区参数实时调节,下半区为控件文档。',
  en: 'WinUI ListBox examples: a simple selection list with four selection modes (Ctrl toggle, Shift range, Ctrl+A), keyboard focus navigation and custom item templates; the container has a built-in ChromeMediumLow background. Options above, docs below.',
}
const GROUP_BASIC: BilingualText = { zh: '基础列表(单选,SelectionChanged 实时回显)', en: 'Basic list (Single, SelectionChanged echo)' }
const GROUP_SELECTION: BilingualText = { zh: '选择模式(None / Single / Multiple / Extended,右侧面板切换)', en: 'Selection modes (None / Single / Multiple / Extended, switch on the right)' }
const GROUP_TEMPLATE: BilingualText = { zh: '自定义项模板(#item slot + displayMemberPath)', en: 'Custom item template (#item slot + displayMemberPath)' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘操作', en: 'Keyboard interaction' }
const LABEL_MODE: BilingualText = { zh: '选择模式(SelectionMode)', en: 'SelectionMode' }
const LABEL_FOLLOWS: BilingualText = { zh: '焦点带选(SingleSelectionFollowsFocus)', en: 'SingleSelectionFollowsFocus' }
const LABEL_SELECTED_INDEX: BilingualText = { zh: 'selectedIndex', en: 'selectedIndex' }
const LABEL_SELECTED_ITEM: BilingualText = { zh: 'selectedItem', en: 'selectedItem' }
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
const labelSelectedItem = useBilingual(i18n, LABEL_SELECTED_ITEM)
const labelSelectedItems = useBilingual(i18n, LABEL_SELECTED_ITEMS)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 参数面板(作用于演示二)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoMode = ref<string | number | boolean>('Single')
const demoFollows = ref<string | number | boolean>(true)

/** 选择模式(WinUI SelectionMode)。 */
type SelectionMode = 'None' | 'Single' | 'Multiple' | 'Extended'

const modeValue = computed<SelectionMode>(() => {
  const value = String(demoMode.value)
  return value === 'None' || value === 'Multiple' || value === 'Extended' ? value : 'Single'
})
const followsValue = computed(() => demoFollows.value === true)

// —— 演示一:基础列表(对照官方文档 ListBox 基础示例:颜色名单列)——
const colors = ['Blue', 'Green', 'Red', 'Yellow', 'Orange', 'Purple']
const basicIndex = ref(-1)
const basicItem = ref<unknown>(null)

function onBasicSelectionChanged(selected: unknown[]): void {
  basicItem.value = selected[0] ?? null
  basicIndex.value = selected.length > 0 ? colors.indexOf(String(selected[0])) : -1
}

// —— 演示二:选择模式(参数面板实时切换;ListBox 无勾选框,多选以 accent 铺底表达)——
interface Layer {
  name: string
  kind: string
}
const layers: Layer[] = [
  { name: 'Background', kind: 'brush' },
  { name: 'Content', kind: 'presenter' },
  { name: 'Border', kind: 'thickness' },
  { name: 'Padding', kind: 'thickness' },
  { name: 'Foreground', kind: 'brush' },
  { name: 'PressedBackground', kind: 'rectangle' },
  { name: 'FocusVisual', kind: 'system' },
  { name: 'DisabledState', kind: 'vsm' },
]
const selectionSelected = ref<unknown[]>([])
const selectionItemsEcho = computed(() =>
  selectionSelected.value.length === 0
    ? '—'
    : selectionSelected.value.map((entry) => layerOf(entry).name).join(', '),
)
const selectionItemEcho = computed(() =>
  selectionSelected.value.length === 0 ? 'null' : layerOf(selectionSelected.value[0]).name,
)

function layerOf(item: unknown): Layer {
  return typeof item === 'object' && item !== null ? (item as Layer) : { name: '', kind: '' }
}

function onSelectionChanged(selected: unknown[]): void {
  selectionSelected.value = selected
}

// —— 演示三:自定义项模板(两行项:#item slot)+ displayMemberPath 对照 ——
interface FontItem {
  family: string
  sample: string
}
const fontItems: FontItem[] = [
  { family: 'Segoe UI Variable', sample: 'The quick brown fox' },
  { family: 'Segoe UI', sample: 'Pack my box with five dozen jugs' },
  { family: 'Consolas', sample: 'for (int i = 0; i < 10; i++)' },
  { family: 'Cambria', sample: 'How vexingly quick daft zebras jump!' },
]
const templateIndex = ref(-1)

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['items (v-model)', 'unknown[]', '[]', '数据源数组(WinUI ItemsSource),元素可为字符串/数字/对象'],
  ['selectedIndex (v-model)', 'number', '-1', '选中项索引(WinUI SelectedIndex,未选 -1,多选取首个选中项),双向;程序化赋值=选中该单项(替换既有选择)'],
  ['selectedItem (v-model)', 'unknown', 'null', '选中项(WinUI SelectedItem),双向;程序化赋值按引用相等回查索引,null 清空'],
  ['selectedItems (v-model)', 'unknown[]', '[]', '选中项集合(WinUI SelectedItems;源为只读集合,本实现提供双向),程序化赋值按引用相等回查索引'],
  ['selectionMode', "'None' | 'Single' | 'Multiple' | 'Extended'", "'Single'", '选择模式:None 不可选;Single 单选;Multiple/Extended 支持 Ctrl 切换与 Shift 区间(无勾选框,选中以强调色铺底表达)'],
  ['singleSelectionFollowsFocus', 'boolean', 'true', 'Single 模式下方向键移动焦点时选中是否随焦点走(WinUI SingleSelectionFollowsFocus)'],
  ['displayMemberPath', 'string', "''", "对象项的显示字段路径(WinUI DisplayMemberPath),如 'name'"],
  ['disabled', 'boolean', 'false', '整控禁用(WinUI IsEnabled=false):全部项进入 Disabled 态'],
  ['#item slot', "slot '{ item: unknown; index: number }'", '—', '自定义项模板(WinUI ItemTemplate);缺省渲染显示文本'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['selectionChanged', '(selected: unknown[], added: unknown[], removed: unknown[])', '选择集变化时(点击/键盘/程序化赋值均触发)'],
  ['update:selectedIndex / update:selectedItem / update:selectedItems / update:items', '(value)', '四个双向绑定模型各自的更新事件'],
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
]

const usageCode = computed(
  () => `<WuiListBox
  :items="colors"
  v-model:selected-index="selectedIndex"
  selection-mode="${modeValue.value}"
  :single-selection-follows-focus="${followsValue.value}"
  @selection-changed="onSelectionChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ListBox">
    <template #demo>
      <div class="listbox-stage">
        <!-- 演示一:基础列表(单选;官方文档示例宽 200 左右,这里 296 便于阅读) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupBasic }}</h3>
          <div class="demo-row">
            <WuiListBox
              :items="colors"
              v-model:selected-index="basicIndex"
              selection-mode="Single"
              aria-label="颜色列表"
              class="demo-list"
              @selection-changed="onBasicSelectionChanged"
            />
            <span class="demo-echo">
              {{ labelSelectedIndex }}: {{ basicIndex >= 0 ? `${basicIndex} (${String(basicItem)})` : '—' }}
            </span>
          </div>
        </section>

        <!-- 演示二:选择模式(参数面板实时切换;多选无勾选框,accent 铺底) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupSelection }}</h3>
          <div class="demo-row">
            <WuiListBox
              :items="layers"
              :selection-mode="modeValue"
              aria-label="模板部件列表"
              :single-selection-follows-focus="followsValue"
              display-member-path="name"
              class="demo-list"
              @selection-changed="onSelectionChanged"
            />
            <span class="demo-echo demo-echo-column">
              <span>{{ labelSelectedItem }}: {{ selectionItemEcho }}</span>
              <span>{{ labelSelectedItems }} ({{ selectionSelected.length }}): {{ selectionItemsEcho }}</span>
            </span>
          </div>
          <p class="demo-hint">
            {{
              i18n.locale.value.startsWith('zh')
                ? 'ListBox 无 Multiple 勾选框(区别于 ListView):多选/区间选中一律以强调色铺底表达。'
                : 'ListBox has no Multiple check boxes (unlike ListView): multi/range selection is shown by accent background.'
            }}
          </p>
        </section>

        <!-- 演示三:自定义项模板(#item slot:字体族 + 预览样张两行项) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupTemplate }}</h3>
          <div class="demo-row">
            <WuiListBox
              :items="fontItems"
              v-model:selected-index="templateIndex"
              selection-mode="Single"
              aria-label="字体列表"
              display-member-path="family"
              class="demo-list"
            >
              <template #item="{ item }">
                <span class="font-item">
                  <span class="font-family">{{ (item as FontItem).family }}</span>
                  <span class="font-sample">{{ (item as FontItem).sample }}</span>
                </span>
              </template>
            </WuiListBox>
            <span class="demo-echo">
              {{ labelSelectedIndex }}: {{ templateIndex >= 0 ? templateIndex : '—' }}
            </span>
          </div>
        </section>

        <!-- 键盘操作说明 -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupKeyboard }}</h3>
          <ul class="keyboard-list">
            <li><kbd>↑</kbd>/<kbd>↓</kbd>/<kbd>Home</kbd>/<kbd>End</kbd> {{ i18n.locale.value.startsWith('zh') ? '移动焦点' : 'move focus' }}</li>
            <li><kbd>Ctrl</kbd>+{{ i18n.locale.value.startsWith('zh') ? '方向键' : 'arrows' }} {{ i18n.locale.value.startsWith('zh') ? '只移焦不选' : 'move focus only' }}</li>
            <li><kbd>Shift</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> {{ i18n.locale.value.startsWith('zh') ? '扩展区间' : 'extend range' }}</li>
            <li><kbd>Space</kbd> {{ i18n.locale.value.startsWith('zh') ? '选择/切换' : 'select/toggle' }}</li>
            <li><kbd>Ctrl</kbd>+<kbd>Space</kbd> {{ i18n.locale.value.startsWith('zh') ? '切换(Extended)' : 'toggle (Extended)' }}</li>
            <li><kbd>Ctrl</kbd>+<kbd>A</kbd> {{ i18n.locale.value.startsWith('zh') ? '全选' : 'select all' }}</li>
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
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsKeyboardTitle }}</h3>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.listbox-stage {
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

/* 容器自带 ChromeMediumLow 底色 + 0 边框(源样式默认),示例固定高度触发纵向滚动条 */
.demo-list {
  width: 296px;
  max-height: 280px;
}

.demo-echo {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-echo-column {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.demo-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示三:两行字体项(#item slot)—— */
.font-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.font-family {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.font-sample {
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
