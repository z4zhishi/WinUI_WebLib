# TeachingTip

> 在线示例:[/#/teachingtip](/#/teachingtip)

## 概述

XAML TeachingTip 控件为应用提供一种无侵入、内容丰富的通知方式,用于引导用户、聚焦新功能或讲解任务(教学时刻)。与 Flyout 不同,它面向「教学」场景:内容量大(可含 hero 大图、图标、标题、正文、操作按钮),指向目标元素(targeted,带尾巴)或以视口浮层出现(non-targeted)。

- 官方 API 文档:[TeachingTip - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.teachingtip)
- 官方设计指南:[Guidelines - Teaching tip](https://learn.microsoft.com/windows/apps/design/controls/dialogs-and-flyouts/teaching-tip)

视觉与行为对照源:`CK/WinUI-Reference/controls/dev/TeachingTip/`(TeachingTip.xaml 模板、TeachingTip_themeresources.xaml 主题资源、TeachingTip.cpp 定位/关闭逻辑);示例参数组合对照 `CK/WinUI-Gallery/WinUIGallery/Samples/TeachingTip/TeachingTipPage.xaml`。

弹层定位基于公共基建 [弹层公共基建](./_popup-infra.md)(usePopupLayer + nextPopupZIndex):z-index 自动分配、flip/shift、嵌套弹层豁免均为基建能力,本组件不手写几何。

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| `v-model:is-open` | `boolean` | `false` | 开关状态双向绑定(WinUI `IsOpen`);初始 `true` 时挂载即开 |
| `target` | `HTMLElement \| string \| null` | `null` | 目标元素(元素或 CSS 选择器,WinUI `Target`);**缺省 = non-targeted 视口浮层** |
| `title` | `string` | `''` | 标题(SemiBold,WinUI `Title`) |
| `subtitle` | `string` | `''` | 副标题(WinUI `Subtitle`) |
| `content` | `string` | `''` | 正文(WinUI `Content` 的 string 形态);默认插槽优先 |
| `preferredPlacement` | [`TeachingTipPlacementModeValue`](#放置位映射) | `'Auto'` | 首选放置位,WinUI 全枚举 14 值 |
| `heroContentPlacement` | `'Auto' \| 'Top' \| 'Bottom'` | `'Auto'` | hero 内容位置;`Auto` 随放置位翻到背侧 |
| `actionButtonContent` | `string` | `''` | 底部操作按钮文本;空 = 不显示 |
| `closeButtonContent` | `string` | `''` | 底部关闭按钮文本;空 = 改用右上角 ✕(WinUI 按钮组合逻辑见下) |
| `isLightDismissEnabled` | `boolean` | `false` | 外部按下即关(light dismiss),且表面换亚克力近似底色 |
| `tailVisibility` | `'Auto' \| 'Visible' \| 'Collapsed'` | `'Auto'` | 尾巴可见性;non-targeted 默认无尾,`Visible` 可强制 |
| `placementMargin` | `number` | `0` | 与锚/视口边的间距 px(WinUI `PlacementMargin`) |
| `shouldConstrainToRootBounds` | `boolean` | `true` | non-targeted 是否推回视口内(WinUI 同名属性) |
| `icon` | `SymbolValue` | — | 图标(SymbolIcon 枚举名,如 `Refresh`;WinUI `IconSource` 的 SymbolIconSource 形态) |

按钮组合(WinUI `UpdateButtonsState`):`closeButtonContent` 非空 → 底部双钮/单钮 + 隐藏右上角 ✕;仅 action + light dismiss → 只显示 action;无任何按钮内容 → 显示右上角 ✕(非 light dismiss 时)。

## 插槽

| 插槽 | 说明 |
| ---- | ---- |
| `default` | 正文富内容(WinUI `Content` 对象形态) |
| `hero` | hero 内容,边到边贴气泡一侧(WinUI `HeroContent`) |
| `icon` | 富图标(WinUI `IconSource` 对象形态),缺省渲染 `icon` 属性 |

## 事件

| 事件 | 参数 | 触发时机 |
| ---- | ---- | -------- |
| `action-button-click` | — | 操作按钮点击;**只通知不关泡**(WinUI `ActionButtonClick`) |
| `close-button-click` | — | 关闭按钮(底部或右上角 ✕)点击,随后进入关闭时序(WinUI `CloseButtonClick`) |
| `closing` | `{ reason, cancel }` | 关闭前触发;处理器置 `args.cancel = true` 可取消并回滚 `is-open`(WinUI `ClosingEventArgs.Cancel`) |
| `closed` | `{ reason }` | 出场动画结束后触发,`reason ∈ 'CloseButton' \| 'LightDismiss' \| 'Programmatic'`(WinUI `Closed`) |
| `opened` | — | 打开后触发(WinUI `Opened`) |

关闭时序:`closeButton` 点击 / 外部按下(`isLightDismissEnabled`)/ 编程置 `is-open = false` → `closing(reason, 可取消)` → 出场动画 → `closed(reason)`。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiTeachingTip from '@/components/TeachingTip.vue'

const isOpen = ref(false)
</script>

<template>
  <!-- targeted:锚定按钮,尾巴指向,placement 全枚举 -->
  <WuiButton id="show-tip">Show TeachingTip</WuiButton>
  <WuiTeachingTip
    v-model:is-open="isOpen"
    target="#show-tip"
    title="This is the title"
    subtitle="And this is the subtitle"
    preferred-placement="Bottom"
    icon="Refresh"
    action-button-content="Action button"
    close-button-content="Close button"
    :is-light-dismiss-enabled="true"
    :placement-margin="20"
    @closed="(args) => console.log(args.reason)"
  >
    <template #hero>
      <div class="hero">hero 内容(边到边)</div>
    </template>
    Description can go here
  </WuiTeachingTip>

  <!-- non-targeted:不传 target,视口居中浮层,无尾巴 -->
  <WuiTeachingTip v-model:is-open="open" title="Non-targeted" />
</template>
```

## 放置位映射(基建 placement + offset 组合扩展)

基建 `usePopupLayer` 只支持 `top/bottom/left/right × start/center/end`;TeachingTip 的八角与 Center 放置位按 WinUI `PositionTargetedPopup`(TeachingTip.cpp L477-569)的语义,用 **交叉轴 offset 组合扩展** 实现(映射在本组件 `resolvePopupPlacement` / `resolvePopupOffset`,交叉轴值随锚尺寸动态计算):

| WinUI `PreferredPlacement` | 基建 placement | 交叉轴 offset | 几何语义 |
| -------------------------- | -------------- | ------------- | -------- |
| `Auto` | `bottom` | 0 | 底侧首选 + flip 自动兜底(=「系统自行翻转」) |
| `Top` / `Bottom` / `Left` / `Right` | `top` / `bottom` / `left` / `right` | 0 | 居中贴边,尾巴中心指目标中心 |
| `TopRight` | `top-start` | `锚宽/2 − 10` | 尾心在目标中心,气泡向右上象限展开 |
| `TopLeft` | `top-end` | `10 − 锚宽/2` | 向左上展开 |
| `BottomRight` | `bottom-start` | `锚宽/2 − 10` | 向右下展开 |
| `BottomLeft` | `bottom-end` | `10 − 锚宽/2` | 向左下展开 |
| `LeftTop` | `left-end` | `10 − 锚高/2` | 向左上展开 |
| `LeftBottom` | `left-start` | `锚高/2 − 10` | 向左下展开 |
| `RightTop` | `right-end` | `10 − 锚高/2` | 向右上展开 |
| `RightBottom` | `right-start` | `锚高/2 − 10` | 向右下展开 |
| `Center` | `top` | —(主轴 offset = `−锚高/2`) | 气泡底缘对目标垂直中线,尾巴插入目标 |

常量:尾巴三角 20×10、伸出 7px、压边 3px、主轴锚距 8px(尾巴伸出 7 + 描边缝 1);角落位尾心距气泡近边 10px(WinUI 列 8 + 尾边距 10 的内容盒等价)。

尾巴旋向随基建写入的 `data-wui-placement`(flip 后实际基位)旋转;**小屏折叠**:翻转/推回后主轴缝隙容不下尾巴(7px)或目标中心超出尾巴可达范围(尾心距近边 10px)时自动隐藏尾巴——对应 WinUI effective placement 退化后隐藏尾巴的行为。`Center` 例外(尾巴本就插入目标,不做主轴判定)。

non-targeted 模式以 0×0 fixed 视口锚点复用同一基建:贴边放置位映射为相对锚点的展开方向,`Auto`/`Center` 用 `−layerH/2` 主轴 offset 实现视口居中;八角位按 WinUI `DetermineEffectivePlacementUntargeted` 退化为四角(`LeftTop`≡`TopLeft`、`LeftBottom`≡`BottomLeft`、`RightTop`≡`TopRight`、`RightBottom`≡`BottomRight`,无尾时两组语义重合)。

## 与 WinUI 的差异说明

对照 `TeachingTip_themeresources.xaml` / `TeachingTip.xaml` 与 `theme.css` token 的取值映射(源值均为 AARRGGBB,已按字节序换算 RRGGBBAA 核对):

| WinUI 源值 | 本组件 token | 差异 |
| ---------- | ------------ | ---- |
| `TeachingTipBackgroundBrush` = `SolidBackgroundFillColorTertiaryBrush`(浅 #F9F9F9 / 深 #282828) | `--wui-flyout-presenter-background`(浅 #f2f2f2 / 深 #2b2b2b) | theme.css 无 Tertiary 背景 token,取弹层表面既有 token(与 ToolTip 的亚克力近似同一策略) |
| `TeachingTipBorderBrush` = `SurfaceStrokeColorDefaultBrush`(#75757566 双主题) | `--wui-flyout-border-theme`(浅 #00000024 / 深 #0000005c) | 无 SurfaceStroke token,取弹层边框既有 token |
| `TeachingTipForegroundBrush` = `TextFillColorPrimaryBrush`(浅 #000000E4 / 深 #FFFFFF) | `--wui-default-text-foreground-theme`(浅 #000000 / 深 #ffffff) | 无 89% 透明度文字 token,沿用 InfoBar 对 TextFillColorPrimary 的既有映射 |
| `TeachingTipTransientBackgroundBrush` = `AcrylicInAppFillColorDefaultBrush`(亚克力) | `--wui-tool-tip-background`(浅 #f2f2f2 / 深 #2b2b2b) | Web 无合成器亚克力,以不透明近似(ToolTip 同源差异) |
| `TeachingTipTopHighlightBrush`(顶缘 1px 高光,浅 #FFFFFF99 / 深 #FFFFFF0D) | 未实现 | 纯装饰 1px 细节,theme.css 无对应 token,省略 |
| `AlternateCloseButton` 三态底色 = `SubtleFillColorTransparent/Secondary/Tertiary` | `--wui-app-bar-button-background(-pointer-over/-pressed)` | 无 SubtleFill token,沿用 InfoBar 关闭钮的 AppBarButton 系既有映射 |
| 尾巴压边:水平尾 3px / 垂直尾 1px | 统一 3px | 视觉近似 |
| non-targeted `Auto` 放置 = 视口**底部居中**(`DetermineEffectivePlacementUntargeted`) | 视口**居中** | 按任务口径;需要底部居中时用 `preferred-placement="Bottom"` |
| WinUI 放不下时整体不开(`tipDoesNotFit` → `IsOpen(false)`) | flip/shift 推回 + 尾巴折叠,不关闭 | Web 侧保留可用性优先 |
| Deferral 异步取消关闭(`ClosingEventArgs.GetDeferral`) | 同步 `args.cancel`(Web 无异步 deferral 场景) | 取消语义一致 |
| 焦点:打开后不强制移动焦点 | 同(层内按钮自然 Tab 可达) | 无差异 |

基建级差异(阴影 ThemeShadow → 双层 box-shadow、圆角 OverlayCornerRadius → `--wui-popup-corner-radius`、Topmost 视觉树 → nextPopupZIndex 开启顺序)见[弹层公共基建](./_popup-infra.md)差异节。

**行为注意**:WinUI TeachingTip **不响应 Escape**(TeachingTip.cpp 全文无 Escape 路径),本组件保持一致——关闭路径只有 close 按钮、light dismiss(启用时)与编程置 `is-open = false`。

## 互链

- 演示页源码:[demo/pages/TeachingTipPage.vue](../../demo/pages/TeachingTipPage.vue)
- 组件源码:[src/components/TeachingTip.vue](../../src/components/TeachingTip.vue)
- 弹层公共基建:[_popup-infra.md](./_popup-infra.md)(定位/z-index/焦点/自动关闭约定)
- 已接入弹层控件:[ToolTip](./ToolTip.md)、[MenuFlyout](./MenuFlyout.md)、[Flyout](./Flyout.md)、[Popup](./Popup.md)
