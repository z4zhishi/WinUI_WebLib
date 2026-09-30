// WinUI_WebLib — 集合选择模型组合式(useSelection.ts)
//
// 阶段 5 集合类控件(ListView / GridView / ItemsView 等选择容器)公共状态底座:
//   - SelectionMode:None / Single / Multiple / Extended(对齐 WinUI
//     ListViewSelectionMode,WinUI 3 缺省 Single);
//   - 双视图:selectedItems(条目数组)+ selectedIndices / selectedIndex
//     (索引数组;selectedIndex 取首个、无选中为 -1,对齐 WinUI ListView.SelectedIndex);
//   - 操作:select / deselect / toggle / selectRange(区间,含 shift 语义)/
//     selectAll / clear / replaceSelection;handleClick() 按 WinUI ListView 的
//     指针语义封装上述原语(ctrl 切换、shift 区间、锚点 anchorIndex);
//   - 比较键:默认对象引用;传 keyOf 提取器则按业务键比较(排序/过滤后选择不丢,
//     这是与 WinUI SelectionModel「按索引跟踪」的刻意差异,wiki 详述)。
//
// 纯状态逻辑:不触碰 DOM、不注册事件监听;指针/键盘手势由宿主控件解释后调
// handleClick()(或自行组合原语)。比较经 Set 完成,千级条目内均为 O(n)。

import { computed, ref, shallowRef, toValue, watch } from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'

/** 选择模式(对齐 WinUI ListViewSelectionMode;WinUI 3 控件缺省 Single)。 */
export type SelectionMode = 'None' | 'Single' | 'Multiple' | 'Extended'

/** handleClick 的修饰键(通常直接透传 MouseEvent/PointerEvent 的布尔字段)。 */
export interface SelectionModifiers {
  /** Ctrl(WinUI 语义:切换该项选中态)。 */
  ctrl?: boolean
  /** Cmd/macOS:与 ctrl 同义(与 Web 平台惯例一致)。 */
  meta?: boolean
  /** Shift(WinUI 语义:从锚点 anchorIndex 到本项的区间)。 */
  shift?: boolean
}

export interface UseSelectionOptions<T> {
  /**
   * 条目列表(可选):selectedItems / selectedIndices / 区间与 selectAll / 
   * handleClick 语义都依赖它;不提供时仍可用「按条目引用」的 select/isSelected
   * 等操作,但一切「索引 ↔ 条目」换算不可用。
   */
  items?: MaybeRefOrGetter<readonly T[] | undefined>
  /** 选择模式,默认 'Single';支持响应式(函数/ref),切换模式不自动清空选择。 */
  selectionMode?: MaybeRefOrGetter<SelectionMode | undefined>
  /**
   * 比较键提取器,默认对象引用。传入后选择按键跟踪:列表重排/过滤/换实例
   * (键相同)时选中不丢;列表中已不存在的键会在 items 变化时被自动清除
   * (对齐「移除条目即取消其选中」的 WinUI 行为)。
   */
  keyOf?: (item: T, index: number) => unknown
  /** 选择变化回调(含自动清除),参数为变化后的条目/索引快照。 */
  onSelectionChange?: (selectedItems: readonly T[], selectedIndices: readonly number[]) => void
}

export interface UseSelectionReturn<T> {
  /** 当前生效模式(归一化,永不 undefined)。 */
  selectionMode: ComputedRef<SelectionMode>
  /** 选中键数组快照(持久化/调试用;默认键 = 条目引用)。 */
  selectedKeys: ComputedRef<readonly unknown[]>
  /** 选中条目数组(按 items 顺序排列;未提供 items 时恒为 [])。 */
  selectedItems: ComputedRef<T[]>
  /** 选中索引数组(升序;未提供 items 时恒为 [])。 */
  selectedIndices: ComputedRef<number[]>
  /** 首个选中索引,无选中为 -1(WinUI ListView.SelectedIndex 语义)。 */
  selectedIndex: ComputedRef<number>
  /** 选中数量。 */
  selectedCount: ComputedRef<number>
  /**
   * 区间锚点索引(最后交互项,初始 -1):shift 区间的起点。handleClick 按 WinUI
   * 规则维护;特殊序列(如键盘方向键移动焦点)可由宿主直接写此 ref。
   */
  anchorIndex: Ref<number>
  /** 条目是否选中(按比较键判定;与是否提供 items 无关)。 */
  isSelected(item: T): boolean
  /** 索引是否选中(需提供 items;越界返回 false)。 */
  isIndexSelected(index: number): boolean
  /** 选中:Single 下替换为该项,Multiple/Extended 追加,None 无操作。 */
  select(target: T | number): void
  /** 取消选中(None 无操作)。 */
  deselect(target: T | number): void
  /** 切换选中态:Single 下等价 select(已选中则保持);Multiple/Extended 下反转。 */
  toggle(target: T | number): void
  /**
   * 追加选中闭区间 [from, to](WinUI ListView 语义:区间选择仅在
   * Multiple/Extended 生效,Single/None 下无操作;不改锚点)。
   * 端点契约:须为界内索引——负数(含负小数)任一端点 → 无操作;正越界终点钳到
   * 末项;界内非整数向零截断(1.9 → 1)。
   */
  selectRange(from: T | number, to: T | number): void
  /** 全选(仅 Multiple/Extended;WinUI SelectAll 同约束)。 */
  selectAll(): void
  /** 清空(任何模式)。 */
  clear(): void
  /** 用给定条目/索引数组整体替换当前选择(None 无操作)。 */
  replaceSelection(targets: readonly (T | number)[]): void
  /**
   * 指针点击入口:对齐 WinUI **ListView** 惯例的模式语义(宿主只透传索引与事件
   * 修饰键;与 ItemsView 的 4 处已知差异清单见 wiki/controls/_collection-infra.md):
   *   Single:点击 → 仅选该项(重复点击保持);
   *   Multiple:点击 → 切换该项;shift+点击 → 追加锚点~本项区间;
   *   Extended:点击 → 仅选该项;ctrl/cmd+点击 → 切换该项;shift+点击 →
   *     用锚点~本项区间**替换**当前选择;
   *   None:忽略。
   * 锚点规则:Single/Extended 的非 shift 点击与 Multiple 的切换点击后锚点 = 本项;
   * Extended 的 shift 点击不改锚点(连续 shift 扩展);无有效锚点时 shift 区间
   * 退化为单选本项(ListView 惯例;ItemsView 对无锚 shift 为 no-op,见 wiki)。
   * 输入契约:非法索引(非有限、越界,含负小数如 -0.5)一律 no-op;在界内的
   * 非整数索引向零截断(2.9 → 2),与 select/toggle 等原语契约一致;
   * selectRange 的区间端点则为截断后钳进合法域(见其 JSDoc)。
   */
  handleClick(index: number, modifiers?: SelectionModifiers): void
}

/**
 * 集合选择模型(纯状态,无 DOM)。
 *
 * @example
 * ```ts
 * const selection = useSelection({
 *   items,                                // Ref<Item[]>
 *   selectionMode: () => props.selectionMode,
 *   keyOf: (item) => item.id,
 * })
 * // 列表项点击:
 * function onItemClick(item: Item, event: MouseEvent) {
 *   selection.handleClick(items.value.indexOf(item), { ctrl: event.ctrlKey, shift: event.shiftKey })
 * }
 * ```
 */
export function useSelection<T = unknown>(options: UseSelectionOptions<T> = {}): UseSelectionReturn<T> {
  const keyOf = options.keyOf ?? ((item: T) => item as unknown)

  /** 选中键集合;只整体替换、不原地改,便于 computed/watch 追踪。 */
  const keySet = shallowRef<ReadonlySet<unknown>>(new Set<unknown>())
  const anchorIndex = ref(-1)

  const selectionMode = computed<SelectionMode>(() => {
    const mode = toValue(options.selectionMode)
    return mode === 'None' || mode === 'Multiple' || mode === 'Extended' ? mode : 'Single'
  })

  const itemsList = computed<readonly T[]>(() => toValue(options.items) ?? [])

  // ---- items 变化:清除列表中已不存在的键(「移除条目即取消选中」),钳制锚点 ----
  watch(itemsList, (list) => {
    const current = keySet.value
    if (current.size > 0) {
      const present = new Set<unknown>()
      for (let index = 0; index < list.length; index++) present.add(keyOf(list[index], index))
      let removed = false
      const next = new Set<unknown>()
      for (const key of current) {
        if (present.has(key)) next.add(key)
        else removed = true
      }
      if (removed) keySet.value = next
    }
    if (anchorIndex.value >= list.length) anchorIndex.value = -1
  })

  function setKeys(next: Set<unknown>): void {
    keySet.value = next
  }

  /**
   * 解析目标为比较键;数字按索引取条目,条目按引用反查索引(keyOf 的 index 参数,未知为 -1)。
   * 输入契约(数字目标):先验原始值边界(非有限、< 0、≥ 列表长度 → invalid),
   * 再向零截断——避免 -0.5 经 trunc 变 -0 后被当作索引 0。
   */
  function resolveKey(target: T | number): { key: unknown; valid: boolean } {
    if (typeof target === 'number') {
      const list = itemsList.value
      if (!(Number.isFinite(target) && target >= 0 && target < list.length)) {
        return { key: undefined, valid: false }
      }
      const index = Math.trunc(target)
      return { key: keyOf(list[index], index), valid: true }
    }
    const index = itemsList.value.indexOf(target)
    return { key: keyOf(target, index), valid: true }
  }

  function contains(target: T | number): boolean {
    const { key } = resolveKey(target)
    return keySet.value.has(key)
  }

  function applySingle(target: T | number): void {
    const { key, valid } = resolveKey(target)
    if (!valid) return
    setKeys(new Set([key]))
  }

  function applyToggle(target: T | number): void {
    const { key, valid } = resolveKey(target)
    if (!valid) return
    if (keySet.value.has(key)) {
      const next = new Set(keySet.value)
      next.delete(key)
      setKeys(next)
    } else {
      const next = new Set(keySet.value)
      next.add(key)
      setKeys(next)
    }
  }

  /**
   * 索引闭区间追加(需 items)。端点已由 selectRange / handleClick 验过界;
   * 此处向零截断 + 钳进合法域仅作兜底(正越界终点钳到末项),不再承担负值语义。
   */
  function addRange(fromIndex: number, toIndex: number): void {
    const list = itemsList.value
    if (!(Number.isFinite(fromIndex) && Number.isFinite(toIndex))) return
    let from = Math.trunc(fromIndex)
    let to = Math.trunc(toIndex)
    if (from > to) [from, to] = [to, from]
    from = Math.max(0, from)
    to = Math.min(list.length - 1, to)
    if (from > to) return
    const next = new Set(keySet.value)
    for (let index = from; index <= to; index++) next.add(keyOf(list[index], index))
    setKeys(next)
  }

  /** 目标解析为索引;数字目标先验原始值(非有限、< 0,含负小数 → -1)再向零截断,规避 -0 陷阱。 */
  function resolveIndex(target: T | number): number {
    if (typeof target === 'number') {
      if (!(Number.isFinite(target) && target >= 0)) return -1
      return Math.trunc(target)
    }
    return itemsList.value.indexOf(target)
  }

  // ---- 双视图(单次扫描共用) ----
  const selectionView = computed<{ items: T[]; indices: number[] }>(() => {
    const current = keySet.value
    const list = itemsList.value
    const items: T[] = []
    const indices: number[] = []
    if (current.size > 0) {
      for (let index = 0; index < list.length; index++) {
        if (current.has(keyOf(list[index], index))) {
          items.push(list[index])
          indices.push(index)
        }
      }
    }
    return { items, indices }
  })

  const selectedItems = computed<T[]>(() => selectionView.value.items)
  const selectedIndices = computed<number[]>(() => selectionView.value.indices)
  const selectedIndex = computed<number>(() => selectionView.value.indices[0] ?? -1)
  const selectedCount = computed<number>(() => keySet.value.size)
  const selectedKeys = computed<readonly unknown[]>(() => Array.from(keySet.value))

  // ---- 选择变化回调(items 引发的自动清除同样触发) ----
  if (options.onSelectionChange) {
    watch(keySet, () => {
      options.onSelectionChange?.(selectedItems.value, [...selectedIndices.value])
    })
  }

  // ---- 原语 ----
  function select(target: T | number): void {
    if (selectionMode.value === 'None') return
    if (selectionMode.value === 'Single') applySingle(target)
    else {
      const { key, valid } = resolveKey(target)
      if (!valid) return
      const next = new Set(keySet.value)
      next.add(key)
      setKeys(next)
    }
  }

  function deselect(target: T | number): void {
    if (selectionMode.value === 'None') return
    const { key, valid } = resolveKey(target)
    if (!valid) return
    if (keySet.value.has(key)) {
      const next = new Set(keySet.value)
      next.delete(key)
      setKeys(next)
    }
  }

  function toggle(target: T | number): void {
    if (selectionMode.value === 'None') return
    if (selectionMode.value === 'Single') {
      if (!contains(target)) applySingle(target)
      return
    }
    applyToggle(target)
  }

  function selectRange(from: T | number, to: T | number): void {
    if (selectionMode.value !== 'Multiple' && selectionMode.value !== 'Extended') return
    const fromIndex = resolveIndex(from)
    const toIndex = resolveIndex(to)
    if (fromIndex < 0 || toIndex < 0) return
    addRange(fromIndex, toIndex)
  }

  function selectAll(): void {
    const mode = selectionMode.value
    if (mode !== 'Multiple' && mode !== 'Extended') return
    const next = new Set<unknown>()
    const list = itemsList.value
    for (let index = 0; index < list.length; index++) next.add(keyOf(list[index]!, index))
    setKeys(next)
  }

  function clear(): void {
    if (keySet.value.size > 0) setKeys(new Set<unknown>())
  }

  function replaceSelection(targets: readonly (T | number)[]): void {
    if (selectionMode.value === 'None') return
    const next = new Set<unknown>()
    for (const target of targets) {
      const { key, valid } = resolveKey(target)
      if (valid) next.add(key)
    }
    setKeys(next)
  }

  // ---- 指针点击入口(WinUI ListView 惯例;与 ItemsView 的差异清单见 wiki) ----
  function handleClick(rawIndex: number, modifiers?: SelectionModifiers): void {
    const mode = selectionMode.value
    if (mode === 'None') return
    const list = itemsList.value
    // 输入契约:先验原始值边界(非有限、< 0、越界 → no-op;注意 trunc(-0.5) = -0
    // 不会被「< 0」拦住,必须先验原始值),再向零截断(2.9 → 2)。
    const index = Number.isFinite(rawIndex) && rawIndex >= 0 && rawIndex < list.length
      ? Math.trunc(rawIndex)
      : -1
    if (index < 0 || index >= list.length) return
    const shift = modifiers?.shift === true
    const ctrl = modifiers?.ctrl === true || modifiers?.meta === true

    if (mode === 'Single') {
      applySingle(index)
      anchorIndex.value = index
      return
    }

    if (mode === 'Multiple') {
      if (shift) {
        const anchor = anchorIndex.value
        if (anchor >= 0 && anchor < list.length) addRange(anchor, index)
        else applyToggle(index)
      } else {
        applyToggle(index)
        anchorIndex.value = index
      }
      return
    }

    // Extended
    if (shift) {
      const anchor = anchorIndex.value
      if (anchor >= 0 && anchor < list.length) {
        const next = new Set<unknown>()
        let from = Math.trunc(anchor)
        let to = index
        if (from > to) [from, to] = [to, from]
        from = Math.max(0, from)
        to = Math.min(list.length - 1, to)
        for (let i = from; i <= to; i++) next.add(keyOf(list[i], i))
        setKeys(next)
      } else {
        applySingle(index)
        anchorIndex.value = index
      }
      // WinUI:shift 扩展不改锚点(以首个交互项为基准连续扩展)
      return
    }
    if (ctrl) {
      applyToggle(index)
      anchorIndex.value = index
      return
    }
    applySingle(index)
    anchorIndex.value = index
  }

  return {
    selectionMode,
    selectedKeys,
    selectedItems,
    selectedIndices,
    selectedIndex,
    selectedCount,
    anchorIndex,
    isSelected: contains,
    isIndexSelected: (index: number): boolean => contains(index),
    select,
    deselect,
    toggle,
    selectRange,
    selectAll,
    clear,
    replaceSelection,
    handleClick,
  }
}
