<script setup lang="ts">
// RepeatButtonPage.vue —— RepeatButton 控件示例页(对应官方 WinUI Gallery Samples/RepeatButton/)。
// 结构照抄 HomePage.vue 母版:DemoPage(标题+描述)→ 交互演示(控件本体多配置)
// → DemoOptions(文本框/数字输入/开关实时改参)→ DemoDocsTable + DemoCode。
// 官方示例:「Click and hold」按钮 + 禁用开关 + 点击计数输出,本页 1:1 复刻并扩展参数调节。
import { computed, ref } from 'vue'
import WuiRepeatButton from '@/components/RepeatButton.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 RepeatButton 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'RepeatButton(重复按钮)', en: 'RepeatButton' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'RepeatButton 控件与标准 Button 类似,区别在于用户按住按钮期间 Click 事件会连续触发:按下立即触发一次,经过 Delay 毫秒后开始重复,之后每 Interval 毫秒触发一次。',
  en: 'The RepeatButton control is like a standard Button, except that the Click event occurs continuously while the user presses it: once on press, then after Delay ms, repeating every Interval ms until release.',
}
const CLICK_COUNT_PREFIX: BilingualText = { zh: '点击次数:', en: 'Number of clicks: ' }
const FAST_LABEL: BilingualText = { zh: '快速重复(delay 100 / interval 50)', en: 'Fast repeat (delay 100 / interval 50)' }
const UNIT_TIMES: BilingualText = { zh: '次', en: 'time(s)' }
const PROPS_TABLE_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const EVENTS_TABLE_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const clickCountPrefix = useBilingual(i18n, CLICK_COUNT_PREFIX)
const fastLabel = useBilingual(i18n, FAST_LABEL)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const propsTableTitle = useBilingual(i18n, PROPS_TABLE_TITLE)
const eventsTableTitle = useBilingual(i18n, EVENTS_TABLE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 可调参数(DemoOptionRow 的 v-model 契约要求 string | number | boolean 联合类型)——
const content = ref<string | number | boolean>('按住我(Click and hold)')
const delay = ref<string | number | boolean>(500)
const interval = ref<string | number | boolean>(33)
const disabled = ref<string | number | boolean>(false)
const clickCount = ref(0)
const fastCount = ref(0)
const slotCount = ref(0)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const contentText = computed(() => String(content.value))
const delayValue = computed(() => toNumber(delay.value, 500))
const intervalValue = computed(() => toNumber(interval.value, 33))
const disabledValue = computed(() => disabled.value === true)

function onMainClick(): void {
  clickCount.value += 1
}

function onFastClick(): void {
  fastCount.value += 1
}

function onSlotClick(): void {
  slotCount.value += 1
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Content', 'string', "''", '按钮文本内容;复杂内容(图标/图片)用默认插槽(左侧文本框实时调节)'],
  ['Delay', 'number', '500', '按住后开始重复前的延迟,单位 ms;源默认值见 DependencyProperty.cpp 的 RepeatButton_Delay = 500(数字输入实时调节)'],
  ['Interval', 'number', '33', '重复触发间隔,单位 ms;源默认值见 DependencyProperty.cpp 的 RepeatButton_Interval = 33(数字输入实时调节)'],
  ['Disabled', 'boolean', 'false', '是否禁用,对应 WinUI IsEnabled;禁用立即停止重复(开关实时调节)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent)', '按住期间连续触发:按下立即触发 1 次(ClickMode=Press);经 Delay ms 后触发第 2 次;之后每 Interval ms 触发一次,直至松开/移出/失焦/禁用。键盘 Space 按住重复,Enter 单次触发(按住随系统按键重复)'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiRepeatButton
  Content="${contentText.value}"
  :Delay="${delayValue.value}"
  :Interval="${intervalValue.value}"
  :Disabled="${disabledValue.value}"
  @click="onButtonClick" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="RepeatButton">
    <template #demo>
      <div class="repeat-button-stage">
        <!-- 配置 1:官方「Click and hold」示例复刻:参数由左侧面板实时驱动,点击计数输出 -->
        <div class="repeat-button-row">
          <WuiRepeatButton
            :content="contentText"
            :delay="delayValue"
            :interval="intervalValue"
            :disabled="disabledValue"
            @click="onMainClick"
          />
          <span class="click-output" role="status" aria-live="polite">
            {{ clickCountPrefix }} {{ clickCount }}
          </span>
        </div>

        <!-- 配置 2:快速重复,小延迟 + 小间隔,便于直观感受节奏差异 -->
        <div class="repeat-button-row">
          <WuiRepeatButton content="快速重复" :delay="100" :interval="50" :disabled="disabledValue" @click="onFastClick" />
          <span class="click-output">{{ fastLabel }} —— {{ fastCount }} {{ unitTimes }}</span>
        </div>

        <!-- 配置 3:插槽内容,图形 + 文本混排(音量+场景是 RepeatButton 经典用途) -->
        <div class="repeat-button-row">
          <WuiRepeatButton :disabled="disabledValue" aria-label="增大音量" @click="onSlotClick">
            <svg class="slot-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8.5 2.5a.5.5 0 0 0-.83-.38L4.3 5.2H2.2c-.4 0-.7.3-.7.7v4.2c0 .4.3.7.7.7h2.1l3.37 3.08a.5.5 0 0 0 .83-.38V2.5Z"
                fill="currentColor"
              />
              <path
                d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6 6 0 0 1 0 9"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
              />
            </svg>
            <span>长按增大音量</span>
          </WuiRepeatButton>
          <span class="click-output">{{ slotCount }} {{ unitTimes }}</span>
        </div>

        <p class="hold-hint">按住按钮或聚焦后按住 Space 观察连续触发;拖出按钮范围即停止。</p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Content" type="text" v-model="content" placeholder="按钮文本" />
        <DemoOptionRow label="Disabled(是否禁用)" type="toggle" v-model="disabled" />
        <DemoOptionRow label="Delay(ms,开始重复前的延迟)" type="number" v-model="delay" :min="0" :max="3000" :step="50" />
        <DemoOptionRow label="Interval(ms,重复间隔)" type="number" v-model="interval" :min="1" :max="1000" :step="10" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ propsTableTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ eventsTableTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.repeat-button-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.repeat-button-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

/* 官方示例 Control1Output:计数输出文本 */
.click-output {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.hold-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 插槽内联图标:currentColor 跟随按钮 Foreground 状态色 */
.slot-icon {
  width: 16px;
  height: 16px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
