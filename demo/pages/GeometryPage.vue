<script setup lang="ts">
// Geometry 几何语法教学页(路由 /geometry 自动注册):对照官方 WinUI Gallery 的 Geometry 页
// (CK/WinUI-Gallery/Samples/Geometry,该页主体为 Windows 11 三级圆角速查)并扩展为
// XAML 几何标记(Path 迷你语言)的逐指令教学:
//   1. F 前缀与 M/L/H/V/C/S/Q/T/A/Z 每种指令一节:说明 + 可编辑示例 + 实时渲染(Path.vue)
//      + 解析器规范化输出/诊断;
//   2. 整段几何输入实时渲染(Playground:填充/描边/Stretch 实时调节,读出填充规则、
//      指令数、包围盒与规范化 d);
//   3. 常用图形几何速查表(三角形/星形/心形/圆弧等,数据即 XAML 几何串);
//   4. 官方示例对照:三级圆角速查(OverlayCornerRadius 8px / ControlCornerRadius 4px / 0px)。
import { computed, ref } from 'vue'
import WuiPath from '@/components/Path.vue'
import { parseGeometry } from '@/utils/geometry'
import type { GeometryData } from '@/utils/geometry'
import { geometryBounds } from '@/utils/geometryBounds'
import type { ShapeStretch } from '@/utils/shapeGeometry'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { pickText, useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Geometry(几何)', en: 'Geometry' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '几何描述 UI 元素的形状、尺寸与位置,是 Path / PathIcon 等控件的数据基础。本页逐指令教学 XAML 几何标记(Path 迷你语言):可编辑示例实时渲染,附解析器规范化输出与诊断,以及官方 Windows 11 圆角速查对照。',
  en: 'Geometry describes shape, size and position of UI elements and feeds controls like Path / PathIcon. A command-by-command tour of the XAML geometry mini-language with live editable examples, normalized parser output, plus the official Windows 11 corner-radius reference.',
}
const COMMANDS_LABEL: BilingualText = { zh: '指令逐个看(示例可编辑)', en: 'Commands (editable examples)' }
const PLAYGROUND_LABEL: BilingualText = { zh: '整段几何输入实时渲染', en: 'Live playground' }
const SHAPES_LABEL: BilingualText = { zh: '常用图形几何速查', en: 'Common shapes cheat sheet' }
const CORNER_LABEL: BilingualText = { zh: '官方示例对照:Windows 11 三级圆角', en: 'Official sample: Windows 11 corner radii' }
const CORNER_INTRO: BilingualText = {
  zh: '官方 Gallery 的 Geometry 页讲的是 Windows 11 的圆角体系:按 UI 元素的层级使用三级圆角(8px / 4px / 0px),以保证整体设计语言一致。XAML 里通过主题资源引用,不自写死数值。',
  en: 'The official Gallery Geometry page covers the Windows 11 corner-radius system: three rounding levels (8px / 4px / 0px) chosen by element hierarchy, referenced via theme resources instead of hard-coded values.',
}
const RADIUS_LABEL: BilingualText = { zh: '圆角半径', en: 'Radius' }
const USAGE_LABEL: BilingualText = { zh: '用途', en: 'Usage' }
const STYLE_LABEL: BilingualText = { zh: '样式资源', en: 'Style resource' }
const SHAPE_LABEL: BilingualText = { zh: '图形', en: 'Shape' }
const DATA_LABEL: BilingualText = { zh: '几何数据(XAML)', en: 'Geometry data (XAML)' }
const RENDER_LABEL: BilingualText = { zh: '渲染', en: 'Render' }
const NORMALIZED_LABEL: BilingualText = { zh: '规范化 d', en: 'Normalized d' }
const ISSUE_LABEL: BilingualText = { zh: '解析诊断', en: 'Parse issues' }
const PARSE_OK: BilingualText = { zh: '解析成功(0 诊断)', en: 'Parsed (0 issues)' }
const FILL_LABEL: BilingualText = { zh: '填充', en: 'Fill' }
const THICKNESS_LABEL: BilingualText = { zh: 'StrokeThickness', en: 'StrokeThickness' }
const STRETCH_LABEL: BilingualText = { zh: 'Stretch', en: 'Stretch' }
const FILLRULE_READOUT: BilingualText = { zh: '填充规则', en: 'Fill rule' }
const COMMANDS_READOUT: BilingualText = { zh: '指令数(规范化后)', en: 'Commands (normalized)' }
const BOUNDS_READOUT: BilingualText = { zh: '包围盒(近似)', en: 'Bounds (approx.)' }
const API_TITLE: BilingualText = { zh: '解析器 API', en: 'Parser API' }
const USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }
const SAMPLE_SOURCE_TITLE: BilingualText = { zh: '官方示例源(Geometry.txt)', en: 'Official sample source (Geometry.txt)' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const commandsLabel = useBilingual(i18n, COMMANDS_LABEL)
const playgroundLabel = useBilingual(i18n, PLAYGROUND_LABEL)
const shapesLabel = useBilingual(i18n, SHAPES_LABEL)
const cornerLabel = useBilingual(i18n, CORNER_LABEL)
const cornerIntro = useBilingual(i18n, CORNER_INTRO)
const radiusLabel = useBilingual(i18n, RADIUS_LABEL)
const usageLabel = useBilingual(i18n, USAGE_LABEL)
const styleLabel = useBilingual(i18n, STYLE_LABEL)
const shapeLabel = useBilingual(i18n, SHAPE_LABEL)
const dataLabel = useBilingual(i18n, DATA_LABEL)
const renderLabel = useBilingual(i18n, RENDER_LABEL)
const normalizedLabel = useBilingual(i18n, NORMALIZED_LABEL)
const issueLabel = useBilingual(i18n, ISSUE_LABEL)
const parseOk = useBilingual(i18n, PARSE_OK)
const fillLabel = useBilingual(i18n, FILL_LABEL)
const thicknessLabel = useBilingual(i18n, THICKNESS_LABEL)
const stretchLabel = useBilingual(i18n, STRETCH_LABEL)
const fillRuleReadout = useBilingual(i18n, FILLRULE_READOUT)
const commandsReadout = useBilingual(i18n, COMMANDS_READOUT)
const boundsReadout = useBilingual(i18n, BOUNDS_READOUT)
const apiTitle = useBilingual(i18n, API_TITLE)
const usageTitle = useBilingual(i18n, USAGE_TITLE)
const sampleSourceTitle = useBilingual(i18n, SAMPLE_SOURCE_TITLE)

// 官方示例用字面色,Web 侧换成 --wui-* token(跟随主题;差异记 wiki)
const FILL = 'var(--wui-system-accent-color)'
const STROKE = 'var(--wui-application-foreground-theme)'

// —— 逐指令教学(F 前缀 + 十个绘图/关门指令;说明对照 MS Learn「Path markup syntax」)——
interface CommandSection {
  /** 指令字母(展示大小写两种形态) */
  letters: string
  /** 输入框状态键(用规范化大写名) */
  key: string
  title: BilingualText
  syntax: string
  description: BilingualText
  example: string
}

// 五角星(自交,star polygon {5/2}):F0 EvenOdd 中心镂空 / F1 Nonzero 实心,切换前缀即可对照
const STAR = 'M 17,2 25.8,29.1 2.7,12.4 31.3,12.4 8.2,29.1 Z'

const COMMAND_SECTIONS: CommandSection[] = [
  {
    letters: 'F0 / F1',
    key: 'F',
    title: { zh: '填充规则前缀', en: 'Fill rule prefix' },
    syntax: 'F0 | F1(必须最前,可与首指令紧邻)',
    description: {
      zh: 'F0 = EvenOdd(缺省,穿越奇数次才填充),F1 = Nonzero(非零环绕)。对自交图形(如五角星)两者观感不同:改成 F1 看中心变化。',
      en: 'F0 = EvenOdd (default), F1 = Nonzero. They differ on self-intersecting shapes like the pentagram below: switch to F1 and watch the center fill.',
    },
    example: `F0 ${STAR}`,
  },
  {
    letters: 'M / m',
    key: 'M',
    title: { zh: '移动(Moveto)', en: 'Move' },
    syntax: 'M x,y [x,y …]',
    description: {
      zh: '起笔/换子路径:把当前点移到目标(不画线)。大写绝对坐标、小写相对偏移。首对之后的点对按 L/l 处理(隐式折线);重复 M 开启新子路径。',
      en: 'Starts a figure at the point without drawing. Uppercase = absolute, lowercase = offset. Extra pairs become implicit L/l segments; repeated M opens a new subpath.',
    },
    example: 'M 4,28 28,4 M 4,4 28,28',
  },
  {
    letters: 'L / l',
    key: 'L',
    title: { zh: '直线(LineTo)', en: 'Line' },
    syntax: 'L x,y [x,y …]',
    description: {
      zh: '从当前点到目标点画直线;参数集可隐式重复("L 1,1 2,2" 等价连续两条 L)。',
      en: 'Draws a line to the point. Parameter sets repeat implicitly: "L 1,1 2,2" is two line segments.',
    },
    example: 'M 4,28 L 16,4 28,28',
  },
  {
    letters: 'H / h',
    key: 'H',
    title: { zh: '水平线', en: 'Horizontal line' },
    syntax: 'H x | h dx',
    description: {
      zh: '水平画线到指定 x(一个参数);h 为相对偏移。',
      en: 'Horizontal line to the given x (single argument); h takes an offset.',
    },
    example: 'M 6,10 H 26 M 6,20 h 20',
  },
  {
    letters: 'V / v',
    key: 'V',
    title: { zh: '垂直线', en: 'Vertical line' },
    syntax: 'V y | v dy',
    description: {
      zh: '垂直画线到指定 y(一个参数);v 为相对偏移。',
      en: 'Vertical line to the given y (single argument); v takes an offset.',
    },
    example: 'M 10,4 V 28 M 22,4 v 24',
  },
  {
    letters: 'C / c',
    key: 'C',
    title: { zh: '三次贝塞尔', en: 'Cubic Bezier' },
    syntax: 'C c1 c2 end',
    description: {
      zh: '用两个控制点画三次贝塞尔曲线(参数集 6 个数)。c1 决定起点切线方向,c2 决定终点切线方向。',
      en: 'Cubic Bezier with two control points (6 numbers). c1 shapes the starting tangent, c2 the ending tangent.',
    },
    example: 'M 4,28 C 4,4 28,4 28,28',
  },
  {
    letters: 'S / s',
    key: 'S',
    title: { zh: '平滑三次贝塞尔', en: 'Smooth cubic' },
    syntax: 'S c2 end',
    description: {
      zh: '省略第一个控制点:自动取上一条 C/S 第二控制点关于当前点的镜像(上一指令不是 C/S 时取当前点)。适合连续 S 拼出平滑长曲线。',
      en: 'Omits the first control point: it mirrors the previous C/S second control point across the current point (or is the current point itself). Chain S for smooth waves.',
    },
    example: 'M 2,22 C 8,2 12,2 16,14 S 26,32 30,10',
  },
  {
    letters: 'Q / q',
    key: 'Q',
    title: { zh: '二次贝塞尔', en: 'Quadratic Bezier' },
    syntax: 'Q ctrl end',
    description: {
      zh: '用一个控制点画二次贝塞尔曲线(4 个数),是 C 的轻量版。',
      en: 'Quadratic Bezier with a single control point (4 numbers) — a lighter cousin of C.',
    },
    example: 'M 4,28 Q 16,-4 28,28',
  },
  {
    letters: 'T / t',
    key: 'T',
    title: { zh: '平滑二次贝塞尔', en: 'Smooth quadratic' },
    syntax: 'T end',
    description: {
      zh: '控制点自动反射上一条 Q/T 的控制点(上一指令不是 Q/T 时取当前点),连续 T 得到连续平滑波形。',
      en: 'Control point mirrors the previous Q/T control (or the current point). Chained T commands produce continuous smooth waves.',
    },
    example: 'M 2,20 Q 8,4 16,20 T 30,20',
  },
  {
    letters: 'A / a',
    key: 'A',
    title: { zh: '椭圆弧', en: 'Elliptical arc' },
    syntax: 'A rx,ry rotation largeArc sweep x,y',
    description: {
      zh: '在当前点与终点间画椭圆弧(7 个数):rx/ry 半径、rotation 椭圆旋转角、largeArc 取大/小弧、sweep 方向(1 顺时针)。两个 flag 可按单字符紧写(a5 5 0 0110 0)。',
      en: 'Elliptical arc (7 numbers): rx/ry radii, rotation, largeArc flag, sweep flag (1 = clockwise). The two flags may be written compactly (a5 5 0 0110 0).',
    },
    example: 'M 4,24 A 12,12 0 0 1 28,24 a 12,12 0 0 1 -24,0',
  },
  {
    letters: 'Z / z',
    key: 'Z',
    title: { zh: '关门(Close)', en: 'Close' },
    syntax: 'Z',
    description: {
      zh: '用直线连回当前子路径起点并形成接角(拐角连接)。之后的 M 开启新子路径。',
      en: 'Closes back to the subpath start with a line join. A following M opens a new subpath.',
    },
    example: 'M 16,4 L 28,26 L 4,26 Z',
  },
]

// 每个指令示例的输入状态(key → 当前文本,初值为示例)
const commandInputs = ref<Record<string, string>>(
  Object.fromEntries(COMMAND_SECTIONS.map((section) => [section.key, section.example])),
)

// 全部示例实时解析(教学展示规范化输出与诊断)
const commandParsed = computed<Record<string, GeometryData>>(() => {
  const out: Record<string, GeometryData> = {}
  for (const [key, text] of Object.entries(commandInputs.value)) out[key] = parseGeometry(text)
  return out
})

// —— 整段输入 Playground ——
const HEART_DATA =
  'M 12,21 C 6,15 2,11.5 2,7.5 C 2,4.5 4.5,2 7.5,2 C 9.5,2 11,3 12,4.5 C 13,3 14.5,2 16.5,2 ' +
  'C 19.5,2 22,4.5 22,7.5 C 22,11.5 18,15 12,21 Z'
const playgroundData = ref(HEART_DATA)
const playgroundFilled = ref<string | number | boolean>(true)
const playgroundThickness = ref<string | number | boolean>(1)
const playgroundStretch = ref<string | number | boolean>('Uniform')

const STRETCH_CHOICES = [
  { label: 'Uniform(等比完整显示)', value: 'Uniform' },
  { label: 'None(原坐标 1:1)', value: 'None' },
  { label: 'Fill(两轴拉伸填满)', value: 'Fill' },
  { label: 'UniformToFill(填满裁剪)', value: 'UniformToFill' },
]

const playgroundParsed = computed(() => parseGeometry(playgroundData.value))
const playgroundBounds = computed(() => geometryBounds(playgroundParsed.value))
const playgroundStretchValue = computed(() => String(playgroundStretch.value) as ShapeStretch)
const playgroundThicknessValue = computed(() => {
  const parsed = Number(playgroundThickness.value)
  return Number.isFinite(parsed) ? parsed : 1
})

// —— 常用图形速查(数据即 XAML 几何串,可直接贴进 Path.Data / PathIcon.Data)——
interface ShapeRow {
  name: BilingualText
  d: string
}

const SHAPE_ROWS: ShapeRow[] = [
  { name: { zh: '三角形', en: 'Triangle' }, d: 'M 12,2 L 22,20 L 2,20 Z' },
  { name: { zh: '菱形', en: 'Diamond' }, d: 'M 12,1 L 23,12 12,23 1,12 Z' },
  {
    name: { zh: '五角星', en: 'Star' },
    d: 'M 12,1.5 14.5,8.6 22,8.8 16,13.3 18.2,20.5 12,16.2 5.8,20.5 8,13.3 2,8.8 9.5,8.6 Z',
  },
  {
    name: { zh: '心形', en: 'Heart' },
    d: HEART_DATA,
  },
  { name: { zh: '圆(双弧)', en: 'Circle (two arcs)' }, d: 'M 2,12 A 10,10 0 1 1 22,12 A 10,10 0 1 1 2,12 Z' },
  { name: { zh: '半圆', en: 'Semi-circle' }, d: 'M 2,14 A 10,10 0 0 1 22,14 Z' },
  { name: { zh: '胶囊', en: 'Pill' }, d: 'M 7,7 H 17 A 5,5 0 0 1 17,17 H 7 A 5,5 0 0 1 7,7 Z' },
  { name: { zh: '波形', en: 'Wave' }, d: 'M 2,12 C 6,4 9,4 12,12 S 18,20 22,12' },
  {
    name: { zh: '水滴', en: 'Drop' },
    d: 'M 12,2 C 17,9 20,12 20,16 A 8,8 0 1 1 4,16 C 4,12 7,9 12,2 Z',
  },
]

// —— 官方示例对照:Windows 11 三级圆角(CK/.../Geometry/GeometryPage.xaml + Geometry.txt)——
const CORNER_ROWS: { value: string; resource: string; usage: BilingualText }[] = [
  {
    value: '8px',
    resource: 'OverlayCornerRadius',
    usage: { zh: '顶级容器:应用窗口、浮出层、卡片、对话框', en: 'Top-level containers: windows, flyouts, cards, dialogs' },
  },
  {
    value: '4px',
    resource: 'ControlCornerRadius',
    usage: { zh: '页面内元素:控件与列表底板', en: 'In-page elements: controls and list backplates' },
  },
  {
    value: '0px',
    resource: 'N/a',
    usage: { zh: '直边与直边相交处不做圆角', en: 'Straight edges that intersect straight edges' },
  },
]

const CORNER_XAML = `<Grid CornerRadius="{StaticResource OverlayCornerRadius}"/>
<Grid CornerRadius="{StaticResource ControlCornerRadius}"/>`

// —— 下半区固定开发文档:解析器 API ——
const apiHeaders = ['成员', '类型 / 签名', '说明']
const apiRows: (string | number)[][] = [
  ['parseGeometry', '(data: string) => GeometryData', 'XAML 几何标记 → 规范化表示;宽松解析,无效片段记入 issues'],
  ['geometryBounds', '(input: string | GeometryData | GeometryCommand[]) => ShapeRect | null', '几何包围盒(近似):直线精确,贝塞尔控制点计入界,A 弧只计端点(与 Path.vue 口径一致)'],
  ['GeometryData.fillRule', "'EvenOdd' | 'Nonzero'", 'F1 → Nonzero;F0/缺省 → EvenOdd(XAML 缺省)'],
  ['GeometryData.commands', 'GeometryCommand[]', '规范化绝对指令序列(隐式重复已展开)'],
  ['GeometryData.d', 'string', '规范化 SVG path d,可直接给 <path d> / Path.vue 的 data'],
  ['GeometryData.issues', '{ index, message }[]', '跳过的无效片段诊断;length 0 = 整串解析成功'],
]

const usageCode = `import { parseGeometry } from '@/utils/geometry'
import { geometryBounds } from '@/utils/geometryBounds'
import WuiPath from '@/components/Path.vue'

const geo = parseGeometry('F1 M 16,12 20,2 L 20,16 1,16 Z')
geo.d        // 'M 16 12 L 20 2 L 20 16 L 1 16 Z'
geo.fillRule // 'Nonzero'
geometryBounds(geo) // { x: 1, y: 2, width: 19, height: 14 }

<WuiPath data="F1 M 16,12 20,2 L 20,16 1,16 Z" fill="var(--wui-system-accent-color)" />`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Geometry">
    <template #demo>
      <div class="geometry-stage">
        <!-- —— 1. 逐指令教学 —— -->
        <section>
          <h3 class="section-title">{{ commandsLabel }}</h3>
          <div class="command-list">
            <section v-for="item in COMMAND_SECTIONS" :key="item.key" class="command-card">
              <header class="command-head">
                <code class="command-letters">{{ item.letters }}</code>
                <div class="command-titles">
                  <strong class="command-name">{{ pickText(i18n, item.title) }}</strong>
                  <code class="command-syntax">{{ item.syntax }}</code>
                </div>
              </header>
              <p class="command-desc">{{ pickText(i18n, item.description) }}</p>
              <div class="command-body">
                <input
                  v-model="commandInputs[item.key]"
                  type="text"
                  class="command-input"
                  spellcheck="false"
                  :aria-label="item.letters"
                />
                <div class="command-render">
                  <WuiPath
                    :data="commandInputs[item.key] ?? ''"
                    stretch="Uniform"
                    :width="88"
                    :height="88"
                    :fill="FILL"
                    :stroke="STROKE"
                    :stroke-thickness="1"
                  />
                </div>
                <div class="command-output">
                  <template v-if="(commandParsed[item.key]?.issues.length ?? 0) > 0">
                    <span class="issue-label">{{ issueLabel }}</span>
                    <span class="issue-text">
                      {{ commandParsed[item.key]?.issues.map((issue) => `@${issue.index} ${issue.message}`).join('; ') }}
                    </span>
                  </template>
                  <template v-else>
                    <span class="issue-label">{{ parseOk }}</span>
                    <pre class="normalized-d">{{ commandParsed[item.key]?.d || '—' }}</pre>
                    <span class="output-caption">{{ normalizedLabel }}</span>
                  </template>
                </div>
              </div>
            </section>
          </div>
        </section>

        <!-- —— 2. 整段输入 Playground —— -->
        <section>
          <h3 class="section-title">{{ playgroundLabel }}</h3>
          <div class="playground">
            <textarea
              v-model="playgroundData"
              class="playground-input"
              rows="3"
              spellcheck="false"
              :aria-label="playgroundLabel"
            ></textarea>
            <div class="playground-body">
              <div class="playground-render">
                <WuiPath
                  :data="playgroundData"
                  :stretch="playgroundStretchValue"
                  :width="200"
                  :height="200"
                  :fill="playgroundFilled === true ? FILL : undefined"
                  :stroke="STROKE"
                  :stroke-thickness="playgroundThicknessValue"
                />
              </div>
              <div class="playground-readout">
                <p class="readout-line">{{ fillRuleReadout }}: {{ playgroundParsed.fillRule }}</p>
                <p class="readout-line">{{ commandsReadout }}: {{ playgroundParsed.commands.length }}</p>
                <p class="readout-line">
                  {{ boundsReadout }}:
                  <template v-if="playgroundBounds">
                    x {{ playgroundBounds.x }} · y {{ playgroundBounds.y }} · {{ playgroundBounds.width }} × {{ playgroundBounds.height }}
                  </template>
                  <template v-else>—</template>
                </p>
                <p class="readout-line" :class="{ 'readout-issue': playgroundParsed.issues.length > 0 }">
                  {{ playgroundParsed.issues.length > 0 ? `${issueLabel}: ${playgroundParsed.issues.length}` : parseOk }}
                </p>
                <DemoCode :code="playgroundParsed.d" language="svg" />
              </div>
            </div>
          </div>
        </section>

        <!-- —— 3. 常用图形速查 —— -->
        <section>
          <h3 class="section-title">{{ shapesLabel }}</h3>
          <div class="table-scroll" tabindex="0">
            <table class="shape-table">
              <thead>
                <tr>
                  <th scope="col">{{ shapeLabel }}</th>
                  <th scope="col">{{ dataLabel }}</th>
                  <th scope="col" class="cell-render">{{ renderLabel }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in SHAPE_ROWS" :key="row.d">
                  <td class="cell-name">{{ pickText(i18n, row.name) }}</td>
                  <td><code class="shape-d">{{ row.d }}</code></td>
                  <td class="cell-render">
                    <WuiPath :data="row.d" stretch="Uniform" :width="36" :height="36" :fill="FILL" :stroke="STROKE" :stroke-thickness="1" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- —— 4. 官方示例对照:三级圆角 —— -->
        <section>
          <h3 class="section-title">{{ cornerLabel }}</h3>
          <p class="corner-intro">{{ cornerIntro }}</p>
          <div class="table-scroll" tabindex="0">
            <table class="shape-table">
              <thead>
                <tr>
                  <th scope="col">{{ radiusLabel }}</th>
                  <th scope="col">{{ usageLabel }}</th>
                  <th scope="col">{{ styleLabel }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in CORNER_ROWS" :key="row.resource">
                  <td class="cell-radius">
                    <span
                      class="radius-swatch"
                      :style="{ borderRadius: row.value === '8px' ? '8px' : row.value === '4px' ? '4px' : '0px' }"
                    ></span>
                    {{ row.value }}
                  </td>
                  <td>{{ pickText(i18n, row.usage) }}</td>
                  <td><code class="shape-d">{{ row.resource }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
          <h4 class="docs-subtitle">{{ sampleSourceTitle }}</h4>
          <DemoCode :code="CORNER_XAML" language="xaml" />
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="fillLabel" type="toggle" v-model="playgroundFilled" />
        <DemoOptionRow :label="thicknessLabel" type="slider" v-model="playgroundThickness" :min="0" :max="8" :step="0.5" />
        <DemoOptionRow :label="stretchLabel" type="select" v-model="playgroundStretch" :options="STRETCH_CHOICES" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ apiTitle }}</h3>
      <DemoDocsTable :headers="apiHeaders" :rows="apiRows" />
      <h3 class="docs-subtitle">{{ usageTitle }}</h3>
      <DemoCode :code="usageCode" language="ts" />
    </template>
  </DemoPage>
</template>

<style scoped>
.geometry-stage {
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

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 逐指令教学卡片 —— */
.command-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.command-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.command-letters {
  min-width: 76px;
  padding: 2px 8px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  background: var(--wui-system-control-background-chrome-medium-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  text-align: center;
}

.command-titles {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.command-name {
  color: var(--wui-application-foreground-theme);
}

.command-syntax {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.command-desc {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.command-body {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) 104px minmax(200px, 1fr);
  align-items: center;
  gap: 12px;
}

.command-input {
  padding: 4px 8px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.command-input:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.command-render {
  display: flex;
  justify-content: center;
}

.command-output {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.issue-label {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.issue-text {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-error-text-foreground);
  overflow-wrap: anywhere;
}

.normalized-d {
  margin: 0;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 72px;
  overflow-y: auto;
}

.output-caption {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— Playground —— */
.playground {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.playground-input {
  width: 100%;
  padding: 8px 10px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  resize: vertical;
}

.playground-input:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.playground-body {
  display: grid;
  grid-template-columns: 232px minmax(240px, 1fr);
  align-items: start;
  gap: 16px;
}

.playground-render {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  border: 1px dashed var(--wui-system-control-foreground-chrome-gray);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.playground-readout {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.readout-line {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  color: var(--wui-application-secondary-foreground-theme);
}

.readout-issue {
  color: var(--wui-system-control-error-text-foreground);
}

/* —— 速查表 / 圆角对照表 —— */
.table-scroll {
  overflow-x: auto;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.shape-table {
  width: 100%;
  border-collapse: collapse;
}

.shape-table th,
.shape-table td {
  padding: 8px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  text-align: left;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.shape-table th {
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

.shape-table tbody tr:last-child td {
  border-bottom: none;
}

.cell-name {
  white-space: nowrap;
}

.shape-d {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  overflow-wrap: anywhere;
}

.cell-render {
  text-align: center;
}

.cell-radius {
  white-space: nowrap;
}

.radius-swatch {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  vertical-align: middle;
  background: var(--wui-system-accent-color);
}

.corner-intro {
  margin: 0 0 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

@media (max-width: 860px) {
  .command-body {
    grid-template-columns: 1fr;
  }

  .playground-body {
    grid-template-columns: 1fr;
  }
}
</style>
