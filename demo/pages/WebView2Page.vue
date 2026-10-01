<script setup lang="ts">
// WebView2Page.vue —— WebView2 控件示例页(Web 替代实现:iframe 封装,对应官方 WinUI Gallery
// Samples/WebView2/:单示例「Source 指向 learn.microsoft.com 的简单 WebView2」,本页按同一
// 「嵌入网页」意图展开:基本嵌入 + 源切换 + 嵌入失败降级对照)。结构照抄 HomePage.vue 母版:
// DemoPage(标题+描述)→ 交互演示(控件本体多配置)→ DemoOptions(实时改参)
// → DemoDocsTable(属性/事件/方法)+ DemoCode。
// iframe 无导航事件:加载中/失败/超时由组件的 load/error 探测 + 声明式超时近似;
// X-Frame-Options / CSP 拒绝的站点同样触发 load,页面以预设站点(可嵌入 vs 拒嵌)对照演示,
// 并在状态面板如实说明局限。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiWebView2 from '@/components/WebView2.vue'
import type { WebView2Status, WebView2StatusLabels } from '@/components/WebView2.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 WebView2 的 description 译写 + Web 替代说明)——
const PAGE_TITLE: BilingualText = { zh: 'WebView2(iframe 封装)', en: 'WebView2 (iframe wrapper)' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WebView2 是基于 Microsoft Edge(Chromium)的控件,在应用中承载 HTML 内容。Web 端以 iframe 封装替代:iframe 没有导航事件,加载中/失败/超时由 load 探测与声明式超时近似,并以最小权限 sandbox 作默认安全策略。',
  en: 'WebView2 hosts HTML content in the app, powered by Microsoft Edge (Chromium). This web replacement wraps an iframe: no navigation events, so loading/failure/timeout are approximated by load probing plus a declared timeout, with a least-privilege sandbox as the default security policy.',
}
const PRESET_LABEL: BilingualText = { zh: '预设源(可嵌入 vs 拒嵌对照)', en: 'Preset sources (embeddable vs refused)' }
const STATUS_LABEL: BilingualText = { zh: '当前状态', en: 'Current status' }
const EVENT_LOG_LABEL: BilingualText = { zh: '事件日志(最近 8 条)', en: 'Event log (last 8)' }
const RELOAD_LABEL: BilingualText = { zh: '重新加载 Reload', en: 'Reload' }
const GO_BACK_LABEL: BilingualText = { zh: '后退 GoBack', en: 'GoBack' }
const GO_FORWARD_LABEL: BilingualText = { zh: '前进 GoForward', en: 'GoForward' }
const OFFLINE_HINT: BilingualText = {
  zh: '提示:离线 / 网络受限环境下,可嵌入站点同样会走到「加载超时」——timeout 即组件的失败降级演示。',
  en: 'Note: offline or restricted networks drive embeddable sites to the timeout state too — timeout doubles as the failure-degradation demo.',
}
const PROPS_TABLE_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const EVENTS_TABLE_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const METHODS_TABLE_TITLE: BilingualText = { zh: '方法(defineExpose)', en: 'Methods (defineExpose)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const presetLabel = useBilingual(i18n, PRESET_LABEL)
const statusLabel = useBilingual(i18n, STATUS_LABEL)
const eventLogLabel = useBilingual(i18n, EVENT_LOG_LABEL)
const reloadLabel = useBilingual(i18n, RELOAD_LABEL)
const goBackLabel = useBilingual(i18n, GO_BACK_LABEL)
const goForwardLabel = useBilingual(i18n, GO_FORWARD_LABEL)
const offlineHint = useBilingual(i18n, OFFLINE_HINT)
const propsTableTitle = useBilingual(i18n, PROPS_TABLE_TITLE)
const eventsTableTitle = useBilingual(i18n, EVENTS_TABLE_TITLE)
const methodsTableTitle = useBilingual(i18n, METHODS_TABLE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 可调参数(DemoOptionRow 的 v-model 契约要求 string | number | boolean 联合类型)——
const source = ref<string | number | boolean>('https://example.com')
const sandboxChoice = ref<string | number | boolean>('')
const loadTimeout = ref<string | number | boolean>(15000)
const frameHeight = ref<string | number | boolean>(360)

// 沙箱四档:'off' 为哨兵值,映射为 sandbox=false(显式关闭,不安全)。
const SANDBOX_CHOICES = [
  { label: "''(最小权限,默认)", value: '' },
  { label: 'allow-scripts', value: 'allow-scripts' },
  { label: 'allow-scripts allow-same-origin(慎用)', value: 'allow-scripts allow-same-origin' },
  { label: '无沙箱(false,不安全)', value: 'off' },
]

const sourceText = computed(() => String(source.value).trim())
const sandboxValue = computed<string | boolean>(() =>
  sandboxChoice.value === 'off' ? false : String(sandboxChoice.value),
)
const timeoutValue = computed(() => Number(loadTimeout.value))
const heightValue = computed(() => Number(frameHeight.value))

// —— 预设源:可嵌入站点 vs 发送 X-Frame-Options 拒绝的站点(嵌入失败降级对照)——
const PRESETS = [
  { label: 'example.com(可嵌入)', value: 'https://example.com' },
  { label: 'google.com(SAMEORIGIN 拒嵌)', value: 'https://www.google.com' },
  { label: 'developer.mozilla.org(DENY 拒嵌)', value: 'https://developer.mozilla.org' },
  { label: 'learn.microsoft.com(官方示例源)', value: 'https://learn.microsoft.com' },
]

function onPresetClick(value: string): void {
  source.value = value
}

// —— 状态镜像与事件日志(组件内部状态经事件同步到演示面板)——
const webview = ref<InstanceType<typeof WuiWebView2> | null>(null)
const lastStatus = ref<WebView2Status>('idle')
// 条目带自增 id:同一秒内重复事件会产生相同文本,避免 v-for 重复 key。
const eventLog = ref<{ id: number; text: string }[]>([])
let eventSeq = 0

function logEvent(text: string): void {
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false })
  eventLog.value = [{ id: eventSeq++, text: `${time}  ${text}` }, ...eventLog.value].slice(0, 8)
}

function onNavigationStarting(event: { uri: string }): void {
  lastStatus.value = 'loading'
  logEvent(`navigationStarting → ${event.uri}`)
}

function onNavigationCompleted(event: { isSuccess: boolean; status: WebView2Status }): void {
  lastStatus.value = event.status
  logEvent(`navigationCompleted isSuccess=${event.isSuccess} (${event.status})`)
}

// —— 状态说明(如实声明 iframe 探测的局限)——
const STATUS_TEXT: Record<WebView2Status, BilingualText> = {
  idle: { zh: '未加载任何源。', en: 'No source loaded.' },
  loading: {
    zh: '正在加载……iframe 没有加载事件,此状态由源变更触发,由 load / error / 声明式超时收束。',
    en: 'Loading… iframes expose no navigation events: this state starts on source change and settles on load, error, or the declared timeout.',
  },
  loaded: {
    zh: 'load 已触发。注意:被 X-Frame-Options / CSP 拒绝的站点同样触发 load——帧内空白或浏览器错误页即为被拒,脚本无法跨源证实。',
    en: 'load fired. Note: sites refused via X-Frame-Options / CSP also fire load — a blank frame or browser error page means refused, which script cannot confirm cross-origin.',
  },
  timeout: {
    zh: '超过声明超时仍未 load,已按失败降级(常见于离线或网络受限)。',
    en: 'No load within the declared timeout; treated as failed (typical when offline or network-restricted).',
  },
  error: {
    zh: 'iframe error 事件(罕见;多数嵌入失败不走此事件)。',
    en: 'iframe error event (rare; most embed refusals do not reach it).',
  },
}
const statusExplanation = computed(() => pickText(i18n, STATUS_TEXT[lastStatus.value]))

// 组件覆盖层文案随站点语言切换(覆盖组件英文默认值)。
const OVERLAY_LABELS = {
  zh: { idle: '未加载', loading: '正在加载…', timeout: '加载超时', error: '导航失败' },
  en: { idle: 'No source', loading: 'Loading…', timeout: 'Timed out', error: 'Navigation failed' },
}
const statusLabels = computed<WebView2StatusLabels>(() =>
  i18n.locale.value.startsWith('zh') ? OVERLAY_LABELS.zh : OVERLAY_LABELS.en,
)

// —— 工具栏:Reload / GoBack / GoForward(iframe history 有限,结果如实展示)——
const HISTORY_OK: BilingualText = { zh: '已请求前进/后退(仅同源帧可执行)', en: 'History traversal requested (same-origin frames only)' }
const HISTORY_FAIL: BilingualText = {
  zh: '失败:跨源帧的 history 访问被禁止(SecurityError)——iframe history 有限,如实声明',
  en: 'Failed: cross-origin history access is forbidden (SecurityError) — an iframe history limitation, declared as-is',
}
const historyHintText = ref<BilingualText | null>(null)
const historyHint = computed(() => (historyHintText.value === null ? '' : pickText(i18n, historyHintText.value)))

function onReload(): void {
  historyHintText.value = null
  webview.value?.reload()
}

function tryHistory(direction: 'back' | 'forward'): void {
  const frame = webview.value
  const ok = direction === 'back' ? (frame?.goBack() ?? false) : (frame?.goForward() ?? false)
  historyHintText.value = ok ? HISTORY_OK : HISTORY_FAIL
  logEvent(`go${direction === 'back' ? 'Back' : 'Forward'}() → ${ok}`)
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Source', 'string', "''", '页面 URI(对应 WinUI Source);变更即重新导航,为空且未设 Html 时为 idle'],
  ['Html', 'string', "''", 'HTML 字符串(对应 WinUI NavigateToString → iframe srcdoc);非空时优先于 Source'],
  ['Sandbox', "string | boolean | null", "''(最小权限)", "HTML sandbox 属性:默认空 token 全禁(脚本/表单/弹窗/同源/顶层导航);传 token 串逐项扩权;传 false/null 显式关闭(不安全)"],
  ['LoadTimeoutMs', 'number', '15000', 'Web 侧声明式超时(ms);超时状态置 timeout 并触发 navigationCompleted(isSuccess=false);≤ 0 关闭'],
  ['Title', 'string', "'Web content'", 'iframe 无障碍标题'],
  ['StatusLabels', 'WebView2StatusLabels', '{}', '状态覆盖层文案逐项覆盖(idle/loading/timeout/error;英文默认)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['navigationStarting', '{ uri: string }', '导航开始(Source/Html 变更或 reload());近似 WinUI NavigationStarting'],
  ['sourceChanged', '{ uri: string }', 'Source/Html 属性变更(挂载时的初始导航不触发);近似 WinUI SourceChanged'],
  ['navigationCompleted', '{ isSuccess, status, uri }', 'load(成功与被拒都触发)/ error / 超时声明时触发;近似 WinUI NavigationCompleted'],
]

const methodHeaders = ['方法', '返回', '说明']
const methodRows: (string | number)[][] = [
  ['reload()', 'boolean', '重新加载当前源(强制重挂载 iframe);无源时返回 false。对应 WinUI Reload'],
  ['goBack()', 'boolean', '尽力尝试:同源帧调 history.back(),跨源恒 SecurityError → false。对应 WinUI GoBack'],
  ['goForward()', 'boolean', '尽力尝试,限制同 goBack。对应 WinUI GoForward'],
  ['frame / status', 'HTMLIFrameElement / Ref<WebView2Status>', '内部 iframe 元素(postMessage 等进阶用法)与当前状态'],
]

// 用法代码随参数实时更新(与组件语义一致:Sandbox 为 off 时不输出该行)。
const usageCode = computed(() => {
  const lines: string[] = ['<WuiWebView2', `  Source="${sourceText.value}"`]
  if (sandboxValue.value !== false) lines.push(`  Sandbox="${String(sandboxValue.value)}"`)
  lines.push(`  :LoadTimeoutMs="${timeoutValue.value}"`)
  lines.push('  @navigation-starting="onNavigationStarting"')
  lines.push('  @navigation-completed="onNavigationCompleted" />')
  return lines.join('\n')
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="WebView2">
    <template #demo>
      <div class="webview-stage">
        <!-- 配置 1:预设源切换 —— 可嵌入站点与 X-Frame-Options 拒嵌站点对照(演示失败降级) -->
        <div class="preset-group" role="group" :aria-label="presetLabel">
          <span class="preset-label">{{ presetLabel }}</span>
          <div class="preset-row">
            <WuiButton
              v-for="preset in PRESETS"
              :key="preset.value"
              :content="preset.label"
              :font-size="12"
              @click="onPresetClick(preset.value)"
            />
          </div>
        </div>

        <!-- 控件本体:参数由左侧面板实时驱动 -->
        <WuiWebView2
          ref="webview"
          class="webview-frame"
          :source="sourceText"
          :sandbox="sandboxValue"
          :load-timeout-ms="timeoutValue"
          :status-labels="statusLabels"
          :style="{ height: `${heightValue}px` }"
          :aria-label="statusLabel"
          @navigation-starting="onNavigationStarting"
          @navigation-completed="onNavigationCompleted"
        />

        <!-- 配置 2:Reload / GoBack / GoForward(对应 WinUI 同名方法;history 结果如实展示) -->
        <div class="toolbar">
          <WuiButton :content="reloadLabel" :font-size="12" @click="onReload" />
          <WuiButton :content="goBackLabel" :font-size="12" @click="tryHistory('back')" />
          <WuiButton :content="goForwardLabel" :font-size="12" @click="tryHistory('forward')" />
          <span v-if="historyHint !== ''" class="history-hint">{{ historyHint }}</span>
        </div>

        <!-- 状态面板:当前状态 + 说明 + 事件日志 -->
        <div class="status-panel">
          <p class="status-line">
            <span class="status-name">{{ statusLabel }}:</span>
            <code class="status-value">{{ lastStatus }}</code>
            <span class="status-explanation">{{ statusExplanation }}</span>
          </p>
          <p class="event-log-title">{{ eventLogLabel }}</p>
          <ul v-if="eventLog.length > 0" class="event-log">
            <li v-for="entry in eventLog" :key="entry.id">{{ entry.text }}</li>
          </ul>
          <p v-else class="event-log-empty">—</p>
          <p class="offline-hint">{{ offlineHint }}</p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Source(源 URI)" type="text" v-model="source" placeholder="https://…" />
        <DemoOptionRow label="Sandbox(安全策略)" type="select" v-model="sandboxChoice" :options="SANDBOX_CHOICES" />
        <DemoOptionRow label="LoadTimeoutMs(0=关闭)" type="slider" v-model="loadTimeout" :min="0" :max="30000" :step="500" />
        <DemoOptionRow label="Height(高度 px)" type="slider" v-model="frameHeight" :min="240" :max="640" :step="20" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ propsTableTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ eventsTableTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ methodsTableTitle }}</h3>
      <DemoDocsTable :headers="methodHeaders" :rows="methodRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.webview-stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preset-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-label {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.webview-frame {
  width: 100%;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.history-hint {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.status-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 4px;
  background: var(--wui-application-page-background-theme);
}

.status-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.status-name {
  color: var(--wui-application-secondary-foreground-theme);
}

.status-value {
  font-family: Consolas, monospace;
  color: var(--wui-hyperlink-foreground-theme);
}

.status-explanation {
  color: var(--wui-application-secondary-foreground-theme);
}

.event-log-title {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

.event-log {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: Consolas, monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.event-log-empty {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.offline-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
