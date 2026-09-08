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

## Backend Dependency (optional — not blocking v1)

| # | Ask | Type |
|---|---|---|
| B-364-01 (optional) | `GET /pos/room-payments?order_id=` → `[{amount, mode, paid_at, employee, note}]` (or embed `payments[]` in `get-single-order-new`) for a dated payment ledger | NEW ENDPOINT |
| B-364-02 | Confirm `room_info.receive_balance` semantics vs `advance_payment` after `pos/room-payment` (CR-162) | CLARIFICATION |
| B-364-03 | Lodging GST on room charge — `food_details.tax = 0` in sandbox; is GST computed at checkout server-side? FE will not compute (R6) | CLARIFICATION |

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

Files NOT touched: CollectPaymentPanel.jsx, PmsCheckoutDrawer.jsx (embedded as-is), orderTransform.js, roomService.js, printing templates.

---

## Gate status
- [x] Gate 0/1 — Intake
- [ ] Gate 2 — Impact Analysis (**can start now**)
- [ ] Gate 3 / 4

*Intake: 2026-09-04 | Intake agent | Code reality: PARTIAL | Duplicate: RELATED (CR-360, CR-358-P4 placeholders) | Blast radius: MEDIUM | Risk: HIGH | UNBLOCKED (FE-only)*
