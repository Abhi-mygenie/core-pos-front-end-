# Session Handover — 2026-11-27 Investigation + Contract Review

```
Role for next agent : Boot AGENT_PROMPT_ALPHA (Step -1 / Step -1.5) → then follow phases below
Date written        : 2026-11-27
Written by          : E1 (Emergent agent)
Primary doc         : /app/memory/control/AGENT_PROMPT_ALPHA.md
Sprint              : nov_cr_batch (closing) + dec sprint prep
Branch (pushed)     : 20261127_063644 (earlier push) — final push this session: TBD
```

---

## 0. BOOT SEQUENCE (MANDATORY)

```
1. READ this file in full
2. READ /app/memory/control/AGENT_PROMPT_ALPHA.md
3. PRESENT to owner:
   "Last session (2026-11-27): Investigated BUG-719/722/696 performance, reviewed 
   CR-542/BUG-709/BUG-696 backend handoffs, fully reviewed BUG-598 V1 contract 
   (2 rounds). All docs and decisions updated. 3 items need owner decisions before 
   next implementation can start."
4. ASK owner which phase to start
```

---

## 1. ENVIRONMENT

| Item | Value |
|------|-------|
| App URL (preview) | `https://core-pos-preview-32--7s7xeuwn.preview.emergentagent.com` |
| Backend | `https://preprod.mygenie.online` |
| Branch (latest pushed this session) | `20261127_063644` |
| Frontend | Running port 3000, supervisor-managed |
| Test account (primary) | `owner@palmhouse.com / Qplazm@10` (RID 541) |

---

## 2. EVERYTHING DONE THIS SESSION (2026-11-27)

### Phase 1 — Deployment
- Deployed branch `20261126_164747` from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` into `/app/frontend`
- Synced `memory/` from repo (75 files)
- Collected 4 missing secrets via secure card: `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_VAPID_KEY`, `REACT_APP_GOOGLE_MAPS_KEY`, `REACT_APP_CRM_API_KEYS`
- Pushed deployment state to new branch `20261126_173125`

### Phase 2 — Backend Handoff Reviews (3 files uploaded by owner)
Investigated `CR-542`, `BUG-709`, `BUG-696` backend replies:

**CR-542 (Mandatory Unpaid Reason):**
- Backend fully delivered on V1 endpoints. Enforcement is live.
- Contract delta found: V1 not V2, `unpaid_reason_id` (int) not `reason` (text), `unpaid_note` added
- 5 frontend gaps identified: constants, service, dialog, 4 call sites
- Status: `BACKEND_ENFORCING — FRONTEND_URGENT`

**BUG-709 (Make Unpaid audit event after cancel):**
- Backend investigated — bug NOT reproduced. `make_unpaid` events persist after cancel.
- Frontend code clean — no suppression logic found in `AuditLogMockup.jsx`
- Status: `AWAITING_OWNER_UI_CONFIRM` — needs QA visual session on `owner@ruby.com`

**BUG-696 (Insights Dashboard timeout):**
- Backend SQL fix deployed to production (COALESCE → UNION ALL)
- Frontend: ZERO changes needed — same endpoint, same contract
- Status: `RESOLVED` — frontend ticket closed

### Phase 3 — BUG-719/722 Performance Investigation (10 steps, Role 6)
Live probe on preprod (palmhouse, RID 541):

| Endpoint | Range | Time | Status |
|----------|-------|------|--------|
| `insights-dashboard` | 30D | 47.7s | ⚠️ PASS but only 12s from timeout |
| `insights-dashboard` | 50D | 65.4s | ❌ TIMEOUT (BUG-719) |
| `insights-dashboard` | Last Month | 65.3s | ❌ TIMEOUT (BUG-722) |
| `insights-dashboard` | FY (240d) | >90s | ❌ HARD TIMEOUT |
| `daily-order-report-combined` | 1 month | 10.1s | ✅ Fast |
| `daily-order-report-combined` | 2 months (chunks) | 18.9s + 11.1s = 30s | ⚠️ Sequential |
| All 7 insights sub-endpoints | 30D (parallel) | 2.7s–13.1s | ✅ All fine |

**Key findings:**
- BUG-696 fix is PARTIAL — 30D works but 31+ days still times out
- BUG-719 and BUG-722 NOT resolved by BUG-696 fix
- 3 FE-fixable optimisations identified (Audit Log range cap, parallel chunk fetching, cache size bump)
- Evidence saved: `/app/memory/evidence/BUG-719/`

### Phase 4 — BUG-598 V1 Contract Review (Round 1)
Backend (Gyan) proposed new V1 endpoint `POST /api/v1/vendoremployee/report/order-logs-report`:
- Mandatory pagination, 730-day limit, `payment_summary` full-range vs `page_payment_summary` page-only
- Reviewed and found 3 gaps; filed backend brief

**New contract doc:** `contracts/BUG-598_V1_ORDER_LOGS_API_CONTRACT_2026_11_27.md`
**Backend brief filed:** `backend_briefs/BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md`

3 gaps asked:
- Gap 1: Room Orders filtering across pages (`order_in` server-side filter?)
- Gap 2: Snapshot consistency across page fetches
- Gap 3: Room-only financial totals

### Phase 5 — BUG-598 V1 Revised Contract Review (Round 2)
Backend replied with revised contract answering all 3 gaps:

| Gap | Answer | Status |
|-----|--------|--------|
| 1 — Room filtering | `report_scope` param: `all_orders` / `room_orders` | ✅ Resolved |
| 2 — Snapshot consistency | Full immutable snapshot: HTTP 202 + `snapshot_id` + polling | ✅ Resolved (more complex than asked) |
| 3 — Room totals | `room_summary` + `page_room_summary` (11 fields each) | ✅ Resolved |

**What is unblocked:** Order Ledger, All Orders, Room Orders V1 migration. BUG-598 Sub-batch B caps 60d → 730d.

**What still needs answers before Gate 4 GO (3 items for Gyan):**
1. RM status mapping (which RM parents to exclude — cancelled/merged)
2. Snapshot preparation time for 30d/60d/730d
3. 30-min TTL sufficient for large exports?

**New frontend architecture needed:** Snapshot polling (HTTP 202 → poll → pages). No existing pattern in codebase. Must be scoped before implementation starts.

### Phase 6 — All Docs Updated
| Doc | What changed |
|-----|-------------|
| `change_requests/CR-542_UNPAID_REASON_MANDATORY_INTAKE.md` | Status updated, enforcement live, all ODs resolved, contract delta table |
| `change_requests/BUG-696_AUDIT_REPORT_INSIGHTS_DASHBOARD_TIMEOUT_INTAKE.md` | Resolution block appended |
| `change_requests/BUG-598_REPORTS_DATE_RANGE_CAP_TOO_RESTRICTIVE_INTAKE.md` | All 7 ODs (03–07) updated with round 2 answers, gate status updated |
| `contracts/BUG-598_V1_ORDER_LOGS_API_CONTRACT_2026_11_27.md` | v2 additions, snapshot fields, room_summary, gate tracker |
| `investigations/BUG-709_INVESTIGATION_REPORT_2026_11_26.md` | New file — two-round investigation |
| `backend_briefs/BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md` | New file — 3-gap brief |

### Phase 7 — Git Pushes
- Branch `20261126_173125` — initial deployment + memory sync
- Branch `20261127_063644` — docs update (CR-542, BUG-709, BUG-696, BUG-598 v1, brief)
- Branch `20261127_XXXXXX` — this session final push (see below)

---

## 3. OPEN ITEMS REQUIRING OWNER/GYAN ACTION

### Needs Gyan (backend) — 4 items

| ID | Item | Urgency |
|----|------|---------|
| OD-598-06 follow-up | Snapshot prep time for 30d/60d/730d + Retry-After recommendation | Before scoping |
| OD-598-06 follow-up | Is 30-min TTL sufficient for 730-day export sessions? | Before scoping |
| OD-598-04 follow-up | Write down exact RM status mapping (which parent statuses excluded) | Before Room Orders planning |
| OD-598-07 follow-up | Sample V1 response for known room dataset → parity vs `computeFinancials()` | Before Room Orders planning |

### Needs Owner — 3 items (unchanged from previous handover)

| OD | Item | Unblocks |
|----|------|---------|
| OD-753-01 | Collect Bill block: disable-button OR toast-on-click? | BUG-753 planning |
| OD-754-01 | Tax label when VAT off: "VAT" / "—" / keep "GST"? | BUG-754 fast lane (1 line) |
| Gate 4 GO | BUG-705 PayLater Collect fix — plan ready, approve coding? | BUG-705 implementation |

### Needs Frontend Scoping (Abhishek) — 1 item

| Item | Detail |
|------|--------|
| BUG-598 snapshot polling architecture | No existing polling pattern in codebase. HTTP 202 → poll → pages is new. Must estimate scope before Gate 4 GO for V1 migration |

---

## 4. WHAT IS READY TO IMPLEMENT IMMEDIATELY (NO BLOCKERS)

### CR-542 — 5 frontend gaps, fully unblocked
All backend endpoints live on preprod. Backend enforcement is live — operators will get 422 if frontend doesn't add reason.

**Files to change:**
1. `api/constants.js` — add `UNPAID_REASONS` + `MAKE_ORDER_UNPAID_V1`
2. `api/services/paymentMutationService.js` — `fetchUnpaidReasons()`, update `makeOrderUnpaid(orderId, reasonId, note)`
3. `components/reports/MarkUnpaidConfirmDialog.jsx` — reason dropdown + optional note
4. 4 call sites: `AllOrdersReportPage:716`, `RoomOrdersReportPage:416`, `OrderReportBetaPage:370`, `CreditCustomerDetailSheet:309`

**Risk:** HIGH (financial action). Full gate flow required. No Fast Lane.
**Gate status:** Gate 2 impact analysis in `impact/CR-542_IMPACT_ANALYSIS.md`. Gate 4 GO needed.

### BUG-598 Sub-batch A — 4 files × 1 line, still Fast Lane eligible
`SalesMockup`, `DashboardMockup`, `ItemSalesHybridMockup`, `CancellationsMockup` — lift 60d/365d caps to 730d.
No backend dependency. Backend-agg endpoints already handle wide ranges.

### 3 FE Performance Optimisations (from BUG-719/722 investigation)
Fast Lane eligible with owner approval:
1. `AuditLogMockup.jsx` — add `MAX_RANGE_DAYS = 60` guard (prevents FY timeout calls)
2. `reportService.js` `getOrderReportBetaCombined` — parallel chunks (`Promise.all`)
3. `insightsCache.js` — bump `MAX_CACHE_ENTRIES = 5` → `10`

---

## 5. BACKEND BLOCKED — DO NOT TOUCH

| ID | Pri | Issue | Brief |
|----|-----|-------|-------|
| BUG-719 | P0 | Audit 50-day ~65s timeout | `BACKEND_BRIEF_2026_11_19_INSIGHTS_DASHBOARD_TIMEOUT.md` |
| BUG-722 | P0 | Audit 30D/LM/FY timeout | Same brief |
| BUG-712 | P0 | Customer name blank after Quick Link | Brief filed 2026-11-25 |
| BUG-598 V1 | — | V1 order-logs endpoint | Awaiting 4 follow-up answers from Gyan |

---

## 6. TEST CREDENTIALS

| Alias | Email | Password | RID | Used for |
|-------|-------|----------|-----|---------|
| OWNER_PALMHOUSE | owner@palmhouse.com | Qplazm@10 | 541 | Most investigation probes |
| OWNER_RUBY | owner@ruby.com | Qplazm@10 | — | BUG-709 QA (order 000802) |
| OWNER_CAFE103 | owner@cafe103.com | Qplazm@10 | 644 | BUG-682 manual test |
| TESTWAIT | testwait@thepalmhouse.com | Qplazm@10 | 541 | CR-515/BUG-711 (needs `report` perm grant) |
| PMS_MACHA | pms@macha (RID 69) | Qplazm@10 | 69 | BUG-749 FCM (real browser only) |

---

## 7. FILE PATHS QUICK REFERENCE

| Artifact | Path |
|----------|------|
| Agent system prompt | `/app/memory/control/AGENT_PROMPT_ALPHA.md` |
| Registry | `/app/memory/control/registry.json` |
| BUG Tracker | `/app/memory/control/BUG_TRACKER.md` |
| BUG-598 intake | `/app/memory/change_requests/BUG-598_REPORTS_DATE_RANGE_CAP_TOO_RESTRICTIVE_INTAKE.md` |
| BUG-598 V1 contract | `/app/memory/contracts/BUG-598_V1_ORDER_LOGS_API_CONTRACT_2026_11_27.md` |
| BUG-598 gaps brief | `/app/memory/backend_briefs/BACKEND_BRIEF_BUG-598_V1_CONTRACT_GAPS_2026_11_27.md` |
| CR-542 intake | `/app/memory/change_requests/CR-542_UNPAID_REASON_MANDATORY_INTAKE.md` |
| CR-542 impact analysis | `/app/memory/impact/CR-542_IMPACT_ANALYSIS.md` |
| BUG-709 investigation | `/app/memory/investigations/BUG-709_INVESTIGATION_REPORT_2026_11_26.md` |
| BUG-696 intake | `/app/memory/change_requests/BUG-696_AUDIT_REPORT_INSIGHTS_DASHBOARD_TIMEOUT_INTAKE.md` |
| BUG-719 timing evidence | `/app/memory/evidence/BUG-719/timing_evidence_2026_11_27.json` |
| Insights timeout brief | `/app/memory/backend_briefs/BACKEND_BRIEF_2026_11_19_INSIGHTS_DASHBOARD_TIMEOUT.md` |
| Sprint closure handover | `/app/memory/handover/SESSION_HANDOVER_2026-11-26_SPRINT_CLOSURE.md` |
| BUG-705 plan | `/app/memory/plans/` (search BUG-705) |

---

## 8. RECOMMENDED NEXT SESSION FLOW

```
Step 1  → Present 3 pending owner decisions (OD-753-01, OD-754-01, BUG-705 Gate 4 GO)
Step 2  → Owner grants report perm to testwait@thepalmhouse.com
          → Agent QA CR-515 + BUG-711 (5 min)
Step 3  → Owner confirms Gate 4 GO for CR-542
          → Agent implements CR-542 (5 gaps — dialog, service, constants, 4 call sites)
Step 4  → Owner approves BUG-598 Sub-batch A Fast Lane
          → Agent lifts 4 caps (1 line each, ~10 min)
Step 5  → Owner approves 3 FE perf optimisations Fast Lane
          → Agent implements Audit range cap + parallel chunks + cache bump
Step 6  → Push all to new timestamp branch
Step 7  → Ask Gyan for 4 BUG-598 follow-up answers (RM mapping, prep time, TTL, parity)
```
