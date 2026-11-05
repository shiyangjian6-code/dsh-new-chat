# Contributing

Thanks for your interest in improving New Chat for DeepSeek Harness.

## Ground rules

- **Never** submit credentials, cookies, session dumps, `app.asar`, Electron user-data
  directories or screenshots containing account information.
- The desktop patch is version-locked. Do not attempt to make it "just work" on an unknown
  desktop version; add support for a new version explicitly, with its own verified hashes.
- Keep the two plugins independent: `@local/dsh-new-chat` must not depend on
  `@local/dsh-restart`.
- The embedded page must stay isolated: no Node integration, no permission grants, no download
  enabling, no modifying the site's content.

## Development setup

Requirements: Node.js 22+, Python 3.11+ (patch builds only), Windows 10/11 x64 with a local
DSH Desktop `0.2.1-rc.5` installation if you want to exercise the patch path.

```powershell
npm ci
npm run verify
python -m py_compile desktop-support/tools/patch_asar.py
```

`npm run verify` checks:

- every `package.json`, locale JSON and `patch-manifest.json` parses;
- every plugin `cordis.patch.yml` parses and matches its package name;
- every JavaScript file parses (Acorn-based syntax check in `scripts/verify.mjs`);
- `files`/`exports` entries exist, icons are valid and small enough;
- the desktop patch sources still contain the expected features and markers;
- repository-relative Markdown links resolve;
- no ignored material (`备份/`, `历史方案/`, `*.asar`, `node_modules/`) is tracked.

## Changing the desktop patch

1. Re-derive the replacement `desktop/main.js` and `desktop/preload-app.cjs` from the **exact
   target desktop version**.
2. Update `desktop/patch-manifest.json` (`desktop_version`, `patch_version`,
   `original_entry_sha256`) and the patch version in `desktop-support/README.md`.
3. Rebuild with `patch_asar.py` against an original archive and verify the generated
   `*.verification.json`.
4. Record what was verified and what was not in `docs/verification.md`.
5. Note again that application updates overwrite the patch.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes:
  `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- One logical change per pull request; explain user-visible behavior, risks and verification.
- Update `CHANGELOG.md` for user-visible changes.
- CI must pass (`npm run verify`).

## Reporting security issues

Do not open a public issue for vulnerabilities; follow [SECURITY.md](SECURITY.md).

By contributing you agree that your contributions are licensed under the repository's MIT
license.
