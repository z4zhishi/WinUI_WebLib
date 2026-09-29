<script lang="ts">
// ProgressRing(WinUI ProgressRing 迁移):类型与事件参数对外导出,供使用方与示例页引用。
/** valueChanged 事件参数(对应 WinUI RangeBaseValueChangedEventArgs 的常用字段)。 */
export interface ProgressRingValueChangedEventArgs {
  oldValue: number
  newValue: number
}
</script>

<script setup lang="ts">
// WinUI ProgressRing 复刻。视觉对照源:
//   模板/样式:CK/WinUI-Reference/controls/dev/ProgressRing/ProgressRing.xaml(Style TargetType="ProgressRing"
//   —— 注意该控件模板不在 generic.xaml,与 ProgressBar 同类);主题资源:同目录
//   ProgressRing_themeresources.xaml(Foreground = AccentFillColorDefaultBrush,
//   Background = ControlFillColorTransparentBrush;ProgressRingStrokeThickness=4 为 WUXC 兼容遗留,
//   新模板未引用)。控件逻辑对照源 ProgressRing.cpp / ProgressRing.idl:
//   CommonStates 三态 —— Active(IsIndeterminate=true,2s Lottie 循环)/ DeterminateActive(静态弧)/
//   Inactive(IsActive=false,LayoutRoot.Opacity=0 + 播放器 Stop + Automation 视图 Raw);
//   属性默认 IsActive=true、IsIndeterminate=true、Value=0、Minimum=0、Maximum=100;
//   默认 Width/Height=32、MinWidth/MinHeight=16;IsHitTestVisible=false、IsTabStop=false(非交互)。
// 动画按 Lottie 源(AnimatedVisuals/ProgressRingIndeterminate.cpp)1:1 转写为 CSS 关键帧:
//   2s 无限循环;容器旋转 0→450°→900°(每段 KeySpline 0.167,0.167,0.833,0.833 → cubic-bezier);
//   弧长前半程 TrimEnd 0.0001→0.5(起点锚定)、后半程 TrimStart 0→0.5(终点锚定,尾追头);
//   SVG 以 pathLength=100 的 stroke-dasharray / stroke-dashoffset 等价实现,端帽 Round;
//   900°(2.5 圈)使循环末尾的小圆点回到起点位置,循环无缝。
// 确定态按源 Determinate Lottie 的 TrimEnd≈progress 线性映射:弧长 = (value-min)/(max-min) × 周长。
// 无障碍对照源 ProgressRingAutomationPeer.cpp:role="progressbar"(AutomationControlType.ProgressBar);
//   确定态提供 RangeValue(输出 aria-valuemin/max/now),不确定态不提供(不报值,WAI-ARIA:进度未知);
//   激活 + 不确定时可访问名前缀本地化状态串(en-US 为 "Busy",SR_ProgressRingIndeterminateStatus);
//   未激活时整体移出可访问性树(源 AccessibilityView=Raw → aria-hidden)。
import { computed, useAttrs, watch } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiProgressRing' })

const props = withDefaults(
  defineProps<{
    /** 最大值(WinUI Maximum)。 */
    maximum?: number
    /** 不确定态(WinUI IsIndeterminate,默认 true):2s 旋转弧动画,不反映具体进度。 */
    isIndeterminate?: boolean
    /** 激活态(WinUI IsActive,默认 true):false 时圆环隐藏(opacity 0)并停止动画(源 Inactive 态)。 */
    isActive?: boolean
    /** 最小值(WinUI Minimum)。 */
    minimum?: number
    /** 直径 px(WinUI 用 Width/Height 控制,此处合并为单一 size);下限 16(源 MinWidth/MinHeight)。 */
    size?: number
    /** 弧颜色(WinUI Foreground,CSS 颜色值;缺省用主题 AccentFillColorDefaultBrush 对应 token)。 */
    foreground?: string
    /** 轨道圆颜色(WinUI Background,CSS 颜色值;源 Lottie 的 Background 着色轨道圆,缺省透明)。 */
    background?: string
  }>(),
  {
    maximum: 100,
    isIndeterminate: true,
    isActive: true,
    minimum: 0,
    size: 32,
    foreground: '',
    background: '',
  },
)

const emit = defineEmits<{
  /** 值变化时触发(程序赋值/钳制重算同样触发,与 WinUI ValueChanged 语义一致)。 */
  valueChanged: [event: ProgressRingValueChangedEventArgs]
}>()

/** 当前值(WinUI Value,双向)。 */
const value = defineModel<number>({ default: 0 })

// —— 有效取值范围(同 ProgressBar 口径:maximum < minimum 时收敛为相同值,区间塌缩) ——
const effMin = computed(() => props.minimum)
const effMax = computed(() => Math.max(props.maximum, props.minimum))

/** 把任意值钳制到 [effMin, effMax];非有限值按最小值处理(源 CoerceValue 的越界钳制语义)。 */
function clampValue(raw: number): number {
  if (!Number.isFinite(raw)) return effMin.value
  return Math.min(Math.max(raw, effMin.value), effMax.value)
}

// WinUI RangeBase 在 Minimum/Maximum 变化时把 Value 重新钳制入区间(挂载时同样生效);
// 钳制引发的变化经下方 watch 统一触发 valueChanged(与 WinUI 一致)。
watch(
  [effMin, effMax],
  () => {
    const coerced = clampValue(value.value)
    if (!Object.is(coerced, value.value)) value.value = coerced
  },
  { immediate: true },
)

// value 的任何变化(双向回写/外部赋值/钳制)都触发 valueChanged。
watch(value, (newValue, oldValue) => {
  emit('valueChanged', { oldValue: oldValue ?? 0, newValue })
})

/** 渲染与 aria 用的当前值(钳制后,保证显示与视觉一致)。 */
const displayValue = computed(() => clampValue(value.value))

/** 0..1 进度;区间塌缩(maximum ≈ minimum)时为 0(防御源除零,同 ProgressBar 口径)。 */
const ratio = computed(() => {
  const span = effMax.value - effMin.value
  if (!(span > Number.EPSILON)) return 0
  return Math.min(Math.max((displayValue.value - effMin.value) / span, 0), 1)
})

// —— 源 CommonStates 三态(ProgressRing.cpp UpdateStates):Active / DeterminateActive / Inactive ——
const stateClass = computed(() => (props.isActive ? 'wui-progressring--active' : 'wui-progressring--inactive'))
const modeClass = computed(() => (props.isIndeterminate ? 'wui-progressring--indeterminate' : 'wui-progressring--determinate'))

/** 确定态(且激活)才输出取值:源 AutomationPeer 在不确定态不提供 RangeValue pattern。 */
const reportValues = computed(() => props.isActive && !props.isIndeterminate)

/** 未激活时整体移出可访问性树(源 SetAccessibilityView(Raw) → aria-hidden)。 */
const ariaHidden = computed(() => (props.isActive ? undefined : 'true'))

const attrs = useAttrs()

// 源 GetNameCore:激活 + 不确定时在可访问名前拼接本地化状态串(en-US 为 "Busy")。
const ariaLabel = computed<string | undefined>(() => {
  const raw = attrs['aria-label']
  const label = typeof raw === 'string' ? raw : ''
  if (label === '') return undefined
  return props.isActive && props.isIndeterminate ? `Busy ${label}` : label
})

// 直径:源默认 Width/Height=32,MinWidth/MinHeight=16(下限钳制);非有限值回退默认 32。
const sizeStyle = computed<CSSProperties>(() => {
  const size = Number.isFinite(props.size) ? Math.max(16, props.size) : 32
  return { width: `${size}px`, height: `${size}px` }
})

// 调用方显式给色时以局部变量覆盖默认 token(Foreground → 弧,Background → 轨道圆,与源 Lottie 同语义)。
const colorStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {}
  if (props.foreground !== '') style['--wui-progressring-foreground'] = props.foreground
  if (props.background !== '') style['--wui-progressring-background'] = props.background
  return style
})

// 确定态弧长:pathLength=100 归一化,弧段 = ratio×100;ratio=0 时保留 0.1 的极小弧段
// (源 TrimEnd 初值 0.0001,配合圆帽呈现为起点处的小圆点)。不确定态返回 undefined,
// dasharray 交给 sweep 关键帧接管,避免内联样式与动画打架。
const arcStyle = computed<CSSProperties | undefined>(() => {
  if (!props.isActive || props.isIndeterminate) return undefined
  const arc = Math.max(ratio.value * 100, 0.1)
  return { strokeDasharray: `${arc} ${100 - arc}`, strokeDashoffset: '0' }
})
</script>

<template>
  <div
    v-bind="$attrs"
    class="wui-progressring"
    :class="[stateClass, modeClass]"
    :style="[sizeStyle, colorStyle]"
    role="progressbar"
    :aria-label="ariaLabel"
    :aria-hidden="ariaHidden"
    :aria-valuemin="reportValues ? effMin : undefined"
    :aria-valuemax="reportValues ? effMax : undefined"
    :aria-valuenow="reportValues ? displayValue : undefined"
  >
    <!-- 源 AnimatedVisualPlayer(Stretch=fill)→ 归一化 SVG:viewBox 80×80,
         几何取不确定态 Lottie(半径 7×5=35、描边 1.5×5=7.5),随直径等比缩放(环厚随动) -->
    <svg class="wui-progressring__svg" viewBox="0 0 80 80" aria-hidden="true" focusable="false">
      <!-- 轨道圆:源 SpriteShape_0,颜色 = Background(默认 ControlFillColorTransparentBrush,透明) -->
      <circle class="wui-progressring__track" cx="40" cy="40" r="35" />
      <!-- 旋转容器:源 ContainerShape 的 RotationAngleInDegrees 0→450→900 -->
      <g class="wui-progressring__arc-group">
        <!-- 弧:不确定态按 TrimStart/TrimEnd 关键帧扫动;确定态按值静态;pathLength=100 归一化 -->
        <circle class="wui-progressring__arc" cx="40" cy="40" r="35" pathLength="100" :style="arcStyle" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* ======================================================================
 * 颜色变量:ProgressRing 的主题资源位于 controls/dev/ProgressRing/ProgressRing_themeresources.xaml
 * (generic.xaml 无此控件的 Style/Template),theme.css 未生成 --wui-progressring-* token,
 * 故按源值在组件内承载(浅/深两套,差异说明见 wiki/controls/ProgressRing.md):
 *   Foreground = AccentFillColorDefaultBrush(浅 = SystemAccentColorDark1,深 = SystemAccentColorLight2,
 *               经 theme-hooks.css 的系统色钩子,未定义时回退站点约定色)
 *   Background = ControlFillColorTransparentBrush(透明)
 * 几何常量(源不确定态 Lottie 归一化):viewBox 80×80、半径 35、描边 7.5
 *   (默认直径 32px 下 ≈ 28px 环径、3px 环厚;SVG viewBox 缩放使环厚随直径等比随动,
 *   与源 AnimatedVisualPlayer Stretch=fill 的矢量缩放一致)。
 * ====================================================================== */
.wui-progressring {
  --wui-progressring-foreground: var(
    --wui-system-accent-color-dark-1,
    var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))
  );
  --wui-progressring-background: transparent;
  display: inline-block;
  box-sizing: border-box;
  /* 源 Style Setter:IsHitTestVisible=false、IsTabStop=false —— 非交互控件,无指针/焦点态 */
  pointer-events: none;
}

/* 深色主题(Default 字典)覆盖:scoped 内裸祖先写法(同 ProgressBar/InfoBar 约定)——
   [data-v] 只落在末位组件选择器上,祖先 html[data-theme='dark'] 保持裸写;
   特异性 (0,3,0) 高于浅色基线 (0,2,0),不依赖样式块顺序。 */
html[data-theme='dark'] .wui-progressring {
  --wui-progressring-foreground: var(
    --wui-system-accent-color-light-2,
    var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))
  );
}

.wui-progressring__svg {
  display: block;
  width: 100%;
  height: 100%;
}

.wui-progressring__track,
.wui-progressring__arc {
  fill: none;
  stroke-width: 7.5;
  stroke-linecap: round;
}

.wui-progressring__track {
  stroke: var(--wui-progressring-background);
}

.wui-progressring__arc {
  stroke: var(--wui-progressring-foreground);
}

/* 旋转容器:transform-origin 固定圆心(fill-box = 圆几何包围盒,与 dash 变化无关) */
.wui-progressring__arc-group {
  transform-box: fill-box;
  transform-origin: center;
}

/* ======================================================================
 * Inactive(源 Inactive 状态:LayoutRoot.Opacity=0;UpdateStates 中另 player.Stop()
 * 与 Automation 视图 Raw):整环隐藏但保留布局占位,动画停止。
 * ====================================================================== */
.wui-progressring--inactive {
  opacity: 0;
}

.wui-progressring--inactive .wui-progressring__arc,
.wui-progressring--inactive .wui-progressring__arc-group {
  animation: none;
}

/* 确定态弧长过渡:源 PlayAsync(from, to) 顺向扫播的近似(与 ProgressBar 的 240ms 口径一致);
   只挂确定态族,不确定态由关键帧接管。 */
.wui-progressring--determinate .wui-progressring__arc {
  transition: stroke-dasharray var(--wui-duration-normal, 240ms) var(--wui-easing-standard, ease);
}

/* ======================================================================
 * Active + 不确定(源 Active 状态:player.PlayAsync(0, 1, true) 循环播放
 * ProgressRingIndeterminate Lottie,c_durationTicks = 2s):
 *   旋转:0→450°→900°,每段 KeySpline (0.166999996,0.166999996,0.833000004,0.833000004)
 *         → cubic-bezier,两段同曲线等增量。
 *   弧长:前半程 TrimEnd 0.0001→0.5(TrimStart 恒 0,弧自起点生长,dashoffset=0);
 *         后半程 TrimStart 0→0.5(TrimEnd 恒 0.5,终点锚定,弧首前移 =
 *         dasharray 收缩与 dashoffset→-50 同步);0.0001/0.1 的端值配合圆帽呈现为小圆点,
 *         900° 旋转使末尾圆点回到起点位置,循环无缝。
 * ====================================================================== */
.wui-progressring--active.wui-progressring--indeterminate .wui-progressring__arc-group {
  animation: wui-progressring-spin 2s infinite;
}

.wui-progressring--active.wui-progressring--indeterminate .wui-progressring__arc {
  animation: wui-progressring-sweep 2s infinite;
}

@keyframes wui-progressring-spin {
  0% {
    transform: rotate(0deg);
    animation-timing-function: cubic-bezier(0.167, 0.167, 0.833, 0.833);
  }
  50% {
    transform: rotate(450deg);
    animation-timing-function: cubic-bezier(0.167, 0.167, 0.833, 0.833);
  }
  100% {
    transform: rotate(900deg);
  }
}

@keyframes wui-progressring-sweep {
  0% {
    stroke-dasharray: 0.1 99.9;
    stroke-dashoffset: 0;
    animation-timing-function: cubic-bezier(0.167, 0.167, 0.833, 0.833);
  }
  50% {
    stroke-dasharray: 50 50;
    stroke-dashoffset: 0;
    animation-timing-function: cubic-bezier(0.167, 0.167, 0.833, 0.833);
  }
  100% {
    stroke-dasharray: 0.1 99.9;
    stroke-dashoffset: -50;
  }
}

/* ======================================================================
 * 无障碍降级:偏好减少动态效果时不确定态定格在循环中点(450°、半圆弧),
 * 等同暂停观感,避免 infinite 动画持续播放;颜色与几何保持不变。
 * ====================================================================== */
@media (prefers-reduced-motion: reduce) {
  .wui-progressring--indeterminate .wui-progressring__arc-group,
  .wui-progressring--indeterminate .wui-progressring__arc {
    animation: none;
  }

  .wui-progressring--active.wui-progressring--indeterminate .wui-progressring__arc-group {
    transform: rotate(450deg);
  }

  .wui-progressring--active.wui-progressring--indeterminate .wui-progressring__arc {
    stroke-dasharray: 50 50;
    stroke-dashoffset: 0;
  }
}
</style>
