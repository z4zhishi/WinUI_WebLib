# CalendarDatePicker

> 在线示例:[/#/calendardatepicker](/#/calendardatepicker)

## 概述

CalendarDatePicker 是一个「文本框 + 日历弹层」的日期选择控件:未选时显示占位文本,点击文本框弹出内嵌月视图日历,选中日期后弹层收起并把日期回填到文本框;相比逐列滚动的 DatePicker,它适合让用户在真实月历上对照「今天前后」自由挑一天。

对应 WinUI `Microsoft.UI.Xaml.Controls.CalendarDatePicker`,视觉对照 `generic.xaml` 中 `TargetType="CalendarDatePicker"`(L14801 起)复刻:关闭态四态(Normal / PointerOver / Pressed / Disabled)+ 聚焦铺底、`DateText` 未选/已选双色(`TextForeground` / `TextForegroundSelected`)、`CalendarGlyph`(U+E787)等颜色全部取自 `theme.css` 预置的 `--wui-calendar-date-picker-*` token。

弹层是按 CalendarDatePicker 用途内嵌的**月视图级日历**(头部「月 年」+ 前后月导航、周名行、6×7 日格、今日高亮、选中态、范围外 Blackout),视觉取 `CalendarViewRevealStyle`(L14310 起)与 `CalendarViewDayItemRevealStyle` 的对应 token(`--wui-calendar-view-*`),基于[弹层公共基建](./_popup-infra.md)(`usePopupLayer`,Placement = Bottom + light dismiss 三手势,嵌套弹层豁免内置)。**完整的 CalendarView 大控件(年 / 十年视图切换、多选、约会条、分组标签等)是独立的后续任务**,不在本控件范围内;需要承载更丰富日历交互时请等 CalendarView 落地。

官方文档:

- [CalendarDatePicker - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.calendardatepicker)
- [Calendar date picker 设计指南](https://learn.microsoft.com/windows/apps/design/controls/calendar-date-picker)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `date` | `Date \| null` | `null` | 选中日期(WinUI `Date`),`v-model:date` 双向绑定;经弹层选择写入的是本地当日 0 点,程序化赋值保留原值 |
| `isCalendarOpen` | `boolean` | `false` | 日历弹层开关(WinUI `IsCalendarOpen`),`v-model:is-calendar-open` 双向绑定 |
| `header` | `string` | `''` | 输入框上方标头文本(WinUI `Header`) |
| `placeholderText` | `string` | `''` | 未选日期时显示的占位文本(WinUI `PlaceholderText`) |
| `dateFormat` | `string` | `'{dayofweek.abbreviated}, {month.full} {day.integer}'` | 选中日期的显示格式(WinUI `DateFormat`,DateTimeFormatter 模板串);支持 `{year.full}`、`{year.abbreviated}`、`{month.full}`、`{month.abbreviated(n)}`、`{month.integer}`、`{month.integer(2)}`、`{day.integer}`、`{day.integer(2)}`、`{dayofweek.full}`、`{dayofweek.abbreviated(n)}`,另接受 `shortdate` / `longdate` 具名格式;未识别的片段原样保留 |
| `minDate` | `Date` | `undefined` | 最早可选日期(WinUI `MinDate`);早于它的日期 Blackout 禁选,前翻导航在含 `minDate` 的月钳停 |
| `maxDate` | `Date` | `undefined` | 最晚可选日期(WinUI `MaxDate`);晚于它的日期 Blackout 禁选,后翻导航在含 `maxDate` 的月钳停 |
| `isTodayHighlighted` | `boolean` | `true` | 是否高亮今天(WinUI `IsTodayHighlighted`;关闭后今天按普通日渲染) |
| `firstDayOfWeek` | `number` | `0` | 周首日,0 = 周日 … 6 = 周六(WinUI `FirstDayOfWeek`),决定周名行顺序与月网格起始 |
| `calendarIdentifier` | `string` | `'"GregorianCalendar"'` | 历法标识(WinUI `CalendarIdentifier`);本实现仅支持阳历,传其他标识回退阳历并在 dev 下 console.warn |
| `disabled` | `boolean` | `false` | 禁用态,样式对照模板 Disabled 视觉状态 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `dateChanged` | `(value: Date \| null)` | 日期变化时;用户选择与程序化赋值(含清空为 null)均触发,对齐 WinUI `DateChanged` 语义 |
| `opened` | — | 日历弹层打开并完成首次定位后(WinUI `Opened`) |
| `closed` | — | 日历弹层关闭后(WinUI `Closed`) |

模板中监听写法:`@date-changed="onDateChanged"`。

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `Enter` / `Space` / `↓` / `↑` | 关闭态:打开日历(焦点落在已选日,未选落在今天;今天越界则落在范围内首日) |
| `←` / `→` / `↑` / `↓` | 打开态:按日 / 周移动焦点,跨月边界时视图自动翻到目标月 |
| `Home` / `End` | 打开态:移动到本周行首 / 行尾(以 `firstDayOfWeek` 为行起点) |
| `PgUp` / `PgDn` | 打开态:上 / 下换月,保留日号并钳到目标月天数 |
| `Enter` / `Space` | 打开态:选中当前聚焦日并收起弹层(Blackout 日不可选) |
| `Esc` | 关闭日历,焦点归还文本框 |
| `Tab` | 关闭日历,焦点自然移动 |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiCalendarDatePicker from '@/components/CalendarDatePicker.vue'

const selectedDate = ref<Date | null>(null)

// 可选范围示例:今天前后 10 天
const today = new Date()
const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10)
const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)

function onDateChanged(value: Date | null): void {
  console.log('dateChanged:', value)
}
</script>

<template>
  <!-- 官方示例同款:Header + PlaceholderText -->
  <WuiCalendarDatePicker
    v-model:date="selectedDate"
    header="Calendar"
    placeholder-text="Pick a date"
    @date-changed="onDateChanged"
  />

  <!-- 自定义显示格式 + 可选范围 + 周首日 -->
  <WuiCalendarDatePicker
    v-model:date="selectedDate"
    date-format="{year}-{month.integer(2)}-{day.integer(2)}"
    :min-date="minDate"
    :max-date="maxDate"
    :first-day-of-week="1"
  />
</template>
```

## 与 WinUI 的差异说明

- **颜色 / 字号**:关闭态全部取自 `theme.css` 的 `--wui-calendar-date-picker-*` token,弹层(月视图)取 `--wui-calendar-view-*` token,浅 / 深主题随 `data-theme` 切换。聚焦态为 `CalendarDatePickerBackgroundFocused`(强调色低透明度铺底),不叠加系统焦点框。
- **无 token 的结构值**(源 generic.xaml 键,按源值直接使用):边框 `CalendarDatePickerBorderThemeThickness` = 2px、`MinHeight` 32(**含 2px 边框**;FIX2 更正:关闭态输入框此前内容盒下 32 + 2×2 边框 = 36px,已补 `box-sizing: border-box`,控件关闭态总高回到源值 32,根高 59→55)、`DateText` 内边距 12,0,0,2、Glyph 列宽 32px / 字号 12px(取同值 token `--wui-tool-tip-content-theme-font-size`)、头部行高 40、导航按钮字号 20、周名行高 38 / 字号 12px(CaptionTextBlockStyle,取同值 token)、日格 `CalendarViewDayItemRevealStyle` 40×40 / Margin 1 / 状态圈边框 `CalendarItemBorderThickness` = 2px、控件圆角 `ControlCornerRadius` = 4px(无同名 token,沿 Button / NumberBox 做法)、弹层定位间距 4px(Placement=Bottom 的系统留白,XAML 无 token,取近似值)。
- **文本框不可自由输入**:WinUI 模板的 `DateText` 是 `TextBlock` 而非 `TextBox`——日期只能经日历选择,控件本体不接受键入文本、也不做文本解析日期;Web 端常见的「手敲 2026-01-01 回车回填」行为本控件刻意不做(需要自由输入请配合 `TextBox` 自行解析后写 `date`)。
- **弹层是月视图级日历,不是完整 CalendarView**:仅月视图(头部「月 年」+ 前后月导航 + 6×7 日格);`DisplayMode`(年 / 十年视图)、`IsGroupLabelVisible`、`IsOutOfScopeEnabled`(固定按开启渲染相邻月灰格)、多选与约会密度条均未实现。完整 CalendarView 控件是独立后续任务,落地前请勿把本弹层当作 CalendarView 使用。
- **`calendarIdentifier` 仅支持阳历**:传非 `GregorianCalendar` 标识回退阳历并在 dev 下告警(WinUI 会按历法重置默认 `DateFormat`,此处不重置)。
- **`dateFormat` 为模板子集**:支持的占位符见属性表;WinUI 完整 DateTimeFormatter 模板( era / hour 等)与非法格式回退默认行为未复刻,未识别片段原样保留。
- **今日高亮与选中叠加**:WinUI 的今日实心圆与选中圆环由 chrome 分别绘制;本实现今日 = 强调色实心圆、选中 = 圆环,两者叠加时呈「实心 + 环」,与 WinUI 呈现一致程度以实际渲染为准。
- **Blackout 划线**:范围外日期的横向划杠在 WinUI 由 `CCalendarViewBaseItemChrome` 绘制,XAML 无对应视觉元素;本实现用伪元素近似(弱化前景色 + 中线)。
- **相邻月(OutOfScope)格**:按 WinUI 默认 `IsOutOfScopeEnabled = true` 渲染为灰底格,同样受 min/max 约束、可点击选中;`IsOutOfScopeEnabled = false`(隐藏相邻月)未暴露。
- **范围约束只作用于 UI**:程序化把 `date` 写到 min/max 之外不会回写模型(WinUI 亦不静默改值),只会在日历中呈 Blackout 且无法再次选中;导航按钮按月界钳制(对照 `HasMoreContentBefore` / `After`)。
- **打开月与焦点落点**:打开时显示「已选日所在月」,未选则今天所在月(整月越界时钳入 min/max 月);WinUI 对未选时显示月的官方描述较模糊,此处取最贴近期望交互的实现。
- **键盘范围**:`Home` / `End` 为周行首 / 行尾(ARIA grid 惯例);WinUI CalendarView 另支持 Home/End 跳月首/月末、年份级快捷键(依赖年视图),未复刻。焦点可落在 Blackout 日(呈禁用态,Enter 无效),与 WinUI 的禁用项焦点行为近似。
- **阴影 / 圆角 / 动画**:弹层圆角与阴影取弹层基建的 `--wui-popup-corner-radius` / `--wui-popup-shadow`(ThemeShadow 的 Web 近似),入场 `wui-flyout-in` / 离场 `wui-fade-out` 近似 WinUI 弹层淡入淡出,见 [_popup-infra](./_popup-infra.md) 差异节。
- **本地化名称**:`{month.full}` / `{dayofweek.*}` 与周名行、头部「月 年」文案经 `Intl.DateTimeFormat` 取宿主 locale 名称;WinUI 按应用全球化设置,二者在无显式 locale 配置时表现一致。
- **事件参数**:`dateChanged` 将 WinUI `CalendarDatePickerDateChangedEventArgs` 摊平为单个新值参数。

## 互链

- 弹层公共基建:[_popup-infra](./_popup-infra.md)(`usePopupLayer` 定位 / light dismiss / 嵌套豁免)
- 同族控件:[DatePicker](./DatePicker.md)(滚动列选择)、[CalendarView](./CalendarView.md)(完整日历大控件,后续任务落地后承接年 / 十年视图与多选)
- 演示页源码:[demo/pages/CalendarDatePickerPage.vue](../../demo/pages/CalendarDatePickerPage.vue)
