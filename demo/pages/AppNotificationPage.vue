<script setup lang="ts">
// AppNotificationPage.vue —— 🌐 Web 替代示例页(对照 WinUI Gallery 的 AppNotificationPage.xaml)。
// AppNotification 不是可视化控件:官方示例演示的是 Windows App SDK 的系统通知编程
// (AppNotificationBuilder 构造 + AppNotificationManager.Default.Show 弹出 toast / 常驻操作中心)。
// Web 版不移植 WinUI 语义,改用浏览器 Web Notifications API 提供等价交互:
//   例 1 权限状态与请求流程(Notification.permission / requestPermission)← Web 特有(WinUI 免运行时权限)
//   例 2 基本通知(new Notification title/body,onclick 聚焦回页)          ← 官方 AppNotificationBasicNotification
//   例 3 圆形徽标 + 静音(icon + silent,对照 SetAppLogoOverride/SetAudioEvent)← 官方 InformationalNotificationLogoCustom
//   例 4 降级:页内 InfoBar 模拟(权限拒绝/非安全上下文/不支持时,标注「页内模拟」)← Web 特有降级通路
//   例 5 Windows 专属能力说明(hero image/出处行/toast 内控件/进度条/声音枚举)← 官方 3 例不演示的部分
// 页首两条静态 InfoBar 对照官方 XAML 页首的说明条(免打扰行为、防滥用警示)。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiInfoBar from '@/components/InfoBar.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = {
  zh: '🌐 AppNotification(应用通知 · Web 替代示例)',
  en: '🌐 AppNotification (Web alternative sample)',
}
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI 版示例演示系统通知编程:AppNotificationBuilder 构造文本/徽标/声音/时间戳,AppNotificationManager 弹出 toast 并常驻操作中心,还可附加按钮、输入框与进度条。AppNotification 不是可视化控件,Web 版改用浏览器 Web Notifications API 提供等价演示:权限请求流程、通知发送(title/body/icon/onclick 聚焦)与权限受限时的页内模拟降级。',
  en: 'The WinUI sample demonstrates system notification programming: AppNotificationBuilder composes text/logo/audio/timestamp, AppNotificationManager pops the toast and pins it to the Action Center, with buttons, inputs and progress bars. AppNotification is not a visual control; this Web page rebuilds the equivalent flow with the browser Notifications API: permission request flow, sending (title/body/icon/onclick focus) and an in-page simulated fallback when permission is restricted.',
}
const BANNER_MIRROR_1: BilingualText = {
  zh: '对照官方页首说明:若系统开启了「免打扰 / 专注助手」,Web 通知同样不会弹出横幅,但仍会进入系统通知中心;浏览器自身的「网站通知」站点设置也可完全关闭某个站点的通知。',
  en: 'Mirrors the official page header: with Do Not Disturb / Focus Assist enabled, web notifications also skip the banner but still land in the notification center; the browser per-site notification setting can disable them entirely.',
}
const BANNER_MIRROR_2: BilingualText = {
  zh: '通知不应滥用:通知用于传达及时且相关的信息。过度使用声音、长时间驻留或过度抢眼的表现会造成打扰疲劳,也会让用户更容易直接拒绝站点权限(官方 Warning InfoBar 的 Web 版)。',
  en: 'Notifications should not be noisy: they exist for timely, relevant information. Excessive sound, long dwell time or attention-seeking visuals cause fatigue — and make users deny the site permission outright (Web adaptation of the official Warning InfoBar).',
}
const EX1_TITLE: BilingualText = { zh: '权限状态与请求流程(Notification.requestPermission)', en: 'Permission state & request flow (Notification.requestPermission)' }
const EX2_TITLE: BilingualText = { zh: '发送基本通知(new Notification)', en: 'Send a basic notification (new Notification)' }
const EX3_TITLE: BilingualText = { zh: '圆形徽标 + 静音(icon · silent,对照 SetAppLogoOverride / SetAudioEvent)', en: 'Round logo + silent (icon · silent, vs SetAppLogoOverride / SetAudioEvent)' }
const EX4_TITLE: BilingualText = { zh: '降级:页内模拟(权限拒绝 / 非安全上下文 / 不支持)', en: 'Fallback: in-page simulation (denied / insecure context / unsupported)' }
const EX5_TITLE: BilingualText = { zh: 'Windows 专属能力(Web 无对应)', en: 'Windows-only capabilities (no Web equivalent)' }
const EX1_NOTE: BilingualText = {
  zh: 'Web 特有:WinUI 应用发通知无需运行时授权(依赖应用身份注册,用户在系统设置按应用开关);浏览器则要求 Notification.requestPermission() 且必须在用户手势(按钮点击)中调用。徽标随 permissions.onchange 实时刷新,发送前也会直读 Notification.permission 复核。',
  en: 'Web-specific: WinUI needs no runtime consent (app identity + per-app system toggle), while browsers require Notification.requestPermission() called from a user gesture. The badge refreshes via permissions.onchange, and Notification.permission is re-read before each send.',
}
const EX2_NOTE: BilingualText = {
  zh: '对照官方 Basic notification 示例:AddText × 2 → title/body。点击系统通知触发 onclick:调用 window.focus() 聚焦本页并 close()(等价 WinUI 的通知激活,见下方点击计数)。标题/正文由参数面板实时提供。',
  en: 'Mirrors the official Basic notification example: AddText × 2 → title/body. Clicking the system toast fires onclick: window.focus() brings this page forward and close() dismisses (the WinUI activation equivalent) — see the click counter. Title/body come live from the options panel.',
}
const EX3_NOTE: BilingualText = {
  zh: '对照官方「Informational notification with logo and custom audio」示例:SetAppLogoOverride(…, Circle) → options.icon(本页按需用画布绘制圆形徽标 PNG,不加载远程资源);SetAudioEvent 的 6 种声音枚举无 Web 对应,仅以 silent 开关表达「静音」;SetTimeStamp(DateTime.Now) → options.timestamp。',
  en: 'Mirrors the official "Informational notification with logo and custom audio" example: SetAppLogoOverride(…, Circle) → options.icon (a round badge PNG is drawn on canvas on demand, no remote assets); the six SetAudioEvent sound enums have no Web counterpart — only the silent switch; SetTimeStamp(DateTime.Now) → options.timestamp.',
}
const EX4_NOTE: BilingualText = {
  zh: '失败降级通路:权限被拒(denied)、非安全上下文(http)、浏览器不支持 Notification API,或开启「始终页内模拟」开关时,发送按钮不再调用 new Notification,改为在下方以页内 InfoBar 模拟一条通知(标题旁标注「页内模拟」)。模拟条与系统通知一样可关闭。',
  en: 'Fallback path: when permission is denied, the context is insecure, the browser lacks the Notification API, or "always simulate" is on, the send buttons skip new Notification and render an in-page InfoBar below (badge「页内模拟」next to the title). Simulation entries close like real toasts.',
}
const EX5_NOTE: BilingualText = {
  zh: '以下 WinUI 能力依赖 Windows 通知平台,Web 平台没有对应 API,本页仅列出说明(完整对照见下方文档区与 wiki):',
  en: 'The following WinUI capabilities depend on the Windows notification platform and have no Web API counterpart. Full mapping in the docs below and in the wiki.',
}
const REQUEST_BUTTON: BilingualText = { zh: '请求通知权限', en: 'Request permission' }
const SEND_BASIC_BUTTON: BilingualText = { zh: '发送基本通知', en: 'Send basic notification' }
const SEND_LOGO_BUTTON: BilingualText = { zh: '发送带徽标通知(静音随面板)', en: 'Send notification with logo (silent from panel)' }
const CLICK_HINT_NONE: BilingualText = { zh: 'onclick 尚未触发:点击弹出的系统通知可回到本页', en: 'onclick not fired yet: click the system toast to return here' }
const CLICK_HINT: BilingualText = { zh: 'onclick 已触发', en: 'onclick fired' }
const UNIT_TIMES: BilingualText = { zh: '次(window.focus + close 已调用)', en: 'time(s) — window.focus + close called' }
const SIM_HINT: BilingualText = { zh: '条页内模拟(最多保留 3 条;以下 InfoBar 即降级后的「通知」)', en: 'simulation(s) kept (max 3); each InfoBar below is the fallback "toast"' }
const UNSUPPORTED_NOTE: BilingualText = {
  zh: '当前浏览器不支持 Notification API(或页面运行在无通知能力的环境):本页全部走页内模拟。',
  en: 'This browser does not support the Notification API (or the page runs where notifications are unavailable): everything falls back to in-page simulation.',
}
const LOGO_TITLE: BilingualText = { zh: '控件聚焦:PersonPicture', en: 'Control Highlight: PersonPicture' }
const LOGO_BODY: BilingualText = { zh: '使用 PersonPicture 控件显示用户头像首字母或图像。', en: 'Use the PersonPicture control to display user avatars with initials or images.' }
const SIM_BADGE_TEXT = '页内模拟'
const DOCS_API_TITLE: BilingualText = { zh: 'WinUI AppNotificationBuilder ↔ Web Notification 对照', en: 'WinUI AppNotificationBuilder ↔ Web Notification mapping' }
const DOCS_LIFECYCLE_TITLE: BilingualText = { zh: '生命周期与事件对照', en: 'Lifecycle & events' }
const DOCS_PERMISSION_TITLE: BilingualText = { zh: '权限模型对照', en: 'Permission model' }
const DOCS_PARITY_TITLE: BilingualText = { zh: 'Windows 专属能力对照', en: 'Windows-only capability mapping' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }
const DOCS_NOTE: BilingualText = {
  zh: '完整教学文档(AppNotificationBuilder ↔ Web Notification API 对照、权限模型 / 生命周期 / 行动按钮 / Windows 专属能力差异、浏览器兼容矩阵)见 wiki/controls/AppNotification.md。',
  en: 'Full documentation (AppNotificationBuilder ↔ Web Notification mapping, permission / lifecycle / action-button / Windows-only differences, browser support matrix) in wiki/controls/AppNotification.md.',
}

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const bannerMirror1 = useBilingual(i18n, BANNER_MIRROR_1)
const bannerMirror2 = useBilingual(i18n, BANNER_MIRROR_2)
const ex1Title = useBilingual(i18n, EX1_TITLE)
const ex2Title = useBilingual(i18n, EX2_TITLE)
const ex3Title = useBilingual(i18n, EX3_TITLE)
const ex4Title = useBilingual(i18n, EX4_TITLE)
const ex5Title = useBilingual(i18n, EX5_TITLE)
const ex1Note = useBilingual(i18n, EX1_NOTE)
const ex2Note = useBilingual(i18n, EX2_NOTE)
const ex3Note = useBilingual(i18n, EX3_NOTE)
const ex4Note = useBilingual(i18n, EX4_NOTE)
const ex5Note = useBilingual(i18n, EX5_NOTE)
const requestButtonLabel = useBilingual(i18n, REQUEST_BUTTON)
const sendBasicButtonLabel = useBilingual(i18n, SEND_BASIC_BUTTON)
const sendLogoButtonLabel = useBilingual(i18n, SEND_LOGO_BUTTON)
const clickHintNone = useBilingual(i18n, CLICK_HINT_NONE)
const clickHint = useBilingual(i18n, CLICK_HINT)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const simHint = useBilingual(i18n, SIM_HINT)
const unsupportedNote = useBilingual(i18n, UNSUPPORTED_NOTE)
const logoTitle = useBilingual(i18n, LOGO_TITLE)
const logoBody = useBilingual(i18n, LOGO_BODY)
const docsApiTitle = useBilingual(i18n, DOCS_API_TITLE)
const docsLifecycleTitle = useBilingual(i18n, DOCS_LIFECYCLE_TITLE)
const docsPermissionTitle = useBilingual(i18n, DOCS_PERMISSION_TITLE)
const docsParityTitle = useBilingual(i18n, DOCS_PARITY_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)
const docsNote = useBilingual(i18n, DOCS_NOTE)

// —— 运行环境探测(降级判定的依据)——
// Notification 在极少数环境(lib.dom 恒声明,运行时不一定)未暴露,经 typeof 探测;
// 桌面浏览器要求安全上下文(https / localhost)才允许通知。
const notificationSupported = typeof Notification !== 'undefined'
const secureContext = ref(window.isSecureContext)

// —— 状态提示(WinUI 无弹窗失败态,Web 错误/降级以 InfoBar 呈现)——
type AppStatusSeverity = 'Informational' | 'Success' | 'Warning' | 'Error'
interface AppStatus {
  severity: AppStatusSeverity
  text: string
}

// —— 例 1:权限状态与请求流程 ——
// TS 6.0 lib.dom 的 NotificationPermission 为 "denied" | "granted"(规范运行值含 default),
// permissions.query 则返回 PermissionState("granted" | "denied" | "prompt");
// 取两者并集为展示态,另加 unsupported。
type PermissionDisplay = NotificationPermission | PermissionState | 'unsupported'
const permissionState = ref<PermissionDisplay>(
  notificationSupported ? Notification.permission : 'unsupported',
)

const PERMISSION_LABELS: Record<PermissionDisplay, BilingualText> = {
  granted: { zh: '已授权(granted)', en: 'granted' },
  denied: { zh: '已拒绝(denied)', en: 'denied' },
  default: { zh: '未询问(default)', en: 'default' },
  prompt: { zh: '询问中(prompt)', en: 'prompt' },
  unsupported: { zh: '不支持 Notification API', en: 'unsupported' },
}

function permissionLabel(state: PermissionDisplay): string {
  return pickText(i18n, PERMISSION_LABELS[state])
}

const permissionStatus = ref<AppStatus | null>(null)

async function requestPermission(): Promise<void> {
  if (!notificationSupported) return
  try {
    // requestPermission 同时兼容 promise 形与旧回调形(lib.dom 签名:deprecatedCallback? 可选);
    // 必须在用户手势中调用,否则多数浏览器直接给 denied。
    const result = await Notification.requestPermission()
    permissionState.value = result
    permissionStatus.value =
      result === 'granted'
        ? { severity: 'Success', text: '权限已授权(granted):现在可以发送系统通知了。' }
        : result === 'denied'
          ? { severity: 'Error', text: '权限被拒绝(denied):发送将降级为页内模拟;可在浏览器站点权限中改回。' }
          : { severity: 'Informational', text: '权限仍未授权(default):浏览器在等待用户确认;部分浏览器会静默忽略非手势调用,请点击按钮重试。' }
  } catch (error) {
    permissionStatus.value = {
      severity: 'Error',
      text: `requestPermission 抛出异常:${
        error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      };非安全上下文(http)下多数浏览器会直接拒绝。`,
    }
  }
}

// permissions.onchange 实时同步(Chromium / Firefox 支持 'notifications' 权限名;
// Safari 不支持 query,依赖发送前直读 Notification.permission 复核)。
let permissionStatusSource: PermissionStatus | null = null

async function watchPermissionChange(): Promise<void> {
  if (!notificationSupported || typeof navigator.permissions === 'undefined') return
  try {
    // 'notifications' 不在 TS lib.dom 的 PermissionName 字面量联合内(运行时合法),双重断言绕过。
    const descriptor = { name: 'notifications' } as unknown as PermissionDescriptor
    const status = await navigator.permissions.query(descriptor)
    permissionStatusSource = status
    permissionState.value = status.state
    status.addEventListener('change', () => {
      permissionState.value = status.state
    })
  } catch {
    // 查询不支持:保持 Notification.permission 直读路径
  }
}

function syncPermissionFromGlobal(): void {
  if (notificationSupported) permissionState.value = Notification.permission
}

// —— 发送参数(DemoOptionRow 契约:ref 一律 string | number | boolean 联合类型)——
const titleOption = ref<string | number | boolean>('欢迎来到 WinUI Web Lib')
const bodyOption = ref<string | number | boolean>(
  '这是一条 Web Notification 演示通知;点击它可回到本页。',
)
const ICON_SOURCE_CHOICES: Array<{ label: string; value: string }> = [
  { label: '画布生成圆形徽标(对照 Circle 裁剪)', value: 'canvas' },
  { label: '自定义 URL', value: 'custom' },
  { label: '无图标', value: 'none' },
]
const iconSource = ref<string | number | boolean>('canvas')
const customIconUrl = ref<string | number | boolean>('')
const isSilent = ref<string | number | boolean>(true)
const useTag = ref<string | number | boolean>(false)
const autoCloseMs = ref<string | number | boolean>(0)

const autoCloseMsValue = computed(() => {
  const parsed = Number(autoCloseMs.value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
})

const NOTIFICATION_TAG = 'appnotification-demo'

/** lib.dom(TS 6.0)的 NotificationOptions 未声明 timestamp / renotify(规范已定义,运行时合法),本页扩展。 */
interface ExtendedNotificationOptions extends NotificationOptions {
  timestamp?: number
  renotify?: boolean
}

/** 按面板配置解析例 3 的徽标:canvas → 画布圆形 PNG;custom → 自定义 URL;none → null。 */
function resolveIconOverride(): string | null {
  const source = String(iconSource.value)
  if (source === 'canvas') return createCircleBellIcon()
  if (source === 'custom') {
    const url = String(customIconUrl.value).trim()
    return url === '' ? null : url
  }
  return null
}

function buildOptions(withIcon: boolean): ExtendedNotificationOptions {
  const options: ExtendedNotificationOptions = {
    body: String(bodyOption.value),
    silent: isSilent.value === true,
    // 对照 SetTimeStamp(DateTime.Now)
    timestamp: Date.now(),
  }
  if (withIcon) {
    const icon = resolveIconOverride()
    if (icon !== null) options.icon = icon
  }
  // 对照官方 toast 的「同 tag 替换」语义:tag + renotify(仅 spec 声明,lib.dom 未含 renotify)
  if (useTag.value === true) {
    options.tag = NOTIFICATION_TAG
    options.renotify = true
  }
  return options
}

// —— 画布圆形徽标(对照 SetAppLogoOverride(…, AppNotificationImageCrop.Circle))——
// 遵守「不加载远程资源」约定:accent 渐变圆底 + 白色铃铛剪影,导出 PNG data URL;
// 白色为绘制内容色(压在 accent 渐变上须恒白保证对比),非 UI 主题色(同 T8-Clipboard 画布先例)。
function createCircleBellIcon(): string {
  const size = 96
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context === null) return ''
  const styles = getComputedStyle(document.documentElement)
  const accent = styles.getPropertyValue('--wui-system-accent-color').trim() || '#0f6cbd'
  const accentLight =
    styles.getPropertyValue('--wui-system-accent-color-light-2').trim() || accent
  // 圆形裁剪(对照 AppNotificationImageCrop.Circle)
  context.beginPath()
  context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  context.clip()
  const gradient = context.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, accent)
  gradient.addColorStop(1, accentLight)
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  // 白色铃铛剪影(路径绘制,不依赖 emoji 字体)
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.moveTo(30, 60)
  context.quadraticCurveTo(30, 34, 48, 30)
  context.quadraticCurveTo(66, 34, 66, 60)
  context.closePath()
  context.fill()
  context.beginPath()
  context.arc(48, 27, 4, 0, Math.PI * 2)
  context.fill()
  context.beginPath()
  context.arc(48, 66, 6, 0, Math.PI * 2)
  context.fill()
  return canvas.toDataURL('image/png')
}

// —— 发送(对照 AppNotificationManager.Default.Show)——
// 桌面端通知常驻通知中心(无自动消失),「自动关闭」参数以定时 close() 近似官方 toast 时长。
const activeNotifications = new Set<Notification>()
const autoCloseTimers = new Map<Notification, number>()
const basicClickCount = ref(0)
const sendStatus = ref<AppStatus | null>(null)
const logoStatus = ref<AppStatus | null>(null)

function spawnNotification(title: string, withIcon: boolean): boolean {
  const options = buildOptions(withIcon)
  const notification = new Notification(title, options)
  // 激活对照:WinUI NotificationInvoked(可后台激活)→ Web onclick 仅页面存活时可达
  notification.onclick = (event) => {
    event.preventDefault()
    basicClickCount.value += 1
    window.focus()
    notification.close()
  }
  notification.onerror = () => {
    sendStatus.value = {
      severity: 'Error',
      text: '通知显示失败(onerror):权限可能在发送后被系统/浏览器收回。',
    }
  }
  notification.onclose = () => {
    activeNotifications.delete(notification)
    const timer = autoCloseTimers.get(notification)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      autoCloseTimers.delete(notification)
    }
  }
  activeNotifications.add(notification)
  if (autoCloseMsValue.value > 0) {
    const timer = window.setTimeout(() => notification.close(), autoCloseMsValue.value)
    autoCloseTimers.set(notification, timer)
  }
  return true
}

// —— 降级:页内模拟(权限拒绝 / 非安全上下文 / 不支持 / 强制开关)——
interface SimulatedNotification {
  id: number
  title: string
  body: string
  iconUrl: string
}
const simulatedNotifications = ref<SimulatedNotification[]>([])
let simulationSeq = 0
const simulateCount = ref(0)
const forceSimulate = ref<string | number | boolean>(false)

const degraded = computed(
  () =>
    !notificationSupported ||
    !secureContext.value ||
    permissionState.value === 'denied' ||
    forceSimulate.value === true,
)

const degradeMessage = computed(() => {
  const reasons: string[] = []
  if (!notificationSupported) reasons.push('当前环境不支持 Notification API')
  if (!secureContext.value) reasons.push('非安全上下文(http)下浏览器禁用通知')
  if (permissionState.value === 'denied') reasons.push('通知权限已被用户拒绝(denied)')
  if (forceSimulate.value === true) reasons.push('已开启「始终页内模拟」开关')
  return `发送按钮改为页内 InfoBar 模拟(标注「${SIM_BADGE_TEXT}」),不再弹出系统通知。原因:${reasons.join(';')}。`
})

function simulateNotification(title: string, body: string, withIcon: boolean): void {
  simulationSeq += 1
  const iconUrl = withIcon ? (resolveIconOverride() ?? '') : ''
  simulatedNotifications.value.unshift({ id: simulationSeq, title, body, iconUrl })
  // 只保留最近 3 条,模拟区不无限增长
  if (simulatedNotifications.value.length > 3) simulatedNotifications.value.pop()
  simulateCount.value += 1
}

function removeSimulated(id: number): void {
  simulatedNotifications.value = simulatedNotifications.value.filter((item) => item.id !== id)
}

/** 统一发送入口:先复核权限,降级态走页内模拟,正常态 new Notification(构造抛异常时回退模拟)。 */
function dispatchSend(title: string, body: string, withIcon: boolean, target: 'basic' | 'logo'): void {
  syncPermissionFromGlobal()
  const statusRef = target === 'basic' ? sendStatus : logoStatus
  statusRef.value = null
  if (degraded.value) {
    simulateNotification(title, body, withIcon)
    statusRef.value = {
      severity: 'Warning',
      text: '通知权限受限:已降级为页内模拟(见「降级:页内模拟」卡片)。',
    }
    return
  }
  try {
    spawnNotification(title, withIcon)
    statusRef.value = {
      severity: 'Success',
      text: `通知已发送:new Notification("${title}")。桌面端会弹出横幅并常驻通知中心;若被浏览器/系统吞掉,请检查站点通知设置与免打扰模式。`,
    }
  } catch (error) {
    simulateNotification(title, body, withIcon)
    statusRef.value = {
      severity: 'Warning',
      text: `构造通知失败(${
        error instanceof Error ? error.name : String(error)
      },常见于权限仍为 prompt):已回退为页内模拟;可先点击「请求通知权限」。`,
    }
  }
}

function sendBasic(): void {
  dispatchSend(String(titleOption.value), String(bodyOption.value), false, 'basic')
}

function sendWithLogo(): void {
  dispatchSend(logoTitle.value, logoBody.value, true, 'logo')
}

// —— 下半区固定开发文档 ——
const apiHeaders = ['WinUI(AppNotificationBuilder / Manager)', 'Web(Notification API)', '说明']
const apiRows: (string | number)[][] = [
  ['AddText(标题) + AddText(正文)(首个 AddText 为 toast 标题)', 'new Notification(title, { body })', '构造即完成文本;等价 Builder 的文本叠加语义'],
  ['AppNotificationManager.Default.Show(notification)', '构造 Notification 实例即入队(等价 Show)', '桌面端弹出横幅并常驻通知中心;移动端需改用 ServiceWorkerRegistration.showNotification'],
  ['SetAppLogoOverride(uri, AppNotificationImageCrop.Circle)', 'options.icon(URL)', 'Web 无裁剪选项,形状由系统决定;本页画布生成圆形 PNG 对照 Circle'],
  ['SetAudioEvent(Default / IM / Reminder / SMS / Alarm / Call)', '仅 options.silent(静音开关)', '6 种声音事件枚举无对应;提示音由系统/浏览器统一控制'],
  ['SetTimeStamp(DateTime.Now)', 'options.timestamp(Epoch 毫秒)', 'lib.dom 未声明该字段(规范已定义),需扩展接口传入'],
  ['SetHeroImage(uri) + SetAttributionText(text)', '无对应', 'Web 通知无 hero 大图与出处行(Windows 专属)'],
  ['AddButton / AddComboBox / AddTextBox(toast 内交互)', '无对应(options.actions 桌面浏览器不渲染)', '交互输入为 Windows 专属;Web actions 仅部分 Android 浏览器显示'],
  ['AddProgressBar(通知内进度条)', '无对应', '通知内进度条 Web 无承载'],
  ['Duration(Default / Long)', '无对应(定时 close() 近似)', '桌面 Web 通知常驻通知中心;本页「自动关闭」参数近似 toast 时长'],
  ['AppNotificationManager.NotificationInvoked(激活回调,可后台激活)', 'Notification.onclick(页面存活时)+ onshow / onclose / onerror', '页面卸载后 onclick 丢失;后台激活需 Service Worker 的 notificationclick'],
  ['设置 > 系统 > 通知 中按应用开关', 'Notification.permission 三态 + 浏览器站点权限', '见下方「权限模型对照」'],
]
const lifecycleHeaders = ['阶段', 'WinUI', 'Web']
const lifecycleRows: (string | number)[][] = [
  ['弹出', 'Show() 即弹 toast(免打扰下仅入操作中心)', 'new Notification() 即弹;受系统免打扰与浏览器站点设置影响'],
  ['常驻', '操作中心(Action Center)常驻', '桌面端同样常驻通知中心;tag + renotify 可替换同 tag 旧通知'],
  ['激活', 'NotificationInvoked + Launch 参数(可后台激活应用)', 'onclick(仅页面/浏览器存活时);后台需 Service Worker notificationclick'],
  ['关闭', '用户划除或由系统管理生命周期', 'onclose(用户关闭与程序 close() 均触发);超时用定时 close() 近似'],
  ['失败', '部署依赖(Singleton 包;自包含部署需注意 MSIX 依赖)', 'onerror(权限被收回 / 系统拦截等)'],
]
const permissionHeaders = ['维度', 'WinUI', 'Web']
const permissionRows: (string | number)[][] = [
  ['运行时授权', '无请求 API:依赖应用身份注册(MSIX / package identity)', 'Notification.requestPermission(),必须在用户手势(按钮点击)中调用'],
  ['状态查询', '无(以系统设置为准)', 'Notification.permission 直读(default / granted / denied);permissions.query({ name: "notifications" }) 可监听 onchange'],
  ['用户收回', '设置 > 系统 > 通知 中按应用开关', '浏览器站点权限(地址栏权限面板);denied 后 new Notification 抛异常'],
  ['非安全上下文', '无此概念(桌面应用)', 'http 下通知不可用,本页降级为页内模拟'],
  ['iOS Safari', '—', '需先将站点安装为 PWA(添加到主屏幕)后才可请求通知权限'],
]
const parityHeaders = ['WinUI 能力', 'Web 版处理']
const parityRows: (string | number)[][] = [
  ['Toast 内交互控件(AddButton / AddComboBox / AddTextBox)', '无对应:options.actions 桌面浏览器不渲染(仅部分 Android);本页归入说明区'],
  ['Hero image(SetHeroImage)与出处行(SetAttributionText)', '无对应'],
  ['通知内进度条(AddProgressBar)', '无对应'],
  ['声音事件枚举(SetAudioEvent 6 种)', '无对应:仅 options.silent 静音开关'],
  ['操作中心策略与免打扰(DND)行为', '系统级行为,页面不可控制;页首 InfoBar 提示(对照官方页首说明条)'],
  ['后台激活(AppNotificationActivator / Launch 参数)', '页面存活时仅 onclick;后台激活需 Service Worker notificationclick'],
  ['Singleton 包部署依赖(官方页首第一条说明)', 'Windows 部署概念,Web 无对应'],
]

// 用法代码:权限 → 发送 → 激活 → 降级 的最小闭环。
const usageCode = `// 1. 请求权限(必须在用户手势中调用,如按钮点击回调)
const permission = await Notification.requestPermission() // 'granted' | 'denied' | 'default'

// 2. 发送通知(等价 AppNotificationBuilder + AppNotificationManager.Default.Show)
const notification = new Notification('欢迎来到 WinUI Web Lib', {
  body: '点击通知可回到本页',
  icon: circleIconDataUrl, // 对照 SetAppLogoOverride(…, Circle)
  silent: true,            // 对照 SetAudioEvent(仅静音开关,声音枚举无对应)
  timestamp: Date.now(),   // 对照 SetTimeStamp(lib.dom 未声明,需扩展接口)
  tag: 'demo',             // 同 tag 通知相互替换(配合 renotify)
})

// 3. 激活(WinUI NotificationInvoked 的「页面存活」版:点击聚焦并关闭)
notification.onclick = () => {
  window.focus()
  notification.close()
}

// 4. 降级:权限拒绝 / 非安全上下文 / API 不支持时,改为页内 InfoBar 模拟
if (Notification.permission === 'denied' || !window.isSecureContext) {
  // 页内模拟(本页以 WuiInfoBar 呈现,标注「页内模拟」)
}`

// —— 生命周期 ——
onMounted(() => {
  void watchPermissionChange()
})

onBeforeUnmount(() => {
  if (permissionStatusSource !== null) {
    // PermissionStatus 挂在 navigator 上,页面销毁后监听一并失效;显式清理保持纪律
    permissionStatusSource = null
  }
  for (const timer of autoCloseTimers.values()) {
    window.clearTimeout(timer)
  }
  autoCloseTimers.clear()
  activeNotifications.clear()
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="notification-stage">
        <!-- 页首说明条:对照官方 XAML 页首的两条 InfoBar(免打扰行为 / 防滥用警示)-->
        <WuiInfoBar
          class="example-card"
          :message="bannerMirror1"
          severity="Informational"
          :is-open="true"
          :is-closable="false"
        />
        <WuiInfoBar
          class="example-card"
          :title="bannerMirror2"
          severity="Warning"
          :is-open="true"
          :is-closable="false"
        />

        <!-- 降级横幅:任一降级条件成立即提示(发送按钮自动切换为页内模拟)-->
        <WuiInfoBar
          v-if="degraded"
          class="example-card"
          title="通知能力受限 · 已切换页内模拟"
          :message="degradeMessage"
          severity="Warning"
          :is-open="true"
          :is-closable="false"
        />

        <!-- 例 1:权限状态与请求流程 ← Web 特有(WinUI 免运行时权限)-->
        <section class="example-card example-panel">
          <h4 class="example-title">{{ ex1Title }}</h4>
          <p class="example-note">{{ ex1Note }}</p>
          <div class="example-row">
            <code class="api-name">Notification.permission</code>
            <span class="permission-badge" :class="`is-${permissionState}`">
              {{ permissionLabel(permissionState) }}
            </span>
            <WuiButton
              :content="requestButtonLabel"
              :disabled="!notificationSupported"
              @click="requestPermission"
            />
          </div>
          <p v-if="!notificationSupported" class="example-note">{{ unsupportedNote }}</p>
          <WuiInfoBar
            v-if="permissionStatus !== null"
            class="example-status"
            :message="permissionStatus.text"
            :severity="permissionStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 2:发送基本通知 ← 官方 AppNotificationBasicNotification -->
        <section class="example-card example-panel">
          <h4 class="example-title">{{ ex2Title }}</h4>
          <p class="example-note">{{ ex2Note }}</p>
          <div class="example-row">
            <WuiButton :content="sendBasicButtonLabel" @click="sendBasic" />
          </div>
          <p class="click-hint">
            <template v-if="basicClickCount > 0">
              {{ clickHint }} {{ basicClickCount }} {{ unitTimes }}
            </template>
            <template v-else>{{ clickHintNone }}</template>
          </p>
          <WuiInfoBar
            v-if="sendStatus !== null"
            class="example-status"
            :message="sendStatus.text"
            :severity="sendStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 3:圆形徽标 + 静音 ← 官方 InformationalNotificationLogoCustom -->
        <section class="example-card example-panel">
          <h4 class="example-title">{{ ex3Title }}</h4>
          <p class="example-note">{{ ex3Note }}</p>
          <div class="example-row">
            <WuiButton :content="sendLogoButtonLabel" @click="sendWithLogo" />
          </div>
          <WuiInfoBar
            v-if="logoStatus !== null"
            class="example-status"
            :message="logoStatus.text"
            :severity="logoStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 4:降级页内模拟 ← Web 特有降级通路(需求:权限拒绝时 InfoBar 模拟,标注「页内模拟」)-->
        <section class="example-card example-panel">
          <h4 class="example-title">{{ ex4Title }}</h4>
          <p class="example-note">{{ ex4Note }}</p>
          <p class="click-hint">{{ simulateCount }} {{ simHint }}</p>
          <div class="simulation-list">
            <WuiInfoBar
              v-for="item in simulatedNotifications"
              :key="item.id"
              class="simulation-item"
              :message="item.body"
              severity="Informational"
              :is-open="true"
              :is-closable="true"
              @closed="removeSimulated(item.id)"
            >
              <template #title>
                <span class="simulation-title">
                  {{ item.title }}
                  <span class="sim-badge">{{ SIM_BADGE_TEXT }}</span>
                </span>
              </template>
              <template v-if="item.iconUrl !== ''" #icon>
                <img :src="item.iconUrl" class="sim-icon" alt="" />
              </template>
            </WuiInfoBar>
          </div>
        </section>

        <!-- 例 5:Windows 专属能力说明(Web 无对应;完整对照见文档区与 wiki)-->
        <section class="example-card example-panel">
          <h4 class="example-title">{{ ex5Title }}</h4>
          <p class="example-note">{{ ex5Note }}</p>
          <ul class="windows-only-list">
            <li>Hero image(SetHeroImage)与出处行(SetAttributionText)</li>
            <li>Toast 内交互控件:AddButton / AddComboBox / AddTextBox(Web actions 桌面不渲染)</li>
            <li>通知内进度条(AddProgressBar,官方 Progress Bar Example)</li>
            <li>声音事件枚举:SetAudioEvent 的 Default / IM / Reminder / SMS / Alarm / Call(仅 silent 可表达静音)</li>
            <li>操作中心策略与免打扰(DND)行为、按应用通知开关(系统设置)</li>
            <li>后台激活:AppNotificationActivator + Launch 参数(Web 后台需 Service Worker notificationclick)</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="标题(title)" type="text" v-model="titleOption" />
        <DemoOptionRow label="正文(body)" type="text" v-model="bodyOption" />
        <DemoOptionRow label="例③ 图标来源" type="select" v-model="iconSource" :options="ICON_SOURCE_CHOICES" />
        <DemoOptionRow label="自定义图标 URL(iconSource = custom 时生效)" type="text" v-model="customIconUrl" placeholder="https://…/icon.png" />
        <DemoOptionRow label="静音(silent,对照 SetAudioEvent)" type="toggle" v-model="isSilent" />
        <DemoOptionRow label="复用 tag(同 tag 替换旧通知 + renotify)" type="toggle" v-model="useTag" />
        <DemoOptionRow
          label="自动关闭(ms,0 = 常驻;近似官方 toast 时长)"
          type="slider"
          v-model="autoCloseMs"
          :min="0"
          :max="15000"
          :step="500"
        />
        <DemoOptionRow label="始终页内模拟(预览降级 UI)" type="toggle" v-model="forceSimulate" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsApiTitle }}</h4>
      <DemoDocsTable :headers="apiHeaders" :rows="apiRows" />
      <h4 class="docs-subtitle">{{ docsLifecycleTitle }}</h4>
      <DemoDocsTable :headers="lifecycleHeaders" :rows="lifecycleRows" />
      <h4 class="docs-subtitle">{{ docsPermissionTitle }}</h4>
      <DemoDocsTable :headers="permissionHeaders" :rows="permissionRows" />
      <h4 class="docs-subtitle">{{ docsParityTitle }}</h4>
      <DemoDocsTable :headers="parityHeaders" :rows="parityRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="ts" />
      <p class="docs-note">{{ docsNote }}</p>
    </template>
  </DemoPage>
</template>

<style scoped>
.notification-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 880px;
}

/* 例卡片(对应官方 ControlExample 容器;页首说明条同宽对齐) */
.example-card {
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 交互例卡片(InfoBar 说明条走自身组件样式,不加内边距) */
.example-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.example-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.example-note {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.example-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.api-name {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

/* 权限徽标(granted 强调色实底;其余中性,语义靠文字;同 ClipboardPage 权限徽标) */
.permission-badge {
  padding: 2px 10px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.permission-badge.is-granted {
  color: var(--wui-system-control-foreground-alt-high);
  background: var(--wui-toggle-switch-curtain-background-theme);
  border-color: var(--wui-system-control-transparent);
}

.permission-badge.is-denied,
.permission-badge.is-unsupported {
  border-style: dashed;
}

.click-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 模拟通知列表(降级 InfoBar,标注「页内模拟」) */
.simulation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.simulation-item {
  width: 100%;
}

.simulation-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.sim-badge {
  padding: 1px 8px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-system-control-foreground-alt-high);
  background: var(--wui-toggle-switch-curtain-background-theme);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 圆形徽标:50% 为 Circle 裁剪语义(对应 AppNotificationImageCrop.Circle),非主题圆角 */
.sim-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.windows-only-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 20px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.docs-note {
  margin: 8px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}
</style>
