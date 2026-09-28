// 主题三档偏好(light/dark/system):持久化 localStorage 键 `winuionweb.theme`(缺省 system);
// system 档经 matchMedia('(prefers-color-scheme: dark)') 跟随系统并监听变化;
// 解析结果统一写入 document.documentElement.dataset.theme,驱动 theme.css 的
// :root[data-theme="light|dark"] 两套 token 切换。
import { onScopeDispose, ref, watchEffect } from 'vue'
import type { Ref } from 'vue'

/** 主题偏好档位。 */
export type ThemeMode = 'light' | 'dark' | 'system'
/** 解析后的实际主题(即 html[data-theme] 的值)。 */
export type ResolvedTheme = 'light' | 'dark'

/** 主题偏好使用的 localStorage 键名。 */
export const THEME_STORAGE_KEY = 'winuionweb.theme'
/** 无有效持久化偏好时的缺省档位。 */
export const DEFAULT_THEME_MODE: ThemeMode = 'system'

const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system']

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value)
}

/** 读取 localStorage 中的主题偏好;值非法或存储不可用(隐私模式等)时返回 null。 */
function readStoredThemeMode(): ThemeMode | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(value)) return value
  } catch {
    // localStorage 不可用时忽略持久化偏好,回退缺省档。
  }
  return null
}

/** 主题设置实例。 */
export interface ThemeSetting {
  /** 用户偏好档位(持久化)。 */
  readonly mode: Ref<ThemeMode>
  /** 当前解析出的实际主题,与 html[data-theme] 保持一致。 */
  readonly resolved: Ref<ResolvedTheme>
  /** 设置偏好档位并持久化;持久化失败不影响本次会话内的切换。 */
  setMode(next: ThemeMode): void
}

/**
 * 创建主题设置。在根组件 setup 中调用一次即可;
 * 偏好或系统深色偏好变化时自动同步 html[data-theme]。
 */
export function useThemeSetting(): ThemeSetting {
  const mode = ref<ThemeMode>(readStoredThemeMode() ?? DEFAULT_THEME_MODE)

  // 系统深色偏好(system 档据此解析);环境不支持 matchMedia 时按浅色处理。
  const darkQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null
  const systemDark = ref<boolean>(darkQuery ? darkQuery.matches : false)
  if (darkQuery) {
    const onSystemChange = (event: MediaQueryListEvent): void => {
      systemDark.value = event.matches
    }
    darkQuery.addEventListener('change', onSystemChange)
    onScopeDispose(() => darkQuery.removeEventListener('change', onSystemChange))
  }

  const resolved = ref<ResolvedTheme>('light')

  // 唯一写入点:档位或系统偏好变化时,同步内部状态与 html[data-theme]。
  watchEffect(() => {
    const theme: ResolvedTheme =
      mode.value === 'system' ? (systemDark.value ? 'dark' : 'light') : mode.value
    resolved.value = theme
    document.documentElement.dataset.theme = theme
  })

  function setMode(next: ThemeMode): void {
    mode.value = next
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // 持久化失败(隐私模式等)不影响本次会话内的切换。
    }
  }

  return { mode, resolved, setMode }
}
