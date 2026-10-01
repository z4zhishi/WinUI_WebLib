<script setup lang="ts">
// ProgressBar 示例页:对照 WinUI Gallery ProgressBarPage 的两个官方示例 ——
//   示例 1:不确定态进度条 + Progress state(Running/Paused/Error)RadioButtons 组;
//   示例 2:确定态进度条 + 实时调值控件(官方为 NumberBox,此处复用本站 Slider 组件)。
// 主进度条的参数面板(Value/Minimum/Maximum/IsIndeterminate/ShowError/ShowPaused)实时驱动,
// 下半区为属性/事件文档与用法代码。
import { computed, ref } from 'vue'
import WuiProgressBar from '@/components/ProgressBar.vue'
import type { ProgressBarValueChangedEventArgs } from '@/components/ProgressBar.vue'
import WuiRadioButton from '@/components/RadioButton.vue'
import WuiSlider from '@/components/Slider.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ProgressBar(进度条)', en: 'ProgressBar' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'ProgressBar 有两种视觉形态:不确定(Indeterminate)——表示任务正在进行,但不阻止用户交互;确定(Determinate)——表示已知工作量下已完成的进度。',
  en: "The ProgressBar has two different visual representations: Indeterminate - shows that a task is ongoing, but doesn't block user interaction; Determinate - shows how much progress has been made on a known amount of work.",
}
const MAIN_LABEL: BilingualText = { zh: '主进度条(参数面板实时驱动)', en: 'Main (driven by the options panel)' }
const INDETERMINATE_LABEL: BilingualText = {
  zh: '不确定态(对照官方示例的 Running / Paused / Error 状态组)',
  en: 'Indeterminate (official example: Running / Paused / Error)',
}
const DETERMINATE_LABEL: BilingualText = { zh: '确定态(对照官方示例的调值组合)', en: 'Determinate (official example: value control)' }
const LIVE_VALUE_LABEL: BilingualText = { zh: '当前值', en: 'Value' }
const EVENT_LABEL: BilingualText = { zh: '最近一次 valueChanged', en: 'Last valueChanged' }
const NO_EVENT_HINT: BilingualText = { zh: '尚未触发', en: 'Not fired yet' }
const PROGRESS_LABEL: BilingualText = { zh: 'Progress', en: 'Progress' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const mainLabel = useBilingual(i18n, MAIN_LABEL)
const indeterminateLabel = useBilingual(i18n, INDETERMINATE_LABEL)
const determinateLabel = useBilingual(i18n, DETERMINATE_LABEL)
const liveValueLabel = useBilingual(i18n, LIVE_VALUE_LABEL)
const eventLabel = useBilingual(i18n, EVENT_LABEL)
const noEventHint = useBilingual(i18n, NO_EVENT_HINT)
const progressLabel = useBilingual(i18n, PROGRESS_LABEL)

// —— 可调参数(DemoOptionRow 的 v-model 契约:联合类型) ——
const value = ref<string | number | boolean>(35)
const minimum = ref<string | number | boolean>(0)
const maximum = ref<string | number | boolean>(100)
const isIndeterminate = ref<string | number | boolean>(false)
const showError = ref<string | number | boolean>(false)
const showPaused = ref<string | number | boolean>(false)

function toNumber(input: string | number | boolean, fallback: number): number {
  const parsed = Number(input)
  return Number.isFinite(parsed) ? parsed : fallback
}

const valueNumber = computed(() => toNumber(value.value, 0))
const minimumValue = computed(() => toNumber(minimum.value, 0))
const maximumValue = computed(() => toNumber(maximum.value, 100))
const isIndeterminateValue = computed(() => isIndeterminate.value === true)
const showErrorValue = computed(() => showError.value === true)
const showPausedValue = computed(() => showPaused.value === true)

// —— 演示状态:主进度条 + 官方示例两组 ——
const lastEvent = ref<ProgressBarValueChangedEventArgs | null>(null)

function onMainValueChanged(event: ProgressBarValueChangedEventArgs): void {
  lastEvent.value = event
  // 回写参数面板,保证滑块与钳制后的值一致(minimum/maximum 变化引发钳制时同样触发)
  value.value = event.newValue
}

const eventText = computed(() => {
  const e = lastEvent.value
  return e ? `${e.oldValue} → ${e.newValue}` : ''
})

// 官方示例 1:Progress state(Running / Paused / Error)→ ShowError / ShowPaused
type OfficialState = 'running' | 'paused' | 'error'
const officialState = ref<OfficialState>('running')
const officialShowError = computed(() => officialState.value === 'error')
const officialShowPaused = computed(() => officialState.value === 'paused')

// 官方示例 2:确定态进度条 + 实时滑块(官方为 NumberBox 0-100)
const officialValue = ref(0)

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '默认值', '说明']
const docsRows: (string | number)[][] = [
  ['value', 'number(v-model:value)', '0', '当前值;变更(含被 minimum/maximum 钳制)时触发 valueChanged'],
  ['minimum', 'number', '0', '最小值'],
  ['maximum', 'number', '100', '最大值(小于 minimum 时区间收敛,指示条宽度为 0)'],
  ['isIndeterminate', 'boolean', 'false', '不确定态:双指示条往复动画,不反映具体进度,aria 不报值'],
  ['showError', 'boolean', 'false', '错误态:指示条变红;不确定态下为红色满宽 + 脉冲'],
  ['showPaused', 'boolean', 'false', '暂停态:指示条变黄;不确定态下停止往复(黄色满宽 + 脉冲)'],
  ['padding', 'string | number', "''", '内边距(WinUI Padding;数字按 px)'],
  ['valueChanged', '(e: { oldValue: number; newValue: number }) => void', '—', '值变化时触发;程序赋值与钳制重算同样触发(与 WinUI 一致)'],
  ['update:value', '(value: number) => void', '—', 'v-model:value 双向绑定事件'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」映射。
const usageCode = computed(
  () => `<WuiProgressBar
  v-model:value="value"
  :minimum="${minimumValue.value}"
  :maximum="${maximumValue.value}"
  :is-indeterminate="${isIndeterminateValue.value}"
  :show-error="${showErrorValue.value}"
  :show-paused="${showPausedValue.value}"
  @value-changed="onValueChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ProgressBar">
    <template #demo>
      <div class="progressbar-stage">
        <!-- 主进度条:全部参数由参数面板实时驱动 -->
        <div class="progressbar-item">
          <p class="progressbar-label">{{ mainLabel }}</p>
          <WuiProgressBar
            :value="valueNumber"
            :minimum="minimumValue"
            :maximum="maximumValue"
            :is-indeterminate="isIndeterminateValue"
            :show-error="showErrorValue"
            :show-paused="showPausedValue"
            :aria-label="mainLabel"
            @value-changed="onMainValueChanged"
          />
          <p class="progressbar-readout">
            {{ liveValueLabel }}: <strong>{{ valueNumber }}</strong>
            <span class="progressbar-event">{{ eventLabel }}: {{ lastEvent ? eventText : noEventHint }}</span>
          </p>
        </div>

        <!-- 官方示例 1:不确定态 + Running/Paused/Error 状态组(RadioButtons) -->
        <div class="progressbar-item">
          <p class="progressbar-label">{{ indeterminateLabel }}</p>
          <WuiProgressBar
            class="progressbar-official"
            :is-indeterminate="true"
            :show-error="officialShowError"
            :show-paused="officialShowPaused"
            :aria-label="indeterminateLabel"
          />
          <div class="progressbar-radio-group" role="radiogroup" aria-label="Progress state">
            <WuiRadioButton
              content="Running"
              group-name="progressbar-state"
              :checked="officialState === 'running'"
              @checked="officialState = 'running'"
            />
            <WuiRadioButton
              content="Paused"
              group-name="progressbar-state"
              :checked="officialState === 'paused'"
              @checked="officialState = 'paused'"
            />
            <WuiRadioButton
              content="Error"
              group-name="progressbar-state"
              :checked="officialState === 'error'"
              @checked="officialState = 'error'"
            />
          </div>
        </div>

        <!-- 官方示例 2:确定态 + 实时调值(官方 NumberBox 0-100 → 本站 Slider) -->
        <div class="progressbar-item">
          <p class="progressbar-label">{{ determinateLabel }}</p>
          <div class="progressbar-determinate-row">
            <WuiProgressBar
              class="progressbar-official"
              :value="officialValue"
              :minimum="0"
              :maximum="100"
              :aria-label="determinateLabel"
            />
            <span class="progressbar-output">{{ officialValue }}</span>
            <span class="progressbar-output-label">{{ progressLabel }}</span>
          </div>
          <div class="progressbar-slider-row">
            <WuiSlider v-model:value="officialValue" :minimum="0" :maximum="100" aria-label="进度值" />
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Value" type="slider" v-model="value" :min="0" :max="100" :step="1" />
        <DemoOptionRow label="IsIndeterminate 不确定态" type="toggle" v-model="isIndeterminate" />
        <DemoOptionRow label="Minimum" type="number" v-model="minimum" :min="-100" :max="100" />
        <DemoOptionRow label="Maximum" type="number" v-model="maximum" :min="0" :max="1000" />
        <DemoOptionRow label="ShowError 错误态" type="toggle" v-model="showError" />
        <DemoOptionRow label="ShowPaused 暂停态" type="toggle" v-model="showPaused" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.progressbar-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 32px;
  width: 100%;
  max-width: 420px;
}

.progressbar-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progressbar-label {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.progressbar-readout {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.progressbar-readout strong {
  color: var(--wui-application-header-foreground-theme);
  font-weight: 600;
}

.progressbar-event {
  margin-left: 16px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

/* 官方示例的固定宽度:XAML Width="130" */
.progressbar-official {
  width: 130px;
}

.progressbar-radio-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.progressbar-determinate-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progressbar-output {
  min-width: 40px;
  text-align: center;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.progressbar-output-label {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.progressbar-slider-row {
  width: 100%;
  max-width: 280px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
