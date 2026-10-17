# BUG-425 — Impact Analysis + Implementation Plan: PmsCheckoutDrawer ROOM Balance Excludes GST

**Code Reality:** CONFIRMED BUG — PmsCheckoutDrawer.jsx L271 passes `detail.roomInfo` directly to CollectPaymentPanel with no balance override. `remaining_room_balance` from fresh API = 1,000 (no GST); CollectPaymentPanel prefers it.
**Conflict Pre-Check:**
- BUG-386 (IMPLEMENTED, 2026-09-09): touched `PmsCheckoutDrawer.jsx` E7 — injected `room_gst_tax` into BILL_PAYMENT payload. Adds to payment payload only, does NOT affect `roomInfo` prop. No conflict.
- No other open item touches PmsCheckoutDrawer.
**Risk:** HIGH — financial display at point of checkout; wrong amount shown to cashier.
**Fast Lane:** NOT eligible (HIGH financial, R6 adjacent).

---

## Owner Decisions

| ID | Decision |
|----|----------|
| OD-425-01 | Fix inside PmsCheckoutDrawer only — Path A, do NOT touch CollectPaymentPanel | ✅ confirmed |
| OD-425-02 | All 6 test scenarios must pass before ship | ✅ confirmed |

---

## Gate 2 — Impact Analysis

### Data flow trace

```
GuestFolioPage → PmsCheckoutDrawer (open=true, orderId)
  → api.post(SINGLE_ORDER_NEW, {order_id})
  → orderFromAPI.order(raw) → detail
  → detail.roomInfo.roomPaymentSummary.remainingRoomBalance  = 1,000  ← from backend (no GST)
  → detail.roomInfo.balancePayment                           = 1,050  ← stored at check-in (incl. GST)
  → detail.roomInfo.roomPrice                                = 1,000
  → detail.roomInfo.gstTax                                   = 50
  → detail.roomInfo.advancePayment                           = 0
  → detail.roomInfo.receiveBalance                           = 0

CollectPaymentPanel (receives roomInfo prop):
  roomBalance = roomInfo.roomPaymentSummary?.remainingRoomBalance  ← = 1,000  ← USED (WRONG)
              ?? roomInfo.balancePayment                            ← = 1,050  ← NOT REACHED
  → shows ROOM ₹1,000  ← WRONG (missing GST ₹50)
  → Grand Total = 1,000 + 107 + 107 = ₹1,214  ← WRONG
```

### Why Dashboard shows ₹1,050 (correct)
Dashboard checkout uses cached order data loaded from a different endpoint (GET_ALL_ORDERS / socket). That cached data has `room_payment_summary` absent → CollectPaymentPanel falls back to `balancePayment = 1,050` → shows ₹1,050 ✅.

### Correct formula (consistent with BUG-423 folio fix)
```
roomBalance = max(0, roomPrice + gstTax − advancePayment − receiveBalance)
            = max(0, 1,000 + 50 − 0 − 0) = ₹1,050  ✅
```

All four fields are already available in `detail.roomInfo` after `orderFromAPI.order(raw)`:
- `detail.roomInfo.roomPrice`       ← `api.room_info.room_price` ✅
- `detail.roomInfo.gstTax`          ← `api.room_info.gst_tax` (BUG-401 confirmed) ✅
- `detail.roomInfo.advancePayment`  ← `api.room_info.advance_payment` ✅
- `detail.roomInfo.receiveBalance`  ← `api.room_info.receive_balance` ✅

### Path A — override `roomInfo` in PmsCheckoutDrawer before passing to CollectPaymentPanel
CollectPaymentPanel reads `roomInfo.roomPaymentSummary.remainingRoomBalance` first. Injecting the computed value there makes it use the correct balance without touching CollectPaymentPanel (R5 hotspot avoided).

### Affected files

| File | Change | Risk |
|------|--------|------|
| `src/components/pms/PmsCheckoutDrawer.jsx` | Override `roomInfo.roomPaymentSummary.remainingRoomBalance` at CollectPaymentPanel prop (~L271) | MEDIUM (inline JSX override, no logic change to CollectPaymentPanel) |

---

## Gate 3 — Implementation Plan

### Edit E1 — Inject computed `remainingRoomBalance` into `roomInfo` prop

| Field | Value |
|-------|-------|
| File | `src/components/pms/PmsCheckoutDrawer.jsx` |
| Line | ~L271 (inside `<CollectPaymentPanel ...>` JSX block) |
| Current | `roomInfo={detail.roomInfo \|\| null}` |
| New | See below |

```jsx
// BUG-425 Path A: override remainingRoomBalance with live formula
// (roomPrice + gstTax - advance - received) so cashier sees GST-inclusive balance.
// Does NOT touch CollectPaymentPanel (R5 hotspot avoided — OD-425-01).
roomInfo={detail.roomInfo ? {
  ...detail.roomInfo,
  roomPaymentSummary: {
    ...(detail.roomInfo.roomPaymentSummary ?? {}),
    remainingRoomBalance: Math.max(0,
      (detail.roomInfo.roomPrice       ?? 0) +
      (detail.roomInfo.gstTax          ?? 0) -
      (detail.roomInfo.advancePayment  ?? 0) -
      (detail.roomInfo.receiveBalance  ?? 0)
    ),
  },
} : null}
```

**Lines changed:** 1 line replaced with ~10 lines. No new imports needed.

---

## Verification Matrix — 6 Required Scenarios (OD-425-02)

| # | Scenario | Expected ROOM | Expected Grand Total | Method |
|---|----------|---------------|---------------------|--------|
| 1 | room ₹1,000 + GST ₹50, advance ₹0, no payments | ₹1,050 | ₹1,050 + F&B | Browser folio → checkout |
| 2 | room ₹1,000 + GST ₹50, advance ₹130 | ₹920 | ₹920 + F&B | Browser |
| 3 | room ₹1,000 + GST ₹50, mid-stay payment ₹500 received | ₹550 | ₹550 + F&B | Browser |
| 4 | room + F&B transferred (₹107) + room orders (₹107) | ₹1,050 + ₹107 + ₹107 = ₹1,264 | ₹1,264 | Browser |
| 5 | Guest checked in via OLD modal | Same formula, correct result | ✅ | Browser |
| 6 | Guest checked in via new CheckInPage | Same formula, correct result | ✅ | Browser |
| + | Checkout button amount matches Grand Total | Same number | ✅ | Visual |
| + | No compile error | webpack 0 warnings | — | — |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-425 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: `components/pms/PmsCheckoutDrawer.jsx` + BUG-425
- [ ] Code marker: `// BUG-425` in E1
- [ ] Compile: 0 new warnings

---

```
Planning complete: BUG-425
Stage: Impact Analysis + Implementation Plan (Gates 2+3)
Code reality: CONFIRMED BUG (roomInfo passed without balance override, L271)
Risk: HIGH (financial display at checkout)
Files WILL change: src/components/pms/PmsCheckoutDrawer.jsx (~10 lines, L271)
Files WILL NOT touch: CollectPaymentPanel.jsx (R5 hotspot), orderTransform.js, all others
Owner decisions: OD-425-01 + OD-425-02 resolved
Next: Gate 4 GO / Implementation
```
