<script setup lang="ts">
// ToolTipPage.vue —— ToolTip 控件示例页(结构照抄 HomePage 母版)。
// 参数组合参照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/ToolTip/ToolTipPage.xaml:
//   ① ButtonSimpleTooltip —— 按钮上 ToolTipService.ToolTip 简单文本提示;
//   ② ImageTooltipPlacementrect —— Placement="Right" 等放置位(四向演示替代 PlacementRect,
//      该矩形避让语义 Web 侧以 flip/shift 等效,见 wiki 差异节);
//   ③ TextblockOffsetTooltip —— VerticalOffset="-80" 偏移提示。
// 另按任务补充:自定义 delay / showDuration(+ opened/closed 事件日志)与富内容插槽。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import WuiToolTip from '@/components/ToolTip.vue'
import WuiToolTipService from '@/components/ToolTipService.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const tooltipContent = ref<string | number | boolean>('Simple ToolTip')
const placement = ref<string | number | boolean>('Top')
const delay = ref<string | number | boolean>(1000)
const showDuration = ref<string | number | boolean>(5000)
const maxWidth = ref<string | number | boolean>(320)

const tooltipText = computed(() => String(tooltipContent.value))
const placementValue = computed(() => {
  const value = String(placement.value)
  return value === 'Bottom' || value === 'Left' || value === 'Right' || value === 'Auto'
    ? value
    : 'Top'
})
const delayValue = computed(() => Math.max(0, Number(delay.value) || 0))
const showDurationValue = computed(() => Math.max(0, Number(showDuration.value) || 0))
const maxWidthValue = computed(() => Math.max(80, Number(maxWidth.value) || 320))

const placementOptions = [
  { label: 'Top(默认)', value: 'Top' },
  { label: 'Bottom', value: 'Bottom' },
  { label: 'Left', value: 'Left' },
  { label: 'Right', value: 'Right' },
  { label: 'Auto', value: 'Auto' },
]

// —— 四向放置位演示(WinUI ToolTip 默认 Top,逐个显式给值)——
const placements = ['Top', 'Bottom', 'Left', 'Right'] as const

// —— 事件日志(ToolTip 直用时 opened/closed 实时呈现;服务式不转发事件,与 WinUI 一致)——
const lastEvent = ref('—')
const eventCount = ref(0)

function logEvent(name: 'opened' | 'closed'): void {
  eventCount.value += 1
  lastEvent.value = `${name}(#${eventCount.value})`
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['content', 'string', "提示文本(WinUI Content 的 string 形态);富内容用默认插槽,插槽优先"],
  ['placement', "'Top' | 'Bottom' | 'Left' | 'Right' | 'Auto'", "放置位(WinUI Placement / ToolTipService.PlacementMode),默认 Top;Auto 归位 Top 由翻转提供自适应"],
  ['target', 'HTMLElement | string | null', '目标元素(元素或 CSS 选择器);传入后不渲染包装元素,不传时用 #target 插槽(WinUI Target / PlacementTarget)'],
  ['delay', 'number', '出现延迟 ms(WinUI ToolTipService.InitialShowDelay),默认 1000'],
  ['showDuration', 'number', '显示时长 ms,超时自动关(WinUI ToolTipService.ShowDuration),默认 5000'],
  ['maxWidth', 'number', '最大宽度 px(WinUI ToolTipMaxWidth),默认 320'],
  ['horizontalOffset', 'number', '水平偏移 px,正值向右(WinUI HorizontalOffset),默认 0'],
  ['verticalOffset', 'number', '垂直偏移 px,正值向下(WinUI VerticalOffset),默认 0'],
  ['isOpen', 'boolean(v-model:is-open)', '开关状态双向绑定;程序化置 true 立即打开(不走 delay),WinUI ToolTip.IsOpen'],
  ['opened', '() => void', 'ToolTip 打开后触发(WinUI Opened)'],
  ['closed', '() => void', 'ToolTip 关闭后触发(WinUI Closed;超时 / 移出 / Esc / 按下均走此事件)'],
  ['default slot', '—', '富提示内容(任意元素;对照 ToolTipService.ToolTip 的 ToolTip 对象形态)'],
  ['target slot', '—', '包装模式的目标元素(未传 target 属性时使用)'],
]

// 用法代码只展示组件标签(不含 <script> 块,避免字面闭合标签提前终止 SFC 的
// script setup——ContentDialog 波次先例;导入写法见 wiki/controls/ToolTip.md)。
const usageCode = computed(
  () => `<!-- 服务式(对照 ToolTipService.ToolTip 附加属性):子组件声明,目标 = 宿主
     import WuiButton from '@/components/Button.vue'
     import WuiToolTipService from '@/components/ToolTipService.vue' -->
<WuiButton>
  Hover me
  <WuiToolTipService content="Simple ToolTip" placement="Top" :delay="1000" :show-duration="5000" />
</WuiButton>

<!-- 直用式:#target 插槽即目标,默认插槽为富内容 -->
<WuiToolTip placement="Right" :max-width="320">
  <template #target>
    <WuiButton>Placement Right</WuiButton>
  </template>
  <strong>富内容提示</strong>
  <span>默认插槽可放任意元素</span>
</WuiToolTip>`,
)
</script>

<template>
  <DemoPage wiki="ToolTip"
    title="ToolTip"
    description="显示元素相关的更多信息:说明该元素的用途或提示用户可以做什么。鼠标悬停、键盘聚焦或触屏长按目标元素时在旁边弹出,移出 / 超时 / Esc 关闭。适合补足控件本身放不下的简短说明。"
  >
    <template #demo>
      <div class="tooltip-stage">
        <!-- 官方示例 1 对照:按钮 + 简单文本提示(服务式;参数面板实时联动) -->
        <div class="tooltip-example">
          <WuiButton class="tooltip-anchor">
            悬停查看简单 ToolTip 的按钮
            <WuiToolTipService
              :content="tooltipText"
              :placement="placementValue"
              :delay="delayValue"
              :show-duration="showDurationValue"
            />
          </WuiButton>
          <p class="tooltip-caption">
            服务式(ToolTipService 附加属性语义):placement = {{ placementValue }} · delay =
            {{ delayValue }}ms · showDuration = {{ showDurationValue }}ms
          </p>
        </div>

        <!-- 四向放置位(官方 Placement="Right" 示例的组合扩展) -->
        <div class="tooltip-example">
          <div class="placement-grid">
            <WuiButton v-for="side in placements" :key="side" class="tooltip-anchor">
              Placement {{ side }}
              <WuiToolTipService :placement="side" :content="`${side} 放置位的提示`" />
            </WuiButton>
          </div>
          <p class="tooltip-caption">四种放置位:视口放不下时自动翻转到对侧并推回安全区</p>
        </div>

        <!-- 官方示例 3 对照:偏移提示(TextblockOffsetTooltip,VerticalOffset="-80") -->
        <div class="tooltip-example">
          <WuiToolTip :vertical-offset="-80" :delay="300">
            <template #target>
              <WuiTextBlock text="带偏移 ToolTip 的文本块(verticalOffset = -80)" />
            </template>
            Offset ToolTip.
          </WuiToolTip>
          <p class="tooltip-caption">直用式:#target 插槽指定目标,verticalOffset 上移 80px</p>
        </div>

        <!-- 自定义时序 + opened/closed 事件日志(ToolTip 直用) -->
        <div class="tooltip-example">
          <div class="timing-row">
            <WuiButton class="tooltip-anchor">
              自定义时序(delay {{ delayValue }}ms)
              <WuiToolTip
                :delay="delayValue"
                :show-duration="showDurationValue"
                :content="`延迟 ${delayValue}ms 出现,${showDurationValue}ms 后自动关闭`"
                @opened="logEvent('opened')"
                @closed="logEvent('closed')"
              />
            </WuiButton>
            <span class="timing-log">最近事件:<code>{{ lastEvent }}</code></span>
          </div>
          <p class="tooltip-caption">delay / showDuration 与参数面板联动;打开 / 关闭触发 opened / closed</p>
        </div>

        <!-- 富内容插槽(对照 ToolTipService.ToolTip 的 ToolTip 对象形态) -->
        <div class="tooltip-example">
          <WuiButton class="tooltip-anchor">
            悬停查看富内容
            <WuiToolTip :max-width="maxWidthValue">
              <span class="rich-tooltip">
                <strong class="rich-tooltip-title">富内容提示</strong>
                <span>
                  默认插槽渲染,可放任意元素;当前 maxWidth =
                  {{ maxWidthValue }}px(源 ToolTipMaxWidth = 320)。
                </span>
              </span>
            </WuiToolTip>
          </WuiButton>
          <p class="tooltip-caption">富内容 slot:maxWidth 与参数面板联动</p>
        </div>

        <p class="tooltip-hint">
          交互:悬停 / 键盘 Tab 聚焦(仅 :focus-visible)延迟弹出;移出、按下目标、Esc 或超时关闭;
          触屏长按显示、抬指关闭;滚动时提示跟随目标重定位。
        </p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="提示文本" type="text" v-model="tooltipContent" placeholder="Simple ToolTip" />
        <DemoOptionRow label="Placement" type="select" v-model="placement" :options="placementOptions" />
        <DemoOptionRow label="Delay (ms)" type="slider" :min="0" :max="3000" :step="100" v-model="delay" />
        <DemoOptionRow
          label="ShowDuration (ms)"
          type="slider"
          :min="1000"
          :max="10000"
          :step="500"
          v-model="showDuration"
        />
        <DemoOptionRow label="MaxWidth (px)" type="slider" :min="160" :max="480" :step="20" v-model="maxWidth" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.tooltip-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.tooltip-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.tooltip-anchor {
  min-width: 240px;
}

/* 四向放置位:2×2 网格,按钮间距足够让四向提示完整展开 */
.placement-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.placement-grid .tooltip-anchor {
  min-width: 200px;
}

.timing-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.timing-log {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.timing-log code {
  color: var(--wui-default-text-foreground-theme);
}

/* 富提示内容(默认插槽):标题 + 正文的纵向小排版 */
.rich-tooltip {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rich-tooltip-title {
  font-weight: 600;
}

.tooltip-caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.tooltip-hint {
  margin: 0;
  max-width: 560px;
  text-align: center;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}
</style>
