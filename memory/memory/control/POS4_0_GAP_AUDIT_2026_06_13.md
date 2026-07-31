# POS 4.0 — Sprint Gap Audit Matrix

**Auditor:** CLOSURE Agent (Role 11)
**Date:** 2026-06-13
**Scope:** Every POS 4.0 item × every required artifact
**Purpose:** Identify documentation drift before sprint freeze

---

## EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| Total POS 4.0 items audited | 44 |
| Items fully complete (all artifacts) | 0 |
| Items with code shipped + pending smoke only | ~22 |
| Items MISSING from `registry.json` | **18** |
| Items in registry.json with wrong/missing `sprint_key` | **24** |
| Items missing from Smoke Batch | **10** (June 12-13 implemented) |
| FILE_OWNERSHIP.md stale | **Yes** — last updated 2026-05-29, ~30 files changed since |
| OPEN_GAPS_REGISTER.md reviewed this sprint | **No** |
| Session Start files (Artifact #0) | **0 exist** |
| QA reports for June 12-13 items | **0** — 70+ test cases written, none executed |

---

## GAP MATRIX KEY

| Symbol | Meaning |
|--------|---------|
| ✅ | Artifact EXISTS on disk |
| ❌ | Artifact MISSING — needs backfill or skip |
| ⚠️ | Artifact exists but has issues (wrong sprint_key, stale, partial) |
| N/A | Not applicable for this item's current state |
| 🔶 | In a shared/phase doc (not standalone) |

---

## SECTION A: JUNE 12-13 ITEMS (11 items registered, 10 implemented)

These are the items from the most recent sessions. Most critical gap area.

| # | ID | Title | registry.json | Intake Doc | Impact Analysis | Impl Plan | Code Done | QA Report | Owner Smoke |
|---|-----|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **BUG-132** | Settlement formula fix | ⚠️ status=REGISTERED (should be IMPLEMENTED) | ✅ `change_requests/BUG_132_*` | ✅ `PHASE_4_INVESTIGATION_IMPACT_ANALYSIS.md` | ✅ `BUG_132_SETTLEMENT_FORMULA_FIX_IMPLEMENTATION_PLAN.md` | ✅ IMPLEMENTED | ❌ Pending (in QA handover, not executed) | ❌ Not in batch |
| 2 | **CR-040** | Sidebar rename labels | ⚠️ status=REGISTERED | ✅ `change_requests/CR_040_*` | 🔶 `PHASE_1_SIDEBAR_SWEEP_IMPLEMENTATION_PLAN.md` | 🔶 Phase 1 doc | ✅ IMPLEMENTED | ❌ Pending | ❌ Not in batch |
| 3 | **CR-042** | Items & Menu → Item Ledger | ⚠️ status=REGISTERED | ✅ `change_requests/CR_042_*` | 🔶 Phase 1 doc | 🔶 Phase 1 doc | ✅ IMPLEMENTED | ❌ Pending | ❌ Not in batch |
| 4 | **BUG-131** | Sidebar bottom sticky | ⚠️ status=REGISTERED | ✅ `change_requests/BUG_131_*` | 🔶 Phase 1 doc | 🔶 Phase 1 doc | ✅ IMPLEMENTED | ❌ Pending | ❌ Not in batch |
| 5 | **CR-041** | Navigation consistency | ⚠️ status=REGISTERED | ✅ `change_requests/CR_041_*` | 🔶 Phase 1 doc | 🔶 Phase 1 doc (investigation catalogue) | N/A (investigation only) | N/A | N/A |
| 6 | **CR-037** | Remove Popular Items | ⚠️ status=REGISTERED | ✅ `change_requests/CR_037_*` | 🔶 Phase 2 doc | 🔶 `PHASE_2_BOOT_OPTIMIZATION_IMPLEMENTATION_PLAN.md` | ✅ IMPLEMENTED | ❌ Pending | ❌ Not in batch |
| 7 | **CR-038** | Boot retry policy | ⚠️ status=REGISTERED | ✅ `change_requests/CR_038_*` | 🔶 Phase 2 doc | 🔶 Phase 2 doc | ✅ IMPLEMENTED | ❌ Pending | ❌ Not in batch |
| 8 | **CR-039** | Credit Total Wire | ⚠️ status=REGISTERED | ✅ `change_requests/CR_039_*` | 🔶 Phase 3 doc | ✅ `PHASE_3_CREDIT_TOTAL_WIRE_IMPLEMENTATION_PLAN.md` | ✅ IMPLEMENTED | ❌ Pending | ❌ Not in batch |
| 9 | **BUG-133** | Check In item filter | ⚠️ status=REGISTERED | ✅ `change_requests/BUG_133_*` | ✅ `PHASE_4_INVESTIGATION_IMPACT_ANALYSIS.md` | ✅ `BUG_133_CHECK_IN_FILTER_IMPLEMENTATION_PLAN.md` | ✅ IMPLEMENTED | ❌ Pending | ❌ Not in batch |
| 10 | **CR-044** | Insights shared cache | ❌ **MISSING** | ✅ `change_requests/CR_044_*` | ✅ `PHASE_5_INSIGHTS_OPTIMIZATION_IMPACT_ANALYSIS.md` | ✅ `PHASE_5_INSIGHTS_OPTIMIZATION_IMPLEMENTATION_PLAN.md` | ✅ IMPLEMENTED | ❌ Pending | ❌ Not in batch |
| 11 | **CR-045** | Field stripping (temporary) | ❌ **MISSING** | ✅ `change_requests/CR_045_*` | ✅ Phase 5 doc | ✅ Phase 5 doc | ✅ IMPLEMENTED | ❌ Pending | ❌ Not in batch |

**Deferred from this batch:**

| # | ID | Title | registry.json | Intake Doc | Status | Reason |
|---|-----|-------|:---:|:---:|:---:|------|
| 12 | **BUG-130** | Channel Visibility | ✅ (pos_4_0) | ✅ `change_requests/BUG_130_*` | NOT STARTED | Investigation deferred, likely backend |
| 13 | **CR-043** | Credit per-customer totals | ✅ (pos_4_0) | ✅ `change_requests/CR_043_*` | Gate 1 ONLY | No plan, no code |

---

## SECTION B: JUNE 11 SMOKE BATCH ITEMS (S-1 through S-9)

These have a smoke batch doc (`POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md`) but owner hasn't run smoke yet.

| # | Smoke | ID | Title | registry.json | Intake Doc | Impact/Plan | Code Done | QA Report | Owner Smoke |
|---|:---:|-----|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | S-1 | **CR-025** | Discount payload (P0 money) | ❌ **MISSING** | ✅ `change_requests/CR_025_*` | ✅ (in doc) | ✅ IMPLEMENTED | ❌ | ☐ Pending |
| 2 | S-2 | **CR-018** | Schedule Order | ⚠️ no sprint_key | ✅ `change_requests/CR_018_*` | ✅ | ✅ IMPLEMENTED | ❌ | ☐ Pending |
| 3 | S-3 | **CR-019** | Settings Wizard | ⚠️ no sprint_key | ✅ | ✅ | ✅ IMPLEMENTED (QA 18/18) | ✅ (18/18 passed) | ☐ Pending |
| 4 | S-4 | **CR-020** | Settings Bug Sweep P4+B12-B15 | ❌ **MISSING** | ✅ `change_requests/CR_020_*` | ✅ | ✅ IMPLEMENTED | ❌ | ☐ Pending |
| 5 | S-5 | **CR-017** | WhatsApp Payment Link | ⚠️ no sprint_key | ✅ | ✅ | ✅ IMPLEMENTED | ❌ | ☐ Pending |
| 6 | S-6 | **BUG-116** | Realtime menu socket | ⚠️ no sprint_key | ✅ (in BUG_TRACKER) | ✅ | ✅ IMPLEMENTED | ❌ | ☐ Pending |
| 7 | S-7 | **BUG-122 post** | 3 FE fixes (POS YTC, snooze, schedule_at) | ❌ **MISSING** | ✅ (in BUG_TRACKER) | ✅ | ✅ IMPLEMENTED | ❌ | ☐ Pending |
| 8 | S-8 | **BUG-112/113/114** | Auto-print + split UI + discount payload | ⚠️ no sprint_key | ✅ | ✅ | ✅ IMPLEMENTED | ❌ | ☐ Pending |
| 9 | S-9 | **CR-026** | Report Data & Rounding Sweep | ❌ **MISSING** | ✅ `change_requests/CR_026_*` | ✅ (in doc) | ✅ IMPLEMENTED | ❌ | ☐ Pending |

---

## SECTION C: JUNE 11 INSIGHTS BATCH (CR-029→CR-035, BUG-125→BUG-129)

| # | ID | Title | registry.json | Intake Doc | Impact/Plan | Code Done | QA Report | Owner Smoke |
|---|-----|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **CR-029** | Room food in reports | ⚠️ no sprint_key | ✅ | ✅ | ✅ IMPL + QA PASSED | ✅ (QA PASSED) | ☐ Pending |
| 2 | **CR-030** | Revenue by collection date | ⚠️ no sprint_key | ✅ | ✅ | ✅ IMPL + QA PASSED | ✅ (QA PASSED) | ☐ Pending |
| 3 | **CR-031** | Cancellation truth | ⚠️ no sprint_key | ✅ | ✅ | ✅ IMPL + QA PASSED | ✅ (QA PASSED) | ☐ Pending |
| 4 | **CR-032** | Payment classifier | ⚠️ no sprint_key | ✅ | ✅ | ✅ IMPL + QA PASSED | ✅ (QA PASSED) | ☐ Pending |
| 5 | **CR-033** | Settlement total sale basis | ⚠️ no sprint_key | ✅ | ✅ | ✅ CLOSED | N/A (owner closed) | ✅ Owner directive |
| 6 | **CR-034** | Items Ledger-style buckets | ⚠️ no sprint_key | ✅ | ✅ | ✅ IMPL + QA PASSED | ✅ (QA PASSED) | ☐ Pending |
| 7 | **CR-035** | Report Definitions help | ⚠️ no sprint_key | ✅ | ✅ | ✅ IMPL + QA PASSED | ✅ (QA PASSED) | ☐ Pending |
| 8 | **BUG-125** | Cancellations scope match | ⚠️ no sprint_key | ✅ | ✅ | ✅ FIXED + QA PASSED | ✅ | ☐ Pending |
| 9 | **BUG-126** | round_off → round_up | ⚠️ no sprint_key | ✅ | ✅ | ✅ FIXED + QA PASSED | ✅ | ☐ Pending |
| 10 | **BUG-127** | Dashboard Unsettled tile | ⚠️ no sprint_key | ✅ | ✅ | ✅ FIXED + QA PASSED | ✅ | ☐ Pending |
| 11 | **BUG-128** | Dashboard double-fetch | ⚠️ no sprint_key | ✅ | ✅ | ✅ FIXED + QA PASSED | ✅ | ☐ Pending |
| 12 | **BUG-129** | TAB status=6 before collection | ⚠️ no sprint_key | ✅ | ✅ | PLANNED (BE-BLOCKED) | N/A | N/A |

---

## SECTION D: CLOSED / VERIFIED POS 4.0 ITEMS (code done before June 11)

| # | ID | Title | registry.json | Status | QA | Smoke |
|---|-----|-------|:---:|:---:|:---:|:---:|
| 1 | **CR-021** | Split payment | ❌ **MISSING** | CLOSED — OWNER VERIFIED | ✅ | ✅ |
| 2 | **CR-022** | Food type filters | ❌ **MISSING** | CLOSED — OWNER VERIFIED | ✅ | ✅ |
| 3 | **CR-023** | Typing lag fix | ❌ **MISSING** | CLOSED — OWNER VERIFIED | ✅ | ✅ |
| 4 | **CR-024** | Channel visibility override | ❌ **MISSING** | CLOSED — OWNER VERIFIED | ✅ | ✅ |
| 5 | **BUG-115** | Audit cancelled render | ⚠️ no sprint_key | CLOSED — OWNER VERIFIED | ✅ | ✅ |
| 6 | **BUG-117** | GST negative render | ⚠️ no sprint_key | CLOSED — OWNER VERIFIED | ✅ | ✅ |
| 7 | **BUG-119** | Negative round_up | ⚠️ no sprint_key | CLOSED — BACKEND FIXED | N/A | N/A |
| 8 | **BUG-122** | fOrderStatus 7 popup | ⚠️ no sprint_key | CLOSED — OWNER VERIFIED | ✅ | ✅ |

---

## SECTION E: MENU BUG BRANCH IMPORTS (CR-036 family, CR-029-QSR)

| # | ID | Title | registry.json | Intake Doc | Impact/Plan | Code Done | QA Report | Owner Smoke |
|---|-----|-------|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **CR-036** | Bulk Editor Add Item top row | ❌ **MISSING** | ✅ `change_requests/CR_036_*` | ✅ | ✅ Gate 3 + Gate 4 CONFIRMED | ❌ | ☐ |
| 2 | **CR-036-FU-01** | Validation UX polish | ❌ **MISSING** | ✅ `change_requests/CR_036_FU_01_*` | ✅ | ✅ Gate 3 | ❌ | ☐ |
| 3 | **CR-036-FU-02** | Column reorder + Sold By | ❌ **MISSING** | ✅ `change_requests/CR_036_FU_02_*` | ✅ | ✅ Gate 3 | ❌ | ☐ |
| 4 | **CR-036-FU-03** | Tax validation + overlay | ❌ **MISSING** | ✅ `change_requests/CR_036_FU_03_*` | ✅ | ✅ Gate 3 | ❌ | ☐ |
| 5 | **CR-029-QSR** | QSR payload parity + round_up | ❌ **MISSING** | ✅ `change_requests/CR_029_QSR_*` | ✅ | ✅ Gate 3 (11 unit tests) | ❌ | ☐ |
| 6 | **BUG-125-B** | Food Type not persisting | ❌ **MISSING** | ✅ `change_requests/BUG_125_B_*` | ✅ | ❌ NOT STARTED (other branch) | N/A | N/A |

---

## SECTION F: OPEN INTAKE / DEFERRED / BLOCKED

| # | ID | Title | registry.json | Status | Action |
|---|-----|-------|:---:|:---:|------|
| 1 | **CR-027** | Unified Toast | ❌ **MISSING** | REGISTERED — NOT STARTED | Next sprint |
| 2 | **CR-028** | Item-Level Discount | ❌ **MISSING** | INTAKE COMPLETE — NO CODE | Blocked on OD-1…OD-5 |
| 3 | **BUG-118** | Coupon codes not working | ⚠️ no sprint_key | INTAKE | FE investigation needed |
| 4 | **BUG-123** | 401 silent redirect | ⚠️ no sprint_key | INTAKE | Next sprint |
| 5 | **BUG-124** | Socket payload incomplete | ⚠️ no sprint_key | INTAKE — FE DEFENDED | Backend-blocked |

---

## REGISTRY.JSON SYNC GAPS

### 1. Items COMPLETELY MISSING from registry.json (18)

| ID | Should Be Sprint | Status per CR_REGISTRY/BUG_TRACKER |
|----|-----------------|-------------------------------------|
| CR-020 | pos_4_0 | Phases 1-3 CLOSED, Phase 4 IMPLEMENTED |
| CR-021 | pos_4_0 | CLOSED — OWNER VERIFIED |
| CR-022 | pos_4_0 | CLOSED — OWNER VERIFIED |
| CR-023 | pos_4_0 | CLOSED — OWNER VERIFIED |
| CR-024 | pos_4_0 | CLOSED — OWNER VERIFIED |
| CR-025 | pos_4_0 | IMPLEMENTED — awaiting smoke S-1 |
| CR-026 | pos_4_0 | IMPLEMENTED — awaiting smoke S-9 |
| CR-027 | pos_4_0 | REGISTERED — NOT STARTED |
| CR-028 | pos_4_0 | INTAKE COMPLETE — NO CODE |
| CR-029-QSR | pos_4_0 | GATE 3 COMPLETE |
| CR-036 | pos_4_0 | GATE 4 CONFIRMED |
| CR-036-FU-01 | pos_4_0 | GATE 3 COMPLETE |
| CR-036-FU-02 | pos_4_0 | GATE 3 COMPLETE |
| CR-036-FU-03 | pos_4_0 | GATE 3 COMPLETE |
| CR-044 | pos_4_0 | IMPLEMENTED |
| CR-045 | pos_4_0 | IMPLEMENTED |
| BUG-122 post-delivery | pos_4_0 | IMPLEMENTED — smoke S-7 |
| BUG-125-B | pos_4_0 | PLANNING COMPLETE (other branch) |

### 2. Items in registry.json with WRONG or MISSING sprint_key (24)

All of these are logged under `sprint_key: null` or a non-pos_4_0 key, but belong to POS 4.0 per CR_REGISTRY.md / BUG_TRACKER.md:

CR-017, CR-018, CR-019, CR-029, CR-030, CR-031, CR-032, CR-033, CR-034, CR-035,
BUG-112, BUG-113, BUG-114, BUG-115, BUG-116, BUG-117, BUG-118, BUG-119,
BUG-122, BUG-123, BUG-124, BUG-125, BUG-126, BUG-127, BUG-128, BUG-129

### 3. Items in registry.json with STALE status (10)

CR-037 through CR-042, BUG-131 through BUG-133, CR-043 — all show `"status": "REGISTERED"` but actual status is IMPLEMENTED or higher per CR_REGISTRY/BUG_TRACKER.

---

## FILE_OWNERSHIP.MD GAPS

**Last updated:** 2026-05-29 (15 days stale)

**Files changed this sprint NOT in FILE_OWNERSHIP.md** (from session handovers):

| File | CRs | Session |
|------|-----|---------|
| `api/transforms/orderPayloadStripper.js` (NEW) | CR-045 | Jun 13 |
| `api/services/insightsCache.js` (NEW) | CR-044 | Jun 13 |
| `contexts/InsightsCacheContext.jsx` (NEW) | CR-044 | Jun 13 |
| `components/panels/SettlementPanel.jsx` | BUG-132 | Jun 13 |
| `components/layout/Sidebar.jsx` | CR-040, CR-042, BUG-131, CR-044 | Jun 13 |
| `pages/LoadingPage.jsx` | CR-037, CR-038 | Jun 13 |
| `components/order-entry/CategoryPanel.jsx` | CR-037 | Jun 13 |
| `components/panels/CreditManagementPanel.jsx` | CR-039 | Jun 13 |
| `pages/AllOrdersReportPage.jsx` | CR-040 | Jun 13 |
| `pages/OrderSummaryPage.jsx` | CR-040 | Jun 13 |
| `pages/RoomOrdersReportPage.jsx` | CR-040 | Jun 13 |
| 10x `pages/reports-module/*Mockup.jsx` | CR-044, BUG-133, CR-045 | Jun 13 |
| `api/services/insightsService.js` | BUG-133, CR-045, CR-044 | Jun 13 |
| `api/services/orderLedgerService.js` | CR-045, CR-044 | Jun 13 |
| `api/services/roomOrdersService.js` | CR-045, CR-044 | Jun 13 |
| `api/services/foodCourtService.js` | CR-045, CR-044 | Jun 13 |
| `api/services/prepServeService.js` | CR-045, CR-044 | Jun 13 |
| `api/services/creditService.js` | CR-039 | Jun 13 |
| `api/transforms/reportTransform.js` | BUG-133 | Jun 13 |
| `api/constants.js` | CR-037 | Jun 13 |
| `contexts/MenuContext.jsx` | CR-037 | Jun 13 |
| `hooks/useRefreshAllData.js` | CR-037 | Jun 13 |
| `App.js` | CR-044 | Jun 13 |
| Plus ~15 files from Jun 10-11 sessions | Various | Jun 10-11 |

**Total: ~30+ files missing from FILE_OWNERSHIP.md**

---

## SMOKE BATCH GAP

**Existing batch:** `POS4_0_OWNER_SMOKE_BATCH_2026_06_11.md` — S-1 through S-9, all pending.

**Missing from batch (10 items implemented June 12-13):**

| Item | Priority | What to verify |
|------|----------|----------------|
| BUG-132 | P1 (money) | Settlement: Expected = TotalFunds - Settled; Pilferage shows backend value; Total Funds KPI card exists |
| CR-040 | P3 | Sidebar: "Daily Report", "Daily Summary", "Daily Room Report" labels; X/Y/Z gone |
| CR-042 | P3 | Sidebar + header: "Item Ledger" replaces "Items & Menu" |
| BUG-131 | P2 | Sidebar bottom (Ringer/Refresh/User/Logout) stays pinned when scrolling |
| CR-037 | P2 | Boot: "Popular" tab gone from OrderEntry; no popular-items API call in Network |
| CR-038 | P2 | Boot: "Attempt 1 of 3" counter; after 3 -> disabled + "Contact support" |
| CR-039 | P1 (money) | Credit: Total Credit / Total Paid KPI tiles show real values (not hardcoded) |
| BUG-133 | P1 (money) | Reports: "Check In" items excluded from all 8 report surfaces |
| CR-044 | P1 (perf) | Insights: navigate between reports with same date range -> no re-fetch (check Network tab) |
| CR-045 | P2 (perf) | Insights: order payloads stripped of unused fields (check response size in Network) |

---

## SESSION START FILES (Artifact #0)

**Count for POS 4.0: ZERO.**

Every session skipped Artifact #0 per the AGENT_PROMPT_ALPHA v0.4 protocol. This affects all sessions from June 1-13.

**Recommendation:** Low-value retroactive backfill. Recommend SKIP with documentation note and enforce from next sprint.

---

## OPEN_GAPS_REGISTER.MD STATUS

**Last updated:** 2026-06-10 (3 days ago)

**Not reviewed for:**
- BUG-132 formula issues (identified and FIXED — should the gap be added as RESOLVED?)
- BUG-133 Check In phantom revenue (FIXED — should be documented as resolved gap)
- CR-044/CR-045 performance issues (implemented — temporary arrangement noted in plan)
- Any new backend gaps surfaced during June 12-13

---

## RECOMMENDATIONS (for owner decision)

| # | Gap | Recommendation | Effort |
|---|-----|----------------|--------|
| 1 | 18 items missing from registry.json | **BACKFILL** — mechanical add | ~30 min |
| 2 | 24 items with wrong sprint_key | **BACKFILL** — mechanical update | ~15 min |
| 3 | 10 stale statuses in registry.json | **BACKFILL** — sync from CR_REGISTRY/BUG_TRACKER | ~10 min |
| 4 | FILE_OWNERSHIP.md 15 days stale | **BACKFILL** — add ~30 files from session handovers | ~20 min |
| 5 | 10 items missing from Smoke Batch | **BACKFILL** — create S-10 through S-19 batch for June 12-13 items | ~15 min |
| 6 | OPEN_GAPS_REGISTER.md not reviewed | **BACKFILL** — add/close gaps from this sprint | ~15 min |
| 7 | Session Start files (0 exist) | **SKIP** — document as "skipped for POS 4.0, enforce from next sprint" | 0 min |
| 8 | QA for 10 June 12-13 items | **DEFER** — QA handover written, execution is QA agent's job | 0 min |
| 9 | Sprint Health Check script | **BACKFILL** — create prevention mechanism | ~30 min |

---

## SELF-ASSESSMENT (CLOSURE Agent)

| Dimension | Score | Notes |
|-----------|:---:|-------|
| Role correctly identified? | 5 | CLOSURE (Role 11) — documentation audit only |
| Required docs read? | 5 | All 11 docs from handover read list |
| Scope lock held? | 5 | Zero code changes, zero source file modifications |
| Outputs complete? | 3 | Gap audit done; backfill pending owner approval |
| Registries updated? | 1 | Audit only — updates pending Phase B |
| Stale docs flagged? | 4 | FILE_OWNERSHIP, registry.json, OPEN_GAPS identified |

---

*Gap Audit completed 2026-06-13. Awaiting owner decisions on Phase B (Backfill).*
