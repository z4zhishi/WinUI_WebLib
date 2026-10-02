<script setup lang="ts">
// AppBarToggleButtonPage.vue —— AppBarToggleButton 控件示例页(对应官方 WinUI Gallery
// Samples/AppBarToggleButton/:AppBarToggleButtonPage.xaml 四例复刻 —— SymbolIcon /
// FontIcon / 三态 PathIcon;点击输出对照官方 code-behind 的「IsChecked = True/False」)。
// 结构照抄已通过 QA 的 AppBarButtonPage / ToggleButtonPage 母版:DemoPage(标题+描述)
// → 交互演示 → DemoOptions(实时改参)→ DemoDocsTable + DemoCode。
// 文案暂用中文双语文案常量(全站六语言在阶段 8 统一)。
import { computed, ref, watch } from 'vue'
import WuiAppBarToggleButton from '@/components/AppBarToggleButton.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiPathIcon from '@/components/PathIcon.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 AppBarToggleButton 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'AppBarToggleButton(应用栏切换按钮)', en: 'AppBarToggleButton' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '外观像 AppBarButton、行为像 CheckBox 的命令栏切换按钮:通常在选中(on)与未选中(off)之间切换,IsThreeState 为 true 时还可进入不确定态,状态经 IsChecked 读取;选中时整枚按钮点亮强调色底。',
  en: 'An AppBarToggleButton looks like an AppBarButton but works like a CheckBox: it toggles between checked (on) and unchecked (off), can be indeterminate when IsThreeState is true, and lights up an accent background while checked.',
}
const SECTION_OFFICIAL_TITLE: BilingualText = { zh: '官方示例复刻(图标 + 标签 + 状态回显)', en: 'Official samples (icon + label + state echo)' }
const SECTION_STATES_TITLE: BilingualText = { zh: '状态一览(Checked × 交互态)', en: 'State gallery (Checked × interaction states)' }
const SECTION_OPTIONS_TITLE: BilingualText = { zh: '参数面板驱动(右侧选项实时调节)', en: 'Options-driven demo' }
const LABEL_NO_OUTPUT: BilingualText = { zh: '尚无输出,试试点击/切换上面任意按钮', en: 'No output yet — click or toggle any button above' }
const LABEL_LAST_EVENT: BilingualText = { zh: '最近事件', en: 'Last event' }
const STATE_CHECKED: BilingualText = { zh: 'On(选中)', en: 'On (checked)' }
const STATE_UNCHECKED: BilingualText = { zh: 'Off(未选中)', en: 'Off (unchecked)' }
const STATE_INDETERMINATE: BilingualText = { zh: '不确定(indeterminate)', en: 'Indeterminate' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }
const LABEL_CONTENT: BilingualText = { zh: 'Label 标签', en: 'Label' }
const LABEL_STATE: BilingualText = { zh: 'IsChecked 状态', en: 'IsChecked' }
const LABEL_THREE_STATE: BilingualText = { zh: 'IsThreeState 三态', en: 'IsThreeState' }
const LABEL_COMPACT: BilingualText = { zh: 'IsCompact 紧凑态', en: 'IsCompact' }
const LABEL_DISABLED: BilingualText = { zh: 'Disabled 禁用', en: 'Disabled' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionOfficialTitle = useBilingual(i18n, SECTION_OFFICIAL_TITLE)
const sectionStatesTitle = useBilingual(i18n, SECTION_STATES_TITLE)
const sectionOptionsTitle = useBilingual(i18n, SECTION_OPTIONS_TITLE)
const labelNoOutput = useBilingual(i18n, LABEL_NO_OUTPUT)
const labelLastEvent = useBilingual(i18n, LABEL_LAST_EVENT)
const stateCheckedText = useBilingual(i18n, STATE_CHECKED)
const stateUncheckedText = useBilingual(i18n, STATE_UNCHECKED)
const stateIndeterminateText = useBilingual(i18n, STATE_INDETERMINATE)
const labelContent = useBilingual(i18n, LABEL_CONTENT)
const labelState = useBilingual(i18n, LABEL_STATE)
const labelThreeState = useBilingual(i18n, LABEL_THREE_STATE)
const labelCompact = useBilingual(i18n, LABEL_COMPACT)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例 1:官方示例复刻(输出对照官方 code-behind:「IsChecked = True / False / 空串」)——
const s1 = ref<boolean | 'indeterminate'>(false) // Button1:SymbolIcon
const s3 = ref<boolean | 'indeterminate'>(false) // Button3:FontIcon
const s4 = ref<boolean | 'indeterminate'>(false) // Button4:三态 PathIcon(IsThreeState)

function formatIsChecked(state: boolean | 'indeterminate'): string {
  return state === true ? 'True' : state === false ? 'False' : ''
}

const output1 = ref('')
const output3 = ref('')
const output4 = ref('')

watch(s1, (value) => {
  output1.value = `IsChecked = ${formatIsChecked(value)}`
})
watch(s3, (value) => {
  output3.value = `IsChecked = ${formatIsChecked(value)}`
})
watch(s4, (value) => {
  output4.value = `IsChecked = ${formatIsChecked(value)}`
})

// —— 示例 2:状态一览(Unchecked/Checked × Normal/Disabled + 三态不确定 + 紧凑态)——
// 各按钮独立持有状态,直观对照 generic.xaml 组合态视觉(选中态的强调色底点亮)。
const galleryChecked = ref<boolean | 'indeterminate'>(true)
const galleryIndeterminate = ref<boolean | 'indeterminate'>('indeterminate')
const galleryDisabledChecked = ref<boolean | 'indeterminate'>(true)
const galleryCompactChecked = ref<boolean | 'indeterminate'>(true)

// —— 示例 3:参数面板驱动(DemoOptionRow 的 v-model 契约要求 string | number | boolean 联合类型)——
const demoLabel = ref<string | number | boolean>('Shuffle')
const demoState = ref<string | number | boolean>('unchecked')
const demoThreeState = ref<string | number | boolean>(false)
const demoCompact = ref<string | number | boolean>(false)
const demoDisabled = ref<string | number | boolean>(false)
const demoAccelerator = ref<string | number | boolean>('Ctrl+S')
const demoReveal = ref<string | number | boolean>(false)

// 状态下拉与 isChecked 模型双向同步:下拉设置状态,点击按钮后下拉回显当前态。
const demoChecked = ref<boolean | 'indeterminate'>(false)
const demoClickCount = ref(0)
const lastEvent = ref('—')

const labelText = computed(() => String(demoLabel.value))
const isThreeStateValue = computed(() => demoThreeState.value === true)
const isCompactValue = computed(() => demoCompact.value === true)
const isDisabledValue = computed(() => demoDisabled.value === true)
const acceleratorText = computed(() => String(demoAccelerator.value))
const revealValue = computed(() => demoReveal.value === true)

const stateOptions = [
  { label: 'Unchecked', value: 'unchecked' },
  { label: 'Checked', value: 'checked' },
  { label: 'Indeterminate', value: 'indeterminate' },
]

watch(demoState, (value) => {
  demoChecked.value = value === 'checked' ? true : value === 'indeterminate' ? 'indeterminate' : false
})
watch(demoChecked, (value) => {
  demoState.value = value === true ? 'checked' : value === 'indeterminate' ? 'indeterminate' : 'unchecked'
})

// 回显行:状态 + 最近事件 + 点击计数(对照官方 Control1Output 的状态回显)。
const demoStateText = computed(() =>
  demoChecked.value === true
    ? stateCheckedText.value
    : demoChecked.value === 'indeterminate'
      ? stateIndeterminateText.value
      : stateUncheckedText.value,
)

function onDemoChecked(): void {
  lastEvent.value = 'checked'
}
function onDemoUnchecked(): void {
  lastEvent.value = 'unchecked'
}
function onDemoIndeterminate(): void {
  lastEvent.value = 'indeterminate'
}
function onDemoClick(): void {
  demoClickCount.value += 1
}

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['icon', 'string', "''", '图标:WinUI Symbol 枚举名(如 Shuffle)或字形字符;#icon slot 放 FontIcon / BitmapIcon / PathIcon 等(slot 优先)'],
  ['label', 'string', "''", '图标下方的文字标签(WinUI Label);isCompact 时隐藏'],
  ['isChecked (v-model)', "boolean | 'indeterminate'", 'false', '选中状态(WinUI IsChecked);indeterminate 对应 IsChecked = null'],
  ['isThreeState', 'boolean', 'false', '是否允许用户点击进入不确定态(WinUI IsThreeState)'],
  ['isCompact', 'boolean', 'false', '紧凑态(WinUI IsCompact):仅显示图标、隐藏标签'],
  ['keyboardAcceleratorText', 'string', "''", '加速键文本(WinUI KeyboardAcceleratorTextOverride,如 Ctrl+S):角标显示并注册全局按键监听'],
  ['disabled', 'boolean', 'false', '禁用交互(WinUI IsEnabled = false 的取反映射)'],
  ['width', 'number | string', '68', '按钮宽度(WinUI Width;默认 Style 固定 68)'],
  ['reveal', 'boolean', 'CommandBar 内 true / 独立 false', 'Reveal 揭示光照(对照 AppBarToggleButtonRevealStyle):CommandBar 内默认启用(源隐式样式),独立使用 opt-in;跟随指针光晕,仅指针设备,reduced-motion 退化静态 hover'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent)', '点击/Space/Enter/加速键激活时触发(禁用时不触发);WinUI Click'],
  ['checked', '—', '交互后进入选中态(WinUI Checked)'],
  ['unchecked', '—', '交互后进入未选中态(WinUI Unchecked)'],
  ['indeterminate', '—', '交互后进入不确定态(WinUI Indeterminate)'],
  ['update:isChecked', "boolean | 'indeterminate'", 'v-model:isChecked 双向绑定更新'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['Enter / Space', '切换选中状态并触发 click(原生按钮语义)'],
  ['Ctrl+S 等', 'keyboardAcceleratorText 声明的全局加速键:匹配即切换一次(WinUI KeyboardAccelerator 语义)'],
  ['Tab', '焦点进入/移出按钮;键盘聚焦时显示系统焦点环'],
]
const usageCode = computed(
  () => `<WuiAppBarToggleButton
  label="${labelText.value}"
  icon="Shuffle"
  v-model:is-checked="isChecked"${
    isThreeStateValue.value ? '\n  :is-three-state="true"' : ''
  }${isCompactValue.value ? '\n  is-compact' : ''}${
    acceleratorText.value ? `\n  keyboard-accelerator-text="${acceleratorText.value}"` : ''
  }
  @checked="onChecked"
  @unchecked="onUnchecked" />`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="AppBarToggleButton">
    <template #demo>
      <div class="atb-sections">
        <!-- 示例 1:官方示例复刻(对照 AppBarToggleButtonPage.xaml 的 Button1/Button3/Button4;
             输出对照 code-behind Control1Output 的「IsChecked = …」) -->
        <section class="atb-section">
          <h3 class="docs-subtitle">{{ sectionOfficialTitle }}</h3>
          <div class="atb-row">
            <WuiAppBarToggleButton v-model:is-checked="s1" icon="Shuffle" label="SymbolIcon" />
            <WuiAppBarToggleButton v-model:is-checked="s3" label="FontIcon">
              <template #icon>
                <WuiFontIcon glyph="&Sigma;" font-family="Candara, serif" :font-size="16" />
              </template>
            </WuiAppBarToggleButton>
            <WuiAppBarToggleButton v-model:is-checked="s4" label="PathIcon" :is-three-state="true">
              <template #icon>
                <WuiPathIcon data="F1 M 20,20L 24,10L 24,24L 5,24" viewBox="0 0 24 24" />
              </template>
            </WuiAppBarToggleButton>
            <p class="atb-hint">
              <template v-if="output1 !== ''">SymbolIcon {{ output1 }}<br /></template>
              <template v-if="output3 !== ''">FontIcon {{ output3 }}<br /></template>
              <template v-if="output4 !== ''">PathIcon {{ output4 }}<br /></template>
              <template v-if="output1 === '' && output3 === '' && output4 === ''">{{ labelNoOutput }}</template>
            </p>
          </div>
        </section>

        <!-- 示例 2:状态一览(选中强调色底 × 交互态 + 三态不确定 + 紧凑态) -->
        <section class="atb-section">
          <h3 class="docs-subtitle">{{ sectionStatesTitle }}</h3>
          <div class="atb-row">
            <WuiAppBarToggleButton icon="Shuffle" label="Off" />
            <WuiAppBarToggleButton v-model:is-checked="galleryChecked" icon="Bold" label="On(选中)" />
            <WuiAppBarToggleButton v-model:is-checked="galleryIndeterminate" icon="Italic" label="不确定" :is-three-state="true" />
            <WuiAppBarToggleButton icon="Underline" label="Disabled" disabled />
            <WuiAppBarToggleButton v-model:is-checked="galleryDisabledChecked" icon="Underline" label="On + Disabled" disabled />
            <WuiAppBarToggleButton v-model:is-checked="galleryCompactChecked" icon="AlignLeft" label="On(紧凑)" is-compact />
          </div>
        </section>

        <!-- 示例 3:参数面板驱动(label / IsChecked / IsThreeState / IsCompact / 加速键 实时调节) -->
        <section class="atb-section">
          <h3 class="docs-subtitle">{{ sectionOptionsTitle }}</h3>
          <div class="atb-row">
            <WuiAppBarToggleButton
              v-model:is-checked="demoChecked"
              icon="Shuffle"
              :label="labelText"
              :is-compact="isCompactValue"
              :is-three-state="isThreeStateValue"
              :disabled="isDisabledValue"
              :keyboard-accelerator-text="acceleratorText"
              :reveal="revealValue ? true : undefined"
              @click="onDemoClick"
              @checked="onDemoChecked"
              @unchecked="onDemoUnchecked"
              @indeterminate="onDemoIndeterminate"
            />
            <p class="atb-hint">
              {{ demoStateText }} · {{ labelLastEvent }}: {{ lastEvent }} · click × {{ demoClickCount }}
            </p>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelContent" type="text" v-model="demoLabel" placeholder="按钮标签" />
        <DemoOptionRow :label="labelState" type="select" v-model="demoState" :options="stateOptions" />
        <DemoOptionRow :label="labelThreeState" type="toggle" v-model="demoThreeState" />
        <DemoOptionRow :label="labelCompact" type="toggle" v-model="demoCompact" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow label="KeyboardAcceleratorText" type="text" v-model="demoAccelerator" placeholder="如 Ctrl+S,留空禁用" />
        <DemoOptionRow label="Reveal(揭示光照)" type="toggle" v-model="demoReveal" />
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
.atb-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.atb-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.atb-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* 对照官方示例的 Control1Output:轻量状态回显 */
.atb-hint {
  flex-basis: 100%;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
