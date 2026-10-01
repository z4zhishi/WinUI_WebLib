<script setup lang="ts">
// ToggleSplitButtonPage.vue —— ToggleSplitButton 控件示例页(对照官方 Gallery
// Samples/ToggleSplitButton/ 与文档「Create a toggle split button」)。
// 结构照抄 HomePage.vue 母版:DemoPage(标题+描述)→ 交互演示(控件本体多配置)
// → DemoOptions(实时改参)→ DemoDocsTable + DemoCode。
// 演示一为「加粗开关」(官方文档样式):主区 "M",点击主区切换 checked(勾选后整钮
//   accent 底 + M 呈粗体 = 勾选视觉),弹层按钮套用后 isChecked = true/false + 收起
//   (对照官方 BulletButton_Click 的 IsChecked 赋值 + Flyout.Hide());
//   预览段落随 checked 加粗(对照官方 IsCheckedChanged 里对 RichEditBox 的应用)。
// 演示二复刻官方 Gallery 样例(项目符号列表):主区 SymbolIcon List,弹层两钮切换
//   Bullet / UppercaseRoman,选择后更新图标 + 勾选 + 收起;IsCheckedChanged 回显格式应用。
// 演示三为参数面板 + 事件日志(click / ischeckedchanged / open / close 全程回显)。
// 文案暂用中文双语文案常量(全站六语言在阶段 8 统一)。
import { computed, ref } from 'vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import WuiToggleSplitButton from '@/components/ToggleSplitButton.vue'
import type { PopupPlacement } from '@/composables/usePopup'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 ToggleSplitButton 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'ToggleSplitButton(开关拆分按钮)', en: 'ToggleSplitButton' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'ToggleSplitButton 是带开关语义的 SplitButton:点击主区(或 Space / Enter)在开 / 关之间切换并发出 click,勾选后整钮以系统强调色填充(TextOnAccent 前景);次区(chevron)仍用于打开弹层。适合「开关某功能 + 弹层里挑细分选项」的场景(如开关项目符号列表并选择样式)。与 ToggleButton 的差异:IsChecked 仅 boolean(无三态),事件只有 ischeckedchanged。',
  en: 'A ToggleSplitButton is a SplitButton with toggle semantics: the primary part toggles on/off (and raises click), showing an accent fill when checked; the secondary part (chevron) still opens the flyout. Unlike ToggleButton, IsChecked is a plain boolean (no three-state) and the only state event is IsCheckedChanged.',
}
const GROUP_BOLD: BilingualText = { zh: '加粗开关(官方文档样式)', en: 'Bold toggle (docs style)' }
const GROUP_LIST: BilingualText = {
  zh: '项目符号列表(官方 Gallery 样例复刻)',
  en: 'Bulleted list (official sample)',
}
const GROUP_EVENTS: BilingualText = { zh: '参数与事件日志', en: 'Options & event log' }
const LABEL_CURRENT_CHECKED: BilingualText = { zh: '当前 checked', en: 'Current checked' }
const LABEL_PREVIEW: BilingualText = { zh: '预览文本(勾选后加粗)', en: 'Preview (bold when checked)' }
const LABEL_MARKER: BilingualText = { zh: '列表格式(对照 IsCheckedChanged)', en: 'List format' }
const LABEL_APPLY_BOLD: BilingualText = { zh: '加粗', en: 'Bold' }
const LABEL_APPLY_REGULAR: BilingualText = { zh: '常规', en: 'Regular' }
const LABEL_BULLET_LIST: BilingualText = { zh: '项目符号', en: 'Bulleted list' }
const LABEL_ROMAN_LIST: BilingualText = { zh: '罗马数字', en: 'Roman numerals' }
const LABEL_CONTENT: BilingualText = { zh: '主区文本(Content)', en: 'Content' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(Disabled)', en: 'Disabled' }
const LABEL_CHECKED: BilingualText = { zh: '勾选(IsChecked)', en: 'Checked' }
const LABEL_PLACEMENT: BilingualText = { zh: '弹层放置位(Placement)', en: 'Placement' }
const LABEL_EVENT_LOG: BilingualText = {
  zh: '事件日志(click / ischeckedchanged / open / close)',
  en: 'Event log',
}
const PROPS_TABLE_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const EVENTS_TABLE_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const KEYBOARD_TABLE_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupBold = useBilingual(i18n, GROUP_BOLD)
const groupList = useBilingual(i18n, GROUP_LIST)
const groupEvents = useBilingual(i18n, GROUP_EVENTS)
const labelCurrentChecked = useBilingual(i18n, LABEL_CURRENT_CHECKED)
const labelPreview = useBilingual(i18n, LABEL_PREVIEW)
const labelMarker = useBilingual(i18n, LABEL_MARKER)
const labelApplyBold = useBilingual(i18n, LABEL_APPLY_BOLD)
const labelApplyRegular = useBilingual(i18n, LABEL_APPLY_REGULAR)
const labelBulletList = useBilingual(i18n, LABEL_BULLET_LIST)
const labelRomanList = useBilingual(i18n, LABEL_ROMAN_LIST)
const labelContent = useBilingual(i18n, LABEL_CONTENT)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelChecked = useBilingual(i18n, LABEL_CHECKED)
const labelPlacement = useBilingual(i18n, LABEL_PLACEMENT)
const labelEventLog = useBilingual(i18n, LABEL_EVENT_LOG)
const propsTableTitle = useBilingual(i18n, PROPS_TABLE_TITLE)
const eventsTableTitle = useBilingual(i18n, EVENTS_TABLE_TITLE)
const keyboardTableTitle = useBilingual(i18n, KEYBOARD_TABLE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

/* -------------------------------------------------------------------------
 * 事件日志(演示一 / 二 / 三共用,对照官方示例的 Output 区)
 * ---------------------------------------------------------------------- */

const eventLog = ref<string[]>([])

function logEvent(message: string): void {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  eventLog.value.unshift(`[${time}] ${message}`)
  if (eventLog.value.length > 8) eventLog.value.length = 8 // 保留最近 8 条
}

function onFlyoutOpen(): void {
  logEvent('flyout open')
}
function onFlyoutClose(): void {
  logEvent('flyout close')
}

/* -------------------------------------------------------------------------
 * 演示一:加粗开关(官方文档样式,M 带勾选视觉)
 * 主区 "M";点击主区翻转 checked(先翻转后 click,对照源 OnClickPrimary 次序);
 * 弹层两钮:套用加粗 / 常规后 isChecked = true/false + 收起(对照官方
 * BulletButton_Click:IsChecked 赋值 + Flyout.Hide());预览段落随 checked 加粗
 * (对照官方 IsCheckedChanged 对 RichEditBox 的应用)。
 * ---------------------------------------------------------------------- */

const boldChecked = ref(false)
const boldRef = ref<InstanceType<typeof WuiToggleSplitButton> | null>(null)

function onBoldClick(): void {
  // 点击时 checked 已翻转(源先 Toggle 后 Click),此处回显新值
  logEvent(`primary click → checked 翻转为 ${boldChecked.value}`)
}

function applyBold(bold: boolean): void {
  boldChecked.value = bold
  logEvent(`flyout item: ${bold ? 'Bold' : 'Regular'} → isChecked = ${bold} → 收起`)
  boldRef.value?.closeFlyout() // 官方:IsChecked 赋值 + Flyout.Hide()
}

/* -------------------------------------------------------------------------
 * 演示二:项目符号列表(官方 Gallery 样例复刻)
 * 主区 SymbolIcon;弹层两钮选 Bullet / UppercaseRoman,选择后更新图标 + 勾选 + 收起
 * (官方 BulletButton_Click);IsCheckedChanged:开 → 应用当前样式,关 → None
 * (官方 MyListButton_IsCheckedChanged,无 RichEditBox,以回显行代替)。
 * ---------------------------------------------------------------------- */

type MarkerType = 'Bullet' | 'UppercaseRoman' | 'None'

const currentMarker = ref<Exclude<MarkerType, 'None'>>('Bullet') // 官方初始 MarkerType.Bullet
const listChecked = ref(false)
const listRef = ref<InstanceType<typeof WuiToggleSplitButton> | null>(null)

const appliedMarker = computed<MarkerType>(() => (listChecked.value ? currentMarker.value : 'None'))

const listAriaLabel = computed(() =>
  currentMarker.value === 'Bullet' ? 'Bullets' : 'Roman Numerals', // 官方 AutomationProperties.Name
)

function onListClick(): void {
  logEvent(`primary click → checked 翻转为 ${listChecked.value}`)
}

function onListCheckedChanged(value: boolean): void {
  // 官方 MyListButton_IsCheckedChanged:开 → 套用选中样式;关 → MarkerType.None
  logEvent(`ischeckedchanged: ${value} → 列表格式 ${value ? currentMarker.value : 'None'}`)
}

function pickMarker(marker: Exclude<MarkerType, 'None'>): void {
  currentMarker.value = marker
  listChecked.value = true // 官方:myListButton.IsChecked = true
  logEvent(`flyout item: ${marker} → isChecked = true → 收起`)
  listRef.value?.closeFlyout() // 官方:myListButton.Flyout.Hide()
}

/* -------------------------------------------------------------------------
 * 演示三:参数面板 + 禁用(参数面板实时驱动)
 * ---------------------------------------------------------------------- */

// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoContent = ref<string | number | boolean>('Bold')
const demoDisabled = ref<string | number | boolean>(false)
const demoCheckedRaw = ref<string | number | boolean>(false)
const demoPlacement = ref<string | number | boolean>('bottom-start')

const placementOptions = [
  { label: 'bottom-start', value: 'bottom-start' },
  { label: 'bottom', value: 'bottom' },
  { label: 'bottom-end', value: 'bottom-end' },
  { label: 'top-start', value: 'top-start' },
  { label: 'top-end', value: 'top-end' },
]

const PLACEMENT_WHITELIST: readonly string[] = placementOptions.map((option) => option.value)
const placementValue = computed<PopupPlacement>(() => {
  const value = String(demoPlacement.value)
  return PLACEMENT_WHITELIST.includes(value) ? (value as PopupPlacement) : 'bottom-start'
})
const contentValue = computed(() => String(demoContent.value))
const isDisabledValue = computed(() => demoDisabled.value === true)

// 桥接:参数面板 toggle(联合类型)↔ 控件 v-model:is-checked(boolean)
const demoChecked = computed<boolean>({
  get: () => demoCheckedRaw.value === true,
  set: (value) => {
    demoCheckedRaw.value = value
  },
})

function onDemoClick(): void {
  logEvent(`primary click → checked 翻转为 ${demoChecked.value}`)
}
function onDemoCheckedChanged(value: boolean): void {
  logEvent(`ischeckedchanged: ${value}`)
}

/* -------------------------------------------------------------------------
 * 下半区固定开发文档
 * ---------------------------------------------------------------------- */

const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['isChecked', 'boolean', 'false', '勾选态(WinUI IsChecked;仅 boolean 无三态);v-model:is-checked 双向'],
  ['Content / 默认 slot', 'string / slot', "''", '主区文本;同名默认 slot 兜底(slot 优先,可放图标、"M" 字样等)'],
  ['#flyout (slot)', '—', '—', '弹层内容;可直接放 MenuFlyoutItem 族(自动获得菜单层上下文与皮肤)'],
  ['disabled', 'boolean', 'false', '禁用交互与焦点;禁用 + 勾选外观同「仅禁用」(源无 CheckedDisabled 态)'],
  ['placement', 'PopupPlacement', "'bottom-start'", '弹层放置位(源写死 BottomEdgeAlignedLeft → bottom-start)'],
  ['fontSize / fontWeight', 'number | string', '14 / Normal', '主区字号 / 字重(FontFamily 系属性)'],
  ['cornerRadius / padding', 'number | string', '4 / …', '圆角(ControlCornerRadius)/ 主区内边距(SplitButtonPadding)'],
  ['openFlyout() / closeFlyout()', 'method', '—', 'ref 程序化开关弹层(FlyoutBase.ShowAt/Hide 等价)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent | KeyboardEvent)', '主区激活(WinUI Click):先翻转 checked 再发出(源 OnClickPrimary = Toggle + Click);鼠标点主区或聚焦后 Space / Enter;禁用时不触发'],
  ['ischeckedchanged', '(value: boolean)', '勾选变化时(用户点击或程序性设置均触发,对照源 OnIsCheckedChanged);模板监听 @is-checked-changed'],
  ['open', '—', '弹层开始打开(次区点击 / Alt+Down / F4;继承 SplitButton)'],
  ['close', '—', '弹层已关闭(外部按下 / Escape / 锚滚动 / 再点次区)'],
]

const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['Tab', '聚焦 / 移出(仅根元素进 Tab 序,与源 IsTabStop 一致)'],
  ['Space / Enter', '按住整钮呈按压态(Checked 勾选时为 CheckedTouchPressed 配色),抬起翻转 checked 并触发 click'],
  ['Alt + ↓ / F4', '打开弹层(次区的键盘等价,对照源 AutomationPeer ExpandCollapse)'],
  ['↑ / ↓ / Home / End', '弹层内为菜单项用法时:在项间循环移动 / 跳到首末项'],
  ['Esc', '关闭弹层,焦点归还按钮'],
]

const usageCode = computed(
  () => `<script setup lang="ts">
import { ref } from 'vue'
import WuiToggleSplitButton from '@/components/ToggleSplitButton.vue'

const bold = ref(false)
<\/script>

<template>
  <!-- 主区开关:点击 / Space / Enter 翻转 checked,勾选后整钮 accent 底 -->
  <WuiToggleSplitButton
    content="M"
    v-model:is-checked="bold"
    @is-checked-changed="(value) => console.log('checked:', value)">
    <template #flyout>
      <!-- 弹层选项:套用后按需设置勾选并收起(对照官方 Flyout.Hide()) -->
      <button @click="bold = true">加粗</button>
      <button @click="bold = false">常规</button>
    </template>
  </WuiToggleSplitButton>
</template>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="ToggleSplitButton">
    <template #demo>
      <div class="togglesplitbutton-stage">
        <!-- 演示一:加粗开关(官方文档样式,M 带勾选视觉) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupBold }}</h3>
          <div class="demo-row">
            <WuiToggleSplitButton
              ref="boldRef"
              v-model:is-checked="boldChecked"
              @click="onBoldClick"
              @open="onFlyoutOpen"
              @close="onFlyoutClose"
            >
              <span class="bold-m" :class="{ 'is-on': boldChecked }">M</span>
              <template #flyout>
                <div class="flyout-actions">
                  <button type="button" class="flyout-btn" @click="applyBold(true)">
                    <WuiFontIcon glyph="&#xE8DD;" :font-size="16" />
                    {{ labelApplyBold }}
                  </button>
                  <button type="button" class="flyout-btn" @click="applyBold(false)">
                    {{ labelApplyRegular }}
                  </button>
                </div>
              </template>
            </WuiToggleSplitButton>
            <p class="demo-output">
              {{ labelCurrentChecked }}: <strong>{{ boldChecked ? 'true' : 'false' }}</strong>
            </p>
          </div>
          <div class="demo-column">
            <p class="demo-hint">{{ labelPreview }}</p>
            <p class="preview-text" :class="{ 'is-bold': boldChecked }">
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </section>

        <!-- 演示二:项目符号列表(官方 Gallery 样例复刻) -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupList }}</h3>
          <div class="demo-row">
            <WuiToggleSplitButton
              ref="listRef"
              v-model:is-checked="listChecked"
              :aria-label="listAriaLabel"
              @click="onListClick"
              @is-checked-changed="onListCheckedChanged"
              @open="onFlyoutOpen"
              @close="onFlyoutClose"
            >
              <WuiSymbolIcon :symbol="currentMarker === 'Bullet' ? 'List' : 'Bullets'" />
              <template #flyout>
                <div class="flyout-actions">
                  <!-- 官方弹层两钮:Button(Padding 4 / Margin 6 / CornerRadius 4)+ SymbolIcon -->
                  <button
                    type="button"
                    class="flyout-btn is-icon"
                    :aria-label="labelBulletList"
                    @click="pickMarker('Bullet')"
                  >
                    <WuiSymbolIcon symbol="List" :font-size="16" />
                  </button>
                  <button
                    type="button"
                    class="flyout-btn is-icon"
                    :aria-label="labelRomanList"
                    @click="pickMarker('UppercaseRoman')"
                  >
                    <WuiSymbolIcon symbol="Bullets" :font-size="16" />
                  </button>
                </div>
              </template>
            </WuiToggleSplitButton>
            <p class="demo-output">{{ labelMarker }}: <strong>{{ appliedMarker }}</strong></p>
          </div>
        </section>

        <!-- 演示三:参数面板 + 事件日志 -->
        <section class="demo-group">
          <h3 class="group-title">{{ groupEvents }}</h3>
          <div class="demo-row">
            <WuiToggleSplitButton
              v-model:is-checked="demoChecked"
              :content="contentValue"
              :placement="placementValue"
              :disabled="isDisabledValue"
              @click="onDemoClick"
              @is-checked-changed="onDemoCheckedChanged"
              @open="onFlyoutOpen"
              @close="onFlyoutClose"
            >
              <template #flyout>
                <div class="plain-flyout">
                  任意内容:文本、表单、菜单项……<br />Esc / 点击外部 / 滚动锚即收起。
                </div>
              </template>
            </WuiToggleSplitButton>
            <ul class="event-log" aria-live="polite" :aria-label="labelEventLog">
              <li v-if="eventLog.length === 0" class="is-first">—</li>
              <li v-for="(entry, index) in eventLog" :key="index" :class="{ 'is-first': index === 0 }">
                {{ entry }}
              </li>
            </ul>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelContent" type="text" v-model="demoContent" placeholder="ToggleSplitButton Content" />
        <DemoOptionRow :label="labelChecked" type="toggle" v-model="demoCheckedRaw" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelPlacement" type="select" v-model="demoPlacement" :options="placementOptions" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ propsTableTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ eventsTableTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ keyboardTableTitle }}</h3>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.togglesplitbutton-stage {
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

.demo-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.demo-column {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 对照官方示例的 Output TextBlock:轻量状态回显 */
.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 主区 "M":勾选后呈粗体(勾选视觉的一部分;整钮 accent 底由控件勾选态提供) */
.bold-m {
  font-size: 16px;
  line-height: 1;
  font-weight: 400;
}

.bold-m.is-on {
  font-weight: 700;
}

/* 勾选效果的预览段落(对照官方 IsCheckedChanged 对 RichEditBox 的应用) */
.preview-text {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.preview-text.is-bold {
  font-weight: 700;
}

/* 弹层动作按钮组:对照官方 Flyout 内 StackPanel + Button(Padding 4 / Margin 6 /
   MinWidth 0 / CornerRadius 4)的写法,仅以 flex 排列 */
.flyout-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.flyout-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 4px 8px;
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  background: transparent;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  cursor: default;
  user-select: none;
  touch-action: manipulation;
}

/* 悬停 / 按压:官方弹层内放的是 Button 控件,取 Button 状态 token(ControlFillColor 系) */
.flyout-btn:hover {
  background: var(--wui-button-background-pointer-over);
}

.flyout-btn:active {
  background: var(--wui-button-background-pressed);
}

.flyout-btn.is-icon {
  padding: 4px;
}

/* 演示三:一般弹层内容(仅示意) */
.plain-flyout {
  max-width: 220px;
  line-height: 1.6;
}

/* 事件日志:最近 8 条,最新一条高亮(aria-live 播报) */
.event-log {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 260px;
  max-width: 380px;
  margin: 0;
  padding: 8px 12px;
  list-style: none;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
}

.event-log .is-first {
  color: var(--wui-application-foreground-theme);
  font-weight: 600;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
