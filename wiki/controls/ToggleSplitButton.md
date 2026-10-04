# ToggleSplitButton

> 在线示例:[/#/togglesplitbutton](/#/togglesplitbutton) · 演示页源码:[demo/pages/ToggleSplitButtonPage.vue](../../demo/pages/ToggleSplitButtonPage.vue)

## 概述

ToggleSplitButton 是**带开关语义的 SplitButton**:由两个点击区组成——主区像开关一样在开 / 关之间切换(触发 `click` 并翻转勾选态,勾选后整钮以系统强调色填充、前景变为 TextOnAccent 色),次区(chevron 箭头)仍用于打开关联的弹层。适合「开关某个功能 + 弹层里挑细分选项」的场景,例如官方示例:用主区开关项目符号列表,用弹层选择列表样式(项目符号 / 罗马数字)。

在 WinUI 源码中它与 SplitButton **共用模板**(`<Style TargetType="ToggleSplitButton" BasedOn="{StaticResource SplitButtonStyle}" />`,仅多了 Checked 全族状态与翻转行为),本组件因此实现为 [SplitButton](./SplitButton.md) 的组合扩展(源码继承 ↔ Web 组合,SplitButton.vue 零改动)。

与 [ToggleButton](./ToggleButton.md) 的差异(官方文档):**无三态**——`IsChecked` 仅 `boolean`,没有 `IsThreeState` 与 `Indeterminate`;事件只有 `IsCheckedChanged`,没有独立的 `Checked` / `Unchecked`。

官方文档:

- [ToggleSplitButton - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.togglesplitbutton)
- [Button 设计准则(ToggleSplitButton 节)](https://learn.microsoft.com/windows/apps/design/controls/buttons)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `isChecked` | `boolean` | `false` | 勾选态(WinUI `IsChecked`;仅 boolean 无三态);`v-model:is-checked` 双向 |
| `Content` / 默认 slot | `string` / `slot` | `''` | 主区文本;默认 slot 兜底(slot 内容优先,可放图标、"M" 字样等) |
| `#flyout` (slot) | `—` | `—` | 弹层内容:任意元素,或直接放 [MenuFlyoutItem](./MenuFlyout.md) 族(自动获得菜单层上下文、菜单皮肤与键盘导航) |
| `disabled` | `boolean` | `false` | 禁用交互与焦点;禁用 + 勾选外观同「仅禁用」(源无 CheckedDisabled 态) |
| `placement` | `PopupPlacement` | `'bottom-start'` | 弹层放置位(源写死 `BottomEdgeAlignedLeft`,可覆盖) |
| `fontSize` / `fontWeight` | `number \| string` | `14` / `Normal` | 主区字号 / 字重 |
| `cornerRadius` / `padding` | `number \| string` | `4` / `'6px 11px 7px'` | 圆角(ControlCornerRadius)/ 主区内边距(SplitButtonPadding) |
| `openFlyout()` / `closeFlyout()` | method(ref) | `—` | 程序化开关弹层(`FlyoutBase.ShowAt/Hide` 的等价入口) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent \| KeyboardEvent)` | 主区激活(WinUI `Click`):**先翻转 checked 再发出**(源 `OnClickPrimary = Toggle()` + `Click`);鼠标点主区,或聚焦后按 Space / Enter(键抬起确认);禁用时不触发 |
| `ischeckedchanged` | `(value: boolean)` | 勾选变化时(用户点击或程序性设置均触发,对照源 `OnIsCheckedChanged`);模板里监听写 `@is-checked-changed` |
| `open` | — | 弹层开始打开(次区点击 / Alt+Down / F4;继承 SplitButton,WinUI 由 `Flyout.Opened` 提供) |
| `close` | — | 弹层已关闭(外部按下 / Escape / 锚滚动 / 再点次区 / 选中菜单项) |

命令层说明:`Command` / `CommandParameter` 按任务规格简化为 `click` 事件(同 SplitButton);键盘触发的 `click` 事件对象是 `KeyboardEvent`,可据以区分输入来源。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiToggleSplitButton from '@/components/ToggleSplitButton.vue'

const bold = ref(false)
</script>

<template>
  <!-- 主区开关:点击 / Space / Enter 翻转 checked,勾选后整钮以强调色填充 -->
  <WuiToggleSplitButton
    content="M"
    v-model:is-checked="bold"
    @is-checked-changed="(value: boolean) => console.log('checked:', value)"
  >
    <template #flyout>
      <!-- 弹层选项:套用后按需设置勾选并收起(对照官方 IsChecked 赋值 + Flyout.Hide()) -->
      <button @click="bold = true">加粗</button>
      <button @click="bold = false">常规</button>
    </template>
  </WuiToggleSplitButton>

  <!-- 内嵌 MenuFlyout:弹层自动切菜单皮肤,菜单项点击后自动收起 -->
  <WuiToggleSplitButton v-model:is-checked="on" @click="onMain">
    <template #flyout>
      <WuiMenuFlyoutItem text="项目符号" icon="List" @click="pick('bullet')" />
      <WuiMenuFlyoutItem text="罗马数字" icon="Bullets" @click="pick('alpha')" />
    </template>
  </WuiToggleSplitButton>
</template>
```

## 视觉状态对照

Checked 全族(源 `controls/dev/SplitButton/SplitButton.xaml` L131-L207;状态选择逻辑见 `ToggleSplitButton` 复用的 `SplitButton.cpp UpdateVisualStates` L137-L183)。实现方式:SplitButton.vue 的全部状态规则消费根元素 `--wui-splitbutton-*` token,本组件经 attrs 透传在同一根元素追加 `.is-checked` 并覆写 token,即命中全族:

| 源 VisualState | 触发 | Web 实现 |
| --- | --- | --- |
| `Checked` | 勾选、无交互 | `.is-checked` 覆写 token:背景 accent / 前景 TextOnAccent / 边框 OnAccentSecondary / 分隔线 OnAccentTertiary |
| `CheckedPrimaryPointerOver` | 指针悬停主区 | 主区 `:hover` 经 `--wui-splitbutton-fill-pointer-over` / `--wui-splitbutton-foreground-pointer-over` 自动生效 |
| `CheckedPrimaryPressed` | 主区按压 | 主区 `:active` + `:has()` 恢复 accent 边框(源保留 Checked 边框) |
| `CheckedSecondaryPointerOver` | 次区悬停 | 次区 `:hover`(次区前景 TextOnAccentPrimary,同源) |
| `CheckedSecondaryPressed` | 次区按压 | 次区 `:active` + `:has()` 恢复 accent 边框 |
| `CheckedFlyoutOpen` | 勾选 + 弹层打开 | `.is-checked` + `.is-flyout-open` 组合类;边框透明(`--wui-splitbutton-stroke-pressed: transparent`) |
| `CheckedTouchPressed` | 勾选 + 键盘 Space 按住(`m_isKeyDown`)/ 触摸 | `.is-checked` + `.is-key-pressed` 组合类,配色同 CheckedFlyoutOpen |
| (无 `CheckedDisabled` 态) | 禁用 + 勾选 | 不覆写(`:not(.is-disabled)`),回落普通 Disabled 链,外观同「仅禁用」 |

## 与 WinUI 的差异(视觉与行为对照)

SplitButton 的全部差异项(边框渐变简化、圆角 / 内边距资源写死、焦点框单环近似、chevron SVG 等价、弹层载体、命令层简化、属性命名等)**原样继承**,见 [SplitButton 差异节](./SplitButton.md#与-winui-的差异视觉与行为对照)。Checked 分支特有:

| 组件中间变量(`.is-checked` 覆写) | 源资源(解析链) | 直引的 Fluent token |
| --- | --- | --- |
| `--wui-splitbutton-fill` | `SplitButtonBackgroundChecked` ← `AccentFillColorDefault` | `--wui-accent-fill-color-default`(浅 `SystemAccentColorDark1` `#0067C0` / 深 `SystemAccentColorLight2` `#4CC2FF`) |
| `--wui-splitbutton-fill-pointer-over` | `SplitButtonBackgroundCheckedPointerOver` ← `AccentFillColorSecondary` | `--wui-accent-fill-color-secondary`(×0.9) |
| `--wui-splitbutton-fill-pressed` | `SplitButtonBackgroundCheckedPressed` ← `AccentFillColorTertiary` | `--wui-accent-fill-color-tertiary`(×0.8) |
| `--wui-splitbutton-foreground` / `--wui-splitbutton-foreground-pointer-over` / `--wui-splitbutton-foreground-secondary` | `SplitButtonForegroundChecked(PointerOver)` ← `TextOnAccentFillColorPrimary` | `--wui-text-on-accent-fill-color-primary`(浅 `#FFFFFF` / 深 `#000000`) |
| `--wui-splitbutton-foreground-pressed` / `--wui-splitbutton-foreground-secondary-pressed` | `SplitButtonForegroundCheckedPressed` ← `TextOnAccentFillColorSecondary` | `--wui-text-on-accent-fill-color-secondary`(`#FFFFFFB3` / `#00000080`) |
| `--wui-splitbutton-stroke` | `SplitButtonBorderBrushChecked` ← `AccentControlElevationBorderBrush`(渐变) | `--wui-control-stroke-color-on-accent-secondary`(1px 顶停色平色近似) |
| `--wui-splitbutton-stroke-pressed` | `SplitButtonBorderBrushCheckedPressed` ← `ControlFillColorTransparent`(仅 FlyoutOpen / TouchPressed) | 透明 |
| `--wui-splitbutton-divider` | `SplitButtonBorderBrushCheckedDivider` ← `ControlStrokeColorOnAccentTertiary` | `--wui-control-stroke-color-on-accent-tertiary`(`#00000037` 两主题) |

其他差异项:

1. **accent 直引 Fluent token**:PL16 已把 Checked 族底色由「裸 accent 钩子 / Dark1·Dark2 近似档」改为 `--wui-accent-fill-color-default/secondary/tertiary`(权威 `AccentFillColorDefault/Secondary/Tertiary`),修正了原实现与权威的档位差;边框源为 3px 垂直渐变(`AccentControlElevationBorderBrush`),取 1px 顶停色平色近似(同 SplitButton 的 elevation 简化)。
1.1 **scoped 覆写缺陷已修复(PL16)**:原 Checked 全族覆写因 scoped 作用域 id 无法落到 SplitButton 片段根,在真实客户端从不生效(DOM 只含 SplitButton 的 `data-v-*`);已改为非 scoped 样式块(类名 `.wui-togglesplitbutton` 唯一),修复后 Checked 呈 accent 底 + on-accent 前景。
2. **无 `CheckedDisabled` 态**:源模板的 Disabled 分支不含勾选变体(themeresources 里的 `SplitButton*CheckedDisabled` 资源未被模板引用),禁用 + 勾选渲染同「仅禁用」;Web 同样不覆写。
3. **触摸路径的按压边框**:源触摸按压进 `CheckedTouchPressed`(透明边框),鼠标按压进 `CheckedPrimary/SecondaryPressed`(保留 accent 边框);Web 的 CSS `:active` 无法区分鼠标与触摸,统一取 accent 边框(仅按压瞬间的 1px 边框色差异)。
4. **弹层开着时点主区**:源优先 `CheckedFlyoutOpen`(边框透明),Web 的 accent 边框恢复规则已按此排除 `.is-flyout-open`。
5. **无障碍**:保留 `role="button"`(源 AutomationPeer 的 `AutomationControlType` 仍为 `SplitButton`)+ `aria-pressed` 开关语义(对照 [ToggleButton](./ToggleButton.md));`aria-haspopup` / `aria-expanded` 承载 ExpandCollapse pattern,Space / Enter 与 Alt+Down / F4 的键盘行为与源 Invoke + ExpandCollapse + Toggle 三 pattern 一致。
6. **事件面**:`IsCheckedChanged` 对程序性设置同样触发(源 `OnIsCheckedChanged` 仅加载前除外),Web 以 `watch(isChecked)` 全量转发;无 `Checked` / `Unchecked` 事件、无三态(官方「与 ToggleButton 的差异」)。
7. **实现方式**:组合扩展 SplitButton.vue(源 `<Style BasedOn>` 继承 ↔ Web 组合),SplitButton.vue 零改动;checked 视觉不复制样式,只在根元素覆写既有 token(经 attrs 透传落位)。

## 互链

- 拆分按钮(基础):[SplitButton](./SplitButton.md)(模板、弹层与键盘行为的完整对照表)
- 开关按钮:[ToggleButton](./ToggleButton.md)(三态语义与 `aria-pressed` 先例)
- 弹层公共基建:[wiki/controls/_popup-infra.md](./_popup-infra.md)
- 菜单族:[MenuFlyout](./MenuFlyout.md)(`#flyout` slot 内可用的菜单项五件套)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)

---

演示页源码:[demo/pages/ToggleSplitButtonPage.vue](../../demo/pages/ToggleSplitButtonPage.vue) · 组件源码:[src/components/ToggleSplitButton.vue](../../src/components/ToggleSplitButton.vue)
