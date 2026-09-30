<script setup lang="ts">
// SplitButtonPage.vue —— SplitButton 控件示例页(对照官方 WinUI Gallery Samples/SplitButton/)。
// 结构照抄 HomePage.vue 母版:DemoPage(标题+描述)→ 交互演示(控件本体多配置)
// → DemoOptions(实时改参)→ DemoDocsTable + DemoCode。
// 演示一复刻官方 SplitButtonColorPicker(主区色块 + 弹层色板网格,点色块更新主区色并收起);
// 演示二为「内嵌 MenuFlyout」文档示例(#flyout slot 直接放 MenuFlyoutItem 族,点击项自动收起);
// 演示三为事件日志 + 禁用(主区 click / 弹层 open / close 全程回显,对照官方示例的 Output)。
// 色板使用官方示例的字面色值(样例内容,非控件视觉,不适用 --wui-* token 规则)。
// 文案暂用中文双语文案常量(全站六语言在阶段 8 统一)。
import { computed, ref } from 'vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiMenuFlyoutItem from '@/components/MenuFlyoutItem.vue'
import WuiMenuFlyoutSeparator from '@/components/MenuFlyoutSeparator.vue'
import WuiSplitButton from '@/components/SplitButton.vue'
import WuiToggleMenuFlyoutItem from '@/components/ToggleMenuFlyoutItem.vue'
import type { PopupPlacement } from '@/composables/usePopup'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 SplitButton 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'SplitButton(拆分按钮)', en: 'SplitButton' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'SplitButton 是下拉按钮,但额外提供了一个独立的执行热区:点击主区直接执行命令,点击次区(chevron)打开关联的 Flyout。两区共享四态视觉,又可独立按压;键盘上 Space/Enter 触发主区,Alt+Down 或 F4 打开弹层。',
  en: 'A SplitButton is a dropdown button with a separate execution hit target: the primary part invokes the command directly, the secondary part (chevron) shows the associated flyout. Keyboard: Space/Enter for the primary part, Alt+Down or F4 for the flyout.',
}
const GROUP_COLOR_PICKER: BilingualText = {
  zh: '色板选择器(官方示例复刻)',
  en: 'Color picker (official sample)',
}
const GROUP_MENU: BilingualText = {
  zh: '内嵌 MenuFlyout(官方文档示例)',
  en: 'Embedded MenuFlyout (docs sample)',
}
const GROUP_EVENTS: BilingualText = { zh: '事件日志与禁用', en: 'Event log & disabled' }
const LABEL_CURRENT_COLOR: BilingualText = { zh: '当前颜色', en: 'Current color' }
const LABEL_CONTENT: BilingualText = { zh: '主区文本(Content)', en: 'Content' }
const LABEL_DISABLED: BilingualText = { zh: '禁用(Disabled)', en: 'Disabled' }
const LABEL_PLACEMENT: BilingualText = { zh: '弹层放置位(Placement)', en: 'Placement' }
const LABEL_EVENT_LOG: BilingualText = { zh: '事件日志(主区 click / 弹层 open / close)', en: 'Event log' }
const LABEL_REPEAT: BilingualText = { zh: '重复', en: 'Repeat' }
const PROPS_TABLE_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const EVENTS_TABLE_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const KEYBOARD_TABLE_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupColorPicker = useBilingual(i18n, GROUP_COLOR_PICKER)
const groupMenu = useBilingual(i18n, GROUP_MENU)
const groupEvents = useBilingual(i18n, GROUP_EVENTS)
const labelCurrentColor = useBilingual(i18n, LABEL_CURRENT_COLOR)
const labelContent = useBilingual(i18n, LABEL_CONTENT)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelPlacement = useBilingual(i18n, LABEL_PLACEMENT)
const labelEventLog = useBilingual(i18n, LABEL_EVENT_LOG)
const labelRepeat = useBilingual(i18n, LABEL_REPEAT)
const propsTableTitle = useBilingual(i18n, PROPS_TABLE_TITLE)
const eventsTableTitle = useBilingual(i18n, EVENTS_TABLE_TITLE)
const keyboardTableTitle = useBilingual(i18n, KEYBOARD_TABLE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

/* -------------------------------------------------------------------------
 * 演示一:色板选择器(官方 SplitButtonColorPicker 复刻)
 * 主区内容为 32x32 色块(Padding=0),#flyout 放 3 列色板网格;
 * 点色块 → 更新主区色 → 收起弹层(官方 GridView_ItemClick + Flyout.Hide())。
 * ---------------------------------------------------------------------- */

// 官方示例的字面色板(Red…Gray 8 色 + Black,与官方两例合并)
const SWATCHES = [
  { name: 'Red', value: 'red' },
  { name: 'Orange', value: 'orange' },
  { name: 'Yellow', value: 'yellow' },
  { name: 'Green', value: 'green' },
  { name: 'Blue', value: 'blue' },
  { name: 'Indigo', value: 'indigo' },
  { name: 'Violet', value: 'violet' },
  { name: 'Gray', value: 'gray' },
  { name: 'Black', value: 'black' },
] as const

const currentColor = ref<string>('green') // 官方初始 Green
const colorSplitRef = ref<InstanceType<typeof WuiSplitButton> | null>(null)
const pickedSwatch = computed(
  () => SWATCHES.find((swatch) => swatch.value === currentColor.value)?.name ?? currentColor.value,
)

function onSwatchClick(value: string): void {
  currentColor.value = value
  logEvent(`flyout item: ${value} → 收起`)
  colorSplitRef.value?.closeFlyout() // 官方:点色块后显式 Flyout.Hide()
}

/* -------------------------------------------------------------------------
 * 演示二:内嵌 MenuFlyout(官方文档示例:命令菜单 + 分隔线 + 开关项)
 * #flyout slot 直接放 MenuFlyoutItem 族 —— SplitButton 注入菜单层上下文,
 * 项点击后自动收起(与 MenuFlyout 内一致)。
 * ---------------------------------------------------------------------- */

const repeatChecked = ref(true)

/* -------------------------------------------------------------------------
 * 演示三:事件日志 + 禁用(参数面板实时驱动)
 * ---------------------------------------------------------------------- */

// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoContent = ref<string | number | boolean>('Manage')
const demoDisabled = ref<string | number | boolean>(false)
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

// —— 事件日志:主区 click / 弹层 open / close 全程回显(对照官方示例 Output 区)——
const eventLog = ref<string[]>([])

function logEvent(message: string): void {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  eventLog.value.unshift(`[${time}] ${message}`)
  if (eventLog.value.length > 8) eventLog.value.length = 8 // 保留最近 8 条
}

function onPrimaryClick(event: MouseEvent | KeyboardEvent): void {
  const source = event instanceof KeyboardEvent ? 'keyboard' : 'mouse'
  logEvent(`primary click (${source})`)
}
function onFlyoutOpen(): void {
  logEvent('flyout open')
}
function onFlyoutClose(): void {
  logEvent('flyout close')
}

function onMenuShare(): void {
  logEvent('menu item: Share (Ctrl+S)')
}
function onMenuCopy(): void {
  logEvent('menu item: Copy (Ctrl+C)')
}
function onMenuDelete(): void {
  logEvent('menu item: Delete')
}

/* -------------------------------------------------------------------------
 * 下半区固定开发文档
 * ---------------------------------------------------------------------- */

const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['Content', 'string', "''", '主区文本;同名默认 slot 兜底(slot 优先,可放色块/图标等)'],
  ['#flyout (slot)', '—', '—', '弹层内容;可直接放 MenuFlyoutItem 族(自动获得菜单层上下文与皮肤)'],
  ['disabled', 'boolean', 'false', '禁用交互与焦点(WinUI IsEnabled = false)'],
  ['placement', 'PopupPlacement', "'bottom-start'", '弹层放置位(源写死 BottomEdgeAlignedLeft → bottom-start)'],
  ['fontSize / fontWeight', 'number | string', '14 / Normal', '主区字号 / 字重(FontFamily 系属性)'],
  ['cornerRadius', 'number | string', '4', '圆角(ControlCornerRadius)'],
  ['padding', 'string', "'6px 11px 7px'", '主区内边距(SplitButtonPadding 11,6,11,7)'],
  ['openFlyout() / closeFlyout()', 'method', '—', 'ref 程序化开关弹层(FlyoutBase.ShowAt/Hide 等价)'],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click', '(event: MouseEvent | KeyboardEvent)', '主区激活(WinUI Click):鼠标点主区,或聚焦后按 Space / Enter(键抬起确认);禁用时不触发'],
  ['open', '—', '弹层开始打开(次区点击 / Alt+Down / F4;WinUI 由 Flyout.Opened 提供,Web 侧合并)'],
  ['close', '—', '弹层已关闭(外部按下 / Escape / 锚滚动 / 再点次区 / 选中菜单项)'],
]

const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['Tab', '聚焦 / 移出 SplitButton(仅根元素进 Tab 序,与源 IsTabStop 一致)'],
  ['Space / Enter', '按住整钮呈按压态,抬起触发主区 click'],
  ['Alt + ↓ / F4', '打开弹层(次区的键盘等价,对照源 AutomationPeer ExpandCollapse)'],
  ['↑ / ↓ / Home / End', '弹层内为菜单项用法时:在项间循环移动 / 跳到首末项'],
  ['Enter / Space(层内)', '激活当前菜单项,弹层收起'],
  ['Esc', '关闭弹层,焦点归还 SplitButton;子菜单逐级收起'],
]

const usageCode = computed(
  () => `<WuiSplitButton
  content="${contentValue.value}"
  :placement="'${placementValue.value}'"
  :disabled="${isDisabledValue.value}"
  @click="onPrimaryClick"
  @open="onFlyoutOpen"
  @close="onFlyoutClose">
  <template #flyout>
    <WuiMenuFlyoutItem text="Share" :accelerator-keys="'Ctrl+S'" @click="onShare" />
    <WuiMenuFlyoutItem text="Copy" icon="Copy" @click="onCopy" />
    <WuiMenuFlyoutSeparator />
    <WuiToggleMenuFlyoutItem text="Repeat" v-model:is-checked="repeat" />
  </template>
</WuiSplitButton>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="SplitButton">
    <template #demo>
      <div class="splitbutton-stage">
        <!-- 演示一:色板选择器(官方 SplitButtonColorPicker 复刻:主区色块 + 弹层色板) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupColorPicker }}</h4>
          <div class="demo-row">
            <WuiSplitButton
              ref="colorSplitRef"
              padding="0"
              @click="() => logEvent('primary click: 应用当前颜色')"
            >
              <span class="swatch" :style="{ background: currentColor }" />
              <template #flyout>
                <div class="swatch-grid">
                  <button
                    v-for="swatch in SWATCHES"
                    :key="swatch.value"
                    type="button"
                    class="swatch"
                    :style="{ background: swatch.value }"
                    :aria-label="swatch.name"
                    @click="onSwatchClick(swatch.value)"
                  />
                </div>
              </template>
            </WuiSplitButton>
            <p class="demo-output">{{ labelCurrentColor }}: {{ pickedSwatch }}</p>
          </div>
        </section>

        <!-- 演示二:内嵌 MenuFlyout(官方文档示例:命令菜单 + 分隔线 + 开关项) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupMenu }}</h4>
          <div class="demo-row">
            <WuiSplitButton content="Add" @click="() => logEvent('primary click: Add')">
              <template #flyout>
                <WuiMenuFlyoutItem :accelerator-keys="'Ctrl+S'" @click="onMenuShare">
                  <template #icon>
                    <WuiFontIcon glyph="&#xE72D;" :font-size="16" />
                  </template>
                  Share
                </WuiMenuFlyoutItem>
                <WuiMenuFlyoutItem icon="Copy" :accelerator-keys="'Ctrl+C'" @click="onMenuCopy">
                  Copy
                </WuiMenuFlyoutItem>
                <WuiMenuFlyoutItem icon="Delete" @click="onMenuDelete">Delete</WuiMenuFlyoutItem>
                <WuiMenuFlyoutSeparator />
                <WuiToggleMenuFlyoutItem :text="labelRepeat" v-model:is-checked="repeatChecked" />
              </template>
            </WuiSplitButton>
            <span class="demo-hint">↑↓ 导航 · Esc 收起 · 开关项点击不收起</span>
          </div>
        </section>

        <!-- 演示三:事件日志 + 禁用(参数面板实时驱动) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupEvents }}</h4>
          <div class="demo-row">
            <WuiSplitButton
              :content="contentValue"
              :placement="placementValue"
              :disabled="isDisabledValue"
              @click="onPrimaryClick"
              @open="onFlyoutOpen"
              @close="onFlyoutClose"
            >
              <template #flyout>
                <div class="plain-flyout">
                  任意内容:文本、表单、色板网格……<br />Esc / 点击外部 / 滚动锚即收起。
                </div>
              </template>
            </WuiSplitButton>
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
        <DemoOptionRow :label="labelContent" type="text" v-model="demoContent" placeholder="SplitButton Content" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelPlacement" type="select" v-model="demoPlacement" :options="placementOptions" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ propsTableTitle }}</h4>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h4 class="docs-subtitle">{{ eventsTableTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ keyboardTableTitle }}</h4>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.splitbutton-stage {
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

/* 对照官方示例的 Output TextBlock:轻量状态回显 */
.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-hint {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 主区色块:官方 Border Width/Height 32、CornerRadius 4,0,0,4(根圆角裁切兜底) */
.swatch {
  display: inline-block;
  flex: none;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* 弹层色板网格:3 列(官方 ItemsWrapGrid MaximumRowsOrColumns=3) */
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(3, 32px);
  gap: 6px;
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
  max-width: 360px;
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
