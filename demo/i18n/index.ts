// 手写 i18n 基建(零依赖,不使用 vue-i18n):六语言、浏览器语言自动识别、localStorage 持久化。
// 站点壳任务在入口处调用 createI18n() + provideI18n() 完成接线。
import { inject, provide, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import en from './locales/en'
import fr from './locales/fr'
import ja from './locales/ja'
import ko from './locales/ko'
import zhCN from './locales/zh-CN'
import zhTW from './locales/zh-TW'

/** 支持的语言键。 */
export const LOCALES = ['zh-CN', 'zh-TW', 'en', 'ja', 'fr', 'ko'] as const
export type Locale = (typeof LOCALES)[number]
/** 未命中任何规则时的回退语言。 */
export const DEFAULT_LOCALE: Locale = 'en'
/** 语言覆盖使用的 localStorage 键名。 */
export const LOCALE_STORAGE_KEY = 'winuionweb.locale'

/** 文案占位符参数,如 t('homeSubtitle', { name: 'Win' })。 */
export type I18nParams = Record<string, string | number>

/** 以 en 的键为全集;各语言资源必须补齐相同键(编译期校验)。 */
export type MessageKey = keyof typeof en
export type Messages = { [K in MessageKey]: string }

// 各语言资源目录(编译期保证键完整)。
const catalogs: Record<Locale, Messages> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  fr,
  ja,
  ko,
}
// 查询用:string 索引版本,支持任意 key 的回退链。
const messages: Record<Locale, Record<string, string>> = catalogs

// BCP 47 标签精确匹配表(小写化比较,兼容 zh-cn / zh-CN 等大小写变体)。
const exactByTag = new Map<string, Locale>(LOCALES.map((l) => [l.toLowerCase(), l]))

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

/** 读取 localStorage 中的语言覆盖;值不在支持列表或存储不可用时返回 null。 */
function readStoredLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (value && isLocale(value)) return value
  } catch {
    // localStorage 不可用(隐私模式等)时忽略覆盖。
  }
  return null
}

/** 单个 BCP 47 标签 → 支持的语言键;未命中返回 null(继续看下一个标签)。 */
function resolveTag(tag: string): Locale | null {
  const exact = exactByTag.get(tag.toLowerCase())
  if (exact) return exact
  const [primary, ...subtags] = tag.toLowerCase().split('-')
  if (primary === 'zh') {
    // 繁体系(脚本或地区):zh-Hant* / zh-TW / zh-HK / zh-MO → zh-TW,其余 zh-* → zh-CN。
    const traditional =
      subtags.includes('hant') || subtags.some((s) => s === 'tw' || s === 'hk' || s === 'mo')
    return traditional ? 'zh-TW' : 'zh-CN'
  }
  if (primary && isLocale(primary)) return primary
  return null
}

/**
 * 语言识别顺序:
 * 1. localStorage 覆盖(键 `winuionweb.locale`,值非法则忽略);
 * 2. `navigator.languages` 按优先级逐标签匹配,每个标签先精确匹配,再前缀匹配
 *    (zh-Hant*|zh-TW|zh-HK|zh-MO → zh-TW,其余 zh-* → zh-CN,其余语言取主键,如 fr-CA → fr);
 * 3. 全部未命中 → `en`。
 */
export function detectLocale(): Locale {
  const stored = readStoredLocale()
  if (stored) return stored
  if (typeof navigator !== 'undefined') {
    const preferred = navigator.languages
    const tags = preferred && preferred.length > 0 ? preferred : [navigator.language]
    for (const tag of tags) {
      const hit = resolveTag(tag)
      if (hit) return hit
    }
  }
  return DEFAULT_LOCALE
}

/** i18n 实例。locale 为响应式 Ref:模板经 t() 读取,切换语言时自动更新。 */
export interface I18n {
  readonly locale: Ref<Locale>
  setLocale(next: Locale): void
  t(key: string, params?: I18nParams): string
}

/** 创建 i18n 实例;locale 缺省时自动探测。 */
export function createI18n(locale: Locale = detectLocale()): I18n {
  const current = ref<Locale>(locale)

  function setLocale(next: Locale): void {
    current.value = next
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // 持久化失败(隐私模式等)不影响本次会话内的切换。
    }
  }

  /** 回退链:当前语言 → en → 键名原样;params 替换 `{name}` 占位符。 */
  function t(key: string, params?: I18nParams): string {
    const text = messages[current.value][key] ?? messages.en[key] ?? key
    if (!params) return text
    return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
      const value = params[name]
      return value === undefined ? placeholder : String(value)
    })
  }

  return { locale: current, setLocale, t }
}

/** provide/inject 键(带类型)。 */
export const i18nKey: InjectionKey<I18n> = Symbol('i18n')

/** 在根组件 setup 中提供 i18n 实例。 */
export function provideI18n(i18n: I18n): void {
  provide(i18nKey, i18n)
}

/** 取用 i18n 实例;必须在 provideI18n 之后调用,否则抛错。 */
export function useI18n(): I18n {
  const i18n = inject(i18nKey)
  if (!i18n) {
    throw new Error('[i18n] useI18n() 未找到实例:请先在祖先组件调用 provideI18n()。')
  }
  return i18n
}
