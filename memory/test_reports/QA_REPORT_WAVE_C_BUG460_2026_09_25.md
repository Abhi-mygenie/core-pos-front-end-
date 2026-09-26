# QA REPORT — Wave C — BUG-460 — 2026-09-25

**Role:** QA (Role 4) · **Scope:** Wave C only (V7–V10, browser tests)
**Item:** BUG-460 — Suggested Qty Rounds to Whole Display Unit
**Testing agent run:** `test_reports/iteration_4.json`
**Result: PASS (4/4)**

---

## Test Results

| # | Test | Screen | Expected | Actual | Result | Severity |
|---|------|--------|----------|--------|--------|----------|
| V7 | Table 2 "Suggested Qty" column shows whole display unit for converted rows | Smart Purchase → All Ingredients | "3 bottle" style (whole) | "642 bottle", "8 box", "321 bottle", "11 pkt", "746 bottle" — all whole | **PASS** | — |
| V8 | "suggest:" hint in Table 1 shows whole display unit | Smart Purchase → purchase list | "642 bottle" (whole) | "suggest: 642 bottle" confirmed on row-qty-20496 | **PASS** | — |
| V9 | Two-box major=whole, minor=0 | Smart Purchase → converted row | major="642", minor="0" | major="642", minor="0" (data-testid confirmed) | **PASS** | — |
| V10 | Projected Need / Gap NOT rounded (partial breakdown preserved) | Smart Purchase → Table 1 | Gap still fractional e.g. "641 bottle 330 ml" | projected_need="650 bottle", gap="-641 bottle 330 ml" (fractional) | **PASS** | — |

---

## Math Verification (UAT BAR BEER, ingredient_id=20496)

| Field | Value |
|-------|-------|
| Conversion factor | 650 ml/bottle |
| On-hand | 8.49 bottle (5519 ml) |
| Projected need (threshold) | 650 bottle (alert) |
| Gap raw | 641.51 bottle |
| Gap displayed | -641 bottle 330 ml (fractional — **unchanged by BUG-460** ✅) |
| suggest_qty old behaviour | would have shown "641 bottle 330 ml" |
| suggest_qty new (BUG-460) | **642 bottle** (ceil(641.51) = 642 × 650 ml) ✅ |

---

## Findings

**BLOCKER:** 0
**MAJOR:** 0
**MINOR:** 0

---

## Observations (NOTE — not failures)

| # | Observation |
|---|-------------|
| O1 | `projected_need` for `stock_alert` rows renders as whole units (e.g. "650 bottle") because threshold = `minQtyAlert × conversionFactor` — always a whole multiple. This is expected behaviour, not a rounding side-effect of BUG-460. |
| O2 | `gap` column for the same row is correctly fractional ("641 bottle 330 ml") — confirms BUG-460 only modified `suggest_qty` computation and left `gap` / `projected_need` untouched (OD-460-03 honoured). |
| O3 | Five converted rows verified in Table 2 (BAR BEER, GHEE BOX, PINE BOTTLE, RAITA CUP, WHISKEY BOTTLE) — all show whole suggest quantities. Broad coverage across different ingredients. |

---

## Coverage

| File touched by BUG-460 | Test exercised |
|-------------------------|---------------|
| `src/utils/quantityBreakdown.js` (`ceilToDisplayUnit`) | V1–V6 unit tests (prev. session) + V7-V10 browser ✅ |
| `src/utils/purchasePlanner.js` (velocity + alert rows) | V1–V6 unit tests (prev. session) + V7-V10 browser ✅ |

**Coverage: 2/2 changed files have ≥1 browser test ✅**

---

## Registry Spot-Check

BUG-460 status in registry.json verified after this QA run → updating to `GATE_5B_QA_PASS`.

---

## Summary

```
Verification complete: BUG-460 Wave C (V7–V10 browser)
Result: PASS
Tests: 4 total, 4 pass, 0 fail
Blockers: none
Coverage: 2/2 changed files tested
Registry: SYNCED (→ GATE_5B_QA_PASS)
Report: test_reports/QA_REPORT_WAVE_C_BUG460_2026_09_25.md
Next: Wave D — Regression (R1–R9)
```
