<script setup lang="ts">
// NumberBoxPage.vue —— NumberBox 控件示例页(示例组合对照 WinUI Gallery 的 NumberBoxPage.xaml)。
// 演示区:基础输入 / 三种步进按钮布局(Inline / Compact / Hidden)/ 可调参数交互框(min/max/step
// 实时、钳制与校验演示)/ 格式化框(对照官方 FormattedNumberboxRoundsNearest:2 位小数 + 0.25 舍入)。
import { computed, ref } from 'vue'
import WuiNumberBox from '@/components/NumberBox.vue'
import type { NumberBoxFormatter } from '@/components/NumberBox.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'NumberBox(数字框)', en: 'NumberBox' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '使用 NumberBox 让用户输入数字。支持取值范围钳制与校验(InvalidInputOverwritten 回退上次有效值 / InvalidInputOverbound 钳到最近边界)、步进按钮(Inline 内联 / Compact 弹层 / Hidden 隐藏)、自定义数字格式化;值在提交点(Enter、失焦、步进、滚轮)才更新,输入过程不触发 valueChanged。',
  en: 'Use a NumberBox to let a user enter numeric input. It supports range clamping and validation (InvalidInputOverwritten reverts to the last valid value / InvalidInputOverbound clamps to the nearest bound), spin buttons (Inline / Compact / Hidden) and custom number formatting. The value updates only at commit points (Enter, blur, spin, wheel) — valueChanged does not fire while typing.',
}
const BASIC_HEADER: BilingualText = { zh: '输入一个数字:', en: 'Enter a number:' }
const INTEGER_HEADER: BilingualText = { zh: '输入一个整数:', en: 'Enter an integer:' }
const CURRENCY_HEADER: BilingualText = { zh: '输入一个金额:', en: 'Enter a dollar amount:' }
const CAPTION_INLINE: BilingualText = { zh: 'Inline(内联按钮)', en: 'Inline' }
const CAPTION_COMPACT: BilingualText = { zh: 'Compact(聚焦弹出)', en: 'Compact' }
const CAPTION_HIDDEN: BilingualText = { zh: 'Hidden(无按钮)', en: 'Hidden' }
const RANGE_HINT: BilingualText = {
  zh: '试一试:输入 999 后按 Enter → 越界值被钳制到边界并亮红旗(Overbound 模式);输入 abc 后按 Enter → 回退上次有效值(Overwritten)或保留并亮红旗(Overbound)。',
  en: 'Try it: type 999 and press Enter — an out-of-bounds value is clamped to the nearest bound and shows the error flag (Overbound mode); type abc and press Enter — the last valid value is restored (Overwritten) or the text is kept with the error flag (Overbound).',
}
const CURRENT_VALUE_LABEL: BilingualText = { zh: '当前 value', en: 'Current value' }
const VALUE_NULL_TEXT: BilingualText = { zh: 'null(空)', en: 'null (empty)' }
const RANGE_DESCRIPTION: BilingualText = { zh: '(随选项实时变化)', en: '(live from options)' }
const CHANGED_COUNT_LABEL: BilingualText = { zh: 'valueChanged 触发次数', en: 'valueChanged fired' }
const UNIT_TIMES: BilingualText = { zh: '次', en: 'time(s)' }
const FORMAT_PREVIEW_LABEL: BilingualText = { zh: '格式化输出(format)', en: 'Formatted output (format)' }
const FORMAT_NOTE: BilingualText = {
  zh: '对照官方 FormattedNumberBox:格式化器保留 2 位小数,并把显示值舍入到最近的 0.25(IncrementNumberRounder, RoundHalfUp);value 本体不取整。',
  en: 'Mirrors the official FormattedNumberBox: the formatter keeps 2 fraction digits and rounds the displayed value to the nearest 0.25 (IncrementNumberRounder, RoundHalfUp); the value itself is not rounded.',
}
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const basicHeader = useBilingual(i18n, BASIC_HEADER)
const integerHeader = useBilingual(i18n, INTEGER_HEADER)
const currencyHeader = useBilingual(i18n, CURRENCY_HEADER)
const captionInline = useBilingual(i18n, CAPTION_INLINE)
const captionCompact = useBilingual(i18n, CAPTION_COMPACT)
const captionHidden = useBilingual(i18n, CAPTION_HIDDEN)
const rangeHint = useBilingual(i18n, RANGE_HINT)
const currentValueLabel = useBilingual(i18n, CURRENT_VALUE_LABEL)
const changedCountLabel = useBilingual(i18n, CHANGED_COUNT_LABEL)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const formatPreviewLabel = useBilingual(i18n, FORMAT_PREVIEW_LABEL)
const formatNote = useBilingual(i18n, FORMAT_NOTE)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)
const valueNullText = useBilingual(i18n, VALUE_NULL_TEXT)

// 交互框说明文本随取值范围实时更新
const rangeDescription = computed(() =>
  pickText(i18n, {
    zh: `${minimumValue.value} ≤ 值 ≤ ${maximumValue.value}(${RANGE_DESCRIPTION.zh})`,
    en: `${minimumValue.value} ≤ value ≤ ${maximumValue.value} ${RANGE_DESCRIPTION.en}`,
  }),
)

// —— 示例二:三种步进按钮布局(对照官方示例:SmallChange=10 / LargeChange=100 / Value=10)——
const inlineValue = ref<number | null>(10)
const compactValue = ref<number | null>(10)
const hiddenValue = ref<number | null>(10)

// —— 示例三:可调参数交互框(选项参数 ref 一律联合类型,匹配 DemoOptionRow 的 v-model 契约)——
const interactiveValue = ref<number | null>(50)
const changedCount = ref(0)
const minimum = ref<string | number | boolean>(0)
const maximum = ref<string | number | boolean>(100)
const smallChange = ref<string | number | boolean>(10)
const largeChange = ref<string | number | boolean>(100)
const spinPlacement = ref<string | number | boolean>('Inline')
const validationMode = ref<string | number | boolean>('InvalidInputOverwritten')

function toNumber(raw: string | number | boolean, fallback: number): number {
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

const minimumValue = computed(() => toNumber(minimum.value, 0))
const maximumValue = computed(() => toNumber(maximum.value, 100))
const smallChangeValue = computed(() => Math.max(toNumber(smallChange.value, 1), 0.01))
const largeChangeValue = computed(() => Math.max(toNumber(largeChange.value, 10), 0.01))
const spinPlacementValue = computed(() => {
  const raw = String(spinPlacement.value)
  return raw === 'Compact' || raw === 'Hidden' ? raw : 'Inline'
})
const validationModeValue = computed(() =>
  String(validationMode.value) === 'InvalidInputOverbound' ? 'InvalidInputOverbound' : 'InvalidInputOverwritten',
)

function onInteractiveValueChanged(): void {
  changedCount.value += 1
}

// —— 示例四:格式化框(对照官方 SetNumberBoxNumberFormatter:IncrementNumberRounder(0.25, RoundHalfUp)
//      + DecimalFormatter(FractionDigits=2);Web 侧用 toLocaleString 复刻 2 位小数)——
const formattedValue = ref<number | null>(10)

const currencyFormatter: NumberBoxFormatter = {
  format(value: number): string {
    // 显示层舍入到最近的 0.25(值本体不取整,仅格式化时生效,与官方示例一致)
    const rounded = Math.round(value * 4) / 4
    return rounded.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  },
  parse(text: string): number | null {
    const normalized = text.trim().replace(/,/g, '')
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  },
}

const formatPreview = computed(() =>
  formattedValue.value === null ? '—' : currencyFormatter.format(formattedValue.value),
)

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['value', 'number | null', 'null', '当前值;null 对应 WinUI 的 NaN(空输入);支持 v-model:value;仅在提交点更新(输入过程不更新)'],
  ['header', 'string', "''", '输入框上方的标头文本'],
  ['placeholderText', 'string', "''", '空内容时的占位文本'],
  ['minimum', 'number', '-Number.MAX_VALUE', '最小值;越界处理取决于 validationMode(「范围」滑块实时调节)'],
  ['maximum', 'number', 'Number.MAX_VALUE', '最大值;越界处理取决于 validationMode(「范围」滑块实时调节)'],
  ['smallChange', 'number', '1', '小步长:步进按钮 / ↑↓ 方向键 / 滚轮(滑块实时调节)'],
  ['largeChange', 'number', '10', '大步长:PageUp / PageDown(滑块实时调节)'],
  ['spinButtonPlacementMode', "'Hidden' | 'Compact' | 'Inline'", "'Hidden'", '步进按钮布局:Inline 内联两键;Compact 聚焦弹出上下两键;Hidden 无按钮(下拉实时调节)'],
  ['validationMode', "'InvalidInputOverwritten' | 'InvalidInputOverbound'", "'InvalidInputOverwritten'", '校验模式:Overwritten 解析失败回退上次有效值;Overbound 越界钳制到最近边界并亮红旗(下拉实时调节)'],
  ['numberFormatter', 'NumberBoxFormatter', 'Intl 默认实现', "{ format(value): string; parse(text): number | null };默认不做分组、显示层 10 位有效数字"],
  ['inputScope', 'string', "'Number'", '映射原生 inputmode(Number → decimal),其余值原样透传'],
  ['description', 'string', "''", '控件下方的说明文本(WinUI Description)'],
  ['disabled', 'boolean', 'false', '禁用;样式对照 Disabled 视觉状态'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['valueChanged', '(event: { oldValue: number | null; newValue: number | null }) => void', '提交点(Enter / 失焦 / 步进按钮与方向键 / 滚轮 / 越界钳制)上值变化时触发;输入过程不触发(WinUI ValueChanged 语义)'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiNumberBox
  v-model:value="count"
  :minimum="${minimumValue.value}"
  :maximum="${maximumValue.value}"
  :small-change="${smallChangeValue.value}"
  :large-change="${largeChangeValue.value}"
  spin-button-placement-mode="${spinPlacementValue.value}"
  validation-mode="${validationModeValue.value}"
  @value-changed="onValueChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="NumberBox">
    <template #demo>
      <div class="number-box-stage">
        <!-- 示例一:基础输入(标头 + 占位文本) -->
        <WuiNumberBox class="stage-item" :header="basicHeader" placeholder-text="1234.5" />

        <!-- 示例二:三种步进按钮布局(对照官方示例 SmallChange=10 / LargeChange=100) -->
        <div class="layout-row">
          <div class="layout-item">
            <WuiNumberBox
              v-model:value="inlineValue"
              class="layout-box"
              :header="integerHeader"
              :small-change="10"
              :large-change="100"
              spin-button-placement-mode="Inline"
            />
            <span class="layout-caption">{{ captionInline }}</span>
          </div>
          <div class="layout-item">
            <WuiNumberBox
              v-model:value="compactValue"
              class="layout-box"
              :header="integerHeader"
              :small-change="10"
              :large-change="100"
              spin-button-placement-mode="Compact"
            />
            <span class="layout-caption">{{ captionCompact }}</span>
          </div>
          <div class="layout-item">
            <WuiNumberBox
              v-model:value="hiddenValue"
              class="layout-box"
              :header="integerHeader"
              :small-change="10"
              :large-change="100"
              spin-button-placement-mode="Hidden"
            />
            <span class="layout-caption">{{ captionHidden }}</span>
          </div>
        </div>

        <!-- 示例三:范围 / 步长 / 布局 / 校验模式可调,钳制与校验演示 -->
        <p class="hint">{{ rangeHint }}</p>
        <WuiNumberBox
          v-model:value="interactiveValue"
          class="stage-item"
          :header="integerHeader"
          :minimum="minimumValue"
          :maximum="maximumValue"
          :small-change="smallChangeValue"
          :large-change="largeChangeValue"
          :spin-button-placement-mode="spinPlacementValue"
          :validation-mode="validationModeValue"
          :description="rangeDescription"
          @value-changed="onInteractiveValueChanged"
        />
        <p class="live-value">{{ currentValueLabel }}:{{ interactiveValue ?? valueNullText }}</p>
        <p class="live-value">{{ changedCountLabel }}:{{ changedCount }} {{ unitTimes }}</p>

        <!-- 示例四:格式化(对照官方 FormattedNumberboxRoundsNearest) -->
        <WuiNumberBox
          v-model:value="formattedValue"
          class="stage-item"
          :header="currencyHeader"
          placeholder-text="0.00"
          :number-formatter="currencyFormatter"
        />
        <p class="live-value">{{ formatPreviewLabel }}:{{ formatPreview }}</p>
        <p class="hint">{{ formatNote }}</p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Minimum" type="slider" v-model="minimum" :min="-100" :max="200" :step="1" />
        <DemoOptionRow label="Maximum" type="slider" v-model="maximum" :min="-100" :max="500" :step="1" />
        <DemoOptionRow label="SmallChange" type="slider" v-model="smallChange" :min="1" :max="50" :step="1" />
        <DemoOptionRow label="LargeChange" type="slider" v-model="largeChange" :min="10" :max="200" :step="1" />
        <DemoOptionRow
          label="SpinButtonPlacementMode"
          type="select"
          v-model="spinPlacement"
          :options="[
            { label: 'Inline', value: 'Inline' },
            { label: 'Compact', value: 'Compact' },
            { label: 'Hidden', value: 'Hidden' },
          ]"
        />
        <DemoOptionRow
          label="ValidationMode"
          type="select"
          v-model="validationMode"
          :options="[
            { label: 'InvalidInputOverwritten', value: 'InvalidInputOverwritten' },
            { label: 'InvalidInputOverbound', value: 'InvalidInputOverbound' },
          ]"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.number-box-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
  width: 100%;
  max-width: 480px;
}

.stage-item {
  width: 100%;
}

/* 三种布局并排:各占一列,框宽撑满列 */
.layout-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.layout-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.layout-box {
  width: 100%;
}

.layout-caption {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-description-text-foreground);
}

.hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-description-text-foreground);
}

.live-value {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  word-break: break-all;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
