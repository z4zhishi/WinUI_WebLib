<script setup lang="ts">
// BreadcrumbBar 示例页:对照官方 WinUI Gallery BreadcrumbBarPage 两例复刻 ——
// 示例一 = 字符串路径 + 容器宽度可调(收窄即从根侧折叠成省略号,点开下拉可回溯,
// 对应官方 "Resize to see the nodes crumble, starting at the root");
// 示例二 = 自定义项模板(Folder 对象 + default slot)+ 节点增删(点击节点截断到该层,
// 对应官方 BreadcrumbbarControlCustomDatatemplate 的 ItemClicked 移除后续节点 + Reset)。
import { computed, ref } from 'vue'
import WuiBreadcrumbBar from '@/components/BreadcrumbBar.vue'
import WuiButton from '@/components/Button.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'BreadcrumbBar', en: 'BreadcrumbBar' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI BreadcrumbBar 控件示例:横向展示到达当前位置的导航路径。收窄容器宽度可见节点自根部起逐个折叠为头部省略号,点开省略号下拉可回到被折叠节点;最后一项为当前位置、不可点击。上半区参数实时调节,下半区为文档与键盘说明。',
  en: 'WinUI BreadcrumbBar examples: a horizontal trail of navigation to the current location. Narrow the container to crumble nodes into the leading ellipsis (drop it open to go back); the last item is the current location and not clickable. Options above, docs and keyboard guide below.',
}
const GROUP_PATH: BilingualText = { zh: '文件路径导航(溢出折叠 + 下拉回溯)', en: 'File path navigation (overflow crumble + dropdown)' }
const GROUP_EDIT: BilingualText = { zh: '自定义项模板 + 节点增删', en: 'Custom item template + add/remove nodes' }
const LABEL_CONTAINER_WIDTH: BilingualText = { zh: '容器宽度(演示一)', en: 'Container width (demo 1)' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(演示一)', en: 'Disabled (demo 1)' }
const LABEL_ADD_NODE: BilingualText = { zh: '增加节点', en: 'Add node' }
const LABEL_RESET: BilingualText = { zh: '重置', en: 'Reset' }
const LABEL_LAST_CLICKED: BilingualText = { zh: '最近点击', en: 'Last clicked' }
const LABEL_SELECTED: BilingualText = { zh: '选中项', en: 'Selected item' }
const LABEL_CURRENT_PATH: BilingualText = { zh: '当前路径', en: 'Current path' }
// 两例的 nav 地标名须互不相同(axe landmark-unique:同角色同名地标视为违规)
const LABEL_BREADCRUMB_PATH: BilingualText = { zh: '路径面包屑导航', en: 'Path breadcrumb navigation' }
const LABEL_BREADCRUMB_FOLDER: BilingualText = { zh: '文件夹面包屑导航', en: 'Folder breadcrumb navigation' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupPath = useBilingual(i18n, GROUP_PATH)
const groupEdit = useBilingual(i18n, GROUP_EDIT)
const labelContainerWidth = useBilingual(i18n, LABEL_CONTAINER_WIDTH)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelAddNode = useBilingual(i18n, LABEL_ADD_NODE)
const labelReset = useBilingual(i18n, LABEL_RESET)
const labelLastClicked = useBilingual(i18n, LABEL_LAST_CLICKED)
const labelSelected = useBilingual(i18n, LABEL_SELECTED)
const labelCurrentPath = useBilingual(i18n, LABEL_CURRENT_PATH)
const labelBreadcrumbPath = useBilingual(i18n, LABEL_BREADCRUMB_PATH)
const labelBreadcrumbFolder = useBilingual(i18n, LABEL_BREADCRUMB_FOLDER)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 参数面板(DemoOptionRow 的 v-model 契约要求联合类型,见 demo/components/README.md)——
const demoContainerWidth = ref<string | number | boolean>(520)
const demoDisabled = ref<string | number | boolean>(false)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const containerWidthValue = computed(() => toNumber(demoContainerWidth.value, 520))
const disabledValue = computed(() => demoDisabled.value === true)

/* -------------------------------------------------------------------------
 * 演示一:字符串路径(对照官方 FoldersString;点击只回显,不改数据源)
 * ---------------------------------------------------------------------- */

const pathItems = ref<string[]>(['Home', 'Documents', 'Design', 'Northwind', 'Images', 'Folder1', 'Folder2', 'Folder3'])

const lastClicked1 = ref('—')
const selectedItem1 = ref<unknown>(undefined)

function onPathItemClicked(args: { item: unknown; index: number }): void {
  lastClicked1.value = `index=${args.index}, item=${String(args.item)}`
}

/* -------------------------------------------------------------------------
 * 演示二:Folder 对象 + 自定义项模板 + 增删(对照官方示例 ItemClicked 截断)
 * ---------------------------------------------------------------------- */

interface FolderNode {
  name: string
}

function makeDefaultFolders(): FolderNode[] {
  return [{ name: 'Home' }, { name: 'Folder1' }, { name: 'Folder2' }, { name: 'Folder3' }]
}

const folders = ref<FolderNode[]>(makeDefaultFolders())
const nextFolderNumber = ref(4)

// 官方示例语义:点击节点 = 导航到该层,移除其后的所有节点(ItemsSource 就地截断)
function onFolderClicked(args: { item: unknown; index: number }): void {
  folders.value = folders.value.slice(0, args.index + 1)
}

function addFolder(): void {
  folders.value = [...folders.value, { name: `Folder${nextFolderNumber.value}` }]
  nextFolderNumber.value += 1
}

function resetFolders(): void {
  folders.value = makeDefaultFolders()
  nextFolderNumber.value = 4
}

const currentPathText = computed(() => folders.value.map((folder) => folder.name).join(' › '))

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['itemsSource', 'unknown[]', '[]', '数据源数组(路径节点序列,首项为根);支持就地增删,溢出折叠自动重算'],
  ['v-model:selected-item', 'unknown', 'undefined', '选中项(Web 侧增补;点击任一节点时写入,WinUI 无此属性)'],
  ['disabled', 'boolean', 'false', '禁用整个控件:各项不可点、不可聚焦,不触发 itemClicked'],
  ['ellipsis-aria-label', 'string', "'More items'", '省略号按钮与其下拉的无障碍名称(多语言站可传入本地化文案)'],
  ['nav-aria-label', 'string', "'面包屑导航'", '根 nav 地标的无障碍名;同页多个 BreadcrumbBar 时传入互不相同的区分性文案(landmark 唯一性)'],
  ['slot(default)', '{ item, index }', '—', '项模板(WinUI ItemTemplate);缺省渲染 String(item)'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['itemClicked', '{ item, index }', '点击内联节点或省略号下拉节点时触发(下拉项回传其在 itemsSource 中的真实下标);最后一项为当前位置,不可点击、不触发'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['← / →', '在可见节点(含头部省略号)间移动焦点;到边界不环绕,焦点走出控件'],
  ['Enter / Space', '激活当前节点(非末项);焦点在省略号上时打开下拉'],
  ['↓', '在省略号上打开下拉'],
  ['↑ / ↓', '下拉内项间循环移动(最近被折叠的节点在顶部,根在最下)'],
  ['Home / End', '下拉内移到首 / 末项'],
  ['Esc', '关闭下拉,焦点归还省略号按钮'],
  ['Tab', '下拉打开时关闭下拉;否则自然移出控件'],
]

const usageCode = computed(
  () => `<WuiBreadcrumbBar :items-source="['Home', 'Documents', 'Design']" @item-clicked="onItemClicked" />

<!-- 自定义项模板(WinUI ItemTemplate)-->
<WuiBreadcrumbBar :items-source="folders">
  <template #default="{ item }">{{ item.name }}</template>
</WuiBreadcrumbBar>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="BreadcrumbBar">
    <template #demo>
      <div class="breadcrumb-stage">
        <!-- 演示一:字符串路径 + 容器宽度可调(收窄看节点折叠,下拉回溯) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupPath }}</h3>
          <div class="path-container" :style="{ width: `${containerWidthValue}px` }">
            <WuiBreadcrumbBar
              :items-source="pathItems"
              :disabled="disabledValue"
              :nav-aria-label="labelBreadcrumbPath"
              v-model:selected-item="selectedItem1"
              @item-clicked="onPathItemClicked"
            />
          </div>
          <p class="demo-output">
            {{ labelLastClicked }}: {{ lastClicked1 }} · {{ labelSelected }}: {{ selectedItem1 === undefined ? '—' : String(selectedItem1) }}
          </p>
        </section>

        <!-- 演示二:自定义项模板 + 节点增删(点击节点截断到该层,官方示例同款交互) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupEdit }}</h3>
          <div class="folder-row">
            <WuiBreadcrumbBar
              class="folder-breadcrumb"
              :items-source="folders"
              :nav-aria-label="labelBreadcrumbFolder"
              @item-clicked="onFolderClicked"
            >
              <template #default="{ item }">{{ (item as { name: string }).name }}</template>
            </WuiBreadcrumbBar>
            <WuiButton :content="labelAddNode" @click="addFolder" />
            <WuiButton :content="labelReset" @click="resetFolders" />
          </div>
          <p class="demo-output">{{ labelCurrentPath }}: {{ currentPathText }}</p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          :label="labelContainerWidth"
          type="slider"
          v-model="demoContainerWidth"
          :min="220"
          :max="760"
          :step="10"
        />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
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
.breadcrumb-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: stretch;
  gap: 32px;
}

.demo-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.group-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* 容器宽度由参数面板实时调节:收窄即可看到节点自根部折叠为省略号 */
.path-container {
  max-width: 100%;
  padding: 4px 8px;
  background: var(--wui-application-page-background-theme);
  border: 1px dashed var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.folder-row {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  min-width: 0;
}

.folder-breadcrumb {
  min-width: 0;
}

/* 对照官方示例每例的输出 TextBlock:轻量回显 */
.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  overflow-wrap: anywhere;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
