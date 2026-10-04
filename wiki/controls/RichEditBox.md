# RichEditBox

> 在线示例:[/#/richeditbox](/#/richeditbox)

## 概述

使用 RichEditBox 控件让用户输入和编辑包含格式化文本、超链接等富内容的文档。WinUI 默认提供拼写检查,并把 `IsReadOnly` 设为 `true` 可切换为只读。Web 复刻以 `contentEditable` 承载编辑区,文档模型为 HTML 字符串,并提供**工具栏插槽**承载格式化命令(粗体 / 斜体 / 下划线 / 列表 / 对齐 / 字体颜色等);示例页包含与 RichTextBlock 的实时预览联动。

对应 WinUI `Microsoft.UI.Xaml.Controls.RichEditBox`,视觉与交互状态(Normal / PointerOver / Focused / Disabled)按 WinUI 3 生效层 `controls/dev/CommonStyles/RichEditBox_themeresources.xaml` 复刻 —— 它与 TextBox 共用同一套 Fluent 画刷族(`ControlFillColor*` / `TextFillColor*` / `--wui-text-control-elevation-border`),焦点态/清除语义与 [TextBox](./TextBox.md) 家族保持一致;总览见 [_brushes.md](./_brushes.md)。

官方文档:

- [RichEditBox - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.richeditbox)
- [文本控件设计指南](https://learn.microsoft.com/windows/apps/design/controls/text-controls)

## 文档模型选型

**`document` 采用 HTML 字符串**(`v-model:document`),而非结构化对象(段落/行内树)。理由:

- `contentEditable` 天然产出 HTML,`innerHTML` 序列化往返保真,编辑过程中不经过任何转换层;
- 结构化对象(对应 WinUI `ITextDocument` 的段落/Range 模型)需要 HTML↔树的双向转换器:往返中浏览器自动补全的标签(如空段落 `<div><br></div>`)会破坏等价性,选区映射也要额外维护,收益不抵成本;
- HTML 字符串便于与 RichTextBlock 联动展示:示例页把 HTML 经**白名单 DOM 解析**映射为 `richtext/` 子组件渲染(见下文「XSS 安全说明」),而非 `v-html`。

取舍:HTML 字符串绑定的是「展示层结构」,格式细节受浏览器序列化影响(如 Chromium 回车产出 `<div>`,Firefox 产出 `<p>`);需要平台一致的结构时,应在写入端做 normalize(后续可扩展)。

同步行为:

- 组件内部输入(打字 / 工具栏命令 / 粘贴)实时回写 `v-model:document`,且**不会**把刚回写的值灌回 DOM,避免光标与选区重置;
- 外部(程序化)写入 `document` 时整体替换编辑区内容,**不触发** `textChanged`(与 TextBox 家族一致),同时取消防抖窗口中待发的旧值。

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `document` | `string` | `''` | 富文本文档(HTML 字符串),支持 `v-model:document` 双向绑定 |
| `header` | `string` | `''` | 编辑器上方的标头文本(WinUI `Header`) |
| `placeholderText` | `string` | `''` | 空内容时显示的占位文本(WinUI `PlaceholderText`) |
| `isReadOnly` | `boolean` | `false` | 只读;内容不可编辑但可选择复制(WinUI `IsReadOnly`) |
| `spellcheck` | `boolean` | `true` | 拼写检查,绑定 contentEditable 原生 `spellcheck`(WinUI `IsSpellCheckEnabled` 默认同为 true) |
| `clearButtonEnabled` | `boolean` | `true` | 是否启用清除按钮;聚焦且有内容期间显示(家族语义,见差异说明) |
| `textChangedDelay` | `number` | `300` | `textChanged` 防抖毫秒数;`0` 表示立即触发 |
| `disabled` | `boolean` | `false` | 禁用;样式对照模板 Disabled 视觉状态 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素;给根设置固定 `height` 时,编辑区会在内部滚动(对应模板 ContentElement 的 ScrollViewer)。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `textChanged` | `(value: string)` | 文档内容变化时触发,参数为当前 HTML 字符串;默认 300ms 防抖(`textChangedDelay = 0` 立即);**IME 组合期间不触发**,组合结束后触发一次;清除按钮清空时立即触发 |

模板中监听写法:`@text-changed="onTextChanged"`。

## 工具栏插槽

组件不内置工具栏,而是提供作用域插槽 `#toolbar`,由使用方按需组合按钮(官方示例即为「裸编辑器 + 自组按钮」形态):

```vue
<WuiRichEditBox v-model:document="doc">
  <template #toolbar="{ exec, queryState, active }">
    <button :class="{ 'is-active': active.bold }" @click="exec('bold')">粗体</button>
    <button @click="exec('italic')">斜体</button>
    <button @click="exec('underline')">下划线</button>
    <button @click="exec('insertUnorderedList')">项目符号</button>
    <button @click="exec('insertOrderedList')">编号</button>
    <button @click="exec('justifyCenter')">居中</button>
    <button @click="exec('foreColor', '#c42b1c')">红色</button>
    <button @click="exec('removeFormat')">清除格式</button>
  </template>
</WuiRichEditBox>
```

| 槽参数 | 类型 | 说明 |
| --- | --- | --- |
| `exec` | `(commandId: string, value?: string) => void` | 执行富文本命令;只读 / 禁用时不响应,执行后焦点保持在编辑器 |
| `queryState` | `(commandId: string) => boolean` | 查询命令激活态(等价 `document.queryCommandState`) |
| `active` | `Record<string, boolean>` | 跟踪中的命令激活态(见下表),跟随 `selectionchange` 刷新,用于按钮着色 |

`active` 跟踪的命令:`bold` / `italic` / `underline` / `insertUnorderedList` / `insertOrderedList` / `justifyLeft` / `justifyCenter` / `justifyRight`;其余命令可用 `queryState` 自查。

组件同时 `defineExpose` 了 `focus()` / `exec()` / `queryState()`,外部工具栏(不放在插槽里)也可通过模板引用调用。

### execCommand 兼容性记录

命令基于 `document.execCommand`(已标记 Deprecated,但各浏览器为兼容存量编辑器仍完整支持,短期内无移除计划):

| 命令 | Chrome/Edge | Firefox | Safari | 备注 |
| --- | --- | --- | --- | --- |
| `bold` / `italic` / `underline` | ✓ | ✓ | ✓ | 也支持 Ctrl+B/I/U 原生快捷键 |
| `insertUnorderedList` / `insertOrderedList` | ✓ | ✓ | ✓ | |
| `justifyLeft` / `justifyCenter` / `justifyRight` | ✓ | ✓ | ✓ | |
| `foreColor` | ✓ | ✓ | ✓ | Chromium 产出 `<font color="…">`,Firefox 产出 `<span style="color:…">`,消费端需两者都识别 |
| `removeFormat` | ✓ | ✓ | ✓ | 只清除行内格式,不动结构 |
| `createLink` / `unlink` | ✓ | ✓ | ✓ | 未在演示工具栏中提供,`exec('createLink', url)` 即可用 |

注意:工具栏容器在 mousedown **捕获段**阻止了默认行为,使编辑器保持选区(按钮 click 照常触发);若插槽里放入需要真正获得焦点的控件(如输入框),会被此行为挡住 —— 这是刻意的工具栏语义,复杂控件建议放在插槽外。

后续可替换为 Selection API(`window.getSelection()` + `Range.surroundContents` 等)实现,兼容性更可控;`exec` / `queryState` 的函数签名保持不变,替换不影响调用方。

## XSS 安全说明(务必阅读)

`document` 的本质是 **HTML**,组件内部用 `innerHTML` 承载,与 `v-html` 风险等级相同:

- **绝不要**把未消毒的用户输入直接写入 `v-model:document`。`<img onerror=…>`、`<script>`、`javascript:` 链接等都会成为攻击面;
- 持久化(保存到服务端 / localStorage)后再次展示的内容,展示前务必用 [DOMPurify](https://github.com/cure53/DOMPurify) 等 sanitizer 消毒,并配置 allowlist;
- 本项目按约定**未新增依赖**,组件本体不做消毒(与 WinUI 契约对齐:`Document` 是受信内容)。若内容来源不可信,请在写入 model 前自行接入 sanitizer;
- **展示端**不要直接 `v-html`。示例页的预览走的是白名单映射:`DOMParser` 解析后仅保留 `b/strong、i/em、u、a(仅 http/https)、br、font[color]、span[style 子集]` 等安全子集,映射为 `richtext/` 子组件渲染,脚本/样式/事件属性一律剥离,天然不含可执行内容。该映射可作内容展示的参考实现。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiRichEditBox from '@/components/RichEditBox.vue'

const doc = ref('')

function onTextChanged(value: string): void {
  console.log('textChanged:', value)
}
</script>

<template>
  <WuiRichEditBox
    v-model:document="doc"
    header="你的文档:"
    placeholder-text="开始输入富文本…"
    :text-changed-delay="300"
    @text-changed="onTextChanged"
  />
</template>
```

## 与 RichTextBlock 的联动

编辑器产出的 HTML 可在只读场景用 [RichTextBlock](./RichTextBlock.md) 展示:示例页(`demo/pages/RichEditBoxPage.vue`)把 `document` 经上述白名单映射渲染为 `richtext/` 子组件树(段落 / 加粗 / 斜体 / 下划线 / 超链接 / 换行),列表按 WinUI 文档模型无列表元素的现实,降级为带 `•` / `1.` 前缀的段落。两条通路(编辑 ↔ 展示)共享同一套行内格式语义。

## 与 WinUI 的差异说明

- **文档模型**:WinUI 的 `Document` 是 `ITextDocument`(RTF/纯文本流、Selection/Range、字符格式对象),Web 复刻简化为 HTML 字符串(选型理由见上文);`LoadFromStream` / `SaveToStream` / RTF 均不适用。
- **颜色 / 字号**:四态颜色已按 PL6/PL8 重定向到 Fluent 画刷族(Background `--wui-control-fill-color-*`,前景 `--wui-text-fill-color-*`,Normal/PointerOver 边框 `--wui-text-control-elevation-border` 渐变,与 TextBox 共族);聚焦边框、选区高亮、清除按钮强调色最终落到 `--wui-system-accent-color`。
- **无 token 的结构值**(WinUI 3 权威 `controls/dev`,PL7/PL8 更新):`TextControlBorderThemeThickness` = 1(四周,`Common_themeresources.xaml` L10/L24)、`TextControlBorderThemeThicknessFocused` = 1,1,1,2(L11/L25)、`TextControlThemePadding` = 10,5,6,6(L12/L26/L40;legacy `generic.xaml` L175 的 10,3,6,6 已替换)、`TextControlThemeMinHeight` / `MinWidth` = 32 / 64、`RichEditBoxTopHeaderMargin` = 0,0,0,4、清除按钮 `MinWidth` = 34。
- **圆角**:按 WinUI 3 默认 `ControlCornerRadius`(4px)取 4px 圆角(引用 theme-hooks.css 的 `--wui-control-corner-radius`,源模板 BorderElement 为 `CornerRadius="{TemplateBinding CornerRadius}"`,与 TextBox 家族同款;T9 补修批次修正);应用可在同名变量上按层叠覆盖(如改 0 恢复直角)。
- **清除按钮**:WinUI RichEditBox 模板没有 DeleteButton;本实现按任务约定提供与 TextBox 家族一致的清除语义(`clearButtonEnabled`,默认 `true`,可见条件 = 启用 + 聚焦 + 有内容,点击清空并立即触发 `textChanged`),不需要时置 `false`。
- **TextChanged 防抖**:WinUI `TextChanged` 逐次即时触发;Web 复刻按项目约定默认 300ms 防抖(`textChangedDelay` 可调,`0` = 立即),IME 组合期间静默、组合结束补发一次。
- **数学模式**:官方示例的 `SetMathMode` / `SetMathML` / `GetMathML`(RichEditMathMode)依赖 WinUI 富编辑引擎,Web 侧未实现。
- **默认上下文菜单 / SelectionFlyout**:模板默认挂 `TextControlCommandBarContextFlyout`(剪切/复制/粘贴浮动栏),Web 侧使用浏览器原生选择菜单,自定义 flyout 可后续经 Flyout 组件扩展。
- **拼写检查**:WinUI 走引擎词典,Web 侧为浏览器原生 `spellcheck`(`lang` 属性影响词典),划线样式由浏览器决定。

---

演示页源码:[demo/pages/RichEditBoxPage.vue](../../demo/pages/RichEditBoxPage.vue) · Fluent 画刷族:[_brushes.md](./_brushes.md)
