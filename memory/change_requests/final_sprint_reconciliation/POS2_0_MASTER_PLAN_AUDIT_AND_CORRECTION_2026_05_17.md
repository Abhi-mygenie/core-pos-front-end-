# POS2.0 Master Implementation Plan — Audit & Correction — 2026-05-17

## 1. Purpose

This document records the cross-check audit of `POS2_0_MASTER_IMPLEMENTATION_PLAN_2026_05_17.md` against all Phase 1-4 source documents, and provides corrections.

No implementation was done. No code was changed. No baseline or pending-freeze docs were updated.

---

## 2. Audit Findings

### Finding 1 — CRITICAL: BUG-052 Dual Placement (Wave 2 AND Wave 7)

**Problem:**
BUG-052 appears in **two** places:
- Inventory table (L37): `Wave: W2` with status `candidate_with_constraints`
- Wave 2 section (L133): Listed as 6th bug with note "CONSTRAINT: identify exact field name"
- Wave 7 section (L256): Listed as 1st bug

BUG-052 is **counted twice** in Sprint Counts:
- "Implementable NOW (Waves 1-6): 22" → includes BUG-052 via Wave 2
- "Constraint resolution (Wave 7): 3 — BUG-052, 060, 061" → also includes BUG-052

**Root cause:** BUG-052 has a minor constraint (find the profile boolean field name) that can be resolved during Wave 2 code inspection. It was placed in Wave 2 with a constraint note, but was ALSO left in Wave 7's constraint-resolution list.

**Source of truth:** Phase 4 Backend Question Capture says owner answered "we are already using key, it's boolean yes/no." The constraint is a 5-minute `profileTransform.js` grep, not a major investigation. Wave 2 placement (after BUG-051) is correct.

**Correction:** Remove BUG-052 from Wave 7. Keep in Wave 2 only. Update Sprint Counts.

---

### Finding 2 — MEDIUM: BUG-058 Missing from Sprint Count

**Problem:**
Wave 7 section (L259) lists BUG-058, but Sprint Count (L80) says "Constraint resolution (Wave 7): 3 — BUG-052, 060, 061" — BUG-058 is missing.

**Root cause:** BUG-058 has `qa_repro_required` status (runtime payload investigation) which is a different category from `candidate_with_constraints` (code inspection). It was included in Wave 7's body but not in the Sprint Count line.

**Correction:** After removing BUG-052, Wave 7 has 3 bugs: BUG-058, 060, 061. Sprint Count is coincidentally correct at "3" but the listed bugs must change.

---

### Finding 3 — LOW: BUG-052 Status Label Mismatch

**Problem:**
Inventory table says BUG-052 status is `candidate_with_constraints`, yet it's placed in Wave 2 ("Implementable NOW"). `candidate_with_constraints` implies the bug needs constraint resolution before entering a wave, but it IS in a wave.

**Correction:** Change BUG-052 status to `ready_for_master_plan_with_constraints` (same pattern as BUG-080) to reflect that it's plannable but has a trivial constraint to resolve during implementation.

---

### Finding 4 — LOW: BUG-072 Missing Constraint Note

**Problem:**
BUG-072 is in Wave 1 as "Add note fields to order card." Phase 4 Owner Decision Capture (Section 9) explicitly states: "The owner questions for BUG-072 were not asked in this session." The owner question about note taxonomy (display priority, formatting) was never asked.

**Why this is acceptable:** The owner answered the backend question (BQ-P4-08): "yes already showing on order screen, not showing on order card." This implicitly defines the implementation approach — mirror the order-screen note display on the order card. No new taxonomy decision needed.

**Correction:** Add a constraint note to BUG-072 in Wave 1: "Mirror the existing order-screen note format on the order card."

---

### Finding 5 — VERIFICATION: All "ready now" bugs actually unblocked

| Bug | Wave | Status In Master Plan | Phase Source | Owner Answer? | Backend Answer? | Actually Unblocked? |
|---|---|---|---|---|---|---|
| BUG-050 | W4 | ready_for_master_plan | Phase 4 | Yes (Option A: Collect Bill parity) | Not needed | **YES** |
| BUG-051 | W2 | ready_for_implementation | Phase 1 | N/A (clean safe) | N/A | **YES** |
| BUG-052 | W2 | candidate_with_constraints | Phase 4 | Yes (boolean field) | Answered by owner | **YES with constraint** (find field name) |
| BUG-054 | W2 | ready_for_implementation | Phase 1 | N/A | N/A | **YES** |
| BUG-055 | W2 | ready_for_implementation | Phase 1 | N/A | N/A | **YES** |
| BUG-056 | W3 | ready_for_master_plan | Phase 4 | Yes (dropdown, mutually exclusive) | Not needed | **YES** |
| BUG-057 | W4 | ready_for_master_plan | Phase 4 | Yes (Collect Bill + order screen) | Not needed | **YES** |
| BUG-059 | W4 | ready_for_master_plan | Phase 4 | Yes (Paid only, current perms) | Not needed | **YES** |
| BUG-062 | W1 | ready_for_implementation | Phase 1 | N/A | N/A | **YES** |
| BUG-066 | W1 | ready_for_master_plan | Phase 4 QA | Owner confirmed (order screen) | N/A | **YES** (root cause found) |
| BUG-067 | W1 | ready_for_master_plan | Phase 4 | Yes (disable toggle) | Not needed | **YES** |
| BUG-068 | W6 | ready_for_implementation | Phase 1 | N/A | N/A | **YES** |
| BUG-070 | W5 | ready_for_implementation | Phase 1 | N/A | N/A | **YES** |
| BUG-071 | W5 | ready_for_implementation | Phase 1 | N/A | N/A | **YES** |
| BUG-072 | W1 | ready_for_master_plan | Phase 4 Backend | Implicit (BQ-P4-08) | Answered by owner | **YES with note** (mirror order-screen format) |
| BUG-073 | W1 | ready_for_implementation | Phase 1 | N/A | N/A | **YES** |
| BUG-075 | W2 | ready_for_master_plan | Phase 2 | Yes (Option B: dine-in+walk-in+room) | Not needed | **YES** |
| BUG-078 | W1 | ready_for_master_plan | Phase 4 | Yes (toast, no retry, allow proceed) | Not needed | **YES** |
| BUG-079 | W1 | ready_for_master_plan | Phase 2 | Yes (Option B: 1-miss) | Not needed | **YES** |
| BUG-080 | W3 | ready_with_constraints | Phase 2 | Yes (Option B: UI enforce, keep 3 entries) | Answered by owner | **YES with constraint** (payload shape stable) |
| BUG-082 | W6 | ready_for_master_plan | Phase 3 | Yes (Q-082-O1) | All answered | **YES** |
| BUG-083 | W2 | ready_for_master_plan | Phase 3 | N/A (owner unparked Phase 3) | All answered | **YES** |

**Result: All 22 "implementable NOW" bugs are genuinely unblocked.** BUG-052 and BUG-072 have minor constraints documented.

---

### Finding 6 — VERIFICATION: Blocked/parked bugs are correctly blocked

| Bug | Master Plan Status | Blocker Verified Against Source | Correctly Blocked? |
|---|---|---|---|
| BUG-058 | qa_repro_required (W7) | Phase 4 Backend Capture: "endpoint confirmed, runtime payload check needed" | **YES** |
| BUG-060 | candidate_with_constraints (W7) | Phase 4 Backend Capture: "events fire but FE context not clearing" | **YES** — FE code inspection needed |
| BUG-061 | candidate_with_constraints (W7) | Phase 4 Owner Capture: "column exists, data not bound" | **YES** — FE field mapping inspection needed |
| BUG-063 | blocked_backend (Parked) | Phase 4 Backend Capture: "will provide runtime" | **YES** — owner will provide template mapping |
| BUG-064 | blocked_backend (Parked) | Phase 4 Backend Capture: "backend need to add this" | **YES** — backend must add marker |
| BUG-065 | blocked_backend (Parked) | Phase 4 Backend Capture: "will check with backend" | **YES** — parked for backend team |
| BUG-069 | blocked_backend (Parked) | Phase 4 Backend Capture: "will get back after asking backend" | **YES** — parked for backend team |
| BUG-084 | deferred | Phase 3 Question Capture: "defer — backend does not need per-component keys this sprint" | **YES** |
| BUG-085 | pending_backend (Parked) | Phase 3 Addendum: "Q-085-2 remains parked for backend team" | **YES** |

**Result: All blocked/parked bugs are correctly blocked.**

---

### Finding 7 — VERIFICATION: Closures are valid

| Bug | Closure Reason | Verified Against Source | Valid Closure? |
|---|---|---|---|
| BUG-053 | No hardcoded percentage | Phase 4 QA Repro: code inspection confirmed all rates from profile | **YES** |
| BUG-074 | Autofill attributes present | Phase 4 QA Repro: `autoComplete="email"` + `autoComplete="current-password"` found | **YES** |
| BUG-076 | Duplicate of BUG-051 | Reconciliation report + impact analysis both confirm | **YES** |
| BUG-077 | Mobile trim likely resolved | Reconciliation report: "no new planning unless owner reproduces" | **YES** (pending verify) |
| BUG-081 | Snooze already 120000ms | Reconciliation report + impact analysis confirm | **YES** (pending verify) |
| BUG-086 | Room key confirmed | Reconciliation report: code comment confirms 2026-04-25 | **YES** (pending verify) |

**Result: All 6 closures are valid.**

---

## 3. Corrections To Apply

### Correction 1: Remove BUG-052 from Wave 7

**In Section 3 (Inventory Table):**
- Change BUG-052 status from `candidate_with_constraints` to `ready_for_master_plan_with_constraints`
- Wave stays `W2`

**In Section 4 (Sprint Counts):**
- "Constraint resolution (Wave 7): 3" → change listed bugs from "BUG-052, 060, 061" to **"BUG-058, 060, 061"**
- "Implementable NOW (Waves 1-6): 22" → unchanged (BUG-052 stays in Wave 2)

**In Section 5, Wave 7:**
- Remove BUG-052 row from Wave 7 table
- Remove the "Note" about BUG-052 being in Wave 2
- Wave 7 now has 3 bugs: BUG-058, BUG-060, BUG-061

---

### Correction 2: Add BUG-072 constraint note to Wave 1

**In Section 5, Wave 1 table:**
- BUG-072 row: Change "Change Size" from "Additive display lines" to "Additive display lines — mirror order-screen note format"

---

### Correction 3: Fix Wave 7 title and content

**In Section 5, Wave 7:**
- Title stays "Constraint Resolution + Investigation"
- Table should have 3 rows: BUG-058, BUG-060, BUG-061 (not 4)
- Remove the BUG-052 note at the bottom of Wave 7

---

## 4. Corrected Wave Assignments (Final)

| Wave | Bugs | Count | Change From Original |
|---|---|---|---|
| W1 | BUG-062, 073, 066, 067, 079, 078, 072 | 7 | BUG-072 gets constraint note |
| W2 | BUG-051, 054, 055, 075, 083, 052 | 6 | BUG-052 status → `ready_for_master_plan_with_constraints` |
| W3 | BUG-080, 056 | 2 | No change |
| W4 | BUG-050, 057, 059 | 3 | No change |
| W5 | BUG-070, 071 | 2 | No change |
| W6 | BUG-068, 082 | 2 | No change |
| W7 | BUG-058, 060, 061 | 3 | **BUG-052 removed; BUG-058 now explicitly listed** |
| Parked | BUG-063, 064, 065, 069 | 4 | No change |
| Deferred | BUG-084 | 1 | No change |
| Pending | BUG-085 | 1 | No change |
| Closeable | BUG-053, 074, 076, 077, 081, 086 | 6 | No change |
| **Total** | | **37** | |

**Verification:** 7 + 6 + 2 + 3 + 2 + 2 + 3 + 4 + 1 + 1 + 6 = **37** ✓ (no double-counting)

---

## 5. Corrected Sprint Counts

| Category | Count | Bugs |
|---|---|---|
| Implementable NOW (Waves 1-6) | **22** | W1(7) + W2(6) + W3(2) + W4(3) + W5(2) + W6(2) |
| Constraint resolution / investigation (Wave 7) | **3** | BUG-058, 060, 061 |
| Blocked on backend | **4** | BUG-063, 064, 065, 069 |
| Deferred to future sprint | **1** | BUG-084 |
| Pending backend answer | **1** | BUG-085 |
| Closeable (no implementation) | **6** | BUG-053, 074, 076, 077, 081, 086 |
| **Total** | **37** | |

---

## 6. No Other Issues Found

The audit confirmed:
- All 22 "implementable NOW" bugs are genuinely unblocked (Finding 5)
- All blocked/parked bugs are correctly blocked (Finding 6)
- All 6 closures are valid (Finding 7)
- BUG-067 has owner answer (Q-P4-STANDALONE-02: disable toggle) — **valid in Wave 1**
- BUG-072 has implicit owner answer (BQ-P4-08: notes on order screen, add to card) — **valid in Wave 1 with constraint note**
- BUG-078 has owner answer (Q-P4-STANDALONE-03: toast, no retry, allow proceed) — **valid in Wave 1**
- Dependency chain is correct: W2→W3→W4 sequential; W1/W5/W6 independent
- File touch map is accurate
- Business rules protection checklist covers all applicable rules

---

## 7. Final Status

`master_plan_audit_complete_corrections_identified`

- **3 corrections identified** (1 critical, 2 low)
- **0 wave reassignments** needed (only cleanup)
- **All 22 "ready now" bugs** confirmed genuinely unblocked
- **All blocked/parked/deferred/closed** bugs confirmed correct
- Total bug count: 37 — no missing, no duplicates after correction

---

*— End of Master Plan Audit & Correction —*
