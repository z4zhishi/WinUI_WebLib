<script setup lang="ts">
// RichTextBlockPage.vue —— RichTextBlock 控件示例页
// 参数组合与示例结构对照 WinUI Gallery Samples/RichTextBlock(RichTextBlockPage.xaml):
// 示例 1 简单富文本 / 示例 2 格式化文本与超链接 / 示例 3 溢出(三栏) / 示例 4 文本高亮,
// 另附「富文本文档」综合演示与 TextBlock 对照。
import { computed, ref } from 'vue'
import WuiRichTextBlock from '@/components/RichTextBlock.vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import WuiRichTextParagraph from '@/components/richtext/RichTextParagraph.vue'
import WuiRichTextRun from '@/components/richtext/RichTextRun.vue'
import WuiRichTextBold from '@/components/richtext/RichTextBold.vue'
import WuiRichTextItalic from '@/components/richtext/RichTextItalic.vue'
import WuiRichTextUnderline from '@/components/richtext/RichTextUnderline.vue'
import WuiRichTextSpan from '@/components/richtext/RichTextSpan.vue'
import WuiRichTextHyperlink from '@/components/richtext/RichTextHyperlink.vue'
import WuiRichTextLineBreak from '@/components/richtext/RichTextLineBreak.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// WinUI 官方高亮示例(Colors.Yellow/Red/Blue)的等值色:内容级颜色,非控件皮肤
const HIGHLIGHT_COLORS: Record<string, string | undefined> = {
  None: undefined,
  Yellow: '#FFFF00',
  Red: '#FF0000',
  Blue: '#0000FF',
}

// 高亮片段的文字色:官方 TextHighlighter 只设 Background(见 CK/WinUI-Gallery/.../
// RichtextblockCustomTexthighlighting.txt),Foreground 未设 → 文字沿用主题默认前景;
// 深色主题下主题前景为白,压在纯黄高亮底上仅 1.05:1,不可读。此为 demo 内容级可读性补足:
// 按高亮底亮度取黑/白字(官方高亮色不修改、不涉及任何控件皮肤)。
// Yellow/Red 取黑字(19.6:1 / 5.25:1),Blue 取白字(8.59:1)。
const HIGHLIGHT_FOREGROUNDS: Record<string, string | undefined> = {
  None: undefined,
  Yellow: '#000000',
  Red: '#000000',
  Blue: '#FFFFFF',
}

const OFFICIAL_DOCS_URI =
  'https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.richtextblock'

// —— 可调参数(DemoOptionRow 的 v-model 契约要求联合类型)——
const fontSize = ref<string | number | boolean>(14)
const fontWeight = ref<string | number | boolean>('SemiBold')
const textAlignment = ref<string | number | boolean>('Left')
const textWrapping = ref<string | number | boolean>('Wrap')
const lineHeight = ref<string | number | boolean>(0)
const maxHeight = ref<string | number | boolean>(0)
const overflowBehavior = ref<string | number | boolean>('Clip')
const selectable = ref<string | number | boolean>(true)
const highlightColor = ref<string | number | boolean>('Yellow')

function asString(value: string | number | boolean): string {
  return typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
}

function asNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const fontSizeValue = computed(() => asNumber(fontSize.value, 14))
const fontWeightValue = computed(() => asString(fontWeight.value))
const lineHeightValue = computed(() => asNumber(lineHeight.value, 0))
// 0 表示不限高(不设 maxHeight,溢出行为随之不生效)
const maxHeightValue = computed(() => asNumber(maxHeight.value, 0))
const selectableValue = computed(() => selectable.value === true)
const highlightCss = computed(() => HIGHLIGHT_COLORS[asString(highlightColor.value)])
const highlightFg = computed(() => HIGHLIGHT_FOREGROUNDS[asString(highlightColor.value)])

const alignmentValue = computed<'Left' | 'Center' | 'Right' | 'Justify'>(() => {
  const value = asString(textAlignment.value)
  return value === 'Center' || value === 'Right' || value === 'Justify' ? value : 'Left'
})

const wrappingValue = computed(() => {
  const value = asString(textWrapping.value)
  return value === 'NoWrap' || value === 'WrapWholeWords' ? value : 'Wrap'
})

const overflowValue = computed(() => {
  const value = asString(overflowBehavior.value)
  return value === 'Scroll' || value === 'Visible' ? value : 'Clip'
})

// —— 下拉选项 ——
const weightChoices = [
  { label: 'Normal(400,Body 观感)', value: 'Normal' },
  { label: 'SemiBold(600,默认)', value: 'SemiBold' },
  { label: 'Bold(700)', value: 'Bold' },
]
const alignmentChoices = [
  { label: 'Left(左对齐,默认)', value: 'Left' },
  { label: 'Center(居中)', value: 'Center' },
  { label: 'Right(右对齐)', value: 'Right' },
  { label: 'Justify(两端对齐)', value: 'Justify' },
]
const wrappingChoices = [
  { label: 'NoWrap(不换行)', value: 'NoWrap' },
  { label: 'Wrap(自动换行,默认)', value: 'Wrap' },
  { label: 'WrapWholeWords(整词换行)', value: 'WrapWholeWords' },
]
const overflowChoices = [
  { label: 'Clip(裁剪,默认)', value: 'Clip' },
  { label: 'Scroll(容器内滚动)', value: 'Scroll' },
  { label: 'Visible(溢出显示)', value: 'Visible' },
]
const highlightChoices = [
  { label: 'Yellow(官方示例默认)', value: 'Yellow' },
  { label: 'Red', value: 'Red' },
  { label: 'Blue', value: 'Blue' },
  { label: 'None(无高亮)', value: 'None' },
]

// —— 示例 3(溢出对照)的长文,取自官方示例 Duis sed nulla 段落 ——
const OVERFLOW_LONG_TEXT = [
  'Duis sed nulla metus, id hendrerit velit. Curabitur dolor purus, bibendum eu cursus lacinia,',
  'interdum vel augue. Aenean euismod eros et sapien vehicula dictum. Duis ullamcorper, turpis nec',
  'feugiat tincidunt, dui erat luctus risus, aliquam accumsan lacus est vel quam. Nunc lacus massa,',
  'varius eget accumsan id, congue sed orci. Duis dignissim hendrerit egestas. Proin ut turpis magna,',
  'sit amet porta erat. Nunc semper metus nec magna imperdiet nec vestibulum dui fringilla. Sed sed',
  'ante libero, nec porttitor mi. Ut luctus, neque vitae placerat egestas, urna leo auctor magna, sit',
  'amet ultricies ipsum felis quis sapien. Proin eleifend varius dui, at vestibulum nunc consectetur',
  'nec. Mauris nulla elit, ultrices a sodales non, aliquam ac est. Quisque sit amet risus nulla.',
  'Quisque vestibulum posuere velit, vitae vestibulum eros scelerisque sit amet. In in risus est, at',
  'laoreet dolor. Nullam aliquet pellentesque convallis. Ut vel tincidunt nulla. Mauris auctor',
  'tincidunt auctor. Aenean orci ante, vulputate ac sagittis sit amet, consequat at mi. Morbi',
  'elementum purus consectetur nisi adipiscing vitae blandit sapien placerat. Aliquam adipiscing',
  'tortor non sem lobortis consectetur mattis felis rhoncus. Nunc eu nunc rhoncus arcu sollicitudin',
  'ultrices. In vulputate eros in mauris aliquam id dignissim nisl laoreet.',
].join(' ')

// —— 下半区固定开发文档 ——
const propertyHeaders = ['属性', '类型', '默认值', '说明']
const propertyRows: (string | number)[][] = [
  ['fontSize', 'number | string', '14', '字号;数字按 px(BaseRichTextBlockStyle)'],
  ['fontWeight', 'string | number', 'SemiBold(600)', '字重;Body 观感传 Normal(BaseRichTextBlockStyle 默认 SemiBold)'],
  ['fontFamily', 'string', 'XamlAutoFontFamily 占位', '字体族;原样作为 CSS font-family'],
  ['foreground', 'string', '主题前景 token', '前景色;任意 CSS 颜色或 --wui-* 变量'],
  ['textAlignment', "'Left' | 'Center' | 'Right' | 'Justify' | …", 'Left', '容器级文本对齐;段落可用 Paragraph 的 textAlignment 覆写'],
  ['textWrapping', "'NoWrap' | 'Wrap' | 'WrapWholeWords'", 'Wrap', '换行模式(BaseRichTextBlockStyle 为 Wrap)'],
  ['lineHeight', 'number | string', 'CSS normal', '容器级行高;Paragraph 可再覆写'],
  ['isTextSelectionEnabled', 'boolean', 'true', '是否允许选择文本(富文本默认可选择)'],
  ['maxHeight', 'number | string', '不限', '容器高度上限;溢出简化的载体(见 wiki 溢出模型)'],
  ['overflowBehavior', "'Visible' | 'Scroll' | 'Clip'", 'Clip', '超高内容处理:滚动 / 裁剪 / 溢出显示'],
]
const modelHeaders = ['子组件', '对应 XAML', '渲染', '说明']
const modelRows: (string | number)[][] = [
  ['WuiRichTextParagraph', 'Paragraph(块)', '<p>', '段落;props:textIndent / lineHeight / margin / textAlignment'],
  ['WuiRichTextRun', 'Run(行内)', '<span>', '字符格式片段;props:text / fontWeight / fontStyle / foreground / highlight 等'],
  ['WuiRichTextBold / Italic / Underline', '同名 Inline 元素', '<strong> / <em> / <u>', '语义化格式包装,slot 承载文字'],
  ['WuiRichTextSpan', 'Span(行内容器)', '<span>', '给一组行内内容统一施加字符格式'],
  ['WuiRichTextHyperlink', 'Hyperlink(行内)', '<a> 或 role="link"', 'props:navigateUri / target / underline;事件:click'],
  ['WuiRichTextLineBreak', '<LineBreak />', '<br>', '段内强制换行'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['RichTextHyperlink click', 'MouseEvent | KeyboardEvent', '点击行内链接时触发;navigateUri 有值时默认导航,处理器内 event.preventDefault() 可拦截;无 navigateUri 时键盘 Enter/Space 同样触发'],
  ['—(容器无业务事件)', '—', 'RichTextBlock 为展示控件,不派发业务事件;文本选择为浏览器原生行为'],
]

// —— 用法代码随参数实时更新(默认值省略)——
const usageCode = computed(() => {
  const lines = ['<WuiRichTextBlock']
  if (fontSizeValue.value !== 14) lines.push(`  :font-size="${fontSizeValue.value}"`)
  if (fontWeightValue.value !== 'SemiBold') lines.push(`  font-weight="${fontWeightValue.value}"`)
  if (alignmentValue.value !== 'Left') lines.push(`  text-alignment="${alignmentValue.value}"`)
  if (wrappingValue.value !== 'Wrap') lines.push(`  text-wrapping="${wrappingValue.value}"`)
  if (lineHeightValue.value > 0) lines.push(`  :line-height="${lineHeightValue.value}"`)
  if (maxHeightValue.value > 0) {
    lines.push(`  :max-height="${maxHeightValue.value}"`)
    if (overflowValue.value !== 'Clip') lines.push(`  overflow-behavior="${overflowValue.value}"`)
  }
  if (!selectableValue.value) lines.push(`  :is-text-selection-enabled="false"`)
  lines.push(`>`, `  <WuiRichTextParagraph :text-indent="32" :margin="12">`, `    RichTextBlock 提供<WuiRichTextRun font-style="Italic" font-weight="Bold">格式化文本</WuiRichTextRun>与`, `    <WuiRichTextHyperlink navigate-uri="${OFFICIAL_DOCS_URI}">超链接</WuiRichTextHyperlink> 等富内容。`, `  </WuiRichTextParagraph>`, `</WuiRichTextBlock>`)
  return lines.join('\n')
})
</script>

<template>
  <DemoPage wiki="RichTextBlock"
    title="RichTextBlock"
    description="富文本展示容器:段落与行内格式按 XAML 文档模型(Paragraph/Run/Hyperlink…)组合,支持首行缩进、高亮、行内链接与溢出简化行为。"
  >
    <template #demo>
      <div class="richtext-stage">
        <!-- 交互演示:富文本文档(参数区实时调节) -->
        <WuiRichTextBlock
          class="stage-doc"
          :font-size="fontSizeValue"
          :font-weight="fontWeightValue"
          :text-alignment="alignmentValue"
          :text-wrapping="wrappingValue"
          :line-height="lineHeightValue > 0 ? lineHeightValue : undefined"
          :max-height="maxHeightValue > 0 ? maxHeightValue : undefined"
          :overflow-behavior="overflowValue"
          :is-text-selection-enabled="selectableValue"
        >
          <WuiRichTextParagraph :margin="12">
            <WuiRichTextRun :font-size="fontSizeValue + 10" font-weight="Bold">富文本文档演示</WuiRichTextRun>
          </WuiRichTextParagraph>
          <WuiRichTextParagraph :margin="16">
            <WuiRichTextRun font-size="12" foreground="var(--wui-application-secondary-foreground-theme)">
              由 Paragraph 与 Run 组成的文档 —— 对应 XAML 的 Blocks / Inline 文档模型
            </WuiRichTextRun>
          </WuiRichTextParagraph>
          <WuiRichTextParagraph :text-indent="fontSizeValue * 2" :margin="12">
            RichTextBlock 提供<WuiRichTextRun font-style="Italic" font-weight="Bold"
              >比 TextBlock 更丰富的格式化能力</WuiRichTextRun
            >:可以给任意文字片段应用<WuiRichTextUnderline>下划线</WuiRichTextUnderline>、字色、字距,也可以内嵌
            <WuiRichTextHyperlink :navigate-uri="OFFICIAL_DOCS_URI" target="_blank">官方文档链接</WuiRichTextHyperlink
            >,高亮一关键词:<WuiRichTextRun :highlight="highlightCss" :foreground="highlightFg">富文本</WuiRichTextRun>。
          </WuiRichTextParagraph>
          <WuiRichTextParagraph :text-indent="fontSizeValue * 2" :margin="12">
            段落级排版由 <WuiRichTextSpan font-weight="Bold">Paragraph</WuiRichTextSpan> 承担:首行缩进
            <WuiRichTextRun font-weight="Bold">text-indent</WuiRichTextRun>、行高 <WuiRichTextRun font-weight="Bold">lineHeight</WuiRichTextRun
            >、段后间距 <WuiRichTextRun font-weight="Bold">margin</WuiRichTextRun> 与段内对齐均可独立设置。
          </WuiRichTextParagraph>
          <WuiRichTextParagraph :margin="4">• 支持多段落与行内格式混排(加粗 / 斜体 / 下划线 / Span)</WuiRichTextParagraph>
          <WuiRichTextParagraph :margin="4">• 支持行内 Hyperlink 与点击事件、文本高亮</WuiRichTextParagraph>
          <WuiRichTextParagraph :margin="12">• 支持首行缩进、行高、对齐与溢出简化行为</WuiRichTextParagraph>
          <WuiRichTextParagraph>
            段内强制换行用 LineBreak:<WuiRichTextLineBreak />这是第二行,与上一行同属一个段落。
          </WuiRichTextParagraph>
        </WuiRichTextBlock>

        <!-- 固定示例组(对照官方 Samples/RichTextBlock) -->
        <div class="example-list">
          <div class="example-item">
            <p class="example-caption">示例 1:简单富文本(对照官方 SimpleRichtextblock)</p>
            <WuiRichTextBlock><WuiRichTextParagraph>我是一个 RichTextBlock。</WuiRichTextParagraph></WuiRichTextBlock>
          </div>

          <div class="example-item">
            <p class="example-caption">示例 2:格式化文本与超链接(对照官方示例二)</p>
            <WuiRichTextBlock font-weight="Normal">
              <WuiRichTextParagraph>
                RichTextBlock 提供支持<WuiRichTextRun font-style="Italic" font-weight="Bold">格式化文本</WuiRichTextRun>、
                <WuiRichTextHyperlink :navigate-uri="OFFICIAL_DOCS_URI">超链接</WuiRichTextHyperlink>
                与行内元素等富内容的富文本展示容器。
              </WuiRichTextParagraph>
              <WuiRichTextParagraph>RichTextBlock 还支持内置的溢出模型(本站简化,见下例与 wiki)。</WuiRichTextParagraph>
            </WuiRichTextBlock>
          </div>

          <div class="example-item">
            <p class="example-caption">
              示例 3:文本高亮(Run highlight;对照官方示例四,颜色在参数区切换)
            </p>
            <WuiRichTextBlock font-weight="Normal">
              <WuiRichTextParagraph>
                Lorem ipsum dolor sit amet,
                <WuiRichTextRun :highlight="highlightCss" :foreground="highlightFg">consectetur adipiscing</WuiRichTextRun>
                elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua
              </WuiRichTextParagraph>
            </WuiRichTextBlock>
          </div>

          <div class="example-item">
            <p class="example-caption">
              示例 4:溢出 / 多栏(对照官方示例三;Web 简化为 CSS 多栏近似,非溢出链接)
            </p>
            <div class="overflow-columns">
              <WuiRichTextBlock font-weight="Normal" text-alignment="Justify">
                <WuiRichTextParagraph>
                  Linked text containers allow text which does not fit in one element to overflow
                  into a different element on the page. Creative use of linked text containers
                  enables basic multicolumn support and other advanced page layouts.
                </WuiRichTextParagraph>
                <WuiRichTextParagraph>{{ OVERFLOW_LONG_TEXT }}</WuiRichTextParagraph>
              </WuiRichTextBlock>
            </div>
          </div>

          <div class="example-item">
            <p class="example-caption">示例 5:与 TextBlock 的分工(单格式 vs 富文本)</p>
            <div class="compare-grid">
              <div class="compare-card">
                <p class="compare-label">TextBlock —— 一段文字一套格式</p>
                <WuiTextBlock
                  font-weight="Bold"
                  text-wrapping="Wrap"
                  text="TextBlock 以轻量见长:一段文字一套格式,渲染开销低。"
                />
              </div>
              <div class="compare-card">
                <p class="compare-label">RichTextBlock —— 段内混排多种格式</p>
                <WuiRichTextBlock font-weight="Normal" text-wrapping="Wrap">
                  <WuiRichTextParagraph>
                    RichTextBlock 以文档模型见长:<WuiRichTextBold>加粗</WuiRichTextBold>、<WuiRichTextItalic>斜体</WuiRichTextItalic>、
                    <WuiRichTextUnderline>下划线</WuiRichTextUnderline>与<WuiRichTextHyperlink navigate-uri="https://learn.microsoft.com/windows/apps/design/controls/text-controls" target="_blank">链接</WuiRichTextHyperlink>可混排在同一段落。
                  </WuiRichTextParagraph>
                </WuiRichTextBlock>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="FontSize 字号" type="slider" v-model="fontSize" :min="10" :max="32" :step="1" />
        <DemoOptionRow label="FontWeight 字重" type="select" v-model="fontWeight" :options="weightChoices" />
        <DemoOptionRow label="TextAlignment 对齐" type="select" v-model="textAlignment" :options="alignmentChoices" />
        <DemoOptionRow label="TextWrapping 换行" type="select" v-model="textWrapping" :options="wrappingChoices" />
        <DemoOptionRow label="LineHeight 行高(0 默认)" type="slider" v-model="lineHeight" :min="0" :max="48" :step="1" />
        <DemoOptionRow label="MaxHeight 容器高(0 不限)" type="slider" v-model="maxHeight" :min="0" :max="320" :step="8" />
        <DemoOptionRow label="OverflowBehavior 溢出" type="select" v-model="overflowBehavior" :options="overflowChoices" />
        <DemoOptionRow label="IsTextSelectionEnabled 可选择" type="toggle" v-model="selectable" />
        <DemoOptionRow label="Highlight 高亮色(正文与示例 3)" type="select" v-model="highlightColor" :options="highlightChoices" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">容器属性</h3>
      <DemoDocsTable :headers="propertyHeaders" :rows="propertyRows" />
      <h3 class="docs-subtitle">文档模型子组件(src/components/richtext/)</h3>
      <DemoDocsTable :headers="modelHeaders" :rows="modelRows" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.richtext-stage {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
  max-width: 680px;
}

.stage-doc {
  padding: 4px;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-top: 24px;
  border-top: 1px dashed var(--wui-system-control-background-base-low);
}

.example-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.example-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 官方示例三的三栏布局在 Web 用 CSS 多栏近似(非溢出链接,见 wiki):
   300px 定高容器 + overflow hidden 承载「多栏 + 溢出裁剪」的教学意图,
   超出定高的尾部内容按 CSS 溢出裁剪(与组件 overflowBehavior=Clip 简化一致)。
   注意:组件根节点默认 overflow:hidden(overflowBehavior 缺省 Clip),在 CSS 多栏
   中会成为不可分片的整块(整块落入第一栏、向下溢出),故在此放开为 visible,
   让段落文本按栏续排。 */
.overflow-columns {
  columns: 3;
  column-gap: 24px;
  height: 300px;
  overflow: hidden;
}

.overflow-columns :deep(.wui-richtextblock) {
  overflow: visible;
}

.compare-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.compare-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.compare-label {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
