# 集合公共基建(阶段 5 控件作者必读)

本文描述阶段 5 全部集合类控件(ListView / GridView / ItemsRepeater / ItemsView …)共用的
布局器与选择模型底座。**在实现任何集合控件之前请先通读本文**,避免各控件自造布局/选择逻辑。

| 文件 | 职责 |
| ---- | ---- |
| `src/utils/collectionLayouts.ts` | 布局器纯函数层:`layoutStack` / `layoutUniformGrid`(输入条目数 + 可用尺寸 + 配置,输出逐项 rect 与内容总尺寸)+ `stackLayoutStyle` / `uniformGridLayoutStyle`(非虚拟化 CSS flex/grid 载体)+ `computeVisibleRange`(虚拟化窗口计算预留接口);纯计算、无 DOM、无 Vue 依赖 |
| `src/composables/useSelection.ts` | 选择模型 `useSelection(options)`:SelectionMode(None/Single/Multiple/Extended)、selectedItems 与 selectedIndices/selectedIndex 双视图、select/deselect/toggle/selectRange/selectAll/clear/replaceSelection、handleClick(WinUI ListView 惯例指针语义:ctrl 切换、shift 区间、锚点;与 ItemsView 的差异见「与 ItemsView 的已知差异」节)、keyOf 比较键;纯状态、不碰 DOM |

无在线示例(基建,非控件);已接入控件实现完成后在此文件末尾互链。

## 选型:三种承载方式

| 场景 | 用法 |
| ---- | ---- |
| 条目少(几十个内)、无需虚拟化 | CSS 载体:`stackLayoutStyle` / `uniformGridLayoutStyle` 直接产出容器样式,DOM 交给 `v-for` + flex/grid 排布,**零 rect 计算** |
| 条目多 / 需要虚拟化、或需要逐项精确位置(动画、命中测试) | rect 载体:`layoutStack` / `layoutUniformGrid` 输出逐项 rect,容器 `position: relative`,每项 `position: absolute; transform: translate(x, y)` + 显式宽高 |
| 超长列表(万级) | rect 载体 + `computeVisibleRange`:监听滚动 → 只渲染窗口内条目(见「虚拟化预留接口」) |

## 布局器

### StackLayout(对照 WinUI `StackLayout`)

属性映射(`StackLayoutOptions` → WinUI):

| 选项 | 类型 | 默认值 | WinUI 属性 | 说明 |
| ---- | ---- | ------ | ---------- | ---- |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | `Orientation`(默认 Vertical,名实一致) | 排列方向;**与滚动轴同向**(StackLayout.cpp L436-439):vertical 纵向排布纵向滚动、horizontal 横向排布横向滚动。注意与 UniformGridLayout 的反向语义(见下表)不同 |
| `spacing` | `number` | `0` | `Spacing`(默认 0.0) | 相邻项间距;负数按 0 |

```ts
import { layoutStack, stackLayoutStyle } from '@/utils/collectionLayouts'

// rect 载体:100 个 24px 行、行距 4 → 第 3 行 y = 56
const layout = layoutStack(100, { width: 320, height: 24 }, { spacing: 4 })
layout.items[2]        // { x: 0, y: 56, width: 320, height: 24 }
layout.contentSize     // { width: 320, height: 100 * 28 - 4 = 2796 } 首尾不贴间距

// CSS 载体:flex + gap(交叉/主轴尺寸交给 CSS,组件里 v-bind 即可)
const style = stackLayoutStyle({ orientation: 'horizontal', spacing: 8 })
// → { display: 'flex', flexDirection: 'row', gap: '8px' }
```

条目不等大时给取尺寸函数:`layoutStack(n, (i) => sizes[i])`(虚拟化下未知尺寸可先给估算值)。

### UniformGridLayout(对照 WinUI `UniformGridLayout`)

| 选项 | 类型 | 默认值 | WinUI 属性 | 说明 |
| ---- | ---- | ------ | ---------- | ---- |
| `orientation` | `'vertical' \| 'horizontal'` | `'horizontal'` | `Orientation`(本快照 MUX_DEFAULT_VALUE 即 Horizontal,见 ItemsRepeater.idl) | **反直觉**:horizontal = 条目沿 X 排、满行下折、纵向滚动(常规表格);vertical = 条目沿 Y 排、满列右折、横向滚动。WinUI 的 Orientation 指排列轴、与滚动轴相反(与 ItemsWrapGrid 同名词义相反,见「与 WinUI 的差异」) |
| `minItemWidth` | `number` | `0` | `MinItemWidth`(默认 0.0) | 最小项宽;纯函数层没有「实测条目」,要出正确结果必须显式给值 |
| `minItemHeight` | `number` | `0` | `MinItemHeight`(默认 0.0) | 同上;不配置时 WinUI 除零回绕语义 = 每行 1 项(实现已复刻) |
| `minRowSpacing` | `number` | `0` | `MinRowSpacing` | 行间距下限(horizontal 时的行间 / vertical 时的列间) |
| `minColumnSpacing` | `number` | `0` | `MinColumnSpacing` | 列间距下限(horizontal 时即行内项间距) |
| `maximumRowsOrColumns` | `number` | `-1` | `MaximumRowsOrColumns`(默认 -1) | 每行(列)项数上限;-1 = 不限;0 按 1 处理(WinUI `max(1u, v)` 语义) |
| `itemsJustification` | `'start' \| 'center' \| 'end' \| 'spaceBetween' \| 'spaceAround' \| 'spaceEvenly'` | `'start'` | `ItemsJustification` | 行内对齐:**逐行**按实际项数分配余量,含最后不满行 |
| `itemsStretch` | `'none' \| 'fill' \| 'uniform'` | `'none'` | `ItemsStretch` | 交叉轴拉伸:fill = 每项交叉尺寸增大(WinUI int 截断已复刻);uniform = 同 fill 且主轴按比例同步增大 |

```ts
import { layoutUniformGrid, uniformGridLayoutStyle } from '@/utils/collectionLayouts'

// rect 载体:宽 320 容器、100×80 项 → 每行 3 项、4 行
const layout = layoutUniformGrid(10, { width: 320, height: 0 },
  { minItemWidth: 100, minItemHeight: 80, minRowSpacing: 8, minColumnSpacing: 8 })
layout.itemsPerLine          // 3
layout.items[3]              // { x: 0, y: 88, width: 100, height: 80 } 已含间距与对齐
layout.contentSize           // 内容总尺寸(滚动范围)

// CSS 载体:固定轨道 + gap
const style = uniformGridLayoutStyle(30, { width: 316, height: 0 },
  { minItemWidth: 100, minItemHeight: 80, minRowSpacing: 8, minColumnSpacing: 8 })
// → { display:'grid', gridTemplateColumns:'repeat(3, 100px)', gridAutoRows:'80px',
//     gap:'8px 8px', justifyContent:'start' }
```

两个返回值契约(两套载体一致):

| 字段 | 说明 |
| ---- | ---- |
| `items` | 逐项 rect(仅 rect 载体),与条目同序,x/y/width/height 为最终值(含拉伸与对齐) |
| `contentSize` | 内容总尺寸:滚动范围 = `max(contentSize, 容器尺寸)`;Grid 的交叉轴是「单行宽」(WinUI extent 语义,fill 时占满可用尺寸),主轴是全部行总高 |
| `lines` / `itemsPerLine` | 行(列)数与每行(列)项数;StackLayout 恒 1/1 |

### 与 WinUI 的差异(基建级,各控件 wiki 请引用勿重复)

1. **Orientation 语义陷阱**:WinUI `UniformGridLayout.Orientation` 指条目排列轴,滚动轴相反(源码注释与 `OrientationBasedMeasures` 实证:Horizontal → 纵向滚动;注意 StackLayout 恰好同向)。本实现逐字对照本快照(默认 Horizontal = 常规表格观感);从 WinUI 文档/示例移植 XAML 时注意 **ItemsWrapGrid 的同名词义与本布局相反**。
2. **MinItemWidth/Height 默认值**:learn.microsoft.com 文档写 NaN(按实测条目自适应),本 CK 快照 idl 为 `0.0`;实现按快照走,并要求调用方显式给尺寸(纯函数没有 measure 阶段)。未来虚拟化控件接入后,可用「首项实测尺寸回填 minItemWidth/Height」模拟 NaN 行为。
3. **fill 拉伸的像素截断**:WinUI `CalculateExtraPixelsInLine` 用 C++ int 除法(`trunc`),每项增量可能少 1px 导致行尾留缝;rect 载体逐字复刻(含因此变小的每行项数),CSS 载体的 `minmax(Wpx, 1fr)` 是连续分配的近似(无截断),两载体在极端尺寸下会差 ≤1px/项。
4. **space-\* 对齐的载体差**:rect 载体逐行按实际项数分配(WinUI `PerformLineAlignment` 逐字对照);CSS 载体的 `justify-content/align-content` 按轨道数分配,最后不满行两者不同——需要逐行精确语义用 rect 载体。
5. **uniform 拉伸的 CSS 近似**:CSS 无「主轴随交叉轴等比增长」直接表达,`aspect-ratio` 仅近似,依赖条目内容配合。
6. **无依赖的布局器**:WinUI 布局器带虚拟化状态(锚点、估算滚动),本层为纯函数,状态与滚动协调由未来虚拟化控件承担(接口见下)。

## 选择模型(useSelection)

```vue
<script setup lang="ts">
import { useSelection } from '@/composables/useSelection'

const props = defineProps<{ items: Item[]; selectionMode?: SelectionMode }>()

const selection = useSelection({
  items: () => props.items,
  selectionMode: () => props.selectionMode ?? 'Extended',
  keyOf: (item) => item.id, // 缺省 = 对象引用
})

function onItemClick(item: Item, event: MouseEvent) {
  selection.handleClick(props.items.indexOf(item), {
    ctrl: event.ctrlKey, meta: event.metaKey, shift: event.shiftKey,
  })
}
</script>
```

`handleClick` 模式语义(对齐 WinUI **ListView** 惯例;与 ItemsView 的 4 处已知差异见下节):

| 模式 | 点击 | Ctrl/Cmd+点击 | Shift+点击 |
| ---- | ---- | ------------- | ---------- |
| `None` | 忽略 | 忽略 | 忽略 |
| `Single` | 仅选该项(重复点击保持) | 同左 | 同左 |
| `Multiple` | 切换该项;锚点=本项 | 同左 | 追加 锚点~本项 区间 |
| `Extended` | 仅选该项;锚点=本项 | 切换该项;锚点=本项 | **替换**为 锚点~本项 区间(锚点不动,可连续扩展);无有效锚点时退化为单选 |

输入契约:非法索引(非有限、越界,含负小数如 -0.5)一律 no-op;界内非整数索引向零截断(2.9 → 2),与 `select`/`toggle` 等原语一致;`selectRange` 端点须为界内索引——负数端点无操作、正越界终点钳到末项、界内小数向零截断。

### 与 ItemsView 的已知差异(本实现按 ListView 惯例,QA 裁决记录)

WinUI ItemsView 在 4 个角落 case 的行为与 ListView 不同,本基建按 ListView 惯例实现;需要 ItemsView 语义的控件请在宿主层自行覆盖:

| 场景 | ItemsView 实际行为 | 本实现(ListView 惯例) |
| ---- | ------------------ | ---------------------- |
| Single + Ctrl/Cmd 点击已选项 | 可取消选中(切换) | 保持选中(重申选择) |
| Multiple + Shift 点击 | 按锚点项的选中状态决定整段区间选/取消 | 一律追加锚点~本项区间 |
| 无有效锚点 + Shift 点击 | no-op | 退化为单选本项 |
| 点击已选项(Single/Extended) | no-op(不重申、不移锚点) | 重申选中并移动锚点 |

API 一览:

| 成员 | 类型 | 说明 |
| ---- | ---- | ---- |
| `selectionMode` | `ComputedRef<SelectionMode>` | 归一化后的当前模式;**切换模式不自动清空选择**(有意差异,WinUI 未作保证;控件侧如需清空请显式 `clear()`) |
| `selectedItems` | `ComputedRef<T[]>` | 选中条目(按 items 顺序,非点击顺序);未提供 items 时恒 `[]` |
| `selectedIndices` | `ComputedRef<number[]>` | 选中索引(升序) |
| `selectedIndex` | `ComputedRef<number>` | 首个选中索引,无选中 `-1`(WinUI `ListView.SelectedIndex` 语义) |
| `selectedCount` | `ComputedRef<number>` | 选中键数量 |
| `selectedKeys` | `ComputedRef<readonly unknown[]>` | 键快照(持久化/跨页恢复用) |
| `anchorIndex` | `Ref<number>` | 区间锚点(最后交互项,-1 初始);键盘场景宿主可直接写 |
| `isSelected(item)` / `isIndexSelected(index)` | `boolean` | 判定 |
| `select / deselect / toggle(target)` | `(T \| number) => void` | 原语;`select` 在 Single 下替换、Multiple/Extended 下追加 |
| `selectRange(from, to)` | `(T \| number) × 2 => void` | 追加闭区间(仅 Multiple/Extended;WinUI 区间选择同约束);不改锚点 |
| `selectAll()` | `() => void` | 仅 Multiple/Extended |
| `clear()` | `() => void` | 任何模式 |
| `replaceSelection(targets)` | `(readonly (T \| number)[]) => void` | 整体替换(自定义全选/恢复) |
| `handleClick(index, modifiers?)` | 见上表 | 指针入口;`modifiers` 通常直接透传事件字段 |

行为细节:

- **比较键**:默认对象引用;传 `keyOf` 后选择按业务键跟踪——重排/过滤/换实例(键相同)不丢选中。与 WinUI `SelectionModel`「按索引跟踪」是刻意差异:Web 列表常见排序/筛选,索引跟踪会选错行。
- **自动清除**:items 变化时,列表中已不存在的键自动取消选中(对齐 WinUI「移除条目即取消选中」),`anchorIndex` 越界自动重置 -1。该清理与 `onSelectionChange` 回调在 **nextTick 微任务**生效(Vue watch 默认调度),同一 tick 内多次变更合并为一次回调。
- **纯状态**:不碰 DOM、不注册事件;键盘(Ctrl+A、方向键移动锚点、Space 切换)由宿主控件解释后调用对应原语。
- **A11y**:宿主控件负责 `role`(listbox/option、grid/gridcell 等)与 `aria-selected` / `aria-multiselectable`(可用 `isSelected` 绑定)。

## 虚拟化预留接口

本基建**不做**虚拟化(不裁剪、不回收、不监听滚动);为后续虚拟化控件预留的约定:

```ts
import { computeVisibleRange } from '@/utils/collectionLayouts'

const layout = layoutUniformGrid(itemCount, viewportSize, gridOptions) // 布局可用估算尺寸

function onScroll() {
  // 滚动容器坐标换算到内容坐标系
  const viewport = { x: el.scrollLeft, y: el.scrollTop, width: el.clientWidth, height: el.clientHeight }
  const { start, end } = computeVisibleRange(layout.items, viewport, overscanPx)
  // 只渲染 [start, end] 闭区间;start === -1 表示窗口内无条目(越界滚动)
}
```

- rect 数组与条目同序(布局器保证),`computeVisibleRange` 据此做连续区间扫描并提前退出;参数 `overscan`(px,默认 0)向两端外扩,建议 1~2 屏消除快速滚动白屏。
- 超长列表可先只对「锚点附近」做整段 rect 计算(布局是 O(n) 纯函数,万级一次计算 <1ms,当前无分段必要)。
- WinUI 对应概念:`RealizationWindow`(可见窗口外的条目回收由未来控件实现)。

## 互链

- 基建源码:`src/utils/collectionLayouts.ts`、`src/composables/useSelection.ts`
- 参照源(只读):`CK/WinUI-Reference/controls/dev/Repeater/{StackLayout,UniformGridLayout,UniformGridLayoutState,FlowLayoutAlgorithm}.cpp`、`OrientationBasedMeasures.h`、`ItemsRepeater.idl`
- 后续控件文档将在此列出:ItemsRepeater、ItemsView、ListView、GridView、ComboBox 下拉列表(选择模型复用)…
