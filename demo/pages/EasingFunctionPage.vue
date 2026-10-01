<script setup lang="ts">
// EasingFunction 示例页:对照官方 WinUI Gallery EasingFunctionPage ——
//   官方四个示例(Standard=CircleEase EaseInOut 0.5s、Accelerate=ExponentialEase EaseIn
//   Exponent 4.5 0.15s、Decelerate=ExponentialEase EaseOut Exponent 7 0.3s、其他 XAML
//   缓动函数下拉+模式单选)→ 本页重组为:
//   ① 全族 × 三模式对照网格:WinUI 11 个缓动类 + linear 恒等基准(详见 src/utils/easingFunctions.ts
//      文件头注;WinUI 无 LinearEase)× EaseIn/EaseOut/EaseInOut = 36 格,每格迷你进度曲线 +
//      动画小球,共用一条 rAF 时间轴同屏对比;点击任意格选中该曲线。
//   ② 选中函数详解:放大 SVG 进度曲线(含线性基准虚线与 CSS cubic-bezier 叠加对照)+ 小球
//      动画 + 公式 + 可调参数(WinUI 属性默认值来自参照源 EasingFunctions.h)。
//   ③ 官方示例对照:Standard / Accelerate / Decelerate 三行,参数与时长逐项对照官方 XAML,
//      Animate 按钮往返运动(对照官方 From 当前位置 → To 另一端)。
// 曲线/进度全部由 src/utils/easingFunctions.ts 纯函数驱动(公式逐行对照
// EasingFunctions.cpp,默认值与钳制对照 EasingFunctions.h,ground truth 对照
// dxaml/test/managed/animation/EasingFunctionBaseTests)。
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import {
  EASING_FUNCTIONS,
  EASING_MODES,
  defaultEasingParams,
  easingProgress,
  getEasingFunction,
  sampleEasingProgress,
} from '@/utils/easingFunctions'
import type { EasingFunctionDef, EasingFunctionKind, EasingMode, EasingParams } from '@/utils/easingFunctions'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 参数面板(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const optDuration = ref<string | number | boolean>(800)
const optLoop = ref<string | number | boolean>(false)
const optKind = ref<string | number | boolean>('back')
const optMode = ref<string | number | boolean>('easeOut')

// 七个可调参数与 EasingParams 键一一对应;详解只读取当前选中族声明的键。
const paramValues = reactive<Record<keyof EasingParams, string | number | boolean>>({
  amplitude: 1,
  bounces: 3,
  bounciness: 2,
  exponent: 2,
  oscillations: 3,
  springiness: 3,
  power: 2,
})

const gridDurationMs = computed<number>(() => {
  const parsed = Number(optDuration.value)
  return Number.isFinite(parsed) && parsed >= 100 ? parsed : 800
})
const gridLoopEnabled = computed<boolean>(() => optLoop.value === true)

/** 三模式展示标签(非响应式常量)。 */
const MODE_LABELS: Record<EasingMode, string> = {
  easeIn: 'EaseIn(慢进)',
  easeOut: 'EaseOut(慢出)',
  easeInOut: 'EaseInOut(慢进慢出)',
}

const kindOptions = EASING_FUNCTIONS.map((def) => ({
  label: def.winuiName ?? 'linear(无 WinUI 类,恒等基准)',
  value: def.kind,
}))
const modeOptions = EASING_MODES.map((mode) => ({ label: MODE_LABELS[mode], value: mode }))

function toKind(value: string | number | boolean): EasingFunctionKind {
  const name = String(value)
  return EASING_FUNCTIONS.some((def) => def.kind === name) ? (name as EasingFunctionKind) : 'back'
}

function toMode(value: string | number | boolean): EasingMode {
  const name = String(value)
  return (EASING_MODES as readonly string[]).includes(name) ? (name as EasingMode) : 'easeOut'
}

const selectedKind = computed<EasingFunctionKind>(() => toKind(optKind.value))
const selectedMode = computed<EasingMode>(() => toMode(optMode.value))
const selectedDef = computed<EasingFunctionDef>(() => getEasingFunction(selectedKind.value))

const selectedParams = computed<EasingParams>(() => ({
  amplitude: Number(paramValues.amplitude),
  bounces: Math.floor(Number(paramValues.bounces)),
  bounciness: Number(paramValues.bounciness),
  exponent: Number(paramValues.exponent),
  oscillations: Math.floor(Number(paramValues.oscillations)),
  springiness: Number(paramValues.springiness),
  power: Number(paramValues.power),
}))

const selectedParamsText = computed<string>(() => {
  const defs = selectedDef.value.params
  if (defs.length === 0) return '无参数(WinUI 固定曲线)'
  return defs.map((def) => `${def.key} = ${paramValues[def.key]}`).join(' · ')
})

const selectedTitle = computed<string>(() => {
  const def = selectedDef.value
  return `${def.winuiName ?? 'linear(恒等基准)'} · ${MODE_LABELS[selectedMode.value]}`
})

// 切换函数族时,参数滑块复位为该族 WinUI 默认值(网格对照亦用默认参数,口径一致)。
watch(selectedKind, (kind) => {
  const defaults = defaultEasingParams(kind)
  for (const def of getEasingFunction(kind).params) {
    paramValues[def.key] = defaults[def.key] ?? def.defaultValue
  }
})

// —— 演示一:对照网格(静态结构,构建一次;迷你曲线用族默认参数采样)——
interface GridCell {
  key: string
  kind: EasingFunctionKind
  mode: EasingMode
  sparkPath: string
}
interface GridFamily {
  kind: EasingFunctionKind
  def: EasingFunctionDef
  cells: GridCell[]
}

const SPARK_SAMPLES = 24
const SPARK_HEIGHT = 56

function formatNumber(value: number): string {
  return value.toFixed(2)
}

function sparkPathFor(kind: EasingFunctionKind, mode: EasingMode): string {
  const values = sampleEasingProgress(kind, mode, SPARK_SAMPLES)
  const points = values.map(
    (progress, index) =>
      `${formatNumber((index / SPARK_SAMPLES) * 100)},${formatNumber(SPARK_HEIGHT - progress * SPARK_HEIGHT)}`,
  )
  return `M ${points.join(' L ')}`
}

const gridFamilies: GridFamily[] = EASING_FUNCTIONS.map((def) => ({
  kind: def.kind,
  def,
  cells: EASING_MODES.map((mode) => ({
    key: `${def.kind}:${mode}`,
    kind: def.kind,
    mode,
    sparkPath: sparkPathFor(def.kind, mode),
  })),
}))

const selectedKey = computed<string>(() => `${selectedKind.value}:${selectedMode.value}`)

function selectCell(cell: GridCell): void {
  optKind.value = cell.kind
  optMode.value = cell.mode
}

// —— 详解曲线(SVG):64 段采样 + 线性基准 + CSS cubic-bezier 参数曲线叠加 ——
const CURVE_SAMPLES = 64

const curvePath = computed<string>(() => {
  const points: string[] = []
  for (let i = 0; i <= CURVE_SAMPLES; i += 1) {
    const t = i / CURVE_SAMPLES
    const progress = easingProgress(selectedKind.value, selectedMode.value, t, selectedParams.value)
    points.push(`${formatNumber(10 + t * 100)},${formatNumber(110 - progress * 100)}`)
  }
  return `M ${points.join(' L ')}`
})

function parseCubicBezier(value: string | null): [number, number, number, number] | null {
  if (!value) return null
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(value.trim())
  if (!match) return null
  const parts = match[1].split(',').map((part) => Number(part.trim()))
  if (parts.length !== 4 || parts.some((number) => !Number.isFinite(number))) return null
  return [parts[0], parts[1], parts[2], parts[3]]
}

// CSS bezier 曲线按参数 u∈[0,1] 直接绘制(x(u), y(u)),无需反解时间。
const bezierOverlayPath = computed<string | null>(() => {
  const parsed = parseCubicBezier(selectedDef.value.cssEasing[selectedMode.value])
  if (!parsed) return null
  const [x1, y1, x2, y2] = parsed
  const points: string[] = []
  const steps = 48
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps
    const weight1 = 3 * (1 - u) ** 2 * u
    const weight2 = 3 * (1 - u) * u ** 2
    const x = weight1 * x1 + weight2 * x2 + u ** 3
    const y = weight1 * y1 + weight2 * y2 + u ** 3
    points.push(`${formatNumber(10 + x * 100)},${formatNumber(110 - y * 100)}`)
  }
  return `M ${points.join(' L ')}`
})

const bezierCaption = computed<string>(() => {
  if (selectedDef.value.cssRelation === 'none') return '该曲线非单调,CSS cubic-bezier 不可表达(无叠加线)'
  if (selectedDef.value.kind === 'linear') return '恒等曲线 ≡ CSS linear'
  if (selectedDef.value.cssRelation === 'exact') return '虚线为 CSS cubic-bezier 映射(与实线精确重合)'
  return '虚线为 CSS cubic-bezier 近似值(对照精度)'
})

// —— 动画引擎:单一 rAF 循环驱动 36 格网格 + 详解球/标记 + 3 个官方示例独立时钟 ——
const moverEls = new Map<string, HTMLElement>()
const officialEls = new Map<string, HTMLElement>()
const detailMoverEl = ref<HTMLElement | null>(null)
const curveMarker = ref<SVGCircleElement | null>(null)

function setMoverEl(key: string, el: Element | ComponentPublicInstance | null): void {
  if (el instanceof HTMLElement) {
    moverEls.set(key, el)
  } else {
    moverEls.delete(key)
  }
}

function setOfficialEl(key: string, el: Element | ComponentPublicInstance | null): void {
  if (el instanceof HTMLElement) {
    officialEls.set(key, el)
  } else {
    officialEls.delete(key)
  }
}

interface OfficialDemo {
  key: 'standard' | 'accelerate' | 'decelerate'
  title: string
  note: string
  kind: EasingFunctionKind
  mode: EasingMode
  params: EasingParams
  durationMs: number
}

// 官方 XAML 参数逐项对照:Standard=CircleEase EaseInOut 0.5s;Accelerate=ExponentialEase
// EaseIn Exponent 4.5 0.15s;Decelerate=ExponentialEase EaseOut Exponent 7 0.3s。
const OFFICIAL_DEMOS: readonly OfficialDemo[] = [
  {
    key: 'standard',
    title: 'Standard(标准)',
    note: 'CircleEase · EaseInOut · 0.5s —— 一般属性变化',
    kind: 'circle',
    mode: 'easeInOut',
    params: {},
    durationMs: 500,
  },
  {
    key: 'accelerate',
    title: 'Accelerate(加速)',
    note: 'ExponentialEase · EaseIn · Exponent 4.5 · 0.15s —— 离开场景的对象',
    kind: 'exponential',
    mode: 'easeIn',
    params: { exponent: 4.5 },
    durationMs: 150,
  },
  {
    key: 'decelerate',
    title: 'Decelerate(减速)',
    note: 'ExponentialEase · EaseOut · Exponent 7 · 0.3s —— 进入场景的对象',
    kind: 'exponential',
    mode: 'easeOut',
    params: { exponent: 7 },
    durationMs: 300,
  },
]

interface OfficialState {
  t: number
  from: number
  to: number
  startTs: number
  playing: boolean
}

const officialStates = new Map<string, OfficialState>(
  OFFICIAL_DEMOS.map((demo): [string, OfficialState] => [
    demo.key,
    { t: 0, from: 0, to: 1, startTs: 0, playing: false },
  ]),
)

function officialDemoByKey(key: string): OfficialDemo | undefined {
  return OFFICIAL_DEMOS.find((demo) => demo.key === key)
}

let rafId = 0
let gridPlaying = false
let gridT = 0
let gridDirection: 0 | 1 = 1
let gridStartTs = 0

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function applyDetailProgress(t: number): void {
  const progress = easingProgress(selectedKind.value, selectedMode.value, t, selectedParams.value)
  const mover = detailMoverEl.value
  if (mover) {
    mover.style.setProperty('--p', String(progress))
  }
  const marker = curveMarker.value
  if (marker) {
    marker.setAttribute('cx', formatNumber(10 + t * 100))
    marker.setAttribute('cy', formatNumber(110 - progress * 100))
  }
}

function applyOfficialProgress(key: string, t: number): void {
  const element = officialEls.get(key)
  const demo = officialDemoByKey(key)
  if (!element || !demo) return
  element.style.setProperty('--p', String(easingProgress(demo.kind, demo.mode, t, demo.params)))
}

function applyGridFrame(t: number): void {
  for (const family of gridFamilies) {
    for (const cell of family.cells) {
      const element = moverEls.get(cell.key)
      if (!element) continue
      element.style.setProperty('--p', String(easingProgress(cell.kind, cell.mode, t)))
    }
  }
  applyDetailProgress(t)
}

function tick(now: number): void {
  if (gridPlaying) {
    const raw = (now - gridStartTs) / gridDurationMs.value
    if (raw >= 1) {
      gridT = gridDirection === 1 ? 1 : 0
      if (gridLoopEnabled.value) {
        // 循环:换向再跑(往返),与官方「Animate 点击往返」同款语义
        gridDirection = gridDirection === 1 ? 0 : 1
        gridStartTs = now
      } else {
        gridPlaying = false
      }
    } else {
      gridT = gridDirection === 1 ? raw : 1 - raw
    }
    applyGridFrame(gridT)
  }

  let officialActive = false
  for (const [key, state] of officialStates) {
    if (!state.playing) continue
    const demo = officialDemoByKey(key)
    if (!demo) {
      state.playing = false
      continue
    }
    const raw = (now - state.startTs) / demo.durationMs
    state.t = raw >= 1 ? state.to : state.from + (state.to - state.from) * raw
    applyOfficialProgress(key, state.t)
    if (raw >= 1) {
      state.playing = false
    } else {
      officialActive = true
    }
  }

  rafId = gridPlaying || officialActive ? requestAnimationFrame(tick) : 0
}

function ensureLoop(): void {
  if (rafId === 0) {
    rafId = requestAnimationFrame(tick)
  }
}

function playGrid(): void {
  if (prefersReducedMotion()) {
    // 减少动态偏好:跳过动画直接落到终点态
    gridPlaying = false
    gridT = 1
    applyGridFrame(1)
    return
  }
  gridDirection = 1
  gridT = 0
  gridPlaying = true
  gridStartTs = performance.now()
  ensureLoop()
}

function playOfficial(key: OfficialDemo['key']): void {
  const demo = officialDemoByKey(key)
  const state = officialStates.get(key)
  if (!demo || !state) return
  // 官方语义:按当前渲染位置决定方向(X > 0 ? 0 : 200)——点击即往返
  const currentProgress = easingProgress(demo.kind, demo.mode, state.t, demo.params)
  const target: 0 | 1 = currentProgress > 1e-6 ? 0 : 1
  if (prefersReducedMotion()) {
    state.playing = false
    state.t = target
    applyOfficialProgress(key, target)
    return
  }
  state.from = state.t
  state.to = target
  state.startTs = performance.now()
  state.playing = true
  ensureLoop()
}

// 空闲时调节选中函数/模式/参数:球与曲线标记立即按当前时间点重算(无需重放)。
watch([selectedKind, selectedMode, selectedParams], () => {
  if (!gridPlaying) {
    applyDetailProgress(gridT)
  }
})

onMounted(() => {
  playGrid()
})

onBeforeUnmount(() => {
  if (rafId !== 0) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  gridPlaying = false
})

// —— 下半区固定开发文档 ——
const RELATION_LABELS: Record<string, string> = {
  exact: '精确映射',
  approximate: '近似映射',
  none: '不可表达(须用 JS 公式)',
}

const propsHeaders = ['WinUI 参数', '类型', '默认值', '说明']
const propRows: (string | number)[][] = EASING_FUNCTIONS.flatMap((def) =>
  def.params.map((param) => [
    param.winuiName,
    param.key === 'bounces' || param.key === 'oscillations' ? 'int' : 'float',
    param.defaultValue,
    `${param.description}(演示滑块 ${param.min}–${param.max},步长 ${param.step})`,
  ]),
)

const familyHeaders = ['WinUI 类', '公式(EaseInCore,t ∈ [0,1])', 'CSS cubic-bezier 关系']
const familyRows: (string | number)[][] = EASING_FUNCTIONS.map((def) => [
  def.winuiName ?? '—(linear 恒等基准)',
  def.formula,
  `${RELATION_LABELS[def.cssRelation]};EaseOut: ${def.cssEasing.easeOut ?? '—'}`,
])

const modeHeaders = ['模式', '换算(CEasingFunctionImpl::Ease)', '语义']
const modeRows: (string | number)[][] = [
  ['EaseIn', 'EaseInCore(t)', '慢进:起步缓慢,逐渐加速'],
  ['EaseOut', '1 − EaseInCore(1 − t)', '慢出:快速起步,缓慢到达(默认模式)'],
  ['EaseInOut', 't < 0.5 ? EaseInCore(2t)/2 : (1 − EaseInCore(2 − 2t))/2 + 0.5', '慢进慢出:两端缓、中间快'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['—(无事件)', '—', '缓动函数是纯数学工具(输入归一化时间,输出进度),无交互事件;Web 端由调用方以 rAF / CSS animation 消费'],
]

const usageCode = `import { easingProgress, sampleEasingProgress, getEasingFunction } from '@/utils/easingFunctions'

// 单点求值:归一化时间 t ∈ [0,1] → 进度(公式逐行对照 WinUI 参照源)
easingProgress('back', 'easeOut', 0.25)
easingProgress('exponential', 'easeIn', 0.5, { exponent: 4.5 })

// 采样整条曲线(64 段 → 65 个进度值,可直接喂 SVG path)
sampleEasingProgress('circle', 'easeInOut', 64)

// CSS 关系:可表达的族给出 easing 值;Back/Bounce/Elastic 返回 null(用 JS 公式驱动)
getEasingFunction('cubic').cssEasing.easeOut // 'cubic-bezier(0.33333, 1, 0.66667, 1)'(精确)
getEasingFunction('bounce').cssEasing.easeOut // null`
</script>

<template>
  <DemoPage wiki="EasingFunction"
    title="Easing Functions"
    description="缓动(缓动函数族)操纵对象动画的速度曲线:WinUI 提供 11 个缓动类(Back / Bounce / Circle / Cubic / Elastic / Exponential / Power / Quadratic / Quartic / Quintic / Sine),配合 EasingMode(EaseIn / EaseOut / EaseInOut)使用。本页全族 × 三模式同屏对照,并给出选中函数的进度曲线、公式、可调参数与 CSS cubic-bezier 关系。"
  >
    <template #demo>
      <div class="easing-stage">
        <!-- 演示一:全族 × 三模式对照网格 -->
        <section class="demo-group">
          <div class="group-head">
            <h3 class="group-title">全族 × 三模式对照网格</h3>
            <div class="play-row">
              <button type="button" class="host-button" @click="playGrid">重放(同屏)</button>
              <span class="state-chip" aria-live="polite">时长 {{ gridDurationMs }}ms · 每格为族默认参数</span>
            </div>
          </div>
          <p class="group-note">
            WinUI 11 个缓动类 + linear 恒等基准(WinUI 无 LinearEase 类)× EaseIn / EaseOut / EaseInOut =
            36 格,共用一条时间轴,小球同屏对比;格内迷你图为该格进度曲线(蓝线 = 曲线,灰虚线 = 线性基准)。
            点击任意格选中该曲线,在下方「选中函数详解」查看放大曲线与参数调节。
          </p>
          <div v-for="family in gridFamilies" :key="family.kind" class="family-block">
            <h4 class="family-name">
              {{ family.def.winuiName ?? 'linear(无 WinUI 类)' }}
              <span class="family-zh">{{ family.def.labelZh }} · {{ family.def.description }}</span>
            </h4>
            <div class="family-cells">
              <button
                v-for="cell in family.cells"
                :key="cell.key"
                type="button"
                class="ease-cell"
                :class="{ selected: cell.key === selectedKey }"
                :aria-pressed="cell.key === selectedKey"
                @click="selectCell(cell)"
              >
                <svg class="cell-spark" viewBox="0 0 100 56" aria-hidden="true">
                  <line class="spark-diagonal" x1="0" y1="56" x2="100" y2="0" />
                  <path class="spark-path" :d="cell.sparkPath" />
                </svg>
                <span class="cell-track">
                  <span class="mover" :ref="(el) => setMoverEl(cell.key, el)"><span class="ball"></span></span>
                </span>
                <span class="cell-mode">{{ MODE_LABELS[cell.mode] }}</span>
              </button>
            </div>
          </div>
        </section>

        <!-- 演示二:选中函数详解 -->
        <section class="demo-group">
          <h3 class="group-title">选中函数详解:{{ selectedTitle }}</h3>
          <p class="group-note">
            进度曲线(t → 进度)由选中函数与模式实时采样;蓝色小球按同一时间轴运动,曲线上的标记点同步显示当前
            (t, 进度)。参数滑块在上方「参数」面板(切换函数族时复位为 WinUI 默认值)。
          </p>
          <div class="detail-grid">
            <div class="detail-curve">
              <svg class="curve-svg" viewBox="0 0 120 120" role="img" aria-label="选中缓动函数的进度曲线">
                <line class="curve-grid" x1="10" y1="60" x2="110" y2="60" />
                <line class="curve-grid" x1="60" y1="10" x2="60" y2="110" />
                <line class="curve-diagonal" x1="10" y1="110" x2="110" y2="10" />
                <path v-if="bezierOverlayPath" class="bezier-path" :d="bezierOverlayPath" />
                <path class="main-path" :d="curvePath" />
                <circle ref="curveMarker" class="marker" r="3" cx="10" cy="110" />
              </svg>
              <p class="curve-caption">{{ bezierCaption }}</p>
            </div>
            <div class="detail-info">
              <span class="detail-track">
                <span class="mover mover-detail" ref="detailMoverEl"><span class="ball ball-lg"></span></span>
              </span>
              <p class="formula"><code>{{ selectedDef.formula }}</code></p>
              <p class="state-chip">当前参数:{{ selectedParamsText }}</p>
              <dl class="css-relation">
                <dt>CSS 缓动关系</dt>
                <dd>{{ RELATION_LABELS[selectedDef.cssRelation] }}</dd>
                <template v-for="mode in EASING_MODES" :key="mode">
                  <dt>{{ mode }}</dt>
                  <dd>
                    <code>{{ selectedDef.cssEasing[mode] ?? '—(无 cubic-bezier 表示,用 JS 公式)' }}</code>
                  </dd>
                </template>
              </dl>
            </div>
          </div>
        </section>

        <!-- 演示三:官方示例对照 -->
        <section class="demo-group">
          <h3 class="group-title">官方示例对照(Standard / Accelerate / Decelerate)</h3>
          <p class="group-note">
            官方页首导览:Standard 用于一般属性变化;Accelerate 用于离开场景的对象;Decelerate
            用于进入场景的对象。三行参数与时长逐项对照官方 XAML,点击 Animate 往返运动(对照官方 From
            当前位置 → To 另一端)。
          </p>
          <div v-for="demo in OFFICIAL_DEMOS" :key="demo.key" class="official-row">
            <button
              type="button"
              class="host-button"
              :aria-label="`Animate rectangle using ${demo.title} Easing Function`"
              @click="playOfficial(demo.key)"
            >
              Animate
            </button>
            <span class="official-track">
              <span class="mover mover-official" :ref="(el) => setOfficialEl(demo.key, el)">
                <span class="official-rect"></span>
              </span>
            </span>
            <span class="state-chip">{{ demo.note }}</span>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          label="对照网格 · 时长 duration(ms)"
          type="slider"
          v-model="optDuration"
          :min="200"
          :max="2000"
          :step="50"
        />
        <DemoOptionRow label="对照网格 · 循环往返" type="toggle" v-model="optLoop" />
        <DemoOptionRow label="详解 · 缓动函数" type="select" v-model="optKind" :options="kindOptions" />
        <DemoOptionRow label="详解 · 缓动模式" type="select" v-model="optMode" :options="modeOptions" />
        <template v-for="param in selectedDef.params" :key="param.key">
          <DemoOptionRow
            :label="`${param.winuiName}(默认 ${param.defaultValue})`"
            type="slider"
            v-model="paramValues[param.key]"
            :min="param.min"
            :max="param.max"
            :step="param.step"
          />
        </template>
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">可调参数(WinUI 属性 → 本工具参数)</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">全族公式与 CSS cubic-bezier 关系</h3>
      <DemoDocsTable :headers="familyHeaders" :rows="familyRows" />
      <h3 class="docs-subtitle">三模式换算(对照 EasingFunctions.cpp CEasingFunctionImpl::Ease)</h3>
      <DemoDocsTable :headers="modeHeaders" :rows="modeRows" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="ts" />
    </template>
  </DemoPage>
</template>

<style scoped>
.easing-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
}

.demo-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.group-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.group-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.group-note {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.play-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.host-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 75px;
  height: 32px;
  padding: 5px 12px;
  font-family: inherit;
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.host-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.host-button:active {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.host-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.state-chip {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示一:对照网格 —— */
.family-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.family-name {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.family-zh {
  font-weight: 400;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.family-cells {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  width: 100%;
}

.ease-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  font-family: inherit;
  text-align: left;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.ease-cell:hover {
  border-color: var(--wui-system-accent-color);
}

.ease-cell:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

/* 选中格:与详解面板联动(下方详解即该格曲线) */
.ease-cell.selected {
  border-color: var(--wui-system-accent-color);
  box-shadow: inset 0 0 0 1px var(--wui-system-accent-color);
}

.cell-spark {
  width: 100%;
  height: auto;
  overflow: visible;
}

.spark-path {
  fill: none;
  stroke: var(--wui-system-accent-color);
  stroke-width: 2;
  stroke-linecap: round;
}

.spark-diagonal {
  stroke: var(--wui-list-view-header-item-divider-stroke);
  stroke-dasharray: 3 3;
}

.cell-track {
  position: relative;
  display: block;
  height: 14px;
}

/* 轨道中线 */
.cell-track::before {
  content: '';
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 2px;
  transform: translateY(-50%);
  background: var(--wui-list-view-header-item-divider-stroke);
}

.cell-mode {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 小球运动:mover 宽度 = 轨道 − 球宽,--p ∈ [0,1] 乘以 mover 自身宽度 —— */
.mover {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  display: block;
  width: calc(100% - 12px);
  transform: translateX(calc(var(--p, 0) * 100%));
}

.ball {
  position: absolute;
  top: 50%;
  left: 0;
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transform: translateY(-50%);
  background: var(--wui-system-accent-color);
}

/* —— 演示二:详解 —— */
.detail-grid {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(260px, 1fr);
  gap: 24px;
  align-items: start;
  width: 100%;
}

@media (max-width: 640px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.detail-curve {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.curve-svg {
  width: 100%;
  height: auto;
  overflow: visible;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.curve-grid {
  stroke: var(--wui-list-view-header-item-divider-stroke);
  stroke-dasharray: 2 3;
}

.curve-diagonal {
  stroke: var(--wui-list-view-header-item-divider-stroke);
  stroke-dasharray: 4 3;
}

.main-path {
  fill: none;
  stroke: var(--wui-system-accent-color);
  stroke-width: 2;
  stroke-linecap: round;
}

.bezier-path {
  fill: none;
  stroke: var(--wui-system-control-foreground-alt-high);
  stroke-width: 1.5;
  stroke-dasharray: 5 3;
}

.marker {
  fill: var(--wui-system-accent-color);
  stroke: var(--wui-application-page-background-theme);
  stroke-width: 1.5;
}

.curve-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-track {
  position: relative;
  display: block;
  height: 24px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.mover-detail {
  top: 1px;
  bottom: 1px;
  left: 1px;
  width: calc(100% - 18px - 2px);
}

.ball-lg {
  width: 16px;
  height: 16px;
}

.formula {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  overflow-wrap: anywhere;
}

.formula code {
  font-family: monospace;
}

.css-relation {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 16px;
  margin: 0;
}

.css-relation dt {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.css-relation dd {
  margin: 0;
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  overflow-wrap: anywhere;
}

/* —— 演示三:官方示例对照 —— */
.official-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.official-track {
  position: relative;
  flex: 1 1 280px;
  display: block;
  height: 54px;
  overflow: hidden;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.mover-official {
  top: 2px;
  bottom: 2px;
  left: 2px;
  width: calc(100% - 50px - 4px);
}

/* 官方示例为 50×50 Rectangle(SystemAccentColor 填充) */
.official-rect {
  position: absolute;
  top: 50%;
  left: 0;
  display: block;
  width: 50px;
  height: 50px;
  transform: translateY(-50%);
  background: var(--wui-system-accent-color);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
