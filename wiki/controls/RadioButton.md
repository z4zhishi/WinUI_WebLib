# RadioButton

> 在线示例:[/#/radiobutton](/#/radiobutton) · 演示页源码:[demo/pages/RadioButtonPage.vue](../../demo/pages/RadioButtonPage.vue)

## 概述

RadioButton 控件用于让用户从一组**互斥**的相关选项中选择其一,通常置于 RadioButtons 组控件中。与 CheckBox(可自由组合多选)相对,同组 RadioButton 同一时刻至多一项选中:点击或用方向键选中一项后,同组其余项自动取消选中。

官方文档:

- [RadioButton - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.radiobutton)
- [RadioButtons - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.radiobuttons)
- [RadioButton 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/radio-button)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `Content` | `string` | `''` | 选项右侧的标签文字;同名默认 slot 兜底(slot 内容优先) |
| `groupName` | `string` | `''` | 组名(WinUI `GroupName`):同名实例互斥(可跨容器);缺省时**同父容器的实例自动成组**(对应 WinUI 默认父容器分组语义) |
| `checked` (v-model) | `boolean` | `false` | 选中状态,双向绑定;同组其他选项被选中时本项自动回写为 `false` |
| `disabled` | `boolean` | `false` | 禁用交互与焦点(WinUI `IsEnabled = false` 的取反映射) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent)` | 点击选项时触发;禁用时不触发(WinUI `Click`) |
| `checked` | — | 该选项进入选中态(WinUI `Checked`) |
| `unchecked` | — | 该选项退出选中态(WinUI `Unchecked`;含同组其他选项被选中时的互斥回写) |
| `update:checked` | `(value: boolean)` | `v-model:checked` 双向绑定更新 |

事件仅在**用户交互**时触发;父组件程序化修改 `v-model:checked` 不会触发 `checked` / `unchecked`(与 WinUI 略有差异,见下文)。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiRadioButton from '@/components/RadioButton.vue'

// 每个选项一份独立的 boolean 模型(对应 WinUI 每个 RadioButton 独立的 IsChecked)。
// 同组互斥时,被取消选中的选项由组件自动回写为 false,无需手写联动逻辑。
const option1 = ref(true)
const option2 = ref(false)
const option3 = ref(false)
</script>

<template>
  <!-- 显式 groupName:同名实例互斥(可跨容器) -->
  <WuiRadioButton v-model:checked="option1" group-name="options" content="Option 1" />
  <WuiRadioButton v-model:checked="option2" group-name="options" content="Option 2" />
  <WuiRadioButton v-model:checked="option3" group-name="options" content="Option 3" />

  <!-- 禁用 -->
  <WuiRadioButton group-name="options" content="Disabled" disabled />
</template>
```

同组互斥最简写法是**省略 `groupName`**:同一父容器内的 `<WuiRadioButton>` 自动成组(示例页「选项增删」演示),对应 WinUI 不设 `GroupName` 时按父容器分组的语义。

## 分组、键盘与无障碍

WinUI 的 RadioButton 组语义(互斥 + 键盘)与 CheckBox 不同,本组件用**原生 `input[type=radio]`** 承载、视觉自绘:

- **互斥**:同名 `groupName` 映射为原生 `name`(全文档生效,可跨容器);缺省时按父容器自动分配组名。原生互斥只改 DOM 选中态,组件内部再把它回写为同组各实例的 `v-model`,并对被取消选中的前任派发 `unchecked`(对应 WinUI 的 `Unchecked`);
- **键盘**:组内 **上下左右方向键**移动选中、**组内仅选中项可 Tab 到**、`Space` 选中当前项 —— 全部为原生 radio 行为,与 WinUI 一致;
- **无障碍**:`role="radio"` / `aria-checked` / 禁用态由原生 input 提供,自绘圆形标记 `aria-hidden`,标签文字经包裹 `<label>` 与 input 关联。

## 与 WinUI 的差异(视觉与行为对照)

视觉按权威 `controls/dev/CommonStyles/RadioButton_themeresources.xaml` 的 CommonStates × CheckStates 复刻(状态色由 PL9 重定向到 Fluent:外圈描边 `--wui-control-strong-stroke-color-default/disabled`、强调 `--wui-accent-fill-color-default/secondary/tertiary/disabled`、填充 `--wui-control-alt-fill-color-secondary/tertiary/quarternary/disabled`、内点 `--wui-text-on-accent-fill-color-primary`;总览见 [_brushes.md](./_brushes.md)),以下项无对应 token 或做了 Web 等价替换:

1. **描边厚度 token 未提取**:`RadioButtonBorderThemeThickness = 2` 是 `x:Double` 资源,theme.css 未生成对应 token。本组件固定外圈 `border: 2px`(20x20 外圈、内点基尺寸 `RadioButtonCheckGlyphSize=12`、行高 32、内容 `Padding=8,6,0,0`、字号 14px 均按模板)。
2. **互斥/键盘承载方式**:WinUI 由控件内部实现组逻辑;Web 侧交由原生 `input[type=radio][name]`,键盘与 Tab 语义因此与 WinUI 等价。原生互斥只改 DOM 选中态,组件再经**模块级组注册表**([src/components/radioButtonGroups.ts](../../src/components/radioButtonGroups.ts),普通模块顶层作用域、所有实例共享)把它回写为同组各实例的 `v-model:checked`。选中视觉由隐藏 input 的 `:checked` 经相邻兄弟选择器驱动,视觉层不参与命中(整行 label 可点)。
3. **事件触发面**:WinUI 的 `Checked`/`Unchecked` 在程序化赋值时同样触发;本组件仅用户交互触发,程序化变化请监听 `v-model`。同组互斥中前任选项的 `unchecked` 属用户交互路径,会正常派发。
4. **焦点框**:WinUI 系统焦点框为双层(2px 主色 + 内衬次色,`FocusVisualMargin=-7,-3,-7,-3`)。Web 侧以单层 `outline: 2px solid var(--wui-system-control-focus-visual-primary)`(偏移 2px)近似;焦点位于隐藏 input 上,经 `:has(input:focus-visible)` 上浮到根元素 —— 不支持 `:has()` 的旧内核无焦点框(选中视觉不受影响)。
5. **根网格背景/边框**:模板 `RootGrid` 的 Background/BorderBrush 权威为 `ControlFillColorTransparentBrush`,PL9 已重定向为 `--wui-control-fill-color-transparent`(视觉仍全透明)。
6. **内点(CheckGlyph)**:源 L179 基尺寸 `RadioButtonCheckGlyphSize=12`(遗留 generic.xaml 为 10,MR15 已订正为 12),并补上权威 CommonStates 尺寸 morph(PointerOver→14 @250ms、Pressed→10 @250ms、Disabled→14 @167ms,均 `cubic-bezier(0,0,0,1)`)。PL9 已把内点**描边由「透明不可见」改为渐变环**(权威 `Stroke` 本就是渐变):未选中 `CircleElevationBorderBrush`(`--wui-circle-elevation-border`,PL9 新增)、选中 `AccentControlElevationBorderBrush`(`--wui-accent-control-elevation-border`)、选中禁用 `ControlElevationBorderBrush`(`--wui-control-elevation-border`);未选中态内点 `opacity:0` 故该环不可观测(登记)。选中态切换按模板 `Duration=0` 即时呈现。源另有 `PressedCheckGlyph`(4x4 圆角内点,按下时 4→10 @167ms),Web 未实现,登记为已知缺口。
7. **内容换行**:ContentPresenter `TextWrapping="Wrap"` 由默认流式换行承接。
8. **属性命名**:`Content` → `content` + 默认 slot;`GroupName` → `groupName`;`IsEnabled` → `disabled`(沿用原生语义,原生 `disabled` 同时移除焦点与点击)。WinUI 的 `IsChecked` 为非空 `bool`,故 `v-model:checked` 为纯 `boolean`(与 CheckBox 的三态不同)。
9. **示例页预览色块(演示数据色,非控件 token)**:演示页「双组联动」中预览色块的取色来自官方 WinUI Gallery 示例源码(`RadioButtonPage.xaml.cs` 与 `RadioButtonStrings.txt`):Background 的 Green `#008000` / Yellow `#FFFF00` / White `#FFFFFF`,Border 的 Green(DarkGreen)`#006400` / Yellow(Gold)`#FFD700` / White `#FFFFFF`,以及 Border 无选中时的默认底色 `#FFFFFF`、描边 `#FFD700`。这些是官方示例的演示数据取色,仅用于色块预览;RadioButton 控件本体的颜色仍全部消费 `--wui-radio-button-*` token。

---

演示页源码:[demo/pages/RadioButtonPage.vue](../../demo/pages/RadioButtonPage.vue) · 组件源码:[src/components/RadioButton.vue](../../src/components/RadioButton.vue) · Fluent 画刷族:[_brushes.md](./_brushes.md)
