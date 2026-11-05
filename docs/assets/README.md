# Assets

| File | Purpose |
|---|---|
| `ui-overview.svg` | Original schematic illustration of the New Chat panel (sidebar entry, host bar, wide web page area). It is **not** a screenshot and contains no real account data. |

## Screenshot contributions

The repository intentionally ships no real screenshots: a screenshot of this plugin would show
the maintainer's sign-in state, session titles, avatars or chat text, which must not be published.

If you want to contribute a privacy-safe screenshot:

1. Use a fresh/test account with no personal chat history, or redact everything below.
2. Capture only what is needed, at 1200–1600 px wide, PNG.
3. **Redact** the account avatar/name/email, session titles, chat text, and any URL parameters.
4. Save as `docs/assets/screenshot-panel.png` (New Chat panel) or
   `docs/assets/screenshot-restart.png` (top-left Restart button).
5. Reference it from `README.md` and `README.en.md` under **Screenshots / 界面预览**, with alt text
   like “New Chat panel (redacted)”.
6. Confirm the file is under 2 MiB (CI checks tracked files; `.gitattributes` marks PNG as binary).

Never include: `app.asar`, Electron user-data contents, cookies, tokens, QR codes, or any text
from a private conversation.
