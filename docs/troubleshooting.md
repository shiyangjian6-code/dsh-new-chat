# 故障排查

先确认基础状态：

```powershell
$dsh = "D:\dsh"
Test-Path "$dsh\resources\app.asar"
Test-Path "$dsh\resources\app.asar.unpacked"          # 必须存在
Test-Path "$env:USERPROFILE\.dsh\profiles\desktop"   # 当前 profile 目录
Test-Path "$env:APPDATA\DSH Desktop\Partitions\dsh-new-chat-v2"  # 持久分区（登录后出现）
```

## 左侧栏没有「新聊天」

- 插件未安装或未启用：设置 → 插件 中确认「新聊天」处于启用状态。
- 本地目录安装是**链接**：确认 `<仓库路径>\bundle` 仍存在，仓库目录没有被移动/删除。
  若已移动，先卸载再重新安装。
- `bundle/package.json` 中 `dsh.client` 的 `inject` 指向 `dsh-client-ui-layout/sidebar`；
  若桌面版本缺少这些包，入口不会注册。本方案只支持 `0.2.1-rc.5`。
- 改完插件后未生效：停用再启用插件，或重启 Harness。

## 面板显示「当前环境无法在 Harness 内嵌此网页」

原因：当前页面不是桌面版页面（例如用系统浏览器打开 `http://127.0.0.1:<port>` 的网页版
Harness），页面中没有 `window.dshDesktop` 桌面桥接，无法创建 WebView 访客。

处理：

- 使用 **DSH Desktop 桌面应用**打开 Harness；
- 或点击卡片上的「在系统浏览器打开」直接使用官网（登录会由系统浏览器保存）。

## 重启按钮提示「需要安装配套桌面补丁」

`window.dshDesktop.restart()` 不存在，说明桌面补丁没有生效：

1. 确认 `D:\dsh\resources\app.asar` 已是补丁档案（可用构建证据中的 `output_sha256` 核对）；
2. 确认没有装错版本：补丁只适用于 `0.2.1-rc.5`；
3. 重新按 [安装指南](install.md) 构建并部署；
4. 桌面应用升级过：旧补丁被覆盖，需要针对新版本重新适配。

## 反复闪屏

1.0.0 曾因在每次 `dom-ready` 都重复加载目标地址而触发循环；1.1.0 已改为只加载一次。
确认插件版本为 `1.1.0`（设置 → 插件，或 `node -e` 读取 `bundle/package.json`）。若仍出现，
请附上版本与复现步骤提 issue。

## Rate Limit Reached / 环境异常 / 登录限制

这是 **DeepSeek 官网的风控或限流**，不是插件故障：

- 稍等几分钟，点面板上的「刷新」；
- 或使用「在系统浏览器打开」；
- 不要连续快速刷新，避免加重限流。

面板会在检测到这类页面时显示中文提示条（`docs/architecture.md` 中的“风险提示”行为）。

## 重启后仍然需要登录

按可能性排查：

1. **补丁未生效**：没有持久分区，重启后当然需要重登。见上一节。
2. **第一次刚装补丁**：旧的内存分区不会自动迁移；需要登录一次。
3. **重启方式不对**：请用应用内「重启」按钮或正常退出后重新打开，确保进程真正退出；
   多个实例同时运行会互相抢占。
4. **会话被网站主动失效**：在别处退出登录、网站风控、长期未使用都可能导致重新登录。
   这属于官网行为，插件不能绕过。
5. **换了 Windows 用户或清空了用户数据**：持久分区位于
   `%APPDATA%\DSH Desktop\Partitions\dsh-new-chat-v2`，删除即丢失登录。

## 应用升级后补丁失效

桌面应用升级会覆盖 `resources/app.asar`：

- 重新为**新版本**生成替换文件与 manifest，不要复用旧补丁；
- 构建工具会因原文件哈希不符而拒绝，这是安全保护，不是 bug；
- 如暂时不需要补丁功能，可按 [卸载与回滚](install.md#卸载与回滚) 回滚到官方档案。

## 应用无法启动（补丁后）

1. 不要反复尝试；先退出所有 Harness 进程。
2. 用备份的 `app.asar` 覆盖回去（保留 `app.asar.unpacked`），确认能启动。
3. 核对补丁目标版本与 `patch-manifest.json` 的原文件哈希；确认构建证据中的
   `source_sha256` 与你备份的原档案一致。

## 插件安装失败（plugin_manager）

- `target` 必须是**仓库目录的绝对路径**（`<repo>\bundle`），不是相对路径；
- 路径不要包含无法访问的网络位置；确认当前 Windows 用户有读权限；
- profile 中已存在同名包时，先卸载旧包再安装；
- 若提示与 DSH 版本不兼容，确认使用 `0.2.1-rc.5` 桌面版。

## 清除登录数据

退出应用后：

```powershell
Remove-Item "$env:APPDATA\DSH Desktop\Partitions\dsh-new-chat-v2" -Recurse -Force
```

下次打开需要重新登录。插件自身不保存任何凭据。

## 收集诊断信息时请注意

不要上传：`app.asar`、`Partitions` 目录、任何 Cookie/会话数据、含账号信息的截图。
可以提供：DSH 版本、插件版本、补丁 `verification.json`（不含凭据）、复现步骤与错误文字。
