<script setup lang="ts">
// NavigationViewPage.vue —— NavigationView 控件示例页(结构照抄 HomePage/SplitViewPage 母版)。
// 参数组合对照官方示例 CK/WinUI-Gallery/WinUIGallery/Samples/NavigationView/NavigationViewPage.xaml:
//   例 1 = 基本左窗格导航(PaneDisplayMode 下拉含 Auto/Left/LeftCompact/LeftMinimal/Top,菜单项与
//          vue-router 联动,对照官方 SelectionChanged 导航 + paneDisplayMode 调节);
//   例 2 = Top 模式(NavigationviewPanedisplaymodeTop:水平菜单 + 页脚项右靠 + Header);
//   例 3 = Compact 模式 + 层级菜单(HierarchicalNavigationview:子项展开、SelectsOnInvoked=false 的
//          「文档选项」仅展开不选中、FooterMenuItems,紧凑栏经汉堡按钮开合)。
// 事件回显:itemInvoked / selectionChanged;窗格开关 v-model:is-pane-open。
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WuiNavigationView from '@/components/NavigationView.vue'
import type {
  NavigationViewItemData,
  NavigationViewInvokeArgs,
  NavigationViewSelectionChangedArgs,
} from '@/components/NavigationView.vue'
import WuiFontIcon from '@/components/FontIcon.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'

// ============ 例 1:左窗格基本导航(与 vue-router 联动)+ 参数面板 ============
// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)
const paneDisplayMode = ref<string | number | boolean>('Left')
const isPaneOpen = ref<string | number | boolean>(true)
const openPaneLength = ref<string | number | boolean>(320)
const compactPaneLength = ref<string | number | boolean>(48)
const headerText = ref('应用标题')
const paneTitleText = ref('窗格标题')

const modeValue = computed(() => {
  const value = String(paneDisplayMode.value)
  return value === 'Auto' || value === 'Top' || value === 'LeftCompact' || value === 'LeftMinimal'
    ? value
    : 'Left'
})
const openBool = computed({
  get: () => isPaneOpen.value === true,
  set: (value: boolean) => {
    isPaneOpen.value = value
  },
})
const openValue = computed(() => {
  const parsed = Number(openPaneLength.value)
  return Number.isFinite(parsed) ? parsed : 320
})
const compactValue = computed(() => {
  const parsed = Number(compactPaneLength.value)
  return Number.isFinite(parsed) ? parsed : 48
})

const modeOptions = [
  { label: 'Auto(按宽度断点)', value: 'Auto' },
  { label: 'Left(默认)', value: 'Left' },
  { label: 'LeftCompact', value: 'LeftCompact' },
  { label: 'LeftMinimal', value: 'LeftMinimal' },
  { label: 'Top', value: 'Top' },
]

// 菜单数据:tag 即站内路由,点击 itemInvoked → router.push;选中随路由回写
const ROUTE_ITEMS: NavigationViewItemData[] = [
  { tag: '/home', label: '首页', icon: '\uE80F' },
  { tag: '/button', label: 'Button 按钮', icon: '\uE71D' },
  { tag: '/splitview', label: 'SplitView', icon: '\uE8A9' },
  { tag: '/navigationview', label: 'NavigationView(本页)', icon: '\uE700' },
]

const route = useRoute()
const router = useRouter()
const routerSelection = ref<string | number | null>(route.path)

watch(
  () => route.path,
  (path) => {
    routerSelection.value = path
  },
)

const lastEvent = ref('—')

function onRouterItemInvoked(args: NavigationViewInvokeArgs): void {
  lastEvent.value = `itemInvoked → ${args.label}`
  void router.push(String(args.tag))
}

function onSelectionChanged(args: NavigationViewSelectionChangedArgs): void {
  lastEvent.value = `selectionChanged → ${args.label || String(args.tag ?? 'null')}`
}

// ============ 例 2:Top 模式(对照 NavigationviewPanedisplaymodeTop)============
const topSelection = ref<string | number | null>('m1')
const TOP_ITEMS: NavigationViewItemData[] = [
  { tag: 'm1', label: '菜单项 1' },
  { tag: 'm2', label: '菜单项 2' },
  { tag: 'm3', label: '菜单项 3' },
  { tag: 'm4', label: '菜单项 4' },
]
const TOP_FOOTER: NavigationViewItemData[] = [{ tag: 'top-settings', label: '设置', icon: '\uE713' }]
const topSelectedLabel = computed(
  () => TOP_ITEMS.find((item) => item.tag === topSelection.value)?.label ?? '未选中',
)

// ============ 例 3:Compact + 层级菜单(对照 HierarchicalNavigationview)============
const hierSelection = ref<string | number | null>('home')
const HIER_ITEMS: NavigationViewItemData[] = [
  { tag: 'home', label: '主页', icon: '\uE80F' },
  {
    tag: 'account',
    label: '账户',
    icon: '\uE77B',
    children: [
      { tag: 'mail', label: '邮件', icon: '\uE715' },
      { tag: 'calendar', label: '日历', icon: '\uE787' },
    ],
  },
  { isSeparator: true },
  {
    tag: 'doc-options',
    label: '文档选项',
    icon: '\uE8A5',
    selectsOnInvoked: false,
    children: [
      { tag: 'create', label: '新建文件', icon: '\uE8E5' },
      { tag: 'upload', label: '上传文件', icon: '\uE898' },
    ],
  },
]
const HIER_FOOTER: NavigationViewItemData[] = [{ tag: 'settings', label: '设置', icon: '\uE713' }]
const hierSelectedLabel = computed(() => {
  for (const item of HIER_ITEMS) {
    if (item.tag === hierSelection.value) return item.label ?? ''
    for (const child of item.children ?? []) {
      if (child.tag === hierSelection.value) return child.label ?? ''
    }
  }
  return '未选中'
})

// ============ 下半区固定开发文档 ============
const docsHeaders = ['属性 / 事件', '类型', '说明']
const docsRows: (string | number)[][] = [
  ['paneDisplayMode', "'Auto' | 'Left' | 'Top' | 'LeftCompact' | 'LeftMinimal'", '窗格展示模式,默认 Auto;Auto 按容器宽度断点解析(下拉实时切换)'],
  ['isPaneOpen (v-model)', 'boolean(v-model:is-pane-open)', '窗格开关状态,双向绑定;LeftMinimal 下窗格浮层开合(开关实时切换)'],
  ['selectedItem (v-model)', 'string | number | null(v-model:selected-item)', '选中项 tag(WinUI SelectedItem 的 Web 标识),null 为未选中'],
  ['openPaneLength', 'number', '展开态窗格宽度 px,默认 320(滑块实时调节)'],
  ['compactPaneLength', 'number', '紧凑栏宽度 px,默认 48,仅 Compact 系生效(滑块实时调节)'],
  ['expandedModeThresholdWidth', 'number', 'Auto 模式 Left 断点,默认 1008(WinUI ExpandedModeThresholdWidth)'],
  ['compactModeThresholdWidth', 'number', 'Auto 模式 LeftCompact 断点,默认 641(WinUI CompactModeThresholdWidth)'],
  ['header', 'string', '页头文本(WinUI Header);富内容用 #header slot'],
  ['paneTitle', 'string', '窗格标题(WinUI PaneTitle)'],
  ['menuItems', 'NavigationViewItemData[]', '数据驱动菜单项;提供 #menu-items slot 时被覆盖'],
  ['footerMenuItems', 'NavigationViewItemData[]', '数据驱动页脚菜单项(Top 模式右靠)'],
  ['paneBackground', 'string', '窗格背景色(CSS 颜色);空串用 token 默认'],
  ['paneLabel', 'string', '浮层窗格无障碍名(缺省取 paneTitle)'],
  ['itemInvoked', '(args: NavigationViewInvokeArgs) => void', '条目被点击时触发(含 SelectsOnInvoked=false 的纯展开项)'],
  ['selectionChanged', '(args: NavigationViewSelectionChangedArgs) => void', '选中项实际变化时触发(含程序化赋值)'],
  ['paneOpened / paneClosing / paneClosed', '() => void', '窗格开合事件(转发内嵌 SplitView,时机同 WinUI)'],
  ['默认 slot', '—', '内容区(ContentGrid 内,页头之下)'],
  ['#menu-items / #footer-menu-items slot', '—', '自定义菜单区;内放 <WuiNavigationViewItem tag=… label=… icon=… />'],
  ['#pane-footer / #header slot', '—', '窗格底部区(WinUI PaneFooter)/ 富页头内容'],
  ['<WuiNavigationViewItem>', '同文件具名导出', 'NavigationViewItem 子组件:图标 + 文本 + 选中态;子项展开仅数据驱动支持'],
]

// 用法代码随参数实时更新(较长,放 computed;引号规则:外双内单)
const usageCode = computed(
  () => `<WuiNavigationView
  v-model:selected-item="selected"
  v-model:is-pane-open="isPaneOpen"
  pane-display-mode="${modeValue.value}"
  :open-pane-length="${openValue.value}"
  :compact-pane-length="${compactValue.value}"
  header="${headerText.value}"
  pane-title="${paneTitleText.value}"
  :menu-items="menuItems"
  @item-invoked="onItemInvoked"
  @selection-changed="onSelectionChanged">
  <!-- 内容区 -->
</WuiNavigationView>`,
)
</script>

<template>
  <DemoPage wiki="NavigationView"
    title="NavigationView"
    description="汉堡导航容器:可开合窗格(菜单项、页脚项、窗格标题)+ 页头 + 内容卡。PaneDisplayMode 支持 Auto(按宽度断点)/ Left / LeftCompact / LeftMinimal / Top;Minimal 模式窗格浮层支持遮罩点击、Esc 与轻扫关闭。"
  >
    <template #demo>
      <div class="navview-stage">
        <!-- 例 1:左窗格基本导航(vue-router 联动)+ 参数面板 -->
        <div class="navview-frame">
          <WuiNavigationView
            v-model:selected-item="routerSelection"
            v-model:is-pane-open="openBool"
            :pane-display-mode="modeValue"
            :open-pane-length="openValue"
            :compact-pane-length="compactValue"
            :header="headerText"
            :pane-title="paneTitleText"
            :menu-items="ROUTE_ITEMS"
            pane-label="主导航窗格"
            class="navview-demo"
            @item-invoked="onRouterItemInvoked"
            @selection-changed="onSelectionChanged"
          >
            <div class="navview-content">
              <p class="navview-content-line">
                当前路由:<code>{{ route.path }}</code>
              </p>
              <p class="navview-content-line">最近事件:<code>{{ lastEvent }}</code></p>
              <p class="navview-content-hint">点击左窗格菜单项将在站内路由跳转(与 vue-router 联动)。</p>
            </div>
          </WuiNavigationView>
        </div>
        <p class="navview-caption">
          PaneDisplayMode=Auto 按控件宽度断点(1008/641,WinUI 默认)在 Left / LeftCompact / LeftMinimal 间自适应;演示框较窄时可看到模式自动降级。Top 模式下窗格参数不生效。
        </p>

        <!-- 例 2:Top 模式 -->
        <div class="navview-frame navview-frame--top">
          <WuiNavigationView
            v-model:selected-item="topSelection"
            pane-display-mode="Top"
            header="页头文本"
            :menu-items="TOP_ITEMS"
            :footer-menu-items="TOP_FOOTER"
            class="navview-demo"
          >
            <div class="navview-content">
              <p class="navview-content-line">Top 模式:菜单项水平排列,选中指示条显示于条目底部;页脚菜单项右靠。</p>
              <p class="navview-content-line">已选:{{ topSelectedLabel }}</p>
            </div>
          </WuiNavigationView>
        </div>
        <p class="navview-caption">
          对照官方 NavigationviewPanedisplaymodeTop 示例:顶栏高 48px,顶栏项高 36px、底部 16x3 选中指示条。
        </p>

        <!-- 例 3:Compact + 层级菜单(数据驱动,子项展开) -->
        <div class="navview-frame">
          <WuiNavigationView
            v-model:selected-item="hierSelection"
            pane-display-mode="LeftCompact"
            header="层级导航"
            :menu-items="HIER_ITEMS"
            :footer-menu-items="HIER_FOOTER"
            class="navview-demo"
          >
            <div class="navview-content">
              <p class="navview-content-line">LeftCompact 模式:关闭时保留 48px 图标栏,点汉堡按钮展开窗格。</p>
              <p class="navview-content-line">已选:{{ hierSelectedLabel }}</p>
              <p class="navview-content-hint">「文档选项」设了 selects-on-invoked=false,点击仅展开/收起子树、不参与选中(对照官方同名示例)。</p>
            </div>
          </WuiNavigationView>
        </div>
        <p class="navview-caption">
          层级菜单为数据驱动:children 声明子项,展开箭头(字形 \uE70D,chevron)或整行点击展开/收起;紧凑栏中点带子项的条目会先展开窗格。
        </p>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow
          label="PaneDisplayMode"
          type="select"
          v-model="paneDisplayMode"
          :options="modeOptions"
        />
        <DemoOptionRow label="IsPaneOpen" type="toggle" v-model="isPaneOpen" />
        <DemoOptionRow
          label="OpenPaneLength"
          type="slider"
          v-model="openPaneLength"
          :min="200"
          :max="480"
          :step="8"
        />
        <DemoOptionRow
          label="CompactPaneLength"
          type="slider"
          v-model="compactPaneLength"
          :min="24"
          :max="96"
          :step="4"
        />
        <DemoOptionRow label="Header" type="text" v-model="headerText" />
        <DemoOptionRow label="PaneTitle" type="text" v-model="paneTitleText" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="docsHeaders" :rows="docsRows" />
      <h4 class="navview-docs-subtitle">图标字形取自 Segoe Fluent Icons / MDL2(与站内 FontIcon 一致)</h4>
      <div class="navview-glyphs" aria-hidden="true">
        <span class="navview-glyph" v-for="glyph in ['\uE700', '\uE80F', '\uE713', '\uE70D']" :key="glyph">
          <WuiFontIcon :glyph="glyph" :font-size="16" />
        </span>
      </div>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.navview-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

/* 演示画框:对照官方示例 NavigationView Height=460 的固定舞台 */
.navview-frame {
  width: min(100%, 720px);
  height: 440px;
  overflow: hidden;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.navview-frame--top {
  height: 360px;
}

.navview-demo {
  height: 100%;
}

.navview-caption {
  margin: 0 0 24px;
  max-width: min(100%, 720px);
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 内容区回显(默认 slot 演示)—— */
.navview-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px 16px;
}

.navview-content-line {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.navview-content-line code {
  color: var(--wui-default-text-foreground-theme);
}

.navview-content-hint {
  margin: 4px 0 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.navview-docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.navview-glyphs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.navview-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  color: var(--wui-application-foreground-theme);
}
</style>
