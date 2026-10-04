# ToolTip

> 在线示例:[/#/tooltip](/#/tooltip) —— 路由 `/#/tooltip`

## 概述

ToolTip 显示某个 UI 元素的更多信息:可以说明该元素是做什么的,或提示用户应该做什么。鼠标悬停、键盘聚焦或触屏长按该元素时弹出,移出 / 超时 / Esc 关闭。工具提示应保持简短,并且是**非交互**的(不能放按钮、链接等需要操作的控件——那是 [Flyout](./_popup-infra.md) 的职责)。

本组件按 WinUI 3 生效层 `controls/dev/CommonStyles/ToolTip_themeresources.xaml` 复刻视觉(PL10 重定向):前景取 Fluent `--wui-text-fill-color-primary`(浅 `#000000E4` / 深 `#FFFFFF`)、描边取 `--wui-surface-stroke-color-flyout`(浅 `#0000000F` / 深 `#00000033`)、背景为亚克力回退不透明近似(权威 `AcrylicInAppFillColorDefaultBrush`,浅 `#F9F9F9` / 深 `#2C2C2C`),字号 12px、内边距 9,6,9,8、圆角 ControlCornerRadius(4px)、MaxWidth 320、纯淡入淡出动画,随 `html[data-theme]` 明暗切换(总览见 [_brushes.md](./_brushes.md))。

弹层定位、层级(z-index 自动分配)、视口翻转 / 推回全部基于弹层公共基建 `usePopupAnchor` + `usePopupLayer`(见 [弹层公共基建](./_popup-infra.md))。

官方文档:

- [ToolTip - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.tooltip)
- [Guidelines for tooltips](https://learn.microsoft.com/windows/apps/design/controls/tooltips)

## 两种用法

WinUI 里 ToolTip 有两种入口:`ToolTip` 控件本身(Target + Content),以及更常用的 `ToolTipService` 附加属性(`ToolTipService.ToolTip` 挂在任意元素上)。Web 侧对应两个组件:

| Web 组件 | 对应 WinUI | 用法 |
| --- | --- | --- |
| `<WuiToolTip>` | `ToolTip` 控件 | `#target` 插槽包住目标元素(包装模式),或传 `target` 属性指向已有元素(直连模式);默认插槽为富提示内容 |
| `<WuiToolTipService>` | `ToolTipService` 附加属性 | 作为子组件放在宿主元素/组件内部,自动取宿主为提示目标;`content` 属性为简单文本,默认插槽为富内容 |

```xml
<!-- WinUI 原生写法 -->
<Button Content="Hover me" ToolTipService.ToolTip="Simple ToolTip" />
```

```vue
<!-- Web 等价写法:服务式,子组件声明 + 宿主即目标 -->
<WuiButton>
  Hover me
  <WuiToolTipService content="Simple ToolTip" placement="Top" :delay="1000" :show-duration="5000" />
</WuiButton>

<!-- 直用式:#target 插槽即目标,默认插槽为富内容 -->
<WuiToolTip placement="Right" :max-width="320">
  <template #target>
    <WuiButton>Placement Right</WuiButton>
  </template>
  <strong>富内容提示</strong>
  <span>默认插槽可放任意元素(仍应保持非交互)</span>
</WuiToolTip>

<!-- 直连模式:target 指向已有元素(元素或 CSS 选择器) -->
<WuiToolTip target="#save-button" content="保存当前文档" />
```

`WuiToolTipService` 的附加属性名对照:`ToolTip` → `content` / 默认插槽、`PlacementMode` → `placement`、`InitialShowDelay` → `delay`、`ShowDuration` → `showDuration`、`HorizontalOffset` / `VerticalOffset` → `horizontalOffset` / `verticalOffset`、`PlacementTarget` → `target`。服务式组件不转发 `opened` / `closed` 事件(与 WinUI ToolTipService 无事件一致);需要事件日志请直用 `WuiToolTip`。

## 属性(ToolTip 与 ToolTipService 共有)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `content` | `string` | `''` | 提示文本(WinUI `Content` / `ToolTipService.ToolTip` 的 string 形态);富内容用默认插槽,插槽优先 |
| `placement` | `'Top' \| 'Bottom' \| 'Left' \| 'Right' \| 'Auto'` | `'Top'` | 放置位(WinUI `Placement`,默认 Top);视口放不下自动翻转到对侧并推回安全区;`Auto` 归位 `Top` 由翻转提供自适应 |
| `target` | `HTMLElement \| string \| null` | `null` | 目标元素(元素或 CSS 选择器;`ToolTipService.PlacementTarget`)。传入后组件不渲染包装元素;服务式组件缺省取宿主 |
| `delay` | `number` | `1000` | 出现延迟 ms(`ToolTipService.InitialShowDelay`;悬停、键盘聚焦、触屏长按共用) |
| `showDuration` | `number` | `5000` | 显示时长 ms,超时自动关(`ToolTipService.ShowDuration`) |
| `maxWidth` | `number` | `320` | 最大宽度 px(`ToolTipMaxWidth`),超宽换行 |
| `horizontalOffset` | `number` | `0` | 水平偏移 px,正值向右(WinUI `HorizontalOffset`) |
| `verticalOffset` | `number` | `0` | 垂直偏移 px,正值向下(WinUI `VerticalOffset`) |
| `isOpen`(仅 ToolTip) | `boolean`(`v-model:is-open`) | `false` | 开关状态双向绑定(WinUI `ToolTip.IsOpen`);程序化置 `true` 立即打开,不走 `delay` |

`class` / `style` 等透传(fix round 1 起两种模式均有落点):包装模式落在包装 `<span>` 上;直连模式组件不渲染可见根,`$attrs` 改落提示层根——可用来定制提示配色等外观(层 `pointer-events: none`,不会截获指针交互)。

## 事件(仅 ToolTip)

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `opened` | — | 提示打开后触发(含悬停 / 聚焦 / 长按 / 程序化打开;WinUI `Opened`) |
| `closed` | — | 提示关闭后触发(移出、按下目标、Esc、超时、外部按下;WinUI `Closed`) |

## 交互时序

- **悬停进入**:`delay` 后显示;移出目标立即关闭。
- **键盘聚焦**:Tab 聚焦到目标(仅 `:focus-visible`)同样按 `delay` 弹出——WinUI 的 ToolTip 对键盘输入模式同样打开;焦点移走即关。
- **按下目标**:立即关闭(不再等待),与 WinUI「按下即隐藏」一致。
- **触屏长按**:按住 `delay` 后显示;移动超过 8px 取消,抬指即关(Web 适配,见差异节)。
- **Esc**:关闭已打开的提示并取消未生效的等待。
- **外部按下**:提示打开时在目标与层之外按下即关。这是本组件在基建约定表(ToolTip 行 = 不监听 `onOutsidePress`)之上的增量决策——鼠标路径的提示已随移出提前关闭,该路径实际服务触屏长按后的收回与「用户已转向他处」两种残留态。
- **超时**:打开后 `showDuration` 自动关闭。
- **滚动**:提示跟随目标重新定位,不关闭(基建约定:ToolTip 不做滚动 light dismiss)。

## 无障碍

- 提示层:`role="tooltip"` + 全页唯一 `id`(`wui-tooltip-<n>`)。
- 目标元素:挂常驻 `aria-describedby` 指向提示层 id(遵守 [WAI-ARIA APG tooltip 模式](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/));包装模式下自动落到第一个可聚焦后代(如内部的 `<button>`),已有 `aria-describedby` 值会合并保留、卸载时还原。
- **与 WinUI 的差异**:WinUI 经 UIA 自动化对等公开提示内容(`ToolTipAutomationPeer`,打开时触发 `ToolTipOpened` 事件,另可用 `AutomationProperties.FullDescription` 补充长描述);屏幕阅读器在目标获得焦点时朗读提示。Web 侧没有自动化对等树,`aria-describedby` + 键盘聚焦弹出是标准等价物;提示层常驻 DOM 之外不渲染,朗读发生在聚焦弹出后。触屏用户读不到 hover 语义,重要信息不要只放在 tooltip 里(WinUI 指南同此要求)。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiToolTip from '@/components/ToolTip.vue'
import WuiToolTipService from '@/components/ToolTipService.vue'

const open = ref(false)
</script>

<template>
  <!-- 简单文本(服务式) -->
  <WuiButton>
    Hover me
    <WuiToolTipService content="Simple ToolTip" />
  </WuiButton>

  <!-- 自定义放置位 + 延迟 + 富内容(直用式) -->
  <WuiToolTip placement="Bottom" :delay="500" :show-duration="8000">
    <template #target>
      <WuiButton>自定义时序</WuiButton>
    </template>
    <strong>富内容</strong>:默认插槽,受 maxWidth = 320 约束。
  </WuiToolTip>

  <!-- 程序化开关(v-model:is-open 置 true 立即打开) -->
  <WuiToolTip v-model:is-open="open" target="#save" content="保存当前文档" />
</template>
```

> 模板中属性请用 camelCase(`showDuration`)或 kebab-case(`show-duration`);示例页代码块按 WinUI 习惯展示 PascalCase(`ShowDuration`)仅为对照源。

## 与 WinUI 的差异说明

对照 WinUI 3 生效层 `controls/dev/CommonStyles/ToolTip_themeresources.xaml`(MUX `DefaultToolTipStyle`,逐行复核)与 theme.css Fluent token 的取值映射:

| WinUI 取值 | Web 实现 | 说明 |
| --- | --- | --- |
| `ToolTipBackgroundBrush` = `AcrylicInAppFillColorDefaultBrush`(亚克力材质) | 组件局部 `--wui-tool-tip-surface-fallback`(浅 `#F9F9F9` / 深 `#2C2C2C`) | web 无原生亚克力,取 `brush-authority.md` §4.2 记录的不透明回退色近似(噪声/模糊不可复现);皮肤类旧 `--wui-tool-tip-background` 不再生效 |
| `ToolTipBorderBrush` = `SurfaceStrokeColorFlyoutBrush` | `--wui-surface-stroke-color-flyout`(浅 `#0000000F` / 深 `#00000033`) | PL10 重定向(此前 legacy `--wui-tool-tip-border` `#00000024`/`#0000005c` 已弃用) |
| `ToolTipForeground` = `TextFillColorPrimaryBrush` | `--wui-text-fill-color-primary`(浅 `#000000E4` / 深 `#FFFFFF`) | PL10 重定向(此前 `--wui-tool-tip-foreground` 缺 alpha,已订正) |
| `ToolTipContentThemeFontSize` = 12 | `--wui-tool-tip-content-theme-font-size` | 无差异 |
| `ToolTipBorderThemeThickness` = 1 | `border: 1px solid` | 无差异 |
| `ToolTipBorderPadding` = 9,6,9,8 | `padding: 6px 9px 8px` | 无差异(dxaml 旧值为 8,5,8,7,取 MUX 新值) |
| `ToolTipMaxWidth` = 320 | `maxWidth` 属性(内联 `max-width`) | 无差异 |
| `CornerRadius` = `ControlCornerRadius`(4px) | `--wui-hyperlink-focus-rect-corner-radius` | 该键无专属 `--wui-*` token,沿用项目对 ControlCornerRadius 的既有映射(同 Button/InfoBar) |
| `BackgroundSizing` = `InnerBorderEdge`(背景绘于边框内缘) | `background-clip: padding-box` | CSS `background-clip` 默认 `border-box`(等价 `OuterBorderEdge`,背景伸入边框之下);MUX ToolTip 为 InnerBorderEdge,故显式收窄。fix round 1 更正:此前一行误写为「border-box 等价 InnerBorderEdge」,方向相反;1px 低对比边框下视觉差异极小 |
| FadeIn/FadeOutThemeAnimation(纯淡入淡出) | `wui-fade-in` / `wui-fade-out`(`--wui-duration-fast`,缓动 standard/accelerate) | 曲线为已声明近似:源曲线在平台 PVL 表内、快照无值(`OpacitySplineTransform` 结构为 Bezier 样条、系数在 OS 主题数据,MR3/B2 核订);时长取 fast 档(G 模板显式 0.167 簇口径) |
| 默认 `PlacementMode` = `Top`,主轴贴边**无间距**(`MoveNearRect` offset 0),交叉轴居中 | `placement` 默认 `'top'`,`offset` 默认 0 | 无差异(注意与基建默认 `bottom-start` 不同,本组件显式传 `top`) |
| 放不下按「对侧 → 相邻侧」级联择位(`QueryRelativePosition`),`PlacementRect` 指定不可遮挡矩形 | 基建 `flip`(仅对侧)+ `shift`(双轴推回) | 简化为「翻转 + 推回」;`PlacementRect`(非遮挡矩形)未实现,Web 侧无等价 API,以 flip/shift 等效 majority 场景 |
| `PlacementMode.Mouse`(跟随指针) | 未实现 | 需要时以 `horizontalOffset`/`verticalOffset` 手动近似 |
| `InitialShowDelay` = 系统 MouseHoverTime(实现回退 400ms;WinRT 文档默认 1000ms) | `delay` = 1000ms | 取文档口径;系统级「悬停时间」设置项 Web 无法读取 |
| `ShowDuration` = `SPI_GETMESSAGEDURATION`(回退 5s) | `showDuration` = 5000ms | 取回退值口径 |
| BetweenShowDelay(快速移过多个目标时复用计时) | 未实现 | 每个目标独立计时 |
| 触屏:长按显示,抬指后**保持**到下次点按 / 超时 | 抬指即关 | 避免遮挡与误触的 Web 适配;长按期间移出 slop(8px)取消 |
| 定位在平台组合器中完成(Topmost 视觉树) | `usePopupLayer` fixed 策略 + `nextPopupZIndex()` | 基建级差异,见[弹层公共基建](./_popup-infra.md) |
| WinUI 3 弹层阴影为 ThemeShadow | `--wui-popup-shadow` 双层 box-shadow 近似 | 基建级差异,见[弹层公共基建](./_popup-infra.md) |
| 弹层圆角 `OverlayCornerRadius`(8px) | `--wui-popup-corner-radius`(8px) | 基建级差异;ToolTip 自身 `ControlCornerRadius`(4px)另生效于皮肤 |

## 挂账(豁免)事项

以下偏差 / 未实现项按项目「豁免粒度挂账」约定逐条记账(控件级条目指明粒度与归属,全站级条目留给统一波次),供后续波次与 QA 追踪:

| 事项 | 粒度 | 归属 / 处置 |
| --- | --- | --- |
| 示例页与本文档文案暂为中文,不自建 i18n | 全站统一 | 阶段 8 六语言统一 |
| `PlacementRect`(不可遮挡矩形)、`PlacementMode.Mouse`(跟随指针)、`BetweenShowDelay`(快速移过复用计时)未实现 | 控件级 API 缺口 | 有真实需求时按波次增补 |
| 触屏抬指即关(WinUI 为保持到下次点按 / 超时) | 控件级行为适配 | 保持现状(避免遮挡误触),如需对齐再议 |
| `delay` 取文档口径 1000ms(源码走系统悬停时间设置,Web 不可读) | 控件级常量口径 | 保持现状 |
| 外部按下即关(基建约定表 ToolTip 行为「不监听 onOutsidePress」) | 控件级增量语义 | 已并入「交互时序」说明,维持 |

## 相关链接

- 在线示例:`/#/tooltip`
- 演示页源码:`demo/pages/ToolTipPage.vue`
- 组件源码:`src/components/ToolTip.vue`、`src/components/ToolTipService.vue`
- 弹层公共基建:[`_popup-infra.md`](./_popup-infra.md)(usePopupLayer 选项表、z-index 与焦点约定)
- 相关控件:Flyout、MenuFlyout、ContentDialog、TeachingTip
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
