# BUG-273 — Auto Settle Local Settings Removal (Server-Side Now)

**ID:** BUG-273
**Type:** BUG (Config/Cleanup)
**Created:** 2026-07-28
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Dashboard / Order Cards / Status Config
**Duplicate Check:** DISTINCT
**Code Reality:** CONFIRMED — auto-settle toggle + queue processor + button-hide logic all exist (29 references in DashboardPage.jsx alone)
**Source:** OWNER-REPORTED — "handled now from server side"
**Confidence:** CONFIRMED

---

## Description

Auto-settle was a local (frontend) feature that automatically settles prepaid orders on the dashboard. Owner confirms this is now handled server-side, so the frontend implementation should be removed:

| File | What to Remove |
|---|---|
| `StatusConfigPage.jsx` L70-71, L984-1001 | Toggle UI + localStorage key definition |
| `DashboardPage.jsx` L1526-1560 | Auto-settle queue processor (reads localStorage, calls settle API) |
| `OrderCard.jsx` L1151-1153 | Hides Settle button when auto-settle ON |
| `TableCard.jsx` L621-622 | Same hide logic |
| `utils/autoSettlePrefs.js` L10-27 | Helper functions: `isAutoSettleEnabled()` / `setAutoSettleEnabled()` |

## Evidence

- Code: 5 files with auto-settle references
- `DashboardPage.jsx` has 29 lines of auto-settle queue logic
- `StatusConfigPage.jsx` has toggle UI with `data-testid="auto-settle-toggle"`

## Blast Radius

- 5 files
- ~100 lines removed
- Hotspot: YES — DashboardPage is R5 hotspot
- Scope: MEDIUM

## Owner Decision Needed

1. After removing auto-settle FE, should Settle button ALWAYS show on OrderCard/TableCard?
2. Or do server-settled orders arrive with status=paid (no button needed for those)?
