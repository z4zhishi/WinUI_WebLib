# ToggleButton

> 在线示例:[/#/togglebutton](/#/togglebutton) · 演示页源码:[demo/pages/ToggleButtonPage.vue](../../demo/pages/ToggleButtonPage.vue)

## 概述

ToggleButton 看起来像 Button,行为却像 CheckBox:在**选中(checked / on)**与**未选中(unchecked / off)**两种状态之间切换;当 `IsThreeState` 为 `true` 时还可进入**不确定态(indeterminate)**。当前状态通过 `IsChecked` 属性读取。典型用途是工具栏中「按下保持」的命令按钮(加粗、对齐等);若需要带勾选框视觉的切换控件请用 CheckBox,需要滑块开关视觉请用 ToggleSwitch。

官方文档:

- [ToggleButton - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.primitives.togglebutton)
- [Button 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/buttons#create-a-toggle-split-button)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `Content` | `string` | `''` | 按钮文本内容;同名默认 slot 兜底(slot 内容优先) |
| `checked` (v-model) | `boolean \| 'indeterminate'` | `false` | 选中状态;`'indeterminate'` 对应 WinUI `IsChecked = null`,双向绑定 |
| `isThreeState` | `boolean` | `false` | 是否允许用户点击进入不确定态(WinUI `IsThreeState`) |
| `reveal` | `boolean` | `false` | Reveal 揭示光照(对照 `ToggleButtonRevealStyle`,generic.xaml L15953):开启后全部组合态(checked / indeterminate × 交互态)切换到 `--wui-toggle-button-reveal-*` token(checked 底色为强调色纯色),并叠加跟随指针的光照(底板光 + 2px 边框光环)。源中该样式为非默认 keyed 样式,故 opt-in 默认关闭;见 [_reveal.md](./_reveal.md) |
| `disabled` | `boolean` | `false` | 禁用交互与焦点(WinUI `IsEnabled = false` 的取反映射) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent)` | 点击按钮时触发(鼠标左键,或聚焦后按 Space/Enter 键);禁用时不触发 |
| `checked` | — | 交互后进入选中态(WinUI `Checked`) |
| `unchecked` | — | 交互后进入未选中态(WinUI `Unchecked`) |
| `indeterminate` | — | 交互后进入不确定态(WinUI `Indeterminate`) |
| `update:checked` | `(value: boolean \| 'indeterminate')` | `v-model:checked` 双向绑定更新 |

事件仅在**用户交互**时触发;父组件程序化修改 `v-model:checked` 不会触发 `checked` / `unchecked` / `indeterminate`(与 WinUI 略有差异,见下文)。官方 `OnClick` 次序为:先切状态并触发 `Checked`/`Unchecked`/`Indeterminate`,后触发 `Click`(`ToggleButton_Partial.cpp` L178 起),本组件保持一致。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiToggleButton from '@/components/ToggleButton.vue'

const isChecked = ref<boolean | 'indeterminate'>(false)

function onChecked() { console.log('On') }
function onUnchecked() { console.log('Off') }
</script>

<template>
  <!-- 二态:点击在 On / Off 间切换 -->
  <WuiToggleButton v-model:checked="isChecked" Content="ToggleButton" @checked="onChecked" @unchecked="onUnchecked" />

  <!-- 三态:点击环 未选中 → 选中 → 不确定 → 未选中 -->
  <WuiToggleButton v-model:checked="isChecked" Content="Three-state" :is-three-state="true" />

  <!-- 禁用(可叠加初始选中) -->
  <WuiToggleButton Content="Disabled" disabled />
</template>
```

## `v-model:checked` 与三态的设计决策

WinUI 的 `ToggleButton.IsChecked` 是 `Nullable<bool>`:`true` / `false` / `null` 三值。Web 侧没有可空的布尔惯用法,本组件(与 CheckBox 一致)选择**字符串哨兵值 `'indeterminate'`** 表示第三态:

- `boolean | 'indeterminate'` 联合类型在 TS 下可判别,`checked === 'indeterminate'` 即等价于 `IsChecked == null`;
- `null` 在 Vue 的 prop 默认值 / `defineModel` 语义中含义模糊(常表示「未提供」),用 `'indeterminate'` 可避免「不传 = 不确定态」的歧义;
- 无障碍上,`'indeterminate'` 映射为 `aria-pressed="mixed"`(ARIA 对开关按钮第三态的标准表达,与 CheckBox 的 `aria-checked="mixed"` 同理),其余为 `aria-pressed="true" / "false"`;
- 点击环对照 `ToggleButton::OnToggleImpl`(L249 起):**未选中 → 选中;选中 →(isThreeState 时)不确定,否则未选中;不确定 → 未选中**。程序化传入 `'indeterminate'` 时无论 `isThreeState` 与否都显示第三态视觉(强调色背景消失、回到 BaseLow 底色),与 WinUI 一致。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `generic.xaml` 中 `TargetType="ToggleButton"` 的 ControlTemplate 复刻:CommonStates 是「Unchecked / Checked / Indeterminate × Normal / PointerOver / Pressed / Disabled」的**组合态**(源模板显式列出了 `Checked`、`CheckedPointerOver`、`CheckedPressed`、`CheckedDisabled`、`Indeterminate` 及其三个交互变体),全部用 `DiscreteObjectKeyFrame` 即时切换,颜色对应 theme.css 的 `--wui-toggle-button-*` token。以下项无对应 token 或做了 Web 等价替换:

1. **圆角 token 未提取**:WinUI 3 默认 `ControlCornerRadius = 4` 未在 theme.css 生成同名 token,取最近似的 `--wui-hyperlink-focus-rect-corner-radius`(同为 4px),视觉无损。
2. **内边距 token 未提取**:`ButtonPadding = 8,4,8,5`(XAML Thickness 顺序:左,上,右,下)是 `Thickness` 资源,theme.css 未生成 token,按值硬编码为 CSS `padding: 4px 8px 5px`,与 Button 组件同款处理。
3. **边框厚度 token 未提取**:`ToggleButtonBorderThemeThickness = 2` 为 `Thickness` 资源,按值固定 `border: 2px solid`;默认与选中态描边 token 为透明,悬停态为半透明灰(`#00000066`),与源一致。
4. **焦点框**:WinUI 系统焦点框为双层(2px 主色内环 + 1px 次色外环,`FocusVisualMargin=-3`)。Web 侧以单层 `outline: 2px solid var(--wui-system-control-focus-visual-primary)`(偏移 1px)近似。
5. **属性命名**:`IsEnabled` → `disabled`(沿用原生语义);`IsThreeState` → `isThreeState`;`Content` → `content` + 默认 slot。
6. **事件触发面**:WinUI 的 `Checked`/`Unchecked` 在程序化赋值时同样触发;本组件仅用户交互触发,程序化变化请监听 `v-model:checked`。
7. **主题动画**:源模板 `PointerOver`/`Pressed` 等态附带 `PointerUp/DownThemeAnimation`(指针起落的微缩放动画),Web 侧未复刻该主题动画,状态色切换本身即时,视觉基本无损。

---

演示页源码:[demo/pages/ToggleButtonPage.vue](../../demo/pages/ToggleButtonPage.vue) · 组件源码:[src/components/ToggleButton.vue](../../src/components/ToggleButton.vue) · Reveal 材料:[_reveal.md](./_reveal.md)
