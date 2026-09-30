<script setup lang="ts">
// FlipViewPage.vue —— FlipView 控件示例页(结构照抄 HomePage 母版)。
// 参数组合对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/FlipView/FlipViewPage.xaml:
//   示例 1 声明式多子项图片轮播(SimpleFlipviewItemsDeclared)、示例 2 ItemsSource 绑定数据 +
//   ItemTemplate 自定义项模板(FlipviewShowingBoundData)、示例 3 竖向翻转(VerticalFlipview);
//   另按任务规格补充 wrap / UseTouchAnimationsForAllNavigation / Disabled 开关、selectionChanged
//   事件日志与 PipsPager 联动预留演示(圆点排 ↔ selectedIndex 双向绑定)。
// 示例图片用内联 SVG data URI 占位(替代官方 SampleMedia 照片;渐变色为插图内容,非 UI 取色)。
import { computed, ref } from 'vue'
import WuiFlipView from '@/components/FlipView.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'

// —— 插图占位:生成线性渐变 SVG data URI ——
function svgImage(title: string, from: string, to: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="540">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="800" height="540" fill="url(#g)"/>` +
    `<text x="400" y="278" font-family="'Segoe UI',sans-serif" font-size="40" fill="#FFFFFF" text-anchor="middle">${title}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// 主示例五页(对应官方示例 cliff/grapes/rainier/sunset/valley 五张照片)
const scenery = [
  { name: '悬崖 Cliff', uri: svgImage('悬崖 Cliff', '#4C7A9E', '#274B66') },
  { name: '葡萄 Grapes', uri: svgImage('葡萄 Grapes', '#6B4C7A', '#3F2B4A') },
  { name: '雷尼尔山 Rainier', uri: svgImage('雷尼尔山 Rainier', '#7A9E9B', '#3E5A58') },
  { name: '日落 Sunset', uri: svgImage('日落 Sunset', '#C97B4C', '#7A3E27') },
  { name: '山谷 Valley', uri: svgImage('山谷 Valley', '#5E8C5A', '#31502F') },
]
const MAIN_COUNT = scenery.length

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const selectedIndex = ref<string | number | boolean>(0)
const orientation = ref<string | number | boolean>('Horizontal')
const wrap = ref<string | number | boolean>(false)
const useTouchAnimations = ref<string | number | boolean>(true)
const disabled = ref<string | number | boolean>(false)

const boundSelectedIndex = computed({
  get: () => Number(selectedIndex.value),
  set: (value: number) => {
    selectedIndex.value = value
  },
})
const orientationValue = computed(() => {
  const value = String(orientation.value)
  return value === 'Vertical' ? 'Vertical' : 'Horizontal'
})
const wrapValue = computed(() => wrap.value === true)
const useTouchAnimationsValue = computed(() => useTouchAnimations.value === true)
const disabledValue = computed(() => disabled.value === true)

const orientationOptions = [
  { label: 'Horizontal(默认)', value: 'Horizontal' },
  { label: 'Vertical', value: 'Vertical' },
]

// —— selectionChanged 事件日志 ——
const lastEvent = ref('—')

function onSelectionChanged(payload: { index: number; item: unknown }): void {
  lastEvent.value = `selectionChanged { index: ${payload.index} }`
}

// —— 示例 2:ItemsSource 绑定数据 + #item 自定义项模板(对照官方示例 2)——
interface BoundItem {
  title: string
  icon: string
}

function svgIcon(letter: string, color: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72">` +
    `<circle cx="36" cy="36" r="34" fill="${color}"/>` +
    `<text x="36" y="48" font-family="'Segoe UI',sans-serif" font-size="32" fill="#FFFFFF" text-anchor="middle">${letter}</text>` +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const boundItems: BoundItem[] = [
  { title: 'Button', icon: svgIcon('B', '#4C7A9E') },
  { title: 'CheckBox', icon: svgIcon('C', '#5E8C5A') },
  { title: 'ComboBox', icon: svgIcon('C', '#C97B4C') },
  { title: 'DatePicker', icon: svgIcon('D', '#6B4C7A') },
]

// —— 示例 3:竖向翻转(独立实例,固定 3 页)——
const verticalIndex = ref(0)
const verticalScenery = scenery.slice(0, 3)

// —— PipsPager 联动预留:圆点排 ↔ selectedIndex 双向绑定 ——
function jumpTo(index: number): void {
  boundSelectedIndex.value = index
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['ItemsSource', 'unknown[]', '数据源数组;提供时优先于默认 slot,项内容走 #item 作用域 slot(见示例 2)'],
  ['Orientation', "'Horizontal' | 'Vertical'", '翻页方向,默认 Horizontal(下拉实时切换)'],
  ['SelectedIndex', 'number(v-model:selected-index)', '当前项下标,双向绑定(滑块与圆点排实时联动)'],
  ['UseTouchAnimationsForAllNavigation', 'boolean', '按钮 / 键盘等所有导航都用滑动动画,默认 true;关闭后相邻翻页直接跳转(开关实时切换)'],
  ['Wrap', 'boolean', '循环翻页,默认 false(Web 扩展;源在端点截停)(开关实时切换)'],
  ['Disabled', 'boolean', '禁用整控交互,箭头呈半透明'],
  ['SelectionChanged', '(e: { index, item }) => void', '选中项变化时触发(按钮 / 键盘 / 拖拽 / 滚轮 / 程序化)'],
  ['默认 slot', '—', '多子项即多页(示例 1、3)'],
  ['#item slot', '{ item, index }', 'ItemsSource 模式的项模板(示例 2)'],
]

// 用法代码随参数实时更新(引号规则:外双内单,放 computed)。
const usageCode = computed(
  () => `<WuiFlipView
  v-model:selected-index="selectedIndex"
  orientation="${orientationValue.value}"
  :wrap="${wrapValue.value}"
  :use-touch-animations-for-all-navigation="${useTouchAnimationsValue.value}"
  @selection-changed="onSelectionChanged">
  <img src="cliff.jpg" alt="Cliff" />
  <img src="grapes.jpg" alt="Grapes" />
</WuiFlipView>`,
)
</script>

<template>
  <DemoPage wiki="FlipView"
    title="FlipView"
    description="一次翻阅一页的集合控件:适合展示图库照片、杂志页面等逐页内容。悬停显示前后箭头,支持触摸拖拽换页(松手按阈值提交或回弹)、方向键翻页与滚轮翻页;相邻页切换带滑动过渡动画。"
  >
    <template #demo>
      <div class="flipview-stage">
        <div class="flipview-example">
          <!-- 官方示例 1:声明式多子项(默认 slot)+ 参数面板联动 -->
          <WuiFlipView
            v-model:selected-index="boundSelectedIndex"
            :orientation="orientationValue"
            :wrap="wrapValue"
            :use-touch-animations-for-all-navigation="useTouchAnimationsValue"
            :disabled="disabledValue"
            class="flipview-demo-main"
            :aria-label-previous="'上一项'"
            :aria-label-next="'下一项'"
            @selection-changed="onSelectionChanged"
          >
            <img v-for="item in scenery" :key="item.name" :src="item.uri" :alt="item.name" />
          </WuiFlipView>

          <!-- PipsPager 联动预留:圆点排与 selectedIndex 双向绑定(PipsPager 控件落地后可直接替换) -->
          <div class="flipview-pips" role="group" aria-label="页码(联动预留)">
            <button
              v-for="(item, index) in scenery"
              :key="item.name"
              type="button"
              class="flipview-pip"
              :class="{ 'flipview-pip--active': index === boundSelectedIndex }"
              :aria-label="`第 ${index + 1} 页:${item.name}`"
              :aria-current="index === boundSelectedIndex || undefined"
              @click="jumpTo(index)"
            ></button>
          </div>
          <p class="flipview-state">
            SelectedIndex = {{ boundSelectedIndex }} · 最近事件:<code>{{ lastEvent }}</code>
            <span class="flipview-hint">(圆点排为 PipsPager 联动预留演示)</span>
          </p>
        </div>

        <div class="flipview-example">
          <!-- 官方示例 2:ItemsSource + #item 自定义项模板 -->
          <WuiFlipView :items-source="boundItems" class="flipview-demo-bound">
            <template #item="{ item }">
              <div class="flipview-bound-item">
                <img class="flipview-bound-icon" :src="(item as BoundItem).icon" alt="" />
                <div class="flipview-bound-title">{{ (item as BoundItem).title }}</div>
              </div>
            </template>
          </WuiFlipView>
          <p class="flipview-caption">ItemsSource 数组 + #item 作用域 slot(对照官方绑定数据示例)</p>
        </div>

        <div class="flipview-example">
          <!-- 官方示例 3:竖向翻转 -->
          <WuiFlipView
            v-model:selected-index="verticalIndex"
            orientation="Vertical"
            class="flipview-demo-vertical"
          >
            <img
              v-for="item in verticalScenery"
              :key="item.name"
              :src="item.uri"
              :alt="item.name"
            />
          </WuiFlipView>
          <p class="flipview-caption">
            Orientation = Vertical(上 / 下箭头与 ↑↓ 键;SelectedIndex = {{ verticalIndex }})
          </p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="SelectedIndex" type="slider" v-model="selectedIndex" :min="0" :max="MAIN_COUNT - 1" :step="1" />
        <DemoOptionRow label="Orientation" type="select" v-model="orientation" :options="orientationOptions" />
        <DemoOptionRow label="Wrap 循环(扩展)" type="toggle" v-model="wrap" />
        <DemoOptionRow label="UseTouchAnimations" type="toggle" v-model="useTouchAnimations" />
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
.flipview-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.flipview-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* 官方示例 1 / 3 的高度 270、MaxWidth 400 的等观感尺寸 */
.flipview-demo-main {
  width: 400px;
  height: 270px;
}

.flipview-demo-bound {
  width: 400px;
  height: 180px; /* 官方示例 2 Height = 180 */
}

.flipview-demo-vertical {
  width: 400px;
  height: 270px;
}

/* —— PipsPager 联动预留:圆点排 —— */
.flipview-pips {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flipview-pip {
  width: 8px;
  height: 8px;
  padding: 0;
  background: var(--wui-system-control-background-base-medium); /* 未选中:中性 60% 圆点 */
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.flipview-pip:hover {
  background: var(--wui-system-control-background-base-high);
}

.flipview-pip--active {
  background: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}

.flipview-pip:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 2px;
}

/* —— 示例 2:自定义项模板(官方:图标 + 底部标题条)—— */
.flipview-bound-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.flipview-bound-icon {
  width: 36px;
  height: 36px;
  margin-top: 24px;
}

.flipview-bound-title {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 60px; /* 官方标题条 Height = 60 */
  padding: 12px;
  font-size: var(--wui-text-style-large-font-size);
  font-weight: 600;
  color: var(--wui-default-text-foreground-theme);
  background: var(--wui-tool-tip-background); /* 官方 #A5FFFFFF 标题条的最近似中性面 token */
}

.flipview-state {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.flipview-state code {
  color: var(--wui-default-text-foreground-theme);
}

.flipview-hint {
  color: var(--wui-system-control-description-text-foreground);
}

.flipview-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}
</style>
