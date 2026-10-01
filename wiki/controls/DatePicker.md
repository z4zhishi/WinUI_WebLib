# DatePicker

> 在线示例:[/#/datepicker](/#/datepicker)

## 概述

需要用户在应用里设置一个日期时使用 DatePicker,例如预约时间。DatePicker 显示月、日、年三列选择器,方便触摸或鼠标操作,并且可以通过多种方式进行样式设置和配置。与 CalendarDatePicker 的区别:CalendarDatePicker 收起为一个按钮、点击弹出日历浮层;DatePicker 是紧凑的 inline 多列选择(本实现为常驻 inline 三列滚轮,非日历弹层)。

对应 WinUI `Microsoft.UI.Xaml.Controls.DatePicker`,视觉对照 `generic.xaml` 中 `TargetType="DatePicker"`(L8668 起,标头/空值态/分割线/禁用各色)与 `TargetType="DatePickerFlyoutPresenter"`(L12801 起,三列宿主:列宽 78\*/132\*/78\*、2px 分割线、40px 高亮带、项高 40)复刻;三列的滚轮形态取自 LoopingSelector 资源(L857 起:项前景/选中前景/按钮底色)。颜色全部取自 `theme.css` 预置的 `--wui-date-picker-*` / `--wui-looping-selector-*` / `--wui-text-control-placeholder-foreground` token。

官方文档:

- [DatePicker - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.datepicker)
- [Date picker 设计指南](https://learn.microsoft.com/windows/apps/design/controls/date-picker)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `date` | `Date \| null` | `null` | 选中日期(WinUI `Date`),`v-model:date` 双向绑定;`null` 为未选择 |
| `header` | `string` | `''` | 选择器上方标头文本(WinUI `Header`),为空时不渲染 |
| `yearVisible` | `boolean` | `true` | 是否显示年列(WinUI `YearVisible`) |
| `dayVisible` | `boolean` | `true` | 是否显示日列(WinUI `DayVisible`) |
| `monthVisible` | `boolean` | `true` | 是否显示月列(WinUI `MonthVisible`) |
| `minYear` | `number` | `1900` | 年列最小年份(WinUI `MinYear`,按年粒度约束) |
| `maxYear` | `number` | `2128` | 年列最大年份(WinUI `MaxYear`) |
| `monthFormat` | `string` | `'{month.full}'` | 月列显示格式(WinUI `MonthFormat`) |
| `dayFormat` | `string` | `'{day.integer}'` | 日列显示格式(WinUI `DayFormat`) |
| `yearFormat` | `string` | `'{year.full}'` | 年列显示格式(WinUI `YearFormat`) |
| `placeholderDate` | `Date` | `new Date()` | 空值态(`date` 为 `null`)时三列显示的占位日期,年份收敛进 min/max 区间 |
| `disabled` | `boolean` | `false` | 禁用态,样式对照模板 Disabled 视觉状态 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

支持的格式模板(WinUI 日期格式模板子集):

| 列 | 模板 | 示例 |
| --- | --- | --- |
| 月 | `{month.full}` / `{month.abbreviated}` / `{month.numeric}` / `{month.integer}` / `{month.integer(2)}` | January / Jan / 1 / 1 / 01 |
| 日 | `{day.integer}` / `{day.integer(2)}`;可组合 `{dayofweek.abbreviated}` / `{dayofweek.full}` | `7`、`07`、`7 (周三)` |
| 年 | `{year.full}` / `{year.abbreviated}` | 2026 / 26 |

月份/星期名跟随浏览器语言(`Intl` 缺省 locale);未识别的模板段原样保留。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `dateChanged` | `(newDate: Date \| null, oldDate: Date \| null)` | 选中日期变化时(滚轮/箭头/拖拽/点击列项/程序化赋值均触发;程序化赋值越界时先收敛为钳制值再触发一次) |
| `update:date` | `(value: Date \| null)` | `v-model:date` 双向绑定更新时 |

模板中监听写法:`@date-changed="onDateChanged"`。

## 交互

| 操作 | 作用 |
| --- | --- |
| 鼠标滚轮(列上) | 按 40px 一档逐项步进,累积平滑 |
| 点击列上/下箭头 | 该列步进一项(对照 LoopingSelector 展开钮,E76B/E76C glyph) |
| 按住上下拖拽 | 列条目跟手滚动,松手吸附最近项(触摸同等,指针捕获) |
| 点击列项 | 直接选中该项 |
| ↑ / ↓ | 聚焦列步进一项 |
| PageUp / PageDown | 聚焦列步进 5 项 |
| Home / End | 聚焦列跳到首 / 末项 |
| Tab | 在月/日/年三列间移动焦点(每列为可聚焦 `listbox`) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiDatePicker from '@/components/DatePicker.vue'

const date = ref<Date | null>(null)

function onDateChanged(newDate: Date | null, oldDate: Date | null): void {
  console.log('dateChanged:', oldDate, '→', newDate)
}
</script>

<template>
  <!-- 基础:标头 + 默认三列(占位日期 = 今天) -->
  <WuiDatePicker v-model:date="date" header="Pick a date" @date-changed="onDateChanged" />

  <!-- 年区间约束:今年起 5 年内 -->
  <WuiDatePicker v-model:date="date" :min-year="2026" :max-year="2031" />

  <!-- 隐藏年列 + 日格式带星期缩写(官方示例组合) -->
  <WuiDatePicker v-model:date="date" day-format="{day.integer}" :year-visible="false" />
</template>
```

## 与 WinUI 的差异说明

- **形态**:WinUI DatePicker 默认是「收起按钮(2px 描边,三段文本)→ 点击弹出三列飞出层」;本实现按任务规格做成**常驻 inline 三列滚轮选择器**,外层面板取飞出层形态(`DatePickerFlyoutPresenterBackground`/`Border` 1px + 8px 弹层圆角),`--wui-date-picker-button-*`(收起按钮)token 未使用。
- **列序**:源模板静态列序为 日 | 月 | 年(`DayColumn`/`MonthColumn`/`YearColumn`),运行时按区域文化重排(如 en-US 显示为 月/日/年);本实现按任务规格固定为 月/日/年。
- **颜色 / 字号**:全部取自 `theme.css` 的 `--wui-date-picker-*`(标头/分割线/禁用)、`--wui-date-picker-flyout-presenter-*`(面板底色/描边/分割线/高亮带)与 `--wui-looping-selector-*`(项前景/选中/悬停/按压/按钮底色)token,浅 / 深主题随 `data-theme` 切换;空值态文字取 `--wui-text-control-placeholder-foreground`(源 HasNoDate 态)。
- **无 token 的结构值**(源 generic.xaml 键,按源值直接使用):三列宽比 78\*/132\*/78\*(日/月/年)、分割线宽 2px、项高与高亮带高 40px(`DatePickerFlyoutPresenterItemHeight`/`HighlightHeight`;条目 `box-sizing: border-box`,内边距计入 40px 行高盒,对齐源项高语义)、项内边距 0,3,0,6(月列 9,3,0,6)、可见行数 3(源弹层约 4-5 行,取 3 行贴合 inline 高度)、面板圆角 8px(源 `OverlayCornerRadius`,theme.css 无同名 token,取弹层基建的 `--wui-popup-corner-radius`)。面板宽度:下限 296 取源 `DatePickerFlyoutPresenter` 的 `Width`/`MinWidth`;上限 456 为**借用**收起按钮的 `DatePickerThemeMaxWidth`(源飞出层为固定 296 宽、并无 456 约束,此为 inline 形态的适配选择)。
- **上下箭头按钮**:源 LoopingSelector 的展开钮在 generic.xaml 无模板与尺寸 token;本实现取常驻 20px 高按钮 + `--wui-looping-selector-button-background` 底色 + Segoe Fluent chevron 码点 **`E76B`(上)/ `E76C`(下)**(ChevronUp/Down 现代码点;V6 视觉 QA 核对早先码点在 MS 字形表中为 ChevronLeft/Right,语义错位,统一改用现码点),作为滚轮/拖拽之外的可点步进入口(WinUI 原生无滚轮,此为 web 增强)。
- **列不循环**:源 LoopingSelector 到首/末项后无限回绕;本实现为有界列表,到边界停住(再向下不动)。
- **MinYear / MaxYear**:WinUI 为 `DateTimeOffset`;web 版收窄为 `number` 年份,按年粒度约束年列(与源「约束年列、日/月不受限」的语义一致);区间收窄挤出当前选中年份时自动收敛。
- **日按年月联动**:日列项数随年月变化(28–31,闰年 2/29);改月/年导致日越界时自动收敛(如 1/31 → 2/28),与 WinUI 行为一致。
- **空值态**:`date` 为 `null` 时三列显示占位日期(`placeholderDate`,缺省今天)并套用占位前景色(源 HasNoDate 态);WinUI 弹层用 Accept 按钮提交,inline 形态无 Accept,操作任一列即提交真实日期。
- **Header**:仅支持字符串(WinUI `Header` 可为任意内容);源 `DatePickerTopHeaderMargin` 0,0,0,4。
- **格式模板**:支持上表所列子集;月份/星期名走 `Intl.DateTimeFormat`(跟随浏览器语言,WinUI 跟随应用语言);`{dayofweek.*}` 按当前选中年月日计算,月/年变化时日列标签随之更新。
- **事件参数**:WinUI `DateChanged`(`DateChangedEventArgs.NewDate/OldDate`)摊平为 `(newDate, oldDate)`;与 WinUI 一致,程序化赋值(v-model)同样触发——交互写回与 v-model 赋值经内部标记去重,一次变更只发一次事件;程序化赋值越界(年份不在 min/max 区间、日溢出当月)时先收敛为钳制值再触发一次(源 MinYear/MaxYear 约束行为)。
- **日期值**:提交的 `Date` 以本地时区当日 12:00 构造(规避 DST 与 UTC 日界偏移),新旧值比较按年/月/日三元组而非对象引用。

---

演示页源码:[demo/pages/DatePickerPage.vue](../../demo/pages/DatePickerPage.vue)
