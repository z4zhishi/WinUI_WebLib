<script setup lang="ts">
// HyperlinkButtonPage.vue —— HyperlinkButton 控件示例页(对应官方 WinUI Gallery Samples/HyperlinkButton/)。
// 结构照抄 HomePage.vue 母版:DemoPage(标题+描述)→ 交互演示(控件本体多配置)
// → DemoOptions(文本框/下拉/开关实时改参)→ DemoDocsTable + DemoCode。
// 示例配置对照官方页面:示例一 NavigateUri 导航 + 禁用开关,示例二仅处理 Click 不导航;
// 另补充插槽「图标 + 文字」组合与 _blank 外链安全(rel="noopener noreferrer")演示。
import { computed, ref } from 'vue'
import WuiHyperlinkButton from '@/components/HyperlinkButton.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 HyperlinkButton 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'HyperlinkButton(超链接按钮)', en: 'HyperlinkButton' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'HyperlinkButton 控件呈现为文本超链接。用户单击时,若设置了 NavigateUri 则在默认浏览器中打开该页面;也可以只处理 Click 事件,通常用于应用内导航。',
  en: 'A HyperlinkButton appears as a text hyperlink. When a user clicks it, it opens the page you specify in the NavigateUri property in the default browser. Or you can handle its Click event, typically to navigate within your app.',
}
const URI_HINT: BilingualText = {
  zh: 'NavigateUri 为空时渲染为按钮语义,仅触发 click、不跳转',
  en: 'With an empty NavigateUri it renders as a button: click fires, no navigation',
}
const CLICK_HINT: BilingualText = { zh: 'Click 已触发', en: 'Click fired' }
const UNIT_TIMES: BilingualText = { zh: '次', en: 'time(s)' }
const PROPS_TABLE_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const EVENTS_TABLE_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const uriHint = useBilingual(i18n, URI_HINT)
const clickHint = useBilingual(i18n, CLICK_HINT)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const propsTableTitle = useBilingual(i18n, PROPS_TABLE_TITLE)
const eventsTableTitle = useBilingual(i18n, EVENTS_TABLE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 可调参数(DemoOptionRow 的 v-model 契约要求 string | number | boolean 联合类型)——
const content = ref<string | number | boolean>('Microsoft home page')
const navigateUri = ref<string | number | boolean>('https://www.microsoft.com')
const target = ref<string | number | boolean>('_blank')
const disabled = ref<string | number | boolean>(false)
const clickCount = ref(0)

const TARGET_CHOICES = [
  { label: '无(当前页)', value: '' },
  { label: '_blank(新窗口)', value: '_blank' },
  { label: '_self(当前窗口)', value: '_self' },
]

const contentText = computed(() => String(content.value))
const uriText = computed(() => String(navigateUri.value).trim())
const targetText = computed(() => String(target.value))
const disabledValue = computed(() => disabled.value === true)

function onControlClick(): void {
  clickCount.value += 1
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Content', 'string', "''", '链接文字;复杂内容(图标 + 文字)用默认插槽放置,插槽内容优先'],
  ['NavigateUri', 'string', "''", '目标 URI;有值渲染 <a> 并默认导航,为空渲染 <button> 仅触发 click 不跳转'],
  ['Target', 'string', "''(当前页)", 'HTML target 打开方式;为 _blank 时自动附加 rel="noopener noreferrer"'],
  ['Disabled', 'boolean', 'false', '是否禁用,对应 WinUI IsEnabled;禁用后不触发 click、不导航'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent)', '被点击时触发(鼠标单击,或聚焦后按 Enter 键);NavigateUri 有值时浏览器默认导航继续,除非在处理器中调用 event.preventDefault()'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射(与组件语义一致:
// NavigateUri 为空时不输出 Target 行,此时组件渲染为 button)。
const usageCode = computed(() => {
  const lines: string[] = ['<WuiHyperlinkButton', `  Content="${contentText.value}"`]
  if (uriText.value !== '') {
    lines.push(`  NavigateUri="${uriText.value}"`)
    if (targetText.value !== '') lines.push(`  Target="${targetText.value}"`)
  }
  lines.push(`  :Disabled="${disabledValue.value}"`)
  lines.push('  @click="onHyperlinkButtonClick" />')
  return lines.join('\n')
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="HyperlinkButton">
    <template #demo>
      <div class="hyperlink-stage">
        <!-- 配置 1:NavigateUri 导航(对应官方示例一),参数由左侧面板实时驱动 -->
        <WuiHyperlinkButton
          :content="contentText"
          :navigate-uri="uriText"
          :target="targetText || undefined"
          :disabled="disabledValue"
        />
        <p class="hint">{{ uriHint }}</p>

        <!-- 配置 2:仅处理 Click,不设 NavigateUri,不发生导航(对应官方示例二) -->
        <div class="row">
          <WuiHyperlinkButton
            content="Go to ToggleButton(仅 Click,不导航)"
            @click="onControlClick"
          />
          <span class="click-hint">{{ clickHint }} {{ clickCount }} {{ unitTimes }}</span>
        </div>

        <!-- 配置 3:插槽内容,图标 + 文字组合;_blank 外链自动携带 rel="noopener noreferrer" -->
        <WuiHyperlinkButton
          navigate-uri="https://learn.microsoft.com/windows/apps/design/controls/hyperlinks"
          target="_blank"
          :disabled="disabledValue"
          aria-label="超链接设计指南(外部链接)"
        >
          <svg class="slot-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M6.5 2.5H2.8A1.3 1.3 0 0 0 1.5 3.8v9.4a1.3 1.3 0 0 0 1.3 1.3h9.4a1.3 1.3 0 0 0 1.3-1.3V9.5h-1.6v3.4H3.1V4.1h3.4Z"
              fill="currentColor"
            />
            <path
              d="M9.2 1.5h5.3v5.3h-1.6V4.16L8.05 9 7 7.95 11.84 3.1H9.2Z"
              fill="currentColor"
            />
          </svg>
          <span>超链接设计指南(_blank 外部链接)</span>
        </WuiHyperlinkButton>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Content" type="text" v-model="content" placeholder="链接文字" />
        <DemoOptionRow label="NavigateUri" type="text" v-model="navigateUri" placeholder="https://…" />
        <DemoOptionRow label="Target(打开方式)" type="select" v-model="target" :options="TARGET_CHOICES" />
        <DemoOptionRow label="Disabled(是否禁用)" type="toggle" v-model="disabled" />
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
.hyperlink-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.click-hint {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 插槽内联图标:currentColor 跟随超链接前景状态色 */
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
