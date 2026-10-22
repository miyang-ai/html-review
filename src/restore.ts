import type { Anchor, TextEditItem } from './types'
import { cleanHtml } from './dom'
import { findByText, resolveSelector, resolveXPath } from './locator'
import { normalizeText } from './text'
import { sameHtml } from './store'

export type EditResolution =
  | { state: 'pending'; el: Element }
  | { state: 'applied'; el: Element }
  | { state: 'lost' }

/** 改字记录挂到页面元素上的标记属性，值为记录 id */
export const EDIT_ID_ATTR = 'data-hr-edit-id'

/**
 * 背景：刷新页面后，改字记录要重新应用到页面；AI 改完源文件后，同一条记录要被识别为「已生效」。
 * 设计意图：按 XPath → 选择器 → 全文搜索三级找候选元素，再用文本判断它处在哪个阶段：
 * - 文本等于原文：源文件还没改，返回 pending，调用方重新应用新文本；
 * - 文本等于新文本且元素不带本工具标记：源文件已改，返回 applied；
 * - 带本工具标记：本次会话里已经应用过，仍是 pending。
 * 原文与新文本只差 HTML 标签（文字相同）时，改用清洗后的 innerHTML 比较。
 * 约束：只读 DOM，不修改；应用新文本由调用方负责。
 */
export function resolveEdit(item: TextEditItem, doc: Document = document): EditResolution {
  const before = normalizeText(item.beforeText)
  const after = normalizeText(item.afterText)
  const textOnlySame = before === after

  const classify = (el: Element): EditResolution | null => {
    if (el.getAttribute(EDIT_ID_ATTR) === item.id) return { state: 'pending', el }
    if (textOnlySame) {
      const html = cleanHtml(el, 'inner')
      if (sameHtml(html, item.beforeHtml)) return { state: 'pending', el }
      if (sameHtml(html, item.afterHtml)) return { state: 'applied', el }
      return null
    }
    const text = normalizeText(el.textContent)
    if (text === before) return { state: 'pending', el }
    if (text === after) return { state: 'applied', el }
    return null
  }

  const candidates = [resolveXPath(item.anchor.xpath, doc), resolveSelector(item.anchor.selector, doc)]
  for (const el of candidates) {
    if (!el) continue
    const r = classify(el)
    if (r) return r
  }
  const byBefore = findByText(before, doc)
  if (byBefore) {
    const r = classify(byBefore)
    if (r) return r
  }
  if (!textOnlySame) {
    const byAfter = findByText(after, doc)
    if (byAfter) return { state: 'applied', el: byAfter }
  }
  return { state: 'lost' }
}

/**
 * 背景：批注圆点刷新后要挂回原元素。批注的目标元素随后很可能被 AI 改过，文本对不上是常态。
 * 设计意图：优先找「位置对、文本也对」的元素；文本对不上时，仍然信任 XPath，其次信任选择器，
 * 只有两者都找不到才判定丢失。
 */
export function resolveAnchor(anchor: Anchor, doc: Document = document): Element | null {
  const prefix = anchor.text.replace(/…$/, '').slice(0, 60)
  const textMatches = (el: Element) => normalizeText(el.textContent).startsWith(prefix)
  const byXPath = resolveXPath(anchor.xpath, doc)
  const bySelector = resolveSelector(anchor.selector, doc)
  if (byXPath && textMatches(byXPath)) return byXPath
  if (bySelector && textMatches(bySelector)) return bySelector
  return byXPath ?? bySelector ?? null
}
