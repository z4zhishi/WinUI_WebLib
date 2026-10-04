<script setup lang="ts">
// TextBox.vue —— WinUI TextBox 的 Web 复刻(单行文本输入)。
// 视觉与状态对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 的
// <Style TargetType="TextBox">(L21358 起):Normal / PointerOver / Focused / Disabled
// 四态 + DeleteButton(清除按钮)的 ButtonVisible/ButtonCollapsed 状态;
// 颜色/字号取 theme.css 的 --wui-* token,结构尺寸取源键值(见 wiki 差异说明)。
import { computed, ref, useAttrs, useId } from 'vue'

defineOptions({ name: 'WuiTextBox', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 输入框上方标头文本(WinUI Header)。 */
    header?: string
    /** 空内容时显示的占位文本(WinUI PlaceholderText)。 */
    placeholderText?: string
    /** 是否启用清除按钮;WinUI 1.4+ 行为:聚焦且有内容期间显示(WinUI ClearButtonEnabled)。 */
    clearButtonEnabled?: boolean
    /** 只读:内容不可编辑但可选择复制(WinUI IsReadOnly)。 */
    isReadOnly?: boolean
    /** 最大字符数;0 表示不限制(WinUI MaxLength)。 */
    maxLength?: number
    /** 禁用态,走原生 input disabled,样式对照 Disabled 视觉状态。 */
    disabled?: boolean
  }>(),
  {
    header: '',
    placeholderText: '',
    clearButtonEnabled: true,
    isReadOnly: false,
    maxLength: 0,
    disabled: false,
  },
)

/** 文本值,支持 v-model:text(WinUI TextBox.Text)。 */
const text = defineModel<string>('text', { default: '' })

/** WinUI TextChanged:文本变化时触发,参数为当前文本值。 */
const emit = defineEmits<{
  (e: 'textChanged', value: string): void
}>()

const inputId = useId()
const inputEl = ref<HTMLInputElement | null>(null)

// —— 无障碍名:a11y QA(label / aria-input-field-name)。header 有 label[for] 关联;
// 无 header 时取调用方 attrs 的 aria-label / aria-labelledby,再退 placeholderText
// (placeholder 本身不构成可访问名)。attrs 落点从根 div(无 role,禁止 aria-label)
// 迁移到 input 上。
const attrs = useAttrs()

const callerAriaLabel = computed(() =>
  typeof attrs['aria-label'] === 'string' ? attrs['aria-label'] : undefined,
)
const callerLabelledBy = computed(() =>
  typeof attrs['aria-labelledby'] === 'string' ? attrs['aria-labelledby'] : undefined,
)

/** input 的可访问名:header 经 label[for] 关联,故仅无 header 时注入。 */
const inputAriaLabel = computed(() =>
  props.header ? undefined : (callerAriaLabel.value || props.placeholderText || undefined),
)
const inputAriaLabelledBy = computed(() =>
  props.header ? undefined : callerLabelledBy.value,
)

/** 根元素透传 attrs:剥离已迁移的 aria-label / aria-labelledby。 */
const rootAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'aria-label' || key === 'aria-labelledby') continue
    rest[key] = value
  }
  return rest
})

// —— 焦点 / IME 组合状态 ——
const focused = ref(false)
const composing = ref(false)

// 已通知出去的值:用于 IME 组合收尾时按浏览器事件顺序去重,保证组合结束只补发一次。
let lastNotified = text.value

function notifyChanged(value: string): void {
  if (value === lastNotified) return
  lastNotified = value
  emit('textChanged', value)
}

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  // Text 属性实时同步(v-model),与 WinUI 组合期间 Text 持续更新一致。
  text.value = value
  // 任务约定:IME 组合期间不触发 textChanged,组合结束后统一补发一次。
  if (!composing.value) notifyChanged(value)
}

function onCompositionStart(): void {
  composing.value = true
}

function onCompositionEnd(event: CompositionEvent): void {
  composing.value = false
  // 兼容不同浏览器顺序(Chrome:input→compositionend;Safari:compositionend→input),
  // notifyChanged 按值去重,最终恰好触发一次。
  notifyChanged((event.target as HTMLInputElement).value)
}

// 清除按钮可见性(WinUI ButtonVisible 状态):启用 + 聚焦 + 有内容;
// 只读框不提供清除入口(与源模板的差异,见 wiki)。
const clearButtonVisible = computed(
  () => props.clearButtonEnabled && !props.isReadOnly && !props.disabled && focused.value && text.value.length > 0,
)

// 清除:清空文本、触发 textChanged,并把焦点送回输入框(WinUI OnDeleteButtonClick 行为)。
function onClearMouseDown(event: MouseEvent): void {
  // 阻止默认聚焦转移,输入框保持聚焦,按钮不因 blur 折叠,click 才能命中。
  event.preventDefault()
}

function onClearClick(): void {
  text.value = ''
  notifyChanged('')
  inputEl.value?.focus()
}

// —— 根节点状态类(Disabled 为模板视觉状态;IsReadOnly 仅供内部样式钩子) ——
const rootClass = computed(() => ({
  'is-disabled': props.disabled,
  'is-readonly': props.isReadOnly,
}))
</script>

<template>
  <div v-bind="rootAttrs" class="wui-text-box" :class="rootClass">
    <!-- HeaderContentPresenter:TextBoxTopHeaderMargin = 0,0,0,4 -->
    <label v-if="header" class="wui-text-box-header" :for="inputId">{{ header }}</label>

    <div class="wui-text-box-border">
      <input
        :id="inputId"
        ref="inputEl"
        class="wui-text-box-input"
        type="text"
        :aria-label="inputAriaLabel"
        :aria-labelledby="inputAriaLabelledBy"
        :value="text"
        :placeholder="placeholderText"
        :readonly="isReadOnly"
        :disabled="disabled"
        :maxlength="maxLength > 0 ? maxLength : undefined"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />
      <!-- DeleteButton:glyph U+E10A(Segoe Fluent Icons / MDL2),MinWidth 34,IsTabStop=False -->
      <button
        v-if="clearButtonVisible"
        type="button"
        class="wui-text-box-delete-button"
        tabindex="-1"
        aria-hidden="true"
        @mousedown="onClearMouseDown"
        @click="onClearClick"
      >
        &#xE10A;
      </button>
    </div>
  </div>
</template>

<style scoped>
.wui-text-box {
  display: flex;
  flex-direction: column;
  min-width: 64px; /* TextControlThemeMinWidth */
}

/* —— Header(WinUI Header):字号同 ControlContentThemeFontSize —— */
.wui-text-box-header {
  margin: 0 0 4px; /* TextBoxTopHeaderMargin = 0,0,0,4 */
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-text-control-header-foreground);
}

/* —— BorderElement:TextControlBorderThemeThickness = 1(四周),MinHeight 32 ——
   XAML 的 MinHeight 计入边框(BorderElement 外缘 32、内容区 30,ContentElement 以
   Margin=BorderThickness 内缩 1px),CSS 对应 border-box:总高 32 含 1px 边框
   (content-box 会撑成 34px,VR-B7 F-B7-1;修法同 FIX6 ComboBox)。
   PL7:厚度取 WinUI 3 权威 —— controls/dev/CommonStyles/Common_themeresources.xaml
   L10/L24(Normal+Light)`TextControlBorderThemeThickness` = 1(legacy dxaml generic.xaml
   L173 的 2 已被本批替换);Focused = L11/L25 `TextControlBorderThemeThicknessFocused`
   = 1,1,1,2(上/左/右 1、下边 2),施加点 TextBox_themeresources.xaml L303(DiscreteObject
   KeyFrame → BorderElement.BorderThickness)。
   PL6:状态色重定向到 Fluent 画刷族(值 = controls/dev 权威):
   Normal Background = ControlFillColorDefaultBrush;边框权威为渐变
   TextControlElevationBorderBrush → 由下方 ::before 描边环呈现(border 保持透明)。 */
.wui-text-box-border {
  position: relative;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 32px; /* TextControlThemeMinHeight(含边框) */
  background: var(--wui-control-fill-color-default);
  border: 1px solid var(--wui-control-fill-color-transparent);
  border-radius: var(--wui-control-corner-radius); /* ControlCornerRadius = 4(V3 QA 打回项) */
  /* Normal / PointerOver 边框 = TextControlElevationBorderBrush(渐变) */
  --tb-elevation-border: var(--wui-text-control-elevation-border);
}

/* ======================================================================
 * PL6 文本控件立体描边环(TextControlElevationBorderBrush):
 * XAML 的 TextControlBorderBrush 是 LinearGradientBrush(竖向渐变),单色 border-color
 * 无法表达 → 用「内嵌 mask 环」复刻(同 PL5 Button 方案):绝对定位伪元素铺满,
 * background 取渐变,再用 mask 差集(mask-composite:exclude)挖空中心,只留边框厚度一圈。
 * 几何:环厚 = 宿主 border 1px(PL7 起,权威 TextControlBorderThemeThickness=1),
 *       inset:-1px 把环外缘推回 border-box 边缘;绝对定位不参与
 *       布局 → 尺寸/圆角/边框宽/内边距全部不变。不采用 border-image(不随圆角裁切,4px
 *       圆角会方角外溢)。
 * 状态:纯色状态(Disabled / Focused)把 --tb-elevation-border 置 none,由 border-color
 *       呈现,不为纯色状态套渐变(严格执行权威矩阵)。
 * ====================================================================== */
.wui-text-box-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: var(--tb-elevation-border, none);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

/* —— PointerOver 状态:VSM 优先级 Focused > PointerOver > Disabled 思路的 CSS 映射 ——
   hover 规则加 :not(:focus-within)(QA F1):聚焦时 hover 规则整体不命中,
   Focused 实底背景 + 强调色边框不再被 pointer-over 灰遮蔽;
   :not(.is-disabled) 保证 Disabled 仍优先于 PointerOver(禁用态不可聚焦,focus-within 恒不命中)。
   PL6:PointerOver Background = ControlFillColorSecondaryBrush;边框仍为
   TextControlElevationBorderBrush(渐变,与 Normal 同键);前景权威与 Normal 同值。 */
.wui-text-box:not(.is-disabled) .wui-text-box-border:not(:focus-within):hover {
  background: var(--wui-control-fill-color-secondary);
  --tb-elevation-border: var(--wui-text-control-elevation-border);
}

.wui-text-box:not(.is-disabled) .wui-text-box-border:not(:focus-within):hover .wui-text-box-input {
  color: var(--wui-text-fill-color-primary);
}

.wui-text-box:not(.is-disabled) .wui-text-box-border:not(:focus-within):hover .wui-text-box-input::placeholder {
  color: var(--wui-text-fill-color-secondary);
}

/* —— Focused 状态:PL6 权威 Background = ControlFillColorInputActiveBrush(浅 #FFFFFF /
      深 #1E1E1EB3),BorderBrush = TextControlBorderBrushFocused(= TextControlElevation-
      FocusedBrush,两停同为 accent,视觉等价 accent 实色)→ 实色强调边框(纯色,环置 none)。
      PL7 厚度 = TextControlBorderThemeThicknessFocused(Common_themeresources L11/L25)
      = 1,1,1,2 → CSS `border-width: 1px 1px 2px 1px`(上/右/下/左;下边 2px 强调色)。
      border-box 语义下总外盒仍 32px,内容盒 32-1-2 = 29。
      UseSystemFocusVisuals 默认关闭,模板 Focused 态即键盘焦点指示,无需额外 outline。 —— */
.wui-text-box-border:focus-within {
  background: var(--wui-control-fill-color-input-active);
  border-color: var(--wui-system-accent-color);
  border-width: 1px 1px 2px 1px; /* TextControlBorderThemeThicknessFocused = 1,1,1,2 */
  --tb-elevation-border: none;
}

.wui-text-box-border:focus-within .wui-text-box-input {
  color: var(--wui-text-fill-color-primary);
}

.wui-text-box-border:focus-within .wui-text-box-input::placeholder {
  color: var(--wui-text-fill-color-secondary);
}

/* —— 内容元素(ContentElement):TextControlThemePadding ——
   PL8:取 WinUI 3 权威 controls/dev/CommonStyles/Common_themeresources.xaml
   L12/L26/L40 = 10,5,6,6(legacy dxaml generic.xaml L175 的 10,3,6,6 已替换);
   施加点 TextBox_themeresources.xaml L194 Setter `Padding` = TextControlThemePadding。
   XAML 序为 left,top,right,bottom → CSS 写 top/right/bottom/left = 5px 6px 6px 10px。
   内容总内缩 = 宿主 border(1px) + 本 padding,CSS 由 border-box + flex stretch 自动成立
   (对应源 ContentElement 的 Margin="{TemplateBinding BorderThickness}" + Padding)。 —— */
.wui-text-box-input {
  flex: 1;
  min-width: 0;
  padding: 5px 6px 6px 10px;
  /* PL8:锁定行盒 18px。Chromium 对 14px Segoe UI 的默认行盒为 19px,而 WinUI TextBoxView
     行盒约 18.6px;在权威内边距(上 5/下 6)与焦点底边 2px 下,若行盒 19 则内容高
     3+11+19=33 会把外盒顶到 33,违反 MinHeight=32。锁 18 后 rest 31≤32(由 MinHeight 定
     32)、focus 3+11+18=32,外盒恒 32。 */
  line-height: 18px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize */
  color: var(--wui-text-fill-color-primary);
  caret-color: var(--wui-text-fill-color-primary);
  background: transparent;
  border: none;
  outline: none;
}

.wui-text-box-input::placeholder {
  color: var(--wui-text-fill-color-secondary);
  opacity: 1;
}

/* 选区高亮 = TextControlSelectionHighlightColor */
.wui-text-box-input::selection {
  background: var(--wui-text-control-selection-highlight-color, var(--wui-system-accent-color));
}

/* —— Disabled 状态:Background = ControlFillColorDisabledBrush;
      BorderBrush = ControlStrokeColorDefaultBrush(纯色 → 环 none);
      Foreground = TemporaryTextFillColorDisabled;占位符 = TextFillColorDisabledBrush。 —— */
.wui-text-box.is-disabled .wui-text-box-header {
  color: var(--wui-text-control-header-foreground-disabled);
}

.wui-text-box.is-disabled .wui-text-box-border {
  background: var(--wui-control-fill-color-disabled);
  border-color: var(--wui-control-stroke-color-default);
  --tb-elevation-border: none;
}

.wui-text-box.is-disabled .wui-text-box-input {
  color: var(--wui-temporary-text-fill-color-disabled);
  cursor: default;
}

.wui-text-box.is-disabled .wui-text-box-input::placeholder {
  color: var(--wui-text-fill-color-disabled);
}

/* —— 只读:保持常态配色(源模板无只读视觉状态),仅不可编辑 —— */
.wui-text-box.is-readonly .wui-text-box-input {
  cursor: default;
}

/* —— DeleteButton(清除按钮):PL6 重定向到 TextControlButton* Fluent 画刷
      (Foreground=TextFillColorSecondaryBrush、PointerOver/Pressed=同键、
      Background PointerOver=SubtleFillColorSecondaryBrush、Pressed=SubtleFillColorTertiaryBrush、
      BorderBrush 三态=ControlFillColorTransparent)。
      HelperButtonThemePadding = 0,0,-2,0(dxaml generic.xaml L176,controls/dev 未覆写,
      与边框厚度无关的固定值,PL7 保留)。
      按钮仅在聚焦(ControlFillColorInputActive)底上出现;浅色底白/深色底 #1E1E1E 下
      TextFillColorSecondary 两主题均可见,故不再需要 FIX12 的 ChromeBlackMedium 覆写。 —— */
.wui-text-box-delete-button {
  flex: none;
  width: 34px; /* DeleteButton MinWidth = 34 */
  margin-right: -2px; /* HelperButtonThemePadding = 0,0,-2,0 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size); /* GlyphElement FontSize = 12,取同值 token */
  color: var(--wui-text-fill-color-secondary);
  background: var(--wui-control-fill-color-transparent);
  border: none;
  cursor: pointer;
}

.wui-text-box-delete-button:hover {
  color: var(--wui-text-fill-color-secondary);
  background: var(--wui-subtle-fill-color-secondary);
}

.wui-text-box-delete-button:active {
  color: var(--wui-text-fill-color-tertiary);
  background: var(--wui-subtle-fill-color-tertiary);
}
</style>
