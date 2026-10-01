<script setup lang="ts">
// StandardUICommandPage.vue —— StandardUICommand 示例页(阶段 6:命令抽象层)。
// 官方示例复刻源:CK/WinUI-Gallery/WinUIGallery/Samples/StandardUICommand/
//   StandardUICommandPage.xaml(一条共享的 StandardUICommandKind.Delete 命令同时绑定
//   MenuFlyoutItem / SwipeItem / AppBarButton,CommandParameter={x:Bind Text})与
//   StandardUICommandPage.xaml.cs(DeleteCommand_ExecuteRequested:按参数删项,否则删选中项)。
// Web 版命令源:src/utils/standardUiCommands.ts 的 createStandardUICommand(预置 label/icon/
// hotkeys/description)+ src/utils/uiCommand.ts 的 createCommand;按钮侧为「手动绑定」
// (label / 图标 / 加速键角标 / disabled 均由命令对象驱动,见 DemoCode 用法)。
// 结构照抄已通过 QA 的 AppBarButtonPage 母版;文案暂用中文双语常量(阶段 8 统一 i18n)。
import { computed, ref, watch } from 'vue'
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import {
  STANDARD_UI_COMMAND_DEFS,
  STANDARD_UI_COMMAND_KINDS,
  createStandardUICommand,
} from '@/utils/standardUiCommands'
import type { StandardUICommandKind } from '@/utils/standardUiCommands'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 StandardUICommand 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'StandardUICommand(预置标准命令)', en: 'StandardUICommand' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '一组内置的 XamlUICommand,代表常用命令(如「保存」「复制」「删除」),自带官方观感的图标、标签、键盘加速键与描述,可在多个控件间复用。本页复刻官方示例:一条共享的 Delete 命令同时驱动多个按钮,并展示全部 16 种预置命令(Kind)。Web 版为非视觉命令对象 + 手动绑定,按钮侧由命令属性驱动外观。',
  en: 'A set of built-in XamlUICommands representing commonly used commands (Save, Copy, Delete, …), each with a native icon, label, keyboard accelerator and description, reusable across controls. This page replicates the official sample: one shared Delete command drives multiple buttons, plus a gallery of all 16 preset kinds.',
}
const SECTION_OFFICIAL_TITLE: BilingualText = {
  zh: '官方示例复刻(一条共享 Delete 命令,多控件消费)',
  en: 'Official sample (one shared Delete command, many consumers)',
}
const SECTION_GALLERY_TITLE: BilingualText = {
  zh: '预置命令清单(16 种 StandardUICommandKind)',
  en: 'Preset command gallery (16 StandardUICommandKind values)',
}
const OFFICIAL_INTRO: BilingualText = {
  zh: '下方清单的每一行与顶部按钮绑定同一条 Delete 命令:图标 / 标签 / 「Del」加速键角标均来自命令预置值,行内按钮以项文本为参数执行(对应官方 CommandParameter);清单聚焦时按 Delete 键同样触发(matchesHotkeys 演示加速键命中)。',
  en: 'Every row and the top button below share one Delete command: icon / label / "Del" accelerator badge all come from the command preset; row buttons execute with the item text as parameter (CommandParameter), and pressing Delete while the list has focus fires the command too (matchesHotkeys demo).',
}
const LABEL_LAST_ACTION: BilingualText = { zh: '最近动作', en: 'Last action' }
const NO_ACTION_HINT: BilingualText = { zh: '尚无动作,试试点击上面任意按钮或按 Delete 键', en: 'No action yet' }
const EMPTY_LIST_HINT: BilingualText = { zh: '清单已空(命令已执行完所有项)', en: 'The list is empty (every item was deleted)' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性(StandardUICommand + 继承自 XamlUICommand)', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件与方法', en: 'Events & methods' }
const DOCS_PRESET_TITLE: BilingualText = { zh: '预置命令清单(Kind → 预填值)', en: 'Preset commands (Kind → defaults)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const sectionOfficialTitle = useBilingual(i18n, SECTION_OFFICIAL_TITLE)
const sectionGalleryTitle = useBilingual(i18n, SECTION_GALLERY_TITLE)
const officialIntro = useBilingual(i18n, OFFICIAL_INTRO)
const labelLastAction = useBilingual(i18n, LABEL_LAST_ACTION)
const noActionHint = useBilingual(i18n, NO_ACTION_HINT)
const emptyListHint = useBilingual(i18n, EMPTY_LIST_HINT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsPresetTitle = useBilingual(i18n, DOCS_PRESET_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 示例 1:官方示例复刻(共享 Delete 命令;参数删项 / 兜底删选中项)——
interface DemoListItem {
  id: number
  text: string
}

const listItems = ref<DemoListItem[]>(
  Array.from({ length: 6 }, (_, index) => ({ id: index, text: `List item ${index}` })),
)
const selectedId = ref<number | null>(null)
const deleteAction = ref('')

// 参数面板的「允许删除」开关 → CanExecute 简化态(经 notifyCanExecuteChanged 重算)
const deleteAllowed = ref<string | number | boolean>(true)

const deleteCommand = createStandardUICommand('Delete', {
  onCanExecute: (_sender, args) => {
    args.canExecute = deleteAllowed.value === true
  },
  onExecute: (_sender, args) => {
    const parameter = args.parameter
    if (typeof parameter === 'string') {
      // 官方 DeleteCommand_ExecuteRequested:参数命中项文本则移除该项
      listItems.value = listItems.value.filter((item) => item.text !== parameter)
      deleteAction.value = `execute("${parameter}") → removed`
      return
    }
    const index = listItems.value.findIndex((item) => item.id === selectedId.value)
    const item = listItems.value[index]
    if (item) {
      listItems.value.splice(index, 1)
      deleteAction.value = `execute() → removed selected "${item.text}"`
    } else {
      deleteAction.value = 'execute() → no selection'
    }
  },
})

// CanExecute 简化模型:开关变化后重算快照(WinUI 侧为 NotifyCanExecuteChanged → 重查)
watch(deleteAllowed, () => {
  deleteCommand.notifyCanExecuteChanged()
})

// 加速键演示:本工具不做全局按键监听,由宿主容器接入(matchesHotkeys 命中 Delete 键)
function onListKeydown(event: KeyboardEvent): void {
  if (deleteCommand.matchesHotkeys(event)) {
    event.preventDefault()
    deleteCommand.execute()
  }
}

function selectItem(id: number): void {
  selectedId.value = id
}

// —— 示例 2:预置命令清单(每种 Kind 一条命令,按钮外观全部由命令属性驱动)——
const galleryAction = ref('')

interface GalleryEntry {
  kind: Exclude<StandardUICommandKind, 'None'>
  command: ReturnType<typeof createStandardUICommand>
}

const galleryCommands: GalleryEntry[] = STANDARD_UI_COMMAND_KINDS.map((kind) => ({
  kind,
  command: createStandardUICommand(kind, {
    onExecute: (_sender, args) => {
      const parameter = args.parameter
      galleryAction.value =
        typeof parameter === 'string'
          ? `${kind}.execute("${parameter}")`
          : `${kind}.execute()`
    },
  }),
}))

// —— 参数面板(v-model 契约:string | number | boolean 联合类型)——
const galleryCompact = ref<string | number | boolean>(false)
const galleryWidth = ref<string | number | boolean>(68)
const galleryCompactValue = computed(() => galleryCompact.value === true)
const galleryWidthValue = computed(() => {
  const parsed = Number(galleryWidth.value)
  return Number.isFinite(parsed) ? parsed : 68
})

// —— 下半区固定开发文档 ——
const propHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  ['kind', 'StandardUICommandKind', '必填', '预置类型(Cut/Copy/Paste/SelectAll/Delete/Share/Save/Open/Close/Pause/Play/Stop/Forward/Backward/Undo/Redo);WinUI StandardUICommandKind'],
  ['label', 'string', '随 Kind', '继承自 XamlUICommand;Kind 预填官方文案(en-US 近似),显式传入则覆盖(WinUI SetLabelIfUnset)'],
  ['icon', 'CommandIconSource', '随 Kind', '继承自 XamlUICommand;Kind 预填 Symbol 图标(SymbolIconSource)'],
  ['description', 'string', '随 Kind', '继承自 XamlUICommand;Kind 预填描述文案(本实现为 en-US 近似)'],
  ['hotkeys', 'CommandHotkey[]', '随 Kind', '继承自 XamlUICommand;Kind 预填官方加速键(Ctrl+C / Ctrl+V / Del 等)'],
  ['acceleratorText', 'string(只读)', "''", 'hotkeys 的展示文本(如 Ctrl+S / Del),驱动按钮加速键角标'],
  ['canExecuteEnabled', 'boolean', 'true', '简化的 CanExecute 响应式快照;notifyCanExecuteChanged() 重算(差异见 wiki)'],
]
const eventHeaders = ['事件 / 方法', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['execute(parameter)', 'args: { parameter?: unknown }', '执行命令 → onExecute 回调(WinUI ExecuteRequested;不检查可执行性,闸门在宿主控件)'],
  ['canExecute(parameter)', '返回 boolean', '现场评估可执行性,每次调用重触发 onCanExecute(WinUI CanExecute 默认 true)'],
  ['notifyCanExecuteChanged()', '—', '通知消费端重查并重算 canExecuteEnabled(WinUI ICommand.CanExecuteChanged)'],
]
const presetHeaders = ['Kind', '标签(en / zh)', '图标(Symbol)', '加速键', '描述(zh 近似)']
const presetRows: (string | number)[][] = galleryCommands.map((entry) => {
  const def = STANDARD_UI_COMMAND_DEFS[entry.kind]
  return [
    entry.kind,
    `${def.label} / ${def.labelZh}`,
    def.symbol,
    entry.command.acceleratorText === '' ? '—' : entry.command.acceleratorText,
    def.descriptionZh,
  ]
})
const usageCode = `import { createStandardUICommand } from '@/utils/standardUiCommands'

const deleteCommand = createStandardUICommand('Delete', {
  onExecute(_sender, args) {
    // args.parameter 即绑定方传入的 CommandParameter
  },
})

<WuiAppBarButton
  :label="deleteCommand.label"
  :keyboard-accelerator-text="deleteCommand.acceleratorText"
  :disabled="!deleteCommand.canExecuteEnabled"
  @click="deleteCommand.execute(item.text)"
>
  <template #icon>
    <WuiSymbolIcon :symbol="deleteCommand.icon?.symbol" :font-size="16" />
  </template>
</WuiAppBarButton>`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="StandardUICommand">
    <template #demo>
      <div class="suc-sections">
        <!-- 示例 1:官方示例复刻(共享 Delete 命令;对照 StandardUICommandExposingCommandMultipleControls) -->
        <section class="suc-section">
          <h3 class="docs-subtitle">{{ sectionOfficialTitle }}</h3>
          <p class="suc-intro">{{ officialIntro }}</p>
          <div class="suc-row">
            <WuiAppBarButton
              :label="deleteCommand.label"
              :keyboard-accelerator-text="deleteCommand.acceleratorText"
              :title="deleteCommand.description"
              :disabled="!deleteCommand.canExecuteEnabled"
              @click="deleteCommand.execute()"
            >
              <template #icon>
                <WuiSymbolIcon
                  v-if="deleteCommand.icon?.symbol"
                  :symbol="deleteCommand.icon.symbol"
                  :font-size="16"
                />
              </template>
            </WuiAppBarButton>
            <span class="suc-divider" aria-hidden="true"></span>
            <p class="suc-hint">
              {{ labelLastAction }}:<template v-if="deleteAction !== ''">{{ deleteAction }}</template><template v-else>{{ noActionHint }}</template>
            </p>
          </div>
          <ul class="suc-list" @keydown="onListKeydown">
            <li
              v-for="item in listItems"
              :key="item.id"
              class="suc-list-row"
              :class="{ 'suc-list-row--selected': item.id === selectedId }"
              @click="selectItem(item.id)"
            >
              <span class="suc-list-text">{{ item.text }}</span>
              <WuiAppBarButton
                :label="deleteCommand.label"
                is-compact
                :keyboard-accelerator-text="deleteCommand.acceleratorText"
                :disabled="!deleteCommand.canExecuteEnabled"
                :aria-label="`${deleteCommand.label} ${item.text}`"
                @click="deleteCommand.execute(item.text)"
              >
                <template #icon>
                  <WuiSymbolIcon
                    v-if="deleteCommand.icon?.symbol"
                    :symbol="deleteCommand.icon.symbol"
                    :font-size="16"
                  />
                </template>
              </WuiAppBarButton>
            </li>
            <li v-if="listItems.length === 0" class="suc-list-empty">{{ emptyListHint }}</li>
          </ul>
        </section>

        <!-- 示例 2:预置命令清单(16 种 Kind;label/图标/加速键/描述全部来自命令预置值) -->
        <section class="suc-section">
          <h3 class="docs-subtitle">{{ sectionGalleryTitle }}</h3>
          <div class="suc-row">
            <WuiAppBarButton
              v-for="entry in galleryCommands"
              :key="entry.kind"
              :label="entry.command.label"
              :keyboard-accelerator-text="entry.command.acceleratorText"
              :title="entry.command.description"
              :is-compact="galleryCompactValue"
              :width="galleryWidthValue"
              :disabled="!entry.command.canExecuteEnabled"
              @click="entry.command.execute(entry.kind)"
            >
              <template #icon>
                <WuiSymbolIcon
                  v-if="entry.command.icon?.symbol"
                  :symbol="entry.command.icon.symbol"
                  :font-size="16"
                />
              </template>
            </WuiAppBarButton>
          </div>
          <p class="suc-hint">
            {{ labelLastAction }}:<template v-if="galleryAction !== ''">{{ galleryAction }}</template><template v-else>{{ noActionHint }}</template>
          </p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="允许删除(CanExecute 简化态)" type="toggle" v-model="deleteAllowed" />
        <DemoOptionRow label="清单紧凑态(IsCompact)" type="toggle" v-model="galleryCompact" />
        <DemoOptionRow label="按钮宽度(Width)" type="slider" v-model="galleryWidth" :min="40" :max="120" :step="1" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsPresetTitle }}</h3>
      <DemoDocsTable :headers="presetHeaders" :rows="presetRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.suc-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.suc-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suc-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.suc-intro,
.suc-hint {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.suc-hint {
  flex-basis: 100%;
}

.suc-divider {
  align-self: stretch;
  width: 1px;
  margin: 0 8px;
  background: var(--wui-system-control-background-base-low);
}

/* 清单(官方 ListView 的简化:行内悬停按钮 → 常驻紧凑按钮);
   容器边框/行分隔线取 ListView 族分隔 token,选中底色取 ListView 选中态 token */
.suc-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--wui-list-view-header-item-divider-stroke);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  background: transparent;
}

.suc-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 4px 12px;
  cursor: default;
  user-select: none;
}

.suc-list-row + .suc-list-row {
  border-top: 1px solid var(--wui-list-view-header-item-divider-stroke);
}

.suc-list-row--selected {
  background: var(--wui-list-view-item-reveal-background-selected);
}

.suc-list-text {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.suc-list-empty {
  padding: 12px;
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
