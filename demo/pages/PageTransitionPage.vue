<script setup lang="ts">
// PageTransition 示例页:对照官方 WinUI Gallery PageTransitionPage + ThemeTransitionPage。
// 第一节「页面转场」:复刻官方 ContentFrame.Navigate 演示 —— 内置 Frame
// (NavigationThemeTransition)在 SamplePage1/SamplePage2 两个假想页间前进/后退,
// 转场种类单选(Default / Entrance / DrillIn / Suppress / Slide from Right|Left|Bottom|Top /
// Common / Continuum,官方 8 种 + 纵滑两种),并实时显示对应的 NavigationTransitionInfo 代码
// (官方 ControlExampleSubstitution 的等价物)。动画参数逐条对照
// CK/WinUI-Reference/dxaml/phone/lib/ThemeTransitions.cpp(见 animations.css wui-nav-* 段行号)。
// 第二节「主题过渡(ThemeTransition,含明暗切换元素过渡)」:对照官方 ThemeTransitionPage
// 五例中的四个 —— 入场 stagger(EntranceThemeTransition,Add one/Add five/Clear all)、
// Reposition(布局重排,FLIP)、Content(内容刷新淡入)、AddDelete(列表增删滑入收合);
// 另加 Web 增强的「明暗切换元素过渡」:切换 html[data-theme] 时主题色经过渡渐变
// (DemoPage 顶部预览切换的同机制,站点级预览)。
import { computed, nextTick, ref } from 'vue'
import WuiNavigationThemeTransition from '@/components/NavigationThemeTransition.vue'
import WuiEntranceNavigationThemeTransition from '@/components/EntranceNavigationThemeTransition.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import {
  CONNECTED_ANIMATION_EASINGS,
  NAVIGATION_TRANSITION_KINDS,
  isNavigationTransitionKind,
  supportsViewTransitions,
} from '@/utils/transitions'
import type { NavigationTransitionKind } from '@/utils/transitions'

// —— 第一节:页面转场 ——
// DemoOptionRow 的 v-model 契约要求联合类型;select 值经 isNavigationTransitionKind 收窄。
const optNavKind = ref<string | number | boolean>('default')
const navKind = computed<NavigationTransitionKind>(() =>
  isNavigationTransitionKind(optNavKind.value) ? optNavKind.value : 'default',
)

const NAV_KIND_OPTIONS = NAVIGATION_TRANSITION_KINDS.map((kind) => ({ value: kind, label: kind }))
const NAV_KIND_WINUI_INFO: Record<NavigationTransitionKind, string> = {
  default: '(缺省)',
  entrance: 'new EntranceNavigationTransitionInfo()',
  drillIn: 'new DrillInNavigationTransitionInfo()',
  suppress: 'new SuppressNavigationTransitionInfo()',
  slideFromRight: 'new SlideNavigationTransitionInfo() { Effect = FromRight }',
  slideFromLeft: 'new SlideNavigationTransitionInfo() { Effect = FromLeft }',
  slideFromBottom: 'new SlideNavigationTransitionInfo() { Effect = FromBottom }',
  slideFromTop: 'new SlideNavigationTransitionInfo() { Effect = FromTop }',
  common: 'new CommonNavigationTransitionInfo()',
  continuum: 'new ContinuumNavigationTransitionInfo()',
}

// Frame 导航模型:backStack 保存来路页,current 为当前页(0/1 两个假想页交替,同官方)。
const frameCurrent = ref(0)
const frameBackStack = ref<number[]>([])
const frameDirection = ref<'forward' | 'backward'>('forward')
const frameSeq = ref(0)
const frameViewKey = computed(() => `frame-view-${frameSeq.value}`)

function navigateForward(): void {
  frameBackStack.value.push(frameCurrent.value)
  frameCurrent.value = 1 - frameCurrent.value
  frameDirection.value = 'forward'
  frameSeq.value += 1
}

function navigateBackward(): void {
  const previous = frameBackStack.value.pop()
  if (previous === undefined) return
  frameCurrent.value = previous
  frameDirection.value = 'backward'
  frameSeq.value += 1
}

const frameCanGoBack = computed(() => frameBackStack.value.length > 0)

// —— 第二节 · 例 1:入场 stagger(官方 EntranceStackPanel 示例)——
const optEntranceStagger = ref<string | number | boolean>(true)
const optEntranceInterval = ref<string | number | boolean>(67)
const optEntranceOffsetY = ref<string | number | boolean>(28)
const entranceTrigger = ref(0)
const entranceBlocks = ref<number[]>([0, 1, 2, 3, 4])
let entranceNextId = 5

const entranceStaggerEnabled = computed(() => optEntranceStagger.value === true)
const entranceInterval = computed(() => {
  const parsed = Number(optEntranceInterval.value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 67
})
const entranceOffsetY = computed(() => {
  const parsed = Number(optEntranceOffsetY.value)
  return Number.isFinite(parsed) ? parsed : 28
})

function entranceAddOne(): void {
  entranceBlocks.value.push(entranceNextId)
  entranceNextId += 1
}

function entranceAddFive(): void {
  for (let i = 0; i < 5; i += 1) entranceAddOne()
}

function entranceClear(): void {
  entranceBlocks.value = []
}

function entranceReplay(): void {
  if (entranceBlocks.value.length === 0) {
    entranceAddFive()
    return
  }
  entranceTrigger.value += 1
}

// —— 第二节 · 例 2:Reposition(官方 RepositionThemeTransition 示例,FLIP 实现)——
// 官方:仅蓝色矩形声明 RepositionThemeTransition,点击 Reposition 后绿色挪位、蓝色滑入补位。
// Web:布局位置变化无 CSS 过渡通道,对「声明了过渡」的蓝色块做 FLIP(记录旧位 → 重排 →
// 反向位移 → 过渡归零),其余块瞬时跳变(与官方行为一致)。
const repositionContainer = ref<HTMLElement | null>(null)
const repositionOrder = ref([0, 1, 2])
const REPOSITION_EASING = CONNECTED_ANIMATION_EASINGS.basic // standard token(时间线取 normal 档)

function flipReposition(): void {
  const root = repositionContainer.value
  const moving = root?.querySelector<HTMLElement>('[data-reposition-block]')
  if (!root || !moving) return
  const firstRect = moving.getBoundingClientRect()
  // 把中间块(id 1)挪到末尾,蓝色块(id 2)从右滑入中间补位。
  repositionOrder.value = [repositionOrder.value[0], repositionOrder.value[2], repositionOrder.value[1]]
  void nextTick(() => {
    const lastRect = moving.getBoundingClientRect()
    const dx = firstRect.left - lastRect.left
    const dy = firstRect.top - lastRect.top
    if (dx === 0 && dy === 0) return
    moving.style.transition = 'none'
    moving.style.transform = `translate(${dx}px, ${dy}px)`
    requestAnimationFrame(() => {
      moving.style.transition = `transform var(--wui-duration-normal) ${REPOSITION_EASING}`
      moving.style.transform = ''
    })
  })
}

// —— 第二节 · 例 3:Content 内容刷新(官方 ContentThemeTransition 示例)——
const CONTENT_SOURCE = [
  '内容过渡(ContentThemeTransition)',
  '刷新数据时旧内容淡出、新内容淡入',
  '列表视图的数据集整体替换是最典型场景',
  'WinUI 挂在 ItemContainerTransitions 上',
  'Web 端复用 animations.css 的 wui-fade-in / wui-fade-out',
]
const contentEpoch = ref(0)
const contentRows = computed(() => {
  const shift = contentEpoch.value % CONTENT_SOURCE.length
  return CONTENT_SOURCE.map((_, index) => CONTENT_SOURCE[(index + shift) % CONTENT_SOURCE.length])
})

function contentRefresh(): void {
  contentEpoch.value += 1
}

// —— 第二节 · 例 4:AddDelete 增删(官方 AddDeleteThemeTransition 示例)——
const adItems = ref<{ id: number; label: string }[]>([
  { id: 0, label: '条目 0' },
  { id: 1, label: '条目 1' },
  { id: 2, label: '条目 2' },
])
let adNextId = 3

function adAdd(): void {
  adItems.value.push({ id: adNextId, label: `条目 ${adNextId}` })
  adNextId += 1
}

function adDelete(): void {
  if (adItems.value.length > 0) adItems.value.pop()
}

function adAddAndDelete(): void {
  adAdd()
  adDelete()
}

// —— 第二节 · 例 5:明暗切换元素过渡(Web 增强)——
// 切换 html[data-theme](与 DemoPage 顶部预览同一机制,站点级预览;
// 壳层按偏好再次切档时覆写,属预期)。本卡片内元素声明 color/background/border 过渡,
// 主题切换即播放渐变,而不是瞬时跳变。
const swapTheme = ref<'light' | 'dark'>(
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
)

function applySwapTheme(theme: 'light' | 'dark'): void {
  swapTheme.value = theme
  document.documentElement.dataset.theme = theme
}

// —— 支持度(明暗节附注:View Transitions 降级说明在 ConnectedAnimation 页)——
const viewTransitionsSupported = supportsViewTransitions()

// —— 下半区固定开发文档 ——
const navPropsHeaders = ['属性', '类型', '默认值', '说明']
const navPropRows: (string | number)[][] = [
  [
    'viewKey',
    'string | number',
    '—(必填)',
    '视图键(等价 Frame 导航目标):变化即播放一次页面转场,slot 内容随之切换',
  ],
  [
    'defaultNavigationTransitionInfo',
    "NavigationTransitionKind('default' | 'entrance' | 'drillIn' | 'suppress' | 'slideFromRight' | 'slideFromLeft' | 'slideFromBottom' | 'slideFromTop' | 'common' | 'continuum')",
    "'default'",
    '转场种类(等价 NavigationThemeTransition.DefaultNavigationTransitionInfo,各值对应一个 NavigationTransitionInfo 子类);default 与 entrance 同为缺省入场',
  ],
  [
    'direction',
    "'forward' | 'backward'",
    "'forward'",
    '导航方向(等价 NavigationMode,决定进/退镜像动画;Web 增强 —— WinUI 由导航 API 内部决定)',
  ],
]

const navEventHeaders = ['事件', '参数', '触发时机']
const navEventRows: (string | number)[][] = [
  ['—(无业务事件)', '—', '页面转场为声明式动画,WinUI NavigationThemeTransition 无完成回调事件'],
]

const mappingHeaders = ['WinUI(NavigationTransitionInfo)', 'Web kind', '动画规格(源码实测)', '源出处']
const mappingRows: (string | number)[][] = [
  [
    'EntranceNavigationTransitionInfo(缺省)',
    'default / entrance',
    '进页:淡入 + 上浮 140px(前 150ms 隐藏,150-450ms 标准曲线);离页淡出 150ms;退导航镜像',
    'ThemeTransitions.cpp L3141-L3186',
  ],
  [
    'SlideNavigationTransitionInfo(Effect FromRight/FromLeft)',
    'slideFromRight / slideFromLeft',
    '横滑:进页从 ±200px 滑入(150ms 隐藏 + 300ms 标准曲线);离页向反向 150px 滑出并淡出 150ms',
    'ThemeTransitions.cpp L1543-L1601',
  ],
  [
    'SlideNavigationTransitionInfo(Effect FromBottom/FromTop)',
    'slideFromBottom / slideFromTop',
    '纵滑:进页从 ±200px 升入(250ms 隐藏 + 350ms 指数缓出 → decelerate token);离页 250ms 被覆盖淡出',
    'NavigateTransitionHelper.h L139-L144',
  ],
  [
    'DrillInNavigationTransitionInfo',
    'drillIn',
    '进页 scale 0.94→1(783ms)+ 淡入 333ms;离页 scale 1→1.04 + 淡出 100ms;退导航镜像(1.06→1 / 1→0.96)',
    'ThemeTransitions.cpp L2830-L2987',
  ],
  [
    'CommonNavigationTransitionInfo',
    'common',
    'Turnstile 旋转门:进页绕侧缘 rotateY -80°→0(128ms 隐藏 + 556ms 指数缓出);离页 0→50° / 128ms',
    'ThemeTransitions.cpp L557-L880',
  ],
  [
    'ContinuumNavigationTransitionInfo',
    'continuum',
    '背景层 scale 0.9→1 + 淡入 350ms;目标元素飞行需 ConnectedAnimation 协同(Web 未映射)',
    'ThemeTransitions.cpp L1826-L1910',
  ],
  [
    'SuppressNavigationTransitionInfo',
    'suppress',
    '无动画,内容即时切换',
    'ThemeTransitions.cpp L3075',
  ],
]

const entrancePropsHeaders = ['属性', '类型', '默认值', '说明']
const entrancePropRows: (string | number)[][] = [
  [
    'fromHorizontalOffset',
    'number',
    '0',
    '入场起点水平偏移 px(WinUI FromHorizontalOffset)',
  ],
  [
    'fromVerticalOffset',
    'number',
    '28',
    '入场起点垂直偏移 px(WinUI FromVerticalOffset;正值 = 从下方上浮。WinUI 缺省值由 ThemeGenerator 内定,CK 无公开常量;页面级导航入场源码实测 140px)',
  ],
  [
    'isStaggeringEnabled',
    'boolean',
    'true',
    '子元素是否错峰入场(WinUI IsStaggeringEnabled;官方示例显式置 True)',
  ],
  [
    'staggerInterval',
    'number',
    '67',
    '错峰间隔 ms(Web 增强,平台内定不可配)',
  ],
  [
    'duration',
    "number | 'fast' | 'normal' | 'slow'",
    "'normal'",
    '单元素入场时长(Web 增强);fast/normal/slow → animations.css 时长 token(167/240/350ms)',
  ],
  ["easing", 'string', "'standard'", '入场缓动(Web 增强);standard/decelerate/accelerate → animations.css 缓动 token'],
  ['trigger', 'string | number', '—', '触发键:变化时对当前全部子元素重放入场(Web 增强)'],
]

const themeFamilyHeaders = ['WinUI ThemeTransition 家族', '官方示例', 'Web 映射(本页)']
const themeFamilyRows: (string | number)[][] = [
  [
    'EntranceThemeTransition(ChildrenTransitions + IsStaggeringEnabled)',
    'Add one / Add five / Clear all',
    'EntranceNavigationThemeTransition 组件:MutationObserver 监听子元素,按批次错峰上浮入场',
  ],
  [
    'RepositionThemeTransition',
    'Reposition',
    '布局位置变化无 CSS 过渡通道,对声明过渡的元素做 FLIP(位移反向 → 过渡归零)',
  ],
  [
    'ContentThemeTransition',
    'Refresh data',
    '整组内容替换,复用 animations.css 的 wui-fade-in / wui-fade-out(fast 档淡入淡出)',
  ],
  [
    'AddDeleteThemeTransition',
    'Add / Delete / Add and Del',
    'TransitionGroup:新条目 ±32px 滑入(motion-notes 列表位移规格 333ms)、旧条目滑出,兄弟条目 move 过渡补位',
  ],
  [
    'PopupThemeTransition',
    '(弹层开合)',
    '由 Popup / MenuFlyout 等弹层组件承担(animations.css wui-flyout-in 系),本页不重复',
  ],
]

const navUsageCode = computed(() => {
  const info = NAV_KIND_WINUI_INFO[navKind.value]
  return `import NavigationThemeTransition from '@/components/NavigationThemeTransition.vue'

<NavigationThemeTransition
  :view-key="frameSeq"
  default-navigation-transition-info="${navKind.value}"
  :direction="frameDirection"
>
  <SamplePage :n="frameCurrent" />
</NavigationThemeTransition>

<!-- WinUI 等价:ContentFrame.Navigate(page, null${info === '(缺省)' ? '' : `, ${info}`}) -->`
})

// script 结束标签用拼接构造,避免 SFC 解析器把代码示例里的标签当成自身块结束。
const SCRIPT_CLOSE = '</' + 'script>'

const routerUsageCode = `<script setup lang="ts">
import { getNavigationTransition } from '@/utils/transitions'
${SCRIPT_CLOSE}

<template>
  <router-view v-slot="{ Component, route }">
    <Transition v-bind="getNavigationTransition(kind, direction)">
      <div class="wui-nav-frame" :key="route.fullPath">
        <component :is="Component" />
      </div>
    </Transition>
  </router-view>
</template>`

const entranceUsageCode = computed(
  () => `<EntranceNavigationThemeTransition
  :from-vertical-offset="${entranceOffsetY.value}"
  :is-staggering-enabled="${entranceStaggerEnabled.value}"
  :stagger-interval="${entranceInterval.value}"
>
  <div v-for="block in blocks" :key="block.id" class="block">{{ block.label }}</div>
</EntranceNavigationThemeTransition>`,
)
</script>

<template>
  <DemoPage wiki="PageTransition"
    title="Page Transitions"
    description="页面转场为导航提供页面间关系的视觉反馈:NavigationThemeTransition 挂在 Frame(或路由出口)上,由 NavigationTransitionInfo 决定具体动画 —— 缺省入场(淡入 + 上浮)、DrillIn(缩放)、Slide(滑入,横/纵)、Common(Turnstile 旋转门)、Continuum、Suppress(无动画)。参数逐条对照 WinUI 源码 ThemeTransitions.cpp,缓动取 animations.css token。"
  >
    <template #demo>
      <div class="pt-stage">
        <!-- ===== 第一节:页面转场(官方 PageTransitionPage 复刻)===== -->
        <section class="demo-group">
          <h4 class="group-title">页面转场(NavigationThemeTransition + NavigationTransitionInfo)</h4>
          <p class="group-note">
            对照官方 ContentFrame.Navigate 演示:下方 Frame 在两个假想页间前进 / 后退,转场按所选
            NavigationTransitionInfo 播放。选中种类后点「前进 / 后退」观察;前进 = push,后退 =
            GoBack(播放退导航镜像)。
          </p>
          <div class="frame-host">
            <WuiNavigationThemeTransition
              class="frame"
              :view-key="frameViewKey"
              :default-navigation-transition-info="navKind"
              :direction="frameDirection"
            >
              <article v-if="frameCurrent === 0" class="frame-page">
                <span class="frame-page-eyebrow">SamplePage 1</span>
                <h5 class="frame-page-title">页面一:入场</h5>
                <p class="frame-page-text">
                  缺省转场(EntranceNavigationTransitionInfo)为新页淡入并上浮 140px,旧页淡出
                  150ms 让位 —— 与 Windows 系统级页面转场一致。
                </p>
                <div class="frame-page-block block-accent"></div>
              </article>
              <article v-else class="frame-page">
                <span class="frame-page-eyebrow">SamplePage 2</span>
                <h5 class="frame-page-title">页面二:镜像</h5>
                <p class="frame-page-text">
                  后退(GoBack)播放镜像动画:进页与离页的位移 / 缩放方向反转,由 direction
                  参数选择 wui-nav-*-back-* 关键帧。
                </p>
                <div class="frame-page-block block-accent-dark"></div>
              </article>
            </WuiNavigationThemeTransition>
          </div>
          <div class="trigger-row">
            <button type="button" class="host-button" @click="navigateForward">前进 Navigate</button>
            <button type="button" class="host-button" :disabled="!frameCanGoBack" @click="navigateBackward">
              后退 GoBack
            </button>
            <span class="state-chip" aria-live="polite">
              当前 {{ frameCurrent === 0 ? 'SamplePage 1' : 'SamplePage 2' }} · 返回栈深度
              {{ frameBackStack.length }}
            </span>
          </div>
          <code class="info-chip" aria-live="polite">
            NavigationTransitionInfo = {{ NAV_KIND_WINUI_INFO[navKind] }}
          </code>
        </section>

        <!-- ===== 第二节:ThemeTransition 家族(官方 ThemeTransitionPage 复刻)+ 明暗切换 ===== -->
        <section class="demo-group">
          <h4 class="group-title">主题过渡(ThemeTransition 家族)</h4>
          <p class="group-note">
            Theme transitions 是预打包的即用型动画:对照官方 ThemeTransitionPage 的四个示例
            (入场 stagger / Reposition / Content / AddDelete),另加 Web 增强的明暗切换元素过渡。
          </p>

          <!-- 例 1:入场 stagger -->
          <div class="sub-demo">
            <h5 class="sub-title">例 1 · 入场 stagger(EntranceThemeTransition)</h5>
            <p class="group-note">
              容器声明 ChildrenTransitions 后,首次出现与新增的子元素按批次错峰上浮;点「重放」
              等价容器重新挂载。
            </p>
            <WuiEntranceNavigationThemeTransition
              class="entrance-row"
              :from-vertical-offset="entranceOffsetY"
              :is-staggering-enabled="entranceStaggerEnabled"
              :stagger-interval="entranceInterval"
              :trigger="entranceTrigger"
            >
              <span
                v-for="block in entranceBlocks"
                :key="block"
                class="entrance-block"
                :class="block % 2 === 0 ? 'block-accent' : 'block-accent-light'"
              ></span>
            </WuiEntranceNavigationThemeTransition>
            <div class="trigger-row">
              <button type="button" class="mini-button" @click="entranceAddOne">Add one</button>
              <button type="button" class="mini-button" @click="entranceAddFive">Add five</button>
              <button type="button" class="mini-button" @click="entranceClear">Clear all</button>
              <button type="button" class="mini-button" @click="entranceReplay">重放</button>
              <span class="state-chip" aria-live="polite">当前 {{ entranceBlocks.length }} 个方块</span>
            </div>
          </div>

          <!-- 例 2:Reposition(FLIP) -->
          <div class="sub-demo">
            <h5 class="sub-title">例 2 · Reposition(布局重排)</h5>
            <p class="group-note">
              官方仅蓝色矩形声明 RepositionThemeTransition:点击 Reposition 后绿色块瞬时挪位、
              蓝色块滑入补位 —— Web 以 FLIP 只动画「声明了过渡」的元素,其余瞬时跳变。
            </p>
            <div ref="repositionContainer" class="reposition-row">
              <span
                v-for="id in repositionOrder"
                :key="id"
                class="entrance-block entrance-block-lg"
                :class="id === 2 ? 'block-accent-dark' : id === 1 ? 'block-accent' : 'block-accent-light'"
                :data-reposition-block="id === 2 ? '' : undefined"
              ></span>
            </div>
            <div class="trigger-row">
              <button type="button" class="mini-button" @click="flipReposition">Reposition</button>
              <button type="button" class="mini-button" @click="repositionOrder = [0, 1, 2]">复原</button>
            </div>
          </div>

          <!-- 例 3:Content 内容刷新 -->
          <div class="sub-demo">
            <h5 class="sub-title">例 3 · Content(内容刷新淡入淡出)</h5>
            <p class="group-note">
              官方把 ContentThemeTransition 挂在 ItemContainerTransitions 上,数据刷新时自动
              播放;Web 端对整组内容做 out-in 淡出淡入(animations.css wui-fade-* 工具类)。
            </p>
            <div class="content-panel">
              <Transition
                mode="out-in"
                enter-active-class="wui-anim-fade-in"
                leave-active-class="wui-anim-fade-out"
              >
                <ul :key="contentEpoch" class="content-list">
                  <li v-for="(row, index) in contentRows" :key="`${contentEpoch}-${index}`" class="content-row">
                    {{ row }}
                  </li>
                </ul>
              </Transition>
            </div>
            <div class="trigger-row">
              <button type="button" class="mini-button" @click="contentRefresh">Refresh data</button>
              <span class="state-chip" aria-live="polite">已刷新 {{ contentEpoch }} 次</span>
            </div>
          </div>

          <!-- 例 4:AddDelete 增删 -->
          <div class="sub-demo">
            <h5 class="sub-title">例 4 · AddDelete(列表增删滑入收合)</h5>
            <p class="group-note">
              新条目从左侧 ±32px 处滑入(motion-notes 列表位移规格:±32px、333ms、standard),
              删除条目向右滑出并由兄弟条目补位;对应官方 Add / Delete / Add and Del 三按钮。
            </p>
            <div class="content-panel">
              <TransitionGroup
                tag="ul"
                class="ad-list"
                move-class="ad-move"
                enter-active-class="ad-enter-active"
                enter-from-class="ad-enter-from"
                leave-active-class="ad-leave-active"
                leave-to-class="ad-leave-to"
              >
                <li v-for="item in adItems" :key="item.id" class="ad-item">{{ item.label }}</li>
              </TransitionGroup>
            </div>
            <div class="trigger-row">
              <button type="button" class="mini-button" @click="adAdd">Add</button>
              <button type="button" class="mini-button" :disabled="adItems.length === 0" @click="adDelete">
                Delete
              </button>
              <button type="button" class="mini-button" @click="adAddAndDelete">Add and Del</button>
              <span class="state-chip" aria-live="polite">当前 {{ adItems.length }} 条</span>
            </div>
          </div>

          <!-- 例 5:明暗切换元素过渡(Web 增强) -->
          <div class="sub-demo">
            <h5 class="sub-title">例 5 · 明暗切换元素过渡(Web 增强)</h5>
            <p class="group-note">
              切换下方明 / 暗:卡片内元素的颜色、边框、底色经 240ms(normal 档)渐变到新主题,
              而不是瞬时跳变。切换写 html[data-theme](与页头预览同一机制,站点级预览)。
            </p>
            <div class="swap-stage">
              <div class="swap-card">
                <h6 class="swap-card-title">主题过渡卡片</h6>
                <p class="swap-card-text">
                  本卡片所有主题值都走 --wui-* token,并声明 background-color / color /
                  border-color 过渡;明暗切换时你能看到颜色渐变过程。
                </p>
                <span class="swap-chip">token 驱动的渐变</span>
              </div>
              <div class="theme-toggle" role="group" aria-label="明暗切换预览">
                <button
                  type="button"
                  class="mini-button"
                  :class="{ active: swapTheme === 'light' }"
                  :aria-pressed="swapTheme === 'light'"
                  @click="applySwapTheme('light')"
                >
                  明
                </button>
                <button
                  type="button"
                  class="mini-button"
                  :class="{ active: swapTheme === 'dark' }"
                  :aria-pressed="swapTheme === 'dark'"
                  @click="applySwapTheme('dark')"
                >
                  暗
                </button>
              </div>
            </div>
          </div>

          <p class="group-note">
            附注:ConnectedAnimation(共享元素飞入)见 <router-link class="inline-link" to="/connectedanimation">Connected Animation 页</router-link>;
            当前浏览器对 View Transitions API 的支持:{{ viewTransitionsSupported ? '支持' : '不支持(即时切换降级)' }}。
          </p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          label="转场种类 defaultNavigationTransitionInfo"
          type="select"
          v-model="optNavKind"
          :options="NAV_KIND_OPTIONS"
        />
        <DemoOptionRow label="入场 stagger(IsStaggeringEnabled)" type="toggle" v-model="optEntranceStagger" />
        <DemoOptionRow
          label="错峰间隔 staggerInterval(ms)"
          type="slider"
          v-model="optEntranceInterval"
          :min="0"
          :max="200"
          :step="1"
        />
        <DemoOptionRow
          label="入场偏移 fromVerticalOffset(px)"
          type="slider"
          v-model="optEntranceOffsetY"
          :min="0"
          :max="140"
          :step="1"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">NavigationThemeTransition 属性</h4>
      <DemoDocsTable :headers="navPropsHeaders" :rows="navPropRows" />
      <h4 class="docs-subtitle">NavigationThemeTransition 事件</h4>
      <DemoDocsTable :headers="navEventHeaders" :rows="navEventRows" />
      <h4 class="docs-subtitle">NavigationTransitionInfo ↔ Web 转场对照(源码实测)</h4>
      <DemoDocsTable :headers="mappingHeaders" :rows="mappingRows" />
      <h4 class="docs-subtitle">EntranceNavigationThemeTransition 属性(内容入场 stagger)</h4>
      <DemoDocsTable :headers="entrancePropsHeaders" :rows="entrancePropRows" />
      <h4 class="docs-subtitle">ThemeTransition 家族 ↔ 本页实现</h4>
      <DemoDocsTable :headers="themeFamilyHeaders" :rows="themeFamilyRows" />
      <h4 class="docs-subtitle">用法</h4>
      <DemoCode :code="navUsageCode" language="vue" />
      <DemoCode :code="routerUsageCode" language="vue" />
      <DemoCode :code="entranceUsageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.pt-stage {
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

.sub-demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 12px;
  border: 1px dashed var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.sub-title {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

/* —— 第一节:Frame —— */
.frame-host {
  width: 100%;
}

.frame {
  min-height: 280px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.frame-page {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-height: 278px;
  padding: 20px;
}

.frame-page-eyebrow {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.frame-page-title {
  margin: 0;
  font-size: var(--wui-text-style-large-font-size);
  color: var(--wui-application-header-foreground-theme);
}

.frame-page-text {
  margin: 0;
  max-width: 560px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.frame-page-block {
  width: 96px;
  height: 32px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.block-accent {
  background: var(--wui-system-accent-color);
}

.block-accent-dark {
  background: var(--wui-system-accent-color-dark-1);
}

.block-accent-light {
  background: var(--wui-system-accent-color-light-2);
}

/* —— 触发行与按钮(沿用 ImplicitTransitionPage 的 WinUI 观感)—— */
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
  min-width: 96px;
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

.host-button:disabled {
  color: var(--wui-application-secondary-foreground-theme);
  background: var(--wui-system-control-background-base-low);
  cursor: default;
}

.host-button:focus-visible,
.mini-button:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
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

.mini-button.active {
  color: var(--wui-system-control-foreground-accent);
  border-color: var(--wui-system-accent-color);
}

.state-chip {
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.info-chip {
  padding: 4px 10px;
  font-family: monospace;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-list-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* —— 例 1:入场方块 —— */
.entrance-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 64px;
}

.entrance-block {
  display: inline-block;
  width: 50px;
  height: 50px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.entrance-block-lg {
  width: 75px;
  height: 75px;
}

.reposition-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 84px;
}

/* —— 例 3:内容刷新 —— */
.content-panel {
  width: 100%;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.content-list {
  margin: 0;
  padding: 8px 16px;
  list-style: none;
}

.content-row {
  padding: 6px 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.content-row:last-child {
  border-bottom: none;
}

/* —— 例 4:AddDelete —— */
.ad-list {
  position: relative;
  margin: 0;
  padding: 8px 16px;
  list-style: none;
}

.ad-item {
  padding: 6px 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  border-bottom: 1px solid var(--wui-system-control-background-base-low);
}

.ad-item:last-child {
  border-bottom: none;
}

/* 兄弟条目补位:transform 过渡(TransitionGroup 的 FLIP move) */
.ad-move {
  transition: transform var(--wui-duration-normal) var(--wui-easing-standard);
}

.ad-enter-active {
  animation: ad-slide-in 333ms var(--wui-easing-standard);
}

.ad-enter-from {
  opacity: 0;
}

.ad-leave-active {
  position: absolute;
  width: 100%;
  animation: ad-slide-out 333ms var(--wui-easing-standard) both;
}

.ad-leave-to {
  opacity: 0;
}

/* ±32px、333ms、standard —— motion-notes.md「列表多选位移」规格(L20789-L20819) */
@keyframes ad-slide-in {
  from {
    opacity: 0;
    transform: translateX(-32px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes ad-slide-out {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(32px);
  }
}

/* —— 例 5:明暗切换元素过渡 —— */
.swap-stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.swap-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 260px;
  padding: 16px;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  transition:
    background-color var(--wui-duration-normal) var(--wui-easing-standard),
    border-color var(--wui-duration-normal) var(--wui-easing-standard);
}

.swap-card-title {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-header-foreground-theme);
  transition: color var(--wui-duration-normal) var(--wui-easing-standard);
}

.swap-card-text {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  transition: color var(--wui-duration-normal) var(--wui-easing-standard);
}

.swap-chip {
  padding: 2px 8px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-system-control-foreground-accent);
  background: var(--wui-system-control-background-list-low);
  border: 1px solid var(--wui-system-control-background-base-medium);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  transition:
    color var(--wui-duration-normal) var(--wui-easing-standard),
    background-color var(--wui-duration-normal) var(--wui-easing-standard),
    border-color var(--wui-duration-normal) var(--wui-easing-standard);
}

.theme-toggle {
  display: flex;
  gap: 4px;
}

.inline-link {
  color: var(--wui-hyperlink-foreground-theme);
  text-decoration: underline;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
