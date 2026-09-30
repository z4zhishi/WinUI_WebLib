<script setup lang="ts">
// RelativePanelPage.vue —— RelativePanel 控件示例页(组合对照 WinUI Gallery Samples/RelativePanel:
// 官方示例为 300 宽面板内红/蓝/绿/黄四个 50x50 矩形,以 RightOf / AlignRightWithPanel /
// Below + AlignHorizontalCenterWith 构成关系图;此处另加关系切换按钮组与实时调整演示)。
import { computed, ref } from 'vue'
import WuiRelativePanel from '@/components/RelativePanel.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// DemoOptionRow 的 v-model 契约要求联合类型(toggle → boolean,slider/number → number,select → string)
type OptionValue = string | number | boolean

function asNumber(value: OptionValue, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// —— 示例 1:官方示例对照(RelativepanelControl.txt:四个 50x50 矩形 + 关系图例)——
interface SampleRect {
  key: string
  label: string
  fill: string
  style: Record<string, string>
  attrs: Record<string, string | boolean>
  relations: string[]
}

const SAMPLE_RECT_SIZE = 50

// 官方示例四个矩形的填充对照 XAML 命名画刷 Fill="Red"/"Blue"/"Green"/"Yellow"(示例内容色,非控件外观色)
const sampleRects: SampleRect[] = [
  { key: 'rect1', label: 'Rectangle1(红)', fill: 'red', style: {}, attrs: {}, relations: ['未设置约束 → 默认落在面板左上角'] },
  {
    key: 'rect2',
    label: 'Rectangle2(蓝)',
    fill: 'blue',
    style: { marginLeft: '8px' },
    attrs: { 'data-relative-right-of': 'rect1' },
    relations: ['RelativePanel.RightOf = Rectangle1', 'Margin 左 8(边距参与求解,与 WinUI 一致)'],
  },
  {
    key: 'rect3',
    label: 'Rectangle3(绿)',
    fill: 'green',
    style: {},
    attrs: { 'data-relative-align-right-with-panel': true },
    relations: ['RelativePanel.AlignRightWithPanel = True'],
  },
  {
    key: 'rect4',
    label: 'Rectangle4(黄)',
    fill: 'yellow',
    style: { marginTop: '8px' },
    attrs: { 'data-relative-below': 'rect3', 'data-relative-align-horizontal-center-with': 'rect3' },
    relations: ['RelativePanel.Below = Rectangle3', 'RelativePanel.AlignHorizontalCenterWith = Rectangle3', 'Margin 上 8'],
  },
]

// —— 示例 2:关系切换按钮组(目标块的水平/垂直关系经按钮组实时切换,面板即时重排)——
interface RelationChoice {
  value: string
  label: string
  hint: string
}

const horizontalChoices: RelationChoice[] = [
  { value: 'right-of', label: 'RightOf', hint: '在基准块右侧' },
  { value: 'left-of', label: 'LeftOf', hint: '在基准块左侧' },
  { value: 'align-left-with', label: 'AlignLeftWith', hint: '左边对齐基准块左边' },
  { value: 'align-right-with', label: 'AlignRightWith', hint: '右边对齐基准块右边' },
  { value: 'align-horizontal-center-with', label: 'AlignHCenterWith', hint: '与基准块水平居中对齐' },
]

const verticalChoices: RelationChoice[] = [
  { value: 'below', label: 'Below', hint: '在基准块下方' },
  { value: 'above', label: 'Above', hint: '在基准块上方' },
  { value: 'align-top-with', label: 'AlignTopWith', hint: '顶边对齐基准块顶边' },
  { value: 'align-bottom-with', label: 'AlignBottomWith', hint: '底边对齐基准块底边' },
  { value: 'align-vertical-center-with', label: 'AlignVCenterWith', hint: '与基准块垂直居中对齐' },
]

const horizontalRelation = ref('right-of')
const verticalRelation = ref('below')
const targetPanelLeft = ref<OptionValue>(false)
const targetPanelRight = ref<OptionValue>(false)

const targetAttrs = computed<Record<string, string | boolean>>(() => ({
  [`data-relative-${horizontalRelation.value}`]: 'anchor',
  [`data-relative-${verticalRelation.value}`]: 'anchor',
  'data-relative-align-left-with-panel': targetPanelLeft.value === true,
  'data-relative-align-right-with-panel': targetPanelRight.value === true,
}))

// —— 示例 3:实时调整(滑块改尺寸/边距 → 测量驱动的重排)+ 循环依赖降级演示 ——
const livePanelWidth = ref<OptionValue>(360)
const liveAnchorWidth = ref<OptionValue>(96)
const liveAnchorHeight = ref<OptionValue>(44)
const liveMargin = ref<OptionValue>(16)
const cycleEnabled = ref<OptionValue>(false)

const livePanelWidthPx = computed(() => `${Math.round(asNumber(livePanelWidth.value, 360))}px`)
const liveAnchorWidthPx = computed(() => `${Math.round(asNumber(liveAnchorWidth.value, 96))}px`)
const liveAnchorHeightPx = computed(() => `${Math.round(asNumber(liveAnchorHeight.value, 44))}px`)
const liveMarginPx = computed(() => `${Math.round(asNumber(liveMargin.value, 16))}px`)

// 循环依赖演示:从属链 基准 → A → B;打开开关后追加 A 的 Below=B,与 B 的 RightOf=A 构成环。
// 组件检测到回边后告警(console.warn)并丢弃 B 的 RightOf 约束降级布局:B 失去锚点回落左上角。
const cycleAttrs = computed<Record<string, string>>(() =>
  cycleEnabled.value === true ? { 'data-relative-below': 'chip-b' } : ({} as Record<string, string>),
)

// —— 下半区固定开发文档 ——
const propertyHeaders = ['属性', '类型', '默认值', '说明']
const propertyRows: (string | number)[][] = [
  ['background', 'string', '未设置(透明)', '面板底色,任意 CSS 颜色或 --wui-* 变量(对应 RelativePanel.Background,WinUI 默认为 null 画刷)'],
  ['padding', 'number | string', '未设置', '内边距(对应 RelativePanel.Padding);数字按 px,字符串原样作为 CSS padding'],
  ['borderBrush', 'string', '未设置', '边框颜色(对应 RelativePanel.BorderBrush);设置后边框为 solid'],
  ['borderThickness', 'number | string', '未设置', '边框厚度(对应 RelativePanel.BorderThickness);仅设厚度不设颜色时以透明边框占位'],
  ['cornerRadius', 'number | string', '未设置', '圆角(对应 RelativePanel.CornerRadius)'],
]

const attachedHeaders = ['附加属性(子元素 data-relative-*)', '类型', '默认值', '说明']
const attachedRows: (string | number)[][] = [
  ['data-relative-key', 'string', '未设置', '子项标识,供其他子项的关系属性引用(对应 x:Name);也可用 data-relative-name 作为别名,两者都缺省时不可被引用'],
  ['data-relative-above', 'string(key)', '未设置', '子项底边贴齐目标子项顶边上方(对应 RelativePanel.Above)'],
  ['data-relative-below', 'string(key)', '未设置', '子项顶边贴齐目标子项底边下方(对应 RelativePanel.Below)'],
  ['data-relative-left-of', 'string(key)', '未设置', '子项右边贴齐目标子项左边左侧(对应 RelativePanel.LeftOf)'],
  ['data-relative-right-of', 'string(key)', '未设置', '子项左边贴齐目标子项右边右侧(对应 RelativePanel.RightOf)'],
  ['data-relative-align-top-with', 'string(key)', '未设置', '顶边与目标子项顶边对齐(对应 RelativePanel.AlignTopWith)'],
  ['data-relative-align-bottom-with', 'string(key)', '未设置', '底边与目标子项底边对齐(对应 RelativePanel.AlignBottomWith)'],
  ['data-relative-align-left-with', 'string(key)', '未设置', '左边与目标子项左边对齐(对应 RelativePanel.AlignLeftWith)'],
  ['data-relative-align-right-with', 'string(key)', '未设置', '右边与目标子项右边对齐(对应 RelativePanel.AlignRightWith)'],
  ['data-relative-align-horizontal-center-with', 'string(key)', '未设置', '与目标子项水平居中对齐(对应 RelativePanel.AlignHorizontalCenterWith)'],
  ['data-relative-align-vertical-center-with', 'string(key)', '未设置', '与目标子项垂直居中对齐(对应 RelativePanel.AlignVerticalCenterWith)'],
  ['data-relative-align-left-with-panel', 'boolean', 'false', '左边与面板左边对齐(对应 RelativePanel.AlignLeftWithPanel);与右向约束同设时水平拉伸'],
  ['data-relative-align-top-with-panel', 'boolean', 'false', '顶边与面板顶边对齐(对应 RelativePanel.AlignTopWithPanel);与下向约束同设时垂直拉伸'],
  ['data-relative-align-right-with-panel', 'boolean', 'false', '右边与面板右边对齐(对应 RelativePanel.AlignRightWithPanel)'],
  ['data-relative-align-bottom-with-panel', 'boolean', 'false', '底边与面板底边对齐(对应 RelativePanel.AlignBottomWithPanel)'],
  ['data-relative-align-horizontal-center-with-panel', 'boolean', 'false', '在面板内水平居中(对应 RelativePanel.AlignHorizontalCenterWithPanel)'],
  ['data-relative-align-vertical-center-with-panel', 'boolean', 'false', '在面板内垂直居中(对应 RelativePanel.AlignVerticalCenterWithPanel)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['—(无业务事件)', '—', 'RelativePanel 为纯布局面板,不派发业务事件;子项自身的交互事件照常触发与冒泡;约束告警经 console.warn 输出'],
]

// 用法代码随示例 2 的关系按钮实时更新,直观展示「关系属性 → 代码」的映射
const usageCode = computed(() => {
  const lines = [
    '<WuiRelativePanel style="width: 360px; height: 220px">',
    '  <div class="block" data-relative-key="anchor">基准块</div>',
    '  <div',
    '    class="block"',
    '    data-relative-key="target"',
    `    data-relative-${horizontalRelation.value}="anchor"`,
    `    data-relative-${verticalRelation.value}="anchor"`,
  ]
  if (targetPanelLeft.value === true) lines.push('    data-relative-align-left-with-panel="true"')
  if (targetPanelRight.value === true) lines.push('    data-relative-align-right-with-panel="true"')
  lines.push('  >目标块</div>')
  lines.push('</WuiRelativePanel>')
  return lines.join('\n')
})
</script>

<template>
  <DemoPage wiki="RelativePanel"
    title="RelativePanel"
    description="关系定位布局面板:子项通过 data-relative-* 附加属性声明彼此之间及与面板之间的关系,由约束求解器计算坐标;无关系的子项默认落在左上角。"
  >
    <template #demo>
      <div class="relative-stage">
        <!-- 示例 1:官方示例对照(关系图 + 图例) -->
        <div class="example-item example-item--row">
          <div class="example-block">
            <p class="example-caption">官方示例对照:四个矩形的相对关系(面板未内联定高,按内容自动撑开,同官方 Width=300)</p>
            <WuiRelativePanel class="sample-panel" :style="{ width: '300px' }">
              <div
                v-for="rect in sampleRects"
                :key="rect.key"
                class="sample-rect"
                :style="{ width: `${SAMPLE_RECT_SIZE}px`, height: `${SAMPLE_RECT_SIZE}px`, background: rect.fill, ...rect.style }"
                :data-relative-key="rect.key"
                v-bind="rect.attrs"
              />
            </WuiRelativePanel>
          </div>
          <ul class="relation-legend" aria-label="关系图例">
            <li v-for="rect in sampleRects" :key="rect.key" class="relation-legend-item">
              <span class="legend-swatch" :style="{ background: rect.fill }" aria-hidden="true"></span>
              <span class="legend-body">
                <span class="legend-name">{{ rect.label }}</span>
                <span v-for="line in rect.relations" :key="line" class="legend-line">{{ line }}</span>
              </span>
            </li>
          </ul>
        </div>

        <!-- 示例 2:关系切换按钮组 -->
        <div class="example-item">
          <p class="example-caption">关系切换按钮组:点选目标块的水平/垂直关系(同一轴按 WinUI 优先级生效),面板即时重排</p>
          <WuiRelativePanel class="switch-panel" :style="{ width: '360px', height: '220px' }">
            <div class="switch-block switch-block--anchor" data-relative-key="anchor">基准块</div>
            <div
              class="switch-block switch-block--target"
              :style="{ marginLeft: '12px', marginTop: '12px' }"
              data-relative-key="target"
              v-bind="targetAttrs"
            >
              目标块
            </div>
          </WuiRelativePanel>
          <div class="relation-groups">
            <div class="relation-group" role="group" aria-label="目标块水平关系">
              <span class="relation-group-label">水平关系</span>
              <button
                v-for="choice in horizontalChoices"
                :key="choice.value"
                type="button"
                class="relation-button"
                :title="choice.hint"
                :aria-pressed="horizontalRelation === choice.value"
                @click="horizontalRelation = choice.value"
              >
                {{ choice.label }}
              </button>
            </div>
            <div class="relation-group" role="group" aria-label="目标块垂直关系">
              <span class="relation-group-label">垂直关系</span>
              <button
                v-for="choice in verticalChoices"
                :key="choice.value"
                type="button"
                class="relation-button"
                :title="choice.hint"
                :aria-pressed="verticalRelation === choice.value"
                @click="verticalRelation = choice.value"
              >
                {{ choice.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- 示例 3:实时调整 + 循环依赖降级 -->
        <div class="example-item">
          <p class="example-caption">实时调整:滑块改面板宽度与基准块尺寸,从属块(Below + RightOf 基准块,边距同步)实时重排</p>
          <WuiRelativePanel
            class="live-panel"
            background="var(--wui-system-control-background-chrome-medium-low)"
            :style="{ width: livePanelWidthPx, height: '150px' }"
          >
            <div
              class="switch-block switch-block--anchor"
              :style="{ width: liveAnchorWidthPx, height: liveAnchorHeightPx }"
              data-relative-key="anchor"
            >
              基准块
            </div>
            <div
              class="switch-block switch-block--target"
              :style="{ marginLeft: liveMarginPx, marginTop: liveMarginPx }"
              data-relative-key="follower"
              data-relative-right-of="anchor"
              data-relative-below="anchor"
            >
              从属块
            </div>
          </WuiRelativePanel>

          <p class="example-caption">
            循环依赖降级演示:链路 基准 → A → B;打开下方「制造循环依赖」追加 A 的 Below=B,与 B 的 RightOf=A 构成环 ——
            组件检测到回边后经 console.warn 告警并丢弃该边:B 失去锚点回落到左上角(虚线绿框),A 的垂直位置随之改变,面板保持可用
          </p>
          <WuiRelativePanel class="cycle-panel" :style="{ width: '360px', height: '120px' }">
            <div class="switch-block switch-block--anchor" data-relative-key="cycle-anchor">基准</div>
            <div
              class="cycle-chip"
              data-relative-key="chip-a"
              data-relative-right-of="cycle-anchor"
              v-bind="cycleAttrs"
            >
              A
            </div>
            <div
              class="cycle-chip"
              :class="{ 'cycle-chip--degraded': cycleEnabled === true }"
              data-relative-key="chip-b"
              data-relative-right-of="chip-a"
            >
              B
            </div>
          </WuiRelativePanel>
        </div>
      </div>
    </template>

    <template #options>
      <h4 class="group-title">关系切换区(目标块的面板对齐)</h4>
      <DemoOptions :columns="2">
        <DemoOptionRow label="目标块 AlignLeftWithPanel" type="toggle" v-model="targetPanelLeft" />
        <DemoOptionRow label="目标块 AlignRightWithPanel" type="toggle" v-model="targetPanelRight" />
      </DemoOptions>

      <h4 class="group-title">实时调整区</h4>
      <DemoOptions :columns="2">
        <DemoOptionRow label="面板宽度" type="slider" v-model="livePanelWidth" :min="240" :max="480" :step="8" />
        <DemoOptionRow label="基准块宽度" type="slider" v-model="liveAnchorWidth" :min="48" :max="160" :step="4" />
        <DemoOptionRow label="基准块高度" type="slider" v-model="liveAnchorHeight" :min="28" :max="96" :step="2" />
        <DemoOptionRow label="从属块边距" type="slider" v-model="liveMargin" :min="0" :max="96" :step="2" />
        <DemoOptionRow label="制造循环依赖(A ⇄ B)" type="toggle" v-model="cycleEnabled" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">属性</h4>
      <DemoDocsTable :headers="propertyHeaders" :rows="propertyRows" />
      <h4 class="docs-subtitle">附加属性</h4>
      <DemoDocsTable :headers="attachedHeaders" :rows="attachedRows" />
      <h4 class="docs-subtitle">事件</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.relative-stage {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 28px;
  width: 100%;
}

.example-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-item--row {
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.example-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-caption {
  margin: 0;
  max-width: 560px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* WinUI RelativePanel 默认无描边,演示加浅色描边便于观察面板边界 */
.sample-panel,
.switch-panel,
.live-panel,
.cycle-panel {
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 官方示例矩形:50x50(XAML 中 Rectangle 显式 Width/Height) */
.sample-rect {
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 关系图例 */
.relation-legend {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 12px 16px;
  list-style: none;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.relation-legend-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.legend-swatch {
  flex: none;
  width: 12px;
  height: 12px;
  margin-top: 3px;
  border-radius: 2px;
}

.legend-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.legend-name {
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.legend-line {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 演示块(按钮底色 + 描边,非控件外观色) */
.switch-block {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  white-space: nowrap;
}

.switch-block--anchor {
  border-color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}

.switch-block--target {
  background: var(--wui-toggle-switch-curtain-background-theme);
  color: var(--wui-system-control-foreground-alt-high);
}

/* 关系切换按钮组 */
.relation-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relation-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.relation-group-label {
  min-width: 60px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.relation-button {
  padding: 3px 10px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.relation-button:hover {
  background: var(--wui-button-pointer-over-background-theme);
  color: var(--wui-button-pointer-over-foreground-theme);
}

.relation-button[aria-pressed='true'] {
  color: var(--wui-system-control-foreground-alt-high);
  background: var(--wui-toggle-switch-curtain-background-theme);
  border-color: var(--wui-system-control-transparent);
}

.relation-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

/* 循环依赖演示链路小块 */
.cycle-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 32px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 循环约束被丢弃后的降级态(失去锚点、回落左上角) */
.cycle-chip--degraded {
  border-color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  border-style: dashed;
}

.group-title {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
