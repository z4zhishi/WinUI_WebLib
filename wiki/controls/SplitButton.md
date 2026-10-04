# SplitButton

> 在线示例:[/#/splitbutton](/#/splitbutton) · 演示页源码:[demo/pages/SplitButtonPage.vue](../../demo/pages/SplitButtonPage.vue)

## 概述

SplitButton 是一个**下拉按钮**:由两个点击区组成——主区直接执行命令(触发 `click`),次区(chevron 箭头)打开关联的弹层(Flyout / MenuFlyout)。相比 DropDownButton「只能开菜单」,SplitButton 额外提供了一个独立的执行热区,适合「默认动作 + 备选动作」场景(如「保存」/「另存为…」)。两区共享一套状态视觉,又可**独立按压**;键盘上 Space / Enter 触发主区,Alt+Down 或 F4 打开弹层(对照源 `SplitButtonAutomationPeer` 的 Invoke + ExpandCollapse 双 pattern)。

> 后续 ToggleSplitButton(带 checked 态的变体,与本组件共用模板)将基于本实现扩展,源码内已预留挂点注释。

官方文档:

- [SplitButton - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.splitbutton)
- [Button 设计准则(SplitButton 节)](https://learn.microsoft.com/windows/apps/design/controls/buttons#create-a-split-button)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `Content` | `string` | `''` | 主区文本;同名默认 slot 兜底(slot 内容优先,可放色块 / 图标等任意元素) |
| `#flyout` (slot) | `—` | `—` | 弹层内容:任意元素,或直接放 [MenuFlyoutItem](./MenuFlyout.md) 族(自动获得菜单层上下文、菜单皮肤与键盘导航) |
| `disabled` | `boolean` | `false` | 禁用交互与焦点(WinUI `IsEnabled = false` 的取反映射) |
| `placement` | `PopupPlacement` | `'bottom-start'` | 弹层放置位(源写死 `BottomEdgeAlignedLeft`,映射即 `bottom-start`;可覆盖) |
| `fontSize` / `fontWeight` | `number \| string` | `14` / `Normal` | 主区字号 / 字重(WinUI 字体系属性) |
| `cornerRadius` | `number \| string` | `4` | 圆角(ControlCornerRadius) |
| `padding` | `string` | `'6px 11px 7px'` | 主区内边距(`SplitButtonPadding = 11,6,11,7`);官方色板示例设 `0` 让色块贴边 |
| `openFlyout()` / `closeFlyout()` | method(ref) | `—` | 程序化开关弹层(`FlyoutBase.ShowAt/Hide` 的等价入口) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent \| KeyboardEvent)` | 主区激活(WinUI `Click`):鼠标点主区,或聚焦后按 Space / Enter(键**抬起**确认,对照源 `OnSplitButtonKeyUp`);禁用时不触发 |
| `open` | — | 弹层开始打开(次区点击 / Alt+Down / F4;WinUI 由 `Flyout.Opened` 提供,SplitButton 本体无此事件,Web 侧合并补充) |
| `close` | — | 弹层已关闭(外部按下 / Escape / 锚滚动 / 再点次区 / 选中菜单项) |

命令层说明:WinUI 的 `Command` / `CommandParameter`(ICommand)按任务规格简化为 `click` 事件;键盘触发的 `click` 事件对象是 `KeyboardEvent`,可据以区分输入来源。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiSplitButton from '@/components/SplitButton.vue'
import WuiMenuFlyoutItem from '@/components/MenuFlyoutItem.vue'
import WuiMenuFlyoutSeparator from '@/components/MenuFlyoutSeparator.vue'
import WuiToggleMenuFlyoutItem from '@/components/ToggleMenuFlyoutItem.vue'

const repeat = ref(true)

function onSave() { console.log('Save') }
function onShare() { console.log('Share') }
function onCopy() { console.log('Copy') }
</script>

<template>
  <!-- 文本主区 + 内嵌 MenuFlyout:菜单项点击后自动收起 -->
  <WuiSplitButton content="Save" @click="onSave">
    <template #flyout>
      <WuiMenuFlyoutItem text="Share" :accelerator-keys="'Ctrl+S'" @click="onShare" />
      <WuiMenuFlyoutItem text="Copy" icon="Copy" @click="onCopy" />
      <WuiMenuFlyoutSeparator />
      <WuiToggleMenuFlyoutItem text="Repeat" v-model:is-checked="repeat" />
    </template>
  </WuiSplitButton>

  <!-- 色块主区(官方示例:padding=0 让色块贴边)+ 任意弹层内容 -->
  <WuiSplitButton padding="0" @click="onSave">
    <span style="display:inline-block;width:32px;height:32px;background:green;border-radius:4px 0 0 4px" />
    <template #flyout>
      <!-- 任意元素:色板网格、表单…… -->
    </template>
  </WuiSplitButton>

  <!-- 禁用 -->
  <WuiSplitButton content="Disabled" disabled />
</template>
```

## 视觉状态对照

源模板(`controls/dev/SplitButton/SplitButton.xaml`,即 `TargetType="SplitButton"` 模板段的 mux 源;dxaml 的 generic.xaml 不含此控件)CommonStates 全集与 Web 实现的对应:

| 源 VisualState | 触发 | Web 实现 |
| --- | --- | --- |
| `Normal` | 默认 | 基线 token(`--wui-splitbutton-fill` / `--wui-splitbutton-foreground` / `--wui-splitbutton-stroke`) |
| `PrimaryPointerOver` | 指针悬停主区(次区回 Normal 底色) | `.wui-splitbutton-primary:hover` |
| `PrimaryPressed` | 主区按压(边框换按压色) | 主区 `:active` + 根 `:has()` 换框色 |
| `SecondaryPointerOver` | 次区悬停(主区回 Normal) | `.wui-splitbutton-secondary:hover` |
| `SecondaryPressed` | 次区按压(次区前景 Tertiary) | 次区 `:active` |
| `FlyoutOpen` | 弹层打开(双区按压底色 + 按压边框) | `.is-flyout-open`(优先级压过悬停/按压,对照源 UpdateVisualStates 先判 `m_isFlyoutOpen`) |
| `TouchPressed`(含键盘按住) | `m_isKeyDown` / 触摸 | `.is-key-pressed`(Space/Enter 按住整钮按压;次区前景 SecondaryPressed,同源) |
| `Disabled` | `IsEnabled = false` | `.is-disabled`(前景 Disabled、边框/分隔线 ControlStrokeColorDefault) |
| `Checked` 族(9 个) | ToggleSplitButton 专用 | 未实现,源码文末预留挂点注释 |

## 与 WinUI 的差异(视觉与行为对照)

视觉按 SplitButton.xaml + SplitButton_themeresources.xaml 复刻;状态色全部即时切换(源各态均为 VisualState.Setters,无过渡动画)。PL16 已把组件内字面量 token `--wui-splitbutton-*` **改为直引 PL2 Fluent token**(解析值不变,XAML `#AARRGGBB` → CSS `#RRGGBBAA` 字节序),主题切换由 Fluent token 自带的明暗值完成:

| 组件中间变量 | 源资源(解析链) | 直引的 Fluent token |
| --- | --- | --- |
| `--wui-splitbutton-fill` | `SplitButtonBackground` ← `ControlFillColorDefault` | `--wui-control-fill-color-default` |
| `--wui-splitbutton-fill-pointer-over` | `SplitButtonBackgroundPointerOver` ← `ControlFillColorSecondary` | `--wui-control-fill-color-secondary` |
| `--wui-splitbutton-fill-pressed` | `SplitButtonBackgroundPressed` ← `ControlFillColorTertiary` | `--wui-control-fill-color-tertiary` |
| `--wui-splitbutton-fill-disabled` | `SplitButtonBackgroundDisabled` ← `ControlFillColorDisabled` | `--wui-control-fill-color-disabled` |
| `--wui-splitbutton-foreground` / `--wui-splitbutton-foreground-pointer-over` | `SplitButtonForeground(PointerOver)` ← `TextFillColorPrimary` | `--wui-text-fill-color-primary` |
| `--wui-splitbutton-foreground-pressed` | `SplitButtonForegroundPressed` ← `TextFillColorSecondary` | `--wui-text-fill-color-secondary` |
| `--wui-splitbutton-foreground-disabled` | `SplitButtonForegroundDisabled` ← `TextFillColorDisabled` | `--wui-text-fill-color-disabled` |
| `--wui-splitbutton-foreground-secondary` | `SplitButtonForegroundSecondary` ← `TextFillColorSecondary` | `--wui-text-fill-color-secondary` |
| `--wui-splitbutton-foreground-secondary-pressed` | `SplitButtonForegroundSecondaryPressed` ← `TextFillColorTertiary` | `--wui-text-fill-color-tertiary` |
| `--wui-splitbutton-stroke` | `SplitButtonBorderBrush` ← `ControlElevationBorderBrush`(渐变) | `--wui-control-stroke-color-secondary`(1px 顶停色平色近似;见差异 1) |
| `--wui-splitbutton-stroke-pressed` | `SplitButtonBorderBrushPressed/Disabled` ← `ControlStrokeColorDefault` | `--wui-control-stroke-color-default` |
| `--wui-splitbutton-divider` | `SplitButtonBorderBrushDivider` ← `ControlStrokeColorDefault` | `--wui-control-stroke-color-default` |

弹层(菜单层)底/边同 PL16 统一:`--wui-acrylic-in-app-fill-color-default`(浅 `#F9F9F9` / 深 `#2C2C2C`)+ `--wui-surface-stroke-color-flyout`。画刷族总览见 [_brushes.md](./_brushes.md)。

其他差异项:

1. **边框渐变简化**:`ControlElevationBorderBrush` 是 3px 垂直渐变(顶部 `ControlStrokeColorSecondary` → 底部 `ControlStrokeColorDefault`),且源把边框拆在 `PrimaryButtonBorder`(1,1,0,1 / 圆角 4,0,0,4)与 `SecondaryButtonBorder`(0,1,1,1 / 0,4,4,0)两个 Grid 上、可独立换色。PL16 取「1px 边框呈现 ≈ 渐变**顶部停色**」的平色近似(`--wui-control-stroke-color-secondary`),未引入 mask 渐变环(根元素 `overflow: hidden` 会裁剪绝对定位环、造成几何位移);整框统一换色(主区按压时源只换左半边框,视觉差异远小于 1px 色差)。
2. **圆角 token 未提取**:`ControlCornerRadius = 4` 未生成 token,以同值 4px 的 `--wui-hyperlink-focus-rect-corner-radius` 承载;圆角由根元素 `border-radius + overflow: hidden` 裁切内层方角,等效源的双区拼角。
3. **尺寸/内边距资源**:主区列 `MinWidth 35`(`SplitButtonPrimaryButtonSize`)、次区列宽 `35`(`SplitButtonSecondaryButtonSize`)、`SplitButtonPadding 11,6,11,7`、次区内边距 `0,0,12,0` 均为 `Thickness/Double` 资源,theme.css 未提取,按值写死。
4. **焦点框**:WinUI 系统焦点框为双层(`UseSystemFocusVisuals=True`,`FocusVisualMargin=-1`);Web 以单层 `outline: 2px solid var(--wui-system-control-focus-visual-primary)`(偏移 1px)近似,与 Button 组件同款。
5. **chevron**:源为 `AnimatedChevronDownSmallVisualSource`(AnimatedIcon,回退 `FontIconSource` 字形 E96E,8px / 12×12 盒);Web 用 12×12 SVG **静态**等价,不加开合旋转动画——源弹层开合无 chevron 旋转行为(仅按压微动),Web 对齐源(fix round 1 F4 移除了初版的 180° 旋转)。
6. **Tab 停靠点**:源根元素 `IsTabStop=True`、内层两钮 `IsTabStop=False`;Web 根 span `tabindex=0`,两枚 `button` 设 `tabindex="-1"`(可点击、不进 Tab 序),`role="button"` + `aria-haspopup` / `aria-expanded` / `aria-disabled` 承载源 AutomationPeer(Invoke + ExpandCollapse)语义;次区 `aria-hidden`(对应源 `AccessibilityView=Raw`)。
7. **次区点击语义**:源 `OnClickSecondary → OpenFlyout`,弹层开着时再按实测收起;Web 取 toggle 语义(开 ↔ 关)。
8. **键盘开弹层的时序**:源在 **KeyUp** 处理 Alt+Down / F4(非 KeyDown),Web 保持一致;按住 Space/Enter 时源还会进入 `SecondaryButtonSpan` 态(次区跨整列,纯内部布局无视觉差异),未复刻。
9. **触摸全域按压**:`TouchPressed` 态下源触摸任一区即双区同时按压;Web 的 `:active` 只按压被触区(指针按压),触摸设备上的差异未复刻。
10. **弹层载体**:WinUI `SplitButton.Flyout` 接受任意 `FlyoutBase`(Flyout / MenuFlyout),由平台弹独立窗口;Web 以 `#flyout` slot + 弹层基建实现(锚 = 根元素、`bottom-start`、light dismiss:外部按下 / Escape / 锚滚动即关,详见 [弹层公共基建](./_popup-infra.md))。`#flyout` 内放 MenuFlyoutItem 族时自动注入菜单层上下文并切菜单皮肤,等效「Flyout 属性挂 MenuFlyout」。
11. **命令层简化**:`Command` / `CommandParameter` 不实现,统一走 `click` 事件(见事件表说明)。
12. **属性命名**:`IsEnabled` → `disabled`;`Content` → `content` + 默认 slot;`Placement`(源内部写死 `BottomEdgeAlignedLeft`)→ `placement` prop,缺省 `'bottom-start'`。

## ToggleSplitButton 预留

ToggleSplitButton(带 checked 态)与 SplitButton 共用模板(源 `<Style TargetType="ToggleSplitButton" BasedOn="SplitButtonStyle"/>`)。本组件源码文末已预留扩展挂点:`checked` 模型、`is-checked` 状态类、Checked 族状态 token(强调色底 + TextOnAccent 前景 + `ControlStrokeColorOnAccentTertiary` 分隔线)与 `aria-pressed` 语义,详见 `src/components/SplitButton.vue` 注释块。

## 互链

- 弹层公共基建:[wiki/controls/_popup-infra.md](./_popup-infra.md)(层上下文、light dismiss 与 Escape 逐级约定)
- 菜单族:[MenuFlyout](./MenuFlyout.md)(`#flyout` slot 内可用的菜单项五件套)
- 相关控件:[Button](./Button.md) · [ToggleButton](./ToggleButton.md) · [Flyout](./Flyout.md)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)

---

演示页源码:[demo/pages/SplitButtonPage.vue](../../demo/pages/SplitButtonPage.vue) · 组件源码:[src/components/SplitButton.vue](../../src/components/SplitButton.vue)
