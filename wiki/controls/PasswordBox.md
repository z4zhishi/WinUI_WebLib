# PasswordBox

> 在线示例:[/#/passwordbox](/#/passwordbox)

## 概述

使用 PasswordBox 让用户在应用中输入单行不换行的密码等敏感文本。输入内容以掩码显示,可以通过揭示模式(PasswordRevealMode)控制临时或持久明文,并可通过最大长度(MaxLength)限制可输入的字符数。

对应 WinUI `Microsoft.UI.Xaml.Controls.PasswordBox`,视觉与交互状态(Normal / PointerOver / Focused / Disabled、揭示按钮显隐)对照 `generic.xaml` 中 `TargetType="PasswordBox"` 的默认样式与模板复刻,与同族的 [TextBox](./TextBox.md) 共用同一套 `--wui-text-control-*` 视觉 token。

官方文档:

- [PasswordBox - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.passwordbox)
- [文本控件设计指南](https://learn.microsoft.com/windows/apps/design/controls/text-controls)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `password` | `string` | `''` | 密码值,支持 `v-model:password` 双向绑定(WinUI `Password`) |
| `header` | `string` | `''` | 输入框上方的标头文本(WinUI `Header`) |
| `placeholderText` | `string` | `''` | 空内容时显示的占位文本(WinUI `PlaceholderText`) |
| `passwordRevealMode` | `'Hidden' \| 'Visible' \| 'Peek'` | `'Peek'` | 揭示模式(WinUI `PasswordRevealMode`):`Peek` 聚焦且有内容期间显示揭示按钮,按住临时明文、松开恢复掩码;`Visible` 始终明文(无按钮);`Hidden` 始终掩码(无按钮) |
| `maxLength` | `number` | `0` | 最大字符数;`0` 表示不限制(WinUI `MaxLength`) |
| `autocomplete` | `string` | `'new-password'` | 透传原生 `autocomplete`;注册场景建议 `new-password`,登录场景建议 `current-password` |
| `disabled` | `boolean` | `false` | 禁用;走原生 `input` `disabled`,样式对照模板 Disabled 视觉状态 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `passwordChanged` | `(value: string)` | 密码变化时实时触发(输入、粘贴等);**IME 组合期间不触发**,组合结束提交后触发一次 |

模板中监听写法:`@password-changed="onPasswordChanged"`。

### IME 组合语义

- `v-model:password` 在组合(拼音/假名预编辑)期间实时更新,与 WinUI 的 `Password` 持续同步一致;
- `passwordChanged` 按「组合期间静默、组合结束补发一次」实现:组件监听 `compositionstart` / `compositionend`,组合期间丢弃 `passwordChanged`,结束事件后按当前值补发一次(内部按值去重,兼容 Chrome 与 Safari 的事件顺序差异)。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiPasswordBox from '@/components/PasswordBox.vue'

const pwd = ref('')

function onPasswordChanged(value: string): void {
  console.log('passwordChanged, length =', value.length)
}
</script>

<template>
  <WuiPasswordBox
    v-model:password="pwd"
    header="密码:"
    placeholder-text="输入密码"
    password-reveal-mode="Peek"
    :max-length="20"
    @password-changed="onPasswordChanged"
  />
</template>
```

## 安全约定

- 输入框为原生 `type="password"`;揭示切换**只切换 `type`(`password` ↔ `text`),不改动值**,也不把明文写入任何 aria 标签;
- `autocomplete` 默认透传 `new-password`,抑制浏览器把演示输入误当登录表单而弹出保存提示;按场景可改为 `current-password`;
- 揭示按钮以 `tabindex="-1"` + `aria-hidden` 复刻 WinUI `IsTabStop=False`(揭示为按住即看的手势型操作,WinUI 同样不提供键盘路径);原生 `type="password"` 输入框本身对读屏器已表达"密码输入"语义。

## 与 WinUI 的差异说明

- **颜色 / 字号**:四态颜色全部取自 `theme.css` 的 `--wui-text-control-*` token(含揭示按钮的 `--wui-text-control-button-*` 族,与 TextBox 清除按钮同族)。聚焦边框、选区高亮、揭示按钮按压强调色最终落到系统钩子 `--wui-system-accent-color`;该钩子由应用层定义,未定义时回退 `--wui-hyperlink-foreground-theme`。
- **无 token 的结构值**(源 generic.xaml 键,按源值直接使用):`TextControlBorderThemeThickness` = 2px(四周)、`TextControlThemePadding` = 10,3,6,6、`TextControlThemeMinHeight` / `MinWidth` = 32 / 64、`PasswordBoxTopHeaderMargin` = 0,0,0,4、揭示按钮 `MinWidth` = 34、glyph 字号 12px(取同值 token `--wui-tool-tip-content-theme-font-size`)。
- **圆角**:按 WinUI 3 默认 `ControlCornerRadius`(4px)取 4px 圆角(引用 theme-hooks.css 的 `--wui-control-corner-radius`,与 TextBox 同款,V3 视觉 QA 打回后修正);应用可在同名变量上按层叠覆盖(如改 0 恢复直角)。
- **聚焦视觉**:`UseSystemFocusVisuals` 默认关闭,焦点指示即模板 Focused 态的强调色边框 + 实底背景,本实现不再叠加系统焦点框(outline)。
- **掩码字符**:`PasswordChar`(自定义掩码字符,如 `#`)未实现,掩码跟随浏览器 `type="password"` 的原生气泡掩码;如需固定掩码字符需后续波次扩展。
- **揭示按钮 glyph**:使用 `--wui-symbol-theme-font-family`(Segoe Fluent Icons / Segoe MDL2 Assets)的 U+E052(RedEye);源模板的 ButtonLayoutGrid 带 `BorderThickness = 2` 边框,但 `TextControlButtonBorderBrush` 默认透明,视觉上不可见,本实现直接省略该边框(与已过 QA 的 TextBox 清除按钮一致)。
- **揭示按钮可见条件**:仅 `passwordRevealMode === 'Peek'` 且聚焦且有内容期间显示;`Visible` / `Hidden` 模式按钮恒折叠(与源模板 ButtonStates 一致)。源模板 Disabled 态把按钮 Opacity 压到 0,本实现在禁用时不渲染按钮,语义等价。
- **Peek 的触发方式**:按住鼠标(mousedown → mouseup)期间临时明文,焦点离开立即恢复掩码;触屏长按可能唤起系统手势菜单,长按体验在触屏上未优化。
- **Description / 输入验证(ErrorTemplate)**:WinUI 模板中的 DescriptionPresenter 与 InputValidation 相关视觉状态暂未实现。
- **IME 组合**:如上节所述,`passwordChanged` 在组合期间静默;WinUI 原生 `PasswordChanged` 在组合期间也会逐次触发,本实现按项目约定收窄。
- **程序化赋值**:父组件直接修改 `v-model:password` 不触发 `passwordChanged`;WinUI 中程序设置 `Password` 会触发 `PasswordChanged`。另外,外部写入的密码不受 `maxLength` 即时归一(不截断越界旧值),原生 `maxlength` 仅约束用户继续输入。
- **选区文本色**:`::selection` 仅设置背景 = `TextControlSelectionHighlightColor`(强调色),未强制选中文本颜色。

---

演示页源码:[demo/pages/PasswordBoxPage.vue](../../demo/pages/PasswordBoxPage.vue)
