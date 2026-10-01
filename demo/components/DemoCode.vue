<script setup lang="ts">
// 代码块:等宽字体、深色底(chrome-black token,两种主题下均为黑底白字)、右上角复制按钮。
// 复制:navigator.clipboard 优先,失败降级 document.execCommand('copy')。
// FIX23(构成检查):复制按钮用库内 WuiButton——配色经其 background/foreground/
// borderBrush/fontSize 属性注入(贴代码栏黑底白字原视觉),悬停/按下/焦点态走组件
// 内置 VSM,壳层不再手写裸 <button>。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import { LABEL_COPIED, LABEL_COPY, pickText, useDemoI18n } from './labels'

const props = defineProps<{
  /** 代码文本(去掉首尾空行后原样展示,保留缩进与换行)。 */
  code: string
  /** 语言角标,如 'vue' | 'ts';仅作展示。 */
  language?: string
}>()

const i18n = useDemoI18n()

const copied = ref(false)
let resetTimer: number | undefined

const displayCode = computed(() => props.code.replace(/^\n+/, '').replace(/\s+$/, ''))

const copyLabel = computed(() =>
  pickText(i18n, copied.value ? LABEL_COPIED : LABEL_COPY),
)

async function copyCode(): Promise<void> {
  const ok = await writeClipboard(displayCode.value)
  if (!ok) return
  copied.value = true
  if (resetTimer !== undefined) window.clearTimeout(resetTimer)
  resetTimer = window.setTimeout(() => {
    copied.value = false
  }, 2000)
}

/** navigator.clipboard 优先;非安全上下文或权限被拒时降级 execCommand。 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    document.body.removeChild(textarea)
    return ok
  }
}
</script>

<template>
  <figure class="code-block">
    <figcaption class="code-bar">
      <span v-if="language" class="code-language">{{ language }}</span>
      <span v-else class="code-language-placeholder" aria-hidden="true"></span>
      <WuiButton
        class="copy-button"
        background="var(--wui-system-control-transparent)"
        foreground="var(--wui-system-control-foreground-chrome-white)"
        border-brush="var(--wui-menu-flyout-separator-theme)"
        :font-size="'var(--wui-tool-tip-content-theme-font-size)'"
        @click="copyCode"
      >
        {{ copyLabel }}
      </WuiButton>
    </figcaption>
    <!-- tabindex=0:横向滚动的代码区键盘可达(a11y QA scrollable-region-focusable) -->
    <pre class="code-pre" tabindex="0"><code>{{ displayCode }}</code></pre>
  </figure>
</template>

<style scoped>
.code-block {
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* chrome-black / chrome-white token 在浅深两主题下均为黑底白字,代码块观感恒定 */
.code-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  color: var(--wui-system-control-foreground-chrome-white);
  background: var(--wui-system-control-background-chrome-black-high);
}

.code-language {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-foreground-chrome-gray);
}

.code-language-placeholder {
  flex: 1;
}

/* 复制按钮视觉全部由 WuiButton 提供(配色经其属性注入,悬停/按下/焦点走组件 VSM);
   类名 copy-button 仅作壳层钩子保留,不再承担样式。 */

.code-pre {
  margin: 0;
  padding: 12px 16px;
  overflow-x: auto;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: var(--wui-control-content-theme-font-size);
  line-height: 1.6;
  color: var(--wui-system-control-foreground-chrome-white);
  background: var(--wui-system-control-background-chrome-black-high);
}
</style>
