# BUG-424 — Folio Page Missing "Room Orders" Section

**ID:** BUG-424
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (investigation session 2026-09-16 + screenshots)
**Confidence:** CONFIRMED (code-traced)

---

## Description

The Guest Folio page (`/pms/folio/:id`) LHS shows only "F&B Posted to Room" which contains **transferred orders only** (orders moved from another table to the room). Orders placed **directly at the room's own table** (room-native orders) are **not shown anywhere on the folio**.

Owner confirmed: the folio should have a dedicated **"Room Orders" section** showing all food/beverage items ordered inside the room, with item-level detail.

---

## Expected Design (owner confirmed)

New card on LHS (below "F&B Posted to Room"):

| Column | Example |
|--------|---------|
| Item name | jeera rice |
| Quantity | x1 |
| Rate | ₹100 |
| GST (SGST/CGST if applicable) | ₹3.50 / ₹3.50 |
| Amount | ₹107 |
| Date | 16 Sept 2026 |
| **Room Orders Total** | ₹107 |

**Row click:** expand inline to show full item breakdown (owner confirmed — no navigation).

**GST display:** Item-level GST shows if configured on the item. If item has no GST, shows ₹0.00. This is correct behaviour per owner: "on item if GST is applicable it will come."

**Reference:** Dashboard checkout (old module) correctly shows this data under "ROOM ORDERS" section. Same data, different screen.

---

## Classification

- **Type:** BUG (missing section — data exists in API, not displayed)
- **Severity:** P1 — HIGH (staff cannot see in-room F&B on the folio; billing is incomplete without it)
- **Risk:** MEDIUM (display only, no financial write; new section + transform change)
- **Duplicate check:** DISTINCT — no prior item for room-native orders on folio
- **Related:** CR-364 (IMPLEMENTED — created folio page), BUG-423 (folio balance), investigation 2026-09-16
- **Fast Lane:** NOT eligible (new section + transform change)

---

## Evidence

- Screenshot: Screen 1 (2026-09-16) — folio LHS shows only #000065 (transferred), room-native order absent
- Screenshot: Screen 3 (2026-09-16) — dashboard checkout shows "ROOM ORDERS" section correctly
- Source: OWNER-REPORTED + AGENT-DISCOVERED | Confidence: CONFIRMED
- Investigation doc: `/app/memory/investigations/INVESTIGATION_2026_09_16_FOLIO_CHECKOUT_GAPS.md`

---

## Code Reality

**NONE** — no room-native orders section exists anywhere in `GuestFolioPage.jsx`. `folioTransform.fromAPI` maps `raw.associated_order_list` (transferred orders) but does NOT map `raw.items[]` (room-native food items).

Grep confirms: zero hits for `raw.items`, `roomOrders`, or `cartItems` in either file.

---

## Blast Radius

- `src/api/transforms/folioTransform.js` — add `roomOrders` mapping from `raw.items[]` (filter out check-in marker)
- `src/pages/pms/GuestFolioPage.jsx` — add new Card section on LHS
- Estimated scope: SMALL (2 files, ~40–60 lines new)
- Hotspot files: NONE (folioTransform and GuestFolioPage are not in R5 list)

---

## Owner Decisions

| ID | Question | Status |
|----|----------|--------|
| OD-424-01 | Row click = expand inline (no navigation) | ✅ CONFIRMED |
| OD-424-02 | GST shows if item-level configured, ₹0.00 if not | ✅ CONFIRMED |

---

## Next

Gate 2 — Impact Analysis (Planning role)
