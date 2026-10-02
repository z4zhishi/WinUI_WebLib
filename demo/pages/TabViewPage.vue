<script setup lang="ts">
// TabViewPage.vue —— TabView 控件示例页(结构照抄 HomePage 母版)。
// 参数组合对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/TabView/TabViewPage.xaml:
//   1. TabviewTabviewitemsDefinedMarkup(Document 0/1/2 + SymbolIcon 图标 + TabCloseRequested 移除);
//   2. TabviewSupportAddingClosing / 键盘加速器示例(AddTabButtonClick 新建 Document N、Ctrl+T/Ctrl+W
//      / Ctrl+1..9 键盘语义,Web 端 Ctrl+Tab 与方向键见页面文案);
//   3. TabViewTabWidthsEitherBe(Home / Tab 2 Has Longer Text / Third Tab,IsClosable=False,
//      TabWidthBehavior 下拉切 SizeToContent/Equal/Compact —— 对照源三模式;官方派发单写的是
//      SizeToHeader,源实际第三模式为 Compact,以源为准);
//   4. TabViewCloseButtonBePersistent(CloseButtonOverlayMode:Auto / Always / OnHover);
//   5. closing 可取消(Deferral 简化):「说明」页 @closing 内置 cancel 演示取消,「确认后关闭」页
//      getDeferral() 异步判定后放行(对照 TabViewItem.Closing + Deferral 语义)。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import type { TabViewTabClosingEventArgs } from '@/components/TabViewItem.vue'
import type { TabViewTabCloseRequestedEventArgs } from '@/components/TabView.vue'
import WuiTabView from '@/components/TabView.vue'
import WuiTabViewItem from '@/components/TabViewItem.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const selectedIndex = ref<string | number | boolean>(0)
const disabled = ref<string | number | boolean>(false)
const tabWidthMode = ref<string | number | boolean>('SizeToContent')
const isAddTabButtonVisible = ref<string | number | boolean>(true)
const closeButtonOverlayMode = ref<string | number | boolean>('Auto')

const selectedIndexValue = computed({
  get: () => Number(selectedIndex.value),
  set: (value: number) => {
    selectedIndex.value = value
  },
})
const disabledValue = computed(() => disabled.value === true)
const addTabVisibleValue = computed(() => isAddTabButtonVisible.value !== false)
const closeOverlayValue = computed<'Auto' | 'Always' | 'OnHover'>(() => {
  const value = closeButtonOverlayMode.value
  return value === 'Always' || value === 'OnHover' ? value : 'Auto'
})

// —— 图标字形(Segoe Fluent Icons;Demo 页经 script 常量绑定,模板属性不做 JS 转义)——
const ICON_DOCUMENT = '\uE8A5' // Document
const ICON_HOME = '\uE80F' // Home
const ICON_MUSIC = '\uEC4F' // MusicInfo
const ICON_INFO = '\uE946' // Info
const ICON_LOCK = '\uE72E' // Lock
const ICON_CHECK = '\uE73E' // CheckMark

// —— 示例 1:官方 markup-defined items(Document 0/1/2)+ 关闭事件日志 ——
const lastEvent = ref('—')

function onSelectionChanged(args: { index: number }): void {
  lastEvent.value = `selectionChanged { index: ${args.index} }`
}

function onTabCloseRequested(args: TabViewTabCloseRequestedEventArgs): void {
  // 官方示例语义:sender.TabItems.Remove(args.Tab) —— Web 端按子项 header 定位并从数据源移除
  lastEvent.value = `tabCloseRequested { index: ${args.index} }`
  const header = (args.item as { props?: { header?: string } } | undefined)?.props?.header
  const at = typeof header === 'string' ? docs.value.findIndex((doc) => doc.header === header) : -1
  if (at >= 0) docs.value.splice(at, 1)
}

interface DocTab {
  id: number
  header: string
  icon: string
  body: string
}

const docs = ref<DocTab[]>([
  { id: 0, header: 'Document 0', icon: ICON_DOCUMENT, body: 'Document 0 的内容(官方示例:SamplePage1)。' },
  { id: 1, header: 'Document 1', icon: ICON_DOCUMENT, body: 'Document 1 的内容(官方示例:SamplePage2)。' },
  { id: 2, header: 'Document 2', icon: ICON_DOCUMENT, body: 'Document 2 的内容(官方示例:SamplePage3)。' },
])

// —— 示例 2:动态增删关(官方 AddTabButtonClick 新建 Document N;Ctrl+T / Ctrl+W 键盘语义)——
const docCount = ref(3)

function addDocument(): void {
  const id = docCount.value
  docs.value.push({
    id,
    header: `Document ${id}`,
    icon: ICON_DOCUMENT,
    body: `Document ${id} 的内容(AddTabButtonClick 新建)。`,
  })
  docCount.value = id + 1
  selectedIndex.value = docs.value.length - 1
}

// —— 示例 3:宽度模式(官方 TabViewTabWidthsEitherBe:三个 IsClosable=False 固定标签)——
const widthModePages = [
  { header: 'Home', icon: ICON_HOME, body: 'Home 页(官方示例:Symbol=Home)。' },
  { header: 'Tab 2 Has Longer Text', icon: ICON_MUSIC, body: 'Tab 2 页(官方示例:Symbol=MusicInfo)。' },
  { header: 'Third Tab', icon: ICON_DOCUMENT, body: 'Third Tab 页(官方示例:Symbol=Placeholder)。' },
]
const widthModeValue = computed(() => {
  const value = tabWidthMode.value
  return value === 'Equal' || value === 'Compact' ? value : 'SizeToContent'
})

// 注意:组件默认宽度模式为 Equal(源 TabView.idl [MUX_DEFAULT_VALUE]),本页参数面板初始显式选
// SizeToContent 仅作演示参数,不代表控件默认值。

// —— 示例 4:closing 可取消(Deferral 简化,完整闭环)——
// 对照源 RequestCloseTab 语义:点击 X → closing(cancel 拒绝 / getDeferral 挂起)→ complete() 放行
// → tabCloseRequested → 从数据源移除该页(本例动态数组,确认后标签真实消失)。
interface ClosingTab {
  id: number
  header: string
  icon: string
  body: string
  mode: 'protected' | 'confirm'
}

const closingTabs = ref<ClosingTab[]>([
  {
    id: 0,
    header: '受保护页',
    icon: ICON_LOCK,
    body: '试试关闭这一页 —— @closing 置 cancel = true,标签保留(WinUI Closing 事件取消语义)。',
    mode: 'protected',
  },
  {
    id: 1,
    header: '确认后关闭',
    icon: ICON_CHECK,
    body: '点 X 发起关闭:closing 挂起 Deferral 并出现内联确认面板;确认后才经 tabCloseRequested 移除本页。',
    mode: 'confirm',
  },
])
const closingLog = ref('—')

interface PendingClose {
  id: number
  args: TabViewTabClosingEventArgs
  deferral: { complete(): void }
}
const pendingClose = ref<PendingClose | null>(null)

/** 示例 4 的 @closing 分发:受保护页直接取消;确认页挂起 Deferral 等待用户确认。 */
function onDemoClosing(tab: ClosingTab, args: TabViewTabClosingEventArgs): void {
  if (tab.mode === 'protected') {
    args.cancel = true
    closingLog.value = 'closing → cancel = true(已取消关闭)'
    return
  }
  pendingClose.value = { id: tab.id, args, deferral: args.getDeferral() }
  closingLog.value = 'closing → getDeferral() 挂起(等待用户确认)'
}

/** 确认:complete() 放行 → 提交 tabCloseRequested → 从数据源移除。 */
function confirmClose(): void {
  if (!pendingClose.value) return
  closingLog.value = 'closing → deferral.complete()(已放行)'
  pendingClose.value.deferral.complete()
}

/** 取消:置 cancel 后 complete() 结束 Deferral,标签保留。 */
function cancelClose(): void {
  if (!pendingClose.value) return
  pendingClose.value.args.cancel = true
  pendingClose.value.deferral.complete()
  pendingClose.value = null
  closingLog.value = 'closing → cancel = true(已取消关闭)'
}

/** 示例 4 的 tabCloseRequested:按 header 定位并移除(对照官方示例 TabItems.Remove(args.Tab))。 */
function onClosingDemoTabCloseRequested(args: TabViewTabCloseRequestedEventArgs): void {
  const header = (args.item as { props?: { header?: string } } | undefined)?.props?.header
  const at = typeof header === 'string' ? closingTabs.value.findIndex((tab) => tab.header === header) : -1
  if (at >= 0) closingTabs.value.splice(at, 1)
  pendingClose.value = null
  closingLog.value = 'tabCloseRequested → 已从数据源移除该页'
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['TabWidthMode', `'SizeToContent' | 'Equal' | 'Compact'`, `宽度模式,默认 Equal(源 TabView.idl [MUX_DEFAULT_VALUE];对照源三模式,官方派发单所写 SizeToHeader 实为源 Compact,见 wiki)(下拉实时切换)`],
  ['SelectedIndex', 'number(v-model:selected-index)', '当前选中页下标,双向绑定(滑块实时联动,越界自动收敛)'],
  ['IsAddTabButtonVisible', 'boolean', '是否显示加号按钮,默认 true(开关实时切换)'],
  ['CanReorderTabs', 'boolean', '是否允许拖拽重排标签,默认 true(Pointer 指针拖拽,重排为组件内部展示顺序)'],
  ['CloseButtonOverlayMode', `'Auto' | 'Always' | 'OnHover'`, '关闭按钮显隐:OnHover 仅悬停/选中显示,Auto/Always 恒显(对照源 UpdateCloseButton)'],
  ['Disabled', 'boolean', '禁用(WinUI IsEnabled=false):标签/加号/关闭/滚动按钮与键盘全部失效'],
  ['AddTabButtonClick', '() => void', '点击加号按钮时触发(应用负责向数据源追加,对照官方示例 TabItems.Add)'],
  ['TabDragStarting', '(e: { index, item }) => void', '拖拽开始时触发(源 TabDragStarting;拖动中标签透明度 0.80 @240ms、悬停目标 0.50 @240ms、方向提示 10px/0.2s 恢复)'],
  ['TabDragCompleted', '(e: { index, item }) => void', '拖拽结束(松手/取消)时触发,index 为落定后的新下标(重排已提交)'],
  ['TabDroppedOutside', '(e: { index, item }) => void', '在标签条之外松手时触发,标签不重排(事件序:先 TabDragCompleted 后 TabDroppedOutside,对照源 DropResult=None 分支)'],
  ['TabCloseRequested', '(e: { index, item }) => void', '关闭流程提交后触发(closing 未被取消且 Deferral 完成);应用负责移除该页'],
  ['SelectionChanged', '(e: { index, item }) => void', '选中页变化时触发(点击 / Enter/Space / Ctrl+Tab / 程序化)'],
  ['closing(TabViewItem)', '(e: { cancel, getDeferral }) => void', '关闭发起时触发:cancel=true 取消;getDeferral() 暂缓提交直至 complete(),放行后经 tabCloseRequested 由应用移除(WinUI Closing + Deferral 的 Web 简化)'],
  ['默认 slot(TabView)', '—', '声明 <WuiTabViewItem header="…"> 子项即一页,支持响应式数组 v-for 动态增删'],
  ['#header(TabViewItem)', '—', '自定义页头内容(WinUI HeaderTemplate 的等价);header prop 为文本用法'],
]

// 用法代码随参数实时更新(引号规则:外双内单,放 computed)。
const usageCode = computed(
  () => `<WuiTabView
  v-model:selected-index="selectedIndex"
  tab-width-mode="${widthModeValue.value}"
  :is-add-tab-button-visible="${addTabVisibleValue.value}"
  :close-button-overlay-mode="'${closeButtonOverlayMode.value}'"
  :disabled="${disabledValue.value}"
  @add-tab-button-click="addDocument"
  @tab-close-requested="onTabCloseRequested">
  <WuiTabViewItem header="Document 0" icon="\uE8A5">Document 0 的内容。</WuiTabViewItem>
  <WuiTabViewItem header="Document 1" icon="\uE8A5" :is-closable="false">不可关闭页。</WuiTabViewItem>
  <!-- closing 可取消:cancel 拒绝,或 getDeferral() 挂起、complete() 放行后经 tabCloseRequested 移除 -->
  <WuiTabViewItem header="受保护页" @closing="(e) => (e.cancel = true)">cancel 取消关闭。</WuiTabViewItem>
</WuiTabView>`,
)
</script>

<template>
  <DemoPage wiki="TabView"
    title="TabView"
    description="文档式标签页控件:标签条点击/键盘切换页面,加号按钮新建、X 关闭(closing 可取消,支持 Deferral 异步判定),标签过多时溢出滚动,并支持拖拽重排与三种宽度模式。典型场景为多文档界面(MDI)与浏览器式标签。"
  >
    <template #demo>
      <div class="tabview-stage">
        <div class="tabview-example">
          <!-- 官方示例 1+2 合流:markup-defined items + 动态增删关 + 参数面板联动 -->
          <WuiTabView
            v-model:selected-index="selectedIndexValue"
            class="tabview-demo-main"
            :tab-width-mode="widthModeValue"
            :is-add-tab-button-visible="addTabVisibleValue"
            :close-button-overlay-mode="closeOverlayValue"
            :disabled="disabledValue"
            @add-tab-button-click="addDocument"
            @tab-close-requested="onTabCloseRequested"
            @selection-changed="onSelectionChanged"
          >
            <WuiTabViewItem v-for="doc in docs" :key="doc.id" :header="doc.header" :icon="doc.icon">
              <p class="tabview-body">{{ doc.body }}</p>
            </WuiTabViewItem>
          </WuiTabView>
          <p class="tabview-state">
            SelectedIndex = {{ selectedIndexValue }} · 共 {{ docs.length }} 页 · 最近事件:<code>{{ lastEvent }}</code>
          </p>
          <p class="tabview-caption">
            键盘:Ctrl+Tab / Ctrl+Shift+Tab 切换、方向键移动标签焦点(Enter/Space 选中)、Home/End 跳到首尾;
            浏览器通常保留 Ctrl+T / Ctrl+W 给自身标签页,Web 端由 Ctrl+Tab 承担切换语义。
          </p>
        </div>

        <div class="tabview-example">
          <!-- 官方示例:TabViewTabWidthsEitherBe(固定不可关闭标签 + 宽度行为切换) -->
          <WuiTabView class="tabview-demo-width" tab-width-mode="SizeToContent" :is-add-tab-button-visible="false">
            <WuiTabViewItem v-for="page in widthModePages" :key="page.header" :header="page.header" :icon="page.icon" :is-closable="false">
              <p class="tabview-body">{{ page.body }}</p>
            </WuiTabViewItem>
          </WuiTabView>
          <p class="tabview-caption">
            官方 TabWidthBehavior 示例(主示例宽度模式由上方参数面板实时切换):IsClosable=False
            隐藏关闭按钮;Equal 模式下三个标签等分剩余宽度(clamp 100–240px),Compact 模式下非选中页仅显示图标。
          </p>
        </div>

        <div class="tabview-example">
          <!-- closing 可取消(Deferral 简化)完整闭环:cancel 拒绝 / Deferral 挂起 → 确认 → 移除 -->
          <WuiTabView class="tabview-demo-closing" @tab-close-requested="onClosingDemoTabCloseRequested">
            <WuiTabViewItem header="说明" :icon="ICON_INFO" :is-closable="false">
              <p class="tabview-body">
                「受保护页」的 @closing 置 cancel = true,X 永远关不掉;「确认后关闭」挂起 Deferral,
                确认后才经 tabCloseRequested 从数据源移除(WinUI Closing + Deferral 语义的 Web 简化)。
              </p>
            </WuiTabViewItem>
            <WuiTabViewItem
              v-for="tab in closingTabs"
              :key="tab.id"
              :header="tab.header"
              :icon="tab.icon"
              @closing="onDemoClosing(tab, $event)"
            >
              <p class="tabview-body">{{ tab.body }}</p>
              <div v-if="pendingClose && pendingClose.id === tab.id" class="tabview-confirm" role="group" aria-label="确认关闭标签">
                <span class="tabview-confirm-text">确认关闭「{{ tab.header }}」?(closing Deferral 挂起中)</span>
                <WuiButton class="tabview-tool" @click="confirmClose">确认关闭</WuiButton>
                <WuiButton class="tabview-tool" @click="cancelClose">取消</WuiButton>
              </div>
            </WuiTabViewItem>
          </WuiTabView>
          <p class="tabview-caption">最近 closing 事件:<code>{{ closingLog }}</code></p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="SelectedIndex" type="slider" v-model="selectedIndex" :min="0" :max="Math.max(docs.length - 1, 0)" :step="1" />
        <DemoOptionRow
          label="TabWidthMode 宽度模式"
          type="select"
          v-model="tabWidthMode"
          :options="[
            { label: 'SizeToContent', value: 'SizeToContent' },
            { label: 'Equal', value: 'Equal' },
            { label: 'Compact', value: 'Compact' },
          ]"
        />
        <DemoOptionRow
          label="CloseButtonOverlayMode"
          type="select"
          v-model="closeButtonOverlayMode"
          :options="[
            { label: 'Auto', value: 'Auto' },
            { label: 'Always', value: 'Always' },
            { label: 'OnHover', value: 'OnHover' },
          ]"
        />
        <DemoOptionRow label="IsAddTabButtonVisible" type="toggle" v-model="isAddTabButtonVisible" />
        <DemoOptionRow label="Disabled 禁用" type="toggle" v-model="disabled" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.tabview-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.tabview-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* 官方示例 MinHeight 475 的等观感压缩版 */
.tabview-demo-main {
  width: 640px;
  max-width: 100%;
  min-height: 180px;
}

.tabview-demo-width {
  width: 640px;
  max-width: 100%;
  min-height: 120px;
}

.tabview-demo-closing {
  width: 640px;
  max-width: 100%;
  min-height: 120px;
}

.tabview-body {
  margin: 0;
  padding: 8px 0 16px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.tabview-state {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.tabview-state code {
  color: var(--wui-default-text-foreground-theme);
}

.tabview-caption {
  margin: 0;
  max-width: 640px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  line-height: 1.6;
  color: var(--wui-application-secondary-foreground-theme);
}

.tabview-caption code {
  color: var(--wui-default-text-foreground-theme);
}

/* 示例 4 的内联确认面板(closing Deferral 挂起期间) */
.tabview-confirm {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 8px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: var(--wui-flyout-presenter-background);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.tabview-confirm-text {
  min-width: 0;
}

/* 确认/取消按钮:WuiButton 承担视觉状态,这里仅约束密度 */
.tabview-tool {
  padding: 4px 12px;
}
</style>
