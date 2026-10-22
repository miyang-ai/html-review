import { h } from './h'
import type { IconName } from './icons'
import { S, fmt } from './strings'
import type { ItemStatus, ReviewItem } from '../types'
import { truncate } from '../text'

export interface SidebarEntry {
  item: ReviewItem
  lost: boolean
}

export interface SidebarHandlers {
  onLocate: (id: string) => void
  onOpenComment: (id: string) => void
  onRevertEdit: (id: string) => void
  onRevertEdits: (ids: string[]) => void
  onToggleResolved: (id: string) => void
  onDelete: (id: string) => void
  onCopyPending: () => void
  onCopySelected: (ids: string[]) => void
  onExportedToDone: () => void
  onClearDone: () => void
  onExportXml: () => void
  onImportXml: (file: File) => void
  onClose: () => void
}

type Filter = 'all' | 'pending' | 'exported' | 'done'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: S.sbAll },
  { key: 'pending', label: S.sbPending },
  { key: 'exported', label: S.sbExported },
  { key: 'done', label: S.sbDone },
]

const isDone = (s: ItemStatus) => s === 'applied' || s === 'resolved'

/**
 * 背景：改得多了以后，需要一处总览：改了哪些字、提了哪些批注、哪些已经交给 AI、哪些已经生效。
 * 设计意图：条目按页面阅读顺序排列（由调用方排序），分「改字」「批注」两组；
 * 点击条目直接定位到页面元素；底部集中放批量操作（复制、清理、备份）。
 * 约束：勾选状态只在侧边栏内存里，删除的条目会自动从勾选里移除。
 */
export class Sidebar {
  readonly el: HTMLDivElement
  private listEl: HTMLDivElement
  private tabsEl: HTMLDivElement
  private footEl: HTMLDivElement
  private filter: Filter = 'all'
  private selected = new Set<string>()
  private entries: SidebarEntry[] = []
  private fileInput: HTMLInputElement

  constructor(parent: HTMLElement, private hd: SidebarHandlers) {
    this.tabsEl = h('div', { class: 'sb-tabs' })
    this.listEl = h('div', { class: 'sb-list' })
    this.footEl = h('div', { class: 'sb-foot' })
    this.fileInput = h('input', { attrs: { type: 'file', accept: '.xml,application/xml,text/xml' }, style: { display: 'none' } })
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0]
      if (file) hd.onImportXml(file)
      this.fileInput.value = ''
    })
    this.el = h(
      'div',
      { class: 'sidebar' },
      h(
        'div',
        { class: 'sb-head' },
        h('div', { class: 'sb-title', text: S.sbTitle }),
        h('button', { class: 'icon-btn', icon: 'x', title: S.close, on: { click: hd.onClose } }),
      ),
      this.tabsEl,
      this.listEl,
      this.footEl,
      this.fileInput,
    )
    parent.append(this.el)
  }

  get isOpen(): boolean {
    return this.el.classList.contains('open')
  }

  setOpen(open: boolean): void {
    this.el.classList.toggle('open', open)
  }

  render(entries: SidebarEntry[]): void {
    this.entries = entries
    const ids = new Set(entries.map((e) => e.item.id))
    for (const id of this.selected) if (!ids.has(id)) this.selected.delete(id)
    this.renderTabs()
    this.renderList()
    this.renderFoot()
  }

  private count(f: Filter): number {
    return this.entries.filter((e) => this.match(e.item.status, f)).length
  }

  private match(status: ItemStatus, f: Filter): boolean {
    if (f === 'all') return true
    if (f === 'done') return isDone(status)
    return status === f
  }

  private renderTabs(): void {
    this.tabsEl.replaceChildren(
      ...FILTERS.map((f) =>
        h('button', {
          class: `sb-tab${this.filter === f.key ? ' active' : ''}`,
          text: `${f.label} ${this.count(f.key)}`,
          on: {
            click: () => {
              this.filter = f.key
              this.render(this.entries)
            },
          },
        }),
      ),
    )
  }

  private renderList(): void {
    const visible = this.entries.filter((e) => this.match(e.item.status, this.filter))
    if (!visible.length) {
      this.listEl.replaceChildren(h('div', { class: 'sb-empty', text: S.sbEmpty }))
      return
    }
    const edits = visible.filter((e) => e.item.kind === 'edit')
    const comments = visible.filter((e) => e.item.kind === 'comment')
    const nodes: HTMLElement[] = []
    if (edits.length) {
      nodes.push(h('div', { class: 'sb-group', text: `${S.sbEdits} ${edits.length}` }))
      nodes.push(...edits.map((e) => this.renderItem(e)))
    }
    if (comments.length) {
      nodes.push(h('div', { class: 'sb-group', text: `${S.sbComments} ${comments.length}` }))
      nodes.push(...comments.map((e) => this.renderItem(e)))
    }
    this.listEl.replaceChildren(...nodes)
  }

  private renderItem({ item, lost }: SidebarEntry): HTMLElement {
    const check = h('input', { class: 'sb-check', attrs: { type: 'checkbox' } })
    check.checked = this.selected.has(item.id)
    check.addEventListener('click', (e) => e.stopPropagation())
    check.addEventListener('change', () => {
      if (check.checked) this.selected.add(item.id)
      else this.selected.delete(item.id)
      this.renderFoot()
    })

    const section = item.kind === 'edit' ? item.anchor.section : item.anchors[0]?.section ?? ''
    const row = h(
      'div',
      { class: 'sb-row' },
      h('span', { class: `sb-id ${item.kind}`, text: item.id }),
      h('span', { class: `chip ${item.status}`, text: S.status[item.status] }),
      lost && !isDone(item.status) ? h('span', { class: 'chip lost', text: S.sbLost }) : null,
      h('span', { class: 'sb-section', text: section }),
    )

    let content: HTMLElement
    const actions = h('div', { class: 'sb-actions' })
    const stop = (fn: () => void) => (e: MouseEvent) => {
      e.stopPropagation()
      fn()
    }
    const resolveBtn = h('button', {
      class: 'icon-btn',
      icon: item.status === 'resolved' ? 'rotateCcw' : 'circleCheck',
      title: item.status === 'resolved' ? S.popReopen : S.popResolve,
      on: { click: stop(() => this.hd.onToggleResolved(item.id)) },
    })

    if (item.kind === 'edit') {
      content = h(
        'div',
        { class: 'sb-main' },
        row,
        h('div', { class: 'sb-before', text: truncate(item.beforeText, 160) }),
        h('div', { class: 'sb-after', text: truncate(item.afterText, 160) }),
      )
      actions.append(
        h('button', { class: 'icon-btn', icon: 'crosshair', title: S.popLocate, on: { click: stop(() => this.hd.onLocate(item.id)) } }),
        h('button', {
          class: 'icon-btn danger',
          icon: isDone(item.status) ? 'trash2' : 'undo2',
          title: isDone(item.status) ? S.sbRemove : S.sbRevert,
          on: { click: stop(() => this.hd.onRevertEdit(item.id)) },
        }),
        resolveBtn,
      )
    } else {
      content = h(
        'div',
        { class: 'sb-main' },
        row,
        h('div', { class: 'sb-body', text: item.body }),
        h('div', {
          class: 'sb-sub',
          text: [fmt(S.popTargets, { n: item.anchors.length }), item.replies.length ? fmt(S.sbReplies, { n: item.replies.length }) : '']
            .filter(Boolean)
            .join(' · '),
        }),
      )
      actions.append(resolveBtn, h('button', { class: 'icon-btn danger', icon: 'trash2', title: S.popDelete, on: { click: stop(() => this.hd.onDelete(item.id)) } }))
    }

    return h(
      'div',
      {
        class: `sb-item${isDone(item.status) ? ' dim' : ''}`,
        on: { click: () => (item.kind === 'edit' ? this.hd.onLocate(item.id) : this.hd.onOpenComment(item.id)) },
      },
      check,
      content,
      actions,
    )
  }

  private renderFoot(): void {
    const pending = this.entries.filter((e) => e.item.status === 'pending').length
    const exportedComments = this.entries.filter((e) => e.item.status === 'exported' && e.item.kind === 'comment').length
    const done = this.entries.filter((e) => isDone(e.item.status)).length
    const selectedIds = [...this.selected]
    // 勾选了改字就只还原勾选的；没勾选改字时还原全部未处理的改字（已生效 / 已处理的页面已是源文件内容，无需还原）
    const editEntries = this.entries.filter((e) => e.item.kind === 'edit')
    const selectedEdits = editEntries.filter((e) => this.selected.has(e.item.id)).map((e) => e.item.id)
    const revertIds = selectedEdits.length ? selectedEdits : editEntries.filter((e) => !isDone(e.item.status)).map((e) => e.item.id)
    const revertLabel = fmt(selectedEdits.length ? S.sbRevertSelected : S.sbRevertAll, { n: revertIds.length })
    const btn = (text: string, iconName: IconName, onClick: () => void, disabled = false, primary = false) => {
      const b = h('button', { class: `btn${primary ? ' primary' : ''}`, icon: iconName, text, on: { click: onClick } })
      b.disabled = disabled
      return b
    }
    this.footEl.replaceChildren(
      btn(fmt(S.sbCopy, { n: pending }), 'copy', this.hd.onCopyPending, pending === 0, true),
      btn(fmt(S.sbCopySelected, { n: selectedIds.length }), 'copy', () => this.hd.onCopySelected(selectedIds), selectedIds.length === 0),
      btn(revertLabel, 'undo2', () => this.hd.onRevertEdits(revertIds), revertIds.length === 0),
      btn(S.sbExportedToDone, 'circleCheck', this.hd.onExportedToDone, exportedComments === 0),
      btn(S.sbClearDone, 'trash2', this.hd.onClearDone, done === 0),
      btn(S.sbExportXml, 'download', this.hd.onExportXml, this.entries.length === 0),
      btn(S.sbImportXml, 'upload', () => this.fileInput.click()),
    )
  }
}
