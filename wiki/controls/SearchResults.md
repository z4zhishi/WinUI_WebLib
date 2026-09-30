# SearchResults(搜索结果页)

> 在线示例:[/#/search?q=button](/#/search?q=button) —— 路由 `/#/search`(规范入口;`/#/searchresults` 为文件名自动路由的等价别名)

## 概述

搜索结果页由 querystring 参数 `?q=` 驱动,按 `demo/data/catalog.ts` 检索控件并渲染结果
卡片,点击卡片进入 `/<id>` 示例页。检索口径集中在 `demo/data/search.ts`,与首页
搜索框、顶栏搜索入口三处共用,保证「建议下拉」与「结果页」结果一致。

### 检索范围与规则

- 匹配字段:控件 id、标题、副标题、描述、标签(`tags`)、所属分组标题;
- 规则:查询词按空白分词,**所有词都命中**(不区分大小写的包含匹配)才计入;
- 排序:保持 catalog 原序(与首页/侧栏信息架构一致);
- 量级:120 条线性扫描,`computed` 即时重算,无需缓存或防抖。

## 页面结构

| 区块 | 内容 | 使用的控件 |
| --- | --- | --- |
| 页头 | 标题 + 结果计数 | i18n 键 `searchTitle` / `searchResultCount`(`{count}` 占位符) |
| 页内搜索框 | 以当前 `?q=` 初始化,提交以 `router.replace` 回写 querystring(不堆历史) | `WuiAutoSuggestBox`(建议下拉前 8 条,口径同结果) |
| 空态(未输入) | 引导输入的提示条 | `WuiInfoBar`(`is-open`、`is-closable=false`,Informational) |
| 空态(无结果) | 「没有匹配」提示,建议换词 | `WuiInfoBar`(severity=`Warning`,不可关闭) |
| 结果列表 | 图标 + 标题 + 分组徽章 + 摘要 | `WuiFontIcon`(图标解析见 [Home.md](./Home.md))+ `<router-link :to="/<id>">` |

## 路由说明

- 规范入口 `/search?q=…`:首页搜索框、顶栏搜索入口统一跳转此路径;
- 文件名自动路由为 `/searchresults`(demo/pages 自动注册约定),router.ts 中补了一条
  指向同一组件的 `/search` 路由作为规范入口,两路径等价渲染;
- `route.query.q` 为响应式读取:同页内 `?q=` 变化时结果即时更新,无需重建路由。

## 搜索联动总览

```
首页搜索框 ─┐
顶栏搜索入口 ─┼─► /#/search?q=<关键词> ─► 结果列表 ─► 点击 ─► /#/<id> 示例页
(建议直达) ─┘                ▲
结果页搜索框 ─────────────────┘(replace 回写 ?q=)
```

「点击建议/高亮建议后 Enter 直达控件页」的实现约定见 [Home.md](./Home.md) 的
「搜索联动」节(组件 `suggestionChosen` 先于 `querySubmitted` 触发)。

## i18n 键(demo/i18n/locales/*.ts)

本页新增 chrome 键(以 en 为键全集,六语言文件逐键补齐):

| 键 | zh-CN | en | 说明 |
| --- | --- | --- | --- |
| `searchTitle` | `搜索结果` | `Search results` | 页标题 |
| `searchResultCount` | `结果:{count}` | `Results: {count}` | 结果计数行,`{count}` 为占位符 |
| `searchNoQuery` | `输入关键词以搜索控件。` | `Type a keyword to search controls.` | 空查询 InfoBar 正文 |
| `searchNoResults` | `没有匹配「{query}」的结果` | `No matches for "{query}"` | 无结果 InfoBar 正文;亦用于建议面板「无结果」行 |
| `searchNoResultsHint` | `可搜索控件名称、描述与标签。` | `Search covers control names, descriptions and tags.` | 搜索框下的范围说明(检索范围文案) |
| `close` | `关闭` | `Close` | InfoBar 关闭按钮 aria-label |

复用的既有键:`navSearch`(搜索框 header)、`searchPlaceholder`(占位文本)。

## 相关文件

- 页面:`demo/pages/SearchResultsPage.vue`
- 路由:`demo/router.ts`(`/search` 规范入口 + `/searchresults` 自动路由)
- 检索口径:`demo/data/search.ts`

## 互链

- 首页:[Home.md](./Home.md)
- 设置页:[Settings.md](./Settings.md)
