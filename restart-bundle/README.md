# @local/dsh-restart — 重启

在 DSH Desktop **左上角标题栏菜单之后**显示一个「重启」按钮，一次点击重新启动整个桌面应用与
Host。属于可选的配套插件；它依赖 [桌面支持补丁](../desktop-support/README.md) 提供的
`window.dshDesktop.restart()`。

> 非官方社区项目，与 DeepSeek 官方无隶属关系。

## 行为

- 点击后先刷新持久浏览器存储，再 `app.relaunch()` 并静默退出；App 与 Host 一起重启。
- 防重复点击；等待中按钮显示「重启中…」并禁用。
- 未安装补丁时按钮不会假装重启，而是在面板中给出安装解释。
- 调用失败时显示原因并允许重试；成功请求后保持禁用直到进程退出。
- 正在运行的任务会随 Host 正常关闭而停止，请在合适的时机使用。

## 安装

前提：DSH Desktop `0.2.1-rc.5` 且已应用桌面补丁。

**设置 → 插件 → 安装本地目录**，选择本仓库的 `restart-bundle/`；或执行
`plugin_manager install_bundle target = <仓库绝对路径>/restart-bundle`。

## 卸载

**设置 → 插件** 中找到「重启」停用或卸载；或执行
`plugin_manager remove_bundle target = @local/dsh-restart`。
卸载不影响 `@local/dsh-new-chat`。

## 已知限制

- 按钮固定在 `left: 180px; top: 6px`（Windows 标题栏菜单之后）。左侧栏折叠、窗口极窄或
  Windows 标题栏布局变化时，可能与内置控件在视觉上靠近；这是当前实现的位置假设。
- 按钮文案当前为中文（与主聊天插件一致）；`locale/en.json` 只提供插件管理器中的英文名称与描述。

## 实现说明

- 使用文档化的 `shell.overlay` 列表槽位（`position: fixed; left: 180px; top: 6px`），
  不覆盖 `sidebar.brand.name` 与 `shell.leading` 这两个 single 槽位。
- 按钮带可访问名称与 `-webkit-app-region: no-drag`；错误用 `role="alert"` 呈现。
- 注册与样式随 Cordis 作用域卸载，不向文档注入全局 CSS。

## 文件

| 文件 | 作用 |
|---|---|
| `package.json` | bundle 清单 |
| `cordis.patch.yml` | 插入一行 `local-restart` 插件 |
| `index.js` | Host 半边（无 Host 逻辑） |
| `client.js` | 按钮组件与注册 |
| `icon.svg` | 原创图标（MIT） |
