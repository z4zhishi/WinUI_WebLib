# MenuBar(含 MenuBarItem)

> 在线示例:[/#/menubar](/#/menubar) · 演示页源码:[demo/pages/MenuBarPage.vue](../../demo/pages/MenuBarPage.vue)

## 概述

MenuBar 通过在应用或窗口顶部提供一组菜单来简化基础应用的构建:横向排列的 `MenuBarItem` 顶层项,每项内放 MenuFlyout 族菜单(`MenuFlyoutItem` / `ToggleMenuFlyoutItem` / `MenuFlyoutSeparator` / `MenuFlyoutSubItem`)。打开一个菜单后横移鼠标即可在项间自动切换(WinUI 菜单栏招牌行为);支持点击展开、`F2`/`Alt` 进栏与完整的键盘导航(←/→ 换项与换菜单、Enter/↓/Alt+↓ 打开、Esc 逐级收起)。

官方文档:

- [MenuBar - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menubar)
- [MenuBarItem - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menubaritem)
- [Menus 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/menus)

## 属性

### MenuBar

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| default slot | `MenuBarItem` 列表 | — | 栏内容:横向排列的 `WuiMenuBarItem`(WinUI `Items` 集合的声明式等价) |

栏自身无属性(WinUI `MenuBar` 仅 `Items`);整栏 `MinHeight` 40(MenuBarHeight)、背景透明(MenuBarBackground)、铺满宿主宽度、项靠左排布。

### MenuBarItem

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | `string` | `'Item'` | 项文本(WinUI `Title`);默认 slot 是菜单内容,不作为项文案 |
| `disabled` | `boolean` | `false` | 禁用(Web 侧增补):不响应点击/悬停切换,不参与键盘导航 |
| default slot | MenuFlyout 族 | — | 下拉菜单内容:`WuiMenuFlyoutItem` / `WuiToggleMenuFlyoutItem` / `WuiMenuFlyoutSeparator` / `WuiMenuFlyoutSubItem` |

菜单项族(text / icon / acceleratorKeys / isChecked 等)与 `MenuFlyout` 完全同构,见 [MenuFlyout](./MenuFlyout.md) 文档。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `opening` / `opened`(MenuBarItem) | — | 本项下拉开始打开 / 已打开并完成首次定位 |
| `closing` / `closed`(MenuBarItem) | — | 本项下拉开始关闭 / 已关闭(含被相邻项 hover 切换、light dismiss 路径) |
| `click`(MenuFlyoutItem 等) | `(event: MouseEvent)` | 点击或键盘激活菜单项;触发后整条菜单关闭 |

WinUI 的 `MenuBarItem` 无公开 Click/Opening 事件(生命周期在其内部 `MenuBarItemFlyout` 上),上提到组件事件面属 Web 侧便利,见「与 WinUI 的差异」第 6 条。

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `F2` / `Alt` | 把焦点移入菜单栏(首项;Web 侧补充的进入方式,WinUI 对应 Access key scope) |
| `←` / `→` | 未开菜单:项间移动焦点(循环,跳过禁用项);已开菜单:收起当前项并聚焦 + 展开相邻项(WinUI `OpenFlyoutFrom`) |
| `Enter` / `Space` / `↓` / `Alt+↓` | 展开当前项的菜单,焦点落首个菜单项(WinUI KeyDown 的 Down/Enter/Space + 官方文档 Alt+↓) |
| `↑` / `↓` | 菜单内项间循环移动(跳过分隔线与禁用项) |
| `Home` / `End` | 菜单内移到首 / 末个可用项;栏上移到首 / 末个菜单栏项 |
| `Esc` | 逐级关闭:先收子菜单再收菜单,焦点归还菜单栏项 |
| `Tab` | 关闭菜单,焦点自然移动;栏内以 roving tabindex 实现 WinUI `TabNavigation=Once`(Tab 一次进栏、再按即离栏) |

指针行为:点击未展开项展开、再点收起;**某一菜单打开后,横移鼠标掠过其他项即自动切换**(WinUI `MenuBarItem` 的 `PointerEntered` + 栏级 `IsFlyoutOpen`);指针移出栏不收起(light dismiss 只认「外部点击」,与 WinUI `OverlayInputPassThroughElement` 语义一致)。

## 基础用法

```vue
<script setup lang="ts">
import WuiMenuBar from '@/components/MenuBar.vue'
import WuiMenuBarItem from '@/components/MenuBarItem.vue'
import WuiMenuFlyoutItem from '@/components/MenuFlyoutItem.vue'
import WuiMenuFlyoutSeparator from '@/components/MenuFlyoutSeparator.vue'
import WuiMenuFlyoutSubItem from '@/components/MenuFlyoutSubItem.vue'

function onNew() { /* ... */ }
</script>

<template>
  <WuiMenuBar>
    <WuiMenuBarItem title="File">
      <WuiMenuFlyoutItem text="New" :accelerator-keys="'Ctrl+N'" @click="onNew" />
      <WuiMenuFlyoutItem text="Open" @click="onOpen" />
      <WuiMenuFlyoutSeparator />
      <WuiMenuFlyoutSubItem text="New">
        <WuiMenuFlyoutItem text="Plain Text Document" @click="onPlain" />
        <WuiMenuFlyoutItem text="Rich Text Document" @click="onRich" />
      </WuiMenuFlyoutSubItem>
    </WuiMenuBarItem>
    <WuiMenuBarItem title="Edit">
      <WuiMenuFlyoutItem text="Undo" @click="onUndo" />
    </WuiMenuBarItem>
  </WuiMenuBar>
</template>
```

## 实现要点

- **弹层基建**:每项的下拉即一个 MenuFlyoutPresenter 皮肤的菜单层(`usePopupAnchor` + `usePopupLayer`,`placement='bottom-start'`、间距 0,对应 WinUI `Placement=Bottom` + 排除矩形的「贴项下方、左缘对齐、不压按钮」),z-index 自动分配、翻转/推回/滚动关闭全部复用基建(见 [wiki/controls/_popup-infra.md](./_popup-infra.md))。
- **层上下文同构**:`MenuBarItem` 向其 slot provide 与 `MenuFlyout` 根层完全同构的 `'wuiMenuFlyoutLevel'` 上下文(层开关 / 列对齐 / 项登记 / `closeAll` / 子菜单登记),因此 MenuFlyout 族组件零改动即插即用;级联子菜单的兄弟互斥与 Esc 逐级同样成立。
- **栏级协作(`'wuiMenuBarContext'`)**:`MenuBar` 持有已登记项的句柄表,`hasOpenFlyout`(栏级 `IsFlyoutOpen`)由各项 `isOpen` 推导;`requestOpen` 收口「先收其他项、再展开本项」的兄弟互斥,`moveFocus` / `openNeighbor` / `focusEdge` 支撑 ←/→ 移焦与换菜单。
- **Selected 态**:下拉打开的项走 `MenuBarItemBackgroundSelected`(SubtleFillColorTertiary)底色,对应 WinUI `UpdateVisualStates` 的 Selected 分支。
- **本库未提供 RadioMenuFlyoutItem**:单选组用 `ToggleMenuFlyoutItem` + 页面侧分组逻辑模拟(见演示页第三节,与官方示例 View 菜单的 Landscape/Portrait、图标尺寸组对应)。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `controls/dev/MenuBar/MenuBar.xaml`、`MenuBarItem.xaml` 与 `MenuBar_themeresources.xaml` 复刻(generic.xaml 本体无 `TargetType="MenuBar"` / `"MenuBarItem"` 段),以下项做了 Web 等价替换或简化:

1. **颜色(PL12 重定向)**:`MenuBarItemBackgroundPointerOver/Pressed/Selected` = `SubtleFillColorSecondary/Tertiary`(controls/dev `MenuBarItem.xaml` L7-L10),已直引 `--wui-subtle-fill-color-transparent/secondary/tertiary`;前景 `MenuBarItemForeground` = `TextFillColorPrimaryBrush` → `--wui-text-fill-color-primary`;栏底 `MenuBarBackground` = `SubtleFillColorTransparentBrush` → `--wui-subtle-fill-color-transparent`。此前「借用 grid-view-item token 的近似」与「theme.css 未提取」表述已作废(VR-B17 登记已订正)。边框:`Light/Default` 字典 `MenuBarItemBorderThickness=0`(dev L11),不渲染;Border 画刷键值为 `ControlAltFillColorTertiary`(常态)/ `ControlStrokeColorDefault`(悬停/按下/选中),仅 HighContrast 字典为 2px,本库未实现 HC。总览见 [_brushes.md](./_brushes.md)。
2. **尺寸/间距**:`MenuBarHeight` 40、`MenuBarItemMargin` 4、`MenuBarItemButtonPadding` 10,4,10,4、`ControlCornerRadius` 4(复用 `--wui-hyperlink-focus-rect-corner-radius` token,同 DropDownButton 约定)均为 generic.xaml 资源字面值(x:Double/Thickness 不入 token 集)。
3. **打开时焦点**:WinUI `OnFlyoutOpening` 把焦点留在 MenuBarItem 上;本组件在键盘/点击路径按 WAI-ARIA menubar 惯例把焦点移入层首项(hover 切换路径仍聚焦项自身,与 WinUI 一致,←/→ 换项即刻可用)。纯键盘用户因此可直达菜单项。
4. **TabNavigation=Once → roving tabindex**:WinUI 栏 `TabNavigation=Once` + 项 `IsTabStop=True`;Web 以「当前项 tabindex=0、其余 -1」等价(Tab 一次进栏、再按即离栏,←/→ 在栏内移动)。
5. **F2 / Alt 进栏**:WinUI 经 Access key(Alt 显示 key tip)进入;本组件以 `F2` / 单按 `Alt` 的 document 级监听等价(preventDefault 阻止 Firefox 菜单栏抢焦点;多实例时首个认领)。Alt+↓ 打开与 WinUI 官方文档一致。
6. **事件面增补**:`opening/opened/closing/closed` 在 WinUI 位于内部 `MenuBarItemFlyout`(不公开),组件上提为 `MenuBarItem` 事件;`MenuBarItem` 未暴露 `IsOpen` 双向(如需程序开关可后续增补 v-model)。`disabled` 亦为 Web 增补(WinUI 模板无 Disabled 视觉态,取 `SystemControlDisabledBaseHigh` 前景近似)。
7. **acceleratorKeys 作用域**:WinUI 的 `KeyboardAccelerators` 为全局加速键(菜单未开也生效);本组件快捷键仅在**所在菜单层打开期间**生效(与 MenuFlyout 族同一实现,见其 wiki 差异节第 5 条),演示页第二例按此语义回显。
8. **点击已展开项**:WinUI `PointerPressed` 在栏内已有 flyout 打开时一律短路(点击项不动作);本组件对「点击的就是当前已展开项且为点击展开」按 Web 惯例 toggle 收起(与 WinUI `Invoke` 语义一致),hover 切换打开的保持 WinUI 短路(亦规避触屏 `pointerenter`→`click` 串扰导致的「开了又关」)。
9. **hover 切换无延迟**:`PointerEntered` 即切换(WinUI 同为立即切换,无定时器);指针移出栏不收起,与 WinUI `OverlayInputPassThroughElement(LayoutRoot)` 行为一致。
10. **HighContrast / 系统焦点框**:WinUI 双环焦点视觉(`FocusVisualMargin=-3`)近似为 primary 色单环 `outline`(同 DropDownButton);HC 主题字典未适配。

---

演示页源码:[demo/pages/MenuBarPage.vue](../../demo/pages/MenuBarPage.vue) · 组件源码:[src/components/MenuBar.vue](../../src/components/MenuBar.vue) · [MenuBarItem.vue](../../src/components/MenuBarItem.vue) · 菜单族文档:[MenuFlyout](./MenuFlyout.md) · 弹层基建:[wiki/controls/_popup-infra.md](./_popup-infra.md) · Fluent 画刷族:[_brushes.md](./_brushes.md)
