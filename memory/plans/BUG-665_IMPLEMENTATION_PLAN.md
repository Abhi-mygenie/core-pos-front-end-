# BUG-665 — Implementation Plan (Gate 3)

**ID:** BUG-665
**Date:** 2026-11-10
**Stage:** Gate 3 — Implementation Plan
**Risk:** CRITICAL (financial, R5 hotspot)
**Code Reality at HEAD:** PARTIAL — both buggy paths present. `BUG-665` marker absent.
**OD-665-01:** LOCKED — Option A: fix in CPP, `orderTransform.js` NOT touched
**OD-665-02:** LOCKED — ALL types (prepaid, postpaid, QSR, collect-bill)
**IA:** `impact/BUG-665_IMPACT_ANALYSIS.md`

---

## 1. Scope Lock

**WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx`
  - E1a: add `splitGst` / `rawSplitBase` / `finalSplitBase` computation (~L851, +4 lines)
  - E1b: replace `splitCap` on L3034 (1 line → 1 line)
  - E2: replace `finalTotal` with `finalSplitBase` in Remaining display on L3094 (1 word)

**WILL NOT touch:**
- `src/api/transforms/orderTransform.js` — reference only (Option A)
- `src/components/order-entry/OrderEntry.jsx`
- Any financial formula: `sgst`, `cgst`, `effectiveTotal`, `finalTotal`, `rawFinalTotal`
- Any print, report, settlement, receipt, loyalty, coupon code
- `onChange` split handler (intentionally unclamped per BUG-113 OD)

**Files: 1 · Edits: 3 (E1a, E1b, E2) · R5 hotspot: YES · Fast Lane: NOT eligible**

---

## 2. Exact Edits

### E1a — Add `finalSplitBase` at component level · after L850

**Insert after line 850** (`roomBalance;` — the last line of `effectiveTotal`):

```js
  // BUG-665: split cap uses whole-GST rounding to match order_amount path in orderTransform.
  // orderTransform L29: totalTax = Math.round(totalGst × 100)/100 → 192.99 → order_amount = 4052.89
  // CPP raw path:       sgst + cgst = 96.50 + 96.50 = 193.00 → effectiveTotal = 4052.90 (1p higher)
  // A 0.5-paisa SC GST intermediate (e.g. ₹350.9 × 5% = ₹17.5449...) causes the split.
  // Fix: derive the split cap from the same whole-GST rounding so splitCap == order_amount.
  const splitGst       = Math.round(totalGst * 100) / 100; // BUG-665: matches orderTransform rounding
  const rawSplitBase   = Math.round((subtotal + splitGst + vat) * 100) / 100; // BUG-665
  const finalSplitBase = applyGrandTotalRoundOff(rawSplitBase, roundOffEnabled) // BUG-665
    + (isRoom && associatedOrders.length > 0 ? associatedTotal : 0); // BUG-665: room assoc. mirrors effectiveTotal pattern
```

**Why here:** `totalGst` (L788), `subtotal` (L820), `vat` (L825), `roundOffEnabled` (L834), `associatedOrders`/`associatedTotal` (L41/247), `applyGrandTotalRoundOff` (imported L18) are all defined and in scope. This placement mirrors the `effectiveTotal` block directly above it, keeping the two totals visually paired.

**Why `finalSplitBase` already handles room orders:**
- Non-room: `finalSplitBase = fixedTotal` (associatedTotal=0, roomBalance=0) ✓
- Room: `finalSplitBase = fixedTotal + associatedTotal` = `effectiveTotal - roomBalance` (BUG-530 pattern) ✓
So the downstream `splitCap = finalSplitBase` works for both without an `isRoom` ternary.

---

### E1b — Replace `splitCap` on L3034

**Current (L3034):**
```js
                              const splitCap = isRoom ? effectiveTotal - roomBalance : effectiveTotal; // BUG-530: food-only cap for room orders; mirrors BUG-527 E3 threshold
```

**New:**
```js
                              const splitCap = finalSplitBase; // BUG-530+BUG-665: matches order_amount rounding; room assoc. already included, roomBalance excluded
```

**Why correct:**
- BUG-530's formula was `isRoom ? effectiveTotal-roomBalance : effectiveTotal`
- `effectiveTotal - roomBalance = finalTotal + associatedTotal (if room)`
- `finalSplitBase = applyGrandTotalRoundOff(rawSplitBase, ...) + associatedTotal (if room)`
- Same structure, different `rawSplitBase` (whole-GST rounded vs sgst+cgst halves). BUG-530 intent fully preserved.

---

### E2 — Remaining display on L3094

**Current (L3094):**
```js
                    Remaining: ₹{Math.max(0, finalTotal - splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0)).toFixed(2)}
```

**New:**
```js
                    Remaining: ₹{Math.max(0, finalSplitBase - splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0)).toFixed(2)} {/* BUG-665 */}
```

**Why needed:** After E1 fixes the split cap (4052.89), auto-fill puts 1052.89 in UPI.
But if the display still uses `finalTotal` (4052.90): `4052.90 − (3000+1052.89) = 0.01` → shows "Remaining: ₹0.01" misleadingly even though amounts are correct.
After fix: `4052.89 − (3000+1052.89) = 0.00` → shows "Remaining: ₹0.00" ✓.

---

## 3. Execution Sequence

1. **Entry verification** — confirm L851, L3034, L3094 match "Current" blocks above.
2. Apply **E1a** (insert 4 lines after L850).
3. Apply **E1b** (replace L3034 — 1 line).
4. Apply **E2** (replace `finalTotal` on L3094 — 1 word).
5. **Compile check** — webpack 0 new warnings.
6. **Self-test** per Verification Matrix.

---

## 4. Verification Matrix

| # | Edit | Scenario | Expected | How |
|---|---|---|---|---|
| V1 | E1a/E1b | SC=10%, prepaid split, cash=3000 | `splitCap=4052.89`, UPI auto-fills `1052.89`, `sum=4052.89=order_amount` → no backend error | Playwright intercept `place-order` |
| V2 | E2 | Same flow | Remaining display shows `₹0.00` after full fill | Screenshot / Playwright |
| V3 | E1a | SC=0 (no SC) | `splitGst = Math.round(totalGst×100)/100` = no 0.5p intermediate → `finalSplitBase = effectiveTotal` → no behaviour change | Code review (math) |
| V4 | E1a/E1b | Postpaid collect-bill split | Same fix applies — single `splitCap` covers postpaid | Playwright |
| V5 | E1a | Room order split (BUG-530 regression) | `finalSplitBase` excludes roomBalance, includes associatedTotal → same as `effectiveTotal-roomBalance` | Code review |
| V6 | — | Webpack compile | 0 new warnings | `tail /var/log/supervisor/frontend.out.log` |
| V7 | — | `onChange` handler | Unchanged — still unclamped per BUG-113 OD | grep `onChange` near split block |
| V8 | — | BUG-660 TAB credit block | Untouched — `tabIsCustomerSelected` / `tabCrmId` block unaffected | Code review |
| V9 | E1a/E1b/E2 | Code markers | `// BUG-665` present at all 3 edit sites | grep |
| V10 | E1a | round-off disabled (`totalRound=false`) | `applyGrandTotalRoundOff` returns raw value unchanged → `finalSplitBase = rawSplitBase` → consistent with `finalTotal` path | Code review |

---

## 5. Risk Register

| # | Risk | Likelihood | Mitigation | Verified by |
|---|---|---|---|---|
| R1 | SC=0 regression (no 0.5p intermediate) | LOW | `finalSplitBase = effectiveTotal` when no SC | V3 |
| R2 | BUG-530 room split regression | LOW | `associatedTotal` added, `roomBalance` excluded — mirrors exact BUG-530 formula | V5 |
| R3 | round-off regression | LOW | `applyGrandTotalRoundOff` called identically in both `finalTotal` and `finalSplitBase` paths | V10 |
| R4 | onChange unclamped broken | NONE | `onChange` handler not in scope of this edit | V7 |
| R5 | `finalSplitBase` undefined at L3094 (scope) | NONE | `finalSplitBase` defined at component level (~L851), in scope everywhere inside the render function | — |

---

## 6. Post-Code Registry Checklist (Implementation agent MUST complete)

- [ ] `registry.json`: BUG-665 → status `GATE_5A_IMPLEMENTED`, gate 5, sprint_key `nov_cr_batch`
- [ ] `BUG_TRACKER.md`: row updated with IMPLEMENTED status + edit details
- [ ] `FILE_OWNERSHIP.md`: add `CollectPaymentPanel.jsx` row — BUG-665 E1a/E1b/E2
- [ ] Code markers: `// BUG-665` at E1a (each new line), E1b (splitCap line), E2 (comment)
- [ ] QA handover: `handover/QA_HANDOVER_BUG665_<date>.md` from §4 matrix + credentials
