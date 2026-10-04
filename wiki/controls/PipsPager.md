# PipsPager

> 在线示例:[/#/pipspager](/#/pipspager) —— 路由 `/#/pipspager`

## 概述

PipsPager 让用户在一组分页内容之间导航,且与展示的内容相互独立:每个页面用一枚小圆点(pip)表示,点击 pip 跳页,两端的导航按钮可配置为恒显、悬停/键盘聚焦时显示或完全隐藏。当内容在布局中不需要按相关度显式排序、或希望以图形化方式表示页码时适用;常见于照片查看器、应用列表、轮播(carousel)等展示空间有限的场景。

本组件按 WinUI 源码复刻:视觉对照 `controls/dev/PipsPager/PipsPager.xaml`(ControlTemplate:pip 列表 + 前后导航按钮)与 `PipsPager_themeresources.xaml`(pip/导航按钮的四态样式、尺寸与字号),行为对照 `controls/dev/PipsPager/PipsPager.cpp`(`UpdatePipsItems` 无限页增长、`SetScrollViewerMaxSize` 裁剪、`ScrollToCenterOfViewport` 选中居中、`UpdateIndividualNavigationButtonVisualState` 边缘隐藏与禁用)。颜色、字号、圆角取自 `--wui-*` 主题 token,随 `html[data-theme]` 明暗切换。

官方文档:

- [PipsPager - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.pipspager)
- [PipsPager - Guidelines](https://learn.microsoft.com/windows/apps/design/controls/pipspager)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `numberOfPages` | `number` | `-1` | 总页数(源默认即 -1)。负值 = 无限页:pip 初始为 `maxVisiblePips` 枚,选中落到末 pip 时追加一枚(始终多出「下一页」暗示的 pip);`0` = 空态:pip 全部清除,导航按钮转入隐藏 + 禁用;页数变小时选中索引自动钳制到末页 |
| `selectedPageIndex` | `number` | `0` | 当前选中页索引(0 起,v-model:`v-model:selected-page-index`);越界写入自动收敛(源 `OnSelectedPageIndexChanged`:> 末页取末页、< 0 取 0,页数为 0 时不检查) |
| `maxVisiblePips` | `number` | `5` | pip 可见数量上限;超出部分被裁剪,选中 pip 滚动到视口中央(源 `ScrollToCenterOfViewport` 对齐比 0.5);`0` 时隐藏全部 pip。负值按 0 处理 |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | 排列方向;横向时导航按钮整体旋转 -90°(源 RenderTransform),pip 按钮 12×24(横)/ 24×12(纵)随向互换 |
| `previousButtonVisibility` | `'visible' \| 'visibleOnPointerOver' \| 'collapsed'` | `'collapsed'` | 「上一页」按钮可见性(**源默认值即 Collapsed**):`visible` 恒显;`visibleOnPointerOver` 悬停或键盘聚焦控件时显示;`collapsed` 移出布局。任何非 collapsed 模式下到达首页边缘都转入隐藏态(透明但保留布局与命中,源 `Opacity=0`),`wrapMode="wrap"` 且页数 > 1 时豁免;不满足一般可见条件(空态/边缘无环绕)时同时禁用 |
| `nextButtonVisibility` | `'visible' \| 'visibleOnPointerOver' \| 'collapsed'` | `'collapsed'` | 「下一页」按钮可见性,规则同上(末页边缘隐藏) |
| `wrapMode` | `'none' \| 'wrap'` | `'none'` | 环绕模式(源 1.5+ 新增):`wrap` 时首页「上一页」跳到末页、末页「下一页」回到首页 |
| `disabled` | `boolean` | `false` | 禁用(对应 WinUI `Control.IsEnabled`),全部按钮不可用 |

其余 HTML 属性(`class`、`style`、`aria-*` 等)经 `v-bind="$attrs"` 透传至根元素。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectedIndexChanged` | `(e: { oldIndex: number; newIndex: number })` | 选中页变化时触发(点击 pip、点击导航按钮、外部写回收敛)。WinUI 源事件参数类 `PipsPagerSelectedIndexChangedEventArgs` 无成员,Web 侧扩展携带前后索引 |
| `update:selectedPageIndex` | `(index: number)` | `v-model:selectedPageIndex` 双向绑定事件 |

模板中监听写法:`<PipsPager @selected-index-changed="onIndexChanged" />`。

## 键盘交互

- `←` / `↑`:聚焦上一个 pip;`→` / `↓`:聚焦下一个 pip(源 `OnKeyDown` 的 `FocusManager.TryMoveFocus`,到端点停止不回绕);
- `Tab`:进入 pip 区时直接聚焦选中的 pip(源 `OnPipsAreaGettingFocus` 把外部进入的焦点重定向到选中 pip;Web 用 roving tabindex 实现);
- `Space` / `Enter`:激活聚焦的 pip 或导航按钮(原生按钮语义);
- 悬停或键盘聚焦控件时,`visibleOnPointerOver` 模式的导航按钮显示(源 `m_isPointerOver` / 键盘 `GotFocus`);指针移出或失焦后隐藏。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import PipsPager from '@/components/PipsPager.vue'

const page = ref(0)
</script>

<template>
  <!-- 与内容区双向联动:官方 FlipView 集成示例即 SelectedPageIndex={x:Bind Gallery.SelectedIndex, Mode=TwoWay} -->
  <PipsPager
    v-model:selected-page-index="page"
    :number-of-pages="5"
    previous-button-visibility="visible"
    next-button-visibility="visible"
    @selected-index-changed="onIndexChanged" />

  <!-- 纵向 + 悬停显示导航按钮 + 环绕 -->
  <PipsPager
    v-model:selected-page-index="page"
    :number-of-pages="10"
    :max-visible-pips="5"
    orientation="vertical"
    previous-button-visibility="visibleOnPointerOver"
    next-button-visibility="visibleOnPointerOver"
    wrap-mode="wrap" />
</template>
```

> 示例页「用法」代码块按 WinUI 习惯以 PascalCase 展示属性名(`NumberOfPages`、`MaxVisiblePips` 等),
> 实际书写请使用上表的 camelCase 属性名(模板中亦可用 kebab-case)。

## 与 WinUI 的差异说明

对照 `controls/dev/PipsPager/PipsPager.xaml`、`PipsPager_themeresources.xaml`、`PipsPager.cpp` 与 theme.css token 的取值映射:

| WinUI 取值 | Web 实现 | 说明 |
| --- | --- | --- |
| `PipsPagerSelectionIndicatorForeground` / `PipsPagerNavigationButtonForeground`(Normal,`ControlStrongFillColorDefaultBrush`) | PL13 直引全局 `--wui-control-strong-fill-color-default`(局部别名 `--wui-pips-indicator` 保留、值改指向全局 token;删除 `html[data-theme='dark']` 覆盖) | 浅 `#00000072` / 深 `#FFFFFF8B`,明暗随 token 自带;pip 与导航按钮共色 |
| `…ForegroundPointerOver` / `…ForegroundPressed`(`TextFillColorSecondaryBrush`) | 全局 `--wui-text-fill-color-secondary`(局部别名 `--wui-pips-indicator-hover`) | 浅 `#0000009E` / 深 `#FFFFFFC5`;悬停/按下比常态更实 |
| `…ForegroundDisabled`(`ControlStrongFillColorDisabledBrush`) | 全局 `--wui-control-strong-fill-color-disabled`(局部别名 `--wui-pips-indicator-disabled`) | 浅 `#00000051` / 深 `#FFFFFF3F` |
| pip/导航按钮 `Background`、`BorderBrush`(各状态均为 `ControlFillColorTransparentBrush`) | `--wui-control-fill-color-transparent` | 与源一致(透明) |
| `ControlCornerRadius` = 4(pip 与导航按钮 CornerRadius) | `--wui-hyperlink-focus-rect-corner-radius`(4px) | 无同名圆角 token,以同值 4px 变量承载(项目既有约定) |
| pip 字形 `\uEA3B`,字号 Normal 4px / Selected(hover)6px(`PipsPagerNormalGlyphFontSize` / `PipsPagerSelectedGlyphFontSize`) | 同字形 + `--wui-symbol-theme-font-family` 本机字体栈 | 与源一致;依赖本机 Segoe Fluent Icons / MDL2 字体(项目 R1 裁决不做网络字体加载) |
| 导航按钮字形 `\uEDDB` / `\uEDDC`,字号 8px(`PipsPagerNavigationButtonFontSize`),横向整体旋转 -90° | 同字形 + 同字体栈,`transform: rotate(-90deg)` | 与源一致;RTL 的 `MirroredWhenRightToLeft` 未实现(项目暂无 RTL 场景) |
| 导航按钮按下缩放 `PipsPagerNavigationButtonScalePressed` = 0.875(源为 0.016s~30s 的 Discrete 双帧循环动画) | `:active` 时对字形 `transform: scale(0.875)`,松开还原 | 源动画效果为「按住保持 0.875」,CSS 静态缩放等价 |
| pip 按钮 12×24(横)/ 24×12(纵)、导航按钮 24×24(`PipsPager*OrientationButton*` / `PipsPagerNavigationButton*` 资源) | 同尺寸硬编码为常量 | 数值与源一致;无对应尺寸 token |
| `MaxVisiblePips` 裁剪(`SetScrollViewerMaxSize`:主轴 = pip 宽 ×(n-1)+ 选中 pip 宽)+ 选中 pip `StartBringIntoView`(对齐比 0.5、带动画) | `overflow: hidden` 容器 + `scrollTo({ behavior: 'smooth' })` 居中 | 行为等价;源 ScrollViewer 滚动条本就隐藏 |
| 无限页(`NumberOfPages = -1`)`UpdatePipsItems` 增长策略(append-only,只增不减) | 稳态:`maxVisiblePips ≤ 1` 时 `pipCount = sel+1`;≥ 2 时 `pipCount = max(maxVisiblePips, sel+2)` —— 选中末 pip 时恒多出「下一页」暗示的一枚 | 稳态一致;源按历史逐枚 Append(回退后不收缩),Web 为选中索引的纯函数(回退后 pip 数随之收缩),无限页场景无实际影响;pip 区不做虚拟化(源 ItemsRepeater 虚拟化对 ≤ 数十枚 pip 无感知差异) |
| `SelectedIndexChanged` 事件参数类无成员 | 扩展为 `{ oldIndex, newIndex }` | 便于消费;若需严格对齐可忽略参数 |
| `PipsPagerTemplateSettings.PipsPagerItems`(模板绑定用内部集合) | 不暴露 | 模板定制场景在 Web 侧用插槽/样式覆盖解决,非控件公开 API |
| AutomationPeer:`AutomationControlType.Menu` + Selection 模式,pip 名为「Page N」+ PositionInSet/SizeOfSet | 根 `role="group"`,pip 为原生 `button` + `aria-label="Page N"` + `aria-posinset`/`aria-setsize`/`aria-current` | Web 无 Menu 语义对应物,取等效的 group + 按钮组合;导航按钮 `aria-label="Previous page"` / `"Next page"`(与源本地化资源一致,并以 `title` 提供悬停提示,对应源 ToolTip 绑定 AutomationProperties.Name) |
| `Hidden` 边缘态(按钮 `Opacity=0`,保留布局与命中) | `.is-hidden { opacity: 0 }` | 与源一致(注意与 `Collapsed` 移出布局的区别);源在隐藏且不可见时同时 `IsEnabled=false`,Web 同步禁用 |
| 方向键移动的是**焦点**(源 `OnKeyDown` → `TryMoveFocus`) | 同语义:方向键移动 pip 焦点,不直接改选中 | 与源一致;Enter/Space 确认选中 |

## 相关链接

- 在线示例:`/#/pipspager`
- 演示页源码:`demo/pages/PipsPagerPage.vue`
- 相关控件:FlipView(待实现,联动目标)、ScrollViewer、ItemsRepeater
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
