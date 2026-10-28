# BUG-614 + BUG-615 — Implementation Plan

**Items:** BUG-614 (Preset Discount Apply Fails) + BUG-615 (Flat Discount Exceeds Order Total)
**Stage:** Gate 3 — Implementation Plan
**Code Reality:** PARTIAL
**Risk:** HIGH (financial logic)
**Scope Lock:** Single file: `src/components/order-entry/CollectPaymentPanel.jsx`. No other files change.

---

## Execution Sequence

**Order: E1 → E2 → compile check.** E1 replaces `handleApplyDiscount`. E2 adds 1 line to input onChange. Both in the same file, no dependency between them.

---

## E1: handleApplyDiscount — Add preset path + flat clamp

**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Action:** Replace L371-388 (the full `handleApplyDiscount` useCallback)

**Current L370-388:**
```js
  // Validates before every POST: empty/0 → toast, percent>100 → toast.
  const handleApplyDiscount = useCallback(async () => {
    const val = parseFloat(discountValue || 0);
    if (!val || val === 0)                              { toast.error('Please enter discount amount'); return; }
    if (discountType === 'percent' && val > 100)        { toast.error('Please enter valid discount');  return; }
    try {
      if (isDiscountApplied) {
        await applyOrderDiscount({ orderId, discountAmount: 0, discountType: discountType || 'percent', discountNote: '' });
        setIsDiscountApplied(false);
      } else {
        await applyOrderDiscount({ orderId, discountAmount: val, discountType: discountType || 'percent', discountNote: discountFor || '' });
        setIsDiscountApplied(true);
      }
    } catch {
      toast.error('Failed to apply discount. Please try again.');
    }
  }, [isDiscountApplied, discountValue, discountType, discountFor, orderId]);
```

**New:**
```js
  // BUG-614 + BUG-615: Validates before every POST. Handles preset category + manual + flat cap.
  const handleApplyDiscount = useCallback(async () => {
    // BUG-614: Preset path — compute ₹ amount from category percentage
    if (selectedDiscountType) {
      const presetAmt = Math.round((discountableTotal * selectedDiscountType.discountPercent)) / 100;
      if (!presetAmt || presetAmt === 0) { toast.error('Discount amount is zero'); return; }
      try {
        if (isDiscountApplied) {
          await applyOrderDiscount({ orderId, discountAmount: 0, discountType: 'percent', discountNote: '' });
          setIsDiscountApplied(false);
        } else {
          await applyOrderDiscount({ orderId, discountAmount: presetAmt, discountType: 'percent', discountNote: selectedDiscountType.name || '' });
          setIsDiscountApplied(true);
        }
      } catch {
        toast.error('Failed to apply discount. Please try again.');
      }
      return;
    }
    // Manual path
    let val = parseFloat(discountValue || 0);
    if (!val || val === 0)                              { toast.error('Please enter discount amount'); return; }
    if (discountType === 'percent' && val > 100)        { toast.error('Please enter valid discount');  return; }
    // BUG-615: Flat cap — clamp to discountableTotal before API call
    if (discountType === 'flat' && val > discountableTotal) val = discountableTotal;
    try {
      if (isDiscountApplied) {
        await applyOrderDiscount({ orderId, discountAmount: 0, discountType: discountType || 'percent', discountNote: '' });
        setIsDiscountApplied(false);
      } else {
        await applyOrderDiscount({ orderId, discountAmount: val, discountType: discountType || 'percent', discountNote: discountFor || '' });
        setIsDiscountApplied(true);
      }
    } catch {
      toast.error('Failed to apply discount. Please try again.');
    }
  }, [isDiscountApplied, discountValue, discountType, discountFor, orderId, selectedDiscountType, discountableTotal]);
```

---

## E2: Input onChange — Add flat hard-cap

**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Action:** Insert 1 line after L1458

**Current L1458:**
```js
                    if (discountType === 'percent' && val > 100) { setDiscountValue('100'); return; }
```

**Insert after L1458:**
```js
                    if (discountType === 'flat' && val > discountableTotal) { setDiscountValue(String(Math.floor(discountableTotal))); return; } // BUG-615
```

---

## Verification Matrix

| # | Edit | Test | Steps | Expected |
|---|---|---|---|---|
| V1 | E1 | Preset Apply | Select "Family — 50%" on ₹20 order → Apply | Discount applied, -₹10 shown, Unapply button appears |
| V2 | E1 | Preset Unapply | Click Unapply after V1 | Discount removed, Apply button returns |
| V3 | E1 | Preset on zero-item order | Select preset with 0 items in cart → Apply | "Discount amount is zero" toast |
| V4 | E1 | Manual % regression | Select "%", type 10, Apply on ₹100 order | ₹10 discount applied |
| V5 | E1 | Manual ₹ regression | Select "₹", type 5, Apply | ₹5 discount applied |
| V6 | E1+E3 | Flat > total via Apply | Select "₹", type 40 on ₹20 order, Apply | API receives 20 (clamped), not 40 |
| V7 | E2 | Flat input hard-cap | Select "₹", type 40 on ₹20 order | Input auto-clamps to 20 |
| V8 | E2 | Percent regression | Select "%", type 150 | Input auto-clamps to 100 (existing behavior preserved) |
| V9 | ALL | Compilation | webpack | Compiles with 0 new warnings |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-614 + BUG-615 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md or CR_REGISTRY.md: rows updated
- [ ] FILE_OWNERSHIP.md: CollectPaymentPanel.jsx listed
- [ ] Code markers: // BUG-614 and // BUG-615 in modified lines
- [ ] Compile check: webpack 0 new warnings
```

---

## Gate Status

- Gate 2: COMPLETE (Impact Analysis)
- Gate 3: **COMPLETE** (this document)
- Gate 4: Awaiting owner "Gate 4 GO" → Implementation
