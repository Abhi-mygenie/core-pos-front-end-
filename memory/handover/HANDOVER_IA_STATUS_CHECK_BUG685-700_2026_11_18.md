# HANDOVER — Impact Analysis (Gate 2) status check for the 16 QA Nov Sprint bugs

**Date:** 2026-11-18
**From:** PLANNING agent (Gate 2 session)
**To:** Next agent (PLANNING — Impact Analysis)
**Scope:** The 16 bugs registered on 2026-11-18 → **BUG-685 … BUG-700**.
**Source of truth:** `memory/control/registry.json` (field `status`; `impact_doc` when IA exists).

---

## Your task (in order)

1. **Verify IA (Gate 2) status** for all 16 bugs below against `registry.json`.
   - "IA done" = `status == GATE_2_IA_COMPLETE` AND an `impact_doc` is linked.
2. **For every bug where IA is NOT done → run Gate 2 (Impact Analysis)** following the PLANNING role in `memory/control/AGENT_PROMPT_ALPHA.md` (Role 2 → Step 0 Code Reality, Step 1 Conflict Pre-Check, Step 2 Gate 2 Impact Analysis). **Stop after Impact Analysis — do NOT write the Implementation Plan (Gate 3).**
3. Write each IA to `memory/impact/<ID>_IMPACT_ANALYSIS.md` (or a grouped doc for same-file/related bugs — see note), set each bug `status = GATE_2_IA_COMPLETE`, link its `impact_doc`, add a `BUG_TRACKER.md` line, and bump `meta`.
4. **Rules:** QA/triage/planning only — **no application code edits** without explicit owner approval. Keep the deploy as-is.

---

## A. IA ALREADY DONE — 6 bugs (do NOT re-plan)

All covered by the combined doc `memory/impact/AUDIT_REPORT_QA_BUGS_695-700_IMPACT_ANALYSIS.md` (status `GATE_2_IA_COMPLETE`):

| ID | Sev | Area |
|----|-----|------|
| BUG-695 | MINOR | Audit Report — Card 1 nested `<button>` |
| BUG-696 | MAJOR | Audit Report — 30D/FY load timeout (insights-dashboard) |
| BUG-697 | MINOR | Audit Report — active preset highlight mismatch |
| BUG-698 | MINOR | Audit Report — FY preset (no shared range + prev-FY) |
| BUG-699 | MINOR | Audit Report — stale data under error shield |
| BUG-700 | MINOR | Audit Report — empty-state missing testids |

**Open owner decisions from that IA (still unanswered — don't block Gate 2 for the others, but flag):** OD-696-01 (max wait 90s/120s?), OD-698-01 (FY = current or previous?), OD-699-01 (blank vs label stale data?), plus a backend brief to Gyan for the `insights-dashboard` latency.

---

## B. IA NOT DONE — 10 bugs → RUN GATE 2 FOR THESE

All are `status = GATE_1_INTAKE_COMPLETE`, no `impact_doc`. Each has an intake doc in `memory/change_requests/`. Assignee: Abhishek. Sprint: `nov_cr_batch`.

| ID | Sev | Title | Primary file(s) to trace | Intake doc |
|----|-----|-------|--------------------------|-----------|
| **BUG-685** | **BLOCKER** | Add-to-cart crash — `onEdit` undefined (incomplete CR-551) | `components/order-entry/CartPanel.jsx` (~L811 props, ~L1353 render); `OrderEntry.jsx:2964` | `BUG-685_ORDER_ENTRY_ADD_TO_CART_ONEDIT_CRASH_INTAKE.md` |
| **BUG-686** | **MAJOR** | Dashboard drops running orders on login | `hooks/useOrderPollingReconciliation.js:275-281` | `BUG-686_DASHBOARD_DROPS_RUNNING_ORDERS_ON_LOGIN_INTAKE.md` |
| **BUG-687** | **MAJOR** | Audit Log spec mismatch (CR-546 vs CR-528) | `pages/reports-module/AuditLogMockup.jsx` | `BUG-687_AUDIT_LOG_SPEC_MISMATCH_CR528_INTAKE.md` |
| **BUG-688** | MINOR | `join_restaurant` double-emit on reconnect | socket reconnect layer (to trace) | `BUG-688_JOIN_RESTAURANT_DOUBLE_EMIT_RECONNECT_INTAKE.md` |
| **BUG-689** | MINOR | Auto-gen employee email extra `.com` | employee email generator (to trace) | `BUG-689_AUTOGEN_EMPLOYEE_EMAIL_EXTRA_DOTCOM_INTAKE.md` |
| **BUG-690** | MINOR | Add-on list no auto-refresh after create | add-on management screen (to trace) | `BUG-690_ADDON_LIST_NO_AUTO_REFRESH_INTAKE.md` |
| **BUG-691** | MINOR | Audit Log TIME cells clipped at "2026-" | `pages/reports-module/AuditLogMockup.jsx` (drill-down time cell ~L147 `fmtTime`) | `BUG-691_AUDIT_LOG_TIME_CELLS_CLIPPED_INTAKE.md` |
| **BUG-692** | MINOR | "New version available" banner on every page | PWA update banner / app shell (to trace); related BUG-661 | `BUG-692_NEW_VERSION_BANNER_ON_EVERY_PAGE_INTAKE.md` |
| **BUG-693** | MINOR | Login-page logo blank | login page logo asset (to trace) | `BUG-693_LOGIN_PAGE_LOGO_BLANK_INTAKE.md` |
| **BUG-694** | MINOR | Post-login `/loading` stall >10s | boot/routing `/loading` gate (to trace) | `BUG-694_POST_LOGIN_LOADING_ROUTE_SLOW_INTAKE.md` |

### Notes before you plan
- **BUG-687** is NOT a code defect per the CR-528/CR-546 QA (QA report `memory/test_reports/CR-528_CR-546_QA_REPORT_2026-11-18.md`): the page matches the LOCKED v3 design (`memory/design/AUDIT_REPORT_DESIGN_DECISIONS_LOCKED_2026_11_17.md`); the "mismatch" was vs the stale CR-528 plan. For Gate 2, confirm with owner whether to **reconcile/close BUG-687** rather than plan a code change.
- **BUG-691** is on the **same file** as the already-planned BUG-695…700. Either fold its IA into the existing `AUDIT_REPORT_QA_BUGS_695-700_IMPACT_ANALYSIS.md` or write a short standalone IA that references it; flag the same Gate-3 batching/sequencing (apply all `AuditLogMockup.jsx` edits in one pass, bottom-up). In v3 the time cell uses `fmtTime` (HH:MM) at L147 — verify at HEAD whether the "2026-" clip still reproduces.
- **BUG-685 / 686** are the two active code bugs in this branch (BLOCKER + MAJOR). Code reality: both confirmed; fixes are known (see intake docs). Still produce a proper Gate-2 IA (data-flow trace, conflict pre-check, blast radius, verification matrix seeds). Do NOT fix code at Gate 2.
- For the "to trace" bugs (688/689/690/692/693/694), Step 0 Code Reality must locate the real source before planning — intake docs list symptoms, not confirmed root files.

---

## C. Environment / credentials (if you need the live app)
- PLANNING/Gate 2 does **not** require the live app, but if you verify UI: deployed preview frontend + external preprod backend.
- Test accounts in `memory/test_credentials.md` (gitignored): `owner@ruby.com`, `owner@palmhouse.com`, `owner@cafe103.com` — all `Qplazm@10`. (cafe103 = Audit Report, but it has 0 post-print events; wide ranges time out — see BUG-696.)

## D. Definition of done for your session
- All 10 Gate-1 bugs (B above) have `status = GATE_2_IA_COMPLETE` + linked `impact_doc`, OR a documented reason they can't be planned yet (e.g., BUG-687 pending owner close decision).
- `BUG_TRACKER.md` + `registry.json` `meta` updated. `registry.json` stays valid JSON.
- **Stop at Gate 2.** Hand back: "Impact Analysis complete for N items. Awaiting owner review → Gate 3." List any new owner decisions.

---

**Quick status check command:**
```bash
cd /app/memory/control && python3 -c "import json;d=json.load(open('registry.json'));b={i['id']:i for i in d['items']};[print(f'BUG-{n}',b[f'BUG-{n}']['status'],b[f'BUG-{n}'].get('impact_doc','-')) for n in range(685,701)]"
```
