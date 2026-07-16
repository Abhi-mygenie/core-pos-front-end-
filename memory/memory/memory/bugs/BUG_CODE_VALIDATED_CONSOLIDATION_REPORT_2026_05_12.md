# BUG Code-Validated Consolidation Report — 2026-05-12

> **Generated:** 2026-05-12 (UTC) — owner-facing
> **Companion master register:** `/app/memory/bugs/BUG_PENDING_TASK_REGISTER_2026_05_12.md`
> **Strict rules honoured:** No production code changed. `/app/memory/final/` not modified. `/app/memory/BUG_TEMPLATE.md` not modified. CR pending register not overwritten.

---

## 1. Executive Summary

> **Update 2026-05-12 — Tier-1 stop-the-bleeding pass complete.** Owner explicitly confirmed smoke pass on the 7 previously-grey-zone bugs. Standalone `*_SMOKE_SIGNOFF.md` docs created for BUG-042-A, BUG-049, BUG-028, BUG-029, BUG-032, BUG-034, BUG-035. **Closed / smoke-passed bucket grew from 4 → 11 May-2026 sprint bugs.** Smoke-pending bucket is now empty. Tracker row flips in `BUG_TEMPLATE.md` remain the tracker-keeper's responsibility.

- **51 bug IDs** reviewed across `/app/memory/BUG_TEMPLATE.md` (BUG-001..BUG-035 + BUG-036..BUG-049 + BUG-042-A/B/C).
- **No customer-visible burning bug is unresolved on FE side.** Four bugs are gated on a single backend reply each (BUG-037, BUG-039, BUG-042 parent, BUG-047).
- **Eleven bugs are now sealed by owner smoke (May-2026 sprint):** BUG-028, BUG-029, BUG-032, BUG-034, BUG-035, BUG-042-A, BUG-042-B, BUG-042-C, BUG-045, BUG-048, BUG-049. Plus BUG-005 and BUG-008 (terminal-by-tracker).
- **Smoke-pending bucket is empty.** All previously-grey-zone Category-B bugs cleared.
- **Docs-code mismatch cluster (BUG-028, 029, 032, 034, 035) now has signoff docs on disk;** only the BUG_TEMPLATE.md row flip remains.
- **BUG-044 is parked pending runtime reproduction.** Its PayLater/Hold half is covered by BUG-042-C.
- **Code is consistent with documented fixes** for every Apr-2026 bug spot-checked. No silent reversal detected.

---

## 2. Total Bugs Reviewed

**51 bug IDs.**

Includes BUG-001..BUG-035 (35), BUG-036..BUG-049 (14, including BUG-049), plus the three sub-bugs BUG-042-A / BUG-042-B / BUG-042-C tracked under the BUG-042 row.

---

## 3. Count by Status

| Status | Count | IDs (short list) |
|---|---|---|
| Closed / smoke passed (May-2026 sprint) | 11 + 2 terminal-by-tracker | BUG-028, BUG-029, BUG-032, BUG-034, BUG-035, BUG-042-A, BUG-042-B, BUG-042-C, BUG-045, BUG-048, BUG-049 **+** BUG-005, BUG-008 |
| Implemented + QA passed / smoke pending | 0 | — (cleared by Tier-1 pass on 2026-05-12) |
| Code present / formal docs needed (legacy Apr-2026 chain) | ~22 | BUG-001..BUG-023, BUG-025, BUG-026, BUG-027 |
| Docs-code mismatch (cluster) | 0 active (5 cleared by smoke on 2026-05-12; tracker flip pending) | — |
| Implementation plan ready | 3 | BUG-030, BUG-031, BUG-033 |
| Impact analysis done — plan next | 1 | BUG-038 |
| Ready for pre-implementation code gate | 1 | BUG-046 |
| Intake only | 3 | BUG-040, BUG-041, BUG-043 |
| Needs owner clarification | 4 | BUG-043, BUG-040, BUG-041, BUG-046 (Option re-confirm) |
| Needs backend confirmation | 6 | BUG-037, BUG-039, BUG-042 parent, BUG-047, BUG-024, BUG-036 |
| Open — backend bug (FE untouched) | 1 | BUG-024 |
| Parked under another CR | 1 | BUG-036 (CR-011) |
| Parked pending reproduction | 1 | BUG-044 |
| Superseded / merged | 1 explicit + cross-refs | BUG-044 PayLater half → BUG-042-C |
| Final-docs sweep candidates (deferred) | 2 | BUG-042-C, BUG-048 |

Counts are not mutually exclusive (e.g., BUG-046 needs owner re-confirm AND is ready for code gate).

---

## 4. Closed Items (sealed by smoke / terminal)

| Bug | Smoke / Closure | Tracker action |
|---|---|---|
| BUG-005 | Terminal: not a business requirement | Already closed |
| BUG-008 | Terminal: already working | Already closed |
| BUG-028 | Smoke PASS 5/5 (`BUG_028_SMOKE_SIGNOFF.md`, 2026-05-12) | Flip to Closed (currently "Open — Intake Created") |
| BUG-029 | Smoke PASS 5/5 (`BUG_029_SMOKE_SIGNOFF.md`, 2026-05-12) | Flip to Closed (currently "Open — Intake Created") |
| BUG-032 | Smoke PASS 5/5 (`BUG_032_SMOKE_SIGNOFF.md`, 2026-05-12) | Flip to Closed (currently "Open — Intake Created") |
| BUG-034 | Smoke PASS 5/5 (`BUG_034_SMOKE_SIGNOFF.md`, 2026-05-12) | Flip to Closed (currently "Open — Intake Created") |
| BUG-035 | Smoke PASS 7/7 (`BUG_035_SMOKE_SIGNOFF.md`, 2026-05-12) | Flip to Closed (currently "Open — Intake Created") |
| BUG-042-A | Smoke PASS 10/10 (`BUG_042_A_SMOKE_SIGNOFF.md`, 2026-05-12) | Flip to Closed |
| BUG-042-B | Smoke PASS (`BUG_042_B_SMOKE_SIGNOFF.md`) | Flip to Closed |
| BUG-042-C | Smoke PASS (`BUG_042_C_SMOKE_SIGNOFF.md`) | Flip to Closed |
| BUG-045 | Smoke PASS 10/10 (`BUG_045_SMOKE_SIGNOFF.md`) | Flip to Closed |
| BUG-048 | Smoke PASS 7/7 (`BUG_048_SMOKE_SIGNOFF.md`) | Flip to Closed |
| BUG-049 | Smoke PASS 7/7 (`BUG_049_SMOKE_SIGNOFF.md`, 2026-05-12) | Flip to Closed |

> Legacy Apr-2026 bugs (BUG-001..BUG-023) are documented as closed within `BUG_TEMPLATE.md` itself and verified present in code; no extra tracker action required.

---

## 5. Implemented + QA Passed / Smoke Pending

**Empty as of 2026-05-12.** Tier-1 stop-the-bleeding pass cleared this bucket — owner confirmed smoke for BUG-042-A, BUG-049, BUG-028, BUG-029, BUG-032, BUG-034, BUG-035; standalone signoff docs now on disk.

---

## 6. Ready for Implementation / Code Gate

| Bug | Stage | Footprint estimate |
|---|---|---|
| BUG-046 | Pre-impl gate | ~5-8 lines in `OrderEntry.jsx` |
| BUG-030 | Plan ready | Per plan doc |
| BUG-031 | Plan ready | Per plan doc |
| BUG-033 | Plan ready | Per plan doc |
| BUG-038 | Plan agent next | Per impact-analysis doc |

---

## 7. Blocked / Owner / Backend / Evidence

### 7.1 Owner clarification
- **BUG-043** — merge/supersede/distinct vs BUG-048 decision.
- **BUG-040** — confirm desired CSV/Excel export format.
- **BUG-041** — PDF table-row scope.
- **BUG-046** — re-confirm Option A (local-only) vs Option B (auto-PATCH on every keystroke).

### 7.2 Backend confirmation (single message drafted in `bugs/BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md`)
- **BUG-042 parent** — UPI-on-Hold failing network trace.
- **BUG-037** — `def_ord_status` numeric + accepted `order_status` literal + relation to BUG-011.
- **BUG-039** — one audit-API row sample for a delivery order.
- **BUG-047** — literal FCM payload + outlet-name confirmation.
- **BUG-024** — backend cascade implementation + event-name fix.
- **BUG-036** — BE-A canonical paymentType case (tracked via CR-011).

### 7.3 Missing evidence
- **BUG-043** — no screenshots; awaiting owner.

---

## 8. Parked / Reproduction Required

- **BUG-044** — generic stale-table case parked per `BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md` (owner directive 2026-05-11). PayLater/Hold half resolved by BUG-042-C. No FE implementation until owner provides a reproducible scenario.

---

## 9. Superseded / Merged / Split

| Relationship | Status |
|---|---|
| BUG-042 split into A / B / C | Confirmed; B + C closed; A in §5 (smoke pending); parent UPI still backend-pending |
| BUG-044 PayLater/Hold → BUG-042-C | Covered; only generic stale-table case remains |
| BUG-043 ↔ BUG-048 | Owner decision pending on merge/supersede/distinct |
| BUG-021 ↔ BUG-018 | Historical: BUG-021 = BUG-018 "Part 4" |
| BUG-023 ↔ BUG-013 | BUG-023 is print-payload residual of BUG-013 |
| BUG-037 ↔ BUG-011 | Likely same backend root cause; single backend ask covers both |
| BUG-036 ↔ CR-011 | Owner-parked under CR-011 |

---

## 10. Final-Docs Sweep Candidates

| Bug | Reason | Status |
|---|---|---|
| BUG-042-C | Baseline business-rule revision (status-9 terminal for running-OrderContext with status-9-specific table preservation) | **Deferred per owner** |
| BUG-048 | Owner-locked Room Orders Report calculation model | Deferred (no sweep performed in BUG-048 session) |
| F_order_status === 8 dashboard (G62) | Documented in `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md` — owner answers needed before any sweep | Owner-blocked |

No other May-2026 fix touches `/app/memory/final/*` baseline rules.

---

## 11. Top Recommended Next Actions

> Items #1 and #2 ✅ DONE on 2026-05-12 (Tier-1 stop-the-bleeding pass).

1. ~~Owner smoke sign-off for BUG-042-A and BUG-049~~ ✅ **DONE 2026-05-12** — signoff docs on disk.
2. ~~Tracker cleanup pass for the docs-code mismatch cluster (smoke step)~~ ✅ **Smoke DONE 2026-05-12** for BUG-028/029/032/034/035; **tracker row flip in `BUG_TEMPLATE.md` still pending** for all 11 closed bugs.
3. **Send the four-bug backend confirmation message** drafted in `BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md` — single message unblocks BUG-037, BUG-039, BUG-042 parent, BUG-047.
4. **Approve BUG-046 Option A** and trigger the Pre-Implementation Code Gate agent → small ~5-8 line FE fix.
5. **Decide BUG-043 disposition** vs BUG-048 (merge / supersede / distinct).
6. **Decide BUG-044 disposition** — capture a runtime reproduction or close based on BUG-042-C coverage.
7. **Schedule a future final-docs sweep cycle** for BUG-042-C (and optionally BUG-048) when owner approves baseline edits.
8. **Consider Tier-2 retrospective QA** of Apr-2026 legacy bugs (BUG-001..BUG-023) — risk-based bucketed approach proposed in chat session.
9. **Consider Tier-3 process hardening** — add a one-line rule to `IMPLEMENTATION_AGENT_RULES.md` requiring the 6-artifact gate (intake → IA → plan → code gate → impl summary → QA → smoke signoff) before any tracker Closed flip.

---

## 12. Owner Checklist

- [x] ✅ Smoke BUG-042-A on preprod and request `BUG_042_A_SMOKE_SIGNOFF.md`. **(2026-05-12)**
- [x] ✅ Smoke BUG-049 on preprod and request `BUG_049_SMOKE_SIGNOFF.md`. **(2026-05-12)**
- [x] ✅ Smoke BUG-028 / BUG-029 / BUG-032 / BUG-034 / BUG-035 and request standalone smoke docs for each. **(2026-05-12)**
- [ ] Tracker keeper flips **11 bugs** to Closed in `BUG_TEMPLATE.md` (BUG-028, 029, 032, 034, 035, 042-A, 042-B, 042-C, 045, 048, 049).
- [ ] Decide BUG-043 vs BUG-048 (merge / supersede / distinct).
- [ ] Re-confirm BUG-046 Option A or override.
- [ ] Approve BUG-038 plan (analysis exists; plan-agent next).
- [ ] Confirm BUG-040 / BUG-041 export formats.
- [ ] Send / chase the four-bug backend confirmation message (BUG-037, BUG-039, BUG-042 parent, BUG-047) + the BUG-024 / BUG-036 / BUG-016 backend asks.
- [ ] Decide BUG-044 disposition (reproduce or close).
- [ ] Approve a future final-docs sweep window for BUG-042-C (and optionally BUG-048).
- [ ] Decide whether to run Tier-2 retrospective QA of Apr-2026 legacy bugs.
- [ ] Decide whether to apply Tier-3 process hardening rule to `IMPLEMENTATION_AGENT_RULES.md`.

---

## 13. Closing certifications

- ✅ No production code modified.
- ✅ `/app/memory/final/` not touched.
- ✅ `/app/memory/BUG_TEMPLATE.md` not touched.
- ✅ `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md` not overwritten.
- ✅ Code validated against `/app/frontend/src` working tree as source of truth.

---

*End of Code-Validated Consolidation Report — 2026-05-12.*
