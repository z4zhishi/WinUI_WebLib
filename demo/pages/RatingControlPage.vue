<script setup lang="ts">
// RatingControl 示例页:对照官方 WinUI Gallery RatingControlPage 两例并扩展:
// 例一 = 官方 Example1(基础评分 + Caption 随评分切换「请评分 → 你的评分」,IsClearEnabled/IsReadOnly 面板),
// 例二 = 官方 Example2(PlaceholderValue 半星占位,滑杆步长 0.5,0 视为未设置),
// 例三 = 初值 + MaxRating(带初值 4,星星数量可调,观察钳制)。
// 上半区交互演示 + 参数面板,下半区为属性/事件/键盘/用法文档(结构照抄已通过 QA 的 ComboBoxPage 母版)。
import { computed, ref } from 'vue'
import WuiRatingControl from '@/components/RatingControl.vue'
import type { RatingControlValueChangedEventArgs } from '@/components/RatingControl.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'RatingControl(评分控件)', en: 'RatingControl' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '让用户用 1 到 N 颗星为内容评分:未评分时显示「请评分」提示文字,悬浮时星星实时预览填充(支持半星占位),评分后收窄为紧凑的星条;点击当前值星星或拖出左边缘可清空。',
  en: 'Let users rate from 1 to N stars: shows a prompt caption when unrated, preview-fills stars on hover (half-star placeholder supported), and compacts once rated. Click the current star or drag off the left edge to clear.',
}
const GROUP_BASIC: BilingualText = { zh: '基础评分(Caption 提示 → 评分回显,清空/只读)', en: 'Basic rating (caption prompt, clear / read-only)' }
const GROUP_PLACEHOLDER: BilingualText = { zh: '悬浮预览与占位值(PlaceholderValue,步长 0.5)', en: 'Hover preview & placeholder (PlaceholderValue, step 0.5)' }
const GROUP_INITIAL: BilingualText = { zh: '初值与星星数量(value 初值 4,MaxRating 可调)', en: 'Initial value & star count (value = 4, MaxRating adjustable)' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘与指针操作', en: 'Keyboard & pointer' }
const LABEL_CLEAR: BilingualText = { zh: 'IsClearEnabled(演示一)', en: 'IsClearEnabled (demo 1)' }
const LABEL_READONLY: BilingualText = { zh: 'IsReadOnly(演示一)', en: 'IsReadOnly (demo 1)' }
const LABEL_DISABLED: BilingualText = { zh: 'Disabled(演示一)', en: 'Disabled (demo 1)' }
const LABEL_PLACEHOLDER: BilingualText = { zh: 'PlaceholderValue(演示二,0 = 未设置)', en: 'PlaceholderValue (demo 2, 0 = unset)' }
const LABEL_MAX: BilingualText = { zh: 'MaxRating(演示三)', en: 'MaxRating (demo 3)' }
const LABEL_VALUE: BilingualText = { zh: '当前值', en: 'Value' }
const LABEL_EVENT: BilingualText = { zh: '最近一次 valueChanged', en: 'Last valueChanged' }
const LABEL_NO_EVENT: BilingualText = { zh: '尚未触发', en: 'Not fired yet' }
const UNSET_TEXT: BilingualText = { zh: '未评分(null)', en: 'Unrated (null)' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }
const PLACEHOLDER_HINT: BilingualText = {
  zh: '说明:占位值 ≤ 1 时源实现收敛为 1 星,故演示把滑杆 0 视为未设置;悬浮星星时预览将临时盖过占位值。',
  en: 'Note: values ≤ 1 are coerced to 1 star in the source, so slider 0 means unset here; hovering temporarily overrides the placeholder with the live preview.',
}

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupBasic = useBilingual(i18n, GROUP_BASIC)
const groupPlaceholder = useBilingual(i18n, GROUP_PLACEHOLDER)
const groupInitial = useBilingual(i18n, GROUP_INITIAL)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelClear = useBilingual(i18n, LABEL_CLEAR)
const labelReadonly = useBilingual(i18n, LABEL_READONLY)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelPlaceholder = useBilingual(i18n, LABEL_PLACEHOLDER)
const labelMax = useBilingual(i18n, LABEL_MAX)
const labelValue = useBilingual(i18n, LABEL_VALUE)
const labelEvent = useBilingual(i18n, LABEL_EVENT)
const labelNoEvent = useBilingual(i18n, LABEL_NO_EVENT)
const unsetText = useBilingual(i18n, UNSET_TEXT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)
const placeholderHint = useBilingual(i18n, PLACEHOLDER_HINT)

// —— 参数面板(DemoOptionRow 的 v-model 契约:联合类型,见 demo/components/README.md)——
const demoIsClearEnabled = ref<string | number | boolean>(true)
const demoIsReadOnly = ref<string | number | boolean>(false)
const demoDisabled = ref<string | number | boolean>(false)
const demoPlaceholderSlider = ref<string | number | boolean>(0)
const demoMaxRating = ref<string | number | boolean>(5)

const isClearEnabledValue = computed(() => demoIsClearEnabled.value === true)
const isReadOnlyValue = computed(() => demoIsReadOnly.value === true)
const disabledValue = computed(() => demoDisabled.value === true)
const maxRatingValue = computed(() => {
  const parsed = Number(demoMaxRating.value)
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 5
})
// 滑杆 0 → 未设置(null);0.5~5 原样传入(≤ 1 的收敛由控件按源规则处理)。
const placeholderValue = computed<number | null>(() => {
  const parsed = Number(demoPlaceholderSlider.value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
})

// —— 演示一:基础评分(Caption 随评分切换,对照官方 ValueChanged → Caption="Your rating")——
const basicValue = ref<number | null>(null)
const CAPTION_PROMPT: BilingualText = { zh: '请评分', en: 'Please rate' }
const CAPTION_RATED: BilingualText = { zh: '你的评分', en: 'Your rating' }
const captionPrompt = useBilingual(i18n, CAPTION_PROMPT)
const captionRated = useBilingual(i18n, CAPTION_RATED)
const captionText = computed(() => (basicValue.value === null ? captionPrompt.value : captionRated.value))
const lastEvent = ref<RatingControlValueChangedEventArgs | null>(null)

function formatValue(v: number | null): string {
  return v === null ? unsetText.value : String(v)
}

function onBasicValueChanged(event: RatingControlValueChangedEventArgs): void {
  lastEvent.value = event
}

const eventText = computed(() => {
  const e = lastEvent.value
  if (!e) return ''
  return `${formatValue(e.oldValue)} → ${formatValue(e.newValue)}`
})

// —— 演示二:占位值(悬浮预览临时盖过占位)——
const placeholderDemoValue = ref<number | null>(null)

// —— 演示三:初值 + MaxRating ——
const initialValue = ref<number | null>(4)

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['value (v-model)', 'number | null', 'null', '当前评分;null = 未评分(源哨兵 -1)。负值收敛为 null,≤ 1 收敛为 1,> maxRating 钳制'],
  ['maxRating', 'number', '5', '星星数量;< 1 收敛为 1;调小后 value/placeholderValue 超出部分静默钳制'],
  ['placeholderValue', 'number | null', 'null', '未评分时的占位值(半星精度);负值视为未设置,≤ 1 收敛为 1,> maxRating 钳制'],
  ['initialSetValue', 'number', '1', '未评分时按方向键设定的首个值(WinUI InitialSetValue)'],
  ['isClearEnabled', 'boolean', 'true', '允许清除:点击当前值星星、或值减到 0 时回到未评分'],
  ['isReadOnly', 'boolean', 'false', '只读:无悬浮预览、点击与键盘均无效(aria-readonly)'],
  ['caption', 'string', "''", '星条右侧 12px 说明文字(WinUI Caption),如「请评分」「312 条评分」'],
  ['disabled', 'boolean', 'false', '禁用(对应 WinUI Control.IsEnabled)'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['valueChanged', '(e: { oldValue: number | null; newValue: number | null })', '点击/键盘提交评分时触发;与 WinUI 一致,命中提交路径即触发,即使值未变(如满值再按 End)'],
  ['update:value', '(value: number | null)', 'v-model:value 双向绑定事件'],
]
const keyboardHeaders = ['按键 / 指针', '作用']
const keyboardRows: (string | number)[][] = [
  ['→ / ↑', '评分 +1(未评分时设为 initialSetValue)'],
  ['← / ↓', '评分 −1;值为 1 时清空(受 IsClearEnabled 约束)'],
  ['Home', '清空评分(未评分时无动作)'],
  ['End', '设为满值 maxRating'],
  ['点击某颗星', '评分到该星(ceil 取整);再次点击当前值星星且 IsClearEnabled 时清空'],
  ['按住向左拖出星条', '清空评分(指针捕获,对照源拖出左缘清空)'],
  ['悬浮移动', '预览填充至指针所在星(ceil);只读/禁用时不预览'],
]

const usageCode = computed(
  () => `<script setup lang="ts">
import { ref } from 'vue'
import RatingControl from '@/components/RatingControl.vue'

// null = 未评分(WinUI 哨兵 -1)
const rating = ref<number | null>(null)
<\/script>

<template>
  <RatingControl
    v-model:value="rating"
    caption="请评分"
    :max-rating="${maxRatingValue.value}"
    :is-clear-enabled="${isClearEnabledValue.value}"
    :is-read-only="${isReadOnlyValue.value}"
    :disabled="${disabledValue.value}"
    @value-changed="onValueChanged" />
</template>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="RatingControl">
    <template #demo>
      <div class="rating-stage">
        <!-- 演示一:基础评分(参数面板实时调节 IsClearEnabled/IsReadOnly/Disabled) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupBasic }}</h3>
          <WuiRatingControl
            v-model:value="basicValue"
            :caption="captionText"
            :is-clear-enabled="isClearEnabledValue"
            :is-read-only="isReadOnlyValue"
            :disabled="disabledValue"
            aria-label="基础评分示例"
            @value-changed="onBasicValueChanged"
          />
          <p class="demo-output">
            {{ labelValue }}: <strong>{{ formatValue(basicValue) }}</strong>
            <span class="demo-event">{{ labelEvent }}: {{ lastEvent ? eventText : labelNoEvent }}</span>
          </p>
        </section>

        <!-- 演示二:悬浮预览 + 占位值(半星精度,对照官方 PlaceholderValue 滑杆示例) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupPlaceholder }}</h3>
          <WuiRatingControl
            v-model:value="placeholderDemoValue"
            :placeholder-value="placeholderValue"
            aria-label="占位值示例"
          />
          <p class="demo-output">{{ placeholderHint }}</p>
        </section>

        <!-- 演示三:初值 + MaxRating(MaxRating 调小到 4 以下时观察 value 钳制) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupInitial }}</h3>
          <WuiRatingControl
            v-model:value="initialValue"
            :max-rating="maxRatingValue"
            caption="312 条评分"
            aria-label="初值与 MaxRating 示例"
          />
          <p class="demo-output">{{ labelValue }}: <strong>{{ formatValue(initialValue) }}</strong> / MaxRating = {{ maxRatingValue }}</p>
        </section>

        <!-- 键盘与指针操作说明 -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupKeyboard }}</h3>
          <ul class="keyboard-list">
            <li><kbd>→</kbd>/<kbd>↑</kbd> {{ i18n.locale.value.startsWith('zh') ? '评分 +1' : '+1 star' }}</li>
            <li><kbd>←</kbd>/<kbd>↓</kbd> {{ i18n.locale.value.startsWith('zh') ? '评分 −1(1 时清空)' : '−1 star (clears at 1)' }}</li>
            <li><kbd>Home</kbd> {{ i18n.locale.value.startsWith('zh') ? '清空' : 'clear' }}</li>
            <li><kbd>End</kbd> {{ i18n.locale.value.startsWith('zh') ? '满值' : 'max rating' }}</li>
            <li>{{ i18n.locale.value.startsWith('zh') ? '再点当前值星星 = 清空' : 'click current star = clear' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelClear" type="toggle" v-model="demoIsClearEnabled" />
        <DemoOptionRow :label="labelReadonly" type="toggle" v-model="demoIsReadOnly" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelPlaceholder" type="slider" v-model="demoPlaceholderSlider" :min="0" :max="5" :step="0.5" />
        <DemoOptionRow :label="labelMax" type="slider" v-model="demoMaxRating" :min="1" :max="10" :step="1" />
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
.rating-stage {
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

.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-output strong {
  color: var(--wui-application-header-foreground-theme);
  font-weight: 600;
}

.demo-event {
  margin-left: 16px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
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
