<script setup lang="ts">
// SelectorBar —— WinUI SelectorBar 的 Web 复刻:小型单选选项卡条(Pivot 的 Windows 11 替代控件)。
// 视觉规格:CK/WinUI-Reference/controls/dev/SelectorBar/SelectorBar.xaml(DefaultSelectorBarStyle;
//   SelectorBar 不在 dxaml/themes/generic.xaml 内,模板在 dev 资源字典):
//   - 模板:Grid(Background 透明)内 ItemsView(ItemsSource = Items,水平 StackLayout)+
//     Grid.ChildrenTransitions 的 RepositionThemeTransition(布局重排动画,Web 侧未复刻,wiki 记录);
//   - IsTabStop=False + TabNavigation Once:栏自身不进 Tab 序,焦点落在 SelectorBarItem 上
//     (Web 侧以「选中项停留 tab」的 roving tabindex 等价,见 wiki);
//   - SelectorBarPadding(0,4) 由 ItemsView.Padding 承载(内容行上下 4px);
//   - 溢出:ItemsView 内部是 ScrollView(水平 StackLayout)→ 内容超宽时横向滚动;
//     Web 侧 overflow-x:auto 等价,浏览器滚动条样式与 WinUI 覆盖式滚动条不同(wiki 记录)。
// 行为规格(对照 docs/design-notes/SelectorBar/selectorBar-functional-spec.md + SelectorBar.cpp):
//   - 单选:SelectedItem(默认首项);选中项被移出集合时 SelectedItem 自动置 null(源规约);
//     其余项被移除时索引平移,选中指向不变;
//   - selectionChanged:点击 / 左右方向键(选中随焦点移动)/ 程序化修改时触发;初始挂载不触发;
//   - 键盘(源 ItemsView 键盘语义):←/→ 移动焦点且**选中随焦点**,端点截停不回绕;Home/End 到首/末;
//     RTL 下左右翻转;Tab 进入时焦点落在选中项;跳过禁用项;
//   - 上下文契约:向 slot 内的 SelectorBarItem provide 键 'wuiSelectorBarContext'(登记/仲裁/取消),
//     接口见下;独立使用 SelectorBarItem(无本组件祖先)时降级为自管单选。
// 双向绑定:selectedItem 为 WinUI 原生属性(defineModel,写入选中,读取为当前项 VNode,按引用/键匹配);
//   selectedIndex 为 Web 增强便利属性(WinUI 无 SelectedIndex;-1 = 无选中),二者联动保持一致。
import { computed, nextTick, onMounted, provide, ref, shallowRef, triggerRef, watch } from 'vue'
import type { Ref, VNode } from 'vue'

/** 选择栏项句柄(SelectorBarItem 登记自身;与 SelectorBarItem.vue 中的定义结构化同构)。 */
interface SelectorBarItemHandle {
  element: () => HTMLElement | null
  disabled: () => boolean
  key: () => unknown
  vnode: () => VNode | null
}

/** 选择栏上下文(provide 键 'wuiSelectorBarContext')。 */
interface SelectorBarContext {
  /** 栏级禁用(WinUI SelectorBar.IsEnabled=false → 全部项禁用)。 */
  disabled: Readonly<Ref<boolean>>
  /** 已登记项(登记序 = 模板序);shallowRef 数组(触发 ref 触发读取方重算)。 */
  items: Readonly<Ref<readonly SelectorBarItemHandle[]>>
  /** 当前选中项句柄(null = 无选中)。 */
  selectedHandle: Readonly<Ref<SelectorBarItemHandle | null>>
  /** roving tabindex 的缺省落点(无选中时为首项)。 */
  fallbackHandle: Readonly<Ref<SelectorBarItemHandle | null>>
  /** 项登记;返回注销函数。 */
  registerItem: (handle: SelectorBarItemHandle) => () => void
  /** 请求选中某项(项点击 / IsSelected=true 写入;挂载期内静默采纳,不发事件)。 */
  select: (handle: SelectorBarItemHandle) => void
  /** 取消选中(WinUI SelectedItem=null 语义;仅端点驱动的 IsSelected=false 触发)。 */
  deselect: () => void
}

/** selectionChanged 事件参数(WinUI SelectorBarSelectionChangedEventArgs 本体无成员;
 *  Web 侧展开为当前项与下标,便于绑定;item = null / index = -1 表示取消选中)。 */
interface SelectorBarSelectionChangedEventArgs {
  item: VNode | null
  index: number
}

const props = defineProps<{
  /** 栏级禁用(WinUI IsEnabled=false):全部项呈 Disabled 色且不可交互。 */
  disabled?: boolean
}>()

// —— 双向绑定:selectedIndex(Web 增强,-1 = 无选中)/ selectedItem(WinUI SelectedItem)——
const selectedIndex = defineModel<number>('selectedIndex', { default: 0 })
const selectedItem = defineModel<unknown>('selectedItem')

// —— 事件(WinUI SelectionChanged;点击 / 方向键 / 程序化修改触发,初始挂载不触发)——
const emit = defineEmits<{
  selectionChanged: [payload: SelectorBarSelectionChangedEventArgs]
}>()

defineOptions({ name: 'WuiSelectorBar', inheritAttrs: false })

// —— 项登记表(句柄内含函数闭包,shallowRef + triggerRef 维护,MenuBar 同款约定)——
const itemsRef = ref<HTMLElement | null>(null)
const items = shallowRef<SelectorBarItemHandle[]>([])

function registerItem(handle: SelectorBarItemHandle): () => void {
  items.value.push(handle)
  triggerRef(items)
  return () => {
    const index = items.value.indexOf(handle)
    if (index >= 0) items.value.splice(index, 1)
    triggerRef(items)
  }
}

const count = computed(() => items.value.length)

/** 渲染用受选中下标(空集合 = -1;越界值收敛到有效区间)。 */
const activeIndex = computed(() => {
  if (count.value === 0) return -1
  return Math.min(Math.max(Math.round(selectedIndex.value), 0), count.value - 1)
})

/** 当前选中项句柄(由 selectedIndex + 登记表派生,单一事实源)。 */
const selectedHandle = computed<SelectorBarItemHandle | null>(() =>
  activeIndex.value >= 0 ? (items.value[activeIndex.value] ?? null) : null,
)

/** roving tabindex 缺省落点:无选中项时落到首项(WinUI Tab 进入聚焦首可用项的等价)。 */
const fallbackHandle = computed<SelectorBarItemHandle | null>(
  () => selectedHandle.value ?? items.value[0] ?? null,
)

function vnodeAt(index: number): VNode | null {
  return items.value[index]?.vnode() ?? null
}

// —— 静默应用(挂载期采纳项的 IsSelected="True"、删除项后的索引平移:不发事件)——
let silentCount = 0

function setSelectionIndex(index: number, silent: boolean): void {
  if (silent) silentCount += 1
  selectedIndex.value = index
  if (silent) {
    void nextTick(() => {
      silentCount = Math.max(silentCount - 1, 0)
    })
  }
}

// —— 选中变化:发事件 + 同步 selectedItem(WinUI SelectedItem = 当前项实例的等价)——
let lastSelectedVnode: VNode | null = null

watch(selectedIndex, () => {
  const vnode = vnodeAt(activeIndex.value)
  if (silentCount === 0) {
    emit('selectionChanged', { item: vnode, index: activeIndex.value })
  }
  selectedItem.value = vnode
  lastSelectedVnode = vnode
})

// —— selectedItem 外部写入:按「引用 → key」匹配定位(匹配不到忽略;null = 取消选中)——
watch(selectedItem, (value) => {
  if (value === null || value === undefined) {
    if (activeIndex.value !== -1) setSelectionIndex(-1, false)
    return
  }
  const byIdentity = items.value.findIndex((handle) => handle.vnode() === value)
  if (byIdentity >= 0) {
    if (byIdentity !== activeIndex.value) setSelectionIndex(byIdentity, false)
    return
  }
  const byKey = items.value.findIndex(
    (handle) => handle.key() !== null && handle.key() === value,
  )
  if (byKey >= 0 && byKey !== activeIndex.value) setSelectionIndex(byKey, false)
})

// —— 项集合变化:选中项被移除 → 取消选中(源规约 SelectedItem 置 null,发事件);
//    其余情况按需静默平移索引(选中指向不变)——
watch(items, (list) => {
  if (lastSelectedVnode === null) return
  const stillThere = list.some(
    (handle) =>
      handle.vnode() === lastSelectedVnode ||
      (lastSelectedVnode !== null &&
        handle.key() !== null &&
        handle.key() === lastSelectedVnode.key),
  )
  if (!stillThere) {
    setSelectionIndex(-1, false)
    return
  }
  if (activeIndex.value !== selectedIndex.value) {
    setSelectionIndex(activeIndex.value, true)
  }
})

// —— 选中仲裁(由 SelectorBarItem 经上下文调用;挂载期内静默 = 声明式 IsSelected 采纳)——
const mounting = ref(true)
onMounted(() => {
  mounting.value = false
  lastSelectedVnode = selectedHandle.value?.vnode() ?? null
  // 初始挂载静默同步 selectedItem(WinUI 声明式 IsSelected 后 SelectedItem 即有值;不发事件)
  selectedItem.value = vnodeAt(activeIndex.value)
})

function select(handle: SelectorBarItemHandle): void {
  const index = items.value.indexOf(handle)
  if (index < 0 || index === activeIndex.value) return
  setSelectionIndex(index, mounting.value)
}

function deselect(): void {
  if (activeIndex.value === -1) return
  setSelectionIndex(-1, mounting.value)
}

// —— 键盘(源 ItemsView 导航语义:←/→ 移动焦点且选中随焦点,端点截停;Home/End;跳过禁用项;RTL 翻转)——
function onItemsKeydown(event: KeyboardEvent): void {
  if (count.value === 0) return
  const focusable = items.value.filter((handle) => !handle.disabled() && handle.element() !== null)
  if (focusable.length === 0) return

  const active = document.activeElement
  let current = focusable.findIndex((handle) => handle.element() === active)
  if (current < 0) current = focusable.findIndex((handle) => handle === selectedHandle.value)
  if (current < 0) current = 0

  const rtl = itemsRef.value !== null && getComputedStyle(itemsRef.value).direction === 'rtl'
  const last = focusable.length - 1
  let target = current
  switch (event.key) {
    case 'ArrowLeft':
      target = (rtl ? current < last : current > 0) ? current + (rtl ? 1 : -1) : current
      break
    case 'ArrowRight':
      target = (rtl ? current > 0 : current < last) ? current + (rtl ? -1 : 1) : current
      break
    case 'Home':
      target = 0
      break
    case 'End':
      target = last
      break
    default:
      return
  }
  event.preventDefault()
  const next = focusable[target]
  if (!next) return
  select(next) // 选中随焦点(源:Selection follows focus)
  next.element()?.focus()
}

provide('wuiSelectorBarContext', {
  disabled: computed(() => props.disabled ?? false),
  items,
  selectedHandle,
  fallbackHandle,
  registerItem,
  select,
  deselect,
} satisfies SelectorBarContext)
</script>

<template>
  <!-- 模板 Grid:Background 透明;IsTabStop=False —— 栏自身不设 tabindex,焦点由 SelectorBarItem 承接 -->
  <div v-bind="$attrs" class="wui-selector-bar">
    <!-- ItemsView(水平 StackLayout):内容行左对齐,超宽横向滚动(源 ScrollView 语义);
         role=tablist + 项 role=tab(任务规格要求的 ARIA tabs 语义;WinUI 原生为 ListItem 语义,wiki 记录) -->
    <div ref="itemsRef" class="wui-selector-bar-items" role="tablist" @keydown="onItemsKeydown">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 SelectorBar.xaml DefaultSelectorBarStyle ControlTemplate:
 * Grid(Background 透明)> ItemsView(水平 StackLayout,Padding = SelectorBarPadding)。
 */
.wui-selector-bar {
  display: block;
  min-width: 0;
  background: var(--wui-control-fill-color-transparent); /* SelectorBarBackground = SystemControlTransparentBrush(SelectorBar_themeresources L6/L30/L52,透明) */
}

/* ItemsView + 内部 ScrollView:水平排布、超宽横向滚动;SelectorBarPadding(0,4)= 上下 4px */
.wui-selector-bar-items {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  padding: 4px 0; /* SelectorBarPadding(0,4) */
  overflow-x: auto;
  overflow-y: hidden;
}
</style>
