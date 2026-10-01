<script setup lang="ts">
// AnimatedIcon 示例页:对照官方 WinUI Gallery AnimatedIconPage 的两种交互模式 ——
//   示例 1:按钮宿主 + PointerEntered/Exited 中 AnimatedIcon.SetState("PointerOver"/"Normal");
//   示例 2:NavigationViewItem.Icon 内嵌 AnimatedIcon,宿主控件代设状态(FallbackIconSource 为 FontIconSource \uE713)。
// 另提供:三内置源自治演示(hover/press 直接观察)、FallbackIconSource 降级对照(字形 / SVG)。
import { computed, ref } from 'vue'
import WuiAnimatedIcon from '@/components/AnimatedIcon.vue'
import WuiButton from '@/components/Button.vue'
import {
  ANIMATED_ICON_BUILTIN_SOURCES,
  AnimatedChevronUpDownSmallVisualSource,
  AnimatedSettingsVisualSource,
  type AnimatedIconFallbackSource,
  type AnimatedIconState,
} from '@/components/AnimatedIconSource'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 演示一:按钮宿主 + 手动状态(官方示例 1 复刻,state prop = SetState 等价入口)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const kindChoice = ref<string | number | boolean>(AnimatedChevronUpDownSmallVisualSource.name)
const kindOptions = ANIMATED_ICON_BUILTIN_SOURCES.map((source) => ({
  label: source.name,
  value: source.name,
}))
const hostSize = ref<string | number | boolean>(20)
const hostDisabled = ref<string | number | boolean>(false)
const hostForceFallback = ref<string | number | boolean>(false)

// 官方 C#:Button_PointerEntered → SetState(icon, "PointerOver");Button_PointerExited → "Normal"
const hostState = ref<AnimatedIconState>('Normal')

const kindSource = computed(() => {
  const found = ANIMATED_ICON_BUILTIN_SOURCES.find(
    (source) => source.name === String(kindChoice.value),
  )
  return found ?? AnimatedChevronUpDownSmallVisualSource
})

const hostSizeValue = computed(() => Number(hostSize.value) || 20)
const hostDisabledValue = computed(() => hostDisabled.value === true)
const hostForceFallbackValue = computed(() => hostForceFallback.value === true)

function hostEnter(): void {
  hostState.value = 'PointerOver'
}

function hostLeave(): void {
  hostState.value = 'Normal'
}

// 官方示例 1 的降级源:SymbolIconSource Symbol="Find"(Symbol 枚举 Find = \uE721)
const findFallback: AnimatedIconFallbackSource = { type: 'font', glyph: '\uE721' }

// —— 演示二:三种内置源(自治模式,hover / press 直接观察)——
const SOURCE_BEHAVIOR: Record<string, string> = {
  AnimatedChevronUpDownSmallVisualSource:
    '悬停翻面(下 → 上),按压收缩反馈(Expander / ComboBox 下拉 chevron)',
  AnimatedSettingsVisualSource: '悬停转过 120°,按压整转 360°(设置齿轮)',
  AnimatedPlayPauseVisualSource: '悬停在播放三角 / 暂停双条两形间切换,按压收缩反馈',
}

// —— 演示三:NavigationViewItem 式宿主驱动(官方示例 2 复刻)——
const navState = ref<AnimatedIconState>('Normal')

function navEnter(): void {
  navState.value = 'PointerOver'
}

function navLeave(): void {
  navState.value = 'Normal'
}

function navDown(): void {
  navState.value = 'Pressed'
}

function navUp(): void {
  navState.value = 'PointerOver'
}

// 官方示例 2 的降级源:FontIconSource Glyph="\uE713"
const settingsFallback: AnimatedIconFallbackSource = { type: 'font', glyph: '\uE713' }

// —— 演示四:降级源对照 ——
// 字形降级沿用官方示例 1 的 Find 符号;SVG 降级用等价的放大镜内联标记(SVG 复刻 Symbol Find)。
const fontFallback: AnimatedIconFallbackSource = { type: 'font', glyph: '\uE721' }
const svgFallback: AnimatedIconFallbackSource = {
  type: 'svg',
  viewBox: '0 0 16 16',
  markup:
    '<circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '<path d="m10.6 10.6 2.9 2.9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
}

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['source', 'AnimatedIconSource', 'null', '图标源(见「源约定」);缺省或 kind 未知时走 fallback'],
  [
    'fallback',
    "AnimatedIconFallbackSource(type: 'font' | 'svg')",
    'null',
    '降级源(WinUI FallbackIconSource):源不可用 / forceFallback / prefers-reduced-motion 时渲染',
  ],
  [
    'state',
    "'Normal' | 'PointerOver' | 'Pressed' | 'Disabled'",
    'null(自治)',
    '宿主驱动状态(SetState 等价,受控模式);缺省时组件自治跟踪 hover / press',
  ],
  [
    'disabled',
    'boolean',
    'false',
    '禁用:恒呈 Disabled 态(优先于 state),图标取禁用色 token',
  ],
  [
    'forceFallback',
    'boolean',
    'false',
    '强制走降级源(Web 扩展:演示降级效果 / 不支持动画的环境)',
  ],
  ['size', 'number | string', '20', '图标尺寸(px 或 CSS 长度;WinUI 经 Width/Height 由使用方设定)'],
  ['foreground', 'string', '继承 currentColor', '前景色;Disabled 态强制禁用色 token'],
  [
    'progress',
    'number',
    '—',
    '播放进度 0–1(SetProgress 预留):写入 --wui-animatedicon-progress 变量,CSS 源不消费',
  ],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  [
    '—(无业务事件)',
    '—',
    '纯展示图标:不派发事件、不参与焦点序;aria-hidden 默认 true(可经 attrs 覆盖),可访问名由宿主控件承载',
  ],
]

const sourceHeaders = ['内置源(name)', '状态行为(Normal → PointerOver → Pressed)', '过渡档']
const sourceRows: (string | number)[][] = ANIMATED_ICON_BUILTIN_SOURCES.map((source) => [
  source.name,
  SOURCE_BEHAVIOR[source.name] ?? '—',
  source.transitionSpeed ?? 'normal',
])

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () =>
    `<!-- 源对象来自 '@/components/AnimatedIconSource'(AnimatedIconSource 约定) -->
<WuiAnimatedIcon
  :source="AnimatedSettingsVisualSource"
  :fallback="{ type: 'font', glyph: '\\uE713' }"
  :size="${hostSizeValue.value}"
  :disabled="${hostDisabledValue.value}"
  :force-fallback="${hostForceFallbackValue.value}"
  :state="'PointerOver'" />`,
)
</script>

<template>
  <DemoPage wiki="AnimatedIcon"
    title="AnimatedIcon"
    description="随交互状态(Normal / PointerOver / Pressed / Disabled)播放动画的图标元素:源对象(Source)声明 SVG 部件与状态机,控件负责渲染与状态驱动;源不可用时降级为静态字形 / SVG(FallbackIconSource)。本阶段为源接口与 CSS/SVG 源验证,完整 Lottie 源体系留后续。"
  >
    <template #demo>
      <div class="animated-stage">
        <!-- 演示一:按钮宿主 + 手动状态(官方示例 1 复刻) -->
        <section class="demo-group">
          <h3 class="group-title">按钮宿主 + 手动状态(官方示例 1 复刻)</h3>
          <p class="group-note">
            对照官方:C# 在按钮 PointerEntered / PointerExited 中调用
            AnimatedIcon.SetState(icon, "PointerOver" / "Normal"),此处以 state prop 等价驱动。
            Kind 下拉切换内置源、尺寸 / Disabled / 强制降级见参数面板。
          </p>
          <div class="stage-row">
            <WuiButton
              class="host-button"
              aria-label="AnimatedIcon 演示按钮"
              :disabled="hostDisabledValue"
              @pointerenter="hostEnter"
              @pointerleave="hostLeave"
            >
              <WuiAnimatedIcon
                :source="kindSource"
                :state="hostState"
                :fallback="findFallback"
                :size="hostSizeValue"
                :disabled="hostDisabledValue"
                :force-fallback="hostForceFallbackValue"
              />
            </WuiButton>
            <span class="state-chip" aria-live="polite">state = {{ hostState }}</span>
          </div>
        </section>

        <!-- 演示二:三种内置源(自治模式) -->
        <section class="demo-group">
          <h3 class="group-title">三种内置源(自治模式:hover / press 直接观察)</h3>
          <p class="group-note">
            未传 state,组件自治跟踪指针(hover → PointerOver,press → Pressed);悬停 / 按压每块图标观察状态切换。
          </p>
          <div class="source-grid">
            <div v-for="source in ANIMATED_ICON_BUILTIN_SOURCES" :key="source.name" class="source-tile">
              <WuiAnimatedIcon :source="source" :size="48" class="source-icon" />
              <span class="source-name">{{ source.name }}</span>
              <span class="source-note">{{ SOURCE_BEHAVIOR[source.name] }}</span>
            </div>
          </div>
        </section>

        <!-- 演示三:NavigationViewItem 式宿主驱动(官方示例 2 复刻) -->
        <section class="demo-group">
          <h3 class="group-title">NavigationViewItem 式宿主驱动(官方示例 2 复刻)</h3>
          <p class="group-note">
            官方将 AnimatedIcon 设为 NavigationViewItem.Icon,由宿主控件代设状态;此处以列表项宿主等价驱动
            state prop,降级源为 FontIconSource Glyph \uE713(与官方一致)。
          </p>
          <nav class="nav-demo">
            <WuiButton
              class="nav-item"
              @pointerenter="navEnter"
              @pointerleave="navLeave"
              @pointerdown="navDown"
              @pointerup="navUp"
            >
              <WuiAnimatedIcon
                :source="AnimatedSettingsVisualSource"
                :state="navState"
                :fallback="settingsFallback"
                :size="20"
              />
              <span>Game Settings</span>
            </WuiButton>
            <span class="state-chip" aria-live="polite">state = {{ navState }}</span>
          </nav>
        </section>

        <!-- 演示四:降级源对照 -->
        <section class="demo-group">
          <h3 class="group-title">降级源对照(FallbackIconSource)</h3>
          <p class="group-note">
            每行同一源的三种渲染:动画源 / forceFallback 字形降级(\uE721,等价官方 SymbolIconSource
            Find)/ SVG 型降级(内联 SVG 标记)。系统开启「减少动态效果」(prefers-reduced-motion)时组件自动降级,无需 forceFallback。
          </p>
          <div class="fallback-rows">
            <div v-for="source in ANIMATED_ICON_BUILTIN_SOURCES" :key="source.name" class="fallback-row">
              <span class="row-name">{{ source.name }}</span>
              <div class="fallback-cell">
                <WuiAnimatedIcon :source="source" :size="32" />
                <span class="cell-label">动画源</span>
              </div>
              <div class="fallback-cell">
                <WuiAnimatedIcon :source="source" :size="32" force-fallback :fallback="fontFallback" />
                <span class="cell-label">字形降级</span>
              </div>
              <div class="fallback-cell">
                <WuiAnimatedIcon :source="source" :size="32" force-fallback :fallback="svgFallback" />
                <span class="cell-label">SVG 降级</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Kind(内置源)" type="select" v-model="kindChoice" :options="kindOptions" />
        <DemoOptionRow label="尺寸(px)" type="slider" v-model="hostSize" :min="16" :max="64" :step="1" />
        <DemoOptionRow label="Disabled" type="toggle" v-model="hostDisabled" />
        <DemoOptionRow label="ForceFallback 强制降级" type="toggle" v-model="hostForceFallback" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">属性</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">内置源(实现 AnimatedIconSource 约定)</h3>
      <DemoDocsTable :headers="sourceHeaders" :rows="sourceRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.animated-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
}

.demo-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.group-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.group-note {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.stage-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 宿主按钮:改用库内 WuiButton(FIX24)承载图标,标准观感由 wui-button 提供,这里只管布局 */
.host-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 75px;
  height: 32px;
}

.state-chip {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 三内置源卡片 —— */
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.source-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 12px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.source-icon {
  color: var(--wui-application-foreground-theme);
}

.source-name {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.source-note {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  text-align: center;
}

/* —— NavigationViewItem 式宿主 —— */
.nav-demo {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 列表项宿主:改用库内 WuiButton(FIX24),这里覆盖为 NavigationViewItem 式透明观感 */
.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  padding: 4px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  font-family: inherit;
  color: var(--wui-application-foreground-theme);
  background: transparent;
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.nav-item:hover {
  background: var(--wui-system-control-background-list-low);
}

.nav-item:active {
  background: var(--wui-system-control-background-base-medium-low);
}

.nav-item:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

/* —— 降级对照 —— */
.fallback-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fallback-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  padding: 10px 12px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.row-name {
  flex: 1 1 220px;
  min-width: 200px;
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.fallback-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--wui-application-foreground-theme);
}

.cell-label {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
