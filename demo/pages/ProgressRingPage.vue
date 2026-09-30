<script setup lang="ts">
// ProgressRing 示例页:对照 WinUI Gallery ProgressRingPage 的两个官方示例 ——
//   示例 1:不确定态进度环(60×60)+ ToggleSwitch("Progress Options",OnContent=Working /
//   OffContent=Do work)实时驱动 IsActive;示例 2:确定态进度环(60×60,IsIndeterminate=false)
//   + 0-100 调值控件(官方为 NumberBox,此处复用本站 Slider)。
// 主进度环的参数面板(Value/Minimum/Maximum/IsIndeterminate/IsActive/Size)实时驱动,
// 下半区为属性/事件文档与用法代码。
import { computed, ref } from 'vue'
import WuiProgressRing from '@/components/ProgressRing.vue'
import type { ProgressRingValueChangedEventArgs } from '@/components/ProgressRing.vue'
import WuiSlider from '@/components/Slider.vue'
import WuiToggleSwitch from '@/components/ToggleSwitch.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ProgressRing(进度环)', en: 'ProgressRing' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'ProgressRing 有两种视觉形态:不确定(Indeterminate)——表示任务正在进行,并且会阻止用户交互(阻塞式加载);确定(Determinate)——表示已知工作量下已完成的进度。',
  en: "The ProgressRing has two different visual representations:\nIndeterminate - shows that a task is ongoing, but blocks user interaction.\nDeterminate - shows how much progress has been made on a known amount of work.",
}
const MAIN_LABEL: BilingualText = { zh: '主进度环(参数面板实时驱动)', en: 'Main (driven by the options panel)' }
const INDETERMINATE_LABEL: BilingualText = {
  zh: '不确定态(对照官方示例:IsActive 跟随开关)',
  en: 'Indeterminate (official example: IsActive follows the switch)',
}
const DETERMINATE_LABEL: BilingualText = { zh: '确定态(对照官方示例的调值组合)', en: 'Determinate (official example: value control)' }
const LIVE_VALUE_LABEL: BilingualText = { zh: '当前值', en: 'Value' }
const EVENT_LABEL: BilingualText = { zh: '最近一次 valueChanged', en: 'Last valueChanged' }
const NO_EVENT_HINT: BilingualText = { zh: '尚未触发', en: 'Not fired yet' }
const PROGRESS_LABEL: BilingualText = { zh: 'Progress', en: 'Progress' }
const SWITCH_HEADER: BilingualText = { zh: 'Progress Options', en: 'Progress Options' }
const SWITCH_ON: BilingualText = { zh: 'Working', en: 'Working' }
const SWITCH_OFF: BilingualText = { zh: 'Do work', en: 'Do work' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const mainLabel = useBilingual(i18n, MAIN_LABEL)
const indeterminateLabel = useBilingual(i18n, INDETERMINATE_LABEL)
const determinateLabel = useBilingual(i18n, DETERMINATE_LABEL)
const liveValueLabel = useBilingual(i18n, LIVE_VALUE_LABEL)
const eventLabel = useBilingual(i18n, EVENT_LABEL)
const noEventHint = useBilingual(i18n, NO_EVENT_HINT)
const progressLabel = useBilingual(i18n, PROGRESS_LABEL)
const switchHeader = useBilingual(i18n, SWITCH_HEADER)
const switchOn = useBilingual(i18n, SWITCH_ON)
const switchOff = useBilingual(i18n, SWITCH_OFF)

// —— 可调参数(DemoOptionRow 的 v-model 契约:联合类型) ——
const value = ref<string | number | boolean>(30)
const minimum = ref<string | number | boolean>(0)
const maximum = ref<string | number | boolean>(100)
const isIndeterminate = ref<string | number | boolean>(true)
const isActive = ref<string | number | boolean>(true)
const size = ref<string | number | boolean>(32)

function toNumber(input: string | number | boolean, fallback: number): number {
  const parsed = Number(input)
  return Number.isFinite(parsed) ? parsed : fallback
}

const valueNumber = computed(() => toNumber(value.value, 0))
const minimumValue = computed(() => toNumber(minimum.value, 0))
const maximumValue = computed(() => toNumber(maximum.value, 100))
const isIndeterminateValue = computed(() => isIndeterminate.value === true)
const isActiveValue = computed(() => isActive.value === true)
const sizeValue = computed(() => toNumber(size.value, 32))

// —— 演示状态:主进度环 + 官方示例两组 ——
const lastEvent = ref<ProgressRingValueChangedEventArgs | null>(null)

function onMainValueChanged(event: ProgressRingValueChangedEventArgs): void {
  lastEvent.value = event
  // 回写参数面板,保证滑块与钳制后的值一致(minimum/maximum 变化引发钳制时同样触发)
  value.value = event.newValue
}

const eventText = computed(() => {
  const e = lastEvent.value
  return e ? `${e.oldValue} → ${e.newValue}` : ''
})

// 官方示例 1:不确定态 + ToggleSwitch 驱动 IsActive(官方 OnContent=Working / OffContent=Do work)
const officialActive = ref(true)

// 官方示例 2:确定态进度环 + 实时滑块(官方 NumberBox 0-100)
const officialValue = ref(0)

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '默认值', '说明']
const docsRows: (string | number)[][] = [
  ['value', 'number(v-model:value)', '0', '当前值;变更(含被 minimum/maximum 钳制)时触发 valueChanged'],
  ['minimum', 'number', '0', '最小值'],
  ['maximum', 'number', '100', '最大值(小于 minimum 时区间收敛,弧长为 0)'],
  ['isIndeterminate', 'boolean', 'true', '不确定态:2s 旋转弧动画,不反映具体进度,aria 不报值'],
  ['isActive', 'boolean', 'true', '激活态;false 时圆环隐藏(opacity 0)并停止动画,且移出无障碍树'],
  ['size', 'number', '32', '直径(px),下限 16(源 MinWidth/MinHeight);环厚随直径等比缩放'],
  ['foreground', 'string', "主题强调色", '弧颜色(CSS 颜色值,对应 WinUI Foreground)'],
  ['background', 'string', "''", '轨道圆颜色(CSS 颜色值,对应 WinUI Background;默认透明)'],
  ['valueChanged', '(e: { oldValue: number; newValue: number }) => void', '—', '值变化时触发;程序赋值与钳制重算同样触发(与 WinUI 一致)'],
  ['update:value', '(value: number) => void', '—', 'v-model:value 双向绑定事件'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」映射。
const usageCode = computed(
  () => `<WuiProgressRing
  v-model:value="value"
  :minimum="${minimumValue.value}"
  :maximum="${maximumValue.value}"
  :is-indeterminate="${isIndeterminateValue.value}"
  :is-active="${isActiveValue.value}"
  :size="${sizeValue.value}"
  @value-changed="onValueChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ProgressRing">
    <template #demo>
      <div class="progressring-stage">
        <!-- 主进度环:全部参数由参数面板实时驱动 -->
        <div class="progressring-item">
          <p class="progressring-label">{{ mainLabel }}</p>
          <div class="progressring-main-row">
            <WuiProgressRing
              :value="valueNumber"
              :minimum="minimumValue"
              :maximum="maximumValue"
              :is-indeterminate="isIndeterminateValue"
              :is-active="isActiveValue"
              :size="sizeValue"
              aria-label="Main progress"
              @value-changed="onMainValueChanged"
            />
          </div>
          <p class="progressring-readout">
            {{ liveValueLabel }}: <strong>{{ valueNumber }}</strong>
            <span class="progressring-event">{{ eventLabel }}: {{ lastEvent ? eventText : noEventHint }}</span>
          </p>
        </div>

        <!-- 官方示例 1:不确定态 + ToggleSwitch 驱动 IsActive(60×60,aria 名对照 AutomationProperties.Name) -->
        <div class="progressring-item">
          <p class="progressring-label">{{ indeterminateLabel }}</p>
          <div class="progressring-official-row">
            <WuiProgressRing :size="60" :is-indeterminate="true" :is-active="officialActive" aria-label="Progress image" />
            <WuiToggleSwitch
              v-model:is-on="officialActive"
              :header="switchHeader"
              :on-content="switchOn"
              :off-content="switchOff"
            />
          </div>
        </div>

        <!-- 官方示例 2:确定态 + 实时调值(官方 NumberBox 0-100 → 本站 Slider) -->
        <div class="progressring-item">
          <p class="progressring-label">{{ determinateLabel }}</p>
          <div class="progressring-official-row">
            <WuiProgressRing :size="60" :is-indeterminate="false" :value="officialValue" :minimum="0" :maximum="100" />
            <span class="progressring-output">{{ officialValue }}</span>
            <span class="progressring-output-label">{{ progressLabel }}</span>
          </div>
          <div class="progressring-slider-row">
            <WuiSlider v-model:value="officialValue" :minimum="0" :maximum="100" />
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Value" type="slider" v-model="value" :min="0" :max="100" :step="1" />
        <DemoOptionRow label="IsIndeterminate 不确定态" type="toggle" v-model="isIndeterminate" />
        <DemoOptionRow label="IsActive 激活态" type="toggle" v-model="isActive" />
        <DemoOptionRow label="Size 直径(px)" type="slider" v-model="size" :min="16" :max="100" :step="1" />
        <DemoOptionRow label="Minimum" type="number" v-model="minimum" :min="-100" :max="100" />
        <DemoOptionRow label="Maximum" type="number" v-model="maximum" :min="0" :max="1000" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.progressring-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 32px;
  width: 100%;
  max-width: 420px;
}

.progressring-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progressring-label {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.progressring-main-row {
  display: flex;
  align-items: center;
  min-height: 48px;
}

.progressring-readout {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.progressring-readout strong {
  color: var(--wui-application-header-foreground-theme);
  font-weight: 600;
}

.progressring-event {
  margin-left: 16px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

.progressring-official-row {
  display: flex;
  align-items: center;
  gap: 24px;
}

.progressring-output {
  min-width: 40px;
  text-align: center;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.progressring-output-label {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.progressring-slider-row {
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
