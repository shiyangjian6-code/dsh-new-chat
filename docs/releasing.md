# 发布检查清单

仓库内容已经准备好；下面是把本目录发布到 GitHub 的步骤（只做一次）。

## 1. 在 GitHub 创建仓库

- 仓库名：`dsh-new-chat`
- 可见性：Public
- **不要**勾选初始化 README / .gitignore / LICENSE（本仓库已有）。
- 描述（Description）建议：

  > Unofficial DeepSeek web chat panel for DeepSeek Harness Desktop, with cross-restart login
  > persistence through a version-locked desktop patch.

- Topics 建议：`deepseek-harness` `dsh-plugin` `electron` `webview` `windows` `deepseek`

## 2. 推送

```powershell
git remote add origin https://github.com/shiyangjian6-code/dsh-new-chat.git
git push -u origin main
git push origin v1.1.0
```

## 3. 创建 Release

- Tag：`v1.1.0`
- 标题：`v1.1.0 — New Chat with cross-restart login`
- 说明：直接使用 [CHANGELOG.md](../CHANGELOG.md) 的 `1.1.0` 段落（Keep a Changelog 格式）。
- 不要上传 `app.asar`、备份或任何用户数据；如需要，可附上两个 bundle 的 zip
  （`bundle/`、`restart-bundle/`，分别打包；不要包含 node_modules）。

## 4. 仓库设置（建议）

- **Security → Private vulnerability reporting**：开启，配合 `SECURITY.md` 与 issue 模板的
  私有报告链接。
- **Actions**：确认 `CI` workflow 在首次 push 后通过（Node 22/24 与 Python 语法检查）。
- **Branches**：建议保护 `main`（要求 CI 通过、禁止强推）。
- **Dependabot**：已配置 npm 与 GitHub Actions 的每周检查。

## 5. 发布前自检

```powershell
npm ci
npm run verify
git status --short        # 应为空
git ls-files | Measure-Object -Line   # 47 个文件，约 666 KiB
```

确认：

- [ ] `git ls-files` 中没有 `备份/`、`历史方案/`、`*.asar`、`*.zip`、`node_modules/`；
- [ ] 没有个人隐私（账号、Cookie、路径、聊天内容）被提交；
- [ ] README 的 clone/badge 链接使用 `shiyangjian6-code/dsh-new-chat`；
- [ ] 上游链接 `github.com/deepseek-ai/deepseek-harness` 可公开访问；
- [ ] 如需真实截图，按 [docs/assets/README.md](assets/README.md) 脱敏后提交。

## 6. 之后

- 桌面应用升级后：先回滚官方 `app.asar`，再针对新版本重新生成替换文件、
  更新 `desktop-support/desktop/patch-manifest.json` 与补丁版本，并在
  `docs/verification.md` 记录新的验证结果。
- 发布新版本时同步更新 `CHANGELOG.md`、bundle 的 `package.json` 版本与新的 tag。
