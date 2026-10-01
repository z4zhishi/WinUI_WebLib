<script setup lang="ts">
// XamlUICommandPage.vue —— XamlUICommand 示例页(阶段 6:命令抽象层)。
// 官方示例复刻源:CK/WinUI-Gallery/WinUIGallery/Samples/XamlUICommand/
//   XamlUICommandPage.xaml(Page.Resources 中声明 CustomXamlUICommand:Label=
//   "Custom XamlUICommand"、SymbolIconSource=Favorite、KeyboardAccelerator=Ctrl+D、
//   Description="This is a custom command";AppBarButton 只设 Command 即获得全部外观)
//   与 XamlUICommandPage.xaml.cs(ExecuteRequested → 输出 "You fired the custom command")。
// Web 版命令源:src/utils/uiCommand.ts 的 createCommand(reactive 命令对象 + 手动绑定);
// 第二组演示命令属性的实时改写驱动按钮外观(label / icon / description / canExecute)。
// 结构照抄已通过 QA 的 AppBarButtonPage 母版;文案暂用中文双语常量(阶段 8 统一 i18n)。
import { computed, ref, watch } from 'vue'
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiButton from '@/components/Button.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import { createCommand } from '@/utils/uiCommand'
import type { SymbolValue } from '@/utils/symbolIcons'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 XamlUICommand 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'XamlUICommand(命令对象)', en: 'XamlUICommand' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '一个用于定义命令观感的非视觉对象:把标签、图标、键盘加速键、描述与执行语义收拢为一体,可在应用内复用,并被标准 XAML 控件原生理解。本页用 Web 版命令工厂复刻官方示例(资源中声明自定义命令,按钮只做手动绑定),并演示命令属性的实时改写如何驱动按钮外观。',
  en: 'A non-visual object that defines the look and feel of a command — label, icon, keyboard accelerator, description and execution semantics in one reusable object understood natively by standard XAML controls. This page replicates the official sample and shows live command properties driving button appearance.',
}
const SECTION_OFFICIAL_TITLE: BilingualText = {
  zh: '官方示例复刻(资源中声明自定义命令 → AppBarButton 手动绑定)',
  en: 'Official sample (custom command resource → AppBarButton)',
}
const SECTION_DYNAMIC_TITLE: BilingualText = {
  zh: '参数面板驱动(命令属性 → 按钮外观)',
  en: 'Options-driven demo (command properties → button appearance)',
}
const OFFICIAL_INTRO: BilingualText = {
  zh: '官方在 Page.Resources 中声明一条自定义命令(标签 Custom XamlUICommand、SymbolIconSource=Favorite、加速键 Ctrl+D、描述 This is a custom command),AppBarButton 仅设 Command 即获得全部外观。Web 版以命令对象等效复刻:按钮的 label / 图标 / 角标 / disabled 全部读自命令属性,点击输出对照官方 Control1Output 文案。',
  en: 'The official sample declares a custom command in Page.Resources (label "Custom XamlUICommand", SymbolIconSource=Favorite, accelerator Ctrl+D, description); the AppBarButton gets all of its appearance from the command alone. The button below binds label / icon / badge / disabled from the command object; the output mirrors the official Control1Output.',
}
const DYNAMIC_INTRO: BilingualText = {
  zh: '命令对象经 reactive 包装:右侧面板实时改写 label / 图标 / 描述,两个宿主按钮(AppBarButton 与 Button)即时更新;「允许执行」开关经 notifyCanExecuteChanged() 重算 canExecuteEnabled 驱动 disabled(WinUI 侧为 CanExecuteChanged 通知 + 控件重查 CanExecute)。',
  en: 'The command object is reactive: the panel rewrites label / icon / description live and both host buttons update at once; the "allow execute" toggle recomputes canExecuteEnabled via notifyCanExecuteChanged() (WinUI: CanExecuteChanged notification + controls re-query CanExecute).',
}
const LABEL_LAST_ACTION: BilingualText = { zh: '最近动作', en: 'Last action' }
const NO_ACTION_HINT: BilingualText = { zh: '尚无动作,试试点击按钮或改右侧参数', en: 'No action yet' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件与方法', en: 'Events & methods' }
const DOCS_MAP_TITLE: BilingualText = { zh: 'WinUI API ↔ Web 版对照', en: 'WinUI ↔ Web mapping' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionOfficialTitle = useBilingual(i18n, SECTION_OFFICIAL_TITLE)
const sectionDynamicTitle = useBilingual(i18n, SECTION_DYNAMIC_TITLE)
const officialIntro = useBilingual(i18n, OFFICIAL_INTRO)
const dynamicIntro = useBilingual(i18n, DYNAMIC_INTRO)
const labelLastAction = useBilingual(i18n, LABEL_LAST_ACTION)
const noActionHint = useBilingual(i18n, NO_ACTION_HINT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsMapTitle = useBilingual(i18n, DOCS_MAP_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例 1:官方示例复刻(CustomXamlUICommand 资源的 Web 版等效)——
const officialOutput = ref('')

const customCommand = createCommand({
  label: 'Custom XamlUICommand',
  icon: { symbol: 'Favorite' },
  description: 'This is a custom command',
  hotkeys: [{ key: 'd', modifiers: ['control'] }],
  onExecute: () => {
    // 官方 CustomXamlUICommand_ExecuteRequested 的输出文案
    officialOutput.value = 'You fired the custom command'
  },
})

// —— 示例 2:参数面板驱动(命令属性实时改写 → 按钮外观;reactive 命令对象)——
const dynamicAction = ref('')
const dynamicCount = ref(0)

// v-model 契约:string | number | boolean 联合类型
const dynamicLabel = ref<string | number | boolean>('Save document')
const dynamicIcon = ref<string | number | boolean>('Save')
const dynamicDescription = ref<string | number | boolean>('Write the document to disk')
const dynamicAllowed = ref<string | number | boolean>(true)

const dynamicCommand = createCommand({
  label: String(dynamicLabel.value),
  icon: { symbol: String(dynamicIcon.value) as SymbolValue },
  description: String(dynamicDescription.value),
  hotkeys: [{ key: 's', modifiers: ['control'] }],
  onCanExecute: (_sender, args) => {
    args.canExecute = dynamicAllowed.value === true
  },
  onExecute: () => {
    dynamicCount.value += 1
  },
})

// 面板 → 命令属性(reactive 对象直接赋值,宿主按钮即时刷新)
watch([dynamicLabel, dynamicDescription, dynamicIcon], ([label, description, icon]) => {
  dynamicCommand.label = String(label)
  dynamicCommand.description = String(description)
  dynamicCommand.icon = { symbol: String(icon) as SymbolValue }
})

// CanExecute 简化模型:开关变化后重算快照(WinUI:NotifyCanExecuteChanged → 控件重查)
watch(dynamicAllowed, () => {
  dynamicCommand.notifyCanExecuteChanged()
})

function onDynamicExecute(parameter?: unknown): void {
  dynamicCommand.execute(parameter)
  dynamicAction.value = dynamicCount.value > 0 ? `execute × ${dynamicCount.value}` : ''
}

const dynamicExecuteHint = computed(() =>
  dynamicCommand.canExecuteEnabled ? dynamicAction.value : 'execute → blocked (canExecute = false)',
)

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['label', 'string', "''", '命令标签(WinUI Label);宿主按钮取为显示文本,可直接赋值(reactive)'],
  ['icon', 'CommandIconSource', 'undefined', '命令图标(WinUI IconSource 数据化近似):symbol / glyph / data 三类,渲染优先级依次'],
  ['description', 'string', "''", '命令描述(WinUI Description);本页经 title 属性呈现'],
  ['hotkeys', 'CommandHotkey[]', '[]', '键盘加速键(WinUI KeyboardAccelerators);纯数据,不自动监听按键'],
  ['acceleratorText', 'string(只读)', "''", 'hotkeys 派生的展示文本(如 Ctrl+D),驱动按钮加速键角标'],
  ['canExecuteEnabled', 'boolean', 'true', '简化的 CanExecute 响应式快照;notifyCanExecuteChanged() 重算(差异见 wiki)'],
  ['accessKey / command', '—', '未实现', 'WinUI AccessKey 与委托子命令(Command 属性)未实现,见 wiki 差异节'],
]
const eventHeaders = ['事件 / 方法', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['execute(parameter)', 'args: { parameter?: unknown }', '执行命令 → onExecute 回调(WinUI ExecuteRequested);不检查可执行性,闸门在宿主控件'],
  ['canExecute(parameter)', '返回 boolean', '现场评估可执行性,每次调用重触发 onCanExecute(WinUI CanExecute 默认 true)'],
  ['notifyCanExecuteChanged()', '—', '通知消费端重查并重算 canExecuteEnabled(WinUI ICommand.CanExecuteChanged)'],
  ['matchesHotkeys(event)', 'event: KeyboardEvent', '判断键盘事件是否命中 hotkeys;本工具不做全局监听,由宿主自行接入'],
]
const mapHeaders = ['WinUI(XamlUICommand)', 'Web 版']
const mapRows: (string | number)[][] = [
  ['Label / IconSource / Description / KeyboardAccelerators', 'label / icon / description / hotkeys(reactive 属性)'],
  ['ExecuteRequested 事件', 'createCommand({ onExecute }) 回调'],
  ['CanExecuteRequested 事件(默认 true)', 'createCommand({ onCanExecute }) 回调'],
  ['CanExecuteChanged 事件 + NotifyCanExecuteChanged()', 'canExecuteEnabled 快照 + notifyCanExecuteChanged()(响应式简化)'],
  ['ICommand.Execute / ICommand.CanExecute', 'cmd.execute() / cmd.canExecute()'],
  ['AccessKey、Command(委托子命令)', '未实现(见 wiki 差异节)'],
]
const usageCode = `import { createCommand } from '@/utils/uiCommand'

const customCommand = createCommand({
  label: 'Custom XamlUICommand',
  icon: { symbol: 'Favorite' },
  description: 'This is a custom command',
  hotkeys: [{ key: 'd', modifiers: ['control'] }],
  onExecute(_sender, args) {
    // args.parameter 即绑定方传入的 CommandParameter
  },
})

<WuiAppBarButton
  :label="customCommand.label"
  :keyboard-accelerator-text="customCommand.acceleratorText"
  :title="customCommand.description"
  :disabled="!customCommand.canExecuteEnabled"
  @click="customCommand.execute()"
>
  <template #icon>
    <WuiSymbolIcon :symbol="customCommand.icon?.symbol" :font-size="16" />
  </template>
</WuiAppBarButton>`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="XamlUICommand">
    <template #demo>
      <div class="xic-sections">
        <!-- 示例 1:官方示例复刻(自定义命令 → AppBarButton;对照 CreatingReusableCommandXamluicommand) -->
        <section class="xic-section">
          <h3 class="docs-subtitle">{{ sectionOfficialTitle }}</h3>
          <p class="xic-intro">{{ officialIntro }}</p>
          <div class="xic-row">
            <WuiAppBarButton
              :label="customCommand.label"
              :keyboard-accelerator-text="customCommand.acceleratorText"
              :title="customCommand.description"
              :disabled="!customCommand.canExecuteEnabled"
              @click="customCommand.execute()"
            >
              <template #icon>
                <WuiSymbolIcon
                  v-if="customCommand.icon?.symbol"
                  :symbol="customCommand.icon.symbol"
                  :font-size="16"
                />
              </template>
            </WuiAppBarButton>
            <p class="xic-output" aria-live="polite">{{ officialOutput }}</p>
          </div>
        </section>

        <!-- 示例 2:参数面板驱动(同一命令喂给 AppBarButton 与 Button 两种宿主) -->
        <section class="xic-section">
          <h3 class="docs-subtitle">{{ sectionDynamicTitle }}</h3>
          <p class="xic-intro">{{ dynamicIntro }}</p>
          <div class="xic-row">
            <WuiAppBarButton
              :label="dynamicCommand.label"
              :keyboard-accelerator-text="dynamicCommand.acceleratorText"
              :title="dynamicCommand.description"
              :disabled="!dynamicCommand.canExecuteEnabled"
              @click="onDynamicExecute()"
            >
              <template #icon>
                <WuiSymbolIcon
                  v-if="dynamicCommand.icon?.symbol"
                  :symbol="dynamicCommand.icon.symbol"
                  :font-size="16"
                />
              </template>
            </WuiAppBarButton>
            <WuiButton
              :title="dynamicCommand.description"
              :disabled="!dynamicCommand.canExecuteEnabled"
              @click="onDynamicExecute('from-button')"
            >
              {{ dynamicCommand.label }}
            </WuiButton>
            <p class="xic-hint">
              {{ labelLastAction }}:<template v-if="dynamicAction !== '' || dynamicCount > 0">{{ dynamicExecuteHint }}</template><template v-else>{{ noActionHint }}</template>
            </p>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Label" type="text" v-model="dynamicLabel" placeholder="命令标签" />
        <DemoOptionRow
          label="Icon(Symbol)"
          type="select"
          v-model="dynamicIcon"
          :options="[
            { label: 'Save', value: 'Save' },
            { label: 'Favorite', value: 'Favorite' },
            { label: 'Share', value: 'Share' },
            { label: 'Delete', value: 'Delete' },
          ]"
        />
        <DemoOptionRow label="Description" type="text" v-model="dynamicDescription" placeholder="命令描述" />
        <DemoOptionRow label="允许执行(CanExecute 简化态)" type="toggle" v-model="dynamicAllowed" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsMapTitle }}</h3>
      <DemoDocsTable :headers="mapHeaders" :rows="mapRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.xic-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.xic-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.xic-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.xic-intro,
.xic-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.xic-hint {
  flex-basis: 100%;
}

/* 官方 XamlUICommandOutput(命令触发后的输出文本) */
.xic-output {
  margin: 0 0 0 8px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.docs-subtitle {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
