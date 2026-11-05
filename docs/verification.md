# 验证记录

## 范围与环境

| 项目 | 值 |
|---|---|
| 日期 | 2026-11-03 |
| 系统 | Windows x64 |
| DSH Desktop | `0.2.1-rc.5`（Electron 44.7.0） |
| 插件 | `@local/dsh-new-chat` 1.1.0、`@local/dsh-restart` 1.0.0 |
| 桌面补丁 | `two-plugin-1`（目标版本 `0.2.1-rc.5`） |

原始明细见 [`desktop-support/verification-result.json`](../desktop-support/verification-result.json)。
该文件同时记录了**原版**与**补丁后**两个被替换文件的 SHA256，可直接与仓库源码核对：

| 文件 | 原版 SHA256 | 补丁后 SHA256 |
|---|---|---|
| `lib/main.js` | `9712da3c65d5d4262da7e6d41dad30586070c8eb47f078c62165de2bdba572c3` | `d9e032e2fa5738d42a3b1986b801cf7061aaa32c551bb156f59d05edfcb0f3c3` |
| `lib/preload-app.cjs` | `f323eb67f7ace407d3b1d858f264f7846e436d9ba3e80c02b0454a6da0aed968` | `034df9ae4fd9fe1c798bfe2c1eeeb358345691c08017a939ed405691ce2e8f78` |

`npm run verify` 会核对上表与仓库中 `desktop-support/desktop/*` 的实际内容是否一致。
每次构建补丁还会生成 `*.verification.json`，记录**具体档案**的源/输出哈希与无关条目数。

## 桌面补丁与归档完整性

| 检查 | 结果 |
|---|---|
| 只替换 `lib/main.js`、`lib/preload-app.cjs` | 通过 |
| 其余打包条目逐字节核验 | 通过，16,649 项 |
| 原档案 SHA256 与 manifest 匹配 | 通过 |
| 构建不修改输入档案 | 通过（构建末尾重新哈希源文件） |
| 输出旁生成 `*.verification.json` | 通过 |

## 行为验证（14 项）

| # | 检查 | 结果 |
|---|---|---|
| 1 | 实机点击「重启」：App PID 36416 → 36224 | 通过 |
| 2 | 同一操作：Host PID 18032 → 36848 | 通过 |
| 3 | 确认是完整重启，而非刷新页面 | 通过 |
| 4 | 合成 Cookie 标记在完整重启后仍存在 | 通过 |
| 5 | 合成 localStorage 标记在完整重启后仍存在 | 通过 |
| 6 | 测试标记已清理 | 通过 |
| 7 | 聊天访客实际地址为 `https://chat.deepseek.com/` | 通过 |
| 8 | 聊天分区为 `persist:dsh-new-chat-v2` | 通过 |
| 9 | 面板「刷新」「在系统浏览器打开」按钮存在 | 通过 |
| 10 | 左上角「重启」按钮存在且命中测试通过 | 通过 |
| 11 | 两个插件在插件管理界面分别出现 | 通过 |
| 12 | 普通启动时「重启」按钮数量为 1 | 通过 |
| 13 | 临时调试参数与端口已移除/关闭 | 通过 |
| 14 | 恢复普通启动方式后可正常进入工作区 | 通过 |

## 仓库级检查（可复跑）

```powershell
npm ci
npm run verify
python -m py_compile desktop-support/tools/patch_asar.py
```

`npm run verify` 覆盖：JSON/YAML 解析、JS 语法、manifest 与补丁标记、`files`/`exports`
完整性、图标有效性与体积、插件注册点、相对 Markdown 链接、以及「备份/历史方案/asar/zip
不得被 Git 跟踪」。CI 在 Node 22 与 24 上执行同样的检查。

## 未验证 / 需要用户自行确认

- **没有代替用户完成真实微信登录**，也没有发送任何聊天消息；真实账号的长期登录保持需要用户
  首次登录后自行验收。
- 没有在 Windows 10、macOS、Linux 或其他 DSH Desktop 版本上测试。
- 没有验证桌面应用升级后的补丁重适配流程（升级会覆盖补丁，需要重新构建）。
- 没有验证官网会话在不同网络环境、不同登录方式（手机号/邮箱/第三方）下的具体过期策略。
- 没有做长期稳定性测试（数天/数周）。

这些限制与 [SECURITY.md](../SECURITY.md) 及 README 中的“兼容性与限制”一致。验证声明仅覆盖
上表列出的内容，不构成对官网行为或账号安全的保证。
