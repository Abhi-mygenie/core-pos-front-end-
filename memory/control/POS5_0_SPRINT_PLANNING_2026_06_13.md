# POS 5.0 — Sprint Planning

**Created:** 2026-06-13
**Status:** PLANNING
**Predecessor:** POS 4.0 (FROZEN 2026-06-13, 43 items shipped)

---

## Sprint Goal

Ship high-impact deferred items from POS 4.0. Unblock backend-dependent work via formal handoff. Merge ready code from menu-bug branch.

---

## Priority Order

### P0 — Critical (Money / Order Loss)

| # | ID | Title | Type | Effort | Blocker |
|---|-----|-------|------|--------|---------|
| 1 | **BUG-123** | 401 silent redirect — cashier loses order, thinks it's placed | Bug | MEDIUM | None — FE fix |
| 2 | **CR-028** | Item-level discount — payload hardcoded '0.00', `give_discount` flag ignored | CR (money) | LARGE | OD-1…OD-5 (owner must answer before code) |

### P1 — High

| # | ID | Title | Type | Effort | Blocker |
|---|-----|-------|------|--------|---------|
| 3 | **CR-036** | Bulk Editor — Add Item top-pinned row | CR | DONE (merge) | Merge menu-bug branch |
| 4 | **CR-036-FU-01** | Validation UX — specific toast + red border + focus | CR | DONE (merge) | Merge menu-bug branch |
| 5 | **CR-036-FU-02** | Column reorder + Sold By (Unit) promotion | CR | DONE (merge) | Merge menu-bug branch |
| 6 | **CR-036-FU-03** | Tax-required validation + backdrop loader + data-loss guard | CR | DONE (merge) | Merge menu-bug branch |
| 7 | **CR-029-QSR** | QSR payload parity + round_up persistence | CR | DONE (merge) | Merge menu-bug branch |
| 8 | **BUG-130** | Channel visibility — settings not reflected in POS dashboard | Bug | MEDIUM | Investigation first, likely backend |
| 9 | **BUG-118** | Coupon codes — nth-item and BOGO not working | Bug | MEDIUM | FE investigation needed |

### P2 — Medium

| # | ID | Title | Type | Effort | Blocker |
|---|-----|-------|------|--------|---------|
| 10 | **CR-027** | Unified Toast & Error Surfacing — 168 calls / 28 files / 3 phases | CR | LARGE | OD-2 (TOAST_LIMIT) + OD-5 (bootstrap policy) parked |
| 11 | **CR-043** | Credit per-customer totals in reports + portfolio optimization | CR | MEDIUM | Gate 1 only — needs planning |
| 12 | **CR-041** | Navigation consistency — implement owner decisions D-1/D-2/D-3 | CR | SMALL | Owner answers D-1/D-2/D-3 |

### Backend Handoff (unblocks future sprints)

| # | ID | Title | Action |
|---|-----|-------|--------|
| 13 | **BUG-124** | Socket payload incomplete (`food_update_${rid}`) | Backend enriches payload. FE defended. |
| 14 | **BUG-129** | TAB status=6 stamped before collection | Backend fix. Brief sent. |
| 15 | **BUG-090** | CRM customer_id not stored on room orders | Backend ships acceptance. Q-090-B-1. |
| 16 | **BUG-091** | CRM search API duplicates | CRM team dedup. |
| 17 | **BUG-092** | Phone format contract undefined | Backend clarifies +91 vs raw 10. Q-092-1. |
| 18 | **BUG-093** | Room check-in date missing in API | Backend adds field. |
| 19 | **BUG-094** | Delivery socket missing payload | Backend adds payload. Q-094-1. |
| 20 | **BUG-101** | Print template no delivery_charge_gst slot | Backend adds template slot. Q-101-1. |
| 21 | **BUG-096** | Realtime FE updates for menu — socket event names unknown | Backend confirms BQ-CR-01/02/03. |
| 22 | **BUG-106** | CRM Notes API | CRM team. CQ-CR-01/02. |
| 23 | **BUG-107** | CRM Insights API | CRM team. CQ-CR-03/04. |
| 24 | **BUG-108** | CRM Coupon/Loyalty/Wallet — P1 backend defect open | Backend fixes loyalty_idempotency_key=null. |
| 25 | **BUG-104** | Credit/Tab Management — full scope needed | Owner scope session. |
| 26 | **BUG-105** | Settlement module — full scope needed | Owner scope session. |

### Carried (low priority / stalled)

| # | ID | Title | Status |
|---|-----|-------|--------|
| 27 | **BUG-095** | Socket handler + dead code cleanup | Planning complete, not prioritized |
| 28 | **BUG-097 residual** | CartPanel Collect Bill gate | PARKED — owner Options A/B/C/D |
| 29 | **BUG-097 Bucket-5** | Rider socket events | Backend-blocked |
| 30 | **BUG-125-B** | Food Type not persisting on Edit | Planning complete on discount-menu branch |
| 31 | **POS2-001** | Delivery charge / GST / web delivery lock | Possibly absorbed |
| 32 | **POS2-006** | confirmOrderTone investigation | Deferred |

---

## Owner Decisions Required Before Sprint Start

| ID | Question | Blocks | **Owner Answer (2026-06-13)** |
|----|----------|--------|------|
| **OD-1** | Does POS menu API return `give_discount`? | CR-028 | **YES** — FE maps in `productTransform.js` |
| **OD-2** | Does backend store per-item `discount_amount`? | CR-028 | **YES** — FE sends real distributed amount |
| **OD-3** | Proportional or equal discount distribution? | CR-028 | **PROPORTIONAL** (by item price) |
| **OD-4** | `give_discount='No'` items — hidden or excluded? | CR-028 | **EXCLUDED FROM CALCULATION** (visible but not discounted) |
| **OD-5** | Cashier can override `give_discount` at billing? | CR-028 | **NO** — menu-level flag is final |
| **D-1** | Panels vs routes direction | CR-041 | **A — Routes everywhere** (Credit/Settlement/Menu become standalone pages) |
| **D-2** | Remove Menu Mgmt dead sidebar children? | CR-041 | **NOT VISIBLE IN UI** — owner doesn't see them (may already be hidden or non-functional) |
| **D-3** | Remove hidden dead items from sidebar code? | CR-041 | **RENDER AND SHOW ALL** — owner will decide final navigation bar |

**All decisions locked 2026-06-13. CR-028 and CR-041 are UNBLOCKED for planning/implementation.**

---

## Suggested Sprint Phases

### Phase 1 — Quick Wins (1-2 days)
- Merge menu-bug branch (CR-036 family + CR-029-QSR) — code already written + tested
- Send backend brief to backend team (unblocks 13 items)

### Phase 2 — Critical Fixes (3-5 days)
- BUG-123: 401 silent redirect fix
- BUG-130: Channel visibility investigation + fix
- BUG-118: Coupon code investigation + fix

### Phase 3 — Feature Work (5-7 days)
- CR-028: Item-level discount (after owner answers OD-1…OD-5)
- CR-043: Credit per-customer totals (planning + implementation)

### Phase 4 — Mechanical Cleanup (3-5 days)
- CR-027: Unified Toast (Phase 1: interceptor → Phase 2: mechanical → Phase 3: BulkEditor)
- CR-041: Navigation consistency (after owner D-1/D-2/D-3)

---

## Backend Brief Handoff Document

**File:** `memory/control/BACKEND_BRIEF_FINAL_2026_06_11.md`

Send to backend team with:
1. 13 backend-blocked items with question IDs
2. Waiter cash transfer API (CR-015 — 404)
3. Cancelled financials revert (P0 — tax/discount/SC/delivery not zeroed on cancellation)
4. Split order stale headers (P0)
5. Order edit catalog-rate recompute (P1)
6. Add-on pricing inconsistency (P1)

**Expected outcome:** Backend ships fixes → FE items auto-unblock → pick up in POS 5.0 or 5.1.

---

## Success Criteria

| Metric | Target |
|--------|--------|
| P0 items shipped | 2/2 (BUG-123 + CR-028) |
| Menu-bug branch merged | 5/5 items |
| Backend brief sent | ✅ |
| Backend items unblocked | ≥3 (from backend team response) |
| CR-027 Phase 1 shipped | Interceptor live |
| Owner decisions collected | OD-1…5 + D-1/2/3 answered |

---

*POS 5.0 Sprint Planning — 2026-06-13. "Read before you write. Understand before you change. Verify before you ship."*
