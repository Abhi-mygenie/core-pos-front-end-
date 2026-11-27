# BUG-491 — Impact Analysis (Gate 2)

**ID:** BUG-491
**Title:** In-House Balance + Discount Display: 4-issue batch (pmsService formula + static balance_due + Percent badge + CollectPaymentPanel total)
**Date:** 2026-10-05
**Role:** PLANNING (Gate 2)
**Code Reality:** NONE — no fix logic for any sub-issue (grep confirmed in intake)
**Risk:** HIGH
**Severity:** P1

---

## Conflict Pre-Check

| File | Last Modified By | Date | Overlap? |
|------|-----------------|------|---------|
| `api/services/pmsService.js` | CR-407-A (fd.append room_discount block, ~L243) | 2026-10-05 | Sub-A targets lines 103-108 — no overlap with CR-407-A edits; **parallel-safe** |
| `CheckInForm.jsx` | BUG-489 (lines 57-65); BUG-490 target (lines 58-65, 186) | 2026-10-05 | Sub-B only touches **line 163** — no overlap with BUG-489 or BUG-490; parallel-safe |
| `FolioCheckoutPanel.jsx` | CR-407 (lines 57, 80, 83, 137, 179-186) | 2026-10-05 | Sub-C: new useMemo after L186, badge L57 — L57 overlap with BUG-490 (BUG-490 does not touch L57). Sub-B: L137 — not touched by BUG-490. Sub-D: near CollectPaymentPanel L274-291 — not touched by BUG-490. All **parallel-safe** with BUG-490 |

**Execution rule within FolioCheckoutPanel:** Sub-C useMemo BEFORE Sub-B (Sub-B uses `roomDiscountRs` from Sub-C). Sub-D independent. Recommend implementing all BUG-491 + BUG-490 changes to FolioCheckoutPanel in one pass in this order: Sub-C useMemo → Sub-C badge (L57) → Sub-B balance line (L137) → Sub-D info note → BUG-490 max (L80) + onChange (L83).

---

## Sub-A — pmsService.js Balance Formula

### Data Flow Trace
```
getInHouseGuests() Step 3 →
  ri = raw.room_info               // from get-single-order-new folio call
  rp = ri.room_price = 6700
  gt = ri.gst_tax = 0              // ABSENT from room_info — always reads 0
  ap = ri.advance_payment = 1355
  rb = ri.receive_balance = 0
  roomBalance = rp + gt - ap - rb = 5345   ← WRONG (discount 2680 never subtracted, GST 335 absent)
```

### Code Reality
**File:** `src/api/services/pmsService.js` — lines 103-108

```javascript
const ri = raw.room_info ?? {};
const rp = Number(ri.room_price      ?? 0);  // 6700
const gt = Number(ri.gst_tax         ?? 0);  // 0 — gst_tax ABSENT from room_info API response
const ap = Number(ri.advance_payment ?? 0);  // 1355
const rb = Number(ri.receive_balance ?? 0);  // 0
const roomBalance = Math.max(0, rp + gt - ap - rb);  // 5345 ← wrong
```

**Two gaps confirmed by live probe (order 1232970):**
1. `ri.room_discount_amount = "2680.00"` present in room_info — FE ignores it
2. `ri.gst_tax` absent from room_info — FE reads 0; GST actually lives in `row.charge.sgst + row.charge.cgst`

**Fix — use `ri.balance_payment` (backend pre-computes room_price - discount - advance = 2665) + chargeGst from `row.charge`:**
```javascript
// BUG-491 Sub-A: use backend pre-computed balance_payment + charge-level GST
const bp         = ri.balance_payment != null ? Number(ri.balance_payment) : null;
const chargeGst  = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
const roomBalance = bp != null
  ? Math.max(0, bp + chargeGst)         // 2665 + 335 = 3000 ✅
  : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0)); // fallback for orders without balance_payment
```

**Note for Implementation agent:** `row` is available in the `rows.forEach(row => { ... })` loop that wraps this code (line 99). `row.charge` is the charge object from the reservation row — `row.charge?.sgst ?? 0` is safe (defaults to 0 if absent).

**Lines to verify before coding:**
- L99: `rows.forEach(row => {` — `row` is in scope ✅
- L103: `const ri = raw.room_info ?? {};` — starting point ✅
- L104-108: formula lines to replace ✅

---

## Sub-B — Static Balance Due Display

### CheckInForm.jsx

**File:** `src/components/pms/frontdesk/CheckInForm.jsx` — line 163

```jsx
// Current (static):
<span ... data-testid="checkin-bill-balance">{fmtINR(c.balance_due)}</span>

// Fixed (reactive):
<span ... data-testid="checkin-bill-balance">{fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))}</span>
```

**`roomDiscountRs` is in scope** at line 163 — defined at lines 58-65 (BUG-490 will modify this useMemo to cap at `c.balance_due`; BUG-491 Sub-B depends on the post-BUG-490 version).

### FolioCheckoutPanel.jsx

**File:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — line 137

```jsx
// Current (static):
<Line label="Room balance" value={fmtINR(c.balance_due)} testId="bill-room-balance" bold />

// Fixed (reactive — depends on Sub-C roomDiscountRs being added first):
<Line label="Room balance" value={fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))} testId="bill-room-balance" bold />
```

**Dependency:** `roomDiscountRs` is NOT yet in scope in `RoomSection` — Sub-C must add the useMemo first. Implementation order: Sub-C useMemo → then Sub-B line 137.

---

## Sub-C — FolioCheckoutPanel Percent Badge Shows Raw %

### Code Reality
**File:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — line 57

```jsx
// Current (wrong for Percent mode):
{roomDiscount > 0 && <span ... data-testid="bill-room-discount-applied">
  −{fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscount : 0)}
</span>}
// roomDiscount state = 10 (raw % input) → shows −₹10 instead of −₹568
```

**No `roomDiscountRs` useMemo exists in FolioCheckoutPanel** — `roomDiscount` is raw state; `roomDiscountRs` is only computed inside `handlePaid()` as a local variable (lines 218-220), not in component scope.

### Fix — Add roomDiscountRs useMemo to FolioCheckoutPanel

Insert after state declarations (after line 186):

```javascript
// BUG-491 Sub-C: compute discount in ₹ for badge + balance display
const roomDiscountRs = useMemo(() => {
  if (!roomDiscount || roomApplyTo === 'food') return 0;
  const balanceDue = Number(c?.balance_due || 0);  // NOTE: c is defined in RoomSection, not in FolioCheckoutPanel main
  if (roomDiscountType === 'Percent') {
    return Math.min(Math.floor(balanceDue * roomDiscount / 100), balanceDue);
  }
  return Math.min(Math.floor(roomDiscount), balanceDue); // BUG-490 cap absorbed for Percent; Amount cap via onChange
}, [roomDiscount, roomDiscountType, roomApplyTo, c?.balance_due]);
```

> **IMPORTANT NOTE for Implementation agent:** `FolioCheckoutPanel` (the main export at line 170) does NOT have direct access to `c` — that is defined inside `RoomSection` (line 40). The `roomDiscountRs` useMemo must either:
>
> **Option A (recommended):** Be placed INSIDE `RoomSection` component (after line 41), with `c.balance_due` directly available. Then pass `roomDiscountRs` as a prop down from `RoomSection` to `Statement`, or simply read the badge inside `RoomSection` where it's already rendered (line 57 is inside `RoomSection`).
>
> **Option B:** Derive `balanceDue` from `row.charge?.balance_due` inside `FolioCheckoutPanel` main, then thread it as a prop.
>
> Since line 57 (badge) and line 137 (balance line) are both INSIDE `RoomSection`, and `c.balance_due` is in scope there, **Option A is correct and simpler**. The useMemo should go inside `RoomSection` after line 41.

**Badge fix (line 57) — after adding useMemo inside RoomSection:**
```jsx
// Current:
{roomDiscount > 0 && <span ... data-testid="bill-room-discount-applied">−{fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscount : 0)}</span>}

// Fixed:
{roomDiscountRs > 0 && <span ... data-testid="bill-room-discount-applied">−{fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscountRs : 0)}</span>}
```

---

## Sub-D — CollectPaymentPanel Info Note (OD-491-D-01 LOCKED = Option B)

**OD-491-D-01 LOCKED:** Option B — add "Room discount applied: −₹X" info line in right panel. Checkout total stays at `order.amount` (₹5,680 incl. GST); server applies discount via `room_discount` payload on submit.

**File:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — after line 276 (inside CollectPaymentPanel wrapper area)

**`roomDiscountRs` is NOT available in `FolioCheckoutPanel` main scope** (it's inside `RoomSection`). The info note must use the FolioCheckoutPanel-level `roomDiscount` state + `roomDiscountType` + `row.charge?.balance_due` to compute a parallel `roomDiscountRs` value for display, OR pass it up from RoomSection.

**Simplest correct approach:** Compute the display amount inline in the info note JSX:
```jsx
// BUG-491 Sub-D: info note for room discount (OD-491-D-01 Option B)
{roomDiscount > 0 && roomApplyTo !== 'food' && (() => {
  const bd = Number(row.charge?.balance_due || 0);
  const discRs = roomDiscountType === 'Percent'
    ? Math.min(Math.floor(bd * roomDiscount / 100), bd)
    : Math.min(Math.floor(roomDiscount), bd);
  return discRs > 0 ? (
    <div className="text-[11px] text-[#329937] px-3 pb-1" data-testid="bill-room-discount-info">
      Room discount applied: −{fmtINR(discRs)}
    </div>
  ) : null;
})()}
```

Insert this block INSIDE the right panel div (after line 272 `<div ... data-testid="bill-right">`), BEFORE the `<Suspense>` wrapping CollectPaymentPanel.

**`row.charge` is available in `FolioCheckoutPanel` main scope** — `row` is a prop (line 170 `export const FolioCheckoutPanel = ({ row, meta, onDone, onClose }) =>`). `row.charge?.balance_due` is safe.

---

## Risk Assessment

| Sub | Risk Factor | Assessment |
|-----|-------------|-----------|
| Sub-A | pmsService.js balance formula change | HIGH — all in-house BALANCE column affected for every discounted check-in. BUT: using `ri.balance_payment` (backend authoritative) is strictly more correct; fallback preserved for non-discounted stays. |
| Sub-B | Display-only line update | LOW — no formula change; subtracts existing `roomDiscountRs` from existing `c.balance_due` |
| Sub-C | New useMemo + badge fix | LOW — display-only; new useMemo is pure (no side effects) |
| Sub-D | Info line near CollectPaymentPanel | LOW — additive JSX only; does NOT change `total` prop on CollectPaymentPanel |
| Overall | | **HIGH** (Sub-A touches core in-house balance column for all discounted stays) |

---

## Downstream Consumers

| Consumer | Impact |
|----------|--------|
| `InHouseGuestsPage.jsx` — BALANCE column | Sub-A fix: `row.balance` will now reflect correct 3,000 instead of 5,345 |
| CheckInForm discount badge (`checkin-bill-balance`) | Sub-B fix: shows live balance after discount |
| FolioCheckoutPanel Room balance (`bill-room-balance`) | Sub-B + Sub-C fix: reactive |
| FolioCheckoutPanel discount badge (`bill-room-discount-applied`) | Sub-C fix: shows ₹ instead of raw % |
| CollectPaymentPanel total (right panel) | Sub-D: `total` prop unchanged — info note added above it |
| `handlePaid()` payload computation (lines 215-225) | NO change — local `roomDiscountRs` in handlePaid is independent and already correct for payload |

---

## Owner Decisions

**All ODs locked.** OD-491-D-01 = Option B (info note, total unchanged). Gate 3 can proceed for all sub-issues (A, B, C, D).

---

## Verification Matrix (seeds QA)

| Edit # | File | Sub | Change | How to Verify |
|--------|------|-----|--------|---------------|
| E1 | pmsService.js L103-108 | A | Replace formula with `bp + chargeGst` | In-house table BALANCE = ₹3,000 for order 1232970 |
| E2 | pmsService.js | A | Fallback for `bp == null` | No-discount stays: BALANCE column unchanged |
| E3 | CheckInForm.jsx L163 | B | `Math.max(0, c.balance_due - roomDiscountRs)` | Enter 40% discount → "Balance due" updates to ₹3,655 |
| E4 | FolioCheckoutPanel.jsx (new in RoomSection) | C | `roomDiscountRs` useMemo inside RoomSection | Computed value matches manual calculation |
| E5 | FolioCheckoutPanel.jsx L57 | C | Badge uses `roomDiscountRs` not `roomDiscount` | 10% on ₹5,680 → badge shows −₹568 (not −₹10) |
| E6 | FolioCheckoutPanel.jsx L137 | B | `Math.max(0, c.balance_due - roomDiscountRs)` | Enter 10% → "Room balance" updates live |
| E7 | FolioCheckoutPanel.jsx (near L274) | D | Info note above CollectPaymentPanel | Info note visible: "Room discount applied: −₹568" |
| E8 | FolioCheckoutPanel.jsx | D | `total` prop on CollectPaymentPanel unchanged | Right panel total still shows ₹5,680 |

---

## Implementation Order (MANDATORY)

Within FolioCheckoutPanel.jsx, execute in this sequence:
1. **Sub-C** — add `roomDiscountRs` useMemo inside `RoomSection` (after line 41)
2. **Sub-C badge** — update line 57 to use `roomDiscountRs`
3. **Sub-B** — update line 137 to use `roomDiscountRs`
4. **Sub-D** — add info note near CollectPaymentPanel

Sub-A (`pmsService.js`) and Sub-B in CheckInForm.jsx are independent — can be done in any order.

---

## Scope Lock

**WILL change:**
- `src/api/services/pmsService.js` — lines 103-108 (Sub-A, balance formula)
- `src/components/pms/frontdesk/CheckInForm.jsx` — line 163 (Sub-B, balance display)
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — new useMemo in RoomSection (Sub-C), line 57 (Sub-C badge), line 137 (Sub-B), info note near L274 (Sub-D)

**WILL NOT touch:**
- `CollectPaymentPanel.jsx` — R5 hotspot, `total` prop left as `order.amount || 0`
- `orderTransform.js` — R5 hotspot
- `DashboardPage.jsx` — R5 hotspot
- `handlePaid()` payload logic — already correct for submission
- Any other file not in the 3-file scope above

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-491 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-491 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add all 3 files with BUG-491 marker
- [ ] Code markers: // BUG-491 Sub-A/B/C/D comment at every modified site (8 sites)
```
