<script setup lang="ts">
// WuiMenuFlyoutSeparator —— WinUI MenuFlyoutSeparator 的 Web 复刻(菜单内的分组分隔线)。
// 视觉规格:CK/WinUI-Reference/dxaml/xcp/dxaml/themes/generic.xaml
//   <Style TargetType="MenuFlyoutSeparator">(L18387 起):模板为
//   Rectangle Fill=Background / Margin=MenuFlyoutSeparatorThemePadding="12,4,12,4" /
//   Height=MenuFlyoutSeparatorThemeHeight=1;填充色 token --wui-menu-flyout-separator-theme。
// 无交互、无视觉状态;分隔线不参与菜单的键盘导航(模板不携带 data-wui-menu-item 标记)。
// 语义:role="separator" —— WAI-ARIA 无 "menuitemseparator" 角色,菜单场景的标准表达即
//   separator(WinUI 侧 MenuFlyoutSeparator 自动化.peer 的 ControlType 也是 Separator)。
defineOptions({ name: 'WuiMenuFlyoutSeparator', inheritAttrs: false })
</script>

<template>
  <div class="wui-menu-flyout-separator" role="separator" v-bind="$attrs"></div>
</template>

<style scoped>
/* Margin="12,4,12,4"(XAML Thickness 左,上,右,下)+ Height=1。
   宽度取 auto(块级自动收缩):不得写 width:100%,否则叠加左右 margin 会向右溢出层缘。 */
.wui-menu-flyout-separator {
  box-sizing: border-box;
  width: auto;
  height: 1px;
  margin: 4px 12px;
  background: var(--wui-menu-flyout-separator-theme);
}
</style>
