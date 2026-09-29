<script setup lang="ts">
// AutoSuggestBox.vue —— WinUI AutoSuggestBox 的 Web 复刻(自动建议输入框,基于弹层公共基建)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="AutoSuggestBox">(L22040 起)+ AutoSuggestBoxTextBoxStyle(L21672 起,
//   内嵌 DeleteButtonStyle / QueryButtonStyle):
//   - 文本框族:AutoSuggestBoxTextBoxStyle 与 TextBox 同源(TextControl* 画刷;
//     TextControlThemeMinWidth 64、MinHeight 32、BorderThickness 2、Padding 10,3,6,6),
//     Normal / PointerOver / Focused / Disabled 四态同 TextBox 做法;
//   - DeleteButton(清除按钮):glyph U+E10A、MinWidth 34、AutoSuggestBoxIconFontSize 12
//     (token --wui-auto-suggest-box-icon-font-size)、TextControlButton* 四态;
//     ButtonVisible 状态本实现按「有内容」驱动(任务约定,WinUI 另按聚焦门控,见 wiki);
//   - QueryButton(查询按钮):MinWidth 34,无 QueryIcon 时按源 Width={TemplateBinding Height}
//     的 Auto 语义折叠为 0 宽 → 不渲染;disabled 时随源 Disabled 态 Opacity=0 语义不渲染;
//   - 建议面板(SuggestionsPopup > SuggestionsContainer/SuggestionsList):
//     Background = AutoSuggestBoxSuggestionsListBackground(--wui-auto-suggest-box-suggestions-list-
//     background)、Border 1px = --wui-auto-suggest-box-suggestions-list-border、
//     MaxHeight = AutoSuggestListMaxHeight 374、列表外边距 AutoSuggestListMargin 0,2,0,2;
//     圆角/阴影由 .wui-popup-layer 提供;
//   - 列表项:建议列表为 ListView,默认项样式 = ListViewItemRevealStyle(L17732 起)——
//     Padding 12,0,12,0、MinHeight 40(ListViewItemMinHeight)、hover/pressed 取
//     --wui-list-view-item-background-*;键盘高亮同 hover 色(ComboBox 同约定)。
// 行为规格(对照 WinUI AutoSuggestBox 与 AutoSuggestBox_Partial.cpp 实现级源码):
//   - text 双向;textChanged(value, reason) 对应 AutoSuggestionBoxTextChangeReason
//     (userInput / programmaticChange / suggestionChosen);候选过滤由消费侧完成
//     (WinUI 契约:TextChanged 里自行过滤后设置 ItemsSource),本组件只负责展示与交互;
//   - 输入不直接更新提交态:Enter / 查询按钮 / 点击建议才提交(querySubmitted,
//     args = { queryText, results };三条提交路径 WinUI 均触发,见源码 SubmitQuery /
//     OnListViewItemClick),同时派发 textSubmitted 别名(任务命名约定,见 wiki);
//   - ↑/↓ 键盘导航(两端停住不循环,任务约定;WinUI 源码为「经 -1 的循环」,见 wiki):
//     高亮项文本临时回显输入框并触发 SuggestionChosen + textChanged(suggestionChosen)
//     (任务要求无条件预览;WinUI 源码该路径受 UpdateTextOnSelect 门控,差异见 wiki);
//     ↑ 过顶恢复已键入文本;
//   - 恢复路径(↑ 过顶 / Esc / Tab / 外点 / ↓ 到末项以外场景)以 programmaticChange
//     原因更新文本为已键入文本(对齐源码 L1101/L1109/L1137 的 ProgrammaticChange);
//   - UpdateTextOnSelect:点击建议是否把建议文本回写输入框(默认 true);
//   - 关闭路径:选择/提交、Esc、外点(light dismiss)、锚滚动链滚动、Tab、清空文本;
//     关闭时若处于「预览建议文本」态,恢复为已键入文本;
//   - 鼠标悬停不移高亮、不预览(对齐源码:SuggestionChosen 仅键盘导航与点击);悬停仅 CSS 底色;
//   - NoResults:面板打开且候选为空时显示不可选中的「无结果」行(任务要求的 Web 增强,
//     WinUI 无此内建行为,官方示例用向 ItemsSource 塞占位项模拟),默认文案
//     noResultsText,可用 #no-results-found 槽整体替换。
//
// —— 影子文本设计(QA C-1 修复)——
// defineModel 在父侧绑定 v-model 时:写 = 仅 emit(不同步本地值),读 = 返回上次经
// prop 回传的背书值(useModel 的 localValue 由 watchSyncEffect 从 props 同步)。
// 因此「内部同步写后立即读 text.value」拿到的是旧 prop 值,会击穿签名去重并错乱
// typedQuery 记账。修复:组件内部一律读写影子 ref textValue(唯一事实源),模型仅作
// 对外同步通道(经 setModelText 写出);watch(text) 以 textValue 为签名,仅把与影子
// 不一致的模型变化认定为外部直写(programmaticChange)。
import { computed, nextTick, ref, useId, watch } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'
import { symbolToGlyph, type SymbolValue } from '@/utils/symbolIcons'

defineOptions({ name: 'WuiAutoSuggestBox', inheritAttrs: false })

/** 文本变化原因(WinUI AutoSuggestionBoxTextChangeReason)。 */
export type AutoSuggestTextChangeReason = 'userInput' | 'programmaticChange' | 'suggestionChosen'

/** 提交事件参数(WinUI QuerySubmittedEventArgs 的 QueryText / Results)。 */
export interface AutoSuggestQuerySubmittedEventArgs {
  /** 提交时的查询文本(键盘提交高亮项/点击建议且 UpdateTextOnSelect=true 时即建议文本)。 */
  queryText: string
  /** 提交时的候选集(= 当时的 itemsSource;WinUI QuerySubmittedEventArgs.Results)。 */
  results: unknown[]
}

const props = withDefaults(
  defineProps<{
    /** 候选数组(WinUI ItemsSource);过滤/异步加载由消费侧完成,元素可为 string/number/对象。 */
    itemsSource?: unknown[]
    /** 空内容时显示的占位文本(WinUI PlaceholderText)。 */
    placeholderText?: string
    /** 输入框上方标头文本(WinUI Header)。 */
    header?: string
    /** 查询按钮图标(WinUI QueryIcon):Symbol 枚举名(如 'Find');缺省或禁用时不渲染查询按钮。 */
    queryIcon?: SymbolValue | ''
    /** 对象项的显示字段路径(WinUI DisplayMemberPath);缺省 String(item)。 */
    displayMemberPath?: string
    /** 点击建议时是否把建议文本回写输入框(WinUI UpdateTextOnSelect)。 */
    updateTextOnSelect?: boolean
    /** 建议面板最大高度 px(WinUI MaxSuggestionListHeight,默认 AutoSuggestListMaxHeight 374)。 */
    maxSuggestionListHeight?: number
    /** 候选为空时「无结果」行的默认文案(官方示例用语;#noResultsFound 槽可整体替换)。 */
    noResultsText?: string
    /** 是否启用清除按钮;有内容时显示(任务约定)。 */
    clearButtonEnabled?: boolean
    /** 禁用态,样式对照 Disabled 视觉状态。 */
    disabled?: boolean
  }>(),
  {
    itemsSource: () => [],
    placeholderText: '',
    header: '',
    queryIcon: '',
    displayMemberPath: '',
    updateTextOnSelect: true,
    maxSuggestionListHeight: 374,
    noResultsText: 'No results found',
    clearButtonEnabled: true,
    disabled: false,
  },
)

/** 输入框文本(WinUI Text),支持 v-model:text。 */
const text = defineModel<string>('text', { default: '' })
/** 建议面板开关(WinUI IsSuggestionListOpen),支持 v-model:is-suggestion-list-open。 */
const isSuggestionListOpen = defineModel<boolean>('isSuggestionListOpen', { default: false })

const emit = defineEmits<{
  /** WinUI TextChanged:文本变化(含程序化赋值);reason 为变化原因。 */
  (e: 'textChanged', value: string, reason: AutoSuggestTextChangeReason): void
  /** WinUI SuggestionChosen:键盘高亮移动到候选项,或候选被点击选中时。 */
  (e: 'suggestionChosen', item: unknown, index: number): void
  /** WinUI QuerySubmitted:Enter / 查询按钮 / 点击建议三条提交路径统一触发。 */
  (e: 'querySubmitted', args: AutoSuggestQuerySubmittedEventArgs): void
  /** textSubmitted:querySubmitted 的别名(任务命名约定;两事件同参同发)。 */
  (e: 'textSubmitted', args: AutoSuggestQuerySubmittedEventArgs): void
}>()

// —— 元素引用与 id ——
const anchorRef = usePopupAnchor().anchorRef
const inputEl = ref<HTMLInputElement | null>(null)
const listboxId = useId()
const inputId = useId()

/** 项显示文本:displayMemberPath 优先,回退 String(item)(对齐 WinUI ToString 兜底)。 */
function itemText(item: unknown): string {
  if (item == null) return ''
  if (props.displayMemberPath !== '' && typeof item === 'object') {
    const value = (item as Record<string, unknown>)[props.displayMemberPath]
    if (value != null) return String(value)
  }
  return String(item)
}

/** 查询按钮字形:Symbol 枚举名 → Segoe 图形字符(空名无按钮)。 */
const queryGlyph = computed(() => (props.queryIcon === '' ? '' : (symbolToGlyph(props.queryIcon) ?? '')))

/* -------------------------------------------------------------------------
 * 影子文本记账:内部唯一事实源(设计说明见文件头「影子文本设计」)。
 * ---------------------------------------------------------------------- */

const textValue = ref(text.value)

/** 已通知出去的值签名(事件层去重,与影子值互相独立)。 */
let lastNotified = text.value

function notifyText(value: string, reason: AutoSuggestTextChangeReason): void {
  if (value === lastNotified) return
  lastNotified = value
  emit('textChanged', value, reason)
}

/** 内部写入:影子值直落 + 模型同步(模型已同值时跳过,避免多余 emit)。 */
function setModelText(value: string): void {
  textValue.value = value
  if (text.value !== value) text.value = value
}

/** 键盘高亮项(itemsSource 下标);-1 = 无高亮(输入框文本即已键入文本)。 */
const highlight = ref(-1)

/** 已键入文本:↑/↓ 预览建议文本时被临时覆盖,取消预览/关闭面板时恢复。 */
const typedQuery = ref(text.value)

// 外部程序化赋值识别:仅当模型值与影子值不一致(内部写产生的模型回环在此被签名拦下,
// 含 v-model 的 prop 回传与无绑定时的本地写)才认定为外部直写 → programmaticChange
// (WinUI 同语义);文本被清空时按 WinUI 行为收起建议面板。
watch(text, (value) => {
  if (value === textValue.value) return
  textValue.value = value
  typedQuery.value = value
  notifyText(value, 'programmaticChange')
  if (value === '') closeList(false)
  else void nextTick(update)
})

/* -------------------------------------------------------------------------
 * 候选面板:等宽弹层 + light dismiss 三手势(嵌套豁免由基建注册表内置)
 * ---------------------------------------------------------------------- */

const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: 'bottom-start',
  // 对齐 ComboBox:弹层压住锚下边框 1px(源 Popup 贴锚原点放置),列表自带 2px 上边距
  offset: { mainAxis: -1 },
  matchAnchorWidth: true,
  onOutsidePress: () => closeList(true),
  onEscape: () => closeList(true),
  onAnchorScroll: () => closeList(false), // WinUI:锚滚动链滚动即 light dismiss
})

/** 打开建议面板(WinUI:IsSuggestionListOpen = true)。 */
function openList(): void {
  if (props.disabled || isSuggestionListOpen.value) return
  isSuggestionListOpen.value = true
  void nextTick(() => {
    update()
    scrollHighlightIntoView()
  })
}

/** 关闭建议面板;restorePreview 时若在预览建议文本则恢复已键入文本。 */
function closeList(restorePreview: boolean): void {
  if (!isSuggestionListOpen.value) {
    if (restorePreview) restorePreviewText()
    return
  }
  isSuggestionListOpen.value = false
  highlight.value = -1
  if (restorePreview) restorePreviewText()
}

/** 恢复已键入文本(仅在预览覆盖生效期间实际回写;签名去重后不会多发事件)。
 *  reason 用 programmaticChange:对齐 WinUI 源码恢复路径(↑ 过顶 L1101/L1109、
 *  Esc/Tab L1137 统一 UpdateTextBoxText(…, ProgrammaticChange))。 */
function restorePreviewText(): void {
  if (textValue.value !== typedQuery.value) {
    setModelText(typedQuery.value)
    notifyText(typedQuery.value, 'programmaticChange')
  }
}

// 外部程序化开/关(消费侧写 v-model:is-suggestion-list-open)
watch(isSuggestionListOpen, (value) => {
  if (props.disabled) {
    if (value) isSuggestionListOpen.value = false
    return
  }
  if (value) {
    void nextTick(() => {
      update()
      scrollHighlightIntoView()
    })
  } else if (highlight.value !== -1) {
    highlight.value = -1
  }
})

// 候选集变化:面板开着则重定位(等宽/高度变化);高亮越界时收敛到末项
watch(
  () => props.itemsSource,
  () => {
    if (!isSuggestionListOpen.value) return
    if (highlight.value >= props.itemsSource.length) {
      highlight.value = props.itemsSource.length - 1
    }
    void nextTick(update)
  },
)

/* -------------------------------------------------------------------------
 * 高亮与预览:↑/↓ 移动高亮(两端停住不循环,任务约定),高亮项文本临时回显。
 * ---------------------------------------------------------------------- */

function setHighlight(index: number): void {
  const bounded = Math.min(Math.max(index, -1), props.itemsSource.length - 1)
  if (bounded === highlight.value) return
  highlight.value = bounded
  if (bounded >= 0) {
    const item = props.itemsSource[bounded]
    // 预览建议文本 + WinUI SuggestionChosen(键盘高亮移动即触发;
    // 任务要求无条件预览,WinUI 源码此路径受 UpdateTextOnSelect 门控,差异见 wiki)
    const preview = itemText(item)
    setModelText(preview)
    notifyText(preview, 'suggestionChosen')
    emit('suggestionChosen', item, bounded)
  } else {
    // ↑ 回到无高亮:恢复已键入文本(WinUI 源码同;reason 见 restorePreviewText)
    restorePreviewText()
  }
  scrollHighlightIntoView()
}

/** 高亮项滚动进可视区(对照 ScrollViewer.BringIntoViewOnFocusChange)。 */
function scrollHighlightIntoView(): void {
  void nextTick(() => {
    const layer = layerRef.value
    if (!layer || highlight.value < 0) return
    const option = layer.querySelector<HTMLElement>(`[data-option-index="${highlight.value}"]`)
    option?.scrollIntoView({ block: 'nearest' })
  })
}

/* -------------------------------------------------------------------------
 * 提交:Enter / 查询按钮 / 点击建议(WinUI 三条路径均触发 QuerySubmitted)。
 * ---------------------------------------------------------------------- */

function submitQuery(): void {
  // 读影子值:模型 prop 回传异步,直读 text.value 会拿到旧值(QA C-1)
  const queryText = textValue.value
  closeList(true)
  const args: AutoSuggestQuerySubmittedEventArgs = { queryText, results: props.itemsSource }
  emit('querySubmitted', args)
  emit('textSubmitted', args)
}

/** 选中候选(点击路径):UpdateTextOnSelect 决定是否回写文本,随后按 WinUI 语义提交。 */
function chooseItem(itemIndex: number): void {
  const item = props.itemsSource[itemIndex]
  if (item === undefined) return
  emit('suggestionChosen', item, itemIndex)
  if (props.updateTextOnSelect) {
    typedQuery.value = itemText(item)
    setModelText(typedQuery.value)
    notifyText(typedQuery.value, 'suggestionChosen')
  }
  submitQuery()
}

/** 键盘路径提交:有高亮先落文本再提交(= WinUI 高亮 + Enter),否则提交当前文本。 */
function submitFromKeyboard(): void {
  if (highlight.value >= 0) {
    const item = props.itemsSource[highlight.value]
    if (item !== undefined) {
      emit('suggestionChosen', item, highlight.value)
      typedQuery.value = itemText(item)
      setModelText(typedQuery.value)
      notifyText(typedQuery.value, 'suggestionChosen')
    }
  }
  submitQuery()
}

/* -------------------------------------------------------------------------
 * 输入与键盘(IME 组合期间让位给输入法,组合结束统一补发一次 textChanged)
 * ---------------------------------------------------------------------- */

const composing = ref(false)

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  typedQuery.value = value
  setModelText(value)
  highlight.value = -1
  if (!composing.value) notifyText(value, 'userInput')
  // 有输入 → 打开面板展示候选(候选为空时显示 NoResults 行);清空 → 关闭(WinUI 行为)
  if (value === '') closeList(false)
  else openList()
}

function onCompositionStart(): void {
  composing.value = true
}

function onCompositionEnd(event: CompositionEvent): void {
  composing.value = false
  // 兼容不同浏览器事件顺序:notifyText 按值去重,最终恰好补发一次
  const value = (event.target as HTMLInputElement).value
  typedQuery.value = value
  setModelText(value)
  notifyText(value, 'userInput')
}

function onKeyDown(event: KeyboardEvent): void {
  if (props.disabled || event.ctrlKey || event.altKey || event.metaKey) return
  // IME 组合期间:Enter/Esc/方向键属于输入法,不拦截
  if (composing.value) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (props.itemsSource.length === 0) return
      if (!isSuggestionListOpen.value) {
        openList()
        setHighlight(0)
        return
      }
      setHighlight(highlight.value + 1)
      return
    case 'ArrowUp':
      if (!isSuggestionListOpen.value || highlight.value < 0) return
      event.preventDefault()
      setHighlight(highlight.value - 1) // 到 -1 恢复已键入文本
      return
    case 'Enter':
      event.preventDefault()
      submitFromKeyboard()
      return
    case 'Escape':
      // 常规路径由 usePopupLayer onEscape 收口;此处兜底非栈顶场景
      event.preventDefault()
      closeList(true)
      return
    case 'Tab':
      // WinUI:Tab 即 light dismiss,不拦截默认焦点移动
      closeList(true)
      return
  }
}

// —— 清除按钮(DeleteButton):有内容即显示(任务约定;影子值驱动,点击后当帧消失) ——
const clearButtonVisible = computed(
  () => props.clearButtonEnabled && !props.disabled && textValue.value.length > 0,
)

function onClearMouseDown(event: MouseEvent): void {
  // 阻止默认聚焦转移,输入框保持聚焦,面板不因 blur 误关,click 才能命中
  event.preventDefault()
}

function onClearClick(): void {
  typedQuery.value = ''
  setModelText('')
  notifyText('', 'userInput')
  highlight.value = -1
  closeList(false)
  inputEl.value?.focus()
}

// —— 查询按钮(QueryButton):点击 = 提交当前文本(WinUI QueryButton 语义) ——
function onQueryMouseDown(event: MouseEvent): void {
  event.preventDefault()
}

function onQueryClick(): void {
  if (props.disabled) return
  submitQuery()
  inputEl.value?.focus()
}

const rootClass = computed(() => ({
  'is-disabled': props.disabled,
  'is-open': isSuggestionListOpen.value,
}))
</script>

<template>
  <div v-bind="$attrs" class="wui-auto-suggest-box" :class="rootClass">
    <!-- HeaderContentPresenter:AutoSuggestBoxTopHeaderMargin = 0,0,0,4 -->
    <label v-if="header" class="wui-auto-suggest-box-header" :for="inputId">{{ header }}</label>

    <!-- BorderElement(AutoSuggestBoxTextBoxStyle):TextControl* 族,四态见样式区 -->
    <div ref="anchorRef" class="wui-auto-suggest-box-border">
      <!-- :value 绑影子值:预览/恢复当帧生效,不等 v-model prop 回传 -->
      <input
        :id="inputId"
        ref="inputEl"
        class="wui-auto-suggest-box-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-expanded="isSuggestionListOpen"
        :aria-controls="isSuggestionListOpen ? listboxId : undefined"
        :aria-activedescendant="
          isSuggestionListOpen && highlight >= 0 ? `${listboxId}-opt-${highlight}` : undefined
        "
        :aria-label="header || undefined"
        autocomplete="off"
        :placeholder="placeholderText"
        :disabled="disabled"
        :value="textValue"
        @input="onInput"
        @keydown="onKeyDown"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />
      <!-- DeleteButton(清除):glyph U+E10A,MinWidth 34,IsTabStop=False -->
      <button
        v-if="clearButtonVisible"
        type="button"
        class="wui-auto-suggest-box-delete-button"
        tabindex="-1"
        aria-hidden="true"
        @mousedown="onClearMouseDown"
        @click="onClearClick"
      >
        &#xE10A;
      </button>
      <!-- QueryButton(查询):无 QueryIcon 或禁用时按源折叠语义不渲染 -->
      <button
        v-if="queryGlyph !== '' && !disabled"
        type="button"
        class="wui-auto-suggest-box-query-button"
        tabindex="-1"
        aria-hidden="true"
        @mousedown="onQueryMouseDown"
        @click="onQueryClick"
      >
        {{ queryGlyph }}
      </button>
    </div>
  </div>

  <!-- 建议面板:Teleport 到 body,等宽 + light dismiss,复用 .wui-popup-layer 外壳 -->
  <Teleport to="body">
    <Transition name="wui-auto-suggest-box">
      <div
        v-if="isSuggestionListOpen && !disabled"
        :id="listboxId"
        ref="layerRef"
        class="wui-popup-layer wui-auto-suggest-box-dropdown"
        role="listbox"
        tabindex="-1"
        :aria-label="header || placeholderText || undefined"
      >
        <div
          class="wui-auto-suggest-box-list"
          :style="{ maxHeight: `${maxSuggestionListHeight}px` }"
        >
          <div
            v-for="(item, index) in itemsSource"
            :id="`${listboxId}-opt-${index}`"
            :key="index"
            class="wui-auto-suggest-box-item"
            :class="{ 'is-active': index === highlight }"
            role="option"
            :aria-selected="index === highlight"
            :data-option-index="index"
            @click="chooseItem(index)"
          >
            <!-- 自定义项模板 slot(WinUI ItemTemplate);缺省渲染显示文本。
                 悬停不绑高亮/预览(对齐 WinUI 源码,悬停仅 CSS 底色) -->
            <slot name="item" :item="item" :index="index">
              {{ itemText(item) }}
            </slot>
          </div>
          <!-- NoResults:候选为空时的「无结果」行(不可选中;#no-results-found 可整体替换) -->
          <div
            v-if="itemsSource.length === 0"
            class="wui-auto-suggest-box-no-results"
            role="option"
            aria-disabled="true"
            :aria-selected="false"
          >
            <slot name="noResultsFound">{{ noResultsText }}</slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.wui-auto-suggest-box {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 64px; /* TextControlThemeMinWidth */
}

/* —— Header:AutoSuggestBoxTopHeaderMargin = 0,0,0,4 —— */
.wui-auto-suggest-box-header {
  margin: 0 0 4px;
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize */
  font-weight: 400;
  color: var(--wui-text-control-header-foreground);
}

/* ======================================================================
 * 文本框(AutoSuggestBoxTextBoxStyle:Border 2、MinHeight 32、TextControl* 族)
 * ====================================================================== */
.wui-auto-suggest-box-border {
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 32px; /* TextControlThemeMinHeight */
  background: var(--wui-text-control-background);
  border: 2px solid var(--wui-text-control-border);
}

/* —— PointerOver / Focused / Disabled:与 TextBox 同源四态(hover 规则加
      :not(:focus-within)(QA F1 同款),Disabled 恒优先) —— */
.wui-auto-suggest-box:not(.is-disabled) .wui-auto-suggest-box-border:not(:focus-within):hover {
  background: var(--wui-text-control-background-pointer-over);
  border-color: var(--wui-text-control-border-brush-pointer-over);
}

.wui-auto-suggest-box:not(.is-disabled) .wui-auto-suggest-box-border:not(:focus-within):hover .wui-auto-suggest-box-input {
  color: var(--wui-text-control-foreground-pointer-over);
}

.wui-auto-suggest-box:not(.is-disabled) .wui-auto-suggest-box-border:not(:focus-within):hover .wui-auto-suggest-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground-pointer-over);
}

/* Focused:实底背景 + 强调色边框 */
.wui-auto-suggest-box-border:focus-within {
  background: var(--wui-text-control-background-focused);
  border-color: var(--wui-text-control-border-brush-focused, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)));
}

.wui-auto-suggest-box-border:focus-within .wui-auto-suggest-box-input {
  color: var(--wui-text-control-foreground-focused);
}

.wui-auto-suggest-box-border:focus-within .wui-auto-suggest-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground-focused);
}

/* 内容元素:TextControlThemePadding = 10,3,6,6 */
.wui-auto-suggest-box-input {
  flex: 1;
  min-width: 0;
  padding: 3px 6px 6px 10px;
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize */
  color: var(--wui-text-control-foreground);
  caret-color: var(--wui-text-control-foreground);
  background: transparent;
  border: none;
  outline: none;
}

.wui-auto-suggest-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground);
  opacity: 1;
}

.wui-auto-suggest-box-input::selection {
  background: var(--wui-text-control-selection-highlight-color, var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme)));
}

/* —— Disabled —— */
.wui-auto-suggest-box.is-disabled .wui-auto-suggest-box-header {
  color: var(--wui-text-control-header-foreground-disabled);
}

.wui-auto-suggest-box.is-disabled .wui-auto-suggest-box-border {
  background: var(--wui-text-control-background-disabled);
  border-color: var(--wui-text-control-border-brush-disabled);
}

.wui-auto-suggest-box.is-disabled .wui-auto-suggest-box-input {
  color: var(--wui-text-control-foreground-disabled);
  cursor: default;
}

.wui-auto-suggest-box.is-disabled .wui-auto-suggest-box-input::placeholder {
  color: var(--wui-text-control-placeholder-foreground-disabled);
}

/* ======================================================================
 * DeleteButton / QueryButton:TextControlButton* 画刷族,MinWidth 34,
 * glyph 字号 AutoSuggestBoxIconFontSize = 12(token --wui-auto-suggest-box-icon-font-size)
 * ====================================================================== */
.wui-auto-suggest-box-delete-button,
.wui-auto-suggest-box-query-button {
  flex: none;
  width: 34px; /* MinWidth = 34 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-auto-suggest-box-icon-font-size); /* AutoSuggestBoxIconFontSize = 12 */
  line-height: 1;
  color: var(--wui-text-control-button-foreground);
  background: var(--wui-text-control-button-background);
  border: none;
  cursor: pointer;
}

.wui-auto-suggest-box-delete-button:hover,
.wui-auto-suggest-box-query-button:hover {
  color: var(--wui-text-control-button-foreground-pointer-over);
  background: var(--wui-text-control-button-background-pointer-over);
}

.wui-auto-suggest-box-delete-button:active,
.wui-auto-suggest-box-query-button:active {
  color: var(--wui-text-control-button-foreground-pressed);
  background: var(--wui-text-control-button-background-pressed);
}

/* ======================================================================
 * 建议面板(SuggestionsContainer/SuggestionsList):
 * Background = AutoSuggestBoxSuggestionsListBackground、Border 1px、
 * 列表外边距 AutoSuggestListMargin = 0,2,0,2;MaxHeight 由组件 prop 控制;
 * 圆角/阴影来自 .wui-popup-layer(ThemeShadow 的 Web 近似)
 * ====================================================================== */
.wui-auto-suggest-box-dropdown {
  box-sizing: border-box;
  background: var(--wui-auto-suggest-box-suggestions-list-background);
  border: 1px solid var(--wui-auto-suggest-box-suggestions-list-border);
}

.wui-auto-suggest-box-list {
  overflow-y: auto;
  padding: 2px 0; /* AutoSuggestListMargin = 0,2,0,2 */
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-list-view-item-foreground);
}

/* —— 列表项(ListViewItemRevealStyle:Padding 12,0,12,0、MinHeight 40、Border 1px 透明)—— */
.wui-auto-suggest-box-item {
  display: flex;
  align-items: center;
  min-height: 40px; /* ListViewItemMinHeight */
  padding: 0 12px; /* ListViewItemRevealStyle Padding = 12,0,12,0 */
  border: 1px solid transparent; /* ListViewItemRevealBorderThemeThickness = 1 */
  color: var(--wui-list-view-item-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.wui-auto-suggest-box-item > :deep(*) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wui-auto-suggest-box-item:hover,
.wui-auto-suggest-box-item.is-active {
  background: var(--wui-list-view-item-background-pointer-over);
}

.wui-auto-suggest-box-item:active {
  background: var(--wui-list-view-item-background-pressed);
}

/* —— NoResults 行:与项同规格但不可交互 —— */
.wui-auto-suggest-box-no-results {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 0 12px;
  color: var(--wui-list-view-item-foreground);
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
}

/* —— 入场:上滑淡入;离场快速淡出(对照 WinUI 弹层动画的 Web 近似) —— */
.wui-auto-suggest-box-enter-active {
  animation: wui-flyout-in var(--wui-duration-normal) var(--wui-easing-standard) both;
}

.wui-auto-suggest-box-leave-active {
  animation: wui-fade-out var(--wui-duration-fast) var(--wui-easing-standard) both;
}
</style>
