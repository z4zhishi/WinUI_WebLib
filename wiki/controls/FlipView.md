# FlipView

> 在线示例:[/#/flipview](/#/flipview) · 演示页源码:[demo/pages/FlipViewPage.vue](../../demo/pages/FlipViewPage.vue)

## 概述

FlipView 让用户**逐页翻阅**一个集合:同一时刻只显示一项,通过前后箭头按钮、触摸拖拽、键盘方向键(或鼠标滚轮)翻到上 / 下一页。最适合展示图库照片、杂志页面、商品大图轮播这类「逐项浏览」的内容。组件支持两种供项方式:默认 slot 直接声明多个子项(每多一个子元素即多一页),或 `itemsSource` 数据数组配合 `#item` 作用域 slot 自定义项模板(等价 WinUI `ItemTemplate`)。`selectedIndex` 为双向绑定,可与后续的 PipsPager 控件直接 v-model 互联。视觉按 `CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml` 的 FlipView ControlTemplate 复刻:前后箭头按钮(横向 20×36 / 纵向 36×20,Segoe Fluent Icons 字形 12px)默认隐藏,指针悬停或键盘聚焦时淡入,颜色取 theme.css 的 `--wui-flip-view-*` 专用 token。

官方文档:

- [FlipView - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.flipview)
- [FlipView 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/flipview)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `itemsSource` | `unknown[]` | `undefined` | 数据源数组(WinUI `ItemsSource`);提供时优先于默认 slot,项内容走 `#item` 作用域 slot 渲染 |
| `orientation` | `'Horizontal' \| 'Vertical'` | `'Horizontal'` | 翻页方向(WinUI `Orientation`):箭头位置、拖拽轴向与方向键映射随动 |
| `selectedIndex` (v-model) | `number` | `0` | 当前项下标(WinUI `SelectedIndex`),双向绑定;越界值自动收敛到有效区间 |
| `useTouchAnimationsForAllNavigation` | `boolean` | `true` | 按钮与键盘等所有导航都播放触摸式滑动动画(WinUI 同名属性);关闭后相邻翻页直接跳转 |
| `wrap` | `boolean` | `false` | 循环翻页(Web 扩展):端点处回绕到另一端;源行为为端点截停不循环 |
| `disabled` | `boolean` | `false` | 禁用整控交互(WinUI `IsEnabled = false`),箭头按钮呈半透明 |
| `ariaLabelPrevious` | `string` | `'Previous'` | 上一项按钮的 aria-label,可本地化覆盖 |
| `ariaLabelNext` | `string` | `'Next'` | 下一项按钮的 aria-label,可本地化覆盖 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectionChanged` | `(payload: { index: number; item: unknown })` | 选中项变化时(按钮 / 键盘 / 拖拽 / 滚轮 / 程序化修改;对照 WinUI `SelectionChanged`) |
| `update:selectedIndex` | `(value: number)` | `v-model:selected-index` 双向绑定更新 |

## Slot

| Slot | 说明 |
| --- | --- |
| 默认 slot | 逐页内容:多子项即多页(如多个 `<img>`) |
| `#item` | `itemsSource` 模式的项模板,作用域 `{ item, index }`(WinUI `ItemTemplate` 等价);缺省渲染 `String(item)` |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiFlipView from '@/components/FlipView.vue'

const selectedIndex = ref(0)

// 数据驱动 + 自定义项模板
const items = [
  { title: '第一页', image: '/img/one.jpg' },
  { title: '第二页', image: '/img/two.jpg' },
]

function onSelectionChanged(e: { index: number; item: unknown }) {
  console.log('SelectionChanged', e.index)
}
</script>

<template>
  <!-- 声明式多子项(每多一个子元素即多一页) -->
  <WuiFlipView
    v-model:selected-index="selectedIndex"
    @selection-changed="onSelectionChanged">
    <img src="/img/cliff.jpg" alt="Cliff" />
    <img src="/img/grapes.jpg" alt="Grapes" />
  </WuiFlipView>

  <!-- ItemsSource + #item 项模板;竖向翻转 -->
  <WuiFlipView :items-source="items" orientation="Vertical">
    <template #item="{ item }">
      <div class="page">
        <img :src="item.image" alt="" />
        <span>{{ item.title }}</span>
      </div>
    </template>
  </WuiFlipView>
</template>
```

## 交互一览

- **前后箭头**:默认隐藏,指针悬停控件或键盘聚焦时淡入(源 `ResetButtonsFadeOutTimer` / `HideButtonsImmediately` 行为);不循环时到达端点后对应箭头隐藏(源 `nothingPrevious` / `nothingNext`)。
- **触摸 / 鼠标拖拽**:直接操纵跟手;松手时位移超过阈值(视口短边 20%,收敛到 40–140px)提交翻页,否则回弹;端点外拖拽有 1/3 阻尼(橡皮筋)。横向模式 `touch-action: pan-y`,不阻挡页面纵向滚动。
- **键盘**:控件聚焦后,方向键翻页(横向 → ←/→,纵向 → ↑/↓,与源按键映射一致),Home / End 跳到首 / 末页。
- **滚轮**:方向变化或停顿 ≥200ms 才翻转一次(源 `s_scrollWheelDelayMS` 节流);端点截停时不吞事件,页面继续滚动。
- **切换动画**:相邻页且 `useTouchAnimationsForAllNavigation = true` 时播放滑动过渡(`--wui-duration-normal` + `--wui-easing-standard`);非相邻跳转(Home/End、wrap 回绕、程序化大跨度赋值)按源规则直接切换不动画;拖拽松手属直接操纵回弹,始终动画。
- **PipsPager 联动预留**:`selectedIndex` 双向绑定,后续 PipsPager 控件落地后可直接 `v-model:selected-index` 互联(演示页以圆点排预演)。

## 无障碍

- 根元素 `role="group"` + `aria-roledescription="carousel"`,轨道 `role="list"`、每页 `role="listitem"`(对照官方示例的 `AutomationControlType="List"`)。
- 非当前页带 `aria-hidden` 与 `inert`,移出可访问性树与焦点序;箭头按钮 `aria-label` 可经 `ariaLabelPrevious` / `ariaLabelNext` 覆盖,且 `tabindex="-1"` 不进入 Tab 序(源 `IsTabStop=false`)。
- 根元素可聚焦(`tabindex="0"`),`:focus-visible` 显示焦点框;`prefers-reduced-motion` 时过渡时长趋近 0(animations.css 全局降级)。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `generic.xaml` 的 FlipView Style/ControlTemplate(L11586-11846)与 `controls/dev/CommonStyles/FlipView_themeresources.xaml` 复刻。颜色全部命中 theme.css 的 `--wui-flip-view-*` 专用 token,映射如下:

| 源资源 | 本组件 token | 差异说明 |
| --- | --- | --- |
| `FlipViewBackground` | `--wui-flip-view-background`(#00000019) | theme.css 提取自经典 generic.xaml 字典;WinUI 3 该键指向 `SolidBackgroundFillColorBaseBrush`(不透明页面底色),观感略有差异 |
| `FlipViewButtonBackgroundThemeBrush` 系列(Normal/PointerOver/Pressed) | `--wui-flip-view-next-previous-button-background(-pointer-over / -pressed)`(#00000066 → #00000099 → #000000cc) | 逐值命中;WinUI 3 同键为 `AcrylicInAppFillColorDefaultBrush`(应用内亚克力),Web 以同梯度半透明黑近似 |
| `FlipViewButtonForegroundThemeBrush` 系列 | `--wui-flip-view-next-previous-arrow-foreground`(#ffffffcc) | 三态同值,逐值命中;WinUI 3 为 `ControlStrongFillColorDefaultBrush` 系 |
| `FlipViewButtonBorderThemeBrush` 系列 | `--wui-flip-view-next-previous-button-border(-pointer-over / -pressed)`(transparent) | WinUI 3 `FlipViewButtonBorderThemeThickness = 0`,边框不可见,token 为透明 |
| `FlipViewItemBackground` | `--wui-flip-view-item-background`(transparent) | 逐值命中 |

其余无 token / 做 Web 等价替换的项:

1. **`UseTouchAnimationsForAllNavigation` 默认值**:源为稀疏属性,默认值槽回退到 `Selector.IsSelectionActive`(StaticMetadata.g.cpp L40239),即 `true`;MSDocs 同样标注默认 true。本组件默认 `true`,语义与源一致(关闭后仅触摸拖拽有滑动,按钮 / 键盘翻页直接跳转)。
2. **不循环(wrap)为源默认行为**:源 `MoveNext` / `MovePrevious`(FlipView_Partial.cpp L117-185)在端点截停、不回绕,配合端点箭头隐藏。`wrap` 属性是 Web 扩展(默认 `false` 与源一致);开启后箭头恒显,wrap 回绕属非相邻跳转、按源规则不播放滑动动画。
3. **未实现 `isHomePage`**:WinUI FlipView API 无此属性(推测对应「首页大图轮播」形态),未添加;箭头按钮 hover 显隐已按源默认行为内置。
4. **虚拟化未复刻**:源用 `VirtualizingStackPanel` + ScrollViewer 吸附(`MandatorySingle`)实现按需实例化与手势吸附;Web 端以「全部渲染 + transform 位移 + 阈值提交 / 回弹」等价实现,项数极大时不做虚拟化(教学组件,页数多时建议自行分页)。
5. **箭头按钮焦点**:`tabindex="-1"` 不进 Tab 序(源按钮 `IsTabStop=false`,焦点由控件级 `TabNavigation="Once"` 承接);控件根元素可聚焦并响应方向键。
6. **禁用态视觉**:源模板未定义 Disabled 视觉态;Web 以箭头 40% 透明度 + `pointer-events: none` 表达(WinUI 中 IsEnabled=false 仅拦截输入)。
7. **尺寸资源未提取**:箭头 20×36(横向)/ 36×20(纵向)、字形 12px 为模板内字面量,按值写死为对应 CSS;控件高度无默认值,需调用方指定(WinUI 同样需要显式尺寸)。
8. **事件签名**:`SelectionChanged(sender, args)` 简化为 `selectionChanged({ index, item })` 载荷对象;属性命名 `ItemsSource` → `itemsSource`、`SelectedIndex` → `v-model:selected-index`、`Orientation` → `orientation`。

---

演示页源码:[demo/pages/FlipViewPage.vue](../../demo/pages/FlipViewPage.vue) · 组件源码:[src/components/FlipView.vue](../../src/components/FlipView.vue)
