/** 工具宿主元素与注入样式上的标记属性 */
export const HOST_ATTR = 'data-hr-host'
/** 所有工具写到页面元素上的属性都以此为前缀，导出 HTML 时统一剥离 */
export const HR_ATTR_PREFIX = 'data-hr-'

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'META', 'LINK', 'HEAD', 'TITLE', 'BR'])
const NON_TEXT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'IFRAME', 'OBJECT', 'EMBED'])
const BLOCKISH = /^(block|flex|grid|table|list-item|flow-root|table-.*)$/

/**
 * 背景：悬停、框选、全文搜索都要遍历页面元素，必须排除工具自己的 UI 和注入的样式。
 * 设计意图：工具 UI 全在带 HOST_ATTR 的宿主元素的 Shadow DOM 里，页面侧只需判断宿主和注入样式。
 */
export function isToolElement(el: Element | null): boolean {
  if (!el) return false
  return !!el.closest(`[${HOST_ATTR}]`)
}

/**
 * 背景：并非所有元素都值得被选中或比对（script、style、br 等）。
 * 设计意图：集中一处判断，框选和文本搜索共用，避免各处规则不一致。
 */
export function isSelectableElement(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return false
  if (isToolElement(el)) return false
  if (el === el.ownerDocument.documentElement || el === el.ownerDocument.body) return false
  return true
}

/**
 * 背景：工具会在页面元素上写 data-hr-* 属性（已改标记、编辑中标记）和 contenteditable，
 * 这些不能出现在交给 AI 的原文 / 新文 HTML 里，否则 AI 会把工具痕迹写进源文件。
 * 设计意图：克隆后剥离，不改动页面上的真实元素。
 * 约束：只剥离工具写入的属性；页面原本就有的 contenteditable 通过 data-hr-editing 区分后保留。
 */
export function cleanHtml(el: Element, mode: 'inner' | 'outer'): string {
  const clone = el.cloneNode(true) as Element
  const all = [clone, ...Array.from(clone.querySelectorAll('*'))]
  for (const node of all) {
    const wasEditing = node.hasAttribute('data-hr-editing')
    const hadOwnEditable = node.getAttribute('data-hr-own-editable')
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.startsWith(HR_ATTR_PREFIX)) node.removeAttribute(attr.name)
    }
    if (wasEditing) {
      if (hadOwnEditable) node.setAttribute('contenteditable', hadOwnEditable)
      else node.removeAttribute('contenteditable')
      node.removeAttribute('spellcheck')
    }
  }
  return mode === 'inner' ? clone.innerHTML : clone.outerHTML
}

/**
 * 背景：判断一个元素是否在文字行内流动，决定改字时编辑范围要不要向上扩到整段。
 * 设计意图：inline / inline-block / inline-flex 都算行内，它们是段落里的徽标、加粗、链接等。
 */
export function isInlineLevel(el: Element): boolean {
  const display = getComputedStyle(el).display
  return display.startsWith('inline') || display === 'contents'
}

/**
 * 背景：改字时如果一个容器里有块级子元素（如卡片里的标题 + 段落），整块进入编辑会把结构暴露给用户误删。
 * 设计意图：有块级子元素的容器不作为编辑单位，改为编辑更内层的文本元素。
 */
export function hasBlockChild(el: Element): boolean {
  for (const child of Array.from(el.children)) {
    if (SKIP_TAGS.has(child.tagName)) continue
    const display = getComputedStyle(child).display
    if (display === 'none') continue
    if (BLOCKISH.test(display)) return true
  }
  return false
}

/** 背景：判断元素自身（不含子元素）是否直接包含可见文字，用于确定点击落点最近的文本单位。 */
export function hasDirectText(el: Element): boolean {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) return true
  }
  return false
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 背景：Deck 的 slide 切换、折叠面板等会把元素藏起来（visibility / opacity），但盒子仍有尺寸，
 * 框选时不能把看不见的元素算进去。
 * 约束：checkVisibility 不可用的环境（旧浏览器、jsdom）一律视为可见。
 */
export function isVisible(el: Element): boolean {
  const check = (el as Element & { checkVisibility?: (o: object) => boolean }).checkVisibility
  return typeof check === 'function' ? check.call(el, { opacityProperty: true, visibilityProperty: true }) : true
}

/**
 * 背景：用户框选时看的是「字」，而不是元素的盒子。副标题、段落这类块元素往往占满整行，
 * 盒子比文字宽得多，框住整段文字也框不住盒子，框选就落空了。
 * 设计意图：自身直接含文字的元素，用文字实际铺开的范围（Range 的包围盒）判断是否被框住；
 * 其余元素（卡片、网格、图片、SVG）仍用盒子，因为它们的边框和背景就是用户看到的边界。
 * 约束：Range 取不到尺寸时回退到盒子。
 */
export function visualRect(el: Element): DOMRect {
  const box = el.getBoundingClientRect()
  if (el instanceof SVGElement || !hasDirectText(el)) return box
  const range = el.ownerDocument.createRange()
  range.selectNodeContents(el)
  const r = range.getBoundingClientRect()
  return r.width > 0 && r.height > 0 ? r : box
}

/**
 * 背景：框选只圈住一段话的一部分时（例如「…：占大头的非工作日常需求尚未跑通商业化」里冒号后面那半句），
 * 这半句是裸文本节点，没有任何元素被完整框住，用户会以为框选失灵。
 * 设计意图：逐行检查文本节点，某一行与框的重叠高度达到行高的 60%、宽度至少一个字时，
 * 把这段文字所在的元素算作命中。高度阈值用来排除框边缘只擦到上下相邻行的情况。
 * 约束：只返回直接包含命中文字的元素，由调用方再做最外层合并。
 */
export function textHitElements(root: Element, rect: Rect): Element[] {
  const doc = root.ownerDocument
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = doc.createRange()
  const hits = new Set<Element>()
  const right = rect.x + rect.w
  const bottom = rect.y + rect.h
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (!parent || hits.has(parent) || !(node.textContent ?? '').trim() || !isSelectableElement(parent)) continue
    const pr = parent.getBoundingClientRect()
    if (pr.right < rect.x || pr.left > right || pr.bottom < rect.y || pr.top > bottom || !isVisible(parent)) continue
    range.selectNodeContents(node)
    for (const line of Array.from(range.getClientRects())) {
      const w = Math.min(line.right, right) - Math.max(line.left, rect.x)
      const h = Math.min(line.bottom, bottom) - Math.max(line.top, rect.y)
      if (h >= line.height * 0.6 && w >= Math.min(12, line.width)) {
        hits.add(parent)
        break
      }
    }
  }
  return [...hits]
}

/**
 * 背景：改字模式下，用户点在一段文字的任意位置（可能是段落里的 <span class="lbl"> 或 <b>），
 * 期望的是改「这一段」，而不是只改那个小标签。
 * 设计意图：从落点开始，只要当前元素是行内的、且父元素里没有块级子元素，就继续向上扩，
 * 最终停在「只包含行内内容的最近块」。卡片这种混合容器不会被选中，会停在里面的 <b> 或 <p>。
 * 放弃的方案：直接用 event.target，会导致改一段话被拆成多条碎片记录。
 * 约束：SVG 内文字、表单控件、媒体元素不可编辑，返回 null。
 */
export function findEditableTarget(start: Element | null): Element | null {
  if (!start || isToolElement(start)) return null
  if (start.closest('svg') || NON_TEXT_TAGS.has(start.tagName)) return null
  if (!isSelectableElement(start)) return null

  let best: Element | null = hasDirectText(start) ? start : null
  let cur: Element = start
  while (isInlineLevel(cur)) {
    const parent: Element | null = cur.parentElement
    if (!parent || !isSelectableElement(parent) || hasBlockChild(parent)) break
    cur = parent
    best = cur
  }
  if (!best && !hasBlockChild(start) && (start.textContent ?? '').trim()) best = start
  if (!best || !(best.textContent ?? '').trim()) return null
  return best
}

/**
 * 背景：框选和多选后，选中集合里可能同时包含父元素和它的子元素，交给 AI 时会重复。
 * 设计意图：只保留最外层元素；如果剩下的元素恰好是同一个父元素的全部可见子元素，合并为父元素，
 * 让「框住整组卡片」得到「卡片网格」这一个目标。
 */
export function reduceSelection(elements: Element[]): Element[] {
  let set = elements.filter((el, i) => elements.indexOf(el) === i)
  set = set.filter((el) => !set.some((other) => other !== el && other.contains(el)))
  while (set.length > 1) {
    const parent = set[0].parentElement
    if (!parent || !isSelectableElement(parent) || !set.every((el) => el.parentElement === parent)) break
    const visibleChildren = Array.from(parent.children).filter((c) => {
      if (!isSelectableElement(c)) return false
      const r = c.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })
    if (visibleChildren.length !== set.length) break
    set = [parent]
  }
  return set
}

/** 背景：侧边栏要按页面阅读顺序排列条目。设计意图：用 DOM 文档顺序比较，不受滚动位置影响。 */
export function compareDocumentOrder(a: Element, b: Element): number {
  if (a === b) return 0
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}
