<script setup lang="ts">
// Border —— WinUI Border 的 Web 复刻:单子元素装饰容器(边框线、背景、圆角、内边距)。
// 对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml:Border 不是 Control,
// 没有 ControlTemplate 与视觉状态树(布局类控件,无 PointerOver/Pressed/Focus 要求);
// 视觉默认值取 Border 属性默认:BorderThickness 0 / BorderBrush null(不绘制)/
// CornerRadius 0 / Padding 0 / Background null(透明)。
// 边框为「内绘」语义:用多重 inset box-shadow 把边框画在盒内,不挤占 padding 与内容区,
// 改厚度不引起布局抖动;与 CSS border / outline 的方案取舍见 wiki/controls/Border.md。
import { computed } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** 边框厚度,XAML Thickness 形式:数字(四边一致,无单位按 px)/ "left,top" / "left,top,right,bottom"。 */
  borderThickness?: number | string
  /** 边框画刷:任意 CSS 颜色或 --wui-* 变量;缺省不绘制(WinUI BorderBrush 默认 null)。 */
  borderBrush?: string
  /** 圆角,XAML CornerRadius 形式:数字(四角一致,无单位按 px)/ "topLeft,topRight,bottomRight,bottomLeft"(如 "8,0,8,0")。 */
  cornerRadius?: number | string
  /** 内边距,XAML Thickness 形式(同 borderThickness);数字无单位按 px。 */
  padding?: number | string
  /** 背景画刷:任意 CSS 颜色或 --wui-* 主题 token;缺省透明(WinUI Background 默认 null)。 */
  background?: string
}>()

/** CSS 长度四元组(left, top, right, bottom)。 */
type Sides = [string, string, string, string]

function zeroSides(): Sides {
  return ['0px', '0px', '0px', '0px']
}

/** 单边解析:无单位数字 → px(负值钳为 0);带单位 CSS 长度原样透传;非法返回 null。 */
function toCssLength(part: string): string | null {
  const trimmed = part.trim()
  if (trimmed === '') return null
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) {
    return `${Math.max(0, Number(trimmed))}px`
  }
  return trimmed
}

/** 解析 XAML Thickness:1 值四边一致;2 值 "left,top"(左右/上下配对);4 值 "left,top,right,bottom"。 */
function parseSides(value: number | string | undefined): Sides {
  if (value === undefined || value === '') return zeroSides()
  if (typeof value === 'number') {
    const n = `${Math.max(0, value)}px`
    return [n, n, n, n]
  }
  const lengths: string[] = []
  for (const part of value.split(/[\s,]+/)) {
    const length = toCssLength(part)
    if (length !== null) lengths.push(length)
  }
  if (lengths.length === 0) return zeroSides()
  if (lengths.length === 1) {
    const s = lengths[0]
    return [s, s, s, s]
  }
  if (lengths.length === 2) {
    const l = lengths[0]
    const t = lengths[1]
    return [l, t, l, t]
  }
  return [lengths[0], lengths[1], lengths[2], lengths[3]]
}

/** 判断 CSS 长度是否为 0(仅用于跳过零厚度边)。 */
function isZeroLength(length: string): boolean {
  return Number.parseFloat(length) === 0
}

// —— 边框:内绘 inset box-shadow,四边独立;四边一致时用等宽内环(圆角处更贴合) ——
const borderSides = computed<Sides>(() => parseSides(props.borderThickness))

const boxShadow = computed<string | undefined>(() => {
  const brush = props.borderBrush?.trim()
  if (!brush) return undefined
  const [left, top, right, bottom] = borderSides.value
  const uniform = left === top && top === right && right === bottom
  if (uniform) {
    return isZeroLength(left) ? undefined : `inset 0 0 0 ${left} ${brush}`
  }
  const layers: string[] = []
  if (!isZeroLength(left)) layers.push(`inset ${left} 0 0 0 ${brush}`)
  if (!isZeroLength(top)) layers.push(`inset 0 ${top} 0 0 ${brush}`)
  if (!isZeroLength(right)) layers.push(`inset -${right} 0 0 0 ${brush}`)
  if (!isZeroLength(bottom)) layers.push(`inset 0 -${bottom} 0 0 ${brush}`)
  return layers.length > 0 ? layers.join(', ') : undefined
})

// —— 圆角:XAML CornerRadius 四值序与 CSS border-radius 一致,直接映射;
// 两值形式 XAML 未定义,按 CSS 对角语义(tl/br、tr/bl)透传 ——
const cornerRadiusStyle = computed<string>(() => {
  const value = props.cornerRadius
  if (value === undefined || value === '') return '0px'
  if (typeof value === 'number') return `${Math.max(0, value)}px`
  const lengths: string[] = []
  for (const part of value.split(/[\s,]+/)) {
    const length = toCssLength(part)
    if (length !== null) lengths.push(length)
  }
  if (lengths.length === 0) return '0px'
  if (lengths.length === 1) return lengths[0]
  return lengths.join(' ')
})

// —— 内边距:XAML 四值序(left,top,right,bottom)转 CSS 序(top,right,bottom,left) ——
const paddingStyle = computed<string | undefined>(() => {
  if (props.padding === undefined || props.padding === '') return undefined
  const [left, top, right, bottom] = parseSides(props.padding)
  return `${top} ${right} ${bottom} ${left}`
})

const rootStyle = computed(() => ({
  background: props.background,
  borderRadius: cornerRadiusStyle.value,
  padding: paddingStyle.value,
  boxShadow: boxShadow.value,
}))
</script>

<template>
  <!-- 装饰容器:无交互态与业务事件;class/style 经 $attrs 透传,默认 slot 即 XAML Child(单子元素) -->
  <div v-bind="$attrs" class="wui-border" :style="rootStyle">
    <slot />
  </div>
</template>

<style scoped>
.wui-border {
  /* padding 计入自身尺寸;WinUI Border 默认 HorizontalAlignment=Stretch:
     块级元素天然横向撑满,竖向高度由内容决定(差异见 wiki) */
  box-sizing: border-box;
}
</style>
