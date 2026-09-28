<script setup lang="ts">
// 示例页模板用法示范(后续控件示例页的抄写模板):DemoPage 组织「假想按钮」演示,
// 上半区交互调节参数,下半区固定呈现事件、属性等开发向文档。
// 真实 Button 控件落地后:仅把 #demo 里的原生 button 换成 <WuiButton>,并把参数映射到其 props,本页结构不动。
import { computed, ref } from 'vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(i18n 键集未覆盖,局部定义中英文案常量)——
const PAGE_TITLE: BilingualText = { zh: 'Button(假想示例)', en: 'Button (mock example)' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI Button 控件示例页模板:上半区交互调节参数,下半区固定呈现事件、属性与接受类型等开发向文档。',
  en: 'Template for control example pages: interactive options above, fixed developer docs (events, properties, accepted types) below.',
}
const CLICK_HINT: BilingualText = { zh: 'Click 已触发', en: 'Click fired' }
const UNIT_TIMES: BilingualText = { zh: '次', en: 'time(s)' }
const DOCS_MEMBERS_TITLE: BilingualText = { zh: '属性与事件', en: 'Properties & events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const clickHint = useBilingual(i18n, CLICK_HINT)
const unitTimes = useBilingual(i18n, UNIT_TIMES)
const docsMembersTitle = useBilingual(i18n, DOCS_MEMBERS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 可调参数(真实控件落地后映射为 WuiButton 的 props)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const content = ref<string | number | boolean>('点击我')
const fontSize = ref<string | number | boolean>(14)
const cornerRadius = ref<string | number | boolean>(4)
const bold = ref<string | number | boolean>(false)
const clickCount = ref(0)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const fontSizeValue = computed(() => toNumber(fontSize.value, 14))
const cornerRadiusValue = computed(() => toNumber(cornerRadius.value, 4))
const isBold = computed(() => bold.value === true)
const fontWeightValue = computed(() => (isBold.value ? '600' : '400'))

function onButtonClick(): void {
  clickCount.value += 1
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['Content', 'string', '按钮文本内容(左侧文本框实时调节)'],
  ['FontSize', 'number', '文字大小,单位 px(滑块实时调节)'],
  ['CornerRadius', 'number', '圆角半径,单位 px(滑块实时调节)'],
  ['FontWeight', "'normal' | 'bold'", '字重;开关打开为粗体'],
  ['Click', '(sender: Button, e: RoutedEventArgs) => void', '按钮被点击时触发;e 为路由事件参数'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiButton
  Content="${String(content.value)}"
  :FontSize="${fontSizeValue.value}"
  :CornerRadius="${cornerRadiusValue.value}"
  FontWeight="${isBold.value ? 'Bold' : 'Normal'}"
  @Click="onButtonClick" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="button-stage">
        <button
          type="button"
          class="demo-button"
          :style="{ fontSize: `${fontSizeValue}px`, borderRadius: `${cornerRadiusValue}px`, fontWeight: fontWeightValue }"
          @click="onButtonClick"
        >
          {{ content }}
        </button>
        <p class="click-hint">{{ clickHint }} {{ clickCount }} {{ unitTimes }}</p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Content" type="text" v-model="content" placeholder="按钮文本" />
        <DemoOptionRow label="FontWeight 粗体" type="toggle" v-model="bold" />
        <DemoOptionRow label="FontSize" type="slider" v-model="fontSize" :min="10" :max="32" :step="1" />
        <DemoOptionRow label="CornerRadius" type="slider" v-model="cornerRadius" :min="0" :max="20" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsMembersTitle }}</h4>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
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

/* 假想按钮:原生 button + WinUI Button token(真实控件落地后删除本段) */
.demo-button {
  padding: 5px 12px;
  font-family: inherit;
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  cursor: pointer;
}

.demo-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.demo-button:active {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.demo-button:focus-visible {
  outline: 2px solid var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme));
  outline-offset: 1px;
}

.click-hint {
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
