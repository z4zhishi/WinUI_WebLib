# AppBarToggleButton

> 在线示例:[/#/appbartogglebutton](/#/appbartogglebutton) · 演示页源码:[demo/pages/AppBarToggleButtonPage.vue](../../demo/pages/AppBarToggleButtonPage.vue)

## 概述

AppBarToggleButton 看起来像 AppBarButton,行为却像 CheckBox:通常在**选中(on)**与**未选中(off)**两种状态之间切换,`IsThreeState` 为 `true` 时还可进入**不确定态(indeterminate)**,当前状态经 `IsChecked` 读取。它同样具备 AppBarButton 的命令栏外观 —— 图标在上、12px 标签在下、默认宽 68,并在选中时点亮整枚按钮的**强调色底**(WinUI 3 默认模板的 `CheckedHighlightBackground`)。典型用途是命令栏中「按下保持」的命令(如加粗/倾斜/对齐);它是 CommandBar 的主力内容控件之一,同族还有 AppBarButton 与 AppBarSeparator。

官方文档:

- [AppBarToggleButton - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.appbartogglebutton)
- [命令栏设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/command-bar)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `icon` | `string` | `''` | 图标:WinUI `Symbol` 枚举名(如 `'Shuffle'`)或 Segoe 字形字符;亦可用 `#icon` slot 放 FontIcon / BitmapIcon / PathIcon 等任意图标元素(slot 优先) |
| `label` | `string` | `''` | 图标下方的文字标签(WinUI `Label`);`isCompact` 时隐藏,并作为无障碍名 |
| `isChecked` (v-model) | `boolean \| 'indeterminate'` | `false` | 选中状态(WinUI `IsChecked`);`'indeterminate'` 对应 `IsChecked = null`,双向绑定 |
| `isThreeState` | `boolean` | `false` | 是否允许用户点击进入不确定态(WinUI `IsThreeState`) |
| `isCompact` | `boolean` | `false` | 紧凑态(WinUI `IsCompact`):仅显示图标、隐藏标签(ApplicationViewStates → Compact) |
| `keyboardAcceleratorText` | `string` | `''` | 加速键文本(WinUI `KeyboardAcceleratorTextOverride`,如 `'Ctrl+S'`):按源只在**溢出菜单**内呈现(主命令区 `KeyboardAcceleratorPlacementMode=Hidden` 不呈现内联角标),并注册全局按键监听(匹配即切换一次);空串不显示也不监听 |
| `disabled` | `boolean` | `false` | 禁用交互(WinUI `IsEnabled = false` 的取反映射) |
| `width` | `number \| string` | `68` | 按钮宽度(WinUI `Width`;默认 Style 固定 68) |
| `reveal` | `boolean` | `undefined` | Reveal 揭示光照(对照 `AppBarToggleButtonRevealStyle`,generic.xaml L17336):悬浮时跟随指针的底板光 + 1px 边框光环,选中强调色底与光照叠加。缺省跟随宿主——独立使用默认关闭(源 keyless 默认样式 L19468 非 reveal),CommandBar 内默认启用(源模板隐式样式 L16222 的等价 provide 作用域);显式 `true` / `false` 强制覆盖。见 [_reveal.md](./_reveal.md) |
| `#icon` (slot) | `any` | — | 图标内容(WinUI `Icon` 属性);设置后优先于 `icon` 属性 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click` | `(event: MouseEvent)` | 点击 / Space / Enter / 加速键激活时触发(禁用时不触发);WinUI `Click` |
| `checked` | — | 交互后进入选中态(WinUI `Checked`) |
| `unchecked` | — | 交互后进入未选中态(WinUI `Unchecked`) |
| `indeterminate` | — | 交互后进入不确定态(WinUI `Indeterminate`) |
| `update:isChecked` | `(value: boolean \| 'indeterminate')` | `v-model:isChecked` 双向绑定更新 |

事件仅在**用户交互**时触发;父组件程序化修改 `v-model:isChecked` 不会触发 `checked` / `unchecked` / `indeterminate`。官方 `OnClick` 次序(ToggleButton 基类,`ToggleButton_Partial.cpp` L178 起)为:先切状态并触发 `Checked`/`Unchecked`/`Indeterminate`,后触发 `Click`,本组件保持一致。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiAppBarToggleButton from '@/components/AppBarToggleButton.vue'

const isChecked = ref<boolean | 'indeterminate'>(false)

function onChecked() { console.log('On') }
function onUnchecked() { console.log('Off') }
</script>

<template>
  <!-- Symbol 图标 + 标签:点击在 On / Off 间切换,选中时点亮强调色底 -->
  <WuiAppBarToggleButton v-model:is-checked="isChecked" icon="Shuffle" label="SymbolIcon" @checked="onChecked" @unchecked="onUnchecked" />

  <!-- 自定义图标(#icon slot)+ 三态:点击环 未选中 → 选中 → 不确定 → 未选中 -->
  <WuiAppBarToggleButton v-model:is-checked="isChecked" label="FontIcon" :is-three-state="true">
    <template #icon>
      <WuiFontIcon glyph="Σ" font-family="Candara, serif" :font-size="16" />
    </template>
  </WuiAppBarToggleButton>

  <!-- 紧凑态(仅图标)+ 加速键(角标只在 CommandBar 溢出菜单呈现,此处仍全局监听 Ctrl+S) -->
  <WuiAppBarToggleButton icon="Save" label="Save" is-compact keyboard-accelerator-text="Ctrl+S" />
</template>
```

## `v-model:isChecked` 与三态的设计决策

WinUI 的 `AppBarToggleButton.IsChecked` 是 `Nullable<bool>`。Web 侧(与 CheckBox / ToggleButton 一致)用**字符串哨兵值 `'indeterminate'`** 表示第三态,避免 `null` 在 Vue prop 默认值 / `defineModel` 语义中的歧义;无障碍上 `'indeterminate'` 映射为 `aria-pressed="mixed"`(ARIA 对开关按钮第三态的标准表达),其余为 `aria-pressed="true" / "false"`。点击环对照 `ToggleButton::OnToggleImpl`(L249 起):**未选中 → 选中;选中 →(isThreeState 时)不确定,否则未选中;不确定 → 未选中**。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 WinUI 3 生效层(`controls/dev/CommonStyles/AppBarToggleButton_themeresources.xaml`)复刻:CommonStates 是「Unchecked / Checked × Normal / PointerOver / Pressed / Disabled」的组合态,全部即时切换、无过渡动画。选中态的视觉源是模板底部的 `CheckedHighlightBackground` Rectangle —— **WinUI 3 为整枚按钮的强调色底**;PL16 已把状态色全部重定向到 Fluent 画刷族:未选中底色四态 `SubtleFillColorTransparent/Secondary/Tertiary/Disabled`,Checked 全族底色 `AccentFillColorDefault/Secondary/Tertiary/Disabled`、前景 `TextOnAccentFillColorPrimary/Secondary/Disabled`,其余前景 `TextFillColorPrimary/Secondary/Disabled`,角标 `TextFillColorSecondary/Secondary/Tertiary/Disabled`,Checked/CheckedPointerOver 描边为 `--wui-accent-control-elevation-border` 渐变(PL5)。两层底色(overlay 未选中 / highlight 选中)与权威单层合成等价。总览见 [_brushes.md](./_brushes.md)。以下项无对应 token 或做了 Web 等价替换:

1. **状态色已重定向 PL2 Fluent 画刷族**(PL16):不再取 SystemControl 系刷子;未选中四态 `--wui-subtle-fill-color-*`、Checked 全族 `--wui-accent-fill-color-*` + `--wui-text-on-accent-fill-color-*`、前景 `--wui-text-fill-color-*`;P0 症状(Checked 前景此前 legacy HighlightAltBaseHigh 浅色黑字压强调底、反色错误)已消除。SubMenuOpened 态组件无子菜单开合视觉,未实现(登记未决)。
2. **尺寸/间距 token 未提取**:`Width=68`、`AppBarThemeMinHeight=64`(WinUI 3 `CommandBar_themeresources.xaml` L71;UWP `generic.xaml` L19461 为 56)、`AppBarButtonContentHeight=16`、`AppBarButtonContentViewboxCollapsedMargin=0,16,0,2`(WinUI 3 `AppBarButton_themeresources.xaml` L112;UWP 为 0,12,0,4)、`AppBarToggleButtonTextLabelMargin=2,0,2,8` 等为 `x:Double`/`Thickness` 资源,theme.css 未生成 token,按源值硬编码(与 AppBarButton 组件同款处理,尺寸口径统一取 WinUI 3 值)。
3. **圆角 token 未提取**:WinUI 3 默认 `ControlCornerRadius = 4`,以同值 4px 的 `--wui-hyperlink-focus-rect-corner-radius` 承载。
4. **焦点框**:模板 `UseSystemFocusVisuals` 为系统双环,Web 侧按双环实现:primary 外环 `outline: 2px solid var(--wui-focus-visual-primary)`(`outline-offset: 1px`)+ secondary 内环 `box-shadow: 0 0 0 1px var(--wui-focus-visual-secondary)`(复用 focus-visual.css 共享 token;注意与 AppBarButton 组件的虚线下划线焦点视觉不同:那是其任务规格要求的 EllipsisFocusVisual 近似)。
5. **不确定态无独立视觉**:源模板没有 Indeterminate 视觉分支 —— 不确定态外观与未选中相同(强调色底只在 `IsChecked == true` 时点亮),第三态语义仅由 `aria-pressed="mixed"` 表达,与源一致。
6. **加速键角标只在溢出菜单呈现**:`KeyboardAcceleratorPlacementMode` 默认 `Hidden`(`AppBarToggleButton_themeresources.xaml` L226;`generic.xaml` L19479 同),WinUI 中只有按钮位于溢出区(`UseOverflowStyle`)且键盘存在时才切 `KeyboardAcceleratorTextVisible`(`AppBarButtonHelpers.h` L201-206),主命令区不呈现内联角标(仅 Tooltip 提示)。本组件默认不渲染内联角标;`CommandBar` 溢出层把 CSS 变量 `--wui-app-bar-accelerator-display` 置为 `block` 后,角标在溢出菜单行尾右对齐呈现。此外本组件按任务要求直接注册全局 `keydown`(匹配即触发一次切换,`preventDefault`)—— 全局激活属宿主行为(演示页可实际按键体验),属有意的超集。
7. **Content 被忽略**:WinUI 的 `Content` 属性主要服务溢出菜单展示;本组件不实现溢出形态,图标经 `icon` 属性或 `#icon` slot、文字经 `label` 承载。
8. **溢出视觉态未复刻**:源模板的 `Overflow*` / `OverflowWithMenuIcons` 系列视觉态属于 CommandBar 溢出菜单场景,归 CommandBar 阶段实现。
9. **BitmapIcon 示例**:官方示例第二例(BitmapIcon)依赖应用包内图片资源,Web 侧演示页未复刻该例,`#icon` slot 可放任意元素(含 `BitmapIcon`)。

---

演示页源码:[demo/pages/AppBarToggleButtonPage.vue](../../demo/pages/AppBarToggleButtonPage.vue) · 组件源码:[src/components/AppBarToggleButton.vue](../../src/components/AppBarToggleButton.vue) · 同族在线示例:[AppBarButton](/#/appbarbutton) · Reveal 材料:[_reveal.md](./_reveal.md) · Fluent 画刷族:[_brushes.md](./_brushes.md)
