import { beforeEach, describe, expect, it } from 'vitest'
import { cleanHtml, findEditableTarget, hasDirectText, isSelectableElement, isToolElement, reduceSelection } from '../src/dom'

// jsdom 没有浏览器默认样式表，<a> 的 display 需要显式写出
beforeEach(() => {
  document.body.innerHTML = `
    <div class="page">
      <p id="p1">第一段 <span class="lbl" style="display:inline-block">数据</span> 内容 <a href="#x" style="display:inline">链接</a></p>
      <div class="card" id="card"><b id="b1">真空</b><p id="p2">身边没人</p></div>
      <div id="empty" style="display:block"><div style="display:block"><p>x</p></div></div>
      <svg id="svg"><text>图</text></svg>
      <input id="in">
    </div>
    <html-review-root data-hr-host=""><div id="tool">工具</div></html-review-root>`
})

const $ = (id: string) => document.getElementById(id)!

describe('findEditableTarget', () => {
  it('段落里的行内标签向上扩到整段', () => {
    expect(findEditableTarget(document.querySelector('.lbl'))).toBe($('p1'))
    expect(findEditableTarget(document.querySelector('a'))).toBe($('p1'))
  })

  it('混合容器里的行内标签不扩到容器', () => {
    expect(findEditableTarget($('b1'))).toBe($('b1'))
  })

  it('点在段落上就是段落', () => {
    expect(findEditableTarget($('p2'))).toBe($('p2'))
  })

  it('不含直接文字的块容器不可编辑', () => {
    expect(findEditableTarget($('card'))).toBeNull()
    expect(findEditableTarget($('empty'))).toBeNull()
  })

  it('SVG、表单控件、工具自身不可编辑', () => {
    expect(findEditableTarget(document.querySelector('#svg text'))).toBeNull()
    expect(findEditableTarget($('in'))).toBeNull()
    expect(findEditableTarget($('tool'))).toBeNull()
  })
})

describe('辅助判断', () => {
  it('hasDirectText', () => {
    expect(hasDirectText($('p1'))).toBe(true)
    expect(hasDirectText($('card'))).toBe(false)
  })

  it('工具元素和 body 不可选', () => {
    expect(isToolElement($('tool'))).toBe(true)
    expect(isSelectableElement($('tool'))).toBe(false)
    expect(isSelectableElement(document.body)).toBe(false)
    expect(isSelectableElement($('p1'))).toBe(true)
  })
})

describe('cleanHtml', () => {
  it('剥离工具属性并还原页面自带的 contenteditable', () => {
    const p = $('p1')
    p.setAttribute('data-hr-edit-id', 'E1')
    p.querySelector('span')!.setAttribute('data-hr-hover', '')
    p.setAttribute('data-hr-editing', '')
    p.setAttribute('contenteditable', 'plaintext-only')
    p.setAttribute('spellcheck', 'false')
    const outer = cleanHtml(p, 'outer')
    expect(outer).not.toContain('data-hr-')
    expect(outer).not.toContain('contenteditable')
    expect(outer).not.toContain('spellcheck')
    expect(p.getAttribute('data-hr-edit-id')).toBe('E1')

    p.setAttribute('data-hr-own-editable', 'true')
    expect(cleanHtml(p, 'outer')).toContain('contenteditable="true"')
  })
})

describe('reduceSelection', () => {
  it('去重并只保留最外层', () => {
    const r = reduceSelection([$('b1'), $('card'), $('p2'), $('card')])
    expect(r).toEqual([$('card')])
  })
})
