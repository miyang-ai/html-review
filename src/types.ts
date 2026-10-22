/**
 * 条目状态。
 * - pending：新建或修改后尚未复制给 AI
 * - exported：已复制进修改要求，等待 AI 落到源文件
 * - applied：改字记录在刷新后发现源文件已是新文本，自动判定为已生效
 * - resolved：用户手动标记已处理
 */
export type ItemStatus = 'pending' | 'exported' | 'applied' | 'resolved'

/** 一个页面元素的定位快照，用于刷新后找回元素，也是给 AI 的定位依据。 */
export interface Anchor {
  xpath: string
  selector: string
  /** 最近的 h1-h3 标题文字，帮助理解上下文 */
  section: string
  /** 规范化后的文本；改字记录里是完整原文，批注里截断到 200 字 */
  text: string
  /** 清洗后的 outerHTML 片段，截断到 1500 字 */
  html: string
}

export interface TextEditItem {
  id: string
  kind: 'edit'
  anchor: Anchor
  beforeHtml: string
  afterHtml: string
  beforeText: string
  afterText: string
  status: ItemStatus
  createdAt: number
  updatedAt: number
}

export interface Reply {
  id: string
  body: string
  createdAt: number
}

export interface CommentItem {
  id: string
  kind: 'comment'
  anchors: Anchor[]
  body: string
  replies: Reply[]
  status: ItemStatus
  createdAt: number
  updatedAt: number
}

export type ReviewItem = TextEditItem | CommentItem

export interface PageState {
  version: 1
  /** 页面标识：协议 + 主机 + 路径 */
  page: string
  title: string
  seq: { edit: number; comment: number; reply: number }
  items: ReviewItem[]
}

export type Mode = 'browse' | 'text' | 'comment'
