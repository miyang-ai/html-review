import { h } from './h'
import type { ItemStatus } from '../types'

export interface PinSpec {
  id: string
  label: string
  status: ItemStatus
  el: Element
  /** 该批注的第几个目标元素（一条批注可对应多个元素） */
  targetIndex: number
  /** 同一元素上的第几个圆点，用于错开位置 */
  stack: number
}

const pinKey = (p: PinSpec) => `${p.id}#${p.targetIndex}`

/**
 * 背景：悬停高亮、选中框、框选矩形、批注圆点都要画在页面元素上方，并随滚动和布局变化跟随。
 * 设计意图：所有图形放在一个 fixed 全屏、不接收鼠标事件的图层里，按元素的 getBoundingClientRect 定位，
 * 不给页面元素加 outline 或改布局，避免干扰页面本身的样式和尺寸。
 * 只有圆点接收点击。位置更新由 reposition() 统一处理，调用方在滚动、缩放、DOM 变化时调用。
 */
export class Overlay {
  readonly layer: HTMLDivElement
  private hoverBox: HTMLDivElement
  private hoverLabel: HTMLDivElement
  private marqueeEl: HTMLDivElement
  private selBoxes: HTMLDivElement[] = []
  private pinEls = new Map<string, HTMLButtonElement>()

  private hoverEl: Element | null = null
  private selection: Element[] = []
  private pins: PinSpec[] = []

  onPinClick: (id: string) => void = () => {}

  constructor(parent: HTMLElement) {
    this.layer = h('div', { class: 'layer' })
    this.hoverBox = h('div', { class: 'box', style: { display: 'none' } })
    this.hoverLabel = h('div', { class: 'box-label', style: { display: 'none' } })
    this.marqueeEl = h('div', { class: 'marquee', style: { display: 'none' } })
    this.layer.append(this.hoverBox, this.hoverLabel, this.marqueeEl)
    parent.append(this.layer)
  }

  /** 背景：改字和批注两种模式的悬停样式不同（虚线琥珀色 / 实线蓝色），标签说明可做的操作。 */
  showHover(el: Element | null, variant: 'text' | 'comment', label: string): void {
    this.hoverEl = el
    this.hoverBox.className = `box hover-${variant}`
    this.hoverLabel.className = `box-label ${variant}`
    this.hoverLabel.textContent = label
    this.positionHover()
  }

  get hovered(): Element | null {
    return this.hoverEl
  }

  showSelection(elements: Element[]): void {
    this.selection = elements
    while (this.selBoxes.length < elements.length) {
      const box = h('div', { class: 'box selected' })
      this.layer.insertBefore(box, this.marqueeEl)
      this.selBoxes.push(box)
    }
    this.positionSelection()
  }

  /** 背景：框选拖动过程中实时显示矩形。传 null 隐藏。 */
  showMarquee(rect: { x: number; y: number; w: number; h: number } | null): void {
    const m = this.marqueeEl
    if (!rect) {
      m.style.display = 'none'
      return
    }
    Object.assign(m.style, { display: 'block', left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` })
  }

  /**
   * 背景：批注保存后在元素右上角显示编号圆点，刷新、增删批注后都要重绘。
   * 设计意图：按 id 复用已有圆点 DOM，只增删差异部分，避免频繁重建造成闪烁。
   */
  setPins(pins: PinSpec[]): void {
    this.pins = pins
    const keys = new Set(pins.map(pinKey))
    for (const [key, el] of this.pinEls) {
      if (!keys.has(key)) {
        el.remove()
        this.pinEls.delete(key)
      }
    }
    pins.forEach((p) => {
      const key = pinKey(p)
      let el = this.pinEls.get(key)
      if (!el) {
        el = h('button', { class: 'pin', on: { click: (e) => { e.stopPropagation(); this.onPinClick(p.id) } } })
        this.layer.append(el)
        this.pinEls.set(key, el)
      }
      el.textContent = p.label
      el.title = p.id
      el.className = `pin ${p.status}`
    })
    this.positionPins()
  }

  /** 背景：从侧边栏定位到元素时，用一次闪烁让视线落到目标上。 */
  flash(el: Element): void {
    const r = el.getBoundingClientRect()
    const box = h('div', { class: 'box flash' })
    Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
    this.layer.append(box)
    window.setTimeout(() => box.remove(), 1300)
  }

  /** 背景：页面滚动、缩放、DOM 变化后，所有图形都要重新对齐元素。 */
  reposition(): void {
    this.positionHover()
    this.positionSelection()
    this.positionPins()
  }

  private positionHover(): void {
    const el = this.hoverEl
    if (!el || !el.isConnected) {
      this.hoverBox.style.display = 'none'
      this.hoverLabel.style.display = 'none'
      return
    }
    const r = el.getBoundingClientRect()
    place(this.hoverBox, r)
    this.hoverBox.style.display = 'block'
    if (!this.hoverLabel.textContent) {
      this.hoverLabel.style.display = 'none'
      return
    }
    const labelTop = r.top >= 24 ? r.top - 24 : r.bottom + 4
    Object.assign(this.hoverLabel.style, {
      display: 'block',
      left: `${Math.max(4, Math.min(r.left - 2, window.innerWidth - 364))}px`,
      top: `${Math.max(4, labelTop)}px`,
    })
  }

  private positionSelection(): void {
    this.selBoxes.forEach((box, i) => {
      const el = this.selection[i]
      if (!el || !el.isConnected) {
        box.style.display = 'none'
        return
      }
      place(box, el.getBoundingClientRect())
      box.style.display = 'block'
    })
  }

  private positionPins(): void {
    this.pins.forEach((p) => {
      const el = this.pinEls.get(pinKey(p))
      if (!el) return
      if (!p.el.isConnected) {
        el.style.display = 'none'
        return
      }
      const r = p.el.getBoundingClientRect()
      const hidden = r.width === 0 && r.height === 0
      el.style.display = hidden ? 'none' : 'block'
      el.style.left = `${r.right - 6 + p.stack * 26}px`
      el.style.top = `${r.top}px`
    })
  }
}

function place(box: HTMLElement, r: DOMRect): void {
  box.style.left = `${r.left}px`
  box.style.top = `${r.top}px`
  box.style.width = `${r.width}px`
  box.style.height = `${r.height}px`
}
