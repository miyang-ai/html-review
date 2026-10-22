import { afterEach, describe, expect, it, vi } from 'vitest'
import { adoptCss } from '../src/ui/sheets'
import { injectHostStyles } from '../src/ui/hostStyles'

// jsdom 是否实现可构造样式表随版本变化，两条路径都用桩显式控制
class FakeSheet {
  css = ''
  replaceSync(css: string): void {
    this.css = css
  }
}

function withAdoptedSupport(doc: Document): { sheets: () => FakeSheet[] } {
  let list: FakeSheet[] = []
  Object.defineProperty(doc, 'adoptedStyleSheets', {
    configurable: true,
    get: () => list,
    set: (v: FakeSheet[]) => { list = v },
  })
  vi.stubGlobal('CSSStyleSheet', FakeSheet)
  return { sheets: () => list }
}

function withoutAdoptedSupport(): void {
  vi.stubGlobal('CSSStyleSheet', class {})
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete (document as unknown as Record<string, unknown>).adoptedStyleSheets
  document.documentElement.removeAttribute('data-hr-styles')
  document.head.innerHTML = ''
})

describe('adoptCss', () => {
  it('支持可构造样式表时追加到 adoptedStyleSheets，不产生 <style>，移除后只删自己', () => {
    const { sheets } = withAdoptedSupport(document)
    const other = new FakeSheet()
    document.adoptedStyleSheets = [other] as unknown as CSSStyleSheet[]
    const remove = adoptCss(document, 'p{color:red}', document.head)
    expect(sheets()).toHaveLength(2)
    expect(sheets()[1].css).toBe('p{color:red}')
    expect(document.querySelectorAll('style')).toHaveLength(0)
    remove()
    expect(sheets()).toEqual([other])
  })

  it('不支持时回退为 <style>，移除函数删除该节点', () => {
    withoutAdoptedSupport()
    const remove = adoptCss(document, 'p{color:red}', document.head)
    const styles = document.head.querySelectorAll('style')
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toBe('p{color:red}')
    remove()
    expect(document.head.querySelectorAll('style')).toHaveLength(0)
  })

  it('replaceSync 抛错时回退为 <style>', () => {
    withAdoptedSupport(document)
    vi.stubGlobal('CSSStyleSheet', class extends FakeSheet {
      replaceSync(): void { throw new Error('blocked') }
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const remove = adoptCss(document, 'p{}', document.head)
    expect(document.head.querySelectorAll('style')).toHaveLength(1)
    expect(warn).toHaveBeenCalled()
    remove()
    warn.mockRestore()
  })
})

describe('injectHostStyles', () => {
  it('同一页面只注入一次，卸载后标记和样式都清除，可再次注入', () => {
    const { sheets } = withAdoptedSupport(document)
    const remove1 = injectHostStyles(document)
    const remove2 = injectHostStyles(document)
    expect(sheets()).toHaveLength(1)
    expect(document.documentElement.hasAttribute('data-hr-styles')).toBe(true)

    remove2()
    expect(sheets()).toHaveLength(1)
    remove1()
    expect(sheets()).toHaveLength(0)
    expect(document.documentElement.hasAttribute('data-hr-styles')).toBe(false)

    const remove3 = injectHostStyles(document)
    expect(sheets()).toHaveLength(1)
    remove3()
  })
})
