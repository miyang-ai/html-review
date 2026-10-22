import { describe, expect, it } from 'vitest'
import { buildPrompt } from '../src/export/prompt'
import { parseState, serializeState } from '../src/export/xml'
import type { PageState } from '../src/types'

const state: PageState = {
  version: 1,
  page: 'file:///tmp/a.html',
  title: '报告 <A> & "B"',
  seq: { edit: 1, comment: 1, reply: 1 },
  items: [
    {
      id: 'E1',
      kind: 'edit',
      anchor: { xpath: '/html/body/p[1]', selector: 'p.lead', section: '结论', text: '原文 <x>', html: '<p class="lead">原文 &lt;x&gt;</p>' },
      beforeHtml: '原文 <span class="lbl">数据</span>',
      afterHtml: '新文 <span class="lbl">数据</span>',
      beforeText: '原文 数据',
      afterText: '新文 数据',
      status: 'pending',
      createdAt: 1,
      updatedAt: 2,
    },
    {
      id: 'C1',
      kind: 'comment',
      anchors: [
        { xpath: '//*[@id="g"]', selector: '#g', section: '起点', text: '卡片', html: '<div id="g">]]> 卡片</div>' },
        { xpath: '/html/body/div[2]', selector: 'div.b', section: '', text: '二', html: '<div class="b">二</div>' },
      ],
      body: '改成条形图 & 突出 66%',
      replies: [{ id: 'R1', body: '颜色用主色', createdAt: 3 }],
      status: 'exported',
      createdAt: 3,
      updatedAt: 4,
    },
  ],
}

describe('serializeState / parseState', () => {
  it('完整往返无损', () => {
    const xml = serializeState(state, 100)
    expect(parseState(xml)).toEqual(state)
  })

  it('非法 XML 抛出明确错误', () => {
    expect(() => parseState('<html_review>')).toThrow('合法')
    expect(() => parseState('<other/>')).toThrow('html_review')
  })

  it('批注缺少目标时拒绝导入', () => {
    const xml = '<html_review version="1"><item id="C1" type="comment"><request>x</request></item></html_review>'
    expect(() => parseState(xml)).toThrow('目标')
  })
})

describe('buildPrompt', () => {
  const prompt = buildPrompt(state.items, { source: '/tmp/a.html', isLocalFile: true, title: '报告', exportedAt: new Date(2026, 9, 22, 22, 10).getTime() })

  it('包含源文件、规则和条目', () => {
    expect(prompt).toContain('源文件：/tmp/a.html')
    expect(prompt).toContain('导出时间：2026-10-22 22:10')
    expect(prompt).toContain('改字 1 条，批注 1 条')
    expect(prompt).toContain('<item id="E1" type="text_edit">')
    expect(prompt).toContain('<before>原文 数据</before>')
    expect(prompt).toContain('<request>改成条形图 &amp; 突出 66%</request>')
    expect(prompt).toContain('<targets count="2">')
    expect(prompt).toContain('<reply>颜色用主色</reply>')
  })

  it('改字含标签时附带 HTML，修改单部分是合法 XML', () => {
    expect(prompt).toContain('<before_html><![CDATA[原文 <span class="lbl">数据</span>]]></before_html>')
    const xml = prompt.slice(prompt.indexOf('<review'), prompt.indexOf('</review>') + '</review>'.length)
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    expect(doc.getElementsByTagName('parsererror').length).toBe(0)
    expect(doc.querySelectorAll('item').length).toBe(2)
  })

  it('非本地页面提示先找源文件', () => {
    const p = buildPrompt(state.items, { source: 'http://localhost:8123/x', isLocalFile: false, title: '', exportedAt: 0 })
    expect(p).toContain('页面地址：http://localhost:8123/x')
  })

  it('提示词遵守写作规范', () => {
    for (const banned of ['——', '……', '不是', '而是', '“', '”']) expect(prompt).not.toContain(banned)
  })
})
