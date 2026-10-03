<script setup lang="ts">
// ItemsView 示例页:对照官方 WinUI Gallery ItemsViewPage 三例 ——
//   BasicItemsview(纵向文件式列表 + ItemInvoked)/ ItemsviewSwappableLayouts(布局与参数
//   可换)/ ItemsviewItemInvocationSelection(SelectionMode 四档 + 调用回显),另补
//   EmptyContent 空态演示。上半区交互演示 + 参数面板实时调节,下半区为属性、事件、
//   键盘交互与用法代码(结构照抄已通过 QA 的 GridViewPage 母版)。
import { computed, ref } from 'vue'
import WuiItemsView from '@/components/ItemsView.vue'
import type { ItemsViewInvokedEventArgs } from '@/components/ItemsView.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ItemsView', en: 'ItemsView' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI ItemsView 控件示例:以可滚动、可切换布局(Stack / UniformGrid)的方式呈现集合,支持 None/Single/Multiple/Extended 选择、Enter/双击调用与 EmptyContent 空态。上半区参数实时调节,下半区为控件文档。',
  en: 'WinUI ItemsView examples: a scrollable collection with swappable layouts (Stack / UniformGrid), None/Single/Multiple/Extended selection, Enter/double-click invocation and an EmptyContent state. Options above, docs below.',
}
const GROUP_FILES: BilingualText = { zh: '文件列表式单选(Stack 布局 + ItemInvoked 实时回显)', en: 'File list with Single selection (Stack layout + ItemInvoked echo)' }
const GROUP_GRID: BilingualText = { zh: '照片网格多选(布局与选择模式可换,右上角勾选框)', en: 'Photo grid (swappable layout & selection mode, corner checkboxes)' }
const GROUP_EMPTY: BilingualText = { zh: '空态(EmptyContent slot)', en: 'Empty state (EmptyContent slot)' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘操作', en: 'Keyboard interaction' }
const LABEL_LAYOUT: BilingualText = { zh: 'Layout(演示二)', en: 'Layout (demo 2)' }
const LABEL_MODE: BilingualText = { zh: 'SelectionMode(演示二)', en: 'SelectionMode (demo 2)' }
const LABEL_INVOKE: BilingualText = { zh: 'IsItemInvokedEnabled(演示二)', en: 'IsItemInvokedEnabled (demo 2)' }
const LABEL_ITEM_WIDTH: BilingualText = { zh: 'MinItemWidth(演示二,UniformGrid)', en: 'MinItemWidth (demo 2, UniformGrid)' }
const LABEL_ITEM_HEIGHT: BilingualText = { zh: 'MinItemHeight(演示二,UniformGrid)', en: 'MinItemHeight (demo 2, UniformGrid)' }
const LABEL_MAX_COLS: BilingualText = { zh: 'MaximumRowsOrColumns(演示二,0 = 不限)', en: 'MaximumRowsOrColumns (demo 2, 0 = unbounded)' }
const LABEL_GRID_SPACING: BilingualText = { zh: 'MinRow/ColumnSpacing(演示二)', en: 'MinRow/ColumnSpacing (demo 2)' }
const LABEL_STACK_SPACING: BilingualText = { zh: 'Spacing(演示一,Stack 行距)', en: 'Spacing (demo 1, Stack row gap)' }
const LABEL_EMPTY: BilingualText = { zh: '清空集合(演示三)', en: 'Empty the collection (demo 3)' }
const LABEL_INVOKED: BilingualText = { zh: '最近调用', en: 'Last invoked' }
const LABEL_SELECTED: BilingualText = { zh: '当前选中', en: 'Selected' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupFiles = useBilingual(i18n, GROUP_FILES)
const groupGrid = useBilingual(i18n, GROUP_GRID)
const groupEmpty = useBilingual(i18n, GROUP_EMPTY)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelLayout = useBilingual(i18n, LABEL_LAYOUT)
const labelMode = useBilingual(i18n, LABEL_MODE)
const labelInvoke = useBilingual(i18n, LABEL_INVOKE)
const labelItemWidth = useBilingual(i18n, LABEL_ITEM_WIDTH)
const labelItemHeight = useBilingual(i18n, LABEL_ITEM_HEIGHT)
const labelMaxCols = useBilingual(i18n, LABEL_MAX_COLS)
const labelGridSpacing = useBilingual(i18n, LABEL_GRID_SPACING)
const labelStackSpacing = useBilingual(i18n, LABEL_STACK_SPACING)
const labelEmpty = useBilingual(i18n, LABEL_EMPTY)
const labelInvoked = useBilingual(i18n, LABEL_INVOKED)
const labelSelected = useBilingual(i18n, LABEL_SELECTED)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 演示一:文件列表(单选;对照 BasicItemsview 的调用回显)——
interface FileItem {
  name: string
  ext: string
  size: string
  modified: string
  hue: number
}

const files: FileItem[] = [
  { name: '季度报告.docx', ext: 'DOC', size: '184 KB', modified: '2026-09-02', hue: 214 },
  { name: '预算明细.xlsx', ext: 'XLS', size: '96 KB', modified: '2026-09-05', hue: 152 },
  { name: '发布说明.pdf', ext: 'PDF', size: '1.2 MB', modified: '2026-09-08', hue: 8 },
  { name: '架构图.png', ext: 'PNG', size: '640 KB', modified: '2026-09-10', hue: 268 },
  { name: '演示文稿.pptx', ext: 'PPT', size: '2.4 MB', modified: '2026-09-12', hue: 24 },
  { name: '会议纪要.txt', ext: 'TXT', size: '12 KB', modified: '2026-09-15', hue: 200 },
  { name: '数据集.csv', ext: 'CSV', size: '348 KB', modified: '2026-09-19', hue: 132 },
  { name: '打包脚本.zip', ext: 'ZIP', size: '5.8 MB', modified: '2026-09-22', hue: 52 },
  { name: '设计稿.svg', ext: 'SVG', size: '88 KB', modified: '2026-09-25', hue: 318 },
  { name: 'README.md', ext: 'MD', size: '6 KB', modified: '2026-09-26', hue: 178 },
]

const fileInvokedEcho = ref('—')
const fileSelectedEcho = ref('—')

function onFileInvoked(event: ItemsViewInvokedEventArgs): void {
  const item = event.item as FileItem
  fileInvokedEcho.value = `ItemInvoked → ${item.name}(索引 ${event.index})`
}

function onFileSelectionChanged(selected: unknown[]): void {
  fileSelectedEcho.value =
    selected.length > 0
      ? (selected as FileItem[]).map((item) => `${item.name}`).join('、')
      : '—'
}

// —— 演示二:照片网格(布局与选择模式可换;对照 SwappableLayouts + ItemInvocationSelection)——
interface PhotoItem {
  title: string
  likes: number
  image: string
}

/** 以色相生成一张「风景感」SVG 渐变图(仅演示内容,非控件样式)。 */
function artImage(hue: number): string {
  const hueComplement = (hue + 180) % 360
  const hueDeep = (hue + 40) % 360
  const hueBright = (hue + 200) % 360
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="220" viewBox="0 0 300 220">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue} 70% 62%)"/>` +
    `<stop offset="1" stop-color="hsl(${hueDeep} 72% 40%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="300" height="220" fill="url(#g)"/>` +
    `<circle cx="232" cy="52" r="64" fill="hsl(${hueComplement} 70% 80%)" opacity="0.4"/>` +
    `<circle cx="58" cy="184" r="92" fill="hsl(${hueDeep} 60% 26%)" opacity="0.35"/>` +
    `<path d="M0 182 Q 75 136 150 174 T 300 160 V 220 H 0 Z" fill="hsl(${hueBright} 55% 90%)" opacity="0.55"/>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const HUES = [206, 174, 122, 80, 47, 28, 8, 330, 292, 262, 232, 190]
const PHOTO_META: Array<{ title: string; likes: number }> = [
  { title: 'Aurora', likes: 96 },
  { title: 'Basalt', likes: 154 },
  { title: 'Canyon', likes: 287 },
  { title: 'Dune', likes: 143 },
  { title: 'Estuary', likes: 72 },
  { title: 'Fjord', likes: 231 },
  { title: 'Glacier', likes: 305 },
  { title: 'Highland', likes: 88 },
  { title: 'Isthmus', likes: 119 },
  { title: 'Juniper', likes: 61 },
  { title: 'Karst', likes: 194 },
  { title: 'Lagoon', likes: 246 },
]
const photos: PhotoItem[] = PHOTO_META.map((meta, index) => ({
  ...meta,
  image: artImage(HUES[index] ?? 206),
}))

// —— 参数面板(DemoOptionRow 契约:string | number | boolean 联合)——
const layoutOption = ref<string | number | boolean>('UniformGrid')
const modeOption = ref<string | number | boolean>('Multiple')
const invokeOption = ref<string | number | boolean>(true)
const widthOption = ref<string | number | boolean>(150)
const heightOption = ref<string | number | boolean>(112)
const maxColsOption = ref<string | number | boolean>(4)
const gridSpacingOption = ref<string | number | boolean>(6)
const stackSpacingOption = ref<string | number | boolean>(6)
const emptyOption = ref<string | number | boolean>(false)

type LayoutKind = 'Stack' | 'UniformGrid'
type SelectionMode = 'None' | 'Single' | 'Multiple' | 'Extended'
function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const demoLayout = computed<LayoutKind>(() => (String(layoutOption.value) === 'Stack' ? 'Stack' : 'UniformGrid'))
const demoMode = computed<SelectionMode>(() => {
  const value = String(modeOption.value)
  return value === 'None' || value === 'Single' || value === 'Extended' ? value : 'Multiple'
})
const demoInvoke = computed(() => invokeOption.value === true)
const demoWidth = computed(() => toNumber(widthOption.value, 150))
const demoHeight = computed(() => toNumber(heightOption.value, 112))
const demoMaxCols = computed(() => toNumber(maxColsOption.value, 4))
const demoGridSpacing = computed(() => toNumber(gridSpacingOption.value, 6))
const demoStackSpacing = computed(() => toNumber(stackSpacingOption.value, 6))
const demoEmpty = computed(() => emptyOption.value === true)

const gridSelectionEcho = ref('—')
const gridInvokedEcho = ref('—')

function onGridSelectionChanged(selected: unknown[]): void {
  gridSelectionEcho.value = `已选 ${selected.length} 项${selected.length > 0 ? ':' + (selected as PhotoItem[]).map((item) => item.title).join('、') : ''}`
}

function onGridInvoked(event: ItemsViewInvokedEventArgs): void {
  gridInvokedEcho.value = `ItemInvoked → ${(event.item as PhotoItem).title}`
}

// —— 演示三:空态(EmptyContent slot;清空集合开关)——
const emptyFiles = computed(() => (demoEmpty.value ? [] : files.slice(0, 5)))

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['items', 'unknown[]', '[]', '数据源数组(WinUI ItemsSource),元素可为字符串/数字/对象'],
  ['selectionMode', "'None' | 'Single' | 'Multiple' | 'Extended'", "'Single'", '选择模式(WinUI SelectionMode);Multiple 所有项右上角显示勾选框,Extended 支持 Ctrl/Shift 组合'],
  ['selectedItems (v-model)', 'unknown[]', '[]', '全部选中项(WinUI SelectedItems),v-model:selected-items 双向绑定'],
  ['layout', "'Stack' | 'UniformGrid'", "'Stack'", '布局种类(WinUI ItemsView.Layout;LinedFlowLayout 未复刻,见 wiki)'],
  ['orientation', "'vertical' | 'horizontal'", "按 layout", '排列轴:Stack 缺省 vertical;UniformGrid 缺省 horizontal(条目沿 X 排、满行下折)'],
  ['spacing', 'number', '0', 'Stack 布局相邻项间距 px(WinUI StackLayout.Spacing)'],
  ['minItemWidth', 'number', '0', 'UniformGrid 最小项宽 px(WinUI MinItemWidth;0 = 每行 1 项,WinUI 除零语义)'],
  ['minItemHeight', 'number', '0', 'UniformGrid 最小项高 px(WinUI MinItemHeight)'],
  ['minRowSpacing', 'number', '0', 'UniformGrid 行间距下限 px(WinUI MinRowSpacing)'],
  ['minColumnSpacing', 'number', '0', 'UniformGrid 列间距下限 px(WinUI MinColumnSpacing)'],
  ['maximumRowsOrColumns', 'number', '不限', 'UniformGrid 每行项数上限(WinUI MaximumRowsOrColumns)'],
  ['isItemInvokedEnabled', 'boolean', 'false', '启用项调用(WinUI IsItemInvokedEnabled):Enter / 双击触发 itemInvoked'],
  ['displayMemberPath', 'string', "''", "对象项的显示字段(WinUI DisplayMemberPath),如 'name'"],
  ['disabled', 'boolean', 'false', '禁用态,项进入 Disabled 视觉状态且不可交互'],
  ['#item slot', "slot '{ item: unknown; index: number; selected: boolean }'", '—', '自定义项模板(WinUI ItemTemplate),内容承载于 ItemContainer;缺省渲染显示文本'],
  ['#empty-content slot', 'slot', '—', '空态内容(WinUI EmptyContent);缺省无内容,与 WinUI 一致'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['selectionChanged', '(selected: unknown[], added: unknown[], removed: unknown[])', '选中集合变化时(点击、键盘、程序化赋值均触发;added/removed 对照 WinUI ItemsViewSelectionChangedEventArgs)'],
  ['itemInvoked', '(e: { item, index, event })', 'Enter / 双击项时触发,需 isItemInvokedEnabled(WinUI ItemInvoked)'],
  ['update:selectedItems', '(value: unknown[])', 'selectedItems 双向绑定模型的更新事件'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['← / → / ↑ / ↓', '按几何位置移动焦点(Single 模式随动选择;多选模式 Shift+方向键扩展区间)'],
  ['Home / End', '移动到首 / 末项(Single 模式随动选择)'],
  ['Space', '选择/切换当前聚焦项(Multiple 切换,Single/Extended 选中)'],
  ['Ctrl + Space', '切换当前聚焦项(Extended)'],
  ['Enter / 双击', '调用当前项(itemInvoked,需 isItemInvokedEnabled)'],
  ['Ctrl + A', '全选(Multiple / Extended)'],
  ['Ctrl / Shift + 单击', 'Ctrl 切换该项、Shift 自锚点区间选择(Extended;Multiple 的 Shift 为追加区间)'],
]

const usageCode = computed(
  () => `<WuiItemsView
  :items="photos"
  layout="${String(layoutOption.value)}"
  selection-mode="${String(modeOption.value)}"
  :is-item-invoked-enabled="${invokeOption.value === true}"
  :min-item-width="${demoWidth.value}"
  :min-item-height="${demoHeight.value}"
  :min-row-spacing="${demoGridSpacing.value}"
  :min-column-spacing="${demoGridSpacing.value}"
  :maximum-rows-or-columns="${demoMaxCols.value === 0 ? 'undefined' : demoMaxCols.value}"
  @item-invoked="onItemInvoked"
  @selection-changed="onSelectionChanged">
  <template #item="{ item }">
    <img :src="item.image" :alt="item.title" />
  </template>
  <template #empty-content>
    <span>没有可显示的照片</span>
  </template>
</WuiItemsView>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ItemsView">
    <template #demo>
      <div class="itemsview-stage">
        <!-- 演示一:文件列表式单选(Stack 布局;Enter/双击调用回显) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupFiles }}</h3>
          <WuiItemsView
            class="file-list"
            aria-label="文件列表"
            :items="files"
            layout="Stack"
            selection-mode="Single"
            :spacing="demoStackSpacing"
            :is-item-invoked-enabled="true"
            style="max-height: 420px; min-width: 420px"
            @item-invoked="onFileInvoked"
            @selection-changed="onFileSelectionChanged"
          >
            <template #item="{ item }">
              <span class="file-row">
                <span
                  class="file-badge"
                  :style="{ background: `hsl(${(item as FileItem).hue} 55% 32%)` }"
                  aria-hidden="true"
                >{{ (item as FileItem).ext }}</span>
                <span class="file-name">{{ (item as FileItem).name }}</span>
                <span class="file-meta">{{ (item as FileItem).size }}</span>
                <span class="file-meta">{{ (item as FileItem).modified }}</span>
              </span>
            </template>
          </WuiItemsView>
          <p class="demo-output">{{ labelInvoked }}: {{ fileInvokedEcho }}</p>
          <p class="demo-output">{{ labelSelected }}: {{ fileSelectedEcho }}</p>
        </section>

        <!-- 演示二:照片网格(布局 / 选择模式 / 网格参数面板实时调节) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupGrid }}</h3>
          <WuiItemsView
            class="photo-grid"
            aria-label="照片网格"
            :items="photos"
            :layout="demoLayout"
            :selection-mode="demoMode"
            :is-item-invoked-enabled="demoInvoke"
            :spacing="demoStackSpacing"
            :min-item-width="demoWidth"
            :min-item-height="demoHeight"
            :min-row-spacing="demoGridSpacing"
            :min-column-spacing="demoGridSpacing"
            :maximum-rows-or-columns="demoMaxCols > 0 ? demoMaxCols : undefined"
            style="max-height: 460px; width: 100%"
            @item-invoked="onGridInvoked"
            @selection-changed="onGridSelectionChanged"
          >
            <template #item="{ item }">
              <span class="photo-tile">
                <img
                  class="photo-image"
                  :src="(item as PhotoItem).image"
                  :alt="(item as PhotoItem).title"
                />
                <span class="photo-caption">
                  <span class="photo-title">{{ (item as PhotoItem).title }}</span>
                  <span class="photo-likes">{{ (item as PhotoItem).likes }} likes</span>
                </span>
              </span>
            </template>
          </WuiItemsView>
          <p class="demo-output">{{ gridSelectionEcho }}</p>
          <p class="demo-output">{{ labelInvoked }}: {{ gridInvokedEcho }}</p>
        </section>

        <!-- 演示三:空态(EmptyContent slot) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupEmpty }}</h3>
          <WuiItemsView
            class="empty-demo"
            aria-label="空态文件列表"
            :items="emptyFiles"
            layout="Stack"
            selection-mode="Single"
            style="max-height: 260px; min-width: 420px"
          >
            <template #item="{ item }">
              <span class="file-row">
                <span
                  class="file-badge"
                  :style="{ background: `hsl(${(item as FileItem).hue} 55% 32%)` }"
                  aria-hidden="true"
                >{{ (item as FileItem).ext }}</span>
                <span class="file-name">{{ (item as FileItem).name }}</span>
                <span class="file-meta">{{ (item as FileItem).size }}</span>
              </span>
            </template>
            <template #empty-content>
              <span class="empty-hint">
                <span class="empty-glyph" aria-hidden="true">∅</span>
                没有可显示的项 —— 集合为空时展示 EmptyContent slot 内容。
              </span>
            </template>
          </WuiItemsView>
        </section>

        <!-- 键盘操作说明 -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupKeyboard }}</h3>
          <ul class="keyboard-list">
            <li><kbd>←</kbd>/<kbd>→</kbd>/<kbd>↑</kbd>/<kbd>↓</kbd> {{ i18n.locale.value.startsWith('zh') ? '移动焦点(Single 随动选择;多选 Shift 扩展)' : 'move focus (Single selects; Shift extends in multi-select)' }}</li>
            <li><kbd>Home</kbd>/<kbd>End</kbd> {{ i18n.locale.value.startsWith('zh') ? '首/末项' : 'first/last item' }}</li>
            <li><kbd>Space</kbd> {{ i18n.locale.value.startsWith('zh') ? '选择/切换当前项' : 'select/toggle current item' }}</li>
            <li><kbd>Ctrl</kbd>+<kbd>Space</kbd> {{ i18n.locale.value.startsWith('zh') ? '切换当前项(Extended)' : 'toggle current item (Extended)' }}</li>
            <li><kbd>Enter</kbd>/{{ i18n.locale.value.startsWith('zh') ? '双击' : 'double-click' }} {{ i18n.locale.value.startsWith('zh') ? '调用当前项' : 'invoke current item' }}</li>
            <li><kbd>Ctrl</kbd>+<kbd>A</kbd> {{ i18n.locale.value.startsWith('zh') ? '全选(Multiple/Extended)' : 'select all (Multiple/Extended)' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          :label="labelLayout"
          type="select"
          v-model="layoutOption"
          :options="[
            { label: 'Stack', value: 'Stack' },
            { label: 'UniformGrid', value: 'UniformGrid' },
          ]"
        />
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
        <DemoOptionRow :label="labelInvoke" type="toggle" v-model="invokeOption" />
        <DemoOptionRow :label="labelEmpty" type="toggle" v-model="emptyOption" />
        <DemoOptionRow :label="labelItemWidth" type="slider" v-model="widthOption" :min="80" :max="260" :step="10" />
        <DemoOptionRow :label="labelItemHeight" type="slider" v-model="heightOption" :min="60" :max="220" :step="10" />
        <DemoOptionRow :label="labelMaxCols" type="slider" v-model="maxColsOption" :min="0" :max="8" :step="1" />
        <DemoOptionRow :label="labelGridSpacing" type="slider" v-model="gridSpacingOption" :min="0" :max="32" :step="2" />
        <DemoOptionRow :label="labelStackSpacing" type="slider" v-model="stackSpacingOption" :min="0" :max="24" :step="2" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsKeyboardTitle }}</h3>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.itemsview-stage {
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

/* —— 演示一 / 三:文件行(徽标 + 名称 + 元信息)—— */
.file-row {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.file-badge {
  flex: none;
  min-width: 38px;
  padding: 2px 5px;
  box-sizing: border-box;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-align: center;
  /* MR10/W3(a11y 对比度):徽标底为演示数据的彩色实色,原字色
     --wui-system-control-foreground-alt-high 随主题翻转(浅白/深黑),两主题各有
     一组底色不达标(浅色白字最低 2.58:1 / 深色黑字最低 2.80:1)。统一改用
     双主题恒白的 chrome-white 前景 token,并把底色明度 45% → 32%,最暗组合
     (ZIP 黄)对白字 4.81:1,10 个色相全部 ≥4.5:1 */
  color: var(--wui-system-control-foreground-chrome-white);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.file-name {
  overflow: hidden;
  color: var(--wui-application-foreground-theme);
  font-size: var(--wui-control-content-theme-font-size);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  flex: none;
  margin-left: auto;
  color: var(--wui-application-secondary-foreground-theme);
  font-size: var(--wui-tool-tip-content-theme-font-size);
  white-space: nowrap;
}

.file-meta + .file-meta {
  margin-left: 0;
}

/* —— 演示二:照片瓦片(UniformToFill 图 + 底部说明条,对照官方模板)—— */
.photo-tile {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 60px;
  overflow: hidden;
}

.photo-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  height: 30px;
  padding: 2px 6px;
  background: var(--wui-system-control-background-chrome-medium);
  opacity: 0.85;
}

.photo-title {
  overflow: hidden;
  color: var(--wui-application-foreground-theme);
  font-size: var(--wui-control-content-theme-font-size);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-likes {
  margin-left: auto;
  color: var(--wui-application-secondary-foreground-theme);
  font-size: var(--wui-tool-tip-content-theme-font-size);
  white-space: nowrap;
}

/* —— 演示三:空态 —— */
.empty-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--wui-application-secondary-foreground-theme);
  font-size: var(--wui-control-content-theme-font-size);
}

.empty-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--wui-application-secondary-foreground-theme);
  font-size: 18px;
  background: var(--wui-system-control-background-base-low);
  border-radius: 50%;
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
