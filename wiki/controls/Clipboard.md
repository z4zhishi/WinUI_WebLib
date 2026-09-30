# Clipboard

> 🌐 **Web 替代示例**:Clipboard 不是可视化控件 —— WinUI 版演示的是**系统剪贴板编程**(复制/粘贴文本、图像、文件,历史/漫游选项,格式枚举与内容变更监听)。Web 版不移植 WinUI 控件语义,改用浏览器 **Clipboard API** 提供等价交互演示。
>
> 在线示例:[/#/clipboard](/#/clipboard)

## 概述

使用剪贴板在应用内或应用间复制与粘贴文本、图像和文件,可配置剪贴板历史与漫游选项、监视内容变化并枚举可用格式(Web 版:浏览器沙箱内的等价子集)。WinUI 侧入口是 `Windows.ApplicationModel.DataTransfer.Clipboard` 静态类 + `DataPackage` 数据包;Web 侧入口是 `navigator.clipboard`(Async Clipboard API)+ `ClipboardItem` + `navigator.permissions`。

官方文档与参考资料:

- [Clipboard - API(WinUI)](https://learn.microsoft.com/uwp/api/windows.applicationmodel.datatransfer.clipboard)
- [ClipboardContentOptions - API(WinUI)](https://learn.microsoft.com/uwp/api/windows.applicationmodel.datatransfer.clipboardcontentoptions)
- [Copy and paste - Guide(Windows 应用)](https://learn.microsoft.com/windows/apps/develop/communication/copy-and-paste)
- [Async Clipboard API - MDN](https://developer.mozilla.org/docs/Web/API/Clipboard_API)
- [ClipboardItem - MDN](https://developer.mozilla.org/docs/Web/API/ClipboardItem)
- [Permissions API - MDN](https://developer.mozilla.org/docs/Web/API/Permissions_API)

## WinUI Clipboard API ↔ Web Clipboard API 对照表

| WinUI | Web | 说明 |
| --- | --- | --- |
| `Clipboard.SetContent(package)` + `DataPackage.SetText` | `navigator.clipboard.writeText(text)` | 写纯文本;Web 需页面聚焦(user activation) |
| `Clipboard.GetContent()` + `GetTextAsync()` | `navigator.clipboard.readText()` | 读纯文本;Web 首次触发权限询问,被拒抛 `NotAllowedError` |
| `DataPackage.SetHtmlFormat` / RichEditBox 富文本复制 | `clipboard.write([new ClipboardItem({ 'text/html': blob })])` | 富文本走 `text/html` MIME;建议附带 `text/plain` 后备 |
| `DataPackage.SetBitmap` + `GetBitmapAsync()` | `ClipboardItem 'image/png'` 写入 / `read()` + `getType('image/png')` 读取 | Web 仅保证 `image/png`;读回经 `URL.createObjectURL` 显示 |
| `DataPackageView.AvailableFormats` | `ClipboardItem.types` | 可用格式枚举 |
| `DataPackageView.Contains(format)` | `ClipboardItem.types.includes(...)` | 格式存在性判断 |
| `DataPackage.RequestedOperation`(Copy/Move/Link) | **无对应** | Web 剪贴板只有复制语义 |
| `DataPackage.SetStorageItems`(复制文件) | **无对应**(Chrome 系 *web custom formats* 为非标准扩展) | Web 只能写标准 MIME,无文件引用语义 |
| `Clipboard.SetContentWithOptions(options)` | **无对应** | 见下文「Windows 专属能力」 |
| `ClipboardContentOptions.IsAllowedInHistory` / `Clipboard.IsHistoryEnabled()` | **无对应** | 剪贴板历史(Win+V)由操作系统管理 |
| `ClipboardContentOptions.IsRoamable` / `Clipboard.IsRoamingEnabled()` | **无对应** | 跨设备漫游为 Windows 能力 |
| `Clipboard.Clear()` | **无对应** | Web 无法清空系统剪贴板 |
| `Clipboard.ContentChanged` 事件 | **无对应** | 可在 `window` `focus` 时轮询 `readText` 比对近似(有权限/功耗成本) |
| `DataPackage.SetDataProvider`(延迟渲染) | **无对应** | Web 写入即生成完整数据(`ClipboardItem` 的 Promise 值仅是产出方式,不含按需求取语义) |
| `UIHelper.AnnounceActionForAccessibility`(复制成功播报) | 状态提示区 `role="alert"` / `role="status"`(本页用 WuiInfoBar 承载) | 屏幕阅读器播报复制/粘贴结果 |

## 权限模型与安全上下文

这是两端最大的语义差异:WinUI 应用读写剪贴板**无需任何权限**(应用在前台即可);浏览器则有两道门槛:

1. **安全上下文**:`navigator.clipboard` 仅在 `https` / `localhost` 等安全上下文暴露。非安全上下文下:
   - 写文本降级为隐藏 `textarea` + `document.execCommand('copy')`(与站内 DemoCode 同策略,只能写、不能读);
   - 读文本、富文本与图像示例不可用 —— `execCommand('paste')` 在浏览器中不生效,无降级通路。
2. **权限**(经 `navigator.permissions` 查询):
   - `clipboard-write`:多数浏览器随 user activation **隐性授权**,一般不弹窗;
   - `clipboard-read`:首次使用弹权限询问(prompt),用户选择后固化为 granted / denied,可在站点权限设置中修改;
   - 查询方式:`navigator.permissions.query({ name: 'clipboard-read' })`,返回 `PermissionStatus`,`onchange` 可监听变化;
   - **兼容性**:Firefox / Safari 不支持以 `clipboard-read` / `clipboard-write` 为权限名查询(抛 `NotSupportedError`),实际权限以首次读写时的浏览器提示为准;被 iframe 嵌入时还受 `clipboard-write` / `clipboard-read` Permissions-Policy 约束。

被拒(`NotAllowedError`)时本页展示失败态 InfoBar;非安全上下文时顶部展示警告 InfoBar 并禁用读取类按钮。

## 基础用法

```ts
// 复制纯文本(需用户手势触发;https / localhost 等安全上下文)
await navigator.clipboard.writeText('Hello, clipboard!')

// 读取纯文本(首次会请求权限;被拒时抛 NotAllowedError)
const text = await navigator.clipboard.readText()

// 复制多格式:富文本 + 纯文本后备(ClipboardItem 单条目多 MIME)
await navigator.clipboard.write([
  new ClipboardItem({
    'text/html': new Blob(['<b>Hello</b>'], { type: 'text/html' }),
    'text/plain': new Blob(['Hello'], { type: 'text/plain' }),
  }),
])

// 权限查询(granted / prompt / denied;onchange 可监听变化)
const status = await navigator.permissions.query({
  name: 'clipboard-read' as PermissionName,
})
```

## 浏览器兼容性

| 能力 | Chrome / Edge | Firefox | Safari |
| --- | --- | --- | --- |
| `writeText` / `readText` | ✅ | ✅ | ✅ |
| `write` + `ClipboardItem` | ✅(`image/png`、`text/html` 等) | ⚠️ 仅 `text/plain` | ✅(格式值需以 `Promise<Blob>` 传入) |
| `read`(多格式读取) | ✅ | ✅(127+) | ✅ |
| `permissions.query('clipboard-*')` | ✅ | ❌ 抛 NotSupportedError | ❌ |
| 非安全上下文降级(`execCommand('copy')`) | ✅(仅写) | ✅(仅写) | ✅(仅写) |

教学演示以 Chromium 系(Chrome / Edge)完整功能为准;其余浏览器按上表降级,页面内的能力探测(`typeof ClipboardItem`、`typeof navigator.clipboard.read`)会自动禁用不可用按钮并给出原因。

## 与官方示例的对照

| WinUI Gallery 示例(CK/WinUI-Gallery/…/Samples/Clipboard) | 本页处理 |
| --- | --- |
| Copy Text to the Clipboard(复制 + 2 秒确认 + 无障碍播报) | 例 1:`writeText`(降级 `execCommand`);确认 InfoBar 自动隐藏时长可调;InfoBar alert/status 语义对应播报 |
| Paste Text from the Clipboard | 例 2:`readText` 往返;权限被拒 / 非安全上下文展示失败态 |
| RichEditBox 富文本复制链路 | 例 3:`WuiRichEditBox` 编辑 → `ClipboardItem text/html`(+ `text/plain` 后备开关)→ `read()` 读回 HTML 源码 |
| Copy and Paste an Image(本地照片素材) | 例 4:主题色画布即时绘制(不加载远程资源)→ `image/png` 写入 / `image/*` 读回对象 URL |
| Copy and Paste Files | 不演示:Web 无文件复制对应能力,归入「Windows 专属能力」说明 |
| Clipboard History and Roaming Options | 不演示:Web 无对应,归入「Windows 专属能力」说明 |
| Other Clipboard Operations(格式枚举 / Clear / ContentChanged) | 格式枚举并入例 3 / 例 4 的读取通路(`item.types`);Clear 与 ContentChanged 无对应,归入「Windows 专属能力」说明 |

## 与 WinUI 的差异说明

- **无控件语义**:WinUI 侧 Clipboard 是纯 API(页面用按钮 + 文本区组织演示);本页为 🌐 Web 替代示例,不产出 `src/components/Clipboard.vue`,交互由浏览器 API 直接承载。
- **权限前置**:WinUI 免权限,Web 需安全上下文 + 授权(见上文);这是演示交互里所有失败态的来源。
- **Windows 专属能力**(Web 无对应):剪贴板历史(`IsAllowedInHistory` / `IsHistoryEnabled`)、跨设备漫游(`IsRoamable` / `IsRoamingEnabled`)、文件复制(`SetStorageItems`)、清空(`Clear`)、内容变更事件(`ContentChanged`)、操作语义(`RequestedOperation` 的 Copy/Move/Link)与延迟渲染(`SetDataProvider`)。
- **多格式集的部分等价**:`ClipboardItem` 单条目可携带多个 MIME(`text/html` + `text/plain`),等价于 `DataPackage` 多格式集的常用子集;但 WinUI 的系统格式协商(CF_* 双向转换)与文件引用无对应。
- **视觉值**:本页不移植 `generic.xaml` 控件模板(无对应控件);状态提示复用 [InfoBar](./InfoBar.md) 组件,富文本编辑复用 [RichEditBox](./RichEditBox.md) 组件,颜色全部取自 `--wui-*` token(示例画布的绘制色取主题 accent token,画布内文字为恒白的内容色)。
- **图像示例素材**:官方使用本地照片 `rainier.jpg`;Web 版改为按 `imageSize` 参数即时绘制的渐变画布,保持「不加载远程资源」约定,比例沿用官方 200×150(4:3)。

---

演示页源码:[demo/pages/ClipboardPage.vue](../../demo/pages/ClipboardPage.vue)
