# XamlStyles

> 在线示例:[/#/xamlstyles](/#/xamlstyles)

## 概述

XAML 样式是一组可复用的属性值集合,可应用到多个控件:定义一次、处处复用,保持全应用观感一致,避免逐控件重复设置。样式与资源一样分应用/页面/控件三级;带 `x:Key` 的**显式样式**按名应用,不带 key 的**隐式样式**按 `TargetType` 自动作用于作用域内该类型的全部控件。样式之内还可携带 `ControlTemplate` 整体替换控件视觉树。

Web 侧的对应物是 **class + scoped CSS**:本库每个组件内嵌的 scoped 样式(消费 `theme.css` 的 `--wui-*` token)即"generic.xaml 默认样式"的等价物,页面级定制则用 class 覆写控件 token。

官方资料(catalog `XamlStyles` 条目 docs 链接):

- [Style - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.style)
- [XAML styles](https://learn.microsoft.com/windows/apps/design/style/xaml-styles)

## 概念映射总表

| WinUI 概念 | XAML 写法 | Web 等价(本库) |
| --- | --- | --- |
| Style | `<Style x:Key="CustomButtonStyle" TargetType="Button">` | class(如 `.demo-custom-button-style`)+ scoped CSS |
| Setter | `<Setter Property="Background" Value="…">` | CSS 声明;配色类 Setter 落为控件 token 覆写(Normal 态) |
| 显式应用 | `Style="{StaticResource CustomButtonStyle}"` | 控件上挂同名 class |
| 隐式样式 | `<Style TargetType="TextBlock">`(无 key) | 作用域选择器:`.implicit-scope :deep(.wui-textblock)` |
| BasedOn | `BasedOn="{StaticResource DefaultButtonStyle}"` | class 组合继承(默认样式天然继承,定制类只写差异) |
| TargetType | `TargetType="Button"` | 选择器目标(`.wui-button` / `.wui-textblock` 等组件类名) |
| 默认样式 | generic.xaml 的隐式 Style + ControlTemplate | 组件内 scoped 样式(消费 `--wui-*` token) |
| ControlTemplate | `<ControlTemplate TargetType="Button">…` | 组件模板 = DOM 结构 + slot(无"换模板"直接等价,见下文) |
| TemplateBinding | `TemplateBinding Background` | props / CSS 变量(`--wui-button-local-*`、容器 token 覆写) |
| VisualState | `<VisualState x:Name="PointerOver">` | 伪类(`:hover` / `:active` / `:disabled` / `:focus-visible`) |
| 局部值优先 | Style + 本地 Background(本地赢) | inline(`--wui-button-local-*`)> class 覆写 > 默认样式 |

## 创建并应用样式(keyed style)

官方示例三按钮:默认按钮;`CustomButtonStyle`(`BasedOn` 默认按钮样式,`Setter` 覆 `Background` 为 accent acrylic、`MinWidth=200`);第三个按钮在样式之外再赋局部值(`SystemFillColorCriticalBackground`),**局部值优先于样式**。

演示页的 Web 复刻要点:

- `.demo-custom-button-style` 类只写两个 Setter 的等价物——覆 Normal 态背景 token + `min-width: 200px`;组件默认样式(等价 BasedOn 的基类)天然继承,无需重复。
- 覆 `Background` 属性只影响 Normal 态:悬停/按下仍走主题状态色。这与 WinUI 一致(Style 设属性后,VisualState 动画仍接管状态色);若要状态一起换,WinUI 的做法是覆 `ButtonBackgroundPointerOver` 等资源键,Web 对应容器覆写 `--wui-button-background-pointer-over`(见 [XamlResources](./XamlResources.md) 轻量样式节)。
- 局部值经 `background` prop 注入 `--wui-button-local-background`(inline),优先于 class 覆写——"局部值 > Style"的优先级两边同构。
- 选项面板可整体关掉 class(等价移除 `Style` 属性),三按钮立即回到默认样式。

## 隐式样式(implicit style)

无 `x:Key` 的 `<Style TargetType="TextBlock">` 自动作用于作用域内该类型全部控件(官方示例:FontSize 16 / Consolas / Bold)。Web 等价物是作用域容器上的类型选择器:

```css
.implicit-scope :deep(.wui-textblock) {
  font-size: 16px;
  font-family: Consolas, 'Courier New', monospace;
  font-weight: 700;
}
```

容器内全部 `WuiTextBlock` 自动生效、容器外不受影响;演示页用开关对照"作用域内 / 作用域外"两组同文案控件。

## ControlTemplate 与组件模板

WinUI 的 `ControlTemplate` 定义控件视觉树,默认样式通过它组装部件。Web 组件体系没有"宿主控件换模板"的机制,深度定制走三条路径(见 [Templates](./Templates.md) 的 ControlTemplate 节):

1. **组合组件**:用 slot / 封装组件重组控件与结构(本库 `#item`、`#icon` 等插槽即此类出口);
2. **CSS 覆写**:`:deep()` 命中组件内部类(等价改模板内部件的属性);
3. **自定义组件**:结构完全不同时新写组件(等价 UserControl / 自定义 TemplatedControl)。

## 本库实际做法

- **组件层**:每个控件组件的 scoped 样式就是它的"默认样式"——视觉值对照 `CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml` 的 `Style`/`ControlTemplate` 段实现,颜色/字号/圆角一律取 `--wui-*` token(命名规则与来源见 [XamlResources](./XamlResources.md) 的 ThemeDictionaries 节)。
- **状态层**:VisualState(Normal/PointerOver/Pressed/Disabled/Focus)用伪类实现,状态色走主题的 `*-pointer-over` / `-pressed` / `-disabled` token,与 VSM 的 DiscreteObjectKeyFrame 即时切换语义一致(无过渡动画)。
- **定制层**:推荐顺序 = 容器 token 覆写(成批换肤)→ 组件 props(单控件微调)→ 组合/自定义组件(改结构)。

## 基础用法

```html
<!-- Web(本库):class 即 keyed style -->
<Button class="demo-custom-button-style" content="Styled" />
<Button class="demo-custom-button-style" content="Overridden" background="var(--critical-bg)" />
```

```css
/* keyed style 的两个 Setter;局部值(inline)优先于此处 */
.demo-custom-button-style {
  --wui-button-background: var(--accent-acrylic-fill); /* Setter: Background */
  min-width: 200px;                                    /* Setter: MinWidth */
}
```

## 与 WinUI 的差异说明

- **Setter 的状态边界**:覆 Normal 态 token 后悬停/按下仍走主题,与"Style 设 Background 属性、VSM 仍接管"一致;但 WinUI 对样式内 Setter 的状态覆盖需借助资源覆写,本库对应"容器覆写 `*-pointer-over` 等 token"(资源级,可作用整批)或接受状态不变(props 局部值仅 Normal 态,组件实现如此区分)。
- **BasedOn 单继承链 ↔ class 组合**:class 可多重组合,比 BasedOn 的单父链灵活;代价是没有 TargetType 的编译期校验,挂错元素不报错只是不生效。
- **隐式样式的命中语义**:WinUI 按 `TargetType` 命中该类型(含兼容子类);`:deep()` 选择器只命中实际 DOM 类名,无类型继承语义——组件内部类名(`.wui-*`)因此是本库的"稳定样式契约"。
- **两个演示资源不在 theme.css**:`AccentAcrylicBackgroundFillColorDefaultBrush` 为 AcrylicBrush(`TintColor` = SystemAccentColorLight3 / Dark1,见 `controls/dev/Materials/Acrylic/AcrylicBrush_themeresources.xaml`),Web 无 acrylic,取 FallbackColor 等价值(经 theme-hooks.css 系统色钩子派生);`SystemFillColorCriticalBackground` 源值浅 `#FDE7E9` / 深 `#442726`(见 `controls/dev/CommonStyles/Common_themeresources_any.xaml` L288/L84),按原文在页面作用域承载。
- **官方 `ButtonRevealStyle` 基类未复刻**:本库 Button 只实现默认样式;官方示例的 `BasedOn ButtonRevealStyle` 在演示页等价于"继承组件默认样式",reveal 灵动光效不在范围。

---

相关:[XamlResources](./XamlResources.md) · [Templates](./Templates.md)(ControlTemplate 的 Web 等价详解) · [Button](./Button.md) · [CompactSizing](./CompactSizing.md)(资源换值的批量应用)

演示页源码:[demo/pages/XamlStylesPage.vue](../../demo/pages/XamlStylesPage.vue)
