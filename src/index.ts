import { App } from './app'
import { log } from './log'

declare global {
  interface Window {
    __htmlReview?: { app: App; version: string; destroy: () => void }
  }
}

/** 构建时由 build.mjs 从 package.json 注入，保证脚本、插件 manifest、Release 的版本号一致 */
declare const __VERSION__: string
const VERSION = typeof __VERSION__ === 'string' ? __VERSION__ : 'dev'

/**
 * 背景：脚本可能通过 <script> 标签挂载，也可能被书签反复注入；可能在 <head> 里加载，也可能在页面末尾。
 * 设计意图：
 * - 已挂载时不重复创建，书签再次点击改为打开 / 关闭修改清单；
 * - DOM 未就绪时等待 DOMContentLoaded，保证 body 存在、页面内容已解析，首轮定位才准确；
 * - init 中途失败时立即 destroy 回滚，否则页面级样式和防重复标记会残留，之后的挂载会跳过样式注入。
 */
function mount(): void {
  const existing = window.__htmlReview
  if (existing) {
    log.info('已挂载，切换修改清单', existing.version)
    existing.app.setSidebar(true)
    return
  }
  try {
    const app = new App(document)
    try {
      app.init()
    } catch (err) {
      try {
        app.destroy()
      } catch (rollbackErr) {
        log.error('挂载失败后回滚也失败', rollbackErr)
      }
      throw err
    }
    window.__htmlReview = {
      app,
      version: VERSION,
      destroy: () => {
        app.destroy()
        delete window.__htmlReview
      },
    }
  } catch (err) {
    log.error('挂载失败', err)
    window.alert(`HTML Review 挂载失败：${err instanceof Error ? err.message : String(err)}`)
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true })
else mount()
