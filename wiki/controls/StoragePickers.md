# StoragePickers

> 🌐 **Web 替代示例**:StoragePickers 不是可视化控件 —— WinUI 版演示的是**系统文件选择器编程**(FileOpenPicker 单选/多选文件、FileSavePicker 保存文件、FolderPicker 选择文件夹、文件缩略图)。Web 版不移植 WinUI 控件语义,改用浏览器 **File System Access API**(`showOpenFilePicker` / `showSaveFilePicker` / `showDirectoryPicker`)与 `<input type="file">` / `<a download>` 降级提供等价交互演示。
>
> 在线示例:[/#/storagepickers](/#/storagepickers)

## 概述

使用现代系统选择器让用户以安全的方式选择文件与文件夹:打开单/多文件、保存文本文件、选择文件夹,并展示文件信息(名/类型/大小)与内容读取(Web 版:浏览器沙箱内的等价子集)。WinUI 侧入口是 `Microsoft.Windows.Storage.Pickers` 命名空间(WinAppSDK 1.7+ 的新实现,替代 `Windows.Storage.Pickers`);Web 侧入口是 `window.showOpenFilePicker` / `showSaveFilePicker` / `showDirectoryPicker`(File System Access API),不支持时降级为 `<input type="file">`(读)与 Blob + `<a download>`(写)。

官方文档与参考资料:

- [FileOpenPicker - API(Microsoft.Windows.Storage.Pickers)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.storage.pickers.fileopenpicker)
- [FileSavePicker - API(Microsoft.Windows.Storage.Pickers)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.storage.pickers.filesavepicker)
- [FolderPicker - API(Microsoft.Windows.Storage.Pickers)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.storage.pickers.folderpicker)
- [File System Access API - MDN](https://developer.mozilla.org/docs/Web/API/File_System_API)
- [Window.showOpenFilePicker() - MDN](https://developer.mozilla.org/docs/Web/API/Window/showOpenFilePicker)
- [`<input type="file">` - MDN](https://developer.mozilla.org/docs/Web/HTML/Element/input/file)

相关页面:[Clipboard](./Clipboard.md)(同为系统资源访问的 🌐 Web 替代示例)。

## WinUI Storage Pickers ↔ Web File System Access API 对照表

| WinUI | Web | 说明 |
| --- | --- | --- |
| `FileOpenPicker.PickSingleFileAsync()` | `window.showOpenFilePicker({ multiple: false })` + `handle.getFile()` | Web 返回句柄数组,取消抛 `AbortError`(WinUI 返回 `null`) |
| `FileOpenPicker.PickMultipleFilesAsync()` | `showOpenFilePicker({ multiple: true })` | 同上;逐个 `getFile()` 取 `File` |
| `FileOpenPicker.FileTypeFilter`(`.txt` / `*`) | `options.types: [{ accept: { 'text/plain': ['.txt'] } }]` | Web 的 accept 映射是 MIME → 扩展名;`*` 直接省略 `types`(保留「全部文件」项) |
| `FileSavePicker.PickSaveFileAsync()` | `window.showSaveFilePicker(...)` | 返回可写句柄;取消抛 `AbortError` |
| `FileSavePicker.FileTypeChoices` | `options.types`(至少一项,否则省略) | 官方要求至少一项扩展组;Web 省略 `types` 即「全部文件」 |
| `FileSavePicker.DefaultFileExtension` | `types` 首项 / `suggestedName` 的扩展名 | Web 无独立属性,由 `suggestedName` 与 `types` 共同决定 |
| `FileSavePicker.SuggestedFileName` | `options.suggestedName` | 语义一致(仅建议,用户可改名) |
| `File.WriteAllTextAsync(path, content)` | `handle.createWritable()` → `write()` → `close()` | `close()` 后原子替换原文件;对应官方「保存后写入文本」 |
| `FolderPicker.PickSingleFolderAsync()` | `window.showDirectoryPicker({ mode: 'read' })` | `mode: 'readwrite'` 是 Web 特有的写权限档位(WinUI 选文件夹不涉及) |
| `StorageFolder.GetItemsAsync()` | `dirHandle.values()`(异步迭代) | `entry.kind` 区分文件/文件夹;文件子项 `getFile()` 取元数据 |
| `FileIO.ReadTextAsync(file)` | `file.text()`(大文件 `file.slice().text()`) | `File` 本身即可读,无需再经句柄 |
| `StorageFile.Name / FileType / Size` | `File.name / type / size / lastModified` | `File.type` 是 MIME(WinUI 是扩展名);无路径(见下文安全模型) |
| `GetThumbnailAsync(ThumbnailMode, size)` | **无系统缩略图**;图像文件用 `URL.createObjectURL` / `createImageBitmap` 自行生成 | Web 无系统缩略图管道,也没有 ThumbnailMode 档位(仅能整图解码) |
| `StorageFile.Path`(完整路径) | **无对应**:`File.name` 只有文件名 | 路径是 Web 安全模型的边界(见下文) |
| `PickerLocationId.SuggestedStartLocation` | **无对应** | 浏览器自动记住上次选择位置 —— 官方示例顶部 InfoBar 描述的行为在 Web 上是默认 |
| `PickerViewMode`(List / Thumbnail) | **无对应** | 选择器 UI 由浏览器 / 操作系统渲染,页面不可控制 |
| `CommitButtonText` | **无对应** | 确认按钮文案由浏览器本地化 |
| `FileSavePicker.SuggestedFolder` | **无对应** | 页面不能向系统建议任何路径 |
| 取消选择(返回 `null`) | `Promise` 拒绝并抛 `DOMException('AbortError')` | Web 用 try/catch 区分「取消」与「失败」;`<input type="file">` 降级通路以 `cancel` 事件反馈取消(Chrome 113+ / Firefox 91+ / Safari 16+) |

## 能力差异要点

- **打开/保存(读 + 写)**:Web 的 `showOpenFilePicker` / `showSaveFilePicker` 覆盖官方三个 picker 中两个的主体能力;写文件必须经 `createWritable()`,不能像 WinUI 一样拿到路径后用任意 IO 库直写。
- **文件夹**:`showDirectoryPicker` 支持,但**授权覆盖整棵子树**(枚举、读取都经同一句柄);WinUI 的 FolderPicker 只返回一个文件夹引用。
- **无系统缩略图**:官方 FileThumbnail 示例依赖 Windows 缩略图缓存(任意文件的系统级预览);Web 只能对图像类型自行解码预览,其余类型无预览。
- **无持久授权(标准层面)**:WinUI 选择一次即可在应用生命周期内按路径访问;Web 的授权绑定页面会话,页面刷新后需重新选择。Chrome 系支持把句柄存入 IndexedDB 并用 `queryPermission()` / `requestPermission()` 重新请求(非标准扩展);Safari / Firefox 无对应。
- **无选择器定制**:起始位置、视图模式、确认按钮文案、建议路径全部不可控 —— 选择器是浏览器的 UI,不是页面的。

## 安全模型(两端的根本差异)

WinUI:**用户通过 picker 显式选择 = 授权**。应用拿到 `StorageFile` / `StorageFolder` 引用与**完整路径**,之后可用任意 IO API 直接访问;选择结果对应用长期有效,文件夹选择隐含覆盖其子项。无需声明任何能力(除非需要绕过 picker 的 `broadFileSystemAccess`)。

Web:**沙箱 + 逐会话授权**。三条硬边界:

1. **路径不可见**:页面只能拿到文件名(`File.name`)与内容,拿不到完整路径 —— 「`StorageFile.Path` 无对应」不是 API 缺口,而是安全模型的设计边界。
2. **用户手势 + 逐次授权**:三大 picker 方法都要求 user activation(不能页面加载时静默弹出);授权只覆盖用户当次选中的条目,绑定「页面源 + 句柄」。
3. **原子写入**:`createWritable()` 先写临时文件,`close()` 时原子替换 —— 页面无法截断或破坏原文件(中途放弃则原样保留)。

失败语义对照:权限/手势不足 → `NotAllowedError`;非安全上下文或跨域 iframe → 方法不存在或 `SecurityError`;用户关闭选择器 → `AbortError`(对应 WinUI 的返回 `null`,本页按「已取消」提示而非错误)。

## 基础用法

```ts
// 打开单个文件(需用户手势触发;Chrome/Edge 86+;Safari 与 Firefox 均未实现,自动降级)
const [handle] = await window.showOpenFilePicker({
  types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }],
})
const file = await handle.getFile()
const text = await file.text() // 对应 FileIO.ReadTextAsync

// 打开多个文件
const handles = await window.showOpenFilePicker({ multiple: true })

// 保存文本文件(对应 FileSavePicker + File.WriteAllTextAsync)
const saveHandle = await window.showSaveFilePicker({
  suggestedName: 'NewDocument.txt',
  types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }],
})
const writable = await saveHandle.createWritable()
await writable.write('Hello, Web!')
await writable.close()

// 选择文件夹并枚举(对应 FolderPicker + StorageFolder.GetItemsAsync)
const dir = await window.showDirectoryPicker({ mode: 'read' })
for await (const entry of dir.values()) {
  console.log(entry.kind, entry.name)
}

// 不支持时降级:<input type="file">(读)与 <a download> + Blob(写)
```

## 浏览器兼容性

| 能力 | Chrome / Edge(86+) | Firefox | Safari |
| --- | --- | --- | --- |
| `showOpenFilePicker` / `showSaveFilePicker` | ✅ | ❌(仅 OPFS,111+) | ❌(仅 OPFS,15.2+;26.0 仍无 picker) |
| `showDirectoryPicker` | ✅ | ❌ | ❌ |
| `createWritable()` 写盘 | ✅ | ❌ | ⚠️(仅 OPFS 句柄,26.0 起;不含磁盘文件) |
| `<input type="file">` 降级(读) | ✅ | ✅ | ✅ |
| `<a download>` + Blob 降级(写) | ✅ | ✅ | ✅ |
| `<input webkitdirectory>`(非标准目录降级) | ✅ | ✅ | ✅ |

教学演示以 Chromium 系(Chrome / Edge)完整功能为准;Firefox 与 Safari(含 26.0)均未实现三大 picker —— Firefox 仅支持 Origin Private File System(111+),Safari 亦仅 OPFS(15.2+;Safari 26.0 release notes 新增的 File System WritableStream 仍限 OPFS,不含磁盘文件 picker,MDN BCD 三条 picker 均为 false)。页面内以 `typeof window.showOpenFilePicker === 'function'` 做能力探测:打开/保存自动降级,目录枚举禁用并给出原因 —— 任何浏览器打开本页都不会出现坏按钮。

## 与官方示例的对照

| WinUI Gallery 示例(CK/WinUI-Gallery/…/Samples/StoragePickers) | 本页处理 |
| --- | --- |
| Pick single file(类型过滤 / CommitButtonText / SuggestedStartLocation / ViewMode) | 例 1:`showOpenFilePicker`(类型过滤参数区可调;后三项 Web 无对应)→ `getFile()` 展示文件信息 + 文本内容读取(`FileIO.ReadTextAsync` 等价,100 KB 截断) |
| Pick multiple files | 例 2:`multiple: true`,逐文件列出名/类型/大小;取消 → 「未选择任何文件」同官方 No files selected |
| Save file(内容框 / 类型勾选 / 默认扩展名 / 建议文件名) | 例 3:内容 textarea + 参数区(类型勾选、默认扩展名、建议文件名)→ `showSaveFilePicker` + `createWritable`;不支持时降级 Blob 下载;状态只显示文件名(无路径) |
| Pick folder | 例 4:`showDirectoryPicker` + `values()` 枚举子项(扩展演示,官方无枚举例;`GetItemsAsync` 的 Web 等价);不支持时按钮禁用 |
| Pick a file and display its thumbnail | 例 5:无系统缩略图 → 图像文件 `URL.createObjectURL` 预览(160×160 容器同官方 Border),其余类型「无预览」同官方 No thumbnail available;文件信息区展示元数据 |
| 顶部 InfoBar(picker 记住上次位置) | Web 行为一致(浏览器原生记住上次目录),归入「SuggestedStartLocation 无对应」的说明 |

## 与 WinUI 的差异说明

- **无控件语义**:WinUI 侧 StoragePickers 是纯 API(页面用按钮 + 文本区组织演示);本页为 🌐 Web 替代示例,不产出 `src/components/StoragePickers.vue`,交互由浏览器 API 直接承载。
- **安全模型前置**:WinUI「选择即授权 + 可见路径」,Web「沙箱 + 逐会话授权 + 路径不可见」(见上文安全模型一节)—— 这是演示交互里所有提示文案的来源。
- **降级通路**:`<input type="file">` 只能读且拿不到句柄语义(无持久授权、无多次 `getFile()`);`<a download>` 只能落到浏览器下载目录,不能指定位置与覆盖文件。降级是「功能子集」,不是等价替代,页面内以徽标标注当前生效通路。
- **类型收录**:TS 的 DOM lib 未收录 `show*Picker`(Chromium 主导的 API),示例代码需自行声明最小接口(本页 `demo/pages/StoragePickersPage.vue` 内有完整定义,可直接复用)。
- **视觉值**:本页不移植 `generic.xaml` 控件模板(无对应控件);按钮 / 状态提示 / 文本输入复用 [Button](./Button.md) / [InfoBar](./InfoBar.md) 组件与原生 textarea,颜色全部取自 `--wui-*` token(官方缩略图 Border 的 `SubtleFillColorTertiaryBrush` 现已有对应 PL2 Fluent token `--wui-subtle-fill-color-tertiary`(见 [_brushes.md](./_brushes.md)),消费侧可直引;演示页源码注释记录)。
- **文本框组件**:官方保存示例用多行 `TextBox`(AcceptsReturn);站内 [TextBox](./TextBox.md) 组件为单行 input,故示例页用带 token 的原生 textarea 承载多行内容。

---

演示页源码:[demo/pages/StoragePickersPage.vue](../../demo/pages/StoragePickersPage.vue)
