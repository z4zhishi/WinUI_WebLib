<script setup lang="ts">
// PivotItem —— WinUI PivotItem 的 Web 复刻:Pivot 的单个分页(标题 + 内容)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml L12546-12578(Style/ControlTemplate):
//   背景 PivotItemBackground(透明)、Margin = PivotItemMargin(12,0,12,0)、Padding 0,
//   ContentPresenter 水平 / 垂直拉伸;Pivot/Right/Left 三个位置视觉态均无样式差异(纯位置标记)。
// 组合方式:声明式放在 <WuiPivot> 默认 slot 下,Pivot 负责标题行渲染与选中显隐;
//   本组件单独渲染时即为「标题数据 + 内容框」(标题由 Pivot 摘要渲染,自身模板只承载内容)。
// 与 WinUI 一致:PivotItem 不销毁、非选中仅收起(源 UpdateItemVisibility 的 Visibility 切换语义),
//   由宿主 Pivot 以 v-show 实现,内容组件状态在切换间保留。
defineProps<{
  /** 页签标题(WinUI PivotItem Header 的 string 用法;HeaderTemplate 见 wiki 差异节)。 */
  title?: string
}>()

defineOptions({ inheritAttrs: false })
</script>

<template>
  <div v-bind="$attrs" class="wui-pivot-item">
    <slot />
  </div>
</template>

<style scoped>
/*
 * 结构对照 generic.xaml PivotItem ControlTemplate(L12555):
 * Grid(Background)> ContentPresenter(Margin = Padding = 0,双向拉伸)。
 * 尺寸:Margin = PivotItemMargin(12,0,12,0);颜色一律 --wui-pivot-* token。
 */
.wui-pivot-item {
  display: block;
  min-width: 0;
  min-height: 0;
  margin: 0 12px; /* PivotItemMargin(12,0,12,0) */
  background: var(--wui-pivot-item-background); /* PivotItemBackground(透明) */
}
</style>
