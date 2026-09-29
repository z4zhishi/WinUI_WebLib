<script setup lang="ts">
// SymbolIcon —— WinUI SymbolIcon 的 Web 复刻:以 Symbol 枚举名渲染对应 Segoe 图形字形的轻量图标。
// 对照 CK/WinUI-Reference 源码:
//   - 枚举成员与「名称 → 推荐码点」映射来自
//     dxaml/xcp/dxaml/idl/winrt/controls/microsoft.ui.xaml.controls.controls2.idl(enum Symbol,197 项)
//     与 dxaml/xcp/core/core/elements/icon.cpp(ConvertSymbolValueToGlyph,旧码点重映射到 E7+ 推荐区),
//     数据表见 src/utils/symbolIcons.ts(生成物);
//   - 内部 TextBlock 使用 "Segoe Fluent Icons" 字体、Normal 字重、默认字号 20(g_ClientCoreFontSize),
//     对应 theme.css 的 --wui-symbol-theme-font-family(R1:不加载网络字体);
//   - 字形文本对辅助技术隐藏(AccessibilityView=Raw 等价):默认 aria-hidden="true",可经 attrs 覆盖。
// WinUI SymbolIcon 未公开 FontSize;本组件提供同名能力(缺省同内部默认 20),差异记录于 wiki。
// 无视觉状态、无业务事件;foreground 缺省继承 currentColor,可被其他控件内嵌。
import { computed } from 'vue'
import { SYMBOL_DEFAULT, symbolToGlyph, type SymbolValue } from '@/utils/symbolIcons'

const props = withDefaults(
  defineProps<{
    /** WinUI Symbol 枚举成员名(如 'Accept' / 'Setting');映射表见 src/utils/symbolIcons.ts。 */
    symbol?: SymbolValue
    /** 字号:数字按 px,字符串原样作为 CSS 长度;缺省 20(WinUI 内部渲染字号;官方未公开此属性,为 Web 侧扩展)。 */
    fontSize?: number | string
    /** 前景色,任意 CSS 颜色/变量;缺省继承 currentColor。 */
    foreground?: string
  }>(),
  {
    symbol: SYMBOL_DEFAULT,
    fontSize: 20,
  },
)

defineOptions({ inheritAttrs: false })

// —— 字形解析:枚举名 → 图形字符;未知名称(运行期直传字符串)渲染为空,与「无此字形」观感一致 ——
const glyphChar = computed(() => symbolToGlyph(props.symbol) ?? '')

// —— 字号归一:数字 → px,字符串透传 ——
const fontSizeStyle = computed<string>(() => {
  const value = props.fontSize
  return typeof value === 'number' ? `${value}px` : value
})

const rootStyle = computed(() => ({
  fontSize: fontSizeStyle.value,
  color: props.foreground,
}))
</script>

<template>
  <!-- 图标为装饰性内容:默认 aria-hidden,写于 v-bind="$attrs" 之前以便调用方覆盖 -->
  <span aria-hidden="true" v-bind="$attrs" class="wui-symbolicon" :style="rootStyle">{{ glyphChar }}</span>
</template>

<style scoped>
.wui-symbolicon {
  display: inline-block;
  /* 行高收敛为 1:与 FontIcon 一致,字形盒高等于字号 */
  line-height: 1;
  color: inherit;
  /* WinUI 内部 TextBlock 固定 Normal 字重/字形 + 图标字体栈 */
  font-weight: 400;
  font-style: normal;
  font-family: var(--wui-symbol-theme-font-family);
  user-select: none;
  -webkit-user-select: none;
}
</style>
