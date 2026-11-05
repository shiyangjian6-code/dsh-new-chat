# 安装、卸载与回滚

> [!WARNING]
> 本方案包含**非官方桌面补丁**：它会替换本机 DSH Desktop `0.2.1-rc.5` 的
> `lib/main.js` 与 `lib/preload-app.cjs`。补丁按版本锁定，应用升级会覆盖它；套用到错误版本
> 可能导致应用无法启动。**请先完整备份，并确认你接受这一风险。**

## 0. 先决条件

- Windows 10/11 x64。
- DSH Desktop **`0.2.1-rc.5`**，默认安装在 `D:\dsh`（以 `DeepSeek Harness.exe` 所在目录为准）。
- Python 3.11+（仅构建补丁时需要）。
- Node.js 22+（仅运行仓库校验/开发时需要）。
- 操作期间**先正常退出** Harness（托盘/菜单退出），确认没有残留进程。

## 1. 备份（必做）

```powershell
$dsh = "D:\dsh"
$backup = "$env:USERPROFILE\dsh-backup\$(Get-Date -Format 'yyyyMMdd')"

New-Item -ItemType Directory -Force $backup | Out-Null

Copy-Item "$dsh\resources\app.asar"      "$backup\app.asar"
Copy-Item "$dsh\resources\app.asar.unpacked" "$backup\app.asar.unpacked" -Recurse

$profileDir = "$env:USERPROFILE\.dsh\profiles\desktop"
Copy-Item "$profileDir\package.json"      "$backup\profile-package.json"
Copy-Item "$profileDir\pnpm-lock.yaml"    "$backup\profile-pnpm-lock.yaml"
Copy-Item "$profileDir\cordis.patch.yml"  "$backup\profile-cordis.patch.yml"

Get-FileHash "$backup\app.asar" -Algorithm SHA256 |
  Tee-Object "$backup\SHA256SUMS.txt"
```

补齐说明：

- `app.asar.unpacked` 不属于被替换的 payload，但一起备份更稳妥；**恢复时保留现场的这个目录**。
- profile 目录名可能不是 `desktop`，以 `%USERPROFILE%\.dsh\profiles\` 下实际正在使用的 profile 为准。
- 若已安装过本插件，把两个 bundle 目录也复制进备份。

## 2. 构建补丁

```powershell
python desktop-support/tools/patch_asar.py `
  "$dsh\resources\app.asar" `
  "$env:USERPROFILE\dsh-backup\app.patched.asar"
```

构建工具会：

- 只读取源档案，输出路径必须不存在（避免误覆盖）；
- 原 payload 逐字节复制，仅追加两个替换文件并更新其 offset/size/integrity；
- 校验源档案中 `lib/main.js`、`lib/preload-app.cjs` 的原版 SHA256（与
  `desktop-support/desktop/patch-manifest.json` 比对），不符直接拒绝；
- 逐条核验其余打包条目与 symlink/unpacked 元数据未变；
- 在输出旁生成 `app.patched.asar.verification.json`。

检查 evidence：

```powershell
Get-Content "$env:USERPROFILE\dsh-backup\app.patched.asar.verification.json"
```

期望包含 `source_sha256`、`output_sha256`、`changed_entries`、
`unchanged_packed_entries_verified`（参考机器为 16649）与 `desktop_version`。

## 3. 部署补丁

```powershell
Copy-Item "$env:USERPROFILE\dsh-backup\app.patched.asar" "$dsh\resources\app.asar" -Force
# 不要移动/删除 $dsh\resources\app.asar.unpacked
```

启动 Harness：

- 能正常进入工作区，版本仍显示 `0.2.1-rc.5`；
- 若无法启动：立即按 [卸载与回滚](#卸载与回滚) 恢复备份，再排查版本/存档问题。

## 4. 安装两个插件

**界面安装**：设置 → 插件 → 安装本地目录，分别选择仓库里的 `bundle/` 与 `restart-bundle/`。

**或让 Harness 智能体执行**（把 `<repo>` 换成仓库绝对路径）：

```text
plugin_manager install_bundle target = <repo>\bundle
plugin_manager install_bundle target = <repo>\restart-bundle
```

说明：

- 本地目录安装会以链接方式接进当前 profile；**不要删除或移动仓库目录**（要移动先卸载）。
- 两个插件独立注册，可分别启用/停用/卸载。
- 安装后在插件列表中应看到「新聊天」与「重启」，左侧栏出现「新聊天」行。

## 5. 首次登录与验收

1. 点击左侧「新聊天」，在官网页面完成一次登录（例如微信扫码）。
2. 点击左上角「重启」；应用与 Host 会一起重启。
3. 重启后再次点击「新聊天」：应直接处于已登录状态，无需再次扫码。
4. 若出现 `Rate Limit Reached` / 环境异常提示条：等待几分钟后点「刷新」，
   或改用「在系统浏览器打开」。这是官网风控，不是插件故障。
5. 可选的存储检查（不涉及账号信息）：

```powershell
Test-Path "$env:APPDATA\DSH Desktop\Partitions\dsh-new-chat-v2"
```

该目录存在即表示持久分区已写入本机。不要导出或分享其中的内容。

## 卸载与回滚

### 卸载插件

- 设置 → 插件 → 停用/卸载「新聊天」「重启」；
- 或执行 `plugin_manager remove_bundle target = @local/dsh-new-chat` /
  `@local/dsh-restart`。

### 回滚桌面补丁

1. 正常退出 Harness，确认无残留进程。
2. 用备份档案覆盖回去：

   ```powershell
   Copy-Item "$env:USERPROFILE\dsh-backup\<日期>\app.asar" "$dsh\resources\app.asar" -Force
   ```

   保留现场 `app.asar.unpacked` 目录；若曾整体备份过它，用备份覆盖也可。
3. 启动应用，确认能正常进入工作区。
4. 按需恢复 profile 文件。注意：备份是安装前快照，若之后还改过其他配置，只回退与本方案相关的
   依赖/注册项，不要整份覆盖。

### 清除登录数据（可选）

先退出应用，再删除你自己在该网页的会话数据：

```powershell
Remove-Item "$env:APPDATA\DSH Desktop\Partitions\dsh-new-chat-v2" -Recurse -Force
```

删除后下次打开「新聊天」需要重新登录。插件本身不保存任何凭据，删除该目录不会影响插件运行。

## 故障排查

见 [docs/troubleshooting.md](troubleshooting.md)。常见问题：补丁未生效、升级覆盖、启动失败、
插件列表不显示、登录仍然丢失、风控页面。
