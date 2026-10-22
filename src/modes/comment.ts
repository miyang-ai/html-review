import type { App } from '../app'
import { isSelectableElement, isVisible, reduceSelection, textHitElements, visualRect, type Rect } from '../dom'
import { S, fmt } from '../ui/strings'

const DRAG_THRESHOLD = 5
const MAX_TARGETS = 30

/**
 * 背景：批注模式下用户要能精确选中「一句话」「一张卡片」「一整组卡片」。
 * 设计意图：三种选法对应三种粒度：
 * - 单击：悬停的元素，Alt+↑/↓ 调整到父级或子级；
 * - 拖拽框选：完全落在框里的元素加上框穿过的文字所在元素，取最外层，整组子元素自动合并为父元素；
 * - Shift+单击 / Shift+框选：在现有选择上增减。
 * 选择一变化就打开（或更新）新建批注弹窗，选完直接写意见，不需要额外确认步骤。
 */
export class CommentPicker {
  selection: Element[] = []
  private baseEl: Element | null = null
  private level = 0
  private drag: { x: number; y: number; active: boolean } | null = null

  constructor(private app: App) {}

  /** 当前悬停目标：落点元素向上爬 level 层 */
  get hoverTarget(): Element | null {
    let el = this.baseEl
    for (let i = 0; i < this.level && el; i++) {
      const parent: Element | null = el.parentElement
      if (!parent || !isSelectableElement(parent)) break
      el = parent
    }
    return el
  }

  onMove(e: MouseEvent): void {
    if (this.drag) {
      const dx = e.clientX - this.drag.x
      const dy = e.clientY - this.drag.y
      if (!this.drag.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) this.drag.active = true
      if (this.drag.active) {
        this.app.overlay.showHover(null, 'comment', '')
        this.app.overlay.showMarquee(rectOf(this.drag.x, this.drag.y, e.clientX, e.clientY))
      }
      return
    }
    const target = e.target instanceof Element && isSelectableElement(e.target) ? e.target : null
    if (target !== this.baseEl) {
      this.baseEl = target
      this.level = 0
    }
    this.showHover()
  }

  onDown(e: MouseEvent): void {
    if (e.button !== 0) return
    this.drag = { x: e.clientX, y: e.clientY, active: false }
  }

  onUp(e: MouseEvent): void {
    const drag = this.drag
    this.drag = null
    if (!drag) return
    if (drag.active) {
      this.app.overlay.showMarquee(null)
      this.marqueeSelect(rectOf(drag.x, drag.y, e.clientX, e.clientY), e.shiftKey)
    } else {
      this.clickSelect(e.shiftKey)
    }
    this.showHover()
  }

  /** 背景：Alt+↑ 从一句话扩到整张卡片，Alt+↓ 退回。 */
  climb(dir: 1 | -1): void {
    if (!this.baseEl) return
    const next = Math.max(0, this.level + dir)
    this.level = next
    let depth = 0
    for (let el: Element | null = this.baseEl; el?.parentElement && isSelectableElement(el.parentElement); el = el.parentElement) depth++
    this.level = Math.min(this.level, depth)
    this.showHover()
  }

  setSelection(elements: Element[]): void {
    let els = elements
    if (els.length > MAX_TARGETS) {
      this.app.toast.show(fmt(S.toastTooMany, { n: MAX_TARGETS }), { error: true })
      els = els.slice(0, MAX_TARGETS)
    }
    this.selection = els
    this.app.overlay.showSelection(els)
    if (els.length) this.app.openNewComment()
    else this.app.closePopover()
  }

  clear(): void {
    this.selection = []
    this.drag = null
    this.baseEl = null
    this.level = 0
    this.app.overlay.showSelection([])
    this.app.overlay.showMarquee(null)
  }

  private showHover(): void {
    const el = this.hoverTarget
    this.app.overlay.showHover(el, 'comment', el ? describe(el) : '')
  }

  private clickSelect(shift: boolean): void {
    const el = this.hoverTarget
    if (!el) return
    if (!shift) {
      this.setSelection([el])
      return
    }
    const exists = this.selection.includes(el)
    const next = exists ? this.selection.filter((s) => s !== el) : reduceSelection([...this.selection, el])
    this.setSelection(next)
  }

  /**
   * 背景：框选是「我圈的这块要改」，用户圈的可能是一组卡片、一个标题，也可能只是半句话。
   * 设计意图：两路结果合并后取最外层：
   * - 完整落在框里的元素（含文字的元素按文字实际范围算，见 visualRect）；
   * - 框穿过的文字所在的元素（见 textHitElements），覆盖只圈半句、圈裸文本的情况。
   * 放弃的方案：只按元素盒子完整包含判断，宽于文字的块元素和裸文本永远框不中。
   */
  private marqueeSelect(rect: Rect, shift: boolean): void {
    const doc = this.app.doc
    const inside: Element[] = []
    for (const el of Array.from(doc.body.querySelectorAll('*'))) {
      if (!isSelectableElement(el)) continue
      const r = visualRect(el)
      if (r.width === 0 || r.height === 0) continue
      if (r.left >= rect.x && r.top >= rect.y && r.right <= rect.x + rect.w && r.bottom <= rect.y + rect.h && isVisible(el)) inside.push(el)
    }
    inside.push(...textHitElements(doc.body, rect))
    if (!inside.length) {
      this.app.toast.show(S.toastNoTarget)
      return
    }
    const reduced = reduceSelection(shift ? [...this.selection, ...inside] : inside)
    this.setSelection(reduced)
  }
}

function rectOf(x1: number, y1: number, x2: number, y2: number) {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

/** 背景：悬停标签显示元素「是什么」，帮助判断要不要 Alt+↑ 扩大范围。 */
function describe(el: Element): string {
  let name = el.localName
  if (el.id) name += `#${el.id}`
  else if (el.classList.length) name += '.' + Array.from(el.classList).slice(0, 2).join('.')
  const parent = el.parentElement
  return parent && isSelectableElement(parent) ? `${name} · ${S.hoverParentHint}` : name
}
