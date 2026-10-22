import { describe, expect, it } from 'vitest'
import { cdata, escapeXml, formatTime, normalizeText, truncate } from '../src/text'

describe('text', () => {
  it('normalizeText 折叠各类空白', () => {
    expect(normalizeText('  a\n\t b\u00a0c\u200b ')).toBe('a b c')
    expect(normalizeText(null)).toBe('')
  })

  it('truncate 超长追加省略号', () => {
    expect(truncate('abcdef', 3)).toBe('abc…')
    expect(truncate('abc', 3)).toBe('abc')
  })

  it('escapeXml 转义五个字符', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;')
  })

  it('cdata 拆分内部的 ]]>', () => {
    expect(cdata('a]]>b')).toBe('<![CDATA[a]]]]><![CDATA[>b]]>')
    const doc = new DOMParser().parseFromString(`<r>${cdata('a]]>b<c>')}</r>`, 'application/xml')
    expect(doc.documentElement.textContent).toBe('a]]>b<c>')
  })

  it('formatTime 输出 YYYY-MM-DD HH:MM', () => {
    expect(formatTime(new Date(2026, 9, 22, 9, 5).getTime())).toBe('2026-10-22 09:05')
  })
})
