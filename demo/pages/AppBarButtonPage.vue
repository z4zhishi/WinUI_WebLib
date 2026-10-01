<script setup lang="ts">
// AppBarButtonPage.vue —— AppBarButton 控件示例页(对应官方 WinUI Gallery
// Samples/AppBarButton/:AppbarbuttonSymbolIcon / AppbarbuttonFontIcon / AppbarbuttonPathIcon /
// AppbarbuttonKeyboardaccelerator 四例复刻;另按任务要求补紧凑态与参数面板演示)。
// 结构照抄已通过 QA 的 DropDownButtonPage 母版:DemoPage(标题+描述)→ 交互演示 →
// DemoOptions(实时改参)→ DemoDocsTable + DemoCode。文案暂用中文双语文案常量(阶段 8 统一 i18n)。
import { computed, ref } from 'vue'
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiPathIcon from '@/components/PathIcon.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 AppBarButton 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'AppBarButton(应用栏按钮)', en: 'AppBarButton' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '命令栏族按钮:默认外观为透明背景的小尺寸按钮,图标在上、文字标签在下(Content 属性被忽略)。IsCompact 紧凑态只显示图标;支持加速键角标显示与命令栏式的列表高亮悬停反馈。',
  en: 'A command-bar button: transparent background, compact size, icon on top and label below (Content is ignored). IsCompact shows the icon only; supports a keyboard accelerator badge and list-highlight hover feedback.',
}
const SECTION_OFFICIAL_TITLE: BilingualText = { zh: '官方示例复刻(图标 + 标签)', en: 'Official samples (icon + label)' }
const SECTION_COMPACT_TITLE: BilingualText = { zh: '紧凑态(isCompact,仅图标)', en: 'Compact mode (icon only)' }
const SECTION_OPTIONS_TITLE: BilingualText = { zh: '参数面板驱动(右侧选项实时调节)', en: 'Options-driven demo' }
const LABEL_LAST_ACTION: BilingualText = { zh: '最近动作', en: 'Last action' }
const NO_ACTION_HINT: BilingualText = { zh: '尚无动作,试试点击上面任意按钮', en: 'No action yet' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionOfficialTitle = useBilingual(i18n, SECTION_OFFICIAL_TITLE)
const sectionCompactTitle = useBilingual(i18n, SECTION_COMPACT_TITLE)
const sectionOptionsTitle = useBilingual(i18n, SECTION_OPTIONS_TITLE)
const labelLastAction = useBilingual(i18n, LABEL_LAST_ACTION)
const noActionHint = useBilingual(i18n, NO_ACTION_HINT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例 1:官方示例复刻(点击输出对照官方 Control1Output「You clicked: …」)——
const officialAction = ref('')

function onOfficialClick(name: string): void {
  officialAction.value = `You clicked: ${name}`
}

// —— 示例 2:紧凑态(对照 CommandBar 的 IsCompact;同一组按钮全尺寸/紧凑并排对比)——
const compactAction = ref('')

function onCompactClick(name: string): void {
  compactAction.value = name
}

// —— 示例 3:参数面板驱动(DemoOptionRow 的 v-model 契约要求 string | number | boolean 联合类型)——
const demoLabel = ref<string | number | boolean>('Save')
const demoIsCompact = ref<string | number | boolean>(false)
const demoDisabled = ref<string | number | boolean>(false)
const demoAccelerator = ref<string | number | boolean>('Ctrl+S')
const demoWidth = ref<string | number | boolean>(68)
const demoClickCount = ref(0)

const labelText = computed(() => String(demoLabel.value))
const isCompactValue = computed(() => demoIsCompact.value === true)
const isDisabled = computed(() => demoDisabled.value === true)
const acceleratorText = computed(() => String(demoAccelerator.value))
const widthValue = computed(() => {
  const parsed = Number(demoWidth.value)
  return Number.isFinite(parsed) ? parsed : 68
})

function onDemoClick(): void {
  demoClickCount.value += 1
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['label', 'string', "''", '图标下方的文字标签(WinUI Label);isCompact 时隐藏'],
  ['isCompact', 'boolean', 'false', '紧凑态(WinUI IsCompact):仅显示图标、隐藏标签'],
  ['disabled', 'boolean', 'false', '禁用(WinUI IsEnabled 的取反映射):不触发 click'],
  ['keyboardAcceleratorText', 'string', "''", '加速键角标文本(WinUI KeyboardAcceleratorTextOverride,如 Ctrl+S);空串不显示'],
  ['width', 'number | string', '68', '按钮宽度(WinUI Width;默认 Style 固定 68)'],
  ['#icon (slot)', 'any', '—', '图标内容:FontIcon / SymbolIcon / PathIcon 或任意元素(WinUI Icon 属性;Content 被忽略)'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent)', '点击按钮(Space/Enter 同样触发,禁用时不触发);WinUI Click'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['Enter / Space', '激活按钮并触发 click(原生按钮语义)'],
  ['Tab', '焦点进入/移出按钮;键盘聚焦时显示下划线聚焦视觉(EllipsisFocusVisual 近似)'],
]
const usageCode = computed(
  () => `<WuiAppBarButton label="${labelText.value}"${
    acceleratorText.value ? ` keyboard-accelerator-text="${acceleratorText.value}"` : ''
  }${isCompactValue.value ? ' is-compact' : ''} @click="onSave">
  <template #icon>
    <WuiSymbolIcon symbol="Save" :font-size="16" />
  </template>
</WuiAppBarButton>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="AppBarButton">
    <template #demo>
      <div class="abb-sections">
        <!-- 示例 1:官方示例复刻(SymbolIcon / FontIcon / PathIcon / KeyboardAccelerator,对照
             AppbarbuttonSymbolIcon.txt / AppbarbuttonFontIcon.txt / AppbarbuttonPathIcon.txt /
             AppbarbuttonKeyboardaccelerator.txt;点击输出对照官方 Control1Output) -->
        <section class="abb-section">
          <h3 class="docs-subtitle">{{ sectionOfficialTitle }}</h3>
          <div class="abb-row">
            <WuiAppBarButton label="SymbolIcon" @click="onOfficialClick('Button1')">
              <template #icon><WuiSymbolIcon symbol="Like" :font-size="16" /></template>
            </WuiAppBarButton>

            <WuiAppBarButton label="FontIcon" @click="onOfficialClick('Button3')">
              <template #icon>
                <WuiFontIcon glyph="&Sigma;" font-family="Candara, serif" :font-size="16" />
              </template>
            </WuiAppBarButton>

            <WuiAppBarButton label="PathIcon" @click="onOfficialClick('Button4')">
              <template #icon>
                <WuiPathIcon data="F1 M 20,20L 24,10L 24,24L 5,24" viewBox="0 0 24 24" />
              </template>
            </WuiAppBarButton>

            <WuiAppBarButton
              label="Save"
              keyboard-accelerator-text="Ctrl+S"
              @click="onOfficialClick('Button5')"
            >
              <template #icon><WuiSymbolIcon symbol="Save" :font-size="16" /></template>
            </WuiAppBarButton>

            <p class="abb-hint">
              {{ labelLastAction }}:<template v-if="officialAction !== ''">{{ officialAction }}</template><template v-else>{{ noActionHint }}</template>
            </p>
          </div>
        </section>

        <!-- 示例 2:紧凑态(仅图标;对照 CommandBar 的 IsCompact 行为) -->
        <section class="abb-section">
          <h3 class="docs-subtitle">{{ sectionCompactTitle }}</h3>
          <div class="abb-row">
            <WuiAppBarButton label="Add" @click="onCompactClick('Add')">
              <template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template>
            </WuiAppBarButton>
            <WuiAppBarButton label="Edit" @click="onCompactClick('Edit')">
              <template #icon><WuiSymbolIcon symbol="Edit" :font-size="16" /></template>
            </WuiAppBarButton>
            <WuiAppBarButton label="Delete" @click="onCompactClick('Delete')">
              <template #icon><WuiSymbolIcon symbol="Delete" :font-size="16" /></template>
            </WuiAppBarButton>
            <span class="abb-divider" aria-hidden="true"></span>
            <WuiAppBarButton label="Add" is-compact @click="onCompactClick('Add (compact)')">
              <template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template>
            </WuiAppBarButton>
            <WuiAppBarButton label="Edit" is-compact @click="onCompactClick('Edit (compact)')">
              <template #icon><WuiSymbolIcon symbol="Edit" :font-size="16" /></template>
            </WuiAppBarButton>
            <WuiAppBarButton label="Share" is-compact disabled>
              <template #icon><WuiSymbolIcon symbol="Share" :font-size="16" /></template>
            </WuiAppBarButton>
            <p class="abb-hint">{{ labelLastAction }}:<template v-if="compactAction !== ''">{{ compactAction }}</template><template v-else>{{ noActionHint }}</template></p>
          </div>
        </section>

        <!-- 示例 3:参数面板驱动(label / isCompact / disabled / accelerator / width 实时调节) -->
        <section class="abb-section">
          <h3 class="docs-subtitle">{{ sectionOptionsTitle }}</h3>
          <div class="abb-row">
            <WuiAppBarButton
              :label="labelText"
              :is-compact="isCompactValue"
              :disabled="isDisabled"
              :keyboard-accelerator-text="acceleratorText"
              :width="widthValue"
              @click="onDemoClick"
            >
              <template #icon><WuiSymbolIcon symbol="Save" :font-size="16" /></template>
            </WuiAppBarButton>
            <p class="abb-hint">{{ labelLastAction }}:click × {{ demoClickCount }}</p>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Label" type="text" v-model="demoLabel" placeholder="按钮标签" />
        <DemoOptionRow label="IsCompact 紧凑态" type="toggle" v-model="demoIsCompact" />
        <DemoOptionRow label="Disabled 禁用" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow label="KeyboardAcceleratorText" type="text" v-model="demoAccelerator" placeholder="如 Ctrl+S,留空隐藏" />
        <DemoOptionRow label="Width" type="slider" v-model="demoWidth" :min="40" :max="120" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsKeyboardTitle }}</h3>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.abb-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.abb-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.abb-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.abb-hint {
  flex-basis: 100%;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 组内分隔(全尺寸 vs 紧凑对比) */
.abb-divider {
  align-self: stretch;
  width: 1px;
  margin: 0 8px;
  background: var(--wui-system-control-background-base-low);
}

.docs-subtitle {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
