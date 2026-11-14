# Implementation Plan — BUG-411
## New CheckInPage: Add Payment Method Picker for Advance

**Date:** 2026-09-15  
**Agent:** PLANNING (ALPHA v0.7)  
**Gate:** 3 — Implementation Plan  
**IA doc:** `impact/BUG-411_IMPACT_ANALYSIS.md`  
**Entry verification:** All target lines confirmed current (2026-09-15 re-check)

---

## Scope Lock

**Files WILL change:**
- `src/pages/pms/CheckInPage.jsx` — 7 edit sites

**Files WILL NOT touch:**
- `pmsService.js` — `fd.append('payment_method', p.paymentMethod ?? '')` already correct
- `roomService.js` — separate flow (BUG-410)
- Any transform, context, service, or test file

---

## Execution Sequence

### E1 — Add `advancePaymentMethod` state

**File:** `src/pages/pms/CheckInPage.jsx`  
**After line 55** (`const [firmGst, setFirmGst] = useState('');`)

**Insert:**
```javascript
  // BUG-411: advance payment method — cash/card/upi, required when advance > 0
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState('');
```

---

### E2 — Add `paymentMethodOptions` useMemo

**File:** `src/pages/pms/CheckInPage.jsx`  
**After line 63** (`const { roomGstApplicable, roomGstSlabs } = restaurant?.checkInFlags ?? {};`)

**Insert:**
```javascript
  // BUG-411: payment method options driven by restaurant config (same pattern as RoomCheckInModal:L366)
  const advancePaymentMethodOptions = useMemo(() => {
    const enabled = restaurant?.paymentMethods || {};
    return [
      { value: 'cash', label: 'Cash' },
      { value: 'card', label: 'Card' },
      { value: 'upi',  label: 'UPI'  },
    ].filter(o => enabled[o.value]);
  }, [restaurant?.paymentMethods]);
```

---

### E3 — Clear method when advance drops to 0

**File:** `src/pages/pms/CheckInPage.jsx`  
**Line 774** — advance input `onChange`

**Find (exact):**
```jsx
<div className="relative"><span className="absolute left-3 top-2.5 text-[13px] text-[#888]">₹</span><input data-testid="ci-advance" value={form.advancePayment} onChange={e => setField('advancePayment', e.target.value)} onWheel={e => e.target.blur()} type="number" min="0" max={form.orderAmount || 0} placeholder="0" className={`${inputCls} pl-7`} /></div>
```

**Replace with:**
```jsx
<div className="relative"><span className="absolute left-3 top-2.5 text-[13px] text-[#888]">₹</span><input data-testid="ci-advance" value={form.advancePayment} onChange={e => { setField('advancePayment', e.target.value); if (Number(e.target.value) <= 0) setAdvancePaymentMethod(''); // BUG-411 }} onWheel={e => e.target.blur()} type="number" min="0" max={form.orderAmount || 0} placeholder="0" className={`${inputCls} pl-7`} /></div>
```

---

### E4 — Add payment method picker JSX

**File:** `src/pages/pms/CheckInPage.jsx`  
**After line 776** (closing `</div>` of the 2-col grid containing Room Amount + Advance)

**Insert after the grid div:**
```jsx
                    {/* BUG-411: payment method picker — appears when advance > 0, required before confirm */}
                    {Number(form.advancePayment) > 0 && advancePaymentMethodOptions.length > 0 && (
                      <div>
                        <label className="text-[12px] text-[#888] mb-1.5 block">Advance Payment Method *</label>
                        <div className="flex gap-2">
                          {advancePaymentMethodOptions.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              data-testid={`ci-advance-method-${opt.value}`}
                              onClick={() => setAdvancePaymentMethod(opt.value)}
                              className={`flex-1 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                                advancePaymentMethod === opt.value
                                  ? 'bg-[#329937] text-white border-[#329937]'
                                  : 'bg-white text-[#555] border-[#E5E5E5] hover:border-[#329937]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {!advancePaymentMethod && (
                          <p className="text-[11px] text-[#EF4444] mt-1" data-testid="ci-advance-method-error">
                            Select how the advance was collected
                          </p>
                        )}
                      </div>
                    )}
```

---

### E5 — Add payment method to `formValid`

**File:** `src/pages/pms/CheckInPage.jsx`  
**Line 238** — `formValid` constant

**Find (exact):**
```javascript
  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= Number(form.orderAmount) && (!idUploadRequired || crmDocs.length > 0 || !!frontImage); // CR-380: mandatory-doc gate (OD-4-A)
```

**Replace with:**
```javascript
  const formValid = form && form.name?.trim() && /^\d{10}$/.test(form.phone) && form.restaurantTableId && form.checkin && form.checkout > form.checkin && Number(form.orderAmount) > 0 && form.adults >= 1 && Number(form.advancePayment || 0) >= 0 && Number(form.advancePayment || 0) <= Number(form.orderAmount) && (!idUploadRequired || crmDocs.length > 0 || !!frontImage) && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod); // CR-380 + BUG-411: method required when advance > 0
```

---

### E6 — Pass `paymentMethod` to `pmsCheckIn`

**File:** `src/pages/pms/CheckInPage.jsx`  
**Line 304** — inside `pmsCheckIn({...})` call

**Find (exact):**
```javascript
        advancePayment:    Number(form.advancePayment || 0),
        adults:            Number(form.adults),
```

**Replace with:**
```javascript
        advancePayment:    Number(form.advancePayment || 0),
        paymentMethod:     advancePaymentMethod, // BUG-411
        adults:            Number(form.adults),
```

---

### E7 — Reset `advancePaymentMethod` on new arrival/walkin select

**File:** `src/pages/pms/CheckInPage.jsx`

**E7a — `selectArrival` reset block at line 177:**

**Find (exact):**
```javascript
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst('');
    setIdType('Aadhar card'); setFrontImage(null); setBackImage(null); // CR-380
```

**Replace with:**
```javascript
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst(''); setAdvancePaymentMethod(''); // BUG-411
    setIdType('Aadhar card'); setFrontImage(null); setBackImage(null); // CR-380
```

**E7b — `selectWalkin` reset block at line 207:**

**Find (exact):**
```javascript
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst('');
    setExtraAdults([]);
```

**Replace with:**
```javascript
    setCrmCustomer(null); setCrmError(null); setCrmLoading(false); setCrmDocs([]);
    setIsCorpBooking(false); setFirmName(''); setFirmGst(''); setAdvancePaymentMethod(''); // BUG-411
    setExtraAdults([]);
```

---

## Verification Matrix

| Edit | File | Verification | Self-test |
|---|---|---|---|
| E1 | CheckInPage.jsx | `advancePaymentMethod` state exists | Code read |
| E2 | CheckInPage.jsx | `advancePaymentMethodOptions` filters enabled payment methods | Code read |
| E3 | CheckInPage.jsx | Typing `0` in advance input clears selected method | Browser |
| E4 | CheckInPage.jsx | Picker visible when advance=500, hidden when advance=0 | Browser |
| E5 | CheckInPage.jsx | Confirm button disabled with advance=500, no method selected | Browser |
| E6 | CheckInPage.jsx | Network payload contains `payment_method: 'cash'` after selecting Cash | DevTools |
| E7a | CheckInPage.jsx | Selecting a different arrival card resets method to '' | Browser |
| E7b | CheckInPage.jsx | Clicking Walk-in resets method to '' | Browser |
| V6 | Folio | After check-in with advance=500+Cash: folio shows Advance Paid=500 (not 1000) | Folio page |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| formValid change blocks existing no-advance check-ins | Guard is `advance === 0 OR method selected` — zero-advance check-ins unaffected |
| paymentMethods config empty — no options shown | Picker only renders when `advancePaymentMethodOptions.length > 0` — no picker, no block |
| pmsCheckIn receives empty string when no options | `advancePaymentMethod` defaults '' — same as before (safe fallback) |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-411 → status: GATE_5A_IMPLEMENTED, gate: 5
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CheckInPage.jsx — BUG-411
- [ ] Code markers: `// BUG-411` in E1, E2, E3, E4, E5, E6, E7a, E7b
- [ ] webpack: 0 new warnings

*Plan written 2026-09-15 · PLANNING agent (ALPHA v0.7)*
