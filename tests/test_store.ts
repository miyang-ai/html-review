import { beforeEach, describe, expect, it } from 'vitest'
import { ReviewStore, pageIdOf, sameHtml, storageKeyOf } from '../src/store'
import type { Anchor } from '../src/types'

const anchor: Anchor = { xpath: '/html/body/p', selector: 'p', section: '', text: '原文', html: '<p>原文</p>' }
const KEY = storageKeyOf('file:///tmp/a.html')

function makeStore() {
  const s = new ReviewStore(localStorage, KEY, 'file:///tmp/a.html', 'A')
  s.load()
  return s
}

beforeEach(() => localStorage.clear())

describe('pageIdOf', () => {
  it('忽略 query 和 hash，解码路径', () => {
    expect(pageIdOf({ protocol: 'file:', host: '', pathname: '/Users/a/%E8%9E%8D%E8%B5%84.html' })).toBe('file:///Users/a/融资.html')
  })
})

describe('sameHtml', () => {
  it('空白和 nbsp 差异视为相同', () => {
    expect(sameHtml('a&nbsp; b\n', 'a b')).toBe(true)
    expect(sameHtml('a', 'b')).toBe(false)
  })
})

describe('旧版换行迁移', () => {
  it('原文无 \\n 时把新文里的 \\n 换成 <br>；原文含 \\n 时保持不动', () => {
    const s = makeStore()
    s.upsertEdit(null, { anchor, beforeHtml: '原文', afterHtml: '第一行，\n第二行', beforeText: '原文', afterText: '第一行， 第二行' })
    s.upsertEdit(null, { anchor, beforeHtml: '源码\n  缩进', afterHtml: '源码\n  缩进改', beforeText: '源码 缩进', afterText: '源码 缩进改' })
    const reloaded = makeStore()
    expect(reloaded.items.map((i) => (i.kind === 'edit' ? i.afterHtml : ''))).toEqual(['第一行，<br>第二行', '源码\n  缩进改'])
  })
})

describe('ReviewStore 改字', () => {
  it('新建、合并、改回原文时删除', () => {
    const s = makeStore()
    const e1 = s.upsertEdit(null, { anchor, beforeHtml: '原文', afterHtml: '新文1', beforeText: '原文', afterText: '新文1' })!
    expect(e1.id).toBe('E1')
    const e1b = s.upsertEdit('E1', { anchor, beforeHtml: '原文', afterHtml: '新文2', beforeText: '原文', afterText: '新文2' })!
    expect(e1b.id).toBe('E1')
    expect(e1b.beforeText).toBe('原文')
    expect(e1b.afterText).toBe('新文2')
    expect(s.items).toHaveLength(1)
    const removed = s.upsertEdit('E1', { anchor, beforeHtml: '原文', afterHtml: '原文 ', beforeText: '原文', afterText: '原文' })
    expect(removed).toBeNull()
    expect(s.items).toHaveLength(0)
  })

  it('没有变化不创建记录', () => {
    const s = makeStore()
    expect(s.upsertEdit(null, { anchor, beforeHtml: '原文', afterHtml: '原文', beforeText: '原文', afterText: '原文' })).toBeNull()
  })

  it('序号不复用', () => {
    const s = makeStore()
    s.upsertEdit(null, { anchor, beforeHtml: 'a', afterHtml: 'b', beforeText: 'a', afterText: 'b' })
    s.removeItem('E1')
    const e = s.upsertEdit(null, { anchor, beforeHtml: 'a', afterHtml: 'c', beforeText: 'a', afterText: 'c' })!
    expect(e.id).toBe('E2')
  })
})

describe('ReviewStore 批注', () => {
  it('评论、编辑后回到待处理', () => {
    const s = makeStore()
    const c = s.addComment([anchor], '改短')
    s.setStatus([c.id], 'exported')
    s.addReply(c.id, '补充')
    expect(s.get(c.id)!.status).toBe('pending')
    s.setStatus([c.id], 'exported')
    s.updateCommentBody(c.id, '改成两句')
    const item = s.get(c.id)!
    expect(item.status).toBe('pending')
    expect(item.kind === 'comment' && item.body).toBe('改成两句')
    expect(item.kind === 'comment' && item.replies[0].id).toBe('R1')
    s.deleteReply(c.id, 'R1')
    expect(item.kind === 'comment' && item.replies.length).toBe(0)
  })
})

describe('ReviewStore 状态与持久化', () => {
  it('setStatus 可撤回', () => {
    const s = makeStore()
    s.addComment([anchor], 'a')
    s.addComment([anchor], 'b')
    s.setStatus(['C2'], 'resolved')
    const prev = s.setStatus(['C1', 'C2'], 'exported')
    expect(s.items.map((i) => i.status)).toEqual(['exported', 'exported'])
    s.restoreStatuses(prev)
    expect(s.items.map((i) => i.status)).toEqual(['pending', 'resolved'])
  })

  it('写入后可在新实例恢复', () => {
    const s = makeStore()
    s.addComment([anchor], '改短')
    const s2 = makeStore()
    expect(s2.items).toHaveLength(1)
    expect(s2.addComment([anchor], 'x').id).toBe('C2')
  })

  it('数据损坏时备份原始内容并提示', () => {
    localStorage.setItem(KEY, '{broken')
    const s = new ReviewStore(localStorage, KEY, 'p', 't')
    let msg = ''
    s.onError = (m) => (msg = m)
    s.load()
    expect(msg).toContain('损坏')
    expect(s.items).toHaveLength(0)
    const backup = Object.keys(localStorage).find((k) => k.startsWith(`${KEY}:corrupt:`))
    expect(backup && localStorage.getItem(backup)).toBe('{broken')
  })

  it('订阅者收到变更通知，单个回调出错不影响其他', () => {
    const s = makeStore()
    let calls = 0
    s.subscribe(() => {
      throw new Error('boom')
    })
    s.subscribe(() => calls++)
    s.addComment([anchor], 'a')
    expect(calls).toBe(1)
  })
})
