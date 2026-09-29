<script setup lang="ts">
// PathIcon —— WinUI PathIcon 的 Web 复刻:以矢量路径(XAML Geometry 迷你语言的 SVG 兼容子集)渲染的轻量图标。
// 对照 CK/WinUI-Reference 与官方示例:
//   - Data 属性接受 XAML 路径迷你语言字符串(如 "F1 M 16,12 20,2L 20,16 1,16");
//     前缀 F0/F1(填充规则)解析为 SVG fill-rule(evenodd/nonzero),其余指令与 SVG path d 语法兼容,
//     直接交给 <path d>;
//   - 官方示例(IconElementPathiconButton)按 20×20 坐标系绘制,缺省 viewBox 取 "0 0 20 20",
//     viewBox 可传入自定义坐标系;Web 侧以 <svg> 缩放呈现;
//   - 路径以前景色填充:fill=currentColor(foreground 可覆盖);默认无固定尺寸,收敛为 1em × 1em 盒(见 wiki);
//   - 图标为装饰性内容:默认 aria-hidden="true"(可经 attrs 覆盖)。
// 无视觉状态、无业务事件;可被其他控件内嵌。
import { computed, type CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 路径数据(必填):XAML 路径迷你语言(F0/F1 前缀可选),如 'F1 M 16,12 20,2L 20,16 1,16'。 */
    data: string
    /** SVG 坐标系,缺省 '0 0 20 20'(对照官方示例坐标系);与 data 的坐标系保持一致。 */
    viewBox?: string
    /** 前景色,任意 CSS 颜色/变量;缺省继承 currentColor。 */
    foreground?: string
  }>(),
  {
    viewBox: '0 0 20 20',
  },
)

defineOptions({ inheritAttrs: false })

// —— 解析 F0/F1 前缀 → SVG fill-rule,余下指令原样作为 d ——
// XAML 迷你语言缺省填充规则为 EvenOdd(MS Learn Path Markup Syntax:F0=EvenOdd 为缺省,
// F1=Nonzero 需显式),故无前缀时回退 evenodd 而非 SVG 的 nonzero(SVG fill-rule 缺省);
// F 与后续指令间允许无空白(XAML 宽松解析,如 "F1M16,12"),路径命令不含 F,前缀判定无歧义。
const parsedPath = computed<{ d: string; fillRule: 'nonzero' | 'evenodd' }>(() => {
  const raw = props.data.trim()
  if (/^F0/i.test(raw)) return { d: raw.slice(2).trim(), fillRule: 'evenodd' }
  if (/^F1/i.test(raw)) return { d: raw.slice(2).trim(), fillRule: 'nonzero' }
  return { d: raw, fillRule: 'evenodd' }
})

const rootStyle = computed<CSSProperties>(() => ({
  color: props.foreground,
}))
</script>

<template>
  <!-- 图标为装饰性内容:默认 aria-hidden,写于 v-bind="$attrs" 之前以便调用方覆盖 -->
  <span aria-hidden="true" v-bind="$attrs" class="wui-pathicon" :style="rootStyle">
    <svg
      class="wui-pathicon__svg"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      focusable="false"
      aria-hidden="true"
    >
      <path :d="parsedPath.d" :fill-rule="parsedPath.fillRule" fill="currentColor" />
    </svg>
  </span>
</template>

<style scoped>
.wui-pathicon {
  display: inline-flex;
  /* 默认 1em × 1em:随 font-size 缩放;调用方可经 style width/height 覆盖 */
  width: 1em;
  height: 1em;
  user-select: none;
  -webkit-user-select: none;
}

.wui-pathicon__svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
