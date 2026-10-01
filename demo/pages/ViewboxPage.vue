<script setup lang="ts">
// Viewbox 示例页:参数面板实时调节主容器(对照官方 WinUI Gallery ViewboxPage 的
// Width/Height 滑块 + Stretch/StretchDirection 选项,子内容复刻 Border + 色条 + 图形 + 文本),
// 另固定呈现「四档 Stretch 对照」一排小容器;下半区为属性文档与用法代码。
import { computed, ref } from 'vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import WuiViewbox from '@/components/Viewbox.vue'
import type { ViewboxStretch, ViewboxStretchDirection } from '@/components/Viewbox.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Viewbox(内容缩放容器)', en: 'Viewbox' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '使用 Viewbox 将内容放大或缩小到指定尺寸:常用于把固定设计尺寸的界面(仪表盘、徽标、图例)按容器大小等比缩放。容器与内容由 ResizeObserver 实时测量。',
  en: 'Scale content up or down to a specified size — useful for fitting a fixed-size UI (dashboard, logo, legend) into a container. Container and content are measured live via ResizeObserver.',
}
const STRETCH_LABEL: BilingualText = { zh: '拉伸方式', en: 'Stretch' }
const SIZE_LABEL: BilingualText = { zh: '当前容器', en: 'Container' }
const COMPARE_LABEL: BilingualText = {
  zh: '四档 stretch 对照(同一内容,110 × 110 容器)',
  en: 'Stretch comparison (same content, 110 × 110)',
}

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const stretchLabel = useBilingual(i18n, STRETCH_LABEL)
const sizeLabel = useBilingual(i18n, SIZE_LABEL)
const compareLabel = useBilingual(i18n, COMPARE_LABEL)

// —— 可调参数(DemoOptionRow 的 v-model 契约:联合类型)——
const width = ref<string | number | boolean>(200)
const height = ref<string | number | boolean>(200)
const stretch = ref<string | number | boolean>('Uniform')
const stretchDirection = ref<string | number | boolean>('Both')
const maxWidth = ref<string | number | boolean>(0)
const maxHeight = ref<string | number | boolean>(0)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const widthValue = computed(() => toNumber(width.value, 200))
const heightValue = computed(() => toNumber(height.value, 200))
const stretchValue = computed(() => String(stretch.value) as ViewboxStretch)
const stretchDirectionValue = computed(() => String(stretchDirection.value) as ViewboxStretchDirection)
// 0 视为不限制(转换为 undefined,不写 inline 样式)
const maxWidthValue = computed(() => {
  const value = toNumber(maxWidth.value, 0)
  return value > 0 ? value : undefined
})
const maxHeightValue = computed(() => {
  const value = toNumber(maxHeight.value, 0)
  return value > 0 ? value : undefined
})

const STRETCH_CHOICES = [
  { label: 'Uniform(等比 · 取最小比例)', value: 'Uniform' },
  { label: 'UniformToFill(等比 · 取最大比例,溢出裁剪)', value: 'UniformToFill' },
  { label: 'Fill(拉伸填满,不保持比例)', value: 'Fill' },
  { label: 'None(原尺寸,不缩放)', value: 'None' },
]

const STRETCH_DIRECTION_CHOICES = [
  { label: 'UpOnly(只放大)', value: 'UpOnly' },
  { label: 'DownOnly(只缩小)', value: 'DownOnly' },
  { label: 'Both(放大与缩小)', value: 'Both' },
]

// —— 四档 stretch 对照(顺序与官方示例的 RadioButtons 一致)——
const STRETCH_COMPARISONS: ViewboxStretch[] = ['None', 'Fill', 'Uniform', 'UniformToFill']

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '默认值', '说明']
const docsRows: (string | number)[][] = [
  ['stretch', "'Uniform' | 'UniformToFill' | 'Fill' | 'None'", "'Uniform'", '拉伸方式:Uniform 等比取最小比例;UniformToFill 等比取最大比例(溢出部分裁剪);Fill 两轴分别拉伸;None 原尺寸'],
  ['stretchDirection', "'UpOnly' | 'DownOnly' | 'Both'", "'Both'", '缩放方向:UpOnly 只放大(scale >= 1);DownOnly 只缩小(scale <= 1);Both 不限'],
  ['maxWidth', 'number | string', '不限', '容器最大宽度;数字按 px,字符串原样作为 CSS 长度'],
  ['maxHeight', 'number | string', '不限', '容器最大高度;同 maxWidth'],
  ['child(默认 slot)', 'any', '—', '被缩放的单个子内容;仅第一个子元素有效(XAML Child 单值语义)'],
  ['事件', '—', '—', 'Viewbox 为纯布局容器,无业务事件;鼠标/键盘事件经 $attrs 透传到根元素'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」映射。
const usageCode = computed(() => {
  const lines = ['<WuiViewbox', `  :style="{ width: ${widthValue.value}, height: ${heightValue.value} }"`]
  if (stretchValue.value !== 'Uniform') lines.push(`  stretch="${stretchValue.value}"`)
  if (stretchDirectionValue.value !== 'Both') lines.push(`  stretch-direction="${stretchDirectionValue.value}"`)
  if (maxWidthValue.value !== undefined) lines.push(`  :max-width="${maxWidthValue.value}"`)
  if (maxHeightValue.value !== undefined) lines.push(`  :max-height="${maxHeightValue.value}"`)
  lines.push('>', '  <!-- 任意单个子内容 -->', '  <YourContent />', '</WuiViewbox>')
  return lines.join('\n')
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Viewbox">
    <template #demo>
      <div class="viewbox-stage">
        <!-- 主演示:全部参数由参数面板实时驱动 -->
        <div class="viewbox-item">
          <WuiViewbox
            class="stage-box"
            :stretch="stretchValue"
            :stretch-direction="stretchDirectionValue"
            :max-width="maxWidthValue"
            :max-height="maxHeightValue"
            :style="{ width: `${widthValue}px`, height: `${heightValue}px` }"
          >
            <!-- 复刻官方示例子内容:灰色粗边框 + 深灰面板 + 色条行 + 图形 + 居中文本 -->
            <div class="sample-border">
              <div class="sample-panel">
                <svg
                  class="sample-bars"
                  width="160"
                  height="10"
                  viewBox="0 0 160 10"
                  aria-hidden="true"
                >
                  <rect width="40" height="10" fill="#0000FF" />
                  <rect x="40" width="40" height="10" fill="#008000" />
                  <rect x="80" width="40" height="10" fill="#FF0000" />
                  <rect x="120" width="40" height="10" fill="#FFFF00" />
                </svg>
                <svg
                  class="sample-art"
                  width="96"
                  height="96"
                  viewBox="0 0 96 96"
                  role="img"
                  aria-label="风车形示例图形"
                >
                  <path d="M48 48 L48 0 A48 48 0 0 1 96 48 Z" fill="#0000FF" />
                  <path d="M48 48 L96 48 A48 48 0 0 1 48 96 Z" fill="#008000" />
                  <path d="M48 48 L48 96 A48 48 0 0 1 0 48 Z" fill="#FF0000" />
                  <path d="M48 48 L0 48 A48 48 0 0 1 48 0 Z" fill="#FFFF00" />
                </svg>
                <WuiTextBlock class="sample-caption" text="This is text." />
              </div>
            </div>
          </WuiViewbox>
          <p class="viewbox-readout">
            {{ sizeLabel }}: <strong>{{ widthValue }} × {{ heightValue }}</strong>
            <span class="viewbox-config">{{ stretchLabel }}: {{ stretchValue }} / {{ stretchDirectionValue }}</span>
          </p>
        </div>

        <!-- 固定对照:同一内容分别用四档 stretch,观察等比/变形/裁剪/原尺寸的差异 -->
        <div class="viewbox-compare">
          <p class="compare-title">{{ compareLabel }}</p>
          <div class="compare-row">
            <figure v-for="item in STRETCH_COMPARISONS" :key="item" class="compare-item">
              <WuiViewbox class="compare-box" :stretch="item" :style="{ width: '110px', height: '110px' }">
                <div class="sample-border sample-border--thin">
                  <div class="sample-panel">
                    <svg width="160" height="10" viewBox="0 0 160 10" aria-hidden="true">
                      <rect width="40" height="10" fill="#0000FF" />
                      <rect x="40" width="40" height="10" fill="#008000" />
                      <rect x="80" width="40" height="10" fill="#FF0000" />
                      <rect x="120" width="40" height="10" fill="#FFFF00" />
                    </svg>
                    <WuiTextBlock class="sample-caption" text="This is text." />
                  </div>
                </div>
              </WuiViewbox>
              <figcaption class="compare-caption">{{ item }}</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Width(px)" type="slider" v-model="width" :min="20" :max="300" :step="1" />
        <DemoOptionRow label="Height(px)" type="slider" v-model="height" :min="20" :max="300" :step="1" />
        <DemoOptionRow label="Stretch 拉伸方式" type="select" v-model="stretch" :options="STRETCH_CHOICES" />
        <DemoOptionRow label="StretchDirection 缩放方向" type="select" v-model="stretchDirection" :options="STRETCH_DIRECTION_CHOICES" />
        <DemoOptionRow label="MaxWidth(0 = 不限制)" type="number" v-model="maxWidth" :min="0" :max="400" />
        <DemoOptionRow label="MaxHeight(0 = 不限制)" type="number" v-model="maxHeight" :min="0" :max="400" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.viewbox-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
}

.viewbox-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.viewbox-readout {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.viewbox-readout strong {
  color: var(--wui-application-header-foreground-theme);
  font-weight: 600;
}

.viewbox-config {
  margin-left: 16px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

/* —— 官方示例的子内容:Border(Gray, 15)+ StackPanel(DarkGray)+ 色条 + 图 + 文本 —— */
.sample-border {
  border: 15px solid var(--wui-system-control-foreground-chrome-gray);
}

.sample-border--thin {
  border-width: 8px;
}

.sample-panel {
  display: flex;
  flex-direction: column;
  background: var(--wui-system-control-background-chrome-medium-low);
}

.sample-bars,
.sample-art {
  display: block;
}

.sample-caption {
  text-align: center;
}

/* —— 四档 stretch 对照 —— */
.viewbox-compare {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.compare-title {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.compare-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}

.compare-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 0;
}

.compare-caption {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
