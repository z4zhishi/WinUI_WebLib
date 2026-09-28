# demo/components — 示例页模板组件

控件示例页(`demo/pages/*Page.vue`)的可复用模板。项目规范由 `DemoPage` 定稿:

> **上半区可交互**(滑块 / 输入框 / 下拉实时改变控件参数),**下半区固定呈现**事件、属性与接受类型等开发向文档。

真实控件落地后仅替换演示对象,模板组件不动。

## 组件一览

| 组件 | 职责 |
| --- | --- |
| `DemoPage.vue` | 示例页外壳:页头 → 演示区(`#demo`)→ 参数面板区(`#options`)→ 文档区(`#docs`) |
| `DemoOptions.vue` | 参数面板栅格容器 |
| `DemoOptionRow.vue` | 单个参数行(原生控件 + WinUI 观感,v-model) |
| `DemoDocsTable.vue` | 开发文档表格(属性/事件、类型、说明) |
| `DemoCode.vue` | 代码块(深色底、右上角复制按钮) |
| `labels.ts` | 模板组件局部双语文案(见文末) |

抄写范例见 `demo/pages/HomePage.vue`(假想 Button 演示)。

## 标准示例页骨架(照抄)

```vue
<script setup lang="ts">
// XxxPage.vue —— Xxx 控件示例页
import { computed, ref } from 'vue'
import DemoPage from '../components/DemoPage.vue'
import DemoOptions from '../components/DemoOptions.vue'
import DemoOptionRow from '../components/DemoOptionRow.vue'
import DemoDocsTable from '../components/DemoDocsTable.vue'
import DemoCode from '../components/DemoCode.vue'

// 参数 ref 一律声明为联合类型,以匹配 DemoOptionRow 的 v-model 契约
// (toggle → boolean,slider/number → number,text/select → string)。
const size = ref<string | number | boolean>(14)
const visible = ref<string | number | boolean>(true)

const sizeValue = computed(() => Number(size.value))

const headers = ['属性 / 事件', '类型', '说明']
const rows: (string | number)[][] = [
  ['Size', 'number', '尺寸大小'],
  ['Click', '(sender, e: RoutedEventArgs) => void', '点击时触发'],
]
</script>

<template>
  <DemoPage title="Xxx" description="一句话说明该控件。">
    <template #demo>
      <!-- 真实控件落地后,此处替换为 <WuiXxx ... /> -->
      <p :style="{ fontSize: `${sizeValue}px` }">演示对象</p>
    </template>

    <template #options>
      <DemoOptions :columns="2">
        <DemoOptionRow label="Size" type="slider" v-model="size" :min="10" :max="32" />
        <DemoOptionRow label="Visible" type="toggle" v-model="visible" />
      </DemoOptions>
    </template>

    <template #docs>
      <DemoDocsTable :headers="headers" :rows="rows" />
      <DemoCode :code="`<WuiXxx :size='${sizeValue}' />`" language="vue" />
    </template>
  </DemoPage>
</template>
```

**引号规则(照抄必读)**:绑定属性外层用双引号时,内层字符串一律用单引号 —— HTML 属性内 `\"` 不转义,`"` 会直接截断属性值导致编译失败;较长的用法代码建议改放 `<script>` 内的 `computed`(写法见 `demo/pages/HomePage.vue` 的 `usageCode`)。

文件放入 `demo/pages/` 后按文件名自动注册路由:`XxxPage.vue` → `/xxx`(见 `demo/router.ts`)。

## API

### DemoPage

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `title` | `string`(必填) | 页头标题 |
| `description` | `string` | 页头描述,可省略 |

| Slot | 说明 |
| --- | --- |
| `demo` | 交互演示区;置于 WinUI 风格容器中,标题取 i18n 键 `examples` |
| `options` | 参数面板区;内放 `DemoOptions`,标题为局部文案「参数 / Options」 |
| `docs` | 固定文档区;内放 `DemoDocsTable` / `DemoCode`,标题取 i18n 键 `docs` |

演示区标题右侧有 **浅色 / 深色主题预览切换**(标签取 i18n 键 `themeLight` / `themeDark`):
`theme.css` 仅在 `:root[data-theme="light|dark"]` 上定义 token,因此切换通过写 `html[data-theme]` 生效,
是**站点级预览**,与后续站点壳的主题设置操作同一约定属性。

### DemoOptions

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `columns` | `number` | `2` | 栅格列数,收敛到 1–4;窄视口(≤720px)自动单列 |

默认 slot 放置 `DemoOptionRow` 等选项控件。

### DemoOptionRow

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | `string`(必填) | — | 左侧参数名 |
| `type` | `'slider' \| 'toggle' \| 'select' \| 'text' \| 'number'` | `'text'` | 控件类型 |
| `min` / `max` / `step` | `number` | `0` / `100` / `1` | slider、number 专用 |
| `options` | `{ label: string; value: string }[]` | `[]` | select 专用 |
| `placeholder` | `string` | `''` | text、number 专用 |

**v-model 契约**(父级参数 `ref` 声明为 `ref<string | number | boolean>(…)`,读取时 `Number()` / `=== true` 归一):

| type | 取值类型 |
| --- | --- |
| `toggle` | `boolean` |
| `slider`、`number` | `number`(输入中途暂存原始串,父级读取时 `Number()` 归一) |
| `text`、`select` | `string` |

### DemoDocsTable

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `headers` | `string[]`(必填) | 表头,如 `['属性 / 事件', '类型', '说明']` |
| `rows` | `(string \| number)[][]`(必填) | 行数据,列数与表头一致;首列渲染为等宽字体成员名 |

### DemoCode

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `code` | `string`(必填) | 代码文本;首尾空行会被裁掉,其余原样展示 |
| `language` | `string` | 语言角标,如 `'vue'` |

右上角复制按钮:`navigator.clipboard` 优先,失败(非安全上下文 / 权限被拒)降级 `document.execCommand('copy')`;成功后按钮显示「已复制 / Copied」2 秒。

## 约定

1. **样式**:全部 scoped;颜色 / 字号 / 圆角一律用 `src/styles/theme.css` 的 `--wui-*` token,禁止硬编码色值。系统色钩子 `--wui-system-accent-color` 尚未在应用层定义,需要强调色时写 `var(--wui-system-accent-color, var(--wui-hyperlink-foreground-theme))`,钩子定义后自动生效。
2. **i18n**:区标题优先用 `demo/i18n` 已有键(`examples`、`docs`、`themeLight`、`themeDark`);键集之外的文案放 `labels.ts`(中英双语,按 `locale` 前缀选择)。**不要修改 `demo/i18n/**`**。
3. **i18n 实例获取**:组件内统一 `const i18n = useDemoI18n()`(即 `inject(i18nKey)`,站点壳 `provideI18n()` 后自动取共享实例;壳未接线前回退本地实例,页面不会崩)。
4. 演示对象当前为语义化 HTML + token 样式占位;`src/` 真实控件落地后只替换 `#demo` slot 内容与参数映射。

## 局部文案 labels.ts

- `useDemoI18n()`:取 i18n 实例(inject + 回退,见约定 3)。
- `useBilingual(i18n, text)`:返回随语言切换更新的 `computed<string>`。
- 常量:`LABEL_OPTIONS`(参数 / Options)、`LABEL_THEME_PREVIEW`(主题预览 / Theme preview)、`LABEL_COPY`(复制 / Copy)、`LABEL_COPIED`(已复制 / Copied)。
