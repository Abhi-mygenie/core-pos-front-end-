# HANDOVER — QA Nov Sprint Results → Registry Update + Triage

**From:** QA/Deploy agent (E1)
**Date:** 2026-11-18
**Build under test:** `main @ b06d919` (deployed into /app as-is; frontend on preview URL → preprod backend)
**Note on scope:** Remote `main` has since advanced to `1ea92059` (20 commits ahead). **CR-552 and BUG-630 are NOT in the tested build** (they live only in newer `main`) — treat them as OUT OF SCOPE for this QA pass.
**Companion file in this zip:** `QA_REPORT_NOV_SPRINT_2026_11_18.md` (full per-item evidence).

---

## YOUR TASKS (next agent), in order

### STEP 1 — Update the registry per this QA
Open `memory/control/registry.json` and set each item's QA outcome using the table in §A below.
- Items that PASSED QA → mark Gate 5b QA = PASS.
- Items BLOCKED only by missing prerequisites (no waiter login / no live web order / write-permission) → mark QA = BLOCKED (prereq) — **code is implemented**, do not regress their 5A status.
- Items with defects → mark QA = FAIL and link the defect ID (BLOCKER-1 / MAJOR-2 / SPEC-CR528).
- CR-552, BUG-630 → mark QA = NOT IN TESTED BUILD (out of scope; present in newer main).
- Do NOT edit any application code in this step. Registry/docs only.

### STEP 2 — Present triage to the user and ask where to start
Show the user ALL findings grouped by severity (full lists in §B: Blocker, Major, Functional/Spec, Minor). Then ask the user **which one they want to start fixing from** — do not start fixing on your own. Wait for their choice.

### STEP 3 — After a fix lands, run the Re-QA protocol in §C
The two code bugs below are **already present in this branch** (the tested build) and are the ones that must be fixed here:
- **BLOCKER-1** — CartPanel `onEdit` crash on add-to-cart.
- **MAJOR-2** — dashboard drops running orders after login.

When EITHER of these is fixed, do NOT just re-check the single item. Follow §C: first confirm every prerequisite is in place, then re-run the **entire affected batch** of QA.

---

## §A — Registry update table (QA outcome per item)

| ID | QA outcome | Set in registry |
|----|-----------|-----------------|
| CR-493 | PASS | Gate 5b QA PASS |
| BUG-670 | PASS | Gate 5b QA PASS |
| BUG-674 | PASS | Gate 5b QA PASS |
| BUG-675 | PASS | Gate 5b QA PASS |
| CR-524 | PASS | Gate 5b QA PASS |
| CR-372-B | PASS | Gate 5b QA PASS |
| CR-521 | PASS | Gate 5b QA PASS |
| CR-394 | PASS | Gate 5b QA PASS |
| BUG-229 | PASS (note: extra ".com" appended to domain) | Gate 5b QA PASS + note |
| BUG-230 | PASS | Gate 5b QA PASS |
| BUG-669 | PASS (minor: add-on list no auto-refresh) | Gate 5b QA PASS + note |
| BUG-673 | PASS (caveat: keyboard mode may be off for outlet) | Gate 5b QA PASS + note |
| BUG-677 | PASS (note: `join_restaurant` emitted twice on reconnect) | Gate 5b QA PASS + note |
| BUG-667 | PASS (code review only — name too short to show truncation) | Gate 5b QA PASS (code-review) |
| CR-551 | FAIL — BLOCKED by BLOCKER-1 (crash on add-to-cart) | Gate 5b QA FAIL → BLOCKER-1 |
| BUG-647 | BLOCKED-UI by BLOCKER-1 (fix code present in orderTransform.js) | QA BLOCKED (blocked by BLOCKER-1) |
| BUG-683 | BLOCKED-UI by BLOCKER-1 (code present) | QA BLOCKED (blocked by BLOCKER-1) |
| BUG-678 | BLOCKED-UI by BLOCKER-1 (code present) | QA BLOCKED (blocked by BLOCKER-1) |
| BUG-684 | PARTIAL/UNVERIFIED (Collect Bill button disabled; could not compare) | QA PARTIAL |
| CR-526 | BLOCKED (needs self-created order; write perm) | QA BLOCKED (prereq) |
| BUG-671 | BLOCKED (needs self-created order) | QA BLOCKED (prereq) |
| BUG-672 | BLOCKED (needs self-created order) | QA BLOCKED (prereq) |
| CR-523 | NOT EXECUTED (code present OrderEntry.jsx:1108) | QA NOT RUN |
| CR-528 | PARTIAL — SPEC MISMATCH (see SPEC-CR528) | QA FAIL → SPEC-CR528 |
| CR-545 | BLOCKED (no live web/APS order) — IMPLEMENTED | QA BLOCKED (prereq), code OK |
| BUG-679 | BLOCKED (no live web order) — IMPLEMENTED | QA BLOCKED (prereq), code OK |
| CR-515 | BLOCKED (no waiter login) — IMPLEMENTED | QA BLOCKED (prereq), code OK |
| CR-492 | BLOCKED (no waiter login) — IMPLEMENTED (FE); backend enforcement pending | QA BLOCKED (prereq) + backend-gap note |
| CR-503 | NOT EXECUTED (code present) | QA NOT RUN |
| CR-405 | NOT EXECUTED (needs palmhouse data + write perm) | QA NOT RUN |
| CR-552 | NOT IN TESTED BUILD (only in newer main) | OUT OF SCOPE this pass |
| BUG-630 | NOT IN TESTED BUILD (only in newer main) | OUT OF SCOPE this pass |

---

## §B — Triage to present to the user (ALL severities)

### 🔴 BLOCKER
- **BLOCKER-1 — Add-to-cart crashes Order Entry.** `ReferenceError: onEdit is not defined`. `frontend/src/components/order-entry/CartPanel.jsx` renders `onEdit={onEdit}` (line ~1353) but the main CartPanel props block (~line 811) never destructures `onEdit` (it has `onCustomize` only). `OrderEntry.jsx:2964` passes `onEdit` in. Fix: add `onEdit,` to CartPanel props. Gates CR-551 + all new-order creation (BUG-647/683/678, SC+GST, CR-526/BUG-671/672). **Present in remote `main` too.**

### 🟠 MAJOR
- **MAJOR-2 — Dashboard drops all running orders after login (~60-70% of logins).** `frontend/src/hooks/useOrderPollingReconciliation.js:275-281`: on a rejected running-orders fetch it treats server=0 and removes every local order (observed server=0, local=53 → 53 removals). Refresh doesn't recover; full reload does. Fix: skip reconcile when `posResult.status === 'rejected'`.

### 🟡 FUNCTIONAL / SPEC
- **SPEC-CR528 — Audit Log doesn't match handover spec.** Rendered as 4 KPI cards + 3 collapsible cards (newer CR-546 design) instead of 3 event *tabs*; "Leakage After Print" shows 11 events in 7 columns vs spec's 10-column table. Needs spec reconciliation (CR-528 vs CR-546) before any code change.

### 🟢 MINOR / COSMETIC
- **MINOR-1 (BUG-677 note)** — `join_restaurant` emitted twice after socket reconnect (double ack).
- **MINOR-2 (BUG-229 note)** — auto-generated employee email gets an extra `.com` (e.g. `testqa@rubyzap.com`).
- **MINOR-3 (BUG-669 note)** — add-on list does not auto-refresh right after creating an add-on.
- **MINOR-4 (CR-528 note)** — some Audit Log TIME cells clipped at `"2026-"`.
- **MINOR-5** — "New version available" banner shows on every page.
- **MINOR-6** — login-page logo renders blank.
- **MINOR-7** — direct URL after fresh login routes through `/loading` for >10s.

---

## §C — Re-QA protocol (run after BLOCKER-1 and/or MAJOR-2 are fixed)

These two bugs are already in this branch. Once a fix is merged, **a single-item re-check is NOT enough** — re-QA the whole affected batch, because these bugs blocked or distorted many items around them.

**Step C1 — Pre-flight: confirm EVERYTHING needed is in place BEFORE re-QA.** Do not start re-testing until all of these are verified present/working:
- [ ] Logins valid: owner@ruby.com, owner@palmhouse.com (see test_credentials.md).
- [ ] **Waiter sub-account** available (required for CR-515, CR-492 rights tests).
- [ ] At least one **live web order** + one **APS ₹1 web order** on preprod (required for CR-545, BUG-679).
- [ ] **Write permission** / safe test data on palmhouse (required for CR-405 and for cancel/credit write actions CR-526, BUG-671, BUG-672).
- [ ] **Firebase keys** present in the secret panel if push/FCM/ringer are to be tested (else keep them HIGHLIGHTED-SKIPPED).
- [ ] Backend (preprod) reachable and the build serving on the preview URL.
If any prerequisite is missing, request it from the user first; mark dependent items BLOCKED rather than FAIL.

**Step C2 — Which batches to re-run fully after each fix:**
- **BLOCKER-1 fixed →** re-run the WHOLE of **Batch 3** (CR-551), **Batch 2** (BUG-647, BUG-683, BUG-678, BUG-684 + the tax-ON SC+GST regression), and the write-action items in **Batch 1** (CR-526, BUG-671, BUG-672) — all of these needed new-order creation that the crash blocked.
- **MAJOR-2 fixed →** re-run dashboard + running-orders flows and any order-entry flow that reads running orders (Batches 3, 4 dashboard, and the Batch 1 order-state actions), confirming orders are no longer wiped on login across ~10 logins.

**Step C3 — Record results** into a new report `memory/test_reports/QA_REPORT_NOV_SPRINT_<BATCH>_RETEST_<date>.md` and update the registry QA outcomes again. Do not close an item as PASS until its full batch passes with all prerequisites satisfied.

---

## Credentials / prerequisites for retest
- owner@ruby.com / Qplazm@10 (CRM/general); owner@palmhouse.com / Qplazm@10 (rooms/F&B). See `memory/test_credentials.md`.
- Still needed to clear BLOCKED items: a **waiter sub-account** (CR-515, CR-492), a **live web + APS(₹1) order** on preprod (CR-545, BUG-679), and **write permission on palmhouse** (CR-405).
- Firebase push/FCM/ringer were HIGHLIGHTED-SKIPPED (keys pending in secret panel).

## Rules carried over
- This is QA/triage only. **No application code edits** without explicit user approval. Deploy must stay as-is.
