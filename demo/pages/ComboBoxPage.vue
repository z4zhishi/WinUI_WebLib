<script setup lang="ts">
// ComboBox 示例页:对照官方 WinUI Gallery ComboBoxPage
// (ComboBoxInline / ComboBoxItemsSource / ComboBoxEditable 三例 + 禁用态),
// 附键盘操作说明。上半区交互演示 + 参数面板(Header/Placeholder/禁用/程序开关实时调节),
// 下半区为属性、事件、键盘交互与用法代码(结构照抄已通过 QA 的 MenuFlyoutPage 母版)。
import { computed, ref, watch } from 'vue'
import WuiComboBox from '@/components/ComboBox.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ComboBox', en: 'ComboBox' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI ComboBox 控件示例:节省空间的下拉选择器,支持对象数组绑定、可编辑过滤模式与键盘导航(上下/Home/End/首字母跳转)。上半区参数实时调节,下半区为控件文档。',
  en: 'WinUI ComboBox examples: space-saving drop-down with object binding, editable filter mode and keyboard navigation. Options above, docs below.',
}
const GROUP_BASIC: BilingualText = { zh: '基础选择(SelectionChanged 实时回显)', en: 'Basic selection (SelectionChanged echo)' }
const GROUP_OBJECTS: BilingualText = { zh: '对象数组绑定(DisplayMemberPath + SelectedIndex)', en: 'Object items (DisplayMemberPath + SelectedIndex)' }
const GROUP_EDITABLE: BilingualText = { zh: '可编辑过滤(IsEditable,输入即过滤,Enter 提交自由文本)', en: 'Editable filter (IsEditable, type to filter, Enter submits free text)' }
const GROUP_DISABLED: BilingualText = { zh: '禁用态', en: 'Disabled' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘操作', en: 'Keyboard interaction' }
const LABEL_HEADER: BilingualText = { zh: '标头(Header)', en: 'Header' }
const LABEL_PLACEHOLDER: BilingualText = { zh: '占位文本(PlaceholderText)', en: 'PlaceholderText' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(Disabled)', en: 'Disabled' }
const LABEL_IS_OPEN: BilingualText = { zh: '程序开关(IsDropDownOpen)', en: 'IsDropDownOpen' }
const LABEL_SELECTED: BilingualText = { zh: '当前选中', en: 'Selected' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupBasic = useBilingual(i18n, GROUP_BASIC)
const groupObjects = useBilingual(i18n, GROUP_OBJECTS)
const groupEditable = useBilingual(i18n, GROUP_EDITABLE)
const groupDisabled = useBilingual(i18n, GROUP_DISABLED)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelHeader = useBilingual(i18n, LABEL_HEADER)
const labelPlaceholder = useBilingual(i18n, LABEL_PLACEHOLDER)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelIsOpen = useBilingual(i18n, LABEL_IS_OPEN)
const labelSelected = useBilingual(i18n, LABEL_SELECTED)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 参数面板(作用于演示一)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoHeader = ref<string | number | boolean>('Colors')
const demoPlaceholder = ref<string | number | boolean>('Pick a color')
const demoDisabled = ref<string | number | boolean>(false)
const demoIsOpen = ref<string | number | boolean>(false)

const headerValue = computed(() => String(demoHeader.value))
const placeholderValue = computed(() => String(demoPlaceholder.value))
const disabledValue = computed(() => demoDisabled.value === true)
// 程序开关 → 面板模型;面板自身关闭(轻扫/选中/Esc)时回写开关状态(MenuFlyoutPage 同款桥接)
const demoIsOpenModel = ref(false)
watch(
  demoIsOpen,
  (value) => {
    demoIsOpenModel.value = value === true
  },
  { immediate: true },
)
watch(demoIsOpenModel, (value) => {
  demoIsOpen.value = value
})

// —— 演示一:基础选择(对照官方 ComboBoxInline:Blue/Green/Red/Yellow + 色块回显)——
const colors = ['Blue', 'Green', 'Red', 'Yellow']
const COLOR_HEX: Record<string, string> = {
  Blue: '#0063b1',
  Green: '#107c10',
  Red: '#c42b1c',
  Yellow: '#ffe869',
}
const basicIndex = ref(-1)
const basicItem = ref<unknown>(null)
const basicSwatch = computed(() => {
  const name = typeof basicItem.value === 'string' ? basicItem.value : ''
  return COLOR_HEX[name] ?? 'transparent'
})

function onBasicSelectionChanged(index: number, item: unknown): void {
  basicIndex.value = index
  basicItem.value = item
}

// —— 演示二:对象数组绑定(对照官方 ComboBoxItemsSource:字体列表 + 字体回显)——
interface FontItem {
  name: string
  family: string
}
const fonts: FontItem[] = [
  { name: 'Cambria', family: 'Cambria, serif' },
  { name: 'Candara', family: 'Candara, sans-serif' },
  { name: 'Comic Sans MS', family: "'Comic Sans MS', cursive" },
  { name: 'Consolas', family: 'Consolas, monospace' },
  { name: 'Constantia', family: 'Constantia, serif' },
  { name: 'Segoe UI', family: "'Segoe UI', sans-serif" },
]
const fontIndex = ref(2)
const fontItem = ref<unknown>(fonts[2])
const fontEchoStyle = computed(() => ({
  fontFamily:
    fontItem.value && typeof fontItem.value === 'object'
      ? (fontItem.value as FontItem).family
      : 'inherit',
}))

function onFontSelectionChanged(_index: number, item: unknown): void {
  fontItem.value = item
}

// —— 演示三:可编辑过滤(对照官方 ComboBoxEditable:字号列表 + 字号回显)——
const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 32, 48, 64]
const editableText = ref('')
const editableItem = ref<unknown>(null)
const editableEcho = computed(() => {
  const parsed = Number(editableText.value)
  return Number.isFinite(parsed) && editableText.value !== '' ? parsed : 14
})
const editableEchoValid = computed(
  () => Number.isFinite(Number(editableText.value)) && editableText.value !== '',
)

function onEditableSelectionChanged(_index: number, item: unknown): void {
  editableItem.value = item
}

// —— 演示四:禁用态 ——
const disabledColors = ['Blue', 'Green', 'Red', 'Yellow']
const disabledIndex = ref(0)

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['items', 'unknown[]', '[]', '数据源数组(WinUI ItemsSource),元素可为字符串/数字/对象'],
  ['selectedItem (v-model)', 'unknown', 'null', '选中项(WinUI SelectedItem),双向绑定'],
  ['selectedIndex (v-model)', 'number', '-1', '选中项索引(WinUI SelectedIndex,未选 -1),双向绑定'],
  ['isDropDownOpen (v-model)', 'boolean', 'false', '下拉开关(WinUI IsDropDownOpen),双向绑定'],
  ['text (v-model)', 'string', "''", '可编辑模式文本(WinUI ComboBox.Text),双向绑定'],
  ['header', 'string', "''", '输入框上方标头文本(WinUI Header)'],
  ['placeholderText', 'string', "''", '未选中时显示的占位文本(WinUI PlaceholderText)'],
  ['isEditable', 'boolean', 'false', '可编辑过滤模式(WinUI IsEditable):输入即过滤,Enter 提交自由文本'],
  ['displayMemberPath', 'string', "''", "对象项的显示字段(WinUI DisplayMemberPath),如 'name'"],
  ['maxDropDownHeight', 'number', '504', '下拉面板最大高度 px(WinUI MaxDropDownHeight)'],
  ['disabled', 'boolean', 'false', '禁用态,样式对照 Disabled 视觉状态'],
  ['#item slot', "slot '{ item: unknown; index: number }'", '—', '自定义项模板(WinUI ItemTemplate);缺省渲染显示文本'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['selectionChanged', '(selectedIndex: number, selectedItem: unknown)', '选中项变化时(含程序化赋值;未选为 -1/null)'],
  ['textChanged', '(value: string)', '可编辑文本变化时(输入即触发)'],
  ['dropDownOpened / dropDownClosed', '—', '下拉面板打开完成 / 关闭后'],
  ['update:isDropDownOpen 等', '(value)', '四个双向绑定模型各自的更新事件'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['Enter / Space / ↓ / ↑', '关闭态:打开下拉(高亮当前选中项)'],
  ['↓ / ↑', '打开态:在列表项间循环移动'],
  ['Home / End', '打开态:移动到首 / 末项(可编辑模式让位给文本插入符)'],
  ['Enter / Space', '打开态:选中当前高亮项并收起'],
  ['Esc', '关闭下拉;可编辑模式撤销未提交输入(回退到选中项文本)'],
  ['Tab', '关闭下拉,焦点自然移动'],
  ['字符键(type-ahead)', '首字母跳转:从当前项之后循环匹配;关闭态命中即改选中,打开态只移高亮、Enter 提交;连打 1 秒内合并成串'],
]

const usageCode = computed(
  () => `<WuiComboBox
  v-model:selected-item="color"
  :items="['Blue', 'Green', 'Red', 'Yellow']"
  header="${headerValue.value}"
  placeholder-text="${placeholderValue.value}"
  :disabled="${disabledValue.value}"
  @selection-changed="onSelectionChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="combobox-stage">
        <!-- 演示一:基础选择(参数面板实时调节 Header/Placeholder/禁用/程序开关) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupBasic }}</h4>
          <div class="demo-row">
            <WuiComboBox
              v-model:is-drop-down-open="demoIsOpenModel"
              v-model:selected-index="basicIndex"
              :items="colors"
              :header="headerValue"
              :placeholder-text="placeholderValue"
              :disabled="disabledValue"
              style="width: 200px"
              @selection-changed="onBasicSelectionChanged"
            />
            <span
              class="color-swatch"
              :style="{ background: basicSwatch }"
              aria-hidden="true"
            ></span>
          </div>
          <p class="demo-output">
            {{ labelSelected }}: {{ basicIndex >= 0 ? `${basicIndex} (${String(basicItem)})` : '—' }}
          </p>
        </section>

        <!-- 演示二:对象数组绑定(DisplayMemberPath,SelectedIndex 默认 2) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupObjects }}</h4>
          <div class="demo-row">
            <WuiComboBox
              v-model:selected-index="fontIndex"
              :items="fonts"
              display-member-path="name"
              header="Font"
              :placeholder-text="placeholderValue"
              style="min-width: 200px"
              @selection-changed="onFontSelectionChanged"
            />
          </div>
          <p class="demo-output font-echo" :style="fontEchoStyle">
            You can set the font used for this text.
          </p>
        </section>

        <!-- 演示三:可编辑过滤(输入即过滤;Enter 命中选中 / 未命中提交自由文本) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupEditable }}</h4>
          <div class="demo-row">
            <WuiComboBox
              v-model:text="editableText"
              :items="fontSizes"
              is-editable
              header="Font Size"
              placeholder-text="Type to filter"
              @selection-changed="onEditableSelectionChanged"
            />
            <span class="demo-echo">
              text = “{{ editableText }}” · item = {{ editableItem === null ? '—' : String(editableItem) }}
            </span>
          </div>
          <p
            class="demo-output font-echo"
            :style="{ fontSize: `${editableEcho}px`, opacity: editableEchoValid ? 1 : 0.5 }"
          >
            You can set the font size used for this text.
          </p>
        </section>

        <!-- 演示四:禁用态(带选中值,对照 Disabled 视觉状态) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupDisabled }}</h4>
          <div class="demo-row">
            <WuiComboBox
              v-model:selected-index="disabledIndex"
              :items="disabledColors"
              header="Colors"
              :disabled="true"
              style="width: 200px"
            />
            <WuiComboBox
              :items="disabledColors"
              header="Colors"
              placeholder-text="Pick a color"
              :disabled="true"
              style="width: 200px"
            />
          </div>
        </section>

        <!-- 键盘操作说明 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupKeyboard }}</h4>
          <ul class="keyboard-list">
            <li><kbd>Enter</kbd>/<kbd>Space</kbd>/<kbd>↓</kbd>/<kbd>↑</kbd> {{ i18n.locale.value.startsWith('zh') ? '打开下拉' : 'open dropdown' }}</li>
            <li><kbd>↓</kbd>/<kbd>↑</kbd> {{ i18n.locale.value.startsWith('zh') ? '循环导航' : 'move focus' }}</li>
            <li><kbd>Home</kbd>/<kbd>End</kbd> {{ i18n.locale.value.startsWith('zh') ? '首/末项' : 'first/last item' }}</li>
            <li><kbd>Enter</kbd>/<kbd>Space</kbd> {{ i18n.locale.value.startsWith('zh') ? '选中高亮项' : 'select item' }}</li>
            <li><kbd>Esc</kbd> {{ i18n.locale.value.startsWith('zh') ? '关闭/撤销输入' : 'close/revert text' }}</li>
            <li>{{ i18n.locale.value.startsWith('zh') ? '字母键' : 'letter keys' }} {{ i18n.locale.value.startsWith('zh') ? '首字母跳转(关闭态改选中,打开态移高亮)' : 'type-ahead (selects when closed, highlights when open)' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelHeader" type="text" v-model="demoHeader" />
        <DemoOptionRow :label="labelPlaceholder" type="text" v-model="demoPlaceholder" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelIsOpen" type="toggle" v-model="demoIsOpen" />
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
.combobox-stage {
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

/* 对照官方示例的输出区:色块(100x30)+ 文本回显 */
.color-swatch {
  display: inline-block;
  width: 100px;
  height: 30px;
  border: 1px solid var(--wui-combo-box-border);
}

.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.font-echo {
  font-size: var(--wui-control-content-theme-font-size);
}

.demo-echo {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.keyboard-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
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
