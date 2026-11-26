# BUG-491 — In-House Balance + Discount Display: 4-issue batch (pmsService formula + static balance_due + Percent badge + CollectPaymentPanel total)

**ID:** BUG-491
**Type:** BUG (batch — 4 sub-issues)
**Date:** 2026-10-05
**Registered by:** Intake agent (session 2026-10-05)
**Status:** GATE_1_INTAKE
**Sprint:** oct_bug_batch
**Risk:** HIGH
**Severity:** P1
**Related:** CR-407, BUG-489, BUG-490 (same discount feature area)

---

## Description

After CR-407 + BUG-489 implemented the room discount feature, four display/calculation gaps were discovered via owner screenshots and confirmed by live curl probe (`get-single-order-new`, order 1232970, parth r1 suite RID 69).

---

## Sub-issues

### Sub-A — Balance column shows wrong amount after check-in (discount + GST both missing)

**Owner symptom:** BALANCE column shows ₹5,345 after discounted check-in. Expected: ₹3,000 (= room ₹6,700 − discount ₹2,680 − paid ₹1,355 + GST ₹335).

**Root cause (probe-confirmed):**
`pmsService.getInHouseGuests()` Step 3 formula (line 108):
```javascript
const roomBalance = Math.max(0, rp + gt - ap - rb);
// rp = room_price = 6700
// gt = ri.gst_tax = 0  ← ABSENT from room_info (see Sub-A2)
// ap = advance_payment = 1355
// rb = receive_balance = 0  ← absent from room_info
// result = 5,345  ← discount (2680) never subtracted, GST (335) never added
```

**Two gaps in the same line:**
1. `room_discount_amount` (2680) not subtracted — backend sends it in `room_info`, FE ignores it
2. `gst_tax` absent from `room_info` response — FE reads `ri.gst_tax ?? 0 = 0`

**Probe evidence (`room_info` from live API):**
```json
{
  "room_price": "6700.00",
  "advance_payment": "1355.00",
  "balance_payment": "2665.00",   ← backend pre-computes: 6700-2680-1355 (no GST)
  "room_discount_amount": "2680.00",
  "room_discount_type": "Percent",
  "room_discount_at": "check_in"
  // gst_tax: ABSENT
}
```

**Fix:** Use `ri.balance_payment` (backend pre-computed, already includes discount) + add GST from `row.charge.sgst + row.charge.cgst` (booking snapshot):
```javascript
const bp = ri.balance_payment != null ? Number(ri.balance_payment) : null;
const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
const roomBalance = bp != null
  ? Math.max(0, bp + chargeGst)         // 2665 + 335 = 3,000 ✅
  : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0)); // fallback
```

**File:** `api/services/pmsService.js` — lines 104–108 (Step 3 formula)

---

### Sub-B — Balance due line static in check-in + checkout UI (doesn't update as discount is typed)

**Owner symptom:** Entering 40% discount shows −₹2,680 badge but "Balance due ₹6,335" never changes.

**Root cause (static trace):**
- `CheckInForm.jsx` line 163: `{fmtINR(c.balance_due)}` — hardcoded from booking snapshot
- `FolioCheckoutPanel.jsx` line 137: `<Line label="Room balance" value={fmtINR(c.balance_due)} />` — also hardcoded

Neither is connected to `roomDiscountRs` (CheckInForm) or the equivalent computed ₹ value (FolioCheckoutPanel).

**Fix:**
```jsx
// CheckInForm.jsx line 163:
{fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))}

// FolioCheckoutPanel.jsx — needs roomDiscountRs useMemo first (Sub-C), then:
<Line label="Room balance" value={fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))} testId="bill-room-balance" bold />
```

**Files:** `CheckInForm.jsx:163` + `FolioCheckoutPanel.jsx:137`

---

### Sub-C — Checkout discount badge shows raw % number instead of computed ₹ (Percent mode only)

**Owner symptom:** Entering 10% discount shows badge −₹10 instead of −₹568.

**Root cause (static trace):**
`FolioCheckoutPanel.jsx` RoomSection line 57:
```jsx
{fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscount : 0)}
// roomDiscount state = 10 (raw input)
// For Amount mode: correct (raw = ₹)
// For Percent mode: wrong (raw = %, should show ₹ computed from balanceDue × pct/100)
```

There is no `roomDiscountRs` useMemo in `FolioCheckoutPanel` — the computed ₹ is only calculated inside `handlePaid()` as a local variable.

**Fix:** Add `roomDiscountRs` useMemo to `FolioCheckoutPanel` (mirrors CheckInForm pattern), then use it for the badge and balance display (Sub-B):
```javascript
const roomDiscountRs = useMemo(() => {
  if (!roomDiscount || roomApplyTo === 'food') return 0;
  const balanceDue = Number(c.balance_due || 0);
  if (roomDiscountType === 'Percent') {
    return Math.min(Math.floor(balanceDue * roomDiscount / 100), balanceDue);
  }
  return Math.min(Math.floor(roomDiscount), balanceDue); // BUG-490: cap at balance_due
}, [roomDiscount, roomDiscountType, roomApplyTo, c.balance_due]);
```

**File:** `FolioCheckoutPanel.jsx` — new useMemo + badge line 57

---

### Sub-D — CollectPaymentPanel total (right side) unchanged by room discount

**Owner symptom:** 10% room discount shown on left (−₹10/−₹568), but right panel still shows ₹5,680 ("Checkout ₹5,680").

**Root cause (static trace):**
`FolioCheckoutPanel.jsx` line 276:
```jsx
<CollectPaymentPanel total={order.amount || 0} ... />
// order.amount = F&B/order total = ₹5,680 (pre-discount)
// Room discount injected in handlePaid() as payload.room_discount — server-side adjustment
// CollectPaymentPanel has no knowledge of the room discount amount
```

**Owner decision needed (OD-491-D-01):** Should the right panel total be adjusted by the room discount?
- Option A: Subtract `roomDiscountRs` from the displayed total → `total={Math.max(0, (order.amount || 0) - roomDiscountRs)}`
  - Risk: CollectPaymentPanel total would differ from `order.amount` — cashier collects less
- Option B: Leave total as-is, add a visible "Room discount: −₹X" line in the payment panel
- Option C: Keep current behavior — discount is server-side, cashier enters the full amount and server reconciles

**File:** `FolioCheckoutPanel.jsx` line 276 (pending OD-491-D-01)

---

## Duplicate Check

| Related ID | Relationship | Status |
|------------|-------------|--------|
| BUG-401 | DISTINCT — that fixed `orderTransform.js → roomInfo.gstTax` for PmsCheckoutDrawer. This is `pmsService.getInHouseGuests()` reading raw `ri.gst_tax` from a different code path | GATE_5A_IMPLEMENTED |
| BUG-386 | DISTINCT — that fixed check-in sending `gst_tax=0`. This is balance column reading | GATE_5A_IMPLEMENTED |
| BUG-426/427 | DISTINCT — those fixed folio balance totals. This is in-house table BALANCE column | GATE_5A_IMPLEMENTED |
| CR-407 | RELATED PARENT — introduced the discount; these are display gaps missed in CR-407 | GATE_5A_IMPLEMENTED |
| BUG-489 | RELATED PARENT — extended discount to CheckInForm | GATE_5A_IMPLEMENTED |
| BUG-490 | RELATED — discount cap issue (different gap) | GATE_1_INTAKE |

**Duplicate check: DISTINCT for all sub-issues**

---

## Code Reality

**NONE** — no fix logic in place for any sub-issue (grep confirmed).

---

## Severity

**P1 — HIGH**
- Sub-A: Cashier's BALANCE column shows ₹5,345 when true balance is ₹3,000 — financial display error
- Sub-B: Discount entered but UI doesn't show updated balance — cashier cannot confirm discount before confirming
- Sub-C: Badge shows ₹10 for 10% → misleading — cashier cannot verify discount amount
- Sub-D: Payment panel shows ₹5,680 — cashier uncertain how much to collect after discount

---

## Risk Classification

**HIGH**
- Sub-A: `pmsService.js` — core balance formula for all in-house guests (not hotspot but high data impact)
- Sub-B: CheckInForm + FolioCheckoutPanel — display only, 1 line each
- Sub-C: FolioCheckoutPanel — display + new useMemo, no financial formula
- Sub-D: FolioCheckoutPanel line 276 — pending owner decision (OD-491-D-01)

---

## Evidence

- **Screenshots (owner-provided, 2026-10-05):** 5 screenshots showing all 4 issues
- **Curl probe (2026-10-05):** `get-single-order-new` order 1232970
  - `room_discount_amount: 2680` confirmed present in room_info ✅
  - `gst_tax` confirmed ABSENT from room_info ✅
  - `balance_payment: 2665` confirmed (backend pre-computes room balance) ✅
- **Evidence file:** `evidence/BUG-491/get_single_order_room_info_1232970.json`
- **Source:** OWNER-REPORTED + AGENT-CONFIRMED (static trace + curl probe)
- **Confidence:** HIGH (all sub-issues)

---

## Blast Radius

| File | Sub-issues | Change |
|------|-----------|--------|
| `api/services/pmsService.js` | Sub-A | ~5 lines: replace formula at line 108 using `ri.balance_payment + chargeGst` |
| `components/pms/frontdesk/CheckInForm.jsx` | Sub-B | 1 line: `c.balance_due - roomDiscountRs` in balance display |
| `components/pms/frontdesk/FolioCheckoutPanel.jsx` | Sub-B, Sub-C, Sub-D | ~8 lines: `roomDiscountRs` useMemo + badge fix + balance line + optional total adjust |

- **3 files total, no R5 hotspots**
- **Blast radius: SMALL–MEDIUM**

---

## Open Owner Decisions

| ID | Sub | Question | Options | Recommendation |
|----|-----|---------|---------|---------------|
| OD-491-D-01 | Sub-D | Should CollectPaymentPanel total reflect room discount? | A: subtract roomDiscountRs from total · B: add discount line in panel · C: keep server-side (current) | **LOCKED = Option B** (2026-10-05) — add "Room discount applied: −₹X" info line in right panel; Checkout total stays at balance_due (₹5,680 incl. GST); server applies discount via payload |

**All ODs LOCKED. Gate 3 can proceed for all sub-issues (A, B, C, D).**

---

## Next

Planning Gate 2 → Gate 3 → Gate 4 GO → Implementation.
Sub-A + Sub-B + Sub-C can be planned and implemented together (3 files).
Sub-D waits for OD-491-D-01 (now locked: Option B — add "Room discount applied: −₹X" info line).
