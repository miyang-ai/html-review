const PREFIX = '[html-review]'

/**
 * 背景：工具注入到任意页面，排查问题时需要在浏览器 Console 里快速过滤出本工具的日志。
 * 设计意图：统一加前缀和时间戳；info 用 console.debug，默认不刷屏，打开 Verbose 即可看到。
 */
export const log = {
  info(msg: string, data?: unknown): void {
    console.debug(PREFIX, new Date().toISOString(), msg, data ?? '')
  },
  warn(msg: string, data?: unknown): void {
    console.warn(PREFIX, new Date().toISOString(), msg, data ?? '')
  },
  error(msg: string, err?: unknown): void {
    console.error(PREFIX, new Date().toISOString(), msg, err ?? '')
  },
}
