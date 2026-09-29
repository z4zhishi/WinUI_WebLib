<script setup lang="ts">
// StackPanel.vue —— WinUI StackPanel 布局面板的 Web 复刻(阶段 2 布局)。
// StackPanel 是 Panel(非模板控件):generic.xaml 中没有它的 ControlTemplate/Style 与视觉状态树
// (已核对 CK/WinUI-Reference generic.xaml,仅存在作为其他控件模板内嵌元素的使用),因此组件
// 无交互态、无业务事件,重点还原布局语义:
//   - Orientation(Vertical 默认 / Horizontal)→ CSS flex-direction column / row;
//   - Spacing(默认 0)→ flex gap(只在子项之间生效,首尾不加,与 WinUI 语义一致);
//   - 子项交叉轴默认 Stretch → align-items: stretch(子项可用自身 align-self 覆写);
//   - 子项主轴保持期望尺寸 → flex: 0 0 auto(flex-grow/shrink 0,剩余空间不分配、空间不足不压缩);
//   - margin 不折叠(WinUI 无 margin 合并语义)→ flex 容器天然不折叠子项 margin;
//   - 不裁剪内容(overflow 跟随内容)→ overflow: visible,空间不足时子项溢出面板边界。
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

/** WinUI Orientation 枚举取值。 */
type OrientationValue = 'Horizontal' | 'Vertical'

const props = withDefaults(
  defineProps<{
    /** 排列方向;缺省 Vertical(WinUI 属性默认)。 */
    orientation?: OrientationValue
    /** 相邻子项间距;数字按 px,字符串原样作为 CSS 长度;缺省 0。 */
    spacing?: number | string
    /** 面板内边距(FrameworkElement.Padding);数字按 px;缺省 0。 */
    padding?: number | string
    /** 面板背景色(Panel.Background);任意 CSS 颜色/变量;缺省透明(WinUI 默认 null)。 */
    background?: string
  }>(),
  {
    orientation: 'Vertical',
    spacing: 0,
    padding: 0,
    background: undefined,
  },
)

defineOptions({ inheritAttrs: false })

// —— 长度归一:数字 → px,字符串透传 ——
function toCssLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value
}

const rootClass = computed(() => [
  'wui-stack-panel',
  props.orientation === 'Horizontal'
    ? 'wui-stack-panel--horizontal'
    : 'wui-stack-panel--vertical',
])

const rootStyle = computed<CSSProperties>(() => ({
  gap: toCssLength(props.spacing),
  padding: toCssLength(props.padding),
  background: props.background,
}))
</script>

<template>
  <!-- 纯布局面板:无交互态与业务事件;class/style 经 $attrs 透传给单根节点 -->
  <div v-bind="$attrs" :class="rootClass" :style="rootStyle"><slot /></div>
</template>

<style scoped>
.wui-stack-panel {
  display: flex;
  /* WinUI StackPanel 被父容器约束时按可用尺寸排布、子项溢出边界(不裁剪):
     min-width/height 归零避免 flex 父级下被内容撑开,overflow 保持可见 */
  min-width: 0;
  min-height: 0;
  overflow: visible;
}

/* Vertical(默认):主轴纵向,子项交叉轴(横向)默认 Stretch */
.wui-stack-panel--vertical {
  flex-direction: column;
  align-items: stretch;
}

/* Horizontal:主轴横向,子项交叉轴(纵向)默认 Stretch */
.wui-stack-panel--horizontal {
  flex-direction: row;
  align-items: stretch;
}

/* 子项主轴尺寸 = 各自期望尺寸:WinUI StackPanel 不拉伸也不压缩子项的主轴尺寸,
   空间不足时子项按期望尺寸溢出面板边界(不裁剪),对应 flex-grow/shrink 0 */
.wui-stack-panel > :slotted(*) {
  flex: 0 0 auto;
}
</style>
