<script setup lang="ts">
// RichEditBox.vue —— WinUI RichEditBox 的 Web 复刻(contentEditable 富文本编辑器)。
// 视觉与状态对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 的
// <Style TargetType="RichEditBox">(L20047 起):四态颜色与 TextBox 家族共用
// TextControl* 画刷族,Header 用 RichEditBoxTopHeaderMargin = 0,0,0,4;
// PlaceholderTextContentPresenter 是模板内独立 TextBlock(非 input 占位),Web 侧用
// 绝对定位覆盖层复刻;ContentElement 是 ScrollViewer,Web 侧以 contentEditable div
// + overflow-y:auto 等价。
// 文档模型选型:document 为 HTML 字符串(defineModel)。contentEditable 天然产出 HTML,
// innerHTML 序列化往返保真;结构化对象(段落/行内树)需双向转换器,收益不抵成本,
// 取舍记录见 wiki/controls/RichEditBox.md「文档模型选型」。
// XSS 契约:document 中的 HTML 视为「受信内容」,组件不做消毒;外部输入必须先经
// DOMPurify 之类 sanitizer(wiki「XSS 安全说明」节有强警示与建议)。
import { computed, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue'

defineOptions({ name: 'WuiRichEditBox', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 编辑器上方标头文本(WinUI Header)。 */
    header?: string
    /** 空内容时显示的占位文本(WinUI PlaceholderText)。 */
    placeholderText?: string
    /** 只读:内容不可编辑但可选择复制(WinUI IsReadOnly)。 */
    isReadOnly?: boolean
    /** 拼写检查(WinUI IsSpellCheckEnabled 默认 true → contentEditable 原生拼写检查)。 */
    spellcheck?: boolean
    /** 是否启用清除按钮(项目 TextBox 家族语义;WinUI RichEditBox 无此按钮,差异见 wiki)。 */
    clearButtonEnabled?: boolean
    /** textChanged 防抖毫秒数;0 表示立即触发(WinUI TextChanged 为逐次即时,此处按项目约定防抖)。 */
    textChangedDelay?: number
    /** 禁用态,样式对照 Disabled 视觉状态。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    placeholderText: '',
    isReadOnly: false,
    spellcheck: true,
    clearButtonEnabled: true,
    textChangedDelay: 300,
    disabled: false,
  },
)

/** 富文本文档,HTML 字符串,支持 v-model:document(WinUI Document 的 Web 简化,见 wiki)。 */
const documentModel = defineModel<string>('document', { default: '' })

/** WinUI TextChanged:文档内容变化时触发,参数为当前 HTML 字符串(默认防抖)。 */
const emit = defineEmits<{
  (e: 'textChanged', value: string): void
}>()

const editorId = useId()
const headerId = useId()
const editorEl = ref<HTMLDivElement | null>(null)

// —— 焦点 / IME 组合 / 空内容状态 ——
const focused = ref(false)
const composing = ref(false)
const isEmpty = ref(true)

// —— document 同步策略 ——
// lastSynced:DOM 当前已反映的值。内部输入回写 model 时同步推进,避免 watcher 把
// 刚输入的值回灌 DOM 导致光标/选区重置;与 lastSynced 不同的模型写入视为外部赋值。
let lastSynced: string | null = null
// textChanged 防抖窗口内待发的值;外部赋值会取消它(程序化写入不触发 textChanged)。
let pendingValue: string | undefined
let debounceTimer: number | undefined

/** 空内容判定:仅空白/ZWSP/nbsp 视为空;含图片、表格等无文本节点也视为非空。 */
function syncEmpty(): void {
  const el = editorEl.value
  if (!el) {
    isEmpty.value = true
    return
  }
  const text = (el.textContent ?? '').replace(/\u200B/g, '').replace(/\u00A0/g, ' ').trim()
  isEmpty.value = text === '' && el.querySelector('img,video,audio,iframe,table,svg,hr') === null
}

/** 外部(程序化)写入:整体替换 DOM,取消待发的 textChanged(与 TextBox 家族一致)。 */
function applyExternal(value: string): void {
  const el = editorEl.value
  if (!el) return
  el.innerHTML = value
  lastSynced = value
  syncEmpty()
  if (debounceTimer !== undefined) {
    window.clearTimeout(debounceTimer)
    debounceTimer = undefined
  }
  pendingValue = undefined
}

watch(
  documentModel,
  (value) => {
    if (value === lastSynced) return
    applyExternal(value)
  },
)

onMounted(() => {
  const el = editorEl.value
  if (el && documentModel.value !== el.innerHTML) {
    applyExternal(documentModel.value)
  }
  syncEmpty()
  document.addEventListener('selectionchange', onSelectionChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
  flushNotify()
})

// —— textChanged(防抖)——
function scheduleNotify(value: string): void {
  pendingValue = value
  if (props.textChangedDelay <= 0) {
    flushNotify()
    return
  }
  if (debounceTimer !== undefined) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(flushNotify, props.textChangedDelay)
}

function flushNotify(): void {
  if (debounceTimer !== undefined) {
    window.clearTimeout(debounceTimer)
    debounceTimer = undefined
  }
  if (pendingValue === undefined) return
  const value = pendingValue
  pendingValue = undefined
  emit('textChanged', value)
}

/** 把编辑器当前 innerHTML 同步到 model(内部输入路径,不回灌 DOM)。 */
function syncFromEditor(): void {
  const el = editorEl.value
  if (!el) return
  const html = el.innerHTML
  lastSynced = html
  documentModel.value = html
  syncEmpty()
  // 项目约定:IME 组合期间 textChanged 静默,组合结束后统一补发(此处进入防抖窗口)。
  if (composing.value) return
  scheduleNotify(html)
}

function onInput(): void {
  syncFromEditor()
}

function onCompositionStart(): void {
  composing.value = true
}

function onCompositionEnd(): void {
  composing.value = false
  // 兼容 Chrome(input→compositionend)与 Safari(顺序相反):syncFromEditor 按值同步,
  // 防抖窗口合并重复值,组合结束恰好补发一次。
  syncFromEditor()
}

function onFocus(): void {
  focused.value = true
  refreshActiveStates()
}

function onBlur(): void {
  focused.value = false
  flushNotify()
}

// —— 清除按钮(TextBox 家族语义:启用 + 聚焦 + 有内容期间显示)——
const clearButtonVisible = computed(
  () =>
    props.clearButtonEnabled && !props.isReadOnly && !props.disabled && focused.value && !isEmpty.value,
)

function onClearMouseDown(event: MouseEvent): void {
  // 阻止默认聚焦转移,编辑器保持聚焦,按钮不因 blur 折叠,click 才能命中。
  event.preventDefault()
}

function onClearClick(): void {
  const el = editorEl.value
  if (el) el.innerHTML = ''
  lastSynced = ''
  documentModel.value = ''
  syncEmpty()
  // 立即以空值触发 textChanged(TextBox 清除按钮同语义),不进防抖窗口。
  pendingValue = ''
  flushNotify()
  editorEl.value?.focus()
}

// —— 工具栏命令(document.execCommand;兼容性记录见 wiki)——
/** 参与激活态跟踪的命令集合(selectionchange 时刷新)。 */
const TRACKED_COMMANDS = [
  'bold',
  'italic',
  'underline',
  'insertUnorderedList',
  'insertOrderedList',
  'justifyLeft',
  'justifyCenter',
  'justifyRight',
] as const

/** 命令激活态(粗体/斜体/列表/对齐……),工具栏按钮据此着色。 */
const activeStates = reactive<Record<string, boolean>>({})

function refreshActiveStates(): void {
  const el = editorEl.value
  if (!el || !focused.value || props.isReadOnly || props.disabled) return
  for (const command of TRACKED_COMMANDS) {
    let state = false
    try {
      state = document.queryCommandState(command)
    } catch {
      state = false
    }
    activeStates[command] = state
  }
}

function onSelectionChange(): void {
  refreshActiveStates()
}

/**
 * 执行富文本命令;命令作用于当前选区,选区丢失时先聚焦编辑器。
 * 只读 / 禁用时不响应(等价 WinUI IsReadOnly 的编辑保护)。
 */
function exec(commandId: string, value?: string): void {
  const el = editorEl.value
  if (!el || props.isReadOnly || props.disabled) return
  el.focus()
  try {
    document.execCommand(commandId, false, value)
  } catch {
    // 个别命令在部分浏览器抛错(如 Safari 早期版本),忽略不影响编辑。
  }
  syncFromEditor()
  refreshActiveStates()
}

/** 查询命令激活态(供外部工具栏;等价 document.queryCommandState)。 */
function queryState(commandId: string): boolean {
  try {
    return document.queryCommandState(commandId)
  } catch {
    return false
  }
}

function onToolbarMouseDown(event: MouseEvent): void {
  // 阻止工具栏抢焦点:编辑器保持选区与焦点(官方示例 ColorButton_Click 后重聚焦的同效做法);
  // 按钮 click 仍会正常触发。
  event.preventDefault()
}

defineExpose({
  /** 聚焦编辑器。 */
  focus: () => editorEl.value?.focus(),
  exec,
  queryState,
})

// —— 根节点状态类(Disabled 为模板视觉状态;IsReadOnly 仅供内部样式钩子) ——
const rootClass = computed(() => ({
  'is-disabled': props.disabled,
  'is-readonly': props.isReadOnly,
}))
</script>

<template>
  <div v-bind="$attrs" class="wui-rich-edit-box" :class="rootClass">
    <!-- HeaderContentPresenter:RichEditBoxTopHeaderMargin = 0,0,0,4 -->
    <span v-if="header" :id="headerId" class="wui-rich-edit-box-header">{{ header }}</span>

    <!-- 工具栏插槽:槽内按钮用 exec(commandId) 执行富文本命令,active 为命令激活态。
         容器 mousedown 捕获段阻止焦点转移,保持编辑器选区。 -->
    <div v-if="$slots.toolbar" class="wui-rich-edit-box-toolbar" @mousedown.capture="onToolbarMouseDown">
      <slot name="toolbar" :exec="exec" :query-state="queryState" :active="activeStates" />
    </div>

    <!-- BorderElement:TextControlBorderThemeThickness = 2,MinHeight 32,MinWidth 64 -->
    <div class="wui-rich-edit-box-border">
      <!-- ContentElement(ScrollViewer 的 Web 等价):contentEditable 承载富文本 -->
      <div
        :id="editorId"
        ref="editorEl"
        class="wui-rich-edit-box-editor"
        role="textbox"
        aria-multiline="true"
        :aria-labelledby="header ? headerId : undefined"
        :aria-label="!header && placeholderText ? placeholderText : undefined"
        :aria-placeholder="placeholderText || undefined"
        :aria-readonly="isReadOnly ? 'true' : undefined"
        :aria-disabled="disabled ? 'true' : undefined"
        :contenteditable="isReadOnly || disabled ? 'false' : 'true'"
        :spellcheck="spellcheck"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      ></div>

      <!-- PlaceholderTextContentPresenter:模板内独立 TextBlock,空内容时覆盖显示 -->
      <div
        v-if="placeholderText"
        v-show="isEmpty"
        class="wui-rich-edit-box-placeholder"
        aria-hidden="true"
      >
        {{ placeholderText }}
      </div>

      <!-- DeleteButton(家族扩展):glyph U+E10A,MinWidth 34,IsTabStop=False;
           WinUI RichEditBox 无清除按钮,为与 TextBox 家族一致而提供,可关。 -->
      <button
        v-if="clearButtonVisible"
        type="button"
        class="wui-rich-edit-box-delete-button"
        tabindex="-1"
        aria-hidden="true"
        @mousedown="onClearMouseDown"
        @click="onClearClick"
      >
        &#xE10A;
      </button>
    </div>
  </div>
</template>

<style scoped>
.wui-rich-edit-box {
  display: flex;
  flex-direction: column;
  min-width: 64px; /* TextControlThemeMinWidth */
}

/* —— Header(WinUI Header):字号同 ControlContentThemeFontSize —— */
.wui-rich-edit-box-header {
  margin: 0 0 4px; /* RichEditBoxTopHeaderMargin = 0,0,0,4 */
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-text-control-header-foreground);
}

/* —— 工具栏容器:槽内按钮由使用方提供,容器只负责排布与焦点保持 —— */
.wui-rich-edit-box-toolbar {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

/* —— BorderElement —— */
.wui-rich-edit-box-border {
  position: relative;
  display: flex;
  flex: 1;
  align-items: stretch;
  min-height: 32px; /* TextControlThemeMinHeight */
  background: var(--wui-text-control-background);
  border: 2px solid var(--wui-text-control-border);
}

/* 源模板无 CornerRadius 设置,默认直角;不做圆角(差异见 wiki)。 */

/* —— PointerOver:与 TextBox 家族一致 —— */
.wui-rich-edit-box:not(.is-disabled) .wui-rich-edit-box-border:not(:focus-within):hover {
  background: var(--wui-text-control-background-pointer-over);
  border-color: var(--wui-text-control-border-brush-pointer-over);
}

.wui-rich-edit-box:not(.is-disabled) .wui-rich-edit-box-border:not(:focus-within):hover .wui-rich-edit-box-editor {
  color: var(--wui-text-control-foreground-pointer-over);
}

.wui-rich-edit-box:not(.is-disabled) .wui-rich-edit-box-border:not(:focus-within):hover .wui-rich-edit-box-placeholder {
  color: var(--wui-text-control-placeholder-foreground-pointer-over);
}

/* —— Focused 状态:实底背景 + 强调色边框 —— */
.wui-rich-edit-box-border:focus-within {
  background: var(--wui-text-control-background-focused);
  border-color: var(--wui-text-control-border-brush-focused, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)));
}

.wui-rich-edit-box-border:focus-within .wui-rich-edit-box-editor {
  color: var(--wui-text-control-foreground-focused);
}

.wui-rich-edit-box-border:focus-within .wui-rich-edit-box-placeholder {
  color: var(--wui-text-control-placeholder-foreground-focused);
}

/* —— 内容元素:TextControlThemePadding = 10,3,6,6;ScrollViewer 竖向 Auto —— */
.wui-rich-edit-box-editor {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 3px 6px 6px 10px;
  overflow-y: auto;
  font-family: var(--wui-content-control-theme-font-family, inherit);
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize */
  color: var(--wui-text-control-foreground);
  caret-color: var(--wui-text-control-foreground);
  outline: none;
  /* TextWrapping = Wrap(模板 Setter) */
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

/* 选区高亮 = TextControlSelectionHighlightColor */
.wui-rich-edit-box-editor::selection {
  background: var(--wui-text-control-selection-highlight-color, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)));
}

/* —— 编辑区动态内容(contentEditable 产物,scoped 需 :deep 穿透)—— */
.wui-rich-edit-box-editor :deep(p) {
  margin: 0;
}

.wui-rich-edit-box-editor :deep(ul),
.wui-rich-edit-box-editor :deep(ol) {
  margin: 0;
  padding-left: 28px;
}

.wui-rich-edit-box-editor :deep(a) {
  color: var(--wui-hyperlink-foreground-theme);
}

/* —— 占位文本覆盖层:同内容内边距,不拦截指针 —— */
.wui-rich-edit-box-placeholder {
  position: absolute;
  inset: 0;
  z-index: 0;
  padding: 3px 6px 6px 10px;
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-control-placeholder-foreground);
  pointer-events: none;
  white-space: pre-wrap;
}

/* —— Disabled 状态 —— */
.wui-rich-edit-box.is-disabled .wui-rich-edit-box-header {
  color: var(--wui-text-control-header-foreground-disabled);
}

.wui-rich-edit-box.is-disabled .wui-rich-edit-box-border {
  background: var(--wui-text-control-background-disabled);
  border-color: var(--wui-text-control-border-brush-disabled);
}

.wui-rich-edit-box.is-disabled .wui-rich-edit-box-editor {
  color: var(--wui-text-control-foreground-disabled);
  cursor: default;
  user-select: text;
  -webkit-user-select: text;
}

.wui-rich-edit-box.is-disabled .wui-rich-edit-box-placeholder {
  color: var(--wui-text-control-placeholder-foreground-disabled);
}

/* —— 只读:保持常态配色(源模板无只读视觉状态),仅不可编辑 —— */
.wui-rich-edit-box.is-readonly .wui-rich-edit-box-editor {
  cursor: default;
}

/* —— DeleteButton:TextControlButton* 画刷族;HelperButtonThemePadding —— */
.wui-rich-edit-box-delete-button {
  position: relative;
  z-index: 2;
  flex: none;
  width: 34px; /* DeleteButton MinWidth = 34 */
  margin-right: -2px; /* HelperButtonThemePadding */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size); /* GlyphElement FontSize = 12 */
  color: var(--wui-text-control-button-foreground);
  background: var(--wui-text-control-button-background);
  border: none;
  cursor: pointer;
}

.wui-rich-edit-box-delete-button:hover {
  color: var(--wui-text-control-button-foreground-pointer-over);
  background: var(--wui-text-control-button-background-pointer-over);
}

.wui-rich-edit-box-delete-button:active {
  color: var(--wui-text-control-button-foreground-pressed);
  background: var(--wui-text-control-button-background-pressed);
}
</style>
