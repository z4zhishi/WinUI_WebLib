<script setup lang="ts">
// SoundPage.vue —— Sound 示例页(对应官方 WinUI Gallery Samples/Sound/,🌐 Web 替代示例)。
// WinUI 的 ElementSoundPlayer 播放 Windows 内置系统音;浏览器拿不到那些 wav 资产,
// 本页改用 src/utils/elementSound.ts 的 Web Audio 合成音(OscillatorNode)等价演示:
//   配置 1 对照官方 TogglingSound:ToggleSwitch 切 State(On/Off),滑块调 Volume;
//   配置 2 对照官方 Play Specific System Sound:7 类系统音试听按钮(官方 Button Tag 0–6);
//   配置 3 为 Web 版"绑定真实交互"演示:withSound 包装真实按钮的点击(官方示例中
//          控件在 State=On 时自动配音;Web 需显式绑定,粒度即绑定粒度)。
// 结构照抄 HomePage.vue 母版:DemoPage → 交互演示 → DemoOptions → DemoDocsTable + DemoCode。
import { computed, ref, watch } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiSlider from '@/components/Slider.vue'
import WuiToggleSwitch from '@/components/ToggleSwitch.vue'
import '@/styles/animations.css'
import {
  ELEMENT_SOUND_KINDS,
  ELEMENT_SOUND_SPECS,
  ElementSoundPlayer,
  withSound,
  type ElementSoundKind,
  type ElementSoundPlayerState,
} from '@/utils/elementSound'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 Sound 的 description 译写)——
const PAGE_TITLE: BilingualText = { zh: 'Sound(系统音效)', en: 'Sound' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'Sound 是一个仅代码后置的 API,用于在所有 XAML 控件上启用 2D 与 3D UI 音效:UWP 应用在 Xbox 上默认开启,也可设置为在所有设备上播放,或进入空间音频模式获得更具沉浸感的大屏体验。浏览器拿不到 Windows 系统音资产,本页用 Web Audio(OscillatorNode 合成短音)提供等价 API 与听感近似音。',
  en: 'Sound is a code-behind only API that enables 2D and 3D UI sounds on all XAML controls: it is on by default for UWP apps running on Xbox, can be set to always play on all devices, and supports spatial audio for a more immersive 10ft experience. The Windows system sounds are not available in the browser, so this page re-creates the API on the Web Audio API (OscillatorNode) with synthesized approximations.',
}
const STATE_SECTION_TITLE: BilingualText = { zh: '音效开关与音量(TogglingSound)', en: 'Toggling sound' }
const AUDITION_SECTION_TITLE: BilingualText = { zh: '播放指定系统音(Play Specific System Sound)', en: 'Play specific system sound' }
const REAL_DEMO_SECTION_TITLE: BilingualText = { zh: '绑定到真实交互(withSound)', en: 'Bound to real interactions (withSound)' }
const API_TABLE_TITLE: BilingualText = { zh: 'API(ElementSoundPlayer)', en: 'API (ElementSoundPlayer)' }
const KINDS_TABLE_TITLE: BilingualText = { zh: 'ElementSoundKind 类别与合成参数', en: 'ElementSoundKind and synth parameters' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const stateSectionTitle = useBilingual(i18n, STATE_SECTION_TITLE)
const auditionSectionTitle = useBilingual(i18n, AUDITION_SECTION_TITLE)
const realDemoSectionTitle = useBilingual(i18n, REAL_DEMO_SECTION_TITLE)
const apiTableTitle = useBilingual(i18n, API_TABLE_TITLE)
const kindsTableTitle = useBilingual(i18n, KINDS_TABLE_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 全局状态:同步到 ElementSoundPlayer(对应官方 soundToggle_Toggled)——
// DemoOptionRow 的 v-model 契约要求 string | number | boolean 联合类型。
const state = ref<string | number | boolean>('Auto')
const volume = ref<string | number | boolean>(1)
const autoPlatform = ref<string | number | boolean>(false)

const STATE_CHOICES = [
  { label: 'Auto(跟随平台,默认)', value: 'Auto' },
  { label: 'On(始终播放)', value: 'On' },
  { label: 'Off(始终静音)', value: 'Off' },
]

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const stateValue = computed<ElementSoundPlayerState>(() => {
  const value = String(state.value)
  return value === 'On' || value === 'Off' ? value : 'Auto'
})

// 可写计算属性:演示区的真实 Slider 与参数面板共用同一音量值。
const volumeNumber = computed<number>({
  get: () => toNumber(volume.value, 1),
  set: (value: number) => {
    volume.value = value
  },
})

// 官方页的 ToggleSwitch 只在 On/Off 间切换;Auto(默认不出声)时开关呈 Off,
// 拨到 On 即进入 On —— 与官方 soundToggle 的语义一致。
const soundSwitchOn = computed<boolean>({
  get: () => stateValue.value === 'On',
  set: (on: boolean) => {
    state.value = on ? 'On' : 'Off'
  },
})

watch(
  stateValue,
  (value) => {
    ElementSoundPlayer.state = value
  },
  { immediate: true },
)
watch(
  volumeNumber,
  (value) => {
    ElementSoundPlayer.volume = value
  },
  { immediate: true },
)
watch(
  autoPlatform,
  (value) => {
    ElementSoundPlayer.autoPlatformEnabled = value === true
  },
  { immediate: true },
)

// —— 配置 2:7 类系统音试听(等价官方 Button_Click → ElementSoundPlayer.Play)——
const lastPlayed = ref('')

function onAudition(kind: ElementSoundKind): void {
  ElementSoundPlayer.play(kind)
  lastPlayed.value = kind
}

// —— 配置 3:withSound 绑定真实按钮(先播音、再执行动作)——
const PAGE_COUNT = 4
const pageIndex = ref(1)
const savedCount = ref(0)
const panelVisible = ref(false)

// 注意:包装结果必须先存进脚本变量;模板里直接写 withSound('Invoke', onSave)
// 只会"创建包装函数"而不会在点击时调用它。
const onPrevious = withSound('MovePrevious', () => {
  if (pageIndex.value > 1) pageIndex.value -= 1
})
const onNext = withSound('MoveNext', () => {
  if (pageIndex.value < PAGE_COUNT) pageIndex.value += 1
})
const onGoBack = withSound('GoBack', () => {
  pageIndex.value = 1
  panelVisible.value = false
})
const onShowPanel = withSound('Show', () => {
  panelVisible.value = true
})
const onHidePanel = withSound('Hide', () => {
  panelVisible.value = false
})
const onSave = withSound('Invoke', () => {
  savedCount.value += 1
})

// —— 下半区固定开发文档 ——
const apiHeaders = ['成员', '类型', '说明']
const apiRows: (string | number)[][] = [
  ['ElementSoundPlayer.state', "'Auto' | 'On' | 'Off'", '音效开关状态,默认 Auto(仅 Xbox 出声;本实现等效静音);上方开关与下拉实时调节'],
  ['ElementSoundPlayer.volume', 'number(0.0–1.0)', '音量增益,默认 1.0,越界钳制;滑块实时调节'],
  ['ElementSoundPlayer.autoPlatformEnabled', 'boolean(Web 扩展)', '模拟"平台默认开启",让 Auto 档可出声(浏览器无法检测 Xbox 平台)'],
  ['ElementSoundPlayer.play(kind)', '(kind: ElementSoundKind) => void', '播放指定类别;Off / Auto(未模拟平台)时静默直通'],
  ['withSound(kind, handler?)', '(kind, handler?) => 包装后的 handler', '包装交互处理器:先播音、再执行原逻辑;见上方"绑定到真实交互"演示'],
]

// ElementSoundKind 表:语义列 + 合成参数列(参数直接读自工具的规格表,不手工复抄)。
const KIND_SEMANTICS: Record<ElementSoundKind, string> = {
  Focus: '控件获得焦点(键盘/手柄导航)',
  Invoke: '控件被激活(点击/回车)',
  Show: '窗格/内容出现',
  Hide: '窗格/内容消失',
  MovePrevious: '导航到上一项',
  MoveNext: '导航到下一项',
  GoBack: '返回上一层级',
}

const kindHeaders = ['类别', 'WinUI 语义', '合成参数(近似)']
const kindRows: (string | number)[][] = ELEMENT_SOUND_KINDS.map((kind) => {
  const spec = ELEMENT_SOUND_SPECS[kind]
  const sweep =
    spec.mid !== undefined ? `${spec.from} → ${spec.mid} → ${spec.to} Hz` : `${spec.from} → ${spec.to} Hz`
  return [kind, KIND_SEMANTICS[kind], `${sweep} · ${spec.duration} ms · ${spec.type} · 包络 ${spec.attack} ms 起振`]
})

// 用法代码:展示"全局开关 → 直接播放 → withSound 绑定真实交互"三层 API。
const usageCode = `import { ElementSoundPlayer, withSound } from '@/utils/elementSound'

// 全局开关与音量(等价 WinUI ElementSoundPlayer.State / Volume)
ElementSoundPlayer.state = 'On'   // 'Auto'(默认,仅 Xbox)| 'On' | 'Off'
ElementSoundPlayer.volume = 0.8   // 0.0 – 1.0

// 直接播放指定类别(等价 ElementSoundPlayer.Play(ElementSoundKind))
ElementSoundPlayer.play('Show')

// 绑定到真实交互:点击时先播 Invoke 音,再执行保存
const onSave = withSound('Invoke', () => save())`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="Sound">
    <template #demo>
      <div class="sound-stage">
        <!-- 配置 1:官方 TogglingSound 对照 —— ToggleSwitch 切 State,滑块调 Volume -->
        <section class="stage-block">
          <h4 class="stage-title">{{ stateSectionTitle }}</h4>
          <div class="state-row">
            <WuiToggleSwitch
              v-model:is-on="soundSwitchOn"
              on-content="Sound On"
              off-content="Sound Off"
              aria-label="Sound On/Off"
            />
            <WuiSlider
              v-model="volumeNumber"
              class="volume-slider"
              :minimum="0"
              :maximum="1"
              :step-frequency="0.05"
              header="Volume"
            />
          </div>
          <p class="stage-note">
            State = {{ stateValue }} · Volume = {{ volumeNumber.toFixed(2) }}
            (Auto 在 WinUI 中仅 Xbox 出声;浏览器默认等效静音,可用下方 autoPlatformEnabled 模拟)
          </p>
        </section>

        <!-- 配置 2:官方 Play Specific System Sound 对照 —— 7 类系统音试听 -->
        <section class="stage-block">
          <h4 class="stage-title">{{ auditionSectionTitle }}</h4>
          <div class="audition-grid">
            <WuiButton
              v-for="kind in ELEMENT_SOUND_KINDS"
              :key="kind"
              class="audition-button"
              :aria-label="`试听 ${kind}`"
              @click="onAudition(kind)"
            >
              ▶ {{ kind }}
            </WuiButton>
          </div>
          <p class="stage-note">
            {{ lastPlayed === '' ? '点击按钮试听对应类别(合成近似音,非 Windows 原始 wav)' : `最近播放:${lastPlayed}` }}
          </p>
        </section>

        <!-- 配置 3:withSound 绑定真实交互(Show/Hide 配面板显隐,MoveNext/Previous 配翻页)-->
        <section class="stage-block">
          <h4 class="stage-title">{{ realDemoSectionTitle }}</h4>
          <div class="real-demo-row">
            <WuiButton :disabled="pageIndex <= 1" @click="onPrevious">上一张</WuiButton>
            <span class="page-readout">{{ pageIndex }} / {{ PAGE_COUNT }}</span>
            <WuiButton :disabled="pageIndex >= PAGE_COUNT" @click="onNext">下一张</WuiButton>
            <WuiButton @click="onGoBack">返回</WuiButton>
            <WuiButton @click="onSave">保存</WuiButton>
          </div>
          <div class="real-demo-row">
            <WuiButton @click="onShowPanel">显示面板(Show)</WuiButton>
            <WuiButton @click="onHidePanel">隐藏面板(Hide)</WuiButton>
          </div>
          <Transition name="panel">
            <div v-if="panelVisible" class="demo-panel">面板已显示 —— Show / Hide 音随显隐一同播放</div>
          </Transition>
          <p class="stage-note">已保存 {{ savedCount }} 次(Invoke)</p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="State(音效开关)" type="select" v-model="state" :options="STATE_CHOICES" />
        <DemoOptionRow label="Volume(音量 0–1)" type="slider" v-model="volume" :min="0" :max="1" :step="0.05" />
        <DemoOptionRow label="autoPlatformEnabled(模拟 Xbox,让 Auto 出声)" type="toggle" v-model="autoPlatform" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ apiTableTitle }}</h4>
      <DemoDocsTable :headers="apiHeaders" :rows="apiRows" />
      <h4 class="docs-subtitle">{{ kindsTableTitle }}</h4>
      <DemoDocsTable :headers="kindHeaders" :rows="kindRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="ts" />
    </template>
  </DemoPage>
</template>

<style scoped>
.sound-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 100%;
}

.stage-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.stage-title {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.state-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.volume-slider {
  width: 220px;
}

.stage-note {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  text-align: center;
}

/* 7 类试听按钮:两行栅格(官方示例为纵向 7 个按钮,这里收敛占位) */
.audition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, 150px);
  justify-content: center;
  gap: 8px;
}

.audition-button {
  justify-content: center;
}

/* withSound 真实按钮演示:多组按钮换行排布 */
.real-demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.page-readout {
  min-width: 56px;
  text-align: center;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* Show/Hide 演示面板:显隐伴随音效,视觉过渡用动效 token */
.demo-panel {
  padding: 12px 24px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.panel-enter-active,
.panel-leave-active {
  transition:
    opacity var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease-out),
    transform var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease-out);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
