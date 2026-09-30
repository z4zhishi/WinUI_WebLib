<script setup lang="ts">
// Slider 示例页:参数面板实时调节主滑块(WinUI Gallery SliderPage 的 Range/Ticks 示例组合),
// 另固定呈现「刻度吸附」与「简单」两个典型配置;下半区为属性/事件文档与用法代码。
import { computed, ref } from 'vue'
import WuiSlider from '@/components/Slider.vue'
import type { SliderSnapsTo, SliderTickPlacement, SliderValueChangedEventArgs } from '@/components/Slider.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Slider(滑块)', en: 'Slider' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '让用户在一段取值范围内滑动拇指选择数值:适合音量、亮度等连续值,或屏幕分辨率等离散档位。拖动中实时更新值并触发 valueChanged。',
  en: 'Select a value from a range by moving a Thumb along a track — for continuous values (volume, brightness) or discrete steps (screen resolution). Fires valueChanged continuously while dragging.',
}
const LIVE_VALUE_LABEL: BilingualText = { zh: '当前值', en: 'Value' }
const EVENT_LABEL: BilingualText = { zh: '最近一次 valueChanged', en: 'Last valueChanged' }
const NO_EVENT_HINT: BilingualText = { zh: '尚未触发', en: 'Not fired yet' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const liveValueLabel = useBilingual(i18n, LIVE_VALUE_LABEL)
const eventLabel = useBilingual(i18n, EVENT_LABEL)
const noEventHint = useBilingual(i18n, NO_EVENT_HINT)

// —— 可调参数(DemoOptionRow 的 v-model 契约:联合类型)——
const minimum = ref<string | number | boolean>(0)
const maximum = ref<string | number | boolean>(100)
const stepFrequency = ref<string | number | boolean>(1)
const snapsTo = ref<string | number | boolean>('StepValues')
const tickPlacement = ref<string | number | boolean>('None')
const tickFrequency = ref<string | number | boolean>(10)
const header = ref<string | number | boolean>('标题')
const disabled = ref<string | number | boolean>(false)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const minimumValue = computed(() => toNumber(minimum.value, 0))
const maximumValue = computed(() => toNumber(maximum.value, 100))
const stepFrequencyValue = computed(() => toNumber(stepFrequency.value, 1))
const tickFrequencyValue = computed(() => toNumber(tickFrequency.value, 10))
const snapsToValue = computed(() => String(snapsTo.value) as SliderSnapsTo)
const tickPlacementValue = computed(() => String(tickPlacement.value) as SliderTickPlacement)
const headerValue = computed(() => String(header.value))
const disabledValue = computed(() => disabled.value === true)

const SNAPS_TO_CHOICES = [
  { label: 'StepValues(按步长吸附)', value: 'StepValues' },
  { label: 'Ticks(按刻度吸附)', value: 'Ticks' },
  { label: 'None(连续取值,Web 扩展)', value: 'None' },
]

const TICK_PLACEMENT_CHOICES = [
  { label: 'None(无刻度)', value: 'None' },
  { label: 'TopLeft(上方)', value: 'TopLeft' },
  { label: 'BottomRight(下方)', value: 'BottomRight' },
  { label: 'Outside(上下两侧)', value: 'Outside' },
  { label: 'Inline(轨道上)', value: 'Inline' },
]

// —— 演示状态:主滑块 + 两个固定配置滑块 ——
const mainValue = ref(50)
const ticksValue = ref(60)
const simpleValue = ref(0)
const lastEvent = ref<SliderValueChangedEventArgs | null>(null)

function onMainValueChanged(event: SliderValueChangedEventArgs): void {
  lastEvent.value = event
}

const eventText = computed(() => {
  const e = lastEvent.value
  return e ? `${e.oldValue} → ${e.newValue}` : ''
})

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '默认值', '说明']
const docsRows: (string | number)[][] = [
  ['value', 'number(v-model:value)', '0', '当前值;拖动/键盘实时更新'],
  ['minimum', 'number', '0', '最小值'],
  ['maximum', 'number', '100', '最大值(小于 minimum 时收敛为 minimum)'],
  ['stepFrequency', 'number', '1', '步长(<= 0 时按 1);StepValues 吸附与方向键步进均使用'],
  ['snapsTo', "'StepValues' | 'Ticks' | 'None'", "'StepValues'", "吸附方式;'None' 为 Web 扩展(WinUI 仅前两个)"],
  ['tickPlacement', "'None' | 'TopLeft' | 'BottomRight' | 'Outside' | 'Inline'", "'None'", '刻度位置'],
  ['tickFrequency', 'number', '0', '刻度间距(<= 0 不绘制);Ticks 吸附时兼作步长'],
  ['header', 'string', "''", '标题文本'],
  ['disabled', 'boolean', 'false', '禁用(对应 WinUI Control.IsEnabled)'],
  ['valueChanged', "(e: { oldValue: number; newValue: number }) => void", '—', '值变化时触发;拖动过程中持续触发(与 WinUI 一致)'],
  ['update:value', '(value: number) => void', '—', 'v-model:value 双向绑定事件'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」映射。
const usageCode = computed(
  () => `<WuiSlider
  v-model:value="value"
  :minimum="${minimumValue.value}"
  :maximum="${maximumValue.value}"
  :step-frequency="${stepFrequencyValue.value}"
  snaps-to="${snapsToValue.value}"
  tick-placement="${tickPlacementValue.value}"
  :tick-frequency="${tickFrequencyValue.value}"
  header="${headerValue.value}"
  :disabled="${disabledValue.value}"
  @value-changed="onValueChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Slider">
    <template #demo>
      <div class="slider-stage">
        <!-- 主滑块:全部参数由参数面板实时驱动 -->
        <div class="slider-item">
          <WuiSlider
            v-model:value="mainValue"
            :minimum="minimumValue"
            :maximum="maximumValue"
            :step-frequency="stepFrequencyValue"
            :snaps-to="snapsToValue"
            :tick-placement="tickPlacementValue"
            :tick-frequency="tickFrequencyValue"
            :header="headerValue"
            :disabled="disabledValue"
            @value-changed="onMainValueChanged"
          />
          <p class="slider-readout">
            {{ liveValueLabel }}: <strong>{{ mainValue }}</strong>
            <span class="slider-event">{{ eventLabel }}: {{ lastEvent ? eventText : noEventHint }}</span>
          </p>
        </div>

        <!-- 刻度滑块:对照官方 SliderTicks 示例(TickFrequency=20 / Outside / Ticks 吸附) -->
        <div class="slider-item">
          <WuiSlider
            v-model:value="ticksValue"
            :minimum="0"
            :maximum="100"
            :step-frequency="5"
            snaps-to="Ticks"
            tick-placement="Outside"
            :tick-frequency="20"
            header="刻度吸附(snaps-to=&quot;Ticks&quot;)"
          />
          <p class="slider-readout">{{ liveValueLabel }}: <strong>{{ ticksValue }}</strong></p>
        </div>

        <!-- 简单滑块:对照官方 SliderSimple 示例(默认参数) -->
        <div class="slider-item">
          <WuiSlider v-model:value="simpleValue" header="简单滑块(默认参数)" />
          <p class="slider-readout">{{ liveValueLabel }}: <strong>{{ simpleValue }}</strong></p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Minimum" type="number" v-model="minimum" :min="0" :max="1000" />
        <DemoOptionRow label="Maximum" type="number" v-model="maximum" :min="0" :max="1000" />
        <DemoOptionRow label="StepFrequency" type="slider" v-model="stepFrequency" :min="1" :max="20" :step="1" />
        <DemoOptionRow label="TickFrequency" type="slider" v-model="tickFrequency" :min="1" :max="50" :step="1" />
        <DemoOptionRow label="SnapsTo 吸附方式" type="select" v-model="snapsTo" :options="SNAPS_TO_CHOICES" />
        <DemoOptionRow label="TickPlacement 刻度位置" type="select" v-model="tickPlacement" :options="TICK_PLACEMENT_CHOICES" />
        <DemoOptionRow label="Header 标题" type="text" v-model="header" placeholder="标题文本" />
        <DemoOptionRow label="Disabled 禁用" type="toggle" v-model="disabled" />
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
.slider-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 32px;
  width: 100%;
  max-width: 420px;
}

.slider-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-readout {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.slider-readout strong {
  color: var(--wui-application-header-foreground-theme);
  font-weight: 600;
}

.slider-event {
  margin-left: 16px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
