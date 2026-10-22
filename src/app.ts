import type { ItemStatus, Mode, PageState, ReviewItem } from './types'
import { HOST_ATTR, compareDocumentOrder, findEditableTarget } from './dom'
import { buildAnchor } from './locator'
import { EDIT_ID_ATTR, resolveAnchor, resolveEdit } from './restore'
import { ReviewStore, pageIdOf, storageKeyOf } from './store'
import { buildPrompt } from './export/prompt'
import { parseState, serializeState } from './export/xml'
import { truncate } from './text'
import { log } from './log'
import { TextEditor } from './modes/textEdit'
import { CommentPicker } from './modes/comment'
import { handleKeyOther, handleKeydown } from './keyboard'
import { Overlay, type PinSpec } from './ui/overlay'
import { Toolbar } from './ui/toolbar'
import { CommentPopover } from './ui/popover'
import { Sidebar, type SidebarEntry } from './ui/sidebar'
import { Toast } from './ui/toast'
import { injectHostStyles } from './ui/hostStyles'
import { adoptCss } from './ui/sheets'
import { S, fmt } from './ui/strings'
import { h } from './ui/h'
import css from './ui/styles.css'

const isDone = (s: ItemStatus) => s === 'applied' || s === 'resolved'
/** 工具 UI 内的这些事件不允许冒泡到页面，避免触发页面的点击翻页、滚轮翻页、快捷键 */
const ISOLATED_EVENTS = ['keydown', 'keyup', 'keypress', 'click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'wheel', 'touchstart', 'touchend', 'contextmenu']
/** 改字 / 批注模式下，页面元素上的这些事件被工具接管，不交给页面 */
const CAPTURED_POINTER_EVENTS = ['pointerdown', 'pointerup', 'dblclick', 'auxclick']

/**
 * 背景：HTML Review 的总控制器。把存储、两种交互模式、覆盖层、工具条、批注弹窗、侧边栏串起来。
 * 设计意图：
 * - 页面侧的鼠标、键盘事件统一在 window 捕获阶段接管，按当前模式分发，页面自身的处理器收不到；
 * - 工具 UI 渲染在 Shadow DOM 里，与页面样式互不影响；
 * - 状态变化（store 订阅）和布局变化（滚动、缩放、DOM 变化）都合并到一次 requestAnimationFrame 里重绘；
 * - 页面 DOM 变化（JS 重绘）后防抖重新定位，把改字效果和批注圆点挂回去。
 * 约束：一个页面只允许一个实例，由 index.ts 保证。
 */
export class App {
  readonly doc: Document
  readonly host: HTMLElement
  readonly ui: HTMLDivElement
  readonly store: ReviewStore
  readonly overlay: Overlay
  readonly toast: Toast
  readonly editor: TextEditor
  readonly picker: CommentPicker
  private toolbar: Toolbar
  private popover: CommentPopover
  private sidebar: Sidebar
  private modeBadge: HTMLDivElement
  private pageId: string
  private storageKey: string

  mode: Mode = 'browse'
  /** 改字记录 id → 页面元素 */
  readonly editEls = new Map<string, Element>()
  /** 批注 id → 目标元素（可能少于 anchors，部分丢失时） */
  readonly commentEls = new Map<string, Element[]>()
  /** 本次定位失败的条目 */
  readonly lost = new Set<string>()

  private renderQueued = false
  private restoreTimer = 0
  private mutationObserver: MutationObserver | null = null
  private hoverAttrEl: Element | null = null
  private cleanups: (() => void)[] = []

  constructor(doc: Document) {
    this.doc = doc
    this.pageId = pageIdOf(doc.location)
    this.storageKey = storageKeyOf(this.pageId)

    this.host = doc.createElement('html-review-root')
    this.host.setAttribute(HOST_ATTR, '')
    this.host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;'
    const shadow = this.host.attachShadow({ mode: 'open' })
    adoptCss(shadow, css, shadow)
    this.ui = h('div', { class: 'root' })
    shadow.append(this.ui)

    this.store = new ReviewStore(window.localStorage, this.storageKey, this.pageId, doc.title)
    this.overlay = new Overlay(this.ui)
    this.toast = new Toast(this.ui)
    this.editor = new TextEditor(this)
    this.picker = new CommentPicker(this)
    this.modeBadge = h('div', { class: 'mode-badge', attrs: { hidden: '' } })
    this.ui.append(this.modeBadge)
    this.popover = new CommentPopover(this.ui)
    this.sidebar = new Sidebar(this.ui, {
      onLocate: (id) => this.locate(id),
      onOpenComment: (id) => this.openExistingComment(id),
      onRevertEdit: (id) => this.revertEdit(id),
      onRevertEdits: (ids) => this.revertEdits(ids),
      onToggleResolved: (id) => this.toggleResolved(id),
      onDelete: (id) => this.deleteItem(id),
      onCopyPending: () => void this.copyRequest(),
      onCopySelected: (ids) => void this.copyRequest(ids),
      onExportedToDone: () => this.exportedToDone(),
      onClearDone: () => this.clearDone(),
      onExportXml: () => this.exportXml(),
      onImportXml: (file) => void this.importXml(file),
      onClose: () => this.setSidebar(false),
    })
    this.toolbar = new Toolbar(this.ui, {
      onText: () => this.toggleMode('text'),
      onComment: () => this.toggleMode('comment'),
      onSidebar: () => this.setSidebar(!this.sidebar.isOpen),
      onCopy: () => void this.copyRequest(),
    })
    this.overlay.onPinClick = (id) => this.openExistingComment(id)
  }

  /**
   * 背景：挂载入口。
   * 设计意图：先恢复数据，再挂事件，最后做一次全量定位，保证用户看到的第一帧就是上次改完的样子。
   */
  init(): void {
    this.cleanups.push(injectHostStyles(this.doc))
    this.doc.documentElement.appendChild(this.host)
    this.store.onError = (msg) => this.toast.show(msg, { error: true, ms: 5000 })
    this.store.load()
    this.store.subscribe(() => {
      this.syncPopover()
      this.scheduleRender()
    })

    for (const type of ISOLATED_EVENTS) this.listen(this.host, type, (e) => e.stopPropagation())
    this.listen(window, 'mousemove', (e) => this.onMouseMove(e as MouseEvent), { capture: true, passive: true })
    this.listen(window, 'mousedown', (e) => this.onMouseDown(e as MouseEvent), { capture: true })
    this.listen(window, 'mouseup', (e) => this.onMouseUp(e as MouseEvent), { capture: true })
    this.listen(window, 'click', (e) => this.onClick(e as MouseEvent), { capture: true })
    for (const type of CAPTURED_POINTER_EVENTS) {
      this.listen(window, type, (e) => {
        if (this.mode !== 'browse' && !this.isUiEvent(e)) e.stopPropagation()
      }, { capture: true })
    }
    this.listen(window, 'keydown', (e) => handleKeydown(this, e as KeyboardEvent), { capture: true })
    this.listen(window, 'keyup', (e) => handleKeyOther(this, e as KeyboardEvent), { capture: true })
    this.listen(window, 'keypress', (e) => handleKeyOther(this, e as KeyboardEvent), { capture: true })
    this.listen(window, 'scroll', () => this.scheduleRender(), { capture: true, passive: true })
    this.listen(window, 'resize', () => this.scheduleRender(), { passive: true })
    this.listen(window, 'storage', (e) => this.onStorage(e as StorageEvent))

    this.mutationObserver = new MutationObserver((records) => this.onMutations(records))
    this.mutationObserver.observe(this.doc.body, { childList: true, subtree: true, characterData: true })

    this.restoreAll()
    this.render()
    log.info('已挂载', { page: this.pageId, items: this.store.items.length })
  }

  /** 背景：书签重复点击或调试时需要完全卸载，恢复页面原状。 */
  destroy(): void {
    if (this.editor.active) this.editor.commit()
    for (const fn of this.cleanups) fn()
    this.cleanups = []
    this.mutationObserver?.disconnect()
    for (const [id, el] of this.editEls) {
      if (el.getAttribute(EDIT_ID_ATTR) === id) el.removeAttribute(EDIT_ID_ATTR)
    }
    this.setHoverAttr(null)
    this.doc.documentElement.removeAttribute('data-hr-mode')
    this.host.remove()
    log.info('已卸载')
  }

  // ---------------- 模式 ----------------

  toggleMode(mode: Mode): void {
    this.setMode(this.mode === mode ? 'browse' : mode)
  }

  setMode(mode: Mode): void {
    if (this.editor.active) this.editor.commit()
    if (this.popover.mode === 'new') this.closePopover()
    this.picker.clear()
    this.overlay.showHover(null, 'text', '')
    this.setHoverAttr(null)
    this.mode = mode
    if (mode === 'browse') this.doc.documentElement.removeAttribute('data-hr-mode')
    else this.doc.documentElement.setAttribute('data-hr-mode', mode)
    this.modeBadge.className = `mode-badge ${mode}`
    this.modeBadge.textContent = mode === 'text' ? S.modeText : mode === 'comment' ? S.modeComment : ''
    this.modeBadge.toggleAttribute('hidden', mode === 'browse')
    this.scheduleRender()
    log.info('切换模式', mode)
  }

  /**
   * 背景：Esc 是「退一步」：先关弹窗，再清选择，再退出模式，最后关侧边栏。
   * 返回 true 表示消费了这次 Esc，页面不会收到。
   */
  handleEscape(): boolean {
    if (this.popover.isOpen) {
      this.closePopover()
      this.picker.clear()
      return true
    }
    if (this.picker.selection.length) {
      this.picker.clear()
      return true
    }
    if (this.mode !== 'browse') {
      this.setMode('browse')
      return true
    }
    if (this.sidebar.isOpen) {
      this.setSidebar(false)
      return true
    }
    return false
  }

  setSidebar(open: boolean): void {
    this.sidebar.setOpen(open)
    this.scheduleRender()
  }

  // ---------------- 鼠标 ----------------

  isUiEvent(e: Event): boolean {
    return e.composedPath().includes(this.host)
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.mode === 'browse') return
    if (this.isUiEvent(e)) {
      this.overlay.showHover(null, 'text', '')
      this.setHoverAttr(null)
      return
    }
    if (this.mode === 'comment') {
      this.picker.onMove(e)
      return
    }
    const target = e.target instanceof Element ? e.target : null
    if (this.editor.element && target && this.editor.element.contains(target)) {
      this.overlay.showHover(null, 'text', '')
      return
    }
    const found = findEditableTarget(target)
    const unit = found ? found.closest(`[${EDIT_ID_ATTR}]`) ?? found : null
    let label: string = S.hoverEditable
    if (unit) {
      const rec = this.store.get(unit.getAttribute(EDIT_ID_ATTR) ?? '')
      if (rec && rec.kind === 'edit') label = fmt(S.hoverEdited, { text: truncate(rec.beforeText, 40) })
    }
    this.overlay.showHover(unit, 'text', unit ? label : '')
    this.setHoverAttr(unit)
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.popover.isOpen && this.mode === 'browse' && !this.isUiEvent(e)) this.closePopover()
    if (this.mode === 'browse' || this.isUiEvent(e)) return
    e.stopPropagation()
    if (this.mode === 'comment') {
      e.preventDefault()
      this.picker.onDown(e)
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.mode === 'browse' || this.isUiEvent(e)) return
    e.stopPropagation()
    if (this.mode === 'comment') {
      e.preventDefault()
      this.picker.onUp(e)
    }
  }

  /**
   * 背景：模式下点击页面不能触发页面原有行为（跳链接、翻页、展开折叠）。
   * 设计意图：一律 preventDefault + 阻止冒泡；改字模式在这里开始编辑会话。
   */
  private onClick(e: MouseEvent): void {
    if (this.mode === 'browse' || this.isUiEvent(e)) return
    e.preventDefault()
    e.stopPropagation()
    if (this.mode !== 'text') return
    const target = e.target instanceof Element ? e.target : null
    if (this.editor.element && target && this.editor.element.contains(target)) return
    const editable = findEditableTarget(target)
    if (editable) {
      this.overlay.showHover(null, 'text', '')
      this.editor.start(editable, { x: e.clientX, y: e.clientY })
    } else if (this.editor.active) {
      this.editor.commit()
    }
  }

  /** 背景：改字模式下悬停元素需要文字光标，通过临时属性配合注入样式实现。 */
  private setHoverAttr(el: Element | null): void {
    if (this.hoverAttrEl === el) return
    this.hoverAttrEl?.removeAttribute('data-hr-hover')
    this.hoverAttrEl = el
    el?.setAttribute('data-hr-hover', '')
  }

  // ---------------- 批注 ----------------

  /**
   * 背景：选择变化后打开新建批注弹窗。
   * 设计意图：保存时读取 picker 的最新选择，所以 Shift 加选后不需要重新打开弹窗。
   */
  openNewComment(): void {
    const els = this.picker.selection
    const last = els[els.length - 1]
    if (!last) return
    this.popover.openNew(els.length, last.getBoundingClientRect(), {
      onSubmit: (body) => {
        const targets = this.picker.selection
        if (!targets.length) return
        const anchors = targets.map((el) => buildAnchor(el))
        const item = this.store.addComment(anchors, body)
        this.commentEls.set(item.id, [...targets])
        log.info('新增批注', { id: item.id, targets: anchors.map((a) => a.xpath), body })
        this.closePopover()
        this.picker.clear()
        this.toast.show(fmt(S.toastCommentSaved, { id: item.id }), { ms: 1500 })
      },
      onCancel: () => {
        this.closePopover()
        this.picker.clear()
      },
    })
  }

  openExistingComment(id: string): void {
    const item = this.store.get(id)
    if (!item || item.kind !== 'comment') return
    if (this.popover.mode === 'new') this.picker.clear()
    const els = this.commentEls.get(id) ?? []
    const first = els[0]
    if (first) {
      const r = first.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) first.scrollIntoView({ block: 'center' })
    }
    const rect = first ? first.getBoundingClientRect() : new DOMRect(window.innerWidth / 2 - 170, 80, 0, 0)
    this.overlay.showSelection(els)
    this.popover.openExisting(item, rect, {
      onEditBody: (body) => this.store.updateCommentBody(id, body),
      onReply: (body) => {
        this.store.addReply(id, body)
        this.popover.focusReply()
      },
      onDeleteReply: (replyId) => this.store.deleteReply(id, replyId),
      onToggleResolved: () => this.toggleResolved(id),
      onDelete: () => this.deleteItem(id),
      onLocate: () => this.locate(id),
      onClose: () => this.closePopover(),
    })
  }

  closePopover(): void {
    const wasExisting = this.popover.mode === 'existing'
    this.popover.close()
    if (wasExisting) this.overlay.showSelection(this.picker.selection)
  }

  /** 背景：弹窗里的批注被修改、删除后，弹窗内容要立即同步。 */
  private syncPopover(): void {
    if (this.popover.mode !== 'existing' || !this.popover.currentId) return
    const item = this.store.get(this.popover.currentId)
    if (!item || item.kind !== 'comment') this.closePopover()
    else this.popover.refresh(item)
  }

  // ---------------- 条目操作 ----------------

  locate(id: string): void {
    const el = this.elementOf(id)
    if (!el) {
      this.toast.show(S.sbLost, { error: true })
      return
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    window.setTimeout(() => this.overlay.flash(el), 380)
  }

  /**
   * 背景：撤销一条改字：页面恢复原文并删除记录。
   * 约束：已生效 / 已处理的记录只删除记录，不动页面（页面上已是源文件的内容）。
   */
  revertEdit(id: string): void {
    const item = this.store.get(id)
    if (!item || item.kind !== 'edit') return
    const el = this.editEls.get(id)
    if (el && el.getAttribute(EDIT_ID_ATTR) === id && !isDone(item.status)) {
      el.innerHTML = item.beforeHtml
      el.removeAttribute(EDIT_ID_ATTR)
    }
    this.editEls.delete(id)
    this.store.removeItem(id)
    log.info('撤销改字', id)
  }

  /**
   * 背景：试改了一批字后想整体放弃（例如误触改出了一串错字），逐条点撤销太慢。
   * 设计意图：复用 revertEdit 逐条还原，保证单条与批量行为一致；不弹确认框，改为提供撤回，
   * 撤回时整体换回还原前的记录，再由 restoreAll 把改字重新应用到页面（此时元素内容等于原文，能稳定定位）。
   * 约束：正在编辑的改字先提交再还原，避免编辑会话和还原同时改同一个元素。
   */
  revertEdits(ids: string[]): void {
    if (this.editor.active) this.editor.commit()
    const targets = ids.filter((id) => this.store.get(id)?.kind === 'edit')
    if (!targets.length) return
    const prev = JSON.parse(JSON.stringify(this.store.snapshot)) as PageState
    for (const id of targets) this.revertEdit(id)
    log.info('批量还原改字', targets)
    this.toast.show(fmt(S.toastReverted, { n: targets.length }), {
      action: {
        label: S.toastUndo,
        run: () => {
          this.store.replaceState(prev)
          this.restoreAll()
          log.info('撤回批量还原', targets)
        },
      },
    })
  }

  toggleResolved(id: string): void {
    const item = this.store.get(id)
    if (!item) return
    this.store.setStatus([id], item.status === 'resolved' ? 'pending' : 'resolved')
    this.restoreAll()
  }

  deleteItem(id: string): void {
    const item = this.store.get(id)
    if (!item) return
    if (item.kind === 'edit') {
      this.revertEdit(id)
      return
    }
    if (!window.confirm(S.popConfirmDelete)) return
    this.commentEls.delete(id)
    this.store.removeItem(id)
  }

  private exportedToDone(): void {
    const ids = this.store.items.filter((i) => i.kind === 'comment' && i.status === 'exported').map((i) => i.id)
    const prev = this.store.setStatus(ids, 'resolved')
    this.toast.show(fmt(S.toastMarkedDone, { n: ids.length }), { action: { label: S.toastUndo, run: () => this.store.restoreStatuses(prev) } })
  }

  private clearDone(): void {
    const n = this.store.items.filter((i) => isDone(i.status)).length
    if (!n || !window.confirm(fmt(S.sbConfirmClear, { n }))) return
    for (const item of this.store.items) {
      if (!isDone(item.status)) continue
      const el = this.editEls.get(item.id)
      if (el && el.getAttribute(EDIT_ID_ATTR) === item.id) el.removeAttribute(EDIT_ID_ATTR)
      this.editEls.delete(item.id)
      this.commentEls.delete(item.id)
    }
    this.store.removeWhere((i) => isDone(i.status))
  }

  // ---------------- 复制修改要求 ----------------

  /**
   * 背景：「一键交给 AI」的核心动作。
   * 设计意图：默认复制所有待处理条目；传入 ids 时复制指定条目（侧边栏勾选）。
   * 条目按页面阅读顺序排列；复制成功后待处理条目变为已导出，提供撤回。
   * 剪贴板失败时弹出手动复制框，保证内容一定能拿到。
   */
  async copyRequest(ids?: string[]): Promise<void> {
    if (this.editor.active) this.editor.commit()
    const items = this.orderedItems().filter((i) => (ids ? ids.includes(i.id) : i.status === 'pending'))
    if (!items.length) {
      this.toast.show(S.toastNothing)
      return
    }
    const isLocalFile = this.doc.location.protocol === 'file:'
    const prompt = buildPrompt(items, {
      source: isLocalFile ? decodeURIComponent(this.doc.location.pathname) : this.doc.location.href,
      isLocalFile,
      title: this.doc.title,
      exportedAt: Date.now(),
    })
    log.info('修改要求', { count: items.length, prompt })
    const ok = await copyText(prompt)
    const pendingIds = items.filter((i) => i.status === 'pending').map((i) => i.id)
    const prev = this.store.setStatus(pendingIds, 'exported')
    if (ok) {
      this.toast.show(fmt(S.toastCopied, { n: items.length }), {
        action: { label: S.toastUndo, run: () => this.store.restoreStatuses(prev) },
      })
    } else {
      this.toast.manualCopy(prompt)
    }
  }

  // ---------------- 导出 / 导入 ----------------

  private exportXml(): void {
    try {
      const xml = serializeState(this.store.snapshot, Date.now())
      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const base = (this.pageId.split('/').pop() || 'page').replace(/\.html?$/i, '')
      const d = new Date()
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
      const a = h('a', { attrs: { href: url, download: `${base}.review-${stamp}.xml` } })
      this.ui.append(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      log.info('导出修改单', { items: this.store.items.length })
    } catch (err) {
      log.error('导出修改单失败', err)
      this.toast.show(fmt(S.toastImportFailed, { msg: String(err) }), { error: true })
    }
  }

  /**
   * 背景：从备份文件恢复修改单。
   * 设计意图：导入是整体替换。替换前先把页面上已应用的改字还原，再按新数据重新应用，避免新旧混在页面上。
   * 来自其他页面的修改单需要用户确认，确认后归属到当前页面。
   */
  private async importXml(file: File): Promise<void> {
    try {
      const state = parseState(await file.text())
      if (state.page && state.page !== this.pageId && !window.confirm(fmt(S.toastImportOtherPage, { page: state.page }))) return
      state.page = this.pageId
      state.title = this.doc.title
      for (const item of state.items) {
        const n = Number(item.id.slice(1))
        if (item.kind === 'edit' && n > state.seq.edit) state.seq.edit = n
        if (item.kind === 'comment' && n > state.seq.comment) state.seq.comment = n
      }
      this.revertAllDom()
      this.store.replaceState(state)
      this.restoreAll()
      this.toast.show(fmt(S.toastImported, { n: state.items.length }))
      log.info('导入修改单', { items: state.items.length })
    } catch (err) {
      log.error('导入修改单失败', err)
      this.toast.show(fmt(S.toastImportFailed, { msg: err instanceof Error ? err.message : String(err) }), { error: true })
    }
  }

  // ---------------- 恢复与同步 ----------------

  /**
   * 背景：页面打开、DOM 被 JS 重绘、导入、跨标签同步之后，都要把记录重新对应到页面元素上。
   * 设计意图：
   * - 改字：已挂好的跳过；否则用 resolveEdit 判断是重新应用、已生效还是丢失；
   * - 批注：每次都重新解析目标元素（开销小，且能跟上结构变化）；
   * - 已生效的改字批量更新状态并提示一次。
   * 约束：改字会话进行中不执行，避免把用户正在编辑的元素内容覆盖掉。
   */
  restoreAll(): void {
    if (this.editor.active) return
    const applied: string[] = []
    this.lost.clear()
    for (const item of this.store.items) {
      if (item.kind === 'edit') {
        const known = this.editEls.get(item.id)
        if (isDone(item.status)) {
          if (known?.getAttribute(EDIT_ID_ATTR) === item.id) known.removeAttribute(EDIT_ID_ATTR)
          this.editEls.delete(item.id)
          continue
        }
        if (known && known.isConnected && known.getAttribute(EDIT_ID_ATTR) === item.id) continue
        const r = resolveEdit(item, this.doc)
        if (r.state === 'pending') {
          if (r.el.getAttribute(EDIT_ID_ATTR) !== item.id) {
            r.el.innerHTML = item.afterHtml
            r.el.setAttribute(EDIT_ID_ATTR, item.id)
          }
          this.editEls.set(item.id, r.el)
        } else if (r.state === 'applied') {
          applied.push(item.id)
          this.editEls.delete(item.id)
        } else {
          this.lost.add(item.id)
          this.editEls.delete(item.id)
        }
      } else {
        const els = item.anchors.map((a) => resolveAnchor(a, this.doc)).filter((el): el is Element => !!el)
        if (els.length) this.commentEls.set(item.id, els)
        else {
          this.commentEls.delete(item.id)
          this.lost.add(item.id)
        }
      }
    }
    if (applied.length) {
      this.store.setStatus(applied, 'applied')
      this.toast.show(fmt(S.toastApplied, { n: applied.length }))
      log.info('改字已在源文件生效', applied)
    }
    if (this.lost.size) log.warn('以下条目定位失效', [...this.lost])
    this.scheduleRender()
  }

  /** 背景：整体替换数据前，把页面上由本工具应用的改字全部还原成原文。 */
  private revertAllDom(): void {
    for (const [id, el] of this.editEls) {
      const item = this.store.get(id)
      if (item && item.kind === 'edit' && el.getAttribute(EDIT_ID_ATTR) === id) {
        el.innerHTML = item.beforeHtml
        el.removeAttribute(EDIT_ID_ATTR)
      }
    }
    this.editEls.clear()
    this.commentEls.clear()
  }

  /**
   * 背景：同一页面在两个标签页打开时，一边的修改要同步到另一边。
   * 约束：本页正在改字时跳过，以本页的下一次保存为准。
   */
  private onStorage(e: StorageEvent): void {
    if (e.key !== this.storageKey || this.editor.active) return
    this.revertAllDom()
    this.store.reloadFromStorage()
    this.restoreAll()
    log.info('已同步其他标签页的修改')
  }

  /**
   * 背景：Deck、图表等页面会用 JS 重绘内容，重绘后改字效果和圆点会丢。
   * 设计意图：忽略纯粹发生在编辑元素内部的变化（用户正在打字），其余变化防抖 400ms 后重新定位。
   */
  private onMutations(records: MutationRecord[]): void {
    const editing = this.editor.element
    const relevant = records.some((r) => !(editing && editing.contains(r.target)))
    if (!relevant) return
    this.scheduleRender()
    window.clearTimeout(this.restoreTimer)
    this.restoreTimer = window.setTimeout(() => this.restoreAll(), 400)
  }

  // ---------------- 渲染 ----------------

  scheduleRender(): void {
    if (this.renderQueued) return
    this.renderQueued = true
    requestAnimationFrame(() => {
      this.renderQueued = false
      this.render()
    })
  }

  private render(): void {
    const items = this.store.items
    this.toolbar.update({ mode: this.mode, sidebarOpen: this.sidebar.isOpen, pending: items.filter((i) => i.status === 'pending').length })
    this.overlay.setPins(this.buildPins(items))
    this.overlay.reposition()
    if (this.sidebar.isOpen) {
      const entries: SidebarEntry[] = this.orderedItems().map((item) => ({ item, lost: this.lost.has(item.id) }))
      this.sidebar.render(entries)
    }
    if (this.popover.isOpen) {
      const anchorEl =
        this.popover.mode === 'existing' && this.popover.currentId
          ? this.commentEls.get(this.popover.currentId)?.[0]
          : this.picker.selection[this.picker.selection.length - 1]
      this.popover.reposition(anchorEl ? anchorEl.getBoundingClientRect() : null)
    }
  }

  private buildPins(items: ReviewItem[]): PinSpec[] {
    const pins: PinSpec[] = []
    const perEl = new Map<Element, number>()
    for (const item of items) {
      if (item.kind !== 'comment' || isDone(item.status)) continue
      const els = this.commentEls.get(item.id) ?? []
      els.forEach((el, targetIndex) => {
        const stack = perEl.get(el) ?? 0
        perEl.set(el, stack + 1)
        pins.push({ id: item.id, label: item.id.slice(1), status: item.status, el, targetIndex, stack })
      })
    }
    return pins
  }

  private elementOf(id: string): Element | null {
    const el = this.editEls.get(id) ?? this.commentEls.get(id)?.[0] ?? null
    return el && el.isConnected ? el : null
  }

  /** 背景：侧边栏和修改单都按页面阅读顺序排列，定位失效的排在最后。 */
  private orderedItems(): ReviewItem[] {
    const withEl = this.store.items.map((item) => ({ item, el: this.elementOf(item.id) }))
    return withEl
      .sort((a, b) => {
        if (a.el && b.el) return compareDocumentOrder(a.el, b.el)
        if (a.el) return -1
        if (b.el) return 1
        return a.item.createdAt - b.item.createdAt
      })
      .map((x) => x.item)
  }

  private listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): void {
    target.addEventListener(type, fn, opts)
    this.cleanups.push(() => target.removeEventListener(type, fn, opts))
  }
}

/**
 * 背景：navigator.clipboard 在部分 file:// 页面或未聚焦时会被拒绝。
 * 设计意图：先用异步剪贴板 API，失败再用隐藏文本框 + execCommand('copy')，都失败返回 false 交给手动复制。
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    log.warn('剪贴板 API 失败，尝试 execCommand', err)
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute(HOST_ATTR, 'clipboard')
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;'
  document.documentElement.appendChild(ta)
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch (err) {
    log.error('execCommand 复制失败', err)
  }
  ta.remove()
  return ok
}

