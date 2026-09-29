<script setup lang="ts">
// BitmapIcon —— WinUI BitmapIcon 的 Web 复刻:以位图(位图/SVG 均可)作为内容的轻量图标。
// 对照 CK/WinUI-Reference 与官方文档:
//   - ShowAsMonochrome 缺省 true:多色图会被前景色「单色化」;WinUI 原生由合成器压色,Web 侧以
//     CSS mask(遮罩取图 alpha 形状 + background 取色)等价实现,取色 foreground 或 currentColor;
//   - 默认无固定尺寸(取图片自然尺寸);本组件为预测性行为收敛为 1em × 1em 盒(font-size 缩放,
//     style width/height 可覆盖),差异记录于 wiki;
//   - 图标为装饰性内容:默认 aria-hidden="true"(可经 attrs 覆盖),控件名由宿主控件承载。
// 无视觉状态、无业务事件、无内部状态;src 变更即重渲染,可被其他控件内嵌。
import { computed, type CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 图片地址(必填):位图或 SVG;本地资源 / 网络 URL / data URL 均可(组件本身不加载任何远程资源)。 */
    src: string
    /** 是否以前景色单色化渲染(WinUI ShowAsMonochrome);缺省 true,与官方一致。 */
    showAsMonochrome?: boolean
    /** 单色化取色,任意 CSS 颜色/变量;缺省继承 currentColor。 */
    foreground?: string
  }>(),
  {
    showAsMonochrome: true,
  },
)

defineOptions({ inheritAttrs: false })

// 单色化:遮罩形状取图片不透明区域,颜色由 background 提供(color 模式则直接 <img>)
const maskStyle = computed<CSSProperties>(() => ({
  maskImage: `url("${props.src}")`,
  WebkitMaskImage: `url("${props.src}")`,
  backgroundColor: props.foreground ?? 'currentColor',
}))
</script>

<template>
  <!-- 图标为装饰性内容:默认 aria-hidden,写于 v-bind="$attrs" 之前以便调用方覆盖 -->
  <span aria-hidden="true" v-bind="$attrs" class="wui-bitmapicon">
    <!-- 单色化(CSS mask):形状来自图片 alpha,颜色来自 foreground/currentColor -->
    <span v-if="showAsMonochrome" class="wui-bitmapicon__mask" :style="maskStyle"></span>
    <!-- 多色:原生 <img> 直出 -->
    <img v-else class="wui-bitmapicon__img" :src="src" alt="" draggable="false" />
  </span>
</template>

<style scoped>
.wui-bitmapicon {
  display: inline-flex;
  /* 默认 1em × 1em:随 font-size 缩放;调用方可经 style width/height 覆盖(宽高比由 contain 维持) */
  width: 1em;
  height: 1em;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.wui-bitmapicon__mask {
  display: block;
  width: 100%;
  height: 100%;
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
}

.wui-bitmapicon__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* 隐藏破损图片的边框残留(alt 为空时浏览器不显示占位文字) */
  color: transparent;
}
</style>
