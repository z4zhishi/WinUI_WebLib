<script lang="ts">
// WebView2.vue —— WinUI WebView2 控件的 Web 替代实现(🌐 标记:iframe 封装,非嵌入式 Chromium)。
// 类型与事件参数对外导出,供使用方与示例页引用。
/**
 * 导航状态(本组件的 Web 侧声明式状态,WinUI 无对应枚举):
 * - idle:未设置源(Source 为空);
 * - loading:navigationStarting 之后、load/error/超时之前;
 * - loaded:iframe load 事件已触发(注意:被 X-Frame-Options / CSP 拒绝的站点同样触发 load,
 *   跨源限制下无法编程区分「成功」与「被拒」,须由调用方结合已知站点策略判断);
 * - timeout:超过声明式超时(loadTimeoutMs)仍未触发 load,按失败处理;
 * - error:iframe error 事件(罕见;多数嵌入失败不会走此事件,浏览器只在帧内静默拒绝)。
 */
export type WebView2Status = 'idle' | 'loading' | 'loaded' | 'timeout' | 'error'

/** navigationStarting 事件参数(近似 WinUI CoreWebView2NavigationStartingEventArgs)。 */
export interface WebView2NavigationStartingEventArgs {
  /** 导航目标 URI;html(NavigateToString)分支为 'about:srcdoc'。 */
  uri: string
}

/** sourceChanged 事件参数(近似 WinUI SourceChanged,Source 属性被程序改动时触发)。 */
export interface WebView2SourceChangedEventArgs {
  uri: string
}

/** navigationCompleted 事件参数(近似 WinUI NavigationCompleted 的 IsSuccess / WebErrorStatus)。 */
export interface WebView2NavigationCompletedEventArgs {
  /** load 探测为 true;error / 超时声明为 false。注意 true 不代表「未被拒绝」(见 WebView2Status)。 */
  isSuccess: boolean
  /** 结束时的状态(loaded / timeout / error)。 */
  status: WebView2Status
  uri: string
}

/** 状态覆盖层文案集合(可经 statusLabels 属性逐项覆盖)。 */
export type WebView2StatusLabels = Partial<Record<'idle' | 'loading' | 'timeout' | 'error', string>>
</script>

<script setup lang="ts">
// WinUI WebView2 的 Web 替代:原生控件以 Edge(Chromium)内核承载任意网页,拥有完整导航事件
// (NavigationStarting / NavigationCompleted / CanGoBack / GoBack / Reload / ExecuteScriptAsync /
// WebMessageReceived 等);Web 端唯一等价的通用载体是 <iframe>,但它受同源策略约束:
//   1. 没有导航生命周期事件 —— load 在「成功」与「被 X-Frame-Options / CSP frame-ancestors 拒绝」
//      时都会触发,error 几乎不触发,故用 load/error 探测 + 声明式超时(loadTimeoutMs)近似,
//      超时是唯一可编程判定的失败路径;
//   2. 跨源帧的 Location(除 reload/replace)/ Document / History 均不可读不可调 ——
//      goBack/goForward 只能尽力尝试,跨源恒失败(如实声明,不假装可用);
//   3. 安全面更大 —— 默认给 iframe 加最小权限 sandbox(空 token 列表:脚本/表单/弹窗/同源/
//      顶层导航全禁),调用方经 sandbox 属性显式扩权。
// 视觉:WebView2 是 HWND 原生托管控件,generic.xaml 无其 Style/ControlTemplate(已核对),
// 无 WinUI 视觉状态可对照;加载/失败覆盖层为本组件新增的声明式状态 UI,样式取通用主题 token。
import { computed, onBeforeUnmount, ref, watch } from 'vue'
// 覆盖层淡入用 wui-anim-fade-in(关键帧在 animations.css;示例站入口未全局引入,
// 组件按需自带,与 AnimatedIcon/DatePicker 同一取法)。
import '../styles/animations.css'
import WuiProgressRing from './ProgressRing.vue'

const props = withDefaults(
  defineProps<{
    /** 页面 URI(WinUI Source);变更即重新导航。为空且未设 html 时组件处于 idle。 */
    source?: string
    /** HTML 字符串(WinUI NavigateToString → iframe srcdoc);非空时优先于 source。
     * srcdoc 默认继承宿主同源,故务必配合 sandbox(本组件默认已是最小权限沙箱)。 */
    html?: string
    /** 安全策略(HTML sandbox 属性)。默认 ''(最小权限:属性存在、token 列表为空,
     * 脚本/表单/弹窗/同源/顶层导航全部被禁);传 token 串(如 'allow-scripts')逐项扩权,
     * 传 false / null 显式关闭沙箱(不安全,需自担风险)。token 以空白分隔、自动去重。 */
    sandbox?: string | boolean | null
    /** 加载超时毫秒数(Web 侧声明,默认 15000);超时后状态置 timeout 并触发 navigationCompleted
     * (isSuccess=false)。≤ 0 关闭超时(不推荐:离线/被防火墙拦截时将永远停留在 loading)。 */
    loadTimeoutMs?: number
    /** iframe 无障碍标题(HTML title,对应 WinUI 无直接属性)。 */
    title?: string
    /** 状态覆盖层文案,逐项覆盖默认文案(英文默认)。 */
    statusLabels?: WebView2StatusLabels
  }>(),
  {
    source: '',
    html: '',
    sandbox: '',
    loadTimeoutMs: 15000,
    title: 'Web content',
    statusLabels: () => ({}),
  },
)

const emit = defineEmits<{
  /** 导航开始(source/html 变更或 reload() 调用),近似 WinUI NavigationStarting。 */
  navigationStarting: [event: WebView2NavigationStartingEventArgs]
  /** source / html 属性变更(近似 WinUI SourceChanged;挂载时的初始导航不触发)。 */
  sourceChanged: [event: WebView2SourceChangedEventArgs]
  /** 导航结束(load / error / 超时声明),近似 WinUI NavigationCompleted。 */
  navigationCompleted: [event: WebView2NavigationCompletedEventArgs]
}>()

defineOptions({
  // class/style 由根节点 v-bind="$attrs" 透传,其余 attrs(aria-* 等)一并透传。
  inheritAttrs: false,
  name: 'WuiWebView2',
})

// —— 状态机:idle / loading / loaded / timeout / error ——
const status = ref<WebView2Status>('idle')

const iframeEl = ref<HTMLIFrameElement | null>(null)

// reload 的实现载体:改 key 强制 iframe 重挂载(跨源帧的 Location.reload 虽可调用,
// 但同 src 赋值不会重触发 load,重挂载是两种场景下都可靠的方式)。
const frameKey = ref(0)

let timeoutHandle: number | undefined

/** 当前导航目标;html 分支渲染 srcdoc,URI 记为 about:srcdoc。 */
const activeUri = computed(() =>
  props.html.trim() !== '' ? 'about:srcdoc' : props.source.trim(),
)

function clearTimer(): void {
  if (timeoutHandle !== undefined) {
    window.clearTimeout(timeoutHandle)
    timeoutHandle = undefined
  }
}

function beginNavigation(): void {
  clearTimer()
  const uri = activeUri.value
  if (uri === '') {
    status.value = 'idle'
    return
  }
  status.value = 'loading'
  emit('navigationStarting', { uri })
  if (props.loadTimeoutMs > 0) {
    timeoutHandle = window.setTimeout(onTimeout, props.loadTimeoutMs)
  }
}

function onTimeout(): void {
  timeoutHandle = undefined
  if (status.value !== 'loading') return
  status.value = 'timeout'
  emit('navigationCompleted', { isSuccess: false, status: 'timeout', uri: activeUri.value })
}

// 挂载即导航(与 WinUI 初始化即加载 Source 一致);后续变更先发 sourceChanged 再开导航。
// flush 'pre' 在渲染前运行:状态先切 loading,iframe 随渲染取得新 src,事件顺序与 WinUI 一致。
let isInitialNavigation = true
watch(
  [() => props.source, () => props.html],
  () => {
    if (isInitialNavigation) {
      isInitialNavigation = false
      beginNavigation()
      return
    }
    emit('sourceChanged', { uri: activeUri.value })
    beginNavigation()
  },
  { immediate: true },
)

// iframe load:成功与被拒(X-Frame-Options / CSP)都会触发,无法编程区分 ——
// 状态如实记为 loaded 并注明局限(wiki「嵌入失败」节);超时后迟到的 load 恢复为 loaded。
function onFrameLoad(): void {
  if (activeUri.value === '') return
  if (status.value === 'loaded') return
  clearTimer()
  status.value = 'loaded'
  emit('navigationCompleted', { isSuccess: true, status: 'loaded', uri: activeUri.value })
}

// iframe error:MDN 明言极少触发(部分浏览器的网络错误才触发),仅作尽力探测。
function onFrameError(): void {
  if (activeUri.value === '') return
  clearTimer()
  status.value = 'error'
  emit('navigationCompleted', { isSuccess: false, status: 'error', uri: activeUri.value })
}

// —— 沙箱归一化:false/null → 移除属性(显式无沙箱);字符串 → trim + 去空 token + 去重 ——
const sandboxAttr = computed<string | undefined>(() => {
  const value = props.sandbox
  if (value === false || value === null) return undefined
  if (value === true) return ''
  return Array.from(new Set(String(value).trim().split(/\s+/).filter(Boolean))).join(' ')
})

// —— 公开方法(对应 WinUI GoBack / GoForward / Reload)——

/** 重新加载当前源(对应 WinUI Reload);无源时为无操作。 */
function reload(): boolean {
  if (activeUri.value === '') return false
  frameKey.value += 1
  beginNavigation()
  return true
}

/**
 * 后退(对应 WinUI GoBack)。跨源帧的 History 被同源策略禁止访问(默认最小权限沙箱下
 * srcdoc 亦为不透明源),必然抛 SecurityError —— 捕获后如实返回 false,不假装可用。
 * 仅同源且未沙箱(或沙箱含 allow-same-origin)的内容可成功。
 */
function goBack(): boolean {
  return navigateHistory(-1)
}

/** 前进(对应 WinUI GoForward);限制同 goBack。 */
function goForward(): boolean {
  return navigateHistory(1)
}

function navigateHistory(direction: -1 | 1): boolean {
  const frame = iframeEl.value
  if (frame === null || activeUri.value === '') return false
  try {
    const frameHistory = frame.contentWindow?.history
    if (frameHistory === undefined) return false
    if (direction < 0) frameHistory.back()
    else frameHistory.forward()
    return true
  } catch {
    // 跨源 SecurityError:iframe history 有限的硬限制,如实上报失败。
    return false
  }
}

defineExpose({
  reload,
  goBack,
  goForward,
  /** 内部 iframe 元素(供 postMessage 等进阶用法;跨源内容仍受同源策略约束)。 */
  frame: iframeEl,
  /** 当前状态(WinUI 无对应属性;Web 侧探测结果)。 */
  status,
})

onBeforeUnmount(clearTimer)

// —— 状态覆盖层文案(英文默认,可逐项覆盖;loaded 不显示覆盖层)——
const DEFAULT_LABELS: Record<'idle' | 'loading' | 'timeout' | 'error', string> = {
  idle: 'No source',
  loading: 'Loading…',
  timeout: 'Timed out',
  error: 'Navigation failed',
}

const overlayText = computed(() => {
  const current = status.value
  if (current === 'loaded') return ''
  const custom = props.statusLabels[current]
  if (typeof custom === 'string' && custom !== '') return custom
  return DEFAULT_LABELS[current]
})

const overlayVisible = computed(() => status.value !== 'loaded')
</script>

<template>
  <div v-bind="$attrs" class="wui-webview2" :class="`is-${status}`">
    <!-- html(srcdoc)优先于 source(src 由 HTML 规范决定被 srcdoc 覆盖,此处显式省去以免误导) -->
    <iframe
      :key="frameKey"
      ref="iframeEl"
      class="wui-webview2__frame"
      :src="html.trim() === '' && source.trim() !== '' ? source : undefined"
      :srcdoc="html.trim() !== '' ? html : undefined"
      :sandbox="sandboxAttr"
      :title="title"
      @load="onFrameLoad"
      @error="onFrameError"
    />
    <!-- 状态覆盖层:idle / loading / timeout / error 时遮住帧面;loaded 时移除 -->
    <div
      v-if="overlayVisible"
      class="wui-webview2__overlay wui-anim-fade-in"
      role="status"
      aria-live="polite"
    >
      <WuiProgressRing v-if="status === 'loading'" :size="28" />
      <p class="wui-webview2__overlay-text">{{ overlayText }}</p>
    </div>
  </div>
</template>

<style scoped>
/* WebView2 为原生 HWND 托管控件,generic.xaml 无模板/主题资源可对照(已核对源文件);
   容器尺寸与状态覆盖层为 Web 侧新增,颜色/字号取通用 token,随 html[data-theme] 明暗切换。
   默认尺寸参照官方示例(Samples/WebView2 MinWidth/MinHeight=200)与 Gallery 布局观感。 */
.wui-webview2 {
  position: relative;
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 320px;
  min-height: 200px;
  background: var(--wui-application-page-background-theme);
}

/* 帧内获得焦点时的系统焦点视觉(与交互控件的单环 outline 约定一致) */
.wui-webview2:focus-within {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.wui-webview2__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--wui-application-page-background-theme);
}

.wui-webview2__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  text-align: center;
  font-family: var(--wui-content-control-theme-font-family);
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-application-page-background-theme);
}

.wui-webview2__overlay-text {
  margin: 0;
}
</style>
