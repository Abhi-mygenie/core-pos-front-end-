# Baseline Consolidation Report — 2026-05-31

**Trigger:** POS 4.0 consolidation (all prior sprints closed; single backlog opened)
**Scope:** Promote truly-done work into the frozen baseline; record what is NOT yet frozen.

---

## 1. Dated diff — what changed this session
| Item | From | To |
|---|---|---|
| BUG-097 (main) | SHIPPED, smoke pending | MAIN VERIFIED (25-row smoke PASS) |
| AUDIT-CLOSURE-DRIFT-001 | DELIVERED, G-2 pending | CLOSED — OWNER VERIFIED |
| CR-002 (CRM 2.0) | CODE-COMPLETE | CLOSED — OWNER VERIFIED (T-28/T-29 live PASS) |
| POS2-002 | Investigation complete | CLOSED — resolved via CR |
| POS2-005-FU §B | Investigation complete | CLOSED — as designed (keep cross-tab) |
| POS2-006 | Investigation complete | DEFERRED → POS 4.0 |
| Sprints POS 2.0/3.0/3.1/CRM 2.0 | mixed open tails | CLOSED; tails → POS 4.0 backlog |
| Deployment | branch `29-may` | branch `30-may` (build/run verified) |

## 2. Promoted to baseline (frozen)
- All SHIPPED + OWNER-VERIFIED bugs/CRs from POS 2.0 / 3.0 / 3.1 (already 7/7-artifact closed).
- CR-002 commit-payload contract: `order_note` / `food_level_notes` confirmed unchanged
  from the BUG-108 baseline (live + code evidence). Note modals emit `{label}`-shaped notes.
- Legacy note GETs (`/notes/items`, `/notes/orders`) confirmed removed (OG-06).

## 3. NOT yet frozen — separate promotion track (5-step gate)
The **12 unfrozen business rules** remain outstanding (TIP-003, ROUND-001 + 10 Part B rules promoted 2026-05-31). They are NOT auto-consolidated.
Each requires: code fixed → verified → owner reconfirms → bug closed → dated diff entry.
- Part A: rejected rules TIP-003 / ROUND-001 need code fixes.
- Parts B/C/D: need owner re-confirmation.
- Reference: `BUSINESS_RULES_BASELINE_FINAL.md` (44 of 56 frozen).

## 4. Open gaps after consolidation
- OG-02, OG-06 → CLOSED this session.
- Remaining open gaps roll into POS 4.0 Bucket C (blocked) — see
  `change_requests/PHASE_4_CONSOLIDATED_BACKLOG_2026_05_31.md`.

## 5. Follow-up (tooling debt) — RESOLVED 2026-05-31 (POS4-TOOL-001)
- The `/__dev/` dashboard data JSONs are now a **pure derivative** of a single source of truth
  (`control/registry.json`) via `scripts/gen_dashboard_data.js`. Cross-tab drift and BUG-*
  duplication are no longer possible. Run `--check` to lint for drift.
- `closure_debt.json` is now **QA-driven** (POS4-QA-001 model, see `CODE_GATE_POLICY.md`):
  Code-Gate waived pre-Phase-4, POS 4.0 excluded, QA missing = active debt.
  Outcome: **32 raw rows → 19 active QA-backfill items** (11 QA-satisfied, 2 POS 4.0 deferred).
- Next: QA Phase `POS4-QA-001` backfills the 19 → target `active_count = 0`.
  Brief: `POS4_QA_001_QA_BACKFILL_BRIEF_2026_05_31.md`.

---

## 6. Code-Verified Baseline Promotion (2026-05-31, Option A)

**Trigger:** P0 of `NEXT_AGENT_HANDOVER_2026_05_31.md`, executed under owner directive **Option A —
code-verified promotion** (the actual application code is the final source of truth, not doc/attestation).

**Code anchor:** branch `31may-for-baseline`, commit `8f92e8c`, working tree `/app/frontend/src`.

### Dated diff — what changed this session
| Item | From | To |
|---|---|---|
| POS 2.0 / POS 3.0 / POS 3.1 / CRM 2.0 | CLOSED (doc/owner-attested) | **CLOSED + FROZEN (code-verified)** |
| `sprints_meta.pos_3_1` | ACTIVE | CLOSED (+`frozen: true`) |
| `sprints_meta.crm_2_0` | ACTIVE | CLOSED (+`frozen: true`) |
| `sprints_meta.pos_2_0` / `pos_3_0` | CLOSED | CLOSED (+`frozen: true`) |
| `registry.json` | — | +top-level `baseline_code_verification` block (per-item file:line evidence) |

### Verification result
- **13 verification rows PASS** → 12 distinct promotable FE-footprint items (OG-06 is a sub-check of CR-002)
  confirmed in code (file:line) — 0 silent reversals, 0 mismatches.
  Anchors include BUG-097 (`profileTransform.js:127`, `TableCard.jsx:70`), CR-002 (`orderTransform.js:602,882`),
  POS2-003-REOPEN-B (`constants.js:59`), BUG-111 (`CartPanel.jsx:365,499`), PROD-HOTFIX-008 (`orderService.js:145`).
- Closed **backend/owner-attested** items (e.g. PROD-002 print guard, CR-002 live T-28/T-29) frozen on
  owner-smoke evidence, explicitly labelled (no FE surface to verify in this repo).
- **Not promoted:** subsumed/backend-blocked/deferred items (stay in POS 4.0 backlog); the 12 unfrozen
  business rules (separate 5-step gate).

**Full evidence:** `control/BASELINE_CODE_VERIFICATION_REPORT_2026_05_31.md`.
**Generator re-run + `--check`:** clean (no drift).


---

## 7. Business Rule Promotion — Part C + Part D (2026-06-01)

**Trigger:** Continue the unfrozen business rule promotion gate. Part A cleared, Part B 10/15 done on
2026-05-31. Now verify Part C deferred rules and Part D verification gates using Option A (code = source of truth).

**Code anchor:** branch `1-june`, commit `a7e29eb`.

### Dated diff — what changed this session
| Item | From | To |
|---|---|---|
| PAY-006 (Transfer to Room) | DEFERRED (Part C) | FROZEN — code-verified against owner payload |
| TOTALS-004 (Room Grand Total) | DEFERRED (Part C) | FROZEN — code-verified |
| DASH-004 (Web vs POS counter) | PENDING (Part D) | FROZEN — code-verified |
| PRINT-001 (printer_agent 5 types) | PENDING (Part D) | FROZEN — code-verified |
| PRINT-002 (BILL excluded from KOT) | PENDING (Part D) | FROZEN — code-verified |
| Frozen business rules | 44 | **49** |
| Pending business rules | 12 | **7** |

### Remaining 7 unfrozen rules (all externally blocked)
- **5 Part B:** TAX-007 (live-print), SCAN-003 (owner parked), PAY-009 (note-only), POLL-003 (backend), ROOM-002 (owner parked)
- **1 Part C:** SC-004/PAY-005 (owner evidence needed)
- **1 Part D overlap:** PAY-007 (backend `'sucess'` typo confirmation)

**Evidence:** `control/BUSINESS_RULE_PROMOTION_PARTC_PARTD_2026_06_01.md`.
