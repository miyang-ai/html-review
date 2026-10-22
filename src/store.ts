import type { Anchor, CommentItem, ItemStatus, PageState, ReviewItem, TextEditItem } from './types'
import { log } from './log'

const KEY_PREFIX = 'html-review:v1:'

/**
 * 背景：file:// 页面在 Chrome 里共享同一个 localStorage，必须按页面区分存储。
 * 设计意图：用「协议 + 主机 + 路径」做键，忽略 query 和 hash（Deck 翻页常改 hash，不能因此丢记录）。
 */
export function pageIdOf(loc: Pick<Location, 'protocol' | 'host' | 'pathname'>): string {
  return `${loc.protocol}//${loc.host}${decodeURIComponent(loc.pathname)}`
}

export function storageKeyOf(pageId: string): string {
  return KEY_PREFIX + pageId
}

/**
 * 背景：contenteditable 编辑后，即使用户没改字，innerHTML 也可能多出空白或 &nbsp;。
 * 设计意图：折叠空白后再比较，避免产生「改了等于没改」的记录。
 */
export function sameHtml(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/&nbsp;|\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  return norm(a) === norm(b)
}

/** 背景：新页面或存储损坏时需要一个干净的初始状态。 */
export function emptyState(page: string, title: string): PageState {
  return { version: 1, page, title, seq: { edit: 0, comment: 0, reply: 0 }, items: [] }
}

export interface EditInput {
  anchor: Anchor
  beforeHtml: string
  afterHtml: string
  beforeText: string
  afterText: string
}

/**
 * 背景：改字和批注需要「改一下就存」，刷新后完整恢复，且 UI 多处（工具条计数、侧边栏、圆点）要同步刷新。
 * 设计意图：单一状态对象 + 订阅通知；每次变更立即写 localStorage，不做防抖，保证关页面也不丢。
 * 约束：storage 写入失败（配额满、隐私模式）不抛出，交给 onError 提示用户导出备份。
 */
export class ReviewStore {
  private state: PageState
  private listeners = new Set<() => void>()
  onError: (message: string) => void = () => {}

  constructor(
    private storage: Storage,
    private key: string,
    page: string,
    title: string,
  ) {
    this.state = emptyState(page, title)
  }

  /**
   * 背景：页面打开时恢复上次的记录。
   * 设计意图：解析失败时保留原始数据到备份键再重置，避免用户数据被静默覆盖。
   */
  load(): void {
    const raw = this.storage.getItem(this.key)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as PageState
      if (parsed.version !== 1 || !Array.isArray(parsed.items)) throw new Error('版本或结构不符')
      this.state = {
        ...parsed,
        seq: { edit: parsed.seq?.edit ?? 0, comment: parsed.seq?.comment ?? 0, reply: parsed.seq?.reply ?? 0 },
      }
      log.info('已恢复本地记录', { key: this.key, count: this.state.items.length })
    } catch (err) {
      const backupKey = `${this.key}:corrupt:${Date.now()}`
      this.storage.setItem(backupKey, raw)
      log.error('本地记录解析失败，已备份原始数据', { backupKey, err })
      this.onError('本地记录损坏，已备份原始数据并重置')
    }
  }

  get items(): ReviewItem[] {
    return this.state.items
  }

  get snapshot(): PageState {
    return this.state
  }

  get(id: string): ReviewItem | undefined {
    return this.state.items.find((i) => i.id === id)
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /**
   * 背景：同一个元素可能被反复修改。
   * 设计意图：按 id 合并，保留最初的 before，只更新 after；合并后若与原文一致则删除记录，
   * 这样「改了又改回来」不会留下噪音条目。返回 null 表示记录已被删除。
   */
  upsertEdit(existingId: string | null, input: EditInput): TextEditItem | null {
    const now = Date.now()
    if (existingId) {
      const item = this.get(existingId)
      if (item && item.kind === 'edit') {
        if (sameHtml(input.afterHtml, item.beforeHtml)) {
          this.removeItem(item.id)
          return null
        }
        item.afterHtml = input.afterHtml
        item.afterText = input.afterText
        item.status = 'pending'
        item.updatedAt = now
        this.commit()
        return item
      }
    }
    if (sameHtml(input.afterHtml, input.beforeHtml)) return null
    const item: TextEditItem = {
      id: `E${++this.state.seq.edit}`,
      kind: 'edit',
      anchor: input.anchor,
      beforeHtml: input.beforeHtml,
      afterHtml: input.afterHtml,
      beforeText: input.beforeText,
      afterText: input.afterText,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    this.state.items.push(item)
    this.commit()
    return item
  }

  addComment(anchors: Anchor[], body: string): CommentItem {
    const now = Date.now()
    const item: CommentItem = {
      id: `C${++this.state.seq.comment}`,
      kind: 'comment',
      anchors,
      body,
      replies: [],
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    this.state.items.push(item)
    this.commit()
    return item
  }

  /** 背景：批注正文被编辑后需要重新进入待处理，否则下次复制会漏掉这次修改。 */
  updateCommentBody(id: string, body: string): void {
    const item = this.get(id)
    if (!item || item.kind !== 'comment') return
    item.body = body
    item.status = 'pending'
    item.updatedAt = Date.now()
    this.commit()
  }

  /** 背景：追加评论等于补充修改意见，同样需要回到待处理。 */
  addReply(id: string, body: string): void {
    const item = this.get(id)
    if (!item || item.kind !== 'comment') return
    item.replies.push({ id: `R${++this.state.seq.reply}`, body, createdAt: Date.now() })
    item.status = 'pending'
    item.updatedAt = Date.now()
    this.commit()
  }

  deleteReply(id: string, replyId: string): void {
    const item = this.get(id)
    if (!item || item.kind !== 'comment') return
    item.replies = item.replies.filter((r) => r.id !== replyId)
    item.updatedAt = Date.now()
    this.commit()
  }

  removeItem(id: string): void {
    this.state.items = this.state.items.filter((i) => i.id !== id)
    this.commit()
  }

  removeWhere(pred: (item: ReviewItem) => boolean): number {
    const before = this.state.items.length
    this.state.items = this.state.items.filter((i) => !pred(i))
    const removed = before - this.state.items.length
    if (removed) this.commit()
    return removed
  }

  /**
   * 背景：复制修改要求后要能「撤回」，标记已处理也要能撤销。
   * 设计意图：返回变更前的状态表，调用方把它交回 restoreStatuses 即可还原。
   */
  setStatus(ids: string[], status: ItemStatus): Map<string, ItemStatus> {
    const prev = new Map<string, ItemStatus>()
    for (const item of this.state.items) {
      if (!ids.includes(item.id) || item.status === status) continue
      prev.set(item.id, item.status)
      item.status = status
    }
    if (prev.size) this.commit()
    return prev
  }

  restoreStatuses(prev: Map<string, ItemStatus>): void {
    for (const item of this.state.items) {
      const s = prev.get(item.id)
      if (s) item.status = s
    }
    this.commit()
  }

  /** 背景：导入修改单、跨标签页同步时整体替换状态。 */
  replaceState(next: PageState, persist = true): void {
    this.state = next
    if (persist) this.commit()
    else this.emit()
  }

  /** 背景：另一个标签页改了同一页面的记录（storage 事件），本页需要跟上。 */
  reloadFromStorage(): void {
    this.state = emptyState(this.state.page, this.state.title)
    this.load()
    this.emit()
  }

  private commit(): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.state))
    } catch (err) {
      log.error('写入 localStorage 失败', err)
      this.onError('本地保存失败，请在侧边栏导出修改单备份')
    }
    this.emit()
  }

  private emit(): void {
    for (const fn of this.listeners) {
      try {
        fn()
      } catch (err) {
        log.error('状态订阅回调出错', err)
      }
    }
  }
}
