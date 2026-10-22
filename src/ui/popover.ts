import { h } from './h'
import { S, fmt } from './strings'
import type { CommentItem } from '../types'
import { formatTime } from '../text'

export interface NewCommentHandlers {
  onSubmit: (body: string) => void
  onCancel: () => void
}

export interface ExistingCommentHandlers {
  onEditBody: (body: string) => void
  onReply: (body: string) => void
  onDeleteReply: (replyId: string) => void
  onToggleResolved: () => void
  onDelete: () => void
  onLocate: () => void
  onClose: () => void
}

/**
 * 背景：输入法确认候选词时也会触发 Enter，如果此时提交，会把半截拼音当成批注存下来。
 * 设计意图：isComposing 或 keyCode 229（Safari 在组合结束瞬间的特殊值）时不提交，只有用户真正按回车才提交。
 */
export function isSubmitEnter(e: KeyboardEvent): boolean {
  return e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229
}

/**
 * 背景：批注的新建、查看、追加评论都在元素旁边完成，用户视线不离开页面内容。
 * 设计意图：一个弹窗两种形态：新建形态只有输入框；已有形态显示正文、评论列表、回复框和操作。
 * 新建时如果用户 Shift 加选元素，只更新目标数量，已输入的草稿保留。
 */
export class CommentPopover {
  readonly el: HTMLDivElement
  mode: 'new' | 'existing' | null = null
  currentId: string | null = null
  private draft: HTMLTextAreaElement | null = null
  private countEl: HTMLSpanElement | null = null
  private existingHandlers: ExistingCommentHandlers | null = null
  private lastRect: DOMRect | null = null

  constructor(parent: HTMLElement) {
    this.el = h('div', { class: 'popover', attrs: { hidden: '' } })
    parent.append(this.el)
  }

  get isOpen(): boolean {
    return this.mode !== null
  }

  openNew(count: number, rect: DOMRect, handlers: NewCommentHandlers): void {
    if (this.mode === 'new' && this.draft) {
      this.setTargetCount(count)
      this.place(rect)
      this.draft.focus()
      return
    }
    this.mode = 'new'
    this.currentId = null
    this.countEl = h('span', { class: 'pop-meta', text: fmt(S.popTargets, { n: count }) })
    const textarea = h('textarea', { class: 'input', attrs: { placeholder: S.popPlaceholder, rows: '3' } })
    this.draft = textarea
    const submit = () => {
      const body = textarea.value.trim()
      if (body) handlers.onSubmit(body)
    }
    textarea.addEventListener('keydown', (e) => {
      if (isSubmitEnter(e)) {
        e.preventDefault()
        submit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handlers.onCancel()
      }
    })
    this.el.replaceChildren(
      h(
        'div',
        { class: 'pop-head' },
        h('span', { class: 'pop-id', text: S.popNewTitle }),
        this.countEl,
        h('button', { class: 'icon-btn', icon: 'x', title: S.popCancel, on: { click: handlers.onCancel } }),
      ),
      h('div', { class: 'pop-body' }, textarea),
      h(
        'div',
        { class: 'pop-actions' },
        h('button', { class: 'btn', text: S.popCancel, on: { click: handlers.onCancel } }),
        h('button', { class: 'btn primary comment', icon: 'send', text: S.popSave, on: { click: submit } }),
      ),
    )
    this.show(rect)
    textarea.focus()
  }

  setTargetCount(count: number): void {
    if (this.countEl) this.countEl.textContent = fmt(S.popTargets, { n: count })
  }

  openExisting(item: CommentItem, rect: DOMRect, handlers: ExistingCommentHandlers): void {
    this.mode = 'existing'
    this.currentId = item.id
    this.existingHandlers = handlers
    this.draft = null
    this.countEl = null
    this.renderExisting(item, false)
    this.show(rect)
  }

  /** 背景：追加评论、编辑正文后需要重绘，但保持弹窗位置不跳。 */
  refresh(item: CommentItem): void {
    if (this.mode !== 'existing' || this.currentId !== item.id) return
    this.renderExisting(item, false)
  }

  /** 背景：发送评论后弹窗会重绘，焦点需要回到回复框，方便连续追加。 */
  focusReply(): void {
    this.el.querySelector<HTMLTextAreaElement>('.reply-box textarea')?.focus()
  }

  close(): void {
    this.mode = null
    this.currentId = null
    this.draft = null
    this.countEl = null
    this.existingHandlers = null
    this.el.setAttribute('hidden', '')
    this.el.replaceChildren()
  }

  /**
   * 背景：弹窗盖住相邻元素时，用户没法 Shift 加选旁边的元素，也看不到上下文。
   * 设计意图：优先放在目标右侧，其次左侧（卡片、图表等窄元素通常两侧有空间）；
   * 两侧都放不下（整行段落）时放在下方，再不行放上方，最后贴视口内侧。
   */
  place(rect: DOMRect): void {
    this.lastRect = rect
    const pop = this.el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = 10
    const clampTop = (t: number) => Math.max(gap, Math.min(vh - pop.height - gap, t))
    const clampLeft = (l: number) => Math.max(gap, Math.min(vw - pop.width - gap, l))
    let left: number
    let top: number
    if (vw - rect.right >= pop.width + gap * 2) {
      left = rect.right + gap
      top = clampTop(rect.top)
    } else if (rect.left >= pop.width + gap * 2) {
      left = rect.left - pop.width - gap
      top = clampTop(rect.top)
    } else if (vh - rect.bottom >= pop.height + gap * 2) {
      left = clampLeft(rect.left)
      top = rect.bottom + gap
    } else if (rect.top >= pop.height + gap * 2) {
      left = clampLeft(rect.left)
      top = rect.top - pop.height - gap
    } else {
      left = clampLeft(rect.left)
      top = clampTop(rect.top)
    }
    this.el.style.left = `${left}px`
    this.el.style.top = `${top}px`
  }

  reposition(rect: DOMRect | null): void {
    if (this.isOpen && rect) this.place(rect)
  }

  private show(rect: DOMRect): void {
    this.el.removeAttribute('hidden')
    this.place(rect)
  }

  private renderExisting(item: CommentItem, editing: boolean): void {
    const hd = this.existingHandlers
    if (!hd) return
    const resolved = item.status === 'resolved'
    const head = h(
      'div',
      { class: 'pop-head' },
      h('span', { class: 'pop-id', text: item.id }),
      h('span', { class: `chip ${item.status}`, text: S.status[item.status] }),
      h('span', { class: 'pop-meta', text: [fmt(S.popTargets, { n: item.anchors.length }), item.anchors[0]?.section].filter(Boolean).join(' · ') }),
      h('button', { class: 'icon-btn', icon: 'crosshair', title: S.popLocate, on: { click: hd.onLocate } }),
      h('button', { class: 'icon-btn', icon: 'x', title: S.close, on: { click: hd.onClose } }),
    )

    let body: HTMLElement
    if (editing) {
      const ta = h('textarea', { class: 'input' })
      ta.value = item.body
      const save = () => {
        const v = ta.value.trim()
        if (v && v !== item.body) hd.onEditBody(v)
        else this.renderExisting(item, false)
      }
      ta.addEventListener('keydown', (e) => {
        if (isSubmitEnter(e)) {
          e.preventDefault()
          save()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          this.renderExisting(item, false)
        }
      })
      body = h('div', { class: 'pop-body' }, ta)
      queueMicrotask(() => ta.focus())
    } else {
      body = h('div', { class: 'pop-body' }, h('div', { class: 'pop-text', text: item.body }))
    }

    const replies = item.replies.length
      ? h(
          'div',
          { class: 'replies' },
          ...item.replies.map((r) =>
            h(
              'div',
              { class: 'reply' },
              h('div', { class: 'reply-text' }, r.body, h('div', { class: 'reply-time', text: formatTime(r.createdAt) })),
              h('button', { class: 'icon-btn danger', icon: 'trash2', title: S.popDelete, on: { click: () => hd.onDeleteReply(r.id) } }),
            ),
          ),
        )
      : null

    const replyInput = h('textarea', { class: 'input small', attrs: { placeholder: S.popReplyPlaceholder, rows: '1' } })
    const sendReply = () => {
      const v = replyInput.value.trim()
      if (v) hd.onReply(v)
    }
    replyInput.addEventListener('keydown', (e) => {
      if (isSubmitEnter(e)) {
        e.preventDefault()
        sendReply()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        hd.onClose()
      }
    })
    const replyBox = h(
      'div',
      { class: 'reply-box' },
      replyInput,
      h('button', { class: 'icon-btn', icon: 'send', title: S.popSave, on: { click: sendReply } }),
    )

    const actions = h(
      'div',
      { class: 'pop-actions' },
      h('button', { class: 'btn', icon: 'pencil', text: S.popEdit, on: { click: () => this.renderExisting(item, true) } }),
      h('button', { class: 'btn danger', icon: 'trash2', text: S.popDelete, on: { click: hd.onDelete } }),
      h('span', { class: 'spacer' }),
      h('button', {
        class: 'btn primary',
        icon: resolved ? 'rotateCcw' : 'circleCheck',
        text: resolved ? S.popReopen : S.popResolve,
        on: { click: hd.onToggleResolved },
      }),
    )

    this.el.replaceChildren(head, body, actions, ...(replies ? [replies] : []), replyBox)
    if (this.lastRect) this.place(this.lastRect)
  }
}
