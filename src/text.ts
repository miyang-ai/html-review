/**
 * 背景：同一段文字在源码、DOM、contenteditable 编辑后会出现不同的空白（缩进换行、&nbsp;、连续空格）。
 * 设计意图：所有文本比对都先过这一层，把空白统一折叠成单个空格，避免「看起来一样却判定不同」。
 * 约束：只用于比对和展示摘要，写回 DOM 时使用原始 innerHTML。
 */
export function normalizeText(s: string | null | undefined): string {
  return (s ?? '').replace(/[\s\u00a0\u200b]+/g, ' ').trim()
}

/**
 * 背景：批注摘要、HTML 片段需要控制体积，避免修改单过长。
 * 设计意图：按字符截断并追加省略号，让读者知道内容被截断过。
 */
export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}

/**
 * 背景：修改单使用 XML 交给 AI，文本节点里的 < & 等字符会破坏结构。
 * 设计意图：只转义 XML 必需的五个字符，保持中文等内容原样可读。
 */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 背景：HTML 片段放进 XML 时，转义会让 AI 难以阅读。
 * 设计意图：用 CDATA 包裹原样保留；片段内若出现 `]]>`，按标准做法拆成两段 CDATA。
 */
export function cdata(s: string): string {
  return '<![CDATA[' + s.split(']]>').join(']]]]><![CDATA[>') + ']]>'
}

/**
 * 背景：修改单和侧边栏都要显示时间，且需要稳定格式便于 AI 和人阅读。
 * 设计意图：固定输出本地时间 YYYY-MM-DD HH:MM，不依赖浏览器语言设置。
 */
export function formatTime(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
