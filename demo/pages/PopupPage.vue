<script setup lang="ts">
// PopupPage.vue —— Popup 控件示例页(结构照抄 HomePage 母版)。
// 参数组合参照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/Popup/PopupPage.xaml
//   (Popup with Offset Positioning:IsLightDismissEnabled 开关 + Horizontal/VerticalOffset 数字框),
//   并按任务要求补充三组对照:基础用法(placement 14 档实时切换)、
//   light dismiss 开/关行为对比、Popup(裸原语)vs Flyout(presenter 皮肤)对照。
import { computed, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiPopup from '@/components/Popup.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

/** 与组件一致的 WinUI PopupDesiredPlacement 枚举全集。 */
const PLACEMENT_VALUES = [
  'Default',
  'Auto',
  'Top',
  'Bottom',
  'Left',
  'Right',
  'TopEdgeAlignedLeft',
  'TopEdgeAlignedRight',
  'BottomEdgeAlignedLeft',
  'BottomEdgeAlignedRight',
  'LeftEdgeAlignedTop',
  'LeftEdgeAlignedBottom',
  'RightEdgeAlignedTop',
  'RightEdgeAlignedBottom',
] as const

type PlacementValue = (typeof PLACEMENT_VALUES)[number]

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
const placement = ref<string | number | boolean>('Bottom')
const lightDismiss = ref<string | number | boolean>(true)
const horizontalOffset = ref<string | number | boolean>(200)
const verticalOffset = ref<string | number | boolean>(0)

const placementOptions = PLACEMENT_VALUES.map((value) => ({
  label: value === 'Default' ? 'Default(默认 · 屏幕基准)' : value === 'Auto' ? 'Auto(自动 · 锚点)' : value,
  value,
}))

function toPlacement(value: string | number | boolean): PlacementValue {
  const raw = String(value)
  return (PLACEMENT_VALUES as readonly string[]).includes(raw) ? (raw as PlacementValue) : 'Bottom'
}

function clampNumber(value: string | number | boolean, min: number, max: number, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

const placementValue = computed(() => toPlacement(placement.value))
const horizontalValue = computed(() => clampNumber(horizontalOffset.value, -100, 500, 200))
const verticalValue = computed(() => clampNumber(verticalOffset.value, -100, 100, 0))

// IsLightDismissEnabled 开关 ↔ 控件双向联动(驱动「light dismiss 开」侧与偏移示例)。
const lightDismissValue = computed({
  get: () => lightDismiss.value === true,
  set: (value: boolean) => {
    lightDismiss.value = value
  },
})

// —— 基础示例:isOpen 双向 + opened/closed 事件计数 ——
const basicOpen = ref(false)
const openedCount = ref(0)
const closedCount = ref(0)

function toggleBasic(): void {
  basicOpen.value = !basicOpen.value
}

function onBasicOpened(): void {
  openedCount.value += 1
}

function onBasicClosed(): void {
  closedCount.value += 1
}

// —— 其余示例各自的开关状态 ——
const dismissOffOpen = ref(false)
const dismissOnOpen = ref(false)
const offsetOpen = ref(false)
const bareOpen = ref(false)
const skinnedOpen = ref(false)

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['Child(默认 slot)', 'slot', '弹层内容(WinUI Child);Popup 是无修饰原语,不提供任何默认皮肤,外观完全由使用方决定'],
  ['#target(slot)', 'slot', '锚点元素(WinUI PlacementTarget 的 Web 等价);缺省时锚为组件声明点(仅锚点基准 placement 使用)'],
  ['Placement', "'Default' | 'Auto' | Top/Left/… × EdgeAligned* 共 14 档", "'Default'", "定位策略:'Default' 按偏移相对窗口左上角(屏幕基准),其余相对锚点定位,'Auto' 为 bottom 优先 + 视口翻转(下拉实时切换)"],
  ['HorizontalOffset', 'number', 0, '水平偏移 px;屏幕基准相对窗口左缘,锚点基准沿交叉轴推移(数字框实时调节)'],
  ['VerticalOffset', 'number', 0, '垂直偏移 px;屏幕基准相对窗口顶缘,锚点基准沿主轴远离锚(数字框实时调节)'],
  ['IsLightDismissEnabled', 'boolean(v-model:is-light-dismiss-enabled)', 'false', '启用 light dismiss:点击弹层外部或按 Esc 关闭(开关实时切换,驱动 light dismiss 与偏移两个示例)'],
  ['LightDismissOverlayMode', "'Auto' | 'On' | 'Off'", "'Auto'", "'On' 时弹层下方显示半透明遮罩,挡住底层交互(WinUI Auto 档在桌面端不显示)"],
  ['ShouldConstrainToRootBounds', 'boolean', 'true', '层是否钳制在窗口边界内;关闭后层可溢出视口(对应源的平台窗口化弹层)'],
  ['IsOpen', 'boolean(v-model:is-open)', 'false', '打开状态,双向绑定;light dismiss 关闭时 model 同步为 false'],
  ['Opened', '() => void', '—', '打开动画结束后触发(WinUI Opened)'],
  ['Closed', '() => void', '—', '关闭动画结束后触发;light dismiss / Esc 关闭同样触发(WinUI Closed)'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(
  () => `<WuiPopup v-model:is-open="isOpen" placement="${placementValue.value}">
  <template #target>
    <WuiButton @click="isOpen = !isOpen">显示 Popup</WuiButton>
  </template>
  <!-- child:无任何默认皮肤,外观完全由使用方决定 -->
  <div class="my-popup-panel">
    自定义内容
    <WuiButton @click="isOpen = false">Close</WuiButton>
  </div>
</WuiPopup>`,
)
</script>

<template>
  <DemoPage wiki="Popup"
    title="Popup"
    description="在既有 UI 之上显示临时内容的最底层弹层原语:只负责层级、定位与(可选的)点击外部关闭(light dismiss),不带任何默认皮肤——背景、边框、圆角、阴影都由 child 自己决定。定位基准分两档:placement='Default'(WinUI 默认)按 HorizontalOffset / VerticalOffset 相对窗口左上角定位;其余 placement 值相对锚点(#target 或组件声明点)定位。"
  >
    <template #demo>
      <div class="popup-stage">
        <!-- ① 基础用法:placement 14 档实时切换(屏幕基准 vs 锚点基准) -->
        <div class="popup-example">
          <WuiPopup
            v-model:is-open="basicOpen"
            :placement="placementValue"
            :is-light-dismiss-enabled="false"
            @opened="onBasicOpened"
            @closed="onBasicClosed"
          >
            <template #target>
              <WuiButton @click="toggleBasic">显示 Popup(placement:{{ placementValue }})</WuiButton>
            </template>
            <!-- 故意不做任何包装:展示「无皮肤原语」的默认观感 -->
            <div class="popup-bare">
              <p class="popup-bare-text">Popup 原语:层内没有背景、边框与阴影</p>
              <WuiButton @click="basicOpen = false">Close</WuiButton>
            </div>
          </WuiPopup>
          <p class="popup-example-caption">
            基础用法:placement 下拉实时切换;Default = 窗口左上角 + 偏移,其余 = 相对按钮(锚点)定位。
            opened {{ openedCount }} 次 · closed {{ closedCount }} 次 · isOpen = {{ basicOpen }}
          </p>
        </div>

        <!-- ② light dismiss 对比:关(仅 Close 按钮)vs 开(点击外部 / Esc 关闭) -->
        <div class="popup-example">
          <div class="popup-example-row">
            <WuiPopup v-model:is-open="dismissOffOpen" :is-light-dismiss-enabled="false" placement="Bottom">
              <template #target>
                <WuiButton @click="dismissOffOpen = !dismissOffOpen">Light dismiss = false</WuiButton>
              </template>
              <div class="popup-panel">
                <p class="popup-panel-title">IsLightDismissEnabled = false</p>
                <p class="popup-panel-text">点击弹层外部不会关闭,只能用下面的按钮。</p>
                <WuiButton @click="dismissOffOpen = false">Close</WuiButton>
              </div>
            </WuiPopup>

            <WuiPopup v-model:is-open="dismissOnOpen" v-model:is-light-dismiss-enabled="lightDismissValue" placement="Bottom">
              <template #target>
                <WuiButton @click="dismissOnOpen = !dismissOnOpen">Light dismiss = {{ lightDismissValue }}</WuiButton>
              </template>
              <div class="popup-panel">
                <p class="popup-panel-title">IsLightDismissEnabled = {{ lightDismissValue }}</p>
                <p class="popup-panel-text">开启时:点击弹层外部任意处,或按 Esc 即关闭。</p>
                <WuiButton @click="dismissOnOpen = false">Close</WuiButton>
              </div>
            </WuiPopup>
          </div>
          <p class="popup-example-caption">light dismiss 对比:右侧开关实时切换 IsLightDismissEnabled,分别打开两侧弹层后点击外部 / 按 Esc 观察差异。</p>
        </div>

        <!-- ③ 偏移定位(官方示例 Popup with Offset Positioning):屏幕基准 + H/V 偏移 -->
        <div class="popup-example">
          <WuiPopup
            v-model:is-open="offsetOpen"
            v-model:is-light-dismiss-enabled="lightDismissValue"
            placement="Default"
            :horizontal-offset="horizontalValue"
            :vertical-offset="verticalValue"
          >
            <template #target>
              <WuiButton @click="offsetOpen = true">Show Popup (using Offset)</WuiButton>
            </template>
            <div class="popup-panel">
              <p class="popup-panel-title">Simple Popup</p>
              <WuiButton @click="offsetOpen = false">Close</WuiButton>
            </div>
          </WuiPopup>
          <p class="popup-example-caption">
            偏移定位(官方示例):placement = Default,层定位在「窗口左上角 + (HorizontalOffset, VerticalOffset)」——基准是窗口而不是按钮;拖动数字框实时移动弹层。
          </p>
        </div>

        <!-- ④ vs Flyout 对照:同一个内容,裸原语 vs presenter 皮肤 -->
        <div class="popup-example">
          <div class="popup-example-row">
            <WuiPopup v-model:is-open="bareOpen" placement="Bottom">
              <template #target>
                <WuiButton @click="bareOpen = !bareOpen">Popup 裸原语</WuiButton>
              </template>
              <div class="popup-bare">
                <p class="popup-bare-text">没有任何皮肤:文字直接浮在页面上</p>
                <WuiButton @click="bareOpen = false">Close</WuiButton>
              </div>
            </WuiPopup>

            <WuiPopup v-model:is-open="skinnedOpen" placement="Bottom">
              <template #target>
                <WuiButton @click="skinnedOpen = !skinnedOpen">Popup + FlyoutPresenter 皮肤</WuiButton>
              </template>
              <div class="popup-panel">
                <p class="popup-panel-title">这就是 Flyout</p>
                <p class="popup-panel-text">Flyout = Popup + presenter 皮肤(背景 / 边框 / 圆角 / 阴影)+ 默认 light dismiss。</p>
                <WuiButton @click="skinnedOpen = false">Close</WuiButton>
              </div>
            </WuiPopup>
          </div>
          <p class="popup-example-caption">
            vs Flyout:左右内容相同,仅差一层皮肤包装——Popup 只提供层级与定位,Flyout 在其上补齐 FlyoutPresenter 观感与默认 light dismiss;ToolTip 再往上补自动触发。
          </p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Placement(①)" type="select" v-model="placement" :options="placementOptions" />
        <DemoOptionRow label="IsLightDismissEnabled(②右 / ③)" type="toggle" v-model="lightDismiss" />
        <DemoOptionRow label="HorizontalOffset(③)" type="number" v-model="horizontalOffset" :min="-100" :max="500" :step="10" />
        <DemoOptionRow label="VerticalOffset(③)" type="number" v-model="verticalOffset" :min="-100" :max="100" :step="10" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.popup-stage {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 40px;
}

.popup-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.popup-example-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
}

.popup-example-caption {
  max-width: 720px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  text-align: center;
}

/* 裸内容(①/④左):刻意不加任何包装样式,呈现「无皮肤原语」的默认观感 */
.popup-bare {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
}

.popup-bare-text {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
  white-space: nowrap;
}

/* 内容面板(②/③/④右):官方示例的包装 Border 等价物——
   AcrylicBackgroundFillColorDefaultBrush 无对应 token,取最近似的
   FlyoutPresenter 背景皮肤 + SurfaceStroke 边框 + OverlayCornerRadius 圆角 */
.popup-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 240px;
  padding: 16px;
  background: var(--wui-flyout-presenter-background);
  border: 1px solid var(--wui-flyout-border-theme);
  border-radius: var(--wui-popup-corner-radius);
  box-shadow: var(--wui-popup-shadow);
}

.popup-panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.popup-panel-text {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}
</style>
