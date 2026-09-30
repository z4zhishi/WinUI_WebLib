<script setup lang="ts">
// TabViewItem —— WinUI TabViewItem 的 Web 复刻:TabView 的单个标签页(页头数据 + 内容)。
// 视觉规格:CK/WinUI-Reference/controls/dev/TabView/TabView.xaml(TabViewItem Style/ControlTemplate,
//   generic.xaml 锚点 `TargetType="TabViewItem"` 段的控件源文件)+ TabView_themeresources.xaml:
//   - 页头由宿主 TabView 的标签条统一渲染(对照模板:TabContainer 内 IconBox / ContentPresenter /
//     CloseButton 三列,TabViewItemHeaderPadding 8,3,4,3、MinHeight 32、HeaderFontSize 12);
//   - 本组件自身模板只承载内容区(对照 TabContentPresenter 的直接呈现,无内边距/背景,WinUI 默认透明)。
// 行为规格(宿主协调,TabViewItem 提供数据与回调契约):
//   - header prop / #header slot(WinUI Header / HeaderTemplate 的等价);
//   - icon prop(图标字形,Segoe Fluent Icons,对照 IconSource 的 FontIconSource 用法);
//   - isClosable(WinUI IsClosable,默认 true):false 时宿主隐藏关闭按钮;
//   - closing 事件(WinUI TabViewItem.Closing 的 Web 简化):宿主发起关闭时以
//     `{ cancel: boolean; getDeferral(): { complete(): void } }` 参数触发 —— 处理器内置
//     cancel = true 可取消关闭;调用 getDeferral() 拿到 Deferral 并在异步逻辑结束后 complete(),
//     宿主等待全部 Deferral 后再决定是否提交(Deferral 简化实现,详见 wiki 差异节)。
// 组合方式:声明式放在 <WuiTabView> 默认 slot 下(支持响应式数组 v-for 动态增删);
//   内容非选中仅收起不销毁(WinUI ListView 容器复用下的保活语义,由宿主以 v-show 实现)。
defineProps<{
  /** 页头文本(WinUI TabViewItem Header 的 string 用法);#header slot 可覆盖。 */
  header?: string
  /** 图标字形(Segoe Fluent Icons 码点,如 '\uE713';WinUI IconSource 的简化)。 */
  icon?: string
  /** 是否可关闭(WinUI IsClosable):false 时关闭按钮隐藏、Ctrl+W 不作用于该页。 */
  isClosable?: boolean
}>()

// closing 为宿主协调的可取消事件:监听器经子 VNode props(onClosing)由宿主直接调用,
// 显式声明避免透传到根元素 DOM 属性。
/** closing 事件参数(WinUI TabViewTabClosingEventArgs 的 Web 简化)。 */
export interface TabViewTabClosingEventArgs {
  /** 处理器内置 true 取消本次关闭。 */
  cancel: boolean
  /** 取 Deferral:异步判定期间暂缓提交,逻辑结束后调用 complete()。 */
  getDeferral(): { complete(): void }
}

defineEmits<{ closing: [args: TabViewTabClosingEventArgs] }>()

defineOptions({ inheritAttrs: false })
</script>

<template>
  <div v-bind="$attrs" class="wui-tab-view-item">
    <slot />
  </div>
</template>

<style scoped>
/*
 * 结构对照 TabView.xaml TabViewItem ControlTemplate 的内容呈现(TabContentPresenter 直接呈现内容):
 * 背景透明、无内边距;页头(图标/标题/关闭按钮)由宿主 TabView 标签条渲染。
 */
.wui-tab-view-item {
  display: block;
  min-width: 0;
  min-height: 0;
  background: transparent; /* TabViewItemHeaderBackground 之外,内容区 WinUI 默认无背景 */
}
</style>
