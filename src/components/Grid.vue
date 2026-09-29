<script setup lang="ts">
// Grid —— WinUI Grid 的 Web 复刻:纯布局面板(源 generic.xaml 中无 TargetType="Grid" 的
// Style/ControlTemplate,无视觉状态可对照),重点在布局语义映射,全部由原生 CSS Grid 承载:
//   行高/列宽简写(WinUI GridLength):"Auto" → auto、数字 → Npx、"*" → minmax(0, 1fr)、
//     "N*" → minmax(0, Nfr)。星值用 minmax(0, Nfr) 而非 1fr,复刻 WinUI「星值轨道纯按
//     可用空间加权、不被内容撑开」的语义(CSS 1fr 自带 min-content 下限);
//   ColumnSpacing / RowSpacing(WinUI 3 特性)→ column-gap / row-gap,负值按 0 处理;
//   子项定位(WinUI Grid.Column / Grid.Row / Grid.ColumnSpan / Grid.RowSpan 附加属性)
//     → 子项上的 data-grid-column / data-grid-row / data-grid-column-span /
//     data-grid-row-span(数字或数字字符串,0 起)。方案:检查默认插槽子 vnode 的
//     data-grid-* 附加属性,以 cloneVNode 合并 style(grid-column / grid-row)定位 ——
//     对原生元素与任意子组件(含库内 Wui* 控件)一律生效,不额外包裹 DOM。
//     与备选方案(ColumnDefinition/RowDefinition 子组件 + provide/inject)的取舍见 wiki。
//   默认 Stretch 对齐:容器不干预子项对齐(CSS 网格子项默认 justify/align-self: stretch,
//     等价 WinUI HorizontalAlignment / VerticalAlignment 默认 Stretch);
//   容器 align-content / justify-content: start —— WinUI 无星值轨道时的剩余空间不分配给
//     Auto/固定轨道,而 CSS 默认 stretch 会把它们拉大,置 start 对齐源行为
//     (有星值轨道时星值吸尽可用空间,start 无副作用)。
import { Comment, cloneVNode, computed, useSlots } from 'vue'
import type { CSSProperties, VNode } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiGrid' })

// —— Props(属性名跟随 WinUI camelCase)——
const props = withDefaults(
  defineProps<{
    /** 列定义(WinUI ColumnDefinitions 字符串简写):逗号分隔,"Auto" / 数字(像素) / "N*"(星值加权);缺省单列 "*"。 */
    columnDefinitions?: string
    /** 行定义(WinUI RowDefinitions 字符串简写),规则同 columnDefinitions;缺省单行 "*"。 */
    rowDefinitions?: string
    /** 列间距(WinUI ColumnSpacing,WinUI 3 特性);单位 px,负值按 0 处理。 */
    columnSpacing?: number
    /** 行间距(WinUI RowSpacing);单位 px,负值按 0 处理。 */
    rowSpacing?: number
  }>(),
  {
    columnDefinitions: '*',
    rowDefinitions: '*',
    columnSpacing: 0,
    rowSpacing: 0,
  },
)

// Grid 无控件专属事件(WinUI 中仅继承 UIElement 路由事件);不声明 emits,
// 让原生事件监听(@click 等)经 $attrs 自然透传到根元素,便于埋点 / 调试。

// —— GridLength 简写解析 ——
// 单个记号 → CSS 轨道尺寸;无法识别的记号按 Auto 降级(源 XAML 解析器抛异常,
// Web 端保持网格可用,差异已记入 wiki)。
function parseGridLength(token: string): string {
  if (/^auto$/i.test(token)) return 'auto'
  const star = /^(\d+(?:\.\d+)?)?\*$/.exec(token)
  if (star) return `minmax(0, ${star[1] ?? '1'}fr)`
  if (/^\d+(?:\.\d+)?$/.test(token)) return `${token}px`
  return 'auto'
}

// 简写串 → grid-template 值列表;空串 / 全空白按 WinUI 缺省(单 "*" 轨道)。
function parseDefinitions(definitions: string): string[] {
  const tracks = definitions
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token !== '')
    .map(parseGridLength)
  return tracks.length > 0 ? tracks : ['minmax(0, 1fr)']
}

const parsedColumns = computed(() => parseDefinitions(props.columnDefinitions))
const parsedRows = computed(() => parseDefinitions(props.rowDefinitions))

// —— 容器样式:行列模板 + 间距(gap) ——
const gridStyle = computed<CSSProperties>(() => ({
  gridTemplateColumns: parsedColumns.value.join(' '),
  gridTemplateRows: parsedRows.value.join(' '),
  columnGap: `${Math.max(props.columnSpacing, 0)}px`,
  rowGap: `${Math.max(props.rowSpacing, 0)}px`,
}))

// —— 子项定位:检查默认插槽子 vnode 的 data-grid-* 附加属性 ——
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** 读附加属性值:数字或数字字符串(截断取整);缺省 / 非法回退 fallback。 */
function readPlacement(source: Record<string, unknown>, name: string, fallback: number): number {
  const raw = source[name]
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw)
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw.trim())
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return fallback
}

const slots = useSlots()

/**
 * 默认插槽子项 → 合并定位 style 的克隆 vnode。行为对照 WinUI:
 *   - Row / Column 越界:WinUI 把子项挤入 0 尺寸的虚拟轨道(实际不可见),Web 端收敛到
 *     最后一行 / 列,避免 CSS Grid 产生隐式轨道破坏模板;
 *   - Span 越界:WinUI 对非法 Span 校验报错,Web 端静默钳制到「起点到网格边界」;
 *   - data-grid-* 只作定位输入,克隆时置 undefined 从 DOM 剥离(经 mergeProps 覆写,
 *     patchAttr 对 null/undefined 走 removeAttribute);
 *   - Fragment(v-for)/ Text / Static(type 为 symbol)无法逐项携带定位属性,原样透传;
 *   - v-if=false 的 Comment 占位剔除。
 */
const placedChildren = computed<VNode[]>(() => {
  const columnCount = parsedColumns.value.length
  const rowCount = parsedRows.value.length
  const output: VNode[] = []
  for (const vnode of slots.default?.() ?? []) {
    if (vnode.type === Comment) continue
    if (typeof vnode.type === 'symbol') {
      output.push(vnode)
      continue
    }
    const childProps = (vnode.props ?? {}) as Record<string, unknown>
    const column = clamp(readPlacement(childProps, 'data-grid-column', 0), 0, columnCount - 1)
    const row = clamp(readPlacement(childProps, 'data-grid-row', 0), 0, rowCount - 1)
    const columnSpan = clamp(
      readPlacement(childProps, 'data-grid-column-span', 1),
      1,
      columnCount - column,
    )
    const rowSpan = clamp(readPlacement(childProps, 'data-grid-row-span', 1), 1, rowCount - row)
    output.push(
      cloneVNode(vnode, {
        // cloneVNode 走 mergeProps:style 与子项原有 style 合并(不覆盖),data-grid-* 覆写为 undefined 剥离。
        'data-grid-column': undefined,
        'data-grid-row': undefined,
        'data-grid-column-span': undefined,
        'data-grid-row-span': undefined,
        style: {
          gridColumn: `${column + 1} / span ${columnSpan}`,
          gridRow: `${row + 1} / span ${rowSpan}`,
        } satisfies CSSProperties,
      }),
    )
  }
  return output
})
</script>

<template>
  <!-- 单根节点,inheritAttrs: false(见 defineOptions);$attrs(class/style/id/data-*/事件监听)
       只经此处显式绑定透传根元素,组件自身的布局 style 置于其后,保证面板结构不被同名键意外冲掉。 -->
  <div v-bind="$attrs" class="wui-grid" :style="gridStyle">
    <component
      :is="child"
      v-for="(child, index) in placedChildren"
      :key="child.key ?? index"
    />
  </div>
</template>

<style scoped>
.wui-grid {
  display: grid;
  grid-auto-columns: auto;
  grid-auto-rows: auto;
  align-content: start;
  justify-content: start;
}
</style>
