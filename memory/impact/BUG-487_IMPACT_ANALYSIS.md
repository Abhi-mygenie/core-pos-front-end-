# BUG-487 — Impact Analysis

**ID:** BUG-487
**Gate:** 2 — IMPACT ANALYSIS
**Date:** 2026-10-05
**Risk:** HIGH
**Code Reality:** NONE (fix not applied)
**Conflict pre-check:** CLEAN — orderTransform.js last touched by BUG-484 + CR-405-B (both GATE_5B_QA_PASSED)

---

## 1. Data Flow

```
API (employee-orders-list V1/V2, get-single-order-new)
  → response.orders[].room_info{}
  → orderTransform.js transformOrder() roomInfo{} block (line 391–448)
  → roomInfo.discountAmount  (camelCase FE field)
  → roomInfo.discountReason
  → roomInfo.roomDiscountAt       ← NOT MAPPED
  → roomInfo.roomDiscountDetail   ← NOT MAPPED
  → roomInfo.roomDiscountType     ← NOT MAPPED
  → consumers:
      RoomRowCard.jsx:398          ri.discountAmount
      RoomOrdersReportPage.jsx:554 ri.discountAmount
      RoomOrdersMockup.jsx:71      ri.discountAmount
      (orderTransform roomPaymentSummary.payments[] unaffected — different field)
```

## 2. Affected Files

| File | Lines | Change type | Risk |
|------|-------|-------------|------|
| `api/transforms/orderTransform.js` | 413–415 | Rename 2 keys + add 3 new fields | HIGH (R5 hotspot) |
| `api/services/roomOrdersService.js` | 42 | Same rename + add 3 new fields in `parseRoomInfo()` | HIGH |
| `RoomRowCard.jsx` | 398 | No change — auto-corrects after transform fix | — |
| `RoomOrdersReportPage.jsx` | 554 | No change — auto-corrects | — |
| `RoomOrdersMockup.jsx` | 71 | No change — auto-corrects | — |

**Amendment note:** `roomOrdersService.js` contains a parallel `parseRoomInfo()` function (lines 26–48, comment: "Mirrors orderTransform.js:373-407") that reads the same raw `room_info` object. It was missed in the initial plan. Both files read from the **raw API response** — neither is reading from the camelCase-transformed object. Both need the same fix.

## 3. Risk Classification

**HIGH — read path only.** No write payload affected. No formula change. Pure key rename. All financial calculations remain unchanged. Discount display was always ₹0; after fix it reflects the real applied discount — cosmetic correction only.

New fields (`roomDiscountAt`, `roomDiscountDetail`, `roomDiscountType`) are **out of scope** for this bug — they belong to CR-407. BUG-487 touches only the 2 wrong key names.

## 4. Downstream impact

| Consumer | Current behaviour | After fix |
|----------|-------------------|-----------|
| `RoomRowCard` Discount column | Always ₹0 | Shows real `room_discount_amount` |
| `RoomOrdersReportPage` Discount column | Always ₹0 | Shows real `room_discount_amount` |
| `RoomOrdersMockup` Discount column | Always ₹0 | Shows real `room_discount_amount` |

Note: `roomDiscountAt`, `roomDiscountDetail`, `roomDiscountType` are NOT added here — that is CR-407 scope.

## 5. Owner decisions needed

None — all fields are read-only additive. No business logic change. Safe to implement immediately.
