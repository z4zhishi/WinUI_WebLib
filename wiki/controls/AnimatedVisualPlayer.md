# AnimatedVisualPlayer

> 在线示例:[/#/animatedvisualplayer](/#/animatedvisualplayer) · 演示页源码:[demo/pages/AnimatedVisualPlayerPage.vue](../../demo/pages/AnimatedVisualPlayerPage.vue)

## 概述

AnimatedVisualPlayer 是一个**渲染并控制播放动态图形(motion graphics)**的元素:Source 是一份动画(官方为 AfterEffects 制作、经 [Lottie-Windows](https://learn.microsoft.com/windows/communitytoolkit/animations/lottie) / LottieGen 转译的 `IAnimatedVisualSource2` 实现),控件负责装载、逐帧渲染与播放控制(AutoPlay / 实时倍率 / 区间播放 / 进度设置),源不可用时经 `FallbackContent` 静态降级。**Web 版选型**:官方示例 CK 仓库内的 `AnimatedVisuals/*` 是 LottieGen 生成的 **C# 内嵌类**(composition 动画代码),无法直接作为数据使用;本实现引入 **lottie-web**(本库唯一外部依赖,已登记 `docs/tools.md`)播放**同源的 Lottie JSON**:`source` 接受 JSON 的 https URL 或 JSON 对象,URL 网络加载失败时触发 `loadError` 并降级到组件内置的内联 Lottie JSON(`WUI_BUILTIN_LOTTIE_ANIMATION`,离线可用)或 `fallback` 插槽(WinUI FallbackContent 等价)。

官方文档:

- [AnimatedVisualPlayer - API](https://learn.microsoft.com/windows/winui/api/microsoft.ui.xaml.controls.animatedvisualplayer)
- [Lottie Overview](https://learn.microsoft.com/windows/communitytoolkit/animations/lottie)
- [Lottie-Windows - GitHub](https://github.com/CommunityToolkit/Lottie-Windows)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `source` | `string`(URL)`\| object`(Lottie JSON)`\| null` | `null` | 动画源:URL 由组件 `fetch`(跨域需 CORS 允许;失败触发 `loadError` 并渲染 fallback 插槽);对象经深拷贝后交给 lottie-web(不会污染调用方数据);`null` 直接渲染 fallback 插槽 |
| `autoPlay` | `boolean` | `true` | 装载完成后自动播放(WinUI `AutoPlay`);`prefers-reduced-motion: reduce` 环境不自动起播,手动 Play 不受限 |
| `playbackRate` | `number` | `1` | 播放倍率,**实时生效**(WinUI `PlaybackRate` 的 live 语义);绝对值为速率,负值倒放(官方示例 Reverse 即置 -1) |
| `stretch` | `'Uniform' \| 'UniformToFill' \| 'Fill' \| 'None'` | `'Uniform'` | 源动画在控件内的拉伸方式(WinUI `Stretch`,映射为 SVG `preserveAspectRatio`) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `loaded` | `{ duration: number }` | 动画源装载完成(WinUI `IsAnimatedVisualLoaded` → true 时刻);`duration` 为动画时长(秒,WinUI `Duration`) |
| `completed` | `{ from, to, looped }` | 一次播放区间自然播完(`Pause` / `Stop` 不触发;区间循环时每圈结束各触发一次) |
| `stateChanged` | `'stopped' \| 'playing' \| 'paused'` | 播放状态变化(Web 扩展:WinUI 仅 `IsPlaying` 属性,Web 合并为三态) |
| `progressChanged` | `number`(0–1) | 播放进度变化,每渲染帧触发(Web 扩展:WinUI `ProgressObject` 的 Web 简化) |
| `loadError` | `{ source, message }` | URL 源 fetch / JSON 解析失败(Web 扩展;触发后渲染 fallback 插槽) |

## 方法与只读状态(defineExpose)

| 成员 | 对应 WinUI | 说明 |
| --- | --- | --- |
| `play(from?, to?, looped?)` | `PlayAsync(fromProgress, toProgress, looped)` | 播放区间(进度 0–1,缺省 0→1);`looped = true` 时区间内循环 |
| `pause()` | `Pause()` | 冻结当前帧,不结束当前播放区间 |
| `resume()` | `Resume()` | 继续当前播放区间(仅暂停态有效) |
| `stop()` | `Stop()` | 结束当前播放区间并回到首帧 |
| `setProgress(progress)` | `SetProgress(progress)` | 设置进度 0–1:播放中从该进度继续,静止时定位该帧 |
| `isPlaying` / `isPaused` / `isStopped` | `IsPlaying`(其余为任务面状态) | 只读状态 ref,三态互斥 |
| `playbackState` / `duration` / `progress` / `isLoaded` | — / `Duration` / `ProgressObject` / `IsAnimatedVisualLoaded` | 只读状态 ref:三态 / 时长(秒)/ 进度(0–1)/ 装载完成 |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiAnimatedVisualPlayer from '@/components/AnimatedVisualPlayer.vue'

const player = ref<InstanceType<typeof WuiAnimatedVisualPlayer> | null>(null)

function onLoaded(event: { duration: number }): void {
  console.log('动画时长(秒):', event.duration)
}
</script>

<template>
  <!-- URL 源(加载失败走 fallback 插槽);倍率实时生效,负值倒放 -->
  <WuiAnimatedVisualPlayer
    ref="player"
    :source="'https://example.com/animation.json'"
    :auto-play="true"
    :playback-rate="1"
    :stretch="'Uniform'"
    @loaded="onLoaded"
    @completed="onCompleted"
  >
    <template #fallback="{ reason }">
      <span>源不可用({{ reason === 'no-source' ? '无源' : '加载失败' }})时的静态占位</span>
    </template>
  </WuiAnimatedVisualPlayer>

  <!-- 命令式控制(WinUI PlayAsync / Pause / SetProgress 等价) -->
  <button @click="player?.play(0, 1, false)">Play</button>
  <button @click="player?.pause()">Pause</button>
  <button @click="player?.resume()">Resume</button>
  <button @click="player?.stop()">Stop</button>
  <input type="range" @input="player?.setProgress(Number($event.target.value) / 100)" />
</template>
```

内联 JSON 源(离线 / 打包进构建产物):

```vue
<script setup lang="ts">
import WuiAnimatedVisualPlayer from '@/components/AnimatedVisualPlayer.vue'
import { WUI_BUILTIN_LOTTIE_ANIMATION } from '@/components/AnimatedVisualPlayer.vue'
</script>

<template>
  <WuiAnimatedVisualPlayer :source="WUI_BUILTIN_LOTTIE_ANIMATION" :auto-play="true" />
</template>
```

## Lottie 源选型(为什么是 lottie-web + JSON)

1. **官方源不可直用**:WinUI Gallery 示例的 `LottieLogo1` 等位于 `AnimatedVisuals/*.cs`,是 LottieGen 从 AfterEffects 工程生成的 **C# composition 动画代码**(编译进程序集),没有可直接消费的 Lottie JSON 工件。
2. **播放引擎**:`lottie-web ^5.13.0`(npm `dependencies`,已登记 `docs/tools.md`;类型自带)。它是 Lottie JSON 的事实标准 Web 播放器,与 Lottie-Windows 消费同一种 JSON Schema(`bodymovin` 格式),动画语义等价——差别只在渲染后端(WinUI 为 Composition 对象,lottie-web 为 SVG/Canvas)。
3. **示例动画源**:示例页默认使用 lottie-web 官方仓库示例动画
   `https://raw.githubusercontent.com/airbnb/lottie-web/master/demo/gatin/data.json`(https + CORS 开放);
   **网络加载失败时自动降级**到组件内置的内联 Lottie JSON(`WUI_BUILTIN_LOTTIE_ANIMATION`,120×120、
   60fps、1.5s 的旋转弧线 + 脉冲圆点,离线可用),保证示例页在离线环境仍完整可用。
4. **生产建议**:把 Lottie JSON 随构建打包(经 `import` 传 JSON 对象)或放到同源静态目录,避免运行时跨域;URL 方式适合快速预览远程素材。

## 无障碍

- 控件承载动效图形,根元素 `role="img"`;可访问名经 attrs 提供(如 `aria-label="加载动画"`,对应 WinUI AutomationProperties + `AnimatedVisualPlayerAutomationPeer`)。
- 控件本体不可聚焦、无快捷键(WinUI 同理:播放控制由宿主按钮承载,按钮天然键盘可达 Space/Enter)。
- `prefers-reduced-motion: reduce` 时跳过 AutoPlay 自动起播(用户手动 Play 仍可播放);可结合 `stateChanged` 在该偏好下提示用户手动开始。

## 与 WinUI 的差异(视觉与行为对照)

AnimatedVisualPlayer 在 `generic.xaml` 中**没有 ControlTemplate**(idl 直承 `FrameworkElement`,视觉全部来自源动画与 `FallbackContent`;本仓库 CK 参照内亦无该锚点段,对照基准为 `CK/WinUI-Reference/controls/dev/AnimatedVisualPlayer/AnimatedVisualPlayer.idl` 与官方 Gallery 示例)。差异如下:

| # | 差异项 | 说明 |
| --- | --- | --- |
| 1 | **渲染后端** | WinUI 播放 LottieGen 转译的 Composition 动画(`IAnimatedVisual.RootVisual`);Web 以 lottie-web 的 SVG renderer 播放 Lottie JSON。同一 JSON 语义等价,像素级观感取决于渲染后端与字体/资源内嵌程度 |
| 2 | **Source 类型** | WinUI 为 `IAnimatedVisualSource` 对象体系(codegen 类);Web 为 `URL 字符串 \| JSON 对象 \| null` 三态,`null` 与加载失败走 `fallback` 插槽(等价 `FallbackContent`) |
| 3 | **PlayAsync → play** | WinUI 返回 `IAsyncAction`(可 await 完成时机);Web `play()` 为同步调用,完成时机经 `completed` 事件上报(携带 `{ from, to, looped }`) |
| 4 | **IsPaused / IsStopped** | WinUI 仅 `IsPlaying` 属性;任务面要求三态,Web 以内部状态机派生(`stopped` = 初始 / Stop 后 / 自然播完后;`paused` = Pause 后;`playing` = 播放中)。自然播完后 WinUI `IsPlaying` → false 且停在末帧,Web 同样停在末帧并计入 `IsStopped` |
| 5 | **未实现面** | `Diagnostics` / `AnimationOptimization`(性能诊断与优化档,Web 无对应)、`ProgressObject`(Composition 属性集;以 `progress` ref + `progressChanged` 事件简化)、`FallbackContent` 的 DataTemplate(以作用域插槽 `#fallback="{ reason }"` 等价) |
| 6 | **尺寸** | WinUI 无显式 Width/Height 时收缩到源动画自然尺寸;Web 同:默认收缩到 Lottie JSON 的 `w×h`(px),经 attrs 给定 root 显式尺寸时按 `stretch` 填充(官方示例的 400×400 Border 即此用法) |
| 7 | **颜色 token** | Lottie JSON 内颜色为烘焙数据,不能引用 CSS 变量;内置降级动画取 WinUI SystemAccentColor #0078D4,替换素材时随 JSON 携带 |
| 8 | **负倍率方向语义** | `playbackRate < 0` 经 lottie `setDirection(-1)` 实现,`play(from, to)` 区间倒放(从 `to` 到 `from`),与官方示例 Reverse(PlaybackRate=-1 + PlayAsync(0,1))观感一致 |

---

演示页源码:[demo/pages/AnimatedVisualPlayerPage.vue](../../demo/pages/AnimatedVisualPlayerPage.vue) · 组件源码:[src/components/AnimatedVisualPlayer.vue](../../src/components/AnimatedVisualPlayer.vue) · 依赖登记:[docs/tools.md](../../docs/tools.md)
