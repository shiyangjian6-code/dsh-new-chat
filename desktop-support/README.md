# Desktop support patch

为 [`@local/dsh-new-chat`](../bundle/README.md) 与
[`@local/dsh-restart`](../restart-bundle/README.md) 提供两项桌面进程能力：

1. **聊天专用持久分区**：当访客工作区为 `dsh-new-chat-v2` 时，使用
   `persist:dsh-new-chat-v2`（Chromium 持久 Cookie/Storage），其余工作区继续使用内存临时分区。
2. **重启接口**：新增 `dsh-desktop:restart` IPC，先刷新持久分区，再 `app.relaunch()` 静默退出；
   预加载脚本向页面暴露 `window.dshDesktop.restart()`。

补丁只替换 `D:\dsh\resources\app.asar` 内的两个文件：`lib/main.js`、`lib/preload-app.cjs`，
其余打包条目的内容与元数据逐字节保留（构建工具会核对原文哈希并校验 16,649 个无关条目）。

> **这是非官方、按版本锁定的本地补丁，不是 DeepSeek 官方功能。** 桌面应用升级会覆盖它；
> 只应对 `@deepseek-ai/dsh-desktop@0.2.1-rc.5` 构建，不能盲目套用到新版本。

## 兼容性

| 项目 | 值 |
|---|---|
| 目标应用 | DSH Desktop `0.2.1-rc.5`（Electron 44.7.0，Windows x64） |
| 补丁标识 | `two-plugin-1`（见 `desktop/patch-manifest.json`） |
| 构建依赖 | Python 3.11+（仅构建补丁时需要） |
| 运行依赖 | 无；补丁进程内生效 |

`patch-manifest.json` 固定了被替换文件在**原版**中的 SHA256；版本不符时构建工具直接拒绝。

## 安全模型

- 补丁不读取、不导出、不检查任何 Cookie 或凭据：刷新只调用 Chromium 的
  `flushStorageData()` / `flushStore()`。
- 租约所有权、sandbox 偏好、权限拒绝、下载拦截、导航白名单等隔离策略保持不变。
- 持久存储只对聊天工作区生效；其他浏览器分区保持内存态。
- 持久分区中保存的是**你自己**在 DeepSeek 网页里的站点数据，和其他 Electron 应用一样落在本机
  Chromium 用户数据目录；卸载插件不会自动删除它。

## 构建与部署

完整步骤见 [安装指南](../docs/install.md)。最小流程：

```sh
# 1. 关闭 Harness 桌面应用与 Host，并备份原 app.asar 与 profile 配置
# 2. 用原版 app.asar 构建一个新档案（输出必须不存在）
python desktop-support/tools/patch_asar.py \
  "D:/dsh/resources/app.asar" \
  "D:/dsh-backup/app.patched.asar"

# 3. 核对生成的 *.verification.json，然后用新档案替换原 app.asar
#    保留原 app.asar 旁边的 app.asar.unpacked 目录不动
```

构建工具的行为：

- 输入只读，输出必须是不存在的新文件；
- 原档案的打包 payload 逐字节复制，只追加两个替换文件并更新其 offset/size/integrity；
- 输出旁生成 `*.verification.json`，记录原/新 SHA256、替换条目与核验过的无关条目数。

## 目录

| 路径 | 作用 |
|---|---|
| `desktop/main.js` | 替换进 `app.asar` 的 `lib/main.js`（含四项改动） |
| `desktop/preload-app.cjs` | 替换进 `app.asar` 的 `lib/preload-app.cjs`（暴露 `restart()`） |
| `desktop/patch-manifest.json` | 目标版本与原文件哈希 |
| `tools/patch_asar.py` | 构建器（不修改输入） |
| `tools/README.md` | 构建/恢复细节 |
| `verification-result.json` | 2026-11-03 的实机验证记录 |

## 回滚

见 [安装指南的卸载与回滚](../docs/install.md#卸载与回滚)。要点：正常退出应用后，
用备份的 `app.asar` 覆盖回去，保留 `app.asar.unpacked`，并移除两个插件包与 profile 注册。

## 许可证与来源

`desktop/main.js` 与 `desktop/preload-app.cjs` 是 **修改后的副本**，来源于
`@deepseek-ai/dsh-desktop@0.2.1-rc.5`（MIT）。原始版权归 DeepSeek 所有；
本项目对补丁的修改同样以 MIT 发布。详见仓库根目录
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。
