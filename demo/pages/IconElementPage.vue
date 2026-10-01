<script setup lang="ts">
// IconElement 示例页:图标族四控件(FontIcon / SymbolIcon / BitmapIcon / PathIcon)。
// 对照官方 WinUI Gallery IconElementPage(六例):位图单色化、FontIcon 指定字体、PathIcon 路径、SymbolIcon 枚举。
// 另提供 Segoe 字形全量表浏览(数据:CK IconsData.json,1533 条;简单分页,点击复制 \uXXXX 并联动上方演示)。
import { computed, ref, watch } from 'vue'
import WuiBitmapIcon from '@/components/BitmapIcon.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiPathIcon from '@/components/PathIcon.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import { SYMBOL_DEFAULT, SYMBOL_GLYPHS, SYMBOL_NAMES, symbolToGlyph, type SymbolValue } from '@/utils/symbolIcons'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { FONT_ICON_GLYPHS } from '../data/fontIconGlyphs'

// —— 演示一:FontIcon(码点/字符输入 + 字号 + 字体栈)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const fontGlyphInput = ref<string | number | boolean>('E8FB')
const fontFontSize = ref<string | number | boolean>(20)
const fontFamilyChoice = ref<string | number | boolean>('icon')

const familyChoices = [
  { label: '图标字体栈(Segoe Fluent Icons / MDL2 Assets)', value: 'icon' },
  { label: '继承正文字体(观察 tofu)', value: 'inherit' },
]

/** 码点写法归一为字符:支持 \uE8FB / U+E8FB / E8FB / 原样字符。 */
function parseGlyphInput(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/^(?:\\u|\\x|U\+|\+)?([0-9A-Fa-f]{4,6})$/)
  if (match) {
    const codePoint = Number.parseInt(match[1], 16)
    try {
      return String.fromCodePoint(codePoint)
    } catch {
      return trimmed
    }
  }
  return trimmed
}

const fontGlyphCode = computed(() => String(fontGlyphInput.value).trim().toUpperCase())
const fontGlyph = computed(() => parseGlyphInput(String(fontGlyphInput.value)))
const fontFontSizeValue = computed(() => Number(fontFontSize.value) || 20)
const fontFamilyValue = computed(() => (fontFamilyChoice.value === 'inherit' ? 'inherit' : undefined))
const selectedGlyphName = computed(
  () => FONT_ICON_GLYPHS.find((g) => g.code === fontGlyphCode.value)?.name ?? '(不在官方字形表中)',
)

// —— 演示二:SymbolIcon(全枚举下拉 + 字号)——
const symbolInput = ref<string | number | boolean>('Accept')
const symbolFontSize = ref<string | number | boolean>(20)

const symbolChoices = SYMBOL_NAMES.map((name) => ({ label: name, value: name }))

const symbolValue = computed<SymbolValue>(() => {
  const name = String(symbolInput.value)
  return symbolToGlyph(name) !== undefined ? (name as SymbolValue) : SYMBOL_DEFAULT
})
const symbolGlyphChar = computed(() => symbolToGlyph(symbolValue.value) ?? '')
const symbolFontSizeValue = computed(() => Number(symbolFontSize.value) || 20)

// —— 演示三:BitmapIcon(Src + ShowAsMonochrome + 取色 + 尺寸)——
// 官方示例用 Slices.png(多色图);演示内置等价的多色 SVG data URL,离线可用且单色化效果直观。
const DEMO_BITMAP_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">',
  '<circle cx="16" cy="24" r="12" fill="#E81123"/>',
  '<rect x="27" y="13" width="13" height="22" fill="#0078D4"/>',
  '</svg>',
].join('')
const bitmapSrc = ref(`data:image/svg+xml,${encodeURIComponent(DEMO_BITMAP_SVG)}`)
const bitmapMonochrome = ref<string | number | boolean>(true)
const bitmapForegroundChoice = ref<string | number | boolean>('currentColor')
const bitmapSize = ref<string | number | boolean>(48)

const bitmapForegroundChoices = [
  { label: '继承 currentColor', value: 'currentColor' },
  { label: '主题前景', value: 'var(--wui-application-foreground-theme)' },
  { label: '强调色', value: 'var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))' },
]

const bitmapMonochromeValue = computed(() => bitmapMonochrome.value === true)
const bitmapForegroundValue = computed(() => String(bitmapForegroundChoice.value))
const bitmapSizeValue = computed(() => Number(bitmapSize.value) || 48)

// —— 演示四:PathIcon(Data + ViewBox + 尺寸)——
// 默认值对照官方示例:<PathIcon Data="F1 M 16,12 20,2L 20,16 1,16" />(20×20 坐标系)。
const pathData = ref<string | number | boolean>('F1 M 16,12 20,2L 20,16 1,16')
const pathViewBox = ref<string | number | boolean>('0 0 20 20')
const pathSize = ref<string | number | boolean>(48)

const pathDataValue = computed(() => String(pathData.value))
const pathViewBoxValue = computed(() => String(pathViewBox.value))
const pathSizeValue = computed(() => Number(pathSize.value) || 48)

// —— 字形全表浏览(简单分页;搜索名称/码点;点击复制并联动 FontIcon/SymbolIcon 演示)——
const BROWSE_PAGE_SIZE = 96
const browseQuery = ref('')
const browsePage = ref(1)

const filteredGlyphs = computed(() => {
  const query = browseQuery.value.trim().toLowerCase()
  if (query === '') return FONT_ICON_GLYPHS
  return FONT_ICON_GLYPHS.filter(
    (glyph) => glyph.name.toLowerCase().includes(query) || glyph.code.toLowerCase().includes(query),
  )
})
const browsePageCount = computed(() => Math.max(1, Math.ceil(filteredGlyphs.value.length / BROWSE_PAGE_SIZE)))
const browsePageClamped = computed(() => Math.min(Math.max(1, browsePage.value), browsePageCount.value))
const browsedGlyphs = computed(() =>
  filteredGlyphs.value.slice(
    (browsePageClamped.value - 1) * BROWSE_PAGE_SIZE,
    browsePageClamped.value * BROWSE_PAGE_SIZE,
  ),
)

watch(browseQuery, () => {
  browsePage.value = 1
})

function browseGo(delta: number): void {
  browsePage.value = Math.min(Math.max(1, browsePageClamped.value + delta), browsePageCount.value)
}

/** 四位码点 → 字形字符(表内码点均合法,异常时回退问号占位)。 */
function toGlyphChar(code: string): string {
  try {
    return String.fromCodePoint(Number.parseInt(code, 16))
  } catch {
    return '?'
  }
}

// 字形字符 → Symbol 枚举成员(首个命中):浏览器点击联动 SymbolIcon 演示
const symbolByGlyph = (() => {
  const map = new Map<string, SymbolValue>()
  for (const name of SYMBOL_NAMES) {
    const glyph = SYMBOL_GLYPHS[name]
    if (!map.has(glyph)) map.set(glyph, name)
  }
  return map
})()

const copyHint = ref('')
let copyTimer: number | undefined

/** clipboard 优先;非安全上下文降级 execCommand(与 DemoCode 同策略)。 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  }
}

async function selectGlyph(code: string): Promise<void> {
  fontGlyphInput.value = code
  const symbolNameFound = symbolByGlyph.get(toGlyphChar(code))
  if (symbolNameFound !== undefined) symbolInput.value = symbolNameFound
  const text = `\\u${code}`
  const ok = await writeClipboard(text)
  // selectedGlyphName 在上面赋值后即指向新选中字形的官方名
  copyHint.value = ok ? `已复制 ${text}(${selectedGlyphName.value})` : `复制失败,已选中 ${code},请手动复制`
  if (copyTimer !== undefined) window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copyHint.value = ''
  }, 2000)
}

// —— 下半区固定开发文档 ——
const docsPropsTitle = '属性(按控件)'
const propsHeaders = ['属性', '类型', '默认值', '说明']
const fontIconRows: (string | number)[][] = [
  ['glyph(必填)', 'string', '—', '图标字形:单个字符或四位码点(如 E8FB);支持 \\uXXXX / U+XXXX 写法'],
  ['fontSize', 'number | string', '20', '字号;数字按 px(WinUI FontIcon 默认字号即 20)'],
  ['fontFamily', 'string', '图标字体栈 token', '缺省 "Segoe Fluent Icons","Segoe MDL2 Assets"(--wui-symbol-theme-font-family;R1:不加载网络字体)'],
  ['fontWeight', 'string | number', 'Normal(400)', '字重;WinUI 名称(Thin…ExtraBlack)或 1–950 数值'],
  ['fontStyle', "'Normal' | 'Italic' | 'Oblique'", 'Normal', '字形样式'],
  ['foreground', 'string', '继承 currentColor', '前景色;任意 CSS 颜色或变量'],
]
const symbolIconRows: (string | number)[][] = [
  ['symbol', 'SymbolValue(197 个枚举名)', "'Emoji'", 'WinUI Symbol 枚举成员名;映射表 src/utils/symbolIcons.ts(生成物);WinUI 缺省即 Emoji(57629)'],
  ['fontSize', 'number | string', '20', '字号(Web 侧扩展;WinUI 内部固定渲染 20)'],
  ['foreground', 'string', '继承 currentColor', '前景色;任意 CSS 颜色或变量'],
]
const bitmapIconRows: (string | number)[][] = [
  ['src(必填)', 'string', '—', '图片地址;位图 / SVG / data URL 均可(组件不加载任何远程资源,取值由调用方决定)'],
  ['showAsMonochrome', 'boolean', 'true', '是否单色化(WinUI ShowAsMonochrome);Web 侧 CSS mask:遮罩取图片形状,前景色填充'],
  ['foreground', 'string', '继承 currentColor', '单色化取色;任意 CSS 颜色或变量'],
]
const pathIconRows: (string | number)[][] = [
  ['data(必填)', 'string', '—', 'XAML 路径迷你语言(F0/F1 前缀可选),映射为 SVG path d;fill-rule 随前缀'],
  ['viewBox', 'string', "'0 0 20 20'", 'SVG 坐标系;与 data 的坐标范围一致(官方示例为 20×20)'],
  ['foreground', 'string', '继承 currentColor', '前景色;path fill=currentColor'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['—(无业务事件)', '—', '四种图标均为纯展示组件,不派发事件;aria-hidden 默认 true(可经 attrs 覆盖),控件语义名由宿主控件承载'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiFontIcon glyph="\\u${fontGlyphCode.value}" :font-size="${fontFontSizeValue.value}" />
<WuiSymbolIcon symbol="${symbolValue.value}" :font-size="${symbolFontSizeValue.value}" />
<WuiBitmapIcon :src="bitmapSrc" :show-as-monochrome="${bitmapMonochromeValue.value}" />
<WuiPathIcon data="${pathDataValue.value}" viewBox="${pathViewBoxValue.value}" />`,
)
</script>

<template>
  <DemoPage wiki="IconElement"
    title="IconElement"
    description="图标族基座:FontIcon(字体字形)/ SymbolIcon(Symbol 枚举)/ BitmapIcon(位图,可单色化)/ PathIcon(矢量路径)。四个控件均为轻量无状态组件,可内嵌进按钮、菜单等宿主控件。"
  >
    <template #demo>
      <div class="icon-stage">
        <section class="demo-group">
          <h3 class="group-title">FontIcon(字形 + 码点)</h3>
          <div class="icon-showcase">
            <WuiFontIcon
              class="showcase-icon"
              :glyph="fontGlyph"
              :font-size="fontFontSizeValue"
              :font-family="fontFamilyValue"
            />
            <p class="showcase-caption">
              glyph="\u{{ fontGlyphCode || '—' }}" · {{ selectedGlyphName }}
            </p>
          </div>
        </section>

        <section class="demo-group">
          <h3 class="group-title">SymbolIcon(Symbol 枚举)</h3>
          <div class="icon-showcase">
            <WuiSymbolIcon class="showcase-icon" :symbol="symbolValue" :font-size="symbolFontSizeValue" />
            <p class="showcase-caption">
              symbol="{{ symbolValue }}" → glyph="\u{{ symbolGlyphChar.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0') }}"
            </p>
          </div>
        </section>

        <section class="demo-group">
          <h3 class="group-title">BitmapIcon(位图 / 单色化)</h3>
          <div class="bitmap-row">
            <div class="icon-showcase">
              <WuiBitmapIcon
                class="showcase-icon"
                :src="bitmapSrc"
                :show-as-monochrome="bitmapMonochromeValue"
                :foreground="bitmapForegroundValue"
                :style="{ fontSize: `${bitmapSizeValue}px` }"
              />
              <p class="showcase-caption">ShowAsMonochrome = {{ bitmapMonochromeValue }}</p>
            </div>
            <!-- 固定对照:同一资源在单色化开/关下的差别(对照官方 Slices.png 示例) -->
            <div class="icon-showcase">
              <div class="bitmap-pair">
                <WuiBitmapIcon class="showcase-icon" :src="bitmapSrc" :show-as-monochrome="true" :style="{ fontSize: '48px' }" />
                <WuiBitmapIcon class="showcase-icon" :src="bitmapSrc" :show-as-monochrome="false" :style="{ fontSize: '48px' }" />
              </div>
              <p class="showcase-caption">左:单色化(true) · 右:原色(false)</p>
            </div>
          </div>
        </section>

        <section class="demo-group">
          <h3 class="group-title">PathIcon(矢量路径)</h3>
          <div class="icon-showcase">
            <WuiPathIcon
              class="showcase-icon"
              :data="pathDataValue"
              :view-box="pathViewBoxValue"
              :style="{ fontSize: `${pathSizeValue}px` }"
            />
            <p class="showcase-caption">Data="{{ pathDataValue }}" · ViewBox="{{ pathViewBoxValue }}"</p>
          </div>
        </section>

        <section class="demo-group browse-group">
          <h3 class="group-title">字形全表浏览(Segoe 图标字体,{{ FONT_ICON_GLYPHS.length }} 条)</h3>
          <p class="browse-note">
            点击字形:复制 \uXXXX 写法,并联动上方 FontIcon / SymbolIcon 演示(若该字形属于 Symbol 枚举)。
            字形依赖本机安装的 Segoe Fluent Icons / Segoe MDL2 Assets 字体(项目 R1 裁决:不加载网络字体),
            缺失字体的环境将显示空心方块(tofu)。
          </p>
          <div class="browse-toolbar">
            <input v-model="browseQuery" class="browse-search" type="search" placeholder="按名称或码点搜索,如 Setting / E713" />
            <div class="browse-pager">
              <button type="button" class="pager-button" :disabled="browsePageClamped <= 1" @click="browseGo(-1)">上一页</button>
              <span class="pager-status">第 {{ browsePageClamped }} / {{ browsePageCount }} 页 · 共 {{ filteredGlyphs.length }} 条</span>
              <button type="button" class="pager-button" :disabled="browsePageClamped >= browsePageCount" @click="browseGo(1)">下一页</button>
            </div>
          </div>
          <div class="glyph-grid">
            <button
              v-for="glyph in browsedGlyphs"
              :key="glyph.code"
              type="button"
              class="glyph-cell"
              :title="`${glyph.name}(${glyph.code})`"
              @click="selectGlyph(glyph.code)"
            >
              <span class="glyph-preview">{{ toGlyphChar(glyph.code) }}</span>
              <span class="glyph-code">{{ glyph.code }}</span>
              <span class="glyph-name">{{ glyph.name }}</span>
            </button>
          </div>
          <p class="copy-hint" role="status">{{ copyHint }}</p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="FontIcon · glyph(码点/字符)" type="text" v-model="fontGlyphInput" placeholder="E8FB 或粘贴字形" />
        <DemoOptionRow label="FontIcon · FontSize" type="slider" v-model="fontFontSize" :min="8" :max="64" :step="1" />
        <DemoOptionRow label="FontIcon · FontFamily" type="select" v-model="fontFamilyChoice" :options="familyChoices" />
        <DemoOptionRow label="SymbolIcon · Symbol(全枚举)" type="select" v-model="symbolInput" :options="symbolChoices" />
        <DemoOptionRow label="SymbolIcon · FontSize" type="slider" v-model="symbolFontSize" :min="8" :max="64" :step="1" />
        <DemoOptionRow label="BitmapIcon · Src(图片地址)" type="text" v-model="bitmapSrc" placeholder="图片 URL / data URL" />
        <DemoOptionRow label="BitmapIcon · ShowAsMonochrome" type="toggle" v-model="bitmapMonochrome" />
        <DemoOptionRow label="BitmapIcon · 取色" type="select" v-model="bitmapForegroundChoice" :options="bitmapForegroundChoices" />
        <DemoOptionRow label="BitmapIcon · 尺寸(px)" type="slider" v-model="bitmapSize" :min="16" :max="96" :step="1" />
        <DemoOptionRow label="PathIcon · Data" type="text" v-model="pathData" placeholder="F1 M 16,12 20,2L 20,16 1,16" />
        <DemoOptionRow label="PathIcon · ViewBox" type="text" v-model="pathViewBox" placeholder="0 0 20 20" />
        <DemoOptionRow label="PathIcon · 尺寸(px)" type="slider" v-model="pathSize" :min="16" :max="96" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <p class="docs-control-name">FontIcon</p>
      <DemoDocsTable :headers="propsHeaders" :rows="fontIconRows" />
      <p class="docs-control-name">SymbolIcon</p>
      <DemoDocsTable :headers="propsHeaders" :rows="symbolIconRows" />
      <p class="docs-control-name">BitmapIcon</p>
      <DemoDocsTable :headers="propsHeaders" :rows="bitmapIconRows" />
      <p class="docs-control-name">PathIcon</p>
      <DemoDocsTable :headers="propsHeaders" :rows="pathIconRows" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.icon-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
}

.demo-group {
  display: flex;
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

.icon-showcase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.showcase-icon {
  color: var(--wui-application-foreground-theme);
}

.showcase-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  font-family: monospace;
}

.bitmap-row {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
}

.bitmap-pair {
  display: flex;
  align-items: center;
  gap: 24px;
}

/* —— 字形全表浏览 —— */
.browse-group {
  width: 100%;
}

.browse-note {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.browse-toolbar {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.browse-search {
  min-width: 240px;
  padding: 5px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-control-foreground);
  background: var(--wui-text-control-background);
  border: 1px solid var(--wui-text-control-border);
  border-bottom-width: 2px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  outline: none;
}

.browse-search:focus-visible {
  border-color: var(--wui-text-control-border-brush-focused);
}

.browse-pager {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pager-button {
  padding: 4px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.pager-button:hover:not(:disabled) {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.pager-button:disabled {
  color: var(--wui-text-control-foreground-disabled);
  background: var(--wui-text-control-background-disabled);
  cursor: default;
}

.pager-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.pager-status {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.glyph-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 4px;
}

.glyph-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  padding: 8px 4px;
  font-family: inherit;
  color: var(--wui-application-foreground-theme);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.glyph-cell:hover {
  background: var(--wui-system-control-background-list-low);
  border-color: var(--wui-system-control-background-base-low);
}

.glyph-cell:active {
  background: var(--wui-system-control-background-base-medium-low);
}

.glyph-cell:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.glyph-preview {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-hub-section-header-theme-font-size);
  line-height: 1;
  color: var(--wui-application-foreground-theme);
}

.glyph-code {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.glyph-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.copy-hint {
  min-height: 1em;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-hyperlink-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.docs-control-name {
  margin: 12px 0 4px;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}
</style>
