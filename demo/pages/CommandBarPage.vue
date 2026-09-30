<script setup lang="ts">
// CommandBarPage.vue —— CommandBar 控件示例页(对应官方 WinUI Gallery
// Samples/CommandBar/CommandBarPage.xaml:DefaultLabelPosition=Right 的命令栏 +
// Open/Close(IsOpen/IsSticky)+ Add/Remove secondary commands + 「You clicked: …」反馈;
// CommandBarLabelsSide.txt 例:标签在右、free floating)。
// 结构照抄已通过 QA 的 AppBarButtonPage 母版:DemoPage(标题+描述)→ 交互演示 →
// DemoOptions(实时改参)→ DemoDocsTable + DemoCode。文案暂用中文双语文案常量(阶段 8 统一 i18n)。
import { computed, ref } from 'vue'
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiAppBarSeparator from '@/components/AppBarSeparator.vue'
import WuiAppBarToggleButton from '@/components/AppBarToggleButton.vue'
import WuiCommandBar from '@/components/CommandBar.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 CommandBar 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'CommandBar(命令栏)', en: 'CommandBar' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '应用命令栏:一行图标命令按钮(PrimaryCommands)+ 可选的「更多」(…)按钮,点击后展开次要命令溢出区(SecondaryCommands)。支持 isOpen 打开态与 isSticky 粘滞、DefaultLabelPosition 标签位置(Bottom/Right)与命令的动态增减。',
  en: 'A toolbar for app commands: a row of icon buttons (PrimaryCommands) plus an optional "see more" (…) button that opens an overflow of secondary commands. Supports isOpen/isSticky, DefaultLabelPosition (Bottom/Right) and dynamic add/remove of commands.',
}
const SECTION_OFFICIAL_TITLE: BilingualText = {
  zh: '官方示例复刻(标签在右 + 打开/关闭 + 动态次要命令)',
  en: 'Official sample (labels on the right + open/close + dynamic secondary commands)',
}
const SECTION_OVERFLOW_TITLE: BilingualText = {
  zh: '溢出区(更多按钮:切换开关 / 分隔线 / 加速键角标)',
  en: 'Overflow (more button: toggle buttons / separator / accelerator badges)',
}
const SECTION_LABEL_TITLE: BilingualText = {
  zh: 'DefaultLabelPosition 对照(下标签 vs 右标签)',
  en: 'DefaultLabelPosition (bottom vs right)',
}
const SECTION_OPTIONS_TITLE: BilingualText = {
  zh: '参数面板驱动(右侧选项实时调节)',
  en: 'Options-driven demo',
}
const LABEL_LAST_ACTION: BilingualText = { zh: '最近动作', en: 'Last action' }
const LABEL_OPEN_STATE: BilingualText = { zh: 'isOpen', en: 'isOpen' }
const NO_ACTION_HINT: BilingualText = { zh: '尚无动作,试试点击上面任意命令', en: 'No action yet' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionOfficialTitle = useBilingual(i18n, SECTION_OFFICIAL_TITLE)
const sectionOverflowTitle = useBilingual(i18n, SECTION_OVERFLOW_TITLE)
const sectionLabelTitle = useBilingual(i18n, SECTION_LABEL_TITLE)
const sectionOptionsTitle = useBilingual(i18n, SECTION_OPTIONS_TITLE)
const labelLastAction = useBilingual(i18n, LABEL_LAST_ACTION)
const labelOpenState = useBilingual(i18n, LABEL_OPEN_STATE)
const noActionHint = useBilingual(i18n, NO_ACTION_HINT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例 1:官方示例复刻(标签在右;点击输出对照官方 SelectedOptionText「You clicked: …」)——
const officialOpen = ref(false)
const officialSticky = ref(false)
const hasExtraSecondary = ref(false)
const officialAction = ref('')

// —— 示例 2:溢出区(v-model:is-overflow-open 镜像 + 切换开关状态)——
const overflowOpen = ref(false)
const shuffleOn = ref(false)
const favoriteOn = ref(false)
const overflowAction = ref('')

function onOfficialClick(name: string): void {
  officialAction.value = `You clicked: ${name}`
}

function openOfficial(): void {
  officialOpen.value = true
  officialSticky.value = true // 官方 OpenButton_Click:打开的同时置 IsSticky
}

function closeOfficial(): void {
  officialOpen.value = false
  officialSticky.value = false
}

// —— 示例 4:参数面板驱动(DemoOptionRow 的 v-model 契约要求 string | number | boolean 联合类型)——
const demoIsOpen = ref<string | number | boolean>(false)
const demoIsSticky = ref<string | number | boolean>(false)
const demoLabelPosition = ref<string | number | boolean>('bottom')
const demoOverflowVisibility = ref<string | number | boolean>('auto')
const demoDisabled = ref<string | number | boolean>(false)

const demoOpen = computed({
  get: () => demoIsOpen.value === true,
  set: (value) => {
    demoIsOpen.value = value === true
  },
})
const demoSticky = computed(() => demoIsSticky.value === true)
const demoPosition = computed(() => (demoLabelPosition.value === 'right' ? 'right' : 'bottom'))
const demoVisibility = computed(() =>
  demoOverflowVisibility.value === 'visible' ? 'visible' : demoOverflowVisibility.value === 'collapsed' ? 'collapsed' : 'auto',
)
const demoIsDisabled = computed(() => demoDisabled.value === true)

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['isOpen (v-model)', 'boolean', 'false', '打开态(WinUI IsOpen):溢出区显示于命令栏下方;点击更多按钮或编程置 true 打开'],
  ['isOverflowOpen (v-model)', 'boolean', 'false', '溢出区开合镜像:与 isOpen 双向同步(同一状态,任一写入即生效;WinUI 无此公开 API)'],
  ['defaultLabelPosition', "'bottom' | 'right'", "'bottom'", '默认标签位置(WinUI DefaultLabelPosition 的 Bottom/Right 两档)'],
  ['overflowButtonVisibility', "'auto' | 'visible' | 'collapsed'", "'auto'", '更多按钮可见性(WinUI OverflowButtonVisibility);auto = 有次要命令或 bottom 标签位主命令时显示'],
  ['isSticky', 'boolean', 'false', '粘滞(WinUI IsSticky):true 时点击层外/滚动/Escape 均不收起,焦点归还更多按钮(源 TryDismissCommandBarOverflow)'],
  ['disabled', 'boolean', 'false', '禁用(WinUI IsEnabled):更多按钮禁用并置灰省略号字形'],
  ['#content (slot)', 'any', '—', '命令栏左侧内容区(WinUI Content)'],
  ['#primary-commands (slot)', 'any', '—', '主命令区(WinUI PrimaryCommands):AppBarButton / AppBarToggleButton / AppBarSeparator,右对齐排列'],
  ['#secondary-commands (slot)', 'any', '—', '次要命令区(WinUI SecondaryCommands):收进「更多」溢出区,按菜单行样式呈现'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['opening', '()', '溢出区开始打开(WinUI Opening)'],
  ['opened', '()', '溢出区已打开且完成首次定位(WinUI Opened)'],
  ['closing', '()', '溢出区开始关闭(WinUI Closing)'],
  ['closed', '()', '溢出区已关闭(WinUI Closed)'],
]
const keyboardHeaders = ['按键', '作用']
const keyboardRows: (string | number)[][] = [
  ['Enter / Space(更多按钮)', '切换溢出区开合(WinUI OnExpandButtonClick)'],
  ['↑ / ↓(更多按钮上)', '打开溢出区并把焦点落到末/首项(WinUI 方向键语义)'],
  ['↑ / ↓(溢出区内)', '命令项间移动焦点;首/末项越界时焦点回更多按钮(源不环绕)'],
  ['Home / End(溢出区内)', '焦点跳到首/末项'],
  ['Enter / Space(溢出区内)', '激活聚焦的命令(原生按钮语义)'],
  ['Escape', '收起尝试(源 TryDismissCommandBarOverflow):非粘滞时关闭并归还焦点到更多按钮;粘滞时保持打开、仅焦点归还更多按钮'],
  ['Tab', '关闭溢出区,焦点照常移动(WinUI 菜单 Tab 即 light dismiss)'],
]
const usageCode = computed(
  () => `<WuiCommandBar v-model:is-open="isOpen" default-label-position="${demoPosition.value}">
  <template #primary-commands>
    <WuiAppBarButton label="Add" @click="onAdd">
      <template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template>
    </WuiAppBarButton>
    <WuiAppBarButton label="Share" @click="onShare">
      <template #icon><WuiSymbolIcon symbol="Share" :font-size="16" /></template>
    </WuiAppBarButton>
  </template>
  <template #secondary-commands>
    <WuiAppBarButton label="Settings" keyboard-accelerator-text="Ctrl+I">
      <template #icon><WuiSymbolIcon symbol="Setting" :font-size="16" /></template>
    </WuiAppBarButton>
  </template>
</WuiCommandBar>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="cb-sections">
        <!-- 示例 1:官方示例复刻(CommandBarPage.xaml:DefaultLabelPosition=Right +
             IsOpen/IsSticky 开关 + 动态次要命令 + 「You clicked: …」反馈) -->
        <section class="cb-section">
          <h4 class="docs-subtitle">{{ sectionOfficialTitle }}</h4>
          <WuiCommandBar
            v-model:is-open="officialOpen"
            default-label-position="right"
            :is-sticky="officialSticky"
          >
            <template #primary-commands>
              <WuiAppBarButton label="Add" width="auto" @click="onOfficialClick('Add')">
                <template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template>
              </WuiAppBarButton>
              <WuiAppBarButton label="Edit" width="auto" @click="onOfficialClick('Edit')">
                <template #icon><WuiSymbolIcon symbol="Edit" :font-size="16" /></template>
              </WuiAppBarButton>
              <WuiAppBarButton label="Share" width="auto" @click="onOfficialClick('Share')">
                <template #icon><WuiSymbolIcon symbol="Share" :font-size="16" /></template>
              </WuiAppBarButton>
            </template>
            <template #secondary-commands>
              <WuiAppBarButton
                label="Settings"
                keyboard-accelerator-text="Ctrl+I"
                @click="onOfficialClick('Settings')"
              >
                <template #icon><WuiSymbolIcon symbol="Setting" :font-size="16" /></template>
              </WuiAppBarButton>
              <!-- 动态次要命令(对照官方 Add/Remove secondary commands;slot 内容变化自适应) -->
              <template v-if="hasExtraSecondary">
                <WuiAppBarButton
                  label="Button 1"
                  keyboard-accelerator-text="Ctrl+N"
                  @click="onOfficialClick('Button 1')"
                >
                  <template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template>
                </WuiAppBarButton>
                <WuiAppBarButton label="Button 2" keyboard-accelerator-text="Del" @click="onOfficialClick('Button 2')">
                  <template #icon><WuiSymbolIcon symbol="Delete" :font-size="16" /></template>
                </WuiAppBarButton>
                <WuiAppBarSeparator />
                <WuiAppBarButton label="Button 3" keyboard-accelerator-text="Ctrl+-" @click="onOfficialClick('Button 3')">
                  <template #icon><WuiSymbolIcon symbol="FontDecrease" :font-size="16" /></template>
                </WuiAppBarButton>
                <WuiAppBarButton label="Button 4" keyboard-accelerator-text="Ctrl++" @click="onOfficialClick('Button 4')">
                  <template #icon><WuiSymbolIcon symbol="FontIncrease" :font-size="16" /></template>
                </WuiAppBarButton>
              </template>
            </template>
          </WuiCommandBar>
          <div class="cb-row">
            <button type="button" class="cb-action" @click="openOfficial">Open command bar</button>
            <button type="button" class="cb-action" @click="closeOfficial">Close command bar</button>
            <button type="button" class="cb-action" @click="hasExtraSecondary = !hasExtraSecondary">
              {{ hasExtraSecondary ? 'Remove secondary commands' : 'Add secondary commands' }}
            </button>
            <span class="cb-state">{{ labelOpenState }}: {{ officialOpen ? 'true' : 'false' }} · isSticky: {{ officialSticky ? 'true' : 'false' }}</span>
            <p class="cb-hint">
              {{ labelLastAction }}:<template v-if="officialAction !== ''">{{ officialAction }}</template><template v-else>{{ noActionHint }}</template>
            </p>
          </div>
        </section>

        <!-- 示例 2:溢出区(切换开关 / 分隔线 / 加速键角标;点击命令后自动收起) -->
        <section class="cb-section">
          <h4 class="docs-subtitle">{{ sectionOverflowTitle }}</h4>
          <WuiCommandBar v-model:is-overflow-open="overflowOpen">
            <template #primary-commands>
              <WuiAppBarButton label="Add" @click="overflowAction = 'Add'">
                <template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template>
              </WuiAppBarButton>
              <WuiAppBarSeparator />
              <WuiAppBarToggleButton label="Shuffle" v-model:is-checked="shuffleOn" @click="overflowAction = 'Shuffle'">
                <template #icon><WuiSymbolIcon symbol="Shuffle" :font-size="16" /></template>
              </WuiAppBarToggleButton>
            </template>
            <template #secondary-commands>
              <WuiAppBarToggleButton label="Favorite" v-model:is-checked="favoriteOn" @click="overflowAction = 'Favorite(切换,保持打开)'">
                <template #icon><WuiSymbolIcon symbol="Favorite" :font-size="16" /></template>
              </WuiAppBarToggleButton>
              <WuiAppBarSeparator />
              <WuiAppBarButton label="Zoom in" keyboard-accelerator-text="Ctrl++" @click="overflowAction = 'Zoom in'">
                <template #icon><WuiSymbolIcon symbol="ZoomIn" :font-size="16" /></template>
              </WuiAppBarButton>
              <WuiAppBarButton label="Delete" keyboard-accelerator-text="Del" @click="overflowAction = 'Delete'">
                <template #icon><WuiSymbolIcon symbol="Delete" :font-size="16" /></template>
              </WuiAppBarButton>
            </template>
          </WuiCommandBar>
          <div class="cb-row">
            <button type="button" class="cb-action" @click="overflowOpen = !overflowOpen">
              {{ overflowOpen ? '收起溢出区' : '展开溢出区' }}
            </button>
            <span class="cb-state">Shuffle: {{ shuffleOn ? 'on' : 'off' }} · Favorite: {{ favoriteOn ? 'on' : 'off' }}</span>
            <p class="cb-hint">
              {{ labelLastAction }}:<template v-if="overflowAction !== ''">{{ overflowAction }}</template><template v-else>{{ noActionHint }}</template>
            </p>
          </div>
        </section>

        <!-- 示例 3:DefaultLabelPosition 对照(同一组命令,bottom vs right) -->
        <section class="cb-section">
          <h4 class="docs-subtitle">{{ sectionLabelTitle }}</h4>
          <div class="cb-row cb-row--stack">
            <WuiCommandBar default-label-position="bottom">
              <template #primary-commands>
                <WuiAppBarButton label="Add"><template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template></WuiAppBarButton>
                <WuiAppBarButton label="Edit"><template #icon><WuiSymbolIcon symbol="Edit" :font-size="16" /></template></WuiAppBarButton>
                <WuiAppBarButton label="Share"><template #icon><WuiSymbolIcon symbol="Share" :font-size="16" /></template></WuiAppBarButton>
              </template>
            </WuiCommandBar>
            <WuiCommandBar default-label-position="right">
              <template #primary-commands>
                <WuiAppBarButton label="Add" width="auto"><template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template></WuiAppBarButton>
                <WuiAppBarButton label="Edit" width="auto"><template #icon><WuiSymbolIcon symbol="Edit" :font-size="16" /></template></WuiAppBarButton>
                <WuiAppBarButton label="Share" width="auto"><template #icon><WuiSymbolIcon symbol="Share" :font-size="16" /></template></WuiAppBarButton>
              </template>
            </WuiCommandBar>
          </div>
        </section>

        <!-- 示例 4:参数面板驱动(isOpen / isSticky / labelPosition / overflowVisibility / disabled) -->
        <section class="cb-section">
          <h4 class="docs-subtitle">{{ sectionOptionsTitle }}</h4>
          <WuiCommandBar
            v-model:is-open="demoOpen"
            :default-label-position="demoPosition"
            :overflow-button-visibility="demoVisibility"
            :is-sticky="demoSticky"
            :disabled="demoIsDisabled"
          >
            <template #content>
              <span class="cb-content-demo">Content</span>
            </template>
            <template #primary-commands>
              <WuiAppBarButton label="Add" :width="demoPosition === 'right' ? 'auto' : 68">
                <template #icon><WuiSymbolIcon symbol="Add" :font-size="16" /></template>
              </WuiAppBarButton>
              <WuiAppBarButton label="Edit" :width="demoPosition === 'right' ? 'auto' : 68">
                <template #icon><WuiSymbolIcon symbol="Edit" :font-size="16" /></template>
              </WuiAppBarButton>
            </template>
            <template #secondary-commands>
              <WuiAppBarButton label="Settings">
                <template #icon><WuiSymbolIcon symbol="Setting" :font-size="16" /></template>
              </WuiAppBarButton>
            </template>
          </WuiCommandBar>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="IsOpen 打开态" type="toggle" v-model="demoIsOpen" />
        <DemoOptionRow label="IsSticky 粘滞" type="toggle" v-model="demoIsSticky" />
        <DemoOptionRow
          label="DefaultLabelPosition"
          type="select"
          v-model="demoLabelPosition"
          :options="[
            { label: 'Bottom(下)', value: 'bottom' },
            { label: 'Right(右)', value: 'right' },
          ]"
        />
        <DemoOptionRow
          label="OverflowButtonVisibility"
          type="select"
          v-model="demoOverflowVisibility"
          :options="[
            { label: 'Auto(有次要命令)', value: 'auto' },
            { label: 'Visible(恒显)', value: 'visible' },
            { label: 'Collapsed(隐藏)', value: 'collapsed' },
          ]"
        />
        <DemoOptionRow label="Disabled 禁用" type="toggle" v-model="demoDisabled" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
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
.cb-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.cb-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cb-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.cb-row--stack {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

/* Open/Close/Add/Remove 动作按钮(对照官方示例的选项按钮) */
.cb-action {
  padding: 5px 12px;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-button-foreground);
  background: var(--wui-button-background);
  border: 2px solid var(--wui-button-border);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  cursor: default;
  user-select: none;
}

.cb-action:hover {
  background: var(--wui-button-background-pointer-over);
}

.cb-action:active {
  background: var(--wui-button-background-pressed);
}

.cb-state {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.cb-hint {
  flex-basis: 100%;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.cb-content-demo {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.docs-subtitle {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
