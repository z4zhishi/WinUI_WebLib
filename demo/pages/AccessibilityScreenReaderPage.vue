<script setup lang="ts">
// AccessibilityScreenReaderPage.vue —— 无障碍「屏幕阅读器」规范页
// (对应官方 WinUI Gallery Samples/AccessibilityScreenReader/)。
// WinUI 版讲 AutomationProperties(Name/FullDescription/HelpText/LabeledBy/
// PositionInSet/SizeOfSet/AccessibilityView/LandmarkType/HeadingLevel);
// Web 版做「本库无障碍规范 + 自测工具」:role/aria 约定表 +
// 演示区「播报文本展示」(聚焦/悬停控件时实时合成 Narrator 风格播报串)。
import { computed, ref, useId } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiCheckBox from '@/components/CheckBox.vue'
import WuiComboBox from '@/components/ComboBox.vue'
import WuiListView from '@/components/ListView.vue'
import WuiTextBox from '@/components/TextBox.vue'
import WuiToggleSwitch from '@/components/ToggleSwitch.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(catalog.ts 中 AccessibilityScreenReader 的 subtitle/描述译写)——
const PAGE_TITLE: BilingualText = { zh: 'Screen Reader(屏幕阅读器)', en: 'Screen Reader' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '屏幕阅读器(如讲述器)把文本转换为语音,帮助失明或低视力用户。屏幕阅读器用每个控件的无障碍名称(UIA Name / Web 可访问名)报告其名称、角色与内容。本页给出本库的 role/aria 约定,并演示各控件会被如何「播报」。',
  en: 'Screen readers (e.g. Narrator) convert text into speech. They report each control\'s name, role and content from its accessible name (UIA Name / Web accessible name). This page documents this library\'s role/aria conventions and shows how each control is announced.',
}
const NAME_TITLE: BilingualText = { zh: '可访问名称', en: 'Accessible names' }
const NAME_DESC: BilingualText = {
  zh: '可访问名称是屏幕阅读器用来描述 UI 元素的简短描述性文本。它应当简短并与可见标签一致——用户每次导航到该控件都会听到它。内容可转字符串的控件会自动从可见文本获得名称;图像、输入框等必须显式提供。',
  en: 'An accessible name is a short, descriptive string a screen reader uses to describe an element. Keep it short and consistent with the visible label. Controls with stringable content get a name automatically; images and inputs must provide one explicitly.',
}
const NAME_AUTO_TITLE: BilingualText = { zh: '自动获得名称(内容文本)', en: 'Automatic names (from content)' }
const NAME_AUTO_OUTPUT: BilingualText = {
  zh: '屏幕阅读器会把这个按钮读作「下载调查问卷,按钮」——名称自动取自内容。',
  en: 'Screen readers will read this button as "Download survey, button" — the name is derived from the content.',
}
const NAME_HEADER_TITLE: BilingualText = { zh: '标头与占位符(输入框)', en: 'Headers and placeholders (inputs)' }
const NAME_HEADER_OUTPUT: BilingualText = {
  zh: '本库 TextBox 以 <label for> 关联 Header(名称);PlaceholderText 仅是视觉占位。与 WinUI 不同,Web 端占位符不会自动提升为可访问名(见下方差异表),所以只有占位符的输入框在 Web 端是无名的——这是本库与 WinUI 的已知差异。',
  en: 'This library associates the header via <label for> (the name); PlaceholderText is only a visual placeholder. Unlike WinUI, web placeholders are not promoted to accessible names (see the diff table), so a placeholder-only input remains unnamed on the web.',
}
const NAME_MANUAL_TITLE: BilingualText = { zh: '手动设置名称(列表与图像)', en: 'Setting names manually (lists and images)' }
const NAME_MANUAL_OUTPUT: BilingualText = {
  zh: '列表读作「联系人,列表」;图像读作 alt/aria-label「一串葡萄,图像」。WinUI 用 AutomationProperties.Name,Web 用 aria-label / alt。',
  en: 'The list is read as "Contacts, list"; the image as its alt/aria-label "Grapes, image". WinUI uses AutomationProperties.Name; the web uses aria-label / alt.',
}
const LIVE_TITLE: BilingualText = { zh: '播报文本展示(自测工具)', en: 'Announcement preview (self-check tool)' }
const LIVE_DESC: BilingualText = {
  zh: '用 Tab / 指针扫过下方控件,「当前播报」按讲述器风格实时合成:名称,角色[,状态][,第 n 项/共 m 项]。合成规则即为正下方 role/aria 约定表的可运行版本。',
  en: 'Tab or hover the controls below: "current announcement" composes a Narrator-style string live: name, role[, state][, position/size]. The composition rules are the runnable version of the role/aria table below.',
}
const LIVE_CURRENT: BilingualText = { zh: '当前播报', en: 'Current announcement' }
const LIVE_EMPTY: BilingualText = { zh: '将焦点或指针移到演示控件上…', en: 'Move focus or pointer onto a demo control…' }
const DESC_TITLE: BilingualText = { zh: '描述与帮助文本', en: 'Description and help text' }
const DESC_OUTPUT: BilingualText = {
  zh: '复选框通过 aria-describedby 关联说明段落(WinUI FullDescription/HelpText 的等价物);按钮用 title + aria-describedby 提示(WinUI HelpText + ToolTip)。',
  en: 'The checkbox links its description via aria-describedby (equivalent of FullDescription/HelpText); the button uses title + aria-describedby (HelpText + ToolTip).',
}
const POSITION_TITLE: BilingualText = { zh: '组内位置(PositionInSet / SizeOfSet)', en: 'Position in set' }
const POSITION_OUTPUT: BilingualText = {
  zh: '列表型控件(ListView/ComboBox/TreeView)的 option 天然可由 aria-posinset/aria-setsize 标注;自由布局需手动指定。',
  en: 'Options of list-like controls can carry aria-posinset/aria-setsize; free-form layouts need manual markers.',
}
const LANDMARK_TITLE: BilingualText = { zh: '地标与标题', en: 'Landmarks and headings' }
const LANDMARK_DESC: BilingualText = {
  zh: '地标标识界面的「大区块」(导航 / 主内容 / 搜索),标题划分区块层级。讲述器扫描模式下按 D / Shift+D 旋转地标;Web 端用 landmark role 族 + 标题元素(h1–h6),屏幕阅读器可像明眼用户扫读标题一样跳转。',
  en: 'Landmarks identify major regions (navigation / main / search); headings structure sections. Narrator rotates landmarks with D / Shift+D; the web uses landmark roles + heading elements (h1–h6).',
}
const OPT_STATE: BilingualText = { zh: '播报包含状态', en: 'Announce state' }
const OPT_POSITION: BilingualText = { zh: '播报包含组内位置', en: 'Announce position in set' }
const DOCS_MAP_TITLE: BilingualText = { zh: 'WinUI AutomationProperties ↔ Web ARIA 映射', en: 'WinUI AutomationProperties ↔ Web ARIA mapping' }
const DOCS_ROLES_TITLE: BilingualText = { zh: '本库控件 role/aria 达标表', en: 'role/aria conformance table of library controls' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const nameTitle = useBilingual(i18n, NAME_TITLE)
const nameDesc = useBilingual(i18n, NAME_DESC)
const nameAutoTitle = useBilingual(i18n, NAME_AUTO_TITLE)
const nameAutoOutput = useBilingual(i18n, NAME_AUTO_OUTPUT)
const nameHeaderTitle = useBilingual(i18n, NAME_HEADER_TITLE)
const nameHeaderOutput = useBilingual(i18n, NAME_HEADER_OUTPUT)
const nameManualTitle = useBilingual(i18n, NAME_MANUAL_TITLE)
const nameManualOutput = useBilingual(i18n, NAME_MANUAL_OUTPUT)
const liveTitle = useBilingual(i18n, LIVE_TITLE)
const liveDesc = useBilingual(i18n, LIVE_DESC)
const liveCurrent = useBilingual(i18n, LIVE_CURRENT)
const liveEmpty = useBilingual(i18n, LIVE_EMPTY)
const descTitle = useBilingual(i18n, DESC_TITLE)
const descOutput = useBilingual(i18n, DESC_OUTPUT)
const positionTitle = useBilingual(i18n, POSITION_TITLE)
const positionOutput = useBilingual(i18n, POSITION_OUTPUT)
const landmarkTitle = useBilingual(i18n, LANDMARK_TITLE)
const landmarkDesc = useBilingual(i18n, LANDMARK_DESC)
const optState = useBilingual(i18n, OPT_STATE)
const optPosition = useBilingual(i18n, OPT_POSITION)
const docsMapTitle = useBilingual(i18n, DOCS_MAP_TITLE)
const docsRolesTitle = useBilingual(i18n, DOCS_ROLES_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// ===================== 参数面板 =====================

const includeState = ref<string | number | boolean>(true)
const includePosition = ref<string | number | boolean>(true)
const includeStateValue = computed(() => includeState.value === true)
const includePositionValue = computed(() => includePosition.value === true)

// ===================== 播报合成(自测工具) =====================

/** 演示控件宿主上的 data-sr-* 播报元数据。 */
interface AnnouncementData {
  name: string
  role: string
  state: string
  position: string
}

const currentAnnouncement = ref('')

const isZh = computed(() => i18n.locale.value.startsWith('zh'))

function composeAnnouncement(data: AnnouncementData): string {
  const parts: string[] = []
  if (data.name) parts.push(data.name)
  if (data.role) parts.push(data.role)
  if (includeStateValue.value && data.state) parts.push(data.state)
  if (includePositionValue.value && data.position) parts.push(data.position)
  return parts.join(isZh.value ? ',' : ', ')
}

function resolveAnnouncement(target: EventTarget | null): string {
  if (!(target instanceof Element)) return ''
  const host = target.closest<HTMLElement>('[data-sr-name]')
  if (!host) return ''
  return composeAnnouncement({
    name: host.getAttribute('data-sr-name') ?? '',
    role: host.getAttribute('data-sr-role') ?? '',
    state: host.getAttribute('data-sr-state') ?? '',
    position: host.getAttribute('data-sr-position') ?? '',
  })
}

function onDemoFocusIn(event: FocusEvent): void {
  currentAnnouncement.value = resolveAnnouncement(event.target)
}

function onDemoMouseOver(event: MouseEvent): void {
  const text = resolveAnnouncement(event.target)
  if (text) currentAnnouncement.value = text
}

// ===================== 演示数据与状态(data-sr-state 与控件状态联动) =====================

const CONTACTS = ['Nathan Quinn', 'Jessica Lamber', 'Carl Bond', 'Jessica Russel']
const contactIndex = ref(-1)

const subscribeChecked = ref<boolean | 'indeterminate'>(false)
const subscribeState = computed(() => {
  if (subscribeChecked.value === 'indeterminate') return isZh.value ? '不确定' : 'indeterminate'
  return subscribeChecked.value ? (isZh.value ? '已选中' : 'checked') : (isZh.value ? '未选中' : 'not checked')
})

const notifyOn = ref(false)
const notifyState = computed(() =>
  notifyOn.value ? (isZh.value ? '开' : 'on') : (isZh.value ? '关' : 'off'),
)

const CITY_ITEMS = ['北京 Beijing', '上海 Shanghai', '广州 Guangzhou', '深圳 Shenzhen']
const cityIndex = ref(-1)
const cityState = computed(() =>
  cityIndex.value >= 0 ? String(CITY_ITEMS[cityIndex.value]) : (isZh.value ? '未选择' : 'no selection'),
)

// aria-describedby 目标 id
const cacheDescId = useId()
const rssHelpId = useId()
const ariaDescText = computed(() =>
  isZh.value
    ? '退出时删除所有缓存项,包括 Cookie、图像与浏览历史。'
    : 'Deletes all cached items when closing, including cookies, images and browsing history.',
)
const rssHelpText = computed(() =>
  isZh.value ? '启动取消向导' : 'Launch the cancellation wizard',
)

// ===================== 下半区固定文档:映射表 + 达标表 =====================

const mapHeaders = ['WinUI AutomationProperties', 'Web 等价物', '说明']
const mapRows: (string | number)[][] = [
  ['Name', 'aria-label / label[for] / alt / 可见文本', '有可见文本自动取名;图像、无标头输入框必须显式提供'],
  ['FullDescription / HelpText', 'aria-describedby(+ title)', '把可见说明段落与控件关联;title 兼作原生悬停提示'],
  ['LabeledBy', 'aria-labelledby', '用另一元素的文本作为本控件名称(可引用多个 id)'],
  ['AccessibilityView = Raw', 'aria-hidden="true"(装饰)或移出 DOM', '把冗余/装饰元素从内容树隐藏;纯装饰图像还应给 alt=""'],
  ['PositionInSet / SizeOfSet', 'aria-posinset / aria-setsize', '列表型控件按需标注;本页播报演示含位置信息'],
  ['HeadingLevel(1–9)', '标题元素 h1–h6(role=heading + aria-level)', '屏幕阅读器用户按标题跳转,如同明眼用户扫读'],
  ['LandmarkType(Main/Navigation/Search/Custom)', 'landmark role 族(main/navigation/search/complementary + aria-label)', '自定义地标 = role="region" + aria-label'],
  ['AcceleratorKey / AccessKey', 'aria-keyshortcuts / accesskey', '向辅助技术暴露快捷键(见键盘导航页)'],
  ['LiveSetting(Off/Polite/Important)', 'aria-live(off/polite/assertive)', '动态内容更新时的播报礼貌级;本页「当前播报」即 aria-live=polite'],
  ['ControlType / role(UIA ControlType)', 'ARIA role(button/checkbox/switch/listbox/tree/combobox/dialog…)', '原生 HTML 元素自带角色;复合控件需显式 role'],
]

const roleHeaders = ['控件', 'role(已实现)', 'aria(已实现)', '达标状态 / 待办']
const roleRows: (string | number)[][] = [
  ['Button', 'button(原生)', '—(插槽图标 aria-hidden)', '已达标'],
  ['TextBox', 'input(原生)', 'Header 以 <label for> 关联', '部分达标:占位符未提升为可访问名(WinUI 会),仅占位符输入框无名 → 待办'],
  ['CheckBox', 'checkbox(原生 input)', 'aria-checked / 原生 indeterminate', '已达标'],
  ['ToggleSwitch', 'switch', 'aria-checked;空 Header 回退可读名', '已达标'],
  ['ComboBox', 'combobox + listbox + option', 'aria-expanded / aria-controls / aria-activedescendant / aria-selected', '已达标'],
  ['AutoSuggestBox', 'combobox', 'aria-autocomplete="list" / aria-haspopup / aria-expanded / aria-activedescendant / aria-label(header)', '已达标'],
  ['ListView', 'listbox + option', 'aria-multiselectable;aria-selected', '部分达标:根透传的 aria-label 落在外层容器而非 role=listbox 节点 → 待办'],
  ['TreeView', 'tree + treeitem + group', 'aria-expanded / aria-selected / aria-level / aria-multiselectable / aria-disabled', '已达标'],
  ['TabView', 'tablist + tab + tabpanel', 'aria-selected(标签)', '已达标'],
  ['MenuBar / 菜单族', 'menubar + menu + menuitem', 'aria-haspopup / aria-expanded(项)', '已达标'],
  ['Slider', 'slider(原生 input range)', 'aria-valuenow 原生语义', '已达标'],
  ['RatingControl', 'slider', 'aria-valuemin / aria-valuemax / aria-valuenow / aria-valuetext', '已达标'],
  ['ContentDialog', 'dialog', 'aria-modal="true";焦点陷阱 + Esc 关闭', '已达标'],
]

const usageCode = `<WuiTextBox
  header="姓名"
  v-model:text="name"
  aria-describedby="name-hint" />
<p id="name-hint">请输入真实姓名</p>

<!-- 手动可访问名:无可见文本的控件必须有 aria-label -->
<WuiListView :items="contacts" aria-label="联系人" />
<svg role="img" aria-label="一串葡萄">…</svg>

<!-- 装饰元素对屏幕阅读器隐藏(= AutomationProperties.AccessibilityView="Raw") -->
<span aria-hidden="true">★</span>`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="sr-stack">
        <!-- ===== 可访问名称 ===== -->
        <section class="spec-card" aria-labelledby="acc-sr-name-title">
          <h4 id="acc-sr-name-title" class="block-title">{{ nameTitle }}</h4>
          <p class="block-desc">{{ nameDesc }}</p>

          <h5 class="sub-title">{{ nameAutoTitle }}</h5>
          <div class="demo-line">
            <WuiButton content="下载调查问卷" />
            <p class="sr-output">{{ nameAutoOutput }}</p>
          </div>

          <h5 class="sub-title">{{ nameHeaderTitle }}</h5>
          <div class="demo-line demo-line--top">
            <WuiTextBox header="姓名" style="min-width: 200px" />
            <WuiTextBox placeholder-text="昵称" style="min-width: 200px" />
            <WuiTextBox header="邮箱" placeholder-text="test@example.com" style="min-width: 200px" />
            <p class="sr-output">{{ nameHeaderOutput }}</p>
          </div>

          <h5 class="sub-title">{{ nameManualTitle }}</h5>
          <div class="demo-line demo-line--top">
            <WuiListView
              v-model:selected-index="contactIndex"
              :items="CONTACTS"
              aria-label="联系人"
              style="width: 240px"
            />
            <svg
              class="grapes-svg"
              role="img"
              aria-label="一串葡萄"
              viewBox="0 0 32 32"
              aria-hidden="false"
            >
              <circle cx="12" cy="18" r="5" />
              <circle cx="20" cy="18" r="5" />
              <circle cx="16" cy="25" r="5" />
              <path d="M16 13c0-4 2-7 6-9" fill="none" stroke-width="2" />
            </svg>
            <p class="sr-output">{{ nameManualOutput }}</p>
          </div>
        </section>

        <!-- ===== 播报文本展示(自测工具) ===== -->
        <section
          class="spec-card"
          aria-labelledby="acc-sr-live-title"
          @focusin="onDemoFocusIn"
          @mouseover="onDemoMouseOver"
        >
          <h4 id="acc-sr-live-title" class="block-title">{{ liveTitle }}</h4>
          <p class="block-desc">{{ liveDesc }}</p>

          <p class="live-out" aria-live="polite">
            <strong>{{ liveCurrent }}:</strong>
            {{ currentAnnouncement || liveEmpty }}
          </p>

          <div class="live-grid">
            <div class="live-cell" data-sr-name="下载调查问卷" data-sr-role="按钮">
              <WuiButton content="下载调查问卷" />
            </div>
            <div class="live-cell" data-sr-name="姓名" data-sr-role="编辑框">
              <WuiTextBox header="姓名" placeholder-text="请输入姓名" />
            </div>
            <div
              class="live-cell"
              data-sr-name="订阅每周通讯"
              data-sr-role="复选框"
              :data-sr-state="subscribeState"
            >
              <WuiCheckBox v-model:checked="subscribeChecked" content="订阅每周通讯" />
            </div>
            <div
              class="live-cell"
              data-sr-name="城市"
              data-sr-role="下拉框"
              :data-sr-state="cityState"
            >
              <WuiComboBox v-model:selected-index="cityIndex" :items="CITY_ITEMS" header="城市" placeholder-text="请选择" />
            </div>
            <div
              class="live-cell"
              data-sr-name="接收通知"
              data-sr-role="开关"
              :data-sr-state="notifyState"
            >
              <WuiToggleSwitch v-model:is-on="notifyOn" header="接收通知" />
            </div>
            <div
              class="live-cell"
              data-sr-name="联系人"
              data-sr-role="列表"
              :data-sr-state="contactIndex >= 0 ? (isZh ? '已选中' : 'selected') : (isZh ? '未选中' : 'not selected')"
              :data-sr-position="`${contactIndex + 1} / ${CONTACTS.length}`"
            >
              <WuiListView v-model:selected-index="contactIndex" :items="CONTACTS" aria-label="联系人" style="width: 220px" />
            </div>
          </div>
          <p class="caption" aria-hidden="true">
            播报格式 =「名称,角色[,状态][,第 n 项/共 m 项]」;列表的位置信息来自选中项(未选中报 0 / 共 n)。
          </p>
        </section>

        <!-- ===== 描述 / 位置 / 地标 ===== -->
        <section class="spec-card" aria-labelledby="acc-sr-desc-title">
          <h4 id="acc-sr-desc-title" class="block-title">{{ descTitle }}</h4>
          <div class="demo-line demo-line--top">
            <div class="desc-cell" :data-sr-name="isZh ? '退出时清除缓存' : 'Clear cache on exit'" :data-sr-role="isZh ? '复选框' : 'checkbox'">
              <WuiCheckBox
                v-model:checked="subscribeChecked"
                content="退出时清除缓存"
                :aria-describedby="cacheDescId"
              />
              <p :id="cacheDescId" class="desc-note">{{ ariaDescText }}</p>
            </div>
            <div class="desc-cell" :data-sr-name="isZh ? '取消 RSS 订阅' : 'Cancel RSS subscriptions'" :data-sr-role="isZh ? '按钮' : 'button'" :data-sr-state="rssHelpText">
              <WuiButton content="取消 RSS 订阅" :title="rssHelpText" :aria-describedby="rssHelpId" />
              <p :id="rssHelpId" class="desc-note">{{ rssHelpText }}</p>
            </div>
            <p class="sr-output">{{ descOutput }}</p>
          </div>

          <h5 class="sub-title">{{ positionTitle }}</h5>
          <p class="block-desc">{{ positionOutput }}</p>

          <h5 class="sub-title">{{ landmarkTitle }}</h5>
          <p class="block-desc">{{ landmarkDesc }}</p>
          <div class="landmark-grid">
            <nav class="landmark-pane" role="navigation" aria-label="主导航" data-sr-name="主导航" data-sr-role="navigation 地标">
              <WuiButton content="打开设置" />
            </nav>
            <main class="landmark-pane" role="main" data-sr-name="主内容" data-sr-role="main 地标">
              <p class="landmark-text">
                这是主内容区。地标(landmark)标识界面的大区块,屏幕阅读器用户可在地标间快速跳转,
                就像明眼用户扫读版面一样;标题(h1–h6)则进一步划分区块层级。
              </p>
            </main>
            <aside
              class="landmark-pane"
              role="region"
              aria-label="当前访客"
              data-sr-name="当前访客"
              data-sr-role="region 地标(自定义名)"
            >
              <p class="landmark-text"><em>(暂无其他用户在线)</em></p>
            </aside>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="optState" type="toggle" v-model="includeState" />
        <DemoOptionRow :label="optPosition" type="toggle" v-model="includePosition" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsMapTitle }}</h4>
      <DemoDocsTable :headers="mapHeaders" :rows="mapRows" />
      <h4 class="docs-subtitle">{{ docsRolesTitle }}</h4>
      <DemoDocsTable :headers="roleHeaders" :rows="roleRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.sr-stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  gap: 24px;
}

.spec-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: var(--wui-application-page-background-theme);
}

.block-title {
  margin: 0;
  font-size: var(--wui-list-view-header-item-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.sub-title {
  margin: 12px 0 0;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.block-desc {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.caption {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.demo-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.demo-line--top {
  align-items: flex-start;
}

/* 播报文本(源 ScreenReaderOutputStyle 的小号说明文字) */
.sr-output {
  max-width: 460px;
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.grapes-svg {
  width: 48px;
  height: 48px;
  flex: none;
  fill: var(--wui-hyperlink-foreground-theme);
  stroke: var(--wui-hyperlink-foreground-theme);
}

/* —— 播报展示 —— */
.live-out {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: var(--wui-system-control-background-chrome-medium-low);
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.live-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 24px;
  padding: 12px;
  border: 1px dashed var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

@media (max-width: 720px) {
  .live-grid {
    grid-template-columns: 1fr;
  }
}

.live-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

/* —— 描述 / 地标 —— */
.desc-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
}

.desc-note {
  margin: 0;
  max-width: 280px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.landmark-grid {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr) 180px;
  gap: 12px;
}

@media (max-width: 720px) {
  .landmark-grid {
    grid-template-columns: 1fr;
  }
}

.landmark-pane {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: var(--wui-system-control-background-chrome-medium-low);
}

.landmark-text {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
