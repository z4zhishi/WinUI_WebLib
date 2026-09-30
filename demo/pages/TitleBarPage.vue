<script setup lang="ts">
// TitleBarPage.vue —— TitleBar 控件示例页(结构照抄 HomePage 母版 / SelectorBarPage 实控件页)。
// 示例组合对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/TitleBar/(TitleBarPage.xaml):
//   - TitlebarConfiguration.txt:Title/Subtitle 文本框 + IsBackButtonVisible/IsPaneToggleButtonVisible
//     开关 → 主示例的选项面板;IconSource(应用图标)/ Content(AutoSuggestBox,MaxWidth 580)/
//     RightHeader(PersonPicture Initials="JD")→ 主示例的组合复刻;
//     源经资源键 TitleBarContentHorizontalAlignment=Stretch 让搜索框随标题栏拉伸 —— Web 侧直接在
//     slot 内容上设宽度(width:100% + max-width:580px),wiki 记录;
//   - TitlebarDragRegions.txt:内容区搜索框 + Status 徽章按钮(交互控件自动排除出拖拽区;
//     IsDragRegion 可覆写 / RecomputeDragRegions 重算)→ 示例 3 的窄窗复刻 + data-wui-drag-region
//     语义标记说明;源明确「拖拽区只能在真实窗口观察」,浏览器内为视觉复刻;
//   - EndEndTitlebarSample.txt:BackRequested/PaneToggleRequested 绑定导航(需真实窗口)→
//     事件日志等价呈现。
// 另按任务规格:IsBackButtonEnabled、inactive(窗口失活模拟)、系统按钮占位开关、
//   「浏览器内为视觉复刻,无真实窗口能力」声明(wiki 与本页均注明)。
// 官方第二个 ControlExample 的「Show window」按钮(TitleBarDragRegionsWindow / TitleBarWindow)
//   依赖 Win32 窗口,浏览器内不可复刻,以说明文案代替。
import { computed, ref } from 'vue'
import WuiAutoSuggestBox from '@/components/AutoSuggestBox.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import WuiPersonPicture from '@/components/PersonPicture.vue'
import WuiTitleBar from '@/components/TitleBar.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'

// —— 主示例:官方 TitlebarConfiguration 复刻(可调参数;DemoOptionRow 契约要求联合类型)——
const title = ref<string | number | boolean>('WinUI Gallery')
const subtitle = ref<string | number | boolean>('Preview')
const isBackButtonVisible = ref<string | number | boolean>(false)
const isBackButtonEnabled = ref<string | number | boolean>(true)
const isPaneToggleButtonVisible = ref<string | number | boolean>(false)
const inactive = ref<string | number | boolean>(false)
const isCaptionButtonsVisible = ref<string | number | boolean>(true)

const titleText = computed(() => String(title.value))
const subtitleText = computed(() => String(subtitle.value))
const backVisible = computed(() => isBackButtonVisible.value === true)
const backEnabled = computed(() => isBackButtonEnabled.value === true)
const paneVisible = computed(() => isPaneToggleButtonVisible.value === true)
const inactiveValue = computed(() => inactive.value === true)
const captionVisible = computed(() => isCaptionButtonsVisible.value === true)

// —— 主示例内容区:官方为 AutoSuggestBox(PlaceholderText="Search...",QueryIcon="Find")——
const searchText = ref('')

// —— 事件日志(BackRequested / PaneToggleRequested / 系统按钮占位 *Requested)——
const lastEvent = ref('—')
const eventCount = ref(0)

function noteEvent(name: string): void {
  lastEvent.value = name
  eventCount.value += 1
}

// —— 示例 3:官方 TitlebarDragRegions 复刻(内容超宽 → Compact 显示态;窄窗演示)——
const dragSearchText = ref('')
const lastDragNote = ref('—')

function onStatusClick(): void {
  // 源:StatusBadge 为交互 Button,默认自动排除出拖拽区;IsDragRegion 可覆写(真实窗口语义)
  lastDragNote.value = 'Status 点击 —— 内容区交互控件自动排除出拖拽区(data-wui-drag-region="false")'
}

// —— 下半区固定开发文档 ——
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['Title', 'string', '标题文本(prop 或 #title slot);空则隐藏标题部(官方开关实时调节)'],
  ['Subtitle', 'string', '副标题文本(prop 或 #subtitle slot);Caption 字号、次级色'],
  ['#icon slot', '—', '应用图标(WinUI IconSource 等价);16×16 框内呈现'],
  ['#left-header slot', '—', '标题栏左侧自定义内容(WinUI LeftHeader)'],
  ['默认 slot(Content)', '—', '标题栏中部内容,默认居中;内容放不下时进入 Compact 态(隐藏标题/副标题、内容左对齐)'],
  ['#right-header slot', '—', '标题栏右侧自定义内容(WinUI RightHeader),位于系统按钮占位之前'],
  ['IsBackButtonVisible', 'boolean(默认 false)', '显示返回按钮;点击发 backRequested(开关实时切换)'],
  ['IsBackButtonEnabled', 'boolean(默认 true)', '返回按钮可用性;false 呈 Disabled 色且不发事件'],
  ['IsPaneToggleButtonVisible', 'boolean(默认 false)', '显示窗格切换按钮;点击发 paneToggleRequested'],
  ['inactive', 'boolean(默认 false)', '【Web 增强】窗口失活模拟:文字转次级色、图标/内容 50% 透明、按钮暂停交互(WinUI 经 InputActivationListener 自动切换 Deactivated 态)'],
  ['isCaptionButtonsVisible', 'boolean(默认 true)', '【Web 增强】右侧最小化/最大化/关闭演示按钮占位;不执行窗口操作,点击仅发事件'],
  ['BackRequested', '() => void', '点击返回按钮(未禁用时;WinUI BackRequested)'],
  ['PaneToggleRequested', '() => void', '点击窗格切换按钮(WinUI PaneToggleRequested)'],
  ['Minimize / Maximize / CloseRequested', '() => void', '【Web 增强】点击对应系统按钮占位;WinUI 中窗口操作由系统执行、无对应控件事件'],
  ['拖拽区语义', '—', '真实窗口整条可拖、交互控件自动排除(IsDragRegion 可覆写);Web 以 data-wui-drag-region 标记演示,无真实拖拽'],
]

// 用法代码随参数实时更新(引号规则:外双内单,放 computed)。
const usageCode = computed(
  () => `<WuiTitleBar
  title="${titleText.value}"
  subtitle="${subtitleText.value}"
  :is-back-button-visible="${backVisible.value}"
  :is-back-button-enabled="${backEnabled.value}"
  :is-pane-toggle-button-visible="${paneVisible.value}"
  :inactive="${inactiveValue.value}"
  :is-caption-buttons-visible="${captionVisible.value}"
  @back-requested="onBackRequested"
  @pane-toggle-requested="onPaneToggleRequested"
  @close-requested="onCloseRequested">
  <template #icon><!-- 应用图标(WinUI IconSource) --></template>
  <WuiAutoSuggestBox v-model:text="searchText" placeholder-text="Search..." query-icon="Find" />
  <template #right-header><!-- 右侧自定义内容(WinUI RightHeader) --></template>
</WuiTitleBar>`,
)
</script>

<template>
  <DemoPage wiki="TitleBar"
    title="TitleBar"
    description="现代标题栏一站式控件:应用图标 + 标题 + 副标题 + 中部交互内容 + 右侧系统按钮占位,并可选返回/窗格切换按钮。浏览器内为视觉复刻:无真实窗口能力 —— 不会执行最小化/最大化/关闭,也不支持系统级拖拽,系统按钮点击仅发事件。"
  >
    <template #demo>
      <div class="titlebar-stage">
        <p class="titlebar-disclaimer">
          浏览器内为视觉复刻(无真实窗口能力):拖拽区、窗口激活/失活、系统按钮窗口操作均以事件与标记演示。
        </p>

        <!-- 示例 1:官方 TitlebarConfiguration 复刻(图标 + 标题/副标题 + 搜索内容 + 右侧头像)
             外层卡片对照官方示例的包裹 Grid:CardBackgroundFillColorDefault + SurfaceStrokeColorDefault
             + OverlayCornerRadius(theme.css 无前两者 token,取最近似,见 wiki 差异节)-->
        <div class="titlebar-example">
          <div class="demo-window">
            <WuiTitleBar
              :title="titleText"
              :subtitle="subtitleText"
              :is-back-button-visible="backVisible"
              :is-back-button-enabled="backEnabled"
              :is-pane-toggle-button-visible="paneVisible"
              :inactive="inactiveValue"
              :is-caption-buttons-visible="captionVisible"
              @back-requested="noteEvent('backRequested')"
              @pane-toggle-requested="noteEvent('paneToggleRequested')"
              @minimize-requested="noteEvent('minimizeRequested')"
              @maximize-requested="noteEvent('maximizeRequested')"
              @close-requested="noteEvent('closeRequested')"
            >
              <template #icon>
                <span class="demo-app-icon" aria-hidden="true">
                  <WuiFontIcon glyph="&#xE71D;" :font-size="11" />
                </span>
              </template>
              <WuiAutoSuggestBox
                v-model:text="searchText"
                placeholder-text="Search..."
                query-icon="Find"
                class="demo-search"
              />
              <template #right-header>
                <WuiPersonPicture initials="JD" class="demo-avatar" />
              </template>
            </WuiTitleBar>
          </div>
          <p class="titlebar-note">
            官方示例 1 复刻:Title / Subtitle / IconSource / Content(AutoSuggestBox,MaxWidth 580)/
            RightHeader(PersonPicture)· 高度 48(有内容区 → ExpandedHeight)
          </p>
          <p class="titlebar-state">
            最近事件:<code>{{ lastEvent }}</code>(共 {{ eventCount }} 次)·
            搜索内容:<code>{{ searchText === '' ? '—' : searchText }}</code>
          </p>
        </div>

        <!-- 示例 2:官方 EndEndTitlebarSample 组合的按钮区(返回 + 窗格切换;事件日志等价)-->
        <div class="titlebar-example">
          <div class="demo-window demo-window--slim">
            <WuiTitleBar
              title="End-to-end 组合"
              subtitle="返回 + 窗格切换"
              :is-back-button-visible="true"
              :is-pane-toggle-button-visible="true"
              @back-requested="noteEvent('backRequested')"
              @pane-toggle-requested="noteEvent('paneToggleRequested')"
            />
          </div>
          <p class="titlebar-note">
            官方 End-to-End 示例复刻:IsBackButtonVisible + IsPaneToggleButtonVisible 同时可见
            (二者同态 → 左标头内边距保持 14;源经事件驱动 NavigationView,浏览器内以事件日志等价)
          </p>
        </div>

        <!-- 示例 3:官方 TitlebarDragRegions 复刻(窄窗 + 内容超宽 → Compact 显示态 + 拖拽区标记)-->
        <div class="titlebar-example">
          <div class="demo-window demo-window--narrow">
            <WuiTitleBar
              title="Drag regions"
              subtitle="内容超宽"
              :is-caption-buttons-visible="true"
              @close-requested="noteEvent('closeRequested')"
            >
              <div class="demo-drag-content">
                <WuiAutoSuggestBox
                  v-model:text="dragSearchText"
                  placeholder-text="Search..."
                  query-icon="Find"
                  class="demo-drag-search"
                />
                <button type="button" class="demo-status-badge" @click="onStatusClick">Status</button>
              </div>
            </WuiTitleBar>
          </div>
          <p class="titlebar-note">
            官方拖拽区示例复刻:内容期望宽度超过内容列 → Compact 态(标题/副标题隐藏、内容左对齐 +
            右距 16);交互控件(搜索框 / Status)自动标 data-wui-drag-region="false",其余区域可拖
          </p>
          <p class="titlebar-state">拖拽区说明:<code>{{ lastDragNote }}</code></p>
        </div>

        <!-- 示例 4:仅标题 + 副标题(无内容区 → Compact 高度 32)与失活模拟 -->
        <div class="titlebar-example">
          <div class="demo-window demo-window--slim">
            <WuiTitleBar
              title="仅标题与副标题"
              subtitle="无内容区 → 高度 32"
              :is-caption-buttons-visible="false"
              :inactive="true"
            />
          </div>
          <p class="titlebar-note">
            HeightGroup 对照:无 Content/LeftHeader/RightHeader → CompactHeight 32
            (有内容区的主示例为 ExpandedHeight 48);本行同时演示 inactive 失活视觉
            (窗口未激活:文字转次级色、按钮暂停交互)
          </p>
        </div>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Title" type="text" v-model="title" placeholder="标题文本" />
        <DemoOptionRow label="Subtitle" type="text" v-model="subtitle" placeholder="副标题文本" />
        <DemoOptionRow label="IsBackButtonVisible" type="toggle" v-model="isBackButtonVisible" />
        <DemoOptionRow label="IsBackButtonEnabled" type="toggle" v-model="isBackButtonEnabled" />
        <DemoOptionRow label="IsPaneToggleButtonVisible" type="toggle" v-model="isPaneToggleButtonVisible" />
        <DemoOptionRow label="inactive 窗口失活模拟" type="toggle" v-model="inactive" />
        <DemoOptionRow label="系统按钮占位(最小化/最大化/关闭)" type="toggle" v-model="isCaptionButtonsVisible" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.titlebar-stage {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.titlebar-disclaimer {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.titlebar-example {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

/* 官方示例的外层卡片:CardBackgroundFillColorDefault + SurfaceStrokeColorDefault + OverlayCornerRadius;
   前两者 theme.css 无 token,取最近似(页面底色 + base-low 描边),圆角取 4px token */
.demo-window {
  box-sizing: border-box;
  width: 100%;
  max-width: 860px;
  overflow: hidden;
  background: var(--wui-application-page-background-theme);
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.demo-window--slim {
  max-width: 560px;
}

/* 示例 3:窄窗 —— 内容(560px)超过内容列 → Compact 显示态(标题/副标题隐藏、内容左对齐) */
.demo-window--narrow {
  max-width: 440px;
}

/* 应用图标(WinUI Gallery 的 ImageIconSource 等价):16×16 框 + 强调色底 + 白色字形 */
.demo-app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--wui-accent-button-foreground, var(--wui-system-control-foreground-alt-high));
  background: var(--wui-accent-button-background, var(--wui-system-accent-color));
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

/* 官方示例 Content 的 AutoSuggestBox:HorizontalAlignment=Stretch + MaxWidth=580 */
.demo-search {
  width: 100%;
  max-width: 580px;
}

/* 官方示例 RightHeader 的 PersonPicture:30×30 */
.demo-avatar {
  width: 30px;
  height: 30px;
}

/* 拖拽区示例内容:固定总宽(560px)> 窄窗内容列(440px)→ 触发 Compact 显示态 */
.demo-drag-content {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 560px;
}

.demo-drag-search {
  flex: 0 0 auto;
  width: 440px;
}

/* 源 StatusBadge:AccentButtonStyle 徽章按钮(内容区交互控件,自动排除出拖拽区) */
.demo-status-badge {
  flex: 0 0 auto;
  padding: 4px 12px;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-accent-button-foreground, var(--wui-system-control-foreground-alt-high));
  background: var(--wui-accent-button-background, var(--wui-system-accent-color));
  border: none;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  cursor: pointer;
}

.demo-status-badge:hover {
  filter: brightness(1.08);
}

.demo-status-badge:active {
  filter: brightness(0.92);
}

.titlebar-note {
  max-width: 720px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
  text-align: center;
}

.titlebar-state {
  display: flex;
  gap: 6px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.titlebar-state code {
  color: var(--wui-application-foreground-theme);
}
</style>
