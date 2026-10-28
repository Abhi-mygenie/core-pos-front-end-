# BUG-533 — Impact Analysis (Gate 2)

## Extend Stay: Current Bill Shows Rack Rate + Discount + Collect Now Must Be Removed

**Date:** 2026-10-10
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE — no fix applied, all 3 issues confirmed at HEAD
**Conflict Pre-check:** NONE
**Risk:** HIGH (financial display — wrong balance ₹5,035 vs ₹3,985 visible to cashier)

---

## Code Reality Check

```
InHousePanel.jsx:L25   extend path uses raw row → CONFIRMED PRESENT
DeparturesPanel.jsx:L44 extend path uses raw row → CONFIRMED PRESENT
ExtendStayForm.jsx:L23-26  discOpen/discount/payOpen/payment states → CONFIRMED PRESENT
ExtendStayForm.jsx:L100    extend-discount-toggle button → CONFIRMED PRESENT
ExtendStayForm.jsx:L108    extend-collect-toggle button → CONFIRMED PRESENT
ExtendStayForm.jsx:L128    c.total_with_gst (rack, no discount) → CONFIRMED PRESENT
ExtendStayForm.jsx:L130    c.balance_due (₹5,035, wrong) → CONFIRMED PRESENT
No BUG-533 marker found.
```

---

## Conflict Pre-check

| File | Last modifier | Lines touched | Conflict? |
|------|--------------|---------------|-----------|
| `InHousePanel.jsx` | BUG-515 Sub-B (2026-10-08) — L23 renderExpansion enrichment | This fix modifies same `renderExpansion` block (L24-25 area) | **NONE** — BUG-515 closed; our change is additive restructure |
| `DeparturesPanel.jsx` | BUG-515 Sub-B (2026-10-08) — L42 renderExpansion enrichment | Same block (L44-50 area) | **NONE** |
| `ExtendStayForm.jsx` | CR-385 M4 (2026-09-21) — full form creation | State + UI lines | **NONE** — no open item targets this file |

---

## Data Flow Trace

### A — "Current bill" shows rack rate

```
Snapshot refresh triggers getRowBalances() → pmsService.getInHouseGuests():
  row.roomDiscountAmount = 1000      // BUG-515 L167 — CHECK-IN DISCOUNT
  row.effectiveTotal     = 5985      // BUG-515 — post-discount total incl. GST
  row.effectiveBalanceDue = 3985     // BUG-515 — correct balance

These land in: balances[row.orderId] via joinRowBalances()
  → available as prop in InHousePanel / DeparturesPanel

InHousePanel.jsx renderExpansion (L22-32):
  if (expandedKind === 'extend')
    return <ExtendStayForm row={row} ...>  ← L25: exits here with RAW row
  //
  // enrichedRow only built below (never reached for 'extend'):
  const b = balances?.[String(row.orderId)];
  const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0 ? { ...row, ...b_fields } : row;

ExtendStayForm:
  const c = row.charge ?? {};
  // c = LR snapshot: { total_with_gst: 7035, advance_payment: 2000, balance_due: 5035 }
  // row.roomDiscountAmount, row.effectiveTotal, row.effectiveBalanceDue → UNDEFINED
  → displays ₹7,035 / ₹5,035  ✗
```

### B — Discount + Collect Now sections present

Both rendered unconditionally in `<div className="space-y-4">` of the left panel:
```
L99-L105:  <div className="border ..."> Discount toggle + discOpen block </div>
L107-L113: <div className="border ..."> Collect Now toggle + payOpen block </div>
```

Their state feeds into `missing[]` (L41) and `extendStay()` call (L50):
```js
// L41: missing references payNeedsRef + discVal
// L50: extendStay({ ..., payment: payAmt > 0 ? payment : null, discount: discVal > 0 ? discount : null, ... })
```

`buildExtendBody` in `frontDeskService.js` already guards:
```js
if (pay > 0) body.payment = { ... };
if (disc > 0) body.discount = { ... };
```
So removing from FE is payload-safe — when both are absent, neither is sent. Backend API contract unchanged.

---

## Affected Files — Exact Changes

### File 1: `InHousePanel.jsx` — bridge enrichedRow to extend path

**Current (L24-25, inside renderExpansion):**
```js
          if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          if (expandedKind === 'extend') return <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          const b = balances?.[String(row.orderId)];
          const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
            ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
                effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
            : row;
          return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
```

**New — build enrichedRow FIRST, then pass to extend:**
```js
          const b = balances?.[String(row.orderId)]; // BUG-533: hoist above extend/bill paths
          const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
            ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
                effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
            : row;
          if (expandedKind === 'bill') return <FolioCheckoutPanel row={enrichedRow} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          if (expandedKind === 'extend') return <ExtendStayForm row={enrichedRow} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
```

**Net change:** ~4 lines restructured (no new logic — hoisting only). `FolioCheckoutPanel` also gets `enrichedRow` (additive, safe — it reads `row.charge` for its own logic but discount fields being present does no harm).

### File 2: `DeparturesPanel.jsx` — identical restructure

**Current (L43-50):**
```js
    if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    if (expandedKind === 'extend') return <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    const b = balances?.[String(row.orderId)];
    const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
      ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
          effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
      : row;
    return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
```

**New — same hoist pattern as InHousePanel:**
```js
    const b = balances?.[String(row.orderId)]; // BUG-533: hoist above extend/bill paths
    const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
      ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
          effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
      : row;
    if (expandedKind === 'bill') return <FolioCheckoutPanel row={enrichedRow} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    if (expandedKind === 'extend') return <ExtendStayForm row={enrichedRow} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
```

**Net change:** ~4 lines restructured.

### File 3: `ExtendStayForm.jsx` — remove Discount+Collect Now + two-row bill display

#### 3a — Remove state + computed values

**Remove from L23-L26:**
```js
// REMOVE these 4 lines:
  const [discOpen, setDiscOpen] = useState(false);
  const [discount, setDiscount] = useState({ type: 'percent', value: '', reason: '' });
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState({ amount: '', method: 'cash', reference: '' });
```

**Remove from L38-L40:**
```js
// REMOVE these 3 lines:
  const payAmt = Number(payment.amount || 0);
  const payNeedsRef = payAmt > 0 && payment.method !== 'cash' && !payment.reference.trim();
  const discVal = Number(discount.value || 0);
```

**Also remove:** `const METHODS = [...]` at L12 (only used by Collect Now block).

#### 3b — Update `missing` array (L41) — remove payment + discount refs

**Current:**
```js
  const missing = [!changed && 'new check-out date', !reason.trim() && 'reason', payNeedsRef && 'payment reference', discVal > 0 && !discount.reason.trim() && 'discount reason', conflict && !moveTo && 'room to move to'].filter(Boolean);
```

**New:**
```js
  const missing = [!changed && 'new check-out date', !reason.trim() && 'reason', conflict && !moveTo && 'room to move to'].filter(Boolean); // BUG-533
```

#### 3c — Update `submit()` extendStay call (L50) — remove payment + discount

**Current:**
```js
      const res = await extendStay({ orderId: row.orderId, newCheckoutDate: checkout, reason, payment: payAmt > 0 ? payment : null, discount: discVal > 0 ? discount : null, newRestaurantTableId: moveTo || null });
```

**New:**
```js
      const res = await extendStay({ orderId: row.orderId, newCheckoutDate: checkout, reason, newRestaurantTableId: moveTo || null }); // BUG-533: payment+discount removed per OD-INV-EXTEND-01/01b
```

#### 3d — Remove Discount UI block (L99-L105 — 7 lines including outer div)

Remove:
```jsx
            <div className="border border-[#E5E5E5] rounded-lg p-3">
              <button type="button" data-testid="extend-discount-toggle" ...> Discount · optional </button>
              {discOpen && <div data-testid="extend-discount">
                ...% / ₹ type selector + Value input + Reason input...
              </div>}
            </div>
```

#### 3e — Remove Collect Now UI block (L107-L114 — 8 lines including outer div)

Remove:
```jsx
            <div className="border border-[#E5E5E5] rounded-lg p-3">
              <button type="button" data-testid="extend-collect-toggle" ...> Collect now · optional </button>
              {payOpen && <div data-testid="extend-collect">
                ...Amount input + method buttons + reference input + above-balance hint...
              </div>}
            </div>
```

#### 3f — Two-row "Current bill" display (L126-L130)

**Add** at top of `ExtendStayForm`: read enriched fields from row:
```js
  const discountAmt = row.roomDiscountAmount ?? 0; // BUG-533: from enrichedRow
  const effectiveBalanceDue = row.effectiveBalanceDue ?? null; // BUG-533
  const effectiveTotalWithGst = row.effectiveTotal ?? null;   // BUG-533
```

**Current (L126-L130 — Current bill grid):**
```jsx
              <span className="text-[#767676]">Total (incl. GST)</span><span className="text-right" data-testid="extend-current-total">{fmtINR(c.total_with_gst)}</span>
              <span className="text-[#767676]">Paid so far</span><span className="text-right" data-testid="extend-current-paid">{fmtINR(c.advance_payment)}</span>
              <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="extend-current-balance">{fmtINR(c.balance_due)}</span>
```

**New:**
```jsx
              {discountAmt > 0 ? (
                <>
                  <span className="text-[#767676] line-through">Total (rack rate)</span><span className="text-right line-through text-[#767676]" data-testid="extend-current-total-rack">{fmtINR(c.total_with_gst)}</span>
                  <span className="text-[#767676]">Check-in discount</span><span className="text-right text-[#329937]" data-testid="extend-current-discount">−{fmtINR(discountAmt)}</span>
                  <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="extend-current-total">{fmtINR(effectiveTotalWithGst)}</span>
                </>
              ) : (
                <>
                  <span className="text-[#767676]">Total (incl. GST)</span><span className="text-right" data-testid="extend-current-total">{fmtINR(c.total_with_gst)}</span>
                </>
              )}
              <span className="text-[#767676]">Paid so far</span><span className="text-right" data-testid="extend-current-paid">{fmtINR(c.advance_payment)}</span>
              <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="extend-current-balance">{fmtINR(effectiveBalanceDue ?? c.balance_due)}</span>
```

---

## Downstream Impact Analysis

| Concern | Assessment |
|---|---|
| `buildExtendBody` in `frontDeskService.js` | Safe — already guards `if (pay > 0)` / `if (disc > 0)`. Neither sent when absent. **No change needed.** |
| `NightsLines` component (`charge={c}`) | Unchanged — reads `row.charge` for nights display. Not affected. |
| Post-submit result panel | Reads `result.charge` from server response directly. Not affected. |
| Non-discounted bookings (`row.roomDiscountAmount === undefined`) | `discountAmt = 0` → falls through to single-row display (same as current). Zero regression. |
| `FolioCheckoutPanel` receiving enrichedRow | It reads `row.charge` for its own logic. Having extra fields (`roomDiscountAmount` etc.) present is additive and harmless. |
| `RowExpansionStub` | No change — still receives `enrichedRow` as before. |

---

## Risk Classification

| Dimension | Assessment |
|---|---|
| Risk | **HIGH** — financial display; wrong balance shown to cashier |
| R5 files? | **NO** — all 3 files are NOT R5 |
| Financial payload? | NO — `buildExtendBody` unchanged; removing Collect Now/Discount is UI-only |
| Fast Lane eligible? | NO (3 files) |
| Regression risk | LOW — non-discounted rows: `discountAmt=0` → single-row display (unchanged); payload: both guards already present |

---

## Files WILL change
- `src/components/pms/frontdesk/InHousePanel.jsx` — ~4 lines restructured
- `src/components/pms/frontdesk/DeparturesPanel.jsx` — ~4 lines restructured
- `src/components/pms/frontdesk/ExtendStayForm.jsx` — ~20 lines removed + ~10 lines changed/added

## Files WILL NOT touch
- `frontDeskService.js` — `buildExtendBody` handles null payment/discount already
- `GuestTable.jsx` — no change
- `pmsService.js` — no change
- `FolioCheckoutPanel.jsx` — receives enrichedRow (additive, safe)
- Any test file

---

## Verification Matrix

| # | Test | How | Auto? |
|---|------|-----|:---:|
| V1 | Current bill shows rack ~~₹7,035~~ → discount −₹1,000 → total ₹5,985 | Browser: bonk → Extend | NO |
| V2 | Balance due shows ₹3,985 (not ₹5,035) | Browser | NO |
| V3 | Discount section absent from left panel | Browser: verify no checkbox | NO |
| V4 | Collect Now section absent from left panel | Browser: verify no checkbox | NO |
| V5 | Non-discounted room: single-row display (no rack/discount rows) | Browser: any room without discount | NO |
| V6 | Extend confirm still works (no payment/discount sent) | Browser: extend bonk + confirm | NO |
| V7 | RowExpansionStub (detail view) still shows discount correctly | Browser: bonk detail expansion | NO |
| V8 | webpack 0 new warnings | Terminal | YES |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-533 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: 3 files listed with BUG-533 + date
- [ ] Code marker: // BUG-533 in all 3 files at changed lines
- [ ] webpack compile: 0 new warnings
```
