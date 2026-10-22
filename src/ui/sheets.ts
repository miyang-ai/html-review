/**
 * 背景：工具要能在任何页面上显示正常，包括 CSP 里 style-src 不允许 'unsafe-inline' 的线上网站
 * （通过浏览器插件注入时常见）。这类页面会拦截脚本插入的 <style> 元素，工具条会变成无样式的裸按钮。
 * 设计意图：优先用可构造样式表（new CSSStyleSheet + replaceSync，挂到 adoptedStyleSheets），
 * 它不受 CSP style-src 约束；浏览器不支持时回退到 <style> 元素。
 * 约束：返回的函数用于卸载时移除样式；同一个 root 重复调用会叠加，调用方负责只调用一次。
 */
export function adoptCss(root: Document | ShadowRoot, css: string, fallbackParent: Node): () => void {
  const view = (root instanceof Document ? root : root.ownerDocument).defaultView
  const Sheet = view?.CSSStyleSheet
  if (Sheet && 'adoptedStyleSheets' in root && 'replaceSync' in Sheet.prototype) {
    try {
      const sheet = new Sheet()
      sheet.replaceSync(css)
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
      return () => {
        root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet)
      }
    } catch (err) {
      console.warn('[html-review] 可构造样式表不可用，回退到 <style>', err)
    }
  }
  const doc = root instanceof Document ? root : root.ownerDocument
  const style = doc.createElement('style')
  style.textContent = css
  fallbackParent.appendChild(style)
  return () => style.remove()
}
