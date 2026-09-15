# CR-364 — IMPACT ANALYSIS (Gate 2)

**ID:** CR-364 — PMS Guest Folio Detail Page
**Date:** 2026-09-14
**Role:** PLANNING (Gate 2 — Impact Analysis ONLY. Gate 3 deliberately not written.)
**Sprint:** pos_pms_1
**Risk:** HIGH (money display + actions — see §3)
**Intake:** `change_requests/CR-364_PMS_GUEST_FOLIO_DETAIL_PAGE_INTAKE.md`
**Scope lock:** DATA PATH ONLY. Print path = CR-364-PRINT (BACKEND-BLOCKED, parked).

---

## 0. Header — Code Reality + Conflict Pre-Check

| Check | Result |
|---|---|
| **Code Reality** | **PARTIAL** — `PmsCheckoutDrawer.jsx` already fetches `get-single-order-new` + unwraps correctly. `orderTransform.fromAPI.order` already maps `roomInfo` (room_price, gst_tax, balance, checkin/out, guestName, roomPaymentSummary, associatedOrders). No `GuestFolioPage`, no `folioTransform`, no route `/pms/folio/:orderId`. 3 entry points exist with placeholder navigate('/reports/rooms'). |
| **Conflict — `pmsService.js`** | Last modifier CR-363/CR-366 2026-09-14 (L448-462). +`getGuestFolio` is an additive EOF append. **Parallel-safe.** |
| **Conflict — `App.js`** | Last modifier CR-363/CR-366 2026-09-14 (L107-108, L267-268). +1 import +1 route — additive. **Parallel-safe.** |
| **Conflict — `InHouseGuestsPage.jsx`** | Last modifier CR-360 (L169 `navigate('/reports/rooms')`). Exactly the line we re-point. **SERIAL — must execute after CR-360 is at CLOSED.** CR-360 is at Gate 5b (QA PASS), awaiting Gate 6 smoke — in practice parallel-safe as re-point is 1 line change with no logic overlap. |
| **Conflict — `DeparturesPage.jsx`** | Last modifier CR-358-P3 (L240). 1-line re-point. **Parallel-safe.** |
| **Conflict — `ReservationsPage.jsx`** | Last modifier CR-358-P5 (NoShowDialog). L361 1-line re-point. **Parallel-safe.** |
| **Conflict — `orderTransform.js`** | **NOT IN SCOPE** (owned by CR-364-PRINT). |
| **Conflict — `Sidebar.jsx`** | **NOT needed** — GuestFolioPage reached via navigate(), not sidebar. No Sidebar entry. |
| **R11 curl-probe** | **DONE 2026-09-14** — see §1. |

---

## 1. R11 Probe Results

**Account alias:** `goankitchen_owner` | **Order probed:** 1232245 (r3, walk-in, in-house)
**Evidence:** `evidence/CR-364/probe_single_order_1232245_2026_09_14.json`

### 1.1 `get-single-order-new` response shape (verified)

```
POST /api/v2/vendoremployee/get-single-order-new  { order_id: 1232245 }
→ HTTP 200
→ response.data = { orders: [ <order> ] }
→ unwrap: response.data.orders[0]  (same as PmsCheckoutDrawer L93-100)
```

**Top-level order fields confirmed:**
```
restaurant_order_id: "000032"
user_name:           "Test Guest GST"    ← guest name fallback
f_order_status:      5                   ← in-house / running (6 = checked-out)
created_at:          "2026-09-09 11:51:39"
associated_order_list: []               ← 0 F&B orders (walk-in, no room postings)
```

**`room_info` fields confirmed (47 keys):**
```
room_no:             "r3"
room_type:           "r3"               ← room code (aiosell: "suite" in reservation)
room_price:          "8000.00"
advance_payment:     "0.00"
balance_payment:     "10880.00"         ← includes GST (8000 + 1440 + extras)
receive_balance:     "0.00"
gst_tax:             "1440.00"          ← USE THIS (Q-364P-05: not room_payment_summary.gst_tax)
payment_status:      null               ← not settled yet
checkin_date:        "2026-09-09"
checkout_date:       "2026-09-10"
booking_type:        null               ← (booking_details.booking_type used instead)
total_adult:         (from room_info)
order_note:          null
```

**`room_info.reservation` block confirmed:**
```json
{
  "id": 30,
  "booking_id": "MG-69-7D37A1DB-...",
  "channel": "WalkIn",
  "pah": true,
  "special_requests": null,
  "checkin": "2026-09-09",
  "checkout": "2026-09-10",
  "status": "confirmed",
  "room_code": "suite",
  "rateplan_code": null,
  "adults": 1,
  "children": 0,
  "checked_in_at": "2026-09-09 11:51:40",
  "checked_out_at": null,
  "guest": {
    "first_name": "Test",
    "last_name": "Guest GST",
    "email": null,
    "phone": "9876543210",
    "address_city": null,
    "address_state": null,
    "address_country": null
  }
}
```

**`room_info.room_payment_summary` keys confirmed:**
```
remaining_room_balance, ledger_paid_amount, legacy_advance_payment,
room_price, payments[], room_order_id, restaurant_order_id, room_id,
total_paid_amount, user_document_id
```
`payments: []` — no interim payments on this order (walk-in, unpaid).

**Critical finding:** `room_info.gst_tax = 1440` but `room_payment_summary` has no `gst_tax` key — confirms Q-364P-05: **use `room_info.gst_tax` exclusively.**

---

## 2. Data Flow Trace

```
Entry: navigate('/pms/folio/:orderId')
  ← InHouseGuestsPage.jsx L169 (View Bill re-point)
  ← DeparturesPage.jsx L240 (row action re-point)
  ← ReservationsPage.jsx L361 (tape popover "View Folio" re-point)
  ← NightAuditPage.jsx §C outstanding row (future link — additive, CR-364 ships plain text today)

GuestFolioPage mounts:
  orderId = useParams().orderId (numeric)
  → pmsService.getGuestFolio(orderId)
      → api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: orderId })
      → unwrap: response.data.orders[0]  (reuse PmsCheckoutDrawer L93-100 pattern)
      → folioTransform.fromAPI(raw) → view model

View model consumed by GuestFolioPage sections:
  Header  → reservation.guest.first_name+last_name | user_name fallback
            room_info.room_no, room_info.room_type / reservation.room_code
            reservation.channel, reservation.pah (PAH badge)
            reservation.checkin/checkout, checked_in_at/checked_out_at
            reservation.adults, reservation.children
            reservation.special_requests
  Charges → room_info.room_price (pass-through — R6)
            room_info.gst_tax (pass-through — R6)
            room_info.balance_payment (pass-through — R6)
  Balance → room_payment_summary.remaining_room_balance (live balance)
            room_info.payment_status (paid badge)
  Payments→ room_payment_summary.payments[] (OD-364-01: totals-only v1)
  F&B     → associated_order_list[] mapped to rows (OD-364-04: drill-down)
  Actions:
    [Check Out]       → open PmsCheckoutDrawer (existing, orderId prop)
    [Record Payment]  → recordPartialPayment() from roomService.js (existing)
                        then refetch getGuestFolio(orderId) to refresh balance
    [Print Folio]     → disabled in v1 (CR-364-PRINT not shipped)
                        button shown grayed with tooltip "Print folio coming soon"

Departed guest (f_order_status === 6):
  → isCheckedOut = true → all 3 action buttons hidden
  → checked_out_at shows actual checkout time
  → read-only folio accessible (OD-364-05: no FE date limit)
```

---

## 3. Risk Classification

| Item | Risk | Reason | Upgrade trigger |
|---|---|---|---|
| **CR-364** | **HIGH** | Money figures visible to owner (room_price, balance, GST); 3 action triggers (checkout, payment, print-disabled); 3 file re-points touching existing nav | Upgrades to CRITICAL if any FE-side total is computed (it isn't — all pass-through) |

**R6 compliance:** `folioTransform` passes all money figures through as-is. The ONLY derived field is `nights` (date arithmetic, not money arithmetic — R6 does not apply to date math). No totals computed FE-side.

**Fast Lane:** NO — HIGH risk + new page + 3 link re-points.

---

## 4. Affected Files

### 4.1 New files

| File | Change | Hotspot? |
|---|---|---|
| `src/pages/pms/GuestFolioPage.jsx` | NEW page — header, charges, payments, F&B, actions | No |
| `src/api/transforms/folioTransform.js` | NEW pure transform, null-safe, no arithmetic (R6) | No |

### 4.2 Modified files

| File | Change | Lines | Hotspot? |
|---|---|---|---|
| `src/api/services/pmsService.js` | +`getGuestFolio(orderId)` at EOF | +~10L | No |
| `src/App.js` | +1 import (`GuestFolioPage`) + 1 route (`/pms/folio/:orderId`) | +2L | No |
| `src/pages/pms/InHouseGuestsPage.jsx` | L169: `navigate('/reports/rooms')` → `navigate('/pms/folio/${order.parentOrderId}')` | 1L | No |
| `src/pages/pms/DeparturesPage.jsx` | L240: `navigate('/reports/rooms')` → `navigate('/pms/folio/${row.orderId}')` | 1L | No |
| `src/pages/pms/ReservationsPage.jsx` | L361: `navigate('/reports/rooms')` → `navigate('/pms/folio/${popover.orderId}')` | 1L | No |

### 4.3 Files NOT touched

`CollectPaymentPanel.jsx` · `PmsCheckoutDrawer.jsx` (embedded as-is — props: orderId, roomNo, guestName, onClose, onSuccess) · `orderTransform.js` (CR-364-PRINT) · `roomService.js` (recordPartialPayment called directly) · `Sidebar.jsx` (no nav entry needed) · `NightAuditPage.jsx` (outstanding rows stay plain text in v1) · any `/app/memory/final/*`

**Blast radius:** 2 NEW + 5 MOD (≤3 lines each for MOD files). MEDIUM.

---

## 5. `folioTransform.fromAPI` spec (seeds Gate 3)

```js
// folioTransform.fromAPI(raw) — all money pass-through (R6). No arithmetic.
// raw = response.data.orders[0] from get-single-order-new

export function fromAPI(raw) {
  if (!raw) return null;
  const ri  = raw.room_info        ?? {};
  const res = ri.reservation       ?? {};
  const rps = ri.room_payment_summary ?? {};
  const g   = res.guest            ?? {};

  // Guest name priority (reuse existing guestName logic from orderTransform L419-427)
  const guestName = (() => {
    const n3 = (ri.name3 || '').trim();
    if (n3) return n3;
    const top = (raw.user_name || '').trim();
    if (top) return top;
    const fn = [g.first_name, g.last_name].filter(Boolean).join(' ').trim();
    if (fn) return fn;
    const bt = (ri.booking_type || '').toLowerCase();
    return bt.includes('walkin') ? 'Walk-in' : null;
  })();

  // nights: date math only — NOT money arithmetic (R6 does not apply)
  const nights = (() => {
    if (!ri.checkin_date || !ri.checkout_date) return null;
    const diff = new Date(ri.checkout_date) - new Date(ri.checkin_date);
    return Math.round(diff / 86400000) || null;
  })();

  return {
    // IDs
    orderId:         raw.id ?? null,
    orderNumber:     raw.restaurant_order_id ?? '',

    // Status
    fOrderStatus:    raw.f_order_status ?? null,
    isCheckedOut:    Number(raw.f_order_status) === 6,

    // Guest header
    guestName,
    phone:           g.phone || null,
    email:           g.email || null,

    // Room header
    roomNo:          ri.room_no || null,
    roomCode:        res.room_code || ri.room_type || null,
    channel:         res.channel || null,
    pah:             res.pah === true,
    bookingId:       res.booking_id || null,
    adults:          res.adults ?? null,
    children:        res.children ?? null,
    specialRequests: res.special_requests || null,

    // Dates
    checkinDate:     ri.checkin_date || res.checkin || null,
    checkoutDate:    ri.checkout_date || res.checkout || null,
    checkedInAt:     res.checked_in_at || null,
    checkedOutAt:    res.checked_out_at || null,
    nights,

    // Room charges (all pass-through — R6)
    roomPrice:       Number(ri.room_price)      || 0,
    gstTax:          Number(ri.gst_tax)         || 0,   // Q-364P-05: use room_info.gst_tax
    advancePayment:  Number(ri.advance_payment) || 0,
    receiveBalance:  Number(ri.receive_balance) || 0,
    balancePayment:  Number(ri.balance_payment) || 0,   // includes GST
    paymentStatus:   ri.payment_status || null,
    paymentMode:     ri.payment_mode || null,

    // Live balance (from payment summary — prefer this over balancePayment)
    remainingRoomBalance: Number(rps.remaining_room_balance) || 0,

    // Payment history (OD-364-01: totals-only v1)
    payments: (rps.payments || []).map(p => ({
      id:     p.id,
      amount: Number(p.payment_amount) || 0,
      mode:   p.payment_mode   || '',
      type:   p.payment_type   || 'advance',
      paidAt: p.paid_at        || '',
    })),

    // F&B posted (OD-364-04: drill-down per order)
    associatedOrders: (raw.associated_order_list || []).map(a => ({
      orderId:     a.id,
      orderNumber: a.restaurant_order_id || '',
      amount:      Number(a.order_amount) || 0,
      itemNames:   a.item_names || [],
      itemCount:   a.item_count ?? null,
      waiterName:  a.waiter_name || null,
      status:      a.f_order_status ?? null,
    })),

    // Misc
    orderNote: ri.order_note || null,
  };
}
```

---

## 6. Owner Decisions — ALL RESOLVED

| OD | Decision |
|---|---|
| OD-364-01 | Totals-only v1 — `payments[]` list shown, no dated ledger view |
| OD-364-02 | Print Folio = CR-364-PRINT (BACKEND-BLOCKED) — v1 shows disabled button with tooltip |
| OD-364-03 | Re-point all 3 existing links to `/pms/folio/:orderId` |
| OD-364-04 | F&B = drill-down (one row per associated order, tap → OrderDetailSheet) |
| OD-364-05 | No FE date limit — show whatever backend returns |

**No open decisions. Gate 3 can proceed immediately after design approval.**

---

## 7. Design Questions (for design agent — before Gate 3)

These are NOT owner decisions (all resolved) — they are design-only choices for the agent:

| # | Question | Proposed default |
|---|---|---|
| D1 | Page layout: single scroll vs collapsible sections? | Single scroll (less complexity than Night Audit) |
| D2 | Print Folio button: hidden entirely or shown disabled with tooltip? | Shown disabled with "Coming soon" tooltip |
| D3 | Record Payment: inline modal on same page or navigate to a drawer? | Inline modal (reuse PmsCheckoutDrawer pattern) |
| D4 | Departed guest folio: visual differentiation from in-house? | Muted header with "Checked Out" badge |
| D5 | Balance section: single combined balance or split room vs F&B? | Split (matches Night Audit §C) |

---

## 8. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | `guestName` null for walk-ins without reservation | M | M | Priority chain: name3 → user_name → guest.first+last → 'Walk-in' (already in orderTransform, reuse) |
| R-2 | `balancePayment` stale after mid-stay payment | M | H | Use `remainingRoomBalance` from `room_payment_summary` as primary; fall back to `balancePayment` only when `payments[]` empty (already documented in orderTransform comment L427) |
| R-3 | `associated_order_list` empty for walk-ins / recent stays | H | L | Show "No F&B posted to this room" empty state — not an error |
| R-4 | InHouseGuestsPage re-point breaks if `parentOrderId` is null | M | M | Add null guard: if `!order.parentOrderId` → keep old navigate('/reports/rooms') as fallback (or disable button) |
| R-5 | Departed guest orderId unavailable from DeparturesPage | M | M | Check orderId exists in row before re-pointing; keep old target as fallback |
| R-6 | PmsCheckoutDrawer already handles the order fetch — double-fetch on checkout | L | L | Drawer re-fetches on open (by design, to get latest state). No conflict. |

---

## 9. Gate 3 Entry Checklist

- [x] All ODs resolved ✅
- [x] R11 probe done (get-single-order-new 200, full shape verified) ✅
- [x] Code reality confirmed PARTIAL ✅
- [x] Conflict pre-check done ✅
- [ ] Design approved (design agent to be called this session)
- [ ] Re-verify exact target line numbers in 3 re-point files before writing plan
- [ ] Confirm `orderId` field name available in each entry-point component's row data

---

## 10. Scope Lock

**WILL change (7 files):**
`GuestFolioPage.jsx` (NEW) · `folioTransform.js` (NEW) · `pmsService.js` (+getGuestFolio, ~10L EOF) · `App.js` (+2L) · `InHouseGuestsPage.jsx` (L169, 1L) · `DeparturesPage.jsx` (L240, 1L) · `ReservationsPage.jsx` (L361, 1L)

**WILL NOT touch:**
`CollectPaymentPanel.jsx` · `PmsCheckoutDrawer.jsx` · `orderTransform.js` · `roomService.js` · `Sidebar.jsx` · `NightAuditPage.jsx` · any R5 hotspot · any `/app/memory/final/*`

---

```
Planning complete: CR-364
Stage: Impact Analysis (Gate 2 only)
Code reality: PARTIAL (data fetch exists in Drawer; no page/transform/route)
Risk: HIGH
Files WILL change: GuestFolioPage.jsx (NEW), folioTransform.js (NEW), pmsService.js (+10L),
                   App.js (+2L), InHouseGuestsPage.jsx (1L), DeparturesPage.jsx (1L), ReservationsPage.jsx (1L)
Files WILL NOT touch: CollectPaymentPanel, PmsCheckoutDrawer, orderTransform, roomService, Sidebar
Owner decisions: ALL RESOLVED (OD-01..05)
Docs: impact/CR-364_IMPACT_ANALYSIS.md · evidence/CR-364/probe_single_order_1232245_2026_09_14.json
Next: Design approval → PLANNING Gate 3 (Implementation Plan)
```
