<script setup lang="ts">
// PersonPicture.vue —— WinUI PersonPicture 控件的 Web 复刻:联系人头像(照片 / 缩写 / 占位字形 + 徽标)。
// 视觉与行为对照源(该控件的主题资源不在 dxaml/generic.xaml,theme.css 无 PersonPicture* token):
//   - CK/WinUI-Reference/controls/dev/PersonPicture/PersonPicture_themeresources.xaml(主题画刷与尺寸资源);
//   - CK/WinUI-Reference/controls/dev/PersonPicture/PersonPicture.xaml(DefaultPersonPictureStyle
//     ControlTemplate:底 Ellipse + InitialsTextBlock + 照片 Ellipse + BadgeGrid,四态/徽标态 VSM);
//   - CK/WinUI-Reference/controls/dev/PersonPicture/PersonPicture.cpp(状态机 UpdateIfReady、
//     徽标优先级 UpdateBadge、99+ 截断 UpdateBadgeNumber、OnSizeChanged 的方形与字号推导、
//     UpdateAutomationName 的「PersonName, BadgeInformation」拼接);
//   - CK/WinUI-Reference/controls/dev/PersonPicture/InitialsGenerator.cpp(缩写推导算法,逐条移植)。
// 非交互控件:源 IsTabStop=False、模板无 PointerOver/Pressed/Disabled/Focus 状态,故无事件、无交互态;
// 无障碍 role="img" + aria-label(拼接规则同源 UpdateAutomationName),装饰性用法由调用方以
// aria-hidden 覆盖(attrs 优先),内部 <img> 一律 alt=""(语义由根节点承载)。
// 已知 Web 侧差异(详见 wiki/controls/PersonPicture.md 差异节):
//   1. 源 InitialsGenerator 对 CJK(Symbolic)返回空串 → 显示联系人占位字形;本组件按任务需求
//      「中文取首字」改为取首字符(有意偏离,已注释标注);
//   2. 源 ProfilePicture 属性赋值即进入 Photo 态(未加载完为空白椭圆);Web 侧图片 load 成功才切
//      Photo 态,加载中 / onerror 失败回落缩写(对应任务「onerror 降级缩写」);
//   3. badgePosition 为 Web 扩展属性(WinUI 无此 API),默认 top-right 与源模板一致。
import { computed, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'

/** 徽标方位(Web 扩展;源模板固定 top-right)。 */
type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'

const props = withDefaults(
  defineProps<{
    /** 显示名(WinUI DisplayName):推导缩写;有照片时被照片覆盖。 */
    displayName?: string
    /** 显式缩写(WinUI Initials):优先于 displayName 推导(源 GetInitials 优先级一致)。 */
    initials?: string
    /** 头像图片 URL(WinUI ProfilePicture);加载失败(onerror)自动降级为缩写/占位。 */
    profilePicture?: string
    /** 徽标数值(WinUI BadgeNumber,Int32):> 0 显示,> 99 截断为「99+」;<= 0 无徽标。 */
    badgeNumber?: number
    /** 徽标字形(WinUI BadgeGlyph):Segoe Fluent / MDL2 码点字符串,如 '\uE765'。 */
    badgeGlyph?: string
    /** 徽标图片 URL(WinUI BadgeImageSource):小图徽标,优先级高于数字与字形(源一致)。 */
    badgeImageSource?: string
    /** 徽标无障碍文本覆盖(WinUI BadgeText):替换「n items」/「icon」的播报文案。 */
    badgeText?: string
    /** 群组模式(WinUI IsGroup):显示 People 占位字形并隐藏个人信息。 */
    isGroup?: boolean
    /** 宽度(WinUI Width),px;源 OnSizeChanged 以 min(宽, 高) 保持圆形。 */
    width?: number | string
    /** 高度(WinUI Height),px;缺省与源默认 96 一致。 */
    height?: number | string
    /** 徽标方位(Web 扩展,WinUI 无此 API);缺省 top-right,与源 BadgeGrid 对齐一致。 */
    badgePosition?: BadgePosition
  }>(),
  {
    displayName: '',
    initials: '',
    profilePicture: '',
    badgeNumber: 0,
    badgeGlyph: '',
    badgeImageSource: '',
    badgeText: '',
    isGroup: false,
    width: 96,
    height: 96,
    badgePosition: 'top-right',
  },
)

defineOptions({ inheritAttrs: false, name: 'WuiPersonPicture' })

// —— 尺寸推导(PersonPicture.cpp OnSizeChanged:方形化 + 42% 字号 + 50% 徽标)——
function toPx(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 96
}

/** 有效边长:min(Width, Height),对应源以较小值同时写回宽高维持圆形。 */
const side = computed(() => Math.min(toPx(props.width), toPx(props.height)))

/** 缩写字号 = max(1, 边长 × 0.42)(源 OnSizeChanged 的设计规范值)。 */
const initialsFontSize = computed(() => `${Math.max(1, side.value * 0.42)}px`)

/** 徽标盘直径 = 边长 × 0.5(源:徽标约占控件一半,避免遮挡头像)。 */
const badgeSize = computed(() => side.value * 0.5)

/** 徽标数字 / 字形字号 = max(1, 徽标盘直径 × 0.6)(源 OnSizeChanged)。 */
const badgeFontSize = computed(() => `${Math.max(1, badgeSize.value * 0.6)}px`)

const rootStyle = computed<CSSProperties>(() => ({
  width: `${side.value}px`,
  height: `${side.value}px`,
}))

// —— 缩写推导(InitialsGenerator.cpp 移植)——
type CharacterType = 'glyph' | 'symbolic' | 'standard' | 'other'

/** 源 GetCharacterType(wchar_t):Unicode 区块白名单,优先级 Glyph > Symbolic > Standard。 */
function getCharType(code: number): CharacterType {
  // GLYPH:IPA 扩展 / 阿拉伯系 / 天城文系 / 印度系各文字 / 泰文 / 老挝文
  if ((code >= 0x0250 && code <= 0x02af) || (code >= 0x0600 && code <= 0x06ff) || (code >= 0x0750 && code <= 0x077f) || (code >= 0x08a0 && code <= 0x08ff) || (code >= 0xfb50 && code <= 0xfdff) || (code >= 0xfe70 && code <= 0xfeff) || (code >= 0x0900 && code <= 0x097f) || (code >= 0xa8e0 && code <= 0xa8ff) || (code >= 0x0980 && code <= 0x09ff) || (code >= 0x0a00 && code <= 0x0a7f) || (code >= 0x0a80 && code <= 0x0aff) || (code >= 0x0b00 && code <= 0x0b7f) || (code >= 0x0b80 && code <= 0x0bff) || (code >= 0x0c00 && code <= 0x0c7f) || (code >= 0x0c80 && code <= 0x0cff) || (code >= 0x0d00 && code <= 0x0d7f) || (code >= 0x0d80 && code <= 0x0dff) || (code >= 0x0e00 && code <= 0x0e7f) || (code >= 0x0e80 && code <= 0x0eff)) {
    return 'glyph'
  }
  // SYMBOLIC:CJK 统一表意文字及扩展 / 部首与笔画 / 日文假名补充 / 希腊 / 希伯来 / 亚美尼亚
  if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0x20000 && code <= 0x2a6df) || (code >= 0x2a700 && code <= 0x2b73f) || (code >= 0x2b740 && code <= 0x2b81f) || (code >= 0x2e80 && code <= 0x2eff) || (code >= 0x3000 && code <= 0x303f) || (code >= 0x31c0 && code <= 0x31ef) || (code >= 0x3200 && code <= 0x32ff) || (code >= 0x3300 && code <= 0x33ff) || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xfe30 && code <= 0xfe4f) || (code >= 0x2f800 && code <= 0x2fa1f) || (code >= 0x0370 && code <= 0x03ff) || (code >= 0x0590 && code <= 0x05ff) || (code >= 0x0530 && code <= 0x058f)) {
    return 'symbolic'
  }
  // LATIN / 基本拉丁 / 拉丁扩展各段 / 西里尔 / 西里尔补充 / 组合变音符号
  if ((code > 0x0000 && code <= 0x007f) || (code >= 0x0080 && code <= 0x00ff) || (code >= 0x0100 && code <= 0x017f) || (code >= 0x0180 && code <= 0x024f) || (code >= 0x2c60 && code <= 0x2c7f) || (code >= 0xa720 && code <= 0xa7ff) || (code >= 0xab30 && code <= 0xab6f) || (code >= 0x1e00 && code <= 0x1eff) || (code >= 0x0400 && code <= 0x04ff) || (code >= 0x0500 && code <= 0x052f) || (code >= 0x0300 && code <= 0x036f)) {
    return 'standard'
  }
  return 'other'
}

/** 源 GetCharacterType(wstring_view):取前 3 个字符,混合时按 Glyph > Symbolic > Latin 让位。 */
function getCharacterType(text: string): CharacterType {
  let result: CharacterType = 'other'
  const chars = Array.from(text).slice(0, 3)
  for (const char of chars) {
    const code = char.codePointAt(0) ?? 0
    if (code === 0 || code === 0xfeff) break
    const evaluation = getCharType(code)
    if (evaluation === 'glyph') result = 'glyph'
    else if (evaluation === 'symbolic' && result !== 'glyph') result = 'symbolic'
    else if (evaluation === 'standard' && result !== 'glyph' && result !== 'symbolic') result = 'standard'
  }
  return result
}

/** 源 GetFirstFullCharacter:跳过起始标点(0x21-2F/3A-40/7B-7E),合并首字符后的变音符号(0x300-0x36F)。 */
function getFirstFullCharacter(text: string): string {
  const chars = Array.from(text)
  let start = 0
  while (start < chars.length) {
    const code = chars[start]?.codePointAt(0) ?? 0
    if ((code >= 0x0021 && code <= 0x002f) || (code >= 0x003a && code <= 0x0040) || (code >= 0x007b && code <= 0x007e)) {
      start++
      continue
    }
    break
  }
  if (start >= chars.length) start = 0
  let result = chars[start] ?? ''
  for (let index = start + 1; index < chars.length; index++) {
    const code = chars[index]?.codePointAt(0) ?? 0
    if (code < 0x0300 || code > 0x036f) break
    result += chars[index]
  }
  return result
}

/** 源 StripTrailingBrackets:末尾成对括号内的内容不参与缩写(如 "John Smith (OSG)" → "John Smith")。 */
function stripTrailingBrackets(source: string): string {
  const delimiters: [string, string][] = [
    ['{', '}'],
    ['(', ')'],
    ['[', ']'],
  ]
  for (const [open, close] of delimiters) {
    if (!source.endsWith(close)) continue
    const start = source.lastIndexOf(open)
    if (start < 0) continue
    return source.slice(0, start)
  }
  return source
}

/** 源 InitialsFromDisplayName;Symbolic(CJK)分支为 Web 扩展:源返回空串(占位字形),此处按任务需求取首字。 */
function initialsFromDisplayName(name: string): string {
  const type = getCharacterType(name)
  if (type === 'standard') {
    const stripped = stripTrailingBrackets(name)
    const words = stripped.split(' ').filter((word) => word.length > 0)
    if (words.length === 1) {
      return (getFirstFullCharacter(words[0] ?? '')).toUpperCase()
    }
    if (words.length > 1) {
      const first = getFirstFullCharacter(words[0] ?? '')
      const last = getFirstFullCharacter(words[words.length - 1] ?? '')
      return (first + last).toUpperCase()
    }
    return ''
  }
  if (type === 'symbolic') {
    // Web 侧有意偏离:源对 CJK 返回空串 → 显示联系人占位字形;任务要求中文取首字。
    const first = getFirstFullCharacter(name)
    return first.length > 0 ? first : ''
  }
  // Glyph / Other:源行为,返回空串 → NoPhotoOrInitials 占位字形。
  return ''
}

// —— 状态机(PersonPicture.cpp UpdateIfReady + 模板 CommonStates)——
/** 图片加载态:load 成功才进入 Photo 态(Web 差异 #2,见文件头注释)。 */
const photoReady = ref(false)
const photoFailed = ref(false)

/** 缓存图可能先于 Vue 事件监听完成加载(load/error 已错过),挂载时按 complete 兜底判定。 */
const photoImg = ref<HTMLImageElement | null>(null)

onMounted(() => {
  const img = photoImg.value
  if (img && img.complete && props.profilePicture.length > 0) {
    photoReady.value = img.naturalWidth > 0
    photoFailed.value = img.naturalWidth === 0
  }
})

watch(
  () => props.profilePicture,
  () => {
    photoReady.value = false
    photoFailed.value = false
  },
)

function onPhotoLoad(): void {
  photoReady.value = true
}

function onPhotoError(): void {
  photoFailed.value = true
}

/** 控件最终展示的缩写:GetInitials 优先级 Initials 显式 > displayName 推导。 */
const displayInitials = computed(() => (props.initials.length > 0 ? props.initials : initialsFromDisplayName(props.displayName)))

type PictureState = 'photo' | 'initials' | 'placeholder' | 'group'

const state = computed<PictureState>(() => {
  if (props.isGroup) return 'group'
  if (props.profilePicture.length > 0 && photoReady.value && !photoFailed.value) return 'photo'
  if (displayInitials.value.length > 0) return 'initials'
  return 'placeholder'
})

/** 占位字形:联系人 E77B / 群组 E716(源模板 NoPhotoOrInitials / Group 态的 SymbolThemeFontFamily 字形)。 */
const PLACEHOLDER_CONTACT_GLYPH = '\uE77B'
const PLACEHOLDER_GROUP_GLYPH = '\uE716'

const initialsText = computed(() => {
  if (state.value === 'group') return PLACEHOLDER_GROUP_GLYPH
  if (state.value === 'placeholder') return PLACEHOLDER_CONTACT_GLYPH
  if (state.value === 'initials') return displayInitials.value
  return ''
})

// —— 徽标(PersonPicture.cpp UpdateBadge 优先级:image > number > glyph)——
type BadgeKind = 'none' | 'number' | 'glyph' | 'image'

const badgeKind = computed<BadgeKind>(() => {
  if (props.badgeImageSource.length > 0) return 'image'
  if (props.badgeNumber !== 0) {
    // 源 UpdateBadgeNumber:number <= 0 直接回 NoBadge(即使 glyph 非空也不回退,源的分支行为)。
    return props.badgeNumber > 0 ? 'number' : 'none'
  }
  if (props.badgeGlyph.length > 0) return 'glyph'
  return 'none'
})

const showBadge = computed(() => badgeKind.value !== 'none')

/** 数字徽标文本:> 99 截断为「99+」(源 UpdateBadgeNumber)。 */
const badgeNumberText = computed(() => (props.badgeNumber > 99 ? '99+' : String(props.badgeNumber)))

/** 徽标方位定位:源 BadgeGrid Margin="0,-4,-4,0"(左,上,右,下)= top/right 各 -4px;其余方位为 Web 扩展镜像。 */
const badgePositionStyle = computed<CSSProperties>(() => {
  switch (props.badgePosition) {
    case 'top-left':
      return { top: '-4px', left: '-4px' }
    case 'bottom-right':
      return { bottom: '-4px', right: '-4px' }
    case 'bottom-left':
      return { bottom: '-4px', left: '-4px' }
    case 'top-right':
    default:
      return { top: '-4px', right: '-4px' }
  }
})

// —— 无障碍(PersonPicture.cpp UpdateAutomationName:PersonName, BadgeInformation)——
const automationName = computed(() => {
  // PersonName:群组 → Group;displayName → 姓名;initials → 缩写;否则本地化缺省「Person」
  // (源 SR_PersonName / SR_GroupName,本地化资源在阶段 8 统一接入,先取英文资源默认值)。
  let contactName: string
  if (props.isGroup) contactName = 'Group'
  else if (props.displayName.length > 0) contactName = props.displayName
  else if (props.initials.length > 0) contactName = props.initials
  else contactName = 'Person'

  if (badgeKind.value === 'number') {
    // 源 SR_BadgeItemTextOverride / SR_BadgeItemSingular / 复数格式,英文资源缺省形如 "n items"。
    const suffix = props.badgeText.length > 0 ? props.badgeText : props.badgeNumber === 1 ? 'item' : 'items'
    return `${contactName}, ${props.badgeNumber} ${suffix}`
  }
  if (badgeKind.value === 'glyph' || badgeKind.value === 'image') {
    return `${contactName}, ${props.badgeText.length > 0 ? props.badgeText : 'icon'}`
  }
  return contactName
})
</script>

<template>
  <div
    class="wui-person-picture"
    :class="`is-${state}`"
    :style="rootStyle"
    role="img"
    :aria-label="automationName"
    v-bind="$attrs"
  >
    <!-- 底 Ellipse:Fill=Background(ControlAltFillColorQuarternary)、Stroke=BorderBrush(CardStrokeColorDefault) -->
    <span class="wui-person-picture__ellipse" aria-hidden="true"></span>
    <!-- InitialsTextBlock:缩写 / 联系人占位 E77B / 群组占位 E716(占位态切换为 Symbol 字体) -->
    <span
      class="wui-person-picture__initials"
      :class="{ 'wui-person-picture__initials--glyph': state === 'placeholder' || state === 'group' }"
      :style="{ fontSize: initialsFontSize }"
      aria-hidden="true"
    >{{ initialsText }}</span>
    <!-- 照片 Ellipse:PersonPictureEllipse + ActualImageBrush(UniformToFill → object-fit: cover)。
         img 须持续挂载才能触发 @load/@error(load 成功才切 Photo 态),故仅当配置了 URL 即渲染,
         未就绪时以 visibility 隐藏(隐藏不阻断图片加载)。 -->
    <span
      v-if="profilePicture.length > 0"
      class="wui-person-picture__photo"
      :class="{ 'is-ready': state === 'photo' }"
      aria-hidden="true"
    >
      <img
        ref="photoImg"
        class="wui-person-picture__photo-img"
        :src="profilePicture"
        alt=""
        @load="onPhotoLoad"
        @error="onPhotoError"
      />
    </span>
    <!-- BadgeGrid:Top/Right 对齐 + Margin 0,-4,-4,0;BadgingBackgroundEllipse + 数字/字形/图片 -->
    <span
      v-if="showBadge"
      class="wui-person-picture__badge"
      :style="badgePositionStyle"
      aria-hidden="true"
    >
      <span class="wui-person-picture__badge-plate"></span>
      <span
        v-if="badgeKind === 'number'"
        class="wui-person-picture__badge-text"
        :style="{ fontSize: badgeFontSize }"
      >{{ badgeNumberText }}</span>
      <span
        v-else-if="badgeKind === 'glyph'"
        class="wui-person-picture__badge-glyph"
        :style="{ fontSize: badgeFontSize }"
      >{{ badgeGlyph }}</span>
      <img
        v-else-if="badgeKind === 'image'"
        class="wui-person-picture__badge-img"
        :src="badgeImageSource"
        alt=""
      />
    </span>
  </div>
</template>

<style scoped>
.wui-person-picture {
  position: relative;
  display: inline-block;
  flex: none;
  box-sizing: border-box;
  /* 源 OnSizeChanged 以 min(Width, Height) 维持圆形;Web 侧由 rootStyle 保证方形 + 比例兜底 */
  aspect-ratio: 1 / 1;
  /* PersonPictureForegroundThemeBrush = TextFillColorPrimaryBrush(源浅 #E4000000 = 89% 黑 / 深 #FFFFFF):
     theme.css 并未生成该 token(仅头部命名注释提及),取最近似 token SystemControlForegroundBaseHigh
     —— 深色(#ffffff)与源恒等;浅色(#000000 不透明)较源 #E4000000 略深(缺 89% alpha),
     差异记录于 wiki/controls/PersonPicture.md 差异节 */
  color: var(--wui-system-control-foreground-base-high);
  /* ContentControlThemeFontFamily / FontWeight=SemiBold(DefaultPersonPictureStyle Setter) */
  font-family: var(--wui-content-control-theme-font-family);
  font-weight: 600;
  user-select: none;
  -webkit-user-select: none;
  /* theme.css 无 ControlAltFillColorQuarternary / CardStrokeColorDefault token:
     按源 Common_themeresources_any.xaml 值注入组件级默认值层(调用方可用同名变量覆盖) */
  /* 字节序换算:源 XAML Color 为 AARRGGBB,CSS 8 位 hex 为 RRGGBBAA,写入前已逐值转换
     (QA 重点项:直接照搬会出现 alpha 与红通道错位,如 #18000000 → 全透明、#12FFFFFF → 不透明青)。
     ControlAltFillColorQuarternary(Light)= AARRGGBB #18000000 → CSS #00000018
     CardStrokeColorDefault(Light)= AARRGGBB #0F000000 → CSS #0000000F */
  --wui-person-picture-ellipse-fill: #00000018; /* ControlAltFillColorQuarternary(Light) */
  --wui-person-picture-ellipse-stroke: #0000000f; /* CardStrokeColorDefault(Light) */
  /* 徽标数字 / 字形前景:PersonPictureEllipseBadgeForegroundThemeBrush =
     TextOnAccentFillColorPrimaryBrush(theme.css 无 TextOnAccent 同名 token,按源值在组件内
     承载,InfoBadge 同款做法;源 SystemColorOverrideResourceDictionary Light #FFFFFF / Default #000000) */
  --wui-person-picture-badge-foreground: #ffffff; /* TextOnAccentFillColorPrimary(Light) */
}

.wui-person-picture__ellipse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid var(--wui-person-picture-ellipse-stroke); /* PersonPictureEllipseFillStrokeBrush,StrokeThickness 1 */
  background: var(--wui-person-picture-ellipse-fill); /* PersonPictureEllipseFillThemeBrush */
  box-sizing: border-box;
}

/* —— InitialsTextBlock:TextLineBounds=Tight + 居中;字号由 OnSizeChanged 公式注入 —— */
.wui-person-picture__initials {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-weight: 600;
}

/* NoPhotoOrInitials / Group 态:InitialsTextBlock.FontFamily = SymbolThemeFontFamily */
.wui-person-picture__initials--glyph {
  font-family: var(--wui-symbol-theme-font-family);
}

/* —— 照片 Ellipse:PersonPictureEllipse,ImageBrush Stretch=UniformToFill → object-fit: cover —— */
.wui-person-picture__photo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  /* 未就绪(加载中 / 失败)隐藏,回落缩写或占位字形;img 仍保持加载以等待 load/error 事件 */
  visibility: hidden;
}

.wui-person-picture__photo.is-ready {
  visibility: visible;
}

.wui-person-picture__photo-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* —— BadgeGrid:宽高 = 控件 50%(OnSizeChanged),Margin 0,-4,-4,0 由 badgePositionStyle 注入 —— */
.wui-person-picture__badge {
  position: absolute;
  width: 50%;
  height: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

/* BadgingBackgroundEllipse:Fill=AccentFillColorDefaultBrush(最近似 token 同 InfoBadge)、
   Stroke=ControlFillColorTransparentBrush(不可见,保留厚度 2 以对照源资源) */
.wui-person-picture__badge-plate {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--wui-system-accent-color);
  border: 2px solid transparent;
  box-sizing: border-box;
}

/* BadgeNumberTextBlock / BadgeGlyphIcon:Foreground=TextOnAccentFillColorPrimaryBrush
   (组件级局部 token 按源值承载,InfoBadge 同款做法,见 .wui-person-picture 处注释);
   字号由 60% 公式注入 */
.wui-person-picture__badge-text {
  position: relative;
  line-height: 1;
  font-weight: 600;
  color: var(--wui-person-picture-badge-foreground);
}

.wui-person-picture__badge-glyph {
  position: relative;
  line-height: 1;
  font-family: var(--wui-symbol-theme-font-family);
  color: var(--wui-person-picture-badge-foreground);
}

/* BadgingEllipse + BadgeImageBrush:徽标图片圆形裁剪 */
.wui-person-picture__badge-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

/* —— 深色主题(Default 字典):AARRGGBB #12FFFFFF / #19000000 → RRGGBBAA #FFFFFF12 / #00000019 —— */
html[data-theme='dark'] .wui-person-picture {
  --wui-person-picture-ellipse-stroke: #00000019; /* CardStrokeColorDefault(Default) */
  --wui-person-picture-ellipse-fill: #ffffff12; /* ControlAltFillColorQuarternary(Default) */
  --wui-person-picture-badge-foreground: #000000; /* TextOnAccentFillColorPrimary(Default)= #000000 */
}
</style>
