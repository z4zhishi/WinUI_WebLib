# Geometry(几何)

在线示例:[/#/geometry](/#/geometry) · 演示页源码:[demo/pages/GeometryPage.vue](../../demo/pages/GeometryPage.vue)

## 概述

「Geometry」在 WinUI 里有两层含义:

1. **设计语言层面** —— Windows 11 几何体系:用统一的圆角/形状语言保证视觉连贯与结构感(官方 Gallery 的 Geometry 页讲的就是这套:三级圆角 `OverlayCornerRadius` 8px / `ControlCornerRadius` 4px / 直边相交 0px,按元素层级选档,经主题资源引用而非写死数值)。
2. **数据层面** —— `Geometry` 类家族:用**路径迷你语言**(move and draw commands)描述任意形状,是 [Path](Shape.md) 的 `Data`、[PathIcon](IconElement.md) 的 `Data` 等属性的数据基础。

本 wiki 以第 2 层为主:给出 XAML 几何标记的**逐指令语法对照表**、本库解析器([parseGeometry](../../src/utils/geometry.ts))的规范化行为与**限制**、以及与 Path / PathIcon 的分工。官方文档:

- [Move and draw commands syntax(UWP/WinUI)](https://learn.microsoft.com/windows/uwp/xaml-platform/move-and-draw-commands-syntax)
- [Geometry in Windows 11(设计准则)](https://learn.microsoft.com/windows/apps/design/signature-experiences/geometry)

本库没有单独的 `Geometry` 组件——几何标记由消费方控件直接解析渲染;工具层是两个纯函数模块:[src/utils/geometry.ts](../../src/utils/geometry.ts)(解析器)与 [src/utils/geometryBounds.ts](../../src/utils/geometryBounds.ts)(包围盒)。

## 语法对照表

XAML 几何标记与 SVG `path d` 同源:指令字母 + 数字参数,大写 = 绝对坐标、小写 = 相对偏移。

### 填充规则前缀(可选,必须最前)

| 前缀 | 填充规则 | 说明 |
| --- | --- | --- |
| `F0`(或缺省) | EvenOdd 奇偶 | 射线穿越奇数次才填充;XAML 缺省。注意与 SVG 缺省 Nonzero 不同 |
| `F1` | Nonzero 非零环绕 | 环绕计数不为零即填充 |

前缀可与首指令紧邻(`F1M16,12`);对自交图形(如五角星)两种规则观感不同,示例页可切换对照。

### 绘图指令

| 指令 | 名称 | 参数 | 说明 | 示例 → 规范化输出 |
| --- | --- | --- | --- | --- |
| `M` / `m` | 移动 | `x,y`(可多对) | 起笔/开启新子路径,不画线;**首对之后的点对按 `L`/`l` 处理**(隐式折线) | `M 4,28 28,4` → `M 4 28 L 28 4` |
| `L` / `l` | 直线 | `x,y`(可多对) | 当前点到目标点的线段;参数集可隐式重复 | `L 16,4 28,28` → `L 16 4 L 28 28` |
| `H` / `h` | 水平线 | `x`(1 个) | 水平画线到指定 x | `H 26` → `H 26` |
| `V` / `v` | 垂直线 | `y`(1 个) | 垂直画线到指定 y | `V 28` → `V 28` |
| `C` / `c` | 三次贝塞尔 | `c1 c2 end`(6 个) | 两个控制点;c1 定起点切线、c2 定终点切线 | `C 4,4 28,4 28,28` → `C 4 4 28 4 28 28` |
| `S` / `s` | 平滑三次 | `c2 end`(4 个) | 首控制点自动取上一条 `C`/`S` 第二控制点关于当前点的镜像(上一指令非 C/S 时取当前点);由渲染端展开,解析器原样保留 | `S 26,32 30,10` → `S 26 32 30 10` |
| `Q` / `q` | 二次贝塞尔 | `ctrl end`(4 个) | 单控制点,`C` 的轻量版 | `Q 16,-4 28,28` → `Q 16 -4 28 28` |
| `T` / `t` | 平滑二次 | `end`(2 个) | 控制点自动反射上一条 `Q`/`T` 的控制点;由渲染端展开,解析器原样保留 | `T 30,20` → `T 30 20` |
| `A` / `a` | 椭圆弧 | `rx,ry rotation largeArc sweep x,y`(7 个) | rotation 为椭圆旋转角;largeArc 取大/小弧、sweep 定方向(1 = 顺时针)。两个 flag 可按单字符紧写(`a5 5 0 0110 0`) | `A 12,12 0 0 1 28,24` → `A 12 12 0 0 1 28 24` |
| `Z` / `z` | 关门 | 无 | 直线连回**当前子路径起点**并形成接角;之后的 `M` 开启新子路径 | `Z` → `Z` |

### 数字词法

- 分隔符为空白和/或逗号,且**无歧义时数字可紧邻**:`2-3` → 2 与 -3、`2..3` → 2. 与 .3;
- 支持十进制科学计数:`+1.e17`、`2.5e-1`;
- 大小写字母均可作指令(`F1M16,12` 合法;解析器对小写 `f1` 前缀同样宽容,官方写法为大写 `F`)。

## 解析器 API 与规范化输出

[parseGeometry](../../src/utils/geometry.ts) 把几何标记解析为规范化表示,适合需要**程序化读取几何**的场景(包围盒、指令统计、编辑器回显):

```ts
import { parseGeometry } from '@/utils/geometry'
import { geometryBounds } from '@/utils/geometryBounds'

const geo = parseGeometry('F1 M 16,12 20,2 L 20,16 1,16 Z')
geo.d        // 'M 16 12 L 20 2 L 20 16 L 1 16 Z'(规范化 SVG path d)
geo.fillRule // 'Nonzero'
geo.commands // 规范化绝对指令序列(隐式重复已展开)
geo.issues   // []:宽松解析跳过的无效片段诊断,length 0 = 整串合法
geometryBounds(geo) // { x: 1, y: 2, width: 19, height: 14 }
```

规范化规则:相对指令折算为绝对(`h 20` → `H <绝对x>`)、隐式重复展开为显式指令(`M` 首对后按 `L`)、坐标最多保留 4 位小数并抹掉浮点噪声。输出的 `d` 可直接交给 `<path>` 或 [Path](../../src/components/Path.vue) 的 `data`(S/T 的反射语义 SVG 与 XAML 一致,保留原指令交渲染端展开)。

[geometryBounds](../../src/utils/geometryBounds.ts) 接受三种入参(标记字符串 / `GeometryData` / 规范化指令序列),无有效几何时返回 `null`。

### 与 Path / PathIcon 的关系

| 模块 | 用途 | 解析行为 |
| --- | --- | --- |
| [Path](../../src/components/Path.vue) / [PathIcon](../../src/components/PathIcon.vue)([shapeGeometry.ts](../../src/utils/shapeGeometry.ts)) | **渲染**:剥离 `F0`/`F1` 前缀后 d 原样交给 `<path>`,`pathBounds` 近似求界供 Stretch/viewBox 映射 | 轻量、不校验、不规范化 |
| [geometry.ts](../../src/utils/geometry.ts) `parseGeometry` | **工具/教学**:逐指令教学页实时展示规范化输出与诊断 | 完整词法解析,输出绝对坐标规范化 d + 诊断 |
| [geometryBounds.ts](../../src/utils/geometryBounds.ts) `geometryBounds` | **工具**:任意调用方的几何包围盒(可复用已解析结果,避免重复解析) | 内部走 `parseGeometry`,口径与 `pathBounds` 一致(已交叉验证) |

即:**渲染组件直接传原始标记字符串**即可;只有需要读出几何信息(求界、统计、填充规则)时才引入这两个工具模块。示例页 [GeometryPage.vue](../../demo/pages/GeometryPage.vue) 是两者的完整用法演示。

## 解析器限制(与 XAML 的差异)

1. **宽松解析不抛错**:XAML 解析器对非法几何串抛格式异常;`parseGeometry` 记录 `issues` 后跳过无效片段继续解析(面向实时编辑/教学,不中断渲染),需要严格校验时检查 `issues.length`。
2. **特殊值不支持**:官方允许的 `Infinity`/`-Infinity`/`NaN` 参数值在几何上退化,按无效片段跳过。
3. **不做 XAML 对象模型**:`Data="{Binding …}"`、`PathGeometry`/`StreamGeometry` 图形对象、`GeometryGroup`、`RectangleGeometry`/`EllipseGeometry`/`LineGeometry` 等对象元素表示不在解析范围(本库的几何输入只有迷你语言字符串)。
4. **`A` 的 flag 按 SVG 惯例单字符读取**:largeArc/sweep 只接受紧邻的 `0`/`1`(兼容 `a5 5 0 0110 0` 紧凑写法);写成 `0.0`/`1.0` 这类非官方形式会判为参数不足。
5. **输出精度**:规范化坐标最多 4 位小数(展示用途);渲染走组件原始串,不受此限制。
6. **填充规则缺省差异**:解析器与 XAML 一致把无前缀当作 `F0`(EvenOdd);把规范化 `d` 直接写进裸 SVG 时,SVG 缺省是 Nonzero,需按 `fillRule` 字段显式设置 `fill-rule`(Path.vue 已处理)。

## 包围盒近似口径(取舍记录)

`geometryBounds` 与 [Path.vue](../../src/components/Path.vue) 已入库的 `pathBounds` 采用同一近似口径(为免在渲染路径引入贝塞尔求根的开销):

| 段类型 | 口径 | 精度 |
| --- | --- | --- |
| `M`/`L`/`H`/`V`、`Z` | 按端点求界 | 精确 |
| `C`/`S`/`Q` | 控制点计入界(`S` 的反射控制点不计) | 精确界的外包超集,`Uniform` 拉伸下可能比 WinUI 略小 |
| `A` | 只计端点,不计弧顶极值 | 端点精确,弧鼓出方向可能被低估 |

需要与 WinUI 逐像素一致时,给形状显式传 `width`/`height`(跳过自然尺寸推断)。该取舍已记录于 [Shape.md 差异节](Shape.md)。

## 基础用法

```vue
<script setup lang="ts">
import WuiPath from '@/components/Path.vue'
import { parseGeometry } from '@/utils/geometry'
import { geometryBounds } from '@/utils/geometryBounds'

// 渲染:标记串直接给 data(F1 前缀选 Nonzero 填充)
// 读几何:规范化 d / 指令统计 / 包围盒
const geo = parseGeometry('M 12,2 L 22,20 L 2,20 Z')
const bounds = geometryBounds(geo) // { x: 2, y: 2, width: 20, height: 18 }
</script>

<template>
  <WuiPath data="F0 M 17,2 25.8,29.1 2.7,12.4 31.3,12.4 8.2,29.1 Z" fill="var(--wui-system-accent-color)" stretch="Uniform" :width="48" :height="48" />
</template>
```

## 相关链接

- 在线示例:[/#/geometry](/#/geometry) · 演示页源码:[demo/pages/GeometryPage.vue](../../demo/pages/GeometryPage.vue)
- 解析器:[src/utils/geometry.ts](../../src/utils/geometry.ts) · 包围盒:[src/utils/geometryBounds.ts](../../src/utils/geometryBounds.ts) · 共享形状工具:[src/utils/shapeGeometry.ts](../../src/utils/shapeGeometry.ts)
- 几何消费方:[Path 与 Shape 家族](Shape.md)(`Data` / Stretch 映射)· [PathIcon](IconElement.md)(图标控件的 `Data` 与 viewBox)· [Line](Line.md)(直线几何)
