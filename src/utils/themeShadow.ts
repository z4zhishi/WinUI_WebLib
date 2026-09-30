// WinUI_WebLib — ThemeShadow 投影工具(themeShadow.ts)
//
// WinUI 的 ThemeShadow(microsoft.ui.xaml.media.ThemeShadow)是合成器侧的动态投影:
// 元素经 UIElement.Translation 的 Z 分量「抬升」,阴影按 elevation 投到 Receivers
// 指定的背景层上。XAML 侧没有画刷/模板资源(generic.xaml 无 ThemeShadow 段),
// Web 以多层 box-shadow 做观感近似:本文件把 elevation(等价 Translation.Z,单位 px)
// 映射为双层 box-shadow —— 主投影(随 elevation 发散/加深)+ 固定的 0 0 2px 环境层,
// 并保证 elevation 32(浅色)的输出与弹层基建 src/styles/popup.css 的
// --wui-popup-shadow 逐字一致(统一口径,见 wiki/controls/ThemeShadow.md)。
//
// elevation 档位参照源(只读,CK/WinUI-Reference/dxaml/xcp/dxaml/lib/):
//   - ElevationHelper.cpp:s_elevationBaseDepth = 32(弹层初始抬升)、
//     s_elevationIterativeDepth = 8(每级逻辑父子附加抬升)、s_durationTime = 125ms(线性动画);
//   - ToolTip_Partial.cpp:ApplyElevationEffect(..., 0 /* depth */, 16 /* baseElevation */);
//   - ContentDialog_Partial.cpp:常规 32,drop shadow 模式 128;
//   - MenuFlyoutPresenter_Partial.cpp:ApplyElevationEffect(this, GetDepth()) → 32 + depth × 8
//     (depth 为子菜单嵌套层级,首层子菜单 40)。
//
// 简化声明(完整记录于 wiki/controls/ThemeShadow.md):
//   1. 真实逐像素合成器投影在 CSS 中不可行,多层 box-shadow 是 Web 惯例近似;
//   2. WinUI 阴影只投到 Receivers 集合指定的背景层;box-shadow 恒投到元素正后方
//      的全部内容,只能以「背景层紧贴元素下方」的场景近似 receiver 语义;
//   3. Translation.Z 的「抬升」在 Web 无 Z 轴,仅保留阴影观感(元素 X/Y 平移由
//      transform 近似,由使用方处理)。
//
// 约束:不引入第三方依赖;不依赖 DOM(applyThemeShadow 只操作传入的元素),SSR 安全。

import type { CSSProperties } from 'vue'

/** 主题(决定主投影透明度的补偿方向,见 themeShadowCss)。 */
export type ThemeShadowTheme = 'light' | 'dark'

/** 预设档位名(取值来自 WinUI 参照源,见 THEME_SHADOW_PRESETS)。 */
export type ThemeShadowPresetName = 'tooltip' | 'flyout' | 'subMenu' | 'dialog'

/** 单个预设档位。 */
export interface ThemeShadowPresetDef {
  /** elevation,等价 WinUI UIElement.Translation.Z(px)。 */
  elevation: number
  /** 英文名。 */
  label: string
  /** 中文名。 */
  labelZh: string
  /** WinUI 中的取值来源(控件/常量,便于对照参照源)。 */
  winui: string
}

/**
 * WinUI 实际使用的 elevation 档位(4 档近似,值全部来自参照源)。
 * 官方示例(WinUI Gallery ThemeShadowPage)用 0-64 的 Z-translation 滑块演示,
 * 说明 elevation 是连续量;此处只把「WinUI 控件真实用到的值」收为预设。
 */
export const THEME_SHADOW_PRESETS: Record<ThemeShadowPresetName, ThemeShadowPresetDef> = {
  tooltip: {
    elevation: 16,
    label: 'Tooltip',
    labelZh: '工具提示',
    winui: 'ToolTip_Partial.cpp:baseElevation 16',
  },
  flyout: {
    elevation: 32,
    label: 'Flyout',
    labelZh: '弹层默认',
    winui: 'ElevationHelper.cpp:s_elevationBaseDepth(Flyout / MenuFlyout 首层 / ComboBox 下拉 / AutoSuggestBox / CommandBar Overflow / ContentDialog 常规)',
  },
  subMenu: {
    elevation: 40,
    label: 'Submenu',
    labelZh: '二级子菜单',
    winui: 'MenuFlyoutPresenter_Partial.cpp:GetDepth()=1 → 32 + s_elevationIterativeDepth×1(每深一级 +8)',
  },
  dialog: {
    elevation: 128,
    label: 'Dialog',
    labelZh: '对话框',
    winui: 'ContentDialog_Partial.cpp:drop shadow 模式的加大投影(baseElevation 128)',
  },
}

/** 默认 elevation(s_elevationBaseDepth,弹层初始抬升)。 */
export const THEME_SHADOW_DEFAULT_ELEVATION = 32

/** elevation 变化时的过渡时长:WinUI 以 125ms 线性动画过渡 Translation(ElevationHelper.cpp s_durationTime)。 */
export const THEME_SHADOW_ANIMATION_MS = 125

/**
 * 环境层阴影(固定第二层):取自弹层基建 --wui-popup-shadow 的第二层,
 * 不随 elevation 变化 —— 对应合成器阴影「近距贴边」的那一小圈。
 */
const AMBIENT_SHADOW = '0 0 2px rgba(0, 0, 0, 0.12)'

export interface ThemeShadowOptions {
  /** 主题;dark 下主投影透明度 ×1.5(上限 0.36),补偿深色底上阴影感知变弱(Web 惯例)。默认 'light'。 */
  theme?: ThemeShadowTheme
}

/**
 * 把 elevation(或预设名)解析为数值。
 * 未知预设名直接抛错(编程期错误,不静默回退)。
 */
export function resolveThemeShadowElevation(value: number | ThemeShadowPresetName): number {
  if (typeof value === 'number') return value
  const preset = THEME_SHADOW_PRESETS[value]
  if (!preset) {
    const names = Object.keys(THEME_SHADOW_PRESETS).join(' / ')
    throw new Error(`[themeShadow] 未知预设档位 "${value}",可用:${names}`)
  }
  return preset.elevation
}

/**
 * 生成与 WinUI ThemeShadow 观感等价的多层 box-shadow CSS 值。
 *
 * 映射公式(浅色;elevation 简写 e):
 *   - 主投影:`0 {e/4}px {e/2}px rgba(0,0,0,{α})` —— 偏移与模糊随 elevation 线性发散;
 *   - α = 0.10 + (e − 16) × 0.0025,夹取 [0.06, 0.22](e=16→0.10、32→0.14、40→0.16、≥64→0.22);
 *   - 环境层:固定 `0 0 2px rgba(0,0,0,0.12)`(与弹层基建第二层一致);
 *   - dark:α ×1.5(上限 0.36);
 *   - e ≤ 0(或非有限值):返回 'none'(对应官方示例 Z-translation=0)。
 *
 * 锚点:e=32(浅)输出与 popup.css 的 --wui-popup-shadow 逐字一致
 * `0 8px 16px rgba(0, 0, 0, 0.14), 0 0 2px rgba(0, 0, 0, 0.12)`。
 */
export function themeShadowCss(
  elevation: number | ThemeShadowPresetName,
  options: ThemeShadowOptions = {},
): string {
  const value = resolveThemeShadowElevation(elevation)
  if (!Number.isFinite(value) || value <= 0) return 'none'

  const { theme = 'light' } = options
  const offsetY = Math.round(value / 4)
  const blur = Math.round(value / 2)
  let alpha = 0.1 + (value - 16) * 0.0025
  alpha = Math.min(0.22, Math.max(0.06, alpha))
  if (theme === 'dark') {
    alpha = Math.min(0.36, alpha * 1.5)
  }

  return `0 ${offsetY}px ${blur}px rgba(0, 0, 0, ${(Math.round(alpha * 100) / 100).toFixed(2)}), ${AMBIENT_SHADOW}`
}

/**
 * themeShadowCss 的 style 对象形式,供 Vue :style / React style 直接绑定:
 * themeShadowStyle(32) → { boxShadow: '0 8px 16px …' }。
 */
export function themeShadowStyle(
  elevation: number | ThemeShadowPresetName,
  options: ThemeShadowOptions = {},
): CSSProperties {
  return { boxShadow: themeShadowCss(elevation, options) }
}

/**
 * 把 ThemeShadow 观感施加到指定元素(命令式,等价 WinUI「挂 ThemeShadow + 设 Translation.Z」
 * 的合成结果):写 element.style.boxShadow,返回恢复原值的清理函数(配合 useEffect/onUnmounted)。
 */
export function applyThemeShadow(
  element: HTMLElement,
  elevation: number | ThemeShadowPresetName,
  options: ThemeShadowOptions = {},
): () => void {
  const previous = element.style.boxShadow
  element.style.boxShadow = themeShadowCss(elevation, options)
  return () => {
    if (previous === '') {
      element.style.removeProperty('box-shadow')
    } else {
      element.style.boxShadow = previous
    }
  }
}
