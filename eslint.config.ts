import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import oxlint from 'eslint-plugin-oxlint'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', 'CK/**', '.tools/**'],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  oxlint.configs['flat/recommended'],
  {
    // WinUI 控件官方名即契约(Canvas/Pivot/Slider 等单词名不改)
    name: 'app/allow-official-single-word-control-names',
    files: ['src/components/**/*.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
  {
    // demo 页用法示例的模板串内含 <\/script> 转义——JS 层面是"无用转义",
    // 但它是 SFC 块提取器的结构性需要(裸 </script> 会提前终结脚本块),
    // 且 --fix 会把它"修"回裸标签直接破坏文件,故整类豁免。
    name: 'app/keep-load-bearing-script-escape',
    files: ['demo/**/*.vue'],
    rules: { 'no-useless-escape': 'off' },
  },
)
