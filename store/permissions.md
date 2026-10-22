# 隐私权规范表单填写参考 / Privacy practices form

在 Chrome 开发者控制台「隐私权规范」页按下面填写（审核必填）。

## 单一用途 / Single purpose

中文：在用户当前浏览的网页上直接修改文字、添加批注，并把这些修改整理成一份修改单复制给 AI 助手。

English: Let users edit text and add comments directly on the web page they are viewing, then copy those changes as a structured change request for an AI assistant.

## 权限用途 / Permission justification

**activeTab**

中文：用户点击插件图标或按快捷键时，插件需要在当前标签页上运行审阅工具。activeTab 只在这次用户操作时授予当前标签页的临时权限，插件不会访问其他标签页。

English: When the user clicks the toolbar icon or presses the shortcut, the extension runs the review tool on the current tab. activeTab grants temporary access to that tab only, for that user action.

**scripting**

中文：用于在用户点击后，把插件包内自带的审阅脚本（html-review.js）注入当前页面，显示工具条并支持改字、批注。不注入任何远程代码。

English: Used to inject the bundled review script (html-review.js) into the current page after the user clicks, so the toolbar and editing features appear. No remote code is injected.

## 远程代码 / Remote code

否，我未使用远程代码。所有代码都在插件包内。

No, I am not using remote code. All code is included in the package.

## 数据使用 / Data usage

不勾选任何数据类型（不收集个人身份信息、健康、财务、身份验证、个人通讯、位置、网络历史记录、用户活动、网站内容）。

勾选三项声明：
- 我不会出于已获批准的用途之外的用途向第三方出售或传输用户数据
- 我不会为实现与我的产品的单一用途无关的目的而使用或转移用户数据
- 我不会为确定信用度或实现贷款而使用或转移用户数据

Collects none of the listed data types. Check all three certifications.

## 隐私权政策网址 / Privacy policy URL

https://github.com/miyang-ai/html-review/blob/main/store/privacy.md
