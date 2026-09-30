<script setup lang="ts">
// PasswordBoxPage.vue —— PasswordBox 控件示例页(示例组合对照 WinUI Gallery 的 PasswordBoxPage.xaml)。
// 上半区:简单密码框 / 标头+占位 / 可调参数交互框 + 实时长度·强度·事件计数;
// 下半区:固定呈现属性、事件与用法代码。
import { computed, ref } from 'vue'
import WuiPasswordBox from '@/components/PasswordBox.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'PasswordBox(密码框)', en: 'PasswordBox' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '使用 PasswordBox 让用户输入密码等敏感文本。输入内容以掩码显示,可通过揭示模式(Peek / Visible / Hidden)控制临时或持久明文,并可限制最大长度。',
  en: 'Use a PasswordBox to let a user enter sensitive text such as a password. The input is masked, and the reveal mode (Peek / Visible / Hidden) controls temporary or persistent plaintext, with an optional max length.',
}
const LENGTH_LABEL: BilingualText = { zh: '密码长度', en: 'Length' }
const STRENGTH_LABEL: BilingualText = { zh: '密码强度', en: 'Strength' }
const CHANGED_COUNT: BilingualText = { zh: 'passwordChanged 触发次数', en: 'passwordChanged fired' }
const UNIT_TIMES: BilingualText = { zh: '次', en: 'time(s)' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const lengthLabel = useBilingual(i18n, LENGTH_LABEL)
const strengthLabel = useBilingual(i18n, STRENGTH_LABEL)
const changedCountLabel = useBilingual(i18n, CHANGED_COUNT)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例一~二(对照官方示例:Simple / Header+PlaceholderText)——

// —— 示例三:可调参数交互框(选项参数 ref 一律联合类型,匹配 DemoOptionRow 的 v-model 契约;
//      交互框的 Password 只由控件回写,声明为纯 string)——
const interactivePassword = ref('')
const header = ref<string | number | boolean>('密码:')
const placeholder = ref<string | number | boolean>('输入密码')
const revealMode = ref<string | number | boolean>('Peek')
const maxLength = ref<string | number | boolean>(0)
const changedCount = ref(0)

const headerValue = computed(() => String(header.value))
const placeholderValue = computed(() => String(placeholder.value))
const revealModeValue = computed(() => {
  const value = String(revealMode.value)
  return value === 'Hidden' || value === 'Visible' ? value : 'Peek'
})
const maxLengthValue = computed(() => {
  const parsed = Number(maxLength.value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
})

function onPasswordChanged(): void {
  changedCount.value += 1
}

// —— 密码长度 / 强度(仅展示长度与强度,不在页面明文回显密码)——
const passwordLength = computed(() => interactivePassword.value.length)

// 粗略强度:长度 + 字符种类,0 空 / 1 弱 / 2 中 / 3 强(仅作演示,非安全建议)。
const STRENGTH_LABELS: BilingualText[] = [
  { zh: '(空)', en: '(empty)' },
  { zh: '弱', en: 'Weak' },
  { zh: '中', en: 'Medium' },
  { zh: '强', en: 'Strong' },
]

const strengthLevel = computed(() => {
  const value = interactivePassword.value
  if (!value) return 0
  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return score <= 1 ? 1 : score <= 3 ? 2 : 3
})

const strengthText = computed(() => pickText(i18n, STRENGTH_LABELS[strengthLevel.value]))

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['password', 'string', "''", '密码值;支持 v-model:password 双向绑定(交互框实时调节)'],
  ['header', 'string', "''", '输入框上方的标头文本(「标头文本」实时调节)'],
  ['placeholderText', 'string', "''", '空内容时的占位文本(「占位文本」实时调节)'],
  ['passwordRevealMode', "'Hidden' | 'Visible' | 'Peek'", "'Peek'", '揭示模式:Peek 聚焦且有内容期间显示揭示按钮、按住临时明文;Visible 始终明文;Hidden 始终掩码(下拉实时调节)'],
  ['maxLength', 'number', '0', '最大字符数;0 表示不限制(滑块实时调节)'],
  ['autocomplete', 'string', "'new-password'", '透传原生 autocomplete;密码场景建议 new-password 或 current-password'],
  ['disabled', 'boolean', 'false', '禁用;走原生 input disabled,样式对照 Disabled 视觉状态'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['passwordChanged', '(value: string) => void', '密码变化时实时触发;IME 组合期间不触发,组合结束后触发一次'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiPasswordBox
  v-model:password="pwd"
  header="${headerValue.value}"
  placeholder-text="${placeholderValue.value}"
  password-reveal-mode="${revealModeValue.value}"
  :max-length="${maxLengthValue.value}"
  @password-changed="onPasswordChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="PasswordBox">
    <template #demo>
      <div class="password-box-stage">
        <!-- 简单 PasswordBox(默认 Peek:聚焦且有内容期间显示揭示按钮,按住临时明文) -->
        <WuiPasswordBox class="stage-item" />

        <!-- 标头 + 占位文本(对照官方示例 Header="Password" PlaceholderText="Enter your password") -->
        <WuiPasswordBox class="stage-item" header="Password" placeholder-text="Enter your password" />

        <!-- 可调参数交互框 + 实时长度 / 强度 / 事件计数 -->
        <WuiPasswordBox
          v-model:password="interactivePassword"
          class="stage-item"
          :header="headerValue"
          :placeholder-text="placeholderValue"
          :password-reveal-mode="revealModeValue"
          :max-length="maxLengthValue"
          @password-changed="onPasswordChanged"
        />
        <p class="live-value">{{ lengthLabel }}:{{ passwordLength }}</p>
        <p class="live-value">{{ strengthLabel }}:{{ strengthText }}</p>
        <p class="live-value">{{ changedCountLabel }}:{{ changedCount }} {{ unitTimes }}</p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Header" type="text" v-model="header" placeholder="标头文本" />
        <DemoOptionRow label="PlaceholderText" type="text" v-model="placeholder" placeholder="占位文本" />
        <DemoOptionRow
          label="PasswordRevealMode"
          type="select"
          v-model="revealMode"
          :options="[
            { label: 'Peek', value: 'Peek' },
            { label: 'Visible', value: 'Visible' },
            { label: 'Hidden', value: 'Hidden' },
          ]"
        />
        <DemoOptionRow label="MaxLength(0 = 不限制)" type="slider" v-model="maxLength" :min="0" :max="30" :step="1" />
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
.password-box-stage {
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
