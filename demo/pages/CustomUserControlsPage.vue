<script setup lang="ts">
// CustomUserControls 示例页:组合控件(UserControl 概念)教学。
// 官方蓝本:CK/WinUI-Gallery/WinUIGallery/Samples/CustomUserControls/CustomUserControlsPage.xaml
//   —— 该页分两大主题:Custom(templated)control(CounterControl / ValidatedPasswordBox)
//   与 UserControl(TemperatureConverterControl = TextBox + Button + TextBlock 组合)。
// 本站以「食谱评分卡」RatingRecipe 作为组合控件主角(卡片模板对照官方 ItemsRepeaterPage 的
// RecipeTemplate:名称 + 食材 + 数据色块),演示「props/emits/slot 组合已有控件构成新控件」;
// 另以一个页内组合的温度转换器逐字对应官方 TemperatureConverterControl,演示 UserControl 的
// 最小组合形态。概念映射(UserControl vs Custom Control)收录于下方文档区。
import { computed, ref } from 'vue'
import WuiRatingRecipe from '@/components/RatingRecipe.vue'
import type { RatingControlValueChangedEventArgs } from '@/components/RatingControl.vue'
import WuiTextBox from '@/components/TextBox.vue'
import WuiButton from '@/components/Button.vue'
import WuiTextBlock from '@/components/TextBlock.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案 ——
const PAGE_TITLE: BilingualText = { zh: 'Custom & User Controls(自定义与组合控件)', en: 'Custom & User Controls' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: '把已有控件与逻辑组合成一个可复用单元:WinUI 的 UserControl 对应本站的 Vue 单文件组件 —— props 传参、defineModel 双向、emits 转发事件、slot 预留扩展点;自定义(模板)控件则进一步接管模板与样式(对应 scoped CSS + 组件级 token)。下方的食谱评分卡 RatingRecipe 由 RatingControl、ToggleButton、FontIcon 组合而成。',
  en: 'Compose existing controls into a reusable unit: a WinUI UserControl maps to a Vue single-file component here — props for parameters, defineModel for two-way state, emits to re-broadcast events, slots as extension points. The recipe rating card below composes RatingControl, ToggleButton and FontIcon.',
}
const GROUP_RECIPES: BilingualText = { zh: '组合控件:食谱评分卡(RatingRecipe,评分可交互、收藏可切换)', en: 'Composite: recipe rating card (interactive rating, favorite toggle)' }
const GROUP_CONVERTER: BilingualText = { zh: '组合演示:温度转换器(对照官方 TemperatureConverterControl)', en: 'Composition demo: temperature converter (mirrors the official TemperatureConverterControl)' }
const LABEL_MAX: BilingualText = { zh: 'MaxRating(全部卡片)', en: 'MaxRating (all cards)' }
const LABEL_READONLY: BilingualText = { zh: 'IsReadOnly(评分条)', en: 'IsReadOnly (rating)' }
const LABEL_DISABLED: BilingualText = { zh: 'Disabled(整卡)', en: 'Disabled (whole card)' }
const LABEL_USE_IMAGE: BilingualText = { zh: '使用图片(关闭 = 占位色块)', en: 'Use image (off = color tile fallback)' }
const LABEL_CELSIUS: BilingualText = { zh: '输入摄氏温度', en: 'Temperature in Celsius' }
const LABEL_CONVERT: BilingualText = { zh: '转换为华氏温度', en: 'Convert to Fahrenheit' }
const CONVERT_INVALID: BilingualText = { zh: '无效输入!', en: 'Invalid input!' }
const SUMMARY_FAVORITES: BilingualText = { zh: '已收藏', en: 'Favorited' }
const SUMMARY_AVG: BilingualText = { zh: '已评平均分', en: 'Avg rating' }
const LABEL_LAST_EVENT: BilingualText = { zh: '最近一次事件', en: 'Last event' }
const LABEL_NO_EVENT: BilingualText = { zh: '尚未触发', en: 'Not fired yet' }
const DOCS_PROPS_TITLE: BilingualText = { zh: 'RatingRecipe 属性', en: 'RatingRecipe properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_SLOTS_TITLE: BilingualText = { zh: '插槽', en: 'Slots' }
const DOCS_DESIGN_TITLE: BilingualText = { zh: '组合控件 API 设计要点(props / emits / slot)', en: 'Composite API design (props / emits / slots)' }
const DOCS_MAPPING_TITLE: BilingualText = { zh: 'WinUI 概念映射(UserControl / 自定义控件)', en: 'WinUI concept mapping (UserControl / custom control)' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const groupRecipes = useBilingual(i18n, GROUP_RECIPES)
const groupConverter = useBilingual(i18n, GROUP_CONVERTER)
const labelMax = useBilingual(i18n, LABEL_MAX)
const labelReadonly = useBilingual(i18n, LABEL_READONLY)
const labelDisabled = useBilingual(i18n, LABEL_DISABLED)
const labelUseImage = useBilingual(i18n, LABEL_USE_IMAGE)
const labelCelsius = useBilingual(i18n, LABEL_CELSIUS)
const labelConvert = useBilingual(i18n, LABEL_CONVERT)
const convertInvalid = useBilingual(i18n, CONVERT_INVALID)
const summaryFavorites = useBilingual(i18n, SUMMARY_FAVORITES)
const summaryAvg = useBilingual(i18n, SUMMARY_AVG)
const labelLastEvent = useBilingual(i18n, LABEL_LAST_EVENT)
const labelNoEvent = useBilingual(i18n, LABEL_NO_EVENT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsSlotsTitle = useBilingual(i18n, DOCS_SLOTS_TITLE)
const docsDesignTitle = useBilingual(i18n, DOCS_DESIGN_TITLE)
const docsMappingTitle = useBilingual(i18n, DOCS_MAPPING_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 参数面板(DemoOptionRow 的 v-model 契约:联合类型)——
const demoMaxRating = ref<string | number | boolean>(5)
const demoIsReadOnly = ref<string | number | boolean>(false)
const demoDisabled = ref<string | number | boolean>(false)
const demoUseImage = ref<string | number | boolean>(true)

const maxRatingValue = computed(() => {
  const parsed = Number(demoMaxRating.value)
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 5
})
const isReadOnlyValue = computed(() => demoIsReadOnly.value === true)
const disabledValue = computed(() => demoDisabled.value === true)
const useImageValue = computed(() => demoUseImage.value === true)

// —— 食谱数据(对照官方 Recipe 类:Num/Name/Ingredients/Color;图片用 SVG data URI
// 充当无资产占位照片,accent/glyph 对应官方模板的数据色块)——
interface RecipeItem {
  id: string
  name: string
  ingredients: string
  accent: string
  glyph: string
  caption: string
  image: string
  value: number | null
  favorite: boolean
}

/** 官方模板用「数据色块」当图片;这里生成一张同色系 SVG data URI 充当占位照片。 */
function recipeImage(accent: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'>` +
    `<rect width='320' height='180' fill='${accent}'/>` +
    `<circle cx='272' cy='20' r='64' fill='#FFFFFF' fill-opacity='0.22'/>` +
    `<circle cx='34' cy='170' r='84' fill='#000000' fill-opacity='0.12'/>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const recipes = ref<RecipeItem[]>([
  {
    id: 'kungpao',
    name: '宫保鸡丁',
    ingredients: '鸡肉 · 花生 · 干辣椒 · 花椒 · 葱白',
    accent: '#c9603f',
    glyph: '🌶️',
    caption: '1,286 条评分',
    image: recipeImage('#c9603f'),
    value: 4,
    favorite: true,
  },
  {
    id: 'pasta',
    name: '芝士焗意面',
    ingredients: '通心粉 · 车达芝士 · 帕玛森 · 黄油',
    accent: '#d99a2b',
    glyph: '🧀',
    caption: '892 条评分',
    image: recipeImage('#d99a2b'),
    value: 5,
    favorite: false,
  },
  {
    id: 'matcha',
    name: '抹茶千层',
    ingredients: '抹茶 · 淡奶油 · 低筋面粉 · 鸡蛋',
    accent: '#5e8f5a',
    glyph: '🍵',
    caption: '455 条评分',
    image: recipeImage('#5e8f5a'),
    value: null,
    favorite: false,
  },
  {
    id: 'berry',
    name: '莓果酸奶杯',
    ingredients: '草莓 · 蓝莓 · 希腊酸奶 · 蜂蜜 · 燕麦',
    accent: '#7b5ea7',
    glyph: '🫐',
    caption: '233 条评分',
    image: recipeImage('#7b5ea7'),
    value: 3,
    favorite: true,
  },
])

// —— 事件回显(事件名/数字语言中立)——
const lastEventText = ref('')

function formatRating(v: number | null): string {
  return v === null ? 'null' : String(v)
}

function onRecipeValueChanged(recipe: RecipeItem, event: RatingControlValueChangedEventArgs): void {
  lastEventText.value = `valueChanged · ${recipe.name}: ${formatRating(event.oldValue)} → ${formatRating(event.newValue)}`
}

function onRecipeFavoriteChanged(recipe: RecipeItem, isFavorite: boolean): void {
  lastEventText.value = `favoriteChanged · ${recipe.name}: ${isFavorite}`
}

// —— 汇总(收藏数 / 已评平均分)——
const favoriteCount = computed(() => recipes.value.filter((r) => r.favorite).length)
const ratingSummary = computed(() => {
  const rated = recipes.value.filter((r) => r.value !== null)
  if (rated.length === 0) return '—'
  const sum = rated.reduce((acc, r) => acc + (r.value ?? 0), 0)
  return (sum / rated.length).toFixed(1)
})

// —— 温度转换器(对照官方 TemperatureConverterControl:HasText 启用按钮,点击换算)——
const converterText = ref('')
const converterHasText = computed(() => converterText.value.trim() !== '')
const converterResult = ref<number | null>(null)
const converterInvalid = ref(false)

function onConvertClick(): void {
  const parsed = Number(converterText.value)
  if (converterText.value.trim() !== '' && Number.isFinite(parsed)) {
    converterResult.value = (parsed * 9) / 5 + 32
    converterInvalid.value = false
  } else {
    converterResult.value = null
    converterInvalid.value = true
  }
}

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['name', 'string(必填)', '—', '菜谱名;同时作为卡片 aria-label 与收藏钮无障碍名的一部分(官方 Recipe.Name)'],
  ['ingredients', 'string', "''", '食材/简介一行文字,空串不渲染(官方 Recipe.Ingredients)'],
  ['image', 'string', "''", '图片地址(WinUI Image.Source);空串或加载失败回落占位色块'],
  ['imageAlt', 'string', "''", '图片 alt 文本;装饰性图片保持空串'],
  ['accent', 'string', "''", '占位色块底色(官方 Recipe.Color 数据字段);空串用系统强调色 token'],
  ['glyph', 'string', "'🍽️'", '占位色块上的字形/emoji(官方模板色块上的编号文本)'],
  ['caption', 'string', "''", '评分条右侧说明文字(转发 RatingControl Caption)'],
  ['maxRating', 'number', '5', '星星数量(转发 RatingControl MaxRating)'],
  ['isReadOnly', 'boolean', 'false', '评分条只读(转发 RatingControl IsReadOnly;收藏钮不受影响)'],
  ['disabled', 'boolean', 'false', '禁用整卡:评分条与收藏钮均禁用(WinUI Control.IsEnabled)'],
  ['value (v-model)', 'number | null', 'null', '当前评分;null = 未评分(转发 RatingControl Value)'],
  ['favorite (v-model)', 'boolean', 'false', '收藏态(内部 ToggleButton checked 的布尔收敛)'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['valueChanged', '(e: { oldValue: number | null; newValue: number | null })', '内部 RatingControl 提交评分时转发(点击/键盘)'],
  ['favoriteChanged', '(isFavorite: boolean)', '用户点击收藏钮切换收藏态时触发(组件自有事件)'],
  ['update:value / update:favorite', '(value | favorite)', 'v-model 双向绑定事件'],
]
const slotHeaders = ['插槽', '说明']
const slotRows: (string | number)[][] = [
  ['image', '替换整个媒体区(图片/占位色块一并替换),可放轮播图、视频等任意媒体内容'],
  ['default', '卡片底部扩展点:徽标、标签、作者行等自定义内容'],
]
const designHeaders = ['设计要点', '本组件的落法', 'WinUI 对应概念']
const designRows: (string | number)[][] = [
  ['组合已有控件', '内部直接使用 RatingControl / ToggleButton / FontIcon,自身只写布局与封装', 'UserControl:把已有控件组合成一个整体(官方 TemperatureConverterControl)'],
  ['参数用 props 声明', 'caption/maxRating/isReadOnly/disabled 等逐个透传给内部子控件,不在内部重复造默认值', 'DependencyProperty + 模板绑定(TemplateBinding)'],
  ['状态用 defineModel 双向', 'value、favorite 两个 v-model:父组件可读写,子控件改动自动回传', 'x:Bind TwoWay / {Binding Mode=TwoWay}'],
  ['事件显式转发再广播', 'valueChanged 原样转发 RatingControl;favoriteChanged 是组件自有语义事件', '路由事件(Image_ValueChanged)→ 组件冒泡自己的事件'],
  ['slot 预留扩展点', 'image 具名插槽替换媒体区、默认插槽追加底部内容,不改组件源码即可变体', 'ContentPresenter / ContentTemplate 定制内容'],
  ['样式封装', 'scoped CSS + 组件级 token 局部变量(卡片底色/描边可被调用方同名变量覆盖)', 'Generic.xaml 默认样式 + 主题资源(DefaultStyleKey/OnApplyTemplate)'],
  ['无障碍聚合', '卡片 role="group" + aria-label = 菜谱名;收藏钮/评分条各有独立无障碍名', 'AutomationProperties.Name / AutomationPeer'],
]
const mappingHeaders = ['WinUI 概念', 'Web(本站)对应', '说明']
const mappingRows: (string | number)[][] = [
  ['UserControl', 'Vue 单文件组件(本页 RatingRecipe)', '组合已有控件 + 代码逻辑,封装成一个可复用单元'],
  ['Custom(templated)control', '接管模板的组件(如库内 RatingControl)', '完整定义视觉结构与状态;WinUI 经 Generic.xaml 默认样式 + OnApplyTemplate 取模板部件,本站经 scoped CSS 类结构 + ref'],
  ['DependencyProperty', 'defineProps + defineModel', '可绑定属性;Web 侧由 Vue 响应式承担通知'],
  ['ControlTemplate / Generic.xaml', '组件模板(<template>)+ scoped 样式', '默认外观;调用方可经插槽/同名 CSS 变量覆盖'],
  ['IsEnabled / IsTabStop', 'disabled 透传 + 原生 button/Slider 键盘语义', '禁用与焦点链;内部子控件各自保留焦点环'],
  ['AutomationProperties(LiveSetting)', 'aria-label / aria-live(子控件内建)', 'CounterControl/ValidatedPasswordBox 用 LiveRegion 播报数值与校验结果,本站由各子控件的 ARIA 语义承担'],
]

const usageCode = computed(
  () => `<script setup lang="ts">
import { ref } from 'vue'
import RatingRecipe from '@/components/RatingRecipe.vue'

// value: null = 未评分;favorite 控制收藏心形
const rating = ref<number | null>(4)
const isFavorite = ref(false)
<\/script>

<template>
  <RatingRecipe
    v-model:value="rating"
    v-model:favorite="isFavorite"
    name="宫保鸡丁"
    ingredients="鸡肉 · 花生 · 干辣椒 · 花椒 · 葱白"
    caption="1,286 条评分"
    :max-rating="${maxRatingValue.value}"
    @value-changed="onValueChanged"
    @favorite-changed="onFavoriteChanged" />
</template>`,
)
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription">
    <template #demo>
      <div class="cuc-stage">
        <!-- 主题一:组合控件 RatingRecipe(食谱评分卡列表) -->
        <section class="cuc-group">
          <h4 class="group-title">{{ groupRecipes }}</h4>
          <div class="recipe-grid">
            <WuiRatingRecipe
              v-for="recipe in recipes"
              :key="recipe.id"
              v-model:value="recipe.value"
              v-model:favorite="recipe.favorite"
              :name="recipe.name"
              :ingredients="recipe.ingredients"
              :image="useImageValue ? recipe.image : ''"
              :accent="recipe.accent"
              :glyph="recipe.glyph"
              :caption="recipe.caption"
              :max-rating="maxRatingValue"
              :is-read-only="isReadOnlyValue"
              :disabled="disabledValue"
              @value-changed="(event) => onRecipeValueChanged(recipe, event)"
              @favorite-changed="(isFavorite) => onRecipeFavoriteChanged(recipe, isFavorite)"
            />
          </div>
          <p class="demo-output">
            {{ summaryFavorites }} <strong>{{ favoriteCount }}</strong> ·
            {{ summaryAvg }} <strong>{{ ratingSummary }}</strong>
            <span class="demo-event">{{ labelLastEvent }}: {{ lastEventText || labelNoEvent }}</span>
          </p>
          <p class="demo-hint">
            评分条与收藏钮都是已有控件:RatingRecipe 只做组合与转发 ——
            悬停卡片换底色、点击星条评分(点击当前值星星清空)、点击右上角心形收藏。
          </p>
        </section>

        <!-- 主题二:UserControl 最小组合形态(官方 TemperatureConverterControl 逐字对应) -->
        <section class="cuc-group">
          <h4 class="group-title">{{ groupConverter }}</h4>
          <div class="converter">
            <WuiTextBox
              v-model:text="converterText"
              class="converter-input"
              :header="labelCelsius"
              placeholder-text="Celsius"
              aria-label="摄氏温度输入"
            />
            <WuiButton
              class="converter-button"
              :content="labelConvert"
              :disabled="!converterHasText"
              background="var(--wui-accent-button-background)"
              foreground="var(--wui-accent-button-foreground)"
              @click="onConvertClick"
            />
            <WuiTextBlock
              class="converter-result"
              font-weight="SemiBold"
              :text="
                converterInvalid
                  ? convertInvalid
                  : converterResult !== null
                    ? `Fahrenheit: ${converterResult.toFixed(2)}°F`
                    : ''
              "
            />
          </div>
          <p class="demo-hint">
            与官方示例一致:输入为空时按钮禁用(HasText),点击后换算 °F 或报「无效输入」。
            这里三行模板就是全部实现 —— 没有新控件,这正是 UserControl 的本质。
          </p>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelMax" type="slider" v-model="demoMaxRating" :min="1" :max="5" :step="1" />
        <DemoOptionRow :label="labelReadonly" type="toggle" v-model="demoIsReadOnly" />
        <DemoOptionRow :label="labelDisabled" type="toggle" v-model="demoDisabled" />
        <DemoOptionRow :label="labelUseImage" type="toggle" v-model="demoUseImage" />
      </DemoOptions>
    </template>

    <template #docs>
      <h4 class="docs-subtitle">{{ docsPropsTitle }}</h4>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h4 class="docs-subtitle">{{ docsEventsTitle }}</h4>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h4 class="docs-subtitle">{{ docsSlotsTitle }}</h4>
      <DemoDocsTable :headers="slotHeaders" :rows="slotRows" />
      <h4 class="docs-subtitle">{{ docsDesignTitle }}</h4>
      <DemoDocsTable :headers="designHeaders" :rows="designRows" />
      <h4 class="docs-subtitle">{{ docsMappingTitle }}</h4>
      <DemoDocsTable :headers="mappingHeaders" :rows="mappingRows" />
      <h4 class="docs-subtitle">{{ docsUsageTitle }}</h4>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.cuc-stage {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  gap: 32px;
}

.cuc-group {
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

/* 卡片列表:Grid 自适应列(单卡 260px,间距 12 对照官方 UniformGridLayout MinColumnSpacing) */
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  width: 100%;
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

.demo-hint {
  margin: 0;
  max-width: 720px;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  line-height: 1.6;
  color: var(--wui-application-secondary-foreground-theme);
}

/* —— 温度转换器(官方 TemperatureConverterControl:竖排 StackPanel Spacing=8)—— */
.converter {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.converter-input {
  width: 200px;
}

.converter-result {
  min-height: 20px;
  color: var(--wui-application-foreground-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
