# Expander

> 在线示例:[/#/expander](/#/expander) · 演示页源码:[demo/pages/ExpanderPage.vue](../../demo/pages/ExpanderPage.vue)

## 概述

Expander 由一个**常显的头部**和**可展开 / 收起的内容区**组成:点击头部(或聚焦后按空格 / 回车)即可展开查看更多内容,再次点击收起。适合只在部分场景才相关的内容,例如「阅读更多」或某个条目的附加选项。头部右侧的 chevron 箭头旋向随 `ExpandDirection` 与展开状态联动;内容区以高度过渡动画展开(左右方向为宽度过渡)。WinUI 的 Expander 基于 `controls/dev/Expander/Expander.xaml` 模板复刻:头部本质是一个 ToggleButton,交互焦点与 `aria-expanded` 都落在头部按钮上。

官方文档:

- [Expander - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.expander)
- [Expander 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/expander)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `header` | `string` | `''` | 头部文本(WinUI `Header`);同名 `#header` slot 优先,两者均为空时不渲染头部文本(头部仍可点击) |
| `expandDirection` | `'Down' \| 'Up' \| 'Left' \| 'Right'` | `'Down'` | 展开方向:内容相对头部的方位;边框、圆角与箭头旋向随动。Left/Right 为 Web 扩展(见差异节) |
| `isExpanded` (v-model) | `boolean` | `false` | 展开状态(WinUI `IsExpanded`),双向绑定 |
| `disabled` | `boolean` | `false` | 禁用头部交互与焦点(WinUI `IsEnabled = false` 的取反映射),呈禁用配色 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `expanding` | — | 用户交互触发展开动画**前**(WinUI `Expanding`) |
| `expanded` | — | 展开过渡**结束后**(WinUI `Expanded`,同为动画完成时机) |
| `collapsing` | — | 用户交互触发收起动画前(WinUI `Collapsing`) |
| `collapsed` | — | 收起过渡结束后(WinUI `Collapsed`) |
| `update:isExpanded` | `(value: boolean)` | `v-model:is-expanded` 双向绑定更新 |

事件仅在**用户交互**(点击 / 键盘)时触发;程序化修改 `v-model:is-expanded` 仍会播放动画,但不触发 `expanding` / `collapsing`(与 ToggleButton 等组件的约定一致),收尾的 `expanded` / `collapsed` 也随之省略。`expanded` / `collapsed` 以内容区 `transitionend` 为主、定时器兜底,每次切换只发一次。

## Slot

| Slot | 说明 |
| --- | --- |
| `header` | 自定义头部内容(优先于 `header` 属性),可放任意元素(如居中文本) |
| 默认 slot | 展开后的内容区 |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiExpander from '@/components/Expander.vue'

const isExpanded = ref(false)
const nestedExpanded = ref(true)

function onExpanding() { console.log('Expanding') }
function onExpanded() { console.log('Expanded') }
</script>

<template>
  <!-- 文本头部 + 文本内容 -->
  <WuiExpander
    v-model:is-expanded="isExpanded"
    header="This text is in the header"
    expand-direction="Down"
    @expanding="onExpanding"
    @expanded="onExpanded">
    This is in the content
  </WuiExpander>

  <!-- slot 头部 + 嵌套 Expander -->
  <WuiExpander header="外层分组">
    <WuiExpander v-model:is-expanded="nestedExpanded" header="内层项">
      内层内容
    </WuiExpander>
  </WuiExpander>
</template>
```

## 无障碍

- 头部为原生 `<button>`:空格 / 回车激活,天然可聚焦;`aria-expanded` 随状态同步,`aria-controls` 指向内容区 id。
- 调用方可通过根元素的 `aria-*` 属性透传补充(如 `aria-label`),会作用于头部按钮。
- 收起状态下内容区 `visibility: hidden`,移出焦点序与可访问性树;`prefers-reduced-motion` 时过渡时长趋近 0(animations.css 全局降级)。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `controls/dev/Expander/Expander.xaml`(ControlTemplate)与 `Expander_themeresources.xaml`(头部按钮四交互态 Normal/PointerOver/Pressed/Disabled 及 Checked 组合态)复刻。Expander 是 WinUI 3 的 Fluent 2 控件,其主题资源引用 **Card\*/Subtle\*/TextFill\* 系列画刷**,这些画刷未被 theme.css 收录(theme.css 提取自经典 generic.xaml 主题字典),按「最近似 token」规则映射如下:

| 源资源(WinUI 3) | 本组件 token | 差异说明 |
| --- | --- | --- |
| `ExpanderHeaderBackground` ← `CardBackgroundFillColorDefault` | `--wui-flyout-presenter-background`(#F2F2F2 / #2B2B2B) | 源为 70% 半透明白卡面叠在 Mica 层上;Web 取最近似的不透明中性表面 token,浅 / 深主题观感接近 |
| `ExpanderContentBackground` ← `CardBackgroundFillColorSecondary` | `--wui-combo-box-drop-down-background`(#F2F2F2 / #2B2B2B) | 源卡面次级填充与主填充在页面上几乎同色,差异可忽略 |
| `ExpanderHeaderBorderBrush` / `ExpanderContentBorderBrush` ← `CardStrokeColorDefault` | `--wui-system-control-background-base-low`(#00000033 / #FFFFFF33) | 与 demo 画布描边同款发丝线,深色主题下比源的暗色卡描边更亮 |
| `ExpanderHeaderForeground` 等 ← `TextFillColorPrimary` | `--wui-default-text-foreground-theme` | 源主文本色约 90% 不透明度,token 为不透明,肉眼差异极小 |
| `ExpanderHeaderDisabledForeground` ← `TextFillColorDisabled` | `--wui-toggle-switch-content-foreground-disabled`(#00000066 / #FFFFFF66) | 源约 36% 不透明度,token 为 40% |
| `ExpanderChevronPointerOverBackground` ← `SubtleFillColorSecondary` | `--wui-grid-view-item-background-pointer-over`(#00000019 / #FFFFFF19) | 源约 3.5% 叠加,token 为 10%,悬停反馈略强 |
| `ExpanderChevronPressedBackground` ← `SubtleFillColorTertiary` | `--wui-grid-view-item-background-pressed`(#00000033 / #FFFFFF33) | 同上,按压反馈略强 |

其余无 token / 做 Web 等价替换的项:

1. **Left/Right 展开方向为 Web 扩展**:参照源枚举仅 `Down = 0 / Up = 1`(`Expander.idl` L46-L49),`UpdateExpandDirection` 也只处理 Down/Up 两态。任务规格要求四方向,Left/Right 的边框(`0,1,1,1` / `1,1,0,1`)、圆角裁切与箭头旋向按 Down/Up 的同构语义推演,WinUI 无官方对应视觉。
2. **圆角 token 未提取**:`ControlCornerRadius = 4` 未在 theme.css 生成同名 token,取最近似 `--wui-hyperlink-focus-rect-corner-radius`(同为 4px),并按源 `Top/BottomCornerRadiusFilterConverter` 语义只给面向外部的一侧圆角(Down:头部上侧 / 内容下侧,依此类推)。
3. **尺寸资源未提取**:`ExpanderMinHeight = 48`、`ExpanderHeaderPadding = 16,0,0,0`、`ExpanderContentPadding = 16`、`ExpanderChevronButtonSize = 32`、`ExpanderChevronMargin = 20,0,8,0`、`ExpanderChevronGlyphSize = 12`、边框厚度 `1,0,1,1 / 1,1,1,0` 均为 XAML 资源,按值写死为对应 CSS(XAML Thickness 顺序:左,上,右,下)。`MinWidth = FlyoutThemeMinWidth` 因 token 缺失未设置,宽度由内容决定(演示页以 min-width 补足观感)。
4. **箭头动画**:源 `ExpandCollapseChevron` 是 `controls:AnimatedIcon` + `AnimatedChevronUpDownSmallVisualSource`(状态集 `NormalOff` / `PointerOverOff` / `PressedOff` / `NormalOn` / `PointerOverOn` / `PressedOn`,收起 `NormalOff` / 展开 `NormalOn`;见 `Expander_themeresources.xaml` L141/L160/L191 等 Setter),并以字体字形 E70D/E70E 兜底。**源为 LottieGen 编译资产,原始 `.json` 不在 CK 快照内**,Web 以静态字形 E70D + `rotate()` 过渡复刻翻面,旋向随方向与状态联动。时长取源 `c_durationTicks`(`AnimatedChevronUpDownSmallVisualSource.cpp` L104 `43333333` tick,1 tick=100ns = **433.33ms**);缓动取 `linear`——`Expander.xaml` / themeresources 仅对内容位移动画定义 KeySpline,chevron 自身无 XAML KeySpline 可提取(曲线烘焙在 Lottie 内)。源 PointerOver / Pressed 态在 Setter 中仅改写 chevron 前景 / 底色(已由本组件 `:hover` / `:active` 规则覆盖)。
5. **展开 / 收起动画**:源以 RenderTransform 平移 + composition clip 实现(展开 333ms / KeySpline 0,0,0,1,收起 167ms / KeySpline 1,1,0,1);本组件以 `grid-template-rows` 的 0fr↔1fr 过渡等价实现高度动画(Left/Right 为 `grid-template-columns` 宽度过渡),时长与缓动取 animations.css 的 `--wui-duration-slow`(350ms ≈ 333ms)+ `--wui-easing-standard`、`--wui-duration-fast`(167ms)+ `--wui-easing-accelerate` 最近似组合。收起完成后内容区 `visibility: hidden`(源为 `Visibility = Collapsed`)。
6. **属性命名**:`Header` → `header` + `#header` slot;`ExpandDirection` → `expandDirection`;`IsExpanded` → `v-model:is-expanded`;`IsEnabled` → `disabled`。
7. **事件触发面**:WinUI 的 Expanding/Expanded/Collapsing/Collapsed 在程序化赋值时同样触发;本组件仅用户交互触发(见事件节)。源头部按钮态机含 Checked 组合态,但 Checked 系与 Normal 系取键完全相同(仅 AnimatedIcon 状态不同),故视觉上合并实现。
8. **焦点框**:源模板未定义焦点视觉(落在 ToggleButton 默认样式);按项目惯例以单层 `outline: 2px solid var(--wui-system-control-focus-visual-primary)`(偏移 1px)实现 `:focus-visible`。

---

演示页源码:[demo/pages/ExpanderPage.vue](../../demo/pages/ExpanderPage.vue) · 组件源码:[src/components/Expander.vue](../../src/components/Expander.vue)
