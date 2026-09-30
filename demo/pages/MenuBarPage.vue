<script setup lang="ts">
// MenuBar 示例页:对照官方 WinUI Gallery MenuBarPage(SimpleMenubar /
// MenubarKeyboardAccelerators / MenubarSubmenusSeparatorsRadio 三例复刻),
// 并附键盘导航说明(F2/Alt 进栏、←/→ 换项/换菜单、Enter/↓/Alt+↓ 开)。
// 上半区交互演示 + 参数面板(禁用项实时切换),下半区为属性、事件、键盘交互与用法代码。
import { computed, ref } from 'vue'
import WuiMenuBar from '@/components/MenuBar.vue'
import WuiMenuBarItem from '@/components/MenuBarItem.vue'
import WuiMenuFlyoutItem from '@/components/MenuFlyoutItem.vue'
import WuiMenuFlyoutSeparator from '@/components/MenuFlyoutSeparator.vue'
import WuiMenuFlyoutSubItem from '@/components/MenuFlyoutSubItem.vue'
import WuiToggleMenuFlyoutItem from '@/components/ToggleMenuFlyoutItem.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'MenuBar', en: 'MenuBar' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI MenuBar 控件示例:应用顶部的经典菜单栏,由 MenuBarItem 组成,项内放 MenuFlyout 族菜单。打开一个菜单后横移鼠标可在项间自动切换;支持 F2/Alt 进栏与完整的键盘导航。上半区参数实时调节,下半区为文档与键盘说明。',
  en: 'WinUI MenuBar examples: a classic top app menu of MenuBarItems hosting the MenuFlyout family. Hover across items to switch menus while one is open; F2/Alt focuses the bar with full keyboard navigation. Options above, docs and keyboard guide below.',
}
const GROUP_SIMPLE: BilingualText = { zh: '简单菜单栏(点击回显)', en: 'Simple menu bar (click echo)' }
const GROUP_ACCELERATORS: BilingualText = { zh: '键盘加速键(菜单打开期间生效)', en: 'Keyboard accelerators (active while menu is open)' }
const GROUP_CASCADING: BilingualText = { zh: '子菜单 / 分隔线 / 单选组', en: 'Submenus / separators / radio groups' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘导航', en: 'Keyboard navigation' }
const LABEL_DISABLE_ABOUT: BilingualText = { zh: '禁用「About」项', en: 'Disable "About"' }
const LABEL_LAST_ACTION: BilingualText = { zh: '最近动作', en: 'Last action' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性(MenuBar / MenuBarItem 与菜单项族)', en: 'Properties (MenuBar / MenuBarItem & item family)' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupSimple = useBilingual(i18n, GROUP_SIMPLE)
const groupAccelerators = useBilingual(i18n, GROUP_ACCELERATORS)
const groupCascading = useBilingual(i18n, GROUP_CASCADING)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelDisableAbout = useBilingual(i18n, LABEL_DISABLE_ABOUT)
const labelLastAction = useBilingual(i18n, LABEL_LAST_ACTION)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 参数面板 ——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const demoDisableAbout = ref<string | number | boolean>(false)
const aboutDisabled = computed(() => demoDisableAbout.value === true)

// —— 动作回显(对照官方示例每例的 Selected Option TextBlock)——
const lastAction1 = ref('—')
const lastAction2 = ref('—')
const lastAction3 = ref('—')

function onAction1(name: string): void {
  lastAction1.value = name
}
function onAction2(name: string): void {
  lastAction2.value = name
}
function onAction3(name: string): void {
  lastAction3.value = name
}

// —— 演示三:单选组(组内互斥,由页面脚本实现 RadioMenuFlyoutItem 的 GroupName 语义)——
const orientation = ref('portrait')
const iconSize = ref('medium')

const propsHeaders = ['组件 / 属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['MenuBar', 'slot(default)', '—', '栏内容:横向排列的 WuiMenuBarItem 列表;整栏 MinHeight 40、背景透明'],
  ['MenuBarItem · title', 'string', "'Item'", '项文本(WinUI Title);默认 slot 是菜单内容,不作为项文案'],
  ['MenuBarItem · disabled', 'boolean', 'false', '禁用(Web 侧增补):不响应点击/悬停,不参与键盘导航'],
  ['MenuFlyoutItem · text / icon', "string", "''", '菜单项文本与图标(同 MenuFlyout 族,见 MenuFlyout 文档)'],
  ['MenuFlyoutItem · acceleratorKeys', 'string', "''", "快捷键(如 'Ctrl+N'):行尾显示,所在菜单层打开期间生效"],
  ['MenuFlyoutItem · disabled', 'boolean', 'false', '禁用菜单项:不触发、不参与 ↑/↓ 导航'],
  ['ToggleMenuFlyoutItem · isChecked (v-model)', 'boolean', 'false', '开关项(WinUI IsChecked),点击不关闭菜单;单选组用页面分组逻辑模拟'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['MenuBarItem · opening / opened', '—', '本项下拉开始打开 / 已打开并完成首次定位'],
  ['MenuBarItem · closing / closed', '—', '本项下拉开始关闭 / 已关闭(含被相邻项切换、light dismiss 路径)'],
  ['click(MenuFlyoutItem 等)', '(event: MouseEvent)', '点击或键盘激活菜单项;触发后整条菜单关闭'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['F2 / Alt', '把焦点移入菜单栏(首项;Web 侧补充的进入方式)'],
  ['← / →', '未开菜单:项间移动焦点(循环);已开菜单:收起当前项并展开相邻项'],
  ['Enter / Space / ↓ / Alt+↓', '展开当前项的菜单,焦点落首个菜单项'],
  ['↑ / ↓', '菜单内项间循环移动(跳过分隔线与禁用项)'],
  ['Home / End', '移到首 / 末个可用项(菜单内)/ 首 / 末个菜单栏项(栏上)'],
  ['Esc', '逐级关闭:先收子菜单再收菜单,焦点归还菜单栏项'],
  ['Tab', '关闭菜单,焦点自然移动'],
  ['acceleratorKeys', '菜单打开期间匹配(如 Ctrl+N)即触发对应项 click'],
]

const usageCode = computed(
  () => `<WuiMenuBar>
  <WuiMenuBarItem title="File">
    <WuiMenuFlyoutItem text="New" :accelerator-keys="'Ctrl+N'" @click="onNew" />
    <WuiMenuFlyoutItem text="Open" @click="onOpen" />
    <WuiMenuFlyoutSeparator />
    <WuiMenuFlyoutSubItem text="New">
      <WuiMenuFlyoutItem text="Plain Text Document" @click="onPlain" />
      <WuiMenuFlyoutItem text="Rich Text Document" @click="onRich" />
    </WuiMenuFlyoutSubItem>
  </WuiMenuBarItem>
  <WuiMenuBarItem title="Edit">
    <WuiMenuFlyoutItem text="Undo" :accelerator-keys="'Ctrl+Z'" @click="onUndo" />
  </WuiMenuBarItem>
</WuiMenuBar>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="MenuBar">
    <template #demo>
      <div class="menubar-stage">
        <!-- 演示一:简单菜单栏(对照官方 SimpleMenubar:File/Edit/Help + 回显文本) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupSimple }}</h4>
          <WuiMenuBar>
            <WuiMenuBarItem title="File">
              <WuiMenuFlyoutItem text="New" @click="onAction1('New')" />
              <WuiMenuFlyoutItem text="Open" @click="onAction1('Open')" />
              <WuiMenuFlyoutItem text="Save" @click="onAction1('Save')" />
              <WuiMenuFlyoutItem text="Exit" @click="onAction1('Exit')" />
            </WuiMenuBarItem>
            <WuiMenuBarItem title="Edit">
              <WuiMenuFlyoutItem text="Undo" @click="onAction1('Undo')" />
              <WuiMenuFlyoutItem text="Cut" @click="onAction1('Cut')" />
              <WuiMenuFlyoutItem text="Copy" @click="onAction1('Copy')" />
              <WuiMenuFlyoutItem text="Paste" @click="onAction1('Paste')" />
            </WuiMenuBarItem>
            <WuiMenuBarItem title="Help">
              <WuiMenuFlyoutItem text="About" :disabled="aboutDisabled" @click="onAction1('About')" />
            </WuiMenuBarItem>
          </WuiMenuBar>
          <p class="demo-output">{{ labelLastAction }}: {{ lastAction1 }}</p>
        </section>

        <!-- 演示二:键盘加速键(对照官方 MenubarKeyboardAccelerators;快捷键文本见行尾) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupAccelerators }}</h4>
          <WuiMenuBar>
            <WuiMenuBarItem title="File">
              <WuiMenuFlyoutItem text="New" accelerator-keys="Ctrl+N" @click="onAction2('New (Ctrl+N)')" />
              <WuiMenuFlyoutItem text="Open" accelerator-keys="Ctrl+O" @click="onAction2('Open (Ctrl+O)')" />
              <WuiMenuFlyoutItem text="Save" accelerator-keys="Ctrl+S" @click="onAction2('Save (Ctrl+S)')" />
              <WuiMenuFlyoutItem text="Exit" accelerator-keys="Ctrl+E" @click="onAction2('Exit (Ctrl+E)')" />
            </WuiMenuBarItem>
            <WuiMenuBarItem title="Edit">
              <WuiMenuFlyoutItem text="Undo" accelerator-keys="Ctrl+Z" @click="onAction2('Undo (Ctrl+Z)')" />
              <WuiMenuFlyoutItem text="Cut" accelerator-keys="Ctrl+X" @click="onAction2('Cut (Ctrl+X)')" />
              <WuiMenuFlyoutItem text="Copy" accelerator-keys="Ctrl+C" @click="onAction2('Copy (Ctrl+C)')" />
              <WuiMenuFlyoutItem text="Paste" accelerator-keys="Ctrl+V" @click="onAction2('Paste (Ctrl+V)')" />
            </WuiMenuBarItem>
            <WuiMenuBarItem title="Help">
              <WuiMenuFlyoutItem text="About" accelerator-keys="Ctrl+I" @click="onAction2('About (Ctrl+I)')" />
            </WuiMenuBarItem>
          </WuiMenuBar>
          <p class="demo-output">{{ labelLastAction }}: {{ lastAction2 }}</p>
        </section>

        <!-- 演示三:子菜单 / 分隔线 / 单选组(对照官方 MenubarSubmenusSeparatorsRadio) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupCascading }}</h4>
          <WuiMenuBar>
            <WuiMenuBarItem title="File">
              <WuiMenuFlyoutSubItem text="New">
                <WuiMenuFlyoutItem text="Plain Text Document" @click="onAction3('New › Plain Text Document')" />
                <WuiMenuFlyoutItem text="Rich Text Document" @click="onAction3('New › Rich Text Document')" />
                <WuiMenuFlyoutItem text="Other Formats" @click="onAction3('New › Other Formats')" />
              </WuiMenuFlyoutSubItem>
              <WuiMenuFlyoutItem text="Open" @click="onAction3('Open')" />
              <WuiMenuFlyoutItem text="Save" @click="onAction3('Save')" />
              <WuiMenuFlyoutSeparator />
              <WuiMenuFlyoutItem text="Exit" @click="onAction3('Exit')" />
            </WuiMenuBarItem>
            <WuiMenuBarItem title="Edit">
              <WuiMenuFlyoutItem text="Undo" @click="onAction3('Undo')" />
              <WuiMenuFlyoutItem text="Cut" @click="onAction3('Cut')" />
              <WuiMenuFlyoutItem text="Copy" @click="onAction3('Copy')" />
              <WuiMenuFlyoutItem text="Paste" @click="onAction3('Paste')" />
            </WuiMenuBarItem>
            <WuiMenuBarItem title="View">
              <WuiMenuFlyoutItem text="Output" @click="onAction3('Output')" />
              <WuiMenuFlyoutSeparator />
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
            </WuiMenuBarItem>
            <WuiMenuBarItem title="Help">
              <WuiMenuFlyoutItem text="About" @click="onAction3('About')" />
            </WuiMenuBarItem>
          </WuiMenuBar>
          <p class="demo-output">{{ labelLastAction }}: {{ lastAction3 }} · {{ orientation }} · {{ iconSize }}</p>
        </section>

        <!-- 键盘导航说明 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupKeyboard }}</h4>
          <ul class="keyboard-list">
            <li><kbd>F2</kbd>/<kbd>Alt</kbd> {{ i18n.locale.value.startsWith('zh') ? '进入菜单栏' : 'focus the menu bar' }}</li>
            <li><kbd>←</kbd>/<kbd>→</kbd> {{ i18n.locale.value.startsWith('zh') ? '换项;开菜单时换菜单' : 'move items; switch menus when open' }}</li>
            <li><kbd>Enter</kbd>/<kbd>↓</kbd>/<kbd>Alt+↓</kbd> {{ i18n.locale.value.startsWith('zh') ? '打开菜单' : 'open menu' }}</li>
            <li><kbd>↑</kbd>/<kbd>↓</kbd> {{ i18n.locale.value.startsWith('zh') ? '菜单内移动' : 'move in menu' }}</li>
            <li><kbd>Esc</kbd> {{ i18n.locale.value.startsWith('zh') ? '逐级关闭' : 'close level by level' }}</li>
            <li><kbd>Tab</kbd> {{ i18n.locale.value.startsWith('zh') ? '关闭菜单' : 'dismiss menu' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelDisableAbout" type="toggle" v-model="demoDisableAbout" />
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
.menubar-stage {
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
  width: 100%;
}

.group-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* 对照官方示例每例的 Selected Option TextBlock:轻量回显 */
.demo-output {
  margin: 0;
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
