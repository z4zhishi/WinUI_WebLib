<script setup lang="ts">
// Shape 形状族示例页:家族一览 + 官方 ShapePage 示例对照(椭圆/矩形/多边形三组滑块)
// + 折线闭合语义对照 + 五角星 FillRule 对照 + Path 数据输入与 Stretch 四档对照。
import { computed, ref } from 'vue'
import WuiEllipse from '@/components/Ellipse.vue'
import WuiPath from '@/components/Path.vue'
import WuiPolygon from '@/components/Polygon.vue'
import WuiPolyline from '@/components/Polyline.vue'
import WuiRectangle from '@/components/Rectangle.vue'
import type { ShapeFillRule, ShapeStretch } from '@/utils/shapeGeometry'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Shape(形状族)', en: 'Shape' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '基础形状(Ellipse / Rectangle / Polygon / Polyline / Path)用于装饰性渲染或组合控件的非交互部分:全部以 SVG 绘制,共享描边、填充、Stretch 拉伸等形状基类属性。',
  en: 'Basic shapes (Ellipse / Rectangle / Polygon / Polyline / Path) for decorative rendering or composing non-interactive parts of controls. All rendered as SVG with shared stroke, fill and Stretch properties.',
}
const FAMILY_LABEL: BilingualText = { zh: '家族一览', en: 'Family' }
const ELLIPSE_LABEL: BilingualText = { zh: 'Ellipse(官方示例对照:Width / Height / StrokeThickness 滑块)', en: 'Ellipse' }
const RECTANGLE_LABEL: BilingualText = { zh: 'Rectangle(官方示例对照:RadiusX / RadiusY 圆角)', en: 'Rectangle' }
const POLYGON_LABEL: BilingualText = { zh: 'Polygon(官方示例对照:320 × 200 Canvas + 顶点标注)', en: 'Polygon' }
const CLOSURE_LABEL: BilingualText = { zh: 'Polygon 与 Polyline 的闭合差异(同为四点 + 填充)', en: 'Polygon vs Polyline closure' }
const POLYGON_CLOSED: BilingualText = { zh: 'Polygon:描边闭合(末点连回起点)', en: 'Polygon: stroke closed' }
const POLYLINE_OPEN: BilingualText = { zh: 'Polyline:描边不闭合,填充区域仍隐式闭合', en: 'Polyline: stroke open, fill implicitly closed' }
const FILLRULE_LABEL: BilingualText = { zh: '自交多边形(五角星)的 FillRule', en: 'FillRule on a self-intersecting star' }
const PATH_LABEL: BilingualText = { zh: 'Path(数据驱动,XAML 路径迷你语言,F0/F1 前缀可选)', en: 'Path' }
const STRETCH_LABEL: BilingualText = { zh: 'Path 的 Stretch 四档对照(120 × 120 视口)', en: 'Path Stretch comparison (120 × 120)' }
const POINT_N: BilingualText = { zh: '顶点', en: 'Point' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const familyLabel = useBilingual(i18n, FAMILY_LABEL)
const ellipseLabel = useBilingual(i18n, ELLIPSE_LABEL)
const rectangleLabel = useBilingual(i18n, RECTANGLE_LABEL)
const polygonLabel = useBilingual(i18n, POLYGON_LABEL)
const closureLabel = useBilingual(i18n, CLOSURE_LABEL)
const polygonClosed = useBilingual(i18n, POLYGON_CLOSED)
const polylineOpen = useBilingual(i18n, POLYLINE_OPEN)
const fillRuleLabel = useBilingual(i18n, FILLRULE_LABEL)
const pathLabel = useBilingual(i18n, PATH_LABEL)
const stretchLabel = useBilingual(i18n, STRETCH_LABEL)
const pointN = useBilingual(i18n, POINT_N)

// —— 官方示例配色:ShapePage.xaml 用字面色 SteelBlue/Black,Web 侧换成 --wui-* token ——
const FILL = 'var(--wui-system-accent-color)'
const STROKE = 'var(--wui-application-foreground-theme)'

// —— 椭圆参数(官方滑块范围:Width/Height 100–150,Thickness 2–10)——
const ellipseWidth = ref<string | number | boolean>(125)
const ellipseHeight = ref<string | number | boolean>(125)
const ellipseStrokeThickness = ref<string | number | boolean>(6)

// —— 矩形参数(官方滑块范围:Width/Height 100–150,Thickness 2–10,Radius 0–100)——
const rectWidth = ref<string | number | boolean>(125)
const rectHeight = ref<string | number | boolean>(125)
const rectStrokeThickness = ref<string | number | boolean>(4)
const rectRadiusX = ref<string | number | boolean>(20)
const rectRadiusY = ref<string | number | boolean>(20)

// —— 多边形 / 折线参数(官方 Points 固定四点,Thickness 2–10,顶点标注可开关)——
const POLY_POINTS = '10,100 60,40 200,40 250,100'
const POLY_POINT_LIST: { x: number; y: number }[] = [
  { x: 10, y: 100 },
  { x: 60, y: 40 },
  { x: 200, y: 40 },
  { x: 250, y: 100 },
]
// 官方示例中标注文本的 Canvas.Left/Top
const POLY_POINT_LABELS: { left: number; top: number }[] = [
  { left: 0, top: 150 },
  { left: 50, top: 15 },
  { left: 200, top: 15 },
  { left: 240, top: 150 },
]
const polyStrokeThickness = ref<string | number | boolean>(4)
const showPolyPoints = ref<string | number | boolean>(false)
const lineStrokeThickness = ref<string | number | boolean>(4)
const showLineFill = ref<string | number | boolean>(true)

// —— FillRule 对照:五角星(自交十边形,EvenOdd 中心镂空 / Nonzero 实心)——
const STAR_POINTS = '100,10 152.9,172.8 14.4,72.2 185.6,72.2 47.1,172.8'
const starFillRule = ref<string | number | boolean>('EvenOdd')
const starStrokeThickness = ref<string | number | boolean>(2)
const starFillRuleValue = computed(() => String(starFillRule.value) as ShapeFillRule)

const FILLRULE_CHOICES = [
  { label: 'EvenOdd(缺省:穿越奇数次才填充,中心镂空)', value: 'EvenOdd' },
  { label: 'Nonzero(非零环绕:全部实心)', value: 'Nonzero' },
]

// —— Path 参数:数据文本可编辑(F0/F1 前缀可选)——
const HEART_DATA = 'M 12,21 C 6,15 2,11.5 2,7.5 C 2,4.5 4.5,2 7.5,2 C 9.5,2 11,3 12,4.5 C 13,3 14.5,2 16.5,2 C 19.5,2 22,4.5 22,7.5 C 22,11.5 18,15 12,21 Z'
const pathData = ref<string | number | boolean>(HEART_DATA)
const pathStrokeThickness = ref<string | number | boolean>(1)
const pathDataValue = computed(() => String(pathData.value))

const STRETCH_COMPARISONS: ShapeStretch[] = ['None', 'Fill', 'Uniform', 'UniformToFill']

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const ellipseWidthValue = computed(() => toNumber(ellipseWidth.value, 125))
const ellipseHeightValue = computed(() => toNumber(ellipseHeight.value, 125))
const ellipseThicknessValue = computed(() => toNumber(ellipseStrokeThickness.value, 6))
const rectWidthValue = computed(() => toNumber(rectWidth.value, 125))
const rectHeightValue = computed(() => toNumber(rectHeight.value, 125))
const rectThicknessValue = computed(() => toNumber(rectStrokeThickness.value, 4))
const rectRadiusXValue = computed(() => toNumber(rectRadiusX.value, 20))
const rectRadiusYValue = computed(() => toNumber(rectRadiusY.value, 20))
const polyThicknessValue = computed(() => toNumber(polyStrokeThickness.value, 4))
const lineThicknessValue = computed(() => toNumber(lineStrokeThickness.value, 4))
const lineFilled = computed(() => showLineFill.value === true)
const starThicknessValue = computed(() => toNumber(starStrokeThickness.value, 2))
const pathThicknessValue = computed(() => toNumber(pathStrokeThickness.value, 1))

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '默认值', '说明']
const docsRows: (string | number)[][] = [
  ['fill', 'string', '未设置(不填充)', '填充色(WinUI Fill 为 null 画刷时不填充);任意 CSS 颜色或 --wui-* 变量'],
  ['stroke', 'string', '未设置(不描边)', '描边色;任意 CSS 颜色或 --wui-* 变量'],
  ['strokeThickness', 'number', '1', '描边厚度(px);描在几何边界上居中,不随 Stretch/几何缩放(WinUI 语义)'],
  ['strokeDashArray', 'string | number[]', '—', '虚线段长序列,如 "2 1";数值以 strokeThickness 为单位(WinUI StrokeDashArray 语义)'],
  ['strokeLineJoin', "'Miter' | 'Bevel' | 'Round'", "'Miter'", '折线连接样式(WinUI StrokeLineJoin)'],
  ['stretch', "'None' | 'Fill' | 'Uniform' | 'UniformToFill'", "'None'", '拉伸:几何边界按四档语义映射到视口;描边不参与缩放'],
  ['opacity', 'number', '1', '整体不透明度(UIElement.Opacity,0–1)'],
  ['width / height', 'number | string', 'Ellipse/Rectangle 缺省 100;其余按几何自然尺寸', '形状视口尺寸;给定时配合 stretch 映射几何'],
  ['points(Polygon / Polyline)', 'string', "''", '顶点串,数值以空白/逗号分隔;Polygon 描边闭合,Polyline 不闭合'],
  ['fillRule(Polygon / Polyline)', "'EvenOdd' | 'Nonzero'", "'EvenOdd'", '填充规则;自交多边形两者观感不同(见五角星对照)'],
  ['radiusX / radiusY(Rectangle)', 'number', '0', '圆角椭圆半径(px),两轴独立'],
  ['data(Path)', 'string', "''", 'XAML 路径迷你语言;F0/F1 前缀(可省)选择填充规则,缺省 EvenOdd'],
  ['事件', '—', '—', '形状为纯绘制元素,无业务事件;指针等原生事件经 $attrs 透传到根 svg'],
]

const usageCode = computed(
  () => `<WuiEllipse :width="${ellipseWidthValue.value}" :height="${ellipseHeightValue.value}"
  fill="${FILL}" stroke="${STROKE}" :stroke-thickness="${ellipseThicknessValue.value}" />

<WuiRectangle width="120" height="80" :radius-x="${rectRadiusXValue.value}" :radius-y="${rectRadiusYValue.value}"
  fill="${FILL}" stroke="${STROKE}" :stroke-thickness="${rectThicknessValue.value}" />

<WuiPolygon points="10,100 60,40 200,40 250,100" fill="${FILL}" stroke="${STROKE}" />
<WuiPolyline points="10,100 60,40 200,40 250,100" stroke="${STROKE}" :stroke-thickness="4" />

<WuiPath data="F1 M 16,12 20,2L 20,16 1,16" fill="${FILL}" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Shape">
    <template #demo>
      <div class="shape-stage">
        <!-- 家族一览 -->
        <section class="family">
          <h4 class="section-title">{{ familyLabel }}</h4>
          <div class="family-row">
            <figure class="family-item">
              <WuiEllipse :width="96" :height="64" :fill="FILL" :stroke="STROKE" :stroke-thickness="2" />
              <figcaption class="family-caption">Ellipse</figcaption>
            </figure>
            <figure class="family-item">
              <WuiRectangle :width="96" :height="64" :radius-x="12" :radius-y="12" :fill="FILL" :stroke="STROKE" :stroke-thickness="2" />
              <figcaption class="family-caption">Rectangle</figcaption>
            </figure>
            <figure class="family-item">
              <WuiPolygon points="48,4 92,60 4,60" :fill="FILL" :stroke="STROKE" :stroke-thickness="2" />
              <figcaption class="family-caption">Polygon</figcaption>
            </figure>
            <figure class="family-item">
              <WuiPolyline points="4,60 32,8 60,44 92,4" :stroke="STROKE" :stroke-thickness="4" />
              <figcaption class="family-caption">Polyline</figcaption>
            </figure>
            <figure class="family-item">
              <WuiPath :data="HEART_DATA" :stretch="'Uniform'" :width="72" :height="72" :fill="FILL" :stroke="STROKE" :stroke-thickness="1" />
              <figcaption class="family-caption">Path</figcaption>
            </figure>
          </div>
        </section>

        <!-- 椭圆(官方示例对照) -->
        <section>
          <h4 class="section-title">{{ ellipseLabel }}</h4>
          <div class="demo-board">
            <WuiEllipse
              :width="ellipseWidthValue"
              :height="ellipseHeightValue"
              :fill="FILL"
              :stroke="STROKE"
              :stroke-thickness="ellipseThicknessValue"
            />
            <p class="readout">
              {{ ellipseWidthValue }} × {{ ellipseHeightValue }} · StrokeThickness {{ ellipseThicknessValue }}
            </p>
          </div>
        </section>

        <!-- 矩形(官方示例对照) -->
        <section>
          <h4 class="section-title">{{ rectangleLabel }}</h4>
          <div class="demo-board">
            <WuiRectangle
              :width="rectWidthValue"
              :height="rectHeightValue"
              :radius-x="rectRadiusXValue"
              :radius-y="rectRadiusYValue"
              :fill="FILL"
              :stroke="STROKE"
              :stroke-thickness="rectThicknessValue"
            />
            <p class="readout">
              RadiusX {{ rectRadiusXValue }} · RadiusY {{ rectRadiusYValue }}
            </p>
          </div>
        </section>

        <!-- 多边形(官方示例对照:320×200 舞台 + 顶点标注) -->
        <section>
          <h4 class="section-title">{{ polygonLabel }}</h4>
          <div class="demo-board">
            <div class="poly-canvas">
              <WuiPolygon
                class="poly-canvas__shape"
                :points="POLY_POINTS"
                width="320"
                height="200"
                :fill="FILL"
                :stroke="STROKE"
                :stroke-thickness="polyThicknessValue"
              />
              <template v-if="showPolyPoints === true">
                <span
                  v-for="(point, index) in POLY_POINT_LABELS"
                  :key="index"
                  class="poly-canvas__label"
                  :style="{ left: `${point.left}px`, top: `${point.top}px` }"
                >
                  {{ pointN }} #{{ index + 1 }}: ({{ POLY_POINT_LIST[index]?.x }},{{ POLY_POINT_LIST[index]?.y }})
                </span>
              </template>
            </div>
            <p class="readout">Points "{{ POLY_POINTS }}" · StrokeThickness {{ polyThicknessValue }}</p>
          </div>
        </section>

        <!-- Polygon / Polyline 闭合差异 -->
        <section>
          <h4 class="section-title">{{ closureLabel }}</h4>
          <div class="compare-row">
            <figure class="compare-item">
              <WuiPolygon :points="POLY_POINTS" :fill="FILL" :stroke="STROKE" :stroke-thickness="polyThicknessValue" />
              <figcaption class="family-caption">{{ polygonClosed }}</figcaption>
            </figure>
            <figure class="compare-item">
              <WuiPolyline
                :points="POLY_POINTS"
                :fill="lineFilled ? FILL : undefined"
                :stroke="STROKE"
                :stroke-thickness="lineThicknessValue"
              />
              <figcaption class="family-caption">{{ polylineOpen }}</figcaption>
            </figure>
          </div>
        </section>

        <!-- FillRule 对照(五角星) -->
        <section>
          <h4 class="section-title">{{ fillRuleLabel }}</h4>
          <div class="demo-board">
            <WuiPolygon
              :points="STAR_POINTS"
              :fill-rule="starFillRuleValue"
              :fill="FILL"
              :stroke="STROKE"
              :stroke-thickness="starThicknessValue"
            />
            <p class="readout">FillRule {{ starFillRuleValue }}</p>
          </div>
        </section>

        <!-- Path + Stretch 对照 -->
        <section>
          <h4 class="section-title">{{ pathLabel }}</h4>
          <div class="demo-board">
            <WuiPath
              :data="pathDataValue"
              stretch="Uniform"
              :width="160"
              :height="160"
              :fill="FILL"
              :stroke="STROKE"
              :stroke-thickness="pathThicknessValue"
            />
            <p class="readout">Uniform 拉伸至 160 × 160</p>
          </div>
          <h4 class="section-title section-title--sub">{{ stretchLabel }}</h4>
          <div class="compare-row">
            <figure v-for="mode in STRETCH_COMPARISONS" :key="mode" class="compare-item">
              <div class="stretch-box">
                <WuiPath
                  :data="pathDataValue"
                  :stretch="mode"
                  :width="120"
                  :height="120"
                  :fill="FILL"
                  :stroke="STROKE"
                  :stroke-thickness="pathThicknessValue"
                />
              </div>
              <figcaption class="family-caption">{{ mode }}</figcaption>
            </figure>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <div class="options-groups">
        <DemoOptions :columns="2">
          <DemoOptionRow label="椭圆 Width(px)" type="slider" v-model="ellipseWidth" :min="20" :max="300" :step="1" />
          <DemoOptionRow label="椭圆 Height(px)" type="slider" v-model="ellipseHeight" :min="20" :max="300" :step="1" />
          <DemoOptionRow label="椭圆 StrokeThickness" type="slider" v-model="ellipseStrokeThickness" :min="0" :max="20" :step="0.5" />
          <DemoOptionRow label="矩形 Width(px)" type="slider" v-model="rectWidth" :min="20" :max="300" :step="1" />
          <DemoOptionRow label="矩形 Height(px)" type="slider" v-model="rectHeight" :min="20" :max="300" :step="1" />
          <DemoOptionRow label="矩形 StrokeThickness" type="slider" v-model="rectStrokeThickness" :min="0" :max="20" :step="0.5" />
          <DemoOptionRow label="矩形 RadiusX" type="slider" v-model="rectRadiusX" :min="0" :max="100" :step="1" />
          <DemoOptionRow label="矩形 RadiusY" type="slider" v-model="rectRadiusY" :min="0" :max="100" :step="1" />
        </DemoOptions>
        <DemoOptions :columns="2">
          <DemoOptionRow label="多边形 StrokeThickness" type="slider" v-model="polyStrokeThickness" :min="0" :max="20" :step="0.5" />
          <DemoOptionRow label="多边形显示顶点标注" type="toggle" v-model="showPolyPoints" />
          <DemoOptionRow label="折线 StrokeThickness" type="slider" v-model="lineStrokeThickness" :min="0" :max="20" :step="0.5" />
          <DemoOptionRow label="折线显示填充" type="toggle" v-model="showLineFill" />
          <DemoOptionRow label="五角星 FillRule" type="select" v-model="starFillRule" :options="FILLRULE_CHOICES" />
          <DemoOptionRow label="五角星 StrokeThickness" type="slider" v-model="starStrokeThickness" :min="0" :max="12" :step="0.5" />
          <DemoOptionRow label="Path data" type="text" v-model="pathData" placeholder="F1 M 16,12 20,2L 20,16 1,16" />
          <DemoOptionRow label="Path StrokeThickness" type="slider" v-model="pathStrokeThickness" :min="0" :max="8" :step="0.5" />
        </DemoOptions>
      </div>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.shape-stage {
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: 100%;
}

.section-title {
  margin: 0 0 12px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.section-title--sub {
  margin-top: 20px;
}

/* —— 家族一览 —— */
.family-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 24px;
}

.family-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
  min-height: 96px;
  justify-content: flex-end;
}

.family-caption {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.readout {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 多边形官方示例:320×200 Canvas 舞台 + 顶点标注(Canvas.Left/Top 绝对定位)—— */
.poly-canvas {
  position: relative;
  width: 320px;
  height: 200px;
}

.poly-canvas__shape {
  position: absolute;
  top: 0;
  left: 0;
}

.poly-canvas__label {
  position: absolute;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  white-space: nowrap;
}

/* —— 对照行(闭合差异 / Stretch 四档)—— */
.compare-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 24px;
}

.compare-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.stretch-box {
  width: 120px;
  height: 120px;
  border: 1px dashed var(--wui-system-control-foreground-chrome-gray);
}

.options-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
