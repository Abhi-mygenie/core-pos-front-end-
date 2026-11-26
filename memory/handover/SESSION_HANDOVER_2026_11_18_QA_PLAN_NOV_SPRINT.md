# Session Handover — QA Plan for 33 Items (Nov 15–18 Sprint)

**Date:** 2026-11-18
**Written by:** PLANNING agent (this session)
**Handover to:** QA agent (next session)
**Preview URL:** https://pull-build-3--2jz687ss.preview.emergentagent.com
**Branch:** `main` @ `159f8b67`
**Role for next agent:** QA

---

## 0. START HERE — What to do

**Step 1:** Read this document fully (5 min).
**Step 2:** Pick **Batch 3** (recommended — 2 items, both have QA handovers, highest confidence). See §4 for all batch options.
**Step 3:** Boot QA role per AGENT_PROMPT_ALPHA.md — read QA handover for each item, execute test cases, record PASS/FAIL + severity.
**Step 4:** DO NOT fix any code. Log every finding as BLOCKER / MAJOR / MINOR / NOTE.
**Step 5:** Write QA Report at `memory/test_reports/QA_REPORT_NOV_SPRINT_BATCH<N>_2026_11_18.md`.
**Step 6:** Report back to owner with findings.

---

## 1. Context — Why this handover exists

33 items were implemented between Nov 15–18 (21 on Nov 16, 4 on Nov 17, 8 on Nov 18). They are all at GATE_5A_IMPLEMENTED status. This QA session closes Gate 5b for all of them. The items span 6 feature areas — they have been batched so each batch can be tested independently and all 6 can run in parallel if multiple QA agents are available.

**QA role rules (from AGENT_PROMPT_ALPHA.md):**
- Execute test cases from QA handover in priority order
- Record PASS or FAIL per test case with severity: BLOCKER / MAJOR / MINOR / NOTE
- DO NOT write code or fix anything
- File bugs for BLOCKER + MAJOR findings in BUG_TRACKER.md
- Write QA Report per batch

---

## 2. Test Credentials

| Account | Email | Password | Role | Use for |
|---------|-------|----------|------|---------|
| **Primary (owner)** | `owner@woko.com` | `Qplazm@10` | Owner | All batches — primary account |
| **Palm House (rooms)** | `owner@palmhouse.com` | `Qplazm@10` | Owner | Batch 6 — CR-405 (Room Folio discount) |
| **Woko waiter** | TBD (ask owner) | TBD | Waiter | Batch 6 — rights testing (CR-515, CR-492) |
| **cafe103** | TBD (ask owner) | TBD | Owner/Manager | Batch 1 — cancel note mandatory setting |

> ⚠️ Security rule: Never print passwords in QA reports. Refer to credentials as "owner@woko.com" only. Mask all tokens as `***`.

---

## 3. All 33 Items — Full List

### Nov 16 (21 items)
| ID | Pri | Title | Batch |
|----|-----|-------|-------|
| BUG-229 | P2 | Employee: Auto-Populate Email (firstname@restaurantname) | 6 |
| BUG-230 | P2 | Employee: Name Change → Email Auto-Sync | 6 |
| BUG-667 | P0 | Sidebar: Restaurant Name Overflows | 6 |
| BUG-669 | P0 | Add-On Creation: Cannot Create Without Entering Price | 6 |
| BUG-670 | P0 | Item-Cancel Dialog Missing Notes Field | 1 |
| BUG-671 | P0 | Unable to Mark Partial-Payment Orders as Unpaid | 1 |
| BUG-672 | P0 | Prepaid Order Unable to Move to Credit | 1 |
| BUG-673 | P0 | Keyboard Navigation: First Food Auto-Selected on Short Code | 6 |
| BUG-674 | P0 | Order-Cancel Dialog Missing Notes Field | 1 |
| BUG-675 | P0 | Settlement "definition pending" Text Still Showing | 1 |
| CR-372-B | P0 | ProtectedRoute on 23 Unguarded Routes | 6 |
| CR-394 | P0 | GST Exclusive Only (Inclusive removed) | 6 |
| CR-492 | P0 | Complementary Must Require `complementary_food` Right | 6 |
| CR-493 | P0 | Cancellation Reason Mandatory | 1 |
| CR-503 | P0 | Order Beta: Pay Later — Print Bill + Collect Payment | 6 |
| CR-515 | P0 | Staff Rights: Reprint + Collect Pay-Later + Make Unpaid | 6 |
| CR-521 | P0 | Bill-Print Card: Orange Background (#FFEDD5) | 6 |
| CR-523 | P0 | Link Customer to Order After Placing | 5 |
| CR-524 | P0 | Cancellation Report: Punch Time + Duration Columns | 5 |
| CR-526 | P0 | Credit: Remove / Void Unpaid Order | 1 |

### Nov 17 (4 items)
| ID | Pri | Title | Batch |
|----|-----|-------|-------|
| CR-405 | P2 | Room Folio: Discount at Checkout + Check-in | 6 |
| CR-528 | P0 | Audit Log: Order Edit/Cancel After Bill Print | 5 |
| CR-545 | P1 | APS (₹1) Web Order — Tag + Item Cancel in Popup | 4 |
| BUG-679 | P1 | ScanOrderPopOut: Cancelled Items No Strikethrough | 4 |

### Nov 18 (8 items — this session)
| ID | Pri | Title | Batch |
|----|-----|-------|-------|
| BUG-630 | P0 | Item Sales Net Sales wrong (Phase A — Tax + Total Sales KPIs added) | 5 |
| BUG-647 | P0 | GST OFF — Payload Still Sends gst_tax | 2 |
| BUG-677 | P0 | Socket Disconnection — Reconnect Exhaustion + No Auto-Reconnect | 3 |
| BUG-678 | P0 | Service Charge in Payload Despite Toggle OFF (Prepaid) | 2 |
| BUG-683 | P0 | VAT Still Charged When VAT Switch OFF | 2 |
| BUG-684 | P1 | Cart Collect Bill Shows ₹1 Different From Billed Amount | 2 |
| CR-551 | P0 | Edit Variations / Add-ons on Placed Cart Items | 3 |
| CR-552 | P1 | Per-item Approval for Web-Edit Orders (Mode B ScanOrderPopOut) | 4 |

---

## 4. QA Batches — Recommended Order

### ⭐ RECOMMENDED START: Batch 3 — Order Entry & Cart
**Why:** Smallest batch (2 items), both have full QA handover docs, zero dependency on special accounts, low setup cost.

---

### BATCH 1 — Cancellation & Credit *(7 items)*
**Area:** Cancel flows, notes fields, credit management
**Credentials:** `owner@woko.com` + cafe103 (for cancel note mandatory ON/OFF)
**Parallelisable:** YES — independent of Batch 2/3/4/5/6

| ID | QA Handover | Test count |
|----|------------|-----------|
| CR-493 | ✅ `QA_HANDOVER_CR-493_2026_11_16.md` | ~8 cases |
| BUG-674 | ✅ `QA_HANDOVER_BUG-674_2026_11_16.md` | ~6 cases |
| BUG-670 | ✅ `QA_HANDOVER_BUG670_B1_BUG674_B2_2026_11_16.md` | ~5 cases |
| CR-526 | ✅ `QA_HANDOVER_BATCH1_2026_11_16.md` §CR-526 | ~6 cases |
| BUG-671 | ❌ Derive — test: Partial-payment order → 3-dot menu → "Make Unpaid" → confirm → order status changes | ~3 cases |
| BUG-672 | ❌ Derive — test: Prepaid order → 3-dot menu → "Move to Credit" → TAB customer list updated | ~3 cases |
| BUG-675 | ❌ Derive — test: Settlement page → Cash Collected KPI → subtitle no longer shows "definition pending ⓘ" | ~2 cases |

**Key regression:** End-to-end cancel (item + order) with and without note · Credit bucket values after remove

---

### BATCH 2 — Tax & Payment Accuracy *(4 items)*
**Area:** GST OFF, VAT OFF, service charge, cart total accuracy
**Credentials:** `owner@woko.com` (GST ON outlet) — toggle GST/VAT OFF in settings for specific tests
**Parallelisable:** YES

| ID | QA Handover | Test count |
|----|------------|-----------|
| BUG-647 | ✅ `QA_HANDOVER_BATCH1_2026_11_16.md` §BUG-647 | ~5 cases |
| BUG-683 | ❌ Derive — test: VAT toggle OFF → place order → Network tab: `vat_tax=0`; CartPanel shows no VAT line | ~4 cases |
| BUG-678 | ✅ `QA_REPORT_BUG-678_2026_11_16.md` | ~3 cases |
| BUG-684 | ✅ `QA_HANDOVER_BUG-684_2026-11-18.md` | ~4 cases |

**Key regression:** Tax ON order normal flow · SC + GST compound calculation

---

### BATCH 3 — Order Entry & Cart ⭐ START HERE *(2 items)*
**Area:** Cart item editing, socket reconnect
**Credentials:** `owner@woko.com`
**Parallelisable:** YES

| ID | QA Handover | Test count |
|----|------------|-----------|
| CR-551 | ✅ `QA_HANDOVER_CR-551_2026-11-18.md` | ~6 cases |
| BUG-677 | ✅ `QA_HANDOVER_BUG-677_2026-11-18.md` | ~5 cases |

**CR-551 test summary:** Place item → Edit button appears on items with customizations → modal opens pre-populated → save → cart updates in-place (not duplicate). Customize button still works unchanged.

**BUG-677 test summary:** Socket drops (simulate by cutting network briefly) → reconnects automatically → orders still arrive. No duplicate event listeners in console.

**Key regression:** Normal place order flow · Customise button unchanged · Socket stays connected

---

### BATCH 4 — Dashboard / Scan Popup *(3 items)*
**Area:** APS web orders, web-edit orders, cancelled items in popup
**Credentials:** `owner@woko.com` — requires a live web order on preprod (ask owner to place via web before testing)
**Parallelisable:** YES — but needs live web orders setup

| ID | QA Handover | Test count |
|----|------------|-----------|
| CR-545 | ❌ Derive — test: Web order with ₹1 APS item → popup → APS badge visible → sort top → per-item cancel works | ~6 cases |
| BUG-679 | ❌ Derive — test: Cancelled item in popup → strikethrough + no cancel button + greyed price | ~3 cases |
| CR-552 | ✅ `CR-552_REFERENCE_IMPL_QA_HANDOVER.md` (reference impl — treat as guide) | ~8 cases |

**CR-552 test summary (Mode B):**
1. Web-edit order (food_status=7 items) enters scan popup queue
2. New items shown at top — actionable (Reject/Accept per item + per order)
3. Previously-ordered items in collapsible "Previously ordered items" section — greyed, no cancel button
4. Reject → reason modal → only new items cancelled → prev items + order intact
5. Accept → `waiter-dinein-order-status-update` fires once → status-7 items → 1
6. Mode A (normal YTC orders, fOrderStatus=7) → completely unchanged
7. Aggregator orders → NO Mode B popup

**⚠️ Scope guard (critical):** Aggregator web edits must NOT trigger Mode B.

---

### BATCH 5 — Reports & Audit *(4 items)*
**Area:** Cancellation report, item sales, audit log, customer link
**Credentials:** `owner@woko.com`
**Parallelisable:** YES

| ID | QA Handover | Test count |
|----|------------|-----------|
| CR-524 | ✅ `QA_HANDOVER_CR-524_2026_11_16.md` | ~6 cases |
| CR-523 | ✅ `QA_HANDOVER_CR-523_2026_11_16.md` | ~5 cases |
| CR-528 | ❌ Derive — test: Audit Log page → 3 event tabs: item cancel after print, order cancel after print, order edit after print → KPI cards show counts → table shows 10 columns | ~6 cases |
| BUG-630 | ❌ Derive (from this session's plan) — test: Item Sales page → 6 KPI cards (Unique Items, Units Sold, Discount, Net Sales, Tax, Total Sales) → NO Gross Revenue card → badge shows "Net Sales · Total Sales" → Net Sales subtitle = "before taxes" → Tax shows non-zero value → Total Sales ≥ Net Sales | ~6 cases |

**BUG-630 specific notes (Phase A):**
- Net Sales will show SAME value as Total Sales currently (backend BB-14 not yet delivered — expected Phase A behaviour)
- Tax KPI should show correct value = sum of gst+vat+sc per item
- Total Sales column visible in table alongside Net Sales

---

### BATCH 6 — Staff Rights, Setup & Admin *(12 items)*
**Area:** Routes, rights, Order Beta, employee setup, menu setup
**Credentials:** `owner@woko.com` + waiter account (need from owner). CR-405 uses `owner@palmhouse.com / Qplazm@10`
**Parallelisable:** YES — but largest batch, needs waiter account

| ID | QA Handover | Key test |
|----|------------|---------|
| CR-515 | ✅ `QA_HANDOVER_CR-515_2026_11_16.md` | Waiter without rights → collect pay-later blocked |
| CR-521 | ✅ `QA_HANDOVER_BATCH1_2026_11_16.md` | Bill-printed card shows orange not green |
| CR-503 | ❌ Derive | Order Beta: pay-later order → Print Bill + Collect Payment buttons visible |
| CR-492 | ❌ Derive | Waiter without `complementary_food` right → Comp button hidden |
| CR-394 | ❌ Derive | Menu → item GST settings → "Inclusive" option not present |
| CR-372-B | ❌ Derive | Open `/reports-module/dashboard` without login → redirect to login |
| BUG-229 | ❌ Derive | Employee add → email field auto-fills as `firstname@restaurantname.com` |
| BUG-230 | ❌ Derive | Change employee first name → email auto-updates (if was auto-generated) |
| BUG-667 | ❌ Derive | Long restaurant name in sidebar → truncated/ellipsis, no overflow |
| BUG-669 | ❌ Derive | Add-on: submit with ₹0 price → succeeds (not blocked) |
| BUG-673 | ❌ Derive | Keyboard shortcut → type code → no auto-selection of first food item |
| CR-405 | Old handover | Room Folio: discount at check-in + checkout apply correctly — **use `owner@palmhouse.com / Qplazm@10`** |

---

## 5. Finding Severity Guide

| Severity | Trigger | Action |
|----------|---------|--------|
| **BLOCKER** | Core flow broken, money wrong, crash, data corruption | File as bug immediately |
| **MAJOR** | Feature doesn't work as specified, workaround exists | File as bug |
| **MINOR** | Cosmetic, alignment, label, edge case UX | Log — owner decides ship or fix |
| **NOTE** | Observation, suggestion, not a failure | Log in report only |

---

## 6. QA Report Template

Write report at: `memory/test_reports/QA_REPORT_NOV_SPRINT_BATCH<N>_2026_11_18.md`

```markdown
# QA Report — Nov Sprint Batch <N> — 2026-11-18

## Summary
- Items tested: <N>
- Tests run: <N>
- PASS: <N> | FAIL: <N> (BLOCKER: N, MAJOR: N, MINOR: N, NOTE: N)
- Coverage: <N>/<N> items tested

## Results

| # | ID | Test | Expected | Actual | Severity | Evidence |
|---|----|----|----------|--------|----------|---------|

## Regression
| # | Test | Result |
|---|------|--------|

## Registry spot-check
| ID | Registry status | Correct? |

## Findings requiring Bug Fix agent
(List BLOCKER + MAJOR only)

## Minor findings — owner to decide
(List MINOR items)
```

---

## 7. Items that need NO QA Handover written first

For items marked ❌ above, the QA agent should derive test cases directly from:
1. The registry.json `notes` field (has implementation summary)
2. The intake doc in `change_requests/<ID>_*.md`
3. The implementation plan in `plans/<ID>_IMPLEMENTATION_PLAN*.md`

This is explicitly allowed by AGENT_PROMPT_ALPHA.md §QA role: "if called directly without STEP -1.5" — QA can write 1-2 ad-hoc test cases per item.

---

## 8. Out of scope — do NOT test these

- BUG-676 (no ringer for web-edit) — Gate 1 only, not implemented
- POS2-007 (confirmOrderTone FCM) — out of scope CR-552
- CR-543, CR-544, CR-546 — backend-blocked, FE only partial
- Batch B items (CR-514, CR-522, CR-527, CR-536, CR-542) — backend-blocked

---

## 9. Recommended batch order if single tester

```
Batch 3 → Batch 2 → Batch 1 → Batch 5 → Batch 4 → Batch 6
(simplest → complex → needs setup)
```

If parallel testers available → all 6 batches simultaneously.

---

## 10. Quick links

| Resource | Path |
|----------|------|
| QA role rules | `memory/control/AGENT_PROMPT_ALPHA.md` §ROLE 4 |
| Registry | `memory/control/registry.json` |
| Handover for Batch 1 | `memory/handover/QA_HANDOVER_CR-493_2026_11_16.md` + `QA_HANDOVER_BUG670_B1_BUG674_B2_2026_11_16.md` + `QA_HANDOVER_BATCH1_2026_11_16.md` |
| Handover for Batch 2 | `memory/handover/QA_HANDOVER_BATCH1_2026_11_16.md` §BUG-647 + `QA_REPORT_BUG-678_2026_11_16.md` + `QA_HANDOVER_BUG-684_2026-11-18.md` |
| Handover for Batch 3 ⭐ | `memory/handover/QA_HANDOVER_CR-551_2026-11-18.md` + `QA_HANDOVER_BUG-677_2026-11-18.md` |
| Handover for Batch 4 | `memory/handover/CR-552_REFERENCE_IMPL_QA_HANDOVER.md` |
| Handover for Batch 5 | `memory/handover/QA_HANDOVER_CR-524_2026_11_16.md` + `QA_HANDOVER_CR-523_2026_11_16.md` |
| Handover for Batch 6 | `memory/handover/QA_HANDOVER_CR-515_2026_11_16.md` + `QA_HANDOVER_BATCH1_2026_11_16.md` §CR-521 |
| BUG-630 plan (this session) | `memory/plans/BUG-630_IMPLEMENTATION_PLAN_2026_11_18.md` |
| CR-552 plan | `memory/plans/CR-552_IMPLEMENTATION_PLAN.md` |
| File ownership | `memory/control/FILE_OWNERSHIP.md` |

---

*Handover written by PLANNING agent — 2026-11-18. Next agent: QA role, start with Batch 3.*
