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
- 三种挂载方式：Chrome 插件、书签、`<script>` 标签

## Quickstart

`dist/` 已包含构建好的文件，直接使用不需要 `npm install`。

1. **装插件或书签**（二选一）：
   - **浏览器插件（推荐）**：从 [Releases](https://github.com/miyang-ai/html-review/releases) 下载 `html-review-extension-v*.zip` 并解压，或者直接用仓库里的 `dist/extension/`；打开 `chrome://extensions`，打开右上角「开发者模式」，点「加载已解压的扩展程序」选这个文件夹。要审阅本地 HTML 文件时，在插件详情页打开「允许访问文件网址」。
   - **书签**：浏览器打开 `dist/install.html`，把「HTML Review」按钮拖到书签栏。
2. **打开要改的页面**，点插件图标（或按 `Alt+Shift+R`）或点书签，右下角出现工具条。
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

然后打开 `dist/install.html`，把「HTML Review」按钮拖到书签栏；或在 `chrome://extensions` 加载 `dist/extension/`。

### 挂载方式

三种方式共用同一份核心代码和同一份本地数据：同一个页面不管用哪种方式打开，看到的修改记录都一样。

| 方式 | 用法 |
|---|---|
| 浏览器插件 | Chrome、Edge、Arc、Brave 等 Chrome 系浏览器。点图标或按 `Alt+Shift+R` 在当前标签页开启；再按一次打开修改清单。只申请当前标签页权限，严格 CSP 的网站也能用 |
| 书签 | 打开任意页面，点书签注入；再点一次打开修改清单。严格 CSP 的网站会拦截书签 |
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
npm run test:e2e   # 端到端测试（puppeteer-core 驱动本机 Chrome，含插件加载测试）
npm run pack:ext   # 打包插件 zip 到 release/
npm run store:assets  # 重新生成应用商店截图与宣传图
npm run icons      # 重新渲染插件图标
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
extension/          Chrome 插件：manifest、后台注入逻辑、引导页、图标、多语言
scripts/            插件打包、图标渲染、商店素材生成
store/              Chrome 应用商店上架材料
tests/              单元测试与 e2e
skills/html-review/ 给 AI Agent 用的 Skill
```

## 关于

HTML Review 由 **米羊科技（上海）有限公司**（Miyang Tech (Shanghai) Co., Ltd.）开发并开源。米羊的使命是让每个普通人都能用好 AI，旗下产品有白艾莉 Alice（活在真实时间线里的 AI 角色与共创世界）、小山学堂、XSCT 场景化大模型评测。这个工具来自我们自己的日常：融资材料、调研报告、产品页都是 HTML，我们需要一种在页面上直接改、改完交给 AI 的方式。

官网：[miyang.cn](https://miyang.cn) · 联系：contact@miyang.ai

### 我们在招人

会为页面上的一个字较真的人，大概也会喜欢我们的团队。我们在上海徐汇漕河泾组建 Alice 的早期核心团队，寻找愿意投入 2–3 年、一起做件可能很伟大的事的超级个体：看到 AI 底层变化会真的兴奋，对工程、叙事与产品审美有偏执，相信一个人加 AI 能顶一个团队。现金薪资加期权，Coding Token 报销。

[查看在招职位](https://miyang.cn/careers) · 简历投递：eason@miyang.ai

## License

MIT · Copyright (c) 2025 Miyang Tech (Shanghai) Co., Ltd. · 图标来自 [Lucide](https://lucide.dev)（ISC）
