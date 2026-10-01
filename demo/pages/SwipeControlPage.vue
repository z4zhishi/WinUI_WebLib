<script setup lang="ts">
// SwipeControl 示例页:对照官方 WinUI Gallery SwipeControlPage 五例精选三组:
// 演示一 = 邮件列表式(两侧 Execute:右滑标已读 / 左滑删除,过阈值松手即触发并回弹,
//          对照官方 Example3 的 ListView 场景);
// 演示二 = Reveal 揭示点选(左 Accept/Flag 揭示后点击切换状态并更新内容文案,
//          右 Archive Execute,对照官方 Example1/Example2);
// 演示三 = 参数面板(官方 Example3 配色:全部回复/打开 Reveal + 删除 Execute,
//          模式/高度/禁用实时可调,事件回显)。
// 结构照抄已通过 QA 的 RatingControlPage 母版。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiSwipeControl from '@/components/SwipeControl.vue'
import type { SwipeControlInvokedEventArgs } from '@/components/SwipeControl.vue'
import WuiSwipeItem from '@/components/SwipeItem.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'SwipeControl(轻扫控件)', en: 'SwipeControl' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '触摸手势容器:在内容上横向轻扫,揭示其下的操作块。Reveal 模式揭示后点选;Execute 模式拖过阈值(100px)松手立即触发并回弹。示例覆盖邮件列表左滑删除/右滑标已读、揭示点选与参数实时调节。',
  en: 'A touch-gesture container: swipe horizontally over content to reveal action blocks underneath. Reveal mode stays open for tapping; Execute mode fires once the drag passes the 100px threshold on release. Demos cover a mail list (swipe to delete / mark read), reveal-and-tap, and live parameter tuning.',
}
const GROUP_MAIL: BilingualText = { zh: '邮件列表(两侧 Execute:右滑标已读 / 左滑删除)', en: 'Mail list (both Execute: right-swipe mark read / left-swipe delete)' }
const GROUP_REVEAL: BilingualText = { zh: 'Reveal 揭示点选(对照官方 Example1/2)', en: 'Reveal and tap (per official examples 1/2)' }
const GROUP_OPTIONS: BilingualText = { zh: '参数面板(官方 Example3 配色,数组式配置)', en: 'Options (official example 3 colors, array config)' }
const GROUP_GESTURE: BilingualText = { zh: '手势与关闭路径', en: 'Gestures & dismissal' }
const LABEL_RESET: BilingualText = { zh: '恢复邮件列表', en: 'Restore mail list' }
const LABEL_EVENT: BilingualText = { zh: '最近一次 invoked', en: 'Last invoked' }
const LABEL_NO_EVENT: BilingualText = { zh: '尚未触发', en: 'Not fired yet' }
const MARK_READ_TOAST: BilingualText = { zh: '已切换已读状态:', en: 'Toggled read state:' }
const DELETED_TOAST: BilingualText = { zh: '已删除:', en: 'Deleted:' }
const HINT_MAIL: BilingualText = {
  zh: '拖拽过阈值(100px)松手即触发;Execute 项未设背景时以 accent 呈现 pre/post 阈值两档配色。',
  en: 'Release past the 100px threshold to invoke; Execute items without a custom background switch between pre/post threshold accent colors.',
}
const UNREAD_LABEL: BilingualText = { zh: '未读', en: 'unread' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性(SwipeControl)', en: 'Properties (SwipeControl)' }
const DOCS_ITEM_PROPS_TITLE: BilingualText = { zh: '属性(SwipeItem)', en: 'Properties (SwipeItem)' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件与方法', en: 'Events & methods' }
const DOCS_GESTURE_TITLE: BilingualText = { zh: '手势与键盘', en: 'Gestures & keyboard' }
const DOCS_GESTURE_HEADERS: BilingualText = { zh: '手势 / 输入', en: 'Gesture / input' }
const DOCS_GESTURE_BEHAVIOR: BilingualText = { zh: '行为', en: 'Behavior' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupMail = useBilingual(i18n, GROUP_MAIL)
const groupReveal = useBilingual(i18n, GROUP_REVEAL)
const groupOptions = useBilingual(i18n, GROUP_OPTIONS)
const groupGesture = useBilingual(i18n, GROUP_GESTURE)
const labelReset = useBilingual(i18n, LABEL_RESET)
const labelEvent = useBilingual(i18n, LABEL_EVENT)
const labelNoEvent = useBilingual(i18n, LABEL_NO_EVENT)
const markReadToast = useBilingual(i18n, MARK_READ_TOAST)
const deletedToast = useBilingual(i18n, DELETED_TOAST)
const hintMail = useBilingual(i18n, HINT_MAIL)
const unreadLabel = useBilingual(i18n, UNREAD_LABEL)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsItemPropsTitle = useBilingual(i18n, DOCS_ITEM_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsGestureTitle = useBilingual(i18n, DOCS_GESTURE_TITLE)
const gestureHeader = useBilingual(i18n, DOCS_GESTURE_HEADERS)
const gestureBehavior = useBilingual(i18n, DOCS_GESTURE_BEHAVIOR)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 手势说明文案(随语言) ——
const isZh = computed(() => i18n.locale.value.startsWith('zh'))
const gestureRows = computed<(string | number)[][]>(() =>
  isZh.value
    ? [
        ['横向拖拽(触摸 / 鼠标)', '内容 1:1 跟手平移,揭示活动侧操作块;反方向拖动收回'],
        ['Execute 模式松手', '拖过 min(揭示尺寸, 100px) 阈值松手 → 触发首个项;未过阈值 → 回弹关闭'],
        ['Reveal 模式松手', '过阈值松手 → 停在完全打开;点击揭示项触发;再拖回 / 点内容 / 点外部 / 外部键盘输入 → 关闭'],
        ['BehaviorOnInvoked', 'Auto / Close → 触发后关闭;RemainOpen → 保持打开(Execute RemainOpen 打开后锁定,不再接受拖拽)'],
        ['键盘', '揭示项为原生 button(Tab 可达,Enter/Space 触发);焦点不在控件内时的键盘输入会关闭已打开的层'],
      ]
    : [
        ['Horizontal drag (touch / mouse)', 'Content pans 1:1 with the pointer, revealing the active side; drag back to retract'],
        ['Execute release', 'Release past min(reveal size, 100px) → first item invoked; otherwise spring back closed'],
        ['Reveal release', 'Release past threshold → stays fully open; tap a revealed item to invoke; drag back / tap content / tap outside / external key press → close'],
        ['BehaviorOnInvoked', 'Auto / Close → close after invoked; RemainOpen → stays open (Execute RemainOpen locks the open layer against further drags)'],
        ['Keyboard', 'Revealed items are native buttons (Tab reachable, Enter/Space invokes); key presses outside the control close an open layer'],
      ],
)

// —— 参数面板(DemoOptionRow 的 v-model 契约:联合类型,见 demo/components/README.md)——
const demoLeftMode = ref<string | number | boolean>('Reveal')
const demoRightMode = ref<string | number | boolean>('Execute')
const demoDisabled = ref<string | number | boolean>(false)
const demoHeight = ref<string | number | boolean>(68)

const leftModeValue = computed(() => (demoLeftMode.value === 'Execute' ? 'Execute' : 'Reveal'))
const rightModeValue = computed(() => (demoRightMode.value === 'Execute' ? 'Execute' : 'Reveal'))
const disabledValue = computed(() => demoDisabled.value === true)
const heightValue = computed(() => {
  const parsed = Number(demoHeight.value)
  return Number.isFinite(parsed) ? Math.min(120, Math.max(40, parsed)) : 68
})

const MODE_CHOICES = [
  { label: 'Reveal(揭示点选)', value: 'Reveal' },
  { label: 'Execute(过阈值触发)', value: 'Execute' },
]

// —— 演示一:邮件列表(数组式配置,两侧 Execute)——
interface MailRow {
  id: number
  sender: string
  subject: string
  unread: boolean
}

const initialMails = (): MailRow[] => [
  { id: 1, sender: 'Aria Chen', subject: '周会纪要与行动项', unread: true },
  { id: 2, sender: 'Design Team', subject: 'SwipeControl 视觉稿 v3', unread: true },
  { id: 3, sender: 'Build System', subject: '[CI] main 构建通过', unread: false },
  { id: 4, sender: 'Ling Xu', subject: 'Re: 旅行计划', unread: true },
]
const mails = ref<MailRow[]>(initialMails())
const mailToast = ref('')

// 图标:Read U+E8C3(标记已读)/ Delete U+E74D;两侧 Execute → 过阈值松手即触发
const markReadItems = [{ text: '标为已读', icon: '\uE8C3' }]
const deleteItems = [{ text: '删除', icon: '\uE74D' }]

function onMarkRead(mail: MailRow): void {
  mail.unread = !mail.unread
  mailToast.value = `${markReadToast.value} ${mail.sender}`
}

function onDeleteMail(mail: MailRow): void {
  mails.value = mails.value.filter((m) => m.id !== mail.id)
  mailToast.value = `${deletedToast.value} ${mail.sender}`
}

function resetMails(): void {
  mails.value = initialMails()
  mailToast.value = ''
}

// —— 演示二:Reveal 揭示点选(slot 式配置,对照官方 Accept/Flag/Archive)——
const accepted = ref(false)
const flagged = ref(false)
const archived = ref(false)

const acceptText = computed(() => (accepted.value ? '取消接受' : '接受'))
const acceptIcon = computed(() => (accepted.value ? '\uE711' : '\uE8FB'))
const flagText = computed(() => (flagged.value ? '取消标记' : '标记'))
const flagIcon = computed(() => (flagged.value ? '\uEB4B' : '\uE129'))

const revealText = computed(() => {
  if (isZh.value) {
    if (accepted.value && flagged.value) return '向右轻扫 - 已接受并标记'
    if (accepted.value) return '向右轻扫 - 已接受'
    if (flagged.value) return '向右轻扫 - 已标记'
    return '向右轻扫'
  }
  if (accepted.value && flagged.value) return 'Swipe Right - Accepted & Flagged'
  if (accepted.value) return 'Swipe Right - Accepted'
  if (flagged.value) return 'Swipe Right - Flagged'
  return 'Swipe Right'
})
const archiveText = computed(() =>
  isZh.value ? (archived.value ? '已归档 - 向左轻扫' : '向左轻扫') : archived.value ? 'Archived - Swipe Left' : 'Swipe Left',
)

function onAcceptInvoked(): void {
  accepted.value = !accepted.value
}
function onFlagInvoked(): void {
  flagged.value = !flagged.value
}
function onArchiveInvoked(): void {
  archived.value = !archived.value
}

// —— 演示三:参数面板(数组式,官方 Example3 配色:#3e6fa7 / #ff9501 / accent)——
const demo3LeftItems = [
  { text: '全部回复', icon: '\uE8C2', background: '#3e6fa7', foreground: '#ffffff' },
  { text: '打开', icon: '\uE8C3', background: '#ff9501', foreground: '#ffffff' },
]
const demo3RightItems = [
  {
    text: '删除',
    icon: '\uE74D',
    background: 'var(--wui-system-control-background-accent)',
    foreground: 'var(--wui-system-control-foreground-chrome-white)',
  },
]
const demo3Event = ref('')
const demo3EventText = computed(() => demo3Event.value || labelNoEvent.value)

function onDemo3Invoked(event: SwipeControlInvokedEventArgs): void {
  const sideText = event.side === 'left' ? 'left' : 'right'
  demo3Event.value = `side=${sideText} index=${event.index} item="${event.item.text}"`
}

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['leftItems', 'SwipeItemOptions[]', '[]', '左侧项组(WinUI LeftItems):向右拖揭示;数组式配置,与 #left slot 二选一'],
  ['rightItems', 'SwipeItemOptions[]', '[]', '右侧项组(WinUI RightItems):向左拖揭示;与 #right slot 二选一'],
  ['leftMode', "'Reveal' | 'Execute'", "'Reveal'", '左侧组模式(WinUI SwipeItems.Mode)'],
  ['rightMode', "'Reveal' | 'Execute'", "'Reveal'", '右侧组模式'],
  ['disabled', 'boolean', 'false', '禁用:不可拖拽揭示;已打开时立即关闭'],
]
const itemPropsRows: (string | number)[][] = [
  ['text', 'string', "''", '项文本(WinUI Text),显示在图标下方'],
  ['icon', 'string', "''", '图标字形字符(对应 FontIconSource.Glyph,如 "\\uE74D")'],
  ['background', 'string', "''", '背景色块颜色;Execute 模式未设置时按阈值切换 pre/post accent 配色'],
  ['foreground', 'string', "''", '前景色(图标与文本)'],
  ['behaviorOnInvoked', "'Auto' | 'Close' | 'RemainOpen'", "'Auto'", '触发后行为:Auto/Close 关闭,RemainOpen 保持打开'],
  ['disabled', 'boolean', 'false', '禁用本项'],
]
const eventHeaders = ['事件 / 方法', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['SwipeItem · invoked', '(e: { swipeControl })', '项被调用:Execute 过阈值松手,或点击已揭示的 Reveal 项'],
  ['SwipeControl · invoked', '(e: { item, side, index, swipeControl })', '同上的控件级 relay(Web 侧追加,数组式用法统一入口)'],
  ['close()', '—', '控件方法(defineExpose):程序化关闭揭示层(WinUI SwipeControl.Close)'],
]

const usageCode = computed(
  () => `<script setup lang="ts">
import { ref } from 'vue'
import SwipeControl from '@/components/SwipeControl.vue'
import SwipeItem from '@/components/SwipeItem.vue'

const mails = ref([{ id: 1, title: '邮件 1' }, { id: 2, title: '邮件 2' }])
${'</'}script>

<template>
  <!-- 数组式:两侧 Execute,过阈值松手触发 -->
  <SwipeControl
    v-for="mail in mails"
    :key="mail.id"
    :left-items="[{ text: '标为已读', icon: '\\uE8C3' }]"
    :right-items="[{ text: '删除', icon: '\\uE74D', background: 'var(--wui-system-control-background-accent)' }]"
    left-mode="Execute"
    right-mode="Execute"
    @invoked="e => console.log(e.item.text, e.side)"
  >
    {{ mail.title }}
  </SwipeControl>

  <!-- slot 式:Reveal 揭示后点选,项可监听各自 invoked -->
  <SwipeControl :left-mode="'Reveal'">
    <template #left>
      <SwipeItem text="接受" icon="\uE8FB" @invoked="onAccept" />
      <SwipeItem text="标记" icon="\uE129" @invoked="onFlag" />
    </template>
    内容
  </SwipeControl>
</template>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="SwipeControl">
    <template #demo>
      <div class="swipe-stage">
        <!-- 演示一:邮件列表(两侧 Execute) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupMail }}</h3>
          <div class="mail-list">
            <WuiSwipeControl
              v-for="mail in mails"
              :key="mail.id"
              class="mail-row"
              :left-items="markReadItems"
              :right-items="deleteItems"
              left-mode="Execute"
              right-mode="Execute"
              :aria-label="`${mail.sender},${mail.unread ? unreadLabel : ''}`"
              @invoked="
                (e) => (e.side === 'left' ? onMarkRead(mail) : onDeleteMail(mail))
              "
            >
              <div class="mail-content">
                <span class="mail-dot" :class="{ 'mail-dot--unread': mail.unread }" aria-hidden="true"></span>
                <div class="mail-text">
                  <span class="mail-sender" :class="{ 'mail-sender--unread': mail.unread }">{{ mail.sender }}</span>
                  <span class="mail-subject">{{ mail.subject }}</span>
                </div>
              </div>
            </WuiSwipeControl>
          </div>
          <p class="demo-output">
            {{ hintMail }}
            <template v-if="mailToast">
              <span class="demo-event">{{ mailToast }}</span>
            </template>
          </p>
          <WuiButton class="demo-button" @click="resetMails">{{ labelReset }}</WuiButton>
        </section>

        <!-- 演示二:Reveal 揭示点选(slot 式) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupReveal }}</h3>
          <WuiSwipeControl class="demo-row" left-mode="Reveal" right-mode="Execute">
            <template #left>
              <WuiSwipeItem :text="acceptText" :icon="acceptIcon" @invoked="onAcceptInvoked" />
              <WuiSwipeItem :text="flagText" :icon="flagIcon" @invoked="onFlagInvoked" />
            </template>
            <template #right>
              <WuiSwipeItem text="归档" icon="&#xE7B8;" @invoked="onArchiveInvoked" />
            </template>
            <div class="row-content">{{ revealText }}</div>
          </WuiSwipeControl>
          <p class="demo-output">{{ archiveText }}</p>
        </section>

        <!-- 演示三:参数面板(数组式,模式/高度/禁用可调) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupOptions }}</h3>
          <WuiSwipeControl
            class="demo-row"
            :left-items="demo3LeftItems"
            :right-items="demo3RightItems"
            :left-mode="leftModeValue"
            :right-mode="rightModeValue"
            :disabled="disabledValue"
            :style="{ height: `${heightValue}px` }"
            @invoked="onDemo3Invoked"
          >
            <div class="row-content">LeftItems × 2(Reveal)/ RightItems × 1(Execute)</div>
          </WuiSwipeControl>
          <p class="demo-output">
            {{ labelEvent }}: <span class="demo-event">{{ demo3EventText }}</span>
          </p>
        </section>

        <!-- 手势与关闭路径说明 -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupGesture }}</h3>
          <ul class="gesture-list">
            <li v-for="(row, i) in gestureRows" :key="i">
              <strong>{{ row[0] }}</strong>:{{ row[1] }}
            </li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="LeftMode(左侧组)" type="select" v-model="demoLeftMode" :options="MODE_CHOICES" />
        <DemoOptionRow label="RightMode(右侧组)" type="select" v-model="demoRightMode" :options="MODE_CHOICES" />
        <DemoOptionRow label="Height(演示三)" type="slider" v-model="demoHeight" :min="40" :max="120" :step="4" />
        <DemoOptionRow label="Disabled(演示三)" type="toggle" v-model="demoDisabled" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h3 class="docs-subtitle">{{ docsItemPropsTitle }}</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="itemPropsRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsGestureTitle }}</h3>
      <DemoDocsTable :headers="[gestureHeader, gestureBehavior]" :rows="gestureRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.swipe-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
}

.demo-group {
  display: flex;
  width: 100%;
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

/* 邮件列表:行高 68(官方示例值),行间以底边框分隔(对照 Example3 BorderThickness 0,1,0,0) */
.mail-list {
  display: flex;
  width: 100%;
  max-width: 720px;
  flex-direction: column;
}

.mail-row {
  height: 68px;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.mail-content {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  min-width: 0;
}

.mail-dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background: transparent;
}

.mail-dot--unread {
  background: var(--wui-system-accent-color);
}

.mail-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.mail-sender {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.mail-sender--unread {
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.mail-subject {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 单行演示行:与官方示例一致的 68px 高度 */
.demo-row {
  width: 100%;
  max-width: 720px;
  height: 68px;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.row-content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-event {
  margin-left: 12px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

/* 重置按钮:WuiButton 承担视觉状态,这里仅约束密度 */
.demo-button {
  padding: 4px 12px;
}

.gesture-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.gesture-list strong {
  color: var(--wui-application-foreground-theme);
  font-weight: 600;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
