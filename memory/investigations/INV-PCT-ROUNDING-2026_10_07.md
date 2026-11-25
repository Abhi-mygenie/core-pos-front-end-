# INV-PCT-ROUNDING-2026_10_07 — Investigation Report

**Date:** 2026-10-07
**Role:** INVESTIGATION
**Status:** ROOT CAUSE FOUND — HIGH confidence
**Steps used:** 4/10
**Files inspected:** `CheckInForm.jsx` L67-88, `CheckInPage.jsx` L268-291

---

## 1. Summary

Root cause confirmed. Classification: **FE_BUG**. Confidence: **HIGH**.

| # | Finding | File(s) | Lines | Severity |
|---|---------|---------|-------|----------|
| **F-1** | `maxPct = toFixed(2)` rounds DOWN for TGK booking (88.3333%→88.33%) — entering stated maxPct gives roomDiscountRs=7949, not 7950 | CheckInForm.jsx + CheckInPage.jsx | L73, L274 | **BLOCKER** |
| **F-2** | `discountOverMax` disables confirm button when entry > maxPct — user who enters 88.34% (actual min % for max discount) is blocked | Both | L86-88, L287-289 | **BLOCKER** |
| **F-3** | Combined effect: in % mode user **cannot** apply maximum discount (7950) with confirm button enabled | Both | — | **BLOCKER** |

---

## 2. Root Cause Trace

### maxPct Formula (both files)
```js
const pct = Number((flat / bc * 100).toFixed(2));   // current
```

For TGK booking (bc=9000, advance=1000, gstOnAdv=50, maxFlat=7950):
```
true maxPct = 7950/9000 × 100 = 88.3333...%
toFixed(2)  → 88.33  (3rd decimal = 3 < 5, rounds DOWN)
```

**Problem**: `Math.floor(9000 × 88.33 / 100) = Math.floor(7949.7) = 7949 ≠ maxFlat (7950)`

### roomDiscountRs Cap (both files)
```js
return Math.min(Math.floor(bc * raw / 100), maxFlat);   // % mode
```

### discountOverMax (both files)
```js
ciRoomDiscountType === 'Percent' && parseFloat(ciRoomDiscountAmt) > maxPct
```

### Confirm Button Disable
- **CheckInForm.jsx**: `disabled={!ready || busy || discountOverMax || collectOverMax}`
- **CheckInPage.jsx**: `formValid = ... && !discountOverMax` → `disabled={!formValid}`

---

## 3. Full Scenario Table (TGK, after BUG-509 fix)

| % Input | roomDiscountRs | computeBase | Balance | overMax? | Confirm btn |
|---------|---------------|-------------|---------|----------|-------------|
| 88.30   | 7947          | 1003        | ₹53.15  | No       | ✅ ENABLED  |
| 88.33   | 7949          | 1001        | ₹51.05  | No       | ✅ ENABLED  |
| **88.34** | **7950** | **1000** | **₹50.00** | **Yes (current)** | **❌ DISABLED** |
| 88.35   | 7950          | 1000        | ₹50.00  | Yes      | ❌ DISABLED |

**Current formula result**: The user CANNOT apply maximum discount (₹7,950) in % mode. They are permanently stuck at ₹7,949 (balance ₹51.05 instead of ₹50).

---

## 4. Fix — Option C: ceiling maxPct to 2dp

```js
// CURRENT (toFixed rounds down for .333... → 88.33)
const pct = Number((flat / bc * 100).toFixed(2));

// FIX: ceiling to 2dp ensures entering maxPct always achieves maxFlat
const pct = Math.ceil(flat / bc * 100 * 100) / 100;  // BUG-510
```

**Verification (TGK)**:
```
Math.ceil(7950/9000 × 10000) / 100 = Math.ceil(8833.33) / 100 = 8834/100 = 88.34
```

**Scenario table after fix (maxPct=88.34)**:

| % Input | roomDiscountRs | Balance | overMax? | Confirm btn |
|---------|---------------|---------|----------|-------------|
| 88.33   | 7949          | ₹51.05  | No       | ✅ ENABLED  |
| **88.34** | **7950** | **₹50.00** | **No** | **✅ ENABLED** ✓ |
| 88.35   | 7950          | ₹50.00  | Yes      | ❌ DISABLED |
| 90.00   | 7950          | ₹50.00  | Yes      | ❌ DISABLED |

**Other booking scenarios**: fix is robust — for bookings where maxFlat/bc×100 is already a clean 2dp (or rounds up), ceil = same as current. Issue only occurs when true maxPct's 3rd decimal is 0-4.

---

## 5. Scope

| File | Line | Current | New |
|------|------|---------|-----|
| `CheckInForm.jsx` | L73 | `Number((flat / bc * 100).toFixed(2))` | `Math.ceil(flat / bc * 100 * 100) / 100` |
| `CheckInPage.jsx` | L274 | `Number((flat / bc * 100).toFixed(2))` | `Math.ceil(flat / bc * 100 * 100) / 100` |

**Files WILL NOT touch**: collectMax, maxFlat, roomDiscountRs formula, computeBase, displayGstTotal, any amounts.

**Risk**: LOW — only the displayed maxPct value and discountOverMax threshold change. The actual discount cap (maxFlat) is UNCHANGED. No financial amounts affected.

**Planning skip eligible?** 
- ≤10 lines: YES (2 lines)  
- 2 files: NO (planning skip requires 1 file)
- Not financial formula: YES (amounts unchanged)
- Not R5 hotspot: YES

→ Cannot use Fast Lane (2 files). Needs owner approval for direct fix.

---

## 6. Data Flow Break Point

```
maxPct = toFixed(2) [ROUNDS DOWN for .333... suffix]
           ↓
discountOverMax = input > maxPct [fires at 88.34%]
           ↓
confirmBtn DISABLED [user cannot check in at max %]
```

---

## 7. Recommendations

1. **Direct Bug Fix (BUG-510)**: Change `toFixed(2)` to `Math.ceil(×100)/100` in both files. Owner approval recommended.
2. **Alternative (if owner defers fix)**: Add inline note near % input: "For maximum discount, use ₹ mode and enter ₹7,950."
3. **No impact on flat Amount mode** — Amount mode uses `maxFlat` directly, not `maxPct`.
