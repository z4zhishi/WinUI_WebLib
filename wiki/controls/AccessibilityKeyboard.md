# AccessibilityKeyboard

> 在线示例:[/#/accessibilitykeyboard](/#/accessibilitykeyboard) —— 路由 `/#/accessibilitykeyboard`

## 概述

无障碍(Keyboard Navigation)规范页:如果应用不能提供良好的键盘访问,失明或行动不便的用户将难以甚至无法使用它。

WinUI Gallery 版讲三件事:**Tab 序**(交互控件是停靠点、标签与禁用控件不是,顺序默认 = 定义顺序,可手动指定)、**方向键**(成组的相似控件应支持方向键,通常连同 Home/End/PgUp/PgDn)与**键盘快捷键**(加速器 Accelerator = Ctrl 系触发命令;访问键 Access key = Alt 系移动焦点,含 Key Tips 气泡)。

Web 版做「本库无障碍规范 + 自测工具」:规范文案照搬 + 可交互演示(自动/手动 Tab 序、方向键列表、**已入库控件组成的表单 + Tab 焦点路径记录器**、Ctrl+R/B/G 加速器、MenuBar 访问键)+ **各控件键盘行为速查表**(从 `src/components` 已实现控件的键盘处理中提取)。

官方文档:

- [Keyboard accessibility](https://learn.microsoft.com/windows/apps/design/accessibility/keyboard-accessibility)
- [Keyboard interactions](https://learn.microsoft.com/windows/apps/design/input/keyboard-interactions)
- [Keyboard accelerators](https://learn.microsoft.com/windows/apps/design/input/keyboard-accelerators)
- [Access keys](https://learn.microsoft.com/windows/apps/design/input/access-keys)

## Tab 序约定

1. 所有交互控件都是 Tab 停靠点;非交互控件(标签、装饰)与禁用控件不是;
2. 默认 Tab 序 = DOM 顺序(对应 WinUI「XAML 定义顺序」),通常这就是最佳顺序;
3. 顺序不符时手动指定:WinUI `TabIndex` → HTML `tabindex`(正值按升序、再按 DOM 序);`IsTabStop=false` → `tabindex="-1"`(移出 Tab 序但仍可程序聚焦);
4. 初始焦点落在最有用、最合逻辑的元素;
5. 分组控件(ListView/TreeView/ComboBox/TabView)对 Tab 呈现为**一个停靠点**,内部用 roving tabindex(项持真实 DOM 焦点)承接方向键。

## WinUI ↔ Web 键盘机制映射

| WinUI 机制 | Web 等价物 | 说明 |
| --- | --- | --- |
| `TabIndex` | `tabindex`(正数) | 正值按升序、再按 DOM 序;语义一致 |
| `IsTabStop = false` | `tabindex="-1"` | 移出 Tab 序,仍可通过程序/点击聚焦 |
| 禁用控件不进 Tab 序 | `disabled` 原生不可聚焦 | 行为一致 |
| `KeyboardAccelerator` | `keydown` 监听(window/元素级) | 示例页 Ctrl+R/B/G 即此实现;注意不要劫持浏览器必需组合键 |
| `AutomationProperties.AcceleratorKey` | `aria-keyshortcuts` | 向辅助技术暴露快捷键 |
| `AccessKey` + Key Tips | `accesskey` 属性 | 浏览器触发键不一(Windows 常为 Alt+键)且无 Key Tips 气泡;本库 MenuBar 以 F2/Alt 自实现(见 [MenuBar](./MenuBar.md)) |
| `XYFocusKeyboardNavigation` | 无原生等价 | 方向键 2D 焦点需自行实现;线性组建议 roving tabindex |
| 系统焦点视觉(双环:FocusVisualPrimary 内环 + FocusVisualSecondary 外环) | `:focus-visible` 双环(primary 外环 `outline` + secondary 内环 `box-shadow`) | 本库:primary 2px `--wui-system-control-focus-visual-primary` + secondary 1px `--wui-system-control-focus-visual-secondary`(见 `src/styles/focus-visual.css`,各控件 wiki 有记录) |

## 各控件键盘行为速查(已实现,与源码一致)

| 控件 | Tab 到达方式 | 键盘行为(已实现) |
| --- | --- | --- |
| [Button](./Button.md) | 单个停靠点 | Space / Enter 激活 |
| [TextBox](./TextBox.md) | 单个停靠点 | 文本编辑、方向键移动插入符;Header 以 `<label for>` 关联 |
| [NumberBox](./NumberBox.md) | 单个停靠点 | ↑/↓ 步进(支持按键重复);Enter 提交、Esc 还原、失焦提交 |
| [CheckBox](./CheckBox.md) | 单个停靠点 | Space 切换;IsThreeState 时循环 勾选 → 不确定 → 未勾选 |
| [ToggleSwitch](./ToggleSwitch.md) | 单个停靠点 | Space / Enter 切换(`role="switch"`) |
| [ComboBox](./ComboBox.md) | 单个停靠点 | 关闭态 Enter/Space/↓/↑ 展开、type-ahead;打开态 ↑/↓ 循环、Home/End、Enter/Space 选择、Esc/Tab 关闭 |
| [Slider](./Slider.md) | 单个停靠点 | ←/→/↑/↓ 按 StepFrequency 步进;Home/End/PageUp/PageDown 走原生 input range 语义 |
| [ListView](./ListView.md) | 控件一个停靠点(roving tabindex) | ↑/↓ 移焦(选中随焦点)、Home/End、Space 选择、Ctrl+A 全选(Multiple/Extended)、Enter 触发 itemClick |
| [TreeView](./TreeView.md) | 控件一个停靠点(roving tabindex) | ↑/↓ 移动、→ 展开/进子级、← 收起/回父级、Space 选中、Enter 调用、Home/End 首/末 |
| [MenuBar](./MenuBar.md) | 栏不进 Tab 序,F2 / Alt 聚焦 | ←/→ 项间移动,展开时横移换菜单;Enter/↓/↑ 开菜单;菜单内 ↑/↓/Home/End、Esc 关闭 |
| [TabView](./TabView.md) | 标签条一个停靠点 | ←/→ 移标签焦点(不联动选中)、Enter/Space 选中;Ctrl+Tab / Ctrl+Shift+Tab 切换、Ctrl+W 关闭 |
| [RatingControl](./RatingControl.md) | 单个停靠点 | ←/→/↑/↓ ±1、Home 清空、End 满值;未评分时方向键取 InitialSetValue |
| [ContentDialog](./ContentDialog.md) | 焦点陷阱(Tab 循环于对话框内) | 初始焦点落 defaultButton;Esc 关闭;关闭后焦点归还宿主 |

### 已达标

- 上述控件全部键盘可达:Space/Enter 激活、方向键组导航、Home/End 端点、Esc/Tab 收尾均按 WinUI 语义实现;
- 全部交互控件带 `:focus-visible` 焦点环(2px 系统焦点色 + 1px offset);
- 示例页提供「焦点路径记录器」自测工具,可直观验证 Tab 序与停靠点数量。

### 待办

- `XYFocusKeyboardNavigation` 的 2D 方向键焦点无等价物;自由布局(如按钮组横排)如需方向键,须消费侧自行实现;
- Web 原生 `accesskey` 因浏览器而异且无 Key Tips 气泡,本库未统一封装;MenuBar 已自实现 F2/Alt 进入,其余控件的 Access key 支持为待办;
- 焦点环按双环实现(primary 外环 2px + secondary 内环 1px,颜色取 `FocusStrokeColorOuter`/`Inner`,见 `src/styles/focus-visual.css`);高对比模式下未提供更强的双环视觉。

## 相关链接

- 在线示例:`/#/accessibilitykeyboard`
- 演示页源码:`demo/pages/AccessibilityKeyboardPage.vue`
- 姊妹篇:[AccessibilityColorContrast](./AccessibilityColorContrast.md)、[AccessibilityScreenReader](./AccessibilityScreenReader.md)
