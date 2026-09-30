<script setup lang="ts">
// TextBlockPage.vue —— TextBlock 控件示例页(参数组合对照 WinUI Gallery Samples/TextBlock)
import { computed, ref } from 'vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— WinUI 枚举收敛(下拉值即枚举名,非法值回退默认)——
type Wrapping = 'NoWrap' | 'Wrap' | 'WrapWholeWords'
type Trimming = 'None' | 'CharacterEllipsis' | 'WordEllipsis'
type FontStyle = 'Normal' | 'Italic' | 'Oblique'

// DemoOptionRow 的 v-model 契约要求联合类型(toggle → boolean,slider → number,text/select → string)
const demoText = ref<string | number | boolean>(
  'TextBlock 是 WinUI 中用于显示少量只读文本的轻量控件:渲染开销低、排版属性丰富,可以用换行、截断与行数限制适应各种布局。',
)
const textWrapping = ref<string | number | boolean>('Wrap')
const textTrimming = ref<string | number | boolean>('None')
const maxLines = ref<string | number | boolean>(0)
const fontSize = ref<string | number | boolean>(14)
const fontWeight = ref<string | number | boolean>('Normal')
const fontStyle = ref<string | number | boolean>('Normal')
const fontFamily = ref<string | number | boolean>('default')
const foreground = ref<string | number | boolean>('default')
const selectable = ref<string | number | boolean>(false)

function asString(value: string | number | boolean): string {
  return typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
}

function asNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const textValue = computed(() => asString(demoText.value))

const wrappingValue = computed<Wrapping>(() => {
  const value = asString(textWrapping.value)
  return value === 'Wrap' || value === 'WrapWholeWords' ? value : 'NoWrap'
})

const trimmingValue = computed<Trimming>(() => {
  const value = asString(textTrimming.value)
  return value === 'CharacterEllipsis' || value === 'WordEllipsis' ? value : 'None'
})

// 0 表示不限制行数
const maxLinesValue = computed(() => Math.max(0, Math.round(asNumber(maxLines.value, 0))))

const fontSizeValue = computed(() => asNumber(fontSize.value, 14))
const fontWeightValue = computed(() => asString(fontWeight.value))

const fontStyleValue = computed<FontStyle>(() => {
  const value = asString(fontStyle.value)
  return value === 'Italic' || value === 'Oblique' ? value : 'Normal'
})

// 'default' 表示走组件默认(占位 token / 主题前景),不传该 prop
const fontFamilyValue = computed(() => {
  const value = asString(fontFamily.value)
  return value === 'default' ? undefined : value
})

const foregroundValue = computed(() => {
  const value = asString(foreground.value)
  return value === 'default' ? undefined : value
})

const selectableValue = computed(() => selectable.value === true)

// —— 下拉选项 ——
const wrappingChoices = [
  { label: 'NoWrap(不换行)', value: 'NoWrap' },
  { label: 'Wrap(自动换行)', value: 'Wrap' },
  { label: 'WrapWholeWords(整词换行)', value: 'WrapWholeWords' },
]
const trimmingChoices = [
  { label: 'None(不截断)', value: 'None' },
  { label: 'CharacterEllipsis(字符省略)', value: 'CharacterEllipsis' },
  { label: 'WordEllipsis(按词省略)', value: 'WordEllipsis' },
]
const weightChoices = [
  { label: 'Thin(100)', value: 'Thin' },
  { label: 'Light(300)', value: 'Light' },
  { label: 'SemiLight(350)', value: 'SemiLight' },
  { label: 'Normal(400)', value: 'Normal' },
  { label: 'Medium(500)', value: 'Medium' },
  { label: 'SemiBold(600)', value: 'SemiBold' },
  { label: 'Bold(700)', value: 'Bold' },
  { label: 'ExtraBold(800)', value: 'ExtraBold' },
  { label: 'Black(900)', value: 'Black' },
]
const styleChoices = [
  { label: 'Normal(常规)', value: 'Normal' },
  { label: 'Italic(斜体)', value: 'Italic' },
  { label: 'Oblique(倾斜)', value: 'Oblique' },
]
const familyChoices = [
  { label: '默认(XamlAutoFontFamily)', value: 'default' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', cursive" },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
]
const foregroundChoices = [
  { label: '默认(主题前景)', value: 'default' },
  { label: '次要文本', value: 'var(--wui-application-secondary-foreground-theme)' },
  { label: '强调色', value: 'var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))' },
  { label: '提示灰', value: 'var(--wui-system-control-foreground-chrome-gray)' },
]

// —— 下半区固定开发文档 ——
const propertyHeaders = ['属性', '类型', '默认值', '说明']
const propertyRows: (string | number)[][] = [
  ['text', 'string', "''", '显示的文本;提供默认 slot 时以 slot 内容代替(可混排行内元素)'],
  ['fontSize', 'number | string', '14', '字号;数字按 px,字符串原样作为 CSS 长度'],
  ['fontWeight', 'string | number', 'Normal(400)', '字重;WinUI 名称(Thin…ExtraBlack)或 1–950 数值'],
  ['fontFamily', 'string', 'XamlAutoFontFamily 占位', '字体族;原样作为 CSS font-family'],
  ['fontStyle', "'Normal' | 'Italic' | 'Oblique'", 'Normal', '字形'],
  ['textWrapping', "'NoWrap' | 'Wrap' | 'WrapWholeWords'", 'NoWrap', '换行模式(WinUI 属性默认 NoWrap)'],
  ['textTrimming', "'None' | 'CharacterEllipsis' | 'WordEllipsis'", 'None', '截断省略;映射 CSS text-overflow / line-clamp'],
  ['maxLines', 'number', '不限', '最大行数;-webkit-line-clamp 实现'],
  ['isTextSelectionEnabled', 'boolean', 'false', '允许选择文本(保留浏览器原生选择/复制行为)'],
  ['foreground', 'string', '主题前景 token', '前景色;任意 CSS 颜色或变量'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['—(无业务事件)', '—', 'TextBlock 为只读文本控件,不派发业务事件;isTextSelectionEnabled 开启时保留原生选择与复制行为'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射(默认值省略)。
const usageCode = computed(() => {
  const lines = [`<WuiTextBlock`, `  text="${textValue.value.replace(/"/g, '&quot;')}"`]
  if (wrappingValue.value !== 'NoWrap') lines.push(`  text-wrapping="${wrappingValue.value}"`)
  if (trimmingValue.value !== 'None') lines.push(`  text-trimming="${trimmingValue.value}"`)
  if (maxLinesValue.value >= 1) lines.push(`  :max-lines="${maxLinesValue.value}"`)
  if (fontSizeValue.value !== 14) lines.push(`  :font-size="${fontSizeValue.value}"`)
  if (fontWeightValue.value !== 'Normal') lines.push(`  font-weight="${fontWeightValue.value}"`)
  if (fontStyleValue.value !== 'Normal') lines.push(`  font-style="${fontStyleValue.value}"`)
  if (fontFamilyValue.value !== undefined) lines.push(`  font-family="${fontFamilyValue.value}"`)
  if (foregroundValue.value !== undefined) lines.push(`  foreground="${foregroundValue.value}"`)
  if (selectableValue.value) lines.push(`  is-text-selection-enabled`)
  lines.push(`/>`)
  return lines.join('\n')
})
</script>

<template>
  <DemoPage wiki="TextBlock"
    title="TextBlock"
    description="轻量的只读文本控件:调整换行、截断、行数与字体参数,观察文本排版行为。"
  >
    <template #demo>
      <div class="text-stage">
        <WuiTextBlock
          class="stage-text"
          :text="textValue"
          :text-wrapping="wrappingValue"
          :text-trimming="trimmingValue"
          :max-lines="maxLinesValue >= 1 ? maxLinesValue : undefined"
          :font-size="fontSizeValue"
          :font-weight="fontWeightValue"
          :font-style="fontStyleValue"
          :font-family="fontFamilyValue"
          :foreground="foregroundValue"
          :is-text-selection-enabled="selectableValue"
        />

        <!-- 固定示例组(对照官方 TextBlock 样例组合) -->
        <div class="example-list">
          <div class="example-item">
            <p class="example-caption">简单文本</p>
            <WuiTextBlock text="我是一个 TextBlock。" />
          </div>
          <div class="example-item">
            <p class="example-caption">应用样式(Comic Sans MS + Italic)</p>
            <WuiTextBlock
              text="我是应用了样式的 TextBlock。"
              font-family="'Comic Sans MS', cursive"
              font-style="Italic"
            />
          </div>
          <div class="example-item">
            <p class="example-caption">行内元素(默认 slot)</p>
            <WuiTextBlock>
              TextBlock 的内容不必是简单字符串,slot 里可以混排 <b>加粗</b>、<i>斜体</i>、<u>下划线</u> 与<code>代码</code>。
            </WuiTextBlock>
          </div>
          <div class="example-item">
            <p class="example-caption">多属性组合(24px / Italic / 强调色 / WrapWholeWords)</p>
            <WuiTextBlock
              text="我超级兴奋能来到这里!"
              :font-size="24"
              font-style="Italic"
              text-wrapping="WrapWholeWords"
              :foreground="'var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))'"
            />
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Text 文本" type="text" v-model="demoText" placeholder="输入展示文本" />
        <DemoOptionRow label="IsTextSelectionEnabled 可选择" type="toggle" v-model="selectable" />
        <DemoOptionRow label="TextWrapping 换行" type="select" v-model="textWrapping" :options="wrappingChoices" />
        <DemoOptionRow label="TextTrimming 截断" type="select" v-model="textTrimming" :options="trimmingChoices" />
        <DemoOptionRow label="MaxLines 行数(0 不限)" type="slider" v-model="maxLines" :min="0" :max="8" :step="1" />
        <DemoOptionRow label="FontSize 字号" type="slider" v-model="fontSize" :min="10" :max="42" :step="1" />
        <DemoOptionRow label="FontWeight 字重" type="select" v-model="fontWeight" :options="weightChoices" />
        <DemoOptionRow label="FontStyle 字形" type="select" v-model="fontStyle" :options="styleChoices" />
        <DemoOptionRow label="FontFamily 字体" type="select" v-model="fontFamily" :options="familyChoices" />
        <DemoOptionRow label="Foreground 前景" type="select" v-model="foreground" :options="foregroundChoices" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">属性</h4>
      <DemoDocsTable :headers="propertyHeaders" :rows="propertyRows" />
      <h4 class="docs-subtitle">事件</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.text-stage {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
  max-width: 680px;
}

.stage-text {
  min-height: 1.5em;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
