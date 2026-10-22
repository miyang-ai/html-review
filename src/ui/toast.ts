import { h } from './h'
import { S } from './strings'

/**
 * 背景：保存、复制、导入等操作需要轻量反馈，复制修改要求还需要「撤回」入口。
 * 设计意图：底部居中单条提示，新提示覆盖旧提示；带操作按钮时停留更久。
 * 剪贴板不可用时，提供手动复制弹窗作为降级，保证修改要求一定能拿到。
 */
export class Toast {
  private el: HTMLDivElement
  private timer = 0

  constructor(private parent: HTMLElement) {
    this.el = h('div', { class: 'toast', attrs: { hidden: '' } })
    parent.append(this.el)
  }

  show(message: string, opts: { error?: boolean; action?: { label: string; run: () => void }; ms?: number } = {}): void {
    window.clearTimeout(this.timer)
    this.el.replaceChildren(h('span', { text: message }))
    this.el.className = `toast${opts.error ? ' error' : ''}`
    if (opts.action) {
      const { label, run } = opts.action
      this.el.append(h('button', { text: label, on: { click: () => { run(); this.hide() } } }))
    }
    this.el.removeAttribute('hidden')
    this.timer = window.setTimeout(() => this.hide(), opts.ms ?? (opts.action ? 6000 : 2400))
  }

  hide(): void {
    this.el.setAttribute('hidden', '')
  }

  /** 背景：file:// 或权限受限时剪贴板写入会失败，此时把全文放进可全选的文本框让用户手动复制。 */
  manualCopy(text: string): void {
    const textarea = h('textarea', { class: 'input' })
    textarea.value = text
    const mask = h('div', { class: 'modal-mask' })
    const close = () => mask.remove()
    mask.append(
      h(
        'div',
        { class: 'modal' },
        h('div', { class: 'sb-title', text: S.manualCopyTitle }),
        h('div', { class: 'sb-sub', text: S.toastCopyFailed }),
        textarea,
        h('div', { class: 'pop-actions' }, h('button', { class: 'btn primary', text: S.close, on: { click: close } })),
      ),
    )
    mask.addEventListener('click', (e) => {
      if (e.target === mask) close()
    })
    this.parent.append(mask)
    textarea.focus()
    textarea.select()
  }
}
