# BUG-614 + BUG-615 — Combined Impact Analysis

**Items:** BUG-614 (Preset Discount Apply Fails) + BUG-615 (Flat Discount Exceeds Order Total)
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL (validation exists for percent, missing for preset + flat cap)
**Risk:** HIGH (BUG-614) + CRITICAL (BUG-615)
**Conflict Pre-Check:** CPP is touched by many items but all listed are at GATE_5A+ (implemented/QA'd). No active in-progress work on handleApplyDiscount or discount input onChange. Parallel-safe.

---

## Owner Decisions — LOCKED

| OD | Decision |
|---|---|
| **OD-614-01** | Apply sends computed ₹ amount as `discount_amount`, `"percent"` as `discount_type`, category name as `discount_note`. Same contract as manual Apply — no backend change. |
| **OD-615-01** | Hard-cap: flat input auto-clamps to `discountableTotal` (same UX as percent → 100 cap). |

---

## Data Flow Trace

### BUG-614: Preset Apply path (broken)
```
User selects "Family — 50%" from dropdown
  → L1416-1420: setSelectedDiscountType(found), setDiscountType(null), setDiscountValue("")
User clicks Apply
  → handleApplyDiscount() L371
  → val = parseFloat(discountValue || 0) → 0
  → L373: if (!val || val === 0) → toast error → BLOCKED ❌

SHOULD BE:
  → detect selectedDiscountType is set
  → compute presetDiscount = discountableTotal × selectedDiscountType.discountPercent / 100
  → applyOrderDiscount({ orderId, discountAmount: presetDiscount, discountType: 'percent', discountNote: selectedDiscountType.name })
  → setIsDiscountApplied(true) ✅
```

### BUG-615: Flat cap path (missing)
```
User selects "₹" flat, types 40 on ₹20 order
  → Input onChange L1448: no cap for flat (only percent → 100)
  → val=40, setDiscountValue("40") → ALLOWED ❌

User clicks Apply
  → handleApplyDiscount() L371
  → val=40, discountType='flat'
  → L374: only checks percent > 100, no flat check
  → L380: applyOrderDiscount({ discountAmount: 40 }) → sends 40 to backend ❌
  → backend receives ₹40 discount on ₹20 order

SHOULD BE:
  → Input onChange: if (discountType === 'flat' && val > discountableTotal) clamp
  → handleApplyDiscount: if (discountType === 'flat') val = Math.min(val, discountableTotal)
```

---

## Affected Files

### Single file: `src/components/order-entry/CollectPaymentPanel.jsx`

| # | Edit | Location | Change | Lines | Risk |
|---|---|---|---|---|---|
| **E1** | BUG-614 | `handleApplyDiscount` L371-386 | Add preset path: when `selectedDiscountType` is set, compute amount and send to API | Replace ~16 lines → ~30 lines | HIGH — financial logic, must match payment-time behavior |
| **E2** | BUG-615 | Input `onChange` L1458 | Add flat cap: `if (discountType === 'flat' && val > discountableTotal)` clamp | +1 line after L1458 | LOW — mirrors existing percent cap pattern |
| **E3** | BUG-615 | `handleApplyDiscount` L374 | Add flat validation: clamp `val` to `discountableTotal` before API call | +1 line after L374 | LOW — safety net before API |

### Files WILL NOT change
- `orderService.js` — `applyOrderDiscount` API shape unchanged
- `orderTransform.js` — payment-time discount fields unchanged
- Any other file

---

## E1: handleApplyDiscount — Add preset path (BUG-614)

**Current L371-386:**
```js
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

**New (BUG-614 + BUG-615 E3 combined):**
```js
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
    // Manual path (existing)
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

**Key changes:**
- Early return for preset path: computes `presetAmt` using same formula as L658-659 (`discountableTotal × discountPercent / 100`)
- Sends `discountType: 'percent'` and `discountNote: selectedDiscountType.name` (e.g., "Family")
- Adds `selectedDiscountType` and `discountableTotal` to deps array
- Manual path: adds `BUG-615` flat clamp before API call

---

## E2: Input onChange — Add flat cap (BUG-615)

**Current L1458:**
```js
if (discountType === 'percent' && val > 100) { setDiscountValue('100'); return; }
```

**Insert after L1458:**
```js
if (discountType === 'flat' && val > discountableTotal) { setDiscountValue(String(Math.floor(discountableTotal))); return; } // BUG-615
```

**+1 line.** Same pattern as percent cap. Uses `Math.floor` to avoid decimal input issues.

---

## Verification Matrix

| # | Edit | Verification | Method |
|---|---|---|---|
| V1 | E1 | Select "Family — 50%" preset → click Apply → discount applied (no toast error) | Browser (mantri) |
| V2 | E1 | Preset Apply: verify API receives correct ₹ amount (50% of order total) | Network tab |
| V3 | E1 | Preset Unapply: click Apply again → discount removed | Browser |
| V4 | E1 | Manual % still works: select "%", type 10, Apply → discount applied | Browser |
| V5 | E1 | Manual ₹ still works: select "₹", type 5, Apply → discount applied | Browser |
| V6 | E2 | Flat input: type 40 on ₹20 order → auto-clamps to 20 | Browser |
| V7 | E3 | Flat Apply: even if somehow val > total, API receives clamped value | Code review |
| V8 | ALL | webpack compiles, 0 new warnings | CLI |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Preset ₹ amount miscalculated | LOW | HIGH | Same formula as existing L658-659, tested path |
| Flat cap breaks edge case (₹0 order) | LOW | LOW | `discountableTotal` is 0 → val clamped to 0 → "enter discount amount" toast |
| Deps array mismatch causes stale closure | LOW | MEDIUM | Added `selectedDiscountType` + `discountableTotal` to deps |
| Payment-time flow regression | LOW | HIGH | E1 only touches Apply path. Payment-time flow (L1170+) untouched. |

---

## Gate Status

- Gate 1: COMPLETE (Intake)
- Gate 2: **COMPLETE** (this document)
- Gate 3: Awaiting "Gate 3 GO" → Implementation Plan
