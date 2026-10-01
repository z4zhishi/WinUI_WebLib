// WinUI_WebLib — 预置命令表(standardUiCommands.ts)
//
// StandardUICommand 的 Web 复刻:XamlUICommand 的内置子类,按 Kind(Cut/Copy/Paste/…)
// 预填一组默认 UX(label / 图标 / 加速键 / 描述),让同一命令在多个控件间共享观感。
//
// 对照源(只读):
//   - CK/WinUI-Reference/dxaml/xcp/dxaml/lib/StandardUICommand_Partial.cpp:
//     PopulateForKind(kind) → PopulateWithProperties(label, Symbol_*, acceleratorKey,
//     acceleratorModifiers, description),并仅在应用未覆盖时填充(SetLabelIfUnset /
//     SetIconSourceIfUnset / SetKeyboardAcceleratorIfUnset / SetDescriptionIfUnset);
//   - 加速键主键取框架资源 TEXT_COMMAND_KEYBOARDACCELERATORKEY_*(首字符)+ Control 修饰键;
//     Delete 用 VirtualKey_Delete(无修饰键);Share / Pause / Play / Stop / Forward / Backward 无加速键;
//   - 图标为 xaml_controls::Symbol_* 枚举成员,经 src/utils/symbolIcons.ts 映射 Segoe 字形渲染;
//   - 枚举成员与顺序:CK/WinUI-Reference/dxaml/xcp/components/metadata/inc/EnumDefs.g.h
//     (StandardUICommandKind,None=0 … Redo=16)。
//
// 文案差异(见 wiki/controls/StandardUICommand.md):WinUI 在运行时读取本地化框架资源
// (TEXT_COMMAND_LABEL_* / TEXT_COMMAND_DESCRIPTION_*,资源 ID 5528–5568,仓库内无对应
// resw,随系统语言变化);本表硬编码 en-US 近似文案 —— 其中 Cut / Copy / Paste / SelectAll /
// Undo / Redo 的描述与 controls/dev/CommandBarFlyout/Strings/en-us/resources.resw 逐字一致,
// 其余为近似,另附 zh 译文供示例页展示。
//
// 用法:const cmd = createStandardUICommand('Delete', { onExecute(args) { … } })
//       等价 WinUI 的 new StandardUICommand(StandardUICommandKind.Delete)。

import { createCommand, type WuiXamlUICommand, type XamlUICommandOptions } from './uiCommand'
import type { CommandHotkey, CommandIconSource } from './uiCommand'
import type { SymbolValue } from './symbolIcons'

/** WinUI StandardUICommandKind 枚举(EnumDefs.g.h 声明顺序)。 */
export type StandardUICommandKind =
  | 'None'
  | 'Cut'
  | 'Copy'
  | 'Paste'
  | 'SelectAll'
  | 'Delete'
  | 'Share'
  | 'Save'
  | 'Open'
  | 'Close'
  | 'Pause'
  | 'Play'
  | 'Stop'
  | 'Forward'
  | 'Backward'
  | 'Undo'
  | 'Redo'

/** 除 None 外的全部 Kind(PopulateForKind 实际填充预置值的部分)。 */
export const STANDARD_UI_COMMAND_KINDS: readonly Exclude<StandardUICommandKind, 'None'>[] = [
  'Cut',
  'Copy',
  'Paste',
  'SelectAll',
  'Delete',
  'Share',
  'Save',
  'Open',
  'Close',
  'Pause',
  'Play',
  'Stop',
  'Forward',
  'Backward',
  'Undo',
  'Redo',
]

/** 一个 Kind 的预置 UX 四元组(label / 图标 / 加速键 / 描述,另附 zh 译文)。 */
export interface StandardUICommandDef {
  /** WinUI StandardUICommandKind 成员名。 */
  kind: Exclude<StandardUICommandKind, 'None'>
  /** 默认标签(WinUI 运行时取本地化资源;此处为 en-US 近似)。 */
  label: string
  /** 默认标签的中文近似译文(WinUI 随系统语言本地化,此处仅供示例页展示)。 */
  labelZh: string
  /** 默认图标(WinUI SymbolIconSource 的 Symbol 枚举成员)。 */
  symbol: SymbolValue
  /** 默认键盘加速键;无加速键为空数组。 */
  hotkeys: readonly CommandHotkey[]
  /** 默认描述(en-US 近似,见文件头「文案差异」)。 */
  description: string
  /** 默认描述的中文近似译文。 */
  descriptionZh: string
}

const CTRL = (key: string): CommandHotkey => ({ key, modifiers: ['control'] })

/** 预置命令表(对照 StandardUICommand_Partial.cpp 的 PopulateForKind 各分支)。 */
export const STANDARD_UI_COMMAND_DEFS: Record<
  Exclude<StandardUICommandKind, 'None'>,
  StandardUICommandDef
> = {
  Cut: {
    kind: 'Cut',
    label: 'Cut',
    labelZh: '剪切',
    symbol: 'Cut',
    hotkeys: [CTRL('x')],
    description: 'Remove the selected content and put it on the clipboard',
    descriptionZh: '移除所选内容并将其放入剪贴板',
  },
  Copy: {
    kind: 'Copy',
    label: 'Copy',
    labelZh: '复制',
    symbol: 'Copy',
    hotkeys: [CTRL('c')],
    description: 'Copy the selected content to the clipboard',
    descriptionZh: '将所选内容复制到剪贴板',
  },
  Paste: {
    kind: 'Paste',
    label: 'Paste',
    labelZh: '粘贴',
    symbol: 'Paste',
    hotkeys: [CTRL('v')],
    description: 'Insert the contents of the clipboard at the current location',
    descriptionZh: '在当前位置插入剪贴板内容',
  },
  SelectAll: {
    kind: 'SelectAll',
    label: 'Select All',
    labelZh: '全选',
    symbol: 'SelectAll',
    hotkeys: [CTRL('a')],
    description: 'Select all content',
    descriptionZh: '选择全部内容',
  },
  Delete: {
    kind: 'Delete',
    label: 'Delete',
    labelZh: '删除',
    symbol: 'Delete',
    // VirtualKey_Delete,无修饰键;加速键展示文本为 'Del'
    hotkeys: [{ key: 'delete' }],
    description: 'Delete the selected content',
    descriptionZh: '删除所选内容',
  },
  Share: {
    kind: 'Share',
    label: 'Share',
    labelZh: '共享',
    symbol: 'Share',
    hotkeys: [],
    description: 'Share the selected content',
    descriptionZh: '共享所选内容',
  },
  Save: {
    kind: 'Save',
    label: 'Save',
    labelZh: '保存',
    symbol: 'Save',
    hotkeys: [CTRL('s')],
    description: 'Save the current document',
    descriptionZh: '保存当前文档',
  },
  Open: {
    kind: 'Open',
    label: 'Open',
    labelZh: '打开',
    // Symbol_OpenFile(StandardUICommand_Partial.cpp L153)
    symbol: 'OpenFile',
    hotkeys: [CTRL('o')],
    description: 'Open a file',
    descriptionZh: '打开文件',
  },
  Close: {
    kind: 'Close',
    label: 'Close',
    labelZh: '关闭',
    // Symbol_Cancel(StandardUICommand_Partial.cpp L162)
    symbol: 'Cancel',
    hotkeys: [CTRL('w')],
    description: 'Close the current item',
    descriptionZh: '关闭当前项',
  },
  Pause: {
    kind: 'Pause',
    label: 'Pause',
    labelZh: '暂停',
    symbol: 'Pause',
    hotkeys: [],
    description: 'Pause the current action',
    descriptionZh: '暂停当前操作',
  },
  Play: {
    kind: 'Play',
    label: 'Play',
    labelZh: '播放',
    symbol: 'Play',
    hotkeys: [],
    description: 'Play the current content',
    descriptionZh: '播放当前内容',
  },
  Stop: {
    kind: 'Stop',
    label: 'Stop',
    labelZh: '停止',
    symbol: 'Stop',
    hotkeys: [],
    description: 'Stop the current action',
    descriptionZh: '停止当前操作',
  },
  Forward: {
    kind: 'Forward',
    label: 'Forward',
    labelZh: '前进',
    symbol: 'Forward',
    hotkeys: [],
    description: 'Move forward',
    descriptionZh: '向前移动',
  },
  Backward: {
    kind: 'Backward',
    label: 'Backward',
    labelZh: '后退',
    // Symbol_Back(StandardUICommand_Partial.cpp L207)
    symbol: 'Back',
    hotkeys: [],
    description: 'Move backward',
    descriptionZh: '向后移动',
  },
  Undo: {
    kind: 'Undo',
    label: 'Undo',
    labelZh: '撤消',
    symbol: 'Undo',
    hotkeys: [CTRL('z')],
    description: 'Reverse the most recent action',
    descriptionZh: '撤消最近的操作',
  },
  Redo: {
    kind: 'Redo',
    label: 'Redo',
    labelZh: '重做',
    symbol: 'Redo',
    hotkeys: [CTRL('y')],
    description: 'Repeat the most recently undone action',
    descriptionZh: '重复最近撤消的操作',
  },
}

/** 取一个 Kind 的预置定义;'None'(或未知名)返回 undefined(PopulateForKind(None) 为空操作)。 */
export function getStandardUICommandDef(
  kind: StandardUICommandKind,
): StandardUICommandDef | undefined {
  if (kind === 'None') return undefined
  return STANDARD_UI_COMMAND_DEFS[kind]
}

/**
 * 创建一个 StandardUICommand 式命令对象(WinUI `new StandardUICommand(kind)` 的工厂近似)。
 *
 * 预填语义与 WinUI 的 SetXxxIfUnset 一致:options 里显式给出的 label / icon / description /
 * hotkeys 优先,未给出的部分取该 Kind 的预置值;onExecute / onCanExecute 原样透传给
 * createCommand。Kind='None' 时不预填任何值(WinUI 中该 Kind 在进入可视树时报错,见
 * StandardUICommand_Partial.cpp EnterImpl 的 ERROR_STANDARDUICOMMAND_KINDNOTSET)。
 */
export function createStandardUICommand(
  kind: StandardUICommandKind,
  options: XamlUICommandOptions = {},
): WuiXamlUICommand {
  const def = getStandardUICommandDef(kind)
  const presetIcon: CommandIconSource | undefined = def ? { symbol: def.symbol } : undefined
  return createCommand({
    label: options.label ?? def?.label,
    icon: options.icon ?? presetIcon,
    description: options.description ?? def?.description,
    hotkeys: options.hotkeys ?? def?.hotkeys,
    onExecute: options.onExecute,
    onCanExecute: options.onCanExecute,
  })
}
