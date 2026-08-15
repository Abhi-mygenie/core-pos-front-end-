# BUG-296 — Implementation Plan (Gate 3)

**ID:** BUG-296
**Title:** Food Court Report vs Item-Wise Report — Revenue Mismatch
**Date:** 2026-08-06
**Author:** PLANNING agent
**Stage:** Gate 3 — Implementation Plan
**Depends on:** `impact/BUG-296_IMPACT_ANALYSIS.md` (Gate 2, verified accurate before writing this plan)
**Risk:** HIGH (R6 — reports revenue computation)
**Sprint:** pos_5_1

---

## GATE 4 GO RECORD

```
Gate 4 GO: APPROVED
Owner words: "read /memory/control/ and read agent alpha prompt choose implemnation role for bug 296 follow gates and rules"
Date: 2026-08-06
```

---

## Entry Verification (Implementation agent must run before first edit)

```bash
# Confirm all 3 target lines still match — run before touching the file
grep -n "created_at\|sort_by\|itemTotal\|foodStatus" \
  /app/frontend/src/api/services/foodCourtService.js | head -10
```

Expected output must include:
```
105:    buildCacheKey(restaurantId, 'order-logs', 'created_at', chunk.from, chunk.to),
108:        sort_by: 'created_at', from_date: chunk.from, to_date: chunk.to,
129:  const itemTotal = stationItems.reduce((s, it) => s + (it.price || 0), 0);
```

If any line is missing or differs → **STOP. Return to PLANNING. Plan is stale.**

---

## Scope Lock

**Files WILL change:**
- `src/api/services/foodCourtService.js` — 3 edits (E1, E2, E3)

**Files WILL NOT touch:**
- `FoodCourtMockup.jsx`
- `ItemSalesHybridMockup.jsx`
- `insightsService.js`
- `insightsCache.js`
- `orderTransform.js`
- `reportTransform.js`
- Any file under `/app/memory/final/`

---

## Execution Sequence

Execute in order. E1 + E2 are atomic — ship in the same edit.

### E1 — Cache key: `'created_at'` → `'collect_bill'` (`foodCourtService.js:105`)

**Current (line 105):**
```js
    buildCacheKey(restaurantId, 'order-logs', 'created_at', chunk.from, chunk.to),
```

**New:**
```js
    buildCacheKey(restaurantId, 'order-logs', 'collect_bill', chunk.from, chunk.to), // BUG-296: align cache key with sort_by
```

**Why:** `buildCacheKey` signature is `(rid, endpoint, sortBy, from, to)`. If the cache key stays `'created_at'` while the API call uses `'collect_bill'`, any previously-cached result from a `created_at` fetch (6,170 orders) will be served instead of the new `collect_bill` result (6,152 paid orders). E1 and E2 are an atomic pair.

---

### E2 — Sort key: `'created_at'` → `'collect_bill'` (`foodCourtService.js:108`)

**Current (line 108):**
```js
        sort_by: 'created_at', from_date: chunk.from, to_date: chunk.to,
```

**New:**
```js
        sort_by: 'collect_bill', from_date: chunk.from, to_date: chunk.to, // BUG-296: use collect_bill to exclude cancelled orders (fos=3)
```

**Why:** `created_at` sort returns 6,170 orders including 18 cancelled (fos=3). `collect_bill` sort returns only 6,152 paid orders — aligns with Item Sales attribution.

---

### E3 — Exclude cancelled items from `itemTotal` (`foodCourtService.js:129`)

**Current (line 129):**
```js
  const itemTotal = stationItems.reduce((s, it) => s + (it.price || 0), 0);
```

**New:**
```js
  const itemTotal = stationItems.filter((it) => it.foodStatus !== 3).reduce((s, it) => s + (it.price || 0), 0); // BUG-296: exclude cancelled items (foodStatus=3) — aligns with gstAmount/vatAmount on L130-131
```

**Why:** Lines 130-131 (gstAmount, vatAmount) already filter `foodStatus !== 3`. Line 129 was inconsistent — summing ALL items' prices including cancelled. This caused ₹3,041 overcounting on June data. After this fix, lines 129/130/131 are consistent.

**Side-effect (documented):** `orderItemTotal` on line 134 still includes cancelled items in the discount share calculation. Impact is negligible for Shimla QoH Food Court (rare cancellations, no order-level discounts). Acceptable per owner scope.

---

## Checkpoint After Edits

```
After completing all 3 edits, verify before EXIT GATE:
  ☑ E1 done — cache key says 'collect_bill' at line ~105
  ☑ E2 done — sort_by says 'collect_bill' at line ~108
  ☑ E3 done — itemTotal has .filter(it => it.foodStatus !== 3) at line ~129
  ☑ Compile — webpack 0 new warnings
```

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | E1 shipped without E2 (or vice versa) → stale cache serves wrong data | Treat E1+E2 as atomic — one `search_replace` call for the `fetchOrReuse` block covering both lines |
| R2 | Plan stale — line numbers shifted | Entry Verification grep must pass before coding |
| R3 | Discount share slightly changed (known side-effect) | Documented in Impact Analysis §5. Negligible for Shimla. No action needed. |
| R4 | Business-day filter (L119-123) still uses `createdAt` | Correct — `collect_bill` sort returns paid orders; business-day filter then scopes them. Validated by live probe (gap=₹0.00). |
| R5 | Hot-reload restarts mid-edit cause partial state | Edit all 3 lines before browser verification |

---

## Verification Matrix (Gate 5a — Self-Test)

Inherited from Impact Analysis §9. Implementation agent must execute all before writing QA Handover.

| # | Check | Command / Method | Expected |
|---|-------|-----------------|---------|
| V1 | E1 cache key | `grep -n "buildCacheKey.*collect_bill" src/api/services/foodCourtService.js` | 1 hit at line ~105 |
| V2 | E2 sort key | `grep -n "sort_by.*collect_bill" src/api/services/foodCourtService.js` | 1 hit at line ~108 |
| V3 | E3 itemTotal filter | `grep -n "foodStatus.*3.*reduce" src/api/services/foodCourtService.js` | 1 hit at line ~129 |
| V4 | L129/130/131 consistency | view lines 129-131 — all three use `foodStatus !== 3` filter | all consistent |
| V5 | No `created_at` in fetchChunk | `grep -n "created_at" src/api/services/foodCourtService.js` | 0 hits in fetchChunk (helpers inRange/dateOnly/timeOnly use createdAt field access — those are fine; only the sort_by and cache key strings must be gone) |
| V6 | Code markers present | `grep -n "BUG-296" src/api/services/foodCourtService.js` | 3 hits (one per edit) |
| V7 | Webpack compiles | `tail -5 /var/log/supervisor/frontend.out.log` | "Compiled" or "compiled with N warning(s)" — 0 new warnings |
| V8 | Revenue verification | curl probe: `owner@shimlaqohfoodcourt.com`, rid=598, June 2026 | ZORKO = ₹5,74,715.00 — matches baseline |
| V9 | Total verification | same probe | All stations total = ₹18,37,701.34 |
| V10 | Order count | Food Court "All Orders" tab June 2026 | 6,152 (not 6,170) |

---

## Post-Code Registry Checklist (EXIT GATE — Step 5)

Implementation agent MUST verify all before writing QA Handover:

```
□ 1. REGISTRY SYNC:
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f:
         d = json.load(f)
     items = {i['id']: i for i in d['items']}
     assert 'BUG-296' in items, 'BUG-296 MISSING'
     assert 'IMPLEMENTED' in items['BUG-296'].get('status',''), 'BUG-296 not IMPLEMENTED'
     assert items['BUG-296'].get('sprint_key') == 'pos_5_1', 'wrong sprint'
     print('✅ Registry sync PASS')
     "

□ 2. BUG_TRACKER.md: BUG-296 row status → IMPLEMENTED — Gate 5a PASS

□ 3. FILE_OWNERSHIP.md: add row:
     | foodCourtService.js | BUG-296: E1 cache key, E2 sort_by, E3 itemTotal filter | BUG-296 IMPL agent (2026-08-06) |

□ 4. CODE MARKERS: grep -n "BUG-296" src/api/services/foodCourtService.js → 3 hits

□ 5. COMPILE CHECK: webpack 0 new warnings from this change
```

---

## QA Handover Template (seed)

Implementation agent writes QA Handover at `/app/memory/handover/QA_HANDOVER_BUG296_<DATE>.md` using this template:

```markdown
## 1. Verification Matrix Results (self-test)
| V# | Check | Result |
|----|-------|--------|
| V1 | cache key collect_bill | ✅ / ❌ |
| V2 | sort_by collect_bill | ✅ / ❌ |
| V3 | itemTotal filter foodStatus!==3 | ✅ / ❌ |
| V4 | L129/130/131 consistent | ✅ / ❌ |
| V5 | No created_at in fetchChunk sort | ✅ / ❌ |
| V6 | Code markers BUG-296 x3 | ✅ / ❌ |
| V7 | Webpack compile clean | ✅ / ❌ |
| V8 | ZORKO revenue = ₹5,74,715 | ✅ / ❌ |
| V9 | All stations total = ₹18,37,701.34 | ✅ / ❌ |
| V10 | Order count 6,152 (not 6,170) | ✅ / ❌ |

## 2. Regression tests
| # | What to verify | Why |
|---|---------------|-----|
| R1 | Other stations (CREAMBELLPARLOUR, GUPTAJEE, MSB) revenue matches baselines | Confirm all 4 stations correct, not just ZORKO |
| R2 | Food Court Audit tab still loads (no errors) | Audit uses allOrders path — must be unaffected |
| R3 | Food Court date range change + reload — same numbers on second load | Confirms cache key fix (E1) works — no stale data |

## 3. Registry Sync Confirmation
  Registry synced: YES
  Item: BUG-296
  Sprint: pos_5_1
  EXIT GATE: ALL 5 PASSED

## 4. Credentials + Environment
  Account: owner@shimlaqohfoodcourt.com / Qplazm@10
  Restaurant: Shimla QoH Food Court (rid=598)
  Test period: June 2026
  Preprod: https://preprod.mygenie.online
```

---

## Revenue Baseline (regression reference)

From live probe 2026-08-06 (`evidence/BUG-296/live_validation_2026_08_06.json`):

| Station | Expected after fix |
|---------|--------------------|
| CREAMBELLPARLOUR | ₹2,42,458.34 |
| GUPTAJEE | ₹7,18,535.00 |
| MSB | ₹3,01,993.00 |
| ZORKO | ₹5,74,715.00 |
| **TOTAL** | **₹18,37,701.34** |
| Order count | 6,152 (not 6,170) |
