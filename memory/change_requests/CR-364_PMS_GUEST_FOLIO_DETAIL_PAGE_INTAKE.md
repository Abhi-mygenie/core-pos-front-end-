# CR-364 — INTAKE
## PMS — Guest Folio Detail Page (per-stay itemised charges, payments, balance, checkout)

**ID:** CR-364
**Date:** 2026-09-04
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** AGENT-DISCOVERED (post-CR-358 enhancement list) — owner-selected 2026-09-04
**Related:** CR-358-P3 (`PmsCheckoutDrawer` — order fetch + CollectPaymentPanel host), CR-360 (In-House "View Bill" → currently `/reports/room-orders`), CR-358-P4 (tape popover "Folio" → currently `/reports/rooms`), CR-162 (`pos/room-payment` mid-stay payment), CR-163 (split room order), CR-357 (advance deduction rules — display must follow frozen OD-1..6), OG-PMS-002/003 (walk-in "—" fields, View Bill placeholder), BUG-360 (checkout stale balance)
**Type:** CR (new page)
**Scope decision (owner 2026-09-04):** FULL feature
**Locked constraint (CR-358 D3):** "Billing / folio — Unchanged — existing settlement module handles it." → CR-364 is a **read + navigate** surface; all money mutations go through existing `CollectPaymentPanel` (via `PmsCheckoutDrawer`) and existing `recordPartialPayment()`. **No new financial calculation in FE.**

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | PMS → In-House Guests (S6) / Departures (S10) / Tape Chart (S2) → new `/pms/folio/:orderId` |
| Priority | **P1** (owner-confirmed 2026-09-04) |
| Risk | **HIGH** — money *display* (room charge, advance, balance) + print; no logic change → not CRITICAL. Upgrades to CRITICAL if any FE-side total is computed |
| Sprint | pos_pms_1 |
| Fast Lane eligible | NO |
| Duplicate check | **RELATED** — CR-360 and CR-358-P4 shipped placeholder links (`/reports/room-orders`, `/reports/rooms`) explicitly marked "full folio later" (OG-PMS-003). DISTINCT from CR-011-ROOM (historic multi-order report) |
| Code reality | **PARTIAL** — data fetch + transform exist: `PmsCheckoutDrawer.jsx` L89–101 (`get-single-order-new` unwrap), `orderTransform.fromAPI.order` L391–405 (`roomInfo{roomPrice, advancePayment, balancePayment, receiveBalance, paymentStatus, balancePaymentMode, roomNo, checkInDate, checkOutDate}`), `associatedOrders` via `roomOrdersService`. No page, no route |
| Blast radius | MEDIUM — 2 NEW files + 3 link re-points (InHouseGuestsPage, DeparturesPage, ReservationsPage popover) + App.js route. Hotspots: NO |
| Backend blocked | **NO** for v1 totals; payment *history* list needs backend (optional) |

---

## Description

Staff need one screen per in-house (or departed) guest showing everything on the stay: room charge, nights, advance paid, mid-stay payments, F&B posted to the room, balance due — with **Check Out** and **Record Payment** actions, and a printable folio. Today "View Bill" jumps to a generic report where the order must be found manually.

### Expected behaviour — `/pms/folio/:orderId`
| Block | Content | Source (verified) |
|---|---|---|
| Header | guest name, phone (masked in logs), room no, channel badge, booking id, PAH/Prepaid badge, meal plan, nights, checkin/checkout, special requests | `getReservationOps().all` joined on `roomLines[].orderId` (BUG-378 pattern); walk-ins fall back to order `user{}` + `restaurantTable{}` |
| Room charges | "check in" line(s) = room charge, `room_info.room_price` | `get-single-order-new` → `orderDetails[]`, `room_info` |
| F&B / extras | associated orders (SRM) with amount + status | `associated_order_list[]` (single-order) or `getRoomOrdersForRange` associatedMap |
| Payments | advance paid, received balance, payment mode, status | `room_info.advance_payment`, `receive_balance`, `balance_payment_mode`, `payment_status` — **display only** |
| Balance | `room_info.balance_payment` (backend figure — never recomputed) | same |
| Actions | **Check Out** → `PmsCheckoutDrawer` (existing); **Record Payment** → `recordPartialPayment()` (CR-162) then refetch; **Print Folio** → `printOrder(orderId,'bill')` (existing semantics); **Split to walk-in** (CR-163, optional) | existing services |
| Departed guests | read-only folio (actions hidden) | `f_order_status=6`, `line_status=checked_out` |

Entry points: In-House "View Bill", Departures row, Tape popover "Folio", Arrivals "Checked In" tab.

### Current behaviour
Links go to `/reports/room-orders` / `/reports/rooms`; no per-guest page.

---

## Evidence

- Curl: `probe_11_single_order_inhouse.json` — order 1232218: `room_info {room_price 13922.28, advance_payment 0.00, balance_payment 13922.28}`, `orderDetails [("check in", 13922.28, 1)]`, `associated_order_list []`, `payment_status unpaid`
- Missing: `pos/room-payment-history`, `pos/room-payments` → **404** (`probe_14`)
- Code: `PmsCheckoutDrawer.jsx` L76–111 fetch; `orderTransform.js` L391–405 roomInfo
- Investigation: `PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2 E4
- Source: AGENT-DISCOVERED · Confidence: CONFIRMED

---

## Backend Dependency — STATUS UPDATE 2026-09-14

| # | Ask | Status |
|---|---|---|
| B-364-01 | `GET /pos/room-payments?order_id=` dated payment ledger | ✅ **PARTIALLY RESOLVED** — `room_payment_summary.payments[]` now returned on `get-single-order-new` with `paid_at`, `payment_mode`, `payment_type`, amounts. Full endpoint `pos/room-payments` still 404. Per OD-364-01: totals-only v1 is acceptable; ledger display uses `payments[]` from `room_payment_summary`. |
| B-364-02 | `room_info.receive_balance` semantics vs `advance_payment` | ✅ **RESOLVED 2026-09-10** — `receive_balance` = cumulative received (advance + interim). `balance_payment` = room_price − receive_balance. Backend-computed, FE displays directly (R6). |
| B-364-03 | Lodging GST field | ✅ **RESOLVED (Q-364P-05 — 2026-09-14)** — Use `room_info.gst_tax`. Do NOT use `room_payment_summary.gst_tax` (field does not exist). |

### BE reply data path — ANSWERED 2026-09-14

| Q | Answer |
|---|---|
| Q-364P-02 | `get-single-order-new` now enriched: full stay doc + `gst_tax` + `room_type` + optional `reservation` block (channel, rateplan, actual `checked_in_at`/`checked_out_at`, guest email/address) |
| Q-364P-03 | FE derives `room_price ÷ nights` for v1 — no per-night BE expansion yet |
| Q-364P-04 | `associated_order_list` now has `order_type_label`, `waiter_name`, `item_count`, `item_names[]` (top 2). Still `f_order_status=6` (settled only) |
| Q-364P-05 | Use **`room_info.gst_tax`** — `room_payment_summary.gst_tax` does not exist |
| Q-364P-06 | No room-folio round-off — omit field |
| Q-364P-07 | Actual times: `reservation.checked_in_at` / `checked_out_at` (Aiosell-linked only). Booked dates: `room_info.checkin_date` / `checkout_date` |
| Q-364P-14 | Payment types enum: `advance \| interim \| checkout \| refund` (final) |

### Fields NOT on schema — omit from FE
- `discount_amount` / `discount_reason` on lodging
- `guest_id_proof_no` (ID number column does not exist)
- Structured `booking_details.*` parse — raw string only; use `reservation` for structured OTA fields
- `room_payment_summary.gst_tax`

### Print path — SPLIT TO CR-364-PRINT (2026-09-14)
Q-364P-01, 08, 09, 10, 13, 15 (`order-temp-store` / `rtype='RM'` template) scoped out of CR-364 into **CR-364-PRINT** (registered 2026-09-14). CR-364 data path is fully unblocked. Print folio ships separately once BE answers those 6 questions.
- Intake doc: `change_requests/CR-364-PRINT_PMS_FOLIO_PRINT_TEMPLATE_INTAKE.md`
- Status: BACKEND-BLOCKED, parked

---

## Open Questions (Owner Decisions)

| OD | Question | Options |
|---|---|---|
| OD-364-01 | v1 without dated payment history (totals only) acceptable until B-364-01? | yes / wait |
| OD-364-02 | Print folio = existing bill print (`printOrder 'bill'`) or a PMS-specific folio layout (new template = print semantics R6 → owner approval)? | existing / new |
| OD-364-03 | Re-point existing links (View Bill, Folio, Departures Check Out) to folio page, or add folio as extra action and keep current targets? | re-point / add |
| OD-364-04 | Show F&B item lines inline or only order-level rows with drill to OrderDetailSheet? | inline / drill |
| OD-364-05 | Departed-guest folio access window (how long after checkout)? | 60d (LR window) / unlimited via order id |

---

## Files (expected)

| File | Change |
|---|---|
| `pages/pms/GuestFolioPage.jsx` (NEW) | page |
| `api/services/pmsService.js` | +`getGuestFolio(orderId)` (single-order + ops join; reuses PmsCheckoutDrawer unwrap) |
| `api/transforms/folioTransform.js` (NEW) | pure model (no arithmetic on money — pass-through) |
| `App.js` | +1 route `/pms/folio/:orderId` |
| `pages/pms/InHouseGuestsPage.jsx`, `DeparturesPage.jsx`, `ReservationsPage.jsx` | link re-points (OD-364-03) |

Files NOT touched: CollectPaymentPanel.jsx, PmsCheckoutDrawer.jsx (embedded as-is), **orderTransform.js** (print extension scoped to CR-364-PRINT), roomService.js, printing templates.

**Scope lock (data path only):** This CR builds the folio VIEW page + actions. Print payload extension is CR-364-PRINT (BACKEND-BLOCKED, parked).

---

## Blocker Update — 2026-09-11

| Blocker | Was | Now |
|---|---|---|
| **BUG-384 / `pos/room-payment` 403** | BLOCKED — FE wired but endpoint returned 403 (believed permission gap) | ✅ **RESOLVED** — Backend reply (2026-09-10): NOT a permission gap. FE was sending wrong field names. Correct contract confirmed (see below). |

**Confirmed API contract for Record Payment (`POST pos/room-payment`):**

```json
{
  "room_order_id": 1232244,
  "payment_amount": 1000,
  "payment_mode": "cash",
  "payment_type": "interim"
}
```

| Field | Required | Notes |
|---|---|---|
| `room_order_id` | Yes | Stay/room `orders.id` — NOT `order_id` |
| `payment_amount` | Yes | NOT `amount` |
| `payment_mode` | Yes | `cash` / `card` / `upi` |
| `payment_type` | No | `advance`/`interim`/`checkout`/`refund` (default `advance`). Use `interim` for mid-stay. |

Wrong fields now return **422** (not 403). Route is live, no permission change needed.

**B-364-02 clarification resolved:** `room_info.receive_balance` = cumulative amount received (advance + interim payments). `balance_payment` = `room_price - receive_balance`. These are backend-computed — FE displays them directly (no recomputation per R6).

**All backend dependencies resolved for v1 scope.** Record Payment action is fully buildable.

---

## Open Owner Decisions (MUST be answered before Gate 2 Impact Analysis can begin)

| OD | Question | Decision | Blocking Gate 2? |
|---|---|---|:---:|
| OD-364-01 | v1 without dated payment history (totals only) acceptable until B-364-01 endpoint exists? | ✅ **YES (2026-09-16)** — ship totals only in v1; dated ledger endpoint is optional post-v1 | ✅ RESOLVED |
| OD-364-02 | Print folio: existing bill print (`printOrder 'bill'`) or PMS-specific folio layout? (new template = R6 — owner approval) | ✅ **PMS-specific folio layout (2026-09-16)** — FE will pass every field backend accepts; whatever is not passed simply won't print. Template gates layout switch on `rtype='RM'`. **R6 owner sign-off required before template goes live.** Full field spec + 15 backend questions filed at `/app/memory/backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` | ✅ RESOLVED |
| OD-364-03 | Re-point existing “View Bill” / “Folio” links to folio page, or add folio as an extra action? | ✅ **RE-POINT (2026-09-14)** — existing links re-pointed to `/pms/folio/:orderId`. Touches 3 files. | ✅ RESOLVED |
| OD-364-04 | Show F&B item lines inline or order-level rows only (drill to OrderDetailSheet)? | ✅ **DRILL-DOWN (2026-09-14)** — one row per food order + tap to `OrderDetailSheet`. | ✅ RESOLVED |
| OD-364-05 | Departed-guest folio access window: 60d (LR window) or unlimited by order id? | ✅ **NO FE-SIDE LIMIT (2026-09-14)** — show whatever backend returns; no artificial date filter. | ✅ RESOLVED |

**All 5 ODs resolved. Gate 2 UNBLOCKED as of 2026-09-14. Proceed to Impact Analysis.**

---

## Investigation performed 2026-09-16

- **CIB vs CR-364 comparison** — `/app/memory/CR-364_INVESTIGATION_CIB_COMPARISON.md`. Verdict: DISTINCT features. CR-131 Customer Intelligence (Beta) is a CRM-fed restaurant-wide aggregate; CR-364 is per-stay operational folio. No duplication.
- **CR-363 + CR-366 vs CR-364 gap analysis** — Night Audit and Revenue Dashboard are aggregate reports and cannot substitute for the per-guest operational surface (Check Out / Record Payment / Print Folio actions, live balance, walk-in without CRM profile, in-house right-now state, etc.).
- **Existing A4 print sweep** — `buildBillPrintPayload` (`orderTransform.js` L1797–L2268) already sends `roomAdvancePay`, `roomRemainingPay`, `associated_orders[]`, `rtype='RM'`. Missing from payload: room_no, check-in/out dates, meal plan, channel, booking id, nights, per-night lines, dated payment ledger, special requests, pax, ID proof. **~60%** of missing fields already exist in `orderTransform.roomInfo` + `roomPaymentSummary.payments[]` and just need wiring into `buildBillPrintPayload` (FE-only work). **~30%** exist on backend (`room_info` / `reservation_ops`) and need surfacing on `get-single-order-new`. **~10%** genuinely new (per-night expansion, reprint counter, folio_no, UPI QR, actual check-in/out timestamps).

## Backend brief filed
- `/app/memory/backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` — 9-block payload superset (~60 keys), 15 backend questions (`Q-364P-01…15`). Mirrored on `/app/frontend/public/backend-briefs.html` and `/app/memory/backend_briefs/index.html`.

---

## Gate status
- [x] Gate 0/1 — Intake ✅ FULLY CLOSED (all 5 ODs resolved 2026-09-14)
- [ ] Gate 2 — Impact Analysis (UNBLOCKED — data path only; print scoped to CR-364-PRINT)
- [ ] Gate 3 / 4

*Intake: 2026-09-04 | Updated: 2026-09-11 — BUG-384 RESOLVED, room-payment contract confirmed | Updated: 2026-09-16 — CIB comparison, CR-363/366 gap analysis, print field spec + backend brief filed, OD-01/02 frozen | Updated: 2026-09-14 — OD-03 (re-point), OD-04 (drill-down), OD-05 (no FE limit) FROZEN. Intake FULLY CLOSED. Gate 2 UNBLOCKED. BE reply: get-single-order-new enriched (Q-364P-02..07+14 answered). Print deferred (Q-364P-01/08/09/10/13/15). | Code reality: PARTIAL | Duplicate: RELATED (CR-360, CR-358-P4 placeholders); DISTINCT from CR-131 (CIB), CR-363 (Night Audit), CR-366 (Revenue) | Blast radius: MEDIUM | Risk: HIGH | **DATA PATH UNBLOCKED — PRINT DEFERRED***
