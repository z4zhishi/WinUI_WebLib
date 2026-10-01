<script setup lang="ts">
// TeachingTipPage.vue —— TeachingTip 控件示例页(结构照抄 HomePage 母版)。
// 参数组合参照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/TeachingTip/TeachingTipPage.xaml:
//   ① TestButton1TeachingTip —— targeted + SymbolIconSource(Refresh)+ Title/Subtitle;
//   ② TestButton2TeachingTip —— non-targeted + Action/Close 按钮 + IsLightDismissEnabled
//      + PlacementMargin=20 + PreferredPlacement=Auto;
//   ③ TestButton3TeachingTip —— targeted + HeroContent(图片)+ Content + PreferredPlacement=Bottom。
// 另按任务补充:14 值 placement 全枚举轮播(targeted)、Closing 可取消演示、事件日志。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiTeachingTip from '@/components/TeachingTip.vue'
import type {
  TeachingTipCloseReasonValue,
  TeachingTipClosingArgs,
  TeachingTipPlacementModeValue,
} from '@/components/TeachingTip.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const title = ref<string | number | boolean>('This is the title')
const subtitle = ref<string | number | boolean>('And this is the subtitle')
const actionContent = ref<string | number | boolean>('Action button')
const closeContent = ref<string | number | boolean>('Close button')
const lightDismiss = ref<string | number | boolean>(true)
const tailVisibility = ref<string | number | boolean>('Auto')
const placementMargin = ref<string | number | boolean>(20)

const titleText = computed(() => String(title.value))
const subtitleText = computed(() => String(subtitle.value))
const actionText = computed(() => String(actionContent.value))
const closeText = computed(() => String(closeContent.value))
const lightDismissEnabled = computed(() => lightDismiss.value === true)
const tailVisibilityValue = computed(() => {
  const value = String(tailVisibility.value)
  return value === 'Visible' || value === 'Collapsed' ? value : 'Auto'
})
const placementMarginValue = computed(() => Math.max(0, Number(placementMargin.value) || 0))

const tailOptions = [
  { label: 'Auto(默认)', value: 'Auto' },
  { label: 'Visible', value: 'Visible' },
  { label: 'Collapsed', value: 'Collapsed' },
]

// —— placement 全枚举轮播(targeted;Auto + 四边 + 八角 + Center,对应 WinUI 枚举顺序)——
const PLACEMENTS: TeachingTipPlacementModeValue[] = [
  'Auto',
  'Top',
  'Bottom',
  'Left',
  'Right',
  'TopRight',
  'TopLeft',
  'BottomRight',
  'BottomLeft',
  'LeftTop',
  'LeftBottom',
  'RightTop',
  'RightBottom',
  'Center',
]
const placement = ref<string | number | boolean>('Auto')

const placementValue = computed<TeachingTipPlacementModeValue>(() => {
  const value = String(placement.value)
  return (PLACEMENTS as string[]).includes(value) ? (value as TeachingTipPlacementModeValue) : 'Auto'
})

const placementOptions = PLACEMENTS.map((value) => ({ label: value, value }))

// 副标题走 computed(模板特性表达式内的全角字符串模板字面量会触发 vue-tsc 解析缺陷)
const carouselSubtitle = computed(() => `当前放置位:${placementValue.value}`)

function stepPlacement(delta: number): void {
  const index = PLACEMENTS.indexOf(placementValue.value)
  const next = (index + delta + PLACEMENTS.length) % PLACEMENTS.length
  placement.value = PLACEMENTS[next] ?? 'Auto'
}

// —— 事件日志(官方示例无;任务补充:按钮 / 开关时序全程可见)——
interface LogEntry {
  id: number
  text: string
}
let logSeq = 0
const eventLog = ref<LogEntry[]>([])

function appendLog(text: string): void {
  logSeq += 1
  eventLog.value = [{ id: logSeq, text }, ...eventLog.value].slice(0, 6)
}

function onOpened(): void {
  appendLog('opened')
}

function onClosing(args: TeachingTipClosingArgs, source: string): void {
  appendLog(`closing(${args.reason}) ← ${source}`)
  if (cancelNextClose.value === true) {
    args.cancel = true
    appendLog('closing 已取消(Cancel = true → IsOpen 回滚 true)')
  }
}

function onClosed(reason: TeachingTipCloseReasonValue): void {
  appendLog(`closed(${reason})`)
}

function onActionButtonClick(): void {
  appendLog('actionButtonClick(不关泡)')
}

// Closing 可取消演示:开关打开时,下一次关闭一律被取消
const cancelNextClose = ref<string | number | boolean>(false)

// —— 各示例开关状态 ——
const basicOpen = ref(false) // 官方示例 ①
const carouselOpen = ref(false) // placement 轮播
const heroOpen = ref(false) // 官方示例 ③
const nonTargetedOpen = ref(false) // 官方示例 ②

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['title / subtitle', 'string', '标题(SemiBold)/ 副标题(WinUI Title / Subtitle)'],
  ['content', 'string', '正文(WinUI Content 的 string 形态);富内容用默认插槽,插槽优先'],
  ['target', 'HTMLElement | string | null', '目标元素(元素或 CSS 选择器);缺省 = non-targeted 视口浮层(WinUI Target)'],
  [
    'preferredPlacement',
    "'Auto' | 'Top' | 'Bottom' | 'Left' | 'Right' | 'TopRight' | 'TopLeft' | 'BottomRight' | 'BottomLeft' | 'LeftTop' | 'LeftBottom' | 'RightTop' | 'RightBottom' | 'Center'",
    '首选放置位(WinUI 全枚举);八角 = 尾巴中心恒指目标中心,气泡向象限展开',
  ],
  ['heroContentPlacement', "'Auto' | 'Top' | 'Bottom'", 'hero 内容位置;Auto 随放置位翻到背侧(WinUI HeroContentPlacement)'],
  ['actionButtonContent / closeButtonContent', 'string', '底部操作 / 关闭按钮文本;closeButtonContent 为空时改用右上角 ✕(WinUI ActionButtonContent / CloseButtonContent)'],
  ['isLightDismissEnabled', 'boolean', '外部按下即关,表面换亚克力近似底色(WinUI IsLightDismissEnabled);默认 false'],
  ['tailVisibility', "'Auto' | 'Visible' | 'Collapsed'", '尾巴可见性;Auto 时翻转/推回后够不到锚自动折叠(WinUI TailVisibility)'],
  ['placementMargin', 'number', '与锚 / 视口边的间距 px(WinUI PlacementMargin),默认 0'],
  ['shouldConstrainToRootBounds', 'boolean', 'non-targeted 是否推回视口内(WinUI ShouldConstrainToRootBounds),默认 true'],
  ['icon', 'SymbolValue', '图标(SymbolIcon 枚举名,如 Refresh);富图标用 #icon 插槽(WinUI IconSource)'],
  ['isOpen', 'boolean(v-model:is-open)', '开关状态双向绑定(WinUI IsOpen);初始 true 时挂载即开'],
  ['actionButtonClick / closeButtonClick', '() => void', '按钮点击;action 只通知不关泡,close 触发关闭时序(WinUI 同名事件)'],
  ['closing', '(args: { reason, cancel }) => void', '关闭前触发;args.cancel = true 可取消并回滚 IsOpen(WinUI ClosingEventArgs)'],
  ['closed', '(args: { reason }) => void', '关闭完成(出场动画后)触发,reason ∈ CloseButton / LightDismiss / Programmatic(WinUI Closed)'],
  ['opened', '() => void', '打开后触发(WinUI Opened)'],
  ['default / hero / icon slot', '—', '正文富内容 / hero 内容(边到边)/ 富图标'],
]

// 代码示例串里的 <script> 字样必须拆写:SFC 解析器把 script 块字符串里的
// '<script' 当作真实标签,导致 Invalid end tag(ToolTipPage 同源问题,已实测复现)。
const SCRIPT_OPEN = '<scr' + 'ipt setup lang="ts">'
const SCRIPT_CLOSE = '</scr' + 'ipt>'

const usageCode = computed(
  () => `${SCRIPT_OPEN}
import { ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiTeachingTip from '@/components/TeachingTip.vue'

const isOpen = ref(false)
${SCRIPT_CLOSE}

<template>
  <!-- targeted:锚定按钮,尾巴指向,placement 全枚举 -->
  <WuiButton id="show-tip">Show TeachingTip</WuiButton>
  <WuiTeachingTip
    v-model:is-open="isOpen"
    target="#show-tip"
    title="This is the title"
    subtitle="And this is the subtitle"
    preferred-placement="Bottom"
    icon="Refresh"
    action-button-content="Action button"
    close-button-content="Close button"
    :is-light-dismiss-enabled="true"
    :placement-margin="20"
    @action-button-click="onAction"
    @closed="onClosed"
  >
    <template #hero>
      <div class="hero">hero 内容(边到边)</div>
    </template>
    Description can go here
  </WuiTeachingTip>

  <!-- non-targeted:不传 target,视口居中浮层,无尾巴 -->
  <WuiTeachingTip
    v-model:is-open="nonTargetedOpen"
    title="Non-targeted"
    subtitle="不传 target 即视口浮层"
  />
</template>`,
)
</script>

<template>
  <DemoPage wiki="TeachingTip"
    title="TeachingTip"
    description="内容丰富的教学气泡:用于指引新手、讲解功能或给工作流补充上下文,不打断用户操作。可锚定目标元素(targeted,尾巴指向)或作为视口浮层(non-targeted)出现;支持 hero 大图、操作按钮与 light dismiss。"
  >
    <template #demo>
      <div class="teaching-stage">
        <!-- 官方示例 1 对照:targeted + 图标 + 标题/副标题(标题/副标题与参数面板联动) -->
        <div class="teaching-example">
          <WuiButton id="basic-target" @click="basicOpen = !basicOpen">
            {{ basicOpen ? '隐藏' : '显示' }} TeachingTip
          </WuiButton>
          <p class="teaching-caption">
            官方示例 ①:targeted + IconSource(Refresh)+ Title / Subtitle(右上角 ✕ 关闭)
          </p>
          <WuiTeachingTip
            v-model:is-open="basicOpen"
            target="#basic-target"
            :title="titleText"
            :subtitle="subtitleText"
            icon="Refresh"
            @opened="onOpened"
            @closing="(args) => onClosing(args, 'basic')"
            @closed="(args) => onClosed(args.reason)"
          />
        </div>

        <!-- placement 全枚举轮播(targeted):前/后切换,尾巴随放置位旋向 -->
        <div class="teaching-example">
          <div class="carousel-row">
            <WuiButton @click="stepPlacement(-1)">◀ 上一个</WuiButton>
            <WuiButton id="carousel-target" @click="carouselOpen = !carouselOpen">
              {{ carouselOpen ? '隐藏' : '显示' }} TeachingTip
            </WuiButton>
            <WuiButton @click="stepPlacement(1)">下一个 ▶</WuiButton>
          </div>
          <p class="teaching-caption">
            preferredPlacement = <code>{{ placementValue }}</code
            >({{ PLACEMENTS.length }} 值全枚举轮播;视口放不下自动翻转,尾巴随之旋向,小屏够不到锚自动折叠)
          </p>
          <WuiTeachingTip
            v-model:is-open="carouselOpen"
            target="#carousel-target"
            title="Placement tour"
            :subtitle="carouselSubtitle"
            icon="Refresh"
            :preferred-placement="placementValue"
            :tail-visibility="tailVisibilityValue"
            :placement-margin="Math.min(placementMarginValue, 20)"
            @opened="onOpened"
            @closing="(args) => onClosing(args, 'placement 轮泡')"
            @closed="(args) => onClosed(args.reason)"
          />
        </div>

        <!-- 官方示例 3 对照:hero 内容 + 正文(targeted Bottom) -->
        <div class="teaching-example">
          <WuiButton id="hero-target" @click="heroOpen = !heroOpen">
            {{ heroOpen ? '隐藏' : '显示' }} Hero TeachingTip
          </WuiButton>
          <p class="teaching-caption">
            官方示例 ③:targeted + #hero 插槽(PreferredPlacement = Bottom 时 hero 自动翻到底侧)
          </p>
          <WuiTeachingTip
            v-model:is-open="heroOpen"
            target="#hero-target"
            title="This is the title"
            subtitle="And this is the subtitle"
            preferred-placement="Bottom"
            @opened="onOpened"
            @closing="(args) => onClosing(args, 'hero')"
            @closed="(args) => onClosed(args.reason)"
          >
            <template #hero>
              <div class="hero-scene" role="img" aria-label="示例 hero 渐变图">
                <span class="hero-scene-sun" aria-hidden="true"></span>
                <span class="hero-scene-label">HERO CONTENT</span>
              </div>
            </template>
            <template #default>
              <span>Description can go here(默认插槽正文)</span>
            </template>
          </WuiTeachingTip>
        </div>

        <!-- 官方示例 2 对照:non-targeted + 双按钮 + light dismiss(按钮仅开:
             light dismiss 下「pointerdown 外部关闭 + click 再开」会互搏,关闭走
             外部按下 / Close 按钮 / 右上 ✕) -->
        <div class="teaching-example">
          <WuiButton @click="nonTargetedOpen = true">显示 Non-targeted TeachingTip(仅开)</WuiButton>
          <p class="teaching-caption">
            官方示例 ②:non-targeted(不传 target,视口居中浮层无尾巴)+ 双按钮 +
            IsLightDismissEnabled(外部按下即关,表面换亚克力近似底色)+ PlacementMargin={{
              placementMarginValue
            }};关闭走外部按下 / Close 按钮
          </p>
          <WuiTeachingTip
            v-model:is-open="nonTargetedOpen"
            :title="titleText"
            :subtitle="subtitleText"
            :action-button-content="actionText"
            :close-button-content="closeText"
            :is-light-dismiss-enabled="lightDismissEnabled"
            :placement-margin="placementMarginValue"
            @opened="onOpened"
            @closing="(args) => onClosing(args, 'non-targeted')"
            @closed="(args) => onClosed(args.reason)"
            @action-button-click="onActionButtonClick"
            @close-button-click="appendLog('closeButtonClick')"
          />
        </div>

        <!-- 事件日志 + Closing 可取消 -->
        <div class="teaching-example">
          <div class="log-row">
            <span class="log-title">事件日志</span>
            <label class="log-cancel-label">
              <input v-model="cancelNextClose" type="checkbox" />
              取消下一次 closing(Cancel = true)
            </label>
            <WuiButton @click="eventLog = []">清空</WuiButton>
          </div>
          <ul class="event-log">
            <li v-if="eventLog.length === 0" class="event-log-empty">— 暂无事件 —</li>
            <li v-for="entry in eventLog" :key="entry.id">{{ entry.text }}</li>
          </ul>
          <p class="teaching-caption">
            关闭时序:close 按钮 / 外部按下(light dismiss)/ 编程置 isOpen=false →
            closing(reason,可取消)→ 出场动画 → closed(reason)
          </p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Title" type="text" v-model="title" placeholder="This is the title" />
        <DemoOptionRow label="Subtitle" type="text" v-model="subtitle" placeholder="And this is the subtitle" />
        <DemoOptionRow label="ActionButtonContent" type="text" v-model="actionContent" />
        <DemoOptionRow label="CloseButtonContent" type="text" v-model="closeContent" />
        <DemoOptionRow label="IsLightDismissEnabled" type="toggle" v-model="lightDismiss" />
        <DemoOptionRow label="TailVisibility" type="select" v-model="tailVisibility" :options="tailOptions" />
        <DemoOptionRow
          label="PlacementMargin (px)"
          type="slider"
          :min="0"
          :max="48"
          :step="2"
          v-model="placementMargin"
        />
        <DemoOptionRow label="轮播 Placement" type="select" v-model="placement" :options="placementOptions" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.teaching-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.teaching-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.carousel-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.teaching-caption {
  margin: 0;
  max-width: 560px;
  text-align: center;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.teaching-caption code {
  color: var(--wui-default-text-foreground-theme);
}

/* hero 内容:纯 CSS 渐变场景(无本地图片资源;颜色取 accent token) */
.hero-scene {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  height: 120px;
  padding: 10px 12px;
  background: linear-gradient(
    180deg,
    var(--wui-system-accent-color-light-2, var(--wui-system-accent-color)) 0%,
    var(--wui-system-accent-color) 100%
  );
}

.hero-scene-sun {
  position: absolute;
  top: 18px;
  right: 22px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--wui-system-control-alt-high);
  opacity: 0.9;
}

.hero-scene-label {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--wui-system-control-alt-high);
}

/* —— 事件日志区 —— */
.log-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.log-title {
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-default-text-foreground-theme);
}

.log-cancel-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  cursor: pointer;
}

.event-log {
  margin: 0;
  min-width: 320px;
  max-width: 460px;
  min-height: 96px;
  padding: 10px 14px;
  list-style: none;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  font-family: Consolas, Menlo, monospace;
  color: var(--wui-default-text-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.event-log li + li {
  margin-top: 4px;
}

.event-log-empty {
  color: var(--wui-application-secondary-foreground-theme);
}
</style>
