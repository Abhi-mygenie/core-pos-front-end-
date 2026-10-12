# BUG-519 — IMPLEMENTATION PLAN (Gate 3)

**ID:** BUG-519
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 3)
**Risk:** HIGH (structural JSX change, touches room billing display)
**ODs:** OD-519-01=YES · OD-519-02=a · OD-519-03=a
**Awaiting:** Gate 4 GO before any code change
**DEPENDS ON:** BUG-517 + BUG-518 must be implemented first (formulas must be stable before restructuring)

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — structural JSX restructure (~60 lines moved/added)

**Files will NOT touch:** Any other file

---

## Conflict Pre-Check

FolioCheckoutPanel.jsx was last modified by BUG-517 and BUG-518 (same session). BUG-519 is the final structural step. Must run after both formula fixes are complete.

---

## Code Reality: PARTIAL

The two-panel layout exists. Room discount controls are currently inside `Statement`/`RoomSection` (left). This plan moves them to the right panel.

---

## Target Layout (OD-519-01/02/03)

```
fd-bill-grid:
│
├── bill-left (read-only dynamic summary)
│   └── Statement (read-only version)
│       ├── Guest header
│       ├── RoomSection (read-only)
│       │   ├── Booking amount
│       │   ├── Check-in discount (if any)
│       │   ├── Room discount: −₹X  ← NEW read-only line (OD-519-01)
│       │   ├── SGST / CGST
│       │   ├── Already paid
│       │   └── Room balance (after discount)
│       ├── Room orders
│       └── Transferred
│
└── bill-right (all operations)
    ├── [RoomDiscountControls] ← MOVED FROM LEFT (OD-519-02=a, above CollectPaymentPanel)
    │   ├── Room/Both/F&B only selector
    │   ├── Amount/Percent toggle + input + reason
    │   ├── discountOverMax alert
    │   └── Split room payment (OD-519-03=a, also moves to right)
    └── [CollectPaymentPanel] ← unchanged
```

---

## Entry Verification (after BUG-517 + BUG-518 are implemented)

```bash
grep -n "bill-left\|bill-right\|Statement\|RoomSection\|RoomDiscountControls" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Must show existing structure with bill-left/bill-right present
# RoomDiscountControls should NOT be present yet
```

---

## Edit E-519-1 — Extract `RoomDiscountControls` component (new, within same file)

Create a new component **before** `Statement` (insert after line ~170 = end of `RoomSection`).

`RoomDiscountControls` receives all interactive state props and renders the controls that currently live inside `RoomSection`:
- Room/Both/F&B only selector (3 buttons)
- Amount/Percent toggle + input + reason input
- discountOverMax alert
- Split room payment toggle + legs

**Props signature:**
```jsx
const RoomDiscountControls = ({
  c, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason,
  roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo,
  roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs,
  maxCheckoutDiscount, baseBalance, discountOverMax, maxPct, roomDiscountInfoRs,
}) => { // BUG-519: moved from RoomSection/Statement to bill-right panel (OD-519-02=a, OD-519-03=a)
```

**Body:** Exact JSX currently inside `RoomSection` between lines ~74-162 (the discount selector block + split payment block), cut from RoomSection and pasted here verbatim with `// BUG-519` marker.

---

## Edit E-519-2 — Simplify `RoomSection` to read-only display

Remove from `RoomSection`:
- All setter props (`setRoomDiscount`, `setRoomDiscountReason`, `setRoomDiscountType`, `setRoomApplyTo`, `setRoomSplitEnabled`, `setRoomSplitLegs`)
- Interactive JSX blocks: Room discount input group (lines ~74-125), split payment block (lines ~126-162)
- `roomDiscountRs` useMemo (moved to `RoomDiscountControls`)
- `maxPct` useMemo (moved to `RoomDiscountControls`)
- `discountOverMax` computed value (reference from parent now)

Add to `RoomSection`:
- `roomDiscountInfoRs` prop (replaces computed `roomDiscountRs`)
- Read-only room discount display line (OD-519-01):

```jsx
{/* BUG-519 OD-519-01: read-only discount line on left when discount applied */}
{roomDiscountInfoRs > 0 && (
  <Line label="Room discount" value={`−${fmtINR(roomDiscountInfoRs)}`}
    testId="bill-room-discount-applied-left" muted />
)}
```

**Simplified `RoomSection` signature:**
```jsx
const RoomSection = ({ row, checkInDiscountAmt = 0, upgrade, roomDiscountInfoRs = 0,
  baseBalance = null, displaySgst = null, displayCgst = null }) => { // BUG-519: read-only
```

---

## Edit E-519-3 — Simplify `Statement` component

Remove from `Statement`: all discount setter props (set-functions), `foodDiscountRs` prop, F&B preview JSX block.

Add: `roomDiscountInfoRs` prop (for passing to `RoomSection`).

**New signature:**
```jsx
const Statement = ({ row, folio, checkInDiscountAmt = 0,
  roomDiscountInfoRs = 0, baseBalance, displaySgst, displayCgst }) => { // BUG-519
```

`Statement` now only renders:
- Guest header
- `RoomSection` (read-only, passing `roomDiscountInfoRs`)
- Room orders (existing)
- Transferred (existing)

---

## Edit E-519-4 — Restructure bill-right panel layout

**Current bill-right (L378-408):**
- `{roomDiscountInfoRs > 0 && <info note>}` (small note)
- `<CollectPaymentPanel ...>`

**New bill-right:**
```jsx
<div className={`frontdesk-bill bill-right rounded-xl border border-[#E5E5E5]...`} data-testid="bill-right">
  {/* BUG-519 OD-519-02=a: Room discount controls above CollectPaymentPanel */}
  <div className="px-3 pt-3 pb-2 border-b border-[#E5E5E5] text-[12px]" data-testid="bill-room-controls">
    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#767676] mb-1.5">Room discount</div>
    <RoomDiscountControls
      c={row.charge ?? {}}
      roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
      roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
      roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
      roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
      roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
      roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
      maxCheckoutDiscount={maxCheckoutDiscount} baseBalance={baseBalance}
      discountOverMax={discountOverMax} maxPct={roomDiscountMaxPct}
      roomDiscountInfoRs={roomDiscountInfoRs}
    />
  </div>
  {/* BUG-491 Sub-D info note stays (shows total applied) */}
  {roomDiscountInfoRs > 0 && (
    <div className="text-[11px] text-[#329937] px-3 pt-2 pb-1 border-b border-[#E5E5E5]" data-testid="bill-room-discount-info">
      Room discount applied: −{fmtINR(roomDiscountInfoRs)}
    </div>
  )}
  <Suspense ...>
    <CollectPaymentPanel ... />
  </Suspense>
</div>
```

**Note on `roomDiscountMaxPct`:** The `maxPct` value (currently computed inside `RoomSection`) must be lifted to the parent or computed inside `RoomDiscountControls`. Since `RoomDiscountControls` has access to `maxCheckoutDiscount` and `c.booking_charge`, it computes `maxPct` internally. Remove `maxPct` from the prop list above — `RoomDiscountControls` computes it internally from `maxCheckoutDiscount` and `c.booking_charge`.

---

## Edit E-519-5 — bill-left Statement call: simplify props

**Current (after BUG-517):**
```jsx
<Statement row={row} folio={state.data.folio}
  checkInDiscountAmt={...} foodDiscountRs={foodDiscountRs}
  roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
  ... (all discount control props)
  baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
  maxCheckoutDiscount={maxCheckoutDiscount} />
```

**New (read-only summary only):**
```jsx
{/* BUG-519: Statement is now read-only; all controls moved to bill-right */}
<Statement row={row} folio={state.data.folio}
  checkInDiscountAmt={Number(order?.roomInfo?.discountAmount || 0)}
  roomDiscountInfoRs={roomDiscountInfoRs}
  baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
/>
```

---

## Execution Sequence

```
1. Entry verification
2. E-519-1: Create RoomDiscountControls component (cut JSX from RoomSection, paste new component)
3. Compile check after new component
4. E-519-2: Simplify RoomSection (remove interactive props/JSX, add read-only discount line)
5. E-519-3: Simplify Statement (remove setter props, add roomDiscountInfoRs)
6. Compile check
7. E-519-4: Restructure bill-right (add RoomDiscountControls above CollectPaymentPanel)
8. E-519-5: Simplify bill-left Statement call
9. Final compile check — 0 new warnings
10. EXIT GATE 5/5
```

**Critical:** After step 2 (RoomDiscountControls created), verify the cut JSX compiles before removing from RoomSection. Cut-paste not delete-rewrite.

---

## Verification Matrix

| # | Edit | Verification | Auto? |
|---|---|---|---|
| V-1 | RoomDiscountControls component | `grep -n "const RoomDiscountControls" FolioCheckoutPanel.jsx` | YES |
| V-2 | RoomSection read-only line | `grep -n "bill-room-discount-applied-left" FolioCheckoutPanel.jsx` | YES |
| V-3 | bill-right has controls div | `grep -n "bill-room-controls" FolioCheckoutPanel.jsx` | YES |
| V-4 | Statement no setter props | `grep -n "setRoomDiscount" FolioCheckoutPanel.jsx` → only in parent state/RoomDiscountControls | YES |
| V-5 | compile | webpack 0 new warnings | YES |
| V-6 | Visual: controls on right | Browser: Bill panel → Room discount controls in RIGHT panel (above CollectPaymentPanel) | NO |
| V-7 | Visual: left = summary only | Browser: LEFT shows only booking/SGST/CGST/paid/balance/orders — no inputs | NO |
| V-8 | Read-only discount line | Browser: Enter ₹400 discount on right → left panel shows "Room discount: −₹400" | NO |
| V-9 | Split on right | Browser: Split room payment toggle visible in right panel | NO |
| V-10 | CollectPaymentPanel unchanged | Browser: F&B discount, coupon, service charge still work | NO |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Props passed to CollectPaymentPanel unchanged | CollectPaymentPanel is R5 — its props must NOT change. Verify `roomInfo`, `total`, `cartItems` still passed identically. |
| `discountOverMax` used in both RoomDiscountControls + handlePaid | `discountOverMax` stays in parent (computed via parent useMemo). Pass as prop to RoomDiscountControls. |
| `roomDiscountRs` in RoomSection → now uses `roomDiscountInfoRs` | RoomSection's room balance line uses `roomDiscountInfoRs` from prop instead of locally computed `roomDiscountRs`. Verify balance displayed = baseBalance − roomDiscountInfoRs. |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-519 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-519 row updated
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-519, date
- [ ] Code markers: // BUG-519 on every moved/added block
- [ ] COMPILE CHECK: 0 new warnings
```
