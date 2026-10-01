<script setup lang="ts">
// ComboBox.vue —— WinUI ComboBox 的 Web 复刻(下拉选择器,基于弹层公共基建)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="ComboBox">(L8885 起)与 <Style x:Key="ComboBoxItemRevealStyle"
//   TargetType="ComboBoxItem">(L17933 起,默认项样式 BasedOn 它,L20202):
//   - 关闭态四色:Background/Border = --wui-combo-box-background/border(Normal)、
//     -pointer-over、-pressed、-disabled;边框 ComboBoxBorderThemeThickness = 2;
//     Padding = 12,5,0,7;MinWidth = ComboBoxThemeMinWidth = 64;
//   - 聚焦态:HighlightBackground(ComboBoxBackgroundUnfocused,强调色低透明度铺底)+
//     ComboBoxBackgroundBorderBrushFocused(透明边框)+ ComboBoxForegroundFocused;
//   - 下拉箭头:DropDownGlyph,SymbolThemeFontFamily,FontSize 12,glyph U+E0E5,
//     32px 列(Margin 0,10,10,10,视觉居中);颜色 --wui-combo-box-drop-down-glyph-*;
//   - 下拉面板(PopupBorder):Background = --wui-combo-box-drop-down-background、
//     Border 1px = --wui-combo-box-drop-down-border、MinWidth = ComboBoxPopupThemeMinWidth
//     = 80、MaxDropDownHeight = 504、内容边距 ComboBoxDropdownContentMargin = 0,4,0,4;
//     层圆角/阴影由 .wui-popup-layer 提供(WinUI ThemeShadow 的 Web 近似);
//   - 列表项(reveal 族,默认样式即 reveal):Padding = ComboBoxItemRevealThemePadding
//     = 10,4,10,7、Border 1px 透明;hover/pressed/selected/selected×hover/selected×pressed
//     全部取 --wui-combo-box-item-reveal-* token;
//   - 可编辑态:EditableText(ComboBoxTextBoxStyle,内边距 10,3,30,5、边框透明)+
//     DropDownOverlay(30px 宽,EditableModeStates 四态:hover/pressed/focused 系)。
// 行为规格(对照 WinUI ComboBox):
//   - items / selectedItem / selectedIndex / text 双向;selectionChanged / textChanged /
//     dropDownOpened / dropDownClosed 事件;
//   - 键盘:关闭态 Enter/Space/↓/↑ 开、type-ahead 首字母跳(直接改选中);
//     打开态 ↓/↑ 循环导航、Home/End 首/末、Enter/Space 选、Esc/Tab 关;
//   - 下拉面板走 usePopupLayer(matchAnchorWidth 等宽 + light dismiss 三手势),
//     嵌套豁免由弹层注册表内置。
import { computed, nextTick, ref, useAttrs, useId, watch } from 'vue'
import { usePopupAnchor, usePopupLayer } from '@/composables/usePopup'

defineOptions({ name: 'WuiComboBox', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 数据源数组(WinUI ItemsSource);元素可为 string / number 或对象。 */
    items?: unknown[]
    /** 空内容时显示的占位文本(WinUI PlaceholderText)。 */
    placeholderText?: string
    /** 输入框上方标头文本(WinUI Header)。 */
    header?: string
    /** 可编辑模式(WinUI IsEditable):显示文本输入框,输入即过滤下拉列表,Enter 提交自由文本。 */
    isEditable?: boolean
    /** 对象项的显示字段路径(WinUI DisplayMemberPath);缺省 String(item)。 */
    displayMemberPath?: string
    /** 下拉面板最大高度 px(WinUI MaxDropDownHeight,默认 504)。 */
    maxDropDownHeight?: number
    /** 禁用态,样式对照 Disabled 视觉状态。 */
    disabled?: boolean
  }>(),
  {
    items: () => [],
    placeholderText: '',
    header: '',
    isEditable: false,
    displayMemberPath: '',
    maxDropDownHeight: 504,
    disabled: false,
  },
)

/** 下拉开关(WinUI IsDropDownOpen),支持 v-model:is-drop-down-open。 */
const isDropDownOpen = defineModel<boolean>('isDropDownOpen', { default: false })
/** 选中项索引(WinUI SelectedIndex,未选为 -1),支持 v-model:selected-index。 */
const selectedIndex = defineModel<number>('selectedIndex', { default: -1 })
/** 选中项(WinUI SelectedItem),支持 v-model:selected-item;未选为 null(defineModel<unknown> 不收字面量 default,初始 undefined 与 null 同义)。 */
const selectedItem = defineModel<unknown>('selectedItem')
/** 可编辑模式下的文本(WinUI ComboBox.Text),支持 v-model:text。 */
const text = defineModel<string>('text', { default: '' })

const emit = defineEmits<{
  /** WinUI SelectionChanged:选中项变化(含程序化赋值);参数为 (selectedIndex, selectedItem)。 */
  (e: 'selectionChanged', index: number, item: unknown): void
  /** WinUI TextChanged:可编辑文本变化(输入即触发)。 */
  (e: 'textChanged', value: string): void
  /** WinUI DropDownOpened:下拉面板已打开(首次定位完成后)。 */
  (e: 'dropDownOpened'): void
  /** WinUI DropDownClosed:下拉面板已关闭。 */
  (e: 'dropDownClosed'): void
}>()

// —— 无障碍名:combobox 角色元素需要可访问名(a11y QA aria-input-field-name)。——
// 优先级:header(可见标头)> 调用方 aria-label > placeholderText 兜底。调用方经 attrs
// 传入的 aria-label 必须从根元素剥离(根 div 无 role,aria-label 属禁止属性,见
// aria-prohibited-attr),改注入到 combobox 角色元素上。
const attrs = useAttrs()

/** 调用方透传的 aria-label / aria-labelledby(attrs 落点从根元素迁到角色元素)。 */
const callerLabelledBy = computed(() =>
  typeof attrs['aria-labelledby'] === 'string' ? attrs['aria-labelledby'] : undefined,
)
const callerAriaLabel = computed(() =>
  typeof attrs['aria-label'] === 'string' ? attrs['aria-label'] : undefined,
)

/** combobox 角色元素(非可编辑根 / 可编辑内部 input)的可访问名。 */
const fieldAriaLabel = computed(
  () => props.header || callerAriaLabel.value || props.placeholderText || undefined,
)

/** 根元素透传 attrs:剥离 aria-label / aria-labelledby(已迁移到角色元素)。 */
const rootAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'aria-label' || key === 'aria-labelledby') continue
    rest[key] = value
  }
  return rest
})

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

/** 当前应显示在关闭态内容区的文本(选中项文本;未选为空串)。 */
const displayText = computed<string>(() => {
  const index = selectedIndex.value
  return index >= 0 && index < props.items.length ? itemText(props.items[index]) : ''
})

/* -------------------------------------------------------------------------
 * 过滤(可编辑模式):输入即过滤;displayMemberPath 字段做不区分大小写包含匹配。
 * ---------------------------------------------------------------------- */

interface VisibleItem {
  item: unknown
  /** 在 props.items 中的真实索引(选中与事件都用真实索引)。 */
  index: number
}

/** 过滤词:仅可编辑模式下使用;选中项提交 / 面板关闭时清空。 */
const query = ref('')

const visibleItems = computed<VisibleItem[]>(() => {
  const list = props.items.map((item, index) => ({ item, index }))
  if (!props.isEditable || query.value === '') return list
  const q = query.value.toLowerCase()
  return list.filter(({ item }) => itemText(item).toLowerCase().includes(q))
})

/** 键盘高亮项(visibleItems 的下标);面板关闭时无意义。 */
const activeVisible = ref(0)

function visibleIndexForItem(itemIndex: number): number {
  return visibleItems.value.findIndex((visible) => visible.index === itemIndex)
}

/* -------------------------------------------------------------------------
 * 选中状态同步:selectedIndex / selectedItem / text 三者互一致,
 * 程序化赋值(外部写 model)同样触发 selectionChanged(对齐 WinUI 语义)。
 * ---------------------------------------------------------------------- */

/** 正在内部写 model 的标志,防止同步写入路径上的同步重入。 */
let syncingSelection = false

/**
 * 最近一次 selectionChanged 的签名。applySelection 与 selectedIndex watcher 都会
 * 通知(Watcher 是 flush 队列延迟触发,届时 syncingSelection 已复位,不能靠标志
 * 去重),按「索引 + 项引用」签名去重保证一次变化只发一个事件。
 */
let lastNotifiedIndex = selectedIndex.value
let lastNotifiedItem = selectedItem.value

function notifySelection(index: number, item: unknown): void {
  if (lastNotifiedIndex === index && lastNotifiedItem === item) return
  lastNotifiedIndex = index
  lastNotifiedItem = item
  emit('selectionChanged', index, item)
}

function applySelection(index: number): void {
  const list = props.items
  const safeIndex = index >= 0 && index < list.length ? index : -1
  const nextItem = safeIndex >= 0 ? list[safeIndex] : null
  syncingSelection = true
  try {
    selectedIndex.value = safeIndex
    selectedItem.value = nextItem
    if (props.isEditable) text.value = safeIndex >= 0 ? itemText(list[safeIndex]) : ''
  } finally {
    syncingSelection = false
  }
  notifySelection(safeIndex, nextItem)
}

watch(selectedIndex, (value) => {
  if (syncingSelection) return
  const list = props.items
  const index = typeof value === 'number' && value >= 0 && value < list.length ? value : -1
  if (index !== value) {
    // 越界值归一为 -1(本 watcher 会以归一值再次进入,完成同步)
    selectedIndex.value = index
    return
  }
  const expectedItem = index >= 0 ? list[index] : null
  if (selectedItem.value !== expectedItem) {
    // 外部只写了 selectedIndex:补齐 selectedItem / text
    syncingSelection = true
    try {
      selectedItem.value = expectedItem
      if (props.isEditable) text.value = index >= 0 ? itemText(list[index]) : ''
    } finally {
      syncingSelection = false
    }
  }
  activeVisible.value = index >= 0 ? Math.max(0, visibleIndexForItem(index)) : 0
  // 内部写入(applySelection)路径已按同签名通知过,此处自动去重
  notifySelection(index, expectedItem)
})

watch(selectedItem, (value) => {
  if (syncingSelection) return
  const index = props.items.indexOf(value)
  if (index !== selectedIndex.value) {
    applySelection(index)
  }
})

// 数据源变化:越界选中归一(WinUI:SelectedIndex 置 -1)
watch(
  () => props.items,
  (list) => {
    if (selectedIndex.value >= list.length) {
      applySelection(-1)
    }
  },
)

// 可编辑文本的程序化赋值(非输入聚焦期)→ 同步过滤词,保持「输入即过滤」一致
watch(text, (value) => {
  if (props.isEditable && !editFocused.value) {
    query.value = value
  }
})

/* -------------------------------------------------------------------------
 * 弹层:等宽下拉 + light dismiss 三手势(嵌套豁免由基建注册表内置)
 * ---------------------------------------------------------------------- */

const { layerRef, update } = usePopupLayer({
  anchor: anchorRef,
  placement: 'bottom-start',
  // WinUI Popup 相对锚原点放置 + PopupBorder Margin 0,-1,0,-1 → 视觉上压住锚边框 1px
  offset: { mainAxis: -1 },
  matchAnchorWidth: true,
  onOutsidePress: () => closeDropDown(false),
  onEscape: () => {
    // Esc:关闭;可编辑态同时撤销未提交的输入(回退到选中项文本)
    if (props.isEditable) text.value = displayText.value
    query.value = ''
    closeDropDown(true)
  },
  onAnchorScroll: () => closeDropDown(false), // WinUI:锚滚动链滚动即 light dismiss
})

/** 关闭下拉;键盘路径(restoreFocus=true)把焦点归还:可编辑回输入框,否则回锚。 */
function closeDropDown(restoreFocus: boolean): void {
  if (!isDropDownOpen.value) return
  query.value = ''
  isDropDownOpen.value = false
  if (restoreFocus) {
    if (props.isEditable) inputEl.value?.focus()
    else anchorRef.value?.focus()
  }
}

function openDropDown(keepQuery = false): void {
  if (props.disabled || isDropDownOpen.value) return
  if (!keepQuery) query.value = ''
  // 打开时高亮当前选中项(无选中则首项)
  const selectedVisible = visibleIndexForItem(selectedIndex.value)
  activeVisible.value = selectedVisible >= 0 ? selectedVisible : 0
  isDropDownOpen.value = true
  void nextTick(() => {
    update()
    scrollActiveIntoView()
    emit('dropDownOpened')
  })
}

watch(isDropDownOpen, (value) => {
  if (value) return
  emit('dropDownClosed')
})

/** 提交当前高亮项(WinUI:列表项点击 / 打开态 Enter/Space 后收起)。 */
function commitActive(): void {
  const visible = visibleItems.value[activeVisible.value]
  if (visible) applySelection(visible.index)
  closeDropDown(false)
}

function selectItem(itemIndex: number): void {
  applySelection(itemIndex)
  closeDropDown(false)
}

/* -------------------------------------------------------------------------
 * 键盘:type-ahead 缓冲(1s 窗口,对照 WinUI 文本搜索)
 * ---------------------------------------------------------------------- */

let typeAheadBuffer = ''
let typeAheadTimer: ReturnType<typeof setTimeout> | null = null

function resetTypeAhead(): void {
  typeAheadBuffer = ''
  if (typeAheadTimer !== null) {
    clearTimeout(typeAheadTimer)
    typeAheadTimer = null
  }
}

/** type-ahead:从当前高亮/选中项之后找「以输入串开头」的项,循环整表;命中即改选中。 */
function applyTypeAhead(character: string): void {
  const visible = visibleItems.value
  if (visible.length === 0) return
  typeAheadBuffer = (typeAheadBuffer + character).toLowerCase()
  if (typeAheadTimer !== null) clearTimeout(typeAheadTimer)
  typeAheadTimer = setTimeout(resetTypeAhead, 1000)

  // 起点:打开态从高亮项之后;关闭态从选中项之后(-1 时即从首项开始)
  const startIndex = isDropDownOpen.value ? activeVisible.value : visibleIndexForItem(selectedIndex.value)
  for (let step = 1; step <= visible.length; step += 1) {
    const position = (((startIndex + step) % visible.length) + visible.length) % visible.length
    const candidate = visible[position]
    if (candidate && itemText(candidate.item).toLowerCase().startsWith(typeAheadBuffer)) {
      if (isDropDownOpen.value) {
        activeVisible.value = position
        scrollActiveIntoView()
      } else {
        applySelection(candidate.index)
      }
      return
    }
  }
}

/* -------------------------------------------------------------------------
 * 键盘:关闭/打开态(非可编辑根节点持有焦点)
 * ---------------------------------------------------------------------- */

function onRootKeydown(event: KeyboardEvent): void {
  // 可编辑模式:键盘由内部 input 处理;此处只收得到冒泡事件,勿重复处理
  if (props.disabled || props.isEditable) return
  if (event.ctrlKey || event.altKey || event.metaKey) return
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (isDropDownOpen.value) commitActive()
      else openDropDown()
      return
    case 'ArrowDown':
    case 'ArrowUp':
      event.preventDefault()
      if (!isDropDownOpen.value) {
        openDropDown()
        return
      }
      stepActive(event.key === 'ArrowDown' ? 1 : -1)
      return
    case 'Home':
      if (!isDropDownOpen.value) return
      event.preventDefault()
      if (visibleItems.value.length > 0) {
        activeVisible.value = 0
        scrollActiveIntoView()
      }
      return
    case 'End':
      if (!isDropDownOpen.value) return
      event.preventDefault()
      if (visibleItems.value.length > 0) {
        activeVisible.value = visibleItems.value.length - 1
        scrollActiveIntoView()
      }
      return
    case 'Tab':
      // WinUI:Tab 即 light dismiss,不拦截默认焦点移动
      closeDropDown(false)
      return
    case 'Escape':
      // 常规路径由 usePopupLayer onEscape 收口;此处兜底非栈顶场景
      closeDropDown(false)
      return
  }
  // type-ahead:可打印单字符
  if (event.key.length === 1) applyTypeAhead(event.key)
}

function stepActive(direction: 1 | -1): void {
  const count = visibleItems.value.length
  if (count === 0) return
  activeVisible.value = (activeVisible.value + direction + count) % count
  scrollActiveIntoView()
}

/** 高亮项滚动进可视区(对照 ScrollViewer.BringIntoViewOnFocusChange)。 */
function scrollActiveIntoView(): void {
  void nextTick(() => {
    const layer = layerRef.value
    if (!layer) return
    const option = layer.querySelector<HTMLElement>(`[data-option-index="${activeVisible.value}"]`)
    option?.scrollIntoView({ block: 'nearest' })
  })
}

/* -------------------------------------------------------------------------
 * 键盘与输入:可编辑输入框(输入即过滤 + 上下导航 + Enter 提交 + Esc 撤销)
 * ---------------------------------------------------------------------- */

/** 可编辑聚焦态(EditableModeStates 的 TextBoxFocused 系)。 */
const editFocused = ref(false)

function onEditTextKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.altKey || event.metaKey) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!isDropDownOpen.value) openDropDown()
      else stepActive(1)
      return
    case 'ArrowUp':
      event.preventDefault()
      if (isDropDownOpen.value) stepActive(-1)
      return
    case 'Enter':
      event.preventDefault()
      if (isDropDownOpen.value && visibleItems.value.length > 0) {
        // 命中过滤结果 → 选中
        commitActive()
        inputEl.value?.focus()
      } else {
        // 无命中 → 提交自由文本(WinUI TextSubmitted 语义),保持原选中不变
        query.value = ''
        closeDropDown(false)
      }
      return
    case 'Escape':
      // 撤销编辑回选中项文本并关闭(usePopupLayer onEscape 亦会触发,此处保证非栈顶路径)
      text.value = displayText.value
      query.value = ''
      closeDropDown(false)
      return
    case 'Tab':
      closeDropDown(false)
      return
    // Home/End:让位给文本插入符移动(编辑态差异,见 wiki)
  }
}

function onEditTextInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  text.value = value
  emit('textChanged', value)
  // 输入即过滤:文本与选中项一致时不过滤(等同未编辑)
  query.value = value === displayText.value ? '' : value
  activeVisible.value = 0
  if (!isDropDownOpen.value) {
    if (query.value !== '') openDropDown(true)
  } else {
    void nextTick(update)
  }
}

/** DropDownOverlay 点击(可编辑模式箭头区):开关下拉;mousedown 阻止焦点离开输入框。 */
function onEditOverlayMousedown(event: MouseEvent): void {
  if (props.disabled) return
  event.preventDefault() // 保住输入框焦点(EditableModeStates 依赖 focus-within)
}

function onEditOverlayClick(): void {
  if (props.disabled) return
  if (isDropDownOpen.value) closeDropDown(false)
  else openDropDown()
}

/** 非可编辑根点击:开/关切换(WinUI 点击控件切换下拉)。 */
function onRootClick(): void {
  if (props.disabled || props.isEditable) return
  if (isDropDownOpen.value) closeDropDown(false)
  else {
    anchorRef.value?.focus()
    openDropDown()
  }
}

const rootClass = computed(() => ({
  'is-disabled': props.disabled,
  'is-editable': props.isEditable,
  'is-open': isDropDownOpen.value,
}))
</script>

<template>
  <div v-bind="rootAttrs" class="wui-combo-box" :class="rootClass">
    <!-- HeaderContentPresenter:ComboBoxHeaderThemeMargin = 0,0,0,4 -->
    <label v-if="header" class="wui-combo-box-header" :for="isEditable ? inputId : undefined">
      {{ header }}
    </label>

    <!-- 关闭态输入框(Background border):四态 + 聚焦铺底,见样式区 -->
    <div
      ref="anchorRef"
      class="wui-combo-box-input"
      :role="isEditable ? undefined : 'combobox'"
      :tabindex="isEditable || disabled ? -1 : 0"
      :aria-expanded="isEditable ? undefined : isDropDownOpen"
      :aria-haspopup="isEditable ? undefined : 'listbox'"
      :aria-label="isEditable ? undefined : fieldAriaLabel"
      :aria-labelledby="isEditable ? undefined : callerLabelledBy"
      :aria-controls="!isEditable && isDropDownOpen ? listboxId : undefined"
      :aria-activedescendant="
        !isEditable && isDropDownOpen ? `${listboxId}-opt-${activeVisible}` : undefined
      "
      :aria-disabled="disabled || undefined"
      @click="onRootClick"
      @keydown="onRootKeydown"
    >
      <!-- 非可编辑:ContentPresenter + PlaceholderTextBlock -->
      <span v-if="!isEditable" class="wui-combo-box-content">
        <span v-if="displayText !== ''" class="wui-combo-box-value">{{ displayText }}</span>
        <span v-else class="wui-combo-box-placeholder">{{ placeholderText }}</span>
      </span>

      <!-- 可编辑:EditableText(ComboBoxTextBoxStyle:Padding 10,3,30,5、边框透明) -->
      <input
        v-else
        :id="inputId"
        ref="inputEl"
        class="wui-combo-box-edit-text"
        type="text"
        role="combobox"
        :aria-label="fieldAriaLabel"
        :aria-labelledby="callerLabelledBy"
        :aria-expanded="isDropDownOpen"
        aria-haspopup="listbox"
        :aria-controls="isDropDownOpen ? listboxId : undefined"
        :aria-activedescendant="isDropDownOpen ? `${listboxId}-opt-${activeVisible}` : undefined"
        autocomplete="off"
        :placeholder="placeholderText"
        :disabled="disabled"
        :value="text"
        @input="onEditTextInput"
        @keydown="onEditTextKeydown"
        @focus="editFocused = true"
        @blur="editFocused = false"
      />

      <!-- DropDownOverlay:可编辑模式箭头区的悬停/按压底色(EditableModeStates) -->
      <span
        v-if="isEditable"
        class="wui-combo-box-edit-overlay"
        aria-hidden="true"
        @mousedown="onEditOverlayMousedown"
        @click="onEditOverlayClick"
      ></span>

      <!-- DropDownGlyph:U+E0E5(ChevronDown),FontSize 12,32px 列 -->
      <span class="wui-combo-box-glyph" aria-hidden="true">&#xE0E5;</span>
    </div>
  </div>

  <!-- 下拉面板:Teleport 到 body,等宽 + light dismiss,复用 .wui-popup-layer 外壳 -->
  <Teleport to="body">
    <Transition name="wui-combo-box">
      <div
        v-if="isDropDownOpen && !disabled"
        :id="listboxId"
        ref="layerRef"
        class="wui-popup-layer wui-combo-box-dropdown"
        role="listbox"
        tabindex="-1"
        :aria-label="fieldAriaLabel"
        :aria-labelledby="callerLabelledBy"
      >
        <div class="wui-combo-box-list" :style="{ maxHeight: `${maxDropDownHeight}px` }">
          <div
            v-for="(visible, visibleIndex) in visibleItems"
            :id="`${listboxId}-opt-${visibleIndex}`"
            :key="visible.index"
            class="wui-combo-box-item"
            :class="{
              'is-selected': visible.index === selectedIndex,
              'is-active': visibleIndex === activeVisible,
            }"
            role="option"
            :aria-selected="visible.index === selectedIndex"
            :data-option-index="visibleIndex"
            @click="selectItem(visible.index)"
            @pointermove="activeVisible = visibleIndex"
          >
            <!-- 自定义项模板 slot(WinUI ItemTemplate);缺省渲染显示文本 -->
            <slot name="item" :item="visible.item" :index="visible.index">
              {{ itemText(visible.item) }}
            </slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.wui-combo-box {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 64px; /* ComboBoxThemeMinWidth */
}

/* —— Header:ComboBoxHeaderThemeMargin = 0,0,0,4;FontWeight Normal;色随控件前景(继承) —— */
.wui-combo-box-header {
  margin: 0 0 4px;
  font-size: var(--wui-control-content-theme-font-size); /* ControlContentThemeFontSize */
  font-weight: 400; /* ComboBoxHeaderThemeFontWeight = Normal */
  color: var(--wui-combo-box-foreground);
}

/* ======================================================================
 * 关闭态输入框(源模板 Background border):BorderThickness = 2、Padding = 12,5,0,7
 * ====================================================================== */
.wui-combo-box-input {
  /* 关闭态边框色(源 Background Border 的 BorderBrush);各状态只覆写本变量 */
  --cb-input-border: var(--wui-combo-box-border);
  position: relative;
  display: flex;
  align-items: stretch;
  min-width: 64px; /* ComboBoxThemeMinWidth */
  min-height: 32px; /* 源未给 MinHeight:内容行(内边距 5+7 + 14px 文本行)自然高度 = 32 */
  box-sizing: border-box;
  background: var(--wui-combo-box-background);
  /* 源模板里 Border x:Name="Background"(BorderThickness 2)与 ContentPresenter 是
     LayoutRoot Grid **同一格的兄弟节点**(generic.xaml L9168-9193):2px 边框与内容重叠,
     Padding 12,5,0,7 自控件**外缘**量起。故边框不能算进内容盒高度
     (写 2px 边框于本元素会把关闭态撑到 32 + 2×2 = 36px,文字/箭头整体 +2/+2;VR-B3 §2.2)。
     这里用绝对定位的 ::before 复刻「同格兄弟边框」——不参与布局,只覆盖绘制。 */
  border: 0;
  border-radius: var(--wui-control-corner-radius); /* ControlCornerRadius = 4,仅闭合/聚焦态盒(V3 QA 打回项;下拉面板 8px 见弹层基建) */
  cursor: pointer;
  outline: none;
}

/* 边框层(源 Background Border):覆盖整个控件盒、自外缘 2px 内缩,不撑高控件 */
.wui-combo-box-input::before {
  content: '';
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 2px solid var(--cb-input-border); /* ComboBoxBorderThemeThickness */
  border-radius: inherit;
  pointer-events: none;
}

/* 内容区:Padding = 12,5,0,7 */
.wui-combo-box-content {
  flex: 1;
  min-width: 0;
  padding: 5px 0 7px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-combo-box-foreground);
}

.wui-combo-box-placeholder {
  color: var(--wui-combo-box-place-holder-foreground); /* ComboBoxPlaceHolderForeground */
}

/* —— DropDownGlyph:32px 列 + Margin 0,10,10,10 + FontSize 12 → 视觉居中 —— */
.wui-combo-box-glyph {
  flex: none;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px 0;
  font-family: var(--wui-symbol-theme-font-family);
  font-size: var(--wui-tool-tip-content-theme-font-size); /* GlyphElement FontSize = 12,取同值 token */
  line-height: 1;
  color: var(--wui-combo-box-drop-down-glyph-foreground);
  user-select: none;
  -webkit-user-select: none;
}

/* —— 状态优先级(对照 VSM):Disabled > Focused > Pressed/Open > PointerOver > Normal ——
   hover 加 :not(:focus) / :not(.is-open)(QA F1 同 TextBox 做法);
   :active 为按住瞬间,松开后由 .is-open 接管(WinUI 开着即 pressed 底)。 */
.wui-combo-box:not(.is-disabled) .wui-combo-box-input:not(:focus):not(.is-open):hover {
  background: var(--wui-combo-box-background-pointer-over);
  --cb-input-border: var(--wui-combo-box-border-brush-pointer-over);
}

.wui-combo-box:not(.is-disabled) .wui-combo-box-input:not(:focus):not(.is-open):active {
  background: var(--wui-combo-box-background-pressed);
  --cb-input-border: var(--wui-combo-box-border-brush-pressed);
}

/* 打开态(WinUI FocusedDropDown / Pressed 语义):pressed 底色 */
.wui-combo-box:not(.is-disabled) .wui-combo-box-input.is-open {
  background: var(--wui-combo-box-background-pressed);
  --cb-input-border: var(--wui-combo-box-border-brush-pressed);
}

/* 聚焦态:HighlightBackground(强调色低透明度)+ 透明边框(Focused storyboard)。
   非可编辑 :focus;可编辑 :focus-within(焦点在内部 input)。置于 last 覆盖同权重的 .is-open */
.wui-combo-box:not(.is-disabled) .wui-combo-box-input:focus,
.wui-combo-box:not(.is-disabled) .wui-combo-box-input:focus-within {
  background: var(--wui-combo-box-background-unfocused); /* ComboBoxBackgroundUnfocused */
  --cb-input-border: var(--wui-combo-box-background-border-brush-focused); /* 透明 */
}

.wui-combo-box:not(.is-disabled) .wui-combo-box-input:focus .wui-combo-box-content,
.wui-combo-box:not(.is-disabled) .wui-combo-box-input:focus-within .wui-combo-box-content {
  color: var(--wui-combo-box-foreground-focused);
}

.wui-combo-box:not(.is-disabled) .wui-combo-box-input:focus .wui-combo-box-glyph {
  color: var(--wui-combo-box-drop-down-glyph-foreground-focused);
}

/* —— Disabled —— */
.wui-combo-box.is-disabled .wui-combo-box-header {
  color: var(--wui-combo-box-foreground-disabled);
}

.wui-combo-box.is-disabled .wui-combo-box-input {
  background: var(--wui-combo-box-background-disabled);
  --cb-input-border: var(--wui-combo-box-border-brush-disabled);
  cursor: default;
}

.wui-combo-box.is-disabled .wui-combo-box-content {
  color: var(--wui-combo-box-foreground-disabled);
}

.wui-combo-box.is-disabled .wui-combo-box-placeholder {
  color: var(--wui-combo-box-foreground-disabled);
}

.wui-combo-box.is-disabled .wui-combo-box-glyph {
  color: var(--wui-combo-box-drop-down-glyph-foreground-disabled);
}

/* ======================================================================
 * 可编辑态:EditableText(ComboBoxTextBoxStyle:Padding 10,3,30,5、边框透明)
 * ====================================================================== */
.wui-combo-box-edit-text {
  flex: 1;
  min-width: 0;
  padding: 3px 30px 5px 10px; /* EditableText Padding = 10,3,30,5(右 30 让位箭头区) */
  font-family: inherit;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-combo-box-foreground);
  caret-color: var(--wui-combo-box-foreground);
  background: transparent;
  border: none; /* EditableText BorderBrush = Transparent */
  outline: none;
}

.wui-combo-box.is-disabled .wui-combo-box-edit-text {
  color: var(--wui-combo-box-foreground-disabled);
  cursor: default;
}

.wui-combo-box-edit-text::placeholder {
  color: var(--wui-combo-box-place-holder-foreground);
  opacity: 1;
}

/* DropDownOverlay:宽 30、Margin 0,2,2,2;聚焦态 Margin 0,3,2,2(EditableModeStates) */
.wui-combo-box-edit-overlay {
  position: absolute;
  top: 2px;
  right: 2px;
  bottom: 2px;
  width: 30px;
  cursor: pointer;
  background: transparent;
}

.wui-combo-box-input:focus-within .wui-combo-box-edit-overlay {
  top: 3px;
}

.wui-combo-box:not(.is-disabled) .wui-combo-box-edit-overlay:hover {
  background: var(--wui-combo-box-drop-down-background-pointer-over);
}

.wui-combo-box:not(.is-disabled) .wui-combo-box-edit-overlay:active {
  background: var(--wui-combo-box-drop-down-background-pointer-pressed);
}

.wui-combo-box:not(.is-disabled) .wui-combo-box-input:focus-within .wui-combo-box-edit-overlay:hover {
  background: var(--wui-combo-box-focused-drop-down-background-pointer-over);
}

.wui-combo-box:not(.is-disabled) .wui-combo-box-input:focus-within .wui-combo-box-edit-overlay:active {
  background: var(--wui-combo-box-focused-drop-down-background-pointer-pressed);
}

/* 可编辑聚焦时箭头换色(TextBoxFocused → ComboBoxEditableDropDownGlyphForeground) */
.wui-combo-box:not(.is-disabled) .wui-combo-box-input:focus-within .wui-combo-box-glyph {
  color: var(--wui-combo-box-editable-drop-down-glyph-foreground);
}

/* ======================================================================
 * 下拉面板(PopupBorder):Border 1px、MinWidth 80、内容边距 0,4,0,4;
 * 圆角/阴影来自 .wui-popup-layer(ThemeShadow 的 Web 近似)
 * ====================================================================== */
.wui-combo-box-dropdown {
  min-width: 80px; /* ComboBoxPopupThemeMinWidth */
  box-sizing: border-box;
  background: var(--wui-combo-box-drop-down-background);
  border: 1px solid var(--wui-combo-box-drop-down-border);
  color: var(--wui-combo-box-drop-down-foreground);
}

.wui-combo-box-list {
  overflow-y: auto;
  padding: 4px 0; /* ComboBoxDropdownContentMargin = 0,4,0,4 */
  font-size: var(--wui-control-content-theme-font-size);
}

/* —— 列表项(ComboBoxItemRevealStyle:Padding 10,4,10,7、Border 1px 透明)—— */
.wui-combo-box-item {
  padding: 4px 10px 7px;
  border: 1px solid transparent; /* ComboBoxItemRevealBorderThemeThickness = 1 */
  color: var(--wui-combo-box-item-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.wui-combo-box-item:hover,
.wui-combo-box-item.is-active {
  background: var(--wui-combo-box-item-reveal-background-pointer-over);
}

.wui-combo-box-item:active {
  background: var(--wui-combo-box-item-reveal-background-pressed);
}

.wui-combo-box-item.is-selected {
  background: var(--wui-combo-box-item-reveal-background-selected);
}

.wui-combo-box-item.is-selected:hover,
.wui-combo-box-item.is-selected.is-active {
  background: var(--wui-combo-box-item-reveal-background-selected-pointer-over);
}

.wui-combo-box-item.is-selected:active {
  background: var(--wui-combo-box-item-reveal-background-selected-pressed);
}

/* —— 入场:上滑淡入;离场快速淡出(对照 SplitOpen/CloseThemeAnimation 的 Web 近似)—— */
.wui-combo-box-enter-active {
  animation: wui-flyout-in var(--wui-duration-normal) var(--wui-easing-standard) both;
}

.wui-combo-box-leave-active {
  animation: wui-fade-out var(--wui-duration-fast) var(--wui-easing-standard) both;
}
</style>
