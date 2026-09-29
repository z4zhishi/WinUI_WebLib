# Flyout

> 在线示例:[/#/flyout](/#/flyout) · 演示页源码:[demo/pages/FlyoutPage.vue](../../demo/pages/FlyoutPage.vue)

## 概述

Flyout 显示**轻量级的浮出 UI**,内容可以是信息展示,也可以要求用户交互。与对话框(ContentDialog)不同,Flyout 可以通过点击 / 点按外部区域进行 **light dismiss**(轻扫关闭)。典型用途:收集用户输入、显示某一项的更多细节、要求用户确认某个操作。浮层定位(placement / flip / shift)、z-index 分配与出入场动画复用弹层公共基建(见 [弹层公共基建](\_popup-infra.md)),本组件只负责 Flyout 语义:宿主锚定、light dismiss、`Placement` 档位与 FlyoutPresenter 容器观感。

官方文档:

- [Flyout - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.flyout)
- [对话框与浮出控件设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/dialogs-and-flyouts)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `placement` | `'Auto' \| 'Top' \| 'Bottom' \| 'Left' \| 'Right' \| 'Full'` | `'Auto'` | 放置位(WinUI `Placement`,类型 `FlyoutBasePlacementMode` 全枚举)。`Auto` 为系统自适应(Web 侧:底侧首选,空间不足自动翻转);`Full` 铺满整个窗口 |
| `lightDismiss` | `boolean` | `true` | light dismiss 开关:外部按下 / `Escape` / 锚滚动 / 焦点移出层外时自动关闭。置 `false` 后只能点击宿主(toggle)或经 `isOpen` 编程关闭 |
| `lightDismissOverlayMode` | `'Auto' \| 'On' \| 'Off'` | `'Auto'` | 打开期间的半透明遮罩(WinUI `LightDismissOverlayMode`);`Auto` 在桌面 Web 视同 `Off`,需要遮罩时显式传 `'On'` |
| `offset` | `number` | `4` | 层与锚的主轴间距(px);WinUI 由平台定位决定,Web 侧显式取值 |
| `presenterClass` | `string` | `''` | 附加到 FlyoutPresenter 容器(层根)的 class —— WinUI `FlyoutPresenterStyle` 的 Web 等价之一 |
| `presenterStyle` | `string` | `''` | 附加到 FlyoutPresenter 容器的内联样式(CSS 文本) |
| `isOpen` (v-model) | `boolean` | `false` | 打开状态,`v-model:is-open` 双向绑定。WinUI `FlyoutBase.IsOpen` 为只读(经 `ShowAt` / `Hide` 驱动),Web 侧开放写入以贴合 Vue 习惯 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `open` | — | 层挂载并完成定位后触发(WinUI `Opened` 的近似;不等入场动画结束) |
| `close` | — | 开始关闭时触发(light dismiss / 再点宿主 / `isOpen` 置 `false`);层随后播放淡出动画并卸载(WinUI `Closing` + `Closed` 的合并近似) |
| `update:isOpen` | `(value: boolean)` | `v-model:is-open` 双向绑定更新 |

## 方法(expose)

| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `showAt` | `(target?: Element) => void` | 在指定元素处打开并把锚切换到该元素(WinUI `ShowAt(FrameworkElement)`);缺省参数按当前锚打开。显式锚**持续生效到下一次 `showAt` 调用**,期间的声明式宿主点击也会锚在它上;需要还原时把 `#target` 宿主元素再传一次即可 |
| `hide` | `() => void` | 关闭 Flyout(WinUI `Hide`) |

## Slot

| Slot | 说明 |
| --- | --- |
| `target` | 宿主控件(如 `WuiButton`),渲染为锚包装元素;点击开 / 再点关(对应 WinUI `Button.Flyout` 声明式附加)。不提供时组件不渲染宿主包装,纯程序化(`showAt` / `isOpen`)使用 |
| 默认 slot | 浮出内容(WinUI `Content`),渲染进 FlyoutPresenter 容器(任意内容,含表单控件) |

## 基础用法

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiFlyout from '@/components/Flyout.vue'

// 方式一:声明式宿主(#target)—— 点击开 / 再点关
const isOpen = ref(false)

// 方式二:程序化 showAt(任意元素均可作锚)
const flyout = useTemplateRef('flyout')
const anchorEl = ref<HTMLElement | null>(null)

function openAtAnchor(): void {
  flyout.value?.showAt(anchorEl.value ?? undefined)
}
</script>

<template>
  <!-- 附加到按钮(对照 WinUI Button.Flyout);确认后调用 hide(),对应官方 f.Hide() -->
  <WuiFlyout v-model:is-open="isOpen" placement="Bottom" @open="onOpen" @close="onClose">
    <template #target>
      <WuiButton content="Empty cart" />
    </template>
    所有商品都将被移除,是否继续?
    <WuiButton content="Yes, empty my cart" @click="flyout?.hide()" />
  </WuiFlyout>

  <!-- 程序化挂载:无 #target,纯 showAt -->
  <button ref="anchorEl" type="button">锚点</button>
  <WuiButton content="showAt 打开" @click="openAtAnchor" />
  <WuiFlyout ref="flyout">
    <p>经 showAt(anchor) 打开的内容。</p>
  </WuiFlyout>
</template>
```

## showAt 约定(挂到宿主按钮的两种方式)

WinUI 把 Flyout 挂到宿主有两条路:`Button.Flyout` 声明式附加、`FlyoutBase.ShowAt(element)` 程序化显示。Web 侧对应:

1. **声明式(推荐)**:`#target` slot 放宿主控件。组件在宿主外包一层 `inline-flex` 锚包装(带 `data-wui-popup-anchor` 标记,由基建写入),点击宿主开、再点关;`$attrs` 透传到该包装元素。
2. **程序化**:`ref` 拿到组件实例后调用 `showAt(element)`——锚切换到任意元素并打开,适合右键菜单式场景或宿主由第三方渲染的情况。`hide()` 对应 `Hide()`。
3. 两者可混用:`showAt` 的显式锚优先于 `#target` 宿主,持续生效到下一次 `showAt` 调用(行为已在演示页示例 4 演示)。

## 无障碍

- 宿主包装带 `aria-haspopup="dialog"` 与 `aria-expanded`(随开合更新)。
- 层根(FlyoutPresenter 容器)为 `role="dialog"` + `aria-modal="false"`(非模态弹层),`tabindex="-1"`;打开即把焦点移入层内第一个可聚焦元素(WinUI 打开即移焦,无焦点内容时聚焦容器自身),`Escape` 与 focusout light dismiss 均可用键盘完成。
- 遮罩 `aria-hidden`;`prefers-reduced-motion` 时出入场动画时长趋近 0(animations.css 全局降级)。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 generic.xaml `TargetType="FlyoutPresenter"` 默认样式(L11952-L11998)与主题资源复刻。颜色一律引用 theme.css 既有 token(ARGB 源值已按 CSS RGBA 字节序提取),无硬编码色值;**弹层通用的基建级差异**(阴影为 ThemeShadow 的 box-shadow 近似、圆角取 `OverlayCornerRadius` 8px、入场淡入带 8px 位移增强、fixed 策略手写几何定位)**统一见** [弹层公共基建 · 与 WinUI 的差异](\_popup-infra.md#与-winui-的差异基建级各控件-wiki-请引用勿重复),此处不再重复。Flyout 自身的差异:

| 源资源 / 行为(WinUI 3) | 源值 | 本组件取值 |
| --- | --- | --- |
| `FlyoutPresenterBackground` ← `SystemControlTransientBackgroundBrush` | light `#F2F2F2` / dark `#2B2B2B`(平台为亚克力混合画刷) | `--wui-flyout-presenter-background` token(popup.css 皮肤类,纯色近似) |
| `FlyoutBorderThemeBrush` ← `SystemControlTransientBorderBrush` | light `#24000000` / dark `#5C000000` | `--wui-flyout-border-theme` token(已转 CSS 字节序 `#00000024` / `#0000005C`) |
| `FlyoutBorderThemeThickness` | 1 | 1px(皮肤类内写死) |
| `FlyoutContentThemePadding` | `12,11,12,12` | `padding: 11px 12px 12px`(XAML 左,上,右,下 → CSS 上 右 下 左) |
| `FlyoutThemeMinWidth / MaxWidth / MinHeight / MaxHeight` | 96 / 456 / 40 / 758 | 按值写死(theme.css 未提取尺寸资源) |
| `ScrollViewer.Horizontal/VerticalScrollMode = Auto` | 内容超界出滚动条 | 容器 `overflow: auto` |
| 前景 / 字号(未在样式 Setter 中显式声明) | 继承应用默认(TextFillColorPrimary / 14px) | `--wui-default-text-foreground-theme` / `--wui-control-content-theme-font-size` token |

其余无 token / 做 Web 等价替换的项:

1. **`Placement = Auto` 的映射**:WinUI 由系统按空间自适应;Web 取「底侧首选 + flip 自动翻转」(基建 flip 语义),多数场景与平台一致(下方居中,空间不足翻上方),边缘贴齐类档位(`TopEdgeAlignedLeft` 等,属 `MenuFlyout` 的 `FlyoutPlacementMode`)不在 `FlyoutBasePlacementMode` 内,未提供。
2. **`Full` 档**:铺满整个窗口;Web 以 `position: fixed` + `width/height: 100%`(视口百分比,排除滚动条)实现,定位算法在该档把安全边距与间距归零,层四边贴视口。
3. **`FlyoutPresenterStyle`** 是 XAML Style 对象;Web 以 `presenterClass` + `presenterStyle`(class + 内联样式)组合等价,容器默认观感(背景 / 边框 / 圆角 / 阴影 / 内边距 / 尺寸)不变,叠加覆盖即可。也可直接覆盖 `--wui-flyout-presenter-background` 等 token。
4. **`IsOpen` 只读 → v-model**:WinUI `FlyoutBase.IsOpen` 为只读(经 `ShowAt` / `Hide` 驱动,配 `Opening/Opened/Closing/Closed` 四事件);Web 侧按双向语义开放 `v-model:is-open`,事件合并为 `open`(≈`Opened`,不等动画结束)与 `close`(≈`Closing`+`Closed`,关闭开始时触发)。
5. **`Closing` 不可取消**:`ClosingEventArgs.Cancel` 回滚语义未实现(基建于关闭只给回调,不做可取消拦截;需要确认拦截时用 `lightDismiss=false` + 自管 `isOpen`)。
6. **focusout 关闭为 WinUI 焦点语义补齐**:Tab 把焦点移出层外即 light dismiss;`relatedTarget` 为空(焦点回浏览器壳 / 层卸载)不触发。`lightDismiss=false` 时该项与其他三项手势全部停用。
7. **遮罩档位**:`LightDismissOverlayMode` 的 `Auto` 在 Xbox / 触摸平台生效;桌面 Web 一律视同 `Off`,需遮罩时显式传 `'On'`(遮罩按基建约定取 `--wui-z-popup-overlay` 档,层取其上固定档)。
8. **间距无源值**:WinUI 弹层与锚的间距由平台定位决定、无公开 token,Web 取主轴 4px(`offset` 可调)。
9. **属性命名**:`Placement` → `placement`、`LightDismissOverlayMode` → `lightDismissOverlayMode`、`Content` → 默认 slot、`ShowAt` / `Hide` → `showAt` / `hide`(expose);`lightDismiss` / `offset` / `presenterClass` / `presenterStyle` 为 Web 侧扩展(前者的语义在 WinUI 内建于 FlyoutBase 的 light dismiss 行为,不可关;Web 开放成开关以便对比演示)。

---

演示页源码:[demo/pages/FlyoutPage.vue](../../demo/pages/FlyoutPage.vue) · 组件源码:[src/components/Flyout.vue](../../src/components/Flyout.vue) · 弹层基建:[wiki/controls/\_popup-infra.md](\_popup-infra.md)
