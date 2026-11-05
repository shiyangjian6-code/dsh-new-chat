# Changelog

All notable changes to this repository are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-03

### Added

- `@local/dsh-new-chat` 1.1.0: with the companion desktop patch, the chat guest uses the
  persistent partition `persist:dsh-new-chat-v2`, so the DeepSeek login survives application
  restarts and the new Restart button.
- Risk-control notice bar (rate limit / abnormal environment) with Reload, Open-in-system-browser
  and Dismiss actions.
- `@local/dsh-restart` 1.0.0: top-left Restart control that restarts the whole desktop app and
  Host after flushing persistent browser storage.
- `desktop-support` patch `two-plugin-1` for DSH Desktop `0.2.1-rc.5`: persistent chat partition,
  storage flush, `dsh-desktop:restart` IPC and the `window.dshDesktop.restart()` preload API.
- Repository documentation, CI verification and install/rollback guides.

### Changed

- Chat panel keeps the previous single-load navigation fix (no reload loop), the standard
  Chromium user agent for compatibility, and the Desktop-only WebView requirement.

### Security

- No credential handling: the patch flushes Chromium storage without inspecting cookies.
- Persistent storage is limited to the chat workspace; other browser partitions stay in memory.

## [1.0.0] - 2026-11-03

### Added

- `@local/dsh-new-chat` 1.0.0: left-sidebar「新聊天」entry, full-width DeepSeek web chat via the
  Desktop `window.dshDesktop.browser` lease and Electron `<webview>`, system-browser fallback and
  a lazy-loading indicator.
