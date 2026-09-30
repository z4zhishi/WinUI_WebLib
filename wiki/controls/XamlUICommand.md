# XamlUICommand

> 在线示例:[/#/xamluicommand](/#/xamluicommand) · 演示页源码:[demo/pages/XamlUICommandPage.vue](../../demo/pages/XamlUICommandPage.vue)

## 概述

一个用于定义命令观感的**非视觉对象**:把标签、图标、键盘加速键、描述与执行语义收拢为一个可复用对象,并被标准 XAML 控件原生理解 —— 官方示例在 XAML 资源中声明一条命令,AppBarButton 只设 `Command` 即自动获得全部外观。Web 版以工厂函数实现:`createCommand({ label, icon, description, hotkeys, onExecute, onCanExecute })` 返回一个经 `reactive()` 包装的命令对象,调用方把它**手动绑定**到按钮类控件上(图标 / 文本 / 加速键角标 / 禁用态均由命令属性驱动);命令属性的后续改写会即时刷新所有绑定它的按钮。[StandardUICommand](./StandardUICommand.md) 即本抽象的内置预置子集。

官方文档:

- [XamlUICommand - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.input.xamluicommand)
- [Commanding 设计准则(XamlUICommand 一节)](https://learn.microsoft.com/windows/apps/design/controls/commanding#command-experiences-using-the-xamluicommand-class)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `label` | `string` | `''` | 命令标签(WinUI `Label`);宿主按钮取为显示文本,reactive 属性,可直接赋值 |
| `icon` | `CommandIconSource` | `undefined` | 命令图标(WinUI `IconSource` 的数据化近似):`symbol`(SymbolIconSource)/ `glyph` + `fontFamily`(FontIconSource)/ `data` + `viewBox`(PathIconSource),渲染时按 symbol → glyph → data 取第一个命中项 |
| `description` | `string` | `''` | 命令描述(WinUI `Description`);适合喂给按钮 `title` / 工具提示 |
| `hotkeys` | `CommandHotkey[]` | `[]` | 键盘加速键(WinUI `KeyboardAccelerators`):`{ key, modifiers? }`,`modifiers` 取 `control / menu / shift / windows`(VirtualKeyModifiers 子集) |
| `acceleratorText` | `string`(只读) | `''` | `hotkeys` 派生的展示文本(如 `Ctrl+D` / `Del`),适合喂给 AppBarButton 的 `keyboardAcceleratorText` 角标 |
| `canExecuteEnabled` | `boolean` | `true` | 简化的 CanExecute 响应式快照(差异见下文);绑定 `:disabled="!cmd.canExecuteEnabled"` |
| `accessKey` / `command` | — | 未实现 | WinUI `AccessKey` 与委托子命令(`Command` 属性)未实现,见差异节 |

## 事件与方法

| 成员 | 参数 | 触发时机 |
| --- | --- | --- |
| `execute(parameter?)` | `args: { parameter?: unknown }` | 执行命令 → `onExecute` 回调(WinUI `ExecuteRequested`,参数即 `CommandParameter`);不检查可执行性,闸门在宿主控件 |
| `canExecute(parameter?)` | 返回 `boolean` | 现场评估可执行性:每次调用重触发 `onCanExecute`,处理器可改写 `args.canExecute`(WinUI 默认 `true`) |
| `notifyCanExecuteChanged()` | — | 通知消费端重查并重算 `canExecuteEnabled`(WinUI `ICommand.CanExecuteChanged` + `NotifyCanExecuteChanged`) |
| `matchesHotkeys(event)` | `event: KeyboardEvent` | 判断键盘事件是否命中 `hotkeys`(修饰键严格比对);本工具不做全局按键监听,由宿主自行接入 |

## WinUI API ↔ Web 版对照

| WinUI(XamlUICommand) | Web 版 |
| --- | --- |
| `Label` / `IconSource` / `Description` / `KeyboardAccelerators` | `label` / `icon` / `description` / `hotkeys`(reactive 属性,可写) |
| `ExecuteRequested` 事件 | `createCommand({ onExecute })` 回调 |
| `CanExecuteRequested` 事件(`CanExecute` 默认 `true`) | `createCommand({ onCanExecute })` 回调 |
| `CanExecuteChanged` 事件 + `NotifyCanExecuteChanged()` | `canExecuteEnabled` 快照 + `notifyCanExecuteChanged()`(响应式简化) |
| `ICommand.Execute` / `ICommand.CanExecute` | `cmd.execute()` / `cmd.canExecute()` |
| `AccessKey`、`Command`(委托子命令) | 未实现 |

## 基础用法

```vue
<script setup lang="ts">
import WuiAppBarButton from '@/components/AppBarButton.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import { createCommand } from '@/utils/uiCommand'

const customCommand = createCommand({
  label: 'Custom XamlUICommand',
  icon: { symbol: 'Favorite' },
  description: 'This is a custom command',
  hotkeys: [{ key: 'd', modifiers: ['control'] }],
  onExecute(_sender, args) {
    console.log('fired', args.parameter)
  },
})

// 命令属性可运行时改写,绑定它的按钮即时刷新:
// customCommand.label = '另存为'; customCommand.notifyCanExecuteChanged()
</script>

<template>
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
  </WuiAppBarButton>
</template>
```

## 与 WinUI 的差异说明

- **CanExecute 模型为响应式简化**:WinUI 是「查询即评估」——`CanExecuteImpl` 每次构造 `CanExecuteRequestedEventArgs`(默认 `put_CanExecute(TRUE)`)现场 raise 事件,控件监听 `CanExecuteChanged` 获知需重查;Web 版 `canExecute(parameter)` 保留现场评估语义,另以无参评估维护响应式快照 `canExecuteEnabled`,`notifyCanExecuteChanged()` 负责重算并相当于 WinUI 的通知。带参评估与快照可能不一致属预期(WinUI 中带参 `CanExecute` 本就允许按 parameter 返回不同结果)。
- **事件为单一回调**:WinUI 的 `ExecuteRequested` / `CanExecuteRequested` / `CanExecuteChanged` 均为多播事件(`add_/remove_`);Web 版为创建期传入的单一回调,同一命令的多个监听方需在回调内自行分发。`ExecuteRequestedEventArgs.Handled` 属 XAML 路由语义,Web 版不提供。
- **`execute()` 不做 CanExecute 闸门**:与 WinUI `ICommand.Execute` 一致 —— 可执行性检查在宿主控件(按钮 disabled 即闸门),命令本体只负责触发。
- **加速键为纯数据、无全局监听**:WinUI 的 `KeyboardAccelerator` 由框架全局监听组合键;Web 版只保留 `hotkeys` 数据(展示文本 `acceleratorText` + `matchesHotkeys(event)` 查询),组合键监听属宿主应用行为(演示页以 AppBarButton 角标展示 `Ctrl+D`,未自动注册按键)。
- **`AccessKey` 与委托子命令未实现**:WinUI 的 `AccessKey`(访问键)与 `Command` 属性(把执行/查询委托给另一 ICommand,`canExecute` 取两者与)未实现;需要委托语义时在 `onExecute` / `onCanExecute` 回调内手动转调另一命令。
- **IconSource 为数据化近似**:WinUI `IconSource` 是带视觉树的对象体系;Web 版为可序列化数据(`symbol` / `glyph` / `data` 三类),由消费端选择渲染方式。官方示例的 `SymbolIconSource(Symbol=Favorite)` 对应 `{ symbol: 'Favorite' }`。
- **消费侧为手动绑定**:WinUI 中宿主控件设 `Command` 属性即自动消费命令外观;Web 版按钮控件不内建 `command` 属性,由调用方绑定(演示页与上文用法即完整形态)。若后续引入组合式/指令(如 `bindCommand`),可在不改动本工厂的前提下叠加。

## 互链

- 预置子集:[StandardUICommand](./StandardUICommand.md)(内置 Kind 命令表)
- 消费端:[AppBarButton](./AppBarButton.md) · [Button](./Button.md) · [CommandBar](./CommandBar.md)
