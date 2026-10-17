# CR-405 — Room Folio: Discount at Checkout & Check-in + Partial Room Payments + Shift Dine-in to Room

**ID:** CR-405
**Type:** CR
**Severity:** P2 / MEDIUM
**Risk:** HIGH (room billing, settlement, order flow — R6 applies at implementation)
**Status:** GATE_1_INTAKE
**Sprint:** oct_cr_batch
**Area:** Room / PMS Billing / POS Order Flow
**Registered:** 2026-10-01
**Source:** AGENT-DISCOVERED — backend handover_5.md (2026-10-01)
**Confidence:** CONFIRMED — all endpoints live on preprod, proof orders cited in handover §10

---

## Duplicate Check

- DISTINCT from **BUG-484** (payment_amount contract — registered same session, different concern)
- RELATED to **FU-385-D** (split settlement for room stays — PLANNED; `partial_payments_room` is the backend mechanism FU-385-D will need when it reaches Gate 2)
- RELATED to **OG-PMS-048** (OPEN — split payment gap in Front Desk Bill)
- RELATED to **BQ-385-07** (backend question about room-level discount at checkout — now answered by handover_5)
- RELATED to **CR-385 M6** (room discount control greyed out in Front Desk Bill — this CR provides the backend contract to unblock it)
- RELATED to **CR-163** (`order-shifted-room` constant already declared; this CR builds the UI)

---

## Scope — Four Sub-items (independently closable phases)

### A. Room Discount at Checkout (`room_discount_apply_to`)

**What backend shipped:**
- New keys on `order-bill-payment` (v1 or v2): `room_discount_apply_to` (`food`|`room`|`both`), `room_discount` (₹), `room_discount_type`, `room_discount_value`, `room_discount_reason`
- New 422 rules: `room_discount > 0` without `apply_to` → 422; `apply_to=room|both` without `room_discount > 0` → 422
- Semantics: `room` → cuts UID `balance_payment`; `food` → F&B discount only; `both` → FE splits and sends both halves

**FE today:** `room_discount_apply_to` = 0 hits in src/. Room discount control in Front Desk Bill is greyed out (CR-385 M6 D88 CSS rule).

**FE needs:**
- Ungreys room discount UI in `FolioCheckoutPanel.jsx` + `PmsCheckoutDrawer.jsx`
- Sends correct `room_discount` + `room_discount_apply_to` on settle
- Validates: `room_discount > 0` must have `apply_to`; prevent 422

**Read-back:** After settle, `orders[].room_discount` = `{apply_to: "room"|"food"|"both"}` and `room_info.room_discount_amount`, `room_discount_at`, `room_discount_detail`.

---

### B. Room Discount at Check-in (bake-in)

**What backend shipped:**
- `user-group-check-in` multipart now accepts: `room_discount` (₹, default 0/omit), `room_discount_type` (`Percent`|`Amount`), `room_discount_value` (audit input), `room_discount_reason` (optional)
- Backend clamps to balance, cuts UID `balance_payment`, writes `at=check_in`

**FE today:** `CheckInPage.jsx` sends no discount fields. `room_discount` = 0 hits in check-in path.

**FE needs:**
- Optional discount field in check-in form (₹ or %, converts % → ₹ before sending)
- Sends `room_discount` + type + value + reason in multipart FormData

---

### C. Partial Room Payments (`partial_payments_room`)

**What backend shipped:**
- New optional key `partial_payments_room` on `order-bill-payment`
- Array of legs: `[{payment_mode, payment_amount, transaction_id}]`
- Each positive leg → one `restaurant_room_payments` row + UID `balance_payment_mode=partial`
- Absent → single legacy checkout row (backward-compatible)
- Leg sum should = post-discount room due. Backend does NOT 422 on sum mismatch.
- Independent from `partial_payments` (F&B legs)

**FE today:** `partial_payments_room` = 0 hits in src/.

**FE needs:**
- Multi-leg room payment UI in `FolioCheckoutPanel.jsx` / `PmsCheckoutDrawer.jsx`
- Sends `partial_payments_room` array when more than one payment method used for room

**Note:** This is the backend mechanism for **FU-385-D**. When FU-385-D reaches Gate 2, this CR-405-C provides the contract.

---

### D. Shift Dine-in to Room (`order-shifted-room` UI)

**What backend shipped (previously live, now fully documented):**
- `POST /api/v1/vendoremployee/order/order-shifted-room`
- Moves active F&B lines from a dine-in/walk-in order (target) onto an open room order (source)
- Cancels target as Merge; source gets new items
- Does NOT change UID balance/room discount/room ledger
- Response: `{source_order_id, target_order_id, shifted_item_count}`
- After shift: settle on source with F&B-only `payment_amount` + `paid_room=yes`

**FE today:**
- `constants.js:96` → `ORDER_SHIFTED_ROOM: '/api/v2/vendoremployee/order/order-shifted-room'` (**version mismatch** — handover specifies v1)
- `orderTransform.js:1743` → comment stub only, no payload builder, no service call, no UI

**FE needs:**
- Fix version: `ORDER_SHIFTED_ROOM` → `/api/v1/…`
- `buildShiftRoomPayload(sourceOrderId, targetOrderId, transferNote)` in `orderTransform.js`
- `roomService.shiftOrderToRoom()` (or `orderService`) calling the endpoint
- UI trigger: button on room order card / Front Desk Bill to pull in dine-in items
- After shift: refresh source order, settle with F&B amounts only

---

## Code Reality Check

**Status: PARTIAL**

| Sub-item | Code reality |
|---|---|
| A — `room_discount_apply_to` | NONE (0 hits) |
| B — check-in discount | NONE (0 hits) |
| C — `partial_payments_room` | NONE (0 hits) |
| D — `order-shifted-room` | PARTIAL — constant declared (wrong version), transform comment stub only |

---

## Evidence

- **Handover doc:** `handover_5.md` (owner-provided, 2026-10-01) §3–§9
- **Preprod proof (per handover §10):**
  - A: Order 1232915 → `apply_to=room` + ₹100 → HTTP 200, UID -100, `at=check_out` ✅
  - A: Order 1232914 → bare ₹100 no apply_to → HTTP 422 ✅
  - A: Order 1232913 → no discount fields → 200, `receive_balance: 950` (no cut) ✅
  - C: Order 1232910 → `partial_payments_room` cash 570 + upi 380 → `balance_payment_mode=partial` ✅
- **FE code:** `constants.js:96`, `orderTransform.js:1743`
- **BQ-385-07** (backend brief master): "room-level discount at checkout (M6 control greyed)" — now answered
- **Screenshot:** not provided

---

## Blast Radius

Estimated scope: **LARGE**

| File | Sub-item | Notes |
|---|---|---|
| `CollectPaymentPanel.jsx` (R5) | A, C | Primary bill-pay panel |
| `FolioCheckoutPanel.jsx` | A, C | Front Desk Bill panel |
| `PmsCheckoutDrawer.jsx` | A, C | Legacy PMS checkout |
| `CheckInPage.jsx` | B | Check-in form |
| `orderTransform.js` (R5) | D | Fix version, add shift payload |
| `roomService.js` or `orderService.js` | D | shiftOrderToRoom() |
| NEW component (optional) | D | Shift UI trigger |

Hotspots touched: **YES** — CollectPaymentPanel + orderTransform on R5 list.

---

## Risk Classification

- **Risk: HIGH**
- Triggers: API contract, order flow, room billing, settlement
- Process required: Full gate flow (Gate 2 → 4 → 5 → 6)
- Fast Lane: **NOT eligible** (financial billing logic + hotspot files)
- Sub-item D (version fix in constants.js, 1 line) could be Fast Lane if owner approves separately

---

## Owner Decisions — ALL LOCKED 2026-10-01

| OD | Decision | Status |
|---|---|---|
| **OD-405-01** | Execution order: **A → B → D → C**. A=checkout discount (V2 bill-pay), B=shift dine-in (V1 URL), D=check-in bake+read-back, C=partial_payments_room. A must not block on B/C. | ✅ LOCKED |
| **OD-405-02** | **Existing greyed control** — ungreys the CR-385 M6 room discount widget; no new widget. | ✅ LOCKED |
| **OD-405-03** | **% input OK in UI; wire always sends ₹.** Optional `room_discount_type` / `room_discount_value` / `room_discount_reason` for audit. Flat-₹-only UI also acceptable. | ✅ LOCKED |
| **OD-405-04** | **C stays in CR-405**, sequenced last. Not deferred to FU-385-D. Backend shipped additive on V2. Planning agent to declare FU-385-D ownership at Gate 2 if needed. | ✅ LOCKED |
| **OD-405-05** | **Existing "To Room" button in Collect Payment panel** (screenshot `evidence/CR-405/OD_SCREENSHOT_COLLECT_PAYMENT_TO_ROOM_2026_10_01.md`). UI keeps as-is: To Room button → room chips → "Transfer ₹X to Room" CTA. Sub-item B = fix endpoint version + contract align only. | ✅ LOCKED |
| **OD-405-06** | **Fast Lane approved** — 1-line version fix `ORDER_SHIFTED_ROOM` `/api/v2/` → `/api/v1/` in `constants.js`. | ✅ LOCKED |

### Corrected Phase Labels (owner's execution naming)

| Phase | Owner label | Scope | Key files |
|---|---|---|---|
| 1 | **A** | Checkout room discount (`room_discount_apply_to`, V2 bill-pay) | FolioCheckoutPanel, PmsCheckoutDrawer, orderTransform |
| 2 | **B** | Shift dine-in to room — fix V1 URL + handover_5 §6 contract alignment | constants.js (Fast Lane) + orderTransform.js:1743 |
| 3 | **D** | Check-in discount bake + read-back | CheckInPage.jsx |
| 4 | **C** | `partial_payments_room` multi-leg room payment | FolioCheckoutPanel, CollectPaymentPanel |

---

## Severity Rubric

P2 — MEDIUM:
- All sub-items are additive (new capabilities the backend has shipped but FE hasn't wired)
- No current user-visible crash or data corruption (except BUG-484 which is separate)
- Operators cannot apply room discounts or split room payments until this CR is implemented

---

## Next Steps

Owner answers OD-405-01…06 → Gate 2 GO → Planning agent writes Impact Analysis
