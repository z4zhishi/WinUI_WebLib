<script setup lang="ts">
// InfoBarPage.vue —— InfoBar 控件示例页(结构照抄 HomePage 母版)。
// 参数组合参照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/InfoBar/InfoBarPage.xaml:
//   示例 1:Severity 下拉(Informational/Success/Warning/Error)+ IsOpen 开关;
//   示例 2:Action Button(None/Button/Hyperlink)+ 长短 Message;
//   示例 3:IsIconVisible / IsClosable 开关。事件区附 Closing(可 Cancel 回滚)/Closed 日志。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiHyperlinkButton from '@/components/HyperlinkButton.vue'
import WuiInfoBar from '@/components/InfoBar.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'

/** 与组件一致的 closing / closed 事件参数结构。 */
interface InfoBarEventArgs {
  reason: 'CloseButton' | 'Programmatic'
}

interface InfoBarClosingArgs extends InfoBarEventArgs {
  cancel: boolean
}

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const title = ref<string | number | boolean>('Title')
const message = ref<string | number | boolean>(
  'Essential app message for your users to be informed of, acknowledge, or take action on.',
)
const severity = ref<string | number | boolean>('Informational')
const isOpen = ref<string | number | boolean>(true)
const isIconVisible = ref<string | number | boolean>(true)
const isClosable = ref<string | number | boolean>(true)
const cancelClosing = ref<string | number | boolean>(false)
const actionKind = ref<string | number | boolean>('None')

const titleValue = computed(() => String(title.value))
const messageValue = computed(() => String(message.value))
const severityValue = computed(() => {
  const value = String(severity.value)
  return value === 'Success' || value === 'Warning' || value === 'Error' ? value : 'Informational'
})
const iconVisibleValue = computed(() => isIconVisible.value === true)
const closableValue = computed(() => isClosable.value === true)
const actionKindValue = computed(() => {
  const value = String(actionKind.value)
  return value === 'Button' || value === 'Hyperlink' ? value : 'None'
})

// IsOpen 开关 ↔ 控件双向联动(v-model 需要可写 computed)。
const boundOpen = computed({
  get: () => isOpen.value === true,
  set: (value: boolean) => {
    isOpen.value = value
  },
})

const severityOptions = [
  { label: 'Informational(默认)', value: 'Informational' },
  { label: 'Success', value: 'Success' },
  { label: 'Warning', value: 'Warning' },
  { label: 'Error', value: 'Error' },
]

const actionOptions = [
  { label: 'None', value: 'None' },
  { label: 'Button', value: 'Button' },
  { label: 'Hyperlink', value: 'Hyperlink' },
]

// —— 四档对照排(官方示例 1 的 Severity 枚举全量;非关闭式保证常显对照)——
const SEVERITY_DEMO_MESSAGE =
  'Essential app message for your users to be informed of, acknowledge, or take action on.'
const severityRows = [
  { severity: 'Informational', label: 'Informational(信息)' },
  { severity: 'Success', label: 'Success(成功)' },
  { severity: 'Warning', label: 'Warning(警告)' },
  { severity: 'Error', label: 'Error(错误)' },
] as const

// —— 事件日志(CloseButtonClick / Closing / Closed 实时呈现,含 Cancel 回滚演示)——
const eventLog = ref<string[]>([])
let logSeq = 0

function logEvent(text: string): void {
  logSeq += 1
  eventLog.value = [`#${logSeq} ${text}`, ...eventLog.value].slice(0, 6)
}

function onCloseButtonClick(): void {
  logEvent('closeButtonClick')
}

function onClosing(args: InfoBarClosingArgs): void {
  const cancelled = cancelClosing.value === true
  if (cancelled) args.cancel = true
  logEvent(`closing(reason: ${args.reason}${cancelled ? ', cancel: true → 已取消关闭' : ''})`)
}

function onClosed(args: InfoBarEventArgs): void {
  logEvent(`closed(reason: ${args.reason})`)
}

function onActionClick(): void {
  logEvent('操作按钮 click')
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['Title', 'string', '标题文本;同名 #title slot 优先(文本框实时调节)'],
  ['Message', 'string', '消息正文;同名 #message slot 优先(文本框实时调节)'],
  ['Severity', "'Informational' | 'Success' | 'Warning' | 'Error'", '严重级别:四档背景 / 图标配色与 role 语义(alert/status)随动(下拉实时切换)'],
  ['IsIconVisible', 'boolean(v-model 不适用,单向 prop)', '是否显示图标;无 #icon slot 时按档位渲染默认图标(开关实时切换)'],
  ['IsClosable', 'boolean', '是否显示关闭按钮(开关实时切换)'],
  ['IsOpen', 'boolean(v-model:is-open)', '打开状态,双向绑定;关闭经 Closing(可 Cancel)→ 关闭动画 → Closed 链路'],
  ['CloseButtonAriaLabel', 'string', "关闭按钮 aria-label 与 tooltip,缺省「关闭」"],
  ['CloseButtonClick', '() => void', '点击关闭按钮时触发(之后才走 Closing 链路)'],
  ['Closing', '(args: { reason, cancel }) => void', '关闭前触发;reason 为 CloseButton / Programmatic,handler 置 args.cancel = true 可取消关闭'],
  ['Closed', '(args: { reason }) => void', '关闭动画结束后触发'],
  ['action slot', '—', '操作区(WinUI ActionButton),通常放 Button 或 HyperlinkButton'],
  ['icon slot / 默认 slot', '—', '自定义图标(WinUI IconSource)/ 附加内容区(WinUI Content)'],
]

// 用法代码随参数实时更新(较长,放 computed;引号规则:外双内单)。
const usageCode = computed(
  () => `<WuiInfoBar
  v-model:is-open="isOpen"
  title="${titleValue.value}"
  message="${messageValue.value}"
  severity="${severityValue.value}"
  :is-icon-visible="${iconVisibleValue.value}"
  :is-closable="${closableValue.value}"
  @close-button-click="onCloseButtonClick"
  @closing="onClosing"
  @closed="onClosed" />`,
)
</script>

<template>
  <DemoPage wiki="InfoBar"
    title="InfoBar"
    description="内联通知条:以四档严重级别(Informational / Success / Warning / Error)展示应用级状态变化,默认常驻内容区直至用户关闭,不打断操作流。支持标题、正文、图标、操作按钮与可取消的关闭事件。"
  >
    <template #demo>
      <div class="infobar-stage">
        <!-- 主演示:与参数面板联动(官方示例 1/2/3 参数合集) -->
        <div class="infobar-example">
          <WuiInfoBar
            v-model:is-open="boundOpen"
            class="infobar-demo-main"
            :title="titleValue"
            :message="messageValue"
            :severity="severityValue"
            :is-icon-visible="iconVisibleValue"
            :is-closable="closableValue"
            @close-button-click="onCloseButtonClick"
            @closing="onClosing"
            @closed="onClosed"
          >
            <template v-if="actionKindValue === 'Button'" #action>
              <WuiButton @click="onActionClick">Action</WuiButton>
            </template>
            <template v-else-if="actionKindValue === 'Hyperlink'" #action>
              <WuiHyperlinkButton navigate-uri="https://www.example.com" target="_blank">
                Informational link
              </WuiHyperlinkButton>
            </template>
          </WuiInfoBar>
          <p class="infobar-state">IsOpen = {{ boundOpen }} · Closing.Cancel = {{ cancelClosing === true }}</p>
        </div>

        <!-- 四档严重级别对照排(官方 Severity 枚举全量,非关闭式常显) -->
        <div class="infobar-example">
          <div class="infobar-severity-rows">
            <WuiInfoBar
              v-for="row in severityRows"
              :key="row.severity"
              :severity="row.severity"
              :title="row.label"
              :message="SEVERITY_DEMO_MESSAGE"
              :is-open="true"
              :is-closable="false"
            />
          </div>
          <p class="infobar-caption">四档 Severity 配色对照(Informational / Success / Warning / Error)</p>
        </div>

        <!-- 事件日志 -->
        <div class="infobar-example infobar-log">
          <p class="infobar-log-title">事件日志(关闭主通知条观察时序;勾选「取消关闭」演示 Closing.Cancel 回滚)</p>
          <ul class="infobar-log-list">
            <li v-for="(entry, index) in eventLog" :key="index">{{ entry }}</li>
            <li v-if="eventLog.length === 0" class="infobar-log-empty">— 暂无事件 —</li>
          </ul>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Title" type="text" v-model="title" placeholder="标题文本" />
        <DemoOptionRow label="Message" type="text" v-model="message" placeholder="消息正文" />
        <DemoOptionRow label="Severity" type="select" v-model="severity" :options="severityOptions" />
        <DemoOptionRow
          label="Action Button"
          type="select"
          v-model="actionKind"
          :options="actionOptions"
        />
        <DemoOptionRow label="IsOpen" type="toggle" v-model="isOpen" />
        <DemoOptionRow label="IsClosable 关闭按钮" type="toggle" v-model="isClosable" />
        <DemoOptionRow label="IsIconVisible 图标" type="toggle" v-model="isIconVisible" />
        <DemoOptionRow label="取消关闭(Closing.Cancel)" type="toggle" v-model="cancelClosing" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.infobar-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.infobar-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.infobar-demo-main {
  width: 100%;
  max-width: 560px;
}

.infobar-severity-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 720px;
}

.infobar-state {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.infobar-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 事件日志卡片 —— */
.infobar-log {
  max-width: 560px;
}

.infobar-log-title {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.infobar-log-list {
  width: 100%;
  margin: 0;
  padding: 8px 16px;
  list-style: none;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: var(--wui-content-presenter-font-family, monospace);
  color: var(--wui-default-text-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.infobar-log-empty {
  color: var(--wui-application-secondary-foreground-theme);
}
</style>
