<script setup lang="ts">
// ClipboardPage.vue —— 🌐 Web 替代示例页(对照 WinUI Gallery 的 ClipboardPage.xaml)。
// Clipboard 不是可视化控件:官方示例演示的是系统剪贴板编程(复制/粘贴文本、图像、文件,
// 历史/漫游选项,格式枚举与内容变更监听)。Web 版不移植 WinUI 控件语义,改用浏览器
// Clipboard API(navigator.clipboard / ClipboardItem / navigator.permissions)提供等价交互:
//   例 1 复制文本(writeText,非安全上下文降级 execCommand)   ← 官方 CopyTextClipboard
//   例 2 粘贴文本(readText,权限失败态展示)                  ← 官方 PasteTextClipboard
//   例 3 富文本复制(ClipboardItem text/html,来源 WuiRichEditBox)← 官方 RichEditBox 复制链路
//   例 4 图像复制/粘贴(ClipboardItem image/png)              ← 官方 ClipboardCopyPasteImage
//   例 5 权限状态(navigator.permissions.query + onchange)     ← Web 特有(WinUI 无权限概念)
// Windows 特有能力(历史/漫游/文件/清空/ContentChanged)Web 无对应:页面仅作说明区列出,
// 完整对照表见 wiki/controls/Clipboard.md。
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiInfoBar from '@/components/InfoBar.vue'
import WuiRichEditBox from '@/components/RichEditBox.vue'
import WuiTextBox from '@/components/TextBox.vue'
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
  zh: '🌐 Clipboard(剪贴板 · Web 替代示例)',
  en: '🌐 Clipboard (Web alternative sample)',
}
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI 版示例演示系统剪贴板编程:复制/粘贴文本与图像、剪贴板历史与漫游选项、格式枚举与内容变更监听。Clipboard 不是可视化控件,Web 版改用浏览器 Clipboard API 提供等价交互演示:文本复制/粘贴往返、富文本(HTML)复制、图像复制/粘贴与权限状态展示。',
  en: 'The WinUI sample demonstrates system clipboard programming: copying/pasting text and images, history and roaming options, format enumeration and change monitoring. Clipboard is not a visual control; this Web page rebuilds the equivalent interactions with the browser Clipboard API: text copy/paste round-trip, rich text (HTML) copy, image copy/paste and permission status.',
}
const BANNER_TITLE: BilingualText = { zh: '剪贴板能力受限', en: 'Clipboard capabilities limited' }
const EX1_TITLE: BilingualText = { zh: '复制文本(writeText)', en: 'Copy text (writeText)' }
const EX2_TITLE: BilingualText = { zh: '粘贴文本(readText)', en: 'Paste text (readText)' }
const EX3_TITLE: BilingualText = { zh: '复制富文本(ClipboardItem · text/html)', en: 'Copy rich text (ClipboardItem · text/html)' }
const EX4_TITLE: BilingualText = { zh: '复制 / 粘贴图像(ClipboardItem · image/png)', en: 'Copy / paste image (ClipboardItem · image/png)' }
const EX5_TITLE: BilingualText = { zh: '权限状态(navigator.permissions)', en: 'Permission status (navigator.permissions)' }
const EX6_TITLE: BilingualText = { zh: 'Windows 专属能力(Web 无对应)', en: 'Windows-only capabilities (no Web equivalent)' }
const EX1_INPUT_HEADER: BilingualText = { zh: '要复制的文本:', en: 'Text to copy:' }
const EX1_PLACEHOLDER: BilingualText = { zh: '输入要复制的文本', en: 'Enter text to copy' }
const EX1_NOTE: BilingualText = {
  zh: '对照官方 Copy Text to the Clipboard 示例:点击复制后显示确认提示,2 秒后自动隐藏(时长可用下方参数调节);WinUI 的无障碍播报(AnnounceActionForAccessibility)对应 InfoBar 的 alert/status 语义。',
  en: 'Mirrors the official "Copy Text to the Clipboard" example: a confirmation appears after copying and auto-hides after 2 s (adjustable below); the WinUI accessibility announcement maps to the InfoBar alert/status semantics.',
}
const EX2_NOTE: BilingualText = {
  zh: '对照官方 Paste Text from the Clipboard 示例:读取系统剪贴板中的纯文本。浏览器首次读取会弹出授权提示,权限被拒时展示失败态(NotAllowedError);非安全上下文下此按钮被禁用。',
  en: 'Mirrors the official "Paste Text from the Clipboard" example: reads plain text from the system clipboard. The browser prompts for permission on first read; a denied permission shows the failure state (NotAllowedError). The button is disabled on insecure contexts.',
}
const EX3_NOTE: BilingualText = {
  zh: '对照官方示例的 RichEditBox 复制链路:编辑富文本后以 ClipboardItem 写入 text/html(可选附带 text/plain 纯文本后备),并可读取剪贴板中的 HTML 源码。富文本数据无执行风险:展示用插值输出,粘贴到别处时由目标应用渲染。',
  en: 'Mirrors the official RichEditBox copy flow: edit rich text, then write text/html via ClipboardItem (with an optional text/plain fallback), and read back the HTML source from the clipboard.',
}
const EX4_NOTE: BilingualText = {
  zh: '对照官方 Copy and Paste an Image 示例(官方素材为本地照片,Web 版改为按主题色即时绘制的画布,不加载远程资源):以 ClipboardItem 写入 image/png,读取时从剪贴板取回任意 image/* 格式生成对象 URL 显示。',
  en: 'Mirrors the official "Copy and Paste an Image" example (the official asset is a local photo; the Web version draws a theme-accent canvas on the fly instead of loading remote resources).',
}
const EX5_NOTE: BilingualText = {
  zh: 'Web 侧特有:WinUI 应用读写剪贴板无需权限,浏览器则要求安全上下文 + 用户授权。clipboard-write 多为隐性授权,clipboard-read 首次使用触发询问;onchange 监听让状态实时更新,无需手动刷新。',
  en: 'Web-specific: WinUI apps need no permission to use the clipboard, while browsers require a secure context plus user consent. clipboard-write is usually granted implicitly; clipboard-read prompts on first use. onchange keeps the badges live.',
}
const EX6_NOTE: BilingualText = {
  zh: '以下 WinUI 能力依赖 Windows 系统剪贴板,Web 平台没有对应 API,本页仅列出说明(完整对照见下方文档区与 wiki):',
  en: 'The following WinUI capabilities depend on the Windows system clipboard and have no Web API counterpart. Full mapping in the docs below and in the wiki.',
}
const PASTE_CAPTION: BilingualText = { zh: '剪贴板内容:', en: 'Clipboard content:' }
const PASTE_PLACEHOLDER: BilingualText = { zh: '点击上方按钮读取剪贴板!', en: 'Click the button above to read the clipboard!' }
const COPY_BUTTON: BilingualText = { zh: '复制文本到剪贴板', en: 'Copy text to clipboard' }
const PASTE_BUTTON: BilingualText = { zh: '从剪贴板粘贴文本', en: 'Paste text from clipboard' }
const COPY_RICH_BUTTON: BilingualText = { zh: '复制为富文本(text/html)', en: 'Copy as rich text (text/html)' }
const READ_HTML_BUTTON: BilingualText = { zh: '读取剪贴板 HTML', en: 'Read clipboard HTML' }
const COPY_IMAGE_BUTTON: BilingualText = { zh: '复制图像到剪贴板', en: 'Copy image to clipboard' }
const PASTE_IMAGE_BUTTON: BilingualText = { zh: '粘贴图像', en: 'Paste image' }
const PASTED_IMAGE_ALT: BilingualText = { zh: '从剪贴板粘贴的图像', en: 'Image pasted from clipboard' }
const REFRESH_BUTTON: BilingualText = { zh: '刷新权限状态', en: 'Refresh permission status' }
const PERMISSION_UNSUPPORTED_NOTE: BilingualText = {
  zh: '当前浏览器不支持用 navigator.permissions 查询剪贴板权限(Firefox / Safari 对 clipboard-* 权限名抛 NotSupportedError),实际权限以首次读写时的浏览器提示为准。',
  en: 'This browser cannot query clipboard permissions via navigator.permissions (Firefox / Safari throw NotSupportedError for clipboard-* names); the actual permission is decided by the browser prompt on first read/write.',
}
const DOCS_API_TITLE: BilingualText = { zh: 'Web API 一览', en: 'Web API overview' }
const DOCS_EVENT_TITLE: BilingualText = { zh: '事件对照', en: 'Events' }
const DOCS_PARITY_TITLE: BilingualText = { zh: 'Windows 专属能力对照', en: 'Windows-only capability mapping' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }
const DOCS_NOTE: BilingualText = {
  zh: '完整教学文档(WinUI Clipboard API ↔ Web Clipboard API 对照表、权限模型、浏览器兼容矩阵)见 wiki/controls/Clipboard.md。',
  en: 'Full documentation (WinUI ↔ Web Clipboard API mapping, permission model, browser support matrix) in wiki/controls/Clipboard.md.',
}

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const bannerTitle = useBilingual(i18n, BANNER_TITLE)
const ex1Title = useBilingual(i18n, EX1_TITLE)
const ex2Title = useBilingual(i18n, EX2_TITLE)
const ex3Title = useBilingual(i18n, EX3_TITLE)
const ex4Title = useBilingual(i18n, EX4_TITLE)
const ex5Title = useBilingual(i18n, EX5_TITLE)
const ex6Title = useBilingual(i18n, EX6_TITLE)
const ex1InputHeader = useBilingual(i18n, EX1_INPUT_HEADER)
const ex1Placeholder = useBilingual(i18n, EX1_PLACEHOLDER)
const ex1Note = useBilingual(i18n, EX1_NOTE)
const ex2Note = useBilingual(i18n, EX2_NOTE)
const ex3Note = useBilingual(i18n, EX3_NOTE)
const ex4Note = useBilingual(i18n, EX4_NOTE)
const ex5Note = useBilingual(i18n, EX5_NOTE)
const ex6Note = useBilingual(i18n, EX6_NOTE)
const pasteCaption = useBilingual(i18n, PASTE_CAPTION)
const pastePlaceholderText = useBilingual(i18n, PASTE_PLACEHOLDER)
const copyButtonLabel = useBilingual(i18n, COPY_BUTTON)
const pasteButtonLabel = useBilingual(i18n, PASTE_BUTTON)
const copyRichButtonLabel = useBilingual(i18n, COPY_RICH_BUTTON)
const readHtmlButtonLabel = useBilingual(i18n, READ_HTML_BUTTON)
const copyImageButtonLabel = useBilingual(i18n, COPY_IMAGE_BUTTON)
const pasteImageButtonLabel = useBilingual(i18n, PASTE_IMAGE_BUTTON)
const pastedImageAlt = useBilingual(i18n, PASTED_IMAGE_ALT)
const refreshButtonLabel = useBilingual(i18n, REFRESH_BUTTON)
const permissionUnsupportedNote = useBilingual(i18n, PERMISSION_UNSUPPORTED_NOTE)
const docsApiTitle = useBilingual(i18n, DOCS_API_TITLE)
const docsEventTitle = useBilingual(i18n, DOCS_EVENT_TITLE)
const docsParityTitle = useBilingual(i18n, DOCS_PARITY_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)
const docsNote = useBilingual(i18n, DOCS_NOTE)

// —— 运行环境探测(降级 UI 的依据)——
// navigator.clipboard 仅在安全上下文(https / localhost)暴露,类型上非可选故经 typeof 探测。
const secureContext = ref(window.isSecureContext)
const clipboardAvailable = ref(typeof navigator.clipboard !== 'undefined')
const clipboardItemSupported = computed(
  () => clipboardAvailable.value && typeof ClipboardItem !== 'undefined',
)
const clipboardReadSupported = computed(
  () => clipboardAvailable.value && typeof navigator.clipboard.read === 'function',
)
const bannerMessage = computed(() => {
  const degraded = '文本复制降级为 execCommand("copy");读取文本、富文本与图像示例已被禁用。'
  if (!clipboardAvailable.value) {
    return secureContext.value
      ? '当前浏览器未暴露 navigator.clipboard,文本复制将降级为 execCommand("copy"),读取与富文本/图像示例不可用。'
      : `非安全上下文(http):Async Clipboard API 不可用。${degraded}`
  }
  return `非安全上下文(http):Async Clipboard API 不可用。${degraded}`
})

// —— 状态提示(WinUI TextBlock 确认/状态行 → WuiInfoBar,颜色语义由组件按档位处理)——
type AppStatusSeverity = 'Informational' | 'Success' | 'Warning' | 'Error'
interface AppStatus {
  severity: AppStatusSeverity
  text: string
}

function describeClipboardError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return '权限被拒(NotAllowedError):浏览器拒绝了剪贴板访问;请在浏览器站点权限中允许,或保持页面处于聚焦状态后重试'
    }
    if (error.name === 'NotFoundError') return '剪贴板中没有所需的数据格式(NotFoundError)'
    if (error.name === 'NotSupportedError') return '当前浏览器不支持该操作(NotSupportedError)'
    return `${error.name}: ${error.message}`
  }
  if (error instanceof Error) return error.message
  return String(error)
}

// —— 例 1:复制文本(writeText;官方确认提示 2 秒自动隐藏 → confirmDelay 可调)——
// DemoOptionRow 契约:参数 ref 一律 string | number | boolean 联合类型;
// WuiTextBox 的 v-model:text 需 string,经可写计算属性桥接两种契约。
const copyTextOption = ref<string | number | boolean>('这段文本将被复制到剪贴板。')
const copyText = computed<string>({
  get: () => String(copyTextOption.value),
  set: (value: string) => {
    copyTextOption.value = value
  },
})
const confirmDelay = ref<string | number | boolean>(2000)
const copyStatus = ref<AppStatus | null>(null)
let copyHideTimer: number | undefined

const confirmDelayValue = computed(() => {
  const parsed = Number(confirmDelay.value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2000
})

/** navigator.clipboard 优先;非安全上下文或权限被拒时降级隐藏 textarea + execCommand(与 DemoCode 同策略)。 */
async function writeTextWithFallback(text: string): Promise<'async' | 'fallback' | 'failed'> {
  if (clipboardAvailable.value) {
    try {
      await navigator.clipboard.writeText(text)
      return 'async'
    } catch {
      // 落入 execCommand 降级(如瞬时失焦导致的 NotAllowedError)
    }
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(area)
  return ok ? 'fallback' : 'failed'
}

async function copyPlainText(): Promise<void> {
  if (copyHideTimer !== undefined) {
    window.clearTimeout(copyHideTimer)
    copyHideTimer = undefined
  }
  const text = copyText.value
  if (text === '') {
    copyStatus.value = { severity: 'Warning', text: '请先输入要复制的文本。' }
    return
  }
  const result = await writeTextWithFallback(text)
  if (result === 'failed') {
    copyStatus.value = { severity: 'Error', text: '复制失败:当前环境不允许写剪贴板。' }
    return
  }
  copyStatus.value = {
    severity: 'Success',
    text:
      result === 'async'
        ? '文本已复制到剪贴板!(navigator.clipboard.writeText)'
        : '文本已复制到剪贴板!(降级:document.execCommand)',
  }
  if (confirmDelayValue.value > 0) {
    // 对照官方示例:确认提示 2 秒后自动隐藏(DispatcherQueue.TryEnqueue + Task.Delay(2000))
    copyHideTimer = window.setTimeout(() => {
      copyStatus.value = null
      copyHideTimer = undefined
    }, confirmDelayValue.value)
  }
}

// —— 例 2:粘贴文本(readText;权限失败态展示)——
const pasteResult = ref('')
const pasteStatus = ref<AppStatus | null>(null)

async function pastePlainText(): Promise<void> {
  pasteStatus.value = null
  try {
    const text = await navigator.clipboard.readText()
    pasteResult.value = text === '' ? '(剪贴板为空)' : text
  } catch (error) {
    pasteResult.value = ''
    pasteStatus.value = { severity: 'Error', text: `读取失败:${describeClipboardError(error)}` }
  }
}

// —— 例 3:富文本复制(ClipboardItem text/html;官方示例为 RichEditBox → 复制)——
const richDocument = ref(
  '<div>剪贴板富文本示例:这里是 <b>加粗</b>、<i>斜体</i> 与 <u>下划线</u> 混排的内容。</div><div>复制后可粘贴到 Word、邮件等支持富文本的应用;「读取剪贴板 HTML」可查看 text/html 原文。</div>',
)
const plainFallback = ref<string | number | boolean>(true)
const richStatus = ref<AppStatus | null>(null)
const htmlSource = ref('')

/** 富文本 → 纯文本后备:DOMParser 提取纯文本(不执行任何脚本,解析文档与主文档隔离)。 */
function htmlToPlainText(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  return (parsed.body.textContent ?? '').trim()
}

async function copyRichText(): Promise<void> {
  const html = richDocument.value
  if (html.trim() === '') {
    richStatus.value = { severity: 'Warning', text: '请先在编辑器中输入富文本内容。' }
    return
  }
  const types: Record<string, Blob> = {
    'text/html': new Blob([html], { type: 'text/html' }),
  }
  const withFallback = plainFallback.value === true
  if (withFallback) {
    types['text/plain'] = new Blob([htmlToPlainText(html)], { type: 'text/plain' })
  }
  try {
    await navigator.clipboard.write([new ClipboardItem(types)])
    richStatus.value = {
      severity: 'Success',
      text: withFallback
        ? '富文本已复制(text/html + text/plain 双格式)。'
        : '富文本已复制(仅 text/html 单格式)。',
    }
  } catch (error) {
    richStatus.value = { severity: 'Error', text: `复制失败:${describeClipboardError(error)}` }
  }
}

/** 按类型前缀读取剪贴板数据:优先精确匹配,再按「前缀/」子类型匹配(item.types ↔ WinUI AvailableFormats)。 */
async function readClipboardByType(prefix: string): Promise<Blob | null> {
  const items = await navigator.clipboard.read()
  for (const item of items) {
    const exact = item.types.find((type) => type === prefix)
    const partial = item.types.find((type) => type.startsWith(`${prefix}/`))
    const matched = exact ?? partial
    if (matched !== undefined) return await item.getType(matched)
  }
  return null
}

async function readHtmlSource(): Promise<void> {
  richStatus.value = null
  if (!clipboardReadSupported.value) {
    richStatus.value = {
      severity: 'Error',
      text: '当前浏览器不支持 clipboard.read()(多格式读取;Firefox 127+ 支持),无法读取剪贴板 HTML。',
    }
    return
  }
  try {
    const blob = await readClipboardByType('text/html')
    if (blob === null) {
      htmlSource.value = ''
      richStatus.value = { severity: 'Informational', text: '剪贴板中没有 text/html 格式的内容。' }
      return
    }
    htmlSource.value = await blob.text()
  } catch (error) {
    htmlSource.value = ''
    richStatus.value = { severity: 'Error', text: `读取失败:${describeClipboardError(error)}` }
  }
}

// —— 例 4:图像复制 / 粘贴(ClipboardItem image/png;官方素材 → 主题色画布,无远程资源)——
const imageSize = ref<string | number | boolean>(200)
const sampleCanvas = ref<HTMLCanvasElement | null>(null)
const imageStatus = ref<AppStatus | null>(null)
const pastedImageUrl = ref('')

const imageSizeValue = computed(() => {
  const parsed = Number(imageSize.value)
  return Number.isFinite(parsed) ? Math.min(280, Math.max(80, parsed)) : 200
})

/** 按官方示例比例(200×150 = 4:3)即时绘制示例图像;颜色取主题 accent token,随浅/深主题预览联动。 */
function drawSampleImage(): void {
  const canvas = sampleCanvas.value
  if (canvas === null) return
  const width = imageSizeValue.value
  const height = Math.round((width * 3) / 4)
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context === null) return
  const styles = getComputedStyle(document.documentElement)
  const accent = styles.getPropertyValue('--wui-system-accent-color').trim() || '#0f6cbd'
  const accentLight =
    styles.getPropertyValue('--wui-system-accent-color-light-2').trim() || accent
  const gradient = context.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, accent)
  gradient.addColorStop(1, accentLight)
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
  // 画布文字为绘制内容色(压在 accent 渐变上,须恒白保证对比度),非 UI 主题色
  context.fillStyle = '#ffffff'
  const fontSize = Math.max(12, Math.round(width / 14))
  context.font = `600 ${fontSize}px 'Segoe UI', system-ui, sans-serif`
  context.textBaseline = 'middle'
  context.fillText('Web Clipboard 示例图像', 12, height / 2)
}

watch(imageSizeValue, () => {
  drawSampleImage()
})

async function copyImage(): Promise<void> {
  const canvas = sampleCanvas.value
  if (canvas === null || !clipboardItemSupported.value) {
    imageStatus.value = {
      severity: 'Error',
      text: '当前浏览器不支持 ClipboardItem,无法写入图像格式。',
    }
    return
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
  if (blob === null) {
    imageStatus.value = { severity: 'Error', text: '画布导出 PNG 失败。' }
    return
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    imageStatus.value = { severity: 'Success', text: '图像已复制到剪贴板(image/png)。' }
  } catch (error) {
    imageStatus.value = { severity: 'Error', text: `复制失败:${describeClipboardError(error)}` }
  }
}

async function pasteImage(): Promise<void> {
  imageStatus.value = null
  if (!clipboardReadSupported.value) {
    imageStatus.value = {
      severity: 'Error',
      text: '当前浏览器不支持 clipboard.read()(多格式读取;Firefox 127+ 支持),无法读取剪贴板图像。',
    }
    return
  }
  try {
    const blob = await readClipboardByType('image')
    if (blob === null) {
      imageStatus.value = {
        severity: 'Informational',
        text: '剪贴板中没有图像格式(官方示例同款提示:Bitmap format is not available)。',
      }
      return
    }
    if (pastedImageUrl.value !== '') URL.revokeObjectURL(pastedImageUrl.value)
    pastedImageUrl.value = URL.createObjectURL(blob)
    imageStatus.value = { severity: 'Success', text: '图像已从剪贴板粘贴。' }
  } catch (error) {
    imageStatus.value = { severity: 'Error', text: `读取失败:${describeClipboardError(error)}` }
  }
}

// —— 例 5:权限状态(navigator.permissions.query;WinUI 无权限概念,Web 特有)——
type ClipboardPermissionName = 'clipboard-read' | 'clipboard-write'
type PermissionDisplay = PermissionState | 'unsupported' | 'unknown'
const PERMISSION_NAMES: ClipboardPermissionName[] = ['clipboard-read', 'clipboard-write']
const permissionStates = reactive<Record<ClipboardPermissionName, PermissionDisplay>>({
  'clipboard-read': 'unknown',
  'clipboard-write': 'unknown',
})
const permissionListeners: Array<{ status: PermissionStatus; handler: () => void }> = []

const permissionsSupported = computed(() => typeof navigator.permissions !== 'undefined')

const PERMISSION_LABELS: Record<PermissionDisplay, BilingualText> = {
  granted: { zh: '已授权(granted)', en: 'granted' },
  prompt: { zh: '询问中(prompt)', en: 'prompt' },
  denied: { zh: '已拒绝(denied)', en: 'denied' },
  unsupported: { zh: '不支持权限查询', en: 'unsupported' },
  unknown: { zh: '未知', en: 'unknown' },
}

function permissionLabel(state: PermissionDisplay): string {
  return pickText(i18n, PERMISSION_LABELS[state])
}

/** clipboard-read / clipboard-write 不在 TS PermissionName 联合内(运行时合法),双重断言绕过。 */
async function queryClipboardPermission(name: ClipboardPermissionName): Promise<void> {
  if (!permissionsSupported.value) {
    permissionStates[name] = 'unsupported'
    return
  }
  try {
    const descriptor = { name } as unknown as PermissionDescriptor
    const status = await navigator.permissions.query(descriptor)
    permissionStates[name] = status.state
    const handler = (): void => {
      permissionStates[name] = status.state
    }
    status.addEventListener('change', handler)
    permissionListeners.push({ status, handler })
  } catch {
    permissionStates[name] = 'unsupported'
  }
}

function refreshPermissions(): void {
  for (const name of PERMISSION_NAMES) {
    void queryClipboardPermission(name)
  }
}

// —— 例 6:Windows 专属能力说明(Web 无对应,对照 wiki 对照表)——
const WINDOWS_ONLY_ITEMS: BilingualText[] = [
  {
    zh: '剪贴板历史选项:SetContentWithOptions 的 IsAllowedInHistory、IsHistoryEnabled() — 历史由 Windows + Win+V 管理,页面不可控制。',
    en: 'Clipboard history options: SetContentWithOptions IsAllowedInHistory, IsHistoryEnabled() — history is OS-managed (Win+V); pages cannot control it.',
  },
  {
    zh: '剪贴板漫游选项:IsRoamable、IsRoamingEnabled() — 跨设备同步为 Windows 能力,Web 无对应。',
    en: 'Clipboard roaming options: IsRoamable, IsRoamingEnabled() — cross-device sync is a Windows capability with no Web equivalent.',
  },
  {
    zh: '复制文件:SetStorageItems / StandardDataFormats.StorageItems — Web 只能写标准 MIME,无文件引用语义。',
    en: 'Copying files: SetStorageItems / StandardDataFormats.StorageItems — the Web can only write standard MIME types, no file-reference semantics.',
  },
  {
    zh: '清空剪贴板:Clipboard.Clear() — Web 无法清空系统剪贴板。',
    en: 'Clearing the clipboard: Clipboard.Clear() — the Web cannot clear the system clipboard.',
  },
  {
    zh: '内容变更监听:Clipboard.ContentChanged — Web 无事件,仅可在 window focus 时轮询 readText 比对近似。',
    en: 'Change monitoring: Clipboard.ContentChanged — no Web event; only approximate by polling readText on window focus.',
  },
  {
    zh: '操作语义:RequestedOperation(Copy/Move/Link)与延迟渲染(SetDataProvider)— Web 剪贴板只有复制语义、写入即定格。',
    en: 'Operation semantics: RequestedOperation (Copy/Move/Link) and delayed rendering (SetDataProvider) — the Web clipboard is copy-only and written eagerly.',
  },
]

// —— 下半区固定开发文档 ——
const apiHeaders = ['Web API', '签名', '对应 WinUI 能力', '说明']
const apiRows: (string | number)[][] = [
  ['clipboard.writeText', '(data: string) => Promise<void>', 'Clipboard.SetContent + DataPackage.SetText', '写入纯文本;需页面聚焦(user activation),非安全上下文降级 execCommand'],
  ['clipboard.readText', '() => Promise<string>', 'GetContent + GetTextAsync', '读取纯文本;首次触发权限询问,被拒时抛 NotAllowedError'],
  ['clipboard.write', '(items: ClipboardItem[]) => Promise<void>', 'Clipboard.SetContent(DataPackage)', '写入格式条目;Firefox 当前仅支持 text/plain'],
  ['ClipboardItem', 'new ClipboardItem({ "text/html": blob, … })', 'DataPackage 多格式集', '单条目多 MIME(text/html + text/plain / image/png);Safari 要求值为 Promise 形式'],
  ['clipboard.read', '() => Promise<ClipboardItem[]>', 'GetContent + AvailableFormats', '多格式读取;item.types 对应 AvailableFormats,getType 取 Blob;Firefox 127+ 支持'],
  ['permissions.query', '({ name: "clipboard-read" | "clipboard-write" }) => Promise<PermissionStatus>', '—(WinUI 读写剪贴板无需权限)', '状态 granted / prompt / denied;status.onchange 可监听变化;Firefox / Safari 不支持剪贴板权限名'],
]
const eventHeaders = ['WinUI 事件', 'Web 对应', '说明']
const eventRows: (string | number)[][] = [
  ['ContentChanged', '无对应', 'Web Clipboard API 不提供内容变更事件;可在 window focus 时轮询 readText 与上次值比对近似,但有权限与功耗成本'],
]
const parityHeaders = ['WinUI 能力', 'Web 版处理']
const parityRows: (string | number)[][] = [
  ['IsAllowedInHistory / IsHistoryEnabled(剪贴板历史)', '无对应:历史由操作系统统一管理(Win+V),页面不可控制'],
  ['IsRoamable / IsRoamingEnabled(跨设备漫游)', '无对应:漫游为 Windows 系统能力'],
  ['SetStorageItems(复制文件)', '无对应:Web 只能写标准 MIME 格式;Chrome 系 web custom formats 为非标准扩展'],
  ['Clipboard.Clear()(清空剪贴板)', '无对应'],
  ['RequestedOperation(Copy / Move / Link)', '无对应:Web 剪贴板仅复制语义'],
  ['SetDataProvider(延迟渲染)', '无对应:Web 写入即生成完整数据'],
]

// 用法代码:最小可用组合(纯文本往返 + 多格式 + 权限查询)。
const usageCode = `// 复制纯文本(需用户手势触发;https / localhost 等安全上下文)
await navigator.clipboard.writeText('Hello, clipboard!')

// 读取纯文本(首次会请求权限;被拒时抛 NotAllowedError)
const text = await navigator.clipboard.readText()

// 复制多格式:富文本 + 纯文本后备(ClipboardItem 单条目多 MIME)
await navigator.clipboard.write([
  new ClipboardItem({
    'text/html': new Blob(['<b>Hello</b>'], { type: 'text/html' }),
    'text/plain': new Blob(['Hello'], { type: 'text/plain' }),
  }),
])

// 权限查询(granted / prompt / denied;onchange 可监听变化)
const status = await navigator.permissions.query({
  name: 'clipboard-read' as PermissionName,
})`

// —— 生命周期 ——
onMounted(() => {
  drawSampleImage()
  refreshPermissions()
})

onBeforeUnmount(() => {
  if (copyHideTimer !== undefined) {
    window.clearTimeout(copyHideTimer)
    copyHideTimer = undefined
  }
  for (const { status, handler } of permissionListeners) {
    status.removeEventListener('change', handler)
  }
  permissionListeners.length = 0
  if (pastedImageUrl.value !== '') URL.revokeObjectURL(pastedImageUrl.value)
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="clipboard-stage">
        <!-- 降级提示:非安全上下文 / API 不可用(对照需求:权限被拒/非安全上下文的降级 UI)-->
        <WuiInfoBar
          v-if="!clipboardAvailable || !secureContext"
          class="clipboard-example"
          :title="bannerTitle"
          :message="bannerMessage"
          severity="Warning"
          :is-open="true"
          :is-closable="false"
        />

        <!-- 例 1:复制文本(writeText)← 官方 CopyTextClipboard -->
        <section class="clipboard-example">
          <h4 class="example-title">{{ ex1Title }}</h4>
          <p class="example-note">{{ ex1Note }}</p>
          <div class="example-row">
            <WuiTextBox
              v-model:text="copyText"
              class="copy-input"
              :header="ex1InputHeader"
              :placeholder-text="ex1Placeholder"
            />
            <WuiButton :content="copyButtonLabel" @click="copyPlainText" />
          </div>
          <WuiInfoBar
            v-if="copyStatus !== null"
            class="example-status"
            :message="copyStatus.text"
            :severity="copyStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 2:粘贴文本(readText)← 官方 PasteTextClipboard -->
        <section class="clipboard-example">
          <h4 class="example-title">{{ ex2Title }}</h4>
          <p class="example-note">{{ ex2Note }}</p>
          <div class="example-row">
            <WuiButton
              :content="pasteButtonLabel"
              :disabled="!clipboardAvailable"
              @click="pastePlainText"
            />
          </div>
          <p class="paste-result">
            <span class="result-caption">{{ pasteCaption }}</span>
            <span>{{ pasteResult !== '' ? pasteResult : pastePlaceholderText }}</span>
          </p>
          <WuiInfoBar
            v-if="pasteStatus !== null"
            class="example-status"
            :message="pasteStatus.text"
            :severity="pasteStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 3:富文本复制(ClipboardItem text/html)← 官方 RichEditBox 复制链路 -->
        <section class="clipboard-example">
          <h4 class="example-title">{{ ex3Title }}</h4>
          <p class="example-note">{{ ex3Note }}</p>
          <WuiRichEditBox v-model:document="richDocument" class="rich-editor">
            <template #toolbar="{ exec, active }">
              <button
                type="button"
                class="toolbar-button"
                :class="{ 'is-active': active.bold }"
                title="粗体"
                aria-label="粗体"
                @click="exec('bold')"
              >B</button>
              <button
                type="button"
                class="toolbar-button"
                :class="{ 'is-active': active.italic }"
                title="斜体"
                aria-label="斜体"
                @click="exec('italic')"
              >I</button>
              <button
                type="button"
                class="toolbar-button"
                :class="{ 'is-active': active.underline }"
                title="下划线"
                aria-label="下划线"
                @click="exec('underline')"
              >U</button>
            </template>
          </WuiRichEditBox>
          <div class="example-row">
            <WuiButton
              :content="copyRichButtonLabel"
              :disabled="!clipboardItemSupported"
              @click="copyRichText"
            />
            <WuiButton
              :content="readHtmlButtonLabel"
              :disabled="!clipboardReadSupported"
              @click="readHtmlSource"
            />
          </div>
          <pre v-if="htmlSource !== ''" class="html-source">{{ htmlSource }}</pre>
          <WuiInfoBar
            v-if="richStatus !== null"
            class="example-status"
            :message="richStatus.text"
            :severity="richStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 4:图像复制 / 粘贴(ClipboardItem image/png)← 官方 ClipboardCopyPasteImage -->
        <section class="clipboard-example">
          <h4 class="example-title">{{ ex4Title }}</h4>
          <p class="example-note">{{ ex4Note }}</p>
          <canvas ref="sampleCanvas" class="sample-canvas" aria-hidden="true"></canvas>
          <div class="example-row">
            <WuiButton
              :content="copyImageButtonLabel"
              :disabled="!clipboardItemSupported"
              @click="copyImage"
            />
            <WuiButton
              :content="pasteImageButtonLabel"
              :disabled="!clipboardReadSupported"
              @click="pasteImage"
            />
          </div>
          <img
            v-if="pastedImageUrl !== ''"
            :src="pastedImageUrl"
            class="pasted-image"
            :alt="pastedImageAlt"
          />
          <WuiInfoBar
            v-if="imageStatus !== null"
            class="example-status"
            :message="imageStatus.text"
            :severity="imageStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 5:权限状态(navigator.permissions)← Web 特有 -->
        <section class="clipboard-example">
          <h4 class="example-title">{{ ex5Title }}</h4>
          <p class="example-note">{{ ex5Note }}</p>
          <div class="permission-list">
            <div v-for="name in PERMISSION_NAMES" :key="name" class="permission-row">
              <code class="permission-name">{{ name }}</code>
              <span class="permission-badge" :class="`is-${permissionStates[name]}`">
                {{ permissionLabel(permissionStates[name]) }}
              </span>
            </div>
          </div>
          <div class="example-row">
            <WuiButton
              :content="refreshButtonLabel"
              :disabled="!permissionsSupported"
              @click="refreshPermissions"
            />
          </div>
          <p v-if="!permissionsSupported" class="example-note">
            {{ permissionUnsupportedNote }}
          </p>
        </section>

        <!-- 例 6:Windows 专属能力说明(Web 无对应;完整对照见文档区与 wiki)-->
        <section class="clipboard-example">
          <h4 class="example-title">{{ ex6Title }}</h4>
          <p class="example-note">{{ ex6Note }}</p>
          <ul class="windows-only-list">
            <li v-for="item in WINDOWS_ONLY_ITEMS" :key="item.zh">{{ pickText(i18n, item) }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="复制文本内容" type="text" v-model="copyTextOption" />
        <DemoOptionRow
          label="成功提示自动隐藏(ms,0 = 不隐藏)"
          type="slider"
          v-model="confirmDelay"
          :min="0"
          :max="5000"
          :step="100"
        />
        <DemoOptionRow label="富文本附带 text/plain 后备" type="toggle" v-model="plainFallback" />
        <DemoOptionRow
          label="示例图像宽度(px)"
          type="slider"
          v-model="imageSize"
          :min="80"
          :max="280"
          :step="20"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsApiTitle }}</h4>
      <DemoDocsTable :headers="apiHeaders" :rows="apiRows" />
      <h4 class="docs-subtitle">{{ docsEventTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsParityTitle }}</h4>
      <DemoDocsTable :headers="parityHeaders" :rows="parityRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="ts" />
      <p class="docs-note">{{ docsNote }}</p>
    </template>
  </DemoPage>
</template>

<style scoped>
.clipboard-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 880px;
}

/* 例卡片(对应官方 ControlExample 容器) */
.clipboard-example {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
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
  align-items: flex-end;
  gap: 12px;
}

.copy-input {
  flex: 1;
  min-width: 240px;
  max-width: 460px;
}

/* 官方示例的「Clipboard:」下划线题注 + 结果行 */
.paste-result {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.result-caption {
  margin-right: 8px;
  text-decoration: underline;
  color: var(--wui-application-secondary-foreground-theme);
}

.rich-editor {
  width: 100%;
}

/* 富文本工具栏按钮(极简 B / I / U) */
.toolbar-button {
  min-width: 32px;
  padding: 3px 10px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.toolbar-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.toolbar-button:active {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.toolbar-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.toolbar-button.is-active {
  color: var(--wui-system-control-foreground-alt-high);
  background: var(--wui-toggle-switch-curtain-background-theme);
  border-color: var(--wui-system-control-transparent);
}

/* 剪贴板 HTML 原文展示(插值转义输出,无执行风险) */
.html-source {
  max-height: 180px;
  margin: 0;
  padding: 12px 16px;
  overflow: auto;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  line-height: 1.6;
  color: var(--wui-system-control-foreground-chrome-white);
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--wui-system-control-background-chrome-black-high);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.sample-canvas {
  display: block;
  max-width: 100%;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.pasted-image {
  display: block;
  width: 200px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 权限徽标(granted 强调色实底;其余中性,语义靠文字) */
.permission-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.permission-name {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

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
.permission-badge.is-unsupported,
.permission-badge.is-unknown {
  border-style: dashed;
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
