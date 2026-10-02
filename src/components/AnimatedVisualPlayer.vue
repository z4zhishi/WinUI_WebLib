<script lang="ts">
// AnimatedVisualPlayer(WinUI AnimatedVisualPlayer 迁移):类型、事件参数与内置降级动画对外导出,
// 供使用方与示例页引用。渲染层引入唯一外部依赖 lottie-web(已登记 docs/tools.md,
// CK/WinUI-Gallery 官方示例的 Lottie-Windows 产物为 C# codegen,Web 以 lottie-web 播放
// 同源的 Lottie JSON 等价替代,选型见 wiki/controls/AnimatedVisualPlayer.md)。
import type {
  AnimationItem,
} from 'lottie-web'

/** 播放状态:WinUI 仅 IsPlaying 属性,Web 拆为三态承载 IsPlaying / IsPaused / IsStopped 语义。 */
export type AnimatedVisualPlaybackState = 'stopped' | 'playing' | 'paused'

/**
 * 源类型(对应 WinUI IAnimatedVisualSource 的 Web 分层):
 * - `string`:Lottie JSON 的 https URL(组件自行 fetch;失败走 `loadError` + fallback 插槽);
 * - `object`:Lottie JSON 对象(lottie-web `animationData`,组件传入前会深拷贝,不会污染调用方数据);
 * - `null`:无源,渲染 `fallback` 插槽(对应 WinUI FallbackContent)。
 * 注:CK 仓库 AnimatedVisuals/* 为 LottieGen 生成的 C# 类,不可直接作为 JSON 使用。
 */
export type AnimatedVisualPlayerSource = string | object | null

/** 拉伸方式(WinUI Stretch,作用于源动画在控件内的适配)。 */
export type AnimatedVisualPlayerStretch = 'Uniform' | 'UniformToFill' | 'Fill' | 'None'

/** loaded 事件参数(动画源装载完成,等价 WinUI IsAnimatedVisualLoaded → true 时刻)。 */
export interface AnimatedVisualPlayerLoadedEventArgs {
  /** 动画时长(秒,取自 Lottie JSON 的 op-ip 除以 fr;等价 WinUI Duration)。 */
  duration: number
}

/** completed 事件参数(一次 Play 的播放区间自然播完;lottie 'complete')。 */
export interface AnimatedVisualPlayerCompletedEventArgs {
  /** 本次播放起始进度(WinUI PlayAsync fromProgress,0–1)。 */
  from: number
  /** 本次播放结束进度(WinUI PlayAsync toProgress,0–1)。 */
  to: number
  /** 本次播放是否区间循环(WinUI PlayAsync looped)。 */
  looped: boolean
}

/** loadError 事件参数(Web 扩展:URL 源 fetch / 解析失败;WinUI 无对应,动画创建失败走 FallbackContent)。 */
export interface AnimatedVisualPlayerLoadErrorEventArgs {
  /** 加载失败的 URL。 */
  source: string
  /** 失败原因(fetch 异常消息 / HTTP 状态 / JSON 解析错误)。 */
  message: string
}

/** fallback 插槽作用域:降级原因。 */
export interface AnimatedVisualPlayerFallbackScope {
  /** 'no-source' = source 为 null;'load-error' = URL 源加载 / 解析失败。 */
  reason: 'no-source' | 'load-error'
}

/**
 * 内置降级动画(WUI Pulse):离线可用的最小合法 Lottie JSON —— 外环弧线(trim path + 线性旋转)
 * + 内核圆点(脉冲缩放 / 透明度),300 帧率 60fps 共 1.5s。颜色为 Lottie 数据内烘焙值
 * (Lottie 无法引用 CSS 变量),取 WinUI SystemAccentColor #0078D4;供示例页在 URL 源
 * 网络加载失败时降级使用,亦可直接作为 source 传入。
 */
export const WUI_BUILTIN_LOTTIE_ANIMATION: object = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 90,
  w: 120,
  h: 120,
  nm: 'WuiPulse',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'arc',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: {
          a: 1,
          k: [
            {
              t: 0,
              s: [0],
              i: { x: [0.333], y: [0.333] },
              o: { x: [0.333], y: [0.333] },
            },
            { t: 90, s: [360] },
          ],
        },
        p: { a: 0, k: [60, 60, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'arc-group',
          it: [
            { ty: 'el', d: 1, s: { a: 0, k: [80, 80] }, p: { a: 0, k: [0, 0] }, nm: 'ellipse' },
            {
              ty: 'tm',
              s: { a: 0, k: 0 },
              e: { a: 0, k: 30 },
              o: { a: 0, k: 0 },
              m: 1,
              nm: 'trim',
            },
            {
              ty: 'st',
              c: { a: 0, k: [0, 0.4706, 0.8314, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 10 },
              lc: 2,
              lj: 1,
              nm: 'stroke',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
        },
      ],
      ip: 0,
      op: 90,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'core',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            {
              t: 0,
              s: [100],
              i: { x: [0.4], y: [0] },
              o: { x: [0.6], y: [1] },
            },
            {
              t: 45,
              s: [40],
              i: { x: [0.4], y: [0] },
              o: { x: [0.6], y: [1] },
            },
            { t: 90, s: [100] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [60, 60, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            {
              t: 0,
              s: [100, 100, 100],
              i: { x: [0.4], y: [0] },
              o: { x: [0.6], y: [1] },
            },
            {
              t: 45,
              s: [140, 140, 100],
              i: { x: [0.4], y: [0] },
              o: { x: [0.6], y: [1] },
            },
            { t: 90, s: [100, 100, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          nm: 'core-group',
          it: [
            { ty: 'el', d: 1, s: { a: 0, k: [36, 36] }, p: { a: 0, k: [0, 0] }, nm: 'ellipse' },
            { ty: 'fl', c: { a: 0, k: [0, 0.4706, 0.8314, 1] }, o: { a: 0, k: 100 }, nm: 'fill' },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
        },
      ],
      ip: 0,
      op: 90,
      st: 0,
      bm: 0,
    },
  ],
}

/** Stretch → SVG preserveAspectRatio 映射(WinUI Stretch 语义 → SVG 适配语义)。 */
export const STRETCH_TO_PRESERVE_ASPECT_RATIO: Record<AnimatedVisualPlayerStretch, string> = {
  Uniform: 'xMidYMid meet',
  UniformToFill: 'xMidYMid slice',
  Fill: 'none',
  None: 'xMinYMin meet',
}

/** lottie-web 动画实例类型再导出(示例页 / 使用方类型标注用)。 */
export type { AnimationItem }
</script>

<script setup lang="ts">
// AnimatedVisualPlayer —— WinUI AnimatedVisualPlayer 的 Web 复刻(lottie-web 渲染层)。
// API 面对照 CK/WinUI-Reference/controls/dev/AnimatedVisualPlayer/AnimatedVisualPlayer.idl:
//   - 属性:Source / AutoPlay / PlaybackRate / IsPlaying / Duration(idl 另有 Stretch、
//     IsAnimatedVisualLoaded;IsPaused / IsStopped 为任务面要求,Web 以三态状态机承载);
//   - 方法:PlayAsync(from, to, looped) → play(from?, to?, looped?)、Pause、Resume、
//     SetProgress、Stop(defineExpose,对应 ISelfPlayingAnimatedVisual);
//   - 事件:WinUI 控件无业务事件,loaded / completed 为任务面要求,stateChanged /
//     progressChanged / loadError 为 Web 扩展(见上类型注释)。
// 视觉:控件在 generic.xaml 中没有 ControlTemplate(idl 直承 FrameworkElement,视觉全部来自
// 源动画 + FallbackContent),Web 根元素同样无外观,默认收缩到源动画自然尺寸,可经
// attrs(class/style)显式给定尺寸;FallbackContent 映射为 `fallback` 作用域插槽。
// 映射:lottie play/pause/stop/setSpeed/setDirection/setLoop/playSegments/goToAnd*,
// progress = currentFrame / totalFrames(WinUI progress 0–1 语义)。
// 无障碍:动效图形,role="img",可访问名经 attrs 的 aria-label 提供(同 AnimatedVisualPlayerAutomationPeer)。
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { prefersReducedMotion } from '../composables/useReducedMotion'
import lottie from 'lottie-web'

defineOptions({ name: 'WuiAnimatedVisualPlayer', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 源:Lottie JSON URL(https)/ Lottie JSON 对象 / null(渲染 fallback 插槽)。 */
    source?: AnimatedVisualPlayerSource
    /** 装载完成后自动播放(WinUI AutoPlay,默认 true;prefers-reduced-motion 时不自动起播)。 */
    autoPlay?: boolean
    /**
     * 播放倍率(WinUI PlaybackRate,实时生效):绝对值为速率,负值倒放
     * (官方示例 Reverse 即 -1;实时性:播放中修改立即生效,与 WinUI "live" 语义一致)。
     */
    playbackRate?: number
    /** 拉伸方式(WinUI Stretch,默认 Uniform)。 */
    stretch?: AnimatedVisualPlayerStretch
  }>(),
  {
    source: null,
    autoPlay: true,
    playbackRate: 1,
    stretch: 'Uniform',
  },
)

const emit = defineEmits<{
  /** 动画源装载完成(IsAnimatedVisualLoaded → true 时刻;URL 源 fetch 成功且动画实例创建后触发)。 */
  loaded: [event: AnimatedVisualPlayerLoadedEventArgs]
  /** 播放区间自然播完(Stop / Pause 不触发;循环播放时每圈结束各触发一次)。 */
  completed: [event: AnimatedVisualPlayerCompletedEventArgs]
  /** 播放状态变化(Web 扩展:WinUI 以 IsPlaying 等属性逐一通知)。 */
  stateChanged: [state: AnimatedVisualPlaybackState]
  /** 播放进度变化(Web 扩展:0–1,每渲染帧触发;对应 WinUI ProgressObject 的 Web 简化)。 */
  progressChanged: [progress: number]
  /** URL 源加载失败(Web 扩展;触发后渲染 fallback 插槽)。 */
  loadError: [event: AnimatedVisualPlayerLoadErrorEventArgs]
}>()

// —— DOM / 动画实例 ——
const containerRef = ref<HTMLDivElement | null>(null)
let anim: AnimationItem | null = null

// —— 播放状态机(三态互斥)+ 只读状态(idl IsPlaying / 任务面 IsPaused / IsStopped)——
const playbackState = ref<AnimatedVisualPlaybackState>('stopped')
const isPlaying = computed(() => playbackState.value === 'playing')
const isPaused = computed(() => playbackState.value === 'paused')
const isStopped = computed(() => playbackState.value === 'stopped')

function setState(next: AnimatedVisualPlaybackState): void {
  if (playbackState.value === next) return
  playbackState.value = next
  emit('stateChanged', next)
}

// —— 装载状态 / 源数据 ——
/** IsAnimatedVisualLoaded:动画实例已创建且 DOM 就绪。 */
const isLoaded = ref(false)
/** fallback 插槽可见性:no-source(source 为 null)/ load-error(URL 源失败)。 */
const fallbackReason = ref<AnimatedVisualPlayerFallbackScope['reason'] | null>(null)

// —— 播放元数据 ——
/** 动画时长(秒;WinUI Duration,缺省 0 表示无已装载源)。 */
const duration = ref(0)
/** 播放进度 0–1(WinUI SetProgress / ProgressObject 的 Web 简化,随渲染帧推进)。 */
const progress = ref(0)
/** 最近一次 play() 的区间参数(completed 事件载荷来源;缺省即 PlayAsync(0, 1, false) 语义)。 */
let lastPlay: AnimatedVisualPlayerCompletedEventArgs = { from: 0, to: 1, looped: false }

// —— prefers-reduced-motion:动画环境不支持自动播放时不自动起播(用户手动 Play 不受限)
//    (MR3/B8:改用共享工具,替代本组件裸 matchMedia)——
const reducedMotion = prefersReducedMotion()

/** 把 Lottie JSON 深拷贝:lottie-web 会原地改写 animationData,不能把调用方对象交给它。 */
function cloneAnimationData(data: object): object {
  return JSON.parse(JSON.stringify(data)) as object
}

// —— 倍率:绝对值 → setSpeed,符号 → setDirection(WinUI PlaybackRate 允许负值倒放)——
function applyPlaybackRate(): void {
  if (!anim) return
  const rate = Number.isFinite(props.playbackRate) ? props.playbackRate : 1
  anim.setSpeed(Math.abs(rate))
  anim.setDirection(rate < 0 ? -1 : 1)
}

// —— 拉伸:写 lottie 生成的 <svg> preserveAspectRatio 属性(WinUI Stretch → SVG 适配)——
function applyStretch(): void {
  const svg = containerRef.value?.querySelector('svg')
  svg?.setAttribute('preserveAspectRatio', STRETCH_TO_PRESERVE_ASPECT_RATIO[props.stretch])
}

// —— 事件回调(lottie)——
function onDomLoaded(): void {
  if (!anim) return
  isLoaded.value = true
  duration.value = anim.getDuration()
  applyStretch()
  emit('loaded', { duration: duration.value })
  // AutoPlay 起播放在 DOMLoaded 之后,保证 playSegments 不早于装载(等价 WinUI AutoPlay=true)
  if (props.autoPlay && !reducedMotion) {
    play()
  }
}

function onComplete(): void {
  setState('stopped')
  emit('completed', { ...lastPlay })
}

function onEnterFrame(event: { currentTime: number }): void {
  const total = anim?.totalFrames ?? 0
  const value = total > 0 ? event.currentTime / total : 0
  progress.value = Math.min(Math.max(value, 0), 1)
  emit('progressChanged', progress.value)
}

// —— 装载入口 ——
function createFromData(data: object): void {
  const container = containerRef.value
  if (!container) return
  // 自然尺寸取自 Lottie JSON 的 w / h(等价 WinUI 无显式尺寸时的 DesiredSize 语义)
  const dims = data as { w?: unknown; h?: unknown }
  const width = typeof dims.w === 'number' && dims.w > 0 ? dims.w : 0
  const height = typeof dims.h === 'number' && dims.h > 0 ? dims.h : 0
  naturalSize.value = width > 0 && height > 0 ? { width, height } : null
  anim = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: data,
  })
  anim.addEventListener('DOMLoaded', onDomLoaded)
  anim.addEventListener('complete', onComplete)
  anim.addEventListener('enterFrame', onEnterFrame)
  applyPlaybackRate()
  applyStretch()
}

/** URL 源装载;失败 → loadError + fallback 插槽(官方示例的 Image 降级语义)。 */
async function loadFromUrl(url: string): Promise<void> {
  const token = ++loadToken
  try {
    const response = await fetch(url, { mode: 'cors' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as object
    if (token !== loadToken || !containerRef.value) return
    createFromData(data)
  } catch (error) {
    if (token !== loadToken || !containerRef.value) return
    fallbackReason.value = 'load-error'
    emit('loadError', {
      source: url,
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

/** 装载令牌:URL 异步返回前源又变更 / 组件卸载时丢弃过期装载。 */
let loadToken = 0

/** 源动画自然尺寸(Lottie JSON 的 w×h;WinUI DesiredSize 的 Web 等价,未装载为 null)。 */
const naturalSize = ref<{ width: number; height: number } | null>(null)

/** 源 → 动画实例:先销毁旧实例再按源类型分派。 */
function reload(): void {
  destroyAnim()
  const source = props.source
  if (source === null) {
    fallbackReason.value = 'no-source'
    return
  }
  fallbackReason.value = null
  if (typeof source === 'string') {
    loadFromUrl(source)
  } else {
    createFromData(cloneAnimationData(source))
  }
}

function destroyAnim(): void {
  loadToken++
  if (anim) {
    anim.removeEventListener('DOMLoaded', onDomLoaded)
    anim.removeEventListener('complete', onComplete)
    anim.removeEventListener('enterFrame', onEnterFrame)
    anim.destroy()
    anim = null
  }
  isLoaded.value = false
  duration.value = 0
  progress.value = 0
  naturalSize.value = null
  lastPlay = { from: 0, to: 1, looped: false }
  setState('stopped')
  // 容器内残留的 lottie <svg> 一并清除(destroy 已移除,防御 URL 竞态下的孤儿节点)
  if (containerRef.value) containerRef.value.replaceChildren()
}

// —— 播放控制(WinUI ISelfPlayingAnimatedVisual 方法面;expose 供使用方命令式调用)——

/**
 * 播放(WinUI PlayAsync(fromProgress, toProgress, looped) 的同步化):
 * 区间以进度 0–1 给出;looped=true 时区间内循环(completed 每圈结束各触发一次)。
 */
function play(from = 0, to = 1, looped = false): void {
  if (!anim) return
  const total = anim.totalFrames
  if (total <= 0) return
  const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1)
  const fromFrame = clamp01(from) * total
  const toFrame = clamp01(to) * total
  if (Math.abs(toFrame - fromFrame) < 0.0001) {
    // 退化区间(逐帧拖动):仅定位,不进入播放态
    anim.goToAndStop(toFrame, true)
    setState('stopped')
    return
  }
  lastPlay = { from: clamp01(from), to: clamp01(to), looped }
  anim.setLoop(looped)
  anim.playSegments([[fromFrame, toFrame]], true)
  setState('playing')
}

/** 暂停(WinUI Pause:冻结当前帧,不使 PlayAsync 完成)。 */
function pause(): void {
  if (!anim || !isPlaying.value) return
  anim.pause()
  setState('paused')
}

/** 恢复(WinUI Resume:继续当前播放区间)。 */
function resume(): void {
  if (!anim || !isPaused.value) return
  anim.play()
  setState('playing')
}

/** 停止(WinUI Stop:结束当前 PlayAsync 并回到首帧)。 */
function stop(): void {
  if (!anim) return
  anim.stop()
  setState('stopped')
}

/**
 * 设置播放进度(WinUI SetProgress,0–1):播放中从该进度继续,静止时定位到该帧。
 */
function setProgress(value: number): void {
  if (!anim) return
  const total = anim.totalFrames
  if (total <= 0) return
  const frame = Math.min(Math.max(value, 0), 1) * total
  if (isPlaying.value) {
    anim.goToAndPlay(frame, true)
  } else {
    anim.goToAndStop(frame, true)
    progress.value = Math.min(Math.max(value, 0), 1)
    emit('progressChanged', progress.value)
  }
}

// —— 属性联动 ——
watch(
  () => props.playbackRate,
  () => applyPlaybackRate(),
)

watch(
  () => props.stretch,
  () => applyStretch(),
)

watch(
  () => props.source,
  () => {
    if (containerRef.value) reload()
  },
)

onMounted(() => {
  reload()
})

onBeforeUnmount(() => {
  destroyAnim()
})

// —— 自然尺寸:无源 / 未装载时收缩为 0,装载后取 Lottie JSON 的 w×h(等价 WinUI DesiredSize);
// 调用方经 attrs 给定 root 显式尺寸时,容器的 max-width/max-height:100% 将其钳制到 root(见样式)。 ——
const containerInlineStyle = computed<CSSProperties>(() =>
  naturalSize.value !== null
    ? { width: `${naturalSize.value.width}px`, height: `${naturalSize.value.height}px` }
    : { width: '0px', height: '0px' },
)

defineExpose({
  /** 播放(WinUI PlayAsync 同步化)。 */
  play,
  /** 暂停(WinUI Pause)。 */
  pause,
  /** 恢复(WinUI Resume)。 */
  resume,
  /** 停止(WinUI Stop)。 */
  stop,
  /** 设置进度 0–1(WinUI SetProgress)。 */
  setProgress,
  /** IsPlaying(ref,实时)。 */
  isPlaying,
  /** IsPaused(ref,实时)。 */
  isPaused,
  /** IsStopped(ref,实时)。 */
  isStopped,
  /** 播放状态三态(ref,'stopped' | 'playing' | 'paused')。 */
  playbackState,
  /** 动画时长(秒,WinUI Duration;无源时 0)。 */
  duration,
  /** 播放进度 0–1(ref,随渲染帧推进)。 */
  progress,
  /** IsAnimatedVisualLoaded(ref,动画实例就绪)。 */
  isLoaded,
})
</script>

<template>
  <div v-bind="$attrs" class="wui-animatedvisualplayer" role="img">
    <!-- lottie 渲染容器:装载前 0×0 收缩,装载后取源自然尺寸;root 有显式尺寸时 100% 填充 -->
    <div ref="containerRef" class="wui-animatedvisualplayer__visual" :style="containerInlineStyle" />
    <!-- FallbackContent(WinUI DataTemplate)→ fallback 作用域插槽:no-source / load-error -->
    <div v-if="fallbackReason !== null" class="wui-animatedvisualplayer__fallback">
      <slot name="fallback" :reason="fallbackReason" />
    </div>
  </div>
</template>

<style scoped>
.wui-animatedvisualplayer {
  /* 控件本体无外观(generic.xaml 无 ControlTemplate):尺寸默认收缩到源自然大小 */
  position: relative;
  display: inline-block;
  overflow: hidden;
  max-width: 100%;
  max-height: 100%;
}

.wui-animatedvisualplayer__visual {
  position: relative;
  /* 装载后的自然尺寸经内联 style 注入;root 被显式定尺寸时以 100% 填充 */
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  line-height: 0;
}

.wui-animatedvisualplayer__visual :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.wui-animatedvisualplayer__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
