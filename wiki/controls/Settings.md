# Settings(设置页)

> 在线示例:[/#/settings](/#/settings) —— 路由 `/#/settings`(侧栏不设项,入口在页脚「设置」链接)

## 概述

设置页是示例站的站点偏好页,本身也按「吃自己的狗粮」原则全部用已入库控件构建:

- **主题三档**:浅色 / 深色 / 跟随系统,用 `WuiRadioButton` 单选组,接
  `demo/composables/useThemeSetting.ts`;
- **语言切换**:六语言下拉,用 `WuiComboBox`,接 `demo/i18n` 的 `setLocale`;
- **关于区**:版本 / 分组数 / 控件数(键值行)+ 源数据与参考实现的 GitHub 链接,
  链接用 `WuiHyperlinkButton`;页顶持久化说明用 `WuiInfoBar`(不可关闭的提示条)。

## 主题三档与共享实例

`useThemeSetting()` 经共享单例化(模块级缓存):站点壳顶栏(App.vue)与设置页调用
拿到**同一份**偏好状态 —— 两处选中档位永远一致;`localStorage` 键
`winuionweb.theme` 持久化,`system` 档经 `matchMedia('(prefers-color-scheme: dark)')`
跟随系统,解析结果统一写入 `html[data-theme]` 驱动 `theme.css` 的两套 token。

单例的意义:此前每次调用都会创建独立 `mode` ref,设置页改档后顶栏高亮不会跟随
(且两实例的 `watchEffect` 会互相覆写 `html[data-theme]`);共享后该类竞态消除。
首次调用发生在根组件 App.vue 的 setup 中(全生命周期存活),matchMedia 监听与
`watchEffect` 的 effect scope 因此挂在根组件上,路由切换不受影响。

单选组用法要点:`WuiRadioButton` 同 `group-name="site-theme"` 互斥;`:checked` 由
`mode === option.value` 派生(外部改档如顶栏切换会同步高亮),`@checked` 事件只在
用户交互进入选中态时触发 `setMode`,程序化回写不派发事件,无循环。

## 语言下拉

`WuiComboBox` 的 `items` 为 `{ value, label }` 数组(label 为各语言自称的本地语言原文,
不随界面语言翻译,与顶栏一致):`:selected-index` 由 `i18n.locale` 派生,
`@selection-changed` 中仅当目标语言 ≠ 当前语言时调用 `setLocale`
(ComboBox 的 `selectionChanged` 对程序化赋值也会触发,该守卫避免重入)。

## 关于区

| 行 | 值 | 来源 |
| --- | --- | --- |
| 版本 | `0.1.0` | 常量 `SITE_VERSION`(与 package.json `version` 保持一致;tsconfig 未开 resolveJsonModule,不直接 import) |
| 分组数 | `19` | `demo/data/catalog.ts` 的 `GROUP_COUNT` |
| 控件数 | `120` | `demo/data/catalog.ts` 的 `ITEM_COUNT` |
| 数据来源 | WinUI Gallery(GitHub,新窗口) | `WuiHyperlinkButton navigate-uri="…" target="_blank"` |
| 参考实现 | microsoft-ui-xaml(GitHub,新窗口) | 同上 |

`target="_blank"` 时组件自动附加 `rel="noopener noreferrer"`。

## i18n 键(demo/i18n/locales/*.ts)

本页新增 chrome 键(以 en 为键全集,六语言文件逐键补齐):

| 键 | zh-CN | en | 说明 |
| --- | --- | --- | --- |
| `settingsTheme` | `主题` | `Theme` | 主题分节标题(兼单选组 aria-label) |
| `settingsThemeHint` | `选择浅色、深色或跟随系统。` | `Choose light, dark, or follow the system.` | 分节说明 |
| `settingsPersistHint` | `偏好保存在浏览器本地存储(localStorage)。` | `Preferences are stored in your browser (localStorage).` | 页顶 InfoBar 正文 |
| `settingsAbout` | `关于` | `About` | 关于分节标题 |
| `settingsVersion` | `版本` | `Version` | 版本行 |
| `settingsGroupsCount` | `分组数` | `Groups` | 分组数行(页脚「控件数」行亦复用) |
| `settingsItemsCount` | `控件数` | `Controls` | 控件数行 |
| `settingsSourceData` | `数据来源` | `Source data` | 源数据链接行 |
| `settingsReference` | `参考实现` | `Reference` | 参考实现链接行 |
| `close` | `关闭` | `Close` | InfoBar 关闭按钮的 aria-label |

复用的既有键:`settingsTitle`(页标题)、`settingsLanguage`(语言分节标题)、
`themeLight` / `themeDark` / `themeSystem`(三个单选项文案,随界面语言更新)。

## 相关文件

- 页面:`demo/pages/SettingsPage.vue`
- 主题偏好:`demo/composables/useThemeSetting.ts`(共享单例)
- 语言基建:`demo/i18n/index.ts`(`setLocale` / `LOCALES`)与 `demo/i18n/locales/*.ts`

## 互链

- 首页:[Home.md](./Home.md)
- 搜索结果页:[SearchResults.md](./SearchResults.md)
