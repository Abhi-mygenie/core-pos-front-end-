# FC-BACKEND-AGG — Food Court Backend Aggregation Investigation Report

**Date:** 2026-08-12  
**Role:** INVESTIGATION (Role 6)  
**Requested by:** Owner — "We have a food court report, we want to create same UI but want to create report from backend aggregation point"  
**Steps used:** 8/10  

---

## 1. Summary

| Field | Value |
|---|---|
| Root cause of current limitation | FE-side aggregation over raw order-logs data — slow, large payloads, monthly batching required |
| New endpoint status | EXISTS on both `preprod.mygenie.online` and `manage.mygenie.online` (HTTP 401 = auth-required, not 404) |
| Classification | DATA_ISSUE + CONTRACT_MISMATCH (response shape unknown) |
| Confidence | MEDIUM — endpoint confirmed live, response shape not verifiable (all tokens expired) |
| Planning skip eligible | NO — HIGH risk, multiple files, unknown API contract requires full planning gate |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1 | New endpoint exists only on `manage.mygenie.online`, not preprod | curl -w %{http_code} on both hosts | Step 1 | ELIMINATED — both return 401 (not 404). Endpoint is live on preprod too. Fake path on preprod returns 404, confirming 401 = auth-required, not catch-all. | Step 3 curl outputs |
| H2 | Provided token in curl is valid | curl with provided token | Step 2 | ELIMINATED — 401. Token expired. All stored tokens (BUG-296 evidence) also expired. | curl response |
| H3 | New endpoint returns per-order rows (same level as current FE aggregation) | Name analysis + code trace | Steps 4-6 | UNLIKELY — endpoint named "top-food sales-report" implies aggregated summary (top sellers / station totals), NOT per-order rows. Current FE returns per-order rows per station. | Endpoint name + current UI needs |
| H4 | Current FE food court service can be replaced 1:1 with backend aggregation | Code trace of `foodCourtService.js` + `FoodCourtMockup.jsx` | Steps 5-8 | PARTIALLY ELIMINATED — All Orders / Settled tabs need per-order rows per station; Audit tab needs per-order × per-item × per-station pivot. These require order-level data, not aggregated totals. See GAP-2 and GAP-3. | Code analysis below |

---

## 3. Data Flow Trace — CURRENT (FE Aggregation)

```
API: POST /api/v2/vendoremployee/report/order-logs-report
  Payload: { sort_by: 'collect_bill', from_date, to_date }
  
→ Response: order[] (raw order wrappers with order_details_table[])
  Each order.order_details_table[item].station = "CREAMBELLPARLOUR" | "MSB" | etc.

→ Transform: reportTransform.js:orderLogsReportRow()
  → Extracts items[] with { station, price, addonTotal, variationTotal, gstAmount, vatAmount, foodStatus, quantity }

→ Service: foodCourtService.js:getFoodCourtForRange()
  → Splits range into 30-day chunks (for ranges > 30 days)
  → Parallel fetch (max 3 concurrent)
  → FE pivot: groups orders by station name from item.station field
  → toStationRow() builds per-order rows with proportional discount distribution

→ State: FoodCourtMockup.jsx
  → data.orders = per-order rows for selected station
  → data.allOrders = all raw orders (needed for Audit tab pivot)
  → data.stations = unique station names

→ UI: Three tabs
  Tab 1 (All Orders): per-order table, station-filtered
  Tab 2 (Settled): same, filtered to fOrderStatus === 6  
  Tab 3 (Audit): per-order × per-station pivot with drift column (stationSum − orderTotal)

BREAK POINT: For ranges > 30 days → multiple API calls, slow, large payloads, batch progress UI
```

---

## 4. Data Flow Trace — PROPOSED (BE Aggregation)

```
API: POST /api/v1/vendoremployee/top-food%20sales-report
  Payload: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
  Base URL: preprod.mygenie.online (confirmed — endpoint exists here)
  Auth: Bearer token (same auth_token from localStorage)

→ Response shape: UNKNOWN (all tokens expired — cannot probe)
  MOST LIKELY returns one of:
  
  Option A — Station-level aggregated totals:
  { data: [{ station_name, total_orders, item_total, discount, sub_total, tax, total }] }
  
  Option B — Food item × station aggregated:
  { data: [{ food_name, station, quantity_sold, revenue }] }
  
  Option C — Daily × station cross-tab:
  { data: [{ date, station_name, orders, item_total, tax, total }] }

→ BREAK POINT: Shape determines which UI views are feasible
```

---

## 5. Possibility & Gap Matrix

### ✅ WHAT IS POSSIBLE

| # | Possibility | Confidence | Notes |
|---|---|---|---|
| P1 | Endpoint works with existing auth (no new auth needed) | HIGH | preprod returns 401 = standard auth gate, same Bearer token from localStorage |
| P2 | No base URL change needed | HIGH | Endpoint exists on `preprod.mygenie.online` — same `REACT_APP_API_BASE_URL` |
| P3 | New "Summary" tab showing station-level totals | HIGH (if Option A shape) | A station-wise KPI card or pivot table (station × metric) is straightforward if backend returns aggregated totals |
| P4 | Same header/filters UI (date range, presets) reusable | HIGH | Header component is pure UI — date inputs, presets, download button all reusable regardless of data source |
| P5 | KPI strip (Orders, Item Total, Tax, Total) reusable | MEDIUM | If backend returns overall totals in response, KPI strip maps directly |
| P6 | Replacing the 30-day batched fetch for long ranges | HIGH | Single API call vs 12 batched calls for 1-year range — major performance gain |

### ❌ GAPS (Blockers & Risks)

| # | Gap | Severity | Root Cause |
|---|---|---|---|
| **GAP-1** | **Response shape unknown — cannot wire UI** | **BLOCKER** | All tokens expired. Cannot curl-probe. Entire implementation depends on what fields backend returns. Cannot confirm if field names match UI expectations (`station_name` vs `station`, `item_total` vs `itemTotal`, etc.) |
| **GAP-2** | **All Orders / Settled tabs need per-order rows** | HIGH | Current tabs show: Order ID, Date, Time, Items text, Item Count, Qty, Payment Type, Item Total, Discount, Sub Total, GST, Total — one row per order. Backend aggregation endpoint likely returns AGGREGATED totals (no per-order granularity). If so, these two tabs CANNOT be replaced by the new endpoint. |
| **GAP-3** | **Audit tab requires per-order × per-item × per-station data** | HIGH | Audit tab computes: for each order → sum each station's items → compare to order-level total → show drift. This requires raw item-level data with station assignments. An aggregated endpoint cannot provide this. Audit tab would need to retain the existing `order-logs-report` fetch. |
| **GAP-4** | **Station dropdown filter semantics change** | MEDIUM | Current: station = filter (show only orders containing items from that station). With BE aggregation: station = dimension in the result set. The dropdown concept changes — either station becomes a column header, or a filter on already-aggregated data. Design decision needed from owner. |
| **GAP-5** | **Date bucket granularity unknown** | MEDIUM | If backend returns daily × station data, we can build time-series charts/pivots. If it returns one aggregate for the whole range, no daily breakdown is possible. Unknown until response shape is confirmed. |
| **GAP-6** | **Export (Excel/PDF) field mapping** | LOW | Current export uses `compositeId`, `orderDate`, `orderTime`, `orderDetails`, etc. from per-order rows. New aggregated shape will have different fields. Export templates need to be redesigned. |
| **GAP-7** | **OrderDetailSheet (slide-out panel) incompatible** | LOW | Clicking a row currently opens `OrderDetailSheet` with full order detail (items, timeline, payment breakdown). Aggregated rows have no per-order detail to show. Feature would need to be hidden or redesigned. |

---

## 6. Recommended Architecture

Given the gaps, the cleanest approach is a **hybrid strategy**:

```
Tab 1 (All Orders) + Tab 2 (Settled):   KEEP existing order-logs-report (FE aggregation)
                                         → per-order detail, station filter, OrderDetailSheet — all work

Tab 3 (Audit):                           KEEP existing order-logs-report
                                         → per-order × per-item × per-station drift — requires raw data

NEW Tab 4 (Station Summary) [NEW]:       Use top-food-sales-report (BE aggregation)
                                         → station-wise totals, single API call, fast
                                         → pivot table: station × metric (itemTotal, discount, tax, total)
                                         → no per-order rows needed
```

**This gives the owner:**
- Zero regression risk on existing tabs (no changes to proven code)
- A new fast "Station Summary" view powered by BE aggregation
- Performance: 1 API call vs 12 batched calls for yearly view

---

## 7. Evidence Artifacts

All saved to: `/app/memory/evidence/FC-BACKEND-AGG/`

| Artifact | Description |
|---|---|
| `endpoint_availability.txt` | HTTP status codes for both hosts + fake path test |
| `foodCourtService_analysis.md` | Current FE aggregation flow analysis |

---

## 8. What Is Needed to Proceed

**MUST HAVE before any planning can start:**

1. **Fresh auth token** — login to `preprod.mygenie.online` with valid credentials and curl-probe the endpoint to get the actual response shape. Without this, GAP-1 blocks all planning.

2. **Owner decision on architecture** — Options:
   - **Option A (Hybrid):** Keep existing tabs, add new "Station Summary" tab powered by BE aggregation ← RECOMMENDED
   - **Option B (Replace):** Replace All Orders/Settled with BE aggregation (loses per-order detail, breaks OrderDetailSheet, loses Audit tab) — NOT recommended unless backend provides per-order rows
   - **Option C (New screen):** Create entirely separate route (`/reports-module/food-court-summary`) for the BE-aggregated view, keep existing screen untouched

3. **Confirm endpoint path** — Is it `/api/v1/vendoremployee/top-food sales-report` (with space) or `top-food-sales-report` (hyphen)? The URL in the curl uses `%20` (space). This is unusual for REST APIs. Confirm the correct path.

---

## 9. Retroactive Candidates

NONE — no registry drift found relevant to this investigation.

---

## 10. Recommendations

**Classification:** CONTRACT_MISMATCH + DATA_ISSUE  
**FE fix:** PARTIAL — new `foodCourtSummaryService.js` can be written once response shape confirmed  
**Backend ask:** YES — need fresh valid token to probe endpoint and confirm response schema  
**Planning skip eligible:** NO — HIGH risk, unknown contract, multiple files  
**Next role:** OWNER DECISION → then PLANNING (Gate 2: Impact Analysis)

---

```
Investigation complete: FC-BACKEND-AGG
Root cause: Response shape unknown (GAP-1 BLOCKER) + per-order vs aggregated data mismatch (GAP-2/3)
Classification: CONTRACT_MISMATCH + DATA_ISSUE
Confidence: MEDIUM (endpoint confirmed live, shape unverified)
Steps used: 8/10

Endpoint exists on preprod: YES (HTTP 401, not 404)
No base URL change needed: YES (same preprod domain)
Existing tabs safe: YES (no changes needed to current code)
New "Station Summary" tab feasible: YES (once response shape confirmed)
All Orders/Settled/Audit replacement feasible: NO (require per-order data)

Next: Owner provides fresh token + architecture decision → Planning Gate 2
```
