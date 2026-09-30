# Connected Animation

在线示例:[/#/connectedanimation](/#/connectedanimation)

## 概述

连接动画(Connected Animation)在页面导航期间**延续显示同一个元素**,帮助用户在视图切换之间保持上下文:列表页点按条目,缩略图飞入详情页头部放大;返回时反向飞回列表原位。WinUI 的 API 形态是命令式的 —— `ConnectedAnimationService.GetForCurrentView().PrepareToAnimate("key", sourceElement)` 准备动画,导航后在目标页 `ConnectedAnimation.TryStart(targetElement)` 启动,源/目标按字符串 key 配对。

本项目以**页面级工具**(`src/utils/transitions.ts`)提供等价能力,没有包装组件:共享元素过渡的本质是「两个视图状态之间的元素配对」,用 CSS View Transitions API 的 `view-transition-name` 配对天然表达,不需要额外的控件层。官方示例(`ConnectedAnimationListPage` 列表→详情、`ConnectedAnimationElementsSame` 同页卡片、`SimpleConnectedAnimation` 的 Configuration 四档)均在演示页复刻。

官方文档:

- [ConnectedAnimation - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.animation.connectedanimation)
- [ConnectedAnimationService - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.media.animation.connectedanimationservice)
- [Connected animation - Guidelines](https://learn.microsoft.com/windows/apps/design/motion/connected-animation)

## 选型:CSS View Transitions API(降级 = 即时切换)

在「View Transitions API」与「FLIP 手写」之间选择了**前者**,理由:

1. **配对机制与 WinUI 同构**:`view-transition-name` ↔ `ConnectedAnimation` 的字符串 key,旧/新快照各捕获一次同名元素,浏览器自动完成位置 + 尺寸 + 交叉淡入的形变;FLIP 需要手动采集矩形、反算位移、清理 transform,还要自处理新旧内容交叉淡入。
2. **不与滚动/布局互相干扰**:快照是渲染层图像,动画期间列表滚动位置天然保留(等价官方 `ScrollIntoView` 的回滚定位);FLIP 的 transform 会临时覆盖元素自身变换,易产生 stacking context 副作用。
3. **浏览器支持已普及**(Chrome/Edge 111+、Safari 18+、Firefox 144+ 均支持同文档视图过渡),WebView2 环境(WinUI 应用宿主)原生可用。

**降级声明**:`document.startViewTransition` 不存在时(旧浏览器 / 不支持的环境),`startConnectedTransition` 直接执行状态切换 —— 即时替换、无动画,语义等价 WinUI `ConnectedAnimation.TryStart` 返回 `false` / `SuppressNavigationTransitionInfo`。页面用 `supportsViewTransitions()` 检测并展示支持度徽标。`prefers-reduced-motion` 下 `::view-transition-*` 伪元素的动画时长/延迟被压至 0.01ms(演示页全局样式块),观感同为即时切换。

## 概念映射

| WinUI 概念 | Web(View Transitions)映射 | 说明 |
| --- | --- | --- |
| `ConnectedAnimationService.GetForCurrentView().PrepareToAnimate("key", sourceElement)` | 给源元素设置 `view-transition-name`(如 `wui-ca-photo-1`) | 旧快照按名字捕获元素的位置/尺寸;名字在配对期间必须页面内唯一 |
| `ConnectedAnimation.TryStart(targetElement)` | 切换状态后,新快照中携带同名 `view-transition-name` 的元素 | `startViewTransition` 回调里改状态并 `await nextTick()`,DOM 更新后再采集新快照,两者自动配对飞入 |
| `Frame.Navigate(page, param, new SuppressNavigationTransitionInfo())` | 状态切换不叠加页面转场 | 官方示例导航时抑制默认转场,只保留共享元素飞入;与 [PageTransition](./PageTransition.md) 的 `suppress` 一致 |
| `ConnectedAnimationConfiguration`(Default / Gravity / Direct / Basic) | `::view-transition-group(*)` 的 `animation-timing-function`(`--wui-ca-easing`) | WinUI 的 Configuration 平台内定不可配;Web 以缓动近似:default→decelerate、gravity→accelerate、direct→linear、basic→standard(token) |
| `TryStart(target, coordinatedElements)` 协同元素 | 非同名内容走 View Transitions 默认交叉淡入淡出 | 详情页标题/信息面板随根组淡入,无需单独配对 |
| `TryStart` 返回 `false`(元素不在可视树/不支持) | `document.startViewTransition` 不存在 → 直接执行状态切换(降级) | `supportsViewTransitions()` 检测;页面有支持度徽标声明 |
| `collection.ScrollIntoView(_storeditem)` 返回定位 | 无需处理:列表与详情是同一 DOM 的两个状态 | 返回时滚动位置天然保留 |

## 工具 API(src/utils/transitions.ts)

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `supportsViewTransitions()` | `() => boolean` | 当前浏览器是否支持同文档 View Transitions |
| `startConnectedTransition(apply, config?)` | `(apply: () => void \| Promise<void>, config?: ConnectedAnimationConfig) => Promise<{ animated: boolean; finished: Promise<void> }>` | 启动共享元素过渡:`animated=false` 表示已降级即时切换(或有过渡进行中被防重入忽略);`finished` 在动画/切换结束后 resolve,用于释放调用方的 busy 标志 |
| `CONNECTED_ANIMATION_CONFIGS` / `CONNECTED_ANIMATION_EASINGS` | `readonly ['default','gravity','direct','basic']` / `Record<…, string>` | 官方 Configuration 四档 → CSS 时序函数(token)映射 |

事件:无(WinUI `ConnectedAnimation` 仅有 `Completed` 回调;Web 端对应 `finished`)。

## 基础用法

```ts
import { startConnectedTransition, supportsViewTransitions } from '@/utils/transitions'

// 1) 源元素(列表缩略图)携带名字 —— 旧快照捕获:
//      <span :style="{ viewTransitionName: 'wui-ca-photo-1' }" />
//    注意:同一时刻页面内只能有一个该名字的元素,通常只在「待配对」的元素上动态挂名。
// 2) 导航(状态切换),不叠加页面转场(官方用 SuppressNavigationTransitionInfo):
const { animated, finished } = await startConnectedTransition(async () => {
  state.value = 'detail' // 切换视图状态
  await nextTick()       // 等 Vue 更新 DOM 后再采集新快照
}, 'default')
// 3) 新状态里的目标元素(详情头部大图)携带同名 view-transition-name → 自动飞入配对。
//    animated=false = 浏览器不支持,已即时切换(降级);finished 用于释放 busy 标志。
```

```css
/* 飞行时序(官方 Configuration 的 Web 近似)与 reduced-motion 降级 */
::view-transition-group(*) {
  animation-timing-function: var(--wui-ca-easing, var(--wui-easing-standard));
}
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-image-pair(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
    animation-delay: 0.01ms !important;
  }
}
```

## 与 WinUI 的差异说明

1. **命令式 API → 声明式配对**:WinUI 是「先 Prepare 再 TryStart」的两段命令式调用;Web 是「源/目标挂同名 `view-transition-name` + 一个快照回调」,没有跨页传递的 ConnectedAnimation 对象。跨真实路由(而非同页状态切换)使用时,源元素随旧页卸载,需把路由容器包进 `document.startViewTransition`(或使用本工具的同页状态模式)。
2. **Configuration 为缓动近似**:Default/Gravity/Direct/Basic 的真实时序曲线平台内定(CK 无公开参数);Web 端映射为四档 `animation-timing-function`(decelerate / accelerate / linear / standard token),`startConnectedTransition` 在过渡期间把选中值写到 `--wui-ca-easing`。
3. **根级交叉淡入**:View Transitions 默认对整页根做一次交叉淡入(`::view-transition` 根组),非配对内容随根组淡入淡出;WinUI 的协同元素(coordinated panel)是显式列表,粒度更细。
4. **降级为即时切换**:不支持的浏览器无共享元素动画(页面徽标声明);WinUI 在不满足条件时 `TryStart` 返回 `false`,行为等价。
5. **示例素材**:官方示例使用照片资源;演示页以 `--wui-system-accent-color*` token 色块代替(先例见 ScrollView / ParallaxView 示例页)。

## 相关

- 页面转场(NavigationThemeTransition / ThemeTransition):[PageTransition](./PageTransition.md)

---

演示页源码:[demo/pages/ConnectedAnimationPage.vue](../../demo/pages/ConnectedAnimationPage.vue)
