# CR-407 — Impact Analysis

**ID:** CR-407
**Gate:** 2 — IMPACT ANALYSIS
**Date:** 2026-10-05
**Risk:** CRITICAL
**Code Reality:** PARTIAL (CR-405-A did apply_to='room' + Amount; remaining 3 sub-scopes absent)
**Conflict pre-check:**
- `FolioCheckoutPanel.jsx`: last modifier CR-405-A (GATE_5B_QA_PASSED) — CLEAN
- `pmsService.js`: last modifier CR-380, BUG-396 (closed) — CLEAN
- `CheckInPage.jsx`: BUG-419 + BUG-420 at GATE_3_PLAN_COMPLETE, Gate 4 NOT given — ⚠ POTENTIAL CONFLICT (declare execution order in plan)

---

## 1. Sub-scope A — Check-in discount (CheckInPage + pmsService)

### Data flow
```
CheckInPage
  → user enters room_discount (₹ or %)
  → FE computes ₹: roomDiscountRs = (type='Percent') ? floor(orderAmount × pct/100) : amt
  → pmsCheckIn({..., roomDiscount: roomDiscountRs, roomDiscountType, roomDiscountValue})
  → pmsService.pmsCheckIn() → fd.append('room_discount', ...) [conditional — only if > 0]
  → POST /api/v1/vendoremployee/pos/user-group-check-in (multipart)
  → BE subtracts room_discount from UID balance_payment automatically (confirmed)
  → balance_payment sent by FE: UNCHANGED (pre-discount; BE applies discount server-side)
```

### Affected files (Sub-scope A)
| File | Lines | Change |
|------|-------|--------|
| `pages/pms/CheckInPage.jsx` | ~57 area (state) + ~250 (formValid) + ~316 (pmsCheckIn call) + ~800 (UI form) | Add 2 state vars + useMemo + UI row + call params |
| `api/services/pmsService.js` | After line 282 (after firm_gst) | Append 4 discount fields conditionally |

### Conflict with BUG-419, BUG-420
BUG-419 (Corp/B2B checkbox position) and BUG-420 (returning guest docs) both have Gate 3 complete plans on `CheckInPage.jsx`. **Execution order declaration:** CR-407 Sub-scope A executes AFTER BUG-419 + BUG-420 reach Gate 5A, OR parallel-safe if edits are in distinct line zones (state block, formValid, pmsCheckIn call, UI form — likely non-overlapping with B2B/doc changes). Planning agent to verify at implementation time using Step 0 Entry Verification.

---

## 2. Sub-scope B — Checkout apply_to expansion + Percent type (FolioCheckoutPanel)

### Data flow
```
FolioCheckoutPanel
  → RoomSection UI: apply_to selector ('room'|'both'), Amount/Percent toggle, input
  → When Percent: roomDiscountRs = floor(row.charge.balance_due × pct/100)
  → handlePaid injects into payload post-collectBillExisting:
      apply_to='room':  room_discount + apply_to='room' (current CR-405-A behavior)
      apply_to='both':  room_discount + apply_to='both' (new)
      apply_to='food':  no room_discount injected; food discount via CollectPaymentPanel
  → room_discount_type: 'Amount'|'Percent' in payload
  → room_discount_value: raw input (% or ₹)
  → room_discount_reason: unchanged
```

### Affected files (Sub-scope B)
| File | Lines | Change |
|------|-------|--------|
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | L39 (RoomSection props), L57-75 (RoomSection JSX), L85 (Statement props), L116-117 (state), L145-152 (handlePaid inject), L159 (deps) | Add 2 state vars + apply_to selector + Percent toggle + updated inject logic |

### `apply_to='food'` note
No extra `room_discount` fields sent — food discount flows through CollectPaymentPanel's existing discount UI (unchanged). FolioCheckoutPanel only needs a "Food only" option in the apply_to selector which, when chosen, skips room_discount injection entirely.

---

## 3. Sub-scope C — partial_payments_room (FolioCheckoutPanel)

### Data flow
```
FolioCheckoutPanel
  → RoomSection UI: "Split room payment" toggle + leg rows (mode select + amount input)
  → state: roomSplitLegs = [{mode:'cash',amount:''}, ...]
  → handlePaid: if any leg.amount > 0 → add partial_payments_room[] to payload
  → partial_payments_room: [{payment_mode, payment_amount}] legs
  → BE writes one restaurant_room_payments row per leg (confirmed by curl probe)
  → F&B partial_payments untouched (completely separate)
```

### Affected files (Sub-scope C)
| File | Lines | Change |
|------|-------|--------|
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | L116-117 (state) + RoomSection JSX + L145-159 (handlePaid) | Add 2 state vars + room split UI + payload injection |

---

## 4. Full file summary

| File | Sub-scope(s) | Risk | R5? |
|------|-------------|------|-----|
| `pages/pms/CheckInPage.jsx` | A | CRITICAL | NO |
| `api/services/pmsService.js` | A | CRITICAL | NO |
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | B + C | CRITICAL | YES |

Estimated edits: ~15 lines pmsService, ~50 lines CheckInPage, ~70 lines FolioCheckoutPanel.

## 5. Owner decisions — all resolved
OD-407-01: % toggle YES, FE computes ₹. OD-407-02: both = F&B fields + room_discount apply_to='both'. OD-407-03: alongside, additive. No remaining ODs.
