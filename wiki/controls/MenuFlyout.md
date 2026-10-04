# MenuFlyout(含 MenuFlyoutItem / ToggleMenuFlyoutItem / MenuFlyoutSeparator / MenuFlyoutSubItem)

> 在线示例:[/#/menuflyout](/#/menuflyout) · 演示页源码:[demo/pages/MenuFlyoutPage.vue](../../demo/pages/MenuFlyoutPage.vue)

## 概述

MenuFlyout 显示轻量级 UI,点击或点击菜单外区域时轻扫关闭(light dismiss)。用于让用户从上下文相关的简单命令或选项列表中选择,典型场景是按钮下拉菜单与右键上下文菜单。菜单内容由五件套声明式组合:`MenuFlyoutItem`(命令项)、`ToggleMenuFlyoutItem`(开关项)、`MenuFlyoutSeparator`(分隔线)、`MenuFlyoutSubItem`(级联子菜单);本库未提供 `RadioMenuFlyoutItem` / `SplitMenuFlyoutItem`,可用开关项 + 页面侧分组逻辑模拟单选组(见演示页)。

官方文档:

- [MenuFlyout - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyout)
- [MenuFlyoutItem - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyoutitem)
- [MenuFlyoutSubItem - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyoutsubitem)
- [MenuFlyoutSeparator - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyoutseparator)
- [ToggleMenuFlyoutItem - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.togglemenuflyoutitem)
- [Menus 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/menus)

## 属性

### MenuFlyout

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `placement` | `'top' \| 'bottom' \| 'left' \| 'right'` 及其 `-start` / `-end` 变体 | `'bottom-start'` | 放置位(WinUI `FlyoutBase.Placement` 的映射);空间不足自动翻转/推回视口内 |
| `lightDismiss` | `boolean` | `true` | 点击菜单层外 / Escape / 锚滚动链滚动时关闭;`false` 时仅编程关闭 |
| `isOpen` (v-model) | `boolean` | `false` | 弹层开关(WinUI `IsOpen`),双向绑定 |

### MenuFlyoutItem / ToggleMenuFlyoutItem

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | `''` | 项文本(WinUI `Text`);默认 slot 兜底,slot 内容优先 |
| `icon` | `string` | `''` | 图标:WinUI `Symbol` 枚举名(如 `'Copy'` / `'Delete'`)或 Segoe 字形字符;`#icon` slot 可放 `FontIcon` 等任意图标元素(slot 优先) |
| `acceleratorKeys` | `string` | `''` | 快捷键字符串(如 `'Ctrl+S'`、`'Ctrl+Alt+Del'`):行尾显示,且菜单打开期间注册键盘监听、匹配即触发该项 `click` |
| `disabled` | `boolean` | `false` | 禁用(WinUI `IsEnabled = false` 的取反映射):不触发、不参与键盘导航 |
| `isChecked` (v-model,仅 Toggle) | `boolean` | `false` | 开关状态(WinUI `IsChecked`) |

### MenuFlyoutSubItem

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `text` | `string` | `''` | 宿主项文本;默认 slot 兜底 |
| `icon` | `string` | `''` | 同菜单项;`#icon` slot 同理 |
| `disabled` | `boolean` | `false` | 禁用:不可展开、不参与键盘导航 |

`MenuFlyoutSubItem` 的默认 slot 即子菜单内容(可再嵌套 `MenuFlyoutSubItem` 形成多级级联)。子菜单层 `placement='right-start'`(级联右开,空间不足自动翻到左侧)。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `click`(Item / Toggle / SubItem) | `(event: MouseEvent)` | 点击或键盘激活项。**Item 触发后整条菜单关闭;Toggle / SubItem 保持打开**(对齐 WinUI:开关项与子菜单项调用不触发 light dismiss) |
| `update:isOpen` | `(value: boolean)` | `MenuFlyout` 的 `v-model:is-open` 双向绑定更新 |
| `opening` / `opened` | — | WinUI `Opening` / `Opened`:`isOpen` 变 true 时;`opened` 在完成首次定位后触发 |
| `closing` / `closed` | — | WinUI `Closing` / `Closed`:`isOpen` 变 false 时及之后 |

## 键盘交互

| 按键 | 作用 |
| --- | --- |
| `↑` / `↓` | 在菜单项间循环移动(跳过 `MenuFlyoutSeparator` 与禁用项) |
| `Home` / `End` | 移动到首 / 末个可用项 |
| `→` | 展开当前子菜单并聚焦其首项 |
| `←` | 在子菜单内收起本级,焦点归还到子菜单宿主项 |
| `Enter` / `Space` | 激活当前项(Toggle 切换勾选) |
| `Esc` | **逐级关闭**:每次按键只关闭最深一层,焦点逐级归还(实现:各层登记「打开中的子菜单」,更深层未收起时本层忽略 Escape) |
| `Tab` | 关闭整条菜单,焦点自然移动(WinUI 菜单 Tab 即 light dismiss) |
| `acceleratorKeys` | 菜单打开期间全局匹配(如 `Ctrl+S`),触发对应项 `click` 并按该项语义关闭/保持菜单 |

菜单打开时焦点落入本层首个可用项(WAI-ARIA menu-button 惯例);经键盘路径(Escape / `←`)关闭时焦点归还到锚 —— 优先落 `#target` 内可聚焦后代(如宿主按钮,保留其焦点视觉),无则落锚自身(锚 span 带 `tabindex="-1"`,仅编程聚焦、不进 Tab 序)。子菜单内按 `Tab` 与 light dismiss 同级,关闭整条菜单链。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiMenuFlyout from '@/components/MenuFlyout.vue'
import WuiMenuFlyoutItem from '@/components/MenuFlyoutItem.vue'
import WuiMenuFlyoutSeparator from '@/components/MenuFlyoutSeparator.vue'
import WuiMenuFlyoutSubItem from '@/components/MenuFlyoutSubItem.vue'
import WuiToggleMenuFlyoutItem from '@/components/ToggleMenuFlyoutItem.vue'

const isOpen = ref(false)
const repeat = ref(true)
</script>

<template>
  <WuiMenuFlyout v-model:is-open="isOpen">
    <template #target>
      <WuiButton content="Edit Options" />
    </template>

    <!-- 图标:#icon slot 放 FontIcon(建议 :font-size="16" 对齐图标列) -->
    <WuiMenuFlyoutItem :accelerator-keys="'Ctrl+S'" @click="onShare">
      <template #icon><WuiFontIcon glyph="&#xE72D;" :font-size="16" /></template>
      Share
    </WuiMenuFlyoutItem>

    <!-- 图标:直接给 Symbol 枚举名 -->
    <WuiMenuFlyoutItem text="Copy" icon="Copy" :accelerator-keys="'Ctrl+C'" @click="onCopy" />
    <WuiMenuFlyoutItem text="Delete" icon="Delete" :accelerator-keys="'Del'" @click="onDelete" />

    <WuiMenuFlyoutSeparator />

    <!-- 开关项:点击后菜单保持打开 -->
    <WuiToggleMenuFlyoutItem text="Repeat" v-model:is-checked="repeat" />

    <!-- 级联子菜单:hover / 点击 / → 展开,← / Esc 退出 -->
    <WuiMenuFlyoutSubItem text="Send to">
      <WuiMenuFlyoutItem text="Bluetooth" @click="onSendTo" />
      <WuiMenuFlyoutSubItem text="Compressed file">
        <WuiMenuFlyoutItem text="Compress to .zip" @click="onZip" />
      </WuiMenuFlyoutSubItem>
    </WuiMenuFlyoutSubItem>
  </WuiMenuFlyout>
</template>
```

`#target` slot 是菜单的锚(宿主控件,通常是 Button)。**点击锚即切换菜单开关**(对齐 WinUI `Button.Flyout` 的附加行为:点击宿主打开、再次点击关闭);如需完全自定义开关逻辑,可在宿主上拦截 `click` 并自行绑定 `v-model:is-open`。锚滚动链发生滚动即 light dismiss(WinUI 同行为)。

## 实现要点

- **弹层基建**:定位/层级/翻转推回/自动关闭回调复用 `src/composables/usePopup.ts`(`usePopupAnchor` + `usePopupLayer`),z-index 由 `nextPopupZIndex()` 自动分配(后开在上),层外壳类与阴影/圆角来自 `src/styles/popup.css`;基建级差异(ThemeShadow 阴影近似、OverlayCornerRadius、入场动画)统一见 [wiki/controls/_popup-infra.md](./_popup-infra.md) 差异节,不再重复。
- **菜单层上下文**:`MenuFlyout`(根层)与每个 `MenuFlyoutSubItem`(子菜单层)向各自 slot 内的菜单项 provide 同一形状的上下文(`isOpen` / 列对齐状态 / 项登记 / `closeAll` / 子菜单登记),嵌套项注入最近层。子菜单项点击后的「关闭整条菜单」即沿该链逐级上抛。
- **列对齐(图标列 / 勾选列)**:同层出现图标项或勾选项时,纯文本项自动补 28px 占位列(16 内容 + 12 间距),Toggle 恒渲染勾选列,图标项恒渲染图标列——对齐 WinUI 模板中 `MenuFlyoutItemPlaceholderThemeThickness="28,0,0,0"` 与 `CheckPlaceholderStates` 的视觉意图。
- **Escape 逐级 / 兄弟子菜单互斥**:`MenuFlyoutSubItem` 打开时向父层 `registerOpenSubmenu` 登记——父层据此在新子菜单打开时收起上一个(兄弟互斥)、在 Escape 时判断「更深层是否仍打开」实现逐级关闭。
- **Reveal 揭示光照(默认启用,无开关)**:三个菜单项组件(Item / Toggle / SubItem)默认挂公共层光照——WinUI 3 三者默认样式由 `controls/dev/CommonStyles/MenuFlyout_themeresources.xaml` 末尾的 keyless `<Style BasedOn="{StaticResource DefaultXStyle}">`(L265-269)提供,即**非 Reveal** 的 `Default*Style`,legacy `*RevealStyle` 不再生效;PL12 已把状态底色改为 Fluent(`--wui-subtle-fill-color-*` / `--wui-text-fill-color-*`),Reveal 光照层(reveal.css)保留但不再承载状态色。悬浮时跟随指针的底板光 + 1px 边框光环叠于 Fluent 底色之上、内容之下;禁用项不点亮。机制、常量与降级语义见 [_reveal.md](./_reveal.md)。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 WinUI 3 生效层 `controls/dev/CommonStyles/MenuFlyout_themeresources.xaml`(Default L270-686:presenter / Item / Toggle / SubItem / Separator)与 `MenuFlyout/themeresources` 复刻(legacy `generic.xaml` 各 `*RevealStyle` L18404/L18558/L18728 仅为 UWP 遗留),以下项做了 Web 等价替换或简化:

1. **分隔线语义角色**:WAI-ARIA 无 `menuitemseparator` 角色,按标准使用 `role="separator"`(WinUI `MenuFlyoutSeparator` 自动化 peer 的 ControlType 也是 Separator)。菜单容器 `role="menu"`,命令项 `menuitem`,开关项 `menuitemcheckbox`,子菜单宿主项 `menuitem` + `aria-haspopup` / `aria-expanded`。
2. **勾选字形与箭头字形**:WinUI 用 Segoe Fluent Icons 的 `E001`(CheckMark)/ `E0E3`(ChevronRight);为保证非 Windows 平台渲染一致,均以内联 SVG 等形复刻(与 CheckBox 同一决策);PL12 已把颜色改为 Fluent:**勾选字形常态/悬停/按下 = `--wui-text-fill-color-secondary` / `--wui-text-fill-color-primary`,禁用 `--wui-text-fill-color-disabled`;子菜单箭头常态/悬停 = `--wui-text-fill-color-secondary`,按下 `--wui-text-fill-color-tertiary`,禁用 `--wui-text-fill-color-disabled`**。**`icon` 属性与 `#icon` slot 中的 FontIcon 仍依赖本机 Segoe 字体栈**(项目 R1 不加载网络字体)。
3. **图标缩放**:WinUI 模板把 `Icon` 内容放进 16×16 的 `Viewbox` 自动缩放;Web 侧图标盒为固定 16×16,不自动缩放,`#icon` slot 内的 FontIcon 建议显式传 `:font-size="16"`。
4. **子菜单展开态底色(SubMenuOpened)**:PL12 已按 controls/dev 权威改为 `MenuFlyoutSubItemBackgroundSubMenuOpened = SubtleFillColorSecondaryBrush` → `--wui-subtle-fill-color-secondary`(浅 `#00000009` / 深 `#FFFFFF0F`,无 accent 高亮);此前取的 Reveal 退役画刷 `SystemControlHighlightAccent3RevealBackgroundBrush`(`--wui-system-accent-color-light-3`)表述已作废。
5. **acceleratorKeys 形态**:WinUI 的 `KeyboardAccelerators` 是对象集合(`Key` + `Modifiers`),此处收敛为单个字符串(如 `'Ctrl+Alt+Del'`;支持 `del/ins/esc/return` 别名与 `Ctrl/Alt/Shift/Win` 修饰符)。WinUI 的全局加速键作用域(Global/Local)未区分,本组件快捷键仅在**所在菜单层打开期间**生效;显示字体取等宽近似(WinUI 官方示例对加速键文本用 Consolas)。
6. **焦点视觉**:WinUI 3 菜单项键盘聚焦为列表高亮背景(无系统焦点框),本组件 `:focus` 同样以 hover 色高亮、不画 outline。
7. **hover 延迟**:子菜单 hover 展开 150ms、离开 300ms 收起为 Web 侧取值(WinUI 平台内部定时,未公开常量)。
8. **打开时焦点**:WinUI 菜单打开后焦点留在宿主控件;本组件按 WAI-ARIA menu-button 惯例把焦点移到首个可用项(否则纯键盘用户无法进入菜单)。
9. **Toggle 不关闭菜单 / Item 关闭**:与 WinUI 一致;`MenuFlyoutSubItem` 亦派发 `click`(对齐 WinUI 基类事件面),但展开行为不受其影响。
10. **未提供 RadioMenuFlyoutItem / SplitMenuFlyoutItem**:单选组可用 `ToggleMenuFlyoutItem` + 页面侧分组逻辑模拟(见演示页第四节);SplitMenuFlyoutItem(带下拉裂变按钮的菜单项)暂无对应组件。
11. **尺寸/间距与层底对照**:层 Padding=1 + 上下 4px(ScrollerMargin)、MinHeight=32、Min/MaxWidth=96/456、项内边距 `11,9,11,10`、快捷键文本 12px/左距 24、箭头 12px/左距 24,均取 generic.xaml 资源值;层底 PL12 改为亚克力回退色 `--wui-menu-flyout-presenter-surface`(浅 `#F9F9F9` / 深 `#2C2C2C`)、描边 `--wui-surface-stroke-color-flyout`(浅 `#0000000F` / 深 `#00000033`),层圆角 8px 与阴影为基建级近似(见 _popup-infra.md)。
12. **lightDismiss 可选**:WinUI MenuFlyout 固定 light dismiss;`lightDismiss` 属性为 Web 侧便利项(默认 true 保持一致),`false` 时不监听外部点击 / Escape / 锚滚动。

---

演示页源码:[demo/pages/MenuFlyoutPage.vue](../../demo/pages/MenuFlyoutPage.vue) · 组件源码:[src/components/MenuFlyout.vue](../../src/components/MenuFlyout.vue) · [MenuFlyoutItem.vue](../../src/components/MenuFlyoutItem.vue) · [ToggleMenuFlyoutItem.vue](../../src/components/ToggleMenuFlyoutItem.vue) · [MenuFlyoutSeparator.vue](../../src/components/MenuFlyoutSeparator.vue) · [MenuFlyoutSubItem.vue](../../src/components/MenuFlyoutSubItem.vue) · 基建:[wiki/controls/_popup-infra.md](./_popup-infra.md) · Reveal 材料:[_reveal.md](./_reveal.md) · Fluent 画刷族:[_brushes.md](./_brushes.md)
