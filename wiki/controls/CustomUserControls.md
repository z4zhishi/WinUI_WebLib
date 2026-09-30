# CustomUserControls

> 在线示例:[/#/customusercontrols](/#/customusercontrols)

## 概述

自定义控件与用户控件让你能创建**可复用的 UI 组件**,并赋予它们独特的行为与外观。**UserControl** 是把一组既有控件与逻辑封装成整体的简单方式;**自定义(模板)控件**则进一步接管模板与样式,提供完整的主题化能力。两者都是构建模块化、可维护应用的基本手段。

官方资料:

- [Build XAML controls(自定义模板控件教程)](https://learn.microsoft.com/windows/apps/winui/winui3/xaml-templated-controls-csharp-winui-3)
- [Control - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.control)
- [UserControl - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.usercontrol)
- [WinUI Gallery CustomUserControls 示例](https://github.com/microsoft/WinUI-Gallery)(本站示例页对照 `Samples/CustomUserControls/`,卡片模板另对照 `Samples/ItemsRepeater/ItemsRepeaterPage.xaml` 的 `RecipeTemplate`)

## WinUI 的两条路线与官方示例

官方示例页给出三例,分属两条路线:

| 官方示例 | 路线 | 结构 | 要点 |
| --- | --- | --- | --- |
| `CounterControl` | 自定义(模板)控件 | 继承 `Control` + `Generic.xaml` ControlTemplate | `DependencyProperty`(Count/Mode)+ `OnApplyTemplate()` 取模板部件(`ActionButton`/`CountText`)+ AutomationPeer LiveRegion 播报计数 |
| `ValidatedPasswordBox` | 自定义(模板)控件 | 继承 `Control` + ControlTemplate | 密码校验(长度/大写/数字)驱动 `IsValid`,校验结果经 RichTextBlock + LiveRegion 播报 |
| `TemperatureConverterControl` | UserControl | 继承 `UserControl`,XAML 直接摆 TextBox + Button + TextBlock | `HasText` 启用按钮,点击换算 °F 或报「无效输入」;无模板、无 Dependency 声明,本质就是「布局 + 逻辑」的封装 |

**本站的对应关系**:WinUI UserControl ≈ Vue 单文件组件(组合已有控件 + scoped 样式);自定义模板控件 ≈ 库内那些接管完整模板的组件(如 [RatingControl](./RatingControl.md))。`DependencyProperty` 由 `defineProps` + `defineModel` 承担,`OnApplyTemplate()`/`Generic.xaml` 由组件模板 + scoped CSS 承担,AutomationProperties/LiveRegion 由 ARIA 属性承担。

## 本站复刻:RatingRecipe(食谱评分卡)

示例页的主角是组合控件 **RatingRecipe**(`src/components/RatingRecipe.vue`):图片 + 名称 + 食材 + 评分条 + 收藏钮组合成一张「食谱评分卡」,内部全部复用已入库控件 —— [RatingControl](./RatingControl.md)(评分)、ToggleButton + FontIcon(收藏心形),自身只做布局、封装与事件转发。卡片模板对照官方 `RecipeTemplate`(Recipe 类:`Name` / `Ingredients` / `Color`,图片区为数据色块)。

### 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | `string`(必填) | — | 菜谱名;兼作卡片 `aria-label` 与收藏钮无障碍名的一部分 |
| `ingredients` | `string` | `''` | 食材/简介一行文字,空串不渲染 |
| `image` | `string` | `''` | 图片地址(对应 `Image.Source`);空串或加载失败回落占位色块 |
| `imageAlt` | `string` | `''` | 图片 `alt` 文本;装饰性图片保持空串 |
| `accent` | `string` | `''` | 占位色块底色(官方 `Recipe.Color` 数据字段);空串用系统强调色 token |
| `glyph` | `string` | `'🍽️'` | 占位色块上的字形/emoji(官方模板色块上的编号文本) |
| `caption` | `string` | `''` | 评分条右侧说明文字(转发 RatingControl `Caption`) |
| `maxRating` | `number` | `5` | 星星数量(转发 RatingControl `MaxRating`) |
| `isReadOnly` | `boolean` | `false` | 评分条只读(转发 RatingControl `IsReadOnly`;收藏钮不受影响) |
| `disabled` | `boolean` | `false` | 禁用整卡:评分条与收藏钮均禁用(`Control.IsEnabled`) |
| `value`(v-model) | `number \| null` | `null` | 当前评分;`null` = 未评分(转发 RatingControl `Value`) |
| `favorite`(v-model) | `boolean` | `false` | 收藏态(内部 ToggleButton `checked` 的布尔收敛) |

### 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `valueChanged` | `(e: { oldValue: number \| null; newValue: number \| null })` | 内部 RatingControl 提交评分时原样转发(点击/键盘);模板监听写 `@value-changed` |
| `favoriteChanged` | `(isFavorite: boolean)` | 用户点击收藏钮切换收藏态时触发(组件自有事件) |
| `update:value` / `update:favorite` | `(value)` / `(favorite)` | v-model 双向绑定事件 |

### 插槽

| 插槽 | 说明 |
| --- | --- |
| `image` | 替换整个媒体区(图片/占位色块一并替换),可放轮播图、视频等任意媒体内容 |
| `default` | 卡片底部扩展点:徽标、标签、作者行等自定义内容 |

## 基础用法

```html
<RatingRecipe
  v-model:value="rating"
  v-model:favorite="isFavorite"
  name="宫保鸡丁"
  ingredients="鸡肉 · 花生 · 干辣椒 · 花椒 · 葱白"
  caption="1,286 条评分"
  :max-rating="5"
  @value-changed="onValueChanged"
  @favorite-changed="onFavoriteChanged" />
```

一组卡片用 `v-for` 渲染时,v-model 直接绑到数据项上(示例页 `demo/pages/CustomUserControlsPage.vue` 的做法):

```html
<RatingRecipe
  v-for="recipe in recipes"
  :key="recipe.id"
  v-model:value="recipe.value"
  v-model:favorite="recipe.favorite"
  :name="recipe.name" />
```

## 组合控件 API 设计要点(props / emits / slot)

把「一堆控件 + 一段逻辑」升格为「一个控件」,关键在接口设计。RatingRecipe 的七条落法,同样适用于任意 UserControl 类组件:

1. **参数用 props 声明,逐个透传**:`caption` / `maxRating` / `isReadOnly` / `disabled` 原样转发给内部 RatingControl,不在组件内重复造默认值 —— 对应 WinUI 的 `DependencyProperty` + `TemplateBinding`。
2. **状态用 `defineModel` 双向**:`value`、`favorite` 两个 v-model,父组件可读写、子控件改动自动回传 —— 对应 `x:Bind Mode=TwoWay`。
3. **事件显式转发或重新命名**:`valueChanged` 是对内部 RatingControl 同名事件的原样转发;`favoriteChanged` 则是组件自己的语义事件(收藏这个业务概念,而不是「按钮被点了」)。显式声明 emits 还能防止原生事件经 `$attrs` 重复触发。
4. **slot 预留扩展点**:`image` 具名插槽让调用方整体替换媒体区,`default` 插槽在卡片底部追加内容 —— 不改组件源码即可派生变体,对应 WinUI 的 `ContentPresenter` / `ContentTemplate`。
5. **样式封装成组件级 token**:卡片底色/描边按源 `CardBackgroundFillColorDefault` / `CardStrokeColorDefault` 注入 `--wui-rating-recipe-*` 局部变量,调用方可用同名变量覆盖 —— 对应 Generic.xaml 默认样式 + 主题资源。
6. **无障碍聚合**:卡片 `role="group"` + `aria-label`=菜谱名;收藏钮 `aria-label` 随状态切换;评分条继承 RatingControl 的 `role="slider"` 语义 —— 对应 `AutomationProperties.Name`。
7. **组合优先,继承靠后**:能用既有控件拼出来的,就不要重写交互 —— 这正是 WinUI 文档区分「UserControl(组合)」与「自定义控件(接管模板)」的判断标准。

## 与 WinUI 的差异说明

- **Image 控件**:本站尚未入库 `Image` 组件,卡片用原生 `<img>`(`object-fit: cover` 对应 `Stretch=UniformToFill`)实现,加载失败回落官方 `RecipeTemplate` 式的数据色块;待 Image 组件入库后可无缝替换。
- **模板与默认样式**:WinUI UserControl 的 XAML 即模板、无样式层;自定义控件走 `Generic.xaml` + `OnApplyTemplate()`。Web 侧统一为组件 `<template>` + scoped CSS,「接管模板」与「组合」的边界由设计约定而非框架强制。
- **数据色块颜色**:`accent` 是**数据**字段(官方 `Background={x:Bind Color}` 同理),由调用方传入具体颜色;组件自身样式仍全部走 token(卡片底/描边/文字/圆角),硬编码色值只存在于示例数据中。
- **IsTabStop=False**:官方 UserControl 设 `IsTabStop=False` 让焦点直达内部控件;Web 侧卡片根为非交互 `div`(role="group",无 tabindex),焦点天然落在内部 RatingControl(Slider 语义)与收藏钮(原生 button)上,行为等价。
- **LiveRegion 播报**:官方 CounterControl / ValidatedPasswordBox 用 `RaiseAutomationEvent(LiveRegionChanged)` 播报计数与校验结果;本组合控件未内建 aria-live 区,评分播报由 RatingControl 的 `role="slider"` + `aria-valuetext` 承担。
- **三态收藏**:WinUI ToggleButton 的 `IsChecked` 可空(不确定态);卡片语义里收藏只有两态,组件把 `boolean | 'indeterminate'` 收敛为 `boolean` 后再暴露 `favorite` 模型。

---

演示页源码:[demo/pages/CustomUserControlsPage.vue](../../demo/pages/CustomUserControlsPage.vue) · 组合控件源码:[src/components/RatingRecipe.vue](../../src/components/RatingRecipe.vue)
