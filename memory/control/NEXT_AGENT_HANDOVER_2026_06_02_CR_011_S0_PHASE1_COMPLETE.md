# Next-Agent Handover — CR-011 Reports Module

**Date:** 2026-06-02
**From:** Main agent (E1) — CR-011 S0 API wiring + Phase 1 freeze session
**Active CR:** CR-011 — Complete Reports Module (POS 4.0)
**Active outlets for validation:**
  - Pav & Pages — `vishal@pav.com` / `Qplazm@10` (restaurant_id 383)
  - Palm House — `owner@palmhouse.com` / `Qplazm@10` (restaurant_id 541)
  - Kunafa Mahal — `owner@kunafamahal.com` / `Qplazm@10` (restaurant_id 689, has loyalty data)
**Preview URL:** https://insights-phase.preview.emergentagent.com
**Backend:** https://preprod.mygenie.online/ (external preprod; do NOT change)

---

## 0. MANDATORY FIRST READ (in this exact order)

1. `/app/memory/control/AGENT_HANDOVER_PROTOCOL.md` — global rules
2. `/app/memory/control/CONTROL_DASHBOARD.md` — current project state
3. **`/app/memory/control/CR_011_SCREEN_FREEZE_PROTOCOL.md`** — binding gate rules for CR-011
4. **`/app/memory/control/CR_011_SCREEN_FREEZE_LOG.md`** — current state of all 41 screens
5. **`/app/memory/memory/change_requests/impact_analysis/CR_011_LOADING_AND_INTERACTION_SPEC.md`** — per-Phase Code Gate contract (REVISED 2026-06-02)
6. `/app/memory/memory/change_requests/impact_analysis/CR_011_FIELD_TO_REPORT_ATLAS_2026_06_01.md`
7. `/app/memory/memory/change_requests/impact_analysis/CR_011_BACKEND_COORDINATION_NOTE_2026_06_01.md`
8. `/app/memory/PRD.md`
9. `/app/memory/test_credentials.md`

Do NOT start coding until the protocol is internalized.

---

## 1. Where things stand (CR-011 Phase 1 — COMPLETE + Code Gate 1 PASSED + Post-Gate Revisions)

| Screen | Status | Notes |
|---|---|---|
| S0 Landing Dashboard | ✅ FROZEN 2026-06-02 v2 | 9 tiles wired. Cancel_at attribution (Option A). Payment Mix total badge. Audit actor names. Date param navigation. |
| S1 Module Shell + Sidebar | ✅ FROZEN 2026-06-01 | — |
| S2 Item Sales | ✅ FROZEN 2026-06-02 v2 | 5-tab, cancel_at attribution, Apply button, URL param date reading |
| S3 Side-sheet Drill Template | ✅ FROZEN 2026-06-01 | Drill data, cancel reason_type lookup, Item/Order scope tags |
| S4 Edge States | ✅ FROZEN 2026-06-01 | First-load splash, re-fetch ghost, error banner, empty result |

**Phase 1 progress: 5/5 screens ✅ FROZEN. Code Gate 1 PASSED. Post-gate revisions shipped. Phase 2 is NEXT.**

---

## 2. What shipped this session (code changes 2026-06-02)

### New files
- None (all edits to existing files)

### Modified files

**`/app/frontend/src/api/services/insightsService.js`**
- NEW: `getDashboardAggregated(fromDate, toDate)` — single `/order-logs-report` fetch, derives all 9 dashboard tiles
- Tiles computed: sales (sparkline), channel mix (with revenue), top items, payment mix (with revenue), cancellations (order + item level), discounts (direct/coupon/loyalty/comp), audit (make_unpaid/payment_method_change from operations[]), kitchen throughput, customer mix
- `loyalty_info` JSON parsed for `loyalty_discount` field
- `complementary_price` used for comp item valuation (also fixed in `getItemSalesAggregated` menuPrice fallback)
- TAB unsettled uses `f_order_status !== '6'` (not unreliable `payment_status`)
- Channel counts moved outside the `!isCancelled` block to count non-cancelled orders only

**`/app/frontend/src/pages/reports-module/DashboardMockup.jsx`** (full rewrite)
- 9 tiles wired to live API via `useReportFetch` + `ReportLoadingShield`
- Apply button pattern: draft dates (fromDate/toDate) vs applied dates (appliedFrom/appliedTo)
- Presets (Today/7D/30D/MTD) apply immediately; FY visible but disabled
- 2-month max range: red border + "Max 2 months" label when exceeded, Apply button disabled
- Channel Mix shows revenue per channel
- Payment Mix shows revenue per method (no unsettled TAB badge)
- Cancellations: order-level + item-level + sum + top reason
- Discounts & Offers: direct/coupon/loyalty/comp with total headline
- Post-Settle Edits: make_unpaid + payment_method_change + flagged order IDs
- Layout: Row 1 (3x2 grid: Sales/Channels/Items + Payments/Cancellations/Discounts), Row 2 (3-col: Audit/Kitchen/Customers)

**`/app/frontend/src/pages/reports-module/ItemSalesMockup.jsx`**
- Apply button pattern retrofitted (same as S0)
- Draft vs applied dates, `canApply` gate, `draftRangeExceeded` check
- 2-month max range enforced
- FY preset visible but disabled
- `Check` icon import added

**`/app/frontend/src/components/reports/useReportFetch.js`**
- No changes this session (already built)

**`/app/frontend/src/components/reports/ReportLoadingShield.jsx`**
- No changes this session (already built)

### Docs updated
- `CR_011_SCREEN_FREEZE_LOG.md` — S0 → ✅ FROZEN with full details
- `CONTROL_DASHBOARD.md` — Phase 1 COMPLETE, all 5 screens FROZEN
- `SPRINT_STATUS.md` — CR-011 Phase 1 COMPLETE, next = Code Gate 1
- `CR_011_LOADING_AND_INTERACTION_SPEC.md` — **REVISED**: §1.2 Apply button, §1.5 2-month max, §2 new controls, §3 primitives built, §5 new checklist items, §7 timing updated, §9 data mapping addendum
- `PRD.md` — full rewrite

---

## 3. Owner-facing decisions made this session (binding)

1. **S0 API wiring approved** — owner reviewed tile-by-tile plan before coding.
2. **Channel Mix must show revenue** per channel (not just order counts).
3. **Payment Mix must show revenue** per method (not just percentages).
4. **Unsettled TAB badge removed** — `payment_status` is unreliable; `f_order_status` is the truth.
5. **Cancellations show order-level + item-level + sum** — not just one type.
6. **Apply button for dates** (owner-mandated) — dates don't auto-fetch. Presets still auto-apply. Common across ALL screens.
7. **2-month max range** — backend times out beyond ~3 months. Calendar enforces 62-day max.
8. **FY preset visible but disabled** — stays in UI for future enablement.
9. **Audit tile = Post-Settle Edits** — `make_unpaid` + `payment_method_change` from operations[]. NOT re-prints or generic edits (don't exist in data).
10. **Discounts tile** — 4 sub-cards: direct (`restaurant_discount_amount`), coupon (`coupon_discount_amount`), loyalty (`loyalty_info.loyalty_discount`), comp items (`complementary_price`). Total headline like cancellations.
11. **`complementary_price`** is the correct field for comp item valuation (not `unit_price` or `food_details.price` — both are 0).
12. **`loyalty_info.loyalty_discount`** is the correct field for loyalty discount (parsed from JSON string).
13. **Customer Mix** — identified = `user_id` non-null; repeat = >1 order in range; walk-in = no `user_id`. `cust_mobile` unreliable (string "None").
14. **Layout order** — Row 2: Audit first, then Kitchen, then Customer Mix.
15. **"don't code/edit without taking approval"** — still binding.
16. **Cancellation attribution = cancel_at always** (owner-mandated 2026-06-02). Dashboard makes second API call with `created_at` sort. Item-level cancels filter by `cancel_at` in range. Item-level ONLY from non-cancelled orders (no double-counting with order-level). Order-level `cancel_at` is always NULL in API; uses item-level `cancel_at` as proxy.
17. **Payment Mix total = sum** (owner-mandated 2026-06-02). Shows sum of all payment revenues so owner can spot if anything is missing vs Net Sales.
18. **Audit tile shows WHO** (owner-mandated 2026-06-02). `vendor_employee_name` + `previous_payment_method` → `current_payment_method` for each flagged order.
19. **Date filters persist across navigation** (owner-mandated 2026-06-02). Dashboard tile clicks pass `?from=&to=` URL params to Item Sales. Item Sales reads on mount.

---

## 4. Immediate next steps (priority order)

### 🟢 DONE — Code Gate 1 + Post-Gate Revisions (Phase 1 complete)
- Code Gate 1 PASSED (0 code changes, all screens §5 compliant).
- Post-gate: cancel_at attribution (Option A), double-count fix, Payment Mix total, audit actor names, date persistence. All owner-validated.
- S0 + S2 re-frozen 2026-06-02 v2.

### 🔴 P0 — Phase 2 Screens (S5–S10)
- S5 Item Sales Hybrid (5 tabs + Combined Export)
- S6 Order Ledger Hybrid
- S7 Payment Mix
- S8 Cancellation Report
- S9 Order Activity Log
- S10 Prep & Serve Time

### 🟡 P1 — Known data issues (deferred, not blocking)
- Cancelled revenue: Dashboard item-level (individual items from non-cancelled orders) differs from Item Sales Cancelled tab (all cancelled items grouped by food_id). By design — different scopes.

---

## 5. Blocked / parked (no schedule impact today)

| Item | Blocker | Effect |
|---|---|---|
| BE-1 | Split-payment array on `/order-logs-report` | Payment Mix + Cashier Settlement accuracy on partial orders |
| BE-3 | Category grouping in product master | Item Sales category roll-ups |
| BE events | create/cancel/ready/serve emission | A-1 Activity Log report |
| Loyalty in order-logs | `loyalty_info` exists but only on restaurants with CRM enabled | Kunafa Mahal has it; others show `{"enabled": false}` |

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
8. **Apply button is mandatory** on all report screens — no auto-fetch on date change.
9. **2-month max range (62 days)** enforced on all screens.
10. **`complementary_price`** for comp items, **`loyalty_info.loyalty_discount`** for loyalty — do not use alternatives.
11. **`f_order_status`** for payment settlement status, **NOT `payment_status`** (unreliable).
12. **Cancellation attribution = `cancel_at` always** (owner-mandated 2026-06-02). Dashboard uses Option A (second API call with `created_at` sort, filter by `cancel_at`). Item-level only from non-cancelled orders. Order-level uses item `cancel_at` as proxy.
13. **Order-level `cancel_at` is always NULL in API.** Do not rely on `orders_table.cancel_at`.
14. **Payment Mix tile must show total sum** of all payment method revenues.
15. **Audit tile must show actor name** (`vendor_employee_name`) and method change detail (`previous_payment_method` → `current_payment_method`).
16. **Date filters must persist** when navigating from Dashboard to Item Sales via URL query params.

---

## 8. Reference — Backend reality

### `/order-logs-report`
```
POST https://preprod.mygenie.online/api/v2/vendoremployee/report/order-logs-report
Body: { "sort_by": "collect_bill" | "created_at", "from_date": "YYYY-MM-DD", "to_date": "YYYY-MM-DD" }
```
- Max practical range: ~2 months (3 months = 32s, 6+ months = timeout)
- Dashboard makes **TWO calls**: `collect_bill` (sales/payments/channels) + `created_at` (cancellations filtered by `cancel_at`)
- `cancel_at` rejected by backend as sort_by — client-side filter in `insightsService.js`
- `food_status='3'` = cancelled. `'5'` = served. `'2'` = ready. `'1'` = preparing
- `operations[]` contains: `order_bill_payment`, `make_unpaid`, `payment_method_change`, `order_shifted_room`, `split_order_in/out`
- `operations[].vendor_employee_name` = who performed the operation
- `operations[].previous_payment_method` / `current_payment_method` = before/after for payment changes
- `orders_table.cancel_at` is **always NULL** even for cancelled orders. Only `order_details_table[].cancel_at` is populated.

### `/cancellation-reasons`
```
GET https://preprod.mygenie.online/api/v1/vendoremployee/cancellation-reasons?limit=100&offset=1
```

---

## 9. Last owner messages (verbatim, this session)

1. *"yes correct"* → confirmed S0 API wiring plan
2. *"looks fine go ahead"* → approved tile-by-tile implementation
3. *"actual numbers not showing in channel mix, check and fix"* → triggered channel/payment revenue display
4. *"Don't show this badge"* → removed unsettled TAB badge
5. *"we don't need post bill print... here we need orders which were edited post settle"* → triggered audit tile rework with operations data
6. *"explict apply button for dates"* → mandated Apply button pattern
7. *"keep only 2 months data... disable 3 monthly tab"* → 62-day max + FY disabled
8. *"also need total in discount card like we have in cancel"* → added total headline to discounts tile
9. *"complementary_price... what about loyalty"* → discovered correct fields for both
10. *"we can now freeze this screen and update docs"* → S0 frozen, all docs updated
11. *"is doc up to date for gate code"* → triggered Loading Spec revision (5 gaps + data mapping addendum)
12. *"update handover doc"* → this document

---

## 10. Pending owner question

**None.** Phase 1 is complete. Next action: **Code Gate 1** — agent should propose the S1/S3/S4 retrofit plan and ask owner for approval before coding.

---

*This handover supersedes `NEXT_AGENT_HANDOVER_2026_06_01_CR_011_S3.md`. It is the single source of truth for the next agent starting in this context.*
