import { icon, type IconName } from './icons'

type Child = Node | string | null | undefined | false
type Props = {
  class?: string
  text?: string
  title?: string
  icon?: IconName
  attrs?: Record<string, string>
  style?: Partial<CSSStyleDeclaration>
  on?: Partial<{ [K in keyof HTMLElementEventMap]: (e: HTMLElementEventMap[K]) => void }>
}

/**
 * 背景：工具 UI 用原生 DOM 构建（不引入框架），手写 createElement 冗长易错。
 * 设计意图：提供最小的声明式构造函数，覆盖 class、文本、图标、属性、样式、事件六类常用参数。
 * 约束：icon 通过 innerHTML 写入，仅接受本地图标表里的名字，不接受外部字符串，避免注入。
 */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  if (props.class) el.className = props.class
  if (props.title) el.title = props.title
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v)
  if (props.style) Object.assign(el.style, props.style)
  if (props.icon) el.insertAdjacentHTML('beforeend', icon(props.icon))
  if (props.text !== undefined) el.append(props.text)
  if (props.on) {
    for (const [name, fn] of Object.entries(props.on)) el.addEventListener(name, fn as EventListener)
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c)
  return el
}
