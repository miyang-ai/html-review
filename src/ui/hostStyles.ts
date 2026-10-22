import { HR_ATTR_PREFIX } from '../dom'
import { adoptCss } from './sheets'

const MARK_ATTR = `${HR_ATTR_PREFIX}styles`

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

/**
 * 背景：页面级样式要在卸载时干净移除，且同一页面只注入一次。
 * 设计意图：经 adoptCss 注入（可构造样式表不受 CSP style-src 限制），用 html 上的标记属性防重复。
 * 约束：返回的函数移除样式和标记，由 App.destroy 调用。
 */
export function injectHostStyles(doc: Document): () => void {
  const root = doc.documentElement
  if (root.hasAttribute(MARK_ATTR)) return () => {}
  root.setAttribute(MARK_ATTR, '')
  const remove = adoptCss(doc, CSS, doc.head ?? root)
  return () => {
    remove()
    root.removeAttribute(MARK_ATTR)
  }
}
