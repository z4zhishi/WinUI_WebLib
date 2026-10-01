<script setup lang="ts">
// ImplicitTransition 示例页:对照官方 WinUI Gallery ImplicitTransitionPage 的五个示例 ——
//   Opacity(ScalarTransition + NumberBox/Set 按钮)、Rotation、Scale(0.5/1/2 预设 + Animate X/Y/Z 组件复选)、
//   Translation((0,0)/(100,100)/(200,200) 预设 + 组件复选)、Background(BrushTransition 蓝黄切换);
// 官方「改属性即动画」的心智模型 → 预设按钮直接改共享属性状态,过渡自动播放。
// 另提供:无过渡 vs 有过渡显式对照(transitions 空数组 = WinUI Transitions 默认)、
//   开关切换演示(ToggleSwitch 驱动通知卡片弹出/收起)、随机变更(任意属性变化均自动过渡)。
// 参数面板:过渡类型多选(对照官方 Animate X/Y/Z 组件复选框,粒度为过渡类型)+ 时长/延迟滑块 + 缓动下拉
//   (默认取 src/styles/animations.css token:normal 240ms + standard)。
import { computed, ref } from 'vue'
import WuiImplicitTransitions, {
  type ImplicitTransitionKind,
} from '@/components/ImplicitTransitions.vue'
import WuiToggleSwitch from '@/components/ToggleSwitch.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 参数面板(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
// 过渡类型多选:官方示例以 Components 复选框控制 Vector3 的 X/Y/Z 分量,
// Web 端粒度为过渡类型(五种各一开关);全部关闭 = Transitions 空(WinUI 默认,瞬时生效)。
const optKindOpacity = ref<string | number | boolean>(true)
const optKindTranslate = ref<string | number | boolean>(true)
const optKindScale = ref<string | number | boolean>(true)
const optKindRotation = ref<string | number | boolean>(true)
const optKindBackground = ref<string | number | boolean>(true)
const optDuration = ref<string | number | boolean>(240)
const optDelay = ref<string | number | boolean>(0)
const optEasing = ref<string | number | boolean>('standard')

const activeKinds = computed<ImplicitTransitionKind[]>(() => {
  const kinds: ImplicitTransitionKind[] = []
  if (optKindOpacity.value === true) kinds.push('opacity')
  if (optKindTranslate.value === true) kinds.push('translate')
  if (optKindScale.value === true) kinds.push('scale')
  if (optKindRotation.value === true) kinds.push('rotation')
  if (optKindBackground.value === true) kinds.push('background')
  return kinds
})

const durationMs = computed<number>(() => {
  const parsed = Number(optDuration.value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 240
})

const delayMs = computed<number>(() => {
  const parsed = Number(optDelay.value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
})

const easingValue = computed<string>(() => String(optEasing.value))

const easingOptions = [
  { label: 'standard(标准,入场默认)', value: 'standard' },
  { label: 'decelerate(减速,缓着陆)', value: 'decelerate' },
  { label: 'accelerate(加速,退出收拢)', value: 'accelerate' },
]

// —— 演示一:无过渡 vs 有过渡(共享属性状态,官方示例 1–5 的预设值)——
const OPACITY_PRESETS = [1, 0.5, 0.2]
const SCALE_PRESETS = [0.5, 1, 2]
const TRANSLATE_PRESETS: [number, number][] = [
  [0, 0],
  [100, 100],
  [200, 200],
]
const ROTATION_PRESETS = [0, 45, 180]
// 官方示例为 Blue ↔ Yellow 纯色切换;Web 端取强调色三档 token(字节序规则不涉及,var() 直透)
const BG_CHOICES = [
  'var(--wui-system-accent-color)',
  'var(--wui-system-accent-color-dark-1)',
  'var(--wui-system-accent-color-light-2)',
]

const animOpacity = ref(1)
const animScale = ref(1)
const animTranslateX = ref(0)
const animTranslateY = ref(0)
const animRotation = ref(0)
const bgIndex = ref(0)

const animBackground = computed<string>(
  () => BG_CHOICES[bgIndex.value % BG_CHOICES.length] ?? 'transparent',
)

function setTranslate(x: number, y: number): void {
  animTranslateX.value = x
  animTranslateY.value = y
}

function resetContrast(): void {
  animOpacity.value = 1
  animScale.value = 1
  animTranslateX.value = 0
  animTranslateY.value = 0
  animRotation.value = 0
  bgIndex.value = 0
}

// —— 演示二:开关切换(ToggleSwitch 驱动通知卡片弹出/收起)——
const switchOn = ref(false)

// —— 演示三:随机变更(独立状态,任意属性变化均触发隐式过渡)——
const rndOpacity = ref(1)
const rndScale = ref(1)
const rndTranslateX = ref(0)
const rndTranslateY = ref(0)
const rndRotation = ref(0)
const rndBgIndex = ref(0)

const rndBackground = computed<string>(
  () => BG_CHOICES[rndBgIndex.value % BG_CHOICES.length] ?? 'transparent',
)

function applyRandom(): void {
  rndOpacity.value = Math.round((0.15 + Math.random() * 0.85) * 100) / 100
  rndScale.value = Math.round((0.6 + Math.random() * 0.9) * 100) / 100
  rndTranslateX.value = Math.round(Math.random() * 160)
  rndTranslateY.value = Math.round(Math.random() * 110)
  rndRotation.value = Math.round(Math.random() * 40 - 20)
  rndBgIndex.value = Math.floor(Math.random() * BG_CHOICES.length)
}

function resetRandom(): void {
  rndOpacity.value = 1
  rndScale.value = 1
  rndTranslateX.value = 0
  rndTranslateY.value = 0
  rndRotation.value = 0
  rndBgIndex.value = 0
}

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propRows: (string | number)[][] = [
  [
    'transitions',
    "ImplicitTransitionKind[]('opacity' | 'translate' | 'scale' | 'rotation' | 'background')",
    '[]',
    '启用的过渡类型(对应 Transitions 集合 / 各 *Transition 属性);空数组 = 无过渡(WinUI 默认),属性变化瞬时生效',
  ],
  [
    'opacity',
    'number',
    '1',
    '不透明度 0–1(越界夹取),对应 UIElement.Opacity + OpacityTransition(ScalarTransition)',
  ],
  [
    'translateX / translateY',
    'number',
    '0',
    '平移(px),对应 UIElement.Translation.X/Y + TranslationTransition(Vector3Transition);Z 分量无 Web 对应',
  ],
  [
    'rotation',
    'number',
    '0',
    '旋转角度(度,绕元素中心),对应 UIElement.Rotation + RotationTransition(官方示例需先设 CenterPoint,Web 版固定 transform-origin: center)',
  ],
  [
    'scale',
    'number',
    '1',
    '等比缩放,对应 UIElement.Scale + ScaleTransition(X=Y=Z;WinUI 可按轴独立,Web 版 transform 合一)',
  ],
  [
    'background',
    'string',
    '—',
    '背景色(任意 CSS 颜色 / 变量),对应纯色 Background + BrushTransition;渐变画刷 CSS 不可过渡',
  ],
  [
    'duration',
    'number | string',
    "'normal'",
    '过渡时长(Web 增强):数字按 ms;fast / normal / slow → animations.css 时长 token(167/240/350ms);其余字符串原样。WinUI *Transition 不暴露时长(平台固定)',
  ],
  [
    'delay',
    'number | string',
    '0',
    '过渡延迟(Web 增强):数字按 ms,其余字符串原样',
  ],
  [
    'easing',
    'string',
    "'standard'",
    '缓动(Web 增强):standard / decelerate / accelerate → animations.css 缓动 token;其余(如 cubic-bezier(...))原样',
  ],
]

const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  [
    '—(无业务事件)',
    '—',
    '隐式过渡由属性变化驱动、自动播放,WinUI 无完成回调事件;Web 端如需结束时机可监听根元素原生 transitionend(非 WinUI API)',
  ],
]

const mappingHeaders = ['WinUI 概念', 'Web 映射', '说明']
const mappingRows: (string | number)[][] = [
  [
    'UIElement.Transitions 集合(OpacityTransition / TranslationTransition / ScaleTransition / RotationTransition / BackgroundTransition)',
    'transitions prop → CSS transition 属性集',
    '声明一次过渡,此后每次属性变化自动播放(无需调用动画 API)',
  ],
  [
    'ScalarTransition(Opacity / Rotation)',
    'transition: opacity / transform',
    '单值属性过渡',
  ],
  [
    'Vector3Transition(Translation / Scale,可按 X/Y/Z Components 掩码)',
    '同一条 transition: transform',
    'CSS transform 合一:translate / rotate / scale 共用一条过渡;启用任一类型即过渡全部 transform 变化,无法按轴(Components)独立',
  ],
  [
    'BrushTransition(纯色 Background)',
    'transition: background-color',
    '仅纯色可插值(官方 Blue ↔ Yellow 示例可 1:1);渐变画刷(background-image)CSS 不可过渡',
  ],
  [
    'UIElement.Opacity(0.0–1.0)',
    'opacity prop → CSS opacity',
    '两边越界均夹取;Opacity=0 仍参与命中测试(WinUI 与 Web 行为一致)',
  ],
  [
    'UIElement.Translation(Vector3,DIP)',
    'translateX / translateY → transform: translate()',
    'Z 分量无 Web 对应;数值单位 px(DIP ≈ CSS px)',
  ],
  [
    'UIElement.Rotation(度,绕 CenterPoint)',
    'rotation → transform: rotate()',
    '官方示例先设 CenterPoint=中心再改 Rotation;Web 版固定 transform-origin: center',
  ],
  ['UIElement.Scale(Vector3)', 'scale → transform: scale()', '等比缩放;WinUI 可 X/Y/Z 独立'],
  [
    '合成器隐式动画(时长/缓动平台固定,*Transition 不可配)',
    'duration / delay / easing 可配(Web 增强)',
    '默认取 animations.css token:normal 240ms + --wui-easing-standard;fast 167ms / slow 350ms',
  ],
  [
    '—(WinUI 无对应的系统级减少动态偏好)',
    'prefers-reduced-motion 自动降级',
    'animations.css 全局把过渡时长压至 0.01ms,过渡近似瞬时完成',
  ],
]

// 用法代码随当前参数/属性状态实时更新,直观展示「状态 → 代码」的映射。
const usageCode = computed(() => {
  const kindList = activeKinds.value.map((kind) => `'${kind}'`).join(', ')
  return `<WuiImplicitTransitions
  :transitions="[${kindList}]"
  :opacity="${animOpacity.value}"
  :translate-x="${animTranslateX.value}"
  :translate-y="${animTranslateY.value}"
  :scale="${animScale.value}"
  :rotation="${animRotation.value}"
  background="${animBackground.value}"
  :duration="${durationMs.value}"
  :delay="${delayMs.value}"
  easing="${easingValue.value}"
>
  <!-- 子元素即视觉内容;之后只改上面的属性,过渡自动播放 -->
</WuiImplicitTransitions>`
})
</script>

<template>
  <DemoPage wiki="ImplicitTransition"
    title="Implicit Transitions"
    description="使用隐式过渡在属性变化时自动播放动画:transitions 声明启用哪些过渡(Opacity / Translate / Scale / Rotation / Background),之后只管修改 opacity / translate / scale / rotation / background 等属性,过渡自动播放,无需调用动画 API。时长 / 延迟 / 缓动默认取 animations.css token。"
  >
    <template #demo>
      <div class="implicit-stage">
        <!-- 演示一:无过渡 vs 有过渡(显式对照;官方示例 1–5 的预设值) -->
        <section class="demo-group">
          <h3 class="group-title">无过渡 vs 有过渡(显式对照)</h3>
          <p class="group-note">
            两侧绑定同一组属性状态:点击下方按钮同时变更属性——右列按所选过渡与时长 / 延迟 /
            缓动自动播放,左列(transitions = [],即 WinUI Transitions 默认空)瞬时跳变。
            预设值对照官方示例:Opacity 0.5、Scale 0.5/1/2、Translation (100,100)/(200,200)、Rotation 45°、
            Background 纯色切换。
          </p>
          <div class="compare-grid">
            <figure class="compare-cell">
              <div class="stage-canvas">
                <WuiImplicitTransitions
                  class="demo-box"
                  :transitions="[]"
                  :opacity="animOpacity"
                  :translate-x="animTranslateX"
                  :translate-y="animTranslateY"
                  :scale="animScale"
                  :rotation="animRotation"
                  :background="animBackground"
                />
              </div>
              <figcaption class="compare-caption">
                无过渡(transitions = [],WinUI 默认)
              </figcaption>
            </figure>
            <figure class="compare-cell">
              <div class="stage-canvas">
                <WuiImplicitTransitions
                  class="demo-box"
                  :transitions="activeKinds"
                  :duration="durationMs"
                  :delay="delayMs"
                  :easing="easingValue"
                  :opacity="animOpacity"
                  :translate-x="animTranslateX"
                  :translate-y="animTranslateY"
                  :scale="animScale"
                  :rotation="animRotation"
                  :background="animBackground"
                />
              </div>
              <figcaption class="compare-caption">
                有过渡({{
                  activeKinds.length > 0 ? activeKinds.join(' / ') : '未启用任何类型'
                }})
              </figcaption>
            </figure>
          </div>
          <div class="preset-groups">
            <div class="preset-group">
              <span class="preset-label">Opacity</span>
              <button
                v-for="preset in OPACITY_PRESETS"
                :key="preset"
                type="button"
                class="mini-button"
                :class="{ active: animOpacity === preset }"
                @click="animOpacity = preset"
              >
                {{ preset }}
              </button>
            </div>
            <div class="preset-group">
              <span class="preset-label">Scale</span>
              <button
                v-for="preset in SCALE_PRESETS"
                :key="preset"
                type="button"
                class="mini-button"
                :class="{ active: animScale === preset }"
                @click="animScale = preset"
              >
                {{ preset }}
              </button>
            </div>
            <div class="preset-group">
              <span class="preset-label">Translation</span>
              <button
                v-for="[x, y] in TRANSLATE_PRESETS"
                :key="`${x},${y}`"
                type="button"
                class="mini-button"
                :class="{ active: animTranslateX === x && animTranslateY === y }"
                @click="setTranslate(x, y)"
              >
                ({{ x }}, {{ y }})
              </button>
            </div>
            <div class="preset-group">
              <span class="preset-label">Rotation</span>
              <button
                v-for="preset in ROTATION_PRESETS"
                :key="preset"
                type="button"
                class="mini-button"
                :class="{ active: animRotation === preset }"
                @click="animRotation = preset"
              >
                {{ preset }}°
              </button>
            </div>
            <div class="preset-group">
              <span class="preset-label">Background</span>
              <button
                v-for="(color, index) in BG_CHOICES"
                :key="color"
                type="button"
                class="swatch"
                :class="{ active: bgIndex === index }"
                :style="{ background: color }"
                :aria-label="`背景色 ${index + 1}`"
                @click="bgIndex = index"
              ></button>
            </div>
            <div class="preset-group">
              <button type="button" class="mini-button" @click="resetContrast">重置</button>
            </div>
          </div>
          <span class="state-chip" aria-live="polite">
            opacity = {{ animOpacity }} · translate = ({{ animTranslateX }}, {{ animTranslateY }})
            · scale = {{ animScale }} · rotation = {{ animRotation }}°
          </span>
        </section>

        <!-- 演示二:开关切换(ToggleSwitch 驱动) -->
        <section class="demo-group">
          <h3 class="group-title">开关切换演示</h3>
          <p class="group-note">
            ToggleSwitch 驱动通知卡片弹出 / 收起:isOn 变化 → opacity / translate / scale
            三个属性同时改变,隐式过渡自动组合播放。真实场景「只改属性,不管动画」的典型用法;
            opacity: 0 的卡片仍占位并可命中(WinUI Opacity=0 同),演示以 aria-hidden 同步可见性。
          </p>
          <div class="toggle-stage">
            <div class="toggle-stage-area">
              <WuiImplicitTransitions
                class="pop-card"
                :aria-hidden="!switchOn"
                :transitions="activeKinds"
                :duration="durationMs"
                :delay="delayMs"
                :easing="easingValue"
                :opacity="switchOn ? 1 : 0"
                :translate-x="switchOn ? 0 : 24"
                :translate-y="switchOn ? 0 : 8"
                :scale="switchOn ? 1 : 0.9"
              >
                <div class="pop-card-content">
                  <strong>隐式过渡通知</strong>
                  <span>只改属性,动画自动播放</span>
                </div>
              </WuiImplicitTransitions>
            </div>
            <WuiToggleSwitch v-model:is-on="switchOn" header="显示通知卡片" />
            <span class="state-chip" aria-live="polite">isOn = {{ switchOn }}</span>
          </div>
        </section>

        <!-- 演示三:随机变更(任意属性变化均自动过渡) -->
        <section class="demo-group">
          <h3 class="group-title">随机变更(任意属性变化均自动过渡)</h3>
          <p class="group-note">
            每次点击同时改变 opacity / translation / scale / rotation / background
            五个属性——已启用的过渡自动组合播放,未启用的属性瞬时跳变(可关掉面板中的类型开关对照)。
          </p>
          <div class="stage-canvas stage-canvas-sm">
            <WuiImplicitTransitions
              class="demo-box demo-box-lg"
              :transitions="activeKinds"
              :duration="durationMs"
              :delay="delayMs"
              :easing="easingValue"
              :opacity="rndOpacity"
              :translate-x="rndTranslateX"
              :translate-y="rndTranslateY"
              :scale="rndScale"
              :rotation="rndRotation"
              :background="rndBackground"
            >
              <span class="demo-box-text">opacity {{ rndOpacity.toFixed(2) }}</span>
            </WuiImplicitTransitions>
          </div>
          <div class="trigger-row">
            <button type="button" class="host-button" @click="applyRandom">随机变更属性</button>
            <button type="button" class="host-button" @click="resetRandom">重置</button>
            <span class="state-chip" aria-live="polite">
              translate = ({{ rndTranslateX }}, {{ rndTranslateY }}) · scale = {{ rndScale }} ·
              rotation = {{ rndRotation }}°
            </span>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="过渡 · Opacity" type="toggle" v-model="optKindOpacity" />
        <DemoOptionRow label="过渡 · Translate" type="toggle" v-model="optKindTranslate" />
        <DemoOptionRow label="过渡 · Scale" type="toggle" v-model="optKindScale" />
        <DemoOptionRow label="过渡 · Rotation" type="toggle" v-model="optKindRotation" />
        <DemoOptionRow label="过渡 · Background" type="toggle" v-model="optKindBackground" />
        <DemoOptionRow
          label="缓动 easing"
          type="select"
          v-model="optEasing"
          :options="easingOptions"
        />
        <DemoOptionRow
          label="时长 duration(ms;240 = --wui-duration-normal)"
          type="slider"
          v-model="optDuration"
          :min="0"
          :max="1000"
          :step="10"
        />
        <DemoOptionRow
          label="延迟 delay(ms)"
          type="slider"
          v-model="optDelay"
          :min="0"
          :max="500"
          :step="10"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">属性</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propRows" />
      <h3 class="docs-subtitle">事件</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">WinUI 隐式过渡 ↔ CSS transition 概念映射</h3>
      <DemoDocsTable :headers="mappingHeaders" :rows="mappingRows" />
      <h3 class="docs-subtitle">用法</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.implicit-stage {
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
  width: 100%;
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

/* —— 演示一:对照画布 —— */
.compare-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  width: 100%;
}

.compare-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.stage-canvas {
  position: relative;
  height: 300px;
  padding: 8px;
  overflow: hidden;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.stage-canvas-sm {
  height: 240px;
  width: 100%;
}

.compare-caption {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 被动画的方块:尺寸/圆角由使用方设定(等价 WinUI Width/Height),颜色经 background prop 注入 */
.demo-box {
  width: 64px;
  height: 64px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.demo-box-lg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
}

.demo-box-text {
  padding: 0 6px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-foreground-alt-high);
  text-align: center;
}

/* —— 预设按钮组(WinUI Button 观感)—— */
.preset-groups {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 24px;
}

.preset-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preset-label {
  min-width: 76px;
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.mini-button {
  height: 28px;
  padding: 3px 10px;
  font-family: inherit;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.mini-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.mini-button:active {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.mini-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

/* 当前生效的预设值(与被动画属性当前值一致) */
.mini-button.active {
  color: var(--wui-system-control-foreground-accent);
  border-color: var(--wui-system-accent-color);
}

.swatch {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.swatch:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.swatch.active {
  outline: 2px solid var(--wui-system-accent-color);
  outline-offset: 1px;
}

.state-chip {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示二:开关切换 —— */
.toggle-stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  width: 100%;
}

.toggle-stage-area {
  display: flex;
  flex: 1 1 260px;
  align-items: center;
  min-height: 88px;
  padding: 8px;
  background: var(--wui-application-page-background-theme);
  border: 1px dashed var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 通知卡片:底色/边框在内容层(包装层的 background prop 留给 background 过渡演示) */
.pop-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  color: var(--wui-application-foreground-theme);
}

.pop-card-content strong {
  font-size: var(--wui-control-content-theme-font-size);
}

.pop-card-content span {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 演示三:随机变更 —— */
.trigger-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.host-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 75px;
  height: 32px;
  padding: 5px 12px;
  font-family: inherit;
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.host-button:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.host-button:active {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.host-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
