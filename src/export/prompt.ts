import type { ReviewItem } from '../types'
import { escapeXml, formatTime } from '../text'
import { itemToXml } from './xml'

export interface PromptMeta {
  /** file:// 页面为本地绝对路径，其他为完整 URL */
  source: string
  isLocalFile: boolean
  title: string
  exportedAt: number
}

/**
 * 背景：用户在页面上改完字、写完批注后，要把这些意见一次交给 AI 改源文件。
 * AI 拿不到浏览器里的 DOM，只能靠文字描述找到源码位置。
 * 设计意图：提示词分三段，先给源文件和规则，再给 XML 修改单。
 * 规则里明确「以原文为准」，因为 XPath 来自运行时 DOM，可能和源码结构有出入（JS 生成的节点、浏览器自动补的 tbody）。
 * 要求 AI 逐条回报，方便用户核对哪些没改成。
 * 约束：提示词文案遵守写作规范（中文引号、无破折号、无对比强调句式）。
 */
export function buildPrompt(items: ReviewItem[], meta: PromptMeta): string {
  const edits = items.filter((i) => i.kind === 'edit').length
  const comments = items.length - edits
  const sourceLine = meta.isLocalFile
    ? `源文件：${meta.source}`
    : `页面地址：${meta.source}（请先找到渲染这个页面的源文件）`

  const rules = [
    '1. 用 xpath 和 selector 定位元素，再用原文核对；三者有出入时以原文为准。xpath 来自浏览器运行时的 DOM，可能与源码结构略有差别。',
    '2. text_edit 条目：把 before 的文字改成 after。有 before_html / after_html 时按 HTML 修改，保留元素自身的标签、属性和行内标记。',
    '3. comment 条目：按 request 和 replies 里的意见修改 targets 里的元素，可以改文案、结构或样式；一条批注有多个 target 时，意见同时作用于这些元素。',
    '4. 只改条目涉及的内容，其余代码保持原样。',
    '5. 如果原文在源码里找不到（例如由 JS 生成），请找到生成它的数据或代码去改。',
    '6. 改完后逐条回报：已修改 / 无法定位 / 需要确认，并附一句原因。',
  ]

  const xml = [
    `<review page="${escapeXml(meta.title)}" count="${items.length}" text_edits="${edits}" comments="${comments}">`,
    ...items.map((item) => itemToXml(item, false)),
    '</review>',
  ].join('\n')

  return [
    '请按下面的修改单修改源文件。',
    '',
    sourceLine,
    `页面标题：${meta.title || '（无标题）'}`,
    `导出时间：${formatTime(meta.exportedAt)}`,
    `条目数：改字 ${edits} 条，批注 ${comments} 条`,
    '',
    '规则：',
    ...rules,
    '',
    xml,
    '',
  ].join('\n')
}
