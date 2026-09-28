# demo/i18n —— 示例站语言键

按规范需支持以下语言:

| 语言键 | 语言 | 备注 |
| --- | --- | --- |
| `zh-CN` | 简体中文 | |
| `zh-TW` | 繁体中文 | |
| `en` | 英语 | 回退默认语言 |
| `ja` | 日语 | |
| `fr` | 法语 | |
| `ko` | 韩语 | |

规则:

- 示例站默认按浏览器语言自动识别,未命中支持列表时回退 `en`。
- 页面右上角提供手动切换语言的入口,切换结果应持久化(如 localStorage)。

## 已实现(T0.3)

手写实现,零依赖(不使用 vue-i18n),入口 `demo/i18n/index.ts`。

### API

| 导出 | 说明 |
| --- | --- |
| `LOCALES` | 支持的语言键数组 `['zh-CN', 'zh-TW', 'en', 'ja', 'fr', 'ko']` |
| `DEFAULT_LOCALE` | 回退默认语言 `'en'` |
| `detectLocale()` | 按下述规则自动识别当前语言 |
| `createI18n(locale?)` | 创建实例 `{ locale, setLocale(next), t(key, params?) }`;缺省时自动探测 |
| `i18nKey` | provide/inject 的类型化 Symbol 键 |
| `provideI18n(i18n)` | 在根组件 setup 中提供实例 |
| `useI18n()` | 取用实例;未提供时抛错 |

- `locale` 是响应式 `Ref<Locale>`:组件模板经 `t()` 读取,切换语言时自动更新。
- `setLocale(next)` 更新语言并写入 localStorage(键 `winuionweb.locale`)。
- `t(key, params?)` 回退链:当前语言 → `en` → 键名原样;`params` 替换文案中的 `{name}` 占位符。

### 检测规则(`detectLocale`)

1. localStorage 覆盖:键 `winuionweb.locale`,值必须是受支持的语言键,否则忽略;
2. `navigator.languages` 按用户优先级逐个标签匹配,每个标签先精确匹配(如 `zh-CN`、`en`),再前缀匹配:
   - `zh-Hant*`、`zh-TW`、`zh-HK`、`zh-MO` → `zh-TW`
   - 其余 `zh-*`(含裸 `zh`)→ `zh-CN`
   - 其余语言取主键,如 `en-US` → `en`、`fr-CA` → `fr`、`ko-KR` → `ko`;
   - 不支持的语言(如 `de`)跳过,继续下一个标签;
3. 全部未命中 → `en`。

### 资源模块

`demo/i18n/locales/{zh-CN,zh-TW,en,ja,fr,ko}.ts`,`export default { ... } as const`。
各语言必须包含与 `en` 相同的全量键(编译期校验,缺键时 `npm run build` 报错)。初始 14 个 chrome 键见 `en.ts`。
