/**
 * 背景：Chrome 应用商店上架需要 1280×800 截图（1–5 张）和 440×280 小型宣传图，手工截图每次改版都要重做。
 * 设计意图：用 puppeteer-core 在本机 Chrome 里真实操作 PlayGround 模拟报告页，按「改字 → 批注 → 修改清单」
 * 三步截图；再加载插件截引导页；宣传图用 HTML 排版后截图。产物写入 store/screenshots/。
 * 约束：先 npm run build（store:assets 脚本已包含）；使用临时浏览器配置，不影响个人浏览器数据。
 */
import puppeteer from 'puppeteer-core'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'store/screenshots')
mkdirSync(out, { recursive: true })
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const tmp = mkdtempSync(join(tmpdir(), 'html-review-store-'))
const html = readFileSync(join(root, 'playground/index.html'), 'utf8').replace('../dist/html-review.js', pathToFileURL(join(root, 'dist/html-review.js')).href)
writeFileSync(join(tmp, 'report.html'), html)
copyFileSync(join(root, 'playground/playground.css'), join(tmp, 'playground.css'))

async function center(page, sel) {
  return page.$eval(sel, (el) => {
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  })
}

async function shot(page, name) {
  await sleep(250)
  await page.screenshot({ path: join(out, name) })
  console.log('[store]', name)
}

/** 三张功能截图：改字中、框选写批注、修改清单 */
async function featureShots(browser) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(join(tmp, 'report.html')).href, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__htmlReview)

  await page.keyboard.press('t')
  const lead = await center(page, '#target-lead')
  await sleep(100)
  await page.mouse.click(lead.x + lead.w - 6, lead.y + lead.h / 2)
  await page.keyboard.press('End')
  await page.keyboard.type('独处是一种主动选择。')
  await shot(page, '01-edit-text.png')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await sleep(2600)

  await page.keyboard.press('c')
  const grid = await center(page, '#grid')
  await page.mouse.move(grid.x - 10, grid.y - 10)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(grid.x - 10 + ((grid.w + 20) * i) / 8, grid.y - 10 + ((grid.h + 20) * i) / 8)
  await page.mouse.up()
  await sleep(150)
  await page.keyboard.type('三张卡片改成横向对比表，突出 66% 这一列。')
  // 鼠标移到批注框上，页面上只留选中框，不显示悬停框
  const pop = await page.evaluate(() => {
    const r = document.querySelector('html-review-root').shadowRoot.querySelector('.popover').getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + 12 }
  })
  await page.mouse.move(pop.x, pop.y)
  await shot(page, '02-comment.png')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')

  await page.evaluate(() => window.__htmlReview.app.setSidebar(true))
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, '03-change-list.png')
  await page.close()
}

/** 引导页截图：加载真实插件，打开 chrome-extension://<id>/help.html */
async function helpShot() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, pipe: true, enableExtensions: [join(root, 'dist/extension')] })
  try {
    const target = await browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().endsWith('/background.js'), { timeout: 15000 })
    const id = new URL(target.url()).host
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
    await page.goto(`chrome-extension://${id}/help.html`, { waitUntil: 'load' })
    await page.waitForFunction(() => document.getElementById('version')?.textContent !== '')
    await shot(page, '04-help.png')
  } finally {
    await browser.close()
  }
}

/** 440×280 小型宣传图 */
async function promoTile(browser) {
  const icon = readFileSync(join(root, 'extension/icons/icon-128.png')).toString('base64')
  const page = await browser.newPage()
  await page.setViewport({ width: 440, height: 280, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><html><body style="margin:0;width:440px;height:280px;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;display:flex;align-items:center;gap:22px;padding:0 34px;box-sizing:border-box">
    <img src="data:image/png;base64,${icon}" width="128" height="128" style="flex:none;margin:0 -12px 0 -16px">
    <div>
      <div style="font-size:30px;font-weight:700;letter-spacing:-0.5px">HTML Review</div>
      <div style="width:44px;height:4px;border-radius:2px;background:#f59e0b;margin:10px 0 12px"></div>
      <div style="font-size:16px;color:#334155;line-height:1.6">在网页上直接改字、批注<br>一键把修改单交给 AI</div>
    </div>
  </body></html>`)
  await shot(page, 'promo-small-440x280.png')
  await page.close()
}

/**
 * 背景：商店的精选位使用 1400×560 大型宣传图，没有这张图就不会被选入横幅推荐。
 * 设计意图：左侧沿用小型宣传图的图标和标题排版，右侧放修改清单截图，一眼看出产品形态；截图取本次刚生成的 03。
 * 约束：必须在 featureShots 之后调用。
 */
async function marqueeTile(browser) {
  const icon = readFileSync(join(root, 'extension/icons/icon-128.png')).toString('base64')
  const shotB64 = readFileSync(join(out, '03-change-list.png')).toString('base64')
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 560, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><html><body style="margin:0;width:1400px;height:560px;overflow:hidden;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;position:relative">
    <div style="position:absolute;left:84px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center">
      <img src="data:image/png;base64,${icon}" width="112" height="112" style="margin-left:-14px">
      <div style="font-size:52px;font-weight:700;letter-spacing:-1px;margin-top:18px">HTML Review</div>
      <div style="width:64px;height:5px;border-radius:3px;background:#f59e0b;margin:18px 0 22px"></div>
      <div style="font-size:24px;color:#334155;line-height:1.6">在网页上直接改字、批注<br>一键把修改单交给 AI</div>
    </div>
    <img src="data:image/png;base64,${shotB64}" style="position:absolute;left:640px;top:64px;width:860px;border-radius:14px;box-shadow:0 24px 60px rgba(15,23,42,0.18),0 0 0 1px rgba(15,23,42,0.08)">
  </body></html>`)
  await page.waitForFunction(() => [...document.images].every((i) => i.complete))
  await shot(page, 'promo-marquee-1400x560.png')
  await page.close()
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] })
try {
  await featureShots(browser)
  await promoTile(browser)
  await marqueeTile(browser)
} finally {
  await browser.close()
}
await helpShot()
rmSync(tmp, { recursive: true, force: true })
