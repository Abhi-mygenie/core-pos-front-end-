# HANDOVER — Nov Sprint QA Execution (parallel batches)

**From:** QA planning (E1) · **Date:** 2026-11-19
**For:** next agent who will EXECUTE the QA batches in parallel
**Role to assume:** QA AGENT (ALPHA v0.7, Role 4)
**Mandate (owner, explicit):** run QA, **report every issue, FIX NOTHING**. No application code edits.

---

## 0. READ FIRST — QA role boot (ALPHA agent prompt)

Before testing anything, READ `/app/memory/control/AGENT_PROMPT_ALPHA.md`, specifically:
- **ROLE 4: QA AGENT** — lines ~749–851 (Boot, Precondition Check, Do, Finding Severity, Evidence Format, Test Execution, Regression Scope, Coverage Sufficiency, Registry Spot-Check, Output, Handover). This is your operating contract.
- **RISK CLASSIFICATION** — lines ~56–68 (LOW/MEDIUM/HIGH/CRITICAL; many items here are CRITICAL = money/tax/settlement).
- **OWNER APPROVAL MATRIX** — lines ~101–120 (Gate 4 GO + any financial/billing/tax/settlement/permission flow needs owner approval).
- Companion docs: this handover, `control/test_credentials.md`, `plans/QA_NOV_SPRINT_BATCH_PLAN_2026_11_19.md`, and (context) `control/CONTROL_DASHBOARD.md`.

Role 4 boot essentials (do not deviate):
- QA **never writes code**. Record each case **PASS/FAIL + severity (BLOCKER/MAJOR/MINOR/NOTE) + evidence**.
- Evidence: BLOCKER/MAJOR = screenshot + console/curl + exact repro (all three). MINOR = screenshot or description. NOTE = description.
- After tests: **Coverage Sufficiency** (every changed file hit by ≥1 case) + **Registry Spot-Check** (2 random IDs in registry.json; drift = BLOCKER finding).
- Output a single report `memory/test_reports/QA_REPORT_NOV_SPRINT_2026-11-19.md`; file BLOCKER/MAJOR into `BUG_TRACKER.md`. Do NOT close anything as PASS/fixed on your own judgement.

---

## 1. Build under test
- Deployed `main @ 923a028`, frontend in `/app` on the preview URL → **external preprod backend** (`preprod.mygenie.online`, socket `presocket.mygenie.online`).
- This build **already contains BUG-685/686 fixes + CR-552 + BUG-630**, so the old **BLOCKER-1 (add-to-cart crash) should be cleared** — verify BUG-685 first in Batch C as the gate for all order-creation tests.
- Frontend `.env`: Firebase (incl. VAPID), Google Maps, CRM keys all set; `REACT_APP_API_BASE_URL`/`REACT_APP_SOCKET_URL` point at preprod.

## 2. Prerequisite check — ALL VERIFIED (2026-11-19)
| Prereq | Status |
|---|---|
| Frontend compiles + serves (HTTP 200, title "MyGenie POS") | ✅ |
| Backend reachable (login reaches preprod, system boot completes) | ✅ |
| Login — owner@palmhouse.com (The Palm House: PMS/F&B/tax/credit/reports/audit/dashboard) | ✅ verified |
| Login — owner@thegoankitchen.com (Goan Kitchen: aggregator/web/ScanOrderPopOut) | ✅ verified |
| Login — owner@beanmeup.com (Bean Me Up: tax/VAT config) | ✅ verified |
| Live WEB/SCAN order present (Goan Kitchen #1578881 "a1", Dine-In, ₹411, 17 prev + 1 new ₹1 item, COD, Awaiting Confirmation) | ✅ verified |
| Aggregator order at boot (Goan Kitchen) | ✅ 1 loaded |
| Firebase/Maps/CRM keys | ✅ set |
| **Low-rights (captain) account** — captain@themealbreak.com (The Meal Break) | ✅ verified 2026-11-19 — restricted sidebar (no reports/settings/menu-mgmt/inventory/insights/pms); 4 running orders |

Credentials (all `Qplazm@10`): see `control/test_credentials.md`. Order-creation / payment / cancel / void / print on preprod is **owner-approved** (OD-QA-NOV-01).

## 3. QA SCOPE — 37 items (2 excluded)

**EXCLUDED/DEFERRED this pass (do NOT test):** BUG-701 (needs a Room web-edit order; #1578881 is Dine-In), BUG-703 (needs an accepted aggregator order in Table/Aggregator view). Leave their registry status unchanged; note as DEFERRED.

**NEWLY UNBLOCKED 2026-11-19:** CR-515, CR-492, BUG-711 — low-rights account captain@themealbreak.com now available → see Batch P (Group 4).

### Batch plan — 3 parallel groups (one testing dispatch per group)

**GROUP 1 — palmhouse, read-mostly (run in parallel):**
- **Batch A — Audit Report v3 / Insights [MEDIUM]:** BUG-691 (TIME not "2026-"), BUG-695 (no nested button / console error), BUG-697 (preset highlight matches applied range), BUG-698 (FY preset shares range), BUG-700 (empty-state testids present), BUG-704 (LM/FY preset persists across nav), CR-528 (edit/cancel-after-print report structure + Post-Print Edits KPI + Excel), CR-543 (late-cancellation Card 1), CR-544 (cancel-after-unpaid Card 2), CR-546 (discount-after-print Card 3). *Self-seed events where needed: print bill → edit after print; apply+remove discount after print; late cancel; make-unpaid-then-cancel.*
- **Batch B — Order Report Beta [HIGH]:** BUG-626 (status badges Upi/Card/Room, no raw strings), BUG-706 (VAT labelled VAT not GST — use **beanmeup**), BUG-707 (cancellation date/time format consistent), CR-503 (Pay Later → Print Bill + Collect drawer opens + settles).

**GROUP 2 — palmhouse write-state, run C → D → E sequentially (share order data):**
- **Batch C — Order Entry / Cart / Tax [CRITICAL]:** BUG-685 (gate: add customizable item, no `onEdit` crash), BUG-647 (GST OFF → payload has no gst_tax, order_amount not inflated — **beanmeup/GST-off**), BUG-683 (VAT OFF → no VAT charged — **beanmeup**), BUG-678 (prepaid + SC toggle OFF → no service charge in payload), BUG-684 (cart Collect Bill amount == billed amount, no ₹1 diff), CR-551 (edit variations/add-ons on a placed item), CR-523 (link customer to a placed order; persists after reopen).
- **Batch D — Credit / payment transitions [CRITICAL]:** BUG-671 (partial/split order → Mark Unpaid works, Change Method hidden), BUG-672 (prepaid order → move to Credit), CR-526 (remove/void an unpaid credit order).
- **Batch E — Dashboard / socket / add-ons [HIGH]:** BUG-686 (~10 logins → running orders not wiped, no POS-0 flash), BUG-688 (socket offline→online → exactly one `join_restaurant`), BUG-690 (create add-on → list refreshes instantly), CR-547 (ScanOrderPopOut KOT button → item selection before print).

**GROUP 3 — goankitchen (independent, run in parallel):**
- **Batch F — Aggregator / web / ScanOrderPopOut [HIGH]:** on order #1578881 — CR-545 (APS/₹1 item handling: ₹1 "melo fish" shows correctly / Price-TBD as designed), CR-552 (per-item approval of new web-edit items; 17 prev + 1 new), BUG-679 (cancel a new item → strikethrough + hidden price for cancelled), BUG-702 (variation shows selected option label + optionPrice, not group name / non-existent price).

**GROUP 4 — The Meal Break, permissions (captain low-rights + owner all-rights baseline; independent, run in parallel):**
- **Batch P — Permission gating [HIGH]:** CR-515 (as captain: payment-method picker / Mark Unpaid / pay-later Collect / item-cancel are HIDDEN; reach via a table's Bill/Collect drawer + Order Entry), CR-492 (complementary_food: comp checkbox HIDDEN, existing comp lines read-only "(Complimentary) ₹0", a comp line without a reason BLOCKS Pay; needs restaurant complementary flag = Yes — confirm), BUG-711 (Reprint blocked without print_icon). Baseline "rights ON → visible" = any owner account (all rights). **Caveat:** captain sidebar lacks Reports/Settings → the Order-Report-Beta-side Reprint path may be unreachable for captain (that may itself be the expected gate); verify the collect-drawer + order-entry gating and note reachability.

**REPORT-ONLY (cannot execute E2E — log as NOTE with code/value observation):** BUG-630 (backend Net-Sales definition), CR-512 (needs update-print-status/print-logs APIs + printer).

### Regression (per Role 4 §Regression Scope)
- CRITICAL/financial batches (C, D) touch R6 money logic → run the handover regression + full critical path: login → place order → settle → report → logout.
- Hotspot files (orderTransform.js, OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel) → add the 2 cross-flow tests.

## 4. Parallelisation note
Group 1 (palmhouse read-mostly) ∥ Group 3 (goankitchen) ∥ Group 4 (themealbreak) are safe to run fully in parallel (independent restaurants/data). Group 2 writes palmhouse order/payment state → run C → D → E **in order** (or on distinct tables) to avoid data collisions. Dispatch the 4 groups together.

## 5. Output expected from you
- Single `memory/test_reports/QA_REPORT_NOV_SPRINT_2026-11-19.md`: per-case PASS/FAIL + severity + evidence; summary by severity; Coverage N/N; Registry spot-check result.
- New BLOCKER/MAJOR findings → file in `BUG_TRACKER.md` + registry.
- Update each tested item's `qa_gate_status` in `registry.json` (PASS / FAIL+defect / PARTIAL / BLOCKED-prereq). Registry/docs only — no app code.

---

## 6. GATE 4 — confirm before executing write/financial flows

```
OWNER APPROVAL REQUIRED (Gate 4 — QA execution)
Reason: Batches C/D/E/F place real orders, payments, cancellations, voids and
        print bills on the preprod backend (CRITICAL: tax/GST/VAT/SC, credit,
        settlement). Groups run in parallel across palmhouse / beanmeup / goankitchen / themealbreak.
Risk: CRITICAL
Scope: 37 items (2 excluded/deferred: BUG-701, BUG-703).
Proposed next step: run Groups 1/2/3 in parallel, self-seed order data via the app,
        report all findings by severity, fix nothing.
Prior GO on record: OD-QA-NOV-01 (owner, 2026-11-19) — "all tests allowed".
Next agent: reconfirm this GO still stands, then launch. Do not start until confirmed.
```
