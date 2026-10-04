<script lang="ts">
// SwipeItem(WinUI SwipeItem 迁移)—— 轻扫操作里的单个动作项:图标 + 文本、背景色块、
// invoked 事件。视觉对照 controls/dev/SwipeControl/SwipeItem.cpp(s_swipeItemWidth 68 /
// s_swipeItemHeight 60)与 SwipeItemStyle(宿主 AppBarButton 模板,SwipeControl_themeresources.xaml
// L32-72):MinWidth 68、内容盒 Margin 4,4,4,2、图标 Viewbox 16px、文本 12px 居中换行。
// PL15 画刷权威判定:controls/dev/SwipeControl/SwipeControl_themeresources.xaml 覆盖 legacy
// generic.xaml(同文件 L23-29 的 SystemControl* 仅剩 HighContrast 字典)→ 生效层**全 Fluent**;
// 逐状态键(L5-11,Default 与 Light 同构 L14-20):
//   SwipeItemBackground                     = ControlFillColorTertiaryBrush
//   SwipeItemForeground                     = TextFillColorPrimaryBrush
//   SwipeItemBackgroundPressed              = ControlAltFillColorQuarternaryBrush
//   SwipeItemPreThresholdExecuteForeground  = ControlStrongFillColorDefaultBrush
//   SwipeItemPreThresholdExecuteBackground  = ControlFillColorTertiaryBrush(与 SwipeItemBackground 同键)
//   SwipeItemPostThresholdExecuteForeground = TextOnAccentFillColorPrimaryBrush
//   SwipeItemPostThresholdExecuteBackground = AccentFillColorDefaultBrush
// 应用点对照 SwipeControl.cpp L1270-1282(Reveal → SwipeItemBackground/Foreground;Execute 未过阈值 →
// PreThreshold*;Execute 过阈值 → PostThreshold*;UpdateThresholdReached L1625-1634,阈值 100)。
// 行为对照 SwipeItem.cpp InvokeSwipe:派发 invoked 后按 BehaviorOnInvoked 决定去留
// (Auto / Close → 关闭轻扫层,RemainOpen → 保持打开);Command(ICommand)不迁移。
// 本组件既可由 SwipeControl 经 #left / #right slot 承载(注入注册),也可独立渲染预览。
import { computed, inject, onMounted, onScopeDispose, ref } from 'vue'
import type { InjectionKey } from 'vue'

/** 轻扫侧:left = 向右拖揭示;right = 向左拖揭示。 */
export type SwipeSide = 'left' | 'right'

/** WinUI SwipeBehaviorOnInvoked:invoked 后轻扫层的行为。 */
export type SwipeBehaviorOnInvoked = 'Auto' | 'Close' | 'RemainOpen'

/** 轻扫层对外句柄(供 invoked 事件参数携带;对应 WinUI 事件参数的 SwipeControl 属性)。 */
export interface SwipeControlHandle {
  /** 关闭轻扫层(WinUI SwipeControl.Close)。 */
  close(): void
}

/** WinUI SwipeItemInvokedEventArgs 的 Web 映射。 */
export interface SwipeItemInvokedEventArgs {
  /** 发起调用的轻扫层句柄;独立使用(未被 SwipeControl 承载)时为 null。 */
  swipeControl: SwipeControlHandle | null
}

/** SwipeItem 暴露给 SwipeControl 的配置快照(读取时取值,保持响应)。 */
export type SwipeItemConfigSnapshot = {
  text: string
  icon: string
  background: string
  foreground: string
  behaviorOnInvoked: SwipeBehaviorOnInvoked
  disabled: boolean
}

/** SwipeItem 向 SwipeControl 登记的句柄(SwipeControl 侧消费)。 */
export interface SwipeItemRegistration {
  /** 当前配置快照(每次调用重新取值)。 */
  config(): SwipeItemConfigSnapshot
  /** 由 SwipeControl 触发调用:组件据此派发自身 invoked 事件。 */
  invoke(): void
}

/** SwipeControl 向面板内 SwipeItem 注入的控件级上下文(side 参数化)。
 * 注:provide 对所有后代可见,不能按左右发两个 key(两侧面板都是控件的后代,
 * 双 key 会让右侧项也命中 left 键)——侧别由面板上的 data-wui-swipe-side 标注 +
 * 项挂载时 closest 判定。 */
export interface SwipeControlContext {
  /** 本侧是否为 Execute 模式(单项满铺,项宽随轻扫层)。 */
  isExecute(side: SwipeSide): boolean
  /** 本侧 Execute 是否已跨过触发阈值(驱动 pre/post threshold 配色)。 */
  thresholdReached(side: SwipeSide): boolean
  /** 轻扫层是否处于打开态(本侧)。 */
  isOpen(side: SwipeSide): boolean
  /** 控件级禁用(SwipeControl.disabled,与项自身 disabled 取或)。 */
  controlDisabled(): boolean
  /** 登记本项;返回注销函数(卸载时调用)。 */
  registerItem(side: SwipeSide, registration: SwipeItemRegistration): () => void
  /** 是否为本侧首个项(Execute 模式的满铺与阈值配色仅作用首个项,源只消费 GetAt(0))。 */
  isPrimary(side: SwipeSide, registration: SwipeItemRegistration): boolean
  /** 请求调用本项(点击已揭示项);关闭/保持行为由 SwipeControl 裁决。 */
  requestInvoke(side: SwipeSide, registration: SwipeItemRegistration): void
  /** 关闭轻扫层(WinUI SwipeControl.Close,供 invoked 参数句柄使用)。 */
  close(): void
}

/** 控件级注入键(SwipeControl provide;面板以 data-wui-swipe-side 标注侧别)。 */
export const WUI_SWIPE_CONTEXT: InjectionKey<SwipeControlContext> = Symbol('wui-swipe-context')
</script>

<script setup lang="ts">
// WinUI SwipeItem 复刻(详见文件头注)。项呈现为满高色块按钮:图标(16px 字形)在上、
// 12px 文本在下,居中排布(SwipeItemStyle 的 ContentRoot 盒模型)。
defineOptions({ name: 'WuiSwipeItem', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 项文本(WinUI Text),显示在图标下方;仅文本时垂直居中。 */
    text?: string
    /** 图标字形字符(对应 WinUI FontIconSource 的 Glyph;如 '\uE8FB'),Web 侧用字符替代 IconSource 对象。 */
    icon?: string
    /** 背景色块颜色(WinUI Background;任意 CSS 颜色;缺省用 SwipeItemBackground token)。 */
    background?: string
    /** 前景色(WinUI Foreground;缺省用 SwipeItemForeground token)。 */
    foreground?: string
    /** invoked 后轻扫层行为(WinUI BehaviorOnInvoked;Auto = 关闭)。 */
    behaviorOnInvoked?: SwipeBehaviorOnInvoked
    /** 禁用本项:不可调用、不参与键盘。 */
    disabled?: boolean
  }>(),
  {
    text: '',
    icon: '',
    background: '',
    foreground: '',
    behaviorOnInvoked: 'Auto',
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 项被调用(轻扫过阈值松手 Execute,或点击已揭示的 Reveal 项)。 */
  invoked: [event: SwipeItemInvokedEventArgs]
}>()

// —— 控件上下文(可选注入)+ 侧别判定 ——
const context = inject(WUI_SWIPE_CONTEXT, null)
const rootEl = ref<HTMLButtonElement | null>(null)
/** 侧别:挂载时按面板的 data-wui-swipe-side 标注判定;独立使用(无标注/无控件)为 null。 */
const side = ref<SwipeSide | null>(null)

/** Execute 模式单项满铺:宽度跟随轻扫层(100%),由 SwipeControl 决定;仅首个项生效。 */
const isExecute = computed(() => (context && side.value ? context.isExecute(side.value) : false))
/** Execute 阈值已跨过:post-threshold 配色(AccentFillColorDefault 底 + TextOnAccentFillColorPrimary 前)。 */
const isThresholdReached = computed(() => (context && side.value ? context.thresholdReached(side.value) : false))
/** 项最终禁用态:控件级禁用 ∨ 项自身禁用。 */
const isDisabled = computed(() => (context?.controlDisabled() ?? false) || props.disabled)

/** 登记句柄:配置快照读取器 + 由控件侧触发派发的 invoke。 */
const registration: SwipeItemRegistration = {
  config(): SwipeItemConfigSnapshot {
    return {
      text: props.text,
      icon: props.icon,
      background: props.background,
      foreground: props.foreground,
      behaviorOnInvoked: props.behaviorOnInvoked,
      disabled: props.disabled,
    }
  },
  invoke(): void {
    emit('invoked', { swipeControl: contextHandle })
  },
}

/** 本项是否为本侧首个项(Execute 满铺与阈值配色仅作用首个项,源只消费 GetAt(0))。 */
const isPrimary = computed(() => (context && side.value ? context.isPrimary(side.value, registration) : true))

let unregister: (() => void) | null = null
// 挂载时判侧并登记(面板以 data-wui-swipe-side 标注;登记顺序 = DOM 顺序 = 声明顺序)
onMounted(() => {
  const host = rootEl.value?.closest('[data-wui-swipe-side]')
  const detected = host?.getAttribute('data-wui-swipe-side')
  if (context && (detected === 'left' || detected === 'right')) {
    side.value = detected
    unregister = context.registerItem(detected, registration)
  }
})
// 卸载时注销(对应 WinUI 项随内容创建/清除的生命周期)
onScopeDispose(() => {
  unregister?.()
  unregister = null
})

/** 轻扫层句柄:invoked 参数携带(独立使用时为 null)。 */
const contextHandle: SwipeControlHandle | null = context
  ? {
      close: () => {
        // SwipeControlContext.close 由 SwipeControl 提供实现。
        context.close()
      },
    }
  : null

// —— 点击(对应 OnItemTapped → InvokeSwipe):交给控件裁决关闭行为;独立使用直接派发 ——
function onItemTap(): void {
  if (isDisabled.value) return
  if (context && side.value) {
    context.requestInvoke(side.value, registration)
  } else {
    emit('invoked', { swipeControl: null })
  }
}
</script>

<template>
  <!-- 项按钮:满高色块;显式 background/foreground 以内联样式覆盖类默认(与 XAML 本地值优先级一致);
       Execute 模式按阈值切换 pre(ControlStrongFillColorDefault 前)/post(AccentFillColorDefault 底 +
       TextOnAccentFillColorPrimary 前)配色 -->
  <button
    v-bind="$attrs"
    ref="rootEl"
    type="button"
    class="wui-swipeitem"
    :class="{
      'wui-swipeitem--execute': isExecute && isPrimary,
      'wui-swipeitem--threshold': isExecute && isPrimary && isThresholdReached,
      'wui-swipeitem--disabled': isDisabled,
    }"
    :style="{
      background: background || undefined,
      color: foreground || undefined,
    }"
    :aria-label="text || undefined"
    :disabled="isDisabled || undefined"
    @click="onItemTap"
  >
    <span v-if="icon" class="wui-swipeitem__icon" aria-hidden="true">{{ icon }}</span>
    <span v-if="text" class="wui-swipeitem__label">{{ text }}</span>
  </button>
</template>

<style scoped>
/* 项按钮:MinWidth 68(s_swipeItemWidth / SwipeItemStyle)、满高(OnSizeChanged 设 Height=控件高);
   内容盒 Margin 4,4,4,2 → padding 4px 4px 2px。 */
.wui-swipeitem {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 68px;
  height: 100%;
  padding: 4px 4px 2px;
  font-family: inherit;
  font-size: 12px;
  /* SwipeItemForeground(L6/L15)→ TextFillColorPrimaryBrush */
  color: var(--wui-text-fill-color-primary);
  /* SwipeItemBackground(L5/L14)→ ControlFillColorTertiaryBrush */
  background: var(--wui-control-fill-color-tertiary);
  border: none;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

/* Execute 模式:单项满铺(OnSizeChanged 设 Width=控件宽);配色取
   SwipeItemPreThresholdExecuteForeground(L8/L17)→ ControlStrongFillColorDefaultBrush。
   背景 SwipeItemPreThresholdExecuteBackground(L9/L18)= ControlFillColorTertiaryBrush,
   与 SwipeItemBackground 同键,故沿用 .wui-swipeitem 的底色,不另立规则。 */
.wui-swipeitem--execute {
  width: 100%;
  color: var(--wui-control-strong-fill-color-default);
}

/* Execute 过阈值(post-threshold):SwipeItemPostThresholdExecuteBackground(L11/L20)
   → AccentFillColorDefaultBrush;Foreground(L10/L19)→ TextOnAccentFillColorPrimaryBrush */
.wui-swipeitem--execute.wui-swipeitem--threshold {
  color: var(--wui-text-on-accent-fill-color-primary);
  background: var(--wui-accent-fill-color-default);
}

/* 图标:Viewbox MaxHeight 16 + Content Margin 0,0,0,2 → 16px 字形、下距 2px */
.wui-swipeitem__icon {
  margin-bottom: 2px;
  font-family: var(--wui-symbol-theme-font-family, 'Segoe Fluent Icons', 'Segoe MDL2 Assets');
  font-size: 16px;
  line-height: 1;
}

/* 文本:FontSize 12、居中、换行(TextLabel) */
.wui-swipeitem__label {
  font-size: 12px;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
}

/* 按下态:SwipeItemBackgroundPressed(L7/L16)→ ControlAltFillColorQuarternaryBrush
   (显式内联背景时不覆盖,与 XAML 本地值语义一致) */
.wui-swipeitem:active {
  background: var(--wui-control-alt-fill-color-quarternary);
}

/* 禁用:源 SwipeItemStyle 的 Disabled 视觉态为空(仅不可交互,颜色与常态一致),不做禁用变灰 */
.wui-swipeitem--disabled {
  cursor: default;
}

/* 系统焦点视觉:SwipeItem 非 Control(generic.xaml 无焦点模板),按全内描瓦片约定
   画系统双环(primary 黑/白 inset 2px + secondary 1px),禁用强调蓝 */
.wui-swipeitem:focus-visible {
  box-shadow: inset 0 0 0 2px var(--wui-system-control-focus-visual-primary);
  outline: 1px solid var(--wui-system-control-focus-visual-secondary);
  outline-offset: -3px;
}
</style>
