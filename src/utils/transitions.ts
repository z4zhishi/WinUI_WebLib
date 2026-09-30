// WinUI 导航/页面转场(Page Transitions)的 Web 落地 —— 路由与视图过渡的类名与工具。
//
// WinUI 源头:Frame.ContentTransitions 挂 NavigationThemeTransition,其 NavigationTransitionInfo
// 子类决定进/退导航的具体动画(进页 NavigatingTo / 退页 NavigatingAway + 对应 Back 前缀四个触发态)。
// 参数全部取自 CK/WinUI-Reference/dxaml/phone/lib/ThemeTransitions.cpp(只读,MIT):
//   EntranceNavigationTransitionInfo   L3141-L3186(位移 140px、hold 150ms + 进入 300ms,标准曲线)
//   SlideNavigationTransitionInfo      L1515-L1601(横滑 150 出 / 200 进,纵滑 SLIDE_OFFSET 200px、250/600ms)
//   DrillInNavigationTransitionInfo    L2830-L2987(进页 scale 0.94→1 / 783ms,离开 1.04 / 100ms)
//   ContinuumNavigationTransitionInfo  L1826-L1910(背景 scale 0.9→1 + 淡入)
//   CommonNavigationTransitionInfo     L557(页级淡入 + 子元素 stagger)
//   SuppressNavigationTransitionInfo   L3075(无动画)
//   NavigationThemeTransition 缺省 info = EntranceNavigationTransitionInfo(L233、L236-240)
// 缓动曲线用 src/styles/animations.css 的 --wui-easing-*(标准/减速/加速);关键帧与类名
// 也定义在 animations.css(wui-nav-* 前缀),供本目录包装组件与裸 vue-router 用法共用。
//
// vue-router 用法(裸路由,不经过包装组件):
//   <router-view v-slot="{ Component, route }">
//     <Transition v-bind="getNavigationTransition(kind, direction)">
//       <div class="wui-nav-view" :key="route.fullPath"><component :is="Component" /></div>
//     </Transition>
//   </router-view>
// 方向(direction)由业务按导航语义决定(前进 push → 'forward',后退 back → 'backward')。

/** NavigationTransitionInfo 子类对应的转场种类(WinUI 属性名,camelCase)。 */
export type NavigationTransitionKind =
  | 'default'
  | 'entrance'
  | 'drillIn'
  | 'suppress'
  | 'slideFromRight'
  | 'slideFromLeft'
  | 'slideFromBottom'
  | 'slideFromTop'
  | 'common'
  | 'continuum'

/** 导航方向:前进(push / Navigate)或后退(back / GoBack);决定各转场的镜像动画。 */
export type NavigationDirection = 'forward' | 'backward'

/** 全部转场种类(示例页下拉与文档遍历用;'default' 缺省 = Entrance,单独保留供文档展示)。 */
export const NAVIGATION_TRANSITION_KINDS = [
  'default',
  'entrance',
  'drillIn',
  'suppress',
  'slideFromRight',
  'slideFromLeft',
  'slideFromBottom',
  'slideFromTop',
  'common',
  'continuum',
] as const

/**
 * 传给 Vue <Transition> 的类名集合(enter-to / leave-from 不需要:
 * 进入用 keyframes 的 from 端,离开用 fill-mode both 保持末态直到元素移除)。
 */
export interface RouteTransitionClasses {
  enterActiveClass: string
  leaveActiveClass: string
}

/** kind → animations.css 类名前缀(default 复用 entrance;suppress 无动画,返回空类名)。 */
const NAVIGATION_TRANSITION_SLUGS: Partial<Record<NavigationTransitionKind, string>> = {
  default: 'entrance',
  entrance: 'entrance',
  drillIn: 'drill',
  slideFromRight: 'slide-right',
  slideFromLeft: 'slide-left',
  slideFromBottom: 'slide-bottom',
  slideFromTop: 'slide-top',
  common: 'common',
  continuum: 'continuum',
}

/** 运行时收窄(示例页下拉值等外部输入用)。 */
export function isNavigationTransitionKind(value: unknown): value is NavigationTransitionKind {
  return (
    typeof value === 'string' &&
    (NAVIGATION_TRANSITION_KINDS as readonly string[]).includes(value)
  )
}

/**
 * 解析指定转场与方向对应的 Vue <Transition> 类名(spread 到 Transition 上即可):
 *   <Transition v-bind="getNavigationTransition('slideFromRight', 'forward')" mode="out-in">
 * 'suppress'(与无动画类别)返回空类名 —— Vue 检测不到任何过渡时长时立即完成,
 * 等价 WinUI SuppressNavigationTransitionInfo 的「无转场」语义。
 */
export function getNavigationTransition(
  kind: NavigationTransitionKind,
  direction: NavigationDirection = 'forward',
): RouteTransitionClasses {
  const slug = NAVIGATION_TRANSITION_SLUGS[kind]
  if (!slug) return { enterActiveClass: '', leaveActiveClass: '' }
  const dir = direction === 'backward' ? 'back' : 'fwd'
  return {
    enterActiveClass: `wui-nav-${slug}-${dir}-enter`,
    leaveActiveClass: `wui-nav-${slug}-${dir}-leave`,
  }
}

/* ---------------------------------------------------------------------
 * ConnectedAnimation(View Transitions API)选型与工具
 * ------------------------------------------------------------------- */

/**
 * WinUI ConnectedAnimationConfiguration 四档(官方示例 SimpleConnectedAnimation 的
 * Default / Gravity / Direct / Basic)→ Web 侧动画时序近似。
 * WinUI 的 Configuration 平台内定、不可配参数;此处为 Web 适配的缓动映射,见 wiki。
 */
export type ConnectedAnimationConfig = 'default' | 'gravity' | 'direct' | 'basic'

export const CONNECTED_ANIMATION_CONFIGS = ['default', 'gravity', 'direct', 'basic'] as const

/** config → ::view-transition-group 的 animation-timing-function(direct 用线性,其余走 token)。 */
export const CONNECTED_ANIMATION_EASINGS: Record<ConnectedAnimationConfig, string> = {
  default: 'var(--wui-easing-decelerate)',
  gravity: 'var(--wui-easing-accelerate)',
  direct: 'linear',
  basic: 'var(--wui-easing-standard)',
}

/** 当前浏览器是否支持同文档 View Transitions(document.startViewTransition)。 */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function'
}

/**
 * 启动一次「共享元素过渡」:优先走 View Transitions API(新旧快照按
 * view-transition-name 配对飞入),不支持时直接执行 apply(即时切换,即降级声明)。
 * - apply 里做状态切换并 await Vue 的 nextTick,保证新快照在 DOM 更新后采集;
 * - 返回是否真正播放了动画(false = 降级为即时切换);
 * - transition-running 防重入:进行中再次调用直接忽略(等价连续导航被吞掉)。
 */
/** 一次共享元素过渡的结果:animated=false 即已降级为即时切换;finished 在动画(或切换)结束后 resolve。 */
export interface ConnectedTransitionResult {
  animated: boolean
  finished: Promise<void>
}

let connectedTransitionRunning = false

/**
 * 启动一次「共享元素过渡」:优先走 View Transitions API(新旧快照按
 * view-transition-name 配对飞入),不支持时直接执行 apply(即时切换,即降级声明)。
 * - apply 里做状态切换并 await Vue 的 nextTick,保证新快照在 DOM 更新后采集;
 * - 返回 animated(是否真正播放动画;false = 浏览器不支持已降级 / 有过渡进行中被忽略)
 *   与 finished(动画或即时切换完成;用于释放调用方的防重入标志);
 * - 防重入:进行中再次调用直接返回 animated=false 且不再执行 apply(连续导航被吞掉)。
 */
export function startConnectedTransition(
  apply: () => void | Promise<void>,
  config: ConnectedAnimationConfig = 'default',
): Promise<ConnectedTransitionResult> {
  if (connectedTransitionRunning) {
    return Promise.resolve({ animated: false, finished: Promise.resolve() })
  }

  const doc = document as Document & {
    startViewTransition?: (updateCallback: () => void | Promise<void>) => {
      finished: Promise<unknown>
    }
  }
  const startViewTransition = doc.startViewTransition?.bind(doc)

  if (typeof startViewTransition !== 'function') {
    return Promise.resolve(apply()).then(() => ({
      animated: false,
      finished: Promise.resolve(),
    }))
  }

  connectedTransitionRunning = true
  document.documentElement.style.setProperty(
    '--wui-ca-easing',
    CONNECTED_ANIMATION_EASINGS[config],
  )
  let transition: { finished: Promise<unknown> }
  try {
    transition = startViewTransition(apply)
  } catch {
    // startViewTransition 同步异常(极端情况):复位状态,按降级即时切换处理。
    connectedTransitionRunning = false
    document.documentElement.style.removeProperty('--wui-ca-easing')
    return Promise.resolve(apply()).then(() => ({
      animated: false,
      finished: Promise.resolve(),
    }))
  }
  const finished = Promise.resolve(transition.finished)
    .then((): void => {
      // skipTransition / 中断不算错误:吞掉 rejection,统一 resolve 为 void。
    })
    .finally(() => {
      connectedTransitionRunning = false
      document.documentElement.style.removeProperty('--wui-ca-easing')
    })
  return Promise.resolve({ animated: true, finished })
}
