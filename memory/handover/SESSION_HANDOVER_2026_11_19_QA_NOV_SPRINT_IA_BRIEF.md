# SESSION HANDOVER — Gate 2 IMPACT ANALYSIS brief — QA Nov Sprint + Cancellation gaps — 2026-11-19

**For:** the next agent running **ROLE: PLANNING → Gate 2 (Impact Analysis)**.
**State:** 28 items registered at `GATE_1_INTAKE`, **all forced P0 by owner**, release **2026-11-17**, sprint `nov_cr_batch`, assignee Abhishek (backend-blocked ones noted). Registry total **1176**. On `main @ ab54b52` (pushed). **No app code pending** — the 5 cancellation-batch fixes (BUG-708/713 + CR-554/555/556) are already implemented & merged; the items below are *new* defects/CRs on top of that.
**Read first:** `change_requests/MERGE_QA_NOV_SPRINT_2026_11_19.md`, `change_requests/BATCH_INTAKE_2026_11_19_CANCELLATION_QA_GAPS.md`, and the QA report `test_reports/iteration_8.json` (cancellation) + bundle raw `iteration_8/9/10.json` (nov sprint).

> ⚠️ Priority is uniformly P0 (owner override) — **do NOT use priority to sequence IA.** Use **RISK + file-cluster + dependency** instead (guidance below). Risk fields were left truthful (CRITICAL/HIGH/MEDIUM/LOW).

---

## The 28 items (grouped by component cluster — this is how to batch the IA)

### Cluster A — Permissions & Access  ·  RISK: CRITICAL/HIGH  ·  files: `App.js`, `components/guards/PermissionRoute.jsx`, `ChannelColumn`/`TableCard`
- **BUG-720** (risk CRITICAL) — route bypass: low-rights user deep-links `/settings,/menu,/employees,/inventory-*,/pms/*`; `/employees` exposes PII + editable password/role. `App.js` uses `ProtectedRoute` not `PermissionRoute`.
- **BUG-721** (risk HIGH) — Dashboard Print-KOT / YTC-Cancel buttons not permission-gated (`ChannelColumn` doesn't pass `canPrintBill/canCancelOrder` to `TableCard`). Related: BUG-711, CR-515 (both implemented — reuse their permission keys).

### Cluster B — Cancellation Reports  ·  RISK: LOW/MEDIUM  ·  files: `CancellationsMockup.jsx`, `CancelDetailMockup.jsx`, `utils/riskTier.js`  ← **we just edited these**
- **BUG-714** scope filter persists across tabs · **BUG-715** punch-time timezone (both screens) · **BUG-716** detail empty-state · **BUG-717** detail polish · **BUG-718** export raw ISO · **BUG-729** Daily-Trend x-axis clipped + empty Loss chart.

### Cluster C — Order Report Beta  ·  RISK: LOW/MEDIUM  ·  files: `AllOrdersReportPage.jsx` / `OrderReportBetaPage`
- **BUG-724** double-load/no abort → "0 orders" flash · **BUG-725** raw payment labels · **BUG-726** cancelled-row misalign (13 vs 12 cells) · **BUG-727** `<tr>` whitespace console error · **BUG-728** Cancelled KPI≠rows · **BUG-735** Change-Method/Mark-Unpaid on split row (gating; relates BUG-671, CR-515) · **BUG-737** leftover `console.log` (L147).

### Cluster D — Audit  ·  RISK: LOW/MEDIUM  ·  files: `AuditLogMockup.jsx` (+ backend insights-dashboard)
- **BUG-730** drill-down shows "High Risk" on every row (relates CR-543, **CR-555** we just shipped — reuse `utils/riskTier.getRiskTier`) · **BUG-739** "Total Events" KPI mislabel + Excel gaps.
- **BUG-722 + BUG-719 + existing BUG-696** = the SAME insights-dashboard latency (>60s axios). **IA these three together and decide consolidation** (owner said register separate; fold at IA if confirmed). **Backend-blocked.** BUG-722 also has a distinct FE part: stale KPIs + Download stays enabled on error → exports stale data.

### Cluster E — Insights presets (cross-cutting)  ·  RISK: LOW  ·  files: `SalesMockup.jsx`, `DashboardMockup`, **`CancellationsMockup.jsx`**
- **BUG-723** preset chip hard-coded (`useState('7D'/'Today')`), ignores shared FY/LM range; `matchPreset` fix only landed in AuditLogMockup. Relates BUG-697, BUG-704. **Touches CancellationsMockup → shares a file with Cluster B.**

### Cluster F — ScanOrderPopOut / Aggregator  ·  RISK: MEDIUM  ·  files: `ScanOrderPopOut*`
- **CR-557** (foundational) extract shared `<PopoutItemRow>` so web-EDIT Mode B reuses the full renderer — **this unblocks the reopened BUG-679, BUG-702 and CR-545 in Mode B.** · **CR-558** true per-item Accept (owner decision needed) · **BUG-731** check-in marker shown as KOT item · **BUG-738** channel/amount mismatch (#1578881).

### Cluster G — Cart / Credit / Shell (misc)  ·  RISK: LOW/MEDIUM
- **BUG-732** cart edit row jumps to bottom (relates BUG-685) · **BUG-734** credit `[null]` names + silent remove failure · **BUG-733** native date input (Credit **and** Order Report Beta → shares file with Cluster C) · **BUG-736** "Update now" toast overlaps rows (global shell).

---

## Reopened / retest items to fold into IA (existing IDs, no new mint)
- **REOPEN (FAIL):** BUG-684 (₹1 cart/pay mismatch — `OrderEntry.jsx`), BUG-679 + BUG-702 (ScanOrderPopOut Mode B — **do under CR-557**), CR-551 (placed-item variation edit).
- **RETEST:** BUG-671 (Mark Unpaid — relates BUG-735), CR-526 (credit remove — relates BUG-734).
- **DRIFT:** CR-552 (is in build, PARTIAL — pairs with CR-558).
- **CONFIRMED (already Gate 2):** BUG-712 / CR-523 (customer name blank on reopen).
- **No-ID follow-ups:** retest BUG-686/688/690/CR-547 (never ran); env probes (CRM 401s, kitchen-stations flakiness, BUG-707 TZ caveat).

---

## RECOMMENDATION — how to run the IA

**Batch it. Do NOT do 28 separate IAs, and do NOT do one giant IA.** The right unit is the **component cluster** (A–G), because IA blast-radius is file-scoped and these items collide on shared files. Lesson already learned this sprint: the BUG-708 batch had to be one PR because items shared `<thead>/<tbody>`.

**Across clusters → PARALLEL (they touch disjoint files):** A, B, C, D-UI, F, G can each have their IA done independently/concurrently.

**Within a cluster → SEQUENTIAL, foundational item first:**
- **F:** IA **CR-557 first** (the shared-row refactor); BUG-679/702/CR-545/CR-558/731/738 depend on or coordinate with it.
- **D:** IA the **timeout trio (696/719/722) as one** before the Audit-UI items; decide dedup up front.
- **B:** keep as one IA (single `<table>` on each screen — same reason as BUG-708).

**Cross-cluster conflicts to lock before coding (these break the "parallel" assumption):**
1. **BUG-723 (Cluster E) edits `CancellationsMockup.jsx` — the Cluster B file.** → Sequence E **after/with** B, or assign both to the same owner-session. Do not run B and E IAs into independent PRs.
2. **BUG-733 (date input) spans Credit (G) and Order Report Beta (C).** → One IA owns the shared date-picker swap; C and G reference it.
3. **BUG-730 / BUG-739 (Audit UI) reuse `utils/riskTier.js`** we just created — IA should confirm the shared util covers the drill-down badge, not re-implement.

**Suggested IA order (risk-led, since priority is flat):**
1. **Cluster A** (BUG-720 CRITICAL first — security/PII) — can start immediately; blocked only by owner permission-mapping answer.
2. **Cluster F** (CR-557 foundational + reopened Mode-B bugs) — highest functional-regression surface.
3. **Cluster C** (Order Beta — 7 items, one file, high density, quick wins).
4. **Cluster B + E together** (cancellation file owner) and **Cluster D** (Audit UI + timeout trio) — parallel to C.
5. **Cluster G** (misc) — parallel, lowest risk.

## Owner decisions that BLOCK Gate-2 sign-off (get these during IA)
1. **BUG-720** — which permission gates each of `/settings`, `/menu`, `/employees`, `/inventory-*`, `/pms/*`? (`/employees` urgent.)
2. **CR-558** — true per-item Accept required, or "cancel unwanted then Accept all"?
3. **BUG-722** — raise axios timeout / chunk request / backend perf (or combination)?

## Process notes
- Cluster B & D-UI items are defects in **freshly-shipped code** → `code_reality = FULL`; IA is verifying our own new code, not greenfield.
- Backend-blocked: BUG-722 (+696/719) timeout. Route everything else as FE (Abhishek).
- Each IA → write `impact/<cluster>_IA_2026_11_19.md`, update item status to `GATE_2_IA_COMPLETE`/`AWAITING_OWNER`, keep registry total in sync. No remote push without owner say-so.
