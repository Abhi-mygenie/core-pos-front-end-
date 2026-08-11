# CR-045 — Impact Analysis + Implementation Plan (Gate 2 + Gate 3)

**Item:** CR-045 — Remove FE-side Payload Stripper (Backend Has Taken Over)
**Role:** PLANNING AGENT
**Date:** 2026-06-17
**Risk:** MEDIUM (touches 7 service files + 1 transform + 1 page; affects all Insights + Report screens)
**Code Reality:** FULL — stripper code exists at `orderPayloadStripper.js`, consumers in 6 services

---

## 1. CONTEXT

CR-045 §3a states: *"This CR is a TEMPORARY FE-side optimization. Backend team will ship server-side field stripping in a future release. When that happens: set REACT_APP_STRIP_ORDERS=false → QA all reports → Remove orderPayloadStripper.js and all import references."*

**Trigger:** Backend has NOW completed server-side stripping. Live API probe (2026-06-17) confirms:
- `orders_table`: **59 fields** returned (was 128 → 68 DEAD fields stripped by backend)
- `order_details_table`: **35 fields** (was 47 → 12+ DEAD fields stripped)
- `food_details`: **7 fields** (was 72 → 65 DEAD fields stripped, biggest win)

FE stripper is now **double-stripping** (pick on already-picked = harmless passthrough, but dead code).

---

## 2. CONFLICT PRE-CHECK

| File | Last Modified By | Open CRs on Same File? |
|------|-----------------|----------------------|
| `orderPayloadStripper.js` | CR-045 agent (2026-06-12) | None |
| `insightsService.js` | CR-049 agent (2026-06-15) | CR-049 Phase 4 (Order Ledger pagination) — NO CONFLICT (different functions) |
| `foodCourtService.js` | CR-045 agent (2026-06-12) | None |
| `roomOrdersService.js` | CR-045 agent (2026-06-12) | None |
| `prepServeService.js` | CR-045 agent (2026-06-12) | None |
| `orderLedgerService.js` | CR-045 agent (2026-06-12) | None |
| `ItemSalesMockup.jsx` | Original author | None |
| `App.js` | Multiple agents | None on this import |

**Conflict: NONE.** Safe to proceed.

---

## 3. IMPACT ANALYSIS (Gate 2)

### 3.1 Stripper File — `orderPayloadStripper.js` (DELETE)

**119 lines.** Exports: `stripOrder`, `stripOrders`. Gated by `REACT_APP_STRIP_ORDERS !== 'false'` (env var NOT set → defaults ON).

**Removal safe because:** Backend now strips identically. Double-strip was designed to be passthrough. Removing it means responses flow directly from API → service transform with zero functional change.

### 3.2 Consumer Tracing — 6 Services

| # | Service | Import Line | Call Sites | Still Needs `order-logs-report`? | Safe to Remove stripOrders? |
|---|---------|------------|-----------|:---:|:---:|
| 1 | `insightsService.js` | L15 | L58, L615, L623, L631 (all in OLD aggregation fns) | YES — `getItemSalesAggregated` still used by 2 pages | ✅ YES — remove import + calls |
| 2 | `foodCourtService.js` | L12 | L110 | YES — no backend aggregation endpoint | ✅ YES — backend already strips |
| 3 | `roomOrdersService.js` | L12 | L89 | YES — no backend aggregation endpoint | ✅ YES — backend already strips |
| 4 | `prepServeService.js` | L14 | L160 | YES — no backend aggregation endpoint | ✅ YES — backend already strips |
| 5 | `orderLedgerService.js` | L29 | L139, L223 | YES — waiting on pagination | ✅ YES — backend already strips |
| 6 | `CancellationsMockup.jsx` | L30 (commented out) | None | NO — migrated to backend EP | ✅ YES — remove commented import |

**All 6 consumers safe to remove** because backend now strips server-side.

### 3.3 Old FE Aggregation Functions — Dead Code Analysis

| Function | File | Lines | Active Consumers | Status |
|----------|------|-------|-----------------|--------|
| `getItemSalesAggregated` | insightsService.js | L42–L601 (~560 lines) | `ItemSalesMockup.jsx` (L248), `ItemSalesHybridMockup.jsx` (L202 — audit lazy-load), `auditManifest.js` (L141 — reference only) | ⚠️ STILL IN USE |
| `getDashboardAggregated` | insightsService.js | L603–L1076 (~474 lines) | **NONE** — zero page consumers (no grep hits outside insightsService.js itself) | ❌ DEAD CODE |

**`getDashboardAggregated`** (474 lines) — **safe to delete**. No page calls it. All Dashboard/Sales/Payments pages migrated to `fetchInsightsDashboard`/`fetchInsightsSales`.

**`getItemSalesAggregated`** (560 lines) — **CANNOT delete yet**:
- `ItemSalesHybridMockup.jsx` L202 uses it for audit tab lazy-load
- `ItemSalesMockup.jsx` L248 uses it as primary data source
- `auditManifest.js` L141 references it (metadata only, not a runtime call)

### 3.4 `ItemSalesMockup.jsx` — Route Analysis

- **Imported** in `App.js` L9: `import ItemSalesMockup from "./pages/reports-module/ItemSalesMockup"`
- **NOT routed** — no `<Route>` uses `ItemSalesMockup` component
- Routes at L90-91 both map to `ItemSalesHybridMockup`:
  - `/items` → `ItemSalesHybridMockup`
  - `/items-hybrid` → `ItemSalesHybridMockup`
- **Verdict:** `ItemSalesMockup.jsx` is **dead code** — imported but unreachable. Safe to remove import + file.

### 3.5 DOUBT Fields — Usage Audit

| # | Field | Used? | Where | Verdict |
|---|-------|:-----:|-------|---------|
| 1 | `order_status` | ✅ YES | reportTransform.js L570 → `status: order.order_status` | **KEEP** |
| 2 | `total_tax_amount` | ❌ NO | No consumer found | Can strip |
| 3 | `cancel_state` | ❌ NO | No consumer found | Can strip |
| 4 | `waiter_id` | ✅ YES | reportTransform.js L553 → `waiterId: order.waiter_id` | **KEEP** |
| 5 | `print_bill_status` | ❌ NO | No consumer found | Can strip |
| 6 | `print_kot` | ❌ NO | No consumer found | Can strip |
| 7 | `scheduled` | ❌ NO | No consumer in report transforms | Can strip |
| 8 | `schedule_at` | ❌ NO | No consumer in report transforms | Can strip |
| 9 | `reason_type` (item) | ✅ YES | insightsService.js L303, L931-932 → cancel reason lookup | **KEEP** |
| 10 | `item_gst` (item) | ❌ NO | No consumer found | Can strip |
| 11 | `item_vat` (item) | ❌ NO | No consumer found | Can strip |
| 12 | `gst` (item) | ❌ NO | No consumer found | Can strip |
| 13 | `cancel_by` (item) | ✅ YES | reportTransform.js L644-647, L949 → cancelBy resolution | **KEEP** |

**Summary:** 4 KEEP (`order_status`, `waiter_id`, `reason_type`, `cancel_by`), 9 can be flagged for backend strip.

---

## 4. IMPLEMENTATION PLAN (Gate 3)

### Phase A — Disable FE Stripper (SAFE, IMMEDIATE)

**Step A1: Remove `stripOrders` import + calls from 5 services**

| # | File | Line(s) | Change |
|---|------|---------|--------|
| A1.1 | `insightsService.js` | L15 | Remove: `import { stripOrders } from '../transforms/orderPayloadStripper';` |
| A1.2 | `insightsService.js` | L58 | Change: `const data = stripOrders(resp.data?.order \|\| []);` → `const data = resp.data?.order \|\| [];` |
| A1.3 | `insightsService.js` | L615 | Change: `const data = stripOrders(resp.data?.order \|\| []);` → `const data = resp.data?.order \|\| [];` |
| A1.4 | `insightsService.js` | L623 | Same pattern |
| A1.5 | `insightsService.js` | L631 | Same pattern |
| A1.6 | `foodCourtService.js` | L12, L110 | Remove import + change `stripOrders(resp.data?.order \|\| [])` → `resp.data?.order \|\| []` |
| A1.7 | `roomOrdersService.js` | L12, L89 | Same pattern |
| A1.8 | `prepServeService.js` | L14, L160 | Same pattern |
| A1.9 | `orderLedgerService.js` | L29, L139, L223 | Remove import + change 2 call sites |
| A1.10 | `CancellationsMockup.jsx` | L30 | Remove commented-out import line |

**Est: 10 edits across 6 files. ~1 line each.**

**Step A2: Delete `orderPayloadStripper.js`**

Delete `/app/frontend/src/api/transforms/orderPayloadStripper.js` (119 lines).

**Step A3: Verify compile**

`webpack compiled successfully` — no new warnings.

---

### Phase B — Delete Dead FE Aggregation Code (SAFE, IMMEDIATE)

**Step B1: Delete `getDashboardAggregated` function**

| File | Lines | Change |
|------|-------|--------|
| `insightsService.js` | L603–L1076 | Delete entire `getDashboardAggregated` function (474 lines) |
| `insightsService.js` | L1278 | Remove from default export: `getDashboardAggregated` |

**Consumers:** ZERO. No page imports or calls this function.

**Step B2: Delete dead import + file for `ItemSalesMockup`**

| File | Line | Change |
|------|------|--------|
| `App.js` | L9 | Remove: `import ItemSalesMockup from "./pages/reports-module/ItemSalesMockup";` |
| `ItemSalesMockup.jsx` | entire file | DELETE — no route points to it |

---

### Phase C — DEFERRED (Needs Owner Decision)

**C1: Delete `getItemSalesAggregated` (~560 lines)**

**BLOCKED:** `ItemSalesHybridMockup.jsx` L202 still uses it for audit tab lazy-load. Requires either:
- (a) Wire audit tab to `fetchInsightsItems` backend endpoint, OR
- (b) Owner confirms audit tab can be removed from ItemSalesHybrid

**C2: Flag 9 unused DOUBT fields for backend removal**

Backend currently returns these but FE never reads them:
- `orders_table`: `total_tax_amount`, `cancel_state`, `print_bill_status`, `print_kot`, `scheduled`, `schedule_at`
- `order_details_table`: `item_gst`, `item_vat`, `gst`

**Action:** Add to next backend brief — request backend stops sending these 9 fields.

**C3: Flag `cust_mobile` gap**

Backend suppression removed `cust_mobile` but FE uses it (DOC10: USED). Request backend RE-ADD this field.

---

## 5. VERIFICATION MATRIX

| # | Edit | File | How to Verify | Automated? |
|---|------|------|---------------|:---:|
| V1 | stripOrders removed from insightsService | insightsService.js | FoodCourt/RoomOrders/PrepServe/OrderLedger reports load without error | Browser |
| V2 | stripOrders removed from foodCourtService | foodCourtService.js | Food Court report loads data | Browser |
| V3 | stripOrders removed from roomOrdersService | roomOrdersService.js | Room Orders Insight loads data | Browser |
| V4 | stripOrders removed from prepServeService | prepServeService.js | Prep/Serve Time report loads data | Browser |
| V5 | stripOrders removed from orderLedgerService | orderLedgerService.js | Order Ledger loads data | Browser |
| V6 | orderPayloadStripper.js deleted | Transform | No import errors, webpack clean | Compile |
| V7 | getDashboardAggregated deleted | insightsService.js | Dashboard/Sales/Payments still work (use backend EP) | Browser |
| V8 | ItemSalesMockup removed | App.js + file | `/items` route still works (points to HybridMockup) | Browser |
| V9 | AllOrdersReportPage works | reportService.js | Audit Report loads (never used stripper) | Browser |
| V10 | RoomOrdersReportPage works | reportService.js | Room Orders Report loads (never used stripper) | Browser |

---

## 6. POST-CODE REGISTRY CHECKLIST

```
- [ ] registry.json: CR-045 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: CR-045 row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add 7 modified files + 2 deleted files
- [ ] Code markers: // CR-045 comment at each removal site
```

---

## 7. RISK REGISTER

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Backend field set differs from FE whitelist — some field FE needs is missing | LOW | Already validated via live API probe. Only `cust_mobile` is missing (flagged in C3). |
| R2 | `getItemSalesAggregated` deletion breaks audit lazy-load in ItemSalesHybrid | MEDIUM | DEFERRED to Phase C — not touching this function in Phase A/B |
| R3 | Services receive extra DOUBT fields they don't expect | ZERO | Transforms cherry-pick by name; extra fields are ignored |
| R4 | Performance regression from removing stripper (more data in React state) | ZERO | Backend strips identically; response size unchanged |
| R5 | `REACT_APP_STRIP_ORDERS` env var referenced elsewhere | ZERO | Only referenced in `orderPayloadStripper.js` which is deleted |

---

## 8. SCOPE LOCK

**Files WILL change (Phase A + B):**

| # | File | Action |
|---|------|--------|
| 1 | `api/transforms/orderPayloadStripper.js` | DELETE |
| 2 | `api/services/insightsService.js` | Remove stripOrders import + 4 call sites + delete getDashboardAggregated (L603-1076) + update default export |
| 3 | `api/services/foodCourtService.js` | Remove stripOrders import + 1 call site |
| 4 | `api/services/roomOrdersService.js` | Remove stripOrders import + 1 call site |
| 5 | `api/services/prepServeService.js` | Remove stripOrders import + 1 call site |
| 6 | `api/services/orderLedgerService.js` | Remove stripOrders import + 2 call sites |
| 7 | `pages/reports-module/CancellationsMockup.jsx` | Remove commented import |
| 8 | `App.js` | Remove dead ItemSalesMockup import |
| 9 | `pages/reports-module/ItemSalesMockup.jsx` | DELETE (dead — no route) |

**Files WILL NOT touch:**

| File | Reason |
|------|--------|
| `reportService.js` | Never used stripper — no change needed |
| `ItemSalesHybridMockup.jsx` | Still uses `getItemSalesAggregated` for audit lazy — Phase C |
| `auditManifest.js` | Reference only, not runtime call — Phase C |
| `reportTransform.js` | No stripper dependency |
| Any `.env` file | `REACT_APP_STRIP_ORDERS` was never added — no cleanup needed |

**Total: 7 files modified, 2 files deleted, ~600 lines removed.**

---

## 9. SUMMARY

```
Planning complete: CR-045
Stage: Impact Analysis + Implementation Plan (Both)
Code reality: FULL (stripper code + consumers exist, backend has taken over)
Risk: MEDIUM
Files WILL change: 9 (7 modify + 2 delete)
Files WILL NOT touch: 5 (reportService, HybridMockup, auditManifest, reportTransform, .env)
Owner decisions: C1 (audit lazy-load migration), C2 (9 DOUBT fields for backend), C3 (cust_mobile re-add)
Docs: /app/memory/CR_045_IMPACT_ANALYSIS_AND_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO / Implementation
```

---

*CR-045 Planning — 2026-06-17. Gate 2 + Gate 3 COMPLETE. Awaiting Gate 4 GO.*
