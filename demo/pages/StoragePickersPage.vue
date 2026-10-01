<script setup lang="ts">
// StoragePickersPage.vue —— 🌐 Web 替代示例页(对照 WinUI Gallery 的 StoragePickersPage.xaml)。
// StoragePickers 不是可视化控件:官方示例演示的是系统文件选择器编程
// (FileOpenPicker 单选/多选、FileSavePicker 保存、FolderPicker 选文件夹、文件缩略图)。
// Web 版不移植 WinUI 控件语义,改用浏览器 File System Access API 提供等价交互:
//   例 1 打开单个文件 + 文件信息 + 读取文本内容(showOpenFilePicker → getFile → text)
//                                                        ← 官方 PickSingleFile
//   例 2 打开多个文件(showOpenFilePicker multiple: true)  ← 官方 PickMultipleFiles
//   例 3 保存文本文件(showSaveFilePicker + createWritable,降级 Blob 下载)
//                                                        ← 官方 SaveFile
//   例 4 选择文件夹并枚举(showDirectoryPicker → values(),不支持则禁用)
//                                                        ← 官方 PickFolder(+ GetItemsAsync 等价)
//   例 5 文件信息与图像预览(File 元数据 + object URL)     ← 官方 FileThumbnail
//   例 6 Windows 专属能力说明(SuggestedStartLocation / ViewMode / CommitButtonText /
//      SuggestedFolder / StorageFile.Path / ThumbnailMode)← Web 无对应
// 安全模型差异(WinUI:用户选择即授权、可见完整路径;Web:沙箱内只有文件名、授权随页面会话)
// 完整对照表见 wiki/controls/StoragePickers.md。
// 注:TS DOM lib 未收录 show*Picker(Chromium 系 API),页内以最小本地接口 + 边界断言承载类型。
import { computed, onBeforeUnmount, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiInfoBar from '@/components/InfoBar.vue'
import WuiTextBox from '@/components/TextBox.vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— File System Access API 的最小本地类型(仅覆盖本页用到面;运行时以能力探测为准)——
interface PickerAcceptType {
  description: string
  accept: Record<string, string[]>
}

interface OpenFilePickerOptions {
  multiple?: boolean
  types?: PickerAcceptType[]
  excludeAcceptAllOption?: boolean
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: PickerAcceptType[]
  excludeAcceptAllOption?: boolean
}

interface PickerWritable {
  write(data: string | Blob | BufferSource): Promise<void>
  close(): Promise<void>
}

interface PickerFileHandle {
  kind: 'file'
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<PickerWritable>
}

interface PickerDirectoryEntry {
  kind: 'file' | 'directory'
  name: string
  getFile(): Promise<File>
  values(): AsyncIterable<PickerDirectoryEntry>
}

interface PickerDirectoryHandle {
  kind: 'directory'
  name: string
  values(): AsyncIterable<PickerDirectoryEntry>
}

type PickerCapableWindow = Window & {
  showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<PickerFileHandle[]>
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<PickerFileHandle>
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PickerDirectoryHandle>
}

const pickerWindow = window as unknown as PickerCapableWindow

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = {
  zh: '🌐 StoragePickers(存储选择器 · Web 替代示例)',
  en: '🌐 Storage pickers (Web alternative sample)',
}
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI 版示例演示现代系统文件选择器:FileOpenPicker 单选/多选文件、FileSavePicker 保存文件、FolderPicker 选择文件夹,以及文件缩略图。StoragePickers 不是可视化控件,Web 版改用浏览器 File System Access API(showOpenFilePicker / showSaveFilePicker / showDirectoryPicker)与 <input type="file"> 降级提供等价演示,并展示文件信息(名/类型/大小)、文本内容读取与图像预览。',
  en: 'The WinUI sample demonstrates modern system pickers: FileOpenPicker for single/multiple files, FileSavePicker for saving, FolderPicker for folders, plus file thumbnails. Storage pickers are not a visual control; this Web page rebuilds the equivalents with the File System Access API (showOpenFilePicker / showSaveFilePicker / showDirectoryPicker) and <input type="file"> fallbacks, showing file info (name/type/size), text content reading and image preview.',
}
const BANNER_TITLE: BilingualText = { zh: '文件访问能力受限', en: 'File access capabilities limited' }
const EX1_TITLE: BilingualText = { zh: '打开单个文件(showOpenFilePicker)', en: 'Open a single file (showOpenFilePicker)' }
const EX2_TITLE: BilingualText = { zh: '打开多个文件(multiple)', en: 'Open multiple files (multiple)' }
const EX3_TITLE: BilingualText = { zh: '保存文本文件(showSaveFilePicker)', en: 'Save a text file (showSaveFilePicker)' }
const EX4_TITLE: BilingualText = { zh: '选择文件夹并枚举(showDirectoryPicker)', en: 'Pick a folder and enumerate (showDirectoryPicker)' }
const EX5_TITLE: BilingualText = { zh: '文件信息与图像预览(File 元数据)', en: 'File info and image preview (File metadata)' }
const EX6_TITLE: BilingualText = { zh: 'Windows 专属能力(Web 无对应)', en: 'Windows-only capabilities (no Web equivalent)' }
const EX1_NOTE: BilingualText = {
  zh: '对照官方 PickSingleFile 示例:文件类型过滤在下方参数区调节(SuggestedStartLocation / ViewMode / CommitButtonText 为 Windows 专属,浏览器由系统渲染选择器并自动记住上次位置)。选择结果展示文件信息(名/类型/大小/最后修改),并可读取文本内容 —— 对应 WinUI 的 FileIO.ReadTextAsync(超过 100 KB 截断展示)。',
  en: 'Mirrors the official "Pick a single file" example: the file type filter is adjustable below (SuggestedStartLocation / ViewMode / CommitButtonText are Windows-only; browsers render the picker and remember the last location automatically). The result shows file info (name/type/size/last modified) and can read text content — the Web equivalent of FileIO.ReadTextAsync (display truncated beyond 100 KB).',
}
const EX2_NOTE: BilingualText = {
  zh: '对照官方 PickMultipleFiles 示例(multiple: true):每个选中文件单独列出信息;取消选择同官方「No files selected」处理为提示而非错误。',
  en: 'Mirrors the official "Pick multiple files" example (multiple: true): each picked file is listed with its info; cancelling maps to the official "No files selected" notice instead of an error.',
}
const EX3_NOTE: BilingualText = {
  zh: '对照官方 SaveFile 示例:类型选择(.txt / .json / .xml 勾选)与默认扩展名、建议文件名在下方参数区;写盘走 createWritable()(对应 File.WriteAllTextAsync);不支持时降级为 Blob + <a download> 浏览器下载。浏览器不返回保存路径,状态只显示文件名 —— WinUI 版会显示 StorageFile.Path 完整路径。',
  en: 'Mirrors the official "Save file" example: type choices (.txt / .json / .xml checkboxes), default extension and suggested name are below; writing goes through createWritable() (the counterpart of File.WriteAllTextAsync); unsupported browsers fall back to a Blob + <a download> download. The browser returns no path, so status shows the file name only — the WinUI version shows the full StorageFile.Path.',
}
const EX4_NOTE: BilingualText = {
  zh: '对照官方 PickFolder 示例,并扩展演示目录枚举(官方无此例,对应 StorageFolder.GetItemsAsync 的 Web 等价 values()):枚举上限在参数区调节,文件子项额外读取大小。Firefox、Safari 均未实现 showDirectoryPicker,按钮禁用并给出原因。',
  en: 'Mirrors the official "Pick folder" example and adds directory enumeration (no official counterpart; the Web equivalent of StorageFolder.GetItemsAsync is values()): the enumeration limit is adjustable below and file entries also read their size. Neither Firefox nor Safari implements showDirectoryPicker, so the button is disabled with the reason shown.',
}
const EX5_NOTE: BilingualText = {
  zh: '对照官方 FileThumbnail 示例:Windows 有系统缩略图管道(ThumbnailMode + GetThumbnailAsync),Web 无对应 —— 图像文件用 URL.createObjectURL 生成预览,其余类型显示「无预览」(同官方 No thumbnail available)。文件信息区展示元数据。',
  en: 'Mirrors the official "File thumbnail" example: Windows has a system thumbnail pipeline (ThumbnailMode + GetThumbnailAsync) with no Web counterpart — image files get a preview via URL.createObjectURL, other types show "no preview" (the official No thumbnail available). Metadata is listed beside it.',
}
const EX6_NOTE: BilingualText = {
  zh: '以下 WinUI 能力依赖操作系统选择器与文件系统,Web 平台没有对应 API,本页仅列出说明(完整对照见下方文档区与 wiki):',
  en: 'The following WinUI capabilities rely on OS pickers and the file system and have no Web API counterpart. Full mapping in the docs below and in the wiki.',
}
const OPEN_SINGLE_BUTTON: BilingualText = { zh: '打开单个文件', en: 'Open a single file' }
const OPEN_MULTI_BUTTON: BilingualText = { zh: '打开多个文件', en: 'Open multiple files' }
const READ_TEXT_BUTTON: BilingualText = { zh: '读取文本内容', en: 'Read text content' }
const SAVE_BUTTON: BilingualText = { zh: '保存文件', en: 'Save a file' }
const OPEN_DIR_BUTTON: BilingualText = { zh: '选择文件夹', en: 'Pick a folder' }
const OPEN_PREVIEW_BUTTON: BilingualText = { zh: '打开文件', en: 'Open a file' }
const CONTENT_HEADER: BilingualText = { zh: '文件内容:', en: 'File content:' }
const TEXT_PLACEHOLDER: BilingualText = { zh: '该文件不是文本(或读取失败)…', en: 'Not a text file (or read failed)…' }
const NO_FOLDER_LABEL: BilingualText = { zh: '尚未选择文件夹', en: 'No folder picked' }
const NO_PREVIEW_LABEL: BilingualText = { zh: '无预览', en: 'No preview' }
const DIR_UNSUPPORTED_NOTE: BilingualText = {
  zh: '当前浏览器不支持 showDirectoryPicker(如 Firefox、Safari):目录选择与枚举不可用,请改用 Chrome / Edge。',
  en: 'This browser has no showDirectoryPicker (e.g. Firefox or Safari): folder picking and enumeration are unavailable. Use Chrome / Edge instead.',
}
const INFO_NAME: BilingualText = { zh: '名称', en: 'Name' }
const INFO_TYPE: BilingualText = { zh: '类型', en: 'Type' }
const INFO_SIZE: BilingualText = { zh: '大小', en: 'Size' }
const INFO_MODIFIED: BilingualText = { zh: '最后修改', en: 'Last modified' }
const KIND_FOLDER: BilingualText = { zh: '文件夹', en: 'Folder' }
const COL_ENTRY_NAME: BilingualText = { zh: '名称', en: 'Name' }
const COL_ENTRY_KIND: BilingualText = { zh: '种类', en: 'Kind' }
const COL_ENTRY_SIZE: BilingualText = { zh: '大小', en: 'Size' }
const DOCS_API_TITLE: BilingualText = { zh: 'Web API 一览', en: 'Web API overview' }
const DOCS_PARITY_TITLE: BilingualText = { zh: 'Windows 专属能力对照', en: 'Windows-only capability mapping' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }
const DOCS_NOTE: BilingualText = {
  zh: '完整教学文档(WinUI Storage Pickers ↔ Web File System Access API 对照表、能力差异、安全模型、浏览器兼容矩阵)见 wiki/controls/StoragePickers.md;相关页面 Clipboard(同为系统资源访问的 Web 替代示例)。',
  en: 'Full documentation (WinUI ↔ Web mapping, capability gaps, security model, browser support matrix) in wiki/controls/StoragePickers.md; related page Clipboard (also a Web alternative for OS resource access).',
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
const ex1Note = useBilingual(i18n, EX1_NOTE)
const ex2Note = useBilingual(i18n, EX2_NOTE)
const ex3Note = useBilingual(i18n, EX3_NOTE)
const ex4Note = useBilingual(i18n, EX4_NOTE)
const ex5Note = useBilingual(i18n, EX5_NOTE)
const ex6Note = useBilingual(i18n, EX6_NOTE)
const openSingleButtonLabel = useBilingual(i18n, OPEN_SINGLE_BUTTON)
const openMultiButtonLabel = useBilingual(i18n, OPEN_MULTI_BUTTON)
const readTextButtonLabel = useBilingual(i18n, READ_TEXT_BUTTON)
const saveButtonLabel = useBilingual(i18n, SAVE_BUTTON)
const openDirButtonLabel = useBilingual(i18n, OPEN_DIR_BUTTON)
const openPreviewButtonLabel = useBilingual(i18n, OPEN_PREVIEW_BUTTON)
const contentHeader = useBilingual(i18n, CONTENT_HEADER)
const textPlaceholder = useBilingual(i18n, TEXT_PLACEHOLDER)
const noFolderLabel = useBilingual(i18n, NO_FOLDER_LABEL)
const noPreviewLabel = useBilingual(i18n, NO_PREVIEW_LABEL)
const dirUnsupportedNote = useBilingual(i18n, DIR_UNSUPPORTED_NOTE)
const docsApiTitle = useBilingual(i18n, DOCS_API_TITLE)
const docsParityTitle = useBilingual(i18n, DOCS_PARITY_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)
const docsNote = useBilingual(i18n, DOCS_NOTE)

// —— 运行环境探测(降级 UI 的依据)——
const secureContext = ref(window.isSecureContext)
const openPickerSupported = computed(() => typeof pickerWindow.showOpenFilePicker === 'function')
const savePickerSupported = computed(() => typeof pickerWindow.showSaveFilePicker === 'function')
const dirPickerSupported = computed(() => typeof pickerWindow.showDirectoryPicker === 'function')
const fsaSupported = computed(() => openPickerSupported.value && savePickerSupported.value)
const bannerVisible = computed(() => !fsaSupported.value || !secureContext.value)
const bannerMessage = computed(() => {
  const degraded =
    '打开 / 保存示例降级为 <input type="file"> 与 Blob 下载;目录枚举示例不可用(按钮禁用)。'
  if (!fsaSupported.value) {
    return secureContext.value
      ? `当前浏览器未提供 window.showOpenFilePicker 等 picker 方法(如 Firefox、Safari)。${degraded}`
      : `非安全上下文(http):浏览器不暴露 File System Access API。${degraded}`
  }
  return `非安全上下文(http):picker 调用可能被浏览器以 SecurityError 拒绝。${degraded}`
})
const openModeLabel = computed(() =>
  openPickerSupported.value ? 'window.showOpenFilePicker' : '降级:<input type="file">',
)
const saveModeLabel = computed(() =>
  savePickerSupported.value ? 'window.showSaveFilePicker' : '降级:Blob + <a download>',
)

// —— 状态提示(WinUI TextBlock 状态行 → WuiInfoBar,颜色语义由组件按档位处理)——
type AppStatusSeverity = 'Informational' | 'Success' | 'Warning' | 'Error'
interface AppStatus {
  severity: AppStatusSeverity
  text: string
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function describePickerError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError')
      return '权限被拒(NotAllowedError):picker 必须由用户手势触发,或被 Permissions-Policy 拒绝'
    if (error.name === 'SecurityError')
      return '安全拦截(SecurityError):非安全上下文或跨域 iframe 中不允许调用文件选择器'
    if (error.name === 'TypeError') return '调用参数不合法或浏览器不支持(TypeError)'
    return `${error.name}: ${error.message}`
  }
  if (error instanceof Error) return error.message
  return String(error)
}

// —— 文件信息展示(名/类型/大小/最后修改)——
interface FileInfoRow {
  label: BilingualText
  value: string
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = -1
  do {
    value /= 1024
    unitIndex += 1
  } while (value >= 1024 && unitIndex < units.length - 1)
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

function fileInfoRows(file: File): FileInfoRow[] {
  return [
    { label: INFO_NAME, value: file.name },
    { label: INFO_TYPE, value: file.type === '' ? '—' : file.type },
    { label: INFO_SIZE, value: `${formatBytes(file.size)}(${file.size.toLocaleString()} B)` },
    { label: INFO_MODIFIED, value: new Date(file.lastModified).toLocaleString() },
  ]
}

// —— 参数区(对照官方各 ControlExample.Options)——
// 文件类型过滤(官方 FileTypeComboBox:All / *.txt / images)。
const fileTypeOption = ref<string | number | boolean>('*')
const FILE_TYPE_CHOICES = [
  { label: '全部文件 (*)', value: '*' },
  { label: '文本文件 (*.txt)', value: '.txt' },
  { label: '图像文件 (*.jpg, *.png)', value: 'images' },
]

interface OpenPickerConfig {
  types?: PickerAcceptType[]
  excludeAcceptAllOption: boolean
  fallbackAccept: string
}

const openPickerConfig = computed<OpenPickerConfig>(() => {
  const value = String(fileTypeOption.value)
  if (value === '.txt') {
    return {
      types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }],
      excludeAcceptAllOption: true,
      fallbackAccept: '.txt,text/plain',
    }
  }
  if (value === 'images') {
    return {
      types: [
        {
          description: 'Images',
          accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
        },
      ],
      excludeAcceptAllOption: true,
      fallbackAccept: '.jpg,.jpeg,.png,image/jpeg,image/png',
    }
  }
  return { types: undefined, excludeAcceptAllOption: false, fallbackAccept: '' }
})

// 保存参数(官方:类型勾选 + DefaultExtensionComboBox + SuggestedFileName)。
const saveContent = ref('Hello, WinUI!')
const saveTxtChoice = ref<string | number | boolean>(true)
const saveJsonChoice = ref<string | number | boolean>(false)
const saveXmlChoice = ref<string | number | boolean>(false)
const saveDefaultExtension = ref<string | number | boolean>('.txt')
const saveSuggestedName = ref<string | number | boolean>('NewDocument')
const SAVE_EXT_CHOICES = [
  { label: '.txt', value: '.txt' },
  { label: '.json', value: '.json' },
  { label: '.xml', value: '.xml' },
]
const SAVE_MIME: Record<string, string> = {
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.xml': 'application/xml',
}

interface SavePickerConfig {
  choices: PickerAcceptType[]
  defaultExt: string
  fileName: string
}

const savePickerConfig = computed<SavePickerConfig>(() => {
  const choices: PickerAcceptType[] = []
  if (saveTxtChoice.value === true)
    choices.push({ description: 'Text Files', accept: { 'text/plain': ['.txt'] } })
  if (saveJsonChoice.value === true)
    choices.push({ description: 'JSON Files', accept: { 'application/json': ['.json'] } })
  if (saveXmlChoice.value === true)
    choices.push({ description: 'XML Files', accept: { 'application/xml': ['.xml'] } })
  const defaultExt = String(saveDefaultExtension.value)
  if (choices.length === 0) {
    // WinUI FileTypeChoices 要求至少一项;Web types 可整体省略(= 全部文件),此处按默认扩展名兜底
    const mime = SAVE_MIME[defaultExt] ?? 'application/octet-stream'
    choices.push({ description: `*${defaultExt}`, accept: { [mime]: [defaultExt] } })
  }
  const suggested = String(saveSuggestedName.value).trim() || 'NewDocument'
  const fileName = /\.[a-z0-9]+$/i.test(suggested) ? suggested : `${suggested}${defaultExt}`
  return { choices, defaultExt, fileName }
})

// 目录枚举上限(官方无此参数;Web 枚举示例的保护阈值)。
const dirLimit = ref<string | number | boolean>(20)
const dirLimitValue = computed(() => {
  const parsed = Number(dirLimit.value)
  return Number.isFinite(parsed) ? Math.min(50, Math.max(1, Math.round(parsed))) : 20
})

// —— 例 1:打开单个文件 + 读取文本内容 ——
const singleFile = ref<File | null>(null)
const singleStatus = ref<AppStatus | null>(null)
const singleLoading = ref(false)
const singleText = ref('')
const textLoading = ref(false)
const singleInfoRows = computed(() => (singleFile.value !== null ? fileInfoRows(singleFile.value) : []))

function applySingleFile(file: File, source: 'picker' | 'input'): void {
  singleFile.value = file
  singleText.value = ''
  singleStatus.value = {
    severity: 'Success',
    text:
      source === 'picker'
        ? `已选择:${file.name}(showOpenFilePicker → handle.getFile())`
        : `已选择:${file.name}(降级:<input type="file">)`,
  }
}

async function pickSingleFile(): Promise<void> {
  singleStatus.value = null
  singleText.value = ''
  const openPicker = pickerWindow.showOpenFilePicker
  if (openPicker === undefined) {
    // 降级:隐藏 <input type="file">,结果在 change 回调里处理
    openFallbackPick('single')
    return
  }
  // 对照官方示例:禁用按钮避免双击(PickSingleFileAsync 完成后恢复)
  singleLoading.value = true
  try {
    const config = openPickerConfig.value
    const handles = await openPicker({
      multiple: false,
      types: config.types,
      excludeAcceptAllOption: config.excludeAcceptAllOption,
    })
    const handle: PickerFileHandle | undefined = handles.length > 0 ? handles[0] : undefined
    if (handle === undefined) {
      singleStatus.value = { severity: 'Informational', text: '未选择文件。' }
      return
    }
    applySingleFile(await handle.getFile(), 'picker')
  } catch (error) {
    singleStatus.value = isAbortError(error)
      ? { severity: 'Informational', text: '已取消选择(用户关闭了选择器;AbortError)。' }
      : { severity: 'Error', text: `打开失败:${describePickerError(error)}` }
  } finally {
    singleLoading.value = false
  }
}

const TEXT_READ_LIMIT = 100 * 1024

async function readSingleText(): Promise<void> {
  const file = singleFile.value
  if (file === null || textLoading.value) return
  textLoading.value = true
  try {
    const looksTextual =
      file.type.startsWith('text/') ||
      file.type === 'application/json' ||
      file.type === 'application/xml' ||
      /\.(txt|md|json|xml|csv|log|js|ts|css|html|htm|yml|yaml)$/i.test(file.name)
    // 大文件截断:Blob.slice 只读前 100 KB,避免整文件解码
    const truncated = file.size > TEXT_READ_LIMIT
    const source = truncated ? file.slice(0, TEXT_READ_LIMIT) : file
    const raw = await source.text()
    singleText.value = truncated
      ? `${raw}\n…(文件过大,仅显示前 100 KB,完整大小 ${formatBytes(file.size)})`
      : raw
    singleStatus.value = looksTextual
      ? { severity: 'Success', text: `已读取文本内容:${file.name}(File.text(),对应 FileIO.ReadTextAsync)` }
      : { severity: 'Warning', text: `已读取,但该文件可能不是文本(${file.type || '未知类型'}),内容可能乱码。` }
  } catch (error) {
    singleText.value = ''
    singleStatus.value = { severity: 'Error', text: `读取失败:${describePickerError(error)}` }
  } finally {
    textLoading.value = false
  }
}

// —— 例 2:打开多个文件 ——
const multiFiles = ref<File[]>([])
const multiStatus = ref<AppStatus | null>(null)
const multiLoading = ref(false)

function applyMultiFiles(files: File[]): void {
  multiFiles.value = files
  multiStatus.value = {
    severity: 'Success',
    text: `已选择 ${files.length} 个文件。`,
  }
}

async function pickMultipleFiles(): Promise<void> {
  multiStatus.value = null
  multiFiles.value = []
  const openPicker = pickerWindow.showOpenFilePicker
  if (openPicker === undefined) {
    openFallbackPick('multi')
    return
  }
  multiLoading.value = true
  try {
    const config = openPickerConfig.value
    const handles = await openPicker({
      multiple: true,
      types: config.types,
      excludeAcceptAllOption: config.excludeAcceptAllOption,
    })
    if (handles.length === 0) {
      multiStatus.value = { severity: 'Informational', text: '未选择任何文件(官方示例:No files selected)。' }
      return
    }
    const files: File[] = []
    for (const handle of handles) {
      files.push(await handle.getFile())
    }
    applyMultiFiles(files)
  } catch (error) {
    multiStatus.value = isAbortError(error)
      ? { severity: 'Informational', text: '已取消选择(用户关闭了选择器;AbortError)。' }
      : { severity: 'Error', text: `打开失败:${describePickerError(error)}` }
  } finally {
    multiLoading.value = false
  }
}

// —— 例 3:保存文本文件 ——
const saveStatus = ref<AppStatus | null>(null)
const saveLoading = ref(false)

async function saveFile(): Promise<void> {
  if (saveLoading.value) return
  saveStatus.value = null
  const { choices, defaultExt, fileName } = savePickerConfig.value
  const savePicker = pickerWindow.showSaveFilePicker
  if (savePicker === undefined) {
    // 降级:Blob + 隐藏 <a download> 触发浏览器下载(写不了文件系统,只能落下载目录)
    const blob = new Blob([saveContent.value], {
      type: SAVE_MIME[defaultExt] ?? 'application/octet-stream',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 5000)
    saveStatus.value = {
      severity: 'Informational',
      text: `当前浏览器不支持 showSaveFilePicker,已降级为浏览器下载:${fileName}(落至下载目录,无法指定位置)。`,
    }
    return
  }
  saveLoading.value = true
  try {
    const handle = await savePicker({
      suggestedName: fileName,
      types: choices,
      excludeAcceptAllOption: false,
    })
    // 对应官方 File.WriteAllTextAsync:createWritable → write → close(关闭后原子落盘)
    const writable = await handle.createWritable()
    await writable.write(saveContent.value)
    await writable.close()
    saveStatus.value = {
      severity: 'Success',
      text: `已保存:${handle.name}(浏览器不返回完整路径;WinUI 版显示 StorageFile.Path)。`,
    }
  } catch (error) {
    saveStatus.value = isAbortError(error)
      ? { severity: 'Informational', text: '已取消保存(官方示例:File save canceled)。' }
      : { severity: 'Error', text: `保存失败:${describePickerError(error)}` }
  } finally {
    saveLoading.value = false
  }
}

// —— 例 4:选择文件夹并枚举 ——
interface DirEntryRow {
  name: string
  kind: 'file' | 'directory'
  mime: string
  size: number | null
}

const dirName = ref('')
const dirRows = ref<DirEntryRow[]>([])
const dirTruncated = ref(false)
const dirStatus = ref<AppStatus | null>(null)
const dirLoading = ref(false)

async function pickDirectory(): Promise<void> {
  const dirPicker = pickerWindow.showDirectoryPicker
  if (dirPicker === undefined || dirLoading.value) return
  dirStatus.value = null
  dirRows.value = []
  dirName.value = ''
  dirTruncated.value = false
  dirLoading.value = true
  try {
    const dir = await dirPicker({ mode: 'read' })
    dirName.value = dir.name
    const limit = dirLimitValue.value
    for await (const entry of dir.values()) {
      if (dirRows.value.length >= limit) {
        dirTruncated.value = true
        break
      }
      if (entry.kind === 'file') {
        const file = await entry.getFile()
        dirRows.value.push({
          name: entry.name,
          kind: 'file',
          mime: file.type === '' ? '' : file.type,
          size: file.size,
        })
      } else {
        dirRows.value.push({ name: entry.name, kind: 'directory', mime: '', size: null })
      }
    }
    const shown = dirRows.value.length
    dirStatus.value = {
      severity: 'Success',
      text: `已选择文件夹「${dir.name}」,列出 ${shown} 项${dirTruncated.value ? `(超出上限 ${limit},已截断)` : ''}。`,
    }
  } catch (error) {
    dirStatus.value = isAbortError(error)
      ? { severity: 'Informational', text: '已取消选择(用户关闭了选择器;AbortError)。' }
      : { severity: 'Error', text: `选择文件夹失败:${describePickerError(error)}` }
  } finally {
    dirLoading.value = false
  }
}

// —— 例 5:文件信息与图像预览(官方 FileThumbnail 的 Web 等价)——
const previewFile = ref<File | null>(null)
const previewUrl = ref('')
const previewStatus = ref<AppStatus | null>(null)
const previewLoading = ref(false)
const previewInfoRows = computed(() =>
  previewFile.value !== null ? fileInfoRows(previewFile.value) : [],
)

function applyPreviewFile(file: File): void {
  if (previewUrl.value !== '') URL.revokeObjectURL(previewUrl.value)
  previewFile.value = file
  if (file.type.startsWith('image/')) {
    previewUrl.value = URL.createObjectURL(file)
    previewStatus.value = {
      severity: 'Success',
      text: `已生成图像预览:${file.name}(URL.createObjectURL;官方示例走系统缩略图管道)。`,
    }
  } else {
    previewUrl.value = ''
    previewStatus.value = {
      severity: 'Informational',
      text: `该类型(${file.type || '未知'})没有可生成的预览 —— 官方示例同款提示:No thumbnail available。`,
    }
  }
}

async function pickPreviewFile(): Promise<void> {
  previewStatus.value = null
  const openPicker = pickerWindow.showOpenFilePicker
  if (openPicker === undefined) {
    openFallbackPick('preview')
    return
  }
  previewLoading.value = true
  try {
    const handles = await openPicker({ multiple: false })
    const handle: PickerFileHandle | undefined = handles.length > 0 ? handles[0] : undefined
    if (handle === undefined) {
      previewStatus.value = { severity: 'Informational', text: '未选择文件。' }
      return
    }
    applyPreviewFile(await handle.getFile())
  } catch (error) {
    previewStatus.value = isAbortError(error)
      ? { severity: 'Informational', text: '已取消选择(用户关闭了选择器;AbortError)。' }
      : { severity: 'Error', text: `打开失败:${describePickerError(error)}` }
  } finally {
    previewLoading.value = false
  }
}

// —— 降级通路的隐藏 <input type="file">(不支持的浏览器:打开/保存/预览共用)——
type FallbackMode = 'single' | 'multi' | 'preview'
const fallbackInput = ref<HTMLInputElement | null>(null)
let fallbackMode: FallbackMode = 'single'

function openFallbackPick(mode: FallbackMode): void {
  const input = fallbackInput.value
  if (input === null) return
  fallbackMode = mode
  input.multiple = mode === 'multi'
  input.accept = mode === 'preview' ? '' : openPickerConfig.value.fallbackAccept
  input.click()
}

async function onFallbackChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = '' // 允许重复选择同一文件
  if (files.length === 0) {
    if (fallbackMode === 'multi') {
      multiStatus.value = { severity: 'Informational', text: '未选择任何文件(官方示例:No files selected)。' }
    } else if (fallbackMode === 'preview') {
      previewStatus.value = { severity: 'Informational', text: '未选择文件。' }
    } else {
      singleStatus.value = { severity: 'Informational', text: '未选择文件。' }
    }
    return
  }
  if (fallbackMode === 'single') applySingleFile(files[0], 'input')
  else if (fallbackMode === 'multi') applyMultiFiles(files)
  else applyPreviewFile(files[0])
}

/**
 * <input type="file"> 的 cancel 事件:用户关闭了文件选择对话框而未选择
 * (Chrome 113+ / Firefox 91+ / Safari 16+;picker 原生通路的取消走 AbortError,此处补齐降级通路的对等反馈)。
 */
function onFallbackCancel(): void {
  const note: AppStatus = {
    severity: 'Informational',
    text: '已取消选择(用户关闭了文件选择对话框;input cancel 事件)。',
  }
  if (fallbackMode === 'multi') multiStatus.value = note
  else if (fallbackMode === 'preview') previewStatus.value = note
  else singleStatus.value = note
}

// —— 例 6:Windows 专属能力说明(Web 无对应,对照 wiki 对照表)——
const WINDOWS_ONLY_ITEMS: BilingualText[] = [
  {
    zh: 'SuggestedStartLocation(建议起始位置,如 Documents / Desktop):浏览器由用户与系统决定起始目录,并自动记住上次选择位置 —— 官方顶部 InfoBar 描述的行为在 Web 上同样是默认。',
    en: 'SuggestedStartLocation (Documents / Desktop, …): browsers decide the start directory themselves and remember the last pick — the behavior described in the official InfoBar is the default on the Web.',
  },
  {
    zh: 'ViewMode(List / Thumbnail 缩略图视图):选择器 UI 由浏览器 / 操作系统渲染,页面不可控制。',
    en: 'ViewMode (list / thumbnail): picker UI is rendered by the browser / OS and cannot be styled by the page.',
  },
  {
    zh: 'CommitButtonText(确认按钮文本):确认按钮文案由浏览器本地化,页面不可自定义。',
    en: 'CommitButtonText: the confirm button label is localized by the browser and not customizable.',
  },
  {
    zh: 'SuggestedFolder(建议具体文件夹路径):页面不能向系统建议任何路径 —— 路径是 Web 安全模型的边界。',
    en: 'SuggestedFolder: pages cannot suggest any file-system path — paths are the boundary of the Web security model.',
  },
  {
    zh: 'StorageFile.Path(完整文件路径):Web 只暴露文件名(File.name),句柄不含路径信息。',
    en: 'StorageFile.Path: the Web exposes only the file name (File.name); handles carry no path.',
  },
  {
    zh: '系统缩略图(ThumbnailMode + GetThumbnailAsync):Web 无系统缩略图服务,图像预览由页面自行生成(object URL / createImageBitmap),见例 5。',
    en: 'System thumbnails (ThumbnailMode + GetThumbnailAsync): no OS thumbnail service on the Web; pages generate previews themselves (object URL / createImageBitmap) — see example 5.',
  },
  {
    zh: '持久授权:WinUI 选择一次即可长期访问;Web 授权绑定页面会话,Chrome 系可把句柄存入 IndexedDB 后经 queryPermission / requestPermission 重新请求(非标准),Safari / Firefox 无对应。',
    en: 'Persistent grants: one WinUI pick lasts; Web grants are per page session. Chromium can store handles in IndexedDB and re-ask via queryPermission / requestPermission (non-standard); Safari / Firefox have no counterpart.',
  },
]

// —— 下半区固定开发文档 ——
const apiHeaders = ['Web API', '签名', '对应 WinUI 能力', '说明']
const apiRows: (string | number)[][] = [
  [
    'showOpenFilePicker',
    '(options?) => Promise<FileSystemFileHandle[]>',
    'FileOpenPicker.PickSingleFileAsync / PickMultipleFilesAsync',
    'multiple 控制单/多选;types ↔ FileTypeFilter(accept: MIME → 扩展名);返回句柄,需 getFile() 取 File;取消抛 AbortError(官方返回 null)',
  ],
  [
    'showSaveFilePicker',
    '(options?) => Promise<FileSystemFileHandle>',
    'FileSavePicker.PickSaveFileAsync',
    'suggestedName ↔ SuggestedFileName;types ↔ FileTypeChoices;至少一项 types 否则省略(全部文件)',
  ],
  [
    'handle.createWritable()',
    '() => Promise<FileSystemWritableFileStream>',
    'File.WriteAllTextAsync / StorageFile.OpenAsync',
    '写入缓冲,close() 后原子替换原文件;对应官方「文本写入已选文件」',
  ],
  [
    'showDirectoryPicker',
    '(options?) => Promise<FileSystemDirectoryHandle>',
    'FolderPicker.PickSingleFolderAsync',
    'mode: "read" | "readwrite"(WinUI 文件夹选择无写权限档位);Firefox / Safari 未实现',
  ],
  [
    'dirHandle.values()',
    '() => AsyncIterable<FileSystemHandle>',
    'StorageFolder.GetItemsAsync',
    '异步迭代子项;entry.kind 区分文件 / 文件夹,getFile() 取元数据;本页例 4 扩展演示',
  ],
  [
    'File.text() / arrayBuffer()',
    '() => Promise<string | ArrayBuffer>',
    'FileIO.ReadTextAsync / ReadBufferAsync',
    '读取选中文件内容;大文件用 slice() 分段',
  ],
  [
    'File.name / size / type / lastModified',
    'File 只读属性',
    'StorageFile.Name / FileType / 等属性',
    '文件信息展示(名/类型/大小/最后修改);浏览器不暴露完整路径',
  ],
  [
    'URL.createObjectURL(file)',
    '(file: Blob) => string',
    'GetThumbnailAsync(部分等价)',
    '图像预览生成;无系统缩略图管道,仅能整图解码,无 ThumbnailMode 档位',
  ],
]
const parityHeaders = ['WinUI 能力', 'Web 版处理']
const parityRows: (string | number)[][] = [
  ['SuggestedStartLocation(建议起始位置)', '无对应:浏览器自动记住上次位置(官方 InfoBar 所述行为成为默认)'],
  ['ViewMode(List / Thumbnail)', '无对应:选择器 UI 由浏览器 / 操作系统渲染'],
  ['CommitButtonText(确认按钮文本)', '无对应:按钮文案由浏览器本地化'],
  ['SuggestedFolder(建议文件夹路径)', '无对应:页面不能建议任何路径'],
  ['StorageFile.Path(完整路径)', '无对应:Web 只暴露文件名,路径即安全边界'],
  ['GetThumbnailAsync / ThumbnailMode', '无系统缩略图:图像文件用 URL.createObjectURL / createImageBitmap 自行生成(例 5)'],
  ['选择一次长期有效(应用生命周期)', '有限对应:授权随页面会话;Chrome 系可持久化句柄 + queryPermission / requestPermission(非标准)'],
]

// 用法代码:最小可用组合(单选 + 保存 + 目录枚举 + 降级)。
const usageCode = `// 打开单个文件(需用户手势触发;Chrome/Edge 86+;Safari 与 Firefox 均未实现,自动降级)
const [handle] = await window.showOpenFilePicker({
  types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }],
})
const file = await handle.getFile()
const text = await file.text() // 对应 FileIO.ReadTextAsync

// 打开多个文件
const handles = await window.showOpenFilePicker({ multiple: true })

// 保存文本文件(对应 FileSavePicker + File.WriteAllTextAsync)
const saveHandle = await window.showSaveFilePicker({
  suggestedName: 'NewDocument.txt',
  types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }],
})
const writable = await saveHandle.createWritable()
await writable.write('Hello, Web!')
await writable.close()

// 选择文件夹并枚举(对应 FolderPicker + StorageFolder.GetItemsAsync)
const dir = await window.showDirectoryPicker({ mode: 'read' })
for await (const entry of dir.values()) {
  console.log(entry.kind, entry.name)
}

// 不支持时降级:<input type="file">(读)与 <a download> + Blob(写)`

// —— 生命周期 ——
onBeforeUnmount(() => {
  if (previewUrl.value !== '') URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="StoragePickers">
    <template #demo>
      <div class="pickers-stage">
        <!-- 降级提示:API 不支持 / 非安全上下文(对照需求:不支持的降级 UI)-->
        <WuiInfoBar
          v-if="bannerVisible"
          class="picker-example"
          :title="bannerTitle"
          :message="bannerMessage"
          severity="Warning"
          :is-open="true"
          :is-closable="false"
        />

        <!-- 例 1:打开单个文件 + 文件信息 + 读取文本内容 ← 官方 PickSingleFile -->
        <section class="picker-example">
          <h3 class="example-title">{{ ex1Title }}</h3>
          <p class="example-note">{{ ex1Note }}</p>
          <p class="mode-line">
            <span class="mode-badge">{{ openModeLabel }}</span>
          </p>
          <div class="example-row">
            <WuiButton :content="openSingleButtonLabel" :disabled="singleLoading" @click="pickSingleFile" />
            <WuiButton
              :content="readTextButtonLabel"
              :disabled="singleFile === null || textLoading"
              @click="readSingleText"
            />
          </div>
          <dl v-if="singleFile !== null" class="file-info">
            <div v-for="row in singleInfoRows" :key="row.label.zh" class="file-info-row">
              <dt>{{ pickText(i18n, row.label) }}</dt>
              <dd>{{ row.value }}</dd>
            </div>
          </dl>
          <div class="content-block">
            <span class="content-caption">{{ contentHeader }}</span>
            <WuiTextBlock
              class="content-editor content-editor--view"
              :class="{ 'is-empty': singleText === '' }"
              :text="singleText || textPlaceholder"
              aria-label="文本文件内容"
            />
          </div>
          <WuiInfoBar
            v-if="singleStatus !== null"
            class="example-status"
            :message="singleStatus.text"
            :severity="singleStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 2:打开多个文件 ← 官方 PickMultipleFiles -->
        <section class="picker-example">
          <h3 class="example-title">{{ ex2Title }}</h3>
          <p class="example-note">{{ ex2Note }}</p>
          <div class="example-row">
            <WuiButton :content="openMultiButtonLabel" :disabled="multiLoading" @click="pickMultipleFiles" />
          </div>
          <ul v-if="multiFiles.length > 0" class="multi-list">
            <li v-for="file in multiFiles" :key="file.name + file.lastModified">
              <span class="multi-name">{{ file.name }}</span>
              <span class="multi-meta">{{ file.type === '' ? '—' : file.type }} · {{ formatBytes(file.size) }}</span>
            </li>
          </ul>
          <WuiInfoBar
            v-if="multiStatus !== null"
            class="example-status"
            :message="multiStatus.text"
            :severity="multiStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 3:保存文本文件 ← 官方 SaveFile -->
        <section class="picker-example">
          <h3 class="example-title">{{ ex3Title }}</h3>
          <p class="example-note">{{ ex3Note }}</p>
          <p class="mode-line">
            <span class="mode-badge">{{ saveModeLabel }}</span>
          </p>
          <div class="content-block">
            <span class="content-caption">{{ contentHeader }}</span>
            <WuiTextBox
              v-model:text="saveContent"
              class="content-editor content-editor--input"
              aria-label="要保存的文件内容"
            />
          </div>
          <div class="example-row">
            <WuiButton :content="saveButtonLabel" :disabled="saveLoading" @click="saveFile" />
          </div>
          <WuiInfoBar
            v-if="saveStatus !== null"
            class="example-status"
            :message="saveStatus.text"
            :severity="saveStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 4:选择文件夹并枚举 ← 官方 PickFolder(+ GetItemsAsync 等价)-->
        <section class="picker-example">
          <h3 class="example-title">{{ ex4Title }}</h3>
          <p class="example-note">{{ ex4Note }}</p>
          <div class="example-row">
            <WuiButton
              :content="openDirButtonLabel"
              :disabled="dirPickerSupported === false || dirLoading"
              @click="pickDirectory"
            />
            <span class="picked-folder">
              {{ dirName !== '' ? `📁 ${dirName}` : noFolderLabel }}
            </span>
          </div>
          <p v-if="!dirPickerSupported" class="example-note">{{ dirUnsupportedNote }}</p>
          <table v-if="dirRows.length > 0" class="dir-table">
            <thead>
              <tr>
                <th scope="col">{{ pickText(i18n, COL_ENTRY_NAME) }}</th>
                <th scope="col">{{ pickText(i18n, COL_ENTRY_KIND) }}</th>
                <th scope="col">{{ pickText(i18n, COL_ENTRY_SIZE) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in dirRows" :key="row.kind + row.name">
                <td>{{ row.name }}</td>
                <td>
                  {{ row.kind === 'directory' ? pickText(i18n, KIND_FOLDER) : row.mime === '' ? '—' : row.mime }}
                </td>
                <td>{{ row.size === null ? '—' : formatBytes(row.size) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="dirTruncated" class="example-note">
            …(超出枚举上限,已截断;可在参数区调节)
          </p>
          <WuiInfoBar
            v-if="dirStatus !== null"
            class="example-status"
            :message="dirStatus.text"
            :severity="dirStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 5:文件信息与图像预览 ← 官方 FileThumbnail -->
        <section class="picker-example">
          <h3 class="example-title">{{ ex5Title }}</h3>
          <p class="example-note">{{ ex5Note }}</p>
          <div class="preview-layout">
            <div class="preview-side">
              <div class="example-row">
                <WuiButton :content="openPreviewButtonLabel" :disabled="previewLoading" @click="pickPreviewFile" />
              </div>
              <dl v-if="previewFile !== null" class="file-info">
                <div v-for="row in previewInfoRows" :key="row.label.zh" class="file-info-row">
                  <dt>{{ pickText(i18n, row.label) }}</dt>
                  <dd>{{ row.value }}</dd>
                </div>
              </dl>
            </div>
            <div class="preview-box">
              <img
                v-if="previewUrl !== ''"
                :src="previewUrl"
                class="preview-image"
                alt="所选文件的图像预览"
              />
              <span v-else class="preview-empty">{{ noPreviewLabel }}</span>
            </div>
          </div>
          <WuiInfoBar
            v-if="previewStatus !== null"
            class="example-status"
            :message="previewStatus.text"
            :severity="previewStatus.severity"
            :is-open="true"
            :is-closable="false"
          />
        </section>

        <!-- 例 6:Windows 专属能力说明(Web 无对应;完整对照见文档区与 wiki)-->
        <section class="picker-example">
          <h3 class="example-title">{{ ex6Title }}</h3>
          <p class="example-note">{{ ex6Note }}</p>
          <ul class="windows-only-list">
            <li v-for="item in WINDOWS_ONLY_ITEMS" :key="item.zh">{{ pickText(i18n, item) }}</li>
          </ul>
        </section>

        <!-- 降级通路的隐藏文件输入(Firefox / Safari 等不支持的浏览器;cancel 反馈取消)-->
        <input
          ref="fallbackInput"
          type="file"
          class="fallback-input"
          aria-hidden="true"
          tabindex="-1"
          @change="onFallbackChange"
          @cancel="onFallbackCancel"
        />
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="文件类型过滤(例 1 / 例 2)" type="select" v-model="fileTypeOption" :options="FILE_TYPE_CHOICES" />
        <DemoOptionRow label="保存建议文件名(例 3)" type="text" v-model="saveSuggestedName" />
        <DemoOptionRow label="保存默认扩展名(例 3)" type="select" v-model="saveDefaultExtension" :options="SAVE_EXT_CHOICES" />
        <DemoOptionRow label="保存类型:文本文件 (*.txt)" type="toggle" v-model="saveTxtChoice" />
        <DemoOptionRow label="保存类型:JSON (*.json)" type="toggle" v-model="saveJsonChoice" />
        <DemoOptionRow label="保存类型:XML (*.xml)" type="toggle" v-model="saveXmlChoice" />
        <DemoOptionRow label="目录枚举上限(例 4)" type="slider" v-model="dirLimit" :min="1" :max="50" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsApiTitle }}</h3>
      <DemoDocsTable :headers="apiHeaders" :rows="apiRows" />
      <h3 class="docs-subtitle">{{ docsParityTitle }}</h3>
      <DemoDocsTable :headers="parityHeaders" :rows="parityRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="ts" />
      <p class="docs-note">{{ docsNote }}</p>
    </template>
  </DemoPage>
</template>

<style scoped>
.pickers-stage {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 880px;
}

/* 例卡片(对应官方 ControlExample 容器) */
.picker-example {
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

/* 当前生效通路徽标(picker vs 降级) */
.mode-line {
  margin: 0;
}

.mode-badge {
  display: inline-block;
  padding: 2px 10px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-foreground-alt-high);
  background: var(--wui-toggle-switch-curtain-background-theme);
  border: 1px solid var(--wui-system-control-transparent);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.example-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.picked-folder {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 文件信息(名/类型/大小/最后修改) */
.file-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.file-info-row {
  display: flex;
  gap: 12px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
}

.file-info-row dt {
  flex: 0 0 5em;
  color: var(--wui-application-secondary-foreground-theme);
}

.file-info-row dd {
  flex: 1;
  margin: 0;
  color: var(--wui-application-foreground-theme);
  word-break: break-all;
}

/* 内容区(读取文本 / 保存文本):原生 textarea + token(官方多行 TextBox 的 Web 等价) */
.content-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.content-caption {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 文件内容预览:WuiTextBlock 多行展示(空态显示占位文案);保存内容:WuiTextBox 输入 */
.content-editor {
  width: 100%;
}

.content-editor--view {
  min-height: 96px;
  padding: 8px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  color: var(--wui-text-control-foreground);
  background: var(--wui-text-control-background);
  border: 2px solid var(--wui-text-control-border);
  border-radius: var(--wui-control-corner-radius);
}

.content-editor--view.is-empty {
  color: var(--wui-application-secondary-foreground-theme);
}

.content-editor--input {
  min-width: 0;
}

.content-editor:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: -1px;
}

/* 多文件结果列表 */
.multi-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-left: 20px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.multi-name {
  margin-right: 8px;
  font-weight: 600;
}

.multi-meta {
  color: var(--wui-application-secondary-foreground-theme);
}

/* 目录枚举表 */
.dir-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.dir-table th,
.dir-table td {
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
  color: var(--wui-application-foreground-theme);
  word-break: break-all;
}

.dir-table th {
  color: var(--wui-application-secondary-foreground-theme);
  font-weight: 600;
}

.dir-table tbody tr:last-child td {
  border-bottom-color: var(--wui-system-control-transparent);
}

/* 预览区(对照官方 160×160 Border + Image) */
.preview-layout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
}

.preview-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-width: 240px;
}

.preview-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 160px;
  height: 160px;
  flex: 0 0 auto;
  /* 官方 SubtleFillColorTertiaryBrush 无对应 token,取最近似的 chrome-medium-low 中性面 */
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.preview-empty {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
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

/* 降级通路:视觉隐藏但可编程触发 click */
.fallback-input {
  position: fixed;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
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
