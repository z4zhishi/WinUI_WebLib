<script setup lang="ts">
// HyperlinkButton.vue —— WinUI HyperlinkButton 控件的 Web 复刻(阶段 1 基础控件)。
// 视觉与状态对照源:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L6387 起
// TargetType="HyperlinkButton" 的 Style/ControlTemplate —— 背景各状态均透明、边框厚度 0,
// 四态仅切换前景色:Normal=SystemControlHyperlinkTextBrush(强调色),
// PointerOver=SystemControlPageTextBaseMedium / Pressed=SystemControlHighlightBaseMediumLow(变灰),
// Disabled=SystemControlDisabledBaseMediumLow;HyperlinkUnderlineVisible=True 决定文字
// 默认带下划线(悬停/按下仅变色,下划线不消失)。
// 语义:navigateUri 有值渲染 <a>(浏览器默认导航,调用方在 click 处理器中
// event.preventDefault() 可拦截);为空渲染 <button>(仅触发 click 不导航,
// 对应官方示例二「只处理 Click」)。
import { computed, useAttrs } from 'vue'

const props = defineProps<{
  /** 链接文字内容;更复杂内容(图标 + 文字组合)用默认插槽放置(兜底显示本属性)。 */
  content?: string
  /** 目标 URI(对应 WinUI NavigateUri);为空时不渲染 <a>,仅作为按钮触发 click。 */
  navigateUri?: string
  /** 链接打开方式(HTML target,如 _blank);_blank 时自动附加 rel="noopener noreferrer"。 */
  target?: string
  /** 是否禁用(对应 WinUI IsEnabled);禁用后不触发 click、不导航。 */
  disabled?: boolean
}>()

// 显式声明 click:外部 @click 监听不再经 $attrs 透传到根节点,避免原生 click 重复触发。
const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

defineOptions({
  // class/style 由根节点 v-bind="$attrs" 透传,其余 attrs(aria-* 等)一并透传。
  inheritAttrs: false,
})

const attrs = useAttrs()

const hasUri = computed(
  () => typeof props.navigateUri === 'string' && props.navigateUri.trim() !== '',
)

// 外部链接安全:target="_blank" 强制携带 noopener noreferrer;
// 调用方经 attrs 传入的自定义 rel 会被合并保留,不会丢失。
const relValue = computed<string | undefined>(() => {
  const userRel = typeof attrs.rel === 'string' ? attrs.rel : ''
  const tokens = userRel.split(/\s+/).filter(Boolean)
  if (props.target === '_blank') {
    if (!tokens.includes('noopener')) tokens.push('noopener')
    if (!tokens.includes('noreferrer')) tokens.push('noreferrer')
  }
  return tokens.length > 0 ? tokens.join(' ') : undefined
})

function onClick(event: MouseEvent): void {
  if (props.disabled) {
    // WinUI 禁用控件不引发 Click,也不执行导航。
    event.preventDefault()
    return
  }
  // 透传原生事件:调用方在处理器内 event.preventDefault() 时,
  // <a> 分支的默认导航被浏览器取消(与 WinUI 中自行处理 Click 的语义对应)。
  emit('click', event)
}
</script>

<template>
  <!-- navigateUri 有值:<a> 语义,浏览器默认导航;先 $attrs 后具名绑定,保证 rel/target 不被覆盖 -->
  <a
    v-if="hasUri"
    v-bind="$attrs"
    class="wui-hyperlink-button"
    :class="{ 'is-disabled': disabled }"
    :href="navigateUri"
    :target="target || undefined"
    :rel="relValue"
    :aria-disabled="disabled ? 'true' : undefined"
    :tabindex="disabled ? -1 : undefined"
    @click="onClick"
  >
    <slot>{{ content }}</slot>
  </a>
  <!-- navigateUri 为空:button 语义,仅触发 click 不跳转(对应官方示例二) -->
  <button
    v-else
    v-bind="$attrs"
    type="button"
    class="wui-hyperlink-button"
    :disabled="disabled"
    @click="onClick"
  >
    <slot>{{ content }}</slot>
  </button>
</template>

<style scoped>
.wui-hyperlink-button {
  display: inline-flex;
  align-items: center;
  /* HyperlinkButtonPadding = 0,6,0,7 */
  padding: 6px 0 7px;
  font-family: var(--wui-content-control-theme-font-family);
  /* ControlContentThemeFontSize = 14px */
  font-size: var(--wui-control-content-theme-font-size);
  /* HyperlinkButtonForeground = SystemControlHyperlinkTextBrush(主题强调色) */
  color: var(--wui-hyperlink-button-foreground);
  /* 背景/边框各状态均透明(HyperlinkButton*Background/BorderBrush 资源);
     HyperlinkButtonBorderThemeThickness = 0 */
  background: var(--wui-hyperlink-button-background);
  border: none;
  /* 圆角:模板根 ContentPresenter CornerRadius={TemplateBinding CornerRadius},
     WinUI 3 默认取 ControlCornerRadius(4px);常态背景透明不可见,
     hover/pressed 底板(T9 批次)随此圆角 */
  border-radius: var(--wui-control-corner-radius);
  /* HyperlinkUnderlineVisible = True:默认下划线,状态切换仅变色、下划线不消失 */
  text-decoration: underline;
  /* WinUI 超链接悬停为手型光标(区别于普通 Button 的箭头) */
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
}

/* 状态色一律即时切换(generic.xaml 各态均为 DiscreteObjectKeyFrame,无过渡动画) */

.wui-hyperlink-button:hover:not(:disabled):not(.is-disabled) {
  /* PointerOver = SystemControlPageTextBaseMedium */
  color: var(--wui-hyperlink-button-foreground-pointer-over);
  background: var(--wui-hyperlink-button-background-pointer-over);
}

.wui-hyperlink-button:active:not(:disabled):not(.is-disabled) {
  /* Pressed = SystemControlHighlightBaseMediumLow */
  color: var(--wui-hyperlink-button-foreground-pressed);
  background: var(--wui-hyperlink-button-background-pressed);
}

.wui-hyperlink-button:disabled,
.wui-hyperlink-button.is-disabled {
  /* Disabled = SystemControlDisabledBaseMediumLow */
  color: var(--wui-hyperlink-button-foreground-disabled);
  background: var(--wui-hyperlink-button-background-disabled);
  cursor: default;
}

/* 系统焦点视觉:WinUI 双环(primary 外环 2px + secondary 内环 1px,
   FocusVisualMargin=-3)按双环实现 */
.wui-hyperlink-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}

.wui-hyperlink-button:focus:not(:focus-visible) {
  outline: none;
}
</style>
