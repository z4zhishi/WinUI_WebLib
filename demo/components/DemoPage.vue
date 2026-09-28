<script setup lang="ts">
// 示例页外壳(定稿项目规范):页头 → 交互演示区(#demo)→ 参数面板区(#options)→ 文档区(#docs)。
// 「上半区可交互、下半区固定开发文档」由本组件承载;控件示例页只需按名填充三个 slot。
// 依赖的真实控件落地后仅替换 slot 内的演示对象,本模板不动。
import { ref } from 'vue'
import { LABEL_OPTIONS, LABEL_THEME_PREVIEW, useBilingual, useDemoI18n } from './labels'

defineProps<{
  /** 页头标题(控件名)。 */
  title: string
  /** 页头描述(可选)。 */
  description?: string
}>()

const i18n = useDemoI18n()
const optionsTitle = useBilingual(i18n, LABEL_OPTIONS)
const themePreviewLabel = useBilingual(i18n, LABEL_THEME_PREVIEW)

// —— 浅/深主题预览切换 ——
// theme.css 只在 :root[data-theme="light|dark"] 上定义 token,因此预览通过写 html[data-theme] 生效
// (与 theme.css 头注「系统跟随由 JS 设置 html[data-theme]」的约定一致),影响范围为整个站点预览。
type PreviewTheme = 'light' | 'dark'
const previewTheme = ref<PreviewTheme>('light')

function applyPreview(theme: PreviewTheme): void {
  previewTheme.value = theme
  document.documentElement.dataset.theme = theme
}
</script>

<template>
  <section class="demo-page">
    <header class="page-header">
      <h2 class="page-title">{{ title }}</h2>
      <p v-if="description" class="page-description">{{ description }}</p>
    </header>

    <!-- 上半区:交互演示 -->
    <section class="page-section">
      <div class="section-head">
        <h3 class="section-title">{{ i18n.t('examples') }}</h3>
        <div class="theme-toggle" role="group" :aria-label="themePreviewLabel">
          <button
            type="button"
            class="theme-option"
            :aria-pressed="previewTheme === 'light'"
            @click="applyPreview('light')"
          >
            {{ i18n.t('themeLight') }}
          </button>
          <button
            type="button"
            class="theme-option"
            :aria-pressed="previewTheme === 'dark'"
            @click="applyPreview('dark')"
          >
            {{ i18n.t('themeDark') }}
          </button>
        </div>
      </div>
      <div class="demo-canvas">
        <slot name="demo" />
      </div>
    </section>

    <!-- 上半区:参数面板(与演示联动) -->
    <section class="page-section">
      <h3 class="section-title">{{ optionsTitle }}</h3>
      <slot name="options" />
    </section>

    <!-- 下半区:固定开发文档 -->
    <section class="page-section">
      <h3 class="section-title">{{ i18n.t('docs') }}</h3>
      <slot name="docs" />
    </section>
  </section>
</template>

<style scoped>
.demo-page {
  display: flex;
  flex-direction: column;
  gap: 40px;
  color: var(--wui-application-foreground-theme);
}

.page-header {
  margin: 0;
}

.page-title {
  margin: 0;
  font-size: var(--wui-text-style-extra-large-font-size);
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
}

.page-description {
  margin: 8px 0 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.page-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.section-title {
  flex: 1;
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
  font-size: var(--wui-list-view-header-item-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* WinUI 风格演示容器 */
.demo-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: 32px 24px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 浅/深主题预览切换(写 html[data-theme],站点级预览) */
.theme-toggle {
  display: flex;
  gap: 4px;
}

.theme-option {
  padding: 3px 12px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.theme-option:hover {
  background: var(--wui-button-pointer-over-background-theme);
  color: var(--wui-button-pointer-over-foreground-theme);
}

.theme-option[aria-pressed='true'] {
  color: var(--wui-system-control-foreground-alt-high);
  background: var(--wui-toggle-switch-curtain-background-theme);
  border-color: var(--wui-system-control-transparent);
}
</style>
