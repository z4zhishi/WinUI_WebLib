<script lang="ts">
// NavigationView —— WinUI NavigationView 的 Web 复刻:汉堡按钮 + 可开合导航窗格 + 页头的应用壳级导航容器。
// 视觉与状态规格(现代样式):CK/WinUI-Reference/controls/dev/NavigationView/NavigationView_themeresources.xaml
//   与 NavigationView.xaml(注意:平台 generic.xaml L1577+ 仅存旧版 reveal 时代资源,本组件按 controls 仓库的
//   WinUI 2.6+ 现代样式实现,见 wiki 差异节)。关键值:
//   - 汉堡按钮 PaneToggleButtonStyle:模板根 Grid 两列 [Auto: Border Width=40 内 16×16 AnimatedIcon]
//     [*: ContentPresenter Padding 4,0,0,0],行高 PaneToggleButtonHeight 36、字形 \uE700 16px、
//     LayoutRoot 外边距 NavigationViewItemButtonMargin(4,2);PaneTitle 是该按钮的 Content
//     (NavigationView.xaml L205-207)→ **与 ☰ 同一行、40px 图标格右侧垂直居中**(x=48);窗格展开且
//     PaneTitle 非空时按钮宽 = OpenPaneLength(源 UpdatePaneToggleSize),收起/紧凑态仅留 40px 图标格;
//     窗格首行让出 PaneHeaderContentBorderRow MinHeight 40 后即为菜单(NavigationViewPaneHeaderRowMinHeight);
//   - 紧凑栏 NavigationViewCompactPaneLength 48、展开窗格 OpenPaneLength 320、顶栏 NavigationViewTopPaneHeight 48;
//   - 左窗格项(NavigationViewItemPresenterStyleWhenOnLeftPane):MinHeight 36、ButtonMargin 4,2、
//     选中指示条(SelectionIndicator/"pill")3x16 圆角 2 高亮色(NavigationViewSelectionIndicatorForeground
//     = AccentFillColorDefaultBrush → --wui-accent-fill-color-default)、图标盒 40x16;
//   - 顶栏项:高 36、图标盒 16、pill 16x3 底部居中(margin 16,0,16,4)、选中态背景透明仅显 pill;
//   - 项四态背景(PL11 重定向到 Fluent):Normal/Disabled/Checked = SubtleFillColorTransparent、
//     PointerOver/Selected = SubtleFillColorSecondary、Pressed/SelectedPointerOver = SubtleFillColorTertiary;
//     前景 Primary/Secondary/Disabled = TextFillColorPrimary/Secondary/Disabled;
//   - 页头 NavigationViewTitleHeaderContentControlTextStyle:28px SemiBold、NavigationViewHeaderMargin 56,44,0,0
//     (字号取最近似 token --wui-text-style-extra-large-font-size = 25.5px);
//   - 内容卡 ContentGrid(PL11 重定向):背景 LayerFillColorDefaultBrush = --wui-layer-fill-color-default、
//     描边 CardStrokeColorDefaultBrush = --wui-card-stroke-color-default、分隔线 DividerStrokeColorDefaultBrush、
//     圆角 8,0,0,0(左窗格系)/ 0,1,0,0、圆角 0(Top/Minimal);
//   - 窗格底(PL11):Inline = NavigationViewExpandedPaneBackground = SolidBackgroundFillColorTransparent(透明)、
//     Overlay(Minimal)= NavigationViewDefaultPaneBackground = AcrylicInAppFillColorDefaultBrush(web 取
//     不透明回退 #F9F9F9/#2C2C2C)。
// 布局语义对照 NavigationView.xaml 模板:左窗格系内部即一台 SplitView(DisplayMode=Inline)+
//   PaneToggleButtonGrid(Z=100 顶层悬浮汉堡);Minimal 窗格浮层对应 SplitView Overlay(遮罩点击 / Esc / 轻扫关闭
//   由 SplitView 承载);Top 模式为 48px 顶栏(菜单项水平 + 页脚项右靠)。PaneDisplayMode=Auto 按容器宽度
//   ResizeObserver 断点解析(≥ ExpandedModeThresholdWidth 1008 → Left,≥ CompactModeThresholdWidth 641 →
//   LeftCompact,否则 LeftMinimal;WinUI 默认阈值,Web 以容器宽代替窗口宽)。
// 交互:itemInvoked / selectionChanged(WinUI 同名事件)、IsPaneOpen 双向绑定、选中指示条、子项展开
//   (chevron 旋转取 animations.css token)、Esc 关浮层窗格(经 SplitView Overlay)、方向键 roving
//   focus(左窗格 ↑/↓、Top ←/→,MR6/P2-1,见 onNavRootKeyDown 注)。
import { computed, defineComponent, h, inject, nextTick, onBeforeUnmount, onMounted, provide, ref, useAttrs, useSlots, watch } from 'vue'
import type { InjectionKey, PropType, VNode } from 'vue'
import FontIcon from './FontIcon.vue'
import WuiSplitView from './SplitView.vue'
import { prefersReducedMotion } from '../composables/useReducedMotion'

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
          // 选中指示条自 A9 起由宿主的共享 .wui-navview__indicator 承载(600ms Scale+Offset
          // 编排需跨条目位移,逐项 pill 无法表达;脱离宿主时本组件无选中视觉,同源行为)
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
// 亚克力材质共享层(NavigationViewDefaultPaneBackground = AcrylicInAppFillColorDefaultBrush,
// Overlay 窗格;PL20)
import '../styles/acrylic.css'
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
    /** 主导航 nav 地标的无障碍名;同页多个 NavigationView 时应传入区分性文案。 */
    menuNavLabel?: string
    /** 页脚导航 nav 地标的无障碍名;同页多个 NavigationView 时应传入区分性文案。 */
    footerNavLabel?: string
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
    menuNavLabel: '主导航',
    footerNavLabel: '页脚导航',
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

/**
 * PL11:窗格底(PaneBackground)。调用方未显式传入时按权威键取默认:
 * - Overlay(Minimal):NavigationViewDefaultPaneBackground = AcrylicInAppFillColorDefaultBrush
 *   (web 取亚克力不透明回退色 #F9F9F9 / #2C2C2C,见 brush-authority §4.2);
 * - Inline / CompactInline:PaneNotOverlaying 态 NavigationViewExpandedPaneBackground =
 *   SolidBackgroundFillColorTransparent(透明)。
 * 变量在组件根 .wui-navview 上声明,经继承解析到内嵌 SplitView 的窗格元素。
 */
const effectivePaneBackground = computed(() =>
  props.paneBackground
    ? props.paneBackground
    : splitDisplayMode.value === 'Overlay'
      ? 'var(--wui-navview-pane-bg-overlay)'
      : 'var(--wui-navview-pane-bg)',
)

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
        // 容器缩放改变条目几何:指示条直接落位(A9,不播放编排)
        void nextTick(() => placeIndicator(false))
      })
      observer.observe(el)
    }
  }
  // 初始即处于 Minimal(窄容器 / 显式 LeftMinimal):窗格默认收起(WinUI 同)
  if (resolvedPaneMode.value === 'LeftMinimal' && isPaneOpen.value) isPaneOpen.value = false
  // 初始已有选中(预设 v-model:selectedItem):直接落位,不播编排
  void nextTick(() => placeIndicator(false))
})

// A9:选中变化播 600ms 编排;模式切换 / 窗格开合改变几何,直接落位
watch(selectedItem, () => {
  void nextTick(() => placeIndicator(true))
})
watch([resolvedPaneMode, isPaneOpen], () => {
  void nextTick(() => placeIndicator(false))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  indicatorPhase?.cancel()
  indicatorPhase = null
})

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

// ======================================================================
// 选择指示条(audit A9):共享 pill + 源 600ms Scale+Offset 编排
// ----------------------------------------------------------------------
// 源:controls/dev/NavigationView/NavigationView.cpp
//   - PlayIndicatorAnimations(L2184-2234):posAnim(Offset.X/Y)600ms,0.333(=200ms)
//     处 singleStep 跳变(前段保持起点、后段保持终点);scaleAnim(Scale.X/Y)600ms,
//     0→0.333 以 c_frame1 自 1 拉伸至 |Δ|/dimension+1、0.333→1 以 c_frame2 收回 1;
//     centerAnim(CenterPoint.X/Y)200ms,终帧 singleStep —— 200ms 处中心点自起侧边
//     跳到终侧边;离场指示条 opacity 保持至 0.333 后以 c_frame2 淡出至 600ms;
//   - 曲线常量(L1990-1993):c_frame1 = (0.9,0.1)-(1.0,0.2)(加速,拉伸段)、
//     c_frame2 = (0.1,0.9)-(0.2,1.0)(减速,收回段)。
// Web 复刻:指示条不再逐项渲染,改为每容器一枚共享 pill(跨条目位移无法用逐项
// 元素表达);选中变化时以 WAAPI 两段播放:0-200ms 在旧位、origin 贴起侧边
// scale 1→peak;200ms 处 top/left 跳新位 + origin 翻到终侧边;200-600ms scale
// peak→1。首选中 / 跨容器(菜单↔页脚,对应源跨级路径)/ reduced-motion:直接落位。
// ======================================================================
const INDICATOR_DURATION_MS = 600
const INDICATOR_JUMP_MS = 200
const INDICATOR_DIMENSION_PX = 16 // pill 沿运动轴边长(左窗格 3x16 / 顶栏 16x3)
const INDICATOR_EASE_STRETCH = 'cubic-bezier(0.9, 0.1, 1, 0.2)' // c_frame1(L1990-1991)
const INDICATOR_EASE_SHRINK = 'cubic-bezier(0.1, 0.9, 0.2, 1)' // c_frame2(L1992-1993)
const INDICATOR_CONTAINER_SELECTOR =
  '.wui-navview__menu, .wui-navview__footer-menu, .wui-navview__topbar-items, .wui-navview__topbar-footer'

interface IndicatorPlace {
  container: Element
  top: number
  left: number
}

let indicatorPhase: Animation | null = null
let indicatorLast: IndicatorPlace | null = null

/** 测量选中项 pill 的容器内位置与所在容器(Top 模式沿 X 编排,左窗格系沿 Y)。 */
function measureIndicatorPlace(): (IndicatorPlace & { el: HTMLElement; horizontal: boolean }) | null {
  const root = rootRef.value
  if (!root) return null
  const item = root.querySelector('.wui-nav-item--selected')
  if (!item) return null
  const container = item.closest(INDICATOR_CONTAINER_SELECTOR)
  if (!container) return null
  const el = container.querySelector(':scope > .wui-navview__indicator') as HTMLElement | null
  if (!el) return null
  const containerRect = container.getBoundingClientRect()
  const itemRect = item.getBoundingClientRect()
  if (itemRect.width === 0 && itemRect.height === 0) return null // 窗格收起等不可见态:隐藏
  const scrollTop = container.scrollTop
  if (isTop.value) {
    return {
      container,
      el,
      horizontal: true,
      top: itemRect.bottom - containerRect.top + scrollTop - 3 - 4, // 16x3 贴底,margin 4
      left: itemRect.left - containerRect.left + (itemRect.width - INDICATOR_DIMENSION_PX) / 2,
    }
  }
  return {
    container,
    el,
    horizontal: false,
    top: itemRect.top - containerRect.top + scrollTop + (itemRect.height - INDICATOR_DIMENSION_PX) / 2,
    left: itemRect.left - containerRect.left, // 3x16 贴条目左缘
  }
}

/** 200ms 折返两侧的 transform-origin(对应 CenterPoint:前段贴起侧边、后段贴终侧边)。 */
function indicatorOrigin(horizontal: boolean, positive: boolean, afterJump: boolean): string {
  const startSide = positive !== afterJump // 正向下前段贴上/左缘、后段贴下/右缘;反向互换
  if (horizontal) return startSide ? 'left center' : 'right center'
  return startSide ? 'center top' : 'center bottom'
}

function applyIndicatorPlace(place: IndicatorPlace & { el: HTMLElement; horizontal: boolean }): void {
  indicatorPhase?.cancel()
  indicatorPhase = null
  place.el.style.top = `${place.top}px`
  place.el.style.left = `${place.left}px`
  place.el.style.transform = ''
  place.el.style.transformOrigin = ''
  place.el.style.opacity = '1'
}

function hideIndicator(): void {
  indicatorPhase?.cancel()
  indicatorPhase = null
  rootRef.value?.querySelectorAll<HTMLElement>(':scope .wui-navview__indicator').forEach((el) => {
    el.style.opacity = '0'
  })
  indicatorLast = null
}

/** 选中指示条落位 / 编排(PlayIndicatorAnimations 的 Web 复刻)。 */
function placeIndicator(animated: boolean): void {
  const next = measureIndicatorPlace()
  if (!next) {
    hideIndicator()
    return
  }
  // 其他容器的指示条隐藏(菜单 ↔ 页脚跨容器按源跨级语义直接落位)
  rootRef.value?.querySelectorAll<HTMLElement>(':scope .wui-navview__indicator').forEach((el) => {
    if (el !== next.el) el.style.opacity = '0'
  })

  const prev = indicatorLast
  indicatorLast = { container: next.container, top: next.top, left: next.left }
  const delta = next.horizontal ? next.left - (prev?.left ?? next.left) : next.top - (prev?.top ?? next.top)
  const canAnimate =
    animated &&
    prev !== null &&
    prev.container === next.container &&
    delta !== 0 &&
    !prefersReducedMotion() &&
    typeof next.el.animate === 'function'
  if (!canAnimate) {
    applyIndicatorPlace(next)
    return
  }

  // 两段编排:0-200ms 旧位拉伸(c_frame1)→ 200ms Offset 跳新位 + CenterPoint 翻终侧
  // (posAnim/centerAnim singleStep)→ 200-600ms 新位收回(c_frame2)
  const peak = Math.abs(delta) / INDICATOR_DIMENSION_PX + 1
  const axis = next.horizontal ? 'X' : 'Y'
  const positive = delta > 0
  const el = next.el
  el.style.opacity = '1'
  el.style.top = `${next.horizontal ? next.top : prev.top}px`
  el.style.left = `${next.horizontal ? prev.left : next.left}px`
  el.style.transformOrigin = indicatorOrigin(next.horizontal, positive, false)
  const phase1 = el.animate([{ transform: `scale${axis}(1)` }, { transform: `scale${axis}(${peak})` }], {
    duration: INDICATOR_JUMP_MS,
    easing: INDICATOR_EASE_STRETCH,
    fill: 'forwards',
  })
  indicatorPhase = phase1
  void phase1.finished
    .then(() => {
      if (indicatorPhase !== phase1) return // 已被新一次选中打断
      el.style.top = `${next.top}px`
      el.style.left = `${next.left}px`
      el.style.transformOrigin = indicatorOrigin(next.horizontal, positive, true)
      const phase2 = el.animate(
        [{ transform: `scale${axis}(${peak})` }, { transform: `scale${axis}(1)` }],
        {
          duration: INDICATOR_DURATION_MS - INDICATOR_JUMP_MS,
          easing: INDICATOR_EASE_SHRINK,
          fill: 'forwards',
        },
      )
      indicatorPhase = phase2
      void phase2.finished.then(() => {
        if (indicatorPhase !== phase2) return
        indicatorPhase = null
        phase2.cancel() // 撤除 forwards 锁定,静止态回归无 transform(落位于新条目)
        el.style.transform = ''
        el.style.transformOrigin = ''
      })
    })
    .catch(() => {
      /* 被后续编排打断(cancel)属正常路径 */
    })
}

// ======================================================================
// 方向键 roving focus(MR6/P2-1):WinUI NavigationView 键盘语义 ——
//   源 OnKeyDown(NavigationView.cpp L3092)只接 Gamepad/Tab 追踪/Alt+←,注释明言
//   「arrow keys navigation through ItemsRepeater don't get here」:方向键由平台
//   焦点引擎在条目间移动**焦点**(不移动选中;Space/Enter 经条目 click 通道
//   invoke/选中,文档「The space or enter key always invokes/selects an item」)。
//   learn.microsoft.com NavigationView「Keyboarding」节:左窗格系 ↑/↓ 移动焦点、
//   ←/→ Does nothing;Top 模式(TopNavArea XYFocusKeyboardNavigation=Enabled)
//   ←/→ 移动焦点、↑/↓ Does nothing;且「焦点可自窗格列表末项移到 settings 项」
//   —— 即导航跨容器(菜单 ↔ 页脚)。
//   Web 实现:根级 keydown 委托,焦点在 .wui-nav-item 上时按轴步进;序列 =
//   菜单 + 页脚(Top 为主栏 + 页脚栏)按 DOM 序拼接(即视觉序),首尾回绕
//   (MR6 工单规格);禁用 / 隐藏(display:none、SplitView 收拢窗格
//   visibility:hidden)条目跳过;Tab 序不经此路径,零影响;Enter/Space 原生
//   click → onItemInvoked → 选中 → A9 600ms 指示条编排照常。
// ======================================================================

/** 当前轴上的步进方向:左窗格系 ↑(-1)/↓(+1),Top ←(-1)/→(+1);其余键(含反向轴)0。 */
function navArrowStep(key: string): number {
  if (isTop.value) {
    if (key === 'ArrowRight') return 1
    if (key === 'ArrowLeft') return -1
    return 0
  }
  if (key === 'ArrowDown') return 1
  if (key === 'ArrowUp') return -1
  return 0
}

/** 条目可否入列:未禁用且可见(checkVisibility 覆盖 display:none 与 visibility:hidden)。 */
function isNavItemFocusable(el: HTMLElement): boolean {
  if (el.matches(':disabled')) return false
  const checker = (el as HTMLElement & { checkVisibility?: (options?: { checkVisibilityCSS?: boolean }) => boolean })
    .checkVisibility
  if (typeof checker === 'function') return checker.call(el, { checkVisibilityCSS: true })
  return el.getClientRects().length > 0
}

function onNavRootKeyDown(event: KeyboardEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const item = target.closest<HTMLElement>('.wui-nav-item')
  const root = rootRef.value
  if (!item || !root || !root.contains(item)) return
  const step = navArrowStep(event.key)
  if (step === 0) return
  const items = Array.from(root.querySelectorAll<HTMLElement>('.wui-nav-item')).filter(isNavItemFocusable)
  const index = items.indexOf(item)
  if (index === -1) return
  event.preventDefault() // 焦点已在条目上,方向键不再驱动滚动容器
  // 首尾回绕:首项 ↑ → 末项,末项 ↓ → 首项(工单 MR6 规格)
  const next = items[(index + step + items.length) % items.length]
  next?.focus()
}

function togglePane(): void {
  isPaneOpen.value = !isPaneOpen.value
}

const hasFooterMenu = computed(
  () => props.footerMenuItems.length > 0 || slots['footer-menu-items'] !== undefined,
)

/** 汉堡按钮可见宽度(源 PaneToggleButtonStyle 模板根 Grid 的可见盒:MinWidth/SmallerPaneToggleButtonWidth 40)。 */
const PANE_TOGGLE_WIDTH = 40

/**
 * PaneTitle 是否随汉堡按钮同行显示。
 * 源 NavigationView.xaml L205-207:PaneTitleTextBlock 是 TogglePaneButton 的 Content,由
 * PaneToggleButtonStyle(L270-335)模板的 ContentPresenter 渲染在 40px 图标格右侧同一行、垂直居中
 * (VerticalContentAlignment=Center、Padding 4,0,0,0、Margin 0,-2,0,0);官方文档同义:
 * 「PaneTitle … shows the text next to the menu button」(learn.microsoft.com NavigationView
 * 「Pane title and header」节)。隐藏条件对照源:
 *   - ListSizeCompact 态(PaneTitleTextBlock.Visibility=Collapsed):DisplayMode=Compact 且窗格收起
 *     (NavigationView.cpp UpdateIsClosedCompact:m_isClosedCompact = !IsPaneOpen && SplitView 为
 *     CompactInline(Expanded 态)/CompactOverlay(Compact 态));
 *   - LeftMinimal 收起的浮层:UpdatePaneToggleSize 走「Overlay && !IsPaneOpen」分支不再展宽;
 *   - Top 模式:PaneTitle 由 TopNavGrid 的 PaneTitleOnTopPane 承载(本组件顶栏标题,见模板)。
 * Web 以 isPaneOpen 统一表达「展开则显示」(Expanded→CompactInline、Compact→CompactOverlay、
 * Minimal→Overlay 三者的开态都成立),收起态一律隐藏。
 */
const showPaneTitle = computed(() => !isTop.value && isPaneOpen.value && props.paneTitle !== '')

/**
 * 展开态按钮宽度(源 NavigationView.cpp UpdatePaneToggleSize):窗格开启且 PaneTitle 非空时
 * `toggleButton.Width = OpenPaneLength`(Overlay 开态减去返回/关闭按钮宽;本组件无返回按钮)。
 * 按钮的可见盒(LayoutRoot)再由模板根 Grid 的 Margin=`NavigationViewItemButtonMargin`(4,2)
 * 两侧各退 4px → 可见宽度 = OpenPaneLength - 8;标题起点 = 40(图标格)+ 4(ContentPresenter
 * Padding 左)= 窗格内 x 48,与源一致。
 */
const toggleStyle = computed<Record<string, string> | undefined>(() =>
  showPaneTitle.value
    ? { width: `${Math.max(PANE_TOGGLE_WIDTH, props.openPaneLength - 8)}px` }
    : undefined,
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
    @keydown="onNavRootKeyDown"
  >
    <!-- ============ Top 模式:48px 顶栏 + 内容卡 ============ -->
    <template v-if="isTop">
      <div class="wui-navview__topbar">
        <span v-if="paneTitle" class="wui-navview__topbar-title">{{ paneTitle }}</span>
        <nav class="wui-navview__topbar-items" :aria-label="menuNavLabel">
          <slot name="menu-items">
            <WuiNavigationViewItem
              v-for="(entry, index) in menuItems"
              :key="String(entry.tag ?? entry.label ?? index)"
              :entry="entry"
            />
          </slot>
          <!-- 共享选中指示条(A9):位置/编排由脚本写入,见样式注 -->
          <span class="wui-navview__indicator" aria-hidden="true"></span>
        </nav>
        <div class="wui-navview__topbar-spring" aria-hidden="true"></div>
        <nav v-if="hasFooterMenu" class="wui-navview__topbar-footer" :aria-label="footerNavLabel">
          <slot name="footer-menu-items">
            <WuiNavigationViewItem
              v-for="(entry, index) in footerMenuItems"
              :key="String(entry.tag ?? entry.label ?? index)"
              :entry="entry"
            />
          </slot>
          <span class="wui-navview__indicator" aria-hidden="true"></span>
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
      <!-- 汉堡按钮(PaneToggleButtonStyle,PaneToggleButtonGrid Z=100 顶层悬浮):
           源模板根 Grid 两列 [Auto: Border Width=40 内 16×16 AnimatedIcon][*: ContentPresenter
           Padding 4,0,0,0],行高 PaneToggleButtonHeight 36,LayoutRoot 外边距
           NavigationViewItemButtonMargin(4,2)。PaneTitle 是该 Button 的 Content
           (NavigationView.xaml L205-207)→ 与 ☰ 同一行、在 40px 图标格右侧垂直居中;
           窗格展开且有标题时按钮展宽到 OpenPaneLength(源 UpdatePaneToggleSize)。 -->
      <button
        type="button"
        class="wui-navview__toggle"
        :class="{ 'wui-navview__toggle--with-title': showPaneTitle }"
        :style="toggleStyle"
        :aria-expanded="isPaneOpen"
        aria-label="展开或折叠窗格"
        @click="togglePane"
      >
        <span class="wui-navview__toggle-icon" aria-hidden="true">
          <!-- 源 PaneToggleButton 的 Icon = controls:AnimatedIcon + AnimatedGlobalNavigationButtonVisualSource
               (State Normal/PointerOver/Pressed;资产总时长 133.33ms,c_durationTicks=13333333)。
               原始 .json 不在 CK 快照内,Web 以内联 SVG 三横条等形复刻 E700 汉堡字形,
               悬停/按压以横条位移 + 整体缩放过渡近似(见 wiki/controls/NavigationView.md 差异节)。 -->
          <svg class="wui-navview__pane-toggle-glyph" viewBox="0 0 16 16" focusable="false">
            <path class="wui-navview__pane-toggle-bar wui-navview__pane-toggle-bar--top" d="M2.5 4.5 H13.5" />
            <path class="wui-navview__pane-toggle-bar wui-navview__pane-toggle-bar--mid" d="M2.5 8 H13.5" />
            <path class="wui-navview__pane-toggle-bar wui-navview__pane-toggle-bar--bot" d="M2.5 11.5 H13.5" />
          </svg>
        </span>
        <span v-if="showPaneTitle" class="wui-navview__pane-title">{{ paneTitle }}</span>
      </button>

      <WuiSplitView
        v-model:is-pane-open="isPaneOpen"
        class="wui-navview__split"
        :display-mode="splitDisplayMode"
        pane-placement="Left"
        :open-pane-length="openPaneLength"
        :compact-pane-length="compactPaneLength"
        :pane-background="effectivePaneBackground"
        :pane-label="paneLabel || paneTitle"
        @pane-opened="emit('paneOpened')"
        @pane-closing="emit('paneClosing')"
        @pane-closed="emit('paneClosed')"
      >
        <template #pane>
          <!-- 窗格内容(PaneContentGrid:首行为 PaneHeaderContentBorderRow,MinHeight =
               NavigationViewPaneHeaderRowMinHeight 40 —— 让出汉堡按钮行;PaneTitle 已随汉堡按钮
               同行渲染,故此处不再有独立标题行)。 -->
          <div class="wui-navview__pane">
            <nav class="wui-navview__menu" :aria-label="menuNavLabel">
              <slot name="menu-items">
                <WuiNavigationViewItem
                  v-for="(entry, index) in menuItems"
                  :key="String(entry.tag ?? entry.label ?? index)"
                  :entry="entry"
                />
              </slot>
              <!-- 共享选中指示条(A9):位置/编排由脚本写入,见样式注 -->
              <span class="wui-navview__indicator" aria-hidden="true"></span>
            </nav>
            <div v-if="$slots['pane-footer']" class="wui-navview__pane-footer">
              <slot name="pane-footer" />
            </div>
            <nav v-if="hasFooterMenu" class="wui-navview__footer-menu" :aria-label="footerNavLabel">
              <slot name="footer-menu-items">
                <WuiNavigationViewItem
                  v-for="(entry, index) in footerMenuItems"
                  :key="String(entry.tag ?? entry.label ?? index)"
                  :entry="entry"
                />
              </slot>
              <span class="wui-navview__indicator" aria-hidden="true"></span>
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
  /* PL11:窗格底重定向到 Fluent 权威。
     - Inline(非 overlay)PaneNotOverlaying:NavigationViewExpandedPaneBackground =
       SolidBackgroundFillColorTransparent(NavigationView_themeresources.xaml L6/L72,
       NavigationView.xaml L129 在该视觉态覆写)→ --wui-solid-background-fill-color-transparent(透明)。
     - Overlay(Minimal)保持模板初值 NavigationViewDefaultPaneBackground =
       AcrylicInAppFillColorDefaultBrush(L5/L71);web 无原生亚克力,取不透明回退色
       #F9F9F9(浅)/#2C2C2C(深)(brush-authority §4.2)。 */
  --wui-navview-pane-bg: var(--wui-solid-background-fill-color-transparent);
  --wui-navview-pane-bg-overlay: #f9f9f9;
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 0;
  color: var(--wui-text-fill-color-primary); /* NavigationViewItemForeground=TextFillColorPrimary(L21/L87) */
}

html[data-theme='dark'] .wui-navview {
  --wui-navview-pane-bg-overlay: #2c2c2c;
}

/* ============ 汉堡按钮(PaneToggleButtonStyle:LayoutRoot 40x36,\uE700 16px,Subtle 悬停)============
   LayoutRoot = 模板根 Grid(Height=PaneToggleButtonHeight 36、Margin=Padding 4,2)。
   展开态由 toggleStyle 绑定展宽到 OpenPaneLength - 8(源 UpdatePaneToggleSize)。 */
.wui-navview__toggle {
  position: absolute;
  top: 4px; /* ButtonHolderGrid margin 0,4 + LayoutRoot margin 2(源垂直 4+2=6,可见盒按 QA 口径 4) */
  left: 4px;
  z-index: 3;
  display: inline-flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  width: 40px; /* PaneToggleButtonWidth(源 SmallerPaneToggleButtonWidth = CompactPaneLength - 8) */
  height: 36px; /* PaneToggleButtonHeight */
  padding: 0;
  overflow: hidden;
  font: inherit;
  color: var(--wui-text-fill-color-primary); /* NavigationViewButtonForeground 常态=TextFillColorPrimary */
  background: var(--wui-subtle-fill-color-transparent); /* NavigationViewItemBackground(透明) */
  border: 0;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

/* 展开态:两列 [40px 图标格 | 标题],不再居中(对照源模板 Grid.ColumnDefinitions Auto/*) */
.wui-navview__toggle--with-title {
  justify-content: flex-start;
}

/* 图标格(源模板第一列 Border Width=PaneToggleButtonWidth 40,内 16×16 AnimatedIcon 居中) */
.wui-navview__toggle-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 36px;
}

/* 汉堡字形(源 AnimatedGlobalNavigationButtonVisualSource,133.33ms):三横条内联 SVG 等形 E700,
   Normal→PointerOver→Pressed 以横条位移 / 整体缩放过渡近似(原始 Lottie .json 不在快照内)。 */
.wui-navview__pane-toggle-glyph {
  width: 16px;
  height: 16px;
  overflow: visible;
  transition: transform 133.33ms linear;
}

.wui-navview__pane-toggle-bar {
  fill: none;
  stroke: currentcolor;
  stroke-width: 1.5;
  stroke-linecap: round;
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 133.33ms linear;
}

/* PointerOver:三横条横向收拢(保持三横可辨;源 GlobalNav 悬停形变的务实近似) */
.wui-navview__toggle:hover .wui-navview__pane-toggle-bar {
  transform: scaleX(0.78);
}

/* Pressed:整体收缩 */
.wui-navview__toggle:active .wui-navview__pane-toggle-glyph {
  transform: scale(0.82);
}

/* PointerOver:NavigationViewButtonBackgroundPointerOver = SubtleFillColorSecondaryBrush(L63/L125) */
.wui-navview__toggle:hover {
  background: var(--wui-subtle-fill-color-secondary);
}

/* Pressed:背景 SubtleFillColorTertiary;前景 NavigationViewButtonForegroundPressed = TextFillColorSecondary */
.wui-navview__toggle:active {
  color: var(--wui-text-fill-color-secondary);
  background: var(--wui-subtle-fill-color-tertiary);
}

/* Disabled(PaneToggleButtonStyle Disabled 态):NavigationViewButtonBackgroundDisabled =
   ControlFillColorDisabledBrush(L65)、NavigationViewButtonForegroundDisabled = TextFillColorDisabledBrush(L68) */
.wui-navview__toggle:disabled {
  color: var(--wui-text-fill-color-disabled);
  background: var(--wui-control-fill-color-disabled);
  cursor: default;
}

/* 系统焦点视觉:TogglePaneButton FocusVisualMargin=0(NavigationView.xaml L197)
   → 两环全在元素内 primary [0,2] + secondary [2,3] = 系统双环 flush 形 */
.wui-navview__toggle:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}

/* ============ 左窗格系:SplitView 承载 ============ */
.wui-navview__split {
  flex: 1 1 auto;
  min-height: 0;
}

/* 窗格开合时长(源精确值覆写):SplitViewPaneAnimationOpenDuration = 0.2s /
   SplitViewPaneAnimationCloseDuration = 0.1s(generic.xaml L1305-1307,Inline 系窗格动画
   由 NavigationView 与 SplitView 共用同一资源键)。SplitView 基类取 --wui-duration-normal/fast
   token(240/167ms);此处按源 KeyTime 逐值覆写,缓动 KeySpline (0.0,0.35 0.15,1.0)
   与 SplitView 侧保持一致(L15291),不改。Overlay 分支(0.35s/0.12s,NavigationView.xaml
   L99/L113)不在本覆盖范围(SplitView 基类值,开 350ms 已吻合)。 */
.wui-navview .wui-navview__split:not(.wui-splitview--is-overlay) {
  transition-duration: 100ms; /* 关:源 0.1s */
}

.wui-navview .wui-navview__split:not(.wui-splitview--is-overlay).wui-splitview--is-open {
  transition-duration: 200ms; /* 开:源 0.2s */
}

/* 窗格内容:首行让出汉堡按钮行(PaneHeaderContentBorderRow MinHeight =
   NavigationViewPaneHeaderRowMinHeight 40;源 NavigationView.cpp UpdateBackAndCloseButtonsVisibility
   在汉堡按钮可见时把该行 MinHeight 设为 PaneToggleButtonHeight 36,并由 VisualState
   TogglePaneButtonVisible 提升到 40)。
   flex 列布局:menu 区 flex:1 可滚,#pane-footer / 页脚菜单 flex:none 固定底部
   (对照源 PaneContentGrid 的行结构:菜单 * / PaneFooter Auto / FooterItems Auto)。
   box-sizing 必须 border-box:项目未设全局 border-box 重置,content-box 下
   height:100% + padding-top 会把 footer 推出裁剪区(QA F2)。 */
.wui-navview__pane {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  height: 100%;
  padding-top: 40px; /* PaneHeaderContentBorderRow MinHeight 40(不再有独立标题行) */
  overflow: hidden;
}

/* 窗格标题(PaneTitle):源中为汉堡按钮的 Content(TextBlock HorizontalAlignment=Left
   Margin 0,-2,0,0 VerticalAlignment=Center,NavigationViewItemHeaderTextStyle = 14 SemiBold)
   → 渲染在按钮内、图标格右侧同行垂直居中。 */
.wui-navview__pane-title {
  flex: 1 1 auto;
  min-width: 0;
  padding-left: 4px; /* ContentPresenter Padding 4,0,0,0 */
  overflow: hidden;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600; /* NavigationViewItemHeaderTextStyle:SemiBold */
  text-align: left; /* TextBlock HorizontalAlignment=Left(button 的 UA text-align:center 需抵消) */
  text-overflow: ellipsis;
  white-space: nowrap; /* NavigationViewItemHeaderTextStyle:TextWrapping=NoWrap */
}

.wui-navview__menu {
  position: relative; /* 共享选中指示条(A9)的定位容器 */
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
  position: relative; /* 共享选中指示条(A9)的定位容器 */
  flex: none;
  padding: 4px 0;
  overflow-x: hidden;
}

/* 紧凑栏收拢:标题 / 标签 / 箭头 / 组头隐藏,仅留图标栏(ClosedCompact + ListSizeCompact setter 组;
   PaneTitleTextBlock.Visibility=Collapsed —— 本实现的标题随汉堡按钮渲染,由 showPaneTitle 收起) */
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
  box-sizing: border-box; /* 底部分隔线计入 48px 高(源 TopNavGrid 同) */
  flex: none;
  height: 48px; /* NavigationViewTopPaneHeight */
  margin: 0 4px; /* TopNavigationViewTopNavGridMargin 4,0 */
  border-bottom: 1px solid var(--wui-divider-stroke-color-default); /* NavigationViewItemSeparatorForeground=DividerStrokeColorDefault(L46) */
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
  position: relative; /* 共享选中指示条(A9)的定位容器 */
  display: flex;
  align-items: center;
  min-width: 0;
}

.wui-navview__topbar-spring {
  flex: 1 1 auto;
}

.wui-navview__topbar-footer {
  position: relative; /* 共享选中指示条(A9)的定位容器 */
  display: flex;
  align-items: center;
  flex: none;
}

/* ============ 内容卡(ContentGrid:背景 Layer / 描边 1,1,0,0 / 圆角 8,0,0,0)============ */
.wui-navview__content {
  display: flex;
  flex-direction: column;
  box-sizing: border-box; /* 描边计入弹性高度,避免 2px 外溢 */
  flex: 1 1 auto;
  min-height: 0;
  /* NavigationViewContentBackground = LayerFillColorDefaultBrush(themeresources L8/L74) */
  background: var(--wui-layer-fill-color-default);
  /* NavigationViewContentGridBorderBrush = CardStrokeColorDefaultBrush(L49) */
  border-top: 1px solid var(--wui-card-stroke-color-default);
  border-left: 1px solid var(--wui-card-stroke-color-default);
  border-top-left-radius: 8px; /* NavigationViewContentGridCornerRadius 8,0,0,0 */
}

.wui-navview--top .wui-navview__content,
.wui-navview--minimal .wui-navview__content {
  /* Top/Minimal:TopNavigationViewContentGridBorderThickness 0,1,0,0 + 圆角 0 */
  border-left: 0;
  border-top-left-radius: 0;
}

/* 页头(NavigationViewTitleHeaderContentControlTextStyle:28px SemiBold;字号取最近似 token;
   NavigationViewHeaderMargin 56,44,0,0 —— 右 0) */
.wui-navview__header {
  flex: none;
  min-height: 36px; /* PaneToggleButtonHeight 基线 */
  margin: 44px 0 0 56px; /* NavigationViewHeaderMargin 56,44,0,0 */
  font-size: var(--wui-text-style-extra-large-font-size);
  font-weight: 600;
  color: var(--wui-text-fill-color-primary); /* 页头 Foreground = TextFillColorPrimary */
}

.wui-navview--minimal .wui-navview__header {
  /* Minimal 抬头左移贴近汉堡(NavigationViewMinimalHeaderMargin -24,44,0,0 的 Web 近似) */
  margin: 44px 0 0 12px;
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
  box-sizing: border-box; /* 源 MinHeight 36 含 1px 透明描边(content-box 下会是 38px) */
  width: calc(100% - 8px);
  min-height: 36px; /* NavigationViewItemOnLeftMinHeight */
  margin: 2px 4px; /* NavigationViewItemButtonMargin 4,2 */
  padding: 0;
  font: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-fill-color-primary); /* NavigationViewItemForeground=TextFillColorPrimary(L21) */
  text-align: left;
  white-space: nowrap;
  background: var(--wui-subtle-fill-color-transparent); /* NavigationViewItemBackground=SubtleFillColorTransparent(L9) */
  border: 1px solid var(--wui-subtle-fill-color-transparent); /* NavigationViewItemBorderBrush=SubtleFillColorTransparent(L33) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius 4px */
  cursor: pointer;
}

/* 四态背景 → Subtle 族(L10/L11/L17/L18/L19);前景 L22/L23/L30/L31 */
.wui-navview :deep(.wui-nav-item:hover) {
  background: var(--wui-subtle-fill-color-secondary);
}

.wui-navview :deep(.wui-nav-item:active) {
  color: var(--wui-text-fill-color-secondary); /* Pressed 前景 TextFillColorSecondary */
  background: var(--wui-subtle-fill-color-tertiary);
}

.wui-navview :deep(.wui-nav-item:focus-visible) {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.wui-navview :deep(.wui-nav-item--selected) {
  background: var(--wui-subtle-fill-color-secondary); /* Selected:SubtleFillColorSecondary(L17) */
}

.wui-navview :deep(.wui-nav-item--selected:hover) {
  background: var(--wui-subtle-fill-color-tertiary); /* SelectedPointerOver:Tertiary(L18) */
}

.wui-navview :deep(.wui-nav-item--selected:active) {
  color: var(--wui-text-fill-color-secondary); /* SelectedPressed 前景 TextFillColorSecondary(L31) */
  background: var(--wui-subtle-fill-color-secondary); /* SelectedPressed:Secondary(回落,L19) */
}

.wui-navview :deep(.wui-nav-item:disabled) {
  color: var(--wui-text-fill-color-disabled); /* NavigationViewItemForegroundDisabled=TextFillColorDisabled(L24) */
  background: var(--wui-subtle-fill-color-transparent); /* …BackgroundDisabled=SubtleFillColorTransparent(L12) */
  cursor: default;
}

/* 共享选中指示条(SelectionIndicator / "pill",A9):每容器一枚,替代逐项 pill ——
   源选中切换为 600ms Scale+Offset 编排(NavigationView.cpp PlayIndicatorAnimations
   L2184-2234:Offset 200ms 处 singleStep 跳变、Scale 以 c_frame1/c_frame2 两段
   拉伸-收回、CenterPoint 200ms 折返,曲线常量 L1990-1993),编排由脚本 WAAPI
   驱动(见脚本注),此处只承载静态形。无选中/不可见时 opacity 0,位置由脚本写入。 */
.wui-navview__indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px; /* NavigationViewSelectionIndicatorWidth */
  height: 16px; /* NavigationViewSelectionIndicatorHeight */
  border-radius: 2px; /* NavigationViewSelectionIndicatorRadius */
  background: var(--wui-accent-fill-color-default); /* NavigationViewSelectionIndicatorForeground=AccentFillColorDefaultBrush(L48) */
  opacity: 0;
  pointer-events: none;
}

.wui-navview--top .wui-navview__indicator {
  width: 16px; /* 顶栏 pill 16x3(margin 16,0,16,4) */
  height: 3px;
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

/* 展开箭头(源 ExpandCollapseChevronIcon = controls:AnimatedIcon +
   AnimatedChevronUpDownSmallVisualSource;资产总时长 433.33ms,c_durationTicks=43333333;
   State NormalOn(展开,chevron 朝上)/ NormalOff(收起,朝下)↔ 旋转 180°。
   原始 .json 不在快照内,Web 以旋转过渡复刻;源无 XAML KeySpline(曲线烘焙在 Lottie 内)故取 linear) */
.wui-navview :deep(.wui-nav-item__chevron-icon) {
  transition: transform 433.33ms linear;
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
  color: var(--wui-text-fill-color-secondary); /* NavigationViewItemHeaderForeground=TextFillColorSecondary(L47) */
}

/* 分隔线(NavigationViewItemSeparator:1px,margin 0,3,0,4) */
.wui-navview :deep(.wui-nav-separator) {
  height: 1px;
  margin: 3px 4px 4px;
  background: var(--wui-divider-stroke-color-default); /* NavigationViewItemSeparatorForeground=DividerStrokeColorDefault(L46) */
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

.wui-navview--top :deep(.wui-nav-item--selected) {
  background: var(--wui-subtle-fill-color-transparent); /* TopNavigationViewItemBackgroundSelected = 透明(L56/L60),仅 pill */
}

.wui-navview--top :deep(.wui-nav-item--selected:hover) {
  background: var(--wui-subtle-fill-color-secondary); /* TopNavigationViewItemBackgroundPointerOver(L54) */
}

.wui-navview--top :deep(.wui-nav-item--selected:active) {
  color: var(--wui-text-fill-color-secondary); /* TopNavigationViewItemForegroundSelectedPressed(L59) */
  background: var(--wui-subtle-fill-color-transparent); /* …BackgroundSelectedPressed=透明(L61) */
}

.wui-navview--top :deep(.wui-nav-header) {
  margin: 0 12px;
}

.wui-navview--top :deep(.wui-nav-separator) {
  height: 24px;
  width: 1px;
  margin: 0 3px 0 4px;
}

/* reduced-motion:chevron 过渡由 animations.css 全局块压至 0.01ms(MR3/B8 去重,
   局部块与全局语义重复已删);指示条 WAAPI 编排的 JS 降级走
   composables/useReducedMotion 的 prefersReducedMotion() */
</style>
