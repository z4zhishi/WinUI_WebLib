# XamlResources

> 在线示例:[/#/xamlresources](/#/xamlresources)

## 概述

XAML 资源是可复用的对象——颜色、画刷、字符串等——定义一次、全应用引用,保证一致性与可维护性。资源通常存放在 `ResourceDictionary` 中以便组织与扩展;特殊的**主题资源**通过 `ThemeDictionaries` 为明暗主题各给一套值,随主题自动适配。

Web 侧的对应物是 **CSS 自定义属性**:本库 `src/styles/theme.css` 本身就是一份"由 WinUI 主题字典生成的资源字典"(3100+ 条 `--wui-*` token),`var()` 引用天然等价 `{ThemeResource}`(随 `html[data-theme]` 即时更新)。

官方资料(catalog `XamlResources` 条目 docs 链接):

- [ResourceDictionary and XAML resource references](https://learn.microsoft.com/windows/apps/design/style/xaml-resource-dictionary)
- [ResourceDictionary - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.resourcedictionary)
- [XAML theme resources](https://learn.microsoft.com/windows/apps/design/style/xaml-theme-resources)

## 概念映射总表

| WinUI 概念 | XAML 写法 | Web 等价(本库) |
| --- | --- | --- |
| ResourceDictionary | `<ResourceDictionary>` + `x:Key` | CSS 自定义属性(`theme.css` 即生成的资源字典) |
| 资源键 | `x:Key="ButtonBackgroundBrush"` | 变量名 `--wui-button-background`(去 `Brush` 后缀转 kebab-case) |
| 资源引用 | `{StaticResource Key}` / `{ThemeResource Key}` | 启动快照值 / `var(--key)`(实时解析) |
| 资源查找顺序 | 元素 → 页面 → 应用(最近优先) | CSS 层叠:子树重声明覆盖 `:root`,就近生效 |
| ThemeDictionaries | `x:Key="Default"`(浅色默认)/ `"Dark"` 双字典 | `html[data-theme="light|dark"]` 作用域各声明一套同名变量 |
| x:String 资源 | `<x:String x:Key="ThemeString">` | 无 `var()` 文本等价;响应式常量 + 主题 observer(演示页示例 3) |
| 轻量样式 | 在任意作用域重声明控件资源键 | 容器重声明 `--wui-<控件>-*` token(见下文) |
| C# 运行时读取 | `Resources["Key"]` | `getComputedStyle(el).getPropertyValue('--key')` |

## 资源三级作用域(app / page / control)

WinUI 资源可定义在应用(App.xaml)、页面(Page.Resources)或控件(元素 Resources)级,查找时"最窄作用域优先"。演示页用官方示例同款三层嵌套面板复刻:app 级资源挂页面根容器(真实应用应挂 `:root`)、page 级资源挂示例容器、control 级资源挂目标元素自身,消费统一走 `var(--key)`。官方提示在 Web 同样成立:命名要有描述性;资源尽量定义在最小作用域。

## StaticResource 与 ThemeResource

- **ThemeResource**:随当前主题动态更新。Web 的 `var()` 天然如此——token 在 `:root[data-theme]` 上重定义,引用处即时换值。
- **StaticResource**:XAML 解析期取一次值,之后不随主题切换更新(需要重启应用才刷新)。Web 等价物是"启动时把 token 当前值抄进内联样式"(演示页用 `getComputedStyle` 快照模拟);演示页另设"重新捕获"按钮,等价于重启应用。

## ThemeDictionaries:明暗双字典(本库实际做法)

`ResourceDictionary.ThemeDictionaries` 按 `x:Key` 分主题存放同名资源——注意浅色默认字典的键是 **`"Default"`** 而非 `"Light"`(WinUI 还有 `"HighContrast"`,本库未实现)。

本库的复刻分两层:

1. **`src/styles/theme.css`(生成产物)**:`docs/temp/extract-tokens.mjs` 从 `CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml` 的 Light 与 Default(深色)字典逐键提取,命名规则 `ButtonBackgroundBrush → --wui-button-background`(去掉结尾一个 `Brush` 转 kebab-case);画刷别名沿 `StaticResource` 引用链解析到终点取值;`#AARRGGBB` 转 CSS `#RRGGBBAA`,SolidColorBrush 的 `Opacity` 与颜色 alpha 相乘合成。浅/深两套值分别在 `:root, :root[data-theme="light"]` 与 `:root[data-theme="dark"]` 作用域声明同名变量——这正是 ThemeDictionaries 的 Web 形态。文件由脚本生成,请勿手改(重生成:`node docs/temp/extract-tokens.mjs`)。
2. **`src/styles/theme-hooks.css`(系统色钩子默认值)**:theme.css 把 8 个 Windows 系统色(`--wui-system-accent-color`、`--wui-system-accent-color-dark-1/2/3`、`-light-2/3`、`--wui-system-color-highlight-color/-text-color`)留作未定义的 `var()` 钩子(theme.css 内 210 处引用),由 theme-hooks.css 提供 WinUI 3 在 Windows 上的默认值(`#0078D4` 系)。应用可按常规 CSS 层叠在 `:root` 或任意子树覆盖同名变量,无需改库文件。

同机制的自定义主题资源:在任意元素作用域为同名变量声明两套值即可(演示页示例 3 的 `BackgroundBrush`/`TextBrush`/`ThemeString`),`html[data-theme]` 切换即完成"换字典";元素级强制主题等价 WinUI `FrameworkElement.RequestedTheme`(演示页选项面板可试)。

## 轻量样式(Lightweight styling):控件 token 覆写

WinUI 不必重写 `ControlTemplate` 也能改控件配色:在任意作用域重声明控件资源键(`ButtonBackground` 等),模板内的 `{ThemeResource}` 引用即取新值。Web 侧机制相同——控件 token 是级联变量,容器上重声明即可整批换肤:

```css
/* 容器内全部 Button 换 accent(取值即本库 AccentButton* token,亦即 WinUI AccentButtonStyle) */
.accent-scope {
  --wui-button-background: var(--wui-accent-button-background);
  --wui-button-background-pointer-over: var(--wui-accent-button-background-pointer-over);
  --wui-button-background-pressed: var(--wui-accent-button-background-pressed);
  --wui-button-background-disabled: var(--wui-accent-button-background-disabled);
  --wui-button-foreground: var(--wui-accent-button-foreground);
  --wui-button-foreground-pointer-over: var(--wui-accent-button-foreground-pointer-over);
  --wui-button-foreground-pressed: var(--wui-accent-button-foreground-pressed);
  --wui-button-foreground-disabled: var(--wui-accent-button-foreground-disabled);
}
```

Button 资源键 ↔ token 对照(演示页示例 4 实测):

| WinUI 资源键(Button) | token(本库) |
| --- | --- |
| `ButtonBackground` | `--wui-button-background` |
| `ButtonBackgroundPointerOver` | `--wui-button-background-pointer-over` |
| `ButtonBackgroundPressed` | `--wui-button-background-pressed` |
| `ButtonBackgroundDisabled` | `--wui-button-background-disabled` |
| `ButtonForeground`(四态) | `--wui-button-foreground`(`-pointer-over` / `-pressed` / `-disabled`) |
| `ButtonBorderBrush`(四态) | `--wui-button-border`(`-brush-pointer-over` / `-brush-pressed` / `-brush-disabled`) |
| `AccentButtonBackground` / `AccentButtonForeground`(四态) | `--wui-accent-button-background` / `--wui-accent-button-foreground-*` |

逐控件微调也可走组件 props(`background` / `foreground` / `borderBrush`),组件内部注入 `--wui-button-local-*`,inline 优先于容器类;local 值仅作用 Normal 态,悬停/按下仍走主题——与 WinUI 只赋 `Background` 属性时的 VisualState 行为一致。

## 基础用法

```html
<!-- Web(本库):CSS 自定义属性即资源字典,var() 即 ThemeResource -->
<div class="page-scope"><!-- 等价 Page.Resources -->
  <StackPanel background="var(--highlight-brush)">
    <TextBlock :text="themeString" /><!-- x:String 资源:响应式常量 -->
  </StackPanel>
</div>

<!-- 轻量样式:容器重声明控件 token -->
<div class="accent-scope">
  <WuiButton content="Button" />
  <WuiButton content="Disabled" disabled />
</div>
```

```css
.page-scope { --highlight-brush: #a94dc1; } /* 页面级资源 */
```

## 与 WinUI 的差异说明

- **官方示例的画刷已可在 theme.css 直取**:官方两卡用的 `SolidBackgroundFillColorBaseBrush` / `TextFillColorPrimaryBrush` 属控件主题资源文件(generic.xaml 的 ThemeDictionaries 之外);PL2 已把它们落进 theme.css(分别为 `--wui-solid-background-fill-color-base` 与 `--wui-text-fill-color-primary`,见 [_brushes.md](./_brushes.md))。演示页原取主题层近似 token `--wui-application-page-background-theme` / `--wui-application-foreground-theme`,可改用同值 Fluent token;明暗差异表现一致。
- **官方示例的资源值按原文硬编码**:`#0078D4` / `#A94DC1` / White / `#E2241A` / `#EEE` / `#333` 是演示内容本身(教的就是"定义自己的资源"),声明在演示页作用域,非 `--wui-*` token。
- **StaticResource 的模拟边界**:WinUI 主题切换后 StaticResource 保持旧画刷实例;快照方案保持旧字符串,表现等价。差异在于 WinUI 可经 `x:Bind`/代码手段局部刷新,快照只能重新捕获(全量)。
- **x:String / ImageSource**:CSS 变量可承载字符串(经 `content: var()` 引用,演示页 control 级描述即此实现),但常规文本节点没有 `var()` 文本等价物,`ThemeString` 用响应式常量 + `MutationObserver`(与 SystemBackdropElementPage 同款)承载;`ImageSource` 无图片资产,以色板代替。
- **覆盖用的两个资源键同样不在 theme.css**:`SystemFillColorCriticalBackgroundBrush`(源值浅 `#FDE7E9` / 深 `#442726`,见 `controls/dev/CommonStyles/Common_themeresources_any.xaml` L288/L84)与 `AccentAcrylicBackgroundFillColorDefaultBrush`(AcrylicBrush,`TintColor` = SystemAccentColorLight3/Dark1)在 XamlStyles 演示页用到,分别按官方源值、acrylic FallbackColor(经 theme-hooks.css 系统色钩子派生)在页面作用域承载,见该页 wiki。
- **查找机制**:WinUI 是静态解析(元素 → 页面 → 应用,缺失即抛异常);CSS 是层叠(就近 + 特异性),`var()` 未定义时走 fallback 或空值,不报错——排错时留意浏览器 devtools 的计算值面板。

---

相关:[XamlStyles](./XamlStyles.md) · [Templates](./Templates.md) · [Button](./Button.md) · [CompactSizing](./CompactSizing.md)(资源换值的批量应用)

演示页源码:[demo/pages/XamlResourcesPage.vue](../../demo/pages/XamlResourcesPage.vue)
