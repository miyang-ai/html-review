/*! HTML Review v0.2.0 | MIT | Copyright (c) 2025 Miyang Tech (Shanghai) Co., Ltd. | Icons: Lucide (ISC) */
"use strict";
(() => {
  // extension/background.ts
  var RESTRICTED = [
    /^(chrome|edge|brave|opera|vivaldi|arc|about|chrome-extension|extension|devtools|view-source|chrome-search|chrome-untrusted):/i,
    /^https:\/\/chromewebstore\.google\.com\//i,
    /^https:\/\/chrome\.google\.com\/webstore/i,
    /^https:\/\/microsoftedge\.microsoft\.com\/addons/i
  ];
  var BROWSER_BLOCKED = /cannot access (a |contents of )?(chrome|edge|about|devtools)|chrome:\/\/|extensions gallery|cannot be scripted/i;
  async function activate(tab) {
    const tabId = tab.id;
    if (tabId == null) return "failed";
    const url = tab.url ?? tab.pendingUrl ?? "";
    if (url && RESTRICTED.some((r) => r.test(url))) {
      await flag(tabId, chrome.i18n.getMessage("badgeRestricted"));
      return "restricted";
    }
    if (url.startsWith("file:") && !await chrome.extension.isAllowedFileSchemeAccess()) {
      await chrome.tabs.create({ url: chrome.runtime.getURL("help.html#file-access"), index: tab.index + 1, openerTabId: tabId });
      return "need-file-access";
    }
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["html-review.js"], world: "MAIN" });
      await clearFlag(tabId);
      return "mounted";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[html-review] 注入失败", { url, msg });
      if (BROWSER_BLOCKED.test(msg)) {
        await flag(tabId, chrome.i18n.getMessage("badgeRestricted"));
        return "restricted";
      }
      await flag(tabId, chrome.i18n.getMessage("badgeFailed", [msg]));
      return "failed";
    }
  }
  async function flag(tabId, title) {
    try {
      await chrome.action.setBadgeBackgroundColor({ tabId, color: "#dc2626" });
      await chrome.action.setBadgeText({ tabId, text: "!" });
      await chrome.action.setTitle({ tabId, title });
    } catch (err) {
      console.error("[html-review] 设置角标失败", err);
    }
  }
  async function clearFlag(tabId) {
    try {
      await chrome.action.setBadgeText({ tabId, text: "" });
      await chrome.action.setTitle({ tabId, title: chrome.i18n.getMessage("actionTitle") });
    } catch (err) {
      console.warn("[html-review] 清除角标失败", err);
    }
  }
  chrome.action.onClicked.addListener((tab) => {
    void activate(tab);
  });
  chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === "loading") void clearFlag(tabId);
  });
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") void chrome.tabs.create({ url: chrome.runtime.getURL("help.html") });
  });
  globalThis.htmlReviewActivate = activate;
})();
