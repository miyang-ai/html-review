/**
 * 背景：插件引导页，在首次安装、或用户在 file:// 页面上触发但还没允许访问本地文件时打开。
 * 设计意图：
 * - 实时显示「允许访问文件网址」的状态，用户切回本页时重新检测，打开开关后立刻看到变化；
 * - chrome:// 页面不能用普通链接打开，按钮经 chrome.tabs.create 跳转；
 * - 从注入失败跳过来时（#file-access）高亮对应卡片。
 * 约束：图标为本地 Lucide SVG，构建时内联，不依赖 CDN。
 */
import penLine from './help-icons/pen-line.svg'
import circleCheck from './help-icons/circle-check.svg'
import triangleAlert from './help-icons/triangle-alert.svg'
import keyboard from './help-icons/keyboard.svg'
import shieldCheck from './help-icons/shield-check.svg'
import building2 from './help-icons/building-2.svg'
import briefcaseBusiness from './help-icons/briefcase-business.svg'
import externalLink from './help-icons/external-link.svg'
import mail from './help-icons/mail.svg'
import folderOpen from './help-icons/folder-open.svg'
import mapPin from './help-icons/map-pin.svg'
import codeXml from './help-icons/code-xml.svg'
import settings from './help-icons/settings.svg'

const ICONS: Record<string, string> = {
  'pen-line': penLine,
  'circle-check': circleCheck,
  'triangle-alert': triangleAlert,
  keyboard,
  'shield-check': shieldCheck,
  'building-2': building2,
  'briefcase-business': briefcaseBusiness,
  'external-link': externalLink,
  mail,
  'folder-open': folderOpen,
  'map-pin': mapPin,
  'code-xml': codeXml,
  settings,
}

function $(id: string): HTMLElement {
  const el = document.getElementById(id)
  if (!el) throw new Error(`help.html 缺少元素 #${id}`)
  return el
}

function fillIcons(): void {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-icon]'))) {
    const svg = ICONS[el.dataset.icon ?? '']
    if (svg) el.innerHTML = svg.replace(/<!--[\s\S]*?-->/, '').trim()
    else console.warn('[html-review] 引导页缺少图标', el.dataset.icon)
  }
}

/** 背景：开关在插件详情页里，用户改完切回本页，需要立刻反映最新状态。 */
async function refreshFileAccess(): Promise<void> {
  try {
    const allowed = await chrome.extension.isAllowedFileSchemeAccess()
    $('file-ok').hidden = !allowed
    $('file-off').hidden = allowed
    $('file-steps').hidden = allowed
  } catch (err) {
    console.error('[html-review] 检测本地文件访问权限失败', err)
    $('file-off').hidden = false
    $('file-steps').hidden = false
  }
}

function openTab(url: string): void {
  chrome.tabs.create({ url }).catch((err: unknown) => {
    console.error('[html-review] 打开页面失败', url, err)
    window.alert(`无法自动打开，请手动在地址栏输入：${url}`)
  })
}

function init(): void {
  fillIcons()
  $('version').textContent = `v${chrome.runtime.getManifest().version}`
  $('open-details').addEventListener('click', () => openTab(`chrome://extensions/?id=${chrome.runtime.id}`))
  $('open-shortcuts').addEventListener('click', () => openTab('chrome://extensions/shortcuts'))
  void refreshFileAccess()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshFileAccess()
  })
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1))
    target?.classList.add('highlight')
    target?.scrollIntoView({ block: 'start' })
  }
}

init()
