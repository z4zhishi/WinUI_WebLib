# DatePicker

> 在线示例:[/#/datepicker](/#/datepicker)

## 概述

需要用户在应用里设置一个日期时使用 DatePicker,例如预约时间。DatePicker 显示月、日、年三列选择器,方便触摸或鼠标操作,并且可以通过多种方式进行样式设置和配置。与 CalendarDatePicker 的区别:CalendarDatePicker 是文本框 + 日历月视图浮层;DatePicker 的收起态是**单行字段**(「月 | 日 | 年」三段文本 + 2px 描边,MinHeight 32px),点击字段后**自下方弹出三列 LoopingSelector 飞出层**,选中即收起。

对应 WinUI `Microsoft.UI.Xaml.Controls.DatePicker`,视觉对照 `generic.xaml` 中 `TargetType="DatePicker"`(L8668 起:收起字段 `FlyoutButton` 的三段文本 / 2px 描边 / 各态画刷 / 标头 / 空值态 / 分割线 / 禁用各色)与 `TargetType="DatePickerFlyoutPresenter"`(L12801 起:三列宿主 78\*/132\*/78\*、2px 分割线、40px 高亮带、项高 40、41px Accept/Dismiss 行)复刻;飞出层内三列的滚轮形态取自 LoopingSelector 资源(L13102 起:项前景/选中前景/展开钮底色)。颜色全部取自 `theme.css` 预置的 `--wui-date-picker-*` / `--wui-date-picker-button-*` / `--wui-date-time-picker-flyout-button-*` / `--wui-looping-selector-*` / `--wui-text-control-placeholder-foreground` token。

官方文档:

- [DatePicker - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.datepicker)
- [Date picker 设计指南](https://learn.microsoft.com/windows/apps/design/controls/date-picker)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `date` | `Date \| null` | `null` | 选中日期(WinUI `Date`),`v-model:date` 双向绑定;`null` 为未选择 |
| `isOpen` | `boolean` | `false` | 飞出层开关(WinUI `DatePickerFlyout.IsOpen`),`v-model:is-open` 双向绑定;点击字段 / `Enter` / `Space` / `↑` / `↓` 打开 |
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
| `dateChanged` | `(newDate: Date \| null, oldDate: Date \| null)` | 选中日期变化时(飞出层内滚轮/箭头/拖拽/点击列项/程序化赋值均触发;程序化赋值越界时先收敛为钳制值再触发一次) |
| `update:date` | `(value: Date \| null)` | `v-model:date` 双向绑定更新时 |
| `opened` | — | 飞出层已打开(首次定位完成后) |
| `closed` | — | 飞出层已关闭(点选 / 确定 / 取消 / Escape / 点击外部 / Tab) |

模板中监听写法:`@date-changed="onDateChanged"`。

## 交互

| 操作 | 作用 |
| --- | --- |
| 点击收起字段 / `Enter` / `Space` / `↑` / `↓` | 弹出三列选择飞出层(自字段下方展开) |
| 鼠标滚轮(列上) | 按 40px 一档逐项步进,累积平滑 |
| 悬停列后点击上/下箭头 | 该列步进一项(对照 LoopingSelector 展开钮 `E70E`/`E70D`,PointerOver 才显示) |
| 按住上下拖拽 | 列条目跟手滚动,松手吸附最近项(触摸同等,指针捕获) |
| 点击列项 | 选中该项并收起 |
| ↑ / ↓ | 聚焦列步进一项 |
| PageUp / PageDown | 聚焦列步进 5 项 |
| Home / End | 聚焦列跳到首 / 末项 |
| 飞出层内 `Enter` / `Space` | 确认当前项并收起 |
| 飞出层内 `Escape` / 确定(`E8FB`)/ 取消(`E711`)/ 点击外部 / `Tab` | 收起(取消 = 回滚到打开时的值) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiDatePicker from '@/components/DatePicker.vue'

const date = ref<Date | null>(null)
const isOpen = ref(false)

function onDateChanged(newDate: Date | null, oldDate: Date | null): void {
  console.log('dateChanged:', oldDate, '→', newDate)
}
</script>

<template>
  <!-- 基础:标头 + 收起字段(占位日期 = 今天);点击字段弹出三列飞出层 -->
  <WuiDatePicker v-model:date="date" header="Pick a date" @date-changed="onDateChanged" />

  <!-- 受控飞出层(v-model:is-open) -->
  <WuiDatePicker v-model:date="date" v-model:is-open="isOpen" header="Pick a date" />

  <!-- 年区间约束:今年起 5 年内 -->
  <WuiDatePicker v-model:date="date" :min-year="2026" :max-year="2031" />

  <!-- 隐藏年列 + 日格式带星期缩写(官方示例组合) -->
  <WuiDatePicker v-model:date="date" day-format="{day.integer}" :year-visible="false" />
</template>
```

## 与 WinUI 的差异说明

- **形态**:与源一致 —— 收起态为单行字段(2px 描边 + 「月 | 日 | 年」三段文本,MinHeight 32px、MinWidth 296、MaxWidth 456、圆角 4px),点击后经公共弹层基建 `usePopupLayer` 弹出 `DatePickerFlyoutPresenter` 形态的三列飞出层(固定宽 296、1px 描边、8px 圆角、41px Accept/Dismiss 行),点选/确定/取消/Escape/点击外部即收起。`--wui-date-picker-button-*`(收起字段各态)与 `--wui-date-time-picker-flyout-button-*`(Accept/Dismiss 各态)token 现已启用。
- **列序**:源模板静态列序为 日 | 月 | 年(`DayColumn`/`MonthColumn`/`YearColumn`),运行时按区域文化重排(如 en-US 显示为 月/日/年);本实现固定为 **月/日/年**(与官方 en-US 截图一致),收起字段与飞出层两处共用同一列序与列宽比。
- **颜色 / 字号**:全部取自 `theme.css` 的 `--wui-date-picker-*`(标头/分割线/禁用)、`--wui-date-picker-button-*`(收起字段 Normal/PointerOver/Pressed/Focused/Disabled 的背景/描边/前景)、`--wui-date-picker-flyout-presenter-*`(飞出层底色/描边/分割线/高亮带)、`--wui-date-time-picker-flyout-button-*`(Accept/Dismiss 各态)与 `--wui-looping-selector-*`(项前景/选中/悬停/按压/展开钮底色)token,浅 / 深主题随 `data-theme` 切换;空值态三段文字取 `--wui-text-control-placeholder-foreground`(源 HasNoDate 态)。
- **无 token 的结构值**(源 generic.xaml 键,按源值直接使用):收起字段 MinHeight 32(源 XAML MinHeight 含边框,故 `box-sizing: border-box`;QA 曾记 CalendarDatePicker 36px 的同类偏差)、圆角 4px(`ControlCornerRadius`);三列宽比 78\*/132\*/78\*(日/月/年;本实现月列 132\*、日/年列 78\*,对应官方 en-US 列序)、折叠字段与飞出层分隔线均宽 2px、项高与高亮带高 40px(`DatePickerFlyoutPresenterItemHeight`/`HighlightHeight`;条目 `box-sizing: border-box`,内边距计入 40px 行高盒)、项内边距 0,3,0,6(月列 9,3,0,6)、可见行数 3、飞出层圆角 8px(源 `OverlayCornerRadius`,取弹层基建的 `--wui-popup-corner-radius`)。宽度:收起字段下限 296(`DatePickerThemeMinWidth`)、上限 456(`DatePickerThemeMaxWidth`);飞出层固定 296(`DatePickerFlyoutPresenter` 的 `Width`/`MinWidth`)。
- **展开钮**:源 LoopingSelector 模板的 UpButton/DownButton 为 `Height 22`、`FontSize 8`、码点 `E70E`(上)/`E70D`(下)、底色 `LoopingSelectorButtonBackground`,默认 `Collapsed`、`PointerOver` 才显示;本实现逐键对齐(悬停所在列才显现,位置与源一致叠加在窗口上下沿)。滚轮 / 拖拽为 web 增强(源 LoopingSelector 无鼠标滚轮)。
- **列不循环**:源 LoopingSelector 到首/末项后无限回绕;本实现为有界列表,到边界停住(再向下不动)。
- **MinYear / MaxYear**:WinUI 为 `DateTimeOffset`;web 版收窄为 `number` 年份,按年粒度约束年列(与源「约束年列、日/月不受限」的语义一致);区间收窄挤出当前选中年份时自动收敛。
- **日按年月联动**:日列项数随年月变化(28–31,闰年 2/29);改月/年导致日越界时自动收敛(如 1/31 → 2/28),与 WinUI 行为一致。
- **空值态**:`date` 为 `null` 时收起字段与飞出层三列均显示占位日期(`placeholderDate`,缺省今天)并套用占位前景色(源 HasNoDate 态)。飞出层提供 Accept(`E8FB`)/ Dismiss(`E711`)按钮:飞出层内**点选列项即提交并收起**(源在飞出层内选值即写入 `Date`),Accept 收起保留当前值,Dismiss 回滚到打开瞬间的值。
- **Header**:仅支持字符串(WinUI `Header` 可为任意内容);源 `DatePickerTopHeaderMargin` 0,0,0,4。
- **格式模板**:支持上表所列子集;月份/星期名走 `Intl.DateTimeFormat`(跟随浏览器语言,WinUI 跟随应用语言);`{dayofweek.*}` 按当前选中年月日计算,月/年变化时日列标签随之更新。
- **事件参数**:WinUI `DateChanged`(`DateChangedEventArgs.NewDate/OldDate`)摊平为 `(newDate, oldDate)`;与 WinUI 一致,程序化赋值(v-model)同样触发——交互写回与 v-model 赋值经内部标记去重,一次变更只发一次事件;程序化赋值越界(年份不在 min/max 区间、日溢出当月)时先收敛为钳制值再触发一次(源 MinYear/MaxYear 约束行为)。
- **日期值**:提交的 `Date` 以本地时区当日 12:00 构造(规避 DST 与 UTC 日界偏移),新旧值比较按年/月/日三元组而非对象引用。

---

演示页源码:[demo/pages/DatePickerPage.vue](../../demo/pages/DatePickerPage.vue)
