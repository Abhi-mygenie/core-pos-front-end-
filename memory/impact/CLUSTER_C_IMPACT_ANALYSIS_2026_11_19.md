# Impact Analysis (Gate 2) — Cluster C: Order Report Beta — 2026-11-19

> **GATE-2 VALIDATED 2026-11-20** (re-checked against current code; BUG-735 SHIPPED and removed from active scope; line anchors shifted +1/+2 after BUG-733 landed in this file). Registry advanced 724/725/726/727/737 → Gate 3; BUG-728 → Gate 2 (OD-728-01 open). Gate-3 plan: `plans/CLUSTER_C_IMPLEMENTATION_PLAN_2026_11_20.md`.

**Role:** PLANNING (Gate 2) · **Sprint:** nov_cr_batch · **Client:** ALL
**Items:** BUG-724, BUG-725, BUG-726, BUG-727, BUG-728, BUG-735, BUG-737
**Priority:** P0 (owner flat-override) · **Native sev:** 724=P1, 735=P2, 725/726/728=P2, 727/737=P3 · **Risk:** LOW/MEDIUM

---

## Header — mandatory checks

**Code Reality: FULL.** All 7 are defects inside shipped code (`OrderReportBetaPage` = CR-117 + layers CR-165/349/423/431/503/515; `AllOrdersReportPage` = CR-003 diagnostic). Fix-forward, not greenfield.

**Target files**
- `src/pages/reports-module/OrderReportBetaPage.jsx` (934 lines) → BUG-724/725/726/727/728/735
- `src/pages/AllOrdersReportPage.jsx` → BUG-737 (isolated, different file)

**Conflict Pre-Check**
- **BUG-733 (Cluster G, native date → shadcn calendar)** edits the native `<input type="date">` at `OrderReportBetaPage` L553/556 — the SAME file as Cluster C, and also the Credit page. `components/ui/calendar.jsx` exists. **Resolution:** one IA owns the date-picker swap (Cluster G or a shared task); Cluster C does NOT touch L553/556. Line-ranges disjoint from C's edits, but if BUG-733 is implemented against this file it must share the session.
- **BUG-735 relates to BUG-671** (P0/HIGH financial, "cannot mark partial-payment orders unpaid", still at GATE_1). BUG-735 here is only the *display-gating* (hide Change/Unpaid on split rows); the deeper payment-reversal fix is BUG-671's. Gating logic must stay consistent with BUG-671's eventual resolution. BUG-735 also has a Credit-page facet (`Reports/Credit`) — this IA covers the Order-Beta facet; confirm whether the Credit page shows the same buttons.
- BUG-737 is in a different file → no conflict.
- No other OPEN sprint item holds these files.

---

## Per-item impact (root cause verified in code)

| ID | Sev | File:Line | Root cause | Fix direction | Blast radius |
|----|-----|-----------|-----------|---------------|--------------|
| **BUG-724** | P1 | OrderReportBeta `fetchData` L308 / effect L438 / summary L628 | `fetchData` has **no AbortController / no request-sequence guard**. Rapid Apply or mount→range-change lets an older response overwrite a newer one. The summary bar (`{totalFilteredOrders} orders`, L628) and KPI strip render **outside** the `isLoading` gate, so they show "0 orders / 0" until data lands → the "0 orders" flash. | Add a sequence/abort guard in `fetchData` (ignore stale responses); optionally hide/skeleton the summary+KPIs while `isLoading && !data`. | Table correctness under fast re-query; cosmetic flash. |
| **BUG-725** | P2 | OrderReportBeta `getPaymentBadge` L36-48 | Badge map covers cash/pending/cancel/tab/aggregator/payment_gateway/partial/cash_on_delivery only. **upi, card, room, etc. fall through** to `{ label: pm }` → raw lowercase ("upi", "card"). | Add missing method→label mappings (UPI/Card/Room/…) and/or Title-Case the fallback label. | Payment column display only. |
| **BUG-726** | P2 | OrderReportBeta row L745-749 | Cancelled rows render an **extra `<td>`** (`row.cancellation_reason && <td colSpan={1}>`) inserted between Status and Actions → **13 cells vs 12 `<th>`** (non-reconcile), shifting the Actions column. No matching header column. | Remove the stray `<td>` and surface the cancel reason without breaking the grid (e.g. inline under the Status/Order cell, a tooltip, or a full-width `colSpan` sub-row). Keep column count = header count on every row. | Cancelled-row layout; applies in All/Cancelled tabs. |
| **BUG-727** | P3 | OrderReportBeta L704 | `` <th …>Actions</th> {/* CR-349 */}`` — the space before the comment is a **whitespace text node directly inside `<tr>`** → React console warning. | Remove the leading space / relocate the comment so no text node is a child of `<tr>`. | Console noise only. |
| **BUG-728** | P2 | OrderReportBeta KPI L605 vs tab filter L125-128; day header L678-680 | **(a)** `Cancelled` KPI = `stats.cancelOrders` from backend `order_stats` (whole range, backend's cancel definition) while the **Cancelled tab rows** are client-filtered by `payment_method ∈ {cancel,cancelled}` → counts diverge (41 vs 25). **(b)** Day-header Revenue/Sales/Discount use **whole-day backend totals** (`day.paid_revenue/total_sales/total_discount`), not the active-tab filtered subset, so on a filtered tab the header totals don't match the visible rows. (Day `Total` already uses filtered `dayAmount`.) | **Owner-gated** — decide whether KPI should mirror the tab rows or stay a fixed whole-range metric (then relabel), and whether day-header $ should follow the filtered subset. Likely: relabel KPI as whole-range + make day-header $ reflect filtered rows, OR document as by-design. | Counts/labels only; no money mutation. |
| **BUG-735** | P2 | OrderReportBeta Change L754 / Unpaid L764 | Change-Method & Mark-Unpaid show when `f_order_status===6 && !razorpay_order_id` (+ permission). **No exclusion for split/partial rows** (`payment_method_raw === 'partial'`), so they appear on split-settled orders where the action is invalid (the BUG-671 failure surface). | Add `payment_method_raw !== 'partial'` (and any split markers) to both gates to hide/disable on split rows. Align with BUG-671's resolution before claiming the financial path fixed. | Hides 2 action buttons on split rows; must match Credit-page behaviour. |
| **BUG-737** | P3 | AllOrdersReport L145-155 | Leftover **CR-003 diagnostic** `useEffect` logging user + permissions to console on every mount (`console.log` L147). | Delete the diagnostic `useEffect` block (L141-155) — purpose (confirm Owner has update_payment/order_unpaid on preprod) is served. | Removes console noise; no behaviour change. |

---

## Owner decisions (block Gate-2 sign-off)
1. **BUG-728** — Should the `Cancelled` KPI equal the Cancelled-tab row count, or remain a whole-range backend metric (and just be relabelled)? And should day-header Revenue/Sales/Discount reflect the active tab's filtered rows, or stay whole-day? (Drives whether this is a 1-line relabel or a totals-recompute.)
2. **BUG-735** — Hide vs disable Change/Unpaid on split rows? And confirm this may ship independently of BUG-671 (display-gating only), with the deeper partial-unpaid fix tracked under BUG-671.
3. **BUG-733 ownership** — confirm a single owner/IA for the native-date→shadcn-calendar swap (it spans Order Beta L553/556 + Credit). Cluster C will NOT touch those lines to avoid a double-fix.

## Scope lock
- **WILL change:** `OrderReportBetaPage.jsx` (724/725/726/727/728/735), `AllOrdersReportPage.jsx` (737).
- **WILL NOT touch:** native date inputs L553/556 (BUG-733), `reportService.js`, `OrderDetailSheet.jsx`, `utils/riskTier.js`, backend, the Credit page (unless owner confirms BUG-735 Credit facet here).

## Sequencing within cluster
Independent, parallel-safe edits except BUG-726 (table grid) and BUG-728 (table/KPI) both touch the day table — do them together. Suggested order: 737 (trivial, other file) → 727 → 725 → 724 → 726 → 728 → 735. BUG-724's abort guard should land before 726/728 so QA sees a stable table.

**Next:** Gate 3 Implementation Plan → `plans/CLUSTER_C_IMPLEMENTATION_PLAN_2026_11_19.md` (after owner answers #1–#3).
