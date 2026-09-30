// WinUI_WebLib — 命令抽象层(uiCommand.ts)
//
// XamlUICommand 的 Web 复刻:非视觉命令对象,把一条命令的 UX(图标 / 标签 / 描述 /
// 键盘加速键)与执行语义(execute)收拢成一个可复用、可绑定的对象,供按钮类控件
// (AppBarButton / Button / MenuFlyoutItem 等)消费 —— 对应 WinUI「命令体验」分层中的
// 命令源一侧。
//
// API 对照源(只读):
//   - CK/WinUI-Reference/dxaml/xcp/dxaml/lib/XamlUICommand_Partial.cpp:
//     CanExecute 默认 TRUE(put_CanExecute(TRUE) 后由 CanExecuteRequested 处理器改写);
//     Execute → 触发 ExecuteRequested(无 CanExecute 闸门,闸门在命令宿主控件一侧);
//     NotifyCanExecuteChanged → raise CanExecuteChanged(通知消费端重新查询)。
//   - CK/WinUI-Reference/dxaml/xcp/dxaml/lib/winrtgeneratedclasses/XamlUICommand.g.h:
//     属性面 Label / IconSource / Description / KeyboardAccelerators / AccessKey / Command。
//   - 官方示例:CK/WinUI-Gallery/WinUIGallery/Samples/XamlUICommand/(资源中定义命令,
//     AppBarButton 仅设 Command 即获得全部外观)。
//
// 简化声明(详见 wiki/controls/XamlUICommand.md「与 WinUI 的差异」):
//   1. CanExecute 模型:WinUI 是「查询即评估」——每次 CanExecute(parameter) 现场触发
//      CanExecuteRequested 事件,消费端经 CanExecuteChanged 获知需要重查;本实现保留
//      canExecute(parameter) 的现场评估语义,另维护一个响应式快照 canExecuteEnabled
//      (由 notifyCanExecuteChanged() 重算),按钮可直接 :disabled="!cmd.canExecuteEnabled"。
//   2. 事件模型:WinUI 为多播事件(add_/remove_);本实现为创建期传入的单一回调。
//   3. AccessKey 与 Command(委托子命令)未实现;KeyboardAccelerators 为纯数据
//      (展示文本 + matchesHotkeys 查询),不做全局按键监听 —— 加速键的全局激活
//      属宿主应用行为(AppBarButton.vue 头注同口径)。
//
// 约束:不引入第三方依赖;仅依赖 vue 的 reactive 与 src/utils/symbolIcons 的类型。

import { reactive } from 'vue'
import type { SymbolValue } from './symbolIcons'

/** WinUI VirtualKeyModifiers 的命名子集(KeyboardAccelerator.Modifiers)。 */
export type HotkeyModifier = 'control' | 'menu' | 'shift' | 'windows'

/** 键盘加速键的数据化近似(WinUI KeyboardAccelerator = { Key, Modifiers })。 */
export interface CommandHotkey {
  /** 主键:单字符(不区分大小写)或功能键名(如 'Delete' / 'Enter' / 'F5')。 */
  key: string
  /** 修饰键;缺省视为无修饰键(WinUI VirtualKeyModifiers.None)。 */
  modifiers?: readonly HotkeyModifier[]
}

/**
 * IconSource 的数据化近似(仅保留可序列化的三类:SymbolIconSource / FontIconSource /
 * PathIconSource;BitmapIconSource 与 ImageIconSource 不入命令面)。渲染时按键优先级
 * symbol → glyph → data 取第一个命中项。
 */
export interface CommandIconSource {
  /** SymbolIconSource:WinUI Symbol 枚举成员名(src/utils/symbolIcons.ts 的 SymbolValue)。 */
  symbol?: SymbolValue
  /** FontIconSource:字形码点(如 '&#xE72C;' 的字面字符)。 */
  glyph?: string
  /** FontIconSource:字体族;缺省用 SymbolIcon 的 Segoe 系字体 token。 */
  fontFamily?: string
  /** PathIconSource:路径 Data 串。 */
  data?: string
  /** PathIconSource:视图盒(如 '0 0 24 24')。 */
  viewBox?: string
}

/** ExecuteRequested 事件参数(WinUI ExecuteRequestedEventArgs 的 Parameter;Handled 属 XAML 路由语义,Web 版无)。 */
export interface ExecuteRequestedArgs {
  /** Execute(parameter) 传入的命令参数(WinUI CommandParameter)。 */
  parameter?: unknown
}

/**
 * CanExecuteRequested 事件参数(WinUI CanExecuteRequestedEventArgs)。
 * 处理器把 canExecute 置 false 即可禁用命令(WinUI 默认 TRUE,见文件头对照源)。
 */
export interface CanExecuteRequestedArgs {
  parameter?: unknown
  canExecute: boolean
}

export interface XamlUICommandOptions {
  /** 命令标签(WinUI Label):按钮类宿主把它取为显示文本。 */
  label?: string
  /** 命令图标(WinUI IconSource 的数据化近似)。 */
  icon?: CommandIconSource
  /** 命令描述(WinUI Description):供工具提示 / 无障碍注记。 */
  description?: string
  /** 键盘加速键(WinUI KeyboardAccelerators)。 */
  hotkeys?: readonly CommandHotkey[]
  /** 执行回调(WinUI ExecuteRequested 事件的单一近似)。 */
  onExecute?: (sender: WuiXamlUICommand, args: ExecuteRequestedArgs) => void
  /** 可执行回调(WinUI CanExecuteRequested 事件的单一近似;缺省恒可执行)。 */
  onCanExecute?: (sender: WuiXamlUICommand, args: CanExecuteRequestedArgs) => void
}

/**
 * 可绑定命令对象(WuiXamlUICommand)。经 reactive() 包装返回:模板里直接绑定
 * label / icon / acceleratorText / canExecuteEnabled 即获得响应式外观驱动。
 */
export interface WuiXamlUICommand {
  /** 命令标签(WinUI Label)。 */
  label: string
  /** 命令图标(WinUI IconSource 的数据化近似);未设置时为 undefined。 */
  icon: CommandIconSource | undefined
  /** 命令描述(WinUI Description)。 */
  description: string
  /** 键盘加速键(WinUI KeyboardAccelerators)。 */
  hotkeys: readonly CommandHotkey[]
  /**
   * 加速键展示文本(如 'Ctrl+S' / 'Del';无加速键为空串)。
   * 对应 AppBarButton.KeyboardAcceleratorTextOverride 的推荐取值来源。
   */
  readonly acceleratorText: string
  /**
   * 简化的 CanExecute 响应式快照:最近一次无参评估的结果,按钮绑定
   * :disabled="!cmd.canExecuteEnabled" 即可。由 notifyCanExecuteChanged() 重算。
   */
  canExecuteEnabled: boolean
  /** 执行命令(WinUI ICommand.Execute → ExecuteRequested)。不检查可执行性(与 WinUI 一致,闸门在宿主控件)。 */
  execute(parameter?: unknown): void
  /** 现场评估可执行性(WinUI ICommand.CanExecute:每次调用都重新触发 onCanExecute)。 */
  canExecute(parameter?: unknown): boolean
  /** 通知消费端重查(WinUI ICommand.CanExecuteChanged);本实现同时重算 canExecuteEnabled 快照。 */
  notifyCanExecuteChanged(): void
  /** 判断键盘事件是否命中任一 hotkey(供宿主自行接入按键监听;本工具不主动监听)。 */
  matchesHotkeys(event: KeyboardEvent): boolean
}

// —— 加速键展示文本(近似 WinUI KeyboardAccelerator 的默认转换)——
const MODIFIER_ORDER: readonly HotkeyModifier[] = ['control', 'menu', 'shift', 'windows']

const MODIFIER_TEXT: Record<HotkeyModifier, string> = {
  control: 'Ctrl',
  menu: 'Alt',
  shift: 'Shift',
  windows: 'Win',
}

/** 功能键在加速键文本中的展示名(WinUI 对 VirtualKey 的默认缩写,小写键名 → 展示名)。 */
const SPECIAL_KEY_TEXT: Record<string, string> = {
  backspace: 'Backspace',
  delete: 'Del',
  enter: 'Enter',
  escape: 'Esc',
  space: 'Space',
  tab: 'Tab',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  home: 'Home',
  end: 'End',
  pageup: 'Page Up',
  pagedown: 'Page Down',
  f1: 'F1', f2: 'F2', f3: 'F3', f4: 'F4', f5: 'F5',
  f6: 'F6', f7: 'F7', f8: 'F8', f9: 'F9', f10: 'F10',
  f11: 'F11', f12: 'F12',
}

/** 单个加速键 → 展示文本('x'+Ctrl → 'Ctrl+X' 风格:修饰键在前,主键在后)。 */
function hotkeyToText(hotkey: CommandHotkey): string {
  const keyLower = hotkey.key.toLowerCase()
  // 单字符键按 WinUI VirtualKey 名称惯例转大写(Ctrl+S / Ctrl+X);
  // 功能键查 SPECIAL_KEY_TEXT,其余(如 F 键外的多字符名)首字母大写兜底。
  let keyText: string
  if (keyLower.length === 1) {
    keyText = keyLower.toUpperCase()
  } else if (SPECIAL_KEY_TEXT[keyLower] !== undefined) {
    keyText = SPECIAL_KEY_TEXT[keyLower]!
  } else {
    keyText = hotkey.key.charAt(0).toUpperCase() + hotkey.key.slice(1)
  }
  const modifiers = MODIFIER_ORDER.filter((m) => hotkey.modifiers?.includes(m))
  return [...modifiers.map((m) => MODIFIER_TEXT[m]), keyText].join('+')
}

/** 归一化修饰键集合为 KeyboardEvent 的布尔面。 */
function modifierFlags(modifiers: readonly HotkeyModifier[] | undefined): {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
} {
  return {
    ctrl: modifiers?.includes('control') ?? false,
    alt: modifiers?.includes('menu') ?? false,
    shift: modifiers?.includes('shift') ?? false,
    meta: modifiers?.includes('windows') ?? false,
  }
}

/**
 * 创建一个 XamlUICommand 式命令对象(WinUI `new XamlUICommand()` / XAML 资源声明的工厂近似)。
 * 返回值经 reactive() 包装:后续对 label / icon / description / hotkeys 的直接赋值
 * 会即时驱动绑定它的按钮外观。
 */
export function createCommand(options: XamlUICommandOptions = {}): WuiXamlUICommand {
  const { onExecute, onCanExecute } = options

  const command = reactive<WuiXamlUICommand>({
    label: options.label ?? '',
    icon: options.icon,
    description: options.description ?? '',
    hotkeys: options.hotkeys ?? [],

    get acceleratorText(): string {
      return command.hotkeys.map((hotkey) => hotkeyToText(hotkey)).join(' ')
    },

    canExecuteEnabled: true,

    execute(parameter?: unknown): void {
      // WinUI ExecuteImpl:构造参数 → raise ExecuteRequested;无 CanExecute 闸门
      // (XamlUICommand_Partial.cpp ExecuteImpl),禁用态由宿主控件经 CanExecute 保证。
      if (onExecute) onExecute(command, { parameter })
    },

    canExecute(parameter?: unknown): boolean {
      // WinUI CanExecuteImpl:CanExecute 默认 TRUE,处理器可改写(put_CanExecute(TRUE) 先行)。
      const args: CanExecuteRequestedArgs = { parameter, canExecute: true }
      if (onCanExecute) onCanExecute(command, args)
      return args.canExecute
    },

    notifyCanExecuteChanged(): void {
      // WinUI NotifyCanExecuteChangedImpl 只 raise CanExecuteChanged,消费端自行重查;
      // 本实现的简化模型里由命令自身重算无参快照(见文件头「简化声明」1)。
      command.canExecuteEnabled = command.canExecute()
    },

    matchesHotkeys(event: KeyboardEvent): boolean {
      return command.hotkeys.some((hotkey) => {
        const flags = modifierFlags(hotkey.modifiers)
        if (event.ctrlKey !== flags.ctrl || event.altKey !== flags.alt) return false
        if (event.shiftKey !== flags.shift || event.metaKey !== flags.meta) return false
        return event.key.toLowerCase() === hotkey.key.toLowerCase()
      })
    },
  })

  // 初始快照:onCanExecute 存在时以无参评估结果为准(缺省恒可执行)。
  command.notifyCanExecuteChanged()

  return command
}
