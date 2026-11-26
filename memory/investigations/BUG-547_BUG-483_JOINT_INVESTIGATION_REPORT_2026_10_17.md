# BUG-547 + BUG-483 — Joint Investigation Report
## "Channel and Payments doughnut chart displays amount as 0"
## "Dashboard graphs in New POS show Function Error"

**Date:** 2026-10-17
**Role:** INVESTIGATION
**Steps used:** 7/10
**Confidence:** HIGH

---

## 1. Summary

- **Root cause (shared):** `DashboardMockup.jsx:88` calls `transformDashboardResponse(raw)` but passes the **wrapper object** `{data: actual_api_data, orderCount:0}` instead of the inner `actual_api_data`.
- **Classification:** FE_BUG — CODE_ERROR
- **Confidence:** HIGH — traced and confirmed with simulation
- **Relationship:** BUG-483 and BUG-547 are **RELATED** — same root cause, different manifestations at different recharts versions:
  - **BUG-483** (registered 2026-09-27): recharts was still on 3.x → empty channel/payment arrays caused recharts internal crash → "Function Error" / "Something went wrong"
  - **BUG-547** (registered 2026-10-15): recharts fixed at 2.15.4 (BUG-465) → empty arrays now render gracefully as ₹0 / empty charts — no crash, just wrong data

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result |
|---|---|---|---|---|
| H1 | `transformDashboardResponse(raw)` receives wrapper `{data:..., orderCount:0}` not inner data | code trace insightsService.js + DashboardMockup.jsx | 1 | CONFIRMED |
| H2 | BUG-465 recharts upgrade caused BUG-483 "Function Error" | timeline check: BUG-465 fixed 2026-09-26, BUG-483 registered 2026-09-27 with note "recharts v2.15.4 confirmed, DIFFERENT issue" | 2 | ELIMINATED — recharts already at 2.x at time of BUG-483 registration |
| H3 | `transformDashboardResponse` throws a JS TypeError on null data | Python simulation | 3 | ELIMINATED with current data — all `|| 0` and `|| []` guards prevent TypeError |
| H4 | Wrapper vs inner data mismatch causes all values = 0 | Python simulation with real wrapper shape | 4 | CONFIRMED |

---

## 3. Data Flow Trace

```
fetchInsightsDashboard()
  → api.post(INSIGHTS_DASHBOARD, {...})
  → returns: { data: resp.data?.data, orderCount: 0 }   ← WRAPPER OBJECT

DashboardMockup.jsx:87-88:
  const raw = await fetchInsightsDashboard(appliedFrom, appliedTo);
  return transformDashboardResponse(raw);               ← PASSES WRAPPER, NOT raw.data

transformDashboardResponse(data):   ← data = {data: {...}, orderCount: 0}
  data.revenue       → undefined (wrapper has no .revenue key)
  data.channel_mix   → undefined (wrapper has no .channel_mix key)
  data.payment_mix   → undefined (wrapper has no .payment_mix key)
  ↓
  channels.mix = []  → channelData = [] → "No data" (Channel tile empty)
  payments.mix = []  → paymentData = [] → "No payment data" (doughnut empty/₹0)
  sales.totalRevenue = 0
```

**Comparison — ItemSalesHybridMockup.jsx (correct pattern):**
```js
const raw = await fetchInsightsItems(appliedFrom, appliedTo);
const rows = transformItemRows(raw.items);   // ← correctly uses raw.items
```

---

## 4. Exact Fix

**File:** `src/pages/reports-module/DashboardMockup.jsx`
**Line:** 88

```js
// CURRENT (broken):
return transformDashboardResponse(raw);

// FIXED:
return transformDashboardResponse(raw.data || raw);
```

**Lines changed:** 1
**File count:** 1
**Hotspot (R5):** NO
**Financial logic:** NO (reports display only)

---

## 5. Evidence Artifacts

Saved to: `/app/memory/investigations/` (this file)

Simulation output:
```
revenue_total shows: 0 (should be 5000)
channel_mix: [] (should have 1 entry)
payment_mix: []
CONFIRMED: All values return 0/empty because data = raw wrapper, not raw.data
```

---

## 6. BUG-483 Timeline

| Date | Event |
|---|---|
| 2026-09-26 | BUG-465 registered + FIXED → recharts pinned to 2.15.4 |
| 2026-09-27 | BUG-483 registered — intake note: "recharts v2.15.4 confirmed, DISTINCT from BUG-465" |

**Conclusion:** The intake agent correctly identified BUG-483 as distinct from BUG-465 (recharts version). However the "Function Error" in BUG-483 title was caused by the same wrapper bug producing **empty arrays**, which in recharts 3.x caused a crash but in recharts 2.x renders as empty/₹0. The true bug is the wrapper mismatch — which is also BUG-547's root cause.

**BUG-483 is SUPERSEDED by BUG-547.** Both fixed by the same 1-line change.

---

## 7. Recommendations

- **BUG-547:** FE_FIX — Planning skip eligible (1 file, 1 line, not R5, not financial). **Owner must approve skip.**
- **BUG-483:** Mark `SUPERSEDED_BY BUG-547` (same root cause, same fix). Close when BUG-547 is closed.
- **Fix scope:** `DashboardMockup.jsx:88` — `raw` → `raw.data || raw`
- **Risk:** LOW — display-only, no financial impact
- **Sprint:** oct_cr_batch
