# NumberBox

> 在线示例:[/#/numberbox](/#/numberbox)

## 概述

使用 NumberBox 让用户输入数字。可以通过 Minimum / Maximum 限制取值范围(越界处理由 ValidationMode 决定:回退上次有效值或钳制到最近边界),通过 SmallChange / LargeChange 与步进按钮(内联 Inline、聚焦弹出 Compact 或隐藏 Hidden)进行步进,还可以通过自定义数字格式化器控制显示与解析。

对应 WinUI `Microsoft.UI.Xaml.Controls.NumberBox`,视觉与交互状态(Normal / PointerOver / Focused / Disabled、Inline 步进按钮、Compact 弹层)对照 `controls/dev/NumberBox/NumberBox.xaml` 的默认样式与模板(该控件不在 `generic.xaml` 主表,主题资源见同目录 `NumberBox_themeresources.xaml`)复刻。

官方文档:

- [NumberBox - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.numberbox)
- [NumberBox 设计指南](https://learn.microsoft.com/windows/apps/design/controls/number-box)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | `number \| null` | `null` | 当前值,支持 `v-model:value` 双向绑定;`null` 对应 WinUI 的 `NaN`(空输入即清值) |
| `header` | `string` | `''` | 输入框上方的标头文本(WinUI `Header`) |
| `placeholderText` | `string` | `''` | 空内容时显示的占位文本(WinUI `PlaceholderText`) |
| `minimum` | `number` | `-Number.MAX_VALUE` | 最小值(WinUI `Minimum`);`minimum > maximum` 时收敛为同一值(源 CoerceMinimum/CoerceMaximum) |
| `maximum` | `number` | `Number.MAX_VALUE` | 最大值(WinUI `Maximum`) |
| `smallChange` | `number` | `1` | 小步长:步进按钮 / ↑↓ 方向键 / 滚轮(WinUI `SmallChange`) |
| `largeChange` | `number` | `10` | 大步长:PageUp / PageDown(WinUI `LargeChange`) |
| `spinButtonPlacementMode` | `'Hidden' \| 'Compact' \| 'Inline'` | `'Hidden'` | 步进按钮布局(WinUI `SpinButtonPlacementMode`):Inline 内联两键、Compact 聚焦时在框上方弹出上下两键、Hidden 无按钮 |
| `validationMode` | `'InvalidInputOverwritten' \| 'InvalidInputOverbound'` | `'InvalidInputOverwritten'` | 校验模式(WinUI `ValidationMode`),见下节 |
| `numberFormatter` | `NumberBoxFormatter` | Intl 默认实现 | `{ format(value): string; parse(text): number \| null }`(WinUI `NumberFormatter`,要求同时可格式化与可解析);默认实现按运行时区域用 `Intl.NumberFormat`,不做千分位分组,显示层先舍入到 10 位有效数字(源 `m_displayRounder.SignificantDigits(10)`) |
| `inputScope` | `string` | `'Number'` | WinUI `InputScope`;映射为原生 `inputmode`(`Number` → `decimal`),其余值原样透传 |
| `description` | `string` | `''` | 控件下方的说明文本(WinUI `Description`) |
| `disabled` | `boolean` | `false` | 禁用;走原生 `input` `disabled`,样式对照模板 Disabled 视觉状态 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `valueChanged` | `(event: { oldValue: number \| null; newValue: number \| null })` | **提交点**上值变化时触发:Enter keyup、失焦、步进按钮与 ↑↓ / PageUp / PageDown、滚轮、取值范围变更引发的钳制;输入过程不触发(WinUI `ValueChanged` 非实时语义) |

模板中监听写法:`@value-changed="onValueChanged"`。

### 提交与校验语义(对照 NumberBox.cpp)

- **输入过程**文本自由编辑,`value` 与 `valueChanged` 均不更新(WinUI 中 TextBox.Text 自由、Value 不动);
- **提交点**(`ValidateInput`,对照源实现):空文本 → `value = null`;解析成功且在界内 → 更新 `value` 并按格式化器规范化文本(值未变也会刷新文本);解析失败或越界 → 按 `validationMode` 处理:
  - `InvalidInputOverwritten`(默认):解析失败的输入**回退上次有效值**(源 ValidateInput);
  - `InvalidInputOverbound`:越界输入**钳制到最近的边界值**(源 CoerceValue);解析失败的文本保留不覆盖(源语义),但会亮错误旗标提示;
- **错误旗标(小红旗)**:发生校验纠错(钳制或回退)或无效文本被保留时,输入框描红并显示错误 glyph(`title` 有提示文案,`aria-invalid` 同步);用户重新输入或下一次无纠错的提交即清除。这是 Web 增强,WinUI 原生无内建错误视觉;
- **键盘**:↑↓ = ±smallChange、PageUp / PageDown = ±largeChange(keydown 步进,自带按键重复);Enter = 提交;Esc = 文本恢复为当前值的格式化形式(源 OnNumberBoxKeyUp);
- **滚轮**:聚焦时上下滚动按 smallChange 步进(源 OnNumberBoxScroll);
- **步进按钮**为 RepeatButton 语义:按住约 400ms 后以 90ms 间隔连发;值到达边界或 `value` 为空(null)时按钮禁用(源 UpdateSpinButtonEnabled);
- **聚焦**:文本全选(源 OnNumberBoxGotFocus);Compact 布局聚焦时弹出上下按钮层、失焦收起。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiNumberBox from '@/components/NumberBox.vue'
import type { NumberBoxFormatter } from '@/components/NumberBox.vue'

const count = ref<number | null>(10)

// 自定义格式化器:2 位小数 + 千分位
const twoDigits: NumberBoxFormatter = {
  format: (v) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  parse: (text) => {
    const n = Number(text.trim().replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  },
}

function onValueChanged({ oldValue, newValue }: { oldValue: number | null; newValue: number | null }): void {
  console.log('valueChanged:', oldValue, '→', newValue)
}
</script>

<template>
  <WuiNumberBox
    v-model:value="count"
    header="数量:"
    placeholder-text="0"
    :minimum="0"
    :maximum="100"
    :small-change="1"
    :large-change="10"
    spin-button-placement-mode="Inline"
    validation-mode="InvalidInputOverbound"
    :number-formatter="twoDigits"
    @value-changed="onValueChanged"
  />
</template>
```

## 与 WinUI 的差异说明

- **错误旗标为 Web 增强**:WinUI NumberBox 无内建错误视觉;本实现按任务要求在校验纠错时亮「小红旗」(红描边 + 错误 glyph + `title` / `aria-invalid`),清除时机见上节。
- **ValidationMode 枚举值**:公开 API 文档为 `InvalidInputOverwritten` / `InvalidInputOverbound`;CK 快照 `NumberBox.idl` 的枚举文本为 `{ InvalidInputOverwritten, Disabled }`(且 CoerceValue 处分支写作 `InvalidInputOverwritten`,实为文档中 Overbound 的钳制语义),快照内部命名与公开文档不一致。本实现按任务要求与公开文档语义落地两个值。
- **AcceptsExpression(表达式求值)未实现**:官方示例的 `1 + 2^2` 代数式求值(NumberBoxParser)不在本波次范围,输入按普通数字解析。
- **IsWrapEnabled 未实现**:到达边界后步进被钳制(Overbound)或越界保留(Overwritten),不循环到另一端;步进按钮禁用逻辑按源 Overbound 分支实现。
- **`Text` 属性未公开**:WinUI 的 `NumberBox.Text` 可双向绑定;本实现编辑文本为组件内部状态,经 `v-model:value` + 格式化器表达,提交后自动规范化。
- **颜色 / 字号**:文本框本体已按 PL6/PL8 重定向到 Fluent 画刷族(`--wui-control-fill-color-*` / `--wui-text-fill-color-*` / `--wui-text-control-elevation-border`,与 TextBox 同族);步进按钮按源模板 ThemeDictionaries 把 `RepeatButton*` 画刷映射到 `--wui-text-fill-color-*` / `--wui-subtle-fill-color-*`;弹层边 PL6 改为 `--wui-surface-stroke-color-flyout`(`SurfaceStrokeColorFlyoutBrush`),底为亚克力回退不透明近似(权威 `AcrylicBackgroundFillColorDefaultBrush`,浅 `#F9F9F9` / 深 `#2C2C2C`,登记为材质近似),圆角/阴影取 `--wui-popup-corner-radius`、`--wui-popup-shadow`;错误色取 `--wui-system-control-error-text-foreground`;说明文本取 `--wui-system-control-description-text-foreground`。总览见 [_brushes.md](./_brushes.md)。
- **无 token 的结构值**(WinUI 3 权威 `controls/dev`,PL7/PL8 更新):Border 1(`Common_themeresources.xaml` L10/L24;Focused 1,1,1,2 L11/L25)、`Padding` = 10,5,6,6(L12/L26/L40,`NumberBox.xaml` L12;legacy 的 10,3,6,6 已替换)、MinHeight / MinWidth 32 / 64、`NumberBoxSpinButtonBorderThickness` = 0,1,1,1(`NumberBox_themeresources.xaml` L29,施加点 `NumberBox.xaml` L188 → CSS `border-width: 1px 1px 1px 0`)、步进按钮 MinWidth 32 / FontSize 12、弹层按钮 36×36 / FontSize 16、弹层 Padding 6 与按钮间距 4、`NumberBoxMinWidth` = 120(Inline 态输入区最小宽)、Compact 指示符 Margin 0,0,8,0、glyph 12px(取同值 token `--wui-tool-tip-content-theme-font-size`)。
- **圆角**:源模板 `CornerRadius = ControlCornerRadius`(WinUI 3 默认 4px),按源默认值写死;弹层为 `OverlayCornerRadius`(8px),取弹层基建 token。
- **禁用步进按钮的前景色**:源映射到 `TextControlButtonForegroundDisabled`;PL6 起按钮族统一取 Fluent `--wui-text-fill-color-disabled`(权威 `TextFillColorDisabledBrush`)。
- **Compact 指示符 glyph**:源 `PopupIndicator` 用 U+EC8F,该码位在 Segoe Fluent Icons/MDL2 中非通用字形,近似改用 U+E70E(ChevronUp,与步进按钮同源),语义一致(提示聚焦可弹出步进层)。
- **Compact 弹层定位**:源 Popup 以 `NumberBoxPopupHorizonalOffset = -21` / `VerticalOffset = -27` 锚定;Web 实现为输入区右上方 4px 处右对齐(视觉近似,非逐像素)。
- **步进按钮连发为模拟**:RepeatButton 的按住连发以 Pointer Events + `setPointerCapture` 模拟(按下立即步进一次,400ms 后每 90ms 一步);源按钮 `IsTabStop=False`,实现 `tabindex="-1"`,步进无键盘路径(与源一致,键盘用 ↑↓ / PageUp / PageDown)。
- **默认格式化器**:源构造函数注入区域感知 `DecimalFormatter`(IntegerDigits=1 / FractionDigits=0);Web 默认用运行时区域 `Intl.NumberFormat`(无分组、最多 20 位小数)+ 显示层 10 位有效数字舍入,解析仅接受十进制字面量(不接受 `0x10` 等)。
- **`v-model:value` 程序化赋值**会触发 `valueChanged` 吗:不会——父组件直接写 `value` 更新的是外部状态,组件仅回写文本(源中程序化设 Value 会触发 ValueChanged,Web 侧按 Vue 惯例收窄);取值范围变更引发的钳制仍会触发。
- **GamepadA/B**:源在 keyup 处理手柄 A/B 等价 Enter/Esc,Web 侧无对应按键语义,未实现。

---

演示页源码:[demo/pages/NumberBoxPage.vue](../../demo/pages/NumberBoxPage.vue) · Fluent 画刷族:[_brushes.md](./_brushes.md)
