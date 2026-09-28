<script setup lang="ts">
// TextBlock —— WinUI TextBlock 的 Web 复刻:轻量只读文本控件(无 ControlTemplate、无视觉状态、无业务事件)。
// 视觉与默认值对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml 的排版段:
// TextBlock 默认 FontSize 14 / FontWeight Normal / FontFamily XamlAutoFontFamily,
// 前景取 --wui-application-foreground-theme(ApplicationForegroundThemeBrush 别名链,浅 #000000DE / 深 #FFFFFFDE);
// BaseTextBlockStyle(14px/SemiBold/Wrap)等命名排版样式的对照表见 wiki/controls/TextBlock.md。
import { computed } from 'vue'

/** WinUI TextWrapping 枚举取值。 */
type TextWrappingValue = 'NoWrap' | 'Wrap' | 'WrapWholeWords'

/** WinUI TextTrimming 枚举取值。 */
type TextTrimmingValue = 'None' | 'CharacterEllipsis' | 'WordEllipsis'

/** WinUI FontStyle 枚举取值。 */
type FontStyleValue = 'Normal' | 'Italic' | 'Oblique'

/** WinUI FontWeight 命名常量 → CSS font-weight 数值(XAML FontWeights)。 */
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

const props = withDefaults(
  defineProps<{
    /** 显示的文本;未提供默认 slot 时生效(slot 优先,便于混排行内元素)。 */
    text?: string
    /** 字号:数字按 px,字符串原样作为 CSS 长度;缺省 14px。 */
    fontSize?: number | string
    /** 字重:WinUI FontWeight 名(Thin…ExtraBlack)或 1–950 数值/数字串;缺省 Normal(400)。 */
    fontWeight?: string | number
    /** 字体族,原样作为 CSS font-family;缺省 XamlAutoFontFamily 占位 token(浏览器回退默认字体)。 */
    fontFamily?: string
    /** 字形;缺省 Normal。 */
    fontStyle?: FontStyleValue
    /** 换行模式;缺省 NoWrap(WinUI 属性默认;BaseTextBlockStyle 覆写为 Wrap)。 */
    textWrapping?: TextWrappingValue
    /** 截断省略模式;缺省 None。 */
    textTrimming?: TextTrimmingValue
    /** 最大行数(-webkit-line-clamp);缺省不限。 */
    maxLines?: number
    /** 是否允许文本选择(WinUI IsTextSelectionEnabled);缺省 false,选择/复制为浏览器原生行为。 */
    isTextSelectionEnabled?: boolean
    /** 前景色,任意 CSS 颜色/变量;缺省 --wui-application-foreground-theme。 */
    foreground?: string
  }>(),
  {
    text: '',
    fontStyle: 'Normal',
    textWrapping: 'NoWrap',
    textTrimming: 'None',
  },
)

defineOptions({ inheritAttrs: false })

// —— 字号归一:数字 → px,字符串透传 ——
const fontSizeStyle = computed<string | undefined>(() => {
  if (props.fontSize === undefined) return undefined
  return typeof props.fontSize === 'number' ? `${props.fontSize}px` : props.fontSize
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
  fontWeight: fontWeightStyle.value,
  fontStyle: fontStyleStyle.value,
  fontFamily: props.fontFamily,
  color: props.foreground,
}))

// maxLines 走 -webkit-line-clamp,行数经 CSS 自定义属性注入
const maxLinesStyle = computed(() =>
  props.maxLines !== undefined && props.maxLines >= 1
    ? { '--wui-textblock-max-lines': String(props.maxLines) }
    : undefined,
)

const rootClass = computed(() => [
  'wui-textblock',
  `wui-textblock--wrap-${props.textWrapping.toLowerCase()}`,
  {
    'wui-textblock--trim': props.textTrimming !== 'None',
    'wui-textblock--clamp': props.maxLines !== undefined && props.maxLines >= 1,
    'wui-textblock--selectable': props.isTextSelectionEnabled,
  },
])
</script>

<template>
  <!-- 只读文本:无交互态与业务事件;class/style 经 $attrs 透传给单根节点 -->
  <div v-bind="$attrs" :class="rootClass" :style="[rootStyle, maxLinesStyle]"><slot>{{ text }}</slot></div>
</template>

<style scoped>
.wui-textblock {
  min-width: 0;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 400;
  color: var(--wui-application-foreground-theme);
  /* WinUI IsTextSelectionEnabled=false:文本不可选;--selectable 放开原生选择 */
  user-select: none;
  -webkit-user-select: none;
}

/* —— TextWrapping —— */
/* NoWrap:不换行 */
.wui-textblock--wrap-nowrap {
  white-space: nowrap;
}

/* Wrap:词边界优先换行;单词超宽时允许断词(UWP Wrap 必要时断词语义) */
.wui-textblock--wrap-wrap {
  white-space: normal;
  overflow-wrap: break-word;
}

/* WrapWholeWords:仅词边界换行;超长单词溢出容器(UWP WrapWholeWords 语义) */
.wui-textblock--wrap-wrapwholewords {
  white-space: normal;
  overflow-wrap: normal;
}

/* —— TextTrimming:单行(NoWrap)时 text-overflow 生效;多行需配合 maxLines(line-clamp)—— */
.wui-textblock--trim {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* —— MaxLines:-webkit-line-clamp;溢出时末行显示省略号(与 WinUI 硬裁切的差异见 wiki)—— */
.wui-textblock--clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--wui-textblock-max-lines, 1);
  overflow: hidden;
}

/* —— IsTextSelectionEnabled:恢复原生选择行为 —— */
.wui-textblock--selectable {
  user-select: text;
  -webkit-user-select: text;
}
</style>
