<script setup lang="ts">
// FontIcon —— WinUI FontIcon 的 Web 复刻:以图标字体(Segoe Fluent Icons / Segoe MDL2 Assets)字形渲染的轻量图标。
// 视觉与默认值对照 CK/WinUI-Reference 源码(该控件在 generic.xaml 无默认 Style,默认值来自核心实现):
//   - 默认字号 20(icon.cpp: g_ClientCoreFontSize = 20.f,FontIcon/SymbolIcon 共用);
//   - 默认字体栈 SymbolThemeFontFamily = "Segoe Fluent Icons","Segoe MDL2 Assets"(generic_perf2026.xaml),对应
//     theme.css 的 --wui-symbol-theme-font-family;按项目 R1 裁决不做网络字体加载,仅依赖本机字体栈。
//   - 字形文本对辅助技术隐藏(WinUI 侧 TextBlock AutomationProperties.AccessibilityView=Raw 的等价):默认
//     aria-hidden="true",控件名由宿主控件(如 AppBarButton)承载;可通过 attrs 覆盖(置于 v-bind 之前)。
// 无视觉状态、无业务事件;foreground 缺省继承 currentColor,可被其他控件内嵌。
import { computed } from 'vue'

/** WinUI FontStyle 枚举取值。 */
type FontStyleValue = 'Normal' | 'Italic' | 'Oblique'

const props = withDefaults(
  defineProps<{
    /** 图标字形(必填):单个字符或 Unicode 码点转义,如 '\uE8FB' 或 '&#xE8FB;' 对应的字符。 */
    glyph: string
    /** 字号:数字按 px,字符串原样作为 CSS 长度;缺省 20(WinUI FontIcon 默认字号)。 */
    fontSize?: number | string
    /** 字体族,原样作为 CSS font-family;缺省系统图标字体栈 token(R1:不加载网络字体)。 */
    fontFamily?: string
    /** 字形样式;缺省 Normal。 */
    fontStyle?: FontStyleValue
    /** 字重:WinUI FontWeight 名(Thin…ExtraBlack)或 1–950 数值/数字串;缺省继承(CSS 默认 400)。 */
    fontWeight?: string | number
    /** 前景色,任意 CSS 颜色/变量;缺省继承 currentColor。 */
    foreground?: string
  }>(),
  {
    fontSize: 20,
    fontStyle: 'Normal',
  },
)

defineOptions({ inheritAttrs: false })

/** WinUI FontWeight 命名常量 → CSS font-weight 数值(XAML FontWeights,与 TextBlock 同表)。 */
const FONT_WEIGHT_MAP: Record<string, string> = {
  thin: '100',
  extralight: '200',
  ultralight: '200',
  light: '300',
  semilight: '350',
  normal: '400',
  regular: '400',
  medium: '500',
  semibold: '600',
  demibold: '600',
  bold: '700',
  extrabold: '800',
  ultrabold: '800',
  black: '900',
  heavy: '900',
  extrablack: '950',
  ultrablack: '950',
}

// —— 字号归一:数字 → px,字符串透传 ——
const fontSizeStyle = computed<string>(() => {
  const value = props.fontSize
  return typeof value === 'number' ? `${value}px` : value
})

// —— 字重归一:数值直用;名称查表;未知值回退 CSS 默认(不写 inline)——
const fontWeightStyle = computed<string | undefined>(() => {
  const value = props.fontWeight
  if (value === undefined || value === '') return undefined
  if (typeof value === 'number') return String(value)
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const numeric = Number(trimmed)
  if (Number.isFinite(numeric)) return String(numeric)
  return FONT_WEIGHT_MAP[trimmed.toLowerCase()]
})

// Normal 即 CSS 默认,不写 inline,留浏览器渲染默认值
const fontStyleStyle = computed<string | undefined>(() =>
  props.fontStyle === 'Normal' ? undefined : props.fontStyle.toLowerCase(),
)

const rootStyle = computed(() => ({
  fontSize: fontSizeStyle.value,
  fontFamily: props.fontFamily ?? 'var(--wui-symbol-theme-font-family)',
  fontWeight: fontWeightStyle.value,
  fontStyle: fontStyleStyle.value,
  color: props.foreground,
}))
</script>

<template>
  <!-- 图标为装饰性内容:默认 aria-hidden,写于 v-bind="$attrs" 之前以便调用方覆盖(如提供 aria-label 时关闭) -->
  <span aria-hidden="true" v-bind="$attrs" class="wui-fonticon" :style="rootStyle">{{ glyph }}</span>
</template>

<style scoped>
.wui-fonticon {
  display: inline-block;
  /* 行高收敛为 1:字形盒高等于字号,便于宿主控件(按钮/菜单项)垂直对齐 */
  line-height: 1;
  color: inherit;
  font-weight: 400;
  font-style: normal;
  /* WinUI 图标不可选中 */
  user-select: none;
  -webkit-user-select: none;
}
</style>
