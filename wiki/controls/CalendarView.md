# CalendarView

> 在线示例:[/#/calendarview](/#/calendarview)

## 概述

CalendarView 以大视图展示并选择日期:头部按钮把月视图下钻到年视图、再到十年视图,点击年/十年单元逐级回退;支持单选与多选(`SelectionMode`)、禁选日期集合(`BlackoutDates`)、可选范围(`MinDate` / `MaxDate`)、每周第一天(`FirstDayOfWeek`)、今日高亮(`IsTodayHighlighted`)、月内组标签(`IsGroupLabelVisible`)与邻月灰态(`IsOutOfScopeEnabled`)。星期短名、月份名与头部文案按 `language`(BCP-47)用 `Intl.DateTimeFormat` 格式化,语言无关。与之相对,DatePicker 是紧凑的下拉式选择。

对应 WinUI `Microsoft.UI.Xaml.Controls.CalendarView`,视觉与结构对照 `CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml` 中 `TargetType="CalendarView"` 的样式与 ControlTemplate(40px 头部行 + 38px 星期行 + 月/年/十年三层视图、`BackgroundLayer` 用 `BorderBrush` 垫底形成单元格格线、`NavigationButtonStyle` 字号 20、箭头 glyph U+E0E4/U+E0E5、`CalendarViewDayItem` 40×40 + Margin 1 + Padding 0,0,0,4);行为对照官方示例 `CK/WinUI-Gallery/WinUIGallery/Samples/CalendarView/`(SelectionMode / IsGroupLabelVisible / IsOutOfScopeEnabled / Language)与 `CalendarView_Partial_*.cpp` 的三视图层级交互。

与 CalendarDatePicker 的关系:CalendarDatePicker 是紧凑的下拉式选择(文本框 + 弹层),其弹层内嵌的月视图为该控件够用的最小实现(单月选择,独立实现、不复用本组件);CalendarView 是完整的三视图日历,同为独立实现。两者同源 `generic.xaml`,共用 `--wui-calendar-view-*` token 族与同一套头部/日格结构语义(头部行 40px、星期行 38px、日格 40×40、今日强调色圆、禁选中线),视觉一致;参见 [CalendarDatePicker](./CalendarDatePicker.md)。

官方文档:

- [CalendarView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.calendarview)
- [CalendarView 设计指南](https://learn.microsoft.com/windows/apps/design/controls/calendar-view)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `displayMode` | `'Month' \| 'Year' \| 'Decade'` | `'Month'` | 当前显示模式(WinUI `DisplayMode`);支持 `v-model:displayMode` 双向绑定 |
| `selectedDates` | `Date[]` | `[]` | 选中日期集合(WinUI `SelectedDates`);支持 `v-model:selectedDates`;Single 模式整表替换,Multiple 模式切换成员,均为零点对齐的本地时间 |
| `selectionMode` | `'None' \| 'Single' \| 'Multiple'` | `'Single'` | 选择模式(WinUI `SelectionMode`) |
| `blackoutDates` | `Date[]` | `[]` | 禁选日期集合(WinUI `BlackoutDates`);禁选格文字变灰并显示中横线,保留可聚焦但拒绝选择 |
| `minDate` | `Date \| string \| number` | `undefined` | 最小可选日期(WinUI `MinDate`);之前日期按 blackout 处理,翻页箭头到达边界后禁用 |
| `maxDate` | `Date \| string \| number` | `undefined` | 最大可选日期(WinUI `MaxDate`) |
| `firstDayOfWeek` | `number` | `0` | 每周第一天(WinUI `FirstDayOfWeek`);0 = 周日,与 JS `getDay()` / WinUI `DayOfWeek` 对齐 |
| `isTodayHighlighted` | `boolean` | `true` | 今日高亮:强调色圆底 + `TodayForeground` 文字 |
| `isGroupLabelVisible` | `boolean` | `false` | 月视图 1 日单元格底部显示月份组标签(WinUI `IsGroupLabelVisible`);1 月 1 日改显年份(源 FirstOfYearDecadeLabel) |
| `isOutOfScopeEnabled` | `boolean` | `true` | 邻月日期按灰态(OutOfScope 前景/底色)渲染;`false` 时邻月按当月样式(WinUI 同名属性) |
| `language` | `string` | `''` | BCP-47 区域标签(WinUI `Language`);空串用运行时区域。驱动星期/月份/头部文案的 `Intl.DateTimeFormat` |
| `disabled` | `boolean` | `false` | 禁用整控件;对照模板 Disabled 视觉状态(星期行变灰、交互关闭) |
| `ariaLabelPrevious` | `string` | `'Previous'` | 前翻按钮无障碍名(WinUI 经系统资源本地化;Web 以 prop 开放给站点本地化) |
| `ariaLabelNext` | `string` | `'Next'` | 后翻按钮无障碍名 |
| `calendarItemBorderBrush` | `string` | token 默认 | 单元格描边色(WinUI `CalendarItemBorderBrush`);缺省 `--wui-calendar-view-calendar-item-reveal-border` |
| `calendarItemBackground` | `string` | token 默认 | 单元格底色(WinUI `CalendarItemBackground`) |
| `todayForeground` | `string` | token 默认 | 今日文字色(WinUI `TodayForeground`) |
| `todayBackground` | `string` | token 默认 | 今日圆底色;缺省 `--wui-system-accent-color`(见差异说明) |
| `selectedBorderBrush` | `string` | token 默认 | 选中描边色(WinUI `SelectedBorderBrush`) |
| `selectedForeground` | `string` | token 默认 | 选中/悬停文字色(WinUI `SelectedForeground`) |
| `hoverBorderBrush` | `string` | token 默认 | 悬停描边色(WinUI `HoverBorderBrush`) |
| `pressedBorderBrush` | `string` | token 默认 | 按下描边色(WinUI `PressedBorderBrush`) |
| `blackoutForeground` | `string` | token 默认 | 禁选文字色与禁选中线色(WinUI `BlackoutForeground`) |
| `outOfScopeForeground` | `string` | token 默认 | 邻月文字色(WinUI `OutOfScopeForeground`) |
| `outOfScopeBackground` | `string` | token 默认 | 邻月底色(WinUI `OutOfScopeBackground`) |

其余 `class` / `style` / `aria-*` 等属性经 `v-bind="$attrs"` 透传到根元素。视觉画刷 prop 传入任意合法 CSS 颜色即覆盖对应 token,不传回落 `--wui-*` token(明暗主题自动跟随)。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectedDatesChanged` | `(event: { addedDates: Date[]; removedDates: Date[] }) => void` | 选中集合变化时:点击可选日期(Single 替换整表 / Multiple 切换成员);对应 WinUI `SelectedDatesChanged` |
| `displayModeChanged` | `(mode: 'Month' \| 'Year' \| 'Decade') => void` | 显示模式变化时:头部按钮下钻(Month→Year→Decade)、年/十年视图单元点击回退、外部改写 `v-model:displayMode`;对应 WinUI `DisplayModeChanged` |

模板中监听写法:`@selected-dates-changed="..."`、`@display-mode-changed="..."`。

### 视图层级与键盘

- **下钻/回退**:头部按钮显示当前范围文案(月视图「2026年9月」/ 年视图「2026」/ 十年视图「2020 - 2029」),点击逐级下钻;十年视图已是最上层,头部按钮禁用(源 `TemplateSettings.HasMoreViews`)。年视图点月份、十年视图点年份回到下一层并把视图锚定到该单元。
- **翻页**:前/后箭头按当前视图步进(月 ±1 个月、年 ±1 年、十年 ±10 年);到达 `minDate`/`maxDate` 边界后对应箭头禁用(源 `HasMoreContentBefore` / `HasMoreContentAfter`)。
- **键盘(月视图)**:← → ↑ ↓ 移动焦点日期(±1 天 / ±7 天);焦点日期移出当前 42 格网格(邻月边缘格继续外移)或 PageUp / PageDown 翻月时,**视图自动翻月跟随并重定位焦点**(翻月目标钳制到 min/max 的月边界,与前后箭头同口径;被钳回当前月时焦点日期同步钳回可选范围)。Home / End 跳当月首末日,Enter / Space 选择。焦点格用 roving tabindex 管理。头部与翻页按钮为独立 Tab 停靠点;年/十年视图单元按自然 Tab 序聚焦,Enter 选择单元。
- **禁选格**:不进 Tab 序(`tabindex="-1"`,方向键仍可达——blackout 语义是「拒绝选择」而非「不可达」),点击/Enter 无效果。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiCalendarView from '@/components/CalendarView.vue'
import type { CalendarViewSelectedDatesChangedEventArgs } from '@/components/CalendarView.vue'

const mode = ref<'Month' | 'Year' | 'Decade'>('Month')
const selected = ref<Date[]>([new Date()])

function onSelectedDatesChanged({ addedDates, removedDates }: CalendarViewSelectedDatesChangedEventArgs): void {
  console.log('added:', addedDates, 'removed:', removedDates)
}
</script>

<template>
  <WuiCalendarView
    v-model:display-mode="mode"
    v-model:selected-dates="selected"
    selection-mode="Multiple"
    :first-day-of-week="1"
    :blackout-dates="[new Date(2026, 11, 25)]"
    :min-date="new Date(2026, 0, 1)"
    :max-date="new Date(2026, 11, 31)"
    language="zh-CN"
    @selected-dates-changed="onSelectedDatesChanged"
  />
</template>
```

## 与 WinUI 的差异说明

- **CalendarIdentifier 未实现**:WinUI 可切换历法系统(公历/希伯来历/儒略历等);Web 侧仅支持公历(Gregorian),月/年数值直接取自本地 `Date`。
- **星期短名为近似**:WinUI 月视图表头用 `Windows.Globalization.Calendar` 的 ShortestDayName(en-US 为 "Su/Mo/We…");`Intl.DateTimeFormat` 无「最短」档,实现取 `weekday: 'short'` 后将拉丁字母结果截到 2 字符(en "Sun"→"Su"),非拉丁文字(中日韩等)保留全量(zh "周日")。
- **language 映射**:WinUI `Language` 直接驱动其 Calendar/格式化管线;本实现将其传给 `Intl.DateTimeFormat` 的 locale 参数,空串用运行时区域。日期算术(每月天数、每周起始)与 WinUI 的 Calendar 系统无关,直接基于本地时区 `Date`。
- **视觉锚点为 generic.xaml 旧模板**:按任务锚点实现了格线式单元格(`BackgroundLayer` 垫 `BorderBrush` 底、单元格 Margin 1 透出 2px 格线)、头部/箭头字号 20、标题行 40px、星期行 38px。同快照 `controls/dev/CommonStyles/CalendarView_themeresources.xaml` 是 WinUI 3 新版圆角设计(头部按钮 14px SemiBold + 标题行下 1px 分隔线、箭头改 U+EDDB/EDDC 字号 8、单元格透明底无格线、`CalendarViewBaseItemRoundedChromeEnabled=True` + `ControlCornerRadius`),两者均出自 CK;本项目以 generic.xaml 锚点为准,新版差异在此记录。
- **无对应 token 的结构值**(源键,按源值直接使用):头部行 40px、星期行 38px、头部/箭头字号 20px(源 `NavigationButtonStyle FontSize=20`)、头部按钮 Padding 12,0,0,0、箭头 Padding 1 与 glyph U+E0E4/U+E0E5、日格 MinHeight 40 + Margin 1 + Padding 0,0,0,4、组标签字号 8px(源 FirstOfMonthLabel/FirstOfYearDecadeLabel FontSize)、今日圆 inset 2px、禁选中线 2px(左右内缩 8px)。
- **今日圆底色**:源 chrome 以强调色填充今日圆;`theme.css` 只有 `--wui-calendar-view-today-foreground` 而无 today-background token(新版文件才有 `CalendarViewTodayBackground`),取最近似 token `--wui-system-accent-color`,可经 `todayBackground` prop 覆盖。
- **星期行文字色**取 `--wui-calendar-view-calendar-item-foreground`;禁用态取 `--wui-calendar-view-week-day-foreground-disabled`(源 CommonStates.Disabled)。星期行字号取 `--wui-tool-tip-content-theme-font-size`(12px,近似源 CaptionTextBlockStyle;theme.css 无 caption 字号 token)。
- **交互描边用 inset box-shadow**:源 chrome 的 2px 内描边不参与布局,Web 用 `box-shadow: inset 0 0 0 2px` 复刻,悬停/按下/选中描边不改变格线布局。
- **动画为近似**:头部文案切换淡入取源 `HeaderButtonStates.ViewChanging`(Opacity 0→1,167ms,L14441);视图切换入场取源 `DisplayModeStates` Transitions(Opacity + Scale 1.29→1,KeySpline 0.1,0.9,0.2,1,233ms,L14491)的入场帧简化。`src/styles/animations.css` 的时长/缓动 token 尚未被入口引入,故以等值字面量书写(167ms、233ms、`cubic-bezier(0.1,0.9,0.2,1)`)。
- **min/max 越界按 blackout 处理**:界外日期套用禁选视觉并拒绝选择(与 WinUI 对界外日期的行为一致);年视图中整月越界的月份、十年视图中越界的年份禁用;前后翻页可用性按「相邻单元区间与 [min, max] 有交集」判定(月/十年粒度两种判定等价,年粒度按单元末日与 min 比较——否则 min 落在上一年年中时上一年会被错误禁用)。
- **aria 标签默认英文**:前/后翻页按钮与年/十年视图容器的无障碍名默认英文(`Previous` / `Next` / `Year view` / `Decade view`;WinUI 由系统资源本地化);翻页按钮名可经 `ariaLabelPrevious` / `ariaLabelNext` 本地化,视图容器名与日期 `aria-label`(经 `Intl.DateTimeFormat` 随 `language` 本地化)不可配置。
- **单选不反选**:Single 模式重复点击已选日期保持选中(WinUI 行为);Multiple 才可取消。
- **程序化赋值不触发事件**:父组件直接写 `v-model:selectedDates` 更新外部状态,不触发 `selectedDatesChanged`(与本项目 NumberBox 的收窄策略一致;WinUI 中程序化设 SelectedDates 会触发事件)。`displayModeChanged` 在外部改写 `v-model:displayMode` 时也不触发,仅组件内部切换触发。
- **未迁移的面**:WinUI 的 `CalendarViewItem` / `CalendarViewDayItem` 可作为独立控件使用并有 `CalendarViewDayItemChanging` 虚拟化事件,本实现以一次性渲染的静态 DOM 等价(6×7 = 42 格,无需虚拟化);`FirstDayOfWeek` 之外的区域周历规则(如 ISO 8601 周数)不涉及。WinUI 手柄按键(B 键等价 Enter)无 Web 对应,未实现。

---

演示页源码:[demo/pages/CalendarViewPage.vue](../../demo/pages/CalendarViewPage.vue)
