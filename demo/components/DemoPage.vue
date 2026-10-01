<script setup lang="ts">
// 示例页外壳(定稿项目规范):页头 → 交互演示区(#demo)→ 参数面板区(#options)→ 文档区(#docs)。
// 「上半区可交互、下半区固定开发文档」由本组件承载;控件示例页只需按名填充三个 slot。
// 依赖的真实控件落地后仅替换 slot 内的演示对象,本模板不动。
// FIX23(构成检查):壳层自身控件(主题预览按钮)亦用库内 WuiToggleButton——
// 激活态 = 组件内置 checked 视觉(强调色底白字,与原 aria-pressed 语义一致)。
import { computed, ref } from 'vue'
import WuiToggleButton from '@/components/ToggleButton.vue'
import { LABEL_OPTIONS, LABEL_THEME_PREVIEW, LABEL_WIKI_DOC, useBilingual, useDemoI18n } from './labels'

defineProps<{
  /** 页头标题(控件名)。 */
  title: string
  /** 页头描述(可选)。 */
  description?: string
  /**
   * 对应教学文档名(可选):传入 Name 即在页头下渲染「教学文档:wiki/controls/Name.md」回链行。
   * wiki/*.md 不在构建产物内,链接只作仓库路径提示(惯性 # 锚,点击不跳转),
   * 与 wiki/controls/*.md 顶部「在线示例:/#/route」互链约定对齐。
   */
  wiki?: string
}>()

const i18n = useDemoI18n()
const optionsTitle = useBilingual(i18n, LABEL_OPTIONS)
const themePreviewLabel = useBilingual(i18n, LABEL_THEME_PREVIEW)
const wikiDocLabel = useBilingual(i18n, LABEL_WIKI_DOC)

// —— 浅/深主题预览切换 ——
// theme.css 只在 :root[data-theme="light|dark"] 上定义 token,因此预览通过写 html[data-theme] 生效
// (与 theme.css 头注及站点壳 useThemeSetting 的写入约定一致),影响范围为整个站点预览;
// 站点壳再次切换档位时会按其偏好覆写,属预期。
type PreviewTheme = 'light' | 'dark'
const previewTheme = ref<PreviewTheme>(
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
)

function applyPreview(theme: PreviewTheme): void {
  previewTheme.value = theme
  document.documentElement.dataset.theme = theme
}

// WuiToggleButton 的 checked 双向模型:互斥(选中其一)。set(false)(点击已选中档)不落底,
// 档位保持不变,与原 aria-pressed 按钮的行为一致。
const lightChecked = computed<boolean>({
  get: () => previewTheme.value === 'light',
  set: (checked) => {
    if (checked) applyPreview('light')
  },
})

const darkChecked = computed<boolean>({
  get: () => previewTheme.value === 'dark',
  set: (checked) => {
    if (checked) applyPreview('dark')
  },
})
</script>

<template>
  <section class="demo-page">
    <header class="page-header">
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="description" class="page-description">{{ description }}</p>
      <p v-if="wiki" class="page-wiki-doc">
        📖 {{ wikiDocLabel }}:<a class="wiki-doc-link" href="#" @click.prevent>wiki/controls/{{ wiki }}.md</a>
      </p>
    </header>

    <!-- 上半区:交互演示 -->
    <section class="page-section">
      <div class="section-head">
        <h2 class="section-title">{{ i18n.t('examples') }}</h2>
        <div class="theme-toggle" role="group" :aria-label="themePreviewLabel">
          <WuiToggleButton v-model:checked="lightChecked" class="theme-option">
            {{ i18n.t('themeLight') }}
          </WuiToggleButton>
          <WuiToggleButton v-model:checked="darkChecked" class="theme-option">
            {{ i18n.t('themeDark') }}
          </WuiToggleButton>
        </div>
      </div>
      <div class="demo-canvas">
        <slot name="demo" />
      </div>
    </section>

    <!-- 上半区:参数面板(与演示联动) -->
    <section class="page-section">
      <h2 class="section-title">{{ optionsTitle }}</h2>
      <slot name="options" />
    </section>

    <!-- 下半区:固定开发文档 -->
    <section class="page-section">
      <h2 class="section-title">{{ i18n.t('docs') }}</h2>
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

/* 教学文档回链行(小字,与描述同级;wiki 不在构建产物内,锚点仅作路径提示) */
.page-wiki-doc {
  margin: 4px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 教学文档回链配色走壳层达标 token(浅 #0067C0 / 深 #4CC2FF,对比度依据见
   demo/App.vue 全局块注释);hover 两主题均达标,:active 保持 WinUI 提取值。 */
.wiki-doc-link {
  color: var(--wui-shell-hyperlink-foreground);
  text-decoration: underline;
}

.wiki-doc-link:hover {
  color: var(--wui-hyperlink-button-foreground-pointer-over);
}

.wiki-doc-link:active {
  color: var(--wui-hyperlink-button-foreground-pressed);
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

/* 浅/深主题预览切换(写 html[data-theme],站点级预览)。
   控件本体是 WuiToggleButton(FIX23):视觉/悬停/激活(checked = 强调色底白字,
   aria-pressed 由组件给出)全部走组件内置状态,壳层仅保留原紧凑排版约束
   (12px 小字号 + 窄内边距;带父级限定稳定压过组件根 padding)。 */
.theme-toggle {
  display: flex;
  gap: 4px;
}

.theme-toggle .theme-option {
  padding: 3px 12px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
}
</style>
