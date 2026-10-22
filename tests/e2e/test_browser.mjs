/**
 * 背景：改字、框选、输入法、快捷键隔离、刷新恢复这些行为依赖真实浏览器（布局、XPath、contenteditable），
 * jsdom 无法覆盖。
 * 设计意图：用 puppeteer-core 驱动本机已安装的 Chrome（不额外下载浏览器），
 * 把 playground/index.html 复制到临时目录作为被测页面，这样可以改写「源文件」来验证「已生效」识别。
 * 约束：需要先 npm run build；Chrome 路径可用 CHROME_PATH 覆盖。
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

let browser, page, dir, pagePath, pageUrl

const shadow = (sel) => page.evaluateHandle((s) => document.querySelector('html-review-root').shadowRoot.querySelector(s), sel)
const items = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__htmlReview.app.store.items)))
const mode = () => page.evaluate(() => document.documentElement.getAttribute('data-hr-mode'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function rectOf(selector) {
  return page.$eval(selector, (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  })
}

async function scrollTo(selector) {
  await page.$eval(selector, (el) => el.scrollIntoView({ block: 'center' }))
  await sleep(50)
}

async function openFresh() {
  await page.goto(pageUrl, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__htmlReview)
  await page.evaluate(() => {
    window.__copied = null
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t } } })
  })
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'html-review-e2e-'))
  const html = readFileSync(join(root, 'playground/index.html'), 'utf8').replace(
    '../dist/html-review.js',
    pathToFileURL(join(root, 'dist/html-review.js')).href,
  )
  pagePath = join(dir, 'report.html')
  writeFileSync(pagePath, html)
  copyFileSync(join(root, 'playground/playground.css'), join(dir, 'playground.css'))
  pageUrl = pathToFileURL(pagePath).href
  browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] })
  page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })
  page.on('pageerror', (err) => console.error('[page error]', err))
  await openFresh()
  await page.evaluate(() => localStorage.clear())
  await openFresh()
})

after(async () => {
  await browser?.close()
  if (dir) rmSync(dir, { recursive: true, force: true })
})

test('挂载：工具条出现，无条目', async () => {
  assert.ok(await shadow('.toolbar'))
  assert.equal((await items()).length, 0)
})

test('T 进入改字模式，再按退出；Alt+T 同样生效', async () => {
  await page.keyboard.press('t')
  assert.equal(await mode(), 'text')
  await page.keyboard.press('t')
  assert.equal(await mode(), null)
  await page.keyboard.down('Alt')
  await page.keyboard.press('KeyT')
  await page.keyboard.up('Alt')
  assert.equal(await mode(), 'text')
})

test('改字：悬停高亮，点击段落内的徽标编辑整段，Enter 保存', async () => {
  await scrollTo('#target-lead')
  const r = await rectOf('#target-lead .lbl')
  await page.mouse.move(r.x + 5, r.y + 5)
  await sleep(50)
  const hoverVisible = await page.evaluate(() => {
    const box = document.querySelector('html-review-root').shadowRoot.querySelector('.box.hover-text')
    return box && box.style.display !== 'none'
  })
  assert.ok(hoverVisible, '悬停框应显示')

  const p = await rectOf('#target-lead')
  await page.mouse.click(p.x + p.w - 4, p.y + p.h / 2)
  assert.equal(await page.$eval('#target-lead', (el) => el.hasAttribute('data-hr-editing')), true)
  await page.keyboard.press('End')
  await page.keyboard.type('【补充】')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Space')
  await page.keyboard.press('Enter')

  const list = await items()
  assert.equal(list.length, 1)
  const e1 = list[0]
  assert.equal(e1.id, 'E1')
  assert.equal(e1.kind, 'edit')
  assert.ok(e1.afterText.includes('【补充'), e1.afterText)
  assert.ok(e1.beforeHtml.includes('<span class="lbl data">数据</span>'), '原文保留行内标签')
  assert.ok(!e1.afterHtml.includes('data-hr-'), '新文不含工具属性')
  assert.equal(await page.$eval('#target-lead', (el) => el.getAttribute('data-hr-edit-id')), 'E1')
  assert.equal(await page.$eval('#target-lead', (el) => el.hasAttribute('contenteditable')), false)
})

test('编辑中的按键不会到达页面（Deck 快捷键隔离）', async () => {
  await page.evaluate(() => (window.__pageKeys = []))
  const p = await rectOf('#slot + .grid3 .card p')
  await page.mouse.click(p.x + 10, p.y + p.h / 2)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await page.keyboard.press('Escape')
  assert.deepEqual(await page.evaluate(() => window.__pageKeys), [])
})

test('Esc 放弃编辑，内容恢复，不产生记录', async () => {
  const before = await page.$eval('ol.chain li', (el) => el.innerHTML)
  await scrollTo('ol.chain li')
  const r = await rectOf('ol.chain li')
  await page.mouse.click(r.x + 20, r.y + r.h / 2)
  await page.keyboard.type('乱打的字')
  await page.keyboard.press('Escape')
  await sleep(700)
  assert.equal(await page.$eval('ol.chain li', (el) => el.innerHTML), before)
  assert.equal((await items()).length, 1)
})

test('输入中实时保存（不按回车也已写入 localStorage）', async () => {
  const r = await rectOf('table tbody tr td')
  await page.mouse.click(r.x + 10, r.y + r.h / 2)
  await page.keyboard.press('End')
  await page.keyboard.type('区')
  await sleep(800)
  const stored = await page.evaluate(() => Object.entries(localStorage).find(([k]) => k.startsWith('html-review:v1:'))[1])
  assert.ok(stored.includes('屏幕区'), '防抖后已保存')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  assert.equal(await mode(), null)
})

test('批注：C 进入，单击卡片，Enter 保存；输入法组合中的 Enter 不提交', async () => {
  await page.keyboard.press('c')
  assert.equal(await mode(), 'comment')
  await scrollTo('#grid')
  const card = await rectOf('#grid .card:nth-child(2) .note')
  await page.mouse.move(card.x + 5, card.y + 5)
  await page.keyboard.down('Alt')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.up('Alt')
  await page.mouse.click(card.x + 5, card.y + 5)
  const ta = await shadow('.popover textarea')
  assert.ok(ta, '弹出批注框')
  await ta.type('卡片改成条形图')
  await ta.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, composed: true })))
  assert.equal((await items()).filter((i) => i.kind === 'comment').length, 0, '组合中的 Enter 不应提交')
  await page.keyboard.press('Enter')
  const c1 = (await items()).find((i) => i.id === 'C1')
  assert.ok(c1)
  assert.equal(c1.anchors.length, 1)
  assert.ok(c1.anchors[0].html.startsWith('<div class="card">'), 'Alt+↑ 选中整张卡片')
  assert.equal(c1.anchors[0].section, '01起点：「别人」有三种位置')
  const resolved = await page.evaluate((xp) => document.evaluate(xp, document, null, 9, null).singleNodeValue?.className, c1.anchors[0].xpath)
  assert.equal(resolved, 'card')
  assert.ok(await shadow('.pin'), '出现编号圆点')
})

test('框选：框住三张卡片，合并为卡片网格', async () => {
  const g = await rectOf('#grid')
  await page.mouse.move(g.x - 6, g.y - 6)
  await page.mouse.down()
  await page.mouse.move(g.x + g.w / 2, g.y + g.h / 2, { steps: 4 })
  await page.mouse.move(g.x + g.w + 6, g.y + g.h + 6, { steps: 4 })
  await page.mouse.up()
  const count = await page.evaluate(() => window.__htmlReview.app.picker.selection.map((e) => e.id))
  assert.deepEqual(count, ['grid'])
  const ta = await shadow('.popover textarea')
  await ta.type('整组改成横向布局')
  await page.keyboard.press('Enter')
  const c2 = (await items()).find((i) => i.id === 'C2')
  assert.equal(c2.anchors[0].selector, '#grid')
})

test('Shift+单击多选，一条批注多个目标；SVG 元素 XPath 可解析', async () => {
  await scrollTo('#bar')
  const r1 = await rectOf('#bar rect:nth-of-type(1)')
  const r2 = await rectOf('#bar rect:nth-of-type(2)')
  await page.mouse.click(r1.x + 5, r1.y + 5)
  await page.keyboard.down('Shift')
  await page.mouse.click(r2.x + 5, r2.y + 5)
  await page.keyboard.up('Shift')
  const meta = await (await shadow('.popover .pop-meta')).evaluate((el) => el.textContent)
  assert.equal(meta, '2 个元素')
  await (await shadow('.popover textarea')).type('两根柱子换成主色')
  await page.keyboard.press('Enter')
  const c3 = (await items()).find((i) => i.id === 'C3')
  assert.equal(c3.anchors.length, 2)
  for (const a of c3.anchors) {
    const tag = await page.evaluate((xp) => document.evaluate(xp, document, null, 9, null).singleNodeValue?.localName, a.xpath)
    assert.equal(tag, 'rect', a.xpath)
  }
  await page.keyboard.press('Escape')
  assert.equal(await mode(), null)
})

test('点击圆点打开批注，追加评论', async () => {
  await scrollTo('#grid')
  await sleep(100)
  const pin = await shadow('.pin')
  await pin.click()
  const reply = await shadow('.reply-box textarea')
  await reply.type('颜色沿用主色')
  await page.keyboard.press('Enter')
  const c1 = (await items()).find((i) => i.id === 'C1')
  assert.equal(c1.replies.length, 1)
  assert.equal(c1.replies[0].body, '颜色沿用主色')
  await page.keyboard.press('Escape')
})

test('复制修改要求：按页面顺序、XML 合法、条目变为已导出', async () => {
  await page.evaluate(() => window.__htmlReview.app.copyRequest())
  const prompt = await page.evaluate(() => window.__copied)
  assert.ok(prompt.startsWith('请按下面的修改单修改源文件。'))
  assert.ok(prompt.includes(`源文件：${pagePath}`), '包含本地源文件路径')
  const order = [...prompt.matchAll(/<item id="(\w+)"/g)].map((m) => m[1])
  // 网格 C2 是卡片 C1 的祖先，文档顺序在前
  assert.deepEqual(order, ['E1', 'C2', 'C1', 'E2', 'C3'])
  const xml = prompt.slice(prompt.indexOf('<review'), prompt.indexOf('</review>') + 9)
  const ok = await page.evaluate((x) => new DOMParser().parseFromString(x, 'application/xml').getElementsByTagName('parsererror').length === 0, xml)
  assert.ok(ok, 'XML 合法')
  assert.ok((await items()).every((i) => i.status === 'exported'))
})

test('JS 重绘后，改字和批注自动挂回', async () => {
  await page.keyboard.press('t')
  await scrollTo('#dynamic-box')
  const r = await rectOf('#dynamic-box .card p')
  await page.mouse.click(r.x + 10, r.y + r.h / 2)
  await page.keyboard.press('End')
  await page.keyboard.type('（已改）')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await page.click('#rerender')
  await sleep(700)
  const text = await page.$eval('#dynamic-box .card p', (el) => el.textContent)
  assert.ok(text.endsWith('（已改）'), text)
  assert.equal(await page.$eval('#dynamic-box .card p', (el) => el.getAttribute('data-hr-edit-id')), 'E3')
})

test('刷新后恢复：改字重新应用，圆点重新出现', async () => {
  await openFresh()
  await sleep(200)
  const lead = await page.$eval('#target-lead', (el) => ({ text: el.textContent, id: el.getAttribute('data-hr-edit-id') }))
  assert.ok(lead.text.includes('【补充'), lead.text)
  assert.equal(lead.id, 'E1')
  const pins = await page.evaluate(() => document.querySelector('html-review-root').shadowRoot.querySelectorAll('.pin').length)
  assert.equal(pins, 4, 'C1 一个、C2 一个、C3 两个')
})

test('AI 改完源文件后刷新：改字自动识别为已生效', async () => {
  const e1 = (await items()).find((i) => i.id === 'E1')
  let src = readFileSync(pagePath, 'utf8')
  const start = src.indexOf('<p class="lead" id="target-lead">')
  const end = src.indexOf('</p>', start)
  src = src.slice(0, start) + `<p class="lead" id="target-lead">${e1.afterHtml}` + src.slice(end)
  writeFileSync(pagePath, src)
  await openFresh()
  await sleep(200)
  const after = (await items()).find((i) => i.id === 'E1')
  assert.equal(after.status, 'applied')
  assert.equal(await page.$eval('#target-lead', (el) => el.hasAttribute('data-hr-edit-id')), false)
})

test('导出 / 导入修改单往返（经由修改清单按钮）', async () => {
  const before = await items()
  const dl = join(dir, 'downloads')
  const cdp = await browser.target().createCDPSession()
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl, eventsEnabled: true })

  await (await shadow('.tb-main')).click()
  await sleep(400)
  const exportBtn = await page.evaluateHandle(() =>
    [...document.querySelector('html-review-root').shadowRoot.querySelectorAll('.sb-foot .btn')].find((b) => b.textContent.includes('导出修改单')),
  )
  await exportBtn.click()
  let file = null
  for (let i = 0; i < 40 && !file; i++) {
    await sleep(100)
    try {
      file = readdirSync(dl).find((f) => f.endsWith('.xml'))
    } catch {
      file = null
    }
  }
  assert.ok(file, '已下载 XML')
  const xml = readFileSync(join(dl, file), 'utf8')
  assert.ok(xml.includes('<html_review version="1"'))

  await page.evaluate(() => localStorage.clear())
  await openFresh()
  assert.equal((await items()).length, 0)
  await (await shadow('.tb-main')).click()
  await sleep(400)
  const input = await shadow('.sidebar input[type=file]')
  await input.uploadFile(join(dl, file))
  await page.waitForFunction(() => window.__htmlReview.app.store.items.length > 0)
  const restored = await items()
  assert.deepEqual(restored.map((i) => [i.id, i.status]), before.map((i) => [i.id, i.status]))
  const lead = await page.$eval('#dynamic-box .card p', (el) => el.textContent)
  assert.ok(lead.endsWith('（已改）'), '导入后改字重新应用')
})

test('批量还原改字：未勾选时还原全部未处理改字，可撤回', async () => {
  const footBtn = (label) =>
    page.evaluateHandle(
      (l) => [...document.querySelector('html-review-root').shadowRoot.querySelectorAll('.sb-foot .btn')].find((b) => b.textContent.includes(l)),
      label,
    )
  const before = await items()
  const live = before.filter((i) => i.kind === 'edit' && i.status !== 'applied' && i.status !== 'resolved').map((i) => i.id)
  assert.ok(live.length >= 1, '前置：至少一条未处理改字')

  await (await footBtn('还原全部改字')).click()
  const after = await items()
  assert.deepEqual(after.filter((i) => live.includes(i.id)), [], '未处理改字已删除')
  assert.ok(after.some((i) => i.id === 'E1'), '已生效的改字不受影响')
  assert.equal(after.filter((i) => i.kind === 'comment').length, before.filter((i) => i.kind === 'comment').length, '批注不受影响')
  const text = await page.$eval('#dynamic-box .card p', (el) => ({ t: el.textContent, id: el.getAttribute('data-hr-edit-id') }))
  assert.ok(!text.t.endsWith('（已改）'), '页面恢复原文')
  assert.equal(text.id, null)

  const undo = await shadow('.toast button')
  await undo.click()
  await sleep(100)
  assert.deepEqual((await items()).map((i) => i.id), before.map((i) => i.id), '撤回后记录恢复')
  const back = await page.$eval('#dynamic-box .card p', (el) => el.textContent)
  assert.ok(back.endsWith('（已改）'), '撤回后改字重新应用')
})

test('批量还原改字：勾选后只还原选中的', async () => {
  const live = (await items()).filter((i) => i.kind === 'edit' && i.status !== 'applied' && i.status !== 'resolved').map((i) => i.id)
  const pick = live[live.length - 1]
  await page.evaluate((id) => {
    const root = document.querySelector('html-review-root').shadowRoot
    const row = [...root.querySelectorAll('.sb-item')].find((r) => r.querySelector('.sb-id')?.textContent === id)
    row.querySelector('.sb-check').click()
  }, pick)
  const btn = await page.evaluateHandle(() =>
    [...document.querySelector('html-review-root').shadowRoot.querySelectorAll('.sb-foot .btn')].find((b) => b.textContent.includes('还原选中改字')),
  )
  assert.ok(await btn.evaluate((b) => b.textContent.includes('（1）')))
  await btn.click()
  const ids = (await items()).map((i) => i.id)
  assert.ok(!ids.includes(pick), '选中的已还原')
  for (const id of live.filter((x) => x !== pick)) assert.ok(ids.includes(id), `${id} 未被还原`)
})

test('框选半句话：只圈住段落里的一段文字，也能选中所在段落', async () => {
  await openFresh()
  await page.keyboard.press('c')
  await scrollTo('.infer')
  const r = await page.$eval('.infer', (el) => {
    const tn = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim())
    const range = document.createRange()
    range.setStart(tn, 4)
    range.setEnd(tn, 14)
    const b = range.getClientRects()[0]
    return { x: b.left, y: b.top, w: b.width, h: b.height }
  })
  await page.mouse.move(r.x - 4, r.y - 4)
  await page.mouse.down()
  for (let i = 1; i <= 6; i++) await page.mouse.move(r.x - 4 + ((r.w + 8) * i) / 6, r.y - 4 + ((r.h + 8) * i) / 6)
  await page.mouse.up()
  const sel = await page.evaluate(() => window.__htmlReview.app.picker.selection.map((e) => e.className))
  assert.deepEqual(sel, ['infer'])
  assert.ok(await shadow('.popover:not([hidden])'), '新建批注框已打开')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
})

test('挂载中途失败：回滚样式与标记，修复后可正常再挂载', async () => {
  await openFresh()
  const scriptUrl = pathToFileURL(join(root, 'dist/html-review.js')).href
  const remount = (url) => page.evaluate((u) => new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = `${u}?t=${Date.now()}`
    s.onload = resolve
    document.body.appendChild(s)
  }), url)
  const state = () => page.evaluate(() => ({
    mounted: !!window.__htmlReview,
    hosts: document.querySelectorAll('html-review-root').length,
    mark: document.documentElement.hasAttribute('data-hr-styles'),
    sheets: document.adoptedStyleSheets.length,
  }))

  await page.evaluate(() => {
    window.__htmlReview.destroy()
    window.__alerts = []
    window.alert = (m) => window.__alerts.push(m)
    window.__observe = MutationObserver.prototype.observe
    MutationObserver.prototype.observe = () => { throw new Error('observe blocked') }
  })
  await remount(scriptUrl)
  assert.deepEqual(await state(), { mounted: false, hosts: 0, mark: false, sheets: 0 })
  assert.match((await page.evaluate(() => window.__alerts))[0], /observe blocked/)

  await page.evaluate(() => { MutationObserver.prototype.observe = window.__observe })
  await remount(scriptUrl)
  assert.deepEqual(await state(), { mounted: true, hosts: 1, mark: true, sheets: 1 })
  await openFresh()
})
