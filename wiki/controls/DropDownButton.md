# DropDownButton

> 在线示例:[/#/dropdownbutton](/#/dropdownbutton) · 演示页源码:[demo/pages/DropDownButtonPage.vue](../../demo/pages/DropDownButtonPage.vue)

## 概述

点击时下拉一个 flyout 供选项选择的控件:按钮本体外观同 Button(同一套 ButtonBackground/Foreground/BorderBrush 资源),内容右侧固定一个 ChevronDown 小字形提示可展开。点击整钮开、再点关;flyout 经弹层公共基建锚定在按钮旁展开(定位/翻转/推回/z-index/嵌套豁免全部由基建负责,见 [弹层公共基建](./_popup-infra.md)),点击层与锚之外、Escape、锚滚动链滚动即 light dismiss。`#flyout` slot 既可以承载菜单族(`MenuFlyoutItem` 等,本组件提供与 [MenuFlyout](./MenuFlyout.md) 同构的层上下文,项直接放入即获得列对齐、键盘导航、子菜单级联与「点项即关」行为),也可以承载任意内容(表单等,层呈 FlyoutPresenter 皮肤、`dialog` 语义)。

官方文档:

- [DropDownButton - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.dropdownbutton)
- [Buttons 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/buttons)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | `string` | `''` | 按钮文本(WinUI `Content`);默认 slot 兜底,slot 优先(可放 `FontIcon` 等任意内容,对照官方「图标 + 菜单」示例) |
| `disabled` | `boolean` | `false` | 禁用(WinUI `IsEnabled` 的取反映射):不触发、不可打开 flyout |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` 及其 `-start` / `-end` 变体 | `'bottom-start'` | flyout 放置位(官方示例 MenuFlyout `Placement="BottomEdgeAlignedLeft"` 的基建映射);空间不足自动翻转/推回视口内 |
| `offset` | `number` | `4` | flyout 与按钮的主轴间距(px) |
| `isOpen` (v-model) | `boolean` | `false` | flyout 开关,`v-model:is-open` 双向绑定(映射说明见下方差异节) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent)` | 点击按钮(Space/Enter 同样触发,禁用时不触发);WinUI `Click` |
| `opening` / `opened` | — | WinUI `Opening` / `Opened`:`isOpen` 变 true 时;`opened` 在完成首次定位后触发 |
| `closing` / `closed` | — | WinUI `Closing` / `Closed`:`isOpen` 变 false 时及之后 |
| `update:isOpen` | `(value: boolean)` | `v-model:is-open` 双向绑定更新 |

## 键盘交互与焦点管理

| 按键 | 作用 |
| --- | --- |
| `Enter` / `Space` | 激活按钮:flyout 关 → 开、开 → 关(原生按钮语义,对应 WinUI Click) |
| `↓` / `Alt+↓` | 打开 flyout 并焦点入层(官方文档键盘行为);已打开时再次按下把焦点移入层(菜单内容落首项) |
| `↑` / `↓` / `Home` / `End` | 菜单内容:在菜单项间循环移动 / 跳到首、末项(跳过禁用项);任意内容模式不劫持方向键 |
| `Esc` | 关闭 flyout 并把焦点归还按钮;子菜单打开时逐级收起(每次只关最深层,由弹层注册表保证) |
| `Tab` | 菜单内容:关闭 flyout、焦点自然移动(WinUI 菜单 Tab 即 light dismiss);任意内容:焦点移出层外即关闭 |

焦点管理:打开时焦点移入层(菜单内容聚焦首个可用项,任意内容聚焦第一个可聚焦元素、兜底层根);焦点移出层外(且未进入本层再开的子弹层)即关闭 —— 子弹层豁免由弹层基建注册表统一完成;经键盘路径(Escape)关闭时焦点归还按钮,保留焦点视觉。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiDropDownButton from '@/components/DropDownButton.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiMenuFlyoutItem from '@/components/MenuFlyoutItem.vue'
</script>

<template>
  <!-- 官方示例复刻:文本按钮 + MenuFlyout(Placement=BottomEdgeAlignedLeft → bottom-start) -->
  <WuiDropDownButton content="Email">
    <template #flyout>
      <WuiMenuFlyoutItem text="Send" />
      <WuiMenuFlyoutItem text="Reply" />
      <WuiMenuFlyoutItem text="Reply All" />
    </template>
  </WuiDropDownButton>

  <!-- 图标按钮:内容为 FontIcon,菜单项带图标列 -->
  <WuiDropDownButton>
    <template #default>
      <WuiFontIcon glyph="&#xE715;" :font-size="16" />
    </template>
    <template #flyout>
      <WuiMenuFlyoutItem text="Send">
        <template #icon><WuiFontIcon glyph="&#xE725;" :font-size="16" /></template>
      </WuiMenuFlyoutItem>
    </template>
  </WuiDropDownButton>

  <!-- 任意内容 flyout:非菜单内容,层为 dialog 语义(FlyoutPresenter 皮肤) -->
  <WuiDropDownButton content="选项">
    <template #flyout>
      <p>任意内容(表单、开关、图文等)</p>
    </template>
  </WuiDropDownButton>
</template>
```

## 与 WinUI 的差异

1. **模板锚点**:WinUI 的 `generic.xaml` 本体没有 `TargetType="DropDownButton"` 段,默认样式与模板在 `controls/dev/DropDownButton/DropDownButton.xaml` 的 `DefaultDropDownButtonStyle`(外观 Setter 全部复用 Button 资源);本实现按该文件对照,色值取 theme.css 的同名 `--wui-*` token。
2. **`isOpen` 属性**:WinUI `DropDownButton` 本身**没有** `IsOpen` 属性 —— 开关状态在其 `Flyout`(`FlyoutBase`)上且为只读,只能经 ShowAt/Hide 或 light dismiss 驱动;Web 侧把该状态合并为按钮上的 `v-model:is-open` 双向暴露,便于编程开关与状态读取(事件仍按 FlyoutBase 的 Opening/Opened/Closing/Closed 命名)。
3. **Chevron 字形前景**:`DropDownButtonForegroundSecondary ← TextFillColorSecondaryBrush`(浅 `#0000009E` / 深 `#FFFFFFC5`),PointerOver/Pressed 为 `DropDownButtonForegroundSecondaryPointerOver/Pressed ← TextFillColorTertiary`;PL2 已落地 `TextFill*` 系列,直引 `--wui-text-fill-color-secondary` / `--wui-text-fill-color-tertiary`(悬停/按下较常态变浅,与源一致);Disabled 按 XAML 用 `--wui-text-fill-color-disabled`。悬停态底色亦为 Button 族 Fluent token(见 [Button](./Button.md) 差异节)。总览见 [_brushes.md](./_brushes.md)。
4. **Chevron 微动画**:WinUI 用 `AnimatedChevronDownSmallVisualSource`(悬停/按下的字形微动画)+ 12x12 `AnimatedIcon`;Web 以静态字形(E96E、8px、Segoe Fluent 字体栈)+ 状态换色近似,不做逐帧动画。
5. **弹层基建级差异**(阴影为 ThemeShadow 的双层 box-shadow 近似、圆角取 `OverlayCornerRadius` 8px、入场为 FlyoutBase 50px 方向位移 + 淡入淡出(开/关同速 250ms,MR1/A3-A4 起,见 `wui-popup-slide-*`)、间距为显式 `offset=4px`):统一见 [弹层公共基建](./_popup-infra.md) 差异节,此处不重复。菜单层底/边仍消费 legacy `--wui-menu-flyout-presenter-background/-border`;PL12/PL16 已把 SplitButton 菜单层切到 `--wui-menu-flyout-presenter-surface` / `--wui-acrylic-in-app-fill-color-default` + `--wui-surface-stroke-color-flyout`,本组件待后续批次统一。
6. **弹层皮肤来源**:WinUI 3 加载 `controls/dev/MenuFlyout` 的非 Reveal `Default*Style`(亚克力底 + `SurfaceStrokeColorFlyoutBrush` 边),legacy Reveal 样式不再生效;本组件复用同一菜单皮肤,详见 [MenuFlyout](./MenuFlyout.md) 差异节。

## 互链

- 弹层公共基建:[_popup-infra](./_popup-infra.md)(定位/翻转/推回/z-index/嵌套豁免由 `usePopupLayer` + 注册表完成)
- 菜单族组件:[MenuFlyout](./MenuFlyout.md) / [MenuFlyoutItem](./MenuFlyout.md)(`#flyout` slot 内的项与本组件提供的层上下文协作)
- 相关控件:[Button](./Button.md)(外观同源)、[SplitButton](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.splitbutton)(按钮+默认命令变体)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
