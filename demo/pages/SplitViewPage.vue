<script setup lang="ts">
// SplitViewPage.vue —— SplitView 控件示例页(结构照抄 HomePage 母版)。
// 参数组合对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/SplitView/SplitViewPage.xaml:
//   IsPaneOpen 开关、DisplayMode 四模式下拉、OpenPaneLength / CompactPaneLength 滑块、
//   窗格导航链接点击回显(官方 NavLinks + ItemClick);Placement 扩为四向下拉(官方为 Left/Right 开关)。
//   另补充:内容区汉堡按钮开关(导航栏惯用法)、事件日志(PaneClosing/PaneClosed/PaneOpened)、
//   内置空 pane 示例(不提供 #pane slot 时仅呈现窗格背景)。
import { computed, ref } from 'vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiSplitView from '@/components/SplitView.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'

// —— 可调参数(DemoOptionRow 的 v-model 契约:ref 声明为联合类型)——
// 官方默认:DisplayMode CompactOverlay、IsPaneOpen true、OpenPaneLength 256、CompactPaneLength 48
const isPaneOpen = ref<string | number | boolean>(true)
const displayMode = ref<string | number | boolean>('CompactOverlay')
const panePlacement = ref<string | number | boolean>('Left')
const openPaneLength = ref<string | number | boolean>(256)
const compactPaneLength = ref<string | number | boolean>(48)

const openValue = computed(() => {
  const parsed = Number(openPaneLength.value)
  return Number.isFinite(parsed) ? parsed : 256
})
const compactValue = computed(() => {
  const parsed = Number(compactPaneLength.value)
  return Number.isFinite(parsed) ? parsed : 48
})
const openBool = computed({
  get: () => isPaneOpen.value === true,
  set: (value: boolean) => {
    isPaneOpen.value = value
  },
})
const modeValue = computed(() => {
  const value = String(displayMode.value)
  return value === 'Overlay' || value === 'CompactInline' || value === 'CompactOverlay' ? value : 'Inline'
})
const placementValue = computed(() => {
  const value = String(panePlacement.value)
  return value === 'Right' || value === 'Top' || value === 'Bottom' ? value : 'Left'
})

const modeOptions = [
  { label: 'Inline(默认)', value: 'Inline' },
  { label: 'CompactInline', value: 'CompactInline' },
  { label: 'Overlay', value: 'Overlay' },
  { label: 'CompactOverlay', value: 'CompactOverlay' },
]
const placementOptions = [
  { label: 'Left(默认)', value: 'Left' },
  { label: 'Right', value: 'Right' },
  { label: 'Top', value: 'Top' },
  { label: 'Bottom', value: 'Bottom' },
]

// —— 窗格导航链接(对照官方 NavLinks + ItemClick 回显)——
interface NavLink {
  label: string
  glyph: string
}
const NAV_LINKS: NavLink[] = [
  { label: '主页', glyph: '\uE80F' },
  { label: '应用', glyph: '\uE71D' },
  { label: '游戏', glyph: '\uE7FC' },
  { label: '音乐', glyph: '\uE8D6' },
  { label: '设置', glyph: '\uE713' },
]
const selectedLink = ref('主页(点击窗格链接回显)')

function onNavLinkClick(link: NavLink): void {
  selectedLink.value = link.label
}

// —— 事件日志(PaneClosing / PaneClosed / PaneOpened 实时呈现)——
const lastEvent = ref('—')

function logEvent(name: 'paneOpened' | 'paneClosing' | 'paneClosed'): void {
  lastEvent.value = name
}

// —— 第二例:内置空 pane(不提供 #pane slot)——
const emptyPaneOpen = ref<string | number | boolean>(true)
const emptyBool = computed({
  get: () => emptyPaneOpen.value === true,
  set: (value: boolean) => {
    emptyPaneOpen.value = value
  },
})

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['panePlacement', "'Left' | 'Right' | 'Top' | 'Bottom'", '窗格方位,默认 Left;Top/Bottom 为 Web 同构推演(下拉实时切换)'],
  ['displayMode', "'Inline' | 'Overlay' | 'CompactInline' | 'CompactOverlay'", '展示模式,默认 Inline;Overlay 系浮层 + 遮罩,Compact 系关闭时保留紧凑栏(下拉实时切换)'],
  ['isPaneOpen (v-model)', 'boolean(v-model:is-pane-open)', '窗格开关状态,双向绑定(与参数面板开关联动)'],
  ['openPaneLength', 'number', '展开态窗格长度 px,默认 320(滑块实时调节);Top/Bottom 时为窗格高度'],
  ['compactPaneLength', 'number', '紧凑栏长度 px,默认 48,仅 Compact 系生效(滑块实时调节)'],
  ['paneBackground', 'string', '窗格背景色(CSS 颜色);空串用 token 默认(ChromeLow)'],
  ['paneLabel', 'string', '浮层窗格的无障碍名(aria-label)'],
  ['PaneOpened', '() => void', '打开动画结束后触发(WinUI PaneOpened 同时机)'],
  ['PaneClosing', '() => void', '关闭动画开始前触发(WinUI PaneClosing 同序)'],
  ['PaneClosed', '() => void', '关闭动画结束后触发(WinUI PaneClosed 同时机)'],
  ['默认 slot', '—', '主内容区'],
  ['#pane slot', '—', '窗格内容;未提供时呈现内置空 pane(仅窗格背景)'],
]

// 用法代码随参数实时更新(较长,放 computed,引号规则:外双内单)。
const usageCode = computed(
  () => `<WuiSplitView
  v-model:is-pane-open="isPaneOpen"
  display-mode="${modeValue.value}"
  pane-placement="${placementValue.value}"
  :open-pane-length="${openValue.value}"
  :compact-pane-length="${compactValue.value}"
  @pane-opened="logEvent('paneOpened')"
  @pane-closing="logEvent('paneClosing')"
  @pane-closed="logEvent('paneClosed')">
  <template #pane>
    <!-- 导航链接等窗格内容 -->
  </template>
  <!-- 主内容区 -->
</WuiSplitView>`,
)
</script>

<template>
  <DemoPage wiki="SplitView"
    title="SplitView"
    description="带两个内容区的容器:窗格(pane)常用于侧边导航等辅助内容,支持 Inline / CompactInline / Overlay / CompactOverlay 四种展示模式与四向摆放。Overlay 模式下窗格浮于内容之上,点击遮罩、按 Esc 或沿关闭方向轻扫窗格即可关闭。"
  >
    <template #demo>
      <div class="splitview-stage">
        <!-- 主演示:与参数面板联动(官方示例的参数组合) -->
        <div class="splitview-frame">
          <WuiSplitView
            v-model:is-pane-open="openBool"
            :display-mode="modeValue"
            :pane-placement="placementValue"
            :open-pane-length="openValue"
            :compact-pane-length="compactValue"
            pane-label="导航窗格"
            class="splitview-demo"
            @pane-opened="logEvent('paneOpened')"
            @pane-closing="logEvent('paneClosing')"
            @pane-closed="logEvent('paneClosed')"
          >
            <template #pane>
              <div class="splitview-pane-content">
                <p class="splitview-pane-title">窗格内容</p>
                <nav class="splitview-nav">
                  <button
                    v-for="link in NAV_LINKS"
                    :key="link.label"
                    type="button"
                    class="splitview-nav-item"
                    @click="onNavLinkClick(link)"
                  >
                    <WuiFontIcon :glyph="link.glyph" :font-size="16" />
                    <span class="splitview-nav-label">{{ link.label }}</span>
                  </button>
                </nav>
              </div>
            </template>

            <!-- 主内容区:汉堡开关 + 点击回显(对照官方 content TextBlock) -->
            <div class="splitview-content">
              <div class="splitview-content-bar">
                <button
                  type="button"
                  class="splitview-hamburger"
                  :aria-expanded="openBool"
                  aria-label="开关窗格"
                  @click="openBool = !openBool"
                >
                  <WuiFontIcon glyph="&#xE700;" :font-size="16" />
                </button>
                <span class="splitview-content-title">主内容区</span>
              </div>
              <p class="splitview-content-body">窗格打开:{{ openBool }} · 最近事件:<code>{{ lastEvent }}</code></p>
              <p class="splitview-content-body">已选导航:{{ selectedLink }}</p>
            </div>
          </WuiSplitView>
        </div>
        <p class="splitview-caption">
          汉堡按钮或参数面板可开关窗格;Overlay / CompactOverlay 模式下支持 Esc、遮罩点击,以及沿关闭方向轻扫窗格关闭(左窗格向左、右窗格向右、上窗格向上、下窗格向下)。
        </p>

        <!-- 第二例:内置空 pane(不提供 #pane slot,仅呈现窗格背景) -->
        <div class="splitview-frame">
          <WuiSplitView
            v-model:is-pane-open="emptyBool"
            display-mode="Inline"
            :open-pane-length="160"
            class="splitview-demo"
          >
            <button type="button" class="splitview-inline-toggle" @click="emptyBool = !emptyBool">
              {{ emptyBool ? '关闭空窗格' : '展开空窗格' }}
            </button>
          </WuiSplitView>
        </div>
        <p class="splitview-caption">未提供 #pane slot:内置空 pane,展开后仅呈现窗格背景色(Inline 推挤内容)。</p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="IsPaneOpen" type="toggle" v-model="isPaneOpen" />
        <DemoOptionRow
          label="DisplayMode"
          type="select"
          v-model="displayMode"
          :options="modeOptions"
        />
        <DemoOptionRow
          label="PanePlacement"
          type="select"
          v-model="panePlacement"
          :options="placementOptions"
        />
        <DemoOptionRow
          label="OpenPaneLength"
          type="slider"
          v-model="openPaneLength"
          :min="128"
          :max="480"
          :step="8"
        />
        <DemoOptionRow
          label="CompactPaneLength"
          type="slider"
          v-model="compactPaneLength"
          :min="24"
          :max="128"
          :step="8"
        />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.splitview-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

/* 演示画框:对照官方示例 Grid Height=300 Width=400 的固定舞台 */
.splitview-frame {
  width: min(100%, 480px);
  height: 300px;
  overflow: hidden;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.splitview-demo {
  height: 100%;
}

.splitview-caption {
  margin: 0 0 24px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 窗格内容(PANE CONTENT + NavLinks 对照)—— */
.splitview-pane-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 12px 0;
  overflow-y: auto;
}

.splitview-pane-title {
  margin: 0;
  padding: 0 12px 0 16px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
  white-space: nowrap;
}

.splitview-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.splitview-nav-item {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0 2px;
  padding: 10px 12px 10px 16px;
  font: inherit;
  color: var(--wui-default-text-foreground-theme);
  text-align: left;
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

/* 导航项交互四态(ListView/ListBox 项的 Subtle 系 token 最近似) */
.splitview-nav-item:hover {
  background: var(--wui-grid-view-item-background-pointer-over);
}

.splitview-nav-item:active {
  background: var(--wui-grid-view-item-background-pressed);
}

.splitview-nav-item:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.splitview-nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* —— 主内容区(汉堡开关 + SPLITVIEW CONTENT 回显)—— */
.splitview-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  padding: 12px;
}

.splitview-content-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.splitview-hamburger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 36px;
  padding: 0;
  font: inherit;
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.splitview-hamburger:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.splitview-hamburger:active {
  color: var(--wui-button-pressed-foreground-theme);
  background: var(--wui-button-pressed-background-theme);
}

.splitview-hamburger:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}

.splitview-content-title {
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.splitview-content-body {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.splitview-content-body code {
  color: var(--wui-default-text-foreground-theme);
}

.splitview-inline-toggle {
  align-self: flex-start;
  margin: 12px;
  padding: 5px 12px;
  font: inherit;
  color: var(--wui-button-foreground-theme);
  background: var(--wui-button-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.splitview-inline-toggle:hover {
  color: var(--wui-button-pointer-over-foreground-theme);
  background: var(--wui-button-pointer-over-background-theme);
}

.splitview-inline-toggle:focus-visible {
  outline: 2px solid var(--wui-system-control-focus-visual-primary);
  outline-offset: 1px;
}
</style>
