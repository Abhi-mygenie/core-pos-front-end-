# BUG-487 — orderTransform roomInfo reads wrong key: discount_amount → room_discount_amount

**ID:** BUG-487
**Type:** BUG
**Date:** 2026-10-05
**Registered by:** Investigation agent (session 2026-10-05)
**Status:** GATE_1_INTAKE — UNBLOCKED (backend now ships the correct field)
**Sprint:** oct_bug_batch
**Risk:** HIGH
**Severity:** P2

---

## Description

The `orderTransform.js` `roomInfo` parser (line 414) reads `api.room_info.discount_amount` and `api.room_info.discount_reason` for the room discount display. These keys do **not exist** in the backend response — the backend sends `room_discount_amount` and `room_discount_reason` (with the `room_` prefix).

Result: `roomInfo.discountAmount` is always **₹0** and `roomInfo.discountReason` is always **null** on every room order, even when a discount has been applied. Room reports and room cards show ₹0 discount despite real discounts having been applied.

Additionally, new fields introduced in handover_5 (`room_discount_at`, `room_discount_detail`, `room_discount_type`) are not mapped at all.

---

## Duplicate Check

- Code comment at line 413 says `"BE-2 §4.1 (still pending backend) — keep null fallbacks until BE ships explicit discount fields"` — this was a pending note, not a registered bug
- Registry search: "discount_amount key", "room_discount_amount", "wrong key mismatch" — no existing BUG
- **Duplicate check: DISTINCT** (was a code note; now that backend has shipped the fields, this is a real bug)

---

## Code Reality

**NONE** — fix not applied.

Current code (`orderTransform.js:414–415`):
```javascript
discountAmount: parseFloat(api.room_info.discount_amount) || 0,   // ← WRONG KEY
discountReason: api.room_info.discount_reason || null,             // ← WRONG KEY
```

Backend sends (confirmed by curl probe on settled order 1232912):
```json
"room_discount_amount": 250.00,
"room_discount_reason": "Test probe",
"room_discount_at": "both",
"room_discount_detail": {"check_in": {...}, "check_out": {...}}
```

Both `get-single-order-new` and `employee-orders-list` (V1 + V2) now return these fields.
The code comment "still pending backend" is now stale — backend has shipped.

**Code Reality: NONE** (fix not applied)

---

## Severity

**P2 — MEDIUM**
- `discountAmount` display is always ₹0 on room order cards, folio, and reports
- No financial impact — discount is correctly applied by the backend (UID balance is correct)
- Visual/display discrepancy only: the discount column/line shows ₹0 instead of the real value
- No workaround (users see wrong value)

---

## Risk Classification

**HIGH** — affects room billing display; part of a financial flow; 4 consumers of `roomInfo.discountAmount`
- `orderTransform.js` is an R5 hotspot file
- All changes are reads only (no write path affected)
- No formula change — just fixing key names and adding new mappings

---

## Evidence

- Curl probe (2026-10-05): `get-single-order-new` for order 1232912 → `room_discount_amount: 250.00` in response but FE reads `discount_amount` (non-existent → 0)
- Curl probe: both V1 and V2 `employee-orders-list` also return `room_discount_amount`
- Investigation report: `investigations/INV_ROOM_DISCOUNT_CHECKIN_CHECKOUT_PARTIAL_2026_10_05.md` §3C
- Code location: `orderTransform.js:414–415`
- Confidence: CONFIRMED (agent curl-verified)

---

## Blast Radius

| File | Usage | Impact |
|------|-------|--------|
| `orderTransform.js:414–415` | Source of `roomInfo.discountAmount` / `roomInfo.discountReason` | Fix key names; add `roomDiscountAt`, `roomDiscountDetail`, `roomDiscountType` |
| `RoomRowCard.jsx:398` | `ri.discountAmount` | Reads transformed field — auto-corrects after fix |
| `RoomOrdersReportPage.jsx:554` | `ri.discountAmount` | Reads transformed field — auto-corrects after fix |
| `RoomOrdersMockup.jsx:71` | `ri.discountAmount` | Reads transformed field — auto-corrects after fix |

- 1 source file (`orderTransform.js` R5), 3 display consumers auto-fix
- **Blast radius: SMALL (1 edit in 1 file, 3 consumers get fix for free)**

---

## Fix Sketch (for Planning)

In `orderTransform.js` lines 414–415, change:
```javascript
// BEFORE
discountAmount: parseFloat(api.room_info.discount_amount) || 0,
discountReason: api.room_info.discount_reason || null,

// AFTER
discountAmount:    parseFloat(api.room_info.room_discount_amount) || 0,
discountReason:    api.room_info.room_discount_reason || null,
// NEW
roomDiscountAt:    api.room_info.room_discount_at || null,
roomDiscountDetail: api.room_info.room_discount_detail || null,
roomDiscountType:  api.room_info.room_discount_type || null,
```

---

## Next

Planning Gate 2 → Implementation (1 file, FAST LANE candidate with owner approval — ≤ 10 lines, 1 R5 file)
