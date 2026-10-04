<script setup lang="ts">
// RichTextHyperlink —— XAML 文档模型的行内超链接(Inline 元素,区别于控件 HyperlinkButton)。
// 视觉对照 WinUI 3 生效层 controls/dev/CommonStyles/Hyperlink_themeresources.xaml:
// HyperlinkForeground = AccentTextFillColorPrimaryBrush(Default/Light 两字典同键,L5/L15),
// 即主题派生的强调文本画刷 token --wui-accent-text-fill-color-primary(浅 SystemAccentColorDark2、
// 深 SystemAccentColorLight3);内联 Hyperlink 默认带下划线;
// 悬停/按下沿用同族权威笔刷 AccentTextFillColorSecondary / Tertiary
// (token --wui-accent-text-fill-color-secondary / -tertiary,与 HyperlinkButton 一致的调色板);
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
    /** 前景色;默认 AccentTextFillColorPrimary 语义 token,可显式覆盖(对应 Hyperlink.Foreground)。 */
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
  /* Normal = HyperlinkForeground = AccentTextFillColorPrimaryBrush(PL22 订正):此前用 legacy
     --wui-hyperlink-button-foreground(原始强调色,浅深同为 #0078D4),在重定向后的 Fluent
     卡片底(#FBFBFB / #2B2B2B)上仅 4.39 / 3.12,不达 WCAG AA;权威生效层两主题均取
     主题派生的 AccentTextFillColorPrimary。可被 foreground prop 覆盖 */
  color: var(--wui-accent-text-fill-color-primary);
  /* 内联 Hyperlink 默认带下划线(HyperlinkUnderlineVisible 家族行为) */
  text-decoration-line: underline;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
}

.wui-richtext-hyperlink--plain {
  text-decoration-line: none;
}

/* PointerOver = 权威 HyperlinkForegroundPointerOver = AccentTextFillColorSecondary,与 HyperlinkButton 同族 */
.wui-richtext-hyperlink:hover {
  color: var(--wui-accent-text-fill-color-secondary);
}

/* Pressed = 权威 HyperlinkForegroundPressed = AccentTextFillColorTertiary */
.wui-richtext-hyperlink:active {
  color: var(--wui-accent-text-fill-color-tertiary);
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
