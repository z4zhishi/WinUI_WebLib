<script setup lang="ts">
// ListBox.vue —— WinUI ListBox 的 Web 复刻(朴素短列表选择控件)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="ListBox">(L19990 起):模板 Border(LayoutRoot:Background=
//   SystemControlBackgroundChromeMediumLow、BorderBrush=SystemControlForegroundBaseHigh、
//   BorderThickness=ListBoxBorderThemeThickness(浅/深主题均 0,无圆角)→ ScrollViewer
//   (Padding=控件 Padding,纵向 Auto / 横向 Disabled,BringIntoView)→ ItemsPresenter;
//   容器自身无 VSM(IsEnabled 关闭时仅项级出 Disabled 态)。
//   <Style TargetType="ListBoxItem">(L19862 起):Padding=ListBoxItemPadding=12,9,12,12、
//   Background=Transparent、HorizontalContentAlignment=Left、无 MinHeight(区别于
//   ListViewItemMinHeight=40,项高由内容 + Padding 决定);模板 Grid → Rectangle
//   PressedBackground(整项铺色,IsTemplateFocusTarget)+ ContentPresenter(Margin=Padding,
//   左上对齐,TextWrapping=NoWrap)。VSM CommonStates 各态画刷:
//     Normal       透明底 + 继承控件前景(SystemControlForegroundBaseHigh)
//     PointerOver  SystemControlHighlightListLowBrush(浅 #00000019 / 深 #19FFFFFF)
//     Pressed      SystemControlHighlightListMediumBrush(浅 #00000033 / 深 #33FFFFFF)
//     Selected / SelectedUnfocused   SystemControlHighlightListAccentLowBrush(浅强调色 40% / 深 60%)
//     SelectedPointerOver            SystemControlHighlightListAccentMediumBrush(浅 60% / 深 80%)
//     SelectedPressed                SystemControlHighlightListAccentHighBrush(浅 70% / 深 90%)
//     Disabled     内容前景 SystemControlDisabledBaseMediumLowBrush(无透明度衰减,底色不变)
//     以上交互/选中态内容前景均为 SystemControlHighlightAltBaseHighBrush(默认主题下与
//     Normal 同色,token 仍按源接线,主题覆盖时正确联动)。
//   项焦点框:UseSystemFocusVisuals 系统双线焦点框(SystemControlFocusVisualPrimary/Secondary,
//   ListBoxItem 未覆写 FocusBorderBrush 族,选中项不反色);复用 ListView.vue 已过 QA 的
//   item 级 CSS 模式(inset 双环近似系统绘制)。
// 行为规格(对照 WinUI Selector):
//   - 选择状态机复用集合公共底座 src/composables/useSelection.ts(与 ListView 同底座):
//     SelectionMode 四态(None/Single/Multiple/Extended)、锚点区间、Ctrl/Shift 指针语义;
//   - selectedIndex(WinUI SelectedIndex)/ selectedItem(WinUI SelectedItem)/
//     selectedItems(WinUI SelectedItems,源为只读集合,本实现提供双向便于程序化多选,
//     差异登记 wiki)三个双向模型;程序化赋值语义与 ListView.vue 一致;
//   - 变化统一发 selectionChanged(selected, added, removed)(程序化赋值亦触发);
//   - 键盘(roving tabindex):↑/↓ 移焦、Home/End 首/末、Ctrl+方向键只移焦、
//     Shift+↑/↓(Extended/Multiple)区间、Space 选择/切换、Ctrl+Space(Extended)、
//     Ctrl+A 全选;WinUI ListBox 无 ItemClick 事件,Enter 不做特殊处理;
//   - singleSelectionFollowsFocus(WinUI 同名属性,默认 true)仅作用于 Single 模式;
//   - 与 ListView 的实现差异:无虚拟化面板配置、Multiple 模式无勾选框(源 ListBoxItem
//     模板即无 CheckBox,多选以 accent 铺底表达)、项无 MinHeight。
//   - Reveal 揭示光照(默认启用):源无 ListBoxItemRevealStyle(MR8 按工单「ListView/
//     ListBox 的 item 复用 useReveal」把同族 ListView 项视觉外推到 ListBox 项,登记为
//     无源条款的借用映射)——公共层(reveal.css + useReveal)底板光 + 1px 边框光环,
//     悬停/按压色 ListLow/ListMedium 与源 ListBoxItem 同源,静态态零变化。
import { computed, nextTick, ref, useAttrs, useId, watch } from 'vue'
import { useReveal } from '../composables/useReveal'
import { useSelection } from '@/composables/useSelection'
import '../styles/reveal.css'

defineOptions({ name: 'WuiListBox', inheritAttrs: false })

/** 选择模式(WinUI SelectionMode)。 */
type SelectionMode = 'None' | 'Single' | 'Multiple' | 'Extended'

// —— 无障碍名:role=listbox 需要可访问名;attrs 传入的 aria-label / aria-labelledby
// 从根 div(无 role)迁移到 listbox 元素上。
const attrs = useAttrs()

const listAriaLabel = computed(() =>
  typeof attrs['aria-label'] === 'string' ? attrs['aria-label'] : undefined,
)
const listAriaLabelledBy = computed(() =>
  typeof attrs['aria-labelledby'] === 'string' ? attrs['aria-labelledby'] : undefined,
)

/** 根元素透传 attrs:剥离已迁移的 aria-label / aria-labelledby。 */
const rootAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'aria-label' || key === 'aria-labelledby') continue
    rest[key] = value
  }
  return rest
})

const props = withDefaults(
  defineProps<{
    /** 选择模式(WinUI SelectionMode,默认 Single)。 */
    selectionMode?: SelectionMode
    /** 对象项的显示字段路径(WinUI DisplayMemberPath);缺省 String(item)。 */
    displayMemberPath?: string
    /** Single 模式下方向键移动焦点时选中是否随焦点走(WinUI SingleSelectionFollowsFocus,默认 true)。 */
    singleSelectionFollowsFocus?: boolean
    /** 整控禁用(WinUI IsEnabled=false):全部项进入 Disabled 态,不响应交互。 */
    disabled?: boolean
    /** 项的 reveal 揭示光照(同 ListView.revealBorder 的借用映射)。默认 true;设 false 关闭。 */
    revealBorder?: boolean
  }>(),
  {
    selectionMode: 'Single',
    displayMemberPath: '',
    singleSelectionFollowsFocus: true,
    disabled: false,
    revealBorder: true,
  },
)

/** 数据源数组(WinUI ItemsSource),支持 v-model:items。 */
const items = defineModel<unknown[]>('items', { default: () => [] })
/** 选中项索引(WinUI SelectedIndex,未选 -1),支持 v-model:selected-index。 */
const selectedIndex = defineModel<number>('selectedIndex', { default: -1 })
/** 选中项(WinUI SelectedItem,未选 null;缺省 v-model 时为 undefined,按 null 归一)。 */
const selectedItem = defineModel<unknown>('selectedItem')
/** 选中项集合(WinUI SelectedItems;源只读,此处双向),支持 v-model:selected-items。 */
const selectedItems = defineModel<unknown[]>('selectedItems', { default: () => [] })

const emit = defineEmits<{
  /** WinUI SelectionChanged:选择集变化(含程序化赋值);参数为 (选中项, 新增项, 移除项)。 */
  (e: 'selectionChanged', selected: unknown[], added: unknown[], removed: unknown[]): void
}>()

const listId = useId()

// reveal 光照(公共层):指针位置/光斑半径写入 CSS 变量(非禁用且指针设备启用);
// 光晕渲染在 reveal.css 的 ::before(底板光)/::after(边框光),v-on 对象绑到每一项。
const revealHandlers = useReveal(() => !props.disabled)

/* -------------------------------------------------------------------------
 * 选择状态(useSelection 公共底座):内部唯一事实源在组合式内,
 * 本组件负责「双向模型 ↔ 选择集」同步与手势解释。
 * ---------------------------------------------------------------------- */

/** 上一帧通知快照(selectionChanged 的 added / removed 做差用)。 */
let lastNotified: unknown[] = []

const selection = useSelection({
  items: () => items.value ?? [],
  selectionMode: () => props.selectionMode,
  onSelectionChange: (selected) => {
    const previous = lastNotified
    const added = selected.filter((entry) => !previous.includes(entry))
    const removed = previous.filter((entry) => !selected.includes(entry))
    if (added.length === 0 && removed.length === 0) return
    // 同集替换(如 Single 模式重复点击已选中项)不构成变化:不发事件、不回写模型
    lastNotified = [...selected]
    // 回写双向模型(回声由下方 watcher 的相等短路吸收)
    selectedIndex.value = selection.selectedIndex.value
    selectedItem.value = selected.length > 0 ? selected[0] : null
    selectedItems.value = [...selected]
    emit('selectionChanged', [...selected], added, removed)
  },
})

/** 键盘焦点索引(roving tabindex;初始首项,保证 Tab 可达)。 */
const focusedIndex = ref(0)

/** 由 selectedItems 数组反查索引集(引用相等,去重保序)。 */
function indicesOf(list: readonly unknown[]): number[] {
  const source = items.value ?? []
  const indices: number[] = []
  for (const entry of list) {
    const index = source.indexOf(entry)
    if (index >= 0 && !indices.includes(index)) indices.push(index)
  }
  return indices
}

// 初始同步:外部经 props 传入的首选值落入选择集(watcher 非 immediate,挂载前补一步;
// 预置 lastNotified 吞掉这次初始化的回声,初始模板值不发 selectionChanged,对齐 WinUI)
if (props.selectionMode !== 'None') {
  const source = items.value ?? []
  const initialList = Array.isArray(selectedItems.value) ? selectedItems.value : []
  let indices = indicesOf(initialList)
  if (indices.length === 0 && selectedIndex.value != null) {
    const index = Math.trunc(Number(selectedIndex.value))
    if (index >= 0 && index < source.length) indices = [index]
  }
  if (
    indices.length === 0 &&
    selectedItem.value != null &&
    source.includes(selectedItem.value)
  ) {
    indices = [source.indexOf(selectedItem.value)]
  }
  if (indices.length > 0) {
    selection.replaceSelection(indices)
    lastNotified = [...selection.selectedItems.value]
    // 同步其余两个模型(WinUI SelectedIndex / SelectedItem 随选择集生效)
    selectedIndex.value = selection.selectedIndex.value
    selectedItem.value = selection.selectedItems.value[0] ?? null
  }
}

// 程序化只写 selectedIndex:语义为「选中该单项,替换既有选择」(WinUI 同);越界归一 -1
watch(selectedIndex, (value, oldValue) => {
  const index = typeof value === 'number' ? Math.trunc(value) : -1
  const count = items.value?.length ?? 0
  if (typeof oldValue === 'number' && oldValue !== -1 && (oldValue < 0 || oldValue >= count)) {
    return // 上一帧为越界值:本帧 -1 是归一化回声,不再作用于选择
  }
  if (props.selectionMode === 'None') {
    // WinUI:None 模式 SelectedIndex 恒为 -1,外部写入不生效
    if (selectedIndex.value !== -1) selectedIndex.value = -1
    return
  }
  if (index !== -1 && (index < 0 || index >= count)) {
    // 越界:模型值归一为 -1(WinUI 对越界赋值抛错,Web 收敛),不动既有选择
    if (selectedIndex.value !== -1) selectedIndex.value = -1
    return
  }
  if (index === selection.selectedIndex.value) return // 本组件回写的回声
  if (index < 0) selection.clear()
  else selection.replaceSelection([index])
})

// 程序化只写 selectedItem:按引用相等回查索引,选中该单项(替换既有选择);null = 清空
watch(selectedItem, (value) => {
  if (props.selectionMode === 'None') {
    if (selectedItem.value != null) selectedItem.value = null
    return
  }
  if ((value ?? null) === (selection.selectedItems.value[0] ?? null)) return // 回声
  const source = items.value ?? []
  if (value == null || !source.includes(value)) selection.clear()
  else selection.replaceSelection([source.indexOf(value)])
})

// 程序化写 selectedItems:按引用相等回查索引,整体替换选择集
watch(selectedItems, (value) => {
  if (props.selectionMode === 'None') {
    // WinUI:None 模式无选择,外部写入不生效
    if (selectedItems.value.length > 0) selectedItems.value = []
    return
  }
  const list = Array.isArray(value) ? value : []
  if (sameItems(list, selection.selectedItems.value)) return // 回声
  const indices = indicesOf(list)
  if (indices.length === 0) selection.clear()
  else selection.replaceSelection(indices)
})

/** 条目数组按引用相等比较(顺序敏感;同序同集即视为未变)。 */
function sameItems(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index])
}

// 数据源变化:useSelection 已剔除失效选中,这里只钳制焦点索引(容器回收语义)
watch(items, () => {
  const count = items.value?.length ?? 0
  if (focusedIndex.value >= count) focusedIndex.value = Math.max(0, count - 1)
})

const isMultiSelect = computed(
  () => props.selectionMode === 'Multiple' || props.selectionMode === 'Extended',
)

/* -------------------------------------------------------------------------
 * 项显示文本(displayMemberPath 优先,回退 String(item))
 * ---------------------------------------------------------------------- */

function itemText(item: unknown): string {
  if (item == null) return ''
  if (props.displayMemberPath !== '' && typeof item === 'object') {
    const value = (item as Record<string, unknown>)[props.displayMemberPath]
    if (value != null) return String(value)
  }
  return String(item)
}

/* -------------------------------------------------------------------------
 * 焦点管理(roving tabindex + BringIntoView)
 * ---------------------------------------------------------------------- */

const scrollerRef = ref<HTMLDivElement | null>(null)

function focusItem(index: number): void {
  const count = items.value?.length ?? 0
  if (count === 0) return
  focusedIndex.value = Math.max(0, Math.min(count - 1, index))
  void nextTick(() => {
    const scroller = scrollerRef.value
    if (!scroller) return
    const target = scroller.querySelector<HTMLElement>(`[data-item-index="${focusedIndex.value}"]`)
    // roving tabindex 落实为真实 DOM 焦点:键盘路径(:focus-visible 双线焦点框随动)
    // 与 Space/Shift 的操作目标才一致;preventScroll 交由下方 scrollIntoView(nearest)
    // 精确对齐 BringIntoView。指针路径浏览器启发式不命中 :focus-visible,不出焦点框。
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'nearest' })
  })
}

/* -------------------------------------------------------------------------
 * 指针:单击项(ListBoxItem 常规点选;修饰键交 useSelection.handleClick 裁决)
 * ---------------------------------------------------------------------- */

function onItemActivated(index: number, event: MouseEvent): void {
  if (props.disabled) return
  if (index < 0 || index >= (items.value?.length ?? 0)) return
  selection.handleClick(index, {
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey,
  })
  focusItem(index)
}

/* -------------------------------------------------------------------------
 * 键盘(项持焦点,事件冒泡到滚动容器统一裁决;源无 ItemClick,Enter 不拦截)
 * ---------------------------------------------------------------------- */

interface FocusMoveOptions {
  ctrl: boolean
  shift: boolean
}

/** 移动焦点;按模式决定是否连带选择(Shift 区间以锚点为基线整体替换)。 */
function moveFocus(target: number, options: FocusMoveOptions): void {
  const count = items.value?.length ?? 0
  if (count === 0) return
  const previous = focusedIndex.value
  const clamped = Math.max(0, Math.min(count - 1, target))
  focusItem(clamped)

  if (options.shift && isMultiSelect.value) {
    // WinUI:Shift+方向键 = 锚点~焦点区间替换选择(锚点不动,可连续扩展);
    // 无锚点(未点击过)时以移动前焦点为锚并落锚,保证连续 Shift 从同一起点扩展
    let anchor = selection.anchorIndex.value
    if (anchor < 0 || anchor >= count) {
      anchor = previous
      selection.anchorIndex.value = anchor
    }
    const from = Math.min(anchor, clamped)
    const to = Math.max(anchor, clamped)
    const range: number[] = []
    for (let index = from; index <= to; index += 1) range.push(index)
    selection.replaceSelection(range)
  } else if (
    !options.ctrl &&
    !options.shift &&
    props.selectionMode === 'Single' &&
    props.singleSelectionFollowsFocus
  ) {
    selection.select(clamped)
  }
}

function onListKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  const mode = props.selectionMode
  const count = items.value?.length ?? 0
  const ctrl = event.ctrlKey || event.metaKey
  const shift = event.shiftKey
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault()
      moveFocus(focusedIndex.value + (event.key === 'ArrowDown' ? 1 : -1), { ctrl, shift })
      return
    case 'Home':
    case 'End':
      event.preventDefault()
      moveFocus(event.key === 'Home' ? 0 : count - 1, { ctrl, shift })
      return
    case ' ':
    case 'Spacebar': {
      // Space:Single 选择焦点项;Multiple 切换;Extended 无 Ctrl 选择焦点项、
      // Ctrl+Space 切换且不破坏其余选中(WinUI Extended 键盘语义)
      event.preventDefault()
      const index = focusedIndex.value
      if (mode === 'None' || index < 0 || index >= count) return
      if (mode === 'Multiple') selection.toggle(index)
      else if (mode === 'Extended' && ctrl) {
        selection.toggle(index)
        selection.anchorIndex.value = index // WinUI:Ctrl+Space 锚点移至焦点项
      } else if (mode === 'Extended') selection.replaceSelection([index])
      else selection.select(index)
      return
    }
    case 'a':
    case 'A':
      if (ctrl && isMultiSelect.value) {
        event.preventDefault()
        selection.selectAll()
      }
      return
    // 其余按键(字符键/Tab/Enter 等)不拦截:Tab 走原生焦点移动(roving tabindex 承接);
    // 源 ListBox 无 ItemClick,Enter 不做特殊处理
  }
}
</script>

<template>
  <!-- 源模板 LayoutRoot Border:Background=ChromeMediumLow、BorderBrush=BaseHigh、
       BorderThickness=ListBoxBorderThemeThickness(浅/深主题 0,无圆角键) -->
  <div
    v-bind="rootAttrs"
    class="wui-list-box"
    :class="{ 'is-disabled': disabled }"
    :aria-disabled="disabled || undefined"
  >
    <!-- ScrollViewer:Padding=控件 Padding(默认 0);@keydown 收项冒泡(roving tabindex) -->
    <div ref="scrollerRef" class="wui-list-box-scroller" @keydown="onListKeydown">
      <div
        :id="listId"
        class="wui-list-box-items"
        role="listbox"
        :aria-label="listAriaLabel"
        :aria-labelledby="listAriaLabelledBy"
        :aria-multiselectable="isMultiSelect || undefined"
      >
        <div
          v-for="(item, index) in items"
          :id="`${listId}-opt-${index}`"
          :key="index"
          class="wui-list-box-item"
          :class="{
            'is-selected': selection.isIndexSelected(index),
            'is-disabled': disabled,
            'wui-reveal': revealBorder,
            'wui-reveal--border': revealBorder,
          }"
          :data-item-index="index"
          role="option"
          :aria-selected="selection.isIndexSelected(index)"
          :aria-disabled="disabled || undefined"
          :tabindex="disabled ? -1 : index === focusedIndex ? 0 : -1"
          v-on="revealBorder ? revealHandlers : undefined"
          @click="onItemActivated(index, $event)"
        >
          <!-- ContentPresenter:HorizontalAlignment=Left、VerticalAlignment=Top、
               Margin=ListBoxItemPadding(12,9,12,12)、TextWrapping=NoWrap -->
          <span class="wui-list-box-item-content">
            <slot name="item" :item="item" :index="index">{{ itemText(item) }}</slot>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wui-list-box {
  /* Style TargetType="ListBox":
     Background = SystemControlBackgroundChromeMediumLowBrush */
  background: var(--wui-system-control-background-chrome-medium-low);
  /* BorderBrush = SystemControlForegroundBaseHighBrush;
     BorderThickness = ListBoxBorderThemeThickness(浅/深主题均 0,HighContrast 2 未实现) */
  border: 0 solid var(--wui-system-control-foreground-base-high);
  /* Foreground = SystemControlForegroundBaseHighBrush(项 Normal 态继承) */
  color: var(--wui-system-control-foreground-base-high);
  /* FontFamily = ContentControlThemeFontFamily;FontSize = ControlContentThemeFontSize */
  font-size: var(--wui-control-content-theme-font-size);
  box-sizing: border-box;
}

.wui-list-box-scroller {
  /* ScrollViewer:VerticalScrollBarVisibility=Auto / HorizontalScrollMode=Disabled */
  max-height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  /* 控件 Padding(模板 TemplateBinding 到 ScrollViewer),默认 0 */
  padding: 0;
  outline: none;
  --wui-list-box-bar-size: 12px;
}

/* 滚动条:WinUI 细拇指观感(与 ScrollViewer / ListView 公共样式同语言) */
.wui-list-box-scroller::-webkit-scrollbar {
  width: var(--wui-list-box-bar-size);
  height: var(--wui-list-box-bar-size);
  background: transparent;
}

.wui-list-box-scroller::-webkit-scrollbar-track {
  background: transparent;
}

.wui-list-box-scroller:hover::-webkit-scrollbar-track {
  background: var(--wui-scroll-bar-track-fill);
}

.wui-list-box-scroller::-webkit-scrollbar-thumb {
  background: var(--wui-scroll-bar-thumb-background);
  border: 4px solid transparent;
  background-clip: padding-box;
  border-radius: 8px;
}

.wui-list-box-scroller:hover::-webkit-scrollbar-thumb {
  background: var(--wui-scroll-bar-thumb-fill-pointer-over);
  border: 3px solid transparent;
}

.wui-list-box-scroller:active::-webkit-scrollbar-thumb {
  background: var(--wui-scroll-bar-thumb-fill-pressed);
}

.wui-list-box-scroller::-webkit-scrollbar-corner {
  background: transparent;
}

/* ItemsPresenter:源无默认样式,项纵向堆叠(源 ItemsPanel=VirtualizingStackPanel) */
.wui-list-box-items {
  margin: 0;
  padding: 0;
}

/* ======================================================================
 * ListBoxItem(Style TargetType="ListBoxItem")
 * ====================================================================== */

.wui-list-box-item {
  /* Rectangle PressedBackground:整项铺色(focus target) */
  position: relative;
  display: flex;
  /* ContentPresenter VerticalAlignment = VerticalContentAlignment(默认 Top) */
  align-items: flex-start;
  /* ContentPresenter Margin = ListBoxItemPadding = 12,9,12,12(XAML LTRB;
     铺色矩形满幅,故 padding 置于项容器,底色覆盖含内边距的整框) */
  padding: 9px 12px 12px;
  /* Background = Transparent */
  background: transparent;
  /* 源无 MinHeight/MinWidth 键:项高由内容 + Padding 决定(区别于 ListViewItemMinHeight=40) */
  box-sizing: border-box;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}

/* ContentPresenter:HorizontalAlignment=Left + TextWrapping=NoWrap(超宽裁剪,无省略号) */
.wui-list-box-item-content {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: clip;
}

/* ======================================================================
 * 状态叠加(VSM CommonStates;优先级 SelectedPressed > SelectedPointerOver >
 * Pressed > PointerOver > Selected > Normal)
 * ====================================================================== */

/* PointerOver:PressedBackground = SystemControlHighlightListLowBrush,
   内容前景 = SystemControlHighlightAltBaseHighBrush */
.wui-list-box-item:not(.is-disabled):hover {
  background: var(--wui-system-control-highlight-list-low);
  color: var(--wui-system-control-highlight-alt-base-high);
}

/* Pressed:PressedBackground = SystemControlHighlightListMediumBrush(选中与否同源值) */
.wui-list-box-item:not(.is-disabled):active {
  background: var(--wui-system-control-highlight-list-medium);
  color: var(--wui-system-control-highlight-alt-base-high);
}

/* Selected / SelectedUnfocused:SystemControlHighlightListAccentLowBrush */
.wui-list-box-item.is-selected {
  background: var(--wui-system-control-highlight-list-accent-low);
  color: var(--wui-system-control-highlight-alt-base-high);
}

/* SelectedPointerOver:SystemControlHighlightListAccentMediumBrush */
.wui-list-box-item.is-selected:not(.is-disabled):hover {
  background: var(--wui-system-control-highlight-list-accent-medium);
}

/* SelectedPressed:SystemControlHighlightListAccentHighBrush */
.wui-list-box-item.is-selected:not(.is-disabled):active {
  background: var(--wui-system-control-highlight-list-accent-high);
}

/* ======================================================================
 * Reveal 揭示光照(公共层 reveal.css):底板光半径由 useReveal 按源公式
 * Clamp(Max(W,H)+12,16,512) 在进入时写入;边框光半径取源 wide 配置 ≈ 77px
 * (RevealBorderLight.cpp L37-48,列表行属宽幅大件,同 ListViewItem 口径);
 * 光环厚度 1px(同族 RevealBorderThemeThickness)。源无 ListBoxItemRevealStyle,
 * 本节为工单指定的同族借用映射。
 * ====================================================================== */
.wui-list-box-item.wui-reveal {
  --wui-reveal-border-width: 1px;
  --wui-reveal-border-radius: 77px;
}

/* 禁用项不点亮光晕(div 无 :disabled,由类门抑制) */
.wui-list-box-item.is-disabled.wui-reveal:hover::before,
.wui-list-box-item.is-disabled.wui-reveal:hover::after {
  opacity: 0;
}

/* Disabled:内容前景 = SystemControlDisabledBaseMediumLowBrush(底色不变,无透明度衰减);
   整控禁用(props.disabled)与单项 IsEnabled 同视觉 */
.is-disabled .wui-list-box-item {
  color: var(--wui-system-control-disabled-base-medium-low);
}

/* ======================================================================
 * 焦点框(UseSystemFocusVisuals=True:系统双线焦点框,主环 2px + 副环 1px;
 * ListBoxItem 未覆写 FocusBorderBrush 族 → 选中项不反色,统一系统刷)
 * ====================================================================== */

.wui-list-box-item:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}
</style>
