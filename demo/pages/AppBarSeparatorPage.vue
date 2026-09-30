<script setup lang="ts">
// AppBarSeparatorPage.vue —— AppBarSeparator 示例页。
// 结构对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/AppBarSeparator/(AppBarSeparatorPage.xaml:
// CommandBar.PrimaryCommands 里 AppBarButton 之间夹 AppBarSeparator,Attach Camera | Like / Dislike |
// Orientation 三组);命令按钮用本库 AppBarButton(同阶段命令栏族组件)承载。
// 另设 FullSize / Compact 对照区(分隔线收窄到 AppBarThemeCompactHeight=48px 的效果)与
// Overflow 溢出样式区(横向分隔线,对应 UseOverflowStyle)。
import { computed, ref } from 'vue'
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiAppBarSeparator from '@/components/AppBarSeparator.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// DemoOptionRow 的 v-model 契约要求联合类型(toggle → boolean,slider → number,select → string)
type OptionValue = string | number | boolean

function asNumber(value: OptionValue, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// —— 官方示例区参数 ——
// 官方命令按钮组:AttachCamera | Like / Dislike | Orientation(Segoe Fluent Icons 字形)
const COMMAND_GROUPS: { glyph: string; label: string }[][] = [
  [{ glyph: '\uE71B', label: 'Attach Camera' }],
  [
    { glyph: '\uE8FB', label: 'Like' },
    { glyph: '\uE8DB', label: 'Dislike' },
  ],
  [{ glyph: '\uE7C5', label: 'Orientation' }],
]

const isCompact = ref<OptionValue>(false)
const isCompactButtons = ref<OptionValue>(false)
const barHeight = ref<OptionValue>(64)
const isCompactValue = computed(() => isCompact.value === true)
const isCompactButtonsValue = computed(() => isCompactButtons.value === true)
const barHeightValue = computed(() => asNumber(barHeight.value, 64))
const barHeightPx = computed(() => `${barHeightValue.value}px`)

// —— 溢出样式区参数 ——
const useOverflowStyle = ref<OptionValue>(false)
const useOverflowStyleValue = computed(() => useOverflowStyle.value === true)

// —— Foreground 选项(演示自定义分隔线颜色) ——
const foregroundMode = ref<OptionValue>('default')
const foregroundValue = computed<string | undefined>(() => {
  switch (foregroundMode.value) {
    case 'accent':
      return 'var(--wui-system-accent-color)'
    case 'steelblue':
      return 'SteelBlue'
    default:
      return undefined // 缺省走组件内主题 token
  }
})

// —— 下半区固定开发文档 ——
const propertyHeaders = ['属性', '类型', '默认值', '说明']
const propertyRows: (string | number)[][] = [
  [
    'isCompact',
    'boolean',
    'false',
    '是否以 compact(紧凑)态渲染:高度收窄到 AppBarThemeCompactHeight(48px)并顶部对齐,不再拉伸填满命令栏(官方示例区开关实时生效)',
  ],
  [
    'useOverflowStyle',
    'boolean',
    'false',
    '是否套用溢出(Overflow)区样式:竖分隔线变为 1px 横向分隔线(上下 4px 边距),aria-orientation 同步为 horizontal',
  ],
  [
    'foreground',
    'string',
    '官方源值局部 token',
    '分隔线颜色,任意 CSS 颜色或 --wui-* 变量(对应 WinUI Foreground;缺省用官方 DividerStrokeColorDefault 源值:浅色 #0000000f ≈5.9% 黑 / 深色 #ffffff15 ≈8.2% 白,随主题切换)',
  ],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  [
    '—(无业务事件)',
    '—',
    'AppBarSeparator 为非交互装饰件(WinUI 模板 IsTabStop=False,无 PointerOver/Pressed/Disabled 视觉状态),不声明业务事件;原生 DOM 事件照常触发',
  ],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」映射
const usageCode = computed(() => {
  const attrs: string[] = []
  if (isCompactValue.value) attrs.push('is-compact')
  if (useOverflowStyleValue.value) attrs.push('use-overflow-style')
  return `<WuiAppBarSeparator${attrs.length > 0 ? ` ${attrs.join(' ')}` : ''} />`
})
</script>

<template>
  <DemoPage
    title="AppBarSeparator"
    description="在命令栏里用一条竖线分隔多组命令的装饰件:默认拉伸填满命令栏行高,IsCompact 时收窄到 48px 顶对齐以匹配紧凑命令按钮;UseOverflowStyle 时变为溢出区的横向细分隔线。"
  >
    <template #demo>
      <div class="separator-stage">
        <!-- 示例 1:官方示例对照(CommandBar.PrimaryCommands 三组命令,组间夹 AppBarSeparator) -->
        <div class="example-item">
          <p class="example-caption">
            官方示例对照:AppBarButtons separated by AppBarSeparators —— Attach Camera | Like / Dislike |
            Orientation 三组,组间两条分隔线;「IsCompact」开关实时收窄分隔线,「IsCompact(命令按钮)」同步
            收紧 AppBarButton,对照紧凑态的配对效果
          </p>
          <div class="command-bar" :style="{ height: barHeightPx }">
            <template v-for="(group, gi) in COMMAND_GROUPS" :key="gi">
              <WuiAppBarSeparator v-if="gi > 0" :is-compact="isCompactValue" :foreground="foregroundValue" />
              <WuiAppBarButton
                v-for="cmd in group"
                :key="cmd.label"
                class="command-button"
                :label="cmd.label"
                :is-compact="isCompactButtonsValue"
              >
                <template #icon>
                  <WuiFontIcon :glyph="cmd.glyph" :font-size="16" />
                </template>
              </WuiAppBarButton>
            </template>
          </div>
        </div>

        <!-- 示例 2:FullSize / Compact 对照(同一条分隔线的两种状态) -->
        <div class="example-item">
          <p class="example-caption">
            FullSize 与 Compact 对照:默认态分隔线拉伸填满命令栏行高(滑块调节);compact 态收窄到 48px
            并顶部对齐,与紧凑命令按钮的高度对齐
          </p>
          <div class="contrast-row">
            <div class="contrast-cell">
              <div class="contrast-track" :style="{ height: barHeightPx }">
                <WuiAppBarSeparator :foreground="foregroundValue" />
              </div>
              <p class="contrast-caption">FullSize(默认,拉伸)</p>
            </div>
            <div class="contrast-cell">
              <div class="contrast-track" :style="{ height: barHeightPx }">
                <WuiAppBarSeparator is-compact :foreground="foregroundValue" />
              </div>
              <p class="contrast-caption">IsCompact(收窄到 48px)</p>
            </div>
          </div>
        </div>

        <!-- 示例 3:溢出(Overflow)样式 -->
        <div class="example-item">
          <p class="example-caption">
            溢出样式(UseOverflowStyle):命令被收进溢出菜单后,分隔线变为横向 1px 细线;开关切换竖 / 横两种形态
          </p>
          <div v-if="!useOverflowStyleValue" class="mini-bar">
            <span class="mini-text">命令 A</span>
            <WuiAppBarSeparator :foreground="foregroundValue" />
            <span class="mini-text">命令 B</span>
          </div>
          <div v-else class="overflow-list">
            <p class="mini-text">溢出菜单项 1</p>
            <WuiAppBarSeparator use-overflow-style :foreground="foregroundValue" />
            <p class="mini-text">溢出菜单项 2</p>
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <h4 class="group-title">官方示例区(分隔线状态与命令栏高度)</h4>
      <DemoOptions :columns="2">
        <DemoOptionRow label="IsCompact(分隔线)" type="toggle" v-model="isCompact" />
        <DemoOptionRow label="命令栏高度" type="slider" v-model="barHeight" :min="48" :max="96" :step="4" />
        <DemoOptionRow label="IsCompact(命令按钮)" type="toggle" v-model="isCompactButtons" />
      </DemoOptions>

      <h4 class="group-title">溢出样式与外观</h4>
      <DemoOptions :columns="2">
        <DemoOptionRow label="UseOverflowStyle" type="toggle" v-model="useOverflowStyle" />
        <DemoOptionRow
          label="Foreground"
          type="select"
          v-model="foregroundMode"
          :options="[
            { label: '默认(主题 token)', value: 'default' },
            { label: '强调色(accent)', value: 'accent' },
            { label: 'SteelBlue', value: 'steelblue' },
          ]"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">属性</h4>
      <DemoDocsTable :headers="propertyHeaders" :rows="propertyRows" />
      <p class="docs-note">
        注:组件固定输出 role="separator" 与 aria-orientation(竖线 vertical、溢出样式 horizontal),对辅助技术正确表达分隔语义。
      </p>
      <h4 class="docs-subtitle">事件</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.separator-stage {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 28px;
  width: 100%;
}

.example-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.example-caption {
  margin: 0;
  max-width: 560px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 命令栏行:透明底描边容器,内部命令按钮与分隔线同排拉伸 */
.command-bar {
  display: flex;
  align-items: stretch;
  padding: 0 4px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: var(--wui-application-page-background-theme);
}

.command-button {
  align-self: stretch;
}

/* FullSize / Compact 对照区 */
.contrast-row {
  display: flex;
  gap: 24px;
}

.contrast-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contrast-track {
  display: flex;
  padding: 0 4px;
  border: 1px dashed var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.contrast-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 溢出样式区 */
.mini-bar {
  display: flex;
  align-items: stretch;
  height: 56px;
  padding: 0 4px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.mini-text {
  align-self: center;
  padding: 0 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.overflow-list {
  width: 240px;
  padding: 4px 0;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: var(--wui-application-page-background-theme);
}

.group-title {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-note {
  margin: 8px 0 0;
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
