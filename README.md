# HTML Review

在任意 HTML 页面上直接改字、点选加批注，一键复制一份精确的修改要求交给 AI 改源文件。

## 让你的 AI Agent 来装

把下面这句话发给 Cursor / Claude Code / Codex 等 Agent，它会自己 clone 仓库、把工具挂到你的页面上：

```text
按 https://github.com/miyang-ai/html-review/blob/main/skills/html-review/SKILL.md 的说明，把 HTML Review 挂到 <你的 HTML 文件路径> 上。
```

想让 Agent 以后自动会用（包括按你粘贴的修改单改源文件），把 Skill 装进它的 skills 目录：

```bash
git clone --depth 1 https://github.com/miyang-ai/html-review.git ~/.html-review
# 按你用的 Agent 选一个
mkdir -p ~/.cursor/skills && cp -r ~/.html-review/skills/html-review ~/.cursor/skills/
mkdir -p ~/.claude/skills && cp -r ~/.html-review/skills/html-review ~/.claude/skills/
mkdir -p ~/.codex/skills  && cp -r ~/.html-review/skills/html-review ~/.codex/skills/
```

Skill 文件：[`skills/html-review/SKILL.md`](skills/html-review/SKILL.md)，内容包括获取代码、挂载到 HTML、按修改单改源文件、卸载四部分。

## 特点

- 单个 JS 文件，无外部依赖，UI 在 Shadow DOM 里，不影响页面样式
- 改动实时保存在浏览器本地，刷新后自动恢复
- 源文件被 AI 改好后刷新，改字记录自动识别为「已生效」
- 页面原有的快捷键（例如 Deck 方向键翻页）照常工作，改字时自动屏蔽

## Quickstart

`dist/` 已包含构建好的文件，直接使用不需要 `npm install`。

1. **装书签**：浏览器打开 `dist/install.html`，把「HTML Review」按钮拖到书签栏。
2. **打开要改的页面**，点一下书签，右下角出现工具条。
3. **改字**：按 `T`（输入法开着时按 `Alt+T`），悬停看到高亮，点击文字直接改，`Enter` 保存。
4. **批注**：按 `C`（或 `Alt+C`），单击 / 拖拽框选 / `Shift+单击` 多选元素，写修改意见后 `Enter` 保存。
5. **交给 AI**：点工具条「复制修改要求」，粘贴给 Cursor 里的 AI，让它按修改单改源文件。
6. **刷新页面**：已经改进源文件的改字条目自动标为「已生效」；批注在修改清单里点「已处理」。

改动随时保存在浏览器本地，关掉页面再打开也不会丢。想让某个页面常驻工具，把 `dist/html-review.js` 复制到页面所在目录，在 `</body>` 前加：

```html
<script src="html-review.js"></script>
```

## 安装（从源码构建）

```bash
npm install
npm run build
```

然后打开 `dist/install.html`，把「HTML Review」按钮拖到书签栏。

### 挂载方式

| 方式 | 用法 |
|---|---|
| 书签 | 打开任意页面，点书签注入；再点一次打开修改清单 |
| Script 标签 | 复制 `dist/html-review.js` 到页面目录，在 `</body>` 前加 `<script src="html-review.js"></script>`；只在本机用时也可以写 `dist/html-review.js` 的绝对路径 |

## 使用

| 按键 | 作用 |
|---|---|
| `T` / `Alt+T` | 改字模式：悬停高亮可改的文字，点击直接改；`Enter` 保存，`Shift+Enter` 换行，`Esc` 放弃 |
| `C` / `Alt+C` | 批注模式：单击选中，拖拽框选，`Shift+单击` 多选，`Alt+↑/↓` 切换父子元素 |
| `Esc` | 逐级退出：关闭弹窗、清空选择、退出模式、关闭清单 |

中文输入法开启时单字母会被输入法接收，用 `Alt` 组合键。

改完后点工具条上的「复制修改要求」，粘贴给 AI。修改要求里包含源文件路径、规则和 XML 修改单（每条带 XPath、CSS 选择器、所在章节、原文 / 新文或批注意见）。

## 开发

```bash
npm run watch      # 监听构建
npm run typecheck  # 类型检查
npm test           # 单元测试（Vitest + jsdom）
npm run test:e2e   # 端到端测试（puppeteer-core 驱动本机 Chrome）
```

- `playground/index.html`：模拟报告页，已挂载工具，用于手动体验
- `playground/components.html`：每个 UI 元素的独立 demo 和提示词模板

## 目录

```text
src/
  index.ts          入口，防重复挂载
  app.ts            总控制器：事件接管、模式切换、恢复、渲染
  store.ts          状态与 localStorage
  locator.ts        XPath / 选择器 / 章节 / 全文搜索
  restore.ts        刷新后定位与已生效判断
  dom.ts            可编辑单位判断、HTML 清洗、选择归并
  keyboard.ts       快捷键
  modes/            改字会话、批注选择
  ui/               工具条、覆盖层、批注弹窗、修改清单、提示、样式、图标
  export/           提示词与 XML 修改单
tests/              单元测试与 e2e
skills/html-review/ 给 AI Agent 用的 Skill
```

## License

MIT · Copyright (c) 2025 Miyang Tech (Shanghai) Co., Ltd. · 图标来自 [Lucide](https://lucide.dev)（ISC）
