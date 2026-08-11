# POS4-QA-001 — QA Backfill Phase Brief

**Created:** 2026-05-31
**Owner:** QA Agent (next phase)
**Source of truth:** `control/registry.json` → `frontend/public/__dev/data/closure_debt.json` (field `active_debt: true`)
**Regenerate after any edit:** `node scripts/gen_dashboard_data.js` (then `--check` to confirm no drift)

---

## 1. Why this phase exists

The closure-debt register held 32 raw rows. After the POS 4.0 consolidation we agreed a
**QA-driven** debt model (see `CODE_GATE_POLICY.md`):

| Rule | Effect |
|---|---|
| (a) `registry_status` synced from `registry.json` | Dashboard always matches the registry |
| (b) Code-gate waiver (pre-Phase-4) | A missing / `WAIVED` Code-Gate is **NOT** debt |
| (c) POS 4.0 sprint items excluded | Deferred work is not counted as active debt |
| (d) QA-driven | An item is **active debt only if its QA artifact (art5) is not PRESENT** |

Net: **32 → 19 active items**. The other 13 are: **11 QA-satisfied** (already have QA) and
**2 POS 4.0 deferred** (`POS2-001`, `POS2-008 Phase 2`).

> Owner ruling 2026-05-31: items closed "AS DESIRED / OWNER VERIFIED" still need QA to leave
> the debt register — the Code-Gate was waived, **QA was not**.

**Goal of POS4-QA-001:** backfill the missing QA (and any incidental Intake/Impact/Plan/Smoke)
for the 19 items below so each reaches a clean closure and drops out of `active_debt`.

---

## 2. The 19 items (≈30.5 doc-hrs total)

### A. POS 2.0 tail (4)
| # | Sev | Item | Title | Registry status | Missing |
|---|---|---|---|---|---|
| 1 | HIGH | POS2-003-FU-02 | printer_agent null on Collect Bill | IMPLEMENTED | Intake, Impact, **QA (partial)**, Smoke |
| 2 | CRIT | POS2-005-FU §A | Collect-Bill hidden for status-8 | IMPLEMENTED | Intake, Plan, **QA**, Smoke |
| 10 | CRIT | POS2-003-REOPEN-B | v1→v2 place-order revert | CLOSED — VERIFIED | Intake, Impact, Plan, **QA**, Smoke |
| 11 | CRIT | POS2-005-FU §B | PG filter cross-tab | CLOSED — AS DESIGNED | Intake, Impact, Plan, **QA**, Smoke |

### B. POS 3.1 QSR parity (4)
| # | Sev | Item | Title | Registry status | Missing |
|---|---|---|---|---|---|
| 3 | MED | BUG-109 | QSR takeaway/delivery customer validation parity | CLOSED — IMPLEMENTED | Impact, **QA**, Smoke |
| 4 | MED | BUG-110 | QSR prepaid lock parity | CLOSED — IMPLEMENTED | Impact, **QA**, Smoke |
| 5 | MED | BUG-111 | QSR bill parity (Grand Total + breakdown) | CLOSED — IMPLEMENTED | **QA**, Smoke |
| 12 | CRIT | BUG-111 P1+P2 | Grand Total + server-driven breakdown | SHIPPED + VERIFIED | Intake, Impact, Plan, **QA**, Smoke |

### C. Production hotfixes (4)
| # | Sev | Item | Title | Registry status | Missing |
|---|---|---|---|---|---|
| 6 | MED | PROD-HOTFIX-004 | Walk-in cart not cleared on stay-on-order | SHIPPED | Intake, Impact, Plan, **QA (partial)**, Smoke |
| 7 | MED | PROD-HOTFIX-005 | Prepaid screen clear delay | SHIPPED | Intake, Impact, Plan, **QA (partial)**, Smoke |
| 8 | MED | PROD-007 | Loyalty earn points on Collect Bill | CLOSED — OWNER VERIFIED | Plan, **QA** |
| 9 | MED | PROD-008 | Manual KOT/Bill print custName/custPhone NULL | CLOSED — OWNER VERIFIED | Plan, **QA** |

### D. Standalone / Phase 3 (7)
| # | Sev | Item | Title | Registry status | Missing |
|---|---|---|---|---|---|
| 13 | CRIT | Audit Report Optimization | Transform rewrite + dual-mode sheet | SHIPPED | Intake, Impact, Plan, **QA**, Smoke |
| 14 | CRIT | Order Activity Log | Chronological activity feed per order | CLOSED — AS DESIRED | Intake, Impact, Plan, **QA**, Smoke |
| 15 | CRIT | PROD-HOTFIX-006 | Takeaway print: custPhone empty | CLOSED — AS DESIRED | Intake, Impact, Plan, **QA**, Smoke |
| 16 | CRIT | PROD-HOTFIX-007 | Loyalty earn points display | CLOSED — OWNER VERIFIED | Intake, Impact, Plan, **QA**, Smoke |
| 17 | CRIT | PROD-HOTFIX-008 | Manual KOT/Bill print custName/custPhone NULL | CLOSED — OWNER VERIFIED | Intake, Impact, Plan, **QA**, Smoke |
| 18 | CRIT | DEV-DASHBOARD-001 | Internal dev control dashboard (v1.0 + v1.1) | CLOSED — OWNER VERIFIED | Intake, Impact, Plan, **QA**, Smoke |
| 19 | CRIT | UX-LOADING-02 | Parallel API loading + visible station progress | CLOSED — AS DESIRED | Intake, Impact, Plan, **QA**, Smoke |

---

## 3. How the QA Agent should work each item

1. Open the row in `/__dev/` Closure Debt tab → expand for `existing_docs_path` + `artifact_refs`.
2. Write the missing **QA artifact** (Impl-Summary + QA-Report) against the live commit on
   branch `30-may`. For items already "OWNER VERIFIED", QA is a **retro evidence write-up**,
   not a re-test — capture what was verified and link the owner sign-off.
3. Backfill any incidental Intake / Impact / Plan / Smoke where cheaply available; otherwise
   note explicitly why it is waived (link `CODE_GATE_POLICY.md` for the Code-Gate waiver).
4. Update the item in `control/registry.json` (status + add `artifact_refs`), then set its
   closure-debt `art5_impl_summary_qa: "PRESENT"`.
5. Run `node scripts/gen_dashboard_data.js` and `--check`. The item should drop out of
   `active_debt` and the headline count should decrease.

**Definition of done for POS4-QA-001:** `closure_debt.json.active_count === 0`
(all 19 carry a PRESENT QA artifact), `--check` clean.

---

## 4. Constraints / gotchas

- **Do NOT hand-edit** `closure_debt.json` / `bug_tracker.json` / `cr_registry.json`. Edit
  `registry.json` and the `art*` fields, then regenerate.
- `OrderEntry.jsx` does not mount reliably under headless Playwright (known automation quirk) —
  prefer code-level evidence + owner payloads for any order-commit QA.
- Backend is external (`preprod.mygenie.online`); the in-pod `:8001` is unused.
- Live tenant for smoke evidence: `owner@kunafamahal.com` (tenant `kunafamahal`).
