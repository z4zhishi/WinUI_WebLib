<script setup lang="ts">
// TitleBar —— WinUI 3 TitleBar 控件的 Web 复刻:应用图标 + 标题 + 副标题 + 中部内容 +
//   左侧返回/窗格切换按钮 + 右侧系统按钮占位(最小化/最大化/关闭,演示性,不发窗口操作)。
// 视觉规格:CK/WinUI-Reference/controls/dev/TitleBar/TitleBar.xaml(DefaultTitleBarStyle,
//   **不在 dxaml/themes/generic.xaml 内**,模板与主题资源在 dev 控件目录,已定位并逐值对照):
//   - 模板:PART_LayoutRoot 单行 Grid,高 {ThemeResource TitleBarCompactHeight}=32
//     (ExpandedHeight=48,Content/LeftHeader/RightHeader 任一存在时切换,源 TitleBar.cpp UpdateHeight L437);
//     12 列:左内边距 2 / 返回钮 Auto / 窗格钮 Auto / LeftHeader Auto / LeftHeaderPadding 14 /
//     图标 Auto(16×16,右距 16)/ 标题 Auto(Caption 12px,右距 8)/ 副标题 Auto(Caption 12px,右距 16)/
//     内容 */ 右侧标头 Auto / 最小拖拽区 48 / 右内边距 0;
//   - LeftHeaderPadding 列:IsBackButtonVisible 与 IsPaneToggleButtonVisible **恰有一个**可见时收窄为 2
//     (TitleBar_themeresources.xaml TitleBarHeaderNegativeInsetPaddingWidth;源 UpdateLeftHeaderSpacing
//     L813:L817「Visible == PaneVisible ? Default : NegativeInset」);
//   - 文字:PART_TitleText/PART_SubtitleText 均 CaptionTextBlockStyle(12px)+ CharacterEllipsis + NoWrap,
//     副标题用 TitleBarSubtitleForegroundBrush;
//   - 返回/窗格钮:TitleBarBackButtonStyle / TitleBarPaneToggleButtonStyle —— 宽 40、Margin 2、
//     字形 16px(E72B / E700,Segoe Fluent Icons)、圆角 ControlCornerRadius(4)、背景全态 SubtleFill*;
//     Normal/PointerOver/Pressed/Disabled 四态即时切换(VisualState.Setters,无过渡动画);
//   - 失活(窗口未激活)视觉:源经 InputActivationListener 自动进入各 Deactivated 态 —— 文字/按钮转
//     TitleBarDeactivatedForegroundBrush(TextFillColorTertiary)、图标/标头/内容 Opacity 0.5
//     (TitleBarDeactivatedOpacity)。浏览器内无窗口激活概念,以 inactive prop 手动模拟(Web 增强);
//   - Compact 显示态(源 OnSizeChanged L163):内容期望宽度放不进内容列 → PART_TitleText/PART_SubtitleText
//     Collapsed、内容左对齐 + 右距 16(TitleBarCompactContentMargin 0,0,16,0)。Web 侧以
//     ResizeObserver 测「内容列 scrollWidth > clientWidth」近似(wiki 记录与源 DesiredSize 判定的差异)。
// 行为规格(对照 TitleBar.idl + TitleBar.cpp):
//   - 事件:BackRequested / PaneToggleRequested(按钮点击触发;返回钮 IsBackButtonEnabled=false 时不触发);
//   - 拖拽区语义:真实窗口中整条标题栏可拖动、交互控件自动排除(源 UpdateInteractableElementsList,
//     WindowsAppSDK 2.1 起 TitleBar.Content 内交互控件自动排除、IsDragRegion 可覆写、
//     RecomputeDragRegions() 重算)。浏览器无窗口拖拽 —— 根元素标 data-wui-drag-region="true",
//     交互子元素(button/a/input/…)自动标 data-wui-drag-region="false"(MutationObserver 驱动),
//     仅作语义演示,无真实拖拽(wiki 与示例页均注明「浏览器内为视觉复刻,无真实窗口能力」);
//   - 右侧最小化/最大化/关闭三钮为任务要求的演示性占位(WinUI 中系统标题栏按钮由窗口层提供、
//     不在本控件模板内):点击仅发 minimizeRequested / maximizeRequested / closeRequested 事件。
import { computed, onBeforeUnmount, onMounted, reactive, ref, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 标题文本(WinUI Title);#title slot 优先。 */
    title?: string
    /** 副标题文本(WinUI Subtitle);#subtitle slot 优先。 */
    subtitle?: string
    /** 是否显示返回按钮(WinUI IsBackButtonVisible);点击发 backRequested。 */
    isBackButtonVisible?: boolean
    /** 返回按钮可用性(WinUI IsBackButtonEnabled);false 时呈 Disabled 色且不发事件。 */
    isBackButtonEnabled?: boolean
    /** 是否显示窗格切换按钮(WinUI IsPaneToggleButtonVisible);点击发 paneToggleRequested。 */
    isPaneToggleButtonVisible?: boolean
    /** 窗口失活模拟(Web 增强,WinUI 经 InputActivationListener 自动切换 Deactivated 态):
     *  文字转次级色、图标/标头/内容 50% 透明、按钮暂停交互。 */
    inactive?: boolean
    /** 右侧系统按钮占位(最小化/最大化/关闭)可见性(Web 增强,WinUI 由窗口层提供):
     *  演示性按钮,不执行窗口操作,点击仅发对应 *Requested 事件。 */
    isCaptionButtonsVisible?: boolean
  }>(),
  {
    title: '',
    subtitle: '',
    isBackButtonVisible: false,
    isBackButtonEnabled: true,
    isPaneToggleButtonVisible: false,
    inactive: false,
    isCaptionButtonsVisible: true,
  },
)

// —— 事件(WinUI BackRequested / PaneToggleRequested;三个 *Requested 为 Web 增强演示事件)——
const emit = defineEmits<{
  /** 点击返回按钮(WinUI BackRequested;禁用时不触发)。 */
  backRequested: []
  /** 点击窗格切换按钮(WinUI PaneToggleRequested)。 */
  paneToggleRequested: []
  /** 点击最小化占位按钮(Web 增强;不执行窗口操作)。 */
  minimizeRequested: []
  /** 点击最大化占位按钮(Web 增强;不执行窗口操作)。 */
  maximizeRequested: []
  /** 点击关闭占位按钮(Web 增强;不执行窗口操作)。 */
  closeRequested: []
}>()

defineOptions({ name: 'WuiTitleBar', inheritAttrs: false })

// Segoe Fluent Icons 字形(与源 Style 的 Content Setter 一致:E72B 返回 / E700 窗格;
// E921/E922/E8BB 为系统标题栏 Chrome 按钮标准字形)
const GLYPH_BACK = '\uE72B'
const GLYPH_PANE = '\uE700'
const GLYPH_MINIMIZE = '\uE921'
const GLYPH_MAXIMIZE = '\uE922'
const GLYPH_CLOSE = '\uE8BB'

const slots = useSlots()

// —— 文字部件可见性:prop 非空或 slot 提供(等价源 TitleText/SubtitleText 的 Visible/Collapsed 态)——
const showTitle = computed(() => props.title !== '' || slots.title !== undefined)
const showSubtitle = computed(() => props.subtitle !== '' || slots.subtitle !== undefined)

// —— slot 填充测量:wrapper 子元素计数(v-if/v-for 动态 slot 同样可靠)——
const rootEl = ref<HTMLElement | null>(null)
const iconEl = ref<HTMLElement | null>(null)
const leftHeaderEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const contentPresenterEl = ref<HTMLElement | null>(null)
const rightHeaderEl = ref<HTMLElement | null>(null)

const filled = reactive({ icon: false, leftHeader: false, content: false, rightHeader: false })
/** Compact 显示态:内容列放不下内容(Web 近似,见头注)。 */
const isCompact = ref(false)

/** 内容/左侧标头/右侧标头任一存在 → ExpandedHeight 48(源 UpdateHeight L437)。 */
const hasExpansion = computed(
  () => filled.content || filled.leftHeader || filled.rightHeader,
)

/** 左标头内边距列收窄:返回钮与窗格钮恰有一个可见(源 UpdateLeftHeaderSpacing L817)。 */
const negativeInset = computed(
  () => props.isBackButtonVisible !== props.isPaneToggleButtonVisible,
)

function measure(): void {
  filled.icon = (iconEl.value?.childElementCount ?? 0) > 0
  filled.leftHeader = (leftHeaderEl.value?.childElementCount ?? 0) > 0
  filled.content = (contentPresenterEl.value?.childElementCount ?? 0) > 0
  filled.rightHeader = (rightHeaderEl.value?.childElementCount ?? 0) > 0
  const grid = contentEl.value
  isCompact.value =
    filled.content && grid !== null && grid.scrollWidth > grid.clientWidth + 0.5
}

// —— 拖拽区语义标记(演示性):交互控件自动排除出拖拽区(源 UpdateInteractableElementsList 等价)——
const INTERACTIVE_SELECTOR =
  'button, a, input, select, textarea, [contenteditable="true"], [contenteditable=""], [role="button"]'

function updateDragRegions(): void {
  const root = rootEl.value
  if (root === null) return
  root.setAttribute('data-wui-drag-region', 'true')
  const interactive = root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR)
  interactive.forEach((element) => {
    element.setAttribute('data-wui-drag-region', 'false')
  })
}

// —— 观察器:尺寸(Compact/Expanded 重测)+ 子树结构(动态 slot / 交互控件进出拖拽区)——
let resizeObserver: ResizeObserver | null = null
let mutationObserver: MutationObserver | null = null

onMounted(() => {
  measure()
  updateDragRegions()
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => measure())
    if (rootEl.value !== null) resizeObserver.observe(rootEl.value)
    if (contentEl.value !== null) resizeObserver.observe(contentEl.value)
  }
  if (typeof MutationObserver === 'function') {
    mutationObserver = new MutationObserver(() => {
      measure()
      updateDragRegions()
    })
    if (rootEl.value !== null) {
      mutationObserver.observe(rootEl.value, { childList: true, subtree: true })
    }
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
  resizeObserver = null
  mutationObserver = null
})
</script>

<template>
  <!-- PART_LayoutRoot:单行 Grid,高 32/48;Background = TitleBar Background(默认 Transparent)-->
  <div
    v-bind="$attrs"
    class="wui-title-bar"
    :class="{
      'wui-title-bar--expanded': hasExpansion,
      'wui-title-bar--compact': isCompact,
      'wui-title-bar--inactive': inactive,
      'wui-title-bar--negative-inset': negativeInset,
    }"
    data-wui-drag-region="true"
  >
    <!-- PART_BackButton(列 2,源 DeferLoadStrategy Lazy + Collapsed 默认):宽 40、字形 E72B -->
    <button
      v-if="isBackButtonVisible"
      type="button"
      class="wui-title-bar__button"
      aria-label="Back"
      :disabled="!isBackButtonEnabled"
      @click="emit('backRequested')"
    >
      <span class="wui-title-bar__glyph" aria-hidden="true">{{ GLYPH_BACK }}</span>
    </button>

    <!-- PART_PaneToggleButton(列 3):宽 40、字形 E700 -->
    <button
      v-if="isPaneToggleButtonVisible"
      type="button"
      class="wui-title-bar__button"
      aria-label="Navigation"
      @click="emit('paneToggleRequested')"
    >
      <span class="wui-title-bar__glyph" aria-hidden="true">{{ GLYPH_PANE }}</span>
    </button>

    <!-- PART_LeftHeaderPresenter(列 4)-->
    <div v-show="$slots['left-header'] !== undefined" ref="leftHeaderEl" class="wui-title-bar__left-header">
      <slot name="left-header" />
    </div>

    <!-- PART_Icon(列 6,源为 Viewbox 16×16 + 右距 16;等比缩放未复刻,见 wiki)-->
    <div v-show="$slots.icon !== undefined" ref="iconEl" class="wui-title-bar__icon">
      <slot name="icon" />
    </div>

    <!-- PART_TitleText(列 7):Caption 12px、右距 8、截断省略 -->
    <div v-if="showTitle" class="wui-title-bar__title">
      <slot name="title">{{ title }}</slot>
    </div>

    <!-- PART_SubtitleText(列 8):Caption 12px、右距 16、次级色、截断省略 -->
    <div v-if="showSubtitle" class="wui-title-bar__subtitle">
      <slot name="subtitle">{{ subtitle }}</slot>
    </div>

    <!-- PART_ContentPresenterGrid(列 9,默认居中;Compact 态左对齐 + 右距 16)-->
    <div ref="contentEl" class="wui-title-bar__content">
      <div v-show="$slots.default !== undefined" ref="contentPresenterEl" class="wui-title-bar__content-presenter">
        <slot />
      </div>
    </div>

    <!-- PART_RightHeaderPresenter(列 10)-->
    <div v-show="$slots['right-header'] !== undefined" ref="rightHeaderEl" class="wui-title-bar__right-header">
      <slot name="right-header" />
    </div>

    <!-- 系统按钮占位(列 11-13 右端对齐;WinUI 中由窗口层提供,此处为演示性按钮)-->
    <div v-if="isCaptionButtonsVisible" class="wui-title-bar__caption">
      <button
        type="button"
        class="wui-title-bar__caption-button"
        aria-label="Minimize"
        @click="emit('minimizeRequested')"
      >
        <span class="wui-title-bar__glyph" aria-hidden="true">{{ GLYPH_MINIMIZE }}</span>
      </button>
      <button
        type="button"
        class="wui-title-bar__caption-button"
        aria-label="Maximize"
        @click="emit('maximizeRequested')"
      >
        <span class="wui-title-bar__glyph" aria-hidden="true">{{ GLYPH_MAXIMIZE }}</span>
      </button>
      <button
        type="button"
        class="wui-title-bar__caption-button"
        aria-label="Close"
        @click="emit('closeRequested')"
      >
        <span class="wui-title-bar__glyph" aria-hidden="true">{{ GLYPH_CLOSE }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 TitleBar.xaml DefaultTitleBarStyle ControlTemplate 的 12 列 Grid:
 * 0 左内边距 2 | 1 返回钮 | 2 窗格钮 | 3 LeftHeader | 4 左标头内边距 14(负缩进 2)
 * 5 图标 | 6 标题 | 7 副标题 | 8 内容(星号列) | 9 右侧标头 | 10 最小拖拽区 48 | 11 右内边距 0
 */
.wui-title-bar {
  --tb-left-header-pad: 14px; /* TitleBarLeftHeaderPaddingWidth */
  display: grid;
  grid-template-columns:
    2px auto auto auto var(--tb-left-header-pad)
    minmax(0, max-content) minmax(0, max-content) minmax(0, max-content)
    minmax(0, 1fr) minmax(0, max-content) 48px 0px;
  box-sizing: border-box;
  height: 32px; /* TitleBarCompactHeight(ThemeResource,TitleBar_themeresources.xaml L77) */
  font-family: var(--wui-content-control-theme-font-family);
  /* TitleBarForegroundBrush = TextFillColorPrimaryBrush;theme.css 未提取该画刷族
     (定义于 CommonStyles/Common_themeresources_any.xaml),按最近似 token 映射,见 wiki 差异节 */
  color: var(--wui-application-foreground-theme);
  background: transparent; /* 默认 Style:Background = Transparent */
  user-select: none;
}

/* ExpandedHeight:Content / LeftHeader / RightHeader 任一存在(源 UpdateHeight) */
.wui-title-bar--expanded {
  height: 48px;
}

/* LeftHeaderSpacingGroup → NegativeInsetSpacing:返回钮与窗格钮恰有一个可见(源 L817) */
.wui-title-bar--negative-inset {
  --tb-left-header-pad: 2px; /* TitleBarHeaderNegativeInsetPaddingWidth */
}

/* —— 返回 / 窗格切换按钮(TitleBarBackButtonStyle / TitleBarPaneToggleButtonStyle)—— */
.wui-title-bar__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px; /* TitleBarBackButtonWidth = TitleBarPaneToggleButtonWidth */
  margin: 2px; /* 源 Style Margin=2 */
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family); /* SymbolThemeFontFamily */
  font-size: 16px; /* 源 Style FontSize=16 */
  color: inherit; /* TitleBarBackButtonForeground = TextFillColorPrimaryBrush */
  background: transparent; /* TitleBarBackButtonBackground = SubtleFillColorTransparentBrush */
  border: none;
  /* ControlCornerRadius(4)无同名 token,按项目既有约定取最近似圆角 token(见 wiki 差异节) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  cursor: default;
}

/* PointerOver:SubtleFillColorSecondaryBrush / 前景不变(源 ForegroundPointerOver = Primary)。
   SubtleFill* 族 theme.css 未提取,按 MenuBarItem 既有约定取最近似 token */
.wui-title-bar__button:hover:not(:disabled) {
  background: var(--wui-grid-view-item-background-pointer-over);
}

/* Pressed:SubtleFillColorTertiaryBrush / 前景 Secondary */
.wui-title-bar__button:active:not(:disabled) {
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-grid-view-item-background-pressed);
}

/* Disabled:ControlFillColorDisabledBrush / TextFillColorDisabledBrush(最近似 token) */
.wui-title-bar__button:disabled {
  color: var(--wui-system-control-disabled-base-medium-low);
  background: var(--wui-text-control-background-disabled);
  cursor: default;
}

/* 焦点视觉:UseSystemFocusVisuals(系统双环)近似为 primary 色单环 outline(项目既有约定) */
.wui-title-bar__button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-title-bar__button:focus:not(:focus-visible) {
  outline: none;
}

/* 字形(源按钮 Content 为 Segoe Fluent Icons 码点) */
.wui-title-bar__glyph {
  line-height: 1;
}

/* —— PART_LeftHeaderPresenter(列 4)—— */
.wui-title-bar__left-header {
  grid-column: 4;
  align-self: center;
  display: flex;
  align-items: center;
  min-width: 0;
}

/* —— PART_Icon(列 6):Viewbox 16×16 + TitleBarIconMargin 0,0,16,0 —— */
.wui-title-bar__icon {
  grid-column: 6;
  align-self: center;
  display: inline-grid;
  place-items: center;
  width: 16px; /* TitleBarIconMaxWidth */
  height: 16px; /* TitleBarIconMaxHeight */
  margin-right: 16px;
  color: inherit;
}

/* —— PART_TitleText(列 7):CaptionTextBlockStyle 12px + TitleBarTitleMargin 0,0,8,0 —— */
.wui-title-bar__title {
  grid-column: 7;
  align-self: center;
  min-width: 0; /* TitleBarTitleMinWidth */
  margin-right: 8px;
  overflow: hidden;
  font-size: 12px; /* CaptionTextBlockStyle FontSize=12 */
  line-height: normal;
  white-space: nowrap;
  text-overflow: ellipsis; /* TextTrimming=CharacterEllipsis + NoWrap */
}

/* —— PART_SubtitleText(列 8):Caption 12px + TitleBarSubtitleMargin 0,0,16,0 —— */
.wui-title-bar__subtitle {
  grid-column: 8;
  align-self: center;
  min-width: 0; /* TitleBarSubtitleMinWidth */
  margin-right: 16px;
  overflow: hidden;
  font-size: 12px;
  line-height: normal;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--wui-application-secondary-foreground-theme); /* TitleBarSubtitleForegroundBrush = TextFillColorSecondaryBrush 近似 */
}

/* —— PART_ContentPresenterGrid(列 9):内容默认居中(TitleBarContentHorizontalAlignment = Center)—— */
.wui-title-bar__content {
  grid-column: 9;
  min-width: 0;
  display: flex;
}

.wui-title-bar__content-presenter {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

/* DisplayModeGroup → Compact:标题/副标题 Collapsed,内容左对齐 + TitleBarCompactContentMargin 0,0,16,0 */
.wui-title-bar--compact .wui-title-bar__content-presenter {
  justify-content: flex-start;
  padding-right: 16px;
}

.wui-title-bar--compact .wui-title-bar__title,
.wui-title-bar--compact .wui-title-bar__subtitle {
  display: none;
}

/* —— PART_RightHeaderPresenter(列 10)—— */
.wui-title-bar__right-header {
  grid-column: 10;
  align-self: center;
  display: flex;
  align-items: center;
  min-width: 0;
}

/*
 * —— 系统按钮占位(最小化/最大化/关闭;Web 增强,WinUI 中为窗口层系统 chrome)——
 * 横跨「右侧标头之后」三列并右端对齐:按钮贴最右(系统按钮位置),
 * 与右侧标头之间保留列 11 的 48px 最小拖拽区(TitleBarMinDragRegionWidth)。
 */
.wui-title-bar__caption {
  grid-column: 10 / 13;
  justify-self: end;
  display: flex;
  align-items: stretch;
}

.wui-title-bar__caption-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px; /* Windows 系统标题栏按钮标准宽度(系统 chrome 值,非本控件资源) */
  margin: 0;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: 10px; /* 系统 Chrome 按钮字形字号 */
  color: inherit;
  background: transparent;
  border: none;
  border-radius: 0; /* 系统按钮为直角 */
  cursor: default;
}

/* 系统按钮悬停/按压同为 Subtle 高亮(源控件的 SubtleFill* 约定;真实窗口关闭钮悬停为
   系统红 #C42B1C,该值属系统 chrome 且无 token —— 差异记录 wiki) */
.wui-title-bar__caption-button:hover:not(:disabled) {
  background: var(--wui-grid-view-item-background-pointer-over);
}

.wui-title-bar__caption-button:active:not(:disabled) {
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-grid-view-item-background-pressed);
}

.wui-title-bar__caption-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: -2px;
}

.wui-title-bar__caption-button:focus:not(:focus-visible) {
  outline: none;
}

/*
 * —— 失活(窗口未激活)Deactivated 态(Web 以 inactive prop 模拟;源经
 *    InputActivationListener 自动切换):文字/按钮转 TitleBarDeactivatedForegroundBrush
 *    (TextFillColorTertiaryBrush 近似),图标/标头/内容 Opacity = TitleBarDeactivatedOpacity 0.5。
 *    按钮暂停交互(pointer-events:none)以呈现「失活不可点」语义。
 */
.wui-title-bar--inactive {
  color: var(--wui-system-control-foreground-base-medium-low); /* TextFillColorTertiaryBrush 近似(#72000000 vs #00000066) */
}

.wui-title-bar--inactive .wui-title-bar__subtitle {
  color: var(--wui-system-control-foreground-base-medium-low); /* TitleBarSubtitleDeactivatedForegroundBrush 同为 Tertiary */
}

.wui-title-bar--inactive .wui-title-bar__icon,
.wui-title-bar--inactive .wui-title-bar__left-header,
.wui-title-bar--inactive .wui-title-bar__content,
.wui-title-bar--inactive .wui-title-bar__right-header {
  opacity: 0.5; /* TitleBarDeactivatedOpacity(theme.css 无透明度 token,取源值,见 wiki) */
}

.wui-title-bar--inactive .wui-title-bar__caption {
  opacity: 0.5;
}

.wui-title-bar--inactive .wui-title-bar__button,
.wui-title-bar--inactive .wui-title-bar__caption-button {
  pointer-events: none;
  background: transparent;
}
</style>
