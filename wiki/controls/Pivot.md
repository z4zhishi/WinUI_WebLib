# Pivot

> 在线示例:[/#/pivot](/#/pivot) · 演示页源码:[demo/pages/PivotPage.vue](../../demo/pages/PivotPage.vue)

## 概述

Pivot(透视/枢轴控件)让用户在同一个表面上用**标题行选项卡**浏览多个分页:点击标题或按左右方向键切换分页,内容区即时切换。每个分页是一个 `PivotItem`(标题 + 内容),声明式写在 `<WuiPivot>` 默认 slot 下;也支持响应式数组 `v-for` 动态增删分页(增删后下标自动收敛到有效区间)。视觉按 `CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml` 的 Pivot / PivotItem / PivotHeaderItem ControlTemplate 复刻:标题项 48px 高、24px 字号、SemiLight 字重,**选中态不加粗**,而是前景色从 60% 提高到 100% 并显示 2px 主题色下划线(SelectedPipe);左右导航箭头(20×36,Segoe Fluent Icons 字形 E0E2/E0E3)默认隐藏,仅当**指针悬停标题行且标题溢出裁剪**时瞬时显示(VSM 两态均为 DiscreteObjectKeyFrame KeyTime=0,无淡入,MR3/B12 起与源一致),越界方向自动隐藏。颜色取 theme.css 的 `--wui-pivot-*` 全套 token。

> 提示(与官方一致):Microsoft 设计指南**不推荐**在 Windows 11 应用中继续使用 Pivot,新代码请改用 [SelectorBar](https://learn.microsoft.com/windows/apps/design/controls/selector-bar);Pivot 适合维持既有 UWP 视觉的场景。本组件按「视觉资产复刻」定位实现。

官方文档:

- [Pivot - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.pivot)
- [Pivot 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/pivot)

## 属性(Pivot)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | `undefined` | 控件标题(WinUI `Title`),显示在标题行上方(14px 粗体,左内边距 12px);未设置则整行收起 |
| `selectedIndex` (v-model) | `number` | `0` | 当前页下标(WinUI `SelectedIndex`),双向绑定;越界值自动收敛到有效区间 |
| `selectedItem` (v-model) | `unknown` | `undefined` | 当前页对应项(WinUI `SelectedItem`)。默认 slot 模式下读取到的是该页 `PivotItem` 的 VNode;外部写入时按「引用 → `key`」两级匹配定位页签,匹配不到则忽略(见差异说明) |
| `disabled` | `boolean` | `false` | 禁用(WinUI `IsEnabled = false`):标题项呈 Disabled 色、不可点,导航箭头隐藏,键盘失效 |
| `ariaLabelPrevious` | `string` | `'Previous'` | 上一页导航箭头的 aria-label,可本地化覆盖 |
| `ariaLabelNext` | `string` | `'Next'` | 下一页导航箭头的 aria-label,可本地化覆盖 |

## 属性(PivotItem)

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | `undefined` | 页签标题(WinUI `PivotItem.Header` 的 string 用法),渲染进 Pivot 标题行;`PivotItem` 自身模板只承载内容(左右 12px 外边距,`PivotItemMargin`) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `selectionChanged` | `(payload: { index: number; item: unknown })` | 选中页变化时(标题点击 / 方向键 / 导航箭头 / 程序化修改;对照 WinUI `SelectionChanged`,初始挂载不触发) |
| `update:selectedIndex` | `(value: number)` | `v-model:selected-index` 双向绑定更新 |
| `update:selectedItem` | `(value: unknown)` | `v-model:selected-item` 双向绑定更新 |

## 键盘交互

| 按键 | 行为 |
| --- | --- |
| `←` / `→`(焦点在标题行) | 切到上 / 下一页(端点截停不回绕;RTL 下方向翻转),焦点随 roving tabindex 移动 |
| `Home` / `End`(焦点在标题行) | 跳到第一 / 最后一页(Web 增强,标准 tabs 语义) |
| `Ctrl` + `PageDown` / `PageUp`(焦点在内容区) | 切到下 / 上一页(对照源 `OnKeyDownImpl`;部分浏览器将 Ctrl+PageDown 保留给浏览器换标签页,可能无法拦截) |
| `Ctrl` + `Tab` / `Ctrl` + `Shift` + `Tab`(焦点在内容区) | 切到下 / 上一页(同上;浏览器层可能优先处理) |

## Slot

| Slot | 说明 |
| --- | --- |
| 默认 slot | 分页集合:每个 `<WuiPivotItem title="…">` 子项即一页,支持响应式数组 `v-for` 动态增删 |
| `#title` | 自定义标题区内容,作用域 `{ title }`(WinUI `TitleTemplate` 的等价) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiPivot from '@/components/Pivot.vue'
import WuiPivotItem from '@/components/PivotItem.vue'

const selectedIndex = ref(0)

function onSelectionChanged(e: { index: number; item: unknown }) {
  console.log('SelectionChanged', e.index)
}
</script>

<template>
  <!-- 模板里按 WinUI 习惯写 PascalCase 亦可:<WuiPivot Title="EMAIL"> -->
  <WuiPivot
    title="EMAIL"
    v-model:selected-index="selectedIndex"
    @selection-changed="onSelectionChanged"
  >
    <WuiPivotItem title="All">all emails go here.</WuiPivotItem>
    <WuiPivotItem title="Unread">unread emails go here.</WuiPivotItem>
    <WuiPivotItem title="Flagged">flagged emails go here.</WuiPivotItem>
    <WuiPivotItem title="Urgent">urgent emails go here.</WuiPivotItem>
  </WuiPivot>
</template>
```

动态增删(响应式数组声明式组合):

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiPivot from '@/components/Pivot.vue'
import WuiPivotItem from '@/components/PivotItem.vue'

const sections = ref([
  { id: 1, title: '收件箱' },
  { id: 2, title: '已发送邮件' },
])
const index = ref(0)

function addPage() {
  sections.value.push({ id: Date.now(), title: '新建文件夹' })
}
</script>

<template>
  <WuiPivot v-model:selected-index="index">
    <WuiPivotItem v-for="s in sections" :key="s.id" :title="s.title">{{ s.title }} 的内容</WuiPivotItem>
  </WuiPivot>
  <button @click="addPage">添加页</button>
</template>
```

## 与 WinUI 的差异说明

| 项 | WinUI 源行为 | 本组件实现 |
| --- | --- | --- |
| 内容切换动画 | 默认**即时切换**:`PivotSlideInManager` 仅对显式设置 `Pivot.SlideInAnimationGroup`(GroupOne/Two/Three)附加属性的元素播放 40px×组×方向、700ms 的滑入效果,默认组(Default=0)不注册任何元素 | 与源默认一致:即时 `display` 切换、无动画;`SlideInAnimationGroup` 扩展未实现 |
| 选中标题字重 | 源模板选中态只改前景色与 SelectedPipe 下划线,`PivotHeaderItemThemeFontWeight`(SemiLight)全态不变 | 一致:选中**不加粗**(字重 350,项目 SemiLight 映射);下划线 2px 主题色、距底 2px |
| 导航箭头显示条件 | 指针悬停标题行 且 `PivotHeaderPanel.IsContentClipped`(标题溢出裁剪)且项数 > 1;越界方向隐藏(`showPrevious = SelectedIndex > 0`) | 一致:hover + `scrollWidth > clientWidth` 溢出检测 + 端点隐藏;标题未溢出时悬停也不显示(与源一致) |
| `CharacterSpacing` | `PivotHeaderItemCharacterSpacing = -25`(1/1000 em × 24px) | `letter-spacing: -0.6px`(换算值,无对应 token) |
| 字体族 | `XamlAutoFontFamily` / `PivotHeaderItemFontFamily` | 回退浏览器默认字体(`inherit`),不加载 Segoe 字体(项目 R1 约定) |
| `LeftHeader` / `RightHeader` / `HeaderTemplate` / `ItemTemplate` / `ItemsSource` | Pivot 的附加标题区与模板化数据绑定 API | 未实现;声明式 `WuiPivotItem` 子项即等价用法,`#title` slot 覆盖 `TitleTemplate` |
| `SelectedItem` 双向 | 单向读取(SelectedItem 由选中态派生) | 读取一致;额外支持写入定位 —— 默认 slot 模式下 VNode 每次父组件重渲染都会重建,故写入按「引用 → `key`」匹配,匹配不到忽略(建议以 `selectedIndex` 为主绑定) |
| `PivotItem` 内容保活 | 非选中页 `Visibility` 收起而非销毁(`UpdateItemVisibility`),内容状态保留 | 一致:所有页保持挂载,非选中 `v-show` 收起,组件状态切换间不丢失 |
| 焦点视觉 | 标题项 `UseSystemFocusVisuals=False`,焦点矩形由 Pivot `FocusFollower` 承载 | 简化为标题按钮 `:focus-visible` 单环 outline(`--wui-system-control-focus-visual-primary`),roving tabindex 符合 WAI-ARIA tabs 模式 |
| 游戏板按键 | GamepadLeft/RightShoulder 翻页 | 未实现(桌面 Web 场景不适用) |

## 相关链接

- 演示页:`demo/pages/PivotPage.vue`(路由 `/#/pivot`)
- 组件源码:`src/components/Pivot.vue`、`src/components/PivotItem.vue`
- 姊妹控件:[FlipView](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.flipview)(逐页翻阅)、[SelectorBar](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.selectorbar)(WinUI 11 推荐替代)
