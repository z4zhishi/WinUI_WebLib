<script lang="ts">
// ProgressBar(WinUI ProgressBar 迁移):类型与事件参数对外导出,供使用方与示例页引用。
/** valueChanged 事件参数(对应 WinUI RangeBaseValueChangedEventArgs 的常用字段)。 */
export interface ProgressBarValueChangedEventArgs {
  oldValue: number
  newValue: number
}

/** 进度状态(对照 ProgressBar.xaml CommonStates 的六个状态命名)。 */
export type ProgressMode =
  | 'determinate'
  | 'error'
  | 'paused'
  | 'indeterminate'
  | 'indeterminate-error'
  | 'indeterminate-paused'
</script>

<script setup lang="ts">
// WinUI ProgressBar 复刻。视觉对照源模板 CK/WinUI-Reference/controls/dev/ProgressBar/ProgressBar.xaml
// (注意:ProgressBar 的 Style/ControlTemplate 不在 generic.xaml,而在该控件目录的 ProgressBar.xaml;
// 主题资源在 ProgressBar_themeresources.xaml,theme.css 未生成 --wui-progress-* token,故本组件以
// 局部 --wui-progressbar-* 变量按源值承载,差异记录见 wiki/controls/ProgressBar.md):
//   总高 3(ProgressBarMinHeight),轨道 1px(ControlStrongStrokeColorDefault)、圆角 0.5,
//   指示条填满 3px 高(Foreground=AccentFillColorDefaultBrush)、圆角 1.5;
// 六个进度状态(ProgressBar.xaml CommonStates):Determinate / Error / Paused(确定态变色 167ms)/
//   Indeterminate / IndeterminateError / IndeterminatePaused(不确定态双指示条往复与脉冲),
//   颜色对照 ProgressBarForeground / ProgressBarErrorForegroundColor(SystemFillColorCritical)/
//   ProgressBarPausedForegroundColor(SystemFillColorCaution)。
// 不确定态动画按源 Storyboard 1:1 转写为 CSS 关键帧:2s 无限循环,40% 指示条 0→1.5s
//   (KeySpline 0.4,0,0.6,1 → cubic-bezier)滑出、1.5→2s 端点保持;60% 指示条 0→0.75s 原地、
//   0.75→2s 滑出;进入 IndeterminateError/Paused 时切换为满宽指示条 + 0.75s 一次性脉冲。
// 非交互控件(源 IsTabStop=false,模板无 PointerOver/Pressed/Focus 状态):不做焦点环;
//   role="progressbar",确定态输出 aria-valuemin/max/now,不确定态不报值(WAI-ARIA:值未知)。
import { computed, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiProgressBar' })

const props = withDefaults(
  defineProps<{
    /** 最小值(WinUI Minimum)。 */
    minimum?: number
    /** 最大值(WinUI Maximum)。 */
    maximum?: number
    /** 不确定态(WinUI IsIndeterminate):往复动画表示进行中,不反映具体进度。 */
    isIndeterminate?: boolean
    /** 错误态(WinUI ShowError):指示条变红(不确定态为红色脉冲/满宽)。 */
    showError?: boolean
    /** 暂停态(WinUI ShowPaused):指示条变黄;不确定态停止往复(源行为为切换到脉冲态)。 */
    showPaused?: boolean
    /** 内边距(WinUI Padding;数字按 px,字符串原样)。 */
    padding?: string | number
  }>(),
  {
    minimum: 0,
    maximum: 100,
    isIndeterminate: false,
    showError: false,
    showPaused: false,
    padding: '',
  },
)

const emit = defineEmits<{
  /** 值变化时触发(程序赋值/钳制重算同样触发,与 WinUI ValueChanged 语义一致)。 */
  valueChanged: [event: ProgressBarValueChangedEventArgs]
}>()

/** 当前值(WinUI Value,双向,v-model:value)。 */
const value = defineModel<number>('value', { default: 0 })

// —— 有效取值范围(对称 Slider 实现:maximum < minimum 时收敛为相同值,区间塌缩) ——
const effMin = computed(() => props.minimum)
const effMax = computed(() => Math.max(props.maximum, props.minimum))

/** 把任意值钳制到 [effMin, effMax];非有限值按最小值处理(WinUI 中 NaN 非法,由调用方保证)。 */
function clampValue(raw: number): number {
  if (!Number.isFinite(raw)) return effMin.value
  return Math.min(Math.max(raw, effMin.value), effMax.value)
}

// WinUI RangeBase 在 Minimum/Maximum 变化时把 Value 重新钳制入区间(挂载时同样生效,
// immediate 覆盖挂载即越界的场景);钳制引发的变化经下方 watch 统一触发 valueChanged(与 WinUI 一致)。
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

/** 0..1 进度;区间塌缩(maximum ≈ minimum)时为 0(源:SetProgressBarIndicatorWidth 的 width 0 分支)。 */
const ratio = computed(() => {
  const span = effMax.value - effMin.value
  if (!(span > Number.EPSILON)) return 0
  return Math.min(Math.max((displayValue.value - effMin.value) / span, 0), 1)
})

// —— 进度状态机(对照 ProgressBar.cpp UpdateStates 的分支顺序) ——
const mode = computed<ProgressMode>(() => {
  if (props.isIndeterminate) {
    if (props.showError) return 'indeterminate-error'
    if (props.showPaused) return 'indeterminate-paused'
    return 'indeterminate'
  }
  if (props.showError) return 'error'
  if (props.showPaused) return 'paused'
  return 'determinate'
})

const isIndeterminateMode = computed(() => mode.value !== 'determinate' && mode.value !== 'error' && mode.value !== 'paused')

const modeClass = computed(() => `wui-progressbar--${mode.value}`)

// 确定指示条宽度:确定态按进度,不确定态置 0(源:IsIndeterminate 分支 determinate.Width(0))。
const indicatorStyle = computed<CSSProperties>(() => ({
  width: isIndeterminateMode.value ? '0%' : `${ratio.value * 100}%`,
}))

// 内边距样式(数字按 px;空串不输出,保持默认 0)。
const paddingStyle = computed<CSSProperties>(() => {
  const padding = props.padding
  if (typeof padding === 'number') return { padding: `${padding}px` }
  if (padding === '') return {}
  return { padding }
})

// —— 脉冲重放:CSS 同名动画在类切换间不重播(如 paused ↔ error),用 key 重建元素强制重放 ——
const pulseKey = ref(0)
watch(mode, (next) => {
  if (next === 'indeterminate-error' || next === 'indeterminate-paused') pulseKey.value += 1
})
</script>

<template>
  <div
    v-bind="$attrs"
    class="wui-progressbar"
    :class="modeClass"
    role="progressbar"
    :aria-valuemin="isIndeterminateMode ? undefined : effMin"
    :aria-valuemax="isIndeterminateMode ? undefined : effMax"
    :aria-valuenow="isIndeterminateMode ? undefined : displayValue"
  >
    <div class="wui-progressbar__root" :style="paddingStyle">
      <!-- 裁剪层:对照源 TemplateSettings.ClipRect(内容盒裁剪),往复指示条越界部分不可见 -->
      <div class="wui-progressbar__clip">
        <div class="wui-progressbar__inner">
          <!-- 轨道:1px 高(ControlStrongStrokeColorDefault),不确定态隐藏(源 Opacity=0) -->
          <div class="wui-progressbar__track" aria-hidden="true"></div>
          <!-- 确定指示条:AccentFillColorDefaultBrush;Error/Paused 态换色(167ms) -->
          <div class="wui-progressbar__indicator" aria-hidden="true" :style="indicatorStyle"></div>
          <!-- 不确定指示条一:40% 宽,0→1.5s 滑出、1.5→2s 保持(2s 循环) -->
          <div class="wui-progressbar__indeterminate wui-progressbar__indeterminate--first" aria-hidden="true"></div>
          <!-- 不确定指示条二:60% 宽,0.75s 后滑出;Paused/Error 态满宽 + 一次性脉冲 -->
          <div
            :key="pulseKey"
            class="wui-progressbar__indeterminate wui-progressbar__indeterminate--second"
            aria-hidden="true"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ======================================================================
 * 颜色变量:ProgressBar 的主题资源位于 controls/dev/ProgressBar/ProgressBar_themeresources.xaml,
 * theme.css(仅抽取 generic.xaml)没有对应 token,故按源值在组件内承载(浅/深两套,
 * 差异说明见 wiki/controls/ProgressBar.md):
 *   Foreground   = AccentFillColorDefaultBrush(浅 = SystemAccentColorDark1,深 = SystemAccentColorLight2,
 *                  经 theme-hooks.css 的系统色钩子,未定义时回退站点约定色)
 *   Track        = ControlStrongStrokeColorDefault(#72000000 / #8BFFFFFF)
 *   Paused       = SystemFillColorCaution(#9D5D00 / #FCE100)
 *   Error        = SystemFillColorCritical(#C42B1C / #FF99A4)
 *   (轨道 #00000072 / #ffffff8b:XAML 源值 #72000000 / #8BFFFFFF 为 AARRGGBB 字节序,
 *   CSS 8 位 hex 为 RRGGBBAA,搬运时需翻转 —— 见 fix round 1 Critical。)
 * 尺寸常量(无 token,按源值):ProgressBarMinHeight=3、ProgressBarTrackHeight=1、
 *   CornerRadius=1.5、TrackCornerRadius=0.5。
 * ====================================================================== */
.wui-progressbar {
  --wui-progressbar-foreground: var(
    --wui-system-accent-color-dark-1,
    var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))
  );
  /* XAML ControlStrongStrokeColorDefault(light)= #72000000(AARRGGBB)→ CSS #00000072 */
  --wui-progressbar-track-fill: #00000072;
  --wui-progressbar-paused-foreground: #9d5d00;
  --wui-progressbar-error-foreground: #c42b1c;
}

.wui-progressbar {
  display: block;
  width: 100%;
}

/* 深色主题(Default 字典)覆盖:scoped 内裸祖先写法(同 InfoBar 约定)—— [data-v] 只落在
   末位组件选择器上,祖先 html[data-theme='dark'] 保持裸写;特异性 (0,3,0) 高于浅色基线
   (0,2,0),不依赖样式块顺序。 */
html[data-theme='dark'] .wui-progressbar {
  --wui-progressbar-foreground: var(
    --wui-system-accent-color-light-2,
    var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))
  );
  /* XAML ControlStrongStrokeColorDefault(dark)= #8BFFFFFF(AARRGGBB)→ CSS #ffffff8b */
  --wui-progressbar-track-fill: #ffffff8b;
  --wui-progressbar-paused-foreground: #fce100;
  --wui-progressbar-error-foreground: #ff99a4;
}

/* 根 Border(Padding + CornerRadius;BorderThickness 源默认 0,不描边) */
.wui-progressbar__root {
  border-radius: 1.5px;
}

/* 裁剪层:溢出隐藏(源 ClipRect;默认 padding 下与内容盒裁剪一致) */
.wui-progressbar__clip {
  overflow: hidden;
}

/* 内部 Grid:Height = ProgressBarMinHeight(3) */
.wui-progressbar__inner {
  position: relative;
  height: 3px;
}

/* —— 轨道:ProgressBarTrackHeight = 1,垂直居中,圆角 0.5。
      可见性切换为即时(源 Indeterminate 状态的 Opacity Setter 即时生效,无过渡);
      源在 Indeterminate→Determinate 转换上有 167ms FadeInThemeAnimation,Web 未实现(见 wiki 差异 2) —— */
.wui-progressbar__track {
  position: absolute;
  top: calc(50% - 0.5px);
  left: 0;
  width: 100%;
  height: 1px;
  border-radius: 0.5px;
  background: var(--wui-progressbar-track-fill);
}

/* —— 确定指示条:HorizontalAlignment=Left,填满 3px 高,圆角 1.5。
      颜色变化对应 Error/Paused 的 ColorAnimation(167ms);
      宽度过渡只挂确定态族(RepositionThemeAnimation 的近似,见 wiki 差异 2)——
      进入不确定态时宽度置 0 与源一致为即时,不播收缩动画 —— */
.wui-progressbar__indicator {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 1.5px;
  background: var(--wui-progressbar-foreground);
  transition: background-color var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease);
}

.wui-progressbar--determinate .wui-progressbar__indicator,
.wui-progressbar--error .wui-progressbar__indicator,
.wui-progressbar--paused .wui-progressbar__indicator {
  transition:
    width var(--wui-duration-normal, 240ms) var(--wui-easing-standard, ease),
    background-color var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease);
}

/* 确定态 Error / Paused:仅换色(ProgressBarErrorForegroundColor / ProgressBarPausedForegroundColor) */
.wui-progressbar--error .wui-progressbar__indicator {
  background: var(--wui-progressbar-error-foreground);
}

.wui-progressbar--paused .wui-progressbar__indicator {
  background: var(--wui-progressbar-paused-foreground);
}

/* —— 不确定指示条(默认隐藏,Opacity=0,与源模板一致) —— */
.wui-progressbar__indeterminate {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 1.5px;
  background: var(--wui-progressbar-foreground);
  opacity: 0;
  transition: background-color var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease);
}

.wui-progressbar__indeterminate--first {
  width: 40%;
}

.wui-progressbar__indeterminate--second {
  width: 60%;
}

/* ======================================================================
 * 不确定态(源 Indeterminate 状态 Storyboard,2s 无限循环):
 *   指示条一(40% 宽):ContainerAnimationStartPosition(-1×自身宽)→ 0:0:1.5
 *     ContainerAnimationEndPosition(3×自身宽),KeySpline 0.4,0,0.6,1;1.5→2s 端点保持。
 *   指示条二(60% 宽):0→0.75s 保持 Container2AnimationStartPosition(-1.5×自身宽),
 *     0.75→2s → Container2AnimationEndPosition(1.66×自身宽),同 KeySpline。
 *   轨道隐藏(源 ProgressBarTrack.Opacity=0)。
 * ====================================================================== */
.wui-progressbar--indeterminate .wui-progressbar__track {
  opacity: 0;
}

.wui-progressbar--indeterminate .wui-progressbar__indeterminate--first {
  opacity: 1;
  animation: wui-progressbar-indeterminate-slide 2s infinite;
}

.wui-progressbar--indeterminate .wui-progressbar__indeterminate--second {
  opacity: 1;
  animation: wui-progressbar-indeterminate-slide-2 2s infinite;
}

@keyframes wui-progressbar-indeterminate-slide {
  0% {
    transform: translateX(-100%);
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  75% {
    transform: translateX(300%);
  }
  100% {
    transform: translateX(300%);
  }
}

@keyframes wui-progressbar-indeterminate-slide-2 {
  0%,
  37.5% {
    transform: translateX(-150%);
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  100% {
    transform: translateX(166%);
  }
}

/* ======================================================================
 * 不确定 + Error/Paused(源 IndeterminateError / IndeterminatePaused 状态):
 *   指示条一与确定指示条隐藏,指示条二变满宽(100%);颜色切到 Error/Paused 色(167ms);
 *   进入状态时播放一次性脉冲(0.75s:先扫至右端、回落至 -150%、再归位 0,
 *   KeySpline 1,1,0,1 与 0,0,0,1 → cubic-bezier);轨道隐藏。
 * ====================================================================== */
.wui-progressbar--indeterminate-error .wui-progressbar__track,
.wui-progressbar--indeterminate-paused .wui-progressbar__track {
  opacity: 0;
}

.wui-progressbar--indeterminate-error .wui-progressbar__indicator,
.wui-progressbar--indeterminate-paused .wui-progressbar__indicator {
  opacity: 0;
}

.wui-progressbar--indeterminate-paused .wui-progressbar__indeterminate--second {
  opacity: 1;
  width: 100%;
  background: var(--wui-progressbar-paused-foreground);
  animation: wui-progressbar-state-pulse 750ms both;
}

.wui-progressbar--indeterminate-error .wui-progressbar__indeterminate--second {
  opacity: 1;
  width: 100%;
  background: var(--wui-progressbar-error-foreground);
  animation: wui-progressbar-state-pulse 750ms both;
}

@keyframes wui-progressbar-state-pulse {
  0% {
    transform: translateX(0);
    animation-timing-function: cubic-bezier(1, 1, 0, 1);
  }
  22.2% {
    transform: translateX(99.6%);
  }
  22.3% {
    transform: translateX(-90%);
    animation-timing-function: cubic-bezier(0, 0, 0, 1);
  }
  100% {
    transform: translateX(0);
  }
}

/* ======================================================================
 * 无障碍降级:偏好减少动态效果时不确定态静态呈现(满宽指示条,等同暂停观感),
 * 避免 infinite 动画持续播放;状态色与几何保持不变。
 * ====================================================================== */
@media (prefers-reduced-motion: reduce) {
  .wui-progressbar--indeterminate .wui-progressbar__indeterminate--first,
  .wui-progressbar--indeterminate .wui-progressbar__indeterminate--second,
  .wui-progressbar--indeterminate-paused .wui-progressbar__indeterminate--second,
  .wui-progressbar--indeterminate-error .wui-progressbar__indeterminate--second {
    animation: none;
  }

  .wui-progressbar--indeterminate .wui-progressbar__indicator {
    width: 100% !important;
    opacity: 1;
  }
}
</style>
