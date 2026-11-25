# Session Handover — 2026-11-25 (QA Continuation)

## Who is the next agent
**Role:** QA Agent (Role 4) — no code fixes, record PASS/FAIL only
**Entry point:** This file + QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md

---

## Context: What was done this session
- Ran QA for 40 P0 post-Nov-14 items across 4 tracks
- All 40 registry entries now have qa_gate_status
- BUG-685 (cart crash) is CONFIRMED FIXED in code (CartPanel.jsx L851 — onEdit destructured)
- APS ₹1 order confirmed LIVE on thegoankitchen preprod (owner confirmed)
- Track 1 + Track 2 QA complete — 3 items browser-verified PASS + 20+ code-verified

**QA Reports written:**
- `/app/memory/test_reports/QA_REPORT_NOV_SPRINT_POST_NOV14_2026-11-25.md`
- `/app/memory/test_reports/QA_REPORT_TRACK2_2026-11-25.md`

---

## Credentials

| Account | Password | Restaurant | RID | Use For |
|---|---|---|---|---|
| owner@palmhouse.com | Qplazm@10 | The Palm House | 541 | Reports, Order Beta, Credit Management, Cancellations |
| owner@thegoankitchen.com | Qplazm@10 | The Goan Kitchen | — | Web orders, APS ₹1 orders, scan orders |
| owner@cafe103.com | Qplazm@10 | Cafe 103 | 644 | cancel_note_mandatory=Yes setting, BUG-682 |
| owner@beanmeup.com | Qplazm@10 | Bean Me Up | 742 | VAT restaurant — BUG-683, BUG-706 |
| testwait@thepalmhouse.com | Qplazm@10 | The Palm House | 541 | Staff — no print_icon/order_cancel/update_payment/order_unpaid; HAS clear_payment, complementary_food |
| captain@themealbreak.com | Qplazm@10 | Meal Break | 849 | Captain role — limited perms |
| pms@macha.com | Qplazm@10 | Macha | 69 | FCM notifications (needs browser-granted permission device) |

**Login endpoints:**
- Owner accounts: `POST /api/v1/auth/vendoremployee/login`
- Staff (testwait, captain): `POST /api/v1/auth/vendoremployee/common-login` + header `X-localization: en`

---

## WHAT TO TEST NEXT — Priority order

### BATCH 1 — Newly unblocked (run immediately on palmhouse + TGK)
**Handover:** `memory/handover/QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md` — Batches 3, 4, 5

| ID | Test | Account | Prerequisite |
|---|---|---|---|
| BUG-671 | Mark partial-payment order as Unpaid | palmhouse | Place any order → partial pay → then try Mark Unpaid on Order Beta |
| BUG-672 | Prepaid order → move to Credit | thegoankitchen | Use scan/online prepaid order → Collect Bill → Credit |
| BUG-678 | SC absent from payload when SC toggle OFF (prepaid) | palmhouse | Place prepaid order with SC switch OFF → verify Network payload |
| BUG-683 | VAT not charged when VAT switch OFF | beanmeup | Settings → VAT OFF → place order → verify no VAT in cart/payload |
| CR-526 | Remove/Void unpaid order from Credit Management | palmhouse | Credit Management → Louise madam → Open row → Remove button (confirmed visible from prior test) |
| CR-545 | APS ₹1 tag + item cancel + price edit in Accept popup | thegoankitchen | APS order IS LIVE (owner confirmed) |
| BUG-679 | Cancelled items — strikethrough in ScanOrderPopOut | thegoankitchen | Web order IS LIVE |
| BUG-702 | Partial variation shown in popup | thegoankitchen | Web order IS LIVE |
| CR-557 | Shared PopoutItemRow — web-EDIT Mode B | thegoankitchen | Web order IS LIVE |
| CR-561 | APS ₹1 price entry from Accept pop-up | thegoankitchen | APS order IS LIVE |

---

### BATCH 2 — Data needed on palmhouse (create first, then test)

| ID | What to Create | Test |
|---|---|---|
| BUG-726 | Place order → cancel item/order on Order Beta | Cancelled row cell alignment |
| BUG-735 | Place order → split payment (e.g. Cash ₹500 + UPI ₹500) → settle | Change/Unpaid buttons hidden on split row |
| CR-503 | Place order → Collect Bill → Pay Later (creates Hold/paylater order) | Hold tab → Collect button appears |
| BUG-579 | Date range with cancellations (try MTD or change restaurant) | Cancellation summary ₹ values |
| BUG-707 | Same date range | Order Date column format "DD MMM, hh:mm pm" |
| BUG-708 | Same | Dead Cancel Note column absent |
| BUG-713 | Same | Punch Time + Duration columns visible |
| CR-554 | Same | Punch Time + Duration on Detail screen |
| CR-555 | Same | Risk badges (5/15/30 min) |
| CR-556 | Same | Inline column filters |

---

### BATCH 3 — Account gap (need new palmhouse staff account)

| ID | What's needed |
|---|---|
| CR-515 | Palmhouse staff with `report` permission but WITHOUT `print_icon`, `update_payment`, `order_unpaid` |
| BUG-711 | Same account — Reprint button must be hidden |

**How to provision:** Settings → Employee → New employee on palmhouse → assign `report` role but exclude `print_icon`.

---

### BATCH 4 — Manual browser tests (Playwright too slow)

| ID | Account | Steps |
|---|---|---|
| BUG-682 | cafe103 | Cancel any item → modal shows "Additional Notes *" (red asterisk) → Confirm disabled without text |
| CR-492 | testwait (has complementary_food) | Order Entry → Collect Bill → verify complementary checkbox visible |
| BUG-749 | pms@macha RID 69 | Real browser with granted FCM notification permission → reload → check console `[BUG-749] device-token registered` |

---

## DATA THAT CURRENTLY EXISTS (confirmed)

| Data | Restaurant | Details |
|---|---|---|
| APS ₹1 web order | thegoankitchen | LIVE — confirmed by owner |
| Credit customers with Open rows | palmhouse | 55 customers, Louise madam has 238 Open rows (Remove button confirmed working) |
| Running orders | cafe103 | 2 running orders (seen in loading screen at session start) |

---

## WHAT STILL NEEDS TO BE CREATED

| Data to Create | Restaurant | How |
|---|---|---|
| Cancelled order (item or full) | palmhouse | Place order → cancel an item → check Order Beta Cancelled tab |
| Split payment order | palmhouse | Place order → Collect Bill → Cash + UPI split |
| Hold/Pay Later order | palmhouse | Place order → Collect Bill → Pay Later option |
| Prepaid order | thegoankitchen | Scan/online order that was already pre-paid (check existing orders first) |

---

## ISSUES FOUND — Full list

### MINOR
| # | ID(s) | Finding |
|---|---|---|
| M-1 | CR-515, BUG-711 | testwait lacks `report` permission → cannot access Order Beta. Provision palmhouse staff with `report` but no `print_icon`/`update_payment`/`order_unpaid` |
| M-2 | BUG-726, BUG-735 | No cancelled/split orders today on palmhouse — browser test deferred. Create test data first |
| M-3 | BUG-579, BUG-707 | No cancellation data in palmhouse test window — use MTD or wider range |
| M-4 | BUG-682 | cafe103 loads slowly in Playwright — manual browser test on preprod recommended |
| M-5 | CR-503 | No Hold/paylater order on palmhouse — create one first |

### MAJOR
*None found across Track 1 and Track 2.*

### BLOCKER
*None. BUG-685 (previously blocking 5 items) is CONFIRMED FIXED in code.*

---

## ITEMS FULLY QA PASSED (do not retest)

BUG-724 ✅ BUG-725 ✅ BUG-727 ✅ BUG-733 ✅ BUG-737 ✅ BUG-739 ✅
CR-543 ✅ CR-544 ✅ BUG-681 ✅ BUG-704 ✅ BUG-706 ✅ CR-505 ✅ CR-510 ✅

---

## NOT IN SCOPE FOR THIS CONTINUATION

- BUG-749 — requires physical device with granted FCM permission (pms@macha RID 69)
- CR-515/BUG-711 browser — blocked until palmhouse staff with report+no-print_icon is provisioned
- Track 3 items needing infrastructure: BUG-671/672/678/683 require specific prepaid order states

---

## QA Handover to use

**Primary:** `memory/handover/QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md`
Covers: BUG-671, 672, 678, 683, 708, 713, 724-727, 733, 735, 737, 739, CR-526, 543, 544, 545, 554, 555, 556, 557, 561, 523

**Individual handovers:**
- BUG-579 → `QA_HANDOVER_BUG579_2026-11-25.md`
- BUG-682 → `QA_HANDOVER_BUG682_2026-11-25.md`
- BUG-704 → `QA_HANDOVER_BUG704_2026-11-25.md` (PASSED — do not retest)
- BUG-706 → `QA_HANDOVER_BUG706_2026-11-25.md` (PASSED — do not retest)
- BUG-707 → `QA_HANDOVER_BUG707_2026-11-25.md`
- BUG-711 → `QA_HANDOVER_BUG711_2026-11-25.md`
- BUG-749 → `QA_HANDOVER_BUG749_2026-11-25.md`
- CR-503 → `QA_HANDOVER_CR503_2026-11-25.md`
- CR-515 → `QA_HANDOVER_CR-515_2026_11_16.md`
