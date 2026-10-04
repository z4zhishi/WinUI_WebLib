# Fluent 画刷族总览(控件作者与消费者必读)

WinUI 3 的控件状态色在**生效层** `controls/dev/**` 里由一套 **Fluent 语义画刷族**(`ControlFillColor*` / `TextFillColor*` / `AccentFillColor*` / `SubtleFillColor*` / `Card*` / `Layer*` / `SolidBackgroundFillColor*` / `SystemFillColor*` 等)驱动;而本库早期的 `theme.css` 提取自 **legacy** `dxaml/xcp/dxaml/themes/generic.xaml`,只有 `SystemControl*` 系(legacy)取值。PL1–PL16 把 41 个控件工单的调色板重定向到 Fluent:PL2 先把 Fluent 画刷族(88 条/主题)增量落进 `theme.css`,PL3–PL16 再逐控件把状态色的 `var()` 从 legacy token 改指 Fluent token。

本文是画刷族的总口径文档:命名族对照、权威层级规则、字节序规则、画刷→token 映射表、增量 token 用途,以及**仍按权威保留 legacy 的控件及原因**。各控件页的颜色/差异节均链回本文。

## 1. 权威层级(判定规则)

画刷取值按以下优先级判定,**零臆测**:

1. **`controls/dev/**` 优先** —— 这是 WinUI 3 运行时实际加载的生效层。若某个键在此层有 Fluent 覆写,权威即该 Fluent 键。
2. **legacy `generic.xaml` 兜底** —— 若某键在 `controls/dev` 中**只有引用、没有定义**(定义只存在于 legacy `generic.xaml`),则 WinUI 3 实际生效值就是 legacy 值,**权威即 legacy**,保留原 token 不臆造 Fluent 映射。
3. **字面量** —— 少数控件模板直接写字面量(如 PullToRefresh 的 `White`/`Black`/`Transparent`),既非 Fluent 别名也非 legacy 画刷。
4. **HighContrast 字典不在范围** —— 源 HC 段用 `SystemColor*` / `SystemControl*` 系统色;本库未实现 HC 主题,不臆造(PL2 起登记)。

## 2. 命名族对照(Fluent ↔ legacy)

| 语义 | Fluent 键(controls/dev,权威) | legacy 键(generic.xaml,旧) | 本库 token `--wui-…` |
| --- | --- | --- | --- |
| 控件填充四态 | `ControlFillColorDefault/Secondary/Tertiary/Disabled` | `SystemControlBackgroundBaseLow/MediumLow/…` | `control-fill-color-default/secondary/tertiary/disabled` |
| 文本前景四态 | `TextFillColorPrimary/Secondary/Tertiary/Disabled` | `SystemControlForegroundBaseHigh/Medium/…` | `text-fill-color-primary/secondary/tertiary/disabled` |
| 强调色填充 | `AccentFillColorDefault/Secondary/Tertiary/Disabled` | `SystemControlBackgroundAccent` / `SystemControlHighlightAccent*` | `accent-fill-color-*` |
| 强调底上的文本 | `TextOnAccentFillColorPrimary/Secondary/Disabled` | `SystemControlForegroundChromeWhite` | `text-on-accent-fill-color-*` |
| 弱交互底色 | `SubtleFillColorTransparent/Secondary/Tertiary/Disabled` | `SystemControlHighlightListLow/Medium`(列表高亮) | `subtle-fill-color-*` |
| 描边 | `ControlStrokeColorDefault/Secondary`、`CardStrokeColorDefault`、`DividerStrokeColorDefault`、`SurfaceStrokeColorDefault/Flyout` | `SystemControlForegroundBaseLow` / `SystemControlBackgroundBaseLow` | `control-stroke-color-*` / `card-stroke-color-default` / `divider-stroke-color-default` / `surface-stroke-color-*` |
| 强填充/强描边(勾选框等) | `ControlStrongFillColorDefault/Disabled`、`ControlStrongStrokeColorDefault/Disabled` | `SystemControlForegroundBaseMediumHigh` 系 | `control-strong-fill-color-*` / `control-strong-stroke-color-*` |
| 卡面 / 层 / 实底 | `CardBackgroundFillColorDefault/Secondary`、`LayerFillColorDefault/Alt`、`SolidBackgroundFillColorBase/Secondary/Tertiary/…` | `SystemControlBackgroundChromeMediumLow` / `SystemControlPageBackgroundAltHigh` | `card-background-fill-color-*` / `layer-fill-color-*` / `solid-background-fill-color-*` |
| 系统语义档 | `SystemFillColorSuccess/Caution/Critical/Attention(+Background/SolidNeutral)` | — | `system-fill-color-*`(PL2 新落) |
| 通用默认文本 | `DefaultTextForegroundThemeBrush`(→ `TextFillColorPrimaryBrush`) | `ApplicationForegroundThemeBrush` | `text-fill-color-primary` |
| 亚克力(材质) | `AcrylicInAppFillColorDefaultBrush` / `AcrylicBackgroundFillColorDefaultBrush` | `SystemControlBackgroundChromeMediumLowBrush` 近似 | `acrylic-in-app-fill-color-default`(回退色)/ 组件局部 |

## 3. 字节序规则

- XAML `Color`/画刷为 **`#AARRGGBB`**(alpha 在**前**);CSS 8 位 hex 为 **`#RRGGBBAA`**(alpha 在**后**)。换算时把 AA 前移到末尾:如 `#B3FFFFFF` → `#FFFFFFB3`、`#0FFFFFFF` → `#FFFFFF0F`、`#80F9F9F9` → `#F9F9F980`、`#4C3A3A3A` → `#3A3A3A4C`。
- 不透明 6 位值原样使用(如 `#202020` → `#202020`)。
- **易错点**:直接照搬会出现 alpha 与红通道错位(如 `#09000000` 直写成 CSS 会变成 R=9、A=0 的淡红)。MR15 曾实测暴露并修复该缺陷。
- 所有 Fluent token 的取值均已按此规则换算,并逐条与 `controls/dev/**` 源行比对(见 `docs/pages/color/brush-authority.md`)。

## 4. 画刷 → token 映射表(常用键)

> 下表为控件最常消费的 Fluent 键 → 本库 token(浅 / 深 CSS 值)。完整 83 Color + 90 别名键的逐键行号见 `docs/pages/color/brush-authority.md`;控件 × 状态 × 画刷矩阵见 `docs/pages/color/control-brush-matrix.md`。

| Fluent 画刷键 | 本库 token | Light | Default(深) |
| --- | --- | --- | --- |
| `ControlFillColorDefaultBrush` | `--wui-control-fill-color-default` | `#FFFFFFB3` | `#FFFFFF0F` |
| `ControlFillColorSecondaryBrush` | `--wui-control-fill-color-secondary` | `#F9F9F980` | `#FFFFFF15` |
| `ControlFillColorTertiaryBrush` | `--wui-control-fill-color-tertiary` | `#F9F9F94D` | `#FFFFFF08` |
| `ControlFillColorDisabledBrush` | `--wui-control-fill-color-disabled` | `#F9F9F94D` | `#FFFFFF0B` |
| `ControlFillColorInputActiveBrush` | `--wui-control-fill-color-input-active` | `#FFFFFF` | `#1E1E1EB3` |
| `ControlFillColorTransparentBrush` | `--wui-control-fill-color-transparent` | `#FFFFFF00` | `#FFFFFF00` |
| `ControlAltFillColorSecondary/Tertiary/Quarternary/Disabled` | `--wui-control-alt-fill-color-*` | `#00000006`/`#0000000F`/`#00000018`/透明 | `#00000019`/`#FFFFFF0B`/`#FFFFFF12`/透明 |
| `ControlStrongFillColorDefaultBrush` | `--wui-control-strong-fill-color-default` | `#00000072` | `#FFFFFF8B` |
| `ControlStrongFillColorDisabledBrush` | `--wui-control-strong-fill-color-disabled` | `#00000051` | `#FFFFFF3F` |
| `ControlSolidFillColorDefaultBrush` | `--wui-control-solid-fill-color-default` | `#FFFFFF` | `#454545` |
| `ControlOnImageFillColorDefaultBrush` | `--wui-control-on-image-fill-color-default` | `#FFFFFFC9` | `#1C1C1CB3` |
| `TextFillColorPrimaryBrush` | `--wui-text-fill-color-primary` | `#000000E4` | `#FFFFFF` |
| `TextFillColorSecondaryBrush` | `--wui-text-fill-color-secondary` | `#0000009E` | `#FFFFFFC5` |
| `TextFillColorTertiaryBrush` | `--wui-text-fill-color-tertiary` | `#00000072` | `#FFFFFF87` |
| `TextFillColorDisabledBrush` | `--wui-text-fill-color-disabled` | `#0000005C` | `#FFFFFF5D` |
| `TextFillColorInverseBrush` | `--wui-text-fill-color-inverse` | `#FFFFFF` | `#000000E4` |
| `AccentFillColorDefaultBrush` | `--wui-accent-fill-color-default` | `SystemAccentColorDark1` `#0067C0` | `SystemAccentColorLight2` `#4CC2FF` |
| `AccentFillColorSecondary/Tertiary` | `--wui-accent-fill-color-secondary/tertiary` | `color-mix(… 90%/80%, transparent)` | 同左 |
| `AccentFillColorDisabledBrush` | `--wui-accent-fill-color-disabled` | `#00000037` | `#FFFFFF28` |
| `TextOnAccentFillColorPrimary/Secondary/Disabled` | `--wui-text-on-accent-fill-color-*` | `#FFFFFF`/`#FFFFFFB3`/`#FFFFFF` | `#000000`/`#00000080`/`#FFFFFF87` |
| `AccentTextFillColorPrimary/Secondary/Tertiary/Disabled` | `--wui-accent-text-fill-color-*` | `SystemAccentColorDark1/3/1` | `SystemAccentColorLight3` 系 |
| `SubtleFillColorTransparent/Secondary/Tertiary/Disabled` | `--wui-subtle-fill-color-*` | 透明/`#00000009`/`#00000006`/透明 | 透明/`#FFFFFF0F`/`#FFFFFF0A`/透明 |
| `ControlStrokeColorDefaultBrush` | `--wui-control-stroke-color-default` | `#0000000F` | `#FFFFFF12` |
| `ControlStrokeColorSecondaryBrush` | `--wui-control-stroke-color-secondary` | `#00000029` | `#FFFFFF18` |
| `ControlStrokeColorOnAccentDefault/Secondary/Tertiary` | `--wui-control-stroke-color-on-accent-*` | `#FFFFFF14`/`#00000066`/`#00000037` | `#FFFFFF14`/`#00000023`/`#00000037` |
| `ControlStrongStrokeColorDefault/Disabled` | `--wui-control-strong-stroke-color-*` | `#00000072`/`#00000037` | `#FFFFFF8B`/`#FFFFFF28` |
| `CardBackgroundFillColorDefault/Secondary/Tertiary` | `--wui-card-background-fill-color-*` | `#FFFFFFB3`/`#F6F6F680`/`#FFFFFF` | `#FFFFFF0D`/`#FFFFFF08`/`#FFFFFF12` |
| `CardStrokeColorDefaultBrush` | `--wui-card-stroke-color-default` | `#0000000F` | `#00000019` |
| `DividerStrokeColorDefaultBrush` | `--wui-divider-stroke-color-default` | `#0000000F` | `#FFFFFF15` |
| `SurfaceStrokeColorDefault/Flyout/Inverse` | `--wui-surface-stroke-color-*` | `#75757566`/`#0000000F`/`#FFFFFF15` | `#75757566`/`#00000033`/`#0000000F` |
| `FocusStrokeColorInner/Outer` | `--wui-focus-stroke-color-inner/outer` | `#FFFFFFB3`/`#000000E4` | `#000000B3`/`#FFFFFF` |
| `SmokeFillColorDefaultBrush` | `--wui-smoke-fill-color-default` | `#0000004D` | `#0000004D` |
| `LayerFillColorDefault/Alt`、`LayerOnAcrylic/…` | `--wui-layer-fill-color-default/alt`、`--wui-layer-on-*` | 见 token 表 | 见 token 表 |
| `SolidBackgroundFillColorBase/Secondary/Tertiary/…` | `--wui-solid-background-fill-color-*` | `#F3F3F3`/`#EEEEEE`/`#F9F9F9` | `#202020`/`#1C1C1C`/`#282828` |
| `SystemFillColorSuccess/Caution/Critical/Attention(+Background)` | `--wui-system-fill-color-*` | `#0F7B0F`/`#9D5D00`/`#C42B1C` | `#6CCB5F`/`#FCE100`/`#FF99A4` |
| `SystemFillColorSolidNeutral` | `--wui-system-fill-color-solid-neutral` | `#8A8A8A` | `#9D9D9D` |

## 5. 增量 token(按批次新增)

| token | 批次 | 用途 | 来源键(控件) |
| --- | --- | --- | --- |
| Fluent 画刷族 88 条/主题 | PL2 | `text-fill`/`accent-fill`/`control-fill`/`subtle-fill`/`card-*`/`layer-*`/`solid-background-*`/`system-fill-*` 等 | `controls/dev/CommonStyles/Common_themeresources_any.xaml`(Default L5-87 / Light L207-283) |
| `--wui-control-elevation-border`(渐变) | PL5 | 按钮族 Normal/PointerOver 的立体描边环 | `ControlElevationBorderBrush`(L186-191 / L382-390) |
| `--wui-accent-control-elevation-border`(渐变) | PL5 | 强调底按钮(Checked 系)的立体描边环 | `AccentControlElevationBorderBrush`(L198-206 / L397-405) |
| `--wui-text-control-elevation-border`(渐变) | PL6 | 文本输入族 Normal/PointerOver 的描边环 | `TextControlElevationBorderBrush`(TextBox_themeresources L48-56 / L155-163) |
| `--wui-temporary-text-fill-color-disabled` | PL6 | 文本输入族禁用前景 | `TemporaryTextFillColorDisabled`(`#0101015C`/`#FEFEFE5D`) |
| `--wui-circle-elevation-border`(渐变) | PL9 | RadioButton 内点 / ToggleSwitch 旋钮的圆形立体描边 | `CircleElevationBorderBrush`(stops 0.5/0.7,`RelativeToBoundingBox`) |
| `--wui-menu-flyout-presenter-surface` | PL12 | MenuFlyoutPresenter 层底(亚克力回退色) | `MenuFlyoutPresenterBackground` + SystemBackdrop 亚克力 |
| `--wui-acrylic-in-app-fill-color-default` | PL14 | 亚克力材质统一回退色(浅 `#F9F9F9` / 深 `#2C2C2C`) | `AcrylicInAppFillColorDefaultBrush` FallbackColor;被 FlipView / ScrollBar 轨道 / SplitButton 菜单层 / CommandBar 溢出层 / NavigationView Overlay 复用 |

## 6. 仍按权威保留 legacy 的控件及原因

以下控件/部位在 `controls/dev` 中**只有引用、没有 Fluent 定义**(定义只在 legacy `generic.xaml`),故 WinUI 3 实际生效值即 legacy 值,**权威即 legacy,保留原 token 不臆造**(PL2 起的既有口径):

| 控件 / 部位 | 权威键 | 保留的 token | 依据 |
| --- | --- | --- | --- |
| Pivot 页头项 / 导航钮 | `SystemControlForeground/Background*` 族 | `--wui-pivot-*`(legacy 值) | `Pivot_themeresources.xaml` 未迁移 Fluent;唯 `SelectedPipe` = `AccentFillColorDefaultBrush` 已重定向(PL11 §2.2) |
| SplitView 窗格底 / 遮罩 / 描边 | `SystemControlPageBackgroundChromeLow` / `SystemControlPageBackgroundMediumAltMedium` / `SystemControlForegroundTransparent` | `--wui-system-control-page-background-chrome-low`、`--wui-split-view-light-dismiss-overlay-background`、`--wui-system-control-foreground-transparent` | `SplitView_themeresources.xaml` 三键无定义(PL15 §2) |
| ListBox 容器底 / 选中三档 | `SystemControlBackgroundChromeMediumLow` / `SystemControlHighlightListAccentLow/Medium/High` | `--wui-system-control-background-chrome-medium-low`、`--wui-system-control-highlight-list-accent-*` | `ListBox_themeresources.xaml` 混合:仅 Fluent 键(前景/悬停/按压)重定向(PL14 §2) |
| ListView / GridView 容器底·描边 | legacy `<Style TargetType>` 无 Setter → 透明/无描边 | 无(透明) | controls/dev 无容器 Style(PL14 §2) |
| ListView/GridView 组头 / 分节 | `SystemControlTransparentBrush` / `SystemControlForegroundBaseLowBrush` | `--wui-list-view-header-item-*` 等 | 组头样式权威为 legacy(PL14 §10.3) |
| CommandBar 溢出层描边 | `SystemControlTransientBorderBrush`(无 Fluent 对应) | `--wui-system-control-transient-border` | PL16 §2.4 |
| MenuBarItem Border | `ControlAltFillColorTertiary` / `ControlStrokeColorDefault` | 不渲染(`BorderThickness=0`) | dev L11;仅 HC 字典为 2px(PL12 §3.2) |
| PullToRefresh | 字面量 `White`/`Black`/`Transparent`(非 Fluent 别名) | `--wui-refresh-visualizer-foreground` 等 | dev 主题资源即字面量,与现值逐条一致(PL15 §2) |
| 滚动条族共享 token | — | `--wui-scroll-bar-*`(legacy) | ScrollView/ScrollViewer 已改指 Fluent,ListBox/ListView/ItemsRepeater 仍消费 legacy(PL15 §4.3);受「theme.css 只增不改」约束未统一 |

> **另记(未决,非权威 legacy)**:DatePicker / TimePicker 的收起字段状态色仍是 legacy `--wui-date-picker-button-*` / `--wui-time-picker-button-*`,权威为 Fluent `ControlFillColor*` + `TextFillColor*` + `ControlElevationBorderBrush`,`current-impl-gap.md` §2.9/§2.10 仍标 DIFF/GRADIENT —— **字段状态色重定向未落地**(PL7 仅改了几何;PL5 §7.6 登记为后续批次)。此外 ComboBox 下拉面板底、AutoSuggestBox / NumberBox 弹层底等为亚克力材质,web 无原生等效,取不透明回退色近似。

## 7. 迁移机制与证据

- **不破坏式增量**:PL2 只在两个主题块**追加** token(88 条/主题),既有 legacy token 一字未改(0 破坏,7692 快照 × 16 属性比对偏差 0);后续批次只改**组件内的 `var()` 引用**,不动 token 定义值。
- **渐变描边实现**:`--wui-*-elevation-border` 用「内嵌绝对定位伪元素 + `mask-composite: exclude` 环」(PL5),贴合 4px 圆角、不参与布局、不破坏 `background-color` 隐式过渡;`<input>` 等替换元素改用「双背景层」(padding-box 底色 + border-box 渐变,PL8)。
- **亚克力**:web 无合成器亚克力,统一取 Fallback 不透明色 `#F9F9F9`(浅)/ `#2C2C2C`(深),噪声/模糊不可复现,逐批登记为材质近似。
- **HighContrast**:本库无 `forced-colors` 档,源 HC 字典(`SystemColor*`)未实现,逐批登记。
- 逐批断言、像素证据与截图见 `.superpowers/sdd/migration-plan/reports/PL{1..16}-*.md`。

## 相关链接

- 勘察文档(权威全表):`docs/pages/color/README.md` · `brush-authority.md` · `control-brush-matrix.md` · `current-impl-gap.md`
- 相关总览页:[Color](./Color.md)(token 命名/明暗机制/系统色钩子) · [Reveal 材料](./_reveal.md)(光照层与状态色解耦) · [弹层公共基建](./_popup-infra.md)(层皮肤 token)
