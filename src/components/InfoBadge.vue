<script setup lang="ts">
// InfoBadge.vue —— WinUI InfoBadge 控件的 Web 复刻(阶段 3 通知类控件)。
// 视觉与形态对照源:CK/WinUI-Reference/controls/dev/InfoBadge/InfoBadge_themeresources.xaml
// (DefaultInfoBadgeStyle 的 ControlTemplate)与 InfoBadge.cpp 的 OnDisplayKindPropertiesChanged:
//   - 三个 DisplayKindStates 视觉态:Dot(点)/ Value(数字)/ Icon(FontIcon 字形与通用图标,
//     源模板族 AttentionValue/IconInfoBadgeStyle 等即按这三形态成族);
//   - 形态判定优先级与源一致:value >= 0 → Value;否则 IconSource → FontIcon/Icon;否则 Dot;
//   - 尺寸 token:Min 4x4、MaxHeight 16、值字号 11、图标盒 12x(8/9)、三态内边距(见样式注释);
//   - 胶囊圆角:源 OnSizeChanged 以 ActualHeight/2 动态计算,Web 以 9999px 等价(cap 到半高)。
// 非交互控件:源 IsTabStop=False、模板无 PointerOver/Pressed/Disabled/Focus 状态,故无事件、无交互态;
// 四档配色(success/informational/warning/critical)与 InfoBar 对齐,PL16 起直引
// SystemFillColor* 语义 token(--wui-system-fill-color-*);默认 accent 底/前景直引
// AccentFillColorDefaultBrush / TextOnAccentFillColorPrimaryBrush(--wui-accent-fill-color-default /
// --wui-text-on-accent-fill-color-primary),token 自身随主题换档。
import { computed, useSlots, watchEffect } from 'vue'
import type { CSSProperties } from 'vue'

/** 徽标配色档位:default 为源默认强调色底,其余四档与 InfoBar 的 severity 对齐。 */
type InfoBadgeSeverity = 'default' | 'informational' | 'success' | 'warning' | 'critical'

/** 显示形态(对应源 DisplayKindStates:Dot/Value/FontIcon/Icon)。 */
type InfoBadgeKind = 'dot' | 'value' | 'fontIcon' | 'icon'

const props = withDefaults(
  defineProps<{
    /** 徽标数值:>= 0 渲染为数字;-1(默认)与负值渲染为点状。源对 < -1 抛异常,Web 侧从宽(见 wiki)。 */
    value?: number
    /** 字体图标字形(单字符 Unicode,如 '\uF13F'),对应源 FontIconSource → FontIcon 态。 */
    iconSource?: string
    /** 配色档位;缺省 default(源默认强调色底,等同源 Attention 以强调色系呈现的观感取最近似 token)。 */
    severity?: InfoBadgeSeverity
    /** 底色覆盖(任意 CSS 颜色;源为 Control.Background,官方示例即以 Background 定制徽标)。 */
    background?: string
    /** 前景覆盖(任意 CSS 颜色;数字/字形颜色,缺省 TextOnAccent 系的最近似 token)。 */
    foreground?: string
    /** 内边距;数字按 px,字符串原样。源部分图标样式族带 Padding 0,4,0,2,需要时可手动传入。 */
    padding?: number | string
    /** 圆角覆盖;缺省胶囊(半高),对应源 InfoBadgeCornerRadius = ActualHeight/2。 */
    cornerRadius?: number | string
  }>(),
  {
    value: -1,
    severity: 'default',
  },
)

defineOptions({
  // class/style 由根节点 v-bind="$attrs" 透传;定位场景(position 上的覆盖)由此生效。
  inheritAttrs: false,
})

// —— 形态判定(InfoBadge.cpp OnDisplayKindPropertiesChanged 的优先级)——
const slots = useSlots()

const kind = computed<InfoBadgeKind>(() => {
  if (props.value >= 0) return 'value'
  if (props.iconSource) return 'fontIcon'
  if (slots.default) return 'icon'
  return 'dot'
})

// 源对 value < -1 抛 hresult_out_of_bounds;Web 侧不中断渲染,开发期给出等价提示。
watchEffect(() => {
  if (import.meta.env.DEV && props.value < -1) {
    console.warn(`[InfoBadge] Value must be equal to or greater than -1 (got ${props.value}).`)
  }
})

// —— 属性解析:数字 → px,字符串透传 ——
function resolveLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value
}

// 覆盖色经 CSS 变量注入「Normal 值」;优先级高于 severity 档位类(与 TemplateBinding 覆盖样式一致)。
const rootStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {}
  if (props.background !== undefined) style['--wui-info-badge-local-background'] = props.background
  if (props.foreground !== undefined) style['--wui-info-badge-local-foreground'] = props.foreground
  if (props.padding !== undefined) style.padding = resolveLength(props.padding)
  if (props.cornerRadius !== undefined) style.borderRadius = resolveLength(props.cornerRadius)
  return style
})

// 无障碍:value 徽标以 role="status" 播报数值变化(对应官方在宿主上标注
// AutomationProperties.Name="Inbox, 5 notifications" 的做法,宿主也可另行覆盖);
// 点状/图标徽标默认对辅助技术隐藏(装饰性),调用方可经 attrs 提供语义。
const isValueKind = computed(() => kind.value === 'value')
</script>

<template>
  <span
    class="wui-info-badge"
    :class="[`wui-info-badge--${severity}`, `wui-info-badge--${kind}`]"
    :style="rootStyle"
    :role="isValueKind ? 'status' : undefined"
    :aria-label="isValueKind ? String(value) : undefined"
    :aria-hidden="isValueKind ? undefined : true"
    v-bind="$attrs"
  >
    <span v-if="kind === 'value'" class="wui-info-badge__value">{{ value }}</span>
    <span v-else-if="kind === 'fontIcon'" class="wui-info-badge__font-icon">{{ iconSource }}</span>
    <span v-else-if="kind === 'icon'" class="wui-info-badge__icon"><slot /></span>
  </span>
</template>

<style scoped>
.wui-info-badge {
  /* —— 配色层(PL16:全部重定向到 PL2 Fluent 画刷族;权威 =
     controls/dev/InfoBadge/InfoBadge_themeresources.xaml Default L5-6 / Light L16-17:
     InfoBadgeBackground = AccentFillColorDefaultBrush、InfoBadgeForeground =
     TextOnAccentFillColorPrimaryBrush;severity 档位按源 Attention/Informational/Success/
     Caution/Critical 的 SystemFill 语义色)。token 自身随主题换档,故删除原
     html[data-theme='dark'] 覆写块(值等价)。调用方仍可用同名变量覆盖。 —— */
  --wui-info-badge-color-informational: var(--wui-system-fill-color-solid-neutral); /* SystemFillColorSolidNeutralBrush */
  --wui-info-badge-color-success: var(--wui-system-fill-color-success); /* SystemFillColorSuccessBrush */
  --wui-info-badge-color-warning: var(--wui-system-fill-color-caution); /* SystemFillColorCautionBrush */
  --wui-info-badge-color-critical: var(--wui-system-fill-color-critical); /* SystemFillColorCriticalBrush */
  --wui-info-badge-icon-height: 9px; /* InfoBadgeIconHeight(Light) */
  --wui-info-badge-value-font-size: 11px; /* InfoBadgeValueFontSize */
  /* InfoBadgeBackground = AccentFillColorDefaultBrush(Light = SystemAccentColorDark1) */
  --wui-info-badge-background: var(--wui-accent-fill-color-default);
  /* InfoBadgeForeground = TextOnAccentFillColorPrimaryBrush(Light #FFFFFF / Default #000000) */
  --wui-info-badge-foreground: var(--wui-text-on-accent-fill-color-primary);

  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4px; /* InfoBadgeMinWidth */
  min-height: 4px; /* InfoBadgeMinHeight */
  max-height: 16px; /* InfoBadgeMaxHeight */
  padding: 0; /* InfoBadgePadding */
  /* 源以 ActualHeight/2 动态计算胶囊圆角;border-radius 会自动 cap 到半边长,效果等价 */
  border-radius: 9999px;
  /* InfoBadgeForeground = TextOnAccentFillColorPrimaryBrush(经局部 token 覆盖优先) */
  color: var(--wui-info-badge-local-foreground, var(--wui-info-badge-foreground));
  /* InfoBadgeBackground = AccentFillColorDefaultBrush(经局部 token 覆盖优先) */
  background: var(--wui-info-badge-local-background, var(--wui-info-badge-background));
  font-family: var(--wui-content-control-theme-font-family);
  line-height: 1;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

/* 深色主题:仅图标盒高为几何差异(Light 9 → Default 8),其余着色 token 自身换档 */
html[data-theme='dark'] .wui-info-badge {
  --wui-info-badge-icon-height: 8px; /* InfoBadgeIconHeight(Default) */
}

/* —— 档位底色(源 Attention/Informational/Success/Caution/Critical …DotInfoBadgeStyle 的 Background);
   background 覆盖经局部变量优先,与源 TemplateBinding 被本地值覆盖的行为一致 —— */
.wui-info-badge--informational {
  background: var(--wui-info-badge-local-background, var(--wui-info-badge-color-informational));
}

.wui-info-badge--success {
  background: var(--wui-info-badge-local-background, var(--wui-info-badge-color-success));
}

.wui-info-badge--warning {
  background: var(--wui-info-badge-local-background, var(--wui-info-badge-color-warning));
}

.wui-info-badge--critical {
  background: var(--wui-info-badge-local-background, var(--wui-info-badge-color-critical));
}

/* —— 三形态内部元素(margin 为 XAML Thickness 左,上,右,下 → CSS 上 右 下 左)—— */

/* Value 态:ValueTextBlock,ValueInfoBadgeTextMargin = 4,0,4,2 */
.wui-info-badge__value {
  font-size: var(--wui-info-badge-value-font-size);
  /* 11px 字号的自然行高 ≈ 14px,加底部 2px 即源 MaxHeight 16 的数字徽标高度 */
  line-height: 14px;
  margin: 0 4px 2px 4px;
}

/* FontIcon 态:IconPresenter,IconInfoBadgeFontIconMargin = 4,0,4,2 */
.wui-info-badge__font-icon {
  font-family: var(--wui-symbol-theme-font-family);
  /* 源经 Viewbox 把字形盒缩到 IconHeight(8/9px);Web 以 12px 字形盒直渲染,见 wiki 差异节 */
  font-size: 12px;
  line-height: 1;
  margin: 0 4px 2px 4px;
}

/* Icon 态:IconPresenter,IconInfoBadgeIconMargin = 4,4,4,4;盒取 IconWidth/IconHeight */
.wui-info-badge__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px; /* InfoBadgeIconWidth */
  height: var(--wui-info-badge-icon-height); /* InfoBadgeIconHeight */
  margin: 4px 4px 4px 4px;
  overflow: hidden;
}

/* 槽位内容不缩放(未复刻 Viewbox),仅限制不越界;尺寸由调用方内容自定 */
.wui-info-badge__icon > * {
  max-width: 100%;
  max-height: 100%;
}
</style>
