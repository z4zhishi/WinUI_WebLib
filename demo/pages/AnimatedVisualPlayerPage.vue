<script setup lang="ts">
// AnimatedVisualPlayer 示例页:对照官方 WinUI Gallery AnimatedVisualPlayerPage ——
//   示例 1(播放控制):400×400 卡片内 AutoPlay=False 的播放器 + Play/Pause(ToggleButton)/Stop/
//     Reverse 四按钮组(官方 PlaybackRate=±1 live 语义),Web 版追加进度条(SetProgress)与倍速滑块;
//   示例 2(自定义源加载):内置内联 Lottie JSON / 自定义 URL / 无源 fallback 三种源切换,
//     URL 网络加载失败 → loadError 事件 + FallbackContent 等价的静态占位插槽。
// Lottie 源选型:CK 仓库 AnimatedVisuals/* 为 LottieGen 生成的 C# 内嵌类不可直用,采用
// lottie-web 官方示例动画 URL(https),网络失败降级到组件内置内联 JSON(见 wiki 选型节)。
import { computed, ref, watch } from 'vue'
import WuiAnimatedVisualPlayer from '@/components/AnimatedVisualPlayer.vue'
import WuiButton from '@/components/Button.vue'
import WuiSlider from '@/components/Slider.vue'
import type { SliderValueChangedEventArgs } from '@/components/Slider.vue'
import WuiSymbolIcon from '@/components/SymbolIcon.vue'
import WuiToggleButton from '@/components/ToggleButton.vue'
import type {
  AnimatedVisualPlaybackState,
  AnimatedVisualPlayerLoadedEventArgs,
  AnimatedVisualPlayerLoadErrorEventArgs,
  AnimatedVisualPlayerSource,
  AnimatedVisualPlayerStretch,
} from '@/components/AnimatedVisualPlayer.vue'
import { WUI_BUILTIN_LOTTIE_ANIMATION } from '@/components/AnimatedVisualPlayer.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 源选型:lottie-web 官方示例动画(https URL);加载失败自动降级到内置内联 JSON ——
const OFFICIAL_LOTTIE_URL = 'https://raw.githubusercontent.com/airbnb/lottie-web/master/demo/gatin/data.json'

// —— 演示一:官方示例复刻(播放控制 + 进度 + 倍速)——
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const primaryPlayer = ref<InstanceType<typeof WuiAnimatedVisualPlayer> | null>(null)
const primaryState = ref<AnimatedVisualPlaybackState>('stopped')
const primaryProgressPercent = ref(0)
const primaryDuration = ref(0)
const completedCount = ref(0)
const degradeNotice = ref(false)
// 官方 PauseButton 为 ToggleButton:Checked → Pause(),Unchecked → Resume()
const pausedChecked = ref<boolean | 'indeterminate'>(false)

// 默认官方 URL 源;loadError → 自动降级内置(网络失败降级语义)
const primaryDegrade = ref(false)
const primarySource = computed<AnimatedVisualPlayerSource>(() =>
  primaryDegrade.value ? WUI_BUILTIN_LOTTIE_ANIMATION : OFFICIAL_LOTTIE_URL,
)

// —— 演示二:自定义源加载(内置 JSON / 自定义 URL / 无源 fallback)——
const sourceKindChoice = ref<string | number | boolean>('builtin')
const sourceKindOptions = [
  { label: '内置内联 JSON(离线)', value: 'builtin' },
  { label: '自定义 URL', value: 'url' },
  { label: '无源(fallback 插槽)', value: 'none' },
]
const urlChoice = ref<string | number | boolean>(OFFICIAL_LOTTIE_URL)
const customError = ref('')
const customDuration = ref(0)

const customSource = computed<AnimatedVisualPlayerSource>(() => {
  if (sourceKindChoice.value === 'builtin') return WUI_BUILTIN_LOTTIE_ANIMATION
  if (sourceKindChoice.value === 'url') return String(urlChoice.value)
  return null
})

watch(customSource, () => {
  customError.value = ''
  customDuration.value = 0
})

const customSourceLabel = computed(() =>
  sourceKindChoice.value === 'builtin'
    ? '内置内联 JSON'
    : sourceKindChoice.value === 'url'
      ? String(urlChoice.value)
      : 'null(无源)',
)

// —— 参数面板:AutoPlay / Loop / PlaybackRate / Stretch ——
const autoPlayOn = ref<string | number | boolean>(true)
const loopOn = ref<string | number | boolean>(false)
const rateChoice = ref<string | number | boolean>(1)
const playbackRateValue = computed(() => {
  const parsed = Number(rateChoice.value)
  return Number.isFinite(parsed) ? parsed : 1
})
const stretchChoice = ref<string | number | boolean>('Uniform')
const stretchOptions = [
  { label: 'Uniform(等比适配)', value: 'Uniform' },
  { label: 'UniformToFill(等比填满裁切)', value: 'UniformToFill' },
  { label: 'Fill(拉伸填满)', value: 'Fill' },
  { label: 'None(原始尺寸)', value: 'None' },
]

// —— 事件回填(状态 / 进度 / 时长经事件上报到页面)——
function onPrimaryState(state: AnimatedVisualPlaybackState): void {
  primaryState.value = state
}

function onPrimaryProgress(progress: number): void {
  primaryProgressPercent.value = progress * 100
}

function onPrimaryLoaded(event: AnimatedVisualPlayerLoadedEventArgs): void {
  primaryDuration.value = event.duration
}

function onPrimaryCompleted(): void {
  completedCount.value += 1
}

function onPrimaryLoadError(event: AnimatedVisualPlayerLoadErrorEventArgs): void {
  // 网络失败降级:切换到内置内联 JSON(页面提示降级原因)
  degradeNotice.value = true
  primaryDegrade.value = true
  void event
}

function onCustomLoaded(event: AnimatedVisualPlayerLoadedEventArgs): void {
  customDuration.value = event.duration
}

function onCustomLoadError(event: AnimatedVisualPlayerLoadErrorEventArgs): void {
  customError.value = `${event.message}`
}

// —— 播放控制(官方 C# 逻辑的等价映射)——
watch(pausedChecked, (checked) => {
  if (checked === true) primaryPlayer.value?.pause()
  else primaryPlayer.value?.resume()
})

// Pause 之外的状态变化(Stop / 自然播完)把 ToggleButton 拉回未勾选(官方 Stop 后 IsChecked=false 同语义)
watch(primaryState, (state) => {
  if (state !== 'paused' && pausedChecked.value === true) pausedChecked.value = false
})

// 官方 PlayButton_Click:PlaybackRate=1 + EnsurePlaying()(播放中不重启)
function onPlayClick(): void {
  rateChoice.value = 1
  ensurePlaying()
}

// 官方 EnsurePlaying:暂停中先取消暂停(→ Resume);未播放则 PlayAsync(0, 1, looped)
function ensurePlaying(): void {
  if (pausedChecked.value === true) {
    pausedChecked.value = false
  } else if (primaryState.value !== 'playing') {
    primaryPlayer.value?.play(0, 1, loopOn.value === true)
  }
}

// 官方 StopButton_Click:Stop() + PauseButton.IsChecked = false
function onStopClick(): void {
  primaryPlayer.value?.stop()
  pausedChecked.value = false
}

// 官方 ReverseButton_Click:PlaybackRate=-1(live)+ EnsurePlaying()
function onReverseClick(): void {
  rateChoice.value = -1
  ensurePlaying()
}

// 进度条拖动 → SetProgress(0–1);播放中从该进度继续,静止时定位该帧
function onScrub(event: SliderValueChangedEventArgs): void {
  primaryPlayer.value?.setProgress(event.newValue / 100)
}

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  [
    'source',
    "string(URL)| object(Lottie JSON)| null",
    'null',
    '源:URL 由组件 fetch(失败走 loadError + fallback 插槽);对象深拷贝后交给 lottie-web;null 渲染 fallback 插槽(等价 WinUI FallbackContent)',
  ],
  ['autoPlay', 'boolean', 'true', '装载完成后自动播放(WinUI AutoPlay;prefers-reduced-motion 时不自动起播)'],
  [
    'playbackRate',
    'number',
    '1',
    '播放倍率,实时生效(WinUI PlaybackRate 的 live 语义);负值倒放(官方示例 Reverse = -1)',
  ],
  [
    'stretch',
    "'Uniform' | 'UniformToFill' | 'Fill' | 'None'",
    "'Uniform'",
    '源动画在控件内的拉伸方式(WinUI Stretch,映射 SVG preserveAspectRatio)',
  ],
]

const eventsHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['loaded', '{ duration: number }', '动画源装载完成(等价 WinUI IsAnimatedVisualLoaded → true 时刻);duration 为动画时长(秒,WinUI Duration)'],
  ['completed', '{ from, to, looped }', '一次播放区间自然播完(等价 lottie complete;Pause / Stop 不触发;循环播放每圈各触发一次)'],
  ['stateChanged', "'stopped' | 'playing' | 'paused'", '播放状态变化(Web 扩展:WinUI 以 IsPlaying 等属性逐一通知,Web 合并为三态)'],
  ['progressChanged', 'number(0–1)', '播放进度变化,每渲染帧触发(Web 扩展:WinUI ProgressObject 的 Web 简化)'],
  ['loadError', '{ source, message }', 'URL 源 fetch / JSON 解析失败(Web 扩展:WinUI 动画创建失败走 FallbackContent,Web 以事件 + fallback 插槽表达)'],
]

const methodsHeaders = ['方法(defineExpose)', '对应 WinUI', '说明']
const methodRows: (string | number)[][] = [
  ['play(from?, to?, looped?)', 'PlayAsync(fromProgress, toProgress, looped)', '播放区间(进度 0–1);looped=true 时区间内循环'],
  ['pause()', 'Pause()', '冻结当前帧,不结束当前播放区间'],
  ['resume()', 'Resume()', '继续当前播放区间'],
  ['stop()', 'Stop()', '结束当前播放区间并回到首帧'],
  ['setProgress(progress)', 'SetProgress(progress)', '设置进度 0–1;播放中从该进度继续,静止时定位该帧'],
  ['isPlaying / isPaused / isStopped', 'IsPlaying(其余为任务面状态)', '只读状态 ref;三态互斥,由 playbackState 派生'],
  ['duration / progress / playbackState / isLoaded', 'Duration / ProgressObject / — / IsAnimatedVisualLoaded', '只读状态 ref:时长(秒)/ 进度(0–1)/ 三态 / 装载完成'],
]

const usageCode = computed(
  () => `<script setup lang="ts">
import { ref } from 'vue'
import WuiAnimatedVisualPlayer from '@/components/AnimatedVisualPlayer.vue'

const player = ref<InstanceType<typeof WuiAnimatedVisualPlayer> | null>(null)
<\/script>

<template>
  <!-- URL 源(失败走 fallback 插槽);倍率实时生效,负值倒放 -->
  <WuiAnimatedVisualPlayer
    ref="player"
    :source="'https://example.com/animation.json'"
    :auto-play="true"
    :playback-rate="${playbackRateValue.value}"
    :stretch="'${String(stretchChoice.value)}'"
    @loaded="onLoaded"
    @completed="onCompleted"
  >
    <template #fallback>
      <span>源不可用时的静态占位(FallbackContent 等价)</span>
    </template>
  </WuiAnimatedVisualPlayer>

  <!-- 命令式控制:播放区间 / 进度(WinUI PlayAsync / SetProgress 等价) -->
  <button @click="player?.play(0, 1, false)">Play</button>
  <button @click="player?.pause()">Pause</button>
  <button @click="player?.stop()">Stop</button>
  <input type="range" @input="player?.setProgress(Number($event.target.value) / 100)" />
</template>`,
)
</script>

<template>
  <DemoPage wiki="AnimatedVisualPlayer"
    title="AnimatedVisualPlayer"
    description="渲染并控制播放动态图形(motion graphics)的元素:Source 为 Lottie 动画(本实现以 lottie-web 播放 Lottie JSON),支持 AutoPlay、实时倍率(负值倒放)、区间播放与进度设置;源不可用时经 fallback 插槽降级(WinUI FallbackContent 等价)。"
  >
    <template #demo>
      <div class="player-stage">
        <!-- 演示一:官方示例复刻(播放控制 + 进度 + 倍速) -->
        <section class="demo-group">
          <h3 class="group-title">播放控制(官方示例复刻)</h3>
          <p class="group-note">
            对照官方示例:播放器消费经 Lottie-Windows 转译的 AfterEffects 动画,Web 版以 lottie-web
            播放同源的 Lottie JSON(官方源不可直用,选型见 wiki)。按钮组 Play / Pause(ToggleButton)/
            Stop / Reverse 与官方一致:Reverse 即 PlaybackRate = -1(实时生效);进度条与倍速滑块为
            Web 追加(SetProgress / live 倍率)。
          </p>
          <p class="group-text">
            本播放器加载一份 Lottie 动画 JSON 并渲染每一帧:倍率滑块实时调整播放速度(负值倒放),
            拖动进度条等价 WinUI SetProgress,循环开关映射 PlayAsync 的 looped 参数。
          </p>
          <div class="player-card">
            <WuiAnimatedVisualPlayer
              ref="primaryPlayer"
              class="primary-player"
              aria-label="Lottie 动画演示"
              :source="primarySource"
              :auto-play="autoPlayOn === true"
              :playback-rate="playbackRateValue"
              :stretch="String(stretchChoice) as AnimatedVisualPlayerStretch"
              @state-changed="onPrimaryState"
              @progress-changed="onPrimaryProgress"
              @loaded="onPrimaryLoaded"
              @completed="onPrimaryCompleted"
              @load-error="onPrimaryLoadError"
            />
          </div>
          <p v-if="degradeNotice" class="notice-chip" role="status">
            官方 URL 源网络加载失败,已降级到内置内联 JSON(离线可用)。
          </p>
          <div class="transport-row" role="group" aria-label="播放控制">
            <WuiButton class="transport-button" aria-label="Play" title="Play" @click="onPlayClick">
              <WuiSymbolIcon symbol="Play" />
            </WuiButton>
            <WuiToggleButton
              v-model:checked="pausedChecked"
              class="transport-button"
              aria-label="Pause"
              title="Pause"
              :disabled="primaryState === 'stopped'"
            >
              <WuiSymbolIcon symbol="Pause" />
            </WuiToggleButton>
            <WuiButton class="transport-button" aria-label="Stop" title="Stop" @click="onStopClick">
              <WuiSymbolIcon symbol="Stop" />
            </WuiButton>
            <WuiButton class="transport-button" aria-label="Reverse" title="Reverse" @click="onReverseClick">
              <WuiSymbolIcon symbol="Previous" />
            </WuiButton>
          </div>
          <div class="scrub-row">
            <span class="mono-label">进度 {{ (primaryProgressPercent / 100).toFixed(2) }}</span>
            <WuiSlider
              class="scrub-slider"
              :value="primaryProgressPercent"
              :minimum="0"
              :maximum="100"
              :step-frequency="1"
              :disabled="primaryDuration === 0"
              aria-label="播放进度"
              @value-changed="onScrub"
            />
          </div>
          <div class="status-row">
            <span class="state-chip" aria-live="polite">IsPlaying = {{ primaryState === 'playing' }}</span>
            <span class="state-chip">IsPaused = {{ primaryState === 'paused' }}</span>
            <span class="state-chip">IsStopped = {{ primaryState === 'stopped' }}</span>
            <span class="state-chip">Duration = {{ primaryDuration.toFixed(2) }}s</span>
            <span class="state-chip">Completed × {{ completedCount }}</span>
          </div>
        </section>

        <!-- 演示二:自定义源加载 -->
        <section class="demo-group">
          <h3 class="group-title">自定义源加载</h3>
          <p class="group-note">
            源类型切换(见参数面板):内置内联 JSON(离线可用)/ 自定义 URL(组件 fetch,
            失败触发 loadError 并渲染 fallback 插槽)/ 无源(source = null,直接渲染 fallback
            插槽,等价 WinUI FallbackContent 静态降级)。
          </p>
          <div class="custom-row">
            <div class="player-card small">
              <WuiAnimatedVisualPlayer
                class="custom-player"
                aria-label="自定义降级动画演示"
                :source="customSource"
                :auto-play="true"
                :playback-rate="1"
                @loaded="onCustomLoaded"
                @load-error="onCustomLoadError"
              >
                <template #fallback="{ reason }">
                  <div class="fallback-placeholder">
                    <svg viewBox="0 0 48 48" aria-hidden="true" class="fallback-svg">
                      <rect
                        x="5"
                        y="9"
                        width="38"
                        height="30"
                        rx="3"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      />
                      <circle cx="17" cy="19" r="3.5" fill="currentColor" />
                      <path d="m9 34 9-9 6 6 7-8 8 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                    </svg>
                    <span class="fallback-text">
                      Source 不可用({{ reason === 'no-source' ? '无源' : '加载失败' }})→ FallbackContent 等价
                    </span>
                  </div>
                </template>
              </WuiAnimatedVisualPlayer>
            </div>
            <div class="custom-meta">
              <span class="state-chip">source = {{ customSourceLabel }}</span>
              <span v-if="customError !== ''" class="error-chip" role="alert">loadError:{{ customError }}</span>
              <span v-else-if="customDuration > 0" class="state-chip">Duration = {{ customDuration.toFixed(2) }}s</span>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="AutoPlay 自动播放" type="toggle" v-model="autoPlayOn" />
        <DemoOptionRow label="Loop 区间循环(Play)" type="toggle" v-model="loopOn" />
        <DemoOptionRow label="PlaybackRate 倍速" type="slider" v-model="rateChoice" :min="-2" :max="2" :step="0.1" />
        <DemoOptionRow label="Stretch 拉伸" type="select" v-model="stretchChoice" :options="stretchOptions" />
        <DemoOptionRow label="演示二:源类型" type="select" v-model="sourceKindChoice" :options="sourceKindOptions" />
        <DemoOptionRow label="演示二:URL" type="text" v-model="urlChoice" placeholder="Lottie JSON 的 https 地址" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">属性</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventsHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">方法与只读状态(defineExpose)</h3>
      <DemoDocsTable :headers="methodsHeaders" :rows="methodRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.player-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
}

.demo-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.group-title {
  margin: 0;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.group-note {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.group-text {
  margin: 0;
  max-width: 560px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

/* 官方示例的 400×400 卡片(Border CardBackgroundFillColorDefault / CardStrokeColorDefault) */
.player-card {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 400px;
  max-width: 100%;
  height: 400px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.player-card.small {
  width: 240px;
  height: 240px;
}

.primary-player,
.custom-player {
  width: 100%;
  height: 100%;
}

.notice-chip {
  margin: 0;
  padding: 4px 10px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* —— 播放按钮组:官方 Grid 四等宽 + ColumnSpacing 8 —— */
.transport-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 400px;
  max-width: 100%;
}

.transport-button {
  width: 100%;
}

/* —— 进度行 —— */
.scrub-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 400px;
  max-width: 100%;
}

.scrub-slider {
  flex: 1;
}

.mono-label {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  white-space: nowrap;
}

/* —— 状态 / 元信息 —— */
.status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.state-chip {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.error-chip {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  padding: 2px 8px;
  background: var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* —— 演示二 —— */
.custom-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.custom-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

/* FallbackContent 等价静态占位(官方降级为 Image;此处为静态图形 + 说明) */
.fallback-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
  color: var(--wui-application-secondary-foreground-theme);
  text-align: center;
}

.fallback-svg {
  width: 48px;
  height: 48px;
}

.fallback-text {
  font-size: var(--wui-tool-tip-content-theme-font-size);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
