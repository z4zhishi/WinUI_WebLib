<script setup lang="ts">
// StackPanelPage.vue —— StackPanel 布局面板示例页
// 参数组合对照 WinUI Gallery Samples/StackPanel:Orientation 单选(Horizontal/Vertical)+
// Spacing 滑块(0-16,默认 8)+ 四个色块子项;另补混合子项与交叉轴对齐示例。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiStackPanel from '@/components/StackPanel.vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— WinUI 枚举收敛(下拉值即枚举名,非法值回退默认)——
type Orientation = 'Horizontal' | 'Vertical'

// DemoOptionRow 的 v-model 契约要求联合类型(select → string,slider → number)
const orientation = ref<string | number | boolean>('Vertical')
const spacing = ref<string | number | boolean>(8)
const padding = ref<string | number | boolean>(0)
const itemSize = ref<string | number | boolean>(40)

function asString(value: string | number | boolean): string {
  return typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
}

function asNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const orientationValue = computed<Orientation>(() =>
  asString(orientation.value) === 'Horizontal' ? 'Horizontal' : 'Vertical',
)

const spacingValue = computed(() => Math.max(0, asNumber(spacing.value, 0)))
const paddingValue = computed(() => Math.max(0, asNumber(padding.value, 0)))
const itemSizeValue = computed(() => {
  const size = Math.round(asNumber(itemSize.value, 40))
  return Math.min(120, Math.max(16, size))
})

// —— 下拉选项(对照官方示例 OrientationGroup 的两项)——
const orientationChoices = [
  { label: 'Vertical(垂直,默认)', value: 'Vertical' },
  { label: 'Horizontal(水平)', value: 'Horizontal' },
]

// —— 下半区固定开发文档 ——
const propertyHeaders = ['属性', '类型', '默认值', '说明']
const propertyRows: (string | number)[][] = [
  ['orientation', "'Horizontal' | 'Vertical'", 'Vertical', '排列方向;映射 CSS flex-direction'],
  ['spacing', 'number | string', '0', '相邻子项间距;数字按 px,映射 flex gap(只在子项之间生效)'],
  ['padding', 'number | string', '0', '面板内边距(FrameworkElement.Padding);数字按 px'],
  ['background', 'string', '透明', '面板背景色(Panel.Background);任意 CSS 颜色或变量'],
  ['默认 slot', '—', '—', '子项内容;子项交叉轴默认 Stretch(拉伸),可用自身 align-self 覆写'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['—(无业务事件)', '—', 'StackPanel 为纯布局面板,不派发业务事件;子项自身的交互事件照常触发'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射(默认值省略)。
const usageCode = computed(() => {
  const lines = ['<WuiStackPanel']
  if (orientationValue.value !== 'Vertical') lines.push(`  orientation="${orientationValue.value}"`)
  if (spacingValue.value !== 0) lines.push(`  :spacing="${spacingValue.value}"`)
  if (paddingValue.value !== 0) lines.push(`  :padding="${paddingValue.value}"`)
  lines.push('>')
  lines.push('  <!-- 子项按方向依次排列,间距由 spacing 控制 -->')
  lines.push('  <div class="item">A</div>')
  lines.push('  <div class="item">B</div>')
  lines.push('</WuiStackPanel>')
  return lines.join('\n')
})
</script>

<template>
  <DemoPage wiki="StackPanel"
    title="StackPanel"
    description="单行排列子项的布局面板:调整方向与间距,观察子项的堆叠、交叉轴拉伸与溢出行为。"
  >
    <template #demo>
      <div class="stack-stage">
        <!-- 交互演示:对照官方示例的四个色块子项 -->
        <div class="panel-frame">
          <WuiStackPanel
            :orientation="orientationValue"
            :spacing="spacingValue"
            :padding="paddingValue"
            class="panel-example"
          >
            <div class="swatch swatch-red" :style="{ width: `${itemSizeValue}px`, height: `${itemSizeValue}px` }"></div>
            <div class="swatch swatch-blue" :style="{ width: `${itemSizeValue}px`, height: `${itemSizeValue}px` }"></div>
            <div class="swatch swatch-green" :style="{ width: `${itemSizeValue}px`, height: `${itemSizeValue}px` }"></div>
            <div class="swatch swatch-yellow" :style="{ width: `${itemSizeValue}px`, height: `${itemSizeValue}px` }"></div>
          </WuiStackPanel>
        </div>

        <!-- 混合子项:文本 + 按钮 + 嵌套面板 + 覆写对齐 -->
        <div class="example-list">
          <div class="example-item">
            <p class="example-caption">混合子项(文本 + 按钮 + 嵌套 StackPanel,子项自带 margin 不折叠)</p>
            <WuiStackPanel
              orientation="Vertical"
              :spacing="12"
              :padding="16"
              background="var(--wui-system-control-background-chrome-medium-low)"
              class="panel-mixed"
            >
              <WuiTextBlock
                class="mixed-margin"
                text="文本子项:自身 margin-top 参与布局,且不与相邻子项的 margin 折叠(WinUI 无 margin 合并语义)。"
                text-wrapping="Wrap"
              />
              <WuiButton content="子项按钮(交互照常)" />
              <WuiStackPanel orientation="Horizontal" :spacing="8">
                <div class="swatch swatch-blue swatch-small"></div>
                <div class="swatch swatch-green swatch-small"></div>
                <div class="swatch swatch-yellow swatch-small"></div>
              </WuiStackPanel>
            </WuiStackPanel>
          </div>
          <div class="example-item">
            <p class="example-caption">交叉轴对齐:子项默认 Stretch(拉伸填满交叉轴),单个子项可用 align-self 覆写</p>
            <WuiStackPanel orientation="Vertical" :spacing="8" :padding="12" class="panel-mixed panel-fixed-width">
              <div class="swatch swatch-blue swatch-small"></div>
              <div class="swatch swatch-green swatch-small swatch-align-end"></div>
              <div class="swatch swatch-yellow swatch-small"></div>
            </WuiStackPanel>
          </div>
          <div class="example-item">
            <p class="example-caption">溢出行为:面板空间受限时子项保持期望尺寸并溢出边界(不裁剪、不压缩)</p>
            <div class="panel-frame panel-frame-fixed">
              <WuiStackPanel orientation="Vertical" :spacing="8" :padding="12" class="panel-mixed">
                <div class="swatch swatch-blue swatch-small"></div>
                <div class="swatch swatch-green swatch-small"></div>
                <div class="swatch swatch-yellow swatch-small"></div>
                <div class="swatch swatch-red swatch-small"></div>
              </WuiStackPanel>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Orientation 方向" type="select" v-model="orientation" :options="orientationChoices" />
        <DemoOptionRow label="Spacing 间距" type="slider" v-model="spacing" :min="0" :max="16" :step="1" />
        <DemoOptionRow label="Padding 内边距" type="slider" v-model="padding" :min="0" :max="24" :step="1" />
        <DemoOptionRow label="子项尺寸" type="slider" v-model="itemSize" :min="16" :max="120" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">属性</h4>
      <DemoDocsTable :headers="propertyHeaders" :rows="propertyRows" />
      <h4 class="docs-subtitle">事件</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.stack-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  width: 100%;
  max-width: 680px;
}

/* 面板边界参考框:虚线框为父容器,便于观察面板自身的排布与溢出 */
.panel-frame {
  display: flex;
  justify-content: center;
  max-width: 100%;
  padding: 12px;
  border: 1px dashed var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.panel-frame-fixed {
  height: 96px;
  justify-content: flex-start;
}

/* 官方示例四色块:token 集无命名红/蓝/绿/黄,用强调色浓淡近似(Red→深/Blue→原色/Green→中/Yellow→浅) */
.swatch {
  box-sizing: border-box;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.swatch-small {
  width: 24px;
  height: 24px;
}

.swatch-red {
  background: color-mix(in srgb, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)) 85%, var(--wui-application-foreground-theme));
}

.swatch-blue {
  background: var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
}

.swatch-green {
  background: color-mix(in srgb, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)) 60%, transparent);
}

.swatch-yellow {
  background: color-mix(in srgb, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)) 30%, transparent);
}

/* 混合子项示例:面板底色由 background prop 注入 */
.panel-mixed {
  max-width: 100%;
}

.panel-fixed-width {
  width: 200px;
}

/* 子项自带 margin:验证面板不折叠子项 margin(WinUI 语义) */
.mixed-margin {
  margin-top: 12px;
}

/* 交叉轴对齐覆写:对应 WinUI 子项 HorizontalAlignment 覆写面板默认 Stretch */
.swatch-align-end {
  align-self: flex-end;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  padding-top: 24px;
  border-top: 1px dashed var(--wui-system-control-background-base-low);
}

.example-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.example-caption {
  margin: 0;
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
