# SESSION HANDOVER — 2026-10-07 (BUG-510: % Mode maxPct Rounding)

**Date:** 2026-10-07
**Role:** INVESTIGATION → IMPLEMENTATION (direct fix, pre-Gate-2)
**App URL:** https://core-pos-preview-19.preview.emergentagent.com
**webpack:** compiled successfully · 0 new warnings

---

## 1. WHAT WAS INVESTIGATED AND FIXED

### BUG-510 — % Discount Mode: maxPct rounding blocks max discount

**Root cause**: `maxPct = Number((flat / bc * 100).toFixed(2))`

For TGK (bc=9000, adv=1000, gstOnAdv=50, maxFlat=7950):
- True maxPct = 88.3333...%
- `toFixed(2)` rounds DOWN → maxPct = **88.33**
- `Math.floor(9000 × 88.33 / 100) = 7949 ≠ maxFlat(7950)`
- Any % ≥ 88.34 (which achieves maxFlat) triggers `discountOverMax = TRUE` → **confirm button DISABLED**

**Result**: User **cannot** apply maximum discount in % mode.
- 88.33% → disc=7949, button ENABLED but balance=₹51.05 (not ₹50)
- 88.34% → disc=7950, button **DISABLED** (over-max alert)

**Fix** (1 line × 2 files):
```js
// OLD: toFixed(2) rounds down
const pct = Number((flat / bc * 100).toFixed(2));

// NEW: ceil to 2dp — ensures entering maxPct achieves maxFlat via Math.floor
const pct = Math.ceil(flat / bc * 100 * 100) / 100; // BUG-510
```

**After fix** (maxPct=88.34):
- 88.34% → disc=7950=maxFlat, overMax=FALSE, button ENABLED ✓
- 88.35% → disc=7950 (capped), overMax=TRUE, button DISABLED ✓
- 88.33% → disc=7949, button ENABLED (user chose below max)

---

## 2. FILES CHANGED

| File | Line | Change |
|------|------|--------|
| `src/components/pms/frontdesk/CheckInForm.jsx` | L73 | `Math.ceil(flat/bc*100*100)/100` |
| `src/pages/pms/CheckInPage.jsx` | L274 | same |

**Files NOT touched**: maxFlat, roomDiscountRs, computeBase, collectMax, any financial amounts.

---

## 3. INVESTIGATION REPORT

Full report: `investigations/INV-PCT-ROUNDING-2026_10_07.md`

---

## 4. CRITICAL WARNINGS FOR NEXT AGENT

- `collectMax` (CheckInForm L90) and `effectiveBalanceDue` (CheckInPage L256-263) **MUST NOT CHANGE** (BUG-500/OD-500-04)
- `maxFlat` formula unchanged — still `bc - advance - gstOnAdv`
- BUG-509 fixes (computeBase = gstBase - gstOnAdvFloor) still in place

---

## 5. NEXT STEPS (before Gate 2/3 planning)

The investigation task requested is complete. Ready to proceed:

1. **Gate 2: Impact Analysis** for any remaining items (BUG-498+499 QA handover still pending)
2. **Gate 5b QA** for BUG-505 → BUG-509 + BUG-510: need today-dated check-in booking
3. **Owner smoke**: present full check-in discount series on preprod

---

## 6. CREDENTIALS

| Item | Value |
|------|-------|
| App URL | `https://core-pos-preview-19.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online/` |
| Login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Branch | `5oct-1` |
