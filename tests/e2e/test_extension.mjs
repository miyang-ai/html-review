/**
 * 背景：插件的价值在「点一下就能在任何页面上用」：普通网页、已用 script 标签挂载的页面、严格 CSP 网站、
 * 本地文件、浏览器禁止注入的页面，每种都要有正确的表现，这些只能在真实 Chrome 里验证。
 * 设计意图：用 puppeteer-core 把 dist/extension 加载进本机 Chrome，起一个本地 http 服务提供测试页，
 * 在 service worker 里直接调用 htmlReviewActivate(tab) 模拟点击图标。
 * 约束：
 * - activeTab 只能由真实的用户点击授予，自动化无法触发，所以测试用的插件副本额外加了 host_permissions，
 *   后台逻辑和正式包完全相同；
 * - 「允许访问文件网址」默认关闭，正好用来验证 file:// 引导流程；
 * - 需要先 npm run build；Chrome 路径可用 CHROME_PATH 覆盖。
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

let browser, worker, server, base, dir
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BODY = '<h1>插件测试页</h1><p id="p1">原始段落文字，用来测试插件挂载。</p><p id="p2">第二段文字。</p>'
const pageHtml = (withScript) =>
  `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>插件测试</title></head><body>${BODY}${
    withScript ? '<script src="/html-review.js"></script>' : ''
  }</body></html>`

/** 本地测试服务：/page.html 带 script 标签，加 ?bare=1 时不带；/csp.html 带最严格的 CSP 响应头 */
function startServer() {
  const script = readFileSync(join(root, 'dist/html-review.js'))
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x')
    if (url.pathname === '/html-review.js') {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' })
      return res.end(script)
    }
    if (url.pathname === '/page.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      return res.end(pageHtml(!url.searchParams.has('bare')))
    }
    if (url.pathname === '/csp.html') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'",
      })
      return res.end(pageHtml(false))
    }
    res.writeHead(404)
    res.end()
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)))
}

/**
 * 在后台 service worker 里对当前页面所在标签页执行「点击图标」。
 * 浏览器内部页的地址对插件不可见，用页面标题匹配；其余用地址匹配。
 */
async function findTab(page) {
  const url = page.url()
  const title = await page.title()
  return worker.evaluate(
    async (u, t) => {
      const tabs = await chrome.tabs.query({})
      const hidden = tabs.filter((x) => !x.url)
      const tab = tabs.find((x) => x.url === u) ?? hidden.find((x) => x.title === t) ?? (hidden.length === 1 ? hidden[0] : undefined)
      if (!tab) throw new Error(`找不到标签页 ${u}，现有：${tabs.map((x) => `${x.url}|${x.title}`).join(', ')}`)
      return tab.id
    },
    url,
    title,
  )
}

async function activate(page) {
  const id = await findTab(page)
  return worker.evaluate(async (tabId) => globalThis.htmlReviewActivate(await chrome.tabs.get(tabId)), id)
}

const roots = (page) => page.evaluate(() => document.querySelectorAll('html-review-root').length)
const sidebarOpen = (page) => page.evaluate(() => !!document.querySelector('html-review-root')?.shadowRoot.querySelector('.sidebar.open'))

async function newPage(url) {
  const page = await browser.newPage()
  page.on('pageerror', (err) => console.error('[page error]', err))
  await page.goto(url, { waitUntil: 'load' })
  return page
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'html-review-ext-'))
  const ext = join(dir, 'extension')
  cpSync(join(root, 'dist/extension'), ext, { recursive: true })
  const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json'), 'utf8'))
  manifest.host_permissions = ['<all_urls>']
  writeFileSync(join(ext, 'manifest.json'), JSON.stringify(manifest, null, 2))
  base = await startServer()
  browser = await puppeteer.launch({ executablePath: CHROME, headless: true, pipe: true, enableExtensions: [ext] })
  const target = await browser.waitForTarget((t) => t.type() === 'service_worker' && t.url().endsWith('/background.js'), { timeout: 15000 })
  worker = await target.worker()
  // 启动时的空白页对插件同样不可见，关掉它，避免和 chrome:// 页面混淆
  for (const p of await browser.pages()) if (p.url() === 'about:blank') await p.close()
})

after(async () => {
  await browser?.close()
  server?.close()
  if (dir) rmSync(dir, { recursive: true, force: true })
})

test('安装后自动打开引导页：版本号、关于米羊、招聘邀请、本地文件权限提示', async () => {
  let help = null
  for (let i = 0; i < 30 && !help; i++) {
    help = (await browser.pages()).find((p) => p.url().includes('/help.html'))
    if (!help) await sleep(100)
  }
  assert.ok(help, '安装时打开了引导页')
  await help.waitForFunction(() => document.getElementById('version')?.textContent !== '')
  const info = await help.evaluate(() => ({
    version: document.getElementById('version').textContent,
    about: document.getElementById('about').textContent,
    site: !!document.querySelector('#about a[href="https://miyang.cn"]'),
    careers: !!document.querySelector('#join a[href="https://miyang.cn/careers"]'),
    mail: !!document.querySelector('#join a[href^="mailto:eason@miyang.ai"]'),
    fileOk: getComputedStyle(document.getElementById('file-ok')).display !== 'none',
    fileOff: getComputedStyle(document.getElementById('file-off')).display !== 'none',
    stepsShown: getComputedStyle(document.getElementById('file-steps')).display !== 'none',
    icons: document.querySelectorAll('[data-icon] svg').length,
  }))
  const allowed = await help.evaluate(() => chrome.extension.isAllowedFileSchemeAccess())
  assert.equal(info.version, `v${version}`)
  assert.ok(info.about.includes('米羊科技（上海）有限公司'))
  assert.ok(info.site && info.careers && info.mail, '官网、职位页、简历邮箱链接齐全')
  assert.equal(info.fileOk, allowed, '权限状态与浏览器实际状态一致（按实际可见性判断）')
  assert.equal(info.fileOff, !allowed, '「已允许 / 未允许」只显示一条')
  assert.equal(info.stepsShown, !allowed)
  assert.ok(info.icons >= 10, '图标已内联渲染')
  await help.close()
})

test('普通网页：点图标注入，工具条出现且样式生效', async () => {
  const page = await newPage(`${base}/page.html?bare=1`)
  assert.equal(await page.evaluate(() => !!window.__htmlReview), false)
  assert.equal(await activate(page), 'mounted')
  await page.waitForFunction(() => !!window.__htmlReview)
  const st = await page.evaluate(() => {
    const tb = document.querySelector('html-review-root').shadowRoot.querySelector('.toolbar')
    return { version: window.__htmlReview.version, position: getComputedStyle(tb).position }
  })
  assert.equal(st.version, version)
  assert.equal(st.position, 'fixed')
  await page.close()
})

test('再点一次：打开修改清单，不重复挂载', async () => {
  const page = await newPage(`${base}/page.html?bare=1`)
  await activate(page)
  await page.waitForFunction(() => !!window.__htmlReview)
  assert.equal(await activate(page), 'mounted')
  await sleep(100)
  assert.equal(await roots(page), 1)
  assert.equal(await sidebarOpen(page), true)
  await page.close()
})

test('页面已用 script 标签挂载：点图标不会出现第二套工具条', async () => {
  const page = await newPage(`${base}/page.html`)
  await page.waitForFunction(() => !!window.__htmlReview)
  assert.equal(await activate(page), 'mounted')
  await sleep(100)
  assert.equal(await roots(page), 1)
  assert.equal(await sidebarOpen(page), true)
  await page.close()
})

test('严格 CSP 网站（default-src / style-src self）：注入成功，样式不被拦截', async () => {
  const page = await newPage(`${base}/csp.html`)
  assert.equal(await activate(page), 'mounted')
  await page.waitForFunction(() => !!window.__htmlReview)
  const st = await page.evaluate(() => {
    const tb = document.querySelector('html-review-root').shadowRoot.querySelector('.toolbar')
    const cs = getComputedStyle(tb)
    return { position: cs.position, radius: cs.borderTopLeftRadius, pageSheets: document.adoptedStyleSheets.length }
  })
  assert.equal(st.position, 'fixed', '工具条样式生效')
  assert.equal(st.radius, '999px')
  assert.ok(st.pageSheets >= 1, '页面级样式经可构造样式表注入')
  await page.keyboard.press('t')
  const p1 = await page.$eval('#p1', (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + 10, y: r.top + r.height / 2 }
  })
  await page.mouse.click(p1.x, p1.y)
  await page.keyboard.press('End')
  await page.keyboard.type('（CSP）')
  await page.keyboard.press('Enter')
  const bg = await page.$eval('#p1', (el) => getComputedStyle(el).backgroundColor)
  assert.notEqual(bg, 'rgba(0, 0, 0, 0)', '已改文字的底色生效')
  await page.close()
})

test('数据互通：script 标签挂载时改的字，用插件打开同一页面能看到', async () => {
  const page = await newPage(`${base}/page.html`)
  await page.waitForFunction(() => !!window.__htmlReview)
  await page.keyboard.press('t')
  const p2 = await page.$eval('#p2', (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + 10, y: r.top + r.height / 2 }
  })
  await page.mouse.click(p2.x, p2.y)
  await page.keyboard.press('End')
  await page.keyboard.type('【互通】')
  await page.keyboard.press('Enter')
  await page.goto(`${base}/page.html?bare=1`, { waitUntil: 'load' })
  assert.equal(await page.evaluate(() => !!window.__htmlReview), false, '无 script 标签的版本')
  assert.ok(!(await page.$eval('#p2', (el) => el.textContent)).includes('【互通】'))
  assert.equal(await activate(page), 'mounted')
  await page.waitForFunction(() => document.getElementById('p2').textContent.includes('【互通】'))
  assert.equal(await page.$eval('#p2', (el) => el.getAttribute('data-hr-edit-id')), 'E1')
  await page.close()
})

test('本地文件且已允许访问文件网址：直接注入', async () => {
  const allowed = await worker.evaluate(() => chrome.extension.isAllowedFileSchemeAccess())
  if (!allowed) return
  const file = join(dir, 'local-ok.html')
  writeFileSync(file, pageHtml(false))
  const page = await newPage(pathToFileURL(file).href)
  assert.equal(await activate(page), 'mounted')
  await page.waitForFunction(() => !!window.__htmlReview)
  await page.close()
})

test('本地文件且未允许访问文件网址：打开引导页并高亮权限卡片', async () => {
  const file = join(dir, 'local.html')
  writeFileSync(file, pageHtml(false))
  const page = await newPage(pathToFileURL(file).href)
  // 自动化加载的插件默认已允许访问文件网址；用户安装的插件默认关闭，这里模拟关闭状态
  await worker.evaluate(() => {
    globalThis.__realFileAccess = chrome.extension.isAllowedFileSchemeAccess
    chrome.extension.isAllowedFileSchemeAccess = async () => false
  })
  let outcome
  try {
    outcome = await activate(page)
  } finally {
    await worker.evaluate(() => {
      chrome.extension.isAllowedFileSchemeAccess = globalThis.__realFileAccess
    })
  }
  assert.equal(outcome, 'need-file-access')
  let help = null
  for (let i = 0; i < 30 && !help; i++) {
    help = (await browser.pages()).find((p) => p.url().endsWith('/help.html#file-access'))
    if (!help) await sleep(100)
  }
  assert.ok(help, '打开了引导页')
  await help.waitForFunction(() => document.getElementById('file-access').classList.contains('highlight'))
  assert.equal(await page.evaluate(() => !!window.__htmlReview), false)
  await help.close()
  await page.close()
})

test('浏览器禁止注入的页面：图标显示角标，跳转后自动清除', async () => {
  const page = await newPage('chrome://version/')
  const tabId = await findTab(page)
  assert.equal(await activate(page), 'restricted')
  const badge = await worker.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tabId)
  assert.equal(badge, '!')
  const title = await worker.evaluate((id) => chrome.action.getTitle({ tabId: id }), tabId)
  assert.ok(title.length > 10, title)
  await page.goto(`${base}/page.html?bare=1`, { waitUntil: 'load' })
  await sleep(200)
  assert.equal(await worker.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tabId), '')
  await page.close()
})
