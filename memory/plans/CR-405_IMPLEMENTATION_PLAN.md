# CR-405 — Implementation Plan (Gate 3)

**ID:** CR-405
**Title:** Room Folio — Discount at Checkout + Check-in, Partial Room Payments, Shift Dine-in to Room
**Date:** 2026-10-01
**Gate:** 3 — Phased Implementation Plan
**Based on:** `impact/CR-405_IMPACT_ANALYSIS.md`
**R11 probes:** PASS — see `evidence/CR-405/R11_PROBES_2026_10_01.md`
**Auth for QA probes:** QA_GOANKITCHEN alias (credentials in `/app/memory/test_credentials.md`, masked)

---

## Code Reality Re-verification (all lines confirmed at HEAD)

| Phase | File | Line | Current content | Status |
|---|---|---|---|---|
| A | `FolioCheckoutPanel.jsx` | L52 | `disabled data-testid="bill-room-discount-btn" title="needs BQ-385-07"` | ✅ EXACT |
| A | `FolioCheckoutPanel.jsx` | L82 | `export const FolioCheckoutPanel = ({ row, meta, onDone, onClose }) => {` | ✅ EXACT |
| A | `FolioCheckoutPanel.jsx` | L109 | `const handlePaid = useCallback(async (paymentData) => {` | ✅ EXACT |
| B | `constants.js` | L96 | `ORDER_SHIFTED_ROOM: '/api/v2/vendoremployee/order/order-shifted-room',` | ✅ EXACT |
| B | `CollectPaymentPanel.jsx` | L1187–1189 | `paymentMethod === 'transferToRoom'` + `paymentData.roomId = selectedRoom.tableId` | ✅ EXACT |
| B | `orderTransform.js` | L1755 | `transferToRoom: (table, paymentData, roomId) => {` | ✅ EXACT (shifted +7 from BUG-484) |
| D | `pmsService.js` | L278 | `fd.append('gst_tax', String(to2dp(p.gstTax ?? 0)));` | ✅ EXACT |
| D | `CheckInPage.jsx` | L306 | `const res = await pmsCheckIn({` | ✅ EXACT |

---

## Scope Lock

**Files WILL change:**

| Phase | File | Hotspot? |
|---|---|---|
| A | `components/pms/frontdesk/FolioCheckoutPanel.jsx` | NO |
| B | `api/constants.js` | NO |
| B | `components/order-entry/CollectPaymentPanel.jsx` | YES (R5) |
| B | `api/transforms/orderTransform.js` | YES (R5) |
| D | `api/services/pmsService.js` | NO |
| D | `pages/pms/CheckInPage.jsx` | NO |
| C | `components/pms/frontdesk/FolioCheckoutPanel.jsx` | NO |
| C | `api/transforms/orderTransform.js` | YES (R5) |

**Files will NOT touch:**
- `OrderEntry.jsx` — post-shift navigation already correct; no change needed
- `PmsCheckoutDrawer.jsx` — Phase A room discount only via Front Desk (OD-405-02)
- `CollectPaymentBillPanelDrawer.jsx`
- Any report, auth, or non-room file

---

## Phase A — Checkout Room Discount (FolioCheckoutPanel only)

### Design (OD-405-02/03 locked)
Enable the disabled "Apply…" button. User enters ₹ amount. `apply_to='room'` hardcoded (cuts UID balance). Optional type/reason. Discount injected into payload post-`collectBillExisting` (same pattern as `room_gst_tax` at L115-116).

### Edit Sites

**E-A1** — `FolioCheckoutPanel.jsx` — add state after L88

```javascript
// before:
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);

// after:
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  // CR-405-A: room discount at checkout (handover_5 §4.4)
  const [roomDiscount, setRoomDiscount] = useState(0);
  const [roomDiscountReason, setRoomDiscountReason] = useState('');
```

---

**E-A2** — `FolioCheckoutPanel.jsx` — pass discount state into Statement (L142)

```javascript
// before:
          <div className="bill-left overflow-auto pr-2" data-testid="bill-left"><Statement row={row} folio={state.data.folio} /></div>

// after:
          <div className="bill-left overflow-auto pr-2" data-testid="bill-left">
            <Statement row={row} folio={state.data.folio}
              roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
              roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
            />
          </div>
```

---

**E-A3** — `FolioCheckoutPanel.jsx` — update `Statement` signature (L63) + pass to `RoomSection` (L71)

```javascript
// before:
const Statement = ({ row, folio }) => {
  ...
      <RoomSection row={row} upgrade={upgrade} />

// after:
const Statement = ({ row, folio, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason }) => {
  ...
      <RoomSection row={row} upgrade={upgrade}
        roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
        roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
      />
```

---

**E-A4** — `FolioCheckoutPanel.jsx` — update `RoomSection` (L39) to enable discount UI (L52)

```javascript
// before:
const RoomSection = ({ row, upgrade }) => {
  ...
          <div className="flex justify-between py-0.5 text-[#767676]"><span>Room discount</span><button type="button" disabled data-testid="bill-room-discount-btn" title="needs BQ-385-07" className="fd-btn text-[11px] underline disabled:opacity-40 disabled:cursor-not-allowed">Apply…</button></div>

// after:
const RoomSection = ({ row, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason }) => {
  ...
          <div className="py-0.5">
            <div className="flex justify-between text-[#767676]">
              <span>Room discount</span>
              {roomDiscount > 0
                ? <span className="tabular-nums text-[#329937]" data-testid="bill-room-discount-applied">-{fmtINR(roomDiscount)}</span>
                : null}
            </div>
            <div className="flex gap-1 mt-0.5">
              <input
                type="number" min="0" placeholder="₹ Discount"
                value={roomDiscount || ''}
                onChange={e => setRoomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="fd-btn w-24 h-6 border border-[#E5E5E5] rounded px-1 text-[11px]"
                data-testid="bill-room-discount-input"
              />
              <input
                type="text" placeholder="Reason (optional)"
                value={roomDiscountReason}
                onChange={e => setRoomDiscountReason(e.target.value)}
                className="fd-btn flex-1 h-6 border border-[#E5E5E5] rounded px-1 text-[11px]"
                data-testid="bill-room-discount-reason"
              />
            </div>
          </div>
```

---

**E-A5** — `FolioCheckoutPanel.jsx` — inject room discount in `handlePaid` (after L116)

```javascript
// before (L109-119):
  const handlePaid = useCallback(async (paymentData) => {
    if (!order || !row.orderId || paying) return;
    setPaying(true); setPayError(null);
    try {
      const payload = orderToAPI.collectBillExisting(..., paymentData, {...});
      const roomGstTax = order.roomInfo?.gstTax ?? 0;
      if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // BUG-386
      const data = await payBill(payload);

// after — add after room_gst_tax injection:
      const roomGstTax = order.roomInfo?.gstTax ?? 0;
      if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // BUG-386
      // CR-405-A: room discount at checkout (handover_5 §4.4)
      if (roomDiscount > 0) {
        payload.room_discount            = roomDiscount;
        payload.room_discount_apply_to   = 'room';
        payload.room_discount_type       = 'Amount';
        payload.room_discount_value      = roomDiscount;
        payload.room_discount_reason     = roomDiscountReason || null;
      }
      const data = await payBill(payload);
```

**Note:** `roomDiscount` from outer scope (closure over state). `handlePaid` dependency array must include `roomDiscount` + `roomDiscountReason`.

---

**Files changed (Phase A):** `FolioCheckoutPanel.jsx` only (5 edit sites)
**Files NOT touched:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `PmsCheckoutDrawer.jsx`

---

## Phase B — Shift Dine-in to Room (order-shifted-room v1)

### R11 probe confirms
- v1 = new contract (`source_order_id` + `target_order_id`) ✅
- v2 = old contract (requires `order_id` + `payment_mode`) ✅
- Fix is: constants v2→v1 + rewrite `transferToRoom` + pass `roomOrderId`

### Edit Sites

**E-B1** — `api/constants.js:96` — version fix (Fast Lane, OD-405-06)

```javascript
// before:
  ORDER_SHIFTED_ROOM: '/api/v2/vendoremployee/order/order-shifted-room',

// after:
  ORDER_SHIFTED_ROOM: '/api/v1/vendoremployee/order/order-shifted-room',  // CR-405-B: v1 = new contract
```

---

**E-B2** — `CollectPaymentPanel.jsx:1187-1189` — pass `roomOrderId`

```javascript
// before:
    if (paymentMethod === 'transferToRoom' && selectedRoom) {
      paymentData.isTransferToRoom = true;
      paymentData.roomId = selectedRoom.tableId;
    }

// after:
    if (paymentMethod === 'transferToRoom' && selectedRoom) {
      paymentData.isTransferToRoom = true;
      paymentData.roomId      = selectedRoom.tableId;   // kept for legacy compat
      paymentData.roomOrderId = selectedRoom.orderId;   // CR-405-B: source_order_id for v1 contract
    }
```

---

**E-B3** — `orderTransform.js:1755-1782` — rewrite `transferToRoom`

```javascript
// before:
  transferToRoom: (table, paymentData, roomId) => {
    const {
      method = 'cash', finalTotal = 0,
      sgst = 0, cgst = 0, vatAmount = 0,
      tip = 0, discounts = {}, serviceCharge = 0,
      serviceGstTaxAmount = 0,
      tipTaxAmount = 0,
    } = paymentData;

    return {
      order_id:                 String(table.orderId),
      payment_mode:             method,
      payment_amount:           finalTotal,
      payment_status:           'paid',
      room_id:                  String(roomId),
      order_discount:           (discounts.manual || 0) + (discounts.preset || 0),
      self_discount:            (discounts.manual || 0) + (discounts.preset || 0),
      comm_discount:            discounts.preset || 0,
      tip_amount:               tip,
      vat_tax:                  vatAmount,
      gst_tax:                  Math.round(((sgst || 0) + (cgst || 0)) * 100) / 100,
      service_tax:              serviceCharge || 0,
      service_gst_tax_amount:   Math.round((serviceGstTaxAmount || 0) * 100) / 100,
      tip_tax_amount:           Math.round((tipTaxAmount || 0) * 100) / 100,
    };
  },

// after:
  // CR-405-B: order-shifted-room v1 contract (handover_5 §6)
  // Moves active F&B lines from target (dine-in) onto source (open room order).
  // Does NOT settle — settlement happens separately on the room order.
  // v1 = {source_order_id, target_order_id, transfer_note} only.
  // v2 (old) required order_id + payment fields — no longer used.
  transferToRoom: (table, paymentData, _roomId) => ({
    source_order_id: String(paymentData.roomOrderId || ''), // room order (receives items)
    target_order_id: String(table.orderId),                  // dine-in order (loses items)
    transfer_note:   'Yes',
  }),
```

**Files changed (Phase B):** `constants.js` (E-B1), `CollectPaymentPanel.jsx` (E-B2), `orderTransform.js` (E-B3)

---

## Phase D — Check-in Discount Bake

### Edit Sites

**E-D1** — `pmsService.js` — after L278 (after `gst_tax` append)

```javascript
// before:
  fd.append('gst_tax',         String(to2dp(p.gstTax ?? 0)));                  // BUG-386 preserved

  // ── Corporate (CR-379) ────────────────────────────────────────────────────

// after:
  fd.append('gst_tax',         String(to2dp(p.gstTax ?? 0)));                  // BUG-386 preserved
  // CR-405-D: optional room discount baked at check-in (handover_5 §3)
  if ((p.roomDiscount ?? 0) > 0) {
    fd.append('room_discount',        String(to2dp(p.roomDiscount)));
    fd.append('room_discount_type',   p.roomDiscountType  ?? 'Amount');
    fd.append('room_discount_value',  String(p.roomDiscountValue ?? p.roomDiscount));
    fd.append('room_discount_reason', p.roomDiscountReason ?? '');
  }

  // ── Corporate (CR-379) ────────────────────────────────────────────────────
```

---

**E-D2** — `CheckInPage.jsx` — add discount state (near other form state, ~L100 area)

Add state variables (exact line determined by Implementation agent after reading that section):
```javascript
// CR-405-D: optional check-in room discount
const [checkInDiscount, setCheckInDiscount] = useState(0);
const [checkInDiscountReason, setCheckInDiscountReason] = useState('');
```

---

**E-D3** — `CheckInPage.jsx` — add discount input to the form UI

In the money/room section of the form (near the room amount/advance fields), add an optional discount row:
```jsx
{/* CR-405-D: optional room discount at check-in */}
<div className="flex gap-2 items-center">
  <label className="text-sm text-[#767676] w-32">Room Discount (₹)</label>
  <input
    type="number" min="0" placeholder="0"
    value={checkInDiscount || ''}
    onChange={e => setCheckInDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
    data-testid="ci-room-discount-input"
    className="..."
  />
  <input
    type="text" placeholder="Reason (optional)"
    value={checkInDiscountReason}
    onChange={e => setCheckInDiscountReason(e.target.value)}
    data-testid="ci-room-discount-reason"
    className="..."
  />
</div>
```

---

**E-D4** — `CheckInPage.jsx:306-333` — pass discount to `pmsCheckIn`

```javascript
// after existing fields, add:
        // CR-405-D: optional check-in bake
        roomDiscount:       checkInDiscount > 0 ? checkInDiscount : undefined,
        roomDiscountType:   checkInDiscount > 0 ? 'Amount' : undefined,
        roomDiscountValue:  checkInDiscount > 0 ? checkInDiscount : undefined,
        roomDiscountReason: checkInDiscountReason || undefined,
```

**Files changed (Phase D):** `pmsService.js` (E-D1), `CheckInPage.jsx` (E-D2, E-D3, E-D4)

---

## Phase C — `partial_payments_room` (multi-leg room payment)

### Edit Sites

**E-C1** — `FolioCheckoutPanel.jsx` — add room split payment UI

Add `splitPaymentsRoom` state (array of `{mode, amount}`) to `FolioCheckoutPanel`. Add a "Split room payment" toggle below the `CollectPaymentPanel` or in the room section. Pass `splitPaymentsRoom` via `paymentData` extension in `handlePaid`.

In `handlePaid`, after building the payload:
```javascript
// CR-405-C: partial_payments_room (handover_5 §4.5)
const validRoomLegs = (splitPaymentsRoom || []).filter(l => (parseFloat(l.amount) || 0) > 0);
if (validRoomLegs.length > 0) {
  payload.partial_payments_room = validRoomLegs.map(l => ({
    payment_mode:   l.mode,
    payment_amount: parseFloat(l.amount),
  }));
}
```

---

**E-C2** — `orderTransform.js:collectBillExisting` — read and emit `partial_payments_room` from paymentData

Add to destructuring (after `splitPayments`):
```javascript
splitPaymentsRoom = [],  // CR-405-C: room payment legs
```

After the existing `partial_payments` block (~L1737):
```javascript
// CR-405-C: partial_payments_room — independent room payment legs (handover_5 §4.5)
if (splitPaymentsRoom.length > 0) {
  const validRoomLegs = splitPaymentsRoom.filter(p => (parseFloat(p.amount) || 0) > 0);
  if (validRoomLegs.length > 0) {
    payload.partial_payments_room = validRoomLegs.map(p => ({
      payment_mode:   p.mode || p.method,
      payment_amount: parseFloat(p.amount),
      ...(p.transactionId ? { transaction_id: p.transactionId } : {}),
    }));
  }
}
```

**Note:** E-C1 and E-C2 are alternatives — either FolioCheckoutPanel injects it (like Phase A pattern), or it goes through `collectBillExisting`. The Planning agent recommends E-C2 (transform approach) for testability + reuse.

**Files changed (Phase C):** `FolioCheckoutPanel.jsx` (E-C1), `orderTransform.js` (E-C2)

---

## Verification Matrix (Step 4)

| # | Phase | Edit | File | Verification | Automated? |
|---|---|---|---|---|:---:|
| V-A1 | A | E-A1 state | FolioCheckoutPanel | `roomDiscount`, `roomDiscountReason` state declared | NO |
| V-A2 | A | E-A4 button | FolioCheckoutPanel | `bill-room-discount-input` testid present, not disabled | NO (browser) |
| V-A3 | A | E-A5 payload | FolioCheckoutPanel | Enter ₹100 → inspect payload: `room_discount=100, apply_to=room` | NO (browser) |
| V-A4 | A | No discount | FolioCheckoutPanel | roomDiscount=0 → no room_discount keys in payload | YES (unit) |
| V-A5 | A | Settle | preprod | HTTP 200; room_info.room_discount_amount=₹X; at=check_out | NO (curl) |
| V-B1 | B | E-B1 constant | constants.js | `ORDER_SHIFTED_ROOM` = `/api/v1/…` | NO (code) |
| V-B2 | B | E-B3 payload | orderTransform | `transferToRoom(t,pd)` returns `{source_order_id,target_order_id,transfer_note}` only | YES (unit) |
| V-B3 | B | E-B2 roomOrderId | CollectPaymentPanel | `paymentData.roomOrderId = selectedRoom.orderId` | NO (code) |
| V-B4 | B | End-to-end | preprod | Click To Room → select room → Transfer → HTTP 200; dine-in order removed; room order updated | NO (browser) |
| V-B5 | B | No payment fields | orderTransform | `transferToRoom` payload has NO `payment_mode`, `payment_amount`, `order_discount` | YES (unit) |
| V-D1 | D | E-D1 pmsService | pmsService | `room_discount=100` in FormData when p.roomDiscount=100 | YES (unit) |
| V-D2 | D | No discount | pmsService | roomDiscount=0/undefined → no room_discount fd.append | YES (unit) |
| V-D3 | D | UI field | CheckInPage | `ci-room-discount-input` testid present | NO (browser) |
| V-D4 | D | Probe | preprod | Check-in with ₹100 discount → room_info.room_discount_amount=100, at=check_in | NO (curl) |
| V-C1 | C | E-C2 transform | orderTransform | `splitPaymentsRoom=[{mode:'cash',amount:500}]` → payload has `partial_payments_room` | YES (unit) |
| V-C2 | C | Empty legs | orderTransform | `splitPaymentsRoom=[]` → no `partial_payments_room` key | YES (unit) |
| V-C3 | C | Probe | preprod | Two-leg room payment → two rows in restaurant_room_payments | NO (curl) |
| VR-1 | REG | Non-room | orderTransform | `transferToRoom` with empty `roomOrderId` → `source_order_id=''` | YES (unit) |
| VR-2 | REG | Dine-in settle | orderTransform | `collectBillExisting` no partial_payments_room key when not provided | YES (unit) |
| VR-3 | REG | Build | all | `yarn build` exit 0, 0 new warnings | YES |

---

## Post-Code Registry Checklist (Step 5)

```
□ 1. registry.json: CR-405 → status: GATE_5A_IMPLEMENTED per phase (after each phase)
□ 2. CR_REGISTRY.md: header updated per phase
□ 3. FILE_OWNERSHIP.md: every modified file listed with CR-405-A/B/C/D marker + date
□ 4. Code markers: // CR-405-A / // CR-405-B / // CR-405-D / // CR-405-C in every modified location
□ 5. Compile check: yarn build exits 0, 0 new warnings after EACH phase
```

---

## Execution Sequence (Implementation Agent)

```
Phase A (independently closable):
  1. Entry verify: FolioCheckoutPanel L52/L82/L109 exact
  2. Apply E-A1 → E-A5 (all in FolioCheckoutPanel.jsx)
  3. Verify: compile + visual code check
  4. Checkpoint A: ✅

Phase B (independently closable after A):
  5. Entry verify: constants.js L96 + CollectPaymentPanel L1187 + orderTransform L1755
  6. Apply E-B1 (constants, Fast Lane)
  7. Apply E-B2 (CollectPaymentPanel)
  8. Apply E-B3 (orderTransform, rewrite transferToRoom)
  9. Verify: compile + unit tests for transferToRoom
  10. Checkpoint B: ✅

Phase D (independently closable):
  11. Entry verify: pmsService.js L278 + CheckInPage.jsx L306
  12. Apply E-D1 (pmsService)
  13. Apply E-D2/D3/D4 (CheckInPage)
  14. Verify: compile + unit tests for pmsService discount
  15. Checkpoint D: ✅

Phase C (last, after A/B/D):
  16. Entry verify: orderTransform collectBillExisting destructure block
  17. Apply E-C1 (FolioCheckoutPanel room split UI)
  18. Apply E-C2 (orderTransform emit partial_payments_room)
  19. Verify: compile + unit tests
  20. Checkpoint C: ✅

Final:
  21. Full yarn build — 0 new warnings
  22. Complete registry checklist (□1-5)
  23. Write QA Handover + Session Handover
```

---

## Risk Register

| Risk | Mitigation |
|---|---|
| `handlePaid` closure stale on `roomDiscount` | Add `roomDiscount`/`roomDiscountReason` to `handlePaid` useCallback deps |
| `selectedRoom.orderId` undefined on old cached rooms | Guard: `paymentData.roomOrderId = selectedRoom.orderId ?? null` |
| `transferToRoom` called with no `roomOrderId` | Empty string → v1 returns "Target order not found" (not a crash) |
| Phase C's `splitPaymentsRoom` conflicts with F&B split | Both arrays independent; use different state var |
| E-B3 removes old fields some test expects | Update/add unit tests for new transferToRoom contract |

---

## Summary

```
Plan ready: CR-405 phased A → B → D → C
4 phases, independently closable
6 files, ~75 lines total
Hotspots: CollectPaymentPanel.jsx (R5, E-B2 only, 2 lines) + orderTransform.js (R5, E-B3 + E-C2)
R11 probes: ALL PASS (evidence: evidence/CR-405/R11_PROBES_2026_10_01.md)
Auth alias: QA_GOANKITCHEN (test_credentials.md)
Owner decisions: ALL LOCKED (OD-405-01…06)
Awaiting Gate 4 GO.
```
