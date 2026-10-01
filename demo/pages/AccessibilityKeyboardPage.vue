<script setup lang="ts">
// AccessibilityKeyboardPage.vue —— 无障碍「键盘导航」规范页
// (对应官方 WinUI Gallery Samples/AccessibilityKeyboard/)。
// WinUI 版讲 Tab 序 / 方向键 / 快捷键(Accelerator + Access key);
// Web 版做「本库无障碍规范 + 自测工具」:规范文案 + 可交互演示
// (已入库控件组成表单,焦点环 + Tab 键盘路径记录)+ 各控件键盘行为速查表
// (从 src/components 已实现控件的键盘处理中提取)。
import { computed, onMounted, onUnmounted, ref } from 'vue'
import WuiButton from '@/components/Button.vue'
import WuiCheckBox from '@/components/CheckBox.vue'
import WuiComboBox from '@/components/ComboBox.vue'
import WuiListView from '@/components/ListView.vue'
import WuiMenuBar from '@/components/MenuBar.vue'
import WuiMenuBarItem from '@/components/MenuBarItem.vue'
import WuiMenuFlyoutItem from '@/components/MenuFlyoutItem.vue'
import WuiSlider from '@/components/Slider.vue'
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

// —— 页面文案(catalog.ts 中 AccessibilityKeyboard 的 subtitle/描述译写)——
const PAGE_TITLE: BilingualText = { zh: 'Keyboard Navigation(键盘导航)', en: 'Keyboard Navigation' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '如果应用不能提供良好的键盘访问,失明或行动不便的用户将难以甚至无法使用它。本页给出本库的 Tab 序、方向键与快捷键约定,并用已入库控件组成表单演示焦点环与键盘路径。',
  en: 'Without good keyboard access, users who are blind or have mobility issues may be unable to use your app. This page documents this library\'s tab order, arrow key and shortcut conventions, with a form built from the library controls to demo focus rings and keyboard paths.',
}
const TAB_ORDER_TITLE: BilingualText = { zh: 'Tab 序', en: 'Tab order' }
const TAB_ORDER_DESC: BilingualText = {
  zh: '使用键盘操作控件的前提是控件获得焦点,最常见的途径是 Tab 导航——焦点在「Tab 停靠点」之间循环,这些停靠点的顺序即「Tab 序」。所有交互控件(如按钮)都应是 Tab 停靠点(除非它所在的组有其他可达方式);非交互控件(如标签文本)则不应是停靠点;禁用控件原生不可聚焦。初始焦点尽量落在最有用、最合逻辑的元素上。',
  en: 'Interactive controls should be tab stops; non-interactive labels and disabled controls should not. Put initial focus on the most useful or logical element.',
}
const TAB_AUTO_TITLE: BilingualText = { zh: '自动 Tab 序', en: 'Automatic tab order' }
const TAB_AUTO_DESC: BilingualText = {
  zh: '默认 Tab 序 = 元素在模板/DOM 中的定义顺序,通常这就是最佳顺序:',
  en: 'By default the tab order matches the order elements are defined in the template — usually the best order:',
}
const TAB_AUTO_CAPTION: BilingualText = {
  zh: '标签文本与禁用按钮不在 Tab 序中(标注「不可聚焦」)',
  en: 'Labels and disabled buttons are not in the tab order (marked "not focusable")',
}
const TAB_MANUAL_TITLE: BilingualText = { zh: '手动 Tab 序', en: 'Manual tab order' }
const TAB_MANUAL_DESC: BilingualText = {
  zh: '当定义顺序与逻辑 Tab 序不一致时,可手动指定:WinUI 用 TabIndex,Web 用 tabindex(正数按值升序、再按 DOM 序;与 WinUI 语义一致)。',
  en: 'When the template order does not match the logical order, set it manually: WinUI TabIndex maps to the HTML tabindex attribute (positive values are visited in ascending order, then DOM order).',
}
const ARROW_TITLE: BilingualText = { zh: '方向键', en: 'Arrow keys' }
const ARROW_DESC: BilingualText = {
  zh: '用户期望成组的相似控件也能用方向键导航——可以替代 Tab 导航,也可以与之并存。支持方向键的组通常同时支持 Home/End 与 PgUp/PgDn。本库已实现的分组控件(ListView/TreeView/ComboBox/TabView/MenuBar 等)已内置方向键与 Home/End。',
  en: 'Groups of similar controls should also be navigable with arrow keys, usually together with Home/End and PgUp/PgDn. The library\'s grouped controls (ListView/TreeView/ComboBox/TabView/MenuBar…) already support them.',
}
const ARROW_LISTVIEW_CAPTION: BilingualText = {
  zh: 'Tab 到达控件,方向键在控件内部导航(roving tabindex,项持真实 DOM 焦点)',
  en: 'Tab reaches the control; arrow keys navigate within it (roving tabindex)',
}
const FORM_TITLE: BilingualText = { zh: '键盘路径演示(表单)', en: 'Keyboard path demo (form)' }
const FORM_DESC: BilingualText = {
  zh: '用已入库控件组成表单:按 Tab 依次走过各停靠点,观察焦点环(:focus-visible,2px 系统焦点色);下方的「焦点路径」实时记录 Tab 经过的控件。组内控件(下拉框、列表)再按方向键内导。',
  en: 'A form built from library controls: press Tab to walk the stops and watch the focus ring; the "focus path" below records the traversal. Arrow keys navigate inside grouped controls.',
}
const PATH_TITLE: BilingualText = { zh: '焦点路径(最近 8 步)', en: 'Focus path (last 8 steps)' }
const PATH_EMPTY: BilingualText = { zh: '在演示区内按 Tab / 点击任意控件开始记录…', en: 'Press Tab or click any control in the form to start recording…' }
const PATH_CURRENT: BilingualText = { zh: '当前焦点', en: 'Current focus' }
const PATH_NONE: BilingualText = { zh: '无', en: 'none' }
const SHORTCUT_TITLE: BilingualText = { zh: '键盘快捷键', en: 'Keyboard shortcuts' }
const SHORTCUT_DESC: BilingualText = {
  zh: '快捷键对讲述器用户、键盘用户与高级用户都非常有用。WinUI 3 分两类:加速器(Accelerator,通常以 Ctrl 开头,触发命令)与访问键(Access key,以 Alt 开头,移动焦点)。Web 侧等价物分别为 keydown 监听(+ aria-keyshortcuts)与 accesskey 属性(浏览器触发键不一,无 Key Tips 气泡)。',
  en: 'WinUI 3 has two shortcut kinds: accelerators (Ctrl-based, invoke commands) and access keys (Alt-based, move focus). Web equivalents: keydown listeners (+ aria-keyshortcuts) and the accesskey attribute (browser-dependent, no Key Tips).',
}
const ACCEL_TITLE: BilingualText = { zh: '加速器(Accelerator)', en: 'Accelerators' }
const ACCEL_CAPTION: BilingualText = {
  zh: 'Ctrl+R / Ctrl+B / Ctrl+G 分别把方块变为红 / 蓝 / 黄绿(页面级 keydown,替代 WinUI KeyboardAccelerators;按钮带 aria-keyshortcuts)',
  en: 'Ctrl+R / Ctrl+B / Ctrl+G turn the tile red / blue / chartreuse (page-level keydown standing in for KeyboardAccelerators; buttons carry aria-keyshortcuts)',
}
const ACCESSKEY_TITLE: BilingualText = { zh: '访问键(Access key)', en: 'Access keys' }
const ACCESSKEY_CAPTION: BilingualText = {
  zh: 'MenuBar 支持 F2 / Alt 聚焦整栏,←/→ 切项,Enter/↓/↑ 开菜单(本库已实现);Web 原生 accesskey 因浏览器而异,仅作补充',
  en: 'MenuBar supports F2 / Alt to focus the bar, ←/→ to switch items, Enter/↓/↑ to open (implemented in this library); native accesskey varies per browser and is only a supplement',
}
const OPT_BADGES: BilingualText = { zh: '显示 Tab 序编号', en: 'Show tab order badges' }
const OPT_RECORD: BilingualText = { zh: '记录焦点路径', en: 'Record focus path' }
const DOCS_TABLE_TITLE: BilingualText = { zh: '各控件键盘行为速查(从已实现控件提取)', en: 'Keyboard behavior quick reference (extracted from implemented controls)' }
const DOCS_MAP_TITLE: BilingualText = { zh: 'WinUI ↔ Web 键盘机制映射', en: 'WinUI ↔ Web keyboard mapping' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const tabOrderTitle = useBilingual(i18n, TAB_ORDER_TITLE)
const tabOrderDesc = useBilingual(i18n, TAB_ORDER_DESC)
const tabAutoTitle = useBilingual(i18n, TAB_AUTO_TITLE)
const tabAutoDesc = useBilingual(i18n, TAB_AUTO_DESC)
const tabAutoCaption = useBilingual(i18n, TAB_AUTO_CAPTION)
const tabManualTitle = useBilingual(i18n, TAB_MANUAL_TITLE)
const tabManualDesc = useBilingual(i18n, TAB_MANUAL_DESC)
const arrowTitle = useBilingual(i18n, ARROW_TITLE)
const arrowDesc = useBilingual(i18n, ARROW_DESC)
const arrowListviewCaption = useBilingual(i18n, ARROW_LISTVIEW_CAPTION)
const formTitle = useBilingual(i18n, FORM_TITLE)
const formDesc = useBilingual(i18n, FORM_DESC)
const pathTitle = useBilingual(i18n, PATH_TITLE)
const pathEmpty = useBilingual(i18n, PATH_EMPTY)
const pathCurrent = useBilingual(i18n, PATH_CURRENT)
const pathNone = useBilingual(i18n, PATH_NONE)
const shortcutTitle = useBilingual(i18n, SHORTCUT_TITLE)
const shortcutDesc = useBilingual(i18n, SHORTCUT_DESC)
const accelTitle = useBilingual(i18n, ACCEL_TITLE)
const accelCaption = useBilingual(i18n, ACCEL_CAPTION)
const accesskeyTitle = useBilingual(i18n, ACCESSKEY_TITLE)
const accesskeyCaption = useBilingual(i18n, ACCESSKEY_CAPTION)
const optBadges = useBilingual(i18n, OPT_BADGES)
const optRecord = useBilingual(i18n, OPT_RECORD)
const docsTableTitle = useBilingual(i18n, DOCS_TABLE_TITLE)
const docsMapTitle = useBilingual(i18n, DOCS_MAP_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// ===================== 参数面板 =====================

const showOrderBadges = ref<string | number | boolean>(true)
const recordPath = ref<string | number | boolean>(true)
const showBadgesValue = computed(() => showOrderBadges.value === true)
const recordPathValue = computed(() => recordPath.value === true)

// ===================== 焦点路径记录(键盘路径自测) =====================

interface FocusStep {
  index: number
  name: string
}

const focusSteps = ref<FocusStep[]>([])
const currentFocusName = ref('')
let focusCounter = 0

/** 表单区 focusin 捕获:从最近带 data-kb-name 的祖先读可读名。 */
function onFormFocusIn(event: FocusEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const host = target.closest('[data-kb-name]')
  const name = host?.getAttribute('data-kb-name') ?? ''
  currentFocusName.value = name || target.tagName.toLowerCase()
  if (!recordPathValue.value || name === '') return
  focusCounter += 1
  focusSteps.value = [...focusSteps.value.slice(-7), { index: focusCounter, name }]
}

function clearFocusPath(): void {
  focusSteps.value = []
  focusCounter = 0
}

// ===================== 加速器演示(替代 WinUI KeyboardAccelerators) =====================

type AccentColor = 'red' | 'blue' | 'chartreuse'

const ACCEL_COLORS: Record<AccentColor, string> = {
  red: '#ff0000',
  blue: '#0000ff',
  chartreuse: '#7fff00',
}

const accelColor = ref<AccentColor>('red')
const accelFill = computed(() => ACCEL_COLORS[accelColor.value])

function setAccelColor(color: AccentColor): void {
  accelColor.value = color
}

function onWindowKeydown(event: KeyboardEvent): void {
  if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
  const key = event.key.toLowerCase()
  if (key === 'r') {
    event.preventDefault()
    setAccelColor('red')
  } else if (key === 'b') {
    event.preventDefault()
    setAccelColor('blue')
  } else if (key === 'g') {
    event.preventDefault()
    setAccelColor('chartreuse')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeydown)
})

// ===================== 演示数据 =====================

const LIST_COLORS = ['Red', 'Blue', 'Green', 'Yellow']
const listSelectedIndex = ref(-1)

const CITY_ITEMS = ['北京 Beijing', '上海 Shanghai', '广州 Guangzhou', '深圳 Shenzhen']
const cityIndex = ref(-1)

const nameText = ref('')
const emailText = ref('')
const volumeValue = ref(30)
const subscribeChecked = ref<boolean | 'indeterminate'>(false)
const notifyOn = ref(false)

function onFormSubmit(): void {
  currentFocusName.value = i18n.locale.value.startsWith('zh') ? '提交(激活)' : 'Submit (activated)'
}

// ===================== 下半区固定文档:速查表 + 映射表 =====================

const kbHeaders = ['控件', 'Tab 到达方式', '键盘行为(已实现)']
const kbRows: (string | number)[][] = [
  ['Button', '单个停靠点', 'Space / Enter 激活(:focus-visible 显示焦点环)'],
  ['TextBox', '单个停靠点', '文本编辑、方向键移动插入符;Header 以 <label for> 关联,占位符不占停靠点'],
  ['NumberBox', '单个停靠点', '↑/↓ 步进(支持按键重复);Enter 提交、Esc 还原、失焦提交'],
  ['CheckBox', '单个停靠点', 'Space 切换;IsThreeState 时循环 勾选 → 不确定 → 未勾选'],
  ['ToggleSwitch', '单个停靠点', 'Space / Enter 切换(role="switch",空 Header 回退可读名)'],
  ['ComboBox', '单个停靠点', '关闭态 Enter/Space/↓/↑ 展开、type-ahead 首字母跳;打开态 ↑/↓ 循环、Home/End、Enter/Space 选择、Esc/Tab 关闭'],
  ['Slider', '单个停靠点', '←/→/↑/↓ 按 StepFrequency 步进;Home/End/PageUp/PageDown 走原生 input range 语义'],
  ['ListView', '控件一个停靠点(roving tabindex)', '↑/↓ 移焦(选中随焦点)、Home/End 首/末、Space 选择、Ctrl+A 全选(Multiple/Extended)、Enter 触发 itemClick'],
  ['TreeView', '控件一个停靠点(roving tabindex)', '↑/↓ 移动、→ 展开/进子级、← 收起/回父级、Space 选中(Multiple 切换)、Enter 调用、Home/End 首/末'],
  ['MenuBar', '栏不进 Tab 序,F2 / Alt 聚焦', '←/→ 项间移动(MoveFocusTo),展开时横移换菜单;Enter/↓/↑ 开菜单;菜单内 ↑/↓/Home/End 导航、Esc 关闭'],
  ['TabView', '标签条一个停靠点', '←/→ 移标签焦点(不联动选中)、Enter/Space 选中;Ctrl+Tab / Ctrl+Shift+Tab 切换选中页、Ctrl+W 关闭选中页'],
  ['RatingControl', '单个停靠点', '←/→/↑/↓ ±1、Home 清空、End 满值;未评分时方向键取 InitialSetValue'],
  ['ContentDialog', '焦点陷阱(Tab 循环于对话框内)', '初始焦点落 defaultButton;Esc 触发关闭;关闭后焦点归还宿主'],
]

const mapHeaders = ['WinUI 机制', 'Web 等价物', '说明']
const mapRows: (string | number)[][] = [
  ['TabIndex', 'tabindex(正数)', '正值按升序、再按 DOM 序;语义与 WinUI 一致'],
  ['IsTabStop = false', 'tabindex="-1"', '移出 Tab 序,仍可通过程序/点击聚焦'],
  ['禁用控件不进 Tab 序', 'disabled 原生不可聚焦', '行为一致'],
  ['KeyboardAccelerator', 'keydown 监听(window/元素级)', '本页加速器演示即此实现;注意不要劫持浏览器必需组合键'],
  ['AutomationProperties.AcceleratorKey', 'aria-keyshortcuts', '向辅助技术暴露快捷键'],
  ['AccessKey + Key Tips', 'accesskey 属性', '浏览器触发键不一(Windows 常为 Alt+键),且无 Key Tips 气泡;本库 MenuBar 以 F2/Alt 自实现'],
  ['XYFocusKeyboardNavigation', '无原生等价', '方向键 2D 焦点需自行实现;线性组建议 roving tabindex'],
  ['系统焦点视觉(双环:内环 FocusVisualPrimary + 外环 FocusVisualSecondary)', ':focus-visible 单环 outline', '本库:2px --wui-system-control-focus-visual-primary + 1px offset(双环简化,见各控件 wiki)'],
]

const usageCode = `<div class="form" @focusin="onFormFocusIn">
  <WuiTextBox header="姓名" v-model:text="nameText" />
  <WuiComboBox header="城市" :items="cities" v-model:selected-index="cityIndex" />
  <WuiCheckBox content="订阅每周通讯" v-model:checked="subscribe" />
  <WuiButton content="提交" @click="onSubmit" />
</div>
<!-- Tab 序 = DOM 序;手动停靠点用 tabindex(1、2、3…),
     移出 Tab 序用 tabindex="-1" -->
<WuiButton tabindex="3" content="手动第三站" />`
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="kb-stack">
        <!-- ===== Tab 序规范 ===== -->
        <section class="spec-card" aria-labelledby="acc-kb-tab-title">
          <h3 id="acc-kb-tab-title" class="block-title">{{ tabOrderTitle }}</h3>
          <p class="block-desc">{{ tabOrderDesc }}</p>

          <h4 class="sub-title">{{ tabAutoTitle }}</h4>
          <p class="block-desc">{{ tabAutoDesc }}</p>
          <div class="demo-line">
            <span class="badge-host">
              <span v-if="showBadgesValue" class="order-badge" aria-hidden="true">1</span>
              <WuiButton content="First(第一站)" />
            </span>
            <span class="not-focusable" data-kb-name="标签文本(不在 Tab 序)">
              标签文本(不在 Tab 序)
            </span>
            <span class="badge-host">
              <span v-if="showBadgesValue" class="order-badge" aria-hidden="true">2</span>
              <WuiButton content="Second(第二站)" />
            </span>
            <span class="badge-host">
              <span class="order-badge order-badge--off" aria-hidden="true">✕</span>
              <WuiButton content="Disabled(禁用,不在 Tab 序)" disabled />
            </span>
            <span class="badge-host">
              <span v-if="showBadgesValue" class="order-badge" aria-hidden="true">3</span>
              <WuiButton content="Third(第三站)" />
            </span>
          </div>
          <p class="caption">{{ tabAutoCaption }}</p>

          <h4 class="sub-title">{{ tabManualTitle }}</h4>
          <p class="block-desc">{{ tabManualDesc }}</p>
          <div class="manual-grid" data-kb-name="手动 Tab 序网格">
            <span class="grid-label" aria-hidden="true"></span>
            <span class="grid-label">列 1</span>
            <span class="grid-label">列 2</span>

            <span class="grid-label">行 1</span>
            <span class="badge-host">
              <span v-if="showBadgesValue" class="order-badge" aria-hidden="true">1</span>
              <WuiButton tabindex="1" content="First stop(tabindex=1)" />
            </span>
            <span class="badge-host">
              <span v-if="showBadgesValue" class="order-badge" aria-hidden="true">3</span>
              <WuiButton tabindex="3" content="Third stop(tabindex=3)" />
            </span>

            <span class="grid-label">行 2</span>
            <span class="badge-host">
              <span v-if="showBadgesValue" class="order-badge" aria-hidden="true">2</span>
              <WuiButton tabindex="2" content="Second stop(tabindex=2)" />
            </span>
            <span class="badge-host">
              <span class="order-badge order-badge--off" aria-hidden="true">✕</span>
              <WuiButton tabindex="-1" content="Not a stop(tabindex=-1)" />
            </span>
          </div>
        </section>

        <!-- ===== 方向键规范 ===== -->
        <section class="spec-card" aria-labelledby="acc-kb-arrow-title">
          <h3 id="acc-kb-arrow-title" class="block-title">{{ arrowTitle }}</h3>
          <p class="block-desc">{{ arrowDesc }}</p>
          <div class="demo-line demo-line--column">
            <WuiListView
              v-model:selected-index="listSelectedIndex"
              :items="LIST_COLORS"
              aria-label="Colors"
              style="width: 260px"
            />
            <p class="caption">{{ arrowListviewCaption }}</p>
          </div>
        </section>

        <!-- ===== 键盘路径表单演示 ===== -->
        <section class="spec-card" aria-labelledby="acc-kb-form-title">
          <h3 id="acc-kb-form-title" class="block-title">{{ formTitle }}</h3>
          <p class="block-desc">{{ formDesc }}</p>

          <div class="kb-form" data-kb-name="键盘表单" @focusin="onFormFocusIn">
            <div class="form-field" data-kb-name="姓名 TextBox">
              <WuiTextBox v-model:text="nameText" header="姓名" placeholder-text="请输入姓名" />
            </div>
            <div class="form-field" data-kb-name="邮箱 TextBox">
              <WuiTextBox v-model:text="emailText" header="邮箱" placeholder-text="name@example.com" />
            </div>
            <div class="form-field" data-kb-name="城市 ComboBox">
              <WuiComboBox
                v-model:selected-index="cityIndex"
                :items="CITY_ITEMS"
                header="城市"
                placeholder-text="请选择城市"
              />
            </div>
            <div class="form-field" data-kb-name="音量 Slider">
              <WuiSlider v-model:value="volumeValue" :minimum="0" :maximum="100" header="音量" />
            </div>
            <div class="form-field" data-kb-name="订阅 CheckBox">
              <WuiCheckBox v-model:checked="subscribeChecked" content="订阅每周通讯" />
            </div>
            <div class="form-field" data-kb-name="通知 ToggleSwitch">
              <WuiToggleSwitch v-model:is-on="notifyOn" header="接收通知" />
            </div>
            <div class="form-actions" data-kb-name="操作按钮组">
              <WuiButton content="提交" @click="onFormSubmit" />
              <WuiButton content="清空路径" @click="clearFocusPath" />
            </div>
          </div>

          <div class="path-panel" aria-live="polite">
            <p class="path-title">
              {{ pathTitle }}
              <span class="path-current">{{ pathCurrent }}: {{ currentFocusName || pathNone }}</span>
            </p>
            <p v-if="focusSteps.length === 0" class="path-empty">{{ pathEmpty }}</p>
            <ol v-else class="path-list">
              <li v-for="step in focusSteps" :key="step.index">
                <span class="path-step-index">#{{ step.index }}</span> {{ step.name }}
              </li>
            </ol>
          </div>
        </section>

        <!-- ===== 快捷键 ===== -->
        <section class="spec-card" aria-labelledby="acc-kb-shortcut-title">
          <h3 id="acc-kb-shortcut-title" class="block-title">{{ shortcutTitle }}</h3>
          <p class="block-desc">{{ shortcutDesc }}</p>

          <h4 class="sub-title">{{ accelTitle }}</h4>
          <div class="demo-line">
            <span
              class="accel-tile"
              :style="{ background: accelFill }"
              role="img"
              :aria-label="`颜色方块:${accelColor}`"
            />
            <WuiButton content="红 Red" aria-keyshortcuts="Control+R" @click="setAccelColor('red')" />
            <WuiButton content="蓝 Blue" aria-keyshortcuts="Control+B" @click="setAccelColor('blue')" />
            <WuiButton content="黄绿 Chartreuse" aria-keyshortcuts="Control+G" @click="setAccelColor('chartreuse')" />
          </div>
          <p class="caption">{{ accelCaption }}</p>

          <h4 class="sub-title">{{ accesskeyTitle }}</h4>
          <div class="demo-line demo-line--column">
            <WuiMenuBar>
              <WuiMenuBarItem title="File">
                <WuiMenuFlyoutItem text="New" :accelerator-keys="'Ctrl+N'" />
                <WuiMenuFlyoutItem text="Open" :accelerator-keys="'Ctrl+O'" />
                <WuiMenuFlyoutItem text="Save" :accelerator-keys="'Ctrl+S'" />
              </WuiMenuBarItem>
              <WuiMenuBarItem title="Edit">
                <WuiMenuFlyoutItem text="Undo" :accelerator-keys="'Ctrl+Z'" />
                <WuiMenuFlyoutItem text="Cut" :accelerator-keys="'Ctrl+X'" />
                <WuiMenuFlyoutItem text="Copy" :accelerator-keys="'Ctrl+C'" />
              </WuiMenuBarItem>
              <WuiMenuBarItem title="Help">
                <WuiMenuFlyoutItem text="About" />
              </WuiMenuBarItem>
            </WuiMenuBar>
            <p class="caption">{{ accesskeyCaption }}</p>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="optBadges" type="toggle" v-model="showOrderBadges" />
        <DemoOptionRow :label="optRecord" type="toggle" v-model="recordPath" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsTableTitle }}</h3>
      <DemoDocsTable :headers="kbHeaders" :rows="kbRows" />
      <h3 class="docs-subtitle">{{ docsMapTitle }}</h3>
      <DemoDocsTable :headers="mapHeaders" :rows="mapRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.kb-stack {
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
  gap: 12px;
}

.demo-line--column {
  flex-direction: column;
  align-items: flex-start;
}

/* Tab 序编号徽标 */
.badge-host {
  position: relative;
  display: inline-flex;
}

.order-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1;
  color: #ffffff;
  background: var(--wui-hyperlink-foreground-theme);
}

.order-badge--off {
  background: var(--wui-system-control-disabled-chrome-disabled-low);
}

.not-focusable {
  padding: 4px 0;
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 手动 Tab 序网格 */
.manual-grid {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 10px 12px;
  align-items: center;
  max-width: 560px;
  padding: 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.grid-label {
  font-size: var(--wui-control-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 键盘路径表单 */
.kb-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 32px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

@media (max-width: 720px) {
  .kb-form {
    grid-template-columns: 1fr;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
}

/* 焦点路径面板(自测工具输出) */
.path-panel {
  padding: 10px 12px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
  background: var(--wui-system-control-background-chrome-medium-low);
}

.path-title {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 6px;
  font-size: var(--wui-control-content-theme-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}

.path-current {
  font-weight: 400;
  color: var(--wui-application-secondary-foreground-theme);
}

.path-empty {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

.path-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin: 0;
  padding-left: 18px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-foreground-theme);
}

.path-step-index {
  color: var(--wui-application-secondary-foreground-theme);
}

/* 加速器演示 */
.accel-tile {
  display: inline-block;
  width: 100%;
  max-width: 220px;
  height: 30px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
