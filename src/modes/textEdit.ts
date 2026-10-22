import type { App } from '../app'
import type { Anchor } from '../types'
import { cleanHtml } from '../dom'
import { buildAnchor } from '../locator'
import { EDIT_ID_ATTR } from '../restore'
import { normalizeText } from '../text'
import { isSubmitEnter } from '../ui/popover'
import { log } from '../log'
import { S, fmt } from '../ui/strings'

interface Session {
  el: HTMLElement
  /** 进入编辑时的 innerHTML（含工具属性），Esc 放弃时还原 */
  startHtml: string
  recordId: string | null
  beforeHtml: string
  beforeText: string
  anchor: Anchor
  /** 被本次编辑吞并的子元素改字记录，首次保存时删除 */
  mergedIds: string[]
}

const PERSIST_DELAY = 500

/**
 * 背景：contenteditable="true" 允许 Ctrl+B、拖放富文本，会把格式标签带进源文件。
 * 设计意图：用 beforeinput 拦掉格式命令和拖放；粘贴在 paste 事件里按纯文本插入（见 onPaste）。
 * 放弃了 plaintext-only：Chrome 会把 plaintext-only 元素的 white-space 强制改成 pre-wrap，
 * Shift+Enter 写进去的是 \n 字符，编辑中看着换了行，退出编辑恢复页面样式后 \n 被合并成空格，修改单里也是 \n。
 */
const BLOCKED_INPUT = /^(format|insertFromDrop$|deleteByDrag$|insertFromPasteAsQuotation$)/

/**
 * 背景：改字模式下用户点到哪段字就改哪段，边打字边保存，回车结束，Esc 放弃。
 * 设计意图：
 * - 编辑单位由 findEditableTarget 决定（见 dom.ts），这里负责一次编辑会话的生命周期；
 * - 输入过程中 500ms 防抖保存，做到「实时保存」，关掉页面也不丢；
 * - 已改过的元素再改时合并到原记录，保留最初原文；
 * - 编辑一个包含已改子元素的段落时，把子元素的记录吞并成一条，原文用子元素的原文还原拼出。
 * 约束：同一时间只有一个编辑会话；开始新会话会先提交旧会话。
 */
export class TextEditor {
  private s: Session | null = null
  private persistTimer = 0

  constructor(private app: App) {}

  get active(): boolean {
    return this.s !== null
  }

  get element(): HTMLElement | null {
    return this.s?.el ?? null
  }

  start(target: Element, point?: { x: number; y: number }): void {
    const unit = (target.closest(`[${EDIT_ID_ATTR}]`) ?? target) as Element
    if (!(unit instanceof HTMLElement)) return
    if (this.s?.el === unit) return
    if (this.s) this.commit()

    const store = this.app.store
    const existingId = unit.getAttribute(EDIT_ID_ATTR)
    const existing = existingId ? store.get(existingId) : undefined
    let beforeHtml: string
    let beforeText: string
    let anchor: Anchor
    const mergedIds: string[] = []

    if (existing && existing.kind === 'edit') {
      beforeHtml = existing.beforeHtml
      beforeText = existing.beforeText
      anchor = existing.anchor
    } else {
      const original = unit.cloneNode(true) as HTMLElement
      for (const child of Array.from(original.querySelectorAll(`[${EDIT_ID_ATTR}]`))) {
        const id = child.getAttribute(EDIT_ID_ATTR) ?? ''
        const rec = store.get(id)
        if (rec && rec.kind === 'edit') {
          child.innerHTML = rec.beforeHtml
          mergedIds.push(id)
        }
      }
      beforeHtml = cleanHtml(original, 'inner')
      beforeText = normalizeText(original.textContent)
      anchor = buildAnchor(unit, { fullText: true, text: beforeText, html: cleanHtml(original, 'outer') })
    }

    this.s = {
      el: unit,
      startHtml: unit.innerHTML,
      recordId: existing ? existing.id : null,
      beforeHtml,
      beforeText,
      anchor,
      mergedIds,
    }

    const own = unit.getAttribute('contenteditable')
    if (own !== null) unit.setAttribute('data-hr-own-editable', own)
    unit.setAttribute('data-hr-editing', '')
    unit.contentEditable = 'true'
    unit.spellcheck = false
    unit.addEventListener('beforeinput', this.onBeforeInput)
    unit.addEventListener('input', this.onInput)
    unit.addEventListener('focusout', this.onFocusOut)
    unit.addEventListener('paste', this.onPaste)
    unit.focus({ preventScroll: true })
    this.placeCaret(unit, point)
    log.info('开始改字', { xpath: anchor.xpath, recordId: this.s.recordId, merged: mergedIds })
  }

  /** 背景：回车、点到别处、切换模式时结束会话并保存。 */
  commit(): void {
    if (!this.s) return
    this.persist()
    this.end()
  }

  /** 背景：Esc 放弃本次会话的全部输入，回到进入编辑前的样子。 */
  cancel(): void {
    const s = this.s
    if (!s) return
    s.el.innerHTML = s.startHtml
    this.persist()
    this.end()
    log.info('放弃本次改字')
  }

  /**
   * 背景：编辑中所有按键都不能漏给页面（Deck 的方向键翻页、空格播放等会打断编辑）。
   * 设计意图：调用方已经阻止冒泡，这里只处理三个控制键：Enter 提交、Shift+Enter 换行、Esc 放弃。
   */
  onKeydown(e: KeyboardEvent): void {
    if (isSubmitEnter(e)) {
      e.preventDefault()
      this.commit()
    } else if (e.key === 'Enter' && e.shiftKey && !e.isComposing) {
      e.preventDefault()
      if (!document.execCommand('insertLineBreak')) document.execCommand('insertHTML', false, '<br>')
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.cancel()
    }
  }

  /**
   * 背景：Enter 已在 keydown 里拦成提交，但 Ctrl+O 之类的系统编辑命令仍可能插入段落，Chrome 会生成 <div>。
   * 设计意图：格式命令和拖放直接丢弃；插入段落改成插入 <br>，和 Shift+Enter 结果一致。
   */
  private onBeforeInput = (e: InputEvent): void => {
    if (BLOCKED_INPUT.test(e.inputType)) {
      e.preventDefault()
      log.info('已拦截格式 / 拖放输入', e.inputType)
    } else if (e.inputType === 'insertParagraph') {
      e.preventDefault()
      document.execCommand('insertLineBreak')
    }
  }

  private onInput = (): void => {
    window.clearTimeout(this.persistTimer)
    this.persistTimer = window.setTimeout(() => this.persist(), PERSIST_DELAY)
  }

  /**
   * 背景：点到页面别处、点工具栏都会让编辑元素失焦，此时应提交。
   * 约束：切换到别的应用窗口也会失焦，这种情况保持编辑状态（内容已由防抖保存），回来可以继续打字。
   */
  private onFocusOut = (e: FocusEvent): void => {
    const s = this.s
    if (!s) return
    if (e.relatedTarget instanceof Node && s.el.contains(e.relatedTarget)) return
    if (!document.hasFocus()) {
      this.persist()
      return
    }
    this.commit()
  }

  /**
   * 背景：粘贴富文本会带进格式标签；直接 insertText 一段含 \n 的文字，Chrome 会把后面几行包进 <div>。
   * 设计意图：只取纯文本，按行插入，行与行之间用 insertLineBreak 写成 <br>，和手动换行结果一致，也能撤销。
   */
  private onPaste = (e: ClipboardEvent): void => {
    if (!this.s) return
    e.preventDefault()
    const lines = (e.clipboardData?.getData('text/plain') ?? '').split(/\r\n|\r|\n/)
    lines.forEach((line, i) => {
      if (i > 0) document.execCommand('insertLineBreak')
      if (line) document.execCommand('insertText', false, line)
    })
  }

  /**
   * 背景：每次保存都要把 DOM 当前内容和原文对比，决定新建、更新还是删除记录。
   * 设计意图：吞并的子记录在第一次保存时删除并清掉子元素上的标记，之后由本条记录统一代表。
   */
  private persist(): void {
    window.clearTimeout(this.persistTimer)
    const s = this.s
    if (!s) return
    const store = this.app.store
    let afterHtml = cleanHtml(s.el, 'inner')
    if (/<br\s*\/?>\s*$/i.test(afterHtml) && !/<br\s*\/?>\s*$/i.test(s.beforeHtml)) {
      afterHtml = afterHtml.replace(/<br\s*\/?>\s*$/i, '')
    }
    const afterText = normalizeText(s.el.textContent)

    if (s.mergedIds.length) {
      for (const id of s.mergedIds) {
        store.removeItem(id)
        this.app.editEls.delete(id)
      }
      for (const child of Array.from(s.el.querySelectorAll(`[${EDIT_ID_ATTR}]`))) child.removeAttribute(EDIT_ID_ATTR)
      s.mergedIds = []
    }

    const rec = store.upsertEdit(s.recordId, {
      anchor: s.anchor,
      beforeHtml: s.beforeHtml,
      afterHtml,
      beforeText: s.beforeText,
      afterText,
    })
    if (rec) {
      s.recordId = rec.id
      s.el.setAttribute(EDIT_ID_ATTR, rec.id)
      this.app.editEls.set(rec.id, s.el)
    } else {
      if (s.recordId) this.app.editEls.delete(s.recordId)
      s.recordId = null
      s.el.removeAttribute(EDIT_ID_ATTR)
    }
  }

  private end(): void {
    const s = this.s
    if (!s) return
    this.s = null
    window.clearTimeout(this.persistTimer)
    const el = s.el
    el.removeEventListener('beforeinput', this.onBeforeInput)
    el.removeEventListener('input', this.onInput)
    el.removeEventListener('focusout', this.onFocusOut)
    el.removeEventListener('paste', this.onPaste)
    const own = el.getAttribute('data-hr-own-editable')
    if (own !== null) {
      el.setAttribute('contenteditable', own)
      el.removeAttribute('data-hr-own-editable')
    } else {
      el.removeAttribute('contenteditable')
    }
    el.removeAttribute('spellcheck')
    el.removeAttribute('data-hr-editing')
    if (document.activeElement === el) el.blur()
    window.getSelection()?.removeAllRanges()
    if (s.recordId) this.app.toast.show(fmt(S.toastEditSaved, { id: s.recordId }), { ms: 1200 })
    this.app.scheduleRender()
  }

  /** 背景：点击哪里光标就落在哪里，减少一次额外点击。浏览器 API 不一致，两种都试，失败就放到末尾。 */
  private placeCaret(el: HTMLElement, point?: { x: number; y: number }): void {
    const sel = window.getSelection()
    if (!sel) return
    let range: Range | null = null
    const doc = el.ownerDocument as Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    }
    if (point) {
      if (typeof doc.caretRangeFromPoint === 'function') {
        range = doc.caretRangeFromPoint(point.x, point.y)
      } else if (typeof doc.caretPositionFromPoint === 'function') {
        const pos = doc.caretPositionFromPoint(point.x, point.y)
        if (pos) {
          range = doc.createRange()
          range.setStart(pos.offsetNode, pos.offset)
          range.collapse(true)
        }
      }
    }
    if (!range || !el.contains(range.startContainer)) {
      range = doc.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
    }
    sel.removeAllRanges()
    sel.addRange(range)
  }
}
