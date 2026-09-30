// 目录检索与建议:首页搜索框、顶栏搜索入口、搜索结果页共用的单一实现,
// 保证「建议下拉」与「结果页」口径一致。匹配范围:控件 id、标题、副标题、
// 描述、标签、所属分组标题(全部不区分大小写的包含匹配)。
import { CATALOG } from './catalog'
import type { CatalogGroup, CatalogItem } from './catalog'
/** 摊平后的目录条目:控件本身 + 所属分组(卡片需要分组上下文)。 */
export interface CatalogFlatItem {
  item: CatalogItem
  group: CatalogGroup
}

/** 19 组 × 全部条目的线性视图(每次调用重建,量级 120,无需缓存)。 */
export function flattenCatalog(groups: CatalogGroup[] = CATALOG): CatalogFlatItem[] {
  return groups.flatMap((group) => group.items.map((item) => ({ item, group })))
}

/** 空白分词后的查询词;全空白返回空数组(视为未输入)。 */
function queryTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

/** 单条目的可检索文本(id/标题/副标题/描述/标签/分组标题,已小写拼接)。 */
function searchableText(entry: CatalogFlatItem): string {
  const { item, group } = entry
  return [
    item.id,
    item.title,
    item.subtitle ?? '',
    item.description,
    item.tags.join(' '),
    group.title,
  ]
    .join('\n')
    .toLowerCase()
}

/**
 * 目录检索:查询词按空白分词,所有词都命中才计入结果;
 * 分组顺序保持 catalog 原序,便于与首页/侧栏的信息架构对应。
 */
export function searchCatalog(query: string, groups: CatalogGroup[] = CATALOG): CatalogFlatItem[] {
  const terms = queryTerms(query)
  if (terms.length === 0) return []
  return flattenCatalog(groups).filter((entry) => {
    const text = searchableText(entry)
    return terms.every((term) => text.includes(term))
  })
}

/** 首页/顶栏/结果页建议下拉:同 searchCatalog 口径,截取前 limit 条。
 *  返回 CatalogItem 本体(不带分组上下文):AutoSuggestBox 的 displayMemberPath
 *  是单层字段路径,建议项直接用 title 字段展示与回填。 */
export function suggestControls(query: string, limit = 8): CatalogItem[] {
  return searchCatalog(query)
    .slice(0, limit)
    .map((entry) => entry.item)
}
