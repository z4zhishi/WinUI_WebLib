# TextBox

> 在线示例:[/#/textbox](/#/textbox)

## 概述

使用 TextBox 让用户在应用中输入简单文本。可以添加标头(Header)与占位文本(PlaceholderText)让用户知道这个输入框的用途,还可以通过只读、最大长度、行内清除按钮等方式自定义。

对应 WinUI `Microsoft.UI.Xaml.Controls.TextBox`,视觉与交互状态(Normal / PointerOver / Focused / Disabled、清除按钮显隐)对照 `generic.xaml` 中 `TargetType="TextBox"` 的默认样式与模板复刻。

官方文档:

- [TextBox - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.textbox)
- [文本控件设计指南](https://learn.microsoft.com/windows/apps/design/controls/text-controls)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | `''` | 文本值,支持 `v-model:text` 双向绑定(WinUI `Text`) |
| `header` | `string` | `''` | 输入框上方的标头文本(WinUI `Header`) |
| `placeholderText` | `string` | `''` | 空内容时显示的占位文本(WinUI `PlaceholderText`) |
| `clearButtonEnabled` | `boolean` | `true` | 是否启用清除按钮;聚焦且有内容期间显示(WinUI 1.4+ 的 `ClearButtonEnabled` 行为) |
| `isReadOnly` | `boolean` | `false` | 只读;内容不可编辑但可选择复制(WinUI `IsReadOnly`) |
| `maxLength` | `number` | `0` | 最大字符数;`0` 表示不限制(WinUI `MaxLength`) |
| `disabled` | `boolean` | `false` | 禁用;走原生 `input` `disabled`,样式对照模板 Disabled 视觉状态 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `textChanged` | `(value: string)` | 文本变化时实时触发(输入、粘贴等);**IME 组合期间不触发**,组合结束提交后触发一次;点击清除按钮清空时也会触发 |

模板中监听写法:`@text-changed="onTextChanged"`。

### IME 组合语义

- `v-model:text` 在组合(拼音/假名预编辑)期间实时更新,与 WinUI 的 `Text` 持续同步一致;
- `textChanged` 按「组合期间静默、组合结束补发一次」实现:组件监听 `compositionstart` / `compositionend`,组合期间丢弃 `textChanged`,结束事件后按当前值补发一次(内部按值去重,兼容 Chrome 与 Safari 的事件顺序差异)。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiTextBox from '@/components/TextBox.vue'

const name = ref('')

function onTextChanged(value: string): void {
  console.log('textChanged:', value)
}
</script>

<template>
  <WuiTextBox
    v-model:text="name"
    header="你的名字:"
    placeholder-text="姓名"
    :max-length="20"
    @text-changed="onTextChanged"
  />
</template>
```

## 与 WinUI 的差异说明

- **颜色 / 字号**:四态颜色全部取自 `theme.css` 的 `--wui-text-control-*` token(含清除按钮的 `--wui-text-control-button-*` 族)。聚焦边框、选区高亮、清除按钮悬停/按压强调色最终落到系统钩子 `--wui-system-accent-color`;该钩子由应用层定义,未定义时回退 `--wui-hyperlink-foreground-theme`。
- **无 token 的结构值**(源 generic.xaml 键,按源值直接使用):`TextControlBorderThemeThickness` = 2px(四周)、`TextControlThemePadding` = 10,3,6,6、`TextControlThemeMinHeight` / `MinWidth` = 32 / 64、`TextBoxTopHeaderMargin` = 0,0,0,4、清除按钮 `MinWidth` = 34、glyph 字号 12px(取同值 token `--wui-tool-tip-content-theme-font-size`)。
- **圆角**:按 WinUI 3 默认 `ControlCornerRadius`(4px)取 4px 圆角(引用 theme-hooks.css 的 `--wui-control-corner-radius`,V3 视觉 QA 打回后修正);应用可在同名变量上按层叠覆盖(如改 0 恢复直角)。
- **聚焦视觉**:`UseSystemFocusVisuals` 默认取 `IsApplicationFocusVisualKindReveal`(默认关闭),焦点指示即模板 Focused 态的强调色边框 + 实底背景,本实现不再叠加系统焦点框(outline)。
- **清除按钮 glyph**:使用 `--wui-symbol-theme-font-family`(Segoe Fluent Icons / Segoe MDL2 Assets)的 U+E10A;按钮以 `tabindex="-1"` + `aria-hidden` 复刻 WinUI `IsTabStop=False` + Raw 自动化视图,点击后焦点送回输入框。
- **清除按钮可见条件**:`clearButtonEnabled && 聚焦 && 有内容`。源模板未在可见条件中排除只读;本实现在 `isReadOnly` 或禁用时不显示清除按钮,避免只读框出现可清空入口。
- **IME 组合**:如上节所述,`textChanged` 在组合期间静默;WinUI 原生 `TextChanged` 在组合期间也会逐次触发,本实现按项目约定收窄。
- **程序化赋值**:父组件直接修改 `v-model:text` 不触发 `textChanged`;WinUI 中程序设置 `Text` 会触发 `TextChanged`。另外,外部(程序化)写入的文本不受 `maxLength` 即时归一(不截断越界旧值),原生 `maxlength` 仅约束用户继续输入——与 WinUI `MaxLength` 仅限制用户输入一致。
- **选区文本色**:`::selection` 仅设置背景 = `TextControlSelectionHighlightColor`(强调色),未强制选中文本颜色(WinUI 聚焦态还会把内容主题强制为 Light,Web 侧不适用)。
- **多行**:`AcceptsReturn` / `TextWrapping` / 拼写检查等多行能力暂未实现,本波次覆盖单行场景(见官方示例的 MultiLine 示例,后续波次扩展)。

---

演示页源码:[demo/pages/TextBoxPage.vue](../../demo/pages/TextBoxPage.vue)
