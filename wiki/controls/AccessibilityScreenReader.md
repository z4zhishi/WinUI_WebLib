# AccessibilityScreenReader

> 在线示例:[/#/accessibilityscreenreader](/#/accessibilityscreenreader) —— 路由 `/#/accessibilityscreenreader`

## 概述

无障碍(Screen Reader)规范页:屏幕阅读器(如 Windows 讲述器 Narrator)把文本转换为语音,帮助失明或低视力用户。阅读器依据每个控件的**无障碍名称**(WinUI UIA Name / Web 可访问名)报告其**名称、角色与内容**。

WinUI Gallery 版讲:可访问名称(自动取名 / Header 与占位符提升 / 手动 `AutomationProperties.Name` / `LabeledBy`)、常用无障碍属性(FullDescription、HelpText、PositionInSet/SizeOfSet)、可视化树(`AccessibilityView=Raw` 把冗余元素移出内容树)与地标和标题(LandmarkType / HeadingLevel)。

Web 版做「本库无障碍规范 + 自测工具」:**role/aria 约定表**(AutomationProperties ↔ ARIA 映射 + 本库控件达标表)+ 演示区「**播报文本展示**」——聚焦/悬停控件时按讲述器风格实时合成播报串:「名称,角色[,状态][,第 n 项/共 m 项]」。

官方文档:

- [Expose basic accessibility information](https://learn.microsoft.com/windows/apps/design/accessibility/basic-accessibility-information)
- [Landmarks and headings](https://learn.microsoft.com/windows/apps/design/accessibility/landmarks-and-headings)
- [Narrator 完整指南](https://support.microsoft.com/windows/complete-guide-to-narrator-e4397a0d-ef4f-b386-d8ae-c172f109bdb1)

## 可访问名称规则

1. 名称应**简短并与可见标签一致**——用户每次导航到该控件都会听到它;
2. 内容可转字符串的控件自动取名(WinUI 从 Content;Web 从原生元素内容/子文本);
3. 图像、无标头输入框等必须显式提供:WinUI `AutomationProperties.Name` → Web `aria-label` / `alt`;
4. WinUI 的 `Header` 提升为名称、`PlaceholderText` 提升为描述;**Web 端占位符不会自动成为可访问名**(见下表),本库 TextBox 以 `<label for>` 关联 Header。

## WinUI AutomationProperties ↔ Web ARIA 映射

| WinUI AutomationProperties | Web 等价物 | 说明 |
| --- | --- | --- |
| `Name` | `aria-label` / `label[for]` / `alt` / 可见文本 | 有可见文本自动取名;图像、无标头输入框必须显式提供 |
| `FullDescription` / `HelpText` | `aria-describedby`(+ `title`) | 把可见说明段落与控件关联;`title` 兼作原生悬停提示 |
| `LabeledBy` | `aria-labelledby` | 用另一元素的文本作为本控件名称(可引用多个 id) |
| `AccessibilityView = Raw` | `aria-hidden="true"` 或移出 DOM | 把装饰/冗余元素从内容树隐藏;纯装饰图像还应 `alt=""` |
| `PositionInSet` / `SizeOfSet` | `aria-posinset` / `aria-setsize` | 列表型控件按需标注 |
| `HeadingLevel`(Level1–9) | 标题元素 `h1–h6`(`role="heading"` + `aria-level`) | 屏幕阅读器用户按标题跳转,如同明眼用户扫读 |
| `LandmarkType`(Main/Navigation/Search/Custom) | landmark role 族(`main`/`navigation`/`search`/`complementary`)+ `aria-label` | 自定义地标 = `role="region"` + `aria-label` |
| `AcceleratorKey` / `AccessKey` | `aria-keyshortcuts` / `accesskey` | 见 [AccessibilityKeyboard](./AccessibilityKeyboard.md) |
| `LiveSetting`(Off/Polite/Important) | `aria-live`(`off`/`polite`/`assertive`) | 动态内容更新时的播报礼貌级 |
| UIA ControlType / role | ARIA `role` | 原生 HTML 元素自带角色;复合控件需显式 role |

## 本库控件 role/aria 达标表(与源码一致)

| 控件 | role(已实现) | aria(已实现) | 达标状态 / 待办 |
| --- | --- | --- | --- |
| [Button](./Button.md) | `button`(原生) | 插槽图标 `aria-hidden` | 已达标 |
| [TextBox](./TextBox.md) | `input`(原生) | Header 以 `<label for>` 关联 | 部分达标:占位符未提升为可访问名(WinUI 会),仅占位符输入框无名 → 待办 |
| [CheckBox](./CheckBox.md) | `checkbox`(原生 input) | `aria-checked` / 原生 indeterminate | 已达标 |
| [ToggleSwitch](./ToggleSwitch.md) | `switch` | `aria-checked`;空 Header 回退可读名 | 已达标 |
| [ComboBox](./ComboBox.md) | `combobox` + `listbox` + `option` | `aria-expanded` / `aria-controls` / `aria-activedescendant` / `aria-selected` | 已达标 |
| [AutoSuggestBox](./AutoSuggestBox.md) | `combobox` | `aria-autocomplete="list"` / `aria-haspopup` / `aria-expanded` / `aria-activedescendant` / `aria-label`(header) | 已达标 |
| [ListView](./ListView.md) | `listbox` + `option` | `aria-multiselectable` / `aria-selected` | 部分达标:根透传的 `aria-label` 落在外层容器而非 `role="listbox"` 节点 → 待办 |
| [TreeView](./TreeView.md) | `tree` + `treeitem` + `group` | `aria-expanded` / `aria-selected` / `aria-level` / `aria-multiselectable` / `aria-disabled` | 已达标 |
| [TabView](./TabView.md) | `tablist` + `tab` + `tabpanel` | `aria-selected`(标签) | 已达标 |
| [MenuBar](./MenuBar.md) / 菜单族 | `menubar` + `menu` + `menuitem` | `aria-haspopup` / `aria-expanded`(项) | 已达标 |
| [Slider](./Slider.md) | `slider`(原生 input range) | 原生 value 语义 | 已达标 |
| [RatingControl](./RatingControl.md) | `slider` | `aria-valuemin` / `aria-valuemax` / `aria-valuenow` / `aria-valuetext` | 已达标 |
| [ContentDialog](./ContentDialog.md) | `dialog` | `aria-modal="true"`;焦点陷阱 + Esc 关闭 | 已达标 |

### 已达标

- 复合控件的角色树完整(listbox/option、tree/treeitem、combobox 三段式、tablist/tab/tabpanel、menubar/menu/menuitem、switch、dialog);
- 名称来源三层齐备:可见文本自动名、Header `label[for]` 关联、`aria-label` 手动名;装饰元素以 `aria-hidden` 移出播报;
- 示例页「播报文本展示」为可运行的自测工具,实时合成名称/角色/状态/位置四段式播报。

### 待办

- TextBox:占位符未提升为可访问名(WinUI 把 PlaceholderText 提升为名称/描述);消费侧应始终提供 `header` 或 `aria-label`;
- ListView:根透传的 `aria-label` 落在外层容器而非 `role="listbox"` 内层节点,建议后续把属性转发到内层 role 节点;
- `AutomationProperties.AccessibilityView=Raw` 无逐属性等价物,约定统一映射为 `aria-hidden="true"`;对「可见但不应播报」的富场景(如 LabeledBy 的标签文本)暂以 `aria-hidden` 就近处理;
- 地标族中 WinUI `LocalizedLandmarkType`(自定义地标名)对应 `role="region"` + `aria-label`,组件层未再封装,由消费侧直接写原生属性。

## 相关链接

- 在线示例:`/#/accessibilityscreenreader`
- 演示页源码:`demo/pages/AccessibilityScreenReaderPage.vue`
- 姊妹篇:[AccessibilityColorContrast](./AccessibilityColorContrast.md)、[AccessibilityKeyboard](./AccessibilityKeyboard.md)
