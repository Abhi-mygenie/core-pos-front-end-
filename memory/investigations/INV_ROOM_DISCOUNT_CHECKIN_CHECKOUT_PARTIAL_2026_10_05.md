# INVESTIGATION REPORT (v2 — CORRECTED) — Room Discount + Partial Room Payment

**Date:** 2026-10-05 (corrected after re-probe with full FE-shaped payload)
**Role:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7 §ROLE 6)
**Scope:** Room discount at check-in and checkout (room / F&B / both), partial payment for room rent
**Reference:** handover_5.md
**Method:** 10 curl probes + static code trace. NO code changes.

**CORRECTION NOTE (v1 → v2):**
The v1 report incorrectly flagged a P0 backend blocker (HTTP 500). The 500 was caused by a stripped probe that omitted the standard discount keys (`self_discount`, `order_discount`, etc.) that `collectBillExisting` **always** sends. When the full FE-shaped payload is sent, the endpoint returns **HTTP 200** correctly. The backend blocker is **RETRACTED**. Backend brief BACKEND_BRIEF_ROOM_DISCOUNT_CONSTRAINT_2026_10_05.md is void.

---

## 1. What exists today — existing state per flow

### Flow A: POS checkout (OrderEntry → CollectPaymentPanel → collectBillExisting)

| Key | Sent today | Source |
|-----|-----------|--------|
| `paid_room: "yes"` | ✅ Yes | `orderTransform.js:1719` |
| `payment_amount` = F&B only | ✅ Yes | BUG-484 (`fbOnlyTotal`) |
| `grant_amount` = F&B only | ✅ Yes | BUG-484 |
| `order_amount` = F&B only (when roomBalance > 0) | ✅ Yes | BUG-484 |
| `partial_payments` F&B split legs | ✅ Yes | `orderTransform.js` (CR-021) |
| `self_discount`, `order_discount`, `comm_discount`, `discount_value` | ✅ Yes (always 0 for no-discount case) | `collectBillExisting` |
| `room_discount` | ❌ Not sent | Gap |
| `room_discount_apply_to` | ❌ Not sent | Gap |
| `partial_payments_room` | ❌ Not sent | Gap |

OrderEntry has NO `roomDiscount` state or UI. Room discount is not reachable from the POS checkout path.

### Flow B: FrontDesk checkout (FolioCheckoutPanel → handlePaid → collectBillExisting)

`FolioCheckoutPanel.jsx` (CR-385 M6 / CR-405-A) **already implements partial checkout discount:**

| Key | Sent today | Source |
|-----|-----------|--------|
| `paid_room: "yes"` | ✅ Yes | via `collectBillExisting` |
| `room_discount` | ✅ Yes (when > 0) | `FolioCheckoutPanel.jsx:147` |
| `room_discount_apply_to: "room"` | ✅ Yes (hardcoded) | `FolioCheckoutPanel.jsx:148` |
| `room_discount_type: "Amount"` | ✅ Yes (hardcoded) | `FolioCheckoutPanel.jsx:149` |
| `room_discount_value` | ✅ Yes | `FolioCheckoutPanel.jsx:150` |
| `room_discount_reason` | ✅ Yes | `FolioCheckoutPanel.jsx:151` |
| `room_discount_apply_to: "food"` | ❌ Not available | Gap — only "room" hardcoded |
| `room_discount_apply_to: "both"` | ❌ Not available | Gap — only "room" hardcoded |
| `room_discount_type: "Percent"` | ❌ Not available | Gap — only "Amount" hardcoded |
| `partial_payments_room` | ❌ Not sent | Gap |

The FrontDesk checkout UI (`RoomSection` component) has:
- `roomDiscount` input (₹ amount only)
- `roomDiscountReason` input
- No apply_to selector (defaults to "room" only)
- No Percent/Amount toggle
- No partial room payment split

### Flow C: Check-in (CheckInPage → pmsCheckIn → roomService.checkIn)

| Key | Sent today | Source |
|-----|-----------|--------|
| `room_price`, `order_amount`, `advance_payment`, `balance_payment` | ✅ Yes | `roomService.js:108–111` |
| `payment_method` (advance tender) | ✅ Yes | BUG-027 |
| `gst_tax` | ✅ Yes | BUG-410 |
| `room_discount` | ❌ Not sent | Gap |
| `room_discount_type` | ❌ Not sent | Gap |
| `room_discount_value` | ❌ Not sent | Gap |
| `room_discount_reason` | ❌ Not sent | Gap |

CheckInPage has no discount state or UI. No discount fields in `pmsCheckIn()` call.

### Flow D: Shift F&B (order-shifted-room)

| Item | Status |
|------|--------|
| URL — `/api/v1/vendoremployee/order/order-shifted-room` | ✅ Already V1 in constants.js |
| Payload — `source_order_id + target_order_id + transfer_note` | ✅ Already V1 contract in `transferToRoom` |
| Same-source=target → 400 | ✅ Confirmed (probe P-12) |

No gaps in shift flow.

---

## 2. Backend contract verification (curl probes)

### Validation rules — all confirmed live

| Rule (handover_5 §5) | HTTP | Confirmed |
|----------------------|------|-----------|
| `room_discount > 0`, no `apply_to` | 422 `room_discount_apply_to must be room or both when room_discount > 0` | ✅ P-9 |
| `apply_to=room`, `room_discount ≤ 0` | 422 `room_discount is required when room_discount_apply_to is room or both` | ✅ P-10 |
| Shift same source=target | 400 `Source and Target order are the same` | ✅ P-12 |

### Full additive settle — confirmed live

**Probe RE-2** (order 1232912, full FE payload + all new additive keys):
```json
room_discount: 50, room_discount_apply_to: "room", room_discount_type: "Amount",
room_discount_value: 50, room_discount_reason: "Test probe",
partial_payments_room: [{payment_mode:"cash",payment_amount:400},{payment_mode:"upi",payment_amount:300}]
```
→ **HTTP 200** · `"Room payment received via partial"` ✅

**Post-settle read-back confirmed in V2 employee-orders-list `room_info`:**
- `room_discount_amount: 250` (check-in 200 + checkout 50) ✅
- `room_discount_at: both` ✅
- `room_discount_detail: {check_in:{...}, check_out:{...}}` ✅
- `balance_payment_mode: partial` ✅
- `receive_balance: 700` ✅
- `room_payment_summary.payments[]: [{type:advance,...},{type:checkout,mode:cash,400},{type:checkout,mode:upi,300}]` ✅

---

## 3. Read-back gap analysis

### 3A. What V2/V1 employee-orders-list returns in room_info

✅ All new fields are present in the LIST response:
`room_discount_amount`, `room_discount_type`, `room_discount_reason`, `room_discount_at`, `room_discount_detail`, `room_payment_summary.payments[]`

`orders[].room_discount` JSON: `{"apply_to": "room"}` is populated ✅

### 3B. What get-single-order-new returns in room_info

❌ **room_info only returns 3 keys:** `room_price`, `advance_payment`, `balance_payment`
New discount fields (`room_discount_amount`, etc.) are absent — **backend gap in this endpoint** (not a FE issue)

### 3C. FE orderTransform roomInfo parser (line 391–438)

**Key mismatch (pre-existing, noted in code as "still pending backend"):**

| FE reads | Backend sends | Impact |
|----------|---------------|--------|
| `api.room_info.discount_amount` | `room_discount_amount` | `roomInfo.discountAmount` is always 0 |
| `api.room_info.discount_reason` | `room_discount_reason` | `roomInfo.discountReason` is always null |

**Missing mappings (new fields from handover_5 §7):**
- `room_discount_at` → not mapped → no camelCase equivalent in roomInfo
- `room_discount_detail` → not mapped
- `room_discount_type` → not mapped

**Already mapped (correct):**
- `balance_payment_mode` → `balancePaymentMode` ✅
- `room_payment_summary.payments[]` → `roomPaymentSummary.payments[]` ✅ (these ARE written correctly)

**Consumer impact:**
- `RoomRowCard.jsx:398` — reads `ri.discountAmount` → always 0 → discount column never shows ✅ (they had a derived fallback before; now has real data but wrong key)
- `RoomOrdersReportPage.jsx:554` — same
- `OrderDetailSheet.jsx:817` — same

---

## 4. Gap map — what still needs to be built

### 4A. Check-in discount — FULLY MISSING (all 3 layers)

| Layer | File | Gap |
|-------|------|-----|
| UI | `CheckInPage.jsx` | No discount input (₹/% toggle, reason field) |
| State | `CheckInPage.jsx` | No `roomDiscount`, `roomDiscountType`, `roomDiscountValue`, `roomDiscountReason` state |
| Payload | `roomService.js:checkIn()` | `room_discount`, `room_discount_type`, `room_discount_value`, `room_discount_reason` not appended to FormData |

### 4B. Checkout discount — PARTIALLY IMPLEMENTED, gaps remain

**Already done (FolioCheckoutPanel, CR-405-A):** `apply_to="room"` + Amount type ✅

**Remaining gaps in FolioCheckoutPanel:**
| Gap | Detail |
|-----|--------|
| `apply_to="food"` | UI has no option; only room hardcoded |
| `apply_to="both"` | UI has no option |
| `Percent` type | Only ₹ Amount input; no % input + conversion |
| `partial_payments_room` | No split UI for room payment |

**POS checkout path (OrderEntry/CollectPaymentPanel):** No room discount support at all (separate FE path — may be out of scope if POS room settle always goes via FrontDesk)

### 4C. Read-back transform — fix key mismatch + add new fields

| File | Change needed |
|------|---------------|
| `orderTransform.js` line 414 | `discount_amount` → `room_discount_amount` |
| `orderTransform.js` line 415 | `discount_reason` → `room_discount_reason` |
| `orderTransform.js` roomInfo parser | Add: `roomDiscountAt`, `roomDiscountDetail`, `roomDiscountType` |

### 4D. No work needed

| Item | Status |
|------|--------|
| `ORDER_SHIFTED_ROOM` URL (V1) | ✅ Already correct |
| `transferToRoom` builder | ✅ Already V1 |
| `paid_room: "yes"` | ✅ Already in collectBillExisting |
| F&B-only payment_amount / grant_amount / order_amount | ✅ Already done (BUG-484) |
| F&B `partial_payments` array | ✅ Already in collectBillExisting |
| Checkout `room_discount` + `apply_to="room"` + Amount type | ✅ Done in FolioCheckoutPanel (CR-405-A) |

---

## 5. Backend gaps (not FE issues — for backend brief)

| Gap | Detail | Impact |
|-----|--------|--------|
| `get-single-order-new` missing new room_info fields | `room_discount_amount`, `room_discount_at` etc. not in response | FE can't show live discount on order detail view |
| `apply_to="food"` path + `restaurant_discount_amount` | When `apply_to=food` is sent, backend sets `restaurant_discount_amount=0` but the orders_table `room_discount` JSON is also `null` (not `{apply_to:"food"}`) on settled orders | Folio display won't show food-only discount correctly |

---

## 6. Risk classification

| Scope | Risk |
|-------|------|
| Check-in room discount (CheckInPage + roomService) | CRITICAL (cuts UID balance_payment at check-in) |
| Checkout apply_to="food"/"both" + Percent type (FolioCheckoutPanel) | CRITICAL (financial, additive to existing) |
| `partial_payments_room` in FolioCheckoutPanel | CRITICAL (multi-leg room payment) |
| Read-back key mismatch fix (orderTransform) | HIGH (display: discount column always 0 today) |

---

## 7. Summary

**What works today (no new keys needed):** The full FE `collectBillExisting` payload (with existing discount fields at 0, `paid_room="yes"`) settles a room order correctly at HTTP 200. All new keys are **truly additive** — they can be bolted on to the existing payload without changing any existing field.

**What partially works:** FolioCheckoutPanel already sends room discount at checkout for `apply_to="room"` + Amount type. This is live and verified.

**What is missing:**
1. Check-in discount UI + payload (all 3 layers, fully absent)
2. `apply_to="food"/"both"` and `Percent` type in FolioCheckoutPanel
3. `partial_payments_room` in FolioCheckoutPanel
4. Read-back transform: wrong key names for discount fields

**Backend RETRACTED:** No blocker. The 500 in v1 report was a probe artifact.

**Backend ask (non-blocking):** `get-single-order-new` should return the new `room_discount_*` fields in `room_info` (currently only the list endpoint does).

---

**Files:** `INV_ROOM_DISCOUNT_CHECKIN_CHECKOUT_PARTIAL_2026_10_05.md` (this file, v2)
**Backend brief void:** BACKEND_BRIEF_ROOM_DISCOUNT_CONSTRAINT_2026_10_05.md — RETRACTED
**Next:** Intake registration → Planning Gate 2 → Owner Gate 4 GO
