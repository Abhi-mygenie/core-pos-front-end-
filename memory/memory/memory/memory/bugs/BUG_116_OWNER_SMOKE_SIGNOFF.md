# BUG-116 — Owner Smoke Sign-off (Gate 6)

**Bug:** BUG-116 — FE listener for `food_update_${rid}` socket; realtime menu update on Add Custom Item
**Date:** 2026-06-08
**Owner:** ⏳ AWAITING SIGN-OFF
**Status:** IMPLEMENTED — awaiting owner smoke

---

## Smoke Test Checklist (for Owner)

Login to preprod as `owner@lafetta.com` / `Qplazm@10`.

### A. Same-terminal smoke

| # | Step | Expected | ✅ / ❌ |
|---|---|---|---|
| 1 | Open DevTools → Console. Filter by `food-update` or `useSocketEvents` | Console shows `[useSocketEvents] Subscribed to food-update channel successfully` on app boot | |
| 2 | Order Entry → Add Custom Item → name `BUG_116_SMOKE_<your_initials>`, price ₹1, qty 1 → Add to Order | Item appears in cart (existing behaviour, no regression) | |
| 3 | Console after step 2 | `[useSocketEvents] food-update channel event: [{type: 'update-food', food_id: X, restaurant_id: 78, food_details: {...}}]` | |
| 4 | Console after step 2 | `[SocketHandler] food-update: product X added/updated in MenuContext` | |
| 5 | After step 2, search the same product name in the menu browser without page reload | Item appears in menu list | |

### B. Cross-terminal smoke

| # | Step | Expected | ✅ / ❌ |
|---|---|---|---|
| 6 | Open another browser tab, login again (or use same session) | Both tabs connected to socket | |
| 7 | Tab A: Add Custom Item with a new unique name | Item added in Tab A cart | |
| 8 | Tab B (without refresh): search the new item name in menu browser | Item visible in Tab B menu | |

### C. Regression checks (must remain unchanged)

| # | Flow | Expected | ✅ / ❌ |
|---|---|---|---|
| 9 | Place a normal (non-custom) order on a table | Order placed; table engages as before | |
| 10 | KOT status update for any item (cancel / served) | Order Entry reflects status change as before | |
| 11 | Polling — leave Dashboard open for 60+ seconds | Polling refresh logs as before, no errors | |
| 12 | Audit Report side-sheet (BUG-117 sanity) | GST renders correctly (₹0 / pure GST), VAT correct | |

---

## Sign-off

> **Owner please reply "approved" (or describe any deviation observed).**

When approved, BUG-116 will be marked **CLOSED — OWNER VERIFIED** in `BUG_TRACKER.md` and `registry.json` (completeness 7/7).

---

## Artifacts

| # | Artifact | Path |
|---|----------|------|
| 1 | Intake (corrected scope) | `/app/memory/memory/bugs/BUG_116_OUT_OF_KITCHEN_SOCKET_REALTIME_INTAKE.md` |
| 2 | Impact Analysis | `/app/memory/memory/bugs/BUG_116_IMPACT_ANALYSIS.md` |
| 3 | Implementation Plan | `/app/memory/memory/bugs/BUG_116_IMPLEMENTATION_PLAN.md` |
| 4 | Code Gate | `/app/memory/memory/bugs/BUG_116_CODE_GATE.md` |
| 5 | Implementation Summary | `/app/memory/memory/bugs/BUG_116_IMPLEMENTATION_SUMMARY.md` |
| 6 | Owner Smoke Sign-off | `/app/memory/memory/bugs/BUG_116_OWNER_SMOKE_SIGNOFF.md` (this file) |
