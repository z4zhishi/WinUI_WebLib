# ToggleSwitch

> 在线示例:[/#/toggleswitch](/#/toggleswitch)

## 概述

使用 ToggleSwitch 向用户呈现恰好两个互斥的选项(如开 / 关),用户做出选择后立即生效。开关应只配一个标签(Header)。

组件按 WinUI 3 的 generic.xaml 默认模板复刻:44x20 胶囊轨道、20x20 滑块、On 态滑块位移 24px、轨道与槽内容之间 12px 间距、控件最小宽度 154px;颜色全部取自 `src/styles/theme.css` 的 `--wui-toggle-switch-*` token,滑块位移动画取自 `src/styles/animations.css` 的时长 / 缓动 token。

官方文档:

- [ToggleSwitch - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.toggleswitch)
- [Guidelines for toggle switches](https://learn.microsoft.com/windows/apps/design/controls/toggles)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `header` | `string` | `''` | 开关上方的标头文本(WinUI `Header`);为空时不渲染。 |
| `onContent` | `string` | `'On'` | 开启时显示的槽内容(WinUI `OnContent`);传空串隐藏。 |
| `offContent` | `string` | `'Off'` | 关闭时显示的槽内容(WinUI `OffContent`);传空串隐藏。 |
| `isOn` | `boolean` | `false` | 开关状态,`v-model:is-on` 双向绑定(WinUI `IsOn`)。 |
| `disabled` | `boolean` | `false` | 禁用开关:不可点击 / 拖拽 / 聚焦,呈禁用配色(WinUI `IsEnabled=false`)。 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `toggled` | 无 | 用户通过点击整行、键盘(空格 / 回车)或拖拽提交改变开关状态时触发;父组件程序化修改 `isOn` 不触发。 |
| `update:isOn` | `(value: boolean)` | `v-model:is-on` 的更新事件,随状态改变触发。 |

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import WuiToggleSwitch from '@/components/ToggleSwitch.vue'

const isOn = ref(false)

function onToggled(): void {
  console.log('toggled, isOn =', isOn.value)
}
</script>

<template>
  <!-- 简单形态:默认 On / Off 槽文案 -->
  <WuiToggleSwitch v-model:is-on="isOn" @toggled="onToggled" />

  <!-- 自定义标头与槽文案 -->
  <WuiToggleSwitch
    v-model:is-on="isOn"
    header="Toggle work"
    on-content="Working"
    off-content="Do work"
    @toggled="onToggled"
  />
</template>
```

交互说明:

- 点击开关整行(含标头与槽内容区域)即可切换;
- 键盘可达:聚焦后按空格或回车切换,焦点框走项目惯例的强调色描边;
- 拖拽(WinUI `ManipulationMode=TranslateX` 的等价实现):按住后水平拖动滑块,越过中点松手提交,未过中点回弹;拖拽提交后的一次合成 click 会被吞掉,不会出现"拖拽 + 点击"双切换或拖一半卡死;
- 无障碍:交互元素为 `role="switch"` + `aria-checked`,槽文案对读屏隐藏(`aria-hidden`,等价 WinUI 模板的 `AccessibilityView=Raw`);可访问名按 `header`(可见标签)→ 调用方传入的 `aria-label` → 回退 `Toggle switch` 取值,保证无 header 时仍有稳定可读名;调用方经 `$attrs` 传入的 `aria-*` 会路由到内部交互按钮(其余 `class` / `style` 等仍在根元素透传)。

## 与 WinUI 的差异说明

| 项 | WinUI(generic.xaml) | 本组件 | 说明 |
| --- | --- | --- | --- |
| 滑块位移动画 | `RepositionThemeAnimation`(平台内置时长 / 曲线,模板未显式给出) | CSS transition:`--wui-duration-normal`(240ms)+ `--wui-easing-standard` | 源无显式 KeySpline 可采样,取 animations.css 的常规档 + 标准缓动近似。 |
| 状态配色切换 | `DiscreteObjectKeyFrame KeyTime=0` 即时切换 | CSS 即时切换(无过渡) | 保持源行为:只有滑块位移有动画,颜色无淡入淡出。 |
| 轨道描边 | `Rectangle StrokeThickness=2` 居中描边 | CSS `border: 2px solid` + `border-box` | 数值一致;绘制模型差异约 1px 内,视觉不可辨。 |
| On 态描边厚度 | `ToggleSwitchOnStrokeThickness = 0` | `border-color: transparent`(保留 2px 盒模型) | 视觉等价:On 态为纯强调色填充胶囊。 |
| 强调色 | `SystemControlHighlightAccentBrush` 等 | `--wui-toggle-switch-fill-on` 等token | token 链至 `--wui-system-accent-color`;该系统色钩子尚未在应用层定义,组件根局部回退到 `--wui-hyperlink-foreground-theme`(浅 #4f1acb / 深 #9c72ff),钩子定义后自动接管。 |
| 焦点视觉 | 系统焦点框(2px 黑外 + 1px 白内,`FocusVisualMargin=-7,-3`) | 2px 强调色 outline(项目统一惯例) | 与库内其他控件一致,差异记录于此。 |
| 字体 | `ContentControlThemeFontFamily`(`XamlAutoFontFamily` 占位) | `font-family: inherit` | 浏览器将未知字体名回退为默认字体,`inherit` 直接继承页面字体,观感一致。 |
| `Toggled` 触发 | `IsOn` 任何来源的变化都触发 | 仅用户交互触发 | 程序化改 `v-model` 不触发,避免父组件更新造成的事件回环。 |

---

演示页源码:[demo/pages/ToggleSwitchPage.vue](../../demo/pages/ToggleSwitchPage.vue)
