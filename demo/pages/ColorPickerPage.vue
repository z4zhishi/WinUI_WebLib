<script setup lang="ts">
// ColorPickerPage.vue —— ColorPicker 控件示例页(示例组合对照 WinUI Gallery 的 ColorPickerPage.xaml)。
// 演示区:完整取色器(全部可见性开关/形状/分量/方向可调,颜色应用到预览矩形)+ 竖向色相条布局
// (Orientation=Horizontal + ColorSpectrumComponents=SaturationValue:竖向 hue 滑杆 + 饱和度/亮度谱区)
// 与新旧色对比(previewColor)。
import { computed, ref } from 'vue'
import WuiColorPicker from '@/components/ColorPicker.vue'
import type {
  ColorPickerOrientation,
  ColorPickerSpectrumComponents,
  ColorPickerSpectrumShape,
  ColorPickerColorChangedEventArgs,
} from '@/components/ColorPicker.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'ColorPicker(颜色选取器)', en: 'ColorPicker' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '使用 ColorPicker 让用户从谱区、滑杆、RGB/HSV 通道或 HEX 文本中选取颜色。谱区二维选点,第三维度(色相/饱和度/亮度)滑杆随 ColorSpectrumComponents 自动切换;alpha 通道可启用;新旧色预览条直观对比;颜色在谱区拖拽、滑杆拖动与文本输入时实时更新并触发 colorChanged。',
  en: 'Use a ColorPicker to let a user pick a color from the spectrum, sliders, RGB/HSV channels or HEX text. The 2D spectrum picks a point while the third dimension (hue/saturation/value) slider follows ColorSpectrumComponents; the alpha channel is optional; the preview bar compares new and previous colors; color updates live and fires colorChanged on spectrum drag, slider moves and text input.',
}
const FULL_PICKER_TITLE: BilingualText = { zh: '完整取色器(对照官方示例参数)', en: 'Full picker (mirrors the official sample)' }
const VERTICAL_HUE_TITLE: BilingualText = { zh: '竖向色相条布局(Horizontal + SaturationValue)', en: 'Vertical hue bar (Horizontal + SaturationValue)' }
const APPLIED_LABEL: BilingualText = { zh: 'ColorPicker 应用到预览矩形', en: 'ColorPicker applied on a rectangle' }
const CHANGED_COUNT_LABEL: BilingualText = { zh: 'colorChanged 触发次数', en: 'colorChanged fired' }
const UNIT_TIMES: BilingualText = { zh: '次', en: 'time(s)' }
const SNAPSHOT_LABEL: BilingualText = { zh: '将当前颜色存为「上一色」', en: 'Store current color as previous' }
const CLEAR_PREVIOUS_LABEL: BilingualText = { zh: '清除上一色', en: 'Clear previous color' }
const CHANGE_LOG_TITLE: BilingualText = { zh: 'colorChanged 日志(old → new)', en: 'colorChanged log (old → new)' }
const NO_CHANGE_LABEL: BilingualText = { zh: '尚未触发', en: 'No changes yet' }
const HEX_LABEL: BilingualText = { zh: '当前 color(v-model)', en: 'Current color (v-model)' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const fullPickerTitle = useBilingual(i18n, FULL_PICKER_TITLE)
const verticalHueTitle = useBilingual(i18n, VERTICAL_HUE_TITLE)
const appliedLabel = useBilingual(i18n, APPLIED_LABEL)
const changedCountLabel = useBilingual(i18n, CHANGED_COUNT_LABEL)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const snapshotLabel = useBilingual(i18n, SNAPSHOT_LABEL)
const clearPreviousLabel = useBilingual(i18n, CLEAR_PREVIOUS_LABEL)
const changeLogTitle = useBilingual(i18n, CHANGE_LOG_TITLE)
const noChangeLabel = useBilingual(i18n, NO_CHANGE_LABEL)
const hexLabel = useBilingual(i18n, HEX_LABEL)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例一:完整取色器(选项参数 ref 一律联合类型,匹配 DemoOptionRow 的 v-model 契约) ——
const pickerColor = ref('#0078D4')
const changedCount = ref(0)
const changeLog = ref<{ oldColor: string; newColor: string }[]>([])

const moreButton = ref<string | number | boolean>(false)
const colorSlider = ref<string | number | boolean>(true)
const channelInput = ref<string | number | boolean>(true)
const hexInput = ref<string | number | boolean>(true)
const alphaEnabled = ref<string | number | boolean>(false)
const alphaSlider = ref<string | number | boolean>(true)
const alphaTextInput = ref<string | number | boolean>(true)
const spectrumShape = ref<string | number | boolean>('Box')
const orientation = ref<string | number | boolean>('Vertical')
const spectrumComponents = ref<string | number | boolean>('HueSaturation')

const isFlag = (raw: string | number | boolean): boolean => raw === true
const asShape = (raw: string | number | boolean): ColorPickerSpectrumShape => {
  const text = String(raw)
  return text === 'Ring' ? 'Ring' : 'Box'
}
const asOrientation = (raw: string | number | boolean): ColorPickerOrientation => {
  const text = String(raw)
  return text === 'Horizontal' ? 'Horizontal' : 'Vertical'
}
const asComponents = (raw: string | number | boolean): ColorPickerSpectrumComponents => {
  const allowed: ColorPickerSpectrumComponents[] = [
    'HueSaturation',
    'HueValue',
    'ValueHue',
    'ValueSaturation',
    'SaturationHue',
    'SaturationValue',
  ]
  const text = String(raw)
  return (allowed as string[]).includes(text) ? (text as ColorPickerSpectrumComponents) : 'HueSaturation'
}

function onColorChanged(event: ColorPickerColorChangedEventArgs): void {
  changedCount.value += 1
  changeLog.value = [{ oldColor: event.oldColor, newColor: event.newColor }, ...changeLog.value].slice(0, 5)
}

// —— 示例二:竖向色相条布局 + 新旧色对比 ——
const verticalHueColor = ref('#8A00C4')
const previousColor = ref<string | null>(null)

function snapshotPrevious(): void {
  previousColor.value = verticalHueColor.value
}

function clearPrevious(): void {
  previousColor.value = null
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['color', 'string(v-model:color)', "'#FFFFFF'", '当前颜色,双向绑定;接受 6 位 #RRGGBB / 8 位 #AARRGGBB(写法定义显示格式,内部始终保存 rgb+alpha);谱区/滑杆/文本输入实时更新'],
  ['previousColor', 'string | null', 'null', '上一色;设置后预览条分上下两半显示新旧色对比(谱区隐藏时预览条整宽)'],
  ['colorSpectrumShape', "'Box' | 'Ring'", "'Box'", '谱区形状:方盘 / 圆环(圆环:角向为主轴、圆心为最大饱和度/亮度)'],
  ['colorSpectrumComponents', 'ColorSpectrumComponents(6 值)', "'HueSaturation'", '谱区两轴与第三维度的通道组合;第三维度滑杆通道随其自动切换'],
  ['orientation', "'Vertical' | 'Horizontal'", "'Vertical'", 'Vertical 上下堆叠;Horizontal 谱区居左、滑杆竖向、文本区恒显(更多按钮隐藏)'],
  ['minHue / maxHue', 'number', '0 / 359', '色相范围(0-359,越界钳制)'],
  ['minSaturation / maxSaturation', 'number', '0 / 100', '饱和度范围(0-100,越界钳制)'],
  ['minValue / maxValue', 'number', '0 / 100', '亮度范围(0-100,越界钳制)'],
  ['isAlphaEnabled', 'boolean', 'false', '启用 alpha 通道:显示 alpha 滑杆/输入,HEX 变 8 位;关闭时 HEX 输入将 alpha 重置为 1'],
  ['isColorSpectrumVisible', 'boolean', 'true', '显示谱区;关闭后预览条变为整宽 44px 横条'],
  ['isColorPreviewVisible', 'boolean', 'true', '显示新旧色预览条'],
  ['isColorSliderVisible', 'boolean', 'true', '显示第三维度滑杆(色相/饱和度/亮度,随 Components 切换)'],
  ['isAlphaSliderVisible', 'boolean', 'true', '显示 alpha 滑杆(需 isAlphaEnabled)'],
  ['isMoreButtonVisible', 'boolean', 'false', '显示「更多/收起」开合按钮(仅 Vertical;Horizontal 下文本区恒显)'],
  ['isColorChannelTextInputVisible', 'boolean', 'true', '显示 RGB/HSV 表示切换与通道数字输入'],
  ['isAlphaTextInputVisible', 'boolean', 'true', '显示不透明度百分比输入(需 isAlphaEnabled)'],
  ['isHexInputVisible', 'boolean', 'true', '显示 HEX 输入(自动补 #;alpha 启用时 8 位)'],
  ['disabled', 'boolean', 'false', '禁用交互(谱区/滑杆/输入全部不可用)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['colorChanged', '(event: { oldColor: string; newColor: string }) => void', '颜色 ARGB 任一分量变化时触发;谱区拖拽、滑杆、文本输入与程序化赋值均触发(与 WinUI ColorChanged 语义一致);hex 串为 8 位 #AARRGGBB'],
  ['update:color', '(color: string) => void', 'v-model:color 双向绑定事件'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiColorPicker
  v-model:color="color"
  :previous-color="previousColor"
  color-spectrum-shape="${asShape(spectrumShape.value)}"
  color-spectrum-components="${asComponents(spectrumComponents.value)}"
  orientation="${asOrientation(orientation.value)}"
  :is-alpha-enabled="${isFlag(alphaEnabled.value)}"
  :is-more-button-visible="${isFlag(moreButton.value)}"
  @color-changed="onColorChanged" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ColorPicker">
    <template #demo>
      <div class="color-picker-stage">
        <!-- 示例一:完整取色器(对照官方示例的可见性开关与形状切换) -->
        <section class="stage-section">
          <h3 class="stage-title">{{ fullPickerTitle }}</h3>
          <WuiColorPicker
            v-model:color="pickerColor"
            :color-spectrum-shape="asShape(spectrumShape)"
            :color-spectrum-components="asComponents(spectrumComponents)"
            :orientation="asOrientation(orientation)"
            :is-more-button-visible="isFlag(moreButton)"
            :is-color-slider-visible="isFlag(colorSlider)"
            :is-color-channel-text-input-visible="isFlag(channelInput)"
            :is-hex-input-visible="isFlag(hexInput)"
            :is-alpha-enabled="isFlag(alphaEnabled)"
            :is-alpha-slider-visible="isFlag(alphaSlider)"
            :is-alpha-text-input-visible="isFlag(alphaTextInput)"
            @color-changed="onColorChanged"
          />
          <div class="applied-block">
            <p class="hint">{{ appliedLabel }}</p>
            <div class="preview-rect" :style="{ background: pickerColor }"></div>
            <p class="live-value">{{ hexLabel }}:<code>{{ pickerColor }}</code></p>
            <p class="live-value">{{ changedCountLabel }}:{{ changedCount }} {{ unitTimes }}</p>
          </div>
          <div class="change-log">
            <p class="hint">{{ changeLogTitle }}</p>
            <p v-if="changeLog.length === 0" class="hint">{{ noChangeLabel }}</p>
            <div v-for="(entry, index) in changeLog" :key="index" class="change-row">
              <span class="swatch" :style="{ background: entry.oldColor }"></span>
              <code class="change-hex">{{ entry.oldColor }}</code>
              <span class="change-arrow">→</span>
              <span class="swatch" :style="{ background: entry.newColor }"></span>
              <code class="change-hex">{{ entry.newColor }}</code>
            </div>
          </div>
        </section>

        <!-- 示例二:竖向色相条 + 饱和度/亮度谱区 + 新旧色对比 -->
        <section class="stage-section">
          <h3 class="stage-title">{{ verticalHueTitle }}</h3>
          <WuiColorPicker
            v-model:color="verticalHueColor"
            orientation="Horizontal"
            color-spectrum-components="SaturationValue"
            :is-alpha-enabled="true"
            :previous-color="previousColor"
          />
          <div class="change-actions">
            <button type="button" class="action-button" @click="snapshotPrevious">{{ snapshotLabel }}</button>
            <button type="button" class="action-button" :disabled="previousColor === null" @click="clearPrevious">
              {{ clearPreviousLabel }}
            </button>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="IsMoreButtonVisible" type="toggle" v-model="moreButton" />
        <DemoOptionRow label="IsColorSliderVisible" type="toggle" v-model="colorSlider" />
        <DemoOptionRow label="IsColorChannelTextInputVisible" type="toggle" v-model="channelInput" />
        <DemoOptionRow label="IsHexInputVisible" type="toggle" v-model="hexInput" />
        <DemoOptionRow label="IsAlphaEnabled" type="toggle" v-model="alphaEnabled" />
        <DemoOptionRow label="IsAlphaSliderVisible" type="toggle" v-model="alphaSlider" />
        <DemoOptionRow label="IsAlphaTextInputVisible" type="toggle" v-model="alphaTextInput" />
        <DemoOptionRow
          label="ColorSpectrumShape"
          type="select"
          v-model="spectrumShape"
          :options="[
            { label: 'Box', value: 'Box' },
            { label: 'Ring', value: 'Ring' },
          ]"
        />
        <DemoOptionRow
          label="Orientation"
          type="select"
          v-model="orientation"
          :options="[
            { label: 'Vertical', value: 'Vertical' },
            { label: 'Horizontal', value: 'Horizontal' },
          ]"
        />
        <DemoOptionRow
          label="ColorSpectrumComponents"
          type="select"
          v-model="spectrumComponents"
          :options="[
            { label: 'HueSaturation', value: 'HueSaturation' },
            { label: 'HueValue', value: 'HueValue' },
            { label: 'ValueHue', value: 'ValueHue' },
            { label: 'ValueSaturation', value: 'ValueSaturation' },
            { label: 'SaturationHue', value: 'SaturationHue' },
            { label: 'SaturationValue', value: 'SaturationValue' },
          ]"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.color-picker-stage {
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
}

.stage-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stage-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.applied-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 392px;
}

.preview-rect {
  height: 100px;
  border: 1px solid var(--wui-text-control-border);
  border-radius: 4px;
}

.hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-description-text-foreground);
}

.live-value {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  word-break: break-all;
}

.change-log {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.change-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swatch {
  width: 24px;
  height: 16px;
  border: 1px solid var(--wui-text-control-border);
  border-radius: 2px;
}

.change-hex {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.change-arrow {
  color: var(--wui-application-secondary-foreground-theme);
}

.change-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  min-height: 32px;
  padding: 5px 12px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 4px;
  cursor: pointer;
}

.action-button:hover:not(:disabled) {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.action-button:active:not(:disabled) {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.action-button:disabled {
  color: var(--wui-button-foreground-disabled);
  background: var(--wui-button-background-disabled);
  cursor: default;
}

.action-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
