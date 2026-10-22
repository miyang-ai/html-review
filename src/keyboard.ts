import type { App } from './app'

/**
 * 背景：判断按键是否发生在可输入区域（页面输入框、可编辑元素、工具自己的输入框），
 * 在这些地方单字母 T / C 是在打字，不能当快捷键。
 */
export function isTypingTarget(node: EventTarget | undefined): boolean {
  if (!(node instanceof Element)) return false
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) return true
  return node instanceof HTMLElement && node.isContentEditable
}

/**
 * 背景：快捷键要在任何页面上可靠生效，包括自带键盘翻页的 Deck。
 * 设计意图：
 * - 在 window 捕获阶段监听，先于页面自身的处理器；命中快捷键后阻止冒泡，页面收不到这次按键；
 * - 用 e.code 判断按键位置，不受键盘布局和 Alt 组合产生的特殊字符（Mac 上 Alt+T 是「†」）影响；
 * - 中文输入法开启时单字母按键的 keyCode 为 229，会被跳过，这时用 Alt 组合键；
 * - 改字会话中，所有按键都阻止冒泡，只把 Enter / Esc 交给编辑器。
 * 约束：工具自己的输入框里的按键由各组件处理，这里直接放行。
 */
export function handleKeydown(app: App, e: KeyboardEvent): void {
  const path = e.composedPath()
  if (app.editor.active) {
    e.stopPropagation()
    app.editor.onKeydown(e)
    return
  }
  if (path.includes(app.host)) return

  if (e.key === 'Escape') {
    if (app.handleEscape()) {
      e.preventDefault()
      e.stopPropagation()
    }
    return
  }
  if (isTypingTarget(path[0])) return
  if (e.ctrlKey || e.metaKey || e.isComposing || e.keyCode === 229 || e.repeat) return

  const plain = !e.altKey && !e.shiftKey
  const withAlt = e.altKey && !e.shiftKey
  const consume = () => {
    e.preventDefault()
    e.stopPropagation()
  }

  if (e.code === 'KeyT' && (plain || withAlt)) {
    consume()
    app.toggleMode('text')
  } else if (e.code === 'KeyC' && (plain || withAlt)) {
    consume()
    app.toggleMode('comment')
  } else if (app.mode === 'comment' && withAlt && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    consume()
    app.picker.climb(e.key === 'ArrowUp' ? 1 : -1)
  }
}

/** 背景：改字会话中，keyup / keypress 也要拦下，否则页面仍可能响应（部分 Deck 监听 keyup）。 */
export function handleKeyOther(app: App, e: KeyboardEvent): void {
  if (app.editor.active) e.stopPropagation()
}
