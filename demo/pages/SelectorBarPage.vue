<script setup lang="ts">
// SelectorBarPage.vue —— SelectorBar 控件示例页(结构照抄 HomePage 母版 / PivotPage 实控件页)。
// 参数组合对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/SelectorBar/SelectorBarPage.xaml:
//   - Example1 BasicSelectorbar:Recent(Icon=Clock)/ Shared(Icon=Share)/ Favorites(Icon=Favorite)——
//     本页作为「图标 + 文字混排」组,并按任务规格另补纯文字 / 纯图标两组;
//   - Example2 SelectorbarFrameSlideTransitions:Page1..Page5 文本项驱动内容切换(源用 Frame 翻页 +
//     SlideNavigationTransitionInfo 滑入动画;Web 侧以内容面板即时切换等价,动画差异记录 wiki);
//   - Example3 SelectorbarDisplayingDifferentCollections:Pink/Plum/PowderBlue 切换颜色集合。
// 另按任务规格:selectionChanged 事件日志、selectedIndex / selectedItem 双向绑定读数、
//   Disabled 开关(WinUI 栏级 IsEnabled)、限宽容器演示空间不足时的横向滚动(源 ItemsView 滚动语义)。
import { computed, ref } from 'vue'
import type { VNode } from 'vue'
import WuiSelectorBar from '@/components/SelectorBar.vue'
import WuiSelectorBarItem from '@/components/SelectorBarItem.vue'
import type { SymbolValue } from '@/utils/symbolIcons'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'

// —— 示例 1:官方基础 SelectorBar(图标 + 文字混排;Recent/Shared/Favorites)+ 内容联动 ——
const MAIN_COUNT = 3
const mainTabs: { key: string; icon: SymbolValue; text: string; body: string }[] = [
  { key: 'recent', icon: 'Clock', text: 'Recent', body: '最近打开的文件会显示在这里。(官方示例:Recent)' },
  { key: 'shared', icon: 'Share', text: 'Shared', body: '与你共享的内容会显示在这里。(官方示例:Shared)' },
  { key: 'favorites', icon: 'Favorite', text: 'Favorites', body: '收藏的内容会显示在这里。(官方示例:Favorites)' },
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
  lastEvent.value =
    payload.index >= 0 ? `selectionChanged { index: ${payload.index} }` : 'selectionChanged { index: -1 }'
}

const selectedItemLabel = computed(() => {
  const value = boundSelectedItem.value
  if (value !== null && typeof value === 'object' && 'props' in (value as object)) {
    const text = (value as VNode).props?.['text']
    return `<WuiSelectorBarItem text="${String(text)}">`
  }
  return '—'
})

// —— 示例 2:纯文字组(官方 Example2:Page1..Page5 驱动内容切换)——
const textIndex = ref(1)
const textTabs = ['Page1', 'Page2', 'Page3', 'Page4', 'Page5']

// —— 示例 3:纯图标组(仅图标 + aria-label 承载可访问名称,对应 AutomationProperties.Name)——
const iconTabs: { key: string; icon: SymbolValue; label: string }[] = [
  { key: 'recent', icon: 'Clock', label: 'Recent' },
  { key: 'shared', icon: 'Share', label: 'Shared' },
  { key: 'favorites', icon: 'Favorite', label: 'Favorites' },
]
const iconIndex = ref(0)

// —— 官方 Example3 的颜色集合(并入示例 2 的内容面板:不同选项卡展示不同集合)——
const colorSets: Record<string, string[]> = {
  Page1: ['#e9578f', '#c45cc4', '#d0a3e3'],
  Page2: ['#8fa4d0', '#7ab3d8', '#9ed0e6'],
  Page3: ['#9fd8b4', '#7fc98a', '#c4e0a0'],
  Page4: ['#f2c94c', '#f0a35e', '#e8d59e'],
  Page5: ['#b8b8b8', '#d9d9d9', '#f2f2f2'],
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['Text', 'string', '项文本(WinUI SelectorBarItem.Text);未设置则只渲染图标/自定义内容'],
  ['Icon', 'string', '项图标,取 WinUI Symbol 枚举名(如 Clock / Share / Favorite);自定义图标用 #icon slot'],
  ['IsSelected', 'boolean(v-model:is-selected)', '是否选中;在 SelectorBar 内由宿主仲裁,声明 is-selected 即初始选中(WinUI IsSelected="True")'],
  ['Disabled(项)', 'boolean', '禁用单个项:呈 Disabled 色、不可聚焦,方向键跳过'],
  ['Disabled(栏)', 'boolean', '禁用整栏(WinUI IsEnabled=false):全部项禁用(开关实时切换)'],
  ['SelectedIndex', 'number(v-model:selected-index)', '当前选中下标(Web 增强,WinUI 无 SelectedIndex;-1 = 无选中;滑块实时联动)'],
  ['SelectedItem', 'unknown(v-model:selected-item)', '当前选中项(WinUI SelectedItem,读取为对应项的 VNode;外部写入按引用 / key 匹配)'],
  ['SelectionChanged', '(e: { item, index }) => void', '选中变化时触发(点击 / 左右方向键 / 程序化;初始挂载不触发)'],
  ['默认 slot(栏)', '—', '声明 <WuiSelectorBarItem> 子项即选项,支持响应式数组 v-for 动态增删'],
  ['#icon slot(项)', '—', '自定义图标内容(FontIcon / SymbolIcon / PathIcon 等任意 IconElement)'],
]

// 用法代码随参数实时更新(引号规则:外双内单,放 computed)。
const usageCode = computed(
  () => `<WuiSelectorBar
  v-model:selected-index="selectedIndex"
  :disabled="${disabledValue.value}"
  @selection-changed="onSelectionChanged">
  <WuiSelectorBarItem icon="Clock" text="Recent" />
  <WuiSelectorBarItem icon="Share" text="Shared" />
  <WuiSelectorBarItem icon="Favorite" text="Favorites" is-selected />
</WuiSelectorBar>`,
)
</script>

<template>
  <DemoPage
    title="SelectorBar"
    description="轻量单选选项卡条:在少量固定选项间切换显示内容(Pivot 的 Windows 11 推荐替代)。点击或按左右方向键切换,选中随焦点移动、端点截停;选中项底部展开 16×3 的强调色指示条。空间不足时整条横向滚动(源 ItemsView 行为)。"
  >
    <template #demo>
      <div class="selectorbar-stage">
        <!-- 示例 1:图标 + 文字混排(官方 Example1)+ selectedIndex/selectedItem 绑定 + 事件日志 -->
        <div class="selectorbar-example">
          <WuiSelectorBar
            v-model:selected-index="boundSelectedIndex"
            v-model:selected-item="boundSelectedItem"
            :disabled="disabledValue"
            class="selectorbar-demo-main"
            aria-label="文件分类"
            @selection-changed="onSelectionChanged"
          >
            <WuiSelectorBarItem
              v-for="(tab, index) in mainTabs"
              :key="tab.key"
              :icon="tab.icon"
              :text="tab.text"
              :is-selected="index === 0"
            />
          </WuiSelectorBar>
          <div class="selectorbar-panel">
            <p class="selectorbar-panel-body">{{ mainTabs[boundSelectedIndex]?.body ?? '—' }}</p>
          </div>
          <p class="selectorbar-state">
            SelectedIndex = {{ boundSelectedIndex }} · SelectedItem =
            <code>{{ selectedItemLabel }}</code> · 最近事件:<code>{{ lastEvent }}</code>
          </p>
        </div>

        <!-- 示例 2:纯文字组(官方 Example2/3:文本项驱动不同内容集合切换)-->
        <div class="selectorbar-example">
          <WuiSelectorBar v-model:selected-index="textIndex" class="selectorbar-demo-text">
            <WuiSelectorBarItem v-for="tab in textTabs" :key="tab" :text="tab" />
          </WuiSelectorBar>
          <div class="selectorbar-colors" role="img" :aria-label="`${textTabs[textIndex]} 的颜色集合`">
            <span
              v-for="(color, index) in colorSets[textTabs[textIndex] ?? ''] ?? []"
              :key="index"
              class="selectorbar-color"
              :style="{ background: color }"
            ></span>
          </div>
          <p class="selectorbar-caption">
            SelectedIndex = {{ textIndex }}(官方示例 2/3:文本项驱动 Frame 翻页 / 不同颜色集合切换)
          </p>
        </div>

        <!-- 示例 3:纯图标组(仅图标项;可访问名称经 aria-label 提供,对应 AutomationProperties.Name)-->
        <div class="selectorbar-example">
          <WuiSelectorBar v-model:selected-index="iconIndex" class="selectorbar-demo-icons" aria-label="图标选项卡">
            <WuiSelectorBarItem
              v-for="(tab, index) in iconTabs"
              :key="tab.key"
              :icon="tab.icon"
              :aria-label="tab.label"
              :is-selected="index === 0"
            />
          </WuiSelectorBar>
          <p class="selectorbar-caption">SelectedIndex = {{ iconIndex }}(纯图标项:名称经 aria-label 提供)</p>
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
.selectorbar-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.selectorbar-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* 示例 1:限宽容器 —— 选项足够多 / 容器足够窄时整条横向滚动(源 ItemsView 溢出语义) */
.selectorbar-demo-main,
.selectorbar-demo-text,
.selectorbar-demo-icons {
  width: 520px;
  max-width: 100%;
  border: 1px solid var(--wui-system-control-background-base-low);
}

.selectorbar-panel {
  box-sizing: border-box;
  width: 520px;
  max-width: 100%;
  min-height: 72px;
  padding: 12px 16px;
  background: var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.selectorbar-panel-body {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.selectorbar-state {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.selectorbar-state code {
  color: var(--wui-application-foreground-theme);
}

.selectorbar-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 官方 Example3 颜色集合的等价呈现(ItemsView + SolidColorBrush 模板 → 色块行) */
.selectorbar-colors {
  display: flex;
  gap: 8px;
}

.selectorbar-color {
  width: 112px;
  height: 82px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}
</style>
