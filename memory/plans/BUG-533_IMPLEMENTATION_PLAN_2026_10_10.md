# BUG-533 — Implementation Plan (Gate 3)

## Extend Stay: Current Bill Shows Rack Rate + Discount + Collect Now Must Be Removed

**Date:** 2026-10-10
**Stage:** Gate 3 — Implementation Plan
**Based on:** `impact/BUG-533_IMPACT_ANALYSIS_2026_10_10.md`
**Risk:** HIGH / 0 R5 files
**ODs locked:** OD-INV-EXTEND-01 (remove Discount) · OD-INV-EXTEND-01b (remove Collect Now) · OD-INV-EXTEND-02 (two-row bill) · OD-INV-EXTEND-03 (both panels)

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/InHousePanel.jsx` — E1 (~4 lines restructured)
- `src/components/pms/frontdesk/DeparturesPanel.jsx` — E2 (~4 lines restructured)
- `src/components/pms/frontdesk/ExtendStayForm.jsx` — E3–E7 (remove + add + display)

**Files WILL NOT touch:**
- `frontDeskService.js` — `buildExtendBody` already handles null payment/discount
- `GuestTable.jsx` — no change
- `pmsService.js` — no change
- `FolioCheckoutPanel.jsx` — receives enrichedRow (additive, safe)
- Any test file

---

## Entry Verification (MANDATORY before coding)

```
E1: InHousePanel.jsx — confirm renderExpansion block reads:
  if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} ...
  if (expandedKind === 'extend') return <ExtendStayForm row={row} ...
  const b = balances?.[String(row.orderId)];

E2: DeparturesPanel.jsx — confirm same pattern:
  if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} ...
  if (expandedKind === 'extend') return <ExtendStayForm row={row} ...
  const b = balances?.[String(row.orderId)];

E3-E7: ExtendStayForm.jsx — confirm:
  L12: const METHODS = [['cash', 'Cash'], ['card', 'Card'], ['upi', 'UPI']];
  L23: const [discOpen, setDiscOpen] = useState(false);
  L38: const payAmt = Number(payment.amount || 0);
  L50: const res = await extendStay({ ..., payment: payAmt > 0 ? payment : null, ...

If ANY mismatch → STOP. Return to Planning. Do not proceed.
```

---

## Edits

### E1 — `InHousePanel.jsx` — hoist `enrichedRow` above early-return exits

One `search_replace`. Moves `b` + `enrichedRow` computation before `bill`/`extend` exits so all three paths receive the enriched row.

**OLD:**
```jsx
          if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          if (expandedKind === 'extend') return <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          const b = balances?.[String(row.orderId)];
          const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
            ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
                effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
            : row;
          return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
```

**NEW:**
```jsx
          const b = balances?.[String(row.orderId)]; // BUG-533: hoist enrichedRow above extend/bill exits
          const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
            ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
                effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
            : row;
          if (expandedKind === 'bill') return <FolioCheckoutPanel row={enrichedRow} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          if (expandedKind === 'extend') return <ExtendStayForm row={enrichedRow} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
```

---

### E2 — `DeparturesPanel.jsx` — identical hoist pattern

One `search_replace`.

**OLD:**
```jsx
    if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    if (expandedKind === 'extend') return <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    const b = balances?.[String(row.orderId)];
    const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
      ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
          effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
      : row;
    return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
```

**NEW:**
```jsx
    const b = balances?.[String(row.orderId)]; // BUG-533: hoist enrichedRow above extend/bill exits
    const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
      ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
          effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
      : row;
    if (expandedKind === 'bill') return <FolioCheckoutPanel row={enrichedRow} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    if (expandedKind === 'extend') return <ExtendStayForm row={enrichedRow} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
    return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
```

---

### E3 — `ExtendStayForm.jsx:L12` — remove `METHODS` const (no longer used after Collect Now removal)

**OLD:**
```js
const METHODS = [['cash', 'Cash'], ['card', 'Card'], ['upi', 'UPI']];
```

**NEW:** *(delete line — empty replacement)*

---

### E4 — `ExtendStayForm.jsx:L23-L26` — remove 4 state declarations

**OLD:**
```js
  const [discOpen, setDiscOpen] = useState(false);
  const [discount, setDiscount] = useState({ type: 'percent', value: '', reason: '' });
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState({ amount: '', method: 'cash', reference: '' });
```

**NEW:** *(delete all 4 lines — empty replacement)*

---

### E5 — `ExtendStayForm.jsx:L38-L41` — remove computed values, add discount consts, simplify `missing`

**OLD:**
```js
  const payAmt = Number(payment.amount || 0);
  const payNeedsRef = payAmt > 0 && payment.method !== 'cash' && !payment.reference.trim();
  const discVal = Number(discount.value || 0);
  const missing = [!changed && 'new check-out date', !reason.trim() && 'reason', payNeedsRef && 'payment reference', discVal > 0 && !discount.reason.trim() && 'discount reason', conflict && !moveTo && 'room to move to'].filter(Boolean);
```

**NEW:**
```js
  const discountAmt = row.roomDiscountAmount ?? 0; // BUG-533: from enrichedRow (InHousePanel/DeparturesPanel)
  const effectiveBalanceDue = row.effectiveBalanceDue ?? null; // BUG-533
  const effectiveTotalWithGst = row.effectiveTotal ?? null; // BUG-533
  const missing = [!changed && 'new check-out date', !reason.trim() && 'reason', conflict && !moveTo && 'room to move to'].filter(Boolean); // BUG-533: removed payNeedsRef + discVal guards
```

---

### E6 — `ExtendStayForm.jsx:L50` — remove `payment` + `discount` from `extendStay()` call

**OLD:**
```js
      const res = await extendStay({ orderId: row.orderId, newCheckoutDate: checkout, reason, payment: payAmt > 0 ? payment : null, discount: discVal > 0 ? discount : null, newRestaurantTableId: moveTo || null });
```

**NEW:**
```js
      const res = await extendStay({ orderId: row.orderId, newCheckoutDate: checkout, reason, newRestaurantTableId: moveTo || null }); // BUG-533: payment+discount removed per OD-INV-EXTEND-01/01b
```

---

### E7 — `ExtendStayForm.jsx` — remove both Discount and Collect Now UI blocks (one `search_replace`)

Both blocks are adjacent inside `<div className="space-y-4">`. Remove both with one replacement.

**OLD (two adjacent `<div className="border...">` blocks):**
```jsx
            <div className="border border-[#E5E5E5] rounded-lg p-3">
              <button type="button" data-testid="extend-discount-toggle" onClick={() => setDiscOpen((v) => !v)} className="fd-btn text-[12px] font-semibold flex items-center gap-2"><span className={`inline-block w-4 h-4 rounded border ${discOpen ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#CCC]'}`} aria-hidden /> Discount <span className="text-[#767676] font-normal">· optional</span></button>
              {discOpen && <div className="mt-3 grid grid-cols-[auto_1fr_1.5fr] gap-3 items-end" data-testid="extend-discount">
                <div className="flex gap-1.5">{[['percent', '%'], ['amount', '₹']].map(([k, l]) => <button key={k} type="button" data-testid={`extend-discount-${k}`} aria-pressed={discount.type === k} onClick={() => setDiscount((d) => ({ ...d, type: k }))} className={`fd-btn px-3 h-9 rounded-md text-[12px] font-semibold border ${discount.type === k ? 'ring-2 ring-[#1A1A1A] border-transparent' : 'border-[#E5E5E5]'}`}>{l}</button>)}</div>
                <label className="block"><Label>Value</Label><input type="number" min={0} value={discount.value} onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value }))} className={inputCls} data-testid="extend-discount-value" disabled={busy} /></label>
                <label className="block"><Label>Reason · required</Label><input value={discount.reason} onChange={(e) => setDiscount((d) => ({ ...d, reason: e.target.value }))} className={inputCls} data-testid="extend-discount-reason" disabled={busy} /></label>
              </div>}
            </div>
            <div className="border border-[#E5E5E5] rounded-lg p-3">
              <button type="button" data-testid="extend-collect-toggle" onClick={() => setPayOpen((v) => !v)} className="fd-btn text-[12px] font-semibold flex items-center gap-2"><span className={`inline-block w-4 h-4 rounded border ${payOpen ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#CCC]'}`} aria-hidden /> Collect now <span className="text-[#767676] font-normal">· optional</span></button>
              {payOpen && <div className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-3 items-end" data-testid="extend-collect">
                <label className="block"><Label>Amount</Label><input type="number" min={0} value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} className={inputCls} data-testid="extend-collect-amount" disabled={busy} /></label>
                <div className="flex gap-1.5">{METHODS.map(([k, l]) => <button key={k} type="button" data-testid={`extend-pay-${k}`} aria-pressed={payment.method === k} onClick={() => setPayment((p) => ({ ...p, method: k }))} className={`fd-btn px-3 h-9 rounded-md text-[12px] font-semibold border ${payment.method === k ? 'ring-2 ring-[#1A1A1A] border-transparent' : 'border-[#E5E5E5]'}`}>{l}</button>)}</div>
                <label className="block"><Label>{payment.method === 'upi' ? 'UTR' : payment.method === 'card' ? 'Txn ID' : 'Reference'}{payment.method !== 'cash' && ' · required'}</Label><input value={payment.reference} onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))} className={inputCls} data-testid="extend-pay-ref" disabled={busy} /></label>
                {payAmt > Number(c.balance_due ?? 0) && <div className="col-span-3 text-[11px] text-[#92400E]" data-testid="extend-collect-hint">Above the current balance ({fmtINR(c.balance_due)}). The server decides after pricing the change — its message is shown if it rejects.</div>}
              </div>}
            </div>
```

**NEW:** *(delete both blocks — empty replacement)*

---

### E8 — `ExtendStayForm.jsx` — two-row "Current bill" display

**OLD (3 lines inside `.grid.grid-cols-2.gap-y-1`):**
```jsx
              <span className="text-[#767676]">Total (incl. GST)</span><span className="text-right" data-testid="extend-current-total">{fmtINR(c.total_with_gst)}</span>
              <span className="text-[#767676]">Paid so far</span><span className="text-right" data-testid="extend-current-paid">{fmtINR(c.advance_payment)}</span>
              <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="extend-current-balance">{fmtINR(c.balance_due)}</span>
```

**NEW:**
```jsx
              {discountAmt > 0 ? ( // BUG-533: two-row — rack crossed out, discount line, discounted total
                <>
                  <span className="text-[#767676] line-through">Total (rack rate)</span><span className="text-right line-through text-[#767676]" data-testid="extend-current-total-rack">{fmtINR(c.total_with_gst)}</span>
                  <span className="text-[#767676]">Check-in discount</span><span className="text-right text-[#329937]" data-testid="extend-current-discount">−{fmtINR(discountAmt)}</span>
                  <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="extend-current-total">{fmtINR(effectiveTotalWithGst)}</span>
                </>
              ) : (
                <><span className="text-[#767676]">Total (incl. GST)</span><span className="text-right" data-testid="extend-current-total">{fmtINR(c.total_with_gst)}</span></>
              )}
              <span className="text-[#767676]">Paid so far</span><span className="text-right" data-testid="extend-current-paid">{fmtINR(c.advance_payment)}</span>
              <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="extend-current-balance">{fmtINR(effectiveBalanceDue ?? c.balance_due)}</span>
```

---

## Verification Matrix

| # | Edit | Test | How | Auto? |
|---|------|------|-----|:---:|
| V1 | E1+E2+E3-E8 | Discount field absent from Extend form | Browser: bonk → Extend → left panel | NO |
| V2 | E1+E2+E3-E8 | Collect Now field absent from Extend form | Browser: same | NO |
| V3 | E1+E8 | Current bill shows ~~₹7,035~~ / −₹1,000 / ₹5,985 / Balance ₹3,985 | Browser: bonk → Extend | NO |
| V4 | E1 | RowExpansionStub (detail) still shows discount correctly | Browser: bonk detail expansion (not extend) | NO |
| V5 | E8 | Non-discounted room: single-row display (no rack/discount lines) | Browser: any room without check-in discount | NO |
| V6 | E6 | Extend confirm fires without payment/discount fields | Browser: fill date+reason → Confirm | NO |
| V7 | E2 | DeparturesPanel: same display correct | Browser: Departures tab → Extend | NO |
| V8 | ALL | webpack 0 new warnings | Terminal | YES |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| `FolioCheckoutPanel` now receives `enrichedRow` instead of `row` | Safe — it reads `row.charge` for its own logic; extra fields (`roomDiscountAmount` etc.) are additive |
| Non-discounted rooms: `row.roomDiscountAmount` undefined → `discountAmt=0` | `?? 0` guard; falls to single-row display |
| `effectiveBalanceDue` null for non-discounted → `c.balance_due` fallback | `?? c.balance_due` guard |
| `useState` import now has unused entries if all removed | Check: `checkout`, `reason`, `conflict`, `moveTo`, `busy`, `error`, `result` remain — `useState` still needed |
| `useEffect` import: still needed for `setConflict`/`setMoveTo` on checkout change | Verified: `useEffect` stays |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-533 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: 3 files listed with BUG-533 + 2026-10-10
- [ ] Code markers: // BUG-533 in each file at changed lines ✓ (all edits above include marker)
- [ ] webpack compile: 0 new warnings
```
