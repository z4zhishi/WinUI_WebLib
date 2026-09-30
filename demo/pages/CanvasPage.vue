<script setup lang="ts">
// CanvasPage.vue —— Canvas 控件示例页(组合对照 WinUI Gallery Samples/Canvas:
// 官方示例为红/蓝/绿/黄四个 40x40 矩形按 Canvas.Top/Left/ZIndex 叠放,滑块实时调节红块位置与层级)。
import { computed, ref } from 'vue'
import WuiCanvas from '@/components/Canvas.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// DemoOptionRow 的 v-model 契约要求联合类型(toggle → boolean,slider/number → number,select → string)
type OptionValue = string | number | boolean

function asString(value: OptionValue): string {
  return typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
}

function asNumber(value: OptionValue, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// —— 示例 1:官方示例对照(红块 Top/Left 滑块范围 0–100,ZIndex 0–4,均同官方)——
const sampleTop = ref<OptionValue>(0)
const sampleLeft = ref<OptionValue>(0)
const sampleZIndex = ref<OptionValue>(0)
const sampleClip = ref<OptionValue>(false)

const sampleTopValue = computed(() => Math.round(asNumber(sampleTop.value, 0)))
const sampleLeftValue = computed(() => Math.round(asNumber(sampleLeft.value, 0)))
const sampleZIndexValue = computed(() => {
  const raw = Math.round(asNumber(sampleZIndex.value, 0))
  return Math.min(4, Math.max(0, raw))
})
const sampleClipValue = computed(() => sampleClip.value === true)

interface SampleRect {
  name: string
  fill: string
  top: number
  left: number
  zIndex: number
}

// 官方示例四个矩形的填充对照 XAML 命名画刷 Fill="Red"/"Blue"/"Green"/"Yellow"(示例内容色,非控件外观色)
const sampleRects: SampleRect[] = [
  { name: '红块', fill: 'red', top: 0, left: 0, zIndex: 0 },
  { name: '蓝块', fill: 'blue', top: 20, left: 20, zIndex: 1 },
  { name: '绿块', fill: 'green', top: 40, left: 40, zIndex: 2 },
  { name: '黄块', fill: 'yellow', top: 60, left: 60, zIndex: 3 },
]

// —— 示例 2:可拖拽重排(指针拖动实时改 Top/Left,参数区数字输入双向同步)——
const DRAG_AREA_WIDTH = 340
const DRAG_AREA_HEIGHT = 240
const CARD_WIDTH = 88
const CARD_HEIGHT = 40
const CARD_MAX_LEFT = DRAG_AREA_WIDTH - CARD_WIDTH
const CARD_MAX_TOP = DRAG_AREA_HEIGHT - CARD_HEIGHT

interface DragCard {
  id: string
  label: string
  top: number
  left: number
}

const dragCards = ref<DragCard[]>([
  { id: 'a', label: '卡片 A', top: 24, left: 24 },
  { id: 'b', label: '卡片 B', top: 92, left: 140 },
  { id: 'c', label: '卡片 C', top: 160, left: 64 },
])

const cardChoices = computed(() => dragCards.value.map((card) => ({ label: card.label, value: card.id })))

const selectedId = ref<OptionValue>('a')

const selectedCard = computed<DragCard>(
  () => dragCards.value.find((card) => card.id === asString(selectedId.value)) ?? dragCards.value[0],
)

function clampToArea(value: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(value)))
}

const selectedTop = computed<OptionValue>({
  get: () => selectedCard.value.top,
  set: (value) => {
    selectedCard.value.top = clampToArea(asNumber(value, 0), CARD_MAX_TOP)
  },
})

const selectedLeft = computed<OptionValue>({
  get: () => selectedCard.value.left,
  set: (value) => {
    selectedCard.value.left = clampToArea(asNumber(value, 0), CARD_MAX_LEFT)
  },
})

const draggingId = ref<string | null>(null)
let dragOrigin: { pointerX: number; pointerY: number; top: number; left: number } | null = null

function onCardPointerDown(event: PointerEvent, card: DragCard): void {
  draggingId.value = card.id
  selectedId.value = card.id
  dragOrigin = { pointerX: event.clientX, pointerY: event.clientY, top: card.top, left: card.left }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onCardPointerMove(event: PointerEvent): void {
  const origin = dragOrigin
  const card = dragCards.value.find((item) => item.id === draggingId.value)
  if (!origin || !card) return
  card.left = clampToArea(origin.left + event.clientX - origin.pointerX, CARD_MAX_LEFT)
  card.top = clampToArea(origin.top + event.clientY - origin.pointerY, CARD_MAX_TOP)
}

function onCardPointerUp(event: PointerEvent): void {
  dragOrigin = null
  draggingId.value = null
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

// 键盘可达:方向键微调(Shift + 方向键步长 10),与指针拖拽等效
function onCardKeydown(event: KeyboardEvent, card: DragCard): void {
  const step = event.shiftKey ? 10 : 2
  let handled = true
  if (event.key === 'ArrowUp') card.top = clampToArea(card.top - step, CARD_MAX_TOP)
  else if (event.key === 'ArrowDown') card.top = clampToArea(card.top + step, CARD_MAX_TOP)
  else if (event.key === 'ArrowLeft') card.left = clampToArea(card.left - step, CARD_MAX_LEFT)
  else if (event.key === 'ArrowRight') card.left = clampToArea(card.left + step, CARD_MAX_LEFT)
  else handled = false
  if (handled) event.preventDefault()
}

// —— 下半区固定开发文档 ——
const propertyHeaders = ['属性', '类型', '默认值', '说明']
const propertyRows: (string | number)[][] = [
  ['background', 'string', '未设置(透明)', '画布底色,任意 CSS 颜色或 --wui-* 变量(对应 Panel.Background,WinUI 默认为 null 画刷)'],
  ['clipToBounds', 'boolean', 'false', '是否裁剪溢出画布边界的子项;WinUI Canvas 默认不裁剪,此属性为 Web 扩展'],
]

const attachedHeaders = ['附加属性(子元素 data-canvas-*)', '类型', '默认值', '说明']
const attachedRows: (string | number)[][] = [
  ['data-canvas-top', 'number | string', '未设置', '子项顶边到画布顶边的距离(对应 Canvas.Top);数字按 px,字符串原样作为 CSS 长度'],
  ['data-canvas-left', 'number | string', '未设置', '子项左边到画布左边的距离(对应 Canvas.Left)'],
  ['data-canvas-right', 'number | string', '未设置', '子项右边到画布右边的距离(扩展;WinUI 无 Canvas.Right);与 data-canvas-left 同设且子项无显式宽度时水平拉伸'],
  ['data-canvas-bottom', 'number | string', '未设置', '子项底边到画布底边的距离(扩展;WinUI 无 Canvas.Bottom);与 data-canvas-top 同设且子项无显式高度时垂直拉伸'],
  ['data-canvas-z-index', 'number | string', '未设置', '子项叠放层级(对应 Canvas.ZIndex);未设置时按声明顺序,后声明者在上;支持负值'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['—(无业务事件)', '—', 'Canvas 为纯布局面板,不派发业务事件;子项自身的交互事件照常触发与冒泡'],
]

// 用法代码随官方示例区滑块实时更新,直观展示「附加属性 → 代码」的映射
const usageCode = computed(() => {
  const lines = [
    '<WuiCanvas background="var(--wui-system-control-background-chrome-medium-low)" style="width: 140px; height: 140px">',
    `  <div class="rect" :data-canvas-top="${sampleTopValue.value}" :data-canvas-left="${sampleLeftValue.value}" :data-canvas-z-index="${sampleZIndexValue.value}" />`,
  ]
  for (const rect of sampleRects.slice(1)) {
    lines.push(
      `  <div class="rect" data-canvas-top="${rect.top}" data-canvas-left="${rect.left}" data-canvas-z-index="${rect.zIndex}" />`,
    )
  }
  lines.push('</WuiCanvas>')
  return lines.join('\n')
})
</script>

<template>
  <DemoPage wiki="Canvas"
    title="Canvas"
    description="支持绝对定位的布局面板:子项通过 data-canvas-top/left/right/bottom/z-index 附加属性相对画布定位,默认不裁剪溢出内容。"
  >
    <template #demo>
      <div class="canvas-stage">
        <!-- 示例 1:官方示例对照(滑块调节红块 Top/Left/ZIndex) -->
        <div class="example-item">
          <p class="example-caption">官方示例对照:滑块调节红块的 Canvas.Top / Canvas.Left / Canvas.ZIndex(叠放层级决定遮挡关系)</p>
          <WuiCanvas
            class="sample-canvas"
            background="var(--wui-system-control-background-chrome-medium-low)"
            :clip-to-bounds="sampleClipValue"
            :style="{ width: '140px', height: '140px' }"
          >
            <div
              v-for="rect in sampleRects"
              :key="rect.name"
              class="sample-rect"
              :style="{ background: rect.fill }"
              :data-canvas-top="rect.name === '红块' ? sampleTopValue : rect.top"
              :data-canvas-left="rect.name === '红块' ? sampleLeftValue : rect.left"
              :data-canvas-z-index="rect.name === '红块' ? sampleZIndexValue : rect.zIndex"
            />
          </WuiCanvas>
        </div>

        <!-- 示例 2:可拖拽重排 -->
        <div class="example-item">
          <p class="example-caption">拖拽重排:按住卡片拖动(或聚焦后用方向键微调),附加属性定位实时更新;数字输入见下方参数区</p>
          <WuiCanvas
            class="drag-canvas"
            background="var(--wui-application-page-background-theme)"
            :style="{ width: `${DRAG_AREA_WIDTH}px`, height: `${DRAG_AREA_HEIGHT}px` }"
          >
            <div
              v-for="card in dragCards"
              :key="card.id"
              class="drag-card"
              :class="{ 'drag-card--dragging': draggingId === card.id, 'drag-card--selected': asString(selectedId) === card.id }"
              :style="{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }"
              tabindex="0"
              :aria-label="`${card.label},Top ${card.top},Left ${card.left},方向键微调位置`"
              :data-canvas-top="card.top"
              :data-canvas-left="card.left"
              @pointerdown="onCardPointerDown($event, card)"
              @pointermove="onCardPointerMove"
              @pointerup="onCardPointerUp"
              @pointercancel="onCardPointerUp"
              @keydown="onCardKeydown($event, card)"
            >
              {{ card.label }}
            </div>
          </WuiCanvas>
        </div>

        <!-- 示例 3:四边定位组合(单边锚定 + 四边同设拉伸) -->
        <div class="example-item">
          <p class="example-caption">四边定位组合:四角单边/双边锚定;中间为四边同设(Top+Bottom、Left+Right 同设时拉伸,Web 扩展语义)</p>
          <WuiCanvas
            class="edges-canvas"
            background="var(--wui-system-control-background-chrome-medium-low)"
            :style="{ width: '300px', height: '190px' }"
          >
            <div class="edge-fill" data-canvas-top="10" data-canvas-left="10" data-canvas-right="10" data-canvas-bottom="10" aria-hidden="true"></div>
            <div class="edge-chip" data-canvas-top="14" data-canvas-left="14">Top=14 · Left=14</div>
            <div class="edge-chip" data-canvas-top="14" data-canvas-right="14">Top=14 · Right=14</div>
            <div class="edge-chip" data-canvas-bottom="14" data-canvas-left="14">Bottom=14 · Left=14</div>
            <div class="edge-chip" data-canvas-bottom="14" data-canvas-right="14">Bottom=14 · Right=14</div>
          </WuiCanvas>
        </div>
      </div>
    </template>

    <template #options>
      <h4 class="group-title">官方示例区(红块参数)</h4>
      <DemoOptions :columns="2">
        <DemoOptionRow label="红块 Canvas.Top" type="slider" v-model="sampleTop" :min="0" :max="100" :step="1" />
        <DemoOptionRow label="红块 Canvas.Left" type="slider" v-model="sampleLeft" :min="0" :max="100" :step="1" />
        <DemoOptionRow label="红块 Canvas.ZIndex" type="slider" v-model="sampleZIndex" :min="0" :max="4" :step="1" />
        <DemoOptionRow label="ClipToBounds 裁剪子项" type="toggle" v-model="sampleClip" />
      </DemoOptions>

      <h4 class="group-title">拖拽区(选中卡片的定位数字输入)</h4>
      <DemoOptions :columns="2">
        <DemoOptionRow label="选中卡片" type="select" v-model="selectedId" :options="cardChoices" />
        <DemoOptionRow label="Canvas.Top" type="number" v-model="selectedTop" :min="0" :max="CARD_MAX_TOP" :step="1" />
        <DemoOptionRow label="Canvas.Left" type="number" v-model="selectedLeft" :min="0" :max="CARD_MAX_LEFT" :step="1" />
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
.canvas-stage {
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
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* WinUI Canvas 默认无描边,演示加浅色描边便于观察画布边界 */
.sample-canvas,
.drag-canvas,
.edges-canvas {
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 官方示例矩形:40x40(XAML Resources 中 Rectangle 样式的宽高) */
.sample-rect {
  width: 40px;
  height: 40px;
}

/* 拖拽区:touch-action 关闭浏览器手势,保证指针拖拽在触屏可用 */
.drag-canvas {
  touch-action: none;
}

.drag-card {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}

.drag-card--selected {
  border-color: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}

.drag-card--dragging {
  color: var(--wui-system-control-foreground-alt-high);
  background: var(--wui-toggle-switch-curtain-background-theme);
  cursor: grabbing;
}

.drag-card:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

/* 四边同设的拉伸子项:半透明强调色块,可透出四角锚定的标签 */
.edge-fill {
  background: color-mix(in srgb, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)) 25%, transparent);
  border: 1px dashed var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.edge-chip {
  padding: 2px 8px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  white-space: nowrap;
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
