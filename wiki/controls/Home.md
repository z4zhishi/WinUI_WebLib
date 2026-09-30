# Home(控件总览首页)

> 在线示例:[/#/home](/#/home) —— 路由 `/#/home`

## 概述

首页是示例站的控件总览页:按 `demo/data/catalog.ts` 的 19 个分组渲染全部 120 个控件卡片
(图标 + 标题 + 副标题/描述,`isNew` 控件带 InfoBadge「新」徽标),点击任意卡片进入
`/<id>` 示例页。页顶搜索框与顶栏搜索入口、搜索结果页三处共用同一检索口径
(`demo/data/search.ts`),提交后以 querystring `?q=` 跳转 `/search`。

页面文案(标题、副标题、统计行、徽标文字等)全部走 `demo/i18n/locales/*.ts` 的 chrome 键,
六语言齐全;catalog 自身的 title/subtitle/description 为英文源数据,与侧栏一致不做翻译。

## 页面结构

| 区块 | 内容 | 使用的控件 / 数据 |
| --- | --- | --- |
| 页头 | 站点名 + 副标题 + 统计行 | i18n 键 `homeTitle` / `homeSubtitle` / `homeStats`(`{groups}`/`{items}` 占位符),`GROUP_COUNT` / `ITEM_COUNT` |
| 搜索框 | 建议下拉(前 8 条)+ 查询按钮 | `WuiAutoSuggestBox`(`queryIcon="Find"`、`displayMemberPath="title"`,候选由 `suggestControls()` 过滤) |
| 分组区 | 组标题 + 卡片栅格(窄屏自动降列) | `CATALOG` 分组遍历(顺序与侧栏一致:普通组在前,`isSpecialSection` 组排最后) |
| 控件卡片 | 图标 + 标题 + 摘要,整卡可点 | `WuiFontIcon`(字形解析见下)、`WuiInfoBadge`(`isNew` 徽标)、`<router-link :to="/<id>">` |

### 卡片图标的三级解析(demo/data/controlIcons.ts)

卡片图标用已入库 IconElement 族的 `WuiFontIcon` 渲染,字形字符经三级回退解析,
名称全部取自生成物 `demo/data/fontIconGlyphs.ts`(官方 IconsData.json,1533 条),
不写裸码点:

1. 条目登记名(`ITEM_GLYPH_NAMES[item.id]`);
2. 分组默认(`GROUP_GLYPH_NAMES[group.id]`);
3. 全局兜底(`Page`)。

## 搜索联动

- **本页搜索框**:Enter / 查询按钮 → `/#/search?q=<编码后的关键词>`;点击建议或
  高亮建议后 Enter(提交文本 = 建议标题)→ 直达 `/<id>` 示例页;
- **顶栏搜索入口**(App.vue):与本页同口径同行为;
- **搜索结果页**:读取 `?q=` 检索,页内搜索框提交以 `router.replace` 回写 querystring。

三处的「建议下拉 → 点击直达控件页」逻辑一致:组件的 `suggestionChosen` 事件先于
`querySubmitted` 触发,页面据此暂存最近选中项,提交时按「提交文本是否等于建议标题」
区分「选建议」与「自由搜索」两条路径。

## i18n 键(demo/i18n/locales/*.ts)

本页新增 chrome 键(以 en 为键全集,六语言文件逐键补齐,编译期由 `MessageKey` 校验):

| 键 | zh-CN | en | 说明 |
| --- | --- | --- | --- |
| `homeStats` | `共 {groups} 组 · {items} 个控件` | `{groups} groups · {items} controls` | 统计行,`{groups}`/`{items}` 为占位符 |
| `homeNewBadge` | `新` | `New` | `isNew` 控件的 InfoBadge 文字 |

复用的既有键:`homeTitle`、`homeSubtitle`、`navSearch`(搜索框 header)、
`searchPlaceholder`(占位文本)、`searchNoResults`(建议面板「无结果」行)。

## 相关文件

- 页面:`demo/pages/HomePage.vue`
- 检索口径:`demo/data/search.ts`(`searchCatalog` / `suggestControls` / `flattenCatalog`)
- 图标解析:`demo/data/controlIcons.ts`
- 字形数据:`demo/data/fontIconGlyphs.ts`(生成物,勿手改)
- 目录数据:`demo/data/catalog.ts`(生成物,勿手改)

## 互链

- 搜索结果页:[SearchResults.md](./SearchResults.md)
- 设置页:[Settings.md](./Settings.md)
