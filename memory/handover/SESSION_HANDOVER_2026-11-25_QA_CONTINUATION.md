# Session Handover — 2026-11-25 (QA Continuation — Tracks A/B/C/D Approved)

**Role for next agent:** QA Agent (Role 4) — record PASS/FAIL only, NO code fixes
**Primary handover:** `memory/handover/QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md`
**Owner approved:** Tracks A, B, C (with data creation), D

---

## KEY FACTS (read first)

| Fact | Detail |
|---|---|
| BUG-685 | CONFIRMED FIXED — `onEdit` destructured at CartPanel.jsx L851. Prior `qa_gate_status` said "GATE_1_INTAKE" (QA-found label) but fix is in code. 5 items now unblocked. |
| APS ₹1 order | LIVE on thegoankitchen preprod. Batch 5 handover ref: order #1578881 ("melo fish" ₹1). |
| Web order | LIVE on thegoankitchen (owner confirmed). Same order popup. |
| Credit Management | 55 customers on palmhouse. "Louise madam" has 238 Open rows. Remove button already confirmed VISIBLE (BUG-681 PASS). |
| BUG-681 | ALREADY PASSED — Remove button works. Use Louise madam for CR-526 test. |

---

## CREDENTIALS

| Account | Password | Restaurant | RID | Use For |
|---|---|---|---|---|
| owner@palmhouse.com | Qplazm@10 | The Palm House | 541 | Order Beta, Credit, Cancellations — primary |
| owner@thegoankitchen.com | Qplazm@10 | The Goan Kitchen | — | APS + web orders |
| owner@beanmeup.com | Qplazm@10 | Bean Me Up | 742 | VAT testing (BUG-683) |
| owner@cafe103.com | Qplazm@10 | Cafe 103 | 644 | cancel_note_mandatory (BUG-682) |
| testwait@thepalmhouse.com | Qplazm@10 | The Palm House | 541 | Staff — HAS clear_payment, complementary_food — NO print_icon/order_cancel/update_payment/order_unpaid |

Login: owner → `POST /api/v1/auth/vendoremployee/login`
Login: staff → `POST /api/v1/auth/vendoremployee/common-login` + `X-localization: en`

---

## PARALLEL EXECUTION MAP

Three independent sessions can run simultaneously:

```
SESSION 1 (TGK)                    SESSION 2 (Palmhouse)             SESSION 3 (Beanmeup + TGK)
─────────────────────              ─────────────────────             ──────────────────────────
owner@thegoankitchen.com           owner@palmhouse.com               owner@beanmeup.com + TGK
Track A1: Batch 5 (5 items)        Track A2: CR-526 (Credit)         Track A3: BUG-683 (VAT)
Track D:  BUG-672 (prepaid)        Track B:  Cancellations MTD       Track D:  BUG-672 (if
CR-545, BUG-679, BUG-702,          BUG-579, BUG-707, BUG-708,        not done in Session 1)
CR-557, CR-561                     BUG-713, CR-554, CR-555, CR-556
                                   Track C data creation →
                                   BUG-726, BUG-735, CR-503,
                                   BUG-671, BUG-678
```

**After Sessions 1+2+3 complete:**
- Session 4: BUG-682 (manual cafe103, can't be Playwright)
- Session 5: CR-492, BUG-749 (physical device / manual)
- Parked: CR-515, BUG-711 (need new palmhouse staff account with report perm)

---

## TRACK A — 8 items, run immediately

### A1 — TGK: ScanOrderPopOut / APS / Web order
**Handover:** `QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` Batch 5
**Account:** owner@thegoankitchen.com
**Live data:** Order #1578881 — web-edit order with APS ₹1 item ("melo fish")

| ID | Assert | Severity if FAIL |
|---|---|---|
| CR-545 | APS ₹1 tag visible in Accept popup; "Price TBD" pill shown; ₹1 price hidden; per-item cancel works | MAJOR |
| BUG-679 | Cancelled previous items show strikethrough + grey; no active price shown | MAJOR |
| BUG-702 | Variation shows selected option label + price (not just group name) | MAJOR |
| CR-557 | Mode-B (web-EDIT) renders full rich rows — APS badge, strikethrough, variation/addon prices, notes | MAJOR |
| CR-561 | APS ₹1 price input appears in Accept popup; typing a price → PUT update-food-item-price fires | MAJOR |

**Also check in same session (already in Batch 5):**
- CR-552: per-item approval (Yet-to-Confirm items in web-edit)
- CR-559: KOT auto-prints on Accept if Scan-Order Auto-print = Yes
- BUG-741: cancel wording = "Cancel item: {name}" (item-level), "Reject" (order-level)

---

### A2 — Palmhouse: Credit Remove (CR-526)
**Handover:** `QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` Batch 3
**Account:** owner@palmhouse.com
**Live data:** Credit Management → Louise madam (238 Open rows, Remove button already confirmed VISIBLE)

| ID | Assert | Note |
|---|---|---|
| CR-526 | Click Remove on an Open row → confirmation dialog with order # and ₹ amount | BUG-681 (Remove button) already PASSED — just test the full Remove flow now |

Steps:
1. `/credit` → View/Manage on Louise madam
2. Open bucket → click Remove on row 1
3. Confirm dialog shows order ID + ₹ amount → click Confirm
4. Row disappears from Open bucket

---

### A3 — Beanmeup: VAT OFF
**Handover:** `QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` Batch 4
**Account:** owner@beanmeup.com (RID 742)

| ID | Assert |
|---|---|
| BUG-683 | Settings → VAT toggle OFF → place an order → cart shows ₹0 VAT → Network payload has `vat_amount: 0` |

Steps:
1. Login beanmeup → Settings → find VAT toggle → switch OFF
2. Order Entry → place any order
3. Collect Bill → verify VAT = ₹0 in cart
4. Network tab → verify payload has no VAT charge
5. Toggle VAT back ON after test (cleanup)

---

## TRACK B — 7 items, MTD date range

**Handover:** `QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` Batch 1
**Account:** owner@palmhouse.com
**Key:** Use **MTD** (Month-to-Date) or **30D** range — today (11/25) has zero cancellations but the month likely does

| ID | Assert |
|---|---|
| BUG-579 | Daily trend chart bars non-zero; Stage breakdown shows ₹ order_loss + item_loss values |
| BUG-707 | Order Date column = "DD MMM, hh:mm pm" format (e.g. "15 Nov, 02:30 pm") — NOT "2026-11-15 14:30" |
| BUG-708 | NO dead "Cancel Note" column; working "Notes" column present (shows cancelItemNote or notes) |
| BUG-713 | Punch Time + Duration columns visible WITHOUT horizontal scroll (7 consolidated groups) |
| CR-554 | Punch Time + Duration on BOTH Cancellations screen AND Detail screen |
| CR-555 | Risk badges render at 5/15/30 min thresholds (Doubt/Risk/High Risk) |
| CR-556 | 5 inline column filters on both screens: Stage/Scope/Reason/Cancelled By/Risk |

**Additional items in Batch 1 (run at same time):**
- CR-524: Punch Time + Duration on both screens (same as CR-554)
- BUG-714: scope tab switch does NOT zero rows
- BUG-715: Punch Time shows IST time (not UTC)
- BUG-717: Detail subtitle + Order date formatted + scope dropdown order correct

**If palmhouse MTD has no cancellations:** Try `30D` range, or note date range used in report.

---

## TRACK C — Create test data first, then test

### STEP 1: Create all data on palmhouse (do in one Order Entry session)

| Order to Create | How | Tests It |
|---|---|---|
| **Cancelled order** | Place order (any table) → add 2 items → cancel one item → verify it appears in Order Beta Cancelled tab | BUG-726 (row alignment) |
| **Split payment order** | Place order → Collect Bill → Cash ₹300 + UPI ₹200 → settle | BUG-735 (Change/Unpaid hidden on split rows) |
| **Hold/Pay Later order** | Place order → Collect Bill → "Pay Later" / "Hold" option | CR-503 (Collect button on Hold tab) |
| **Partial-payment order** | Place order → Collect Bill → pay PART of amount → save as partial | BUG-671 (Mark Unpaid on partial-pay) |
| **SC off + prepaid** | Settings → Service Charge toggle OFF → place order via Quick/Prepaid flow | BUG-678 (SC absent in payload) |

> **Note on BUG-678 (SC off prepaid):** The order needs to go through the prepaid flow. If palmhouse doesn't have a prepaid payment method easily accessible, check if `payment_type=prepaid` orders can be created from Order Entry by selecting a prepaid payment option at Collect Bill.

---

### STEP 2: Test after data creation

| ID | Test | Handover |
|---|---|---|
| BUG-726 | Order Beta → Cancelled tab → check cancelled rows cell alignment (cells match headers) | Batch 3 (6-batch) |
| BUG-735 | Order Beta → find the split-payment order → Change/Unpaid buttons must be HIDDEN | Batch 3 (6-batch) |
| CR-503 | Order Beta → Hold tab → Collect button visible on the Hold order → click → CollectBillPanelDrawer opens | QA_HANDOVER_CR503_2026-11-25.md |
| BUG-671 | Order Beta → find partial-pay order → Mark Unpaid button visible → click → order moves to Unpaid | Batch 3 (6-batch) |
| BUG-678 | Place prepaid order with SC OFF → Network tab → `service_charge: 0` or absent in payload | Batch 4 (6-batch) |

---

## TRACK D — Prepaid → Credit (BUG-672)

**Handover:** `QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` Batch 3 (BUG-672 section)
**Account:** owner@thegoankitchen.com (prepaid order confirmed by owner)

| ID | Test |
|---|---|
| BUG-672 | Find a scan/online prepaid order on TGK → Collect Bill → choose Credit → order now appears in Credit Management and NOT stuck in Order Beta |

Steps:
1. Order Beta → look for prepaid/scan order (order_from = web or scan, payment_method = prepaid)
2. Click Collect on that order → CollectBillPanelDrawer
3. Select "Credit" as payment method → confirm
4. Navigate to Credit Management → customer's Open tab → new credit entry appears
5. Navigate back to Order Beta → order is no longer in Hold/Running

**If no prepaid order on TGK today:** Check "Running" tab on Order Beta for any scan orders; note the order_id used.

---

## WHAT IS ALREADY PASSED (DO NOT RETEST)

| Passed | Evidence |
|---|---|
| BUG-724, BUG-725, BUG-727, BUG-733, BUG-737, BUG-739 | Browser + code verified |
| CR-543, CR-544 | Browser + code verified |
| BUG-681, BUG-704, BUG-706 | Browser verified (Track 2) |
| CR-505, CR-510 | Closure Phase B |

---

## WHAT IS PARKED (do not attempt this session)

| ID | Reason | What's needed |
|---|---|---|
| CR-515, BUG-711 | testwait lacks `report` permission → cannot access Order Beta | Owner to create palmhouse staff account with `report` but NO `print_icon`/`update_payment`/`order_unpaid` |
| BUG-682 | cafe103 loads too slowly in Playwright headless | Manual browser test: login cafe103 → cancel item → check "Additional Notes *" label appears |
| BUG-749 | Requires real browser with granted FCM notification permission | Use pms@macha.com (RID 69) on a physical device/non-headless browser |
| CR-492 | testwait loads slowly; needs live order | Manual: login testwait → open an order → Collect Bill → verify complementary checkbox visible |

---

## QA REPORT FORMAT

For each track, write to:
`/app/memory/test_reports/QA_REPORT_CONTINUATION_<DATE>.md`

Per item:
```
| ID | Test Case | Result | Severity (if FAIL) | Evidence |
```

If FAIL found:
- BLOCKER: core flow broken → stop, file immediately
- MAJOR: feature doesn't work per spec → list, continue other items
- MINOR: cosmetic/edge case → list, continue
- Do NOT fix code — route BLOCKER/MAJOR to bug fix agent after all tracks done

---

## MINOR ISSUES FOUND (from previous session — carry forward)

| # | ID(s) | Issue | Fix Needed |
|---|---|---|---|
| M-1 | CR-515, BUG-711 | testwait lacks `report` → buttons not browser-verified | Provision palmhouse staff with `report`+no-`print_icon` |
| M-2 | BUG-726, BUG-735 | No test data yet — deferred | Create cancelled + split orders (Track C) |
| M-3 | BUG-579, BUG-707 | No cancellation data in test window | Use MTD range (Track B) |
| M-4 | BUG-682 | Playwright too slow on cafe103 | Manual browser test |
| M-5 | CR-503 | No Hold order existed | Create Hold order (Track C) |

---

## REGISTRY STATE
All 40 items have `qa_gate_status` set. Items fully PASS: 13.
Registry file: `/app/memory/control/registry.json`
