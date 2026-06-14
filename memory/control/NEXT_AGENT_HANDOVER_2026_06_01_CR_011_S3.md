# Next-Agent Handover — CR-011 Reports Module

**Date:** 2026-06-01
**From:** Main agent (E1) — CR-011 S3 drill-sheet freeze session
**Active CR:** CR-011 — Complete Reports Module (POS 4.0)
**Active outlets for validation:**
  - Pav & Pages — `vishal@pav.com` / `Qplazm@10` (restaurant_id 383)
  - Palm House — `owner@palmhouse.com` / `Qplazm@10`
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
| S2 Item Sales | ✅ FROZEN 2026-06-01 | Cancel-at attribution, 5-tab report, live API |
| S3 Side-sheet Drill Template | ✅ FROZEN 2026-06-01 | Drill data, cancel reason_type lookup, Item/Order scope tags |
| S4 Edge States | ✅ FROZEN 2026-06-01 | First-load splash, re-fetch ghost, error banner, empty result |

**Phase 1 progress: 5/5 screens frozen (S0 visual-locked, S1–S4 fully frozen). Code Gate 1 is NEXT.**

---

## 2. What shipped this session (code changes)

### New files
- `/app/frontend/src/pages/reports-module/ItemDrillSheet.jsx`
  - 480px right-side drill panel, slide-in animation
  - KPI strip: Qty Sold, Revenue, Avg Price
  - Recent Orders table: 20 most recent lines per item (order#, date, qty, amount, status badge, waiter)
  - Variation Breakdown: progress bars with % share
  - Addon Attach Rate: count, %, revenue
  - Cancellation Breakdown: reason from `reason_type` lookup, `Item`/`Order` scope tag, cancel_reason_text as notes
  - Footer: Discount, Tax, Contribution %

### Modified files
- `/app/frontend/src/api/services/insightsService.js`
  - Added `drillMap` collection during aggregation loop: per-food_id order lines, variation parsing, addon parsing, cancel detail collection
  - Added `/cancellation-reasons` fetch (parallel with existing fetches)
  - `cancelReasonById` lookup map: resolves `reason_type` ID → reason text
  - Cancel reason chain: `reason_type` lookup (primary) → `cancellation_reason` on order (fallback for order-level cancels)
  - `cancel_reason_text` stored as `notes` (extra staff notes, not the reason itself)
  - `scope` field: `'item'` when `reason_type` present, `'order'` when only order-level reason exists
  - Rows now include `drill: { orderLines, variations, addons, cancels }` per item

- `/app/frontend/src/pages/reports-module/ItemSalesMockup.jsx`
  - Imported `ItemDrillSheet`, replaced S2 stub drill-sheet
  - Passes `drill` data through mapped rows
  - Cancelled badge hidden on Cancelled Lines tab (`activeTab !== 'cancelled'` guard)

- `/app/frontend/src/index.css`
  - Added `@keyframes slide-in-right` + `.animate-slide-in-right` for drill sheet

---

## 3. Owner-facing decisions made this session (binding)

*Inherits all decisions from previous S2 handover, plus:*

1. **S2 freeze** — owner confirmed, flipped to ✅ FROZEN.
2. **S3 visual sign-off** — owner said "lock" (Gate ③).
3. **S3 data validation** — owner said "we can freeze this" (Gate ⑤).
4. **Cancelled badge on Cancelled tab** — removed. Tab context is sufficient; badge was confusing when mixed with items that had both sold + cancelled lines.
5. **Cancel reason fields (critical clarification):**
   - `reason_type` (numeric ID) → look up via `/api/v1/vendoremployee/cancellation-reasons` → **this is THE cancellation reason**
   - `cancel_reason_text` → **extra notes** added by staff (NOT the reason itself)
   - Previous session incorrectly treated `cancel_reason_text` as the primary reason — corrected this session.
6. **Item vs Order scope tags** — show in cancellation breakdown to distinguish item-level vs order-level cancellations.
7. **"don't code/edit without taking approval"** — still binding. ALWAYS propose in chat, wait for explicit owner approval.

---

## 4. Immediate next steps (priority order)

### 🔴 P0 — Code Gate 1 (Phase 1 complete — all screens frozen)
- S0 still at 🔵 LOCKED (visual only, API wiring pending). Owner decision needed:
  a. Wire S0 dashboard KPI tiles to real data NOW → then Code Gate 1 covers S0–S4
  b. Proceed with Code Gate 1 on S1–S4 only, park S0 API wiring for later
- Build `<ReportLoadingShield>` + `useReportFetch` primitives in `/app/frontend/src/components/reports/`.
- Retrofit S1–S4 (or S0–S4) to satisfy `CR_011_LOADING_AND_INTERACTION_SPEC.md §5` acceptance checklist.
- Open sub-CR for shipping (intake → impact → impl plan → code gate artifacts → impl + QA → owner smoke).

### 🟡 P1 — Phase 2 Screens (S5–S10) after Code Gate 1 ships
- S5 Item Sales Hybrid (5 tabs + Combined Export)
- S6 Order Ledger Hybrid
- S7 Payment Mix
- S8 Cancellation Report
- S9 Order Activity Log
- S10 Prep & Serve Time

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
3. **Mockups in `/app/frontend/src/pages/reports-module/`** — same filename across revision rounds.
4. **Owner sign-off must be explicit** ("lock it" / "freeze it" / "looks good"). "ok" / "fine" is too ambiguous — re-prompt.
5. **Implementation-only changes (loading shield, primitives) — only at per-Phase Code Gate.**
6. **Existing reports (Audit Report, Room Reports)** — do NOT touch.
7. **Cancel reason = `reason_type` lookup. `cancel_reason_text` = notes.** Do not reverse this.

---

## 8. Reference — Backend reality

### `/order-logs-report`
```
POST https://preprod.mygenie.online/api/v2/vendoremployee/report/order-logs-report
Body: { "sort_by": "collect_bill" | "created_at", "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD" }
```
- `cancel_at` rejected by backend — client-side filter in `insightsService.js`.
- `food_status='3'` = cancelled. `'5'` = served. `'2'` = ready. `'1'` = preparing.
- `line.reason_type` = cancel reason ID. Resolve via `/cancellation-reasons`.
- `line.cancel_reason_text` = staff notes (may be null).
- `line.cancel_type` = "Pre-Serve" | "Post-Serve".
- `orders_table.cancellation_reason` = order-level cancel reason (for full-order cancellations).

### `/cancellation-reasons`
```
GET https://preprod.mygenie.online/api/v1/vendoremployee/cancellation-reasons?limit=100&offset=1
```
- Returns `{ reasons: [{ id, reason, ... }] }`.
- Map `id` → `reason` text. Used in `insightsService.js` as `cancelReasonById`.

---

## 9. Last owner messages (verbatim, this session)

1. *"S2 freeze what will ne next step"* → triggered S2 freeze + S3 planning.
2. *"lock"* → S3 visual sign-off (Gate ③).
3. *"there is a issue here item can be cancelled only after selling, not able to understand this logic"* → triggered Cancelled badge removal discussion.
4. *"yes remove batch"* + screenshot showing "No reason provided" → triggered cancel reason investigation.
5. *"reason_type (a status ID) this the one which needs to be cancellation reason, reason text this is extra notes"* → corrected the cancel reason chain.
6. *"we can freeze this"* → S3 data validation sign-off (Gate ⑤).
7. *"update docs as per control layer"* → triggered this handover update.

---

## 10. Pending owner question

**None.** Phase 1 is complete (S0–S4 all frozen). Next action is **Code Gate 1** — agent should propose the implementation plan for `<ReportLoadingShield>` + `useReportFetch` primitives and ask owner whether to wire S0 API now or defer.

---

*This handover supersedes `NEXT_AGENT_HANDOVER_2026_06_01_CR_011_S2.md`. It is the single source of truth for the next agent starting in this context.*
