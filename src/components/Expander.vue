<script setup lang="ts">
// Expander —— WinUI Expander 的 Web 复刻:带头部的可展开 / 收起容器。
// 视觉规格:CK/WinUI-Reference/controls/dev/Expander/Expander.xaml + Expander_themeresources.xaml
//   (头部按钮四交互态 Normal/PointerOver/Pressed/Disabled、 chevron 32x32/边距 20,0,8,0/字形 12px、
//   头部 MinHeight 48、内边距 头部 16,0,0,0 / 内容 16、边框厚度 Down 1,0,1,1 / Up 1,1,1,0、圆角按
//   Top/BottomCornerRadiusFilterConverter 语义裁切)。颜色取 src/styles/theme.css 最近似 --wui-* token
//   (Card*/Subtle*/TextFill* 系列 token 未生成,映射表见 wiki/controls/Expander.md 差异节);
//   Left/Right 展开方向为任务规格要求的 Web 扩展(参照源枚举仅 Down/Up,见 Expander.idl L46-L49)。
// 动效:展开 / 收起按 Expander.xaml Expand*/Collapse* 故事板逐键复刻 —— 展开 333ms +
//   KeySpline (0.0,0.0,0.0,1.0)(L44/L85)、收起 167ms + KeySpline (1.0,1.0,0.0,1.0)(L57);
//   内容区以 grid-template-rows 过渡实现高度动画(Left/Right 时为 grid-template-columns 宽度过渡)。
import { computed, ref, useAttrs, useId, onBeforeUnmount } from 'vue'
import WuiFontIcon from './FontIcon.vue'
import '../styles/animations.css'

/** WinUI ExpandDirection 枚举;Left/Right 为 Web 扩展值(参照源仅 Down/Up)。 */
type ExpandDirectionValue = 'Down' | 'Up' | 'Left' | 'Right'

const props = withDefaults(
  defineProps<{
    /** 头部文本(WinUI Header);同名 slot 优先,slot 为空时按本属性渲染,均为空则不渲染文本。 */
    header?: string
    /** 展开方向(WinUI ExpandDirection):内容相对头部的方向,箭头旋向随动。 */
    expandDirection?: ExpandDirectionValue
    /** 禁用(WinUI IsEnabled=false):头部不可点击 / 聚焦,呈禁用配色;内容不可交互。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    expandDirection: 'Down',
    disabled: false,
  },
)

// —— IsExpanded 双向绑定(WinUI IsExpanded)——
const isExpanded = defineModel<boolean>('isExpanded', { default: false })

// —— 事件(WinUI Expanding/Expanded/Collapsing/Collapsed;仅用户交互时触发)——
const emit = defineEmits<{
  expanding: []
  expanded: []
  collapsing: []
  collapsed: []
}>()

function toggle(): void {
  if (props.disabled) return
  const next = !isExpanded.value
  // 次序对照 WinUI:Collapse/Expand 前先触发 Expanding/Collapsing(Expander.cpp OnIsExpandedChanged)。
  if (next) emit('expanding')
  else emit('collapsing')
  isExpanded.value = next
  scheduleSettle(next ? 'expanded' : 'collapsed')
}

// —— 过渡结束通知(expanded/collapsed 在动画结束后触发,对照 WinUI 动画完成时机)——
// 主路径:clip 元素自身的 grid-template-rows/columns transitionend(嵌套 Expander 的事件被
// target 过滤);兜底:定时器(时长 + 60ms,覆盖 reduced-motion 下 transition 仍触发但时序漂移)。
// 两者共用 settleToken 保证每次切换只发一次。
const EXPAND_MS = 333 // 源 Expand* KeyTime 0:0:0.333(Expander.xaml L44)
const COLLAPSE_MS = 167 // 源 Collapse* KeyTime 0:0:0.167(Expander.xaml L57)

const clipRef = ref<HTMLElement | null>(null)
let settleToken = 0
let settleTimer: ReturnType<typeof setTimeout> | undefined

function clearSettle(): void {
  if (settleTimer !== undefined) {
    clearTimeout(settleTimer)
    settleTimer = undefined
  }
}

function scheduleSettle(kind: 'expanded' | 'collapsed'): void {
  clearSettle()
  const token = ++settleToken
  settleTimer = setTimeout(() => {
    if (token !== settleToken) return
    settleTimer = undefined
    if (kind === 'expanded') emit('expanded')
    else emit('collapsed')
  }, (kind === 'expanded' ? EXPAND_MS : COLLAPSE_MS) + 60)
}

function onTransitionEnd(event: TransitionEvent): void {
  // 只认 clip 自身的高度 / 宽度过渡;内容元素(含嵌套 Expander)的事件冒泡一律忽略。
  if (event.target !== clipRef.value) return
  if (event.propertyName !== 'grid-template-rows' && event.propertyName !== 'grid-template-columns')
    return
  clearSettle()
  ++settleToken // 使兜底定时器失效
  if (isExpanded.value) emit('expanded')
  else emit('collapsed')
}

onBeforeUnmount(clearSettle)

// —— 方向派生 ——
const isHorizontal = computed(() => props.expandDirection === 'Left' || props.expandDirection === 'Right')
const directionClass = computed(() => `wui-expander--${props.expandDirection.toLowerCase()}`)

// 箭头旋向随动:基底字形为 ChevronDown(E70D,源 ExpanderChevronDownGlyph),按方向 + 状态旋转。
// Down:收起朝下(源 Down 态回退字形)展开翻转;Up 反向;Left/Right 为同构推演的 Web 扩展。
const chevronRotation = computed(() => {
  switch (props.expandDirection) {
    case 'Up':
      return isExpanded.value ? '0deg' : '180deg'
    case 'Left':
      return isExpanded.value ? '-90deg' : '90deg'
    case 'Right':
      return isExpanded.value ? '90deg' : '-90deg'
    default:
      return isExpanded.value ? '180deg' : '0deg'
  }
})

const chevronStyle = computed(() => ({ '--wui-chevron-rot': chevronRotation.value }))

// —— $attrs 路由(单根控件,inheritAttrs: false)——
// 根元素只透传非交互 attrs(class/style/id/data-*/title/事件监听等);
// aria-* 路由到内部头部按钮,保证无障碍属性真正作用到交互元素(我们的 aria-expanded 写在前,
// 调用方同名属性覆盖在后)。
const attrs = useAttrs()

const rootAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const key of Object.keys(attrs)) {
    if (!key.startsWith('aria-')) rest[key] = attrs[key]
  }
  return rest
})

const headerAria = computed(() => {
  const picked: Record<string, unknown> = {}
  for (const key of Object.keys(attrs)) {
    if (key.startsWith('aria-')) picked[key] = attrs[key]
  }
  return picked
})

// 内容区 id:供头部 aria-controls 关联(ARIA disclosure 模式)。
const contentId = useId()
const hasHeaderText = computed(() => props.header !== '')
</script>

<template>
  <div
    v-bind="rootAttrs"
    class="wui-expander"
    :class="[
      directionClass,
      {
        'wui-expander--expanded': isExpanded,
        'wui-expander--horizontal': isHorizontal,
        'wui-expander--disabled': disabled,
      },
    ]"
  >
    <!-- 头部按钮(WinUI 模板的 ExpanderHeader ToggleButton;IsTabStop=false 的是外壳,交互焦点在头部) -->
    <button
      type="button"
      class="wui-expander-header"
      :style="chevronStyle"
      :aria-expanded="isExpanded"
      :aria-controls="contentId"
      :disabled="disabled"
      v-bind="headerAria"
      @click="toggle"
    >
      <span v-if="hasHeaderText || $slots.header" class="wui-expander-header-content">
        <slot name="header">{{ header }}</slot>
      </span>
      <span v-else class="wui-expander-header-content" aria-hidden="true"></span>
      <span class="wui-expander-chevron" aria-hidden="true">
        <span class="wui-expander-chevron-icon">
          <WuiFontIcon glyph="&#xE70D;" :font-size="12" />
        </span>
      </span>
    </button>

    <!-- 内容裁剪区(WinUI ExpanderContentClip;0fr/1fr 网格过渡 = 源 RenderTransform + composition clip 的 Web 等价) -->
    <div
      :id="contentId"
      ref="clipRef"
      class="wui-expander-clip"
      @transitionend="onTransitionEnd"
    >
      <div class="wui-expander-clip-inner">
        <div class="wui-expander-content">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 controls/dev/Expander/Expander.xaml ControlTemplate:
 * Grid(两行:头部 Auto + 内容 *)→ ExpanderHeader(ToggleButton)+ ExpanderContentClip(Border)> ExpanderContent。
 * 颜色 / 圆角 / 时长一律 token;无对应 token 的最近似映射见 wiki/controls/Expander.md 差异节。
 */
.wui-expander {
  display: grid;
  grid-template-rows: auto 1fr; /* Row0=Auto(头部)Row1=*(内容,L107-L110) */
  min-width: 0px;
  font-family: inherit; /* XamlAutoFontFamily 占位,回退浏览器默认 */
  font-size: var(--wui-control-content-theme-font-size);
}

/* Up:头部与内容换行(Row 换位,L99-L102);Left/Right:按列排布(Web 扩展) */
.wui-expander--up .wui-expander-header {
  order: 2;
}

.wui-expander--horizontal {
  grid-template-rows: none;
  grid-template-columns: auto 1fr; /* 头部列 Auto + 内容列 * */
}

.wui-expander--left .wui-expander-header {
  order: 2;
}

/* —— 头部按钮(ExpanderHeaderDownStyle,Expander_themeresources.xaml L89-L294)—— */
.wui-expander-header {
  display: grid;
  grid-template-columns: 1fr auto; /* 内容列 + chevron 列(L97-L99) */
  align-items: center;
  min-height: 48px; /* ExpanderMinHeight = 48 */
  margin: 0;
  padding: 0 0 0 16px; /* ExpanderHeaderPadding = 16,0,0,0 */
  font: inherit;
  color: var(--wui-default-text-foreground-theme); /* ExpanderHeaderForeground(TextFillColorPrimary 最近似) */
  text-align: left;
  background: var(--wui-flyout-presenter-background); /* ExpanderHeaderBackground(CardBackgroundFillColorDefault 最近似) */
  border: 1px solid var(--wui-system-control-background-base-low); /* ExpanderHeaderBorderBrush(CardStrokeColorDefault 最近似) */
  /* 收起态 = 模板默认整圆角(TemplateBinding CornerRadius);展开态按方向裁切半侧(见下) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.wui-expander-header:disabled {
  cursor: default;
}

/* 展开态圆角裁切(Top/BottomCornerRadiusFilterConverter 语义,仅面向内容一侧归零):
   源在 Expand* 态以 Setter 改写头部圆角,收起回到整圆角。 */
.wui-expander--down.wui-expander--expanded .wui-expander-header {
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius) var(--wui-hyperlink-focus-rect-corner-radius) 0 0;
}

.wui-expander--up.wui-expander--expanded .wui-expander-header {
  border-radius: 0 0 var(--wui-hyperlink-focus-rect-corner-radius) var(--wui-hyperlink-focus-rect-corner-radius);
}

.wui-expander--right.wui-expander--expanded .wui-expander-header {
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius) 0 0 var(--wui-hyperlink-focus-rect-corner-radius);
}

.wui-expander--left.wui-expander--expanded .wui-expander-header {
  border-radius: 0 var(--wui-hyperlink-focus-rect-corner-radius) var(--wui-hyperlink-focus-rect-corner-radius) 0;
}

.wui-expander-header:focus {
  outline: none;
}

/* Focus(项目惯例:Button/ToggleButton 的 :focus-visible 双环 outline) */
.wui-expander-header:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.wui-expander-header-content {
  overflow: hidden;
}

/* —— Chevron(ExpandCollapseChevronBorder 32x32 / 边距 20,0,8,0 / 圆角 4)—— */
.wui-expander-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px; /* ExpanderChevronButtonSize */
  height: 32px;
  margin: 0 8px 0 20px; /* ExpanderChevronMargin = 20,0,8,0 */
  background: transparent; /* ExpanderChevronBackground(SubtleFillColorTransparent) */
  border: 0 solid transparent; /* ExpanderChevronBorderThickness = 0 */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius 最近似 */
}

.wui-expander-chevron-icon {
  display: flex;
  color: var(--wui-default-text-foreground-theme); /* ExpanderChevronForeground(TextFillColorPrimary 最近似) */
  transform: rotate(var(--wui-chevron-rot, 0deg));
  /* 源 ExpandCollapseChevron = controls:AnimatedIcon + AnimatedChevronUpDownSmallVisualSource
     (State NormalOff 收起 / NormalOn 展开;资产总时长 433.33ms,c_durationTicks=43333333,
     1 tick=100ns)。原始 .json 不在 CK 快照内,Web 以旋转过渡复刻翻面;CK 的 Expander.xaml /
     themeresources 仅对内容位移动画定义了 KeySpline,chevron 自身无 XAML KeySpline 可提取
     (曲线烘焙在 Lottie 内),故取 linear(见 wiki/controls/Expander.md 差异节)。 */
  transition: transform 433.33ms linear;
}

/* —— PointerOver:头部前景 / 边框与 Normal 同色(源 themeresources 同键),chevron 底色变 Subtle 次级 —— */
.wui-expander-header:hover:not(:disabled) .wui-expander-chevron {
  background: var(--wui-grid-view-item-background-pointer-over); /* ExpanderChevronPointerOverBackground(SubtleFillColorSecondary 最近似) */
}

/* —— Pressed:chevron 底色变 Subtle 三级 —— */
.wui-expander-header:active:not(:disabled) .wui-expander-chevron {
  background: var(--wui-grid-view-item-background-pressed); /* ExpanderChevronPressedBackground(SubtleFillColorTertiary 最近似) */
}

/* —— Disabled:头部 / chevron 前景同变 TextFillColorDisabled(边框与 Normal 同键,源 Disabled 态一致)—— */
.wui-expander-header:disabled {
  color: var(--wui-toggle-switch-content-foreground-disabled); /* ExpanderHeaderDisabledForeground(TextFillColorDisabled 最近似) */
}

.wui-expander-header:disabled .wui-expander-chevron-icon {
  color: var(--wui-toggle-switch-content-foreground-disabled);
}

/* —— 内容裁剪区:0fr/1fr 网格过渡(Expander.xaml Expand / Collapse 故事板逐键值)——
   展开:333ms + KeySpline (0.0,0.0,0.0,1.0)(L44 强减速曲线,精确转写 cubic-bezier(0,0,0,1));
   收起:167ms + KeySpline (1.0,1.0,0.0,1.0)(L57,精确转写 cubic-bezier(1,1,0,1))。 */
.wui-expander-clip {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 167ms cubic-bezier(1, 1, 0, 1);
}

.wui-expander--expanded .wui-expander-clip {
  grid-template-rows: 1fr;
  transition-duration: 333ms;
  transition-timing-function: cubic-bezier(0, 0, 0, 1);
}

.wui-expander--horizontal .wui-expander-clip {
  grid-template-rows: none;
  grid-template-columns: 0fr;
  transition: grid-template-columns 167ms cubic-bezier(1, 1, 0, 1);
}

.wui-expander--horizontal.wui-expander--expanded .wui-expander-clip {
  grid-template-columns: 1fr;
  transition-duration: 333ms;
  transition-timing-function: cubic-bezier(0, 0, 0, 1);
}

/* 收起后不可见:移出焦点序与可访问性树(过渡完成后隐藏;展开立即可见)。
   visibility 折返时长按源方向区分(audit B3):CollapseDown 内容 Collapsed @0.2s
   (Expander.xaml L53)→ 默认 200ms;CollapseUp @0.167s(L82)→ Up 向覆盖 167ms。
   水平 Left/Right 为 Web 扩展方向(源无此向模板),随 Down 口径取 200ms。 */
.wui-expander-clip-inner {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  visibility: hidden;
  transition: visibility 0s linear 200ms;
}

.wui-expander--up .wui-expander-clip-inner {
  transition-delay: 167ms;
}

.wui-expander--expanded .wui-expander-clip-inner {
  visibility: visible;
  transition-delay: 0s;
}

/* —— 内容区(ExpanderContent:背景 / 边框 / 内边距,圆角取背向头部的半侧)—— */
.wui-expander-content {
  min-height: 48px; /* MinHeight TemplateBinding */
  box-sizing: border-box;
  padding: 16px; /* ExpanderContentPadding = 16 */
  color: var(--wui-default-text-foreground-theme);
  background: var(--wui-combo-box-drop-down-background); /* ExpanderContentBackground(CardBackgroundFillColorSecondary 最近似) */
  border: 1px solid var(--wui-system-control-background-base-low); /* ExpanderContentBorderBrush(CardStrokeColorDefault 最近似) */
  border-radius: 0 0 var(--wui-hyperlink-focus-rect-corner-radius) var(--wui-hyperlink-focus-rect-corner-radius); /* Down:BottomCornerRadiusFilter */
}

/* 边框厚度按方向(Down = ExpanderContentDownBorderThickness 1,0,1,1;Up = 1,1,1,0;Left/Right 同构推演):
   头部自带的相邻边不重复描。 */
.wui-expander--down .wui-expander-content {
  border-top: 0; /* 1,0,1,1 */
}

.wui-expander--up .wui-expander-content {
  border-top: 1px solid var(--wui-system-control-background-base-low); /* 1,1,1,0 */
  border-bottom: 0;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius) var(--wui-hyperlink-focus-rect-corner-radius) 0 0;
}

.wui-expander--right .wui-expander-content {
  border-top: 1px solid var(--wui-system-control-background-base-low); /* 1,1,1,1 减左侧(贴头部) */
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
  border-left: 0;
  border-radius: 0 var(--wui-hyperlink-focus-rect-corner-radius) var(--wui-hyperlink-focus-rect-corner-radius) 0;
}

.wui-expander--left .wui-expander-content {
  border-top: 1px solid var(--wui-system-control-background-base-low); /* 1,1,1,1 减右侧(贴头部) */
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
  border-right: 0;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius) 0 0 var(--wui-hyperlink-focus-rect-corner-radius);
}
</style>
