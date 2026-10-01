<script setup lang="ts">
// ExpanderPage.vue —— Expander 控件示例页(结构照抄 HomePage 母版)。
// 参数组合参照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/Expander/ExpanderPage.xaml:
//   文本 Header/Content + ExpandDirection 下拉(官方为 Down/Up,本组件另有 Left/Right 扩展)、
//   内容对齐示例(Width 固定 + 居中头部);另按文档补充嵌套 Expander 与四事件日志。
import { computed, ref } from 'vue'
import WuiExpander from '@/components/Expander.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const header = ref<string | number | boolean>('This text is in the header')
const expandDirection = ref<string | number | boolean>('Down')
const isExpanded = ref<string | number | boolean>(false)
const disabled = ref<string | number | boolean>(false)

const headerText = computed(() => String(header.value))
const directionValue = computed(() => {
  const value = String(expandDirection.value)
  return value === 'Up' || value === 'Left' || value === 'Right' ? value : 'Down'
})
const disabledValue = computed(() => disabled.value === true)

// 展开开关 ↔ 参数面板双向联动(v-model 需要可写 computed)。
const boundExpanded = computed({
  get: () => isExpanded.value === true,
  set: (value: boolean) => {
    isExpanded.value = value
  },
})

const directionOptions = [
  { label: 'Down(默认)', value: 'Down' },
  { label: 'Up', value: 'Up' },
  { label: 'Left(扩展)', value: 'Left' },
  { label: 'Right(扩展)', value: 'Right' },
]

// —— 事件日志(Expanding/Expanded/Collapsing/Collapsed 实时呈现)——
const lastEvent = ref('—')

function logEvent(name: 'expanding' | 'expanded' | 'collapsing' | 'collapsed'): void {
  lastEvent.value = name
}

// —— 嵌套演示的子项展开状态 ——
const nestedInnerExpanded = ref(true)

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['Header', 'string', '头部文本(WinUI Header);同名 slot 优先,均为空则不渲染头部文本'],
  ['ExpandDirection', "'Down' | 'Up' | 'Left' | 'Right'", '展开方向(内容相对头部的方位),默认 Down;箭头旋向随动;Left/Right 为 Web 扩展(下拉实时切换)'],
  ['IsExpanded', 'boolean(v-model:is-expanded)', '展开状态,双向绑定(与参数面板开关联动)'],
  ['Disabled', 'boolean', '禁用头部交互与焦点,呈禁用配色'],
  ['Expanding', '() => void', '用户交互触发展开动画前(与 WinUI Expanding 同序)'],
  ['Expanded', '() => void', '展开过渡结束后触发(与 WinUI Expanded 同为动画完成时机)'],
  ['Collapsing', '() => void', '用户交互触发收起动画前'],
  ['Collapsed', '() => void', '收起过渡结束后触发'],
  ['header slot', '—', '自定义头部内容(可放任意元素,如居中文本)'],
  ['默认 slot', '—', '展开后的内容区'],
]

// 用法代码随参数实时更新(较长,放 computed,引号规则:外双内单)。
const usageCode = computed(
  () => `<WuiExpander
  v-model:is-expanded="isExpanded"
  header="${headerText.value}"
  expand-direction="${directionValue.value}"
  :disabled="${disabledValue.value}"
  @expanding="logEvent('expanding')"
  @expanded="logEvent('expanded')"
  @collapsing="logEvent('collapsing')"
  @collapsed="logEvent('collapsed')">
  This is in the content
</WuiExpander>`,
)
</script>

<template>
  <DemoPage wiki="Expander"
    title="Expander"
    description="带头部的可展开 / 收起容器:头部常显,点击或按空格 / 回车在展开与收起间切换,内容区以高度(左右方向为宽度)过渡动画呈现。适合只在部分场景才需要展示的内容,如“阅读更多”或某一项的附加选项。"
  >
    <template #demo>
      <div class="expander-stage">
        <div class="expander-example">
          <!-- 主演示:与参数面板联动(官方示例 1:文本 Header/Content + 方向下拉 + 展开开关) -->
          <WuiExpander
            v-model:is-expanded="boundExpanded"
            :header="headerText"
            :expand-direction="directionValue"
            :disabled="disabledValue"
            class="expander-demo-main"
            @expanding="logEvent('expanding')"
            @expanded="logEvent('expanded')"
            @collapsing="logEvent('collapsing')"
            @collapsed="logEvent('collapsed')"
          >
            This is in the content
          </WuiExpander>
          <p class="expander-state">
            IsExpanded = {{ boundExpanded }} · 最近事件:<code>{{ lastEvent }}</code>
          </p>
        </div>

        <div class="expander-example">
          <!-- 官方示例 2 的对齐玩法:固定宽度 + slot 头部(居中文本),内容区左对齐 -->
          <WuiExpander header="内容对齐与 slot 头部" :is-expanded="true" class="expander-demo-align">
            <template #header>
              <span class="expander-centered-header">This text is centered(slot 头部)</span>
            </template>
            <span class="expander-left-content">And this text is left aligned</span>
          </WuiExpander>
          <p class="expander-caption">#header slot + 固定宽度(WinUI 500 / Padding 0 示例的等价演示)</p>
        </div>

        <div class="expander-example">
          <!-- 嵌套 Expander(官方文档场景:分组层级内容) -->
          <WuiExpander header="嵌套演示:外层分组" :is-expanded="true" class="expander-demo-main">
            <div class="expander-nested">
              <WuiExpander
                v-model:is-expanded="nestedInnerExpanded"
                header="内层 Expander(初始展开)"
              >
                内层内容:嵌套使用时各自独立展开 / 收起,互不影响。
              </WuiExpander>
              <p class="expander-caption">内层 IsExpanded = {{ nestedInnerExpanded }}</p>
            </div>
          </WuiExpander>
          <p class="expander-caption">嵌套 Expander(外层恒展开,内层可交互)</p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Header" type="text" v-model="header" placeholder="头部文本" />
        <DemoOptionRow
          label="ExpandDirection"
          type="select"
          v-model="expandDirection"
          :options="directionOptions"
        />
        <DemoOptionRow label="IsExpanded" type="toggle" v-model="isExpanded" />
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
.expander-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.expander-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.expander-demo-main {
  min-width: 320px; /* 接近源 MinWidth = FlyoutThemeMinWidth 的观感 */
  max-width: 420px;
}

.expander-demo-align {
  width: 320px; /* 官方对齐示例固定宽度(500 在演示画布内过宽,等比收窄) */
}

.expander-centered-header {
  display: block;
  width: 100%;
  text-align: center;
}

.expander-left-content {
  display: block;
}

.expander-nested {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.expander-state {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.expander-state code {
  color: var(--wui-default-text-foreground-theme);
}

.expander-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}
</style>
