<script setup lang="ts">
// SelectorBarItem —— WinUI SelectorBarItem 的 Web 复刻:SelectorBar 内的单个选项(文本 + 图标 + 选中指示条)。
// 视觉规格:CK/WinUI-Reference/controls/dev/SelectorBar/SelectorBar.xaml(DefaultSelectorBarItemStyle;
//   SelectorBar 不在 dxaml/themes/generic.xaml 内,模板在 dev 资源字典)+ 同目录 SelectorBar_themeresources.xaml:
//   - 内边距 SelectorBarItemPadding(12,10,12,7,XAML LTRB → CSS 上10 右12 下7 左12;底部 3px 是指示条区);
//   - 圆角 CornerRadius = ControlCornerRadius(4px);BorderThickness 1 但 BorderBrush 全透明(视觉无边框);
//   - 内容行 StackPanel:图标在前文本在后,间距 SelectorBarItemSpacing(8);图标
//     SelectorBarItemIconVisualMargin(-2,0)+ ScaleTransform 0.8(RenderTransformOrigin 0.5,0.5);
//   - 字号 ControlContentThemeFontSize(14)/ FontWeight Normal / TextWrapping Wrap;
//   - 指示条(SelectorBarItemPill):3px 高 × 4px 宽矩形(RadiusX 0.5 / RadiusY 1),贴底水平居中,
//     选中态 Opacity 0→1 + ScaleX 1→4(CompositeTransform 默认以左边缘为原点 → 指示条向右展开,
//     最终 16px 宽;动画 167ms KeySpline(0,0,0,1)= ComboBoxItemScaleAnimationDuration);
//   - CombinedStates 六态(Unselected/Selected × Normal/PointerOver/Pressed)+ DisabledStates:
//     背景全态透明(SelectorBarItemBackground* 均为透明画刷),只变前景 ——
//     Normal/Selected = TextFillColorPrimary;PointerOver 与 Selected*PointerOver/Pressed = TextFillColorSecondary
//     (源 SelectedPressed 也取 ForegroundPointerOver,不是 Pressed 色);UnselectedPressed = TextFillColorTertiary;
//     Disabled = TextFillColorDisabled 且指示条换 DisabledPillFill(AccentFillColorDisabled)。
// 行为规格(对照 docs/design-notes/SelectorBar/selectorBar-functional-spec.md + SelectorBarItem.cpp):
//   - 单选:点击选中;在 SelectorBar 内时选中态由宿主仲裁(经 'wuiSelectorBarContext' 上下文),
//     独立使用(无宿主)时 isSelected 自管(单选语义:置 true);
//   - 键盘:本组件是可聚焦项(IsTabStop=True),宿主以 roving tabindex 编排(选中项 tab 停留);
//   - Disabled 项不可聚焦、不参与方向键移动(宿主侧过滤)。
// 颜色 token(PL11 重定向到 Fluent 权威,SelectorBar_themeresources.xaml):
//   Primary→--wui-text-fill-color-primary、Secondary→--wui-text-fill-color-secondary、
//   Tertiary→--wui-text-fill-color-tertiary、Disabled→--wui-text-fill-color-disabled;
//   指示条填充 AccentFillColorDefaultBrush → --wui-accent-fill-color-default
//   (浅 SystemAccentColorDark1 / 深 Light2,由 PL2 token 分主题方向);
//   禁用指示条 AccentFillColorDisabledBrush → --wui-accent-fill-color-disabled
//   (浅 #37000000 / 深 #28FFFFFF,AARRGGBB→RRGGBBAA)。
import { computed, getCurrentInstance, inject, onMounted, onScopeDispose, ref, watch } from 'vue'
import type { Ref, VNode } from 'vue'
import WuiSymbolIcon from './SymbolIcon.vue'
import type { SymbolValue } from '@/utils/symbolIcons'

/** 选择栏项句柄(与 SelectorBar.vue 中的定义结构化同构;MenuBar/MenuBarItem 同款登记契约)。 */
interface SelectorBarItemHandle {
  element: () => HTMLElement | null
  disabled: () => boolean
  key: () => unknown
  vnode: () => VNode | null
}

/** 选择栏上下文(provide 键 'wuiSelectorBarContext';无宿主时为 null)。 */
interface SelectorBarContext {
  disabled: Readonly<Ref<boolean>>
  items: Readonly<Ref<readonly SelectorBarItemHandle[]>>
  selectedHandle: Readonly<Ref<SelectorBarItemHandle | null>>
  fallbackHandle: Readonly<Ref<SelectorBarItemHandle | null>>
  registerItem: (handle: SelectorBarItemHandle) => () => void
  select: (handle: SelectorBarItemHandle) => void
  deselect: () => void
}

const props = withDefaults(
  defineProps<{
    /** 项文本(WinUI SelectorBarItem.Text);未设置则只渲染图标/自定义内容。 */
    text?: string
    /** 图标(WinUI Icon="Clock" 的 Symbol 枚举便利用法;自定义图标用 #icon slot 承载任意 IconElement)。 */
    icon?: SymbolValue
    /** 禁用本项(WinUI SelectorBarItem.IsEnabled=false;宿主 disabled 会叠加禁用全部项)。 */
    disabled?: boolean
  }>(),
  {
    text: undefined,
    icon: undefined,
    disabled: false,
  },
)

// —— 选中态:独立使用时自管;宿主内由 SelectorBar 仲裁(本模型仅作为外部写入通道)——
const isSelectedModel = defineModel<boolean>('isSelected', { default: false })

defineOptions({ name: 'WuiSelectorBarItem', inheritAttrs: false })

const bar = inject<SelectorBarContext | null>('wuiSelectorBarContext', null)

// —— 句柄(vnode/key 取自当前实例,随父组件重渲染保持新鲜,供宿主按引用/键匹配 SelectedItem)——
const instance = getCurrentInstance()
const rootRef = ref<HTMLButtonElement | null>(null)

const handle: SelectorBarItemHandle = {
  element: () => rootRef.value,
  disabled: () => isDisabled.value,
  key: () => instance?.vnode.key ?? null,
  vnode: () => instance?.vnode ?? null,
}

let unregister: (() => void) | null = null

onMounted(() => {
  if (!bar) return
  unregister = bar.registerItem(handle)
  // WinUI 声明式 IsSelected="True" 的等价:挂载即请求选中(宿主处于挂载期 → 静默采纳,不发事件)
  if (isSelectedModel.value) bar.select(handle)
})

onScopeDispose(() => unregister?.())

// —— 状态合成 ——
const isDisabled = computed(() => props.disabled || (bar ? bar.disabled.value : false))

/** 生效选中态:宿主内 = 宿主仲裁结果;独立使用 = 自身模型。 */
const isSelected = computed(() => (bar ? bar.selectedHandle.value === handle : isSelectedModel.value))

/** roving tabindex:选中项停留 tab;无选中项时落到首项(WinUI TabNavigation Once + 项可聚焦的等价)。 */
const isTabStop = computed(() =>
  bar ? isSelected.value || bar.fallbackHandle.value === handle : true,
)

// —— 交互:点击选中(单选);宿主内改写 isSelected 模型 → 请求宿主选中/取消(WinUI IsSelected 写入语义)——
function onClick(): void {
  if (isDisabled.value) return
  if (bar) {
    bar.select(handle)
  } else {
    isSelectedModel.value = true
  }
}

watch(isSelectedModel, (value) => {
  if (!bar) return
  if (value) bar.select(handle)
  else if (bar.selectedHandle.value === handle) bar.deselect()
})
</script>

<template>
  <button
    v-bind="$attrs"
    ref="rootRef"
    type="button"
    class="wui-selector-bar-item"
    :class="{ 'is-selected': isSelected, 'is-disabled': isDisabled }"
    role="tab"
    :aria-selected="isSelected"
    :tabindex="isTabStop ? 0 : -1"
    :disabled="isDisabled || undefined"
    @click="onClick"
  >
    <!-- 自定义内容(ItemContainer.Child 的等价,渲染在图标/文本之前,对照模板占位位置) -->
    <span v-if="$slots.default" class="wui-selector-bar-item-child"><slot /></span>
    <!-- 图标(IconVisual:Margin -2,0 + Scale 0.8,origin 0.5,0.5) -->
    <span v-if="$slots.icon || icon" class="wui-selector-bar-item-icon">
      <slot name="icon">
        <WuiSymbolIcon :symbol="icon" />
      </slot>
    </span>
    <!-- 文本(TextVisual:14px,Wrap) -->
    <span v-if="text" class="wui-selector-bar-item-text">{{ text }}</span>
    <!-- 选中指示条(SelectorBarItemPill:3×4,RadiusX 0.5/RadiusY 1,贴底居中;选中 ScaleX 4 向右展开) -->
    <span class="wui-selector-bar-item-pill" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
/*
 * 结构对照 SelectorBar.xaml DefaultSelectorBarItemStyle ControlTemplate:
 * PART_ContainerRoot(Grid,CornerRadius 4) > [内容 StackPanel | PART_SelectionVisual 贴底 | PART_CommonVisual 描边]。
 * PL11:前景/指示条全部重定向到 Fluent 权威(SelectorBar_themeresources.xaml):
 * 前景 Normal/Selected=TextFillColorPrimary、PointerOver=Secondary、Pressed=Tertiary、Disabled=Disabled;
 * 指示条 Fill=AccentFillColorDefaultBrush、禁用指示条=AccentFillColorDisabledBrush(背景/描边全态透明)。
 */
.wui-selector-bar-item {
  position: relative;
  flex: 0 0 auto;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  padding: 10px 12px 7px; /* SelectorBarItemPadding(12,10,12,7),底部留指示条区 */
  font-family: inherit; /* ContentControlThemeFontFamily(XamlAutoFontFamily 占位,回退浏览器默认) */
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize = 14 */
  font-weight: 400; /* FontWeight = Normal */
  color: var(--wui-text-fill-color-primary); /* SelectorBarItemForeground = TextFillColorPrimaryBrush */
  background: var(--wui-control-fill-color-transparent); /* SelectorBarItemBackground = SystemControlTransparentBrush */
  border: 1px solid var(--wui-control-fill-color-transparent); /* BorderThickness 1 + 透明描边(几何保真) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px); /* CornerRadius = ControlCornerRadius */
  cursor: pointer;
}

/* —— 内容行(图标 + 文本,间距 SelectorBarItemSpacing = 8)—— */
.wui-selector-bar-item-child,
.wui-selector-bar-item-icon {
  display: inline-flex;
  align-items: center;
}

.wui-selector-bar-item-icon {
  margin: 0 -2px; /* SelectorBarItemIconVisualMargin(-2,0) */
  transform: scale(0.8); /* SelectorBarItemIconScale = 0.8,RenderTransformOrigin 0.5,0.5 */
}

/* StackPanel Spacing(8):相邻内容元素各计一次(child/icon/text 任意相邻组合,指示条除外) */
.wui-selector-bar-item > span:not(.wui-selector-bar-item-pill)
  + span:not(.wui-selector-bar-item-pill) {
  margin-left: 8px; /* SelectorBarItemSpacing */
}

.wui-selector-bar-item-text {
  min-width: 0;
  color: inherit; /* PART_TextVisual Foreground = TemplateBinding Foreground,随状态联动 */
  white-space: normal; /* TextWrapping = Wrap */
}

/* —— CombinedStates(源六态;背景全态透明,仅前景变化)—— */
.wui-selector-bar-item:hover:not(:disabled):not(.is-selected) {
  color: var(--wui-text-fill-color-secondary); /* UnselectedPointerOver = TextFillColorSecondaryBrush */
}

.wui-selector-bar-item:active:not(:disabled):not(.is-selected) {
  color: var(--wui-text-fill-color-tertiary); /* UnselectedPressed = TextFillColorTertiaryBrush */
}

.wui-selector-bar-item.is-selected {
  color: var(--wui-text-fill-color-primary); /* SelectedNormal = TextFillColorPrimaryBrush */
}

/* SelectedPointerOver / SelectedPressed:源均取 ForegroundPointerOver(Secondary,非 Pressed 色) */
.wui-selector-bar-item.is-selected:hover:not(:disabled),
.wui-selector-bar-item.is-selected:active:not(:disabled) {
  color: var(--wui-text-fill-color-secondary);
}

.wui-selector-bar-item:disabled,
.wui-selector-bar-item.is-disabled {
  color: var(--wui-text-fill-color-disabled); /* Disabled = TextFillColorDisabledBrush */
  cursor: default;
}

/* —— 选中指示条(SelectorBarItemPill:Height 3 / Width 4 / RadiusX 0.5 / RadiusY 1 / Margin 0)—— */
.wui-selector-bar-item-pill {
  position: absolute;
  bottom: 0;
  left: calc(50% - 2px); /* 4px 矩形水平居中(HorizontalAlignment=Stretch + 显式 Width 的 XAML 等价) */
  box-sizing: border-box;
  width: 4px;
  height: 3px;
  background: var(--wui-accent-fill-color-default); /* Fill = SelectorBarItemPillFill = AccentFillColorDefaultBrush */
  border-radius: 0.5px / 1px; /* RadiusX 0.5 / RadiusY 1 */
  opacity: 0;
  /* PillTransform(CompositeTransform):默认以元素左上为原点 → ScaleX 4 时指示条自中点向右展开至 16px */
  transform: scaleX(1);
  transform-origin: left center;
}

/* Selected*:Opacity 0→1 + ScaleX 1→4(ComboBoxItemScaleAnimationDuration 167ms,KeySpline 0,0,0,1) */
.wui-selector-bar-item.is-selected .wui-selector-bar-item-pill {
  opacity: 1;
  transform: scaleX(4);
  transition:
    transform var(--wui-duration-fast) cubic-bezier(0, 0, 0, 1),
    opacity var(--wui-duration-fast) cubic-bezier(0, 0, 0, 1);
}

/* DisabledStates:选中项指示条换 DisabledPillFill(保持可见,源 Disabled 态只改 Fill 不改 Opacity) */
.wui-selector-bar-item.is-selected:disabled .wui-selector-bar-item-pill,
.wui-selector-bar-item.is-selected.is-disabled .wui-selector-bar-item-pill {
  background: var(--wui-accent-fill-color-disabled); /* = AccentFillColorDisabledBrush(浅 #37000000 / 深 #28FFFFFF) */
}

/* —— 焦点(UseSystemFocusVisuals 系统焦点环;FocusVisualMargin -2 的扩展量简化为贴边环,wiki 记录)—— */
.wui-selector-bar-item:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 0;
  box-shadow: inset 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.wui-selector-bar-item:focus:not(:focus-visible) {
  outline: none;
}
</style>
