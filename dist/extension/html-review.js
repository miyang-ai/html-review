/*! HTML Review v0.2.0 | MIT | Copyright (c) 2025 Miyang Tech (Shanghai) Co., Ltd. | Icons: Lucide (ISC) */
"use strict";
(() => {
  // src/dom.ts
  var HOST_ATTR = "data-hr-host";
  var HR_ATTR_PREFIX = "data-hr-";
  var SKIP_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "META", "LINK", "HEAD", "TITLE", "BR"]);
  var NON_TEXT_TAGS = /* @__PURE__ */ new Set(["INPUT", "TEXTAREA", "SELECT", "IMG", "VIDEO", "AUDIO", "CANVAS", "IFRAME", "OBJECT", "EMBED"]);
  var BLOCKISH = /^(block|flex|grid|table|list-item|flow-root|table-.*)$/;
  function isToolElement(el) {
    if (!el) return false;
    return !!el.closest(`[${HOST_ATTR}]`);
  }
  function isSelectableElement(el) {
    if (SKIP_TAGS.has(el.tagName)) return false;
    if (isToolElement(el)) return false;
    if (el === el.ownerDocument.documentElement || el === el.ownerDocument.body) return false;
    return true;
  }
  function cleanHtml(el, mode) {
    const clone = el.cloneNode(true);
    const all = [clone, ...Array.from(clone.querySelectorAll("*"))];
    for (const node of all) {
      const wasEditing = node.hasAttribute("data-hr-editing");
      const hadOwnEditable = node.getAttribute("data-hr-own-editable");
      for (const attr of Array.from(node.attributes)) {
        if (attr.name.startsWith(HR_ATTR_PREFIX)) node.removeAttribute(attr.name);
      }
      if (wasEditing) {
        if (hadOwnEditable) node.setAttribute("contenteditable", hadOwnEditable);
        else node.removeAttribute("contenteditable");
        node.removeAttribute("spellcheck");
      }
    }
    return mode === "inner" ? clone.innerHTML : clone.outerHTML;
  }
  function isInlineLevel(el) {
    const display = getComputedStyle(el).display;
    return display.startsWith("inline") || display === "contents";
  }
  function hasBlockChild(el) {
    for (const child of Array.from(el.children)) {
      if (SKIP_TAGS.has(child.tagName)) continue;
      const display = getComputedStyle(child).display;
      if (display === "none") continue;
      if (BLOCKISH.test(display)) return true;
    }
    return false;
  }
  function hasDirectText(el) {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim()) return true;
    }
    return false;
  }
  function isVisible(el) {
    const check = el.checkVisibility;
    return typeof check === "function" ? check.call(el, { opacityProperty: true, visibilityProperty: true }) : true;
  }
  function visualRect(el) {
    const box = el.getBoundingClientRect();
    if (el instanceof SVGElement || !hasDirectText(el)) return box;
    const range = el.ownerDocument.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : box;
  }
  function textHitElements(root, rect) {
    const doc = root.ownerDocument;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = doc.createRange();
    const hits = /* @__PURE__ */ new Set();
    const right = rect.x + rect.w;
    const bottom = rect.y + rect.h;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent || hits.has(parent) || !(node.textContent ?? "").trim() || !isSelectableElement(parent)) continue;
      const pr = parent.getBoundingClientRect();
      if (pr.right < rect.x || pr.left > right || pr.bottom < rect.y || pr.top > bottom || !isVisible(parent)) continue;
      range.selectNodeContents(node);
      for (const line of Array.from(range.getClientRects())) {
        const w = Math.min(line.right, right) - Math.max(line.left, rect.x);
        const h2 = Math.min(line.bottom, bottom) - Math.max(line.top, rect.y);
        if (h2 >= line.height * 0.6 && w >= Math.min(12, line.width)) {
          hits.add(parent);
          break;
        }
      }
    }
    return [...hits];
  }
  function findEditableTarget(start) {
    if (!start || isToolElement(start)) return null;
    if (start.closest("svg") || NON_TEXT_TAGS.has(start.tagName)) return null;
    if (!isSelectableElement(start)) return null;
    let best = hasDirectText(start) ? start : null;
    let cur = start;
    while (isInlineLevel(cur)) {
      const parent = cur.parentElement;
      if (!parent || !isSelectableElement(parent) || hasBlockChild(parent)) break;
      cur = parent;
      best = cur;
    }
    if (!best && !hasBlockChild(start) && (start.textContent ?? "").trim()) best = start;
    if (!best || !(best.textContent ?? "").trim()) return null;
    return best;
  }
  function reduceSelection(elements) {
    let set = elements.filter((el, i) => elements.indexOf(el) === i);
    set = set.filter((el) => !set.some((other) => other !== el && other.contains(el)));
    while (set.length > 1) {
      const parent = set[0].parentElement;
      if (!parent || !isSelectableElement(parent) || !set.every((el) => el.parentElement === parent)) break;
      const visibleChildren = Array.from(parent.children).filter((c) => {
        if (!isSelectableElement(c)) return false;
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (visibleChildren.length !== set.length) break;
      set = [parent];
    }
    return set;
  }
  function compareDocumentOrder(a, b) {
    if (a === b) return 0;
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }

  // src/text.ts
  function normalizeText(s) {
    return (s ?? "").replace(/[\s\u00a0\u200b]+/g, " ").trim();
  }
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

  // src/locator.ts
  var HTML_NS = "http://www.w3.org/1999/xhtml";
  var COMMENT_TEXT_MAX = 200;
  var HTML_SNIPPET_MAX = 1500;
  function getXPath(el) {
    const doc = el.ownerDocument;
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === Node.ELEMENT_NODE) {
      if (cur.id && !cur.id.includes('"') && doc.querySelectorAll(`[id="${cssAttrEscape(cur.id)}"]`).length === 1) {
        parts.unshift(`//*[@id="${cur.id}"]`);
        return parts.join("/");
      }
      const parent = cur.parentElement;
      const isHtml = cur.namespaceURI === HTML_NS;
      const name = isHtml ? cur.localName : `*[local-name()="${cur.localName}"]`;
      if (!parent) {
        parts.unshift("/" + name);
        break;
      }
      const same = Array.from(parent.children).filter((c) => c.localName === cur.localName && c.namespaceURI === cur.namespaceURI);
      const index = same.length > 1 ? `[${same.indexOf(cur) + 1}]` : "";
      parts.unshift(name + index);
      cur = parent;
    }
    return parts.join("/");
  }
  function resolveXPath(xpath, doc = document) {
    if (!xpath) return null;
    try {
      const r = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      const node = r.singleNodeValue;
      return node && node.nodeType === Node.ELEMENT_NODE ? node : null;
    } catch (err) {
      console.debug("[html-review] xpath 解析失败，降级到选择器", xpath, err);
      return null;
    }
  }
  function getCssSelector(el) {
    const doc = el.ownerDocument;
    if (el.id && doc.querySelectorAll(`#${cssEscape(el.id)}`).length === 1) return `#${cssEscape(el.id)}`;
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur !== doc.documentElement) {
      if (cur.id && doc.querySelectorAll(`#${cssEscape(cur.id)}`).length === 1) {
        parts.unshift(`#${cssEscape(cur.id)}`);
        break;
      }
      let part = cur.localName;
      const classes = Array.from(cur.classList).filter((c) => !c.startsWith("hr-")).slice(0, 3);
      if (classes.length) part += classes.map((c) => "." + cssEscape(c)).join("");
      const parent = cur.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter((c) => c.localName === cur.localName);
        if (sameTag.length > 1) {
          const matchingPart = Array.from(parent.children).filter((c) => safeMatches(c, part));
          if (matchingPart.length > 1) part += `:nth-of-type(${sameTag.indexOf(cur) + 1})`;
        }
      }
      parts.unshift(part);
      const selector = parts.join(" > ");
      if (safeQueryAll(doc, selector).length === 1) return selector;
      cur = parent;
      depth++;
      if (depth > 6) break;
    }
    return parts.join(" > ");
  }
  function resolveSelector(selector, doc = document) {
    if (!selector) return null;
    const list = safeQueryAll(doc, selector);
    return list.length === 1 ? list[0] : null;
  }
  function getSection(el) {
    if (/^H[1-3]$/.test(el.tagName)) return truncate(normalizeText(el.textContent), 80);
    const headings = Array.from(el.ownerDocument.querySelectorAll("h1, h2, h3"));
    let found = null;
    for (const h2 of headings) {
      if (h2.contains(el)) {
        found = h2;
        continue;
      }
      if (h2.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) found = h2;
      else break;
    }
    return found ? truncate(normalizeText(found.textContent), 80) : "";
  }
  function findByText(text, doc = document) {
    if (!text) return null;
    const matches = [];
    for (const el of Array.from(doc.body.querySelectorAll("*"))) {
      if (!isSelectableElement(el)) continue;
      if (normalizeText(el.textContent) === text) matches.push(el);
    }
    const innermost = matches.filter((el) => !matches.some((o) => o !== el && el.contains(o)));
    return innermost.length === 1 ? innermost[0] : null;
  }
  function buildAnchor(el, opts = {}) {
    const text = opts.text ?? normalizeText(el.textContent);
    return {
      xpath: getXPath(el),
      selector: getCssSelector(el),
      section: getSection(el),
      text: opts.fullText ? text : truncate(text, COMMENT_TEXT_MAX),
      html: truncate(opts.html ?? cleanHtml(el, "outer"), HTML_SNIPPET_MAX)
    };
  }
  function cssEscape(s) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(s);
    return s.replace(/([^\w-])/g, "\\$1");
  }
  function cssAttrEscape(s) {
    return s.replace(/["\\]/g, "\\$&");
  }
  function safeQueryAll(doc, selector) {
    try {
      return Array.from(doc.querySelectorAll(selector));
    } catch (err) {
      console.debug("[html-review] 选择器非法，视为未命中", selector, err);
      return [];
    }
  }
  function safeMatches(el, selector) {
    try {
      return el.matches(selector);
    } catch (err) {
      console.debug("[html-review] 选择器非法，视为不匹配", selector, err);
      return false;
    }
  }

  // src/log.ts
  var PREFIX = "[html-review]";
  var log = {
    info(msg, data) {
      console.debug(PREFIX, (/* @__PURE__ */ new Date()).toISOString(), msg, data ?? "");
    },
    warn(msg, data) {
      console.warn(PREFIX, (/* @__PURE__ */ new Date()).toISOString(), msg, data ?? "");
    },
    error(msg, err) {
      console.error(PREFIX, (/* @__PURE__ */ new Date()).toISOString(), msg, err ?? "");
    }
  };

  // src/store.ts
  var KEY_PREFIX = "html-review:v1:";
  function pageIdOf(loc) {
    return `${loc.protocol}//${loc.host}${decodeURIComponent(loc.pathname)}`;
  }
  function storageKeyOf(pageId) {
    return KEY_PREFIX + pageId;
  }
  function sameHtml(a, b) {
    const norm = (s) => s.replace(/&nbsp;|\u00a0/g, " ").replace(/\s+/g, " ").trim();
    return norm(a) === norm(b);
  }
  function migrateLineBreaks(items) {
    let n = 0;
    for (const item of items) {
      if (item.kind !== "edit" || !item.afterHtml.includes("\n") || item.beforeHtml.includes("\n")) continue;
      item.afterHtml = item.afterHtml.replace(/\r?\n/g, "<br>");
      n++;
    }
    return n;
  }
  function emptyState(page, title) {
    return { version: 1, page, title, seq: { edit: 0, comment: 0, reply: 0 }, items: [] };
  }
  var ReviewStore = class {
    constructor(storage, key, page, title) {
      this.storage = storage;
      this.key = key;
      this.listeners = /* @__PURE__ */ new Set();
      this.onError = () => {
      };
      this.state = emptyState(page, title);
    }
    /**
     * 背景：页面打开时恢复上次的记录。
     * 设计意图：解析失败时保留原始数据到备份键再重置，避免用户数据被静默覆盖。
     */
    load() {
      const raw = this.storage.getItem(this.key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.version !== 1 || !Array.isArray(parsed.items)) throw new Error("版本或结构不符");
        this.state = {
          ...parsed,
          seq: { edit: parsed.seq?.edit ?? 0, comment: parsed.seq?.comment ?? 0, reply: parsed.seq?.reply ?? 0 }
        };
        const migrated = migrateLineBreaks(this.state.items);
        log.info("已恢复本地记录", { key: this.key, count: this.state.items.length, migratedLineBreaks: migrated });
      } catch (err) {
        const backupKey = `${this.key}:corrupt:${Date.now()}`;
        this.storage.setItem(backupKey, raw);
        log.error("本地记录解析失败，已备份原始数据", { backupKey, err });
        this.onError("本地记录损坏，已备份原始数据并重置");
      }
    }
    get items() {
      return this.state.items;
    }
    get snapshot() {
      return this.state;
    }
    get(id) {
      return this.state.items.find((i) => i.id === id);
    }
    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    /**
     * 背景：同一个元素可能被反复修改。
     * 设计意图：按 id 合并，保留最初的 before，只更新 after；合并后若与原文一致则删除记录，
     * 这样「改了又改回来」不会留下噪音条目。返回 null 表示记录已被删除。
     */
    upsertEdit(existingId, input) {
      const now = Date.now();
      if (existingId) {
        const item2 = this.get(existingId);
        if (item2 && item2.kind === "edit") {
          if (sameHtml(input.afterHtml, item2.beforeHtml)) {
            this.removeItem(item2.id);
            return null;
          }
          item2.afterHtml = input.afterHtml;
          item2.afterText = input.afterText;
          item2.status = "pending";
          item2.updatedAt = now;
          this.commit();
          return item2;
        }
      }
      if (sameHtml(input.afterHtml, input.beforeHtml)) return null;
      const item = {
        id: `E${++this.state.seq.edit}`,
        kind: "edit",
        anchor: input.anchor,
        beforeHtml: input.beforeHtml,
        afterHtml: input.afterHtml,
        beforeText: input.beforeText,
        afterText: input.afterText,
        status: "pending",
        createdAt: now,
        updatedAt: now
      };
      this.state.items.push(item);
      this.commit();
      return item;
    }
    addComment(anchors, body) {
      const now = Date.now();
      const item = {
        id: `C${++this.state.seq.comment}`,
        kind: "comment",
        anchors,
        body,
        replies: [],
        status: "pending",
        createdAt: now,
        updatedAt: now
      };
      this.state.items.push(item);
      this.commit();
      return item;
    }
    /** 背景：批注正文被编辑后需要重新进入待处理，否则下次复制会漏掉这次修改。 */
    updateCommentBody(id, body) {
      const item = this.get(id);
      if (!item || item.kind !== "comment") return;
      item.body = body;
      item.status = "pending";
      item.updatedAt = Date.now();
      this.commit();
    }
    /** 背景：追加评论等于补充修改意见，同样需要回到待处理。 */
    addReply(id, body) {
      const item = this.get(id);
      if (!item || item.kind !== "comment") return;
      item.replies.push({ id: `R${++this.state.seq.reply}`, body, createdAt: Date.now() });
      item.status = "pending";
      item.updatedAt = Date.now();
      this.commit();
    }
    deleteReply(id, replyId) {
      const item = this.get(id);
      if (!item || item.kind !== "comment") return;
      item.replies = item.replies.filter((r) => r.id !== replyId);
      item.updatedAt = Date.now();
      this.commit();
    }
    removeItem(id) {
      this.state.items = this.state.items.filter((i) => i.id !== id);
      this.commit();
    }
    removeWhere(pred) {
      const before = this.state.items.length;
      this.state.items = this.state.items.filter((i) => !pred(i));
      const removed = before - this.state.items.length;
      if (removed) this.commit();
      return removed;
    }
    /**
     * 背景：复制修改要求后要能「撤回」，标记已处理也要能撤销。
     * 设计意图：返回变更前的状态表，调用方把它交回 restoreStatuses 即可还原。
     */
    setStatus(ids, status) {
      const prev = /* @__PURE__ */ new Map();
      for (const item of this.state.items) {
        if (!ids.includes(item.id) || item.status === status) continue;
        prev.set(item.id, item.status);
        item.status = status;
      }
      if (prev.size) this.commit();
      return prev;
    }
    restoreStatuses(prev) {
      for (const item of this.state.items) {
        const s = prev.get(item.id);
        if (s) item.status = s;
      }
      this.commit();
    }
    /** 背景：导入修改单、跨标签页同步时整体替换状态。 */
    replaceState(next, persist = true) {
      this.state = next;
      if (persist) this.commit();
      else this.emit();
    }
    /** 背景：另一个标签页改了同一页面的记录（storage 事件），本页需要跟上。 */
    reloadFromStorage() {
      this.state = emptyState(this.state.page, this.state.title);
      this.load();
      this.emit();
    }
    commit() {
      try {
        this.storage.setItem(this.key, JSON.stringify(this.state));
      } catch (err) {
        log.error("写入 localStorage 失败", err);
        this.onError("本地保存失败，请在侧边栏导出修改单备份");
      }
      this.emit();
    }
    emit() {
      for (const fn of this.listeners) {
        try {
          fn();
        } catch (err) {
          log.error("状态订阅回调出错", err);
        }
      }
    }
  };

  // src/restore.ts
  var EDIT_ID_ATTR = "data-hr-edit-id";
  function resolveEdit(item, doc = document) {
    const before = normalizeText(item.beforeText);
    const after = normalizeText(item.afterText);
    const textOnlySame = before === after;
    const classify = (el) => {
      if (el.getAttribute(EDIT_ID_ATTR) === item.id) return { state: "pending", el };
      if (textOnlySame) {
        const html = cleanHtml(el, "inner");
        if (sameHtml(html, item.beforeHtml)) return { state: "pending", el };
        if (sameHtml(html, item.afterHtml)) return { state: "applied", el };
        return null;
      }
      const text = normalizeText(el.textContent);
      if (text === before) return { state: "pending", el };
      if (text === after) return { state: "applied", el };
      return null;
    };
    const candidates = [resolveXPath(item.anchor.xpath, doc), resolveSelector(item.anchor.selector, doc)];
    for (const el of candidates) {
      if (!el) continue;
      const r = classify(el);
      if (r) return r;
    }
    const byBefore = findByText(before, doc);
    if (byBefore) {
      const r = classify(byBefore);
      if (r) return r;
    }
    if (!textOnlySame) {
      const byAfter = findByText(after, doc);
      if (byAfter) return { state: "applied", el: byAfter };
    }
    return { state: "lost" };
  }
  function resolveAnchor(anchor, doc = document) {
    const prefix = anchor.text.replace(/…$/, "").slice(0, 60);
    const textMatches = (el) => normalizeText(el.textContent).startsWith(prefix);
    const byXPath = resolveXPath(anchor.xpath, doc);
    const bySelector = resolveSelector(anchor.selector, doc);
    if (byXPath && textMatches(byXPath)) return byXPath;
    if (bySelector && textMatches(bySelector)) return bySelector;
    return byXPath ?? bySelector ?? null;
  }

  // src/export/xml.ts
  var STATUSES = ["pending", "exported", "applied", "resolved"];
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
  function serializeState(state, exportedAt) {
    const head = `<html_review version="1" page="${escapeXml(state.page)}" title="${escapeXml(state.title)}" exported_at="${exportedAt}" seq_edit="${state.seq.edit}" seq_comment="${state.seq.comment}" seq_reply="${state.seq.reply}">`;
    const body = state.items.map((item) => itemToXml(item, true)).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
${head}
${body}
</html_review>
`;
  }
  function parseState(xml) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("文件不是合法的 XML");
    const root = doc.documentElement;
    if (root.tagName !== "html_review") throw new Error("根节点不是 html_review，可能不是本工具导出的文件");
    const num = (el, name) => {
      const v = Number(el.getAttribute(name));
      return Number.isFinite(v) ? v : 0;
    };
    const state = {
      version: 1,
      page: root.getAttribute("page") ?? "",
      title: root.getAttribute("title") ?? "",
      seq: { edit: num(root, "seq_edit"), comment: num(root, "seq_comment"), reply: num(root, "seq_reply") },
      items: []
    };
    for (const el of Array.from(root.children).filter((c) => c.tagName === "item")) {
      state.items.push(parseItem(el));
    }
    return state;
  }
  function parseItem(el) {
    const id = el.getAttribute("id");
    const type = el.getAttribute("type");
    if (!id || !type) throw new Error("条目缺少 id 或 type");
    const statusAttr = el.getAttribute("status");
    const status = statusAttr && STATUSES.includes(statusAttr) ? statusAttr : "pending";
    const createdAt = Number(el.getAttribute("created_at")) || Date.now();
    const updatedAt = Number(el.getAttribute("updated_at")) || createdAt;
    if (type === "text_edit") {
      const item = {
        id,
        kind: "edit",
        anchor: parseAnchor(el),
        beforeText: childText(el, "before"),
        afterText: childText(el, "after"),
        beforeHtml: childText(el, "before_html") || escapeXml(childText(el, "before")),
        afterHtml: childText(el, "after_html") || escapeXml(childText(el, "after")),
        status,
        createdAt,
        updatedAt
      };
      return item;
    }
    if (type === "comment") {
      const repliesEl = directChild(el, "replies");
      const targetsEl = directChild(el, "targets");
      const item = {
        id,
        kind: "comment",
        body: childText(el, "request"),
        replies: repliesEl ? Array.from(repliesEl.children).map((r, idx) => ({
          id: r.getAttribute("id") ?? `R-import-${idx}`,
          body: r.textContent ?? "",
          createdAt: Number(r.getAttribute("created_at")) || createdAt
        })) : [],
        anchors: targetsEl ? Array.from(targetsEl.children).map((t) => parseAnchor(t)) : [],
        status,
        createdAt,
        updatedAt
      };
      if (!item.anchors.length) throw new Error(`批注 ${id} 没有目标元素`);
      return item;
    }
    throw new Error(`未知条目类型：${type}`);
  }
  function parseAnchor(el) {
    return {
      xpath: childText(el, "xpath"),
      selector: childText(el, "selector"),
      section: childText(el, "section"),
      text: childText(el, "text"),
      html: childText(el, "html")
    };
  }
  function directChild(el, name) {
    return Array.from(el.children).find((c) => c.tagName === name) ?? null;
  }
  function childText(el, name) {
    return directChild(el, name)?.textContent ?? "";
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

  // src/modes/textEdit.ts
  var PERSIST_DELAY = 500;
  var BLOCKED_INPUT = /^(format|insertFromDrop$|deleteByDrag$|insertFromPasteAsQuotation$)/;
  var TextEditor = class {
    constructor(app) {
      this.app = app;
      this.s = null;
      this.persistTimer = 0;
      /**
       * 背景：Enter 已在 keydown 里拦成提交，但 Ctrl+O 之类的系统编辑命令仍可能插入段落，Chrome 会生成 <div>。
       * 设计意图：格式命令和拖放直接丢弃；插入段落改成插入 <br>，和 Shift+Enter 结果一致。
       */
      this.onBeforeInput = (e) => {
        if (BLOCKED_INPUT.test(e.inputType)) {
          e.preventDefault();
          log.info("已拦截格式 / 拖放输入", e.inputType);
        } else if (e.inputType === "insertParagraph") {
          e.preventDefault();
          document.execCommand("insertLineBreak");
        }
      };
      this.onInput = () => {
        window.clearTimeout(this.persistTimer);
        this.persistTimer = window.setTimeout(() => this.persist(), PERSIST_DELAY);
      };
      /**
       * 背景：点到页面别处、点工具栏都会让编辑元素失焦，此时应提交。
       * 约束：切换到别的应用窗口也会失焦，这种情况保持编辑状态（内容已由防抖保存），回来可以继续打字。
       */
      this.onFocusOut = (e) => {
        const s = this.s;
        if (!s) return;
        if (e.relatedTarget instanceof Node && s.el.contains(e.relatedTarget)) return;
        if (!document.hasFocus()) {
          this.persist();
          return;
        }
        this.commit();
      };
      /**
       * 背景：粘贴富文本会带进格式标签；直接 insertText 一段含 \n 的文字，Chrome 会把后面几行包进 <div>。
       * 设计意图：只取纯文本，按行插入，行与行之间用 insertLineBreak 写成 <br>，和手动换行结果一致，也能撤销。
       */
      this.onPaste = (e) => {
        if (!this.s) return;
        e.preventDefault();
        const lines = (e.clipboardData?.getData("text/plain") ?? "").split(/\r\n|\r|\n/);
        lines.forEach((line, i) => {
          if (i > 0) document.execCommand("insertLineBreak");
          if (line) document.execCommand("insertText", false, line);
        });
      };
    }
    get active() {
      return this.s !== null;
    }
    get element() {
      return this.s?.el ?? null;
    }
    start(target, point) {
      const unit = target.closest(`[${EDIT_ID_ATTR}]`) ?? target;
      if (!(unit instanceof HTMLElement)) return;
      if (this.s?.el === unit) return;
      if (this.s) this.commit();
      const store = this.app.store;
      const existingId = unit.getAttribute(EDIT_ID_ATTR);
      const existing = existingId ? store.get(existingId) : void 0;
      let beforeHtml;
      let beforeText;
      let anchor;
      const mergedIds = [];
      if (existing && existing.kind === "edit") {
        beforeHtml = existing.beforeHtml;
        beforeText = existing.beforeText;
        anchor = existing.anchor;
      } else {
        const original = unit.cloneNode(true);
        for (const child of Array.from(original.querySelectorAll(`[${EDIT_ID_ATTR}]`))) {
          const id = child.getAttribute(EDIT_ID_ATTR) ?? "";
          const rec = store.get(id);
          if (rec && rec.kind === "edit") {
            child.innerHTML = rec.beforeHtml;
            mergedIds.push(id);
          }
        }
        beforeHtml = cleanHtml(original, "inner");
        beforeText = normalizeText(original.textContent);
        anchor = buildAnchor(unit, { fullText: true, text: beforeText, html: cleanHtml(original, "outer") });
      }
      this.s = {
        el: unit,
        startHtml: unit.innerHTML,
        recordId: existing ? existing.id : null,
        beforeHtml,
        beforeText,
        anchor,
        mergedIds
      };
      const own = unit.getAttribute("contenteditable");
      if (own !== null) unit.setAttribute("data-hr-own-editable", own);
      unit.setAttribute("data-hr-editing", "");
      unit.contentEditable = "true";
      unit.spellcheck = false;
      unit.addEventListener("beforeinput", this.onBeforeInput);
      unit.addEventListener("input", this.onInput);
      unit.addEventListener("focusout", this.onFocusOut);
      unit.addEventListener("paste", this.onPaste);
      unit.focus({ preventScroll: true });
      this.placeCaret(unit, point);
      log.info("开始改字", { xpath: anchor.xpath, recordId: this.s.recordId, merged: mergedIds });
    }
    /** 背景：回车、点到别处、切换模式时结束会话并保存。 */
    commit() {
      if (!this.s) return;
      this.persist();
      this.end();
    }
    /** 背景：Esc 放弃本次会话的全部输入，回到进入编辑前的样子。 */
    cancel() {
      const s = this.s;
      if (!s) return;
      s.el.innerHTML = s.startHtml;
      this.persist();
      this.end();
      log.info("放弃本次改字");
    }
    /**
     * 背景：编辑中所有按键都不能漏给页面（Deck 的方向键翻页、空格播放等会打断编辑）。
     * 设计意图：调用方已经阻止冒泡，这里只处理三个控制键：Enter 提交、Shift+Enter 换行、Esc 放弃。
     */
    onKeydown(e) {
      if (isSubmitEnter(e)) {
        e.preventDefault();
        this.commit();
      } else if (e.key === "Enter" && e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (!document.execCommand("insertLineBreak")) document.execCommand("insertHTML", false, "<br>");
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.cancel();
      }
    }
    /**
     * 背景：每次保存都要把 DOM 当前内容和原文对比，决定新建、更新还是删除记录。
     * 设计意图：吞并的子记录在第一次保存时删除并清掉子元素上的标记，之后由本条记录统一代表。
     */
    persist() {
      window.clearTimeout(this.persistTimer);
      const s = this.s;
      if (!s) return;
      const store = this.app.store;
      let afterHtml = cleanHtml(s.el, "inner");
      if (/<br\s*\/?>\s*$/i.test(afterHtml) && !/<br\s*\/?>\s*$/i.test(s.beforeHtml)) {
        afterHtml = afterHtml.replace(/<br\s*\/?>\s*$/i, "");
      }
      const afterText = normalizeText(s.el.textContent);
      if (s.mergedIds.length) {
        for (const id of s.mergedIds) {
          store.removeItem(id);
          this.app.editEls.delete(id);
        }
        for (const child of Array.from(s.el.querySelectorAll(`[${EDIT_ID_ATTR}]`))) child.removeAttribute(EDIT_ID_ATTR);
        s.mergedIds = [];
      }
      const rec = store.upsertEdit(s.recordId, {
        anchor: s.anchor,
        beforeHtml: s.beforeHtml,
        afterHtml,
        beforeText: s.beforeText,
        afterText
      });
      if (rec) {
        s.recordId = rec.id;
        s.el.setAttribute(EDIT_ID_ATTR, rec.id);
        this.app.editEls.set(rec.id, s.el);
      } else {
        if (s.recordId) this.app.editEls.delete(s.recordId);
        s.recordId = null;
        s.el.removeAttribute(EDIT_ID_ATTR);
      }
    }
    end() {
      const s = this.s;
      if (!s) return;
      this.s = null;
      window.clearTimeout(this.persistTimer);
      const el = s.el;
      el.removeEventListener("beforeinput", this.onBeforeInput);
      el.removeEventListener("input", this.onInput);
      el.removeEventListener("focusout", this.onFocusOut);
      el.removeEventListener("paste", this.onPaste);
      const own = el.getAttribute("data-hr-own-editable");
      if (own !== null) {
        el.setAttribute("contenteditable", own);
        el.removeAttribute("data-hr-own-editable");
      } else {
        el.removeAttribute("contenteditable");
      }
      el.removeAttribute("spellcheck");
      el.removeAttribute("data-hr-editing");
      if (document.activeElement === el) el.blur();
      window.getSelection()?.removeAllRanges();
      if (s.recordId) this.app.toast.show(fmt(S.toastEditSaved, { id: s.recordId }), { ms: 1200 });
      this.app.scheduleRender();
    }
    /** 背景：点击哪里光标就落在哪里，减少一次额外点击。浏览器 API 不一致，两种都试，失败就放到末尾。 */
    placeCaret(el, point) {
      const sel = window.getSelection();
      if (!sel) return;
      let range = null;
      const doc = el.ownerDocument;
      if (point) {
        if (typeof doc.caretRangeFromPoint === "function") {
          range = doc.caretRangeFromPoint(point.x, point.y);
        } else if (typeof doc.caretPositionFromPoint === "function") {
          const pos = doc.caretPositionFromPoint(point.x, point.y);
          if (pos) {
            range = doc.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
          }
        }
      }
      if (!range || !el.contains(range.startContainer)) {
        range = doc.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // src/modes/comment.ts
  var DRAG_THRESHOLD = 5;
  var MAX_TARGETS = 30;
  var CommentPicker = class {
    constructor(app) {
      this.app = app;
      this.selection = [];
      this.baseEl = null;
      this.level = 0;
      this.drag = null;
    }
    /** 当前悬停目标：落点元素向上爬 level 层 */
    get hoverTarget() {
      let el = this.baseEl;
      for (let i = 0; i < this.level && el; i++) {
        const parent = el.parentElement;
        if (!parent || !isSelectableElement(parent)) break;
        el = parent;
      }
      return el;
    }
    onMove(e) {
      if (this.drag) {
        const dx = e.clientX - this.drag.x;
        const dy = e.clientY - this.drag.y;
        if (!this.drag.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) this.drag.active = true;
        if (this.drag.active) {
          this.app.overlay.showHover(null, "comment", "");
          this.app.overlay.showMarquee(rectOf(this.drag.x, this.drag.y, e.clientX, e.clientY));
        }
        return;
      }
      const target = e.target instanceof Element && isSelectableElement(e.target) ? e.target : null;
      if (target !== this.baseEl) {
        this.baseEl = target;
        this.level = 0;
      }
      this.showHover();
    }
    onDown(e) {
      if (e.button !== 0) return;
      this.drag = { x: e.clientX, y: e.clientY, active: false };
    }
    onUp(e) {
      const drag = this.drag;
      this.drag = null;
      if (!drag) return;
      if (drag.active) {
        this.app.overlay.showMarquee(null);
        this.marqueeSelect(rectOf(drag.x, drag.y, e.clientX, e.clientY), e.shiftKey);
      } else {
        this.clickSelect(e.shiftKey);
      }
      this.showHover();
    }
    /** 背景：Alt+↑ 从一句话扩到整张卡片，Alt+↓ 退回。 */
    climb(dir) {
      if (!this.baseEl) return;
      const next = Math.max(0, this.level + dir);
      this.level = next;
      let depth = 0;
      for (let el = this.baseEl; el?.parentElement && isSelectableElement(el.parentElement); el = el.parentElement) depth++;
      this.level = Math.min(this.level, depth);
      this.showHover();
    }
    setSelection(elements) {
      let els = elements;
      if (els.length > MAX_TARGETS) {
        this.app.toast.show(fmt(S.toastTooMany, { n: MAX_TARGETS }), { error: true });
        els = els.slice(0, MAX_TARGETS);
      }
      this.selection = els;
      this.app.overlay.showSelection(els);
      if (els.length) this.app.openNewComment();
      else this.app.closePopover();
    }
    clear() {
      this.selection = [];
      this.drag = null;
      this.baseEl = null;
      this.level = 0;
      this.app.overlay.showSelection([]);
      this.app.overlay.showMarquee(null);
    }
    showHover() {
      const el = this.hoverTarget;
      this.app.overlay.showHover(el, "comment", el ? describe(el) : "");
    }
    clickSelect(shift) {
      const el = this.hoverTarget;
      if (!el) return;
      if (!shift) {
        this.setSelection([el]);
        return;
      }
      const exists = this.selection.includes(el);
      const next = exists ? this.selection.filter((s) => s !== el) : reduceSelection([...this.selection, el]);
      this.setSelection(next);
    }
    /**
     * 背景：框选是「我圈的这块要改」，用户圈的可能是一组卡片、一个标题，也可能只是半句话。
     * 设计意图：两路结果合并后取最外层：
     * - 完整落在框里的元素（含文字的元素按文字实际范围算，见 visualRect）；
     * - 框穿过的文字所在的元素（见 textHitElements），覆盖只圈半句、圈裸文本的情况。
     * 放弃的方案：只按元素盒子完整包含判断，宽于文字的块元素和裸文本永远框不中。
     */
    marqueeSelect(rect, shift) {
      const doc = this.app.doc;
      const inside = [];
      for (const el of Array.from(doc.body.querySelectorAll("*"))) {
        if (!isSelectableElement(el)) continue;
        const r = visualRect(el);
        if (r.width === 0 || r.height === 0) continue;
        if (r.left >= rect.x && r.top >= rect.y && r.right <= rect.x + rect.w && r.bottom <= rect.y + rect.h && isVisible(el)) inside.push(el);
      }
      inside.push(...textHitElements(doc.body, rect));
      if (!inside.length) {
        this.app.toast.show(S.toastNoTarget);
        return;
      }
      const reduced = reduceSelection(shift ? [...this.selection, ...inside] : inside);
      this.setSelection(reduced);
    }
  };
  function rectOf(x1, y1, x2, y2) {
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
  }
  function describe(el) {
    let name = el.localName;
    if (el.id) name += `#${el.id}`;
    else if (el.classList.length) name += "." + Array.from(el.classList).slice(0, 2).join(".");
    const parent = el.parentElement;
    return parent && isSelectableElement(parent) ? `${name} · ${S.hoverParentHint}` : name;
  }

  // src/keyboard.ts
  function isTypingTarget(node) {
    if (!(node instanceof Element)) return false;
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) return true;
    return node instanceof HTMLElement && node.isContentEditable;
  }
  function handleKeydown(app, e) {
    const path = e.composedPath();
    if (app.editor.active) {
      e.stopPropagation();
      app.editor.onKeydown(e);
      return;
    }
    if (path.includes(app.host)) return;
    if (e.key === "Escape") {
      if (app.handleEscape()) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (isTypingTarget(path[0])) return;
    if (e.ctrlKey || e.metaKey || e.isComposing || e.keyCode === 229 || e.repeat) return;
    const plain = !e.altKey && !e.shiftKey;
    const withAlt = e.altKey && !e.shiftKey;
    const consume = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (e.code === "KeyT" && (plain || withAlt)) {
      consume();
      app.toggleMode("text");
    } else if (e.code === "KeyC" && (plain || withAlt)) {
      consume();
      app.toggleMode("comment");
    } else if (app.mode === "comment" && withAlt && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      consume();
      app.picker.climb(e.key === "ArrowUp" ? 1 : -1);
    }
  }
  function handleKeyOther(app, e) {
    if (app.editor.active) e.stopPropagation();
  }

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

  // src/ui/sheets.ts
  function adoptCss(root, css, fallbackParent) {
    const view = (root instanceof Document ? root : root.ownerDocument).defaultView;
    const Sheet = view?.CSSStyleSheet;
    if (Sheet && "adoptedStyleSheets" in root && "replaceSync" in Sheet.prototype) {
      try {
        const sheet = new Sheet();
        sheet.replaceSync(css);
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
        return () => {
          root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet);
        };
      } catch (err) {
        console.warn("[html-review] 可构造样式表不可用，回退到 <style>", err);
      }
    }
    const doc = root instanceof Document ? root : root.ownerDocument;
    const style = doc.createElement("style");
    style.textContent = css;
    fallbackParent.appendChild(style);
    return () => style.remove();
  }

  // src/ui/hostStyles.ts
  var MARK_ATTR = `${HR_ATTR_PREFIX}styles`;
  var CSS2 = `
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
`;
  function injectHostStyles(doc) {
    const root = doc.documentElement;
    if (root.hasAttribute(MARK_ATTR)) return () => {
    };
    root.setAttribute(MARK_ATTR, "");
    const remove = adoptCss(doc, CSS2, doc.head ?? root);
    return () => {
      remove();
      root.removeAttribute(MARK_ATTR);
    };
  }

  // src/ui/styles.css
  var styles_default = "/* 所有工具 UI 都在 Shadow DOM 内，宿主页面样式不会渗透进来 */\n:host {\n  all: initial;\n}\n\n* {\n  box-sizing: border-box;\n}\n\n.root {\n  --ink: #0f172a;\n  --ink-2: #334155;\n  --muted: #64748b;\n  --line: #e2e8f0;\n  --bg: #ffffff;\n  --bg-2: #f8fafc;\n  --text-accent: #d97706;\n  --text-fill: rgba(245, 158, 11, 0.12);\n  --comment-accent: #2563eb;\n  --comment-fill: rgba(37, 99, 235, 0.08);\n  --ok: #059669;\n  --danger: #dc2626;\n  --radius: 10px;\n  --shadow: 0 10px 30px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08);\n  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--ink);\n  -webkit-font-smoothing: antialiased;\n}\n\nbutton {\n  font: inherit;\n  color: inherit;\n  cursor: pointer;\n  border: none;\n  background: none;\n  padding: 0;\n}\n\nsvg {\n  display: block;\n  flex: none;\n}\n\n/* ---------- 覆盖层 ---------- */\n.layer {\n  position: fixed;\n  inset: 0;\n  pointer-events: none;\n  z-index: 2147483640;\n}\n\n.box {\n  position: fixed;\n  pointer-events: none;\n  border-radius: 4px;\n  transition: left 60ms ease-out, top 60ms ease-out, width 60ms ease-out, height 60ms ease-out;\n}\n\n.box.hover-text {\n  outline: 2px dashed var(--text-accent);\n  outline-offset: 2px;\n  background: var(--text-fill);\n}\n\n.box.hover-comment {\n  outline: 2px solid var(--comment-accent);\n  outline-offset: 1px;\n  background: var(--comment-fill);\n}\n\n.box.selected {\n  outline: 2px solid var(--comment-accent);\n  outline-offset: 1px;\n  background: rgba(37, 99, 235, 0.14);\n  transition: none;\n}\n\n.box.flash {\n  outline: 3px solid var(--comment-accent);\n  outline-offset: 3px;\n  animation: hr-flash 1.2s ease-out forwards;\n}\n\n@keyframes hr-flash {\n  0% { opacity: 1; }\n  70% { opacity: 1; }\n  100% { opacity: 0; }\n}\n\n.box-label {\n  position: fixed;\n  pointer-events: none;\n  max-width: 360px;\n  padding: 2px 8px;\n  border-radius: 6px;\n  font-size: 12px;\n  line-height: 18px;\n  color: #fff;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.box-label.text { background: var(--text-accent); }\n.box-label.comment { background: var(--comment-accent); }\n\n.marquee {\n  position: fixed;\n  pointer-events: none;\n  border: 1.5px dashed var(--comment-accent);\n  background: rgba(37, 99, 235, 0.06);\n  border-radius: 2px;\n}\n\n.pin {\n  position: fixed;\n  pointer-events: auto;\n  min-width: 22px;\n  height: 22px;\n  padding: 0 6px;\n  border-radius: 11px 11px 11px 2px;\n  background: var(--comment-accent);\n  color: #fff;\n  font-size: 12px;\n  font-weight: 600;\n  line-height: 22px;\n  text-align: center;\n  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);\n  cursor: pointer;\n  transform: translate(-30%, -70%);\n}\n\n.pin.exported {\n  background: #fff;\n  color: var(--comment-accent);\n  box-shadow: 0 0 0 1.5px var(--comment-accent), 0 2px 6px rgba(15, 23, 42, 0.12);\n}\n\n.pin:hover { transform: translate(-30%, -70%) scale(1.1); }\n\n/* ---------- 模式提示条 ---------- */\n.mode-badge {\n  position: fixed;\n  top: 12px;\n  left: 50%;\n  transform: translateX(-50%);\n  z-index: 2147483645;\n  pointer-events: none;\n  padding: 6px 14px;\n  border-radius: 999px;\n  color: #fff;\n  font-size: 12px;\n  box-shadow: var(--shadow);\n  white-space: nowrap;\n}\n\n.mode-badge.text { background: var(--text-accent); }\n.mode-badge.comment { background: var(--comment-accent); }\n.mode-badge[hidden] { display: none; }\n\n/* ---------- 工具条 ---------- */\n.toolbar {\n  position: fixed;\n  right: 20px;\n  bottom: 20px;\n  z-index: 2147483646;\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  padding: 4px;\n  background: var(--bg);\n  border: 1px solid var(--line);\n  border-radius: 999px;\n  box-shadow: var(--shadow);\n  transition: right 200ms ease;\n}\n\n/* 修改清单打开时让出右侧，避免挡住清单底部按钮 */\n.toolbar.beside-sidebar { right: 400px; }\n\n.toolbar .tb-btn {\n  position: relative;\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  height: 32px;\n  padding: 0 10px;\n  border-radius: 999px;\n  color: var(--ink-2);\n  white-space: nowrap;\n}\n\n.toolbar .tb-btn:hover { background: var(--bg-2); color: var(--ink); }\n.toolbar .tb-btn.active-text { background: var(--text-accent); color: #fff; }\n.toolbar .tb-btn.active-comment { background: var(--comment-accent); color: #fff; }\n.toolbar .tb-btn.active-sidebar { background: var(--ink); color: #fff; }\n\n.toolbar .tb-key {\n  font-size: 11px;\n  opacity: 0.6;\n}\n\n.toolbar .tb-sep {\n  width: 1px;\n  height: 18px;\n  background: var(--line);\n  margin: 0 2px;\n}\n\n.toolbar .tb-main {\n  width: 32px;\n  padding: 0;\n  justify-content: center;\n}\n\n.toolbar .tb-items {\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  overflow: hidden;\n  max-width: 0;\n  opacity: 0;\n  transition: max-width 180ms ease, opacity 120ms ease;\n}\n\n.toolbar.expanded .tb-items,\n.toolbar:hover .tb-items {\n  max-width: 520px;\n  opacity: 1;\n}\n\n.badge {\n  position: absolute;\n  top: -4px;\n  right: -4px;\n  min-width: 16px;\n  height: 16px;\n  padding: 0 4px;\n  border-radius: 8px;\n  background: var(--danger);\n  color: #fff;\n  font-size: 10px;\n  font-weight: 600;\n  line-height: 16px;\n  text-align: center;\n}\n\n.badge[hidden] { display: none; }\n\n/* ---------- 批注弹窗 ---------- */\n.popover {\n  position: fixed;\n  z-index: 2147483647;\n  width: 340px;\n  background: var(--bg);\n  border: 1px solid var(--line);\n  border-radius: var(--radius);\n  box-shadow: var(--shadow);\n  overflow: hidden;\n}\n\n.popover[hidden] { display: none; }\n\n.pop-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 10px 12px 6px;\n}\n\n.pop-id {\n  font-weight: 600;\n  color: var(--comment-accent);\n}\n\n.pop-meta {\n  flex: 1;\n  min-width: 0;\n  color: var(--muted);\n  font-size: 12px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.icon-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 26px;\n  height: 26px;\n  border-radius: 6px;\n  color: var(--muted);\n}\n\n.icon-btn:hover { background: var(--bg-2); color: var(--ink); }\n.icon-btn.danger:hover { color: var(--danger); }\n\n.pop-body { padding: 0 12px 10px; }\n\n.pop-text {\n  white-space: pre-wrap;\n  word-break: break-word;\n  color: var(--ink);\n  font-size: 13px;\n}\n\ntextarea.input {\n  display: block;\n  width: 100%;\n  min-height: 64px;\n  max-height: 200px;\n  resize: vertical;\n  padding: 8px 10px;\n  border: 1px solid var(--line);\n  border-radius: 8px;\n  font: inherit;\n  color: var(--ink);\n  background: var(--bg);\n  outline: none;\n}\n\ntextarea.input:focus { border-color: var(--comment-accent); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12); }\ntextarea.input.small { min-height: 36px; }\n\n.pop-actions {\n  display: flex;\n  align-items: center;\n  justify-content: flex-end;\n  gap: 6px;\n  padding: 8px 12px 10px;\n}\n\n.pop-actions .spacer { flex: 1; }\n\n.btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  height: 28px;\n  padding: 0 10px;\n  border-radius: 7px;\n  font-size: 12px;\n  color: var(--ink-2);\n  background: var(--bg-2);\n  border: 1px solid var(--line);\n}\n\n.btn:hover { color: var(--ink); border-color: #cbd5e1; }\n.btn.primary { background: var(--ink); color: #fff; border-color: var(--ink); }\n.btn.primary:hover { background: #1e293b; }\n.btn.primary.comment { background: var(--comment-accent); border-color: var(--comment-accent); }\n.btn:disabled { opacity: 0.45; cursor: default; }\n\n.replies {\n  border-top: 1px solid var(--line);\n  max-height: 220px;\n  overflow: auto;\n}\n\n.reply {\n  display: flex;\n  gap: 8px;\n  padding: 8px 12px;\n  border-bottom: 1px solid var(--bg-2);\n}\n\n.reply-text {\n  flex: 1;\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n.reply-time {\n  color: var(--muted);\n  font-size: 11px;\n}\n\n.reply-box {\n  display: flex;\n  gap: 6px;\n  align-items: flex-end;\n  padding: 8px 12px;\n  border-top: 1px solid var(--line);\n  background: var(--bg-2);\n}\n\n.reply-box textarea { flex: 1; }\n\n/* ---------- 状态标签 ---------- */\n.chip {\n  display: inline-flex;\n  align-items: center;\n  height: 18px;\n  padding: 0 6px;\n  border-radius: 4px;\n  font-size: 11px;\n  white-space: nowrap;\n  background: var(--bg-2);\n  color: var(--muted);\n}\n\n.chip.pending { background: #fef3c7; color: #92400e; }\n.chip.exported { background: #dbeafe; color: #1e40af; }\n.chip.applied, .chip.resolved { background: #d1fae5; color: #065f46; }\n.chip.lost { background: #fee2e2; color: #991b1b; }\n\n/* ---------- 侧边栏 ---------- */\n.sidebar {\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  z-index: 2147483646;\n  width: 380px;\n  display: flex;\n  flex-direction: column;\n  background: var(--bg);\n  border-left: 1px solid var(--line);\n  box-shadow: -10px 0 30px rgba(15, 23, 42, 0.1);\n  transform: translateX(100%);\n  transition: transform 200ms ease;\n}\n\n.sidebar.open { transform: translateX(0); }\n\n.sb-head {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 14px 16px 10px;\n}\n\n.sb-title { font-size: 15px; font-weight: 600; flex: 1; }\n\n.sb-tabs {\n  display: flex;\n  gap: 4px;\n  padding: 0 16px 10px;\n  border-bottom: 1px solid var(--line);\n}\n\n.sb-tab {\n  height: 26px;\n  padding: 0 10px;\n  border-radius: 6px;\n  color: var(--muted);\n  font-size: 12px;\n}\n\n.sb-tab:hover { color: var(--ink); background: var(--bg-2); }\n.sb-tab.active { color: var(--ink); background: var(--bg-2); font-weight: 600; }\n\n.sb-list {\n  flex: 1;\n  overflow: auto;\n  padding: 8px 0;\n}\n\n.sb-group {\n  padding: 10px 16px 4px;\n  color: var(--muted);\n  font-size: 12px;\n  font-weight: 600;\n}\n\n.sb-empty {\n  padding: 40px 24px;\n  color: var(--muted);\n  text-align: center;\n}\n\n.sb-item {\n  display: flex;\n  gap: 10px;\n  margin: 2px 8px;\n  padding: 10px 8px;\n  border-radius: 8px;\n  cursor: pointer;\n}\n\n.sb-item:hover { background: var(--bg-2); }\n.sb-item.dim { opacity: 0.55; }\n\n.sb-check {\n  margin-top: 2px;\n  width: 14px;\n  height: 14px;\n  accent-color: var(--ink);\n  cursor: pointer;\n  flex: none;\n}\n\n.sb-main { flex: 1; min-width: 0; }\n\n.sb-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin-bottom: 4px;\n}\n\n.sb-id { font-weight: 600; }\n.sb-id.edit { color: var(--text-accent); }\n.sb-id.comment { color: var(--comment-accent); }\n\n.sb-section {\n  flex: 1;\n  min-width: 0;\n  color: var(--muted);\n  font-size: 12px;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.sb-before {\n  color: var(--muted);\n  text-decoration: line-through;\n  word-break: break-word;\n}\n\n.sb-after { color: var(--ink); word-break: break-word; }\n\n.sb-body {\n  white-space: pre-wrap;\n  word-break: break-word;\n  display: -webkit-box;\n  -webkit-line-clamp: 4;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n.sb-sub { margin-top: 4px; color: var(--muted); font-size: 12px; }\n\n.sb-actions {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  opacity: 0;\n}\n\n.sb-item:hover .sb-actions { opacity: 1; }\n\n.sb-foot {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n  padding: 12px 16px;\n  border-top: 1px solid var(--line);\n  background: var(--bg-2);\n}\n\n.sb-foot .btn.primary { flex: 1 1 100%; justify-content: center; height: 34px; font-size: 13px; }\n\n/* ---------- 提示 ---------- */\n/* 放在工具条上方，避免与工具条（尤其清单打开后左移时）重叠 */\n.toast {\n  position: fixed;\n  left: 50%;\n  bottom: 76px;\n  z-index: 2147483647;\n  transform: translateX(-50%);\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  max-width: 560px;\n  padding: 10px 14px;\n  border-radius: 10px;\n  background: var(--ink);\n  color: #fff;\n  box-shadow: var(--shadow);\n  white-space: pre-wrap;\n}\n\n.toast.error { background: var(--danger); }\n.toast[hidden] { display: none; }\n.toast button { color: #93c5fd; font-weight: 600; }\n\n.modal-mask {\n  position: fixed;\n  inset: 0;\n  z-index: 2147483647;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: rgba(15, 23, 42, 0.35);\n}\n\n.modal {\n  width: min(720px, 90vw);\n  background: var(--bg);\n  border-radius: 12px;\n  box-shadow: var(--shadow);\n  padding: 16px;\n}\n\n.modal textarea { height: 50vh; font-family: ui-monospace, Menlo, monospace; font-size: 12px; }\n.modal .pop-actions { padding: 12px 0 0; }\n";

  // src/app.ts
  var isDone2 = (s) => s === "applied" || s === "resolved";
  var ISOLATED_EVENTS = ["keydown", "keyup", "keypress", "click", "dblclick", "mousedown", "mouseup", "pointerdown", "pointerup", "wheel", "touchstart", "touchend", "contextmenu"];
  var CAPTURED_POINTER_EVENTS = ["pointerdown", "pointerup", "dblclick", "auxclick"];
  var App = class {
    constructor(doc) {
      this.mode = "browse";
      /** 改字记录 id → 页面元素 */
      this.editEls = /* @__PURE__ */ new Map();
      /** 批注 id → 目标元素（可能少于 anchors，部分丢失时） */
      this.commentEls = /* @__PURE__ */ new Map();
      /** 本次定位失败的条目 */
      this.lost = /* @__PURE__ */ new Set();
      this.renderQueued = false;
      this.restoreTimer = 0;
      this.mutationObserver = null;
      this.hoverAttrEl = null;
      this.cleanups = [];
      this.doc = doc;
      this.pageId = pageIdOf(doc.location);
      this.storageKey = storageKeyOf(this.pageId);
      this.host = doc.createElement("html-review-root");
      this.host.setAttribute(HOST_ATTR, "");
      this.host.style.cssText = "all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;";
      const shadow = this.host.attachShadow({ mode: "open" });
      adoptCss(shadow, styles_default, shadow);
      this.ui = h("div", { class: "root" });
      shadow.append(this.ui);
      this.store = new ReviewStore(window.localStorage, this.storageKey, this.pageId, doc.title);
      this.overlay = new Overlay(this.ui);
      this.toast = new Toast(this.ui);
      this.editor = new TextEditor(this);
      this.picker = new CommentPicker(this);
      this.modeBadge = h("div", { class: "mode-badge", attrs: { hidden: "" } });
      this.ui.append(this.modeBadge);
      this.popover = new CommentPopover(this.ui);
      this.sidebar = new Sidebar(this.ui, {
        onLocate: (id) => this.locate(id),
        onOpenComment: (id) => this.openExistingComment(id),
        onRevertEdit: (id) => this.revertEdit(id),
        onRevertEdits: (ids) => this.revertEdits(ids),
        onToggleResolved: (id) => this.toggleResolved(id),
        onDelete: (id) => this.deleteItem(id),
        onCopyPending: () => void this.copyRequest(),
        onCopySelected: (ids) => void this.copyRequest(ids),
        onExportedToDone: () => this.exportedToDone(),
        onClearDone: () => this.clearDone(),
        onExportXml: () => this.exportXml(),
        onImportXml: (file) => void this.importXml(file),
        onClose: () => this.setSidebar(false)
      });
      this.toolbar = new Toolbar(this.ui, {
        onText: () => this.toggleMode("text"),
        onComment: () => this.toggleMode("comment"),
        onSidebar: () => this.setSidebar(!this.sidebar.isOpen),
        onCopy: () => void this.copyRequest()
      });
      this.overlay.onPinClick = (id) => this.openExistingComment(id);
    }
    /**
     * 背景：挂载入口。
     * 设计意图：先恢复数据，再挂事件，最后做一次全量定位，保证用户看到的第一帧就是上次改完的样子。
     */
    init() {
      this.cleanups.push(injectHostStyles(this.doc));
      this.doc.documentElement.appendChild(this.host);
      this.store.onError = (msg) => this.toast.show(msg, { error: true, ms: 5e3 });
      this.store.load();
      this.store.subscribe(() => {
        this.syncPopover();
        this.scheduleRender();
      });
      for (const type of ISOLATED_EVENTS) this.listen(this.host, type, (e) => e.stopPropagation());
      this.listen(window, "mousemove", (e) => this.onMouseMove(e), { capture: true, passive: true });
      this.listen(window, "mousedown", (e) => this.onMouseDown(e), { capture: true });
      this.listen(window, "mouseup", (e) => this.onMouseUp(e), { capture: true });
      this.listen(window, "click", (e) => this.onClick(e), { capture: true });
      for (const type of CAPTURED_POINTER_EVENTS) {
        this.listen(window, type, (e) => {
          if (this.mode !== "browse" && !this.isUiEvent(e)) e.stopPropagation();
        }, { capture: true });
      }
      this.listen(window, "keydown", (e) => handleKeydown(this, e), { capture: true });
      this.listen(window, "keyup", (e) => handleKeyOther(this, e), { capture: true });
      this.listen(window, "keypress", (e) => handleKeyOther(this, e), { capture: true });
      this.listen(window, "scroll", () => this.scheduleRender(), { capture: true, passive: true });
      this.listen(window, "resize", () => this.scheduleRender(), { passive: true });
      this.listen(window, "storage", (e) => this.onStorage(e));
      this.mutationObserver = new MutationObserver((records) => this.onMutations(records));
      this.mutationObserver.observe(this.doc.body, { childList: true, subtree: true, characterData: true });
      this.restoreAll();
      this.render();
      log.info("已挂载", { page: this.pageId, items: this.store.items.length });
    }
    /** 背景：书签重复点击或调试时需要完全卸载，恢复页面原状。 */
    destroy() {
      if (this.editor.active) this.editor.commit();
      for (const fn of this.cleanups) fn();
      this.cleanups = [];
      this.mutationObserver?.disconnect();
      for (const [id, el] of this.editEls) {
        if (el.getAttribute(EDIT_ID_ATTR) === id) el.removeAttribute(EDIT_ID_ATTR);
      }
      this.setHoverAttr(null);
      this.doc.documentElement.removeAttribute("data-hr-mode");
      this.host.remove();
      log.info("已卸载");
    }
    // ---------------- 模式 ----------------
    toggleMode(mode) {
      this.setMode(this.mode === mode ? "browse" : mode);
    }
    setMode(mode) {
      if (this.editor.active) this.editor.commit();
      if (this.popover.mode === "new") this.closePopover();
      this.picker.clear();
      this.overlay.showHover(null, "text", "");
      this.setHoverAttr(null);
      this.mode = mode;
      if (mode === "browse") this.doc.documentElement.removeAttribute("data-hr-mode");
      else this.doc.documentElement.setAttribute("data-hr-mode", mode);
      this.modeBadge.className = `mode-badge ${mode}`;
      this.modeBadge.textContent = mode === "text" ? S.modeText : mode === "comment" ? S.modeComment : "";
      this.modeBadge.toggleAttribute("hidden", mode === "browse");
      this.scheduleRender();
      log.info("切换模式", mode);
    }
    /**
     * 背景：Esc 是「退一步」：先关弹窗，再清选择，再退出模式，最后关侧边栏。
     * 返回 true 表示消费了这次 Esc，页面不会收到。
     */
    handleEscape() {
      if (this.popover.isOpen) {
        this.closePopover();
        this.picker.clear();
        return true;
      }
      if (this.picker.selection.length) {
        this.picker.clear();
        return true;
      }
      if (this.mode !== "browse") {
        this.setMode("browse");
        return true;
      }
      if (this.sidebar.isOpen) {
        this.setSidebar(false);
        return true;
      }
      return false;
    }
    setSidebar(open) {
      this.sidebar.setOpen(open);
      this.scheduleRender();
    }
    // ---------------- 鼠标 ----------------
    isUiEvent(e) {
      return e.composedPath().includes(this.host);
    }
    onMouseMove(e) {
      if (this.mode === "browse") return;
      if (this.isUiEvent(e)) {
        this.overlay.showHover(null, "text", "");
        this.setHoverAttr(null);
        return;
      }
      if (this.mode === "comment") {
        this.picker.onMove(e);
        return;
      }
      const target = e.target instanceof Element ? e.target : null;
      if (this.editor.element && target && this.editor.element.contains(target)) {
        this.overlay.showHover(null, "text", "");
        return;
      }
      const found = findEditableTarget(target);
      const unit = found ? found.closest(`[${EDIT_ID_ATTR}]`) ?? found : null;
      let label = S.hoverEditable;
      if (unit) {
        const rec = this.store.get(unit.getAttribute(EDIT_ID_ATTR) ?? "");
        if (rec && rec.kind === "edit") label = fmt(S.hoverEdited, { text: truncate(rec.beforeText, 40) });
      }
      this.overlay.showHover(unit, "text", unit ? label : "");
      this.setHoverAttr(unit);
    }
    onMouseDown(e) {
      if (this.popover.isOpen && this.mode === "browse" && !this.isUiEvent(e)) this.closePopover();
      if (this.mode === "browse" || this.isUiEvent(e)) return;
      e.stopPropagation();
      if (this.mode === "comment") {
        e.preventDefault();
        this.picker.onDown(e);
      }
    }
    onMouseUp(e) {
      if (this.mode === "browse" || this.isUiEvent(e)) return;
      e.stopPropagation();
      if (this.mode === "comment") {
        e.preventDefault();
        this.picker.onUp(e);
      }
    }
    /**
     * 背景：模式下点击页面不能触发页面原有行为（跳链接、翻页、展开折叠）。
     * 设计意图：一律 preventDefault + 阻止冒泡；改字模式在这里开始编辑会话。
     */
    onClick(e) {
      if (this.mode === "browse" || this.isUiEvent(e)) return;
      e.preventDefault();
      e.stopPropagation();
      if (this.mode !== "text") return;
      const target = e.target instanceof Element ? e.target : null;
      if (this.editor.element && target && this.editor.element.contains(target)) return;
      const editable = findEditableTarget(target);
      if (editable) {
        this.overlay.showHover(null, "text", "");
        this.editor.start(editable, { x: e.clientX, y: e.clientY });
      } else if (this.editor.active) {
        this.editor.commit();
      }
    }
    /** 背景：改字模式下悬停元素需要文字光标，通过临时属性配合注入样式实现。 */
    setHoverAttr(el) {
      if (this.hoverAttrEl === el) return;
      this.hoverAttrEl?.removeAttribute("data-hr-hover");
      this.hoverAttrEl = el;
      el?.setAttribute("data-hr-hover", "");
    }
    // ---------------- 批注 ----------------
    /**
     * 背景：选择变化后打开新建批注弹窗。
     * 设计意图：保存时读取 picker 的最新选择，所以 Shift 加选后不需要重新打开弹窗。
     */
    openNewComment() {
      const els = this.picker.selection;
      const last = els[els.length - 1];
      if (!last) return;
      this.popover.openNew(els.length, last.getBoundingClientRect(), {
        onSubmit: (body) => {
          const targets = this.picker.selection;
          if (!targets.length) return;
          const anchors = targets.map((el) => buildAnchor(el));
          const item = this.store.addComment(anchors, body);
          this.commentEls.set(item.id, [...targets]);
          log.info("新增批注", { id: item.id, targets: anchors.map((a) => a.xpath), body });
          this.closePopover();
          this.picker.clear();
          this.toast.show(fmt(S.toastCommentSaved, { id: item.id }), { ms: 1500 });
        },
        onCancel: () => {
          this.closePopover();
          this.picker.clear();
        }
      });
    }
    openExistingComment(id) {
      const item = this.store.get(id);
      if (!item || item.kind !== "comment") return;
      if (this.popover.mode === "new") this.picker.clear();
      const els = this.commentEls.get(id) ?? [];
      const first = els[0];
      if (first) {
        const r = first.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) first.scrollIntoView({ block: "center" });
      }
      const rect = first ? first.getBoundingClientRect() : new DOMRect(window.innerWidth / 2 - 170, 80, 0, 0);
      this.overlay.showSelection(els);
      this.popover.openExisting(item, rect, {
        onEditBody: (body) => this.store.updateCommentBody(id, body),
        onReply: (body) => {
          this.store.addReply(id, body);
          this.popover.focusReply();
        },
        onDeleteReply: (replyId) => this.store.deleteReply(id, replyId),
        onToggleResolved: () => this.toggleResolved(id),
        onDelete: () => this.deleteItem(id),
        onLocate: () => this.locate(id),
        onClose: () => this.closePopover()
      });
    }
    closePopover() {
      const wasExisting = this.popover.mode === "existing";
      this.popover.close();
      if (wasExisting) this.overlay.showSelection(this.picker.selection);
    }
    /** 背景：弹窗里的批注被修改、删除后，弹窗内容要立即同步。 */
    syncPopover() {
      if (this.popover.mode !== "existing" || !this.popover.currentId) return;
      const item = this.store.get(this.popover.currentId);
      if (!item || item.kind !== "comment") this.closePopover();
      else this.popover.refresh(item);
    }
    // ---------------- 条目操作 ----------------
    locate(id) {
      const el = this.elementOf(id);
      if (!el) {
        this.toast.show(S.sbLost, { error: true });
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(() => this.overlay.flash(el), 380);
    }
    /**
     * 背景：撤销一条改字：页面恢复原文并删除记录。
     * 约束：已生效 / 已处理的记录只删除记录，不动页面（页面上已是源文件的内容）。
     */
    revertEdit(id) {
      const item = this.store.get(id);
      if (!item || item.kind !== "edit") return;
      const el = this.editEls.get(id);
      if (el && el.getAttribute(EDIT_ID_ATTR) === id && !isDone2(item.status)) {
        el.innerHTML = item.beforeHtml;
        el.removeAttribute(EDIT_ID_ATTR);
      }
      this.editEls.delete(id);
      this.store.removeItem(id);
      log.info("撤销改字", id);
    }
    /**
     * 背景：试改了一批字后想整体放弃（例如误触改出了一串错字），逐条点撤销太慢。
     * 设计意图：复用 revertEdit 逐条还原，保证单条与批量行为一致；不弹确认框，改为提供撤回，
     * 撤回时整体换回还原前的记录，再由 restoreAll 把改字重新应用到页面（此时元素内容等于原文，能稳定定位）。
     * 约束：正在编辑的改字先提交再还原，避免编辑会话和还原同时改同一个元素。
     */
    revertEdits(ids) {
      if (this.editor.active) this.editor.commit();
      const targets = ids.filter((id) => this.store.get(id)?.kind === "edit");
      if (!targets.length) return;
      const prev = JSON.parse(JSON.stringify(this.store.snapshot));
      for (const id of targets) this.revertEdit(id);
      log.info("批量还原改字", targets);
      this.toast.show(fmt(S.toastReverted, { n: targets.length }), {
        action: {
          label: S.toastUndo,
          run: () => {
            this.store.replaceState(prev);
            this.restoreAll();
            log.info("撤回批量还原", targets);
          }
        }
      });
    }
    toggleResolved(id) {
      const item = this.store.get(id);
      if (!item) return;
      this.store.setStatus([id], item.status === "resolved" ? "pending" : "resolved");
      this.restoreAll();
    }
    deleteItem(id) {
      const item = this.store.get(id);
      if (!item) return;
      if (item.kind === "edit") {
        this.revertEdit(id);
        return;
      }
      if (!window.confirm(S.popConfirmDelete)) return;
      this.commentEls.delete(id);
      this.store.removeItem(id);
    }
    exportedToDone() {
      const ids = this.store.items.filter((i) => i.kind === "comment" && i.status === "exported").map((i) => i.id);
      const prev = this.store.setStatus(ids, "resolved");
      this.toast.show(fmt(S.toastMarkedDone, { n: ids.length }), { action: { label: S.toastUndo, run: () => this.store.restoreStatuses(prev) } });
    }
    clearDone() {
      const n = this.store.items.filter((i) => isDone2(i.status)).length;
      if (!n || !window.confirm(fmt(S.sbConfirmClear, { n }))) return;
      for (const item of this.store.items) {
        if (!isDone2(item.status)) continue;
        const el = this.editEls.get(item.id);
        if (el && el.getAttribute(EDIT_ID_ATTR) === item.id) el.removeAttribute(EDIT_ID_ATTR);
        this.editEls.delete(item.id);
        this.commentEls.delete(item.id);
      }
      this.store.removeWhere((i) => isDone2(i.status));
    }
    // ---------------- 复制修改要求 ----------------
    /**
     * 背景：「一键交给 AI」的核心动作。
     * 设计意图：默认复制所有待处理条目；传入 ids 时复制指定条目（侧边栏勾选）。
     * 条目按页面阅读顺序排列；复制成功后待处理条目变为已导出，提供撤回。
     * 剪贴板失败时弹出手动复制框，保证内容一定能拿到。
     */
    async copyRequest(ids) {
      if (this.editor.active) this.editor.commit();
      const items = this.orderedItems().filter((i) => ids ? ids.includes(i.id) : i.status === "pending");
      if (!items.length) {
        this.toast.show(S.toastNothing);
        return;
      }
      const isLocalFile = this.doc.location.protocol === "file:";
      const prompt = buildPrompt(items, {
        source: isLocalFile ? decodeURIComponent(this.doc.location.pathname) : this.doc.location.href,
        isLocalFile,
        title: this.doc.title,
        exportedAt: Date.now()
      });
      log.info("修改要求", { count: items.length, prompt });
      const ok = await copyText(prompt);
      const pendingIds = items.filter((i) => i.status === "pending").map((i) => i.id);
      const prev = this.store.setStatus(pendingIds, "exported");
      if (ok) {
        this.toast.show(fmt(S.toastCopied, { n: items.length }), {
          action: { label: S.toastUndo, run: () => this.store.restoreStatuses(prev) }
        });
      } else {
        this.toast.manualCopy(prompt);
      }
    }
    // ---------------- 导出 / 导入 ----------------
    exportXml() {
      try {
        const xml = serializeState(this.store.snapshot, Date.now());
        const blob = new Blob([xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const base = (this.pageId.split("/").pop() || "page").replace(/\.html?$/i, "");
        const d = /* @__PURE__ */ new Date();
        const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
        const a = h("a", { attrs: { href: url, download: `${base}.review-${stamp}.xml` } });
        this.ui.append(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 2e3);
        log.info("导出修改单", { items: this.store.items.length });
      } catch (err) {
        log.error("导出修改单失败", err);
        this.toast.show(fmt(S.toastImportFailed, { msg: String(err) }), { error: true });
      }
    }
    /**
     * 背景：从备份文件恢复修改单。
     * 设计意图：导入是整体替换。替换前先把页面上已应用的改字还原，再按新数据重新应用，避免新旧混在页面上。
     * 来自其他页面的修改单需要用户确认，确认后归属到当前页面。
     */
    async importXml(file) {
      try {
        const state = parseState(await file.text());
        if (state.page && state.page !== this.pageId && !window.confirm(fmt(S.toastImportOtherPage, { page: state.page }))) return;
        state.page = this.pageId;
        state.title = this.doc.title;
        for (const item of state.items) {
          const n = Number(item.id.slice(1));
          if (item.kind === "edit" && n > state.seq.edit) state.seq.edit = n;
          if (item.kind === "comment" && n > state.seq.comment) state.seq.comment = n;
        }
        this.revertAllDom();
        this.store.replaceState(state);
        this.restoreAll();
        this.toast.show(fmt(S.toastImported, { n: state.items.length }));
        log.info("导入修改单", { items: state.items.length });
      } catch (err) {
        log.error("导入修改单失败", err);
        this.toast.show(fmt(S.toastImportFailed, { msg: err instanceof Error ? err.message : String(err) }), { error: true });
      }
    }
    // ---------------- 恢复与同步 ----------------
    /**
     * 背景：页面打开、DOM 被 JS 重绘、导入、跨标签同步之后，都要把记录重新对应到页面元素上。
     * 设计意图：
     * - 改字：已挂好的跳过；否则用 resolveEdit 判断是重新应用、已生效还是丢失；
     * - 批注：每次都重新解析目标元素（开销小，且能跟上结构变化）；
     * - 已生效的改字批量更新状态并提示一次。
     * 约束：改字会话进行中不执行，避免把用户正在编辑的元素内容覆盖掉。
     */
    restoreAll() {
      if (this.editor.active) return;
      const applied = [];
      this.lost.clear();
      for (const item of this.store.items) {
        if (item.kind === "edit") {
          const known = this.editEls.get(item.id);
          if (isDone2(item.status)) {
            if (known?.getAttribute(EDIT_ID_ATTR) === item.id) known.removeAttribute(EDIT_ID_ATTR);
            this.editEls.delete(item.id);
            continue;
          }
          if (known && known.isConnected && known.getAttribute(EDIT_ID_ATTR) === item.id) continue;
          const r = resolveEdit(item, this.doc);
          if (r.state === "pending") {
            if (r.el.getAttribute(EDIT_ID_ATTR) !== item.id) {
              r.el.innerHTML = item.afterHtml;
              r.el.setAttribute(EDIT_ID_ATTR, item.id);
            }
            this.editEls.set(item.id, r.el);
          } else if (r.state === "applied") {
            applied.push(item.id);
            this.editEls.delete(item.id);
          } else {
            this.lost.add(item.id);
            this.editEls.delete(item.id);
          }
        } else {
          const els = item.anchors.map((a) => resolveAnchor(a, this.doc)).filter((el) => !!el);
          if (els.length) this.commentEls.set(item.id, els);
          else {
            this.commentEls.delete(item.id);
            this.lost.add(item.id);
          }
        }
      }
      if (applied.length) {
        this.store.setStatus(applied, "applied");
        this.toast.show(fmt(S.toastApplied, { n: applied.length }));
        log.info("改字已在源文件生效", applied);
      }
      if (this.lost.size) log.warn("以下条目定位失效", [...this.lost]);
      this.scheduleRender();
    }
    /** 背景：整体替换数据前，把页面上由本工具应用的改字全部还原成原文。 */
    revertAllDom() {
      for (const [id, el] of this.editEls) {
        const item = this.store.get(id);
        if (item && item.kind === "edit" && el.getAttribute(EDIT_ID_ATTR) === id) {
          el.innerHTML = item.beforeHtml;
          el.removeAttribute(EDIT_ID_ATTR);
        }
      }
      this.editEls.clear();
      this.commentEls.clear();
    }
    /**
     * 背景：同一页面在两个标签页打开时，一边的修改要同步到另一边。
     * 约束：本页正在改字时跳过，以本页的下一次保存为准。
     */
    onStorage(e) {
      if (e.key !== this.storageKey || this.editor.active) return;
      this.revertAllDom();
      this.store.reloadFromStorage();
      this.restoreAll();
      log.info("已同步其他标签页的修改");
    }
    /**
     * 背景：Deck、图表等页面会用 JS 重绘内容，重绘后改字效果和圆点会丢。
     * 设计意图：忽略纯粹发生在编辑元素内部的变化（用户正在打字），其余变化防抖 400ms 后重新定位。
     */
    onMutations(records) {
      const editing = this.editor.element;
      const relevant = records.some((r) => !(editing && editing.contains(r.target)));
      if (!relevant) return;
      this.scheduleRender();
      window.clearTimeout(this.restoreTimer);
      this.restoreTimer = window.setTimeout(() => this.restoreAll(), 400);
    }
    // ---------------- 渲染 ----------------
    scheduleRender() {
      if (this.renderQueued) return;
      this.renderQueued = true;
      requestAnimationFrame(() => {
        this.renderQueued = false;
        this.render();
      });
    }
    render() {
      const items = this.store.items;
      this.toolbar.update({ mode: this.mode, sidebarOpen: this.sidebar.isOpen, pending: items.filter((i) => i.status === "pending").length });
      this.overlay.setPins(this.buildPins(items));
      this.overlay.reposition();
      if (this.sidebar.isOpen) {
        const entries = this.orderedItems().map((item) => ({ item, lost: this.lost.has(item.id) }));
        this.sidebar.render(entries);
      }
      if (this.popover.isOpen) {
        const anchorEl = this.popover.mode === "existing" && this.popover.currentId ? this.commentEls.get(this.popover.currentId)?.[0] : this.picker.selection[this.picker.selection.length - 1];
        this.popover.reposition(anchorEl ? anchorEl.getBoundingClientRect() : null);
      }
    }
    buildPins(items) {
      const pins = [];
      const perEl = /* @__PURE__ */ new Map();
      for (const item of items) {
        if (item.kind !== "comment" || isDone2(item.status)) continue;
        const els = this.commentEls.get(item.id) ?? [];
        els.forEach((el, targetIndex) => {
          const stack = perEl.get(el) ?? 0;
          perEl.set(el, stack + 1);
          pins.push({ id: item.id, label: item.id.slice(1), status: item.status, el, targetIndex, stack });
        });
      }
      return pins;
    }
    elementOf(id) {
      const el = this.editEls.get(id) ?? this.commentEls.get(id)?.[0] ?? null;
      return el && el.isConnected ? el : null;
    }
    /** 背景：侧边栏和修改单都按页面阅读顺序排列，定位失效的排在最后。 */
    orderedItems() {
      const withEl = this.store.items.map((item) => ({ item, el: this.elementOf(item.id) }));
      return withEl.sort((a, b) => {
        if (a.el && b.el) return compareDocumentOrder(a.el, b.el);
        if (a.el) return -1;
        if (b.el) return 1;
        return a.item.createdAt - b.item.createdAt;
      }).map((x) => x.item);
    }
    listen(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      this.cleanups.push(() => target.removeEventListener(type, fn, opts));
    }
  };
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      log.warn("剪贴板 API 失败，尝试 execCommand", err);
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute(HOST_ATTR, "clipboard");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
    document.documentElement.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (err) {
      log.error("execCommand 复制失败", err);
    }
    ta.remove();
    return ok;
  }

  // src/index.ts
  var VERSION = true ? "0.2.0" : "dev";
  function mount() {
    const existing = window.__htmlReview;
    if (existing) {
      log.info("已挂载，切换修改清单", existing.version);
      existing.app.setSidebar(true);
      return;
    }
    try {
      const app = new App(document);
      try {
        app.init();
      } catch (err) {
        try {
          app.destroy();
        } catch (rollbackErr) {
          log.error("挂载失败后回滚也失败", rollbackErr);
        }
        throw err;
      }
      window.__htmlReview = {
        app,
        version: VERSION,
        destroy: () => {
          app.destroy();
          delete window.__htmlReview;
        }
      };
    } catch (err) {
      log.error("挂载失败", err);
      window.alert(`HTML Review 挂载失败：${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
