<script setup lang="ts">
// WuiMenuFlyoutSeparator —— WinUI MenuFlyoutSeparator 的 Web 复刻(菜单内的分组分隔线)。
// 视觉规格:CK/WinUI-Reference/controls/dev/CommonStyles/MenuFlyout_themeresources.xaml
//   <Style TargetType="MenuFlyoutSeparator">(L5/L171):填充
//   MenuFlyoutSeparatorBackground = DividerStrokeColorDefaultBrush;模板 Rectangle Fill=Background /
//   Height=MenuFlyoutSeparatorHeight=1(L254)。
//   本组件几何(Margin 4px 12px / Height 1px)保持既有,不在本批范围;填充色重定向为
//   Fluent 权威键 --wui-divider-stroke-color-default。
// 无交互、无视觉状态;分隔线不参与菜单的键盘导航(模板不携带 data-wui-menu-item 标记)。
// 语义:role="separator" —— WAI-ARIA 无 "menuitemseparator" 角色,菜单场景的标准表达即
//   separator(WinUI 侧 MenuFlyoutSeparator 自动化.peer 的 ControlType 也是 Separator)。
defineOptions({ name: 'WuiMenuFlyoutSeparator', inheritAttrs: false })
</script>

<template>
  <div class="wui-menu-flyout-separator" role="separator" v-bind="$attrs"></div>
</template>

<style scoped>
/* MenuFlyoutSeparatorBackground = DividerStrokeColorDefaultBrush(controls/dev L5/L171)。
   几何保持既有:Margin 4px 12px + Height=1px(不得改动)。
   宽度取 auto(块级自动收缩):不得写 width:100%,否则叠加左右 margin 会向右溢出层缘。 */
.wui-menu-flyout-separator {
  box-sizing: border-box;
  width: auto;
  height: 1px;
  margin: 4px 12px;
  background: var(--wui-divider-stroke-color-default);
}
</style>
