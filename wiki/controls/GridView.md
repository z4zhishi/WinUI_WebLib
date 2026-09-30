# GridView

> 在线示例:[/#/gridview](/#/gridview)

## 概述

GridView 把集合中的项排成「按行换行、可滚动」的行列网格,是图片墙、磁贴、对象浏览等场景的标准控件;与 [ListView](./ListView.md) 共享同一套选择模型(SelectionMode / SelectedItems / SelectionChanged),差别只在布局——ListView 单列纵向排布,GridView 按行换行。

对应 WinUI `Microsoft.UI.Xaml.Controls.GridView`,视觉与交互状态对照 `generic.xaml` 中 `TargetType="GridView"`(L9348 起)与默认项样式 `GridViewItemRevealStyle`(L17835 起,L22885 将其设为默认)复刻:项的 Normal / PointerOver / Pressed / Selected(+PointerOver / Pressed 组合)/ Disabled / 聚焦各态、左上角 Overlay 勾选标记(CheckMode=Overlay)、1px 揭示边框结构,颜色全部取自 `theme.css` 预置的 `--wui-grid-view-item-*` token(亮 / 暗两套主题齐备)。

官方文档:

- [GridView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.gridview)
- [GridViewItem - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.gridviewitem)
- [List 视图与网格视图设计指南](https://learn.microsoft.com/windows/apps/design/controls/listview-and-gridview)

## 属性(GridView)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | `unknown[]` | `[]` | 数据源数组(WinUI `ItemsSource`);元素可为字符串、数字或对象 |
| `selectionMode` | `'None' \| 'Single' \| 'Multiple' \| 'Extended'` | `'Single'` | 选择模式(WinUI `SelectionMode`);`None` 清空选择,`Multiple` 所有项显示空心勾选圈,`Extended` 支持 Ctrl/Shift 组合 |
| `selectedIndex` | `number` | `-1` | 首个选中项索引(WinUI `SelectedIndex`,未选为 -1),`v-model:selected-index` 双向绑定 |
| `selectedItem` | `unknown` | `undefined` | 首个选中项(WinUI `SelectedItem`),`v-model:selected-item` 双向绑定;`defineModel<unknown>` 不收字面量默认值,首次同步前内部值为 `undefined`,与「未选」语义等价(未选时事件与回显以 `null` 表达) |
| `selectedItems` | `unknown[]` | `[]` | 全部选中项(WinUI `SelectedItems`),`v-model:selected-items` 双向绑定 |
| `isItemClickEnabled` | `boolean` | `false` | 点击项时触发 `itemClick` 事件(WinUI `IsItemClickEnabled`),不影响选择逻辑 |
| `displayMemberPath` | `string` | `''` | 对象项的显示字段路径(WinUI `DisplayMemberPath`),如 `'title'`;缺省按 `String(item)` 渲染 |
| `itemWidth` | `number` | `undefined` | 单元格宽 px(WinUI `ItemWidth`);缺省按容器宽均分换行 |
| `itemHeight` | `number` | `undefined` | 单元格高 px(WinUI `ItemHeight`);缺省由内容决定 |
| `maximumRowsOrColumns` | `number` | `0` | 换行前每行(纵向流为每列)最多项数(WinUI `MaximumRowsOrColumns`;0 = 不限) |
| `orientation` | `'Horizontal' \| 'Vertical'` | `'Horizontal'` | 换行方向(WinUI `ItemsWrapGrid.Orientation`;`Vertical` 为列优先流,横向滚动)。注意:`Vertical` 且 `maximumRowsOrColumns = 0`(不限)时全部项排成单行横排——列优先流需要一个有界的行数才会在纵向换列,请配合固定 `itemHeight` 或设置 `maximumRowsOrColumns` 使用 |
| `padding` | `string` | `'0,0,0,10'` | 控件内边距(WinUI `Padding`,XAML Thickness 顺序:左,上,右,下) |
| `itemMargin` | `string` | `'0,0,4,4'` | 项外边距(对应官方示例改 `ItemContainerStyle` 的 `Margin`) |
| `selectionCheckMarkVisualEnabled` | `boolean` | `true` | 选择勾选标记(WinUI `GridViewItemSelectionCheckMarkVisualEnabled`) |
| `revealBorder` | `boolean` | `false` | 悬浮揭示边框(近似 WinUI 2 reveal 效果,见下方差异说明) |
| `disabled` | `boolean` | `false` | 禁用态,项进入 Disabled 视觉状态且不可交互 |
| `#item` slot | `{ item: unknown; index: number; selected: boolean }` | — | 自定义项模板(WinUI `ItemTemplate` 的等价物);缺省渲染显示文本 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

## 属性(GridViewItem)

项容器也单独导出(`src/components/GridViewItem.vue`),可独立使用:

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `selected` | `boolean` | `false` | 是否选中(WinUI `IsSelected`) |
| `disabled` | `boolean` | `false` | 禁用(WinUI `IsEnabled`) |
| `selectionCheckMarkVisualEnabled` | `boolean` | `true` | 是否渲染勾选标记 |
| `multiSelectHalo` | `boolean` | `false` | 未选中时也显示空心勾选圈(Multiple 模式的呈现,GridView 自动下发) |
| `enableReveal` | `boolean` | `false` | 悬浮 1px 跟随指针光环(reveal 边框近似) |
| `contentMargin` | `string` | `'0,0,0,0'` | 内容边距(WinUI `ContentMargin`,即模板里的 `Padding`) |
| `margin` | `string` | `'0,0,4,4'` | 项外边距(WinUI `Margin`,取默认样式的 `0,0,4,4`) |

事件:`click`(转发原生 `MouseEvent`,禁用时不触发)。

## 事件(GridView)

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectionChanged` | `(selected: unknown[], added: unknown[], removed: unknown[])` | 选中集合变化时(点击、键盘、程序化赋值均触发;`added`/`removed` 对照 WinUI `SelectionChangedEventArgs` 的 `AddedItems`/`RemovedItems`,签名与 [ListView](./ListView.md) 同约定) |
| `itemClick` | `(e: { item, index, event })` | 点击项时触发,需 `isItemClickEnabled`(WinUI `ItemClick`) |

模板中监听写法:`@selection-changed="onSelectionChanged"`。

## 选择交互

| 操作 | Single | Multiple | Extended |
| --- | --- | --- | --- |
| 单击 | 选中该项 | 切换该项 | 重置为只选该项 |
| Ctrl + 单击 | 取消选择(若已选) | 切换该项 | 切换该项(保留其余) |
| Shift + 单击 | — | — | 自锚点至点击项范围选择 |
| Ctrl + A | — | — | 全选 |
| 方向键 | 移动焦点并随动选择 | 仅移动焦点 | 仅移动焦点 |

选择以「项引用」严格相等判定(与 WinUI 一致);向 `selectedItems` / `selectedIndex` 写入程序化赋值同样会触发 `selectionChanged`。

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `←` / `→` / `↑` / `↓` | 按网格几何位置移动焦点(与列数无关,任意布局可用);Single 模式随动选择 |
| `Home` / `End` | 移动到首 / 末项(Single 模式随动选择) |
| `Space` / `Enter` | 选择 / 切换当前聚焦项 |
| `Ctrl` + `A` | 全选(Extended) |

焦点采用 roving tabindex:Tab 只进入当前焦点项,方向键在项之间移动。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiGridView from '@/components/GridView.vue'

interface Photo { title: string; image: string }
const photos: Photo[] = [
  { title: 'Aurora', image: '/img/aurora.jpg' },
  { title: 'Basalt', image: '/img/basalt.jpg' },
  { title: 'Canyon', image: '/img/canyon.jpg' },
]
const selected = ref<unknown[]>([])

function onItemClick(event: { item: unknown; index: number }): void {
  console.log('item click', event)
}
</script>

<template>
  <WuiGridView
    :items="photos"
    display-member-path="title"
    selection-mode="Single"
    is-item-click-enabled
    :item-width="190"
    :item-height="130"
    @item-click="onItemClick"
    @selection-changed="(sel) => (selected = sel)"
  >
    <template #item="{ item }">
      <img :src="item.image" :alt="item.title" width="190" height="130" />
    </template>
  </WuiGridView>
</template>
```

多选:`selection-mode="Multiple"`,所有项常显空心勾选圈,选中后填充为实心勾选圈;`selectedItems` 随勾选实时更新。

## 与 WinUI 的差异说明

- **布局引擎**:WinUI 默认 `ItemsWrapGrid`(按内容宽换行)/ `UniformGridLayout`(定格尺寸)。Web 版以 CSS Grid 等价实现:给了 `itemWidth`/`itemHeight` 即定格单元格;`maximumRowsOrColumns` 映射为列数上限;两者都不给时按 `minmax(160px, 1fr)` 均分换行(源里无此基准值,是 Web 侧补的缺省,因为 `repeat(auto-fill, …)` 需要确定的轨道基准)。`orientation="Vertical"` 以 `grid-auto-flow: column` 模拟,需要容器有界高度。
- **Reveal 边框**:源 `GridViewItemRevealBorderBrush`(SystemControlTransparentRevealBorderBrush)在 WinUI 3 中解析为透明(reveal 高光已在 WinUI 3 退役),因此默认不可见,组件保留了 1px 揭示边框结构;`reveal-border` 打开后以「跟随指针的径向渐变 1px 光环」近似 WinUI 2 的 reveal 边框,颜色取 `--wui-grid-view-item-focus-border` 的半透明近似。
- **焦点视觉**:WinUI 为双层系统焦点框(FocusVisualMargin=-2),这里以 `outline`(2px,`--wui-grid-view-item-focus-visual-primary`)+ 内圈 `box-shadow`(1px,`--wui-grid-view-item-focus-visual-secondary`)近似。
- **禁用透明度**:`ListViewItemDisabledThemeOpacity`(0.55)未提取为 token,按源值硬编码。
- **勾选标记几何**:`CheckMode=Overlay` 的圆圈尺寸 / 内边距由 ListViewItemPresenter 在代码中绘制,XAML 无对应值,按 Windows 11 观感取 20px 圆圈、左上角 6px 内缩。
- **虚拟化**:WinUI 列表控件默认 UI 虚拟化,Web 版直接渲染全部项,适合中小集合(官方示例规模);大数据量请配合分页。
- **未实现**:拖拽排序(`CanDragItems` / `CanReorderItems` / `AllowDrop`)、`Header` / `Footer`、分组(`IsGrouping` / `GridViewHeaderItem`)、滚动逐项吸附;需要时以 slot / 外层容器组合实现。

## 与 ListView / useSelection 的实现分歧(如实记录,待统一)

选择公共层 `src/composables/useSelection.ts`(任务 T5.0)在 GridView 首轮实现期间未落地,GridView 与 [ListView](./ListView.md) 各自内联了选择核心(T5.0 文件于 fix round 1 前后补齐);`selectionChanged` 事件签名两侧已主动对齐为 `(selected, added, removed)` 三参,但仍有以下可枚举分歧,接入 useSelection 统一为后续重构项:

1. **`items` 形态**:GridView 为普通 prop;ListView 为 `v-model:items`(defineModel)。WinUI `ItemsSource` 可写,统一时需二选一。
2. **`selectedItem` 模型**:GridView 提供 `v-model:selected-item`(超集);ListView 仅暴露 `selectedIndex` / `selectedItems`。
3. **useSelection 接入**:两侧均未接入(公共层文件现已补齐,选择裁决仍各自内联)。
4. **内部核心形态**:GridView 用 `selectedIndexes` + `applySelection(next, emitEvent)`;ListView 用 `selectedIndices` + `applySelection(nextIndices, primaryIndex)` 并附加回声签名去重(`lastPrimary` / `lastItemsKey` / `selectionKey`)。
5. **初始同步**:GridView 的模型 watcher 带 `immediate`(父级传入的初始 v-model 挂载即生效且不发事件);ListView 的 watcher 非 immediate,在挂载前另做一步显式初始同步。
6. **selectionMode 切换处置**:GridView 有独立 watcher(`None` → 清空并发事件;`Multiple → Single` 收敛为首项);ListView 在各选择 watcher 内联 `None` 守卫,无 Single 收敛逻辑。
7. **数据源变化**:GridView 仅剔除越界选中项;ListView 同时钳制焦点索引(`clampFocus`)。
8. **锚点(AnchorIndex)**:两侧各自维护。GridView 锚点仅被非 Shift 点击更新(fix round 1 修正,Shift 区间选择依赖旧锚);ListView 的 `anchorIndex` 在失效(< 0 或越界)时回退为当前聚焦项。

## 互链

- 演示页源码:[demo/pages/GridViewPage.vue](../../demo/pages/GridViewPage.vue)
- 组件源码:[src/components/GridView.vue](../../src/components/GridView.vue)、[src/components/GridViewItem.vue](../../src/components/GridViewItem.vue)
- 同族控件:[ListView](./ListView.md)(选择模型同约定)、[FlipView](./FlipView.md)
- 集合公共层:[_collection-infra.md](./_collection-infra.md)(阶段 5 公共层,由 T5.0 维护)
