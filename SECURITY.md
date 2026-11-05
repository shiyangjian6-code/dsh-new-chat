# Security policy

## Supported versions

| Component | Supported |
|---|---|
| `@local/dsh-new-chat` | 1.1.0 |
| `@local/dsh-restart` | 1.0.0 |
| `desktop-support` patch | `two-plugin-1` for DSH Desktop `0.2.1-rc.5` |
| DSH Desktop | `0.2.1-rc.5` (Windows x64) only |

Other desktop versions are unsupported and untested.

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub's private vulnerability reporting on this
repository (Security → Report a vulnerability), or contact the maintainer privately if that
feature is unavailable. Include the affected component/version, reproduction steps, impact and
any suggested fix. We aim to acknowledge within a few days.

## Scope

In scope:

- the two plugin bundles (`bundle/`, `restart-bundle/`) and their client code;
- the desktop patch sources and build tool in `desktop-support/`;
- repository scripts, documentation and CI.

Out of scope:

- DeepSeek's website, the DeepSeek Harness application itself, Electron or Chromium;
- issues caused by applying the patch to a different desktop version;
- loss of a website session that the site itself expires.

## Security model and known risks

- The plugins never read, store or upload account credentials; sign-in happens inside the
  embedded official page.
- The patch never inspects or exports cookies. It only calls Chromium storage flush APIs so the
  persistent partition is durable.
- Persistent storage is enabled **only** for the chat guest workspace; all other browser
  partitions remain in memory. Lease ownership, webview sandbox preferences, permission denial,
  download blocking and the navigation allowlist are unchanged.
- The desktop patch modifies an installed Electron application bundle. It is unofficial,
  version-locked and overwritten by application updates. Applying it to a wrong version can
  prevent the app from starting. Always back up the original `app.asar` and profile files.
- The risk-control notice feature reads the guest page title and the first 4000 characters of
  its text **locally in memory** to choose a message. Nothing is stored or transmitted, and no
  input values are read.
- Do not distribute pre-patched `app.asar` archives; only publish the patch sources and tooling
  from this repository.

## Hardening advice

- Verify the SHA256 of the source `app.asar` and the generated `*.verification.json` before
  deploying.
- Keep the original `app.asar`, profile `package.json`, `pnpm-lock.yaml` and `cordis.patch.yml`
  in a dated backup.
- Revert the patch before updating the desktop application.
- If you no longer want the persisted session, delete
  `%APPDATA%\DSH Desktop\Partitions\dsh-new-chat-v2` while the app is closed.
