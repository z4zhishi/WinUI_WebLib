<script setup lang="ts">
// TextBoxPage.vue —— TextBox 控件示例页(示例组合对照 WinUI Gallery 的 TextBoxPage.xaml)。
// 上半区:简单输入框 / 标头+占位 / 只读 / 可调参数交互框 + 实时值与事件计数;
// 下半区:固定呈现属性、事件与用法代码。
import { computed, ref } from 'vue'
import WuiTextBox from '@/components/TextBox.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'TextBox(文本框)', en: 'TextBox' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '使用 TextBox 让用户在应用中输入简单文本。可添加标头与占位文本提示输入内容,并可通过只读、最大长度、清除按钮等方式自定义。',
  en: 'Use a TextBox to let a user enter simple text input. Add a header and placeholder text, and customize it with read-only, max length and a clear button.',
}
const LIVE_VALUE_TITLE: BilingualText = { zh: '实时值', en: 'Live value' }
const CHANGED_COUNT: BilingualText = { zh: 'textChanged 触发次数', en: 'textChanged fired' }
const UNIT_TIMES: BilingualText = { zh: '次', en: 'time(s)' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const liveValueTitle = useBilingual(i18n, LIVE_VALUE_TITLE)
const changedCountLabel = useBilingual(i18n, CHANGED_COUNT)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例一~三(对照官方示例:Simple / Header+Placeholder / ReadOnly)——
const readonlyText = ref('我非常高兴能来到这里!')

// —— 示例四:可调参数交互框(选项参数 ref 一律联合类型,匹配 DemoOptionRow 的 v-model 契约;
//      交互框的 Text 只由控件回写,声明为纯 string)——
const interactiveText = ref('')
const header = ref<string | number | boolean>('你的名字:')
const placeholder = ref<string | number | boolean>('姓名')
const readOnly = ref<string | number | boolean>(false)
const clearEnabled = ref<string | number | boolean>(true)
const maxLength = ref<string | number | boolean>(20)
const changedCount = ref(0)

const headerValue = computed(() => String(header.value))
const placeholderValue = computed(() => String(placeholder.value))
const isReadOnly = computed(() => readOnly.value === true)
const clearButtonEnabled = computed(() => clearEnabled.value === true)
const maxLengthValue = computed(() => {
  const parsed = Number(maxLength.value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
})
// 交互框的 Text 即为实时值。
const liveText = computed(() => interactiveText.value)

function onTextChanged(): void {
  changedCount.value += 1
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Text', 'string', "''", '文本值;支持 v-model:text 双向绑定(交互框实时调节)'],
  ['Header', 'string', "''", '输入框上方的标头文本(「标头文本」实时调节)'],
  ['PlaceholderText', 'string', "''", '空内容时的占位文本(「占位文本」实时调节)'],
  ['ClearButtonEnabled', 'boolean', 'true', '聚焦且有内容期间显示行内清除按钮(开关实时调节)'],
  ['IsReadOnly', 'boolean', 'false', '只读;内容不可编辑但可选择复制'],
  ['MaxLength', 'number', '0', '最大字符数;0 表示不限制(滑块实时调节)'],
  ['Disabled', 'boolean', 'false', '禁用;走原生 input disabled,样式对照 Disabled 视觉状态'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['textChanged', '(value: string) => void', '文本变化时实时触发;IME 组合期间不触发,组合结束后触发一次;点击清除按钮也会触发'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiTextBox
  v-model:text="name"
  header="${headerValue.value}"
  placeholder-text="${placeholderValue.value}"
  :clear-button-enabled="${clearButtonEnabled.value}"
  :is-read-only="${isReadOnly.value}"
  :max-length="${maxLengthValue.value}"
  @text-changed="onTextChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="TextBox">
    <template #demo>
      <div class="text-box-stage">
        <!-- 简单 TextBox -->
        <WuiTextBox class="stage-item" aria-label="文本输入" />

        <!-- 标头 + 占位文本 -->
        <WuiTextBox class="stage-item" header="你的名字:" placeholder-text="姓名" />

        <!-- 只读 + 预置内容 -->
        <WuiTextBox v-model:text="readonlyText" class="stage-item" is-read-only aria-label="只读文本" />

        <!-- 可调参数交互框 + 实时值展示 -->
        <WuiTextBox
          v-model:text="interactiveText"
          class="stage-item"
          :header="headerValue"
          :placeholder-text="placeholderValue"
          :clear-button-enabled="clearButtonEnabled"
          :is-read-only="isReadOnly"
          :max-length="maxLengthValue"
          @text-changed="onTextChanged"
        />
        <p class="live-value">{{ liveValueTitle }}:{{ liveText || '(空)' }}</p>
        <p class="live-value">{{ changedCountLabel }}:{{ changedCount }} {{ unitTimes }}</p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Header" type="text" v-model="header" placeholder="标头文本" />
        <DemoOptionRow label="PlaceholderText" type="text" v-model="placeholder" placeholder="占位文本" />
        <DemoOptionRow label="IsReadOnly" type="toggle" v-model="readOnly" />
        <DemoOptionRow label="ClearButtonEnabled" type="toggle" v-model="clearEnabled" />
        <DemoOptionRow label="MaxLength(0 = 不限制)" type="slider" v-model="maxLength" :min="0" :max="30" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.text-box-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
  width: 100%;
  max-width: 420px;
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
