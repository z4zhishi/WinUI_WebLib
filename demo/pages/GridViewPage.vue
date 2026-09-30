<script setup lang="ts">
// GridView 示例页:对照官方 WinUI Gallery GridViewPage
// (BasicGridView 图片网格 / GridviewLayoutCustomization 布局自定义 / ContentInsideGridview
//  内容与模板切换三例),另补多选(SelectionCheckMarkVisualEnabled 勾选圈)演示。
// 上半区交互演示 + 参数面板(SelectionMode / IsItemClickEnabled / ItemWidth / ItemHeight /
// MaximumRowsOrColumns / 项间距实时调节),下半区为属性、事件、键盘交互与用法代码
// (结构照抄已通过 QA 的 ComboBoxPage 母版)。
import { computed, ref } from 'vue'
import WuiGridView from '@/components/GridView.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'GridView', en: 'GridView' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI GridView 控件示例:把集合排成可横向换行的行列网格,支持 Single/Multiple/Extended 选择、勾选标记与可配单元格尺寸。上半区参数实时调节,下半区为控件文档。',
  en: 'WinUI GridView examples: a collection laid out in wrapping rows and columns with single/multiple/extended selection, check marks and configurable cell size. Options above, docs below.',
}
const GROUP_BASIC: BilingualText = { zh: '图片网格(Single 选择 + ItemClick 实时回显)', en: 'Image grid (Single selection + ItemClick echo)' }
const GROUP_MULTI: BilingualText = { zh: '多选(Multiple:勾选圈 + 选中集合回显)', en: 'Multiple selection (check circles + selected items echo)' }
const GROUP_TEMPLATE: BilingualText = { zh: '自定义模板(Extended:Ctrl/Shift 组合选择)', en: 'Custom template (Extended: Ctrl/Shift selection)' }
const GROUP_LAYOUT: BilingualText = { zh: '布局自定义(单元格尺寸 / 换行上限 / 项间距)', en: 'Layout customization (cell size / wrap limit / item margin)' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘操作', en: 'Keyboard interaction' }
const LABEL_MODE: BilingualText = { zh: 'SelectionMode(演示一)', en: 'SelectionMode (demo 1)' }
const LABEL_CLICK: BilingualText = { zh: 'IsItemClickEnabled(演示一)', en: 'IsItemClickEnabled (demo 1)' }
const LABEL_REVEAL: BilingualText = { zh: 'RevealBorder 揭示边框(演示一)', en: 'Reveal border (demo 1)' }
const LABEL_ITEM_WIDTH: BilingualText = { zh: 'ItemWidth(演示四)', en: 'ItemWidth (demo 4)' }
const LABEL_ITEM_HEIGHT: BilingualText = { zh: 'ItemHeight(演示四)', en: 'ItemHeight (demo 4)' }
const LABEL_MAX_COLS: BilingualText = { zh: 'MaximumRowsOrColumns(演示四)', en: 'MaximumRowsOrColumns (demo 4)' }
const LABEL_MARGIN: BilingualText = { zh: '项间距(演示四)', en: 'Item margin (demo 4)' }
const LABEL_SELECTED: BilingualText = { zh: '当前选中', en: 'Selected' }
const LABEL_MULTI_COUNT: BilingualText = { zh: '已选数量', en: 'Selected count' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupBasic = useBilingual(i18n, GROUP_BASIC)
const groupMulti = useBilingual(i18n, GROUP_MULTI)
const groupTemplate = useBilingual(i18n, GROUP_TEMPLATE)
const groupLayout = useBilingual(i18n, GROUP_LAYOUT)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelMode = useBilingual(i18n, LABEL_MODE)
const labelClick = useBilingual(i18n, LABEL_CLICK)
const labelReveal = useBilingual(i18n, LABEL_REVEAL)
const labelItemWidth = useBilingual(i18n, LABEL_ITEM_WIDTH)
const labelItemHeight = useBilingual(i18n, LABEL_ITEM_HEIGHT)
const labelMaxCols = useBilingual(i18n, LABEL_MAX_COLS)
const labelMargin = useBilingual(i18n, LABEL_MARGIN)
const labelSelected = useBilingual(i18n, LABEL_SELECTED)
const labelMultiCount = useBilingual(i18n, LABEL_MULTI_COUNT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 演示数据:官方 CustomDataObject 的等价物;图片以内联 SVG data URI 生成(无二进制资产)——
interface GalleryItem {
  title: string
  description: string
  views: number
  likes: number
  image: string
}

/** 以色相生成一张「风景感」SVG 渐变图(仅演示内容,非控件样式)。 */
function artImage(hue: number): string {
  const hueComplement = (hue + 180) % 360
  const hueDeep = (hue + 40) % 360
  const hueBright = (hue + 200) % 360
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="260" viewBox="0 0 380 260">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 70% 62%)"/>` +
    `<stop offset="1" stop-color="hsl(${hueDeep} 72% 40%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="380" height="260" fill="url(#g)"/>` +
    `<circle cx="298" cy="64" r="86" fill="hsl(${hueComplement} 70% 80%)" opacity="0.4"/>` +
    `<circle cx="76" cy="216" r="120" fill="hsl(${hueDeep} 60% 26%)" opacity="0.35"/>` +
    `<path d="M0 214 Q 95 158 190 208 T 380 192 V 260 H 0 Z" fill="hsl(${hueBright} 55% 90%)" opacity="0.55"/>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const HUES = [206, 174, 122, 80, 47, 28, 8, 330, 292, 262, 232, 190]
const SCENERY: Array<{ title: string; description: string; views: number; likes: number }> = [
  { title: 'Aurora', description: '极夜上空流动的绿色光带,长曝光拍摄。', views: 1284, likes: 96 },
  { title: 'Basalt', description: '黑色玄武岩海岸线,浪花拍岸。', views: 2038, likes: 154 },
  { title: 'Canyon', description: '红岩峡谷的层理与一线天光。', views: 3121, likes: 287 },
  { title: 'Dune', description: '沙漠沙丘的脊线在黄昏转折。', views: 1876, likes: 143 },
  { title: 'Estuary', description: '河口湿地,候鸟群掠过水面。', views: 954, likes: 72 },
  { title: 'Fjord', description: '冰川侵蚀的峡湾与陡峭山壁。', views: 2670, likes: 231 },
  { title: 'Glacier', description: '蓝冰裂缝间的深色融水。', views: 3442, likes: 305 },
  { title: 'Highland', description: '高地草甸与低垂的云。', views: 1187, likes: 88 },
  { title: 'Isthmus', description: '连接两片海的狭窄地峡。', views: 1476, likes: 119 },
  { title: 'Juniper', description: '杜松林间的晨雾。', views: 769, likes: 61 },
  { title: 'Karst', description: '喀斯特峰林的剪影层次。', views: 2255, likes: 194 },
  { title: 'Lagoon', description: '环礁潟湖的浅滩渐变。', views: 2918, likes: 246 },
]
const galleryItems: GalleryItem[] = SCENERY.map((entry, index) => ({
  ...entry,
  image: artImage(HUES[index] ?? 206),
}))

// —— 参数面板(DemoOptionRow 契约:string | number | boolean 联合)——
const modeOption = ref<string | number | boolean>('Single')
const clickOption = ref<string | number | boolean>(true)
const revealOption = ref<string | number | boolean>(false)
const widthOption = ref<string | number | boolean>(190)
const heightOption = ref<string | number | boolean>(130)
const maxColsOption = ref<string | number | boolean>(3)
const marginOption = ref<string | number | boolean>(5)

type SelectionMode = 'None' | 'Single' | 'Multiple' | 'Extended'
function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const demoMode = computed<SelectionMode>(() => {
  const value = String(modeOption.value)
  return value === 'None' || value === 'Multiple' || value === 'Extended' ? value : 'Single'
})
const demoItemClick = computed(() => clickOption.value === true)
const demoReveal = computed(() => revealOption.value === true)
const demoWidth = computed(() => toNumber(widthOption.value, 190))
const demoHeight = computed(() => toNumber(heightOption.value, 130))
const demoMaxCols = computed(() => toNumber(maxColsOption.value, 3))
const demoMargin = computed(() => toNumber(marginOption.value, 5))

// —— 演示一:图片网格(对照 BasicGridView:Single + IsItemClickEnabled + 输出行)——
const clickOutput = ref('')
const basicSelected = ref('')
const basicSelectedItems = ref<unknown[]>([])

function itemTitle(item: unknown): string {
  return item && typeof item === 'object' && 'title' in item ? String((item as GalleryItem).title) : String(item)
}

function onBasicItemClick(event: { item: unknown; index: number }): void {
  clickOutput.value = `ItemClick → ${itemTitle(event.item)}(索引 ${event.index})`
}

// 与 ListView 同约定:selectionChanged(selected, added, removed)
function onBasicSelectionChanged(selected: unknown[]): void {
  basicSelectedItems.value = selected
  const first = selected[0]
  const index = first === undefined ? -1 : galleryItems.indexOf(first as GalleryItem)
  basicSelected.value =
    index >= 0 ? `${index}(${selected.map(itemTitle).join(', ')})` : '—'
}

// —— 演示二:多选(勾选圈 + 选中集合回显)——
const multiSelectedItems = ref<unknown[]>([])
const multiEcho = computed(() =>
  multiSelectedItems.value.length > 0
    ? multiSelectedItems.value.map(itemTitle).join('、')
    : '—',
)
const compactItems = computed(() => galleryItems.slice(0, 8))

function onMultiSelectionChanged(selected: unknown[]): void {
  multiSelectedItems.value = selected
}

// —— 演示三:自定义模板(对照 ImageTextTemplate;Extended 键盘组合选择)——
const extendedItems = computed(() => galleryItems.slice(0, 5))
const templateEcho = ref('—')

function onTemplateSelectionChanged(
  selected: unknown[],
  added: unknown[],
  removed: unknown[],
): void {
  const addedText = added.map(itemTitle).join('、')
  const removedText = removed.map(itemTitle).join('、')
  templateEcho.value = `+ [${addedText || '无'}] − [${removedText || '无'}] → 现选 ${selected.length} 项`
}

// —— 演示四:布局自定义(对照 GridviewLayoutCustomization:边距 / 换行上限)——
const layoutItems = computed(() => galleryItems.slice(0, 9))
const layoutMargin = computed(() => {
  const m = demoMargin.value
  return `${m},${m},${m},${m}`
})

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['items', 'unknown[]', '[]', '数据源数组(WinUI ItemsSource),元素可为字符串/数字/对象'],
  ['selectionMode', "'None' | 'Single' | 'Multiple' | 'Extended'", "'Single'", '选择模式(WinUI SelectionMode);None 清空选择,Multiple 全员勾选圈,Extended 支持 Ctrl/Shift 组合'],
  ['selectedIndex (v-model)', 'number', '-1', '首个选中项索引(WinUI SelectedIndex,未选 -1),双向绑定'],
  ['selectedItem (v-model)', 'unknown', 'null', '首个选中项(WinUI SelectedItem),双向绑定'],
  ['selectedItems (v-model)', 'unknown[]', '[]', '全部选中项(WinUI SelectedItems),双向绑定'],
  ['isItemClickEnabled', 'boolean', 'false', '点击项时触发 itemClick(WinUI IsItemClickEnabled)'],
  ['displayMemberPath', 'string', "''", "对象项的显示字段(WinUI DisplayMemberPath),如 'title'"],
  ['itemWidth', 'number', 'undefined', '单元格宽 px(WinUI ItemWidth);缺省按容器宽均分换行'],
  ['itemHeight', 'number', 'undefined', '单元格高 px(WinUI ItemHeight);缺省由内容决定'],
  ['maximumRowsOrColumns', 'number', '0', '换行前每行(纵向流为每列)最多项数(WinUI MaximumRowsOrColumns;0 = 不限)'],
  ['orientation', "'Horizontal' | 'Vertical'", "'Horizontal'", '换行方向(WinUI ItemsWrapGrid.Orientation;Vertical 为列优先流)'],
  ['padding', 'string', "'0,0,0,10'", '控件内边距(WinUI Padding,XAML Thickness 顺序:左,上,右,下)'],
  ['itemMargin', 'string', "'0,0,4,4'", '项外边距(WinUI ItemContainerStyle Margin)'],
  ['selectionCheckMarkVisualEnabled', 'boolean', 'true', '选择勾选标记(WinUI SelectionCheckMarkVisualEnabled)'],
  ['revealBorder', 'boolean', 'false', '悬浮揭示边框(近似 WinUI 2 reveal;源画刷为透明,见 wiki 差异)'],
  ['disabled', 'boolean', 'false', '禁用态,项进入 Disabled 视觉状态'],
  ['#item slot', "slot '{ item: unknown; index: number; selected: boolean }'", '—', '自定义项模板(WinUI ItemTemplate);缺省渲染显示文本'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['selectionChanged', '(selected: unknown[], added: unknown[], removed: unknown[])', '选中集合变化时(点击、键盘、程序化赋值均触发;added/removed 对照 SelectionChangedEventArgs,与 ListView 同约定)'],
  ['itemClick', '(e: { item, index, event })', '点击项时触发,需 isItemClickEnabled(WinUI ItemClick)'],
  ['update:selectedIndex / selectedItem / selectedItems', '(value)', '三个双向绑定模型各自的更新事件'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['← / → / ↑ / ↓', '按网格几何移动焦点(Single 模式随动选择)'],
  ['Home / End', '移动到首 / 末项(Single 模式随动选择)'],
  ['Space / Enter', '选择/切换当前聚焦项'],
  ['Ctrl + 单击', '切换该项选择(Single 模式下为取消选择)'],
  ['Shift + 单击', '范围选择(Extended 模式,自锚点至点击项)'],
  ['Ctrl + A', '全选(Extended 模式)'],
]

const usageCode = computed(
  () => `<WuiGridView
  :items="galleryItems"
  display-member-path="title"
  selection-mode="${String(modeOption.value)}"
  :is-item-click-enabled="${clickOption.value === true}"
  :item-width="${demoWidth.value}"
  :item-height="${demoHeight.value}"
  :maximum-rows-or-columns="${demoMaxCols.value}"
  @item-click="onItemClick"
  @selection-changed="onSelectionChanged">
  <template #item="{ item }">
    <img :src="item.image" :alt="item.title" width="190" height="130" />
  </template>
</WuiGridView>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="GridView">
    <template #demo>
      <div class="gridview-stage">
        <!-- 演示一:图片网格(参数面板实时调节 SelectionMode / IsItemClickEnabled / RevealBorder) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupBasic }}</h4>
          <WuiGridView
            :items="galleryItems"
            :selection-mode="demoMode"
            :is-item-click-enabled="demoItemClick"
            :reveal-border="demoReveal"
            :item-width="190"
            :item-height="130"
            style="max-height: 460px"
            @item-click="onBasicItemClick"
            @selection-changed="onBasicSelectionChanged"
          >
            <template #item="{ item }">
              <img
                class="basic-image"
                :src="(item as GalleryItem).image"
                :alt="(item as GalleryItem).title"
                width="190"
                height="130"
              />
            </template>
          </WuiGridView>
          <p class="demo-output">{{ clickOutput || 'ItemClick 尚未触发(打开 IsItemClickEnabled 后点击图片)' }}</p>
          <p class="demo-output">{{ labelSelected }}: {{ basicSelected }}</p>
        </section>

        <!-- 演示二:多选(全部项显示空心勾选圈,选中变实心) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupMulti }}</h4>
          <WuiGridView
            :items="compactItems"
            selection-mode="Multiple"
            :item-width="150"
            :item-height="64"
            display-member-path="title"
            style="max-height: 320px"
            @selection-changed="onMultiSelectionChanged"
          >
            <template #item="{ item, index }">
              <span class="compact-tile">
                <span
                  class="compact-icon"
                  :style="{ background: `hsl(${HUES[index] ?? 206} 70% 55%)` }"
                  aria-hidden="true"
                ></span>
                <span class="compact-title">{{ (item as GalleryItem).title }}</span>
                <span class="compact-meta">{{ (item as GalleryItem).likes }} likes</span>
              </span>
            </template>
          </WuiGridView>
          <p class="demo-output">
            {{ labelMultiCount }}: {{ multiSelectedItems.length }} · {{ multiEcho }}
          </p>
        </section>

        <!-- 演示三:自定义模板(ImageText 模板;Extended:Ctrl 切换 / Shift 范围) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupTemplate }}</h4>
          <WuiGridView
            :items="extendedItems"
            selection-mode="Extended"
            :item-width="280"
            :item-height="104"
            display-member-path="title"
            style="max-height: 360px"
            @selection-changed="onTemplateSelectionChanged"
          >
            <template #item="{ item }">
              <span class="text-tile">
                <img
                  class="text-tile-image"
                  :src="(item as GalleryItem).image"
                  :alt="(item as GalleryItem).title"
                />
                <span class="text-tile-body">
                  <span class="text-tile-title">{{ (item as GalleryItem).title }}</span>
                  <span class="text-tile-desc">{{ (item as GalleryItem).description }}</span>
                  <span class="text-tile-meta">
                    {{ (item as GalleryItem).views }} views · {{ (item as GalleryItem).likes }} likes
                  </span>
                </span>
              </span>
            </template>
          </WuiGridView>
          <p class="demo-output">{{ labelSelected }}(Added/Removed): {{ templateEcho }}</p>
        </section>

        <!-- 演示四:布局自定义(ImageOverlay 模板 + 面板调节单元格/换行/间距) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupLayout }}</h4>
          <WuiGridView
            :items="layoutItems"
            :item-width="demoWidth"
            :item-height="demoHeight"
            :maximum-rows-or-columns="demoMaxCols"
            :item-margin="layoutMargin"
            selection-mode="Single"
            :selected-index="0"
            style="max-height: 460px"
          >
            <template #item="{ item }">
              <span class="overlay-tile">
                <img
                  class="overlay-tile-image"
                  :src="(item as GalleryItem).image"
                  :alt="(item as GalleryItem).title"
                />
                <span class="overlay-tile-caption">
                  <span class="overlay-tile-title">{{ (item as GalleryItem).title }}</span>
                  <span class="overlay-tile-meta">{{ (item as GalleryItem).likes }} likes</span>
                </span>
              </span>
            </template>
          </WuiGridView>
        </section>

        <!-- 键盘操作说明 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupKeyboard }}</h4>
          <ul class="keyboard-list">
            <li><kbd>←</kbd>/<kbd>→</kbd>/<kbd>↑</kbd>/<kbd>↓</kbd> {{ i18n.locale.value.startsWith('zh') ? '按网格几何移动焦点(Single 随动选择)' : 'move focus geometrically (Single selects)' }}</li>
            <li><kbd>Home</kbd>/<kbd>End</kbd> {{ i18n.locale.value.startsWith('zh') ? '首/末项' : 'first/last item' }}</li>
            <li><kbd>Space</kbd>/<kbd>Enter</kbd> {{ i18n.locale.value.startsWith('zh') ? '选择/切换当前项' : 'select/toggle current item' }}</li>
            <li><kbd>Ctrl</kbd>+{{ i18n.locale.value.startsWith('zh') ? '单击' : 'click' }} {{ i18n.locale.value.startsWith('zh') ? '切换选择' : 'toggle selection' }}</li>
            <li><kbd>Shift</kbd>+{{ i18n.locale.value.startsWith('zh') ? '单击' : 'click' }} {{ i18n.locale.value.startsWith('zh') ? '范围选择(Extended)' : 'range select (Extended)' }}</li>
            <li><kbd>Ctrl</kbd>+<kbd>A</kbd> {{ i18n.locale.value.startsWith('zh') ? '全选(Extended)' : 'select all (Extended)' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          :label="labelMode"
          type="select"
          v-model="modeOption"
          :options="[
            { label: 'None', value: 'None' },
            { label: 'Single', value: 'Single' },
            { label: 'Multiple', value: 'Multiple' },
            { label: 'Extended', value: 'Extended' },
          ]"
        />
        <DemoOptionRow :label="labelClick" type="toggle" v-model="clickOption" />
        <DemoOptionRow :label="labelReveal" type="toggle" v-model="revealOption" />
        <DemoOptionRow :label="labelItemWidth" type="slider" v-model="widthOption" :min="100" :max="280" :step="10" />
        <DemoOptionRow :label="labelItemHeight" type="slider" v-model="heightOption" :min="60" :max="240" :step="10" />
        <DemoOptionRow :label="labelMaxCols" type="slider" v-model="maxColsOption" :min="0" :max="8" :step="1" />
        <DemoOptionRow :label="labelMargin" type="slider" v-model="marginOption" :min="0" :max="24" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsKeyboardTitle }}</h4>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.gridview-stage {
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

.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示一:ImageTemplate(190x130,UniformToFill)—— */
.basic-image {
  display: block;
  width: 190px;
  height: 130px;
  object-fit: cover;
}

/* —— 演示二:紧凑图标块 —— */
.compact-tile {
  display: flex;
  width: 150px;
  height: 64px;
  box-sizing: border-box;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.compact-icon {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.compact-title {
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-meta {
  margin-left: auto;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示三:ImageText 模板(图 100px + 文本列)—— */
.text-tile {
  display: flex;
  width: 280px;
  height: 104px;
  box-sizing: border-box;
  align-items: stretch;
}

.text-tile-image {
  flex: none;
  width: 120px;
  height: 100%;
  object-fit: cover;
}

.text-tile-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0 8px 10px;
  text-align: left;
}

.text-tile-title {
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-tile-desc {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.text-tile-meta {
  margin-top: auto;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示四:ImageOverlay 模板(底部 75% 透明度说明条)—— */
.overlay-tile {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}

.overlay-tile-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.overlay-tile-caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  height: 34px;
  padding: 2px 6px;
  background: var(--wui-system-control-background-chrome-medium);
  opacity: 0.85;
}

.overlay-tile-title {
  overflow: hidden;
  color: var(--wui-application-foreground-theme);
  font-size: var(--wui-control-content-theme-font-size);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay-tile-meta {
  margin-left: auto;
  color: var(--wui-application-secondary-foreground-theme);
  font-size: var(--wui-tool-tip-content-theme-font-size);
  white-space: nowrap;
}

.keyboard-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.keyboard-list kbd {
  padding: 1px 6px;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 3px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
