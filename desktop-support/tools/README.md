# Desktop patch builder and recovery

Target: `@deepseek-ai/dsh-desktop` **0.2.1-rc.5**. The baseline SHA256 values of the
two replaced files live in `../desktop/patch-manifest.json`; the builder refuses a
different source. This patch is local, unofficial and may be replaced by an
application update — never apply it blindly to another desktop version.

## Prerequisites

- Python 3.11+ (builder only)
- Node.js 22+ (repository checks only)
- The desktop application and its Host must be closed before replacing `app.asar`

## Build

```sh
# From the repository root. The source archive is read-only.
python desktop-support/tools/patch_asar.py \
  "D:/dsh/resources/app.asar" \
  "D:/dsh-backup/app.patched.asar"
```

The output file must not exist. The tool:

- copies the original packed payload byte for byte;
- appends the two replacement files and updates only their offset, size and
  SHA256 integrity (including block hashes);
- verifies every unrelated packed entry and symlink/unpacked metadata entry
  against the original archive;
- writes `<output>.verification.json` with the source/output SHA256 values,
  changed entries and the number of verified unrelated entries;
- leaves the source untouched (it re-hashes it at the end to prove that).

## Deploy

1. Quit Harness normally (tray/menu). Do not replace a running Electron archive.
2. Copy `app.asar`, the current chat bundle and the profile's `package.json`,
   `pnpm-lock.yaml`, `cordis.patch.yml` into a timestamped backup; hash and list it.
3. Replace `resources/app.asar` with the patched archive. **Keep the sibling
   `app.asar.unpacked` directory** — it belongs to the untouched payload.
4. Start the app; install/upgrade the two local bundles in the profile.
5. Verify a real startup, the「新聊天」panel and the「重启」button.

## Checks

```sh
# Repository-level checks (manifest, JSON, JS syntax, patch markers, links)
npm ci
npm run verify

# Builder syntax
python -m py_compile desktop-support/tools/patch_asar.py
python desktop-support/tools/patch_asar.py --help
```

## Do not

- patch a different desktop version, or reuse a build manifest from one version
  on another;
- disable Electron fuses or bypass archive integrity validation;
- inspect, export or log cookies/credentials;
- delete or move `app.asar.unpacked`.

## Rollback

Close the app normally, restore the backed-up `app.asar` (keep its
`app.asar.unpacked`), restore the chat bundle and the profile files, and remove
the newly added restart bundle link/registration. Start the app and check the
plugins. Keep the persistent partition data unless the user explicitly asks to
clear their own website session.
