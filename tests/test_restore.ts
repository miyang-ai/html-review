import { beforeEach, describe, expect, it } from 'vitest'
import { EDIT_ID_ATTR, resolveAnchor, resolveEdit } from '../src/restore'
import { buildAnchor } from '../src/locator'
import type { TextEditItem } from '../src/types'

function editFor(el: Element, after: string, afterHtml = after): TextEditItem {
  const before = el.textContent ?? ''
  return {
    id: 'E1',
    kind: 'edit',
    anchor: buildAnchor(el, { fullText: true }),
    beforeHtml: el.innerHTML,
    afterHtml,
    beforeText: before,
    afterText: after,
    status: 'pending',
    createdAt: 0,
    updatedAt: 0,
  }
}

beforeEach(() => {
  document.body.innerHTML = `<main><h2>标题</h2><p class="a">原文一</p><p class="b">原文二 <b>粗</b></p></main>`
})

describe('resolveEdit', () => {
  it('源文件未改：pending', () => {
    const p = document.querySelector('p.a')!
    const item = editFor(p, '新文一')
    const r = resolveEdit(item)
    expect(r.state).toBe('pending')
    expect(r.state !== 'lost' && r.el).toBe(p)
  })

  it('源文件已改成新文本：applied', () => {
    const p = document.querySelector('p.a')!
    const item = editFor(p, '新文一')
    p.textContent = '新文一'
    expect(resolveEdit(item).state).toBe('applied')
  })

  it('本工具已应用（带标记）：仍为 pending', () => {
    const p = document.querySelector('p.a')!
    const item = editFor(p, '新文一')
    p.textContent = '新文一'
    p.setAttribute(EDIT_ID_ATTR, 'E1')
    expect(resolveEdit(item).state).toBe('pending')
  })

  it('结构变化后靠全文搜索找回', () => {
    const p = document.querySelector('p.a')!
    const item = editFor(p, '新文一')
    item.anchor.xpath = '/html/body/section/p'
    item.anchor.selector = '#nope'
    document.querySelector('main')!.insertAdjacentHTML('afterbegin', '<p>插入</p>')
    const r = resolveEdit(item)
    expect(r.state).toBe('pending')
    expect(r.state !== 'lost' && r.el).toBe(p)
  })

  it('原文和新文本都找不到：lost', () => {
    const p = document.querySelector('p.a')!
    const item = editFor(p, '新文一')
    p.textContent = '完全不同'
    expect(resolveEdit(item).state).toBe('lost')
  })

  it('只改了标签（文字相同）时按 HTML 判断', () => {
    const p = document.querySelector('p.b')!
    const item = editFor(p, p.textContent ?? '', '原文二 粗')
    expect(resolveEdit(item).state).toBe('pending')
    p.innerHTML = '原文二 粗'
    expect(resolveEdit(item).state).toBe('applied')
  })
})

describe('resolveAnchor', () => {
  it('文本对得上优先', () => {
    const p = document.querySelector('p.b')!
    expect(resolveAnchor(buildAnchor(p))).toBe(p)
  })

  it('文本变了仍信任 XPath', () => {
    const p = document.querySelector('p.b')!
    const a = buildAnchor(p)
    p.textContent = 'AI 改过的内容'
    expect(resolveAnchor(a)).toBe(p)
  })

  it('都找不到返回 null', () => {
    const a = buildAnchor(document.querySelector('p.b')!)
    document.body.innerHTML = '<div></div>'
    expect(resolveAnchor(a)).toBeNull()
  })
})
