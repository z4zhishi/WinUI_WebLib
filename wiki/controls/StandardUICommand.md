# StandardUICommand

> 在线示例:[/#/standarduicommand](/#/standarduicommand) · 演示页源码:[demo/pages/StandardUICommandPage.vue](../../demo/pages/StandardUICommandPage.vue)

## 概述

一组内置的 XamlUICommand,代表常用命令(如「保存」「打开」「复制」「粘贴」等),每个 Kind 预填了官方观感的图标、标签、键盘加速键与描述,可在应用内多处复用,并被标准 XAML 控件原生理解。Web 版以「预置命令表 + 工厂函数」实现:`createStandardUICommand(kind, options)` 返回一个可绑定的命令对象(继承 [XamlUICommand](./XamlUICommand.md) 的全部语义),按钮类控件以手动绑定消费它 —— 图标、文本、加速键角标与禁用态全部由命令属性驱动,同一命令对象可同时喂给多个控件(官方示例正是让一条 Delete 命令同时出现在 MenuFlyoutItem、SwipeItem 与 AppBarButton 上)。

官方文档:

- [StandardUICommand - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.input.standarduicommand)
- [Commanding 设计准则(StandardUICommand 一节)](https://learn.microsoft.com/windows/apps/design/controls/commanding#command-experiences-using-the-standarduicommand-class)

## 创建

```ts
import { createStandardUICommand } from '@/utils/standardUiCommands'

const deleteCommand = createStandardUICommand('Delete', {
  // options 全部可省略:省略的属性取该 Kind 的预置值(WinUI SetXxxIfUnset 语义)
  onExecute(_sender, args) {
    // args.parameter 即绑定方传入的 CommandParameter
  },
  onCanExecute(_sender, args) {
    args.canExecute = false // 返回 false 即禁用(默认 true)
  },
})
```

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `kind` | `StandardUICommandKind` | 必填 | 预置类型:`Cut` / `Copy` / `Paste` / `SelectAll` / `Delete` / `Share` / `Save` / `Open` / `Close` / `Pause` / `Play` / `Stop` / `Forward` / `Backward` / `Undo` / `Redo`(与 WinUI 枚举一致;`None` 不预填任何值) |
| `label` | `string` | 随 Kind | 继承自 XamlUICommand;Kind 预填官方文案(en-US 近似,可覆盖) |
| `icon` | `CommandIconSource` | 随 Kind | 继承自 XamlUICommand;Kind 预填 Symbol 图标(WinUI 以 SymbolIconSource 承载) |
| `description` | `string` | 随 Kind | 继承自 XamlUICommand;Kind 预填描述文案 |
| `hotkeys` | `CommandHotkey[]` | 随 Kind | 继承自 XamlUICommand;Kind 预填官方加速键(`Ctrl+C` / `Ctrl+V` / `Del` 等) |
| `acceleratorText` | `string`(只读) | `''` | `hotkeys` 派生的展示文本(如 `Ctrl+S` / `Del`),适合喂给 AppBarButton 的加速键角标 |
| `canExecuteEnabled` | `boolean` | `true` | 简化的 CanExecute 响应式快照(差异见下文);绑定 `:disabled="!cmd.canExecuteEnabled"` |

## 事件与方法

| 成员 | 参数 | 触发时机 |
| --- | --- | --- |
| `execute(parameter?)` | `args: { parameter?: unknown }` | 执行命令 → `onExecute` 回调(WinUI `ExecuteRequested`);不检查可执行性,闸门在宿主控件 |
| `canExecute(parameter?)` | 返回 `boolean` | 现场评估可执行性,每次调用重触发 `onCanExecute`(WinUI 默认 `true`,处理器可改写) |
| `notifyCanExecuteChanged()` | — | 通知消费端重查并重算 `canExecuteEnabled`(WinUI `ICommand.CanExecuteChanged`) |
| `matchesHotkeys(event)` | `event: KeyboardEvent` | 判断键盘事件是否命中 `hotkeys`;本工具不做全局按键监听,由宿主自行接入 |

## 预置命令清单(Kind → 预填值)

对照 `StandardUICommand_Partial.cpp` 的 `PopulateForKind`;图标列为 WinUI `Symbol` 枚举成员,经 `src/utils/symbolIcons.ts` 映射 Segoe 字形渲染。

| Kind | 标签(en) | 图标(Symbol) | 加速键 | 描述(en 近似) |
| --- | --- | --- | --- | --- |
| `Cut` | Cut | Cut | `Ctrl+X` | Remove the selected content and put it on the clipboard |
| `Copy` | Copy | Copy | `Ctrl+C` | Copy the selected content to the clipboard |
| `Paste` | Paste | Paste | `Ctrl+V` | Insert the contents of the clipboard at the current location |
| `SelectAll` | Select all | SelectAll | `Ctrl+A` | Select all content |
| `Delete` | Delete | Delete | `Del` | Delete the selected content |
| `Share` | Share | Share | — | Share the selected content |
| `Save` | Save | Save | `Ctrl+S` | Save the current document |
| `Open` | Open | OpenFile | `Ctrl+O` | Open a file |
| `Close` | Close | Cancel | `Ctrl+W` | Close the current item |
| `Pause` | Pause | Pause | — | Pause the current action |
| `Play` | Play | Play | — | Play the current content |
| `Stop` | Stop | Stop | — | Stop the current action |
| `Forward` | Forward | Forward | — | Move forward |
| `Backward` | Backward | Back | — | Move backward |
| `Undo` | Undo | Undo | `Ctrl+Z` | Reverse the most recent action |
| `Redo` | Redo | Redo | `Ctrl+Y` | Repeat the most recently undone action |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import { createStandardUICommand } from '@/utils/standardUiCommands'

const items = ref(['List item 0', 'List item 1'])

const deleteCommand = createStandardUICommand('Delete', {
  onExecute(_sender, args) {
    if (typeof args.parameter === 'string') {
      items.value = items.value.filter((text) => text !== args.parameter)
    }
  },
})
</script>

<template>
  <!-- 同一条命令驱动两个按钮:图标 / 标签 / Del 角标 / 禁用态全部来自命令 -->
  <WuiAppBarButton
    :label="deleteCommand.label"
    :keyboard-accelerator-text="deleteCommand.acceleratorText"
    :disabled="!deleteCommand.canExecuteEnabled"
    @click="deleteCommand.execute()"
  >
    <template #icon>
      <WuiSymbolIcon :symbol="deleteCommand.icon?.symbol" :font-size="16" />
    </template>
  </WuiAppBarButton>

  <WuiAppBarButton
    :label="deleteCommand.label"
    is-compact
    @click="deleteCommand.execute(items[0])"
  >
    <template #icon>
      <WuiSymbolIcon :symbol="deleteCommand.icon?.symbol" :font-size="16" />
    </template>
  </WuiAppBarButton>
</template>
```

## 与 WinUI 的差异说明

- **CanExecute 模型为响应式简化**:WinUI 是「查询即评估」——每次 `CanExecute(parameter)` 现场触发 `CanExecuteRequested` 事件(默认 `true`),控件经 `CanExecuteChanged` 通知获知需重查;Web 版保留 `canExecute(parameter)` 的现场评估语义,另维护响应式快照 `canExecuteEnabled`(由 `notifyCanExecuteChanged()` 以无参评估重算),按钮直接 `:disabled` 绑定即可,无需手写重查逻辑。
- **文案与本地化**:WinUI 在运行时读取本地化框架资源(`TEXT_COMMAND_LABEL_* / TEXT_COMMAND_DESCRIPTION_* / TEXT_COMMAND_KEYBOARDACCELERATORKEY_*`,资源 ID 5528–5568,参照仓库内无对应 resw,随系统语言变化);本实现硬编码 en-US 近似文案并附 zh 译文 —— 其中 Cut / Copy / Paste / SelectAll / Undo / Redo 的描述与参照仓库 `controls/dev/CommandBarFlyout/Strings/en-us/resources.resw` 逐字一致,其余(Delete / Share / Save / Open / Close / Pause / Play / Stop / Forward / Backward)为近似。
- **Kind 变更不重触发预填**:WinUI 的 `Kind` 是依赖属性,运行时改写会重新 `PopulateForKind`(且仅在应用未覆盖时回填);Web 版 `kind` 在创建期固定,需要换 Kind 就重新调用工厂。
- **`Kind='None'` 的行为差异**:WinUI 中 `None` 命令在进入可视树时报错(`ERROR_STANDARDUICOMMAND_KINDNOTSET`);Web 版返回一条未预填任何值的空命令,不报错。
- **图标仅支持 Symbol 一类**:WinUI 的 `IconSource` 可换任意 IconSource(FontIconSource / PathIconSource / …);Web 版预填固定为 SymbolIconSource 的数据化近似(`{ symbol }`),需要其它图标可在创建后覆盖 `icon`。
- **加速键为纯数据、无全局监听**:与 [AppBarButton](./AppBarButton.md) 同口径 —— 组合键的全局激活属宿主应用行为;命令对象提供 `matchesHotkeys(event)` 供宿主自行接入(演示页清单容器即用它命中 Delete 键)。Delete 键的展示文本按 WinUI 惯例为 `Del`。
- **消费侧为手动绑定**:WinUI 中宿主控件设 `Command` 即自动获得 label / icon / accelerator 外观;Web 版控件库的按钮不内建 `command` 属性,由调用方把命令属性绑到控件属性上(演示页与上文用法即完整形态)。`AccessKey` 与委托子命令(`XamlUICommand.Command` 属性)未实现。

## 互链

- 命令抽象层:[XamlUICommand](./XamlUICommand.md)(本控件即其内置子集)
- 消费端:[AppBarButton](./AppBarButton.md) · [CommandBar](./CommandBar.md) · [MenuFlyout](./MenuFlyout.md)
