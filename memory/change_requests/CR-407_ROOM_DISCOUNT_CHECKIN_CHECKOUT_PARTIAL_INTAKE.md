# CR-407 — Room Discount (Check-In + Checkout: apply_to + Partial Room Payment)

**ID:** CR-407
**Type:** CR (Change Request — new feature)
**Date:** 2026-10-05
**Registered by:** Investigation agent (session 2026-10-05)
**Status:** GATE_1_INTAKE
**Sprint:** oct_cr_batch
**Risk:** CRITICAL
**Severity:** P1

---

## Description

Implement room discount capability across the full room billing lifecycle per handover_5.md contract:

1. **Check-in discount** — bake a room discount (₹ or %) at guest check-in; BE reduces UID `balance_payment` immediately
2. **Checkout discount — `apply_to` selector** — expand FolioCheckoutPanel from current `apply_to='room'` only → support `room` / `food` / `both`; support `Percent` type in addition to `Amount`
3. **Checkout — `partial_payments_room`** — allow split room payment at checkout via multiple legs (e.g. cash ₹400 + UPI ₹300) using `partial_payments_room[]` array

---

## Duplicate Check

- Code reality grep — `room_discount_apply_to` + `partial_payments_room`: **7 hits** — all in `FolioCheckoutPanel.jsx` + its unit test (CR-405-A already did the `apply_to='room'` + Amount scope)
- Registry check: CR-405-A / CR-405-B covered shift V1 and apply_to=room only. No CR exists for check-in discount, apply_to=food/both, Percent type, or partial_payments_room.
- **Duplicate check: DISTINCT** (CR-405-A is related — partial prior implementation)
- Related: CR-405-A (apply_to=room done), CR-405-B (shift V1 done)

---

## Code Reality

**PARTIAL** — existing scope:

| Sub-scope | Status |
|-----------|--------|
| `apply_to='room'` + Amount at checkout (FolioCheckoutPanel) | ✅ DONE (CR-405-A) |
| V1 shift URL + builder (order-shifted-room) | ✅ DONE (CR-405-B) |
| `paid_room='yes'` in collectBillExisting | ✅ DONE |
| F&B-only payment_amount/grant_amount/order_amount | ✅ DONE (BUG-484) |
| Check-in discount (CheckInPage + roomService) | ❌ NOT STARTED |
| `apply_to='food'` / `apply_to='both'` (FolioCheckoutPanel) | ❌ NOT STARTED |
| `Percent` discount type (FolioCheckoutPanel) | ❌ NOT STARTED |
| `partial_payments_room` array (FolioCheckoutPanel) | ❌ NOT STARTED |

**Code Reality: PARTIAL** — plan only the REMAINING scope above.

---

## Severity

**P1 — HIGH**
- Feature partially implemented (CR-405-A gave room-only Amount) but 60% of the spec (check-in, food/both, Percent, partial_payments_room) is absent
- Cashiers cannot apply check-in discounts or split room payments at checkout
- No workaround for the missing scope

---

## Risk Classification

**CRITICAL** — money
- Check-in discount directly cuts UID `balance_payment` at check-in
- Checkout `apply_to='food'/'both'` routes discount to F&B or both buckets (financial)
- `partial_payments_room` creates multiple checkout ledger rows in `restaurant_room_payments`
- All paths touch settlement — requires full gate flow + owner approval + E2E regression

---

## Evidence

- Source: handover_5.md (owner-provided contract doc) + investigation session 2026-10-05
- Investigation report: `investigations/INV_ROOM_DISCOUNT_CHECKIN_CHECKOUT_PARTIAL_2026_10_05.md`
- Curl probes: P-9 (422 validation ✅), RE-2 (HTTP 200 all additive keys ✅), post-settle read-back confirmed
- Backend validation live: `room_discount > 0` without `apply_to` → 422; `apply_to=room/both` without `room_discount` → 422
- Confidence: CONFIRMED (agent curl-verified on preprod, all keys additive)

---

## Blast Radius

| File | Scope |
|------|-------|
| `CheckInPage.jsx` | New UI state + pass discount fields to pmsCheckIn() |
| `roomService.js` | Append 4 new multipart fields: room_discount, room_discount_type, room_discount_value, room_discount_reason |
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | Add apply_to selector, Percent type, partial_payments_room split UI |
| `orderTransform.js` | No change to collectBillExisting needed — all new keys are additive |

- ~4 files, hotspot: `FolioCheckoutPanel.jsx` (R5), `orderTransform.js` (R5/financial)
- Estimated scope: MEDIUM (3–5 files)
- **Blast radius: MEDIUM**

---

## Owner Decisions (Locked 2026-10-05)

| OD | Decision | Detail |
|----|----------|--------|
| OD-407-01 | **% toggle YES — FE-side compute** | UI shows Amount / Percent toggle. When % selected, FE computes `room_discount = room_price × (pct/100)` before sending. BE always receives ₹. No new BE field required. |
| OD-407-02 | **Both = separate F&B fields + room_discount field** | `apply_to='both'`: food half goes into existing F&B discount fields (`order_discount`, `self_discount`, etc.); room half goes in `room_discount` + `room_discount_apply_to: "both"`. UI collects two inputs: food discount ₹ (existing F&B section) + room discount ₹ (room section). |
| OD-407-03 | **Alongside — F&B partial unchanged** | F&B split UI untouched. Add a separate room-rent split section that posts `partial_payments_room[]` when staff chooses to split the room due across payment modes. |

---

## Next

Planning Gate 2 — Impact Analysis locked. Awaiting Gate 2 GO.
