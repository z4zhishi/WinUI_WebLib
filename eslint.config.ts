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
)
