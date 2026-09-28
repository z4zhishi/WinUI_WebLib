<script setup lang="ts">
// ToggleButtonPage.vue —— ToggleButton 控件示例页(对应官方 WinUI Gallery Samples/ToggleButton/)。
// 结构照抄 HomePage.vue 母版:DemoPage(标题+描述)→ 交互演示(控件本体多配置)
// → DemoOptions(文本框/开关/下拉实时改参)→ DemoDocsTable + DemoCode。
// 上半区演示一对照官方 ToggleButtonSimple(On/Off 输出回显),演示二为组合态一览;
// 文案暂用中文双语文案常量(全站六语言在阶段 8 统一)。
import { computed, ref, watch } from 'vue'
import WuiToggleButton from '@/components/ToggleButton.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 ToggleButton 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'ToggleButton(切换按钮)', en: 'ToggleButton' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'ToggleButton 看起来像 Button,行为却像 CheckBox:在选中(开)与未选中(关)两种状态间切换;IsThreeState 为 true 时还可进入不确定态。通过 IsChecked 属性读取当前状态。',
  en: 'A ToggleButton looks like a Button, but works like a CheckBox: it toggles between checked (on) and unchecked (off), and can be indeterminate when IsThreeState is true. Read its state via IsChecked.',
}
const BASIC_TITLE: BilingualText = { zh: '基础用法(On / Off)', en: 'Basic (On / Off)' }
const STATES_TITLE: BilingualText = { zh: '组合状态一览', en: 'State gallery' }
const LABEL_CONTENT: BilingualText = { zh: '按钮文本(Content)', en: 'Content' }
const LABEL_THREE_STATE: BilingualText = { zh: '三态(IsThreeState)', en: 'IsThreeState' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(Disabled)', en: 'Disabled' }
const LABEL_STATE: BilingualText = { zh: '状态(State)', en: 'State' }
const LABEL_CURRENT_STATE: BilingualText = { zh: '当前状态', en: 'Current state' }
const LABEL_LAST_EVENT: BilingualText = { zh: '最近事件', en: 'Last event' }
const STATE_CHECKED: BilingualText = { zh: 'On(选中)', en: 'On (checked)' }
const STATE_UNCHECKED: BilingualText = { zh: 'Off(未选中)', en: 'Off (unchecked)' }
const STATE_INDETERMINATE: BilingualText = { zh: '不确定(indeterminate)', en: 'Indeterminate' }
const PROPS_TABLE_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const EVENTS_TABLE_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const basicTitle = useBilingual(i18n, BASIC_TITLE)
const statesTitle = useBilingual(i18n, STATES_TITLE)
const labelContent = useBilingual(i18n, LABEL_CONTENT)
const labelThreeState = useBilingual(i18n, LABEL_THREE_STATE)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelState = useBilingual(i18n, LABEL_STATE)
const labelCurrentState = useBilingual(i18n, LABEL_CURRENT_STATE)
const labelLastEvent = useBilingual(i18n, LABEL_LAST_EVENT)
const stateCheckedText = useBilingual(i18n, STATE_CHECKED)
const stateUncheckedText = useBilingual(i18n, STATE_UNCHECKED)
const stateIndeterminateText = useBilingual(i18n, STATE_INDETERMINATE)
const propsTableTitle = useBilingual(i18n, PROPS_TABLE_TITLE)
const eventsTableTitle = useBilingual(i18n, EVENTS_TABLE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 演示一:基础用法(参数面板实时调节,对照官方 ToggleButtonSimple)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoContent = ref<string | number | boolean>('ToggleButton')
const demoThreeState = ref<string | number | boolean>(false)
const demoDisabled = ref<string | number | boolean>(false)
// 状态下拉与 checked 模型双向同步:下拉设置状态,点击按钮后下拉回显当前态。
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

// 对照官方示例的 Control1Output:Checked → "On",Unchecked → "Off"。
const stateText = computed(() =>
  demoChecked.value === true
    ? stateCheckedText.value
    : demoChecked.value === 'indeterminate'
      ? stateIndeterminateText.value
      : stateUncheckedText.value,
)
const demoOutput = computed(
  () => `${labelCurrentState.value}: ${stateText.value} · ${labelLastEvent.value}: ${lastEvent.value}`,
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

// —— 演示二:组合状态一览(Unchecked/Checked × Normal/Disabled + Indeterminate)——
// 各按钮独立持有状态,直观对照 generic.xaml 组合态视觉(源模板 checked 分支的状态色)。
const galleryChecked = ref<boolean | 'indeterminate'>(true)
const galleryThreeState = ref<boolean | 'indeterminate'>('indeterminate')
const galleryDisabledChecked = ref<boolean | 'indeterminate'>(true)

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Content', 'string', "''", '按钮文本内容;同名默认 slot 兜底(slot 优先)'],
  ['checked (v-model)', "boolean | 'indeterminate'", 'false', '选中状态;indeterminate 对应 WinUI IsChecked = null'],
  ['isThreeState', 'boolean', 'false', '是否允许用户点击进入不确定态(WinUI IsThreeState)'],
  ['disabled', 'boolean', 'false', '禁用交互(WinUI IsEnabled = false)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent)', '点击按钮时触发(鼠标左键,或聚焦后按 Space/Enter 键);禁用时不触发'],
  ['checked', '—', '交互后进入选中态(WinUI Checked)'],
  ['unchecked', '—', '交互后进入未选中态(WinUI Unchecked)'],
  ['indeterminate', '—', '交互后进入不确定态(WinUI Indeterminate)'],
  ['update:checked', "boolean | 'indeterminate'", 'v-model:checked 双向绑定更新'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiToggleButton
  Content="${contentValue.value}"
  v-model:checked="isChecked"
  :is-three-state="${isThreeStateValue.value}"
  :disabled="${isDisabledValue.value}"
  @checked="onChecked"
  @unchecked="onUnchecked"
  @indeterminate="onIndeterminate" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="toggle-stage">
        <!-- 演示一:基础用法,参数由左侧面板实时驱动(对应官方 ToggleButtonSimple 示例) -->
        <section class="demo-group">
          <h4 class="group-title">{{ basicTitle }}</h4>
          <WuiToggleButton
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

        <!-- 演示二:组合状态一览(未选中/选中 × 正常/禁用 + 三态不确定) -->
        <section class="demo-group">
          <h4 class="group-title">{{ statesTitle }}</h4>
          <div class="state-gallery">
            <WuiToggleButton content="Off(默认)" />
            <WuiToggleButton v-model:checked="galleryChecked" content="On(已选中)" />
            <WuiToggleButton v-model:checked="galleryThreeState" content="Indeterminate" :is-three-state="true" />
            <WuiToggleButton content="Disabled" disabled />
            <WuiToggleButton v-model:checked="galleryDisabledChecked" content="On + Disabled" disabled />
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelContent" type="text" v-model="demoContent" placeholder="ToggleButton Content" />
        <DemoOptionRow :label="labelThreeState" type="toggle" v-model="demoThreeState" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelState" type="select" v-model="demoState" :options="stateOptions" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ propsTableTitle }}</h4>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h4 class="docs-subtitle">{{ eventsTableTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.toggle-stage {
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

/* 对照官方示例的 Output TextBlock:轻量状态/事件回显 */
.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 组合状态一览:横向排列(XAML StackPanel Orientation=Horizontal 间距 8) */
.state-gallery {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
