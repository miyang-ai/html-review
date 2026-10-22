/**
 * 背景：工具要以「一个 JS 文件」挂到任何页面，并提供书签、浏览器插件两种一键注入方式。
 * 设计意图：esbuild 把 TS、CSS、SVG 打成单个 IIFE；同时生成：
 * - dist/html-review.js：可读版本，用于 <script> 挂载和调试；
 * - dist/html-review.min.js：压缩版本，体积更小；
 * - dist/bookmarklet.txt：内联全部代码的书签（任何页面可用，严格 CSP 的网站除外）；
 * - dist/install.html：打开后把按钮拖到书签栏即可安装，并给出 <script> 挂载代码（路径在浏览器里按页面位置现算）；
 * - dist/extension/：Chrome 插件（MV3），可直接「加载已解压的扩展程序」，内含与 dist/html-review.js 相同的核心脚本；
 * - dist/playground.js：组件 demo 页（playground/components.html）专用，不进入正式产物。
 * 版本号只在 package.json 维护，构建时注入脚本头部、window.__htmlReview.version 和插件 manifest。
 * 约束：--watch 只重建 JS，不重复生成安装页和插件目录。
 */
import * as esbuild from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const dist = join(root, 'dist')
mkdirSync(dist, { recursive: true })
const watch = process.argv.includes('--watch')
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const common = {
  entryPoints: [join(root, 'src/index.ts')],
  bundle: true,
  format: 'iife',
  target: ['chrome100', 'safari15', 'firefox100'],
  loader: { '.svg': 'text', '.css': 'text' },
  legalComments: 'none',
  charset: 'utf8',
  define: { __VERSION__: JSON.stringify(version) },
  banner: { js: `/*! HTML Review v${version} | MIT | Copyright (c) 2025 Miyang Tech (Shanghai) Co., Ltd. | Icons: Lucide (ISC) */` },
}

/**
 * 背景：插件目录要能直接被 Chrome 加载，也要能原样打包上架。
 * 设计意图：每次全量重建 dist/extension/，避免残留旧文件进入上架包；
 * manifest 的版本号从 package.json 写入，核心脚本直接复用刚构建好的 dist/html-review.js。
 */
async function buildExtension() {
  const src = join(root, 'extension')
  const out = join(dist, 'extension')
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  const extCommon = { ...common, target: ['chrome111'], banner: common.banner }
  await esbuild.build({ ...extCommon, entryPoints: [join(src, 'background.ts')], outfile: join(out, 'background.js') })
  await esbuild.build({ ...extCommon, entryPoints: [join(src, 'help.ts')], outfile: join(out, 'help.js') })
  const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'))
  manifest.version = version
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  for (const name of ['help.html', 'help.css', 'icons', '_locales']) cpSync(join(src, name), join(out, name), { recursive: true })
  cpSync(join(dist, 'html-review.js'), join(out, 'html-review.js'))
  writeFileSync(join(out, 'LICENSE'), readFileSync(join(root, 'LICENSE'), 'utf8'))
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

  await buildExtension()

  console.log(`[build] v${version}: dist/html-review.js, html-review.min.js (${(min.length / 1024).toFixed(1)} KB), bookmarklet.txt, install.html, extension/, playground.js`)
}
