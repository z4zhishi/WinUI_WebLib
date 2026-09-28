# demo/data

- 来源:`catalog.ts` 为生成物(勿手改),由 `docs/temp/build-catalog.mjs` 从 `CK/WinUI-Gallery/WinUIGallery/SampleSupport/Data/ControlInfoData.json` 生成。
- 再生成:`node docs/temp/build-catalog.mjs`。
- 断言规则:脚本内置组数 === 19 且条目总数 === 120 的断言,不符即失败退出,防止源数据变更后静默漂移。
