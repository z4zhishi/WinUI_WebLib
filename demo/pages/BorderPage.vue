<script setup lang="ts">
// BorderPage.vue —— Border 控件示例页(参数组合对照 WinUI Gallery Samples/Border:
// 「绕 TextBlock 的边框」+ Thickness 滑杆 + Background/BorderBrush 色板;
// 在官方示例基础上扩展四边独立厚度、逐角圆角、内边距与主题 token 色板)。
import { computed, ref, watch } from 'vue'
import WuiBorder from '@/components/Border.vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// DemoOptionRow 的 v-model 契约要求联合类型(slider/number → number,text/select → string)
const thicknessAll = ref<string | number | boolean>(2)
const thicknessLeft = ref<string | number | boolean>(2)
const thicknessTop = ref<string | number | boolean>(2)
const thicknessRight = ref<string | number | boolean>(2)
const thicknessBottom = ref<string | number | boolean>(2)
const cornerRadius = ref<string | number | boolean>(4)
const paddingValue = ref<string | number | boolean>(12)
// 默认画刷对照官方示例:Background White / BorderBrush Gold(XAML #FFFFD700)
const borderBrush = ref<string | number | boolean>('#FFD700')
const background = ref<string | number | boolean>('var(--wui-application-page-background-theme)')

function asNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// 「全边」滑杆联动四边(对照官方 ThicknessSlider 一次改 Thickness 的用法);单边数字输入可再覆盖
watch(thicknessAll, (value) => {
  const n = asNumber(value, 2)
  thicknessLeft.value = n
  thicknessTop.value = n
  thicknessRight.value = n
  thicknessBottom.value = n
})

function side(value: string | number | boolean): number {
  return Math.max(0, Math.round(asNumber(value, 0)))
}

// 四边厚度 → XAML Thickness 四值串 "left,top,right,bottom"
const thicknessText = computed(
  () =>
    `${side(thicknessLeft.value)},${side(thicknessTop.value)},${side(thicknessRight.value)},${side(thicknessBottom.value)}`,
)

const cornerRadiusText = computed(() => {
  const value = typeof cornerRadius.value === 'boolean' ? '' : String(cornerRadius.value).trim()
  return value === '' ? '0' : value
})

const paddingNumber = computed(() => Math.max(0, Math.round(asNumber(paddingValue.value, 0))))

const borderBrushValue = computed(() => {
  const value = borderBrush.value
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
})

const backgroundValue = computed(() => {
  const value = background.value
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
})

// —— Brush 下拉:主题 token 色板在前,官方示例对照色在后(BorderPage.xaml.cs 的映射)——
const brushChoices = [
  {
    label: '官方 Gold(示例 Yellow,默认)',
    value: '#FFD700',
  },
  {
    label: '主题 token:强调色',
    value: 'var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))',
  },
  {
    label: '主题 token:控件描边(TextControlBorder)',
    value: 'var(--wui-text-control-border)',
  },
  {
    label: '主题 token:高对比描边(BaseHigh)',
    value: 'var(--wui-system-control-background-base-high)',
  },
  {
    label: '主题 token:浅描边(BaseLow)',
    value: 'var(--wui-system-control-background-base-low)',
  },
  {
    label: '官方 Green(示例映射 DarkGreen)',
    value: '#006400',
  },
  {
    label: '官方 Blue(示例映射 DarkBlue)',
    value: '#00008B',
  },
  {
    label: '官方 White',
    value: '#FFFFFF',
  },
]

const backgroundChoices = [
  {
    label: '主题 token:页面背景(默认)',
    value: 'var(--wui-application-page-background-theme)',
  },
  {
    label: '主题 token:浅色面板(ChromeMediumLow)',
    value: 'var(--wui-system-control-background-chrome-medium-low)',
  },
  {
    label: '主题 token:提示面板(ToolTipBackground)',
    value: 'var(--wui-tool-tip-background-theme)',
  },
  {
    label: '主题 token:对话框背景',
    value: 'var(--wui-content-dialog-background-theme)',
  },
  {
    label: '官方 White(默认)',
    value: '#FFFFFF',
  },
  {
    label: '官方 Yellow(示例映射 Gold)',
    value: '#FFD700',
  },
  {
    label: '官方 Green(示例映射 DarkGreen)',
    value: '#006400',
  },
  {
    label: '官方 Blue(示例映射 DarkBlue)',
    value: '#00008B',
  },
]

// —— 下半区固定开发文档 ——
const propertyHeaders = ['属性', '类型', '默认值', '说明']
const propertyRows: (string | number)[][] = [
  [
    'borderThickness',
    'number | string',
    '0',
    '边框厚度;数字(px)或 "left,top,right,bottom"(两值为左右/上下配对);内绘于盒内,不挤占内容区',
  ],
  ['borderBrush', 'string', 'null(不绘制)', '边框画刷;任意 CSS 颜色或 --wui-* 变量'],
  [
    'cornerRadius',
    'number | string',
    '0',
    '圆角;数字(px)或 "topLeft,topRight,bottomRight,bottomLeft"(如 "8,0,8,0")',
  ],
  ['padding', 'number | string', '0', '内边距;XAML Thickness 形式(数字或逗号分隔串)'],
  ['background', 'string', 'null(透明)', '背景画刷;任意 CSS 颜色或 --wui-* 主题 token'],
  ['(默认 slot)', 'any', '—', '对应 XAML Child:单子元素容器,slot 内容即被装饰的子元素'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  [
    '—(无业务事件)',
    '—',
    'Border 为布局装饰容器,不派发业务事件,也没有 PointerOver/Pressed/Focus 视觉状态',
  ],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射(默认值省略)。
const usageCode = computed(() => {
  const lines = ['<WuiBorder']
  if (thicknessText.value !== '0,0,0,0') lines.push(`  :border-thickness="'${thicknessText.value}'"`)
  if (borderBrushValue.value !== undefined) lines.push(`  border-brush="${borderBrushValue.value}"`)
  if (backgroundValue.value !== undefined) lines.push(`  background="${backgroundValue.value}"`)
  if (cornerRadiusText.value !== '0') lines.push(`  :corner-radius="'${cornerRadiusText.value}'"`)
  if (paddingNumber.value > 0) lines.push(`  :padding="${paddingNumber.value}"`)
  lines.push('>')
  lines.push('  <WuiTextBlock text="Text inside a border" :font-size="18" />')
  lines.push('</WuiBorder>')
  return lines.join('\n')
})
</script>

<template>
  <DemoPage
    title="Border"
    description="在单个子元素周围绘制边框线、背景或两者的装饰容器:调整四边厚度、逐角圆角、内边距与画刷,观察画在盒内、不挤占内容区的边框效果。"
  >
    <template #demo>
      <div class="border-stage">
        <!-- 交互演示:对照官方示例 Border around a TextBlock -->
        <WuiBorder
          class="stage-border"
          :border-thickness="thicknessText"
          :border-brush="borderBrushValue"
          :background="backgroundValue"
          :corner-radius="cornerRadiusText"
          :padding="paddingNumber"
        >
          <WuiTextBlock text="Text inside a border" :font-size="18" />
        </WuiBorder>

        <!-- 固定示例组 -->
        <div class="example-list">
          <div class="example-item">
            <p class="example-caption">官方示例还原(Thickness 2 + Gold 边框 + 白底 + Margin 8,5)</p>
            <WuiBorder border-thickness="2" border-brush="#FFD700" background="#FFFFFF" padding="8,5">
              <WuiTextBlock text="Text inside a border" :font-size="18" foreground="#000000" />
            </WuiBorder>
          </div>
          <div class="example-item">
            <p class="example-caption">非对称厚度与逐角圆角("8,0,8,0")</p>
            <WuiBorder
              border-thickness="8,0,8,0"
              corner-radius="8,0,8,0"
              border-brush="var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))"
              background="var(--wui-system-control-background-chrome-medium-low)"
              :padding="16"
            >
              <WuiTextBlock
                text="左右各 8px、上下 0px 的边框;圆角同样支持逐角设置,对角为 8px、其余为直角。"
                text-wrapping="Wrap"
              />
            </WuiBorder>
          </div>
          <div class="example-item">
            <p class="example-caption">主题 token 组合的卡片(1px 描边 + 面板背景 + 8px 圆角)</p>
            <WuiBorder
              :border-thickness="1"
              border-brush="var(--wui-system-control-background-base-low)"
              background="var(--wui-tool-tip-background-theme)"
              :corner-radius="8"
              :padding="16"
            >
              <WuiTextBlock
                text="颜色全部取自 --wui-* 主题 token,浅色 / 深色主题预览下自动适配。"
                text-wrapping="Wrap"
              />
            </WuiBorder>
          </div>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          label="BorderThickness 全边(滑杆)"
          type="slider"
          v-model="thicknessAll"
          :min="0"
          :max="16"
          :step="1"
        />
        <DemoOptionRow label="Padding 内边距" type="slider" v-model="paddingValue" :min="0" :max="48" :step="1" />
        <DemoOptionRow label="Thickness Left 左" type="number" v-model="thicknessLeft" :min="0" :max="24" :step="1" />
        <DemoOptionRow label="Thickness Top 上" type="number" v-model="thicknessTop" :min="0" :max="24" :step="1" />
        <DemoOptionRow label="Thickness Right 右" type="number" v-model="thicknessRight" :min="0" :max="24" :step="1" />
        <DemoOptionRow
          label="Thickness Bottom 下"
          type="number"
          v-model="thicknessBottom"
          :min="0"
          :max="24"
          :step="1"
        />
        <DemoOptionRow label="CornerRadius 圆角" type="text" v-model="cornerRadius" placeholder="如 8 或 8,0,8,0" />
        <DemoOptionRow label="BorderBrush 边框" type="select" v-model="borderBrush" :options="brushChoices" />
        <DemoOptionRow label="Background 背景" type="select" v-model="background" :options="backgroundChoices" />
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
.border-stage {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
  max-width: 680px;
}

.stage-border {
  width: 100%;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 24px;
  border-top: 1px dashed var(--wui-system-control-background-base-low);
}

.example-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
