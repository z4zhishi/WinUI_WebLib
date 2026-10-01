<script setup lang="ts">
// PersonPicture 示例页:对照官方 WinUI Gallery PersonPicturePage(Profile type 三来源切换)。
// 结构照抄已通过 QA 的 InfoBadgePage.vue 母版:上半区交互演示与参数面板,下半区固定属性与事件文档。
// 补充演示:中文取首字 / 占位与群组字形矩阵(源 InitialsGenerator + NoPhotoOrInitials/Group 态)、
// 图片失败降级(onerror 回落缩写,官方示例未覆盖、按任务要求补充)、徽标组合(对照源
// PersonPicture.cpp UpdateBadge 优先级与 TestUI 的 BadgeNumber/BadgeGlyph 参数)。
import { computed, ref } from 'vue'
import WuiPersonPicture from '@/components/PersonPicture.vue'
import DemoCode from '../components/DemoCode.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoPage from '../components/DemoPage.vue'
import { useBilingual, useDemoI18n } from '../components/labels'
import type { BilingualText } from '../components/labels'

const i18n = useDemoI18n()

// —— 页面文案(i18n 键集未覆盖,局部定义中英文案常量)——
const PAGE_TITLE: BilingualText = { zh: 'PersonPicture', en: 'PersonPicture' }
const PAGE_DESCRIPTION: BilingualText = {
  zh: 'WinUI PersonPicture 控件示例:照片 / 显示名 / 缩写三种头像来源切换,图片加载失败自动降级缩写,以及数字 / 字形 / 图片三形态徽标组合。',
  en: 'WinUI PersonPicture examples: photo / display name / initials sources, image-error fallback to initials, and number / glyph / image badge combos.',
}
const LOOKS_TITLE: BilingualText = { zh: '三种头像来源(对照官方 Select different looks 示例)', en: 'Three sources (official Select different looks example)' }
const NAMES_TITLE: BilingualText = { zh: '缩写推导:显示名 → 首字母 / 中文首字 / 占位与群组', en: 'Initials: name to letters, CJK first char, placeholder and group' }
const FALLBACK_TITLE: BilingualText = { zh: '图片失败降级(无效 URL → onerror 回落缩写)', en: 'Image fallback (invalid URL falls back to initials)' }
const BADGE_TITLE: BilingualText = { zh: '徽标组合(数字 99+ 截断 / 字形 / 图片;优先级 图片 > 数字 > 字形)', en: 'Badges (99+ truncation, glyph, image; priority image > number > glyph)' }
const LABEL_PROFILE_TYPE: BilingualText = { zh: '头像来源(Profile type)', en: 'Profile type' }
const LABEL_SIZE: BilingualText = { zh: '尺寸(Width/Height)', en: 'Size' }
const LABEL_BADGE_NUMBER: BilingualText = { zh: '徽标数值(BadgeNumber)', en: 'Badge number' }
const LABEL_BADGE_POSITION: BilingualText = { zh: '徽标方位(badgePosition,Web 扩展)', en: 'Badge position (web extension)' }
const LABEL_SHOW_BADGE: BilingualText = { zh: '显示徽标', en: 'Show badge' }
const LABEL_FALLBACK_NAME: BilingualText = { zh: '降级显示名(displayName)', en: 'Fallback display name' }
const STATE_HINT: BilingualText = { zh: '当前呈现', en: 'Current look' }
const LOOK_PHOTO: BilingualText = { zh: '照片(Profile Image)', en: 'Photo' }
const LOOK_NAME: BilingualText = { zh: '缩写(Display Name → JD)', en: 'Initials (Display Name → JD)' }
const LOOK_INITIALS: BilingualText = { zh: '缩写(Initials → SB)', en: 'Initials (Initials → SB)' }
const FALLBACK_OK_LABEL: BilingualText = { zh: '有效 URL', en: 'Valid URL' }
const FALLBACK_BAD_LABEL: BilingualText = { zh: '无效 URL', en: 'Invalid URL' }
const FALLBACK_HINT: BilingualText = { zh: '无效 URL 触发 onerror,自动回落为显示名缩写', en: 'The invalid URL fires onerror and falls back to name initials' }
const DOCS_PROPS_TITLE: BilingualText = { zh: '属性', en: 'Properties' }
const DOCS_EVENTS_TITLE: BilingualText = { zh: '事件', en: 'Events' }
const DOCS_USAGE_TITLE: BilingualText = { zh: '用法', en: 'Usage' }

const pageTitle = useBilingual(i18n, PAGE_TITLE)
const pageDescription = useBilingual(i18n, PAGE_DESCRIPTION)
const looksTitle = useBilingual(i18n, LOOKS_TITLE)
const namesTitle = useBilingual(i18n, NAMES_TITLE)
const fallbackTitle = useBilingual(i18n, FALLBACK_TITLE)
const badgeTitle = useBilingual(i18n, BADGE_TITLE)
const labelProfileType = useBilingual(i18n, LABEL_PROFILE_TYPE)
const labelSize = useBilingual(i18n, LABEL_SIZE)
const labelBadgeNumber = useBilingual(i18n, LABEL_BADGE_NUMBER)
const labelBadgePosition = useBilingual(i18n, LABEL_BADGE_POSITION)
const labelShowBadge = useBilingual(i18n, LABEL_SHOW_BADGE)
const labelFallbackName = useBilingual(i18n, LABEL_FALLBACK_NAME)
const stateHint = useBilingual(i18n, STATE_HINT)
const lookPhoto = useBilingual(i18n, LOOK_PHOTO)
const lookName = useBilingual(i18n, LOOK_NAME)
const lookInitials = useBilingual(i18n, LOOK_INITIALS)
const fallbackOkLabel = useBilingual(i18n, FALLBACK_OK_LABEL)
const fallbackBadLabel = useBilingual(i18n, FALLBACK_BAD_LABEL)
const fallbackHint = useBilingual(i18n, FALLBACK_HINT)
const docsPropsTitle = useBilingual(i18n, DOCS_PROPS_TITLE)
const docsEventsTitle = useBilingual(i18n, DOCS_EVENTS_TITLE)
const docsUsageTitle = useBilingual(i18n, DOCS_USAGE_TITLE)

// —— 官方示例同款三来源参数(PersonPicturePage.xaml.cs 的三个分支)——
/** 官方示例的 Profile Image URL(learn.microsoft.com 联系人示意图)。 */
const OFFICIAL_PROFILE_URL = 'https://learn.microsoft.com/windows/uwp/contacts-and-calendar/images/shoulder-tap-static-payload.png'
const OFFICIAL_DISPLAY_NAME = 'Jane Doe'
const OFFICIAL_INITIALS = 'SB'

/** 头像来源选择(官方示例的 RadioButtons:ProfileImage / DisplayName / Initials)。 */
type ProfileKind = 'profileImage' | 'displayName' | 'initials'

const profileKind = ref<string | number | boolean>('profileImage')

const profileKindOptions: { label: string; value: string }[] = [
  { label: 'Profile Image(照片)', value: 'profileImage' },
  { label: `Display Name(${OFFICIAL_DISPLAY_NAME})`, value: 'displayName' },
  { label: `Initials(${OFFICIAL_INITIALS})`, value: 'initials' },
]

const heroKind = computed<ProfileKind>(() => {
  const value = String(profileKind.value)
  return profileKindOptions.some((option) => option.value === value) ? (value as ProfileKind) : 'profileImage'
})

// DemoOptionRow 的 v-model 契约要求联合类型(见 demo/components/README.md)。
const heroSize = ref<string | number | boolean>(150)

const heroSide = computed(() => {
  const parsed = Number(heroSize.value)
  return Number.isFinite(parsed) ? Math.max(24, Math.min(300, parsed)) : 150
})

/** 三来源 props:照片来源下其余两项置空,与源代码后置的置空行为一致。 */
const heroProps = computed(() => {
  if (heroKind.value === 'profileImage') {
    return { profilePicture: OFFICIAL_PROFILE_URL, displayName: '', initials: '' }
  }
  if (heroKind.value === 'displayName') {
    return { profilePicture: '', displayName: OFFICIAL_DISPLAY_NAME, initials: '' }
  }
  return { profilePicture: '', displayName: '', initials: OFFICIAL_INITIALS }
})

const heroLookText = computed(() => {
  if (heroKind.value === 'profileImage') return lookPhoto.value
  if (heroKind.value === 'displayName') return lookName.value
  return lookInitials.value
})

// —— 演示二:缩写推导矩阵(源 InitialsGenerator:拉丁首尾词首字母、中文取首字、占位与群组)——
interface NameRow {
  caption: string
  displayName?: string
  initials?: string
  isGroup?: boolean
}

const NAME_ROWS: NameRow[] = [
  { caption: '"John Smith" → JS(拉丁双词取首尾)', displayName: 'John Smith' },
  { caption: '"王建国" → 王(中文取首字)', displayName: '王建国' },
  { caption: '"Madonna" → M(单词取首字母)', displayName: 'Madonna' },
  { caption: '"Jane Doe (OSG)" → JD(括号剔除)', displayName: 'Jane Doe (OSG)' },
  { caption: 'Initials="LC"(显式,优先于推导)', displayName: 'Luna Chen', initials: 'LC' },
  { caption: '无任何来源 → 联系人占位字形', },
  { caption: 'IsGroup → 群组占位字形', isGroup: true, displayName: '忽略个人信息' },
]

// —— 演示三:图片失败降级 ——
/** 无效 URL:不存在的主机,onerror 必触发。 */
const INVALID_PROFILE_URL = 'https://invalid.example.not-a-host/avatar.png'

const fallbackName = ref<string | number | boolean>('王建国')

const fallbackDisplayName = computed(() => String(fallbackName.value))

// —— 演示四:徽标组合(源 UpdateBadge 优先级:image > number > glyph;TestUI 的 E765-E770 字形)——
interface BadgeRow {
  caption: string
  badgeNumber?: number
  badgeGlyph?: string
  badgeImageSource?: string
}

const BADGE_ROWS: BadgeRow[] = [
  { caption: 'BadgeNumber="5"', badgeNumber: 5 },
  { caption: 'BadgeNumber="120" → 99+(源截断)', badgeNumber: 120 },
  { caption: 'BadgeGlyph="\\uE765"(TestUI 同款字形)', badgeGlyph: '\uE765' },
  { caption: 'BadgeImageSource(徽标图片)', badgeImageSource: OFFICIAL_PROFILE_URL },
]

// —— 主控件参数面板(徽标数值 / 方位实时调节)——
const demoBadgeNumber = ref<string | number | boolean>(0)
const demoBadgePosition = ref<string | number | boolean>('top-right')
const demoShowBadge = ref<string | number | boolean>(true)

const badgePositionOptions: { label: string; value: string }[] = [
  { label: 'top-right(源默认)', value: 'top-right' },
  { label: 'top-left', value: 'top-left' },
  { label: 'bottom-right', value: 'bottom-right' },
  { label: 'bottom-left', value: 'bottom-left' },
]

/** 徽标方位(Web 扩展属性值,与组件 prop 联合类型一致)。 */
type DemoBadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

const badgePositionValue = computed<DemoBadgePosition>(() => {
  const value = String(demoBadgePosition.value)
  const known = badgePositionOptions.some((option) => option.value === value)
  return known ? (value as DemoBadgePosition) : 'top-right'
})

const demoBadgeNumberValue = computed(() => {
  const parsed = Number(demoBadgeNumber.value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
})

const badgeNumberText = computed(() =>
  demoBadgeNumberValue.value > 99 ? '99+' : String(Math.max(0, demoBadgeNumberValue.value)),
)

// —— 下半区固定开发文档 ——
const propsHeaders = ['属性', '类型', '默认值', '说明']
const propsRows: (string | number)[][] = [
  ['displayName', 'string', "''", '显示名;按源 InitialsGenerator 推导缩写(拉丁双词取首尾字母,中文取首字)'],
  ['initials', 'string', "''", '显式缩写;优先于 displayName 推导(源 GetInitials 优先级)'],
  ['profilePicture', 'string', "''", '头像图片 URL;onerror 失败自动降级缩写 / 占位'],
  ['badgeNumber', 'number', '0', '徽标数值;> 0 显示,> 99 截断「99+」,<= 0 无徽标;优先级低于 badgeImageSource'],
  ['badgeGlyph', 'string', "''", '徽标字形(Segoe Fluent / MDL2 码点,如 \\uE765);优先级最低'],
  ['badgeImageSource', 'string', "''", '徽标图片 URL;优先级最高(源 UpdateBadge 顺序 image > number > glyph)'],
  ['badgeText', 'string', "''", '徽标无障碍文本覆盖;替换播报中的「n items」/「icon」'],
  ['isGroup', 'boolean', 'false', '群组模式:显示 People 占位字形(E716)并隐藏个人信息'],
  ['width / height', 'number | string', '96', '尺寸;按源 OnSizeChanged 取 min(宽, 高) 保持圆形,缩写字号 = 边长 × 42%'],
  ['badgePosition', "'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'", "'top-right'", '徽标方位(Web 扩展,WinUI 无此 API);缺省与源 BadgeGrid 对齐一致'],
]
const eventHeaders = ['事件', '参数', '触发时机']
const eventRows: (string | number)[][] = [
  ['—', '—', 'PersonPicture 为非交互展示控件(WinUI IsTabStop=false),无事件;无障碍语义经 role="img" + aria-label 播报(格式同源:姓名 + 徽标信息)'],
]

// 用法代码随参数实时更新,直观展示「参数 → 代码」的映射。
const usageCode = computed(() => {
  const lines: string[] = ['<WuiPersonPicture']
  if (heroKind.value === 'profileImage') {
    lines.push(`  profile-picture="${OFFICIAL_PROFILE_URL}"`)
  } else if (heroKind.value === 'displayName') {
    lines.push(`  display-name="${OFFICIAL_DISPLAY_NAME}"`)
  } else {
    lines.push(`  initials="${OFFICIAL_INITIALS}"`)
  }
  if (demoShowBadge.value === true && demoBadgeNumberValue.value > 0) {
    lines.push(`  :badge-number="${demoBadgeNumberValue.value}"`)
    lines.push(`  badge-position="${badgePositionValue.value}"`)
  }
  lines.push('/>')
  return lines.join('\n')
})
</script>

<template>
  <DemoPage :title="pageTitle" :description="pageDescription" wiki="PersonPicture">
    <template #demo>
      <div class="person-picture-stage">
        <!-- 演示一:三种头像来源(对照官方 Select different looks 示例) -->
        <section class="demo-group">
          <h3 class="group-title">{{ looksTitle }}</h3>
          <div class="hero-stage">
            <WuiPersonPicture
              :profile-picture="heroProps.profilePicture"
              :display-name="heroProps.displayName"
              :initials="heroProps.initials"
              :width="heroSide"
              :height="heroSide"
            />
          </div>
          <p class="demo-output">{{ stateHint }}: {{ heroLookText }}</p>
        </section>

        <!-- 演示二:缩写推导矩阵 -->
        <section class="demo-group">
          <h3 class="group-title">{{ namesTitle }}</h3>
          <div class="name-grid" role="group" :aria-label="namesTitle">
            <template v-for="row in NAME_ROWS" :key="row.caption">
              <WuiPersonPicture
                class="name-cell"
                :display-name="row.displayName"
                :initials="row.initials"
                :is-group="row.isGroup"
                :width="64"
                :height="64"
              />
              <span class="name-caption">{{ row.caption }}</span>
            </template>
          </div>
        </section>

        <!-- 演示三:图片失败降级(有效 URL vs 无效 URL) -->
        <section class="demo-group">
          <h3 class="group-title">{{ fallbackTitle }}</h3>
          <div class="fallback-row">
            <figure class="fallback-item">
              <WuiPersonPicture :profile-picture="OFFICIAL_PROFILE_URL" :display-name="fallbackDisplayName" :width="96" :height="96" />
              <figcaption class="name-caption">{{ fallbackOkLabel }}</figcaption>
            </figure>
            <figure class="fallback-item">
              <WuiPersonPicture :profile-picture="INVALID_PROFILE_URL" :display-name="fallbackDisplayName" :width="96" :height="96" />
              <figcaption class="name-caption">{{ fallbackBadLabel }}</figcaption>
            </figure>
          </div>
          <p class="demo-output">{{ fallbackHint }}</p>
        </section>

        <!-- 演示四:徽标组合(对照源 UpdateBadge 优先级与 TestUI 参数) -->
        <section class="demo-group">
          <h3 class="group-title">{{ badgeTitle }}</h3>
          <div class="badge-grid" role="group" :aria-label="badgeTitle">
            <template v-for="row in BADGE_ROWS" :key="row.caption">
              <WuiPersonPicture
                class="name-cell"
                display-name="James Bond"
                :width="72"
                :height="72"
                :badge-number="row.badgeNumber"
                :badge-glyph="row.badgeGlyph"
                :badge-image-source="row.badgeImageSource"
              />
              <span class="name-caption">{{ row.caption }}</span>
            </template>
          </div>
          <div class="badge-live">
            <WuiPersonPicture
              display-name="实时调节"
              :width="96"
              :height="96"
              :badge-number="demoShowBadge === true ? demoBadgeNumberValue : 0"
              :badge-position="badgePositionValue"
            />
            <p class="demo-output">BadgeNumber → {{ badgeNumberText }}</p>
          </div>
        </section>
      </div>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow :label="labelProfileType" type="select" v-model="profileKind" :options="profileKindOptions" />
        <DemoOptionRow :label="labelSize" type="slider" v-model="heroSize" :min="24" :max="300" :step="2" />
        <DemoOptionRow :label="labelBadgeNumber" type="slider" v-model="demoBadgeNumber" :min="0" :max="120" :step="1" />
        <DemoOptionRow :label="labelShowBadge" type="toggle" v-model="demoShowBadge" />
        <DemoOptionRow :label="labelBadgePosition" type="select" v-model="demoBadgePosition" :options="badgePositionOptions" />
        <DemoOptionRow :label="labelFallbackName" type="text" v-model="fallbackName" />
      </DemoOptions>
    </template>

    <template #docs>
      <h3 class="docs-subtitle">{{ docsPropsTitle }}</h3>
      <DemoDocsTable :headers="propsHeaders" :rows="propsRows" />
      <h3 class="docs-subtitle">{{ docsEventsTitle }}</h3>
      <DemoDocsTable :headers="eventHeaders" :rows="eventRows" />
      <h3 class="docs-subtitle">{{ docsUsageTitle }}</h3>
      <DemoCode :code="usageCode" language="vue" />
    </template>
  </DemoPage>
</template>

<style scoped>
.person-picture-stage {
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

/* 对照官方示例的 Output TextBlock:轻量回显 */
.demo-output {
  margin: 0;
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 演示一:中性底座,避免徽标负 margin 出血到页面外(底色取 DemoPage 同款中性面 token) */
.hero-stage {
  display: flex;
  min-width: 240px;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  background: var(--wui-application-page-background-theme);
}

/* 演示二 / 演示四:参数矩阵 */
.name-grid,
.badge-grid {
  display: grid;
  grid-template-columns: 72px auto;
  align-items: center;
  gap: 12px 12px;
}

.name-cell {
  justify-self: center;
}

.name-caption {
  font-size: var(--wui-tool-tip-content-theme-font-size);
  color: var(--wui-application-secondary-foreground-theme);
}

/* 演示三:有效 / 无效 URL 对照 */
.fallback-row {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.fallback-item {
  display: flex;
  margin: 0;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/* 演示四:实时调节的徽标展示 */
.badge-live {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--wui-system-control-background-base-low);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  background: var(--wui-application-page-background-theme);
}

.docs-subtitle {
  margin: 16px 0 8px;
  font-size: var(--wui-pivot-title-font-size);
  font-weight: 600;
  color: var(--wui-application-foreground-theme);
}
</style>
