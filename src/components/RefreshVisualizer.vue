<script lang="ts">
// RefreshVisualizer(WinUI RefreshVisualizer 迁移):类型对外导出,供使用方与示例页引用。
// 源码对照 CK/WinUI-Reference/controls/dev/PullToRefresh/RefreshVisualizer/
// (RefreshVisualizer.idl / .cpp / .xaml / _themeresources.xaml;generic.xaml 中只有
// RefreshVisualizerForeground/Background 两个纯色画笔,无 ControlTemplate,已定位核实)。
import type { InjectionKey, Ref } from 'vue'

/** 拉动方向(WinUI RefreshPullDirection);本库手势仅实现 TopToBottom(垂直向下)。 */
export type RefreshPullDirection = 'LeftToRight' | 'TopToBottom' | 'RightToLeft' | 'BottomToTop'

/** 视觉器方向(WinUI RefreshVisualizerOrientation):决定指示器的起始旋转角。 */
export type RefreshVisualizerOrientation =
  | 'Auto'
  | 'Normal'
  | 'Rotate90DegreesCounterclockwise'
  | 'Rotate270DegreesCounterclockwise'

/** 视觉器状态(WinUI RefreshVisualizerState,五态齐全;Web 手势可达四态,Peeking 保留枚举完备性)。 */
export type RefreshVisualizerState = 'Idle' | 'Peeking' | 'Interacting' | 'Pending' | 'Refreshing'

/** stateChanged 事件负载(对应 WinUI RefreshStateChangedEventArgs)。 */
export interface RefreshStateChangedDetail {
  oldState: RefreshVisualizerState
  newState: RefreshVisualizerState
}

/** Deferral 句柄:complete() 后刷新收尾(视觉器回到 Idle)。 */
export interface RefreshDeferralHandle {
  complete(): void
}

/** refreshRequested 事件参数(对应 WinUI RefreshRequestedEventArgs.GetDeferral)。 */
export interface RefreshRequestedArgs {
  getDeferral(): RefreshDeferralHandle
}

/** 视觉器对外注册到宿主容器的 API(容器触发视觉器发出 refreshRequested)。 */
export interface RefreshVisualizerApi {
  raiseRefreshRequested(): void
}

/**
 * RefreshContainer 提供给内嵌 RefreshVisualizer 的宿主契约(provide/inject):
 * 视觉器注入后进入「被宿主驱动」模式——状态 / 拉动比例 / 阈值 / 带高全部来自容器,
 * Deferral 计数合并到容器统一记账(对应 WinUI 中容器持有视觉器 Deferral 的协作关系)。
 */
export interface RefreshVisualizerHost {
  /** 容器状态机的权威状态。 */
  state: Ref<RefreshVisualizerState>
  /** 拉动比例(0..1,拉动距离 / 视觉器带高,交互中实时更新)。 */
  interactionRatio: Ref<number>
  /** 触发阈值(容器 pullThreshold,对应 WinUI ExecutionRatio,默认 0.8)。 */
  threshold: Ref<number>
  /** 拉动方向(当前恒 TopToBottom)。 */
  pullDirection: Ref<RefreshPullDirection>
  /** 视觉器带高 px(实测容器内视觉器宿主元素)。 */
  bandSize: Ref<number>
  /** 取一个容器级 Deferral(视觉器 refreshRequested 的 GetDeferral 落到这里)。 */
  takeDeferral(): RefreshDeferralHandle
  registerVisualizer(api: RefreshVisualizerApi): void
  unregisterVisualizer(): void
  /** 视觉器 requestRefresh() 委托容器统一触发流程。 */
  requestRefresh(): void
}

export const REFRESH_VISUALIZER_HOST: InjectionKey<RefreshVisualizerHost> =
  Symbol('wui-refresh-visualizer-host')
</script>

<script setup lang="ts">
// WinUI RefreshVisualizer 复刻:下拉刷新的经典旋转指示视觉。
// 结构对照源 RefreshVisualizer.xaml 模板(Root Grid,MinHeight=80,Height=100,IsTabStop=False)
// 与 RefreshVisualizer.cpp UpdateContent / ExecuteExecutingRotationAnimation / ExecuteScaleUpAnimation:
//   - Idle/Interacting:指示器透明度 MINIMUM_INDICATOR_OPACITY(0.4);
//   - Interacting:旋转角 = 起始角 + 2π × clamp(ratio/阈值, 0, 1)(拉动全程转一圈),
//     并伴随 (1-阈值) × 带高 × 0.5 的向下游移(源 PARALLAX_POSITION_RATIO);
//   - Pending:透明度 1,300ms 缩放脉冲(中点 1.5 倍,源 ExecuteScaleUpAnimation);
//   - Refreshing:透明度 1,500ms/圈 匀速无限旋转(源 500ms Linear),并停留上述向下游移位;
//   - 默认内容:SymbolIcon(Refresh) 30×30(源 OnApplyTemplate 默认值)。
// 状态机本体在 RefreshContainer(源中由 RefreshInfoProvider + RefreshVisualizer 协作完成),
// 本组件被容器注入驱动;独立使用时仅支持 requestRefresh() 编程触发。
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import WuiSymbolIcon from './SymbolIcon.vue'

defineOptions({ name: 'WuiRefreshVisualizer', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 视觉器状态(独立使用时经 v-model:state 观察/写入;被容器注入驱动时忽略)。 */
    state?: RefreshVisualizerState
    /** 方向(WinUI RefreshVisualizerOrientation):决定起始旋转角,缺省 Auto。 */
    orientation?: RefreshVisualizerOrientation
    /** 带高(WinUI Height),数字按 px;缺省 100(源默认样式),下限 80(源 MinHeight)。 */
    size?: number | string
    /** 指示器前景色(WinUI Foreground);缺省映射 RefreshVisualizerForeground 主题资源(不透明纯黑/纯白)。 */
    foreground?: string
    /** 背景色(WinUI Background);缺省透明(RefreshVisualizerBackground)。 */
    background?: string
  }>(),
  {
    state: 'Idle',
    orientation: 'Auto',
    size: 100,
    foreground: '',
    background: '',
  },
)

const stateModel = defineModel<RefreshVisualizerState>('state', { default: 'Idle' })

const emit = defineEmits<{
  (e: 'refreshRequested', args: RefreshRequestedArgs): void
  (e: 'stateChanged', detail: RefreshStateChangedDetail): void
}>()

// —— 宿主注入:被 RefreshContainer 包含时进入被驱动模式 ——
const host = inject(REFRESH_VISUALIZER_HOST, null)
const hosted = host !== null

const effectiveState = computed<RefreshVisualizerState>(() =>
  hosted && host ? host.state.value : stateModel.value,
)
const interactionRatio = computed<number>(() => (hosted && host ? host.interactionRatio.value : 0))
const threshold = computed<number>(() => (hosted && host ? host.threshold.value : 1))
const bandSize = computed<number>(() => (hosted && host ? host.bandSize.value : parseSize(props.size)))

/** 「100」/「100px」→ 100;非法回退 100(源默认 Height)。 */
function parseSize(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100
}

// —— 状态变化:对外发 stateChanged(对应 WinUI RefreshStateChanged;含被驱动模式)——
watch(effectiveState, (newState, oldState) => {
  emit('stateChanged', { oldState: oldState ?? 'Idle', newState })
})

// —— 起始旋转角(OnOrientationChangedImpl):Auto 按 TopToBottom 取 0 ——
const startRotationDeg = computed<number>(() => {
  switch (props.orientation) {
    case 'Rotate90DegreesCounterclockwise':
      return 90
    case 'Rotate270DegreesCounterclockwise':
      return -90
    default:
      return 0 // Auto / Normal(TopToBottom 与 BottomToTop 同为 0;Web 仅 TopToBottom)
  }
})

// —— 指示器视觉(对照 UpdateContent 的逐态取值)——
const MINIMUM_INDICATOR_OPACITY = 0.4
const PARALLAX_POSITION_RATIO = 0.5

const indicatorOpacity = computed<number>(() => {
  const s = effectiveState.value
  return s === 'Idle' || s === 'Interacting' ? MINIMUM_INDICATOR_OPACITY : 1
})

/** 拉动比例收敛到阈值内的比例(旋转角 / 游移距离都以此为系数,源 Clamp(ratio,0,threshold)/threshold)。 */
const settledRatio = computed<number>(() => {
  const t = threshold.value
  if (t <= 0) return 1
  return Math.min(Math.max(interactionRatio.value / t, 0), 1)
})

/** 指示器纵向游移:Interacting 随拉动比例、Refreshing 停留在 (1-阈值)×带高×0.5。 */
const indicatorTranslateY = computed<number>(() => {
  const s = effectiveState.value
  const travel = (1 - threshold.value) * bandSize.value * PARALLAX_POSITION_RATIO
  if (s === 'Interacting') return travel * settledRatio.value
  if (s === 'Refreshing') return travel
  return 0
})

/** 内层旋转角:Interacting 转到 起始角+360°×settledRatio;其余态回起始角(Refreshing 交给旋转动画)。 */
const rotatorRotationDeg = computed<number>(() => {
  if (effectiveState.value === 'Interacting') {
    return startRotationDeg.value + settledRatio.value * 360
  }
  return startRotationDeg.value
})

const indicatorStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {
    opacity: indicatorOpacity.value,
    transform: `translateY(${indicatorTranslateY.value}px)`,
  }
  if (props.foreground) style.color = props.foreground
  return style
})

const rotatorStyle = computed<Record<string, string>>(() => ({
  transform: `rotate(${rotatorRotationDeg.value}deg)`,
  // 自转动画的起始角(KeyFrame 内 var 引用),保证非 0 起始角(orientation 旋转档)不跳变
  '--wui-refreshviz-start-rotation': `${startRotationDeg.value}deg`,
}))

// —— Pending 缩放脉冲:类开关重触发(300ms,源 ExecuteScaleUpAnimation)——
const popping = ref(false)
let poppingTimer: number | null = null

watch(effectiveState, (state) => {
  if (poppingTimer !== null) {
    window.clearTimeout(poppingTimer)
    poppingTimer = null
  }
  if (state === 'Pending') {
    // 先摘类再下一帧挂回,保证连续两次进入 Pending 也能重新播放
    popping.value = false
    window.requestAnimationFrame(() => {
      popping.value = true
      poppingTimer = window.setTimeout(() => {
        popping.value = false
        poppingTimer = null
      }, 300)
    })
  } else {
    popping.value = false
  }
})

// —— 对外 API ——

/** 对照 WinUI RequestRefresh():进入 Refreshing 并发 refreshRequested;正在刷新时忽略。 */
function requestRefresh(): void {
  if (hosted && host) {
    host.requestRefresh()
    return
  }
  if (stateModel.value === 'Refreshing') return
  stateModel.value = 'Refreshing'
  raiseRefreshRequested()
}

/** 发 refreshRequested。hosted:Deferral 记账到容器;独立:自持计数,释放后回 Idle。 */
function raiseRefreshRequested(): void {
  if (hosted && host) {
    emit('refreshRequested', { getDeferral: () => host.takeDeferral() })
    return
  }

  let pending = 0
  let released = false
  const release = (): void => {
    if (released) return
    released = true
    if (stateModel.value === 'Refreshing') stateModel.value = 'Idle'
  }
  emit('refreshRequested', {
    getDeferral: () => {
      pending += 1
      return {
        complete: () => {
          pending -= 1
          if (pending <= 0) release()
        },
      }
    },
  })
  // 事件派发完毕无人取 Deferral → 立即完成(WinUI 无 Deferral 时同语义)
  if (pending === 0) release()
}

// —— 宿主注册 / 注销 ——
onMounted(() => {
  if (hosted && host) host.registerVisualizer({ raiseRefreshRequested })
})

onBeforeUnmount(() => {
  if (poppingTimer !== null) window.clearTimeout(poppingTimer)
  if (hosted && host) host.unregisterVisualizer()
})

defineExpose({
  /** 对照 WinUI RequestRefresh()。 */
  requestRefresh,
})
</script>

<template>
  <!-- 结构对照源 RefreshVisualizer.xaml:Root Grid(MinHeight 80)承载指示器;指示器双层
       (外层游移+透明度,内层旋转)以分离「随拉位移」与「旋转/自转动画」两个通道 -->
  <div
    v-bind="$attrs"
    class="wui-refreshviz"
    :data-state="effectiveState"
    :style="{ height: typeof size === 'number' ? `${size}px` : size, background: background || undefined }"
  >
    <div class="wui-refreshviz__indicator" :class="{ 'is-popping': popping }" :style="indicatorStyle">
      <div
        class="wui-refreshviz__rotator"
        :class="{ 'is-spinning': effectiveState === 'Refreshing' }"
        :style="rotatorStyle"
      >
        <!-- 默认内容对照源 OnApplyTemplate:SymbolIcon(Refresh) 30×30 -->
        <slot>
          <WuiSymbolIcon symbol="Refresh" :font-size="30" />
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wui-refreshviz {
  /* 源默认样式:Height=100(prop 控制)/ MinHeight=80 / IsTabStop=False / Background 透明;
     横向铺满 = 源 RefreshVisualizerPresenter HorizontalAlignment=Stretch(FAIL-PTR-1:带宽 =
     容器宽,指示器随之水平居中),flex 宿主中 width:100% 覆盖主轴收缩 */
  min-height: 80px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: var(--wui-refresh-visualizer-foreground); /* RefreshVisualizerForeground:Light #000000 / Dark #FFFFFF(不透明源实值,FAIL-PTR-2) */
}

.wui-refreshviz__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    opacity var(--wui-duration-fast) var(--wui-easing-standard),
    transform var(--wui-duration-fast) var(--wui-easing-standard);
}

.wui-refreshviz__rotator {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 拉动旋转随指针逐帧更新,不加过渡;Pending→其他态回起始角时借容器归位过渡的节奏 */
}

/* Refreshing:500ms/圈 匀速无限自转(源 ExecuteExecutingRotationAnimation,Linear + Forever);
   动画期间覆盖内联 rotate,回到其他态后自动失效 */
.wui-refreshviz__rotator.is-spinning {
  animation: wui-refreshviz-spin 500ms linear infinite;
}

@keyframes wui-refreshviz-spin {
  from {
    transform: rotate(var(--wui-refreshviz-start-rotation, 0deg));
  }
  to {
    transform: rotate(calc(var(--wui-refreshviz-start-rotation, 0deg) + 360deg));
  }
}

/* Pending:300ms 缩放脉冲(中点 1.5 倍,源 ExecuteScaleUpAnimation) */
.wui-refreshviz__indicator.is-popping {
  animation: wui-refreshviz-pop 300ms var(--wui-easing-standard);
}

@keyframes wui-refreshviz-pop {
  0% {
    scale: 1;
  }
  50% {
    scale: 1.5;
  }
  100% {
    scale: 1;
  }
}

/* 无障碍:减弱动态时停止自转与脉冲(站点既有约定,ProgressRing 同口径) */
@media (prefers-reduced-motion: reduce) {
  .wui-refreshviz__rotator.is-spinning,
  .wui-refreshviz__indicator.is-popping {
    animation: none;
  }
}
</style>
