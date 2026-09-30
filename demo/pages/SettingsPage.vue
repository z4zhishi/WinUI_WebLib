<script setup lang="ts">
// 设置页(阶段 8 站点收尾,路由 /settings):主题三档(WuiRadioButton,接
// demo/composables/useThemeSetting.ts 共享实例,与顶栏切换器状态一致)、
// 语言下拉(WuiComboBox,接 demo/i18n 的 setLocale,六语言)、关于区
// (版本/分组数/控件数/源数据与参考实现链接,链接用 WuiHyperlinkButton)。
// 全部用已入库控件构建(吃自己的狗粮),文案走 i18n chrome 键,样式 --wui-* token。
import { computed } from 'vue'
import WuiComboBox from '@/components/ComboBox.vue'
import WuiHyperlinkButton from '@/components/HyperlinkButton.vue'
import WuiInfoBar from '@/components/InfoBar.vue'
import WuiRadioButton from '@/components/RadioButton.vue'
import { GROUP_COUNT, ITEM_COUNT } from '../data/catalog'
import { LOCALES, useI18n } from '../i18n'
import type { Locale } from '../i18n'
import { useThemeSetting } from '../composables/useThemeSetting'
import type { ThemeMode } from '../composables/useThemeSetting'

const i18n = useI18n()
const { mode, setMode } = useThemeSetting()

// —— 主题三档(文案随界面语言更新)——
const themeOptions = computed<{ value: ThemeMode; label: string }[]>(() => [
  { value: 'light', label: i18n.t('themeLight') },
  { value: 'dark', label: i18n.t('themeDark') },
  { value: 'system', label: i18n.t('themeSystem') },
])

/** 仅响应「进入选中态」;退出选中态由同组互斥产生,不需处理。 */
function onThemeChecked(value: ThemeMode, checked: boolean): void {
  if (checked) setMode(value)
}

// —— 语言下拉(各语言自称用本地语言原文,不随界面语言翻译,与顶栏一致)——
const LOCALE_LABELS: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  fr: 'Français',
  ko: '한국어',
}
const localeOptions = LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value] }))

const selectedLocaleIndex = computed(() =>
  localeOptions.findIndex((option) => option.value === i18n.locale.value),
)

/** 选中变化 → setLocale;忽略程序化回写(索引已与当前语言一致)造成的重入。 */
function onLocaleSelectionChanged(index: number): void {
  const option = localeOptions[index]
  if (option && option.value !== i18n.locale.value) {
    i18n.setLocale(option.value)
  }
}

// —— 关于区 ——
// 与 package.json version 保持一致(tsconfig 未开 resolveJsonModule,不直接 import)。
const SITE_VERSION = '0.1.0'

const aboutRows = computed<{ label: string; value?: string }[]>(() => [
  { label: i18n.t('settingsVersion'), value: SITE_VERSION },
  { label: i18n.t('settingsGroupsCount'), value: String(GROUP_COUNT) },
  { label: i18n.t('settingsItemsCount'), value: String(ITEM_COUNT) },
])
</script>

<template>
  <section class="settings-page">
    <header class="settings-header">
      <h2 class="settings-title">{{ i18n.t('settingsTitle') }}</h2>
    </header>

    <!-- 偏好持久化说明(不可关闭的提示条) -->
    <WuiInfoBar
      is-open
      :is-closable="false"
      :message="i18n.t('settingsPersistHint')"
      :close-button-aria-label="i18n.t('close')"
    />

    <!-- 主题三档 -->
    <section class="settings-section" :aria-label="i18n.t('settingsTheme')">
      <h3 class="settings-section-title">{{ i18n.t('settingsTheme') }}</h3>
      <p class="settings-section-hint">{{ i18n.t('settingsThemeHint') }}</p>
      <div
        class="settings-radio-row"
        role="radiogroup"
        :aria-label="i18n.t('settingsTheme')"
      >
        <WuiRadioButton
          v-for="option in themeOptions"
          :key="option.value"
          group-name="site-theme"
          :content="option.label"
          :checked="mode === option.value"
          @checked="onThemeChecked(option.value, true)"
        />
      </div>
    </section>

    <!-- 语言下拉 -->
    <section class="settings-section" :aria-label="i18n.t('settingsLanguage')">
      <h3 class="settings-section-title">{{ i18n.t('settingsLanguage') }}</h3>
      <WuiComboBox
        class="settings-combo"
        style="width: 240px; max-width: 100%"
        :items="localeOptions"
        display-member-path="label"
        :selected-index="selectedLocaleIndex"
        @selection-changed="onLocaleSelectionChanged"
      />
    </section>

    <!-- 关于区:静态指标 + 外部链接 -->
    <section class="settings-section" :aria-label="i18n.t('settingsAbout')">
      <h3 class="settings-section-title">{{ i18n.t('settingsAbout') }}</h3>
      <dl class="settings-about">
        <div v-for="row in aboutRows" :key="row.label" class="settings-about-row">
          <dt class="settings-about-label">{{ row.label }}</dt>
          <dd class="settings-about-value">{{ row.value }}</dd>
        </div>
        <div class="settings-about-row">
          <dt class="settings-about-label">{{ i18n.t('settingsSourceData') }}</dt>
          <dd class="settings-about-value">
            <WuiHyperlinkButton
              navigate-uri="https://github.com/microsoft/WinUI-Gallery"
              target="_blank"
              content="WinUI Gallery (GitHub)"
            />
          </dd>
        </div>
        <div class="settings-about-row">
          <dt class="settings-about-label">{{ i18n.t('settingsReference') }}</dt>
          <dd class="settings-about-value">
            <WuiHyperlinkButton
              navigate-uri="https://github.com/microsoft/microsoft-ui-xaml"
              target="_blank"
              content="microsoft-ui-xaml (GitHub)"
            />
          </dd>
        </div>
      </dl>
    </section>
  </section>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 640px;
  color: var(--wui-application-foreground-theme);
}

/* ---- 页头 ---- */
.settings-header {
  margin: 0;
}

.settings-title {
  margin: 0;
  font-size: var(--wui-text-style-extra-large-font-size);
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
}

/* ---- 分节 ---- */
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-section-title {
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
  font-size: var(--wui-list-view-header-item-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.settings-section-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* ---- 主题单选组 ---- */
.settings-radio-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
}

/* ---- 语言下拉(宽度走内联 style:scoped 类对子组件根不可靠) ---- */

/* ---- 关于区(键值行) ---- */
.settings-about {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
}

.settings-about-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.settings-about-row:last-child {
  border-bottom: 0;
}

.settings-about-label {
  color: var(--wui-application-secondary-foreground-theme);
}

.settings-about-value {
  display: flex;
  align-items: center;
  margin: 0;
  font-weight: 600;
  color: var(--wui-application-header-foreground-theme);
}
</style>
