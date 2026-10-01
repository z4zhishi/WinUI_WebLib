<script setup lang="ts">
// RichEditBoxPage.vue —— RichEditBox 控件示例页(示例组合对照 WinUI Gallery 的 RichEditBoxPage.xaml)。
// 上半区:简单编辑器 / 标头+占位 / 只读 / 禁用 / 带工具栏的交互编辑器;
// 官方示例的 Bold/Italic/字体颜色按钮组 → 工具栏插槽 + document.execCommand 实现见交互编辑器;
// 「编辑 ↔ 展示联动」:document(HTML)经白名单 DOM 解析映射为 richtext/ 子组件,
// 由 RichTextBlock 实时渲染预览 —— 不走 v-html(避免 XSS,方法见 wiki「XSS 安全说明」)。
// 下半区:固定呈现属性、事件与用法代码。
import { computed, defineComponent, h, ref } from 'vue'
import WuiRichEditBox from '@/components/RichEditBox.vue'
import WuiRichTextBlock from '@/components/RichTextBlock.vue'
import RichTextParagraph from '@/components/richtext/RichTextParagraph.vue'
import RichTextBold from '@/components/richtext/RichTextBold.vue'
import RichTextItalic from '@/components/richtext/RichTextItalic.vue'
import RichTextUnderline from '@/components/richtext/RichTextUnderline.vue'
import RichTextSpan from '@/components/richtext/RichTextSpan.vue'
import RichTextHyperlink from '@/components/richtext/RichTextHyperlink.vue'
import RichTextLineBreak from '@/components/richtext/RichTextLineBreak.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'RichEditBox(富文本编辑框)', en: 'RichEditBox' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '使用 RichEditBox 让用户输入和编辑包含格式化文本、超链接等富内容的文档。Web 复刻以 contentEditable 承载,document 为 HTML 字符串,并提供工具栏插槽承载格式化命令;演示区含与 RichTextBlock 的实时预览联动。',
  en: 'Use a RichEditBox to enter and edit rich text documents with formatted text and hyperlinks. Backed by contentEditable, the document model is an HTML string with a toolbar slot for formatting commands; a live RichTextBlock preview is included.',
}
const PREVIEW_TITLE: BilingualText = { zh: '实时预览(RichTextBlock 渲染)', en: 'Live preview (rendered by RichTextBlock)' }
const DOCUMENT_TITLE: BilingualText = { zh: 'document(v-model 绑定值,HTML 字符串)', en: 'document (v-model value, HTML string)' }
const CHANGED_COUNT: BilingualText = { zh: 'textChanged 触发次数', en: 'textChanged fired' }
const UNIT_TIMES: BilingualText = { zh: '次', en: 'time(s)' }
const LAST_VALUE: BilingualText = { zh: '最近触发值', en: 'last value' }
const EMPTY_TEXT: BilingualText = { zh: '(空)', en: '(empty)' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const previewTitle = useBilingual(i18n, PREVIEW_TITLE)
const documentTitle = useBilingual(i18n, DOCUMENT_TITLE)
const changedCountLabel = useBilingual(i18n, CHANGED_COUNT)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const lastValueLabel = useBilingual(i18n, LAST_VALUE)
const emptyText = useBilingual(i18n, EMPTY_TEXT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例一~四(对照官方示例:Simple / Header+Placeholder / ReadOnly)——
const readonlyDocument = ref(
  '<div>WinUI Web 复刻的 RichEditBox(只读演示):支持 <b>加粗</b>、<i>斜体</i>、<u>下划线</u> 与 <font color="#0f6cbd">强调色文字</font>。</div>',
)

// —— 交互编辑器:document + 工具栏 + 事件(选项参数 ref 一律联合类型,匹配 DemoOptionRow 契约)——
const editorDocument = ref(
  '<div>在此输入富文本:试一试 <b>加粗</b>、<i>斜体</i>、<u>下划线</u>。</div><div>工具栏还支持有序 / 无序列表、对齐与字体颜色。</div>',
)
const header = ref<string | number | boolean>('你的文档:')
const placeholder = ref<string | number | boolean>('开始输入富文本…')
const readOnly = ref<string | number | boolean>(false)
const disabled = ref<string | number | boolean>(false)
const clearEnabled = ref<string | number | boolean>(true)
const delay = ref<string | number | boolean>(300)

const headerValue = computed(() => String(header.value))
const placeholderValue = computed(() => String(placeholder.value))
const isReadOnly = computed(() => readOnly.value === true)
const isDisabled = computed(() => disabled.value === true)
const clearButtonEnabled = computed(() => clearEnabled.value === true)
const delayValue = computed(() => {
  const parsed = Number(delay.value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 300
})

// —— 工具栏字体颜色(对照官方示例 ColorButton 的八色;内容色而非主题色)——
const FONT_COLORS = [
  { name: '红色', css: '#ff0000' },
  { name: '橙色', css: '#ffa500' },
  { name: '黄色', css: '#ffff00' },
  { name: '绿色', css: '#008000' },
  { name: '蓝色', css: '#0000ff' },
  { name: '靛蓝', css: '#4b0082' },
  { name: '紫罗兰', css: '#ee82ee' },
  { name: '灰色', css: '#808080' },
]

// —— textChanged 计数与最近值 ——
const changedCount = ref(0)
const lastChanged = ref('')

function onTextChanged(value: string): void {
  changedCount.value += 1
  lastChanged.value = value
}

const lastChangedShort = computed(() => {
  if (lastChanged.value === '') return '(尚无)'
  const text = lastChanged.value.length > 120 ? `${lastChanged.value.slice(0, 120)}…` : lastChanged.value
  return text
})

// ————————————————————————————————————————————————————————————
// 预览渲染:document HTML → richtext/ 子组件(白名单映射,不使用 v-html)。
// 规则:剥离 script/style/iframe 等可执行或无关节点;仅映射下列标签,
// 属性只取 href(限 http/https)与颜色/字重等样式子集,其余一律丢弃,
// 因此即使 document 未消毒,预览也不会执行任何脚本或注入属性(方法记录见 wiki)。
// ————————————————————————————————————————————————————————————

/** 颜色值白名单:hex / rgb() / 简单命名色,避免把任意串写进 CSS。 */
function isSafeColor(value: string | null): value is string {
  if (!value) return false
  return /^(#[0-9a-fA-F]{3,8}|rgba?\([^()]*\)|[a-z]+)$/i.test(value.trim())
}

interface SpanProps {
  foreground?: string
  fontWeight?: string | number
  fontStyle?: 'Normal' | 'Italic' | 'Oblique'
  textDecorations?: 'None' | 'Underline' | 'Strikethrough'
  highlight?: string
}

/** span style 属性 → RichTextSpan props(CSS 值回映射为 WinUI 枚举名)。 */
function spanPropsFromStyle(styleText: string | null): SpanProps {
  const result: SpanProps = {}
  if (!styleText) return result
  for (const declaration of styleText.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon < 0) continue
    const property = declaration.slice(0, colon).trim().toLowerCase()
    const value = declaration.slice(colon + 1).trim()
    if (value === '') continue
    if (property === 'color' && isSafeColor(value)) result.foreground = value
    else if (property === 'font-weight' && /^\d+$/.test(value)) result.fontWeight = Number(value)
    else if (property === 'font-style' && value === 'italic') result.fontStyle = 'Italic'
    else if (property === 'background-color' && isSafeColor(value)) result.highlight = value
    else if (property === 'text-decoration' || property === 'text-decoration-line') {
      if (value.includes('underline')) result.textDecorations = 'Underline'
      else if (value.includes('line-through')) result.textDecorations = 'Strikethrough'
    }
  }
  return result
}

/** 行内节点 → richtext 行内子组件(识别不了的标签只保留其中的文本)。 */
function renderInlineNodes(nodes: Node[], keyPrefix: string): (string | ReturnType<typeof h>)[] {
  const out: (string | ReturnType<typeof h>)[] = []
  nodes.forEach((node, index) => {
    const key = `${keyPrefix}-${index}`
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (text) out.push(text)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = node as Element
    const tag = element.tagName
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') return
    const children = renderInlineNodes(Array.from(element.childNodes), key)
    switch (tag) {
      case 'B':
      case 'STRONG':
        out.push(h(RichTextBold, { key }, () => children))
        break
      case 'I':
      case 'EM':
        out.push(h(RichTextItalic, { key }, () => children))
        break
      case 'U':
        out.push(h(RichTextUnderline, { key }, () => children))
        break
      case 'A': {
        // 仅接受 http/https 链接,拒绝 javascript: 等伪协议。
        const href = element.getAttribute('href') ?? ''
        const navigateUri = /^https?:\/\//i.test(href) ? href : undefined
        out.push(h(RichTextHyperlink, { key, navigateUri, target: '_blank' }, () => children))
        break
      }
      case 'BR':
        out.push(h(RichTextLineBreak, { key }))
        break
      case 'FONT': {
        // execCommand('foreColor') 在 Chromium 系产出 <font color="…">
        const color = element.getAttribute('color')
        out.push(h(RichTextSpan, { key, ...(isSafeColor(color) ? { foreground: color } : {}) }, () => children))
        break
      }
      case 'SPAN': {
        // Firefox 部分命令产出 <span style="…">
        out.push(h(RichTextSpan, { key, ...spanPropsFromStyle(element.getAttribute('style')) }, () => children))
        break
      }
      default:
        out.push(...children)
    }
  })
  return out
}

/** 块级结构 → RichTextParagraph 列表;列表映射为带符号前缀的段落(WinUI 富文本文档模型无列表元素)。 */
function renderDocument(html: string): (string | ReturnType<typeof h>)[] {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  parsed.body
    .querySelectorAll('script,style,iframe,object,embed,link,meta')
    .forEach((element) => element.remove())
  const blocks: (string | ReturnType<typeof h>)[] = []
  let inlineBuffer: Node[] = []
  let blockIndex = 0

  const flushBuffer = (): void => {
    if (inlineBuffer.length === 0) return
    const children = renderInlineNodes(inlineBuffer, `t${blockIndex}`)
    if (children.length > 0) blocks.push(h(RichTextParagraph, { key: `b${blockIndex}` }, () => children))
    inlineBuffer = []
    blockIndex += 1
  }

  Array.from(parsed.body.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node.textContent ?? '').trim() !== '') inlineBuffer.push(node)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = node as Element
    const tag = element.tagName
    if (tag === 'DIV' || tag === 'P') {
      // contentEditable 里回车通常产生 div(Chromium)或 p(Firefox/部分命令)
      flushBuffer()
      const children = renderInlineNodes(Array.from(element.childNodes), `b${blockIndex}`)
      if (children.length > 0) blocks.push(h(RichTextParagraph, { key: `b${blockIndex}` }, () => children))
      blockIndex += 1
    } else if (tag === 'UL' || tag === 'OL') {
      flushBuffer()
      Array.from(element.querySelectorAll(':scope > li')).forEach((li, index) => {
        const marker = tag === 'UL' ? '• ' : `${index + 1}. `
        const children = [marker, ...renderInlineNodes(Array.from(li.childNodes), `li${blockIndex}-${index}`)]
        blocks.push(h(RichTextParagraph, { key: `li${blockIndex}-${index}` }, () => children))
      })
      blockIndex += 1
    } else {
      // 其余块级标签按行内内容处理(近似 WinUI 文档模型的简化)
      inlineBuffer.push(node)
    }
  })
  flushBuffer()
  return blocks
}

/** 预览组件:props.html → richtext 子组件树(白名单渲染,无 v-html)。 */
const RichHtmlPreview = defineComponent({
  name: 'RichHtmlPreview',
  props: { html: { type: String, required: true } },
  setup(props) {
    return () => renderDocument(props.html)
  },
})

const previewEmpty = computed(() => {
  const text = editorDocument.value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
  return text.trim() === ''
})

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Document', 'string', "''", '富文本文档(HTML 字符串);支持 v-model:document 双向绑定(交互框实时回写)'],
  ['Header', 'string', "''", '编辑器上方的标头文本(「Header」实时调节)'],
  ['PlaceholderText', 'string', "''", '空内容时的占位文本(「占位文本」实时调节)'],
  ['IsReadOnly', 'boolean', 'false', '只读;内容不可编辑但可选择复制(开关实时调节)'],
  ['Disabled', 'boolean', 'false', '禁用;样式对照 Disabled 视觉状态(开关实时调节)'],
  ['ClearButtonEnabled', 'boolean', 'true', '聚焦且有内容期间显示行内清除按钮(TextBox 家族语义扩展,见 wiki)'],
  ['TextChangedDelay', 'number', '300', 'textChanged 防抖毫秒数;0 表示立即(滑块实时调节)'],
  ['Spellcheck', 'boolean', 'true', '拼写检查(contentEditable 原生;WinUI IsSpellCheckEnabled 默认同为 true)'],
  ['#toolbar(插槽)', 'slot', '—', '作用域插槽 { exec, queryState, active }:exec 执行富文本命令,active 为命令激活态;演示见交互编辑器工具栏'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['textChanged', '(value: string) => void', '文档内容变化时触发,参数为当前 HTML 字符串;默认 300ms 防抖(TextChangedDelay = 0 立即);IME 组合期间不触发,组合结束后触发一次;清除按钮清空时立即触发'],
]

// 用法代码:最小可用的「编辑器 + 工具栏」组合。
const usageCode = computed(
  () => `<WuiRichEditBox
  v-model:document="doc"
  header="你的文档:"
  placeholder-text="开始输入富文本…"
  :text-changed-delay="300"
  @text-changed="onTextChanged"
>
  <template #toolbar="{ exec, active }">
    <button :class="{ 'is-active': active.bold }" @click="exec('bold')">粗体</button>
    <button @click="exec('italic')">斜体</button>
    <button @click="exec('underline')">下划线</button>
    <button @click="exec('insertUnorderedList')">列表</button>
    <button @click="exec('justifyCenter')">居中</button>
    <button @click="exec('foreColor', '#c42b1c')">红色</button>
  </template>
</WuiRichEditBox>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="RichEditBox">
    <template #demo>
      <div class="rich-edit-box-stage">
        <!-- 简单 RichEditBox(官方示例 Simple text editor) -->
        <WuiRichEditBox class="stage-item" aria-label="富文本编辑器" />

        <!-- 标头 + 占位文本 -->
        <WuiRichEditBox class="stage-item" header="你的文档:" placeholder-text="开始输入富文本…" />

        <!-- 只读 + 预置内容 -->
        <WuiRichEditBox v-model:document="readonlyDocument" class="stage-item" is-read-only aria-label="只读富文本示例" />

        <!-- 禁用 -->
        <WuiRichEditBox class="stage-item" disabled placeholder-text="禁用状态" />

        <!-- 交互编辑器:工具栏 + 实时预览 + document 原文(对照官方 Custom editor 示例) -->
        <WuiRichEditBox
          v-model:document="editorDocument"
          class="interactive-editor"
          :header="headerValue"
          :placeholder-text="placeholderValue"
          :is-read-only="isReadOnly"
          :disabled="isDisabled"
          :clear-button-enabled="clearButtonEnabled"
          :text-changed-delay="delayValue"
          @text-changed="onTextChanged"
        >
          <template #toolbar="{ exec, active }">
            <button
              type="button"
              class="toolbar-button"
              :class="{ 'is-active': active.bold }"
              title="粗体 (Ctrl+B)"
              aria-label="粗体"
              @click="exec('bold')"
            >&#xE8DD;</button>
            <button
              type="button"
              class="toolbar-button"
              :class="{ 'is-active': active.italic }"
              title="斜体 (Ctrl+I)"
              aria-label="斜体"
              @click="exec('italic')"
            >&#xE8DB;</button>
            <button
              type="button"
              class="toolbar-button"
              :class="{ 'is-active': active.underline }"
              title="下划线 (Ctrl+U)"
              aria-label="下划线"
              @click="exec('underline')"
            >&#xE8DC;</button>

            <span class="toolbar-divider" aria-hidden="true"></span>

            <button
              type="button"
              class="toolbar-button"
              :class="{ 'is-active': active.insertUnorderedList }"
              title="项目符号列表"
              aria-label="项目符号列表"
              @click="exec('insertUnorderedList')"
            >&#xE8FD;</button>
            <button
              type="button"
              class="toolbar-button toolbar-button-text"
              :class="{ 'is-active': active.insertOrderedList }"
              title="编号列表"
              aria-label="编号列表"
              @click="exec('insertOrderedList')"
            >1.</button>

            <span class="toolbar-divider" aria-hidden="true"></span>

            <button
              type="button"
              class="toolbar-button"
              :class="{ 'is-active': active.justifyLeft }"
              title="左对齐"
              aria-label="左对齐"
              @click="exec('justifyLeft')"
            >&#xE8E4;</button>
            <button
              type="button"
              class="toolbar-button"
              :class="{ 'is-active': active.justifyCenter }"
              title="居中"
              aria-label="居中"
              @click="exec('justifyCenter')"
            >&#xE8E3;</button>
            <button
              type="button"
              class="toolbar-button"
              :class="{ 'is-active': active.justifyRight }"
              title="右对齐"
              aria-label="右对齐"
              @click="exec('justifyRight')"
            >&#xE8E2;</button>

            <span class="toolbar-divider" aria-hidden="true"></span>

            <!-- 字体颜色:对照官方示例的八色下拉(内容色,非主题 token) -->
            <span class="toolbar-colors" role="group" aria-label="字体颜色">
              <button
                v-for="color in FONT_COLORS"
                :key="color.css"
                type="button"
                class="toolbar-color"
                :title="color.name"
                :aria-label="`字体颜色 ${color.name}`"
                :style="{ background: color.css }"
                @click="exec('foreColor', color.css)"
              ></button>
            </span>

            <span class="toolbar-divider" aria-hidden="true"></span>

            <button
              type="button"
              class="toolbar-button toolbar-button-text"
              title="清除格式"
              aria-label="清除格式"
              @click="exec('removeFormat')"
            >清除格式</button>
          </template>
        </WuiRichEditBox>

        <!-- 编辑 ↔ 展示联动:白名单 DOM 解析 → richtext 子组件 → RichTextBlock 渲染 -->
        <div class="preview-panel">
          <p class="panel-title">{{ previewTitle }}</p>
          <div class="preview-canvas">
            <WuiRichTextBlock font-weight="Normal" :line-height="24" :max-height="220" overflow-behavior="Scroll" class="preview-content">
              <RichHtmlPreview :html="editorDocument" />
            </WuiRichTextBlock>
            <p v-if="previewEmpty" class="preview-empty">{{ emptyText }}</p>
          </div>

          <p class="panel-title">{{ documentTitle }}</p>
          <DemoCode :code="editorDocument === '' ? emptyText : editorDocument" language="html" />

          <p class="live-hint">
            {{ changedCountLabel }}:{{ changedCount }} {{ unitTimes }}
            <span class="live-hint-sep">·</span>
            {{ lastValueLabel }}:{{ lastChangedShort }}
          </p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Header" type="text" v-model="header" placeholder="标头文本" />
        <DemoOptionRow label="PlaceholderText" type="text" v-model="placeholder" placeholder="占位文本" />
        <DemoOptionRow label="IsReadOnly" type="toggle" v-model="readOnly" />
        <DemoOptionRow label="Disabled" type="toggle" v-model="disabled" />
        <DemoOptionRow label="ClearButtonEnabled" type="toggle" v-model="clearEnabled" />
        <DemoOptionRow label="TextChangedDelay(0 = 立即)" type="slider" v-model="delay" :min="0" :max="1000" :step="50" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.rich-edit-box-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
  width: 100%;
  max-width: 720px;
}

.stage-item {
  max-width: 420px;
}

/* 交互编辑器:固定高度,contentEditable 区内部滚动(ContentElement ScrollViewer 等价) */
.interactive-editor {
  height: 200px;
}

/* —— 工具栏按钮(对照官方示例:无边框透明按钮 + FontIcon glyph)—— */
.toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 16px;
  color: var(--wui-application-foreground-theme);
  background: transparent;
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.toolbar-button:hover {
  background: var(--wui-button-pointer-over-background-theme);
}

.toolbar-button:active {
  background: var(--wui-system-control-background-base-low);
}

.toolbar-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color);
  outline-offset: 1px;
}

/* 文本型按钮(编号列表 / 清除格式):正文字体而非图标字体 */
.toolbar-button-text {
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
}

/* 激活态(光标所在位置的命令状态,由 active 跟踪) */
.toolbar-button.is-active {
  color: var(--wui-system-accent-color);
  background: var(--wui-system-control-background-base-low);
}

/* 分隔线 */
.toolbar-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background: var(--wui-system-control-background-base-low);
}

/* 字体颜色色板 */
.toolbar-colors {
  display: inline-flex;
  gap: 4px;
  padding: 0 4px;
}

.toolbar-color {
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 50%;
  cursor: pointer;
}

.toolbar-color:focus-visible {
  outline: 2px solid var(--wui-system-accent-color);
  outline-offset: 1px;
}

/* —— 预览面板 —— */
.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-title {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

.preview-canvas {
  position: relative;
  min-height: 64px;
  padding: 12px 16px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.preview-empty {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-control-placeholder-foreground);
}

.live-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  word-break: break-all;
}

.live-hint-sep {
  margin: 0 6px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
