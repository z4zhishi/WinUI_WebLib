# demo/data

- 来源:`catalog.ts` 为生成物(勿手改),由 `docs/temp/build-catalog.mjs` 从 `CK/WinUI-Gallery/WinUIGallery/SampleSupport/Data/ControlInfoData.json` 生成。
- 再生成:`node docs/temp/build-catalog.mjs`。
- 断言规则:脚本内置组数 === 19 且条目总数 === 120 的断言,不符即失败退出,防止源数据变更后静默漂移。
- `fontIconGlyphs.ts` 为生成物(勿手改),由 `docs/temp/build-icon-glyphs.mjs` 生成。
- `designTokens.ts` 为运行时解析器(手写):经 Vite `?raw` 导入 `src/styles/theme.css` 与 `src/styles/theme-hooks.css` 源码,抽出 `--wui-*` 声明并按浅/深主题块配对,供 Color/Spacing/Typography 设计指南页展示 token 数据(数据与主题文件始终同源,非生成物)。

