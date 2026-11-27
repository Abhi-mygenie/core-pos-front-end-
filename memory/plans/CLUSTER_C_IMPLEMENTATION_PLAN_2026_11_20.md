# Implementation Plan (Gate 3) — Cluster C: Order Report Beta — 2026-11-20

**Role:** PLANNING (Gate 3) · **Sprint:** nov_cr_batch · **Risk:** LOW/MEDIUM · **Code Reality:** FULL (re-validated 2026-11-20)
**Items:** BUG-724 (P0; native P1), BUG-725, BUG-726, BUG-728 (P0; native P2), BUG-727, BUG-737 (P0; native P3). *(BUG-735 was in C's IA and is now SHIPPED — excluded.)*
**IA:** `impact/CLUSTER_C_IMPACT_ANALYSIS_2026_11_19.md` (Gate-2 VALIDATED 2026-11-20; line anchors shifted +1/+2 after BUG-733 landed in the same file).
**Gate status:** BUG-724/725/726/727/737 → **GATE_3 CLOSED** (plan complete), **Gate 4 GO** needed to implement. **BUG-728 → PARKED 2026-11-20 by owner** (OD-728-01 deferred; Gate-3 section below retained for when it resumes).

---

## Target files
- `src/pages/reports-module/OrderReportBetaPage.jsx` (936 lines) → BUG-724/725/726/727/728. **Shared hotspot** (BUG-711/671/735/733 already landed) → one session/PR; edit sites below are line-disjoint.
- `src/pages/AllOrdersReportPage.jsx` → BUG-737 (isolated).

## Scope lock
- **WILL change:** the 6 defects below, nothing else.
- **WILL NOT touch:** date inputs (BUG-733, done), `reportService.js`, `OrderDetailSheet.jsx`, `utils/riskTier.js`, backend, Credit page, the split-row action gating (BUG-735, done), the Grand-Total block.

---

## Edits — exact

### BUG-737 — remove CR-003 diagnostic (`AllOrdersReportPage.jsx`) · P3 · trivial
- **E-737a** Delete L141–154 (the `// CR-003 diagnostic …` comment block + the `useEffect` that `console.log`s user/permissions).
- **E-737b** L132 `const { hasPermission, permissions, user } = useAuth();` → `const { hasPermission, user } = useAuth();` — `permissions` is referenced **only** inside the deleted block (verified), so it must be dropped to avoid an unused-var lint error.
- Verify: no other `permissions` reference remains; page compiles clean; console no longer logs on mount.

### BUG-727 — whitespace text node in `<tr>` (`OrderReportBetaPage.jsx` L705) · P3 · 1 char
- **E-727** `                          <th className="px-3 py-2 text-right">Actions</th> {/* CR-349 */}` → remove the space before the comment: `...Actions</th>{/* CR-349 */}` (matches the L701 `</th>{/* BUG-706 */}` style). Kills the React "whitespace text nodes cannot appear as a child of <tr>" console warning.

### BUG-725 — raw lowercase payment labels (`getPaymentBadge` L37–49) · P2
- **E-725a** Add missing method→label entries to the `map` (after L46 `cash_on_delivery`):
  ```js
  upi:   { label: 'UPI',    cls: 'bg-indigo-100 text-indigo-800' },
  card:  { label: 'Card',   cls: 'bg-sky-100 text-sky-800' },
  room:  { label: 'Room',   cls: 'bg-purple-100 text-purple-800' },
  merge: { label: 'Merged', cls: 'bg-zinc-100 text-zinc-700' },
  ```
- **E-725b** Title-Case the fallback so any future unmapped method is never shown raw-lowercase:
  L48 `return map[pm?.toLowerCase()] || { label: pm || '—', cls: ... };`
  → `const key = pm?.toLowerCase(); return map[key] || { label: pm ? pm.charAt(0).toUpperCase() + pm.slice(1) : '—', cls: 'bg-zinc-100 text-zinc-600' };`
- Verify: Payment column shows "UPI/Card/Room/Merged"; unknown method renders Title-Cased, never raw lowercase. Display-only; no filter/logic change.

### BUG-726 — cancelled-row cell-count mismatch (`OrderReportBetaPage.jsx` L744–750) · P2
Root cause: cancelled rows inject an extra `<td>` (L746–750) between Status (L744) and Actions (L752) with **no matching `<th>`** → 13 cells vs header count → Actions column shifts.
- **E-726** Remove the standalone `<td>` block (L746–750) and fold the cancel reason **inside the existing Status `<td>`** (L744) as a sub-line, so every row keeps exactly header-count cells:
  ```jsx
  <td className="px-3 py-2">
    <Pill label={status.label} cls={status.cls} />
    {row.cancellation_reason && (
      <div className="text-[10px] text-red-600 mt-0.5 max-w-[160px] whitespace-normal" data-testid={`cancel-reason-${row.order_id}`}>
        {row.cancellation_reason}{row.cancellation_note ? ` — ${row.cancellation_note}` : ''}{row.canceled_by_name ? ` (${row.canceled_by_name})` : ''}
      </div>
    )}
  </td>
  ```
  (Preserves the `cancel-reason-<id>` testid; keeps the reason visible under Status without a phantom column.)
- Verify: on the Cancelled/All tabs, every row has the same cell count as the header; Actions column aligns; reason text appears under the Status pill. Check @1366 + @390.

### BUG-724 — stale-response overwrite + "0 orders" flash (`OrderReportBetaPage.jsx`) · P1
Root cause: `fetchData` (L309) has no request-sequence guard and is triggered by 4 effects (L349/365/421/440) incl. mount + every `appliedFrom/appliedTo` change → a slower older response can overwrite a newer one. Separately, the KPI strip (L602–607) and the summary span (L629–630) render outside the `isLoading` gate → they show `0 orders / ₹0` until data lands.
- **E-724a** Import `useRef`: L4 `import React, { useState, useEffect, useMemo, useCallback } from 'react';` → add `useRef`.
- **E-724b** Add a sequence ref near the other refs (after the loading/data state ~L297): `const fetchSeqRef = useRef(0);`
- **E-724c** Guard `fetchData` (L309–328) so only the latest call commits state:
  ```js
  const fetchData = useCallback(async (from, to) => {
    const seq = ++fetchSeqRef.current;                 // BUG-724
    setIsLoading(true); setError(null); setFetchProgress(null);
    try {
      const result = await getOrderReportBetaCombined(from, to, (c, t) => {
        if (seq === fetchSeqRef.current && t > 1) setFetchProgress({ current: c, total: t });
      });
      if (seq !== fetchSeqRef.current) return;          // BUG-724: stale → drop
      setData(result);
      setExpandedDays(new Set((result.daily_reports || []).map(d => d.date)));
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;          // BUG-724
      console.error('[CR-117] Fetch failed:', err);
      setError(err?.message || 'Failed to load report');
    } finally {
      if (seq === fetchSeqRef.current) { setIsLoading(false); setFetchProgress(null); }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  ```
- **E-724d** Kill the "0" flash — don't render metric numbers until the first payload exists. Add `const showMetrics = !!data;` and:
  - KPI strip values (L603–606): `value={showMetrics ? (stats.x || 0) : '—'}` for each of the 4 cards.
  - Summary (L629–630): render the `{totalFilteredOrders} orders` / amount only `{showMetrics && (...)}` (or dashes) while the first load is in flight.
- Verify: rapid Apply / range-change never shows an older result (manually trigger two quick ranges); no `0 orders / ₹0` flash on initial load; a genuine empty range still shows the existing empty-state (L651). **This should land before 726/728 so QA sees a stable table (per IA sequencing).**

### BUG-728 — Cancelled KPI vs tab rows; day-header totals vs filtered subset · P2 · **PARKED 2026-11-20 (owner)**
> **PARKED:** owner deferred this item on 2026-11-20 (OD-728-01 left open). The analysis + provisional edits below are retained verbatim for when it resumes; do NOT implement until un-parked and OD-728-01 answered.
Two facets, both counts/labels only (no money mutation):
- **(a)** KPI `Cancelled` (L606 `stats.cancelOrders`, backend whole-range) ≠ Cancelled-tab visible rows (client-filtered by `payment_method ∈ {cancel,cancelled}`, L126–128) → e.g. 41 vs 25.
- **(b)** Day-header Revenue/Sales/Discount (L679–681) use whole-day backend aggregates (`day.paid_revenue/total_sales/total_discount`), not the active tab's filtered rows — so on a filtered tab the header $ doesn't match the visible rows (the day `Total`, L682, already uses the filtered `dayAmount`).

**OD-728-01 (blocks Gate 4 for this item):**
- **(A) RECOMMENDED** — KPIs stay authoritative **whole-range** backend metrics (consistent with the other 3 KPIs, which are also range-level, not tab-scoped); make the **day-header $ reflect the active tab's filtered rows** so header totals match what's on screen. If needed, add a small "(range)" qualifier / tooltip to the Cancelled KPI to kill the mismatch complaint.
- **(B)** Make the Cancelled KPI mirror the active-tab row count (tab-scoped KPI). Changes KPI semantics for all tabs.
- **(C)** Declare by-design; only relabel (KPI = "range", header = "whole day") with no total recompute.

**Feasibility note (must check before coding A/B's (b)):** filtered day-header Revenue/Sales/Discount can only be *summed from rows* if each `row` carries per-row revenue/sales/discount fields. Rows expose `order_amount_raw` (used by `dayAmount`) but per-row `paid_revenue`/`total_sales`/`total_discount` are **not confirmed present**. If absent, facet (b) collapses to option (C) relabel (cannot recompute). **Action: verify row fields during IMPL; if missing, (b) = relabel only.**

Provisional edits (for OD-728-01=A, pending the field check):
- (b) Replace L679–681 `fmtINR(day.paid_revenue/total_sales/total_discount)` with sums over `dayOrders` (mirroring the L663 `dayAmount` pattern) **iff** the row fields exist; else relabel the header group as "Day (all)".
- (a) Keep KPI value; append "(range)" to the `Cancelled` KPI label at L606, or add a tooltip.

---

## Verification Matrix (seeds QA)
| # | Item | Verify | Auto? |
|---|------|--------|:---:|
| 1 | 737 | No console log on AllOrders mount; `permissions` removed; compiles clean | NO (browser/console) |
| 2 | 727 | React `<tr>` whitespace warning gone from console | NO (browser/console) |
| 3 | 725 | Payment column: UPI/Card/Room/Merged; unknown → Title-Cased, never raw-lowercase | unit (getPaymentBadge) |
| 4 | 726 | Cancelled rows: cell count == header count; Actions aligned; reason under Status; @1366+@390 | NO (browser) |
| 5 | 724 | Two rapid range changes → newest result wins (no stale overwrite) | NO (browser, throttle) |
| 6 | 724 | No `0 orders / ₹0` flash on first load; empty range still shows empty-state | NO (browser) |
| 7 | 728 | (pending OD) header $ matches visible rows on a filtered tab; KPI label unambiguous | NO (browser) |
| 8 | regression | Apply still fetches range; export Excel/PDF unaffected; other tabs unchanged | NO (browser) |

Suggested unit test: `getPaymentBadge` mapping + Title-Case fallback (BUG-725) — pure function, jest-able.

## Sequencing (single OrderBeta session/PR) + other file
737 (other file, independent) → 727 → 725 → **724** (abort+flash; land before table bugs) → 726 → 728 (only after OD-728-01 + field check). BUG-724 adds the `useRef` import.

## Post-Code Registry Checklist (IMPL agent)
- [ ] registry.json: each shipped item → `GATE_5A_IMPLEMENTED`, `current_gate: 5`.
- [ ] BUG_TRACKER.md CURRENT line + rows updated.
- [ ] FILE_OWNERSHIP.md: `OrderReportBetaPage.jsx` (724/725/726/727[/728]) + `AllOrdersReportPage.jsx` (737) with `// BUG-xxx` markers.
- [ ] Code markers `// BUG-724/725/726/727/737` at each edit site.
- [ ] webpack 0 new warnings; getPaymentBadge unit test green.

## Handover
**Gate 3 CLOSED for Cluster C** — BUG-724/725/726/727/737 are GO-ready pending **Gate 4 GO** (implement in the single locked OrderBeta session; AllOrders/737 isolated). **BUG-728 is PARKED (owner, 2026-11-20)** — excluded from the implementation batch; resume needs un-park + OD-728-01. Edit sites are line-disjoint from the already-shipped 711/671/735/733.
