<script lang="ts">
// PipsPager.vue —— WinUI PipsPager 控件的 Web 复刻(阶段 5 小控件)。
// 事件参数与枚举类型对外导出,供使用方与示例页引用。
/** 方向(WinUI Orientation 枚举,此处取 Web 惯用小写字符串)。 */
export type PipsPagerOrientation = 'horizontal' | 'vertical'
/** 导航按钮可见性(WinUI PipsPagerButtonVisibility 枚举:Visible / VisibleOnPointerOver / Collapsed)。 */
export type PipsPagerButtonVisibility = 'visible' | 'visibleOnPointerOver' | 'collapsed'
/** 环绕模式(WinUI PipsPagerWrapMode 枚举:None / Wrap)。 */
export type PipsPagerWrapMode = 'none' | 'wrap'
/** selectedIndexChanged 事件参数:WinUI 源事件参数类无成员,此处扩展携带前后索引便于消费。 */
export interface PipsPagerSelectedIndexChangedEventArgs {
  oldIndex: number
  newIndex: number
}
</script>

<script setup lang="ts">
// WinUI PipsPager 复刻。视觉对照 controls/dev/PipsPager/PipsPager.xaml(ControlTemplate:
// StackPanel 根 + 前/后导航 Button + ScrollViewer 包裹的 pip 列表)与 PipsPager_themeresources.xaml
// (pip/导航按钮四态样式、尺寸与字号);行为对照 controls/dev/PipsPager/PipsPager.cpp:
//   - NumberOfPages 默认 -1(无限页:选中末 pip 时追加一枚,恒多出「下一页」暗示,见源 UpdatePipsItems 无限分支);
//   - SelectedPageIndex 双向,越界收敛:> pages-1 → pages-1(pages>0)、< 0 → 0、
//     pages=0 时不做检查(源 OnSelectedPageIndexChanged 特殊分支);
//   - MaxVisiblePips 默认 5:pip 区按 min(pip 数, MaxVisiblePips) 裁宽(源 SetScrollViewerMaxSize),
//     选中 pip 滚动到视口中央(源 ScrollToCenterOfViewport,AlignmentRatio 0.5 + 动画);
//   - 导航按钮可见性:Visible 恒显 / VisibleOnPointerOver 悬停或键盘聚焦时显 / Collapsed 移出布局;
//     三种模式下到达边缘(首→前、末→后)一律转入 Hidden 态(Opacity=0 保留布局,可命中,
//     与源 PreviousPageButtonHidden VisualState 一致),Wrap 模式且 pages>1 时豁免;
//     不满足一般可见条件(pages=0 / MaxVisiblePips=0 / 边缘无环绕)时按钮同时转 Disabled
//     (源 UpdateIndividualNavigationButtonVisualState);
//   - 前后按钮点击按源 OnPreviousButtonClicked / OnNextButtonClicked 推进(含 Wrap 回绕);
//   - 键盘:←/↑ 聚焦上一 pip、→/↓ 聚焦下一 pip(源 OnKeyDown 的 FocusManager.TryMoveFocus),
//     Tab 进入 pip 区时直接聚焦选中 pip(源 OnPipsAreaGettingFocus 重定向);
//   - 选中变化触发 selectedIndexChanged(源参数为空,Web 扩展携带 oldIndex/newIndex)。
// 颜色/字号/圆角一律走 --wui-* token;无同名 token 的按源实值在组件局部携带(InfoBar 先例)并在 wiki 记录差异。
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiPipsPager' })

const props = withDefaults(
  defineProps<{
    /** 总页数;负值(默认 -1)表示无限页:pip 数量随选中索引增长,选中最后一个 pip 时追加一个。 */
    numberOfPages?: number
    /** pip 可见数量上限,超出部分通过滚动呈现(选中 pip 居中);默认 5。0 时隐藏全部 pip。 */
    maxVisiblePips?: number
    /** 方向:horizontal(默认,横向排列)/ vertical(纵向排列)。 */
    orientation?: PipsPagerOrientation
    /** 「上一页」按钮可见性,默认 collapsed(源默认值即 Collapsed)。 */
    previousButtonVisibility?: PipsPagerButtonVisibility
    /** 「下一页」按钮可见性,默认 collapsed(源默认值即 Collapsed)。 */
    nextButtonVisibility?: PipsPagerButtonVisibility
    /** 环绕模式:wrap 时末页「下一页」回到首页、首页「上一页」跳到末页,且边缘不隐藏按钮。 */
    wrapMode?: PipsPagerWrapMode
    /** 是否禁用(对应 WinUI Control.IsEnabled)。 */
    disabled?: boolean
  }>(),
  {
    numberOfPages: -1,
    maxVisiblePips: 5,
    orientation: 'horizontal',
    previousButtonVisibility: 'collapsed',
    nextButtonVisibility: 'collapsed',
    wrapMode: 'none',
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 选中页变化时触发(WinUI SelectedIndexChanged;源参数类无成员,此处携带前后索引)。 */
  selectedIndexChanged: [event: PipsPagerSelectedIndexChangedEventArgs]
}>()

/** 当前选中页索引(从 0 起;WinUI SelectedPageIndex,双向)。 */
const selectedPageIndex = defineModel<number>('selectedPageIndex', { default: 0 })

// —— 源布局常量(PipsPager_themeresources.xaml 的尺寸/字号资源)——
/** pip 按钮主轴尺寸:横向 12 宽(PipsPagerHorizontalOrientationButtonWidth),纵向 12 高。 */
const PIP_MAIN_SIZE = 12
/** pip 按钮交叉轴尺寸:横向 24 高、纵向 24 宽(两向均为 24)。 */
const PIP_CROSS_SIZE = 24

// —— 属性收敛(源 DP 均为 int;MaxVisiblePips 的 max(0,·) 见源 CalculateScrollViewerSize)——
const effNumberOfPages = computed(() => {
  const pages = Math.floor(Number(props.numberOfPages))
  return Number.isFinite(pages) ? pages : -1
})

const effMaxVisiblePips = computed(() => {
  const maxPips = Math.floor(Number(props.maxVisiblePips))
  return Number.isFinite(maxPips) ? Math.max(0, maxPips) : 0
})

/** 索引收敛(源 OnSelectedPageIndexChanged:pages>0 时钳到 [0, pages-1],pages=0 不检查,<0 只钳下界)。 */
function coerceIndex(raw: number): number {
  const index = Math.floor(Number.isFinite(raw) ? raw : 0)
  const pages = effNumberOfPages.value
  if (pages > 0 && index > pages - 1) return pages - 1
  if (index < 0) return 0
  return index
}

// —— pip 数量(源 UpdatePipsItems:pages=0 清空;pages<0 无限页;否则等于 pages)——
// 无限页稳态(源 append-only,只增不减):maxVisiblePips ≤ 1 时每次推进都走 minNum 补足分支,size = sel+1;
// ≥ 2 时初始 size = maxVisiblePips,选中落到末 pip 即追加一枚(源 else if SelectedPageIndex == size-1 → Append),
// 恒 size = max(sel+2, maxVisiblePips) —— 选中末 pip 时始终多出「下一页」暗示的一枚。
const pipCount = computed(() => {
  const pages = effNumberOfPages.value
  const maxPips = effMaxVisiblePips.value
  if (pages === 0 || maxPips === 0) return 0
  if (pages < 0) {
    return maxPips <= 1
      ? Math.max(selectedPageIndex.value + 1, maxPips)
      : Math.max(maxPips, selectedPageIndex.value + 2)
  }
  return pages
})

/** pip 滚动区可呈现的数量(源 SetScrollViewerMaxSize 里 min(pagesToDisplay) 的对应物)。 */
const displayedPipCount = computed(() => Math.min(pipCount.value, effMaxVisiblePips.value))

// —— 指针/键盘聚焦状态(VisibleOnPointerOver 模式的显示条件,源 m_isPointerOver / m_isFocused)——
const isPointerOver = ref(false)
const isKeyboardFocused = ref(false)

function onPointerEnter(): void {
  isPointerOver.value = true
}

function onPointerLeave(): void {
  isPointerOver.value = false
}

/** 仅键盘聚焦(:focus-visible)视为源 FocusState != Pointer 的 GotFocus。 */
function onFocusIn(event: FocusEvent): void {
  const target = event.target
  isKeyboardFocused.value = target instanceof HTMLElement && target.matches(':focus-visible')
}

function onFocusOut(): void {
  isKeyboardFocused.value = false
}

/** 边缘隐藏豁免与一般可见判定(源 UpdateIndividualNavigationButtonVisualState 的 isGenerallyVisible)。 */
function isGenerallyVisible(hiddenOnEdge: boolean): boolean {
  const pages = effNumberOfPages.value
  const exemptByWrap = props.wrapMode === 'wrap' && pages > 1
  return (!hiddenOnEdge || exemptByWrap) && pages !== 0 && effMaxVisiblePips.value > 0
}

interface NavButtonState {
  /** 是否处于 Hidden 态(源 PreviousPageButtonHidden:Opacity=0,保留布局仍可命中)。 */
  isHidden: boolean
  /** 是否禁用(!isGenerallyVisible 时源转入 Disabled 态)。 */
  isDisabled: boolean
}

function navButtonState(mode: PipsPagerButtonVisibility, hiddenOnEdge: boolean): NavButtonState {
  const generallyVisible = isGenerallyVisible(hiddenOnEdge)
  const revealed = mode === 'visible' || isPointerOver.value || isKeyboardFocused.value
  return { isHidden: !(revealed && generallyVisible), isDisabled: !generallyVisible }
}

const previousButtonEdge = computed(() => selectedPageIndex.value === 0)
const nextButtonEdge = computed(
  () => effNumberOfPages.value > 0 && selectedPageIndex.value === effNumberOfPages.value - 1,
)

const previousState = computed(() => navButtonState(props.previousButtonVisibility, previousButtonEdge.value))
const nextState = computed(() => navButtonState(props.nextButtonVisibility, nextButtonEdge.value))

// —— 选中变化:收敛写回 + 事件(源 OnSelectedPageIndexChanged 收敛后才 RaiseSelectedIndexChanged)——
watch(
  [selectedPageIndex, effNumberOfPages],
  ([rawIndex], [oldRawIndex]) => {
    const coerced = coerceIndex(rawIndex)
    if (coerced !== rawIndex) {
      // 写回后本 watcher 再次触发,统一在值稳定的分支发事件与滚动
      selectedPageIndex.value = coerced
      return
    }
    if (rawIndex !== oldRawIndex) {
      emit('selectedIndexChanged', { oldIndex: oldRawIndex, newIndex: rawIndex })
    }
  },
)

// —— 选中 pip 滚动到视口中央(源 ScrollToCenterOfViewport:AlignmentRatio 0.5 + AnimationDesired)——
const scrollElement = ref<HTMLElement | null>(null)

function scrollSelectedIntoView(behavior: ScrollBehavior = 'smooth'): void {
  const container = scrollElement.value
  if (!container) return
  const index = coerceIndex(selectedPageIndex.value)
  const target = Math.max(0, index * PIP_MAIN_SIZE - (PIP_MAIN_SIZE * displayedPipCount.value - PIP_MAIN_SIZE) / 2)
  if (props.orientation === 'horizontal') {
    if (Math.abs(container.scrollLeft - target) > 0.5) container.scrollTo({ left: target, behavior })
  } else if (Math.abs(container.scrollTop - target) > 0.5) {
    container.scrollTo({ top: target, behavior })
  }
}

watch([selectedPageIndex, () => props.orientation, displayedPipCount], () => {
  nextTick(() => scrollSelectedIntoView())
})

onMounted(() => {
  // 首次布局不播动画,直接对位
  scrollSelectedIntoView('auto')
})

// —— 导航按钮点击(源 OnPreviousButtonClicked / OnNextButtonClicked,含 Wrap 回绕)——
function goPrevious(): void {
  const pages = effNumberOfPages.value
  if (pages === 0 || pages === 1) return // 源:单页/零页时导航按钮隐藏,保底不推进
  let target = Math.max(0, selectedPageIndex.value - 1)
  if (props.wrapMode === 'wrap' && pages > -1 && selectedPageIndex.value === 0) target = pages - 1
  selectedPageIndex.value = target
}

function goNext(): void {
  const pages = effNumberOfPages.value
  if (pages === 0 || pages === 1) return
  let target = pages > -1 ? Math.min(selectedPageIndex.value + 1, pages - 1) : selectedPageIndex.value + 1
  if (props.wrapMode === 'wrap' && selectedPageIndex.value === pages - 1) target = 0
  selectedPageIndex.value = target
}

function selectPip(index: number): void {
  selectedPageIndex.value = index
}

// —— 键盘:←/↑ 聚焦上一 pip、→/↓ 聚焦下一 pip(源 OnKeyDown,到端点即止不回绕)——
function onRootKeyDown(event: KeyboardEvent): void {
  if (props.disabled) return
  const isBackward = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
  const isForward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
  if (!isBackward && !isForward) return
  const pips = scrollElement.value?.querySelectorAll<HTMLButtonElement>('.wui-pip')
  if (!pips || pips.length === 0) return
  event.preventDefault()
  const active = document.activeElement
  let currentIndex: number
  if (active instanceof HTMLElement && active.classList.contains('wui-pip')) {
    currentIndex = Number(active.dataset.index ?? 0)
  } else {
    // 焦点不在 pip 上(如导航按钮):就近从选中 pip 开始
    currentIndex = Math.min(selectedPageIndex.value, pips.length - 1)
  }
  const targetIndex = currentIndex + (isForward ? 1 : -1)
  if (targetIndex < 0 || targetIndex > pips.length - 1) return
  pips[targetIndex]?.focus()
}

// —— pip 滚动区尺寸(源 SetScrollViewerMaxSize:主轴 = pip 宽 ×(n-1)+ 选中 pip 宽,两向 pip 同尺寸故为 n×12)——
const scrollStyle = computed<CSSProperties>(() => {
  const main = `${PIP_MAIN_SIZE * displayedPipCount.value}px`
  const cross = `${PIP_CROSS_SIZE}px`
  if (props.orientation === 'horizontal') return { maxWidth: main, maxHeight: cross }
  return { maxHeight: main, maxWidth: cross }
})

const PREVIOUS_LABEL = 'Previous page'
const NEXT_LABEL = 'Next page'
</script>

<template>
  <!-- 根:源为 StackPanel(Orientation 绑定),Background=Transparent、左上对齐(inline-flex 收缩布局) -->
  <div
    class="wui-pips-pager"
    :class="`wui-pips-pager--${orientation}`"
    role="group"
    aria-label="PipsPager"
    v-bind="$attrs"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown="onRootKeyDown"
  >
    <!-- 上一页按钮:collapsed 从布局移除(v-if);hidden 态仅置透明(源 Opacity=0 保留命中) -->
    <button
      v-if="previousButtonVisibility !== 'collapsed'"
      type="button"
      class="wui-pips-nav"
      :class="{ 'is-hidden': previousState.isHidden }"
      :disabled="disabled || previousState.isDisabled"
      :title="PREVIOUS_LABEL"
      :aria-label="PREVIOUS_LABEL"
      @click="goPrevious"
    >
      <span class="wui-pips-nav-glyph" aria-hidden="true">&#xEDDB;</span>
    </button>

    <!-- pip 滚动区:超出 MaxVisiblePips 的部分裁剪,选中 pip 居中(源 ScrollViewer + ItemsRepeater) -->
    <div ref="scrollElement" class="wui-pips-scroll" :style="scrollStyle">
      <div class="wui-pips-track">
        <button
          v-for="index in pipCount"
          :key="index - 1"
          type="button"
          class="wui-pip"
          :class="{ 'is-selected': index - 1 === selectedPageIndex }"
          :data-index="index - 1"
          :tabindex="index - 1 === selectedPageIndex ? 0 : -1"
          :disabled="disabled"
          :aria-label="effNumberOfPages > 0 ? `Page ${index} of ${effNumberOfPages}` : `Page ${index}`"
          :aria-current="index - 1 === selectedPageIndex ? 'true' : undefined"
          @click="selectPip(index - 1)"
        >
          <span class="wui-pip-glyph" aria-hidden="true">&#xEA3B;</span>
        </button>
      </div>
    </div>

    <!-- 下一页按钮 -->
    <button
      v-if="nextButtonVisibility !== 'collapsed'"
      type="button"
      class="wui-pips-nav"
      :class="{ 'is-hidden': nextState.isHidden }"
      :disabled="disabled || nextState.isDisabled"
      :title="NEXT_LABEL"
      :aria-label="NEXT_LABEL"
      @click="goNext"
    >
      <span class="wui-pips-nav-glyph" aria-hidden="true">&#xEDDC;</span>
    </button>
  </div>
</template>

<style scoped>
/* —— pip/导航指示色(源实值,controls/dev/CommonStyles/Common_themeresources_any.xaml;
      theme.css 未提取同名 token,按 InfoBar 先例在组件局部携带源值,XAML #AARRGGBB → CSS #RRGGBBAA):
      Normal = ControlStrongFillColorDefault(Light #72000000 45% 黑 / Dark #8BFFFFFF 55% 白)
      PointerOver/Pressed = TextFillColorSecondary(Light #9E000000 62% 黑 / Dark #C5FFFFFF 77% 白)
      Disabled = ControlStrongFillColorDisabled(Light #51000000 32% 黑 / Dark #3FFFFFFF 25% 白)
      悬停/按下比常态更实(源方向),禁用最淡;pip 与导航按钮共用(源两组资源取值相同) */
.wui-pips-pager {
  /* 源:Background="Transparent"、HorizontalAlignment="Left"、VerticalAlignment="Top" */
  display: inline-flex;
  align-items: center;
  background: transparent;
  --wui-pips-indicator: #00000072;
  --wui-pips-indicator-hover: #0000009e;
  --wui-pips-indicator-disabled: #00000051;
}

html[data-theme='dark'] .wui-pips-pager {
  --wui-pips-indicator: #ffffff8b; /* ControlStrongFillColorDefault Dark #8BFFFFFF → 54.5% 白 */
  --wui-pips-indicator-hover: #ffffffc5; /* TextFillColorSecondary Dark #C5FFFFFF → 77% 白 */
  --wui-pips-indicator-disabled: #ffffff3f; /* ControlStrongFillColorDisabled Dark #3FFFFFFF → 24.7% 白 */
}

.wui-pips-pager--vertical {
  flex-direction: column;
}

/* —— pip 滚动区(源 ScrollViewer:滚动条隐藏、仅程序滚动)—— */
.wui-pips-scroll {
  overflow: hidden;
}

.wui-pips-track {
  display: flex;
  align-items: center;
}

.wui-pips-pager--vertical .wui-pips-track {
  flex-direction: column;
}

/* —— pip 按钮(源 PipsPagerButtonBaseStyle:12×24 / 24×12,背景与 1px 边框恒透明,
      CornerRadius = ControlCornerRadius;仅字形字号/颜色分态)—— */
.wui-pip {
  box-sizing: border-box;
  flex: none;
  display: grid;
  place-items: center;
  width: 12px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  cursor: pointer;
}

.wui-pips-pager--vertical .wui-pip {
  width: 24px;
  height: 12px;
}

.wui-pip-glyph {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 4px; /* PipsPagerNormalGlyphFontSize */
  line-height: 1;
  color: var(--wui-pips-indicator);
  user-select: none;
}

/* 选中档字号(PipsPagerSelectedGlyphFontSize = 6):选中态与悬停态共用,按下回到普通档 */
.wui-pip.is-selected .wui-pip-glyph {
  font-size: 6px;
}

/* PointerOver:字号升至选中档 + Secondary 色(源 CommonStates.PointerOver) */
.wui-pip:hover:not(:disabled) .wui-pip-glyph {
  font-size: 6px;
  color: var(--wui-pips-indicator-hover);
}

/* Pressed:字号回落普通档(源 CommonStates.Pressed) */
.wui-pip:active:not(:disabled) .wui-pip-glyph {
  font-size: 4px;
  color: var(--wui-pips-indicator-hover);
}

.wui-pip:disabled .wui-pip-glyph {
  color: var(--wui-pips-indicator-disabled);
  cursor: default;
}

/* 系统焦点视觉(UseSystemFocusVisuals):单环 outline 近似(与既有控件一致) */
.wui-pip:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-pip:focus:not(:focus-visible) {
  outline: none;
}

/* —— 导航按钮(源 PipsPagerNavigationButtonBaseStyle:24×24、字形 8px、按下缩放 0.875;
      水平向整体旋转 -90°,使上/下箭头转为左/右,与源 RenderTransform 一致)—— */
.wui-pips-nav {
  box-sizing: border-box;
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  cursor: pointer;
}

.wui-pips-pager--horizontal .wui-pips-nav {
  transform: rotate(-90deg);
}

.wui-pips-nav-glyph {
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 8px; /* PipsPagerNavigationButtonFontSize */
  line-height: 1;
  color: var(--wui-pips-indicator);
  user-select: none;
}

.wui-pips-nav:hover:not(:disabled) .wui-pips-nav-glyph {
  color: var(--wui-pips-indicator-hover);
}

/* 按下缩放(源 PipsPagerNavigationButtonScalePressed = 0.875,作用于按钮内层 Border) */
.wui-pips-nav:active:not(:disabled) .wui-pips-nav-glyph {
  transform: scale(0.875);
  color: var(--wui-pips-indicator-hover);
}

.wui-pips-nav:disabled .wui-pips-nav-glyph {
  color: var(--wui-pips-indicator-disabled);
  cursor: default;
}

.wui-pips-nav:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-pips-nav:focus:not(:focus-visible) {
  outline: none;
}

/* Hidden 态:仅置透明,保留布局与命中(区别于 Collapsed 的移出布局) */
.wui-pips-nav.is-hidden {
  opacity: 0;
}
</style>
