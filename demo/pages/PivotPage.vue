<script setup lang="ts">
// PivotPage.vue —— Pivot 控件示例页(结构照抄 HomePage 母版)。
// 参数组合对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/Pivot/PivotPage.xaml(仅 BasicPivot:
//   Title="EMAIL" + All/Unread/Flagged/Urgent 四页);另按任务规格补充:动态增删页(响应式数组
//   v-for 声明式组合,限宽容器演示标题行溢出时的左右导航箭头)、内容状态保留(非选中页收起而非销毁,
//   对照源 UpdateItemVisibility 的 Visibility 切换语义)、selectionChanged 事件日志与
//   selectedIndex / selectedItem 双向绑定读数。
import { computed, ref } from 'vue'
import type { VNode } from 'vue'
import WuiPivot from '@/components/Pivot.vue'
import WuiPivotItem from '@/components/PivotItem.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 示例 1:官方基础 Pivot(Title = "EMAIL",四页)——
const MAIN_COUNT = 4

const mainTitles = ['All', 'Unread', 'Flagged', 'Urgent']
const mainBodies = [
  '所有邮件都显示在这里。(官方示例:all emails go here.)',
  '未读邮件都显示在这里。(官方示例:unread emails go here.)',
  '已标记邮件都显示在这里。(官方示例:flagged emails go here.)',
  '紧急邮件都显示在这里。(官方示例:urgent emails go here.)',
]

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const selectedIndex = ref<string | number | boolean>(0)
const disabled = ref<string | number | boolean>(false)

const boundSelectedIndex = computed({
  get: () => Number(selectedIndex.value),
  set: (value: number) => {
    selectedIndex.value = value
  },
})
const disabledValue = computed(() => disabled.value === true)

// —— selectionChanged 事件日志 + selectedItem(v-model)读数 ——
const lastEvent = ref('—')
const boundSelectedItem = ref<unknown>(null)

function onSelectionChanged(payload: { index: number; item: unknown }): void {
  lastEvent.value = `selectionChanged { index: ${payload.index} }`
}

const selectedItemLabel = computed(() => {
  const value = boundSelectedItem.value
  if (value !== null && typeof value === 'object' && 'props' in (value as object)) {
    const title = (value as VNode).props?.['title']
    return `<WuiPivotItem title="${String(title)}">`
  }
  return '—'
})

// —— 示例 2:动态增删(响应式数组 v-for 声明式组合;限宽容器让标题行溢出 → 悬停显示导航箭头)——
interface Section {
  id: number
  title: string
}

let nextSectionId = 6
const sections = ref<Section[]>([
  { id: 1, title: '收件箱' },
  { id: 2, title: '已发送邮件' },
  { id: 3, title: '草稿箱' },
  { id: 4, title: '已删除邮件' },
  { id: 5, title: '垃圾邮件' },
])
const dynamicIndex = ref(0)

function addSectionAtEnd(): void {
  sections.value.push({ id: nextSectionId, title: `新建文件夹 ${nextSectionId}` })
  nextSectionId += 1
}

function insertSectionBeforeCurrent(): void {
  const at = Math.min(Math.max(dynamicIndex.value, 0), sections.value.length)
  sections.value.splice(at, 0, { id: nextSectionId, title: `新建文件夹 ${nextSectionId}` })
  nextSectionId += 1
}

function removeCurrentSection(): void {
  if (sections.value.length === 0) return
  sections.value.splice(Math.min(dynamicIndex.value, sections.value.length - 1), 1)
}

const dynamicBoundIndex = computed({
  get: () => dynamicIndex.value,
  set: (value: number) => {
    dynamicIndex.value = value
  },
})

// —— 示例 3:内容状态保留(非选中页收起而非销毁:切走再切回,计数不丢失)——
const keepCounts = ref([0, 0, 0])
const keepIndex = ref(0)
const keepTitles = ['计数器 A', '计数器 B', '计数器 C']

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['Title', 'string', '控件标题,显示在标题行上方(14px 粗体);未设置则收起'],
  ['SelectedIndex', 'number(v-model:selected-index)', '当前页下标,双向绑定(滑块实时联动,越界自动收敛)'],
  ['SelectedItem', 'unknown(v-model:selected-item)', '当前页对应项(默认 slot 模式即 PivotItem 的 VNode);写入按引用 / key 匹配'],
  ['Disabled', 'boolean', '禁用(WinUI IsEnabled=false):标题项呈 Disabled 色,导航箭头隐藏(开关实时切换)'],
  ['ariaLabelPrevious / ariaLabelNext', 'string', '左右导航箭头的 aria-label,默认 Previous / Next'],
  ['SelectionChanged', '(e: { index, item }) => void', '选中页变化时触发(标题点击 / 方向键 / 导航箭头 / 程序化)'],
  ['默认 slot', '—', '声明 <WuiPivotItem title="…"> 子项即分页,支持响应式数组 v-for 动态增删'],
  ['#title slot', '{ title }', '自定义标题区内容(WinUI TitleTemplate 的等价)'],
]

// 用法代码随参数实时更新(引号规则:外双内单,放 computed)。
const usageCode = computed(
  () => `<WuiPivot
  title="EMAIL"
  v-model:selected-index="selectedIndex"
  :disabled="${disabledValue.value}"
  @selection-changed="onSelectionChanged">
  <WuiPivotItem title="All">all emails go here.</WuiPivotItem>
  <WuiPivotItem title="Unread">unread emails go here.</WuiPivotItem>
  <WuiPivotItem title="Flagged">flagged emails go here.</WuiPivotItem>
  <WuiPivotItem title="Urgent">urgent emails go here.</WuiPivotItem>
</WuiPivot>`,
)
</script>

<template>
  <DemoPage wiki="Pivot"
    title="Pivot"
    description="选项卡式分页控件:标题行点击或左右方向键切换分页,内容即时切换(WinUI Pivot 默认无内容动画)。悬停标题行且标题溢出时显示左右导航箭头(端点方向自动隐藏)。注意:Windows 11 设计模式推荐改用 SelectorBar,Pivot 仅建议用于维持既有 UWP 视觉的场景。"
  >
    <template #demo>
      <div class="pivot-stage">
        <div class="pivot-example">
          <!-- 官方示例:Title="EMAIL" + All/Unread/Flagged/Urgent 四页 + 参数面板联动 -->
          <WuiPivot
            v-model:selected-index="boundSelectedIndex"
            v-model:selected-item="boundSelectedItem"
            title="EMAIL"
            :disabled="disabledValue"
            class="pivot-demo-main"
            aria-label-previous="上一页"
            aria-label-next="下一页"
            @selection-changed="onSelectionChanged"
          >
            <WuiPivotItem v-for="(itemTitle, index) in mainTitles" :key="itemTitle" :title="itemTitle">
              <p class="pivot-body">{{ mainBodies[index] }}</p>
            </WuiPivotItem>
          </WuiPivot>
          <p class="pivot-state">
            SelectedIndex = {{ boundSelectedIndex }} · SelectedItem =
            <code>{{ selectedItemLabel }}</code> · 最近事件:<code>{{ lastEvent }}</code>
          </p>
        </div>

        <div class="pivot-example">
          <!-- 动态增删:响应式数组驱动声明式子项;限宽容器演示标题溢出时的导航箭头 -->
          <WuiPivot v-model:selected-index="dynamicBoundIndex" class="pivot-demo-dynamic">
            <WuiPivotItem v-for="section in sections" :key="section.id" :title="section.title">
              <p class="pivot-body">
                {{ section.title }}的内容(动态页 #{{ section.id }};把窗口/容器压窄,标题行溢出后悬停可见左右箭头)
              </p>
            </WuiPivotItem>
          </WuiPivot>
          <div class="pivot-toolbar" role="group" aria-label="动态增删操作">
            <button type="button" class="pivot-tool" @click="addSectionAtEnd">尾部添加页</button>
            <button type="button" class="pivot-tool" @click="insertSectionBeforeCurrent">当前页前插入</button>
            <button type="button" class="pivot-tool" :disabled="sections.length === 0" @click="removeCurrentSection">
              删除当前页
            </button>
          </div>
          <p class="pivot-caption">
            共 {{ sections.length }} 页 · SelectedIndex = {{ dynamicIndex }}(删除当前页时下标自动收敛到有效区间)
          </p>
        </div>

        <div class="pivot-example">
          <!-- 内容状态保留:非选中页收起而非销毁(对照源 UpdateItemVisibility) -->
          <WuiPivot v-model:selected-index="keepIndex" title="状态保留" class="pivot-demo-keep">
            <WuiPivotItem v-for="(itemTitle, index) in keepTitles" :key="itemTitle" :title="itemTitle">
              <div class="pivot-keep">
                <span class="pivot-keep-count">{{ keepCounts[index] }}</span>
                <button type="button" class="pivot-tool" @click="keepCounts[index] += 1">点我 +1({{ itemTitle }})</button>
              </div>
            </WuiPivotItem>
          </WuiPivot>
          <p class="pivot-caption">
            切到其他页点几下再切回来 —— 计数仍在(PivotItem 不销毁,非选中仅收起;SelectedIndex =
            {{ keepIndex }})
          </p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="SelectedIndex" type="slider" v-model="selectedIndex" :min="0" :max="MAIN_COUNT - 1" :step="1" />
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
.pivot-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.pivot-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* 官方示例 1:MaxWidth 400 / MinHeight 400 的等观感尺寸 */
.pivot-demo-main {
  width: 520px;
  max-width: 100%;
  min-height: 160px;
}

/* 动态示例:限宽容器,页签足够多时标题行溢出 → 悬停出现左右导航箭头 */
.pivot-demo-dynamic {
  width: 520px;
  max-width: 100%;
  min-height: 140px;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.pivot-demo-keep {
  width: 520px;
  max-width: 100%;
  min-height: 140px;
}

.pivot-body {
  margin: 0;
  padding: 8px 0 16px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.pivot-state {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.pivot-state code {
  color: var(--wui-default-text-foreground-theme);
}

.pivot-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.pivot-toolbar {
  display: flex;
  gap: 8px;
}

.pivot-tool {
  padding: 5px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.pivot-tool:hover:not(:disabled) {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.pivot-tool:active:not(:disabled) {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.pivot-tool:disabled {
  color: var(--wui-button-foreground-disabled);
  background: var(--wui-button-background-disabled);
  cursor: default;
}

.pivot-tool:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.pivot-keep {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0 16px;
}

.pivot-keep-count {
  font-size: var(--wui-text-style-large-font-size);
  font-weight: 600;
  color: var(--wui-default-text-foreground-theme);
}
</style>
