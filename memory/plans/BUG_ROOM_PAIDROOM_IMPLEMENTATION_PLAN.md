# BUG-ROOM-PAIDROOM — Gate 3: Implementation Plan

**ID:** BUG-ROOM-PAIDROOM
**Gate:** 3 — Implementation Plan
**Date:** 2026-07-07
**Depends on:** `BUG_ROOM_PAIDROOM_IMPACT_ANALYSIS.md`
**Risk:** MEDIUM
**Priority:** P1
**Fast Lane:** NO

---

## SCOPE LOCK

### Files WILL change
1. `api/transforms/orderTransform.js` — 1 line change (L1632)

### Files WILL NOT touch
- `OrderEntry.jsx` — `effectiveTable.isRoom` already set correctly, no change needed
- `CollectPaymentPanel.jsx` — no change
- `fromAPI.order()` normalization — `isRoom` already set correctly, no change needed
- Any other file

---

## EXECUTION — 1 exact edit

---

### Edit 1 — `collectBillExisting` payload builder Line 1632

**File:** `/app/frontend/src/api/transforms/orderTransform.js`

**Verify before editing — line 1632 must read:**
```js
      paid_room:                    '',
```

**Change to:**
```js
      paid_room:                    table?.isRoom ? 'yes' : '',
```

**Context (lines 1629–1636 for search_replace precision):**
```js
// BEFORE:
      // Room & Misc
      paid_room:                    '',
      usage_id:                     '',

// AFTER:
      // Room & Misc  // BUG-ROOM-PAIDROOM fix
      paid_room:                    table?.isRoom ? 'yes' : '',
      usage_id:                     '',
```

**Why `table?.isRoom`:** `table` is the first parameter of `collectBillExisting(table, ...)`. It receives `effectiveTable` from both call sites (`OrderEntry.jsx` L1444 and L2112). `effectiveTable.isRoom` is set by `fromAPI.order()` normalization at L210 of the same file — it is guaranteed to be a boolean on any normalized order object. The `?.` optional chain is a safety guard for any edge case where table is null/undefined.

**`room_id` NOT added:** Owner confirmed 2026-07-07 — backend resolves room from `order_id`. Do not add `room_id` to this payload.

---

## RISK REGISTER

| # | Risk | Mitigation |
|---|---|---|
| R1 | `table` is null/undefined | `table?.isRoom` optional chain returns `undefined` → `''` (falsy path) — safe |
| R2 | Non-room orders get `paid_room: 'yes'` accidentally | `table.isRoom = false` for all non-room orders → `''` ✅ |
| R3 | `isRoom` not set on effectiveTable | `fromAPI.order()` sets it unconditionally at L210 — guaranteed present for all orders fetched from API |
| R4 | Hotspot file regression | No other lines touched; change is a single conditional on an existing field |

---

## VERIFICATION MATRIX

| # | Test | Expected | How |
|---|---|---|---|
| 1 | Webpack compile | 0 new errors/warnings | Auto — check frontend logs |
| 2 | Room order → Collect Bill | `paid_room: "yes"` in BILL_PAYMENT payload | Browser DevTools Network tab |
| 3 | Non-room order → Collect Bill | `paid_room: ""` in BILL_PAYMENT payload (unchanged) | DevTools Network tab |
| 4 | QSR room order → placed-edge collect | `paid_room: "yes"` in BILL_PAYMENT payload | DevTools Network tab |
| 5 | Room booking closes correctly on backend | Room status updated after checkout | Visual verify on preprod room management screen |

**Total: 5 checks (1 automated, 4 DevTools/visual)**

---

## POST-CODE REGISTRY CHECKLIST

```
- [ ] Add code comment on edited line: // BUG-ROOM-PAIDROOM fix
- [ ] BUG_TRACKER.md: BUG-ROOM-PAIDROOM → status: IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: orderTransform.js — add BUG-ROOM-PAIDROOM to last-modified
- [ ] Compile check: 0 new webpack warnings/errors
```

---

## COMBINATION NOTE

**BUG-VQTY is in the same file (`orderTransform.js` L703, L1492).**
Fix both bugs in the same session:
1. BUG-VQTY Edit 1 — L703
2. BUG-VQTY Edit 2 — L1492
3. BUG-ROOM-PAIDROOM Edit 1 — L1632 (this file)
4. Single compile check covers all 3 edits

---

```
Gate 3 complete: BUG-ROOM-PAIDROOM
Files WILL change: 1 (orderTransform.js)
Lines to change: 1 (L1632)
Risk: MEDIUM — hotspot file, payment field; single conditional on an existing boolean
All owner decisions: N/A — purely technical fix (room_id NOT needed — owner confirmed)
Combination: Fix alongside BUG-VQTY (same file, same session)

STATUS: GATE 4 GO — ready for BUG FIX agent
```
