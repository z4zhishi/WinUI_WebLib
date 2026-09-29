# PersonPicture

> 在线示例:[/#/personpicture](/#/personpicture) · 演示页源码:[demo/pages/PersonPicturePage.vue](../../demo/pages/PersonPicturePage.vue)

## 概述

PersonPicture 用于呈现人物/联系人的头像:优先显示**照片**(`profilePicture`),否则显示**缩写**(显式 `initials` 或由 `displayName` 推导),两者皆无时显示**联系人占位字形**;群组模式下显示 People 占位字形。右上角可叠加**徽标**(数字 / 字形 / 图片三种形态,右上角默认,对应源模板 `BadgeGrid`)。控件为**非交互展示控件**(WinUI 中 `IsTabStop=false`、无事件)。

官方文档:

- [PersonPicture - API](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.personpicture)
- [PersonPicture 设计准则(Guidelines)](https://learn.microsoft.com/windows/apps/design/controls/person-picture)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `displayName` | `string` | `''` | 显示名;按源 `InitialsGenerator` 推导缩写:拉丁名取首尾词首字母(JS)、单词取首字母(M)、末尾括号内容剔除(`Jane Doe (OSG)` → JD)、**中文取首字**(Web 有意扩展,见差异节) |
| `initials` | `string` | `''` | 显式缩写;**优先于** `displayName` 推导(源 `GetInitials` 优先级一致) |
| `profilePicture` | `string` | `''` | 头像图片 URL;加载成功进入照片态,加载中 / `onerror` 失败回落缩写或占位字形 |
| `badgeNumber` | `number` | `0` | 徽标数值:`> 0` 显示,`> 99` 截断为「99+」,`<= 0` 无徽标;优先级低于 `badgeImageSource` |
| `badgeGlyph` | `string` | `''` | 徽标字形(Segoe Fluent / MDL2 码点字符串,如 `'\uE765'`);优先级最低 |
| `badgeImageSource` | `string` | `''` | 徽标图片 URL(小图,圆形裁剪);优先级最高,对应源 `UpdateBadge` 的 image > number > glyph 顺序 |
| `badgeText` | `string` | `''` | 徽标无障碍文本覆盖;替换 `aria-label` 播报中的「n items」/「icon」 |
| `isGroup` | `boolean` | `false` | 群组模式:显示 People 占位字形(E716)并隐藏个人信息(照片 / 缩写) |
| `width` / `height` | `number \| string` | `96` | 尺寸;按源 `OnSizeChanged` 取 `min(宽, 高)` 保持圆形,缩写字号 = 边长 × 42%,徽标盘 = 边长 × 50% |
| `badgePosition` | `'top-right' \| 'top-left' \| 'bottom-right' \| 'bottom-left'` | `'top-right'` | 徽标方位(**Web 扩展属性**,WinUI 无此 API);缺省与源模板 `BadgeGrid` 的 Top/Right 对齐一致 |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| — | — | PersonPicture 为非交互展示控件(WinUI `IsTabStop=false`),无事件;无障碍语义经 `role="img"` + `aria-label` 播报 |

## 基础用法

```vue
<script setup lang="ts">
import WuiPersonPicture from '@/components/PersonPicture.vue'
</script>

<template>
  <!-- 照片来源 -->
  <WuiPersonPicture profile-picture="https://example.com/avatar.png" />

  <!-- 显示名 → 缩写(拉丁双词取首尾字母;中文取首字) -->
  <WuiPersonPicture display-name="Jane Doe" />
  <WuiPersonPicture display-name="王建国" />

  <!-- 显式缩写(优先于 displayName 推导) -->
  <WuiPersonPicture display-name="Luna Chen" initials="LC" />

  <!-- 数字徽标(> 99 自动截断 99+)+ 指定方位 -->
  <WuiPersonPicture display-name="James Bond" :badge-number="120" badge-position="top-right" />

  <!-- 字形徽标(Segoe Fluent / MDL2 码点) -->
  <WuiPersonPicture initials="SB" badge-glyph="\uE765" />

  <!-- 无任何来源 → 联系人占位字形;isGroup → 群组占位字形 -->
  <WuiPersonPicture />
  <WuiPersonPicture is-group />
</template>
```

## 无障碍

- 根节点为 `role="img"`,`aria-label` 按源 `UpdateAutomationName` 的「PersonName, BadgeInformation」格式拼接:姓名取 `isGroup`('Group')→ `displayName` → `initials` → 缺省 'Person';徽标信息为数字时播报「n items」、字形 / 图片时播报「icon」,`badgeText` 可覆盖;
- **装饰性用法**(如头像旁已有可见姓名文本)在组件上加 `aria-hidden="true"` 覆盖默认语义(attrs 优先于组件默认值);
- 内部 `<img>` 一律 `alt=""`:图片本身是装饰,语义由根节点的 `aria-label` 承载 —— **有名 vs 装饰**的区分即:未覆盖时控件总是有名(可被播报),需要降为装饰由调用方显式声明。

## 与 WinUI 的差异(视觉与行为对照)

视觉按 `CK/WinUI-Reference/controls/dev/PersonPicture/PersonPicture_themeresources.xaml`(主题资源)+ `PersonPicture.xaml`(DefaultPersonPictureStyle ControlTemplate)+ `PersonPicture.cpp` / `InitialsGenerator.cpp` 复刻。**注意:PersonPicture 的 ControlTemplate 不在 `dxaml/xcp/dxaml/themes/generic.xaml` 内**;该文件虽含 27 处 PersonPicture 资源定义,但均为 UWP 旧版取值(如填充 `SystemBaseMediumColor`、`StrokeThickness=0`、badge 透明度 0.8),与 WinUI 3 现行呈现不符——WinUI 3 的权威锚点是 `controls/dev/PersonPicture/` 下的资源与模板(含 dxaml 版没有的 `PersonPictureBadgeGridMargin`),本组件按 WinUI 3 取值。theme.css 未生成任何 `PersonPicture*` token。以下项无对应 token 或做了 Web 等价替换:

1. **主题画刷 token 缺失**,组件内置局部默认值层(浅/深两套,值逐项取自源 `PersonPicture_themeresources.xaml` → `CommonStyles/Common_themeresources_any.xaml`,调用方可用同名变量覆盖)。色值换算:源 XAML `Color` 为 **AARRGGBB** 字节序,CSS 8 位 hex 为 **RRGGBBAA**,下表 Light / Default 列为「源值(AARRGGBB)→ 换算后 CSS 值」——直接照搬会出现 alpha 与红通道错位(如 `#18000000` → 全透明、`#12FFFFFF` → 不透明青色):
   | 源资源 | 源引用 | Light(AARRGGBB → CSS) | Default(深色,AARRGGBB → CSS) | Web 实现 |
   | --- | --- | --- | --- | --- |
   | `PersonPictureForegroundThemeBrush` | `TextFillColorPrimaryBrush` | 源 `#E4000000`(89% 黑)→ CSS `#000000E4`;token 取 `#000000`(**近似**,较源略深) | `#FFFFFF` → `#ffffff`;token `#ffffff`(**恒等**) | `--wui-system-control-foreground-base-high`(theme.css 未生成 TextFillColorPrimary token;深色与源恒等、浅色为近似——源带 89% alpha,token 为不透明,取值仅在此一项有偏差) |
   | `PersonPictureEllipseFillThemeBrush` | `ControlAltFillColorQuarternary` | `#18000000` → `#00000018` | `#12FFFFFF` → `#FFFFFF12` | `--wui-person-picture-ellipse-fill`(组件级) |
   | `PersonPictureEllipseFillStrokeBrush` | `CardStrokeColorDefaultBrush` | `#0F000000` → `#0000000F` | `#19000000` → `#00000019` | `--wui-person-picture-ellipse-stroke`(组件级) |
   | `PersonPictureEllipseBadgeFillThemeBrush` | `AccentFillColorDefaultBrush` | — | — | `--wui-system-accent-color`(最近似 token,与 InfoBadge 一致) |
   | `PersonPictureEllipseBadgeForegroundThemeBrush` | `TextOnAccentFillColorPrimaryBrush` | — | — | `--wui-accent-button-foreground`(最近似 token,与 InfoBadge 一致) |
   | `PersonPictureEllipseBadgeStrokeThemeBrush` | `ControlFillColorTransparentBrush` | — | — | `transparent`(2px 描边保留,不可见) |
2. **缩写字号 / 徽标尺寸为公式而非资源**:源 `OnSizeChanged` 动态计算 —— 缩写字号 = `max(1, 边长 × 0.42)`、徽标盘 = 边长 × 0.5、徽标字号 = `max(1, 徽标盘 × 0.6)`;Web 按同公式以 inline style 注入,`width` / `height` prop 为准(经 CSS class 调整尺寸不会重算字号)。
3. **中文取首字(有意偏离源行为)**:源 `InitialsGenerator` 把 CJK 归为 Symbolic 并返回**空串** → 实机 WinUI 对中文显示联系人占位字形;本组件按任务需求改为**取首字**(「王建国」→ 王)。阿拉伯文等 Glyph 类脚本仍保持源行为(空串 → 占位字形)。
4. **照片态切换时机**:源 `ProfilePicture` 属性赋值即进入 Photo 态(图片未加载完前为空白椭圆);Web 侧在 `load` 成功后才切换,加载中 / `onerror` 失败回落缩写(任务要求的降级行为)。另源对加载失败仅静默取消(`E_INVALIDARG` 忽略),无自动回落语义。
5. **图片拉伸**:源照片 / 徽标图片用 `ImageBrush Stretch=UniformToFill`;Web 等价 `object-fit: cover` + 圆形裁剪(`border-radius: 50%` + `overflow: hidden`)。
6. **`badgePosition` 为 Web 扩展**:WinUI PersonPicture 无徽标方位 API(源模板固定 Top/Right + `Margin 0,-4,-4,0`,即右上角、向外偏移 4px);Web 侧增加属性支持四方位,缺省值与源对齐一致。徽标向外偏移 4px 同源。
7. **徽标数值分支的源 quirks 保留**:`BadgeNumber` 负值时源先进入 number 分支再回 `NoBadge`(即使 `BadgeGlyph` 非空也不回退),Web 按同分支顺序复刻;`badgeNumber = 0` 时字形徽标正常生效。
8. **高对比度主题未复刻**:源 `HighContrast` 字典映射系统色;Web 站点无高对比度模式,取浅/深两套。
9. **本地化字符串**:无障碍缺省文案('Person' / 'Group' / 'items' / 'icon')取英文资源默认值,中文本地化随阶段 8 全站 i18n 统一接入。
10. **无交互态**:源模板仅含 `CommonStates`(Photo / Initials / NoPhotoOrInitials / Group)与 `BadgeStates`,无 PointerOver / Pressed / Disabled / Focus 状态,组件相应不提供交互态;`IsTabStop=false` 对应不设 `tabindex`。

---

演示页源码:[demo/pages/PersonPicturePage.vue](../../demo/pages/PersonPicturePage.vue) · 组件源码:[src/components/PersonPicture.vue](../../src/components/PersonPicture.vue)
