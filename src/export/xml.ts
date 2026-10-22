import type { Anchor, CommentItem, ItemStatus, PageState, ReviewItem, TextEditItem } from '../types'
import { cdata, escapeXml } from '../text'

const STATUSES: ItemStatus[] = ['pending', 'exported', 'applied', 'resolved']

/**
 * 背景：修改单既要给 AI 读（复制修改要求），也要做本地备份（导出 / 导入），两处结构应保持一致。
 * 设计意图：同一个函数生成条目 XML；full=true 时附带状态、时间、完整 HTML，用于备份可无损导入；
 * full=false 时只保留 AI 需要的定位和意见，HTML 仅在含标签时给出，减少噪音。
 */
export function itemToXml(item: ReviewItem, full: boolean, indent = '  '): string {
  const i1 = indent
  const i2 = indent + '  '
  const meta = full ? ` status="${item.status}" created_at="${item.createdAt}" updated_at="${item.updatedAt}"` : ''
  if (item.kind === 'edit') {
    const lines = [`${i1}<item id="${item.id}" type="text_edit"${meta}>`]
    lines.push(anchorFields(item.anchor, i2, full, false))
    lines.push(`${i2}<before>${escapeXml(item.beforeText)}</before>`)
    lines.push(`${i2}<after>${escapeXml(item.afterText)}</after>`)
    if (full || /<[a-z!/]/i.test(item.beforeHtml + item.afterHtml)) {
      lines.push(`${i2}<before_html>${cdata(item.beforeHtml)}</before_html>`)
      lines.push(`${i2}<after_html>${cdata(item.afterHtml)}</after_html>`)
    }
    lines.push(`${i1}</item>`)
    return lines.join('\n')
  }
  const lines = [`${i1}<item id="${item.id}" type="comment"${meta}>`]
  lines.push(`${i2}<request>${escapeXml(item.body)}</request>`)
  if (item.replies.length) {
    lines.push(`${i2}<replies>`)
    for (const r of item.replies) {
      const rMeta = full ? ` id="${r.id}" created_at="${r.createdAt}"` : ''
      lines.push(`${i2}  <reply${rMeta}>${escapeXml(r.body)}</reply>`)
    }
    lines.push(`${i2}</replies>`)
  }
  lines.push(`${i2}<targets count="${item.anchors.length}">`)
  for (const a of item.anchors) {
    lines.push(`${i2}  <target>`)
    lines.push(anchorFields(a, i2 + '    ', full, true))
    lines.push(`${i2}  </target>`)
  }
  lines.push(`${i2}</targets>`)
  lines.push(`${i1}</item>`)
  return lines.join('\n')
}

function anchorFields(a: Anchor, ind: string, full: boolean, withSnapshot: boolean): string {
  const out = [`${ind}<xpath>${escapeXml(a.xpath)}</xpath>`, `${ind}<selector>${escapeXml(a.selector)}</selector>`]
  if (a.section) out.push(`${ind}<section>${escapeXml(a.section)}</section>`)
  if (full || withSnapshot) {
    out.push(`${ind}<text>${escapeXml(a.text)}</text>`)
    out.push(`${ind}<html>${cdata(a.html)}</html>`)
  }
  return out.join('\n')
}

/**
 * 背景：localStorage 会随清理浏览器数据丢失，用户需要把修改单存成文件。
 * 设计意图：完整序列化为 XML，导入时可无损还原（含状态、时间、序号）。
 */
export function serializeState(state: PageState, exportedAt: number): string {
  const head =
    `<html_review version="1" page="${escapeXml(state.page)}" title="${escapeXml(state.title)}" ` +
    `exported_at="${exportedAt}" seq_edit="${state.seq.edit}" seq_comment="${state.seq.comment}" seq_reply="${state.seq.reply}">`
  const body = state.items.map((item) => itemToXml(item, true)).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n${head}\n${body}\n</html_review>\n`
}

/**
 * 背景：导入备份的修改单。
 * 设计意图：严格校验根节点和必填字段，任何缺失都抛出带说明的错误，由 UI 提示用户，不做部分导入。
 */
export function parseState(xml: string): PageState {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('文件不是合法的 XML')
  const root = doc.documentElement
  if (root.tagName !== 'html_review') throw new Error('根节点不是 html_review，可能不是本工具导出的文件')
  const num = (el: Element, name: string) => {
    const v = Number(el.getAttribute(name))
    return Number.isFinite(v) ? v : 0
  }
  const state: PageState = {
    version: 1,
    page: root.getAttribute('page') ?? '',
    title: root.getAttribute('title') ?? '',
    seq: { edit: num(root, 'seq_edit'), comment: num(root, 'seq_comment'), reply: num(root, 'seq_reply') },
    items: [],
  }
  for (const el of Array.from(root.children).filter((c) => c.tagName === 'item')) {
    state.items.push(parseItem(el))
  }
  return state
}

function parseItem(el: Element): ReviewItem {
  const id = el.getAttribute('id')
  const type = el.getAttribute('type')
  if (!id || !type) throw new Error('条目缺少 id 或 type')
  const statusAttr = el.getAttribute('status') as ItemStatus | null
  const status: ItemStatus = statusAttr && STATUSES.includes(statusAttr) ? statusAttr : 'pending'
  const createdAt = Number(el.getAttribute('created_at')) || Date.now()
  const updatedAt = Number(el.getAttribute('updated_at')) || createdAt
  if (type === 'text_edit') {
    const item: TextEditItem = {
      id,
      kind: 'edit',
      anchor: parseAnchor(el),
      beforeText: childText(el, 'before'),
      afterText: childText(el, 'after'),
      beforeHtml: childText(el, 'before_html') || escapeXml(childText(el, 'before')),
      afterHtml: childText(el, 'after_html') || escapeXml(childText(el, 'after')),
      status,
      createdAt,
      updatedAt,
    }
    return item
  }
  if (type === 'comment') {
    const repliesEl = directChild(el, 'replies')
    const targetsEl = directChild(el, 'targets')
    const item: CommentItem = {
      id,
      kind: 'comment',
      body: childText(el, 'request'),
      replies: repliesEl
        ? Array.from(repliesEl.children).map((r, idx) => ({
            id: r.getAttribute('id') ?? `R-import-${idx}`,
            body: r.textContent ?? '',
            createdAt: Number(r.getAttribute('created_at')) || createdAt,
          }))
        : [],
      anchors: targetsEl ? Array.from(targetsEl.children).map((t) => parseAnchor(t)) : [],
      status,
      createdAt,
      updatedAt,
    }
    if (!item.anchors.length) throw new Error(`批注 ${id} 没有目标元素`)
    return item
  }
  throw new Error(`未知条目类型：${type}`)
}

function parseAnchor(el: Element): Anchor {
  return {
    xpath: childText(el, 'xpath'),
    selector: childText(el, 'selector'),
    section: childText(el, 'section'),
    text: childText(el, 'text'),
    html: childText(el, 'html'),
  }
}

function directChild(el: Element, name: string): Element | null {
  return Array.from(el.children).find((c) => c.tagName === name) ?? null
}

function childText(el: Element, name: string): string {
  return directChild(el, name)?.textContent ?? ''
}
