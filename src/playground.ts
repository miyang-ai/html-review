import css from './ui/styles.css'
import { h } from './ui/h'
import { Toolbar } from './ui/toolbar'
import { Overlay } from './ui/overlay'
import { CommentPopover } from './ui/popover'
import { Sidebar } from './ui/sidebar'
import { Toast } from './ui/toast'
import { S } from './ui/strings'
import { buildPrompt } from './export/prompt'
import type { CommentItem, ReviewItem, TextEditItem } from './types'

/**
 * 背景：开发规范要求 PlayGround 提供每个 UI 元素的独立 demo，便于单独调样式。
 * 设计意图：每个 demo 放进一个带 transform 的舞台容器，再挂一个独立 Shadow DOM，
 * 组件里的 position:fixed 会相对舞台定位，多个 demo 互不遮挡；数据全部是静态示例，不读写 localStorage。
 * 约束：只在 playground/components.html 使用，不进入正式产物 html-review.js。
 */

const noop = () => {}

/**
 * 背景：舞台容器里可能放着示例元素（覆盖层 demo 需要对齐它们），直接在容器上开 Shadow DOM 会把示例元素隐藏。
 * 设计意图：在容器内追加一个子元素作为宿主，组件的 fixed 定位仍以带 transform 的容器为参照。
 */
function stage(id: string): HTMLDivElement {
  const container = document.getElementById(id)
  if (!container) throw new Error(`缺少舞台容器 #${id}`)
  const host = document.createElement('div')
  container.append(host)
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = css
  const root = h('div', { class: 'root' })
  shadow.append(style, root)
  return root
}

const anchor = (section: string, text: string) => ({ xpath: '/html/body/div/p[1]', selector: 'p.lead', section, text, html: `<p>${text}</p>` })

const sampleEdit: TextEditItem = {
  id: 'E1',
  kind: 'edit',
  anchor: anchor('结论与推理链', '累了的周五晚上，87% 的人第一选择是一个人待着。'),
  beforeHtml: '累了的周五晚上，87% 的人第一选择是一个人待着。',
  afterHtml: '累了的周五晚上，87% 的人首选一个人待着。',
  beforeText: '累了的周五晚上，87% 的人第一选择是一个人待着。',
  afterText: '累了的周五晚上，87% 的人首选一个人待着。',
  status: 'pending',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
const appliedEdit: TextEditItem = { ...sampleEdit, id: 'E2', status: 'applied', beforeText: '多数人的位置是屏幕', afterText: '多数人把别人放在屏幕里' }
const sampleComment: CommentItem = {
  id: 'C1',
  kind: 'comment',
  anchors: [anchor('起点：「别人」有三种位置', '真空 屏幕 现场'), anchor('起点：「别人」有三种位置', '屏幕')],
  body: '三张卡片改成横向条形图，突出 66%',
  replies: [{ id: 'R1', body: '颜色沿用全文主色', createdAt: Date.now() }],
  status: 'exported',
  createdAt: Date.now(),
  updatedAt: Date.now(),
}
const resolvedComment: CommentItem = { ...sampleComment, id: 'C2', status: 'resolved', replies: [], body: '标题太长，压成一句' }

function demoToolbar(): void {
  const a = new Toolbar(stage('st-toolbar-collapsed'), { onText: noop, onComment: noop, onSidebar: noop, onCopy: noop })
  a.update({ mode: 'browse', sidebarOpen: false, pending: 3 })
  const b = new Toolbar(stage('st-toolbar-text'), { onText: noop, onComment: noop, onSidebar: noop, onCopy: noop })
  b.update({ mode: 'text', sidebarOpen: false, pending: 1 })
  const c = new Toolbar(stage('st-toolbar-comment'), { onText: noop, onComment: noop, onSidebar: noop, onCopy: noop })
  c.update({ mode: 'comment', sidebarOpen: true, pending: 0 })
}

function demoModeBadge(): void {
  stage('st-badge-text').append(h('div', { class: 'mode-badge text', text: S.modeText }))
  stage('st-badge-comment').append(h('div', { class: 'mode-badge comment', text: S.modeComment }))
}

/** 覆盖层按视口坐标绘制，舞台不加 transform，滚动时重新对齐 */
function demoOverlay(): void {
  const mk = (id: string) => {
    const host = document.getElementById(id)!
    host.style.transform = 'none'
    return stage(id)
  }
  const sampleOf = (id: string) => document.getElementById(id)!

  const o1 = new Overlay(mk('st-hover-text'))
  o1.showHover(sampleOf('sm-hover-text'), 'text', S.hoverEditable)
  const o2 = new Overlay(mk('st-hover-edited'))
  o2.showHover(sampleOf('sm-hover-edited'), 'text', S.hoverEdited.replace('{text}', '87% 的人第一选择是一个人待着'))
  const o3 = new Overlay(mk('st-hover-comment'))
  o3.showHover(sampleOf('sm-hover-comment'), 'comment', `div.card · ${S.hoverParentHint}`)
  const o4 = new Overlay(mk('st-selection'))
  o4.showSelection([sampleOf('sm-sel-1'), sampleOf('sm-sel-2')])
  const marqueeHost = document.getElementById('st-marquee')!
  const o5 = new Overlay(mk('st-marquee'))
  const o6 = new Overlay(mk('st-pins'))
  o6.setPins([
    { id: 'C1', label: '1', status: 'pending', el: sampleOf('sm-pin-1'), targetIndex: 0, stack: 0 },
    { id: 'C2', label: '2', status: 'exported', el: sampleOf('sm-pin-2'), targetIndex: 0, stack: 0 },
    { id: 'C3', label: '3', status: 'pending', el: sampleOf('sm-pin-2'), targetIndex: 0, stack: 1 },
  ])
  const flashBtn = document.getElementById('btn-flash')!
  flashBtn.addEventListener('click', () => o6.flash(sampleOf('sm-pin-1')))

  const sync = () => {
    for (const o of [o1, o2, o3, o4, o6]) o.reposition()
    const r = marqueeHost.getBoundingClientRect()
    o5.showMarquee({ x: r.left + 40, y: r.top + 20, w: 260, h: 70 })
  }
  sync()
  window.addEventListener('scroll', sync, { passive: true })
  window.addEventListener('resize', sync)
}

function demoPopover(): void {
  const p1 = new CommentPopover(stage('st-pop-new'))
  p1.openNew(2, new DOMRect(16, 0, 0, 0), { onSubmit: noop, onCancel: noop })
  const handlers = { onEditBody: noop, onReply: noop, onDeleteReply: noop, onToggleResolved: noop, onDelete: noop, onLocate: noop, onClose: noop }
  const p2 = new CommentPopover(stage('st-pop-existing'))
  p2.openExisting(sampleComment, new DOMRect(16, 0, 0, 0), handlers)
  const p3 = new CommentPopover(stage('st-pop-resolved'))
  p3.openExisting(resolvedComment, new DOMRect(16, 0, 0, 0), handlers)
}

function demoSidebar(): void {
  const handlers = {
    onLocate: noop,
    onOpenComment: noop,
    onRevertEdit: noop,
    onRevertEdits: noop,
    onToggleResolved: noop,
    onDelete: noop,
    onCopyPending: noop,
    onCopySelected: noop,
    onExportedToDone: noop,
    onClearDone: noop,
    onExportXml: noop,
    onImportXml: noop,
    onClose: noop,
  }
  const s1 = new Sidebar(stage('st-sidebar'), handlers)
  s1.setOpen(true)
  const items: ReviewItem[] = [sampleEdit, appliedEdit, sampleComment, resolvedComment]
  s1.render(items.map((item) => ({ item, lost: item.id === 'C1' })))
  const s2 = new Sidebar(stage('st-sidebar-empty'), handlers)
  s2.setOpen(true)
  s2.render([])
}

function demoToast(): void {
  const t1 = new Toast(stage('st-toast'))
  t1.show(S.toastCopied.replace('{n}', '3'), { action: { label: S.toastUndo, run: noop }, ms: 1e9 })
  const t2 = new Toast(stage('st-toast-error'))
  t2.show(S.toastImportFailed.replace('{msg}', '文件不是合法的 XML'), { error: true, ms: 1e9 })
  const t3 = new Toast(stage('st-toast-manual'))
  document.getElementById('btn-manual')!.addEventListener('click', () => t3.manualCopy('修改要求全文…'))
}

function demoPrompt(): void {
  const pre = document.getElementById('prompt-text')!
  pre.textContent = buildPrompt([sampleEdit, sampleComment], {
    source: '/Users/you/Documents/示例/insight/index.html',
    isLocalFile: true,
    title: '「别人」放在哪里，AI 就会被放在哪里',
    exportedAt: Date.now(),
  })
}

for (const fn of [demoToolbar, demoModeBadge, demoOverlay, demoPopover, demoSidebar, demoToast, demoPrompt]) {
  try {
    fn()
  } catch (err) {
    console.error('[html-review playground] demo 渲染失败', fn.name, err)
    document.body.insertAdjacentHTML('afterbegin', `<p style="color:#dc2626">demo ${fn.name} 渲染失败，详见 Console</p>`)
  }
}
