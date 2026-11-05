# Pull request

## Summary

<!-- What changes, and why? -->

## Component

- [ ] `bundle/` (@local/dsh-new-chat)
- [ ] `restart-bundle/` (@local/dsh-restart)
- [ ] `desktop-support/` (patch sources, manifest, tooling)
- [ ] documentation / repository tooling

## Verification

- [ ] `npm ci && npm run verify` passes
- [ ] `python -m py_compile desktop-support/tools/patch_asar.py` passes (if touched)
- [ ] `CHANGELOG.md` updated for user-visible changes
- [ ] No credentials, cookies, `app.asar`, user-data or account screenshots included

## Risk and rollback

<!-- For patch changes: target desktop version, manifest hashes, what was tested,
     what was not tested, and how to roll back. -->

## Checklist

- [ ] Commits follow Conventional Commits
- [ ] Documentation links still resolve
- [ ] Desktop patch remains version-locked (no "try it on any version" behavior)
- [ ] Isolation policy unchanged (no Node integration, permission grants, downloads, or site-content modification)
