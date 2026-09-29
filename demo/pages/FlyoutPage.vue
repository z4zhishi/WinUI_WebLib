<script setup lang="ts">
// FlyoutPage.vue —— Flyout 控件示例页(对应官方 WinUI Gallery Samples/Flyout/)。
// 结构照抄 HomePage.vue 母版:DemoPage(标题+描述)→ 交互演示(多个不同配置的
// Flyout)→ DemoOptions(下拉 / 开关实时改参)→ DemoDocsTable + DemoCode。
// 示例对照官方 FlyoutPage.xaml:附加到按钮的 Empty cart 确认浮出(确认后 Hide());
// 另按任务要求补 placement 全档、light dismiss 开关对比、showAt 程序化挂载与富内容表单。
// 文案暂用中文双语文案常量(全站六语言在阶段 8 统一)。
import { computed, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiFlyout from '@/components/Flyout.vue'
import WuiTextBox from '@/components/TextBox.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 Flyout 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'Flyout(浮出控件)', en: 'Flyout' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'Flyout 显示轻量的 UI,可以是信息展示,也可以要求用户交互。与对话框不同,Flyout 可以通过点击或点击外部区域进行 light dismiss。用它收集用户输入、显示某一项的更多细节,或要求用户确认操作。',
  en: 'A Flyout displays lightweight UI that is either information, or requires user interaction. Unlike a dialog, a Flyout can be light dismissed by clicking or tapping off of it.',
}
const SECTION_ATTACH_TITLE: BilingualText = { zh: '附加到按钮的 Flyout(对照官方 Empty cart 示例)', en: 'Flyout attached to a button' }
const SECTION_PLACEMENT_TITLE: BilingualText = { zh: 'Placement 全档演示(参数面板实时调节)', en: 'Placement modes' }
const SECTION_LIGHTDISMISS_TITLE: BilingualText = { zh: 'Light dismiss 开关对比', en: 'Light dismiss on vs off' }
const SECTION_SHOWAT_TITLE: BilingualText = { zh: 'showAt 程序化挂载(无 #target 宿主)', en: 'Programmatic showAt' }
const SECTION_FORM_TITLE: BilingualText = { zh: '富内容表单 Flyout', en: 'Rich-content form flyout' }
const EVENT_LOG_TITLE: BilingualText = { zh: '事件日志(open / close)', en: 'Event log (open / close)' }
const NO_EVENTS_HINT: BilingualText = { zh: '尚无事件,试试打开上面任意 Flyout', en: 'No events yet' }
const CART_CLEARED_HINT: BilingualText = { zh: '购物车已清空', en: 'Cart emptied' }
const FEEDBACK_SENT_HINT: BilingualText = { zh: '反馈已提交,感谢!', en: 'Feedback sent. Thank you!' }
const PROPS_TABLE_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const EVENTS_TABLE_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const METHODS_TABLE_TITLE: BilingualText = { zh: '方法(expose)', en: 'Methods (expose)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionAttachTitle = useBilingual(i18n, SECTION_ATTACH_TITLE)
const sectionPlacementTitle = useBilingual(i18n, SECTION_PLACEMENT_TITLE)
const sectionLightDismissTitle = useBilingual(i18n, SECTION_LIGHTDISMISS_TITLE)
const sectionShowAtTitle = useBilingual(i18n, SECTION_SHOWAT_TITLE)
const sectionFormTitle = useBilingual(i18n, SECTION_FORM_TITLE)
const eventLogTitle = useBilingual(i18n, EVENT_LOG_TITLE)
const noEventsHint = useBilingual(i18n, NO_EVENTS_HINT)
const cartClearedHint = useBilingual(i18n, CART_CLEARED_HINT)
const feedbackSentHint = useBilingual(i18n, FEEDBACK_SENT_HINT)
const propsTableTitle = useBilingual(i18n, PROPS_TABLE_TITLE)
const eventsTableTitle = useBilingual(i18n, EVENTS_TABLE_TITLE)
const methodsTableTitle = useBilingual(i18n, METHODS_TABLE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例 1:附加到按钮(官方 Empty cart:确认按钮 Click → f.Hide())——
const cartFlyout = ref<ComponentPublicInstance & { showAt: (target?: Element) => void; hide: () => void } | null>(null)
const cartEmptied = ref(false)

function onCartFlyoutOpen(): void {
  cartEmptied.value = false
  logEvent('open', 'EmptyCart')
}

function onConfirmEmptyCart(): void {
  cartEmptied.value = true
  cartFlyout.value?.hide() // 对照官方 DeleteConfirmation_Click → f.Hide()
}

// —— 示例 2:Placement 全档(选项面板驱动)——
type PlacementChoice = 'Auto' | 'Top' | 'Bottom' | 'Left' | 'Right' | 'Full'

const PLACEMENT_CHOICES: { label: string; value: PlacementChoice }[] = [
  { label: 'Auto(默认,自适应)', value: 'Auto' },
  { label: 'Top', value: 'Top' },
  { label: 'Bottom', value: 'Bottom' },
  { label: 'Left', value: 'Left' },
  { label: 'Right', value: 'Right' },
  { label: 'Full(铺满窗口)', value: 'Full' },
]

const placement = ref<string | number | boolean>('Auto')
const placementLightDismiss = ref<string | number | boolean>(true)
const placementOverlay = ref<string | number | boolean>(false)

// DemoOptionRow 的 v-model 契约是 string | number | boolean 联合类型,回读时收窄
const placementValue = computed<PlacementChoice>(() => {
  const value = placement.value
  return typeof value === 'string' && PLACEMENT_CHOICES.some((choice) => choice.value === value)
    ? (value as PlacementChoice)
    : 'Auto'
})

const overlayMode = computed<'On' | 'Off'>(() => (placementOverlay.value === true ? 'On' : 'Off'))

// —— 示例 3:light dismiss 开关对比(右侧实例经 v-model:is-open 编程驱动)——
const programmaticOpen = ref<string | number | boolean>(false)

const noDismissOpen = computed<boolean>({
  get: () => programmaticOpen.value === true,
  set: (value) => {
    programmaticOpen.value = value
  },
})

// —— 示例 4:showAt 程序化挂载(无 #target,纯 ref + showAt(element))——
const showAtFlyout = ref<ComponentPublicInstance & { showAt: (target?: Element) => void; hide: () => void } | null>(null)
const showAtAnchor = ref<HTMLElement | null>(null)

function onShowAtClick(): void {
  showAtFlyout.value?.showAt(showAtAnchor.value ?? undefined)
}

// —— 示例 5:富内容表单 flyout ——
const formFlyout = ref<ComponentPublicInstance & { showAt: (target?: Element) => void; hide: () => void } | null>(null)
const feedbackName = ref('')
const feedbackEmail = ref('')
const feedbackSent = ref(false)

function onFormFlyoutOpen(): void {
  feedbackSent.value = false
  logEvent('open', 'Form')
}

function onFeedbackSubmit(): void {
  feedbackSent.value = true
  formFlyout.value?.hide()
}

// —— 事件日志(open / close,近 6 条)——
const eventLog = ref<string[]>([])

function logEvent(name: 'open' | 'close', source: string): void {
  const stamp = new Date().toLocaleTimeString()
  eventLog.value = [`${stamp}  ${source} → ${name}`, ...eventLog.value].slice(0, 6)
}

function logPlacementOpen(): void {
  logEvent('open', `Placement(${placementValue.value})`)
}

function logLightDismissOpen(): void {
  logEvent('open', 'LightDismiss')
}

function logShowAtOpen(): void {
  logEvent('open', 'showAt')
}

function logCartClose(): void {
  logEvent('close', 'EmptyCart')
}

function logPlacementClose(): void {
  logEvent('close', 'Placement')
}

function logLightDismissClose(): void {
  logEvent('close', 'LightDismiss')
}

function logShowAtClose(): void {
  logEvent('close', 'showAt')
}

function logFormClose(): void {
  logEvent('close', 'Form')
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Placement', "'Auto' | 'Top' | 'Bottom' | 'Left' | 'Right' | 'Full'", "'Auto'", "放置位(WinUI FlyoutBasePlacementMode 全枚举);Auto 为系统自适应(Web:底侧首选 + 空间不足自动翻转),Full 铺满整个窗口"],
  ['LightDismiss', 'boolean', 'true', 'light dismiss:外部按下 / Escape / 锚滚动 / 焦点移出时自动关闭(与 FlyoutBase 语义一致)'],
  ['LightDismissOverlayMode', "'Auto' | 'On' | 'Off'", "'Auto'", '打开期间的半透明遮罩(WinUI 同名属性);Auto 在桌面 Web 视同 Off,需要遮罩时显式 On'],
  ['Offset', 'number', '4', '层与锚的主轴间距(px);WinUI 由平台定位决定,Web 侧显式取值'],
  ['PresenterClass', 'string', "''", '附加到 FlyoutPresenter 容器(层根)的 class,对应 WinUI FlyoutPresenterStyle 的 Web 等价之一'],
  ['PresenterStyle', 'string', "''", '附加到 FlyoutPresenter 容器的内联样式(CSS 文本)'],
  ['IsOpen (v-model)', 'boolean', 'false', '打开状态,v-model:is-open 双向绑定(WinUI FlyoutBase.IsOpen 为只读,Web 开放写入)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['open', '—', '层挂载并完成定位后触发(WinUI Opened 的近似,不等入场动画结束)'],
  ['close', '—', '开始关闭时触发(light dismiss / 再点宿主 / isOpen 置 false);层随后播放淡出动画并卸载'],
  ['update:isOpen', '(value: boolean)', 'v-model:is-open 双向绑定更新'],
]

const methodHeaders = ['方法', '签名', '说明']
const methodRows: (string | number)[][] = [
  ['showAt', '(target?: Element) => void', '在指定元素处打开并切换锚(持续生效到下次调用);缺省参数按当前锚打开(WinUI ShowAt)'],
  ['hide', '() => void', '关闭 Flyout(WinUI Hide)'],
]

const usageCode = computed(
  () => `<WuiFlyout :placement="'Bottom'" @open="onOpen" @close="onClose">
  <template #target>
    <WuiButton Content="Empty cart" />
  </template>
  所有商品都将被移除,是否继续?
  <WuiButton Content="Yes, empty my cart" @click="flyout.hide()" />
</WuiFlyout>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="flyout-sections">
        <!-- 示例 1:附加到按钮(对照官方 Empty cart) -->
        <section class="flyout-section">
          <h4 class="docs-subtitle">{{ sectionAttachTitle }}</h4>
          <div class="flyout-row">
            <WuiFlyout
              ref="cartFlyout"
              @open="onCartFlyoutOpen"
              @close="logCartClose"
            >
              <template #target>
                <WuiButton content="Empty cart(清空购物车)" />
              </template>
              <p class="flyout-text">将移除所有商品。是否继续?</p>
              <WuiButton content="是,清空购物车" @click="onConfirmEmptyCart" />
            </WuiFlyout>
            <p v-if="cartEmptied" class="click-hint">{{ cartClearedHint }}</p>
          </div>
        </section>

        <!-- 示例 2:Placement 全档(选项面板驱动) -->
        <section class="flyout-section">
          <h4 class="docs-subtitle">{{ sectionPlacementTitle }}</h4>
          <div class="flyout-row">
            <WuiFlyout
              :placement="placementValue"
              :light-dismiss="placementLightDismiss === true"
              :light-dismiss-overlay-mode="overlayMode"
              @open="logPlacementOpen"
              @close="logPlacementClose"
            >
              <template #target>
                <WuiButton content="在不同方向打开 Placement Flyout" />
              </template>
              <p class="flyout-text">当前 Placement:{{ placementValue }}</p>
            </WuiFlyout>
          </div>
        </section>

        <!-- 示例 3:light dismiss 开关对比 -->
        <section class="flyout-section">
          <h4 class="docs-subtitle">{{ sectionLightDismissTitle }}</h4>
          <div class="flyout-row">
            <WuiFlyout :light-dismiss="true" @open="logLightDismissOpen" @close="logLightDismissClose">
              <template #target>
                <WuiButton content="lightDismiss = true" />
              </template>
              <p class="flyout-text">
                点击外部、按 Escape、滚动页面或焦点移出都会关闭(与 WinUI FlyoutBase 语义一致)。
              </p>
            </WuiFlyout>

            <WuiFlyout v-model:is-open="noDismissOpen" :light-dismiss="false">
              <template #target>
                <WuiButton content="lightDismiss = false" />
              </template>
              <p class="flyout-text">
                只能点击宿主按钮(toggle)或通过 isOpen 编程关闭;当前 isOpen:{{ noDismissOpen ? 'true' : 'false' }}。
              </p>
              <WuiButton content="编程关闭" @click="noDismissOpen = false" />
            </WuiFlyout>
          </div>
        </section>

        <!-- 示例 4:showAt 程序化挂载 -->
        <section class="flyout-section">
          <h4 class="docs-subtitle">{{ sectionShowAtTitle }}</h4>
          <div class="flyout-row">
            <button ref="showAtAnchor" type="button" class="demo-native-button">ShowAt 锚点(原生元素)</button>
            <WuiButton content="showAt(锚点) 打开" @click="onShowAtClick" />
            <WuiFlyout ref="showAtFlyout" @open="logShowAtOpen" @close="logShowAtClose">
              <p class="flyout-text">
                经 showAt(anchorElement) 打开:无 #target 声明式宿主,锚切换到指定元素(WinUI ShowAt 语义)。
              </p>
            </WuiFlyout>
          </div>
        </section>

        <!-- 示例 5:富内容表单 flyout -->
        <section class="flyout-section">
          <h4 class="docs-subtitle">{{ sectionFormTitle }}</h4>
          <div class="flyout-row">
            <WuiFlyout ref="formFlyout" @open="onFormFlyoutOpen" @close="logFormClose">
              <template #target>
                <WuiButton content="提交反馈" />
              </template>
              <div class="flyout-form">
                <p class="flyout-text">告诉我们你的想法:</p>
                <WuiTextBox v-model:text="feedbackName" header="姓名" placeholder-text="你的名字" />
                <WuiTextBox v-model:text="feedbackEmail" header="邮箱" placeholder-text="name@example.com" />
                <WuiButton content="发送" @click="onFeedbackSubmit" />
              </div>
            </WuiFlyout>
            <p v-if="feedbackSent" class="click-hint">{{ feedbackSentHint }}</p>
          </div>
        </section>

        <!-- 事件日志 -->
        <section class="flyout-section">
          <h4 class="docs-subtitle">{{ eventLogTitle }}</h4>
          <div class="event-log">
            <p v-for="(line, index) in eventLog" :key="`${line}-${index}`" class="log-line">{{ line }}</p>
            <p v-if="eventLog.length === 0" class="click-hint">{{ noEventsHint }}</p>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Placement(示例 2)" type="select" v-model="placement" :options="PLACEMENT_CHOICES" />
        <DemoOptionRow label="LightDismiss(示例 2)" type="toggle" v-model="placementLightDismiss" />
        <DemoOptionRow label="LightDismissOverlayMode = On(示例 2)" type="toggle" v-model="placementOverlay" />
        <DemoOptionRow label="isOpen(示例 3B 编程开关)" type="toggle" v-model="programmaticOpen" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ propsTableTitle }}</h4>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h4 class="docs-subtitle">{{ eventsTableTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ methodsTableTitle }}</h4>
      <DemoDocsTable :headers="methodHeaders" :rows="methodRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.flyout-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.flyout-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flyout-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

/* 浮出层内文:与 WinUI 内容排版一致的小号正文 */
.flyout-text {
  margin: 0 0 12px;
  max-width: 320px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-default-text-foreground-theme);
}

/* 富内容表单:纵向排布 + token 间距 */
.flyout-form {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  width: 240px;
}

.click-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* showAt 演示用原生锚元素(任意元素均可作锚,WinUI ShowAt(FrameworkElement)) */
.demo-native-button {
  padding: 5px 12px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.demo-native-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.demo-native-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.event-log {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 32px;
  padding: 8px 12px;
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.log-line {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
