<script setup lang="ts">
// MenuFlyout 示例页:对照官方 WinUI Gallery MenuFlyoutPage
// (带图标/快捷键/分隔线/开关项/级联子菜单/单选组模拟),并附键盘操作说明。
// 上半区交互演示 + 参数面板(placement/lightDismiss/isOpen 实时调节),
// 下半区为控件族属性、事件、键盘交互与用法代码(结构照抄已通过 QA 的 CheckBoxPage 母版)。
import { computed, ref, watch } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiMenuFlyout from '@/components/MenuFlyout.vue'
import WuiMenuFlyoutItem from '@/components/MenuFlyoutItem.vue'
import WuiMenuFlyoutSeparator from '@/components/MenuFlyoutSeparator.vue'
import WuiMenuFlyoutSubItem from '@/components/MenuFlyoutSubItem.vue'
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

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'MenuFlyout', en: 'MenuFlyout' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI MenuFlyout 控件示例:轻量上下文菜单,支持图标、快捷键、分隔线、开关项与级联子菜单;点击菜单外轻扫关闭。上半区参数实时调节,下半区为控件族文档与键盘操作说明。',
  en: 'WinUI MenuFlyout examples: lightweight contextual menus with icons, keyboard accelerators, separators, toggle items and cascading submenus. Options above, docs and keyboard guide below.',
}
const GROUP_ICONS: BilingualText = { zh: '图标与快捷键(菜单项点击后关闭)', en: 'Icons & accelerators (items dismiss)' }
const GROUP_TOGGLE: BilingualText = { zh: '开关项与分隔线(点击后保持打开)', en: 'Toggle items & separator (stay open)' }
const GROUP_CASCADING: BilingualText = { zh: '级联子菜单', en: 'Cascading submenus' }
const GROUP_RADIO: BilingualText = { zh: '单选组(用开关项模拟 RadioMenuFlyoutItem)', en: 'Radio groups (via toggle items)' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘操作', en: 'Keyboard interaction' }
const LABEL_PLACEMENT: BilingualText = { zh: '放置位(Placement)', en: 'Placement' }
const LABEL_LIGHT_DISMISS: BilingualText = { zh: '轻扫关闭(LightDismiss)', en: 'LightDismiss' }
const LABEL_IS_OPEN: BilingualText = { zh: '程序开关(IsOpen)', en: 'IsOpen' }
const LABEL_DISABLE_ITEM: BilingualText = { zh: '禁用「Rename」项', en: 'Disable "Rename"' }
const LABEL_LAST_ACTION: BilingualText = { zh: '最近动作', en: 'Last action' }
const LABEL_REPEAT: BilingualText = { zh: '重复', en: 'Repeat' }
const LABEL_SHUFFLE: BilingualText = { zh: '随机', en: 'Shuffle' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性(MenuFlyout 与菜单项族)', en: 'Properties (MenuFlyout & item family)' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupIcons = useBilingual(i18n, GROUP_ICONS)
const groupToggle = useBilingual(i18n, GROUP_TOGGLE)
const groupCascading = useBilingual(i18n, GROUP_CASCADING)
const groupRadio = useBilingual(i18n, GROUP_RADIO)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelPlacement = useBilingual(i18n, LABEL_PLACEMENT)
const labelLightDismiss = useBilingual(i18n, LABEL_LIGHT_DISMISS)
const labelIsOpen = useBilingual(i18n, LABEL_IS_OPEN)
const labelDisableItem = useBilingual(i18n, LABEL_DISABLE_ITEM)
const labelLastAction = useBilingual(i18n, LABEL_LAST_ACTION)
const labelRepeat = useBilingual(i18n, LABEL_REPEAT)
const labelShuffle = useBilingual(i18n, LABEL_SHUFFLE)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 参数面板(作用于演示一)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoPlacement = ref<string | number | boolean>('bottom-start')
const demoLightDismiss = ref<string | number | boolean>(true)
const demoIsOpen = ref<string | number | boolean>(false)
const demoDisableRename = ref<string | number | boolean>(false)
const demoIsOpenModel = ref(false)

const placementOptions = [
  { label: 'bottom-start', value: 'bottom-start' },
  { label: 'bottom', value: 'bottom' },
  { label: 'bottom-end', value: 'bottom-end' },
  { label: 'top-start', value: 'top-start' },
  { label: 'top', value: 'top' },
  { label: 'top-end', value: 'top-end' },
  { label: 'right-start', value: 'right-start' },
  { label: 'left-end', value: 'left-end' },
]

// 下拉值(string)→ PopupPlacement(白名单校验,未知值回退默认)
const PLACEMENT_WHITELIST: readonly string[] = placementOptions.map((option) => option.value)
const placementValue = computed<PopupPlacement>(() => {
  const value = String(demoPlacement.value)
  return PLACEMENT_WHITELIST.includes(value) ? (value as PopupPlacement) : 'bottom-start'
})
const lightDismissValue = computed(() => demoLightDismiss.value === true)
const renameDisabled = computed(() => demoDisableRename.value === true)
// 程序开关 → 菜单模型;菜单自身关闭(轻扫/选项点击)时回写开关状态
watch(
  demoIsOpen,
  (value) => {
    demoIsOpenModel.value = value === true
  },
  { immediate: true },
)
watch(demoIsOpenModel, (value) => {
  demoIsOpen.value = value
})

// —— 动作回显(对照官方示例的 Output TextBlock)——
const lastAction = ref('—')
const lastActionText = computed(() => `${labelLastAction.value}: ${lastAction.value}`)

function onShareClick(): void {
  lastAction.value = 'Share (Ctrl+S)'
}
function onCopyClick(): void {
  lastAction.value = 'Copy (Ctrl+C)'
}
function onDeleteClick(): void {
  lastAction.value = 'Delete (Del)'
}
function onRenameClick(): void {
  lastAction.value = 'Rename'
}
function onSelectClick(): void {
  lastAction.value = 'Select'
}
function onResetClick(): void {
  lastAction.value = 'Reset'
}
function onOpenClick(): void {
  lastAction.value = 'Open'
}
function onCascadeLeaf(name: string): void {
  lastAction.value = name
}

// —— 演示二:开关项(对照官方示例 Repeat/Shuffle 的 IsChecked 替换显示)——
const repeatChecked = ref(true)
const shuffleChecked = ref(true)
const toggleStateText = computed(() =>
  `${labelRepeat.value}: ${repeatChecked.value ? '☑' : '☐'} · ${labelShuffle.value}: ${shuffleChecked.value ? '☑' : '☐'}`,
)

// —— 演示四:单选组(组内互斥,由页面脚本实现 RadioMenuFlyoutItem 的 GroupName 语义)——
const orientation = ref('portrait')
const iconSize = ref('medium')

const propsHeaders = ['组件 / 属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['MenuFlyout · placement', 'PopupPlacement', "'bottom-start'", "放置位:'top/bottom/left/right' × '-start/-end' 对齐"],
  ['MenuFlyout · lightDismiss', 'boolean', 'true', '点击层外 / Escape / 锚滚动时关闭'],
  ['MenuFlyout · isOpen (v-model)', 'boolean', 'false', '弹层开关(WinUI IsOpen),双向绑定'],
  ['MenuFlyoutItem · text', 'string', "''", '项文本;同名默认 slot 兜底(slot 优先)'],
  ['MenuFlyoutItem · icon', 'string', "''", "Symbol 枚举名(如 'Copy')或字形字符;#icon slot 可放 FontIcon"],
  ['MenuFlyoutItem · acceleratorKeys', 'string', "''", "快捷键(如 'Ctrl+C'):行尾显示 + 菜单打开期间键盘生效"],
  ['MenuFlyoutItem · disabled', 'boolean', 'false', '禁用:不触发、不参与键盘导航'],
  ['ToggleMenuFlyoutItem · isChecked (v-model)', 'boolean', 'false', '开关状态(WinUI IsChecked),点击不关闭菜单'],
  ['MenuFlyoutSubItem · text / icon / disabled', '同上', '—', '子菜单宿主项;嵌套 MenuFlyoutItem 等作为子菜单内容'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['click(仅 Item/Toggle/SubItem)', '(event: MouseEvent)', '点击或键盘激活项;Item 触发后菜单关闭,Toggle 保持打开'],
  ['update:isOpen', '(value: boolean)', 'MenuFlyout 开关双向绑定更新'],
  ['opening / opened', '—', '弹层开始打开 / 已打开并完成首次定位'],
  ['closing / closed', '—', '弹层开始关闭 / 已关闭'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['↑ / ↓', '在菜单项间循环移动(跳过分隔线与禁用项)'],
  ['Home / End', '移动到首 / 末个可用项'],
  ['→', '展开当前子菜单并聚焦其首项'],
  ['←', '收起当前子菜单,焦点回到子菜单宿主项'],
  ['Enter / Space', '激活当前项(开关项切换勾选)'],
  ['Esc', '逐级关闭:每次关闭最深一层,焦点逐级归还'],
  ['Tab', '关闭整条菜单(焦点自然移动)'],
  ['acceleratorKeys', "菜单打开期间匹配(如 Ctrl+S)即触发对应项 click"],
]

const usageCode = computed(
  () => `<WuiMenuFlyout :placement="'${placementValue.value}'" :light-dismiss="${lightDismissValue.value}">
  <template #target>
    <WuiButton content="Edit Options" />
  </template>
  <WuiMenuFlyoutItem text="Share" :accelerator-keys="'Ctrl+S'" @click="onShare">
    <template #icon><WuiFontIcon glyph="&#xE72D;" :font-size="16" /></template>
  </WuiMenuFlyoutItem>
  <WuiMenuFlyoutItem text="Copy" icon="Copy" :accelerator-keys="'Ctrl+C'" @click="onCopy" />
  <WuiMenuFlyoutSeparator />
  <WuiToggleMenuFlyoutItem text="Repeat" v-model:is-checked="repeat" />
  <WuiMenuFlyoutSubItem text="Send to">
    <WuiMenuFlyoutItem text="Bluetooth" @click="onSendTo" />
  </WuiMenuFlyoutSubItem>
</WuiMenuFlyout>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="MenuFlyout">
    <template #demo>
      <div class="menuflyout-stage">
        <!-- 演示一:图标 + 快捷键 + 分隔线(参数面板实时调节 placement/lightDismiss/isOpen) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupIcons }}</h4>
          <div class="demo-row">
            <WuiMenuFlyout
              v-model:is-open="demoIsOpenModel"
              :placement="placementValue"
              :light-dismiss="lightDismissValue"
            >
              <template #target>
                <WuiButton content="Edit Options" />
              </template>
              <WuiMenuFlyoutItem :accelerator-keys="'Ctrl+S'" @click="onShareClick">
                <template #icon>
                  <WuiFontIcon glyph="&#xE72D;" :font-size="16" />
                </template>
                Share
              </WuiMenuFlyoutItem>
              <WuiMenuFlyoutItem icon="Copy" :accelerator-keys="'Ctrl+C'" @click="onCopyClick">
                Copy
              </WuiMenuFlyoutItem>
              <WuiMenuFlyoutItem icon="Delete" :accelerator-keys="'Del'" @click="onDeleteClick">
                Delete
              </WuiMenuFlyoutItem>
              <WuiMenuFlyoutSeparator />
              <WuiMenuFlyoutItem text="Rename" :disabled="renameDisabled" @click="onRenameClick" />
              <WuiMenuFlyoutItem text="Select" @click="onSelectClick" />
            </WuiMenuFlyout>
          </div>
          <p class="demo-output">{{ lastActionText }}</p>
        </section>

        <!-- 演示二:开关项与分隔线(点击后菜单保持打开,状态实时回显) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupToggle }}</h4>
          <div class="demo-row">
            <WuiMenuFlyout>
              <template #target>
                <WuiButton content="Options" />
              </template>
              <WuiMenuFlyoutItem text="Reset" @click="onResetClick" />
              <WuiMenuFlyoutSeparator />
              <WuiToggleMenuFlyoutItem v-model:is-checked="repeatChecked" :text="labelRepeat" />
              <WuiToggleMenuFlyoutItem v-model:is-checked="shuffleChecked" :text="labelShuffle" />
            </WuiMenuFlyout>
          </div>
          <p class="demo-output">{{ toggleStateText }}</p>
        </section>

        <!-- 演示三:级联子菜单(对照官方示例 File Options / Send to) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupCascading }}</h4>
          <div class="demo-row">
            <WuiMenuFlyout>
              <template #target>
                <WuiButton content="File Options" />
              </template>
              <WuiMenuFlyoutItem text="Open" @click="onOpenClick" />
              <WuiMenuFlyoutSubItem text="Send to">
                <WuiMenuFlyoutItem text="Bluetooth" @click="onCascadeLeaf('Send to › Bluetooth')" />
                <WuiMenuFlyoutItem text="Desktop (shortcut)" @click="onCascadeLeaf('Send to › Desktop')" />
                <WuiMenuFlyoutSubItem text="Compressed file">
                  <WuiMenuFlyoutItem text="Compress and email" @click="onCascadeLeaf('… › Compress and email')" />
                  <WuiMenuFlyoutItem text="Compress to .7z" @click="onCascadeLeaf('… › Compress to .7z')" />
                  <WuiMenuFlyoutItem text="Compress to .zip" @click="onCascadeLeaf('… › Compress to .zip')" />
                </WuiMenuFlyoutSubItem>
              </WuiMenuFlyoutSubItem>
            </WuiMenuFlyout>
          </div>
        </section>

        <!-- 演示四:单选组(用开关项 + 页面脚本实现 GroupName 互斥) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupRadio }}</h4>
          <div class="demo-row">
            <WuiMenuFlyout>
              <template #target>
                <WuiButton content="Options" />
              </template>
              <WuiToggleMenuFlyoutItem
                text="Landscape"
                :is-checked="orientation === 'landscape'"
                @update:is-checked="orientation = 'landscape'"
              />
              <WuiToggleMenuFlyoutItem
                text="Portrait"
                :is-checked="orientation === 'portrait'"
                @update:is-checked="orientation = 'portrait'"
              />
              <WuiMenuFlyoutSeparator />
              <WuiToggleMenuFlyoutItem
                text="Small icons"
                :is-checked="iconSize === 'small'"
                @update:is-checked="iconSize = 'small'"
              />
              <WuiToggleMenuFlyoutItem
                text="Medium icons"
                :is-checked="iconSize === 'medium'"
                @update:is-checked="iconSize = 'medium'"
              />
              <WuiToggleMenuFlyoutItem
                text="Large icons"
                :is-checked="iconSize === 'large'"
                @update:is-checked="iconSize = 'large'"
              />
            </WuiMenuFlyout>
            <span class="demo-echo">{{ orientation }} · {{ iconSize }}</span>
          </div>
        </section>

        <!-- 键盘操作说明 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupKeyboard }}</h4>
          <ul class="keyboard-list">
            <li><kbd>↑</kbd>/<kbd>↓</kbd> {{ i18n.locale.value.startsWith('zh') ? '移动焦点' : 'move focus' }}</li>
            <li><kbd>Home</kbd>/<kbd>End</kbd> {{ i18n.locale.value.startsWith('zh') ? '首/末项' : 'first/last item' }}</li>
            <li><kbd>→</kbd> {{ i18n.locale.value.startsWith('zh') ? '进入子菜单' : 'enter submenu' }}</li>
            <li><kbd>←</kbd> {{ i18n.locale.value.startsWith('zh') ? '退出子菜单' : 'exit submenu' }}</li>
            <li><kbd>Enter</kbd>/<kbd>Space</kbd> {{ i18n.locale.value.startsWith('zh') ? '激活项' : 'invoke item' }}</li>
            <li><kbd>Esc</kbd> {{ i18n.locale.value.startsWith('zh') ? '逐级关闭' : 'close level by level' }}</li>
            <li><kbd>Tab</kbd> {{ i18n.locale.value.startsWith('zh') ? '关闭菜单' : 'dismiss menu' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelPlacement" type="select" v-model="demoPlacement" :options="placementOptions" />
        <DemoOptionRow :label="labelLightDismiss" type="toggle" v-model="demoLightDismiss" />
        <DemoOptionRow :label="labelIsOpen" type="toggle" v-model="demoIsOpen" />
        <DemoOptionRow :label="labelDisableItem" type="toggle" v-model="demoDisableRename" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsKeyboardTitle }}</h4>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.menuflyout-stage {
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

/* 对照官方示例的 Output TextBlock:轻量回显 */
.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-echo {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.keyboard-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.keyboard-list kbd {
  padding: 1px 6px;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 3px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
