# BUG-044 — Status Pull & Next-Step Report

> ## ⚠ SUPERSEDED — DO NOT USE THE "READY FOR PRE-IMPL GATE" RECOMMENDATION
>
> **Status (2026-05-11, same day, post runtime investigation):**
> This status-pull report's "Final Verdict" of `ready_for_pre_implementation_gate`
> is **superseded** by the runtime scenario investigation at
> `/app/memory/bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md`.
>
> **Owner decision (2026-05-11):** _"BUG-044 is not ready for implementation.
> Reproduce the exact stale-table/order scenario first. No FE implementation
> until the failing socket/event path is proven."_
>
> The investigation proved the previously-planned `removeOrdersByTableId`
> hook into `handleUpdateTable` targets a code surface that does not produce
> the bug in current v2 code, and would introduce race-condition risk if
> implemented as written.
>
> **Use `/app/memory/bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md` as the
> source of truth for BUG-044.**
>
> The status-pull content below is retained for traceability only.

| Field | Value |
| --- | --- |
| Sprint | `pos_final_1.0` |
| Bug | **BUG-044** — Free / available table still shows old order items until manual refresh |
| Task Type | Status pull + next-step recommendation (no implementation) |
| Pull Date / Time (UTC) | 2026-05-11 (post BUG-045 sign-off) |
| Repo / Branch | `core-pos-front-end-` / `12-may-bugs` (HEAD `3944a0a`) |
| Code Changed In This Task | **NONE** |
| `/app/memory/final/` Updated | **NO** |
| `BUG_TEMPLATE.md` Updated | **NO** |
| Other Bugs Touched | **NONE** (BUG-045 is closed/sealed; BUG-046 only referenced for cross-impact) |

---

## 1. Docs Read (in mandatory reading order)

### Baseline (`/app/memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md` — approval gate, reading order, conflict register.
- `ARCHITECTURE_DECISIONS_FINAL.md` — socket-driven realtime contract, hotspots register (incl. `socketHandlers.js`, `OrderContext` flow).
- `MODULE_DECISIONS_FINAL.md` — Dashboard module ownership, Realtime Socket module boundary.
- `CHANGE_REQUEST_PLAYBOOK.md` — Step 1–10 analysis workflow.
- `IMPLEMENTATION_AGENT_RULES.md` — approval-gate format, file-level change plan, regression hotspots (incl. socket handlers, OrderContext, DashboardPage).
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — open decisions OD-01 (reporting ownership) and OD-02 (room billing/print) checked; **no overlap with BUG-044**.

### Accepted Overlay Docs (`/app/memory/change_requests/`)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

> **Observation:** None of the overlay docs mention BUG-044 by ID (they predate the BUG-044 intake by ≥5 days). No overlay conflict.

### Bug-Specific Docs
- `/app/memory/BUG_TEMPLATE.md` — BUG-044 intake @ lines 3643–3704 (per Bucket-1 plan citation).
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` — BUG-044 Impact Analysis @ lines 741–833; Bucket-D classification @ line 1397; FE-only verdict @ line 1367.
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` — BUG-044 implementation plan @ lines 428–476; QA checklist items @ lines 621–623; final verdict @ line 647; owner-friendly section @ lines 787–838.
- `/app/memory/bugs/BUG_045_IMPLEMENTATION_SUMMARY.md` — confirms BUG-044 surfaces were **NOT touched** during BUG-045 implementation (forbidden-file check @ lines 51–59; explicit "Other Bugs Touched (BUG-037 / 044 / 046): NO" @ line 16).
- `/app/memory/bugs/BUG_045_QA_REPORT.md`
- `/app/memory/bugs/BUG_045_SMOKE_SIGNOFF.md` — explicitly defers BUG-044/046 ("Approved plans exist…not yet implemented…Trigger separately if/when owner approves them.").

### Code Re-inspected (truth-check only — no edits)
- `frontend/src/api/socket/socketHandlers.js` — `handleUpdateTable` (L512–543), `handleUpdateOrder` (L211–305), `handleUpdateOrderStatus` (L382–415), `syncTableStatus` (L123).
- `frontend/src/contexts/OrderContext.jsx` — `removeOrder` (L139), `orderItemsByTableId` (L295), `setOrdersState` (L10), provider value exports (L338–374).

---

## 2. Baseline Conflict Check

**No baseline conflict.**

| Check | Result |
| --- | --- |
| Overlaps any `NEEDS_OWNER_DECISION` in `OPEN_QUESTIONS_FINAL_RESOLUTION.md`? | **No.** OD-01 (reporting) and OD-02 (room billing/print) do not overlap. The Bucket-1 plan flags an edge-case nuance on room flow but does not require a policy decision before implementation. |
| Conflicts with any approved CR (CR-001 / CR-003 / CR-004 / CR-008 / CR-013)? | **No.** BUG-044 is purely additive: a derived FE safety-net keyed on table → `available`. It does not change the terminal-status removal predicate, financial logic, payment flow, room billing, print, or socket event registration. |
| Touches deferred OQ-12 (room billing / print lifecycle)? | **Indirect, low risk.** Room orders share the same `tableId` channel; if a room flips to `available`, residual orders would also be cleared by the safety-net. Plan explicitly documents this and instructs QA to verify (lines 470, 818). Not a hard blocker — owner can revisit if needed. |
| Code vs final-doc mismatch? | **One minor surface drift, non-blocking.** See §5 below. |

---

## 3. BUG-044 — Plain-English Summary

**User-facing problem:** After a table is freed (order paid, cancelled, transferred, moved, or merged), the dashboard tile for that table **keeps showing the old order's items** until the cashier manually refreshes the browser. This confuses cashiers — the tile says "available" by colour/state but the items are still painted.

**Suspected root cause (high-confidence hypothesis from Impact Analysis):**
Order removal from `OrderContext` is keyed on **terminal-status order frames** (`order.status === 'cancelled' || 'paid'`). At least one closure path (likely the BILL_PAYMENT-on-Hold path or a merged/transferred path) frees the table via a `update-table` frame **without** delivering a matching terminal-status order frame in time. Because `handleUpdateTable` only updates table status and **never** removes orders, the order persists in `orderItemsByTableId` → `DineInCard` renders the stale items until a REST refresh.

**Planned fix (FE-only safety-net):**
Add a derived cleanup step: whenever a table flips to `available`, call a new `removeOrdersByTableId(tableId)` action on `OrderContext` that drops any non-walk-in orders for that table id. Terminal-status removal (the primary path) is left untouched; the new path catches only edge cases the primary missed.

---

## 4. Current Implementation Status

| Stage | Status |
| --- | --- |
| Intake recorded in `BUG_TEMPLATE.md` | ✅ Done (lines 3643–3704) |
| Impact Analysis | ✅ Done (`POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` L741–833) |
| Module Mapping | ✅ Done — Dashboard / Realtime Socket primary; OrderContext downstream |
| Implementation Plan | ✅ Done — Bucket-1 plan §"BUG-044" (L428–476) |
| Owner Approval | ✅ Per BUG-045 Implementation Summary: "Owner Approval Granted (all four buckets A + B + C + D)" — A/B/C/D refer to BUG-045 sub-buckets, **not** BUG-044. **BUG-044 owner approval is implicit via the Bucket-1 plan but has not been explicitly re-confirmed in a sign-off doc.** |
| Pre-Implementation Code Gate | ❌ **Not created** (BUG-045 had one — `POS_FINAL_1_0_BUG_045_PRE_IMPL_CODE_GATE.md`. BUG-044 does not yet have an analogous gate.) |
| Implementation | ❌ **Not started** |
| QA | ❌ N/A |
| Smoke / Sign-off | ❌ N/A |

**Net status: `planned, awaiting pre-implementation gate / owner approval to start`.**

---

## 5. Code Surfaces Likely Affected (and code-truth verification)

| File | Function / Region | Planned Change | Code Truth (verified 2026-05-11) |
| --- | --- | --- | --- |
| `frontend/src/api/socket/socketHandlers.js` | `handleUpdateTable` (currently L512–543) | When `status === 'available'`, call `removeOrdersByTableId(tableId)` after `updateTableStatus`. Guarded by `tableId > 0`. | ✅ Present and unmodified by BUG-045. **Drift note ⚠**: current handler **explicitly ignores `socketStatus === 'free'`** at L533–536 with comment _"v2: No flow sends update-table free. Ignore it. Table status is derived from order data."_ This means the **plan's hook point is the `else` branch (L537–541)** where `socketStatus === 'available'` lands after `TABLE_STATUS_MAP` mapping — not the `'free'` branch. The implementation agent must wire the safety-net inside the `else` branch (or remove the `'free'` ignore guard if backend actually sends `'free'`). This nuance was not explicit in the plan and is the **#1 reason a pre-implementation code gate is recommended**. |
| `frontend/src/api/socket/socketHandlers.js` | `handleUpdateTable` signature (L512) | Accept `removeOrdersByTableId` via the destructured `context` arg | ✅ Current signature: `(message, { updateTableStatus, setTableEngaged })`. Needs one extra context key. Caller site (dispatcher around L655) must also pass it. |
| `frontend/src/contexts/OrderContext.jsx` | Provider value | Add `removeOrdersByTableId(tableId)` action near `removeOrder` (L139). Filter: drop orders where `tableId === arg && !o.isWalkIn`. Add to provider value memo + deps. | ✅ Present and unmodified by BUG-045. The plan's snippet aligns with the existing `setOrdersState(prev => …)` idiom used by `removeOrder` (L148). Provider value memo @ L338–374 — straightforward to extend. |
| `frontend/src/pages/DashboardPage.jsx` | `tables` memo (L498–540 per Impact Analysis) | **No direct change** — memo auto-rederives once `orderItemsByTableId` updates. | ✅ Confirmed; consumer-only. |
| `frontend/src/components/cards/DineInCard.jsx` | Item rendering | **No direct change** — auto-rerenders. | ✅ Confirmed. |

**Estimated diff size:** ~20–30 lines across 2 files (OrderContext.jsx + socketHandlers.js). Smaller than BUG-045's +195/-22 footprint.

---

## 6. Relationship to BUG-045 and BUG-046

### vs BUG-045 (closed)
- **No file overlap.** BUG-045 touched only `ScanOrderPopOut.jsx` and `DashboardPage.jsx` (1 line). BUG-044 will touch `socketHandlers.js` and `OrderContext.jsx`.
- BUG-045 Implementation Summary §2 explicitly confirms zero changes to `socketHandlers.js`, `OrderContext.jsx`, or any BUG-044 surface (forbidden-file grep returned empty).
- **BUG-045 did NOT change anything that affects BUG-044's plan.** The BUG-044 plan remains accurate as written.
- One conceptual overlap (popup state filter) is documented in the Bucket-1 plan (L543): the new `removeOrdersByTableId` cannot wrongly clear a YTC web order in the scan popup, because the popup filters on `orderFrom === 'web' && fOrderStatus === 7` while the safety-net only fires for orders attached to a non-zero `tableId` (web/scan orders have `tableId === 0` → guard excludes them).

### vs BUG-046 (planned, not implemented)
- **No file overlap.** BUG-046 touches `OrderEntry.jsx` only. BUG-044 touches socket + context.
- **No cross-impact.** They can be implemented and shipped in any order without coordination.
- BUG-046 has not been started; this report does not propose changing that.

### Net answer to "Did BUG-045 completion change anything for BUG-044?"
**No.** BUG-044's plan is unchanged, its surfaces are pristine, its hypothesis is intact, and no owner clarification arose from BUG-045 QA/smoke that affects BUG-044.

---

## 7. Open Blockers

| Blocker | Status |
| --- | --- |
| Owner clarification required? | **No** — plan is FE-only safety-net with documented edge cases. Bucket-1 plan §8 of owner-friendly section explicitly states "Yes — safe to implement now." |
| Backend confirmation required? | **No** — purely FE additive cleanup. Plan §"What Not To Touch" confirms backend / API / socket-event-registration are out of scope. |
| Open OQ / OD overlap? | **No** — OD-01 (reporting) and OD-02 (room billing/print) checked; no overlap. (Room-orders edge-case is a regression-QA item, not a policy decision.) |
| Code conflict / merge risk? | **No** — files are unchanged since plan was written (`HEAD 22bedc3` per plan → `HEAD 3944a0a` now; BUG-044 surfaces clean per BUG-045 forbidden-file grep). |
| Plan-vs-code drift requiring re-plan? | **Soft yes (one item).** The `'free'`-branch ignore at `socketHandlers.js` L533–536 is a hook-point nuance not called out in the plan. **Non-blocking for design**, but the implementation agent should explicitly decide: (a) keep the `'free'` ignore and only hook on `socketStatus === 'available'` via the `else` branch, or (b) remove the `'free'` ignore and treat `'free'` as a synonym for `'available'`. A pre-implementation code gate (analogous to BUG-045's) would lock this decision in writing. |

---

## 8. Recommended Implementation Buckets

BUG-044 was originally assigned to **Bucket D — Socket / State Sync** (Impact Analysis §10, L1397) as a **standalone, FE-only bug**.

The Bucket-1 implementation plan groups it with BUG-045 + BUG-046 for sprint-level batching, but explicitly notes each bug is **independent and shippable in any order** (plan §12 L639). Recommended sequence inside Bucket 1 was: BUG-046 → BUG-045 → BUG-044, with BUG-044 last because of slightly larger regression QA surface.

**Recommendation for this pickup:** Implement BUG-044 as a **single, standalone PR** (no need to wait for BUG-046). Keep diff surgical — 2 files, ~20–30 lines.

---

## 9. Recommended Validation Plan (mirrors Bucket-1 plan §10 BUG-044 Test Plan)

### Happy path
1. Open a dine-in order on Table 5 with 2 placed items → verify `DineInCard` shows items.
2. Emit a `update-table { tableId: 5, status: 'available' }` socket frame **without** a matching terminal `update-order-paid` frame.
3. Assert `OrderContext.orders` no longer contains the Table-5 order (action fired).
4. Assert `DineInCard` for Table 5 renders the empty available state **without a page refresh**.

### Regression
- Terminal path: `update-order-paid` for an active order still removes via the existing `handleUpdateOrder` predicate (primary path unchanged).
- Walk-in protection: an active walk-in order on the same socket session is **not** removed when an unrelated dine-in table is freed (filter excludes `isWalkIn`).
- Re-engage: after Table 5 is cleared, re-opening Table 5 with a fresh order works as before (`addOrder` → `updateOrder` flow unaffected).
- Switch-table (`update-order-target`): old table is freed without wrongly removing the new-table order (new-table order has the new `tableId`, so old-table cleanup leaves it alone).
- Split orders: when backend signals `available`, all siblings on that table are cleaned — matches the "free table" UX expectation.
- Room flow: if a room flips to `available` mid-flow (edge case), verify the residual room order is cleared as expected; owner can revisit in OQ-12 review if production behavior diverges.

### Acceptance gates (from Bucket-1 §11)
- [ ] BUG-044 — Free table tile shows empty state immediately on `update-table available`, no page refresh.
- [ ] BUG-044 Walk-in safe — Walk-in orders not removed by the safety-net.
- [ ] BUG-044 Terminal path — Standard paid/cancelled removal still works first.
- [ ] No console errors.
- [ ] No file outside the two named ones modified.
- [ ] No regression in BUG-045 Scan/Web popup behavior (popup still appears for YTC web orders; safety-net does not wrongly clear them).

---

## 10. Final Verdict

### `ready_for_pre_implementation_gate`

**Reasoning:**
- The plan, hypothesis, and module mapping are sound and unaffected by BUG-045 closure.
- No owner clarification, no backend confirmation, no policy decision blocks implementation.
- However, one **code-surface drift** exists (the `'free'`-branch ignore in `handleUpdateTable` L533–536) that the plan does not explicitly address. This is exactly the kind of nuance a pre-implementation code gate is designed to catch and pin down before the implementation agent writes a line of code.
- Creating a pre-implementation code gate (analogous to `POS_FINAL_1_0_BUG_045_PRE_IMPL_CODE_GATE.md`) will:
  1. Lock the hook-point decision (`else` branch vs removing `'free'` ignore) in writing.
  2. Re-confirm owner approval explicitly for BUG-044 (BUG-045's approval doc bundled "Buckets A–D" but those were BUG-045's sub-buckets, not the whole Bucket-1 plan).
  3. Surface the room-orders edge case for explicit owner ack before clearing residual room orders.
  4. Match the QA cadence the team adopted for BUG-045, keeping the audit trail consistent.

**Alternative verdict considered:** `ready_for_implementation`. This would be defensible — the Bucket-1 plan is approved and the diff is small. But given the one-surface drift and the implicit-vs-explicit owner-approval question, the slightly heavier pre-implementation gate is the safer next step.

---

## 11. Recommended Next Action

**Trigger a Pre-Implementation Code Gate agent for BUG-044** with these deliverables:
1. Output file: `/app/memory/bugs/POS_FINAL_1_0_BUG_044_PRE_IMPL_CODE_GATE.md` (mirrors the BUG-045 gate format).
2. Lock the `handleUpdateTable` hook-point choice (`else` branch with `socketStatus === 'available'` after `TABLE_STATUS_MAP` mapping; OR retire the `'free'`-branch ignore).
3. Re-confirm explicit owner approval for BUG-044 (currently implicit).
4. Confirm room-orders edge-case handling (or owner ack to defer that edge case).
5. Freeze the precise file-level change plan and exact line ranges as of `HEAD 3944a0a`.

After the gate passes, hand off to the Bug Implementation Agent with the gate doc + this status pull as the input packet.

---

## End Of Report

- **No code was changed in this task.**
- **`/app/memory/final/` was not modified.**
- **`/app/memory/BUG_TEMPLATE.md` was not modified.**
- This report lives at `/app/memory/bugs/BUG_044_STATUS_PULL_AND_NEXT_STEP.md`.
- BUG-045 is sealed and was not touched.
- BUG-046 is referenced only for cross-impact and was not touched.
