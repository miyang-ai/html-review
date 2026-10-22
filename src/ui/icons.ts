import typeIcon from '../icons/type.svg'
import messageSquarePlus from '../icons/message-square-plus.svg'
import panelRight from '../icons/panel-right.svg'
import copy from '../icons/copy.svg'
import x from '../icons/x.svg'
import check from '../icons/check.svg'
import trash2 from '../icons/trash-2.svg'
import crosshair from '../icons/crosshair.svg'
import undo2 from '../icons/undo-2.svg'
import download from '../icons/download.svg'
import upload from '../icons/upload.svg'
import pencil from '../icons/pencil.svg'
import send from '../icons/send.svg'
import circleCheck from '../icons/circle-check.svg'
import rotateCcw from '../icons/rotate-ccw.svg'
import penLine from '../icons/pen-line.svg'
import listChecks from '../icons/list-checks.svg'

const RAW = {
  type: typeIcon,
  messageSquarePlus,
  panelRight,
  copy,
  x,
  check,
  trash2,
  crosshair,
  undo2,
  download,
  upload,
  pencil,
  send,
  circleCheck,
  rotateCcw,
  penLine,
  listChecks,
}

export type IconName = keyof typeof RAW

/**
 * 背景：图标来自本地保存的 Lucide SVG 源文件（src/icons），构建时以文本内联进产物，不依赖 CDN。
 * 设计意图：去掉许可证注释、统一尺寸为 16px，返回可直接放进 innerHTML 的 SVG 字符串。
 */
export function icon(name: IconName, size = 16): string {
  return RAW[name]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)
    .replace(/\s+/g, ' ')
    .trim()
}
