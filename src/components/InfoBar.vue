<script setup lang="ts">
// InfoBar —— WinUI InfoBar 的 Web 复刻:应用级状态变化的内联通知条(四档严重级别配色)。
// 视觉规格:CK/WinUI-Reference/controls/dev/InfoBar/InfoBar.xaml(ControlTemplate)+
//   InfoBar_themeresources.xaml(ContentRoot 四档背景、图标双字形叠放 F136 底圆 + 档位字形 16px、
//   Title/Message 14px SemiBold/Normal、MinHeight 48、ContentRootPadding 16,0,0,0、
//   CloseButton 38x38 / Margin 5 / 字形 16 Cancel(E711)、圆角 ControlCornerRadius、边框 1px
//   CardStrokeColorDefault)。四档配色源:CommonStyles/Common_themeresources_any.xaml 的
//   SystemFillColor* 系画刷(theme.css 未提取、无最近似 token,按 theme-hooks.css「默认呈现值」
//   先例以源值注入组件级 token --wui-infobar-*,对照表见 wiki/controls/InfoBar.md 差异节;
//   其中 Informational 图标色 = SystemFillColorAttentionBrush ← SystemAccentColor(Light2),
//   可直接引用 theme-hooks 的 --wui-system-accent-color / --wui-system-accent-color-light-2 token)。
// 行为规格:InfoBar.cpp —— 关闭先 Closing(可 Cancel 回滚,InfoBar.cpp L88-L137)、隐藏后再 Closed,
//   关闭原因 CloseButton / Programmatic(InfoBarCloseReason,idl L6-L10)。源模板无过渡动画(VSM
//   直接 Collapsed),按任务要求关闭动画取 animations.css 的 --wui-duration-fast +
//   --wui-easing-accelerate(关闭类动画专用组合)做透明度淡出:Closing 在动画前、Closed 在动画后。
// 无障碍:role 按任务规格映射(Warning/Error → alert,Informational/Success → status);关闭按钮
//   aria-label 缺省「关闭」(源 OnApplyTemplate 本地化 SR_InfoBarCloseButtonName 的中文取值),
//   可经 closeButtonAriaLabel 覆盖;图标字形为装饰(aria-hidden,FontIcon 内建)。
import { computed, onBeforeUnmount, ref, useSlots, watch } from 'vue'
import WuiFontIcon from './FontIcon.vue'
import '../styles/animations.css'

/** WinUI InfoBarSeverity 枚举(InfoBar.idl L14-L20)。 */
type InfoBarSeverityValue = 'Informational' | 'Success' | 'Warning' | 'Error'

/** WinUI InfoBarCloseReason 枚举(InfoBar.idl L6-L10)。 */
type InfoBarCloseReasonValue = 'CloseButton' | 'Programmatic'

/** closing 事件参数(WinUI InfoBarClosingEventArgs:reason 只读 + cancel 可写,置 true 取消关闭)。 */
interface InfoBarClosingArgs {
  reason: InfoBarCloseReasonValue
  cancel: boolean
}

/** closed 事件参数(WinUI InfoBarClosedEventArgs:reason)。 */
interface InfoBarClosedArgs {
  reason: InfoBarCloseReasonValue
}

const props = withDefaults(
  defineProps<{
    /** 标题(WinUI Title);同名 slot 优先,均为空则不渲染标题。 */
    title?: string
    /** 消息正文(WinUI Message);同名 slot 优先,均为空则不渲染正文。 */
    message?: string
    /** 严重级别(WinUI Severity):四档背景 / 图标配色与 role 语义(alert/status)随动。 */
    severity?: InfoBarSeverityValue
    /** 是否显示图标(WinUI IsIconVisible,默认 true);无 #icon slot 时按档位渲染默认图标。 */
    isIconVisible?: boolean
    /** 是否显示关闭按钮(WinUI IsClosable,默认 true)。 */
    isClosable?: boolean
    /** 关闭按钮的 aria-label 与 tooltip;缺省「关闭」,可覆盖为其他语言取值。 */
    closeButtonAriaLabel?: string
  }>(),
  {
    title: '',
    message: '',
    severity: 'Informational',
    isIconVisible: true,
    isClosable: true,
    closeButtonAriaLabel: '关闭',
  },
)

defineOptions({ name: 'WuiInfoBar', inheritAttrs: false })

// —— IsOpen 双向绑定(WinUI IsOpen,默认 false,InfoBar.idl L62-L64)——
const isOpen = defineModel<boolean>('isOpen', { default: false })

// —— 事件(WinUI CloseButtonClick / Closing / Closed,InfoBar.idl L99-L101)——
const emit = defineEmits<{
  closeButtonClick: []
  closing: [args: InfoBarClosingArgs]
  closed: [args: InfoBarClosedArgs]
}>()

const slots = useSlots()

// —— 渲染可见性:isOpen=false 后先播关闭动画再卸载(v-if),期间元素仍占位 ——
const rendered = ref(isOpen.value)
const isClosing = ref(false)
const pendingReason = ref<InfoBarCloseReasonValue>('Programmatic')

// —— 关闭收尾:transitionend 为主 + 定时器兜底(时长 + 60ms),settleToken 保证每次关闭只发一次 ——
const CLOSE_MS = 167 // 对齐 --wui-duration-fast(animations.css 关闭类动画时长)

let settleToken = 0
let settleTimer: ReturnType<typeof setTimeout> | undefined

function clearSettle(): void {
  if (settleTimer !== undefined) {
    clearTimeout(settleTimer)
    settleTimer = undefined
  }
}

function scheduleSettle(reason: InfoBarCloseReasonValue): void {
  clearSettle()
  const token = ++settleToken
  settleTimer = setTimeout(() => {
    if (token !== settleToken) return
    settleTimer = undefined
    finishClose(reason)
  }, CLOSE_MS + 60)
}

function onTransitionEnd(event: TransitionEvent): void {
  // 只认根元素自身的 opacity 过渡(子元素/嵌套 InfoBar 的事件一律忽略)
  if (!isClosing.value) return
  if (event.target !== rootRef.value || event.propertyName !== 'opacity') return
  clearSettle()
  ++settleToken // 使兜底定时器失效
  finishClose(pendingReason.value)
}

function beginClose(reason: InfoBarCloseReasonValue): void {
  if (!isOpen.value || isClosing.value) return
  const args: InfoBarClosingArgs = { reason, cancel: false }
  emit('closing', args)
  if (args.cancel) {
    // 源 InfoBar.cpp L100-L105:Cancel=true → 回滚 IsOpen(true),保持可见。
    if (!isOpen.value) isOpen.value = true
    return
  }
  pendingReason.value = reason
  isClosing.value = true
  scheduleSettle(reason)
}

function finishClose(reason: InfoBarCloseReasonValue): void {
  isClosing.value = false
  rendered.value = false
  // 关闭按钮路径:model 随动画完成同步(源为点击即置 IsOpen(false),时序差异见 wiki 差异节)
  if (isOpen.value) isOpen.value = false
  emit('closed', { reason })
}

// —— isOpen 外部变更:打开(含关闭中途重开)立即恢复;程序化关闭走同一条 Closing→动画→Closed 链 ——
watch(isOpen, (now) => {
  if (now) {
    clearSettle()
    isClosing.value = false
    rendered.value = true
  } else if (rendered.value) {
    beginClose('Programmatic')
  }
})

onBeforeUnmount(clearSettle)

function onCloseButtonClick(): void {
  emit('closeButtonClick')
  beginClose('CloseButton')
}

// —— 派生状态 ——
const rootRef = ref<HTMLElement | null>(null)

const severityClass = computed(() => `wui-infobar--${props.severity.toLowerCase()}`)

// role 语义(任务规格):Warning/Error → alert(打断式通告),Informational/Success → status(状态区)
const ariaRole = computed(() =>
  props.severity === 'Warning' || props.severity === 'Error' ? 'alert' : 'status',
)

const hasTitle = computed(() => props.title !== '' || slots.title !== undefined)
const hasMessage = computed(() => props.message !== '' || slots.message !== undefined)
const hasAction = computed(() => slots.action !== undefined)
const hasBanner = computed(() => hasTitle.value || hasMessage.value || hasAction.value)
const hasContent = computed(() => slots.default !== undefined)

// 默认图标字形(InfoBar_themeresources.xaml L70-L74):底层档位圆 F136 + 上层档位字形
const SEVERITY_GLYPHS: Record<InfoBarSeverityValue, string> = {
  Informational: '\uF13F', // StatusCircleInfo
  Success: '\uF13E', // StatusCircleCheckmark
  Warning: '\uF13C', // StatusCircleExclamation
  Error: '\uF13D', // StatusCircleErrorX
}
const severityGlyph = computed(() => SEVERITY_GLYPHS[props.severity] ?? '\uF13F')
</script>

<template>
  <div
    v-if="rendered"
    ref="rootRef"
    v-bind="$attrs"
    class="wui-infobar"
    :class="[
      severityClass,
      {
        'wui-infobar--closing': isClosing,
        'wui-infobar--content-only': !hasBanner,
      },
    ]"
    :role="ariaRole"
    @transitionend="onTransitionEnd"
  >
    <div class="wui-infobar-grid">
      <!-- 图标(StandardIconArea:底层档位圆 + 上层档位字形叠放;#icon slot 对应源 UserIconBox) -->
      <div v-if="isIconVisible" class="wui-infobar-icon">
        <slot name="icon">
          <WuiFontIcon class="wui-infobar-icon-bg" glyph="&#xF136;" :font-size="16" />
          <WuiFontIcon class="wui-infobar-icon-fg" :glyph="severityGlyph" :font-size="16" />
        </slot>
      </div>

      <!-- 标题 / 消息 / 操作(InfoBarPanel:横向排布 + wrap 回绕近似,横向边距) -->
      <div v-if="hasBanner" class="wui-infobar-panel">
        <span v-if="hasTitle" class="wui-infobar-title"><slot name="title">{{ title }}</slot></span>
        <span v-if="hasMessage" class="wui-infobar-message"><slot name="message">{{ message }}</slot></span>
        <span v-if="hasAction" class="wui-infobar-action"><slot name="action" /></span>
      </div>

      <!-- 内容区(WinUI Content;无标题 / 消息 / 操作时上移首行 = NoBannerContent 态) -->
      <div v-if="hasContent" class="wui-infobar-content"><slot /></div>

      <!-- 关闭按钮(源以 Button.Resources 覆写为 AppBarButton 系资源:透明底 + 悬停 Subtle 底) -->
      <button
        v-if="isClosable"
        type="button"
        class="wui-infobar-close"
        :aria-label="closeButtonAriaLabel"
        :title="closeButtonAriaLabel"
        @click="onCloseButtonClick"
      >
        <WuiFontIcon glyph="&#xE711;" :font-size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/*
 * 结构对照 InfoBar.xaml ControlTemplate:
 * ContentRoot(Border:四档背景 + 1px 边框 + ControlCornerRadius 圆角)
 *   > Grid(3 列:图标 | 标题/消息/操作 | 关闭按钮;2 行:横幅内容 | Content)。
 * 颜色 / 字号 / 圆角 / 时长一律 token;四档 SystemFillColor* 系以组件级 token 注入
 * (theme.css 未提取,源值取 Common_themeresources_any.xaml,对照表见 wiki 差异节)。
 */
.wui-infobar {
  /* PL3:四档严重级别配色重定向到 PL2 Fluent 系统语义画刷(浅/深由 token 自身切换,
     无需再写 html[data-theme='dark'] 覆盖段)。
     Informational:背景 SystemFillColorAttentionBackground,图标 SystemFillColorAttention */
  --wui-infobar-severity-bg: var(--wui-system-fill-color-attention-background);
  --wui-infobar-severity-icon: var(--wui-system-fill-color-attention);
  --wui-infobar-icon-inverse: var(--wui-text-fill-color-inverse); /* InfoBar*SeverityIconForeground = TextFillColorInverse */

  box-sizing: border-box;
  font-family: inherit; /* XamlAutoFontFamily 占位,回退浏览器默认 */
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-text-fill-color-primary); /* InfoBarTitle/MessageForeground = TextFillColorPrimary */
  background: var(--wui-infobar-severity-bg); /* ContentRoot 背景(SeverityLevels 态 Setter) */
  /* InfoBarBorderBrush = CardStrokeColorDefaultBrush */
  border: 1px solid var(--wui-card-stroke-color-default);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* CornerRadius ← ControlCornerRadius(4px) */
}

.wui-infobar--success {
  /* SystemFillColorSuccessBackground / SystemFillColorSuccess */
  --wui-infobar-severity-bg: var(--wui-system-fill-color-success-background);
  --wui-infobar-severity-icon: var(--wui-system-fill-color-success);
}

.wui-infobar--warning {
  /* SystemFillColorCautionBackground / SystemFillColorCaution */
  --wui-infobar-severity-bg: var(--wui-system-fill-color-caution-background);
  --wui-infobar-severity-icon: var(--wui-system-fill-color-caution);
}

.wui-infobar--error {
  /* SystemFillColorCriticalBackground / SystemFillColorCritical */
  --wui-infobar-severity-bg: var(--wui-system-fill-color-critical-background);
  --wui-infobar-severity-icon: var(--wui-system-fill-color-critical);
}

/* —— 内层 Grid(MinHeight 48;Padding 16,0,0,0;列:Auto 图标 | * 内容 | Auto 关闭)—— */
.wui-infobar-grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  box-sizing: border-box;
  min-height: 48px; /* InfoBarMinHeight = 48 */
  padding-left: 16px; /* InfoBarContentRootPadding = 16,0,0,0 */
}

/* —— 图标区(双字形叠放:底圆档位色 + 上层反白字形;InfoBarIconMargin = 0,16,14,16)—— */
.wui-infobar-icon {
  position: relative;
  grid-column: 1;
  grid-row: 1;
  align-self: start;
  box-sizing: border-box;
  width: 16px; /* InfoBarIconFontSize = 16 */
  height: 16px;
  margin: 16px 14px 16px 0;
}

.wui-infobar-icon-bg,
.wui-infobar-icon-fg {
  position: absolute;
  inset: 0;
}

.wui-infobar-icon-bg {
  color: var(--wui-infobar-severity-icon); /* IconBackground.Foreground ← InfoBar*SeverityIconBackground */
}

.wui-infobar-icon-fg {
  color: var(--wui-infobar-icon-inverse); /* StandardIcon.Foreground ← TextFillColorInverse */
}

/* —— 标题 / 消息 / 操作面板(InfoBarPanel 横向排;PanelMargin = 0,0,16,0)—— */
.wui-infobar-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  margin-right: 16px;
}

.wui-infobar-title {
  flex: 0 0 auto;
  margin: 14px 0 0; /* InfoBarTitleHorizontalOrientationMargin = 0,14,0,0 */
  font-size: var(--wui-control-content-theme-font-size); /* InfoBarTitleFontSize = 14 */
  font-weight: 600; /* InfoBarTitleFontWeight = SemiBold */
}

.wui-infobar-message {
  flex: 1 1 auto; /* 消息占满剩余宽并换行(源 TextWrapping = WrapWholeWords) */
  min-width: 0;
  margin: 14px 0 0 12px; /* InfoBarMessageHorizontalOrientationMargin = 12,14,0,0 */
  overflow-wrap: break-word;
  font-size: var(--wui-control-content-theme-font-size); /* InfoBarMessageFontSize = 14 */
  font-weight: 400; /* InfoBarMessageFontWeight = Normal */
}

.wui-infobar-action {
  flex: 0 0 auto;
  margin: 8px 0 0 16px; /* InfoBarActionHorizontalOrientationMargin = 16,8,0,0 */
}

/* —— 内容区(WinUI Content;Row1,垂直居中)—— */
.wui-infobar-content {
  grid-column: 2;
  grid-row: 2;
  align-self: center;
}

/* NoBannerContent 态:无标题 / 消息 / 操作时内容上移首行(InfoBar.cpp UpdateContentPosition) */
.wui-infobar--content-only .wui-infobar-content {
  grid-row: 1;
}

/* —— 关闭按钮(InfoBarCloseButtonStyle:38x38 / Margin 5 / 顶对齐)——
   PL17 权威重定向:样式 BasedOn DefaultButtonStyle 只供模板/几何,画刷族由模板内联
   Button.Resources 的 ThemeDictionaries(InfoBar.xaml L128-171,Default/Light/HC 三档)
   逐键覆写为 AppBarButton* —— ButtonBackground→AppBarButtonBackground(透明)、
   ButtonBackgroundPointerOver/Pressed→AppBarButtonBackgroundPointerOver/Pressed、
   ButtonForeground→AppBarButtonForeground。权威 AppBarButton_themeresources.xaml
   Default L5-16 / Light L75-86:底 = SubtleFillColor Transparent/Secondary/Tertiary,
   前景 = TextFillColorPrimary。故此处按该族 Fluent 语义 token 重定向(原 legacy
   --wui-app-bar-button-* 见 theme.css)。 */
.wui-infobar-close {
  display: inline-flex;
  grid-column: 3;
  grid-row: 1;
  align-self: start;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 38px; /* InfoBarCloseButtonSize = 38 */
  height: 38px;
  margin: 5px;
  padding: 0;
  font: inherit;
  color: var(--wui-text-fill-color-primary); /* ButtonForeground ← AppBarButtonForeground */
  background: var(--wui-subtle-fill-color-transparent); /* ButtonBackground ← AppBarButtonBackground(透明) */
  border: none; /* ButtonBorderBrush ← AppBarButtonBorderBrush(透明) */
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius); /* ControlCornerRadius */
  cursor: pointer;
}

/* PointerOver / Pressed(Button.Resources 覆写 AppBarButtonBackgroundPointerOver/Pressed) */
.wui-infobar-close:hover {
  background: var(--wui-subtle-fill-color-secondary);
}

.wui-infobar-close:active {
  background: var(--wui-subtle-fill-color-tertiary);
}

.wui-infobar-close:focus {
  outline: none;
}

/* Focus(项目惯例:交互元素 :focus-visible 双环 outline) */
.wui-infobar-close:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

/* —— 关闭动画:透明度淡出(animations.css token;源 VSM 为瞬时 Collapsed,Web 增强见差异节)。
   transition 仅声明在关闭态:类移除(重开 / 打开)时瞬时恢复,与源「打开无动画」一致。 —— */
.wui-infobar--closing {
  opacity: 0;
  transition: opacity var(--wui-duration-fast) var(--wui-easing-accelerate);
}
</style>
