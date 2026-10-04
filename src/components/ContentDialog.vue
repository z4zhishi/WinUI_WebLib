<script lang="ts">
// 模块级导出与类型(<script setup> 内不允许 export)
/** WinUI ContentDialog.DefaultButton 取值(ContentDialogButton 枚举)。 */
export type ContentDialogButtonValue = 'Primary' | 'Secondary' | 'Close' | 'None'

/**
 * 对话框按钮点击事件参数(WinUI ContentDialogButtonClickEventArgs 的简化形态)。
 * WinUI 通过 GetDeferral() 支持异步决定关闭时机;Web 侧简化为同步置
 * `cancel = true` 阻止关闭(异步请在拿到结果后再置isOpen = false,见 wiki)。
 */
export interface ContentDialogButtonClickEventArgs {
  /** 置 true 阻止对话框关闭(WinUI ContentDialogButtonClickEventArgs.Cancel)。 */
  cancel: boolean
}
</script>

<script setup lang="ts">
// ContentDialog.vue —— WinUI ContentDialog 控件的 Web 复刻(阶段 3 弹层族)。
//
// 视觉规格(WinUI 3 模板,取分隔线版;权威 = controls/dev,dxaml generic.xaml 仅作模板结构锚点):
//   CK/WinUI-Reference/controls/dev/CommonStyles/ContentDialog_themeresources.xaml(WinUI 3 现行
//   模板:ContentDialogPadding 24 均分、标题 SemiBold、内容区底部分隔线
//   ContentDialogSeparatorThickness 0,0,0,1、命令区五列网格 ContentDialogButtonSpacing 8;
//   出入场动效 = DialogShowing 1.05→1 @250ms + DialogHidden 1→1.05 @167ms,
//   KeySpline 0,0,0,1,层根 Opacity 83ms 线性 —— 见 <style> 尾段注释);
//   CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L8370-8665(TargetType="ContentDialog"
//   遗留模板段:LayoutRoot 全屏底 → BackgroundElement 面板 MinWidth 320/MaxWidth 548/MinHeight 184/
//   MaxHeight 756 → DialogSpace[标题 20px / 内容 14px / CommandSpace 命令区];其 500ms 动效已弃用)。
//   颜色一律 theme.css 既有 --wui-* token(面板三色 --wui-content-dialog-*、遮罩取锚定模板
//   LayoutRoot 的 SystemControlPageBackgroundMediumAltMedium → --wui-system-control-page-background-
//   medium-alt-medium;按钮状态复用 WuiButton 同款 button/accent token),无硬编码色值,
//   逐项对照表见 wiki/controls/ContentDialog.md 差异节。
//
// 行为规格(ContentDialog.cs / 官方示例):
//   - 模态:全屏遮罩挡指针,遮罩点击不关(WinUI 语义,只能按钮 / Esc 关闭);
//   - Esc → closeButtonClick(触发 CloseButton 语义,args.cancel 可阻止);Enter → defaultButton;
//   - defaultButton:按钮取 AccentButtonStyle 强调色 + 打开后初始焦点落位;
//   - 空按钮文本不渲染该按钮(ButtonsVisibilityStates 八态映射为 data-buttons 五列网格状态);
//   - 焦点陷阱:src/utils/popup.ts trapFocus / releaseFocus(Tab 循环 + 关闭归还焦点),
//     经 registerPopupLayer 入弹层注册表 —— 对话框内再开 Flyout 时 Esc 只关栈顶子弹层;
//   - z-index 用基建 dialog 档 var(--wui-z-popup-dialog)(wiki/controls/_popup-infra.md)。
//
// 弹层基建:对话框为视口居中模态,不锚定宿主,故不走 usePopupLayer 定位;层注册 / 焦点陷阱
//   / z-index 档 / 动画关键帧(popup.css 已 @import animations.css 的 wui-dialog-scale-*)
//   均取基建。
import { computed, nextTick, onBeforeUnmount, ref, useId, useSlots, watch } from 'vue'
import { getTopmostPopupLayer, registerPopupLayer, releaseFocus, trapFocus } from '@/utils/popup'
import WuiButton from '@/components/Button.vue'
import '../styles/popup.css'

const props = withDefaults(
  defineProps<{
    /** 标题文本(WinUI Title 的 string 形态);富内容用 #title 插槽,插槽优先。空则不渲染标题区。 */
    title?: string
    /** 主按钮文本(WinUI PrimaryButtonText);空串不渲染该按钮。 */
    primaryButtonText?: string
    /** 次按钮文本(WinUI SecondaryButtonText);空串不渲染该按钮。 */
    secondaryButtonText?: string
    /** 关闭按钮文本(WinUI CloseButtonText);空串不渲染该按钮。 */
    closeButtonText?: string
    /** 默认按钮(WinUI DefaultButton):取强调色样式 + 打开后初始焦点落位 + Enter 触发,默认 None。 */
    defaultButton?: ContentDialogButtonValue
    /** 主按钮可用性(WinUI IsPrimaryButtonEnabled)。 */
    isPrimaryButtonEnabled?: boolean
    /** 次按钮可用性(WinUI IsSecondaryButtonEnabled)。 */
    isSecondaryButtonEnabled?: boolean
  }>(),
  {
    title: '',
    primaryButtonText: '',
    secondaryButtonText: '',
    closeButtonText: '',
    defaultButton: 'None',
    isPrimaryButtonEnabled: true,
    isSecondaryButtonEnabled: true,
  },
)

defineOptions({ name: 'WuiContentDialog', inheritAttrs: false })

// —— isOpen(WinUI ShowAsync 的声明式等价):双向;置 true 打开、按钮/Esc 关闭时写回 false ——
const isOpen = defineModel<boolean>('isOpen', { default: false })

// —— 事件(WinUI PrimaryButtonClick / SecondaryButtonClick / CloseButtonClick)——
// 事件参数为同步对象:处理器内置 args.cancel = true 可阻止本次关闭(Deferral 见 wiki)。
const emit = defineEmits<{
  primaryButtonClick: [args: ContentDialogButtonClickEventArgs]
  secondaryButtonClick: [args: ContentDialogButtonClickEventArgs]
  closeButtonClick: [args: ContentDialogButtonClickEventArgs]
}>()

// —— 插槽类型契约(富内容 default / 富标题 title;模板直接使用,无需实例)——
defineSlots<{
  /** 对话框正文(WinUI Content 对象形态);任意元素。 */
  default?: () => unknown
  /** 富标题(WinUI Title / TitleTemplate 的对象形态);缺省渲染 title 属性文本。 */
  title?: () => unknown
}>()

const slots = useSlots()
const titleId = useId()

const hasTitle = computed(
  () => props.title.trim() !== '' || slots.title !== undefined,
)

/* -------------------------------------------------------------------------
 * 按钮可见性与命令区状态(ButtonsVisibilityStates 八态 → data-buttons 网格)
 * 空文本按钮不渲染(WinUI 按钮文本为空即不显示);布局规则:
 *   三键:primary | 8 | secondary | 8 | close(各占 1fr)
 *   两键:左右两半(中间 8px);单键:占右半格(WinUI PrimaryVisible → 列 4)
 * ---------------------------------------------------------------------- */

const showPrimary = computed(() => props.primaryButtonText.length > 0)
const showSecondary = computed(() => props.secondaryButtonText.length > 0)
const showClose = computed(() => props.closeButtonText.length > 0)

type ButtonVisibilityState = 'all' | 'ps' | 'pc' | 'sc' | 'p' | 's' | 'c' | 'none'

const buttonState = computed<ButtonVisibilityState>(() => {
  const p = showPrimary.value
  const s = showSecondary.value
  const c = showClose.value
  if (p && s && c) return 'all'
  if (p && s) return 'ps'
  if (p && c) return 'pc'
  if (s && c) return 'sc'
  if (p) return 'p'
  if (s) return 's'
  if (c) return 'c'
  return 'none'
})

const isDefaultPrimary = computed(() => props.defaultButton === 'Primary')
const isDefaultSecondary = computed(() => props.defaultButton === 'Secondary')
const isDefaultClose = computed(() => props.defaultButton === 'Close')

/* -------------------------------------------------------------------------
 * 开关时序:层注册(Esc 栈顶语义)+ 焦点陷阱(初始焦点落 defaultButton)
 * ---------------------------------------------------------------------- */

const panelRef = ref<HTMLDivElement | null>(null)

let unregisterLayer: (() => void) | null = null
let trapActive = false

/** 默认按钮元素(禁用时退回 focusFirst 兜底,focus 不落到 disabled 节点)。 */
function resolveDefaultButtonElement(): HTMLButtonElement | null {
  const panel = panelRef.value
  if (!panel || props.defaultButton === 'None') return null
  const key = props.defaultButton.toLowerCase()
  const el = panel.querySelector<HTMLButtonElement>(`[data-wui-dialog-button="${key}"]`)
  if (el && !el.disabled) return el
  return null
}

watch(
  isOpen,
  (open) => {
    if (open) {
      // 层挂载后上陷阱:先注册(嵌套时 Esc 让位栈顶子弹层)再 trapFocus;
      // 初始焦点落 defaultButton,否则 focusFirst(首个可聚焦 = 主按钮,对齐 WinUI)
      void nextTick(() => {
        const panel = panelRef.value
        if (!panel || !isOpen.value) return
        unregisterLayer?.()
        unregisterLayer = registerPopupLayer(panel)
        const initial = resolveDefaultButtonElement()
        trapFocus(panel, { initialFocus: initial ?? true })
        trapActive = true
      })
    } else {
      releaseFocus()
      trapActive = false
      unregisterLayer?.()
      unregisterLayer = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  // 开着被卸载:先弹出本实例陷阱(栈条目不能残留)再注销层注册
  if (trapActive) {
    releaseFocus()
    trapActive = false
  }
  unregisterLayer?.()
  unregisterLayer = null
})

/* -------------------------------------------------------------------------
 * 关闭与按钮激活(args.cancel 可阻止;Esc → CloseButtonClick 语义)
 * ---------------------------------------------------------------------- */

type DialogButtonKind = 'primary' | 'secondary' | 'close'

function invokeButton(kind: DialogButtonKind): void {
  const args: ContentDialogButtonClickEventArgs = { cancel: false }
  if (kind === 'primary') emit('primaryButtonClick', args)
  else if (kind === 'secondary') emit('secondaryButtonClick', args)
  else emit('closeButtonClick', args)
  // emit 同步执行:处理器在此之后置位/未置位 cancel 均已定格(异步决定见 wiki 差异节)
  if (!args.cancel) isOpen.value = false
}

/** Escape → closeButtonClick(WinUI 语义);子弹层(Flyout 等)持有栈顶时让位。 */
function requestCloseViaEscape(event: KeyboardEvent): void {
  if (getTopmostPopupLayer() !== panelRef.value) return
  event.preventDefault()
  invokeButton('close')
}

/**
 * Enter → defaultButton(WinUI 对话框语义:正文/文本输入内按 Enter 亦触发默认按钮;
 * 焦点已在 button / textarea / select / 链接上时交还原生行为,避免双触发)。
 */
function invokeDefaultFromKeyboard(event: KeyboardEvent): void {
  if (props.defaultButton === 'None') return
  const target = event.target
  if (target instanceof HTMLElement && target.matches('button, textarea, select, a[href]')) return
  const button = resolveDefaultButtonElement()
  if (button) {
    event.preventDefault()
    button.click()
  }
}

function onPanelKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    requestCloseViaEscape(event)
  } else if (event.key === 'Enter') {
    invokeDefaultFromKeyboard(event)
  }
}
</script>

<template>
  <Teleport to="body">
    <!-- 出入场(源 DialogShowing / DialogHidden 双时间线,各走各的元素;权威 = WinUI 3
         controls/dev/CommonStyles/ContentDialog_themeresources.xaml L74-113):
         入场:面板(BackgroundElement/ScaleTransform)= scale 1.05→1 @250ms
         (ControlNormalAnimationDuration)+ KeySpline 0,0,0,1;层根(LayoutRoot)=
         Opacity 0→1 @83ms 线性(ControlFasterAnimationDuration)。
         出场:面板 scale 1→1.05 @167ms(ControlFastAnimationDuration)+ 同 spline;
         层根 Opacity 1→0 @83ms 线性。:duration 显式给各自最长时间线(入场 250 /
         出场 167),Vue 须等最长时间线结束再摘类/卸层;关闭途中 pointer-events:none
         (源 IsHitTestVisible=False @0s 等价) -->
    <Transition name="wui-content-dialog" :duration="{ enter: 250, leave: 167 }">
      <div v-if="isOpen" class="wui-content-dialog">
        <!-- 面板(BackgroundElement):$attrs(class/style/aria-*)透传到对话框本体 -->
        <div
          ref="panelRef"
          class="wui-content-dialog__panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="hasTitle ? titleId : undefined"
          tabindex="-1"
          v-bind="$attrs"
          @keydown="onPanelKeydown"
        >
          <!-- 内容滚动区(ContentScrollViewer):底部分隔线 = ContentDialogSeparatorThickness -->
          <div class="wui-content-dialog__scroll">
            <div class="wui-content-dialog__body">
              <div v-if="hasTitle" :id="titleId" class="wui-content-dialog__title">
                <slot name="title">{{ title }}</slot>
              </div>
              <div class="wui-content-dialog__content">
                <slot />
              </div>
            </div>
          </div>

          <!-- 命令区(CommandSpace):五列网格,data-buttons 承载可见性状态 -->
          <div
            v-if="buttonState !== 'none'"
            class="wui-content-dialog__commands"
            :data-buttons="buttonState"
          >
            <WuiButton
              v-if="showPrimary"
              class="wui-content-dialog__btn wui-content-dialog__btn--primary"
              :class="{ 'wui-content-dialog__btn--accent': isDefaultPrimary }"
              :disabled="!isPrimaryButtonEnabled"
              data-wui-dialog-button="primary"
              @click="invokeButton('primary')"
            >
              {{ primaryButtonText }}
            </WuiButton>
            <WuiButton
              v-if="showSecondary"
              class="wui-content-dialog__btn wui-content-dialog__btn--secondary"
              :class="{ 'wui-content-dialog__btn--accent': isDefaultSecondary }"
              :disabled="!isSecondaryButtonEnabled"
              data-wui-dialog-button="secondary"
              @click="invokeButton('secondary')"
            >
              {{ secondaryButtonText }}
            </WuiButton>
            <WuiButton
              v-if="showClose"
              class="wui-content-dialog__btn wui-content-dialog__btn--close"
              :class="{ 'wui-content-dialog__btn--accent': isDefaultClose }"
              data-wui-dialog-button="close"
              @click="invokeButton('close')"
            >
              {{ closeButtonText }}
            </WuiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/*
 * 层根(LayoutRoot):全屏模态底;z-index 用基建 dialog 固定档(popup.css token,
 * 不走 nextPopupZIndex 自动分配);烟幕色 = 锚定模板 LayoutRoot 的
 * SystemControlPageBackgroundMediumAltMediumBrush(浅白雾 / 深黑雾,随主题切换)。
 * 遮罩点击不关:无任何点击关闭处理(WinUI 语义,只能按钮 / Esc 关闭)。
 */
.wui-content-dialog {
  position: fixed;
  inset: 0;
  z-index: var(--wui-z-popup-dialog);
  display: grid;
  place-items: center;
}

/* 烟幕层(SmokeLayerBackground):伪元素承载;透明度跟随层根
   (源 LayoutRoot 既画烟幕又承担 Opacity 时间线)。
   PL10 重定向:Fill = SmokeFillColorDefaultBrush → --wui-smoke-fill-color-default
   (浅/深均 #0000004D;旧版用 --wui-system-control-page-background-medium-alt-medium
   #ffffff99/#00000099 为锚定模板近似,已弃)。 */
.wui-content-dialog::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--wui-smoke-fill-color-default);
}

/*
 * 对话框面板(BackgroundElement):MinWidth 320 / MaxWidth 548 / MinHeight 184 /
 * MaxHeight 756(尺寸资源 theme.css 未提取,按源值写死,见 wiki 差异节);
 * PL10 重定向到权威 Fluent 键(control-brush-matrix.md §1.35):
 *   Background   = SolidBackgroundFillColorBaseBrush → --wui-solid-background-fill-color-base
 *   Foreground   = TextFillColorPrimaryBrush         → --wui-text-fill-color-primary
 *   BorderBrush  = SurfaceStrokeColorDefaultBrush    → --wui-surface-stroke-color-default
 * 圆角/阴影取基建 token(OverlayCornerRadius 8px / ThemeShadow 近似)。
 */
.wui-content-dialog__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 320px;
  max-width: min(548px, calc(100vw - 48px));
  min-height: 184px;
  max-height: min(756px, calc(100vh - 48px));
  font-family: var(--wui-content-control-theme-font-family);
  color: var(--wui-text-fill-color-primary);
  background: var(--wui-solid-background-fill-color-base);
  border: 1px solid var(--wui-surface-stroke-color-default);
  border-radius: var(--wui-popup-corner-radius);
  box-shadow: var(--wui-popup-shadow);
  outline: none; /* tabindex="-1" 兜底聚焦容器自身,不显示焦点环(WinUI IsTabStop=False) */
}

/* 内容滚动区:撑满剩余高度,超长滚动。
   Background = ContentDialogTopOverlay = LayerFillColorAltBrush → --wui-layer-fill-color-alt
   (浅 #FFFFFF 不透明 / 深 #FFFFFF0D,源模板 L233 的 Grid 背景);
   底部分隔线 = ContentDialogSeparatorBorderBrush = CardStrokeColorDefaultBrush
   → --wui-card-stroke-color-default(源 L234 BorderBrush,Thickness 0,0,0,1)。 */
.wui-content-dialog__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  background: var(--wui-layer-fill-color-alt);
  border-bottom: 1px solid var(--wui-card-stroke-color-default);
}

/* 内容区(ContentDialogPadding = 24):标题 + 正文 */
.wui-content-dialog__body {
  padding: 24px;
}

/* 标题:FontSize 20 / FontWeight SemiBold(WinUI 3 现行模板)/ Margin 0,0,0,12 /
   MaxLines 2(Web 用 line-clamp 等价)+ 换行 */
.wui-content-dialog__title {
  display: -webkit-box;
  overflow: hidden;
  margin-bottom: 12px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow-wrap: break-word;
}

/* 正文:ControlContentThemeFontSize = 14 / TextWrapping Wrap */
.wui-content-dialog__content {
  font-size: var(--wui-control-content-theme-font-size);
  line-height: 1.5;
  overflow-wrap: break-word;
}

/*
 * 命令区(CommandSpace):五列网格 [primary 1fr | firstSpacer | secondary | 8px | close 1fr]。
 * 可见性状态(对照 ButtonsVisibilityStates):三键 = 两枚 8px 间隔的三个 1fr;
 * 两键 = 左右两半;单键 = 占右半格(WinUI 将单键移到列 4);无键不渲染整个命令区。
 */
.wui-content-dialog__commands {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(0, 1fr) 0 0 8px minmax(0, 1fr);
  padding: 24px;
}

.wui-content-dialog__commands[data-buttons='all'] {
  grid-template-columns: minmax(0, 1fr) 8px minmax(0, 1fr) 8px minmax(0, 1fr);
}

.wui-content-dialog__btn {
  grid-row: 1;
  justify-self: center;
  width: 100%;
  height: 32px; /* ContentDialogButtonHeight = 32 */
  min-width: 130px; /* ContentDialogButtonMinWidth */
  max-width: 202px; /* ContentDialogButtonMaxWidth */
  padding-top: 0;
  padding-bottom: 0;
}

.wui-content-dialog__btn--primary {
  grid-column: 1;
}

.wui-content-dialog__btn--secondary {
  grid-column: 3;
}

.wui-content-dialog__btn--close {
  grid-column: 5;
}

/* 两键(无 close):次按钮移到右半格(PrimaryAndSecondaryVisible → 列 4) */
.wui-content-dialog__commands[data-buttons='ps'] .wui-content-dialog__btn--secondary {
  grid-column: 5;
}

/* 两键(无 primary):次按钮占左半格(SecondaryAndCloseVisible → 列 0) */
.wui-content-dialog__commands[data-buttons='sc'] .wui-content-dialog__btn--secondary {
  grid-column: 1;
}

/* 单键(仅 primary / 仅 secondary):占右半格(WinUI 单键状态 → 列 4) */
.wui-content-dialog__commands[data-buttons='p'] .wui-content-dialog__btn--primary,
.wui-content-dialog__commands[data-buttons='s'] .wui-content-dialog__btn--secondary {
  grid-column: 5;
}

/*
 * defaultButton 强调色(AccentButtonStyle):与 Button.vue 的 accent 口径一致,改用
 * theme.css 的 Fluent accent 画刷族(权威 = controls/dev/CommonStyles/Button_themeresources.xaml
 * L5-16 Default 字典 / L103-114 Light 字典的 AccentButton* 键):
 *   Background  Normal=AccentFillColorDefault / PointerOver=Secondary / Pressed=Tertiary / Disabled=Disabled;
 *   Foreground  Normal=PointerOver=TextOnAccentFillColorPrimary / Pressed=Secondary / Disabled=Disabled;
 *   BorderBrush Normal=PointerOver=AccentControlElevationBorderBrush(渐变立体描边环)
 *               / Pressed=Disabled=ControlFillColorTransparent(纯色透明 → 描边环撤除)。
 * 状态经 WuiButton 的 --btn-* 中间变量注入(与 Button.vue 的 ::before 立体描边环同款),
 * 选择器叠加 .wui-content-dialog__commands + .wui-content-dialog__btn 双重前缀,特异度高于
 * 子组件自身状态规则(含 :hover/:active 的 --btn-* 声明)。
 */
.wui-content-dialog__commands .wui-content-dialog__btn.wui-content-dialog__btn--accent {
  --btn-fg: var(--wui-text-on-accent-fill-color-primary);
  --btn-bg: var(--wui-accent-fill-color-default);
  --btn-border: var(--wui-control-fill-color-transparent);
  --btn-elevation-border: var(--wui-accent-control-elevation-border);
}

.wui-content-dialog__commands .wui-content-dialog__btn.wui-content-dialog__btn--accent:hover:not(:disabled) {
  --btn-fg: var(--wui-text-on-accent-fill-color-primary);
  --btn-bg: var(--wui-accent-fill-color-secondary);
  --btn-border: var(--wui-control-fill-color-transparent);
  --btn-elevation-border: var(--wui-accent-control-elevation-border);
}

.wui-content-dialog__commands .wui-content-dialog__btn.wui-content-dialog__btn--accent:active:not(:disabled) {
  --btn-fg: var(--wui-text-on-accent-fill-color-secondary);
  --btn-bg: var(--wui-accent-fill-color-tertiary);
  --btn-border: var(--wui-control-fill-color-transparent);
  --btn-elevation-border: none;
}

.wui-content-dialog__commands .wui-content-dialog__btn.wui-content-dialog__btn--accent:disabled {
  --btn-fg: var(--wui-text-on-accent-fill-color-disabled);
  --btn-bg: var(--wui-accent-fill-color-disabled);
  --btn-border: var(--wui-control-fill-color-transparent);
  --btn-elevation-border: none;
}

/*
 * 出入场(权威 = WinUI 3 controls/dev/CommonStyles/ContentDialog_themeresources.xaml
 * L74-113 的 DialogHidden / DialogShowing VisualTransition;关键帧见 animations.css 的
 * wui-dialog-scale-* / wui-fade-*):
 *   入场:层根 Opacity 0→1 @83ms 线性(LinearDoubleKeyFrame @ControlFasterAnimationDuration,
 *         L109-112)+ 面板 scale 1.05→1 @250ms(ControlNormalAnimationDuration)
 *         spline 0,0,0,1(ControlFastOutSlowInKeySpline,L101-108,
 *         RenderTransformOrigin 0.5,0.5 = CSS 缺省原点);
 *   出场:层根 Opacity 1→0 @83ms 线性(L90-93)+ 面板 scale 1→1.05 @167ms
 *         (ControlFastAnimationDuration)同 spline(L82-89),层根 pointer-events:none
 *         (源 IsHitTestVisible=False @0s 等价)。
 * 两条时间线并行、淡变先于缩放完成;Vue 经 Transition :duration 等最长时间线
 * (入场 250 / 出场 167)。注:generic.xaml L8393-8423 为 UWP 遗留 500ms 版,已弃用。
 */
.wui-content-dialog-enter-active {
  animation: wui-fade-in 83ms linear both;
}

.wui-content-dialog-enter-active .wui-content-dialog__panel {
  animation: wui-dialog-scale-in 250ms cubic-bezier(0, 0, 0, 1) both;
}

.wui-content-dialog-leave-active {
  animation: wui-fade-out 83ms linear both;
  pointer-events: none;
}

.wui-content-dialog-leave-active .wui-content-dialog__panel {
  animation: wui-dialog-scale-out 167ms cubic-bezier(0, 0, 0, 1) both;
}
</style>
