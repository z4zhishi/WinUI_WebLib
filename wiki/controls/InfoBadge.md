# InfoBadge

> 在线示例:[/#/infobadge](/#/infobadge) · 演示页源码:[demo/pages/InfoBadgePage.vue](../../demo/pages/InfoBadgePage.vue)

## 概述

徽标(Badge)是一种非侵入、直觉化的 UI 元素,用于展示通知或把注意力引向应用的某个区域 —— 例如通知计数、提示有新内容,或表达一条警告。InfoBadge 本身**非交互**(WinUI 中 `IsTabStop=false`、无事件),通常嵌套在按钮、导航项等宿主上以相对定位呈现;它有三种形态:**点状(dot)**、**数字(value)**、**图标(icon)**,并有与 InfoBar 对齐的四档配色(success / informational / warning / critical)。

官方文档:

- [InfoBadge - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.infobadge)
- [InfoBadge 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/info-badge)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `value` | `number` | `-1` | 徽标数值;`>= 0` 显示数字,`-1` 显示点状。形态判定优先级与源一致:**数字 > 图标 > 点状** |
| `iconSource` | `string` | `—` | 字体图标字形(Segoe Fluent Icons 码点字符串,如 `'\uF13F'`),对应源 `FontIconSource` → FontIcon 态 |
| `severity` | `'default' \| 'informational' \| 'success' \| 'warning' \| 'critical'` | `'default'` | 配色档位;四档与 InfoBar 的 severity 对齐,`default` 为源默认强调色底 |
| `background` | `string` | `—` | 底色覆盖(优先于 `severity`,对应源 `Control.Background`;官方示例即以此定制徽标) |
| `foreground` | `string` | `—` | 前景覆盖(数字 / 字形颜色) |
| `padding` | `number \| string` | `0` | 内边距;源部分图标样式族(Attention/Informational 的 Icon 变体)带 `0,4,0,2` |
| `cornerRadius` | `number \| string` | 胶囊(半高) | 圆角覆盖;缺省等价源 `InfoBadgeCornerRadius = ActualHeight / 2` |
| 默认插槽 | `slot` | `—` | 自定义图标内容(Icon 态,对应源通用 `IconSource`);与 `iconSource` 二选一,`value` 优先 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| — | — | InfoBadge 为非交互控件(WinUI `IsTabStop=false`),无事件;交互语义由宿主(按钮 / 导航项)承载 |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiInfoBadge from '@/components/InfoBadge.vue'

const count = ref(5)
</script>

<template>
  <!-- 点状徽标:无 value、无 iconSource、无默认插槽 -->
  <WuiInfoBadge />

  <!-- 数字徽标:值变化时点状 ↔ 数字自动切换 -->
  <WuiInfoBadge :value="count" />

  <!-- 字体图标徽标(源 Informational 图标样式同款字形) -->
  <WuiInfoBadge severity="informational" icon-source="\uF13F" />

  <!-- 槽位自定义图标徽标(源 Critical 图标样式同款 Symbol) -->
  <WuiInfoBadge severity="critical">
    <WuiSymbolIcon symbol="Cancel" :font-size="9" />
  </WuiInfoBadge>

  <!-- 嵌套到按钮右上角:宿主内容层 relative,徽标 absolute 定位 -->
  <WuiButton>
    <span style="position: relative; display: inline-flex">
      <WuiSymbolIcon symbol="Sync" />
      <WuiInfoBadge style="position: absolute; top: 6px; right: 6px" severity="critical" icon-source="\uF13C" />
    </span>
  </WuiButton>
</template>
```

## 无障碍

- **数字徽标**渲染为 `role="status"`,`aria-label` 为数值字符串,计数变化会被辅助技术播报;
- **点状 / 图标徽标**默认 `aria-hidden="true"`(装饰性),语义应标注在宿主上 —— 与官方做法一致(示例中在 NavigationViewItem 上设 `AutomationProperties.Name="Inbox, 5 notifications"`);
- 需要覆盖时,直接在组件上写 `aria-hidden` / `aria-label` / `role`,attrs 优先于组件默认值。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `CK/WinUI-Reference/controls/dev/InfoBadge/InfoBadge_themeresources.xaml` 的 `DefaultInfoBadgeStyle` ControlTemplate 与 `InfoBadge.cpp` 的 `OnDisplayKindPropertiesChanged` 复刻(该控件模板不在 `dxaml/generic.xaml` 内,故 theme.css 没有任何 `InfoBadge*` token)。以下项无对应 token 或做了 Web 等价替换:

1. **四档配色 token 未生成**:源的 `SystemFillColorSuccessBrush` 等定义于 `CommonStyles/Common_themeresources_any.xaml`,theme.css 生成器只覆盖 `dxaml/generic.xaml`,故无对应 token。组件内置**本地默认值层** `--wui-info-badge-color-*`(浅/深两套,值逐项取自源文件),调用方可用同名变量覆盖:
   | severity | 源画刷 | Light | Default(深色) |
   | --- | --- | --- | --- |
   | `informational` | `SystemFillColorSolidNeutralBrush` | `#8A8A8A` | `#9D9D9D` |
   | `success` | `SystemFillColorSuccessBrush` | `#0F7B0F` | `#6CCB5F` |
   | `warning` | `SystemFillColorCautionBrush`(源 Caution 档,即 InfoBar warning) | `#9D5D00` | `#FCE100` |
   | `critical` | `SystemFillColorCriticalBrush` | `#C42B1C` | `#FF99A4` |
   源另有 `Attention*InfoBadgeStyle` 族(`SystemFillColorAttentionBrush`,强调色 Light2/强调色),观感归入本组件的 `default` 档,不单列。
2. **前景 / 默认底色 token 缺失**:`InfoBadgeForeground = TextOnAccentFillColorPrimaryBrush`、`InfoBadgeBackground = AccentFillColorDefaultBrush` 定义在 `Common_themeresources_any.xaml`,theme.css 无同名 token。组件内以局部 token 按源值承载:底色经 theme-hooks.css 系统色钩子取 `AccentFillColorDefault` 对应值(浅 = SystemAccentColorDark1 `#0067C0` → `--wui-system-accent-color-dark-1`,深 = SystemAccentColorLight2 `#4CC2FF` → `--wui-system-accent-color-light-2`,未定义时回退源值字面量);前景 `TextOnAccentFillColorPrimary`(浅 `#FFFFFF` / 深 `#000000`)以 `--wui-info-badge-foreground` 局部变量按主题切换。
3. **小尺寸三形态 token 对照**(源值 → Web 实现,均为局部固定值而非 theme.css token):
   | 源资源 | Light / Default 值 | Web 实现 |
   | --- | --- | --- |
   | `InfoBadgeMinHeight` / `InfoBadgeMinWidth` | 4 / 4 | `min-width/min-height: 4px`(点状即 4x4 圆点) |
   | `InfoBadgeMaxHeight` | 16 | `max-height: 16px` |
   | `InfoBadgeValueFontSize` | 11 | `--wui-info-badge-value-font-size: 11px`,`line-height: 14px`(自然行高)+ 底 2px = 16,与源数字徽标高度一致 |
   | `InfoBadgeIconHeight` / `InfoBadgeIconWidth` | 9 / 8 / 12 | 槽位图标盒 `12px × var(--wui-info-badge-icon-height)`(浅 9 / 深 8) |
   | `InfoBadgePadding` | 0 | `padding` prop 默认 0 |
   | `IconInfoBadgeFontIconMargin`(4,0,4,2) | — | FontIcon 态 `margin: 0 4px 2px 4px` |
   | `IconInfoBadgeIconMargin`(4,4,4,4) | — | Icon 态 `margin: 4px` |
   | `ValueInfoBadgeTextMargin`(4,0,4,2) | — | 数字 `margin: 0 4px 2px 4px`(XAML 左,上,右,下 → CSS 上 右 下 左) |
4. **字形盒缩放未复刻**:源把 `FontIconSource`(默认 20px)经 `Viewbox` 缩放进 `IconHeight`(8/9px)盒;Web 不做 Viewbox 缩放,FontIcon 态直接以 12px 字形盒渲染,Icon 态槽位内容不缩放(仅限高),尺寸由调用方内容自定。
5. **胶囊圆角**:源在 `OnSizeChanged` 里动态取 `ActualHeight/2` 写入 `TemplateSettings.InfoBadgeCornerRadius`;Web 用 `border-radius: 9999px`(自动 cap 到半边长)取得相同胶囊/圆形效果,`cornerRadius` prop 可覆盖。
6. **方形化 Measure 未复刻**:源 `MeasureOverride` 在宽小于高时返回方形;Web 各形态内容盒(`min-width` 4px、图标盒 12px)已保证接近的几何,极端内容(如超高槽位图标)可能略有出入。
7. **`value < -1` 不抛异常**:源抛 `hresult_out_of_bounds`;Web 侧从宽 —— 按点状渲染,并在开发期输出 `console.warn`。
8. **无交互态**:源模板仅含 `DisplayKindStates`(Dot/Icon/FontIcon/Value),无 PointerOver/Pressed/Disabled/Focus 状态,组件相应不提供交互态与禁用态。

---

演示页源码:[demo/pages/InfoBadgePage.vue](../../demo/pages/InfoBadgePage.vue) · 组件源码:[src/components/InfoBadge.vue](../../src/components/InfoBadge.vue)
