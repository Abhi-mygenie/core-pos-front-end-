# QA → Next-Agent Handover (Audit & Documentation Update & Implementation)

Author: Change Request QA Validation Agent
Updated: 2026-04-29 (post product-owner clarification on CR-004 status-filter rule)

Linked QA reports:
- /app/memory/change_requests/qa_reports/CR_001_QA_REPORT.md
- /app/memory/change_requests/qa_reports/CR_003_QA_REPORT.md
- /app/memory/change_requests/qa_reports/CR_004_QA_REPORT.md
- /app/memory/change_requests/qa_reports/QA_REPORT_INDEX.md

---

## Summary of final QA outcome

| CR | QA Status | Next agent |
| --- | --- | --- |
| CR-001 | qa_passed_with_deferred_backend_dependency | Audit / Final Acceptance |
| CR-003 | qa_passed_with_deferred_backend_dependency | Audit / Final Acceptance |
| CR-004 | **qa_failed** (filter-derivation bug) | **Change Request Implementation Agent** (single scoped fix, then QA re-pass) |

---

## Part A — Implementation Agent (CR-004 single fix)

**Ticket description (copy-paste ready):**

> **CR-004 Fix — Status filter derivation.**
> On `/reports/rooms`, the Paid/Unpaid pills currently derive from `roomInfo.balancePayment`. This is wrong per product owner (2026-04-29).
>
> Correct rule: `Paid ⇔ fOrderStatus === 6`; `Unpaid ⇔ fOrderStatus !== 6`. **No `balancePayment` check.**
>
> The filter must apply directly on the day-list row (no dependency on the lazy-resolved detail), so the predicate lives outside the `detailCacheRef` lookup — this also removes the wait-for-detail latency.
>
> Affected file: `/app/frontend/src/pages/RoomOrdersReportPage.jsx` lines 486-498.
> Pill labels (`All` / `Paid` / `Unpaid`) are final — no label changes needed.
> No other files need to change.
>
> Why this is wrong in the shipped code: a room with `fOrderStatus ∈ {3, 9, …}` and `balancePayment === 0` (e.g., mid-stay room with advance deposit fully covering consumption-so-far) is surfaced under **Paid** instead of **Unpaid**.
> Backend guarantees `fOrderStatus === 6 ⟹ balancePayment === 0`, but the reverse is not true — so `balancePayment`-based classification misclassifies the unpaid-but-zero-balance case.
>
> After fix: QA re-validates in ~10 minutes; then partial-accept Phases 4.1 – 4.5 (Phase 4.6 / 4.7 / Phase 2 remain parked pending backend).

---

## Part B — Audit / Final Acceptance Agent

### Can already accept now
- **CR-001 → accept final.** All 7 degraded-data symptoms (P1–P5, P6, G1) are backend-blocked and tracked in `CR_004_BACKEND_EXT_sub_cr.md`; none are frontend failures.
- **CR-003 → accept final.** Single deferred item (backend socket emission after `make-order-unpaid`) is backend-owned; frontend refetch fallback verified.

### Cannot accept yet
- **CR-004 → blocked** on the Implementation Agent fix above. After fix + QA re-pass, accept as **partial-final (Phases 4.1 – 4.5)** with Phase 4.6 / 4.7 / Phase 2 parked pending backend (G2 / G3 / OPT).

### Runtime items NOT testable in this environment (note for audit scope only)
Preprod backend (`preprod.mygenie.online`) is dormant. Deep runtime data validation (Endpoint A/B round-trips, cross-terminal re-surface, `resolvedTick` against real RM + SRM data, non-Owner permission matrix) was deferred to a live-data pass. If audit requires live runtime smoke: wake preprod and use `owner@18march.com` / `Qplazm@10` or `owner@mantri.com` / `Qplazm#10`.

### Backend items to record on the acceptance ledger (NOT failures)
- CR-001 (sub-CR): P1 `waiter_name`, P2 `*_by_name/*_by_id`, P3 `cancel_reason`, P4 `cancel_type`, P5 `table_no`, P6 `room_info`, G1 transferToRoom settlement.
- CR-003: socket emission on `new_order_${restaurantId}` after `make-order-unpaid`.
- CR-004: G2 `/get-room-list` in-house filter, G3 refresh `associated_order_list[].payment_status` post-settlement, OPT inline `latest_order_id` + `room_info` + `check_in_date`; Phase 4.6 (Export), Phase 4.7 (Final smoke), Phase 2 (cross-day view).

---

## Part C — Documentation Update Agent (optional, post-fix)

Call the Documentation Update Agent only **after** the Implementation Agent's CR-004 fix has been re-validated and only if you want the CR-004 handover wording reconciled with the shipped UI.

### Proposed edits to `/app/memory/change_requests/qa_handover/CR_004_QA_HANDOVER.md`
| Handover wording | Change to |
| --- | --- |
| "Simple status filter (`In-house` / `All`)" | "Simple status filter `All` / `Paid` / `Unpaid`. `Paid ⇔ fOrderStatus === 6`; `Unpaid ⇔ fOrderStatus !== 6`. Filter applies on the day-list row — no dependency on the lazy-resolved detail." |
| "Warning badge when RM parent lacks `room_info`" | "When RM parent lacks `room_info`, all four financial cells render `—` placeholders. (Visual badge is optional future polish.)" |
| "SRM-only groups rendered as their own rows when there is no RM parent" | Remove the bullet (day list filters to `orderIn === 'RM'` only; orphan SRMs are anomaly-filtered). |

### Do NOT update
- `/app/memory/final/*` — all baseline architecture / module / open-question / playbook / final-approval docs.
- Any CR doc, impact analysis, implementation plan, or implementation summary.
- QA handover for CR-001 or CR-003 (no wording changes needed there).

---

## Product-owner clarifications still open (non-blocking)

| # | Question | Blocks acceptance? |
| --- | --- | --- |
| 1 | Missing-`room_info` visual — keep shipped `—` placeholders OR add an amber "Room data unavailable" badge | No |

The earlier wording-level question on pill labels is **resolved**: keep `All / Paid / Unpaid`, fix only the derivation logic (covered by the Implementation Agent ticket above).
