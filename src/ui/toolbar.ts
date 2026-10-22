import { h } from './h'
import { S } from './strings'
import type { Mode } from '../types'

export interface ToolbarHandlers {
  onText: () => void
  onComment: () => void
  onSidebar: () => void
  onCopy: () => void
}

/**
 * 背景：工具常驻在页面上，但阅读时不能挡内容。
 * 设计意图：平时只露出右下角一个圆按钮（带待处理数量），悬停或进入任一模式时展开成完整工具条。
 * 快捷键写在按钮上，帮助用户从点按钮过渡到用键盘。
 */
export class Toolbar {
  readonly el: HTMLDivElement
  private textBtn: HTMLButtonElement
  private commentBtn: HTMLButtonElement
  private sidebarBtn: HTMLButtonElement
  private mainBadge: HTMLSpanElement
  private listBadge: HTMLSpanElement

  constructor(parent: HTMLElement, handlers: ToolbarHandlers) {
    this.textBtn = h(
      'button',
      { class: 'tb-btn', title: S.toolbarTextHint, icon: 'type', on: { click: handlers.onText } },
      h('span', { text: S.toolbarText }),
      h('span', { class: 'tb-key', text: 'T' }),
    )
    this.commentBtn = h(
      'button',
      { class: 'tb-btn', title: S.toolbarCommentHint, icon: 'messageSquarePlus', on: { click: handlers.onComment } },
      h('span', { text: S.toolbarComment }),
      h('span', { class: 'tb-key', text: 'C' }),
    )
    this.listBadge = h('span', { class: 'badge', attrs: { hidden: '' } })
    this.sidebarBtn = h(
      'button',
      { class: 'tb-btn', title: S.toolbarSidebar, icon: 'listChecks', on: { click: handlers.onSidebar } },
      h('span', { text: S.toolbarSidebar }),
      this.listBadge,
    )
    const copyBtn = h('button', { class: 'tb-btn', title: S.toolbarCopy, icon: 'copy', on: { click: handlers.onCopy } }, h('span', { text: S.toolbarCopy }))
    this.mainBadge = h('span', { class: 'badge', attrs: { hidden: '' } })
    const main = h('button', { class: 'tb-btn tb-main', title: S.toolbarExpand, icon: 'penLine', on: { click: handlers.onSidebar } }, this.mainBadge)

    this.el = h(
      'div',
      { class: 'toolbar' },
      h('div', { class: 'tb-items' }, this.textBtn, this.commentBtn, h('span', { class: 'tb-sep' }), this.sidebarBtn, copyBtn, h('span', { class: 'tb-sep' })),
      main,
    )
    parent.append(this.el)
  }

  update(state: { mode: Mode; sidebarOpen: boolean; pending: number }): void {
    this.textBtn.className = `tb-btn${state.mode === 'text' ? ' active-text' : ''}`
    this.commentBtn.className = `tb-btn${state.mode === 'comment' ? ' active-comment' : ''}`
    this.sidebarBtn.className = `tb-btn${state.sidebarOpen ? ' active-sidebar' : ''}`
    this.el.classList.toggle('expanded', state.mode !== 'browse' || state.sidebarOpen)
    this.el.classList.toggle('beside-sidebar', state.sidebarOpen)
    for (const badge of [this.mainBadge, this.listBadge]) {
      badge.textContent = String(state.pending)
      badge.toggleAttribute('hidden', state.pending === 0)
    }
  }
}
