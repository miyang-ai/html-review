# Chrome 应用商店上架材料

| 文件 | 用途 |
|---|---|
| `listing.zh.md` / `listing.en.md` | 商店名称、简介、详细说明、类别（名称和简介由 manifest 的 `_locales` 自动读取） |
| `privacy.md` | 隐私权政策，提交时填它在 GitHub 上的网址 |
| `permissions.md` | 隐私权规范表单：单一用途、权限用途、远程代码、数据使用 |
| `screenshots/01–04*.png` | 1280×800 截图 4 张 |
| `screenshots/promo-small-440x280.png` | 小型宣传图 |
| `screenshots/promo-marquee-1400x560.png` | 大型宣传图（精选横幅位） |
| `../extension/icons/icon-128.png` | 商店图标 |

## 重新生成

```bash
npm run store:assets   # 重新截图（改了 UI 后运行）
npm run icons          # 重新渲染图标（改了图标设计后运行）
npm run pack:ext       # 生成 release/html-review-extension-v<版本>.zip
```

## 提交步骤

1. 打开 [Chrome 开发者控制台](https://chrome.google.com/webstore/devconsole)，用米羊的 Google 账号登录（首次需支付 5 美元注册费并完成开发者身份验证）。
2. 「新建项」→ 上传 `release/html-review-extension-v<版本>.zip`。
3. 「商品详情」：粘贴 `listing.zh.md` 的详细说明，语言选中文（简体）；再添加英文，粘贴 `listing.en.md`。上传图标、截图和宣传图，类别选「开发者工具」。
4. 「隐私权规范」：按 `permissions.md` 填写。
5. 「分发」：公开、所有地区、免费。
6. 提交审核。审核通过后，把商店链接补到 README 的「浏览器插件」一节。

## 更新版本

改 `package.json` 的 `version` → `npm run pack:ext` → 在开发者控制台「软件包」上传新 zip → 提交审核。
