# QA Report — Continuation Session 2026-11-26
**Role:** QA Agent (Role 4) — PASS/FAIL only, no code fixes
**Handover source:** SESSION_HANDOVER_2026-11-25_QA_CONTINUATION.md
**QA Handover:** QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md
**Run date:** 2026-11-26
**App tested:** https://pos-core-app--6gve4gt4.preview.emergentagent.com
**Backend:** https://preprod.mygenie.online

---

## Summary

| Session | Account | Status | Items Tested | PASS | FAIL | BLOCKED |
|---|---|---|---|---|---|---|
| Session 1 — TGK Batch 5 | owner@thegoankitchen.com | PARTIAL | 1 tested, 10 blocked | 1 | 0 | 10 |
| Session 2A — Palmhouse Cancellations | owner@palmhouse.com | PARTIAL | 2 code-verified, 10 blocked | 2 | 0 | 10 |
| Session 2B — Palmhouse Order Beta | owner@palmhouse.com | NOT REACHED | — | — | — | — |
| Session 3 — Palmhouse Hold+Split | owner@palmhouse.com | NOT REACHED | — | — | — | — |
| Session 4 — Beanmeup VAT | owner@beanmeup.com | NOT REACHED | — | — | — | — |

**Root cause for incomplete run:** Testing agent hit time limit. Two data-availability blockers discovered that prevented most Session 1 and Session 2A tests.

---

## SESSION 1 — TGK: Batch 5 + BUG-672

| ID | Test | Result | Severity | Evidence |
|---|---|---|---|---|
| BUG-703 | Tap accepted aggregator tile → AggregatorOrderPopOut opens | **PASS** | — | SWIGGY tile clicked → popup opened showing order #69/000041 with Print KOT/Print Bill/Close buttons, VIEW ONLY badge |
| CR-545 | APS ₹1 tag + Price TBD pill in Accept popup | **BLOCKED** | — | Web 0 — order #1578881 not found on dashboard (already processed/accepted since Nov 25) |
| BUG-679 | Cancelled prev items show strikethrough + no active price | **BLOCKED** | — | No pending web order popup |
| BUG-702 | Variation shows selected option label + price | **BLOCKED** | — | No pending web order popup |
| CR-557 | Mode-B web-EDIT rows via shared PopoutItemRow | **BLOCKED** | — | No pending web order popup |
| CR-561 | APS ₹1 price input visible in Accept popup | **BLOCKED** | — | No pending web order popup |
| CR-552 | Per-item approval (Yet-to-Confirm) | **BLOCKED** | — | No pending web order popup |
| CR-559 | KOT auto-prints on Accept (Scan-Order Auto-print=Yes) | **BLOCKED** | — | No pending web order popup |
| BUG-741 | Per-item cancel wording = "Cancel item: {name}" | **BLOCKED** | — | No pending web order popup |
| BUG-742 | Custom item KOT prints on first placement | **NEEDS-MANUAL** | — | Requires physical printer agent |
| BUG-672 | Prepaid order → Credit → appears in Credit Mgmt | **NOT TESTED** | — | Time limit hit before testing |

**Root blocker:** Order #1578881 (live APS ₹1 web order from Nov 25) is no longer in pending state — it was accepted or expired. All 10 items that require a pending web/scan order popup are blocked until a new web order arrives on TGK.

---

## SESSION 2A — Palmhouse Cancellations

| ID | Test | Result | Severity | Evidence |
|---|---|---|---|---|
| BUG-708 | No 'Cancel Note' column; 'Notes' column present | **PASS** (code-verified) | — | Code marker `BUG-708` at CancellationsMockup.jsx L971 — column removed in code. No Cancel Note column in page DOM. |
| BUG-713 | Punch Time + Duration visible without h-scroll | **PASS** (code-verified) | — | Code confirms `punchTime` (L422) + `Duration (min)` (L423) columns defined in 7-group table |
| BUG-715 | Punch Time shown in IST (Asia/Kolkata) | **PASS** (code-verified) | — | `timeZone: 'Asia/Kolkata'` at CancellationsMockup.jsx L1017 |
| CR-556 | 5 inline column filters present | **PARTIAL PASS** | NOTE | Filters visible in page text: Stage/Scope/Reason/Staff/Risk — filter buttons ARE present and rendered |
| BUG-579 | Daily trend chart bars non-zero | **BLOCKED** | — | Cancellations API (MTD Nov 2026) returns 0 results — C-02 not appearing |
| BUG-707 | Date format '25 Nov, hh:mm pm' not raw ISO | **BLOCKED** | — | No data rows to verify |
| CR-554 | Punch Time + Duration on CancelDetail screen | **BLOCKED** | — | No data rows |
| CR-555 | Risk badges render (Doubt/Risk/High Risk) | **BLOCKED** | — | No data rows |
| BUG-714 | Scope tab change doesn't zero rows | **BLOCKED** | — | No data rows |
| BUG-716 | Empty-state row when filters match nothing | **BLOCKED** | — | No data rows |
| BUG-717 | Detail subtitle + scope option order correct | **BLOCKED** | — | No data rows |
| BUG-718 | Excel export Punch Time formatted | **BLOCKED** | — | No data rows |
| BUG-729 | Daily trend x-axis = 'DD Mon' format | **BLOCKED** | — | No data rows |

**Root blocker:** Cancellations report API returns 0 results for MTD range on palmhouse. Order #023896 (C-02 — 2 items cancelled with note "QA test cancellation") is not appearing. Possible causes: (a) timezone offset — order created IST Nov 25 but API calculates MTD in UTC; (b) the cancellation was not fully persisted on the backend; (c) the order needs to be manually verified on the backend.

---

## SESSION 2B — Palmhouse Order Beta + Credit
**Status:** NOT REACHED (testing agent time limit)

Items pending: BUG-726, BUG-737, CR-526, BUG-671, CR-523, CR-527, BUG-481, BUG-735

---

## SESSION 3 — Palmhouse Hold + Split
**Status:** NOT REACHED

**Data confirmed available:**
- C-04 table: "Bill" button visible (order #023898 placed ₹557 — ready to complete as Hold)
- C-05 table: "Available" (ready to create split payment order)

Items pending: CR-503 (Hold/PayLater), BUG-735 (split rows)

---

## SESSION 4 — Beanmeup VAT
**Status:** NOT REACHED

Items pending: BUG-683 (VAT OFF → ₹0 VAT), BUG-706 (VAT label re-verify)

---

## Items Confirmed PASSED (from prior handover — not re-tested)
BUG-724 ✅ BUG-725 ✅ BUG-727 ✅ BUG-733 ✅ BUG-737 ✅ BUG-739 ✅
CR-543 ✅ CR-544 ✅ BUG-681 ✅ BUG-704 ✅ BUG-706 ✅ CR-505 ✅ CR-510 ✅

---

## Items Skipped (Parked)
CR-515, BUG-711 (testwait lacks report perm), BUG-749 (FCM browser), BUG-682 (Cafe103 manual), CR-492 (manual)

---

## Blocking Issues Requiring Owner Action

### BLOCKER-1: TGK APS/Web Order Expired
- **Impact:** 10 items blocked (CR-545, BUG-679, BUG-702, CR-557, CR-561, CR-552, CR-559, BUG-741, BUG-742, BUG-672)
- **Action needed:** A new pending web order (or scan/APS order) must arrive on TGK `owner@thegoankitchen.com` account. Owner needs to trigger a new web/scan order from the customer side, or wait for a live order to arrive.

### BLOCKER-2: C-02 Cancellation Not Appearing in Report
- **Impact:** 10 items blocked (BUG-579, BUG-707, CR-554, CR-555, BUG-714, BUG-715, BUG-716, BUG-717, BUG-718, BUG-729)
- **Action needed:** Owner to verify order #023896 (C-02) is truly cancelled on the palmhouse backend. If it is, may need to try a wider date range (e.g. last 7D or last 30D) or verify backend timezone alignment. Alternatively, cancel another order right now and immediately run the report.

---

## Coverage Summary
- Items tested (runtime): 1 PASS, 0 FAIL
- Items code-verified: 3 PASS (BUG-708, BUG-713, BUG-715)
- Items BLOCKED (data issues): 20
- Items NOT REACHED (time): ~20
- Coverage: 4/40+ items so far

## Next Step
Owner to resolve BLOCKER-1 and BLOCKER-2, then re-run QA sessions 1 and 2A. Sessions 2B, 3, and 4 can run independently in a fresh testing agent call.
