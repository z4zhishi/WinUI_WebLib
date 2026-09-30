<script lang="ts">
// NavigationView —— WinUI NavigationView 的 Web 复刻:汉堡按钮 + 可开合导航窗格 + 页头的应用壳级导航容器。
// 视觉与状态规格(现代样式):CK/WinUI-Reference/controls/dev/NavigationView/NavigationView_themeresources.xaml
//   与 NavigationView.xaml(注意:平台 generic.xaml L1577+ 仅存旧版 reveal 时代资源,本组件按 controls 仓库的
//   WinUI 2.6+ 现代样式实现,见 wiki 差异节)。关键值:
//   - 汉堡按钮 PaneToggleButtonStyle:40x36、字形 \uE700 16px、ButtonHolderGrid margin 0,4;
//   - 紧凑栏 NavigationViewCompactPaneLength 48、展开窗格 OpenPaneLength 320、顶栏 NavigationViewTopPaneHeight 48;
//   - 左窗格项(NavigationViewItemPresenterStyleWhenOnLeftPane):MinHeight 36、ButtonMargin 4,2、
//     选中指示条(SelectionIndicator/"pill")3x16 圆角 2 高亮色(NavigationViewSelectionIndicatorForeground
//     ← AccentFillColorDefaultBrush → --wui-system-accent-color)、图标盒 40x16;
//   - 顶栏项:高 36、图标盒 16、pill 16x3 底部居中(margin 16,0,16,4)、选中态背景透明仅显 pill;
//   - 项四态背景:Normal 透明 / PointerOver Selected 系 SubtleFillColorSecondary / Pressed 系 Tertiary,
//     Web 以 SystemControlBackgroundListLow(#00000019)/ ListMedium(#00000033)近似(无 Subtle token,见 wiki);
//   - 页头 NavigationViewTitleHeaderContentControlTextStyle:28px SemiBold、NavigationViewHeaderMargin 56,44,0,0
//     (字号取最近似 token --wui-text-style-extra-large-font-size = 25.5px);
//   - 内容卡 ContentGrid:描边 1,1,0,0、圆角 8,0,0,0(左窗格系)/ 0,1,0,0、圆角 0(Top/Minimal),背景
//     NavigationViewContentBackground ← LayerFillColorDefaultBrush(无 token,Web 以透明近似)。
// 布局语义对照 NavigationView.xaml 模板:左窗格系内部即一台 SplitView(DisplayMode=Inline)+
//   PaneToggleButtonGrid(Z=100 顶层悬浮汉堡);Minimal 窗格浮层对应 SplitView Overlay(遮罩点击 / Esc / 轻扫关闭
//   由 SplitView 承载);Top 模式为 48px 顶栏(菜单项水平 + 页脚项右靠)。PaneDisplayMode=Auto 按容器宽度
//   ResizeObserver 断点解析(≥ ExpandedModeThresholdWidth 1008 → Left,≥ CompactModeThresholdWidth 641 →
//   LeftCompact,否则 LeftMinimal;WinUI 默认阈值,Web 以容器宽代替窗口宽)。
// 交互:itemInvoked / selectionChanged(WinUI 同名事件)、IsPaneOpen 双向绑定、选中指示条、子项展开
//   (chevron 旋转取 animations.css token)、Esc 关浮层窗格(经 SplitView Overlay)。
import { computed, defineComponent, h, inject, onBeforeUnmount, onMounted, provide, ref, useAttrs, useSlots, watch } from 'vue'
import type { InjectionKey, PropType, VNode } from 'vue'
import FontIcon from './FontIcon.vue'
import WuiSplitView from './SplitView.vue'

/** 数据驱动的菜单项模型(对应 NavigationViewItem / NavigationViewItemHeader / NavigationViewItemSeparator)。 */
export interface NavigationViewItemData {
  /** 选中标识与唯一键(header / separator 可省略)。 */
  tag?: string | number
  /** 文本(WinUI Content)。 */
  label?: string
  /** 图标字形(FontIcon glyph,可省略;省略时按 WinUI IconCollapsed 规则收缩图标列)。 */
  icon?: string
  /** 组头(NavigationViewItemHeader)。 */
  isHeader?: boolean
  /** 分隔线(NavigationViewItemSeparator)。 */
  isSeparator?: boolean
  /** 子项(展开;仅数据驱动模式支持,slot 模式请自行嵌套布局)。 */
  children?: NavigationViewItemData[]
  /** 点击是否参与选中(WinUI SelectsOnInvoked,默认 true;false 时仅展开子树不选中)。 */
  selectsOnInvoked?: boolean
  /** 禁用(Opacity 0.55,对照 ListViewItemDisabledThemeOpacity)。 */
  disabled?: boolean
}

/** 事件回执里的条目引用(itemInvoked / selectionChanged 共用)。 */
export interface NavigationViewItemRef {
  tag: string | number
  label: string
}

/** WinUI NavigationViewItemInvokedEventArgs 的 Web 形态。 */
export interface NavigationViewInvokeArgs {
  item: NavigationViewItemRef
  tag: string | number
  label: string
}

/** WinUI NavigationViewSelectionChangedEventArgs 的 Web 形态(SelectedItem 以 tag 值标识)。 */
export interface NavigationViewSelectionChangedArgs {
  tag: string | number | null
  label: string
}

interface NavigationViewContext {
  isSelected: (tag: string | number) => boolean
  invoke: (entry: { tag: string | number; label: string; selectsOnInvoked: boolean; hasChildren: boolean }) => void
  requestOpenPane: () => void
  register: (tag: string | number | undefined, label: string) => void
  unregister: (tag: string | number | undefined) => void
}

const NAVIGATION_VIEW_CONTEXT: InjectionKey<NavigationViewContext> = Symbol('wui-navigation-view')

/**
 * NavigationViewItem —— WinUI NavigationViewItem 的 Web 复刻。
 * 单独导出供 #menu-items / #footer-menu-items slot 使用;NavigationView 数据驱动模式内部亦复用本组件渲染。
 * 经 provide/inject 与宿主 NavigationView 通信(选中态、invoke、注册),脱离宿主可渲染但点击无效果。
 * 样式由宿主 NavigationView 的 :deep 规则提供(类名 wui-nav-item 系列),本组件不携带样式。
 */
export const WuiNavigationViewItem = defineComponent({
  name: 'WuiNavigationViewItem',
  props: {
    /** 数据驱动入口(推荐;提供后忽略下列散装 props)。 */
    entry: { type: Object as PropType<NavigationViewItemData>, default: undefined },
    /** 散装用法:选中标识(必填才有选中能力)。 */
    tag: { type: [String, Number] as PropType<string | number>, default: undefined },
    /** 散装用法:文本。 */
    label: { type: String, default: '' },
    /** 散装用法:图标字形。 */
    icon: { type: String, default: undefined },
    /** 散装用法:禁用。 */
    disabled: { type: Boolean, default: false },
    /** 散装用法:点击是否参与选中。 */
    selectsOnInvoked: { type: Boolean, default: undefined },
    /** 层级深度(子项由组件内部递归时自增)。 */
    depth: { type: Number, default: 0 },
  },
  // 显式返回类型:组件渲染中自递归引用自身,注解断开 TS7022/7024 类型循环
  setup(itemProps): () => VNode {
    const ctx = inject(NAVIGATION_VIEW_CONTEXT, null)
    const expanded = ref(false)

    const viewTag = computed<string | number | undefined>(() =>
      itemProps.entry ? itemProps.entry.tag : itemProps.tag,
    )
    const viewLabel = computed<string>(() => (itemProps.entry ? itemProps.entry.label ?? '' : itemProps.label))
    const viewIcon = computed<string | undefined>(() => (itemProps.entry ? itemProps.entry.icon : itemProps.icon))
    const viewDisabled = computed<boolean>(() =>
      itemProps.entry ? itemProps.entry.disabled === true : itemProps.disabled,
    )
    const viewSelects = computed<boolean>(() => {
      const raw = itemProps.entry ? itemProps.entry.selectsOnInvoked : itemProps.selectsOnInvoked
      return raw !== false
    })
    const viewChildren = computed<NavigationViewItemData[]>(() => itemProps.entry?.children ?? [])
    const hasChildren = computed<boolean>(() => viewChildren.value.length > 0)
    const selectable = computed<boolean>(() => viewTag.value !== undefined)

    // 注册到宿主:供程序化选中(v-model:selectedItem)时回查 label
    onMounted(() => ctx?.register(viewTag.value, viewLabel.value))
    onBeforeUnmount(() => ctx?.unregister(viewTag.value))

    function onRowClick(): void {
      if (viewDisabled.value) return
      // WinUI:点击带子项的条目先展开/收起子树(chevron 单独命中目标时仅展开)
      if (hasChildren.value) expanded.value = !expanded.value
      if (!selectable.value) return
      ctx?.invoke({
        tag: viewTag.value as string | number,
        label: viewLabel.value,
        selectsOnInvoked: viewSelects.value,
        hasChildren: hasChildren.value,
      })
    }

    function onChevronClick(event: MouseEvent): void {
      event.stopPropagation()
      if (viewDisabled.value) return
      expanded.value = !expanded.value
      // 紧凑栏 / 关闭窗格中点开子树:先把窗格带开(WinUI ClosedCompact 行为的近似)
      ctx?.requestOpenPane()
    }

    return () => {
      const entry = itemProps.entry
      if (entry?.isSeparator) {
        return h('div', { class: 'wui-nav-separator', role: 'separator' })
      }
      if (entry?.isHeader) {
        return h('div', { class: 'wui-nav-header' }, viewLabel.value)
      }

      const selected = selectable.value && ctx ? ctx.isSelected(viewTag.value as string | number) : false
      const row = h(
        'button',
        {
          type: 'button',
          class: [
            'wui-nav-item',
            {
              'wui-nav-item--selected': selected,
              'wui-nav-item--disabled': viewDisabled.value,
              'wui-nav-item--expandable': hasChildren.value,
            },
          ],
          style: itemProps.depth > 0 ? { paddingInlineStart: `${itemProps.depth * 16}px` } : undefined,
          disabled: viewDisabled.value || undefined,
          'aria-current': selected ? 'page' : undefined,
          'aria-expanded': hasChildren.value ? expanded.value : undefined,
          onClick: onRowClick,
        },
        [
          // 选中指示条(NavigationViewItemPill/SelectionIndicator):左窗格 3x16、顶栏 16x3,由宿主按模式定形
          h('span', { class: 'wui-nav-item__pill', 'aria-hidden': 'true' }),
          viewIcon.value
            ? h(FontIcon, { glyph: viewIcon.value, fontSize: 16, class: 'wui-nav-item__iconbox' })
            : h('span', { class: 'wui-nav-item__iconbox wui-nav-item__iconbox--empty', 'aria-hidden': 'true' }),
          h('span', { class: 'wui-nav-item__label' }, viewLabel.value),
          hasChildren.value
            ? h(
                'span',
                {
                  class: 'wui-nav-item__chevron',
                  'aria-hidden': 'true',
                  onClick: onChevronClick,
                },
                h(FontIcon, {
                  glyph: '\uE70D',
                  fontSize: 8,
                  class: ['wui-nav-item__chevron-icon', { 'wui-nav-item__chevron-icon--open': expanded.value }],
                }),
              )
            : null,
        ],
      )
      if (!hasChildren.value) return row
      return h('div', { class: 'wui-nav-item-wrap' }, [
        row,
        expanded.value
          ? h(
              'div',
              { class: 'wui-nav-item__children' },
              viewChildren.value.map((child) =>
                h(WuiNavigationViewItem, {
                  key: String(child.tag ?? child.label),
                  entry: child,
                  depth: itemProps.depth + 1,
                }),
              ),
            )
          : null,
      ])
    }
  },
})
</script>

<script setup lang="ts">
// NavigationView 宿主:模式解析(Auto 断点)、汉堡按钮、窗格内容(标题/菜单/页脚)、选中模型、事件。
// (CSS import 置于本块:普通 <script> 块中的 CSS import 经 SFC 编译提升后相对路径会解析失败)
import '../styles/animations.css'
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 窗格展示模式(WinUI PaneDisplayMode);Auto 按容器宽度断点解析(默认阈值 1008/641)。 */
    paneDisplayMode?: 'Auto' | 'Left' | 'Top' | 'LeftCompact' | 'LeftMinimal'
    /** 展开态窗格宽度 px(WinUI OpenPaneLength)。 */
    openPaneLength?: number
    /** 紧凑栏宽度 px(WinUI CompactPaneLength)。 */
    compactPaneLength?: number
    /** Auto 模式:≥ 该宽度用 Left 展开窗格(WinUI ExpandedModeThresholdWidth 默认 1008)。 */
    expandedModeThresholdWidth?: number
    /** Auto 模式:≥ 该宽度用 LeftCompact,否则 LeftMinimal(WinUI CompactModeThresholdWidth 默认 641)。 */
    compactModeThresholdWidth?: number
    /** 页头文本(WinUI Header;富内容用 #header slot)。 */
    header?: string
    /** 窗格标题(WinUI PaneTitle)。 */
    paneTitle?: string
    /** 数据驱动菜单项;提供 #menu-items slot 时被 slot 覆盖。 */
    menuItems?: NavigationViewItemData[]
    /** 数据驱动页脚菜单项(Top 模式右靠);提供 #footer-menu-items slot 时被 slot 覆盖。 */
    footerMenuItems?: NavigationViewItemData[]
    /** 窗格背景色(WinUI PaneBackground),任意 CSS 颜色;空串用默认 token。 */
    paneBackground?: string
    /** 浮层窗格的无障碍名(Minimal 模式窗格 role="dialog" 的 aria-label)。 */
    paneLabel?: string
  }>(),
  {
    paneDisplayMode: 'Auto',
    openPaneLength: 320,
    compactPaneLength: 48,
    expandedModeThresholdWidth: 1008,
    compactModeThresholdWidth: 641,
    header: '',
    paneTitle: '',
    menuItems: () => [],
    footerMenuItems: () => [],
    paneBackground: '',
    paneLabel: '',
  },
)

// —— IsPaneOpen / SelectedItem 双向绑定(WinUI IsPaneOpen / SelectedItem;后者以 tag 值标识选中项)——
const isPaneOpen = defineModel<boolean>('isPaneOpen', { default: true })
const selectedItem = defineModel<string | number | null>('selectedItem', { default: null })

const emit = defineEmits<{
  itemInvoked: [args: NavigationViewInvokeArgs]
  selectionChanged: [args: NavigationViewSelectionChangedArgs]
  paneOpened: []
  paneClosing: []
  paneClosed: []
}>()

const attrs = useAttrs()
const slots = useSlots()

// —— 模式解析(Auto → 容器宽度断点;WinUI 以窗口宽度 + AdaptiveTrigger,Web 以容器等价替代)——
const rootRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
let observer: ResizeObserver | undefined

const resolvedPaneMode = computed<'Left' | 'LeftCompact' | 'LeftMinimal' | 'Top'>(() => {
  switch (props.paneDisplayMode) {
    case 'Top':
      return 'Top'
    case 'Left':
      return 'Left'
    case 'LeftCompact':
      return 'LeftCompact'
    case 'LeftMinimal':
      return 'LeftMinimal'
    default:
      if (containerWidth.value >= props.expandedModeThresholdWidth) return 'Left'
      if (containerWidth.value >= props.compactModeThresholdWidth) return 'LeftCompact'
      return 'LeftMinimal'
  }
})

const isTop = computed(() => resolvedPaneMode.value === 'Top')

/** 传给内嵌 SplitView 的展示模式:Left=Inline(推挤)/ LeftCompact=CompactInline(紧凑栏)/ LeftMinimal=Overlay(浮层)。 */
const splitDisplayMode = computed<'Inline' | 'CompactInline' | 'Overlay'>(() => {
  switch (resolvedPaneMode.value) {
    case 'LeftCompact':
      return 'CompactInline'
    case 'LeftMinimal':
      return 'Overlay'
    default:
      return 'Inline'
  }
})

/** 紧凑栏收拢态:隐藏标签 / 窗格标题等,仅留图标栏(对照源 ClosedCompact 态 ListSizeCompact setter 组)。 */
const isCompactClosed = computed(() => resolvedPaneMode.value === 'LeftCompact' && !isPaneOpen.value)

// Minimal↔其他模式切换时的窗格开合记忆(对照 WinUI:进 Minimal 关窗格,退出恢复)
let paneOpenBeforeMinimal = false
watch(resolvedPaneMode, (mode, prev) => {
  if (mode === prev) return
  const enteringMinimal = mode === 'LeftMinimal' && prev !== 'LeftMinimal'
  const leavingMinimal = prev === 'LeftMinimal' && mode !== 'LeftMinimal'
  if (enteringMinimal) {
    paneOpenBeforeMinimal = isPaneOpen.value
    if (isPaneOpen.value) isPaneOpen.value = false
  } else if (leavingMinimal && paneOpenBeforeMinimal) {
    isPaneOpen.value = true
    paneOpenBeforeMinimal = false
  }
})

onMounted(() => {
  const el = rootRef.value
  if (el) {
    containerWidth.value = el.clientWidth
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect
        if (rect) containerWidth.value = rect.width
      })
      observer.observe(el)
    }
  }
  // 初始即处于 Minimal(窄容器 / 显式 LeftMinimal):窗格默认收起(WinUI 同)
  if (resolvedPaneMode.value === 'LeftMinimal' && isPaneOpen.value) isPaneOpen.value = false
})

onBeforeUnmount(() => observer?.disconnect())

// —— 选中标签回查(数据项 + slot 项注册表)——
const dataLabels = computed<Map<string | number, string>>(() => {
  const map = new Map<string | number, string>()
  const walk = (items: NavigationViewItemData[]): void => {
    for (const item of items) {
      if (item.tag !== undefined) map.set(item.tag, item.label ?? '')
      if (item.children) walk(item.children)
    }
  }
  walk(props.menuItems)
  walk(props.footerMenuItems)
  return map
})
const slotLabels = ref(new Map<string | number, string>())

function labelFor(tag: string | number | null): string {
  if (tag === null) return ''
  return dataLabels.value.get(tag) ?? slotLabels.value.get(tag) ?? ''
}

// —— 条目调用:事件次序对照 WinUI(先 ItemInvoked,选中实际变化时再 SelectionChanged)——
function onItemInvoked(entry: { tag: string | number; label: string; selectsOnInvoked: boolean; hasChildren: boolean }): void {
  emit('itemInvoked', { item: { tag: entry.tag, label: entry.label }, tag: entry.tag, label: entry.label })
  // 紧凑栏收拢时点带子项的条目:先展开窗格(WinUI ClosedCompact 行为近似)
  if (isCompactClosed.value && entry.hasChildren) isPaneOpen.value = true
  if (entry.selectsOnInvoked) selectedItem.value = entry.tag
}

watch(selectedItem, (tag) => {
  emit('selectionChanged', { tag, label: labelFor(tag) })
})

// —— 宿主上下文(供 NavigationViewItem 注入)——
provide(NAVIGATION_VIEW_CONTEXT, {
  isSelected: (tag) => selectedItem.value !== null && tag === selectedItem.value,
  invoke: onItemInvoked,
  requestOpenPane: () => {
    if (!isTop.value && !isPaneOpen.value) isPaneOpen.value = true
  },
  register: (tag, label) => {
    if (tag === undefined) return
    const next = new Map(slotLabels.value)
    next.set(tag, label)
    slotLabels.value = next
  },
  unregister: (tag) => {
    if (tag === undefined) return
    const next = new Map(slotLabels.value)
    next.delete(tag)
    slotLabels.value = next
  },
})

function togglePane(): void {
  isPaneOpen.value = !isPaneOpen.value
}

const hasFooterMenu = computed(
  () => props.footerMenuItems.length > 0 || slots['footer-menu-items'] !== undefined,
)
</script>

<template>
  <div
    v-bind="attrs"
    ref="rootRef"
    class="wui-navview"
    :class="{
      'wui-navview--top': isTop,
      'wui-navview--minimal': resolvedPaneMode === 'LeftMinimal',
      'wui-navview--compact-closed': isCompactClosed,
    }"
  >
    <!-- ============ Top 模式:48px 顶栏 + 内容卡 ============ -->
    <template v-if="isTop">
      <div class="wui-navview__topbar">
        <span v-if="paneTitle" class="wui-navview__topbar-title">{{ paneTitle }}</span>
        <nav class="wui-navview__topbar-items" aria-label="主导航">
          <slot name="menu-items">
            <WuiNavigationViewItem
              v-for="(entry, index) in menuItems"
              :key="String(entry.tag ?? entry.label ?? index)"
              :entry="entry"
            />
          </slot>
        </nav>
        <div class="wui-navview__topbar-spring" aria-hidden="true"></div>
        <nav v-if="hasFooterMenu" class="wui-navview__topbar-footer" aria-label="页脚导航">
          <slot name="footer-menu-items">
            <WuiNavigationViewItem
              v-for="(entry, index) in footerMenuItems"
              :key="String(entry.tag ?? entry.label ?? index)"
              :entry="entry"
            />
          </slot>
        </nav>
      </div>
      <div class="wui-navview__content">
        <div v-if="header || $slots.header" class="wui-navview__header">
          <slot name="header">{{ header }}</slot>
        </div>
        <div class="wui-navview__body">
          <slot />
        </div>
      </div>
    </template>

    <!-- ============ 左窗格系(Left / LeftCompact / LeftMinimal / Auto 解析值)============ -->
    <template v-else>
      <!-- 汉堡按钮(PaneToggleButtonGrid,Z 顶层悬浮):40x36、\uE700 16px、Holder margin 0,4 -->
      <button
        type="button"
        class="wui-navview__toggle"
        :aria-expanded="isPaneOpen"
        aria-label="展开或折叠窗格"
        @click="togglePane"
      >
        <FontIcon glyph="&#xE700;" :font-size="16" />
      </button>

      <WuiSplitView
        v-model:is-pane-open="isPaneOpen"
        class="wui-navview__split"
        :display-mode="splitDisplayMode"
        pane-placement="Left"
        :open-pane-length="openPaneLength"
        :compact-pane-length="compactPaneLength"
        :pane-background="paneBackground"
        :pane-label="paneLabel || paneTitle"
        @pane-opened="emit('paneOpened')"
        @pane-closing="emit('paneClosing')"
        @pane-closed="emit('paneClosed')"
      >
        <template #pane>
          <!-- 窗格内容(PaneContentGrid:顶部为汉堡行留白 44px,下接菜单 / PaneFooter / 页脚菜单) -->
          <div class="wui-navview__pane">
            <div v-if="paneTitle" class="wui-navview__pane-header">
              <span class="wui-navview__pane-title">{{ paneTitle }}</span>
            </div>
            <nav class="wui-navview__menu" aria-label="主导航">
              <slot name="menu-items">
                <WuiNavigationViewItem
                  v-for="(entry, index) in menuItems"
                  :key="String(entry.tag ?? entry.label ?? index)"
                  :entry="entry"
                />
              </slot>
            </nav>
            <div v-if="$slots['pane-footer']" class="wui-navview__pane-footer">
              <slot name="pane-footer" />
            </div>
            <nav v-if="hasFooterMenu" class="wui-navview__footer-menu" aria-label="页脚导航">
              <slot name="footer-menu-items">
                <WuiNavigationViewItem
                  v-for="(entry, index) in footerMenuItems"
                  :key="String(entry.tag ?? entry.label ?? index)"
                  :entry="entry"
                />
              </slot>
            </nav>
          </div>
        </template>

        <!-- 内容卡(ContentGrid:描边 1,1,0,0 / 圆角 8,0,0,0,Minimal 收窄为 0,1,0,0 / 0) -->
        <div class="wui-navview__content">
          <div v-if="header || $slots.header" class="wui-navview__header">
            <slot name="header">{{ header }}</slot>
          </div>
          <div class="wui-navview__body">
            <slot />
          </div>
        </div>
      </WuiSplitView>
    </template>
  </div>
</template>

<style scoped>
/*
 * 结构对照 controls/dev/NavigationView/NavigationView.xaml 模板 + themeresources 现代样式:
 * PaneToggleButtonGrid(Z=100 悬浮汉堡)/ RootSplitView(Inline 承载窗格与内容)/ ContentGrid 内容卡 /
 * TopNavArea(Top 模式 48px 顶栏)。颜色 / 圆角 / 时长一律 --wui-* token;无 token 项见 wiki 差异节。
 */
.wui-navview {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--wui-application-foreground-theme);
}

/* ============ 汉堡按钮(PaneToggleButtonStyle:40x36,\uE700 16px,Subtle 悬停)============ */
.wui-navview__toggle {
  position: absolute;
  top: 4px; /* ButtonHolderGrid margin 0,4 */
  left: 4px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px; /* PaneToggleButtonWidth */
  height: 36px; /* PaneToggleButtonHeight */
  padding: 0;
  font: inherit;
  color: var(--wui-application-foreground-theme);
  background: transparent;
  border: 0;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.wui-navview__toggle:hover {
  background: var(--wui-system-control-background-list-low);
}

.wui-navview__toggle:active {
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-list-medium);
}

.wui-navview__toggle:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

/* ============ 左窗格系:SplitView 承载 ============ */
.wui-navview__split {
  flex: 1 1 auto;
  min-height: 0;
}

/* 窗格内容:顶部 44px 留白(4 + 36 汉堡行,NavigationViewPaneHeaderRowMinHeight 40 系) */
.wui-navview__pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-top: 44px;
  overflow: hidden;
}

.wui-navview__pane-header {
  display: flex;
  align-items: center;
  flex: none;
  min-height: 40px;
  padding: 0 16px; /* NavigationViewItemInnerHeaderMargin 16,0 */
}

.wui-navview__pane-title {
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600; /* NavigationViewItemHeaderTextStyle */
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wui-navview__menu {
  flex: 1 1 auto;
  min-height: 0;
  padding-bottom: 8px;
  overflow-x: hidden;
  overflow-y: auto;
}

.wui-navview__pane-footer {
  flex: none;
  padding: 4px 16px 8px;
}

.wui-navview__footer-menu {
  flex: none;
  padding: 4px 0;
  overflow-x: hidden;
}

/* 紧凑栏收拢:标题 / 标签 / 箭头 / 组头隐藏,仅留图标栏(ClosedCompact + ListSizeCompact setter 组) */
.wui-navview--compact-closed .wui-navview__pane-header,
.wui-navview--compact-closed .wui-navview__pane-footer,
.wui-navview--compact-closed :deep(.wui-nav-item__label),
.wui-navview--compact-closed :deep(.wui-nav-item__chevron),
.wui-navview--compact-closed :deep(.wui-nav-header) {
  visibility: hidden;
}

/* ============ Top 模式顶栏(TopNavArea:高 48、margin 4,0、分隔线)============ */
.wui-navview__topbar {
  display: flex;
  align-items: center;
  flex: none;
  height: 48px; /* NavigationViewTopPaneHeight */
  margin: 0 4px; /* TopNavigationViewTopNavGridMargin 4,0 */
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.wui-navview__topbar-title {
  margin: 0 14px 0 12px; /* TopNavigationViewItemInnerHeaderMargin 12,0 系 */
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wui-navview__topbar-items {
  display: flex;
  align-items: center;
  min-width: 0;
}

.wui-navview__topbar-spring {
  flex: 1 1 auto;
}

.wui-navview__topbar-footer {
  display: flex;
  align-items: center;
  flex: none;
}

/* ============ 内容卡(ContentGrid:背景 Layer / 描边 1,1,0,0 / 圆角 8,0,0,0)============ */
.wui-navview__content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  border-top: 1px solid var(--wui-system-control-background-base-low);
  border-left: 1px solid var(--wui-system-control-background-base-low);
  border-top-left-radius: 8px; /* NavigationViewContentGridCornerRadius 8,0,0,0 */
}

.wui-navview--top .wui-navview__content,
.wui-navview--minimal .wui-navview__content {
  /* Top/Minimal:TopNavigationViewContentGridBorderThickness 0,1,0,0 + 圆角 0 */
  border-left: 0;
  border-top-left-radius: 0;
}

/* 页头(NavigationViewTitleHeaderContentControlTextStyle:28px SemiBold;字号取最近似 token) */
.wui-navview__header {
  flex: none;
  min-height: 36px; /* PaneToggleButtonHeight 基线 */
  margin: 44px 24px 0 56px; /* NavigationViewHeaderMargin 56,44,0,0 */
  font-size: var(--wui-text-style-extra-large-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.wui-navview--minimal .wui-navview__header {
  /* Minimal 抬头左移贴近汉堡(NavigationViewMinimalHeaderMargin -24,44,0,0 的 Web 近似) */
  margin: 44px 24px 0 12px;
}

.wui-navview__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

/* ======================================================================
 * 菜单项(NavigationViewItemPresenter):内部数据驱动与 slot 注入的条目共用。
 * 元素由子组件 WuiNavigationViewItem 渲染,统一以 :deep 命中。
 * ====================================================================== */

.wui-navview :deep(.wui-nav-item) {
  position: relative;
  display: flex;
  align-items: center;
  width: calc(100% - 8px);
  min-height: 36px; /* NavigationViewItemOnLeftMinHeight */
  margin: 2px 4px; /* NavigationViewItemButtonMargin 4,2 */
  padding: 0;
  font: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  text-align: left;
  white-space: nowrap;
  background: transparent; /* NavigationViewItemBackground(透明) */
  border: 1px solid transparent; /* NavigationViewItemBorderThickness 1(透明) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius 4px */
  cursor: pointer;
}

/* PointerOver / Pressed / Selected 四态(Subtle 系 → ListLow/ListMedium 近似,见 wiki) */
.wui-navview :deep(.wui-nav-item:hover) {
  background: var(--wui-system-control-background-list-low);
}

.wui-navview :deep(.wui-nav-item:active) {
  color: var(--wui-application-secondary-foreground-theme); /* Pressed 前景 TextFillColorSecondary */
  background: var(--wui-system-control-background-list-medium);
}

.wui-navview :deep(.wui-nav-item:focus-visible) {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-navview :deep(.wui-nav-item--selected) {
  background: var(--wui-system-control-background-list-low); /* Selected:SubtleFillColorSecondary */
}

.wui-navview :deep(.wui-nav-item--selected:hover) {
  background: var(--wui-system-control-background-list-medium); /* SelectedPointerOver:Tertiary */
}

.wui-navview :deep(.wui-nav-item--selected:active) {
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-list-low); /* SelectedPressed:Secondary(回落) */
}

.wui-navview :deep(.wui-nav-item:disabled) {
  opacity: 0.55; /* ListViewItemDisabledThemeOpacity */
  background: transparent;
  cursor: default;
}

/* 选中指示条(SelectionIndicator / "pill"):3x16、圆角 2、高亮色,选中淡入 */
.wui-navview :deep(.wui-nav-item__pill) {
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px; /* NavigationViewSelectionIndicatorWidth */
  height: 16px; /* NavigationViewSelectionIndicatorHeight */
  border-radius: 2px; /* NavigationViewSelectionIndicatorRadius */
  background: var(--wui-system-accent-color); /* ← AccentFillColorDefaultBrush */
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity var(--wui-duration-fast) var(--wui-easing-standard);
}

.wui-navview :deep(.wui-nav-item--selected .wui-nav-item__pill) {
  opacity: 1;
}

/* 图标盒(NavigationViewIconBoxWidth 40 x IconBoxHeight 16;无图标收缩为 8 宽列) */
.wui-navview :deep(.wui-nav-item__iconbox) {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 16px;
}

.wui-navview :deep(.wui-nav-item__iconbox--empty) {
  width: 8px; /* IconCollapsed 态 IconColumn.Width */
}

.wui-navview :deep(.wui-nav-item__label) {
  flex: 1 1 auto;
  margin-right: 14px; /* ContentGrid 右缘 14(ContentPresenterMargin 4,-1,8,-1 系) */
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 展开箭头(ExpandCollapseChevron:\uE70D 8px,展开旋转 180°) */
.wui-navview :deep(.wui-nav-item__chevron) {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  height: 36px;
  margin-right: -14px;
  background: transparent;
}

.wui-navview :deep(.wui-nav-item__chevron-icon) {
  transition: transform var(--wui-duration-fast) var(--wui-easing-standard);
}

.wui-navview :deep(.wui-nav-item__chevron-icon--open) {
  transform: rotate(180deg);
}

.wui-navview :deep(.wui-nav-item__children) {
  padding-bottom: 4px;
}

/* 组头(NavigationViewItemHeader:14px SemiBold,Secondary 前景,高 40) */
.wui-navview :deep(.wui-nav-header) {
  display: flex;
  align-items: center;
  min-height: 40px;
  margin: 0 16px;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

/* 分隔线(NavigationViewItemSeparator:1px,margin 0,3,0,4) */
.wui-navview :deep(.wui-nav-separator) {
  height: 1px;
  margin: 3px 4px 4px;
  background: var(--wui-system-control-background-base-low);
}

/* —— Top 模式条目覆写(高度 36、图标盒 16、pill 16x3 底部居中、选中态透明背景)—— */
.wui-navview--top :deep(.wui-nav-item) {
  width: auto;
  margin: 0 2px;
}

.wui-navview--top :deep(.wui-nav-item__iconbox) {
  width: 16px;
  margin-left: 12px;
}

.wui-navview--top :deep(.wui-nav-item__iconbox--empty) {
  width: 0;
  margin-left: 12px;
}

.wui-navview--top :deep(.wui-nav-item__label) {
  margin: 0 12px 0 8px; /* TopNavigationViewItemContentPresenterMargin 8,-1,12,-1 */
}

.wui-navview--top :deep(.wui-nav-item__pill) {
  top: auto;
  bottom: 4px;
  left: 50%;
  width: 16px;
  height: 3px;
  transform: translateX(-50%);
}

.wui-navview--top :deep(.wui-nav-item--selected) {
  background: transparent; /* TopNavigationViewItemBackgroundSelected = 透明,仅 pill */
}

.wui-navview--top :deep(.wui-nav-item--selected:hover) {
  background: var(--wui-system-control-background-list-low);
}

.wui-navview--top :deep(.wui-nav-item--selected:active) {
  color: var(--wui-application-secondary-foreground-theme);
  background: transparent;
}

.wui-navview--top :deep(.wui-nav-header) {
  margin: 0 12px;
}

.wui-navview--top :deep(.wui-nav-separator) {
  height: 24px;
  width: 1px;
  margin: 0 3px 0 4px;
}

@media (prefers-reduced-motion: reduce) {
  .wui-navview :deep(.wui-nav-item__pill),
  .wui-navview :deep(.wui-nav-item__chevron-icon) {
    transition-duration: 0.01ms;
  }
}
</style>
