<script setup lang="ts">
// RadioButton 示例页:对照官方 WinUI Gallery RadioButtonPage
// (示例一:单组 Option 1/2/3 + 输出回显;示例二:Background/Border 双组联动色块预览)。
// 上半区交互演示:基础互斥组(参数面板实时调节)、双组 groupName 联动、选项增删与禁用组;
// 下半区固定呈现属性、事件与用法代码(结构照抄已通过 QA 的 HomePage.vue 母版)。
import { computed, ref, watch } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiRadioButton from '@/components/RadioButton.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(i18n 键集未覆盖,局部定义中英文案常量)——
const PAGE_TITLE: BilingualText = { zh: 'RadioButton', en: 'RadioButton' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI RadioButton 控件示例:同组互斥与方向键切换、两组不同 groupName 的联动预览、选项增删与禁用组。上半区参数实时调节,下半区为属性与事件文档。',
  en: 'WinUI RadioButton examples: mutual exclusion with arrow-key navigation, two independent groupName groups, dynamic options and disabled group. Options above, developer docs below.',
}
const BASIC_TITLE: BilingualText = { zh: '基础组(互斥与键盘导航)', en: 'Basic group' }
const DUAL_TITLE: BilingualText = { zh: '双组联动(不同 GroupName)', en: 'Two independent groups' }
const DYNAMIC_TITLE: BilingualText = { zh: '选项增删(同父容器自动成组)', en: 'Add / remove options' }
const BG_HEADER: BilingualText = { zh: '背景(Background)', en: 'Background' }
const BORDER_HEADER: BilingualText = { zh: '边框(Border)', en: 'Border' }
const LABEL_GROUP_NAME: BilingualText = { zh: '组名(GroupName)', en: 'GroupName' }
const LABEL_DISABLED: BilingualText = { zh: '禁用整组(Disabled)', en: 'Disabled' }
const LABEL_SELECTED: BilingualText = { zh: '当前选中', en: 'Selected' }
const LABEL_SELECTED_VALUE: BilingualText = { zh: '选中值', en: 'Selected value' }
const LABEL_LAST_EVENT: BilingualText = { zh: '最近事件', en: 'Last event' }
const LABEL_NONE: BilingualText = { zh: '未选择', en: 'None' }
const ADD_OPTION: BilingualText = { zh: '添加选项', en: 'Add option' }
const REMOVE_OPTION: BilingualText = { zh: '移除末项', en: 'Remove last' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const basicTitle = useBilingual(i18n, BASIC_TITLE)
const dualTitle = useBilingual(i18n, DUAL_TITLE)
const dynamicTitle = useBilingual(i18n, DYNAMIC_TITLE)
const bgHeaderText = useBilingual(i18n, BG_HEADER)
const borderHeaderText = useBilingual(i18n, BORDER_HEADER)
const labelGroupName = useBilingual(i18n, LABEL_GROUP_NAME)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelSelected = useBilingual(i18n, LABEL_SELECTED)
const labelSelectedValue = useBilingual(i18n, LABEL_SELECTED_VALUE)
const labelLastEvent = useBilingual(i18n, LABEL_LAST_EVENT)
const noneText = useBilingual(i18n, LABEL_NONE)
const addOptionText = useBilingual(i18n, ADD_OPTION)
const removeOptionText = useBilingual(i18n, REMOVE_OPTION)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// ======================================================================
// 演示一:基础组(对照官方示例一 Option 1/2/3;参数面板实时调节)。
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
// ======================================================================
const basicOptions = ['Option 1', 'Option 2', 'Option 3']
const basicGroupName = ref<string | number | boolean>('basic-options')
const basicDisabled = ref<string | number | boolean>(false)
// 单一选中索引(-1 = 未选择,对应官方 Control1Output 初始文案 "Select an option.")
const basicSelected = ref(-1)
const lastEvent = ref('—')

const groupNameValue = computed(() => String(basicGroupName.value))
const isBasicDisabled = computed(() => basicDisabled.value === true)

// 「当前选中」下拉与组内选中态双向同步:下拉设置选中项,点击选项后下拉回显。
const basicSelectedChoice = ref<string | number | boolean>('-1')
const selectedChoices = computed(() => [
  { label: noneText.value, value: '-1' },
  ...basicOptions.map((label, index) => ({ label, value: String(index) })),
])

watch(basicSelectedChoice, (value) => {
  const index = Number(value)
  basicSelected.value = Number.isInteger(index) && index >= 0 ? index : -1
})
watch(basicSelected, (index) => {
  basicSelectedChoice.value = String(index)
})

function onBasicUpdate(index: number, value: boolean): void {
  if (value) basicSelected.value = index
  else if (basicSelected.value === index) basicSelected.value = -1
}
function onBasicChecked(index: number): void {
  lastEvent.value = `checked · ${basicOptions[index]}`
}
function onBasicUnchecked(index: number): void {
  lastEvent.value = `unchecked · ${basicOptions[index]}`
}

const basicSelectedText = computed(() =>
  basicSelected.value >= 0 ? basicOptions[basicSelected.value] : noneText.value,
)
const basicOutput = computed(
  () => `${labelSelectedValue.value}: ${basicSelectedText.value} · ${labelLastEvent.value}: ${lastEvent.value}`,
)

// ======================================================================
// 演示二:双组联动预览(对照官方示例二 Background/Border 两个 RadioButtons 组)。
// 取色对照官方 RadioButtonStrings.txt / RadioButtonPage.xaml.cs:
//   Background: Green→#008000、Yellow→#FFFF00、White→#FFFFFF;
//   Border: Green→DarkGreen #006400、Yellow→Gold #FFD700、White→#FFFFFF;
//   初始 Border 无选中时的默认底色 #FFFFFF / 描边 Gold #FFD700。
//   以上为官方示例的演示数据色,非控件主题色(控件本身仍全部走 --wui-* token)。
// ======================================================================
const COLOR_NAMES = ['Green', 'Yellow', 'White']
const BG_COLORS = ['#008000', '#ffff00', '#ffffff']
const BORDER_COLORS = ['#006400', '#ffd700', '#ffffff']
const DEFAULT_BACKGROUND = '#ffffff'
const DEFAULT_BORDER = '#ffd700'

// 官方初始:Background SelectedIndex=0(Green)、Border SelectedIndex=1(Yellow)
const bgSelected = ref(0)
const borderSelected = ref(1)

function onBgUpdate(index: number, value: boolean): void {
  if (value) bgSelected.value = index
  else if (bgSelected.value === index) bgSelected.value = -1
}
function onBorderUpdate(index: number, value: boolean): void {
  if (value) borderSelected.value = index
  else if (borderSelected.value === index) borderSelected.value = -1
}

const previewStyle = computed(() => ({
  background: bgSelected.value >= 0 ? BG_COLORS[bgSelected.value] : DEFAULT_BACKGROUND,
  borderColor: borderSelected.value >= 0 ? BORDER_COLORS[borderSelected.value] : DEFAULT_BORDER,
}))

function colorName(selected: number): string {
  return selected >= 0 ? COLOR_NAMES[selected] : noneText.value
}
const dualOutput = computed(
  () => `${bgHeaderText.value}: ${colorName(bgSelected.value)} · ${borderHeaderText.value}: ${colorName(borderSelected.value)}`,
)

// ======================================================================
// 演示三:选项增删(不传 groupName,同父容器实例自动成组,对应 WinUI 默认分组语义)。
// ======================================================================
interface DynamicOption {
  id: number
  label: string
}
let dynamicSeq = 3
const dynamicOptions = ref<DynamicOption[]>([
  { id: 1, label: '选项 A' },
  { id: 2, label: '选项 B' },
  { id: 3, label: '选项 C' },
])
const dynamicSelectedId = ref(2)

function addOption(): void {
  dynamicSeq += 1
  const letter = String.fromCharCode(65 + ((dynamicSeq - 1) % 26))
  dynamicOptions.value.push({ id: dynamicSeq, label: `选项 ${letter}` })
}
function removeOption(): void {
  if (dynamicOptions.value.length <= 1) return
  dynamicOptions.value.pop()
}
function onDynamicUpdate(option: DynamicOption, value: boolean): void {
  if (value) dynamicSelectedId.value = option.id
  else if (dynamicSelectedId.value === option.id) dynamicSelectedId.value = -1
}

const dynamicSelectedLabel = computed(() => {
  const selected = dynamicOptions.value.find((option) => option.id === dynamicSelectedId.value)
  return selected ? selected.label : noneText.value
})
const dynamicOutput = computed(
  () => `${labelSelectedValue.value}: ${dynamicSelectedLabel.value} · 共 ${dynamicOptions.value.length} 项`,
)

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['Content', 'string', "''", '选项文字;同名默认 slot 兜底(slot 内容优先)'],
  ['GroupName', 'string', "''", '组名:同名实例互斥(可跨容器);缺省时同父容器的实例自动成组'],
  ['checked (v-model)', 'boolean', 'false', '选中状态,双向绑定;同组其他选项被选中时自动回写为 false'],
  ['disabled', 'boolean', 'false', '禁用交互与焦点(WinUI IsEnabled = false)'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent)', '点击选项时触发;禁用时不触发(WinUI Click)'],
  ['checked', '—', '该选项进入选中态(WinUI Checked;仅用户交互触发)'],
  ['unchecked', '—', '该选项退出选中态;含同组其他选项被选中时的互斥回写(WinUI Unchecked)'],
  ['update:checked', 'boolean', 'v-model:checked 双向绑定更新'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiRadioButton
  Content="Option 1"
  GroupName="${groupNameValue.value !== '' ? groupNameValue.value : 'basic-options'}"
  v-model:checked="option1Checked"
  :disabled="${isBasicDisabled.value}"
  @checked="onChecked"
  @unchecked="onUnchecked" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="RadioButton">
    <template #demo>
      <div class="radio-stage">
        <!-- 演示一:基础组(互斥 + 方向键;参数面板实时调节) -->
        <section class="demo-group">
          <h3 class="group-title">{{ basicTitle }}</h3>
          <!-- 每个 .radio-column 是独立容器:无显式 groupName 时按父容器自动成组 -->
          <div class="radio-column">
            <WuiRadioButton
              v-for="(label, index) in basicOptions"
              :key="label"
              :checked="basicSelected === index"
              :content="label"
              :group-name="groupNameValue"
              :disabled="isBasicDisabled"
              @update:checked="(value) => onBasicUpdate(index, value)"
              @checked="onBasicChecked(index)"
              @unchecked="onBasicUnchecked(index)"
            />
          </div>
          <p class="demo-output">{{ basicOutput }}</p>
        </section>

        <!-- 演示二:双组联动(两组不同 groupName,对照官方示例二) -->
        <section class="demo-group">
          <h3 class="group-title">{{ dualTitle }}</h3>
          <div class="dual-groups">
            <div class="radio-column">
              <span class="column-header">{{ bgHeaderText }}</span>
              <WuiRadioButton
                v-for="(name, index) in COLOR_NAMES"
                :key="`bg-${name}`"
                :checked="bgSelected === index"
                :content="name"
                group-name="demo-background"
                @update:checked="(value) => onBgUpdate(index, value)"
              />
            </div>
            <div class="radio-column">
              <span class="column-header">{{ borderHeaderText }}</span>
              <WuiRadioButton
                v-for="(name, index) in COLOR_NAMES"
                :key="`border-${name}`"
                :checked="borderSelected === index"
                :content="name"
                group-name="demo-border"
                @update:checked="(value) => onBorderUpdate(index, value)"
              />
            </div>
          </div>
          <!-- 预览色块:对照官方 ControlOutput Border(Height=50 / BorderThickness=10) -->
          <div class="preview-box" :style="previewStyle"></div>
          <p class="demo-output">{{ dualOutput }}</p>
        </section>

        <!-- 演示三:选项增删(无 groupName,同父容器自动成组) -->
        <section class="demo-group">
          <h3 class="group-title">{{ dynamicTitle }}</h3>
          <div class="radio-column">
            <WuiRadioButton
              v-for="option in dynamicOptions"
              :key="option.id"
              :checked="dynamicSelectedId === option.id"
              :content="option.label"
              @update:checked="(value) => onDynamicUpdate(option, value)"
            />
          </div>
          <div class="dynamic-actions">
            <WuiButton :content="addOptionText" @click="addOption" />
            <WuiButton
              :content="removeOptionText"
              :disabled="dynamicOptions.length <= 1"
              @click="removeOption"
            />
          </div>
          <p class="demo-output">{{ dynamicOutput }}</p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelGroupName" type="text" v-model="basicGroupName" placeholder="basic-options" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="basicDisabled" />
        <DemoOptionRow
          :label="labelSelected"
          type="select"
          v-model="basicSelectedChoice"
          :options="selectedChoices"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.radio-stage {
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

/* 每组选项独立容器(自动分组按父容器判定);纵向堆叠,WinUI RadioButtons 默认 4px 间距 */
.radio-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.column-header {
  margin-bottom: 4px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 双组横排(官方 MaxColumns=3 的两组并排) */
.dual-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 48px;
}

/* 预览色块:对照官方 ControlOutput(H=50,描边 10px,Margin 0,10,0,10) */
.preview-box {
  box-sizing: border-box;
  width: 240px;
  height: 50px;
  margin: 2px 0;
  border: 10px solid;
}

.dynamic-actions {
  display: flex;
  gap: 8px;
}

/* 对照官方示例的 Output TextBlock:轻量事件回显 */
.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
