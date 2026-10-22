import type { Anchor } from './types'
import { cleanHtml, isSelectableElement } from './dom'
import { normalizeText, truncate } from './text'

const HTML_NS = 'http://www.w3.org/1999/xhtml'
const COMMENT_TEXT_MAX = 200
const HTML_SNIPPET_MAX = 1500

/**
 * 背景：XPath 是交给 AI 的主要定位依据，也是刷新后找回元素的第一顺位。
 * 设计意图：遇到页面内唯一的 id 就以 `//*[@id="x"]` 截断，比纯绝对路径更抗结构变化；
 * 同名兄弟只有一个时省略序号，路径更短更易读。
 * 约束：SVG / MathML 等非 HTML 命名空间元素用 local-name() 表达，否则在 HTML 文档里 evaluate 不到。
 */
export function getXPath(el: Element): string {
  const doc = el.ownerDocument
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur.nodeType === Node.ELEMENT_NODE) {
    if (cur.id && !cur.id.includes('"') && doc.querySelectorAll(`[id="${cssAttrEscape(cur.id)}"]`).length === 1) {
      parts.unshift(`//*[@id="${cur.id}"]`)
      return parts.join('/')
    }
    const parent: Element | null = cur.parentElement
    const isHtml = cur.namespaceURI === HTML_NS
    const name = isHtml ? cur.localName : `*[local-name()="${cur.localName}"]`
    if (!parent) {
      parts.unshift('/' + name)
      break
    }
    const same = Array.from(parent.children).filter((c) => c.localName === cur!.localName && c.namespaceURI === cur!.namespaceURI)
    const index = same.length > 1 ? `[${same.indexOf(cur) + 1}]` : ''
    parts.unshift(name + index)
    cur = parent
  }
  return parts.join('/')
}

/**
 * 背景：刷新后用记录里的 XPath 找回元素。
 * 设计意图：失败（非法表达式或找不到）一律返回 null，交给下一级定位策略。
 */
export function resolveXPath(xpath: string, doc: Document = document): Element | null {
  if (!xpath) return null
  try {
    const r = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
    const node = r.singleNodeValue
    return node && node.nodeType === Node.ELEMENT_NODE ? (node as Element) : null
  } catch (err) {
    console.debug('[html-review] xpath 解析失败，降级到选择器', xpath, err)
    return null
  }
}

/**
 * 背景：CSS 选择器是第二定位依据，对 AI 来说也比 XPath 更容易在源码里搜到（class 名、id）。
 * 设计意图：优先唯一 id；否则从元素向上拼「标签.类名」，每一步检查是否已唯一，唯一即停，
 * 需要时加 :nth-of-type。最多向上 6 层，仍不唯一则用完整路径。
 */
export function getCssSelector(el: Element): string {
  const doc = el.ownerDocument
  if (el.id && doc.querySelectorAll(`#${cssEscape(el.id)}`).length === 1) return `#${cssEscape(el.id)}`
  const parts: string[] = []
  let cur: Element | null = el
  let depth = 0
  while (cur && cur !== doc.documentElement) {
    if (cur.id && doc.querySelectorAll(`#${cssEscape(cur.id)}`).length === 1) {
      parts.unshift(`#${cssEscape(cur.id)}`)
      break
    }
    let part = cur.localName
    const classes = Array.from(cur.classList).filter((c) => !c.startsWith('hr-')).slice(0, 3)
    if (classes.length) part += classes.map((c) => '.' + cssEscape(c)).join('')
    const parent: Element | null = cur.parentElement
    if (parent) {
      const sameTag = Array.from(parent.children).filter((c) => c.localName === cur!.localName)
      if (sameTag.length > 1) {
        const matchingPart = Array.from(parent.children).filter((c) => safeMatches(c, part))
        if (matchingPart.length > 1) part += `:nth-of-type(${sameTag.indexOf(cur) + 1})`
      }
    }
    parts.unshift(part)
    const selector = parts.join(' > ')
    if (safeQueryAll(doc, selector).length === 1) return selector
    cur = parent
    depth++
    if (depth > 6) break
  }
  return parts.join(' > ')
}

/** 背景：刷新后用选择器找回元素。设计意图：只接受唯一命中，多处命中视为不可靠，返回 null。 */
export function resolveSelector(selector: string, doc: Document = document): Element | null {
  if (!selector) return null
  const list = safeQueryAll(doc, selector)
  return list.length === 1 ? list[0] : null
}

/**
 * 背景：只给 AI 一个 XPath，人和 AI 都很难判断这是页面的哪一部分。
 * 设计意图：找元素之前（或自身）最近的 h1-h3 标题文字，作为「所在章节」。
 */
export function getSection(el: Element): string {
  if (/^H[1-3]$/.test(el.tagName)) return truncate(normalizeText(el.textContent), 80)
  const headings = Array.from(el.ownerDocument.querySelectorAll('h1, h2, h3'))
  let found: Element | null = null
  for (const h of headings) {
    if (h.contains(el)) {
      found = h
      continue
    }
    if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) found = h
    else break
  }
  return found ? truncate(normalizeText(found.textContent), 80) : ''
}

/**
 * 背景：XPath 和选择器都失效时（页面结构被改过），最后的手段是按原文全文搜索。
 * 设计意图：找文本完全相等的元素，取最内层；只有唯一命中才返回，避免改错位置。
 * 约束：传入的 text 应已规范化。
 */
export function findByText(text: string, doc: Document = document): Element | null {
  if (!text) return null
  const matches: Element[] = []
  for (const el of Array.from(doc.body.querySelectorAll('*'))) {
    if (!isSelectableElement(el)) continue
    if (normalizeText(el.textContent) === text) matches.push(el)
  }
  const innermost = matches.filter((el) => !matches.some((o) => o !== el && el.contains(o)))
  return innermost.length === 1 ? innermost[0] : null
}

/**
 * 背景：改字和批注创建时都要给元素拍一张定位快照。
 * 设计意图：一次性采集 XPath、选择器、章节、文本、HTML 片段，后续恢复和导出都只读这份快照。
 * 约束：fullText=true 时保留完整文本（改字比对需要），否则截断到 200 字（批注摘要）。
 */
export function buildAnchor(el: Element, opts: { fullText?: boolean; text?: string; html?: string } = {}): Anchor {
  const text = opts.text ?? normalizeText(el.textContent)
  return {
    xpath: getXPath(el),
    selector: getCssSelector(el),
    section: getSection(el),
    text: opts.fullText ? text : truncate(text, COMMENT_TEXT_MAX),
    html: truncate(opts.html ?? cleanHtml(el, 'outer'), HTML_SNIPPET_MAX),
  }
}

function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s)
  return s.replace(/([^\w-])/g, '\\$1')
}

function cssAttrEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&')
}

function safeQueryAll(doc: Document, selector: string): Element[] {
  try {
    return Array.from(doc.querySelectorAll(selector))
  } catch (err) {
    console.debug('[html-review] 选择器非法，视为未命中', selector, err)
    return []
  }
}

function safeMatches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector)
  } catch (err) {
    console.debug('[html-review] 选择器非法，视为不匹配', selector, err)
    return false
  }
}
