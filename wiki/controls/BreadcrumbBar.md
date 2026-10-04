# BreadcrumbBar

> 在线示例:[/#/breadcrumbbar](/#/breadcrumbbar) · 演示页源码:[demo/pages/BreadcrumbBarPage.vue](../../demo/pages/BreadcrumbBarPage.vue)

## 概述

BreadcrumbBar 提供一个通用的横向布局,展示到达当前位置的导航路径轨迹。容器宽度不足时节点从根部起逐个折叠为头部省略号按钮("Resize to see the nodes crumble, starting at the root"),点开省略号下拉即可回到被折叠的节点;最后一项代表当前位置,不可点击。节点内容可经 `ItemTemplate` 自定义,点击节点触发 `itemClicked` 事件,由应用决定导航语义。

官方文档:

- [BreadcrumbBar - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.breadcrumbbar)
- [BreadcrumbBar 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/breadcrumbbar)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `itemsSource` | `unknown[]` | `[]` | 数据源数组(WinUI `ItemsSource`):路径节点序列,首项为根;支持就地增删,溢出折叠自动重算 |
| `v-model:selected-item` | `unknown` | `undefined` | 选中项(Web 侧增补;点击任一节点时写入该项,WinUI 无此属性,见「与 WinUI 的差异」第 5 条) |
| `disabled` | `boolean` | `false` | 禁用整个控件:各项不可点、不可聚焦,不触发事件(Web 侧增补,沿用 WinUI `IsEnabled` 的 Disabled 视觉态) |
| `ellipsis-aria-label` | `string` | `'More items'` | 省略号按钮与其下拉的无障碍名称(Web 侧增补,便于多语言站点传入本地化文案) |
| `nav-aria-label` | `string` | `'面包屑导航'` | 根 `nav` 地标的无障碍名(Web 侧增补);同页多个 BreadcrumbBar 时应传入互不相同的区分性文案(landmark 唯一性),attrs 传 `aria-label` 亦可覆盖 |
| default slot | `{ item, index }` | — | 项模板(WinUI `ItemTemplate` 的声明式等价);缺省渲染 `String(item)` |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `itemClicked` | `{ item, index }` | 点击内联节点或省略号下拉节点时触发(下拉项回传其在 `itemsSource` 中的真实下标);最后一项为当前位置,不可点击、不触发 |

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `←` / `→` | 在可见节点(含头部省略号)间移动焦点;到边界不环绕,焦点走出控件(对齐 WinUI `MoveFocusNext/Previous` 不 Handled 即离栏的语义) |
| `Enter` / `Space` | 激活当前节点(非末项;经原生按钮语义);焦点在省略号上时打开下拉 |
| `↓` | 在省略号上打开下拉 |
| `↑` / `↓` | 下拉内项间循环移动(被折叠节点按「离当前路径最近者在上」的顺序列出,根在最下,对齐源码 `CloneEllipsisItemSource` 的反转列表) |
| `Home` / `End` | 下拉内移到首 / 末项 |
| `Esc` | 关闭下拉,焦点归还省略号按钮 |
| `Tab` | 下拉打开时关闭下拉(菜单语义);否则自然移出控件 |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiBreadcrumbBar from '@/components/BreadcrumbBar.vue'

const path = ref(['Home', 'Documents', 'Design', 'Northwind'])

// 点击节点 = 导航到该层:官方示例的做法是截断其后所有节点
function onItemClicked({ index }: { item: unknown; index: number }) {
  path.value = path.value.slice(0, index + 1)
}
</script>

<template>
  <WuiBreadcrumbBar :items-source="path" @item-clicked="onItemClicked" />

  <!-- 自定义项模板(WinUI ItemTemplate) -->
  <WuiBreadcrumbBar :items-source="folders">
    <template #default="{ item }">{{ item.name }}</template>
  </WuiBreadcrumbBar>
</template>
```

## 实现要点

- **溢出折叠算法**(`BreadcrumbLayout.cpp` 的 Web 化):组件内渲染一条隐藏测量行(与真实行同结构同类名,`visibility: hidden` + 绝对定位,不占布局、不进无障碍树),逐项实测「内容 + chevron」宽度;总宽超过容器即进入溢出态,自末项向前累加(首段预算含省略号节点宽度)求出 `firstVisible`,其间节点收进头部省略号。容器尺寸(ResizeObserver)、`itemsSource` 深度变化、字体加载完成(`document.fonts.ready`)都会触发重测;连「省略号 + 末项」都放不下时仍强制保留二者(WinUI 同款下限)。
- **省略号下拉基于弹层基建**:`usePopupAnchor` + `usePopupLayer`(`placement='bottom-start'`、间距 0,对应 WinUI `FlyoutPlacementMode.Bottom`),z-index 自动分配、翻转/推回/外部点击/Escape 栈顶收口/锚滚动关闭全部复用基建,见 [wiki/controls/_popup-infra.md](./_popup-infra.md)。省略号因容器变宽而消失或控件禁用时下拉自动收起。
- **`itemClicked` 的下标换算**:WinUI 把隐藏节点反转后喂给下拉(`CloneEllipsisItemSource`),点击时以 `itemCount - index` 换回真实下标;Web 侧下拉项直接携带真实下标,两处(内联/下拉)统一 emit `itemClicked`。
- **视觉状态**:`Normal/PointerOver/Pressed/Disabled/Focus` 即时切换(源模板各态均为 DiscreteObjectKeyFrame,无过渡动画);最后一项走 `LastItem` 态 —— 按钮收起、改渲染纯内容(不可点击、无悬停),并标 `aria-current="location"`;整栏为 `navigation` 地标(WinUI `AutomationProperties.LandmarkType="Navigation"`),Tab 落点以 roving tabindex 管理(省略号优先,等价项 `IsTabStop=True` 的头部位)。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `controls/dev/Breadcrumb/BreadcrumbBar.xaml` + `BreadcrumbBar_themeresources.xaml` 复刻(generic.xaml 本体无 `TargetType="BreadcrumbBar"` 段),以下项做了 Web 等价替换或简化:

1. **TextFill* / SubtleFill* 颜色 token(PL11 重定向)**:`BreadcrumbBarNormalForegroundBrush` = `TextFillColorPrimary` → `--wui-text-fill-color-primary`;`…HoverForegroundBrush` = `TextFillColorSecondary` → `--wui-text-fill-color-secondary`;`…PressedForegroundBrush` = `TextFillColorTertiary`(浅 44.7%/深 53%)→ `--wui-text-fill-color-tertiary`;`…DisabledForegroundBrush` = `TextFillColorDisabled`(36%)→ `--wui-text-fill-color-disabled`;当前项同 Primary。此前「取最近似/同值近似」表述(87% vs 89% 等)及相应偏差均已消除。
2. **省略号下拉项背景(PL11 重定向)**:`BreadcrumbBarEllipsisDropDownItem*` 引用 `SubtleFillColorTransparent/Secondary/Tertiary`,已直引 `--wui-subtle-fill-color-transparent/secondary/tertiary`;下拉项前景 `--wui-text-fill-color-primary/secondary`。
3. **尺寸/间距字面量**:`BreadcrumbBarChevronFontSize` 12、`BreadcrumbBarChevronPadding` "2,0"、项按钮 Padding "1,3"、行高 20、下拉项 Padding "11,7,11,9" + Margin "5,3"、层 Padding "0,2" 与 MinHeight 40、Min/MaxWidth 96/456 均为资源字面值(x:Double/Thickness 不入 token 集);圆角 `ControlCornerRadius` 4 复用 `--wui-hyperlink-focus-rect-corner-radius`(同 MenuBar/DropDownButton 约定)。
4. **下拉层背景(PL11 重定向)**:`BreadcrumbBarEllipsisFlyoutPresenterBackground` = `AcrylicBackgroundFillColorDefault` → 组件局部不透明回退色 `--wui-breadcrumb-flyout-bg`(浅 `#F9F9F9` / 深 `#2C2C2C`);描边 `SurfaceStrokeColorFlyout` → `--wui-surface-stroke-color-flyout`(浅 `#0000000F` / 深 `#00000033`)。WinUI 的亚克力材质噪声层无 Web token,取纯色近似。
5. **`selected-item` 为 Web 增补**:WinUI BreadcrumbBar 的 IDL 只有 `ItemsSource` / `ItemTemplate` / `ItemClicked`,无选中概念;`v-model:selected-item` 是 Web 侧便利(点击任一节点时写入该项),WinUI 行为不受影响,不需要可不监听。
6. **`disabled` / `ellipsis-aria-label` 为 Web 增补**:前者对应 WinUI `Control.IsEnabled`(模板存在 Disabled 视觉态),后者为省略号字形提供可本地化的无障碍名称(WinUI 由自动化对等项内部命名)。
7. **RTL / 分隔符字形**:WinUI 模板含 `DefaultRTL/EllipsisRTL` 态(chevron 换字形 E973);Web 版仅按 LTR 实现,未随 `dir` 切换。LTR 字形按源 Default 视觉态取 E974(ChevronRightSmall,`BreadcrumbBarChevronLeftToRight`)—— 模板 `PART_ChevronTextBlock` 的字面初值 E76C 会被 `UpdateInlineItemTypeVisualState` 置换;Web 版曾误用初值 E76C,已订正(VR-B20 → FIX21)。
8. **系统焦点框 / HighContrast**:WinUI 双环焦点视觉(`FocusVisualMargin=1/-3`)近似为 primary 色单环 `outline`(同 MenuBarItem);HighContrast 主题字典未适配。

---

演示页源码:[demo/pages/BreadcrumbBarPage.vue](../../demo/pages/BreadcrumbBarPage.vue) · 组件源码:[src/components/BreadcrumbBar.vue](../../src/components/BreadcrumbBar.vue) · 弹层基建:[wiki/controls/_popup-infra.md](./_popup-infra.md) · Fluent 画刷族:[_brushes.md](./_brushes.md)
