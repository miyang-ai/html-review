/*! HTML Review v0.2.0 | MIT | Copyright (c) 2025 Miyang Tech (Shanghai) Co., Ltd. | Icons: Lucide (ISC) */
"use strict";
(() => {
  // src/ui/styles.css
  var styles_default = "/* 所有工具 UI 都在 Shadow DOM 内，宿主页面样式不会渗透进来 */\n:host {\n  all: initial;\n}\n\n* {\n  box-sizing: border-box;\n}\n\n.root {\n  --ink: #0f172a;\n  --ink-2: #334155;\n  --muted: #64748b;\n  --line: #e2e8f0;\n  --bg: #ffffff;\n  --bg-2: #f8fafc;\n  --text-accent: #d97706;\n  --text-fill: rgba(245, 158, 11, 0.12);\n  --comment-accent: #2563eb;\n  --comment-fill: rgba(37, 99, 235, 0.08);\n  --ok: #059669;\n  --danger: #dc2626;\n  --radius: 10px;\n  --shadow: 0 10px 30px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08);\n  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--ink);\n  -webkit-font-smoothing: antialiased;\n}\n\nbutton {\n  font: inherit;\n  color: inherit;\n  cursor: pointer;\n  border: none;\n  background: none;\n  padding: 0;\n}\n\nsvg {\n  display: block;\n  flex: none;\n}\n\n/* ---------- 覆盖层 ---------- */\n.layer {\n  position: fixed;\n  inset: 0;\n  pointer-events: none;\n  z-index: 2147483640;\n}\n\n.box {\n  position: fixed;\n  pointer-events: none;\n  border-radius: 4px;\n  transition: left 60ms ease-out, top 60ms ease-out, width 60ms ease-out, height 60ms ease-out;\n}\n\n.box.hover-text {\n  outline: 2px dashed var(--text-accent);\n  outline-offset: 2px;\n  background: var(--text-fill);\n}\n\n.box.hover-comment {\n  outline: 2px solid var(--comment-accent);\n  outline-offset: 1px;\n  background: var(--comment-fill);\n}\n\n.box.selected {\n  outline: 2px solid var(--comment-accent);\n  outline-offset: 1px;\n  background: rgba(37, 99, 235, 0.14);\n  transition: none;\n}\n\n.box.flash {\n  outline: 3px solid var(--comment-accent);\n  outline-offset: 3px;\n  animation: hr-flash 1.2s ease-out forwards;\n}\n\n@keyframes hr-flash {\n  0% { opacity: 1; }\n  70% { opacity: 1; }\n  100% { opacity: 0; }\n}\n\n.box-label {\n  position: fixed;\n  pointer-events: none;\n  max-width: 360px;\n  padding: 2px 8px;\n  border-radius: 6px;\n  font-size: 12px;\n  line-height: 18px;\n  color: #fff;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.box-label.text { background: var(--text-accent); }\n.box-label.comment { background: var(--comment-accent); }\n\n.marquee {\n  position: fixed;\n  pointer-events: none;\n  border: 1.5px dashed var(--comment-accent);\n  background: rgba(37, 99, 235, 0.06);\n  border-radius: 2px;\n}\n\n.pin {\n  position: fixed;\n  pointer-events: auto;\n  min-width: 22px;\n  height: 22px;\n  padding: 0 6px;\n  border-radius: 11px 11px 11px 2px;\n  background: var(--comment-accent);\n  color: #fff;\n  font-size: 12px;\n  font-weight: 600;\n  line-height: 22px;\n  text-align: center;\n  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);\n  cursor: pointer;\n  transform: translate(-30%, -70%);\n}\n\n.pin.exported {\n  background: #fff;\n  color: var(--comment-accent);\n  box-shadow: 0 0 0 1.5px var(--comment-accent), 0 2px 6px rgba(15, 23, 42, 0.12);\n}\n\n.pin:hover { transform: translate(-30%, -70%) scale(1.1); }\n\n/* ---------- 模式提示条 ---------- */\n.mode-badge {\n  position: fixed;\n  top: 12px;\n  left: 50%;\n  transform: translateX(-50%);\n  z-index: 2147483645;\n  pointer-events: none;\n  padding: 6px 14px;\n  border-radius: 999px;\n  color: #fff;\n  font-size: 12px;\n  box-shadow: var(--shadow);\n  white-space: nowrap;\n}\n\n.mode-badge.text { background: var(--text-accent); }\n.mode-badge.comment { background: var(--comment-accent); }\n.mode-badge[hidden] { display: none; }\n\n/* ---------- 工具条 ---------- */\n.toolbar {\n  position: fixed;\n  right: 20px;\n  bottom: 20px;\n  z-index: 2147483646;\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  padding: 4px;\n  background: var(--bg);\n  border: 1px solid var(--line);\n  border-radius: 999px;\n  box-shadow: var(--shadow);\n  transition: right 200ms ease;\n}\n\n/* 修改清单打开时让出右侧，避免挡住清单底部按钮 */\n.toolbar.beside-sidebar { right: 400px; }\n\n.toolbar .tb-btn {\n  position: relative;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  height: 32px;\n  padding: 0 10px;\n  border-radius: 999px;\n  color: var(--ink-2);\n  white-space: nowrap;\n}\n\n.toolbar .tb-btn:hover { background: var(--bg-2); color: var(--ink); }\n.toolbar .tb-btn.active-text { background: var(--text-accent); color: #fff; }\n.toolbar .tb-btn.active-comment { background: var(--comment-accent); color: #fff; }\n.toolbar .tb-btn.active-sidebar { background: var(--ink); color: #fff; }\n\n.toolbar .tb-key {\n  font-size: 11px;\n  opacity: 0.6;\n}\n\n.toolbar .tb-sep {\n  width: 1px;\n  height: 18px;\n  background: var(--line);\n  margin: 0 2px;\n}\n\n.toolbar .tb-main {\n  width: 32px;\n  padding: 0;\n  justify-content: center;\n}\n\n.toolbar .tb-items {\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  overflow: hidden;\n  max-width: 0;\n  opacity: 0;\n  transition: max-width 180ms ease, opacity 120ms ease;\n}\n\n.toolbar.expanded .tb-items,\n.toolbar:hover .tb-items {\n  max-width: 520px;\n  opacity: 1;\n}\n\n.badge {\n  position: absolute;\n  top: -4px;\n  right: -4px;\n  min-width: 16px;\n  height: 16px;\n  padding: 0 4px;\n  border-radius: 8px;\n  background: var(--danger);\n  color: #fff;\n  font-size: 10px;\n  font-weight: 600;\n  line-height: 16px;\n  text-align: center;\n}\n\n.badge[hidden] { display: none; }\n\n/* ---------- 批注弹窗 ---------- */\n.popover {\n  position: fixed;\n  z-index: 2147483647;\n  width: 340px;\n  background: var(--bg);\n  border: 1px solid var(--line);\n  border-radius: var(--radius);\n  box-shadow: var(--shadow);\n  overflow: hidden;\n}\n\n.popover[hidden] { display: none; }\n\n.pop-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 12px 6px;\n}\n\n.pop-id {\n  font-weight: 600;\n  color: var(--comment-accent);\n}\n\n.pop-meta {\n  flex: 1;\n  min-width: 0;\n  color: var(--muted);\n  font-size: 12px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.icon-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 26px;\n  height: 26px;\n  border-radius: 6px;\n  color: var(--muted);\n}\n\n.icon-btn:hover { background: var(--bg-2); color: var(--ink); }\n.icon-btn.danger:hover { color: var(--danger); }\n\n.pop-body { padding: 0 12px 10px; }\n\n.pop-text {\n  white-space: pre-wrap;\n  word-break: break-word;\n  color: var(--ink);\n  font-size: 13px;\n}\n\ntextarea.input {\n  display: block;\n  width: 100%;\n  min-height: 64px;\n  max-height: 200px;\n  resize: vertical;\n  padding: 8px 10px;\n  border: 1px solid var(--line);\n  border-radius: 8px;\n  font: inherit;\n  color: var(--ink);\n  background: var(--bg);\n  outline: none;\n}\n\ntextarea.input:focus { border-color: var(--comment-accent); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }\ntextarea.input.small { min-height: 36px; }\n\n.pop-actions {\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 6px;\n  padding: 8px 12px 10px;\n}\n\n.pop-actions .spacer { flex: 1; }\n\n.btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  height: 28px;\n  padding: 0 10px;\n  border-radius: 7px;\n  font-size: 12px;\n  color: var(--ink-2);\n  background: var(--bg-2);\n  border: 1px solid var(--line);\n}\n\n.btn:hover { color: var(--ink); border-color: #cbd5e1; }\n.btn.primary { background: var(--ink); color: #fff; border-color: var(--ink); }\n.btn.primary:hover { background: #1e293b; }\n.btn.primary.comment { background: var(--comment-accent); border-color: var(--comment-accent); }\n.btn:disabled { opacity: 0.45; cursor: default; }\n\n.replies {\n  border-top: 1px solid var(--line);\n  max-height: 220px;\n  overflow: auto;\n}\n\n.reply {\n  display: flex;\n  gap: 8px;\n  padding: 8px 12px;\n  border-bottom: 1px solid var(--bg-2);\n}\n\n.reply-text {\n  flex: 1;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n.reply-time {\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.reply-box {\n  display: flex;\n  gap: 6px;\n  align-items: flex-end;\n  padding: 8px 12px;\n  border-top: 1px solid var(--line);\n  background: var(--bg-2);\n}\n\n.reply-box textarea { flex: 1; }\n\n/* ---------- 状态标签 ---------- */\n.chip {\n  display: inline-flex;\n  align-items: center;\n  height: 18px;\n  padding: 0 6px;\n  border-radius: 4px;\n  font-size: 11px;\n  white-space: nowrap;\n  background: var(--bg-2);\n  color: var(--muted);\n}\n\n.chip.pending { background: #fef3c7; color: #92400e; }\n.chip.exported { background: #dbeafe; color: #1e40af; }\n.chip.applied, .chip.resolved { background: #d1fae5; color: #065f46; }\n.chip.lost { background: #fee2e2; color: #991b1b; }\n\n/* ---------- 侧边栏 ---------- */\n.sidebar {\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  z-index: 2147483646;\n  width: 380px;\n  display: flex;\n  flex-direction: column;\n  background: var(--bg);\n  border-left: 1px solid var(--line);\n  box-shadow: -10px 0 30px rgba(15, 23, 42, 0.1);\n  transform: translateX(100%);\n  transition: transform 200ms ease;\n}\n\n.sidebar.open { transform: translateX(0); }\n\n.sb-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 14px 16px 10px;\n}\n\n.sb-title { font-size: 15px; font-weight: 600; flex: 1; }\n\n.sb-tabs {\n  display: flex;\n  gap: 4px;\n  padding: 0 16px 10px;\n  border-bottom: 1px solid var(--line);\n}\n\n.sb-tab {\n  height: 26px;\n  padding: 0 10px;\n  border-radius: 6px;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.sb-tab:hover { color: var(--ink); background: var(--bg-2); }\n.sb-tab.active { color: var(--ink); background: var(--bg-2); font-weight: 600; }\n\n.sb-list {\n  flex: 1;\n  overflow: auto;\n  padding: 8px 0;\n}\n\n.sb-group {\n  padding: 10px 16px 4px;\n  color: var(--muted);\n  font-size: 12px;\n  font-weight: 600;\n}\n\n.sb-empty {\n  padding: 40px 24px;\n  color: var(--muted);\n  text-align: center;\n}\n\n.sb-item {\n  display: flex;\n  gap: 10px;\n  margin: 2px 8px;\n  padding: 10px 8px;\n  border-radius: 8px;\n  cursor: pointer;\n}\n\n.sb-item:hover { background: var(--bg-2); }\n.sb-item.dim { opacity: 0.55; }\n\n.sb-check {\n  margin-top: 2px;\n  width: 14px;\n  height: 14px;\n  accent-color: var(--ink);\n  cursor: pointer;\n  flex: none;\n}\n\n.sb-main { flex: 1; min-width: 0; }\n\n.sb-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin-bottom: 4px;\n}\n\n.sb-id { font-weight: 600; }\n.sb-id.edit { color: var(--text-accent); }\n.sb-id.comment { color: var(--comment-accent); }\n\n.sb-section {\n  flex: 1;\n  min-width: 0;\n  color: var(--muted);\n  font-size: 12px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.sb-before {\n  color: var(--muted);\n  text-decoration: line-through;\n  word-break: break-word;\n}\n\n.sb-after { color: var(--ink); word-break: break-word; }\n\n.sb-body {\n  white-space: pre-wrap;\n  word-break: break-word;\n  display: -webkit-box;\n  -webkit-line-clamp: 4;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n.sb-sub { margin-top: 4px; color: var(--muted); font-size: 12px; }\n\n.sb-actions {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  opacity: 0;\n}\n\n.sb-item:hover .sb-actions { opacity: 1; }\n\n.sb-foot {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  padding: 12px 16px;\n  border-top: 1px solid var(--line);\n  background: var(--bg-2);\n}\n\n.sb-foot .btn.primary { flex: 1 1 100%; justify-content: center; height: 34px; font-size: 13px; }\n\n/* ---------- 提示 ---------- */\n/* 放在工具条上方，避免与工具条（尤其清单打开后左移时）重叠 */\n.toast {\n  position: fixed;\n  left: 50%;\n  bottom: 76px;\n  z-index: 2147483647;\n  transform: translateX(-50%);\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  max-width: 560px;\n  padding: 10px 14px;\n  border-radius: 10px;\n  background: var(--ink);\n  color: #fff;\n  box-shadow: var(--shadow);\n  white-space: pre-wrap;\n}\n\n.toast.error { background: var(--danger); }\n.toast[hidden] { display: none; }\n.toast button { color: #93c5fd; font-weight: 600; }\n\n.modal-mask {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483647;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(15, 23, 42, 0.35);\n}\n\n.modal {\n  width: min(720px, 90vw);\n  background: var(--bg);\n  border-radius: 12px;\n  box-shadow: var(--shadow);\n  padding: 16px;\n}\n\n.modal textarea { height: 50vh; font-family: ui-monospace, Menlo, monospace; font-size: 12px; }\n.modal .pop-actions { padding: 12px 0 0; }\n";

  // src/icons/type.svg
  var type_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-type"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 4v16" />\n  <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />\n  <path d="M9 20h6" />\n</svg>\n';

  // src/icons/message-square-plus.svg
  var message_square_plus_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-message-square-plus"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />\n  <path d="M12 8v6" />\n  <path d="M9 11h6" />\n</svg>\n';

  // src/icons/panel-right.svg
  var panel_right_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-panel-right"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <rect width="18" height="18" x="3" y="3" rx="2" />\n  <path d="M15 3v18" />\n</svg>\n';

  // src/icons/copy.svg
  var copy_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-copy"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />\n  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />\n</svg>\n';

  // src/icons/x.svg
  var x_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-x"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M18 6 6 18" />\n  <path d="m6 6 12 12" />\n</svg>\n';

  // src/icons/check.svg
  var check_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-check"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M20 6 9 17l-5-5" />\n</svg>\n';

  // src/icons/trash-2.svg
  var trash_2_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-trash-2"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M10 11v6" />\n  <path d="M14 11v6" />\n  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />\n  <path d="M3 6h18" />\n  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />\n</svg>\n';

  // src/icons/crosshair.svg
  var crosshair_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-crosshair"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="10" />\n  <line x1="22" x2="18" y1="12" y2="12" />\n  <line x1="6" x2="2" y1="12" y2="12" />\n  <line x1="12" x2="12" y1="6" y2="2" />\n  <line x1="12" x2="12" y1="22" y2="18" />\n</svg>\n';

  // src/icons/undo-2.svg
  var undo_2_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-undo-2"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M9 14 4 9l5-5" />\n  <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />\n</svg>\n';

  // src/icons/download.svg
  var download_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-download"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 15V3" />\n  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />\n  <path d="m7 10 5 5 5-5" />\n</svg>\n';

  // src/icons/upload.svg
  var upload_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-upload"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M12 3v12" />\n  <path d="m17 8-5-5-5 5" />\n  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />\n</svg>\n';

  // src/icons/pencil.svg
  var pencil_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-pencil"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />\n  <path d="m15 5 4 4" />\n</svg>\n';

  // src/icons/send.svg
  var send_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-send"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />\n  <path d="m21.854 2.147-10.94 10.939" />\n</svg>\n';

  // src/icons/circle-check.svg
  var circle_check_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-circle-check"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <circle cx="12" cy="12" r="10" />\n  <path d="m16 9-5.5 5.5L8 12" />\n</svg>\n';

  // src/icons/rotate-ccw.svg
  var rotate_ccw_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-rotate-ccw"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />\n  <path d="M3 3v5h5" />\n</svg>\n';

  // src/icons/pen-line.svg
  var pen_line_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-pen-line"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M13 21h8" />\n  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />\n</svg>\n';

  // src/icons/list-checks.svg
  var list_checks_default = '<!-- @license lucide-static v1.61.0 - ISC -->\n<svg\n  class="lucide lucide-list-checks"\n  xmlns="http://www.w3.org/2000/svg"\n  width="24"\n  height="24"\n  viewBox="0 0 24 24"\n  fill="none"\n  stroke="currentColor"\n  stroke-width="2"\n  stroke-linecap="round"\n  stroke-linejoin="round"\n>\n  <path d="M13 5h8" />\n  <path d="M13 12h8" />\n  <path d="M13 19h8" />\n  <path d="m3 17 2 2 4-4" />\n  <path d="m3 7 2 2 4-4" />\n</svg>\n';

  // src/ui/icons.ts
  var RAW = {
    type: type_default,
    messageSquarePlus: message_square_plus_default,
    panelRight: panel_right_default,
    copy: copy_default,
    x: x_default,
    check: check_default,
    trash2: trash_2_default,
    crosshair: crosshair_default,
    undo2: undo_2_default,
    download: download_default,
    upload: upload_default,
    pencil: pencil_default,
    send: send_default,
    circleCheck: circle_check_default,
    rotateCcw: rotate_ccw_default,
    penLine: pen_line_default,
    listChecks: list_checks_default
  };
  function icon(name, size = 16) {
    return RAW[name].replace(/<!--[\s\S]*?-->/g, "").replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`).replace(/\s+/g, " ").trim();
  }

  // src/ui/h.ts
  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    if (props.class) el.className = props.class;
    if (props.title) el.title = props.title;
    if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
    if (props.style) Object.assign(el.style, props.style);
    if (props.icon) el.insertAdjacentHTML("beforeend", icon(props.icon));
    if (props.text !== void 0) el.append(props.text);
    if (props.on) {
      for (const [name, fn] of Object.entries(props.on)) el.addEventListener(name, fn);
    }
    for (const c of children) if (c !== null && c !== void 0 && c !== false) el.append(c);
    return el;
  }

  // src/ui/strings.ts
  var S = {
    toolbarText: "改字",
    toolbarTextHint: "改字模式（T / Alt+T）",
    toolbarComment: "批注",
    toolbarCommentHint: "批注模式（C / Alt+C）",
    toolbarSidebar: "修改清单",
    toolbarCopy: "复制修改要求",
    toolbarExpand: "HTML Review",
    modeText: "改字模式 · 点击文字直接修改 · Enter 保存 · Esc 退出",
    modeComment: "批注模式 · 单击选中 · 拖拽框选 · Shift 多选 · Alt+↑ 选父级 · Esc 退出",
    hoverEditable: "点击修改",
    hoverEdited: "已修改 · 原文：{text}",
    hoverParentHint: "Alt+↑ 父级",
    popNewTitle: "新批注",
    popTargets: "{n} 个元素",
    popPlaceholder: "写下修改意见，Enter 保存，Shift+Enter 换行",
    popSave: "保存",
    popCancel: "取消",
    popReplyPlaceholder: "追加评论，Enter 发送",
    popEdit: "编辑",
    popResolve: "标记已处理",
    popReopen: "重新打开",
    popDelete: "删除",
    popLocate: "定位",
    popConfirmDelete: "删除这条批注？",
    sbTitle: "修改清单",
    sbAll: "全部",
    sbPending: "待处理",
    sbExported: "已导出",
    sbDone: "已处理",
    sbEdits: "改字",
    sbComments: "批注",
    sbEmpty: "还没有修改。按 T 改字，按 C 加批注。",
    sbLost: "定位失效",
    sbRevert: "撤销修改",
    sbRemove: "删除记录",
    sbCopy: "复制待处理（{n}）",
    sbCopySelected: "复制选中（{n}）",
    sbExportedToDone: "已导出批注全部标为已处理",
    sbClearDone: "清空已处理",
    sbRevertSelected: "还原选中改字（{n}）",
    sbRevertAll: "还原全部改字（{n}）",
    sbExportXml: "导出修改单",
    sbImportXml: "导入修改单",
    sbConfirmClear: "清空 {n} 条已处理 / 已生效的记录？",
    sbReplies: "{n} 条评论",
    status: { pending: "待处理", exported: "已导出", applied: "已生效", resolved: "已处理" },
    toastCopied: "已复制 {n} 条修改要求，粘贴给 AI 即可",
    toastUndo: "撤回",
    toastNothing: "没有待处理的修改。可以在修改清单里勾选条目后复制",
    toastCopyFailed: "无法写入剪贴板，请手动复制下面的内容",
    toastCommentSaved: "批注 {id} 已保存",
    toastEditSaved: "{id} 已保存",
    toastMarkedDone: "{n} 条批注已标为已处理",
    toastReverted: "已还原 {n} 处改字",
    toastApplied: "{n} 条改字已在源文件中生效",
    toastImported: "已导入 {n} 条记录",
    toastImportFailed: "导入失败：{msg}",
    toastImportOtherPage: "这份修改单来自另一个页面：\n{page}\n仍要导入到当前页面吗？",
    toastTooMany: "一次最多选中 {n} 个元素",
    toastNoTarget: "框里没有文字或元素",
    manualCopyTitle: "手动复制修改要求",
    close: "关闭"
  };
  function fmt(template, vars) {
    return template.replace(/\{(\w+)\}/g, (_, k) => k in vars ? String(vars[k]) : `{${k}}`);
  }

  // src/ui/toolbar.ts
  var Toolbar = class {
    constructor(parent, handlers) {
      this.textBtn = h(
        "button",
        { class: "tb-btn", title: S.toolbarTextHint, icon: "type", on: { click: handlers.onText } },
        h("span", { text: S.toolbarText }),
        h("span", { class: "tb-key", text: "T" })
      );
      this.commentBtn = h(
        "button",
        { class: "tb-btn", title: S.toolbarCommentHint, icon: "messageSquarePlus", on: { click: handlers.onComment } },
        h("span", { text: S.toolbarComment }),
        h("span", { class: "tb-key", text: "C" })
      );
      this.listBadge = h("span", { class: "badge", attrs: { hidden: "" } });
      this.sidebarBtn = h(
        "button",
        { class: "tb-btn", title: S.toolbarSidebar, icon: "listChecks", on: { click: handlers.onSidebar } },
        h("span", { text: S.toolbarSidebar }),
        this.listBadge
      );
      const copyBtn = h("button", { class: "tb-btn", title: S.toolbarCopy, icon: "copy", on: { click: handlers.onCopy } }, h("span", { text: S.toolbarCopy }));
      this.mainBadge = h("span", { class: "badge", attrs: { hidden: "" } });
      const main = h("button", { class: "tb-btn tb-main", title: S.toolbarExpand, icon: "penLine", on: { click: handlers.onSidebar } }, this.mainBadge);
      this.el = h(
        "div",
        { class: "toolbar" },
        h("div", { class: "tb-items" }, this.textBtn, this.commentBtn, h("span", { class: "tb-sep" }), this.sidebarBtn, copyBtn, h("span", { class: "tb-sep" })),
        main
      );
      parent.append(this.el);
    }
    update(state) {
      this.textBtn.className = `tb-btn${state.mode === "text" ? " active-text" : ""}`;
      this.commentBtn.className = `tb-btn${state.mode === "comment" ? " active-comment" : ""}`;
      this.sidebarBtn.className = `tb-btn${state.sidebarOpen ? " active-sidebar" : ""}`;
      this.el.classList.toggle("expanded", state.mode !== "browse" || state.sidebarOpen);
      this.el.classList.toggle("beside-sidebar", state.sidebarOpen);
      for (const badge of [this.mainBadge, this.listBadge]) {
        badge.textContent = String(state.pending);
        badge.toggleAttribute("hidden", state.pending === 0);
      }
    }
  };

  // src/ui/overlay.ts
  var pinKey = (p) => `${p.id}#${p.targetIndex}`;
  var Overlay = class {
    constructor(parent) {
      this.selBoxes = [];
      this.pinEls = /* @__PURE__ */ new Map();
      this.hoverEl = null;
      this.selection = [];
      this.pins = [];
      this.onPinClick = () => {
      };
      this.layer = h("div", { class: "layer" });
      this.hoverBox = h("div", { class: "box", style: { display: "none" } });
      this.hoverLabel = h("div", { class: "box-label", style: { display: "none" } });
      this.marqueeEl = h("div", { class: "marquee", style: { display: "none" } });
      this.layer.append(this.hoverBox, this.hoverLabel, this.marqueeEl);
      parent.append(this.layer);
    }
    /** 背景：改字和批注两种模式的悬停样式不同（虚线琥珀色 / 实线蓝色），标签说明可做的操作。 */
    showHover(el, variant, label) {
      this.hoverEl = el;
      this.hoverBox.className = `box hover-${variant}`;
      this.hoverLabel.className = `box-label ${variant}`;
      this.hoverLabel.textContent = label;
      this.positionHover();
    }
    get hovered() {
      return this.hoverEl;
    }
    showSelection(elements) {
      this.selection = elements;
      while (this.selBoxes.length < elements.length) {
        const box = h("div", { class: "box selected" });
        this.layer.insertBefore(box, this.marqueeEl);
        this.selBoxes.push(box);
      }
      this.positionSelection();
    }
    /** 背景：框选拖动过程中实时显示矩形。传 null 隐藏。 */
    showMarquee(rect) {
      const m = this.marqueeEl;
      if (!rect) {
        m.style.display = "none";
        return;
      }
      Object.assign(m.style, { display: "block", left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
    }
    /**
     * 背景：批注保存后在元素右上角显示编号圆点，刷新、增删批注后都要重绘。
     * 设计意图：按 id 复用已有圆点 DOM，只增删差异部分，避免频繁重建造成闪烁。
     */
    setPins(pins) {
      this.pins = pins;
      const keys = new Set(pins.map(pinKey));
      for (const [key, el] of this.pinEls) {
        if (!keys.has(key)) {
          el.remove();
          this.pinEls.delete(key);
        }
      }
      pins.forEach((p) => {
        const key = pinKey(p);
        let el = this.pinEls.get(key);
        if (!el) {
          el = h("button", { class: "pin", on: { click: (e) => {
            e.stopPropagation();
            this.onPinClick(p.id);
          } } });
          this.layer.append(el);
          this.pinEls.set(key, el);
        }
        el.textContent = p.label;
        el.title = p.id;
        el.className = `pin ${p.status}`;
      });
      this.positionPins();
    }
    /** 背景：从侧边栏定位到元素时，用一次闪烁让视线落到目标上。 */
    flash(el) {
      const r = el.getBoundingClientRect();
      const box = h("div", { class: "box flash" });
      Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      this.layer.append(box);
      window.setTimeout(() => box.remove(), 1300);
    }
    /** 背景：页面滚动、缩放、DOM 变化后，所有图形都要重新对齐元素。 */
    reposition() {
      this.positionHover();
      this.positionSelection();
      this.positionPins();
    }
    positionHover() {
      const el = this.hoverEl;
      if (!el || !el.isConnected) {
        this.hoverBox.style.display = "none";
        this.hoverLabel.style.display = "none";
        return;
      }
      const r = el.getBoundingClientRect();
      place(this.hoverBox, r);
      this.hoverBox.style.display = "block";
      if (!this.hoverLabel.textContent) {
        this.hoverLabel.style.display = "none";
        return;
      }
      const labelTop = r.top >= 24 ? r.top - 24 : r.bottom + 4;
      Object.assign(this.hoverLabel.style, {
        display: "block",
        left: `${Math.max(4, Math.min(r.left - 2, window.innerWidth - 364))}px`,
        top: `${Math.max(4, labelTop)}px`
      });
    }
    positionSelection() {
      this.selBoxes.forEach((box, i) => {
        const el = this.selection[i];
        if (!el || !el.isConnected) {
          box.style.display = "none";
          return;
        }
        place(box, el.getBoundingClientRect());
        box.style.display = "block";
      });
    }
    positionPins() {
      this.pins.forEach((p) => {
        const el = this.pinEls.get(pinKey(p));
        if (!el) return;
        if (!p.el.isConnected) {
          el.style.display = "none";
          return;
        }
        const r = p.el.getBoundingClientRect();
        const hidden = r.width === 0 && r.height === 0;
        el.style.display = hidden ? "none" : "block";
        el.style.left = `${r.right - 6 + p.stack * 26}px`;
        el.style.top = `${r.top}px`;
      });
    }
  };
  function place(box, r) {
    box.style.left = `${r.left}px`;
    box.style.top = `${r.top}px`;
    box.style.width = `${r.width}px`;
    box.style.height = `${r.height}px`;
  }

  // src/text.ts
  function truncate(s, max) {
    return s.length > max ? s.slice(0, max) + "…" : s;
  }
  function escapeXml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  function cdata(s) {
    return "<![CDATA[" + s.split("]]>").join("]]]]><![CDATA[>") + "]]>";
  }
  function formatTime(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // src/ui/popover.ts
  function isSubmitEnter(e) {
    return e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229;
  }
  var CommentPopover = class {
    constructor(parent) {
      this.mode = null;
      this.currentId = null;
      this.draft = null;
      this.countEl = null;
      this.existingHandlers = null;
      this.lastRect = null;
      this.el = h("div", { class: "popover", attrs: { hidden: "" } });
      parent.append(this.el);
    }
    get isOpen() {
      return this.mode !== null;
    }
    openNew(count, rect, handlers) {
      if (this.mode === "new" && this.draft) {
        this.setTargetCount(count);
        this.place(rect);
        this.draft.focus();
        return;
      }
      this.mode = "new";
      this.currentId = null;
      this.countEl = h("span", { class: "pop-meta", text: fmt(S.popTargets, { n: count }) });
      const textarea = h("textarea", { class: "input", attrs: { placeholder: S.popPlaceholder, rows: "3" } });
      this.draft = textarea;
      const submit = () => {
        const body = textarea.value.trim();
        if (body) handlers.onSubmit(body);
      };
      textarea.addEventListener("keydown", (e) => {
        if (isSubmitEnter(e)) {
          e.preventDefault();
          submit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          handlers.onCancel();
        }
      });
      this.el.replaceChildren(
        h(
          "div",
          { class: "pop-head" },
          h("span", { class: "pop-id", text: S.popNewTitle }),
          this.countEl,
          h("button", { class: "icon-btn", icon: "x", title: S.popCancel, on: { click: handlers.onCancel } })
        ),
        h("div", { class: "pop-body" }, textarea),
        h(
          "div",
          { class: "pop-actions" },
          h("button", { class: "btn", text: S.popCancel, on: { click: handlers.onCancel } }),
          h("button", { class: "btn primary comment", icon: "send", text: S.popSave, on: { click: submit } })
        )
      );
      this.show(rect);
      textarea.focus();
    }
    setTargetCount(count) {
      if (this.countEl) this.countEl.textContent = fmt(S.popTargets, { n: count });
    }
    openExisting(item, rect, handlers) {
      this.mode = "existing";
      this.currentId = item.id;
      this.existingHandlers = handlers;
      this.draft = null;
      this.countEl = null;
      this.renderExisting(item, false);
      this.show(rect);
    }
    /** 背景：追加评论、编辑正文后需要重绘，但保持弹窗位置不跳。 */
    refresh(item) {
      if (this.mode !== "existing" || this.currentId !== item.id) return;
      this.renderExisting(item, false);
    }
    /** 背景：发送评论后弹窗会重绘，焦点需要回到回复框，方便连续追加。 */
    focusReply() {
      this.el.querySelector(".reply-box textarea")?.focus();
    }
    close() {
      this.mode = null;
      this.currentId = null;
      this.draft = null;
      this.countEl = null;
      this.existingHandlers = null;
      this.el.setAttribute("hidden", "");
      this.el.replaceChildren();
    }
    /**
     * 背景：弹窗盖住相邻元素时，用户没法 Shift 加选旁边的元素，也看不到上下文。
     * 设计意图：优先放在目标右侧，其次左侧（卡片、图表等窄元素通常两侧有空间）；
     * 两侧都放不下（整行段落）时放在下方，再不行放上方，最后贴视口内侧。
     */
    place(rect) {
      this.lastRect = rect;
      const pop = this.el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 10;
      const clampTop = (t) => Math.max(gap, Math.min(vh - pop.height - gap, t));
      const clampLeft = (l) => Math.max(gap, Math.min(vw - pop.width - gap, l));
      let left;
      let top;
      if (vw - rect.right >= pop.width + gap * 2) {
        left = rect.right + gap;
        top = clampTop(rect.top);
      } else if (rect.left >= pop.width + gap * 2) {
        left = rect.left - pop.width - gap;
        top = clampTop(rect.top);
      } else if (vh - rect.bottom >= pop.height + gap * 2) {
        left = clampLeft(rect.left);
        top = rect.bottom + gap;
      } else if (rect.top >= pop.height + gap * 2) {
        left = clampLeft(rect.left);
        top = rect.top - pop.height - gap;
      } else {
        left = clampLeft(rect.left);
        top = clampTop(rect.top);
      }
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    }
    reposition(rect) {
      if (this.isOpen && rect) this.place(rect);
    }
    show(rect) {
      this.el.removeAttribute("hidden");
      this.place(rect);
    }
    renderExisting(item, editing) {
      const hd = this.existingHandlers;
      if (!hd) return;
      const resolved = item.status === "resolved";
      const head = h(
        "div",
        { class: "pop-head" },
        h("span", { class: "pop-id", text: item.id }),
        h("span", { class: `chip ${item.status}`, text: S.status[item.status] }),
        h("span", { class: "pop-meta", text: [fmt(S.popTargets, { n: item.anchors.length }), item.anchors[0]?.section].filter(Boolean).join(" · ") }),
        h("button", { class: "icon-btn", icon: "crosshair", title: S.popLocate, on: { click: hd.onLocate } }),
        h("button", { class: "icon-btn", icon: "x", title: S.close, on: { click: hd.onClose } })
      );
      let body;
      if (editing) {
        const ta = h("textarea", { class: "input" });
        ta.value = item.body;
        const save = () => {
          const v = ta.value.trim();
          if (v && v !== item.body) hd.onEditBody(v);
          else this.renderExisting(item, false);
        };
        ta.addEventListener("keydown", (e) => {
          if (isSubmitEnter(e)) {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            this.renderExisting(item, false);
          }
        });
        body = h("div", { class: "pop-body" }, ta);
        queueMicrotask(() => ta.focus());
      } else {
        body = h("div", { class: "pop-body" }, h("div", { class: "pop-text", text: item.body }));
      }
      const replies = item.replies.length ? h(
        "div",
        { class: "replies" },
        ...item.replies.map(
          (r) => h(
            "div",
            { class: "reply" },
            h("div", { class: "reply-text" }, r.body, h("div", { class: "reply-time", text: formatTime(r.createdAt) })),
            h("button", { class: "icon-btn danger", icon: "trash2", title: S.popDelete, on: { click: () => hd.onDeleteReply(r.id) } })
          )
        )
      ) : null;
      const replyInput = h("textarea", { class: "input small", attrs: { placeholder: S.popReplyPlaceholder, rows: "1" } });
      const sendReply = () => {
        const v = replyInput.value.trim();
        if (v) hd.onReply(v);
      };
      replyInput.addEventListener("keydown", (e) => {
        if (isSubmitEnter(e)) {
          e.preventDefault();
          sendReply();
        } else if (e.key === "Escape") {
          e.preventDefault();
          hd.onClose();
        }
      });
      const replyBox = h(
        "div",
        { class: "reply-box" },
        replyInput,
        h("button", { class: "icon-btn", icon: "send", title: S.popSave, on: { click: sendReply } })
      );
      const actions = h(
        "div",
        { class: "pop-actions" },
        h("button", { class: "btn", icon: "pencil", text: S.popEdit, on: { click: () => this.renderExisting(item, true) } }),
        h("button", { class: "btn danger", icon: "trash2", text: S.popDelete, on: { click: hd.onDelete } }),
        h("span", { class: "spacer" }),
        h("button", {
          class: "btn primary",
          icon: resolved ? "rotateCcw" : "circleCheck",
          text: resolved ? S.popReopen : S.popResolve,
          on: { click: hd.onToggleResolved }
        })
      );
      this.el.replaceChildren(head, body, actions, ...replies ? [replies] : [], replyBox);
      if (this.lastRect) this.place(this.lastRect);
    }
  };

  // src/ui/sidebar.ts
  var FILTERS = [
    { key: "all", label: S.sbAll },
    { key: "pending", label: S.sbPending },
    { key: "exported", label: S.sbExported },
    { key: "done", label: S.sbDone }
  ];
  var isDone = (s) => s === "applied" || s === "resolved";
  var Sidebar = class {
    constructor(parent, hd) {
      this.hd = hd;
      this.filter = "all";
      this.selected = /* @__PURE__ */ new Set();
      this.entries = [];
      this.tabsEl = h("div", { class: "sb-tabs" });
      this.listEl = h("div", { class: "sb-list" });
      this.footEl = h("div", { class: "sb-foot" });
      this.fileInput = h("input", { attrs: { type: "file", accept: ".xml,application/xml,text/xml" }, style: { display: "none" } });
      this.fileInput.addEventListener("change", () => {
        const file = this.fileInput.files?.[0];
        if (file) hd.onImportXml(file);
        this.fileInput.value = "";
      });
      this.el = h(
        "div",
        { class: "sidebar" },
        h(
          "div",
          { class: "sb-head" },
          h("div", { class: "sb-title", text: S.sbTitle }),
          h("button", { class: "icon-btn", icon: "x", title: S.close, on: { click: hd.onClose } })
        ),
        this.tabsEl,
        this.listEl,
        this.footEl,
        this.fileInput
      );
      parent.append(this.el);
    }
    get isOpen() {
      return this.el.classList.contains("open");
    }
    setOpen(open) {
      this.el.classList.toggle("open", open);
    }
    render(entries) {
      this.entries = entries;
      const ids = new Set(entries.map((e) => e.item.id));
      for (const id of this.selected) if (!ids.has(id)) this.selected.delete(id);
      this.renderTabs();
      this.renderList();
      this.renderFoot();
    }
    count(f) {
      return this.entries.filter((e) => this.match(e.item.status, f)).length;
    }
    match(status, f) {
      if (f === "all") return true;
      if (f === "done") return isDone(status);
      return status === f;
    }
    renderTabs() {
      this.tabsEl.replaceChildren(
        ...FILTERS.map(
          (f) => h("button", {
            class: `sb-tab${this.filter === f.key ? " active" : ""}`,
            text: `${f.label} ${this.count(f.key)}`,
            on: {
              click: () => {
                this.filter = f.key;
                this.render(this.entries);
              }
            }
          })
        )
      );
    }
    renderList() {
      const visible = this.entries.filter((e) => this.match(e.item.status, this.filter));
      if (!visible.length) {
        this.listEl.replaceChildren(h("div", { class: "sb-empty", text: S.sbEmpty }));
        return;
      }
      const edits = visible.filter((e) => e.item.kind === "edit");
      const comments = visible.filter((e) => e.item.kind === "comment");
      const nodes = [];
      if (edits.length) {
        nodes.push(h("div", { class: "sb-group", text: `${S.sbEdits} ${edits.length}` }));
        nodes.push(...edits.map((e) => this.renderItem(e)));
      }
      if (comments.length) {
        nodes.push(h("div", { class: "sb-group", text: `${S.sbComments} ${comments.length}` }));
        nodes.push(...comments.map((e) => this.renderItem(e)));
      }
      this.listEl.replaceChildren(...nodes);
    }
    renderItem({ item, lost }) {
      const check = h("input", { class: "sb-check", attrs: { type: "checkbox" } });
      check.checked = this.selected.has(item.id);
      check.addEventListener("click", (e) => e.stopPropagation());
      check.addEventListener("change", () => {
        if (check.checked) this.selected.add(item.id);
        else this.selected.delete(item.id);
        this.renderFoot();
      });
      const section = item.kind === "edit" ? item.anchor.section : item.anchors[0]?.section ?? "";
      const row = h(
        "div",
        { class: "sb-row" },
        h("span", { class: `sb-id ${item.kind}`, text: item.id }),
        h("span", { class: `chip ${item.status}`, text: S.status[item.status] }),
        lost && !isDone(item.status) ? h("span", { class: "chip lost", text: S.sbLost }) : null,
        h("span", { class: "sb-section", text: section })
      );
      let content;
      const actions = h("div", { class: "sb-actions" });
      const stop = (fn) => (e) => {
        e.stopPropagation();
        fn();
      };
      const resolveBtn = h("button", {
        class: "icon-btn",
        icon: item.status === "resolved" ? "rotateCcw" : "circleCheck",
        title: item.status === "resolved" ? S.popReopen : S.popResolve,
        on: { click: stop(() => this.hd.onToggleResolved(item.id)) }
      });
      if (item.kind === "edit") {
        content = h(
          "div",
          { class: "sb-main" },
          row,
          h("div", { class: "sb-before", text: truncate(item.beforeText, 160) }),
          h("div", { class: "sb-after", text: truncate(item.afterText, 160) })
        );
        actions.append(
          h("button", { class: "icon-btn", icon: "crosshair", title: S.popLocate, on: { click: stop(() => this.hd.onLocate(item.id)) } }),
          h("button", {
            class: "icon-btn danger",
            icon: isDone(item.status) ? "trash2" : "undo2",
            title: isDone(item.status) ? S.sbRemove : S.sbRevert,
            on: { click: stop(() => this.hd.onRevertEdit(item.id)) }
          }),
          resolveBtn
        );
      } else {
        content = h(
          "div",
          { class: "sb-main" },
          row,
          h("div", { class: "sb-body", text: item.body }),
          h("div", {
            class: "sb-sub",
            text: [fmt(S.popTargets, { n: item.anchors.length }), item.replies.length ? fmt(S.sbReplies, { n: item.replies.length }) : ""].filter(Boolean).join(" · ")
          })
        );
        actions.append(resolveBtn, h("button", { class: "icon-btn danger", icon: "trash2", title: S.popDelete, on: { click: stop(() => this.hd.onDelete(item.id)) } }));
      }
      return h(
        "div",
        {
          class: `sb-item${isDone(item.status) ? " dim" : ""}`,
          on: { click: () => item.kind === "edit" ? this.hd.onLocate(item.id) : this.hd.onOpenComment(item.id) }
        },
        check,
        content,
        actions
      );
    }
    renderFoot() {
      const pending = this.entries.filter((e) => e.item.status === "pending").length;
      const exportedComments = this.entries.filter((e) => e.item.status === "exported" && e.item.kind === "comment").length;
      const done = this.entries.filter((e) => isDone(e.item.status)).length;
      const selectedIds = [...this.selected];
      const editEntries = this.entries.filter((e) => e.item.kind === "edit");
      const selectedEdits = editEntries.filter((e) => this.selected.has(e.item.id)).map((e) => e.item.id);
      const revertIds = selectedEdits.length ? selectedEdits : editEntries.filter((e) => !isDone(e.item.status)).map((e) => e.item.id);
      const revertLabel = fmt(selectedEdits.length ? S.sbRevertSelected : S.sbRevertAll, { n: revertIds.length });
      const btn = (text, iconName, onClick, disabled = false, primary = false) => {
        const b = h("button", { class: `btn${primary ? " primary" : ""}`, icon: iconName, text, on: { click: onClick } });
        b.disabled = disabled;
        return b;
      };
      this.footEl.replaceChildren(
        btn(fmt(S.sbCopy, { n: pending }), "copy", this.hd.onCopyPending, pending === 0, true),
        btn(fmt(S.sbCopySelected, { n: selectedIds.length }), "copy", () => this.hd.onCopySelected(selectedIds), selectedIds.length === 0),
        btn(revertLabel, "undo2", () => this.hd.onRevertEdits(revertIds), revertIds.length === 0),
        btn(S.sbExportedToDone, "circleCheck", this.hd.onExportedToDone, exportedComments === 0),
        btn(S.sbClearDone, "trash2", this.hd.onClearDone, done === 0),
        btn(S.sbExportXml, "download", this.hd.onExportXml, this.entries.length === 0),
        btn(S.sbImportXml, "upload", () => this.fileInput.click())
      );
    }
  };

  // src/ui/toast.ts
  var Toast = class {
    constructor(parent) {
      this.parent = parent;
      this.timer = 0;
      this.el = h("div", { class: "toast", attrs: { hidden: "" } });
      parent.append(this.el);
    }
    show(message, opts = {}) {
      window.clearTimeout(this.timer);
      this.el.replaceChildren(h("span", { text: message }));
      this.el.className = `toast${opts.error ? " error" : ""}`;
      if (opts.action) {
        const { label, run } = opts.action;
        this.el.append(h("button", { text: label, on: { click: () => {
          run();
          this.hide();
        } } }));
      }
      this.el.removeAttribute("hidden");
      this.timer = window.setTimeout(() => this.hide(), opts.ms ?? (opts.action ? 6e3 : 2400));
    }
    hide() {
      this.el.setAttribute("hidden", "");
    }
    /** 背景：file:// 或权限受限时剪贴板写入会失败，此时把全文放进可全选的文本框让用户手动复制。 */
    manualCopy(text) {
      const textarea = h("textarea", { class: "input" });
      textarea.value = text;
      const mask = h("div", { class: "modal-mask" });
      const close = () => mask.remove();
      mask.append(
        h(
          "div",
          { class: "modal" },
          h("div", { class: "sb-title", text: S.manualCopyTitle }),
          h("div", { class: "sb-sub", text: S.toastCopyFailed }),
          textarea,
          h("div", { class: "pop-actions" }, h("button", { class: "btn primary", text: S.close, on: { click: close } }))
        )
      );
      mask.addEventListener("click", (e) => {
        if (e.target === mask) close();
      });
      this.parent.append(mask);
      textarea.focus();
      textarea.select();
    }
  };

  // src/export/xml.ts
  function itemToXml(item, full, indent = "  ") {
    const i1 = indent;
    const i2 = indent + "  ";
    const meta = full ? ` status="${item.status}" created_at="${item.createdAt}" updated_at="${item.updatedAt}"` : "";
    if (item.kind === "edit") {
      const lines2 = [`${i1}<item id="${item.id}" type="text_edit"${meta}>`];
      lines2.push(anchorFields(item.anchor, i2, full, false));
      lines2.push(`${i2}<before>${escapeXml(item.beforeText)}</before>`);
      lines2.push(`${i2}<after>${escapeXml(item.afterText)}</after>`);
      if (full || /<[a-z!/]/i.test(item.beforeHtml + item.afterHtml)) {
        lines2.push(`${i2}<before_html>${cdata(item.beforeHtml)}</before_html>`);
        lines2.push(`${i2}<after_html>${cdata(item.afterHtml)}</after_html>`);
      }
      lines2.push(`${i1}</item>`);
      return lines2.join("\n");
    }
    const lines = [`${i1}<item id="${item.id}" type="comment"${meta}>`];
    lines.push(`${i2}<request>${escapeXml(item.body)}</request>`);
    if (item.replies.length) {
      lines.push(`${i2}<replies>`);
      for (const r of item.replies) {
        const rMeta = full ? ` id="${r.id}" created_at="${r.createdAt}"` : "";
        lines.push(`${i2}  <reply${rMeta}>${escapeXml(r.body)}</reply>`);
      }
      lines.push(`${i2}</replies>`);
    }
    lines.push(`${i2}<targets count="${item.anchors.length}">`);
    for (const a of item.anchors) {
      lines.push(`${i2}  <target>`);
      lines.push(anchorFields(a, i2 + "    ", full, true));
      lines.push(`${i2}  </target>`);
    }
    lines.push(`${i2}</targets>`);
    lines.push(`${i1}</item>`);
    return lines.join("\n");
  }
  function anchorFields(a, ind, full, withSnapshot) {
    const out = [`${ind}<xpath>${escapeXml(a.xpath)}</xpath>`, `${ind}<selector>${escapeXml(a.selector)}</selector>`];
    if (a.section) out.push(`${ind}<section>${escapeXml(a.section)}</section>`);
    if (full || withSnapshot) {
      out.push(`${ind}<text>${escapeXml(a.text)}</text>`);
      out.push(`${ind}<html>${cdata(a.html)}</html>`);
    }
    return out.join("\n");
  }

  // src/export/prompt.ts
  function buildPrompt(items, meta) {
    const edits = items.filter((i) => i.kind === "edit").length;
    const comments = items.length - edits;
    const sourceLine = meta.isLocalFile ? `源文件：${meta.source}` : `页面地址：${meta.source}（请先找到渲染这个页面的源文件）`;
    const rules = [
      "1. 用 xpath 和 selector 定位元素，再用原文核对；三者有出入时以原文为准。xpath 来自浏览器运行时的 DOM，可能与源码结构略有差别。",
      "2. text_edit 条目：把 before 的文字改成 after。有 before_html / after_html 时按 HTML 修改，保留元素自身的标签、属性和行内标记。",
      "3. comment 条目：按 request 和 replies 里的意见修改 targets 里的元素，可以改文案、结构或样式；一条批注有多个 target 时，意见同时作用于这些元素。",
      "4. 只改条目涉及的内容，其余代码保持原样。",
      "5. 如果原文在源码里找不到（例如由 JS 生成），请找到生成它的数据或代码去改。",
      "6. 改完后逐条回报：已修改 / 无法定位 / 需要确认，并附一句原因。"
    ];
    const xml = [
      `<review page="${escapeXml(meta.title)}" count="${items.length}" text_edits="${edits}" comments="${comments}">`,
      ...items.map((item) => itemToXml(item, false)),
      "</review>"
    ].join("\n");
    return [
      "请按下面的修改单修改源文件。",
      "",
      sourceLine,
      `页面标题：${meta.title || "（无标题）"}`,
      `导出时间：${formatTime(meta.exportedAt)}`,
      `条目数：改字 ${edits} 条，批注 ${comments} 条`,
      "",
      "规则：",
      ...rules,
      "",
      xml,
      ""
    ].join("\n");
  }

  // src/playground.ts
  var noop = () => {
  };
  function stage(id) {
    const container = document.getElementById(id);
    if (!container) throw new Error(`缺少舞台容器 #${id}`);
    const host = document.createElement("div");
    container.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = styles_default;
    const root = h("div", { class: "root" });
    shadow.append(style, root);
    return root;
  }
  var anchor = (section, text) => ({ xpath: "/html/body/div/p[1]", selector: "p.lead", section, text, html: `<p>${text}</p>` });
  var sampleEdit = {
    id: "E1",
    kind: "edit",
    anchor: anchor("结论与推理链", "累了的周五晚上，87% 的人第一选择是一个人待着。"),
    beforeHtml: "累了的周五晚上，87% 的人第一选择是一个人待着。",
    afterHtml: "累了的周五晚上，87% 的人首选一个人待着。",
    beforeText: "累了的周五晚上，87% 的人第一选择是一个人待着。",
    afterText: "累了的周五晚上，87% 的人首选一个人待着。",
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  var appliedEdit = { ...sampleEdit, id: "E2", status: "applied", beforeText: "多数人的位置是屏幕", afterText: "多数人把别人放在屏幕里" };
  var sampleComment = {
    id: "C1",
    kind: "comment",
    anchors: [anchor("起点：「别人」有三种位置", "真空 屏幕 现场"), anchor("起点：「别人」有三种位置", "屏幕")],
    body: "三张卡片改成横向条形图，突出 66%",
    replies: [{ id: "R1", body: "颜色沿用全文主色", createdAt: Date.now() }],
    status: "exported",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  var resolvedComment = { ...sampleComment, id: "C2", status: "resolved", replies: [], body: "标题太长，压成一句" };
  function demoToolbar() {
    const a = new Toolbar(stage("st-toolbar-collapsed"), { onText: noop, onComment: noop, onSidebar: noop, onCopy: noop });
    a.update({ mode: "browse", sidebarOpen: false, pending: 3 });
    const b = new Toolbar(stage("st-toolbar-text"), { onText: noop, onComment: noop, onSidebar: noop, onCopy: noop });
    b.update({ mode: "text", sidebarOpen: false, pending: 1 });
    const c = new Toolbar(stage("st-toolbar-comment"), { onText: noop, onComment: noop, onSidebar: noop, onCopy: noop });
    c.update({ mode: "comment", sidebarOpen: true, pending: 0 });
  }
  function demoModeBadge() {
    stage("st-badge-text").append(h("div", { class: "mode-badge text", text: S.modeText }));
    stage("st-badge-comment").append(h("div", { class: "mode-badge comment", text: S.modeComment }));
  }
  function demoOverlay() {
    const mk = (id) => {
      const host = document.getElementById(id);
      host.style.transform = "none";
      return stage(id);
    };
    const sampleOf = (id) => document.getElementById(id);
    const o1 = new Overlay(mk("st-hover-text"));
    o1.showHover(sampleOf("sm-hover-text"), "text", S.hoverEditable);
    const o2 = new Overlay(mk("st-hover-edited"));
    o2.showHover(sampleOf("sm-hover-edited"), "text", S.hoverEdited.replace("{text}", "87% 的人第一选择是一个人待着"));
    const o3 = new Overlay(mk("st-hover-comment"));
    o3.showHover(sampleOf("sm-hover-comment"), "comment", `div.card · ${S.hoverParentHint}`);
    const o4 = new Overlay(mk("st-selection"));
    o4.showSelection([sampleOf("sm-sel-1"), sampleOf("sm-sel-2")]);
    const marqueeHost = document.getElementById("st-marquee");
    const o5 = new Overlay(mk("st-marquee"));
    const o6 = new Overlay(mk("st-pins"));
    o6.setPins([
      { id: "C1", label: "1", status: "pending", el: sampleOf("sm-pin-1"), targetIndex: 0, stack: 0 },
      { id: "C2", label: "2", status: "exported", el: sampleOf("sm-pin-2"), targetIndex: 0, stack: 0 },
      { id: "C3", label: "3", status: "pending", el: sampleOf("sm-pin-2"), targetIndex: 0, stack: 1 }
    ]);
    const flashBtn = document.getElementById("btn-flash");
    flashBtn.addEventListener("click", () => o6.flash(sampleOf("sm-pin-1")));
    const sync = () => {
      for (const o of [o1, o2, o3, o4, o6]) o.reposition();
      const r = marqueeHost.getBoundingClientRect();
      o5.showMarquee({ x: r.left + 40, y: r.top + 20, w: 260, h: 70 });
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
  }
  function demoPopover() {
    const p1 = new CommentPopover(stage("st-pop-new"));
    p1.openNew(2, new DOMRect(16, 0, 0, 0), { onSubmit: noop, onCancel: noop });
    const handlers = { onEditBody: noop, onReply: noop, onDeleteReply: noop, onToggleResolved: noop, onDelete: noop, onLocate: noop, onClose: noop };
    const p2 = new CommentPopover(stage("st-pop-existing"));
    p2.openExisting(sampleComment, new DOMRect(16, 0, 0, 0), handlers);
    const p3 = new CommentPopover(stage("st-pop-resolved"));
    p3.openExisting(resolvedComment, new DOMRect(16, 0, 0, 0), handlers);
  }
  function demoSidebar() {
    const handlers = {
      onLocate: noop,
      onOpenComment: noop,
      onRevertEdit: noop,
      onRevertEdits: noop,
      onToggleResolved: noop,
      onDelete: noop,
      onCopyPending: noop,
      onCopySelected: noop,
      onExportedToDone: noop,
      onClearDone: noop,
      onExportXml: noop,
      onImportXml: noop,
      onClose: noop
    };
    const s1 = new Sidebar(stage("st-sidebar"), handlers);
    s1.setOpen(true);
    const items = [sampleEdit, appliedEdit, sampleComment, resolvedComment];
    s1.render(items.map((item) => ({ item, lost: item.id === "C1" })));
    const s2 = new Sidebar(stage("st-sidebar-empty"), handlers);
    s2.setOpen(true);
    s2.render([]);
  }
  function demoToast() {
    const t1 = new Toast(stage("st-toast"));
    t1.show(S.toastCopied.replace("{n}", "3"), { action: { label: S.toastUndo, run: noop }, ms: 1e9 });
    const t2 = new Toast(stage("st-toast-error"));
    t2.show(S.toastImportFailed.replace("{msg}", "文件不是合法的 XML"), { error: true, ms: 1e9 });
    const t3 = new Toast(stage("st-toast-manual"));
    document.getElementById("btn-manual").addEventListener("click", () => t3.manualCopy("修改要求全文…"));
  }
  function demoPrompt() {
    const pre = document.getElementById("prompt-text");
    pre.textContent = buildPrompt([sampleEdit, sampleComment], {
      source: "/Users/you/Documents/示例/insight/index.html",
      isLocalFile: true,
      title: "「别人」放在哪里，AI 就会被放在哪里",
      exportedAt: Date.now()
    });
  }
  for (const fn of [demoToolbar, demoModeBadge, demoOverlay, demoPopover, demoSidebar, demoToast, demoPrompt]) {
    try {
      fn();
    } catch (err) {
      console.error("[html-review playground] demo 渲染失败", fn.name, err);
      document.body.insertAdjacentHTML("afterbegin", `<p style="color:#dc2626">demo ${fn.name} 渲染失败，详见 Console</p>`);
    }
  }
})();
