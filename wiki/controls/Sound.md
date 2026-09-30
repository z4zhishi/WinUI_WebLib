# Sound

> 在线示例:[/#/sound](/#/sound) —— 路由 `/#/sound`(🌐 Web 替代示例:WinUI 系统音 → Web Audio 合成音)

## 概述

Sound 是一个仅代码后置(code-behind only)的 API,用于在所有 XAML 控件上启用 2D 与 3D UI 音效:UWP 应用在 Xbox 上默认开启音效,也可设置为在所有设备上播放,或进入空间音频模式获得更具沉浸感的大屏(10 英尺)体验。它没有可见界面,只提供 `ElementSoundPlayer` 静态 API,让全应用共享统一的 UI 音效语言。

WinUI 播放的是 Windows 内置的系统音(wav 资产,浏览器与仓库均不可得)。本实现的 `src/utils/elementSound.ts` 用 **Web Audio API**(`AudioContext` + `OscillatorNode` + `GainNode`)提供等价能力:7 类音效按 WinUI 的听感风格用合成短音近似(短促、柔和、正弦为主、快起音 + 指数衰减包络),API 形状与 WinUI 一一对应。

官方文档:

- [ElementSoundPlayer - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.elementsoundplayer)
- [Sound - Guidelines](https://learn.microsoft.com/windows/apps/design/style/sound)

## API

`ElementSoundPlayer` 为模块级单例对象(对应 WinUI 静态类):

| 成员 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `ElementSoundPlayer.state` | `'Auto' \| 'On' \| 'Off'` | `'Auto'` | 全局音效开关(对应 WinUI `ElementSoundPlayer.State`);`Auto` 沿用 WinUI"仅 Xbox 出声"语义,浏览器无平台检测,等效静音 |
| `ElementSoundPlayer.volume` | `number`(0.0–1.0) | `1.0` | 音量增益(对应 WinUI `Volume`),越界自动钳制 |
| `ElementSoundPlayer.autoPlatformEnabled` | `boolean`(Web 扩展) | `false` | 模拟"平台默认开启",置 `true` 后 `Auto` 档出声,便于演示/测试 |
| `ElementSoundPlayer.play(kind)` | `(kind: ElementSoundKind) => void` | — | 播放指定类别(对应 WinUI `Play`);`Off` / `Auto`(未模拟平台)时静默直通 |
| `ElementSoundPlayer.dispose()` | `() => void` | — | 关闭并释放共享 `AudioContext`(测试清理用;后续 `play()` 会重建) |
| `withSound(kind, handler?)` | `(kind, handler?) => 包装后的 handler` | — | 交互包装:先播音、再执行原处理器,用于把音效绑到真实交互 |
| `ELEMENT_SOUND_KINDS` | `readonly ElementSoundKind[]` | — | 全部 7 类音效类别(= WinUI `ElementSoundKind` 枚举序) |
| `ELEMENT_SOUND_SPECS` | `Record<ElementSoundKind, ElementSoundSpec>` | — | 各类别合成参数(频率/时长/波形/包络),可读可改后自行调度 |

无事件:WinUI `ElementSoundPlayer` 是纯静态 API,不暴露事件(音效播放没有回调)。

## ElementSoundKind 类别对照

| 类别 | 枚举值 | WinUI 用途 | 合成参数(近似) |
| --- | --- | --- | --- |
| `Focus` | 0 | 控件获得焦点(键盘/手柄导航) | 2200 → 1760 Hz · 45 ms · sine · 峰值 0.07(刻意最轻) |
| `Invoke` | 1 | 控件被激活(点击/回车) | 620 → 930 Hz · 90 ms · sine · 峰值 0.17 |
| `Show` | 2 | 窗格/内容出现 | 500 → 1000 Hz · 130 ms · sine · 峰值 0.16(上行滑音) |
| `Hide` | 3 | 窗格/内容消失 | 1000 → 500 Hz · 130 ms · sine · 峰值 0.16(下行滑音) |
| `MovePrevious` | 4 | 导航到上一项 | 700 → 470 Hz · 110 ms · triangle · 峰值 0.13 |
| `MoveNext` | 5 | 导航到下一项 | 470 → 700 Hz · 110 ms · triangle · 峰值 0.13 |
| `GoBack` | 6 | 返回上一层级 | 940 → 660 → 440 Hz · 170 ms · sine · 峰值 0.15(双段下行) |

枚举顺序与官方示例 SoundPage.xaml 中试听按钮的 `Tag="0"…"6"` 一致。包络统一为:线性起振(`attack`,约 3–5 ms)到峰值后指数衰减至静音。

## 基础用法

```ts
import { ElementSoundPlayer, withSound } from '@/utils/elementSound'

// 全局开关与音量(等价 WinUI ElementSoundPlayer.State / Volume)
ElementSoundPlayer.state = 'On'   // 'Auto'(默认,仅 Xbox)| 'On' | 'Off'
ElementSoundPlayer.volume = 0.8   // 0.0 – 1.0

// 直接播放指定类别(等价 ElementSoundPlayer.Play(ElementSoundKind))
ElementSoundPlayer.play('Show')

// 绑定到真实交互:点击时先播 Invoke 音,再执行保存
const onSave = withSound('Invoke', () => save())
```

```vue
<template>
  <!-- 包装结果先存脚本变量再绑定;不要在模板里直接写 withSound('Invoke', onSave) ——
       那只会"创建包装函数"而不会在点击时调用它 -->
  <WuiButton @click="onSave">保存</WuiButton>
</template>
```

浏览器约束:`AudioContext` 必须在用户手势后才能出声。`play()` 会惰性创建共享上下文并在 `suspended` 时自动 `resume()`,但请务必在事件处理器(点击/键盘)中触发播放;页面加载即调用是听不到声音的。

## 与 WinUI 的差异说明

| WinUI | Web 实现 | 说明 |
| --- | --- | --- |
| `ElementSoundPlayer.Play(ElementSoundKind)` 播放 Windows 内置系统音(wav) | `OscillatorNode` 合成短音 | **系统音不可得**:wav 资产内置于 Windows,仓库与浏览器均拿不到;合成参数按"短促、柔和、上/下行滑音"的系统音风格手调,听感近似但非原始音效 |
| `ElementSoundPlayerState`:`Auto`(默认,仅 Xbox 出声)/ `On` / `Off` | 同名三态;`Auto` 默认等效 `Off` | 浏览器无法检测 Xbox 平台;`autoPlatformEnabled = true`(Web 扩展)可模拟"平台默认开启" |
| `ElementSoundPlayer.Volume`(0.0–1.0,相对系统音量) | 乘进每个合成音的增益峰值 | Web 只能相对 `AudioContext` 输出,无法"相对系统音量";越界值钳制到 [0,1] |
| `ElementSoundPlayer.SpatialAudioMode`(空间音频) | 未实现 | 浏览器无系统空间音频 API,无等价物(官方示例第二段"Toggling Spatial Audio"因此没有对应演示) |
| 控件 `ElementSoundMode="Off"`(逐控件禁用内置音效) | 无需对应物 | Web 控件默认不带音效;是否发声完全由 `withSound`/`play` 的绑定粒度决定 |
| `State=On` 时全部内置控件自动配音(按钮点击、滑块、翻页……) | 需显式绑定 | 本实现不侵入各控件组件 —— 这是**最重要的行为差异**:想要哪些交互发声,就用 `withSound(kind, handler)` 绑哪些 |
| `AudioContext` 需用户手势解锁 | `play()` 惰性建仓 + 自动 `resume()` | WinUI 无此限制;页面加载即调用 `play()` 在浏览器中无声 |

## 相关链接

- 在线示例:`/#/sound`
- 演示页源码:`demo/pages/SoundPage.vue`
- 工具源码:`src/utils/elementSound.ts`
- 官方示例源:`CK/WinUI-Gallery/WinUIGallery/Samples/Sound/`(只读参照)
