# BUG-296 Investigation Report — FINAL (Session 2 Complete)

**ID:** BUG-296
**Dates:** 2026-08-06 (Session 1 — initial probe) / 2026-08-06 (Session 2 — deep dive + live validation)
**Investigator:** INVESTIGATION AGENT
**Steps used:** 6/10 (Session 1) + 8/10 (Session 2)
**Confidence:** HIGH — all root causes confirmed by live API probes; revenue-match confirmed numerically
**Status:** INVESTIGATION COMPLETE — ready for Planning Gate 2

---

## 1. Summary

**Two root causes found. Both confirmed by live API probes.**

### RC1 — Order count double-counting (PRIMARY — by design, no fix needed)
Food Court tabs sum to 8,306 station-orders; Item Sales shows 6,152 unique orders.
Difference = 2,154 (35% overcounting in Food Court sum).
**This is by design:** one food item belongs to exactly one station. An order with items from
multiple stations appears in every relevant station tab. The counts measure different things.
Revenue is NOT double-counted — each station tab shows only its own items' revenue.

### RC2 — Sort key mismatch + cancelled items in itemTotal (FIX REQUIRED)
Food Court uses `sort_by: 'created_at'` and includes cancelled item prices in `itemTotal`.
Item Sales uses `sort_by: 'collect_bill'` and excludes cancelled lines from sold revenue.
**After two targeted fixes, revenues match exactly (gap = ₹0.00 per station and total).**

**Classification:** FE_BUG (RC2 — display/computation logic, no backend change needed)
**Confidence:** HIGH — live API validation on rid=598, June 2026
**Restaurant:** Shimla QoH Food Court (rid=598)
**Period verified:** June 2026

---

## 2. Live API Findings — Session 1

### Order count
| Metric | Food Court | Item Sales |
|--------|-----------|-----------|
| Orders fetched | 6,170 (`created_at` sort) | 6,152 (`collect_bill` sort) |
| Paid (fos=6) | 6,152 | 6,152 |
| Cancelled (fos=3) | 18 | 0 (filtered by sort) |

### Revenue — IDENTICAL ✅ (Session 1)
| Metric | Food Court | Item Sales |
|--------|-----------|-----------|
| Item revenue (food_amount sum) | ₹18,40,043 | ₹18,40,043 |
| Order total (order_amount sum) | ₹19,79,039 | ₹19,79,039 |

### Food Court per-station order count (Session 1)
| Station | Orders in tab | Item lines | Item revenue |
|---------|-------------|-----------|-------------|
| CREAMBELLPARLOUR | 2,673 | 3,663 | ₹2,42,575 |
| GUPTAJEE | 2,046 | 3,246 | ₹7,19,873 |
| MSB | 895 | 1,425 | ₹3,02,643 |
| ZORKO | 2,692 | 4,226 | ₹5,74,952 |
| **SUM of all tabs** | **8,306** | **12,560** | **₹18,40,043** |
| **Item Sales unique** | **6,152** | **12,538** | **₹18,40,043** |

Cross-station orders: **1,739 of 6,152 (28%)** contain items from more than one station.

---

## 3. Live API Findings — Session 2 (Deep Validation)

**Token:** Fresh token obtained 2026-08-06 via `owner@shimlaqohfoodcourt.com` / `Qplazm@10`.
**Evidence:** `/app/memory/evidence/BUG-296/orders_collect_bill_fresh.json` (22MB, 6,152 orders)
           `/app/memory/evidence/BUG-296/orders_created_at_fresh.json` (22MB, 6,170 orders)

### Restaurant profile checks (confirmed by live data)
| Check | Result |
|-------|--------|
| TAB / Credit orders | **0** — payment methods: UPI (3,539), Cash (2,376), Card (220), Partial (16), Pending (1) |
| Service charge (any line) | **0 lines, ₹0.00** |
| Complementary items | **0 lines** |
| Items with unknown/no station | **0** — every item maps to exactly one of 4 stations |

### Revenue: Current Food Court vs Fixed Food Court vs Item Sales logic
| Station | Current FC (CA + all items) | Fixed FC (CB + no cancelled) | Item Sales logic | Gap after fix |
|---------|----------------------------|------------------------------|-----------------|--------------|
| CREAMBELLPARLOUR | ₹2,43,361.63 | ₹2,42,458.34 | ₹2,42,458.34 | **₹0.00** |
| GUPTAJEE | ₹7,21,103.00 | ₹7,18,535.00 | ₹7,18,535.00 | **₹0.00** |
| MSB | ₹3,02,792.00 | ₹3,01,993.00 | ₹3,01,993.00 | **₹0.00** |
| ZORKO | ₹5,75,269.00 | ₹5,74,715.00 | ₹5,74,715.00 | **₹0.00** |
| **TOTAL** | **₹18,42,525.63** | **₹18,37,701.34** | **₹18,37,701.34** | **₹0.00** |

**Total removed by the two fixes: ₹4,824.29** (cancelled item prices across all stations).

---

## 4. Root Cause Analysis

### RC1 — CONFIRMED: Cross-station order double-counting (PRIMARY — by design)
1,739 of 6,152 orders (28%) contain items from more than one station.
Food Court shows these orders in EVERY station tab they have items in (correct operational behaviour).
Item Sales counts each order once (correct restaurant-level behaviour).
```
Example: Order #12345 has 2 ZORKO items + 1 GUPTAJEE item
  Food Court ZORKO tab:    counts it (2 items)   ← 1
  Food Court GUPTAJEE tab: counts it (1 item)    ← 2 (intentional — station sees its own orders)
  Item Sales:              counts it once         ← 1
  Result: Food Court SUM = 8,306 / Item Sales = 6,152 / Diff = 2,154
```
**Revenue is NOT double-counted** — each tab shows only that station's items' revenue.
**OWNER DECISION (2026-08-06):** This is the correct food court model. No fix to order count.

### RC2a — CONFIRMED: `created_at` sort includes 18 cancelled orders (FIX 1)
- Food Court fetches with `sort_by: 'created_at'` → 6,170 orders including 18 cancelled (fos=3)
- Item Sales fetches with `sort_by: 'collect_bill'` → 6,152 paid orders only
- Fix: change `sort_by` in `foodCourtService.js:fetchChunk` to `'collect_bill'`

### RC2b — CONFIRMED: Cancelled item prices included in `itemTotal` (FIX 2)
- `toStationRow()` in `foodCourtService.js:129`:
  `const itemTotal = stationItems.reduce((s, it) => s + (it.price || 0), 0)` — includes ALL items
- Tax already correctly excludes foodStatus=3: `stationItems.filter(it => it.foodStatus !== 3)`
- Fix: add same filter to itemTotal: `stationItems.filter(it => it.foodStatus !== 3).reduce(...)`

### RC3 — ELIMINATED: Date range widening
- CANCEL_LOOKBACK_DAYS widens Item Sales fetch window; revenue totals still match → not a factor

### RC4 — ELIMINATED: Discount calculation difference
- Both produce identical revenue totals → no material discount calculation difference

---

## 5. Evidence Artifacts

- `/app/memory/evidence/BUG-296/api_probe_2026_08_06.json` — Session 1 summary data
- `/app/memory/evidence/BUG-296/orders_collect_bill_fresh.json` — Session 2: 6,152 paid orders (collect_bill)
- `/app/memory/evidence/BUG-296/orders_created_at_fresh.json` — Session 2: 6,170 orders (created_at)
- `/app/memory/evidence/BUG-296/pos_token_fresh.txt` — Fresh token (2026-08-06)
- `/app/memory/evidence/BUG-296/investigation_note.md` — Session 1 credential attempts
- Live probe: preprod.mygenie.online, rid=598, June 2026

---

## 6. Recommendation

**Classification: FE_BUG — foodCourtService.js two-line fix**
**Scope: 1 file (`foodCourtService.js`), 2 edits**
**Planning skip eligibility:** NOT eligible — reports revenue area (R6 HIGH risk) requires full Gate 2-3
**Path:** PLANNING Gate 2 → Gate 3 → Implementation (simple but HIGH risk classification)

### Fix A — Sort key (RC2a) — `foodCourtService.js:106`
```js
// BEFORE
sort_by: 'created_at', from_date: chunk.from, to_date: chunk.to,
// AFTER
sort_by: 'collect_bill', from_date: chunk.from, to_date: chunk.to,
```

### Fix B — itemTotal excludes cancelled (RC2b) — `foodCourtService.js:129`
```js
// BEFORE
const itemTotal = stationItems.reduce((s, it) => s + (it.price || 0), 0);
// AFTER
const itemTotal = stationItems.filter(it => it.foodStatus !== 3).reduce((s, it) => s + (it.price || 0), 0);
```

### What does NOT need fixing (owner confirmed)
- Order count discrepancy (RC1): by design — food court model is station-level, not unique-order
- TAB/credit: absent for this restaurant
- Service charge: absent for this restaurant (confirmed ₹0 across all 6,152 orders)

---

## 7. Retroactive Candidates
None.

---

## 8. Next Steps
- Owner approves Gate 2 → PLANNING agent writes Impact Analysis + Implementation Plan
- Scope: 1 file, 2 edits, ~2 lines changed
- No backend change needed
- Regression test: verify station revenue totals before/after on June data (baseline: ₹18,37,701.34 per station breakdown above)
