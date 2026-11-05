# @local/dsh-new-chat — 新聊天

在 DeepSeek Harness **桌面版**左侧侧边栏增加「新聊天」入口，点击后在整个主内容区打开
<https://chat.deepseek.com/>。安装配套的 [桌面支持补丁](../desktop-support/README.md) 后，
登录状态可以跨应用重启保留。

> 非官方社区项目，与 DeepSeek 官方无隶属关系。首次使用前请阅读
> [安全与隐私](../README.md#安全与隐私) 与 [已知限制](#已知限制)。

## 功能

- **左侧栏入口**：注册 `sidebar.panellist` 行与 `main` 全局面板，和内置「插件」入口同一种形态。
- **全宽网页**：面板占满主内容区（Electron `WebView` 访客），不是 iframe，
  不会被官网的 `CSP: frame-ancestors 'none'` 拦截。按 `Ctrl+B` 收起左侧栏可再宽一点。
- **登录保持**：配合桌面补丁，聊天访客使用持久分区 `persist:dsh-new-chat-v2`，
  应用重启后复用 Cookie 与站点 localStorage；只需首次登录一次。
- **风控提示**：官网返回 `Rate Limit Reached` / 环境异常等页面时，面板顶部给出中文说明，
  并提供「刷新」「在系统浏览器打开」。
- **兜底**：没有桌面 WebView 能力时（例如浏览器网页版 Harness）显示说明卡片，
  可一键在系统浏览器打开。
- **隐私**：不读取、不保存账号密码，不调用任何付费 API。

## 安装

前提：DSH Desktop 为 `0.2.1-rc.5`（Windows x64），并已按
[安装指南](../docs/install.md) 应用桌面补丁（补丁是「登录保持」的前提）。

本插件以本地 bundle 形式安装，不需要 npm 发布：

1. **设置 → 插件 → 安装本地目录**，选择本仓库的 `bundle/` 目录；或让 Harness 智能体执行
   `plugin_manager install_bundle target = <仓库绝对路径>/bundle`。
2. 左侧侧边栏出现「新聊天」，点击即可。

未安装桌面补丁时插件仍可工作，但访客分区是内存态：应用重启后需要重新登录。

## 卸载

- **设置 → 插件** 找到「新聊天」，停用或卸载；或执行
  `plugin_manager remove_bundle target = @local/dsh-new-chat`。
- 如需同时清理登录数据，退出 Harness 后删除 Electron 为持久分区保存的站点数据目录
  （见 [安装指南的卸载章节](../docs/install.md#卸载与回滚)）。

## 已知限制

- 网站主动让会话失效、或在别处退出登录后，仍需重新登录；插件不能保证「永不重登」。
- 切换面板再切回来会重新挂载访客，页面会重新加载（服务端会话历史不受影响）。
- 桌面应用升级会覆盖补丁；升级后需重新构建并部署对应版本的补丁。
- 仅支持 Windows 桌面版 DSH；浏览器网页版 Harness 只能用系统浏览器兜底。

## 文件

| 文件 | 作用 |
|---|---|
| `package.json` | bundle 清单：`dsh.bundle.patch`、`dsh.client`、locale / icon 导出 |
| `cordis.patch.yml` | 向当前 profile 插入一行 `new-chat` 插件 |
| `index.js` | Host 半边（本插件没有 Host 逻辑） |
| `client.js` | 浏览器半边：槽位注册与 WebView 托管的全部逻辑 |
| `locale/zh.json`、`locale/en.json` | 插件管理器中的显示名称与描述 |
| `icon.svg` | 原创图标（MIT） |

实现细节、补丁差异与验证证据见仓库根目录的
[架构说明](../docs/architecture.md) 与 [验证记录](../docs/verification.md)。
