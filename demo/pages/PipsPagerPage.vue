<script setup lang="ts">
// PipsPager 示例页:对照官方 WinUI Gallery PipsPagerPage 两例:
// 例一 = 官方 PipspagerIntegratedFlipview(FlipView + PipsPager 双向联动);FlipView 组件尚未就绪,
//        用占位内容面板模拟分页内容,绑定方式与官方 SelectedPageIndex TwoWay 一致;
// 例二 = 官方 PipspagerOptionsChangeOrientation(10 页 + Orientation / 前后按钮可见性组合),
//        扩展 NumberOfPages(含 -1 无限页与 0 空态)、MaxVisiblePips、WrapMode、Disabled 面板。
// 结构照抄已通过 QA 的 RatingControlPage 母版:上半区演示 + 参数面板,下半区属性/事件/键盘/用法文档。
import { computed, ref } from 'vue'
import WuiPipsPager from '@/components/PipsPager.vue'
import type { PipsPagerSelectedIndexChangedEventArgs } from '@/components/PipsPager.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'PipsPager(圆点分页器)', en: 'PipsPager' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '让用户在一组分页内容之间导航,页面编号无需可视呈现:一排小圆点(pip)表示各页,点击跳页,两端导航按钮可显式/悬停显示或隐藏。PipsPager 与展示的内容相互独立,常用于照片查看器、应用列表、轮播等展示空间有限的场景。',
  en: 'Let users navigate through a paginated collection when page numbers need not be shown: a row of pips represents the pages, click to jump, with optional navigation buttons at both ends. The pager is independent of the displayed content — common in photo viewers, lists and carousels.',
}
const GROUP_CAROUSEL: BilingualText = { zh: '与分页内容区联动(对照官方 FlipView 集成示例;FlipView 落地前用占位面板模拟)', en: 'Linked with paged content (mirrors the official FlipView sample; placeholder panels until FlipView lands)' }
const GROUP_OPTIONS: BilingualText = { zh: '方向与导航按钮可见性组合(右侧参数面板实时调节本例)', en: 'Orientation & button visibility combos (tuned live by the options panel)' }
const GROUP_KEYBOARD: BilingualText = { zh: '键盘与指针操作', en: 'Keyboard & pointer' }
const LABEL_ORIENTATION: BilingualText = { zh: 'Orientation 方向', en: 'Orientation' }
const LABEL_PREV: BilingualText = { zh: 'PreviousButtonVisibility', en: 'PreviousButtonVisibility' }
const LABEL_NEXT: BilingualText = { zh: 'NextButtonVisibility', en: 'NextButtonVisibility' }
const LABEL_PAGES: BilingualText = { zh: 'NumberOfPages(-1 = 无限页,0 = 空态)', en: 'NumberOfPages (-1 = infinite, 0 = empty)' }
const LABEL_MAX_PIPS: BilingualText = { zh: 'MaxVisiblePips', en: 'MaxVisiblePips' }
const LABEL_WRAP: BilingualText = { zh: 'WrapMode 环绕', en: 'WrapMode' }
const LABEL_DISABLED: BilingualText = { zh: 'Disabled(演示二)', en: 'Disabled (demo 2)' }
const LABEL_PAGE: BilingualText = { zh: '当前页', en: 'Page' }
const LABEL_EVENT: BilingualText = { zh: '最近一次 selectedIndexChanged', en: 'Last selectedIndexChanged' }
const LABEL_NO_EVENT: BilingualText = { zh: '尚未触发', en: 'Not fired yet' }
const HINT_INFINITE: BilingualText = { zh: 'NumberOfPages = -1(无限页):选中末 pip 时追加一枚(pip 始终比选中多出「下一页」暗示),配合 MaxVisiblePips 观察裁剪滚动与选中居中。', en: 'NumberOfPages = -1 (infinite): a pip is appended when you land on the last one (always hinting a next page); combine with MaxVisiblePips to see clipping and centering.' }
const HINT_LINKED: BilingualText = { zh: '内容区与 PipsPager 通过 v-model:selectedPageIndex 双向绑定 —— 官方示例即 {x:Bind Gallery.SelectedIndex, Mode=TwoWay};FlipView 组件落地后替换占位面板即可。', en: 'The content panel and the pager share v-model:selectedPageIndex — the official sample does {x:Bind Gallery.SelectedIndex, Mode=TwoWay}; swap in FlipView when it lands.' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_KEYBOARD_TITLE: BilingualText = { zh: '键盘交互', en: 'Keyboard' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupCarousel = useBilingual(i18n, GROUP_CAROUSEL)
const groupOptions = useBilingual(i18n, GROUP_OPTIONS)
const groupKeyboard = useBilingual(i18n, GROUP_KEYBOARD)
const labelOrientation = useBilingual(i18n, LABEL_ORIENTATION)
const labelPrev = useBilingual(i18n, LABEL_PREV)
const labelNext = useBilingual(i18n, LABEL_NEXT)
const labelPages = useBilingual(i18n, LABEL_PAGES)
const labelMaxPips = useBilingual(i18n, LABEL_MAX_PIPS)
const labelWrap = useBilingual(i18n, LABEL_WRAP)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelPage = useBilingual(i18n, LABEL_PAGE)
const labelEvent = useBilingual(i18n, LABEL_EVENT)
const labelNoEvent = useBilingual(i18n, LABEL_NO_EVENT)
const hintInfinite = useBilingual(i18n, HINT_INFINITE)
const hintLinked = useBilingual(i18n, HINT_LINKED)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsKeyboardTitle = useBilingual(i18n, DOCS_KEYBOARD_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 演示一:与分页内容区双向联动(对照官方 FlipView 集成示例)——
const carouselIndex = ref(0)
const CAROUSEL_PAGES = 5

// —— 参数面板(DemoOptionRow 的 v-model 契约:联合类型,见 demo/components/README.md)——
const demoOrientation = ref<string | number | boolean>('horizontal')
const demoPrevVisibility = ref<string | number | boolean>('visible')
const demoNextVisibility = ref<string | number | boolean>('visible')
const demoNumberOfPages = ref<string | number | boolean>(10)
const demoMaxVisiblePips = ref<string | number | boolean>(5)
const demoWrap = ref<string | number | boolean>(false)
const demoDisabled = ref<string | number | boolean>(false)

function toNumber(value: string | number | boolean, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const orientationValue = computed(() => (demoOrientation.value === 'vertical' ? 'vertical' : 'horizontal'))
const prevVisibilityValue = computed(() =>
  typeof demoPrevVisibility.value === 'string'
    ? (demoPrevVisibility.value as 'visible' | 'visibleOnPointerOver' | 'collapsed')
    : 'visible',
)
const nextVisibilityValue = computed(() =>
  typeof demoNextVisibility.value === 'string'
    ? (demoNextVisibility.value as 'visible' | 'visibleOnPointerOver' | 'collapsed')
    : 'visible',
)
const numberOfPagesValue = computed(() => toNumber(demoNumberOfPages.value, 10))
const maxVisiblePipsValue = computed(() => Math.max(0, toNumber(demoMaxVisiblePips.value, 5)))
const wrapValue = computed(() => demoWrap.value === true)
const disabledValue = computed(() => demoDisabled.value === true)

// —— 演示二:选项组合 + 事件日志 ——
const pagedIndex = ref(0)
const lastEvent = ref<PipsPagerSelectedIndexChangedEventArgs | null>(null)

function onPagedIndexChanged(event: PipsPagerSelectedIndexChangedEventArgs): void {
  lastEvent.value = event
}

const eventText = computed(() =>
  lastEvent.value ? `${lastEvent.value.oldIndex} → ${lastEvent.value.newIndex}` : '',
)

const VISIBILITY_CHOICES = [
  { label: 'Visible(恒显)', value: 'visible' },
  { label: 'VisibleOnPointerOver(悬停/键盘聚焦时显)', value: 'visibleOnPointerOver' },
  { label: 'Collapsed(隐藏)', value: 'collapsed' },
]

// 演示一占位面板的配色(内容层演示,非控件视觉;用 accent token 加透明度分层)
const carouselTints = ['18%', '34%', '50%', '66%', '82%']

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['numberOfPages', 'number', '-1', '总页数;负值 = 无限页(pip 随选中索引增长),0 = 无 pip 且导航按钮转入隐藏+禁用;页数变小时选中索引自动钳制到末页'],
  ['selectedPageIndex (v-model)', 'number', '0', '当前选中页索引(0 起);越界写入自动收敛(> 末页取末页,< 0 取 0)'],
  ['maxVisiblePips', 'number', '5', 'pip 可见数量上限;超出部分裁剪,选中 pip 滚动至视口中央;0 时隐藏全部 pip'],
  ['orientation', "'horizontal' | 'vertical'", "'horizontal'", '排列方向;横向时导航按钮整体旋转 -90°(源 RenderTransform),pip 按钮尺寸 12×24 / 24×12 随向互换'],
  ['previousButtonVisibility', "'visible' | 'visibleOnPointerOver' | 'collapsed'", "'collapsed'", '「上一页」按钮可见性(源默认即 Collapsed);任何模式下到首页边缘都转入隐藏(透明但保留布局,源 Opacity=0),wrapMode="wrap" 且页数 > 1 时豁免'],
  ['nextButtonVisibility', "'visible' | 'visibleOnPointerOver' | 'collapsed'", "'collapsed'", '「下一页」按钮可见性,规则同上(末页边缘隐藏)'],
  ['wrapMode', "'none' | 'wrap'", "'none'", '环绕模式:wrap 时首页「上一页」跳到末页、末页「下一页」回到首页'],
  ['disabled', 'boolean', 'false', '禁用(对应 WinUI Control.IsEnabled),全部按钮不可用'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['selectedIndexChanged', '(e: { oldIndex: number; newIndex: number })', '选中页变化时触发(点击 pip、导航按钮、外部写回);WinUI 源事件参数类无成员,Web 侧扩展携带前后索引'],
  ['update:selectedPageIndex', '(index: number)', 'v-model:selectedPageIndex 双向绑定事件'],
]
const keyboardHeaders = ['按键 / 指针', '作用']
const keyboardRows: (string | number)[][] = [
  ['← / ↑', '聚焦上一个 pip(到端点停止,与源 TryMoveFocus 一致)'],
  ['→ / ↓', '聚焦下一个 pip'],
  ['Tab', '进入 pip 区时直接聚焦选中的 pip(源 GettingFocus 重定向;roving tabindex)'],
  ['Space / Enter', '激活聚焦的 pip 或导航按钮(原生按钮语义)'],
  ['悬停 / 键盘聚焦控件', 'visibleOnPointerOver 模式的导航按钮显示;指针移出或失焦后隐藏'],
]

const usageCode = computed(
  () => `<script setup lang="ts">
import { ref } from 'vue'
import PipsPager from '@/components/PipsPager.vue'

const page = ref(0)
<\/script>

<template>
  <!-- 与内容区双向联动(官方 FlipView 集成示例即 SelectedPageIndex TwoWay) -->
  <PipsPager
    v-model:selected-page-index="page"
    :number-of-pages="5"
    previous-button-visibility="visible"
    next-button-visibility="visible"
    @selected-index-changed="onIndexChanged" />

  <!-- 纵向 + 悬停显示导航按钮 + 环绕 -->
  <PipsPager
    v-model:selected-page-index="page"
    :number-of-pages="10"
    :max-visible-pips="5"
    orientation="vertical"
    previous-button-visibility="visibleOnPointerOver"
    next-button-visibility="visibleOnPointerOver"
    wrap-mode="wrap" />
</template>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="pips-stage">
        <!-- 演示一:与分页内容区双向联动(对照官方 PipspagerIntegratedFlipview) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupCarousel }}</h4>
          <div class="carousel">
            <div
              class="carousel-panel"
              :style="{ background: `color-mix(in srgb, var(--wui-system-accent-color) ${carouselTints[carouselIndex] ?? '18%'}, var(--wui-system-control-background-chrome-medium-low))` }"
            >
              <span class="carousel-page">{{ labelPage }} {{ carouselIndex + 1 }} / {{ CAROUSEL_PAGES }}</span>
            </div>
            <WuiPipsPager
              v-model:selected-page-index="carouselIndex"
              :number-of-pages="CAROUSEL_PAGES"
              previous-button-visibility="visible"
              next-button-visibility="visible"
              class="carousel-pager"
              aria-label="内容分页演示"
            />
          </div>
          <p class="demo-output">{{ hintLinked }}</p>
        </section>

        <!-- 演示二:方向与导航按钮可见性组合(参数面板实时调节) -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupOptions }}</h4>
          <WuiPipsPager
            v-model:selected-page-index="pagedIndex"
            :number-of-pages="numberOfPagesValue"
            :max-visible-pips="maxVisiblePipsValue"
            :orientation="orientationValue"
            :previous-button-visibility="prevVisibilityValue"
            :next-button-visibility="nextVisibilityValue"
            :wrap-mode="wrapValue ? 'wrap' : 'none'"
            :disabled="disabledValue"
            aria-label="参数组合演示"
            @selected-index-changed="onPagedIndexChanged"
          />
          <p class="demo-output">
            {{ labelPage }}: <strong>{{ pagedIndex }}</strong>
            <span class="demo-event">{{ labelEvent }}: {{ lastEvent ? eventText : labelNoEvent }}</span>
          </p>
          <p class="demo-output">{{ hintInfinite }}</p>
        </section>

        <!-- 键盘与指针操作说明 -->
        <section class="demo-group">
          <h4 class="group-title">{{ groupKeyboard }}</h4>
          <ul class="keyboard-list">
            <li><kbd>←</kbd>/<kbd>↑</kbd> {{ i18n.locale.value.startsWith('zh') ? '聚焦上一个 pip' : 'focus previous pip' }}</li>
            <li><kbd>→</kbd>/<kbd>↓</kbd> {{ i18n.locale.value.startsWith('zh') ? '聚焦下一个 pip' : 'focus next pip' }}</li>
            <li><kbd>Tab</kbd> {{ i18n.locale.value.startsWith('zh') ? '进入时聚焦选中 pip' : 'lands on selected pip' }}</li>
            <li>{{ i18n.locale.value.startsWith('zh') ? '到边缘时导航按钮隐藏(透明保留布局)' : 'nav buttons hide (kept in layout) at the edges' }}</li>
          </ul>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelOrientation" type="select" v-model="demoOrientation" :options="[{ label: 'Horizontal', value: 'horizontal' }, { label: 'Vertical', value: 'vertical' }]" />
        <DemoOptionRow :label="labelWrap" type="toggle" v-model="demoWrap" />
        <DemoOptionRow :label="labelPrev" type="select" v-model="demoPrevVisibility" :options="VISIBILITY_CHOICES" />
        <DemoOptionRow :label="labelNext" type="select" v-model="demoNextVisibility" :options="VISIBILITY_CHOICES" />
        <DemoOptionRow :label="labelPages" type="slider" v-model="demoNumberOfPages" :min="-1" :max="15" :step="1" />
        <DemoOptionRow :label="labelMaxPips" type="slider" v-model="demoMaxVisiblePips" :min="1" :max="10" :step="1" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsKeyboardTitle }}</h4>
      <DemoDocsTable :headers="keyboardHeaders" :rows="keyboardRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.pips-stage {
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

/* 演示一:占位内容面板(对照官方 FlipView Height=270 / MaxWidth=400)+ 居中 pip 条 */
.carousel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.carousel-panel {
  display: grid;
  width: min(400px, 100%);
  height: 180px;
  place-items: center;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  transition: background 0.2s ease;
}

.carousel-page {
  font-size: var(--wui-text-style-large-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-output strong {
  color: var(--wui-application-header-foreground-theme);
  font-weight: 600;
}

.demo-event {
  margin-left: 16px;
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
}

.keyboard-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.keyboard-list kbd {
  padding: 1px 6px;
  font-family: Consolas, monospace;
  font-size: 12px;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-system-control-background-chrome-medium-low);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: 3px;
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
