/**
 * 背景：Chrome 插件需要 16 / 32 / 48 / 128 四种尺寸的 PNG 图标，应用商店还要求 128 图标留透明边。
 * 设计意图：用 puppeteer-core 驱动本机 Chrome，把 Lucide pen-line 渲染到深色圆角底上（与工具条主按钮同款），
 * 笔下的横线用改字模式的琥珀色，一眼能和「改字」对上。小尺寸加粗描边、减少留边，保证工具栏里清晰。
 * 产物提交到 extension/icons/，日常构建不依赖浏览器；只有改图标设计时才需要重新运行：npm run icons
 * 约束：Chrome 路径可用 CHROME_PATH 覆盖。
 */
import puppeteer from 'puppeteer-core'
import { readFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'extension/icons')
mkdirSync(out, { recursive: true })
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const pen = readFileSync(join(root, 'node_modules/lucide-static/icons/pen-line.svg'), 'utf8')
const paths = [...pen.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1])
if (paths.length < 2) throw new Error('pen-line.svg 结构变化，找不到预期的 path')
const [underline, ...penPaths] = paths

const SPECS = [
  { size: 16, pad: 0, radius: 4, stroke: 2.6, glyph: 0.78 },
  { size: 32, pad: 1, radius: 8, stroke: 2.3, glyph: 0.66 },
  { size: 48, pad: 3, radius: 11, stroke: 2.1, glyph: 0.62 },
  { size: 128, pad: 16, radius: 22, stroke: 2, glyph: 0.6 },
]

function svgFor({ size, pad, radius, stroke, glyph }) {
  const inner = size - pad * 2
  const g = inner * glyph
  const off = pad + (inner - g) / 2
  const scale = g / 24
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${radius}" fill="#0f172a"/>
  <g transform="translate(${off} ${off}) scale(${scale})" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${stroke}">
    <path d="${underline}" stroke="#f59e0b"/>
    ${penPaths.map((d) => `<path d="${d}" stroke="#ffffff"/>`).join('\n    ')}
  </g>
</svg>`
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
try {
  const page = await browser.newPage()
  for (const spec of SPECS) {
    await page.setViewport({ width: spec.size, height: spec.size, deviceScaleFactor: 1 })
    await page.setContent(`<html><body style="margin:0;background:transparent">${svgFor(spec)}</body></html>`)
    const file = join(out, `icon-${spec.size}.png`)
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: spec.size, height: spec.size } })
    console.log('[icons]', file)
  }
} finally {
  await browser.close()
}
