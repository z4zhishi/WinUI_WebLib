// T9 类型检查入口固化守卫:
// 确保 `npm run type-check` / `npm run build` 使用的是项目本地 node_modules 的
// vue-tsc,且其实际版本满足 package.json 声明的范围,防止「本地绿、门槛红」的
// 双轨分歧(裸 vue-tsc / 项目外 npx vue-tsc 会解析到别的版本或直接崩溃)。
// 注意:`vue-tsc --version` 打印的是其内置 TypeScript 的版本,不是 vue-tsc 版本。
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

let vueTscPkg, tsPkg
try {
  vueTscPkg = require('vue-tsc/package.json')
  tsPkg = require('typescript/package.json')
} catch (err) {
  console.error(`[check-vue-tsc] 无法从项目 node_modules 解析 vue-tsc / typescript:${err.message}`)
  console.error('[check-vue-tsc] 请在项目根目录执行 `npm ci`(或 `npm install`)后重试。')
  process.exit(1)
}

const resolvedFrom = path.dirname(require.resolve('vue-tsc/package.json'))
if (path.relative(projectRoot, resolvedFrom).startsWith('..')) {
  console.error(`[check-vue-tsc] 解析到的 vue-tsc 不在项目内:${resolvedFrom}`)
  process.exit(1)
}

// 从 package.json 声明范围(^3.2.6 形态)提取期望主版本
const pkgJson = JSON.parse(await import('node:fs/promises').then(m => m.readFile(path.join(projectRoot, 'package.json'), 'utf8')))
const declared = pkgJson.devDependencies?.['vue-tsc']
const expectedMajor = typeof declared === 'string' ? (declared.match(/\d+/)?.[0]) : undefined
const actualMajor = vueTscPkg.version.split('.')[0]
if (!expectedMajor || actualMajor !== expectedMajor) {
  console.error(`[check-vue-tsc] vue-tsc 版本漂移:安装 ${vueTscPkg.version},声明 ${declared}。`)
  console.error('[check-vue-tsc] 请勿使用全局或 npx 缓存的 vue-tsc;在项目根目录运行 `npm ci` 修正。')
  process.exit(1)
}

console.log(`[check-vue-tsc] vue-tsc@${vueTscPkg.version} + typescript@${tsPkg.version}(项目本地 node_modules)`)
