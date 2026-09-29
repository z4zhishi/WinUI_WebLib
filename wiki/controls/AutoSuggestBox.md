# AutoSuggestBox

> 在线示例:[/#/autosuggestbox](/#/autosuggestbox)

## 概述

AutoSuggestBox 是一个在用户键入时提供候选建议的文本控件:应用会收到「文本已被用户修改」的通知,并负责筛选出相关建议交给它展示。典型的用法是搜索框(键入关键词 → 过滤候选 → Enter 或点击查询按钮提交查询)。它常与 [TextBox](./TextBox.md)(纯输入)和 [ComboBox](./ComboBox.md)(下拉单选)对照使用。

对应 WinUI `Microsoft.UI.Xaml.Controls.AutoSuggestBox`,视觉与交互状态对照 `generic.xaml` 中 `TargetType="AutoSuggestBox"`(L22040 起)与其 `TextBoxStyle`(`AutoSuggestBoxTextBoxStyle`,L21672 起,内含清除按钮 DeleteButton 与查询按钮 QueryButton 两组按钮模板)复刻;颜色全部取自 `theme.css` 预置的 `--wui-text-control-*`(文本框族)、`--wui-text-control-button-*`(按钮族)、`--wui-auto-suggest-box-*`(建议面板)与 `--wui-list-view-item-*`(列表项)token。建议面板基于[弹层公共基建](./_popup-infra.md)(`usePopupLayer` 等宽 `matchAnchorWidth` + light dismiss,嵌套弹层豁免内置),与 [ComboBox](./ComboBox.md)、[MenuFlyout](./MenuFlyout.md) 同底座。

官方文档:

- [AutoSuggestBox - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.autosuggestbox)
- [Auto-suggest box 设计指南](https://learn.microsoft.com/windows/apps/design/controls/auto-suggest-box)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | `''` | 输入框文本(WinUI `Text`),`v-model:text` 双向绑定 |
| `itemsSource` | `unknown[]` | `[]` | 候选数组(WinUI `ItemsSource`);过滤/异步加载由消费侧在 `textChanged` 里完成后写回 |
| `placeholderText` | `string` | `''` | 空内容时显示的占位文本(WinUI `PlaceholderText`) |
| `header` | `string` | `''` | 输入框上方标头文本(WinUI `Header`) |
| `queryIcon` | `SymbolValue \| ''` | `''` | 查询按钮图标(WinUI `QueryIcon`,Symbol 枚举名,如 `'Find'`);缺省或禁用时不渲染查询按钮 |
| `displayMemberPath` | `string` | `''` | 对象项的显示字段路径(WinUI `DisplayMemberPath`),如 `'name'`;缺省按 `String(item)` 渲染——对象候选建议显式配置,否则点击建议会把 `[object Object]` 回写输入框 |
| `updateTextOnSelect` | `boolean` | `true` | 点击建议时是否把建议文本回写输入框(WinUI `UpdateTextOnSelect`) |
| `maxSuggestionListHeight` | `number` | `374` | 建议面板最大高度 px(WinUI `MaxSuggestionListHeight`,超出内部滚动) |
| `noResultsText` | `string` | `'No results found'` | 候选为空时「无结果」行的默认文案;`#noResultsFound` 槽可整体替换 |
| `clearButtonEnabled` | `boolean` | `true` | 是否启用清除按钮;有内容时显示 |
| `isSuggestionListOpen` | `boolean` | `false` | 建议面板开关(WinUI `IsSuggestionListOpen`),`v-model:is-suggestion-list-open` 双向绑定 |
| `disabled` | `boolean` | `false` | 禁用态,样式对照模板 Disabled 视觉状态 |
| `#item` slot | `{ item: unknown; index: number }` | — | 自定义建议项模板(WinUI `ItemTemplate` 的等价物);缺省渲染显示文本 |
| `#noResultsFound` slot | — | — | 候选为空时的「无结果」行内容;缺省渲染 `noResultsText` |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `textChanged` | `(value: string, reason: 'userInput' \| 'programmaticChange' \| 'suggestionChosen')` | 文本变化时(WinUI `TextChanged`);`reason` 对应 `AutoSuggestionBoxTextChangeReason`。消费侧过滤建议时**只应响应 `userInput`**——键盘预览(`suggestionChosen`)与程序化赋值(`programmaticChange`)引起的变化不应再触发一轮过滤 |
| `suggestionChosen` | `(item: unknown, index: number)` | ↑↓ 键盘高亮移动到候选项,或候选被点击选中时(WinUI `SuggestionChosen`) |
| `querySubmitted` | `(args: { queryText: string; results: unknown[] })` | 用户提交查询时(WinUI `QuerySubmitted`):Enter、点击查询按钮、点击建议三条路径统一触发;`results` 为提交时的候选集 |
| `textSubmitted` | `(args: { queryText: string; results: unknown[] })` | `querySubmitted` 的别名(本库任务命名约定),两事件同参同发,按需监听其一即可 |

模板中监听写法:`@text-changed` / `@suggestion-chosen` / `@query-submitted`。

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `↓` | 打开候选面板并高亮首项;面板打开时向下移动高亮(到末项停住,不循环——任务约定,WinUI 源码为「经 -1 的循环」,见差异说明) |
| `↑` | 向上移动高亮;在首项再按回到无高亮并恢复已键入文本(`textChanged` 以 `programmaticChange` 原因触发) |
| `Enter` | 有高亮:提交高亮建议;无高亮:提交当前文本;面板随后关闭 |
| `Esc` | 关闭候选面板并恢复已键入文本(撤销预览) |
| `Tab` | 关闭候选面板,焦点自然移动 |
| 输入字符 | 触发 `textChanged(userInput)`;由消费侧过滤并写回 `itemsSource` |

无障碍:输入框为 `role="combobox"`(`aria-expanded` / `aria-controls` / `aria-activedescendant` / `aria-autocomplete="list"`),面板为 `role="listbox"`,候选为 `role="option"`;IME 组合期间方向键/Enter/Esc 让位给输入法,`textChanged` 在组合结束后统一补发一次。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiAutoSuggestBox from '@/components/AutoSuggestBox.vue'

const query = ref('')
const suggestions = ref<unknown[]>([])

const CATS = ['Abyssinian', 'Bengal', 'Birman', 'Sphynx', 'Russian Blue']

// WinUI 契约:过滤由消费侧完成,只响应 userInput,把结果写回 itemsSource
function onTextChanged(value: string, reason: string): void {
  if (reason !== 'userInput') return
  suggestions.value = CATS.filter((cat) =>
    cat.toLowerCase().includes(value.trim().toLowerCase()),
  )
}

function onSuggestionChosen(item: unknown): void {
  console.log('suggestionChosen:', item)
}

// 提交:Enter / 查询按钮 / 点击建议三条路径统一走这里
function onQuerySubmitted(args: { queryText: string; results: unknown[] }): void {
  console.log('querySubmitted:', args.queryText, args.results)
}
</script>

<template>
  <WuiAutoSuggestBox
    v-model:text="query"
    :items-source="suggestions"
    header="Cats"
    placeholder-text="Type a cat breed"
    query-icon="Find"
    @text-changed="onTextChanged"
    @suggestion-chosen="onSuggestionChosen"
    @query-submitted="onQuerySubmitted"
  />
</template>
```

## 与 WinUI 的差异说明

- **颜色 / 字号**:文本框族取 `--wui-text-control-*`、按钮取 `--wui-text-control-button-*`、建议面板取 `--wui-auto-suggest-box-suggestions-list-background / -border`、列表项取 `--wui-list-view-item-*`(默认 `ListViewItem` 样式即 reveal 族),浅 / 深主题随 `data-theme` 切换;聚焦态为实底背景 + 强调色边框(与 [TextBox](./TextBox.md) 同源),不叠加系统焦点框。
- **无 token 的结构值**(源 generic.xaml 键,按源值直接使用):边框 `TextControlBorderThemeThickness` = 2px、`MinHeight` 32 / `MinWidth` 64、内容 `Padding` = 10,3,6,6、标头 `AutoSuggestBoxTopHeaderMargin` = 0,0,0,4、按钮 `MinWidth` 34、按钮图标字号 `AutoSuggestBoxIconFontSize` = 12(token `--wui-auto-suggest-box-icon-font-size`)、清除按钮 glyph `U+E10A`、面板 `AutoSuggestListMaxHeight` = 374、面板列表外边距 `AutoSuggestListMargin` = 0,2,0,2、列表项 `Padding` = 12,0,12,0 与 `MinHeight` 40(`ListViewItemMinHeight`)。
- **清除按钮可见性**:源模板的 `ButtonVisible` 状态在 WinUI 里还叠加「聚焦中」门控(1.4+ TextBox 行为);本实现按任务约定做成**有内容即显示**(`clearButtonEnabled && !disabled && text 非空`),点击清除后当帧消失。查询按钮在 disabled 时按源 Disabled 态 `Opacity=0` 语义直接不渲染;无图标时按 `Width={TemplateBinding Height}`(未设高度时为 Auto)折叠为 0 宽,等价为不渲染该按钮。
- **NoResults 行**:WinUI 无内建「无结果」呈现(官方示例是向 `ItemsSource` 里塞一条 "No results found" 占位项);本实现按任务要求内建:面板打开且候选为空时显示不可选中的「无结果」行(`noResultsText` / `#noResultsFound` 槽),属 Web 增强。
- **建议面板圆角与阴影**:WinUI 弹层圆角取 `OverlayCornerRadius`(8px)、阴影由合成器 ThemeShadow 实现、XAML 无画刷 token;本实现使用弹层基建的 `--wui-popup-corner-radius` / `--wui-popup-shadow`(双层 box-shadow 视觉近似),见 [_popup-infra](./_popup-infra.md) 差异节。源主题字典中面板背景存在 Acrylic(`AcrylicBackgroundFillColorDefaultBrush`)与纯色(`SystemControlTransientBackgroundBrush`)两档,`theme.css` 依默认字典取纯色档(`#f2f2f2` / `#2b2b2b`)。源 `AutoSuggestListPadding` = -1,0,-1,0 的负内边距(候选项背景压过面板边框 1px)未复刻,项背景止于边框内沿。
- **过滤职责**:与 WinUI 一致——组件自身不过滤,`itemsSource` 就是「当前应展示的候选」;消费侧在 `textChanged(userInput)` 里过滤后写回。组件内置行为:用户输入非空时打开面板(候选为空则显示 NoResults 行),文本清空时收起面板。
- **键盘预览与恢复**:↑↓ 移动高亮时高亮建议文本临时回显输入框(`textChanged` 以 `suggestionChosen` 原因触发),任务要求预览无条件生效——WinUI 实现级源码(`AutoSuggestBox_Partial.cpp` L2364-2382)中该回显同样受 `UpdateTextOnSelect` 门控(为真才回显),此处与源码存在差异。恢复路径(↑ 过顶 / Esc / Tab / 外点关闭)把文本恢复为已键入内容,以 `programmaticChange` 原因触发 `textChanged`——对齐 WinUI 源码(L1101 / L1109 / L1137 统一 `ProgrammaticChange`)。`updateTextOnSelect=false` 只约束**点击**建议的文本回写,键盘预览与键盘提交不受它影响。
- **键盘导航不循环**:本实现到末 / 首项停住(任务约定);WinUI 源码实为「经 -1 的循环」——↓ 在末项回到 -1 并恢复键入文本、↑ 在无高亮时跳到末项(`AutoSuggestBox_Partial.cpp` L1085-1096)。
- **鼠标悬停**:仅显示 CSS 底色,不移高亮、不预览、不触发 `suggestionChosen`(对齐 WinUI 源码:`SuggestionChosen` 仅键盘导航与点击时触发)。
- **LightDismissOverlayMode**:WinUI 支持 `LightDismissOverlay`(面板外加半透明遮罩,token 已预留 `--wui-auto-suggest-box-light-dismiss-overlay-background`);本实现未启用遮罩,仅外点即关,与 ComboBox 下拉一致。
- **打开/关闭动画**:源为主题动画;本实现以 `wui-flyout-in`(上滑淡入)/ `wui-fade-out` 近似,时长/缓动取 `animations.css` token。
- **事件命名**:`querySubmitted` 为 WinUI `QuerySubmitted` 的对应名,事件参数把 `QuerySubmittedEventArgs` 摊平为 `{ queryText, results }`;另按任务命名约定同发 `textSubmitted` 别名(两者参数相同,勿重复监听)。
- **列表虚拟化**:源 `SuggestionsList` 为 ListView(带虚拟化);本实现为普通 DOM 渲染,超长候选(数千条)建议在消费侧截断(如取前 20 条)。
- **`Text` 程序化赋值**:消费侧直写 `v-model:text` 会以 `programmaticChange` 原因触发 `textChanged`(对齐 WinUI `Text` 属性变更回调);组件内部回写(预览/选中)按签名去重,不会重复触发。

---

演示页源码:[demo/pages/AutoSuggestBoxPage.vue](../../demo/pages/AutoSuggestBoxPage.vue)
