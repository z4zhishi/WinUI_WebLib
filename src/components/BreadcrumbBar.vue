<script setup lang="ts">
// WuiBreadcrumbBar —— WinUI BreadcrumbBar 的 Web 复刻(横向面包屑导航,节点过多时头部收省略号)。
//
// 参照源(只读;generic.xaml 本体无 TargetType="BreadcrumbBar" 段,模板在 dev 资源字典):
//   - CK/WinUI-Reference/controls/dev/Breadcrumb/BreadcrumbBar.xaml
//     (<Style TargetType="BreadcrumbBar"> + DefaultBreadcrumbBarItemStyle:PART_ItemButton /
//     PART_ChevronTextBlock / PART_LastItemContentPresenter / PART_EllipsisFlyout 全结构);
//   - BreadcrumbBar_themeresources.xaml(BreadcrumbBar* 资源键)与
//     BreadcrumbBar.cpp / BreadcrumbLayout.cpp(溢出折叠与键盘算法)。
//
// 视觉规格(对照源值 → --wui-* token):
//   - 项字号 = BreadcrumbBarItemThemeFontSize = ControlContentThemeFontSize(14px)、
//     字族 ContentControlThemeFontFamily、字重 Normal、行高 20、项按钮 Padding="1,3";
//   - 分隔符 chevron:SymbolThemeFontFamily 字形 E974(ChevronRightSmall;模板字面初值 E76C
//     会被 Default 视觉态经 UpdateInlineItemTypeVisualState 置换为 BreadcrumbBarChevronLeftToRight,
//     见 wiki 差异节)、FontSize 12、
//     Padding "2,0"(BreadcrumbBarChevronPadding);省略号节点内容为字形 E712(More)、Padding 3;
//   - 前景:Normal = BreadcrumbBarNormalForegroundBrush(TextFillColorPrimary ≈
//     --wui-application-foreground-theme),Hover = …HoverForegroundBrush(TextFillColorSecondary
//     ≈ --wui-application-secondary-foreground-theme),Pressed = …PressedForegroundBrush
//     (TextFillColorTertiary ≈ --wui-application-pressed-foreground-theme,同 SelectorBar
//     对该画刷的映射,见 wiki 差异节),
//     Disabled = …DisabledForegroundBrush(≈ --wui-system-control-foreground-base-medium-low);
//     chevron 恒用 Normal 前景(模板 Foreground 固定);
//   - 最后一项走 LastItem 视觉态:按钮收起、改渲染 ContentPresenter,不可点击不可悬停,
//     前景 BreadcrumbBarCurrentNormalForegroundBrush(= TextFillColorPrimary);
//   - 省略号下拉:FlyoutPresenter 皮肤(Background = AcrylicBackgroundFillColorDefault ≈
//     --wui-flyout-presenter-background、Border = SurfaceStrokeColorFlyout ≈
//     --wui-flyout-border-theme、Padding="0,2"、MinHeight 40、OverlayCornerRadius 圆角);
//     下拉项 Padding="11,7,11,9" + Margin="5,3",背景 SubtleFill 系列无 token,
//     取同源画刷的 menu-flyout-item 系列 token(MenuFlyoutItemBackground* 与
//     BreadcrumbBarEllipsisDropDownItem* 引用同一组 SubtleFill*/TextFill* 资源)。
//
// 行为规格(BreadcrumbBar.cpp / BreadcrumbLayout.cpp):
//   - 溢出折叠:总宽超过可用宽度时在头部渲染省略号节点,并从根侧起隐藏放不下的节点;
//     BreadcrumbLayout.GetFirstBreadcrumbBarItemToArrange 自末项向前累加(含省略号宽度),
//     超宽即停 —— Web 侧以隐藏测量行逐项实测宽度后按同算法求 firstVisible(ResizeObserver
//     + itemsSource 深度侦听 + fonts.ready 触发重测);
//   - ItemClicked:内联项点击与省略号下拉项点击都触发(下拉项回传其在 itemsSource 中的
//     真实下标,对齐 CloneEllipsisItemSource 反转列表 + itemCount-index 的换算);最后一项
//     不可点击不触发;
//   - 键盘(OnChildPreviewKeyDown / MoveFocusNext/Previous):←/→ 在「省略号 + 可见项」间
//     移动焦点(省略号是头一个落点,到边界不再环绕,对齐 WinUI 焦点走出控件的语义);
//     Enter/Space 经原生按钮激活;省略号上 Enter/Space/↓ 打开下拉;
//   - 下拉内 ↑/↓/Home/End 项间移动、Tab 关闭;Escape/外部点击/锚滚动 light dismiss 由弹层
//     基建收口(见 wiki/controls/_popup-infra.md),关闭后焦点归还省略号按钮(键盘路径)。
// SelectedItem:WinUI BreadcrumbBar 无此属性(IDL 仅 ItemsSource / ItemTemplate / ItemClicked),
//   Web 侧增补 v-model:selected-item(点击任一节点时写入该项),便于与路由/状态库对接,见 wiki。
import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import { focusFirst, isInsideAnyPopupLayer } from '@/utils/popup'
import '../styles/popup.css'

defineOptions({ name: 'WuiBreadcrumbBar', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 数据源数组(WinUI ItemsSource;路径节点序列,首项为根)。 */
    itemsSource?: unknown[]
    /** 禁用整个控件(WinUI IsEnabled;禁用后各项不可点、不可聚焦、不触发事件)。 */
    disabled?: boolean
    /** 省略号按钮的无障碍名称(全站多语言阶段可传入本地化文案)。 */
    ellipsisAriaLabel?: string
    /** 根 nav 地标的无障碍名;同页多个 BreadcrumbBar 时应传入区分性文案(attrs 传 aria-label 可覆盖)。 */
    navAriaLabel?: string
  }>(),
  { itemsSource: () => [], disabled: false, ellipsisAriaLabel: 'More items', navAriaLabel: '面包屑导航' },
)

// 显式声明 emits:内联项/下拉项的点击都转发为 itemClicked,根节点不透传原生 click。
const emit = defineEmits<{
  /** WinUI ItemClicked:item 为所点节点,index 为其在 itemsSource 中的下标;最后一项不可点击不触发。 */
  itemClicked: [args: { item: unknown; index: number }]
}>()

/** 选中项(Web 侧增补;WinUI 无此属性):点击任一节点(内联或下拉)时写入该项。 */
const selectedItem = defineModel<unknown>('selectedItem')

/** 项模板(WinUI ItemTemplate → 默认 slot);缺省渲染 String(item)。 */
defineSlots<{
  default?(slotProps: { item: unknown; index: number }): unknown
}>()

const items = computed<unknown[]>(() => props.itemsSource ?? [])

function itemText(item: unknown): string {
  return String(item)
}

/* -------------------------------------------------------------------------
 * 溢出折叠:隐藏测量行逐项实测宽度 → 自末项向前求 firstVisible(对齐 BreadcrumbLayout)
 * ---------------------------------------------------------------------- */

const rootRef = ref<HTMLElement | null>(null)

/** 头部被折叠进省略号的节点数([0, hiddenCount) 不可见,列入下拉)。 */
const hiddenCount = ref(0)

const ellipsisMeasureRef = ref<HTMLElement | null>(null)

/** 隐藏测量行的逐项单元(内容 + chevron,与真实行同结构同类名)。 */
const measureRefs = new Map<number, HTMLElement>()

function setMeasureRef(index: number): (el: unknown) => void {
  return (el) => {
    if (el instanceof HTMLElement) measureRefs.set(index, el)
    else measureRefs.delete(index)
  }
}

let measureRafId: number | null = null

/** rAF 节流的测量入口:渲染完成后的下一帧读取实测宽度。 */
function scheduleMeasure(): void {
  if (typeof window === 'undefined') return
  if (measureRafId !== null) return
  measureRafId = requestAnimationFrame(() => {
    measureRafId = null
    measure()
  })
}

function measure(): void {
  const bar = rootRef.value
  if (!bar || typeof window === 'undefined') return
  const count = items.value.length
  if (count === 0) {
    hiddenCount.value = 0
    return
  }

  const available = bar.clientWidth
  const ellipsisWidth = ellipsisMeasureRef.value?.offsetWidth ?? 0

  const widths: number[] = []
  let total = 0
  for (let i = 0; i < count; i += 1) {
    const width = measureRefs.get(i)?.offsetWidth ?? 0
    widths.push(width)
    total += width
  }

  // 全量放得下:无省略号(对齐 MeasureOverride 的 accumulatedCrumbsSize > availableSize 判定)
  if (total <= available) {
    hiddenCount.value = 0
    return
  }

  // GetFirstBreadcrumbBarItemToArrange:自末项向前累加,首项预算含省略号节点;
  // 连「省略号 + 末项」都放不下时仍强制保留二者(WinUI 同样至少渲染省略号 + 末项)。
  let acc = ellipsisWidth + (widths[count - 1] ?? 0)
  let firstVisible = count - 1
  for (let i = count - 2; i >= 0; i -= 1) {
    const next = acc + (widths[i] ?? 0)
    if (next > available) break
    acc = next
    firstVisible = i
  }
  hiddenCount.value = Math.max(0, firstVisible)
}

// 数据源变化(含页面就地增删节点)→ 重测;容器尺寸变化 → ResizeObserver 重测。
watch(
  () => props.itemsSource,
  () => scheduleMeasure(),
  { deep: true },
)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  scheduleMeasure()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => scheduleMeasure())
    if (rootRef.value) resizeObserver.observe(rootRef.value)
  }
  // 字体加载完成后字形宽度会变(chevron/省略号为图标字体),补一次重测
  if (typeof document !== 'undefined' && document.fonts) {
    void document.fonts.ready.then(() => scheduleMeasure())
  }
})

onScopeDispose(() => {
  if (measureRafId !== null) {
    cancelAnimationFrame(measureRafId)
    measureRafId = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
})

/* -------------------------------------------------------------------------
 * 点击:内联项 / 下拉项统一走 itemClicked + selectedItem(WinUI RaiseItemClickedEvent)
 * ---------------------------------------------------------------------- */

function onItemClick(item: unknown, index: number): void {
  selectedItem.value = item
  emit('itemClicked', { item, index })
}

/* -------------------------------------------------------------------------
 * 键盘:←/→ 在「省略号 + 可见项」上 roving tabindex 移动;省略号上 ↓ 打开下拉。
 * 可聚焦序 = DOM 序(省略号在最前);最后一项可聚焦(WinUI LastItem 的
 * IsTemplateFocusTarget)但非按钮,Enter 不动作。
 * ---------------------------------------------------------------------- */

/** roving tabindex 落点:省略号或可见项下标(可见项区间为 [hiddenCount, 末项])。 */
const focusedKey = ref<number | 'ellipsis'>(0)

// 可见集合变化(省略号出现/消失、折叠数变化、节点增删)时把落点收敛到有效节点:
// 有省略号优先省略号,否则落第一个可见项(对齐 WinUI Tab 进栏首落在头部)。
watch(
  () => [hiddenCount.value, items.value.length] as const,
  ([count, len]) => {
    const key = focusedKey.value
    const isValid =
      len > 0 &&
      (key === 'ellipsis'
        ? count > 0
        : typeof key === 'number' && key >= count && key < len)
    if (!isValid) focusedKey.value = count > 0 ? 'ellipsis' : Math.min(count, Math.max(0, len - 1))
  },
  { immediate: true },
)

// 焦点实际落点同步(click/键盘移动都经 focusin 汇报,tabindex 跟随)
function syncFocusedKey(event: FocusEvent): void {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target === anchorRef.value) {
    focusedKey.value = 'ellipsis'
    return
  }
  const index = target.getAttribute('data-wui-breadcrumb-index')
  if (index !== null) focusedKey.value = Number(index)
}

function collectFocusables(): HTMLElement[] {
  const bar = rootRef.value
  if (!bar) return []
  return Array.from(bar.querySelectorAll<HTMLElement>('[data-wui-breadcrumb-focusable]')).filter(
    (el) => !(el instanceof HTMLButtonElement && el.disabled),
  )
}

function moveFocus(direction: 1 | -1): boolean {
  const focusables = collectFocusables()
  if (focusables.length === 0) return false
  const current = focusables.indexOf(document.activeElement as HTMLElement)
  const nextIndex = (current < 0 ? 0 : current + direction) as number
  // 到边界不环绕:WinUI 中焦点即走出控件(MoveFocus 失败不 Handled)
  if (nextIndex < 0 || nextIndex >= focusables.length) return false
  focusables[nextIndex]?.focus()
  return true
}

function onRootKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowRight') {
    if (moveFocus(1)) event.preventDefault()
    return
  }
  if (event.key === 'ArrowLeft') {
    if (moveFocus(-1)) event.preventDefault()
    return
  }
  // ↓(以及 Enter/Space,经原生按钮)在省略号上打开下拉
  if (event.key === 'ArrowDown' && event.target === anchorRef.value) {
    event.preventDefault()
    openDropdown()
  }
}

/* -------------------------------------------------------------------------
 * 省略号下拉(弹层基建:定位 / light dismiss / Escape 栈顶收口全部复用)
 * ---------------------------------------------------------------------- */

const dropOpen = ref(false)

const { anchorRef } = usePopupAnchor()

function closeDropdown(restoreFocus: boolean): void {
  if (!dropOpen.value) return
  dropOpen.value = false
  if (restoreFocus) anchorRef.value?.focus()
}

function onOutsidePress(): void {
  closeDropdown(false)
}

function onEscapeKey(): void {
  closeDropdown(true)
}

function onAnchorScroll(): void {
  closeDropdown(false) // WinUI:锚所在滚动链滚动即 light dismiss
}

const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: 'bottom-start', // WinUI FlyoutPlacementMode.Bottom → 贴省略号下方、左缘对齐
  offset: 0,
  onOutsidePress,
  onEscape: onEscapeKey,
  onAnchorScroll,
})

function openDropdown(): void {
  if (props.disabled || hiddenCount.value === 0) return
  if (dropOpen.value) {
    closeDropdown(false)
    return
  }
  dropOpen.value = true
}

watch(dropOpen, (value) => {
  if (value) {
    void nextTick(() => {
      if (!dropOpen.value) return
      update()
      focusIntoLayer()
    })
  }
})

// 省略号消失(容器变宽 / 节点变少)或控件禁用时收起下拉
watch(
  () => [hiddenCount.value, props.disabled] as const,
  ([count, disabled]) => {
    if (dropOpen.value && (count === 0 || disabled)) closeDropdown(false)
  },
)

/** 被折叠节点(反序列表,对齐 CloneEllipsisItemSource:离当前路径最近者在上,根在最下)。 */
const hiddenEntries = computed<Array<{ item: unknown; index: number }>>(() => {
  const entries: Array<{ item: unknown; index: number }> = []
  for (let i = hiddenCount.value - 1; i >= 0; i -= 1) {
    const item = items.value[i]
    if (item !== undefined) entries.push({ item, index: i })
  }
  return entries
})

function onDropdownItemClick(entry: { item: unknown; index: number }): void {
  closeDropdown(false)
  onItemClick(entry.item, entry.index)
}

// —— 下拉内键盘:↑/↓ 循环、Home/End 首/末、Tab 关闭(WinUI 菜单族惯例) ——

function collectMenuItems(): HTMLElement[] {
  return Array.from(layerRef.value?.querySelectorAll<HTMLElement>('[data-wui-menu-item]') ?? [])
}

function focusIntoLayer(): void {
  const layer = layerRef.value
  if (!layer) return
  const menuItems = collectMenuItems()
  if (menuItems.length > 0) {
    menuItems[0]?.focus()
    return
  }
  if (!focusFirst(layer)) layer.focus()
}

function stepFocus(direction: 1 | -1): void {
  const menuItems = collectMenuItems()
  if (menuItems.length === 0) return
  const current = menuItems.indexOf(document.activeElement as HTMLElement)
  if (current < 0) {
    menuItems[0]?.focus()
    return
  }
  const nextIndex = (current + direction + menuItems.length) % menuItems.length
  menuItems[nextIndex]?.focus()
}

function onLayerKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'Tab':
      closeDropdown(false) // WinUI 菜单语义:Tab 即 light dismiss,焦点自然移动
      return
    case 'ArrowDown':
      event.preventDefault()
      stepFocus(1)
      return
    case 'ArrowUp':
      event.preventDefault()
      stepFocus(-1)
      return
    case 'Home':
      event.preventDefault()
      collectMenuItems()[0]?.focus()
      return
    case 'End': {
      event.preventDefault()
      const menuItems = collectMenuItems()
      menuItems[menuItems.length - 1]?.focus()
    }
  }
}

// 焦点移出层外 → light dismiss;锚(省略号按钮)与更深弹层豁免,点击锚的路径交给 openDropdown toggle
function onLayerFocusout(event: FocusEvent): void {
  const related = event.relatedTarget
  if (!(related instanceof Node)) return
  const layer = layerRef.value
  if (layer && layer.contains(related)) return
  if (anchorRef.value?.contains(related)) return
  if (related instanceof Element && isInsideAnyPopupLayer(related)) return
  closeDropdown(false)
}
</script>

<template>
  <nav
    ref="rootRef"
    class="wui-breadcrumb-bar"
    :aria-label="navAriaLabel"
    :aria-disabled="disabled ? 'true' : undefined"
    v-bind="$attrs"
    @keydown="onRootKeydown"
    @focusin="syncFocusedKey"
  >
    <!-- 隐藏测量行:与真实行逐节点同结构同类名(项按钮盒 Padding="1,3" / 当前位置盒 /
         chevron),保证实测宽度与真实渲染像素级一致(视觉 QA F1:此前缺按钮 2px 水平
         padding 且字体继承不一致,测量偏小导致折叠点偏晚、末项被裁);
         不影响布局/无障碍 -->
    <div class="wui-breadcrumb-measure" aria-hidden="true">
      <span
        v-for="(item, i) in items"
        :key="`measure-${i}`"
        :ref="setMeasureRef(i)"
        class="wui-breadcrumb-unit"
      >
        <span v-if="i < items.length - 1" class="wui-breadcrumb-item-button">
          <span class="wui-breadcrumb-item-content">
            <slot :item="item" :index="i">{{ itemText(item) }}</slot>
          </span>
        </span>
        <span v-else class="wui-breadcrumb-current">
          <span class="wui-breadcrumb-item-content">
            <slot :item="item" :index="i">{{ itemText(item) }}</slot>
          </span>
        </span>
        <span v-if="i < items.length - 1" class="wui-breadcrumb-chevron">&#xE974;</span>
      </span>
      <span ref="ellipsisMeasureRef" class="wui-breadcrumb-unit">
        <span class="wui-breadcrumb-item-button">
          <span class="wui-breadcrumb-item-content wui-breadcrumb-ellipsis-glyph">&#xE712;</span>
        </span>
        <span class="wui-breadcrumb-chevron">&#xE974;</span>
      </span>
    </div>

    <!-- 省略号节点(头部;仅溢出时渲染)+ 其 chevron -->
    <template v-if="hiddenCount > 0">
      <button
        ref="anchorRef"
        type="button"
        class="wui-breadcrumb-item-button"
        data-wui-breadcrumb-focusable
        :tabindex="focusedKey === 'ellipsis' ? 0 : -1"
        :disabled="disabled"
        :aria-label="ellipsisAriaLabel"
        aria-haspopup="menu"
        :aria-expanded="dropOpen ? 'true' : 'false'"
        @click="openDropdown"
      >
        <span class="wui-breadcrumb-item-content wui-breadcrumb-ellipsis-glyph" aria-hidden="true">&#xE712;</span>
      </button>
      <span class="wui-breadcrumb-chevron" aria-hidden="true">&#xE974;</span>
    </template>

    <!-- 可见节点:非末项 = 按钮(PART_ItemButton);末项 = 不可点击内容(PART_LastItemContentPresenter) -->
    <template v-for="(item, i) in items" :key="`node-${i}`">
      <template v-if="i >= hiddenCount">
        <button
          v-if="i < items.length - 1"
          type="button"
          class="wui-breadcrumb-item-button"
          data-wui-breadcrumb-focusable
          :data-wui-breadcrumb-index="i"
          :tabindex="focusedKey === i ? 0 : -1"
          :disabled="disabled"
          @click="onItemClick(item, i)"
        >
          <span class="wui-breadcrumb-item-content">
            <slot :item="item" :index="i">{{ itemText(item) }}</slot>
          </span>
        </button>
        <span
          v-else
          class="wui-breadcrumb-item-content wui-breadcrumb-current"
          data-wui-breadcrumb-focusable
          :data-wui-breadcrumb-index="i"
          :tabindex="focusedKey === i ? 0 : -1"
          aria-current="location"
        >
          <slot :item="item" :index="i">{{ itemText(item) }}</slot>
        </span>
        <span v-if="i < items.length - 1" class="wui-breadcrumb-chevron" aria-hidden="true">&#xE974;</span>
      </template>
    </template>
  </nav>

  <!-- 省略号下拉:Teleport 到 body,复用 .wui-popup-layer 外壳;被折叠节点反序列出(最近者在上) -->
  <Teleport to="body">
    <Transition name="wui-breadcrumb-dropdown">
      <div
        v-if="dropOpen"
        ref="layerRef"
        class="wui-popup-layer wui-breadcrumb-dropdown"
        role="menu"
        :aria-label="ellipsisAriaLabel"
        tabindex="-1"
        @keydown="onLayerKeydown"
        @focusout="onLayerFocusout"
      >
        <button
          v-for="entry in hiddenEntries"
          :key="entry.index"
          type="button"
          class="wui-breadcrumb-dropdown-item"
          role="menuitem"
          data-wui-menu-item
          @click="onDropdownItemClick(entry)"
        >
          <slot :item="entry.item" :index="entry.index">{{ itemText(entry.item) }}</slot>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ======================================================================
 * 栏壳(Style TargetType="BreadcrumbBar"):背景/边框透明、项横向排列、
 * 溢出由折叠算法消化(overflow: hidden 仅作字体加载间隙的兜底裁剪)。
 * ====================================================================== */
.wui-breadcrumb-bar {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  background: transparent;
  color: var(--wui-application-foreground-theme); /* BreadcrumbBarForegroundBrush ≈ TextFillColorPrimary */
}

/* 隐藏测量行:绝对定位 + visibility hidden,不占布局、不进无障碍树 */
.wui-breadcrumb-measure {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  visibility: hidden;
  pointer-events: none;
  white-space: nowrap;
}

/* 项单元(测量行内):内容 + chevron,与真实行同宽 */
.wui-breadcrumb-unit {
  display: inline-flex;
  align-items: center;
  flex: none;
}

/* ======================================================================
 * 项按钮(DefaultBreadcrumbBarItemStyle → PART_ItemButton):透明底、无框、
 * Padding="1,3"、CornerRadius = ControlCornerRadius(4px);四态即景切换
 * (各态均为 DiscreteObjectKeyFrame,无过渡动画),指针形态为 WinUI 惯例箭头。
 * ====================================================================== */
.wui-breadcrumb-item-button {
  display: flex;
  align-items: center;
  flex: none;
  padding: 3px 1px;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size); /* BreadcrumbBarItemThemeFontSize */
  font-weight: 400; /* BreadcrumbBarItemFontWeight = Normal */
  color: var(--wui-application-foreground-theme); /* BreadcrumbBarNormalForegroundBrush */
  background: transparent; /* BreadcrumbBarBackgroundBrush */
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px); /* ControlCornerRadius */
  cursor: default;
  user-select: none;
}

.wui-breadcrumb-item-button:hover:not(:disabled) {
  color: var(--wui-application-secondary-foreground-theme); /* …HoverForegroundBrush = TextFillColorSecondary */
}

.wui-breadcrumb-item-button:active:not(:disabled) {
  /* WinUI Pressed = TextFillColorTertiary ≈ --wui-application-pressed-foreground-theme
     (同 SelectorBar 对该画刷的映射,见 wiki 差异节) */
  color: var(--wui-application-pressed-foreground-theme);
}

.wui-breadcrumb-item-button:disabled {
  color: var(--wui-system-control-foreground-base-medium-low); /* …DisabledForegroundBrush ≈ TextFillColorDisabled */
  cursor: default;
}

/* 系统焦点视觉:BreadcrumbBarItem FocusVisualMargin=1(controls/dev/Breadcrumb/
   BreadcrumbBar.xaml L6,正值内缩)→ primary 内缩 [1,3] = outline 2px offset -1;
   secondary 源在 primary 内侧 [3,4],CSS 单 outline 无法表达,以元素内缘 [0,1] 近似
   (双环结构/颜色/厚度不变,整体内移 1px,登记于 VR-FIX8 报告) */
.wui-breadcrumb-item-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: -1px;
  box-shadow: inset 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.wui-breadcrumb-item-button:focus:not(:focus-visible) {
  outline: none;
}

/* 项内容(ContentPresenter):LineHeight 20、不换行 */
.wui-breadcrumb-item-content {
  display: inline-block;
  padding: 0;
  overflow: hidden;
  line-height: 20px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 最后一项(PART_LastItemContentPresenter):不可点击、无悬停;Current 前景 = TextFillColorPrimary */
.wui-breadcrumb-current {
  padding: 3px 1px;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-application-foreground-theme); /* BreadcrumbBarCurrentNormalForegroundBrush */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  user-select: none;
}

/* 系统焦点视觉:当前项同为 BreadcrumbBarItem(FocusVisualMargin=1)→ 同上内缩双环 */
.wui-breadcrumb-current:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: -1px;
  box-shadow: inset 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* 分隔符 chevron(PART_ChevronTextBlock):字形 E974(源 Default 视觉态渲染值,见 wiki 差异节)、
   FontSize 12、Padding="2,0";恒用 Normal 前景 */
.wui-breadcrumb-chevron {
  display: inline-flex;
  align-items: center;
  flex: none;
  padding: 0 2px; /* BreadcrumbBarChevronPadding */
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 12px; /* BreadcrumbBarChevronFontSize */
  line-height: 1;
  color: var(--wui-application-foreground-theme); /* BreadcrumbBarNormalForegroundBrush(模板固定) */
}

/* 省略号字形(PART_EllipsisTextBlock):SymbolThemeFontFamily、项字号、Padding 3 */
.wui-breadcrumb-ellipsis-glyph {
  padding: 3px;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  line-height: 1;
}

/* ======================================================================
 * 省略号下拉层(层根定位/圆角/阴影/z-index 由基建 .wui-popup-layer 提供):
 * FlyoutPresenter 皮肤 —— Padding="0,2"、MinHeight 40、Min/MaxWidth 96/456
 * (FlyoutThemeMaxWidth)、AcrylicBackgroundFillColorDefault + SurfaceStrokeColorFlyout。
 * ====================================================================== */
.wui-breadcrumb-dropdown {
  box-sizing: border-box;
  overflow: auto;
  min-width: 96px;
  max-width: 456px;
  min-height: 40px;
  max-height: 758px;
  padding: 2px 0;
  outline: none;
  background: var(--wui-flyout-presenter-background);
  border: 1px solid var(--wui-flyout-border-theme);
}

/* 下拉项(Inline → EllipsisDropDown 视觉态):Padding="11,7,11,9" + Margin="5,3";
   背景 SubtleFill 系列取同源画刷的 menu-flyout-item token(差异见 wiki) */
.wui-breadcrumb-dropdown-item {
  display: block;
  width: calc(100% - 10px);
  margin: 3px 5px;
  padding: 7px 11px 9px;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-application-foreground-theme); /* …DropDownItemForeground* = TextFillColorPrimary */
  text-align: left;
  white-space: nowrap;
  cursor: default;
  background: var(--wui-menu-flyout-item-background); /* …DropDownItemBackground = SubtleFillColorTransparent */
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
}

.wui-breadcrumb-dropdown-item:hover {
  background: var(--wui-menu-flyout-item-background-pointer-over); /* SubtleFillColorSecondary */
}

.wui-breadcrumb-dropdown-item:active {
  background: var(--wui-menu-flyout-item-background-pressed); /* SubtleFillColorTertiary */
}

/* 系统焦点视觉:省略号下拉项 PART_LayoutRoot.FocusVisualMargin=-3(BreadcrumbBar.xaml L33)
   → 两环全在元素外 secondary [0,1] + primary [1,3] = 系统双环 */
.wui-breadcrumb-dropdown-item:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.wui-breadcrumb-dropdown-item:focus:not(:focus-visible) {
  outline: none;
}

/* 入场:8px 上滑淡入(wui-flyout-in,基建 Web 适配增强);离场快速淡出 */
.wui-breadcrumb-dropdown-enter-active {
  animation: wui-flyout-in var(--wui-duration-normal) var(--wui-easing-standard) both;
}

.wui-breadcrumb-dropdown-leave-active {
  animation: wui-fade-out var(--wui-duration-fast) var(--wui-easing-standard) both;
}
</style>
