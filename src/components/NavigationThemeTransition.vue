<script setup lang="ts">
// NavigationThemeTransition —— WinUI 导航页面转场(Frame.ContentTransitions)的 Web 复刻。
// WinUI 中它挂在 Frame 上,NavigationTransitionInfo 子类(Entrance / DrillIn / Slide /
// Suppress / Common / Continuum)决定进退导航动画;缺省 info = EntranceNavigationTransitionInfo
// (ThemeTransitions.cpp L233、L236-240)。
// Web 落地:本组件即「Frame」——viewKey 变化即 Frame.Navigate,内部用 Vue <Transition>
// 播放 src/utils/transitions.ts 解析出的转场类(关键帧与类名定义在 styles/animations.css 的
// wui-nav-* 段,参数逐条对照 ThemeTransitions.cpp,见该文件注释行号)。
// 两用形态:
//   1) 组件形态(本文件):内容视图以 viewKey 键控,容器 wui-nav-frame 用 grid 堆叠,
//      过渡期间新旧视图同格重叠(等价 Frame 两页叠放,离开页不把布局顶开);
//   2) 裸 vue-router 形态:router-view v-slot + <Transition v-bind="getNavigationTransition(...)">
//      + wui-nav-frame 容器,见 wiki/controls/PageTransition.md。
// duration/direction 语义:WinUI 方向由 NavigationMode 内部决定,这里显式接收(Web 增强),
// 前进 push → 'forward',后退 GoBack → 'backward',用于选择镜像动画。
import { computed } from 'vue'
import { getNavigationTransition } from '../utils/transitions'
import type { NavigationDirection, NavigationTransitionKind } from '../utils/transitions'
import '../styles/animations.css'

const props = withDefaults(
  defineProps<{
    /** 视图键(Frame 导航目标):变化即播放一次页面转场,slot 内容随之切换。 */
    viewKey: string | number
    /**
     * NavigationTransitionInfo 种类(对应 WinUI DefaultNavigationTransitionInfo):
     * 'default' 与 'entrance' 同为缺省入场(淡入 + 上浮 140px)。
     */
    defaultNavigationTransitionInfo?: NavigationTransitionKind
    /** 导航方向:forward = push / Navigate,backward = GoBack(决定镜像动画;Web 增强)。 */
    direction?: NavigationDirection
  }>(),
  {
    defaultNavigationTransitionInfo: 'default',
    direction: 'forward',
  },
)

defineOptions({ inheritAttrs: false })

const transitionClasses = computed(() =>
  getNavigationTransition(props.defaultNavigationTransitionInfo, props.direction),
)
</script>

<template>
  <div v-bind="$attrs" class="wui-navigation-theme-transition wui-nav-frame">
    <Transition
      :enter-active-class="transitionClasses.enterActiveClass"
      :leave-active-class="transitionClasses.leaveActiveClass"
    >
      <div :key="viewKey" class="wui-nav-view">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.wui-navigation-theme-transition {
  position: relative;
  width: 100%;
}
</style>
