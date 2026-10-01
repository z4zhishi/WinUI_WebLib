<script setup lang="ts">
// Border —— WinUI Border 的 Web 复刻:单子元素装饰容器(边框线、背景、圆角、内边距)。
// 对照 CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml:Border 不是 Control,
// 没有 ControlTemplate 与视觉状态树(布局类控件,无 PointerOver/Pressed/Focus 要求);
// 视觉默认值取 Border 属性默认:BorderThickness 0 / BorderBrush null(不绘制)/
// CornerRadius 0 / Padding 0 / Background null(透明)。
// 布局语义对照 CK/WinUI-Reference/dxaml/xcp/core/core/elements/Border.cpp
// CBorder::MeasureOverride(L211-236)+ HelperGetCombinedThickness:
//   combined = BorderThickness + Padding,childAvailableSize = MAX(0, available - combined),
//   desiredSize = childDesired + combined —— 边框厚度与内边距共同参与度量与排布,
//   子元素区按「厚度 + 内边距」内缩(厚度不计画刷,Brush=null 只是不绘制、内缩照旧)。
// 实现选型:CSS border + box-sizing: border-box 精确复刻该语义(边框画在盒缘内侧、
// 挤占 padding 与内容区);绘制位置与旧 inset box-shadow 方案一致(均在盒内缘)。
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** 边框厚度,XAML Thickness 形式:数字(四边一致,无单位按 px)/ "left,top" / "left,top,right,bottom";1/2/4 之外的计数(如 3 值)按首值四边一致宽容回退。 */
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

/** 全零边(CSS 长度四元组的零值)。 */
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

/**
 * 解析 XAML Thickness。官方级联为 4→2→1 值、每次都须精确消费全串
 * (CK/WinUI-Reference dxaml/xcp/components/xstring/StringConversions.cpp L1815 起 ThicknessFromString):
 * 4 值 "left,top,right,bottom";2 值 "left,top"(left/right=第 1、top/bottom=第 2);1 值四边一致。
 * 1/2/4 之外的计数(如 3 值)官方为解析失败;本组件按宽容回退取首值四边一致
 * (与官方 CornerRadius 回退同型,QA 裁决 ② 引用),绝不向 CSS 值泄漏 undefined。
 */
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
  if (lengths.length === 4) return [lengths[0], lengths[1], lengths[2], lengths[3]]
  if (lengths.length === 2) {
    const l = lengths[0]
    const t = lengths[1]
    return [l, t, l, t]
  }
  if (lengths.length >= 1) {
    const s = lengths[0]
    return [s, s, s, s]
  }
  return zeroSides()
}

// —— 边框:CSS border,四边独立厚度;Brush 缺省用透明色占位
//      (WinUI 厚度参与度量不依赖画刷:BorderBrush=null 只是不绘制,内缩照旧) ——
const borderSides = computed<Sides>(() => parseSides(props.borderThickness))

const borderStyle = computed<CSSProperties>(() => {
  const brush = props.borderBrush?.trim()
  const [left, top, right, bottom] = borderSides.value
  // CSS border-width 简写序为 top/right/bottom/left,Sides 序为 left/top/right/bottom
  return {
    borderStyle: 'solid',
    borderColor: brush ?? 'transparent',
    borderWidth: `${top} ${right} ${bottom} ${left}`,
  }
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

const rootStyle = computed<CSSProperties>(() => ({
  ...borderStyle.value,
  background: props.background,
  borderRadius: cornerRadiusStyle.value,
  padding: paddingStyle.value,
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
  /* WinUI Border 默认 HorizontalAlignment=Stretch:块级元素天然横向撑满,
     竖向高度由内容决定;border-box 使使用方给定的 Width/Height 为含边框的全盒
     (对应 WinUI Width/Height 为外尺寸、子区按「厚度 + Padding」内缩) */
  box-sizing: border-box;
}
</style>
