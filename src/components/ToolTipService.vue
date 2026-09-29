<script setup lang="ts">
// ToolTipService —— WinUI ToolTipService 附加属性语义的 Web 复刻:作为子组件放在
// 宿主元素内,以「附加到宿主」的方式为任意元素/控件提供 tooltip,对应 XAML:
//
//   <Button Content="…"
//           ToolTipService.ToolTip="Simple ToolTip"
//           ToolTipService.Placement="Right"
//           ToolTipService.InitialShowDelay="2000" />
//
//   <Button Content="…">
//     <WuiToolTipService placement="Right" :delay="2000">富内容</WuiToolTipService>
//   </Button>
//
// 实现方式:渲染一个 display:none 的标记节点,挂载后取其 DOM 父元素作为
// tooltip 目标(即宿主组件根元素,如 <WuiButton> 渲染出的 <button>),再把
// 全部附加属性转发给内部的 ToolTip.vue(target 直连模式)。富提示内容
// (ToolTipService.ToolTip 的 ToolTip 对象形态)经默认插槽透传。
//
// 语义对照(ToolTipService_Partial.cpp / ToolTipService.idl):
//   - ToolTip      → content 属性 / 默认插槽;
//   - PlacementMode → placement(Top 默认);
//   - InitialShowDelay → delay(1000ms);
//   - ShowDuration → showDuration(5000ms);
//   - HorizontalOffset / VerticalOffset → horizontalOffset / verticalOffset;
//   - PlacementTarget → target 属性(显式指定宿主之外的元素)。
import { computed, onMounted, ref, useSlots } from 'vue'
import WuiToolTip from './ToolTip.vue'
import type { ToolTipPlacementValue } from './ToolTip.vue'

const props = withDefaults(
  defineProps<{
    /** 提示文本(WinUI ToolTipService.ToolTip 的 string 形态);富内容用默认插槽,插槽优先。 */
    content?: string
    /** 放置位(WinUI ToolTipService.PlacementMode):Top(默认)/ Bottom / Left / Right / Auto。 */
    placement?: ToolTipPlacementValue
    /**
     * 显式目标元素(WinUI ToolTipService.PlacementTarget):HTMLElement 或 CSS 选择器。
     * 缺省时自动取宿主(本组件标记节点的 DOM 父元素)。
     */
    target?: HTMLElement | string | null
    /** 出现延迟 ms(WinUI ToolTipService.InitialShowDelay,默认 1000)。 */
    delay?: number
    /** 显示时长 ms,超时自动关(WinUI ToolTipService.ShowDuration,默认 5000)。 */
    showDuration?: number
    /** 最大宽度 px(WinUI ToolTipMaxWidth = 320)。 */
    maxWidth?: number
    /** 水平偏移 px,正值向右(WinUI ToolTipService.HorizontalOffset)。 */
    horizontalOffset?: number
    /** 垂直偏移 px,正值向下(WinUI ToolTipService.VerticalOffset)。 */
    verticalOffset?: number
  }>(),
  {
    content: '',
    placement: 'Top',
    target: null,
    delay: 1000,
    showDuration: 5000,
    maxWidth: 320,
    horizontalOffset: 0,
    verticalOffset: 0,
  },
)

defineOptions({ name: 'WuiToolTipService', inheritAttrs: false })

// —— 插槽类型契约(富提示内容;标记节点本身不可见)——
defineSlots<{
  /** 富提示内容(WinUI ToolTipService.ToolTip 的 ToolTip 对象形态)。 */
  default?: () => unknown
}>()

/** display:none 标记节点:仅用于在 DOM 里定位宿主(parentElement)。 */
const markerRef = ref<HTMLElement | null>(null)

/** 解析出的宿主元素;显式 target 属性优先(WinUI PlacementTarget 覆盖默认宿主)。 */
const hostEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (props.target != null) return // 显式 target:交由 ToolTip.vue 自行解析
  const parent = markerRef.value?.parentElement ?? null
  hostEl.value = parent
  if (import.meta.env.DEV && !parent) {
    console.warn(
      '[wui-tooltip-service] 未找到宿主元素:请把本组件直接放在宿主元素/组件内部,或改用 target 属性指定目标。',
    )
  }
})

const resolvedTarget = computed<HTMLElement | string | null>(() => {
  if (props.target != null) return props.target
  return hostEl.value
})

/** 转发给内部 ToolTip 的附加属性集。 */
const passthroughProps = computed(() => ({
  content: props.content,
  placement: props.placement,
  delay: props.delay,
  showDuration: props.showDuration,
  maxWidth: props.maxWidth,
  horizontalOffset: props.horizontalOffset,
  verticalOffset: props.verticalOffset,
}))

const slots = useSlots()

/** 无内容(无 content 且无默认插槽)时不挂 tooltip,等价「未附加 ToolTip」。 */
const hasContent = computed(() => props.content !== '' || slots.default !== undefined)
</script>

<template>
  <!-- 标记节点不可见、不参与布局;宿主 = 其 DOM 父元素 -->
  <span ref="markerRef" class="wui-tooltip-service-marker" aria-hidden="true"></span>
  <WuiToolTip v-if="resolvedTarget && hasContent" :target="resolvedTarget" v-bind="passthroughProps">
    <slot>{{ content }}</slot>
  </WuiToolTip>
</template>

<style scoped>
.wui-tooltip-service-marker {
  display: none;
}
</style>
