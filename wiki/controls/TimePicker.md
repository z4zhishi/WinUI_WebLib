# TimePicker

> 在线示例:[/#/timepicker](/#/timepicker)

## 概述

使用 TimePicker 让用户在应用中设置一个时间,例如设置提醒时间。TimePicker 显示时、分、AM/PM 三列选择器,便于触摸或鼠标操作,并且可以通过多种方式进行样式设置和配置。与 DatePicker 的区别:DatePicker 选完整日期(月/日/年),TimePicker 只选一天中的时刻(时/分,24 小时制下无 AM/PM 列)。

对应 WinUI `Microsoft.UI.Xaml.Controls.TimePicker`,视觉对照 `generic.xaml` 中 `TargetType="TimePicker"`(L10660 起,标头/HasNoTime 空值态/Disabled 各色)与 `TargetType="TimePickerFlyoutPresenter"`(L13010 起,三列宿主:宽 242、三列等宽、2px 分割线、40px 高亮带与项高)复刻;三列的滚轮形态取自 LoopingSelector 资源(L857 起:项前景/选中前景/按钮底色)。颜色全部取自 `theme.css` 预置的 `--wui-time-picker-*` / `--wui-looping-selector-*` / `--wui-text-control-placeholder-foreground` token。

官方文档:

- [TimePicker - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.timepicker)
- [Time picker 设计指南](https://learn.microsoft.com/windows/apps/design/controls/time-picker)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `time` | `string \| null` | `null` | 选中时间(WinUI `SelectedTime`),`v-model:time` 双向绑定;格式为 **`"HH:mm"` 24 小时制零填充字符串**(如 `"09:05"`、`"17:30"`),`null` 为未选择 |
| `header` | `string` | `''` | 选择器上方标头文本(WinUI `Header`),为空时不渲染 |
| `clockStyle` | `'12HourClock' \| '24HourClock'` | `'12HourClock'` | 时钟制式(WinUI `ClockIdentifier`);12 制显示时(1-12)+ AM/PM 列,24 制显示 0-23、无 AM/PM 列 |
| `minuteIncrement` | `number` | `1` | 分钟列步进(WinUI `MinuteIncrement`,收敛到 1-30);变更时已选分钟就近吸附到网格(如 13:08 + 15 步进吸附为 13:15,并触发事件) |
| `placeholderTime` | `string` | 当前时间 | 空值态(`time` 为 `null`)时三列显示的占位时间,`"HH:mm"` |
| `disabled` | `boolean` | `false` | 禁用态,样式对照模板 Disabled 视觉状态 |

其余 `class` / `style` 等属性经 `v-bind="$attrs"` 透传到根元素。

**time 值选型说明**:WinUI `SelectedTime` 是 `TimeSpan`(当日 0 点起的时间跨度)。Web 版选型为 `"HH:mm"` 24 小时制字符串而非"自午夜的分钟数",理由:可直接阅读与调试、JSON 序列化无歧义、与 `<input type="time">` 生态互通;需要分钟数时 `Number(h) * 60 + Number(m)` 即可换算。内部状态统一为 24 小时制,12/24 切换只改显示不改值。

**12/24 换算约定**:内部始终保存 24 小时制值;显示换算 `12AM = 00:00`、`12PM = 12:00`、`13:00 → 1:00 PM`、`00:30 → 12:30 AM`。12 制下小时列 1-12,AM/PM 列独立切换(在 12↔0、11↔23 边界间正确衔接)。注意:12 制下小时列步进跨 11↔12(如 11 AM → 12 PM、12 PM → 11 AM)会**自动翻转 AM/PM**(与 WinUI 两列相互独立、跨午时仍保持原 AM/PM 不同,见差异说明)。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `timeChanged` | `(newTime: string \| null, oldTime: string \| null)` | 选中时间变化时(滚轮/箭头/拖拽/点击列项/程序化赋值均触发;`minuteIncrement` 变更导致的吸附同样触发) |
| `update:time` | `(value: string \| null)` | `v-model:time` 双向绑定更新时 |

模板中监听写法:`@time-changed="onTimeChanged"`。

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
| Tab | 在时/分/AM-PM 三列间移动焦点(每列为可聚焦 `listbox`) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiTimePicker from '@/components/TimePicker.vue'

const time = ref<string | null>(null)

function onTimeChanged(newTime: string | null, oldTime: string | null): void {
  console.log('timeChanged:', oldTime, '→', newTime)
}
</script>

<template>
  <!-- 基础:标头 + 默认 12 小时制 -->
  <WuiTimePicker v-model:time="time" header="Pick a time" @time-changed="onTimeChanged" />

  <!-- 官方示例组合:标头 + 15 分钟步进 -->
  <WuiTimePicker v-model:time="time" header="Arrival time" :minute-increment="15" />

  <!-- 24 小时制,初值当前时间 -->
  <WuiTimePicker v-model:time="time" clock-style="24HourClock" header="24 hour clock" />
</template>
```

## 与 WinUI 的差异说明

- **形态**:WinUI TimePicker 默认是「收起按钮(2px 描边,时:分:AM/PM 三段文本)→ 点击弹出三列飞出层」;本实现按任务规格做成**常驻 inline 三列滚轮选择器**(与 DatePicker 同款约定),外层面板取飞出层形态(`TimePickerFlyoutPresenterBackground`/`Border` 1px + 8px 弹层圆角),收起按钮的 `--wui-time-picker-button-*` 背景/描边 token 未使用,仅 Disabled 前景色被复用。
- **time 值类型**:WinUI `SelectedTime` 为 `IReference<TimeSpan>`;web 版收窄为 `"HH:mm"` 字符串(见属性节选型说明),`null` 语义与 WinUI 一致(未选择,触发 HasNoTime 空值态)。
- **颜色 / 字号**:全部取自 `theme.css` 的 `--wui-time-picker-*`(标头/分割线/禁用/飞出层底色/描边/高亮带)、`--wui-looping-selector-*`(项前景/选中/悬停/按压/按钮底色)与 `--wui-text-control-placeholder-foreground`(源 HasNoTime 态)token,浅 / 深主题随 `data-theme` 切换。
- **无 token 的结构值**(源 generic.xaml 键,按源值直接使用):面板宽 242 / 最大 456(`TimePickerThemeMinWidth`/`TimePickerThemeMaxWidth`)、三列等宽(源模板 First/Second/ThirdPickerHostColumn 均为 1 等分,与 DatePicker 的 78/132/78 不等宽不同)、分割线 2px、项高与高亮带高 40px(`TimePickerFlyoutPresenterItemHeight`/`HighlightHeight`;条目 `box-sizing: border-box`,内边距计入 40px 行高盒,对齐源项高语义)、项内边距 0,3,0,6、可见行数 3(源弹层 MaxHeight 398 约 4-5 行,取 3 行贴合 inline 高度)、面板圆角 8px(源 `OverlayCornerRadius`,theme.css 无同名 token,取弹层基建的 `--wui-popup-corner-radius`)。
- **上下箭头按钮**:源 LoopingSelector 的展开钮(PointerOver 才显示,高 22)在 inline 形态下改为常驻 20px 高按钮 + `--wui-looping-selector-button-background` 底色 + Segoe Fluent chevron 码点 **`E76B`(上)/ `E76C`(下)**(ChevronUp/Down 现代码点;V6 视觉 QA 核对早先码点在 MS 字形表中为 ChevronLeft/Right,语义错位,统一改用现码点),作为滚轮/拖拽之外的可点步进入口(WinUI 原生无滚轮,此为 web 增强)。
- **列不循环**:源 LoopingSelector `ShouldLoop=True` 到首/末项后无限回绕;本实现为有界列表,到边界停住(23 后不再 +1、AM/PM 不跨列翻转)。
- **小时/分钟显示宽度**:小时列不补零(0-23 或 1-12,对应源 `{hour.integer}`),分钟列恒两位(`05`,对应源 `{minute.integer}`CultureData 补零行为);AM/PM 文案固定 `AM`/`PM` 英文(WinUI 跟随系统语言本地化,如中文环境显示"上午/下午")。
- **MinuteIncrement**:WinUI 允许 1-30 任意值;本实现同样收敛到 1-30,列表从 0 起按步进生成(`0,15,30,45`)。与 WinUI 不同的是:**变更步进时会把已选分钟就近吸附到网格并写回模型**(WinUI 保留离网的 `SelectedTime` 不动,仅飞出层显示取整);程序化传入离网值(如 `13:08` + 步进 15)同理吸附为 `13:15`(就近四舍五入,`13:07` 吸附为 `13:00`)。
- **空值态**:`time` 为 `null` 时三列显示占位时间(`placeholderTime`,缺省组件创建时的当前时间)并套用占位前景色(源 HasNoTime 态);WinUI 收起按钮显示本地化的 "hour/minute/AM" 占位词,inline 滚轮形态改为显示占位值,语义等价(均提示"尚未选择")。
- **ClockIdentifier 切换**:内部状态为 24 小时制,`clockStyle` 切换只重排列(增删 AM/PM 列、小时列 1-12 ↔ 0-23),值不变;WinUI 切换 `ClockIdentifier` 保留 `SelectedTime` 的行为一致。
- **12 制小时列步进联动 AM/PM**:WinUI 的小时列与 AM/PM 列相互独立(12 PM 下把小时从 12 拨到 11 得 11 PM);本实现小时步进的是 24 小时制真值,跨 11↔12 时 AM/PM 自动翻转(12 PM → 11 AM)。
- **Header**:仅支持字符串(WinUI `Header` 可为任意内容);源 `TimePickerTopHeaderMargin` 0,0,0,4。
- **事件参数**:WinUI `TimeChanged`(`TimePickerValueChangedEventArgs.OldTime/NewTime`)摊平为 `(newTime, oldTime)`;与 WinUI 一致,程序化赋值同样触发。飞出层 Accept/Dismiss 按钮在 inline 形态下无对应物(操作列即提交)。

---

演示页源码:[demo/pages/TimePickerPage.vue](../../demo/pages/TimePickerPage.vue)
