# ColorPicker

> 在线示例:[/#/colorpicker](/#/colorpicker) · 演示页源码:[demo/pages/ColorPickerPage.vue](../../demo/pages/ColorPickerPage.vue)

## 概述

ColorPicker(颜色选取器)让用户从可选颜色谱区中选取颜色:二维谱区(色相 × 饱和度等组合)拖拽选点,第三维度(色相/饱和度/亮度)滑杆、RGB/HSV 通道数字输入、HEX 文本与 alpha 通道联动更新;预览条可对比新旧两色。适合文档编辑器文字/形状着色、主题自定义等完整取色场景;若只需从短列表中选色,请改用 ComboBox 或下拉按钮(Microsoft 设计指南建议)。

组件按 WinUI `ColorPicker.xaml`(DefaultColorPickerStyle 模板)与 `ColorPicker.cpp` / `ColorSpectrum.cpp` 行为复刻:谱区由 canvas 逐像素按源的 FillPixelForBox / FillPixelForRing 公式绘制,第三维度按「多表面 + 透明度叠合」合成(与源的位图优化等价);文本输入保持源语义(输入合法即生效、非法仅标记、失焦回退上次有效值);棋盘透明底取 `SystemListLowColor` 对应 token(`--wui-system-control-background-list-low`)。

官方文档:

- [ColorPicker - API(WinUI)](https://learn.microsoft.com/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.colorpicker)
- [Color picker 设计指南](https://learn.microsoft.com/windows/apps/design/controls/color-picker)

## 属性

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `color` | `string`(`v-model:color`) | `'#FFFFFF'` | 当前颜色,双向绑定;接受 6 位 `#RRGGBB` 或 8 位 `#AARRGGBB`(内部始终保存 rgb + alpha 浮点值;谱区/滑杆/文本输入实时更新) |
| `previousColor` | `string \| null` | `null` | 上一色(WinUI `PreviousColor`);设置后预览条上半为新色、下半为旧色;谱区隐藏时预览条整宽 |
| `colorSpectrumShape` | `'Box' \| 'Ring'` | `'Box'` | 谱区形状:方盘 / 圆环。圆环的角向/径向方向与圆心取值随 `colorSpectrumComponents` 组合而异(按源 `FillPixelForRing` 反转块 + `UpdateEllipse` 实现,详见下方「Ring 形状布局与 180° 分歧」) |
| `colorSpectrumComponents` | `'HueSaturation' \| 'HueValue' \| 'ValueHue' \| 'ValueSaturation' \| 'SaturationHue' \| 'SaturationValue'` | `'HueSaturation'` | 谱区两轴与第三维度的通道组合(WinUI `ColorSpectrumComponents`);第三维度滑杆通道随其自动切换 |
| `orientation` | `'Vertical' \| 'Horizontal'` | `'Vertical'` | Vertical 上下堆叠;Horizontal 谱区居左、滑杆竖向、文本输入区恒显(更多按钮隐藏,与源 Horizontal 视觉状态一致) |
| `minHue` / `maxHue` | `number` | `0` / `359` | 色相范围(0-359;越界值被钳制,源为抛 `hresult_invalid_argument`,见差异 2) |
| `minSaturation` / `maxSaturation` | `number` | `0` / `100` | 饱和度范围(0-100) |
| `minValue` / `maxValue` | `number` | `0` / `100` | 亮度范围(0-100) |
| `isAlphaEnabled` | `boolean` | `false` | 启用 alpha 通道(WinUI `IsAlphaEnabled`):显示 alpha 滑杆/输入,HEX 输入变 8 位 `#AARRGGBB`;关闭时 HEX 提交会把 alpha 重置为 1(与源 `HexToRgb` 路径一致) |
| `isColorSpectrumVisible` | `boolean` | `true` | 显示谱区;关闭后预览条变为整宽 44px 横条(源 `ColorSpectrumCollapsed` 状态) |
| `isColorPreviewVisible` | `boolean` | `true` | 显示新旧色预览条 |
| `isColorSliderVisible` | `boolean` | `true` | 显示第三维度滑杆(通道随 `colorSpectrumComponents`:色相 / 饱和度 / 亮度) |
| `isAlphaSliderVisible` | `boolean` | `true` | 显示 alpha 滑杆(需 `isAlphaEnabled`) |
| `isMoreButtonVisible` | `boolean` | `false` | 显示「更多 / 收起」开合按钮(WinUI `IsMoreButtonVisible`;仅 Vertical 生效,Horizontal 下文本区恒显) |
| `isColorChannelTextInputVisible` | `boolean` | `true` | 显示 RGB/HSV 表示切换下拉与通道数字输入 |
| `isAlphaTextInputVisible` | `boolean` | `true` | 显示不透明度百分比输入(需 `isAlphaEnabled`) |
| `isHexInputVisible` | `boolean` | `true` | 显示 HEX 输入(自动补 `#`;MaxLength 随 alpha 7/9) |
| `disabled` | `boolean` | `false` | 禁用交互(Web 侧对应 WinUI `Control.IsEnabled`) |

## 事件

| 事件 | 参数 | 触发时机 |
| --- | --- | --- |
| `colorChanged` | `{ oldColor: string; newColor: string }` | 颜色 ARGB 任一分量变化时触发;谱区拖拽、滑杆拖动、文本输入与程序化赋值均触发(与源 `OnColorChanged` 一致);hex 串统一 8 位 `#AARRGGBB` |
| `update:color` | `(color: string) => void` | `v-model:color` 双向绑定事件 |

模板中监听写法:`@color-changed="onColorChanged"`。

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ColorPicker from '@/components/ColorPicker.vue'

const color = ref('#0078D4')
const previousColor = ref<string | null>(null)

function onColorChanged(e: { oldColor: string; newColor: string }): void {
  console.log(`颜色从 ${e.oldColor} 变为 ${e.newColor}`)
}
</script>

<template>
  <ColorPicker v-model:color="color" @color-changed="onColorChanged" />

  <!-- alpha 通道 + 新旧色对比 + 竖向色相条(Horizontal + SaturationValue) -->
  <ColorPicker
    v-model:color="color"
    :previous-color="previousColor"
    is-alpha-enabled
    orientation="Horizontal"
    color-spectrum-components="SaturationValue"
  />

  <!-- 圆环谱区 -->
  <ColorPicker v-model:color="color" color-spectrum-shape="Ring" />
</template>
```

## Ring 形状布局与 180° 分歧

圆环谱区的两个轴方向与「圆心取最大值还是最小值」随 `colorSpectrumComponents` 组合而异,按源 `ColorSpectrum.cpp` 的 `FillPixelForRing` + 末段反转块(L1350-1374)+ 选点椭圆定位 `UpdateEllipse`(L683-759)三方互证实现:

| 组合 | 角向(3 点钟起点,顺时针为正) | 径向(圆心 → 圆周) | 第三维度 |
| --- | --- | --- | --- |
| HueSaturation | 色相不反转:3 点钟 = 最小色相,顺时针递增 | 饱和度反转:圆心 = 最小、圆周 = 最大 | 亮度(恒以 v=1 绘制) |
| HueValue | 色相不反转(同上) | 亮度反转:圆心 = 最小、圆周 = 最大 | 饱和度(双表面叠合) |
| ValueHue | 亮度反转:3 点钟 = 最大,顺时针递减 | 色相不反转:圆心 = hMax、圆周 = hMin | 饱和度(双表面叠合) |
| SaturationHue | 饱和度反转:3 点钟 = 最大,顺时针递减 | 色相不反转:圆心 = hMax、圆周 = hMin | 亮度(恒以 v=1 绘制) |
| ValueSaturation | 亮度反转:3 点钟 = 最大,顺时针递减 | 饱和度不反转:圆心 = 最大、圆周 = 最小 | 色相(六分色表面插值) |
| SaturationValue | 饱和度不反转:3 点钟 = 最小,顺时针递增 | 亮度反转:圆心 = 最小、圆周 = 最大 | 色相(六分色表面插值) |

选点椭圆与像素图使用同一套轴定义(径向离心率 d/R = 1 − 轴分数),保证「椭圆所在点即所选颜色」;默认 `#FFFFFF`(饱和度 0)在默认组合(HueSaturation)下椭圆落在**圆心**。

**180° 分歧记录**:CK 仓库的规格截图 `specs/ColorPicker/images/ColorPicker_VerticalMode.png` 与源码公式恰好相差 180° 旋转(截图为 9 点钟 = 最小色相、逆时针递增,源码为 3 点钟 = 最小色相、顺时针递增;径向亦互为内外)。经核对该目录为 2018 年设计稿 mockup(同目录 `HorizontalMode.png` 的方盘谱区与源码三方一致),本迁移以源码为唯一事实源,按源码公式实现(QA 复核确认该裁决对色相角向组合成立;其余组合的反转归属以源反转块逐组合核实,其中 SaturationValue 的角向饱和度因反转块作用于亮度而保持不反转)。


## 交互行为

- **谱区选点**:在谱区按下并拖动即实时更新颜色(指针捕获,移出控件仍持续);按住期间选点圆放大为 48px(源 `PressedLarge` 状态)。选点圆描边按展示色相对亮度自动取黑/白(源 `SelectionEllipseShouldBeLight` 的相对亮度公式)。
- **谱区键盘**:聚焦后 `←`/`→` 调横向主轴通道、`↑`/`↓` 调纵向副轴通道:小步 ±1,越过边界时恰在边界上则回绕到另一端(源 `IncrementColorChannel` 的 `shouldWrap` 语义);按住 `Ctrl` 为大步 = 跳到上/下一个**命名颜色**区间的中点(源 `FindNextNamedColor`,Web 用 CSS 命名色最近邻匹配近似,见差异 9);方向语义与源一致(色相左/上为减,饱和度/亮度右/下为减)。
- **第三维度滑杆**:通道随 `colorSpectrumComponents` 切换(源 `SetThirdDimensionSliderChannel`);轨道渐变实时反映当前颜色(饱和度/亮度为两停渐变,色相为六分色渐变)。
- **文本输入**:RGB / HSV 通道输入「输入即生效」(源 `TextChanging`);非法输入仅亮错误描边,失焦回退上次有效文本;HEX 未输 `#` 自动补全,alpha 输入自动补 `%`(均为源行为)。
- **RGB/HSV 切换**:下拉切换通道面板(源 `ColorRepresentationComboBox`),两种表示与谱区/滑杆/HEX 全联动。

## 与 WinUI 的差异

1. **`color` 的 Web 形态**:WinUI `Color` 是 `{A,R,G,B}` 结构体;Web 版用 hex 字符串承载(`v-model:color`),接受 6/8 位、`#` 可省略,内部保存 rgb + alpha 浮点值。`colorChanged` 参数为 8 位 `#AARRGGBB` 串(WinUI 传 `Color` 结构体)。
2. **越界范围处理**:源对非法 `MinHue` 等抛 `hresult_invalid_argument`;Web 版钳制到合法区间(0-359 / 0-100),不抛错。
3. **谱区渲染载体**:源用多张 WriteableBitmap + 透明度叠合;Web 版用 canvas 逐像素按同一公式绘制(表面合成等价),最高 512px 表面分辨率 + devicePixelRatio(上限 2),极端放大时边缘可能比源位图略软。
4. **控件内部文案**:通道标签与自动化名称使用中文(红/绿/蓝/色相/饱和度/亮度/不透明度);WinUI 为本地化资源(英文资源为 Red/Green/Blue/Hue/Saturation/Value/Opacity、More/Less)。
5. **无 token 的源尺寸常量**(组件内按源值实现):`ControlCornerRadius=4`(谱区/预览条/输入框圆角)、`ColorPickerSliderCornerRadius=6`、滑杆轨道高 12、拇指外圈 20 + 内圈 10、预览条宽 44、谱区 256-336px、根容器 MinWidth 312 / MaxWidth 392、输入框 120 / HEX 132、通道行距 12。
6. **颜色映射 token**:alpha 滑杆/预览条棋盘底取 `SystemListLowColor` → `--wui-system-control-background-list-low`;`ColorPickerSliderThumbBackground`(TextFillColorPrimaryBrush)→ `--wui-text-fill-color-primary`;PointerOver(SystemControlHighlightChromeAltLowBrush)→ `--wui-system-control-highlight-chrome-alt-low`;Disabled(ControlStrongFillColorDisabledBrush)无同名 token,取 `--wui-system-control-disabled-base-low`;预览条描边(`ColorPickerBorderBrush` = ControlStrokeColorDefaultBrush)仍为 legacy `--wui-text-control-border`(PL8 §6-3 登记待后续批次重定向)。
7. **竖向滑杆实现**:Horizontal 方向下第三维度/alpha 滑杆用原生 range 的 `writing-mode: vertical-lr; direction: rtl` 竖排(Chromium/Firefox/Safari 现代版本支持);旧内核回退为水平观感。
8. **RGB ↔ HSV 转换精度**:转换纯函数在 `src/utils/colorConvert.ts`,严格对照源 `ColorConversion.cpp`(chroma=0 时 h=0、字节化 round(×255) 等),可用 Node 直接单测;显示值统一四舍五入(与源 `round` 一致)。
9. **Ctrl 大步的命名色跳转**:源 `IncrementColorChannel` 的大步分支走 `FindNextNamedColor`(沿通道步进到上/下一个本地化**颜色显示名**区间中点;源码中的 ±30/±10 常量仅存在于过时注释与永假三目,不生效)。Web 版按源算法逐行移植,「颜色显示名」用 CSS 命名色表(147 个关键字)最近邻 RGB 匹配近似 WinUI 的本地化命名表——跳转算法(方向、步长、回绕、中点与栅格对齐)与源一致,但个别边界落点可能因命名表集合不同而相差一步;「零头对齐」循环的浮点漂移与源的双精度路径同级。
10. **文本输入字段(PL8 重定向)**:`HexTextBox` / `RedTextBox` 等通道输入框在源 `ColorPicker.xaml`(L380 起 / L419)为**默认样式 `TextBox`**,故本实现按 TextControl 权威矩阵重定向:Normal Background `ControlFillColorDefaultBrush`、Normal/PointerOver 边框 `TextControlElevationBorderBrush`(渐变)、Focused Background `ControlFillColorInputActiveBrush` + 强调色实色边框(厚度 1,1,1,2)、Disabled `ControlFillColorDisabledBrush` / `ControlStrokeColorDefaultBrush` / `TemporaryTextFillColorDisabled`,内边距 `TextControlThemePadding` = 10,5,6,6。字段是 `<input>`(替换元素,无 `::before`/`::after`),故渐变描边用「双背景层」(padding-box 铺底色 + border-box 铺渐变)复刻,而不用 mask 环;`border-radius` 4px 对两层同时裁切。

## 在 WinUI 中的典型场景(对照官方示例)

- 完整取色器:`<ColorPicker />` + 各 `Is*Visible` 开关组合(官方示例的全部参数均可在演示页选项中实时调节)
- 颜色应用到形状:把 `color` 绑定到 Rectangle 填充(演示页示例一的预览矩形)
- 简单场景可换用 `ColorPickerButton` / 下拉中的 ColorPicker(WinUI 未内置 Button 变体,Web 版暂不提供)
- Fluent 画刷族总览:[_brushes.md](./_brushes.md)(命名族对照 / 权威层级 / 画刷→token 映射)
