# Next-Agent Handover — CR-011 Reports Module

**Date:** 2026-06-01
**From:** Main agent (E1), fork session — CR-011 S2 cancellation-attribution fix
**Active CR:** CR-011 — Complete Reports Module (POS 4.0)
**Active outlet for validation:** Pav & Pages — `vishal@pav.com` / `Qplazm@10` (restaurant_id 383)
**Preview URL:** https://insights-phase.preview.emergentagent.com
**Backend:** https://preprod.mygenie.online/ (external preprod; do NOT change)

---

## 0. MANDATORY FIRST READ (in this exact order)

1. `/app/memory/control/AGENT_HANDOVER_PROTOCOL.md` — global rules
2. `/app/memory/control/CONTROL_DASHBOARD.md` — current project state
3. **`/app/memory/control/CR_011_SCREEN_FREEZE_PROTOCOL.md`** — binding gate rules for CR-011
4. **`/app/memory/control/CR_011_SCREEN_FREEZE_LOG.md`** — current state of all 41 screens
5. **`/app/memory/memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md`** — per-Phase Code Gate contract
6. `/app/memory/memory/change_requests/impact_analysis/CR_011_FIELD_TO_REPORT_ATLAS_2026_06_01.md`
7. `/app/memory/memory/change_requests/impact_analysis/CR_011_BACKEND_COORDINATION_NOTE_2026_06_01.md`
8. `/app/memory/PRD.md`
9. `/app/memory/test_credentials.md`

Do NOT start coding until the protocol is internalized.

---

## 1. Where things stand (CR-011 Phase 1)

| Screen | Status | Notes |
|---|---|---|
| S0 Landing Dashboard | 🔵 Visual locked 2026-06-01 | API wiring pending |
| S1 Module Shell + Sidebar | ✅ FROZEN 2026-06-01 | — |
| **S2 Item Sales** | 🟠 **API wired v3 — awaiting owner data re-validation** | This is the current focus. See §2. |
| S3 Side-sheet Drill Template | ⏳ Queued | Cannot start until S2 FROZEN |
| S4 Edge States | ⏳ Queued | After S3 |

---

## 2. What just shipped (this session, code changes)

### Files edited
- `/app/frontend/src/api/services/insightsService.js`
  - Added `sortBy='cancel_at'` mode: fetches `created_at` server-side, client-side filters cancelled lines by `line.cancel_at` falling inside `[fromDate..toDate]`.
- `/app/frontend/src/pages/reports-module/ItemSalesMockup.jsx`
  - Replaced single `sortBy` state with two: `paidPunchedToggle` (default `collect_bill`) and `cancelPunchedToggle` (default `cancel_at`).
  - `effectiveSortBy` = the toggle that matches the active tab → drives fetch dep.
  - Toggle UI is now context-aware:
    - Cancelled tab → **By Cancelled Date / By Punched Date** (Paid Date hidden — cancelled lines never get paid)
    - All other tabs → **By Paid Date / By Punched Date**
  - Removed the "Updated 2 mins ago" pill from the header.
  - Removed the "MyGenie POS • Andheri East Outlet" subtitle from the header.
  - Removed the now-unused `RefreshCw` import.

### API-replay verification (Pav & Pages, 1–10 May 2026, sort_by=cancel_at)
- 26 items / qty 61 / **₹3,510** — **exact match** with old report ✅

### Docs updated
- `CR_011_SCREEN_FREEZE_LOG.md` — S2 row → v3 with new details
- `CR_011_SCREEN_FREEZE_PROTOCOL.md` — added §4 per-Phase Code-Gate interleaved flow + §7 Code-Gate addendum
- `CONTROL_DASHBOARD.md` — last-updated note refreshed
- `PRD.md` — rewritten for CR-011 scope, per-Phase cadence
- `test_credentials.md` — Pav & Pages credentials saved
- **NEW** `CR_011_LOADING_AND_INTERACTION_SPEC.md` — cross-screen loading/disabled/cancellation contract

---

## 3. Owner-facing decisions made this session (binding)

1. **Cancelled tab attribution** — `cancel_at` is the canonical default; `created_at` is the override; `collect_bill` is hidden on the Cancelled tab.
2. **Header chrome on report screens** — no "last updated" pill, no outlet subtitle. Keep title + breadcrumb + back button only.
3. **Loading / disabled-controls / request-cancellation** — captured as **planning spec** (`CR_011_LOADING_AND_INTERACTION_SPEC.md`). Implementation deferred to per-Phase Code Gate.
4. **Implementation cadence** — **per-Phase, NOT single Gate 4**:
   - Phase 1 (S0–S4) FROZEN → Code Gate 1 → primitives + Phase-1 retrofit → ship sub-CR
   - Phase 2 FROZEN → Code Gate 2 → reuse primitives + Phase-2 retrofit → ship
   - Phase 3 FROZEN → Code Gate 3 → ship
   - Phase 4 FROZEN → Code Gate 4 → final audit
5. **Owner directive (strict):** *"don't code/edit without taking approval"* — ALWAYS propose diagnosis + proposed change in chat and wait for explicit owner approval before any `mcp_search_replace` or file write.

---

## 4. Immediate next steps (priority order)

### 🔴 P0 — Close out S2 (currently in flight)
**Resume point:** Owner is validating ₹3,510 live on the app. Once they reply "looks good" / "lock it":
1. Update `CR_011_SCREEN_FREEZE_LOG.md` → flip S2 status from `🟠` to `✅ FROZEN` with today's date in "API validated".
2. Acknowledge in chat.
3. Proceed to S3.

### 🟡 P1 — S3 Side-sheet Drill Template
- Mockup the side-sheet drill UI in `/app/frontend/src/pages/reports-module/` (probably a sub-component reused by S2 row clicks).
- Hardcoded realistic Indian F&B seed data first.
- Send screenshot for owner review (Gate ②).
- After visual sign-off (Gate ③), wire to live API.
- After API validation (Gate ⑤), mark FROZEN.

### 🟡 P2 — S4 Edge States Template
- Empty / loading / error / no-permission states.
- Visually incorporate the loading-spec states (`splash`, `ghosted re-fetch`, `retry banner`) so owner can sign off the visual language BEFORE Code Gate 1. Pure CSS / mock isLoading toggle — no real fetch wiring.

### After Phase 1 (S0–S4) FROZEN → **Code Gate 1**
- Build `<ReportLoadingShield>` + `useReportFetch` primitives in `/app/frontend/src/components/reports/`.
- Retrofit S0–S4 to satisfy `CR_011_LOADING_AND_INTERACTION_SPEC.md §5` acceptance checklist.
- Open sub-CR for shipping (intake → impact → impl plan → code gate artifacts → impl + QA → owner smoke).

---

## 5. Blocked / parked (no schedule impact today)

| Item | Blocker | Effect |
|---|---|---|
| BE-1 | Split-payment array on `/order-logs-report` | Payment Mix + Cashier Settlement accuracy on partial orders |
| BE-3 | Category grouping in product master | Item Sales category roll-ups |
| BE events | create/cancel/ready/serve emission | A-1 Activity Log report |

Coordination note: `CR_011_BACKEND_COORDINATION_NOTE_2026_06_01.md`.

---

## 6. Other CRs registered (not started)

- **CR-010** — Weight-based menu item support (P1, registered 2026-06-01)
- **CR-012** — Menu Management API contract migration (P1, registered 2026-06-01)

Both queued behind CR-011 completion.

---

## 7. Hard rules to NOT violate

1. **Never edit a `✅ FROZEN` screen** — re-open it via §7 of the screen-freeze protocol first.
2. **Never start S(n+1) when S(n) is not FROZEN**, unless owner explicitly says "park S(n), start S(n+1)".
3. **Mockups in `/app/frontend/src/pages/reports-module/`** — same filename across revision rounds (do not version-suffix files).
4. **Owner sign-off must be explicit** ("lock it" / "freeze it" / "looks good"). "ok" / "fine" is too ambiguous — re-prompt.
5. **Implementation-only changes (loading shield, primitives) — only at per-Phase Code Gate. NOT during visual-DNA or API-wiring phases.**
6. **Existing reports (Audit Report, Room Reports)** — do NOT touch. CR-011 is a separate module.

---

## 8. Reference — Backend reality on `/order-logs-report`

```
POST https://preprod.mygenie.online/api/v2/vendoremployee/report/order-logs-report
Body: { "sort_by": "collect_bill" | "created_at", "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD" }
```

- `sort_by` only accepts those two values. `cancel_at` is **rejected** by the backend (returns `success: false`, message `Invalid sort_by value`). Hence the client-side filter.
- Cancelled line item carries `cancel_at: "YYYY-MM-DD HH:MM:SS"` (restaurant-local). Use `.slice(0,10)` for date comparison — never `new Date()` parsing (would shift on TZ).
- `food_status='3'` = cancelled line. `food_status='5'` = served. `'2'` = ready. `'1'` = preparing.
- Order-level cancellation: `orders_table.f_order_status == '3'`. May or may not surface in line-level food_status — verify case by case.
- Complementary flag: `line.complementary` can be `'1' | 1 | 'yes' | 'Yes' | true`. Already normalized in `insightsService.js`.

---

## 9. Last 3 owner messages (verbatim, this session)

1. *"correction implenation aftaer each phase"* → triggered the per-Phase Code Gate restructure.
2. *"I think its more about implennation part here focus was to wire api to mock screen we are yet to do actaul implenation so this shd be part of planning"* → triggered the deferred-to-Code-Gate decision for loading work.
3. *"cancealltion is not matching in old report it shows 3510, in ours shows 2825"* → triggered the cancel_at attribution fix.

---

## 10. Pending owner question (waiting on owner action)

**Owner is validating ₹3,510 live on the app for Pav & Pages, 1–10 May, Cancelled Lines tab, By Cancelled Date mode.**
- If "looks good" → flip S2 to ✅ FROZEN, start S3.
- If "still off" → re-diagnose. The most likely follow-up issues are timezone edge cases at midnight or `cancel_at` being null on a small subset of lines (verified zero nulls in current sample, but reservation/future state may differ).

---

*This handover is the single source of truth for the next agent starting in this context. Update it (or supersede it with a new dated handover) at the end of every working session.*
