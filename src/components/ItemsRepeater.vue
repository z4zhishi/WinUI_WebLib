<script setup lang="ts">
// ItemsRepeater.vue —— WinUI ItemsRepeater 的 Web 复刻(虚拟化非选择集合控件)。
//
// 参照源(只读):
//   - CK/WinUI-Reference/controls/dev/Repeater/ItemsRepeater.idl:ItemsSource /
//     ItemTemplate([contentproperty])/ Layout / ElementPrepared / ElementClearing;
//     无 Background 之外的视觉属性(Background 画刷直接映射 CSS background);
//   - ItemsRepeater.cpp L909-913:Layout 未设置时默认 StackLayout(构造默认
//     Orientation = Vertical,见 StackLayout.properties.h MUX_DEFAULT_VALUE);
//   - generic.xaml:无 TargetType="ItemsRepeater" 段 —— ItemsRepeater 非 Control
//     子类(FrameworkElement 直接派生),没有 ControlTemplate 与视觉状态,视觉极简,
//     重在虚拟化行为,因此本组件没有 Normal/PointerOver 等交互态样式。
//
// 行为规格(务实分层,虚拟化为核心路径):
//   - 滚动视口:WinUI 的 ItemsRepeater 本体不滚动,需放入 ScrollViewer;Web 版把
//     「ScrollViewer + ItemsRepeater」组合内建为一个滚动视口(WinUI 17700+ 亦不再
//     需要 ItemsRepeaterScrollHost,浏览器原生 scrollTop 即锚点坐标);
//   - 虚拟化管线:ResizeObserver 实测视口 + passive scroll 监听 → T5.0
//     collectionLayouts 的 layoutStack / layoutUniformGrid 产出全量 rect →
//     computeVisibleRange 裁出可见窗口(上下各 ≈cacheItemCount 项缓冲,px 余量按
//     平均主轴步进换算)→ 仅渲染窗口内项,画布以 contentSize 占位总高(滚动条
//     反映完整内容);itemsSource / layout / 视口变化全部经响应式链自动重算;
//   - 回收:窗口外项从 DOM 卸载(Vue keyed v-for 按 index 复用可复用的节点,
//     简单 key 复用);进出窗口发 elementPrepared / elementClearing
//     (WinUI ElementPrepared / ElementClearing 事件简化为 (index, item));
//   - itemSize(StackLayout 每项主轴尺寸,数字或 (index, item) => number):纯函数
//     布局没有 measure 阶段,主轴尺寸须声明式给出(对应基建 wiki 差异「无 NaN 档」);
//     UniformGridLayout 走 minItemWidth / minItemHeight(同 WinUI 语义)。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { computeVisibleRange, layoutStack, layoutUniformGrid } from '@/utils/collectionLayouts'
import type {
  CollectionLayoutResult,
  StackLayoutOptions,
  UniformGridLayoutOptions,
} from '@/utils/collectionLayouts'

defineOptions({ name: 'WuiItemsRepeater', inheritAttrs: false })

/** 布局配置(WinUI Layout 属性):StackLayout 或 UniformGridLayout 二选一。 */
type RepeaterLayout = ({ type: 'stack' } & StackLayoutOptions) | ({ type: 'uniform' } & UniformGridLayoutOptions)

/** StackLayout 未给 itemSize 时的默认主轴尺寸(对齐 ListViewItemMinHeight = 40)。 */
const DEFAULT_ITEM_SIZE = 40

const props = withDefaults(
  defineProps<{
    /** 布局配置(WinUI Layout),默认 StackLayout 纵向(与源默认一致)。 */
    layout?: RepeaterLayout
    /**
     * StackLayout 每项主轴尺寸(px;纵向 = 高,横向 = 宽),数字或按项计算。
     * 纯函数布局无实测阶段,内容真实主轴尺寸应与声明一致(uniform 用
     * minItemWidth/minItemHeight,无本属性)。
     */
    itemSize?: number | ((index: number, item: unknown) => number)
    /** 可见窗口上下(左右)各多渲染的缓冲项数(WinUI 无同名属性,近似 CacheLength 的 Web 化)。 */
    cacheItemCount?: number
  }>(),
  {
    layout: () => ({ type: 'stack' as const }),
    itemSize: DEFAULT_ITEM_SIZE,
    cacheItemCount: 3,
  },
)

/** 数据源数组(WinUI ItemsSource),支持 v-model:items。 */
const items = defineModel<unknown[]>('items', { default: () => [] })

const emit = defineEmits<{
  /** WinUI ElementPrepared(简化):项进入虚拟化窗口、元素生成时触发。 */
  (e: 'elementPrepared', index: number, item: unknown): void
  /** WinUI ElementClearing(简化):项离开窗口、元素回收时触发。 */
  (e: 'elementClearing', index: number, item: unknown): void
}>()

/** 项模板(WinUI ItemTemplate,content property → 默认 slot);缺省渲染 String(item)。 */
defineSlots<{
  default?(slotProps: { item: unknown; index: number }): unknown
}>()

/* -------------------------------------------------------------------------
 * 布局配置归一化
 * ---------------------------------------------------------------------- */

const layoutKind = computed<'stack' | 'uniform'>(() => (props.layout?.type === 'uniform' ? 'uniform' : 'stack'))

const layoutOrientation = computed<'vertical' | 'horizontal'>(() => {
  if (props.layout?.orientation === 'horizontal') return 'horizontal'
  if (props.layout?.orientation === 'vertical') return 'vertical'
  // 缺省:StackLayout 默认 Vertical;UniformGridLayout 本快照默认 Horizontal(MUX_DEFAULT_VALUE)
  return layoutKind.value === 'uniform' ? 'horizontal' : 'vertical'
})

/**
 * 滚动轴:Orientation 命名的是条目排列轴、滚动轴相反(WinUI 语义陷阱)。
 * StackLayout horizontal → 横向滚动;UniformGridLayout vertical(沿 Y 排、满列右折)→ 横向滚动。
 */
const scrollsHorizontally = computed(() =>
  layoutKind.value === 'stack'
    ? layoutOrientation.value === 'horizontal'
    : layoutOrientation.value === 'vertical',
)

/* -------------------------------------------------------------------------
 * 视口测量(ResizeObserver)+ 滚动偏移(passive scroll)
 * ---------------------------------------------------------------------- */

const viewportRef = ref<HTMLDivElement | null>(null)
const viewport = ref({ width: 0, height: 0 })
const scrollOffset = ref({ x: 0, y: 0 })

let resizeObserver: ResizeObserver | null = null

function syncScrollOffset(): void {
  const el = viewportRef.value
  if (!el) return
  const x = el.scrollLeft
  const y = el.scrollTop
  if (x !== scrollOffset.value.x || y !== scrollOffset.value.y) {
    scrollOffset.value = { x, y }
  }
}

function measureViewport(): void {
  const el = viewportRef.value
  if (!el) return
  // clientWidth/Height 不含滚动条:与布局的「可用交叉尺寸」语义一致(WinUI 可用尺寸同样扣除滚动条)
  const width = el.clientWidth
  const height = el.clientHeight
  if (width !== viewport.value.width || height !== viewport.value.height) {
    viewport.value = { width, height }
  }
  // 数量骤减等场景浏览器会异步钳制 scrollTop,这里顺带补一次偏移快照
  syncScrollOffset()
}

onMounted(() => {
  measureViewport()
  if (viewportRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measureViewport)
    resizeObserver.observe(viewportRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

/* -------------------------------------------------------------------------
 * 布局计算:全量 rect(T5.0 collectionLayouts)
 * ---------------------------------------------------------------------- */

const dataItems = computed<unknown[]>(() => (Array.isArray(items.value) ? items.value : []))

/** StackLayout 主轴尺寸归一化(非法值回退默认,防 NaN 扩散到布局)。 */
function resolveItemMajor(index: number): number {
  const raw = typeof props.itemSize === 'function' ? props.itemSize(index, dataItems.value[index]) : props.itemSize
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ITEM_SIZE
}

const layoutResult = computed<CollectionLayoutResult>(() => {
  const config = props.layout
  const count = dataItems.value.length
  if (config.type === 'uniform') {
    // 可用交叉尺寸:horizontal → 视口宽;vertical → 视口高;主轴方向不约束(滚动方向)
    const available = scrollsHorizontally.value
      ? { width: 0, height: viewport.value.height }
      : { width: viewport.value.width, height: 0 }
    return layoutUniformGrid(count, available, config)
  }
  // StackLayout:交叉轴拉伸到视口(WinUI 条目默认 Stretch 对齐的等效表达),主轴逐项声明
  const cross = Math.max(0, scrollsHorizontally.value ? viewport.value.height : viewport.value.width)
  return layoutStack(
    count,
    (index) =>
      scrollsHorizontally.value
        ? { width: resolveItemMajor(index), height: cross }
        : { width: cross, height: resolveItemMajor(index) },
    config,
  )
})

/* -------------------------------------------------------------------------
 * 可见窗口(computeVisibleRange)+ 缓冲换算
 * ---------------------------------------------------------------------- */

const cacheCount = computed<number>(() => {
  const raw = props.cacheItemCount
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0
})

const visibleWindow = computed<{ start: number; end: number }>(() => {
  const rects = layoutResult.value.items
  if (rects.length === 0) return { start: -1, end: -1 }
  const window = scrollsHorizontally.value
    ? { x: scrollOffset.value.x, y: 0, width: viewport.value.width, height: viewport.value.height }
    : { x: 0, y: scrollOffset.value.y, width: viewport.value.width, height: viewport.value.height }
  // 「上下各 N 项」→ px 余量:平均主轴步进 × N(步进 = 内容主轴长 / 项数)
  const content = layoutResult.value.contentSize
  const contentMajor = scrollsHorizontally.value ? content.width : content.height
  const averageStride = contentMajor / rects.length
  return computeVisibleRange(rects, window, averageStride * cacheCount.value)
})

const windowIndices = computed<number[]>(() => {
  const { start, end } = visibleWindow.value
  if (start === -1 || end < start) return []
  const indices: number[] = []
  for (let index = start; index <= end; index += 1) indices.push(index)
  return indices
})

// 窗口进出 → ElementPrepared / ElementClearing(post flush:元素已进 DOM,回调可见)
let realizedIndices = new Set<number>()
let lastStart = Number.NaN
let lastEnd = Number.NaN

watch(
  visibleWindow,
  (now) => {
    if (now.start === lastStart && now.end === lastEnd) return
    lastStart = now.start
    lastEnd = now.end
    const next = new Set<number>()
    if (now.start !== -1) {
      for (let index = now.start; index <= now.end; index += 1) next.add(index)
    }
    const source = dataItems.value
    for (const index of next) {
      if (!realizedIndices.has(index)) emit('elementPrepared', index, source[index])
    }
    for (const index of realizedIndices) {
      if (!next.has(index)) emit('elementClearing', index, source[index])
    }
    realizedIndices = next
  },
  { flush: 'post' },
)

/* -------------------------------------------------------------------------
 * 渲染样式:画布占位总高 + 窗口内项绝对定位(rect 载体)
 * ---------------------------------------------------------------------- */

const canvasStyle = computed<Record<string, string>>(() => {
  const content = layoutResult.value.contentSize
  return {
    width: `${Math.max(content.width, viewport.value.width)}px`,
    height: `${Math.max(content.height, viewport.value.height)}px`,
  }
})

function itemStyle(index: number): Record<string, string> | undefined {
  const rect = layoutResult.value.items[index]
  if (!rect) return undefined
  return {
    transform: `translate(${rect.x}px, ${rect.y}px)`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
}
</script>

<template>
  <!-- 源无 ControlTemplate(非 Control 子类):无背景/边框,尺寸经 class/style 透传,
       虚拟化收益要求消费侧给定高容器(与 WinUI「ItemsRepeater 必须放入定高 ScrollViewer」一致) -->
  <div v-bind="$attrs" class="wui-items-repeater">
    <div
      ref="viewportRef"
      class="wui-items-repeater-viewport"
      :class="{ 'wui-items-repeater-viewport-horizontal': scrollsHorizontally }"
      @scroll.passive="syncScrollOffset"
    >
      <div class="wui-items-repeater-canvas" :style="canvasStyle" role="list">
        <div
          v-for="index in windowIndices"
          :key="index"
          class="wui-items-repeater-item"
          role="listitem"
          :style="itemStyle(index)"
        >
          <slot :item="dataItems[index]" :index="index">{{ String(dataItems[index]) }}</slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wui-items-repeater {
  box-sizing: border-box;
  /* 交给消费侧定尺寸;未定高时视口随内容撑开 → 退化为全量渲染(与 WinUI 需定高 ScrollViewer 同约束) */
}

/* 内建滚动视口(等价官方 ScrollViewer + ItemsRepeater 组合):
   默认纵向滚动(StackLayout Vertical / UniformGridLayout Horizontal),横向禁用 */
.wui-items-repeater-viewport {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  --wui-items-repeater-bar-size: 12px;
}

/* 排列轴翻转时滚动轴相反(WinUI Orientation 语义陷阱):横向滚动、纵向禁用 */
.wui-items-repeater-viewport-horizontal {
  overflow-y: hidden;
  overflow-x: auto;
}

/* 滚动条:WinUI 细拇指观感(与 ScrollViewer / ListView 公共样式同语言) */
.wui-items-repeater-viewport::-webkit-scrollbar {
  width: var(--wui-items-repeater-bar-size);
  height: var(--wui-items-repeater-bar-size);
  background: transparent;
}

.wui-items-repeater-viewport::-webkit-scrollbar-track {
  background: transparent;
}

.wui-items-repeater-viewport:hover::-webkit-scrollbar-track {
  background: var(--wui-scroll-bar-track-fill);
}

.wui-items-repeater-viewport::-webkit-scrollbar-thumb {
  background: var(--wui-scroll-bar-thumb-background);
  border: 4px solid transparent;
  background-clip: padding-box;
  border-radius: 8px;
}

.wui-items-repeater-viewport:hover::-webkit-scrollbar-thumb {
  background: var(--wui-scroll-bar-thumb-fill-pointer-over);
  border: 3px solid transparent;
}

.wui-items-repeater-viewport:active::-webkit-scrollbar-thumb {
  background: var(--wui-scroll-bar-thumb-fill-pressed);
}

.wui-items-repeater-viewport::-webkit-scrollbar-corner {
  background: transparent;
}

/* rect 载体:画布占位总高决定滚动范围;窗口内项绝对定位到布局 rect */
.wui-items-repeater-canvas {
  position: relative;
}

.wui-items-repeater-item {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
}
</style>
