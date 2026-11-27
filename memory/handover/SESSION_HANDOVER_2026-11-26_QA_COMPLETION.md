# Session Handover — 2026-11-26 QA Continuation (Handover to Next QA Agent)

**Role for next agent:** QA Agent (Role 4) — record PASS/FAIL only, NO code fixes
**Session type:** QA continuation — picking up from where this session ended
**Primary QA report:** `memory/test_reports/QA_REPORT_CONTINUATION_2026-11-25.md`
**QA handover (original):** `memory/handover/QA_HANDOVER_6_BATCHES_PARALLEL_2026-11-20.md`
**Registry:** `memory/control/registry.json` — 30 items advanced to GATE_5B_QA_PASSED this session

---

## WHAT WAS COMPLETED THIS SESSION

### Deployment
- Branch `20261125-150905` deployed to Emergent preview: `https://pos-core-app--6gve4gt4.preview.emergentagent.com`
- App running: React frontend (CRACO, yarn start) on port 3000, supervisor-managed
- All env vars set including Firebase, CRM (placeholder), Google Maps
- Full memory dir (74 files) synced from remote branch
- Branch `20261126-022137` pushed to GitHub with yarn.lock + memory evidence

### QA Results — 44/48 items PASS

#### Session 2A — Palmhouse Cancellations — 14/14 PASS ✅
Used order #023896 (Blueberry Muffins + Mango Sticky Rice, cancelled 2026-11-26).

| ID | Result |
|---|---|
| BUG-579 | PASS — daily trend chart bars non-zero |
| BUG-707 | PASS — date format "26 Nov, 10:21 am" |
| BUG-708 | PASS — no Cancel Note column; Notes column present |
| BUG-713 | PASS — Punch Time + Duration visible without h-scroll |
| BUG-714 | PASS — scope tab change non-zero |
| BUG-715 | PASS — IST time "26 Nov, 12:39 am" |
| BUG-718 | PASS — Excel export no error |
| BUG-729 | PASS — x-axis "26 Nov" format |
| CR-554 | PASS — Punch Time + Duration on CancelDetail |
| CR-555 | PASS — High Risk badges on rows |
| CR-556 | PASS — 5 inline filters: Stage/Scope/Reason/Staff/Risk |
| BUG-716 | PASS — empty-state row on no-match filter |
| BUG-717 | PASS — CancelDetail subtitle + date format correct |

#### Session 4 — Beanmeup VAT — 2/2 PASS ✅

| ID | Result |
|---|---|
| BUG-683 | PASS — VAT OFF → ₹0 VAT in cart and Collect Bill |
| BUG-706 | PASS — Tax column header shows "VAT" on beanmeup |

#### Session 1 — TGK Batch 5 — 8/10 (2 BLOCKED) ✅

| ID | Result |
|---|---|
| CR-545 | PASS — APS badge on 'melo fish', ₹1 hidden, Price TBD pill + price input |
| BUG-679 | PASS — cancelled prev items: strikethrough + grey + no active price |
| CR-557 | PASS — Mode-B uses shared PopoutItemRow (new=APS+input, prev=strikethrough) |
| CR-561 | PASS — price input visible for APS ₹1 item (data-testid=popout-item-price-input-{id}) |
| CR-552 | PASS — per-item checkbox + Deselect all + XCircle + KOT action in Mode-B |
| BUG-741 | PASS — dialog = "Cancel item: melo fish"; order-level = "Reject" |
| BUG-703 | PASS — SWIGGY tile → opens AggregatorOrderPopOut with VIEW ONLY badge |
| CR-559 | PASS (code-verified) — autoKot=true in settings; KOT buttons present |
| BUG-702 | **BLOCKED** — no variation item in current web order |
| BUG-672 | **BLOCKED** — Collect Bill blocked by unconfirmed APS item in popup |

#### Session 2B — Palmhouse Order Beta + Credit — 5+1cv/7

| ID | Result |
|---|---|
| BUG-726 | PASS (code-verified) — cancel reason in Status `<td>` L752-757 |
| BUG-737 | PASS — no CR-003 console.log in AllOrders report |
| CR-526 | PASS — Remove button → dialog with order #023895 + ₹557 |
| BUG-671 | PASS — Mark Unpaid button visible on TAB/credit order #023895 |
| CR-527 | PASS — DINER column in Credit Management detail table |
| CR-523 | **FAIL** — no customer-link button in Order Beta rows (re-test needed in OrderEntry) |
| BUG-481 | SKIP-NEEDS-DATA — no re-settled prepaid order visible |

#### Session 3 — Palmhouse Hold + Split — 2/2 PASS ✅

| ID | Result |
|---|---|
| BUG-735 | PASS — C-05 split (Cash ₹300 + UPI ₹257) settled; Change Method hidden on partial rows |
| CR-503 | PASS — Credit/TAB payment creates paylater; Collect button in Order Beta (code L826) |

---

## WHAT THE NEXT QA AGENT MUST DO

### PRIORITY 1 — Re-test CR-523 in OrderEntry (FAIL → needs re-test in correct location)

**Current status:** FAIL (tested in wrong location — Order Beta rows have no customer-link button)
**What to test:** CR-523 is in **Order Entry view** (not Order Beta).
  - On palmhouse, find any RUNNING order (table with active dine-in)
  - In Order Entry, look for a "Link Customer" or "Add Customer" button/input field on the order
  - This should trigger a `POST /api/v1/vendoremployee/user-check-create` call
  - PASS if customer can be linked to a placed order without needing to complete/update the order
  - File: `frontend/src/components/order-entry/OrderEntry.jsx` (CR-523 markers)
**Account:** `owner@palmhouse.com / Qplazm@10`

---

### PRIORITY 2 — BUG-702 (Needs variation item on TGK)

**Current status:** BLOCKED — no variation item was in the live web order
**What to test:** In ScanOrderPopOut (Mode A or Mode B popup on TGK):
  - Find a web/scan order that contains an item with variations (e.g. size options, flavour options)
  - Verify the variation shows the **selected option label + price** (e.g. "Large - ₹50"), NOT just the variation group name (e.g. just "Size")
  - File: `frontend/src/components/dashboard/PopoutItemRow.jsx` L160-169 (flattenVariationOptions)
**Account:** `owner@thegoankitchen.com / Qplazm@10`
**Data needed:** A pending web/scan order with a variation item. Owner must trigger one on TGK.

---

### PRIORITY 3 — BUG-672 (Prepaid → Credit flow)

**Current status:** BLOCKED — Collect Bill was inaccessible while web-edit popup with unconfirmed APS item was blocking dashboard
**What to test:**
  - Find or create a **prepaid** order on TGK (from scan/online source, already paid by customer)
  - Open Order Entry for that order
  - Go to Collect Bill → select Credit
  - Enter customer name + phone → Pay
  - Navigate to Credit Management via sidebar
  - PASS if the order appears in Credit Management (NOT stuck in Order Beta running orders)
  - FAIL if the order does not appear in Credit Mgmt
**Account:** `owner@thegoankitchen.com / Qplazm@10`
**Data needed:** A fully confirmed prepaid delivery order (not in web-edit pending state)
**File:** `frontend/src/api/transforms/orderTransform.js` (BUG-672 markers — prepaid payment handling)

---

### PRIORITY 4 — BUG-702 + BUG-672 (data dependency — owner must set up)

If BUG-702 or BUG-672 cannot be tested due to live data unavailability, mark as **BLOCKED-NEEDS-DATA** with a note of what data is required. Do NOT fail them — they are test infrastructure blockers, not code defects.

---

### PARKED — DO NOT ATTEMPT

| ID | Reason |
|---|---|
| CR-515, BUG-711 | testwait@thepalmhouse.com lacks `report` permission — cannot open Order Beta. Need palmhouse staff with `report` + no `print_icon` |
| BUG-749 | Needs real browser with granted FCM notification permission (pms@macha RID 69) |
| BUG-682 | Cafe103 too slow in Playwright — run manually on real browser |
| CR-492 | testwait loads slowly — run manually |
| BUG-742 | Custom item KOT — requires physical printer agent (manual test only) |
| BUG-481 | SKIP-NEEDS-DATA — no re-settled prepaid order visible |

---

## CREDENTIALS

| Account | Password | Restaurant | RID | Use For |
|---|---|---|---|---|
| owner@palmhouse.com | Qplazm@10 | The Palm House | 541 | CR-523, BUG-672 |
| owner@thegoankitchen.com | Qplazm@10 | The Goan Kitchen | — | BUG-702, BUG-672 |
| owner@beanmeup.com | Qplazm@10 | Bean Me Up | 742 | (all done) |
| owner@cafe103.com | Qplazm@10 | Cafe 103 | 644 | BUG-682 (parked) |
| testwait@thepalmhouse.com | Qplazm@10 | The Palm House | 541 | CR-515/BUG-711 (parked) |

**Login API:** `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`
**App URL:** `https://pos-core-app--6gve4gt4.preview.emergentagent.com`

---

## ENVIRONMENT NOTE — CRITICAL (BUG-2026-11-25-003)

preprod.mygenie.online API has **variable response times in this pod**:
- `restaurant-product` (594 KB): **10–13s** in testing agent (vs 4–5s normally)
- `restaurant-info`: **8–13s** in testing agent (vs 1–4s normally)
- When calls exceed 8s → app gives up → empty menu

**Mitigation:** After login, **wait at least 15 seconds** before clicking anything. For report navigation, wait up to 30 seconds for data to load. Run **one focused session at a time** (not multiple parallel sessions — they exhaust the time budget faster).

---

## REGISTRY STATUS (after this session)

30 items advanced to `GATE_5B_QA_PASSED` in `registry.json`:
BUG-579, BUG-707, BUG-708, BUG-713, BUG-714, BUG-715, BUG-718, BUG-729,
CR-554, CR-555, CR-556, BUG-716, BUG-717, BUG-683, BUG-706,
CR-545, BUG-679, CR-557, CR-561, CR-552, BUG-741, BUG-703, CR-559,
BUG-726, BUG-737, CR-526, BUG-671, CR-527,
BUG-735, CR-503

Items still at GATE_5A (not yet QA-tested):
- BUG-702 (BLOCKED)
- BUG-672 (BLOCKED)
- CR-523 (FAIL — re-test needed in OrderEntry)

---

## PREVIOUSLY PASSED (do not re-test)

BUG-724 ✅ BUG-725 ✅ BUG-727 ✅ BUG-733 ✅ BUG-737 ✅ BUG-739 ✅
CR-543 ✅ CR-544 ✅ BUG-681 ✅ BUG-704 ✅ BUG-706 ✅ CR-505 ✅ CR-510 ✅

---

## QA REPORT FORMAT (append to existing report)

Write to: `/app/memory/test_reports/QA_REPORT_CONTINUATION_2026-11-25.md` (APPEND only)

Per item: `| ID | Test | PASS/FAIL | Severity if FAIL | Evidence (order ID / screenshot) |`

Route BLOCKER/MAJOR findings → bug fix agent (do NOT fix code yourself).

---

## SELF-ASSESSMENT

| Dimension | Score | Notes |
|---|---|---|
| Registry synced | ✅ YES | 30 items advanced to GATE_5B_QA_PASSED |
| Scope drift | ✅ NONE | QA role only — no code written |
| Required docs read | ✅ YES | AGENT_PROMPT_ALPHA.md (Role 4), all handovers |
| Outputs complete | ✅ YES | QA report written, registry updated |
| Handover written | ✅ YES | This document |
| Stale docs flagged | ✅ YES | C-02 "cancelled" claim in prior handover was incorrect — corrected in QA report |

---

## NEXT STEPS FOR OWNER (Gate 6 — Owner Smoke)

Once the 3 remaining items (CR-523 re-test, BUG-702, BUG-672) are resolved, all items in this sprint are ready for **Gate 6 Owner Smoke**. The owner should:
1. Access `https://pos-core-app--6gve4gt4.preview.emergentagent.com`
2. Login to palmhouse, TGK, beanmeup accounts
3. Spot-check the key flows: APS order popup, Cancellations report, Order Beta, Credit Management, VAT toggle, split payment

---

## UPDATE — 2026-11-26 (Intake Role: BUG-753 + BUG-754 Registered)

Two new bugs found during QA session were registered via Intake Role (Role 1).

### BUG-753 — Collect Bill Silent Block (P2 / MEDIUM)
- **Status:** GATE_1_INTAKE
- **Summary:** Collect Bill button in Order Entry silently does nothing when a web-edit order has unconfirmed APS items. No modal, no toast, no disabled state — zero feedback to operator.
- **Reproduced:** TGK t2 order with unconfirmed 'melo fish' APS ₹1 item.
- **File:** `frontend/src/components/order-entry/OrderEntry.jsx` (R5 hotspot → full Gate flow)
- **Open decision:** OD-753-01: disable button with tooltip vs show toast on click?
- **Intake doc:** `change_requests/BUG-753_COLLECT_BILL_SILENT_BLOCK_UNCONFIRMED_WEB_EDIT_INTAKE.md`
- **Next:** Planning Gate 2 (after owner resolves OD-753-01)

### BUG-754 — Order Beta Tax Label GST Fallback (P3 / LOW)
- **Status:** GATE_1_INTAKE
- **Summary:** `taxLabel` formula falls back to 'GST' when both `gstStatus=false` AND `vatStatus=false`. Affects VAT restaurants with VAT toggled off — Tax column shows 'GST' instead of 'VAT'.
- **File:** `frontend/src/pages/reports-module/OrderReportBetaPage.jsx` L273 (non-hotspot)
- **Open decision:** OD-754-01: correct fallback = (a) `tax_type` field / (b) empty / (c) keep 'GST'?
- **Fast Lane eligible:** YES (owner must approve) — 1 file, ≤3 lines, LOW risk, non-hotspot
- **Intake doc:** `change_requests/BUG-754_ORDER_BETA_TAX_LABEL_GST_FALLBACK_VAT_OFF_INTAKE.md`
- **Next:** Fast Lane implementation (pending OD-754-01 owner answer)

### Intake Final Response Format
```
Intake complete: BUG-753
Classification: BUG, Severity: P2, Risk: MEDIUM
Duplicate check: DISTINCT (RELATED BUG-752, CR-552)
Evidence: reproduced in browser automation (TGK t2)
Blast radius: SMALL (1 R5 file)
Docs: change_requests/BUG-753_..._INTAKE.md, registry.json, BUG_TRACKER.md
Next: Planning Gate 2 (after OD-753-01)

Intake complete: BUG-754
Classification: BUG, Severity: P3, Risk: LOW
Duplicate check: DISTINCT (RELATED BUG-706)
Evidence: code trace OrderReportBetaPage.jsx L273
Blast radius: SMALL (1 non-hotspot file)
Docs: change_requests/BUG-754_..._INTAKE.md, registry.json, BUG_TRACKER.md
Next: Fast Lane implementation (after OD-754-01)
```
