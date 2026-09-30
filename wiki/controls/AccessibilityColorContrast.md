# AccessibilityColorContrast

> 在线示例:[/#/accessibilitycolorcontrast](/#/accessibilitycolorcontrast) —— 路由 `/#/accessibilitycolorcontrast`

## 概述

无障碍(Color Contrast)规范页:应用应对文本与其背景使用高对比度、易阅读的颜色组合——这不仅有利于低视力用户,也能保证在各种光照、屏幕与设备设置下的可见性与可读性。

WinUI Gallery 的这一页是一个**对比度检查器**(InlineColorPicker × 2,实时计算 WCAG 对比度并对照 4.5:1 / 3:1 达标线);Web 版将其扩展为「本库无障碍规范 + 自测工具」:

1. **对比度检查器**:输入前景/背景色(取色器 + HEX 输入),按 WCAG 2.x 官方公式计算比值,给出常规文本(≥4.5:1)、大号文本(≥3:1)、图形对象与 UI 组件(≥3:1)三项判定,并实时预览;
2. **本库主题对比度抽样表**:按当前主题档实时读取关键 `--wui-*` token 组合并计算比值,刻度条竖线即 4.5:1 达标线,附 AA/AAA 判定。

官方文档:

- [Accessibility overview](https://learn.microsoft.com/windows/apps/design/accessibility/accessibility-overview)
- [Automation Properties - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.automation.automationproperties)
- [WCAG 2.x 对比度(Contrast Ratio)定义](https://www.w3.org/WAI/GL/wiki/Contrast_ratio)

## 对比度算法(与官方示例一致)

源 `Samples/AccessibilityColorContrast/AccessibilityColorContrastPage.xaml.cs` 的 `GetRelativeLuminance` / `CalculateContrastRatio` 逐行对照实现:

```ts
// 相对亮度:线性化阈值 0.04045、伽马 2.4、系数 0.2126/0.7152/0.0722
function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// 对比度比值:(L亮 + 0.05) / (L暗 + 0.05),范围 1:1 – 21:1
function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
```

## WCAG 阈值速查

| 内容类型 | WCAG 2.1 AA | WCAG 2.1 AAA |
| --- | --- | --- |
| 常规文本(<18pt) | ≥ 4.5:1 | ≥ 7:1 |
| 大号文本(≥18pt 或 ≥14pt 粗体) | ≥ 3:1 | ≥ 4.5:1 |
| 图形对象与 UI 组件(图标、边框、焦点环等) | ≥ 3:1 | ≥ 4.5:1 |

官方示例只判 4.5/3/3 三线;Web 版抽样表补充了 AAA(≥7:1)一列供自查。

## WinUI ↔ Web 无障碍映射(对比度相关)

| WinUI 取值 | Web 实现 | 说明 |
| --- | --- | --- |
| `InlineColorPicker`(Gallery 自定义控件) | 原生 `<input type="color">` + HEX 文本框 | 原生取色器自带键盘可达与平台取色面板 |
| `x:Bind …ColorBrush` 预览网格 | 内联 `style` 绑定用户输入色 | 预览色是**内容数据**而非主题样式,不受「禁止硬编码色值」约束 |
| `SystemFillColorSuccess / Critical` 判定色 | 浅 `#0F7B0F / #C42B1C`、深 `#6DCC5F / #FF99A4` | **theme.css 尚无同名 token**,沿用 [InfoBar](./InfoBar.md) 的最近似映射约定(待办:补 system-fill-success/critical token) |
| `SampleThemeListener`(示例内换主题) | 页头「主题预览」写 `html[data-theme]` | 抽样表以 `MutationObserver` 监听,切档即重算 |

## 本库主题对比度抽样(当前实测)

抽样表在示例页上按**当前主题档实时读取 token** 计算(切页头主题预览即可查看另一档)。8 位 hex token 的透明度按页面背景合成后再计算。关键字段组合:

| 用途 | 前景 token | 背景 token |
| --- | --- | --- |
| 正文文本 | `--wui-application-foreground-theme` | `--wui-application-page-background-theme` |
| 次要文本 | `--wui-application-secondary-foreground-theme` | `--wui-application-page-background-theme` |
| 按钮文本 | `--wui-button-foreground-theme` | `--wui-button-background-theme`(深色档为透明,按页面背景合成) |
| 超链接文本 | `--wui-hyperlink-foreground-theme` | `--wui-application-page-background-theme` |
| 输入框文本 | `--wui-text-box-foreground-theme` | `--wui-text-box-background-theme` |
| 下拉框文本 | `--wui-combo-box-foreground-theme` | `--wui-combo-box-background-theme` |
| 复选框文本 | `--wui-check-box-foreground-theme` | `--wui-application-page-background-theme` |

### 已达标

- 上述全部 token 组合在浅/深两档下均 **≥ 4.5:1(AA 常规文本)**,其中正文/输入框/下拉框达 AAA(≥7:1);
- 对比度算法与官方示例逐行一致,判定线 4.5/3/3 与源相同,并额外给出 AAA 列。

### 待办

- theme.css 补 `--wui-system-fill-success / caution / critical` 语义 token(现由 InfoBar 与本页按 WinUI 官方值最近似映射);
- 强调色(`--wui-system-accent-color`)可被用户/系统改写,极端取值下的组合比值未做静态兜底——示例页抽样表按当前档实测,建议发布前用 [Accessibility Insights for Web](https://accessibilityinsights.io/) 全站复扫。

## 相关链接

- 在线示例:`/#/accessibilitycolorcontrast`
- 演示页源码:`demo/pages/AccessibilityColorContrastPage.vue`
- 姊妹篇:[AccessibilityKeyboard](./AccessibilityKeyboard.md)、[AccessibilityScreenReader](./AccessibilityScreenReader.md)
