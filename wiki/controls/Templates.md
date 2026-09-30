# Templates(模板)

> 在线示例:[/#/templates](/#/templates)

## 概述

模板定义了控件的结构与外观。与「设置属性值」的样式(Style)不同,模板通过重新定义视觉树(构成控件的 XAML 元素树),让你彻底改变控件的样子而保留其功能。WinUI 中有三类模板:**ControlTemplate**(重定义控件自身的视觉树)、**DataTemplate / ItemTemplate**(改变集合控件中单个数据项的呈现)、**ItemsPanelTemplate**(定义项集合的布局面板);在此之上,`DataTemplateSelector` 允许按数据在多个模板中选择。

模板可定义在应用、页面或控件级(同样式与资源),按作用域与复用需求决定放置位置。Web 端没有 XAML 资源系统,对应物是 Vue 的作用域插槽、动态组件与组件封装——本页用已入库的 [ListView](./ListView.md)、[GridView](./GridView.md)、[ComboBox](./ComboBox.md) 复刻官方示例效果。

对应 WinUI `Microsoft.UI.Xaml` 模板体系,官方示例源:`CK/WinUI-Gallery/WinUIGallery/Samples/Templates/`(ComboBox 圆点项模板、ListView ItemsPanel 切换、自定义 TextBox ControlTemplate)。

官方文档:

- [XAML Control Templates](https://learn.microsoft.com/windows/apps/design/style/xaml-control-templates)
- [ControlTemplate - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.controltemplate)
- [DataTemplate - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.datatemplate)
- [ItemsPanelTemplate - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.itemspaneltemplate)

## WinUI 模板 ↔ Web 等价物

| WinUI 模板 | 作用 | Web / Vue 等价物 |
| --- | --- | --- |
| `DataTemplate` / `ItemTemplate` | 定义集合控件中单个数据项的呈现 | `#item` 作用域插槽(slot props:`item` / `index`;GridView 额外给 `selected`) |
| `DataTemplateSelector` | 按数据(类型 / 字段)返回不同模板 | 插槽内 `v-if` / `v-else-if` 分支,或 `<component :is>` 动态组件(模板映射表) |
| `ItemsPanelTemplate` | 定义项集合的布局面板(`StackPanel` / `WrapGrid` / `UniformGridLayout`…) | 布局容器:CSS flex / grid;本库以 `WuiListView`(栈式)与 `WuiGridView`(换行网格)承载 |
| `ControlTemplate` | 重定义控件自身的视觉树(结构 + 视觉状态) | 组件封装:内部模板 + scoped CSS(本库各 `src/components/WuiXxx.vue` 即一份 `generic.xaml` ControlTemplate 的 Web 版);自定义皮肤 = 组合子组件或 CSS 覆写 |
| `TemplateBinding` / `{Binding}` / `x:Bind` | 模板内取数据与控件属性 | 插槽作用域变量(`{{ item.xxx }}`)、props、`ref` |
| `StaticResource` 引用模板 / 资源放置层级 | app / page / control 三级定义与复用 | 全局注册组件(应用级)/ 页面具名插槽(页面级、可复用)/ 组件 fallback 插槽内容(控件级默认模板) |

## `#item` 插槽契约(本库已入库组件)

| 组件 | `#item` slot 参数 | 对应 WinUI |
| --- | --- | --- |
| `WuiListView` | `{ item: unknown; index: number }` | `ListView.ItemTemplate`(`DataTemplate`) |
| `WuiGridView` | `{ item: unknown; index: number; selected: boolean }` | `GridView.ItemTemplate`(`DataTemplate`) |
| `WuiComboBox` | `{ item: unknown; index: number }` | `ComboBox.ItemTemplate`(`DataTemplate`) |

缺省(不写插槽)时按 `displayMemberPath` / `String(item)` 渲染文本,等价于 WinUI 的 `DisplayMemberPath`。

## DataTemplate:官方示例复刻

### ComboBox 圆点项模板

官方示例 `TemplatesCustomizeComboboxItemtemplateDatatemplate` 用 `DataTemplate` 把 ComboBox 的每项渲染为「8px 强调色圆点 + 文本」。Web 端等价写法(`#item` 插槽 + 两个元素):

```vue
<WuiComboBox :items="options" header="Options" v-model:selected-index="index">
  <template #item="{ item }">
    <span class="dot-item">
      <span class="dot" aria-hidden="true"></span>
      <span>{{ item }}</span>
    </span>
  </template>
</WuiComboBox>

<style scoped>
.dot-item { display: inline-flex; align-items: center; gap: 8px; }
.dot { width: 8px; height: 8px; background: var(--wui-system-accent-color); border-radius: 50%; }
</style>
```

### Teams:对象数组渲染成卡片

经典 WinUI Gallery 数据模板演示(Teams 数据)把对象数组(`division / name / win / loss`)渲染为分组卡片。插槽作用域 `item` 的任意字段都可参与呈现,派生值(胜率)在渲染时现算,还能在模板内 `v-if` 条件渲染(每组第一队多渲染一条分组横幅):

```vue
<WuiListView :items="teams" selection-mode="Single" display-member-path="name">
  <template #item="{ item, index }">
    <span v-if="isDivisionStart(index)" class="team-banner">{{ teamOf(item).division }} 组</span>
    <span class="team-card">
      <span class="team-chip" aria-hidden="true">{{ teamOf(item).division }}</span>
      <span class="team-text">
        <span class="team-name">{{ teamOf(item).name }}</span>
        <span class="team-meta">
          {{ teamOf(item).win }} 胜 · {{ teamOf(item).loss }} 负 · 胜率 {{ winRate(teamOf(item)) }}
        </span>
      </span>
    </span>
  </template>
</WuiListView>
```

`item` 的插槽类型是 `unknown`,建议在 `<script setup>` 里写一个兜底转换函数(如上 `teamOf`)再取字段,vue-tsc 下不需要在模板里反复断言。

## DataTemplateSelector:按数据字段切换模板

WinUI 的 `DataTemplateSelector` 是一个类:派生并重写 `SelectTemplateCore`,按 item 返回不同 `DataTemplate`(官方 `ItemsRepeater` 混合类型集合示例的 `StringOrIntTemplateSelector` 即此模式)。Web 端没有类继承,等价物是**一个返回模板种类的纯函数 + 插槽内分支**:

```vue
<script setup lang="ts">
type Kind = 'contact' | 'team'

// SelectTemplateCore 的 Web 等价:按数据字段返回模板种类
function selectTemplate(item: unknown): Kind {
  if (typeof item === 'object' && item !== null && (item as { kind?: string }).kind === 'team') {
    return 'team'
  }
  return 'contact'
}
</script>

<template>
  <WuiListView :items="roster" display-member-path="name">
    <template #item="{ item }">
      <!-- 写法一:插槽内 v-if 分支(模板少时最直接);模板定字段:副行按「所选模板」读字段 -->
      <template v-if="selectTemplate(item) === 'contact'">
        …联系人卡片(副行读 item.title,数据缺该字段渲染为空)…
      </template>
      <template v-else>
        …团队卡片(副行读 item.win / item.loss)…
      </template>

      <!-- 写法二:动态组件 + 模板映射表(模板较多时更清晰) -->
      <!-- <component :is="templateMap[selectTemplate(item)]" :item="item" /> -->
    </template>
  </WuiListView>
</template>
```

写法二把每种模板做成一个子组件,用映射表(`const templateMap: Record<Kind, Component> = { contact: ContactCard, team: TeamCard }`)承接选择函数的返回值,`<component :is>` 负责实例化——这是「动态组件」版的 `DataTemplateSelector`,模板数量多或需要复用时优于 `v-if` 链。

选择器选错模板时的表现值得一观:本页字段访问按「所选模板」分发,而非按数据自身类型——联系人模板读 `title`,团队模板读 `win` / `loss`,主行 `name` 两种模板共用;**模板定字段,数据缺该字段则渲染为空**(等价 WinUI 模板绑定失败留空)。示例页参数面板可切换 `Auto / Fixed` 规则观察:如 `Fixed: Contact` 强制下,团队数据的副行(`title`)即为空。

## ItemsPanelTemplate:布局面板

官方第三个示例把同一个 ListView 的 `ItemsPanel` 在 `WrapGrid(Orientation=Horizontal)` 与 `StackPanel` 之间切换(20 项)。`WuiListView` 只承载栈式面板,换行网格由 `WuiGridView` 承载——Web 端「换面板」的等价做法就是换布局容器(组件或 CSS 容器):

```vue
<WuiGridView v-if="panel === 'WrapGrid'"
  :items="items" selection-mode="None" :item-width="160" :item-height="48" />
<WuiListView v-else :items="items" selection-mode="None" />
```

## ControlTemplate:Web 端如何等价

官方示例 `TemplatesCustomizeLookTextboxControltemplate` 用 `ControlTemplate` 把 TextBox 重排为「Header 文本 + 带图标的边框内容区」。Web 端控件的视觉树由组件内部的模板 + scoped CSS 决定,不存在「替换宿主控件模板」的机制,等价做法是:

1. **组合组件**:把原生元素与既有组件按新结构包一层(对应官方示例中 `StackPanel + Border + SymbolIcon + ScrollViewer` 的自组),本页不再单独演示;
2. **CSS 覆写**:对既有组件的 `--wui-*` token 或结构类做局部覆盖;
3. **自定义组件**:像本库各 `src/components/WuiXxx.vue` 一样,为一份 `generic.xaml` ControlTemplate 写一个 Web 组件(含完整视觉状态)。

## 与 WinUI 的差异说明

- **模板不是资源**:XAML 模板经 `Page.Resources` / `StaticResource` 定义与引用,存在 app → page → control 的资源查找链;Vue 没有资源系统,「复用模板」对应抽成子组件(应用级)或具名插槽(页面级),「控件默认模板」对应组件内插槽的 fallback 内容。
- **无编译期绑定**:`x:Bind` / `{Binding}` 有(编译期)路径求值与 `x:DataType` 类型检查;Web 插槽作用域 `item` 是 `unknown`,类型安全靠 `teamOf(item)` 这类兜底转换函数或模板内断言,字段写错不会在编译期报错(运行时渲染为空)。
- **选择器无基类**:`DataTemplateSelector` 是类继承 + `SelectTemplateCore` 重写;Web 端是纯函数返回模板种类,再由 `v-if` 或 `<component :is>` 承接,没有 `SelectTemplateCore(item, container)` 的容器重载。
- **面板虚拟化未复刻**:`ItemsPanelTemplate` 体系中的 `ItemsStackPanel` / `ItemsWrapGrid` 附带 UI 虚拟化(数万项流畅滚动);本库 `WuiListView` / `WuiGridView` 为普通 DOM 全量渲染,超长列表不建议直接投放(见 [ListView](./ListView.md) 差异说明)。
- **Teams 示例来源**:本仓 CK 快照的 `Samples/Templates/` 只含三个文本示例(ComboBox 项模板、ItemsControl 面板模板、TextBox 控件模板),经典 Gallery 的 Teams 数据模板演示(ListView 节,对象数组按字段渲染分组卡片)未包含在快照中;示例页按其经典字段(division / name / win / loss)与观感复刻,数据为演示用虚构值。
- **视觉值**:本页为指南页,不承载控件本体视觉;演示中卡片、圆点、徽标用的都是 `--wui-system-accent-color`、`--wui-system-control-background-base-low` / `-base-medium`、`--wui-application-*-foreground-theme` 等 token,accent 15% 铺底以 `color-mix` 从强调色派生(`theme.css` 无对应生成 token)。

---

互链:[ListView](./ListView.md) · [GridView](./GridView.md) · [ComboBox](./ComboBox.md) · [集合公共底座说明](_collection-infra.md)

演示页源码:[demo/pages/TemplatesPage.vue](../../demo/pages/TemplatesPage.vue)
