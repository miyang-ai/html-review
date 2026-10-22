import { beforeEach, describe, expect, it } from 'vitest'
import { buildAnchor, findByText, getCssSelector, getSection, getXPath, resolveSelector, resolveXPath } from '../src/locator'

beforeEach(() => {
  document.body.innerHTML = `
    <div class="page">
      <h2 id="thesis">结论与推理链</h2>
      <p class="lead">第一段 <span class="lbl">数据</span> 内容</p>
      <p>第二段</p>
      <div class="grid3">
        <div class="card"><b>真空</b><p>身边没人</p></div>
        <div class="card"><b>屏幕</b><p>屏幕里有人</p></div>
      </div>
      <h2>第二节</h2>
      <ul><li>甲</li><li>乙</li></ul>
      <svg><rect></rect><rect></rect></svg>
    </div>`
})

describe('getXPath / resolveXPath', () => {
  it('遇到唯一 id 截断', () => {
    const h2 = document.getElementById('thesis')!
    expect(getXPath(h2)).toBe('//*[@id="thesis"]')
  })

  it('同名兄弟加序号，唯一时省略', () => {
    const second = document.querySelectorAll('p')[1]
    const xp = getXPath(second)
    expect(xp).toBe('/html/body/div/p[2]')
    expect(resolveXPath(xp)).toBe(second)
  })

  it('所有 HTML 元素都能往返解析', () => {
    // jsdom 的 XPath 引擎不支持 local-name()，SVG 元素的解析在 tests/e2e 里用真实 Chrome 验证
    for (const el of Array.from(document.body.querySelectorAll('*')).filter((e) => !e.closest('svg'))) {
      expect(resolveXPath(getXPath(el))).toBe(el)
    }
  })

  it('SVG 元素用 local-name 表达', () => {
    const rect = document.querySelectorAll('rect')[1]
    const xp = getXPath(rect)
    expect(xp).toBe('/html/body/div/*[local-name()="svg"]/*[local-name()="rect"][2]')
  })

  it('非法表达式返回 null', () => {
    expect(resolveXPath('///[[')).toBeNull()
  })
})

describe('getCssSelector / resolveSelector', () => {
  it('所有元素生成的选择器都唯一命中自身', () => {
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      expect(resolveSelector(getCssSelector(el))).toBe(el)
    }
  })

  it('优先使用 id', () => {
    expect(getCssSelector(document.getElementById('thesis')!)).toBe('#thesis')
  })

  it('多处命中视为不可靠', () => {
    expect(resolveSelector('.card')).toBeNull()
  })
})

describe('getSection', () => {
  it('取之前最近的标题', () => {
    expect(getSection(document.querySelector('.card b')!)).toBe('结论与推理链')
    expect(getSection(document.querySelector('li')!)).toBe('第二节')
  })

  it('标题自身返回自己', () => {
    expect(getSection(document.getElementById('thesis')!)).toBe('结论与推理链')
  })
})

describe('findByText', () => {
  it('唯一命中最内层元素', () => {
    expect(findByText('身边没人')).toBe(document.querySelector('.card p'))
  })

  it('多处命中返回 null', () => {
    document.body.insertAdjacentHTML('beforeend', '<p>第二段</p>')
    expect(findByText('第二段')).toBeNull()
  })
})

describe('buildAnchor', () => {
  it('采集定位信息并截断文本', () => {
    const p = document.querySelector('p.lead')!
    p.textContent = 'x'.repeat(300)
    const a = buildAnchor(p)
    expect(a.text.length).toBe(201)
    expect(a.section).toBe('结论与推理链')
    expect(resolveXPath(a.xpath)).toBe(p)
    expect(a.html.startsWith('<p class="lead">')).toBe(true)
  })

  it('fullText 保留完整文本', () => {
    const p = document.querySelector('p.lead')!
    p.textContent = 'y'.repeat(300)
    expect(buildAnchor(p, { fullText: true }).text.length).toBe(300)
  })
})
