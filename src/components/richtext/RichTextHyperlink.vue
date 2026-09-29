<script setup lang="ts">
// RichTextHyperlink —— XAML 文档模型的行内超链接(Inline 元素,区别于控件 HyperlinkButton)。
// 视觉对照 generic.xaml:默认前景 SystemControlHyperlinkTextBrush(= 主题强调色,
// token --wui-hyperlink-button-foreground),内联 Hyperlink 默认带下划线;
// 悬停/按下变色沿用同族笔刷(PageTextBaseMedium / HighlightBaseMediumLow,即
// --wui-hyperlink-button-foreground-pointer-over / -pressed,与 HyperlinkButton 一致的调色板);
// 焦点:HyperlinkFocusRectCornerRadius=4,近似为 :focus-visible outline。
// 语义:navigateUri 有值渲染 <a>(浏览器默认导航,处理器内 event.preventDefault() 可拦截);
// 为空渲染 role="link" 的行内 span(仅触发 click;Enter/Space 激活,对应 WinUI 只处理 Click 的用法)。
import { computed, useAttrs } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 目标 URI(对应 NavigateUri);为空时不渲染 <a>,仅作为行内链接触发 click。 */
    navigateUri?: string
    /** 链接打开方式(HTML target);_blank 时自动附加 rel="noopener noreferrer"。 */
    target?: string
    /** 是否显示下划线(WinUI 内联 Hyperlink 默认带下划线)。 */
    underline?: boolean
    /** 前景色;默认主题强调色 token,可显式覆盖(对应 Hyperlink.Foreground)。 */
    foreground?: string
  }>(),
  { underline: true },
)

// 显式声明 click:外部 @click 监听不再经 $attrs 透传,避免行内原生 click 重复触发。
const emit = defineEmits<{
  click: [event: MouseEvent | KeyboardEvent]
}>()

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const hasUri = computed(
  () => typeof props.navigateUri === 'string' && props.navigateUri.trim() !== '',
)

// _blank 外链安全:强制合并 noopener noreferrer(调用方自定义 rel 经 attrs 合并保留)。
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
  // 透传原生事件:处理器内 event.preventDefault() 可取消 <a> 的默认导航
  emit('click', event)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    // 键盘可达:Enter/Space 触发 click(仅无 navigateUri 的 span 分支需要)
    event.preventDefault()
    emit('click', event)
  }
}
</script>

<template>
  <!-- navigateUri 有值:<a> 语义,浏览器默认导航 -->
  <a
    v-if="hasUri"
    v-bind="$attrs"
    class="wui-richtext-hyperlink"
    :class="{ 'wui-richtext-hyperlink--plain': !underline }"
    :style="{ color: foreground }"
    :href="navigateUri"
    :target="target || undefined"
    :rel="relValue"
    @click="onClick"
  >
    <slot />
  </a>
  <!-- navigateUri 为空:行内 link 语义,仅触发 click 不导航 -->
  <span
    v-else
    v-bind="$attrs"
    class="wui-richtext-hyperlink"
    :class="{ 'wui-richtext-hyperlink--plain': !underline }"
    :style="{ color: foreground }"
    role="link"
    tabindex="0"
    @click="onClick"
    @keydown="onKeydown"
  >
    <slot />
  </span>
</template>

<style scoped>
.wui-richtext-hyperlink {
  /* Normal = SystemControlHyperlinkTextBrush(主题强调色),可被 foreground prop 覆盖 */
  color: var(--wui-hyperlink-button-foreground);
  /* 内联 Hyperlink 默认带下划线(HyperlinkUnderlineVisible 家族行为) */
  text-decoration-line: underline;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
}

.wui-richtext-hyperlink--plain {
  text-decoration-line: none;
}

/* PointerOver = SystemControlPageTextBaseMedium(变灰),与 HyperlinkButton 同族 */
.wui-richtext-hyperlink:hover {
  color: var(--wui-hyperlink-button-foreground-pointer-over);
}

/* Pressed = SystemControlHighlightBaseMediumLow */
.wui-richtext-hyperlink:active {
  color: var(--wui-hyperlink-button-foreground-pressed);
}

/* 焦点矩形:HyperlinkFocusRectCornerRadius=4 → 近似为 primary 色单环 outline */
.wui-richtext-hyperlink:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-richtext-hyperlink:focus:not(:focus-visible) {
  outline: none;
}
</style>
