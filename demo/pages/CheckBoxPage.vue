<script setup lang="ts">
// CheckBox 示例页:对照官方 WinUI Gallery CheckBoxPage(二态 / 三态 / 全选联动)。
// 上半区交互演示:参数面板实时调节「标签文字 / 三态 / 禁用 / 状态」,
// 下半区固定呈现属性、事件与用法代码(结构照抄已通过 QA 的 HomePage.vue 母版)。
import { computed, ref, watch } from 'vue'
import WuiCheckBox from '@/components/CheckBox.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(i18n 键集未覆盖,局部定义中英文案常量)——
const PAGE_TITLE: BilingualText = { zh: 'CheckBox', en: 'CheckBox' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI CheckBox 控件示例:二态与三态勾选、禁用态与「全选」联动。上半区参数实时调节,下半区为属性与事件文档。',
  en: 'WinUI CheckBox examples: two-state / three-state checks, disabled state and select-all linking. Options above, developer docs below.',
}
const TWO_STATE_TITLE: BilingualText = { zh: '二态 / 三态', en: 'Two-state / Three-state' }
const SELECT_ALL_TITLE: BilingualText = { zh: '全选联动(Select all)', en: 'Select all' }
const LABEL_CONTENT: BilingualText = { zh: '标签文字(Content)', en: 'Content' }
const LABEL_THREE_STATE: BilingualText = { zh: '三态(IsThreeState)', en: 'IsThreeState' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(Disabled)', en: 'Disabled' }
const LABEL_STATE: BilingualText = { zh: '状态(State)', en: 'State' }
const LABEL_LAST_EVENT: BilingualText = { zh: '最近事件', en: 'Last event' }
const STATE_CHECKED: BilingualText = { zh: '已勾选(checked)', en: 'Checked' }
const STATE_UNCHECKED: BilingualText = { zh: '未勾选(unchecked)', en: 'Unchecked' }
const STATE_INDETERMINATE: BilingualText = { zh: '不确定(indeterminate)', en: 'Indeterminate' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const twoStateTitle = useBilingual(i18n, TWO_STATE_TITLE)
const selectAllTitle = useBilingual(i18n, SELECT_ALL_TITLE)
const labelContent = useBilingual(i18n, LABEL_CONTENT)
const labelThreeState = useBilingual(i18n, LABEL_THREE_STATE)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelState = useBilingual(i18n, LABEL_STATE)
const labelLastEvent = useBilingual(i18n, LABEL_LAST_EVENT)
const stateCheckedText = useBilingual(i18n, STATE_CHECKED)
const stateUncheckedText = useBilingual(i18n, STATE_UNCHECKED)
const stateIndeterminateText = useBilingual(i18n, STATE_INDETERMINATE)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 演示一:二态 / 三态(参数面板实时调节)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoContent = ref<string | number | boolean>('Two-state CheckBox')
const demoThreeState = ref<string | number | boolean>(false)
const demoDisabled = ref<string | number | boolean>(false)
// 状态下拉与 checked 模型双向同步:下拉设置状态,点击勾选框后下拉回显当前态。
const demoState = ref<string | number | boolean>('unchecked')
const demoChecked = ref<boolean | 'indeterminate'>(false)
const lastEvent = ref('—')

const stateOptions = [
  { label: 'Unchecked', value: 'unchecked' },
  { label: 'Checked', value: 'checked' },
  { label: 'Indeterminate', value: 'indeterminate' },
]

const contentValue = computed(() => String(demoContent.value))
const isThreeStateValue = computed(() => demoThreeState.value === true)
const isDisabledValue = computed(() => demoDisabled.value === true)

watch(demoState, (value) => {
  demoChecked.value = value === 'checked' ? true : value === 'indeterminate' ? 'indeterminate' : false
})
watch(demoChecked, (value) => {
  demoState.value = value === true ? 'checked' : value === 'indeterminate' ? 'indeterminate' : 'unchecked'
})

const stateText = computed(() =>
  demoChecked.value === true
    ? stateCheckedText.value
    : demoChecked.value === 'indeterminate'
      ? stateIndeterminateText.value
      : stateUncheckedText.value,
)
const demoOutput = computed(
  () => `${labelState.value}: ${stateText.value} · ${labelLastEvent.value}: ${lastEvent.value}`,
)

function onDemoChecked(): void {
  lastEvent.value = 'checked'
}
function onDemoUnchecked(): void {
  lastEvent.value = 'unchecked'
}
function onDemoIndeterminate(): void {
  lastEvent.value = 'indeterminate'
}

// —— 演示二:全选联动(对照官方示例 SelectAll:父框三态,子框二态)——
// 父框是独立状态(而非纯派生值),子选项变化时按官方 SetCheckedState 推导同步。
// 官方语义下的四条路径:全不选→点击直接全选;全选→点击(点击环 勾选→不确定)
// → SelectAll_Indeterminate 编程置回未勾选 → 子框全部取消;混合→点击→全部取消;
// 子项变化→父框状态实时推导。
const selectAll = ref<boolean | 'indeterminate'>(false)
const optionStates = ref<boolean[]>([true, false, false])

watch(
  optionStates,
  (states) => {
    const allChecked = states.every((state) => state === true)
    const allUnchecked = states.every((state) => state === false)
    selectAll.value = allChecked ? true : allUnchecked ? false : 'indeterminate'
  },
  { deep: true, immediate: true },
)

function onSelectAllChange(next: boolean | 'indeterminate'): void {
  if (next === 'indeterminate') {
    // 与官方 SelectAll_Indeterminate 一致:全选后点击(点击环 勾选→不确定)→ 编程置回未勾选;
    // 官方注释说明该赋值会触发 SelectAll_Unchecked → 子框全部取消,此处直接一并落地。
    if (optionStates.value.every((state) => state === true)) {
      selectAll.value = false
      optionStates.value = optionStates.value.map(() => false)
    }
    return
  }
  // checked → 子框全选;unchecked(含混合态点击环 不确定→未勾选)→ 子框全部取消
  selectAll.value = next
  optionStates.value = optionStates.value.map(() => next === true)
}

function onOptionChange(index: number, next: boolean | 'indeterminate'): void {
  optionStates.value[index] = next === true
}

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['Content', 'string', "''", '勾选框右侧标签文字;默认 slot 兜底(slot 优先)'],
  ['checked (v-model)', "boolean | 'indeterminate'", 'false', '勾选状态;indeterminate 对应 WinUI IsChecked = null'],
  ['isThreeState', 'boolean', 'false', '是否允许用户点击进入不确定态(WinUI IsThreeState)'],
  ['disabled', 'boolean', 'false', '禁用交互(WinUI IsEnabled = false)'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent)', '点击勾选框时触发;禁用时不触发'],
  ['checked', '—', '交互后进入勾选态(WinUI Checked)'],
  ['unchecked', '—', '交互后进入未勾选态(WinUI Unchecked)'],
  ['indeterminate', '—', '交互后进入不确定态(WinUI Indeterminate)'],
  ['update:checked', "boolean | 'indeterminate'", 'v-model:checked 双向绑定更新'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiCheckBox
  Content="${contentValue.value}"
  v-model:checked="mainChecked"
  :is-three-state="${isThreeStateValue.value}"
  :disabled="${isDisabledValue.value}"
  @checked="onChecked"
  @unchecked="onUnchecked"
  @indeterminate="onIndeterminate" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="CheckBox">
    <template #demo>
      <div class="checkbox-stage">
        <section class="demo-group">
          <h4 class="group-title">{{ twoStateTitle }}</h4>
          <WuiCheckBox
            v-model:checked="demoChecked"
            :content="contentValue"
            :is-three-state="isThreeStateValue"
            :disabled="isDisabledValue"
            @checked="onDemoChecked"
            @unchecked="onDemoUnchecked"
            @indeterminate="onDemoIndeterminate"
          />
          <p class="demo-output">{{ demoOutput }}</p>
        </section>

        <section class="demo-group">
          <h4 class="group-title">{{ selectAllTitle }}</h4>
          <WuiCheckBox
            :checked="selectAll"
            content="Select all"
            :is-three-state="true"
            @update:checked="onSelectAllChange"
          />
          <div class="child-options">
            <WuiCheckBox
              v-for="(state, index) in optionStates"
              :key="index"
              :checked="state"
              :content="`Option ${index + 1}`"
              @update:checked="(next) => onOptionChange(index, next)"
            />
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelContent" type="text" v-model="demoContent" placeholder="CheckBox Content" />
        <DemoOptionRow :label="labelThreeState" type="toggle" v-model="demoThreeState" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelState" type="select" v-model="demoState" :options="stateOptions" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.checkbox-stage {
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

/* 对照官方示例的 Output TextBlock:轻量事件回显 */
.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 对照官方示例:子选项缩进 Margin="24,0,0,0",纵向堆叠(每个 32px 高) */
.child-options {
  display: flex;
  flex-direction: column;
  margin-left: 24px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
