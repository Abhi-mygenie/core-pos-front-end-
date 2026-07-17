# Session Handover — 2026-06-12 (CR/Bug Registry + Deep Planning)

> **Operator:** E1 (Emergent main agent)
> **Branch:** `13-june`
> **Session window:** 2026-06-12
> **Owner present:** Yes (interactive driver)
> **Theme:** CR/Bug intake registration + deep implementation planning for 4 phases

---

## 0. TL;DR

11 items registered (7 CRs + 4 bugs). Deep implementation plans completed for Phases 1–3 + BUG-132. Impact analysis completed for Phase 4. **Zero code written this session — planning only.** All plans are ready for Gate 4 (Code Gate) approval → implementation.

---

## 1. Items Registered This Session

| # | ID | Title | Priority | Gate Reached |
|---|---|---|---|---|
| 1 | CR-037 | Remove Popular Items from Boot + Order Screen | P2 | Gate 3 ✅ |
| 2 | CR-038 | Boot Retry Policy (max 3, global, disable + contact support) | P2 | Gate 3 ✅ |
| 3 | CR-039 | Credit Management: Wire Total Credit/Paid (Option B — includes portfolio optimization) | P1 | Gate 3 ✅ |
| 4 | BUG-130 | Channel Visibility not reflected from Settings to POS | P1 | Gate 2 ✅ |
| 5 | CR-040 | Sidebar: Rename report labels + Remove X/Y/Z Reports | P3 | Gate 3 ✅ |
| 6 | CR-041 | Navigation Consistency: Standardize opening patterns | P2 | Gate 3 ✅ (investigation catalogue, no code) |
| 7 | CR-042 | Rename "Items & Menu" → "Item Ledger" | P3 | Gate 3 ✅ |
| 8 | BUG-131 | Sidebar bottom section should be sticky | P2 | Gate 3 ✅ |
| 9 | BUG-132 | Settlement Report business logic broken (formulas) | P1 | Gate 3 ✅ (5 micro-phases) |
| 10 | BUG-133 | "Check In" item leaking into reports | P2 | Gate 2 ✅ (all owner decisions locked) |
| 11 | CR-043 | Credit per-customer totals in reports + portfolio optimization | P2 | Gate 1 ✅ |

---

## 2. Implementation Plans Ready (documents)

| Plan | Document Path | Items | Edits | Files |
|------|---------------|-------|-------|-------|
| **BUG-132** | `/app/memory/BUG_132_SETTLEMENT_FORMULA_FIX_IMPLEMENTATION_PLAN.md` | BUG-132 | 13 edits, 5 micro-phases | 1 file |
| **Phase 1 — Sidebar Sweep** | `/app/memory/PHASE_1_SIDEBAR_SWEEP_IMPLEMENTATION_PLAN.md` | CR-040, CR-042, BUG-131, CR-041 | 15 edits | 5 files |
| **Phase 2 — Boot Optimization** | `/app/memory/PHASE_2_BOOT_OPTIMIZATION_IMPLEMENTATION_PLAN.md` | CR-037, CR-038 | 15 edits | 8 files |
| **Phase 3 — Credit Total Wire** | `/app/memory/PHASE_3_CREDIT_TOTAL_WIRE_IMPLEMENTATION_PLAN.md` | CR-039 (Option B) | 3 edits | 2 files |
| **Phase 4 — Investigations** | `/app/memory/PHASE_4_INVESTIGATION_IMPACT_ANALYSIS.md` | BUG-130, BUG-132, BUG-133 | Impact analysis only | — |

---

## 3. Recommended Priority Order for Implementation Agent

| Priority | Item(s) | Why | Est. Time | Plan Doc |
|----------|---------|-----|-----------|----------|
| **🔴 P0** | **BUG-132 (Settlement formulas)** | Owner directive: first priority. Business logic broken — money impact. 5 micro-phases, each independently verifiable. | ~20 min | `BUG_132_SETTLEMENT_FORMULA_FIX_IMPLEMENTATION_PLAN.md` |
| **🟠 P1** | **Phase 1 — Sidebar Sweep** (CR-040 + CR-042 + BUG-131 + CR-041) | Quick wins — 4 items closed in one pass, single primary file. Visual impact, low risk. | ~25 min | `PHASE_1_SIDEBAR_SWEEP_IMPLEMENTATION_PLAN.md` |
| **🟡 P2** | **Phase 2 — Boot Optimization** (CR-037 + CR-038) | Saves ~8.6s on every boot. 8 files but all removals + simple add. No financial logic. | ~30 min | `PHASE_2_BOOT_OPTIMIZATION_IMPLEMENTATION_PLAN.md` |
| **🟢 P3** | **Phase 3 — Credit Total Wire** (CR-039 Option B) | Needs curl-probe to verify API fields. 2 files, 3 edits. Includes portfolio export optimization. | ~20 min | `PHASE_3_CREDIT_TOTAL_WIRE_IMPLEMENTATION_PLAN.md` |
| **🔵 P4** | **BUG-133 (Check In filter)** | All owner decisions locked. Mechanical fix — 1-line filter in 6 report files. No plan doc yet (Gate 2 done, Gate 3 needed). | ~15 min | Needs Gate 3 plan |
| **⚪ P5** | **BUG-130 (Channel Visibility)** | Needs curl-probe verification first. Primary suspect = backend. FE fix (if needed) is 1-2 lines. | ~1-2 hrs investigation | Impact analysis in Phase 4 doc |

---

## 4. Critical Instructions for Implementation Agent

1. **DO NOT start implementation without asking owner which priority to start from.** Recommend the priority order above but let owner decide.
2. **BUG-132 is micro-phased (A→B→C→D→E).** After EACH micro-phase, take a screenshot and let owner verify before proceeding to the next.
3. **All plans have exact line numbers, current/new text, and verification steps.** Follow them precisely — do NOT improvise or add scope.
4. **CR-041 (Navigation Consistency) is investigation-only** — the catalogue is complete in the Phase 1 plan. It surfaces 3 owner decisions (D-1, D-2, D-3) that need answering before any code. Do NOT implement changes — just present the investigation results.
5. **CR-039 (Credit) needs a curl-probe first** to verify the API response shape matches what the plan expects. The plan documents the exact curl command.
6. **Registration Gate applies** — all items have registered IDs. No new scope without registration.
7. **Gate sequence:** Each item is at Gate 3 (plan complete). Next step is Gate 4 (Code Gate — owner GO) → Gate 5 (Implementation + QA) → Gate 6 (Owner Smoke).

---

## 5. Owner Decisions Locked This Session

| Item | Decision | Answer |
|------|----------|--------|
| CR-038 OQ-1 | Max retry count | 3 |
| CR-038 OQ-2 | After max retries | Disable button + "Contact support" |
| CR-038 OQ-3 | Show counter | Yes — "Attempt N of 3" |
| CR-038 OQ-4 | Counter scope | Global |
| CR-039 | Scope | Option B (KPI tiles + portfolio export optimization) |
| CR-037 | MenuContext.isLoaded | Move to setProducts (Option 1) |
| BUG-133 OD-1 | Exclude from Room Orders Report? | Yes — exclude everywhere, no exceptions |
| BUG-133 OD-2 | Filter method | String match, case-insensitive, trimmed: `(name \|\| '').trim().toLowerCase() === 'check in'` |
| BUG-132 | Priority | First priority — implement before all others |
| BUG-132 | Total Funds KPI card | Yes — 6th card needed |
| BUG-132 | Remaining formula | Backend data is correct; FE logic is the issue |

---

## 6. Open Items (NOT resolved this session)

| Item | What's Needed |
|------|---------------|
| BUG-130 | Curl-probe profile API before/after settings change to confirm backend propagation |
| CR-041 D-1 | Owner decision: panels vs routes standardization direction |
| CR-041 D-2 | Owner decision: remove Menu Management dead children from sidebar? |
| CR-041 D-3 | Owner decision: remove hidden items (Orders, Settings, Employees, etc.) from sidebar data? |
| CR-043 | Full planning — registered at Gate 1 only |
| BUG-133 | Gate 3 plan needed (Gate 2 done, decisions locked) |
| DEBUG-B11 | `profileTransform.js` L119-134 console.log cleanup — cosmetic, can bundle with any phase |

---

## 7. Files Changed This Session

**Zero files changed.** This was a planning-only session. All work is in `/app/memory/` documents.

---

## 8. Environment State

- Branch: `13-june`
- Frontend: RUNNING on port 3000
- Backend: RUNNING on port 8001
- Preview URL: `https://genie-pos-build.preview.emergentagent.com`
- Production API: `https://preprod.mygenie.online/`

---

**END OF SESSION HANDOVER — 2026-06-12.**
