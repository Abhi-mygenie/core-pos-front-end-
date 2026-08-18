# BUG-338 — Room GST Applied When roomGstApplicable = false

**Type:** Bug
**ID:** BUG-338
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)
**Source Investigation:** INV-GST-001

---

## Description

When "Room GST Applicable" is set to OFF in Restaurant Settings (Room Settings section), GST is still calculated and applied on room orders. The `roomGstApplicable` flag exists in both the settings API and the profile transform, but **nothing in the order flow checks this flag before computing tax on room orders**.

Room billing is treated identically to dine-in for tax purposes — room orders carry the same per-item GST rates regardless of the `roomGstApplicable` setting.

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Room Module → Order Entry → CollectPaymentPanel (room order tax) |
| Priority | P1 |
| Severity | HIGH — incorrect tax applied on room bills; financial compliance issue for hotels/resorts |
| Risk | HIGH (billing, tax, room settlement — financial) |
| Fast Lane | NO — financial logic; full gate process mandatory |

## Evidence

- Source: OWNER-REPORTED (via INV-GST-001 audit)
- Steps to reproduce:
  1. Restaurant Settings → Room Settings → "Room GST Applicable" → OFF → Save
  2. Check in a guest to a room, add food items
  3. Go to Collect Bill on the room order
  4. GST (SGST + CGST) still shown and applied to food items in room order
- Confidence: CONFIRMED (code trace)

## Code Reality

```bash
# roomGstApplicable — where it lives:
  profileTransform.js line 240:
    roomGstApplicable: toBoolean(api.room_gst_applicable)
    → stored at restaurant.settings.roomGstApplicable

  restaurantSettingsTransform.js:
    fromAPI: roomGstApplicable: toBool(basic.room_gst_applicable)
    toAPI:   room_gst_applicable: toYesNo(s8.roomGstApplicable)

# roomGstApplicable — where it is checked:
  Only in:
    RestaurantSettingsPage.jsx (UI toggle)
    restaurantSettingsTransform.js (save/load)
  NOT in:
    CollectPaymentPanel.jsx ← ABSENT
    CartPanel.jsx ← ABSENT
    orderTransform.js ← ABSENT

# isRoom flag in CollectPaymentPanel:
  CollectPaymentPanel.jsx line 38: isRoom (prop, available)
  → already used for: roomBalance display, service charge gate (scApplicable)
  → NOT used for: tax gate
```

- **Code reality: FULL** — `roomGstApplicable` and `isRoom` both available in `CollectPaymentPanel`; gate simply missing

## Blast Radius

- Primary fix: `CollectPaymentPanel.jsx` — in `taxTotals` useMemo, add: `if (isRoom && !restaurant?.settings?.roomGstApplicable) return` (skip tax for room items)
- Estimated scope: SMALL (1 file, ~2-3 lines)
- Same location as BUG-336 fix — both bugs affect the same `taxTotals` useMemo block

## Expected Behavior

- When `isRoom === true` AND `roomGstApplicable === false`:
  - `taxTotals` returns `{ sgst: 0, cgst: 0, vat: 0 }`
  - Room bill shows no GST line
  - Room total = food items only (no tax)
- When `isRoom === true` AND `roomGstApplicable === true`: existing behavior unchanged
- Non-room orders: unaffected (gate is `isRoom` conditional)

## Dependency

- BUG-337 (profile staleness) should be fixed alongside so `roomGstApplicable` reflects the latest saved value
- BUG-336 (general GST gate) is related — both fix the same `taxTotals` block; recommend implementing in same PR

## Owner Decisions Needed

- None — fix is clear

## Duplicate Check

DISTINCT — no prior BUG for roomGstApplicable gate.
RELATED to BUG-336 (same code block, different gate condition).

---

**Next:** Planning Gate 2 — recommend batching BUG-336 + BUG-337 + BUG-338 in same sprint
