# AppNotification

> 🌐 **Web 替代示例**:AppNotification 不是可视化控件 —— WinUI 版(WinUI Gallery 的 App notifications 页)演示的是 **Windows App SDK 系统通知编程**:`AppNotificationBuilder` 构造通知内容(文本 / 徽标 / 声音 / 时间戳 / 按钮输入 / 进度条),`AppNotificationManager.Default.Show` 弹出 toast 并常驻操作中心(Action Center)。Web 版不移植 WinUI 语义,改用浏览器 **Web Notifications API**(`new Notification` + `Notification.requestPermission` + `permissions`)提供等价交互演示。
>
> 在线示例:[/#/appnotification](/#/appnotification)

## 概述

从应用发送丰富、可交互的通知;通知可以包含文本、图像与操作(WinUI 侧入口是 `Microsoft.Windows.AppNotifications.Builder.AppNotificationBuilder` + `AppNotificationManager`;Web 侧入口是 `Notification` 构造函数 + `Notification.requestPermission()` + `navigator.permissions`)。本页演示 Web 版的完整闭环:**权限请求流程 → 发送通知(title/body/icon/onclick 聚焦)→ 权限受限时的页内 InfoBar 模拟降级**。

官方文档与参考资料:

- [AppNotification - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.appnotifications.appnotification)
- [AppNotificationManager - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.appnotifications.appnotificationmanager)
- [AppNotificationBuilder - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.windows.appnotifications.builder.appnotificationbuilder)
- [Toast notifications - 设计指南(Windows 应用)](https://learn.microsoft.com/windows/apps/design/shell/tiles-and-notifications/toast-notifications-overview)
- [Notification - MDN](https://developer.mozilla.org/docs/Web/API/Notification)
- [Notification.requestPermission() - MDN](https://developer.mozilla.org/docs/Web/API/Notification/requestPermission_static)
- [Permissions API - MDN](https://developer.mozilla.org/docs/Web/API/Permissions_API)

## WinUI AppNotificationBuilder ↔ Web Notification 对照表

| WinUI | Web | 说明 |
| --- | --- | --- |
| `AddText(标题)` + `AddText(正文)`(首个 `AddText` 为 toast 标题) | `new Notification(title, { body })` | 构造即完成文本;Web 的 title/body 二元结构对应 Builder 的首行/后续行约定 |
| `AppNotificationManager.Default.Show(notification)` | 构造 `Notification` 实例即入队(等价 Show) | 桌面端弹出横幅并常驻通知中心;移动端浏览器需改用 `ServiceWorkerRegistration.showNotification()` |
| `SetAppLogoOverride(uri, AppNotificationImageCrop.Circle)` | `options.icon`(URL) | Web 无裁剪选项,形状由系统决定;演示页用画布即时生成圆形 PNG 对照 Circle 裁剪 |
| `SetAudioEvent(Default / IM / Reminder / SMS / Alarm / Call)` | 仅 `options.silent`(静音开关) | 6 种声音事件枚举无对应;提示音由系统/浏览器统一控制 |
| `SetTimeStamp(DateTime.Now)` | `options.timestamp`(Epoch 毫秒) | lib.dom 未声明该字段(规范已定义),需扩展接口传入 |
| `SetHeroImage(uri)` | **无对应** | Web 通知无 hero 大图 |
| `SetAttributionText(text)` | **无对应** | Web 通知无出处行 |
| `AddButton(AppNotificationButton)` | **无对应**(桌面浏览器) | `options.actions` 仅部分 Android 浏览器渲染,桌面 Chrome/Edge/Firefox/Safari 均不显示,见「行动按钮差异」 |
| `AddComboBox` / `AddTextBox`(toast 内输入) | **无对应** | toast 内交互输入为 Windows 专属 |
| `AddProgressBar(AppNotificationProgressBar)` | **无对应** | 通知内进度条 Web 无承载 |
| `Duration(Default / Long)` | **无对应**(定时 `close()` 近似) | 桌面 Web 通知常驻通知中心、不自动消失;演示页以「自动关闭」参数近似 toast 时长 |
| `AppNotificationManager.NotificationInvoked`(激活回调,可后台激活) | `Notification.onclick`(页面存活时)+ `onshow` / `onclose` / `onerror` | Web 页面卸载后 `onclick` 丢失;后台激活需 Service Worker 的 `notificationclick` |
| `AppNotificationManager.RemoveAll()` / `RemoveByTag()` | 无实例级批量接口(`Notification.close()` 逐条关闭) | `tag` + `renotify` 可实现「同 tag 替换」近似 |
| 设置 > 系统 > 通知 中按应用开关 | `Notification.permission` 三态 + 浏览器站点权限 | 见下文「权限模型差异」 |

## 权限模型差异

两端最大的语义差异:WinUI 应用发通知**无需运行时授权** —— 依赖应用身份注册(MSIX / package identity),用户只能在系统「设置 > 系统 > 通知」里按应用开关;浏览器则有一整套运行时权限模型:

1. **请求**:`Notification.requestPermission()` 必须在**用户手势**(按钮点击等)中调用,否则多数浏览器直接判 `denied`;返回(或回调传入)`'granted' | 'denied' | 'default'`。
2. **查询**:`Notification.permission` 静态属性直读三态;`navigator.permissions.query({ name: 'notifications' })` 可拿到 `PermissionStatus` 并监听 `onchange` 实时同步(Chromium / Firefox 支持,Safari 对 query 抛错,只能直读)。
3. **收回**:用户随时可在浏览器站点权限(地址栏权限面板)改为阻止;`denied` 后 `new Notification` 直接抛异常 —— 演示页捕获后回退页内模拟。
4. **非安全上下文**:`http` 下通知不可用(演示页顶部出现警告 InfoBar 并整体切换页内模拟);WinUI 无此概念。
5. **iOS Safari**:需先将站点**安装为 PWA(添加到主屏幕)**后才可请求通知权限。

被拒时本页的降级策略:发送按钮不再调用 `new Notification`,改为在页内以 InfoBar 渲染一条「模拟通知」(标题旁标注「页内模拟」),与真实 toast 一样可手动关闭。

## 生命周期差异

| 阶段 | WinUI | Web |
| --- | --- | --- |
| 弹出 | `Show()` 即弹 toast;系统免打扰(DND)下仅入操作中心 | `new Notification()` 即弹;受系统免打扰与浏览器站点设置影响 |
| 常驻 | 操作中心(Action Center)常驻 | 桌面端同样常驻通知中心;`tag` + `renotify` 可替换同 tag 旧通知 |
| 激活 | `NotificationInvoked` + Launch 参数,**可后台激活应用** | `onclick` 仅页面/浏览器存活时可达;后台激活需 Service Worker `notificationclick` |
| 关闭 | 用户划除或由系统管理 | `onclose`(用户关闭与程序 `close()` 均触发);桌面端不自动消失,超时需自行定时 `close()` |
| 失败 | 部署依赖(Singleton 包;自包含部署需注意 MSIX 依赖,即官方页首第一条说明) | `onerror`(权限被收回 / 系统拦截等) |

## 行动按钮差异

WinUI toast 是「小型交互面板」:可内嵌按钮(`AddButton` + Launch 参数回传)、下拉框(`AddComboBox`)、文本框(`AddTextBox`)与进度条(`AddProgressBar`),用户不打开应用即可完成输入,结果经 `NotificationInvoked` 激活参数回传,应用可在**后台**处理。

Web 通知的交互能力被刻意限制:

- `options.actions` 最多 2 个按钮(`Notification.maxActions`),且**仅部分 Android 浏览器渲染**,桌面浏览器一律忽略;
- 无输入控件、无进度条承载;
- 点击交互只有 `onclick`(页面存活时)或 Service Worker 的 `notificationclick`(可后台,配合 `openWindow` / `focus`);
- 附加数据走 `options.data`(结构化克隆),点击后在处理器里读取 —— 这是对 WinUI「Launch 参数回传」的近似。

因此本页的行动按钮示例不 Web 化,归入「Windows 专属能力」说明区。

## Windows 专属能力差异

以下能力依赖 Windows 通知平台,Web 没有对应 API(演示页仅列表说明):

- **Toast 内交互控件**:`AddButton` / `AddComboBox` / `AddTextBox`(Survey 示例);
- **通知内进度条**:`AddProgressBar`(Progress Bar Example);
- **Hero image 与出处行**:`SetHeroImage` / `SetAttributionText`(Harbor Scene 示例);
- **声音事件枚举**:`SetAudioEvent` 的 Default / IM / Reminder / SMS / Alarm / Call(Web 仅 `silent`);
- **操作中心策略与免打扰(DND)行为**:系统级,页面不可控制;
- **按应用通知开关**:系统设置管理(Web 对应浏览器站点权限);
- **后台激活**:`AppNotificationActivator` + Launch 参数(Web 需 Service Worker);
- **Singleton 包部署依赖**:Windows 部署概念(官方页首第一条 InfoBar 的内容),Web 无对应。

## 基础用法

```ts
// 1. 请求权限(必须在用户手势中调用,如按钮点击回调)
const permission = await Notification.requestPermission() // 'granted' | 'denied' | 'default'

// 2. 发送通知(等价 AppNotificationBuilder + AppNotificationManager.Default.Show)
const notification = new Notification('欢迎来到 WinUI Web Lib', {
  body: '点击通知可回到本页',
  icon: circleIconDataUrl, // 对照 SetAppLogoOverride(…, Circle)
  silent: true,            // 对照 SetAudioEvent(仅静音开关,声音枚举无对应)
  timestamp: Date.now(),   // 对照 SetTimeStamp(lib.dom 未声明,需扩展接口)
  tag: 'demo',             // 同 tag 通知相互替换(配合 renotify)
})

// 3. 激活(WinUI NotificationInvoked 的「页面存活」版:点击聚焦并关闭)
notification.onclick = () => {
  window.focus()
  notification.close()
}

// 4. 降级:权限拒绝 / 非安全上下文 / API 不支持时,改为页内 InfoBar 模拟
if (Notification.permission === 'denied' || !window.isSecureContext) {
  // 页内模拟(演示页以 WuiInfoBar 呈现,标注「页内模拟」)
}
```

## 浏览器兼容性

| 能力 | Chrome / Edge | Firefox | Safari |
| --- | --- | --- | --- |
| `new Notification`(桌面) | ✅ | ✅ | ✅(macOS;需先授权) |
| `ServiceWorkerRegistration.showNotification` | ✅ | ✅ | ✅ |
| `options.silent` / `timestamp` / `tag` | ✅ | ✅(个别字段忽略) | ⚠️ 部分字段忽略 |
| `options.actions`(通知按钮) | ❌ 桌面不渲染(仅 Android) | ❌ | ❌ |
| `permissions.query({ name: 'notifications' })` + `onchange` | ✅ | ✅ | ❌(用 `Notification.permission` 直读) |
| iOS(Safari) | — | — | 仅 PWA(添加到主屏幕后) |

教学演示以 Chromium 系(Chrome / Edge)完整功能为准;其余环境按上表降级 —— 演示页的能力探测(`typeof Notification`、`window.isSecureContext`、`permissions.query` try/catch)会自动切换页内模拟并给出原因。

## 与官方示例的对照

| WinUI Gallery 示例(CK/WinUI-Gallery/…/Samples/AppNotification) | 本页处理 |
| --- | --- |
| 页首 3 条 InfoBar(Singleton 依赖 / 免打扰行为 / 防滥用警示) | 免打扰与防滥用两条改写为 Web 语境的静态 InfoBar(对照官方演示意图);Singleton 部署依赖为纯 Windows 概念,归入 wiki 差异节 |
| Basic notification(AddText × 2) | 例 2:`new Notification(title, { body })`,标题/正文由参数面板实时提供;`onclick → window.focus() + close()` 附带点击计数 |
| Informational notification with logo and custom audio(`SetAppLogoOverride` Circle + `SetAudioEvent` + `SetTimeStamp`) | 例 3:`options.icon`(画布即时绘制圆形徽标 PNG,对照 Circle 裁剪)+ `silent` 静音开关(对照 6 种声音枚举的无对应)+ `options.timestamp`;文案沿用官方示例 |
| Visual notification with hero image and attribution | 不演示:hero 图 / 出处行 Web 无对应,归入「Windows 专属能力」说明区 |
| Notification with AppNotification controls(ComboBox + TextBox + Button) | 不演示:toast 内交互输入 Web 无对应(桌面 actions 不渲染),归入说明区 + wiki 行动按钮差异 |
| Notification with progress bar | 不演示:Web 无承载,归入说明区 |

Web 版补充(官方无对应,Web 特有):例 1 权限状态与请求流程(徽标 + `requestPermission` 按钮 + `permissions.onchange` 实时同步)、例 4 降级页内模拟(权限拒绝 / 非安全上下文 / 不支持 / 强制开关四种触发条件)。

## 与 WinUI 的差异说明

- **无控件语义**:WinUI 侧 AppNotification 是纯 API(页面用按钮组织演示);本页为 🌐 Web 替代示例,不产出 `src/components/AppNotification.vue`,交互由浏览器 Notifications API 直接承载。
- **权限前置**(最大差异):WinUI 免运行时授权,Web 需安全上下文 + `requestPermission()` 用户手势授权(见「权限模型差异」);这是本页所有失败态与降级 UI 的来源。
- **激活模型**:WinUI 通知可后台激活应用(`NotificationInvoked` + Launch 参数);Web 的 `onclick` 仅在页面存活时可达,后台路径需 Service Worker `notificationclick`。本页以 `window.focus()` 演示「点击回页」。
- **常驻与时长**:桌面 Web 通知不自动消失(常驻通知中心),与 WinUI toast 的短时弹出不同;本页以「自动关闭」参数定时 `close()` 近似,`tag` + `renotify` 近似同 tag 替换。
- **Windows 专属能力**(Web 无对应):toast 内交互控件、进度条、hero image / 出处行、声音事件枚举、DND 行为、后台激活、Singleton 部署依赖(见上文)。
- **图标素材**:官方使用本地资源 `ms-appx:///Assets/...`;Web 版遵守「不加载远程资源」约定,徽标由画布按主题 accent token 即时绘制(圆形裁剪 + 白色铃铛剪影,白色为绘制内容色,非 UI 主题色)。
- **视觉值**:本页不移植 `generic.xaml` 控件模板(无对应控件);状态提示与页内模拟复用 [InfoBar](./InfoBar.md) 组件,按钮复用 [Button](./Button.md) 组件,颜色全部取自 `--wui-*` token(模拟徽标与画布绘制的恒白内容色除外)。

---

演示页源码:[demo/pages/AppNotificationPage.vue](../../demo/pages/AppNotificationPage.vue)
