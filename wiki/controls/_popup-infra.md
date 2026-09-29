# 弹层公共基建(阶段 3 控件作者必读)

本文描述后续所有弹层类控件(ToolTip / Flyout / Popup / ContentDialog / TeachingTip /
MenuFlyout / ComboBox 下拉 / DatePickerFlyout …)共用的底座。**在实现任何弹层控件之前请先通读本文**,避免各控件自造定位/层级/关闭逻辑。

| 文件 | 职责 |
| ---- | ---- |
| `src/composables/usePopup.ts` | `usePopupAnchor()`(宿主锚标记)+ `usePopupLayer(options)`(手写定位:placement / flip / shift / offset / 等宽;ResizeObserver + scroll 跟随;自动关闭回调) |
| `src/utils/popup.ts` | `nextPopupZIndex()`(z-index 分配)+ 弹层注册表(`registerPopupLayer` / `isInsideAnyPopupLayer` / `getTopmostPopupLayer`,嵌套链路豁免用)+ `trapFocus` / `releaseFocus` / `focusFirst`(Tab 循环,ContentDialog 用) |
| `src/styles/popup.css` | 层级 token、`.wui-popup-layer` 层根类、`.wui-popup-overlay` 遮罩、presenter 皮肤类、出入场动画挂接(已 `@import animations.css`) |

无在线示例(基建,非控件);风格母版:任何弹层控件实现完成后在此文件末尾互链。

## 最小接入示例

以一个假想的轻量 Flyout 为例(完整控件请再对照 generic.xaml 补视觉状态):

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'

const open = defineModel<boolean>('open', { default: false })
const { anchorRef } = usePopupAnchor()

const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: 'bottom-start',
  offset: { mainAxis: 4 },
  // 自动关闭语义由控件决定:light-dismiss 类控件通常两项全开
  onOutsidePress: () => (open.value = false),
  onEscape: () => (open.value = false),
})

watch(open, (value) => {
  if (value) update() // 内容是异步/动态尺寸时确保就位
}, { flush: 'post' }) // post:等 v-if 的层挂载完成后再重算;pre 会在渲染前跑到,update() 空转
</script>

<template>
  <span ref="anchorRef"><slot name="target" /></span>
  <Teleport to="body">
    <div
      v-if="open"
      ref="layerRef"
      class="wui-popup-layer wui-popup-skin-flyout wui-popup-anim-flyout"
    >
      <slot />
    </div>
  </Teleport>
</template>
```

要点:

- **v-if + Teleport 组合**:`usePopupLayer` 依赖层元素挂载才能测量,`v-if` 控制开关即可;层关闭即卸载,监听与观察器随组件作用域自动清理。
- **z-index 不用手写**:`usePopupLayer` 打开时自动调用 `nextPopupZIndex()` 写入内联样式(后开者在上);需要固定档位时用 `zIndex` 选项(见下表)。
- **回调要稳定**:`usePopupLayer(options)` 的 options 对象在 setup 时捕获一次,回调内请引用 ref/props(如上例的 `open`),不要在模板里现造闭包依赖会变的局部量。
- **嵌套零负担**:子弹层再开弹层时,外部点击豁免与 Escape 逐级收口由基建注册表自动完成(见「自动关闭约定」),宿主组件**无需**自行判断「目标是否在其他弹层内」或「自己是否最顶层」。
- **定位样式由组合式直写**(position/left/top/width/z-index/`data-wui-placement`),控件不要在层根上再写这些属性,以免被覆盖。

## usePopupLayer 选项表

| 选项 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| `anchor` | `MaybeRefOrGetter<Element \| null>` | (必填) | 锚元素;通常传 `usePopupAnchor()` 的 `anchorRef`。缺失时层不定位(dev 下告警) |
| `placement` | `PopupPlacement` | `'bottom-start'` | `top/bottom/left/right` 各自可加 `-start` / `-end`(缺省后缀 = 锚居中)。与 WinUI `FlyoutBasePlacement` 映射:`TopEdgeAlignedLeft`→`top-start`、`TopEdgeAlignedRight`→`top-end`、`Top`→`top`…;注意 WinUI `FlyoutBase.Placement` 属性默认值是 `Top`,而本基建默认 `bottom-start`(MenuFlyout 惯例),控件应显式给值 |
| `offset` | `number \| { mainAxis?, crossAxis? }` | `0` | 主轴间距(远离锚);`crossAxis` 沿交叉轴向末端(右/下)推移。WinUI 各控件间距不同(ToolTip ≠ MenuFlyout),由控件按 generic.xaml/官方行为给值 |
| `flip` | `boolean` | `true` | 首选侧视口内放不下(层主轴尺寸 + 主轴偏移 > 该侧空间)且对侧空间更大时翻转到对侧;对齐方式保留 |
| `shift` | `boolean` | `true` | 越界推回:双轴钳制进 `[padding, 视口 − padding − 层尺寸]`;层大于视口时贴 padding 起始边 |
| `strategy` | `'fixed' \| 'absolute'` | `'fixed'` | fixed:视口坐标(Teleport 到 body 后不受宿主 transform/祖先滚动影响,推荐);absolute:文档坐标,仅当层根包含块是初始包含块(body 未定位)时正确 |
| `matchAnchorWidth` | `boolean` | `false` | 层与锚同宽(ComboBox 下拉语义);在测高前写入,换行高度参与定位 |
| `viewportPadding` | `number` | `8` | flip/shift 判定的视口安全边距(px) |
| `zIndex` | `number \| string` | 自动分配 | 缺省时打开即取 `nextPopupZIndex()`(单调递增);需要固定档位传数字或 CSS var,如 `'var(--wui-z-popup-dialog)'` |
| `onOutsidePress` | `(event: PointerEvent) => void` | 无 | **层已开时**,pointerdown 落在本层锚之外、且不在任何已开弹层(含本层与其他实例的子弹层,注册表统一豁免)内才触发(light dismiss)。控件决定是否关闭;典型:`() => (open.value = false)` |
| `onEscape` | `(event: KeyboardEvent) => void` | 无 | **仅当本实例层已开、且是最后打开的弹层(注册表栈顶)时**触发(嵌套时同帧只有最顶层收到,逐级收口,不广播);事件原样给回调,进一步过滤(如要求焦点位置)由控件实现 |
| `onAnchorScroll` | `(event: Event) => void` | 无 | **层已开时**,滚动发生在**锚的滚动链**(页面或锚的祖先滚动容器)才触发。控件决定语义:ToolTip 选择继续跟随、不关闭;部分 Flyout 选择关闭 |

返回值:

| 成员 | 类型 | 说明 |
| ---- | ---- | ---- |
| `layerRef` | `Ref<HTMLElement \| null>` | 绑定到 Teleport 内的层根元素 |
| `update` | `() => void` | 立即重算一次定位;常规尺寸变化已被 ResizeObserver(锚 + 层)与 scroll/resize 跟随(rAF 节流,一帧至多一次)覆盖,仅在内容异步渲染或尺寸突变后手动调用 |

## 自动关闭约定(语义分工)

基建只提供「手势发生了」的回调,**何时关闭由具体控件决定**(对齐 WinUI 各控件行为差异):

| 控件类型 | onOutsidePress | onEscape | onAnchorScroll |
| -------- | -------------- | -------- | -------------- |
| MenuFlyout / Flyout / ComboBox 下拉(light dismiss) | 关闭 | 关闭 | 关闭(WinUI 滚动即 light dismiss) |
| ToolTip | 不监听 | 不监听 | 不监听(只跟随重定位) |
| ContentDialog(模态) | 不监听(遮罩挡指针) | 由 `IsPrimaryButtonEnabled` 等对话框逻辑决定 | 不监听 |
| TeachingTip | `IsLightDismissEnabled` 时关闭 | 同左 | 不监听 |

### 嵌套链路(基建内置,宿主零改动)

弹层套弹层(MenuFlyout 子菜单、Popup 内再开 Flyout 等)时,各层各自 Teleport 到 body、互不在对方 DOM 内,基建用 `src/utils/popup.ts` 的**已开弹层注册表**(栈:层挂载入栈、关闭/卸载出栈)统一收口,宿主组件无需任何配合代码:

- **外部点击豁免**:pointerdown 目标位于**任何已开弹层**(含其他实例的子弹层)内时,不视作「外部」——点击子弹层内部不会误关父层;层内元素再开的更深弹层同样被注册覆盖。
- **Escape 只关栈顶**:嵌套时同帧只有**最后打开**的实例收到 Escape;关闭后栈顶回落到父层,再按一次关父层,逐级收口(与 WinUI 菜单 Escape 行为一致)。
- **层关闭即出栈**:v-if 关闭/组件卸载自动注销,父层立即恢复「栈顶」资格。
- 兼容性说明:已接入控件里自带的同类守卫(如 MenuFlyout 子菜单的 `data-wui-menu-layer` 判定、`openChildHandle` 检查)与此机制叠加无害,可留待后续清理。

## z-index 约定

`src/styles/popup.css` 定义阶梯 token(与 `nextPopupZIndex()` 的 10000 基线一致):

| token | 值 | 用途 |
| ----- | -- | ---- |
| `--wui-z-popup-base` | 10000 | 锚定弹层(ToolTip/Flyout/MenuFlyout/下拉);常规层由 JS 递增分配 |
| `--wui-z-popup-overlay` | 10500 | light-dismiss 遮罩(`.wui-popup-overlay`) |
| `--wui-z-popup-dialog` | 11000 | ContentDialog 层 |
| `--wui-z-popup-topmost` | 12000 | 手动救急档 |

规则:

1. 常规弹层**不要手写 z-index**,交给 `usePopupLayer` 自动分配;需要档位时 `zIndex: 'var(--wui-z-popup-dialog)'`。
2. `nextPopupZIndex()` 单调递增只增不减;极端长会话下计数可能越过 10500/11000 档位线——档位 token 是「类别下限」约定,真正的压盖保证是**开启顺序**(后开在上,与 WinUI 视觉树 Topmost 语义一致)。
3. 遮罩放在层**之前**的 DOM(Teleport 内先遮罩后层)且用 `--wui-z-popup-overlay`;若遮罩与层都被自动分配,请给遮罩显式 `zIndex`(如 `'var(--wui-z-popup-overlay)'`)。

## 焦点约定(模态弹层)

`src/utils/popup.ts` 提供陷阱式焦点圈定(键盘 Tab 循环),供 ContentDialog / 嵌套模态使用:

```ts
import { focusFirst, releaseFocus, trapFocus } from '@/utils/popup'

// 层挂载后(mounted / watch open):
trapFocus(dialogEl, { initialFocus: true })   // 聚焦第一个可聚焦元素
// 关闭时:
releaseFocus()                                // 焦点归还到打开前的元素
```

- `trapFocus(container, { initialFocus? })`:`initialFocus` 支持 `true`(focusFirst)/ `HTMLElement` / 选择器 / `false`;无 tabindex 的容器建议模板加 `tabindex="-1"` 以兜底聚焦容器自身。
- `focusFirst(container)`:聚焦容器内第一个可聚焦元素(display:none 子树已被过滤),返回该元素或 null。
- `releaseFocus()`:弹出**最近**一个陷阱并归还焦点;嵌套模态(对话框内再开弹层)后进先出,外层陷阱自动继续生效。
- 局限:只拦截键盘 Tab,不强制鼠标焦点转移;WinUI 的指针模态由遮罩挡指针实现,控件侧配 `.wui-popup-overlay` 即可。不在 `FOCUSABLE_SELECTOR` 内的罕见可聚焦元素(option、audio/video[controls]、fieldset 联动禁用)暂不参与循环,已记录为已知边界。

## CSS 类与动画

| 类 | 作用 |
| -- | ---- |
| `.wui-popup-layer` | 层根外壳:定位回退、`z-index: var(--wui-z-popup-base)` 回退、公共圆角 `--wui-popup-corner-radius` 与阴影 `--wui-popup-shadow` |
| `.wui-popup-overlay` | light-dismiss 全屏遮罩(颜色 token `--wui-popup-light-dismiss-overlay-background`,浅 #ffffff99 / 深 #00000099) |
| `.wui-popup-skin-flyout` | FlyoutPresenter 皮肤(`--wui-flyout-presenter-background` + `--wui-flyout-border-theme`) |
| `.wui-popup-skin-tooltip` | ToolTip 皮肤(`--wui-tool-tip-*` 三 token) |
| `.wui-popup-anim-fade` / `-flyout` / `-scale` / `-dialog` | 入场动画,分别引用 animations.css 的 `wui-fade-in` / `wui-flyout-in` / `wui-scale-up-in` / `wui-dialog-in` 关键帧 |
| `.wui-popup-anim-leave` | 出场(淡出);配 Vue `<Transition name>` 或手动移除节点时使用 |

- `.wui-popup-layer[data-wui-placement='…']`(由 `usePopupLayer` 写入)自动设置 scale 类动画的 `transform-origin`,翻转后原点跟随真实基位。
- `prefers-reduced-motion` 降级由 animations.css 全局媒体查询统一处理(动画时长趋近 0.01ms,`animationend` 仍触发)。

## 与 WinUI 的差异(基建级,各控件 wiki 请引用勿重复)

1. **阴影**:WinUI 3 弹层阴影由 ThemeShadow(合成器 elevation)实现,XAML 无画刷资源,theme.css 无对应 token;popup.css 以双层 box-shadow(`--wui-popup-shadow`)做视觉近似,应用可覆盖该 token。
2. **圆角**:取 WinUI 3 `OverlayCornerRadius`(默认 8px);该键不在 generic.xaml ThemeDictionaries 内,未被 T0.1 提取为 `--wui-*` token,故在 popup.css 定义 `--wui-popup-corner-radius`(基建级 token,非 theme.css 生成物)。
3. **入场动画**:WinUI 弹层为纯淡入(`OverlayOpeningAnimation`),`wui-flyout-in` 的 8px translateY 为 Web 适配增强(偏差依据见 `docs/temp/motion-notes.md`)。
4. **定位**:WinUI Popup 由平台按视觉树布局,Web 以 fixed 策略 + 手写几何等效;`FlyoutBase.Placement` 默认 `Top` 而基建默认 `bottom-start`,控件需显式传值。
5. **popup.css 引入**:应用入口 import 一次(demo 站待控制器在 `demo/main.ts` 追加 `import '../src/styles/popup.css'`;控件侧也可各自 import,Vite 会去重);文件已 `@import './animations.css'`,勿重复引入。
6. **主题覆盖写法**:popup.css 为非 scoped 样式,`data-theme` 选择器可放心书写;但控件自己的 `<style scoped>` 内**禁止**用 `:global([data-theme=…])`(plugin-vue 编译缺陷,ProgressBar 波次实证)——主题相关覆盖放独立非 scoped style 块。

## 互链

- 基建源码:`src/composables/usePopup.ts`、`src/utils/popup.ts`、`src/styles/popup.css`
- 后续控件文档将在此列出:ContentDialog、MenuFlyout、TeachingTip…
- 已接入控件:[ToolTip](./ToolTip.md)(皮肤 `.wui-popup-skin-tooltip`,滚动跟随不关闭,演示页 `demo/pages/ToolTipPage.vue`)
- 已接入控件:[MenuFlyout](./MenuFlyout.md)(五件套菜单族:根层 + Item/Toggle/Separator/SubItem 级联子菜单,子菜单经 `registerOpenSubmenu` 登记实现 Escape 逐级与兄弟互斥,演示页 `demo/pages/MenuFlyoutPage.vue`)
- 已接入控件:[ContentDialog](./ContentDialog.md)(视口居中模态:不走 usePopupLayer 定位,z-index 固定档 `--wui-z-popup-dialog`,`trapFocus`/`releaseFocus` 焦点陷阱 + `registerPopupLayer` 栈顶登记实现嵌套 Esc 逐级,演示页 `demo/pages/ContentDialogPage.vue`)
- 已接入控件:[TeachingTip](./TeachingTip.md)(targeted 尾巴指向:四边 + 八角 + Center 全枚举经 placement + 交叉轴 offset 组合扩展,non-targeted 以 0×0 视口锚点复用同一基建,小屏尾巴够不到锚自动折叠,演示页 `demo/pages/TeachingTipPage.vue`)
