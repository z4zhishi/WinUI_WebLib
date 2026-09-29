<script lang="ts">
// Viewbox(WinUI Viewbox 迁移):类型对外导出,供使用方与示例页引用。
/** 内容拉伸模式(WinUI Stretch)。 */
export type ViewboxStretch = 'Uniform' | 'UniformToFill' | 'Fill' | 'None'

/** 缩放方向约束(WinUI StretchDirection)。 */
export type ViewboxStretchDirection = 'UpOnly' | 'DownOnly' | 'Both'
</script>

<script setup lang="ts">
// WinUI Viewbox 复刻:内容缩放容器(布局类控件,无 ControlTemplate、无视觉状态、无业务事件)。
// 算法对照 CK/WinUI-Reference/dxaml/xcp/core/core/elements/Viewbox.cpp 的 ComputeScaleFactor:
// 子内容先按「无限可用尺寸」测得自然尺寸,再按 stretch 求比例 —— Uniform 取 min、UniformToFill
// 取 max、Fill 各轴独立、None 恒为 1;stretchDirection 在此之上做 UpOnly(>=1)/DownOnly(<=1)钳制。
// 实现选型:根元素尺寸由使用方布局约束(Width/Height/MaxWidth/MaxHeight),ResizeObserver 同时
// 观察根(可用尺寸)与内容元素(自然尺寸),内容元素以 transform: scale() 缩放(transform-origin
// 0 0,对应 WinUI ScaleTransform 默认原点、子元素在 (0,0) 处 Arrange 的语义);某轴无可用约束
// (测得 <= 0)时,按 WinUI MeasureOverride 的 DesiredSize 反推该轴自动尺寸——回写采用锁定式
// (见 autoWidth/autoHeight 处注释),避免「写入 → 测得 > 0 → 撤销 → 又写入」的自激振荡。
// 差异:WinUI 的 Viewbox 不裁剪溢出内容(UniformToFill 会画出布局边界之外),本复刻按任务规格
// 在根元素上 overflow: hidden 默认裁剪,详见 wiki/controls/Viewbox.md。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiViewbox' })

const props = withDefaults(
  defineProps<{
    /** 内容拉伸方式(WinUI Stretch);缺省 Uniform。 */
    stretch?: ViewboxStretch
    /** 缩放方向(WinUI StretchDirection):UpOnly 只放大、DownOnly 只缩小、Both 不限;缺省 Both。 */
    stretchDirection?: ViewboxStretchDirection
    /** 容器最大宽度(WinUI FrameworkElement.MaxWidth);数字按 px,字符串原样作为 CSS 长度。 */
    maxWidth?: number | string
    /** 容器最大高度(WinUI FrameworkElement.MaxHeight);数字按 px,字符串原样作为 CSS 长度。 */
    maxHeight?: number | string
  }>(),
  {
    stretch: 'Uniform',
    stretchDirection: 'Both',
  },
)

// —— 测量:根元素 = 可用尺寸;内容元素 = 子内容自然尺寸(对应 XAML 以无限尺寸 Measure)——
const rootEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)

const availableWidth = ref(0)
const availableHeight = ref(0)
const contentWidth = ref(0)
const contentHeight = ref(0)

// —— 无约束轴的自动尺寸:锁定式回写(QA F1 修复)——
// 「测得 > 0 即撤销回写」会让撤销本身把该轴测得带回 0,下一帧又回写,形成
// 「写入 → 撤销 → 写入」的逐帧 0↔自然尺寸振荡。改为锁定态:某轴测得 <= EPSILON 即进入
// 该轴的自动尺寸锁定,锁定期间持续回写当前计算值(值不变时样式不动,ResizeObserver 不再
// 触发,静止无环);仅当测得尺寸与最近回写值偏离超过布局取整量——即消费方显式接管了该轴
// (模板 merge 顺序保证消费方 style 优先)——才解锁让位;解锁后测得又回到 <= EPSILON 时
// 重新锁定。
const widthAutoActive = ref(false)
const heightAutoActive = ref(false)
let lastWrittenWidth: number | null = null
let lastWrittenHeight: number | null = null

/** 解锁判定容差:浏览器布局盒按 1/64px 取整,0.5px 远大于取整误差、远小于有意义的取值差。 */
const UNLATCH_DELTA = 0.5

let observer: ResizeObserver | null = null

function onObserve(entries: ResizeObserverEntry[]): void {
  for (const entry of entries) {
    // contentRect 为布局盒(transform 不影响布局尺寸)
    if (entry.target === rootEl.value) {
      const aw = entry.contentRect.width
      const ah = entry.contentRect.height
      // 消费方接管检测:锁定态下测得值偏离最近回写值 → 解锁让位(回写值随 computed 清空)
      if (widthAutoActive.value && lastWrittenWidth !== null && Math.abs(aw - lastWrittenWidth) > UNLATCH_DELTA) {
        widthAutoActive.value = false
      }
      if (heightAutoActive.value && lastWrittenHeight !== null && Math.abs(ah - lastWrittenHeight) > UNLATCH_DELTA) {
        heightAutoActive.value = false
      }
      // 无约束轴(测得 <= EPSILON)进入自动尺寸锁定态
      if (aw <= EPSILON) widthAutoActive.value = true
      if (ah <= EPSILON) heightAutoActive.value = true
      availableWidth.value = aw
      availableHeight.value = ah
    } else if (entry.target === contentEl.value) {
      contentWidth.value = entry.contentRect.width
      contentHeight.value = entry.contentRect.height
    }
  }
}

onMounted(() => {
  observer = new ResizeObserver(onObserve)
  if (rootEl.value) observer.observe(rootEl.value)
  if (contentEl.value) observer.observe(contentEl.value)
})

onBeforeUnmount(() => {
  // 组件卸载断开观察者,避免泄漏
  observer?.disconnect()
  observer = null
})

/** 「约等于 0」阈值:对应源码 IsCloseReal 的意义,过滤亚像素与浮点噪声。 */
const EPSILON = 0.0001

// —— ComputeScaleFactor 的逐行复刻(availableSize 用「非正视为无限」近似 Web 的无约束)——
const scale = computed<{ x: number; y: number }>(() => {
  const aw = availableWidth.value
  const ah = availableHeight.value
  const cw = contentWidth.value
  const ch = contentHeight.value
  const widthConstrained = aw > EPSILON
  const heightConstrained = ah > EPSILON

  // 源码:Stretch=None 或宽高都无约束时保持 1:1
  if (props.stretch === 'None' || (!widthConstrained && !heightConstrained)) {
    return { x: 1, y: 1 }
  }

  let scaleX = cw > EPSILON ? aw / cw : 0
  let scaleY = ch > EPSILON ? ah / ch : 0

  // 源码:某轴无约束时,该轴比例取另一轴;两轴都受约束时按 stretch 归一
  if (!widthConstrained) {
    scaleX = scaleY
  } else if (!heightConstrained) {
    scaleY = scaleX
  } else if (props.stretch === 'Uniform') {
    scaleX = scaleY = Math.min(scaleX, scaleY)
  } else if (props.stretch === 'UniformToFill') {
    scaleX = scaleY = Math.max(scaleX, scaleY)
  }
  // Fill(及 default):两轴保持各自比例

  // 源码:缩放方向钳制(UpOnly 只放大 / DownOnly 只缩小),Fill 分支同样生效
  if (props.stretchDirection === 'UpOnly') {
    scaleX = Math.max(1, scaleX)
    scaleY = Math.max(1, scaleY)
  } else if (props.stretchDirection === 'DownOnly') {
    scaleX = Math.min(1, scaleX)
    scaleY = Math.min(1, scaleY)
  }

  return { x: scaleX, y: scaleY }
})

// —— 无约束轴的自动尺寸:按 DesiredSize = scale * contentSize 反推(见 MeasureOverride)——
// 锁定态下持续输出当前计算值;值不变时 Vue 不写样式、ResizeObserver 不触发,静止收敛
// (锁定值恰为该轴固定点:回写后该轴按受约束参与 scale 计算,结果与无约束分支一致)。
const autoWidth = computed(() =>
  widthAutoActive.value && contentWidth.value > EPSILON ? scale.value.x * contentWidth.value : undefined,
)
const autoHeight = computed(() =>
  heightAutoActive.value && contentHeight.value > EPSILON ? scale.value.y * contentHeight.value : undefined,
)

// 记录最近回写值,供「消费方接管」解锁检测使用
watch(autoWidth, (value) => {
  lastWrittenWidth = value ?? null
})
watch(autoHeight, (value) => {
  lastWrittenHeight = value ?? null
})

/** 数字 → px,字符串原样透传(空串视为未设置)。 */
function toCssLength(value: number | string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const rootStyle = computed<CSSProperties>(() => ({
  maxWidth: toCssLength(props.maxWidth),
  maxHeight: toCssLength(props.maxHeight),
  width: autoWidth.value !== undefined ? `${autoWidth.value}px` : undefined,
  height: autoHeight.value !== undefined ? `${autoHeight.value}px` : undefined,
}))

const contentStyle = computed<CSSProperties>(() => ({
  transform: `scale(${scale.value.x}, ${scale.value.y})`,
}))
</script>

<template>
  <!-- 纯布局容器:无交互态与业务事件。$attrs 放在显式绑定之后:消费方 class/style 优先,
       自动尺寸锁定态才能被消费方显式尺寸接管(见脚本内 QA F1 注释) -->
  <div ref="rootEl" class="wui-viewbox" :style="rootStyle" v-bind="$attrs">
    <div ref="contentEl" class="wui-viewbox__content" :style="contentStyle">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.wui-viewbox {
  position: relative;
  /* WinUI 的 Viewbox 本身不裁剪溢出内容(UniformToFill 会画出边界之外,官方示例需 Border.Clip);
     本复刻按任务规格默认裁剪,与 WinUI 的差异已在 wiki 记录 */
  overflow: hidden;
}

.wui-viewbox__content {
  position: absolute;
  top: 0;
  left: 0;
  /* 以最大内容宽度布局,得到子内容的自然尺寸(对应 XAML 以无限可用尺寸 Measure 子元素) */
  width: max-content;
  /* WinUI ScaleTransform 默认原点 + 子元素 Arrange 在 (0,0):缩放锚定左上角 */
  transform-origin: 0 0;
}
</style>
