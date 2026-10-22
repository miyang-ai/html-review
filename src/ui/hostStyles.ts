import { HOST_ATTR } from '../dom'

/**
 * 背景：有几种视觉状态必须作用在页面元素本身（已改文字的底色、编辑中的高亮、模式下的光标），
 * Shadow DOM 里的样式够不到宿主页面元素。
 * 设计意图：注入一小段只针对 data-hr-* 属性和 html[data-hr-mode] 的样式，不影响页面其他元素。
 * 约束：这些属性在导出 HTML 时会被 cleanHtml 剥离，不会进入修改单。
 */
const CSS = `
[data-hr-edit-id] {
  background-color: rgba(250, 204, 21, 0.28) !important;
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.28) !important;
  border-radius: 2px;
}
[data-hr-editing] {
  outline: 2px solid #d97706 !important;
  outline-offset: 3px !important;
  background-color: rgba(255, 251, 235, 0.95) !important;
  box-shadow: none !important;
  cursor: text !important;
  -webkit-user-select: text !important;
  user-select: text !important;
}
html[data-hr-mode="text"] [data-hr-hover] { cursor: text !important; }
html[data-hr-mode="comment"], html[data-hr-mode="comment"] * {
  cursor: crosshair !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}
`

export function injectHostStyles(doc: Document): HTMLStyleElement {
  const existing = doc.querySelector<HTMLStyleElement>(`style[${HOST_ATTR}]`)
  if (existing) return existing
  const style = doc.createElement('style')
  style.setAttribute(HOST_ATTR, 'styles')
  style.textContent = CSS
  ;(doc.head ?? doc.documentElement).appendChild(style)
  return style
}
