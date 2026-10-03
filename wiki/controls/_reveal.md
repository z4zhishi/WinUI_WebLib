# Reveal 揭示光照(Reveal 材料,控件作者与消费者必读)

Reveal 是 WinUI 2.x 引入、Windows 10 RS4+ 大规模落地的「揭示光照」材料:指针悬停时,一枚白色光斑跟随指针点亮控件的**底板**与**边框**,离开即熄灭。本库以公共层统一复刻(`src/styles/reveal.css` + `src/composables/useReveal.ts`,经 `src/index.ts` 对外导出),全部 Reveal 落点控件共用同一份光照实现——**任何 Reveal 行为问题只需修公共层一处**。

本文是 Reveal 的总口径文档:是什么、源在哪、怎么用、哪些控件默认开/默认关、如何降级、哪些地方是登记过的近似。各控件页的 `reveal` / `revealBorder` / `dayItemReveal` / `enableReveal` 属性行均链回本文。

官方文档:

- [Reveal - design](https://learn.microsoft.com/windows/apps/design/style/reveal)
- [RevealBrush - API(Windows.UI.Xaml.Media)](https://learn.microsoft.com/uwp/api/windows.ui.xaml.media.revealbrush)(注:WinUI 3 已把 Reveal 画刷退役为静态回退色,见下节)

## 1. 源口径:两源结构(重要)

Reveal 在 WinUI 源码中分布在**两层**,本库按两源结构分别取材:

1. **平台层**(WinUI 3 `generic.xaml`,下称 G.xaml):各 `*RevealStyle` 样式(Button/ToggleButton/RepeatButton/ListViewItem/GridViewItem/ComboBoxItem/MenuFlyout 三件/CommandBar/AppBarButton/AppBarToggleButton/EllipsisButton/CalendarView 两式等 16 个)仍在,但其中全部 `*RevealBackgroundBrush / *RevealBorderBrush` 均已**退役为静态回退色 SolidColorBrush**(如 G.xaml L1431 `SystemControlBackgroundBaseLowRevealBackgroundBrush = SystemBaseLowColor`)——即 WinUI 3 平台上 reveal 是「状态色还在、光照已死」的静态回退形态。状态色 token 本库已在 `theme.css` 落全(`--wui-button-reveal-*` 等 350 行)。
2. **材料层**(mux,`controls/dev/Materials/Reveal/` + `controls/dev/Lights/`):光照本体常量不在平台层,而在这份 WinUI 2.x 材料实现里。本库的光照视觉逐常量取自此处。

### 光照常量(mux 材料层锚点)

| 常量 | 源值 | 锚点 |
| --- | --- | --- |
| 光色 | 白 `(255,255,255,255)`(底板/边框同) | `RevealHoverLight.cpp` L42-43;`RevealBorderLight.cpp` L30/32/43/45 |
| 漫反射强度(底板/边框) | `sc_diffuseAmount = 0.2` / `sc_diffuseAmountBorder = 0.2` | `RevealBrush.cpp` L25 / L29 |
| 环境光贡献 | `(127,127,127)` | `RevealBrush.cpp` L24 |
| 底板光斑平面半径 | `Clamp(Max(W,H)+12, 16, 512)`(SpotlightHeight 256 与外锥表达式相乘后的平面投影;MinSize 16 / MaxSize 512 / SizeAdjustment 12) | `RevealHoverLight.cpp` L141-149 + L163 |
| 按压光斑半径 | `PressOuterSize = 47.25` | `RevealHoverLight.cpp` L144 + L165 |
| hover 亮/灭 | 1ms(RS3+ 直接开关;为修 flash 移除 166ms cross-fade) | `RevealHoverLight.cpp` L24-31 |
| 按压点亮 | 66ms linear | `RevealHoverLight.cpp` L105-110 |
| FastRelease 熄灭 | 内圈 200ms / 外圈 266ms,`cubic-bezier(0.33,0,0.67,1)`,外角 ×4.44(半径扩至 ≈209.8px) | `RevealHoverLight.cpp` L115-120 + L17-19 |
| SlowRelease 熄灭 | 1000 / 1500ms(同曲线) | `RevealHoverLight.cpp` L125-130 |
| 边框光半径(narrow) | Height 128 × tan(16.94532°) ≈ **39px**,ConstantAtt 1 / LinearAtt 3 | `RevealBorderLight.cpp` L24-35 |
| 边框光半径(wide) | Height 256 × tan(16.7403°) ≈ **77px**,ConstantAtt 1 / LinearAtt 0.5 | `RevealBorderLight.cpp` L37-48 |
| 材料回退(高对比等) | `IsInFallbackMode()`(材料策略禁用 / AlwaysUseFallback / Xbox 非鼠标模式)→ 纯回退色 | `RevealBrush.cpp` L695-698 |

Web 映射:底板光 = `.wui-reveal::before` 的 `radial-gradient`(白 0.2,径向衰减,`z-index:-1` 落在「元素背景之上、内容之下」);边框光 = `.wui-reveal--border::after` 的同型渐变经 `mask` 双 linear-gradient `exclude` 环贴在边框厚度上;半径公式 `revealHaloRadius(w,h) = min(max(max(w,h)+12,16),512)` 与源逐字对应;hover 亮灭 1ms 以 `transition: opacity 1ms linear` 等效保留时间线语义。

## 2. 公共层用法

### 2.1 CSS 类与变量(`src/styles/reveal.css`)

宿主元素加 `wui-reveal` 类(需要边框光再加 `wui-reveal--border`),可选覆写下列变量(均带源值缺省):

| 变量 | 缺省(源值) | 说明 |
| --- | --- | --- |
| `--wui-reveal-light-color` | `rgb(255 255 255 / 0.2)` | 底板光颜色(白 × diffuse 0.2) |
| `--wui-reveal-border-light-color` | `rgb(255 255 255 / 0.2)` | 边框光颜色(白 × diffuseBorder 0.2) |
| `--wui-reveal-radius` | `52px`(按 40px 高日格的公式缺省;JS 进入时按源公式覆写) | 底板光斑半径 |
| `--wui-reveal-press-radius` | `47.25px` | 按压光斑半径(PressOuterSize) |
| `--wui-reveal-border-radius` | `39px`(narrow) | 边框光斑半径(列表行等大件覆写为 77px/wide) |
| `--wui-reveal-border-width` | `2px` | 边框光环厚度(= 宿主边框厚度,Button 系 2 / 各项 1) |

### 2.2 组合式(`src/composables/useReveal.ts`)

```vue
<script setup lang="ts">
import { useReveal } from '@/composables/useReveal'

const revealHandlers = useReveal(() => myEnabled.value) // 缺省恒启用,再由环境门裁决
</script>

<template>
  <div class="wui-reveal wui-reveal--border" v-on="revealHandlers">…</div>
</template>
```

- `useReveal(enabled?)` → `{ pointerenter, pointermove }`(v-on 对象绑定):enter 时按源公式计算并写入 `--wui-reveal-radius`,move 时写 `--wui-reveal-x/y`(元素局部坐标);`enabled` 返回 false 或环境不满足时监听器空转、不写任何变量(move 路径含 MR8 半径补写:宿主在指针已位于其上时才挂光照的场景由首次 move 补算一次)。
- `revealHaloRadius(width, height)`:底板光斑半径纯函数(`Clamp(Max(W,H)+12, 16, 512)`)。
- `isRevealEnabled()`:环境门聚合(指针设备 + 非 reduced-motion + 非 forced-colors)。

### 2.3 组件层用法(推荐)

消费侧一般无需直接接触公共层,经控件 prop 即可:Button/RepeatButton/ToggleButton/AppBarButton/AppBarToggleButton 用 `reveal`,ListView/ListBox/GridView 用 `revealBorder`,ListViewItem/GridViewItem 用 `enableReveal`,CalendarView 用 `dayItemReveal`;ComboBox 下拉项、MenuFlyout 三件与 CommandBar 默认启用、无开关。见下表。

## 3. 落点清单与默认值

「Web 默认」以**源默认样式判定**为准(逐源核实 keyless BasedOn / 隐式样式挂接):源默认即 Reveal 样式的落点 Web 默认启用;源默认非 Reveal 的落点为 opt-in prop。

| 落点 | 开关 prop | Web 默认 | 源默认样式依据(G.xaml) | 边框光半径 / 厚度 |
| --- | --- | --- | --- | --- |
| [Button](./Button.md) | `reveal` | `false`(opt-in) | `ButtonRevealStyle` 为 keyed 样式,非默认(L15824) | 39px / 2px |
| [RepeatButton](./RepeatButton.md) | `reveal` | `false`(opt-in) | 同上(L15895) | 39px / 2px |
| [ToggleButton](./ToggleButton.md) | `reveal` | `false`(opt-in) | 同上(L15953) | 39px / 2px |
| [GridView](./GridView.md)(容器) | `revealBorder` | `false`(opt-in,登记差异) | `GridViewItemRevealStyle` 默认挂接(L22885);MR4 按 opt-in 迁移,与源默认不一致已登记(MR8 §8 建议后续对齐 true) | 77px / 1px |
| GridViewItem | `enableReveal` | `false`(opt-in,登记差异) | 同上 | 77px / 1px |
| [ListView](./ListView.md)(容器) | `revealBorder` | `true` | `ListViewItemRevealStyle` 默认挂接(L20595) | 77px / 1px |
| ListViewItem | `enableReveal` | `true` | 同上 | 77px / 1px |
| [ListBox](./ListBox.md) | `revealBorder` | `true` | 源无 `ListBoxItemRevealStyle`,按同族 ListView 项视觉借用映射(登记无源条款,MR8 §7) | 77px / 1px |
| [CalendarView](./CalendarView.md) | `dayItemReveal` | `false`(opt-in) | `CalendarViewDayItemRevealStyle` 默认挂接(L14268);MR4 决策按 opt-in 开放 | 仅底板光(DayItem 无边框) |
| [AppBarButton](./AppBarButton.md) | `reveal` | 缺省跟随宿主(独立 `false` / CommandBar 内 `true`) | 独立 keyless 默认非 reveal(L19126);CommandBar 模板隐式挂接(L16221) | 39px / 1px |
| [AppBarToggleButton](./AppBarToggleButton.md) | `reveal` | 缺省跟随宿主(同上) | 独立 keyless 默认非 reveal(L19468);隐式挂接(L16222) | 39px / 1px |
| [CommandBar](./CommandBar.md) | 无独立 prop(默认启用) | `true`(provide 作用域) | 平台唯一 CommandBar 样式即 `CommandBarRevealStyle`(L20206);MoreButton 硬挂 `EllipsisButtonRevealStyle`(L16961) | 39px / 1px |
| [ComboBox](./ComboBox.md) 下拉项 | 无 prop(默认启用) | `true` | `ComboBoxItemRevealStyle` 默认挂接(L20202;平台无非 reveal 项样式可切) | 39px / 1px |
| [MenuFlyout](./MenuFlyout.md) 三件(Item / Toggle / SubItem) | 无 prop(默认启用) | `true` | `*RevealStyle` 均默认挂接(L18400 / L11999 / L18402) | 39px / 1px |

另:`SemanticZoomRevealStyle` 经核实**无任何 reveal 视觉**(命名仅为族内对齐,模板动画为 FadeIn/Out 转场),不实现、无落点。

状态色口径:Button/RepeatButton/ToggleButton/CalendarView 的 reveal 变体把状态色中间变量整体切换到 `--wui-*-reveal-*` token(退役回退色,明暗值与源逐项对应);ListViewItem/GridViewItem 等其余落点的源 reveal 系悬停/按压画刷与对应非 reveal 画刷**同源值**(ListLow/ListMedium 系),无需状态色切换,组件既有状态色即源值。

## 4. 降级语义

| 环境 | 行为 | 依据 |
| --- | --- | --- |
| 触屏 / 粗指针(`hover: none` 或 `pointer: coarse`) | 不产生光照(CSS 门 + JS 门双重关闭);控件悬停态色不变 | 仅指针设备语义;`@media (hover: hover) and (pointer: fine)` + `isRevealEnabled()` |
| `prefers-reduced-motion: reduce` | 光照层整体隐藏(`::before/::after` `display: none`),退化为静态 hover 态——状态色仍由 `--wui-*-reveal-*` token 呈现,JS 侧不写任何变量 | Reveal 光照属动画类效果(README §4.3 硬规则 6) |
| `forced-colors: active`(高对比) | 光照层隐藏,退化为回退色静态形态 | 对齐源 `IsInFallbackMode` 材料策略回退(`RevealBrush.cpp` L695-698) |
| 禁用控件 | 不点亮:原生 `<button>` 经 `:not(:disabled)` 门;div 容器(GridViewItem / ListViewItem / ListBox 项 / 菜单项)经 `is-disabled` 类抑制 | 各组件逐点覆写 |

## 5. 已知近似(MR4/MR8 登记,如实记录)

- **FastRelease 熄灭脉冲未复刻**:源松开后内圈 200ms / 外圈 266ms 熄灭并伴随 ×4.44 半径扩散(至 ≈209.8px);Web 现为半径瞬回 + 1ms 熄灭。需 `@property` 注册型变量补间,目标基线不可依赖,待基线上移后复评。
- **边框光无双灯切换**:源 narrow/wide 双配置按主题/材质可切;Web 按落点类型固定(小件 39px、列表行等大件 77px),不做主题级双灯切换。
- **光斑衰减为 radial-gradient 线性近似**:源为 spotlight 常数 + 线性衰减合成。
- **按压时光斑半径瞬切**至 47.25px(点亮过渡 66ms 已复刻);源另有 SlowRelease 1000/1500ms 熄灭曲线未复刻(指针快速移出即 1ms 熄灭路径)。
- **GridViewItem `enableReveal` 默认 false 与源默认(reveal,L22885)不一致**:MR4 按 opt-in 迁移的既定决策,MR8 不翻默认以免改动已验证行为;建议后续工单对齐为 true(API 形状已与 ListViewItem 一致,仅默认值差异)。`GridView.revealBorder` 同口径。
- **CommandBar provide 作用域放宽**:源隐式样式(`Grid.Resources`)仅作用于命令区模板;Web 的 provide 覆盖整个 CommandBar 组件子树(`#content` slot 内若放置 AppBarButton/AppBarToggleButton 也会默认启用,源不会)。常见用法(命令区/溢出区)与源一致,content slot 场景为放宽,登记近似。
- **ListBox 项 reveal 为借用映射**:源无 `ListBoxItemRevealStyle`,按工单「ListView/ListBox 的 item 复用 useReveal」把同族 ListView 项视觉外推,登记为无源条款。
- **AppBarButton 边框光独立成层**:根 `::after` 已被焦点下划线视觉(`:focus-visible` 虚线)占用,边框光环挂在 `__reveal` 内层 span 上(视觉语义不变,实现细节)。

## 6. 验证口径

两批实现(MR4 公共层 + Button 系/CalendarView/GridViewItem;MR8 收尾全部剩余落点)均以 chrome-headless-shell CDP 探针多点采样实测:光斑中心与指针逐点吻合、半径实测 vs 源公式逐件相等(如 ListViewItem 348×40 → 360px)、按压 47.25px、离开消退、reduced-motion 静态化、reveal 关闭路径静态零变化;`vue-tsc --build` / `oxlint` / `eslint` 0 错、页面 pageerror 0。证据截图与探针脚本见 `.superpowers/sdd/migration-plan/reports/`(MR4-reveal-report.md、MR8-reveal-complete-report.md)。

## 相关链接

- 落点控件:[Button](./Button.md) · [RepeatButton](./RepeatButton.md) · [ToggleButton](./ToggleButton.md) · [ListView](./ListView.md) · [ListBox](./ListBox.md) · [GridView](./GridView.md) · [CalendarView](./CalendarView.md) · [AppBarButton](./AppBarButton.md) · [AppBarToggleButton](./AppBarToggleButton.md) · [CommandBar](./CommandBar.md) · [ComboBox](./ComboBox.md) · [MenuFlyout](./MenuFlyout.md)
- 公共层源码:[src/styles/reveal.css](../../src/styles/reveal.css) · [src/composables/useReveal.ts](../../src/composables/useReveal.ts)(经 `src/index.ts` 对外导出)
