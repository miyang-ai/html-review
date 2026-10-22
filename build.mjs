/**
 * 背景：工具要以「一个 JS 文件」挂到任何页面，并提供书签一键注入。
 * 设计意图：esbuild 把 TS、CSS、SVG 打成单个 IIFE；同时生成：
 * - dist/html-review.js：可读版本，用于 <script> 挂载和调试；
 * - dist/html-review.min.js：压缩版本，体积更小；
 * - dist/bookmarklet.txt：内联全部代码的书签（任何页面可用，严格 CSP 的网站除外）；
 * - dist/install.html：打开后把按钮拖到书签栏即可安装，并给出 <script> 挂载代码（路径在浏览器里按页面位置现算）；
 * - dist/playground.js：组件 demo 页（playground/components.html）专用，不进入正式产物。
 * 约束：--watch 只重建 JS，不重复生成安装页。
 */
import * as esbuild from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const dist = join(root, 'dist')
mkdirSync(dist, { recursive: true })
const watch = process.argv.includes('--watch')

const common = {
  entryPoints: [join(root, 'src/index.ts')],
  bundle: true,
  format: 'iife',
  target: ['chrome100', 'safari15', 'firefox100'],
  loader: { '.svg': 'text', '.css': 'text' },
  legalComments: 'none',
  charset: 'utf8',
  banner: { js: '/*! HTML Review v0.1.0 | MIT | Copyright (c) 2025 Miyang Tech (Shanghai) Co., Ltd. | Icons: Lucide (ISC) */' },
}

if (watch) {
  const ctx = await esbuild.context({ ...common, outfile: join(dist, 'html-review.js') })
  await ctx.watch()
  const pg = await esbuild.context({ ...common, entryPoints: [join(root, 'src/playground.ts')], outfile: join(dist, 'playground.js') })
  await pg.watch()
  console.log('[build] watching src/ …')
} else {
  await esbuild.build({ ...common, outfile: join(dist, 'html-review.js') })
  await esbuild.build({ ...common, outfile: join(dist, 'html-review.min.js'), minify: true })
  await esbuild.build({ ...common, entryPoints: [join(root, 'src/playground.ts')], outfile: join(dist, 'playground.js') })

  const min = readFileSync(join(dist, 'html-review.min.js'), 'utf8')
  const bookmarklet = 'javascript:' + encodeURIComponent(min)
  writeFileSync(join(dist, 'bookmarklet.txt'), bookmarklet)

  // 本地加载书签和挂载代码的路径由 install.html 打开时按自身地址现算，产物里不写入构建机路径
  const template = readFileSync(join(root, 'install.template.html'), 'utf8')
  const html = template
    .replaceAll('{{BOOKMARKLET}}', bookmarklet.replace(/"/g, '&quot;'))
    .replaceAll('{{SIZE_KB}}', (min.length / 1024).toFixed(1))
  writeFileSync(join(dist, 'install.html'), html)

  console.log(`[build] dist/html-review.js, html-review.min.js (${(min.length / 1024).toFixed(1)} KB), bookmarklet.txt, install.html, playground.js`)
}
