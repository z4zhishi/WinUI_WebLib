<script setup lang="ts">
// LinePage.vue —— Line 控件示例页(对照 WinUI Gallery Samples/Line 的官方 Line 示例:
// Canvas 100x200 内一条 SteelBlue 直线,五个滑块实时调节 X1/Y1/X2/Y2/StrokeThickness;
// 另按 WinUI Shape API 面补充虚线样式、线帽与画刷描述接口三个演示)。
import { computed, ref } from 'vue'
import WuiCanvas from '@/components/Canvas.vue'
import WuiLine, { type WuiBrush } from '@/components/Line.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// DemoOptionRow 的 v-model 契约要求联合类型(toggle → boolean,slider/number → number,select/text → string)
type OptionValue = string | number | boolean

function asNumber(value: OptionValue, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asString(value: OptionValue): string {
  return typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
}

// select 选项串 → WinUI PenLineCap 联合类型(非法值回退 Flat)
type PenLineCapValue = 'Flat' | 'Square' | 'Round' | 'Triangle'
const CAP_VALUES: PenLineCapValue[] = ['Flat', 'Square', 'Round', 'Triangle']

function asCap(value: OptionValue): PenLineCapValue {
  const raw = asString(value)
  return (CAP_VALUES as string[]).includes(raw) ? (raw as PenLineCapValue) : 'Flat'
}

// —— 示例 1:官方示例对照(滑块范围与缺省值同官方:X1/Y1 0–100、X2 200–300、Y2 0–100、粗细 5–10,步长 0.5)——
const officialX1 = ref<OptionValue>(0)
const officialY1 = ref<OptionValue>(0)
const officialX2 = ref<OptionValue>(200)
const officialY2 = ref<OptionValue>(0)
const officialThickness = ref<OptionValue>(5)

const officialX1Value = computed(() => asNumber(officialX1.value, 0))
const officialY1Value = computed(() => asNumber(officialY1.value, 0))
const officialX2Value = computed(() => asNumber(officialX2.value, 200))
const officialY2Value = computed(() => asNumber(officialY2.value, 0))
const officialThicknessValue = computed(() => asNumber(officialThickness.value, 5))

// —— 示例 2:虚线样式(StrokeDashArray 值为粗细的倍数,WinUI 语义;偏移同口径)——
const dashPatternText = ref<OptionValue>('2 2')
const dashOffset = ref<OptionValue>(0)
const dashThickness = ref<OptionValue>(6)
const dashCap = ref<OptionValue>('Flat')

const dashOffsetValue = computed(() => asNumber(dashOffset.value, 0))
const dashThicknessValue = computed(() => asNumber(dashThickness.value, 6))

const capChoices = [
  { label: 'Flat(平)', value: 'Flat' },
  { label: 'Square(方)', value: 'Square' },
  { label: 'Round(圆)', value: 'Round' },
  { label: 'Triangle(三角)', value: 'Triangle' },
]

// —— 示例 3:线帽(粗线更能看出帽形;Triangle 由 SVG marker 三角形补绘)——
const startCap = ref<OptionValue>('Triangle')
const endCap = ref<OptionValue>('Round')
const capThickness = ref<OptionValue>(12)

const capThicknessValue = computed(() => asNumber(capThickness.value, 12))

// —— 示例 4:stroke 画刷描述接口(Shape 家族统一画刷接口预览)——
const brushMode = ref<OptionValue>('linearGradient')

const brushStroke = computed<WuiBrush>(() => {
  switch (asString(brushMode.value)) {
    case 'solid':
      return 'SteelBlue'
    case 'radialGradient':
      return {
        type: 'radialGradient',
        stops: [
          { color: '#ffd166', offset: 0 },
          { color: '#ef476f', offset: 1 },
        ],
      }
    default:
      return {
        type: 'linearGradient',
        startX: 0,
        startY: 0,
        endX: 300,
        endY: 0,
        stops: [
          { color: '#06b6d4', offset: 0 },
          { color: '#8b5cf6', offset: 1 },
        ],
      }
  }
})

// —— 下半区固定开发文档 ——
const propertyHeaders = ['属性', '类型', '默认值', '说明']
const propertyRows: (string | number)[][] = [
  ['x1 / y1', 'number', '0', '起点坐标(px,组件坐标系原点在左上角;滑块与数字输入实时调节)'],
  ['x2 / y2', 'number', '0', '终点坐标(px)'],
  ['stroke', 'string | 画刷描述', '未设置(不渲染)', '描边画刷;WinUI Shape.Stroke 默认为 null 画刷——无 stroke 则整条线不可见。字符串为纯色,对象形式为 Shape 家族画刷描述接口(见 wiki)'],
  ['strokeThickness', 'number', '1', '描边粗细(px)'],
  ['strokeDashArray', "string | number[]", '未设置(实线)', '虚线样式,值为 strokeThickness 的倍数(WinUI 语义),如 "2 1";奇数个值自动重复成偶数(与 SVG 一致)'],
  ['strokeDashOffset', 'number', '0', '虚线起始偏移,同为 strokeThickness 的倍数'],
  ['strokeStartLineCap', "'Flat' | 'Square' | 'Round' | 'Triangle'", 'Flat', '起点线帽;Triangle 经 SVG marker 三角形补绘'],
  ['strokeEndLineCap', "'Flat' | 'Square' | 'Round' | 'Triangle'", 'Flat', '终点线帽;SVG 单一 linecap 表达 start/end 不同时终点优先'],
  ['strokeDashCap', "'Flat' | 'Square' | 'Round' | 'Triangle'", 'Flat', '虚线段线帽;SVG 无独立虚线帽属性,开启虚线后由它决定 linecap(近似,见 wiki)'],
  ['strokeLineJoin', "'Miter' | 'Bevel' | 'Round'", 'Miter', '连接方式;直线段无可见效果,为 Shape 家族接口预留'],
  ['strokeMiterLimit', 'number', '10', '斜接限制(SVG stroke-miterlimit)'],
  ['opacity', 'number', '1', '不透明度(WinUI UIElement.Opacity,范围 0–1)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['—(无业务事件)', '—', 'Line 为纯绘制 Shape(非 Control),不声明业务事件;原生指针事件等 DOM 事件照常触发'],
]

// 用法代码随官方示例区参数实时更新,直观展示「参数 → 代码」映射
const usageCode = computed(
  () => `<WuiCanvas style="width: 100px; height: 200px">
  <WuiLine
    data-canvas-top="50"
    stroke="SteelBlue"
    :x1="${officialX1Value.value}"
    :y1="${officialY1Value.value}"
    :x2="${officialX2Value.value}"
    :y2="${officialY2Value.value}"
    :stroke-thickness="${officialThicknessValue.value}" />
</WuiCanvas>`,
)
</script>

<template>
  <DemoPage wiki="Line"
    title="Line"
    description="在两点之间绘制一条直线的 Shape:X1/Y1 → X2/Y2 定位,由 stroke(必设)与 strokeThickness 等描边属性控制外观,渲染为内联 SVG。"
  >
    <template #demo>
      <div class="line-stage">
        <!-- 示例 1:官方示例对照(Canvas.Top=50 的 SteelBlue 直线,滑块调节坐标与粗细;
             画布宽 100、终点 X 200–300,线段越出画布可见——WinUI Shape 默认不裁剪) -->
        <div class="example-item">
          <p class="example-caption">
            官方示例对照:Canvas(100×200)内 Canvas.Top=50 的 SteelBlue 直线,滑块调节 X1/Y1/X2/Y2 与粗细;线段越出画布仍可见(Shape 默认不裁剪)
          </p>
          <WuiCanvas
            class="demo-canvas"
            background="var(--wui-system-control-background-chrome-medium-low)"
            :style="{ width: '100px', height: '200px' }"
          >
            <WuiLine
              data-canvas-top="50"
              stroke="SteelBlue"
              :x1="officialX1Value"
              :y1="officialY1Value"
              :x2="officialX2Value"
              :y2="officialY2Value"
              :stroke-thickness="officialThicknessValue"
            />
          </WuiCanvas>
        </div>

        <!-- 示例 2:虚线样式实时调整 -->
        <div class="example-item">
          <p class="example-caption">
            虚线样式:StrokeDashArray 的值为粗细的倍数(如 "2 2" = 各 2 倍粗细的实/空段),参数区改写虚线串、偏移与虚线帽实时生效
          </p>
          <WuiCanvas
            class="demo-canvas"
            background="var(--wui-system-control-background-chrome-medium-low)"
            :style="{ width: '340px', height: '150px' }"
          >
            <WuiLine
              stroke="SteelBlue"
              :x1="0"
              :y1="30"
              :x2="320"
              :y2="30"
              :stroke-thickness="dashThicknessValue"
              :stroke-dash-array="asString(dashPatternText)"
              :stroke-dash-offset="dashOffsetValue"
              :stroke-dash-cap="asCap(dashCap)"
            />
            <WuiLine
              stroke="SteelBlue"
              :x1="10"
              :y1="120"
              :x2="320"
              :y2="60"
              :stroke-thickness="dashThicknessValue"
              :stroke-dash-array="asString(dashPatternText)"
              :stroke-dash-offset="dashOffsetValue"
              :stroke-dash-cap="asCap(dashCap)"
            />
          </WuiCanvas>
        </div>

        <!-- 示例 3:线帽 -->
        <div class="example-item">
          <p class="example-caption">
            线帽:Flat/Square/Round 映射 SVG linecap,Triangle 由 SVG marker 三角形补绘(底边垂直于线段、尺寸随粗细缩放)
          </p>
          <WuiCanvas
            class="demo-canvas"
            background="var(--wui-system-control-background-chrome-medium-low)"
            :style="{ width: '340px', height: '120px' }"
          >
            <WuiLine
              stroke="SteelBlue"
              :x1="30"
              :y1="60"
              :x2="310"
              :y2="60"
              :stroke-thickness="capThicknessValue"
              :stroke-start-line-cap="asCap(startCap)"
              :stroke-end-line-cap="asCap(endCap)"
            />
          </WuiCanvas>
        </div>

        <!-- 示例 4:stroke 画刷描述接口 -->
        <div class="example-item">
          <p class="example-caption">
            画刷描述接口:stroke 除纯色字符串外接受画刷描述对象(线性/径向渐变),为 Shape 家族与 RadialGradientBrush 等配合预留
          </p>
          <WuiCanvas
            class="demo-canvas"
            background="var(--wui-system-control-background-chrome-medium-low)"
            :style="{ width: '340px', height: '120px' }"
          >
            <WuiLine :stroke="brushStroke" :x1="20" :y1="90" :x2="320" :y2="30" :stroke-thickness="16" />
          </WuiCanvas>
        </div>
      </div>
    </template>

    <template #options>
      <h3 class="group-title">官方示例区(坐标与粗细滑块)</h3>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Start point X" type="slider" v-model="officialX1" :min="0" :max="100" :step="0.5" />
        <DemoOptionRow label="Start point Y" type="slider" v-model="officialY1" :min="0" :max="100" :step="0.5" />
        <DemoOptionRow label="End point X" type="slider" v-model="officialX2" :min="200" :max="300" :step="0.5" />
        <DemoOptionRow label="End point Y" type="slider" v-model="officialY2" :min="0" :max="100" :step="0.5" />
        <DemoOptionRow label="Stroke Thickness" type="slider" v-model="officialThickness" :min="5" :max="10" :step="0.5" />
      </DemoOptions>

      <h3 class="group-title">坐标数字输入(与滑块同步)</h3>
      <DemoOptions :columns="2">
        <DemoOptionRow label="X1" type="number" v-model="officialX1" :step="0.5" />
        <DemoOptionRow label="Y1" type="number" v-model="officialY1" :step="0.5" />
        <DemoOptionRow label="X2" type="number" v-model="officialX2" :step="0.5" />
        <DemoOptionRow label="Y2" type="number" v-model="officialY2" :step="0.5" />
      </DemoOptions>

      <h3 class="group-title">虚线样式</h3>
      <DemoOptions :columns="2">
        <DemoOptionRow label="StrokeDashArray(倍数)" type="text" v-model="dashPatternText" placeholder="如 2 2 / 3 1 0.5" />
        <DemoOptionRow label="StrokeThickness" type="slider" v-model="dashThickness" :min="2" :max="16" :step="1" />
        <DemoOptionRow label="StrokeDashOffset" type="slider" v-model="dashOffset" :min="0" :max="10" :step="0.5" />
        <DemoOptionRow label="StrokeDashCap" type="select" v-model="dashCap" :options="capChoices" />
      </DemoOptions>

      <h3 class="group-title">线帽</h3>
      <DemoOptions :columns="2">
        <DemoOptionRow label="StrokeStartLineCap" type="select" v-model="startCap" :options="capChoices" />
        <DemoOptionRow label="StrokeEndLineCap" type="select" v-model="endCap" :options="capChoices" />
        <DemoOptionRow label="StrokeThickness" type="slider" v-model="capThickness" :min="2" :max="24" :step="1" />
      </DemoOptions>

      <h3 class="group-title">画刷描述</h3>
      <DemoOptions :columns="2">
        <DemoOptionRow
          label="stroke 画刷"
          type="select"
          v-model="brushMode"
          :options="[
            { label: '纯色(字符串)', value: 'solid' },
            { label: '线性渐变', value: 'linearGradient' },
            { label: '径向渐变', value: 'radialGradient' },
          ]"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">属性</h3>
      <DemoDocsTable :headers="propertyHeaders" :rows="propertyRows" />
      <p class="docs-note">
        注:Stretch 不是 Line 自己的属性,而是 Shape 基类属性——WinUI 的 Line 会继承它(非 None 时把线段拉伸适配布局框),
        本组件按官方示例口径固定按坐标渲染、未实现 Stretch;概念与取舍见 wiki「Stretch 概念说明」。
      </p>
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.line-stage {
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

.example-caption {
  margin: 0;
  max-width: 560px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* WinUI Shape 无边框背景,演示加浅色描边便于观察坐标系与越界可见性 */
.demo-canvas {
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.group-title {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-note {
  margin: 8px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
