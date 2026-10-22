# Changelog

## 2026-10-22 23:08 · v0.2.0

### 新增：Chrome 浏览器插件
**时间**：2026-10-22 23:08
**内容**：
- 第三种挂载方式。点图标或按 `Alt+Shift+R` 在当前标签页注入，再按一次打开修改清单；权限只有 `activeTab` + `scripting`
- 注入到页面主环境，与 script 标签挂载共用防重复标记和 localStorage 数据
- `file://` 页面未允许访问文件网址时打开引导页；浏览器内部页、应用商店等不可注入页面在图标上显示角标和原因，页面跳转后自动清除
- 引导页：本地文件权限实时状态、快捷键、隐私说明、「关于」米羊科技（上海）有限公司与官网 miyang.cn、招聘邀请（miyang.cn/careers、eason@miyang.ai）
- 应用商店上架材料：中英文文案、隐私说明、权限用途说明、4 张 1280×800 截图、440×280 宣传图，均可由脚本重新生成
- `npm run pack:ext` 生成 `release/html-review-extension-v<版本>.zip`
**修改文件**：`extension/*`（新增）、`scripts/*`（新增）、`store/*`（新增）、`tests/e2e/test_extension.mjs`（新增）、`build.mjs`、`package.json`、`tsconfig.extension.json`（新增）、`.gitignore`、`README.md`、`skills/html-review/SKILL.md`、`PRD.md`
**依赖变更**：新增开发依赖 `@types/chrome`（插件 API 类型）、`fflate`（Node 内生成 zip，零依赖）；不进入产物
**状态**：✅ 已完成（单元测试 58 项、页面端到端 19 项、插件端到端 9 项通过）

### 改进：样式改用可构造样式表，严格 CSP 网站上样式正常
**时间**：2026-10-22 23:08
**现象**：插件可以注入设置了 `style-src 'self'` 的网站，但脚本插入的 `<style>` 会被 CSP 拦截，工具条无样式
**修复**：新增 `src/ui/sheets.ts`（`adoptCss`），工具 UI 与页面级样式改经 `adoptedStyleSheets` 注入，不支持时回退 `<style>`；页面级样式防重复改用 `html[data-hr-styles]` 标记
**修复文件**：`src/ui/sheets.ts`、`src/ui/hostStyles.ts`、`src/app.ts`
**状态**：✅ 已修复

### BUG-发版审查：挂载中途失败会残留页面样式和防重复标记
**时间**：2026-10-22 23:15
**现象**：发版前差异审查发现，`init` 在注入页面样式之后抛错时，`html[data-hr-styles]` 标记和样式表留在页面上，之后再挂载会跳过样式注入
**根因**：卸载函数登记在 `cleanups` 里，只有 `destroy` 会执行，挂载失败路径没有调用
**修复**：`mount` 中 `init` 失败时立即 `destroy` 回滚再报错；补充 `sheets` / `hostStyles` 单元测试 4 项、「挂载失败回滚」端到端测试 1 项；更新 `isToolElement` 过时注释
**修复文件**：`src/index.ts`、`src/dom.ts`、`tests/test_styles.ts`、`tests/e2e/test_browser.mjs`
**状态**：✅ 已修复（单元测试 58 项、端到端 28 项通过）

### 改进：版本号统一
**内容**：版本号只在 `package.json` 维护，构建时注入脚本头部注释、`window.__htmlReview.version` 和插件 manifest；版本升至 0.2.0
**修改文件**：`build.mjs`、`src/index.ts`、`package.json`
**状态**：✅ 已完成

## 2026-10-22 22:49

### 开源发布准备：Agent Skill、路径脱敏
**时间**：2026-10-22 22:49
**内容**：
- 新增 `skills/html-review/SKILL.md`：告诉其他 AI Agent 如何获取代码（clone 到 `~/.html-review`，失败时直接下载单文件）、挂载到 HTML（复制到页面目录或引用绝对路径）、按粘贴的修改单改源文件、卸载
- README 顶部新增「让你的 AI Agent 来装」：一句话指令和 Skill 安装命令
- `dist/install.html` 的「本地加载」书签与挂载代码改为打开页面时按自身位置现算，构建产物不再写入构建机绝对路径，`build.mjs` 移除 `{{LOADER}}` / `{{SCRIPT_PATH}}` 两个构建期占位符
- README、PRD、PlayGround 示例中的本机路径替换为通用示例路径
- `package.json` 补充 author、homepage、repository、bugs
**修改文件**：`skills/html-review/SKILL.md`、`README.md`、`install.template.html`、`build.mjs`、`src/playground.ts`、`PRD.md`、`package.json`
**状态**：✅ 已完成（单元测试 54 项、端到端 18 项通过）

## 2026-10-22 22:46

### BUG-003：框选一段文字时选不中任何元素
**时间**：2026-10-22 22:46
**现象**：在 Deck 上框住副标题里的半句话（「占大头的非工作日常需求尚未跑通商业化」），提示「框内没有完整包含的元素」，什么都没选中
**根因**：框选只认「盒子完整落在框内」的元素。这半句是裸文本节点，没有自己的元素；所在的 `div.v-sub` 占满整行（1222px），盒子远宽于文字，永远框不住
**修复**：直接含文字的元素改按文字实际范围判断是否被框住；新增按文本行命中，框穿过的文字所在元素也计入选择；隐藏元素不参与。提示文案改为「框里没有文字或元素」
**修复文件**：`src/dom.ts`（`visualRect`、`textHitElements`、`isVisible`）、`src/modes/comment.ts`、`src/ui/strings.ts`、`tests/e2e/test_browser.mjs`、`PRD.md`
**状态**：✅ 已修复（单元测试 54 项、端到端 18 项通过；Deck 实测半句、标题局部、标题加副标题、整页四种框法结果正确）

## 2026-10-22 22:36

### 新增：批量还原改字
**时间**：2026-10-22 22:36
**内容**：修改清单底部新增还原按钮。勾选了改字时还原选中的，未勾选时还原全部待处理 / 已导出的改字；页面恢复原文并删除记录，提示条可撤回（撤回后改字重新应用）。已生效 / 已处理的改字和批注不受影响
**修改文件**：`src/app.ts`（`revertEdits`）、`src/ui/sidebar.ts`、`src/ui/strings.ts`、`src/playground.ts`、`tests/e2e/test_browser.mjs`、`PRD.md`
**状态**：✅ 已完成（单元测试 54 项、端到端 17 项通过）

## 2026-10-22 22:31

### 文档：README 新增 Quickstart
**时间**：2026-10-22 22:31
**内容**：在 README 开头加入 6 步上手流程（装书签、改字、批注、复制修改要求、刷新确认），原「安装」一节改名为「安装（从源码构建）」
**状态**：✅ 已完成

## 2026-10-22 22:27

### 新增：HTML Review v0.1.0
**时间**：2026-10-22 22:27
**内容**：
- 单文件挂载（Script 标签 / 书签注入），UI 在 Shadow DOM 中
- 改字模式（T / Alt+T）：悬停高亮编辑单位，点击原地编辑，输入中 500ms 防抖实时保存，Enter 保存，Esc 放弃，处理输入法组合
- 批注模式（C / Alt+C）：单击、拖拽框选、Shift 多选、Alt+↑/↓ 切换父子元素；批注评论、编辑、已处理、删除；编号圆点
- 修改清单：按页面顺序列出，状态筛选，定位、撤销、勾选复制、批量标记、清空已处理
- 复制修改要求：提示词 + XML 修改单，条目标为已导出并可撤回；剪贴板失败时手动复制
- 刷新恢复：XPath → 选择器 → 全文搜索三级定位；源文件已改时自动标为已生效；DOM 重绘后自动挂回；跨标签页同步
- 修改单 XML 导出 / 导入
- PlayGround：模拟报告页、组件 demo 页
- 测试：54 个单元测试（Vitest + jsdom），15 个真实 Chrome 端到端测试（puppeteer-core）
**状态**：✅ 已完成

### BUG-001：Shift 多选时批注弹窗挡住相邻元素
**时间**：2026-10-22 22:24
**现象**：选中图表第一根柱子后，弹窗出现在正下方，盖住第二根柱子，Shift+单击落在弹窗上，无法加选
**根因**：弹窗定位优先放在目标下方
**修复文件**：`src/ui/popover.ts`（改为优先右侧、其次左侧，两侧放不下才放下方 / 上方）
**状态**：✅ 已修复

### BUG-002：修改清单打开时底部按钮被工具条挡住
**时间**：2026-10-22 22:26
**现象**：「导出修改单」等清单底部按钮点不到
**根因**：工具条固定在右下角，层级在清单之上
**修复文件**：`src/ui/toolbar.ts`、`src/ui/styles.css`（清单打开时工具条左移让出清单宽度；提示条上移到工具条上方）
**状态**：✅ 已修复

### 已知待优化
- `file://` 页面改名或移动后，旧记录不会自动迁移，需要用导出 / 导入搬运
- 设置了严格 CSP 的线上网站会拦截书签注入
