// WinUI_WebLib — ElementSoundPlayer 的 Web 复刻(elementSound.ts)
//
// WinUI 的 ElementSoundPlayer 是一个仅代码后置(code-behind only)的静态 API:
// 用 ElementSoundPlayer.State(ElementSoundPlayerState:Auto/On/Off)做全局音效开关,
// ElementSoundPlayer.Volume(0.0–1.0,默认 1.0)控制相对系统音量的增益,
// ElementSoundPlayer.Play(ElementSoundKind) 播放 7 类系统短音(Focus/Invoke/Show/
// Hide/MovePrevious/MoveNext/GoBack),供所有 XAML 控件共享统一的 UI 音效语言。
// 本文件用 Web Audio(AudioContext + OscillatorNode + GainNode)提供等价能力。
//
// 参照源(只读):
//   - CK/WinUI-Gallery/WinUIGallery/Samples/Sound/SoundPage.xaml(.cs):
//     官方示例的三段演示 —— ToggleSwitch 切 State(On/Off)、试听 7 类系统音
//     (Button Tag="0"…"6" 依次对应 ElementSoundKind 枚举序,与本文档 KINDS 顺序一致)、
//     SpaceAudio 复选框切 SpatialAudioMode;
//   - ElementSoundKind 枚举序(Focus=0 … GoBack=6)与 SoundPage.xaml 的 Tag 一致;
//   - ElementSoundPlayerState:Auto=0(默认)/ On=1 / Off=2;Volume 默认 1.0。
//
// 与 WinUI 的已知差异(详见 wiki/controls/Sound.md):
//   1. WinUI 系统音是 Windows 内置的 wav 资产,仓库与浏览器均不可得 —— 本实现用
//      OscillatorNode 合成短音近似(短促、柔和、正弦为主、快起音 + 指数衰减包络,
//      频率/时长按各类别语义手调),非原始音效;
//   2. AudioContext 必须在用户手势后才能出声 —— play() 惰性建仓,并在 suspended 时
//      resume();play() 请在事件处理器中调用;
//   3. State='Auto' 在 WinUI 中"仅 Xbox 出声";浏览器无平台检测,本实现默认等效 Off,
//      autoPlatformEnabled=true 可模拟"平台默认开启"(演示/测试用扩展);
//   4. SpatialAudioMode(空间音频)浏览器无等价 API,未实现;
//   5. WinUI 在 State=On 时给全部内置控件自动配音;本实现不侵入各控件组件,需要
//      用 withSound() 显式绑定(或直接调 play()),粒度即绑定粒度。

/** WinUI ElementSoundKind 枚举(7 类系统音,顺序与枚举值 0–6 一致)。 */
export type ElementSoundKind =
  | 'Focus'
  | 'Invoke'
  | 'Show'
  | 'Hide'
  | 'MovePrevious'
  | 'MoveNext'
  | 'GoBack'

/** 全部音效类别(= WinUI ElementSoundKind 枚举序)。 */
export const ELEMENT_SOUND_KINDS: readonly ElementSoundKind[] = [
  'Focus',
  'Invoke',
  'Show',
  'Hide',
  'MovePrevious',
  'MoveNext',
  'GoBack',
]

/** WinUI ElementSoundPlayerState 枚举;Auto(默认)= 跟随平台(仅 Xbox 出声)。 */
export type ElementSoundPlayerState = 'Auto' | 'On' | 'Off'

/** 全部音效开关状态(= WinUI ElementSoundPlayerState 枚举序)。 */
export const ELEMENT_SOUND_PLAYER_STATES: readonly ElementSoundPlayerState[] = [
  'Auto',
  'On',
  'Off',
]

/**
 * 合成音规格:一段 OscillatorNode 短音的参数。
 * 频率/时长按 WinUI 系统音的听感风格近似(官方 wav 不可得,见文件头注 1)。
 */
export interface ElementSoundSpec {
  /** 起始频率(Hz)。 */
  from: number
  /** 结束频率(Hz);滑音经 exponentialRamp 到达。 */
  to: number
  /** 中途拐点频率(Hz),可选;在时长的 40% 处到达,用于双段音型(GoBack)。 */
  mid?: number
  /** 时长(ms)。 */
  duration: number
  /** 振荡器波形。 */
  type: OscillatorType
  /** 峰值增益(再乘 ElementSoundPlayer.Volume;Focus 类刻意压低,贴近系统音的低调)。 */
  peak: number
  /** 起振时间(ms);线性爬升到峰值后指数衰减。 */
  attack: number
}

/** 各类别合成参数(键 = ElementSoundKind)。 */
export const ELEMENT_SOUND_SPECS: Readonly<Record<ElementSoundKind, ElementSoundSpec>> = {
  // 焦点:极轻的高频"嗒"(键盘/手柄移动焦点,高频次,刻意最弱)
  Focus: { from: 2200, to: 1760, duration: 45, type: 'sine', peak: 0.07, attack: 3 },
  // 激活:上扬短"啵"(按钮/项被点击,最常用的确认音)
  Invoke: { from: 620, to: 930, duration: 90, type: 'sine', peak: 0.17, attack: 4 },
  // 显示:上行滑音(窗格/内容出现)
  Show: { from: 500, to: 1000, duration: 130, type: 'sine', peak: 0.16, attack: 5 },
  // 隐藏:下行滑音(窗格/内容消失,与 Show 对称)
  Hide: { from: 1000, to: 500, duration: 130, type: 'sine', peak: 0.16, attack: 5 },
  // 上一项:下行(翻页/轮播后退)
  MovePrevious: { from: 700, to: 470, duration: 110, type: 'triangle', peak: 0.13, attack: 4 },
  // 下一项:上行(翻页/轮播前进,与 MovePrevious 对称)
  MoveNext: { from: 470, to: 700, duration: 110, type: 'triangle', peak: 0.13, attack: 4 },
  // 返回:先快后慢的双段下行(层级回退,听感区别于 Hide)
  GoBack: { from: 940, mid: 660, to: 440, duration: 170, type: 'sine', peak: 0.15, attack: 4 },
}

// —— 模块内可变状态(getter/setter 对外只读出可写属性,避免解构后 this 丢失)——
const playerConfig = {
  state: 'Auto' as ElementSoundPlayerState,
  volume: 1,
  autoPlatformEnabled: false,
}

/** 音量钳制到 [0, 1](WinUI Volume 文档区间)。 */
function clampVolume(value: number): number {
  if (Number.isNaN(value)) return 1
  return Math.min(1, Math.max(0, value))
}

type AudioContextCtor = new () => AudioContext

/** 取 AudioContext 构造器(Safari 旧版走 webkitAudioContext 前缀;SSR/无实现时返回 null)。 */
function resolveAudioContextCtor(): AudioContextCtor | null {
  // 经 globalThis 取构造器:lib.dom 的 Window 接口未声明 AudioContext 属性,
  // 直接 window.AudioContext 会报 TS2339。
  const scope = globalThis as Partial<Record<'AudioContext' | 'webkitAudioContext', AudioContextCtor>>
  return scope.AudioContext ?? scope.webkitAudioContext ?? null
}

/** 惰性共享 AudioContext:首次 play() 才创建(浏览器允许在手势中建仓并出声)。 */
let sharedContext: AudioContext | null = null

function acquireAudioContext(): AudioContext | null {
  if (sharedContext !== null) return sharedContext
  const ctor = resolveAudioContextCtor()
  if (ctor === null) return null
  try {
    sharedContext = new ctor()
  } catch {
    return null
  }
  return sharedContext
}

/** 把一段合成音规格调度到 AudioContext:快起音 + 指数衰减包络 + 频率滑音。 */
function scheduleSound(context: AudioContext, spec: ElementSoundSpec, volume: number): void {
  const peak = spec.peak * clampVolume(volume)
  // 音量为 0 或增益无效时不调度(exponentialRamp 不接受 0 值端点,也省一次空播)。
  if (peak <= 0) return

  // 稍错开当前音频帧,避免与手势处理同帧竞争;不影响听感。
  const start = context.currentTime + 0.01
  const durationS = spec.duration / 1000
  const attackS = Math.min(spec.attack / 1000, durationS / 2)

  const gain = context.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + attackS)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationS)
  gain.connect(context.destination)

  const oscillator = context.createOscillator()
  oscillator.type = spec.type
  oscillator.frequency.setValueAtTime(Math.max(spec.from, 1), start)
  if (spec.mid !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(spec.mid, 1), start + durationS * 0.4)
  }
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(spec.to, 1), start + durationS)
  oscillator.connect(gain)
  oscillator.onended = () => {
    gain.disconnect()
    oscillator.disconnect()
  }

  oscillator.start(start)
  oscillator.stop(start + durationS + 0.03)
}

/**
 * ElementSoundPlayer 的 Web 等价物(静态 API,与 WinUI 同名成员对应):
 *
 * - `state`:音效开关(`'Auto' | 'On' | 'Off'`,默认 `'Auto'`);
 *   `'Auto'` 沿用 WinUI"仅 Xbox 出声"语义 —— 浏览器无平台检测,默认不出声,
 *   置 `autoPlatformEnabled = true` 可模拟"平台默认开启"。
 * - `volume`:音量 `0.0–1.0`(默认 `1.0`,越界钳制)。
 * - `play(kind)`:播放指定类别(等价 `ElementSoundPlayer.Play`)。
 *
 * 浏览器约束:AudioContext 需用户手势解锁 —— 请在事件处理器中调用 `play()`;
 * 本对象会在首次播放时惰性建仓,并在 `suspended` 时自动 `resume()`。
 */
export const ElementSoundPlayer = {
  /** 音效开关(对应 WinUI ElementSoundPlayer.State)。 */
  get state(): ElementSoundPlayerState {
    return playerConfig.state
  },
  set state(value: ElementSoundPlayerState) {
    playerConfig.state = value
  },

  /** 音量 0.0–1.0,默认 1.0(对应 WinUI ElementSoundPlayer.Volume;越界钳制)。 */
  get volume(): number {
    return playerConfig.volume
  },
  set volume(value: number) {
    playerConfig.volume = clampVolume(value)
  },

  /**
   * Web 扩展:模拟"平台默认开启音效"(WinUI 中 State='Auto' 仅 Xbox 出声,
   * 浏览器无法检测平台,此标志让 Auto 档可被演示/测试)。
   */
  get autoPlatformEnabled(): boolean {
    return playerConfig.autoPlatformEnabled
  },
  set autoPlatformEnabled(value: boolean) {
    playerConfig.autoPlatformEnabled = value
  },

  /** 播放指定类别(等价 WinUI ElementSoundPlayer.Play(ElementSoundKind))。 */
  play(kind: ElementSoundKind): void {
    const { state, volume, autoPlatformEnabled } = playerConfig
    if (state === 'Off') return
    // WinUI:Auto = 跟随平台(仅 Xbox);浏览器无平台检测,默认等效 Off。
    if (state === 'Auto' && !autoPlatformEnabled) return

    const spec = ELEMENT_SOUND_SPECS[kind]
    if (spec === undefined) return

    const context = acquireAudioContext()
    if (context === null) return
    if (context.state === 'suspended') {
      // 手势事件内 resume 通常立即生效;失败静默(下次手势再试)。
      context.resume().catch(() => {})
    }
    scheduleSound(context, spec, volume)
  },

  /** 关闭并释放共享 AudioContext(测试清理用;后续 play() 会重建)。 */
  dispose(): void {
    if (sharedContext === null) return
    void sharedContext.close().catch(() => {})
    sharedContext = null
  },
}

/**
 * 交互音效包装:返回"先播音、再执行原处理器"的新函数,用于把系统音绑到真实交互
 * (等价 WinUI 控件在 State=On 时的内置音效行为,但粒度由调用方决定):
 *
 * ```ts
 * const onSave = withSound('Invoke', () => save())
 * // 模板:<WuiButton @click="onSave">保存</WuiButton>
 * ```
 *
 * 注意:不要在模板里写 `@click="withSound('Invoke', onSave)"` —— 那是"调用
 * withSound 得到新函数"而非"点击时调用它";请先在脚本里保存包装结果。
 * 音效是否真的出声仍由 `ElementSoundPlayer.state` 决定(Off/Auto 时静默直通)。
 */
export function withSound<Args extends unknown[]>(
  kind: ElementSoundKind,
  handler?: (...args: Args) => void,
): (...args: Args) => void {
  return (...args: Args) => {
    ElementSoundPlayer.play(kind)
    handler?.(...args)
  }
}
