# BUG-492 — Implementation Plan (Gate 3)

**ID:** BUG-492
**Date:** 2026-10-06
**Author:** Planning agent
**Sprint:** oct_bug_batch
**Risk:** HIGH
**Files WILL change:**
  - `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
  - `src/pages/pms/CheckInPage.jsx`
  - `src/components/pms/frontdesk/CheckInForm.jsx`
**Files WILL NOT touch:** `CollectPaymentPanel.jsx`, `orderTransform.js`, `frontDeskService.js`, `pmsService.js`, `DashboardPage.jsx`, `OrderEntry.jsx`

---

## Scope Lock — 3 files, ~14 edit sites

---

## FILE 1: FolioCheckoutPanel.jsx

### E-492-1 — RoomSection: add maxPct local const + discountOverMax

**Location:** After the existing `roomDiscountRs` useMemo (L44-52), inside RoomSection.

**Current (line 52 is last line of useMemo block):**
```javascript
  }, [roomDiscount, roomDiscountType, roomApplyTo, c.balance_due, c.booking_charge]);
  return (
```
**After:**
```javascript
  }, [roomDiscount, roomDiscountType, roomApplyTo, c.balance_due, c.booking_charge]);
  // BUG-492 Sub-B: maxPct = floor(balance_due / booking_charge × 100) — meaningful % cap
  const maxPct = useMemo(() => {
    const bd = Number(c.balance_due    || 0);
    const bc = Number(c.booking_charge || 1);
    return bc > 0 ? Math.floor(bd / bc * 100) : 100;
  }, [c.balance_due, c.booking_charge]);
  const discountOverMax = roomDiscountType === 'Percent' && Number(roomDiscount) > maxPct;
  return (
```

### E-492-2 — RoomSection: update % input max attr

**Location:** L92
**Current:**
```javascript
                  max={roomDiscountType === 'Percent' ? 100 : Number(c.balance_due || 0) || undefined}
```
**After:**
```javascript
                  max={roomDiscountType === 'Percent' ? maxPct : Number(c.balance_due || 0) || undefined}
```

### E-492-3 — RoomSection: add red alert JSX after input row

**Location:** After the reason input `</div>` (closes the `flex gap-1` div) that wraps both inputs, before the closing `</div>` of the `if (roomApplyTo !== 'food')` block (around L107).

**Current (L106-108):**
```javascript
              </div>
            )}
          </div>
```
**After (insert alert before the closing `)}` of `roomApplyTo !== 'food'` block):**
```javascript
              </div>
              {discountOverMax && (
                <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="bill-discount-over-max-alert">
                  Maximum discount: {maxPct}% (₹{Math.floor(Number(c.booking_charge||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
                </div>
              )}
            )}
          </div>
```

### E-492-4 — Parent: add discountOverMax useMemo (for handlePaid guard)

**Location:** After the `roomDiscountInfoRs` useMemo ends at L210, before the `stop` const.

**Current (L210-211):**
```javascript
  }, [roomDiscount, roomDiscountType, roomApplyTo, row.charge?.balance_due, row.charge?.booking_charge]);
  const stop = (e) => e.stopPropagation();
```
**After:**
```javascript
  }, [roomDiscount, roomDiscountType, roomApplyTo, row.charge?.balance_due, row.charge?.booking_charge]);
  // BUG-492 Sub-B: discountOverMax at parent level — blocks handlePaid when % > maxPct
  const discountOverMax = useMemo(() => {
    if (roomDiscountType !== 'Percent') return false;
    const bd = Number(row.charge?.balance_due    || 0);
    const bc = Number(row.charge?.booking_charge || 1);
    if (!bc) return false;
    return Number(roomDiscount) > Math.floor(bd / bc * 100);
  }, [roomDiscount, roomDiscountType, row.charge?.balance_due, row.charge?.booking_charge]);
  const stop = (e) => e.stopPropagation();
```

### E-492-5 — handlePaid: add guard at top

**Location:** L231 (inside handlePaid, after `if (!order || !row.orderId || paying) return;`)

**Current (L231):**
```javascript
    if (!order || !row.orderId || paying) return;
    setPaying(true); setPayError(null);
```
**After:**
```javascript
    if (!order || !row.orderId || paying) return;
    // BUG-492 Sub-B: block checkout when % discount exceeds meaningful maximum
    if (discountOverMax) { setPayError('Discount exceeds maximum. Reduce % or switch to Amount mode.'); return; }
    setPaying(true); setPayError(null);
```

### E-492-6 — Sub-A: override remainingRoomBalance in roomInfo prop

**Location:** L316
**Current:**
```javascript
              roomInfo={roomInfoFromCharge(order.roomInfo, row.charge)}
```
**After:**
```javascript
              roomInfo={roomInfoFromCharge(order.roomInfo, { // BUG-492 Sub-A: reflect discount in Checkout total
                ...row.charge,
                balance_due: Math.max(0, Number(row.charge?.balance_due || 0) - roomDiscountInfoRs)
              })}
```

---

## FILE 2: CheckInPage.jsx

### E-492-7 — Add maxPct + discountOverMax after roomDiscountRs useMemo

**Location:** After the `roomDiscountRs` useMemo block (ends at L270), before the `formValid` const (L272).

**Current (L270-272):**
```javascript
    return Math.min(Math.floor(raw), effectiveBalanceDue);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, form?.orderAmount, effectiveBalanceDue]);

  const formValid = form && form.name?.trim() && ...
```
**After:**
```javascript
    return Math.min(Math.floor(raw), effectiveBalanceDue);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, form?.orderAmount, effectiveBalanceDue]);
  // BUG-492 Sub-B: maxPct + discountOverMax for % cap validation
  const maxPct = useMemo(() => {
    const bd = effectiveBalanceDue;
    const bc = Number(form?.orderAmount || 1);
    return bc > 0 ? Math.floor(bd / bc * 100) : 100;
  }, [effectiveBalanceDue, form?.orderAmount]);
  const discountOverMax = ciRoomDiscountType === 'Percent' && Number(ciRoomDiscountAmt) > maxPct;

  const formValid = form && form.name?.trim() && ...
```

### E-492-8 — formValid: add discountOverMax condition

**Current (L272 — formValid is one long expression):**
The `formValid` const ends with `... && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod);`

**After:** Append `&& !discountOverMax` at the end of the formValid expression.

**Exact search_replace:**
```javascript
// OLD (end of formValid line):
    && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod); // CR-380 + BUG-411
```
```javascript
// NEW:
    && (Number(form.advancePayment || 0) === 0 || !!advancePaymentMethod) && !discountOverMax; // CR-380 + BUG-411 + BUG-492
```

### E-492-9 — CheckInPage: update % input max attr (L889)

**Current:**
```javascript
                            max={ciRoomDiscountType === 'Percent' ? 100 : effectiveBalanceDue || undefined}
```
**After:**
```javascript
                            max={ciRoomDiscountType === 'Percent' ? maxPct : effectiveBalanceDue || undefined}
```

### E-492-10 — CheckInPage: add red alert after discount input row

**Location:** After the discount input block (near L889), before the closing `</div>` of the discount section. Find the block that shows `roomDiscountRs > 0 &&` (lines ~L908-901) and add the alert after it.

Look for the closing of the discount input wrapper (after the reason/note area):
```javascript
// INSERT after the roomDiscountRs display block (after line ~L901):
{discountOverMax && (
  <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="ci-discount-over-max-alert">
    Maximum discount: {maxPct}% (₹{Math.floor(Number(form?.orderAmount||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
  </div>
)}
```

**Note for implementation agent:** View the file at lines 895-915 to find the exact closing JSX tag before inserting the alert. The alert goes between the `roomDiscountRs > 0` info display and the next section.

---

## FILE 3: CheckInForm.jsx

### E-492-11 — Add maxPct + discountOverMax after roomDiscountRs useMemo

**Location:** After the `roomDiscountRs` useMemo (ends at L67), before the next const.

**Current (L67):**
```javascript
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge, c.balance_due]);
```
**After:**
```javascript
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge, c.balance_due]);
  // BUG-492 Sub-B: maxPct + discountOverMax for % cap
  const maxPct = useMemo(() => {
    const bd = Number(c.balance_due    || 0);
    const bc = Number(c.booking_charge || 1);
    return bc > 0 ? Math.floor(bd / bc * 100) : 100;
  }, [c.balance_due, c.booking_charge]);
  const discountOverMax = ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct;
```

### E-492-12 — CheckInForm: update % input max attr (L189)

**Current:**
```javascript
                  max={ciRoomDiscountType === 'Percent' ? 100 : Number(c.balance_due || 0) || undefined}
```
**After:**
```javascript
                  max={ciRoomDiscountType === 'Percent' ? maxPct : Number(c.balance_due || 0) || undefined}
```

### E-492-13 — CheckInForm: add red alert after discount input

**Location:** After the `roomDiscountRs > 0` display block (around L199-201), before the next section.

**Current (L199-203, approximate):**
```javascript
              {roomDiscountRs > 0 && (
                <div ...>
                  −₹{roomDiscountRs}
                </div>
              )}
```
**After (add alert after this block):**
```javascript
              {roomDiscountRs > 0 && (
                <div ...>
                  −₹{roomDiscountRs}
                </div>
              )}
              {discountOverMax && (
                <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="checkin-form-discount-over-max-alert">
                  Maximum discount: {maxPct}% (₹{Math.floor(Number(c.booking_charge||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
                </div>
              )}
```

### E-492-14 — CheckInForm: update confirm button disabled (L223)

**Current:**
```javascript
            <button type="button" onClick={confirm} disabled={!ready || busy} data-testid="checkin-confirm-btn"
```
**After:**
```javascript
            <button type="button" onClick={confirm} disabled={!ready || busy || discountOverMax} data-testid="checkin-confirm-btn"
```

---

## Verification Matrix

| Edit | File | Change | How to Verify |
|------|------|--------|---------------|
| E-492-1/2/3 | FolioCheckoutPanel RoomSection | maxPct + alert + max attr | Enter 80% on 71%-max booking → alert shown, max=71 |
| E-492-4/5 | FolioCheckoutPanel parent | discountOverMax useMemo + handlePaid guard | 80% → click Checkout → error msg, no API call |
| E-492-6 | FolioCheckoutPanel L316 | roomInfo override | Enter ₹500 discount → Checkout shows ₹575 |
| E-492-7/8 | CheckInPage | maxPct + formValid | 80% → Confirm button disabled |
| E-492-9/10 | CheckInPage | max attr + alert | 80% → alert shown |
| E-492-11 | CheckInForm | maxPct | Confirm disabled at 80% |
| E-492-12/13/14 | CheckInForm | max + alert + disabled | Alert shown, button disabled |
| Regression | All 3 | Amount mode unchanged | Enter ₹500 amount → no alert, no block |
| Regression | All 3 | Valid % (≤maxPct) | Enter 50% on 71%-max → no alert, button enabled |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-492 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-492 row updated
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx + CheckInPage.jsx + CheckInForm.jsx — BUG-492 2026-10-06
- [ ] Code markers: // BUG-492 present in each modified file
- [ ] Compile PASS: 0 new warnings
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Sub-A: backend double-applies discount | R11 probe confirmed — backend stores room_discount separately; payment_amount = post-discount amount. No double-apply. |
| RoomSection discountOverMax computed twice | Both computations are deterministic memos of same inputs — identical result guaranteed |
| formValid one-liner change (L272 in CheckInPage) | Use search_replace with sufficient context (last condition + comment) |
| `...row.charge` spread copies GST fields | roomInfoFromCharge reads `charge.sgst/cgst` separately — spread is safe (override only balance_due) |

---

## Execution Order

BUG-493 first (simpler, 1 file) → BUG-492 (3 files). Independent — no execution dependency between the two bugs.

Gate 4 GO → IMPLEMENTATION.
