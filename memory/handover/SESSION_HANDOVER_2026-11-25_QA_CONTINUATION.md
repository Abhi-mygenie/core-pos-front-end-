# Session Handover — 2026-11-25 (QA Continuation — Full Data + Parallel Execution Plan)

**Role for next agent:** QA Agent (Role 4) — record PASS/FAIL only, NO code fixes
**Primary handover:** `memory/handover/QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md`
**Owner approved:** Tracks A, B, C, D — all running

---

## CRITICAL FACTS (read before anything)

| Fact | Detail |
|---|---|
| BUG-685 | CONFIRMED FIXED — `onEdit` at CartPanel.jsx L851. All 5 previously-blocked items (BUG-671/672/678/683, CR-526) are now unblocked |
| APS ₹1 order | LIVE on thegoankitchen preprod (owner confirmed). Batch 5 test data ready |
| Web order | LIVE on thegoankitchen (owner confirmed). Same popup as APS order |
| C-1 Credit order | CREATED on palmhouse — order #023895, Credit payment, customer "QA Test Customer" / 9999999999. "Credit saved" toast confirmed. USE FOR: CR-526 Remove button test |
| C-02 Cancelled | CREATED on palmhouse — order #023896, 2 items (Blueberry Muffins ₹180 + Mango Sticky Rice ₹350). Cancel Order modal opened, note = "QA test cancellation". USE FOR: Cancellations report (BUG-579/707/708/713/CR-554/555/556) + Order Beta Cancelled tab (BUG-726) |
| C-03 Settled | CREATED on palmhouse — order #023897, settled with Cash ₹857 (₹300 tip added). USE FOR: Order Beta settled rows (BUG-724/725) |
| C-04 Placed | order #023898 placed (₹557), Collect Bill NOT completed. Table C-04 still shows Bill button. USE FOR: completing as Hold/Pay Later (CR-503) |
| Louise madam | 238 Open credit rows on palmhouse. Remove button confirmed VISIBLE (BUG-681 PASSED) |

---

## CREDENTIALS

| Account | Password | Restaurant | RID | Use For |
|---|---|---|---|---|
| owner@palmhouse.com | Qplazm@10 | The Palm House | 541 | Reports, Order Beta, Credit Mgmt, Cancellations |
| owner@thegoankitchen.com | Qplazm@10 | The Goan Kitchen | — | APS+web orders |
| owner@beanmeup.com | Qplazm@10 | Bean Me Up | 742 | VAT testing (BUG-683, BUG-706) |
| owner@cafe103.com | Qplazm@10 | Cafe 103 | 644 | cancel_note_mandatory (BUG-682) |
| testwait@thepalmhouse.com | Qplazm@10 | The Palm House | 541 | Staff — HAS clear_payment, complementary_food — NO print_icon/order_cancel/update_payment/order_unpaid |

Login: owner → `POST /api/v1/auth/vendoremployee/login`
Login: staff → `POST /api/v1/auth/vendoremployee/common-login` + header `X-localization: en`

---

## PARALLEL EXECUTION MAP — START ALL SIMULTANEOUSLY

```
SESSION 1 (TGK)                       SESSION 2 (Palmhouse — no extra data needed)
owner@thegoankitchen.com               owner@palmhouse.com
─────────────────────                  ───────────────────
Batch 5 (APS+web):                     Batch 1 (Cancellations MTD):
CR-545, BUG-679, BUG-702,              BUG-579, BUG-707, BUG-708, BUG-713
CR-557, CR-561                         CR-554, CR-555, CR-556
                                        → use MTD or last-30D range
Track D: BUG-672 (prepaid→credit)     Batch 3 (Order Beta + Credit):
                                        BUG-724, BUG-725, BUG-726, BUG-737
                                        CR-526 (remove from credit #023895)
SESSION 3 (Palmhouse — complete C-04) SESSION 4 (Beanmeup VAT)
owner@palmhouse.com                    owner@beanmeup.com
─────────────────────                  ───────────────────
Complete C-04 as Hold order:           BUG-683 (VAT OFF → no VAT in cart)
  → C-04 Bill → Cash → ₹0 →           BUG-706 regression (GST label check)
  Look for Hold/Tab/PayLater option
Then test CR-503 Hold tab
Create split payment on C-05:
  → place order → Collect Bill →
  Cash ₹300 (Cash Received input) →
  Then UPI ₹257 → Pay
  → tests BUG-735
```

---

## WHAT TO TEST — ITEM BY ITEM

### SESSION 1: TGK — Batch 5 + BUG-672

**Handover:** `QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` Batch 5
**Existing order:** #1578881 — web-edit order with "melo fish" ₹1 APS item

| ID | Assert | PASS condition |
|---|---|---|
| CR-545 | APS ₹1 tag + "Price TBD" pill in Accept popup; per-item cancel works | Tag visible, ₹1 price hidden in popup |
| BUG-679 | Cancelled prev items → strikethrough + grey + no active price | In ScanOrderPopOut cancelled prev items have strikethrough |
| BUG-702 | Variation shows selected option label + price (not just group name) | Full variation detail in popup |
| CR-557 | Mode-B web-EDIT rows render APS badge, strikethrough, variation prices via shared PopoutItemRow | Mode B rows match Mode A richness |
| CR-561 | APS ₹1 → price input in Accept popup → PUT update-food-item-price fires | Input visible, API fires on save |
| BUG-672 | Prepaid TGK order → Collect Bill → Credit → appears in Credit Management | Credit entry in Credit Mgmt, NOT stuck in Order Beta |

**Also in Batch 5 (same session):**
- CR-552: per-item approval (Yet-to-Confirm items)
- CR-559: KOT auto-prints on Accept if Scan-Order Auto-print = Yes
- BUG-741: cancel wording = "Cancel item: {name}" item-level

---

### SESSION 2A: Palmhouse — Cancellations MTD

**Handover:** `QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` Batch 1
**Data available:** C-02 order #023896 cancelled today (Blueberry Muffins + Mango Sticky Rice)

> IMPORTANT: Use **MTD** or **30D** date range on Cancellations screen to see today's cancellation

| ID | Assert |
|---|---|
| BUG-579 | Daily trend chart bars non-zero; Stage ₹ values (order_loss + item_loss) visible |
| BUG-707 | Order Date column = "25 Nov, hh:mm pm" NOT "2026-11-25 HH:MM" |
| BUG-708 | NO "Cancel Note" column; working "Notes" column present |
| BUG-713 | Punch Time + Duration visible WITHOUT horizontal scroll |
| CR-554 | Same columns on CancelDetail screen too |
| CR-555 | Risk badges render (Doubt ≥5min, Risk ≥15min, High Risk ≥30min) |
| CR-556 | 5 inline filters: Stage/Scope/Reason/Cancelled By/Risk all work |

**Also in Batch 1 (run together):**
- BUG-714, BUG-715, BUG-716, BUG-717, BUG-718, BUG-729

---

### SESSION 2B: Palmhouse — Order Beta + Credit

**Handover:** `QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` Batch 3
**Data available:** C-03 order #023897 settled (Cash), C-02 cancelled, C-1 credit order #023895

| ID | Assert | Data |
|---|---|---|
| BUG-724 | No "0 orders" flash; KPIs show "—" until data loads | Use C-03 settled order |
| BUG-725 | Payment column = "Cash" (not raw 'cash') | C-03 Cash payment |
| BUG-726 | Cancelled tab: row cell-count matches headers (cancel reason in Status cell) | C-02 cancelled order |
| BUG-737 | No CR-003 console.log on /reports/audit | Open AllOrders report |
| CR-526 | Credit Mgmt → find C-1 credit entry (#023895, QA Test Customer) → Remove button → dialog shows order + ₹557 | C-1 credit order |
| BUG-671 | Find credit/unpaid order in Order Beta → Mark Unpaid button visible | C-1 may show as unpaid |
| CR-523 | Link customer to placed order after placing (POST to user-check-create) | C-04 or any running order |

**BUG-735 (split rows — NEEDS SPLIT PAYMENT ORDER):**
Steps to create split payment on new table (C-05):
1. Order Entry → C-05 → add items → Place Order
2. Collect Bill → click **Cash** button → "Cash Received" input appears at bottom → type **₹300**
3. The remaining ₹257 should show → click **UPI** → type ₹257
4. Click "Pay ₹557"
5. Order is now settled with `payment_method = 'partial'`
6. In Order Beta → find this order → Change/Mark Unpaid buttons must be HIDDEN on split rows

---

### SESSION 3: Palmhouse — Complete C-04 as Hold + Split Payment

**Goal:** Create a Hold/paylater order for CR-503 + a split-payment order for BUG-735

#### C-04 → Hold Order (CR-503):
- Navigate to C-04 (has ₹557 placed order, Bill button visible)
- Collect Bill → note the payment options
- Try: Select no payment method → click "Hold" or "Pay Later" if visible
- OR: Select Cash → enter ₹0 → see if Hold option appears
- OR: Try "Credit" with no customer → see if it creates paylater
- Result should appear in Order Beta → Hold tab with Collect button

#### C-05 → Split Payment Order (BUG-735):
- Order Entry → C-05 → Blueberry Muffins + Mango Sticky Rice → Place Order
- Collect Bill → **click Cash** → "Cash Received" input at bottom → type **300**
- **Then click UPI** (the UPI button in payment row) → UPI input appears → type **257**
- Click "Pay ₹557"
- Verify: Order Beta → Cancelled/All tab → find this order → Change + Mark Unpaid **hidden** (BUG-735)

---

### SESSION 4: Beanmeup — VAT Testing

**Handover:** `QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` Batch 4
**Account:** owner@beanmeup.com (RID 742)

| ID | Steps | Assert |
|---|---|---|
| BUG-683 | Settings → VAT toggle OFF → place any order → Collect Bill | Cart shows ₹0 VAT; Network payload has `vat_amount: 0` |
| BUG-706 regression | Order Beta on beanmeup | Tax column header shows "VAT" (already PASSED on 25-Nov — just verify still correct) |

**Also in Batch 4 (same session, palmhouse account):**
- CR-493: cancel reason mandatory — verify BUG-682 fix (cancel_note_mandatory=Yes on cafe103)
- BUG-670/674: Notes field on cancel dialogs
- BUG-684: cart Collect-Bill amount == billed amount

---

## DATA STATUS SUMMARY

| Order | Table | Type | Status | Tests It |
|---|---|---|---|---|
| #023895 | C-1 | Credit (QA Test Customer) | ✅ CREATED | CR-526, BUG-671 |
| #023896 | C-02 | Cancelled (2 items) | ✅ CREATED | BUG-579/707/708/713, CR-554/555/556, BUG-726 |
| #023897 | C-03 | Settled Cash (₹857 w/ tip) | ✅ CREATED | BUG-724/725, Order Beta settled rows |
| #023898 | C-04 | Placed/Running | ⬜ INCOMPLETE — needs Hold completion | CR-503 |
| C-05 | (new) | Split payment needed | ⬜ NOT CREATED | BUG-735 |
| TGK APS | — | APS ₹1 web order | ✅ LIVE | CR-545, CR-561, BUG-702, CR-557 |
| TGK web | — | Web order | ✅ LIVE | BUG-679, CR-557 |
| Louise madam | — | 238 Open credit rows | ✅ EXISTS | CR-526 (Remove already works) |

---

## WHAT STILL NEEDS DATA (create during Session 3)

| Need | How | Tests |
|---|---|---|
| **Hold/paylater order** | C-04 → Collect Bill → find Hold option OR credit → creates fos=8/9 | CR-503 |
| **Split payment order** | C-05 → place order → Collect Bill → Cash ₹300 + UPI ₹257 | BUG-735, BUG-671 |
| **SC OFF + prepaid order** | beanmeup Settings → SC OFF → place order | BUG-678 |

---

## ITEMS ALREADY PASSED — DO NOT RETEST

BUG-724 ✅ BUG-725 ✅ BUG-727 ✅ BUG-733 ✅ BUG-737 ✅ BUG-739 ✅
CR-543 ✅ CR-544 ✅ BUG-681 ✅ BUG-704 ✅ BUG-706 ✅ CR-505 ✅ CR-510 ✅

---

## PARKED (needs owner action — do NOT attempt)

| ID | Reason |
|---|---|
| CR-515, BUG-711 | testwait lacks `report` perm → cannot open Order Beta. Need palmhouse staff with `report`+no-`print_icon` |
| BUG-749 | Needs real browser with granted FCM notification permission (pms@macha RID 69) |
| BUG-682 | Cafe103 too slow in Playwright; run manually on a real browser |
| CR-492 | testwait loads slowly; run manually |

---

## MINOR ISSUES CARRIED FORWARD

| # | ID(s) | Issue |
|---|---|---|
| M-1 | CR-515, BUG-711 | testwait lacks `report` → buttons not browser-verified |
| M-2 | BUG-726, BUG-735 | BUG-726: data now created (C-02 cancelled) ✅. BUG-735: split payment still needed |
| M-3 | BUG-579, BUG-707 | C-02 cancellation data now created ✅ — use MTD range |
| M-4 | BUG-682 | cafe103 manual test needed |
| M-5 | CR-503 | C-04 placed but Hold not completed — finish in Session 3 |

---

## QA REPORT FORMAT

Write to: `/app/memory/test_reports/QA_REPORT_CONTINUATION_2026-11-25.md`

Per item: `| ID | Test | PASS/FAIL | Severity if FAIL | Evidence (order ID / screenshot) |`

Route BLOCKER/MAJOR findings → bug fix agent (do NOT fix code yourself)

---

## REGISTRY

All 40 items have `qa_gate_status` set. 
Registry: `/app/memory/control/registry.json`
Test credentials: `/app/memory/test_credentials.md`
