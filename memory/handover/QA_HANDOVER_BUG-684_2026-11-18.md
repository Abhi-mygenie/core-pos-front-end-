# QA Handover — BUG-684
**Date:** 2026-11-18
**From:** Implementation Agent (Gate 5a complete)
**To:** QA Agent (Gate 5b)
**Item:** BUG-684 — Cart "Collect Bill" Button Round-Off Mismatch

---

## 1. Verification Matrix (inherited from plan — self-test results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| E1 | `OrderEntry.jsx` L17 | `grep applyGrandTotalRoundOff` → import + 2 call sites (3 hits) | ✅ 3 hits confirmed |
| E2 | `OrderEntry.jsx` L1155–1156 | `localTax` now rounds per item; Node check: 6.1905→6.19, 5.7145→5.71, sum=11.90 | ✅ Math verified |
| E3 | `OrderEntry.jsx` L1171–1172 | `unplacedTax` now rounds per item (identical pattern to E2) | ✅ Confirmed |
| E4 | `OrderEntry.jsx` L1193–1196 | `grep applyRoundOff` → 0 hits (old function gone); `roundOffEnabled` present | ✅ 0 hits |
| E5 | `OrderEntry.jsx` L1225+1227 | Both call sites use `applyGrandTotalRoundOff(raw, roundOffEnabled)` | ✅ Confirmed |
| V7 | Unit tests | `npx craco test --watchAll=false --testPathPattern=round001` | NOT RUN (no login) |
| V8 | Webpack | `webpack compiled with 1 warning` | ✅ 0 new warnings |

**Node quick-check (reported case):**
- Input: 123.81 + 114.29 @ GST 5% exclusive
- item1 tax: 6.1905 → 6.19; item2 tax: 5.7145 → 5.71; sum: 11.90
- rawTotal: 250.00 → applyGrandTotalRoundOff → **250** ✅ (was 251 before fix)

---

## 2. Test Cases for QA

| # | Case | Setup | Expected Button | Expected Payload |
|---|------|-------|-----------------|-----------------|
| V1 | Reported case (paise < 10) | 123.81 + 114.29 @ GST 5% excl | **₹250** | 250 |
| V2 | Paise ≥ 10 boundary | Items summing to raw ~250.50 | **₹251** | 251 |
| V3 | Paise 90–99 (was wrongly floored before fix) | Items summing to raw ~250.95 | **₹251** | 251 |
| V4 | Round-off OFF restaurant | Any items, restaurant totalRound=false | **2-decimal** (e.g. ₹250.01) | same 2-decimal |
| V5 | Add items to placed order | Place 1 item → add 1 more unplaced | Button = placed + correctly rounded new portion | matches update payload |
| V6 | Exact rupee total (paise = 0) | Items summing to exactly ₹250.00 | **₹250** | 250 |

---

## 3. Regression scope

| Area | Risk | Notes |
|------|------|-------|
| Other cart totals | NONE | Only `localTax`, `unplacedTax`, and `total` changed |
| Payload / backend | NONE | No payload field touched |
| CollectPaymentPanel | NONE | Was already on shared helper — untouched |
| orderTransform.js | NONE | Out of scope — untouched |

---

## 4. Files changed

| File | Lines changed |
|------|--------------|
| `src/components/order-entry/OrderEntry.jsx` | L17, L1155–1156, L1171–1172, L1193–1196, L1225, L1227 |

---

## 5. Registry / tracker status

- `registry.json`: BUG-684 → `IMPLEMENTED`, sprint `nov_cr_batch` ✅
- `BUG_TRACKER.md`: row updated to IMPLEMENTED ✅
- `FILE_OWNERSHIP.md`: entry added ✅
