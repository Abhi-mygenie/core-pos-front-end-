# BUG-579 — Impact Analysis (Gate 2) — REVISED v2
## Cancellation report — complete end-to-end audit (6 months, Palm House + Pav2)

**ID:** BUG-579
**Date:** 2026-10-21 (revised v2 after full 6-month probe on 2 restaurants)
**Code Reality:** PARTIAL — loss fields mapped, 2 FE key mismatches, 2 backend stage gaps
**Conflict Pre-Check:** CLEAN
**Risk:** MEDIUM

---

## 1. Data Verified (6 months: Apr 21 – Oct 21, 2026)

| | Palm House | Pav2 |
|---|---:|---:|
| Total Cancellations | 896 | 359 |
| Order-scope | 74 | 43 |
| Item-scope | 646 | 249 |
| Total Loss | ₹2,03,251 | ₹31,989 |
| Before Cooking | 0 (0.0%) | 15 (4.2%) |
| Before Serving | 357 (39.8%) | 140 (39.0%) |
| After Serving | 444 (49.6%) | 95 (26.5%) |
| Other (Order + Unknown) | 95 (10.6%) | 109 (30.4%) |
| **BC + BS + AS + Other = Total?** | **✅ 896 = 896** | **✅ 359 = 359** |

---

## 2. FE Gap 1 — "Before Cooking" KPI Always 0% (HIGH)

**FE code (L297):** `stageData.find(st => st.name === 'Before Cooking')`

**API sends:** Palm House has no "Before Cooking" stage — only "Before Serving". Pav2 has both.

**Fix:** L297 — also match "Before Serving":
```js
const beforeCooking = stageData.find(st => st.name === 'Before Cooking' || st.name === 'Before Serving');
```

**Lines:** 1

---

## 3. FE Gap 2 — Daily Chart Bars Show 0 (HIGH)

**FE code (L290-291):** reads `d.order_cancels` / `d.item_cancels`
**API sends:** `d.order_cancel_count` / `d.item_cancel_count`

**Fix:** L290-291:
```js
orderCancels: d.order_cancel_count || d.order_cancels || 0,
itemCancels: d.item_cancel_count || d.item_cancels || 0,
```

**Lines:** 2

---

## 4. FE Gap 3 — Scope Tabs Don't Update KPIs/Charts (MEDIUM — Deferred)

Tabs only filter the detail table. KPIs/charts always show "All" totals.
**Scope: DEFERRED** — register as separate enhancement.

---

## 5. FE Gap 4 — Audit Tab Stub (LOW — Deferred)

`flagged: []` hardcoded. Flagging logic never implemented.
**Scope: DEFERRED** — register as separate item.

---

## 6. Backend Gap 1 — `cancel_type: "Order"` Overwrites Real Item Stage

When a full order is cancelled, backend sets `cancel_type: "Order"` on every item — losing the item's actual kitchen stage.

| Restaurant | Items with cancel_type="Order" | % of total |
|---|---|---|
| Palm House | 39 | 4.4% |
| Pav2 | 18 | 5.0% |

**Evidence:** All 39 Palm House items and all 18 Pav2 items with `cancel_type: "Order"` have `scope: "order"`. The `scope` field already tells us it's a full-order cancel — `cancel_type` should record the item's kitchen stage instead (`preparing`/`serve`/`ready`).

**Backend fix needed:** At cancellation time, record each item's actual kitchen stage based on its current `food_status`, regardless of order-level vs item-level cancel.

---

## 7. Backend Gap 2 — `cancel_type: "unknown"` / `null`

Items with no usable stage information:

| Restaurant | cancel_type | Count | Detail |
|---|---|---|---|
| Pav2 | `"unknown"` | 44 | Backend explicitly set "unknown" |
| Pav2 | `null` | 7 | No value at all |
| Pav2 | `"Pre-Serve"` mapped to stage "Unknown" | 17 | Has cancel_type but by_stage shows Unknown |
| Palm House | `null` | 1 | No value |
| Palm House | `"Post-Serve"`/`"Pre-Serve"` mapped to Unknown | 2 | Stage mapping issue |

**Total:** Pav2 = 68 items (19% of cancellations), Palm House = 3 items (0.3%)

**Backend fix needed:** Every cancelled item should have a valid `cancel_type` based on `food_status` at time of cancellation.

---

## 8. Summary — All Gaps

| # | Gap | Type | Severity | Fix | Status |
|---|-----|------|----------|-----|--------|
| 1 | "Before Cooking" KPI 0% — wrong stage name | FE | HIGH | 1 line | Ready for Gate 3 |
| 2 | Daily chart bars 0 — wrong key names | FE | HIGH | 2 lines | Ready for Gate 3 |
| 3 | Scope tabs don't update KPIs/charts | FE | MEDIUM | Design change | DEFERRED |
| 4 | Audit tab stub | FE | LOW | Implement or hide | DEFERRED |
| 5 | `cancel_type: "Order"` overwrites real stage | Backend | HIGH | Record item's actual stage | BACKEND — pending discussion |
| 6 | `cancel_type: "unknown"`/`null` — no stage | Backend | HIGH | Populate from food_status | BACKEND — pending discussion |

---

## 9. Files WILL Change (FE gaps 1+2 only)

| # | File | Change | Lines |
|---|------|--------|-------|
| 1 | `CancellationsMockup.jsx` L297 | Match "Before Serving" too | 1 |
| 2 | `CancellationsMockup.jsx` L290-291 | Fix daily key names | 2 |

**Total:** 1 file, 3 lines

---

## 10. Owner Decisions

**None for FE fix.** Backend gaps 5+6 to be discussed with backend team.
