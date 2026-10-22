# Session Handover — CR-363 + CR-366 (Gate 3 — Implementation Plan complete)

```
Written:         2026-09-14
Status at close: GATE 3 COMPLETE. Implementation Plan written for CR-363 + CR-366.
                 Awaiting owner Gate 4 GO to proceed to IMPLEMENTATION.
Next agent role: IMPLEMENTATION (after Gate 4 GO)
                 Start: run pre-impl checks (§0 of plan), then execute 8 edits in sequence.
Plan doc:        /app/memory/plans/CR-363_CR-366_JOINT_IMPLEMENTATION_PLAN.md
Workspace:       /app  (branch 14sep, frontend-only)
```

---

## 1. What this session covered

| Task | Result |
|---|---|
| PLANNING role declared (Gate 3) | Done |
| Gate 3 entry checks | constants.js L595–596 ✅ · pmsService.js L442 (EOF) ✅ · App.js L106/L264 ✅ · Sidebar.jsx L241 ✅ · reportExporter.js params confirmed ✅ |
| BN-6 probe (group_by=month) | NOT done — credentials not available. Impl agent to probe at start. |
| Implementation Plan written | `plans/CR-363_CR-366_JOINT_IMPLEMENTATION_PLAN.md` |
| Registry updated | Both CRs → gate: 3, status: GATE 3 WRITTEN |
| CR_REGISTRY.md | Both rows updated |

No source code changed.

---

## 2. Plan summary — 8 edits in sequence

| # | File | Change | Lines |
|---|---|---|---|
| 1 | `src/api/constants.js` | +`NIGHT_AUDIT` +`REVENUE_SUMMARY` before L596 `};` | +3 |
| 2 | `src/api/services/pmsService.js` | +`getNightAudit` +`getRevenueSummary` at EOF | +16 |
| 3 | `src/api/transforms/nightAuditTransform.js` | NEW pure transform, all 8 sections, null-normalise | ~120 |
| 4 | `src/pages/pms/NightAuditPage.jsx` | NEW page, 8 sections, date picker, export, badge | ~350 |
| 5 | `src/api/transforms/revenueTransform.js` | NEW pure transform + groupByAutoSelect helper | ~80 |
| 6 | `src/pages/pms/RevenueDashboardPage.jsx` | NEW page, KPI side-by-side, 3 charts, 4 tables, 7D default | ~350 |
| 7 | `src/App.js` | +2 imports (L106) +2 routes (L264) | +4 |
| 8 | `src/components/layout/Sidebar.jsx` | +`pms-night-audit` +`pms-revenue` after L241 | +3 |

Build as ONE change-set (Sidebar touched exactly once).

---

## 3. Key decisions encoded in plan

| Decision | Encoding |
|---|---|
| OD-363-07 (as-of-now badge) | Section F always shows badge — no conditional |
| OD-363-08 (null → "—") | `str()` helper returns '—' for null; amber warning banner in C + H |
| OD-366-05 (no cache) | No `insightsCache` import or usage anywhere |
| OD-366-06 (no % compare) | KPI tiles = single value pair only, no delta row |
| OD-366-07 (7D default) | `useState('7d')` preset, `startDate = localDate(-6)` on mount |
| OD-366-08 (side-by-side) | Dual-value tile: orange `adrBooked` / green `adrCollected` — no toggle |
| R6 (no FE math) | All ADR/RevPAR/TRevPAR taken from backend fields directly |
| BN-1/2/3/5/6 | Null guards in transforms; amber warnings on C + H; BN-6 channel bookings hidden if 0-with-nonzero-nights |

---

## 4. Impl agent start instructions

1. **Run pre-impl checks** (Plan §0):
   - Probe `revenue-summary?group_by=month` (need preprod credentials from owner)
   - Re-verify 4 target lines — confirm unchanged since 2026-09-14
   - Record baseline webpack warning count

2. **Execute edits 1–8 in order.** Verify each before moving to next.

3. **Checkpoint after each file group** — don't wait until all 8 done to check compile.

4. **Run Verification Matrix** (Plan §3) — 18 checks.

5. **Run Post-Code Registry Checklist** (Plan §5) — 9 checkboxes — before writing handover.

6. **Write QA Handover** using matrix from §3.

---

## 5. Blocked CRs (unchanged)

- **CR-364 — Guest Folio** — Gate 2 not started
- **CR-357 — Room Advance `+ Pay`** — Gate 2 not started
- **BUG-193 — Room Transfer Trail** — Gate 0-1 intake needed

---

## 6. Do-Not-Retry

All §7 rules from previous handover (inherited). Additionally:
- OD-366-08 Option A is FINAL — no toggle implementation.
- Do NOT start CR-364 or CR-357 until CR-363/366 are at Gate 5b QA.
- Do NOT modify `aiosellTransform.js` — dropped from scope at Gate 2.

*Handover written 2026-09-14 · Planning agent (ALPHA v0.7)*
