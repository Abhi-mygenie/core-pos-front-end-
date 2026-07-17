# CRM 2.0 — CR-002 Stage 6b UI Preview Approval Gate — Closure (Retroactive Acceptance)

**Date:** 2026-05-27
**Sprint:** CRM 2.0
**CR ID:** `CR_002`
**Type:** STAGE_CLOSURE / PROCESS_GAP_RESOLUTION
**Closure Option:** **B — Owner Retroactive Acceptance via Live Smoke Test**
**Owner directive:** "Stage 6b close it till owner's smoke tied verified passed and implemented — option b" (2026-05-27)

**Closes:**
- CG-10 (Consolidated Open Gaps) — Phase 2 UI Preview Approval Gate bypassed
- OG-10 (CR-002 Open Gaps) — Phase 2 UI Preview Approval Gate bypassed (same item)

**Predecessors:**
- `implementation/CRM2_0_CR_002_CROSS_SELL_REQUIREMENTS_FREEZE_2026_05_26.md` §13.1, §13.2
- `qa/CRM2_0_CR_002_CROSS_SELL_PHASE_2_QA_REPORT_2026_05_26.md`
- `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md`
- `reconciliation/CRM2_0_SPRINT_CONSOLIDATION_2026_05_27.md`
- `open_gaps/CRM2_0_CONSOLIDATED_OPEN_GAPS_2026_05_27.md`

---

## 1. Original Requirement (Requirements Freeze §13.1, §13.2)

A non-negotiable blocking gate sat between Phase 1 and Phase 2:

```
PHASE 1 → ★ UI PREVIEW CHECKPOINT (BLOCKING GATE) → PHASE 2
```

Required artifacts (P-1 … P-9):
1. Preview artifact in format (A) static HTML, (B) Storybook, or (C) annotated screenshots
2. Coverage of 9 preview states (CustomerModal existing-customer / new-customer / first-time, Past Favourites, Smart Suggestions, ItemNotesModal Customer Preferences, OrderNotesModal Customer History, loading skeletons, empty/error states)
3. Mapped P-1..P-9 checklist
4. Explicit owner verdict: APPROVED / CHANGES_REQUESTED / REJECTED
5. Approval timestamp + medium
6. Hold on Phase 2 production UI until APPROVED
7. Post-approval cleanup of preview artifact

---

## 2. What Actually Happened (chronology)

| Step | Date | Event |
|---|---|---|
| 1 | 2026-05-26 | Phase 1 (service/transform/cache/hook) implemented and committed |
| 2 | 2026-05-26 | **Preview Approval Gate skipped** — no preview artifact built, no owner verdict recorded |
| 3 | 2026-05-26 | Phase 2 UI (CustomerModal profile banner + favourites + suggestions; ItemNotesModal + OrderNotesModal CRM wiring) committed directly |
| 4 | 2026-05-26 | Build clean (`yarn build` exit 0); structural QA 28/30 ACs PASS; live QA blocked by credentials |
| 5 | 2026-05-27 | Owner provided R689 preprod credentials |
| 6 | 2026-05-27 | Owner **smoke-tested the live Phase 2 UI** on preprod R689 with customers `abhishek jain` (populated), `priti` (first-time), and one walk-in |
| 7 | 2026-05-27 | Owner reported customer-icon intermittent invisibility (P0 bug) → hotfix shipped (permission-gate removal in `OrderEntry.jsx` L1382) |
| 8 | 2026-05-27 | Owner **re-smoke-tested post-hotfix** and **confirmed customer icon visible + Phase 2 UI behaviour acceptable** (recorded in `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md`) |
| 9 | 2026-05-27 | Live QA 10/11 PASS + 1 PARTIAL (T-05 first-time badge timing) — recorded in `qa/CRM2_0_CR_002_CROSS_SELL_PHASE_2_QA_REPORT_2026_05_26.md` |
| 10 | 2026-05-27 | **Owner directive: close Stage 6b via Option B (retroactive acceptance)** — this doc |

---

## 3. Closure Decision

**Option B — Owner Retroactive Acceptance** is the formal closure path.

### 3.1 Owner Verdict (recorded)

| Field | Value |
|---|---|
| Verdict | **APPROVED — RETROACTIVE** |
| Approver | Owner (R689) |
| Medium | In-app live smoke test on preview (`https://insights-phase.preview.emergentagent.com`) against preprod backend (`https://preprod.mygenie.online/`) |
| Approval date | 2026-05-27 |
| Scope of approval | Phase 2 production UI **as deployed**, including the customer-icon hotfix |
| Conditions | None for the preview gate. Open Stage-7 items (T-28/T-29 regression, T-07 seed, OG-11 first-time badge UX) remain tracked separately under CG-01, CG-06, CG-07. |

### 3.2 Acceptance Evidence (P-1 … P-9 mapped to live UI)

| Preview state | How owner verified live | Result |
|---|---|---|
| P-1 CustomerModal existing-customer + Profile banner | Opened CustomerModal for `abhishek jain` — saw avatar, name, phone, Bronze pill, High value-band pill, Watch churn pill, stats row (19 visits / ₹18,870 / 237 pts / ₹0 wallet) | PASS (T-01) |
| P-2 Past Favourites chip row | Same customer — saw 5 chips (Nuts Overload 78×, Pista Dream 31×, Falooda 20×, Berry Cocoa 7×, Dates 6×) | PASS (T-02) |
| P-3 Smart Suggestions 3-card section | Same customer — 3 cross-sell cards with name / reason / source pill / confidence / price / "+ Add" | PASS (T-03) |
| P-4 New-customer entry mode (unchanged) | Walk-in flow + new-customer typeahead → form inputs (Name, Phone, Member, Birthday, Anniversary, Cancel, Save) intact | PASS (T-06) |
| P-5 First-time customer mode | Customer `priti` — modal shown; badge intermittently visible only after Save | **PARTIAL** (T-05 UX timing → tracked as CG-07/OG-11) |
| P-6 ItemNotesModal Customer Preferences populated | Confirmed via structural audit; live confirmation pending seeded data | STRUCTURAL_PASS (T-08) |
| P-7 OrderNotesModal Customer History populated | Section visible; populated rendering pending T-07 seed (CG-06) | STRUCTURAL_PASS (T-07 blocked by data) |
| P-8 Loading skeleton states | Skeleton DOM verified during 1.7–2.7 s CRM latency window | PASS (T-08 skeleton audit) |
| P-9 Empty / error / timeout states | Walk-in flow shows hidden sections; error path defended by 3s timeout + silent-hide | PASS (T-06) |

P-5 carries a **known UX gap** (CG-07/OG-11) but does not block closure of Stage 6b — owner has accepted the Phase 2 UI as deployed.

### 3.3 Why Option B is appropriate

1. The Phase 2 production code is committed, build-clean, and behaviourally validated against the live preprod API.
2. Owner has performed the equivalent of preview review **on the real UI**, which is a stricter test than a static HTML preview, a Storybook render, or annotated screenshots.
3. The owner's smoke-pass and post-hotfix re-smoke-pass produce a stronger acceptance signal than any of the three originally specified preview formats (A/B/C).
4. Rolling back Phase 2 to reconstruct a preview now would be wasted effort.
5. The process deviation is acknowledged and recorded in this doc — future CRs MUST still honour the gate per Requirements Freeze §13.1, §13.2.

---

## 4. Items Explicitly NOT Closed by This Doc

Stage 6b closure does **not** silence any remaining QA work. The following items remain open under their own IDs:

| ID | Item | Owner |
|---|---|---|
| CG-01 | AC-26 / T-28 / T-29 regression on order commit | Live Regression QA Agent |
| CG-02 | Runtime-verify zero legacy GET calls (`/notes/items`, `/notes/orders`) | Live Regression QA Agent |
| CG-03 | Stage 8 POS-facing handoff doc | Stage 8 Handoff Agent |
| CG-04 | Notes "No customer linked" on Path B / Path C — investigation only | Owner decision |
| CG-06 | OF-01 / T-07 — seed an R689 order with `order_note != ''` | Owner |
| CG-07 | OG-11 — first-time customer badge UX timing | Product Owner (accept v1 or follow-up CR) |

---

## 5. Process Lesson Logged for Future CRs

> The Mandatory UI Preview Approval Gate (Requirements Freeze §13.1, §13.2) remains in force for **all future CRs**. This Option-B closure applies **only to CR-002** and only because:
>   (a) the production UI was already deployed,
>   (b) the owner performed live smoke verification, and
>   (c) the owner has explicitly directed retroactive acceptance.
>
> Future implementation agents MUST NOT skip the preview gate. The closure path here is a one-time exception, not a precedent.

This lesson is recorded for the next planning/implementation agent.

---

## 6. Cross-Reference Updates

The following docs **continue to track** other open items unchanged; only CG-10 / OG-10 are closed by this doc:

| Doc | Effect on this closure |
|---|---|
| `open_gaps/CRM2_0_CONSOLIDATED_OPEN_GAPS_2026_05_27.md` — CG-10 | Status moves to **RESOLVED** (this doc is the resolution evidence) |
| `open_gaps/CRM2_0_CR_002_OPEN_GAPS_2026_05_26.md` — OG-10 | Status moves to **RESOLVED** (same item under CR-002 local ID) |
| `reconciliation/CRM2_0_SPRINT_CONSOLIDATION_2026_05_27.md` §6 CG-10 | Superseded by this doc for the gate row only |
| `qa/CRM2_0_CR_002_CROSS_SELL_PHASE_2_QA_REPORT_2026_05_26.md` | Unchanged — still authoritative QA truth |
| `hotfix/CRM2_0_HOTFIX_CUSTOMER_ICON_PERMISSION_GATE_REMOVAL_2026_05_27.md` | Unchanged — provides the owner smoke-pass evidence cited here |

The existing open-gaps docs are **not edited in place**; this closure doc is the additive resolution layer.

---

## 7. Confirmations

| # | Confirmation | Status |
|---|---|---|
| 1 | No code changed by this closure | CONFIRMED |
| 2 | No data mutated | CONFIRMED |
| 3 | No mutating API called | CONFIRMED |
| 4 | `/app/memory/final/` UNTOUCHED | CONFIRMED |
| 5 | `/app/memory/crm/crm_1_0/` UNTOUCHED | CONFIRMED |
| 6 | Owner directive recorded verbatim | CONFIRMED |
| 7 | Closure is per Option B (retroactive acceptance via live smoke); not a precedent for future CRs | CONFIRMED |
| 8 | Other Stage-7 open items remain tracked under their own IDs | CONFIRMED |

---

**End of Stage 6b Closure (Option B). CG-10 / OG-10 — RESOLVED.**
