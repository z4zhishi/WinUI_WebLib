# SwipeControl

> 在线示例:[/#/swipecontrol](/#/swipecontrol) · 演示页源码:[demo/pages/SwipeControlPage.vue](../../demo/pages/SwipeControlPage.vue)

## 概述

SwipeControl(轻扫控件)是一种**触摸手势容器**:在内容上横向轻扫,即可揭示其下的快捷操作菜单("Touch gesture for quick menu actions on items")。典型的邮件客户端交互——右滑标记已读、左滑删除——就是它的标准用例。

每个操作块是一个 `SwipeItem`(文本 + 图标 + 满高背景色块),通过 `leftItems` / `rightItems` 两组提供(向右拖揭示左组,向左拖揭示右组)。每组可独立选择两种模式(WinUI `SwipeItems.Mode`):

- **Reveal(揭示)**:松手后停在完全打开,用户点选某个揭示项触发;
- **Execute(执行)**:拖过阈值(100px)松手立即触发并回弹,适合单一动作。

组件按 `CK/WinUI-Reference/controls/dev/SwipeControl/` 的源码复刻(SwipeControl.xaml 默认模板、SwipeControl.cpp 的阈值/关闭逻辑、SwipeItem.cpp 的调用行为、generic.xaml L1853-1859 的颜色资源),颜色全部取 theme.css 的 `--wui-*` token,浅/深主题自动跟随。

官方文档:

- [SwipeControl - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.swipecontrol)
- [SwipeItems - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.swipeitems)
- [轻扫设计指南](https://learn.microsoft.com/windows/apps/design/controls/swipe)
- [集合命令交互](https://learn.microsoft.com/windows/apps/design/controls/collection-commanding)

## 属性

### SwipeControl

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `leftItems` | `SwipeItemOptions[]` | `[]` | 左侧项组(WinUI `LeftItems`):向右拖揭示;数组式配置,与 `#left` slot 二选一 |
| `rightItems` | `SwipeItemOptions[]` | `[]` | 右侧项组(WinUI `RightItems`):向左拖揭示;与 `#right` slot 二选一 |
| `leftMode` | `'Reveal' \| 'Execute'` | `'Reveal'` | 左侧组模式(WinUI `SwipeItems.Mode`) |
| `rightMode` | `'Reveal' \| 'Execute'` | `'Reveal'` | 右侧组模式 |
| `disabled` | `boolean` | `false` | 禁用:不可拖拽揭示;已打开时立即关闭 |

具名 slot:`#left` / `#right` 放置 `<WuiSwipeItem>` 组件(替代数组配置,可获得每项独立的 `@invoked` 监听);默认 slot 为控件内容。

### SwipeItem

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | `''` | 项文本(WinUI `Text`),显示在图标下方 |
| `icon` | `string` | `''` | 图标字形字符(对应 `FontIconSource.Glyph`,如 `'\uE74D'`) |
| `background` | `string` | `''` | 背景色块颜色;Execute 模式未设置时按阈值切换 pre/post accent 配色 |
| `foreground` | `string` | `''` | 前景色(图标与文本) |
| `behaviorOnInvoked` | `'Auto' \| 'Close' \| 'RemainOpen'` | `'Auto'` | 触发后行为(WinUI `BehaviorOnInvoked`) |
| `disabled` | `boolean` | `false` | 禁用本项 |

## 事件与方法

| 事件 / 方法 | 参数 | 触发时机 |
| --- | --- | --- |
| `SwipeItem` · `invoked` | `(e: { swipeControl })` | 项被调用:Execute 过阈值松手,或点击已揭示的 Reveal 项 |
| `SwipeControl` · `invoked` | `(e: { item, side, index, swipeControl })` | 同上的控件级 relay(Web 侧追加,数组式用法的统一入口) |
| `close()` | — | 控件方法(`defineExpose`):程序化关闭揭示层(WinUI `Close`) |

模板中监听写法:`<WuiSwipeItem @invoked="onItemInvoked" />`、`<WuiSwipeControl @invoked="onInvoked" />`。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import SwipeControl from '@/components/SwipeControl.vue'
import SwipeItem from '@/components/SwipeItem.vue'

const mails = ref([{ id: 1, title: '邮件 1' }, { id: 2, title: '邮件 2' }])
</script>

<template>
  <!-- 数组式:两侧 Execute,过阈值松手触发 -->
  <SwipeControl
    v-for="mail in mails"
    :key="mail.id"
    :left-items="[{ text: '标为已读', icon: '\uE8C3' }]"
    :right-items="[{ text: '删除', icon: '\uE74D' }]"
    left-mode="Execute"
    right-mode="Execute"
    @invoked="(e) => console.log(e.item.text, e.side)"
  >
    {{ mail.title }}
  </SwipeControl>

  <!-- slot 式:Reveal 揭示后点选,项可监听各自 invoked -->
  <SwipeControl>
    <template #left>
      <SwipeItem text="接受" icon="\uE8FB" @invoked="onAccept" />
      <SwipeItem text="标记" icon="\uE129" @invoked="onFlag" />
    </template>
    内容
  </SwipeControl>
</template>
```

## 交互行为

- **拖拽揭示**:按住内容横向拖动,内容 1:1 跟手平移,揭示活动侧操作块;反方向拖动收回(打开态只在本侧开合,不会中途换侧)。触摸为主(`touch-action: pan-y` 保留页面纵向滚动),Web 侧鼠标/手写笔同样可用。
- **阈值**(源 `c_ThresholdValue = 100`):生效阈值 = `min(揭示尺寸, 100px)`。
  - Execute:过阈值松手 → 调用该侧首个项;未过 → 回弹关闭。项未设自定义背景时,拖动中按阈值切换两档配色:阈前 = base low 底 / base medium 前,阈后 = accent 底 / chrome white 前(仅首个项生效,源只消费 `GetAt(0)`)。
  - Reveal:过阈值松手 → 停在完全打开;未过 → 回弹关闭;点击揭示项触发调用。
  - **已打开态回拖**:保持打开的条件是仍处于(几乎)全幅——源在 `isNearOpen`/`isFarOpen` 时的 resting 条件是「全幅」而非 `min(尺寸,100)`;任何实质回拖都会关闭(容差 1px 抵消指针取整)。
- **Execute 视差**:Execute 项以 0.5× 指速滑入,满幅时恰好盖满内容区(源 `m_executeExpressionAnimation` 的 Web 等效)。
- **`behaviorOnInvoked`**(源 `SwipeItem.InvokeSwipe`):`Auto` / `Close` → 触发后关闭揭示层;`RemainOpen` → 保持打开。Execute + RemainOpen 停在满幅后**锁定**:不再接受拖拽与点按关闭(源 `OnPointerPressedEvent` 提前返回)。
- **关闭路径**(源 `AttachDismissingHandlers` / `InputEaterGridTapped` / `s_lastInteractedWithSwipeControl`):点击已打开层的内容区、点击控件外部、焦点在控件外时的键盘输入、另一个 SwipeControl **开始拖拽**(位移超过死区;源为 ValuesChanged 时登记)都会关闭当前打开的层。
- **多控件互斥**:同一页面多个 SwipeControl 同时只有一个保持打开。
- **尺寸**:控件 `MinWidth 88 / MinHeight 40`(`ListViewItemMinWidth/MinHeight`);项 `MinWidth 68`、满高;窗口尺寸变化时揭示宽度自动钳制。

## 无障碍

- 源 `SwipeControl` 为 `IsTabStop=False` 的容器(内容原样可聚焦),组件根节点不进 Tab 序;关闭态揭示层带 `inert` + `aria-hidden`,揭示项不进 Tab 序(对应源「内容按需创建」语义)。
- 揭示项为原生 `button`:`text` 作为 `aria-label`,`Tab` 可达、`Enter` / `Space` 触发(源为触摸优先的 Raw 视图,Web 侧补足键盘可达,见差异说明)。
- 打开层中的非活动侧面板 `visibility: hidden` + `inert`,不会被读屏与键盘命中。
- 控件级 `aria-label` 等属性经 `$attrs` 透传到根节点。

## 与 WinUI 的差异

1. **项集合的建模**:WinUI `LeftItems`/`RightItems` 是 `SwipeItems` 集合对象(`Mode` 挂在集合上);Web 组件拆为 `leftItems`/`rightItems` 数组 + `leftMode`/`rightMode` 两个 prop,另提供 `#left`/`#right` slot 直接放 `WuiSwipeItem`(两者可混用,事件路径一致)。
2. **`Auto` 在 Reveal 模式的语义**:learn.microsoft.com 文档描述 `Auto` 在 Reveal 模式触发后保持打开;但本快照源码 `SwipeItem.cpp` 中 `Auto` 与 `Close` 一律关闭(含 Reveal)。组件**按快照源码实现**(Auto 触发后关闭);需要保持打开请显式设 `behaviorOnInvoked: 'RemainOpen'`。
3. **方向范围**:仅水平方向(`leftItems`/`rightItems`);WinUI 的 `TopItems`/`BottomItems`(垂直轻扫)未迁移。
4. **图标**:WinUI `IconSource` 是对象(`FontIconSource`/`BitmapIconSource` 等);Web 收敛为 `icon` 字形字符(字体栈与 FontIcon 一致,不加载网络字体)。`BitmapIconSource` 图片图标(官方 Example5 的咖啡杯)未迁移,可用 `background`/`foreground` 近似替代。
5. **指针来源**:WinUI 仅触摸与可摸触控板参与轻扫(`TryRedirectForManipulation` + `CapableTouchpadOnly`);Web 用 Pointer Events,鼠标/手写笔同样可拖(演示与自动化测试便利),触摸优先不变。
6. **惯性(甩动)**:WinUI InteractionTracker 带速度惯性——轻甩即可越过阈值并滑到满幅;Web 阈值只看位移,不计算速度,需拖过阈值再松手。
7. **颜色 token 对照(PL15 重定向,权威 = controls/dev `SwipeControl_themeresources.xaml` L5-11/L13-20;legacy `SystemControl*` 仅存于 HighContrast 字典)**:`SwipeItemBackground` → `--wui-control-fill-color-tertiary`(浅 `#F9F9F94D` / 深 `#FFFFFF08`);`SwipeItemForeground` → `--wui-text-fill-color-primary`;`SwipeItemBackgroundPressed` → `--wui-control-alt-fill-color-quarternary`(`#18000000`/`#12FFFFFF`);Execute 阈前前景 `ControlStrongFillColorDefault` → `--wui-control-strong-fill-color-default`;阈后底 `AccentFillColorDefault` → `--wui-accent-fill-color-default`、前景 `TextOnAccentFillColorPrimary` → `--wui-text-on-accent-fill-color-primary`;控件根背景 `SwipeControl.xaml` L5 `Background="Transparent"` 保留。此前「generic.xaml L1853-1859 全部有对应 token」的 legacy 表述作废。禁用态:源 `SwipeItemStyle` 的 `Disabled` 视觉态为空(仅不可交互,颜色不变),Web 同样不做禁用变灰。源结构尺寸无 token,按源值直用:控件 Min 88×40(`ListViewItemMinWidth/MinHeight`)、项 MinWidth 68(`s_swipeItemWidth`)、内容盒 Margin 4,4,4,2、图标 16px、文本 12px(`SwipeItemStyle`)。总览见 [_brushes.md](./_brushes.md)。
8. **边框/背景落点**:WinUI 模板把 `BorderBrush`/`BorderThickness`/`Padding`/`CornerRadius` 放在内容 `ContentPresenter` 上(揭示区无边框);Web 将 `$attrs` 绑定在控件根,边框包住整个控件,闭合态视觉一致,打开态揭示区会多一圈边框。
9. **内容裁切**:Web 根节点 `overflow: hidden`,平移中的内容不会溢出控件矩形;WinUI 依赖列表父级裁切,独立摆放时内容可滑出控件边界。
10. **`Command`/`ICommand`**(`XamlUICommand` 自动绑定 Text/Icon)未迁移:调用一律走 `invoked` 事件。
11. **关闭的键盘范围**:源为「任意 KeyDown 即关」;Web 限定为焦点/目标不在控件内的按键,否则揭示项的 Enter/Space 会被关闭路径抢掉。
12. **事件**:WinUI `SwipeControl` 无公共事件(`invoked` 在 `SwipeItem` 上);Web 在控件上追加了同名 `invoked` relay(带 `{ item, side, index, swipeControl }`),数组式配置经它统一监听,slot 式两项都可监听。
13. **未迁移**:游戏板交互、`ElementSoundPlayer` 音效、RTL `FlowDirection` 镜像、UIA 属性广播(以原生 `inert`/`aria-hidden`/button 语义替代)、测试钩子(`SwipeTestHooks`)。
14. **状态动效**:松手回弹 / 吸附打开用 240ms 标准缓动过渡(源为 InteractionTracker 惯性曲线);拖拽中 1:1 跟手无过渡;`prefers-reduced-motion` 下过渡近零(全局规则)。

## 在 WinUI 中的典型场景(对照官方示例)

- 邮件列表命令:左滑删除(Red 色块 Execute)、右滑标记/归档(官方 Example3 的 ListView 模板用法);
- 揭示点选:左滑出 Accept/Flag 等多项,点选后切换图标与文本状态(官方 Example1);
- 触发后保持打开:`BehaviorOnInvoked="RemainOpen"` 用于执行后仍需展示状态的场景(官方 Example2 的 Archive 切换文案);
- 自定义配色:每项 `Background`/`Foreground` 自由上色(官方 Example3 的 `#3e6fa7` / `#ff9501` / Red 配色)。
