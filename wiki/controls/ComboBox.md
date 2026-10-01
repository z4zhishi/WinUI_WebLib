# ComboBox

> 在线示例:[/#/combobox](/#/combobox)

## 概述

当需要节省屏幕空间、且用户一次只选择一个选项时使用 ComboBox。ComboBox 只显示当前选中项,点击后展开下拉列表供选择;还可以进入可编辑模式(IsEditable),在输入的同时过滤候选列表。

对应 WinUI `Microsoft.UI.Xaml.Controls.ComboBox`,视觉与交互状态(关闭态 Normal / PointerOver / Pressed / Disabled / 聚焦铺底、下拉面板、列表项 hover/selected 各态、可编辑模式箭头区四态)对照 `generic.xaml` 中 `TargetType="ComboBox"`(L8885 起)与 `ComboBoxItemRevealStyle`(L17933 起,默认项样式即基于它)复刻;颜色全部取自 `theme.css` 预置的 `--wui-combo-box-*` / `--wui-combo-box-item-reveal-*` token。下拉面板基于[弹层公共基建](./_popup-infra.md)(`usePopupLayer` 等宽 + light dismiss,嵌套弹层豁免内置),与 [MenuFlyout](./MenuFlyout.md)、[Flyout](./Flyout.md) 同底座。

官方文档:

- [ComboBox - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.combobox)
- [ComboBoxItem - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.comboboxitem)
- [Combo box 设计指南](https://learn.microsoft.com/windows/apps/design/controls/combo-box)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `items` | `unknown[]` | `[]` | 数据源数组(WinUI `ItemsSource`);元素可为字符串、数字或对象 |
| `selectedItem` | `unknown` | `null` | 选中项(WinUI `SelectedItem`),`v-model:selected-item` 双向绑定;首次同步前内部值为 `undefined`,与「未选」语义等价 |
| `selectedIndex` | `number` | `-1` | 选中项索引(WinUI `SelectedIndex`,未选为 -1),`v-model:selected-index` 双向绑定 |
| `isDropDownOpen` | `boolean` | `false` | 下拉开关(WinUI `IsDropDownOpen`),`v-model:is-drop-down-open` 双向绑定 |
| `text` | `string` | `''` | 可编辑模式下的文本(WinUI `ComboBox.Text`),`v-model:text` 双向绑定 |
| `header` | `string` | `''` | 输入框上方标头文本(WinUI `Header`) |
| `placeholderText` | `string` | `''` | 未选中时显示的占位文本(WinUI `PlaceholderText`) |
| `isEditable` | `boolean` | `false` | 可编辑过滤模式(WinUI `IsEditable`):显示文本输入框,输入即过滤下拉列表;Enter 命中过滤结果则选中,未命中则提交自由文本 |
| `displayMemberPath` | `string` | `''` | 对象项的显示字段路径(WinUI `DisplayMemberPath`),如 `'name'`;缺省按 `String(item)` 渲染 |
| `maxDropDownHeight` | `number` | `504` | 下拉面板最大高度 px(WinUI `MaxDropDownHeight`) |
| `disabled` | `boolean` | `false` | 禁用态,样式对照模板 Disabled 视觉状态 |
| `#item` slot | `{ item: unknown; index: number }` | — | 自定义项模板(WinUI `ItemTemplate` 的等价物);缺省渲染显示文本 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectionChanged` | `(selectedIndex: number, selectedItem: unknown)` | 选中项变化时(点击列表项、键盘选择、程序化赋值均触发;未选为 `-1` / `null`) |
| `textChanged` | `(value: string)` | 可编辑文本变化时(输入即触发) |
| `dropDownOpened` | — | 下拉面板打开并完成首次定位后(WinUI `DropDownOpened`) |
| `dropDownClosed` | — | 下拉面板关闭后(WinUI `DropDownClosed`) |

模板中监听写法:`@selection-changed="onSelectionChanged"`。

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `Enter` / `Space` / `↓` / `↑` | 关闭态:打开下拉(高亮当前选中项,无选中则首项) |
| `↓` / `↑` | 打开态:在列表项间循环移动 |
| `Home` / `End` | 打开态:移动到首 / 末项(可编辑模式让位给文本插入符) |
| `Enter` / `Space` | 打开态:选中当前高亮项并收起 |
| `Esc` | 关闭下拉;可编辑模式同时撤销未提交输入(回退到选中项文本) |
| `Tab` | 关闭下拉,焦点自然移动 |
| 字符键(type-ahead) | 首字母跳转:从当前项之后循环匹配「以输入串开头」的项;关闭态命中即改选中,打开态只移动键盘高亮、Enter/Space 才提交;1 秒内连续输入合并成串 |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiComboBox from '@/components/ComboBox.vue'

const colors = ['Blue', 'Green', 'Red', 'Yellow']
const color = ref('Green')

interface FontItem {
  name: string
  family: string
}
const fonts: FontItem[] = [
  { name: 'Cambria', family: 'Cambria' },
  { name: 'Consolas', family: 'Consolas' },
]
const fontSize = ref(14)

function onSelectionChanged(index: number, item: unknown): void {
  console.log('selectionChanged:', index, item)
}
</script>

<template>
  <!-- 字符串数组 + 双向绑定选中项 -->
  <WuiComboBox
    v-model:selected-item="color"
    :items="colors"
    header="Colors"
    placeholder-text="Pick a color"
    @selection-changed="onSelectionChanged"
  />

  <!-- 对象数组:displayMemberPath 指定显示字段 -->
  <WuiComboBox :items="fonts" display-member-path="name" header="Font" />

  <!-- 可编辑过滤模式 -->
  <WuiComboBox v-model:text="fontSize" :items="[8, 10, 12, 14, 16]" is-editable header="Font Size" />
</template>
```

## 与 WinUI 的差异说明

- **颜色 / 字号**:全部取自 `theme.css` 的 `--wui-combo-box-*`(控件与下拉面板)与 `--wui-combo-box-item-reveal-*`(列表项,默认项样式 `ComboBoxItemRevealStyle` 即 reveal 族)token,浅 / 深主题随 `data-theme` 切换。聚焦态为 `ComboBoxBackgroundUnfocused`(强调色低透明度铺底)+ 透明边框(源 Focused storyboard),不叠加系统焦点框。
- **无 token 的结构值**(源 generic.xaml 键,按源值直接使用):`ComboBoxBorderThemeThickness` = 2px、控件 `Padding` = 12,5,0,7、`ComboBoxThemeMinWidth` = 64、`ComboBoxPopupThemeMinWidth` = 80、`MaxDropDownHeight` = 504、`ComboBoxDropdownBorderThickness` = 1px、`ComboBoxDropdownContentMargin` = 0,4,0,4、`ComboBoxItemRevealThemePadding` = 10,4,10,7(项内边距)、项边框 `ComboBoxItemRevealBorderThemeThickness` = 1px、箭头 glyph `U+E0E5` 字号 12px(取同值 token `--wui-tool-tip-content-theme-font-size`)、可编辑 `EditableText` 内边距 10,3,30,5、`DropDownOverlay` 宽 30 / Margin 0,2,2,2(聚焦态 0,3,2,2)。
- **下拉面板圆角与阴影**:WinUI 弹层圆角取 `OverlayCornerRadius`(8px)、阴影由合成器 ThemeShadow 实现、XAML 无画刷 token;本实现使用弹层基建的 `--wui-popup-corner-radius` / `--wui-popup-shadow`(双层 box-shadow 视觉近似),见 [_popup-infra](./_popup-infra.md) 差异节。
- **下拉边框色**:`ComboBoxDropDownBorderBrush` = `SystemControlTransientBorderBrush`,源里存在两档不透明度(0.36 / 0.14,分属不同主题字典),`theme.css` 依默认字典取 0.14(`#00000024`)。
- **Reveal 光效**:`SystemControl*RevealBackgroundBrush` 的指针光晕(reveal halo)无法用纯 CSS 画刷复刻,列表项各态取其纯色回退层(flat fill),与 Win11 无 reveal 效果时的呈现一致。
- **打开 / 关闭动画**:源用 `SplitOpenThemeAnimation` / `SplitCloseThemeAnimation`(generic.xaml L9047-9060,OpenedTarget=PopupBorder、ClosedTarget=ContentPresenter);本实现按源参数复刻(关键帧 `wui-combo-split-open` / `wui-combo-split-close` / `wui-combo-face-dim` / `wui-combo-face-restore`,见 `animations.css`):开为面板自顶部锚点向下裁切展开 250ms `cubic-bezier(0,0,0,1)`(`s_OpenDuration` + `ControlFastOutSlowInKeySpline`),等价源 clip scaleY 0.5→1、clip 原点贴顶缘(ThemeAnimations.cpp L598-604/L679);**弹层本体不淡入**(源 L690 "be fully opaque");同时按钮面内容 83ms 线性压暗至 0.5(`s_OpacityChangeDuration`)并在打开期间保持(VSM storyboard HoldEnd)。关为面板向顶部收拢 167ms 同曲线(`s_CloseDuration`,closedRatio 0.15)+ **末 83ms** 线性淡出(opacity 自 `s_OpacityChangeBeginTime` = 167−83ms 起),按钮面内容 0 → 末 83ms 线性淡回 1(L861-871)。残余差异:源裁切矩形以 `OpenedLength` 内部基准(OS TransitionTarget)计算、仓库无其几何实现,Web 以 `clip-path: inset(0 0 100% 0)→inset(0)` 从完全隐藏开始揭示(审计修复方向同款),首半程可见高度的分布可能与源有细微出入;可编辑模式的 `ContentPresenter` 为 TextBox 所代,面压暗仅作用于非可编辑内容区。
- **列表虚拟化**:源 ItemsPanel 为 `CarouselPanel`(按需虚拟化);本实现为普通 DOM 渲染,超长列表(数千项)不建议直接投放。
- **可编辑模式的过滤**:WinUI 原生 `IsEditable` 默认不过滤(输入任意文本后由 `TextSubmitted` 决定接受与否);本实现按需求做成「输入即过滤(不区分大小写包含匹配)+ Enter 命中选中 / 未命中提交自由文本」。若要恢复纯 `TextSubmitted` 行为,可在消费侧忽略过滤结果只取 `textChanged`。
- **打开态 type-ahead**:打开下拉时输入字符只移动键盘高亮,Enter / Space 才提交选中;WinUI 打开态输入会直接改选中。关闭态不受此差异影响(命中即改选中)。
- **程序化打开**:`dropDownOpened` 仅由控件内部打开路径(点击 / 键盘 / 可编辑输入)发出;外部直接写 `v-model:is-drop-down-open = true` 打开时,面板照常定位渲染(定位由弹层基建在层挂载时自算),但不触发 `dropDownOpened`,键盘高亮与滚动定位同步也不执行(保持上次状态或首项)。
- **Home / End 在可编辑模式**:让位给文本插入符移动;仅非可编辑模式承担列表首 / 末跳转。
- **事件参数**:`selectionChanged` 将 WinUI `SelectionChangedEventArgs` 的 AddedItems / RemovedItems 摊平为 `(selectedIndex, selectedItem)` 两个参数。
- **ItemContainerStyle / ItemsPanel / ItemTemplate**:未暴露容器样式与面板属性;自定义项渲染用 `#item` slot 等价替代。
- **选中同步语义**:与 WinUI 一致——程序化赋值 `v-model:selected-index` / `v-model:selected-item` 同样触发 `selectionChanged`;越界索引归一为 `-1`;数据源缩短导致越界时选中重置。`selectedItem` 以引用相等匹配,替换对象内容不会被视为同一项。

---

演示页源码:[demo/pages/ComboBoxPage.vue](../../demo/pages/ComboBoxPage.vue)
