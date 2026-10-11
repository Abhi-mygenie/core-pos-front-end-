# BUG-497 — Gate 3 Implementation Plan (FINAL)

**Date:** 2026-10-06 — revised post-probe
**Author:** PLANNING agent
**Risk:** HIGH
**OD-497-03 = Option A confirmed.** Walk-in fallback = effectiveBalanceDue (now backend-compatible).
**Files WILL change:** `src/components/pms/frontdesk/CheckInForm.jsx` · `src/pages/pms/CheckInPage.jsx`
**Files WILL NOT touch:** pmsService.js · frontDeskService.js · CollectPaymentPanel.jsx · FolioCheckoutPanel.jsx

**Run AFTER BUG-500 + BUG-496** — depends on corrected effectiveBalanceDue (BUG-500) and roomDiscountRs cap (BUG-496)

---

## Collect Now max formula (probe-informed)

**Correct max = `room − roomDiscountRs − booking_advance`** (backend formula, no GST — OD-500-04)

```
CheckInForm: bc=9000, advance=1000, disc=7920 → max = 9000 − 7920 − 1000 = 80 ✓
CheckInPage: effectiveBalanceDue (from BUG-500) = max(0, base − rawDiscount − bookingAdv) = 80 ✓
```

Both files converge on the same formula. CheckInPage uses `effectiveBalanceDue` directly (BUG-500 already computes it). CheckInForm computes inline: `bc − roomDiscountRs − advance`.

---

## E1 — CheckInForm.jsx L225 · Collect Now max

### Current:
```jsx
              <input type="number" min={0} value={collect.amount} onChange={(e) => setCollect((k) => ({ ...k, amount: e.target.value }))} className={inputCls} data-testid="checkin-collect-amount" disabled={busy} />
```

### After:
```jsx
              <input type="number" min={0} max={Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0))} value={collect.amount} onChange={(e) => setCollect((k) => ({ ...k, amount: e.target.value }))} className={inputCls} data-testid="checkin-collect-amount" disabled={busy} /> {/* BUG-497: max = bc − discount − bookingAdv */}
```

**Formula:** `bc − roomDiscountRs − c.advance_payment` = backend-compatible (no GST)
- No disc: 9000 − 0 − 1000 = **8000** (staff can collect room balance only)
- 88% disc: 9000 − 7920 − 1000 = **80** ✓

---

## E2 — CheckInForm.jsx after L77 · collectMax + collectOverMax + ready

**Insert after L77** (`const discountOverMax = ...`):

### Insert (new lines after L77):
```javascript
  // BUG-497: collect-now cap and guard
  const collectMax     = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs - Number(c.advance_payment || 0));
  const collectOverMax = collectAmt > collectMax && collectAmt > 0; // BUG-497
```

**Update L55** (`const ready = missing.length === 0;`):
### Current L55:
```javascript
  const ready = missing.length === 0;
```
### After L55:
```javascript
  const ready = missing.length === 0; // collectOverMax handled separately (defined after roomDiscountRs)
```
*(L55 unchanged — `ready` stays as-is; `collectOverMax` will disable the Confirm button)*

**Add to Confirm button** (find `disabled={!ready || busy}` in JSX):
### Current confirm button (L236):
```jsx
              disabled={!ready || busy}
```
### After:
```jsx
              disabled={!ready || busy || collectOverMax} {/* BUG-497 */}
```

**Add warning below collect summary** (after L229):
```jsx
              {collectOverMax && <div className="mt-1 text-[11px] text-[#B91C1C]" data-testid="checkin-collect-over-max">Collect exceeds remaining balance ({fmtINR(collectMax)})</div>} {/* BUG-497 */}
```

---

## E3a — CheckInForm.jsx L187 · discount type toggle resets collect

### Current:
```jsx
                    onClick={() => { setCiRoomDiscountType(t); setCiRoomDiscountAmt(''); }}
```

### After:
```jsx
                    onClick={() => { setCiRoomDiscountType(t); setCiRoomDiscountAmt(''); setCollect(k => ({ ...k, amount: '' })); }} {/* BUG-497 */}
```

---

## E3b — CheckInForm.jsx L202 · discount amount change resets collect

### Current:
```jsx
                  onChange={e => setCiRoomDiscountAmt(e.target.value)}
```

### After:
```jsx
                  onChange={e => { setCiRoomDiscountAmt(e.target.value); setCollect(k => ({ ...k, amount: '' })); }} {/* BUG-497 */}
```

---

## E4 — CheckInPage.jsx L847 · Advance Payment max

### Current:
```jsx
                        <div className="relative"><span className="absolute left-3 top-2.5 text-[13px] text-[#888]">₹</span><input data-testid="ci-advance" value={form.advancePayment} onChange={e => { setField('advancePayment', e.target.value); if (Number(e.target.value) <= 0) setAdvancePaymentMethod(''); /* BUG-411 */ }} onWheel={e => e.target.blur()} type="number" min="0" max={form.orderAmount || 0} placeholder="0" className={`${inputCls} pl-7`} /></div>
```

### After:
```jsx
                        <div className="relative"><span className="absolute left-3 top-2.5 text-[13px] text-[#888]">₹</span><input data-testid="ci-advance" value={form.advancePayment} onChange={e => { setField('advancePayment', e.target.value); if (Number(e.target.value) <= 0) setAdvancePaymentMethod(''); /* BUG-411 */ }} onWheel={e => e.target.blur()} type="number" min="0" max={effectiveBalanceDue} placeholder="0" className={`${inputCls} pl-7`} /></div> {/* BUG-497: max=effectiveBalanceDue (room−disc−bookingAdv, OD-497-03 Option A) */}
```

**What changes:** `max={form.orderAmount || 0}` → `max={effectiveBalanceDue}`
- `effectiveBalanceDue` (from BUG-500) = `room − rawDiscount − bookingAdv`
- No-discount: 8000 (room − bookingAdv)
- 88% discount: 80 ✓
- Walk-in (OD-497-03 Option A): `selected?.charge?.advance_payment = undefined → 0 → effectiveBalanceDue = room − discount` ✓

---

## E5 — CheckInPage.jsx L283 · formValid advance cap

### Current:
```javascript
  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= Number(form.orderAmount) && (!idUploadRequired || crmDocs.length > 0 || !!frontImage) && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod) && !discountOverMax; // CR-380 + BUG-411 + BUG-492
```

### After:
```javascript
  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= effectiveBalanceDue && (!idUploadRequired || crmDocs.length > 0 || !!frontImage) && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod) && !discountOverMax; // CR-380 + BUG-411 + BUG-492 + BUG-497
```

**What changes:** `<= Number(form.orderAmount)` → `<= effectiveBalanceDue`

---

## E6a — CheckInPage.jsx L889 · discount type toggle resets advancePayment

### Current:
```jsx
                              onClick={() => { setCiRoomDiscountType(t); setCiRoomDiscountAmt(''); }}
```

### After:
```jsx
                              onClick={() => { setCiRoomDiscountType(t); setCiRoomDiscountAmt(''); setField('advancePayment', ''); }} {/* BUG-497 */}
```

---

## E6b — CheckInPage.jsx L903 · discount amount change resets advancePayment

### Current:
```jsx
                            onChange={e => setCiRoomDiscountAmt(e.target.value)}
```

### After:
```jsx
                            onChange={e => { setCiRoomDiscountAmt(e.target.value); setField('advancePayment', ''); }} {/* BUG-497 */}
```

---

## Verification Matrix

| # | Edit | Check | How |
|---|------|-------|-----|
| V1 | E1 | Collect max=80 at 88% disc on 9000/1000 | DevTools: max on checkin-collect-amount=80 |
| V2 | E1 | Collect max=8000 at 0% disc | DevTools: max=8000 |
| V3 | E2 | Warning shows when collect > max | Type 9999 in Collect → red warning |
| V4 | E2 | Confirm disabled when collect > max | disabled attr = true |
| V5 | E3a | Collect clears on disc type switch | Switch % ↔ ₹ → collect = '' |
| V6 | E3b | Collect clears on disc amount change | Type discount → collect = '' |
| V7 | E4 | Advance max=80 at 88% disc | DevTools: max on ci-advance=80 |
| V8 | E4 | Advance max=8000 at 0% disc | DevTools: max=8000 |
| V9 | E5 | Confirm disabled when advance > effectiveBalanceDue | Enter 9999 → disabled |
| V10 | E6a | Advance clears on disc type switch | Switch % ↔ ₹ → ci-advance='' |
| V11 | E6b | Advance clears on disc amount change | Type discount → ci-advance='' |
| V12 | ALL | webpack 0 new warnings | tail frontend.out.log |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-497 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-497 row updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx — BUG-497 2026-10-06
- [ ] Code markers: // BUG-497 in every modified block
- [ ] Compile: 0 new warnings
```
