// Demo 模板组件局部文案 —— 仅覆盖 demo/i18n 键集之外的文案(约束:不修改 demo/i18n/**)。
// 运行时按 i18n.locale 前缀(zh* → 中文)选择;待 demo/i18n 键集扩充后可迁移至 demo/i18n/locales/*。
import { computed, inject } from 'vue'
import type { Ref } from 'vue'
import { createI18n, i18nKey } from '../i18n'
import type { I18n } from '../i18n'

/** 中英双语文案;zhTW 为繁体变体(zh-TW 等繁体场合),缺省回退 zh。 */
export interface BilingualText {
  zh: string
  zhTW?: string
  en: string
}

/**
 * 组件内取 i18n 实例:站点壳 provideI18n() 之后取共享实例;
 * 壳未接线前回退本地实例(按浏览器语言探测),保证示例页始终可用。
 */
export function useDemoI18n(): I18n {
  return inject(i18nKey) ?? createI18n()
}

/** 依据当前语言挑选文案(即时值);繁体场合(zh-TW/Hant)取 zhTW,缺省回退 zh。 */
export function pickText(i18n: I18n, text: BilingualText): string {
  const locale = i18n.locale.value
  if (locale.startsWith('zh')) {
    if (locale.startsWith('zh-TW') || /hant/i.test(locale)) return text.zhTW ?? text.zh
    return text.zh
  }
  return text.en
}

/** 依据当前语言挑选文案,返回随语言切换更新的响应式计算属性。 */
export function useBilingual(i18n: I18n, text: BilingualText): Ref<string> {
  return computed(() => pickText(i18n, text))
}

/** 参数面板区标题。 */
export const LABEL_OPTIONS: BilingualText = { zh: '参数', zhTW: '參數', en: 'Options' }

/** 主题预览切换组的无障碍标签。 */
export const LABEL_THEME_PREVIEW: BilingualText = { zh: '主题预览', zhTW: '主題預覽', en: 'Theme preview' }

/** 复制按钮文案。 */
export const LABEL_COPY: BilingualText = { zh: '复制', zhTW: '複製', en: 'Copy' }

/** 复制成功文案。 */
export const LABEL_COPIED: BilingualText = { zh: '已复制', zhTW: '已複製', en: 'Copied' }

/** 页头教学文档回链行前缀(wiki/controls/<Name>.md)。 */
export const LABEL_WIKI_DOC: BilingualText = { zh: '教学文档', zhTW: '教學文件', en: 'Tutorial doc' }
