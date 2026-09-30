# Color

> 在线示例:[/#/color](/#/color)

## 概述

平衡的色彩设计带来清晰与美感协调(Balanced color design creates clarity and aesthetic harmony)。本库把 WinUI 的主题画刷(Brush)整体转成 `--wui-*` CSS 变量:每个画刷在浅色与深色两套主题字典下各有一个取值,由站点写入 `html[data-theme]` 切换。当前规模:**每主题 1574 条 token,其中颜色类 1547 条**(其余为字号/字体/圆角),浅深取值有差异的颜色 token 921 条。

官方资料:

- [Colors in Windows 11](https://learn.microsoft.com/windows/apps/design/signature-experiences/color)
- [Windows UI Kit(Figma)](https://aka.ms/WinUI/3.0-figma-toolkit)
- [WinUI Theme Resources(Common_themeresources_any.xaml,GitHub)](https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Common_themeresources_any.xaml)
- [XAML theme resources(Microsoft Learn)](https://learn.microsoft.com/windows/apps/design/style/xaml-theme-resources)

## token 命名与明暗机制

| 机制 | 说明 |
| --- | --- |
| 命名规则 | XAML 画刷键去掉结尾 `Brush` 后转 kebab-case:`ComboBoxBackgroundBrush` → `--wui-combo-box-background`;交互后缀保留(`-pointer-over` / `-pressed` / `-disabled` / `-selected` / `-focused` / `-checked`) |
| 明暗切换 | `theme.css` 在 `:root[data-theme="light"]` 与 `:root[data-theme="dark"]` 两套字典定义同名变量;站点壳(useThemeSetting)写 `html[data-theme]` 切换,不含 `prefers-color-scheme` 媒体查询 |
| 透明度 | XAML 画刷 `Opacity` 与颜色自带 AA 通道相乘合成,以 `#RRGGBBAA` 表示;系统色钩子带透明度时以 `color-mix(in srgb, …, transparent)` 表示 |
| 数据来源 | `CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml` 的 Light 与 Default(深色)ThemeDictionaries,由 `docs/temp/extract-tokens.mjs` 生成(勿手改) |
| 数据同源 | 演示页数据经 `demo/data/designTokens.ts` 运行时解析 `theme.css?raw`,`theme.css` 重生成后页面自动跟随 |

## 系统色钩子(theme-hooks.css)

强调色等系统色由 Windows 提供,`theme.css` 不定义、以 `var()` 钩子引用(8 个钩子被 210+ 处画刷引用);`theme-hooks.css` 给出 WinUI 3 在 Windows 11 上的默认呈现值。应用按常规层叠规则在 `:root` 或任意子树重新声明同名变量即可覆盖(演示页有子树覆盖实时演示):

| 变量 | 默认值 | 来源 |
| --- | --- | --- |
| `--wui-system-accent-color` | `#0078d4` | `SystemAccentColor`(Windows 11 默认强调色) |
| `--wui-system-accent-color-dark-1` | `#0067c0` | `SystemAccentColorDark1` |
| `--wui-system-accent-color-dark-2` | `#003e92` | `SystemAccentColorDark2` |
| `--wui-system-accent-color-dark-3` | `#001a68` | `SystemAccentColorDark3` |
| `--wui-system-accent-color-light-2` | `#4cc2ff` | `SystemAccentColorLight2` |
| `--wui-system-accent-color-light-3` | `#99ebff` | `SystemAccentColorLight3` |
| `--wui-system-color-highlight-color` | `#0078d4` | `GetSysColor(COLOR_HIGHLIGHT)` |
| `--wui-system-color-highlight-text-color` | `#ffffff` | `GetSysColor(COLOR_HIGHLIGHTTEXT)` |

浅/深主题取值相同:系统强调色与 Win32 系统色不随 App 主题变化(推导依据见 `theme-hooks.css` 文件头)。

## token 分组总览

颜色 token 按 XAML 键前缀归入控件家族,家族内按交互后缀取值。主要家族(完整浏览见[在线示例](/#/color)):

| 前缀 | 数量 | 说明 |
| --- | ---: | --- |
| `system-control-*` | 170 | 语义画刷层(官方 Color 页语义分组的对应物):background / foreground / highlight / page / disabled / focus / acrylic 等 |
| `app-bar-*` | 143 | AppBar / CommandBar 应用栏 |
| `combo-box-*` | 110 | ComboBox |
| `check-box-*` | 86 | CheckBox |
| `toggle-button-*` | 78 | ToggleButton |
| `menu-flyout-*` | 56 | MenuFlyout |
| `toggle-switch-*` | 55 | ToggleSwitch |
| `radio-button-*` / `pivot-*` | 51 + 51 | RadioButton / Pivot |
| `scroll-bar-*` / `list-view-*` | 49 + 48 | ScrollBar / ListView |
| `slider-*` / `navigation-view-*` | 43 + 41 | Slider / NavigationView |
| 其余 50 余个家族 | 各 1–30 | Button、TextBox(TextControl*/text-box*)、日历、日期/时间选择器、TreeView、GridView、媒体、IME 等 |

## 基础用法

```css
/* 颜色一律经 token 引用,随 html[data-theme] 明暗自动切换 */
.wui-card {
  color: var(--wui-text-control-foreground);
  background: var(--wui-text-control-background);
  border: 1px solid var(--wui-text-control-border);
}

/* 需要强调时用强调色系 token(最终引用系统强调色钩子) */
.wui-link { color: var(--wui-hyperlink-button-foreground); }

/* 应用层覆盖系统强调色(:root 全局或任意子树局部) */
:root { --wui-system-accent-color: rebeccapurple; }
```

## 与 WinUI 的差异说明

- **Fluent 画刷集未收录**:官方 Color 页展示的 106 个语义画刷(`TextFillColorPrimaryBrush`、`AccentFillColorDefaultBrush` 等)定义于发行版的 `Common_themeresources_any.xaml`,不在本库提取源 `generic.xaml` 的 ThemeDictionaries 内。本库以 `SystemControl*` 语义层 + 各控件家族画刷呈现同等语义;若需官方同名画刷,可按上表钩子机制在应用层自定义。
- **HighContrast 字典未提取**:提取器跳过高对比字典(参见 `docs/temp/token-inventory.md`);高对比场景需应用层另行处理。
- **`'XamlAutoFontFamily'` 占位**:字体值原样保留 XAML 占位,浏览器回退默认字体(详见 [Typography](./Typography.md))。
- **画刷别名**:StaticResource 引用沿别名链解析至终点画刷取值(QA F1),故部分 token 名与值来源键名不同属预期。

---

演示页源码:[demo/pages/ColorPage.vue](../../demo/pages/ColorPage.vue)
