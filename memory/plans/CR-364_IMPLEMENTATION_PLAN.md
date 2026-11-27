# CR-364 — IMPLEMENTATION PLAN (Gate 3)

**ID:** CR-364 — PMS Guest Folio Detail Page (data path only)
**Date:** 2026-09-14
**Role:** PLANNING (Gate 3 — Implementation Plan. No code written.)
**Sprint:** pos_pms_1 · **Risk:** HIGH
**Impact Analysis:** `memory/impact/CR-364_IMPACT_ANALYSIS.md`
**Design:** Option Set C — `public/cr364-folio-design.html` · `design_guidelines.json`

---

## 0. Pre-Implementation Verification (impl agent runs FIRST)

```bash
# 0a. Re-verify all 7 target lines — confirm unchanged
grep -n "navigate.*reports/rooms" /app/frontend/src/pages/pms/InHouseGuestsPage.jsx   # expect L169
grep -n "navigate.*reports/rooms" /app/frontend/src/pages/pms/DeparturesPage.jsx      # expect L240
grep -n "navigate.*reports/rooms" /app/frontend/src/pages/pms/ReservationsPage.jsx    # expect L361
grep -n "RevenueDashboardPage" /app/frontend/src/App.js                               # expect L108 (last import)
grep -n "pms/revenue" /app/frontend/src/App.js                                        # expect L268 (last route)
grep -c "" /app/frontend/src/api/services/pmsService.js                               # expect ~462 (EOF)

# 0b. Compile baseline
tail -3 /var/log/supervisor/frontend.out.log   # expect "webpack compiled with 1 warning"

# 0c. Verify no existing GuestFolioPage / folioTransform
grep -rn "GuestFolioPage\|folioTransform\|getGuestFolio" /app/frontend/src/ --include="*.js" --include="*.jsx"
# expect: 0 hits
```

---

## 1. Execution Sequence

| Step | File | Reason |
|---|---|---|
| 1 | `folioTransform.js` (NEW) | Pure fn — no deps; testable immediately |
| 2 | `pmsService.js` (MOD) | Service layer — GuestFolioPage imports from here |
| 3 | `GuestFolioPage.jsx` (NEW) | UI — needs transform + service + PmsCheckoutDrawer |
| 4 | `App.js` (MOD) | Route — needs page to exist |
| 5 | `InHouseGuestsPage.jsx` (MOD) | Re-point — can run after App.js |
| 6 | `DeparturesPage.jsx` (MOD) | Re-point — parallel with step 5 |
| 7 | `ReservationsPage.jsx` (MOD) | Re-point — parallel with step 5 |

Steps 5, 6, 7 are independent — run in parallel.

---

## 2. Detailed Edits

### Edit 1 — `src/api/transforms/folioTransform.js` (NEW, ~85 lines)

```js
// CR-364 — Guest Folio transform (data path only; print = CR-364-PRINT)
// Rules: pass-through money (R6). ONE derived field: nights (date math only, not money).
// OD-364-C1: Record Payment PARKED — no payments action in this transform.

const str  = (v) => (v == null || v === '' ? null : String(v));
const num  = (v) => (v == null || isNaN(Number(v)) ? 0 : Number(v));

/** Guest name priority — mirrors orderTransform.roomInfo.guestName */
const resolveGuestName = (ri, raw, g) => {
  const n3  = str(ri.name3);          if (n3)  return n3;
  const top = str(raw.user_name);     if (top) return top;
  const fn  = [g?.first_name, g?.last_name].filter(Boolean).join(' ').trim();
  if (fn) return fn;
  const bt  = str(ri.booking_type) || '';
  return bt.toLowerCase().includes('walkin') ? 'Walk-in' : null;
};

/** Nights from date strings — date math only, R6 does not apply to date arithmetic */
const calcNights = (ci, co) => {
  if (!ci || !co) return null;
  const diff = new Date(co) - new Date(ci);
  return Math.max(Math.round(diff / 86400000), 0) || null;
};

export function fromAPI(raw) {
  if (!raw) return null;

  const ri  = raw.room_info               ?? {};
  const res = ri.reservation              ?? {};
  const rps = ri.room_payment_summary     ?? {};
  const g   = res.guest                   ?? {};

  return {
    // ── IDs ────────────────────────────────────────
    orderId:      raw.id                        ?? null,
    orderNumber:  str(raw.restaurant_order_id)  ?? '',

    // ── Status ─────────────────────────────────────
    fOrderStatus: raw.f_order_status            ?? null,
    isCheckedOut: Number(raw.f_order_status) === 6,

    // ── Guest ──────────────────────────────────────
    guestName:    resolveGuestName(ri, raw, g),
    phone:        str(g.phone)                  ?? null,
    email:        str(g.email)                  ?? null,

    // ── Room header ────────────────────────────────
    roomNo:       str(ri.room_no)               ?? null,
    roomCode:     str(res.room_code || ri.room_type) ?? null,
    channel:      str(res.channel)              ?? null,
    pah:          res.pah === true,
    bookingId:    str(res.booking_id)           ?? null,
    adults:       res.adults                    ?? null,
    children:     res.children                  ?? null,
    specialRequests: str(res.special_requests)  ?? null,

    // ── Dates ──────────────────────────────────────
    checkinDate:  str(ri.checkin_date  || res.checkin)   ?? null,
    checkoutDate: str(ri.checkout_date || res.checkout)  ?? null,
    checkedInAt:  str(res.checked_in_at)        ?? null,
    checkedOutAt: str(res.checked_out_at)       ?? null,
    nights:       calcNights(ri.checkin_date || res.checkin, ri.checkout_date || res.checkout),

    // ── Meal plan (OD-364-C4 — BN-364-MEAL: explicit field pending) ─────
    mealPlan:     str(res.meal_plan || ri.booking_details?.meal_plan) ?? null,
    ratePlanCode: str(res.rateplan_code) ?? null,

    // ── Room charges (all pass-through — R6) ───────
    roomPrice:       num(ri.room_price),
    gstTax:          num(ri.gst_tax),          // Q-364P-05: use room_info.gst_tax
    advancePayment:  num(ri.advance_payment),
    receiveBalance:  num(ri.receive_balance),
    balancePayment:  num(ri.balance_payment),   // includes GST
    paymentStatus:   str(ri.payment_status)    ?? null,
    paymentMode:     str(ri.payment_mode)      ?? null,

    // ── Live balance (prefer over balancePayment when payments[] exist) ──
    remainingRoomBalance: num(rps.remaining_room_balance),

    // ── Payment history (OD-364-01: totals-only v1) ──────────────────────
    payments: (rps.payments || []).map(p => ({
      id:     p.id,
      amount: num(p.payment_amount),
      mode:   str(p.payment_mode)  ?? '',
      type:   str(p.payment_type)  ?? 'advance',
      paidAt: str(p.paid_at)       ?? '',
    })),

    // ── F&B posted to room (OD-364-04: drill-down rows) ──────────────────
    // Display aggregation only — sum shown for info, not used in any formula
    associatedOrders: (raw.associated_order_list || []).map(a => ({
      orderId:     a.id,
      orderNumber: str(a.restaurant_order_id) ?? '',
      amount:      num(a.order_amount),
      itemNames:   Array.isArray(a.item_names) ? a.item_names : [],
      itemCount:   a.item_count ?? null,
      waiterName:  str(a.waiter_name) ?? null,
    })),

    // ── Misc ──────────────────────────────────────
    orderNote: str(ri.order_note) ?? null,
  };
}
```

**Verification:** `node -e "const t=require('./src/api/transforms/folioTransform.js'); console.log(t.fromAPI(null), t.fromAPI({}).guestName)"` → `null, null`

---

### Edit 2 — `src/api/services/pmsService.js` (MOD, +12 lines at EOF)

**Append after last line (~L462):**
```js

// ─── CR-364 — Guest Folio ────────────────────────────────────────────────────
/** Fetch full stay detail for the Guest Folio page.
 *  Reuses same endpoint + unwrap pattern as PmsCheckoutDrawer (L78-111).
 *  @param {number|string} orderId  Room order id
 */
export const getGuestFolio = async (orderId) => {
  const res = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, { order_id: Number(orderId) });
  return (
    res?.data?.orders?.order_details_order ||
    res?.data?.order_details_order ||
    (Array.isArray(res?.data?.orders) ? res.data.orders[0] : null) ||
    res?.data?.orders ||
    null
  );
};
```

**Verification:** `grep -n "getGuestFolio" src/api/services/pmsService.js` → 1 hit

---

### Edit 3 — `src/pages/pms/GuestFolioPage.jsx` (NEW, ~290 lines)

**Full implementation spec (Option Set C — dual column):**

```
Imports:
  React, { useState, useEffect, useCallback, useRef }
  useParams, useNavigate from react-router-dom
  ChevronLeft, Clock, CreditCard, Utensils, User, FileText from lucide-react
  getGuestFolio from ../../api/services/pmsService
  { fromAPI } from ../../api/transforms/folioTransform
  PmsCheckoutDrawer from ../../components/pms/PmsCheckoutDrawer
  useRestaurant from ../../contexts/RestaurantContext

State:
  orderId   = useParams().orderId
  navigate  = useNavigate()
  folio     object  null until loaded
  loading   bool
  error     string|null
  isCheckoutOpen  bool  false

Data flow:
  useEffect([orderId]) → getGuestFolio(orderId) → fromAPI(raw) → setFolio(vm)
  onCheckoutSuccess → navigate(-1) or navigate('/pms/in-house')

Helpers:
  fmtINR(n)  = '₹' + n.toLocaleString('en-IN', {maximumFractionDigits:0})
  fmtDate(s) = new Date(s).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})
  fmtTime(s) = s?.slice(11,16) (HH:MM from datetime string)
  fnbTotal   = folio.associatedOrders.reduce((s,a) => s + a.amount, 0)  ← display aggregation only

Layout (Option Set C — dual column, Poppins, PMS design tokens):

┌── Page wrapper: bg-[#F7F7F7] px-4 py-5 ──────────────────────────────────┐
│                                                                            │
│  ← Back    (navigate(-1), data-testid="folio-back-btn")                   │
│                                                                            │
│  ┌── Header card ────────────────────────────────────────────────────┐   │
│  │  h1: "{guestName ?? 'Guest'}"  data-testid="guest-name"           │   │
│  │  sub: "Order #{orderNumber} · {nights}N"                          │   │
│  │  badges: channel | PAH | In-House/Checked-Out                     │   │
│  │  right: Checked in {checkedInAt} | Expected checkout {checkoutDate}│   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌── grid lg:grid-cols-12 ──────────────────────────────────────────┐   │
│  │  LEFT col lg:col-span-7                                            │   │
│  │  ┌── Guest & Stay Details card ─────────────────────────────────┐ │   │
│  │  │  meta grid 2-col:                                              │ │   │
│  │  │  Guest Name | Phone                                            │ │   │
│  │  │  Booking ID | Room Type                                        │ │   │
│  │  │  Check-in   | Check-out                                        │ │   │
│  │  │  Nights     | Adults / Children                                │ │   │
│  │  │  Meal Plan (mealPlan ?? '—') | Rate Plan (ratePlanCode ?? '—') │ │   │
│  │  │  Special Requests (full width)                                 │ │   │
│  │  └──────────────────────────────────────────────────────────────┘ │   │
│  │                                                                    │   │
│  │  ┌── Payments Received card ───────────────────────────────────┐  │   │
│  │  │  badge: "{payments.length} payments"                          │  │   │
│  │  │  IF empty: "No payments recorded yet." empty state           │  │   │
│  │  │  ELSE: per payment row: mode badge | type | date | amount    │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                    │   │
│  │  ┌── F&B Posted to Room card ──────────────────────────────────┐  │   │
│  │  │  IF empty: "No F&B orders posted to this room."             │  │   │
│  │  │  ELSE: table: Order# | Items | Amount | ›                   │  │   │
│  │  │  tap row → (OD-364-04: future OrderDetailSheet hook)         │  │   │
│  │  │  total row if >0 orders: "F&B Posted Total: fmtINR(fnbTotal)"│  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                    │   │
│  │  RIGHT col lg:col-span-5                                          │   │
│  │  ┌── Room Charges card ────────────────────────────────────────┐  │   │
│  │  │  Room Price        ₹X   data-testid="room-price-display"    │  │   │
│  │  │  Lodging GST       ₹X   data-testid="lodging-gst-display"   │  │   │
│  │  │  Advance Paid      ₹X   data-testid="advance-paid-display"  │  │   │
│  │  │  Amount Received   ₹X   data-testid="amount-received-display"│  │   │
│  │  │  ─────────────────────── BALANCE BREAKDOWN ──────────────── │  │   │
│  │  │  Room Balance  | F&B Posted                                  │  │   │
│  │  │  [orange tile] | [amber tile]                                │  │   │
│  │  │  data-testid="room-balance-display"  "fb-balance-display"    │  │   │
│  │  │  Total Balance Due: ₹X+Y (room+fnbTotal, info label only)   │  │   │
│  │  │  data-testid="total-balance-due-display"                     │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                    │   │
│  │  ┌── Actions card ─────────────────────────────────────────────┐  │   │
│  │  │  IF !folio.isCheckedOut:                                     │  │   │
│  │  │    [Check Out] green btn data-testid="action-checkout-button"│  │   │
│  │  │  [Print Folio] disabled btn data-testid="action-print-folio" │  │   │
│  │  │  note: "Record Payment disabled (mid-stay payments off)"     │  │   │
│  │  │  IF folio.isCheckedOut:                                      │  │   │
│  │  │    Actions card = hidden entirely                            │  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘

PmsCheckoutDrawer embedded:
  <PmsCheckoutDrawer
    open={isCheckoutOpen}
    orderId={folio.orderId}
    roomNo={folio.roomNo}
    guestName={folio.guestName}
    onClose={() => setIsCheckoutOpen(false)}
    onSuccess={() => { setIsCheckoutOpen(false); navigate(-1); }}
  />

Loading state: 2 skeleton cards (pulse animation)
Error state: red banner + Retry button

Code marker: // CR-364 at top of file
data-testid: guest-folio-container (wrapper), guest-name, channel-badge, room-number-badge,
             room-price-display, lodging-gst-display, advance-paid-display, amount-received-display,
             room-balance-display, fb-balance-display, total-balance-due-display,
             action-checkout-button, action-print-folio-button,
             fb-order-row-{orderId} (per F&B row), folio-back-btn
```

**Verification:** Navigate to `/pms/folio/1232245` after login → page loads, guest name "Test Guest GST", Room ₹8,000.

---

### Edit 4 — `src/App.js` (MOD, +2 lines)

**After line 108** (last PMS import `RevenueDashboardPage`):
```js
import GuestFolioPage      from './pages/pms/GuestFolioPage';          // CR-364
```

**After line 268** (last PMS route `pms/revenue`):
```jsx
              <Route path="/pms/folio/:orderId" element={<ProtectedRoute><GuestFolioPage /></ProtectedRoute>} /> {/* CR-364 */}
```

**Verification:** `grep -n "GuestFolioPage\|pms/folio" src/App.js` → 2 hits

---

### Edit 5 — `src/pages/pms/InHouseGuestsPage.jsx` (MOD, L169, 1 line)

**Current line 169:**
```js
onClick={() => navigate('/reports/rooms')} // CR-360: Phase 1 — room orders report; full checkout via CollectPaymentPanel is Phase 3 (Departures)
```

**After edit:**
```js
onClick={() => row.parentOrderId ? navigate(`/pms/folio/${row.parentOrderId}`) : navigate('/reports/rooms')} // CR-364: re-point to folio page; fallback to legacy if no orderId
```

**Verification:** In-House Guests table → tap "View Bill" → navigates to `/pms/folio/{id}`. Row without `parentOrderId` stays on `/reports/rooms`.

---

### Edit 6 — `src/pages/pms/DeparturesPage.jsx` (MOD, L240, 1 line)

**Current line 240:**
```js
onClick={() => navigate('/reports/rooms')}
```

**After edit:**
```js
onClick={() => row.orderId ? navigate(`/pms/folio/${row.orderId}`) : navigate('/reports/rooms')} // CR-364
```

*Note: `row.orderId` is already null-guarded at L247 `disabled={!row.orderId}` on the Checkout button. The receipt/view button (L239) currently has no guard — add the same ternary pattern for safety.*

**Verification:** Departures row with `orderId` → tap → navigates to folio. Row without orderId → `/reports/rooms`.

---

### Edit 7 — `src/pages/pms/ReservationsPage.jsx` (MOD, L361, 1 line)

**Current line 361:**
```js
onClick={() => { setPopover(null); navigate('/reports/rooms'); }}
```

**After edit:**
```js
onClick={() => { setPopover(null); navigate(`/pms/folio/${line.orderId}`); }} // CR-364
```

*Note: This button is already gated at L359: `{kind === 'in_house' && line.orderId && (` — `line.orderId` is guaranteed non-null here. No additional null guard needed.*

**Verification:** Tape Chart → tap in-house block → popover → "View Folio" → navigates to folio.

---

## 3. Verification Matrix

| # | File | What to verify | Method |
|---|---|---|---|
| V-01 | `folioTransform.js` | `fromAPI(null)` → null | node |
| V-02 | `folioTransform.js` | `fromAPI({})` → object with all keys | node |
| V-03 | `folioTransform.js` | null guest → guestName null (not '—') | node |
| V-04 | `pmsService.js` | `getGuestFolio` exported | grep |
| V-05 | `GuestFolioPage.jsx` | `/pms/folio/1232245` loads, no crash | Browser |
| V-06 | `GuestFolioPage.jsx` | Guest name "Test Guest GST" visible | Browser |
| V-07 | `GuestFolioPage.jsx` | Room price ₹8,000 rendered | Browser |
| V-08 | `GuestFolioPage.jsx` | Balance breakdown: Room Balance + F&B tile | Browser |
| V-09 | `GuestFolioPage.jsx` | Meal Plan row shows "—" (BN-364-MEAL pending) | Browser |
| V-10 | `GuestFolioPage.jsx` | Payments section shows "No payments yet" (empty) | Browser |
| V-11 | `GuestFolioPage.jsx` | F&B section shows "No F&B orders" (empty for this order) | Browser |
| V-12 | `GuestFolioPage.jsx` | Check Out button opens PmsCheckoutDrawer | Browser |
| V-13 | `GuestFolioPage.jsx` | Print Folio disabled, tooltip visible on hover | Browser |
| V-14 | `GuestFolioPage.jsx` | Record Payment NOT rendered | Browser |
| V-15 | `GuestFolioPage.jsx` | Departed order (f_order_status=6): actions card hidden | Browser |
| V-16 | `App.js` | `/pms/folio/:orderId` route exists | grep |
| V-17 | `InHouseGuestsPage.jsx` | View Bill → navigates to `/pms/folio/{id}` | Browser |
| V-18 | `DeparturesPage.jsx` | Receipt btn → navigates to `/pms/folio/{id}` | Browser |
| V-19 | `ReservationsPage.jsx` | Tape Chart "View Folio" → `/pms/folio/{id}` | Browser |
| V-20 | webpack | 0 new warnings vs baseline | log |

---

## 4. Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R-1 | `parentOrderId` null on some InHouseGuestsPage rows | Ternary fallback → `/reports/rooms` (Edit 5) |
| R-2 | `remainingRoomBalance` = 0 when `room_payment_summary` not present | `num()` returns 0; fallback to `balancePayment` in display: `folio.remainingRoomBalance || folio.balancePayment` |
| R-3 | PmsCheckoutDrawer `onSuccess` fired — where to navigate? | `navigate(-1)` returns to previous page (InHouseGuests / Departures / Tape Chart) |
| R-4 | F&B total display computation flagged as R6 | Labeled "F&B Posted Total" not "F&B Balance Due" — informational only, not used in any formula |
| R-5 | Meal plan null for all current orders | "—" renders cleanly; no visual break |

---

## 5. Post-Code Registry Checklist (impl agent runs after coding)

```
- [ ] registry.json: CR-364 → status: IMPLEMENTED, sprint_key: pos_pms_1, gate: 5
- [ ] CR_REGISTRY.md: CR-364 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: 7 files listed with CR-364 + date
- [ ] Code markers: // CR-364 in GuestFolioPage.jsx, folioTransform.js, pmsService.js, App.js,
                    InHouseGuestsPage.jsx, DeparturesPage.jsx, ReservationsPage.jsx
- [ ] Compile check: webpack 0 new warnings
```

---

## 6. Scope Lock (FINAL)

**WILL change (7 files):**
`GuestFolioPage.jsx` (NEW) · `folioTransform.js` (NEW) · `pmsService.js` (+12L EOF) · `App.js` (+2L) · `InHouseGuestsPage.jsx` (L169, 1L) · `DeparturesPage.jsx` (L240, 1L) · `ReservationsPage.jsx` (L361, 1L)

**WILL NOT touch:** `CollectPaymentPanel.jsx` · `PmsCheckoutDrawer.jsx` · `orderTransform.js` (CR-364-PRINT) · `roomService.js` · `Sidebar.jsx` · `NightAuditPage.jsx` · any R5 hotspot · any `/app/memory/final/*`

---

```
Planning complete: CR-364
Stage: Gate 3 — Implementation Plan
Code reality: PARTIAL (fetch exists in Drawer; no page/transform/route)
Risk: HIGH
Files WILL change: 2 NEW + 5 MOD (≤3L each for MODs)
Owner decisions: ALL RESOLVED (OD-364-01..05, C1..C4)
Docs: plans/CR-364_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → IMPLEMENTATION
```
