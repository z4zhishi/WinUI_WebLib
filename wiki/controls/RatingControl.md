# RatingControl

> 在线示例:[/#/ratingcontrol](/#/ratingcontrol) · 演示页源码:[demo/pages/RatingControlPage.vue](../../demo/pages/RatingControlPage.vue)

## 概述

RatingControl(评分控件)让用户用 1 到 N 颗星为内容评分("Rate something 1 to 5 stars")。它的特色是**三态外观**:

1. **未评分态**:显示提示文字(`caption`,如「请评分」)+ 轮廓星条;设置了 `placeholderValue` 时以半星精度预填占位星;
2. **悬浮预览态**:指针滑过时星星实时预览填充到所在星(ceil 取整),支持按住拖出左边缘清空;
3. **紧凑值态**:评分后收窄为紧凑的实心星条(强调色),文字随业务更新(如「312 条评分」→「你的评分」)。

组件按 WinUI `RatingControl.xaml` 的 ControlTemplate 与 `RatingControl_themeresources.xaml` 复刻:双层星条(背景层恒为轮廓星 U+E734 未选色,前景层实心星 U+E735 逐星裁切,半星用 `clip-path` 裁切且不移动星位),颜色全部取 theme.css 的 `--wui-rating-control-*` token,浅/深主题自动跟随。

官方文档:

- [RatingControl - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.ratingcontrol)
- [RatingControl 设计指南](https://learn.microsoft.com/windows/apps/design/controls/rating)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | `number \| null`(`v-model:value`) | `null` | 当前评分;`null` = 未评分(源用哨兵 `-1`)。收敛规则:负值 → `null`,≤ 1 → `1`,> `maxRating` → `maxRating` |
| `maxRating` | `number` | `5` | 星星数量;< 1 收敛为 1;调小后 `value` / `placeholderValue` 超出部分静默钳制 |
| `placeholderValue` | `number \| null` | `null` | 未评分时的占位值(半星精度);负值视为未设置,≤ 1 收敛为 1,> `maxRating` 钳制 |
| `initialSetValue` | `number` | `1` | 未评分时按方向键设定的首个值(WinUI `InitialSetValue`) |
| `isClearEnabled` | `boolean` | `true` | 是否允许清除:点击当前值星星、或值减到 0 时回到未评分 |
| `isReadOnly` | `boolean` | `false` | 只读:无悬浮预览、点击与键盘均无效;带 `aria-readonly` |
| `caption` | `string` | `''` | 星条右侧 12px 说明文字(WinUI `Caption`),如「请评分」「312 条评分」 |
| `disabled` | `boolean` | `false` | 禁用(Web 侧对应 WinUI `Control.IsEnabled`) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `valueChanged` | `(e: { oldValue: number \| null; newValue: number \| null })` | 点击/键盘提交评分时触发;与 WinUI 一致,**命中提交路径即触发,即使值未变**(如满值时再按 `End`) |
| `update:value` | `(value: number \| null)` | `v-model:value` 双向绑定事件 |

模板中监听写法:`@value-changed="onValueChanged"`。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import RatingControl from '@/components/RatingControl.vue'

// null = 未评分(WinUI 哨兵 -1)
const rating = ref<number | null>(null)
</script>

<template>
  <RatingControl v-model:value="rating" caption="请评分" @value-changed="onValueChanged" />

  <!-- 10 颗星、占位值 3.5、只读 -->
  <RatingControl :value="null" :max-rating="10" :placeholder-value="3.5" is-read-only />
</template>
```

## 交互行为

- **点击**:评分到所点之星(ceil 取整);**再次点击当前值之星且 `isClearEnabled` 时清空**(源 `SetRatingTo` 语义:键盘在满值时保持稳定,鼠标点击同值则清除)。
- **拖动**:按住后指针被捕获,可拖出左边缘清空(源 `CapturePointer` 支持的「swipe left to clear」);松开时按 `ceil(指针百分比 × maxRating)` 提交。
- **键盘**:`→`/`↑` +1、`←`/`↓` −1(未评分时取 `initialSetValue`;分数值先截断再加减,源 `ChangeRatingBy`);`Home` 清空(未评分时无动作)、`End` 满值。
- **悬浮预览**:预览值临时盖过 `value`/`placeholderValue`;只读/禁用时不预览。
- **清空的条件**(`isClearEnabled`):点击同值星、`←` 减到 0、`Home`、拖出左缘;`isClearEnabled=false` 时减到 0 会回到 1。
- **无「双击清空」**:对照源实现,清空靠「再点当前值星」或上述键盘/拖动手势,不是双击。

## 无障碍

- 源 AutomationPeer 为 **Slider 控制类型**(RangeValue + Value 模式),组件对应 `role="slider"`:
  - `aria-valuemin="0"`、`aria-valuemax="maxRating"`、`aria-valuenow`(未评分报 0,UIA 不容忍 null);
  - `aria-valuetext`:已评报「`v / max 星`」,占位报「`v / max 星(占位)`」,未评分报「未评分」;
  - 只读带 `aria-readonly`,禁用带 `aria-disabled`;控件可聚焦(Tab),禁用时不进 Tab 序。
- 星条对读屏隐藏(`aria-hidden`),仅保留 slider 语义节点;`aria-label` 等属性经 `$attrs` 透传。

## 与 WinUI 的差异

1. **`value` 类型**:WinUI `Value` 为 double(哨兵 -1 = 未评分),Web 侧建模为 `number | null`,更贴合 JS 习惯;源允许程序化设分数值(如 2.5,显示为半星),交互路径(点击/键盘)只产生整数。
2. **无 token 项**(按源值直用):星 16px、星距 8px(`RatingControlItemSpacing`)、文字与星条间距 12px(源代码注释标注,红色线稿的 8px 实为 12px)、控件 `MinHeight` 32、caption 字号 12px(`CaptionTextBlockStyle`)。
3. **禁用星色**:源 `RatingControlDisabledSelectedForeground` = `TextFillColorDisabledBrush`,rating token 族无对应项,取最近似既有 token `--wui-button-foreground-disabled`(`#00000066` / `#ffffff66`,与各控件禁用文字同值)。
4. **悬浮星星缩放动画**:源用 Composition 表达式让靠近指针的星放大(0.5–0.8 标度),但本快照中 `starsScaleFocalPoint` 从未随指针更新(仅重置为 -100),表达式恒取下限 0.5——即星恒为 16px 实际尺寸、无缩放。Web 按该实际观感呈现(静态 16px),未复刻缩放。
5. **双倍渲染技巧**:源以 `FontSize 32` 渲染再整体缩放 0.5(文本缩放兼容),Web 直接以 16px 呈现,视觉效果一致。
6. **自定义字形/图片**(`ItemInfo` → `RatingItemFontInfo` / `RatingItemImageInfo`)未迁移,固定使用 Segoe Fluent Icons 的 U+E734(轮廓)/ U+E735(实心);字体依赖本机字体栈(与 FontIcon 一致),无网络字体加载。
7. **焦点视觉**:WinUI 为系统焦点框(`UseSystemFocusVisuals`,FocusVisualMargin -8,-7),Web 实现为控件外围 2px accent 轮廓(`outline-offset: 2px`)。
8. **状态切换动效**:源前景色切换为瞬时(VisualState Setter),Web 加 167ms 颜色过渡(`--wui-duration-fast`);裁切为瞬时(与源 Clip 一致)。
9. **未迁移**:游戏板 focus engagement(A 键进入/退出并回滚)、`ElementSoundPlayer` 音效、RTL 下方向键反向(源 FlowDirection 镜像)、UIA 属性变更广播(以原生 aria 属性替代)。
10. **占位值收敛写回**:源把非法 `PlaceholderValue` 写回依赖属性(如 0 → 1,TwoWay 绑定的滑杆会跟随到 1);Web 侧 `placeholderValue` 为单向 prop,在读取处收敛(视觉一致,父级模型值不变),示例页因此把滑杆 0 映射为「未设置」。

## 在 WinUI 中的典型场景(对照官方示例)

- 简单评分:`<RatingControl />`(默认 5 星,`IsClearEnabled` + `Caption`)
- 文字说明:`Caption="312 ratings"`,评分后切换为「Your rating」(官方示例在 `ValueChanged` 中改 Caption)
- 占位值:`PlaceholderValue` 绑定滑杆(步长 0.5),展示半星占位
- 只读展示:历史评分展示用 `IsReadOnly="True"`
