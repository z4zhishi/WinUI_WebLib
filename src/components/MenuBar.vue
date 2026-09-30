<script lang="ts">
// —— 模块级实例登记:F2 / Alt 的多实例仲裁 ——
// 同页可能有多个 MenuBar(官方示例页即三例);document 级 keydown 每实例都会收到,
// 以此表挑出「该认领」的实例:有下拉打开的优先(Alt 先收起,WinUI 开合语义)→
// 焦点所在的 → 首个登记的(冷启动)。首个收到事件的实例执行并 stopImmediatePropagation,
// 其余实例(含后注册者)不再处理,避免多栏抢焦点。
interface MenuBarController {
  barElement: () => HTMLElement | null
  hasOpenFlyout: () => boolean
  closeAllOpen: () => void
  focusEntry: () => void
}

const menuBarControllers: MenuBarController[] = []
</script>

<script setup lang="ts">
// WuiMenuBar —— WinUI MenuBar 的 Web 复刻(应用顶部横向菜单栏,由 MenuBarItem 组成)。
// 视觉规格:CK/WinUI-Reference/controls/dev/MenuBar/MenuBar.xaml + MenuBar_themeresources.xaml
//   (generic.xaml 本体无 TargetType="MenuBar" 段,模板在 dev 资源字典中):
//   - 模板:LayoutRoot(Grid,Background=MenuBarBackground=SubtleFillColorTransparentBrush,
//     HorizontalAlignment=Stretch)内 ContentRoot(ItemsControl,水平 StackPanel,
//     HorizontalAlignment=Left)——即整栏铺满、项靠左排布;
//   - MinHeight=MenuBarHeight 40;TabNavigation=Once(Web 侧以 roving tabindex 等价,见 wiki);
//   - IsTabStop=False(栏自身不进 Tab 序,焦点落在 MenuBarItem 上)。
// 行为规格(对照 controls/dev/MenuBar/MenuBar.cpp + MenuBarItem.cpp 的栏级协作):
//   - IsFlyoutOpen 栏级状态:任一 MenuBarItem 下拉打开即为 true —— Web 侧由已登记项的
//     isOpen 推导(computed),驱动「hover 滑过切换」与「点击另一项时的短路」;
//   - 兄弟互斥:同栏同时至多一个下拉打开(新项展开前收起已展开项,经 requestOpen 收口);
//   - OverlayInputPassThroughElement(LayoutRoot):指针在栏上移动不 dismiss 下拉 ——
//     Web 侧由「light dismiss 只认外部点击 + 锚与弹层豁免」天然成立;
//   - ←/→ 键盘:未展开时项间移焦(MoveFocusTo),展开时换菜单(OpenFlyoutFrom,由
//     MenuBarItem 调 openNeighbor 收口);
//   - F2 / Alt:把焦点移入菜单栏(Web 侧补充的进入方式,WinUI 对应 Access key scope;
//     多实例时首个处理的实例认领,stopImmediatePropagation 防止多栏争抢焦点)。
// 上下文契约:向 slot 内的 MenuBarItem provide 键 'wuiMenuBarContext'(登记/互斥/移焦),
//   接口 MenuBarContext 见下;MenuBarItem 独立使用(无本组件祖先)时降级为普通锚定菜单。
import { computed, onMounted, onScopeDispose, provide, ref, shallowRef, triggerRef } from 'vue'
import type { Ref } from 'vue'

/** 菜单栏项句柄(MenuBarItem 登记自身;与 MenuBarItem.vue 中的定义结构化同构)。 */
interface MenuBarItemHandle {
  element: () => HTMLElement | null
  isOpen: Ref<boolean>
  disabled: () => boolean
  open: (focusLayer: boolean) => void
  close: (restoreFocus: boolean) => void
}

/** 菜单栏上下文(provide 键 'wuiMenuBarContext')。 */
interface MenuBarContext {
  /** 已登记项(登记序 = 模板序,作 roving tabindex 的缺省首项);shallowRef 数组(句柄内含 Ref,不可走 deep reactive)。 */
  items: Readonly<Ref<readonly MenuBarItemHandle[]>>
  /** roving tabindex 的当前焦点项(null 时缺省落到 items[0])。 */
  activeHandle: Ref<MenuBarItemHandle | null>
  /** 项登记;返回注销函数。 */
  registerItem: (handle: MenuBarItemHandle) => () => void
  /** 标记 roving 焦点项。 */
  setActive: (handle: MenuBarItemHandle) => void
  /** 栏级 IsFlyoutOpen:任一项下拉打开即为 true。 */
  hasOpenFlyout: Ref<boolean>
  /** 兄弟互斥展开:先收起其他已展开项,再展开指定项(focusLayer 语义见 MenuBarItem.open)。 */
  requestOpen: (handle: MenuBarItemHandle, focusLayer: boolean) => void
  /** 项间移焦(MoveFocusTo):跳过禁用项,循环步进。 */
  moveFocus: (from: HTMLElement | null, direction: 1 | -1) => void
  /** 换菜单(OpenFlyoutFrom 的相邻展开半步:聚焦相邻项并展开其下拉)。 */
  openNeighbor: (from: MenuBarItemHandle, direction: 1 | -1) => void
  /** 移焦到首 / 末个可用项。 */
  focusEdge: (target: 'first' | 'last') => void
}

defineOptions({ name: 'WuiMenuBar', inheritAttrs: false })

// —— 栏根(焦点包含判定用)与项登记表 ——
// 句柄内含 isOpen Ref,deep reactive/ref 会把 Ref 解包成裸值破坏契约 —— 全部用
// shallowRef(+ triggerRef)(成员变更触发读取方重算;isOpen 本身是 Ref,computed 直接追踪到)。
const barRef = ref<HTMLElement | null>(null)
const items = shallowRef<MenuBarItemHandle[]>([])
const activeHandle = shallowRef<MenuBarItemHandle | null>(null)

/** 栏级 IsFlyoutOpen(MenuBar.cpp m_isFlyoutOpen 的响应式等价)。 */
const hasOpenFlyout = computed(() => items.value.some((item) => item.isOpen.value))

function registerItem(handle: MenuBarItemHandle): () => void {
  items.value.push(handle)
  triggerRef(items)
  return () => {
    const index = items.value.indexOf(handle)
    if (index >= 0) items.value.splice(index, 1)
    if (activeHandle.value === handle) activeHandle.value = null
    triggerRef(items)
  }
}

function setActive(handle: MenuBarItemHandle): void {
  activeHandle.value = handle
}

/** 可参与键盘协作的项(跳过禁用项),顺序 = 登记序。 */
function focusableItems(): MenuBarItemHandle[] {
  return items.value.filter((item) => !item.disabled() && item.element() !== null)
}

function requestOpen(handle: MenuBarItemHandle, focusLayer: boolean): void {
  for (const other of items.value) {
    if (other !== handle && other.isOpen.value) other.close(false)
  }
  handle.open(focusLayer)
}

function moveFocus(from: HTMLElement | null, direction: 1 | -1): void {
  const list = focusableItems()
  if (list.length === 0) return
  let index = list.findIndex((item) => item.element() === from)
  if (index < 0) index = direction === 1 ? -1 : 0 // 起点不可用:按方向取首/末为环起点
  const next = list[(index + direction + list.length) % list.length]
  if (!next) return
  setActive(next)
  next.element()?.focus()
}

function openNeighbor(from: MenuBarItemHandle, direction: 1 | -1): void {
  const list = focusableItems()
  if (list.length === 0) return
  let index = list.indexOf(from)
  if (index < 0) index = direction === 1 ? -1 : 0
  const next = list[(index + direction + list.length) % list.length]
  if (!next) return
  setActive(next)
  next.element()?.focus() // WinUI FocusAndReturnNextFocusableItem:先聚焦邻项
  next.open(true) // 再展开其下拉(键盘路径:焦点进层首项)
}

function focusEdge(target: 'first' | 'last'): void {
  const list = focusableItems()
  if (list.length === 0) return
  const next = target === 'first' ? list[0] : list[list.length - 1]
  if (!next) return
  setActive(next)
  next.element()?.focus()
}

/* -------------------------------------------------------------------------
 * F2 / Alt 进菜单栏(Web 侧补充;WinUI 对应 Access key scope 聚焦)
 * ---------------------------------------------------------------------- */

/** 本实例的控制器视图(供模块级仲裁表使用)。 */
const selfController: MenuBarController = {
  barElement: () => barRef.value,
  hasOpenFlyout: () => hasOpenFlyout.value,
  closeAllOpen: () => {
    for (const item of items.value) {
      if (item.isOpen.value) item.close(true)
    }
  },
  focusEntry: () => focusMenuBar(),
}

function registerController(): () => void {
  menuBarControllers.push(selfController)
  return () => {
    const index = menuBarControllers.indexOf(selfController)
    if (index >= 0) menuBarControllers.splice(index, 1)
  }
}

function focusMenuBar(): void {
  const bar = barRef.value
  if (!bar) return
  const active = document.activeElement
  if (active instanceof Node && bar.contains(active)) return // 焦点已在栏内:保持
  focusEdge('first')
}

function onDocumentKeydown(event: KeyboardEvent): void {
  const plainAlt = event.key === 'Alt' && !event.ctrlKey && !event.shiftKey && !event.metaKey
  if (event.key !== 'F2' && !plainAlt) return
  // 仲裁:有下拉打开的实例优先(收起,WinUI Alt 开合语义)→ 焦点所在的 → 首个实例
  const open = menuBarControllers.find((controller) => controller.hasOpenFlyout())
  let target = open
  if (!target) {
    const active = document.activeElement
    if (active instanceof Node) {
      target = menuBarControllers.find((controller) => {
        const element = controller.barElement()
        return element !== null && element.contains(active)
      })
    }
  }
  target = target ?? menuBarControllers[0] ?? null
  event.preventDefault() // Alt:阻止浏览器菜单栏/菜单环抢焦点(Firefox)
  event.stopImmediatePropagation() // 多实例仅首个收到事件的执行仲裁结果
  if (!target) return
  if (target.hasOpenFlyout()) target.closeAllOpen()
  else target.focusEntry()
}

onMounted(() => {
  document.addEventListener('keydown', onDocumentKeydown)
})

const unregisterController = registerController()
onScopeDispose(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('keydown', onDocumentKeydown)
  }
  unregisterController()
})

provide('wuiMenuBarContext', {
  items,
  activeHandle,
  registerItem,
  setActive,
  hasOpenFlyout,
  requestOpen,
  moveFocus,
  openNeighbor,
  focusEdge,
} satisfies MenuBarContext)
</script>

<template>
  <!-- LayoutRoot:整栏铺满(WinUI HorizontalAlignment=Stretch 的块级等价)、
       MinHeight=MenuBarHeight 40、背景透明(MenuBarBackground);IsTabStop=False ——
       栏自身 div 不设 tabindex,焦点由 MenuBarItem 承接 -->
  <div ref="barRef" class="wui-menu-bar" role="menubar" v-bind="$attrs">
    <slot />
  </div>
</template>

<style scoped>
/* LayoutRoot:MenuBarBackground = SubtleFillColorTransparentBrush;MinHeight = MenuBarHeight 40;
   ContentRoot 水平 StackPanel = flex 行布局,项靠左、随内容伸缩 */
.wui-menu-bar {
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 40px;
  background: transparent;
}
</style>
