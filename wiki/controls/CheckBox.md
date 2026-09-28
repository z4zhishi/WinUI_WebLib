# CheckBox

> 在线示例:[/#/checkbox](/#/checkbox) · 演示页源码:[demo/pages/CheckBoxPage.vue](../../demo/pages/CheckBoxPage.vue)

## 概述

CheckBox 控件让用户选择一组二进制选项的组合。与之相对,RadioButton 用于从互斥选项中选择其一。**不确定态(indeterminate)** 用于表示某选项仅对部分子选项生效 —— 例如「全选」框在子选项部分勾选时显示为第三态。遵循 WinUI 设计准则:不确定态应由程序或子选项推导,不要允许用户把它当作「第三个选项」直接设置(本组件的 `IsThreeState` 仅控制点击环是否经过该态,与官方行为一致)。

官方文档:

- [CheckBox - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.checkbox)
- [CheckBox 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/checkbox)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `Content` | `string` | `''` | 勾选框右侧的标签文字;同名默认 slot 兜底(slot 内容优先) |
| `checked` (v-model) | `boolean \| 'indeterminate'` | `false` | 勾选状态;`'indeterminate'` 对应 WinUI `IsChecked = null`,双向绑定 |
| `isThreeState` | `boolean` | `false` | 是否允许用户点击进入不确定态(WinUI `IsThreeState`) |
| `disabled` | `boolean` | `false` | 禁用交互与焦点(WinUI `IsEnabled = false` 的取反映射) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent)` | 点击勾选框时触发;禁用时不触发(WinUI `Click`) |
| `checked` | — | 交互后进入勾选态(WinUI `Checked`) |
| `unchecked` | — | 交互后进入未勾选态(WinUI `Unchecked`) |
| `indeterminate` | — | 交互后进入不确定态(WinUI `Indeterminate`) |
| `update:checked` | `(value: boolean \| 'indeterminate')` | `v-model:checked` 双向绑定更新 |

事件仅在**用户交互**时触发;父组件程序化修改 `v-model:checked` 不会触发 `checked` / `unchecked` / `indeterminate`(与 WinUI 略有差异,见下文)。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiCheckBox from '@/components/CheckBox.vue'

const isChecked = ref<boolean | 'indeterminate'>(false)
</script>

<template>
  <!-- 二态 -->
  <WuiCheckBox v-model:checked="isChecked" Content="Two-state CheckBox" />

  <!-- 三态:点击环 未勾选 → 勾选 → 不确定 → 未勾选 -->
  <WuiCheckBox v-model:checked="isChecked" Content="Three-state CheckBox" :is-three-state="true" />

  <!-- 禁用 -->
  <WuiCheckBox Content="Disabled" disabled />
</template>
```

## `v-model:checked` 设计决策

WinUI 的 `CheckBox.IsChecked` 是 `Nullable<bool>`:`true` / `false` / `null` 三值。Web 侧没有可空的布尔惯用法,本组件选择**字符串哨兵值 `'indeterminate'`** 表示第三态:

- `boolean | 'indeterminate'` 联合类型在 TS 下可判别,`checked === 'indeterminate'` 即等价于 `IsChecked == null`;
- `null` 在 Vue 的 prop 默认值 / `defineModel` 语义中含义模糊(常表示「未提供」),用 `'indeterminate'` 可避免「不传 = 不确定态」的歧义;
- 无障碍上,`'indeterminate'` 映射为 `role="checkbox"` + `aria-checked="mixed"`(ARIA 对第三态的标准表达);
- 交互环对照 `ToggleButton::OnToggleImpl`(CheckBox 未覆写):**未勾选 → 勾选;勾选 →(isThreeState 时)不确定,否则未勾选;不确定 → 未勾选**。程序化传入 `'indeterminate'` 时无论 `isThreeState` 与否都显示第三态,与 WinUI 一致。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `generic.xaml` 中 `TargetType="CheckBox"` 的 ControlTemplate 与 CombinedStates 复刻,以下项无对应 token 或做了 Web 等价替换:

1. **描边厚度 token 未提取**:`CheckBoxBorderThemeThickness = 2` 与 `CheckBoxCheckedStrokeThickness`(Light=0 / Default(深色)=0 / HighContrast=2)是 `x:Double` 资源,theme.css 未生成对应 token。本组件固定 `border: 2px`——浅/深主题下勾选、按压态的描边色 token 本身为透明,厚度差异不可见(仅 HighContrast 字典取 2,不在 theme.css 覆盖范围),故视觉无损。
2. **勾/减字形**:WinUI 用 Segoe Fluent Icons 字形 `E001`(CheckMark)/ `E73C`(Subtract)。为保证非 Windows 平台渲染一致,改为内联 SVG 等形复刻,颜色仍取 `--wui-check-box-check-glyph-foreground-*` token。
3. **焦点框**:WinUI 系统焦点框为双层(2px 主色 + 内衬 1px 次色,`FocusVisualMargin=-7,-3,-7,-3`)。Web 侧以单层 `outline: 2px solid var(--wui-system-control-focus-visual-primary)`(偏移 2px)近似。
4. **根网格背景/边框**:模板中 `RootGrid` 的 Background/BorderBrush 各组合态 token 在两套主题下**全部为透明**,故按 unchecked 态静态绑定 `--wui-check-box-background-unchecked` / `--wui-check-box-border-brush-unchecked`,视觉无损。
5. **属性命名**:`IsEnabled` → `disabled`(沿用原生语义,原生 `disabled` 同时移除焦点与点击);`IsThreeState` → `isThreeState`;`Content` → `content` + 默认 slot。
6. **事件触发面**:WinUI 的 `Checked`/`Unchecked` 在程序化赋值时同样触发;本组件仅用户交互触发,程序化变化请监听 `v-model`。
7. **尺寸**:保留 WinUI 的 `MinWidth=120` / `MinHeight=32` / 内容 `Padding=8,5,0,0`(XAML Thickness 顺序:左,上,右,下)与 20x20 勾选框、`ControlContentThemeFontSize=14px`;勾选框无圆角(该模板中 `NormalRectangle` 未设 `RadiusX`)。

---

演示页源码:[demo/pages/CheckBoxPage.vue](../../demo/pages/CheckBoxPage.vue) · 组件源码:[src/components/CheckBox.vue](../../src/components/CheckBox.vue)
