<script setup lang="ts">
// RatingRecipe —— 组合控件教学组件:「食谱评分卡」(WinUI UserControl 概念的 Web 复刻)。
// 官方蓝本:CK/WinUI-Gallery/WinUIGallery/Samples/CustomUserControls/(UserControl =
// 把已有控件与逻辑组合成一个可复用单元,对照 TemperatureConverterControl 的组合方式),
// 卡片内容对照 ItemsRepeaterPage.xaml 的 RecipeTemplate(Recipe 类:Num/Name/Ingredients/Color,
// 图片区为数据色块)。本组件演示组合控件的标准 API 设计:
//   - props 透传:name/ingredients/caption/maxRating/isReadOnly/disabled 转发给内部子控件;
//   - defineModel 双向:value(评分,转发 WuiRatingControl)、favorite(收藏,内部 WuiToggleButton);
//   - emits 再广播:valueChanged 转发 RatingControl 事件、favoriteChanged 为组件自有事件
//     (WinUI 事件命名,模板监听写 @value-changed / @favorite-changed);
//   - slot 扩展点:image 具名插槽替换整个媒体区、默认插槽追加卡片底部自定义内容;
//   - 内部全部复用已入库控件(WuiRatingControl / WuiToggleButton / FontIcon),自身只做
//     布局与封装 —— 这正是 WinUI「UserControl = 组合已有控件」的要点(Web 侧无
//     InitializeComponent/Generic.xaml,用 scoped CSS + 组件级 token 局部变量替代默认样式)。
// 无障碍:卡片 role="group" + aria-label = 菜谱名;收藏钮 aria-label 随状态切换;
//   评分条继承 WuiRatingControl 的 role="slider" 语义(aria-label = 「<名> 评分」)。
import { computed, ref, watch } from 'vue'
import WuiRatingControl from './RatingControl.vue'
import type { RatingControlValueChangedEventArgs } from './RatingControl.vue'
import WuiToggleButton from './ToggleButton.vue'
import FontIcon from './FontIcon.vue'

defineOptions({ name: 'WuiRatingRecipe', inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** 菜谱名(WinUI Recipe.Name);同时作为卡片 aria-label 与收藏钮无障碍名的一部分。 */
    name: string
    /** 食材/简介一行文字(官方 Recipe.Ingredients,空串不渲染)。 */
    ingredients?: string
    /** 图片地址(对应 WinUI Image.Source;空串渲染占位色块,加载失败同样回落占位色块)。 */
    image?: string
    /** 图片替代文本(alt);装饰性图片保持空串。 */
    imageAlt?: string
    /** 占位色块底色(对应官方 Recipe.Color 数据字段;空串用系统强调色 token)。 */
    accent?: string
    /** 占位色块上的字形(emoji/单字符;对应官方模板色块上的编号文本)。 */
    glyph?: string
    /** 评分条右侧说明文字(转发 WuiRatingControl Caption,如「128 条评分」)。 */
    caption?: string
    /** 星星数量(转发 WuiRatingControl MaxRating)。 */
    maxRating?: number
    /** 只读:评分条不可交互(转发 WuiRatingControl IsReadOnly;收藏钮仍可用)。 */
    isReadOnly?: boolean
    /** 禁用整卡:评分条与收藏钮均禁用(对应 WinUI Control.IsEnabled)。 */
    disabled?: boolean
  }>(),
  {
    ingredients: '',
    image: '',
    imageAlt: '',
    accent: '',
    glyph: '🍽️',
    caption: '',
    maxRating: 5,
    isReadOnly: false,
    disabled: false,
  },
)

// 双向值:当前评分(WinUI Value 语义,null = 未评分)与收藏态。
const value = defineModel<number | null>('value', { default: null })
const favorite = defineModel<boolean>('favorite', { default: false })

const emit = defineEmits<{
  /** 评分提交(转发 WuiRatingControl 的 valueChanged,携带前后值)。 */
  valueChanged: [event: RatingControlValueChangedEventArgs]
  /** 收藏态切换(组件自有事件;仅用户交互触发)。 */
  favoriteChanged: [isFavorite: boolean]
}>()

// —— 占位色块(官方 RecipeTemplate:色块 Background={x:Bind Color};颜色是数据不是样式,
// 故允许调用方传任意 CSS 颜色,缺省回落系统强调色 token)——
const tileColor = computed(() => props.accent || 'var(--wui-system-accent-color)')

// —— 图片失败回落:img error → 回落占位色块(换图时重置)——
const imageFailed = ref(false)
watch(
  () => props.image,
  () => {
    imageFailed.value = false
  },
)
const showImage = computed(() => props.image !== '' && !imageFailed.value)

function onImageError(): void {
  imageFailed.value = true
}

// —— 事件转发 ——
function onValueChanged(event: RatingControlValueChangedEventArgs): void {
  emit('valueChanged', event)
}

/** 收藏切换:ToggleButton 的 checked 模型是 boolean | 'indeterminate',卡片侧收敛为 boolean。 */
function onCheckedChange(next: boolean | 'indeterminate'): void {
  const isFavorite = next === true
  if (isFavorite !== favorite.value) {
    favorite.value = isFavorite
    emit('favoriteChanged', isFavorite)
  }
}

/** 收藏钮无障碍名随状态切换(WinUI AutomationProperties.Name 语义)。 */
const favoriteAriaLabel = computed(() =>
  `${favorite.value ? '取消收藏' : '收藏'} ${props.name}`,
)
</script>

<template>
  <div
    v-bind="$attrs"
    class="wui-rating-recipe"
    :class="{ 'wui-rating-recipe--disabled': disabled }"
    role="group"
    :aria-label="name"
    :aria-disabled="disabled || undefined"
  >
    <!-- 媒体区:img / 占位色块;收藏钮悬浮右上角(image 具名插槽可整体替换) -->
    <div class="wui-rating-recipe__media">
      <slot name="image">
        <img
          v-if="showImage"
          class="wui-rating-recipe__img"
          :src="image"
          :alt="imageAlt"
          @error="onImageError"
        />
        <div v-else class="wui-rating-recipe__tile" :style="{ background: tileColor }" aria-hidden="true">
          <span class="wui-rating-recipe__glyph">{{ glyph }}</span>
        </div>
      </slot>
      <WuiToggleButton
        class="wui-rating-recipe__favorite"
        :checked="favorite"
        :disabled="disabled"
        :aria-label="favoriteAriaLabel"
        @update:checked="onCheckedChange"
      >
        <FontIcon :glyph="favorite ? '\uEB52' : '\uEB51'" :font-size="14" />
      </WuiToggleButton>
    </div>

    <!-- 内容区:名称(TitleTextBlockStyle 语义)+ 食材(BodyTextBlockStyle)+ 评分条 -->
    <div class="wui-rating-recipe__body">
      <div class="wui-rating-recipe__name">{{ name }}</div>
      <p v-if="ingredients" class="wui-rating-recipe__ingredients">{{ ingredients }}</p>
      <WuiRatingControl
        v-model:value="value"
        class="wui-rating-recipe__rating"
        :caption="caption"
        :max-rating="maxRating"
        :is-read-only="isReadOnly"
        :disabled="disabled"
        :aria-label="`${name} 评分`"
        @value-changed="onValueChanged"
      />
      <!-- 默认插槽:卡片底部扩展点(徽标、标签等自定义内容) -->
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
/* ======================================================================
 * 卡片容器:CardBackgroundFillColorDefault + CardStrokeColorDefault 1px 边。
 * theme.css 无卡片族 token,按源 Common_themeresources_any.xaml 值注入组件级
 * 默认值层(调用方可用同名变量覆盖)。
 * 字节序换算:源 XAML Color 为 AARRGGBB,CSS 8 位 hex 为 RRGGBBAA,写入前逐值
 * 翻转(RGB 段在前、alpha 段在后;fix round 1 修正——此前 4 个白色系填充被原样
 * 照抄成 AARRGGBB,在深色主题呈不透明亮青):
 *   CardBackgroundFillColorDefault(Light)  = AARRGGBB B3FFFFFF → RRGGBBAA #FFFFFFB3
 *   CardBackgroundFillColorSecondary(Light)= AARRGGBB 80F6F6F6 → RRGGBBAA #F6F6F680(hover 态)
 *   CardStrokeColorDefault(Light)          = AARRGGBB 0F000000 → RRGGBBAA #0000000F
 *     (黑色描边 RGB=000000:RGB 段与 alpha 段互换后恰为 000000+0F,形式不变,
 *      勿反向"修正"。)
 * 圆角取 --wui-hyperlink-focus-rect-corner-radius(项目对 ControlCornerRadius
 * 的既有近似,见 Button/ToggleButton 同款处理)。
 * ====================================================================== */
.wui-rating-recipe {
  --wui-rating-recipe-card-background: #ffffffb3; /* CardBackgroundFillColorDefault(Light) = AARRGGBB B3FFFFFF */
  --wui-rating-recipe-card-background-hover: #f6f6f680; /* CardBackgroundFillColorSecondary(Light) = AARRGGBB 80F6F6F6 */
  --wui-rating-recipe-card-stroke: #0000000f; /* CardStrokeColorDefault(Light) = AARRGGBB 0F000000(RGB=黑,翻转后形式不变) */

  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 260px;
  overflow: hidden;
  color: var(--wui-application-foreground-theme);
  background: var(--wui-rating-recipe-card-background);
  border: 1px solid var(--wui-rating-recipe-card-stroke);
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
  transition: background var(--wui-duration-fast, 167ms) var(--wui-easing-standard, ease);
}

/* hover 拾升(禁用态不响应);对应卡片类控件的 Subtle 悬浮反馈 */
.wui-rating-recipe:not(.wui-rating-recipe--disabled):hover {
  background: var(--wui-rating-recipe-card-background-hover);
}

/* —— 深色主题(Default 字典),字节序换算同上:——
 *   CardBackgroundFillColorDefault(Dark)   = AARRGGBB 0DFFFFFF → RRGGBBAA #FFFFFF0D
 *   CardBackgroundFillColorSecondary(Dark) = AARRGGBB 08FFFFFF → RRGGBBAA #FFFFFF08
 *   CardStrokeColorDefault(Dark)           = AARRGGBB 19000000 → RRGGBBAA #00000019(RGB=黑,翻转后形式不变)
 */
html[data-theme='dark'] .wui-rating-recipe {
  --wui-rating-recipe-card-background: #ffffff0d; /* CardBackgroundFillColorDefault(Dark) = AARRGGBB 0DFFFFFF */
  --wui-rating-recipe-card-background-hover: #ffffff08; /* CardBackgroundFillColorSecondary(Dark) = AARRGGBB 08FFFFFF */
  --wui-rating-recipe-card-stroke: #00000019; /* CardStrokeColorDefault(Dark) = AARRGGBB 19000000(RGB=黑,翻转后形式不变) */
}

/* —— 媒体区:固定高 130px,收藏钮悬浮右上 —— */
.wui-rating-recipe__media {
  position: relative;
  height: 130px;
  flex: none;
}

.wui-rating-recipe__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 图片属内容数据:色块回落色同样数据驱动,这里只负责裁切布局 */
}

/* 占位色块:官方 RecipeTemplate 的数据色块(Background={x:Bind Color}),字形居中 */
.wui-rating-recipe__tile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.wui-rating-recipe__glyph {
  font-size: 44px;
  line-height: 1;
}

/* 收藏钮:悬浮于媒体区右上(圆角略收小以贴合卡片内角) */
.wui-rating-recipe__favorite {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px;
  border-radius: var(--wui-hyperlink-focus-rect-corner-radius, 4px);
}

/* —— 内容区:16px 内边距,行距 8 —— */
.wui-rating-recipe__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 16px;
}

/* 名称:TitleTextBlockStyle(20px / SemiBold)语义 */
.wui-rating-recipe__name {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--wui-application-foreground-theme);
}

/* 食材:BodyTextBlockStyle(14px)+ 次要前景,最多两行截断 */
.wui-rating-recipe__ingredients {
  margin: 0;
  font-size: var(--wui-control-content-theme-font-size, 14px);
  line-height: 1.5;
  color: var(--wui-application-secondary-foreground-theme);
}

.wui-rating-recipe__rating {
  margin-top: 2px;
}
</style>
