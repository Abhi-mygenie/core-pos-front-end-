# MyGenie POS Frontend — PRD

## Original Problem Statement
Deploy core-pos-front-end React app from GitHub (branch: 28-may). Then implement Audit Report Page Optimization CR.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS + Radix UI + shadcn
- **Backend APIs**: preprod.mygenie.online (main), presocket.mygenie.online (socket), Firebase, CRM
- **Preview URL**: https://insights-phase.preview.emergentagent.com
- **CRM URL**: https://insights-phase.preview.emergentagent.com/api

## What's Been Done

### 1. Deployment (2026-05-28)
- Cloned repo (branch 28-may), configured 14 env vars, installed deps, frontend running
- Updated REACT_APP_CRM_BASE_URL to mygenie-crm-deploy

### 2. Baseline Reading
- Read all /app/memory/final/ docs (Architecture, Module, Playbook, Implementation Rules, Business Rules, Open Questions)
- Read CRM 1.0 closed baseline (Coupon + Loyalty handoffs)
- Read CRM 2.0 current sprint (CR-002 Cross-Sell status, open gaps)
- Read previous agent's PRD and all 4 Audit Report investigation docs

### 3. Audit Report Optimization CR — IMPLEMENTED

#### Step 1: New transform in reportTransform.js
- Added `orderLogsReportRow()` — full row transform with all 42 existing fields + items + bill breakdown + operations + timeline
- Added `deriveOrderStatus()` as reusable exported utility
- Added `parseOrderItem()` with direct-serve rule (PACKAGED items: food_status=5 with no timestamps → use created_at)
- Added `buildTimeline()` from operations[] + orders_table
- Added `reportListFromAPI.orderLogsReport()` list transform
- Operations enriched with `itemName` resolved from food_id → items array

#### Step 2: Replaced inline transform in reportService.js
- Removed 513 lines: inline transform (300+ lines) + BE-1 invariant block + CR-001 DIAG + WATCH_ORDER_IDS + G5 snapshot
- Replaced with 3-line call to `reportListFromAPI.orderLogsReport()`
- File: 1257 → 744 lines

#### Step 3: Updated OrderDetailSheet.jsx
- **Dual-mode**: data mode (instant open from order-logs data) + fetch mode (fallback for Credit panel)
- **Bill summary rewrite**: Item Total, Discount, GST, VAT always shown. SC/Tip/Delivery/Round-off conditional. No remainder hack.
- **Activity Log**: operations[] with item names resolved, difference amounts on cancel (-₹80)
- **Order Note**: shown when present
- **Timeline**: from operations[] + orders_table timestamps
- **"Paid" → "Settled"**: StatusBadge + footer badge

#### Step 4: Verified AllOrdersReportPage.jsx — no changes needed

### 4. Additional Changes
- **"Paid" → "Settled"** rename: tab label, status filter option, status breakdown pill
- **Prepaid/Postpaid filter**: new dropdown before Status filter in FilterBar
- **paymentType field** added to transform
- **FilterTags** updated for paymentType chip

### 5. Transform flags added
- `isCancelled` / `isMerged` boolean flags in data mode
- `itemTotal` field (order_sub_total_amount — sum of item prices)
- All bill fields always pass numbers (no || null)

## Files Changed (this session)

| File | Change |
|---|---|
| `frontend/src/api/transforms/reportTransform.js` | +400 lines: new transform, helpers, exports |
| `frontend/src/api/services/reportService.js` | -513 lines: inline transform removed |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | Dual-mode, bill summary, activity log, timeline, Settled |
| `frontend/src/components/reports/FilterBar.jsx` | PayType dropdown, Paid→Settled |
| `frontend/src/components/reports/FilterTags.jsx` | PayType tag support |
| `frontend/src/pages/AllOrdersReportPage.jsx` | PayType filter logic, Paid→Settled tab |

## Backend Gaps Flagged (no frontend code change)

1. **restaurant_discount_amount = 0** on order 063476 (rid=383) despite ₹444 discount applied. Backend must populate this field.
2. **PACKAGED items missing ready_at/serve_at** — backend should log serve_at when marking packaged items served.

## Test Credentials
- owner@cafe103.com / Qplazm@10 (rid=644, no rooms, postpaid, has GST)
- vishal@pav.com / Qplazm@10 (rid=383, prepaid, has ready_at)
- owner@palmhouse.com / Qplazm@10 (rid=541, rooms, mixed, has discount+round-off)

## Prioritized Backlog / Next Tasks

### P0 — Immediate
- Live testing across all 3 restaurants (cafe103, pav, palmhouse)
- Verify Credit panel still works in fetch mode
- Verify Print Bill / Collect Bill still work (separate SINGLE_ORDER_NEW calls)
- Regression: tab counts, filters, gap detection, exports

### P1 — Next
- Order Activity Log CR (ORDER_ACTIVITY_LOG_CR_2026_05_28) — chronological activity feed per order (registered, not started, depends on this CR)
- CRM 2.0 CR-002 — Live Regression QA (T-28/T-29) → Stage 8 POS Handoff

### P2 — Backlog
- Backend GAP-5: order-level cancel fields NULL (pending backend)
- Backend GAP-8: SRM payment_method stuck after room checkout (parked)
- Room SRM cascade elimination (depends on GAP-8)
- Running orders inclusion in order-logs-report (eliminates getRunningOrders call)

### Future/Enhancement
- Extract status derivation as shared utility for other pages
- Unit tests for reportTransform.orderLogsReportRow
