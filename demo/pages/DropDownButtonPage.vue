<script setup lang="ts">
// DropDownButtonPage.vue —— DropDownButton 控件示例页(对应官方 WinUI Gallery
// Samples/DropDownButton/:DropDownButtonSimple.txt 纯文本菜单、DropDownButtonIcon.txt
// 图标菜单;另按任务要求补任意内容 flyout、placement 演示与事件日志)。
// 结构照抄已通过 QA 的 FlyoutPage / MenuFlyoutPage 母版:DemoPage(标题+描述)→
// 交互演示 → DemoOptions(select/toggle 实时改参)→ DemoDocsTable + DemoCode。
// 文案暂用中文双语文案常量(全站六语言在阶段 8 统一)。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiDropDownButton from '@/components/DropDownButton.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiMenuFlyoutItem from '@/components/MenuFlyoutItem.vue'
import WuiMenuFlyoutSeparator from '@/components/MenuFlyoutSeparator.vue'
import WuiMenuFlyoutSubItem from '@/components/MenuFlyoutSubItem.vue'
import WuiTextBox from '@/components/TextBox.vue'
import type { PopupPlacement } from '@/composables/usePopup'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 DropDownButton 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'DropDownButton(下拉按钮)', en: 'DropDownButton' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '点击时下拉一个 flyout 供选项选择的控件。按钮本体带下拉箭头字形,点击整钮开/再点关;flyout 可承载菜单族或任意内容,支持 light dismiss 与键盘操作(Enter/Space/↓ 打开)。',
  en: 'A control that drops down a flyout of choices when clicked. The button carries a chevron glyph, toggles on click, hosts a menu family or arbitrary content, and supports light dismiss and keyboard access.',
}
const SECTION_OFFICIAL_TITLE: BilingualText = { zh: '官方示例复刻(内嵌 MenuFlyout)', en: 'Official samples (embedded MenuFlyout)' }
const SECTION_CONTENT_TITLE: BilingualText = { zh: '内嵌任意内容 flyout', en: 'Arbitrary flyout content' }
const SECTION_PLACEMENT_TITLE: BilingualText = { zh: 'Placement 演示(参数面板实时调节)', en: 'Placement modes' }
const SECTION_KEYBOARD_TITLE: BilingualText = { zh: '键盘操作', en: 'Keyboard interaction' }
const LABEL_LAST_ACTION: BilingualText = { zh: '最近动作', en: 'Last action' }
const LABEL_FEEDBACK_HINT: BilingualText = { zh: '告诉我们你的想法:', en: 'Tell us your thoughts:' }
const LABEL_FEEDBACK_SENT: BilingualText = { zh: '反馈已发送,感谢!', en: 'Feedback sent. Thank you!' }
const LABEL_OPEN_STATE: BilingualText = { zh: '当前 isOpen', en: 'Current isOpen' }
const NO_EVENTS_HINT: BilingualText = { zh: '尚无事件,试试操作上面任意按钮', en: 'No events yet' }
const EVENT_LOG_TITLE: BilingualText = { zh: '事件日志(placement 示例)', en: 'Event log (placement sample)' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionOfficialTitle = useBilingual(i18n, SECTION_OFFICIAL_TITLE)
const sectionContentTitle = useBilingual(i18n, SECTION_CONTENT_TITLE)
const sectionPlacementTitle = useBilingual(i18n, SECTION_PLACEMENT_TITLE)
const sectionKeyboardTitle = useBilingual(i18n, SECTION_KEYBOARD_TITLE)
const labelLastAction = useBilingual(i18n, LABEL_LAST_ACTION)
const labelFeedbackHint = useBilingual(i18n, LABEL_FEEDBACK_HINT)
const labelFeedbackSent = useBilingual(i18n, LABEL_FEEDBACK_SENT)
const labelOpenState = useBilingual(i18n, LABEL_OPEN_STATE)
const noEventsHint = useBilingual(i18n, NO_EVENTS_HINT)
const eventLogTitle = useBilingual(i18n, EVENT_LOG_TITLE)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例 1:官方示例复刻(Email 菜单;点击项后整条关闭,记录最近动作)——
const emailAction = ref('—')

function onEmailAction(name: string): void {
  emailAction.value = name
}

// —— 示例 2:内嵌任意内容 flyout(表单;焦点在字段间移动不关闭,焦点移出即关闭)——
const feedbackText = ref('')
const feedbackSent = ref(false)

function onFeedbackOpen(): void {
  feedbackSent.value = false
}

function onSendFeedback(): void {
  if (feedbackText.value.trim() === '') return
  feedbackSent.value = true
  feedbackText.value = ''
}

// —— 示例 3:placement 演示(参数面板驱动)+ isOpen 编程开关 + disabled ——
const demoPlacement = ref<string | number | boolean>('bottom-start')
const demoIsOpenOption = ref<string | number | boolean>(false)
const demoDisabled = ref<string | number | boolean>(false)

const placementOptions = [
  { label: 'bottom-start', value: 'bottom-start' },
  { label: 'bottom', value: 'bottom' },
  { label: 'bottom-end', value: 'bottom-end' },
  { label: 'top-start', value: 'top-start' },
  { label: 'top', value: 'top' },
  { label: 'top-end', value: 'top-end' },
  { label: 'left-start', value: 'left-start' },
  { label: 'right-end', value: 'right-end' },
]

// 下拉值(string)→ PopupPlacement(白名单校验,未知值回退默认)
const PLACEMENT_WHITELIST: readonly string[] = placementOptions.map((option) => option.value)
const placementValue = computed<PopupPlacement>(() => {
  const value = String(demoPlacement.value)
  return PLACEMENT_WHITELIST.includes(value) ? (value as PopupPlacement) : 'bottom-start'
})

// DemoOptionRow 的 v-model 契约是 string | number | boolean 联合类型,回读时收窄
const demoIsOpen = computed<boolean>({
  get: () => demoIsOpenOption.value === true,
  set: (value) => {
    demoIsOpenOption.value = value
  },
})

const isDisabled = computed(() => demoDisabled.value === true)

// —— 事件日志(opening/opened/closing/closed,近 6 条)——
const eventLog = ref<string[]>([])

function logEvent(name: 'opening' | 'opened' | 'closing' | 'closed'): void {
  const stamp = new Date().toLocaleTimeString()
  eventLog.value = [`${stamp}  Placement → ${name}`, ...eventLog.value].slice(0, 6)
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Content', 'string', "''", '按钮文本(WinUI Content);默认 slot 可放 FontIcon 等任意内容(slot 优先)'],
  ['Disabled', 'boolean', 'false', '禁用(WinUI IsEnabled 的取反映映射):不触发、不可打开 flyout'],
  ['Placement', "PopupPlacement('top'/'bottom'/'left'/'right' 及 -start/-end 变体)", "'bottom-start'", 'flyout 放置位(官方示例 MenuFlyout Placement=BottomEdgeAlignedLeft 的映射);空间不足自动翻转/推回'],
  ['Offset', 'number', '4', 'flyout 与按钮的主轴间距(px)'],
  ['IsOpen (v-model)', 'boolean', 'false', 'flyout 开关,v-model:is-open 双向绑定(WinUI 按钮无 IsOpen 属性,状态在 FlyoutBase 上且只读,Web 侧合并暴露,见 wiki)'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent)', '点击按钮(Space/Enter 同样触发,禁用时不触发);WinUI Click'],
  ['opening / opened', '—', 'flyout 开始打开 / 已打开并完成首次定位(WinUI Opening / Opened)'],
  ['closing / closed', '—', 'flyout 开始关闭 / 已关闭(WinUI Closing / Closed)'],
  ['update:isOpen', '(value: boolean)', 'v-model:is-open 双向绑定更新'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['Enter / Space', '激活按钮:flyout 关 → 开、开 → 关(原生按钮语义)'],
  ['↓ / Alt+↓', '打开 flyout 并焦点入层(菜单内容落首项);已打开时再次按下把焦点移入层'],
  ['↑ / ↓ / Home / End', '菜单内容:在菜单项间循环移动 / 跳到首、末项(任意内容不劫持方向键)'],
  ['Esc', '关闭 flyout 并把焦点归还按钮;子菜单打开时逐级收起(每次只关最深层)'],
  ['Tab', '菜单内容:关闭 flyout,焦点自然移动;任意内容:焦点移出层外即关闭'],
]
const usageCode = computed(
  () => `<WuiDropDownButton content="Email" placement="bottom-start">
  <template #flyout>
    <WuiMenuFlyoutItem text="Send" />
    <WuiMenuFlyoutItem text="Reply" />
    <WuiMenuFlyoutItem text="Reply All" />
  </template>
</WuiDropDownButton>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="DropDownButton">
    <template #demo>
      <div class="ddb-sections">
        <!-- 示例 1:官方示例复刻(简单 + 图标两例,对照 DropDownButtonSimple.txt / DropDownButtonIcon.txt) -->
        <section class="ddb-section">
          <h4 class="docs-subtitle">{{ sectionOfficialTitle }}</h4>
          <div class="ddb-row">
            <WuiDropDownButton content="Email">
              <template #flyout>
                <WuiMenuFlyoutItem text="Send" @click="onEmailAction('Send')" />
                <WuiMenuFlyoutItem text="Reply" @click="onEmailAction('Reply')" />
                <WuiMenuFlyoutItem text="Reply All" @click="onEmailAction('Reply All')" />
              </template>
            </WuiDropDownButton>

            <!-- 图标版:按钮内容为 FontIcon(默认 slot),菜单项带图标列(对照官方 DropDownButtonIcon) -->
            <WuiDropDownButton>
              <template #default>
                <WuiFontIcon glyph="&#xE715;" :font-size="16" />
              </template>
              <template #flyout>
                <WuiMenuFlyoutItem text="Send" @click="onEmailAction('Send')">
                  <template #icon><WuiFontIcon glyph="&#xE725;" :font-size="16" /></template>
                </WuiMenuFlyoutItem>
                <WuiMenuFlyoutItem text="Reply" @click="onEmailAction('Reply')">
                  <template #icon><WuiFontIcon glyph="&#xE8CA;" :font-size="16" /></template>
                </WuiMenuFlyoutItem>
                <WuiMenuFlyoutItem text="Reply All" @click="onEmailAction('Reply All')">
                  <template #icon><WuiFontIcon glyph="&#xE8C2;" :font-size="16" /></template>
                </WuiMenuFlyoutItem>
                <WuiMenuFlyoutSeparator />
                <WuiMenuFlyoutSubItem text="Send to">
                  <WuiMenuFlyoutItem text="Bluetooth" @click="onEmailAction('Send to Bluetooth')" />
                </WuiMenuFlyoutSubItem>
              </template>
            </WuiDropDownButton>

            <p class="ddb-hint">{{ labelLastAction }}:{{ emailAction }}</p>
          </div>
        </section>

        <!-- 示例 2:内嵌任意内容 flyout(非菜单内容,焦点在字段间移动不关闭) -->
        <section class="ddb-section">
          <h4 class="docs-subtitle">{{ sectionContentTitle }}</h4>
          <div class="ddb-row">
            <WuiDropDownButton content="反馈" @opened="onFeedbackOpen">
              <template #flyout>
                <div class="ddb-form">
                  <p class="ddb-flyout-text">{{ labelFeedbackHint }}</p>
                  <WuiTextBox v-model:text="feedbackText" placeholder-text="你的反馈" />
                  <WuiButton content="发送" @click="onSendFeedback" />
                  <p v-if="feedbackSent" class="ddb-hint">{{ labelFeedbackSent }}</p>
                </div>
              </template>
            </WuiDropDownButton>
            <p class="ddb-hint">任意内容:层为 dialog 语义(FlyoutPresenter 皮肤),Tab 在字段间移动,焦点移出层外或 Esc 关闭。</p>
          </div>
        </section>

        <!-- 示例 3:placement 演示(参数面板实时调节 + isOpen 编程开关 + disabled) -->
        <section class="ddb-section">
          <h4 class="docs-subtitle">{{ sectionPlacementTitle }}</h4>
          <div class="ddb-row">
            <WuiDropDownButton
              content="Placement 演示"
              :placement="placementValue"
              :disabled="isDisabled"
              v-model:is-open="demoIsOpen"
              @opening="logEvent('opening')"
              @opened="logEvent('opened')"
              @closing="logEvent('closing')"
              @closed="logEvent('closed')"
            >
              <template #flyout>
                <WuiMenuFlyoutItem text="Item One" />
                <WuiMenuFlyoutItem text="Item Two" />
                <WuiMenuFlyoutItem text="Item Three" />
              </template>
            </WuiDropDownButton>
            <p class="ddb-hint">{{ labelOpenState }}:{{ demoIsOpen ? 'true' : 'false' }} · Placement:{{ placementValue }}</p>
          </div>

          <!-- 事件日志 -->
          <div class="ddb-event-log">
            <h4 class="docs-subtitle">{{ eventLogTitle }}</h4>
            <p v-for="(line, index) in eventLog" :key="`${line}-${index}`" class="ddb-log-line">{{ line }}</p>
            <p v-if="eventLog.length === 0" class="ddb-hint">{{ noEventsHint }}</p>
          </div>
        </section>

        <!-- 键盘操作说明 -->
        <section class="ddb-section">
          <h4 class="docs-subtitle">{{ sectionKeyboardTitle }}</h4>
          <table class="ddb-keyboard-table">
            <thead>
              <tr>
                <th v-for="header in keyboardHeaders" :key="header">{{ header }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in keyboardRows" :key="index">
                <td v-for="(cell, cellIndex) in row" :key="cellIndex">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Placement(示例 3)" type="select" v-model="demoPlacement" :options="placementOptions" />
        <DemoOptionRow label="isOpen(示例 3 编程开关)" type="toggle" v-model="demoIsOpenOption" />
        <DemoOptionRow label="Disabled(示例 3)" type="toggle" v-model="demoDisabled" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsKeyboardTitle }}</h4>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.ddb-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ddb-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ddb-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.ddb-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 任意内容 flyout 的表单排版(层皮肤由控件提供,这里只排内容) */
.ddb-form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 240px;
}

.ddb-flyout-text {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-default-text-foreground-theme);
}

.ddb-event-log {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.ddb-log-line {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 键盘交互说明表(复用文档表观感,数据为静态数组故本地渲染) */
.ddb-keyboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-default-text-foreground-theme);
}

.ddb-keyboard-table th,
.ddb-keyboard-table td {
  padding: 6px 12px;
  text-align: left;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.ddb-keyboard-table th {
  background: var(--wui-system-control-background-chrome-medium-low);
}

.docs-subtitle {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
