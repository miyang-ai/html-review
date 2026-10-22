/**
 * 背景：GitHub Release 和 Chrome 应用商店都需要一个插件 zip。
 * 设计意图：先完整构建，再把 dist/extension/ 打成 release/html-review-extension-v<版本>.zip。
 * 用 fflate 在 Node 里压缩，不依赖系统 zip 命令，Windows / CI 上同样可用。
 * zip 根目录直接是 manifest.json（应用商店要求），用户解压后选这个文件夹即可加载。
 * 约束：release/ 不进仓库，发布时上传到 GitHub Release。
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipSync } from 'fflate'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
execFileSync(process.execPath, [join(root, 'build.mjs')], { stdio: 'inherit' })

const src = join(root, 'dist/extension')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'))
if (manifest.version !== version) throw new Error(`manifest 版本 ${manifest.version} 与 package.json ${version} 不一致`)

const files = {}
function walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    if (name === '.DS_Store') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else files[relative(src, full).split(sep).join('/')] = readFileSync(full)
  }
}
walk(src)

const outDir = join(root, 'release')
mkdirSync(outDir, { recursive: true })
const out = join(outDir, `html-review-extension-v${version}.zip`)
writeFileSync(out, zipSync(files, { level: 9, mtime: new Date('2025-01-01T00:00:00Z') }))
console.log(`[pack] ${relative(root, out)} · ${Object.keys(files).length} 个文件 · ${(statSync(out).size / 1024).toFixed(1)} KB`)
