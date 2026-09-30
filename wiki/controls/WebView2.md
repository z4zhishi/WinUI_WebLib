# WebView2

> 在线示例:[/#/webview2](/#/webview2) —— 路由 `/#/webview2`

## 概述

WebView2 是基于 Microsoft Edge(Chromium)的控件,在应用中承载 HTML 内容。

这是本项目的 **🌐 Web 替代实现**:WinUI 的 WebView2 以进程内 Edge(Chromium)内核承载任意网页,拥有完整的导航生命周期事件与脚本互操作;Web 端唯一等价的通用载体是 `<iframe>`,本组件以 iframe 封装并补齐工程化细节——`source` 变更加载、加载中 / 失败 / 超时状态展示(iframe 无导航事件,用 load/error 探测 + 声明式超时近似)、默认最小权限 `sandbox` 安全策略。官方示例(Samples/WebView2)以 `Source="https://learn.microsoft.com/..."` 演示基本嵌入,本示例页按同一意图展开为基本嵌入、源切换与嵌入失败降级对照。

官方文档:

- [WebView2 - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.webview2)
- [WebView2 入门 - Guidelines](https://learn.microsoft.com/microsoft-edge/webview2/gettingstarted/winui)
- [WebView2Samples - Examples](https://github.com/MicrosoftEdge/WebView2Samples)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `source` | `string` | `''` | 页面 URI(对应 WinUI `Source`);变更即重新导航,为空且未设 `html` 时为 idle |
| `html` | `string` | `''` | HTML 字符串(对应 WinUI `NavigateToString`,经 iframe `srcdoc` 渲染);非空时优先于 `source` |
| `sandbox` | `string \| boolean \| null` | `''`(最小权限) | HTML `sandbox` 属性(安全策略):默认空 token 列表 = 脚本/表单/弹窗/同源/顶层导航全部被禁;传 token 串(如 `'allow-scripts'`)逐项扩权,自动去重;传 `false` / `null` 显式关闭沙箱(不安全) |
| `loadTimeoutMs` | `number` | `15000` | Web 侧声明式超时(毫秒):超时后状态置 `timeout` 并触发 `navigationCompleted(isSuccess=false)`;`≤ 0` 关闭(不推荐:离线时将永远停留在 loading) |
| `title` | `string` | `'Web content'` | iframe 无障碍标题(HTML `title`) |
| `statusLabels` | `WebView2StatusLabels` | `{}` | 状态覆盖层文案逐项覆盖(`idle` / `loading` / `timeout` / `error`;英文默认) |

其余 HTML 属性(`class`、`style`、`aria-*` 等)经 `v-bind="$attrs"` 透传至根容器;根容器默认高度 320px、最小高度 200px(官方示例 `MinHeight=200`),可经 `style` 覆盖。

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `navigationStarting` | `{ uri: string }` | 导航开始(`source` / `html` 变更或 `reload()`);近似 WinUI `NavigationStarting` |
| `sourceChanged` | `{ uri: string }` | `source` / `html` 属性变更(挂载时的初始导航不触发);近似 WinUI `SourceChanged` |
| `navigationCompleted` | `{ isSuccess: boolean, status: WebView2Status, uri: string }` | 导航结束:`load`(`isSuccess=true`,**但被 X-Frame-Options / CSP 拒绝时同样触发**)、`error`(`isSuccess=false`)或超时声明(`isSuccess=false, status='timeout'`);近似 WinUI `NavigationCompleted` |

模板中监听写法:`<WuiWebView2 @navigation-starting="…" @navigation-completed="…" />`。

## 方法(defineExpose)

| 方法 | 返回 | 说明 |
| --- | --- | --- |
| `reload()` | `boolean` | 重新加载当前源(强制重挂载 iframe,保证 load 事件重触发);无源时返回 `false`。对应 WinUI `Reload` |
| `goBack()` | `boolean` | 尽力尝试:同源帧调用 `history.back()`;跨源帧的 `History` 受同源策略禁止(`SecurityError`)→ 恒返回 `false`。对应 WinUI `GoBack` |
| `goForward()` | `boolean` | 尽力尝试,限制同 `goBack()`。对应 WinUI `GoForward` |
| `frame` | `HTMLIFrameElement` | 内部 iframe 元素,供 `postMessage` 等进阶用法(跨源内容仍受同源策略约束) |
| `status` | `Ref<WebView2Status>` | 当前状态(`'idle' \| 'loading' \| 'loaded' \| 'timeout' \| 'error'`) |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiWebView2 from '@/components/WebView2.vue'
import type { WebView2NavigationCompletedEventArgs } from '@/components/WebView2.vue'

const webview = ref<InstanceType<typeof WuiWebView2> | null>(null)

function onCompleted(event: WebView2NavigationCompletedEventArgs): void {
  // 注意 isSuccess=true 不代表「未被拒绝」(被 XFO/CSP 拒绝同样触发 load)
  console.log(event.status, event.uri)
}
</script>

<template>
  <!-- 基本嵌入:默认最小权限沙箱 + 15s 声明式超时 -->
  <WuiWebView2 source="https://example.com" />

  <!-- 扩权:仅放开脚本;超时改为 8s -->
  <WuiWebView2
    source="https://example.com"
    sandbox="allow-scripts"
    :load-timeout-ms="8000"
    @navigation-starting="onStarting"
    @navigation-completed="onCompleted"
  />

  <!-- 内联 HTML(NavigateToString):srcdoc 默认同源,务必配合默认沙箱 -->
  <WuiWebView2 html="<h1>Hello</h1>" />

  <!-- 方法 -->
  <WuiWebView2 ref="webview" source="https://example.com" />
</template>
```

> 示例页「用法」代码块按 WinUI 习惯以 PascalCase 展示属性名(`Source`、`Sandbox` 等),
> 实际书写请使用上表的 camelCase 属性名(模板中亦可用 kebab-case 如 `load-timeout-ms`)。

## WinUI WebView2 ↔ iframe 对照(CoreWebView2 能力 vs iframe 限制)

| WinUI / CoreWebView2 能力 | iframe 封装实现 | 差距说明 |
| --- | --- | --- |
| `Source`(get/set) | `source` 属性 → `iframe src`;`html` 属性 → `srcdoc` | 变更加载语义一致;`Source` 在 WinUI 中反映帧内实际地址,iframe 跨源后不可读,组件只回显调用方传入值 |
| `NavigationStarting` / `NavigationCompleted`(含 `IsSuccess`、`WebErrorStatus`) | `navigationStarting` / `navigationCompleted`(`isSuccess`、`status`) | **核心差距**:iframe 无导航事件;`load` 在成功与被拒(XFO/CSP)时都触发,`error` 几乎不触发。`isSuccess=true` 仅表示 load 已触发;`WebErrorStatus` 无等价物,失败原因只能凭超时/已知站点策略推断 |
| (无) | `loadTimeoutMs` 声明式超时 → `timeout` 状态 | Web 侧新增:超时是唯一可编程判定的失败路径,WinUI 无需此机制 |
| `CanGoBack` / `CanGoForward` / `GoBack()` / `GoForward()` | `goBack()` / `goForward()` 尽力尝试 | 跨源帧的 `History` 被同源策略禁止访问,必然 `SecurityError` → 返回 `false`;同源帧且未沙箱(或含 `allow-same-origin`)时可用;无 `CanGoBack` 式可查询状态 |
| `Reload()` | `reload()`(强制重挂载) | 全量重载语义一致;WinUI 可保留前进/后退栈,重挂载方式会清空帧内会话历史 |
| `Stop()` | 未暴露 | iframe 无跨源可用的停止导航 API(帧内 `window.stop()` 不可达) |
| `NavigateToString()` | `html` 属性(→ `srcdoc`) | 语义一致;srcdoc 默认继承宿主同源,安全依赖 `sandbox`(组件默认最小权限) |
| `ExecuteScriptAsync()` | 未封装(无等价物) | 跨源帧脚本不可达;同源帧可经 `frame` 引出自行访问,受 sandbox 约束 |
| `PostWebMessageAsJson` / `WebMessageReceived` | 未封装(可用 `frame.postMessage` + `message` 事件自行接线) | iframe `postMessage` 可覆盖多数场景,组件不重复封装 |
| `CoreWebView2`(Cookie、Permission、UserAgent、环境配置) | 无等价物 | iframe 共享宿主浏览器环境,Cookie/权限策略由浏览器决定,应用无法按控件粒度配置 |
| `NewWindowRequested` | 无事件;sandbox 未含 `allow-popups` 时弹窗被静默拦截 | 行为近似默认拒绝,但无拦截事件可订阅 |
| `DefaultBackgroundColor` | iframe / 容器 `background`(token) | 一致 |
| `DocumentTitle` | 不可读 | 跨源限制,无等价物 |
| `CoreWebView2Initialized` | (无) | Web 端无初始化阶段 |

### 嵌入失败:X-Frame-Options / CSP(frame-ancestors)

iframe 能否加载某站点由**对方站点**决定,应用侧无法绕过:

- 响应头 `X-Frame-Options: DENY / SAMEORIGIN`(旧机制)或 CSP `frame-ancestors`(现代机制)会命令浏览器拒绝把页面装入 iframe;
- 被拒时浏览器**只在帧内**渲染空白或错误页:宿主页的 `load` 事件照常触发、`onerror` 不触发、跨源内容不可读——**脚本无法编程证实失败**;
- 本组件的探测口径:`load` 触发 → `loaded`(不保证未被拒);超时未 load → `timeout`;`error`(罕见)→ `error`。判断「是否被拒」须结合已知站点策略(示例页预设的 google.com / developer.mozilla.org 即拒嵌对照)或对帧内容做业务侧校验;
- 失败降级:`timeout` / `error` 时组件以覆盖层呈现失败态(可经 `statusLabels` 本地化);`loaded` 但内容空白(被拒)时覆盖层已移除,由使用方按上文口径提示用户,示例页的状态面板给出了完整的说明文案示范。

### 安全注意事项

- **默认最小权限**:`sandbox` 默认 `''`(属性存在、token 列表为空)——脚本、表单、弹窗、同源存储/DOM 访问、顶层导航全部被禁,只保留静态渲染。这是对不可信第三方内容的安全缺省;
- **扩权逐项声明**:需要交互时经 `sandbox="allow-scripts"` 等显式放开,**只放开确实需要的 token**;
- **`allow-scripts` + `allow-same-origin` 同用等于对同源内容关闭沙箱**:被嵌内容可移除自身沙箱标记并访问宿主 DOM/存储;对第三方站点不要加 `allow-same-origin`;
- **`srcdoc`(`html`)默认继承宿主同源**,注入含脚本的 HTML 而不加沙箱等同于在宿主页执行脚本——组件默认最小权限沙箱即为此设计,关闭沙箱前务必确认内容可信;
- **`allow-top-navigation` 风险**:允许嵌入内容导航宿主页面(点击劫持/跳转劫持向量),不可信内容禁止;
- **离线/内网环境**:任何站点(含可嵌入站点)都可能走到 `timeout`——这是探测机制的预期行为,不是缺陷;
- iframe 内容不继承宿主主题与样式,也无法被宿主样式穿透(跨源),需成套视觉时由对方站点或 `srcdoc` 内联提供。

## 与 WinUI 的差异说明

- WebView2 是 HWND 原生托管控件,generic.xaml 中**没有**其 Style/ControlTemplate 与主题资源(已核对源文件),不存在可对照的视觉状态(Normal/PointerOver 等);容器与状态覆盖层为本组件 Web 侧新增的声明式 UI,颜色/字号/焦点环取通用 `--wui-*` token(应用页面背景、次级前景、焦点视觉主色、内容字号/字族),随 `html[data-theme]` 明暗切换;
- WinUI 中加载/失败反馈完全由应用订阅 `NavigationCompleted` 自行实现;Web 组件内置覆盖层(loading 旋转弧 + 状态文案),是超出 WinUI 默认行为的**补充**而非复刻,可经 `statusLabels` 调整文案;
- `goBack()`/`goForward()` 与 WinUI 同名方法的差距(跨源不可用、无 `CanGoBack` 查询)见上方对照表,如实声明、不做假实现;
- 默认高度 320px 为 Web 布局便利值(WinUI 中 WebView2 无固有尺寸,完全随布局容器)。

## 相关链接

- 在线示例:`/#/webview2`
- 演示页源码:`demo/pages/WebView2Page.vue`
- 相关控件:HyperlinkButton(单链接导航)、Popup(轻量浮层)
