# InfoBar

> 在线示例:[/#/infobar](/#/infobar) · 演示页源码:[demo/pages/InfoBarPage.vue](../../demo/pages/InfoBarPage.vue)

## 概述

InfoBar 是用于展示**应用级状态变化**的内联通知条:当用户应当被告知、确认或对某个已变化的应用状态采取行动时使用。默认情况下通知会一直保留在内容区,直到用户将其关闭,但不会打断用户的操作流。控件提供四档严重级别配色(`Informational` / `Success` / `Warning` / `Error`),每档对应不同的背景与图标;可选标题、正文、图标与操作按钮,关闭前会先触发可取消的 `closing` 事件。

官方文档:

- [InfoBar - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.infobar)
- [InfoBar 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/infobar)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | `''` | 标题文本(WinUI `Title`);同名 `#title` slot 优先,两者均为空则不渲染标题 |
| `message` | `string` | `''` | 消息正文(WinUI `Message`);同名 `#message` slot 优先 |
| `severity` | `'Informational' \| 'Success' \| 'Warning' \| 'Error'` | `'Informational'` | 严重级别(WinUI `Severity`):四档背景 / 图标配色与 role 语义随动 |
| `isIconVisible` | `boolean` | `true` | 是否显示图标(WinUI `IsIconVisible`);无 `#icon` slot 时按档位渲染默认图标 |
| `isClosable` | `boolean` | `true` | 是否显示关闭按钮(WinUI `IsClosable`) |
| `closeButtonAriaLabel` | `string` | `'关闭'` | 关闭按钮的 aria-label 与 tooltip;调用方可覆盖为其他语言取值 |
| `isOpen` (v-model) | `boolean` | `false` | 打开状态(WinUI `IsOpen`),双向绑定;关闭走 Closing → 动画 → Closed 链路 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `closeButtonClick` | — | 点击关闭按钮时触发(在 `closing` 之前,WinUI `CloseButtonClick`) |
| `closing` | `(args: { reason, cancel })` | 关闭**动画开始前**;`reason` 为 `'CloseButton'`(点关闭按钮)或 `'Programmatic'`(外部置 `isOpen = false`);handler 置 `args.cancel = true` 可取消关闭并回滚(WinUI `Closing`) |
| `closed` | `(args: { reason })` | 关闭动画**结束后**,元素随之移除(WinUI `Closed`) |
| `update:isOpen` | `(value: boolean)` | `v-model:is-open` 双向绑定更新 |

## Slot

| Slot | 说明 |
| --- | --- |
| `title` / `message` | 自定义标题 / 正文内容(优先于同名属性) |
| `action` | 操作区(WinUI `ActionButton`),通常放 `WuiButton` 或 `WuiHyperlinkButton` |
| `icon` | 自定义图标(WinUI `IconSource` → `UserIconBox` 的等价);不提供时按档位渲染默认图标 |
| 默认 slot | 附加内容区(WinUI `Content`);无标题 / 正文 / 操作时上移到首行(源 `NoBannerContent` 态) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiInfoBar from '@/components/InfoBar.vue'

const isOpen = ref(true)

function onClosing(args: { reason: string; cancel: boolean }) {
  // args.cancel = true 可取消关闭
  console.log('closing', args.reason)
}
function onClosed(args: { reason: string }) {
  console.log('closed', args.reason)
}
</script>

<template>
  <!-- 四档严重级别 -->
  <WuiInfoBar severity="Informational" title="Title" message="Essential app message…" v-model:is-open="isOpen" />
  <WuiInfoBar severity="Success" title="Title" message="Saved successfully." v-model:is-open="isOpen" />
  <WuiInfoBar severity="Warning" title="Title" message="Your storage is full." v-model:is-open="isOpen" />
  <WuiInfoBar severity="Error" title="Title" message="Network error." v-model:is-open="isOpen" />

  <!-- 操作按钮(slot)+ 事件 -->
  <WuiInfoBar
    v-model:is-open="isOpen"
    title="Title"
    message="Essential app message…"
    @closing="onClosing"
    @closed="onClosed">
    <template #action>
      <WuiHyperlinkButton navigate-uri="https://www.example.com">Informational link</WuiHyperlinkButton>
    </template>
  </WuiInfoBar>
</template>
```

## 无障碍

- 根元素 role 按档位映射:`Warning` / `Error` → `role="alert"`(打断式通告,隐式 `aria-live: assertive`),`Informational` / `Success` → `role="status"`(状态区,隐式 `aria-live: polite`)。调用方可通过同名属性覆盖。
- 关闭按钮为原生 `<button>`(空格 / 回车激活),`aria-label` 缺省「关闭」,可用 `closeButtonAriaLabel` 覆盖本地化文案;tooltip 同步该取值。
- 图标字形为纯装饰(`aria-hidden`);关闭后元素从 DOM 移除,同步移出可访问性树(对应源 `AccessibilityView = Raw`)。
- `prefers-reduced-motion` 时关闭动画时长趋近 0(animations.css 全局降级),`closed` 仍按时序触发。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `controls/dev/InfoBar/InfoBar.xaml`(ControlTemplate)与 `InfoBar_themeresources.xaml`(四档配色 / 尺寸资源)复刻。四档配色引用 **SystemFillColor\* 系画刷**(定义于 `controls/dev/CommonStyles/Common_themeresources_any.xaml`),PL2 已把该系语义 token 落进 `theme.css`,PL3 已把组件内字面量与四段 `html[data-theme]` 覆盖全部改为直引 `--wui-system-fill-color-*`(明暗由 token 自身切换)。注意字节序:XAML 颜色为 **AARRGGBB**,CSS 需按通道重排为 **RRGGBBAA**(带 alpha 的 8 位值,如 `#80F6F6F6` → `#f6f6f680`、`#08FFFFFF` → `#ffffff08`);不透明的 6 位值原样使用。对照表(源值列为 XAML 原始字节序):

| 源资源(WinUI 3) | 权威键 | 源值(light / dark) | 本组件 token |
| --- | --- | --- | --- |
| `InfoBarInformationalSeverityBackgroundBrush` ← `SystemFillColorAttentionBackground` | `SystemFillColorAttentionBackgroundBrush` | `#80F6F6F6` / `#08FFFFFF` | `--wui-system-fill-color-attention-background` |
| `InfoBarSuccessSeverityBackgroundBrush` ← `SystemFillColorSuccessBackground` | `SystemFillColorSuccessBackgroundBrush` | `#DFF6DD` / `#393D1B` | `--wui-system-fill-color-success-background` |
| `InfoBarWarningSeverityBackgroundBrush` ← `SystemFillColorCautionBackground` | `SystemFillColorCautionBackgroundBrush` | `#FFF4CE` / `#433519` | `--wui-system-fill-color-caution-background` |
| `InfoBarErrorSeverityBackgroundBrush` ← `SystemFillColorCriticalBackground` | `SystemFillColorCriticalBackgroundBrush` | `#FDE7E9` / `#442726` | `--wui-system-fill-color-critical-background` |
| `InfoBarInformationalSeverityIconBackground` ← `SystemFillColorAttentionBrush`(→ 系统强调色,深色 Light2) | `SystemFillColorAttentionBrush` | 强调色 | `--wui-system-fill-color-attention` |
| `InfoBarSuccessSeverityIconBackground` ← `SystemFillColorSuccess` | `SystemFillColorSuccessBrush` | `#0F7B0F` / `#6CCB5F` | `--wui-system-fill-color-success` |
| `InfoBarWarningSeverityIconBackground` ← `SystemFillColorCaution` | `SystemFillColorCautionBrush` | `#9D5D00` / `#FCE100` | `--wui-system-fill-color-caution` |
| `InfoBarErrorSeverityIconBackground` ← `SystemFillColorCritical` | `SystemFillColorCriticalBrush` | `#C42B1C` / `#FF99A4` | `--wui-system-fill-color-critical` |
| `InfoBar*SeverityIconForeground` ← `TextFillColorInverse` | `TextFillColorInverseBrush` | `#FFFFFF` / `#E4000000` | `--wui-text-fill-color-inverse` |
| `InfoBarTitleForeground` / `InfoBarMessageForeground` ← `TextFillColorPrimary` | `TextFillColorPrimaryBrush` | `#000000E4` / `#FFFFFF` | `--wui-text-fill-color-primary` |
| `InfoBarBorderBrush` ← `CardStrokeColorDefault` | `CardStrokeColorDefaultBrush` | `#0000000F` / `#00000019` | `--wui-card-stroke-color-default` |
| `CloseButton` 系 ← `AppBarButtonBackground/Foreground/…PointerOver/Pressed`(源 `InfoBarCloseButtonStyle` 实为 `BasedOn DefaultButtonStyle`,应取 Button 族) | — | — | `--wui-app-bar-button-*`(legacy,PL16 §7.6 登记为跨控件耦合待决;建议后续切 Button 族 Fluent token) |
| `CornerRadius` ← `ControlCornerRadius` | 4px | 4px | `--wui-hyperlink-focus-rect-corner-radius`(4px) |
| `InfoBarTitleFontSize` / `InfoBarMessageFontSize` = 14 | — | — | `--wui-control-content-theme-font-size` |

其余无 token / 做 Web 等价替换的项:

1. **尺寸资源未提取**:`InfoBarMinHeight = 48`、`InfoBarContentRootPadding = 16,0,0,0`、`InfoBarIconMargin = 0,16,14,16`、`InfoBarIconFontSize = 16`、`InfoBarPanelMargin = 0,0,16,0`、各 `*HorizontalOrientationMargin`(Title `0,14,0,0`、Message `12,14,0,0`、Action `16,8,0,0`)、`InfoBarCloseButtonSize = 38`、`InfoBarCloseButtonGlyphSize = 16`、`InfoBarCloseButtonStyle Margin = 5`、边框厚度 `1` 均为 XAML 资源,按值写死为对应 CSS(XAML Thickness 顺序:左,上,右,下)。
2. **InfoBarPanel 回绕为 Web 近似**:源 `InfoBarPanel` 在宽度不足时从横向切换为纵向布局并改用 `*VerticalOrientationMargin`(纵向 Padding `0,14,0,18`);本组件以 flex 单布局 + `flex-wrap` 回绕近似(始终用横向边距),窄容器下的回绕间距与源略有出入。
3. **关闭动画为 Web 增强**:源模板无过渡动画(VSM `InfoBarCollapsed` 态直接 `Visibility = Collapsed`,瞬时消失);按任务要求以 animations.css 的 `--wui-duration-fast`(167ms)+ `--wui-easing-accelerate`(关闭类动画专用曲线)做透明度淡出。打开仍为瞬时出现(与源一致)。
4. **事件时序**:源在关闭按钮点击时**立即**置 `IsOpen = false` 再依次触发 Closing / 隐藏 / Closed(InfoBar.cpp L81-L137);本组件因需在动画后卸载,`isOpen` 于**动画结束时**才同步为 `false`(关闭按钮路径),`closing` 在动画前、`closed` 在动画后,与任务规格的「动画前后时序」一致。`Closing` 的 `Cancel = true` 回滚语义与源相同(InfoBar.cpp L100-L105)。
5. **role 语义**:源 AutomationPeer 将 InfoBar 标记为 `IsDialog = true` + Custom Landmark(本地化名「通知」);Web 端按任务规格映射为 `role="alert"`(Warning / Error)与 `role="status"`(Informational / Success),语义更贴近 ARIA 惯例但非一一对应。
6. **默认图标**:`InfoBarIconBackgroundGlyph`(F136 底圆)+ 档位字形(Informational F13F / Success F13E / Warning F13C / Error F13D)叠放渲染,依赖本机 Segoe Fluent Icons / Segoe MDL2 字体栈(项目 R1 裁决不加载网络字体);关闭按钮字形为 `Symbol.Cancel`(E711)。
7. **`Opened` 事件未实现**:源中 `Opened` 为 `MUX_PREVIEW` 预览特性(InfoBar.idl L103-L106),本组件未暴露;打开行为经 `v-model:is-open` 即可观测。
8. **HyperlinkButton 负边距未复刻**:源为 action 区的 HyperlinkButton 追加 `InfoBarHyperlinkButtonMargin = -12,0,0,0`(抵消其默认 Padding 使其与文本对齐);Web 端 `WuiHyperlinkButton` 内边距不同,未套用负边距,操作区与正文的间距以横向边距 16px 为准。
9. **属性命名**:`Title` → `title`(+#title slot)、`Message` → `message`(+#message slot)、`Severity` → `severity`、`IsIconVisible` → `isIconVisible`、`IsClosable` → `isClosable`、`IsOpen` → `v-model:is-open`;`ActionButton` / `IconSource` / `Content` → `action` / `icon` / 默认 slot。

---

演示页源码:[demo/pages/InfoBarPage.vue](../../demo/pages/InfoBarPage.vue) · 组件源码:[src/components/InfoBar.vue](../../src/components/InfoBar.vue) · Fluent 画刷族:[_brushes.md](./_brushes.md)
