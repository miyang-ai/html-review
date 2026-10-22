/**
 * HTML Review 浏览器插件后台（Manifest V3 service worker）。
 *
 * 背景：插件是第三种挂载入口（另两种是 script 标签和书签），核心代码与 dist/html-review.js 完全相同。
 * 设计意图：
 * - 只申请 activeTab + scripting：用户点图标或按快捷键的那一刻，才获得当前标签页的权限，
 *   安装时没有「读取所有网站数据」警告；
 * - 注入到页面主环境（MAIN world），和 script 标签挂载共用防重复标记 window.__htmlReview，
 *   已挂载的页面再次触发只打开修改清单，不会出现两套工具条；
 * - 修改记录继续存页面 localStorage，和其他挂载方式互通。
 * 约束：快捷键通过 commands._execute_action 绑定，会触发 action.onClicked，无需单独监听。
 */

type Outcome = 'mounted' | 'restricted' | 'need-file-access' | 'failed'

/** 浏览器禁止任何插件注入的页面：浏览器内部页、应用商店、其他插件页面 */
const RESTRICTED: RegExp[] = [
  /^(chrome|edge|brave|opera|vivaldi|arc|about|chrome-extension|extension|devtools|view-source|chrome-search|chrome-untrusted):/i,
  /^https:\/\/chromewebstore\.google\.com\//i,
  /^https:\/\/chrome\.google\.com\/webstore/i,
  /^https:\/\/microsoftedge\.microsoft\.com\/addons/i,
]

/** Chrome 拒绝注入浏览器内部页、应用商店时的报错特征 */
const BROWSER_BLOCKED = /cannot access (a |contents of )?(chrome|edge|about|devtools)|chrome:\/\/|extensions gallery|cannot be scripted/i

/**
 * 背景：点击图标 / 快捷键后的完整处理。
 * 设计意图：先按地址判断能不能注入，能注入再执行；file:// 页面在用户没打开「允许访问文件网址」时，
 * 直接打开引导页说明怎么打开，避免静默失败。失败时在图标上显示角标，悬停可看原因。
 * 约束：返回结果供 e2e 测试断言；tab.url 在 activeTab 授权后可读，读不到时照常尝试注入。
 */
async function activate(tab: chrome.tabs.Tab): Promise<Outcome> {
  const tabId = tab.id
  if (tabId == null) return 'failed'
  const url = tab.url ?? tab.pendingUrl ?? ''
  if (url && RESTRICTED.some((r) => r.test(url))) {
    await flag(tabId, chrome.i18n.getMessage('badgeRestricted'))
    return 'restricted'
  }
  if (url.startsWith('file:') && !(await chrome.extension.isAllowedFileSchemeAccess())) {
    await chrome.tabs.create({ url: chrome.runtime.getURL('help.html#file-access'), index: tab.index + 1, openerTabId: tabId })
    return 'need-file-access'
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['html-review.js'], world: 'MAIN' })
    await clearFlag(tabId)
    return 'mounted'
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[html-review] 注入失败', { url, msg })
    // 浏览器内部页的地址对插件不可见（url 为空），只能从报错识别出「浏览器禁止」，给出可读的说明
    if (BROWSER_BLOCKED.test(msg)) {
      await flag(tabId, chrome.i18n.getMessage('badgeRestricted'))
      return 'restricted'
    }
    await flag(tabId, chrome.i18n.getMessage('badgeFailed', [msg]))
    return 'failed'
  }
}

/** 背景：注入失败时给用户一个可见、可解释的反馈；角标只作用于当前标签页。 */
async function flag(tabId: number, title: string): Promise<void> {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#dc2626' })
    await chrome.action.setBadgeText({ tabId, text: '!' })
    await chrome.action.setTitle({ tabId, title })
  } catch (err) {
    console.error('[html-review] 设置角标失败', err)
  }
}

/** 背景：注入成功或页面跳转后，清掉之前的失败提示，恢复默认标题。 */
async function clearFlag(tabId: number): Promise<void> {
  try {
    await chrome.action.setBadgeText({ tabId, text: '' })
    await chrome.action.setTitle({ tabId, title: chrome.i18n.getMessage('actionTitle') })
  } catch (err) {
    // 标签页可能已经关闭，记录后忽略即可，不影响后续操作
    console.warn('[html-review] 清除角标失败', err)
  }
}

chrome.action.onClicked.addListener((tab) => {
  void activate(tab)
})

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') void clearFlag(tabId)
})

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') void chrome.tabs.create({ url: chrome.runtime.getURL('help.html') })
})

/** 暴露给 e2e 测试和调试：在 service worker 控制台里可以直接 htmlReviewActivate(tab) */
;(globalThis as unknown as { htmlReviewActivate: typeof activate }).htmlReviewActivate = activate
