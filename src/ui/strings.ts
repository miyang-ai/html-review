/**
 * 背景：工具 UI 文案集中维护，方便统一措辞，后续需要多语言时只改这一处。
 * 设计意图：动态内容用 {key} 占位，由 fmt() 替换。
 */
export const S = {
  toolbarText: '改字',
  toolbarTextHint: '改字模式（T / Alt+T）',
  toolbarComment: '批注',
  toolbarCommentHint: '批注模式（C / Alt+C）',
  toolbarSidebar: '修改清单',
  toolbarCopy: '复制修改要求',
  toolbarExpand: 'HTML Review',

  modeText: '改字模式 · 点击文字直接修改 · Enter 保存 · Esc 退出',
  modeComment: '批注模式 · 单击选中 · 拖拽框选 · Shift 多选 · Alt+↑ 选父级 · Esc 退出',

  hoverEditable: '点击修改',
  hoverEdited: '已修改 · 原文：{text}',
  hoverParentHint: 'Alt+↑ 父级',

  popNewTitle: '新批注',
  popTargets: '{n} 个元素',
  popPlaceholder: '写下修改意见，Enter 保存，Shift+Enter 换行',
  popSave: '保存',
  popCancel: '取消',
  popReplyPlaceholder: '追加评论，Enter 发送',
  popEdit: '编辑',
  popResolve: '标记已处理',
  popReopen: '重新打开',
  popDelete: '删除',
  popLocate: '定位',
  popConfirmDelete: '删除这条批注？',

  sbTitle: '修改清单',
  sbAll: '全部',
  sbPending: '待处理',
  sbExported: '已导出',
  sbDone: '已处理',
  sbEdits: '改字',
  sbComments: '批注',
  sbEmpty: '还没有修改。按 T 改字，按 C 加批注。',
  sbLost: '定位失效',
  sbRevert: '撤销修改',
  sbRemove: '删除记录',
  sbCopy: '复制待处理（{n}）',
  sbCopySelected: '复制选中（{n}）',
  sbExportedToDone: '已导出批注全部标为已处理',
  sbClearDone: '清空已处理',
  sbRevertSelected: '还原选中改字（{n}）',
  sbRevertAll: '还原全部改字（{n}）',
  sbExportXml: '导出修改单',
  sbImportXml: '导入修改单',
  sbConfirmClear: '清空 {n} 条已处理 / 已生效的记录？',
  sbReplies: '{n} 条评论',

  status: { pending: '待处理', exported: '已导出', applied: '已生效', resolved: '已处理' },

  toastCopied: '已复制 {n} 条修改要求，粘贴给 AI 即可',
  toastUndo: '撤回',
  toastNothing: '没有待处理的修改。可以在修改清单里勾选条目后复制',
  toastCopyFailed: '无法写入剪贴板，请手动复制下面的内容',
  toastCommentSaved: '批注 {id} 已保存',
  toastEditSaved: '{id} 已保存',
  toastMarkedDone: '{n} 条批注已标为已处理',
  toastReverted: '已还原 {n} 处改字',
  toastApplied: '{n} 条改字已在源文件中生效',
  toastImported: '已导入 {n} 条记录',
  toastImportFailed: '导入失败：{msg}',
  toastImportOtherPage: '这份修改单来自另一个页面：\n{page}\n仍要导入到当前页面吗？',
  toastTooMany: '一次最多选中 {n} 个元素',
  toastNoTarget: '框里没有文字或元素',
  manualCopyTitle: '手动复制修改要求',
  close: '关闭',
} as const

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`))
}
