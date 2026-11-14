# Session Handover — 2026-11-09 — BUG-661 IMPLEMENTATION

**Agent role this session:** IMPLEMENTATION (Role 3, AGENT_PROMPT_ALPHA.md)
**Date:** 2026-11-09
**Items worked:** BUG-661 (supersedes BUG-621 v1)

---

## Summary

BUG-661 GATE_5A_IMPLEMENTED. 8 files changed (6 modified, 2 new). All tests 8/8 PASS.

**Problem solved:** PWA update banner never showed + white screen after deploy.
**Root cause:** SW file never changes per release → no `waiting` worker → banner never triggered. White screen: stale `index.html` → deleted hashed bundles 404 before React boots.
**Fix:** version.json build-id check (independent of SW), boot guard, NotificationContext SW detection ungated + hadController guard, 60s session retry in ErrorBoundary.

---

## Files changed

| File | What |
|---|---|
| `craco.config.js` | REACT_APP_BUILD_ID baked at build; BuildVersion plugin emits build/version.json |
| `public/version.json` (NEW) | Stub `{"buildId":"dev"}` |
| `src/hooks/useAppVersionCheck.js` (NEW) | 5-min poll + load + visibilitychange version check |
| `src/App.js` | "New version available" / "Update now", versionUpdatePending, no auto-timer |
| `src/contexts/NotificationContext.jsx` | SW detection ungated + hadController guard |
| `public/index.html` | Inline boot guard one-shot reload on bundle 404 |
| `src/index.js` | `window.__APP_BOOTED__=true` after render |
| `src/components/guards/ErrorBoundary.jsx` | 60s sessionStorage retry (replaces `?retry=1`) |

---

## Registry state
- BUG-661: GATE_5A_IMPLEMENTED (gate 5)
- BUG-621: GATE_5B_QA_PASS | SUPERSEDED_BY BUG-661 (2026-11-09)
- Total items: 734

---

## Next steps
1. QA Gate 5B — QA handover at `handover/QA_HANDOVER_BUG661_2026_11_09.md` (12 checks, V1-V13)
2. Owner Smoke: test on mobile browser / real PWA install
3. DevOps: apply nginx snippet from QA handover §6 (no-cache on index.html + version.json)
4. Consider flagging BUG-597 for closure — its SW detection path is now superseded by BUG-661 F5

---

## Testing method (preview)
```bash
# Show banner:
echo '{"buildId":"dev2"}' > /app/frontend/public/version.json
# Revert:
echo '{"buildId":"dev"}' > /app/frontend/public/version.json
```
