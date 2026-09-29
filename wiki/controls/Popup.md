# Popup

> 在线示例:[/#/popup](/#/popup) · 演示页源码:[demo/pages/PopupPage.vue](../../demo/pages/PopupPage.vue)

## 概述

Popup 是 WinUI 弹层体系里**最底层的原语**(`Windows.UI.Xaml.Controls.Primitives.Popup`):它允许应用在既有 UI 之上显示临时内容——轻量交互、通知、自定义浮动面板等,用来增强用户工作流或突出界面的特定部分。它只负责三件事:把 child 内容浮到独立层级、按 placement / 偏移定位、以及(可选的)点击外部关闭(light dismiss)。**它不提供任何视觉皮肤**——没有背景、边框、圆角和阴影,内容长什么样完全由你决定。

官方文档:

- [Popup - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.primitives.popup)
- 弹层基建(本组件的定位 / 层级 / 关闭底座):[wiki/controls/_popup-infra.md](_popup-infra.md)

## 三层抽象:Popup vs Flyout vs ToolTip

这是 Popup 示例页的核心教学,也是选型的第一步。XAML 弹层族是三层逐级封装的关系,Web 复刻保持同样的分层:

```text
Flyout  = Popup + FlyoutPresenter 皮肤(背景/边框/圆角/阴影)+ 锚点语义 + 默认 light dismiss
ToolTip = 上述 + 自动触发(悬停/焦点、延迟出现消失)+ ToolTipPresenter 皮肤 + 只读微内容
```

| | Popup(本组件) | Flyout | ToolTip |
| --- | --- | --- | --- |
| 本质 | 无修饰原语:层级 + 定位 + light dismiss 开关 | Popup + presenter 皮肤,内容可交互 | Popup + presenter 皮肤 + 自动触发,内容只读 |
| 视觉皮肤 | **无**(generic.xaml 没有 Popup 的 ControlTemplate) | `FlyoutPresenter`(圆角 / 阴影 / 画刷,Web 用 `.wui-popup-skin-flyout`) | `ToolTipPresenter`(Web 用 `.wui-popup-skin-tooltip`) |
| 定位基准 | `placement='Default'` → 窗口左上角 + 偏移;其余 → 锚点 | 始终锚点(附着的 Button 等) | 锚点(目标元素) |
| light dismiss | 默认关,`isLightDismissEnabled` 打开 | 默认开 | 无(悬停即走) |
| 内容 | 任意,自定样式 | 任意交互内容(表单 / 确认框) | 纯文本短提示 |
| 打开方式 | `v-model:is-open` 程序控制 | 附着控件自动(点击) | 悬停 / 键盘焦点自动 |

**选型口诀**:要完全自定义浮层内容与外观 → Popup;点按钮弹出的轻上下文 UI / 小表单 → Flyout;纯文本提示 → ToolTip;需要模态决策(必须回应才能继续)→ ContentDialog。十有八九你想用的其实是 Flyout——裸 Popup 留给「皮肤我自己画」的场景。

在 Web 端,「给 Popup 补上 Flyout 皮肤」就是把内容包进 presenter 观感的容器:

```html
<WuiPopup v-model:is-open="isOpen" placement="Bottom">
  <div class="wui-popup-skin-flyout" style="padding: 12px; border-radius: var(--wui-popup-corner-radius); box-shadow: var(--wui-popup-shadow)">
    Flyout 观感的内容
  </div>
</WuiPopup>
```

## 定位基准:屏幕 vs 锚点

Popup 的 `placement`(WinUI `DesiredPlacement`,枚举 `PopupDesiredPlacement` 共 14 档)决定**定位基准**,这是它与 Flyout 最大的语义差别:

| placement | 定位基准 | 行为 |
| --- | --- | --- |
| `'Default'`(WinUI 默认) | **屏幕**:窗口左上角 | 层定位在 `(HorizontalOffset, VerticalOffset)`,与锚点无关;对应源 `SetPositionFromPlacement` 中无 `PlacementTarget` 时的「窗口原点 + 偏移」路径 |
| `'Auto'` | 锚点 | 系统自动选位的 Web 等效:bottom 优先,放不下自动翻转到 top(flip) |
| `Top` / `Bottom` / `Left` / `Right` | 锚点 | 基位对齐,锚居中 |
| `*EdgeAligned*`(如 `BottomEdgeAlignedLeft`) | 锚点 | 基位 + 起/末端对齐(`BottomEdgeAlignedLeft` → 基建 `'bottom-start'`) |

锚点从哪来?WinUI 用 `PlacementTarget` 属性指定;Web 组件用 **`#target` slot**(包裹的元素即锚),未提供时以**组件声明点**(零尺寸)为锚。偏移在两种基准下的折算:

| 基位 | HorizontalOffset | VerticalOffset |
| --- | --- | --- |
| 屏幕基准(`Default`) | 相对窗口左缘(交叉轴) | 相对窗口顶缘(主轴) |
| 锚点基准 · 纵向基位(Top/Bottom 族) | 沿交叉轴推移 | 沿主轴远离锚 |
| 锚点基准 · 横向基位(Left/Right 族) | 沿主轴远离锚 | 沿交叉轴推移 |

边界行为与源一致:锚点基准下放不下会**翻转到对侧**(源 `FlipMajorPlacementAndJustificationIfOutOfBounds`);`shouldConstrainToRootBounds`(默认 `true`)把层**钳制在窗口边界内**(基建 shift),置 `false` 则允许层溢出视口(对应源的平台窗口化弹层)。

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `placement` | `'Default' \| 'Auto' \| 'Top' \| 'Bottom' \| 'Left' \| 'Right' \| 'TopEdgeAlignedLeft' \| 'TopEdgeAlignedRight' \| 'BottomEdgeAlignedLeft' \| 'BottomEdgeAlignedRight' \| 'LeftEdgeAlignedTop' \| 'LeftEdgeAlignedBottom' \| 'RightEdgeAlignedTop' \| 'RightEdgeAlignedBottom'` | `'Default'` | 放置策略(WinUI `DesiredPlacement`),决定定位基准,见上节 |
| `horizontalOffset` | `number` | `0` | 水平偏移 px(WinUI `HorizontalOffset`),折算规则见上节 |
| `verticalOffset` | `number` | `0` | 垂直偏移 px(WinUI `VerticalOffset`) |
| `isLightDismissEnabled` (v-model) | `boolean` | `false` | light dismiss(WinUI `IsLightDismissEnabled`):点击弹层外部或按 Esc 时关闭,`isOpen` 随之同步为 `false` |
| `lightDismissOverlayMode` | `'Auto' \| 'On' \| 'Off'` | `'Auto'` | 遮罩模式(WinUI 同名枚举):`'On'` 时弹层下方渲染 `.wui-popup-overlay` 半透明遮罩挡住底层交互;`'Auto'` 在桌面端语义为不显示,与源一致 |
| `shouldConstrainToRootBounds` | `boolean` | `true` | 是否钳制在窗口边界内(WinUI `ShouldConstrainToRootBounds`);`false` 允许溢出视口 |
| `isOpen` (v-model) | `boolean` | `false` | 打开状态(WinUI `IsOpen`),双向绑定;light dismiss / Esc 关闭时同步为 `false` |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `opened` | — | 打开动画结束后触发(WinUI `Opened`) |
| `closed` | — | 关闭动画结束后触发;light dismiss / Esc 关闭同样触发(WinUI `Closed`) |
| `update:isOpen` | `(value: boolean)` | `v-model:is-open` 双向绑定更新 |
| `update:isLightDismissEnabled` | `(value: boolean)` | `v-model:is-light-dismiss-enabled` 双向绑定更新 |

## Slot

| Slot | 说明 |
| --- | --- |
| 默认 slot | 弹层内容(WinUI `Child`);**无任何默认皮肤**,外观完全由使用方决定 |
| `#target` | 锚点元素(WinUI `PlacementTarget` 的 Web 等价);仅锚点基准 placement 使用,缺省时锚为组件声明点 |

## 基础用法

```html
<WuiPopup v-model:is-open="isOpen" placement="Bottom">
  <template #target>
    <WuiButton @click="isOpen = !isOpen">显示 Popup</WuiButton>
  </template>
  <!-- child:无任何默认皮肤,外观完全由使用方决定 -->
  <div class="my-popup-panel">
    自定义内容
    <WuiButton @click="isOpen = false">Close</WuiButton>
  </div>
</WuiPopup>

<!-- WinUI 默认语义:窗口左上角 + 偏移定位 -->
<WuiPopup v-model:is-open="offsetOpen" :horizontal-offset="200" :vertical-offset="0" is-light-dismiss-enabled>
  <template #target>
    <WuiButton @click="offsetOpen = true">Show Popup</WuiButton>
  </template>
  <div class="my-popup-panel">Simple Popup</div>
</WuiPopup>
```

组件基于弹层公共基建实现:定位(flip / shift / 跟随)、z-index(后开在上)、light dismiss 回调均由 `usePopupLayer` 提供,细节与 z-index / 焦点约定见 [wiki/controls/_popup-infra.md](_popup-infra.md)。

## 无障碍

- Popup 本体无 ARIA 角色(WinUI `Popup` 的 AutomationPeer 为 Peer 透传,无语义角色);需要屏幕阅读器语义时,由 child 内容自带的 role / aria-* 承担。
- `#target` 内放置真实按钮(原生 `<button>`)即可获得键盘可达性:Space / Enter 打开;`isLightDismissEnabled` 时 Esc 关闭,焦点不需要预先落在弹层内(document 级监听)。
- 遮罩(`lightDismissOverlayMode='On'`)为纯装饰 `aria-hidden` 装饰层。
- `prefers-reduced-motion` 时出入场动画时长趋近 0(animations.css 全局降级),`opened` / `closed` 仍按时序触发。

## 与 WinUI 的差异

基建级差异(阴影 / 圆角 / 动画 / 定位策略 / 主题覆盖写法)统一记录在 [wiki/controls/_popup-infra.md](_popup-infra.md)「与 WinUI 的差异」节,此处只列 Popup 控件级条目:

1. **无皮肤是特性不是缺失**:generic.xaml 没有 `TargetType="Popup"` 的 ControlTemplate(Popup 不是 Control),源中弹层视觉全部来自各 presenter / child 包装;本组件层根因此刻意不带 `.wui-popup-layer` 的圆角与阴影,与源一致。
2. **PlacementTarget → `#target` slot**:WinUI 以 `Popup.PlacementTarget` 属性指定锚(通常由 FlyoutBase 内部赋值);Web 端用 slot 声明。源在**无** PlacementTarget 时只能窗口定位,Web 端额外提供了「组件声明点(零尺寸)」作为隐式锚,使锚点档 placement 在无 target 时也有合理行为。
3. **`Default` 定位的等效实现**:源把层锚在窗口左上角并叠加 `HorizontalOffset` / `VerticalOffset`;Web 端以一个 `position: fixed` 贴视口原点的零尺寸哨兵元素作为基建锚实现同一几何。注意祖先带 `transform` 时 `fixed` 的包含块会改变(Web 已知语义),demo 页无此场景。
4. **偏移在锚点档仍生效**:源在 `PlacementTarget + DesiredPlacement` 路径中按目标矩形定位、**不叠加** `HorizontalOffset` / `VerticalOffset`(Popup_Partial.cpp `SetPositionFromPlacement`);Web 端按迁移裁决让偏移在锚点档继续生效(相对锚点折算到主轴 / 交叉轴,见定位基准节的表),便于微调。
5. **`Auto` 的近似**:源码中 `Auto` 在有 PlacementTarget 时同样回落到「窗口原点 + 偏移」路径(`SetPositionFromPlacement` 显式排除 Auto);Web 端将 `Auto` 实现为「bottom 优先 + 视口翻转」的锚点自动选位,更贴近文档语义与 FlyoutBase 的实际观感。
6. **Esc 关闭**:源的文档只明说 light dismiss 含「点击外部」;Esc 关闭按 light-dismiss 族(Flyout / MenuFlyout)惯例实现,与基建的自动关闭分工表一致。
7. **关闭动画为 Web 增强**:源弹层出场为瞬时隐藏;本组件关闭时以 `--wui-easing-accelerate` 淡出(约 167ms),打开为纯淡入(对齐源 `OverlayOpeningAnimation` 语义)。`opened` / `closed` 在动画结束后触发;WinUI 在状态切换瞬间触发。
8. **属性命名映射**:`Child` → 默认 slot、`PlacementTarget` → `#target` slot、`DesiredPlacement` → `placement`、`HorizontalOffset` / `VerticalOffset` → `horizontalOffset` / `verticalOffset`、`IsLightDismissEnabled` → `v-model:is-light-dismiss-enabled`、`LightDismissOverlayMode` → `lightDismissOverlayMode`、`ShouldConstrainToRootBounds` → `shouldConstrainToRootBounds`、`IsOpen` → `v-model:is-open`、`Opened` / `Closed` → `opened` / `closed`。
9. **未实现项**:`ChildTransitions` / `OpenCloseAnimation`(以出入场动画类固定实现)、`ActualPlacement` / `ActualPlacementChanged`(翻转后的实际基位可读层根的 `data-wui-placement` 属性)、`AllowFocusOnInteraction` / `AllowFocusWhenDisabled`(Web 无对应语义)。

---

演示页源码:[demo/pages/PopupPage.vue](../../demo/pages/PopupPage.vue) · 组件源码:[src/components/Popup.vue](../../src/components/Popup.vue) · 弹层基建:[wiki/controls/_popup-infra.md](_popup-infra.md)
