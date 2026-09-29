<script setup lang="ts">
// Canvas —— WinUI Canvas 的 Web 复刻:支持子项绝对定位的布局面板(无 ControlTemplate、无视觉状态、无业务事件)。
// 布局行为对照 CK/WinUI-Reference/dxaml/xcp/core/core/elements/canvas.cpp:
//   子项按附加属性偏移摆放、按 desired size 排布(不参与画布自身度量,也不撑开画布);
//   CCanvas::UpdateLayoutClip 注释「Canvas does not normally support layout clipping」→ 默认不裁剪;
//   附加属性经核实只有 Left/Top/ZIndex 三个(CK/.../dxaml/lib/winrtgeneratedclasses/Canvas.g.cpp 仅这三个静态访问器,
//   官方 API 文档的 attached properties 表一致),Right/Bottom 为本项目 Web 扩展(语义差异见 wiki/controls/Canvas.md)。
// 附加属性方案(本组件独立选择,与 Grid 的实现互不约束):子元素写 data-canvas-top/left/right/bottom/z-index,
//   组件渲染时经 cloneVNode 把 attr 映射为 position:absolute 内联样式,使用方无需手写定位 style。
import { Comment, Text, cloneVNode, computed, useSlots } from 'vue'
import type { CSSProperties, VNode } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 画布底色(Panel.Background);WinUI 默认为 null 画刷 → 透明。任意 CSS 颜色或 --wui-* 变量。 */
    background?: string
    /** 扩展:是否裁剪溢出画布边界的子项;WinUI Canvas 默认不裁剪。 */
    clipToBounds?: boolean
  }>(),
  {
    clipToBounds: false,
  },
)

defineOptions({ inheritAttrs: false })

const slots = useSlots()

// —— 附加属性值归一:数字/数字串 → px;其余字符串原样透传(CSS 长度,'50%' / 'auto' / 'calc(…)')——
function toLength(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  const raw = String(value).trim()
  if (raw === '' || raw === 'NaN') return undefined
  const numeric = Number(raw)
  if (Number.isFinite(numeric)) return `${numeric}px`
  return raw
}

// —— ZIndex 归一:z-index 不带单位 ——
function toZIndex(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  const raw = String(value).trim()
  if (raw === '') return undefined
  const numeric = Number(raw)
  return Number.isFinite(numeric) ? String(numeric) : raw
}

/** 读取子元素 vnode 上的 data-canvas-* 附加属性。 */
function attachedProp(vnode: VNode, name: string): unknown {
  const attached = vnode.props as Record<string, unknown> | null | undefined
  return attached?.[`data-canvas-${name}`]
}

/** 把子元素的 data-canvas-* 附加属性映射为绝对定位样式(WinUI 中 Canvas 直接子项全部绝对定位,未设偏移落在 (0,0))。 */
function positionedStyle(vnode: VNode): CSSProperties {
  return {
    position: 'absolute',
    top: toLength(attachedProp(vnode, 'top')),
    left: toLength(attachedProp(vnode, 'left')),
    right: toLength(attachedProp(vnode, 'right')),
    bottom: toLength(attachedProp(vnode, 'bottom')),
    zIndex: toZIndex(attachedProp(vnode, 'z-index')),
  }
}

// —— 默认 slot 出口:克隆子 vnode 并注入定位样式;注释/文本占位(v-if 假值等)原样保留 ——
const positionedChildren = computed<VNode[]>(() => {
  const rawChildren = slots.default?.() ?? []
  return rawChildren.map((vnode) => {
    if (vnode.type === Comment || vnode.type === Text) return vnode
    // 自身 style 在前、注入样式在后:附加属性定位优先生效
    return cloneVNode(vnode, { style: [vnode.props?.style, positionedStyle(vnode)] })
  })
})

const rootClass = computed(() => ['wui-canvas', { 'wui-canvas--clip': props.clipToBounds }])

const rootStyle = computed(() => (props.background ? { background: props.background } : undefined))
</script>

<template>
  <!-- 纯布局面板:无交互态与业务事件;class/style 经 $attrs 透传给单根节点(尺寸等由使用方经 style/class 给定) -->
  <div v-bind="$attrs" :class="rootClass" :style="rootStyle">
    <component :is="child" v-for="(child, index) in positionedChildren" :key="child.key ?? index" />
  </div>
</template>

<style scoped>
.wui-canvas {
  /* WinUI Canvas 无默认背景(null 画刷 → 透明),不裁剪、不响应指针交互 */
  position: relative;
}

/* clipToBounds=true:裁剪溢出边界的子项(WinUI 默认行为为不裁剪,本类为扩展开关) */
.wui-canvas--clip {
  overflow: hidden;
}
</style>
