<script setup lang="ts">
// ButtonPage.vue —— Button 控件示例页(对应官方 WinUI Gallery Samples/Button/)。
// 结构照抄 HomePage.vue 母版:DemoPage(标题+描述)→ 交互演示(控件本体多配置)
// → DemoOptions(文本框/开关/滑块/下拉实时改参)→ DemoDocsTable + DemoCode。
// 文案暂用中文双语文案常量(全站六语言在阶段 8 统一)。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 Button 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'Button(按钮)', en: 'Button' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'Button 控件提供 Click 事件,用于响应来自触摸、鼠标、键盘、触笔等输入设备的用户操作;按钮内容可以是文本或图像等各种类型,也可以重新设置样式获得全新外观。',
  en: 'The Button control provides a Click event to respond to user input from touch, mouse, keyboard, stylus, or other input devices. You can put different kinds of content in a button, such as text or an image, or restyle it for a new look.',
}
const CLICK_HINT: BilingualText = { zh: 'Click 已触发', en: 'Click fired' }
const UNIT_TIMES: BilingualText = { zh: '次', en: 'time(s)' }
const PROPS_TABLE_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const EVENTS_TABLE_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const clickHint = useBilingual(i18n, CLICK_HINT)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const propsTableTitle = useBilingual(i18n, PROPS_TABLE_TITLE)
const eventsTableTitle = useBilingual(i18n, EVENTS_TABLE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 可调参数(DemoOptionRow 的 v-model 契约要求 string | number | boolean 联合类型)——
const content = ref<string | number | boolean>('标准 XAML 按钮')
const disabled = ref<string | number | boolean>(false)
const fontSize = ref<string | number | boolean>(14)
const fontWeight = ref<string | number | boolean>('Normal')
const cornerRadius = ref<string | number | boolean>(4)
const clickCount = ref(0)

const FONT_WEIGHT_CHOICES = [
  { label: 'Normal (400)', value: 'Normal' },
  { label: 'Medium (500)', value: 'Medium' },
  { label: 'SemiBold (600)', value: 'SemiBold' },
  { label: 'Bold (700)', value: 'Bold' },
]

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const contentText = computed(() => String(content.value))
const disabledValue = computed(() => disabled.value === true)
const fontSizeValue = computed(() => toNumber(fontSize.value, 14))
const fontWeightValue = computed(() => String(fontWeight.value))
const cornerRadiusValue = computed(() => toNumber(cornerRadius.value, 4))

function onButtonClick(): void {
  clickCount.value += 1
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Content', 'string', "''", '按钮文本内容;复杂内容(图标/图片)用默认插槽(左侧文本框实时调节)'],
  ['Background', 'string(CSS 颜色)', '主题 ButtonBackground', '背景色;悬停/按下/禁用仍按 WinUI 状态规则切换'],
  ['Foreground', 'string(CSS 颜色)', '主题 ButtonForeground', '前景(文字)色'],
  ['BorderBrush', 'string(CSS 颜色)', '主题 ButtonBorderBrush(透明)', '边框色;边框厚度固定 2px(ButtonBorderThemeThickness)'],
  ['FontSize', 'number | string', '14(ControlContentThemeFontSize)', '字号,单位 px(滑块实时调节)'],
  ['FontWeight', 'number | string', "Normal(400)", '字重;支持 WinUI FontWeight 命名(下拉实时调节)'],
  ['CornerRadius', 'number | string', '4', '圆角半径,单位 px(滑块实时调节)'],
  ['Disabled', 'boolean', 'false', '是否禁用,对应 WinUI IsEnabled(开关实时调节)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent)', '按钮被点击时触发(鼠标左键,或聚焦后按 Space/Enter 键)'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiButton
  Content="${contentText.value}"
  :Disabled="${disabledValue.value}"
  :FontSize="${fontSizeValue.value}"
  FontWeight="${fontWeightValue.value}"
  :CornerRadius="${cornerRadiusValue.value}"
  @click="onButtonClick" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Button">
    <template #demo>
      <div class="button-stage">
        <!-- 配置 1:文本按钮,参数由左侧面板实时驱动(对应官方 ButtonSimple 示例) -->
        <WuiButton
          :content="contentText"
          :disabled="disabledValue"
          :font-size="fontSizeValue"
          :font-weight="fontWeightValue"
          :corner-radius="cornerRadiusValue"
          @click="onButtonClick"
        />
        <p class="click-hint">{{ clickHint }} {{ clickCount }} {{ unitTimes }}</p>

        <!-- 配置 2:插槽内容按钮,图形 + 文本混排(对应官方 ButtonWithImage 示例) -->
        <div class="button-row">
          <WuiButton :disabled="disabledValue" aria-label="添加" @click="onButtonClick">
            <svg class="slot-icon" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 1.5 9.9 5.6l4.5.5-3.3 3.1.9 4.4L8 11.4l-4 2.2.9-4.4L1.6 6.1l4.5-.5Z"
                fill="currentColor"
              />
            </svg>
            <span>添加收藏</span>
          </WuiButton>

          <!-- 配置 3:限宽长文本按钮,内容自动换行(对应官方 ButtonWrapping 示例) -->
          <WuiButton
            class="wrap-button"
            :disabled="disabledValue"
            @click="onButtonClick"
          >
            这是一段较长的文本,超出按钮限宽后会自动换行显示,不会被裁剪
          </WuiButton>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Content" type="text" v-model="content" placeholder="按钮文本" />
        <DemoOptionRow label="Disabled(是否禁用)" type="toggle" v-model="disabled" />
        <DemoOptionRow label="FontSize" type="slider" v-model="fontSize" :min="10" :max="32" :step="1" />
        <DemoOptionRow
          label="FontWeight"
          type="select"
          v-model="fontWeight"
          :options="FONT_WEIGHT_CHOICES"
        />
        <DemoOptionRow label="CornerRadius" type="slider" v-model="cornerRadius" :min="0" :max="20" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ propsTableTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ eventsTableTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.button-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.click-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 插槽内联图标:currentColor 跟随按钮 Foreground 状态色 */
.slot-icon {
  width: 16px;
  height: 16px;
}

/* 限宽演示:结构尺寸约束(对应官方示例 MaxWidth=240),非主题 token */
.wrap-button {
  max-width: 240px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
