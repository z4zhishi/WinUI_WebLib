<script lang="ts">
// RatingControl(WinUI RatingControl 迁移):事件参数类型对外导出,供使用方与示例页引用。
/** valueChanged 事件参数(WinUI ValueChanged 的事件参数为 null,此处携带前后值便于消费)。 */
export interface RatingControlValueChangedEventArgs {
  oldValue: number | null
  newValue: number | null
}
</script>

<script setup lang="ts">
// WinUI RatingControl 复刻。视觉对照 controls/dev/RatingControl/RatingControl.xaml 的 ControlTemplate
// 与 RatingControl_themeresources.xaml:双层星条(背景层 UnsetGlyph U+E734 恒为未选色,前景层
// Glyph U+E735 按值逐星裁切,支持半星),颜色取 theme.css 的 --wui-rating-control-* token。
// 行为对照 RatingControl.cpp:
//   - 值域 1..maxRating(默认 5),未评分哨兵 -1 → Web 侧用 null 表达;
//   - 悬浮预览 ceil(指针百分比 × maxRating),拖出左边缘可清空(指针捕获);
//   - 点击当前值星星 = 清空(isClearEnabled),键盘 ←/→/↑/↓ ±1、Home 清空、End 满值,
//     未评分时按方向键取 initialSetValue(源 ChangeRatingBy 语义);
//   - 未评分时显示 placeholderValue(半星精度),评分后星条 + 文字收窄为紧凑态;
//   - a11y:源 AutomationPeer 为 Slider 控制类型 + RangeValue 模式(min 0 / max maxRating /
//     未评分报 0),故 role="slider" + aria-valuemin/max/now/valuetext。
import { computed, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false, name: 'WuiRatingControl' })

const props = withDefaults(
  defineProps<{
    /** 星星数量(WinUI MaxRating;< 1 时收敛为 1)。 */
    maxRating?: number
    /** 占位值(WinUI PlaceholderValue;null = 未设置,负值视为未设置,0/正分数按源规则收敛)。 */
    placeholderValue?: number | null
    /** 未评分时按方向键设定的首个值(WinUI InitialSetValue)。 */
    initialSetValue?: number
    /** 是否允许清除(WinUI IsClearEnabled)。 */
    isClearEnabled?: boolean
    /** 只读:无指针预览、键盘与点击均无效(WinUI IsReadOnly)。 */
    isReadOnly?: boolean
    /** 星条右侧说明文字(WinUI Caption,12px;如「请评分」「312 条评分」)。 */
    caption?: string
    /** 禁用(Web 侧对应 WinUI Control.IsEnabled)。 */
    disabled?: boolean
  }>(),
  {
    maxRating: 5,
    placeholderValue: null,
    initialSetValue: 1,
    isClearEnabled: true,
    isReadOnly: false,
    caption: '',
    disabled: false,
  },
)

const emit = defineEmits<{
  /** 评分提交(点击/键盘)时触发;与 WinUI 一致,命中提交路径即触发,即使值未变(如满值再按 End)。 */
  valueChanged: [event: RatingControlValueChangedEventArgs]
}>()

/** 当前评分(WinUI Value,双向;null = 未评分,对应源哨兵 -1)。 */
const value = defineModel<number | null>('value', { default: null })

// —— 源布局常量(RatingControl_themeresources.xaml / RatingControl.cpp,落在下方样式里)——
// 源以 FontSize 32 双倍渲染 + 0.5 缩放,实际星星尺寸 = 16px;ItemSpacing = 8px;
// 星条与文字间距 c_captionSpacing = 12px(源注释:红色线稿的 8px 实为 12px)。

// —— 取值收敛(对照 CoerceValueBetweenMinAndMax / MaxRating 收敛)——
/** 星星数量:源 int DP 且 std::max(1, value);Web 侧对分数向下取整后再收敛。 */
const effMaxRating = computed(() => Math.max(1, Math.floor(props.maxRating)))

/**
 * 值收敛:负值/非有限值 → null(未评分);<= 1 → 1;> maxRating → maxRating。
 * (源:0 与 0.5 都会被收敛为 1,占位值同规则。)
 */
function coerceRating(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return null
  if (raw <= 1) return 1
  const max = effMaxRating.value
  return raw > max ? max : raw
}

watch(value, (raw) => {
  const coerced = coerceRating(raw)
  if (coerced !== raw) value.value = coerced
})

/**
 * 占位值收敛视图:源在 DP 层把非法值写回(OnPropertyChanged 收敛);Web 侧 placeholderValue
 * 为单向 prop,故在读取处收敛 —— 负值/非有限值视为未设置,<= 1 收敛为 1,超出 maxRating 钳制。
 */
const effPlaceholderValue = computed<number | null>(() => coerceRating(props.placeholderValue))

// maxRating 变小 → value 超出部分钳制(源 OnMaxRatingChanged 收敛,静默不触发事件;
// 占位值在 effPlaceholderValue 读取处钳制,同样静默)。
watch(effMaxRating, (max) => {
  if (value.value !== null && value.value > max) value.value = max
})

/** 未评分时按方向键取的首个值(源 InitialSetValue int DP,默认 1)。 */
const effInitialSetValue = computed(() => Math.max(1, Math.floor(props.initialSetValue)))

// —— 指针预览状态(对照 m_isPointerOver / m_mousePercentage)——
const starsEl = ref<HTMLElement | null>(null)
const isPointerOver = ref(false)
const isPointerDown = ref(false)
const pointerRatio = ref(0)

/** 悬浮预览是否生效(源 OnPointer* 全部以 !IsReadOnly 为闸;禁用同理)。 */
const previewActive = computed(() => isPointerOver.value && !props.isReadOnly && !props.disabled)

/** 当前呈现值:悬浮时 = ceil(指针百分比 × maxRating)(源 UpdateRatingItemsAppearance),否则 value → placeholderValue。 */
const displayValue = computed(() => {
  if (previewActive.value) {
    return Math.min(effMaxRating.value, Math.max(0, Math.ceil(pointerRatio.value * effMaxRating.value)))
  }
  if (value.value !== null) return value.value
  return effPlaceholderValue.value ?? 0
})

/**
 * 前景色状态(对照 CommonStates:Disabled / PointerOverPlaceholder / PointerOverUnselected /
 * PointerOverSet / Set / Placeholder;源逻辑见 UpdateRatingItemsAppearance)。
 */
type RatingForegroundState =
  | 'set'
  | 'pointerOverSet'
  | 'placeholder'
  | 'pointerOverPlaceholder'
  | 'pointerOverUnselected'
  | 'disabled'

const foregroundState = computed<RatingForegroundState>(() => {
  if (props.disabled) return 'disabled'
  if (previewActive.value) {
    if (value.value !== null) return 'pointerOverSet'
    // 源:未评分悬浮时,无占位值 → PointerOverPlaceholder;有占位值 → PointerOverUnselected。
    return effPlaceholderValue.value === null ? 'pointerOverPlaceholder' : 'pointerOverUnselected'
  }
  if (value.value !== null) return 'set'
  if (effPlaceholderValue.value !== null) return 'placeholder'
  return 'set'
})

/**
 * 每颗前景星的显示比例(1 = 整星,v - i = 半星;源逐星 Clip 矩形,Clip 不改变布局宽度,
 * 因此 Web 侧用 clip-path 裁切而保持星位不动)。
 */
const starFractions = computed<number[]>(() => {
  const v = displayValue.value
  const fractions: number[] = []
  for (let i = 0; i < effMaxRating.value; i += 1) {
    if (i + 1 <= v) fractions.push(1)
    else if (i < v) fractions.push(v - i)
    else fractions.push(0)
  }
  return fractions
})

function starStyle(fraction: number): CSSProperties {
  if (fraction >= 1) return {}
  // 保留 4 位小数,消除 0.30000000000000004 之类的浮点噪声。
  const clipRight = ((1 - fraction) * 100).toFixed(4)
  return { clipPath: `inset(0 ${clipRight}% 0 0)` }
}

// —— 提交路径(对照 SetRatingTo / ChangeRatingBy)——

/** 提交新评分:基础条件、清空规则、事件触发均对照源 SetRatingTo。 */
function setRatingTo(newRating: number, originatedFromMouse: boolean): void {
  const max = effMaxRating.value
  let ratingValue = Math.min(newRating, max)
  ratingValue = Math.max(ratingValue, 0)

  const oldRatingValue = value.value
  // 源基础条件:已有评分,或新值非 0(未评分按 Home 时两者皆否 → 不动)。
  if (oldRatingValue !== null || ratingValue !== 0) {
    let next: number | null
    if (!props.isClearEnabled && ratingValue <= 0) {
      next = 1
    } else if (
      oldRatingValue !== null &&
      ratingValue === oldRatingValue &&
      props.isClearEnabled &&
      (ratingValue !== max || originatedFromMouse)
    ) {
      // 键盘在满值时 +1 保持稳定;点击当前值星星则清除(源注释语义)。
      next = null
    } else if (ratingValue > 0) {
      next = ratingValue
    } else {
      next = null
    }
    value.value = next
    // 源在此路径上无条件通知(即使值未变,如满值再按 End)。
    emit('valueChanged', { oldValue: oldRatingValue, newValue: next })
  }
}

/** 增减评分:未评分时取 initialSetValue;分数值先截断(源 ChangeRatingBy)。 */
function changeRatingBy(change: number, originatedFromMouse = false): void {
  if (change === 0) return
  let ratingValue: number
  const oldRatingValue = value.value
  if (oldRatingValue !== null) {
    if (!Number.isInteger(oldRatingValue)) {
      ratingValue = change === -1 ? Math.trunc(oldRatingValue) : Math.trunc(oldRatingValue) + change
    } else {
      ratingValue = oldRatingValue + change
    }
  } else {
    ratingValue = effInitialSetValue.value
  }
  setRatingTo(ratingValue, originatedFromMouse)
}

// —— 键盘(对照 OnKeyDown:←/→ ±1,↑/↓ 映射为 →/←,Home 0,End 满值)——
function onKeydown(event: KeyboardEvent): void {
  if (props.isReadOnly || props.disabled) return
  let handled = false
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      changeRatingBy(-1)
      handled = true
      break
    case 'ArrowRight':
    case 'ArrowUp':
      changeRatingBy(1)
      handled = true
      break
    case 'Home':
      setRatingTo(0, false)
      handled = true
      break
    case 'End':
      setRatingTo(effMaxRating.value, false)
      handled = true
      break
    default:
      break
  }
  if (handled) event.preventDefault()
}

// —— 指针(对照 OnPointerEntered/Moved/Exited/Pressed/Released + 指针捕获拖出左缘清空)——

function isInteractive(): boolean {
  return !props.isReadOnly && !props.disabled
}

function updatePointerRatio(event: PointerEvent): void {
  const el = starsEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  pointerRatio.value = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0
}

function onPointerEnter(event: PointerEvent): void {
  if (!isInteractive()) return
  isPointerOver.value = true
  updatePointerRatio(event)
}

function onPointerMove(event: PointerEvent): void {
  if (!isInteractive()) return
  isPointerOver.value = true
  updatePointerRatio(event)
}

function onPointerLeave(): void {
  // 按住期间(拖动清空)不退出预览,与源 m_isPointerDown 守卫一致。
  if (isPointerDown.value) return
  isPointerOver.value = false
}

function onPointerDown(event: PointerEvent): void {
  if (!isInteractive()) return
  isPointerDown.value = true
  // 捕获指针以支持「按住拖出左边缘清空」(源 CapturePointer)。
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerUp(): void {
  if (!isInteractive()) {
    isPointerDown.value = false
    return
  }
  if (isPointerDown.value) {
    isPointerDown.value = false
    // 源 OnPointerReleased:x / 实际星条宽度 → ceil;评分到指针所在星。
    setRatingTo(Math.ceil(pointerRatio.value * effMaxRating.value), true)
  }
}

function onPointerCancel(): void {
  isPointerDown.value = false
  isPointerOver.value = false
}

// —— a11y(对照 RatingControlAutomationPeer:Slider 类型 + RangeValue/Value 模式)——
/** 未评分报 0(UIA 不容忍 null);valuetext 区分未评分/占位/已评。 */
const ariaValueNow = computed(() => (value.value === null ? 0 : value.value))

const ariaValueText = computed(() => {
  if (value.value !== null) return `${value.value} / ${effMaxRating.value} 星`
  if (effPlaceholderValue.value !== null) {
    return `${effPlaceholderValue.value} / ${effMaxRating.value} 星(占位)`
  }
  return '未评分'
})
</script>

<template>
  <div
    v-bind="$attrs"
    class="wui-rating"
    :class="{ 'wui-rating--disabled': disabled, 'wui-rating--readonly': isReadOnly }"
    role="slider"
    :tabindex="disabled ? -1 : 0"
    :aria-valuemin="0"
    :aria-valuemax="effMaxRating"
    :aria-valuenow="ariaValueNow"
    :aria-valuetext="ariaValueText"
    :aria-readonly="isReadOnly || undefined"
    :aria-disabled="disabled || undefined"
    @keydown="onKeydown"
  >
    <!-- 双层星条:背景层恒为未选色轮廓星;前景层实心星按值裁切(支持半星) -->
    <div
      ref="starsEl"
      class="wui-rating__stars"
      aria-hidden="true"
      @pointerenter="onPointerEnter"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @lostpointercapture="onPointerCancel"
    >
      <span v-for="i in effMaxRating" :key="`bg-${i}`" class="wui-rating__star wui-rating__star--background">&#xE734;</span>
      <span class="wui-rating__foreground" :class="`wui-rating__foreground--${foregroundState}`">
        <span
          v-for="(fraction, i) in starFractions"
          :key="`fg-${i}`"
          class="wui-rating__star wui-rating__star--foreground"
          :style="starStyle(fraction)"
        >&#xE735;</span>
      </span>
    </div>
    <span v-if="caption" class="wui-rating__caption">{{ caption }}</span>
  </div>
</template>

<style scoped>
/* 根:MinHeight 32(RatingControl.xaml Setter);ResetControlSize 使控件恒为内容紧致宽度 → inline-flex */
.wui-rating {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  user-select: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  outline: none;

  /* 视觉 fix(V7):theme.css 为自动生成层,平台画刷 TextFillColorSecondaryBrush /
     ControlAltFillColorTertiaryBrush 不在 generic.xaml 内,提取器回退值偏差
     (未选星 #00000033 = 20%、悬浮预览 #00000099 = 60%)。此处按源实值局部携带
     (CommonStyles/Common_themeresources_any.xaml:TextFillColorSecondary
     light #9E000000 / dark #C5FFFFFF;ControlAltFillColorTertiary
     light #0F000000 / dark #0BFFFFFF;InfoBar 局部 token 先例)。
     字节序 fix(V8):XAML Color 为 #AARRGGBB(alpha 在前),CSS 8 位 hex 为
     #RRGGBBAA(alpha 在后)——上一轮把 XAML 字面值原样落进 CSS,浅色 alpha 落到
     蓝通道且 alpha=00 全透明、深色 R 通道吃到 alpha 变 rgb(197,255,255) 青白。
     以下均为「XAML 源值 → alpha 移到末位」的换算结果:
       #9E000000 → #0000009e、#C5FFFFFF → #ffffffc5、
       #0F000000 → #0000000f、#0BFFFFFF → #ffffff0b。
     token 层补齐 --wui-text-fill-color-secondary 等后可改回 var() 引用并删除本段。 */
  --wui-rating-control-unselected-foreground: #0000009e; /* XAML #9E000000(TextFillColorSecondary light) */
  --wui-rating-control-caption-foreground: #0000009e; /* 同为 TextFillColorSecondaryBrush light */
  --wui-rating-control-pointer-over-placeholder-foreground: #0000000f; /* XAML #0F000000(ControlAltFillColorTertiary light) */
  --wui-rating-control-pointer-over-unselected-foreground: #0000000f;
}

/* 深色主题:带主题前缀以保证压过浅色基线(特异性约定,见 InfoBar 先例) */
html[data-theme='dark'] .wui-rating {
  --wui-rating-control-unselected-foreground: #ffffffc5; /* XAML #C5FFFFFF(TextFillColorSecondary dark) */
  --wui-rating-control-caption-foreground: #ffffffc5;
  --wui-rating-control-pointer-over-placeholder-foreground: #ffffff0b; /* XAML #0BFFFFFF(ControlAltFillColorTertiary dark) */
  --wui-rating-control-pointer-over-unselected-foreground: #ffffff0b;
}

/* 星条:实际星 16px(FS 32 × 0.5)、间距 8(RatingControlItemSpacing) */
.wui-rating__stars {
  position: relative;
  display: inline-flex;
  gap: 8px;
  height: 16px;
  cursor: pointer;
  /* 允许按住横向拖动(触屏拖出左缘清空),不触发页面滚动 */
  touch-action: none;
}

.wui-rating--readonly .wui-rating__stars,
.wui-rating--disabled .wui-rating__stars {
  cursor: default;
}

/* 星形:Segoe Fluent Icons U+E734(轮廓)/ U+E735(实心),16px 方形定位 */
.wui-rating__star {
  display: inline-block;
  width: 16px;
  height: 16px;
  overflow: hidden;
  font-family: var(--wui-symbol-theme-font-family, 'Segoe Fluent Icons', 'Segoe MDL2 Assets');
  font-size: 16px;
  line-height: 16px;
  text-align: center;
}

/* 背景层:RatingControlUnselectedForeground 恒定(源 DataTemplate 静态前景,不随状态切换) */
.wui-rating__star--background {
  color: var(--wui-rating-control-unselected-foreground);
}

/* 前景层:叠于背景层之上,不参与命中测试(源 ForegroundContentPresenter IsHitTestVisible=false) */
.wui-rating__foreground {
  position: absolute;
  inset: 0;
  display: inline-flex;
  gap: 8px;
  pointer-events: none;
  transition: color var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease);
}

/* —— 前景色状态(对照 CommonStates 六态 + Disabled)—— */
.wui-rating__foreground--set,
.wui-rating__foreground--pointerOverSet {
  color: var(--wui-rating-control-selected-foreground);
}

.wui-rating__foreground--pointerOverSet {
  color: var(--wui-rating-control-pointer-over-selected-foreground);
}

.wui-rating__foreground--placeholder {
  /* FIX9:占位前景 = RatingControlPlaceholderForeground = TextFillColorPrimaryBrush
     (RatingControl_themeresources.xaml L7/L14;浅 #E4000000 / 深 #FFFFFF)。theme.css 生成的
     --wui-rating-control-placeholder-foreground 丢了 alpha(浅 #000000),V8 字节序修正段
     也漏了本 token;改引同库已修正的全局 token(--wui-text-fill-color-primary:浅
     #000000e4 / 深 #ffffff,theme.css L755/L2670),字节序换算 #E4000000 → #000000e4。 */
  color: var(--wui-text-fill-color-primary, #000000e4);
}

.wui-rating__foreground--pointerOverPlaceholder {
  color: var(--wui-rating-control-pointer-over-placeholder-foreground);
}

.wui-rating__foreground--pointerOverUnselected {
  color: var(--wui-rating-control-pointer-over-unselected-foreground);
}

/* 源 RatingControlDisabledSelectedForeground = TextFillColorDisabledBrush;rating 族无此 token,
   取最近似的既有禁用文字 token(值与各控件禁用前景一致),差异见 wiki。 */
.wui-rating__foreground--disabled {
  color: var(--wui-button-foreground-disabled, var(--wui-text-control-foreground-disabled));
}

/* 文字:12px(CaptionTextBlockStyle)、间距 12(c_captionSpacing)、RatingControlCaptionForeground */
.wui-rating__caption {
  margin-left: 12px;
  font-size: var(--wui-tool-tip-content-theme-font-size, 12px);
  line-height: 1.2;
  color: var(--wui-rating-control-caption-foreground);
}

/* —— Focus(源 RatingControl UseSystemFocusVisuals + FocusVisualMargin -8,-7,-8,0:系统双环
   primary 外环 2px + secondary 内环 1px,取系统焦点主色(黑/白),非强调色)—— */
.wui-rating:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--wui-system-control-focus-visual-secondary);
}
</style>
